# 🎬 MovieBox VIP Unlocker

> Watch MovieBox in 1080p. No paywall. No trial lock. No DevTools.

A tiny Chrome extension that handles the premium unlock automatically so you can just hit play.

## ✨ Features

- **🚀 Stream unlock** — play requests get the VIP restriction removed at the network level
- **🔓 Paywall kill** — premium modal and 5-minute trial bar removed instantly
- **📺 1080p upgrade** — every stream auto-switches to the best available quality

## 🌐 Works On

All MovieBox mirrors in one install:

`themoviebox.xyz` · `netfilm.world` · `123movienow.cc` · `themoviebox.app` · `movieboxonline.net` · `moviebox.co` · `downloadmoviebox.com`

## 📥 Install

### ⬇️ Quick download

Grab the latest zip from **[Releases](https://github.com/Radit-lab/moviebox-vip-unlocker/releases)**, extract it, then:

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the extracted folder
5. Open MovieBox and play anything — done ✅

## 🎛️ Usage

Click the extension icon to open the popup. One toggle controls everything — flip it off anytime to disable all features.

## 🛠️ How It Works

| File | Job |
|---|---|
| `manifest.json` | Extension setup + permissions |
| `rules.json` | Rewrites the VIP-restrict header on play requests |
| `inject.js` | Kills the trial lock before the site starts it |
| `content.js` | Removes paywall UI + upgrades to 1080p |
| `background.js` | Enables/disables everything from the toggle |
| `popup.*` | The little popup UI |

## 📦 Tech

Manifest V3 · JavaScript · Chrome / Edge / Brave

## 📄 Changelog

**v1.4.0** — Fixed the toggle so OFF actually disables everything. Added service worker control.
**v1.3.0** — Popup UI + master toggle + multi-mirror support.
**v1.2.0** — Trial lock killed at the source. Renamed to MovieBox VIP Unlocker.
**v1.1** — Fixed 1080p on fresh visits (empty history fallback).
**v1.0** — Initial release.

---

*Personal-use project. For educational purposes only.*
