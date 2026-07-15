/* ═══════════════════════════════════════════════════
   MARKETWIREPRO — Main JS v2
   ═══════════════════════════════════════════════════ */

// ── TICKER DATA (static fallback) ───────────────────
const TICKER_PAIRS = [
  { name:'BTC/USD',  id:'bitcoin',      type:'crypto', decimals:2  },
  { name:'ETH/USD',  id:'ethereum',     type:'crypto', decimals:2  },
  { name:'BNB/USD',  id:'binancecoin',  type:'crypto', decimals:2  },
  { name:'SOL/USD',  id:'solana',       type:'crypto', decimals:2  },
  { name:'XRP/USD',  id:'ripple',       type:'crypto', decimals:4  },
  { name:'XAU/USD',  id:'gold',         type:'fx',     decimals:2  },
  { name:'EUR/USD',  id:'eurusd',       type:'fx',     decimals:4  },
  { name:'GBP/USD',  id:'gbpusd',       type:'fx',     decimals:4  },
  { name:'USD/JPY',  id:'usdjpy',       type:'fx',     decimals:3  },
  { name:'S&P 500',  id:'sp500',        type:'index',  decimals:2  },
  { name:'NASDAQ',   id:'nasdaq',       type:'index',  decimals:2  },
];

let tickerPrices = {};

function buildTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track) return;
  // Build double set for seamless loop
  const allPairs = [...TICKER_PAIRS, ...TICKER_PAIRS];
  track.innerHTML = allPairs.map(p => `
    <span class="ticker-item" data-id="${p.id}">
      <span class="ticker-name">${p.name}</span>
      <span class="ticker-price" id="tp-${p.id}">—</span>
      <span class="ticker-change" id="tc-${p.id}">—</span>
    </span>`).join('');
}

async function fetchCryptoPrices() {
  try {
    const ids = 'bitcoin,ethereum,binancecoin,solana,ripple';
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    const d   = await res.json();
    const map = {
      bitcoin:     { name:'BTC/USD', id:'bitcoin' },
      ethereum:    { name:'ETH/USD', id:'ethereum' },
      binancecoin: { name:'BNB/USD', id:'binancecoin' },
      solana:      { name:'SOL/USD', id:'solana' },
      ripple:      { name:'XRP/USD', id:'ripple' },
    };
    for (const [key, info] of Object.entries(map)) {
      if (!d[key]) continue;
      const price  = d[key].usd;
      const change = d[key].usd_24h_change || 0;
      updateTickerItem(info.id, price, change, price < 1 ? 4 : 2);
      // Update market widget
      updateMarketRow(info.id, price, change);
    }
  } catch(e) { console.log('Crypto price fetch error:', e.message); }
}

async function fetchForexPrices() {
  // Use exchangerate-api free tier for forex
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const d   = await res.json();
    if (!d.rates) return;
    const eur = d.rates.EUR ? (1/d.rates.EUR) : null;
    const gbp = d.rates.GBP ? (1/d.rates.GBP) : null;
    const jpy = d.rates.JPY || null;
    if (eur) updateTickerItem('eurusd', eur, 0, 4);
    if (gbp) updateTickerItem('gbpusd', gbp, 0, 4);
    if (jpy) updateTickerItem('usdjpy', jpy, 0, 3);
  } catch(e) {}
}

function updateTickerItem(id, price, change, dec) {
  // Update all instances (ticker has doubled pairs)
  document.querySelectorAll(`#tp-${id}`).forEach(el => {
    el.textContent = '$' + price.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  });
  document.querySelectorAll(`#tc-${id}`).forEach(el => {
    if (change !== 0) {
      el.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      el.className = 'ticker-change ' + (change >= 0 ? 'up' : 'down');
    }
  });
  tickerPrices[id] = { price, change };
}

function updateMarketRow(id, price, change) {
  const row = document.querySelector(`[data-market="${id}"]`);
  if (!row) return;
  const priceEl  = row.querySelector('.market-price');
  const changeEl = row.querySelector('.market-change');
  if (priceEl)  priceEl.textContent  = '$' + price.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
  if (changeEl) {
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    changeEl.className   = 'market-change ' + (change >= 0 ? 'up' : 'down');
  }
}

