# The yard

Status: **the whole yard is built (build 11).** Seventy regions form one continuous backyard: the first nine (build 8, at double scale since build 9), the ring around them (build 10) and the rest (build 11), out to the fence. The data lives in `game/src/sim/yard.js`. The scenery is drawn by `game/src/render/views/yardScenery.js`, a region at a time as you come near it.

## What the specs said

The handoff (`docs/HANDOFF.md` §3.4) listed the tier 1 yard as six areas, one line each: Under the Rock (start), Lawn (mower), Flowerbed (spider; aphid honeydew), Sandbox (antlion, cave-ins), Spigot (flooding; water channels), Woodpile (termites, centipede; chitin). It had no map and no contents for any area.

## The map (built)

Mark asked for our start in the middle with eight areas around it, as one map (build 8). In build 9 he found the props too small next to the ant and asked for separate regions, each "proportionally big, like a nice big backyard", on a map the scope of SimAnt's.

- **Scale:** everything is twice as big. The layout is written in design units (40 per region) and stamped at `SCALE = 2` tiles per unit. A region is 80×80 tiles, about 6×6 phone screens at the default zoom. The yard is 800×560 tiles: all ten columns and rows 1–7 of the yard map (`BLOCK` in `yard.js`). Props are twice as tall too: the soda can stands 192 px, the brick wall 380 px. Ants and creatures keep their size.
- **Regions:** each has its own ground, landmarks, food table, danger and prize. Walking from one to the next is seamless; a banner names the region as you cross.
- **Edges:** the house's brick wall runs along the north, behind the eight middle columns. A wooden board fence closes the rest: the two north corners, both sides and the south. The neighbours' grass lies beyond it.
- **Waking up:** the 50 build-11 regions start dormant: no food grows and nothing strikes until you first walk into one. Then it fills with its starting food and comes alive for good. The 20 regions around home are awake from the start.

The house is north. Short names, as on the in-game plan:

```
  ┌──────────────────────────── brick wall of the house (columns 1–8) ───────────────────────────────┐
  │Trash     │Porch     │Steps     │Patio     │Flowerbed │Woodpile  │Grill     │Cooler    │Rocks     │Hedge     │
  │Side      │Peppers   │Tomatoes  │Spigot    │Home      │Compost   │Feeder    │Suet      │Rocks     │Hedge     │
  │Side      │Herbs     │Beans     │Sandbox   │Lawn      │Picnic    │Birdbath  │Stones    │Gnome     │Hedge     │
  │Side      │Sprinkler │Pool      │Swings    │Clover    │Molehills │Dandelions│Roots     │Oak       │Hedge     │
  │Shed      │Trampoline│Ball      │Mushrooms │Gnome     │Frisbee   │Bone      │Acorns    │Branches  │Hedge     │
  │Thistles  │Clover    │Truck     │Bare      │Long      │Daisies   │Edge      │Shade     │Limb      │Hedge     │
  │Toad      │Reeds     │Slugs     │Drain     │Mud       │Wet       │Leaves    │Leaves    │Fire ants │Mound     │
  └──────────────────────────────────────────── board fence ─────────────────────────────────────────┘
```

- **The middle** (columns 2–6, rows 1–4) is builds 8 and 10: home, the patio and its rivals, the garden beds, the sandbox, the lawn and its mower.
- **West:** the trash cans by the side gate, the porch, the gravel side path, peppers and herbs, the shed, the wild corner with its toad.
- **East:** the cooler, the rock garden, the stepping stones and gnomes, the Oak and its roots, and the hedge along the whole east fence.
- **South:** the great lawn in long grass (sprinkler, trampoline, toys, a fairy ring), the low wet strip of reeds, slugs and mud, the leaf pile, and fire ant country in the far south-east corner.

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

### The rest of the yard (build 11)

Food is (items a minute, most at once). These regions are dormant until you first walk in.

