# Underfoot: decisions log

What changed and why, newest first. Read [`HANDOFF.md`](HANDOFF.md) for the full design of record. This log picks up where its §2.6 (art direction, Oct 26) ends.

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
