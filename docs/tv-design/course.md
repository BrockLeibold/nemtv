# TV app design for NEMTV: a short self-taught course

Nine lessons, about 20 minutes each. Rules come from dos-donts.md (same folder); source tags like [A-Layout] are listed there. Rule: when a number is quoted it is 1080p unless stated. NEMTV's guide is laid out at 960x540 CSS px, so multiply by 2 for 1080p.

## Lesson 1. The 10-foot screen
- Principle: design for a lean-back viewer about 3 m (10 ft) away with a remote, not for a hand on a phone. [A-Design] [Sam] [Roku]
- Why: from 10 ft a 55-inch TV looks smaller than a phone held at 1 ft, so detail disappears and attention is low. [Roku]
- Rule of thumb: one screen, one purpose, few words, big targets.
- Checklist question: Can someone across the room say what this screen is for within 2 seconds?
- Exercise: stand 3 m from the TV, open Home, and write down every item you cannot read. Cut or enlarge each.

## Lesson 2. Focus is the cursor
- Principle: focus is the only pointer; there is always exactly one focused element and it is always obvious. [A-Focus] [Amz]
- Why: nothing else tells the viewer where they are, and they look away often. [Amz]
- Rule of thumb: combine two cues (scale 1.05x plus a bright ring or fill inversion), never colour alone. [A-Focus] [Smash]
- Checklist question: If I pause on a random frame of this screen, can I find the focus in under a second?
- Exercise: take a screenshot of every screen with focus on the first item, then on the last. Mark anything where focus is hard to find or missing.

## Lesson 3. Move predictably (D-pad geometry)
- Principle: Up/Down/Left/Right go to the nearest focusable neighbour in that direction, so layouts must be grids or rows. [Sam] [Spot]
- Why: a user can't plan a path through a ragged layout, and dead ends feel broken.
- Rule of thumb: align items in rows and columns; every item reaches every other in a few presses; no focus traps.
- Checklist question: From any item, can I reach the nav, the top of the page and the last item using only arrows?
- Exercise: write a 4-column table of Up/Down/Left/Right targets for one screen, then press the keys and fix every mismatch.

## Lesson 4. Safe areas and layout grid
- Principle: keep controls, text and the focused item inside the safe area; let backgrounds bleed. [A-Layout] [Amz]
- Why: some TVs still crop the edge (overscan), and users can set it. [Roku] [Amz]
- Rule of thumb: 5% margin: 96px left/right and 54px top/bottom at 1080p (Roku quotes 90/60; Apple 80/60). In a 960x540 page that is 48 / 27 CSS px. Use 12 columns, 52dp wide, 20dp gutters. [A-Layout] [Roku] [Apple-Layout]
- Checklist question: Does any text or focusable box touch the outer 5%?
- Exercise: overlay a 5% frame on each screenshot and list every element that crosses it.

## Lesson 5. Type you can read from the sofa
- Principle: TV type is big, plain and short. [Amz] [A-Type]
- Why: low resolution plus distance. 24px is TV's starting body size, not 16. [Smash]
- Rule of thumb: body at least 28px (14 CSS px at 960 base); nothing under 23px (11.5 CSS px); titles 48px or more. [Amz] [Apple-Type]
- Checklist question: What is the smallest text on this screen, and is it above 23px at 1080p?
- Exercise: run a script that lists every computed font-size on every screen, converts it to 1080p, and flags those under 23px.

## Lesson 6. Colour and contrast on a TV panel
- Principle: dark base, restrained colour, strong enough contrast, scrims over images. [A-Color] [Amz] [A-Cards]
- Why: TVs boost saturation and contrast, so a screen that looks fine on a laptop is garish or crushed. [Amz] [A-Color] [Redspace]
- Rule of thumb: text 4.5:1 or better against its real background; focus ring 3:1; avoid pure #FFF on #000; use cool tones for large fills. [WCAG-Contrast] [WCAG-Focus] [Redspace]
- Checklist question: Is any text on a photo without a scrim, or lighter than 4.5:1 against what's behind it?
- Exercise: pick the three busiest screens, compute contrast on screenshots over the worst part of the background, and fix with a scrim.

## Lesson 7. Motion with restraint
- Principle: motion explains state change; it never delays input. [Roku] [Sam]
- Why: weak boxes drop frames and long animations make the remote feel laggy.
- Rule of thumb: key press shows feedback in the same frame; transitions are short; animate transform/opacity only; never flash more than 3 times per second; auto-moving content over 5 s must be stoppable. [WCAG-Flash] [WCAG-Pause]
- Checklist question: Does anything run after the user presses a key that makes them wait?
- Exercise: record a video of 20 quick key presses on the real box and look for any frame where focus lags behind the press.

