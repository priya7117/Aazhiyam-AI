// main.js — Member 1
// Owns: screen routing, auth gating, nav state, toasts, flip cards,
// and wiring the app's existing modules (Classifier, Scene3D, Chat,
// Report) together. Does NOT modify classifier.js or scene3d.js.

window.AppState = window.AppState || {
  classification: null,
  lastCopilotReply: null,
  sceneReady: false
};

/* ------------------------------------------------------------------ */
/* Toast */
/* ------------------------------------------------------------------ */
const Toast = (function () {
  function show(message, type, duration) {
    type = type || 'info';
    duration = duration || 3500;
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✓', error: '✕', info: 'i' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="ticon">${icons[type] || 'i'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 220);
    }, duration);
  }
  return { show };
})();
window.Toast = Toast;

/* ------------------------------------------------------------------ */
/* AuthGate */
/* ------------------------------------------------------------------ */
const AuthGate = (function () {
  let authed = false;
  let pendingDestination = null;

  async function mockLogin(email, password) {
    // TODO (Member 4): replace with a real call to a secure backend endpoint.
    await new Promise((r) => setTimeout(r, 500));
    if (!email || !password) throw new Error('Enter both email and password to continue.');
    return { email };
  }

  function isAuthed() { return authed; }
  function setPendingDestination(dest) { pendingDestination = dest; }
  function consumePendingDestination() {
    const d = pendingDestination;
    pendingDestination = null;
    return d;
  }

  async function login(email, password) {
    await mockLogin(email, password);
    authed = true;
  }

  function logout() {
    authed = false;
    Toast.show('Signed out.', 'info');
    Router.go('landing');
    updateAuthUI();
  }

  function updateAuthUI() {
    const chip = document.getElementById('authStatus');
    const actionBtn = document.getElementById('authActionBtn');
    const navPublic = document.getElementById('navPublic');
    const navProtected = document.getElementById('navProtected');

    if (authed) {
      chip.className = 'status-chip on';
      chip.innerHTML = '<span class="dot"></span>Signed in';
      actionBtn.textContent = 'Logout';
      actionBtn.className = 'btn btn-signed';
      navPublic.hidden = true;
      navProtected.hidden = false;
    } else {
      chip.className = 'status-chip';
      chip.innerHTML = '<span class="dot"></span>Public access';
      actionBtn.textContent = 'Authorized Access';
      actionBtn.className = 'btn btn-primary';
      navPublic.hidden = false;
      navProtected.hidden = true;
    }
  }

  return { isAuthed, login, logout, updateAuthUI, setPendingDestination, consumePendingDestination };
})();

/* ------------------------------------------------------------------ */
/* Router */
/* ------------------------------------------------------------------ */
const Router = (function () {
  const screens = {};
  let current = 'landing';

  function registerScreens() {
    document.querySelectorAll('.screen').forEach((el) => { screens[el.dataset.screen] = el; });
  }

  function highlightNav(name) {
    document.querySelectorAll('.navlink').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.goto === name);
    });
  }

  function go(name) {
    const target = screens[name];
    if (!target) return;

    if (target.dataset.protected === 'true' && !AuthGate.isAuthed()) {
      AuthGate.setPendingDestination(name);
      openLoginModal();
      return;
    }

    Object.values(screens).forEach((s) => s.classList.remove('active'));
    target.classList.add('active');
    current = name;
    highlightNav(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (name === 'twin') {
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      refreshVesselList();
    }
    if (name === 'dashboard') refreshDashboard();
    if (name === 'reports') refreshReportSummary();
    if (name === 'copilot') refreshCopilotContext();
  }

  function getCurrent() { return current; }

  return { registerScreens, go, getCurrent };
})();

/* ------------------------------------------------------------------ */
/* Login modal */
/* ------------------------------------------------------------------ */
function openLoginModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('email').focus();
}
function closeLoginModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('loginError').textContent = '';
}

function wireLoginModal() {
  const overlay = document.getElementById('modalOverlay');
  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('loginSubmit');
  const errorEl = document.getElementById('loginError');

  document.getElementById('modalClose').addEventListener('click', closeLoginModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLoginModal(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>Signing in…';
    errorEl.textContent = '';

    try {
      await AuthGate.login(email, password);
      Toast.show('Signed in successfully.', 'success');
      closeLoginModal();
      AuthGate.updateAuthUI();
      const dest = AuthGate.consumePendingDestination() || 'dashboard';
      Router.go(dest);
    } catch (err) {
      errorEl.textContent = err.message || 'Sign in failed. Please try again.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
}

/* ------------------------------------------------------------------ */
/* Navigation wiring */
/* ------------------------------------------------------------------ */
function wireNavigation() {
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => Router.go(btn.dataset.goto));
  });
  document.querySelectorAll('[data-action="request-access"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (AuthGate.isAuthed()) { Router.go('dashboard'); return; }
      AuthGate.setPendingDestination('dashboard');
      openLoginModal();
    });
  });
  document.getElementById('authActionBtn').addEventListener('click', () => {
    if (AuthGate.isAuthed()) AuthGate.logout();
    else openLoginModal();
  });
}

