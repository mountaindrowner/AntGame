# Underfoot: decisions log

What changed and why, newest first. Read [`HANDOFF.md`](HANDOFF.md) for the full design of record. This log picks up where its §2.6 (art direction, Oct 26) ends.

## Oct 27: a bigger yard, in regions (build 9)

Mark: things "aren't totally to scale… the ant is either too big or everything is too small… I'd like it to be maybe twice as big." Then: "separate regions that each have their own unique challenges and benefits and rewards… each region is maybe pretty big… like a nice big backyard would be", at "a similar scope to SimAnt's map".

- **Everything is twice as big; the ant isn't.** Before, a soda can was about 5 ant-lengths across (a real one is 20 or more), and the whole yard was about 60 cm at real scale. Now the layout is written in design units and stamped at `SCALE = 2`.
  - A region is 80×80 tiles, about 6×6 phone screens. The built yard is 240×240.
  - Props are twice as tall. Loose stones are now landmarks of their own, up to 4×4 tiles.
  - The Flowerbed has about 70 flowers. The Sandbox has up to seven antlion pits, and the Spigot has four puddles.
  - Ants, the spider, the caterpillar, the nest mound and the trodden patch around it stay the same size, because they're ant-scale.
- **Nine regions.** Today's nine areas are now regions. Each has a danger, a find and a prize, shown on its card on the new yard map. The walk between regions is seamless (a banner names each one).
  - **Rejected:** separate maps with a loading step at each edge. That would need an off-screen summary sim for the colony's own economy, which is a big risk for little gain while the whole yard fits in one sim. It will be needed once the yard is much bigger.
- **The yard map, at SimAnt scope.** A Map button shows the whole backyard: 72 regions on a 10×8 grid, with the house along the top. The built nine sit in the middle and open a card when tapped. The other zones come from the yard sketch (vegetable garden, great lawn, the Oak, the fire ant mound and so on) and are named but greyed out until built.
- **Edges.** The fences are gone, since the built nine sit in the middle of the yard. A thicket of tall weeds closes off the unbuilt yard on three sides, with overgrown ground beyond it out to the fog. The house wall is still north.
- **Pace.** Trips are twice as long, so ants and creatures move 1.4× faster on the surface (real ants cover 10+ body-lengths a second). Food per region is about 1.5–2× (rate, cap, start), and other distances were scaled to match:
  - Forager range: 48–100 tiles.
  - Food sense: 7 tiles.
  - Explore timeout: 60 s.
  - Rival range: 64 tiles.
  - Spider legs: 15–70 tiles. It now rests 30–70 s at its web and goes home more often.
  - The mower sweeps at 4 tiles/s.
- **Bug found by the bot.** Ants only picked up food if they were within 2 px of it at the start of a tick. At the faster speed they often stepped straight past that window and circled food forever. The first bot runs starved, and the rival colony died out. Fixed: the window is now 2 px plus one tick's step.
- **Frame rate.** At first, landmarks, rocks and grass were each merged into one yard-wide mesh, so the whole yard was drawn every frame (24 fps in headless Chromium, down from 38). Now they're merged in 40-tile blocks and the ground in region tiles, so off-screen blocks are culled (about 41 fps). The scent overlay only updates the tiles near the camera.
- **Bot results** (30-minute runs, compared with build 8):
  - Sensible play won once (10:31), lost once (raiders killed the queen at 18:37), and grew to 40–60 ants without winning twice.
  - Build 8 won all four of those seeds, in 13–31 minutes.
  - Idle and cheese play survive. The rival raids 2–7 times per game.
  - It's a little harder, mostly because the rival nest is twice as far away. That's in line with "a fight to survive", so it stays as is for now.
- **The opening film** now places its shots relative to the entrance, the web and the rival crack, so it follows the yard at any scale.
- **Saves:** format v7, under the key `underfoot-v8`. Build 8 saves don't load (the yard changed).
- **Next:** claiming regions and their rewards, supply lines, and opening more of the yard (see `docs/YARD.md`).

## Oct 27: a leg in the shoe, and no hole before the dig (build 8.4)

