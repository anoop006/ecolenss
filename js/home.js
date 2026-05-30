// ── EconLens Home ────────────────────────────────────────────────
document.getElementById('today-date').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

let LIVE_FEED = [];

// ── Load feed ────────────────────────────────────────────────────
async function loadFeed() {
  const grid = document.getElementById('feed-grid');
  document.getElementById('feed-static').style.display = 'none';

  // Skeleton cards immediately
  grid.innerHTML = Array.from({length:6}, (_,i) => `
    <div class="feed-card card" style="opacity:${1-i*0.12}">
      <div class="feed-card__inner">
        <div style="height:11px;background:var(--paper-warm);border-radius:4px;width:80px;margin-bottom:12px;animation:shimmer 1.4s ease infinite"></div>
        <div style="height:15px;background:var(--paper-warm);border-radius:4px;margin-bottom:6px;animation:shimmer 1.4s ease infinite"></div>
        <div style="height:15px;background:var(--paper-warm);border-radius:4px;width:70%;margin-bottom:12px;animation:shimmer 1.4s ease infinite"></div>
        <div style="height:11px;background:var(--paper-warm);border-radius:4px;width:45%;animation:shimmer 1.4s ease infinite"></div>
      </div>
    </div>`).join('');

  try {
    const headlines = await fetchHeadlines();
    if (!headlines.length) throw new Error('No stories returned');

    // Build LIVE_FEED from server data
    LIVE_FEED = headlines.map(h => ({
      ...h,
      headline: h._data?.headline || h.title,
      rawStory: `${h.title}. ${h.description}`,
    }));

    grid.innerHTML = LIVE_FEED.map((item, i) => renderLiveFeedCard(item, i)).join('');
    attachFeedListeners();
    showFeedMeta(headlines.length);

  } catch (err) {
    // Demo fallback
    LIVE_FEED = DEMO_STORIES.map(s => ({ ...s, _data: s, _analysed: true, title: s.headline }));
    grid.innerHTML = LIVE_FEED.map((item, i) => renderLiveFeedCard(item, i)).join('');
    attachFeedListeners();
    const banner = document.createElement('div');
    banner.className = 'demo-banner';
    grid.parentElement.insertBefore(banner, grid);
  }
}

function attachFeedListeners() {
  document.querySelectorAll('.feed-card').forEach(card => {
    card.querySelector('.feed-card__expand')?.addEventListener('click', e => {
      e.stopPropagation();
      const idx  = parseInt(card.dataset.idx);
      const item = LIVE_FEED[idx];
      if (!item) return;
      const data = item._analysed ? item._data : null;
      openDrawer(data, item.rawStory || item.title, idx);
    });
  });
}

function showFeedMeta(total) {
  const h = document.querySelector('.feed-header');
  if (!h) return;
  document.getElementById('feed-meta')?.remove();
  const p = document.createElement('p');
  p.id = 'feed-meta';
  p.style.cssText = 'font-size:.78rem;color:var(--ink-mute);margin-top:4px';
  p.textContent = `${total} stories · refreshes every 30 min`;
  h.appendChild(p);
}

// ── Drawer ───────────────────────────────────────────────────────
function openDrawer(data, story, idx) {
  const overlay = document.createElement('div');
  overlay.className = 'analysis-overlay';
  const drawer = document.createElement('div');
  drawer.className = 'analysis-drawer';
  const closeBtn = `<button type="button" class="btn btn--ghost" onclick="this.closest('.analysis-overlay').remove()">✕ Close</button>`;

  drawer.innerHTML = `
    <div class="analysis-drawer__close">${closeBtn}</div>
    <div class="analysis-drawer__body" id="drawer-body">
      ${data ? '' : `<div style="padding:32px 0;display:flex;align-items:center;gap:10px;color:var(--ink-mute)"><div class="dots"><span></span><span></span><span></span></div> Analysing…</div>`}
    </div>`;
  overlay.appendChild(drawer);
  document.body.appendChild(overlay);

  const body = document.getElementById('drawer-body');
  if (data) {
    renderDrawer(data, body);
  } else {
    callGroqForFeed(story)
      .then(result => {
        if (idx !== undefined && LIVE_FEED[idx]) {
          LIVE_FEED[idx]._data      = result;
          LIVE_FEED[idx]._analysed  = true;
          const card = document.querySelector(`.feed-card[data-idx="${idx}"]`);
          if (card) { card.outerHTML = renderLiveFeedCard(LIVE_FEED[idx], idx); attachFeedListeners(); }
        }
        renderDrawer(result, body);
      })
      .catch(err => { body.innerHTML = `<p style="color:var(--red);padding:20px 0;font-size:.9rem">Error: ${err.message}</p>`; });
  }
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function renderDrawer(result, container) {
  const GEO_RISK = {
    Low:    { bg:'#E4F4EC', fg:'#2A7A4B', lbl:'Low geo risk'    },
    Medium: { bg:'#FDF3E3', fg:'#C4750A', lbl:'Medium geo risk' },
    High:   { bg:'#FDEAEA', fg:'#B93C3C', lbl:'High geo risk'   },
  };
  const LENS_COLORS = {
    prisoners_dilemma:    { lbl:"Prisoner's Dilemma",  bg:'#EEEDFE', fg:'#3C3489' },
    principal_agent:      { lbl:"Principal-Agent",      bg:'#E1F5EE', fg:'#085041' },
    nash_equilibrium:     { lbl:"Nash Equilibrium",     bg:'#E6F1FB', fg:'#0C447C' },
    market_concentration: { lbl:"Market Concentration", bg:'#FDF3E3', fg:'#C4750A' },
    modern_econ:          { lbl:"Modern Econ Theory",   bg:'#FDEAEA', fg:'#B93C3C' },
    market_types:         { lbl:"Market Types",         bg:'#E4F4EC', fg:'#2A7A4B' },
  };
  const geo   = result.geo_umbrella || {};
  const rc    = GEO_RISK[geo.risk_level] || GEO_RISK.Medium;
  const pills = (geo.angles||[]).map(a=>`<span class="geo-pill">+ ${a}</span>`).join('');
  const cards = (result.lenses||[]).map(item => {
    const l = LENS_COLORS[item.key]; if (!l) return '';
    return `<div class="lens-card fade-up">
      <span style="display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;margin-bottom:8px;background:${l.bg};color:${l.fg}">${l.lbl}</span>
      <p class="lens-card__insight">${item.insight}</p>
    </div>`;
  }).join('');
  const verdict = result.verdict || result.headline || '';
  const src = result.source ? `<div style="margin-bottom:12px;display:flex;gap:8px;align-items:center">
    <span style="font-size:.75rem;color:var(--ink-mute)">${result.flag||''} ${result.source}</span>
    ${result.link ? `<a href="${result.link}" target="_blank" rel="noopener" style="font-size:.75rem;color:var(--teal);text-decoration:none">Read original ↗</a>` : ''}
  </div>` : '';

  container.innerHTML = `
    <div class="analysis fade-up">
      ${src}
      <div class="analysis__headline">${result.headline||''}</div>
      ${geo.context ? `
      <div class="geo-block" style="border-color:${rc.bg}">
        <div class="geo-block__header">
          <span class="geo-block__title">Geopolitical Umbrella</span>
          <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${rc.bg};color:${rc.fg}">${rc.lbl}</span>
        </div>
        <p class="geo-block__context">${geo.context}<em class="geo-block__reason"> — ${geo.risk_reason||''}</em></p>
        <div class="geo-block__pills">${pills}</div>
      </div>` : ''}
      <div class="analysis__lenses">${cards}</div>
      ${verdict ? `<div class="verdict-block">
        <div><div class="verdict-block__label">The Verdict</div>
        <div class="verdict-block__text" id="verdict-text">${verdict}</div></div>
        <button type="button" class="verdict-copy" onclick="
          navigator.clipboard?.writeText(document.getElementById('verdict-text').textContent);
          this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)">Copy</button>
      </div>` : ''}
    </div>`;
}