/* ------------------------------------------------------------------ */
/* Flip cards */
/* ------------------------------------------------------------------ */
function wireFlipCards() {
  document.querySelectorAll('.cards .card').forEach((card) => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('flipped');
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Dashboard / Reports / Digital Twin dynamic content */
/* ------------------------------------------------------------------ */
function refreshDashboard() {
  const c = window.AppState.classification;
  document.getElementById('dashMonitoringStatus').textContent = c ? 'Analysis available' : 'Standing by';
  document.getElementById('dashScenario').textContent = c ? c.sourceLabel : 'No scenario loaded';
  document.getElementById('dashClassification').textContent = c ? `${c.status} — ${c.frequency} Hz` : 'No analysis yet';

  const vessels = (window.Scene3D && typeof window.Scene3D.getSceneSummary === 'function')
    ? window.Scene3D.getSceneSummary() : null;
  document.getElementById('dashVesselCount').textContent = vessels ? vessels.length : '—';

  const recentText = document.getElementById('dashRecentText');
  recentText.textContent = c
    ? `${c.sourceLabel}: ${c.status} at ${c.frequency} Hz (${c.vesselType}), recorded ${new Date(c.timestamp).toLocaleTimeString()}.`
    : 'No analysis has been run this session.';
}

function refreshVesselList() {
  const body = document.getElementById('vesselListBody');
  const fallback = document.getElementById('sceneUnavailable');

  if (!window.Scene3D || typeof window.Scene3D.getSceneSummary !== 'function') {
    fallback.hidden = false;
    body.textContent = 'No scene data — Digital Twin module unavailable.';
    return;
  }
  fallback.hidden = true;

  const vessels = window.Scene3D.getSceneSummary();
  if (!vessels || vessels.length === 0) {
    body.textContent = 'No vessels currently in scene.';
    return;
  }

  body.innerHTML = vessels.map((v) => `
    <div class="vessel-item">
      <div class="vname"><span>${escapeHtml(v.vesselType)}${v.monitored ? ' (analyzed)' : ''}</span>
        <span class="noise-${escapeHtml(v.noiseClass)}">${escapeHtml(v.status)}</span></div>
      <div class="vmeta">${v.frequency != null ? escapeHtml(v.frequency) + ' Hz' : 'Awaiting reading'}</div>
    </div>
  `).join('');
}

function refreshReportSummary() {
  const el = document.getElementById('reportSummaryText');
  const c = window.AppState.classification;
  if (!c) {
    el.textContent = 'Run an analysis to enable report generation.';
    return;
  }
  const vessels = (window.Scene3D && typeof window.Scene3D.getSceneSummary === 'function')
    ? window.Scene3D.getSceneSummary() : [];
  el.innerHTML = `Latest analysis: <b>${escapeHtml(c.sourceLabel)}</b> — ${escapeHtml(c.status)} at ${escapeHtml(c.frequency)} Hz.
    ${vessels.length} vessel(s) currently in scene. Ready to compile into a report.`;
}

function refreshCopilotContext() {
  const el = document.getElementById('copilotContext');
  const c = window.AppState.classification;
  el.textContent = c
    ? `Context: ${c.sourceLabel} — ${c.status} at ${c.frequency} Hz`
    : 'No analysis loaded — answers will be general.';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/* Module readiness check */
/* ------------------------------------------------------------------ */
function checkModule(name, obj, methods) {
  if (!obj) { console.warn(`[Aazhiyam AI] Module missing: ${name}`); return false; }
  const missing = (methods || []).filter((m) => typeof obj[m] !== 'function');
  if (missing.length) { console.warn(`[Aazhiyam AI] ${name} missing: ${missing.join(', ')}`); return false; }
  return true;
}

function runReadinessCheck() {
  const results = {
    classifier: checkModule('Classifier', window.Classifier, ['classify']),
    scene3d: checkModule('Scene3D', window.Scene3D, ['captureSnapshot', 'getSceneSummary', 'updateMonitoredVessel']),
    chat: checkModule('Chat', window.Chat, ['sendMessage']),
    report: checkModule('Report', window.Report, ['generateReport'])
  };
  if (!results.scene3d) document.getElementById('sceneUnavailable').hidden = false;
  const allReady = Object.values(results).every(Boolean);
  console.log(allReady
    ? '%c[Aazhiyam AI] All modules loaded — app ready.' : '%c[Aazhiyam AI] Some modules missing — see warnings above.',
    `color:${allReady ? '#1fbf9e' : '#f2a53c'};font-weight:bold;`);
}

/* ------------------------------------------------------------------ */
/* Init */
/* ------------------------------------------------------------------ */
function init() {
  Router.registerScreens();
  wireNavigation();
  wireLoginModal();
  wireFlipCards();
  AuthGate.updateAuthUI();
  Router.go('landing');
  runReadinessCheck();

  document.addEventListener('azhiyam:classificationResult', () => {
    if (Router.getCurrent() === 'dashboard') refreshDashboard();
    if (Router.getCurrent() === 'reports') refreshReportSummary();
    if (Router.getCurrent() === 'copilot') refreshCopilotContext();
  });

  window.addEventListener('error', (e) => {
    console.error('[Aazhiyam AI] Uncaught error:', e.error || e.message);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}