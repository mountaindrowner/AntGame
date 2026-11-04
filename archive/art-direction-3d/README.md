# Underfoot: 3D art-direction mockups

`index.html` renders the same ant-nest scene as a live Three.js diorama in seventeen game art styles, with the retro-console family first, so a direction can be picked by eye. The nest, ants, spider and props all come from one shared data file, `scene.js`; only the art style changes between panels.

These replace the 2D canvas mockups in [`../art-direction/`](../art-direction/), which followed the original brief's constraints.

## Running it

Open `index.html` in a browser. There is no build step and no network requirement except Google Fonts for the page chrome: Three.js r147 and the post-processing add-ons it uses are vendored in `vendor/` (MIT, see `vendor/LICENSE`). Everything is a classic `<script>`, so it also works straight from disk.

- **Tabs** switch between single styles and the **Compare 2×2** view. Each compare panel has its own style picker.
- **Drag** any panel (or use the arrow keys on a focused panel) to tilt the camera; every panel follows, so styles stay comparable. Double-click or **Reset** to recentre; **Sway** adds a slow camera drift.
- **Zoom**: *Fit*, *1×* (one world unit per CSS px) and *0.6×* for the legibility test.
- **Speed**: *Normal*, *Slow ¼* and *Pause*, which make stepped styles (claymation, papercraft, PS1) easy to compare with smooth ones.
- The URL hash picks the view: `index.html#voxel`, `index.html#compare`.

## How it is built

| File | What it is |
| --- | --- |
| `index.html` | Page, comparison matrix, tabs, compare view, controls, render loop |
| `scene.js` | The shared scene as plain, frozen data (720×480 units, y down) |
| `core.js` | Nest geometry, ant and spider rigs, layout, camera rig, shared helpers |
| `retro.js` | Shared builder and post passes for the retro-console family |
| `style_<id>.js` | One file per art style |
| `vendor/` | Three.js r147 and the examples/js add-ons used |

- **The nest is carved, not drawn.** `core.js` turns the scene's tunnels and rooms into a signed-distance field, traces each soil band's outline with marching squares, and extrudes it into a slab. The front face sits at z = 0, and the tunnels run back to a nest wall. Styles change how the slab is simplified, wobbled, layered or voxelised, so every style shows the same nest.
- **Creatures are rigs.** `U3.makeAnt` builds an ant from body parts, with each leg pivoting at the hip for a 6 Hz tripod gait. Castes come from one spec. The major is 1.4× with a bigger head. The queen is about 2.4× with a dominant gaster and wing scars. A carried item sits in front of the mandibles. Styles pass their own part builders, so the same rig works for clay, voxel and low-poly ants. Ants in the vertical shaft climb the back wall.
- **One renderer for every panel.** The page owns a single `WebGLRenderer`, renders each visible panel in turn and copies the result into that panel's 2D canvas. Four panels therefore cost one GL context. Pixel styles render small and are upscaled nearest-neighbour. Stepped styles set `fps`, so held frames are not redrawn.

## Retro-console family

