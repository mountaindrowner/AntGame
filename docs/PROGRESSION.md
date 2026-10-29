# Progression

Status: **design proposal (Oct 29). Build 12 starts it:** 🧬 Genes, the ant upgrade levels, veteran ranks, the evolution tree's first nodes and rebirth as a named ant. See "Built today vs proposed". Mark: "Let's really take time to think out progression… how progression can grow so that the player always has something more to build, more to expand."

It builds on what's in the game (build 11.6), the original design (`HANDOFF.md` §2–3) and the depth pillars (`DEPTH.md`). The numbers are first guesses for the bots to tune. The decisions that are Mark's to make are at the end.

## The idea

The colony grows along **five tracks at once**: Territory, Nest, Population, Evolution and You. At any moment each track shows a goal a minute away, one ten minutes away and one an hour away.

The tracks feed each other:

- New ground pays for new rooms.
- Rooms unlock castes.
- Castes beat the guardians of further ground.
- Guardians drop trophies that open the evolution tree.
- Evolution reaches still further.

**The yard pushes back in proportion to what you take,** not just with the clock. More ants, more ground and more noise draw stronger rivals, bigger predators and, in the end, the humans.

```
        explore ──► find food, materials, a boss, a rival
           ▲                       │
           │                       ▼
   reach further            haul · hunt · fight
 (range, outposts,                 │
  castes, nests)                   ▼
           ▲               spend: eggs · rooms ·
           │               evolution · outposts
           │                       │
           └──── the yard notices ◄┘
         (rivals spread, predators, humans)
```

## Built on proven designs

Mark asked that every piece rest on ideas proven in popular games, or be a new twist on one. Here is the precedent for each part of this plan and what each game teaches. Revisions made because of it are marked **(revised)** further down. Sources are at the end of this section.

