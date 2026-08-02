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

  function rewriteDetail(json) {
    try {
      const j = JSON.parse(json);
      if (j && j.data && j.data.accessStrategy) {
        const s = j.data.accessStrategy;
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
})();
