#!/usr/bin/env python3
"""
MarketWirePro Auto News Fetcher
Runs every 30 minutes via GitHub Actions
Fetches → Rewrites with Groq → Saves to articles.json
"""

import json
import os
import re
import time
import hashlib
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

# ── CONFIG ──────────────────────────────────────────────
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
MAX_ARTICLES  = 50   # max total kept
NEW_PER_RUN   = 8    # max new articles per run
OUTPUT_FILE   = 'api/articles.json'

# ── PEXELS CONFIG ────────────────────────────────────────
PEXELS_KEY = os.environ.get('PEXELS_API_KEY', '')

# ── RSS SOURCES ─────────────────────────────────────────
RSS_FEEDS = [
    # Crypto
    {'url': 'https://cointelegraph.com/rss',           'category': 'crypto'},
    {'url': 'https://coindesk.com/arc/outboundfeeds/rss/', 'category': 'crypto'},
    {'url': 'https://decrypt.co/feed',                 'category': 'crypto'},
    # Forex
    {'url': 'https://www.forexlive.com/feed/news',     'category': 'forex'},
    {'url': 'https://www.fxstreet.com/rss/news',       'category': 'forex'},
    # Stocks
    {'url': 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US', 'category': 'stocks'},
    {'url': 'https://www.marketwatch.com/rss/topstories', 'category': 'stocks'},
    # Economics
    {'url': 'https://feeds.reuters.com/reuters/businessNews', 'category': 'economics'},
    {'url': 'https://feeds.reuters.com/reuters/USDollar',     'category': 'forex'},
]

# ── AFFILIATE LINKS BY CATEGORY ─────────────────────────
AFFILIATE = {
    'crypto':    'https://one.exnessonelink.com/a/c_xfuaf31zu5',
    'forex':     'https://one.exnessonelink.com/a/c_xfuaf31zu5',
    'stocks':    'https://www.tradingview.com/?aff_id=160287',
    'economics': 'https://affs.click/iBKCk',
}
AFFILIATE_TEXT = {
    'crypto':    'Trade crypto with ultra-low spreads on <a href="{link}" target="_blank" rel="noopener sponsored">Exness</a>.',
    'forex':     'Access forex markets with tight spreads on <a href="{link}" target="_blank" rel="noopener sponsored">Exness</a>.',
    'stocks':    'Analyse stocks with professional charts on <a href="{link}" target="_blank" rel="noopener sponsored">TradingView</a>.',
    'economics': 'Trade global markets with 1000+ instruments on <a href="{link}" target="_blank" rel="noopener sponsored">XM</a>.',
}

# ── CATEGORY IMAGES (Pexels fallback) ───────────────────
DEFAULT_IMAGES = {
    'crypto':    'https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?auto=compress&cs=tinysrgb&w=800',
    'forex':     'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=800',
    'stocks':    'https://images.pexels.com/photos/159888/pexels-photo-159888.jpeg?auto=compress&cs=tinysrgb&w=800',
    'economics': 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=800',
}

# ── SLUGIFY ─────────────────────────────────────────────
def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s]+', '-', text.strip())
    return text[:80]

# ── FETCH RSS ───────────────────────────────────────────
def fetch_rss(url, category, seen_ids):
    items = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'MarketWirePro/1.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            xml = r.read()
        root = ET.fromstring(xml)
        ns   = {'dc': 'http://purl.org/dc/elements/1.1/'}
        channel = root.find('channel') or root
        for item in (channel.findall('item') or root.findall('.//{http://www.w3.org/2005/Atom}entry'))[:5]:
            title_el = item.find('title')
            link_el  = item.find('link')
            desc_el  = item.find('description') or item.find('summary')
            title    = (title_el.text or '').strip() if title_el is not None else ''
            link     = (link_el.text or '').strip()  if link_el  is not None else ''
            desc     = (desc_el.text or '').strip()  if desc_el  is not None else ''
            if not title or len(title) < 10: continue
            # Clean HTML from description
            desc = re.sub(r'<[^>]+>', '', desc).strip()[:500]
            uid  = hashlib.md5((title + link).encode()).hexdigest()[:12]
            if uid in seen_ids: continue
            items.append({'uid': uid, 'title': title, 'link': link, 'excerpt': desc, 'category': category})
    except Exception as e:
        print(f'RSS error {url}: {e}')
    return items