Mark: "Obviously, a leg and jeans connected to that shoe. And there's already an ant mound hole. Maybe it shouldn't be there until she digs."
- **The sneaker has a leg:** a white sock, then blue jeans with orange seams and a rolled cuff, running up out of frame.
- **No entrance until the queen digs, in the game too.** Our mound and hole are hidden until the queen is placed and founds the nest. Rival nests are unaffected.
- **The film lands her where the game puts her.** The queen now descends onto the actual entrance tile and digs there, so the hole she makes in the film is the hole you play with. The shots and the stomp mark moved to match.

## Oct 27: opening film, second cut (build 8.3)

Mark loved it and asked for four changes. All are done:
- **A funky beat:** "Boom, ta boom, boom, boom, boom."
  - A two-bar loop at 104 BPM: kick and snare on eighths in exactly that pattern, closed hats on sixteenths with an open hat at the end of the bar, and a plucky slap bass following the kicks around E minor pentatonic.
  - It stops dead with a record scratch when the spider appears, picks back up after, cuts to silence as the sneaker's shadow spreads, and returns after the stomp.
- **The shoe looks like a shoe:** a red canvas high-top.
  - Footprint-shaped sole with toe spring, a dark rubber outsole and white midsole.
  - White rubber toe cap, a canvas upper rising to a padded ankle collar with the opening visible.
  - A tongue with criss-cross laces, a side stripe and a heel tab.
- **The UFO sound starts earlier:** a flying-saucer warble (two wobbling tones sliding down) from 0.2 s, the theremin from 1 s, and the fleet in sight from the first card.
- **The queens flew in backwards:** they were turned away from the camera. They now fly nose-first, and the one that descends faces the rock.

## Oct 27: the opening film (build 8.2)

Mark: "a really interesting cinematic intro… kind of comedic… evoking Mars Attacks… zany… film that with the graphics we have."

- **What it is:** a 50-second, 1950s-style alien-invasion short in the spirit of the campy B-movies Mars Attacks spoofed. The gags and cards are original, nothing lifted from the film. It plays in the game engine over the real yard, letterboxed, with flickering film grain, title cards slammed in with a wobble (Bungee and Bungee Shade from Google Fonts, falling back to Impact), and a dusk sky.
- **The beats:**
  1. "From beyond the picket fence…"
  2. A V of winged queens swoops out of the dusk: "They came from the sky!"
  3. One rides a tractor beam down and crash-lands by the rock, with a slide whistle, a boing and dust: "…one of them landed. Sort of."
  4. Her wings pop off like a cheap costume: "She had no wings. No home. And one good idea."
  5. Five pavement ants on the Patio do a synchronised double-take, and one is late: "The locals were not impressed."
  6. The spider turns slowly to camera and its eyes glint: "Something hungry noticed."
  7. A shadow, then a giant red sneaker stomps down beside her and walks off: "And something enormous didn't notice at all."
  8. She digs like mad and vanishes: "So she did what any sensible queen would do…"
  9. The title, "UNDERFOOT!", then "Tap to dig" starts the game.
- **Sound:** synthesised with WebAudio, so there are no audio files: a wobbly theremin score, a slide whistle, a boing, pops, a low menacing swell for the spider, a stomp, digging scratches and a brassy title stinger. A "Roll the film" poster provides the tap browsers need before they play sound. Sound and Skip buttons stay on screen throughout.
- **When it plays:** once, at the start of a player's first colony. Reset doesn't replay it; Help has "Watch the opening film again".
- **Code:**
  - `game/src/intro/cinematic.js`: the shot list, cards, actors and timeline. It borrows the surface view's scene and adds its own camera and props.
  - `game/src/intro/sound.js`: the synthesiser.
  - Cards and the title animate from the film's clock, not CSS timers, so a frame-by-frame recording matches live play.
- **Recording:** `node scripts/film.mjs [dir]` steps the film exactly 1/25 s per frame in headless Chromium, renders the score offline, and muxes both into `underfoot-opening.mp4`, in perfect sync.

## Oct 26: one continuous backyard, and a sketch of the whole yard (build 8.1)

