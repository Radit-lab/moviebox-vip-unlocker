// MOVIE BOX BYPASS BY RADIT — background service worker
// Enables/disables the DNR ruleset so the master toggle really turns the
// header rewrite off at the network layer, not just the content script.
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

// Default ON on install/startup
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(KEY, function (data) {
    applyState(data[KEY] !== false);
  });
});

chrome.runtime.onStartup.addListener(function () {
  chrome.storage.local.get(KEY, function (data) {
    applyState(data[KEY] !== false);
  });
});

// React to popup toggle changes
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes[KEY]) {
    applyState(changes[KEY].newValue !== false);
  }
});
