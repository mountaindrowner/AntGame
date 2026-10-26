# UNDERFOOT — Art Direction Brief for Claude Code

Goal: render **one identical scene** in several visual styles so we can pick a design language by eye. Build a single HTML page (`styles.html`, no build step, Canvas 2D or inline SVG, works on a phone in portrait) with a style switcher. Each style is a separate renderer module that draws the same scene data. Don't tune the scene per style; the whole point is that only the rendering changes.

Deliverables:
1. `styles.html` with a top bar of style tabs and a 2×2 "compare" view.
2. One renderer file per style: `render_<style>.js` exporting `draw(ctx, scene, t)`.
3. `scene.js` — the shared scene data below, as plain objects.
4. A `README` that lists, per style, the palette, type, and the "reference games" line.

Priority order (do the first four fully, the rest only if time allows): **field-guide, claymation, woodcut, vector**, then storybook, cut-paper, hd-pixel, pixel16, rubber-hose, macro.

---

## 0. The shared scene (identical in every style)

Canvas 720×480 (scale to fit width on phone; keep aspect). World units = px at 1×.

**Surface strip:** y 0–70. Ground line at y=70. One crumb at (100,60). Two workers walking at (140,60) and (300,60), the second carrying. Spider at (628,44) facing left.

**Soil:** y 70–480. Three bands: topsoil 70–220, packed 220–350, clay 350–480.

**Tunnels:** shaft x 348–372, y 70–400. Corridor A: x 120–600, y 200–222. Corridor B: x 180–540, y 330–352.

**Rooms** (x, y, w, h):
- Queen's chamber 392,130,120,84 — queen at (452,180), body length 56, facing right.
- Hatchery 190,130,120,84 — six eggs at (215,195) (235,197) (255,194) (275,196) (225,183) (262,182).
- Food store 150,266,160,84 — four piles at (175,335) (205,335) (235,335) (265,335).
- Barracks 420,266,180,84 — three majors at (450,330) (495,330) (540,330), resting.

**Workers in tunnels** (x, y, carrying): (360,150,no) (300,211,yes) (360,300,no) (250,341,yes) (500,211,no).

**Scent trail:** from the crumb along the surface to the shaft, down the shaft to corridor A, west to the hatchery door. Drawn only in styles whose section says so.

**Animation (t in seconds):** every ant's legs cycle at 6 Hz; carrying ants bob ±1 px at 3 Hz; the spider's legs twitch every 2 s; eggs pulse scale 1.00→1.04 at 0.5 Hz. Nothing else moves. This is enough to judge "alive vs static."

**Castes must read at a glance in every style.** Worker: smallest. Major: 1.4× worker, head 1.3× wider. Queen: 3× worker, abdomen dominant, with wing scars. Carrying: the held item sits in front of the head, never inside the body.

---

## 1. FIELD GUIDE (naturalist plate)

**Looks like:** a Victorian natural-history plate. Ink line and watercolor wash on cream paper, labels with leader lines, Latin names in italics.

**Reference games / media:** the Audubon and Haeckel plates; *Strange Horticulture*; *Carto*; the journal pages in *Spiritfarer*; *The Witness* puzzle sketches; the UI of *Sunless Sea*. Nearest games in tone: *Strange Horticulture*, *Dredge* (journal), *Sable* (line economy).

**Palette**
- Paper #EFE4CC, paper shadow #E3D6B8
- Ink #2B1D12 (all lines), ink wash #2B1D12 at 25–45% for hatching
- Soil wash #CDB48C (top), #BFA37A (packed), #A98B64 (clay)
- Tunnel wash #E9DCC0
- Ant body wash #5A4030; queen #6B4A32; spider #4A3528
- Food #D9B86A, water #8FB4C9, eggs = paper
- Accent (labels, rules) = ink only. No other hue.

**Line rules**
- One ink weight for contours: 1.4 px at 1×. Half weight (0.7) for interior detail and leader lines.
- Every contour passes through a hand-wobble: displacement noise, amplitude 2 px, frequency ~0.02. Apply per shape, not per frame (bake once; no jitter animation).
- Shading is **hatching**, never gradients: 35° parallel strokes, 0.9 px, 7 px apart, clipped to the shape, opacity 0.5. Second layer at 125° for the darkest third of a form.
- Stipple for soil: dots r 0.6–0.7 on a 6 px grid, opacity 0.25–0.35, two offset layers.
- Paper grain: fine fractal noise multiplied at 7% opacity over everything.

