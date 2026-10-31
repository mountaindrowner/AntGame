# Playtest 2: Mark's brother plays (Oct 31)

Mark's voice-over while his brother played for about 45 minutes, **on PC**, on a build before 14. Pulled out of the transcript and ordered from smallest to biggest. Status tags:

- **fixed in 14:** changed in build 14, which he hadn't played.
- **exists, unclear:** the game has it, but he couldn't find it or tell what it does.
- **new:** not in the game yet.

Mark's answers after reading the list:

- He wasn't on build 14.
- Rooms: allow more than one, but with a cap and a reason not to overbuild.
- Priorities: settings per ant type.
- The game is for PC first for now; a phone pass comes later.

## What landed well

- The RTS and organisational logic.
- The progression so far ("working well").
- Generated names (Thorn, "Burr, Spiderbane"), ranks, and choosing your rebirth.
- Raising a cairn and seeing the territory grow.
- The spider as a nuisance ("kind of a jerk", which is fun).
- The improved Evolution menu.
- Killing the spider with 30 ants; taking the Patio.

## 1. Polish and readability

1. The Recruit and Release badge numbers are hard to see (and the HUD is phone-sized on a monitor). *new*
2. Notifications colour-coded: danger, good news, new information. *new*
3. A notice when something finishes building, outposts especially. *new*
4. Puddles "just look like little circles". *fixed in 14: pooled, rings, ripples*
5. The Patio needs texture; it reads as one flat slab. *new*
6. The camera clips through the big rock to the north when zoomed. *new*
7. Rain only falls round the middle of the screen; zoom out and it's dry. *new*
8. Rain comes too often. *fixed in 14: every 8–12 minutes, thunder first*
9. Opening the evolution tree should pause the game. *fixed in 14: the Evolution window pauses*
10. A sound they couldn't place (they decided it was the compost heap's ambience). *check: make it quieter or easier to recognise*

## 2. Things he couldn't work out

11. What Nurses do. *exists, unclear*
12. What a treat is. *exists, unclear*
13. What outposts do; the outpost text; that they had unlocked. *exists, unclear*
14. "Veterans learn / Elites add". *exists, unclear*
15. Finding a named ant: he tried hovering. Hovering or tapping an ant should show its name, rank and job (Civilization-style). *new*
16. Named and Legend ants should look unique, not just ringed. *new*
17. The crew cap, how to raise it, and why recruits drop off when you walk too far. *exists, unclear (cap 20/30/45; recruits leave at 16 tiles)*
18. "There's no main menu." It's in Help → Menu. On PC, Escape should open it, with sound and options. *exists, unclear + new (Escape)*
19. Does it save? It autosaves; nothing says so. *exists, unclear*
20. Why he can't build a second room of a kind. *by design so far; changing (see 34)*

## 3. Feel and feedback

21. Spider animations: stalk, lunge, bite, die. *new*
22. Combat feedback: see that you're attacking, and being hit. *partly fixed in 14 (red edge when you're hit); attacking still new*
23. A battle report after a raid or fight: how many ants you lost. *new*
24. A nudge when the queen sits idle: "why aren't you mass-producing ants?" *new*

## 4. A smarter world and ants

25. The spider should eat until it's full, then rest, not kill forever. *new*
26. Rain should splash ants and push them about. *new*
27. Idle ants shouldn't just stand there: not genius, just not dumb. *new*
28. More living bugs with interesting effects. *new*
29. Events, such as Cordyceps-infected ants as an outbreak enemy. *new*

## 5. Content depth

30. Fill in the whole tech tree: most nodes still say "later build". *new*
31. Region-specific abilities: colonise the compost heap or the garden for something only that ground gives. *new (held-region prizes are a start)*
32. The yard feels small, yet he uncovered very little in 45 minutes. This reads as exploration pull and pacing, not map size. *new*
33. An asset pass: review every model; make them proper standalone assets instead of shapes drawn in code. *new*
34. Rooms: allow more than one of each, capped, with a reason not to overbuild. *new (proposal below)*
35. Sketch the house, to feel Act 2 coming. *new*

## 6. Systems

36. A RimWorld-style priority system, set **per ant type**: you say what needs doing (dig here, gather food, cut wood); each type has a main duty and helps elsewhere when free. Soldiers guard first, but hunt or forage if needed. Less direct control, and simple menus: "not a thousand menus for a thousand things". *new*
37. PC controls:
    - Escape for the menu
    - hover cards on ants and things
    - the mouse wheel to zoom
    - keyboard shortcuts for the main buttons
    - a HUD sized for a monitor

    *new*

## 7. The grand arc

38. Yard → house → something radioactive in the house makes the ants grow → the map zooms out to the neighbourhood → the city → the country → the world → space: other planets, other bugs, aliens. Each step repeats the formula at a bigger scale. *vision*

## Proposals arising

- **The ant card:** hover or tap any ant for its name, rank, job, experience and promotions (answers 14–16 and 15's hover).
- **The crew ring:** a faint circle round you showing how far recruits follow, and "12/20" on Recruit.
- **More rooms, with a cap and a reason (answers 34):**
  - **cap:** each room type allows one per queen level (two at II, three at III…)
  - **cost:** each extra copy costs more than the last
  - **upkeep:** every room costs a little food a minute to run
  - **space:** each needs its own dug pocket, and builders to keep it from caving in

  So a second Hatchery is worth it only when food can feed it.
- **Priorities per ant type (answers 36):** a Jobs page where each ant type has a short ranked list of duties (Forage, Dig, Haul, Build, Guard, Hunt, Nurse, Explore). The colony fills its needs from the top of each list; ants fall back down the list when there's nothing to do. That also fixes 27, idle ants.
- **An event director:** one system for outbreaks (Cordyceps), floods, antlion surges and the like, scaled to the colony's strength (it's already in `PROGRESSION.md`).

## Build phases (proposed Oct 31)

Mark: "PC vs phone isn't a priority right now, keep building the way you were." So item 37 (PC controls) waits, apart from what clarity needs anyway (an obvious menu button, Escape). Numbers refer to the list above.

| Build | Theme | Items |
|---|---|---|
| **15** | **Clarity and feedback**: what everything is, what just happened | 1, 2, 3, 10–19, 23, 24: colour-coded notices, "built" notices, an ant card (tap an ant: name, rank, job, xp), looks for named ants, the crew ring and cap, plain-English Veterans and outposts text, one-line "what it's for" on every ant, room and treat, a visible menu button and save indicator, a battle report, the idle-queen nudge, the mystery sound |
| **16** | **Living creatures**: fights you can see | 21, 22, 25, 26, 28: spider animations (stalk, lunge, bite, die), bite sparks and hit flashes, the spider eats then rests, rain that splashes ants, and the first new living bugs |
| **17** | **Running the colony** | 27, 34, 36: a Jobs page with duties ranked per ant type, idle ants that find work, more than one of each room (capped, with upkeep) |
| **18** | **Sugar and chitin** (PROGRESSION step 2) | 30, 31: the two new materials, the tech nodes, upgrade levels and queen levels they unlock, region-specific abilities |
| **19** | **Bosses and events** | 29, 30: hornworm, ground beetle, antlion queen with their trophies and ant types, and an event director starting with a Cordyceps outbreak |
| **20** | **The world's look and pull** | 5, 6, 7, 32, 33: an asset pass on the models, the Patio's texture, the rock clipping, rain over the whole view, things worth exploring for |
| **21** | **The house, sketched** | 35: the house's edges (porch, doormat, doorway) on the map and as a first look inside |
| later | **The grand arc** | 38: a design document first (scale, camera, what carries over), then build |
