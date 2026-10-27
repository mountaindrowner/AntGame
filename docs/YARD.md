# The yard

Status: **built (build 10).** Twenty regions form one continuous map: the first nine (build 8, at double scale since build 9) and the ring around them (build 10). The data lives in `game/src/sim/yard.js`, and the scenery is drawn by `game/src/render/views/yardScenery.js`. The whole-yard plan is further down, and in the game behind the **Map** button.

## What the specs said

The handoff (`docs/HANDOFF.md` §3.4) listed the tier 1 yard as six areas, one line each: Under the Rock (start), Lawn (mower), Flowerbed (spider; aphid honeydew), Sandbox (antlion, cave-ins), Spigot (flooding; water channels), Woodpile (termites, centipede; chitin). It had no map and no contents for any area.

## The map (built)

Mark asked for our start in the middle with eight areas around it, as one map (build 8). In build 9 he found the props too small next to the ant and asked for separate regions, each "proportionally big, like a nice big backyard", on a map the scope of SimAnt's.

- **Scale:** everything is twice as big. The layout is written in design units (40 per region) and stamped at `SCALE = 2` tiles per unit. A region is 80×80 tiles, about 6×6 phone screens at the default zoom. The built yard is 400×320 tiles: columns 2–6 and rows 1–4 of the yard map (`BLOCK` in `yard.js`). Props are twice as tall too: the soda can stands 192 px, the brick wall 380 px. Ants and creatures keep their size.
- **Regions:** each has its own ground, landmarks, food table, danger and prize. Walking from one to the next is seamless; a banner names the region as you cross.
- **Edges:** the house wall is north. On the other three sides a thicket of tall weeds closes off the part of the yard that isn't built yet, with overgrown ground beyond it.

The house is north.

```
  ┌──────────────────────── brick wall of the house ─────────────────────────┐
  │ BACK STEPS   │ PATIO        │ FLOWERBED     │ WOODPILE     │ GRILL        │
  │ feet, crumbs │ rival ants   │ spider's web  │ dead bugs    │ feet, protein│
  ├──────────────┼──────────────┼───────────────┼──────────────┼──────────────┤
  │ TOMATO ROWS  │ SPIGOT       │ UNDER THE ROCK│ COMPOST HEAP │ BIRD FEEDER  │
  │ birds, aphids│ water        │ home          │ rich fruit   │ birds, seed  │
  ├──────────────┼──────────────┼───────────────┼──────────────┼──────────────┤
  │ BEANS/LETTUCE│ SANDBOX      │ LAWN          │ PICNIC       │ BIRDBATH     │
  │ birds, aphids│ treats, pits │ seeds, mower  │ crumbs,treats│ birds, water │
  ├──────────────┼──────────────┼───────────────┼──────────────┼──────────────┤
  │ KIDDIE POOL  │ SWING SET    │ CLOVER PATCH  │ MOLEHILLS    │ DANDELIONS   │
  │ birds, water │ feet, treats │ birds, seeds  │ birds, bugs  │ birds, seeds │
  └─────────────────── thicket (the unbuilt yard beyond) ────────────────────┘
```

The bottom row is the top of the great lawn: long, unmown grass across all five regions.

| Region | Look and landmarks | Food (per minute, max at once) | Danger | Prize |
|---|---|---|---|---|
| **Under the Rock** (home) | A big flat stone over our entrance; grass and dirt | Crumbs, seeds, a little berry and popcorn. Starts with 24 items, regrows only 1.8 a minute | Food runs thin | Home |
| **Patio** (NW) | Concrete slabs, cracks, a flower pot | Crumbs, popcorn, seeds (6, 26); sometimes a cookie | The rival pavement ants nest here | Take their queen and the yard is yours |
| **Flowerbed** (N) | Mulch, about 70 tall flowers, strawberry plants, **the spider's web** | Berries and seeds (4.5, 20) | The spider rests at its web and ambushes | Kill the spider: its fang unlocks Venom ants |
| **Woodpile** (NE) | Rows of logs: a maze | **Dead bugs (protein)**, seeds, crumbs (3.5, 16) | A slow maze; far from home | Protein for an army |
| **Spigot** (W) | The tap on a brick post, a coiled hose, mud | Little food (1.5, 8); **four puddles that never dry** | Little food | Water for every egg |
| **Compost heap** (E) | A heap of scraps on black soil | **Apple cores** (20–28 each), berries, crumbs, seeds (5, 22) | Caterpillars graze here; a long walk | The richest food in the yard |
| **Sandbox** (SW) | A wooden frame with two gaps, a bucket, a shovel | Popcorn and crumbs (3, 16). **Treats drop here most** (1 in 5) | **Antlion pits** (up to seven): the rim slides you in and the bottom bites | Jelly beans and gummy bears |
| **Lawn** (S) | Deep striped grass, clover | Seeds (4.5, 20) | **The mower**: every 4–6 minutes it sweeps the whole Lawn and kills anything in it | Lots of seeds, if you time it |
| **Picnic blanket** (SE) | A red-and-white checked blanket, a plate, a soda can | Crumbs and popcorn (6, 24); treats (1 in 8) | A long way from home | Cookies and gummy bears |

