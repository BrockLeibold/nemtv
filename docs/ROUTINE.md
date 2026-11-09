# Cowork routine: push the NHL Teams Guide to git

Repo layout: `guide/` is the site the TV app pulls (index.html, news.json, data/, logos/). The app checks `guide/` on every launch
(GitHub trees API, changed files only) and falls back to the copy bundled in the APK.

## Add this to the routine's run procedure (after the build, next to the artifact publish)

```
GIT PUSH (every run, after build.py finishes and the artifact is published):
1. Clone or update the repo: git clone https://x-access-token:$GH_TOKEN@github.com/OWNER/NEMTV.git nemtv   (or git -C nemtv pull --rebase)
2. Replace the site files: copy index.html, news.json, data/ (league.json, schedule.json, <ABBR>.json x32, box/), logos/ into nemtv/guide/.
   Do not copy tools/ or img/ unless they are already in the artifact. Never touch anything outside nemtv/guide/.
3. git add guide && git commit -m "guide: <Pre-game|Post-game> <date>"  (skip the commit if nothing changed)
4. git push origin main. On a rejected push: git pull --rebase, then push again (max 2 tries). Never force-push.
5. Report the commit hash in the run summary. If the push fails, say so; the artifact publish still counts as done.
Keep all existing rules (integer player ids, etc.). GH_TOKEN is a fine-grained token with Contents: read/write on OWNER/NEMTV only.
```
