// background service worker
// enables/disables the DNR rulesets so the toggle actually kills the
// header rewrite + ad blocking at the network level, not just the DOM stuff.
// without this "off" was a lie in earlier versions lol
// also runs the self-updater: unpacked extensions dont get Chrome's
// auto-update, so we check the latest GitHub release ourselves every 4h
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

// ============================================================
// self-updater - unpacked extensions never update themselves,
// so this pulls the latest release zip from GitHub and swaps
// the extension files in place when a newer version ships.
// user preferences live in chrome.storage and survive a swap.
// ============================================================
const REPO = 'Radit-lab/moviebox-vip-unlocker';
const RELEASE_ZIP = 'moviebox-vip-unlocker.zip';
const U_KEY_LAST = 'mbUpdaterLastCheck';
const U_KEY_NOTE = 'mbUpdateNote';

function parseVer(v) {
  return String(v || '').replace(/^v/, '').split('.').map(function (n) {
    return parseInt(n, 10) || 0;
  });
}
function isUpdate(current, candidate) {
  var a = parseVer(current), b = parseVer(candidate);
  for (var i = 0; i < 3; i++) {
    if ((b[i] || 0) > (a[i] || 0)) return true;
    if ((b[i] || 0) < (a[i] || 0)) return false;
  }
  return false;
}

// write the extension files back into the install folder on disk.
// the service worker cant write files directly, so the heavy lifting is
// done by the native messaging host (see scripts/install-windows.ps1 etc.)
// or by the downloads fallback below.
function applyUpdateFiles(zipBytes) {
  return new Promise(function (resolve) {
    try {
      chrome.runtime.sendNativeMessage('moviebox.updater', {
        action: 'apply',
        zip: Array.from(new Uint8Array(zipBytes))
      }, function (resp) {
        resolve((resp && resp.status) || 'ok');
      });
    } catch (e) {
      resolve('no-native');
    }
  });
}

function fallbackUpdate(zipUrl) {
  // no native host: drop the zip in Downloads and leave a note for the user
  try {
    chrome.downloads.download({ url: zipUrl, filename: 'moviebox-vip-unlocker.zip', saveAs: false });
    chrome.storage.local.set({ [U_KEY_NOTE]: 'ready' });
  } catch (e) { }
}

function checkForUpdate() {
  if (!chrome.storage || !chrome.storage.local) return;
  chrome.storage.local.get([U_KEY_LAST], function (data) {
    if (data[U_KEY_LAST] && Date.now() - data[U_KEY_LAST] < 3.5 * 3600 * 1000) return;
    fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
      headers: { accept: 'application/vnd.github+json' }
    })
      .then(function (r) {
        if (!r.ok) throw new Error('api ' + r.status);
        return r.json();
      })
      .then(function (rel) {
        if (!rel) return;
        chrome.storage.local.set({ [U_KEY_LAST]: Date.now() });
        var tag = rel.tag_name || '';
        var asset = (rel.assets || []).find(function (a) {
          return a.name === RELEASE_ZIP || /moviebox.*\.zip$/i.test(a.name);
        });
        if (!asset || !isUpdate(chrome.runtime.getManifest().version, tag)) return;

        chrome.storage.local.set({ [U_KEY_NOTE]: 'updating' });
        fetch(asset.browser_download_url)
          .then(function (r) {
            if (!r.ok) throw new Error('zip ' + r.status);
            return r.arrayBuffer();
          })
          .then(function (buf) {
            return applyUpdateFiles(buf);
          })
          .then(function (res) {
            if (res === 'ok') {
              try { chrome.runtime.reload(); } catch (e) { }
            } else {
              fallbackUpdate(asset.browser_download_url);
            }
          })
          .catch(function () {
            fallbackUpdate(asset.browser_download_url);
          });
      })
      .catch(function () { /* network hiccup, next check will retry */ });
  });
}

// run a check whenever the worker wakes (install, startup, or alarm)
try {
  chrome.alarms.create('mbUpdateCheck', { periodInMinutes: 240 }); // 4h
  chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === 'mbUpdateCheck') checkForUpdate();
  });
} catch (e) { }
checkForUpdate();
