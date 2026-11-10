#!/bin/bash
# usage: run.sh job.json  (runs webshot.js, waits, prints audit)
cd "$(dirname "$0")"; taskkill //F //IM electron.exe >/dev/null 2>&1
rm -rf "$(python -c "import json,sys;print(json.load(open('$1'))['out'])")"
WS_JOB="$1" ./node_modules/electron/dist/electron.exe webshot.js >/dev/null 2>&1
echo exit $?; if [ -f webshot-err.txt ]; then cat webshot-err.txt; fi; exit 0