# ── GROQ REWRITE ────────────────────────────────────────
def rewrite_with_groq(title, excerpt, category):
    if not GROQ_API_KEY:
        return None, None, None
    prompt = f"""You are a financial journalist at MarketWirePro. Rewrite this news article.

RULES:
1. Never mention any other news site, publication, or source name
2. Write as if MarketWirePro is the original reporter
3. Rewrite all content in completely new sentences and structure
4. Keep all factual information accurate
5. Write 450-550 words total
6. Use proper H2 subheadings (## Heading) every 2-3 paragraphs
7. Include a section called "## What This Means For Traders"
8. Bold key terms and numbers using **bold**
9. Return ONLY a JSON object with these exact keys: title, content, excerpt, tags

ORIGINAL TITLE: {title}
ORIGINAL SUMMARY: {excerpt}
CATEGORY: {category}

Return ONLY valid JSON, no markdown, no explanation:
{{"title": "New SEO title here", "content": "Full HTML article here with <h2> tags and <p> tags and <strong> tags", "excerpt": "2 sentence summary", "tags": ["tag1","tag2","tag3","tag4","tag5"]}}"""

    payload = json.dumps({
        'model': 'llama3-70b-8192',
        'messages': [{'role': 'user', 'content': prompt}],
        'max_tokens': 1200,
        'temperature': 0.7,
    }).encode()

    req = urllib.request.Request(
        'https://api.groq.com/openai/v1/chat/completions',
        data=payload,
        headers={
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
        text = resp['choices'][0]['message']['content'].strip()
        # Clean any markdown wrappers
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        data = json.loads(text)
        return data.get('title'), data.get('content'), data.get('excerpt'), data.get('tags', [])
    except Exception as e:
        print(f'Groq error: {e}')
        return None, None, None, []

# ── FORMAT CONTENT ──────────────────────────────────────
def format_content(raw_content, category):
    if not raw_content:
        return ''
    # Convert ## headings to H2 if not already HTML
    content = raw_content
    if '<h2>' not in content:
        content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
    if '<p>' not in content:
        lines = content.split('\n')
        html_lines = []
        for line in lines:
            line = line.strip()
            if not line: continue
            if line.startswith('<h2'): html_lines.append(line)
            else: html_lines.append(f'<p>{line}</p>')
        content = '\n'.join(html_lines)
    # Add affiliate link at end
    aff_link  = AFFILIATE.get(category, AFFILIATE['forex'])
    aff_text  = AFFILIATE_TEXT.get(category, '').format(link=aff_link)
    content  += f'\n<div class="trader-note"><div class="trader-note-title">💡 Ready to Trade?</div><p>{aff_text}</p></div>'
    return content

# ── GET PEXELS IMAGE ────────────────────────────────────
def get_image(category, query=''):
    if PEXELS_KEY:
        search = query or {'crypto':'bitcoin','forex':'currency trading','stocks':'stock market','economics':'economy'}[category]
        try:
            url = f'https://api.pexels.com/v1/search?query={urllib.parse.quote(search)}&per_page=5&orientation=landscape'
            req = urllib.request.Request(url, headers={'Authorization': PEXELS_KEY})
            with urllib.request.urlopen(req, timeout=8) as r:
                data = json.loads(r.read())
            photos = data.get('photos', [])
            if photos:
                import random
                return random.choice(photos[:5])['src']['large']
        except: pass
    return DEFAULT_IMAGES.get(category, DEFAULT_IMAGES['forex'])

# ── MAIN ────────────────────────────────────────────────
def main():
    print(f'MarketWirePro News Fetcher — {datetime.now(timezone.utc).isoformat()}')

    # Load existing articles
    try:
        with open(OUTPUT_FILE, 'r') as f:
            data = json.load(f)
        existing = data.get('articles', [])
    except:
        existing = []

    seen_ids = {a['uid'] for a in existing if 'uid' in a}
    new_articles = []

    for feed in RSS_FEEDS:
        if len(new_articles) >= NEW_PER_RUN:
            break
        items = fetch_rss(feed['url'], feed['category'], seen_ids)
        for item in items:
            if len(new_articles) >= NEW_PER_RUN:
                break
            print(f'Processing: {item["title"][:60]}...')
            result = rewrite_with_groq(item['title'], item['excerpt'], item['category'])
            if len(result) == 4:
                new_title, content, new_excerpt, tags = result
            else:
                new_title, content, new_excerpt, tags = None, None, None, []

            if not new_title:
                new_title  = item['title']
                content    = f'<p>{item["excerpt"]}</p>'
                new_excerpt = item['excerpt'][:160]
                tags       = [item['category'], 'markets', 'finance']

            formatted = format_content(content, item['category'])
            image     = get_image(item['category'])
            slug      = slugify(new_title) + '-' + item['uid']
            now       = datetime.now(timezone.utc).isoformat()

            article = {
                'uid':      item['uid'],
                'slug':     slug,
                'title':    new_title,
                'excerpt':  (new_excerpt or '')[:160],
                'content':  formatted,
                'category': item['category'],
                'image':    image,
                'tags':     tags if isinstance(tags, list) else [],
                'date':     now,
                'readTime': max(2, len(re.sub(r'<[^>]+>','',formatted).split()) // 200),
                'author':   'MarketWirePro Desk',
            }
            new_articles.append(article)
            seen_ids.add(item['uid'])
            time.sleep(1)  # Rate limit Groq

    # Merge: new first, keep max 50
    all_articles = new_articles + existing
    all_articles = all_articles[:MAX_ARTICLES]

    output = {
        'articles':    all_articles,
        'lastUpdated': datetime.now(timezone.utc).isoformat(),
        'totalCount':  len(all_articles),
        'newCount':    len(new_articles),
    }

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'Done — {len(new_articles)} new articles added. Total: {len(all_articles)}')

if __name__ == '__main__':
    main()
