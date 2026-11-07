# Phase 5: the yard and the air, thought through (build 75)

Playtest 3's fifth phase ([`PLAYTEST-3.md`](PLAYTEST-3.md)). Mark, after build 74:

- "When I said the sand pail, I meant the sand bucket. The bucket looks weird… it's not hollow."
- "You wouldn't find tiny little apple cores the same size as an ant. But you might find a larger apple core somewhere."
- "The faint blue glow at night would be an evolution… something minor."
- "Make sure that rain fades in."
- On the spoil heap: "Maybe builders can use it to fill holes. That's a good idea."

Each piece has:
- **Asked:** Mark's words.
- **Means:** what's actually wanted.
- **Today:** how the game does it now.
- **Others:** how other games, or nature, do it.
- **Design:** what this build does.

## 1. Rain fades in

- **Asked:** "A few drips, and then slowly it picks up." "Make sure that rain fades in."
- **Means:** rain should arrive the way it does outside: a spot or two, a patter, then the downpour, and ease off the same way. Today it's a switch.
- **Today:**
  - Thunder twenty seconds before.
  - Then the full downpour starts all at once: every streak, the splashes, the dark sky and the loud loop.
  - Thirty seconds later it stops just as suddenly.
- **Others:**
  - Red Dead Redemption 2, Zelda: Breath of the Wild, Minecraft: weather blends over several seconds. The sky greys first, then sparse drops, then the full rain, and the sound swells with it.
  - Real summer storms: big scattered drops first, then the downpour, then a drizzle that tails off.
- **Design:**
  - **The storm has a strength,** from 0 to 1, that everything follows: how many streaks fall, how many drops splash on the ground, how grey the sky gets, and how loud the rain is.
  - **The arc:**
    - after the thunder, ten seconds of scattered drops (about a tenth of full);
    - then it builds to the downpour over twelve seconds;
    - it holds;
    - then it eases off over the last ten seconds.
  - **It lasts 40 seconds** instead of 30, so the full downpour still gets time. This is a balance change, Mark's to tune.
  - **Raindrops knock ants about** in proportion to the strength, so the early drips are mostly harmless.

## 2. The sand bucket, and hidden antlion pits

- **Asked:** "The bucket looks weird… it's not hollow." "Hidden antlion holes in the sandpit… a little more hidden… like the hole at the end of the game, but lesser."
- **Means:**
  - The bucket should read as a toy bucket at a glance: an open plastic shell you can see into.
  - The sandpit should feel like a place where the ground can betray you, not a field of signposted traps.
- **Today:**
  - The bucket is a solid blue cylinder with a sand lid: from above it's a disc.
  - The seven antlion pits are drawn bold (build 14 made them obvious), so you just walk round them.
- **Others:**
  - Real antlion pits are small, neat cones in loose sand. You notice one when an ant slides into it.
  - In games, hidden traps are fair when they give a tell up close: Spelunky's arrow traps, the cracked floors in Zelda.
  - A tipped-over toy bucket is the classic sandbox picture: you see its mouth, its hollow inside and the sand spilling out.
- **Design:**
  - **The bucket lies on its side,** tipped over:
    - open, so you see its hollow, ribbed inside;
    - a rolled rim round its mouth and a handle;
    - a tongue of sand spilling out across the ground.
  - **The pits are hidden:**
    - from a distance each one is only a faint dimple in the sand;
    - when one of your ants comes within a few tiles, sand trickles down its sides and it shows fully, for good;
    - an ant caught in one also reveals it.
  - **Three more, smaller pits** among the seven, so a wary player still finds the sandpit dangerous.
  - The pits' danger is unchanged: the rim slides you in and the antlion bites at the bottom.

## 3. Food at a believable size

- **Asked:** "You wouldn't find tiny little apple cores the same size as an ant. But you might find a larger apple core somewhere. Let's make sure that we keep scale relatively realistic."
- **Means:** the yard's food should be the size things really are next to an ant. A bread crumb or a seed is ant-sized; an apple core is a landmark.
- **Today:**
  - The Compost Heap scatters apple cores, a few at a time, each about three ants across and worth 20 to 28 food.
  - The rest (crumbs, seeds, berries, bits of tomato, popcorn) are roughly right.
- **Others:**
  - Grounded and A Bug's Life get their sense of scale from huge everyday things.
  - Real ants: a dropped apple core is a feast that a colony works at for days, a trail going in and out of it.
- **Design:**
  - **One apple core at a time,** in the Compost Heap:
    - drawn at its real size, about fifteen ants long;
    - worth 150 to 200 food, so it's a place your foragers keep going back to;
    - it shrinks as it's eaten.
  - **The rest of the compost** spawns berries, crumbs and seeds in place of the extra cores.
  - **The other foods** stay at their sizes.

## 4. The spoil heap fills holes

- **Asked:** "I don't know what to do with the dirt pile on top… maybe builders can use it to fill holes. That's a good idea."
- **Means:** the dirt your builders carry out should come back in when you need dirt: digging and filling become two halves of one job.
- **Today:**
  - Builders carry every dug load up to the spoil heap by the entrance, which grows.
  - A fill order (Build, Fill tunnel) packs a tunnel cell back with dirt, and takes as long as digging it.
  - The heap never shrinks.
- **Others:**
  - Real ants pile excavated soil round the entrance as a mound, and use it to repair the nest and plug the door when it rains.
  - In games, a dug-out resource usually feeds a builder: Dwarf Fortress's stone blocks, Minecraft's dirt.
- **Design:**
  - **A fill takes a load from the heap** when there is one: a builder fetches dirt from the heap and packs the cell three times as fast.
  - **The heap shrinks** with each load taken back in.
  - **With no heap,** fills work as now (slow, chewed from the walls).
  - **The heap's card** says what it's for: "dug dirt; builders fill tunnels with it".

## 5. Glow at night: an evolution

- **Asked:** "The faint blue glow at night would be an evolution somewhere, something minor, but just a little evolution to give the ants a bioluminescence. It's not a huge thing."
- **Means:** a small, pretty node: your ants and their trails glow faintly blue at night. Some use (seeing your colony in the dark), not a power.
- **Today:** nothing glows. At night you see a pool of light round your own ant.
- **Others:**
  - Fireflies, glow-worms and foxfire fungus; in Avatar's forest everything glows.
  - Ori and Hollow Knight use soft glows to keep a dark scene readable.
- **Design:**
  - **Bioluminescence,** a small node in the Senses branch after Rain sense (3 genes).
  - **At night:**
    - your ants carry a faint blue light;
    - your trails glow a soft blue;
    - both fade in at dusk and out at dawn.
  - **That's all:** no stats.
