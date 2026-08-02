// Popup logic — reads/writes the master toggle in chrome.storage
const KEY = 'mbBypassEnabled';
const toggle = document.getElementById('masterToggle');
const statusText = document.getElementById('statusText');

function setStatus(on) {
  statusText.textContent = on ? 'Active on MovieBox domains' : 'Paused — bypass off';
}

function refreshDots() {
  // Dots are informational only; reflect stored state
  const on = toggle.checked;
  const dots = ['sStream', 'sTrial', 's1080'];
  dots.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) { el.className = on ? 'dot-ok' : 'dot-off'; }
  });
}

// Load current state
chrome.storage.local.get(KEY, function (data) {
  const on = data[KEY] !== false; // default ON
  toggle.checked = on;
  setStatus(on);
  refreshDots();
});

// Save on change
toggle.addEventListener('change', function () {
  const on = toggle.checked;
  chrome.storage.local.set({ [KEY]: on }, function () {
    setStatus(on);
    refreshDots();
  });
});
