/* ═══════════════════════════════════════════════════
   MARKETWIREPRO — Main JavaScript
   ═══════════════════════════════════════════════════ */

// ── TICKER ──────────────────────────────────────────
const TICKER_DATA = [
  { name: 'BTC/USD', price: '0.00', change: '+0.00%', up: true },
  { name: 'ETH/USD', price: '0.00', change: '+0.00%', up: true },
  { name: 'XAU/USD', price: '0.00', change: '+0.00%', up: true },
  { name: 'EUR/USD', price: '0.0000', change: '+0.00%', up: true },
  { name: 'GBP/USD', price: '0.0000', change: '-0.00%', up: false },
  { name: 'S&P 500',  price: '0.00',  change: '+0.00%', up: true },
  { name: 'NASDAQ',   price: '0.00',  change: '+0.00%', up: true },
  { name: 'DOW',      price: '0.00',  change: '-0.00%', up: false },
  { name: 'USD/JPY',  price: '0.00',  change: '+0.00%', up: true },
  { name: 'BNB/USD',  price: '0.00',  change: '+0.00%', up: true },
];

function buildTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track) return;
  const items = [...TICKER_DATA, ...TICKER_DATA].map(d => `
    <span class="ticker-item">
      <span class="ticker-name">${d.name}</span>
      <span class="ticker-price" data-sym="${d.name}">${d.price}</span>
      <span class="ticker-change ${d.up ? 'up' : 'down'}">${d.change}</span>
    </span>
  `).join('');
  track.innerHTML = items;
}

// Fetch live prices from CoinGecko (free, no key)
async function fetchPrices() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=usd&include_24hr_change=true');
    const data = await res.json();
    updatePrice('BTC/USD', data.bitcoin?.usd, data.bitcoin?.usd_24h_change);
    updatePrice('ETH/USD', data.ethereum?.usd, data.ethereum?.usd_24h_change);
    updatePrice('BNB/USD', data.binancecoin?.usd, data.binancecoin?.usd_24h_change);
  } catch(e) {}
}

function updatePrice(sym, price, change) {
  if (!price) return;
  document.querySelectorAll(`[data-sym="${sym}"]`).forEach(el => {
    el.textContent = '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const chEl = el.nextElementSibling;
    if (chEl && change !== undefined) {
      const pct = change.toFixed(2);
      chEl.textContent = (change >= 0 ? '+' : '') + pct + '%';
      chEl.className = 'ticker-change ' + (change >= 0 ? 'up' : 'down');
    }
  });
}

// ── SEARCH ──────────────────────────────────────────
function initSearch() {
  const btn     = document.querySelector('.search-btn');
  const overlay = document.querySelector('.search-overlay');
  const close   = document.querySelector('.search-close');
  const input   = document.querySelector('.search-input');
  if (!btn || !overlay) return;

  btn.addEventListener('click', () => {
    overlay.classList.add('open');
    setTimeout(() => input?.focus(), 100);
  });
  close?.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.classList.remove('open');
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      overlay.classList.add('open');
      setTimeout(() => input?.focus(), 100);
    }
  });

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
    }
  });
}

// ── MOBILE NAV ──────────────────────────────────────
function initMobileNav() {
  const ham   = document.querySelector('.hamburger');
  const nav   = document.querySelector('.mobile-nav');
  const close = document.querySelector('.mobile-close');
  if (!ham || !nav) return;
  ham.addEventListener('click', () => nav.classList.add('open'));
  close?.addEventListener('click', () => nav.classList.remove('open'));
}

