#!/bin/bash
# usage: shot.sh <name> <WxH> <pre-js> [keys] [expr]  -> shots/sweep_final/<name>_<WxH>.jpg ; prints debug.txt
cd "$(dirname "$0")"; d=shots/t_$$; mkdir -p $d
NEMTV_DEBUG="${5:-1}" NEMTV_SIZE="$2" NEMTV_PRE="$3" NEMTV_KEYS="$4" NEMTV_TEST="$(pwd -W)/$d" timeout 150 npx electron . >/dev/null 2>&1
taskkill //F //IM electron.exe >/dev/null 2>&1
python -c "
from PIL import Image
im=Image.open('$d/debug.png').convert('RGB');im.thumbnail((640,640));im.save('shots/sweep_final/$1_$2.jpg',quality=25)"
cat $d/debug.txt; echo; rm -rf $d
