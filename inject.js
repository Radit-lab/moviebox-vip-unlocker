// MOVIE BOX BYPASS BY RADIT — inject.js (MAIN world, document_start)
// Runs before the site's own code. Intercepts fetch/XHR responses and zeros
// out accessStrategy.previewSeconds so the 5-minute trial lock never starts.
// MAIN-world scripts cannot use chrome.storage, so the master toggle is
// bridged via localStorage (written by content.js from chrome.storage).
(() => {
  if (window.__mbInjected) return;
  window.__mbInjected = true;

  const LS_KEY = 'mbBypassEnabled';

  // Toggle check. localStorage is synchronous and shared with the isolated
  // world, so this reflects the popup switch (default ON when unset).
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
          s.previewSeconds = 0;          // kill the 5-min trial clamp
        }
        s.freeEpisodeCount = 99999;      // never run out of "free" episodes
        s.ruleType = 0;                  // disable lock rules entirely
      }
      return JSON.stringify(j);
    } catch (e) {
      return json;
    }
  }

  function isDetail(url) {
    return String(url).indexOf('/wefeed-h5api-bff/detail') !== -1;
  }

  function install() {
    // ---- Patch fetch ----
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

    // ---- Patch XMLHttpRequest ----
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
        } catch (e) {}
      }
      return origSend.apply(this, arguments);
    };
  }

  install();
})();