Mark: the areas are "patchy": stark lines between them, left to right and top to bottom. It should look like a natural backyard, one continuous space. He also asked for a flat 2D sketch of the whole yard, with today's map as about 10% of it, sketched but not built.

- **Ground is one continuous yard.** Before, each 40×40 area painted its own ground, so neighbours met at a seam. Now:
  - The whole yard shares one grass-and-dirt base.
  - Each feature blends in around its own landmarks with soft, noisy edges: mulch around flowers and strawberries, sawdust around logs, mud around the tap, hose and puddles, dark soil around the compost, bare dirt around our entrance and the rock.
  - The Lawn's mowed stripes fade toward its edges.
  - Only man-made edges are sharp: the patio slabs, the sandbox frame, the blanket.
  - Grass tufts follow the same blend instead of area lines.

  The sim's areas are unchanged: they still decide food, hazards and names.
- **The whole-yard sketch** is a Design canvas, "Underfoot Yard Map" (claude.ai). Every region is a separate shape, so it can be dragged around. Today's map is the dashed square, about 120×120 tiles of a roughly 400×380-tile yard.

  The new regions:
  - **Along the house:** the porch and back steps, and the grill and table.
  - **West side:** the side yard and gate, the trash cans, the vegetable garden.
  - **South-west:** the garden shed and the wild corner.
  - **South:** the great lawn, with the swing set, kiddie pool, birdbath and bird feeder.
  - **East and south-east:** the rock garden, the hedge row, the Oak, the leaf pile, the low wet strip, and the fire ant mound in the far corner.

  Rival colonies follow the handoff's ladder: pavement ants (Patio, built), odorous house ants (trash cans), Argentine ants (vegetable garden), carpenter ants (the Oak), and fire ants (the mound, the finale). Not built; for Mark to rework.

## Oct 26: the fight to survive, and the 3×3 yard (build 8)

Mark: "We have to add difficulty… depth. The colony is striving to survive. It's a fight. And the player choices are the things that actively fight that off." He also asked for the eight areas around our start, all on one map, with ours in the middle. The direction is written up in `docs/DEPTH.md`, the yard in `docs/YARD.md`.

**The yard is one 120×120-tile map** (`game/src/sim/yard.js`, drawn by `yardScenery.js`): nine 40×40 areas, home in the middle.
- **Patio:** the rival pavement ants.
- **Flowerbed:** the spider's web.
- **Woodpile:** dead bugs, a protein source.
- **Spigot:** puddles that never dry.
- **Compost:** apple cores, the richest food.
- **Sandbox:** treats and antlion pits.
- **Lawn:** seeds and the mower.
- **Picnic blanket:** crumbs and treats.

Each area has its own ground, landmarks, food table and regrowth rate. A brick wall closes the north side and a fence the rest.

**Slice 1, "the fight":**
- **Food near home runs out.** Home regrows 1.2 items a minute, and the store starts at 10. Foragers' range grows with the colony, and past it they follow your trails. Your trails are how the colony reaches far, rich ground.
- **Fighters eat protein:** half a unit a minute each, and they starve without it. Hunts and Woodpile bugs now matter.
- **Raids grow and can kill the queen.**
  - They start at 6:00 with 3 soldiers and add one every 2.5 minutes.
  - Unguarded raiders get into the nest and wound the queen (100 hp, healing 6 a minute).
  - If she dies, the colony is lost.
  - Soldiers patrolling the door turn raids away.
- **Sieges are real battles.**
  - Only fighters count, and Recruit calls fighters first.
  - Eight fighters must hold the rival's door until their queen falls: 1,000 hp, healing 3 a second.
  - Their soldiers come out to defend and fight harder at home.
  - Their army is up to a third of their ants.
- **Treats need a crew you lead:** 6–8 ants. Press Lift; the crew sets the pace, and too few drops it. If the store is full, the excess is wasted.
- **Your ant walks around rocks.** Taps use pathfinding. This was the biggest feel complaint from the last playtest.
- **Hazards:**
  - The mower sweeps the whole Lawn every 4–6 minutes after a warning.
  - Antlion pits pull ants in.
  - The spider walks on paths, rests at its web, passes the nest every few legs (never camping the entrance), and sometimes goes over the fence.
