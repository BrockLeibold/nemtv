# NEMTV UI / UX rules

These are the rules every screen follows. `desktop/overlap.js` checks the ones a machine can check, and `desktop/main.js` runs it
at 15 window shapes (`NEMTV_TEST=<dir> NEMTV_PAGES=home,guide,...`). A change is not done until the test shows `FAILS 0`.

## Layout
1. **One grid owns the screen.** Header row, content row, and inside a screen named rows/cells (`grid-template-rows:auto minmax(0,1fr)`).
   No `position:absolute` for layout, no `100vh - Npx` guesses, no pixel heights for containers.
2. **Cells size their content, not the other way round.** Type, logos and padding use `clamp()`, container units (`cqh`) or the cell itself.
   Every grid/flex child that must shrink gets `min-width:0` / `min-height:0`.
3. **Nothing overlaps, nothing is cut off.** Siblings never intersect, children stay inside their parent, no text is clipped by its box
   (ellipsis counts as clipped for names and numbers). If it does not fit, shrink (the guide deck zooms a slide down until it fits) or
   drop the least important line, never clip.
4. **Too small = scroll the page, never squeeze.** Home keeps a minimum height and scrolls below it. Guide sections never scroll; they page.
5. **One axis per job.** Sections page left/right with the current section shown in the top bar. Lists inside a section never scroll.
6. **Every window shape works:** 16:9 TV, ultrawide, portrait, narrow side panel. Test at all of them.

## Spacing and controls
7. **Spacing scale 4 / 8 / 12 only.** Gaps and paddings come from `--g4 --g8 --g12`.
8. **Every control in a row is the same height** (28px in the guide, 34px in the TV header) with **equal left and right padding**
   (12px) and equal gaps. Tabs and pills in one group have equal width or equal padding, never "whatever the text needs".
9. **Nav is thin.** Header + top bar + team rail together stay under 20% of the screen height.
10. **Maximise content.** Use the room: show the photo, the role, the stats, not a heading and white space. Headings that repeat the
    tab name are removed.

## Information
11. **No floating numbers.** A number always sits next to its label or name (`#73 Teddy Blueger`, `Points`, `G A P`).
12. **Every item says what it is.** Logo + name, photo + name, icon + word. Icon-only only for the Setup circle.
13. **One red/accent thing per screen** (the item that needs attention); selected state is a ring, never a fill that hides the logo.
14. **Minimum text 9px effective**, body 11px+. The test warns below 8.5px after any zoom.

## Controller (D-pad) and mouse
15. **Everything is reachable with the D-pad** and nothing traps focus. Left/Right at the edge of a section pages to the next one,
    Up from the first row reaches the top bar, Back closes the top layer first.
16. **Focus is always visible** (3px coral ring, offset 2px so the clipping parent never hides it).
17. **OK on a thing does one clear thing.** Desktop: first click selects, second opens (hero games).
18. **Targets are at least 14px** in each direction (warned otherwise).

## Data
19. **Show what you know, say what you do not.** "No games yet", "Not started", never an empty hole.
20. **Never block on the network.** Draw from cache first, update when data arrives, never show a spinner over known content.

