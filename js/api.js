// ── EconLens API Client ──────────────────────────────────────────
// All communication with the FastAPI backend lives here.
// Set API_BASE to your Railway/Render URL when deployed.
// During local dev, uses the Colab ngrok URL.

const API_BASE = window.ECONLENS_API || 'http://localhost:8000';

const LENSES = {
  prisoners_dilemma:    { label: "Prisoner's Dilemma",     color: 'purple' },
  principal_agent:      { label: "Principal-Agent",         color: 'teal'   },
  nash_equilibrium:     { label: "Nash Equilibrium",        color: 'blue'   },
  market_concentration: { label: "Market Concentration",    color: 'amber'  },
  modern_econ:          { label: "Modern Econ Theory",      color: 'coral'  },
  market_types:         { label: "Market Types",            color: 'green'  },
};

const LENS_BADGE = {
  purple: { bg: '#EEEDFE', fg: '#3C3489' },
  teal:   { bg: '#E1F5EE', fg: '#085041' },
  blue:   { bg: '#E6F1FB', fg: '#0C447C' },
  amber:  { bg: '#FDF3E3', fg: '#C4750A' },
  coral:  { bg: '#FDEAEA', fg: '#B93C3C' },
  green:  { bg: '#E4F4EC', fg: '#2A7A4B' },
};

const GEO_RISK = {
  Low:    { bg: '#E4F4EC', fg: '#2A7A4B', label: 'Low geo risk'    },
  Medium: { bg: '#FDF3E3', fg: '#C4750A', label: 'Medium geo risk' },
  High:   { bg: '#FDEAEA', fg: '#B93C3C', label: 'High geo risk'   },
};

async function analyseStory(story, activeLenses = null) {
  const body = { story };
  if (activeLenses) body.active_lenses = activeLenses;

  const res = await fetch(`${API_BASE}/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

async function fetchFeed() {
  const res = await fetch(`${API_BASE}/feed`);
  if (!res.ok) throw new Error('Could not load feed');
  return res.json();
}

async function fetchLenses() {
  const res = await fetch(`${API_BASE}/lenses`);
  if (!res.ok) throw new Error('Could not load lenses');
  return res.json();
}

// ── Render helpers ───────────────────────────────────────────────

function renderGeoUmbrella(geo) {
  const risk = geo.risk_level || 'Medium';
  const rc = GEO_RISK[risk] || GEO_RISK.Medium;
  const pills = (geo.angles || [])
    .map(a => `<span class="geo-pill">+ ${a}</span>`)
    .join('');

  return `
    <div class="geo-block" style="border-color:${rc.bg}">
      <div class="geo-block__header">
        <span class="geo-block__title">Geopolitical Umbrella</span>
        <span class="badge" style="background:${rc.bg};color:${rc.fg}">${rc.label}</span>
      </div>
      <p class="geo-block__context">${geo.context || ''}
        <em class="geo-block__reason"> — ${geo.risk_reason || ''}</em>
      </p>
      <div class="geo-block__pills">${pills}</div>
    </div>`;
}

function renderLensCard(item) {
  const lens = LENSES[item.key];
  if (!lens) return '';
  const colors = LENS_BADGE[lens.color];
  return `
    <div class="lens-card fade-up">
      <span class="badge" style="background:${colors.bg};color:${colors.fg}">${lens.label}</span>
      <p class="lens-card__insight">${item.insight}</p>
    </div>`;
}

function renderAnalysis(result, container) {
  const lensHTML = (result.lenses || []).map(renderLensCard).join('');
  container.innerHTML = `
    <div class="analysis fade-up">
      <div class="analysis__headline">${result.headline || ''}</div>
      ${renderGeoUmbrella(result.geo_umbrella || {})}
      <div class="analysis__lenses">${lensHTML}</div>
    </div>`;
}

function renderFeedCard(item) {
  const risk = item.geo_umbrella?.risk_level || 'Medium';
  const rc = GEO_RISK[risk] || GEO_RISK.Medium;
  const lensLabels = (item.lenses || [])
    .slice(0, 3)
    .map(l => `<span class="feed-lens-pill">${LENSES[l.key]?.label || l.key}</span>`)
    .join('');

  return `
    <article class="feed-card card card--hover" data-story='${JSON.stringify(item.story || "").replace(/'/g, "&#39;")}'>
      <div class="feed-card__inner">
        <div class="feed-card__meta">
          <span class="badge" style="background:${rc.bg};color:${rc.fg}">${rc.label}</span>
        </div>
        <h3 class="feed-card__headline">${item.headline || ''}</h3>
        <p class="feed-card__snippet">${(item.geo_umbrella?.context || '').substring(0, 140)}…</p>
        <div class="feed-card__lenses">${lensLabels}</div>
        <button class="btn btn--ghost feed-card__expand">Read full analysis →</button>
      </div>
    </article>`;
}
