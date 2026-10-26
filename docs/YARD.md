# The yard

Status: **built (build 8).** The first nine areas form one continuous map. The data lives in `game/src/sim/yard.js`, and the scenery is drawn by `game/src/render/views/yardScenery.js`. The wider plan (tier 2 edges, the house) is further down.

## What the specs said

The handoff (`docs/HANDOFF.md` §3.4) listed the tier 1 yard as six areas, one line each: Under the Rock (start), Lawn (mower), Flowerbed (spider; aphid honeydew), Sandbox (antlion, cave-ins), Spigot (flooding; water channels), Woodpile (termites, centipede; chitin). It had no map and no contents for any area.

## The map (built)

Mark asked for our start in the middle with eight areas around it, as one map. Each area is 40×40 tiles; the whole yard is 120×120 tiles, about 9×7 phone screens at the default zoom. The house is north.

```
  ┌──────────── brick wall of the house ────────────┐
  │ PATIO          │ FLOWERBED        │ WOODPILE      │
  │ rival ants     │ spider's web     │ dead bugs     │
  ├────────────────┼──────────────────┼───────────────┤
  │ SPIGOT         │ UNDER THE ROCK   │ COMPOST HEAP  │
  │ water          │ home (our nest)  │ rich fruit    │
  ├────────────────┼──────────────────┼───────────────┤
  │ SANDBOX        │ LAWN             │ PICNIC        │
  │ treats, pits   │ seeds, mower     │ crumbs, treats│
  └──────────── fence ──────────────────────────────┘
```

| Area | Look and landmarks | Food (per minute, max at once) | Danger | Why go |
|---|---|---|---|---|
| **Under the Rock** (home) | A big flat stone over our entrance; grass and dirt | Crumbs, seeds, a little berry and popcorn. Starts with 14 items, regrows only 1.2 a minute | Little | It's home, and it runs thin by about minute 8 |
| **Patio** (NW) | Concrete slabs, cracks, a flower pot | Crumbs, popcorn, seeds (4, 14); sometimes a cookie | The rival pavement ants nest here | To win, take their queen |
| **Flowerbed** (N) | Mulch, tall flowers, strawberry plants, **the spider's web** | Berries and seeds (3, 10) | The spider rests at its web and ambushes | Rich, steady food |
| **Woodpile** (NE) | Rows of logs: a maze | **Dead bugs (protein)**, seeds, crumbs (2.5, 8) | A slow maze; far from home | The only steady protein besides hunts |
| **Spigot** (W) | The tap at a brick post, a coiled hose, mud | Little food (1, 4); **three puddles that never dry** | Mostly safe | Water |
| **Compost heap** (E) | A heap of scraps on black soil | **Apple cores** (20–28 each), berries, crumbs, seeds (3.5, 12) | Caterpillars graze here; far | The richest food in the yard |
| **Sandbox** (SW) | A wooden frame with two gaps, a bucket, a shovel | Popcorn and crumbs (2, 8). **Treats drop here most** (1 in 5) | **Antlion pits**: the rim slides you in and the bottom bites | Jelly beans and gummy bears |
| **Lawn** (S) | Deep striped grass, clover | Seeds (3, 10) | **The mower**: every 4–6 minutes it sweeps the whole Lawn and kills anything in it | Lots of seeds, if you time it |
| **Picnic blanket** (SE) | A red-and-white checked blanket, a plate, a soda can | Crumbs and popcorn (4, 12); treats (1 in 8) | Far from home | Crumbs and cookies |

## Creatures (built)

- **Spider:** lives at its web in the Flowerbed and rests there in ambush for 20–50 seconds at a time. It roams the yard on paths around obstacles and passes the nest every third leg, never closer than 6 tiles. It never hunts ants on the nest's doorstep. It sometimes goes over the fence for a while.
- **Woolly bear caterpillar:** appears in the Lawn, the Compost or the Flowerbed.
- **Rival pavement ants:** a nest in the Patio cracks. They grow to 60 and raid harder over time.

## Next for the yard

- Aphids in the Flowerbed to farm for honeydew (Sugar), with ladybugs eating them.
- Water channels and flooding at the Spigot.
- Termites and a centipede boss in the Woodpile (chitin).
- Feet and birds over the Picnic blanket.
- A second nest site, plus a nuptial flight to claim an area.
- Tier 2, the edges around this block (from the handoff): Sidewalk, Trash cans, Driveway, Porch, Doormat and the Oak. The house comes after that.