// ── BACK TO TOP ─────────────────────────────────────
function initBackTop() {
  const btn = document.querySelector('.back-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── READ TIME ────────────────────────────────────────
function calcReadTime() {
  const content = document.querySelector('.article-content');
  const el = document.querySelector('.read-time');
  if (!content || !el) return;
  const words = content.textContent.trim().split(/\s+/).length;
  const mins  = Math.ceil(words / 200);
  el.textContent = mins + ' min read';
}

// ── AFFILIATE ROTATION ───────────────────────────────
const XM_BANNERS_728 = [
  '<a href="https://clicks.pipaffiliates.com/c?m=131492&c=1129129" referrerpolicy="no-referrer-when-downgrade"><img src="https://ads.pipaffiliates.com/i/131492?c=1129129" width="728" height="90" referrerpolicy="no-referrer-when-downgrade"/></a>',
  '<a href="https://clicks.pipaffiliates.com/c?m=131532&c=1129129" referrerpolicy="no-referrer-when-downgrade"><img src="https://ads.pipaffiliates.com/i/131532?c=1129129" width="728" height="90" referrerpolicy="no-referrer-when-downgrade"/></a>',
  '<a href="https://clicks.pipaffiliates.com/c?m=132219&c=1129129" referrerpolicy="no-referrer-when-downgrade"><img src="https://ads.pipaffiliates.com/i/132219?c=1129129" width="728" height="90" referrerpolicy="no-referrer-when-downgrade"/></a>',
  '<a href="https://clicks.pipaffiliates.com/c?m=132386&c=1129129" referrerpolicy="no-referrer-when-downgrade"><img src="https://ads.pipaffiliates.com/i/132386?c=1129129" width="728" height="90" referrerpolicy="no-referrer-when-downgrade"/></a>',
  '<a href="https://clicks.pipaffiliates.com/c?m=133412&c=1129129" referrerpolicy="no-referrer-when-downgrade"><img src="https://ads.pipaffiliates.com/i/133412?c=1129129" width="728" height="90" referrerpolicy="no-referrer-when-downgrade"/></a>',
];

function rotateAffiliates() {
  document.querySelectorAll('.xm-banner-728').forEach(el => {
    const idx = Math.floor(Math.random() * XM_BANNERS_728.length);
    el.innerHTML = XM_BANNERS_728[idx];
  });
}

// ── LAZY IMAGES ──────────────────────────────────────
function initLazyLoad() {
  const imgs = document.querySelectorAll('img[data-src]');
  if (!imgs.length) return;
  const obs = new IntersectionObserver((entries, o) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        o.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });
  imgs.forEach(img => obs.observe(img));
}

// ── MARKETS WIDGET ───────────────────────────────────
async function loadMarketsWidget() {
  const wrap = document.querySelector('.markets-widget-body');
  if (!wrap) return;
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd&include_24hr_change=true');
    const data = await res.json();
    const pairs = [
      { name: 'Bitcoin',  sym: 'BTC', id: 'bitcoin' },
      { name: 'Ethereum', sym: 'ETH', id: 'ethereum' },
      { name: 'BNB',      sym: 'BNB', id: 'binancecoin' },
      { name: 'Solana',   sym: 'SOL', id: 'solana' },
    ];
    wrap.innerHTML = pairs.map(p => {
      const price  = data[p.id]?.usd || 0;
      const change = data[p.id]?.usd_24h_change || 0;
      const up     = change >= 0;
      return `
        <div class="market-row">
          <span class="market-name">${p.sym}</span>
          <span class="market-price">$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="market-change ${up ? 'up' : 'down'}">${up ? '+' : ''}${change.toFixed(2)}%</span>
        </div>`;
    }).join('');
  } catch(e) {
    wrap.innerHTML = '<p style="color:var(--muted);font-size:13px;">Market data unavailable</p>';
  }
}

// ── ARTICLES LOADER ──────────────────────────────────
async function loadArticles(containerId, category = '', limit = 10) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const url = category ? `/api/articles.json` : `/api/articles.json`;
    const res  = await fetch(url);
    const data = await res.json();
    let articles = data.articles || [];
    if (category) articles = articles.filter(a => a.category === category);
    articles = articles.slice(0, limit);
    if (!articles.length) {
      container.innerHTML = '<p style="color:var(--muted);padding:20px;">No articles yet. Check back soon.</p>';
      return;
    }
    container.innerHTML = articles.map(a => newsCardHTML(a)).join('');
  } catch(e) {
    container.innerHTML = '<p style="color:var(--muted);padding:20px;">Loading articles...</p>';
  }
}

function newsCardHTML(a) {
  const tagClass = a.category || 'markets';
  const img = a.image || `https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=400`;
  return `
    <a href="/article.html?slug=${a.slug}" class="news-card">
      <img class="news-card-img" src="${img}" alt="${a.title}" loading="lazy">
      <div class="news-card-body">
        <span class="article-tag ${tagClass}">${a.category || 'Markets'}</span>
        <div class="news-card-title">${a.title}</div>
        <div class="article-meta">
          <span>MarketWirePro Desk</span>
          <span class="dot"></span>
          <span>${formatDate(a.date)}</span>
          <span class="dot"></span>
          <span>${a.readTime || '3'} min read</span>
        </div>
      </div>
    </a>`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 60)  return diff + 'm ago';
  if (diff < 1440) return Math.floor(diff/60) + 'h ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── PIP CALCULATOR ───────────────────────────────────
function initPipCalc() {
  const btn = document.getElementById('calcPip');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const pair     = document.getElementById('pipPair')?.value || 'EURUSD';
    const lots     = parseFloat(document.getElementById('pipLots')?.value) || 1;
    const pipSize  = pair.includes('JPY') ? 0.01 : 0.0001;
    const pipValue = pair.includes('JPY') ? (pipSize / 1) * lots * 100000 : pipSize * lots * 100000;
    const result   = document.getElementById('pipResult');
    const val      = document.getElementById('pipValue');
    if (result && val) {
      val.textContent = '$' + pipValue.toFixed(2) + ' per pip';
      result.classList.add('show');
    }
  });
}

