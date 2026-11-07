# The game by the numbers (Nov 7, build 79)

Mark: "Simulate the game based on scheduling and everything. Purely by the numbers… to the furthest degree that you can. See what happens."

## How

- **No graphics:** the simulation alone, the same code the game runs, at its own 20 ticks a second.
- **The player:** a bot plays your part through the same actions the buttons give (`scripts/campaign.mjs`). It:
  - forages, lays eggs and builds rooms (placing them as plans);
  - evolves, upgrades castes, raises outposts and hauls treats with a crew;
  - hunts the caterpillar and raids the rivals;
  - scouts toward each zone's guardian and hunts the spider and the bosses with its biggest crew.
- **Two batches:**
  - **standard:** 8 colonies (two strategies × four seeds), 8 game-hours each;
  - **"competent":** 4 more, with the habits a good player has. They ring Defend when the nest is attacked, build more Food stores and the Egg larder, spend genes whenever they can pay, and upgrade the queen whenever they can.
- **The numbers:** recorded every minute: ants, castes, food and the other materials, rooms, evolutions, zones, kills and deaths by cause.

A bot isn't a player: it never uses abilities or crew orders, rarely finds the right moment, and its own ant dies far more than yours would. So read the totals as **what the numbers allow**, not as how a game plays. The findings below are the ones that come from the game's own rules, not the bot's habits.

## What happened

| | Standard (8 colonies) | Competent (4 colonies) |
|---|---|---|
| Queen killed (colony lost) | **6 of 8**, between 2 and 5 hours | 0 |
| Collapsed to a single ant | 1 (at about 3.5 h, for the rest of the run) | **4 of 4**, in the first 1–2 hours, for good |
| Zones taken in 8 hours | 2–3 of 13 (Patio, Flowerbed, Garden) | 0–1 |
| Colony size | stuck at the queen's level-3 cap, 60 ants, from about 30–60 min | 1–35 |
| Evolutions bought | 3–18 (100–250 genes unspent) | 11–17 |
| Deaths over 8 h (all causes, all runs) | hunger 888, no meat 831, spider 690, rival 508, hornworm 411, mower 341 | starved 315, rival 140 |

**The timeline of a typical standard colony:**

| When | What |
|---|---|
| 0:23 | First food home |
| 3:40 | 10 ants |
| ~4:00 | Hatchery |
| 5–9 min | 20 ants |
| 6–14 min | Queen level 2 |
| 20–40 min | 40 ants |
| 30–40 min | 60 ants: the queen's level-3 cap, and where colonies stay |
| 30–100 min | The spider killed (the Flowerbed) and the Pavement queen killed (the Patio) |
| 55 min–3.5 h | The hornworm killed in 4 of 8 (the Garden), after 4–14 failed hunts |
| Never | The beetle, the antlion, the robin, the toad, the mantis, the widow, the centipede |

## Why: six findings from the rules

1. **The economy runs at zero margin.**
   - **The ratio:** at full size (50–60 ants) a colony brings in a median of **0.92 food for every 1 it eats** (food eaten by the ants plus room upkeep). It's below break-even 57% of the time and survives by eating its meat.
   - **Not new:** build 73 was the same (0.90).
   - **The result:** there's never spare food to save. The food store sits at 0–100 of its 150 cap, so the queen's level 4 (250 food) and Store II (100 food, and it asks you to fill the store to 150 first) stay out of reach.
2. **Soldiers starve of meat, and with them goes the nest's defence.**
   - **The cost:** fighters eat half a meat a minute each, and meat comes only from hunting.
   - **The pattern:** in every colony the fighters rise to 10–20 and then starve back to 0–5. "No meat" is the second-biggest killer: 831 ants.
3. **An unguarded door is a death sentence.**
   - **The rule:** each raider at your door does 0.8 health a second to the queen, for up to 10 seconds. Only fighters at the door count as guards; workers inside never defend her.
   - **What it means:** a raid of a dozen ants on a nest whose soldiers have starved kills a full-health queen in about ten seconds. One went from 60 to dead in six.
   - **The toll:** that's how 6 of 8 standard colonies died, all to the second and third rival colonies once they woke.
   - **With Defend:** the competent bot lost no queens.