// ── Demo stories fallback ────────────────────────────────────────
const DEMO_STORIES = [
  { headline:"India's telecom duopoly is trapped in a pricing standoff neither player can break unilaterally.",
    geo_umbrella:{ context:"India's telecom market sits at the intersection of national digital infrastructure goals and foreign capital restrictions.", risk_level:"Medium", risk_reason:"Domestic political pressure limits pricing freedom even in a two-player market.", angles:["India-China-US triangle","Currency & forex pressure"] },
    lenses:[ {key:"prisoners_dilemma",insight:"Both Jio and Airtel would profit if they raised prices together, but each fears the other will defect."}, {key:"nash_equilibrium",insight:"The current low-price equilibrium is stable — neither player can improve by raising prices alone."}, {key:"market_concentration",insight:"A two-player market should allow pricing power, yet Jio's disruption history prevents coordination."} ],
    verdict:"Two rational players are collectively irrational — the textbook prisoner's dilemma made real.", source:"Demo", flag:"🇮🇳", link:"" },
  { headline:"India's China+1 opportunity is real but paradoxical — scaling requires the very supply chain it replaces.",
    geo_umbrella:{ context:"The US-China trade war has accelerated supply chain diversification globally. India is positioned as the primary China+1 beneficiary.", risk_level:"High", risk_reason:"Deep dependency on Chinese machinery creates a structural contradiction.", angles:["Trade wars & tariffs","India-China-US triangle","Sanctions & supply chains"] },
    lenses:[ {key:"prisoners_dilemma",insight:"Indian manufacturers want to decouple from China but individually depend on Chinese inputs — a collective action problem."}, {key:"market_concentration",insight:"Chinese component makers hold oligopoly power; India cannot replace them overnight."}, {key:"modern_econ",insight:"Network effects in Chinese manufacturing clusters take decades to replicate."} ],
    verdict:"India is trying to climb a ladder while simultaneously removing its rungs.", source:"Demo", flag:"🇮🇳", link:"" },
];

// ── Newsletter ───────────────────────────────────────────────────
function handleSubscribe(e) {
  e.preventDefault();
  const email = document.getElementById('email-input').value;
  const msg   = document.getElementById('subscribe-msg');
  msg.textContent = `✓ ${email} added. Welcome to EconLens!`;
  msg.style.color = 'var(--teal)';
  document.getElementById('newsletter-form').reset();
}

// ── Refresh button ───────────────────────────────────────────────
function addRefreshBtn() {
  const h = document.querySelector('.feed-header');
  if (!h || document.getElementById('refresh-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'refresh-btn'; btn.type = 'button'; btn.className = 'btn btn--outline';
  btn.style.cssText = 'font-size:.8rem;padding:5px 12px;margin-top:8px';
  btn.textContent = '↻ Refresh feed';
  btn.onclick = loadFeed;
  h.appendChild(btn);
}

// ── Styles ───────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}
  .demo-banner{grid-column:1/-1;display:flex;align-items:center;gap:8px;font-size:.82rem;color:var(--ink-mute);background:var(--paper-warm);border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 14px;margin-bottom:4px}
`;
document.head.appendChild(style);

// ── Init ─────────────────────────────────────────────────────────
addRefreshBtn();
loadFeed();