- **Feedback:**
  - Area names appear as you cross into them, with a description the first time.
  - The HUD shows queen and rival-queen health.
  - Explainer cards for raids on the queen, starving soldiers, the mower, starvation and losing.
  - Messages fade after 10 seconds.
- **Saves:** the save format is v6 and the key is `underfoot-v7`. Older colonies can't load and start fresh.

**Playtest results** (`scripts/playtest.mjs`; final round, 30–45 simulated minutes per run):

| Strategy | Result |
|---|---|
| Sensible (4 seeds) | Won at 12:53, 14:15, 22:54, 31:21. Every run had at least one crisis: starvation (4–45 ants), raids on the queen (down to 77–84 hp), the mower (up to 7 ants), the spider. Each run lifted 2–6 treats and made 2–5 hunts. |
| Forager rush | Can't win; no win in 30 minutes. In build 7.5 it won at 7:00–11:00. |
| Hands-off | Stalls at 20 ants. Raids wear the queen down to 39 hp by 25:00. |

The bot reacts instantly, so the fastest wins (about 13 minutes) are faster than a person will manage.

**Known issues:**
- The rival's economy is fragile: in some runs it collapses to 0 ants without being attacked.
- The bot's soldiers-first build order never builds a Barracks; that's a bot bug, not the game.
- In software rendering the yard costs some frame rate: 33–48 fps, against 44–60 before. Needs a real phone.

## Oct 26: first full playtest (build 7.5)

Mark asked for a few gameplay loops: how it plays, how it feels, how far you get.

**How it was played:**
- **`game/scripts/playtest.mjs`:** a bot that plays only through the UI's actions (tap to walk, Pick up, Recruit, the queen sheet, digs, the catalog). It ran 20–45 minutes per style: sensible, military-first, a forager rush on the rival nest, and idle.
- **A real-time phone-size browser session:** about 4.5 minutes per run, playing with real taps.

**How far it goes (sensible play):**
- First food at 0:23.
- 10 ants at about 3:30.
- All six rooms and the 60-ant cap by about 10:00.
- The rival queen dies between 30:00 and 37:00.

**Regressions from build 7.3, fixed:**
- **The roaming spider massacred the colony.** It killed 42–61 ants per 20 minutes; build 7.2 lost 0–6. It patrolled 4.5 tiles from the nest, where foragers are, and lone guards charged it.
  - It now walks past at 7.5 tiles and doesn't hunt on the way unless an ant walks into it.
  - The nest exclusion is back to 6 tiles and its reach to 1.1 tiles.
  - Guards only attack it as a crew of five or more; recruited and led ants still fight.
  - For the first four minutes it keeps 12 tiles away.

  Result: 0–11 deaths per 20 minutes.
- **The opening.**
  - In the browser the spider killed the player 33 seconds after hatching, before any warning, because the warning card waited for the intro to end. It can now show during the intro.
  - A treat card interrupted the intro before the first hatch. Treats now wait three minutes.

**Small bugs, fixed:**
- **Rooms that cost more food than the cap** (Barracks 30, Workshop 25, against a cap of 20) showed "short on: 30 food" forever. A military-first run sat at 20 ants and 0 rooms for 35 minutes. The catalog now says "needs a Food store first (food cap 20)".
- **Foragers stopped fetching stone at 30, but the last queen upgrade needs 40.** They now fetch enough for the next upgrade.

**Found, not fixed (for Mark):**
1. **Tap-to-walk has no pathfinding.** Tap past a rock and your ant walks into it and stops. This is the biggest feel problem in hands-on play.
2. **You can win with zero soldiers.** The siege counts any recruited follower, so 7–14 foragers marched onto the rival entrance win at about 7:00–11:00.
3. **A long mid-game plateau.** Everything is built and capped by about 10:00. From then until the win around 30:00 there is no new goal, and protein piles up unused (300–440).
4. **The 80-ant level starves.** After the last upgrade, upkeep outruns income: food went from 148 to 7 and stayed down.
5. **A new player ant takes over the next egg, whatever its caste.** A Builder you paid for can hatch as your Forager body instead.
6. **The first deliveries are wasted.** Food starts at the cap (20/20), so early trips add nothing until eggs use it up.

