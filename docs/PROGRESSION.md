# Progression

Status: **design proposal (Oct 29), not built.** Mark: "Let's really take time to think out progression… how progression can grow so that the player always has something more to build, more to expand."

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
| Population | Queen I–IV; 5 castes | Queen V–VI, satellite queens, 11 more castes |
| Evolution | — | 🧬 Genes, 24 nodes in three branches, the lineage pick |
| You | One body type; crews to 20 | Choose your rebirth; scent types; the goals board; the memorial |
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
