// ── EconLens Analyser ────────────────────────────────────────────

const EXAMPLE_STORY = `India is accelerating its push to reduce dependence on Chinese electronics components, as US tariffs on China force global supply chains to restructure. Tata Electronics and Dixon Technologies are racing to capture Apple and Samsung manufacturing contracts, but both need Chinese machinery and engineers to scale — creating a paradox at the heart of the 'China+1' strategy.`;

// ── Elements ─────────────────────────────────────────────────────
const storyInput    = document.getElementById('story-input');
const charCount     = document.getElementById('char-count');
const apiUrlInput   = document.getElementById('api-url-input');
const analyseBtn    = document.getElementById('analyse-btn');
const clearBtn      = document.getElementById('clear-btn');
const exampleBtn    = document.getElementById('load-example-btn');
const statusEl      = document.getElementById('analyser-status');
const resultsEl     = document.getElementById('analyser-results');

// ── Lens toggle state ────────────────────────────────────────────
document.querySelectorAll('.lens-toggle').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('active'));
});

function getActiveLenses() {
  return [...document.querySelectorAll('.lens-toggle.active')]
    .map(b => b.dataset.key);
}

// ── Char count ───────────────────────────────────────────────────
storyInput.addEventListener('input', () => {
  const n = storyInput.value.length;
  charCount.textContent = `${n} character${n !== 1 ? 's' : ''}`;
});

// ── Load example ─────────────────────────────────────────────────
exampleBtn.addEventListener('click', () => {
  storyInput.value = EXAMPLE_STORY;
  storyInput.dispatchEvent(new Event('input'));
});

// ── Clear ────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  storyInput.value = '';
  storyInput.dispatchEvent(new Event('input'));
  resultsEl.innerHTML = '';
  setStatus('');
});

// ── API URL sync ─────────────────────────────────────────────────
apiUrlInput.addEventListener('change', () => {
  window.ECONLENS_API = apiUrlInput.value.trim().replace(/\/$/, '');
});

// ── Status helpers ───────────────────────────────────────────────
function setStatus(msg, isError = false) {
  statusEl.className = 'analyser-status' + (isError ? ' analyser-status--error' : '');
  statusEl.innerHTML = msg;
}

function setLoading(on) {
  if (on) {
    analyseBtn.disabled = true;
    analyseBtn.textContent = 'Analysing…';
    setStatus(`<div class="dots"><span></span><span></span><span></span></div> Applying geopolitical umbrella and economic lenses…`);
    resultsEl.innerHTML = '';
  } else {
    analyseBtn.disabled = false;
    analyseBtn.textContent = 'Analyse story →';
  }
}

// ── Analyse ──────────────────────────────────────────────────────
analyseBtn.addEventListener('click', async () => {
  const story = storyInput.value.trim();
  if (!story) { setStatus('Please paste a news story first.', true); return; }

  const active = getActiveLenses();
  if (!active.length) { setStatus('Select at least one lens.', true); return; }

  // Sync API URL
  window.ECONLENS_API = apiUrlInput.value.trim().replace(/\/$/, '') || 'http://localhost:8000';

  setLoading(true);

  try {
    const result = await analyseStory(story, active);
    setLoading(false);
    setStatus(`<span style="color:var(--teal)">✓ Analysis complete</span>`);
    renderFullAnalysis(result);
  } catch (err) {
    setLoading(false);
    setStatus(`Error: ${err.message}`, true);
  }
});

// ── Render full analysis (with verdict) ─────────────────────────
function renderFullAnalysis(result) {
  const lensHTML = (result.lenses || []).map(renderLensCard).join('');
  const geo = result.geo_umbrella || {};
  const verdict = result.verdict || result.headline || '';

  resultsEl.innerHTML = `
    <div class="analysis fade-up">
      <div class="analysis__headline">${result.headline || ''}</div>
      ${renderGeoUmbrella(geo)}
      <div class="analysis__lenses">${lensHTML}</div>
      <div class="verdict-block">
        <div>
          <div class="verdict-block__label">The Verdict</div>
          <div class="verdict-block__text" id="verdict-text">${verdict}</div>
        </div>
        <button class="verdict-copy" onclick="copyVerdict()">Copy</button>
      </div>
    </div>`;
}

function copyVerdict() {
  const text = document.getElementById('verdict-text')?.textContent || '';
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.verdict-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}

// ── Keyboard shortcut: Cmd/Ctrl + Enter ─────────────────────────
storyInput.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    analyseBtn.click();
  }
});
