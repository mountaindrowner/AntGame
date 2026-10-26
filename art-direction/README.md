# Underfoot: art-direction mockups

`styles.html` draws one shared scene (`scene.js`) in ten visual styles, so a design language can be picked by eye. Only the renderer changes between panels; the scene data is frozen and no renderer modifies it.

## Running it

Open `styles.html` in a browser. There is no build step. Everything is a classic `<script>`, so it also works straight from disk (`file://`). Fonts come from Google Fonts and fall back to system faces when offline.

- **Tabs** switch between single-style views and the **Compare 2×2** view. Each compare panel has its own style picker, which is remembered per browser.
- **Zoom**: *Fit* scales the scene to the column. *1×* shows one world px per CSS px. *0.6×* is the legibility test from the brief.
- **Speed**: *Normal*, *Slow ¼* (makes 12 fps holds vs 60 fps easing obvious) and *Pause*.
- The URL hash picks the view: `styles.html#woodcut`, `styles.html#compare`.

## Files

| File | What it is |
| --- | --- |
| `styles.html` | Page, comparison matrix, tabs, 2×2 compare, zoom and speed controls |
| `scene.js` | The shared scene as plain, deep-frozen data (`window.UF_SCENE`) |
| `common.js` | Registry, seeded noise, bake caches, path and hatching helpers, the shared ant skeleton |
| `render_<style>.js` | One renderer per style |

Each renderer registers itself with `UF.register(id, { meta, fps, draw(ctx, scene, t) })`. `draw` receives a context already scaled so it can work in 720×480 world units. `fps` tells the page how often the picture can change, so held frames aren't redrawn. Renderers are classic scripts rather than ES modules so the page works from `file://`. All noise, wobble, textures and creature sprites are baked once per scale and font load, never per frame.

## Scene interpretation shared by every style

The brief gives positions but not facing, so `scene.js` adds one heading per ant. Every style uses the same headings. Shaft ants climb, corridor ants walk east or west, and both surface workers head toward the nest entrance.

- Ants are drawn in profile. Castes come from one skeleton (`UF.antBody`): the worker; the major at 1.4× with a head 1.3× wider; the queen at about 3× with a dominant gaster and wing scars. A carried item sits in front of the mandibles.
- **Majors are resting**, so their legs are tucked and do not cycle. Every other ant's legs cycle.
- Corridors run through the bottom edge of every room. Room captions therefore sit at or above the room's top edge in every style.
- Only vector and HD pixel draw the scent trail, because only their brief sections ask for it.

## Styles

Order follows the brief's priority. The first four are built to their full spec. The next five follow the shorter brief specs. Macro is a placeholder, as the brief asks.

### 1. Field guide (full)
- **Reference games / media:** Audubon and Haeckel plates, *Strange Horticulture*, *Carto*, *Spiritfarer* journal pages, *The Witness* puzzle sketches, *Sunless Sea* UI. Nearest in tone: *Strange Horticulture*, *Dredge* (journal), *Sable*.
- **Palette:** paper #EFE4CC, paper shadow #E3D6B8, ink #2B1D12, soil washes #CDB48C / #BFA37A / #A98B64, tunnel wash #E9DCC0, ant #5A4030, queen #6B4A32, spider #4A3528, food #D9B86A, water #8FB4C9.
- **Type:** IM Fell English 18 px plate title; 11 px labels, italic for Latin names and figure captions.
- **Notes:** contours are 1.4 px and legs 0.7 px, with a baked hand-wobble. Hatching runs at 35°, with a 125° second layer on the darkest third. Soil is stippled on two offset grids, and paper grain is multiplied at 7%. On forms under about 15 px (ants, eggs), hatching tightens to 2–3 px apart; at 7 px they would get a single stroke. Legs swap two baked poses at 6 Hz. Eggs hold still, and a hatched hour dial by the hatchery ticks once a second.

