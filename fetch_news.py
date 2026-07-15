#!/usr/bin/env python3
"""
MarketWirePro Auto News Fetcher v2
- Unique images per article via Pexels keyword search
- Full article content rewritten by Groq
- No source names in content
"""

import json, os, re, time, hashlib, urllib.request, urllib.parse, random
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

GROQ_API_KEY  = os.environ.get('GROQ_API_KEY', '')
PEXELS_KEY    = os.environ.get('PEXELS_API_KEY', '')
MAX_ARTICLES  = 50
NEW_PER_RUN   = 10
OUTPUT_FILE   = 'api/articles.json'

RSS_FEEDS = [
    {'url': 'https://cointelegraph.com/rss',                     'category': 'crypto'},
    {'url': 'https://coindesk.com/arc/outboundfeeds/rss/',       'category': 'crypto'},
    {'url': 'https://decrypt.co/feed',                           'category': 'crypto'},
    {'url': 'https://www.forexlive.com/feed/news',               'category': 'forex'},
    {'url': 'https://www.fxstreet.com/rss/news',                 'category': 'forex'},
    {'url': 'https://www.marketwatch.com/rss/topstories',        'category': 'stocks'},
    {'url': 'https://feeds.reuters.com/reuters/businessNews',    'category': 'economics'},
]

AFFILIATE = {
    'crypto':    ('https://one.exnessonelink.com/a/c_xfuaf31zu5', 'Exness', 'Trade crypto with ultra-low spreads'),
    'forex':     ('https://one.exnessonelink.com/a/c_xfuaf31zu5', 'Exness', 'Trade forex from 0.0 pips'),
    'stocks':    ('https://www.tradingview.com/?aff_id=160287',    'TradingView', 'Professional stock charts free'),
    'economics': ('https://affs.click/iBKCk',                     'XM', 'Trade global markets with 1000+ instruments'),
}

# Fallback image pools — different per article
FALLBACK_IMAGES = {
    'crypto': [
        'https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/6771985/pexels-photo-6771985.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/6772076/pexels-photo-6772076.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/7534777/pexels-photo-7534777.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'forex': [
        'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/164527/pexels-photo-164527.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/186461/pexels-photo-186461.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'stocks': [
        'https://images.pexels.com/photos/159888/pexels-photo-159888.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/955447/pexels-photo-955447.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'economics': [
        'https://images.pexels.com/photos/3943716/pexels-photo-3943716.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/6801874/pexels-photo-6801874.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
}

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text.strip())
    return text[:80]

def get_image_pexels(keyword, category, used_images):
    """Get unique image from Pexels based on article keyword"""
    if PEXELS_KEY:
        queries = [keyword[:30], category + ' finance', 'financial market']
        for q in queries:
            try:
                url = f'https://api.pexels.com/v1/search?query={urllib.parse.quote(q)}&per_page=10&orientation=landscape'
                req = urllib.request.Request(url, headers={'Authorization': PEXELS_KEY})
                with urllib.request.urlopen(req, timeout=8) as r:
                    data = json.loads(r.read())
                photos = data.get('photos', [])
                random.shuffle(photos)
                for p in photos:
                    img = p['src']['large']
                    if img not in used_images:
                        return img
            except: pass

    # Use fallback pool — pick one not recently used
    pool = FALLBACK_IMAGES.get(category, FALLBACK_IMAGES['forex'])
    for img in random.sample(pool, len(pool)):
        if img not in used_images:
            return img
    return random.choice(pool)

def fetch_rss(url, category, seen_ids):
    items = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 MarketWirePro/2.0'})
        with urllib.request.urlopen(req, timeout=12) as r:
            xml = r.read()
        root = ET.fromstring(xml)
        channel = root.find('channel') or root
        for item in (channel.findall('item') or [])[:6]:
            title_el = item.find('title')
            link_el  = item.find('link')
            desc_el  = item.find('description') or item.find('summary')
            title = (title_el.text or '').strip() if title_el is not None else ''
            link  = (link_el.text or '').strip()  if link_el  is not None else ''
            desc  = (desc_el.text or '').strip()  if desc_el  is not None else ''
            if not title or len(title) < 10: continue
            desc = re.sub(r'<[^>]+>', '', desc).strip()[:800]
            uid  = hashlib.md5((title + link).encode()).hexdigest()[:12]
            if uid in seen_ids: continue
            items.append({'uid': uid, 'title': title, 'link': link, 'excerpt': desc, 'category': category})
    except Exception as e:
        print(f'RSS error {url}: {e}')
    return items