**Type**
- Display: *IM Fell English* 18 px for the plate title ("Plate IV. *Lasius niger*, the garden ant — nest in section").
- Labels: *IM Fell English* 11 px, italic for Latin and figure captions ("fig. 1  queen's chamber").
- Leader lines 0.7 px, straight, ending 3 px short of the subject.

**Environment**
- Grass line: ink line 1.6 px with short upward ticks every 9 px (length 5–11, random).
- Rooms: rounded rect r 14, double-ruled (outer 1.6, inner 0.6 at 4 px inset). Caption inside the bottom edge.
- Room "built look": store = four hatched mounds; hatchery = eggs hatched on one side; barracks = majors at rest with mandibles drawn; queen's chamber = a faint hatched floor mound.
- Border: double rule, 18 px and 22 px inset, 0.8 / 0.4 px.

**Creatures**
- Ant: three ellipses (abdomen rx 6 ry 4.2, thorax rx 3.2, head r 3.4 at worker scale), six legs as quadratic curves, two antennae. Legs are the **only** line-weight-0.7 element on the ant body.
- Queen: abdomen rx 26 ry 14 with hatching, thorax rx 9, head r 7, two short wing-scar strokes on the thorax.
- Spider: 8 legs as curved paths, body rx 13 ry 11 plus head r 7, hatched abdomen.
- No faces, no eyes, no expressions. Anatomy carries the character.

**Motion:** legs cycle by swapping two baked leg poses (A/B) at 6 Hz. No tweening. Eggs don't pulse in this style (it would read as a mistake on a plate); instead a faint hatched "hour" glyph near the hatchery ticks.

**UI (for later):** parchment sheets, engraved rule dividers, bitmap-free. The Help sheet is literally the field journal.

**Image-gen prompt (for real assets later):** "19th-century natural history plate, ink line and watercolor wash on cream paper, garden ant (Lasius niger) worker in profile, hatching for shading, no background, no text, muted sepia palette"

**Risks to check in the mockup:** does the nest read as a diagram instead of a place? Are 200 small hatched ants legible, or mud?

---

## 2. CLAYMATION (stop-motion)

**Looks like:** Aardman. Plasticine ants with fingerprints, googly eyes, foam-board sets, 12 fps with hold frames.

**Reference games / media:** *Wallace & Gromit*, *The Neverhood*, *Armikrog*, *Skullmonkeys*, *Clay Fighter*, *Harold Halibut* (set dressing), *Yoshi's Woolly World* (material honesty), *Hylics* (clay but weirder).

**Palette**
- Sky foam board #A9D3EF; grass felt #6FAE3D
- Soil clay #8F5A2F with pressed blobs #7E4E27 at 50% opacity (60–80 blobs r 6–18)
- Tunnel #3B2213, room floor #4A2C18
- Ant clay: radial gradient #5A3E2C → #1E120B (highlight at 35%,30%); queen #8A6246 → #3A2416
- Eggs #FFFAF0 → #D9C9A8; food #FFE08A → #C7901E; spider #3A2A2A
- Tag paper #FFF6DD, tag ink #5A3A1A

**Shape rules**
- Everything is rounded: tunnels r 14, rooms r 30, no right angles anywhere in the set.
- Every solid shape gets a **drop shadow** (dy 3, blur 2, black 35%) to sell the layered-set look.
- Every clay surface gets fingerprint texture: fractal noise displacement scale 4 on the shape outline (bake once) plus fine grain multiply at 12%.
- Ants are **beads**: bulbous abdomen with a white specular ellipse at 45% opacity, thorax, head, thick legs (2 px at worker scale, round caps), googly eyes (white r 1.6, pupil r 0.8 offset toward travel direction).
- Queen: same build at 3×, plus a tiny clay crown is *not* allowed (keep biology); instead give her a pearly sheen and a slower blink.

**Type**
- *Fredoka* 600, 12 px on paper tags (rotated −2°, drop shadow), 20 px title on a tilted card ("Underfoot · the nest, take 12").

