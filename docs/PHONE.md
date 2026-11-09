# A phone version (plan, Nov 9)

- **Asked:** "What would it look like to make a good phone version for this? Something that fits a standard iPhone 17 screen and works well with that… see what people say online… come up with a plan." A side project while Mark playtests.
- **Means:** the same game in the iPhone's browser, ideally added to the Home Screen, that fits the screen, has fingers in mind and survives iOS's quirks. Not a separate game and not (yet) an App Store app.

## The iPhone 17

- **Screen:** 6.3", 2622×1206 px at 3×. That's 402×874 points in portrait, 874×402 in landscape. ProMotion up to 120 Hz.
- **Safe areas** (read them at runtime with `env()`; this is a single source):
  - **Portrait:** 62 pt at the top for the Dynamic Island, 34 pt at the bottom for the home bar.
  - **Landscape:** 62 pt left and right, 20 pt bottom, and 20 pt top in iOS 26.
- **Frame rate:** Safari draws pages at about 60 fps even on 120 Hz screens, and about 30 in Low Power Mode. Our 20 Hz simulation with smoothing between steps already copes with both.

## Today (screenshots at 402×874 and 874×402)

It already works better than expected. Safe-area padding at the top and bottom, page zoom turned off, keyboard hints hidden on touch, tap-to-attack, two-tap room placing, hold-to-dig and pinch-zoom are all in.

**What breaks:**

| | Portrait | Landscape |
|---|---|---|
| **Title** | fine | the logo is clipped and the last buttons are off screen (402 pt tall) |
| **Yard** | three notices stack over the top half of the view | notices cover the left half; the resource bar runs under the day clock |
| **Nest** | framed for a wide screen: the nest is a strip in the lower half under empty sky, and its labels overlap | the nest is a thin strip at the bottom |
| **Jobs sheet** | the Hold and Split buttons float over it | about 220 pt tall, so two rows show |
| **Buttons** | the 7 side buttons are 38 pt; Apple's minimum is 44 | same |
| **Notch** | — | nothing keeps the right-hand button column clear of the Dynamic Island |