4. **A starving colony never recovers.**
   - **The spiral:** when food hits zero, an ant starves every 10 seconds. Fewer foragers bring in less, and 60 ants become 0 in about 15 minutes.
   - **The trap:** rooms keep eating (half a food a minute for each kind, one for each extra copy) with nobody to run them. Six rooms cost about 3 food a minute, which a lone player ant can't out-forage, so eggs (2 food each) never become affordable again.
   - **Seen:** one standard and all four competent colonies sat at a single ant for 4–7 hours, the queen alive and the game effectively over. The competent bot got there by spending: one evolution or queen upgrade too many tipped a zero-margin economy over.
5. **Your ant can't reach most of the yard.**
   - **The limit:** hunger drains 1.3 a second while you walk, so a full stomach lasts about 77 seconds, roughly 300 tiles. Your ant eats only at the nest or beside a forager carrying food.
   - **The distances:** the rock garden is 330 tiles away, and the toad's, mantis's, widow's and centipede's grounds are 400–510.
   - **The result:** a boss only appears once your ant steps into its region, so the bot's scouting trips starved on the way and the beetle never appeared in any run.
6. **The bosses outclass a 60-ant colony.**
   - **The fights:** the hornworm destroyed crews of about 20 (14–19 of them soldiers) in about 45 seconds, over and over. It fell only after 4–14 tries.
   - **The ceiling:** with the colony capped at 60, short of meat and a soldier costing 4 food, there's no bigger army to bring.

## What would change it (Mark's calls: these are balance)

- **Give the economy a margin:**
  - foragers bring 20–30% more, or ants eat less;
  - or Store II without "fill the store to 150" (a full store is exactly what this economy can't reach).
- **Make room upkeep scale with the colony,** or let rooms go quiet when food runs out, so a starving colony can climb back.
- **Let workers at home count as weak guards,** halving what raiders do to the queen, so a nest without soldiers is wounded by a raid, not killed.
- **Meat at home earlier:** the Egg larder (Trophic eggs) is the only steady source, and it comes late.
- **Let your ant eat at a finished outpost,** so outposts become waystations and the far guardians are reachable on foot.
- **Re-run this after any change:**
  - `OUT=run.json node scripts/campaign.mjs sensible <seed> 480` for one colony;
  - `SMART=1` for the competent player;
  - `node scripts/campaign-report.mjs <dir>` prints the milestone table above.

## After build 80: the same runs on the new rules

Eleven of the twelve colonies have finished; the last standard one (sensible, seed 11) was still running when this was written.

| | Build 79 | Build 80 |
|---|---|---|
| Income for each food eaten, at 50+ ants (median) | 0.92 | **1.01** |
| Time below break-even | 58% | 49% |
| Standard: queen killed | 6 of 8, at 2–5 h | **7 of 7**, at 2.5–4 h |
| Standard: three zones (Patio, Flowerbed, Garden) by | 30 min–3.5 h | 50 min–3 h, in 6 of 7 |
| "No meat" deaths | 831 | 630 |
| Competent: collapsed to a single ant | 4 of 4 | 4 of 4 |

**What worked:**
- **The economy now breaks even.** Income is at or above break-even half the time, where before it was below most of the time.
- **The zones fall sooner.**
- **Fewer fighters starve of meat.**

**What didn't:**
- **Raids still kill the queen.**
  - The halving works: with workers home, a raider takes 0.4 health a second, up to 4 a raid.
  - But once three rivals are awake the raids come every few minutes. Each costs her 40–60 health, and she heals 6 a minute.
  - So the second raid, before she's whole, kills her.
- **The warning was silent for the second raid.** "Queen under attack" only re-armed once she was back above 99 health, so the raid that killed her never warned. **Fixed:** it now re-arms after half a minute without a hit.
- **A colony at one ant still can't climb back.**
  - Room upkeep now drops to almost nothing (checked: 0.05 food a minute with no workers).
  - But your lone ant eats 1 food a minute and brings 1.25 a trip. With food more than a short walk away it nets nothing, and an egg needs 2 food.
  - Meat piles up (hundreds), but eggs can't use it.
- **The bot collapsing was partly the bot.**
  - Its lone ant fetched meat before food. That's fixed in `campaign.mjs`.
  - Re-run for 4 hours, one colony of three climbed back from 1 ant to 33. The other two, with food farther off, didn't.

**What would fix the rest (Mark's call):**
- **The queen's founding reserves.** A real founding queen raises her first workers from her own body, without food. While the colony has no workers, she could lay one forager a minute for free, up to four.
- **Eggs paid with meat when food is short.** Real larvae are fed protein.
- **A breather after a raid on the queen.** No raid on her for 5 minutes after one, or have her heal three times faster while no raider is in the nest.
