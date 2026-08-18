#!/bin/bash
# Build a ready-to-load zip from the repo root.
# Usage: ./scripts/build-release.sh          -> builds into dist/
#        ./scripts/build-release.sh release  -> builds a release zip at the
#                                                root (for GitHub Releases)
#
# The zip contains ONLY the extension files - the manifest, JS, icons and
# adblock rules, in one flat structure that "Load unpacked" can consume
# directly. No install scripts, no scripts/ folder inside.

set -e
cd "$(dirname "$0")/.."

VER=$(node -e "console.log(require('./manifest.json').version)")
MODE="${1:-build}"

TMP=$(mktemp -d)
STAGING="$TMP/moviebox-vip-unlocker"
mkdir -p "$STAGING"

FILES="manifest.json background.js content.js inject.js rules.json adblock.json popup.html popup.js popup.css icons README.md LICENSE"
for f in $FILES; do
  [ -e "$f" ] && cp -r "$f" "$STAGING/"
done

cd "$TMP"
ROOT="$OLDPWD"
if [ "$MODE" = "release" ]; then
  zip -rq "$ROOT/moviebox-vip-unlocker.zip" moviebox-vip-unlocker
  echo "Release zip built: $ROOT/moviebox-vip-unlocker.zip"
else
  mkdir -p "$ROOT/dist"
  zip -rq "$ROOT/dist/moviebox-vip-unlocker-v${VER}.zip" moviebox-vip-unlocker
  echo "Build zip built: dist/moviebox-vip-unlocker-v${VER}.zip"
fi
rm -rf "$TMP"