// ── MARKETS WIDGET ────────────────────────────────────
async function loadMarketsWidget() {
  const wrap = document.querySelector('.markets-widget-body');
  if (!wrap) return;
  // Render skeleton rows with data-market IDs
  const pairs = [
    { id:'bitcoin',    name:'Bitcoin',  sym:'BTC' },
    { id:'ethereum',   name:'Ethereum', sym:'ETH' },
    { id:'solana',     name:'Solana',   sym:'SOL' },
    { id:'ripple',     name:'XRP',      sym:'XRP' },
  ];
  wrap.innerHTML = pairs.map(p => `
    <div class="market-row" data-market="${p.id}">
      <span class="market-name">${p.sym}</span>
      <span class="market-price" style="color:var(--muted);">Loading...</span>
      <span class="market-change">—</span>
    </div>`).join('');
}

// ── SEARCH ────────────────────────────────────────────
function initSearch() {
  const btn     = document.querySelector('.search-btn');
  const overlay = document.querySelector('.search-overlay');
  const close   = document.querySelector('.search-close');
  const input   = document.querySelector('.search-input');
  if (!btn || !overlay) return;
  btn.addEventListener('click', () => { overlay.classList.add('open'); setTimeout(() => input?.focus(), 100); });
  close?.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.classList.remove('open');
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); overlay.classList.add('open'); setTimeout(() => input?.focus(), 100); }
  });
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) window.location.href = `/search.html?q=${encodeURIComponent(input.value.trim())}`;
  });
}

// ── MOBILE NAV ────────────────────────────────────────
function initMobileNav() {
  const ham   = document.querySelector('.hamburger');
  const nav   = document.querySelector('.mobile-nav');
  const close = document.querySelector('.mobile-close');
  if (!ham || !nav) return;
  ham.addEventListener('click', () => nav.classList.add('open'));
  close?.addEventListener('click', () => nav.classList.remove('open'));
}

// ── BACK TO TOP ───────────────────────────────────────
function initBackTop() {
  const btn = document.querySelector('.back-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 400));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── AFFILIATE BANNER ROTATION ─────────────────────────
const XM_BANNERS = [
  'https://ads.pipaffiliates.com/i/131492?c=1129129',
  'https://ads.pipaffiliates.com/i/131532?c=1129129',
  'https://ads.pipaffiliates.com/i/132219?c=1129129',
  'https://ads.pipaffiliates.com/i/132386?c=1129129',
  'https://ads.pipaffiliates.com/i/133412?c=1129129',
  'https://ads.pipaffiliates.com/i/149879?c=1129129',
  'https://ads.pipaffiliates.com/i/150335?c=1129129',
];

function rotateAffiliates() {
  document.querySelectorAll('.xm-banner-728').forEach(el => {
    const src = XM_BANNERS[Math.floor(Math.random() * XM_BANNERS.length)];
    el.innerHTML = `<a href="https://clicks.pipaffiliates.com/c?m=131492&c=1129129" target="_blank" rel="noopener sponsored"><img src="${src}" width="728" height="90" alt="XM Trading" style="max-width:100%;border-radius:8px;" loading="lazy"/></a>`;
  });
}

// ── FORMAT DATE ───────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return 'Today';
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1)    return 'Just now';
  if (diff < 60)   return diff + 'm ago';
  if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── ARTICLES ──────────────────────────────────────────
async function loadArticles(containerId, category, limit) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res  = await fetch('/api/articles.json?v=' + Date.now());
    const data = await res.json();
    let arts   = data.articles || [];
    if (category) arts = arts.filter(a => a.category === category);
    arts = arts.slice(0, limit || 10);
    if (!arts.length) {
      container.innerHTML = '<p style="color:var(--muted);padding:20px 0;font-size:14px;">No articles yet — check back soon.</p>';
      return;
    }
    container.innerHTML = arts.map(a => newsCardHTML(a)).join('');
  } catch(e) {
    container.innerHTML = '<p style="color:var(--muted);padding:20px 0;font-size:14px;">Loading articles...</p>';
  }
}