## Oct 26: a softer PS1 (build 7.4)

Mark: "I like our graphics, but they are kind of rough to look at… so it's not so hard on the eyes, so fuzzy and so abrasive." This is a small polish, not a style change.

- **Finer pixels:** 1.75 CSS px per PS1 pixel (was 2.25), about 223×482 on a phone.
- **Pixels line up with the screen:** the pixel size is rounded so each PS1 pixel covers a whole number of device pixels. Before, uneven pixel widths shimmered as things moved.
- **Half the dither grain:** dither strength is 0.5 (was 1), with 48 colour levels per channel (was 31), so banding is gentler too.
- **Calmer textures:**
  - Per-texel random speckle is halved, both on the shared texture ramps (0.35 → 0.18) and on the yard ground (0.9 → 0.4).
  - The nest soil has fewer stones, tinted from the soil instead of grey.

## Oct 26: creatures, food and the yard plan (build 7.3)

Mark asked for:
- **Spider:** about twice as big, with more detail and a walking animation. It should roam between areas, but definitely pass the nest every now and then.
- **Caterpillar:** about twice as big and long, with a fuzzy texture and a walking animation.
- **Dew:** should look like dew, not spots.
- **Food:** recognisable kinds, plus the occasional high-quality drop such as candy.
- **The yard:** start planning all of it.

What changed:
- **The spider roams.** This is a sim change.
  - It walks from landmark to landmark across the whole patch.
  - Every third leg it walks an arc 5.5 tiles from the nest. It can't come closer than 4.5 tiles (was 6).
  - After a few legs it sometimes walks off an edge "into the next area" for 40–80 s, then walks back in from a random edge with the health it left with.
  - After a death it also walks in from an edge, no longer appearing mid-map.
  - Its bite reach grew with its body (0.9 → 1.3 tiles).
- **New spider model** (`game/src/render/models/bugs.js`): a wolf spider at 2.6× scale (was 1.3×).
  - A pale stripe and speckles on the abdomen, and banded thorax and legs.
  - Eight eyes with glints, plus fangs, pedipalps and spinnerets.
  - Four-segment legs with bristles.
  - Walking is an 8-frame alternating gait, with knees solved by IK and frames advanced by distance travelled so the feet plant instead of sliding.
  - It turns smoothly, breathes when still, and lifts a foreleg now and then.
- **New caterpillar model:** a woolly bear (black–rust–black) of 10 shaggy segments, each a jittered core with pale-tipped bristles, true legs at the front and prolegs at the back.
  - The body follows the path the head took.
  - A wave of lifting, bunching segments rolls forward as it crawls.
  - It is about 75 px long (was about 40). Ants can bite it from 1.8 tiles (was 1.2).
- **Food has kinds** (`game/src/render/models/food.js`, `FOODS` in the sim):
  - **Everyday food:** bread crumb (5–10), sunflower seed (20), raspberry (10–14), popcorn (12–16). Each has its own shape and colours.
  - **Treats:** a jelly bean (40), cookie piece (35) or gummy bear (50) drops on about 1 in 16 food spawns, one at a time. Treats sparkle, and the drop raises a message and a one-time explainer.
  - Ants carry a piece of whatever they picked up.
- **Dew looks like dew:** clusters of clear, glinting beads, one hanging off a grass blade. The puddle has a lighter rim.
- **Copy:** the hints and Help no longer say "yellow crumbs" or "the green one"; they describe the new food, the fuzzy caterpillar and the roaming spider.
- **The yard plan is a draft:** `docs/YARD.md`. The specs only list the six yard areas in one line each. The draft adds:
  - a map with the house to the north and a start in the south-east corner
  - each area's look, food, creatures, hazard, mechanic and payoff
  - which creatures roam between areas
  - a food catalog and a build order

  Three questions there are for Mark.

## Oct 26: builders cost time, rounded tunnels (build 7.2)