### 2. Claymation (full)
- **Reference games / media:** *Wallace & Gromit*, *The Neverhood*, *Armikrog*, *Skullmonkeys*, *Clay Fighter*, *Harold Halibut*, *Yoshi's Woolly World*, *Hylics*.
- **Palette:** sky foam #A9D3EF, grass felt #6FAE3D, soil clay #8F5A2F, pressed blobs #7E4E27, tunnel #3B2213, room floor #4A2C18, ant #5A3E2C → #1E120B, queen #8A6246 → #3A2416, eggs #FFFAF0 → #D9C9A8, food #FFE08A → #C7901E, spider #3A2A2A, tag paper #FFF6DD, tag ink #5A3A1A.
- **Type:** Fredoka 600, 12 px on paper tags rotated −2°; 20 px title on a tilted card.
- **Notes:** runs at 12 fps on twos (six unique poses a second), with three walk poses and a 2 px carry bob. Every solid casts the set's drop shadow. The brief gives one soil colour, so the three bands are separate clay slabs in slightly different mixes, which is what makes the layered set read. A warm rim light was added to the ants because dark clay disappeared against the dark tunnels. Resting majors are half-lidded, and the queen blinks slower.

### 3. Woodcut (full)
- **Reference games / media:** *Guacamelee!*, *Grim Fandango*, *Cuphead* (ink confidence), *Dicey Dungeons*, *Inscryption*, José Guadalupe Posada's broadsides, Lotería by Don Clemente.
- **Palette (strict):** ink #141414, cream #F6E7C1, teal #1F5E63, red #C8382B, marigold #F2B632.
- **Type:** Rye (Alfa Slab One fallback), 13 px uppercase caption bars; 22 px title card "LA HORMIGA · UNDERFOOT"; Lotería card "No. 11 LA ARAÑA".
- **Notes:** the soil bands are told apart only by cut pattern: wood grain, cross-hatch and dot screen. Room captions are in Spanish to match the cards. The Lotería card sits under the spider because the title card fills the sky. Creatures carry a thin cream cut around the silhouette so black ants stay separate from black rules. Legs are splayed so they cut as chevrons. Runs at 8 fps with a two-pose swap; the sun turns one notch a second.

### 4. Flat vector (full)
- **Reference games:** *Mini Metro*, *Alto's Odyssey*, *Monument Valley*, *Rymdkapsel*, *Prune*, *Two Point Hospital*, *Dorfromantik*.
- **Palette:** ground #F4F1EA; soils #DCC7A3 / #C9AD84 / #B08A62; tunnel #3B2D22; ink #1F1A16; rooms queen #7A5A8A, hatchery #8A7A46, store #9A8A42, barracks #6A4646 (cistern #3A6A8A, workshop #5A5A3A); food #F2D36B, water #7CC4EE, protein #D96B5A, stone #A9A49C; scent #6FD36B; alarm #E4524A.
- **Type:** DM Sans 500, 11 px room labels, 13 px HUD strip.
- **Notes:** with no outlines, ink ants vanish on the dark tunnel colour. Ants therefore take the value opposite their ground: ink on the surface, cream underground. The queen has two small wing-scar cuts. The scent breathes at 0.5 Hz.

### 5. Storybook watercolour (brief)
- **Reference games:** *Spiritfarer*, *Dordogne*, *Gris*, *Wandersong*, *Ori*, Jon Klassen picture books.
- **Palette:** paper #F3EAD6, soils #D9B98F / #C6A276 / #B38A5E, tunnel #6B4A33, ant #3A2A22, water #7FA8C9, food #E6B85C, plus a sap-green #A3B37A for the grass.
- **Type:** Caveat 600 (Patrick Hand fallback).
- **Notes:** the environment gets the full 1.5 px edge blur, but creatures get only 0.6 px because a worker's legs vanish at 1.5. Ants have a faint pale halo so they hold against the tunnels. The body squashes on each leg landing at 24 fps.

### 6. Cut-paper diorama (brief)
- **Reference games:** *Paper Mario* (TTYD), *Tearaway*, *Yoshi's Crafted World*, *Lumino City*, *LittleBigPlanet*.
- **Palette:** sand #E8D9B8, soil sheets #9C6A44 / #8B5E3C / #77502F, backing #3A271A, felt #6DA34D, black card #1A1613, orange card #F0A040, index card #FBF8EF, brass split pins #C9A54A.
- **Type:** Patrick Hand on index cards with tape.
- **Notes:** runs at 12 fps; ants rock ±2.5° on a brass pin and their legs scissor. Black-card ants are low-contrast against the dark backing in the shaft. That is left visible as a risk.

