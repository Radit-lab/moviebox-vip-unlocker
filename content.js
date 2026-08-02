// MOVIE BOX BYPASS BY RADIT — content script (v1.4.0)
// 1. Kills the paywall modal + trial countdown bar whenever they appear
// 2. Resumes playback if the trial handler paused the video
// 3. Auto-upgrades the video element to the 1080p stream — works on fresh
//    visits (no playHistory) and re-arms whenever the episode changes
// Honors the master toggle from chrome.storage (OFF = stand down entirely).
(function () {
  const API_BASE = '/wefeed-h5api-bff';
  const KEY = 'mbBypassEnabled';
  let enabled = true;
  let timers = [];
  let observer = null;

  // ---- Paywall / trial bar watchdog ----
  function killPaywall() {
    let killed = 0;
    document.querySelectorAll('.mp-modal').forEach(function (m) {
      const close = m.querySelector('.mp-close, [aria-label="close"]');
      if (close) { close.click(); } else { m.style.display = 'none'; }
      killed++;
    });
    document.querySelectorAll('.trial-countdown-bar, [class*=trial-countdown], [class*=trial-layer]').forEach(function (b) {
      b.remove();
      killed++;
    });
    document.querySelectorAll('[data-vip-locked]').forEach(function (el) {
      el.removeAttribute('data-vip-locked');
    });
    document.querySelectorAll('.is-vip-locked').forEach(function (el) {
      el.classList.remove('is-vip-locked');
    });
    if (killed > 0) {
      const v = document.querySelector('video');
      if (v && v.paused && v.duration > 400 && v.currentTime > 280) {
        try { v.currentTime = Math.max(0, v.currentTime - 2); } catch (e) {}
        v.play().catch(function () {});
      }
    }
    return killed;
  }

  // ---- Resolve the current playback target (subjectId, se, ep) ----
  // Source 1: playHistory (normal flow). Source 2: __NUXT__ page payload.
  function targetFromHistory() {
    try {
      const hist = JSON.parse(localStorage.getItem('playHistory') || '[]');
      const last = Array.isArray(hist) && hist.length ? hist[0] : null;
      if (last && last.subjectId) {
        return { subjectId: last.subjectId, se: last.curSe || 1, ep: last.curEp || 1 };
      }
    } catch (e) {}
    return null;
  }

  function targetFromNuxt() {
    try {
      const d = window.__NUXT__ && window.__NUXT__.data;
      if (!d) return null;
      // find subjectId in the payload (detail response is under data)
      const findSubject = function (obj, depth) {
        if (!obj || depth > 4) return null;
        if (typeof obj === 'object') {
          if (typeof obj.subjectId === 'string' && obj.hasResource !== undefined) {
            return { subjectId: obj.subjectId, se: 1, ep: 1 };
          }
          for (const k of Object.keys(obj)) {
            const r = findSubject(obj[k], depth + 1);
            if (r) return r;
          }
        }
        return null;
      };
      return findSubject(d, 0);
    } catch (e) {}
    return null;
  }

  function currentTarget() {
    return targetFromHistory() || targetFromNuxt();
  }

  // ---- Auto 1080p upgrade (re-arms on episode change) ----
  let lastUpgradedKey = null;

  async function upgradeTo1080() {
    const v = document.querySelector('video');
    if (!v) return;
    const t = currentTarget();
    if (!t) return;
    const key = t.subjectId + '_' + t.se + '_' + t.ep;
    // already 1080 for this target? done.
    if (v.videoWidth >= 1920 && v.videoHeight >= 1080 && lastUpgradedKey === key) return;
    try {
      const dp = encodeURIComponent((location.pathname || '').replace(/^\//, ''));
      const url = API_BASE + '/subject/play?subjectId=' + t.subjectId + '&se=' + t.se + '&ep=' + t.ep + '&detailPath=' + dp + '&streamSignType=1';
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      const j = await r.json();
      const streams = (j.data && j.data.streams) || [];
      const s1080 = streams.find(function (x) { return String(x.resolutions) === '1080' && x.url; });
      if (!s1080) return;
      // Only swap if the player is below 1080p for this target
      if (v.videoWidth >= 1920 && v.videoHeight >= 1080) { lastUpgradedKey = key; return; }
      lastUpgradedKey = key;
      v.pause();
      try { v.srcObject = null; } catch (e) {}
      v.removeAttribute('src');
      v.load();
      v.src = s1080.url;
      v.play().catch(function () {});
    } catch (e) {}
  }

  function tryUpgrade() {
    if (!enabled) return;
    const v = document.querySelector('video');
    if (v && v.readyState >= 1) upgradeTo1080();
  }

  // ---- Master toggle bridge ----
  // content.js (isolated world) can use chrome.storage; inject.js (MAIN world)
  // cannot. Mirror the toggle into localStorage so inject.js can read it.
  const LS_KEY = 'mbBypassEnabled';

  function mirrorState(on) {
    try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch (e) {}
  }

  // ---- Start / stop all activity ----
  function start() {
    killPaywall();
    if (observer) observer.disconnect();
    observer = new MutationObserver(killPaywall);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    timers.push(setInterval(killPaywall, 800));
    timers.push(setInterval(tryUpgrade, 3000));
    setTimeout(tryUpgrade, 2500);
    try {
      window.addEventListener('storage', function (e) {
        if (e.key === 'playHistory') lastUpgradedKey = null;
      });
    } catch (e) {}
  }

  function stop() {
    if (observer) observer.disconnect();
    observer = null;
    timers.forEach(clearInterval);
    timers = [];
  }

  function applyState() {
    mirrorState(enabled);
    if (enabled) start();
    else stop();
  }

  // Load master toggle; default ON
  try {
    chrome.storage.local.get(KEY, function (data) {
      enabled = data[KEY] !== false;
      applyState();
    });
  } catch (e) {
    applyState();
  }

  // React to toggle changes while the page is open
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local' && changes[KEY]) {
        enabled = changes[KEY].newValue !== false;
        applyState();
      }
    });
  } catch (e) {}
})();
