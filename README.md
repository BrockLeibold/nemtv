# NEMTV

Android TV IPTV app (NHL games, cable-style guide, scores). Built with raw SDK tools: `bash build.sh`.

## Install on another box
1. Install the **Downloader** app on the Android TV.
2. In Downloader enter: `https://github.com/BrockLeibold/nemtv/releases/latest/download/NEMTV.apk`
3. Install, open NEMTV, go to Setup (circle icon, top right), paste your M3U playlist link, press Load.

The release APK has no playlist link inside. Build your own with `bash release.sh`.

## UI rules and tests
Every screen follows [docs/UI-RULES.md](docs/UI-RULES.md). Check them on the PC (never needs the TV):

```bash
cd desktop && node stage.js
NEMTV_TEST="$(pwd -W)/shots/run1" NEMTV_PAGES=home,scores,schedule,setup,guide npx electron .   # overlap/clip/off-screen at 15 window shapes -> report.txt
NEMTV_NAV=1 NEMTV_TEST="$(pwd -W)/shots/nav1" NEMTV_PAGES=guide npx electron .                   # real arrow keys: every target reachable, no dead ends -> nav.txt
```