| Region | What's there | Food | Danger | Prize |
|---|---|---|---|---|
| **Trash Cans** | Three bins by the side gate. Everything people throw away ends up here, in bits. | crumb, popcorn, bug (6, 22); cookie, chip (1 in 7) | Feet, taking out the trash | The richest scraps in the yard |
| **Porch Corner** | Grey deck boards in the shade of the house, and a pot of geraniums. | crumb, popcorn, seed (4.5, 16); jelly beans (1 in 13) | Feet on the boards | Crumbs, out of the rain |
| **Cooler** | A cooler by the table, sweating ice-melt onto the concrete. | crumb, popcorn, hot dog (4.5, 16); chip (1 in 7) | Feet round the cooler | Water and protein side by side |
| **Rock Garden** | Boulders and succulents in raked gravel. | seed, berry, bug (3, 12) | Robins on the rocks | Shelter between the boulders |
| **Rock Garden, South** | More boulders, and a cactus nobody waters. | seed, bug (3, 12) | Robins on the rocks | Protein in the gravel |
| **Hedge Row** | A dark, tangled hedge against the fence. Tunnels run through it. | berry, seed, bug (3, 12) | A slow maze | Safe ground: nothing hunts in here |
| **Hedge Row (north)** | A dark, tangled hedge against the fence. Tunnels run through it. | berry, seed, bug (3, 12) | A slow maze | Safe ground: nothing hunts in here |
| **Hedge Row (by the stones)** | A dark, tangled hedge against the fence. Tunnels run through it. | berry, seed, bug (3, 12) | A slow maze | Safe ground: nothing hunts in here |
| **Hedge Row (by the Oak)** | A dark, tangled hedge against the fence. Tunnels run through it. | berry, seed, bug (3, 12) | A slow maze | Safe ground: nothing hunts in here |
| **Hedge Row (east lawn)** | A dark, tangled hedge against the fence. Tunnels run through it. | berry, seed, bug (3, 12) | A slow maze | Safe ground: nothing hunts in here |
| **Hedge Row (south)** | A dark, tangled hedge against the fence. Tunnels run through it. | berry, seed, bug (3, 12) | A slow maze | Safe ground: nothing hunts in here |
| **Side Yard** | A gravel path along the fence, where people walk round to the back. | seed, crumb, bug (3, 12) | Feet on the path | A quiet way south |
| **Side Yard Path** | A gravel path along the fence, where people walk round to the back. | seed, crumb, bug (3, 12) | Feet on the path | A quiet way south |
| **Side Yard, South** | A gravel path along the fence, where people walk round to the back. | seed, crumb, bug (3, 12) | Feet on the path | A quiet way south |
| **Peppers and Squash** | Pepper plants and the huge leaves of a squash vine. | tomato, seed (3.5, 14) | Robins hunting the rows | Honeydew that never runs out |
| **Herb Patch** | Mint, basil and thyme. It smells so strong your trails fade faster. | seed, berry (3, 12) | Robins hunting the rows | Honeydew |
| **Suet Feeder** | A cage of suet on a post. Birds knock bits of it everywhere. | seed, hot dog (5, 18) | Birds, all day | Protein that falls from the sky |
| **Stepping Stones** | Flat stones laid across the grass to the Oak. | seed, crumb (3, 12) | Feet on the stones | An easy road east |
| **Garden Gnome** | More stepping stones, and a gnome with a fishing rod. | seed, crumb (3, 12) | Feet on the stones | A gnome to hide behind |
| **Oak Roots** | Great roots heave out of the ground under the Oak. | seed, bug, berry (3, 12) | Falling acorns | Acorns: big food from above |
| **Oak** | The trunk of the Oak, wider than a house to an ant. | bug, seed (3, 12) | Falling acorns | Acorns: big food from above |
| **Acorn Drop** | Where the Oak drops most of its acorns. | seed, bug (3, 12) | Falling acorns | The most acorns in the yard |
| **Under the Branches** | Twigs and bark under the low branches. | bug, seed (3, 12) | Falling acorns | Protein |
| **Oak Shade** | Cool shade and roots, where the lawn gives up. | seed, bug (3, 12) | Falling acorns | Shade and acorns |
| **Fallen Limb** | A dead limb the size of a fallen tower, soft with rot. | bug, seed (3.5, 14) | Falling acorns | Protein for an army |
| **Garden Shed** | A wooden shed with sacks of fertiliser. Someone sprays for bugs here. | bug, seed, crumb (4, 16) | Bug spray | Dead bugs by the dozen |
| **Thistles** | Weeds and thistles nobody cuts. | seed, berry (3, 12) | A toad | Thistle seed |
| **Toad Hole** | Damp weeds round a toad's burrow. | bug, seed (3, 12) | The toad lives here | Protein, if you dare |
| **Sprinkler** | A sprinkler head in the grass, and puddles all round it. | seed, crumb (3.5, 14) | Robins in the open | Water on the lawn |
| **Trampoline** | A trampoline on six legs, and its shade. | seed, crumb (3.5, 14) | Feet | Treats dropped from above |
| **Soccer Ball** | A leather ball left in the grass. | seed, crumb (3.5, 14) | Running feet | Seeds |
| **Fairy Ring** | A ring of mushrooms on the lawn. | seed, crumb (3.5, 14) | Robins in the open | Shelter in the ring |
| **Lawn Gnome** | A gnome on the lawn with a wheelbarrow. | seed, berry (3.5, 14) | Robins in the open | Seeds |
| **Frisbee** | A frisbee upside down, half full of rain. | seed, crumb (3.5, 14) | Robins in the open | Water |
| **Dog Bone** | A chewed bone the dog forgot. | seed, hot dog (3.5, 14) | Robins in the open | Protein |
| **Clover Hill** | A low rise thick with clover. | seed, berry (3.5, 14) | Robins in the open | Steady food |
| **Toy Truck** | A plastic dump truck stuck in the lawn. | seed, crumb (3.5, 14) | Robins in the open | Seeds |
| **Bare Patch** | Where the grass died. Hot and open. | seed, crumb (3.5, 14) | Robins in the open | Seeds |
| **Long Grass** | Grass so long it hides you from the birds. | seed, crumb (3.5, 14) | Hard going | Cover from birds |
| **Daisies** | White daisies in the lawn. | seed, berry (3.5, 14) | Robins in the open | Seeds |
| **Lawn's Edge** | Where the lawn meets the Oak's shade, edged with stones. | seed, crumb (3.5, 14) | Robins in the open | Seeds |
| **Reeds** | Reeds and rushes in black mud. | slug, seed (3.5, 12) | A toad on the hunt | Water and protein |
| **Slug Alley** | Slime trails everywhere. The slugs make good eating. | slug, seed (3.5, 12) | A toad on the hunt | Water and protein |
| **Drain** | A drainpipe empties here after every rain. | slug, seed (3.5, 12) | A toad on the hunt | Water and protein |
| **Mud Flats** | Wide, sticky mud and still puddles. | slug, seed (3.5, 12) | A toad on the hunt | Water and protein |
| **Wet Edge** | Where the wet strip dries into lawn. | slug, seed (3.5, 12) | A toad on the hunt | Water and protein |
| **Leaf Pile** | Last autumn's leaves, heaped and rotting. | bug, seed, berry (3.5, 14) | A toad under the leaves | Protein in the rot |
| **Deep in the Leaves** | The deep end of the leaf pile. | bug, seed (3.5, 14) | A toad under the leaves | Protein |
| **Fire Ant Country** | Small mounds of red earth. Fire ants patrol here. | seed, bug (3, 12) | Fire ants sting anything that stops | The way to the mound |
| **Fire Ant Mound** | A great red mound in the corner. The last fight in the yard. | bug, seed (3, 12) | Swarms of stinging fire ants | The yard, when you are strong enough |