def rewrite_with_groq(title, excerpt, category):
    if not GROQ_API_KEY:
        return None, None, None, []

    aff_link, aff_name, aff_desc = AFFILIATE.get(category, AFFILIATE['forex'])

    prompt = f"""You are a senior financial journalist at MarketWirePro, a global financial news platform.

Your task: Rewrite the following news into a professional, original article.

STRICT RULES:
- NEVER mention any other website, news source, publication, or company name as a source
- Write as if MarketWirePro researched and reported this story originally  
- Replace any source mentions with "market analysts", "industry sources", "financial reports", or "market data"
- Keep ALL facts, numbers, and data accurate
- Write 500-600 words
- Use HTML tags: <h2> for subheadings, <p> for paragraphs, <strong> for key terms/numbers
- Include these exact sections with <h2> tags:
  1. Opening paragraph (no heading)
  2. <h2>Key Market Developments</h2>
  3. <h2>Expert Analysis</h2>  
  4. <h2>What This Means For Traders</h2>
- End with this exact affiliate paragraph:
  <p class="affiliate-note">Looking to act on this market movement? <a href="{aff_link}" target="_blank" rel="noopener sponsored">{aff_name}</a> offers {aff_desc} — trusted by traders worldwide.</p>

ORIGINAL HEADLINE: {title}
ORIGINAL CONTENT: {excerpt}
CATEGORY: {category}

Return ONLY a valid JSON object (no markdown, no backticks):
{{"title": "compelling SEO headline 55-65 chars", "content": "full HTML article here", "excerpt": "compelling 150-char summary for SEO", "tags": ["tag1","tag2","tag3","tag4","tag5"], "imageKeyword": "2-3 word search term for relevant photo"}}"""

    payload = json.dumps({
        'model': 'llama3-70b-8192',
        'messages': [{'role': 'user', 'content': prompt}],
        'max_tokens': 1500,
        'temperature': 0.65,
    }).encode()

    req = urllib.request.Request(
        'https://api.groq.com/openai/v1/chat/completions',
        data=payload,
        headers={'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
        text = resp['choices'][0]['message']['content'].strip()
        # Strip markdown if present
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()
        data = json.loads(text)
        return (
            data.get('title'),
            data.get('content'),
            data.get('excerpt'),
            data.get('tags', []),
            data.get('imageKeyword', category)
        )
    except Exception as e:
        print(f'Groq error: {e}')
        return None, None, None, [], category

def main():
    print(f'MarketWirePro Fetcher v2 — {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}')

    try:
        with open(OUTPUT_FILE, 'r') as f:
            data = json.load(f)
        existing = data.get('articles', [])
    except:
        existing = []

    seen_ids    = {a['uid'] for a in existing if 'uid' in a}
    used_images = {a.get('image','') for a in existing}
    new_articles = []

    for feed in RSS_FEEDS:
        if len(new_articles) >= NEW_PER_RUN:
            break
        print(f'\nFetching: {feed["url"][:50]}...')
        items = fetch_rss(feed['url'], feed['category'], seen_ids)

        for item in items:
            if len(new_articles) >= NEW_PER_RUN:
                break

            print(f'  Rewriting: {item["title"][:55]}...')
            result = rewrite_with_groq(item['title'], item['excerpt'], item['category'])

            if len(result) == 5:
                new_title, content, new_excerpt, tags, img_keyword = result
            else:
                new_title, content, new_excerpt, tags, img_keyword = None, None, None, [], item['category']

            # Fallback if Groq failed
            if not new_title or not content:
                new_title   = item['title']
                new_excerpt = item['excerpt'][:160] if item['excerpt'] else item['title']
                content     = f'<p>{item["excerpt"]}</p>' if item['excerpt'] else f'<p>{item["title"]}</p>'
                tags        = [item['category'], 'markets', 'finance', 'trading']
                img_keyword = item['category']

            # Get unique image
            image = get_image_pexels(img_keyword, item['category'], used_images)
            used_images.add(image)

            slug = slugify(new_title) + '-' + item['uid']
            now  = datetime.now(timezone.utc).isoformat()

            word_count = len(re.sub(r'<[^>]+>', '', content).split())
            read_time  = max(2, word_count // 200)

            article = {
                'uid':      item['uid'],
                'slug':     slug,
                'title':    new_title,
                'excerpt':  (new_excerpt or item['title'])[:160],
                'content':  content,
                'category': item['category'],
                'image':    image,
                'tags':     tags if isinstance(tags, list) else [item['category']],
                'date':     now,
                'readTime': read_time,
                'author':   'MarketWirePro Desk',
            }
            new_articles.append(article)
            seen_ids.add(item['uid'])
            print(f'  ✓ Done — image: {img_keyword}')
            time.sleep(1.5)

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

    print(f'\n✅ Complete — {len(new_articles)} new, {len(all_articles)} total')

if __name__ == '__main__':
    main()
