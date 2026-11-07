# Performance: what the big-battle games do, and what Underfoot does (build 80)

Mark: "Saw this video talking about how to mitigate frames and improve performance and logic with units… keep on looking into what the devs of those games say about these kinds of things… see what you can do."

## Already done

| What they do | Who said it | Underfoot |
|---|---|---|
| **Find a way once, share it with everyone** | Total War (one route per unit); Supreme Commander 2 and Planetary Annihilation (flow fields: *Game AI Pro*, ch. 23) | **Done.** One "way home" field per colony that every ant reads. The careful route search is only for your ant, the spider and outposts. |
| **A grid, so you only check who's near** | Hitman: Absolution (a 16k-cell grid, each cell listing its agents) | **Done** for ants against ants. Bugs, hunters and bosses still check every ant, but that's 4% of the simulation. |
| **A dice roll, then a set animation** | Total War (matched combat; Warhammer moved to one-sided reactions triggered by the hit) | **Done:** dice rounds with a lunge. Ours are one-sided already. |
| **Sleeping things cost nothing** | Factorio ("one of the core reasons the game runs as well as it does") | **Done for idle ants** (build 45). |
| **The simulation slower than the picture, the picture smoothed between** | Supreme Commander (10 ticks a second, the picture at 60); Total War: Warhammer II (logic separate from the display) | **Done:** 20 ticks a second with smoothing. |
| **Don't draw what's off screen** | Everyone | **Done** (build 65). |

## Measured

- **The simulation:** 0.73 ms a tick for 99 ants and 37 bugs. At 20 ticks a second that's about 1.5% of one core: there's no simulation problem to solve at this size.
- **The drawing:**
  - The yard drew about **152,000 triangles** a frame at a 640×400 picture, more triangles than a third of its pixels.
  - **115,000 of them were the flat ground:** each region drawn as one square per tile.
- **This machine:** it has no graphics card, so its frame times mean nothing. The 2 fps and the "busy" times come from a software rasterizer fighting the game for the CPU.

## Done in build 80

- **The ground at a sixteenth of the triangles.** A region with no hole cut in it is now one square per 4×4 tiles. The picture is the same, since the ground is flat and lit per pixel, and the yard went from about 152,000 triangles a frame to 78,000–82,000. Regions with holes keep the fine grid, which the holes need.
- **A performance readout: F3, or `?perf` in the address.** It shows where each frame goes: the simulation, updating the scene, handing it to the GPU, and waiting on the GPU, with draw calls and triangles. It's for reading on real machines (your laptop, a phone), so the next step is chosen from real numbers.

## Next, if the readout asks for it

1. **"update" is large: animate far and small ants less often.**
   - Epic's Animation Budget Allocator does this: every frame near the camera, every 2nd to 4th frame further off.
   - Hitman's lesson: two looping clips with random offsets looked synchronized, so keep the offsets per ant.
2. **"waiting" is large on a phone: the GPU.**
   - Lower the quality step sooner on phones.
   - Merge more of the landmarks.
   - At the widest zoom, draw ants as flat sprites in one batch. That's Rome's distant-soldier trick, and it fits the PS1 look.
3. **Many more ants (colonies of several hundred), if the simulation ever shows up in the readout:**
   - RimWorld 1.6's variable tick rate: off-screen things think 4 times a second, not 60, and are told how long it's been.
   - Factorio's sleep lists: a sleeping thing leaves the update list entirely and is woken by an event.
   - Factorio's capped route search: so many steps per tick, with a cache of routes known not to exist.
4. **A cap on corpses**, as The Riftbreaker does: lying bodies still cost.

## Sources (the developers' own words where found)

- **Factorio, entity sleeping:** [Factorio forum (Rseding91)](https://forums.factorio.com/viewtopic.php?p=303600)
- **Factorio, pathfinding:** [FFF 117](https://factorio.com/blog/post/fff-117), [FFF 121](https://factorio.com/blog/post/fff-121)
- **RimWorld 1.6, variable tick rate:** Ludeon's modder primer
- **Hitman: Absolution crowds:** [Kasper Fauerby, GDC 2012](https://media.gdcvault.com/gdc2012/slides/Programming%20Track/Fauerby_Kasper_CrowdsInHitman.pdf)
- **Total War: Warhammer II, logic and display decoupled:** [Game Developer](https://www.gamedeveloper.com/design/designing-i-total-war-warhammer-ii-i-to-handle-tons-of-units-and-massive-battles)
- **Total War, reactions instead of paired animations:** [PC Gamer](https://www.pcgamer.com/six-new-things-we-noticed-while-playing-total-war-warhammer)
- **Total War engine, instancing:** [GPUOpen](https://gpuopen.com/learn/anatomy-total-war-engine-part-3/)
- **Supreme Commander, sim and display layers:** [Forrest Smith](https://www.gamedeveloper.com/design/opinion-synchronous-rts-engines-and-a-tale-of-desyncs)
- **Flow field tiles:** [Elijah Emerson, Game AI Pro ch. 23](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter23_Crowd_Pathfinding_and_Steering_Using_Flow_Field_Tiles.pdf)
- **Animation budgets:** [Epic, Animation Budget Allocator](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-budget-allocator-in-unreal-engine)
- **Assassin's Creed Unity crowds:** [GDC 2015](https://www.gdcvault.com/play/1022141/Massive-Crowd-on-Assassin-s)
- **Unverified:** Rome's flat pictures for distant soldiers is widely repeated, but I found no developer source.