Each region's danger, finds and prize are its card on the yard map (`AREAS` in `yard.js`). The prizes are what you get today; per-region rewards for claiming a region are the next step (see below).

## Creatures (built)

- **Spider:** lives at its web in the Flowerbed and rests there in ambush for 30–70 seconds at a time. It roams the yard on paths around obstacles and passes the nest every third leg, never closer than 6 tiles. It never hunts ants on the nest's doorstep. It sometimes climbs over the fence and leaves the yard for a while.
- **Woolly bear caterpillar:** appears mostly in the Lawn, the Compost or the Flowerbed, sometimes in the Tomato Rows, the Clover Patch or the Dandelions.
- **Rival pavement ants:** a nest in the Patio cracks. They grow to 60 and raid harder over time.
- **Feet** (the steps, porch, grill, cooler, trash cans, side path, swings, stepping stones, trampoline and soccer ball): while ants are out in the region, every 40–90 s a shoe comes down near one of them. Its shadow spreads for 2.2 s; in the last second most ants under it run for the edge. Everything under the sole dies, a caterpillar too, and the spider takes a hard knock.
- **Robins** (the vegetable garden, feeder, birdbath and great lawn): every 30–100 s while ants are about, a robin drops in, hops after the nearest ant and pecks four times (each peck takes one), then flies off. Five fighters around it (soldiers, or a recruited crew with you) chase it off.
- **Toads** (the wild corner, the wet strip and the leaf pile): a toad hops in, then flicks its tongue at the nearest ant within five tiles, five times, before it hops off. Five fighters drive it away, as with a robin.
- **Acorns** (under the Oak): a small shadow, then an acorn drops out of the tree. It kills what it lands on, then lies there as food for a crew of four.
- **Bug spray** (the shed): a hiss and a faint mist, then a cloud twelve tiles across that hangs for two seconds. Anything inside it dies, including ants that wander in late.
- **Fire ants** (the far south-east corner): the red earth round each mound stings any of our ants standing on it, a little every half second. Our ants flee it on their own. The big mound's ground is wider and stings harder. They are ground, for now, not a colony.