## Lesson 8. Rows, lists, player and overlays
- Principle: browse in rows, watch with the UI out of the way. [Amz] [Smash]
- Why: horizontal rows suit a four-way remote, and chrome on top of video hurts the picture.
- Rule of thumb: Up/Down between rows, Left/Right inside; show a peek of the next item; in the player, controls appear on a key and hide by themselves; focus can go to the scrubber. [A-Cards] [Amz] [Smash]
- Checklist question: Are the player's controls reachable with one key and gone when I stop pressing?
- Exercise: play a game, press each arrow once, and write down which control each reaches and how Back unwinds (menu, controls, player).

## Lesson 9. Back, history and text entry
- Principle: Back always goes one step back and never traps; typing is a last resort. [A-Nav] [Amz]
- Why: the remote has few keys, and typing with arrows is slow.
- Rule of thumb: Back = previous destination, then Home; no confirmation gate; prefer voice, pairing codes or pre-set lists to typing. [A-Nav] [Amz]
- Checklist question: From the deepest screen, does pressing Back N times retrace my path and finally leave the app, never looping?
- Exercise: write the Back state machine for NEMTV (player, menu, guide, tabs, home) as a table and test each row.

## Audit checklist (numbered, testable)
Run every item on all three sizes: 1920x1080 (16:9 TV), the ultrawide case and a narrow/portrait case. Take a screenshot per screen per size, open and read each one, and also read the code. Record PASS or FAIL with the screenshot name.

Focus & navigation
1. Exactly one element has focus on every screen at load, found by script (document.activeElement is visible and inside the viewport) and by eye on the screenshot.
2. Focus indicator uses at least two cues (scale or fill change plus ring/outline), and its ring has at least 3:1 contrast with its neighbours. [A-Focus] [WCAG-Focus]
3. From the first focus, arrow-key walks reach every focusable element and return, with no trap and no dead end (scripted BFS over key presses).
4. After leaving a row/screen and coming back, focus returns to the last item, not to the top. [house]
5. No focusable element sits off-screen or hidden when it is the target of a key press.
6. No button is nested inside a focusable list row. [A-Lists]

Type, layout and colour
7. No rendered text is smaller than 23px at 1080p (11.5 CSS px on a 960x540 page), measured from computed styles after any zoom. [Apple-Type]
8. Body and descriptions are at least 28px at 1080p (14 CSS px at 960 base); anything smaller is a label. [Amz]
9. Every control, text and focus box is inside the 5% safe area (96/54 px at 1080p); backgrounds may bleed. [A-Layout] [Roku]
10. Nothing is clipped, overlapped or overflowing at any of the three sizes; the page scrolls or pages instead of squeezing.
11. Text on imagery has a scrim; measured text contrast is at least 4.5:1 (3:1 for large text). [WCAG-Contrast]
12. No pure white-on-black large areas; colour is never the only signal for selected/live/error. [Redspace] [A-Lists]
13. Nav has at most 6 top-level items, all with text labels, none wrapping. [A-Drawer]

Motion and performance
14. Focus moves visibly in the same frame as the key press, on the real Onn box (video check). [Roku]
15. Only transform/opacity are animated; no animation runs longer than a few hundred ms on key press. [house]
16. Nothing flashes more than 3 times a second; any auto-moving content over 5 s can be paused. [WCAG-Flash] [WCAG-Pause]
17. A loading state appears for any wait the user could notice. [Sam]

Player & Back
18. Play/Pause key toggles playback; arrows reach the controls; controls auto-hide when idle. [Apple-Video]
19. Back unwinds in order: open menu, then controls, then player, then tab, then Home; never loops, never asks "are you sure?". [A-Nav]
20. Home exits to the launcher from anywhere. [A-Nav]
21. Every screen has a visible way out using only the remote.

Text entry & accessibility
22. Any task that needs typing has a no-typing alternative (voice, pairing code, saved choice). [Amz]
23. Controls have text labels or accessible names; icon-only controls fail. [A-Drawer]
24. Code check: no hover-only behaviour, no key-down-only actions without cancel, and focus order follows reading order. [MDN-Keyboard]
25. Code check: images are 1080p-sized, long lists render only visible rows, and no large blur/backdrop-filter on every card. [Amz] [house]
