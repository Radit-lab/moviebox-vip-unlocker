# 🎬 MovieBox VIP Unlocker

> Watch MovieBox in 1080p. No paywall. No trial lock. No ads. No DevTools.

A tiny Chrome extension that handles the premium unlock automatically so you can just hit play.

## ✨ Features

- **🚀 Stream unlock** — play requests get the VIP restriction removed at the network level
- **🔓 Paywall kill** — premium modal and 5-minute trial bar removed instantly
- **📺 1080p upgrade** — every stream auto-switches to the best available quality
- **🚫 Ad blocking** — verified ad networks, popunders, and trackers blocked at the network level; fake notification overlays removed from the DOM. Scoped to MovieBox mirrors only.

## 🌐 Works On

All MovieBox mirrors in one install:

`themoviebox.xyz` · `netfilm.world` · `123movienow.cc` · `themoviebox.app` · `movieboxonline.net` · `moviebox.co` · `downloadmoviebox.com`

## 📥 Install (2 minutes, one command)

Pick your OS, run ONE line, then load the extension once. That's it.

### 🪟 Windows

Open **PowerShell**, paste this, hit Enter — it downloads everything and opens the extensions page:

```powershell
Invoke-Expression (Invoke-RestMethod 'https://raw.githubusercontent.com/Radit-lab/moviebox-vip-unlocker/main/scripts/install-windows.ps1')
```

### 🍎 macOS

Open **Terminal**, paste this, hit Enter — same deal:

```bash
curl -fsSL https://raw.githubusercontent.com/Radit-lab/moviebox-vip-unlocker/main/scripts/install-macos.sh | bash
```

### 🧩 Last 2 steps (the script can't click for you)

1. On the extensions page it opened, toggle **Developer mode** ON (top-right)
2. Click **Load unpacked** → pick the folder the script printed (it's also copied to your clipboard)

Then open MovieBox and hit play — the unlock is automatic. ✅

> 💡 The folder lives in `%APPDATA%\moviebox-vip-unlocker` (Windows) or `~/Library/Application Support/moviebox-vip-unlocker` (macOS). Keep it — updates just re-run the same command and reload the extension.

### 📦 Manual install (no scripts)

1. Grab the latest zip from **[Releases](https://github.com/Radit-lab/moviebox-vip-unlocker/releases)** and extract it
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked** → select the extracted folder
5. Play anything — done ✅

## 🎛️ Usage

Click the extension icon to open the popup. One toggle controls everything — flip it off anytime to disable all features.

## 🛠️ How It Works

| File | Job |
|---|---|
| `manifest.json` | Extension setup + permissions |
| `rules.json` | Rewrites the VIP-restrict header on play requests |
| `adblock.json` | Blocks verified ad/popunder/tracker domains (scoped to MovieBox mirrors) |
| `inject.js` | Kills the trial lock before the site starts it + blocks popup/popunder windows |
| `content.js` | Removes paywall UI, ad overlays + upgrades to 1080p |
| `background.js` | Enables/disables everything from the toggle |
| `popup.*` | The little popup UI |
| `scripts/` | One-line installers + the release zip builder |

## 🔄 Updating

Re-run the same install command for your OS — it replaces the files in place. Then in `chrome://extensions` click the **reload icon** on the extension card (or just restart the browser).

## 📦 Tech

Manifest V3 · JavaScript · Chrome / Edge / Brave

## 📄 Changelog

**v1.6.1** — Easy install. One-line installers for Windows (PowerShell) and macOS that download the latest release, extract it, and open the extensions page with the folder path on your clipboard. Added the release zip builder and an MIT license. Premium badge cleanup: the embedded crown/lock badge icons (base64 SVG images rendered on premium thumbnails) are now removed from the DOM along with any empty wrapper left behind.
**v1.6.0** — Consolidated the adblock ruleset from 17 rules down to a single regex rule (smaller, faster, easier to keep in sync). Synced the popup/popunder blocker domain list with the DNR blocklist (covers all `show-sb.com` / `redgarto.com` subdomains and toast CDN origins). Tightened the `/detail` response rewrite so already-unlocked responses are passed through untouched. Popup version string now reads dynamically from the manifest instead of being hardcoded.
**v1.5.0** — Ad blocking layer. Verified ad/popunder/tracker domains blocked via DNR (scoped to MovieBox mirrors only), popup/popunder windows blocked in the page, fake "New Message!" notification overlays removed. Everything follows the master toggle.
**v1.4.0** — Fixed the toggle so OFF actually disables everything. Added service worker control.
**v1.3.0** — Popup UI + master toggle + multi-mirror support.
**v1.2.0** — Trial lock killed at the source. Renamed to MovieBox VIP Unlocker.
**v1.1** — Fixed 1080p on fresh visits (empty history fallback).
**v1.0** — Initial release.

---

*Personal-use project. For educational purposes only.*
