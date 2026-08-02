// popup stuff - just reads/writes the master toggle
const KEY = 'mbBypassEnabled';
const toggle = document.getElementById('masterToggle');
const statusText = document.getElementById('statusText');

function setStatus(on) {
  statusText.textContent = on ? 'Active on MovieBox domains' : 'Paused - bypass off';
}

function refreshDots() {
  // dots are basically decoration, just mirror the stored state
  const on = toggle.checked;
  const dots = ['sStream', 'sTrial', 's1080'];
  dots.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) { el.className = on ? 'dot-ok' : 'dot-off'; }
  });
}

// load saved state (default ON)
chrome.storage.local.get(KEY, function (data) {
  const on = data[KEY] !== false;
  toggle.checked = on;
  setStatus(on);
  refreshDots();
});

// save when the user flips it
toggle.addEventListener('change', function () {
  const on = toggle.checked;
  chrome.storage.local.set({ [KEY]: on }, function () {
    setStatus(on);
    refreshDots();
  });
});
