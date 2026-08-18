// popup stuff - just reads/writes the master toggle
const KEY = 'mbBypassEnabled';
const toggle = document.getElementById('masterToggle');
const statusText = document.getElementById('statusText');

// pull the version from the manifest instead of hardcoding it
try {
  const v = document.getElementById('versionText');
  if (v && chrome.runtime && chrome.runtime.getManifest) {
    v.textContent = 'v' + chrome.runtime.getManifest().version;
  }
} catch (e) { }

function setStatusText(t) {
  statusText.textContent = t;
}

function setStatus(on) {
  setStatusText(on ? 'Active on MovieBox domains' : 'Paused - bypass off');
}

function refreshDots() {
  // dots are basically decoration, just mirror the stored state
  const on = toggle.checked;
  const dots = ['sStream', 'sTrial', 's1080', 'sAds'];
  dots.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) { el.className = on ? 'dot-ok' : 'dot-off'; }
  });
}

// load saved state (default ON)
chrome.storage.local.get([KEY, 'mbUpdateNote'], function (data) {
  const on = data[KEY] !== false;
  toggle.checked = on;
  setStatus(on);
  refreshDots();
  // show the updater's state if it left a note
  const note = data.mbUpdateNote;
  if (note === 'updating') setStatusText('Applying update… restart browser after');
  else if (note === 'ready') setStatusText('Update downloaded to Downloads folder');
});

// react to updater notes appearing while the popup is open
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes.mbUpdateNote) {
    const note = changes.mbUpdateNote.newValue;
    if (note === 'updating') setStatusText('Applying update… restart browser after');
    else if (note === 'ready') setStatusText('Update downloaded to Downloads folder');
  }
});

// save when the user flips it
toggle.addEventListener('change', function () {
  const on = toggle.checked;
  chrome.storage.local.set({ [KEY]: on }, function () {
    setStatus(on);
    refreshDots();
  });
});
