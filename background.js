// background service worker
// enables/disables the DNR rulesets so the toggle actually kills the
// header rewrite + ad blocking at the network level, not just the DOM stuff.
// without this "off" was a lie in earlier versions lol
const KEY = 'mbBypassEnabled';
// ruleset_1 = vip header rewrite, adblock = verified ad/popunder/tracker block rules
const RULESETS = ['ruleset_1', 'adblock'];

function applyState(enabled) {
  try {
    return chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled ? RULESETS : [],
      disableRulesetIds: enabled ? [] : RULESETS
    });
  } catch (e) {
    return Promise.resolve();
  }
}

// default ON on install
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(KEY, function (data) {
    applyState(data[KEY] !== false);
  });
});

// and on browser startup (service workers get killed by chrome)
chrome.runtime.onStartup.addListener(function () {
  chrome.storage.local.get(KEY, function (data) {
    applyState(data[KEY] !== false);
  });
});

// popup toggled -> apply immediately
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes[KEY]) {
    applyState(changes[KEY].newValue !== false);
  }
});