Mark: no CRT filter, and the wobble is "maybe a little bit too jittery". He liked the rounded tunnels in the mockups. Builders "break every brick that they're in contact with", bricks break before builders reach them, and rooms start building before anyone arrives: "Make it so it costs time."

- **No CRT filter.** It is dropped from the to-do list.
- **Half the jitter.** Vertices now snap to the framebuffer's own pixel grid instead of a grid half as fine (`RENDER.snapDivisor` 2 → 1).
- **Builders work one job at a time, on site.** This is the first change to the sim since build 6. Before, every builder near any order counted toward all of them, so one ant chipped several bricks at once, and work started from 2.5 cells away. Now:
  - Each builder claims one task: a dig, a fill, a repair, or a room.
  - Each brick takes one builder; a room takes up to three, spread along its floor.
  - Work only counts once the builder is standing at the job. A dig is worked from the dug cell next to it.
  - Soil takes longer: 6, 12 and 20 builder-seconds for soft, packed and clay (was 4, 8 and 14).

  `game/tests/builders.test.js` checks all of this. It also fixes the earlier "pocket ordered all at once never finishes" quirk: a 4×3 pocket now finishes in about a minute with three builders.
- **Rounded tunnels.** The nest grid is unchanged; only the drawing is new. Each dug cell becomes a rounded box, the boxes blend into one smooth field, and marching squares (`game/src/render/geometry/contour.js`) trace its outline into extruded soil. A brick being dug grows a rounded bite from the side the builder works on, in quarters, which replaces the old square chip overlay. Rebuilding takes about 15–20 ms and only happens when a cell or a dig quarter changes.
- **Tunnels read darker.** The nest's back wall and the tunnel side walls are darker, so the rounded shapes stand out from the soil face.

## Oct 26: first phone feedback (build 7.1)

Mark, playing on his phone: the grass blinked and clipped with the nest hole; ants that aren't moving should stay still, maybe with a slight breathing animation; start giving each room its own decorations.

- **Hole flicker fixed.** The green scent overlay was drawn over the nest hole, and the near-coplanar layers (ground, scent, hole) z-fought as the vertices snapped. The hole now sits above the overlay in a fixed draw order with polygon offsets, and is wide enough to cover the mound's opening.
- **Still ants hold still.** The renderer tracks each creature's movement. An ant that hasn't moved for 0.25 s switches to a standing pose and breathes, its body swelling about 4%. Builders on a job scrape (a slow two-frame cycle) and fighters bite (a fast one). The queen and the spider breathe too.
- **Every room has its own look** (`game/src/render/models/roomDecor.js`): a painted back wall plus props that react to the colony.
  - **Queen's chamber:** a woven fungal wall, a moss bed, her shed wings pinned up as a trophy, a glow-worm lamp and a petal rug.
  - **Hatchery:** straw walls, straw bowls under the eggs, a warming stone that glows, and condensation beads.
  - **Food store:** carved seed niches that fill with stock, heaps that grow, and a sugar crystal once it is half full.
  - **Cistern:** wet stone, a pool that rises with water, a floating leaf, and drips falling from roots.
  - **Nursery:** silk walls, wriggling larvae in silk cradles, a row of pupae, and silk threads.
  - **Barracks:** tally marks on the wall, a thorn weapon rack, a beetle-husk training dummy, a leaf banner, and sleeping soldiers.
  - **Workshop:** stone-block walls, a stone workbench with a leaf on it, a twig bundle, a stone stack that grows with stone stock, and sawdust.
- Eggs now pulse gently. The dots marking where you can dig are smaller and fainter.

## Oct 26: the game starts (`game/`)

Mark: "Let's build the game starting with our file structure and then building using ps1."