function newsCardHTML(a) {
  const cat  = a.category || 'markets';
  const img  = a.image || fallbackImg(cat);
  const slug = a.slug || '';
  return `
    <a href="/article.html?slug=${slug}" class="news-card">
      <img class="news-card-img" src="${img}" alt="${escHtml(a.title)}" loading="lazy" onerror="this.src='${fallbackImg(cat)}'">
      <div class="news-card-body">
        <span class="article-tag ${cat}">${cat.charAt(0).toUpperCase()+cat.slice(1)}</span>
        <div class="news-card-title">${escHtml(a.title)}</div>
        <div class="article-meta">
          <span>MarketWirePro Desk</span>
          <span class="dot"></span>
          <span>${formatDate(a.date)}</span>
          <span class="dot"></span>
          <span>${a.readTime || 3} min read</span>
        </div>
      </div>
    </a>`;
}

function catCardHTML(a) {
  const cat = a.category || 'markets';
  const img = a.image || fallbackImg(cat);
  return `
    <a href="/article.html?slug=${a.slug}" class="cat-card">
      <img class="cat-card-img" src="${img}" alt="${escHtml(a.title)}" loading="lazy" onerror="this.src='${fallbackImg(cat)}'">
      <div>
        <div class="cat-card-title">${escHtml(a.title)}</div>
        <div class="article-meta" style="margin-top:6px;"><span>${formatDate(a.date)}</span></div>
      </div>
    </a>`;
}

function fallbackImg(cat) {
  const imgs = {
    crypto:    'https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?auto=compress&cs=tinysrgb&w=400',
    forex:     'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=400',
    stocks:    'https://images.pexels.com/photos/159888/pexels-photo-159888.jpeg?auto=compress&cs=tinysrgb&w=400',
    economics: 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=400',
    markets:   'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=400',
  };
  return imgs[cat] || imgs.markets;
}

function escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── TRENDING SIDEBAR ──────────────────────────────────
async function loadTrending() {
  const wrap = document.querySelector('.trending-list');
  if (!wrap) return;
  try {
    const res  = await fetch('/api/articles.json?v=' + Date.now());
    const data = await res.json();
    const top  = (data.articles || []).slice(0, 5);
    wrap.innerHTML = top.map((a, i) => `
      <a href="/article.html?slug=${a.slug}" class="trending-item">
        <span class="trending-num">0${i+1}</span>
        <div>
          <div class="trending-title">${escHtml(a.title)}</div>
          <div class="trending-meta">${formatDate(a.date)} · ${(a.category||'Markets').charAt(0).toUpperCase()+(a.category||'markets').slice(1)}</div>
        </div>
      </a>`).join('');
  } catch(e) {}
}

// ── ARTICLE PAGE ──────────────────────────────────────
async function loadArticlePage() {
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) return;
  try {
    const res  = await fetch('/api/articles.json?v=' + Date.now());
    const data = await res.json();
    const art  = (data.articles || []).find(a => a.slug === slug);
    if (!art) {
      document.getElementById('articleHeadline').textContent = 'Article not found';
      return;
    }

    // Page title & meta
    document.title = art.title + ' | MarketWirePro';
    document.getElementById('metaDesc')?.setAttribute('content', art.excerpt || art.title);
    document.getElementById('ogTitle')?.setAttribute('content', art.title);
    document.getElementById('ogDesc')?.setAttribute('content', art.excerpt || '');
    document.getElementById('ogImage')?.setAttribute('content', art.image || '');

    // Content
    document.getElementById('articleHeadline').textContent = art.title;
    document.getElementById('articleDate').textContent     = formatDate(art.date);
    document.getElementById('articleContent').innerHTML    = art.content || '<p>Content unavailable.</p>';

    // Category tag
    const tagEl = document.getElementById('articleTag');
    if (tagEl) { tagEl.textContent = (art.category||'Markets').charAt(0).toUpperCase()+(art.category||'markets').slice(1); tagEl.className = 'article-tag ' + (art.category||'markets'); }

    // Breadcrumb
    const catEl = document.getElementById('breadCat');
    if (catEl) { catEl.textContent = art.category||'Markets'; catEl.href = '/'+(art.category||'markets')+'/'; }
    const breadTitle = document.getElementById('breadTitle');
    if (breadTitle) breadTitle.textContent = art.title.substring(0,45)+'...';

    // Feature image
    const featImg = document.getElementById('articleFeatImg');
    if (featImg) { featImg.src = art.image || fallbackImg(art.category); featImg.alt = art.title; }

    // Tags
    if (art.tags?.length) {
      const tagsWrap = document.getElementById('articleTags');
      if (tagsWrap) tagsWrap.innerHTML = art.tags.map(t => `<span class="tag-pill">${escHtml(t)}</span>`).join('');
    }

    // Read time
    const words = (art.content||'').replace(/<[^>]*>/g,'').split(/\s+/).length;
    const rtEl  = document.querySelector('.read-time');
    if (rtEl) rtEl.textContent = Math.max(2, Math.ceil(words/200)) + ' min read';

    // Schema
    const schema = document.getElementById('articleSchema');
    if (schema) schema.textContent = JSON.stringify({
      "@context":"https://schema.org","@type":"NewsArticle",
      "headline": art.title, "description": art.excerpt||'',
      "image": art.image||'', "datePublished": art.date||'',
      "dateModified": art.date||'',
      "author":{"@type":"Organization","name":"MarketWirePro Desk"},
      "publisher":{"@type":"Organization","name":"MarketWirePro","logo":{"@type":"ImageObject","url":"https://marketwirepro.com/images/logo.png"}},
      "mainEntityOfPage":{"@type":"WebPage","@id":window.location.href}
    });

    // Share links
    const url   = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(art.title);
    document.querySelectorAll('.share-tw').forEach(b => b.href = `https://twitter.com/intent/tweet?url=${url}&text=${title}`);
    document.querySelectorAll('.share-fb').forEach(b => b.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`);
    document.querySelectorAll('.share-wa').forEach(b => b.href = `https://wa.me/?text=${title}%20${url}`);

    // Related
    loadRelated(art.category, art.slug);

  } catch(e) { console.error('Article load error:', e); }
}

