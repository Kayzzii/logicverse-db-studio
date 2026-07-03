#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGO="$ROOT/src/assets/logo.svg"
ICONS="$ROOT/src-tauri/icons"
TMP="$ROOT/.tmp-icon-source.png"

mkdir -p "$ICONS"

echo "Generating 1024x1024 icon source..."
rsvg-convert -w 1024 -h 1024 "$LOGO" -o "$TMP"

echo "Running tauri icon..."
cd "$ROOT"
npx tauri icon "$TMP" -o src-tauri/icons

echo "Generating NSIS header BMP..."
rsvg-convert -w 150 -h 57 "$ROOT/scripts/nsis-header.svg" -o "$ICONS/nsis-header.png"
convert "$ICONS/nsis-header.png" -type TrueColor BMP3:"$ICONS/nsis-header.bmp"

echo "Generating NSIS sidebar BMP..."
rsvg-convert -w 164 -h 314 "$ROOT/scripts/nsis-sidebar.svg" -o "$ICONS/nsis-sidebar.png"
convert "$ICONS/nsis-sidebar.png" -type TrueColor BMP3:"$ICONS/nsis-sidebar.bmp"

rm -f "$TMP" "$ICONS/nsis-header.png" "$ICONS/nsis-sidebar.png"
echo "Brand assets generated in $ICONS"
