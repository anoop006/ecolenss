// ── EconLens News Fetcher ────────────────────────────────────────
// All API calls go through YOUR backend (Railway).
// No keys needed in the browser — ever.
//
// Set ECONLENS_API in index.html to your Railway URL:
// window.ECONLENS_API = 'https://econlens-api.up.railway.app';

const AUTO_ANALYSE_COUNT = 2;

async function fetchHeadlines() {
  const base = window.ECONLENS_API || 'http://localhost:8000';
  const res  = await fetch(`${base}/feed`);
  if (!res.ok) throw new Error(`Feed error ${res.status}`);
  const data = await res.json();
  // Normalise field names from backend
  return (data.stories || []).map(s => ({
    title:       s.headline || s.title || '',
    description: s.geo_umbrella?.context || '',
    link:        s.link || '',
    pubDate:     s.pub_date || s.pubDate || '',
    source:      s.source || '',
    flag:        s.flag || '🌐',
    // carry full analysis if already done server-side
    _analysed:   !s._pending,
    _data:       s,
  }));
}

async function callGroqForFeed(story) {
  const base = window.ECONLENS_API || 'http://localhost:8000';
  const res  = await fetch(`${base}/analyse`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ story, active_lenses: ['prisoners_dilemma','nash_equilibrium','market_concentration'] })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || `API error ${res.status}`);
  }
  return res.json();
}

function renderLiveFeedCard(item, idx) {
  const GEO_RISK = {
    Low:    { bg:'#E4F4EC', fg:'#2A7A4B', lbl:'Low geo risk'    },
    Medium: { bg:'#FDF3E3', fg:'#C4750A', lbl:'Medium geo risk' },
    High:   { bg:'#FDEAEA', fg:'#B93C3C', lbl:'High geo risk'   },
  };
  const LENS_LABELS = {
    prisoners_dilemma:    "Prisoner's Dilemma",
    principal_agent:      "Principal-Agent",
    nash_equilibrium:     "Nash Equilibrium",
    market_concentration: "Market Concentration",
    modern_econ:          "Modern Econ Theory",
    market_types:         "Market Types",
  };

  const d       = item._data || {};
  const geo     = d.geo_umbrella || {};
  const rc      = GEO_RISK[geo.risk_level] || GEO_RISK.Medium;
  const pending = d._pending !== false && !item._analysed;
  const age     = item.pubDate ? timeAgo(item.pubDate) : '';
  const lensHtml = (d.lenses || []).slice(0,3)
    .map(l => `<span class="feed-lens-pill">${LENS_LABELS[l.key] || l.key}</span>`).join('');

  const metaBadge = pending
    ? `<span class="badge" style="background:var(--paper-warm);color:var(--ink-mute);border:1px solid var(--border)">Click to analyse</span>`
    : `<span class="badge" style="background:${rc.bg};color:${rc.fg}">${rc.lbl}</span>`;

  return `
    <article class="feed-card card card--hover" data-idx="${idx}">
      <div class="feed-card__inner">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:10px">
          ${metaBadge}
          <div style="display:flex;align-items:center;gap:5px">
            <span style="font-size:.68rem;color:var(--ink-mute)">${item.flag||''} ${item.source||''}</span>
            ${age ? `<span style="font-size:.65rem;color:var(--ink-mute)">· ${age}</span>` : ''}
          </div>
        </div>
        <h3 class="feed-card__headline">${d.headline || item.title || ''}</h3>
        ${!pending && geo.context ? `<p class="feed-card__snippet">${geo.context.slice(0,130)}…</p>` : ''}
        ${lensHtml ? `<div class="feed-card__lenses">${lensHtml}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
          <button type="button" class="btn btn--ghost feed-card__expand"
            style="font-size:.82rem;padding:4px 0;color:var(--teal);font-weight:600">
            ${pending ? '⚡ Analyse now →' : 'Read full analysis →'}
          </button>
          ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener"
            style="font-size:.72rem;color:var(--ink-mute);text-decoration:none"
            onclick="event.stopPropagation()">Source ↗</a>` : ''}
        </div>
      </div>
    </article>`;
}

function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  } catch { return ''; }
}
