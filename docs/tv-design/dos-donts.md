# TV / 10-foot UI: Do's and Don'ts for NEMTV

Researched 2026-11-11 from the sources at the bottom. Tags like [A-Layout] map to the source list. Numbers are 1080p unless stated. Android "dp" are on a 960x540 grid, so 1dp = 2 physical px at 1080p (and 1 CSS px if a page is laid out at 960x540, as the NEMTV guide is).
Items tagged [house] are not from a source: they are NEMTV working rules, kept because no source gave a number.

Not reached (blocked or errored): Netflix Tech Blog "Pass the Remote", BBC GEL TV pages, YouTube TV engineering posts, Samsung focus page. Spotify's engineering post and Smashing stand in for the focus-engineering side.

## 1. Focus & navigation
- Do make every actionable element reachable with the D-pad, with one clear up/down and left/right orientation. [Amz]
- Do show exactly one focused element at a time. [A-Focus]
- Do make focus unmistakable: a viewer who glances away and back must still know where they are. [Amz]
- Do give instant, distinct feedback on every key press. [A-Design] [Sam] [Roku]
- Do use a regular grid or rows so the nearest-neighbour move is predictable. [Sam] [Spot]
- Do mark a primary item in each group so entering the group lands on the likely choice. [Apple-Focus]
- Do keep selection state apart from focus state (focus moves, selection stays). [A-Lists] [Amz]
- Do remember the last focused item when the user returns to a row or screen. [house]
- Don't let focus land on nothing or on an off-screen/hidden element. [Roku "forgiving"] [Spot]
- Don't rely on pointer or hover. Navigation must work with four directions, select, back and exit only. [Sam]
- Don't put buttons inside a focusable list row: it blurs which thing has focus. [A-Lists]
- Don't invent per-screen exceptions: describe the UI with the fewest "always true" rules. [Roku]

## 2. Layout & safe areas
- Do design at 1920x1080 and let the platform scale. [Amz] [A-Layout] [Redspace]
- Do keep all UI and the focused item inside a 5% margin. Roku: 90px left/right, 60px top/bottom. Android: 48dp x 27dp (round to 24dp), or 58dp sides / 28dp top-bottom. [Roku] [A-Layout] [Amz]
- Do (Apple) inset primary content 60pt top and bottom and 80pt left and right. [Apple-Layout]
- Do let backgrounds and imagery run full bleed; only controls and text need the margin. [A-Layout]
- Do use 12 columns, 52dp wide with 20dp gutters, as the Android baseline. [A-Layout]
- Do show part of the next card ("peek", 20dp spacing) so rows read as scrollable. [A-Cards]
- Do give each screen one purpose. [Roku]
- Don't clip or shrink the background to the overscan box. [A-Layout]
- Don't put anything selectable or readable in the outer 5%, even though most modern panels show it all. [Amz] [Smash]
- Don't use more than 5-6 top-level destinations in a nav drawer, or let it scroll. [A-Drawer]
- Don't pile on information: bigger text forces fewer words, which is good. [Roku]

## 3. Type & legibility
- Do set body text at 14sp or more (about 28px at 1080p; 19px at 720p). [Amz]
- Do treat 24px as the starting point for TV body text, with the scale growing from there. [Smash]
- Do check against Apple's tvOS sizes: body 29pt, minimum 23pt; Callout 31, Headline 38, Title 3 48, Title 2 57, Title 1 76. [Apple-Type]
- Do pick distinct, legible fonts with large counters and sturdy stroke width. [A-Type]
- Do keep descriptions short; limit reading. [A-Design] [Amz]
- Don't go below 23px/pt anywhere, not for captions or timestamps. [Apple-Type]
- Don't use decorative or thin-stroke faces; personable fonts only at big sizes. [A-Type]
- Don't truncate heavily as sizes go up; shorten the copy instead. [Apple-Type]
- Note for NEMTV: a 960x540 page with "9px min, 11px body" is 18px/22px at 1080p. That is under Apple's 23pt floor and Amazon's 28px body. See audit checklist items 7-8 in course.md.

