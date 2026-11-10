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
