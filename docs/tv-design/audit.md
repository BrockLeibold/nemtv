# NEMTV design audit, 2026-11-11

Method: two passes, both done.
- A) Visual. `node web/stage.js`, `python -m http.server 47213 --bind 127.0.0.1 --directory web/app` from the repo root, built-in Browser pane at 960x540 (TV), 1920x1080 (big web), 390x844 (phone). Every screenshot was opened and looked at. Measurements came from `javascript_tool` (computed font sizes, safe-area boxes, target sizes, ring styles). Contrast numbers are computed from the CSS colours.
- B) Code. `assets/index.html`, `guide/deck.js`, `guide/deck.css`, `guide/index.html`, `web/server/shim.js`, `assets/gx/nav.js`.
- Checklist numbers refer to the "Audit checklist" in `course.md`. Rule numbers refer to `UI-RULES.md`.

Test limits (so nothing below is over-claimed):
- The plain static server has no `window.Android` shim, so `pollScores`, standings, playlist and EPG never ran. I injected test data into the page (`gotList`, `gotScores`, 16 channels, 2 live games, 1 final) and ran the real renderers. Skeleton/failed states were screenshotted before injecting. Real NHL, guide JSON and news JSON loaded locally.
- Test video does not play in the pane (app uses hls.js for every feed), so the player was audited on its buffering state, controls, menus and score bar, not with picture.
- Keys were sent with the pane's key tool. Where focus was set by script the real `:focus` state does not always match, so focus rings were checked with computed styles and with real key presses.

## Size summary

| Size | How it renders | Verdict |
|---|---|---|
| 960x540 TV | iframe-free 1:1 at the 960 design | The reference size. Most findings below are measured here. |
| 1920x1080 web | `web/stage.js` wrapper scales the same 960x540 page by 2 (`scale(2)`, checked) | Pixel-identical layout to 960x540. Every size and margin finding carries over x2 (a 7px label is 14px). No new defects from the wrapper; it is crisp. |
| 390x844 phone | Touch layout from the `@media (max-width:700px)` blocks | Clean: 0 text under 11px on all app pages, all measured targets >= 40px tall, no horizontal scroll. Defects are the multiview menu overlap, the 3-line title in the player bar and a mid-word wrap in the guide roster. |

Effective text at 1080p on the TV layout (css px x 2): the app's own base is `font:11px/1.35` (`index.html:25`) = 22px, already under Apple's 23pt floor; the game pills use 7-9px = 14-18px.

---

## Cross-cutting issues (all pages)

