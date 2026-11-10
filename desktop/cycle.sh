#!/bin/bash
# usage: cycle.sh job.json -> stages web/app, runs webshot, writes <out>/aud.txt and <out>j/*.jpg (viewable)
cd "$(dirname "$0")"; node ../web/stage.js >/dev/null || exit 1
./run.sh "$1" >/dev/null
O=$(python -c "import json;print(json.load(open('$1'))['out'])")
python aud.py "$O" 300 > "$O/aud.txt"; python tojpg.py "$O" "${O}j" >/dev/null; echo done $O