## The yard map

The **Map** button shows the yard as a photo from straight above, under a fog of war that lifts where your ant has been. The photo is pieced together a region at a time: each region is photographed (scenery only, no creatures) the first time it is built near you, and the photo is saved alongside the game. "Whole yard" opens the plan: all 70 regions in their grid, greyed until explored, each with its card.

## Loading the yard in pieces

The whole yard is far too much to keep built at once (about 600 landmarks, and 70 painted grounds of 640×640 texels each). So the scenery is built a region at a time (`YardScenery` in `yardScenery.js`):

- A region is built when the camera comes within ¾ of a region of it (more when the view shows more ground, up to 1¼), nearest first. It is thrown away again once the camera is more than about half a region beyond that. At most a handful are built at once.
- Building is a series of small slices (ground fields, the ground painting a few rows at a time, the landmarks, the rocks, the grass), and each frame spends at most 6 ms on it (24 ms when a region already on screen is missing), so walking never stalls. After a jump (the first frame, a tour), whatever is on screen is built at once.
- A region that has been thrown away keeps a 160-pixel copy of its painted ground, for the view into the distance. One that has never been built shows a flat colour for its ground.
- The house wall, the fence and the neighbours' grass are always there.
- The sim is not split: all 70 regions are simulated all the time. Dormant regions cost almost nothing (no food, no strikes) until you wake them.

## Next for the yard

- **Rival colonies in the new regions:** odorous house ants at the trash cans, Argentine ants in the vegetable garden, carpenter ants in the Oak, and the fire ants as a real colony with a queen (the "last fight").
- **Aphid farming done properly:** aphids now refill like puddles. Next, tending them (ants guarding a cluster make it refill faster) and ladybugs that eat them.
- **Claiming regions and their rewards.** Drive out what lives in a region, or found an outpost there, to claim it and unlock something permanent.
- **Supply lines.** Food taken far away has to cross the regions in between; outposts shorten the trip.
- **A cheap summary sim for far regions,** if the full sim of all 70 gets slow with big colonies spread across the yard.
- Water channels and flooding at the Spigot; termites and a centipede in the Woodpile; a nuptial flight to found a second nest.