**Environment "built look"**
- Store: glossy clay fruit-drops stacked; cistern (if drawn): blue clay with a white wave; barracks: three beads lined up on a felt mat; hatchery: eggs in a bottle-cap.
- Surface: felt grass strip (height 12, slightly displaced edge), one pebble.

**Motion (the whole point of this style)**
- Render at **12 fps with 2-frame holds** (so effectively 6 unique poses per second). Snap positions to a 2 px grid so motion feels stop-motion, not tweened.
- Walk: three baked leg poses cycled. Eyes blink every 3–5 s (one frame).
- Carrying bob is 2 px, snapped.
- Spider: legs "settle" one frame every 2 s.

**Pipeline note:** the mockup is 2D drawn with gradients. The real pipeline is 3D (Blender or Three.js) with a clay material (SSS-ish, matte, fingerprint normal map), rendered to sprite sheets at 8 directions × 3 poses per caste, then run in Phaser. Three.js live is possible but costs frame rate with 200+ ants.

**Image-gen prompt:** "stop-motion claymation ant, plasticine with visible fingerprints, googly eyes, Aardman style, studio lit, foam board set, 3/4 view, plain background"

**Risks:** cute can fight the colony-as-hero tone (everyone wants a close-up). Check whether 50 googly-eyed ants are charming or noisy.

---

## 3. FOLK-ART WOODCUT (papel picado / block print)

**Looks like:** a Mexican block print or Lotería card. Heavy black cuts, flat saturated fills, cream paper, decorative borders.

**Reference games / media:** *Guacamelee!* (palette and border motifs), *Grim Fandango* (folk-art ornament), *Cuphead* (ink confidence, not the rubber-hose motion), *Dicey Dungeons* (card UI), *Inscryption* (card framing), José Guadalupe Posada's broadsides, Lotería by Don Clemente.

**Palette (strict, five colors)**
- Ink #141414
- Cream #F6E7C1
- Teal #1F5E63 (soil, cool fills)
- Red #C8382B (queen's chamber, barracks, danger)
- Marigold #F2B632 (sky, food, eggs, accents)
- No gradients. No transparency except hatching patterns. Water, if shown, is teal on cream with cut wave lines.

**Line rules**
- Contour cuts 5–6 px at 1× (yes, that heavy). Interior cuts 2–3 px. Never thinner than 1.6.
- Texture is **cut pattern**, not noise: wood grain = 1.2 px wavy lines every 8 px at 50% on teal; cross-hatch = 1.6 px diagonals every 8 px; dot screens = r 2 on a 10 px grid.
- Shapes are flat and slightly chunky: corners square or barely rounded. Rooms are rectangles with a 2 px inner rule 10 px inset and a black caption bar across the bottom.
- Everything black is silhouette-first. Ants are black with one cream eye-dot each; carried food is marigold with a black cut.

**Type**
- *Rye* (or *Alfa Slab One* if Rye fails) 13 px, letter-spacing 1, uppercase in caption bars (cream on black).
- Title card: red block with black 4 px rule, *Rye* 22 px cream, letter-spacing 2 ("LA HORMIGA · UNDERFOOT"). A second card numbers the creature like a Lotería card ("No. 11  LA ARAÑA").

