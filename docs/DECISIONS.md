# Underfoot: decisions log

What changed and why, newest first. Read [`HANDOFF.md`](HANDOFF.md) for the full design of record. This log picks up where its §2.6 (art direction, Oct 26) ends.

## Nov 1: the back of the house, outside (build 21)

Mark: "To the house." Then: "We can build exterior for now and build interior later." And: "keep in mind that the house we build now needs to be a good accommodating shape for a later interior."

**Before:** the house was a strip of brick along the top of the yard with a plain beige box behind it.

**Built for an interior later.** The house is now built from one layout (`houseLayout` in `models/house.js`), which the interior will share:
- the footprint: the length of the yard's top edge, and 240 tiles deep
- the floor, level with the top of the back steps
- the wall thickness and the height to the eaves
- where every door and window is, each tagged with the room behind it (kitchen, den, laundry, living, bath, bedroom)

The walls are real walls of that thickness with real openings for the door and windows, so a door can open and rooms can be fitted inside. `buildHouse` returns named groups:
- `shell`: the walls
- `roof`: its own group, so an interior view can lift it off
- `trim`: doors, windows, gutters and fittings
- `glass`

**The outside:**
- **Walls:** a concrete foundation; a brick skirt with five small basement windows; a white trim board; cream clapboard siding to the eaves; white corner boards.
- **The back door** at the top of the steps:
  - a white frame
  - a blue-grey door with raised panels and four panes of glass
  - a brass knob and kick plate
  - a black porch lantern with a warm glass
- **Seven windows**, kitchen, den, laundry, living room, bathroom and bedrooms:
  - frames, sills and muntins
  - green louvred shutters (none on the bathroom)
  - glass with a sky reflection
  - curtains drawn back, a different colour in each room
- **The roof:** a gable along the house, eaves overhanging, white fascia and soffit, a gutter, and three downspouts to concrete splash blocks.
- **Fittings:** an electric meter, an outlet, and a hose bib. The dryer vent sits low in the brick with lint on the ground under it.
- **Ivy** climbs both corners.
- **The steps** now have a rounded nosing on each tread, and white railings with posts at each step.

**What you see from the play camera:** it looks down into the yard, so the house shows only along the top of the screen. That means mostly its base: the foundation, brick, basement windows, splash blocks, ivy, the vent and the railings. The door, windows and siding show when you zoom right out.

## Nov 1: the Oak's roots spread round it, and no bundle of sticks (build 20.12)

Mark asked about "that batch of roots or sticks" up and left of the trunk.

**The cause:** it was the Oak Roots region's own five roots. All five started from one spot, 26 tiles out from the trunk's edge and joined to nothing, so they read as a dropped bundle of sticks.

**The fix.** Mark: "some roots but not tons, spread them around the tree."
- The bundle is gone.
- The trunk has seven roots, evenly round it, about 51° apart.
- Those heading west are the long ones, 50 to 70 tiles. They run out across the Oak Roots, so the region still has its "great roots heave out of the ground."
- The removed roots' random draws are kept, so the rest of the yard's layout is unchanged.

A first try instead attached the five as extra long roots from the trunk. That made twelve, crowded on the west side, and Mark asked for fewer.

## Nov 1: thicker oak roots that grow out of the trunk (build 20.11)

Mark: "Let's make the roots of the trunk of the tree a little bit thicker. They seem a little too slim. Let's try to make them seam into each other, you know, like an organic seaming."

- **Roots that leave the trunk are broad and flattened.** They are about 8 tiles across at the trunk and taper slowly to a point, half sunk in the ground. They snake and dip, then dive back into the ground at the tip.
- **The seam:** each root starts inside the trunk and rises up it.
  - The trunk's foot has a buttress swelling toward each root it feeds, aimed at that root (the angles come from the yard layout). Before, the buttresses were at five fixed angles.
  - So trunk and root are one surface.
- **The roots are coloured like the trunk's bark:** furrows along their length and dark beneath. They are coloured while still a plain tube, so both triangles of a facet match.
- **The separate roots in the Oak Roots area** are a little wider too.
- **The yard layout (`yard.js`) blocks the same width.** Before, it blocked only one tile along each root. Without the change, ants walking beside a root would have been hidden under it.
  - Trunk roots block up to four tiles each side at the trunk, and none at the tip.
  - Oak Roots roots block two, then one.
  - The scenery claims those tiles too, so no filler pebbles appear along them. A first try left the pebbles in.
- **Two attempts didn't work:**
  - A small widening barely showed.
  - A very large buttress flare swallowed the roots' thick bases, so only their thin tips poked out.

  The final version keeps the flare about the size of a root where it meets the trunk.

## Nov 1: model pass, layer 4b: the rest of the yard (build 20.10)

Mark: "Next."

Each of these was checked from the play camera. The changes are all in `yardScenery.js`.

- **The Oak:**
  - Buttress roots flare at its foot.
  - The bark is in deep vertical furrows, coloured by whole facet.
  - Moss grows low on the shady side.
- **Its roots:** thick where they leave the trunk, then tapering. They rise and dip as they snake away, then dive back into the ground.
- **Hedges and bushes** are built from a shared `leafBall`: a lumpy ball of foliage, lighter on top, flecked with pale new growth and dark in the gaps.
  - Hedges show woody stems underneath.
  - Bushes carry red berries, and flowering sage has purple flowers.
- **The kiddie pool:**
  - three inflatable rings with stripes
  - a pale inner wall
  - water with ripples and a glint
  - a rubber duck
- **The swing set:**
  - thicker capped legs on ground anchors
  - chains of grey links
  - black strap seats
  - the grass worn to dirt under each swing
- **The trampoline:** steel W-shaped legs, a top rail ringed with 40 springs, and blue padding.
- **The wheelbarrow** was a flat blue box. It now has:
  - a sloped steel tray with mud in it
  - a wheel on its fork
  - wooden handles with grips
  - two legs at the back
- **The shed:**
  - a door frame, hinges and a latch
  - a window with cross bars
  - white corner trim
  - a stone step
- **Molehills:** clods tumbled down the sides, and some spilled round the foot.
- **The bird feeder:** a squirrel baffle on the pole, and seed spilled round its foot.

## Nov 1: model pass, layer 5: the sneaker, the acorn, the robin, and props (build 20.9)

Mark: "Let's do layer 5." Each of these was checked from the play camera at the moment it matters: the warning shadow, the impact and the landing.

- **Shadows shaped like what casts them** (new `shadows.js`). Each shadow is soft at the edge (vertex alpha) instead of a hard dark disc.
  - The sneaker's warning shadow is its sole: wide at the toe, a narrow waist, a round heel. It starts a little darker, so it reads while the shoe is still high.
  - A flying robin's shadow is a bird with its wings spread. On the ground it is a soft pool.
  - Everything else gets a soft disc.
- **Dust where things land:**
  - the sneaker stamping down
  - the acorn hitting the ground
  - the robin touching down

  Each burst is clumps of soft, see-through puffs that roll outward and up and thin as they go, drawn in their own faint layer. As solid puffs at first, they looked like beads, so they were made see-through.
- **The sneaker:**
  - a navy stripe round the midsole
  - tread lugs along the outsole edge
  - silver eyelets down both sides of the laces
  - a tied bow
  - a round ankle patch on each side
- **The falling acorn:**
  - a glossy nut with faint stripes, a highlight and a dark pointed tip
  - a cap of overlapping scales with a rolled lip
  - a bent stalk
- **Shared props** (`props.js`). They stay white so each use can tint them, but they now carry grey shading that survives any tint:
  - seeds have a pale seam
  - pebbles are rounder and speckled
  - leaves have a midrib and veins
  - crumbs are porous
  - dewdrops have a glint
  - the marker rings are smooth (28 segments instead of 10)

## Nov 1: potted plants growing out of their soil (build 20.8)

Mark: "Potted plants looks bad still. Should have soil inside the terracotta pot, the plants sprouting from the soil inside."

**Why it looked wrong:** the pot's rim was a solid cylinder, so its top cap hid the soil, and the plant seemed to float over an orange lid.

**The pot now:**
- It is open: an outer wall, a flat lip on the rim, and an inner wall in shadow.
- The soil sits a little below the rim, as a low dark mound with grit and white perlite.

**The geranium:**
- It grows from a crown in the soil.
- Three tiers of round leaves with the zone ring sit on stalks from the crown. The low ones reach out over the rim.
- Three red flower heads stand on tall stalks above them, each a round head of florets.

## Nov 1: model pass, layer 4: the yard's landmarks (build 20.7)

Mark: "After that go to the next part."

At play zoom the camera sees tall landmarks (the can, the bins, the gnome, the birdbath) mostly from the base, so detail went where the eye lands. All of these are in `yardScenery.js`, in vertex colour as before.

- **Flowers:**
  - leaves with a pale midrib
  - green sepals
  - two rings of petals cupped upward, darker at the base and paler at the tip
  - a domed seed centre
- **Dandelions:** a rosette of toothed leaves flat on the ground, and a head of ragged florets in three tiers on green bracts.
- **Logs:**
  - bark in furrows with dark fissures
  - a taper and a slight bow
  - cut ends with rings and heartwood
  - two branch stubs
  - shelf fungus and moss on rotten logs
- **Pots:** a saucer, a rolled rim, potting soil with grit, and a geranium with zoned leaves and two red flower heads.
- **The grill:**
  - Its legs now splay out from under the bowl. Before, they leaned out past it.
  - Wheels and an axle.
  - A triangle rack with the ash pan.
  - Vents, a steel rim, a lid vent, and a wooden handle on brackets.
- **The patio set:**
  - slatted tops with gaps
  - an apron under the table and its umbrella hole
  - grey foot caps
  - the chair has a slatted back and arms
- **The sandbox:**
  - Boards with grain along each side, joints with nail heads, and a seat board across each corner.
  - A ribbed bucket with a rolled rim and sand heaped inside.
  - A spade with a scoop, a collar and a T grip.
