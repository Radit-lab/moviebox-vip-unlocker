# MovieBox VIP Unlocker (personal-use extension)

Stops me from having to open DevTools every single time I want to watch something. Does three things automatically:

1. **Stream unlock** — rewrites `X-Vip-Restrict` to `0` on every `/subject/play` request (via `declarativeNetRequest`), on both `themoviebox.xyz` and `h5-api.aoneroom.com`.
2. **Paywall kill** — removes the "Unlock Premium Benefits" modal and the trial countdown bar as soon as they appear, and resumes playback if the trial handler paused it.
3. **1080p upgrade** — reads your current episode from `playHistory`, with a fallback to the page's `__NUXT__` payload when history is empty, and hot-swaps the video element to the signed 1080p MP4 URL. Re-arms automatically when you switch episodes.

No account, no token, no payment. Applies automatically on every `themoviebox.xyz` page.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select this folder (the one containing `manifest.json`).
5. Open MovieBox and play any episode. Done.

## How it works

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest, host permissions, DNR ruleset, content script |
| `rules.json` | DNR rules: set `X-Vip-Restrict: 0` on play API calls |
| `content.js` | Watchdog for modal/trial-bar kill + 1080p stream upgrade |

The header rewrite happens at the network layer (`declarativeNetRequest`), so it works even for requests made by the site's own fetch interceptor. The content script handles the DOM-level paywall and the quality upgrade.

## Changelog

- **v1.4.0** — Fixed toggle: OFF now truly disables everything. Added `background.js` service worker that enables/disables the DNR ruleset (header rewrite) on toggle; inject.js reads the toggle via a localStorage bridge (MAIN world can't use chrome.storage) so the trial-lock kill also stands down. Before this, OFF only stopped the modal killer + 1080p upgrade while the header rewrite and trial kill kept running.
- **v1.3.0** — Popup UI + master ON/OFF toggle (chrome.storage), branded icons, popup status panel. Multi-mirror support: generic DNR rule + host permissions cover all known MovieBox mirror domains (netfilm.world, 123movienow.cc, themoviebox.app, movieboxonline.net, moviebox.co, downloadmoviebox.com) plus all *.aoneroom.com. One install works on every mirror.
- **v1.2.0** — 5-minute trial lock killed at the source. Added `inject.js` (MAIN world, document_start) that rewrites the `/detail` API response: `previewSeconds: 0`, `freeEpisodeCount: 99999`, `ruleType: 0`. Renamed to **MOVIE BOX BYPASS BY RADIT**.
- **v1.1** — Fixed fresh-visit bug: 1080p upgrade now works with empty `playHistory` (falls back to `__NUXT__` payload for subjectId). Upgrade re-arms on episode change. Broadened host permissions + added second DNR rule for `h5-api.aoneroom.com`.
- **v1.0** — Initial version.

## Notes

- Session-only effect per page load — each page load re-applies it automatically, nothing manual.
- If a show isn't auto-upgrading on the very first play, start any episode once; the upgrade polls every 3s and will pick it up.
- For other domain mirrors of MovieBox, add the domain to `host_permissions` and the content script `matches`.