**Missing iOS basics:**
- the iOS gesture blockers (`touch-action: none` on the canvas and a `gesturestart` block);
- `dvh` units;
- recovery from WebGL context loss (iOS drops the 3D context under memory pressure or after the app has been in the background);
- the iOS audio session (Web Audio is muted by the silent switch unless it's set to "playback");
- asking for persistent storage;
- a web app manifest and Home Screen icon.

## What others learned

- **Feral (Rome, Medieval II, Company of Heroes, XCOM 2 on iPhone):**
  - It had to "completely rethink" the UI for the iPhone, and players still said it was "so small… couldn't hit the correct buttons" and drained the battery.
  - What worked:
    - common commands in a row along the bottom, rarer ones tucked away;
    - the HUD sliding away while you draw or select;
    - a two-finger tap that hides the UI;
    - battery-saver and frame-rate settings.
  - Company of Heroes' double-tap-then-drag box select "fails more than works".
- **Northgard:** "a bit too small" on a phone. Separate UI and game scale settings helped, but large UI overlapped.
- **Stardew Valley:** its launch tap-to-move was "despised". The fix was a choice of control layouts.
- **Mini Metro:** landscape only, because it needs precise input.
- **Bad North:** praised. Small, readable scenes suit a phone.
- **Apple:**
  - Every tappable thing is at least 44×44 pt, and hit areas can be bigger than what's drawn.
  - Text for handheld games is 17 pt or more.
  - Controls change with the game state; unavailable ones are hidden.
  - Touch the world directly instead of using overlays.
  - Controls stay clear of the Dynamic Island and the home bar.
- **Fingers:** about 7 mm accurate at the centre of the screen and 12 mm in the corners. So fine work goes in the middle and big buttons at the edges.
- **Hover and right-click** become a long-press that shows a filling ring and acts on release. It must never be the only way to do something.
- **Sessions:** about 4–5 minutes each, 4–5 a day, on phones. Strategy players come back often, not for long.
- **iOS web:**
  - Real fullscreen exists only from the Home Screen; in iOS 26 every site added there opens without Safari's bars.
  - Orientation can't be locked.
  - The page can be killed without warning.
  - Storage can be wiped after 7 days without a visit.

(Key sources at the end.)

## The plan

**Landscape first, portrait supported.**
- The nest is wide, the crew fights want room, and every strategy port that worked leaned landscape.
- Portrait keeps working for a quick look, but nothing is designed portrait-only.
- We can't lock the orientation, so both must fit.

### P1: Fit the screen (one build)

1. **A phone layout** when the short side is under 500 pt:
   - the side column becomes 5 buttons of 44 pt (Help and Zoom move into the Menu; zoom is a pinch anyway);
   - in landscape it keeps clear of the Dynamic Island with `env(safe-area-inset-right/left)`.
2. **The top bar shrinks to the five things that matter:** food, water, meat, ants, genes. A tap opens the rest. The day clock becomes a small icon in it.
3. **Notices become one line at a time:** the newest shows for 4 s, and a tap on the 🔔 opens the feed. Shouts (queen attacked, boss) stay big but last 3 s.
4. **The nest camera fits the screen:** it frames the dug part of the nest to fill the view in either orientation, with labels only for the room you tap or the one nearest the middle.
5. **The title screen scales to fit 402 pt** (logo smaller, buttons in two columns in landscape).
6. **Sheets (Jobs, eggs, rooms) become bottom sheets:**
   - up to 80% of the height, with a grab bar to drag down;
   - the dock hides while one is open;
   - in landscape, the Evolution page and Jobs use two columns.
7. **Text is at least 15 pt for anything you read, 17 for anything you act on.** Options → **UI size**: Small / Normal / Large (the HUD already scales with a `--ui` variable).

### P2: Fingers, not a mouse (one build)

1. **Long-press for info** (a filling ring, then the card on release) replaces hover: tooltips on buttons, what an ant or creature is, a room's details. A tap still acts.
2. **A two-finger tap hides the HUD** (Rome's trick), for fights and screenshots.
3. **Dig mode is an explicit toggle on the nest dock (⛏).** While it's on, a drag paints digs; while it's off, a drag scrolls. Today it's hold-then-drag, which works but is easy to trigger by accident.
4. **Bigger targets in the world:**
   - tapping near an enemy, within about 30 pt, counts as tapping it;
   - a tap near your own ant selects it rather than walking there.
5. **The dock stays contextual (it mostly is):** 4–6 big buttons at the bottom corners, the Defend button in the middle when it matters.

### P3: iOS hardening (one build)

1. **Gestures:** `touch-action: none` on the canvas, a `gesturestart` block, `touch-action: manipulation` on buttons, and `100dvh` for the full-screen layers.
2. **WebGL context loss:** pause, rebuild the renderer's textures and targets on `webglcontextrestored`, and say "the view was reset" instead of showing a black screen.
3. **Audio:** set `navigator.audioSession.type = 'playback'` where it exists, start sound on the first tap, and resume after a phone call.
4. **Saves:** ask `navigator.storage.persist()`, autosave on `pagehide` and `visibilitychange` (both already there) and every 10 s (already). Remind people once a week to export a save if storage isn't persistent.
5. **Home Screen:** a web manifest, an icon (the ant on the rock), and the Apple meta tags. One gentle card on an iPhone in Safari: "Add Underfoot to your Home Screen to play full screen".
6. **Battery:** Options → **Battery saver** caps drawing at 30 fps; the game already renders at a low PS1 resolution, and the adaptive quality steps stay as they are. Pause the music and the sim when the page is hidden (it already stops drawing).

### P4: Short sessions (small)

- **"While you were away":** opening the game shows what happened since the last session (eggs hatched, raids, deaths). The sim is paused while closed, so it's the last session's report, kept short.
- **Goals sized for 5 minutes:** the goals board already gives three at a time; on phones it opens with the nearest one.
- **Later, if wanted:** Web Push from the Home Screen app ("your nest is under attack") needs a server. Not now.

### P5: Testing

- **The e2e test gains two phone runs** (402×874 and 874×402, touch on). They check that every visible button is at least 44 pt, nothing important overlaps the safe areas, and the title, yard, nest, Jobs and Evolution screens all fit.
- **A real iPhone pass** (only Mark can do this):
  - Safari and Home Screen;
  - the silent switch;
  - Low Power Mode;
  - a phone call mid-game;
  - leaving it in the background for an hour.

## What it would take

About **three builds** for P1–P3, one small build for P4, and the test runs alongside. No change to the simulation; it's layout, input and iOS plumbing.

**Later, if the browser version is good:** an App Store app is the same game in a native wrapper (e.g. Capacitor). It gains:
- real fullscreen and orientation lock;
- possibly 120 Hz;
- push notifications without the Home Screen step;
- saves that never expire.

It costs the $99/yr Apple developer account and review.

## Key sources

- Apple:
  - [44 pt targets](https://developer.apple.com/design/tips)
  - [WWDC26 "Make your game great with touch"](https://developer.apple.com/videos/play/wwdc2026/358/)
  - [WWDC24 on text size](https://developer.apple.com/videos/play/wwdc2024/10085/)
- WebKit:
  - [safe areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
  - [viewport units](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
  - [fast taps](https://webkit.org/blog/5610/more-responsive-tapping-on-ios/)
  - [Web Push for Home Screen apps](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- Feral:
  - [Rome's touch controls](https://www.feralinteractive.com/en/news/864/)
  - [hide-UI gesture](https://support.feralinteractive.com/en/mac-linux-games/rometw/faqs/ios_hide_ui)
  - [Medieval II mobile review](https://toucharcade.com/2022/04/12/medieval-2-total-war-mobile-review-iphone-ipad-pro-android-kingdoms-expansion-multiplayer-controls-icloud-sync/)
  - [Company of Heroes on touch](https://waywardstrategy.com/2020/09/16/some-thoughts-on-company-of-heroes-on-android)
- Other games:
  - [Northgard review](https://www.pocketgamer.com/northgard/review/)
  - [Stardew Valley mobile controls](https://wiki.stardewvalley.net/Mobile_Controls)
  - [Mini Metro on phones](https://dinopoloclub.com/2016/09/15/were-almost-in-your-pocket/)
- Touch and sessions:
  - [touch accuracy by screen position](https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php)
  - [mobile session lengths](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile)
- iPhone 17 points and safe areas: [Use Your Loaf](https://useyourloaf.com/blog/iphone-17-screen-sizes/) (single source).

---

## The deeper dive: what developers warn against and recommend (Nov 9)

Two more research passes: indie developers' admissions and players' verdicts on ports, and web-game developers on iPhone Safari.

**A caveat on Reddit:** this environment's network blocks reddit.com and most article sites (Game Developer, Medium, TouchArcade, the WebKit bug tracker, the three.js forum). So much of this comes from search-result snippets rather than whole threads, and I couldn't see upvotes. Where many sources say the same thing, that's noted.

### What players call a bad port

- **Slay the Spire is the clearest warning.** "A UI for ants"; its drag-to-play fights tap-to-read, so cards get played by accident. Its larger-text option was "not big enough".
- **Mindustry:** "building conveyors on mobile is a huge pain". Players did like that combat auto-targets.
- **Shapez:** "clunky… seems unfinished", inaccurate placement.
- **Ant games on phones** (The Ants, Pocket Ants) are known for 24-hour timers and pay-to-win raids. Empires of the Undergrowth started as a mobile idea, never shipped there, and its FAQ warns of fake mobile copies, which shows the demand.
- **What works:**
  - Rusted Warfare: macro, not micro (groups, rally points);
  - Polytopia: big buttons, never too much at once;
  - C&C4: pause as a command mode;
  - Cultist Simulator: kept pause and play;
  - Into the Breach: short fights, "every UI window had to be redone".

### What developers admit

- **"Easy" ports got too little real-device testing**, and players called them lazy.
- **Hover feedback vanished on touch** (Mini Metro). Pinch-zoom was "a pretty big breakthrough".
- **Fixed pixel sizes:** "fine on the laptop… too small on mobile". A UI-scale slider was the cheap fix.
- **Hearthstone's phone version took a year after the tablet**, all of it text readability.
- **Text-wall tutorials get skipped.** Terraria built a phone-only tutorial that teaches by doing.
- **Supporting both orientations costs about a third more layout work** (one estimate).
- **Accessibility:** every pinch or two-finger gesture needs a tap alternative, targets should be adjustable, and actions should fire on finger lift. Nothing should demand precise timing, and orders should be possible while paused.

### iPhone Safari's traps for a Three.js game

1. **Memory kills without warning.** iOS caps each tab far below the phone's RAM. Over the cap, the page is killed and reloaded with no event. iOS 26 reportedly tightened this, and 26.4 has GPU crash reports. Keep the game around 300 MB or less and save often.
2. **Rebuilding render targets or resizing the canvas has leaked on iOS.** Our adaptive quality frees and rebuilds its target at each step change.
3. **`powerPreference: 'high-performance'` ran a three.js scene at 20 fps instead of 120 on an iPhone 12** (reportedly fixed in 2024, but the advice stands). We ask for it.
4. **MSAA has had iOS-only bugs.** Our top quality step uses 4× MSAA on a half-float target. At 640×400 with hard pixel edges, it buys little.
5. **Shader compiles still block on iOS, even "async"** (no parallel linking under Metal). Expect a hitch the first time each material draws, unless every one is drawn once behind the title screen.
6. **Heat:** one scene ran at 60 fps for 30 s, then 20–25 for good. A steady 30 fps mode is the usual answer.
7. **Audio in Home Screen web apps on iOS 26** reportedly goes silent after the first launch, and contexts get stuck "interrupted" after a call. The fix that works: on return, `resume()`; if still not running, rebuild the audio graph. Our sounds are all synthesized, so that's possible.
8. **Safari and the Home Screen app keep separate storage.** A player who installs starts without their save. Our save export/import (build 76) is the bridge; the Home Screen app should offer it on its first launch.
9. **Stale builds:** a Home Screen app can keep running an old version after an update. Show the build number, and add "Update now" if we ever add offline caching.
10. **Input:**
    - The long-press magnifier and the edge swipe-back need a non-passive `touchstart` that cancels them (CSS alone doesn't).
    - Three-finger undo can't be stopped: never use three fingers.
    - `pointercancel` must count as a finger lift.
    - iOS 26 has `100dvh` gaps: size from `innerHeight` instead.
    - There's no vibration API on iPhone.
11. **itch.io and portals embed games in an iframe,** which Safari limits to 30 fps until the first tap. The title screen's tap fixes that.
12. **WebGPU on iOS 26 has been buggy, and a wrapped App Store app (WKWebView) caps at 60 Hz and may be slower than Safari.** Stay on WebGL, and treat the App Store as later.

### What this changes in the plan

- **P3 (iOS hardening) moves first, and gains four items:**
  - **Renderer:** `powerPreference: 'default'`, no MSAA on phones, and the quality steps as fixed, pre-made render targets (switch between them, never free and rebuild).
  - **Shader warm-up behind the title screen:** draw every material once, including the post pass.
  - **Audio recovery on return:** resume, else rebuild the graph.
  - **Touch:** a non-passive `touchstart` on the canvas, and `pointercancel` treated as a lift.
- **P1 (fit) adds:**
  - a **UI-scale slider** (not just three sizes) and a separate **text size**;
  - **the build number in the menu**;
  - and, on the Home Screen app's first launch, **"Bring your save from Safari?"** with the export/import steps.
- **P2 (fingers) adds:**
  - **pause as a command mode:** while paused you can order the crew, queue digs and place rooms (today pausing freezes input too);
  - **inspect and act are separate taps** (Slay the Spire's lesson): the first tap on a room or tree node shows it, a confirm button acts;
  - **a tap alternative for every gesture** (+/- zoom buttons on phones);
  - **bigger boss tells on phones**, with an arrow at the screen edge when a telegraphed attack is off-screen.
- **Already right, keep it:**
  - Nothing happens while the game is closed: no offline raids or timers, which is exactly what players resent in the ant games on phones.
  - Crew orders are macro (recruit, attack, hold, split), not unit micro.
  - Your fighters now auto-dodge.
- **Sessions:** the goals board and raids already give 3–5 minute beats. A "since you were away" card is enough, with no offline progress.
- **Expect few Home Screen installs.** Most phone players will be in a Safari tab with the bars showing, so that has to be good too. Show the install card after a satisfying moment (the first room, the first guardian), not at launch.

### Sources from this pass

- **Bad ports, and what worked:**
  - [Slay the Spire on Android](https://www.androidcentral.com/slay-spire-android-game-week)
  - [Mindustry comments](https://anuke.itch.io/mindustry/comments?after=733)
  - [Into the Breach mobile interview](https://toucharcade.com/2022/08/08/into-the-breach-mobile-interview-subset-games-ftl-nintendo-switch-netflix-games-ipad-iphone/)
  - [Hearthstone on phones](https://gamesbeat.com/how-hearthstones-tech-team-tackled-making-an-online-game-that-runs-on-pc-and-mobile/)
  - [C&C4 mobile review](https://www.pocketgamer.com/command-conquer-4-tiberian-twilight/review)
  - [Polytopia's minimalism](https://mobidictum.com/christian-lovstedt-midjiwan-polytopia-minimalism/)
- **Accessibility and tutorials:**
  - [Xbox touch accessibility guideline](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)
  - [mobile tutorials that work](https://shop.smashingmagazine.com/2014/04/rethinking-mobile-tutorials-which-patterns-really-work/)
- **iPhone Safari and WebGL:**
  - [iOS memory kills](https://bugs.webkit.org/show_bug.cgi?id=300782)
  - [GPU crashes on iOS 26.4](https://developer.apple.com/forums/thread/822200)
  - [power preference slowdown](https://bugs.webkit.org/show_bug.cgi?id=276959)
  - [blocking shader compiles](https://bugs.webkit.org/show_bug.cgi?id=251514)
  - [canvas memory limits](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/)
  - [iOS 26 viewport bug](https://developer.apple.com/forums/thread/800125)
  - [separate Safari and Home Screen storage](https://bugs.webkit.org/show_bug.cgi?id=181849)
  - [Home Screen audio on iOS 26](https://forums.macrumors.com/threads/ios-26-audio-issues-in-pwa-web-apps.2466839/)
  - [debugging an iPhone without a Mac](https://github.com/HimbeersaftLP/ios-safari-remote-debug-kit)
- **Installs:**
  - [Hacker News on Home Screen installs](https://news.ycombinator.com/item?id=38913951)

## Third pass (Nov 9, my own searches)

Fetching pages is blocked in this environment beyond its allowed sites, so this is from search results only.

- **Hypemasters (a mobile RTS)** found units too small to tap with a finger, and argued that phone sessions should be about 15 minutes at most, with fewer things on screen. ([Medium](https://medium.com/hypemasters/mobile-rts-interface-the-story-of-how-hypemasters-rediscovered-the-genre-dc7fbaa5b05c))
  - **For us:** generous tap areas round ants and creatures (already in P2), and the 3–5 minute beats.
- **A common gesture split** (Construct's RTS devlog):
  - tap selects or moves;
  - one finger drags;
  - two fingers pinch.
  - **One detail worth copying:** when one of two panning fingers lifts, the other keeps panning instead of turning into a tap. Total War: Empire on touch adds tap-to-add and tap-again-to-remove for selection, and tap on empty ground to clear. ([Construct](https://www.construct.net/en/blogs/ashleys-blog-2/rts-devlog-input-gestures-1602), [Total War: Empire manual](https://r2enc.totalwar.com/en/manual/single-player/0005_enc_page_help_keyboard_shortcuts))
- **Direct touch beats camera-mediated control** (Human: Fall Flat on mobile). **A "Reset view" button** came out of playtest complaints about the camera (Preserve). ([Game Developer](https://gamedeveloper.com/design/designing-touch-controls-for-human-fall-flat), [Preserve](https://yani-kara.super.site/released-games/preserve))
  - **For us:** a "back to my ant" button on phones (re-centre and reset the zoom).
- **Orientation** ([WCAG 1.3.4](https://alphagov.github.io/guide-to-wcag/sc/1.3.4.html), [Godot forum](https://forum.godotengine.org/t/supporting-portrait-and-landscape-modes-on-web/88685)):
  - Accessibility guidance says don't lock it. People play in portrait one-handed on a bus and landscape on a sofa.
  - A "rotate your phone" screen is poor when the phone's rotation lock is on, and traps people.
  - Resize on every rotation, not just at load.
  - **For us:** both orientations work (as planned), and nothing ever demands a rotation.
- **Pixel fonts** look sharp only at whole multiples of the size they were drawn for.
  - **For us:** our pixel display fonts (the headers) should snap to whole steps on phones rather than scale freely.
  - Anything you must read stays in the plain rounded font, at 15–17 pt.
- **Home Screen web apps still work in the EU.** Apple removed them there in iOS 17.4's beta (February 2024) and reversed that before release. ([TrustedReviews](https://www.trustedreviews.com/news/iphone-web-apps-to-survive-in-ios-17-4-after-all-4430392))
- **The install card:**
  - iOS has no install prompt to call, so the card has to show the actual Share button and the steps.
  - The advice is to show it after the player has engaged, and to measure when it works best (after the tutorial, or on a second visit). ([install prompts for games](https://abratabia.com/pwa-games/install-prompts.php))
- **Anti-aliasing:** a second report of an iPhone 12 at about 20 fps with it on and 120 off. Confirms dropping MSAA on phones. ([WebKit 276959](https://bugs.webkit.org/show_bug.cgi?id=276959))

**Added to the plan:**
- **P2:**
  - a "back to my ant" button;
  - a lifted finger never becomes a tap mid-pan;
  - tap-to-add and tap-again-to-remove when picking crew by hand.
- **P1:** pixel headers snap to whole sizes on phones.