- **The soda can:** steel rims top and bottom, a white band with a blue stripe, a ring-pull, and beads of condensation.
- **Mushrooms:** a bulb at the foot, a skirt on the stem, gills, and a cap paler at the edge; red caps have raised white warts.
- **Gnomes:** boots, a belt and buckle, arms, a nose and eyes, and a fuller beard.
- **The birdbath:** a mossy plinth, a fluted pedestal with collars, a lip on the bowl, and a glint and a leaf on the water.
- **Wheelie bins:** ribbed, with a bumper, wheels and axle at the back, and a hinge strip.
- **The cooler:**
  - a white band
  - a recessed lid
  - side handles
  - a latch
  - a drain plug
  - rubber feet

**One lesson:** colouring stripes by angle has to follow whole mesh segments. Otherwise the two triangles of a facet get different colours, and the bark, ribs and swoosh came out as a checkerboard.

## Nov 1: the cistern as a tank of water (build 20.6)

Mark: "Cistern could have a more tank of water look to it, makes sense."

The cistern's water used to be an opaque blue box. It stuck out past the curved chamber walls, and the ants walking through the room were hidden inside it.

It is now its own mesh, `waterGeometry` in `nestView.js`:
- **Shape.** It fills the back of the chamber, from about 0.6 of the room's depth to the wall, and is traced from the chamber's own outline, so it follows the curved walls.
- **Translucent front face.** Ants walk past the front face; the wall shows through.
- **Colour.** Shallow blue near the top deepening to dark blue at the bottom, with a bright lip at the surface and a pale surface seen from a little above.
- **Material.** Unlit, so it keeps its colour.
- **Level.** It is rebuilt whenever the level moves by half a pixel or more.

Inside and around it:
- a pebble bed seen through the water
- bubbles rising
- glints sliding along the surface
- the floating leaf
- a wet tide mark on the wall
- ripple rings where the root drips land

## Nov 1: rooms that sit in the soil (build 20.5)

Mark: "What about the transitioning of rooms and their surrounding backgrounds so it fits into the spacing better instead of just being a blocky jutting space with no natural seams?"

Two things made rooms look cut out of the soil rather than dug into it:
- Each room's painted back wall was a flat rectangle inside a rounded chamber, so its straight edges showed.
- Corridors butted straight into rooms, with square steps where they met.

The fixes:
- **Walls that follow the chamber.**
  - The back wall is now a fine grid built from the chamber's own outline (`roomField`, shared with the soil tracing).
  - It reaches past the outline into the soil, which hides it, so where the chamber meets soil its edge is the chamber's own curved edge.
  - Where a tunnel opens, the wall darkens a little and fades into the bare soil wall over about 10 px, with a ragged noise edge. Each room's wall runs out into the tunnel and into its neighbour without a line.
- **Tunnel mouths that flare.** Rooms and tunnels now merge with a much wider blend (20 px instead of 8), so where a tunnel meets a chamber its walls sweep out like a mouth.
  - Rooms still merge with one another at the old blend. Otherwise the one-tile soil wall between neighbouring rooms was eaten away; it now stands as a pillar that narrows toward the tunnel.
- **Roots.** Every room has two roots, each with a rootlet, hanging from the real ceiling (`roomCeiling`) near its walls.
- I also tried stones half buried in the wall, but they looked like floating chips and were dropped.

This is a rendering change only. Rooms are the same cells to the sim, so ants walk where they did.

## Nov 1: model pass, layer 3: the nest up close, and the toad (build 20.4)

Mark: "Go ahead with layer 3."

- **The brood** (new `nestProps.js`, drawn in true colours):
  - Eggs are glossy ovals, one end a little pointed, the yolk showing through, and a bit bigger than before.
  - Larvae are fat curled grubs in seven segments, with an amber head, dark mouthparts, and the gut showing through the skin. They still wriggle.
  - Pupae are silk cocoons, each with a dark spot at its foot.
- **The queen:**
  - Her gaster has five plates with pale skin showing between them, so it reads as swollen with eggs.
  - She has stubs where she tore off her wings.
  - She keeps her crown. Like the other outfits, these are true colours drawn over her tinted body.
- **Room furniture:**
  - Queen's chamber: a lumpy moss bed with tiny flowers, three new-laid eggs, and her shed wings pinned up as a pair, veined, each with its dark spot.
  - Hatchery and nursery: woven cradles, straw in the hatchery and silk in the nursery.
  - Food store: seed heaps that grow with the stock. Up to four honeypot ants hang from the ceiling, one for each quarter full, with amber gasters swollen with stored sugar.
  - Cistern: water that is pale at the surface and deep blue below, and teardrop drips.
  - Barracks: a twig rack of thorn spears, a beetle-husk training dummy with straw poking through a crack, a leaf banner, and two soldiers asleep with their helmets tipped over their eyes.
  - Workshop: a stone bench with a part-cut leaf and a thorn chisel, and a twig bundle tied with grass.
  - Armory: before this build it had no dressing and borrowed the workshop's wall. It now has a riveted chitin wall, three wing-case shields, a spear rack, and spare plates.
- **The toad:**
  - About 40 raised warts, darker blotches, a poison gland behind each eye, eardrums, and a bony brow.
  - Gold eyes with a black bar pupil.
  - Splayed toes, and a long webbed foot on each back leg.
  - A pale speckled throat that puffs. It is its own mesh now; the whole body used to pulse.
- **Gallery and export:** a new Nest tab in the model gallery, and 17 new `.glb` files, for 106 in all.
- **Two fixes while testing:**
  - Bug spacing measured from a tile's corner instead of its centre, so two bugs could start just under 12 tiles apart. This was a rare failure of the "never bunched" test.
  - The nurse test only counted nurses that were exploring. Nurses that left for another job outdoors, such as hunting or gathering, made it fail now and then. It now counts any nurse outside the nest.

## Nov 1: a viper of a venom ant (build 20.3)

Mark: "Maybe venom is more slender and viper-esque."

- The venom ant has its own body now; it used to share the soldier's.
  - Long and slim, with a tapering gaster carrying a chain of dark, pale-edged diamonds down its back, like an adder.
  - A sting at the tip.
  - A long thin waist.
  - A flat, wedge-shaped head wider at the back, with a dark crown stripe.
  - Pale curved fangs below fine mandibles.
  - Long fine legs.
  - It keeps its skull bandana.
- Its stats are unchanged.

## Nov 1: an outfit for each kind of ant, and the dead spider's legs (build 20.2)

Mark: "make the ant kinds more unique… worker ants have like a little work belt… the soldier ants have like an army helmet… foragers… some kind of apron… Also, the dead spider, the legs seem to be under the body when they should be above."

- **Every kind of our ant wears something of its own**, in true colours on top of its caste tint, drawn with the body:
  - **Builder:** a yellow hard hat, plus a leather tool belt round the gaster with a gold buckle, side pouches and a hammer. The hat was added so builders read from the top-down camera.
  - **Forager:** a green garden apron round the thorax with crossed straps and a bow on the back, and a little woven basket on its back.
  - **Nurse:** a white nurse's cap with a red cross.
  - **Soldier:** an olive army helmet with a brim and chin straps.
  - **Venom ant:** a black bandana with a white skull, its knot trailing.
  - **The queen:** a gold crown with red jewels.
  - Your ant wears its kind's outfit too.
  - Rival ants and Cordyceps zombies wear none, so they stand apart.
  - In the gallery, each kind is shown in its colours and outfit.
  - The first versions were too small and dark to read at game size, so every piece was made bigger and brighter.
- **The dead spider's legs:** turned on its back, its legs curled down into the body instead of up over it. The knees were bent the wrong way for a body drawn upside down. Now the legs tuck in over the belly with the knees high in the air.

## Nov 1: model pass, layers 1 and 2 (build 20.1)

Mark: "do that in different layers. Do the full pass and then give me screenshots of the most major changes." The pass works from the model gallery, most-seen first. Before-and-after sheets go to Mark each layer.