### 7. HD pixel-painterly (brief)
- **Reference games:** *Eastward*, *Sea of Stars*, *Owlboy*, *Chained Echoes*, *Octopath Traveler* (light), *Moonlighter*.
- **Palette:** 55 colours with no pure black (darkest #1A1420). Key colours: topsoil #9A7448, packed #7A5A36, clay #8A5638, tunnel #2A1E1C, ant #6A4430 / #B88A64, queen #A06A44, food #E8B440, warm light #FFD9A0, cool light #7FA0C9, scent #F0FFC0.
- **Type:** none in the mockup; UI would use a bitmap font at 2× the art grid.
- **Notes:** the art grid is 1440×960 (2 art px per world px), giving a worker about 48 px long. Vector shapes are painted, lit, then snapped to the palette. Walk is four frames at 24 fps. Scent is additive sparks that flicker in place.

### 8. 16-bit pixel (brief)
- **Reference games:** *SimAnt* (SNES), *Harvest Moon* (SNES), *Terraria* (cutaway), *Stardew Valley*, *Kingdom: New Lands*.
- **Palette:** 32 colours, including soil #8B6A3C / #6E5230 / #4E3A22, tunnel #2A1C10 and outline #0E0A08.
- **Type:** hand-set 5×7 bitmap capitals; no anti-aliased text.
- **Notes:** the art grid is 360×240 (1 art px = 2 world px, about 3 device px per art px on a phone). Sprites are a 16×12 worker, 20×14 major and 40×24 queen, with black outlines on creatures only. Walk is two frames at 8 fps. A 4% egg pulse is under one art pixel, so eggs swell by one pixel instead.

### 9. Rubber-hose cartoon (brief)
- **Reference games:** *Cuphead*, *A Hat in Time*, *Bendy*, *A Bug's Life*, *Hotel Transylvania*.
- **Palette:** ant #2B1B33, eyes #F2E6FF, soil #A8623A, sky #7CC8FF, grass #67C23A, ink #140C16, plus tunnel #4A2416, title #FFD23F and food #FFB52E.
- **Type:** Bangers for the title and shouts, Fredoka 600 for the room plaques.
- **Notes:** the scene has no dashes or bites, so there are no speed lines and no "CHOMP". The only shout is a "zzz" over a sleeping major. The spider is a brow-furrowed villain.

### 10. Macro-photo realism (placeholder)
- **Reference games / media:** *Grounded*, *Empires of the Undergrowth*, BBC *Ant Mountain*, *Planet Earth* macro.
- **Palette:** warm key #FFD9A0, cool fill #7FA0C9, white lower-thirds.
- **Type:** Inter, thin white lower-thirds.
- **Notes:** the brief says not to attempt this in Canvas 2D. The panel is a camera slate over the scene's layout and lists what a Three.js build would need.

## Comparison matrix (from the brief)

| Style | Nearest games | Cost to produce | Phone legibility | Distinctiveness | Fits "biology stays real" |
| --- | --- | --- | --- | --- | --- |
| Field guide | Strange Horticulture, Dredge journal | Medium | High | High | Highest |
| Claymation | Neverhood, Armikrog, Aardman | Medium (if pre-rendered) | Medium | High | Medium |
| Woodcut | Guacamelee, Inscryption cards | Low–Medium | High | Highest | Medium |
| Vector | Mini Metro, Rymdkapsel | Lowest | Highest | Low | Low |
| Storybook | Spiritfarer, Gris | Medium | Low–Medium | Medium | Medium |
| Cut-paper | Paper Mario, Tearaway | Medium | Medium | High | Medium |
| HD pixel | Eastward, Sea of Stars | High | Medium | Medium | Medium |
| 16-bit | SNES SimAnt, Stardew | Low | Medium | Low | Low |
| Rubber-hose | Cuphead, Bug's Life | High | Medium | Medium | Low |
| Macro | Grounded, EotU | Highest | Low | Medium | High |