async function loadRelated(category, currentSlug) {
  const wrap = document.getElementById('relatedArticles');
  if (!wrap) return;
  try {
    const res  = await fetch('/api/articles.json?v=' + Date.now());
    const data = await res.json();
    const rel  = (data.articles||[]).filter(a => a.category === category && a.slug !== currentSlug).slice(0,3);
    wrap.innerHTML = rel.length ? rel.map(a => newsCardHTML(a)).join('') : '<p style="color:var(--muted);font-size:13px;">More articles coming soon.</p>';
  } catch(e) {}
}

// ── CATEGORY PAGE ─────────────────────────────────────
async function loadCategoryPage() {
  const catEl = document.querySelector('[data-category]');
  if (!catEl) return;
  const cat  = catEl.dataset.category;
  const list = document.getElementById('articleList');
  if (!list) return;
  try {
    const res  = await fetch('/api/articles.json?v=' + Date.now());
    const data = await res.json();
    const arts = (data.articles||[]).filter(a => a.category === cat).slice(0, 20);
    list.innerHTML = arts.length ? arts.map(a => newsCardHTML(a)).join('') : '<p style="color:var(--muted);padding:20px 0;">No articles yet in this category. Check back soon.</p>';
  } catch(e) {}
}

// ── HOMEPAGE ──────────────────────────────────────────
async function loadHomepage() {
  if (!document.querySelector('.hero-section')) return;
  try {
    const res  = await fetch('/api/articles.json?v=' + Date.now());
    const data = await res.json();
    const arts = data.articles || [];

    // Hero grid
    const heroGrid = document.getElementById('heroGrid');
    if (heroGrid && arts.length >= 1) {
      const [a1, a2, a3] = arts;
      heroGrid.innerHTML = `
        <a href="/article.html?slug=${a1.slug}" class="hero-featured">
          <img class="article-img" src="${a1.image||fallbackImg(a1.category)}" alt="${escHtml(a1.title)}" loading="eager" onerror="this.src='${fallbackImg(a1.category)}'">
          <div class="article-body">
            <span class="article-tag ${a1.category||'markets'}">${(a1.category||'Markets').charAt(0).toUpperCase()+(a1.category||'markets').slice(1)}</span>
            <div class="article-title">${escHtml(a1.title)}</div>
            <p class="article-excerpt">${escHtml(a1.excerpt||'')}</p>
            <div class="article-meta"><span>MarketWirePro Desk</span><span class="dot"></span><span>${formatDate(a1.date)}</span></div>
          </div>
        </a>
        ${a2?`<a href="/article.html?slug=${a2.slug}" class="hero-small">
          <img class="article-img" src="${a2.image||fallbackImg(a2.category)}" alt="${escHtml(a2.title)}" loading="lazy" onerror="this.src='${fallbackImg(a2.category)}'">
          <div class="article-body">
            <span class="article-tag ${a2.category||'markets'}">${(a2.category||'Markets').charAt(0).toUpperCase()+(a2.category||'markets').slice(1)}</span>
            <div class="article-title">${escHtml(a2.title)}</div>
            <div class="article-meta"><span>${formatDate(a2.date)}</span></div>
          </div>
        </a>`:''}
        ${a3?`<a href="/article.html?slug=${a3.slug}" class="hero-small">
          <img class="article-img" src="${a3.image||fallbackImg(a3.category)}" alt="${escHtml(a3.title)}" loading="lazy" onerror="this.src='${fallbackImg(a3.category)}'">
          <div class="article-body">
            <span class="article-tag ${a3.category||'markets'}">${(a3.category||'Markets').charAt(0).toUpperCase()+(a3.category||'markets').slice(1)}</span>
            <div class="article-title">${escHtml(a3.title)}</div>
            <div class="article-meta"><span>${formatDate(a3.date)}</span></div>
          </div>
        </a>`:''}`;
    }

    // Latest news list
    const latest = document.getElementById('latestArticles');
    if (latest) latest.innerHTML = arts.slice(0,8).map(a => newsCardHTML(a)).join('');

    // Category grids
    const cryptoEl = document.getElementById('cryptoArticles');
    if (cryptoEl) {
      const cryptoArts = arts.filter(a => a.category==='crypto').slice(0,4);
      cryptoEl.innerHTML = cryptoArts.map(a => catCardHTML(a)).join('');
    }
    const forexEl = document.getElementById('forexArticles');
    if (forexEl) {
      const forexArts = arts.filter(a => a.category==='forex').slice(0,4);
      forexEl.innerHTML = forexArts.map(a => catCardHTML(a)).join('');
    }
    const stocksEl = document.getElementById('stocksArticles');
    if (stocksEl) {
      const stocksArts = arts.filter(a => a.category==='stocks').slice(0,4);
      stocksEl.innerHTML = stocksArts.map(a => newsCardHTML(a)).join('');
    }

  } catch(e) { console.error('Homepage load error:', e); }
}

