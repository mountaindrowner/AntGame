# The far yard (build 82)

- **Asked:** "Yes go for it", after the simulated games stalled at 3 of 13 zones (the Patio, the Flowerbed, the Garden) in 8 hours.
- **Means:** find what stops a colony from taking the rest of the yard. Fix what's the game's fault. Mark what's only the test bot's.

## What stops it

### 1. The test bot, not the game: guardians in a fixed order

- **Its list:** the hornworm, then the beetle, then the antlion…
- **The beetle is 330 tiles away.** The bot's ant starved on every scouting trip, so the list never moved on.
- **The antlion's Playground is 113 tiles from the nest,** as close as the Patio, and the bot never went there.
- **Fixed in `campaign.mjs`:** nearest guardian first. On a long trip it raises an outpost whenever the last stop is 70 tiles behind, and eats at outposts on the way there and back (build 80 lets your ant eat at one).

| Zone | Guardian | Tiles from the nest |
|---|---|---|
| Flowerbed | wolf spider | 80 |
| Patio | pavement ants' queen | 113 |
| Playground | antlion queen | 113 |
| Garden | hornworm | 160 |
| Trash | odorous ants' queen | 330 |
| Rock Garden | ground beetle | 330 |
| Great Lawn | Old Robin | 330 |
| Oak | carpenter ants' queen | 358 |
| Side Yard | black widow | 400 |
| Hedge Row | praying mantis | 408 |
| Rot | giant centipede | 466 |
| Wet Edge | Old Warty | 512 |
| Fire Ant Country | fire ants' queen | 566 |

Your ant can walk about 300 tiles on a full stomach. So everything past the Garden needs a chain of outposts, which is what outposts are for. There are up to 5–6 of them, one every 14 tiles or more.

### 2. The game: the crew didn't know how to fight a guardian

- **The test:** a fight harness (`scratchpad/far/arena.mjs`) puts a crew next to each guardian and lets it fight, with you standing off as the bot does.
- **Every guardian telegraphs its big attack** (a red ring, a lane) for you to step out of. **Your crew never did.** It stood in every ring, so a fight was a pure race between the crew's bites and the guardian's area attacks.
- **Two guardians are puzzles the crew couldn't play:**
  - **The antlion** hides under her pit until eight ants stand at its edge. A crew sent at her walked straight into the sand and was dragged under: all of it, in about 2 seconds.
  - **The widow** sits in her web until its four anchors are bitten through. A crew sent at her bit the web.

Before, with crews of soldiers (wins out of 3 tries, and how much health the guardian kept):

| Guardian | 10 | 20 | 30 |
|---|---|---|---|
| Hornworm | 0 (kept 78%) | 0 (57%) | 0 (35%) |
| Antlion | 0 (100%) | 0 (100%) | 0 (100%) |
| Widow | 0 (97%) | 0 (88%) | 0 (83%) |
| Centipede | 0 | 0 | 3 |
| Mantis | 0 | 0 | 3 |
| Beetle, robin, toad | won from 10–20, in seconds | | |

Fights ended in seconds either way: the crew wiped out in about 3 seconds, or the guardian dead in about 5.

## Others

- **Pikmin:** your followers walk into hazards unless you whistle them out. Losing them is the point, and you have a button for it.
- **Monster Hunter and MMO companions:** AI allies step out of telegraphed attacks, imperfectly. The tells exist so everyone can read them.
- **Overlord's minions** are told to "sweep" round a hazard; they don't path through it.
- **Here** the player leads 15–40 ants and can't move each one. So the crew has to read the tells itself, and veterans should read them better.

## Design (built)

1. **Your fighters read the tells.**
   - When a guardian shows an attack, each of your fighters inside it may jump clear before it lands.
   - Fresh hatchlings manage half the time, each rank adds a tenth, and Legends manage 9 in 10.
   - Seasoned soldiers (the Drill hall, Colony memory) are worth more against guardians.
2. **Set on the antlion, the crew rings her pit.** Each ant stands on the rim at its own angle. Eight there draw her up, they bite from the rim, and nobody walks into the sand.
3. **Set on the widow in her web, the crew goes for the nearest anchor still standing,** then for her once she drops.
4. **A guardian's hide:** your fighters' bites do half against a guardian (your own bites are as before).
   - With the crew now living through the rings, 20 soldiers killed most guardians in 4–12 seconds, which isn't a fight.
   - At half, the guardians spread out by the crew they need. **Mark's call:** this is `BOSS_TUNE.hide` in `bosses.js`.

After, at a hide of 0.5 (wins out of 4, average losses):

| Guardian | 15 soldiers | 25 | 35 |
|---|---|---|---|
| Beetle | 4, lost 0 | 4, 0 | 4, 0 |
| Antlion | 4, 0 | 4, 0 | 4, 0 |
| Robin | 4, 4 | 4, 2 | 4, 3 |
| Mantis | 4, 1 | 4, 2 | 4, 2 |
| Widow | 2, 9 | 3, 8 | 4, 7 |
| Hornworm | 0 | 2, 20 | 4, 20 |
| Centipede | 0 | 0 | 4, 24 |
| Toad | 0 | 0 | 4, 0 (or bring a medic: its skin poisons biters) |

## Not done yet

- **Crews step greedily toward a target and can't path round a wall.** At the widow, a crew on the far side of the shed wall waits there. A crew ant that's made no headway in a couple of seconds could take a real route.
- **The rival colonies of the far yard** (the odorous ants at the Trash, the carpenter ants at the Oak, the fire ants) wake one every 30 minutes after the Patio falls, and they raid. That's the next thing the simulation should look at.

## The campaigns after (4 colonies, 6 hours)

| | Before (build 80–81) | Build 82 |
|---|---|---|
| Most zones taken | 3 (Flowerbed, Patio, Garden) | **5** (adds the Playground and the Rock Garden) |
| Antlion killed | never | in 4 of 4 |
| Beetle killed | never | in 2 of 4, at 54 min and 3 h |
| Hornworm killed | 4 of 8, after 4–14 failed hunts | 3 of 4, mostly on the first or second try |

- **The Great Lawn's robin was never found.** That's the bot: its scouting trips kept breaking off for its own sieges on the Patio, 59 times in one run.
- **Queens still fall to raids at about 3.5 hours (3 of 4).** That's the earlier problem (fighters starved of meat, war parties too big for two guards), not the far yard. It's in `SIMULATION.md`, with the three fixes that are Mark's call.
