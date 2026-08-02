// background service worker
// enables/disables the DNR ruleset so the toggle actually kills the
// header rewrite at the network level, not just the DOM stuff.
// without this "off" was a lie in earlier versions lol
const KEY = 'mbBypassEnabled';
const RULESET = 'ruleset_1';

function applyState(enabled) {
  try {
    return chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled ? [RULESET] : [],
      disableRulesetIds: enabled ? [] : [RULESET]
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