| Our piece | Proven in | How it works there | The lesson we take |
|---|---|---|---|
| Bosses that gate the next ring, with trophies | **Valheim**, **Terraria**, **Grounded** | Valheim: each biome gives the materials to beat its boss; the boss drops a trophy (a power) and a key that opens the next biome. Terraria: the bosses are the engine of progression, in a recommended order that isn't enforced, plus optional bosses. Grounded: tiers of gear follow zones of rising danger | Each boss drops **two things**: a trophy that unlocks a caste, and a key that opens the next ring. Each region supplies what you need to beat its own boss. Order recommended, not forced; some bosses optional |
| Castes as keys to obstacles | **Pikmin** (each type unlocked in an area and needed for that area's hazards); metroidvanias | A new Pikmin type is how you get past fire, water or electricity | **(revised)** Regions get physical gates that need a caste: bark walls (Carpenters), silk-choked tunnels (Acid), gaps (Trap-jaws jump), fire-ant ground (Armored foragers) |
| 🧬 Genes earned by doing, including first finds | **Grounded** (scan new items for "Raw Science"; scanning many kinds raises Brainpower); **Subnautica** (scan fragments to unlock blueprints) | Finding new things is itself the research | **(revised)** Bringing a new kind of thing home for the first time (a beetle shell, a slug, wood) *studies* it: 🧬, a card on what it's for, and the recipes that use it |
| Boosts on evolution nodes | **Civilization VI** (Eurekas: a related deed cuts a tech's cost; settle on a coast → Sailing boosted) | Ties research to play | **(revised)** Each node's 🧬 cost halves once you've done its matching deed. Critics found some Civ triggers too situational, so every boost here is always possible in the yard |
| Per-caste upgrades with permanent picks | **Empires of the Undergrowth** (the closest ant game: Royal Jelly buys three tiers of stats per ant; two ability slots, pick one of two, permanent) | Specialises each colony; choices stick | **(revised)** A **caste upgrades** track: three stat tiers per caste, and at tiers 2 and 3 a permanent pick of one of two abilities |
| One new material per tier | **Factorio** (each new science pack needs a new production chain); **Oxygen Not Included** (Novice, then Advanced research) | Each tier is a new thing to set up, not a bigger number | Kept. Factorio's own team found one jump too big (blue science, FFF #159), so each material gets an easy first source |
| Population tiers that unlock buildings | **Anno 1800** (residence tiers act like levels; each unlocks production; needs rise with them) | Growth itself is the difficulty curve | Queen levels act as tiers: higher levels unlock rooms and need the new materials (🍯 sugar at V–VI) |
| Notice, the humans | **Against the Storm** (Hostility: rises per year, per villager and per glade opened; each 100 points is a level that triggers worse events in the storm season; actions lower it); **RimWorld** (raid points from colony wealth and population, with buildings counted at half) | The world answers how big and how far you've grown, not just the clock | **(revised)** Notice levels every 25 points, from population, regions opened, years and noise near the house. Stored food counts for little, so saving up isn't punished (RimWorld's lesson). There are ways to lower it |
| The director | **RimWorld** storytellers (paced, adaptive events) | | Kept as designed |
| Seasons and winter | **Northgard**, **Frostpunk**, **Against the Storm**, **Don't Starve** | Northgard: food falls in winter, you stockpile, and winters get harsher each year | Recommended: seasons are the most proven rhythm for colony games |
| The goals board | **Stardew Valley** (Community Center bundles: themed sets that open rooms, with a reward for each set and a bigger one per room) | Clear goals that point at every activity | **(revised)** Goals come in themed **sets** (a garden set, a hunter set, a builder set). Each goal pays 🧬, and a finished set pays a permanent colony-wide reward |
| Respec | **Hades** (Mirror of Night: every upgrade has two versions; refunds cost a rare key) | Experimenting without regret | **(revised)** Evolution nodes can be refunded for a trophy's worth of cost. The lineage pick is the exception |
| Mechanics over percentages | **Sid Meier** ("a series of interesting decisions"); tech-tree critiques (every node should change something; not everything should be obtainable; choices should stick); **Hades** (stat boosts vs. upgrades that change how you play) | | **(revised)** Tree nodes change how you play. Plain stat bumps move into the caste upgrades. About two-thirds of the tree is affordable in the yard, and the lineage is permanent |
| A world-changing gate | **Terraria** (beating the Wall of Flesh turns the world to Hardmode) | A late boss changes the whole world, so old ground is fresh again | Beating the fire ant queen (or entering the house) sets the yard to a harder state: new spawns, stronger rivals |
| Satellite nests by mating flight; the yard, then the house | **SimAnt** (the Full Game: spread through the yard sector by sector by sending breeders, then into the house, to drive out the red ants and the owners) | Our own source | Kept: the satellite plan and Act 2 are SimAnt's structure, updated |

**What's new here, and what it rests on:**

- **Notice** puts Against the Storm's Hostility in SimAnt's humans.
- **Choosing your rebirth** takes the class picks of roguelites and team games onto SimAnt's "you become the next ant".
- **Outposts** are the territory claiming of Northgard-style strategy games, made with SimAnt's scent trails.
- **The spoil heap** comes from real ants, and builders hauling it is a logistics chain of the Factorio kind.

Sources (searched Oct 29):

- [Valheim boss and biome progression](https://guildorder.com/games/valheim/wiki/boss-and-biome-progression); [Valheim progression guide](https://allthings.how/valheim-progression-guide-every-biome-boss-and-key-drop/)
- [Terraria wiki: game progression](https://terraria.wiki.gg/wiki/Guide:Game_progression); [Terraria boss order](https://xgamingserver.com/blog/terraria-progression-guide-boss-order/)
- [Grounded 2 getting started (Xbox)](https://news.xbox.com/en-us/2025/07/29/getting-started-in-grounded-2/); [Grounded tiers and bosses](https://earlyguides.pages.dev/grounded/bosses)
- [Subnautica 2 scanner and blueprints](https://www.keengamer.com/articles/guides/subnautica-2-scanner-guide-how-blueprint-unlocks-work/)
- [Pikmin 4 onions](https://www.nintendolife.com/guides/pikmin-4-all-onion-upgrade-and-flarlic-locations); [Pikmin types](https://nc.inverse.com/gaming/pikmin-4-find-get-red-yellow-ice-blue-purple-rock-winged-glow-white)
- [Civilization VI boosts discussion](https://forums.civfanatics.com/threads/concerns-regarding-the-eureka-mechanism.572299)
- [Empires of the Undergrowth: Formicarium adaptations](https://hoodedhorse.com/wiki/Empires_of_the_Undergrowth/Formicarium_Adaptation); [upgrades guide](https://primagames.com/tips/empires-of-the-undergrowth-beginner-story-progression-guide); [population](https://primagames.com/gaming/how-to-increase-max-population-in-empires-of-the-undergrowth)
- [Factorio FFF #159](https://direct.factorio.com/blog/post/fff-159); [FFF #275](https://factorio.com/blog/post/fff-275)
- [Oxygen Not Included research](https://oxygennotincluded.wiki.gg/wiki/Research)
- [Anno 1800 population](https://anno1800.fandom.com/wiki/Population?oldid=3313); [Anno-Union devblog](https://anno-union.com/tag/anno-1800-en/page/30)
- [Against the Storm Hostility](https://hoodedhorse.com/wiki/Against_the_Storm/Hostility); [beginner's guide](https://hoodedhorse.com/wiki/Against_the_Storm/Beginner%27s_Guide)
- [RimWorld raid points](https://rimworldwiki.com/wiki/Raid_points); [wealth](https://rimworldwiki.com/wiki/Wealth)
- [Northgard food and winter](https://www.gamepressure.com/northgard-game-guide/food/z8aacc); [Frostpunk tech and laws](https://www.gamepressure.com/frostpunk/how-to-start/zda129)
- [Stardew Valley bundles](https://stardewvalley.fandom.com/wiki/Bundles)
- [Hades meta-progression](https://saschb2b.github.io/game-mechanics/games/hades/meta-progression)
- [Sid Meier on interesting decisions](https://gamedeveloper.com/design/video-sid-meier-explores-interesting-decisions-in-gameplay); [Old World designer notes on tech](https://forum.quartertothree.com/t/old-world-designer-notes/152938?page=3)
- [SimAnt (Wikipedia)](https://en.wikipedia.org/wiki/SimAnt); [SimAnt strategy wiki](https://strategywiki.org/wiki/SimAnt)

## Principles

1. **Three horizons, always.** Next minute: a crumb, a dig. Next ten minutes: a room, a hunt, a region. Next hour: a boss, a new nest, a lineage.
2. **Every unlock opens ground, and new ground pays for the next unlock.** Nothing is a dead end.
3. **No waiting game.** Every currency comes from doing things (hauling, hunting, exploring, growing), never from a timer alone.
4. **Each material has its own verb and its own problem** (the handoff's rule), so a new material is a new way of playing, not a bigger number.
5. **Challenge answers growth.** Size, territory and noise raise the threat; time alone raises it slowly.
6. **Choices close doors.** Evolution points are scarce and the lineage pick is permanent, so two colonies end up different.
7. **Reveal as you go.** A track's menu appears when it first matters. The first ten minutes stay as simple as today.
8. **Stays biology.** Every caste, node and threat is something real ants or yard creatures do.

## Track 1: Territory (the map)

A region moves through five states:

| State | How | What it gives |
|---|---|---|
| **Unseen** | Fog | Nothing |
| **Scouted** | You walk in (built) | It wakes up: food grows, its dangers start. Pays 🧬1 the first time |
| **Supplied** | A trail or an outpost reaches it | Foragers work it on their own |
| **Held** | An outpost stands in it, its guardian is beaten, and no rival nest is in it | The region's **Prize**, permanently |
| **Settled** | A satellite nest in it | Its own queen, ants and nest to dig |

**Outposts** (new, cheap, early) are how the map gets claimed:

- **What:** builders carry 🪨10 to a spot and raise a small cairn.
- **Range:** foragers range from the nearest outpost as well as from the nest, so outposts are how range really grows.
- **Benefits:** trails within 6 tiles of an outpost don't fade, and it lifts fog for 20 tiles round it.
- **Risk:** feet, the mower and raiders can knock one down.
- **Limit:** 2, plus 1 per queen level, plus 2 with a Lookout.

**Supply lines.** Food still has to reach a nest, so far regions mean long trails. They get shortened by outposts, satellites and Highways (the Nest branch).

**Prizes.** Each region's card already names a Prize. Holding the region makes it real:

| Region | Guardian | Prize when held |
|---|---|---|
| Patio | Pavement ants (kill their queen) | Their nest becomes your outpost; raids from the Patio stop |
| Flowerbed | Wolf spider | Berries regrow twice as fast |
| Spigot | none | Water cap +40; dew never runs dry |
| Compost | none | Eggs hatch 15% faster (it's warm) |
| Woodpile | Termites | Dead bugs drop 🪲 chitin |
| Sandbox | Antlion queen | Crews carry treats 30% faster |
| Lawn | the mower | The mower's next pass shows on the map |
| Picnic blanket | none | A treat lands there every few minutes |
| Tomato and bean rows | Hornworm | Aphid farms: 🍯 sugar |
| Rock garden | Ground beetle | Stone ×2; beetle shells (🪲) |
| Trash cans | Odorous house ants and the roach | The richest scraps, at night |
| Hedge row | Mantis | A safe highway north to south (no birds) |
| The Oak | Carpenter ants | 🪵 wood from bark and twigs |
| Leaf pile | Centipede | Leaves for a Fungus garden |
| Wet strip | the toad | Water and slugs (protein) |
| Fire ant country | Fire ants | The finale |

The other regions hold minor prizes: a little more of their own food, a shortcut, a hiding place.

**Gates (revised; Pikmin).** Some ways through need a particular caste. Castes become keys to the map, and each new one opens ground you've already seen:

| Gate | Where | Opened by |
|---|---|---|
| Bark walls and rotten wood | Woodpile, Fallen limb, the Oak | Carpenters chew through |
| Silk-choked tunnels | Hedge row, under the Shed | Acid sprayers dissolve them |
| Gaps and ledges | Rock garden, the Oak's roots | Trap-jaws jump them |
| Fire-ant ground | Fire ant country | Armored foragers cross it unstung |
| Night-only paths | Trash cans, Leaf pile | Night foragers |
| Deep sand and stone seams | Sandbox, the nest's deep band | Sappers

## Track 2: Nest (space)

Space is the economy (handoff pillar 7). Bigger and better rooms need bigger pockets, and bigger pockets need deeper or harder digging and more builders hauling spoil (built in 11.6).

- **Room tiers.** Each upgrade needs a bigger pocket dug round the room, so upgrading means digging:
  - Hatchery I/II/III: 1/3/5 eggs at once
  - Food store I/II/III: 150/400/1000 food
  - Cistern I/II: 60/150 water
  - Nursery I/II
  - Barracks I/II (II unlocks Majors)
  - Workshop I/II (II unlocks Master builders, tier III rooms and the deep band)
- **A fourth soil band.** Below the clay, a rocky deep band needs Workshop II or Sappers. Only the biggest rooms fit there.
- **New rooms,** each unlocked by a node, a trophy or a held region:

| Room | Unlock | What it does |
|---|---|---|
| Lookout | Senses node | Scouts; outposts +2; boss patrols show on the map |
| Armory | Ground beetle shell | Turns 🪲 into armoured castes |
| Venom lab | Spider fang | Venom ants (today the fang alone unlocks them); Acid sprayers |
| Honeypot vault | Nest node | Repletes: living jars of 🍯 and 💧, stores for drought or winter |
| Fungus garden | Leaf pile held | Leaves become steady food: the late-game food engine |
| Royal chamber | Nest node, 🪵 | Breeders, mating flights, satellite nests |
| Gate | Nest node, 🪵 | A held entrance: raiders stop at it while soldiers stand guard |
| Midden | Nest node | Keeps disease away when the colony is big (with seasons) |

- **Satellite nests** each have their own small nest to dig. More nests means more space, more rooms and a bigger colony.

## Track 3: Population (queen and castes)

- **Queen levels** go from 4 to 6: 20 → 40 → 60 → 80 → 100 → 120 ants. Levels 5 and 6 cost 🍯 sugar.
- **Each satellite queen adds 20** to the colony's cap. A late colony runs to 200–400 ants across its nests; the 1,000-ant target from the handoff stays the performance goal.
- **The caste ladder.** Every caste has a job and a passive effect, as today:

| Caste | Needs | Job | Passive |
|---|---|---|---|
| Forager | — (built) | Gathers | Lays trails |
| Builder | — (built) | Digs, builds, hauls spoil | Holds tunnels up |
| Nurse | Nursery (built) | Tends eggs | Eggs hatch faster |
| Soldier | Barracks (built) | Fights | Guards the door |
| Venom ant | Spider fang (built) | Kills big things | 8× bite |
| Scout | Lookout | Explores far, fast | Lifts fog as it goes |
| Major | Barracks II, 🪲 | Heavy fighter, carries treats alone | Blocks a tunnel |
| Armored forager | Beetle shell, Armory | Forages in danger | Survives one stomp or peck |
| Master builder | Hornworm silk, Workshop II | Builds tier III rooms, digs the deep band | Builds 2× |
| Sapper | Antlion jaw | Digs fast through clay and the deep band | Repairs cave-ins at once |
| Trap-jaw | Centipede plate, Armory II | Snaps small foes in one bite, jumps clear of feet | — |
| Acid sprayer | Wasp sting, Venom lab | Fights at 3 tiles | Scares birds off |
| Night forager | Roach antenna | Forages at night and in rain | — |
| Carpenter | Termite queen, Workshop II | Cuts 🪵 wood | — |
| Replete | Honeypot vault | Is the storage: a living jar | — |
| Breeder | Royal chamber, 🍯 | Flies on a mating flight | Founds a satellite |

**Caste upgrades** (revised; Empires of the Undergrowth). Each caste has its own short line, bought with materials, never 🧬:

- **Tier 1:** a stat (more health, speed or carrying).
- **Tier 2:** the next stat, plus a **pick of one of two abilities, permanent**. For example, Soldiers get *Doorkeeper* (block the entrance alone) or *Escort* (follow and guard foragers).
- **Tier 3:** a stat, plus another permanent pick. For example, Foragers get *Pathfinder* (find food twice as far off a trail) or *Hauler* (two ants carry a treat).

This is where the colony specialises without spending evolution points.

### Ant types and their upgrade trees (proposed, revised Oct 29)

This supersedes the caste ladder table above: 37 ant types plus the queen, in four families up to four generations deep. Drawn as trees in `progression-map.html`. Levels are bought once per ant type with materials. Level 1 is a boost; levels 2 and 3 add a boost and a permanent pick of one of two abilities. The four core ants (Forager, Builder, Soldier, Nurse) also have level 4 (a big boost) and level 5 (a mastery pick). ★ marks an ant unlocked by a great evolution. The Forager's first three range levels are built (Train foragers); its picks are not.

**Gatherers.** Bring things home. They branch into ants that range further, farm, and work where others can't.

| Ant | Grows from | Unlocked by | L1 | L2 (pick one) | L3 (pick one) | L4 | L5 mastery (pick one) |
|---|---|---|---|---|---|---|---|
| Forager (built) | — | from the start | Range 55, 10% faster (🌾15) | Range 75, 20% faster (🌾40 🪨10): **Trailblazer**, trails it lays last twice as long; or **Sprinter**, 25% faster off a trail | Range 100, 30% faster (🌾80 🥩10 🪨25): **Pathfinder**, finds food twice as far off a trail; or **Hauler**, two foragers can carry a treat | Carries 7, range 130 (🌾150 🍯20 🪲10) | (🌾250 🍯50 🧬2): **Trail queen**, its trails become roads: every ant on them is 40% faster; or **Lone wolf**, forages anywhere in the yard; range no longer applies |
| Scout | Forager | Lookout room | 20% faster (🌾30 🪨10) | Sees 50% further (🌾60 🥩10): **Mapper**, ground it scouts shows its food for 2 minutes; or **Decoy**, draws a bird or spider away, then outruns it | Never tires (🌾100 🍯15): **Spy**, shows a rival's raid before it leaves home; or **Pioneer**, outposts it builds reach 5 tiles further | — | — |
| Desert runner | Scout | Heat tolerance | 25% faster in heat (🌾60 🪨10) | Carries 6 (🌾90 🍯10): **Sun reader**, walks straight home with no trail; or **Spider-dodger**, outruns any spider | 40% more health (🌾140 🍯25): **Carrion seeker**, finds bugs killed by the heat: free 🥩; or **Long haul**, no range limit in summer | — | — |
| Night forager | Forager | Roach antenna | 25% faster at night (🌾40 🥩5) | Carries 6 (🌾60 🥩15): **Rain runner**, full speed in rain; never washed away; or **Glow trails**, its trails show on the map at night | 40% more health (🌾100 🍯15): **Scavenger**, finds dead bugs at night: free 🥩; or **Ghost**, rivals and the roach don't notice it | — | — |
| Armored forager | Forager | Beetle shell + Armory | Carries 6 (🌾40 🪲5) | 50% more health (🌾60 🪲10): **Shellback**, survives two stomps or pecks; or **Mule**, carries 10 | 20% faster (🌾100 🪲20): **Rearguard**, foragers near it take half damage; or **Bird-proof**, birds ignore it | — | — |
| Harvester | Forager | Granary | Carries 6 seeds (🌾30 🪨10) | 15% faster (🌾60 🪨20): **Thresher**, cracks seeds: twice the food; or **Sower**, dropped seeds sprout near the nest: food grows at home | Granary 50% bigger (🌾100 🪨40): **Hoarder**, seeds last through winter untouched; or **Seed thief**, steals from rival granaries | — | — |
| Leafcutter | Harvester | Fungus garden | Cuts 30% faster (🌾50 💧20) | Carries big leaf pieces (🌾80 🍯10): **Minim riders**, tiny ants ride the leaves: flies and wasps can't attack; or **Green highway**, leaf trails are cleared: every ant on them is faster | 40% more health (🌾120 🪲10): **Petal clipper**, cuts flowers too: richer fungus; or **Strip-cutter**, strips a whole plant in one trip | — | — |
| ★ Gardener | Leafcutter | Fungus Empire | Fungus grows 20% faster (🌾60 💧30) | Tends twice the garden (🌾100 💧40): **Weeder**, mould never spoils a garden; or **Spreader**, new gardens start from cuttings, free | Works through winter (🌾150 🍯30): **Antibiotic**, ants that eat the fungus resist disease; or **Feast**, the garden feeds larvae: eggs cost no food | — | — |
| Herder | Forager | Aphid farming | Milks 25% faster (🌾30 🍯5) | Drives off ladybirds (🌾50 🍯15): **Shepherd**, moves aphids to new plants: herds grow; or **Wing clipper**, aphids never fly away | Herds 30% bigger (🍯30 🪲5): **Big herd**, herds twice as large; or **Sweet trail**, sugar comes home 30% faster | — | — |
| Rancher | Herder | Mealybug ranching | Herd 25% bigger (🍯15 🪨20) | Milks 30% faster (🍯30 🪨30): **Cave herd**, herds survive winter; or **Deep roots**, cellars in the deep band hold twice | Herds breed faster (🍯50 🪵10): **Honey well**, cellar sugar never runs dry; or **Breeding stock**, each satellite nest gets a starter herd | — | — |

**Diggers.** Dig, build, haul spoil. They branch into deep miners, great builders, wood and silk workers, and ants that make bridges and rafts of their own bodies.

| Ant | Grows from | Unlocked by | L1 | L2 (pick one) | L3 (pick one) | L4 | L5 mastery (pick one) |
|---|---|---|---|---|---|---|---|
| Builder (built) | — | from the start | Digs 30% faster (🌾20 🪨10) | Carries 2 spoil loads (🌾50 🪨25): **Shorer**, tunnels near it never cave in; or **Mason**, rooms cost 25% less 🪨 | Builds 50% faster (🌾90 🪨40 🥩10): **Excavator**, digs room pockets twice as fast; or **Field engineer**, builds and repairs outposts in half the time | Digs any soil 2× faster (🌾150 🪨60 🪵10) | (🌾250 🪨100 🧬2): **Foreman**, builders near it work 50% faster; or **Tunnel master**, its tunnels never collapse or flood |
| Sapper | Builder | Antlion jaw | Clay dug 40% faster (🌾50 🪨20) | 40% more health (🌾80 🥩15): **Tunneller**, digs a hidden tunnel out to an outpost; or **Demolisher**, collapses a tunnel onto raiders | Deep band dug 2× faster (🌾120 🪲10): **Breacher**, digs into rival nests; or **Rescuer**, digs out ants trapped in cave-ins | — | — |
| Miner | Sapper | Deep halls | Stone dug 30% faster (🌾80 🪨30) | Carries 2 (🌾120 🪨50): **Prospector**, finds buried grubs and quartz: 🪨 ×3; or **Shaft sinker**, digs a straight shaft in one go | 50% more health (🌾160 🪲20): **Cave finder**, breaks into natural hollows: free rooms; or **Spring finder**, strikes groundwater: a cistern that never empties | — | — |
| Master builder | Builder | Hornworm silk + Workshop II | Builds 30% faster (🌾60 🪨30) | 30% more health (🌾80 🪵10): **Vaulter**, rooms it builds hold 20% more; or **Economist**, tier III rooms cost 30% less 🪵 | Deep band dug 50% faster (🌾120 🪵25): **Fortifier**, rooms it builds never flood; or **Planner**, queue three rooms at once | — | — |
| Architect | Master builder | Workshop III | Builds 30% faster (🌾100 🪵20) | Rooms one size bigger (🌾150 🪵30): **Ventilator**, the nest stays cool: no summer slowdown; or **Fortress**, gates and walls twice as strong | Works 2× faster (🌾200 🪵50): **Great works**, great evolutions build 30% faster; or **Monument**, a finished great evolution lowers Notice by 10 | — | — |
| Carpenter | Builder | Termite queen + Workshop II | Cuts 30% faster (🌾60 🪵5) | Carries 2 wood (🌾90 🪵15): **Woodcutter**, bark walls fall twice as fast; or **Gallery maker**, satellite nests in wood need no digging | 40% more health (🌾120 🪲15): **Joiner**, gates and Highways cost 30% less 🪵; or **Termite bane**, termites flee its trails | — | — |
| ★ Weaver | Carpenter | Weaver Canopy | Weaves 30% faster (🌾60 🍯10) | Builds leaf nests 2× bigger (🌾100 🍯20): **Living chain**, chains of ants pull leaves across gaps; or **Silk patch**, repairs any nest in seconds | 40% more health (🌾150 🍯30): **Canopy guard**, drops on foes from above; or **Treetop farm**, herds scale insects in the leaves: 🍯 | — | — |
| ★ Bridger | Builder | Living Bridges | Bridges 30% longer (🌾60 🥩10) | Bridges form 2× faster (🌾90 🥩20): **Rope**, bridges hold crews carrying treats; or **Ladder**, bridges climb walls and steps | 50% more health (🌾140 🪲10): **Tireless**, bridges never break; or **Moat**, bridges pull up behind you: raiders can't follow | — | — |
| ★ Rafter | Builder | Raft Colony | Rafts 30% bigger (🌾60 🍯10) | Rafts drift 2× faster (🌾90 🍯20): **Sail**, steer rafts where you want; or **Anchor**, rafts hold still: the nest waits out the flood | 50% more health (🌾140 🪲10): **Flood rider**, a flood carries a raft to new ground: a free outpost; or **Lifeboat**, the queen and eggs are always saved from floods | — | — |

**Fighters.** Three lines. The venom line stings and sprays; the heavy line grows bigger heads and jaws; the raider line takes the fight to rival nests. The lineage pick crowns the venom line with a champion.

| Ant | Grows from | Unlocked by | L1 | L2 (pick one) | L3 (pick one) | L4 | L5 mastery (pick one) |
|---|---|---|---|---|---|---|---|
| Soldier (built) | — | Barracks | 30% more health (🌾30 🥩5) | Bites 25% harder (🌾60 🥩15): **Doorkeeper**, blocks the entrance alone; or **Escort**, follows and guards foragers | 20% faster (🌾100 🥩25 🪲5): **Alarm caller**, wakes every idle ant when attacked; or **Phalanx**, bites 50% harder with 3 or more soldiers | 50% more health again (🥩80 🪲25) | (🥩150 🪲50 🧬2): **Warlord**, every fighter within 5 tiles bites 30% harder; or **Guardian**, takes the hits meant for the queen, nurses and your ant |
| Venom ant (built) | Soldier | Spider fang | Venom 25% stronger (🥩20) | 30% more health (🌾40 🥩35): **Paralytic**, stung prey slows to half speed; or **Hunter**, kills leave a scent that calls haulers | Stings faster (🥩60 🍯15): **Neurotoxin**, every fifth sting stuns a boss; or **Lethal dose**, small foes die in one sting | — | — |
| Acid sprayer | Venom ant | Wasp sting + Venom lab | Range 4 tiles (🥩30 🍯10) | 40% more health (🥩50 🍯20): **Acid cloud**, each spray hits a small area; or **Bird scarer**, birds won't strike near it | Sprays faster (🥩80 🪲15): **Silk melter**, webs and silk walls melt at once; or **Corrosive**, armored foes take double damage | — | — |
| Lineage champion | Acid sprayer | The lineage pick | 40% more health (🥩80 🪲30) | Hits 30% harder (🥩120 🪲40): **Spearhead**, leads raids: ants following it hit harder; or **Bodyguard**, walks with your ant and guards it | Two at once (🥩180 🪲60 🧬3): **Terror**, rivals flee its scent; or **Boss killer**, double damage to bosses | — | — |
| Exploder | Venom ant | Formic spray + Venom lab | Goo 30% wider (🥩20) | Hatches 2× faster (🥩40 🍯10): **Tar pit**, goo holds foes still for 5 s; or **Toxin**, goo poisons whatever it touches | Bursts on command (🥩70 🪲10): **Last stand**, bursts on its own when the nest is breached; or **Volatile**, strips a boss's armour for 10 s | — | — |
| Major | Soldier | Barracks II + 🪲 | 40% more health (🥩20 🪲10) | Bites 30% harder (🥩40 🪲20): **Bulwark**, plugs a tunnel completely; or **Porter**, carries a treat alone at full speed | 20% faster (🥩70 🪲35): **Crusher**, cracks shells: 2× 🪲 from kills; or **Shield wall**, ants behind it take no damage | — | — |
| Supermajor | Major | Polymorphism | 50% more health (🥩60 🪲30) | Bites 40% harder (🥩90 🪲45): **Nutcracker**, cracks seeds and shells for the colony: more food and 🪲; or **Wall**, nothing gets past it | 25% faster (🥩130 🪲60): **Stomper**, knocks small foes flying; or **Sentinel**, never leaves its post, never sleeps | — | — |
| Doorhead | Supermajor | Gate room | 50% more health (🥩40 🪲30) | Closes 2× faster (🥩60 🪲40): **Keyholder**, lets your ants through, no one else; or **Two doors**, guards a second entrance too | Can't be moved (🥩90 🪲60): **Shell door**, keeps out floods and the hose; or **Spiked**, hurts anything that pushes on it | — | — |
| ★ Titan | Supermajor | Titan Line | Twice the health (🥩150 🪲60) | Bites 50% harder (🥩200 🪲90): **Hauler of giants**, carries any treat home alone; or **Juggernaut**, walks through feet and beaks | A second titan (🥩300 🪲120 🧬4): **Roar**, stridulates: every rival in the region flees; or **Monster slayer**, triple damage to bosses | — | — |
| Trap-jaw | Major | Centipede plate + Armory II | Snaps 30% harder (🥩30 🪲10) | Jumps 50% further (🥩50 🪲20): **Snap guard**, kills the first small foe through the door; or **Long jump**, clears two gaps in one jump | 30% more health (🥩80 🪵10): **Hair trigger**, always bites first; or **Escape artist**, always jumps clear of feet and beaks | — | — |
| Raider | Soldier | War camp | 15% faster (🥩30 🌾30) | 30% more health (🥩60 🌾50): **War drum**, raid columns form in half the time; or **Pillager**, carries rival food home | Bites 30% harder (🥩100 🪲20): **Siege**, breaks rival Gates; or **Swift return**, survivors run home 2× faster | — | — |
| Brood raider | Raider | Brood raiding | Carries 2 pupae (🥩50) | 30% faster (🥩80 🍯20): **Propaganda**, rival ants fight each other during your raids; or **Gentle jaws**, every stolen pupa survives | 40% more health (🥩120 🪲20): **Mixed colony**, stolen workers keep their species' skill; or **Usurper**, takes over a rival nest whose queen is dead | — | — |

**Nest and royals.** The ants that keep the nest alive, and the young queens that carry the colony on.

| Ant | Grows from | Unlocked by | L1 | L2 (pick one) | L3 (pick one) | L4 | L5 mastery (pick one) |
|---|---|---|---|---|---|---|---|
| Nurse (built) | Queen | Nursery | Eggs hatch 15% faster (🌾20 💧10) | Tends 2 eggs at once (🌾40 💧20): **Wet nurse**, larvae eat 30% less; or **Medic training**, heals hurt ants in the nest | Works 30% faster (🌾70 🍯10): **Brood guard**, fights like a soldier inside the nest; or **Attendant**, the queen lays 20% faster | Eggs hatch 25% faster again (🌾120 🍯25) | (🌾200 🍯50 🧬2): **Teacher**, every ant hatches Seasoned; or **Caste-shaper**, choose any caste for an egg at the cost of a worker |
| Replete | Nurse | Honeypot vault | Holds 25% more (🍯10) | Holds 25% more again (🍯20 💧20): **Sugar keg**, holds twice the 🍯; or **Water keg**, holds twice the 💧 | Can't be stolen (🍯40): **Living larder**, feeds ants directly: upkeep −15%; or **Drought store**, never spoils; lasts the winter | — | — |
| Medic | Nurse | Infirmary | Heals 30% faster (🌾30 💧10) | Carries the wounded (🌾50 💧20): **Field medic**, treats ants where they fall; or **Stretcher**, carries the wounded home 2× faster | 40% more health (🌾90 🍯15): **Life saver**, a veteran's first death is only a wound; or **Antiseptic**, no infections in the nest | — | — |
| Undertaker | Nurse | Midden | Works 30% faster (🌾20) | Carries 2 (🌾40 🪨10): **Recycler**, the dead become 🥩; or **Clean nest**, disease halved | Never gets sick (🌾70 🍯10): **Remembrance**, a fallen Elite inspires: fighters +10% for a minute; or **Plague wall**, rival diseases never spread to you | — | — |
| Princess | Queen | Polygyny | Lays 25% faster (🌾100 🍯30) | 30% more health (🌾150 🍯40): **Heir**, takes over at once if the queen dies; or **Founder**, leaves with 20 ants to found a satellite | Matches the queen's level (🌾250 🍯60): **Twin rule**, both queens lay at full speed; or **Ambassador**, satellites she founds start with a Granary and Hatchery | — | — |
| Breeder | Queen | Royal chamber + 🍯 | Flies 30% further (🌾60 🍯20) | Founds nests 30% faster (🍯40 🪵10): **Twin queens**, a new nest starts with two queens; or **Swift founding**, a new nest starts with 10 workers | Survives birds on the way (🍯60 🪵20): **Long flight**, can found a nest on any scouted ground; or **Strong line**, satellite queens start at level II | — | — |

**The queen** goes to level VIII: I, 20 ants (start; built) · II, 40 ants (🌾40 🥩10; built) · III, 60 ants (🌾80 🥩20 🪨20; built) · IV, 80 ants (🌾150 🥩40 🪨40; built) · V, 100 ants (🌾250 🥩60 🍯20) · VI, 120 ants (🌾400 🥩90 🍯40) · VII, 140 ants (🌾600 🥩120 🍯60 🪲20) · VIII, 160 ants (🌾900 🥩180 🍯100 🪵40).

She takes a permanent trait three times: at level IV, **Fertile** (lays 25% faster) or **Hardy** (shrugs off the first three bites of any raid that reaches her); at level VI, **Brood mother** (eggs cost 30% less) or **Matriarch** (every ant has 10% more health); at level VIII, **Mother of nations** (satellite queens start at level IV) or **Eternal line** (if she dies, a new queen takes over; the colony never falls).

### Veterans: experience for single ants (proposed; Civilization, XCOM)

Every ant earns experience by doing its job and climbs five ranks, shown on the ant itself:

| Rank | At | Effect | Look |
|---|---|---|---|
| Callow | just hatched | −10% at its job | Pale, almost see-through |
| Seasoned | 20 xp | +10% at its job | Its proper colour |
| Veteran | 60 xp | +20%, and its first promotion | Darker, a little bigger |
| Elite | 150 xp | +30%, a second promotion, and a name | Dark, with a scar or a glint |
| Legend | 400 xp, or a boss kill | +40% and a title, like "Thorn, Spider-bane" | A soft glow; on the map; on the memorial wall when it dies |

Experience: forager, 1 per load home; more for long trips and treats; scout, 1 per new patch of ground; builder, 1 per 2 tiles dug; 3 per room built; soldier and fighters, 3 per fight survived, 5 per kill, 50 for a boss; nurse, 2 per egg hatched; any ant, 10 for surviving a raid, a flood or a stomp.

Promotions come from a list per family. **Gatherers:** Trailwise (faster on trails) · Strongback (+1 carried) · Keen nose (sees food further) · Dodger (dodges the first strike). **Diggers:** Quick digger · Steady (no cave-ins nearby) · Packer (+1 spoil) · Fixer (repairs as it passes). **Fighters:** Brawler (+bite) · Guard (+defence at home) · Hunter (+damage to big bugs) · Skirmisher (+speed) · Ambusher (first hit doubled). **Nest:** Gentle (+hatch speed) · Healer (heals nearby) · Tidy (less disease). With hundreds of ants, the player sets a **doctrine** per ant type (which promotion its Veterans take and which its Elites add) instead of picking per ant.

Keeping and making veterans:

- Drill hall (Society node): soldiers hatch Seasoned, like Civilization's Barracks.
- Colony memory (Society, late): every new ant hatches Seasoned.
- Medics carry the wounded home; with Life saver a veteran's first death is only a wound.
- Long-lived workers (Bodies): ants live twice as long, so veterans stay.
- Division of labour (Society): ants nurse young and forage old, earning experience in both.
- Your rebirth: when your ant dies you can come back as one of your Elites or Legends.

Precedents: Civilization V and VI promotions and the Barracks head start; XCOM ranks, names and memorial; real ants, where experienced foragers do better and workers change jobs as they age.

## Track 4: Evolution (the tech tree)

**The currency is 🧬 Genes,** earned by growing, exploring and hunting, so the tree advances with play, not with waiting:

- 🧬1 for every 10 eggs hatched (a generation)
- 🧬1 for each region scouted for the first time
- 🧬1 for each new kind of thing brought home for the first time: a beetle shell, a slug, wood (revised; Grounded's scanning). It also shows a card on what the thing is for, and the recipes that use it
- 🧬2–5 for each boss killed
- 🧬1–2 for each colony goal completed (see Track 5)
- 🧬5 for each rival queen killed

The tree has three branches, eight nodes each. A node costs 🧬 plus some materials. Some nodes need a trophy or a held region, which ties the tree to the map.

There are about 24 nodes. **By the end of the yard you can afford roughly two-thirds of them,** so every colony is a set of choices. The rest come in Act 2.

Three rules from the research:

- **Boosts** (revised; Civ VI): each node has a deed that halves its 🧬 cost, and the deed is always possible in the yard. For example, Strong mandibles is boosted by killing 20 rival ants, and Big crop by hauling 10 treats.
- **Nodes change how you play** (revised): plain stat bumps live in the caste upgrades instead.
- **Respec** (revised; Hades): a node can be refunded for a trophy's worth of cost. The lineage pick can't.

**Bodies** (what an ant is):

| Node | Effect | Cost |
|---|---|---|
| Strong mandibles | Fighters bite +25% | 🧬2 🥩10 |
| Trail runners | Ants on a scent trail move 25% faster, so trails become roads | 🧬2 🌾30 |
| Big crop | Foragers carry 8, not 5 | 🧬3 🍯10 |
| Tough cuticle | Ants have 50% more health | 🧬3 🪲10 |
| Formic spray | Soldiers bite at 2 tiles | 🧬4 🥩20 |
| Majors | Major caste (with Barracks II) | 🧬4 🪲20 |
| Heat tolerance | Work through summer heat and on hot stone | 🧬3 (with seasons) |
| **Lineage** (pick one, forever) | Acid: every fighter sprays (fire-ant style). Trap-jaw: one-bite kills on small foes and a jump that escapes feet. Bullet: a sting that stuns bosses and doubles damage to them | 🧬8 and any three trophies |

**Senses** (how the colony thinks; most of your powers live here):

| Node | Effect | Cost |
|---|---|---|
| Waypoints | Outposts (early: the first expansion tool) | 🧬1 🪨10 |
| Strong scent | Trails fade half as fast | 🧬2 |
| Danger scent | A second mark: foragers route round it (pits, fire ants, the web) | 🧬2 |
| Rally scent | A third mark: fighters gather to it | 🧬3 |
| Bigger crews | Recruit up to 30, then 45 | 🧬3, then 🧬5 |
| Lookout | Scouts; outposts +2; boss patrols on the map | 🧬3 🪨20 |
| Night sense | Forage at night (with day and night) | 🧬3 |
| Hive mind | Idle ants answer the colony's biggest need on their own: crews form for treats, guards answer alarms | 🧬6 (late) |

Hive mind is the automation the player **earns**: the game stays hands-on early and lightens up once you've proved yourself.

**Nest** (how the colony lives):

| Node | Effect | Cost |
|---|---|---|
| Hatchery II / III | More eggs at once | 🧬1 each, with materials |
| Store II / III | More food | 🧬1 each, with materials |
| Aphid farming | Tended aphids refill twice as fast and give 🍯 | 🧬2 (needs a garden region held) |
| Insulation | Rain cave-ins and floods halved | 🧬2 |
| Honeypot vault | Repletes | 🧬3 🍯20 |
| Fungus garden | Leaves become food | 🧬4 (needs the Leaf pile held) |
| Royal chamber | Breeders, mating flights, satellites | 🧬5 🪵20 |
| Highways | Tunnels between nests: food and ants move between them | 🧬5 🪵30 |

Later: **Supercolony** (every nest one network; trails between nests never fade).

### The expanded tree (revised Oct 29)

This supersedes the three tables above: five branches, two of them new (Society and Symbiosis), each ending in expensive late nodes (in bold). A yard run affords about half. Each line is a chain: a node needs the one before it.

**Bodies:** what an ant is: jaws, armour, glands, size.

- Strong mandibles (🧬2 🥩10; fighters bite 25% harder) → Formic spray (🧬4 🥩20; soldiers bite at 2 tiles) → Exploders (🧬5 🥩40; the Exploder ant)
- Strong mandibles (🧬2 🥩10; fighters bite 25% harder) → Stridulation (🧬4; ants squeak through the soil: the nest rallies in 2 s)
- Trail runners (🧬2 🌾30; 25% faster on a scent trail) → Big crop (🧬3 🍯10; foragers carry 8, not 5) → **Social stomach** (🧬8 🍯50; ants share food mouth to mouth: no ant far from home ever starves)
- Tough cuticle (🧬3 🪲10; 50% more health) → Majors (🧬4 🪲20; the Major ant (with Barracks II)) → **Polymorphism** (🧬9 🪲60; the Supermajor ant)
- Tough cuticle (🧬3 🪲10; 50% more health) → Metapleural glands (🧬5; a natural antiseptic: mould and disease halved)
- Heat tolerance (🧬3; work through summer heat; the Desert runner) → **Long-lived workers** (🧬10 🍯40; ants live twice as long, so veterans stay)
- **Lineage: pick one, forever** (🧬8 + 3 trophies; acid: every fighter sprays · Trap-jaw: one-bite kills and a jump · Bullet: a sting that stuns bosses. Unlocks the Lineage champion)

**Senses:** how the colony thinks: scent, sight, the sun, and your powers.

- Waypoints (🧬1 🪨10; outposts) → Lookout (🧬3 🪨20; scouts; +2 outposts; boss patrols on the map) → Sun compass (🧬6; foragers walk straight home and never get lost)
- Strong scent (🧬2; trails fade half as fast) → Danger scent (🧬2; foragers route round a danger mark) → Rally scent (🧬3; fighters gather to a mark) → **Hive mind** (🧬10; idle ants answer the colony's biggest need on their own)
- Strong scent (🧬2; trails fade half as fast) → Propaganda scent (🧬7; rival ants turn on each other during your raids)
- Bigger crews (🧬3; crews of 30) → Bigger crews II (🧬5; crews of 45) → **War columns** (🧬9 🥩80; lead raids of 60 that march as one)
- Night sense (🧬3; forage at night) → Vibration sense (🧬5; feel feet and the mower coming: 2 s warning)

**Nest:** how the colony lives: rooms, stores, depth.

- Hatchery II (🧬1 + materials; 3 eggs at once) → Hatchery III (🧬1 + materials; 5 eggs at once) → Brood chambers (🧬6 🍯30; eggs cost 25% less)
- Store II (🧬1 + materials; 400 food) → Store III (🧬1 + materials; 1000 food) → Honeypot vault (🧬3 🍯20; repletes)
- Store II (🧬1 + materials; 400 food) → Granary (🧬2 🪨30; harvesters; seeds never rot)
- Insulation (🧬2; cave-ins and floods halved) → Thermal chimneys (🧬6 🪨60; the nest never floods; eggs hatch 15% faster)
- Infirmary (🧬3; medics)
- Midden (🧬2; undertakers; disease kept away)
- Workshop III (🧬6 🪵30; architects) → **Deep halls** (🧬8 🪨100; a fifth soil band; Miners)
- Royal chamber (🧬5 🪵20; breeders, mating flights, satellites) → Highways (🧬5 🪵30; tunnels between nests) → **Shared stores** (🧬9; every nest draws on every store)

**Society:** how ants organise: jobs, war, queens. New.

- Division of labour (🧬3; ants nurse young and forage old, earning xp in both) → Drill hall (🧬4 🥩40; soldiers hatch Seasoned) → **Colony memory** (🧬12; every ant hatches Seasoned)
- War camp (🧬3 🪨30; raiders) → Brood raiding (🧬6; brood raiders (needs a rival queen killed))
- Polygyny (🧬6 🍯40; a second queen: the Princess) → Honour guard (🧬5; elite soldiers guard the queens; the queen can't be reached by raids under 30)

**Symbiosis:** partners from other species: aphids, fungus, beetles, flowers. New.

- Aphid farming (🧬2; herders; 🍯 from aphids (garden held)) → Mealybug ranching (🧬4; root cellar and Ranchers: sugar underground) → **Honey economy** (🧬8; 🍯 can pay wherever 🌾 can)
- Fungus garden (🧬4; leafcutters; leaves become food (Leaf pile held))
- Beetle guests (🧬4; rove beetles live in the nest and eat parasites: disease halved)
- Flower nectar (🧬3; flowers in held regions give 🍯)

### Great evolutions (proposed; Civilization wonders, Stellaris ascension perks)

Huge one-time choices. Each copies a real species' way of life, changes how the colony plays, and shows in the yard. **A colony gets three of twelve:** the first slot opens around 1 hour (after the second boss), the second with the lineage pick (2–3 hours), the third at 12 regions held (around 4 hours). Some rule each other out.

| Great evolution | Real ants | What it does | In the yard | Cost | Needs | Rules out |
|---|---|---|---|---|---|---|
| Living Bridges | Army ants | Bridgers link up to cross gaps, puddles and walls. New shortcuts open everywhere. | Chains of ants hang across gaps and puddles. | 🧬15 🥩100 | Centipede beaten | — |
| Raft Colony | Fire ants | Floods stop being disasters. Rafters float the colony, and a flood can carry a raft to new ground. | Floating mats of ants drift on the puddles after rain. | 🧬15 🍯40 | Wet strip held | — |
| Weaver Canopy | Weaver ants | Weavers build nests in the hedge and the Oak, out of reach of feet and floods, close to the caterpillars. | Balls of leaves stitched with silk hang in the hedge. | 🧬18 🍯60 | Hedge row held; Hornworm silk | — |
| Fungus Empire | Leafcutter ants | Gardeners and vast fungus halls. The colony cap rises by half; leaves become your main food. | Green highways of leaf bits stream across the lawn. | 🧬20 🌾200 | Leaf pile held; Fungus garden | Army of the March |
| The Great Mound | Wood ants | A thatch mound rises over the nest and warms it: eggs hatch 30% faster and winter is halved. It is loud: Notice +15. | A mound you can see from anywhere in the yard. | 🧬20 🪨200 🪵80 | Workshop III | Army of the March |
| Army of the March | Army ants | The colony goes nomadic. No rooms: the nest is a living ball of ants that moves to any region, and raid swarms sweep regions clean. | A swarm front flows across the map, and everything flees it. | 🧬25 + 3 trophies | War columns | Fungus Empire, The Great Mound |
| The Peony Pact | Ant-plant partners | A peony bonds with the colony. It grows huge, feeds you nectar, and its leaves shade your ants from birds. You defend it. | A giant peony blooms over the flowerbed, full of your ants. | 🧬15 🍯40 | Flowerbed held | — |
| Blue Butterfly Pact | Large blue butterflies | Caterpillars live in your nest and give honeydew. Each spring they hatch, and birds chase the butterflies instead of your ants. | A cloud of blue butterflies rises from your nest. | 🧬15 🍯30 | Aphid farming | — |
| Supercolony | Argentine ants | Every nest becomes one colony with many queens. Rival ground next to yours erodes on its own. | Your colour spreads across the yard map. | 🧬25 | Highways; 3 satellites | — |
| Swarm Day | Nuptial flights | Once a year, hundreds of winged ants rise from every nest. Birds gorge on them, not on workers, and three satellites are founded at once. | The sky over the yard fills with wings. | 🧬20 🍯100 | Royal chamber | — |
| Titan Line | Giant supermajors | Titans as big as a beetle: they carry a cookie alone and wrestle the toad. | Huge ants among your workers, and footprints in the dust. | 🧬20 🪲80 | Polymorphism | — |
| Brood Empire | Slave-maker ants | Raids capture rival workers. Your colony becomes many species, and each keeps its skills. | Ants of every colour in your tunnels. | 🧬18 | Brood raiding; 2 rival queens killed | — |

## Track 5: You (the player's ant)

- **Reborn as you choose.** When your ant dies, you pick your next body from the castes you've unlocked:
  - a Scout to explore
  - a Soldier for a fight
  - a Venom ant for a boss
  - a Forager (the default)
- **Your powers grow** through the Senses branch: crew size, scent types, rally points.
- **The colony goals board** keeps three goals open at once, one short, one medium and one long. Each pays 🧬 and points at something the colony hasn't done. Goals come in **themed sets** (revised; Stardew's bundles), such as Garden, Hunter, Builder and Explorer. Finishing a set pays a permanent colony-wide reward. For example:
  - "Haul a cookie home."
  - "Scout Slug Alley."
  - "Build Hatchery II."
  - "Kill the hornworm."

  This board is the "always something to do" guarantee, and it teaches depth without a wall of text.
- **The memorial wall** (from the handoff): every body you've lived in, and how it died.

## Materials: seven, each with a verb and a problem

| Material | Where | How you get it | Its problem | Spent on |
|---|---|---|---|---|
| 🌾 Food | Everywhere | Forage (built) | Everyone eats it, all the time | Eggs, upkeep, rooms |
| 💧 Water | Dew, puddles, the Spigot | Forage (built) | Dew lasts a minute; puddles are far | Eggs |
| 🥩 Protein | Kills, dead bugs | Hunt, haul (built) | Needs a squad; meat rots on the ground after 3 minutes (new) | Fighters, queen |
| 🪨 Stone | Pebbles | Builders fetch (built) | Heavy and slow, and builders are busy | Rooms, outposts, upgrades |
| 🍯 Sugar | Aphids, treats, the feeder | Tend aphids; haul treats | Sticky: draws rivals to your trails, and odorous house ants steal it | Queen V–VI, breeders, the Honeypot, Big crop |
| 🪲 Chitin | Beetle shells, boss kills, the Woodpile once held | Haul carcasses | Needs an Armory to be any use | Majors, armoured castes, Tough cuticle |
| 🪵 Wood | The Oak, the Woodpile, the Fallen limb | Only Carpenters cut it | Carpenters need the termite queen beaten first | Tier III rooms, the Royal chamber, the Gate, Highways |

A new material arrives every 30–60 minutes, each with its own way of playing.

## The challenge: how the yard pushes back

Four dials, all already started in the game:

**1. Distance** (built): the further from home, the worse the ground. Each ring has its own hazards and a guardian.

**2. Bosses** (Valheim, Terraria). A boss guards a region's Prize. Beating it gives 🧬 and **two drops**, and it doesn't come back:

- **A trophy** that unlocks a caste.
- **A key** that opens the next ring's gate: a scent the guardians of the next ring respect, or a material the next gate needs.

Each region supplies most of what its boss needs. The ring order is recommended, not forced, and the mantis and the toad are optional (lineage trophies).

| Boss | Where | How to beat it | Trophy unlocks |
|---|---|---|---|
| Wolf spider (built) | Flowerbed | 30 ants, or 5 Venom ants | Venom ants |
| Hornworm | Tomato rows; eats the plants your aphids live on | A crew of 25 with soldiers | Master builders |
| Ground beetle | Rock garden | Armoured: only Venom ants or Majors hurt it | Armored foragers, the Armory |
| Antlion queen | The Sandbox's deepest pit | Lure it with a rally mark, hit it from above | Sappers |
| Mantis | Hedge row | Ambushes from above and picks off scouts; Acid or Venom | Lineage (counts as a trophy) |
| Wasp nest | Under the Shed's eaves; wasps patrol the Grill and Cooler | An army, at night when they're slow | Acid sprayers |
| Roach | Trash cans, at night | Night foragers' cousin: it raids your trails at night | Night foragers |
| Centipede | Leaf pile | Fast and hunts in the dark: Trap-jaws or Majors | Trap-jaws |
| Termite queen | Inside the Fallen limb | Dig in with Sappers and Majors | Carpenters (wood) |
| Toad | Toad hole | Huge: an army of 60 with Acid or Bullet, or drive it off for good | Lineage (counts as a trophy) |
| Fire ant queen | The Fire Ant Mound | The finale | The yard is yours |

**3. Rivals that spread.** Rivals claim regions too, and if left alone they grow and spread. Killing a queen ends that colony's front. Each species fights differently (from the handoff):

| Rival | Home | Wakes | Style |
|---|---|---|---|
| Pavement ants (built) | Patio | At the start | Raids your nest; the first war |
| Odorous house ants | Trash cans | When you hold 4 regions, or at 30 minutes | Never raid; steal from trails and the store; drawn to sugar |
| Argentine ants | Peppers and herbs | At 60 minutes, or 8 regions held | A supercolony with many queens: spreads a region every few minutes; you must burn out every satellite |
| Carpenter ants | The Oak | Always there; don't spread | Big Majors hold the Oak; the gate to wood |
| Fire ants | The far corner | Raid your held regions and outposts from the 90-minute mark | Acid; the final war |

**4. Notice (the humans)** (revised; Against the Storm's Hostility, RimWorld's raid points). Notice points come from:

- each year that passes
- every 10 ants
- each region opened, with regions near the house counting double
- surface traffic and treats taken near the house

Stored food counts for little, so saving up isn't punished. Points come off when you lose ants, move activity away from the house, or take the Senses node *Quiet trails*.

It is the player's choice: grow loud by the house (the richest crumbs) or quiet out in the far yard.

| Notice | What the humans do |
|---|---|
| 25 | More feet on the steps, porch and paths |
| 50 | **Bait traps:** poison food that kills the ants who eat it, later. A Senses node, "Bait wisdom", lets foragers refuse it |
| 75 | Spray rounds, and an **ant powder line** along the house that blocks the Steps and Porch for a while |
| 100 | **The exterminator.** A timed finale event: nests near the house are gassed, so you need satellites far out or deep |

**The director** (handoff §3.8) spends a threat budget made of time, colony power and Notice. Its rules:

- Never two lethal events within 3 minutes.
- Only gentle events while the colony is under 30% of its cap.
- Escalate after 6 calm minutes.
- Prefer hitting the nest when you've been out a long time.

## Pacing: a target for the first hours (Act 1, the yard)

| Time | The player is… | New to build | New threat |
|---|---|---|---|
| 0–10 min | Founding, the first crumbs, the first crew and treat | Hatchery, Store | Feet, robins nearby |
| 10–30 min | The ring round home; first hunt (caterpillar); Train foragers I; **Waypoints, first outposts**; goals board appears | Cistern, Workshop, outposts | Pavement raids; the mower |
| 30–60 min | **Spider** → Venom; the pavement war, and taking their queen; queen II–III; Hatchery II | Barracks, Venom lab, Lookout | Odorous house ants wake; Notice 25 |
| 1–2 h | Mid yard: **hornworm**, **ground beetle**, **antlion**; 🍯 sugar and 🪲 chitin; the Armory; the **first mating flight** and satellite | Royal chamber (with first 🪵 from the Woodpile), tier II rooms | Argentine ants wake and spread; bait traps at Notice 50 |
| 2–4 h | Outer yard: **wasps**, **roach**, **centipede**, **termite queen** → wood; the **lineage pick**; Highways between nests | Tier III rooms, Gate, Honeypot, Fungus garden | Fire ants raid held ground; spray rounds and powder lines |
| 4–6 h | The **toad**, the **fire ant war**, the **exterminator** | Supercolony | The finale |

The bot targets in `DEPTH.md` still apply: something new every 5–8 minutes, and at least two real crises before minute 20. Added:

- At any moment, at least one affordable next thing on three different tracks.
- A hands-off colony never holds more than its home ring.

## Always more to build

What never runs out:

- Room tiers, and a bigger pocket for each.
- Outposts (the cap rises).
- Satellite nests, each with its own nest to dig and fill.
- Highways between them.
- Queen levels to VI.
- Evolution: two or three affordable next nodes at any time.
- The goals board.

After the yard:

- **Act 2, the house:** the handoff's tiers. The edges (sidewalk, driveway, porch, doormat), then the ground floor (kitchen, pantry, bathroom), then the deep house (walls, basement, attic). New materials, bosses and rivals, and the Notice dial is at its fiercest indoors.
- **The yard turns harder** (revised; Terraria's Hardmode): beating the fire ant queen sets the yard to a harder state. New spawns and stronger rivals return to ground you've already held, so it stays alive while you push into the house.
- **A new property (New Game+):** a mating flight to the next yard, carrying one trait.
- **Endless:** the years go on, each one harder (with seasons).

## Seasons (a big optional layer)

A year of four seasons, about 12–15 minutes each:

| Season | What changes |
|---|---|
| Spring | Aphids bloom, rain, everything wakes |
| Summer | Rich food, heat, the mower often |
| Autumn | Acorns and leaf fall: stockpile |
| Winter | Little to forage, cold slows ants; the colony lives on its store (Honeypot, Store III) and can hibernate through it |

Each new year, rivals and the director step up.

Seasons give the whole game a rhythm: build, harvest, prepare, survive. They make the storage rooms and the Notice choice matter. It's biologically right too: real colonies overwinter. Seasons are also the most proven rhythm in colony games: Northgard's winters, Frostpunk's cold and Against the Storm's storm season. They are still the biggest change on this page, so they're Mark's call, with a recommendation of yes.

## Built today vs proposed

| | Built | Proposed |
|---|---|---|
| Territory | Explore to wake regions; forage range and training | Outposts, Held regions and Prizes, satellites, supply lines |
| Nest | 6 rooms; 3 soil bands; spoil heap | Room tiers I–III, a deep band, 8 new rooms |
| Population | Queen I–IV, and her first trait at IV; 5 castes; upgrade levels for all 5 (the levels needing 🍯, 🪲 or 🪵 show but can't be bought yet); veteran ranks, doctrine and named Elites (build 12) | Queen V–VIII, satellite queens, 32 more castes |
| Evolution | 🧬 Genes from scouting, first finds, every 10 eggs and big kills; 15 of the tree's nodes live, the rest shown as coming (build 12) | The other nodes, deeds for every node, respec, the lineage pick, great evolutions |
| You | Crews to 20, 30 or 45; come back as a named Elite or Legend; the fallen are remembered (build 12) | Rebirth as any unlocked caste; scent types; the goals board |
| Materials | 4 | 7 |
| Challenge | Distance hazards, the spider, growing raids | 10 more bosses, 4 more rivals that spread, Notice, the director, seasons |

## Order to build it in

The research changes step 1 a little: discovery (studying a thing the first time it comes home) and the themed goal sets join Genes as the first things built.

Each step is a few pieces, playable on its own:

1. **Foundation:**
   - 🧬 Genes and the colony goals board
   - Outposts (Waypoints)
   - Held regions and their Prizes
   - Choosing your rebirth
2. **New materials:** 🍯 sugar (Aphid farming) and 🪲 chitin; Hatchery and Store tiers.
3. **Bosses, first wave:** hornworm, ground beetle, antlion. Trophies and their castes; the Armory and Workshop II.
4. **Rivals that spread:** odorous house ants and Argentine ants, with rival ground shown on the map.
5. **Satellites:** the Royal chamber, mating flights, satellite nests (more than one nest view), Highways.
6. **The humans:** Notice, human countermeasures, the director.
7. **Outer bosses:** wasps, roach, centipede, termite queen (wood), the toad; the lineage pick.
8. **Seasons** (if wanted).
9. **The finale:** the fire ant war and the exterminator.
10. **Act 2** (the house) or New Game+.

## Decisions for Mark

1. **Seasons:** yes or no, and how long a year?
2. **The tech tree's currency:** 🧬 Genes earned by growing, exploring and hunting (proposed), or research done in a room over time?
3. **Claiming the map:** outposts first, then satellite nests (proposed)?
4. **After the yard:** into the house (the original plan), a new yard (New Game+), or both?
5. **How big a colony?** Hundreds of ants across several nests (proposed), or keep it to one nest of about 100?
6. **Permanent choices.** Proposed, after the research: the lineage pick plus the caste upgrades' pick-one-of-two abilities, as in Empires of the Undergrowth. Too many, too few, or right?
7. **Great evolutions:** three per colony out of twelve (proposed), or more or fewer?
8. **Veterans:** a doctrine per ant type (proposed), or also let the player pick promotions by hand for named Elites?
