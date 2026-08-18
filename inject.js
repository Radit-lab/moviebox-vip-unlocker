// inject.js - runs in MAIN world before the site's own scripts
// this is the one that actually kills the 5 minute trial lock. the site
// reads accessStrategy.previewSeconds from the /detail response and clamps
// playback there, so we just rewrite the response to 0 before the app sees it.
//
// main world cant use chrome.storage, thats why the toggle comes through
// localStorage (content.js writes it from chrome.storage)
(() => {
  if (window.__mbInjected) return; // dont double-install
  window.__mbInjected = true;

  const LS_KEY = 'mbBypassEnabled';

  function isActive() {
    try {
      return localStorage.getItem(LS_KEY) !== '0';
    } catch (e) {
      return true;
    }
  }

  // --- popup / popunder blocker (v1.5.0 / v1.6.0) ---
  // only verified ad/popunder domains from captured network evidence. the
  // block only happens for window.open() targets on these domains while the
  // master toggle is ON. when OFF the original window.open is restored.
  // matches the declarative net request blocklist in adblock.json, and now
  // covers the show-sb / redgarto toast cdns + subdomains instead of only the
  // one hardcoded cloudfront bucket
  const AD_DOMAINS = [
    'pufted.com', 'tesorf.com', 'surlyplants.com', 'allowtohimselfew.org',
    'droomhesaidsoftly.org', 'zoologyfibre.com', 'workdeadlinededicate.com',
    'thedirecthor.com', 'fizzyacerbitymellow.com', 'portalfluently.com',
    'ukankingwithea.com', 'spendsdetachment.com',
    'show-sb.com', 'redgarto.com', 'cloudfront.net'
  ];

  function isAdUrl(u) {
    try {
      const h = new URL(u, location.href).hostname.toLowerCase();
      return AD_DOMAINS.some((d) => h === d || h.endsWith('.' + d));
    } catch (e) {
      return false;
    }
  }

  let origOpen = null;
  let popupPatched = false;

  function installPopupBlocker() {
    if (popupPatched || !window.open) return;
    popupPatched = true;
    origOpen = window.open.bind(window);
    window.open = function (url, name, features) {
      if (isActive() && isAdUrl(url || '')) return null; // popunder killed
      return origOpen(url, name, features);
    };
  }

  function restorePopupBlocker() {
    if (popupPatched && origOpen) {
      window.open = origOpen;
      popupPatched = false;
      origOpen = null;
    }
  }

  function setActive(on) {
    if (on) installPopupBlocker();
    else restorePopupBlocker();
  }

  function rewriteDetail(json) {
    try {
      const j = JSON.parse(json);
      const s = j && j.data && j.data.accessStrategy;
      if (s && typeof s === 'object') {
        // only rewrite once per response; if already unlocked, pass through
        if (s.previewSeconds === 0 && s.ruleType === 0) return json;
        if (typeof s.previewSeconds === 'number' && s.previewSeconds > 0) {
          s.previewSeconds = 0; // 5 min clamp -> gone
        }
        s.freeEpisodeCount = 99999;
        s.ruleType = 0;
      }
      return JSON.stringify(j);
    } catch (e) {
      return json; // not valid json or already broken, just pass it through
    }
  }

  function isDetail(url) {
    return String(url).indexOf('/wefeed-h5api-bff/detail') !== -1;
  }

  function install() {
    // patch fetch first
    const origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const p = origFetch.apply(this, arguments);
        if (!isActive() || !isDetail(url)) return p;
        return p.then(function (res) {
          try {
            return res.clone().text().then(function (text) {
              const headers = new Headers(res.headers);
              headers.set('content-type', 'application/json');
              return new Response(rewriteDetail(text), {
                status: res.status,
                statusText: res.statusText,
                headers: headers
              });
            });
          } catch (e) {
            return res;
          }
        });
      };
    }

    // and XHR too. the site seems to use both so we cant skip this one
    const xhrProto = XMLHttpRequest.prototype;
    const origOpen = xhrProto.open;
    const origSend = xhrProto.send;
    xhrProto.open = function (method, url) {
      this.__mbUrl = String(url);
      return origOpen.apply(this, arguments);
    };
    xhrProto.send = function () {
      const self = this;
      if (this.__mbUrl && isDetail(this.__mbUrl)) {
        try {
          const desc = Object.getOwnPropertyDescriptor(xhrProto, 'responseText');
          if (desc && desc.get) {
            Object.defineProperty(self, 'responseText', {
              get: function () {
                const t = desc.get.call(self);
                return isActive() ? rewriteDetail(t) : t;
              }
            });
          }
        } catch (e) { }
      }
      return origSend.apply(this, arguments);
    };
  }

  install();

  // single permanent bridge listener from content.js (MAIN world can't hear
  // chrome.storage, so content.js dispatches a CustomEvent). it installs the
  // popup blocker when ON and restores the real window.open when OFF.
  window.addEventListener('mbBypassState', function (e) {
    setActive(!!(e && e.detail && e.detail.enabled));
  });
  setActive(isActive());
})();