**Environment "built look"**
- Grass line: a black papel-picado zigzag (12 px teeth) sitting on the soil.
- Store: marigold mounds with a black cut line; barracks: majors in a row on a red field; queen: black abdomen with a marigold hatched panel and a tiny marigold crown (this is the one style where the crown is right: it's iconography, not biology).
- Border: 6 px black frame inset 8, with a dashed cream rule inside.

**Creatures**
- Silhouette ants 1.15× the base size (heavy lines need room). Legs 2.6 px. Majors 1.4× with square-ish heads.
- Spider: black with two red eye dots. The only red on a creature.
- Caterpillar (later): teal with cream segment cuts.

**Motion:** 8 fps, two-pose leg swap, no easing. Hard cuts only. Eggs don't pulse; a marigold "sun" in the sky rotates one notch per second instead.

**UI:** every sheet is a card: cream face, black 4 px frame, red title bar, marigold accents. Resource icons are cut glyphs (a seed, a drop, a bone, a stone), never emoji.

**Image-gen prompt:** "Mexican folk-art linocut print of a garden ant, heavy black ink cuts, flat colors cream teal red marigold, papel picado border, Lotería card style, no text"

**Risks:** crowds of black silhouettes can merge into blobs; check whether caste silhouettes separate at 1× and 0.6× zoom. Fine detail (eggs, piles) must stay chunky.

---

## 4. FLAT VECTOR (fallback and prototyping language)

**Looks like:** Mini Metro meets a cross-section infographic. Flat bands, rounded shapes, one accent per resource, glowing scent.

**Reference games:** *Mini Metro*, *Alto's Odyssey*, *Monument Valley* (shape discipline), *Rymdkapsel*, *Prune*, *Two Point Hospital* (readability), *Dorfromantik*.

**Palette**
- Ground #F4F1EA; soil bands #DCC7A3 / #C9AD84 / #B08A62; tunnel #3B2D22; ink #1F1A16
- Rooms: queen #7A5A8A, hatchery #8A7A46, store #9A8A42, barracks #6A4646, cistern #3A6A8A, workshop #5A5A3A
- Resources: food #F2D36B, water #7CC4EE, protein #D96B5A, stone #A9A49C
- Scent #6FD36B with a 3 px gaussian glow; alarm #E4524A

**Shape rules**
- No outlines anywhere. Shapes separate by value.
- Tunnels r 11–12, rooms r 16 with a 5 px darker inset frame (the tunnel color) and a lighter interior.
- Ants are two circles (abdomen r 5, head r 3.2 at worker scale); majors r 7.5 / 4.8; queen a 48×26 ellipse plus two circles and a gold dot above the head.
- Carried item: a resource-colored circle r 3 in front of the head.
- Scent: a 4 px line with glow along the trail path, opacity 0.8.

**Type:** *DM Sans* 500, 11 px room labels (white, 90%), 13 px HUD strip in a white 90% rounded box.

**Motion:** 60 fps, eased. Legs don't exist; ants "bounce" ±0.6 px at 6 Hz. Eggs pulse. Scent breathes opacity 0.6→0.9 at 0.5 Hz.

**Why keep it:** it's the most legible on a phone and nearly free to produce. It's what the prototype already draws. If no illustrated style wins, this one ships.

---

## 5. STORYBOOK WATERCOLOR (brief)

**Reference games:** *Spiritfarer*, *Dordogne*, *Gris*, *Wandersong*, *Ori* (soft light), picture books by Jon Klassen. 
**Palette:** warm paper #F3EAD6, soils #D9B98F → #B38A5E, tunnels #6B4A33, ants #3A2A22 with a soft round head and bead eyes; one cool accent #7FA8C9 (water), one warm #E6B85C (food). 
**Rules:** no hard outlines; edges are 1.5 px blur plus a 15% paper multiply; soft shadow under every creature; room labels hand-lettered (*Caveat* or *Patrick Hand*). Grain overlay 10%. 
**Motion:** 24 fps eased, slight squash on landing. 
**Prompt:** "children's picture book watercolor illustration of a friendly garden ant, soft edges, paper texture, warm palette, no outline" 
**Risk:** soft edges + 200 ants = mush. Test at 0.6× zoom first.

## 6. CUT-PAPER DIORAMA (brief)

**Reference games:** *Paper Mario* (TTYD), *Tearaway*, *Yoshi's Crafted World*, *Lumino City*, *Little Big Planet*. 
**Palette:** construction paper #E8D9B8 (sand), #8B5E3C (soil layers in 3 distinct paper sheets), #6DA34D felt grass, ants cut from black card #1A1613 with white paper eyes, food from orange card #F0A040. 
**Rules:** every element is a flat shape with a **1 px lighter edge on top and a 2–4 px drop shadow below** (paper thickness). Soil layers are stacked sheets with visible cut edges and slight offsets. Tunnels are cut-outs revealing a darker sheet behind. Texture: paper fiber noise 8% multiply. Fonts: *Patrick Hand* on index cards with a tape strip. 
**Motion:** 12 fps; ants pivot like paper puppets (rotation around a pin), legs are two cut strips that scissor. 
**Prompt:** "cut paper diorama of an ant colony cross-section, layered construction paper, drop shadows, craft materials, felt grass, tilt-shift photo" 
**Risk:** twee. Keep props minimal; the material does the work.

## 7. HD PIXEL-PAINTERLY (brief)

**Reference games:** *Eastward*, *Sea of Stars*, *Owlboy*, *Chained Echoes*, *Octopath* (light), *Moonlighter*. 
**Spec:** 48 px worker sprite (64 px major, 128 px queen), 4 directions, 4-frame walk; painted soil tiles 32 px with 3 variants per band; a light layer (radial gradients multiplied, warm #FFD9A0 near the surface, cool #7FA0C9 at depth); scent as additive particles. Palette ~48 colors, no pure black. 
**Prompt:** "high-detail pixel art sprite of a garden ant, 48px, 4-direction, painted shading, warm palette, transparent background" 
**Risk:** consistency across hundreds of tiles; two artists' worth of painting.

## 8. 16-BIT PIXEL (brief)

**Reference games:** *SimAnt* (SNES), *Harvest Moon* (SNES), *Terraria* (cutaway), *Stardew Valley*, *Kingdom: New Lands* (silhouettes). 
**Spec:** 16 px tiles, 16×12 px worker, 20×14 major, 40×24 queen; 32-color palette (SNES-ish): soil #8B6A3C / #6E5230 / #4E3A22, tunnel #2A1C10; 2-frame walk at 8 fps; black outlines on creatures only; no anti-aliasing; nearest-neighbor scaling 3× on phone. 
**Prompt:** "16-bit SNES style pixel art sprite sheet, garden ant, 16x12 pixels, limited palette, black outline" 
**Risk:** reads as generic retro.

## 9. RUBBER-HOSE CARTOON (brief)

**Reference games:** *Cuphead*, *A Hat in Time* (expressions), *Bendy*, *A Bug's Life* (faces), *Hotel Transylvania* (silhouettes). 
**Spec:** thick 3 px outlines, huge eyes (r 4 at worker scale!), noodle legs with no joints, squash-and-stretch on every step (scale y 0.9/1.1 at 12 fps), speed lines on dashes, onomatopoeia "CHOMP" on bites. Palette loud: ants #2B1B33 with #F2E6FF eyes, soil #A8623A, sky #7CC8FF, grass #67C23A. Font *Bangers* for shouts, *Fredoka* for UI. 
**Prompt:** "1930s rubber-hose cartoon ant, big eyes, thick ink outline, squash and stretch pose, flat colors" 
**Risk:** fights the colony-as-hero tone; everything becomes a character.

## 10. MACRO-PHOTO REALISM (brief)

**Reference games / media:** *Grounded*, *Empires of the Undergrowth* (closest to our game), BBC *Ant Mountain*, *Planet Earth* macro. 
**Spec:** Three.js, PBR ant models (~2k tris worker), SSAO, shallow DOF (tilt-shift post), real leaf-litter textures, soil as displaced mesh with a cross-section shader; scent as volumetric haze. Lighting: one warm key from the surface, cool fill at depth. UI: thin white *Inter* lower-thirds. 
**Mockup for this style:** a static render is acceptable; don't attempt it in Canvas 2D. 
**Risk:** phone frame rate at 200 ants; uncanny valley on the queen.

---

## Comparison matrix (print this at the top of the mockup page)

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

## What to judge in the mockups

1. Can you tell worker / major / queen / carrying apart at 1× and at 0.6× zoom?
2. Does the nest read as a **place** (somewhere ants live) rather than a diagram?
3. Does the scent trail read without a legend?
4. Is the spider scary, funny, or neither? (Each style has a right answer.)
5. Would you be happy looking at this for 20 hours?

## Implementation notes for Claude Code

- Keep `scene.js` dumb data. Renderers must not mutate it.
- Bake all noise/wobble once per style init; never per frame (phones).
- Use `devicePixelRatio` and `imageSmoothingEnabled=false` only for the pixel styles.
- Fonts via Google Fonts `<link>`; fall back gracefully.
- Add a "slow motion" toggle so motion style (12 fps holds vs 60 fps eased) is obvious.
- Add a 0.6× zoom toggle to test legibility.
