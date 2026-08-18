#!/bin/bash
# MovieBox VIP Unlocker - one-click installer for macOS (Chrome / Edge / Brave)
#
# Run this ONCE in Terminal:
#
#   curl -fsSL https://raw.githubusercontent.com/Radit-lab/moviebox-vip-unlocker/main/scripts/install-macos.sh | bash
#
# What it does:
#   1. Downloads the latest release zip
#   2. Extracts it to ~/Library/Application Support/moviebox-vip-unlocker
#   3. Opens the extensions page
#   4. You finish in 10 seconds: toggle Developer mode on, click "Load
#      unpacked", pick the folder printed at the end. That's it.

set -e

INSTALL_DIR="$HOME/Library/Application Support/moviebox-vip-unlocker"
ZIP_PATH="/tmp/moviebox-vip-unlocker-latest.zip"
RELEASE_URL="https://github.com/Radit-lab/moviebox-vip-unlocker/releases/latest/download/moviebox-vip-unlocker.zip"

echo "Downloading MovieBox VIP Unlocker..."
curl -fsSL -o "$ZIP_PATH" "$RELEASE_URL"

echo "Extracting..."
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
unzip -o -q "$ZIP_PATH" -d "$INSTALL_DIR"
rm -f "$ZIP_PATH"

# github zips wrap everything in a root folder - flatten if needed
UNPACKED="$INSTALL_DIR/moviebox-vip-unlocker"
if [ -d "$UNPACKED" ] && [ -f "$UNPACKED/manifest.json" ]; then
  UNPACKED="$UNPACKED"
else
  UNPACKED="$INSTALL_DIR"
fi

echo ""
echo "Done. The extension folder is:"
echo "$UNPACKED"
echo ""
echo "Last 2 steps (Chrome/Edge/Brave):"
echo " 1. In the extensions page that just opened, toggle \"Developer mode\" ON (top-right)"
echo " 2. Click \"Load unpacked\" and pick the folder printed above"
echo ""
echo "Then open MovieBox and hit play - the unlock is automatic."

open "chrome://extensions" 2>/dev/null || true
open "microsoft-edge://extensions" 2>/dev/null || true

# copy path to clipboard for easy paste in the file picker
if command -v pbcopy >/dev/null; then
  printf '%s' "$UNPACKED" | pbcopy
  echo "(The folder path was copied to your clipboard.)"
fi