// ── PROFIT CALCULATOR ────────────────────────────────
function initProfitCalc() {
  const btn = document.getElementById('calcProfit');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const entry  = parseFloat(document.getElementById('profEntry')?.value) || 0;
    const exit   = parseFloat(document.getElementById('profExit')?.value) || 0;
    const lots   = parseFloat(document.getElementById('profLots')?.value) || 1;
    const type   = document.getElementById('profType')?.value || 'buy';
    const pnl    = type === 'buy' ? (exit - entry) * lots * 100000 * 0.0001 : (entry - exit) * lots * 100000 * 0.0001;
    const result = document.getElementById('profitResult');
    const val    = document.getElementById('profitValue');
    if (result && val) {
      val.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
      val.style.color = pnl >= 0 ? 'var(--green)' : 'var(--red)';
      result.classList.add('show');
    }
  });
}

// ── CRYPTO CONVERTER ─────────────────────────────────
function initCryptoConvert() {
  const btn = document.getElementById('calcConvert');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('convAmount')?.value) || 1;
    const from   = document.getElementById('convFrom')?.value || 'bitcoin';
    const to     = document.getElementById('convTo')?.value || 'usd';
    try {
      const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${from}&vs_currencies=${to}`);
      const data = await res.json();
      const rate = data[from]?.[to] || 0;
      const converted = amount * rate;
      const result = document.getElementById('convertResult');
      const val    = document.getElementById('convertValue');
      if (result && val) {
        val.textContent = converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
        result.classList.add('show');
      }
    } catch(e) {}
  });
}

// ── ARTICLE PAGE LOADER ──────────────────────────────
async function loadArticlePage() {
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');
  if (!slug) return;
  try {
    const res  = await fetch(`/api/articles.json`);
    const data = await res.json();
    const art  = (data.articles || []).find(a => a.slug === slug);
    if (!art) return;

    document.title = art.title + ' | MarketWirePro';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = art.excerpt || art.title;

    const headline = document.querySelector('.article-headline');
    if (headline) headline.textContent = art.title;

    const content = document.querySelector('.article-content');
    if (content) content.innerHTML = art.content || art.body || '';

    const featImg = document.querySelector('.article-feature-img');
    if (featImg && art.image) { featImg.src = art.image; featImg.alt = art.title; }

    const dateEl = document.querySelector('.article-date');
    if (dateEl) dateEl.textContent = formatDate(art.date);

    const tagEl = document.querySelector('.article-tag-top');
    if (tagEl) { tagEl.textContent = art.category || 'Markets'; tagEl.className = 'article-tag ' + (art.category || 'markets'); }

    const tagsWrap = document.querySelector('.article-tags');
    if (tagsWrap && art.tags) {
      tagsWrap.innerHTML = art.tags.map(t => `<span class="tag-pill">${t}</span>`).join('');
    }

    calcReadTime();

    // Load related
    loadRelated(art.category, art.slug);
  } catch(e) {}
}

async function loadRelated(category, currentSlug) {
  const wrap = document.getElementById('relatedArticles');
  if (!wrap) return;
  try {
    const res  = await fetch(`/api/articles.json`);
    const data = await res.json();
    const related = (data.articles || [])
      .filter(a => a.category === category && a.slug !== currentSlug)
      .slice(0, 3);
    wrap.innerHTML = related.map(a => newsCardHTML(a)).join('');
  } catch(e) {}
}

// ── SHARE BUTTONS ────────────────────────────────────
function initShare() {
  const url   = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  document.querySelectorAll('.share-tw').forEach(btn => {
    btn.href = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
  });
  document.querySelectorAll('.share-fb').forEach(btn => {
    btn.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  });
  document.querySelectorAll('.share-wa').forEach(btn => {
    btn.href = `https://wa.me/?text=${title}%20${url}`;
  });
}

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildTicker();
  fetchPrices();
  setInterval(fetchPrices, 60000);
  initSearch();
  initMobileNav();
  initBackTop();
  initLazyLoad();
  loadMarketsWidget();
  rotateAffiliates();
  initPipCalc();
  initProfitCalc();
  initCryptoConvert();
  initShare();

  // Article page
  if (document.querySelector('.article-page')) loadArticlePage();

  // Category pages
  const catEl = document.querySelector('[data-category]');
  if (catEl) loadArticles('articleList', catEl.dataset.category, 20);

  // Homepage
  if (document.querySelector('.hero-section')) {
    loadArticles('latestArticles', '', 8);
    loadArticles('cryptoArticles', 'crypto', 4);
    loadArticles('forexArticles',  'forex',  4);
    loadArticles('stocksArticles', 'stocks', 4);
  }

  // Trending sidebar
  loadTrending();
});

async function loadTrending() {
  const wrap = document.querySelector('.trending-list');
  if (!wrap) return;
  try {
    const res  = await fetch('/api/articles.json');
    const data = await res.json();
    const top5 = (data.articles || []).slice(0, 5);
    wrap.innerHTML = top5.map((a, i) => `
      <a href="/article.html?slug=${a.slug}" class="trending-item">
        <span class="trending-num">0${i+1}</span>
        <div>
          <div class="trending-title">${a.title}</div>
          <div class="trending-meta">${formatDate(a.date)} · ${a.category || 'Markets'}</div>
        </div>
      </a>`).join('');
  } catch(e) {}
}