| **Back Steps** (built 10) | Three wooden steps down from the back door, a concrete landing, a doormat, two pots | Kitchen crumbs, popcorn (6, 20); cookies (1 in 7) | **Feet** | The most crumbs in the yard |
| **Grill** (built 10) | A kettle grill, a patio table and two chairs on a concrete pad, grease spots | Crumbs, **hot dog scraps (protein)**, popcorn (5, 18); potato chips (a crew of 4) | **Feet** under the table | Protein without a hunt |
| **Tomato Rows** (built 10) | Three beds of dug soil, staked tomato plants | Fallen tomato, seeds (3.5, 14); **aphids that refill** | **Robins** | Honeydew that never runs out |
| **Beans and Lettuce** (built 10) | Bean poles wound with vines, a row of lettuce heads | Seeds, tomato (3.5, 14); **aphids** | **Robins** | Honeydew |
| **Under the Bird Feeder** (built 10) | A feeder on a pole, seed spilled below | **Seed** (8, 28) | **Robins**, often | Seed rain from above |
| **Birdbath** (built 10) | A stone bowl on a fluted pedestal | Seeds (2, 8); three splash puddles that refill | **Robins** | Clean water |
| **Kiddie Pool** (built 10) | A blue plastic pool in long grass | Seeds, crumbs, popcorn (3, 12); three splash puddles | **Robins** | Water and seeds |
| **Swing Set** (built 10) | A red A-frame swing set, dirt kicked bare under the seats | Crumbs, popcorn, seeds (4, 14); jelly beans, gummy bears (1 in 10) | **Feet** | Treats |
| **Clover Patch** (built 10) | Clover and dandelions in long grass | Seeds, berries (4, 16) | **Robins** | Steady food |
| **Molehills** (built 10) | Six heaps of fresh dirt | Seeds, **dead bugs** (3, 12) | **Robins** | Protein near the great lawn |
| **Dandelions** (built 10) | Yellow flowers and seed clocks | Seeds (4, 16) | **Robins** | Seeds |

Each region's danger, finds and prize are its card on the yard map (`AREAS` in `yard.js`). The prizes are what you get today; per-region rewards for claiming a region are the next step (see below).

## Creatures (built)

- **Spider:** lives at its web in the Flowerbed and rests there in ambush for 30–70 seconds at a time. It roams the yard on paths around obstacles and passes the nest every third leg, never closer than 6 tiles. It never hunts ants on the nest's doorstep. It sometimes leaves through the thicket for a while.
- **Woolly bear caterpillar:** appears mostly in the Lawn, the Compost or the Flowerbed, sometimes in the Tomato Rows, the Clover Patch or the Dandelions.
- **Rival pavement ants:** a nest in the Patio cracks. They grow to 60 and raid harder over time.
- **Feet** (Back Steps, Grill, Swing Set): while ants are out in the region, every 40–90 s a shoe comes down near one of them. Its shadow spreads for 2.2 s; in the last second most ants under it run for the edge. Everything under the sole dies, a caterpillar too, and the spider takes a hard knock.
- **Robins** (the vegetable garden, feeder, birdbath and great lawn): every 30–100 s while ants are about, a robin drops in, hops after the nearest ant and pecks four times (each peck takes one), then flies off. Five fighters around it (soldiers, or a recruited crew with you) chase it off.

## The whole yard (the yard map)

The nine built regions are the middle of a much bigger backyard, about the scope of SimAnt's: 72 regions on a 10×8 grid with the house along the top (`YARD_MAP` in `yard.js`). The in-game **Map** shows it: built regions are coloured by their ground and open a card when tapped; the rest are named and greyed out until they are built. A flat sketch of the same plan is on a Design canvas, "Underfoot Yard Map" (claude.ai, in Mark's artifacts).

- **Along the house:** the porch and back steps, the grill.
- **West:** the side yard and gate, the trash cans (odorous house ants), the vegetable garden (aphids, Argentine ants).
- **South-west:** the garden shed (fertilizer, bug spray, a centipede), the wild corner (weeds, a toad).
- **South:** the great lawn (swing set, kiddie pool, birdbath, bird feeder, moles).
- **East and south-east:** the rock garden, the hedge row, the Oak (carpenter ants), the leaf pile, the low wet strip, the fire ant mound.

The ground is painted as one continuous yard. Features blend in around their landmarks, and only man-made edges are sharp.

## Next for the yard

- **Aphid farming done properly:** aphids now refill like puddles. Next, tending them (ants guarding a cluster make it refill faster) and ladybugs that eat them.
- **Claiming regions and their rewards.** Drive out what lives in a region, or found an outpost there, to claim it and unlock something permanent: aphid farming (Flowerbed), the rival nest as an outpost (Patio), armoured soldiers from chitin (Woodpile), never thirsty (Spigot), faster laying (Compost), bigger carrying crews (Sandbox), mower timing on the map (Lawn), scouts (Picnic).
- **Supply lines.** Food taken far away has to cross the regions in between; outposts shorten the trip.
- **Opening the rest of the yard** region by region, starting with the neighbours of the built nine. Regions nobody is in will then need a cheap summary sim instead of the full one.

- Aphids in the Flowerbed to farm for honeydew (Sugar), with ladybugs eating them.
- Water channels and flooding at the Spigot.
- Termites and a centipede boss in the Woodpile (chitin).
- Feet and birds over the Picnic blanket.
- A second nest site, plus a nuptial flight to claim an area.
- Tier 2, the edges around this block (from the handoff): Sidewalk, Trash cans, Driveway, Porch, Doormat and the Oak. The house comes after that.
