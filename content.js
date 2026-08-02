// moviebox content script - the DOM side of things
// kills the modal, kills the trial bar, upgrades to 1080p.
// v1.4.0: toggle actually works now, before this "off" only stopped the
// modal killer while the header rewrite kept running lol
(function () {
  const API_BASE = '/wefeed-h5api-bff';
  const KEY = 'mbBypassEnabled';
  let enabled = true;
  let timers = [];
  let observer = null;
  let lastUpgradedKey = null;

  // --- paywall / trial bar watchdog ---
  function killPaywall() {
    let killed = 0;

    // modal first. the site changes class names from time to time so this
    // is a bit of a shotgun approach, whatever works
    document.querySelectorAll('.mp-modal').forEach((m) => {
      const close = m.querySelector('.mp-close, [aria-label="close"]');
      if (close) {
        close.click();
      } else {
        m.style.display = 'none';
      }
      killed++;
    });

    document.querySelectorAll('.trial-countdown-bar, [class*=trial-countdown], [class*=trial-layer]').forEach((b) => {
      b.remove();
      killed++;
    });

    document.querySelectorAll('[data-vip-locked]').forEach((el) => el.removeAttribute('data-vip-locked'));
    document.querySelectorAll('.is-vip-locked').forEach((el) => el.classList.remove('is-vip-locked'));

    // the trial handler pauses the video around the 5 min mark, nudge it
    // back so it keeps playing. the -2s rewind is ugly but it works
    if (killed > 0) {
      const v = document.querySelector('video');
      if (v && v.paused && v.duration > 400 && v.currentTime > 280) {
        try { v.currentTime = Math.max(0, v.currentTime - 2); } catch (e) { }
        v.play().catch(function () { });
      }
    }
    return killed;
  }

  // --- figure out what we're watching ---
  // try playHistory first (normal flow), fall back to the __NUXT__
  // payload for fresh visits where history is still empty
  function targetFromHistory() {
    try {
      const hist = JSON.parse(localStorage.getItem('playHistory') || '[]');
      const last = Array.isArray(hist) && hist.length ? hist[0] : null;
      if (last && last.subjectId) {
        return { subjectId: last.subjectId, se: last.curSe || 1, ep: last.curEp || 1 };
      }
    } catch (e) { }
    return null;
  }

  function targetFromNuxt() {
    try {
      const d = window.__NUXT__ && window.__NUXT__.data;
      if (!d) return null;
      // look for subjectId somewhere in the payload, the detail response
      // lives under data. depth limit so we don't loop forever
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
    } catch (e) { }
    return null;
  }

  function currentTarget() {
    return targetFromHistory() || targetFromNuxt();
  }

  // --- auto 1080p upgrade ---
  // re-arms itself when you switch episodes (lastUpgradedKey changes)
  async function upgradeTo1080() {
    const v = document.querySelector('video');
    if (!v) return;
    const t = currentTarget();
    if (!t) return;
    const key = t.subjectId + '_' + t.se + '_' + t.ep;
    // already on 1080 for this target? done
    if (v.videoWidth >= 1920 && v.videoHeight >= 1080 && lastUpgradedKey === key) return;

    try {
      const dp = encodeURIComponent((location.pathname || '').replace(/^\//, ''));
      const url = API_BASE + '/subject/play?subjectId=' + t.subjectId + '&se=' + t.se + '&ep=' + t.ep + '&detailPath=' + dp + '&streamSignType=1';
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      const j = await r.json();
      const streams = (j.data && j.data.streams) || [];
      const s1080 = streams.find((x) => String(x.resolutions) === '1080' && x.url);
      if (!s1080) return; // no 1080 for this one, leave it alone

      // only swap if the player is still below 1080
      if (v.videoWidth >= 1920 && v.videoHeight >= 1080) {
        lastUpgradedKey = key;
        return;
      }
      lastUpgradedKey = key;
      v.pause();
      try { v.srcObject = null; } catch (e) { }
      v.removeAttribute('src');
      v.load();
      v.src = s1080.url;
      v.play().catch(function () { });
    } catch (e) {
      // meh, it'll retry on the next poll
    }
  }

  function tryUpgrade() {
    if (!enabled) return;
    const v = document.querySelector('video');
    if (v && v.readyState >= 1) upgradeTo1080();
  }

  // --- toggle bridge ---
  // content script runs in the isolated world so it CAN use chrome.storage,
  // but inject.js runs in MAIN world and can't. so we mirror the state into
  // localStorage and inject.js just reads that instead
  const LS_KEY = 'mbBypassEnabled';

  function mirrorState(on) {
    try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch (e) { }
  }

  // --- start / stop all activity ---
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
    } catch (e) { }
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

  // read the master toggle, default ON
  try {
    chrome.storage.local.get(KEY, function (data) {
      enabled = data[KEY] !== false;
      applyState();
    });
  } catch (e) {
    applyState();
  }

  // react if the toggle changes while a page is open
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local' && changes[KEY]) {
        enabled = changes[KEY].newValue !== false;
        applyState();
      }
    });
  } catch (e) { }
})();