## 4. Colour & contrast
- Do start from a dark theme for a cinematic feel. [A-Color]
- Do use less saturated colours; cool colours (blue, purple, gray) behave better than warm reds and oranges. [Amz]
- Do keep text contrast at WCAG 4.5:1 (3:1 for large text), and 3:1 for focus rings and UI boundaries. [WCAG-Contrast] [WCAG-Focus]
- Do put a scrim under text that sits on imagery. [A-Cards] [A-Buttons] [A-Carousel]
- Don't use extreme white-on-black; very high contrast is hard on the eyes. [Redspace]
- Don't let colour alone carry selection or status in lists. [A-Lists]
- Don't trust your monitor. TVs run vivid/dynamic picture modes that boost saturation and contrast. [A-Color]
- Don't put text inside background images. [A-Carousel]

## 5. Motion
- Do keep transitions simple and clean so people can follow the change of state. [Roku "seamless"]
- Do make every transition, animation and load time fast enough to feel snappy. [Roku] [Sam]
- Do show a loading indicator when a screen or data takes noticeably long. [Sam]
- Do stop or let users pause anything that auto-moves for more than 5 seconds. [WCAG-Pause]
- Do keep focus scale to the Android steps of 1.025x, 1.05x or 1.1x (smaller for big tiles). [A-Focus]
- Don't flash more than 3 times in any second. [WCAG-Flash]
- Don't cut hard between states so the user must re-orient. [Roku]
- Don't animate layout properties on weak boxes (use transform/opacity). [house]

## 6. Video player & overlays
- Do make Play/Pause do play/pause when the remote has that key. [Apple-Video]
- Do let focus leave the UI during playback; hiding controls is the one time losing focus is fine. [Smash]
- Do put focus on the scrubber knob, not the bar, while seeking. [Smash]
- Do keep playback options (subtitles, audio, extras) in one transport/overlay layer opened by a key. [Apple-Video]
- Do send Back to close the open menu first, then hide controls, then leave the player. [house, matches A-Nav "previous destination"]
- Do auto-hide controls after a few seconds idle (about 5s is a common choice). [house]
- Don't cover the picture with permanent chrome. [Roku "invisible UI"]
- Don't make users reach the controls with a different key on every screen. [Roku]

## 7. Lists, rows, grids
- Do use horizontal rows under a vertical stack: up/down between rows, left/right inside. [Amz]
- Do show row titles and a position count ("3 of 24") for long lists. [Amz]
- Do show mini-details for the focused item (title, date, rating). [Amz]
- Do let Left from the first item reach the nav menu. [Amz]
- Do use scrims on compact image cards. [A-Cards]
- Don't use the same icon on every list item or icons with no meaning. [A-Lists]
- Don't use an icon-less nav drawer or mix icon and non-icon items. [A-Drawer]
- Don't make nav labels wrap. [A-Drawer]

## 8. Text input & search
- Do offer voice search first and keep text entry minimal. [Amz]
- Do show suggestions/completions that can be picked at any time. [Amz]
- Do use the system keyboard where the platform has one. [Amz]
- Do accept the on-screen letter grid navigated with D-pad. [Amz]
- Don't make users type: ask once, remember, or scan a QR/pairing code. [house]
- Don't build a custom keyboard with its own focus rules. [house]
- Don't gate a core action behind a sign-in typed on the remote. [Sam] (sign-in must be clear and easy)

## 9. Back button & history
- Do make Back return to the previous destination, and end at the platform Home if pressed enough. [A-Nav]
- Do make Back from deep content in a top-nav app return to the top and focus the menu; in a left-nav app focus the active menu item. [A-Nav] [Smash]
- Do keep Return, Enter and Exit working on every screen. [Sam]
- Do let Home always suspend the app and return to the launcher. [A-Nav]
- Don't gate Back with a confirmation or an infinite loop. [A-Nav]
- Don't add extra screen levels; make going in and out easy and obvious. [Sam]
- Don't swallow Back inside a modal that has no close path. [Roku "easily back up"]

