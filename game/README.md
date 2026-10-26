# Underfoot (game)

The playable game: build 6's simulation, rendered in 3D with a PlayStation 1 look. Phone-first, portrait.

## Run it

```sh
cd game
npm install
npm run dev        # http://localhost:5173, and on your LAN for testing on a phone
npm test           # headless simulation tests (no browser)
npm run test:e2e   # builds, serves and plays the opening in headless Chromium (needs Playwright)
npm run build      # static site in dist/, deployable anywhere (relative paths)
```

On a phone: run `npm run dev`, then open the "Network" URL Vite prints from a phone on the same Wi-Fi.

## Layout

```
game/
├── index.html              page shell: canvas, HUD, bars, sheet
├── src/
│   ├── main.js             boot, shared app state, fixed-step loop, render loop, autosave
│   ├── config.js           tunables: save key, PS1 pixel size, cameras, creature scale, colours
│   ├── sim/
│   │   └── sim.js          the simulation (build 6, unchanged apart from its export). No DOM.
│   ├── game/
│   │   └── save.js         localStorage save/load (reads build 6 v5 saves)
│   ├── render/
│   │   ├── ps1/
│   │   │   ├── pipeline.js   low-res framebuffer → 15-bit dither → nearest upscale
│   │   │   ├── materials.js  Lambert + vertex snapping + affine texture mapping
│   │   │   └── textures.js   procedural nearest-filtered textures and the palette
│   │   ├── models/
│   │   │   ├── creatures.js  low-poly ants (3 walk frames per body plan), spider, caterpillar
│   │   │   ├── crowd.js      instanced batches: hundreds of ants in a few draw calls
│   │   │   ├── props.js      items, eggs and furniture primitives
│   │   │   └── roomDecor.js  each room's wall pattern and live decorations
│   │   ├── motion.js         moving vs still creatures (idle breathing, scraping, biting)
│   │   └── views/
│   │       ├── surfaceView.js  the yard: tilted top-down, scent overlay, weather
│   │       └── nestView.js     the cutaway: soil rebuilt from nest cells, rooms, orders, queen
│   ├── ui/
│   │   ├── ui.js           HUD, hints, queen and build sheets, explainers, intro, buttons
│   │   ├── copy.js         every player-facing string (verbatim from build 6)
│   │   ├── labels.js       crisp room and band labels over the 3D frame
│   │   └── ui.css
│   └── input/
│       └── pointer.js      tap, hold to walk, pinch, drag; raycasts into the active view
├── tests/sim.test.js       node:test checks on the sim
└── scripts/e2e.mjs         browser playthrough with screenshots
```

### Rules that keep it maintainable

- **The sim never imports the renderer, the UI or the DOM.** Views read sim state and never write it. Input and UI change state only through the sim's public API (`queueEgg`, `toggleDigOrder`, `queueRoom`, …) or the player fields build 6 already used (`tx/ty`, `ntx/nty`, `mark`, `holding`).
- **Adding a room or caste:** add it in `sim.js` (`ROOMS`/`CASTES` and their effects) and its copy in `ui/copy.js`. Rooms then get a wall pattern and props in `render/models/roomDecor.js` (`WALLS` and `DRESS`); castes get a colour in `config.js` (`COLORS`).
- **Tuning the look** is all in `config.js`: `RENDER.pixelSize` (chunkier or finer pixels), `snapDivisor` (more or less wobble), `colorLevels` (dither depth), `animFps`, plus the camera and creature-scale settings.

## How the PS1 look is made

1. **Low resolution.** The canvas is the framebuffer, at the CSS size divided by `pixelSize` (2.25 by default, about 173×375 on a phone). The browser upscales it with `image-rendering: pixelated`. This is the look and also the cheapest thing a phone can draw.
2. **Vertex snapping.** Every material rounds clip-space positions to a grid half the framebuffer's resolution, so polygons wobble as the camera moves.
3. **Affine textures.** UVs interpolate without perspective correction, so 16–32 px textures swim across big faces.
4. **15-bit colour.** One post pass converts to sRGB and quantises to 32 levels per channel with a 4×4 Bayer dither.
5. **Stepped animation.** Walk cycles have three baked frames advanced at 10 fps; the camera and simulation stay smooth.

## Differences from build 6

- **Rendering:** Canvas 2D is replaced by the 3D PS1 renderer. The surface is a three-quarter top-down view; the nest is a side cutaway with real tunnel depth. The sim, controls, sheets, intro and explainers are the same.
- **No browser dialogs:** `confirm()` dialogs (Reset, Remove room) became in-page sheets, because some hosts block browser dialogs.
- **Copy:** two stale hints that still mentioned build 4's fixed room slots now point to the Build catalog.
- **Layout:** the HUD hint no longer runs under the right-hand buttons.
- **Desktop:** the mouse wheel zooms.
- **Saves:** the save key is now `underfoot-v6`; v5 saves from build 6 still load.

## Not done yet

- A CRT filter option, which the art-direction mockups already include.
- A PS1-styled HUD (font and panels); the HUD is still build 6's.
- Audio.
- Organic rounded tunnels.
- Level of detail for 1,000+ ants.
- Frame-rate numbers from a real phone. The `+200` button is the test, and the fps counter is in the HUD.
