# The yard (draft plan)

Status: proposal for Mark to react to. Nothing here is built yet except the first patch (Under the Rock), which is the current game.

## What the specs already say

The handoff (`docs/HANDOFF.md`) has the yard only as a list:

- **§3.4 Tier 1, the Yard:** Under the Rock (start), Lawn (mower), Flowerbed (spider; aphid honeydew), Sandbox (antlion, cave-ins), Spigot (flooding; water channels), Woodpile (termites, centipede; chitin).
- **§3.4 Tier 2, the Edges** (around the yard): Sidewalk, Trash cans, Compost, Driveway, Porch, Doormat, and The Oak.
- **§3.9 pacing:** Under the Rock takes the first 30 minutes, the Lawn is the first claim (up to 1.5 hours), and the rest of the yard runs to about hour 3, when the Oak opens and the first nuptial flight happens.
- **§2.4 rules:** walking off a map edge loads the next area. An area is claimed when you have a nest there and its rival queen is dead. Claimed areas run themselves.

There is no map, no layout per area, and nothing about what food, creatures or landmarks each area has. The rest of this file fills that gap.

## The map

The house is north. The yard is a 3×2 block of areas with the edges wrapped around it. You start in the south-east corner.

```
                 ┌────────────── THE HOUSE (tiers 3–4) ──────────────┐
  tier 2 edges   │  Porch          Doormat          Trash cans       │
                 ├──────────────┬──────────────────┬─────────────────┤
  tier 1 yard    │  Spigot      │  Flowerbed       │  Woodpile       │
                 │  (water)     │  (spider's home) │  (centipede)    │
                 ├──────────────┼──────────────────┼─────────────────┤
  tier 1 yard    │  Sandbox     │  Lawn            │  UNDER THE ROCK │ ← start
                 │  (antlion)   │  (mower)         │                 │
                 ├──────────────┴──────────────────┴─────────────────┤
  tier 2 edges   │  Driveway       Sidewalk         Compost   The Oak│
                 └───────────────────────────────────────────────────┘
```

- **The start is a corner, so the first expansion is a choice of two:** the Lawn (west) or the Woodpile (north). The Lawn is the intended first claim, and the Woodpile is the hard option.
- **Each area is one patch the size of today's map** (48×64 tiles, about 4×5 phone screens). Leaving through an edge loads the neighbouring area, as §2.4 specifies.
- **Water is uneven on purpose.** The Spigot is on the far side from the start, so water stays a real logistics problem until you get there.

## The areas

Each entry covers the area's look, its food, its threat, its unique mechanic and what claiming it gives you.

### Under the Rock (start; built)