## Phone, tablet and the guide side panel (round 2)
The TV rules above stay. Below 700px wide, 520px tall, or on 4:3 / portrait tablets the app and guide switch to a touch layout:
21. **Real size, no zoom-out.** The guide adds `html.cz` (compact) when its window is <=900px wide or <=520px tall and the host has not zoomed it
    out (the TV's quarter-width side panel is zoomed, so it keeps the zoom-fit deck). In compact mode sections scroll down inside their slide.
22. **One column, 3 across for lineup cards, games as a list.** The month calendar becomes one row per game (`.callist`).
23. **Text >= 11px, controls >= 40px** (44px for primary buttons) at those sizes. `desktop/webshot.js` audits this at real window sizes
    (`desktop/mkjob.py` builds the job, `desktop/cycle.sh job.json` stages, runs and writes `<out>/aud.txt` plus viewable JPEGs).
24. **Overview photo fills the space above the cards** at every window shape (`#ov` rows: photo `1fr`, cards `auto`).

## Multiview (#mv)
- Tiles are absolutely positioned boxes in #mv and never reparented; layout/audio/zoom/remove only change CSS (left/top/width/height/z-index, video transform) or the muted flag. Only `mvLoad()` (first start, FEED button, fatal error) touches hls; `window.__mvLoads` counts loadSource+attachMedia so tests can prove it.
- Exactly one tile has audio; it is the main tile (2px white outline). The white audio outline and the red dotted selection outline show only while the UI is up or the user is selecting / in a menu; after 3 s idle they fade out with everything else (opacity transition) and fade back in on any key. Bar, labels, picker and cursor hide after 3 s idle too.
- Per-tile controls are not on screen. Select a tile with the D-pad (dotted outline); short OK = audio/main (acts on release). Hold OK ~500 ms (long-press on touch, right-click on mouse) opens a small menu anchored on that tile: Zoom (Left/Right adjusts only that tile, OK resets), Feed (that tile's feed list, `svOrder` labels/order), Switch game (opens the score bar picker for that tile, `mvSwap` in place), Make audio / main, Remove. Up/Down reach every item, Back closes it; the menu keeps the UI up. The overlay keeps only the global controls: Layout, ALL zoom -/+, + Game, Scores, Exit.
- Only Feed and Switch game reload anything (that tile only). `mvLoad()` (first start, Feed, fatal error) is the only place hls is touched; `window.__mvLoads` counts loadSource+attachMedia so tests can prove it.
- Layout: tiles are boxes that only change left/top/width/height/z-index. The 2-tile Picture in Picture inset has a transparent background (letterbox shows the main video, never black). When the score bar is on (Scores button, shared with the single player) every layout starts below it (8% of the height) and re-lays out without reload when it toggles.
- Entering from the single player hands its playing `<video>` and hls instance to tile 1 (no restart, no new load, `__mvLoads` unchanged); the player gets a fresh empty `#v` (`vBind`). Falls back to a reload of the same feed if nothing is playing yet.
- Test: `cd desktop; node ../web/stage.js; MV_HLS=<dir with g0..g3/index.m3u8> MV_OUT=<dir> npx electron mvtest.js 960x540 390x844` -> FAILS 0.

## Score bar (#sbar, single player and multiview)
- Thin strip, 8% of the player height, pinned to the top (controls live at the bottom). Every NHL game today from `games().live` (same data + 20 s `pollScores` refresh as Home/Scores; no new source). Items reuse the pill tokens (`--o-a/--o-b` team colours, `.skin/.mesh`, `.done` grey, coral ring = current game) and share the width (`flex:1 0 112px`); too many = the strip scrolls sideways, the focused game stays centred. Text/logos use `cqh` of the bar (>= 9px).
- Visible only while the player / multiview UI is hidden (fades with `#pl.hide` / `#mv.hide`, `MutationObserver` -> `sbSync`) and only when the Scores button is on (`localStorage scoreBar`). Skeleton items while the first scores load (rule 25).
- Change game (`#bcg`) = picker mode (`#sbar.pick`, `body.sbp`): UI hidden, bar shown and focused on the current game, Left/Right skip disabled games, OK/click switches (`sbGo` -> `play(g)`, same feed order), Back cancels, picking the current game does nothing. Disabled = not live (final, or more than 40 min to start) or no feed. In multiview the same bar picks the game for one tile (tile menu > Switch game; games already on screen are disabled); the old Swap picker stays reachable from code only.
- Feed memory: the feed picked in a Feed menu (player or multiview tile) is saved per game (`feedMem`, normalized title + day, 2 days) and used when that game opens again if still available (`fmSet/fmPick`).
- Test: `mvtest.js` score bar and feed memory checks.

## Loading (skeletons)
25. **Every loading state is a skeleton, never a spinner or "Loading..." text.** Skeletons have the same grid, sizes and radius as the final cards, rows, pills, photos and text lines, so nothing jumps when data arrives.
    - One shared class pair (app `assets/index.html`, guide `guide/deck.css`, same CSS in both): `.sk` = a plain block (text line, number, photo); `.skm` = a real card drawn by its own renderer with its content hidden (`skN(n, renderRow)` / `skify` in the app), so sizes match exactly. NEMOS dark neutral fill, radius from the real element, one transform-only shimmer on a pseudo-element (no blur, no `will-change`); off under `prefers-reduced-motion`.
    - Images: `img[src]:not(.ld)` shows the skeleton fill behind the picture until it loads or errors (the page adds `.ld` on `load`/`error`).
    - Never focusable, never a D-pad target: the `.skm` wrappers are `inert` and drawn with `div`s (`skify` turns buttons into divs); a real button that stays focusable (a channel row waiting on its guide) only holds a `.sk` line inside.
    - Replaced in place by the real render (same container, same size). Show only while actually loading: skeletons fade in after 150 ms (CSS animation delay), so a cache hit replaces them before they ever show.
    - Errors and empty results stay real messages ("Could not load the scores", "No NHL games on the board yet"), never a skeleton that never ends. Every loader sets a "done or failed" flag (`scLoaded/scFail`, `plDone`, `tmiL`, `nwsL`, `epgF`, `gdFail`).
    - Covers the app (boot, Home hero stats and team news, Scores, Live list/EPG/preview, Setup status, game popup, player buffering `#pbuf`, multiview tiles) and the guide (Overview, rail, News, Roster, Team, Games, box-score drawer, team switch).
