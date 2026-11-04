# Underfoot: the wilds (design draft, Nov 4)

**Status:** a proposal for Mark. Nothing here is built. Decisions go in `DECISIONS.md` once made.

## Where this comes from

Mark, Nov 2–3:
- "The edges: we add one more layer to the map, and it's the outer edges. They're almost like wastelands. It's like the craziest of the bosses."
- "Out there you find the toad… the bird."
- "At the exterior you have a cordyceps colony threat: a whole colony that's been taken over by cordyceps."
- "At the edges you would have the most difficult, that require you to amass at least three colonies to be able to fight."
- "The oak tree is one of those difficult areas."
- "The more the game progresses, it becomes a little more macro. Just a little bit, not too much… My main nest no longer needs my attention. I'm helping the daughter nests… sometimes I have to come back to the main nest to recruit their efforts for boss fights."

Also already promised in the game: the Supercolony's banner ("beyond the fence the wilds are waiting"). Stored glowrock being dangerous was deferred to here. The house (Phase 2) is a separate track.

## 1. The shape of it

**The wilds are a ring of new ground outside the fence,** on the three sides the house doesn't cover (west, south and east). The yard is a 10 × 8 grid of regions with the house along the top. The wilds add one region's width round it, a ring of about 16 regions in four wild zones (section 2). The Oak's crown (section 2, zone 4) is reached up its trunk, not through the fence.

**What makes them wild:**
- **Nobody's ground.** No rival colonies to raid; no hazards easing as you win. Everything out there is bigger and hungrier.
- **No trails stick.** Wind, water and rubble scatter scent: trails fade four times as fast. You need outposts as relays.
- **Long supply lines.** A forager out there is two regions from the nearest nest. Without an outpost or a daughter close by, foraging doesn't pay.
- **Glowrock lives here.** The glow under your nest seeped from somewhere. The wilds hold its source, and the only big seams of it.
- **Danger rises with the glow.** Ground near the source hurts ants who stay too long (the deferred "stored glowrock is dangerous" idea, moved outdoors where it's a place, not a punishment).

## 2. Four wild zones and a source

Each wild zone has a **wild boss** that a single colony can't beat. The ladder is by colonies joined (section 3).

| # | Zone | Where | Wild boss | Needs | The fight |
|---|---|---|---|---|---|
| 1 | **The Ditch** | south, past the wet strip | **The Duke**, a bullfrog three times Old Warty | 3 colonies | Swallows whole crews (up to 6 in one gulp); dives and resurfaces somewhere else in the ditch; its tongue sweeps a lane. Pin it with 30 biters and it can't dive. |
| 2 | **The Bramble Lot** | west, past the side yard | **Old Black**, a crow | 3 colonies | Lands, struts, and steals: it carries ants off, and glowrock from outposts. Out of reach in the air. A **shiny decoy** (a crew carrying a bottle cap) brings it down; then it's a brawl. |
| 3 | **The Hollow** | east, past the hedge | **The Cordyceps Colony** | 4 colonies | A dead ant colony the fungus has taken: zombie ants pour out in waves, and spore clouds infect the living. At its heart, a fungal stalk. Medics cure the infected; you need waves of fighters to reach the heart. |
| 4 | **The Oak's Crown** | up the Oak's trunk | **The Hornet Queen** | 4 colonies | Her paper nest in the Oak's hollow. Hornets dive at anything on the bark. Crews climb the trunk in columns. Win, and her comb is full of larvae: the meat jackpot. |
| 5 | **The Drum** | the far corner of the Bramble Lot | **The Thing in the Drum** (final) | the Supercolony | A rusted barrel leaking green: the source of the glow. Something big and wrong lives in it, a mutated millipede or worse. Ground round it burns ants slowly. The last fight of the yard tier. |

**Wild prizes** (held like yard regions, when their boss falls):
- **The Ditch:** water never runs short; mud lets builders seal a cave-in instantly.
- **The Bramble Lot:** brambles shelter outposts (no birds).
- **The Hollow:** your colony is immune to cordyceps for good.
- **The Oak's Crown:** hornet larvae, a steady 3 meat a minute. That finally answers the meat ceiling, at the very end.
- **The Drum:** a glowrock seam (one every 5 minutes), and what comes after: the house, the grand arc.

## 3. Musters: the macro layer

The "three colonies" rule needs a mechanic, and it's also where the game turns macro, as Mark described.

**A muster** is a call to arms from the map:
- Tap a wild boss's lair on the map and choose **Muster**. Each colony you pick (main nest, any joined daughter) sends a contingent of its fighters. The War Camp sends the most, and the Brood Hall its big castes.
- **They march on their own,** through tunnels to the daughter nearest the fight, then overland. You watch the columns on the map.
- **Wild bosses can't be fought without a muster** of at least as many colonies as their tier needs. Their lair doesn't wake for less.
- **You lead it.** The fight is on the surface as now: your ant, your crew and the columns. You can still use your abilities and crew orders.

**Standing orders for daughters** (the "main nest no longer needs me" feel):
- Each daughter gets an order on the map: **Gather**, **Guard**, or **Ready**. Ready means her fighters are on call for musters.
- The main nest gets the same.
- The game nudges you there: "Your War Camp is idle: set her to Ready?"

This keeps the game hands-on (you still fight in person) but lets you think in colonies.

## 4. How you get there

- **The fence gap** opens when your **third daughter is joined**. A banner: "Something has dug under the fence." That opens the Ditch and the Bramble Lot (3 colonies).
- **The Hollow and the Oak's Crown** need 4 colonies (main + 3 daughters).
- **The Drum** needs the Supercolony. Its banner already promises the wilds; with this design it promises the Drum.
- **Phase 1's ending** (13 guardians, the back door opening) stays as is. The wilds are optional depth alongside the house, not a gate before it. *(Question for Mark: should the Drum come before the house?)*

## 5. What it costs to build (rough)

| Piece | Size |
|---|---|
| The ring of wild ground (16 regions, four zone looks: ditch, bramble, hollow, rubble) | large: yard data, ground, landmarks, map photos |
| The Oak's Crown (climbing the trunk, the hollow) | large: the first vertical ground in the game |
| Five wild bosses with characters | one build each, like the guardians |
| Musters and standing orders | medium: map UI, columns marching |
| Wild rules (fast-fading trails, glow sickness, supply) | small |
| Saves | the yard keeps its seed; the ring is generated on its own stream, so old yards don't change |

**A suggested order:**
1. The ring and the fence gap.
2. Musters.
3. The Ditch and the Duke (the first wild boss, proving the muster).
4. The Bramble Lot and Old Black.
5. The Hollow.
6. The Oak's Crown.
7. The Drum.

## 6. Questions for Mark

1. **Ring or separate map?** The ring (proposed) keeps one continuous yard you can walk out of. A separate map ("you leave through the gap and arrive somewhere new") is cheaper to build and runs lighter, but breaks the one-yard feel.
2. **Musters: is that the macro you meant?** Or should daughters fight on their own too (auto-defence, auto-raids), with you as the general?
3. **The bosses:** Duke the bullfrog, Old Black the crow, the Cordyceps Colony, the Hornet Queen, the Thing in the Drum. Keep, rename, swap?
4. **The Oak:** the Crown as a vertical, climbable wild zone (more work, very memorable), or a hornet nest at the Oak's foot (simpler)?
5. **The Drum and the house:** the Drum as the yard's true finale, opening the way to the house? Or the house first?
