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