- **Layer 1, on screen most:**
  - **The ants** (the most-seen model, and the queen's body too):
    - a gaster in three plates banded darker at their edges, with a gloss stripe along the top
    - a two-part thorax (domed front, lower back) and a waist node
    - dark compound eyes
    - antennae ending in a club
    - mandibles that hook inward to a dark tip
    - four-segment legs with dark knee joints
    - The caste tints still apply on top.
  - **The robin:**
    - a teardrop body full in the chest, the brick-orange breast running to a white belly
    - a pale throat patch
    - layered wing feathers with pale edges
    - a fanned five-feather tail
    - toes
- **Layer 2, food on the ground:**
  - **Bread crumb:** a torn chunk with a golden crust and pale, pored crumb (was blocky boxes).
  - **Sunflower seed:** plumper, with finer stripes and a pale tip.
  - **Popcorn:** puffy white kernels round a golden core with a scrap of hull (was beige cubes).
  - **Tomato:** half a tomato lying cut face up, with three jelly chambers full of seeds (was a flat red lump). A first try drew whole pie slices and looked like a peppermint, so the face is now split into rings and spokes.
  - **Hot dog scrap:** a grill-marked sausage in a split bun with a mustard zigzag.
  - **Potato chip:** rippled and curled, with toasted edges, blisters and salt flecks (was a flat card).
  - **Dead bug:** on its back, with segment lines, curled two-part legs and antennae.
- Also tried and taken back: a dotted white eye ring on the robin read as a scatter of specks at game scale, so it's back to a clean white eye.
- The `.glb` files in `game/assets/models/` and the gallery are regenerated.
- **Next layers, proposed:**
  - **Layer 3:** the nest (the queen up close, eggs and larvae, room furniture) and the toad.
  - **Layer 4:** the yard's landmarks (flowers, logs, pots, the grill, the sandbox).
  - **Layer 5:** visitors (the sneaker, the acorn) and the props.

## Nov 1: the world's look and pull (build 20)

`PLAYTEST-2.md` items 5, 6, 7, 32 and 33. Mark: "First hour felt good, just enough difficulty and learning curve."

- **The big rock no longer swallows your ant** (item 6). Walk north of the big rock and the camera, looking down from the south, had the rock between it and you: your ant vanished.
  - Now any rock or landmark nearer the camera than your ant dithers away in a circle round it, a PS1-style screen-door hole, and the hole grows a little as you zoom in.
  - It's a shader trick on the shared rock and landmark materials, so it works for every rock, log and pot in the yard, not just that one.
- **Rain over the whole view** (item 7). The rain box was a fixed 520 px square round the middle of the screen, so zoomed out the edges were dry.
  - It now covers as far as the view reaches, with more streaks for a bigger box so the density stays the same (up to 2,400).
  - The drops pocking the ground spread the same way.
- **The Patio has real paving** (item 5), and so do the Steps, the Grill and the Cooler:
  - each slab its own shade, with speckled aggregate
  - weathered stains
  - worn pale edges
  - about a third of them cracked
  - dark grout between them with moss and weeds in it
- **Curios: things worth exploring for** (item 32: "the yard feels small, yet he uncovered very little").
  - Every one of the 70 regions hides one lost human thing: a glass marble, a red button, a copper coin, a bottle cap, a toy brick, a paper clip, a glass bead or a die. Each is several ant-lengths across and glints with a twinkling star you can see across the region.
  - Walk your ant up to one and the stash round it spills out, by its ground: garden treats and honeydew, chitin on bark and compost, stone on gravel, crumbs and a cookie on paving, sweets in the sand, dew in the mud, seeds and berries elsewhere. It also pays a 🧬 Gene, and every fifth curio pays three more.
  - Placed at the start, a fixed spot per region and seed, on clear ground away from rocks and both nests.
  - The yard map counts them ("✦ Curios found: 3 of 70"), marks found regions with ✦, and each region's card says whether its curio is found or "something glints here: find it".
  - A first-find tip, a Help line, a tap card and a sparkly chime.
- **The asset pass** (item 33: "make them proper standalone assets instead of shapes drawn in code").
  - **A model gallery:** every model in the game, 80 of them, grouped as the game uses them (ants, creatures, bosses, events, curios, food, visitors, props), each turning on its own stand. Run `npm run gallery`, or open the published page. It's for reviewing them one by one.
  - **Standalone files:** each model is also written out as a binary glTF in `game/assets/models/` (80 `.glb` files with an index), by `npm run models`. They open in Blender or any 3D viewer, so they can be reworked by hand or replaced by commissioned models later.
  - **First fix from the review:** the ladybug's spots were painted onto the dome's faces and came out as jagged black triangles. They're now round spots sitting on the shell.
- **Tests:** 72 (new: every region has a curio, and walking up to one pays its stash and a Gene, kept across a save). The browser test passes.

## Nov 1: events less often (build 19.1)

Mark: "events shouldn't happen too often… maybe like 8 minutes to 10 minutes. And the more serious ones, even less frequently. My brother did a 45 minute to an hour run and had barely taken out the enemy colony and the spider."

- **The first event** comes at 10–12 minutes. **The next one** comes 8–10 minutes after the last one ends (was 4–7).
- **Lethal events** (the war party, the Cordyceps outbreak) come no earlier than 25 minutes, and at least 20 minutes apart (was 10 minutes, and 3 apart).
  - The outbreak waits until 30 minutes.
  - After 15 calm minutes they become twice as likely (was 6 minutes, and three times).
- **Heatwaves** come after 15 minutes, and at least 12 minutes from the last hardship or lethal event.
- So in a typical hour: about six events, mostly gifts, a heatwave or two, and one or two lethal ones in the second half.
- **What his run says about pace:** about an hour to beat the rival and the spider means the three bosses (Hornworm, Ground Beetle, Antlion Queen) are the second hour's content, which is where the design (`PROGRESSION.md`) puts them. They stay as they are. Lethal events now land in that same stretch, rather than piling onto a colony still fighting its first war.
- **Tests:** 71 (new: events 8–10 minutes apart; over a simulated hour, nothing lethal before 25 minutes, and lethal ones 20 minutes apart).

## Nov 1: bosses and events (build 19)

`PLAYTEST-2.md` items 29 and 30. Mark: "make them proper bosses and events, really enthralling stuff."

**Three bosses**, each in its own lair, built so you can read and dodge them:

- **The shape of every fight:**
  - The first time you come near a boss, a title card names it (name, epithet, how to beat it), the view shakes, a cinematic sting plays, and a boss bar appears at the top of the screen. The bar has a live line on what it's doing: "Rearing to thrash: get out of the ring!", "★ DAZED: BITE NOW! ★".
  - Every attack shows first as red on the ground: a ring, a circle or a lane. The fill grows to the edge as the blow nears, and it lands when it touches. Step out and you're spared. A rising whoosh plays for exactly as long as the warning.
  - Each boss turns at half health: the bar burns orange and its pattern changes.
  - Music goes to full danger while a boss fight is on screen.
  - Killed, a boss stays dead. It drops its meat and chitin and pays 🧬4, and the ant that bit last becomes a Legend with a title ("Shell-breaker"). A victory card names its trophy.
  - Only then can you hold its region.
  - A boss left alone goes back to sleep and heals.
- **The Hornworm** ("Glutton of the Tomato Rows"):
  - A fat green caterpillar 13 rings long, with white stripes and a red horn.
  - It strips the plants in its region, so your aphids there wither while it lives.
  - It rears up (its front rises) and thrashes a ring 3.6 tiles across: 4 damage and a shove.
  - It spits goo at the ants further off: a circle that hurts and leaves a slowing puddle for 7 s.
  - In its frenzy it's faster, attacks more often, and rolls down a lane, crushing what's in it.
  - 700 health. Trophy, **hornworm silk**: builders build rooms twice as fast.
- **The Ground Beetle** ("Armoured Hunter of the Rock Garden"):
  - Glossy black with a blue sheen and crossed sickle jaws.
  - Bites barely scratch it: workers 15%, you 35%, Venom ants 50%.
  - It paws the ground (a lane appears), then charges down it, bowling ants over.
  - If the charge hits a rock it's dazed for 4.5 s, otherwise 2.2 s. Stars circle its head, the bar flashes "DAZED", and it takes 2.5× damage.
  - Dodge, then punish. You can bait it into rocks.
  - Enraged, it charges twice. It snaps at ants close by.
  - 520 health. Trophy, **its shell**: the new **Armory** room (🌾40 🪨20 🪲20). Every ant is 50% tougher, and foragers shrug off one foot or beak.
- **The Antlion Queen** ("Terror of the Sandbox"):
  - Under the deepest pit, only her jaws showing through swirling sand.
  - Ants near the pit: the sand swirls orange under one, and if it's still there when the swirl closes, she drags it down.
  - Ants further off get sand flung at them: slowed and shoved toward the pit.
  - After every grab she surfaces for a few seconds, and only then can she be hurt. Eight ants at the pit's edge for two seconds draw her up for five ("Lure it with a rally mark", from the design).
  - At half health she tunnels from pit to pit, with a dust trail between them.
  - 480 health. Trophy, **her mandible**: fighters bite 15% harder, and the pits never drag your ants again.

**The event director**, after RimWorld's storytellers.

- **The rules:**
  - The first event comes at 9–11 minutes, then one every 4–7 minutes after each ends.
  - Lethal ones need a colony of at least 12 ants, or 30% of the queen's cap, and come after the 10-minute mark. Never two within 3 minutes.
  - After 6 calm minutes, lethal events become twice as likely.
- **What you see:** each is announced with a banner (gold for gifts, orange for hardships, red for lethal), its own sting, and a chip in the top bar (a countdown, or the outbreak's infected and stalk counts). It ends with a report.
- **Swarm day** (gift): winged queens from every colony rain down near your ants for 40 s, 6 protein each, and the birds come early.
- **A picnic** (gift): three treats land by the Picnic blanket, Lawn or Clover, and feet come every 16–28 s there for 100 s.
- **Heatwave** (hardship, after 10 minutes): for 2 minutes water drains, puddles shrink, dew dries, and ants outside are 15% slower. It breaks with thunder and rain.
- **War party** (lethal):
  - A **named champion** (Gravel-Jaw, Cinder, Old Crack…) leads 6 or more soldiers on your nest.
  - The champion is twice the size, red-ringed and labelled, with 45 health, bites three times as hard, and has its own boss bar.
  - Kill it and the rest break and run; the ant that did most of the work becomes a Legend, "Champion-killer". +2 🧬.
- **Cordyceps outbreak** (lethal, after 15 minutes with 15 ants; the first time it's twice as likely):
  - Two foragers far from home are infected and go faintly grey. For 15 s they work on: nurses inside can cure them, but left inside they can spread it.
  - Then they **turn**: grey-green, twitching, a stalk poking from the head. They abandon their work and climb to a high place beside a rock or stem, and clamp on.
  - At 35 s they die and a **fungal stalk** grows from the body, swelling and puffing spores. 12 s later it **bursts**, infecting ants within 3.5 tiles (60% of workers, 35% of fighters).
  - Fighters on patrol, your crew and you go after zombies and stalks.
  - It ends when nothing is infected and no stalk stands. A report follows ("the fungus took 4 ants, and your nurses cured 2"), plus +2 🧬, and the colony gets a little more resistant each time (−20% infection).

- **Tests:** 70 (new: lairs and the first-sight intro, the hornworm's ring that spares those who step out, the beetle's armour against a dazed beetle, its charge lane, the antlion queen drawn up by a crew, a boss kill's trophy, Genes, chitin, Legend and the Armory unlocked, the director's early gift, the outbreak's turning, stalks and spores, soldiers and nurses ending an outbreak, the war party's champion, a save mid-boss and mid-event). The browser test shows a Swarm day banner and walks up to the hornworm for its boss bar.

## Nov 1: sugar and chitin (build 18)

PROGRESSION step 2 (`PLAYTEST-2.md` items 30 and 31): two new materials, and the tech that was waiting on them.

- **🍯 Sugar**:
  - Honeydew: every load of aphid honeydew brings 1. Aphid farming makes it 3, and a held garden doubles that.
  - Sweet treats (jelly beans, gummy bears, cookies) pay 30% of their size in sugar as well as food, hauled by a crew or chewed off by Haulers.
  - Held regions give half a 🍯 a minute each with Flower nectar.
- **🪲 Chitin**:
  - Carcasses: every load of a dead bug brings 1; the ladybug, earwig, millipede and spider 2.
  - **Beetle shells**, a new item worth 8, turn up now and then on bark, compost, gravel, mulch, leaves and hedges.
  - The spider leaves a shell worth 15 when it dies.
  - A held Woodpile turns up more shells and doubles the chitin from its dead bugs; that is its new prize.
  - Foragers on Hunt bring shells as well as meat.
- Both show in the top bar once you have found any, with a first-find tip and a line in Help.
- **What they buy now** (all were marked "later build"):
  - **Queen** levels 5, 6 and 7 (100, 120 and 140 ants), with her level-5 traits: **Brood mother** (eggs 30% cheaper) or **Matriarch** (10% more health). Level 8 still needs 🪵 wood.
  - **Forager** IV (carries 2 more, range 130) and Mastery: **Trail queen** (every ant on a trail 40% faster) or **Lone wolf** (forages anywhere).
  - **Soldier** III (20% faster; picks **Alarm caller**, every idle fighter answers an alarm, or **Phalanx**, bites 50% harder with 3 or more together), IV (50% more health again) and Mastery (**Warlord**, fighters together bite 30% harder; **Guardian**, raiders hurt the queen half as much).
  - **Venom** III (stings 30% harder; **Neurotoxin**, stings slow bosses; **Lethal dose**, small foes die in one sting).
  - **Nurse** III (eggs 30% faster with nurses in; **Brood guard**, nurses guard the door from inside; **Attendant**, the queen lays 20% faster), IV (25% faster again) and Mastery (**Teacher**, every ant hatches Seasoned; **Caste-shaper**, fighter eggs at a worker's cost).
  - **Evolutions:**
    - Big crop: foragers carry 3 more.
    - Social stomach: your ant never starves, and colony starvation kills half as often.
    - Tough cuticle: every ant has 50% more health.
    - Brood chambers: eggs 25% cheaper.
    - Aphid farming.
    - Flower nectar.
- Still "later": the Major and Supermajor, Long-lived workers, the Honeypot, Polygyny, mealybugs, and everything wood pays for.
- **Tests:** 59 (new: honeydew sugar and Aphid farming, chitin from carcasses and shells, shells on the right ground, sugar from a treat, sugar and chitin paying for upgrades, the queen and evolutions, the Woodpile prize).

## Oct 31: running the colony (build 17)

The third build phase from `PLAYTEST-2.md` (items 27, 34 and 36), and the spider walking through a rock.

- **A Jobs page** (the clipboard button on the right): each kind of ant has a list of duties in order.
  - Duties: gather food, fetch water, fetch stone, hunt, dig and build, tend eggs, guard the door.
  - Defaults:
    - Foragers: food, water, stone, hunt (they haul meat).
    - Builders: dig and build, stone, food, water.
    - Nurses: tend eggs, water, food.
    - Soldiers: guard, hunt, food.
    - Venom ants: hunt, guard, food.
  - Tap a duty to put it first; ✕ turns it off. Each row shows what that kind is doing right now ("12 · 🌾 6 · 💧 2 · 🪨 2 · 2 resting"). Kept with the save.
  - This is the per-ant-type setting Mark asked for, with one simple page rather than a menu per ant.
- **How ants choose.** An ant ready for work takes the first duty on its kind's list that needs doing. Main duty first, then it helps with the next.
  - A gathering duty only needs more hands while what's short isn't already covered by the ants out on it (about one ant per 5 units short), so a colony spreads itself out. All the foragers no longer pile onto water.
  - Ants differ in how readily they answer, as before.
  - In rain nobody goes out to gather.
  - Fighters on guard keep at least two, or half of them, by the door. The rest hunt (a new state: they range out after small game and the caterpillar, and leave the meat for foragers) or forage.
- **Idle ants find work** (insight 27): with nothing of its duty in sight for 20 s, an ant out gathering switches to its next duty that needs doing. With nothing on their list to do, ants rest in their room, and the Jobs page says so.
- **More than one of each room** (insight 34, the proposal Mark approved):
  - **Cap:** one of each per queen level (two at level 2, three at level 3…).
  - **Cost:** each copy costs half again more than the last.
  - **Upkeep:** rooms eat food, half a unit a minute for the first of a kind and one for each extra.
  - **Space:** each needs its own dug pocket.
  - What extras add:
    - Hatchery: +2 eggs at a time.
    - Food store: +50% cap.
    - Cistern: +30 water.
    - Nursery: eggs 15% faster, and 3 more nurses can help.
    - Barracks: fighters eat 25% less protein.
    - Workshop: builders half again faster.
  - Tearing one out takes its share away again.
  - The Build sheet shows "1/2" and the upkeep now.
- **The spider kept its body on a rock** (Mark: "the spider clipped through the rock").
  - Cause: it only checked the one tile under its middle, but it's about five tiles across, so its body hung over rocks it skirted. Its stroll past the nest also joined waypoints with straight lines, cutting corners through rock.
  - Fix: it now keeps three tiles of room from any rock, wall or fence, both when planning its walk and when steering. The stroll is a planned path. If it's ever squeezed in somewhere, it only moves to roomier ground.
  - Over 45 simulated minutes its body was over a rock 21.6% of the time; now 0%. It roams as far as before.
- **Tests:** 53 (new: duties ordered and kept across a save, foragers on stone, food first when short and helping elsewhere when full, soldiers keeping a guard and hunting, nurses with and without eggs, the room cap, cost and upkeep, extra rooms adding up and coming off, the spider clear of rocks). The browser test puts stone first on the Jobs page.

## Oct 31: living creatures (build 16)

The second build phase from `PLAYTEST-2.md` (items 21, 22, 25, 26 and 28): the yard's animals act like animals, and you can see a fight land.

- **Four new creatures, spread across the yard.** Mark: "have them spread out through the area, not all bunched in the beginning."
  - Each region holds one of each kind its ground suits (ladybugs where there are aphids), three at most, placed anywhere in the region and at least 12 tiles apart. That's 21 to start, over 14 regions; none within 14 tiles of your nest, and no earwigs within 30.
  - Each keeps to its own patch, wandering within about 9 tiles of where it started.
  - A dormant region gets its bugs when you first walk in.
  - One that dies or leaves is replaced 100–160 s later, out of your sight (ladybugs fly in where you can see them).
  - Bugs with no ant within about 50 tiles wait where they are, which keeps the sim cheap.
  - **Ladybug:** flies in beside your aphids and eats them (1.2 food a second, so a patch stays empty while it feeds). Bite it to half health and it flies off (+1 🧬 the first time). Full, or after three minutes, it leaves anyway. 8 protein if you kill it outright.
  - **Earwig** (bark, mulch, compost, soil, hedges; not in the first four minutes): rushes any ant within 3.5 tiles and pinches for 2 (a forager dies; a soldier takes three). Foragers give it a wide berth. Below 30% health it runs for cover and is gone. 15 protein.
  - **Cricket** (lawns and long grass): hops 3–5 tiles away from any ant that comes near. Five hops and it's worn out for 5 s: that's when you catch it. 25 protein, the richest small game.
  - **Millipede** (compost, mulch, bark, soil, mud): harmless and slow. Bitten, it curls into an armoured ball for 8 s and takes 35% damage. 20 protein for a patient crew.
  - Patrolling fighters within 6 tiles go after them. Your crew and you bite them as you would the caterpillar. Kills pay xp, and the first of each kind +1 🧬.
  - Dead ones lie on their backs, legs up, and shrink as they're carried off.
  - Tap one for its card. Each has a first-sight tip, and a line in Help → Dangers.
- **The spider has habits.**
  - It crouches for a quarter second before it lunges (the tell), then springs.
  - It rears to bite.
  - After a kill it stops for 3.5 s to eat, facing its meal; it only bites back if bitten.
  - Three meals and it is full: it walks back to its web and sleeps for a minute, hunting nothing. "The spider has eaten its fill."
  - It dies on its back with its legs curled, then sinks away.
  - At its web it rests low, breathing slowly.
- **Fights you can see:** every bite throws a spark (pale for yours, red for the spider's and the earwig's, and for rival bites). Whatever is bitten flickers red: ants, the spider, the caterpillar, the new bugs. The caterpillar sags flat when it dies.
- **Rain knocks ants about.** Drops hit ants outside: they tumble a tile or two with a splash, and about a third drop what they carry (it stays on the ground). Your ant gets a smaller push. Raindrops pock the ground all round the view.
- **Sounds:** a tick when a bite lands, the spider's lunge hiss and its crunching meal, the earwig's pinch, the cricket's chirp and hop, the ladybug's buzz, the millipede curling, a squelch when a small bug dies, and a plip when a drop knocks an ant. All are charted in `SOUND.md`.
- **Tests:** 45 (new: the cricket's hops and tiring, the millipede's armour, the ladybug eating and fleeing, the earwig's pinch and the foragers keeping clear, the spider's meals and fullness, its crouch before the lunge, the bodies, rain knocks, sparks, bugs spread over the yard from the start and in a newly woken region, and bugs keeping still with nobody near, replaced out of sight, kept across a save). The browser test bites a millipede till it curls, taps a cricket for its card, and runs rain.

## Oct 31: clarity and feedback (build 15)

The first of the build phases from Mark's brother's playtest (`PLAYTEST-2.md`, items 1–3 and 10–24): the game now says what everything is and what just happened.

- **Notices are colour-coded:** red edge for danger (a raid, the spider, a cave-in, the mower, hunger), green for good news (Genes, a goal, a room finished, an outpost up), gold for something new (a region you walk into), blue for a battle report. The tutorial's own lines stay plain.
- **Things say when they're done:** "Hatchery finished: +2 eggs at a time." When Waypoints is evolved: "Outposts unlocked! Walk far from the nest and press Outpost."
- **Battle reports:** when a raid is beaten off, "Raid over. You lost 3 ants, killed 5 raiders, and they carried off 4 food." When the spider dies: "It cost you 6 ants."
- **The idle queen:** if she sits with no eggs, food to spare and room for more ants for 25 s, "The queen is idle and you have food: tap her in the nest and lay eggs." At most once every 90 s.
- **The ant card:** tap any ant for its name (if it has one), rank, kind, what it's doing ("Elite Forager, on guard", "carrying food home"), its experience and the next rank, and what its kind is for.
- **Names over named ants:** Elites wear their name over them on the surface; Legends get a ★ and gold. That's the twelve nearest the middle of the view.
- **The crew's reach:** holding Recruit shows a gold ring for how far the call carries (7 tiles, 10 with Rallying cry). While you lead a crew, a faint blue ring shows how far they'll follow (16 tiles) before giving up. The Recruit button shows your crew against the cap, such as "12/20", and its tip says how to raise it.
- **What everything is for:** each egg in the queen's sheet has a line ("Nurse: tends the eggs: they hatch faster"). The ant upgrades say "At Veteran (50 xp) it learns" and "At Elite (150 xp) it also learns", not "Veterans learn / Elites add".
- **A Menu button** tops the side column (Main menu: options, sound, new colony). **Escape** opens the menu, or closes whatever is open.
- **"Saved ✓"** shows for a moment each time the game autosaves (every 10 s).
- **Bigger badges** on the buttons, with a dark border, so counts read.
- **The puzzling noise** was the caterpillar's munching, a dull thud every third of a second in the Compost heap. It's now crisp leaf-chewing crunches in uneven pairs, quieter.
- **Tests:** 34 (new: the raid report, a room finished, the idle-queen nudge, the spider's cost). The browser test checks the ant card's text, the names over ants, the recruit ring and the Menu button.

## Oct 30: playtest notes, round two (build 14)

Mark's list after playing on his phone, all addressed:

- **The intro film stuttered and started badly.** It rolled its clock the moment it was made. The yard for its wide shots was built in one hitch on the first frame, more regions loaded mid-film, and every long frame made it jump ahead.
  - It now holds the first frame behind black ("Loading the yard…") until nothing is left to build for ten frames running. Then it compiles its materials, uncovers, and starts its clock and the music together.
  - After that the picture follows the music's clock, so a slow frame never lets them drift apart.
- **No more coloured rings under food.**
- **Pop-ups are simpler and rarer.** Tips are now a small card under the hint that doesn't pause the game and fades after 9 s (tap to dismiss).
  - Each tip shows once, ever: one seen in an earlier colony isn't shown again.
  - Help → Menu → "Show tips again" brings them back.
- **Names on the side buttons.** Nest/Yard, Map, Evolve, Zoom and Help wear their names curved round the circle, like the bottom buttons.
- **Evolution opens its own window.** Evolve, or a tap on the 🧬 chip, opens a full-screen book:
  - dark soil and gold, with drifting spores
  - pages you flip with ‹ › or a swipe: Goals, You, The Ants, Bodies, Senses, Nest, Society, Symbiosis, Ranks
  - each branch drawn as a tree, with nodes glowing gold (evolved), pulsing green (ready), dim (not yet) or dashed (a later build)
  - tap a node for its card (effect, cost, deed), then a big Evolve button, with a burst of light when you do

  The old Evolve sheet is gone.
- **Help is organised** into tabs: Basics, Colony, Growth, Dangers, Menu (main menu, show tips again, start over, the speed test).
- **Water pools.** Puddles are lumpy pools in rings: deep blue in the middle, bright at the shore, a dark wet-mud edge, and ripples spreading across them.
- **Antlion pits look like pits.** Each is a real sand funnel: a raised pale rim, grains streaking down the slope, a dark hole, and the antlion's jaws at the bottom.
- **Your health shows, and so do hits and death.**
  - A labelled ❤ health bar sits beside 🍖 hunger. Both pulse when low.
  - The screen edge flashes red when you're bitten or stung, and beats red while health is under 40%.
  - Dying darkens the screen. The rebirth sheet now opens with "You died" and what killed you, then the choice of what to come back as.
- **The nest's edges don't show.** Zoomed out underground, the soil bands carry on past the cutaway, a little darker, instead of ending at a box edge. Zooming out stops at a little more than the nest's width.
- **Hand-holding for the first minutes.** The intro now runs past the landing, through:
  - fetching food (and what ❤ and 🍖 mean)
  - laying a Builder
  - digging a pocket and placing a Hatchery
  - laying Foragers
  - recruiting a crew
  - laying a trail
  - opening Evolve

  Each step waits for you to do it, pulses the button it names, and has a "Skip tips" button.
- **Your ant is slower, and you can improve it.**
  - It walks at 66 instead of 85, barely faster than a forager's 60.
  - A new **You** page under Evolve has five levels:
    1. Long legs, +15% speed
    2. Thick shell, health 12 → 20, then pick Sprinter (+10% speed) or Iron stomach (hunger drains half as fast)
    3. Strong jaws, bite +50%, then pick Big mandibles (carry 8) or Rallying cry (recruit from 10 tiles)
    4. Swift, +15% speed again
    5. Mastery: Hero (your crew keeps up and bites 20% harder) or Survivor (once a life, a killing blow leaves you at 1 health)

    These carry over every time you're reborn.
- **Weather is gentler.**
  - Rain comes every 8–12 minutes (was 3–5), and the first after 8 minutes (was 4).
  - Twenty seconds before it, thunder rumbles in the distance with a warning to get builders inside.
  - The rain itself is a soft patter (was a bright hiss with a drip every 90 ms), with long rolling thunder now and then.
- **Found while testing: sheets redrew five times a second.** They compared against the browser's own rewrite of their HTML, which never matches, so a tap could land on a button just as it was replaced. They now redraw only when their content changes.
- **Bots** (6 games, 20 minutes): the same pattern as build 13. Seed 21 still loses its queen to raiders; the rest hold 8–15 ants. A slower ant doesn't starve the bot colonies.
- **Tests:** 30 (new: your ant's pace and levels, Thick shell, thunder before rain and the rain interval). The browser test walks the Evolution window's pages, picks and evolves a node, and opens Help's tabs.

## Oct 30: outposts, held regions and the goals board (build 13)

Mark: "Let's build it and then test it." The rest of step 1 of `PROGRESSION.md`. Data in `growth.js` (OUTPOST, GUARDIANS, PRIZES, GOALS, SETS); logic in `sim.js`.

- **Outposts.** Evolve **Waypoints** (Senses: 🧬1 🪨10; its deed, scouting 3 regions, halves the 🧬). Then, out in the yard, an **Outpost** button joins the dock.
  - It costs 10 stone and goes up as a cairn of pebbles with a twig and a leaf for a flag. You and any of your ants within 3 tiles pile it: 30 ant-seconds, so about 30 s alone or a few with a crew. It rises stone by stone.
  - At least 14 tiles from the nest and from other outposts. You can have 2, plus one per queen level, plus one for the Explorer set. None in fire-ant ground.
  - Raised, it lifts the fog 20 tiles round it, and **foragers may roam 26 tiles round it and along a band of road back to the nest**, as they do round home. Trails within 6 tiles of it never fade (except in rain).
  - A foot coming down on it twice, or one pass of the mower, knocks it flat.
  - The button says why when you can't (too close, out of stone, at the cap). Outposts show on the yard map, with ⛳ on the plan.
- **Held regions.** A region is **held** while a raised outpost stands in it and its guardian is beaten. That pays 🧬1 the first time, and the region's **prize**, for as long as the outpost stands.
  - Guardians so far: the spider (the Flowerbed), the pavement ants' queen (the Patio), the fire ants (their two regions, not holdable). Regions whose bosses come in later builds can be held with an outpost alone for now. Home (Under the Rock) has no prize.
  - Prizes: berries, scraps and seed rain grow back twice as fast (Flowerbed, Grill, Feeder); garden aphids refill twice as fast (Tomato Rows, Beans, Peppers, Herbs); water cap +40 (Spigot); eggs hatch 15% faster (Compost); crews carry treats 30% faster (Sandbox); the mower warns twice as early (Lawn); a treat lands every few minutes (Picnic Blanket); feet or birds half as often (Back Steps, Birdbath); twice the pebbles (Woodpile, Rock Garden); acorns (the Oak). Every other region: its food grows half again as fast.
  - Killing the rival queen makes their nest your outpost.
  - The yard plan's region cards now say how to hold each region and what its prize is; held regions show ★.
- **The goals board** (Evolve → Goals, the first tab now):
  - Three goals at a time, next, soon and later, paying 🧬1, 2 and 3. A goal completes once it reaches the board, so the board always points at something new.
  - 24 goals in five themed sets. Finishing a set pays for good:
    - Explorer: one more outpost
    - Garden: foragers carry one more
    - Hunter: fighters bite 10% harder
    - Builder: rooms build 25% faster
    - Colony: eggs hatch 10% faster
- **Choose your rebirth.** When your ant dies, a sheet always opens: come back as a named Elite (build 12), or hatch again as any kind you've unlocked (Forager, Builder, Nurse, Soldier, Venom ant).
- **Tests:** `tests/outposts.test.js` covers the outpost rules, raising one, roaming and lasting trails, holding and losing a region and its prize, the board, a finished set, rebirth as a soldier, and saves. The browser test raises an outpost at the Spigot, holds it, and shoots the Goals tab and the map.
- **Bots:** the bot buys Waypoints after the queen's first upgrade and raises outposts far out. Colony sizes and losses look like build 12.1. Head-to-head, six games a side on two seeds: food income was 33 vs 24 on one seed and 21 vs 27 on the other, so the swing is noise. The bot places outposts blindly, mostly in the home region (no prize), so it rarely holds anything. A player choosing rich regions will.

## Oct 30: three progression decisions

Mark, on the open questions in `PROGRESSION.md`: "No. Yes. House inside."

- **No seasons.** The year-of-four-seasons layer is shelved. Anything that leaned on it (summer heat, winter stores, hibernation) gets another reason or goes.
- **Three great evolutions per colony**, out of twelve, as proposed.
- **After the yard comes the house**, the original plan's Act 2: the edges (sidewalk, driveway, porch, doormat), then the ground floor (kitchen, pantry, bathroom), then the deep house (walls, basement, attic). No separate New Game+ for now.

## Oct 30: no more lines across the ground, softer footsteps (build 12.1)

Mark, playing on his iPhone: dark horizontal lines across the yard as he walks, and "the walking audio is too crisp and sharp. Maybe more muted and low to mid and rounded."

- **The lines were depth fighting.** Under the ground lie two more layers: a dark green underlay (0.6 units down) and each region's far painting. A phone's depth buffer is coarser than a desktop's, so far from the camera it couldn't tell them from the ground. They fought, and with a camera looking north the fight shows as horizontal bands of underlay.
  - Not reproduced at first: the headless test renders are too precise. Faking a coarse depth buffer (a tiny camera near plane) brought the bands straight back on build 12.
  - The fix: both under-layers now draw first and never write depth, so the real ground always wins. The same faked test shows no bands.
  - The far painting also stays under the built ground now, a tile wider, so any crack where a region's fine ground grid meets a coarse unbuilt neighbour shows ground, not dark green.
- **Footsteps** are a soft, low thud (a low-passed grain around 500 Hz and a little thump), not a 6 kHz tick.

## Oct 29: Genes, ant upgrades, veterans and the evolution tree (build 12)

Mark: "Make it so. Start coding it in." This is the first piece of `PROGRESSION.md`, everything that works with what the yard has today. The data lives in `game/src/sim/growth.js`; the sim applies it; the new **Evolve** button (a twist of DNA, under the map button) shows it.

- **🧬 Genes,** earned by playing, never by waiting:
  - 1 for each region you scout for the first time
  - 1 for the first of each kind of thing brought home (a crumb, a berry, dew, a pebble, caterpillar meat…)
  - 1 for every 10 eggs hatched
  - 1 for your first hunt; 3 for the spider (1 each time after); 5 for the rival queen

  A 🧬 chip joins the top bar once you have any, and a chime plays for each.
- **Upgrades for each kind of ant** (Evolve → Ants), bought with materials, once for the whole kind:
  - Forager, Builder and Nurse have five levels; Soldier five; Venom ant three. Levels 2 and 3 are bought by picking one of two abilities, for good; level 5 is a gold "mastery" pick.
  - The Forager's first three levels are the old "Train foragers". That button is now "Train ants · evolve" in the queen's sheet.
  - Every level is shown. The ones costing 🍯 sugar, 🪲 chitin or 🪵 wood say so and can't be bought until those materials arrive. That leaves Forager 1–3, Builder 1–3, Soldier 1–2, Venom 1–2 and Nurse 1–2 buyable now.
  - Live picks:
    - Forager: Trailblazer (stronger trails) or Sprinter (faster off a trail); then Pathfinder (spots food twice as far off) or Hauler (foragers chew pieces off treats and bring them home on their own).
    - Builder: Shorer (cave-ins less than half as likely) or Mason (rooms cost 25% less stone); then Excavator (digs 50% faster) or Field engineer (repairs twice as fast).
    - Soldier: Doorkeeper (raiders steal nothing past a guarded door) or Escort (patrols twice as far; counts against birds from farther).
    - Venom ant: Paralytic (stung spiders and caterpillars slow to half) or Hunter (a kill lays a trail home).
    - Nurse: Wet nurse (eggs cost 30% less food) or Medic training (hurt ants heal in the nest).
  - **The queen's trait** at level IV: Fertile (eggs 20% faster) or Hardy (raiders hurt her less than half as much). Her levels V–VIII and later traits are listed but need sugar.
- **Veteran ranks** (Civilization's unit experience):
  - Ants earn experience at their own job: foragers per load home, builders per cell dug or room built, fighters by biting and killing, nurses per egg hatched, any ant for getting out from under a foot or acorn, a crew for hauling a treat.
  - Five ranks: Callow, Seasoned (10 xp), Veteran (50), Elite (150), Legend (400, or the spider's killing bite). Each makes an ant 10% better at its job, up to 40%.
  - **You can see it:** callows hatch pale, as real ants do, and darken; Veterans stand a little bigger; Elites wear a pale-gold ring and Legends a gold one.
  - **Doctrine:** with dozens of ants, picking per ant would be a chore, so each kind of ant has one setting: which promotion its Veterans learn, and which second one its Elites add (Trailwise, Strongback, Keen nose, Dodger for gatherers; Quick digger, Steady, Packer, Fixer for diggers; Brawler, Guard, Hunter, Skirmisher for fighters; Gentle, Healer for nurses).
  - **Elites get names** (Thorn, Burr, Pip…), Legends a title ("Spider-bane"). Named ants who die are listed under Evolve → Ranks, "The fallen".
  - **Rebirth:** when your ant dies and you have named ants, you can come back as one of them, where it stands, instead of waiting for an egg. The first step of "choose your rebirth".
- **The evolution tree** (Evolve → Evolution): all five branches and their ~60 nodes are listed, with what each needs first. These 15 are live now:
  - Strong mandibles (fighters bite 25% harder), Formic spray (fighters bite from 2 tiles), Stridulation (every fighter answers an alarm), Trail runners (25% faster on a trail).
  - Strong scent (trails last twice as long), Bigger crews and Bigger crews II (recruit 30, then 45).
  - Hatchery II and III (4 and 5 eggs at once), Store II and III (400 and 1,000 food), Insulation (cave-ins halved, rain caves in once not twice).
  - Division of labour (experience 25% faster), Drill hall (fighters hatch Seasoned), Colony memory (every ant hatches Seasoned).
  - Each has a deed that halves its 🧬 once done (for example: Strong mandibles, kill 20 rival ants; Hatchery II, hatch 30 eggs).
  - The rest show faded, "coming in a later build". Respec, the lineage pick and the great evolutions are not built yet.
- **Saves** move to format 11; build 11.6 saves load with everything at zero.
- **Balance.** A first version made fresh ants 10% worse at their jobs. That shrank every bot colony (median 15 ants at 25 minutes, against 27 on build 11.6), because every ant starts fresh, so Callow is now a look only.
- **Bots, 30 minutes, 14 games:** losses match build 11.6 (seed 21 loses its queen to raiders on both builds; the rest survive). Colonies reach 16–58 ants, and earn 15–29 Genes. The bot buys growth only with a full Food store, after the queen, so it spends little; a player choosing well should do better.
- **Tests:** `tests/growth.test.js` covers Genes, the tree's locks and costs, Store II/III, upgrade levels and picks, ranks, rebirth, doctrine and saves. The browser test opens all three Evolve tabs, buys a node, and takes over a Legend.

## Oct 29: the rest of the wish list (build 11.6)

Mark: "Do it all now." Everything left on the backlog, in one build.

- **Slower movement.** Everything outdoors moves at 1.15 instead of 1.4 (`SURF`): your ant, the colony, the spider, raiders. That's about 18% slower. Mark's word was "much slower", but 25% starved every bot colony, so 18% is a compromise.
- **Foragers stay close until trained.**
  - On their own they range 40 tiles of path from the nest, about the home region, or farther only along a scent trail you lay. The old range grew by itself with colony size.
  - **Train foragers** at the queen buys range and speed:
    - level 1: 55 tiles, 10% faster, 🌾15 (affordable before a Food store)
    - level 2: 75 tiles, 20% faster, 🌾40 🪨10
    - level 3: 100 tiles, 30% faster, 🌾80 🥩10 🪨25
  - Far food is reached by scouting and marking the way, or by training.
- **Dug dirt goes somewhere.**
  - Each dug cell is a load a builder carries up the shaft and out to the **spoil heap**, a mound of soil about eight tiles from the entrance that grows with every load.
  - With 3 loads waiting, digging stops until they're hauled.
  - Builders pick hauling themselves, so digging takes real work and builders, and you can see it outside.
  - Saved with the game.
- **The spider, investigated.** Over 30 simulated minutes with a hungry colony foraging, it killed **no ants**:
  - 58% of its time in the Flowerbed, and 30% circling the nest without hunting.
  - Its chase was half an ant's speed and its bite reached barely a tile, so everything outran it.
  - Changed: it now hunts its territory, within 60 tiles of its web.
    - **At its web it waits in ambush,** and ants only notice it close up.
    - It lunges at what wanders within 4 tiles: a fast burst, then a 40-speed run.
    - Roaming, it stalks ants within 5 tiles and gives up after 6 s, so a running ant still escapes.
    - Its bite reaches 1.4 tiles, and it passes the nest every fourth leg (was every third).
  - Result in the same test: about one kill every three minutes, mostly round the Flowerbed. It guards the berries now. Thirty ants or five Venom ants still kill it.
- **The queen looks alive.** She crawls from cell to cell instead of jumping: head down the shaft wall as she digs in, legs walking. Her legs shuffle while she waits for your next tap, and once settled she paces her chamber.
- **Building is a dust cloud.** While a room is built, a pale cloud of dust hides it, with clods of dirt flying out. When it's done the cloud swells and clears, and the furnished room is there. Bricks being dug puff dust as builders chip.
- **Chambers are organic.** A finished room is drawn as one squarish oval with a gently wobbling ceiling and walls and a flat floor, on the same cells. Tunnels stay as they were.
- **Items stand out.** Anything you can pick up sits in a ring of its kind's colour: gold food, blue water, red protein, grey stone, pink treats.
- **More icons:**
  - Each caste and room has its own line icon in the queen and build menus.
  - Costs show as the top bar's resource icons (🌾10 🪨5), not words, and hatch times as ⏱20s.
- **Sound, the rest** (`docs/SOUND.md`):
  - **Music** (`audio/music.js`): synthesized like the effects, in A minor at 92 bpm, an eight-bar loop of pad, bass, marimba and drums. It shifts with the game rather than switching tracks:
    - a title mix, a yard mix and a nest mix
    - a danger layer (fast hats, a low pulse) that rises when the spider is near, raiders march, the queen is hurt or a visitor strikes nearby
    - rain muffles it
  - **Ambience:** breeze and birdsong outside, an earthy hum below, crickets on the lawns, drips in the wet ground, builders chipping while you watch the nest.
  - **The second and third batches:**
    - your footsteps, sheet swishes, the tooltip tick, the map's whoosh, the title stinger
    - a groan when a treat is too heavy, a tummy rumble when you're hungry, bites in fights
    - dig ticks, crumbles, pats, a scrape for repairs
    - the full-colony and full-store chimes, dew twinkles, a cheer for a big haul
    - thunder, and drips as rain ends
    - the spider's feet, the caterpillar munching, the antlion's snap, and a bonk for greyed-out buttons
  - **Options:** Music and Effects each Off, Quiet or Loud, beside Sound on/off.
- **The military playtest bot works again.** It wanted a Barracks first, which costs 30 food when the store holds 20. It now skips rooms it can't afford yet.
- **Bots, 30 minutes:**
  - 6 of 7 colonies survive. Two reach 60 ants; most build every room.
  - One loses its queen to raiders. That seed also lost sometimes before.
  - Growth is slower than build 11 (most stayed 20–40 ants), and starvation is the main cause of death.
  - The bots buy forager training but don't scout far with trails the way a player can, so a human should do better.

## Oct 29: tap a thing to see what it is, and tips with a design (build 11.5)

Mark: "maybe when you click on it, it kind of tells you." And: "Text boxes for the tooltips and stuff, they're a little simple. Let's give them more of a design."

- **Tap anything on the surface for its card** (`ui/callout.js`). A small card pops up over it: an emoji, its name, and one line on what it's for. For example: "Gummy bear: a treat, 50 food, needs a crew of 8." "Puddle: water, it never dries up." "Wolf spider: run!"
  - It covers food, treats, water, pebbles, meat and protein, aphids, the spider, the caterpillar, your ants and rivals, robins and toads, and both nests.
  - It follows the thing as the camera moves and fades after two seconds.
  - The tap still walks your ant there. Food under an ant wins over the ant.
- **Tips and cards share a new look,** matching the title screen: cream, an inked border, a hard shadow, and a pointer to what they name. The button tips use it too.

## Oct 29: smooth rocks, and trails like smoke (build 11.4)

Mark: "Rocks look really jagged on the overworld." And: "smooth out the scent trails. Right now it's just like big squares… maybe like a light smoke that lingers."

- **Rocks are smooth.** Every rock was an icosphere with each vertex pushed in or out at random, drawn as flat facets: spikes and shards. Now each is one welded surface:
  - bulged by a few soft lumps, flattened underneath, and smooth-shaded (`smoothRock` in `yardScenery.js`)
  - this covers the big rock over home (now textured stone, not painted bands), pebbles, boulders and the plain rocks on blocked ground
  - stepping stones keep their flat tops
- **Trails are a drifting haze, not squares.** The overlay now works like this:
  - It has two texels a tile, smoothly filtered.
  - Each frame the trail and alarm scent is blurred a little, so the haze has round edges instead of tile steps.
  - Two layers of slowly drifting noise break it into wisps that move as you watch.
  - It is pale green and more see-through, with a floor so the trail's path stays readable.
  - Alarm scent tints it red, as before.
  - It costs about 1–2 ms a frame with trails everywhere, on the test machine's software renderer.

## Oct 29: sound effects, the first batch (build 11.3)

The plan is `docs/SOUND.md`. Built so far:

- **An engine with no audio files** (`audio/sfx.js`): every sound is synthesized with Web Audio from a few blocks (blip, chirp, puff, thump, grain), like the film's score.
- **Rules for every sound:**
  - Heard from where it happens: panned, fading with distance from the camera, and quieter from inside the nest. Warnings stay audible from anywhere.
  - A cooldown and a cap on copies at once, and a small random pitch and volume change on each play.
  - Sound starts on the first tap, as browsers require.
- **The sim knows nothing of sound.** `audio/watch.js` compares the game each frame with the frame before, plus the sim's new events, and plays what changed: a pickup, an egg, a stomp, a toad's tongue. Loops (rain, the mower, the spider's menace, fire ants) are set to a level every frame and fall silent behind the title screen.
- **About 50 sounds,** covering most of the chart's priority-1 batch: buttons, your ant, the colony's key moments, rain, and every danger's warning and hit. The list is in `SOUND.md`.
- **Options:** Sound on/off covers them. Separate Music and Effects volumes come with the music.

## Oct 29: less reading, and names on the buttons (build 11.2)

Mark: "All the instructions and stuff tend to be a lot of text… we don't want to create reading fatigue." And: "text that revolves around the buttons… on the bottom of the screen."

- **Names curved over the bottom buttons.** Each bottom-bar button wears its short name on an arc over its top: Pick up / Drop / Lift, Trail, Recruit, Release, Enter, and in the nest Dig in, Queen, Build, Exit. They dim with a disabled button. The side buttons keep their hover and long-press tips.
- **Every explainer is one or two short lines** (was a paragraph). For example, Stone is now "Builders fetch pebbles. Stone pays for rooms and queen upgrades." The full numbers stay in the Build and queen sheets, where you need them.
- **The intro steps are one line each,** and the Help sheet is a short reference: goal, controls, resources, ants, rooms, dangers.
- **Messages from the game are shorter too:** "Raid! 5 rivals are coming." "A shadow! Get out from under it!" "A cookie fell by the Patio! Crew of 6 to carry."
- Copy no longer comes from build 6 word for word; `ui/copy.js` says so.

## Oct 29: the film rolls by itself, then a title screen (build 11.1)

Mark: "On the first run… it just starts with that video. And then after that we need an intro screen. Like a main menu… load game, play game, options."

- **No poster.** A new player goes straight into the film. Browsers won't play sound before the first tap, so when sound is blocked the film starts silent with a pulsing "Tap for sound" button. The first tap anywhere starts the score in time with the picture: cues already past are dropped, and the beat picks up mid-bar.
- **The title screen** (`ui/title.js`) comes after the film, and opens every later run instead of it. The logo sits over a slow drift across the live yard round home, with the game paused.
  - **Continue** (once a colony has started) or **Play**.
  - **New colony**, which asks first if there's a colony to lose.
  - **How to play** (the Help sheet), **Options**, and **Watch the intro**.
- **Options,** kept in the browser apart from the save:
  - **Sound:** on or off. The film follows it now; game sounds will too.
  - **Graphics:** Auto (sharp, easing off on a slow device, as before), Sharp (never eases off) or Fast.
- Help's "Watch the film again" became **Main menu**. The film's last button now reads "Continue", into the menu.
- **Load game:** there is one saved colony, so Continue is the load. Save slots can come later if wanted.
- **Fixed: what you've seen was lost on reload.** Since build 10.4 the save wrote the fog-of-war map over the record of what you'd seen. After any reload the film and every explainer came back, as if new. The map now has its own key, and saves written before the fix still load.

## Oct 27: the whole yard, loaded in pieces (build 11)

Mark: "Now let's take the time and thoughtfully build out the entire map area. Let's do it in separate chunks that load when you cross into the other areas for now."

- **The whole yard is built: 70 regions, 800×560 tiles,** out to the fence. The 50 new ones follow the yard plan (`docs/YARD.md` has every region's contents):
  - **Along the house:** the trash cans by the side gate, the porch, the cooler.
  - **West:** the gravel side path, peppers and squash, the herb patch, the garden shed, the thistles and the toad's hole.
  - **East:** the rock garden, the suet feeder, the stepping stones and gnomes, the Oak, its roots and fallen limb, and a hedge along the whole east fence.
  - **South:** the great lawn (sprinkler, trampoline, toys, a fairy ring, daisies), the wet strip (reeds, slugs, a drain, mud), the leaf pile, and fire ant country in the far corner.
  - About 600 landmarks of 40 new kinds, eight new kinds of ground (gravel, deck boards, hedge litter, oak shade, wild grass, wet mud, leaves, fire ant earth), and new food: fallen acorns (a crew of four) and slugs (protein).
- **New dangers.** Each shows itself first, like feet and robins:
  - **Toads** hunt the wild corner, the wet strip and the leaves. Each one flicks its tongue five tiles at the nearest ant, five times, then leaves. Five fighters drive it off.
  - **Acorns** fall under the Oak. They kill what they land on and stay as food.
  - **Bug spray** at the shed: a cloud that kills anything inside it for two seconds.
  - **Fire ants:** their red earth stings our ants a little every half second.
- **Chunks: the scenery is built a region at a time.** A region is built when the camera comes within ¾ of a region of it, and thrown away beyond 1.3 regions.
  - Building is sliced into small steps, at most 6 ms a frame, so crossing into a new region never stalls. A region already on screen gets 24 ms a frame. Whatever is on screen after a jump is built at once.
  - Zoomed out on a wide screen, the view can reach past that ring. The reach then grows to cover the ground on screen, up to 1¼ regions.
  - The opening film builds the regions round home, the patio and the flowerbed while its poster is up.
  - A region thrown away keeps a small painting of its ground for the distance.
  - The scent overlay is now a 96-tile window that follows the camera, instead of a whole-yard texture uploaded every frame.
  - Checked: touring all 70 regions leaves nothing behind (no geometry or textures leak). The busiest region is about 61k vertices; one takes about 0.4 s of work, spread over frames.
- **The sim is not chunked,** only the drawing. All 70 regions are simulated, but the 50 new ones are **dormant** until you first walk into one: no food grows and nothing strikes there. When you enter, its starting food appears and it stays awake. Pathfinding searches a box round the start and goal instead of the whole yard. Scent fades only where there is some.
- **The map is pieced together.** It can't photograph the whole yard at once any more, since most of it isn't built. Instead, each region is photographed the first time it is built near you, and the photos are kept, saved with the game, as one picture. The photo is read back asynchronously, because a plain read-back stalled the frame for seconds in the software renderer.
- **Edges:** the thicket is gone. The house wall runs along the north; a board fence closes the rest, with the neighbours' grass beyond.
- **Saves:** format v10, under `underfoot-v11`. Older saves don't load: the yard is a different size.
- **Deferred:** the rival colonies the plan puts in the new regions (odorous house ants at the trash, Argentine ants in the garden, carpenter ants in the Oak, the fire ants as a real colony with a queen). For now the fire ants are stinging ground.
- **Bots:** in seven 30-minute games all colonies survive, and five reach 40–60 ants. One wins, taking the rival queen at 27:53. The military bot builds no rooms, but it does the same on build 10.4: its barracks-first plan predates the deeper topsoil, so this is the bot, not the build.

## Oct 27: a compact HUD, and a real map with fog of war (build 10.4)

Mark: "Minimize the menu items. Everything looks so big. The words on the bottom… should be symbols or something smaller… same thing with the food symbols up top. Maybe when you highlight over them or press them, it'll tell you… Real estate is massive in a game like this." And: "when I click on map, it's not just squares, but… a realistic version of the map… based on what I can see… a fog of war… I can zoom in on it."

- **Icon buttons.**
  - Every HUD button is now a small round line icon (`ui/icons.js`): 46 px at the bottom, 38 px on the side.
  - Its name is a tip on hover, or on a long press on touch screens; a long press shows the tip instead of acting. The name is also the button's `aria-label`.
  - Numbers ride as a badge: Lift 3/6, Release 4, and a live count while holding Recruit.
  - +200 and Reset moved into Help.
- **Stat chips.** The two-line stats box is one thin row of emoji chips (food, water, protein, stone, ants, plus queen health, rival queen, rain and cave-ins when they matter). Touching a chip says what it is. The ⋯ at the end opens the full colony numbers (income and upkeep, rival count, ants by kind, fps). Hint text and the sheets are smaller and tighter, and the desktop HUD scale is capped at 1.3.
- **Learning the icons.** When a hint tells you to press, tap or hold a button by name, that button pulses, so the intro and hints still teach the controls.
- **The map is a photo of the yard.** The Map button opens a full-screen map. It's the real yard rendered straight down by the game's own renderer (`app.snapshotMap`), with fog and vertex snapping switched off for the shot.
  - **Fog of war:** the sim keeps `seenMap`, a 4×4-tile grid of what you've seen. It's revealed in a 13-tile circle round your ant as you walk, and round home from the start, and is saved with the game.
  - **Display:** unseen ground is under a dark, misty fog with soft edges. Region names appear once you've seen part of a region and it's big enough on screen to label.
  - **Controls:** pinch, scroll, double-tap or the +/− buttons to zoom; drag to pan; tap a spot for that region's card ("Unexplored" if you haven't been there).
  - **Pins:** You, the Nest, and the rival nest once seen.
  - The schematic plan of the whole backyard is still one tap away: "Whole yard".
- **Rejected:** revealing the map wherever any of your ants goes. "Based on what I can see" reads as your ant's own eyes, and it makes exploring with the player ant matter.

## Oct 27: smoother motion and a sharper frame (build 10.3)

Mark: "Can we improve the graphics a bit more? It's a bit choppy still. Keep smoothing out and removing over-pixelation."

- **Choppy motion: the sim steps at 20 Hz and creatures were drawn where the last step left them.** At 60 fps, ants, the spider, the caterpillar and the camera following you moved in visible jumps every third frame. Each creature now remembers where it was before the last step, and is drawn the right fraction of the way between the two (`snapshot`/`blend` in `main.js`). A jump of more than two tiles, such as into or out of the nest, is still drawn as a jump. The sim itself is unchanged.
- **Over-pixelation, all PS1 settings eased back:**
  - Render at the window's CSS resolution: `pixelSize` 1.75 → 1. Big windows coarsen past 2.4 M pixels.
  - Multisampled edges: MSAA ×4 in the framebuffer.
  - Textures filtered smoothly and mipmapped, so far ground no longer shimmers.
  - Affine texture swim off by default.
  - Gentler colour quantising: 96 levels, dither 0.2 (was 48 levels, 0.5).
  - Walk cycles at 14 frames a second (was 10).
  - The PS1 character stays in the low-poly models, palettes and vertex snapping, which is now per screen pixel and barely visible.
- **Automatic quality.** Full resolution is about 3× the pixels of before. Any real GPU is fine with that, but a weak phone might not be. If the game runs under 40 fps for three seconds in a row, it drops one quality step: no MSAA, then 1.5× pixels, then 2×. It never steps back up, so it can't flicker between steps.
- **Rejected:** dropping the sim to a variable timestep. Interpolation gives the same smoothness without touching the sim or its tuning.

## Oct 27: big screens (build 10.2)

Mark tried the itch.io build on a PC: "it's very small".

- **The views were framed for a phone held upright.** The camera fitted 13 tiles across the screen's width. In a wide window that zoomed the world in hard, the HUD stayed phone-sized, and the bottom buttons and sheets stretched edge to edge.
- **Frame by height on wide screens.** `fitWide(aspect)` in `config.js` is 1 on a phone and grows with how much wider the screen is than a phone (390×844). Both views multiply their width by it. A PC shows more of the yard to the sides at the same scale as a phone, instead of magnifying it.
- **Scale the HUD and the PS1 pixels with the window.** `uiScale` is 1 on a phone and up to 1.6 on a desktop (about 1.4 at 1080p). It sets `--ui`, which zooms the HUD, the bars and the sheets. The framebuffer's pixel size grows with it, so the PS1 look and the pixel count stay close to a phone's.
- **Keep the controls together.** The bottom bars and sheets are capped at 560 px wide, centred.
- **itch.io:** embed at a landscape size (e.g. 1280×720) with the fullscreen button on; the game fills whatever frame it gets.

## Oct 27: deeper topsoil (build 10.1)

Mark, on the nest: "First soil should be deeper, and all others are equal."

- **Soft topsoil is now 20 rows deep (was 14).** Packed soil and clay below it are 14 rows each. Clay was 12 rows, because the nest stopped at row 40. The nest is now 48 rows deep.
- **One place for it.** The bands are `SOIL_ROWS = [20, 14, 14]` in `sim.js`. The nest view's soil bands and their labels, the dig rules, the bot and the help text all read from it.
- **Effect:** more of the early nest is cheap to dig before a Workshop is needed. In two 20-minute bot games, both built every room and reached 60 ants.
- **Saves:** format v9, under `underfoot-v10`. Older saves don't load, because the nest grid changed size.

## Oct 27: the first ring of new regions (build 10)

Mark, on the yard map: "That's a great space, let's start building."

- **Build the space out first, ring by ring.** I read "start building" as building out the yard on the map, and left claiming regions for the next step. The ring around the first nine was the natural slice: it touches the house, the vegetable garden and the great lawn, and each new region has something of its own. The built yard is now a 5×4 block of the yard map (columns 2–6, rows 1–4): 20 regions, 400×320 tiles.
- **The eleven new regions:**
  - The **Back Steps**: crumbs and feet.
  - The **Grill**: hot dog scraps as protein, potato chips for a crew of four, and feet under the table.
  - Two **vegetable garden** regions: tomato plants, bean poles and lettuce in dug beds, with **aphid clusters that refill like puddles** (endless honeydew).
  - **Under the Bird Feeder**: the most seed in the yard, and the most birds.
  - The **Birdbath**: splash puddles.
  - The great lawn's top row in long grass: the **Kiddie Pool**, the **Swing Set**, the **Clover Patch**, the **Molehills** (dead bugs) and the **Dandelions**.
  - The full table is in `docs/YARD.md`.
- **Two new dangers, both telegraphed by a shadow,** so they're readable on a phone:
  - **Feet** (Back Steps, Grill, Swing Set): the sneaker from the opening film comes down. Its shadow spreads for 2.2 s, and in the last second two in three ants under it run. Everything under the sole dies.
  - **Robins** (garden, feeder, birdbath, great lawn): a robin drops in, hops after the nearest ant and pecks four times, then leaves. Five fighters around it chase it off.
  - Both only come while ants are out in that region, and only interrupt you (with an explainer) when they land near your ant.
- **Rejected for this ring:** a second rival colony (Argentine ants in the garden) and a mole that surfaces under ants. Both are good, but each needs its own systems; the shadow-strike covers feet and birds with one.
- **Protein near home.** The first bot runs stalled at 20 ants in two games out of four. Caterpillars now spawn across more regions, so a far kill left its meat out of foragers' reach (or under the mower). With no protein there was no barracks, no soldiers, and raiders killed the queen. Fixed two ways:
  - Caterpillars mostly spawn near home again (Lawn, Compost, Flowerbed).
  - Under the Rock and the Lawn now turn up a dead bug now and then.
- **Plumbing:**
  - Regions are looked up by key (`REGION.rock`), not by index.
  - Scent decays only on tiles that have some (`s.hot`). Saves store scent sparsely.
  - Each region's ground is painted the first time the camera comes near, nearest first, so the bigger yard loads as fast as before.
  - The opening film's anchors follow the Patio region wherever the block puts it.
  - Save format v8, under `underfoot-v9`.
- **Bot results** (30-minute runs):
  - All seven games survive.
  - The four sensible games reach 40–60 ants but don't take the rival queen within 30 minutes.
  - Feet kill 0–10 ants a game and birds 0–1.
  - Headless frame rate is 30–40 fps across the regions.
- **Next:** claiming regions and their rewards, aphid tending, and the next ring out (the rest of the vegetable garden and great lawn, the rock garden, the side yard).

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