- **Look:** a flat stone with a damp overhang, bare soil around it, short grass and pebbles. This is today's map.
- **Food:** bread crumbs, seeds, now and then a berry or popcorn. Dew at dawn and one puddle.
- **Creatures:** the woolly bear caterpillar grazes here. The spider walks through from the Flowerbed and passes the nest every so often.
- **Rival:** a small pavement-ant colony at the far end (today's red-ringed hole).
- **Teaches:** digging, eggs, foraging, trails, the first fight.
- **Claim:** home nest. The map unlocks.

### Lawn (first claim)

- **Look:** tall grass in stripes. Mowed lanes are open highways; unmowed strips are slow mazes of blades. Clover patches.
- **Food:** grass seed (lots), clover flowers, and crumbs and popcorn by a picnic blanket in one corner. **Treats drop at the blanket** (cookie, gummy bear), so it's the first place to send a crew.
- **Creatures:** caterpillars (several) and a grasshopper that kicks ants aside but is harmless.
- **Hazard: the mower.** The storyteller announces it with a rising engine sound. It sweeps lane by lane, killing anything in its path and wiping trails. Afterwards every lane is mowed: fast travel, but no cover.
- **Rival:** pavement ants, defensive.
- **Claim gives:** Scouts (the Lookout room) and a second nest site.

### Flowerbed (the spider's home)

- **Look:** mulch, tall flower stems, a strawberry patch, the spider's web strung between two stems.
- **Food:** strawberry bits, fallen petals (low value), and **aphids on stems**. Ants tend aphids for honeydew (Sugar). This is the first farming mechanic: guard the aphids from ladybugs and they keep producing.
- **Creatures:** **the spider lives here.** Its web is a fixed landmark. It roams out into the Lawn and Under the Rock and comes back (the roaming built in this round is the first step). Ladybugs eat aphids.
- **Hazard:** the spider, at home, near its web, where it is stronger.
- **Claim gives:** the spider fang (Venom ants) and Sugar.

### Sandbox

- **Look:** pale sand with toys as landmarks: a bucket, a shovel and a buried truck.
- **Food: the treat area.** Kids drop jelly beans, gummy bears, cookie and popcorn here more than anywhere else. It's high reward with risk on top.
- **Hazard:** antlion pits (sliding funnels that trap ants), and sand that digs twice as fast but caves in twice as often.
- **Claim gives:** a steady flow of sweet drops, plus Master builders (from the big caterpillar trophy, per §2.4).

### Spigot

- **Look:** a dripping tap, a coiled hose and a muddy low corner.
- **Food:** little food, all the water you want. A puddle that never dries and drips on a timer.
- **Mechanic: water channels.** Dig shallow trenches on the surface to route water toward your nest. Flooding fills low tunnels if you route it badly.
- **Creatures:** mosquito larvae in the puddle (protein if you can reach them), and a toad that eats anything at the water's edge.
- **Claim gives:** a big Cistern upgrade, and water is no longer a bottleneck.

### Woodpile

- **Look:** stacked logs, loose bark and sawdust. It is dark and damp.
- **Food:** dead insects (protein), wood (needs cutters), chitin from beetle husks.
- **Creatures:** termites (a rival that eats wood, not ants) and the **centipede boss**, which hunts at night.
- **Claim gives:** the centipede plate (Trap-jaws), plus Wood and Chitin, which opens the Armory.

## Roaming creatures (cross-area)

Big creatures belong to a home area but walk between areas. That gives the yard a sense of a world beyond your screen.

| Creature | Home | Roams to | Built |
|---|---|---|---|
| Spider | Flowerbed | Under the Rock, Lawn | Roams the current patch, passes the nest every few legs, leaves the map and comes back |
| Woolly bear caterpillar | Lawn | Under the Rock, Flowerbed | Wanders the current patch |
| Grasshopper | Lawn | everywhere in tier 1 | — |
| Beetle | Woodpile | Lawn, Under the Rock | — |
| Bird (event) | overhead | any surface | — |

## Food catalog

| Food | Value | Where | Built |
|---|---|---|---|
| Bread crumb | 5–10 | everywhere | yes |
| Seed (sunflower) | 20 | Lawn, Rock | yes |
| Berry (raspberry) | 10–14 | Rock, Flowerbed | yes |
| Popcorn | 12–16 | Lawn blanket, Sandbox | yes |
| **Jelly bean** (treat) | 40 | Sandbox, Lawn blanket | yes |
| **Cookie piece** (treat) | 35 | Lawn blanket, Porch | yes |
| **Gummy bear** (treat) | 50 | Sandbox | yes |
| Strawberry bit | 15 | Flowerbed | — |
| Honeydew (Sugar) | farmed | Flowerbed aphids | — |
| Dead fly / beetle (Protein) | 20–40 | Woodpile, Porch | as "meat" |
| Cheese puff, chip (treats) | 30–45 | Trash cans, Sidewalk (tier 2) | — |

Treats are rare, worth a crew and a trail, and should come from people: a picnic, kids, a dropped snack. In the full game the storyteller's "Dropped food" event places them. Today they drop at random, about 1 in 16 food spawns, and only one at a time.

## Build order (proposal)

1. **Areas as data.** Turn today's hard-coded patch into an area definition with its own:
   - size and seed
   - terrain painter and landmarks
   - food table, water and residents
   - rival and hazard

   Under the Rock becomes the first entry. This is the refactor that unlocks everything else.
2. **Edges and travel.** Walk off an edge and the next area loads. Unclaimed areas pause when you're away; claimed ones run a cheap background sim.
3. **The Lawn**, with the mower and the picnic-blanket treats. This is the first claim.
4. **The Flowerbed**, with the spider's home and web, aphid farming and Sugar. The spider's roaming then really crosses between areas.
5. **The Sandbox, Spigot and Woodpile**, one at a time, each adding its one mechanic.
6. **The map screen and nuptial flight**, so satellite nests found new areas.

## Questions for Mark

1. **The layout:** house north, start in the south-east corner, Lawn as the first claim. Is that the yard you picture?
2. **Travel:** separate patches that load at the edges (the plan in the specs), or one big continuous yard you can scroll across? Separate patches are much cheaper on a phone.
3. **Treats:** tied to places like the picnic blanket and the Sandbox (proposed), or random anywhere?