- **Engine: Three.js, not Phaser 3.** The PS1 look comes from 3D-hardware quirks (vertex snapping, affine textures), which a 2D sprite engine can only fake. This overrides the handoff's Phaser 3 plan (§4.1, §5.2) and its "2D top-down; 3D later" view lock (§2.4, §5.3). Babylon.js remains a valid alternative: the renderer is isolated in `game/src/render/`, so swapping it touches nothing else.
- **Views:** the views stay what §2.4 describes, a top-down surface and a side-on nest, but both are now 3D. The surface camera sits at a PS1-style three-quarter angle. The nest is a real cutaway with tunnel depth.
- **Structure:** a Vite + ES-module project (Three.js 0.180.0, Vite 6.3.5) with the folders sim / render / ui / input / game. The handoff's "no build step" choice suited a single-file prototype; a game needs modules, tests and a production build. `npm run build` still produces a static site that publishes anywhere.
- **The sim is unchanged.** `game/src/sim/sim.js` is build 6's `sim.js`; only its export line differs. Everything else reads its state and calls its public API.
- **Crowds are instanced.** Each body plan is baked into three walk frames and drawn as instanced meshes, so `+200` ants is a few draw calls. In headless Chromium, using software rendering, 200 ants ran at about 45 fps; real phone numbers are still to come.
- **Small behaviour changes from build 6:** in-page confirmations replace `confirm()`, two stale hints are fixed, and the HUD hint no longer runs under the side buttons. `game/README.md` lists them all.
- **Tests:** `npm test` runs headless simulation tests (founding, hatching, determinism, a 200-ant stress run, save round-trip). `npm run test:e2e` plays the opening in a browser and screenshots each step.
- **Noticed while testing, not yet investigated:** in a scripted test, a 4×3 pocket ordered all at once did not finish digging in 150 simulated seconds, while the same pocket ordered row by row did. This may be a sim quirk with orders whose only neighbour is another pending order. Worth checking in play.

## Oct 26: art direction

**2D style mockups built, then set aside.** `art-direction/` renders the shared brief scene in ten 2D canvas styles, exactly as `UNDERFOOT_STYLE_BRIEF.md` specified. Mark's verdict: "none of that would work". He felt the brief's author had misunderstood, and asked for real game art styles built with Three.js instead.

**3D style exploration.** `art-direction-3d/` renders the same nest as a live Three.js diorama in ten game art styles: low-poly, toon, claymation, macro, voxel, HD-2D, bioluminescent, toy ant farm, PS1 retro and papercraft.

**PS1 retro is the favourite.** Mark: "PS1 retro is the win so far". A retro-console family was then built around it: PS1 on a CRT, N64, Sega Saturn, Haunted PS2, Nintendo DS, Quake software renderer and 1-bit dither. All share one pipeline, `art-direction-3d/retro.js`, so traits can be mixed cheaply. No final pick yet.

### Open gaps this creates (flagged, not decided)

- **Renderer vs. style.** The handoff locks a 2D top-down view (§2.4), Phaser 3 as the production renderer (§4.1, §5.2), and 3D as "a later experiment" (§5.3). The PS1 look is defined by 3D-hardware quirks: vertex snapping, affine texture swim and fog. There are three ways to keep it:
  1. Render in 3D with Babylon.js or Three.js. This keeps the real wobble, and Mark already uses Babylon.js.
  2. Pre-render PS1-style sprites and tiles and keep Phaser 3. The wobble is lost; the palette, dither and low resolution stay.
  3. Make the PS1 look a 3D isometric experiment layered over the existing sim.

  `sim.js` has no DOM, so any of these leaves the simulation intact.
- **Only the nest cutaway has been mocked.** The game spends about half its time on the top-down surface view, which no style mockup covers yet. Pick-by-eye should include a surface shot before locking a style.
- **Scale.** The mockups show about 10 ants. The target is 1,000 at 60 fps on a mid-range phone (§5.2). None of the styles have been measured on a phone.

## Prototype housekeeping (Oct 26)

- The build 6 prototype and the handoff docs are now in the repo (`prototype/`, `docs/`).
- `prototype/smoke-test.js` pointed at a sandbox path (`/mnt/user-data/outputs/…`) and a missing `sim5.js`. It now resolves both relative to itself: run `node prototype/smoke-test.js`.
- The smoke run gets through the intro, the queen menu and the build catalog. Its scripted dig taps then queue no orders, so placing the hatchery fails with "no 4×3 pocket dug yet". This is probably the script's tap coordinates rather than a game bug, but that is unconfirmed.