## 10. Performance on weak boxes
- Do respond immediately to every key press; if the work is slow, acknowledge first. [Roku] [Sam]
- Do optimise transitions, animations and load times, as a rule. [Roku]
- Do scale images to the 1080p target instead of shipping 4K assets. [Amz]
- Do keep the focus tree small (render only visible rows). [Spot] [house]
- Don't keep big blur/backdrop filters or large shadows on every card. [house]
- Don't rebuild the whole screen on each focus move. [house]
- Test on the real box (Onn), not on the desktop. [house]

## 11. Accessibility
- Do make the focus indicator visible with sufficient contrast (3:1 against neighbours). [WCAG-Focus]
- Do keep a logical, consistent focus order. [MDN-Keyboard] [WCAG-Focus]
- Do assume a shared screen: show who is signed in and hide personal data. [A-Design] [Sam]
- Do give controls text labels, not icon only. [A-Drawer]
- Do offer captions/subtitles and audio-language selection in the player. [Apple-Video]
- Don't hide information behind hover, colour alone, or timing. [A-Lists] [WCAG-Pause]
- Don't auto-play motion without a way to stop it. [WCAG-Pause]
- Don't trigger actions on key-down with no way to cancel (except real-time actions). [MDN-Keyboard]

## Sources
- [A-Design] https://developer.android.com/design/ui/tv/guides/foundations/design-for-tv
- [A-Layout] https://developer.android.com/design/ui/tv/guides/styles/layouts
- [A-Type] https://developer.android.com/design/ui/tv/guides/styles/typography
- [A-Color] https://developer.android.com/design/ui/tv/guides/foundations/color-on-tv and https://developer.android.com/design/ui/tv/guides/styles/color-system
- [A-Focus] https://developer.android.com/design/ui/tv/guides/styles/focus-system
- [A-Nav] https://developer.android.com/design/ui/tv/guides/foundations/navigation-on-tv
- [A-Lists] https://developer.android.com/design/ui/tv/guides/components/lists
- [A-Cards] https://developer.android.com/design/ui/tv/guides/components/cards
- [A-Drawer] https://developer.android.com/design/ui/tv/guides/components/navigation-drawer
- [A-Buttons] https://developer.android.com/design/ui/tv/guides/components/buttons
- [A-Carousel] https://developer.android.com/design/ui/tv/guides/components/featured-carousel
- [Compose] https://developer.android.com/training/tv/playback/compose (use androidx.tv:tv-material for focus-ready components)
- [Apple-Layout] https://developer.apple.com/design/human-interface-guidelines/layout
- [Apple-Type] https://developer.apple.com/design/human-interface-guidelines/typography
- [Apple-Focus] https://developer.apple.com/design/human-interface-guidelines/focus-and-selection
- [Apple-Video] https://developer.apple.com/design/human-interface-guidelines/playing-video
- [Apple-Remote] https://developer.apple.com/design/human-interface-guidelines/remotes
- [Amz] https://developer.amazon.com/docs/fire-tv/design-and-user-experience-guidelines.html
- [Roku] https://developer.roku.com/docs/developer-program/design/key-design-principles.md
- [Roku-Graphics] https://developer.roku.com/dev/docs/graphics (title safe 80%, 192/106 offset at FHD; action safe 90%)
- [Sam] https://developer.samsung.com/smarttv/design/design-principles.html
- webOS safe area (20px margin): https://webostv.developer.lge.com/develop/guides/overscan
- [Smash] https://www.smashingmagazine.com/2025/09/designing-tv-principles-patterns-practical-guidance/
- [Spot] https://engineering.atspotify.com/2023/5/tv-spatial-navigation
- [Redspace] https://www.redspace.com/blog/10-beginner-tips-for-designing-tv-streaming-apps
- [MDN-Keyboard] https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Keyboard
- [WCAG-Contrast] https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- [WCAG-Focus] https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- [WCAG-Pause] https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- [WCAG-Flash] https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- CSS Spatial Navigation draft (browser-native arrow-key focus, not yet widely shipped): https://www.w3.org/TR/css-nav-1/