PS1 retro was the favourite, so this family explores its lineage: the same nest pushed through the hardware quirks of neighbouring consoles and eras. All eight share `retro.js`, a single builder where each era is a config. The config sets render size, vertex snapping, affine or perspective texturing, the texture filter (nearest, the N64's three-point filter, or linear), the shading model, palette, lights and a post chain (ordered dither, palette snap, 1-bit, composite video, film grain and interlace, CRT). PS1 retro itself predates the builder and keeps its own file.

### PS1 retro (`ps1`)
A lost 1998 PlayStation game: wobbling polygons, swimming textures, dithered candlelight in the tunnels and a spider you don’t want to meet.

- **Reference games:** MediEvil, Ape Escape, Spyro, Bugs Bunny: Lost in Time, Puppet Combo and Haunted PS1 indies, Lunacid
- **Rendering:** Rendered at 384×256 and upscaled nearest-neighbour. Vertices snap to a coarse screen grid, textures are 32 px and mapped affinely (they swim as the camera moves), lighting is per-vertex Lambert, and a final pass reduces colour to 15-bit with a 4×4 Bayer dither. Distance fog and candle point lights.
- **Motion:** Stepped at 20 fps like a busy PS1 frame. Legs, bob and the spider twitch all run on that clock; polygons jitter as they move.
- **Why it fits:** Nostalgic and cheap, and the low resolution hides how simple the models are. Candlelit tunnels and a red-eyed spider give the colony stakes without gore.
- **Risks:** Retro-horror is a crowded niche, and the jitter can tire some players. At 0.6× zoom workers become a few pixels.
- **Production:** Very cheap: tiny textures, low-poly models, no post beyond one shader. Runs on anything; hides placeholder art well.

### PS1 on a CRT (`ps1crt`)
The PS1 winner as it looked in 1998: through a curved tube with scanlines, an aperture grille and colour that bleeds sideways.

- **Reference games:** MediEvil, Silent Hill (1999), Haunted PS1 indies played through CRT shaders, Signalis (CRT menus), Lunacid
- **Rendering:** Identical scene and quirks to PS1 retro (384×256, vertex snap, affine textures, 15-bit dither), then a full-resolution CRT pass: barrel curvature, scanlines that follow the source rows, an RGB aperture grille, horizontal phosphor bleed, red/blue convergence error, vignette and rounded tube corners.
- **Motion:** 20 fps stepped like PS1 retro; a faint rolling hum bar drifts down the glass.
- **Why it fits:** Everything that won with PS1 retro, plus the warmth that softens the dither. Pixel noise turns into texture, so the nest feels less harsh and more nostalgic.
- **Risks:** Curvature and mask cost a little legibility on small phones; offer the CRT as a toggle rather than forcing it.
- **Production:** Free on top of PS1 retro: one extra full-screen shader. Ship it as an options-menu filter.

### N64 (`n64`)
A Rare-era Nintendo 64 platformer: soft blurry textures, candy colours and fog that swallows the edges of the world.

- **Reference games:** Banjo-Kazooie, Super Mario 64, Conker’s Bad Fur Day, Beetle Adventure Racing, Pseudoregalia and Beeny (N64-style indies)
- **Rendering:** Rendered at 320×213 and upscaled smoothly like the console’s video interface. 32 px textures use the N64’s three-point bilinear filter (a triangle of three texels, not four), so they smear rather than pixelate. Perspective-correct, no vertex wobble. 16-bit colour with light dithering, then a composite pass softens the frame.
- **Motion:** 30 fps. Legs, bob and the spider twitch on that clock; the bright lamps pulse gently.
- **Why it fits:** Friendly and heroic without being twee. The blur makes 200 ants read as one living mass while each caste still has a clear colour.
- **Risks:** The blur that makes it charming also softens fine detail on small phone screens, and fog can hide gameplay at the edges.
- **Production:** Very cheap: tiny textures, low-poly models, one texture-filter shader. Vertex-coloured lighting can stand in for lightmaps.

### Sega Saturn (`saturn`)
A 1996 Sega title at sunset: warped textures, neon dusk colours and checkerboard shadows that the TV melts into transparency.

- **Reference games:** Panzer Dragoon Saga, NiGHTS into Dreams, Burning Rangers, Sonic R, Quake (Saturn port), Bug! (Saturn)
- **Rendering:** Rendered at 352×235. Fine vertex snapping and affine texturing give the Saturn’s quad warping, the nest outline is simplified into big quads, and creature shadows are drawn with mesh transparency: a checkerboard of discarded pixels, exactly how Saturn games faked alpha. A composite-video pass smears chroma so the checkerboard reads as a soft shadow, as it did on a real TV.
- **Motion:** 30 fps. The sky’s VDP2-style colour bands stay fixed while the world swings round them; torches flicker.
- **Why it fits:** The most distinctive of the retro set: the colour script alone separates it from every PS1 tribute. Dusk light gives the surface danger and the nest warmth.
- **Risks:** The look depends on the composite blur; on sharp phone screens without it, the mesh dither looks noisy. Saturn nostalgia is narrower than PS1.
- **Production:** Same cost as PS1 retro. Mesh transparency is cheaper than real alpha blending, a bonus on low-end phones.

### Haunted PS2 (`ps2`)
A 2001 survival-horror nest: heavy fog, a wandering flashlight, glowing highlights, film grain and the comb of an interlaced TV.

- **Reference games:** Silent Hill 2 and 3, Fatal Frame, ICO, Shadow of the Colossus, Haunted PS2 indies, Sorry We’re Closed
- **Rendering:** Rendered at 640×427 with smooth 64 px textures and rounder models: the PS2 jump. Heavy distance fog, a spotlight that sweeps the nest like a held flashlight, Unreal-style bloom on lit edges, then a pass for film grain, desaturation, a green-grey grade, interlace lines and a strong vignette.
- **Motion:** 30 fps. The flashlight drifts slowly across the nest; grain boils every frame; dim lamps flicker.
- **Why it fits:** Gives the colony real dread: the spider above and the dark below. Strong if the game leans into survival and predators.
- **Risks:** Dark and murky: castes are hard to read at 0.6× and on bright phone screens outdoors. A whole game of this needs a lighter mode.
- **Production:** Moderate: bloom and the grain pass cost fill rate on phones. Models and textures stay small and cheap.

### Nintendo DS (`ds`)
A bright handheld adventure on a 256-pixel screen: toon-shaded models with crisp edge outlines, built to read on a tiny display.

- **Reference games:** The Legend of Zelda: Phantom Hourglass, Mario Kart DS, Animal Crossing: Wild World, Professor Layton (3D scenes), Pokémon HeartGold
- **Rendering:** Rendered at 256×171 and upscaled nearest-neighbour. Two-tone toon shading (the DS had a hardware toon table) with dark edge outlines on every creature and soil slab (the DS’s edge-marking feature), low-segment models, bright distance fog and no dithering.
- **Motion:** 30 fps, the DS’s usual 3D rate. Legs, bob and the spider twitch on that clock.
- **Why it fits:** Designed for exactly our problem: tiny characters on a tiny screen. Outlines make every caste pop even at 0.6×, and it is the most phone-legible retro option.
- **Risks:** Can look like a kids’ handheld game; the low resolution limits how many ants fit before the screen gets busy.
- **Production:** Cheapest of all: very low-poly models, flat colours, outlines from a single shader.

### Quake software (`quake`)
A 1996 software-rendered dungeon: one 64-colour palette, light stepped into hard bands, fullbright torches burning in the brown.

- **Reference games:** Quake, Hexen II, Dusk, Ultrakill, Wrath: Aeon of Ruin, Warhammer 40,000: Boltgun
- **Rendering:** Rendered at 400×267, nearest-filtered 64 px textures, flat-shaded creatures. A final pass steps each pixel’s brightness into 16 bands (the colormap’s job in Quake) and snaps it to the nearest of 64 palette colours built as eight ramps. Flames and the spider’s eyes are fullbright: they skip lighting entirely. Harsh torch falloff, no fog.
- **Motion:** 30 fps. Torches flicker hard; everything else is steady and heavy.
- **Why it fits:** Underground stone and dirt is exactly what this palette was made for. Reads as gritty and tactile, and gives the colony a dungeon-crawl edge.
- **Risks:** The brown palette is the point and the problem: castes must be told apart by shape and the few warm accents, not colour.
- **Production:** Cheap: one palette shader, small textures, simple models. Boomer-shooter fans will recognise it instantly.

### 1-bit dither (`onebit`)
An old Macintosh screen: a fully lit 3D nest rendered in just two inks, shaded by an ordered dither and held together by outlines.

- **Reference games:** Return of the Obra Dinn, Lucas Pope’s 1-bit Mac inspirations, World of Horror, Mars After Midnight, Playdate 3D games
- **Rendering:** The scene is lit in greyscale and rendered at 600×400. A final pass maps brightness against an 8×8 Bayer threshold to exactly two colours. Ink outlines on every creature and soil slab keep shapes legible, which Lucas Pope found essential: dithering alone turns into noise.
- **Motion:** 30 fps. Lamp pools flicker as dither patterns crawl; legs, bob and the spider twitch read as moving outlines.
- **Why it fits:** Links back to the field-guide idea in the original brief: an engraving that moves. Unmistakable, and every caste reads by silhouette.
- **Risks:** Dither shimmer on a moving camera can tire eyes; Obra Dinn needed careful stabilisation. Colour-coded UI is not possible inside the world.
- **Production:** Cheap art (greyscale and outlines), but a careful post pipeline: stabilised dither and good outlines take real engineering.

Background reading for the family:
- [Lucas Pope on Obra Dinn's 1-bit style](https://blog.playstation.com/archive/2019/10/17/lucas-pope-on-return-of-the-obra-dinns-art-style): outlines and careful dithering are what keep 1-bit legible.
- [N64 three-point filtering for Godot](https://ed3800.itch.io/n64-3point-filtering) and the [Godot N64 shader demo](https://menacingmecha.itch.io/godot-n64-shader-demo): the filter and fog used here.
- [Saturn transparency discussion](https://gendev.spritesmind.net/forum/viewtopic.php?p=9694) and [the Saturn's mesh/checkerboard trick](https://racketboy.com/forum/viewtopic.php?p=1123724): why composite video turns the checkerboard into transparency.
- [Quake palette and colormap](https://quakewiki.org/wiki/palette.lmp) and [Fabien Sanglard on the software renderer](https://fabiensanglard.net/quake2/quake2_software_renderer.php): 256 colours with lighting through a colormap.
- [List of Haunted PS1 games](https://en.wikipedia.org/wiki/List_of_Haunted_PS1_games): the indie scene keeping PS1 and PS2 looks alive.

## The other directions

### 1. Low-poly diorama (`lowpoly`)
A faceted tabletop slice of garden: flat-shaded triangles, soft pastel light, everything readable from across the room.

- **Reference games:** Townscaper, Monument Valley, Alto’s Adventure, Islanders, Mini Motorways, Pikuniku
- **Rendering:** Flat-shaded standard materials, nest outline simplified to big facets, one soft shadow-casting sun plus hemisphere fill. No textures at all.
- **Motion:** 60 fps eased. Legs on a tripod gait at 6 Hz, carriers bob, the spider lifts a foreleg every two seconds.
- **Why it fits:** Reads instantly on a phone and makes the colony feel like a toy world you want to tend. Castes separate cleanly by size and silhouette.
- **Risks:** Can feel generic or “mobile casual”. Needs a strong colour script to stay distinctive.
- **Production:** Cheapest 3D option: primitives and a palette, no texture painting. 200+ ants as instanced meshes run well on phones.
- **Palette:** Sky #BFE3EE, Haze #F6E3C8, Grass #8CC084, Topsoil #E0A86C, Packed #C98454, Clay #A6633F, Nest wall #A8714E, Ant #40303D, Queen #7C4C5E, Food #F4C95D, Egg #FFF4E0, Spider #3A3150

### 2. Cel-shaded toon (`toon`)
A bright adventure-game look: three-step toon shading, thick ink outlines, painted sky and clouds.

- **Reference games:** The Legend of Zelda: The Wind Waker, Ni no Kuni, Sable, Hi-Fi Rush, Kirby and the Forgotten Land, A Short Hike (3D)
- **Rendering:** MeshToonMaterial with a hard three-step ramp, inverted-hull ink outlines on every creature and soil slab, warm lamp pools in the rooms, a painted gradient sky with flat cloud cut-outs.
- **Motion:** 60 fps eased. Tripod gait at 6 Hz, carriers bob, antennae sway, the spider rears a foreleg every two seconds, clouds drift.
- **Why it fits:** The outline makes every ant a sticker against the soil, so castes read even at 0.6×. Heroic and warm without turning the ants into cartoon characters.
- **Risks:** Outlines cost a second draw per mesh; with 200 ants use one instanced hull pass. Bright palette can make the spider too friendly.
- **Production:** Medium: simple models, no texture painting, but the ramp, outline width and colour script need an art director’s eye.
- **Palette:** Sky #3FA7E8, Horizon #BDE9FF, Grass #5CC43C, Topsoil #D9823A, Packed #B85E2E, Clay #8E3F2C, Nest wall #8A4A30, Ink #1A0F14, Ant #2E1F2B, Queen #8A3E5E, Food #FFC53A, Spider #4B2E7A, Spider eyes #FFE23A

### 3. Claymation (`claymation`)
Plasticine ants on a foam-board set: thumb-pressed lumps, googly eyes, felt grass, a soft studio key, and motion shot on twos.

- **Reference games:** Wallace & Gromit, The Neverhood, Armikrog, Harold Halibut, Clay Fighter, Skullmonkeys
- **Rendering:** Every mesh is displaced with 3D noise so it looks hand-rolled; a fingerprint bump map, slightly glossy clay, one soft shadow-casting key, a cool rim, and real props (a bottle cap, a felt mat, a pebble).
- **Motion:** Stop-motion: 12 fps with poses held on twos (six unique poses a second), a three-pose walk, per-frame position jitter and a faint light flicker. Googly eyes blink every few seconds.
- **Why it fits:** The most charming direction: every ant is a little actor. Material honesty makes the nest feel like a real object you could touch.
- **Risks:** Cuteness can fight the colony-as-hero tone; 200 googly-eyed ants may be noisy. Stepped motion hides gameplay feedback unless UI stays smooth.
- **Production:** Medium–High: sculpt or displace models once, render sprite sheets or use instanced meshes. Real-time works; pre-rendered sheets are cheaper on phones.
- **Palette:** Foam sky #A9D3EF, Felt #6FAE3D, Topsoil clay #9A6234, Packed clay #84502A, Clay #8A4228, Nest wall #6A4228, Ant #4A3122, Queen #9A6A4A, Food drop #F6C445, Egg #FFF6E2, Bottle cap #C8372D, Spider #3A2A2A

### 4. Macro realism (`macro`)
A nature-documentary macro shot: real soil, glossy chitin, towering grass, and a lens so close the edges fall out of focus.

- **Reference games:** Grounded, Empires of the Undergrowth, BBC Ant Mountain, Microcosmos, A Bug’s Life (lighting)
- **Rendering:** Physically based materials: procedural soil colour and bump, clearcoated chitin, sheen on the spider’s hair, an image-based studio environment for glints. ACES tone mapping, distance haze, a bokeh depth-of-field pass focused on the nest, then a photographic grade with vignette and grain.
- **Motion:** 60 fps. Tripod gait at 6 Hz, antennae sweep, carriers bob, grass blades sway, the spider lifts a foreleg every two seconds.
- **Why it fits:** Treats the colony as wildlife, which is exactly what “biology stays real” asks for. At this scale the garden feels enormous and the nest feels like somewhere.
- **Risks:** Heaviest style here: depth of field, shadows and PBR on 200 ants will need LODs and baked lighting on phones. Dark chitin on dark soil can lose caste reads at 0.6× without rim light.
- **Production:** Needs real modelling and texture work (photogrammetry soil, sculpted ants). The bokeh pass costs a second depth render; drop it to a cheap tilt-shift blur on phones.
- **Palette:** Golden haze #E8C891, Sky #9FB7C9, Topsoil #5A4030, Packed #9A7752, Clay #A8643E, Nest dark #6A4A32, Grass #6E8F3A, Leaf litter #B8692E, Root #7A5E42, Chitin #3A1C0E, Queen #4E2614, Egg #F1EADB, Seed #D9A65A, Wolf spider #6A4F37, Key light #FFC98A, Cool fill #7FA3D6

### 5. Voxel (`voxel`)
The nest as a block world: every grain of soil is a cube you could dig out, every ant a little blocky figurine.

- **Reference games:** Minecraft, Teardown, Cube World, Dragon Quest Builders, Astroneer (digging), Trove
- **Rendering:** Terrain is one culled block mesh (only exposed faces) on a 6 px grid with a 16×16 nearest-filtered block texture tinted per voxel. Ants and the spider are voxelised from their body parts at 1.2 px. Hemisphere fill, one soft shadow-casting sun, and a torch with a warm point light in every room.
- **Motion:** 60 fps. Boxy legs swing on pivots at 6 Hz like a block-game mob, carriers bob, the spider lifts a foreleg every two seconds.
- **Why it fits:** Digging is the core verb of an ant game, and voxels make every tunnel feel carved by hand. Players already read block worlds as editable.
- **Risks:** Strongly associated with Minecraft. At 0.6× zoom fine creature voxels shimmer; may need a coarser creature grid on phones.
- **Production:** Cheap to author (no texture painting, palette plus noise). Chunked culled meshes keep a dug-out nest fast; 200 ants want instanced voxel sprites.
- **Palette:** Sky #8EC9F2, Grass #6BAA3A, Topsoil #8A5A34, Packed #74492B, Clay #94512F, Nest wall #5E3D27, Stone #8E8B86, Amber #E0A030, Ant #3E2416, Queen #7A3E22, Food #F2C230, Spider #3B3346

### 6. HD-2D (`hd2d`)
Pixel-art ants in a lit miniature set: the warmth of a 16-bit sprite with the depth, light and blur of a tilt-shift photograph.

- **Reference games:** Octopath Traveler, Triangle Strategy, Live A Live (2022), Dragon Quest III HD-2D, Eastward (lighting)
- **Rendering:** Creatures are lit pixel-art billboards (1 sprite px = 1 world px, nearest-filtered, four-frame walk) that cast real shadows. The set is extruded geometry with 32 px pixel textures. Post: bloom on emissive mushrooms and lanterns, horizontal and vertical tilt-shift blur, filmic tone curve, warm grade and vignette.
- **Motion:** Sprites flip through four walk frames at 24 fps; carriers bob a pixel; fireflies twinkle over the grass; lantern and mushroom light breathes. The camera can glide freely while sprites stay facing it.
- **Why it fits:** Gives the colony a storybook scale: tiny pixel characters in a big, glowing, physical world. Sprites keep castes crisp and readable at any zoom.
- **Risks:** Post-processing (bloom plus tilt-shift) is the heaviest GPU cost here on phones. Sprite art for 8 directions × castes × actions is real pixel-artist work.
- **Production:** Medium–high: sprite sheets per caste and action, plus a modest 3D set. Engine work for lighting and post is a one-off.
- **Palette:** Golden sky #FFAA66, Grass #62A040, Topsoil #8A5E38, Packed #6C5244, Clay #9E5236, Nest wall #46301F, Ant #62402A, Queen #A44E2E, Food #F8D060, Spider #463A52, Mushroom glow #7FE8D0, Lantern #FFB050

### 7. Bioluminescent night (`glow`)
The nest after dark: glowing fungi, glow-worm threads and a luminous scent trail light a blue-black underworld.

- **Reference games:** Ori and the Blind Forest, Hollow Knight, Spore (cell stage), Abzû, Avatar: Frontiers of Pandora
- **Rendering:** Near-black materials with a fresnel rim term and emissive accents, a handful of coloured point lights from the fungi, and an Unreal-style bloom pass. Scent is an additive glowing tube with particles flowing along it.
- **Motion:** 60 fps. Ants walk at 6 Hz, scent motes stream from the crumb to the hatchery, fungi breathe, fireflies drift and blink.
- **Why it fits:** Makes the scent trail, the colony’s real language, the most visible thing on screen. Castes read by eye colour and glow: cyan workers, amber majors, a warm glowing queen.
- **Risks:** A permanently dark palette is hard to look at for 20 hours unless there is a day cycle. Bloom and point lights cost fill rate on phones.
- **Production:** Cheap models, expensive look: it lives on emissive materials and bloom, so assets are simple. Bloom at half resolution keeps it phone-safe.
- **Palette:** Night sky #060A1C, Horizon #16244A, Topsoil #33487E, Packed #2A3B6C, Clay #3A2F6E, Rim light #5CC8FF, Fungus #3CF2D2, Spore violet #B46BFF, Moss #7CFF8A, Scent #C6FF5E, Ant eyes #8AF6FF, Major eyes #FFB45A, Queen glow #FF8A3D, Spider eyes #FF3DA8, Firefly #E8FF7A

### 8. Toy ant farm (`antfarm`)
The mail-order ant farm on your desk: layered sand between two panes of glass, a glossy green frame, a little red barn on the skyline.

- **Reference games:** Uncle Milton’s Ant Farm, Toy Story, Tearaway, Captain Toad: Treasure Tracker, Lego video games
- **Rendering:** Product-photography lighting: a soft key with contact shadows, a studio environment map for glossy plastic and chitin, a tinted glass pane with softbox reflections faked as additive streaks. Sand is a striped canvas texture per layer.
- **Motion:** 60 fps. Ants walk at 6 Hz and climb the back glass in the shaft; the windmill turns; carriers bob; the spider taps the sand.
- **Why it fits:** Frames the colony as something you own and watch, which is the game’s fantasy. The glass box gives a natural UI frame and an obvious reason for the cross-section view. Instantly readable to anyone who had one as a kid.
- **Risks:** Can read as a children’s toy rather than a living world. The frame eats screen space on a phone; the HUD could live on the frame itself.
- **Production:** Moderate: simple shapes, but sand and glass need careful shading. Cheap at runtime: no post-processing, one shadow map.
- **Palette:** Wall #BFE3DD, Desk #C98E55, Frame #2FA34F, Frame shade #1E7A39, Golden sand #F1CF86, Peach sand #E39A63, Rust sand #B9624A, Barn #D63A2F, Trim #FFF8EC, Ant #1E1410, Queen #3A1E12, Seed #F7F1E1

### 9. Papercraft (`papercraft`)
A shadow-box of layered construction paper: hand-cut soil sheets, card cut-out ants with sticker borders, paper grass and a cardboard sky.

- **Reference games:** Tearaway, Paper Mario: The Origami King, Yoshi’s Crafted World, Lumino City, LittleBigPlanet, Paper Beast
- **Rendering:** Each soil band is four parallel paper sheets with slightly different hand-cut holes, so tunnels show stepped paper edges; one warm key casts soft shadows sheet-on-sheet. Creatures are extruded card silhouettes traced from signed-distance shapes, with a white sticker border and a fibre texture on everything.
- **Motion:** 12 fps puppet motion: legs are separate card strips that scissor on a pin, bodies rock ±2.5°, carriers bob, the spider jerks a foreleg every two seconds.
- **Why it fits:** Turns the cross-section into a handmade box you peer into, which is exactly what an ant farm is. The sticker border keeps every caste readable at 0.6×.
- **Risks:** Can read twee or childish; silhouettes in profile lose the 3/4 depth when the camera swings far. Props must stay sparse so the material does the work.
- **Production:** Medium: 2D silhouettes become geometry automatically, so new castes are cheap. Layered sheets are just extruded outlines.
- **Palette:** Card sky #5DB2EA, Paper grass #79B552, Topsoil sheet #D49352, Packed sheet #B06F3E, Clay sheet #8C5130, Backing #7A4E32, Ant card #4A2A1E, Queen card #9A4E3A, Sticker border #F4EFE6, Orange card #F0A040, Spider card #3D2B57

## Comparison matrix

| Style | Nearest games | Cost to produce | Phone performance | Caste readability | Distinctiveness |
| --- | --- | --- | --- | --- | --- |
| PS1 on a CRT | PS1 classics on a real TV | Low | High | Medium | High |
| N64 | Banjo-Kazooie, Mario 64 | Low | High | High | High |
| Sega Saturn | Panzer Dragoon, NiGHTS | Low | High | Medium | Highest |
| Haunted PS2 | Silent Hill 2, ICO | Medium | Medium | Medium | High |
| Nintendo DS | Phantom Hourglass, Mario Kart DS | Low | Highest | Highest | Medium |
| Quake software | Quake, Dusk | Low | High | Medium | High |
| 1-bit dither | Return of the Obra Dinn | Low–Medium | High | High | Highest |
| Low-poly diorama | Townscaper, Islanders | Low | High | High | Medium |
| Cel-shaded toon | Wind Waker, Ni no Kuni | Medium | High | Highest | High |
| Claymation | The Neverhood, Armikrog | Medium–High | Medium | High | Highest |
| Macro realism | Grounded, Empires of the Undergrowth | High | Low | Medium | Medium |
| Voxel | Minecraft, Teardown, Cube World | Low–Medium | Medium–High | High | Medium |
| HD-2D | Octopath Traveler, Triangle Strategy | Medium–High | Medium | High | High |
| Bioluminescent night | Ori, Hollow Knight | Medium | Medium | High | High |
| Toy ant farm | Captain Toad, Toy Story games | Medium | High | High | High |
| PS1 retro | MediEvil, Spyro, Haunted PS1 indies | Low | High | Medium | High |
| Papercraft | Tearaway, Paper Mario | Medium | High | High | High |


## Notes for picking

- **Lightest on phones:** low-poly, toon, PS1, toy ant farm and papercraft need no post-processing beyond, at most, one shader.
- **Heaviest on phones:** macro (depth of field plus PBR), HD-2D (bloom plus tilt-shift) and glow (bloom plus many point lights). Each would need a cheaper mobile tier.
- **Rendering caveats:** these are real-time renders of a mockup scene, not final art. Models are built from primitives in code, and textures are procedural.
