#!/bin/bash
# builds a token-free NEMTV.apk for sharing (your playlist link stays out of it) -> dist/NEMTV.apk
set -e; cd "$(dirname "$0")"
cp assets/config.js /tmp/nemtv_config.bak
repo=$(sed -n 's/.*repo:"\([^"]*\)".*/\1/p' assets/config.js); br=$(sed -n 's/.*branch:"\([^"]*\)".*/\1/p' assets/config.js)
echo "window.CFG={playlist:\"\",repo:\"$repo\",branch:\"${br:-main}\"};" > assets/config.js
trap 'cp /tmp/nemtv_config.bak assets/config.js' EXIT
bash build.sh >/dev/null; mkdir -p dist; cp NEMTV.apk dist/NEMTV.apk; echo "dist/NEMTV.apk ready (no playlist inside)"
