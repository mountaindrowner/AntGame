# Underfoot (game)

The playable game: an ant-colony simulation rendered in 3D with a PlayStation 1 look. Phone-first, portrait. This page is the map of the code: where everything lives and the rules that keep it tidy.

## Run it

```sh
cd game
npm install
npm run dev        # http://localhost:5173, and on your LAN for testing on a phone
npm test           # headless simulation tests (node:test, no browser)
npm run lint       # catches mistakes (undefined names, duplicate keys, leftovers); not a style checker
npm run test:e2e   # builds, serves and plays the opening in headless Chromium (needs Playwright)
npm run build      # static site in dist/, deployable anywhere (relative paths)
npm run playtest -- sensible 7 40   # a bot plays 40 minutes through the UI's actions and reports milestones
npm run gallery    # every model on a turntable (gallery.html)
npm run models     # writes each model as a .glb (assets/models/) for Blender or any 3D viewer
npm run film -- out/         # records the opening film to out/underfoot-opening.mp4 (needs ffmpeg)
npm run itch-art   # the itch.io page art (docs/itch/)
```

On a phone: run `npm run dev`, then open the "Network" URL Vite prints from a phone on the same Wi-Fi. Add `?debug` to the address for test tools (the Help page's +200 ants button).

## Layout

```
game/
├── index.html               page shell: canvas, HUD, bars, sheet
├── gallery.html             the model gallery (src/gallery.js)
├── src/
│   ├── main.js              boot, shared app state, fixed-step loop, render loop, autosave, the map photo
│   ├── config.js            tunables: save key, PS1 look, cameras, creature scale, colours
│   ├── sim/                 the simulation. No DOM, no renderer (see "The simulation" below)
│   ├── game/save.js         localStorage save and load, backups, a save set aside if it won't load
│   ├── render/
│   │   ├── ps1/             pipeline.js (low-res framebuffer, colour quantising, dither), materials.js
│   │   │                    (vertex snapping), textures.js (procedural textures, the palette)
│   │   ├── views/           surfaceView.js (the yard: creatures, items, weather), bosses/ (one file per
│   │   │                    boss: how it's drawn each frame), surfaceKit.js (helpers they share),
│   │   │                    yardScenery.js (each region's ground and landmarks, built as you come near),
│   │   │                    nestView.js (the cutaway: tunnels, rooms, orders, the queen)
│   │   ├── models/          low-poly geometry, one file per family: creatures (ants), bugs (spider,
│   │   │                    caterpillar), critters, bird, toad, bosses (guardians), wildBosses (the wild
│   │   │                    bosses, the Sinkhole pit), food, props, nestProps, roomDecor, underground,
│   │   │                    house, sneaker, curios, shadows, crowd (instanced batches), sinkhole (the pit).
│   │   │                    kit.js holds the tools they're built with: paint, blob, strut, bake (the Lean
│   │   │                    style, build 64) and paintFacets, bakeFacets (the world's faceted style);
│   │   │                    lowpoly.js is three.js with every rounded shape capped to a few segments
│   │   ├── geometry/contour.js   marching squares: a field → smooth outlines → THREE.Shapes
│   │   ├── motion.js        moving vs still creatures (idle breathing, scraping, biting)
│   │   └── dispose.js       freeing a subtree's GPU memory
│   ├── ui/                  ui.js (HUD, bars, sheets, explainers, intro), copy.js (player-facing text),
│   │                        evolveView.js (the Evolution book), mapView.js (the yard map), callout.js (tap
│   │                        a thing for its card), title.js (title screen, menu, options), labels.js,
│   │                        icons.js, ui.css, themes.css
│   ├── audio/               sfx.js (synthesized sounds, docs/SOUND.md), watch.js (what plays when),
│   │                        music.js (five layers mixed by mood)
│   ├── intro/               cinematic.js (the opening film), sound.js (its score)
│   ├── input/pointer.js     tap, hold to walk, pinch, drag; raycasts into the active view
│   └── gallery.js           the model gallery page
├── tests/                   node:test checks on the sim, one file per topic
├── scripts/                 e2e.mjs, playtest.mjs, film.mjs, itch-art.mjs, export-models.mjs
└── assets/models/           the .glb exports (npm run models)
```

## The simulation (`src/sim/`)

`sim.js` gathers the modules below into one `SIM` object; everything outside `sim/` uses only that (`import SIM from './sim/sim.js'`).

| Module | What it holds |
|---|---|
| `core.js` | The fixed tables: map and nest sizes, soil, nest sections, castes, rival colonies, rooms, foods, forage and queen levels. Imports no other sim module, so anything can read it while the modules load. |
| `yard.js` | The yard: 70 regions, their layouts, landmarks, food tables, hazards, nest sites. Data only. |
| `growth.js` | Data the sim and UI share: ant upgrades, ranks, the evolution tree, outposts' prizes, goals, zones. |
| `state.js` | A new game: `create()`, a colony's starting state, sleeping rivals. |
| `tick.js` | The main `tick()`, and day and night. |
| `world.js` | The surface: building the world, fog of war, spawning, items on the ground, walking, pathfinding. |
| `nest.js` | The cutaway: digging, rooms, fill orders, nest sections, glowrock, builders, rain and cave-ins. |
| `colony.js` | Running a colony: deposits, deaths, costs, the colony tick (food, water, eggs, upkeep, starvation), hatching, going in and out. |
| `jobs.js` | Each kind of ant's list of duties. |
| `progress.js` | Genes, ranks and names, upgrades, evolutions, what they add up to, the goals board. |
| `outposts.js` | Outposts and held regions. |
| `daughters.js` | Daughter colonies: flights, tunnels, her rooms, her ants (real near you, numbers far away), travel. |
| `wilds.js` | The outer ring stirring, standing orders and musters, climbing the Oak, Cordyceps spores. |
| `raids.js` | Rival colonies' brains, their raids, and the raids you lead. |
| `combat.js` | Ant against ant: dice duels. |
| `player.js` | Your ant: moving, actions, your crew (attack, hold, follow), zones taken. |
| `abilities.js` | Your ant's four abilities. |
| `spider.js` | The spider and the cat. |
| `hazards.js` | The mower, antlion pits, feet and birds, fire ants. |
| `creatures.js` | Small creatures and hunters. |
| `bosses.js` | Guardians and the wild bosses: their tables and fights. |
| `events.js` | The director and events (swarm days, heatwaves, the Cordyceps outbreak). |
| `curios.js` | Lost human things hidden round the yard. |
| `commands.js` | What the UI asks for: recruit, eggs, rooms, upgrades, and the numbers it shows. |
| `saveload.js` | `serialize`, save versions and migrations, `deserialize`. |

## Rules that keep it maintainable

- **The sim never imports the renderer, the UI or the DOM.** Views read sim state and never write it. Input and the UI change state only through `SIM`'s functions (`queueEgg`, `toggleDigOrder`, `queueRoom`, …) or the player fields (`tx/ty`, `ntx/nty`, `mark`).
- **`core.js` stays pure data:** it must not import another sim module. Other modules can call each other freely, because their top-level code only declares things.
- **Anything new on an ant or the colony that must survive a reload** goes in `saveload.js` (`serialize`'s field lists). `tests/saveload.test.js` and `tests/regressions-code-audit.test.js` show how to check it.
- **Adding a model:** creatures and objects are Lean: import THREE from `./lowpoly.js` and build with `render/models/kit.js` (`paint`, `blob`, `strut`, `bake`); world pieces use plain `three` and `paintFacets`/`bakeFacets`. Build it and add it to `src/gallery.js` so it shows in the gallery and `npm run models` exports it. **A boss's look** goes in its own `render/views/bosses/<name>.js`, listed in `BOSS_VIEWS` in `surfaceView.js`.
- **Adding a room or caste:** add it to `ROOMS` or `CASTES` in `sim/core.js` (and its effects where they apply), and its text in `ui/copy.js`. Rooms then get a wall pattern and props in `render/models/roomDecor.js`; castes get a colour in `config.js` (`COLORS`).
- **The HUD shows only what's usable or known (build 62):** a button appears when it would work; a material chip once `SIM.resSeen` says the colony has met it or needs it (rules in `sim/progress.js`, `SEEN_RULES`). New buttons and materials should follow suit.
- **Before committing:** `npm run lint` and `npm test` both clean; `npm run test:e2e` after UI changes.
- **Tuning the look** is in `config.js`: `RENDER.pixelSize` (chunkier or finer pixels), `snapDivisor` (wobble), `colorLevels` and `dither` (grain), `animFps`, plus the camera and creature-scale settings.

## How the PS1 look is made

1. **Low resolution.** The canvas is the framebuffer, at the CSS size divided by `pixelSize` (1 by default, in whole device pixels; bigger on a large desktop window). The browser upscales it with `image-rendering: pixelated`.
2. **Vertex snapping.** Every material rounds clip-space positions to the framebuffer's pixel grid (`snapDivisor` 1), so polygons wobble as the camera moves.
3. **Reduced colour.** One post pass converts to sRGB and quantises to 96 levels per channel with a light 4×4 Bayer dither (`colorLevels`, `dither`; 31 and 1 give true 15-bit grain).
4. **Stepped animation.** Walk cycles are baked frames advanced at 14 fps (`animFps`); the camera and simulation stay smooth.

## Saves

The save key is `underfoot-v11` (`config.js`), with a backup a minute old (`-prev`), the map's photo (`-map`), and a save that failed to load kept aside (`-bad`). Saves from before the whole yard (v10 and earlier) can't load and are cleared on start. The format and its versions are in `sim/saveload.js`.
