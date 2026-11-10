#!/bin/bash
# copies guide/ into assets/guide (the part of build.sh that matters for desktop/web tests)
cd "$(dirname "$0")/.."
rm -rf assets/guide && mkdir -p assets/guide && cp -r guide/index.html guide/deck.css guide/deck.js guide/news.json guide/data guide/heroes assets/guide/ && { [ -d guide/logos ] && cp -r guide/logos assets/guide/ || true; }