| # | Checklist / rule | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| X1 | 7, 8 (type floor 23px / body 28px at 1080p) | Measured on Home at 960: 7px x5 (pill times, "P2 12:34"), 8px x19 (stat labels POINTS/RECORD..., team names in small pills), 9px x4, 10px x6. CSS: `index.html:74,75,338-341` (`.pill .sp/.live/.tm` 7-8px), `:25` base 11px. Schedule: 7px x13 times, 8px x26 team names. Scores rows 10-10.5px. Live list 9-10px. Guide 10-11px everywhere (`East/West` 10px, roster stats 11px). UI-RULES rule 14 itself only asks 9px, so the repo rule is below the TV floor. | High | M | Raise the floor in tokens: pills `.tm` 8->11px, `.live/.sp/.tm time` 7-8->10px, stat labels 8->10px, base 11->12px. Drop the least important line (`.sp`, `.rec`) in the small grid pills rather than shrinking. Change rule 14 to "min 10px, body 12px" and make `overlap.js` warn below 10px. Grow in steps; pills in `.grid.lg/.cal` are 75px tall so they need a 2-line layout change (S per step, M total). |
| X2 | 9 (5% safe area: 48px / 27px at 960) | Header and `main` use `padding: ...28px` (`index.html:22,367,454`). Measured left edge of text: x=28 on Home/Scores/Schedule/Live/Setup (title, cards, search bar, chips); the gear button right edge at 932 (28 from edge). Top: tab bar text at y=20. Bottom: player control bar bottom at y=520 of 540 (20px), Home second pill row bottom 427/540. Score bar `#sbar{top:0}` (`:148`) touches the top edge. Game drawer buttons at x=10, y=8 (`gd`). Guide rail starts at x=14. | High | M | Introduce `--safe-x:48px; --safe-y:27px` at the 960 base and use them for `header`, `main`, `main.live`, `#gd`, `#ptop/#pctl`, `#sbar`. Backgrounds (hero, drawer, tiles) still bleed. Guide: pad `.wrap` with the same values when `html:not(.cz)`. Phone keeps 12-16px (touch layout). Test with `overlap.js` safe-box check. |
| X3 | 2 (focus ring, 2 cues, 3:1) / rule 16 | Ring style is not one token. Default `.focusable:focus` = 3px white `box-shadow` (`:32`). Popup/menu/drawer buttons use 3px coral outline (`:252,231,363,270`) and also get the white shadow = double ring (seen on Watch Live popup). Home pill uses coral 3px + 6px halo (`:271`). Guide uses a 2px dark ring (`--ring-focus`, guide `index.html:15`) and coral outlines in `deck.css:81,130,162,260,323`. Rule 16 says "3px coral ring, offset 2px". Real default has no offset, so an `overflow:hidden` parent clips it. No scale cue anywhere (course lesson 2: two cues). | Med | M | One token set in `:root`: `--ring: 0 0 0 3px var(--ink), 0 0 0 5px rgba(0,0,0,.6)`; apply to all `:focus-visible` in app and guide (dark variant on the light guide). Remove the second ring from `.pbtn`, `#gdh button`, `#gbar button`, `.watch.hit`. Add `transform: scale(1.03)` on cards with `transition: transform .12s` (transform-only). |
| X4 | 12 / 17 (loading states) and rule 20 | `pollScores`, `pollStandings`, `Android.get` fetch have no timeout (`index.html:597,615`); a hung network leaves skeletons forever. Seen: Scores shows 8 skeleton cards indefinitely, Home stats tiles (POINTS/RECORD/...) stay as empty dark tiles with labels, Team News empty. `scFail` only trips on a rejected fetch. On phone the empty stat tiles and news box leave a large dead area in the hero. | Med | S | Wrap the two fetches with `AbortSignal.timeout(8000)` (reject path already sets `scFail`). Show "-" in stat tiles when `tmiL` is done and the team has no data. Rule 19: say "Stats unavailable". No data-logic change. |
| X5 | 19 (Back unwinds; web) | `window.nemBack` (`index.html:1268`) is only called from Android. `web/server/shim.js` has no Escape/Backspace/BrowserBack/GoBack handler, and `index.html` has no key handler for them (only Backspace in Live, `:1422`). On the Docker twin with a keyboard or a smart-TV browser remote, Back does nothing inside the app (the guide has its own Escape, `deck.js:271`). | High | S | In `shim.js` (web only): `keydown` for Escape, Backspace (when not in an input), BrowserBack, GoBack, keyCode 4/10009/461 -> `if(!window.nemBack()) history.back()`. Android path untouched. |
| X6 | 11 (colour/contrast) | White text on team-colour pills. Computed worst-case fill vs white: NSH/BOS/PIT gold #FFB81C 1.7:1, LAK #A2AAAD 2.4:1, UTA #6CACE4 2.4:1, SEA #68A2B9 2.8:1, VGK #B4975A 2.8:1. Mitigated near the dark mesh centre, not at the edges where 7-8px labels and `.live` sit (`.skin::after` gradient, `:68`). `--muted` #8F8996 on #0F0E11 is 5.7:1 (pass). | Med | S | Put team names/times on a dark scrim band (`.pill .live`, `.tm` get `background:rgba(0,0,0,.35)`), or darken `--o-a/--o-b` fills for light team colours via `color-mix(in srgb, var(--o-a) 70%, #000)`. |
| X7 | 24 / rule 7 (token consistency) | Spacing scale says 4/8/12 (`--g4/8/12`); app CSS uses 10, 14, 6, 9, 18px gaps/paddings widely (`.grid{gap:10px}`, `.watch{padding:7px 18px}`, `.pill` padding 14/10px). Font sizes in guide: 20+ distinct values (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5 ...). Two ring systems (X3). Light guide inside a dark app (surface #F3F2F5 vs #0F0E11). | Low | L | Define a type ramp (11/12/14/18/28/48) and map; keep colours. Not a Do-now item. |
| X8 | 15 (animation/perf) | Heavy filters: `#pbuf .mesh2{filter:blur(36px) saturate(1.3);inset:-20%}` (`:199`, animated `bob`, full-screen, shown on every buffering wait); `#boot .orb{filter:blur(40px)}` + `fl`/`mq` animations (`:109-118`, boot only); `#gp.side{backdrop-filter:blur(10px)}` over live video (`:356`); guide `deck.css` has `backdrop-filter:blur(12px)` x2 (disabled by `!important none` in compact). No `will-change`, no animated layout props (pass). Skeleton shimmer is transform-only on pseudo-elements (pass). `.pill:focus .mesh{}` is an empty rule and `@keyframes drift` is unused (`:66,67`). | Med | S | Replace `blur(36px)` mesh with a pre-blurred static radial-gradient (no filter); drop `backdrop-filter` on `#gp.side` and use `rgba(15,14,17,.94)`. Delete dead rules. Test on the Onn. |
| X9 | 14/15 (timers) | 24 timers; polling is sane: `pollScores` 20s, standings 5 min, hero data 10 min, `gSig` check 60s only on home/live (`:1443-1447`). Boot splash has a 2.2s minimum plus a 9s cap (`:1436-1437`): users wait at least 2.2s even with cached data. Guide is pre-warmed at 20s in a hidden iframe kept laid out off-screen (`#gp[hidden]` at `:357`, `:1444`): memory on a weak box. | Low | S | Boot minimum 2200ms -> 800ms when `ch.length` is cached (`bootOff`). Keep the guide warm-up but only after first idle (requestIdleCallback). |
| X10 | 1 (focus at load) | `go()` focuses the tab (`:1341`), so Home/Scores/Schedule/Live all start on the tab bar (OK). After data renders, focus can jump to the first card (Scores, seen) without a key press. The guide starts with `document.activeElement` = BODY until a key arrives (all 5 guide sections measured: BODY). | Low | S | Guide: on `ready` and on `deckGo`, focus the active tab (`curTab().focus()`), the same thing `exitUp` does. |

---

## Per page

### Home (hero + pills)
Seen (960, 1920): full-bleed gradient hero, left team / right team, big "0 - 1" score, six stat tiles, Team News box, 6 pills in 4+2 rows, focused pill has a coral ring plus halo. 390: hero card is about 940px tall; pills are full-width rows below.
| Issue | Checklist | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| Stat labels 8px (POINTS/RECORD/LAST 10/STREAK/GOALS F-A/SHOTS) and pill times 7px | 7, 8 | measured 8.0px x19, 7.0px x5; `index.html:338-343` | High | M | See X1. Hero tiles: 8->11px, show only 4 tiles. |
| Hero text and nav inside 28px, not 48px | 9 | NHL TODAY at x=28; "6 of 6 showing" right edge 932; pill row left 28 | High | M | X2 |
| Stats tiles empty while data pending/never arrives | 17, rule 19 | tiles show labels only; Team News box empty on phone (large hole) | Med | S | X4 |
| Second pill row (2 pills) is centered, first row left-aligned (4+2) | 3 | screenshot 960; D-pad Down from pill 1 lands between, geometry unpredictable | Low | S | `.grid.lg{justify-content:flex-start}` or fill to 3x2 |
| Top nav: 5 text+icon items, one 28px-high pill, 11px labels | 13 | pass on count and labels; 34px control height vs 40px/44px touch minimum on phone (phone shows 40px: pass) | Low | - | none |
| Focus ring on pill is coral+halo, tabs use white ring | 2 | `:271` vs `:32` | Med | S | X3 |
| Code: carousel arrows handled in `#m` capture handler, one press = one item (good) | 3 | `:1362-1380` | - | - | pass |

### Scores
Seen: 2-column list of rows (team abbrevs, big numerals, status top-right, "No goals yet / Not started" strip). Skeleton state is 8 uniform cards (good, same size as final).
| Issue | Checklist | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| Focused LIVE card shows no focus ring: `.sr.lv{box-shadow:inset 0 0 0 1.5px var(--coral)}` (`:256`) comes after `.focusable:focus` (`:32`) with equal specificity, so the 3px white ring is replaced by the same thin coral line the unfocused live cards have. Measured: focused live card box-shadow = `rgb(255,138,91) 0 0 0 1.5px inset`, focused non-live = `0 0 0 3px #F2F0F4`. Screenshot: two live cards look identical, focus not findable. | 2, 12 | `index.html:32,256`; measured | High | S | `.sr.lv:focus{box-shadow:inset 0 0 0 1.5px var(--coral),0 0 0 3px var(--ink)}`. |
| Row text 10-10.5px ("No goals yet", status, date) | 7, 8 | measured 10.0px x10, 10.5px x10 | High | S | status/date to 12px, strip text to 12px; rows have the height |
| Date text "Wed, Nov 11, 9:30 PM" at top right is tiny against 19px numerals | 11 | screenshot | Low | S | date on one line at 12px, drop weekday for today |
| Left/right text at x=28; list scrolls under header | 9 | measured | High | S | X2 |
| Skeleton forever if network hangs | 17 | `:615` | Med | S | X4 |
| Game drawer (open a card): body is blank black with one 10px grey line on error ("Could not load this game..."), top-left at x=10,y=8, no Retry button; focus lands on Summary; close button is the letter "X" | 21, 23 | `index.html:864,869`; screenshot 960 and 390 | Med | S | Centered empty state, 16px message, a focusable "Try again" button that calls `gdLoad()`, close label "Close". Keep within safe area. |
| `#gd` Back: closeGame focuses the opener (`:857`), good | 4 | pass | - | - | |

### Schedule
Seen: day header "12 Thursday / November - 11 games", 4-column grid of 75px game pills, same gradient look, next day below. Phone: one column list, 12:00 PM etc. readable.
| Issue | Checklist | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| Pill text: names 8px, time 7px | 7, 8 | measured 8.0px x26, 7.0px x13 | High | M | X1; use 3 columns with 100px pills at 11px/10px |
| Focused pill scrolls so the day header goes off screen (alignRow aligns the row, not the day) | 3, 7 | 1920 shot: header "12 Thursday" gone, focus on row 2 | Low | S | In `alignRow`, only align to the header when the focused item is in the first row of the day (already so); otherwise keep 2 rows of context. Minor. |
| No per-day count or position cue when scrolled deep (51 games over 7 days) | 7 | no "3 of 51" | Low | S | Sticky day chip in header. |
| Down from tab bar handled (`:1264`), up returns (`:1379`) | 3 | pass | - | - | |
| Margins 28px | 9 | measured | High | S | X2 |
| Colour only: finished = grey, live = coral inset, later = opacity .82 | 12 | `:77, .done` | Low | S | Add the text label ("FINAL", "LIVE") - present already on Home; on Schedule only time shows |

### Live: list / EPG / preview
Seen: search box, category chips, big title area, 170x96 preview box, time header, channel rows (logo tile + name, 190px) and programme cells ("Live TV / No guide data"). Skeleton state is rows with the same sizes (good).
| Issue | Checklist | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| Focused EPG programme cell has no focus ring: `main.live .pg{...box-shadow:none}` (`:385`, specificity 0,2,1) beats `.focusable:focus` (0,2,0). Measured on a focused `.pg`: `boxShadow:none`, outline none. Screenshot 960: row cell looks identical to its neighbours; only the info text above the grid changes. | 1, 2 | `index.html:385`; matches in computed rule list: `.pg => inset 0 0 0 1px`, `main.live .pg => none` | High | S | Delete `box-shadow:none` from `:385` (the base `.pg` inset line is overridden by the focus rule anyway), or add `main.live .pg:focus{box-shadow:0 0 0 3px var(--ink)}`. |
| Down from the Live tab does nothing in browsers: `header` keydown only handles Down for guide and schedule (`:1264`); on Live/Home/Scores it depends on native spatial navigation. Verified on Live (ArrowDown x4, focus stayed on the tab; `document.activeElement` = tab). Android WebView does its own spatial nav, a desktop/TV browser does not. | 3, 5 | `:1264` | High (web) | S | Extend line 1264: `else if(e.key==="ArrowDown"){const f=$("#m").querySelector(".focusable");...focus}` for every tab. |
| Search box and chips 9-10px; row names 11px; "Hockey/TSN" subtitles 9px; all under floor | 7, 8 | measured 11.0 x20, 10.0 x11, 9.0 x11 | High | S | chips to 12px (the 40px-high phone rule at `:402` already exists, apply min 28px at TV), row name 14px |
| Preview box is a black rectangle with "Preview starts when a channel is focused", then "Preview unavailable" | 19 | screenshot | Low | S | Hide the box until a preview is possible, or show the channel logo |
| `main.live` padding 28px | 9 | `:367` | High | S | X2 |
| Chips have 40px min-height only below 700px; at TV they are about 20px high | 18 | measured `All@28,94-62,115` height 21px | Med | S | min-height 32px at 960 |
| Back from a row jumps to the search box (`:1281`) then to Home; Backspace clears search and filter (`:1422`) | 19 | works, undocumented | Low | - | Add to rules doc |
| EPG list uses `content-visibility:auto` only on the older `.gr` rule, `main.live .gr` resets it to `visible` (`:304,381`), so all rows render | 25 | 16 rows OK; with a real playlist of 800+ channels the DOM is large | Med | M | Window the list (render 20 rows around focus) or restore `content-visibility:auto; contain-intrinsic-size:0 52px` |

### Guide (shared: header bar, rail, tab strip)
Seen: light theme (#F3F2F5) inside the dark app, team dropdown, 5-tab pill strip, East/West logo rail of 32 tiny logos, then section content.
| Issue | Checklist | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| Light surface in a dark TV app: full-screen #F3F2F5 / white cards. The rest of the app is dark; this fails "dark base" and is the brightest area in the product | 11, 12 | guide `index.html:10` (`--bg:#F3F2F5; --surface:#FFFFFF`); all five screenshots | Med | L | Provide a dark token set for the guide (it already has tokens) and use it when hosted. Needs design sign-off. |
| No safe margin: rail begins at x=14, content to x=946 | 9 | screenshot, measured | High | M | X2 |
| Text 10-11px; roster stat lines 11px; calendar cells tiny | 7, 8 | measured: 10.0 x2 (East/West), 11.0 x51 (roster), 11.0 x40 (Team page), 11.0 x22 (calendar) | High | M | Bring `.eyebrow`, `.caption`, `.mt small` to 12px and let `fitOne` shrink less (see below). |
| Fit-to-screen shrinks content to as low as 0.5: `fitOne` loops `z-=.03` until nothing clips (`deck.js:102-107`), which is why the guide text ends up 10-11px. Each step does `querySelectorAll("*")` and reads `scrollHeight` (forced layout) in `over()`: up to 17 iterations x all descendants x 5 slides on every resize/sync | 15, 25 | `deck.js:85-108` | Med | M | Cap zoom floor at .8 and let overflowing slides page vertically (compact `.cz` mode already does); cache `over()` results per slide. |
| Guide starts with no focus (BODY) | 1 | measured all 5 sections | Med | S | X10 |
| Team rail logos are 20px; skipped by D-pad (`nav.js:items`), dropdown replaces them: OK for TV, small for mouse | 18 | `nav.js:20` | Low | - | none |
| Focus rings: roster tile ring is coral `#FF8A5B` `outline:3px`, offset -3px (`deck.css:81`) on gold tiles (#FFB81C for BOS): contrast 1.34:1. Coral on the light surface is 2.1:1; both fail the 3:1 rule. Guide default `--ring-focus` dark 2px passes. | 2 | `deck.css:81,130,162,260,323` | High | S | Switch those rules to `box-shadow:0 0 0 3px #141217, 0 0 0 5px #fff` (dark + light double ring, works on any team colour). |
| Light/dark mismatch on drawers: white sheet over dark scrim | 11 | screenshot game drawer | Low | - | with theme item |

#### Guide: Overview
Seen: team photo hero, "1ST IN ATLANTIC / BOSTON BRUINS", 4 stat cards (Record, Points, Streak, Next game).
| Issue | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|
| Card labels 11px, "18 games played" 11px | measured | Med | S | 12px |
| Hero photo has a text scrim and a 40px type (pass); card row sits 24px from bottom (inside bottom safe 27px? no: crosses it) | screenshot 960: cards bottom 489/540 within iframe, host bar leaves 51px: pass at host level | - | - | pass |

#### Guide: News
Seen: lead headline in 20px, two columns of items, right "Next game / injuries" column.
| Issue | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|
| Source/date lines 10px ("ESPN - 2026-11-11"), item body 11px; reading-heavy tab on a TV | measured 10.0 x12 | Med | S | Cut summary text (the app is "short descriptions"), show source+date at 12px |
| Two uneven columns: left items 3 lines, right 4; focus order unclear | screenshot | Low | S | Single column of 4 with fixed height |
| No focusable items inside News except links; D-pad Down has nowhere to go | `nav.js` items | Low | S | none needed |

#### Guide: Roster
Seen: gold tile grid L1-L4 and D1-D3/G, big numbers, names, stat line, reserves row at bottom.
| Issue | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|
| Reserves row sits at y=516/540 (24px from the bottom) | screenshot 960 | Med | S | X2 |
| Name wraps mid-word on phone ("KHUSHNUTDIN / OV") | screenshot 390 | Low | S | `overflow-wrap:normal; font-size` clamp or `hyphens:none` + smaller font for long names |
| Stat lines 11px | measured | Med | S | X1 |
| Ring on gold tiles | above | High | S | above |

#### Guide: Team
Seen: three cards (geography bars, draft sources + longest-serving, cap hits + scoring leaders).
| Issue | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|
| "13 yr", "10 yr" wrap onto two lines in the longest-serving bars | screenshot 960 | Low | S | `white-space:nowrap` on the value cell, widen to 48px |
| Dense: 9 data blocks, 10-11px; violates "one purpose per screen" | measured | Med | M | Split into two pages or hide "States and provinces" caption |

#### Guide: Games (calendar) + game drawer
Seen: month grid with day cells, selected day (11) has a grey fill with gold ring, right panel "Wednesday, November 11 - no games". Drawer: matchup header and H2H table; phone shows grey skeleton blocks while loading.
| Issue | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|
| Cell text (opponent, time) 11px; day numbers 11px | measured 11.0 x22 | Med | S | 12px; calendar uses `.callist` in compact (good) |
| Selected-day ring is gold on grey; the empty-day right panel wastes 40% of the screen | screenshot | Low | S | Show next game when day is empty |
| Drawer: close "x" is an icon-only circle; rule 23 wants text | screenshot | Low | S | add aria-label and "Close" text |
| Drawer open from click: focus did not move into the drawer in the pane (activeElement BODY after open via script click); `nav.js` `layers()` moves it on next tick when the frame has focus | `nav.js:65-67` | Low | S | Verify on device; add explicit focus on `.drawer .close` after render |

### Player (controls up and hidden, feed/zoom menu)
Seen: dark mesh background with the buffering skeleton (team logos, VS), top bar (Back, title, tags, Full screen), bottom bar of three rounded groups (FEED name, ZOOM - 100% +, Scores / Change game / Guide / Favorite / Multiview). Controls auto-hide after 4s (verified: only the score bar and the buffering card remain).
| Issue | Checklist | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| Control bar bottom edge at y=520/540, Back button at x=29, Full screen right edge 932: inside the 5% zone | 9 | measured bar rect [134,493,302,520] | High | S | X2: `#ptop{padding:27px 48px}`, `#pctl{bottom:27px}` |
| Control text 9-11px ("FEED", "ZOOM" 9px; button text 11px) | 7 | measured | High | S | 13px labels, 14px buttons |
| Feed button shows "Note: Starts in 568 min (1/2)": the Stremio addon's placeholder stream name is used as a feed label | 19 | screenshot | Low | - | Data issue; do not change. UI can truncate to 24 chars. |
| Hiding the controls drops focus to BODY (OK per dos-donts 6); any key re-shows and focuses `#bfeed` (`:1290`) | 18, 19 | `index.html:1286-1290`, measured activeElement BODY | - | - | pass |
| Back order: menu, controls, player (`nemBack` `:1277-1280`) | 19 | pass on Android; no web wiring | High | S | X5 |
| Zoom menu is an 11-row list with `OK` per row; opens fine, 3px ring visible | 18 | screenshot | - | - | pass |
| Buffer overlay: full-screen `filter:blur(36px)` animated | 15 | `:199` | Med | S | X8 |
| Phone: title wraps to 3 lines ("TAMPA BAY / LIGHTNING") squeezed between Back and Full screen; control bar stacks as 4 rows of 40px buttons; feed menu covers the bar | 10 | screenshot 390 | Low | S | Hide team logos and use abbreviations in the phone top bar; leave rows |
| Volume slider (web) is inserted by `shim.js` in `#ptop`: not focusable by D-pad ordering tests | 3 | `shim.js:30-37` (`keydown` stopPropagation on the range) | Low | S | none unless reported |

### Score bar + Change game
Seen: thin strip pinned to the top, one cell per game (logos, score, status), Final greyed, game being watched has a ring.
| Issue | Checklist | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| Bar is flush to the top edge: `#sbar{top:0;height:8%}` (43px at 540) | 9 | `:148`; measured top 0 | High | S | `top:27px` at 960 base, or keep it full-bleed but inset its content by 27px |
| Text: team logos about 9px, status "P2 12:34" 7-8px (`font-size` computed 9-11.7px on items, children 9px) | 7 | measured `11,11,11.76,14.89,11.76,9` | High | S | 11-12px minimum, logos 20px |
| In picker mode every cell is dimmed to .45 opacity when it is "off" (not live or no feed), including the focus ring and the current game (`.sbi.off`, measured opacity .45 with ring `inset 3px`) | 2 | measured | Med | S | Exempt `.sbi:focus` and `.sbi.cur` from the opacity (ring at full opacity) |
| In multiview the reserved 8% band (`TB`) is empty black when UI is up | 10 | `mvLayout:1047`, screenshot grid | Low | S | Collapse `TB` when the bar is not visible, or draw the bar while the UI is up |
| Fade (`transition:opacity .2s`) and the `MutationObserver` sync: transform/opacity only | 15 | `:148` | - | - | pass |

### Feed menu / pickers / popups
Seen: popup (Watch Live / Live Stats / Multiview +) as centered card with gradient; Live channel popup (Watch / Multiview + / Favorite); player Feed list; zoom list.
| Issue | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|
| Double ring on popup buttons (coral outline from `.pbtn:focus` + white shadow from `.focusable:focus`) | measured `outline:3px solid rgb(255,138,91)` and `box-shadow:0 0 0 3px #F2F0F4` on one element | Low | S | X3 |
| Popup buttons are 12-13px high text on 31px-high pills | measured `[321,385,422,416]` | Low | S | Raise to 40px high / 14px |
| Popup shows "Best feed: Stream addon" 10px; "P2 12:34" 9px | measured | Low | S | X1 |
| Popup gets focus on Watch (primary), Back via `closePop` restores the opener (`:838`) | pass | - | - | |

### Multiview (layouts + hold-OK tile menu)
Seen: 4-tile grid, Main+3, Main+2 layouts, labels "1 TSN2 - AUDIO" on each tile, audio tile white outline, selection tile red dashed outline, bottom control pill (Layout, ALL -/+, + Game, Scores, Exit), tile menu (Full screen, Zoom, Feed, Switch game, Make audio/main, Remove).
| Issue | Checklist | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|---|
| Tile menu overlaps the global control bar for tiles in the bottom row. Measured on 390x844: menu rect [95,533,295,836] over the control bar; "Remove" and "Make audio / main" hidden behind the Layout/ALL pills. Same overlap at 960 and 1920 (menu "Remove" row meets the Layout pill; screenshot). `mvMenu` only clamps to the viewport (`:1142`). | 10 | `index.html:1139-1143`; screenshots 960/1920/390 | High | S | Clamp menu bottom to `#mvb.top-8` while the bar is up: `H-h-8` -> `Math.min(H-h-8, mvb.top-h-8)`; on phone anchor the menu at top. |
| Selection and audio outlines share a tile at start (dashed red over white): hard to tell which is which | 2, 12 | screenshot 960 | Low | S | Use one ring colour for selection and a corner badge for audio (already "AUDIO" label) |
| Labels 11px with grey-black pill background; tile menu items 11px high 29px | 7, 18 | measured `Full screen:11px:29` | Med | S | 13px, 40px high |
| Phone "Main + 3" gives three 90px-wide slivers under the bar; controls overlay them | 10 | screenshot 390 | Low | S | On portrait use "Grid" only or a vertical stack (4 full-width rows exist as Grid) |
| Idle fade (3s) and `__mvLoads` guard are good; `setInterval` quality check (`:1221`) only runs in multiview | 15 | pass | - | - | |
| Bottom bar at 960: 20px from the bottom edge | 9 | screenshot | Med | S | X2 |

### Setup
Seen: M3U field + Load, favourite-team chips (32), sports toggles (rest below), channel categories editor.
| Issue | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|
| Needs typing a playlist URL and category names; no QR/pairing alternative | `index.html:1392-1394` (inputs); `desktop` shows pre-filled URL | Med | L | Pairing code or QR for the playlist URL; keep text field as fallback |
| 44 text items at 11px; page is one long scroll with 32+ chips | measured 11.0 x44 | Med | S | 12px; group chips by division |
| Gear is the only icon-only control (rule 12 allows it) but has no text label/aria-label check | 23 | `#setb` | Low | S | add `aria-label="Setup"` |
| Back: `go("home")` (`:1282`) | 19 | pass | - | - | |

### Loading skeletons
| Issue | Evidence | Sev | Effort | Fix |
|---|---|---|---|---|
| Skeletons match the final cards (Scores 8 cards, Live rows, Schedule), non-focusable (`inert`), shimmer is transform-only, 150ms delay: PASS (rule 25) | screenshots 960 | - | - | pass |
| Never ends if the request hangs (X4) | `:597,615` | Med | S | X4 |
| Skeleton sets show on first view even for cached data when `scLoaded` is 0 (Scores, Home hero stats): on the TV this is the first ~2s | screenshots | Low | S | Persist last scores/standings in `localStorage` and draw them before the fetch |
| Boot splash: ~2.2s minimum (`:1436`) | `:1436` | Low | S | X9 |
| `window.Android.load(url)` at `:1442` is called without `window.Android&&`; on a static host (no shim) the exception at boot stops the rest of the script: `pollScores`, `pollStandings`, `loadHeroData` never run, so Scores/Home show skeletons forever (reproduced during this audit). Production always has Android or the shim, so this only bites tests and any non-shim host. | 17 | `index.html:1442` | Low | S | `if(window.Android&&url)Android.load(url)` |

---

## Do now (ranked, all safe: no data/feed logic, D-pad reachability kept, no test behaviour change)

1. **Restore the focus ring on Live EPG cells.** Delete `box-shadow:none` from `main.live .pg` (`assets/index.html:385`). The only focus cue on the main Live grid is missing today. S, high.
2. **Make the focused live score card visible.** Add `.sr.lv:focus{box-shadow:inset 0 0 0 1.5px var(--coral),0 0 0 3px var(--ink)}` (`index.html:256`). S, high.
3. **Keep the tile menu off the multiview control bar.** In `mvMenu` (`index.html:1142`) clamp `top` so the menu bottom sits above `#mvb`; on narrow screens anchor at the top. Fixes the hidden "Remove / Make audio" rows on phone and the overlap on TV. S, high.
4. **Wire Back for the web build.** In `web/server/shim.js` map Escape, Backspace (outside inputs), BrowserBack, GoBack and keyCodes 4/10009/461 to `window.nemBack()`; fall through to `history.back()` when it returns false. Android untouched. S, high.
5. **Down from the tab bar on every tab.** Extend the `header` keydown (`index.html:1264`) so ArrowDown moves focus into `#m` on Home, Scores and Live too (today only guide and schedule). S, high for web/TV browsers.
6. **Raise the smallest text.** Pill/tile CSS lines `74,75,296,338-343`: 7-8px to 10-11px, `.pill .tm` to 10-11px, base `body` 11 to 12px (`:25`), Live chips 9-10 to 12px, controls/labels in the player to 13px; drop `.sp/.rec` first in tight pills. Update rule 14 to a 10px floor. M, high.
7. **Add a 48px / 27px safe area.** Introduce `--safe-x:48px;--safe-y:27px` and use them in `header`, `main`, `main.live`, `#ptop`, `#pctl`, `#sbar`, `#gd` and the guide `.wrap` (TV sizes only; phone keeps its padding). M, high.
8. **One focus-ring token, readable on every colour.** `--ring` white+dark double ring, applied to app `:focus-visible`, popup/drawer buttons, and guide `deck.css:81,130,162,260,323` (replaces coral on gold, 1.34:1). S-M, high.
9. **Never leave skeletons or empty stat tiles hanging.** Add `AbortSignal.timeout(8000)` to the two score/standings fetches, show "-" / "Stats unavailable" when loaded but empty, and a "Try again" button plus 16px message in the game drawer error (`index.html:869`). S, med.
10. **Make the score bar usable.** `#sbar` inset from the top (27px), text and logos at 11px+, and exempt `.sbi:focus`/`.cur` from the 0.45 dim (`:148`, `:162`). S, med.
11. **Drop the heavy blur.** Replace `#pbuf .mesh2` `filter:blur(36px)` with a static pre-blurred gradient and remove `backdrop-filter` on `#gp.side` (`:199,356`); delete dead rules `.pill:focus .mesh{}` and `@keyframes drift`. S, med (Onn frame rate while buffering).
12. **Guard `Android.load`.** `index.html:1442` -> `if(window.Android&&url)Android.load(url)` so a non-shim host still boots (and tests on plain static servers work). S, low but removes a boot-time exception.

Not in Do-now (need design or more work): dark theme for the guide, guide `fitOne` rework, windowing the Live list, QR/pairing for Setup, type ramp unification.
