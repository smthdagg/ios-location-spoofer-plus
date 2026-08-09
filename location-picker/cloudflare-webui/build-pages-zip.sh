#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="${1:-$SCRIPT_DIR/dist}"
PKG_DIR="$OUT_DIR/ios-location-spoofer-plus-cloudflare"
ZIP_PATH="$OUT_DIR/ios-location-spoofer-plus-cloudflare.zip"

rm -rf "$PKG_DIR" "$ZIP_PATH"
mkdir -p "$PKG_DIR"
cp "$SCRIPT_DIR/worker.js" "$PKG_DIR/_worker.js"

(
  cd "$PKG_DIR"
  zip -q -r "$ZIP_PATH" _worker.js
)

printf '%s\n' "$ZIP_PATH"