// ── PIP CALCULATOR ────────────────────────────────────
function initPipCalc() {
  const btn = document.getElementById('calcPip');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const pair    = document.getElementById('pipPair')?.value || 'EURUSD';
    const lotSize = parseFloat(document.getElementById('pipLotType')?.value) || 1;
    const isJPY   = pair.includes('JPY');
    const isGold  = pair === 'XAUUSD';
    let pipVal;
    if (isJPY)  pipVal = 0.01   * 100000 * lotSize / 100;
    else if (isGold) pipVal = 0.01 * 100 * lotSize;
    else        pipVal = 0.0001 * 100000 * lotSize;
    const res = document.getElementById('pipResult');
    const val = document.getElementById('pipValue');
    if (res && val) {
      val.textContent = '$' + pipVal.toFixed(2) + ' per pip';
      document.getElementById('pip10')?.setAttribute('style','');
      document.getElementById('pip10') && (document.getElementById('pip10').textContent = '$'+(pipVal*10).toFixed(2));
      document.getElementById('pip50') && (document.getElementById('pip50').textContent = '$'+(pipVal*50).toFixed(2));
      document.getElementById('pip100') && (document.getElementById('pip100').textContent = '$'+(pipVal*100).toFixed(2));
      res.classList.add('show');
    }
  });
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildTicker();
  loadMarketsWidget();
  fetchCryptoPrices();
  fetchForexPrices();
  setInterval(() => { fetchCryptoPrices(); fetchForexPrices(); }, 60000);

  initSearch();
  initMobileNav();
  initBackTop();
  rotateAffiliates();
  initPipCalc();

  if (document.querySelector('.article-page')) loadArticlePage();
  else if (document.querySelector('[data-category]')) loadCategoryPage();
  else if (document.querySelector('.hero-section')) loadHomepage();

  loadTrending();
});
