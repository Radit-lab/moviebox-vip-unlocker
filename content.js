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
  function killPaywall() {    let killed = 0;

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

    // the new premium gate (v1.7.1): when the site decides a title is
    // premium-only it renders <section class="premium-content-gate"> inside
    // .player-container instead of the video player. kill the whole gate so
    // the player (or our own stream swap) can take the space.
    document.querySelectorAll('section.premium-content-gate, [class*=premium-content-gate]').forEach((g) => {
      // only remove if it sits inside the player area, never page-wide sections
      if (g.closest('.player-container') || /premium-content-gate/i.test(g.className || '')) {
        g.remove();
        killed++;
      }
    });
    // some variants render the gate as a modal-like overlay with text
    document.querySelectorAll('[aria-labelledby*=premium-content-gate]').forEach((g) => { g.remove(); killed++; });

    // premium badge icons. the site renders these as <img> tags with the
    // crown/lock badge baked into a base64 svg (alt="premium", fixed 20px
    // badge positioned at the top corner of premium thumbnails). once the
    // VIP restriction is removed there is nothing left for the badge to say,
    // so kill it and any sibling wrapper that exists only to hold it.
    document.querySelectorAll('img[alt="premium"], img[src*="FFDFB0"]').forEach((img) => {
      const src = img.getAttribute('src') || '';
      const looksLikeBadge = img.alt === 'premium' ||
        /width=["']?20["']?.*height=["']?20/.test(src) ||
        /fill=["']#FFDFB0["']/.test(src);
      if (!looksLikeBadge) return;
      const parent = img.parentElement;
      img.remove();
      killed++;
      // if the wrapper is now an empty positioned shell, remove it too
      if (parent && parent !== document.body && !parent.children.length && !parent.textContent.trim()) {
        parent.remove();
      }
    });

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

  // --- ad overlay cleanup (v1.5.0) ---
  // only verified ad containers get removed. currently this targets the
  // browser-notification ad stack (cdn.show-sb.com / cdn.redgarto.com) that
  // was observed live on themoviebox.xyz: a fake "(1) New Message!" toast
  // rendered as a fixed overlay with inline z-index 2147483646. nothing else
  // in the DOM gets touched, so player controls / subtitles / episode lists /
  // nav are never at risk.
  function killAdOverlays() {
    let killed = 0;
    document.querySelectorAll('[style*="z-index: 2147483646"], [style*="z-index:2147483646"]').forEach((el) => {
      // only remove the topmost element of each overlay subtree so we don't
      // leave orphaned fragments behind
      let p = el.parentElement;
      while (p) {
        if (/z-index\s*:\s*2147483646/i.test(p.getAttribute('style') || '')) return;
        p = p.parentElement;
      }
      el.remove();
      killed++;
    });
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

  // v1.7.1: when the site rendered the premium gate instead of the player,
  // killing the gate may leave no video element at all. if the gate was just
  // removed and the detail says streams should exist, ask the play API
  // ourselves and mount the stream directly into the player area.
  async function forcePlayerMount() {
    const v = document.querySelector('video');
    if (v) return; // site mounted its own player, upgradeTo1080 handles it
    const gateGone = document.querySelector('section.premium-content-gate, [class*=premium-content-gate]') === null;
    if (!gateGone) return;
    const t = currentTarget();
    if (!t) return;
    try {
      const dp = encodeURIComponent((location.pathname || '').replace(/^\//, ''));
      const url = API_BASE + '/subject/play?subjectId=' + t.subjectId + '&se=' + t.se + '&ep=' + t.ep + '&detailPath=' + dp + '&streamSignType=1';
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      const j = await r.json();
      const d = (j && j.data) || {};
      const streams = d.streams || [];
      const s1080 = streams.find((x) => String(x.resolutions) === '1080' && x.url) ||
                    streams.find((x) => x.url);
      if (!s1080) return; // still no streams (session-gated); nothing more we can do

      // find the player container and drop a real <video> into it
      const host = document.querySelector('.player-container') || document.querySelector('video, .video-wrap')?.parentElement;
      if (!host) return;
      const vid = document.createElement('video');
      vid.src = s1080.url;
      vid.controls = true;
      vid.autoplay = true;
      vid.style.cssText = 'width:100%;max-height:740px;background:#000;aspect-ratio:16/9';
      host.appendChild(vid);
      vid.play().catch(function () { });
    } catch (e) { /* next poll */ }
  }

  // --- toggle bridge ---
  // content script runs in the isolated world so it CAN use chrome.storage,
  // but inject.js runs in MAIN world and can't. so we mirror the state into
  // localStorage and inject.js just reads that instead
  const LS_KEY = 'mbBypassEnabled';

  function mirrorState(on) {
    try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch (e) { }
  }

  // inject.js runs in MAIN world and can't hear chrome.storage, so tell it
  // directly through a CustomEvent on the shared window. it uses this to
  // install/restore the window.open popup blocker.
  function broadcastState(on) {
    try {
      window.dispatchEvent(new CustomEvent('mbBypassState', { detail: { enabled: !!on } }));
    } catch (e) { }
  }

  // --- start / stop all activity ---
  function sweep() {
    killPaywall();
    killAdOverlays();
  }

  function start() {
    sweep();
    if (observer) observer.disconnect();
    observer = new MutationObserver(sweep);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    timers.push(setInterval(sweep, 800));
    timers.push(setInterval(tryUpgrade, 3000));
    timers.push(setInterval(forcePlayerMount, 5000));
    setTimeout(tryUpgrade, 2500);
    setTimeout(forcePlayerMount, 6000);
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
    broadcastState(enabled);
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
