# UNDERFOOT — Project Handoff

**Read this first.** It is the full context for an ant-colony game Mark is building, assembled from two days of research, design, and prototyping (Oct 24–26, 2026). It covers where the idea came from, every decision and why, the exact state of the playable prototype, and where the project is going. Treat it as the project brain. The code in `prototype/` is the current build; the design is the current design. Where this doc and the code disagree, the doc says what was *intended* and the code says what *shipped*; flag the gap rather than silently picking one.

Working title: **Underfoot**. Alternative names were never settled. Avoid "SimAnt" in the product (Maxis/EA IP).

---

## 1. Where this came from

### 1.1 The brief
Mark remembered SimAnt (Maxis, 1991) fondly and asked: what was it, what did fans want fixed, has it been decompiled, and should we make a new one with Claude Code. Answer: yes, but as a new game inspired by its systems, not a port.

### 1.2 SimAnt, as researched (verified against the manual, period reviews, fan guides, a SNES decomp)
- **Premise:** you are the colony's intelligence. You hop between ant bodies; dying costs time, not the game. When you die you take over a newly hatched ant.
- **Moment to moment (the "Yellow Ant"):** move, dig, pick up one food item, Recruit 5/10 ants, Release, Exchange (swap bodies with any ant, including the queen or the spider on PC). Any ant carrying food home lays a scent trail automatically; the colony follows trails.
- **Colony management:** a **behavior triangle** (forage/dig/nurse) and a **caste triangle** (worker/soldier/breeder). Colony health = hunger; health affects fight odds. Breeders are expensive and do no work.
- **Combat:** auto-resolved one-on-one. The red colony has its own "Red Initiator" ant; when reds outnumber you they launch an all-out attack. You win a patch by killing the red queen.
- **Hazards:** spider (30–40 ants to kill; can be lured onto the red nest), antlion, rain (floods lower nest, washes trails), feet, lawnmower, pesticide inside the house, birds eat breeders in flight, roaches/flies inside.
- **Screens:** Edit window (surface top-down + nest side-view), Map (one patch or all 192), History graphs, HyperCard-style encyclopedia, "Silly" mode.
- **Structure:** Tutorial; Quick Game (one patch, kill the red queen); **Full Game** (start as a lone queen; 12×16 = 192 patches of yard and house; reach ~80 ants, switch to breeders, at 20 breeders they fly and found nests up to three sectors away; win by eliminating reds and taking 70% of the house); Experimental sandbox. SNES: 8 combat scenarios, three lives, 49 areas.
- **Reception:** praised as a war game that teaches; a novice learns it in an hour. Criticized for the full game running hours too long, luck swinging outcomes ("whoever reaches the food first wins"), a flat breeder race, one lucky queen kill ending fights, a 100-ant surface cap, Will Wright himself calling it too simple and a disappointment.
- **Decomp:** `gdavidss/simant-snes` claims a near-complete static lift of the SNES version (68 states, ~93% entity handlers, bit-perfect RNG, full scent system). Evidence quality is mixed: not runnable, one star, two commits, reads like AI-agent output, has at least one internal inconsistency, and the repo includes the ROM and manual (don't fork or redistribute). Useful as a mechanics reference only. Key mechanics it confirms: four scent maps; nest scent decays linearly, trail scent halves; 8-direction gradient following; rain washes trails; 8.5 Hz sim tick; visible sprites and abstract per-colony arrays run separately and sync only at fights. The PC version has no decomp.
- **Spiritual successors:** *Empires of the Undergrowth* (closest, RTS, 1.0 June 2024, no avatar ant, no yard-and-house conquest; fans miss the "spread across a property" fantasy); *SuperColony*; *Antopolis* (unreleased).

### 1.3 What 35 years taught us (innovations we adopted)
1. **AI storyteller / drama director** (RimWorld, from L4D's Director): picks events for story, eases off when losing, stacks events. Fixes SimAnt's luck snowball.
2. **Legible simulation** (Tynan Sylvester): the sim must be simple enough to watch and understand. Visible scent, tap-an-ant, event log.
3. **Roguelite colony structure** (Against the Storm): many short settlements that become self-reliant, not one endless city. Each map area is a 30–60 minute run; claimed areas run themselves. Fixes "hours too long" and fits phone sessions.
4. **Pikmin-style expeditions:** one leader plus a squad gives the player's ant a job.
5. **Response-threshold task allocation** (biology): each ant has thresholds per task; the colony reallocates itself. Deeper than three sliders, and it's how real ants work.
6. **Flow fields** for thousands of agents (SimAnt's scent gradient is a primitive flow field).
7. **WebGPU on phones** (iOS 26, Android Chrome) for scent diffusion and crowds, with a WebGL2 fallback.

---

## 2. Design history — every decision and why

### 2.1 Mark's vision pillars (his words, Oct 24)
Massive space with many areas; different threats to get around; if your ant dies you get another at birth; manage the colony's growth; tech trees; expeditions; starts simple, becomes "almost fantasy-ish" but stays biological (acid spitters, bullet ants); opposition escalates; maybe each ant is a run (roguelike).

### 2.2 First design pass (same day)
- Genre: an **avatar-led RTS with indirect control** (Pikmin + Dungeon Keeper possession + SimAnt), not a colony sim in the RimWorld sense.
- Three nested loops: Expedition (5–10 min) → Colony (30–60 min per area) → Property (15–25 h).
- "The one rule": you never give an ant an order; you influence through your body, scent, and three dials.
- 24 areas in 4 tiers (yard → edges → ground floor → deep house), each with a signature hazard, payoff, and unique mechanic.
- Evolution tree: three branches (Bodies, Brains, Nest), 24 nodes, every node a real ant ability; a permanent **lineage pick** at tier 3 (Acid / Trap-jaw / Bullet).
- Storyteller with a pacing script and an event deck.
- Decisions: cheap and reversible every few minutes; costly per area; permanent once per campaign (lineage, home nest, supercolony, Ironqueen).
- Parked ideas resolved: "cavalry" = Bodies branch and lineage; "ant as run" = the expedition *is* the run, plus a memorial wall of every body you've lived in, plus opt-in Ironqueen (colony permadeath). We said **no** to resetting the colony when your ant dies.

### 2.3 Gaps found by "explain it as a streamer" (Oct 25)
Combat undesigned; nest had no view; founding contradicted biology; chitin had no mechanical source; idle time; "70% scent coverage" undefined; no numbers; body-swap rules; time scale; rival AI; area boundaries; humans.

### 2.4 Revision 2 — Mark's big redirect (Oct 25), all locked
- **View:** 2D top-down for surface and nest, same art. 3D isometric is a later experiment.
- **Combat:** contact auto-resolves; inputs are squad size, caste, position, retreat. (Mark later asked for an ant-perspective **minigame**; see 2.7.)
- **One colony, many nests:** nuptial flights found satellite nests that stay part of the same colony (polydomy). No separate "tribute"; it's internal transfer.
- **Claiming an area:** you have a nest there and no rival queen is alive. Scent-coverage claims dropped.
- **Starting a colony:** pick a site, the queen digs down with limited energy, tap the dug space, Build nest. Then you choose each egg's caste at the queen.
- **Castes replace the job triangle:** Forager, Builder, Soldier, Nurse, Scout, then evolved castes. Thresholds still decide what each ant does within its caste.
- **The nest is a base-builder** (Fallout Shelter underground, SimAnt surface) with rooms: hatchery, food store, cistern, nursery, barracks, workshop, armory, labs, royal chamber, fungus garden, honeypot vault, midden, gate.
- **Strict, material-gated tech tree.** Materials: Food, Water, Protein, Grit (renamed **Stone**), Wood, Chitin, Sugar, plus one-time **Trophies** from boss kills that unlock castes (spider → Venom ants, beetle → Armored foragers, big caterpillar → Master builders, wasp → Acid sprayers, centipede → Trap-jaws, termite queen → Carpenters, roach → Night foragers).
- **Economy rule against grind:** every material has a different gathering verb and a different logistics problem (food spoils, water evaporates and is timed to dew, protein needs a squad kill and rots, stone takes two ants and halves speed, wood needs cutters, chitin needs the Armory, sugar attracts raids). Each tier adds one.
- **Upkeep is the whole game:** every ant eats 1 food/min (soldiers 2, majors/breeders 3); one forager on a good trail feeds itself and four others, so at least 20% must forage, and every soldier forces another forager.
- **Map edges:** walking off loads the next area (seamless if cheap).
- **Humans:** off-screen; only their effects.
- **Rival brain:** six rules (Feed, Grow, Defend, Scout, Raid, Steal) evaluated every 10 s through the same ant model; species = different numbers; no avatar, 5-minute memory, no reaction to the storyteller.
- **The Oak:** a tree you colonize from inside; branches tilt the view. Area 25, tier 2.
- **Act 3 parked:** after the house, the neighborhood and city; genre shifts to RTS; the property map is a tile so a block is a grid of properties.

### 2.5 Prototype feedback loop (Oct 25–26), decisions from play
- **Build 1** (surface only, nest as a menu): Mark asked "where's the underground nest view?" and "give me the whole game as is."
- **Build 2:** real cutaway with fixed room slots; dig-down queen start; water, protein, stone; caterpillar hunt; rival colony with brain; combat on contact.
- **Build 3:** Mark asked for explainers and passive caste purposes. Added one-time explainer cards, Help sheet, and passives: builders shore tunnels (cave-ins, rain), nurses speed hatching, soldiers guard the door.
- **Build 4:** Mark asked how to build the nest *the way he wants*, for deeper/denser soil gated by builder tech, queen upgrades and influence ("ant-fluence"), an intro sequence, and icons. Fixed slots → **free-form digging** (tap dirt, builders dig), **soil tiers** (soft/packed/clay), **queen levels** with an ant cap (20/40/60/80), **intro sequence**, emoji icons. Mark: "we definitely don't want this to be a waiting game."
- **Build 5:** Mark: blocks should break piece by piece; builders shouldn't all swarm one order; pinch zoom; Help sheet blanked itself (bug); soil layers deeper; "space is the economy, bigger things need more space"; "I can't figure out how to build something" (bug: inside the nest, taps walked instead of opening build). Fixed all; rooms got **sizes** (Barracks 6×3, Workshop 5×4, Cistern 4×4, Store 5×3, Hatchery/Nursery 4×3); nest deepened to 40 rows (14 topsoil, 14 packed, 12 clay); cave-ins per 40 cells.
- **Build 6:** Mark rejected "build mode" in favor of a **Build button + catalog** (see everything, pick, tap where it fits), asked for putting dirt back, and for rooms to have a "pre-built, quaint, cute" look. Added catalog with placement highlighting, **fill orders**, **remove room** (half refund), and procedural room decorations.

### 2.6 Art direction (Oct 26)
Ten styles were specified wacky→realistic (rubber-hose cartoon, folk-art woodcut, cut-paper diorama, claymation, storybook watercolor, HD pixel-painterly, 16-bit pixel, flat vector, naturalist field guide, macro-photo realism). Recommended shortlist to mock in one identical scene: **field guide**, **claymation pre-rendered to sprites**, **folk-art woodcut**, with **flat vector** as fallback. SVG emulations of the four were produced on a Design canvas; a full generation brief for Claude Code is in `UNDERFOOT_STYLE_BRIEF.md` (shared scene data, per-style palette/line/texture/type/creature/motion/UI specs, image-gen prompts, nearest-games comparisons, judging questions). Engine follows style: everything but macro realism runs in Phaser 3; claymation gets there by rendering 3D to sprite sheets. The plastic ant-farm framing device works on top of any style.

### 2.7 Open design questions (not yet decided)
- **Combat minigame.** Mark wants fights to feel ant-like, maybe rhythm/pattern-matching. Proposal on the table: keep mass fights auto-resolved; when *your* ant meets one enemy (door duel, spider, boss) play an **antennae duel** (enemy taps a 3–4 beat pattern, you echo it; match → bite, miss → take a bite; costs health, not instant death; body type changes the pattern). Not built.
- Humans leave when the house is claimed, or coexist unseen (coexist keeps endless mode alive).
- Identical bodies vs. veteran bodies keeping tags (lean identical: the colony is the hero).
- Real time only, or offline progress.
- Name.
- Organic rounded tunnels (art pass; grid stays underneath).
- Queen "influence" beyond a hard cap (ants past the cap stop obeying trails instead of eggs pausing).

---

## 3. The game as it stands (design of record)

### 3.1 Pitch
You are the mind of an ant colony. One body at a time; bodies are cheap; the colony is the hero. From a lone queen under a backyard rock you claim a yard one area at a time, then the house, by leading expeditions, steering the colony with scent, building the nest underground, and evolving the colony between areas. 15–25 hours. Phone first, one area per sitting.

### 3.2 Pillars
1. One body at a time (death costs body, squad, half-laid trail; never the colony).
2. You command the queen and the rooms, never an individual ant (your body, scent, the queen's egg choice, build orders).
3. Starts as ants, ends as monsters, stays biology.
4. One area per sitting; claimed areas run themselves.
5. Legible: you can always see why something happened.
6. Nothing is instant and nothing is a waiting game: digging, building, hatching, hauling take time, but there is always something to do.
7. Space is the economy: bigger things need bigger pockets; deeper soil needs tech.

### 3.3 Loops
- **Expedition (5–10 min):** hatch, pick a job (scout board, future), recruit, go, bring something back, the colony takes over the trail.
- **Colony (30–60 min):** food → eggs → castes → rooms → bigger prey → materials → bigger rooms. Dials: egg caste, build orders, trail list (future), caste mix emerges.
- **Property (15–25 h):** 24–25 areas, 4 tiers. Claim = nest present and rival queen dead. Nuptial flight founds satellite nests of the same colony.

### 3.4 Areas (24 + the Oak)
Tier 1 Yard: Under the Rock (start), Lawn (mower), Flowerbed (spider; aphid honeydew), Sandbox (antlion, cave-ins), Spigot (flooding; water channels), Woodpile (termites, centipede; chitin).
Tier 2 Edges: Sidewalk (feet, heat; cracks as highways), Trash cans (roaches, raccoon; lid day/night), Compost (heat, mold spreads along trails), Driveway (car), Porch (wasps, bug spray, cat bowl), Doormat (door-timing rhythm), **The Oak** (colonize from inside; carpenters/leafcutters).
Tier 3 Ground floor: Kitchen (sponge wipes trails, bait traps; counters as a second level), Pantry (flour drifts; traffic >100 triggers cleanup), Bathroom (drains, tub timer), Living room (vacuum on a learnable path), Laundry (dryer heat speeds brood), Pet corner (the cat hunts *you*).
Tier 4 Deep house: Inside the walls (electric lines; trails never fade), Basement (dark; second home site), Attic (heat, wasps, mouse), Garage (car, insecticide; chitin graveyard), Crawlspace (chokepoint; hold it and house colonies connect), **The Fire Ant Mound** (finale; exterminator timer).
Rivals per tier: pavement ants (defensive, raid at 3:1), odorous house ants (steal, never raid), Argentine ants (supercolony; can't be beheaded, burn out every satellite), fire ants (aggressive, acid, raid your claimed areas).

### 3.5 Castes (prototype values in §4)
Forager, Builder, Nurse (Nursery), Scout (Lookout; future), Soldier (Barracks, protein), Major (Barracks II, chitin), Venom ant (spider fang + Venom lab), Armored forager (beetle shell + Armory), Master builder (silk gland + Workshop), Acid sprayer (wasp sting + Venom lab), Trap-jaw (centipede plate + Armory II), Carpenter (termite queen + Workshop II), Leafcutter (the Oak + Fungus garden), Breeder (Royal chamber; nuptial flight).
Passives: builders maintain (cave-ins, rain, repairs); nurses hatch faster; soldiers guard the door; foragers lay trails.

### 3.6 Rooms (design list; prototype has the first six)
Queen's chamber (free), Hatchery I/II/III, Food store I/II, Cistern, Nursery, Lookout, Barracks I/II, Workshop I/II, Armory I/II, Venom lab, Royal chamber, Fungus garden, Honeypot vault, Midden, Gate. Rooms have sizes; small/medium/large tiers need Workshop and Master builders in the full design.

### 3.7 Queen
Digs with 30 energy; builds a chamber where she stops; lays what you pick; upgrades (food+protein, later stone) raise the ant cap 20→40→60→80 and unlock clay at level 1. At the cap, eggs pause (a softer version — ants past the cap ignore trails — is a candidate).

### 3.8 Storyteller (design)
Reads colony health, population trend, time since last event, whether you're out. Rules: never two lethal events within 3 min; only good/neutral events for 5 min when population <30% of cap; prefer nest-hitting events when you've been out >4 min; escalate after 6 min of health >80%; events overlap on purpose. Deck: Rain, Mower, Spider moves in, Wasp scout, Bird, Rival raid, Rival scout, Aphid bloom, Dropped food, Heat wave, Bait trap, Sponge wipe, Vacuum, Mold, Lost contact, Exterminator (finale). Prototype has rain, raids, dew, spider/caterpillar respawns only.

### 3.9 Campaign arc (design)
0–0:30 Under the Rock (no menus); 0:30–1:30 Lawn (first claim); 1:30–3 rest of yard (tree opens, first flight); 3–8 Edges (lineage pick at the end); 8–15 Ground floor; 15–20 Deep house; 20–22 the Mound and the exterminator timer; 22+ nuptial flight to a new property with one carried trait (NG+) and endless mode.

---

## 4. The prototype (build 6) — exactly what exists

Live at a claude.ai artifact (Mark has the link). Files in `prototype/`:
- `underfoot-poc.html` — the whole playable page (head + sim + app concatenated). ~100 KB. Open it on a phone.
- `sim.js` — the simulation. **No DOM.** `module.exports = SIM` when run under Node, so it can be unit-tested headlessly.
- `app.js` — Canvas 2D renderer, input, HUD, sheets, intro, explainers, save/load.
- `page-head.html` / `page-tail.html` — the HTML/CSS shell. Build the page with `cat page-head.html sim.js app.js page-tail.html > underfoot-poc.html`.
- `smoke-test.js` — a fake-DOM harness that evals the page script in Node and drives taps/buttons; used to catch regressions without a browser. Adapt it; don't trust it for rendering.
- `gen_style_mockups.py` — the SVG generator for the four style boards (field guide, claymation, woodcut, vector), useful as a procedural-style reference.

### 4.1 Tech stack and why
Plain Canvas 2D, one HTML file, no build step, no libraries. Chosen so the sim stays engine-independent and the page publishes anywhere; **Phaser 3 is the intended production renderer** (Mark's other projects are Phaser 3 and Babylon.js; he uses Claude Code as his primary engineering tool). WebGPU/WebGL2 for scent diffusion later. Mobile portrait is the target; every control is thumb-sized; pinch zoom and drag scroll exist.

### 4.2 Sim architecture (`sim.js`)
Constants: surface `W=48, H=64` tiles, `T=16` px per tile; nest cutaway `NW=24, NH=40`, `SHAFT=12` (entrance column), `soilTier(y)`: `<14` soft, `<28` packed, else clay; `SOIL` work: 4 / 8 / 14 builder-seconds per cell.

`CASTES` (cost, hatch s, speed, eat/min, fight, hp, radius):
- forager {food 2, water 1}, 20 s, 60, 1, 1, 2
- builder {food 3, water 1}, 25 s, 50, 1, 1, 2
- nurse {food 2, water 1}, 20 s, 50, 1, 1, 2 (needs nursery)
- soldier {food 4, water 1, protein 2}, 40 s, 55, 2, 3, 6 (needs barracks)
- venom {food 5, water 1, protein 3}, 45 s, 58, 2, 8, 6 (needs spider trophy)

`ROOMS` (cost, work builder-s, w×h): queen (free, 4×3), hatchery {food 10} 20 4×3 (+2 eggs at a time), store {food 10, grit 5} 20 5×3 (cap 20→150), cistern {food 15, grit 5} 20 4×4 (water cap 10→60), nursery {food 20, water 10} 25 4×3 (nurses; hatch ×0.7), barracks {food 30, protein 5} 30 6×3 (soldiers), workshop {food 25, grit 10} 25 5×4 (packed soil; builders ×2). `QUEEN_UP`: [{food 40, protein 10}, {food 80, protein 20, grit 20}, {food 150, protein 40, grit 40}]; `queenCap(lvl) = 20 + 20*lvl`. Internal key for stone is still `grit`.

State `s = create(seed)`:
- `world`: `blocked` (rocks + border), `home` (BFS distance field from our entrance at (24,44)), `rhome` (from the rival entrance at (24,12)), seeded RNG.
- `trail` Float32 (W×H), half-life 90 s (4 s in rain); `alarm` Float32, half-life 8 s.
- `ants[]`: `{id, caste, state, team (0 us, 1 rival), tx,ty (tile), x,y (px), dx,dy, carry, kind ('food'|'water'|'protein'|'grit'), hp, thr {f,d} (response thresholds 0.25–0.8), rest, explore, flee, follow, isPlayer, nx,ny (nest cell coords, center = +0.5), ntx,nty (nest target cell), goal, exitTo}`.
  States: `in` (inside, idle/walking), `build` (builder on a job), `nest` (the player inside), `explore`, `patrol` (soldiers near home), `return`, `follow` (recruited), `fight`, `raid` (rival), `player` (player on surface), `dead`.
- `items[]`: `{x,y,kind,type,amt}`; types crumb/seed/dew/puddle/pebble/spider/cat.
- `spider` `{x,y,hp 150}` (hunts within 3 tiles, bites every 2 s, speed 30/16, stays >6 tiles from our entrance), `cat` (caterpillar `{hp 30}`, harmless, wanders; attacked by aggressors within 1.2 tiles).
- `colony` and `rival` (same shape): `store, cap, water, waterCap, protein, grit, hatchCap, hatchMul, buildQueue[], eggQueue[], eggs[{caste,t,need}], trophies{spider}, starve, deaths{}, kills{}, delivered[60], eaten[60], queenAlive, raidCd, siege, stolen`.
- `nest`: `cells` Uint8 (0 dirt, 1 tunnel, 2 room floor), `ver` (bump on any change; invalidates path fields), `rooms[{x0,y0,w,h,key}]`, `digOrders[{x,y,ax,ay,progress,need}]` (ax,ay = adjacent dug cell the builder stands in), `fillOrders[{x,y,progress,need}]`, `fields{}` (BFS distance fields over dug cells, cached by target cell and `ver`).
- `queen {x,y,energy,placed,level,room}`, `phase 'dig'|'play'`, `player {ant, hunger, tx,ty (surface target px), holding, mark, pending, msg, inNest, ntx,nty, exiting, enterReq}`, `rain {t,on,next}`, `repairs[{x,y,ax,ay,progress}]`, `seen{}` (explainer flags and `intro` step), `events[]` (queue consumed by the app for explainers), `won`.

`tick(s, dt)` order (fixed 0.05 s steps): decay fields → both colonies (`tickColony`: 1-s logs, upkeep, starvation deaths after 20 s at zero, eggs with nurse rate `1+0.12*min(3,nurses)` and queen-cap pause, build jobs, dig/fill orders progress with Workshop ×2) → dew (every ~110 s for 60 s) → rain → maintenance (cave-ins when `buildersInside < ceil(dugCells/40)`, grace until t=240 s; repairs) → item respawn (every 9 s to 16 food near us, 9 near rival; pebbles; puddle) → spider, caterpillar → combat buckets → per-ant behavior → spider damage/kill (drops 40 protein; first kill = trophy) → caterpillar kill (40 protein) → siege check (6 of our fighters within 2 tiles of the rival entrance, no rival soldiers within 3, for 5 s → `won`) → rival entrance alarm → `rivalBrain` (every 10 s: grow egg if store ≥10 and pop < min(30, 10+t/45), soldier when soldiers < foragers/4; raid after t>480 and cooldown 120 s with up to 4 idle soldiers when they ≥ ourSoldiers+2) → prune dead.

Ant surface behavior: `chooseExplore` weighted 8-neighbor step (outward by home distance, forward bias, trail weight ×4, flee penalty near spider), explore cap 22 tiles from home (patrol 9, rival 6), food sensing within 3 tiles via `nearestItem` with `wanted()` (food if store < cap; water if water < 60%; protein always; grit for builders or when food is comfortable), explore timeout 45 s → return; `chooseReturn` descends the home field and lays trail while carrying; deposit at entrance → `enterNest`. Inside: `tickInside` assigns builder jobs (repairs → dig orders spread by `id % n` → fill orders → room job), idle targets by caste room (`roomTarget`), `nestStep` descends a BFS field to the target, leaves by threshold stimuli (`0.3 + hunger*0.9 (+0.3 if water low)` vs `thr.f`, not when alarm at the door > 0.5; soldiers on alarm or 15% patrol chance).

Player (`stepPlayer`): surface tap/hold movement at 85 px/s with wall sliding; hunger −1.3/s moving, −0.3 idle, +20/s near home or beside a food-carrying forager; carrying or Mark lays trail; auto-deposit near home; bites adjacent enemies at 2× power and heals 1/s when not fighting; `enterReq` near home → inside; inside walks nest cells; exiting at (SHAFT,0) → surface. Death → `pending`; next hatchling becomes the player (a free forager egg is laid if none queued).

Public API (what `app.js` calls): `create, tick, queenDig, buildNest, actionLabel, doAction, recruit(n), release, queueEgg, eggLock, upgradeQueen, queueRoom(key, cell), roomStateAt, roomAt, roomOf, findRoomRect(cx,cy,w,h), freePocket, toggleDigOrder, toggleFillOrder, removeRoom, digAllowed, playerDig, buildersInside, antCount, dugCount, stress(n), stats, serialize, deserialize, itemAt, canPay, costText`.

Save: `serialize()` → JSON v5 (everything incl. nest cells, orders, repairs, seen flags, trail rounded to 0.01). `deserialize` throws on version mismatch; the app falls back to a fresh game. Key `underfoot-poc-v5` in localStorage, written every 10 s.

### 4.3 App (`app.js`)
Two views, `surface` and `nest`, auto-switching when the player enters/exits. Cameras: surface follows the player, 26 tiles across at 1×; nest fits 24 cells across, follows the player or the queen, `panY` from drag. `zoomMul` from pinch (0.45–2.6) and a Zoom button cycling 1 / 1.6 / 0.6. Pointer handling: tap vs hold vs pinch vs drag with a 12 px threshold; nest taps fire on pointerup.
Nest tap logic (`nestTap`): dig phase → `queenDig`; near queen → egg sheet; collapsed cell adjacent to you → `playerDig`; dirt → toggle dig order (messages explain refusals: not adjacent, too many, soil needs Workshop / queen upgrade); when `placing` → place room / toggle fill / remove room; else if your ant is outside → open the Build catalog; else walk there (top cell = exit).
Sheets (`#sheet`): `egg` (castes with lock reasons, cap line, Upgrade queen), `catalog` (every room with w×h, cost, status: built / being built / no w×h pocket dug yet / short on … / ready; tools: Fill tunnel, Remove room, Clear orders), `info` (explainer cards, pause the sim), `help` (full reference). `renderSheet` must not touch `help`/`info` (that was the blanking bug).
Intro (`INTRO[]`): 8 steps stored as `s.seen.intro`; step text replaces the hint box; conditions advance automatically; the last step has a Done button.
Explainers (`EXPL`): dig, nest, surface (folded into the intro), dew, cat, spider, raid, rain, cavein, protein, grit, soil, cap, plus one-line notes at the top of the egg and build sheets. Fired from `s.events` or proximity checks in `checkExplainers()`.
HUD: `🌾 food/cap · 💧 water/cap · 🥩 protein · 🪨 stone` / `🐜 ants/queenCap (out) · rival n · +income −upkeep /min · fps · rain · cave-ins`. Hunger bar. Buttons: surface bar Pick up/Drop, Mark trail, Recruit (hold), Release, Enter nest (near the hole); nest bar Build nest (dig phase) / Queen / Build (Cancel while placing) / Exit nest; top-right Nest/Surface, Help, Zoom, +200 (stress test), Reset.
Rendering: ground and dirt are pre-painted offscreen canvases; trails/alarm as tinted tiles in view; rooms with procedural decorations (`decorate()`: store piles scale with food, cistern water level, barracks soldiers and spears, nursery cradles, workshop pebbles and sticks, hatchery straw, queen mound); dig orders chip away in quadrants; fill orders darken; repairs as orange X; placement highlight in green; soil band labels.

### 4.4 Tuning notes and known behavior
- Headless AI-only games (scripted player) survive with 50–80 ants at 15 min once food spawns at 9 s intervals; a real player must forage the first minutes or the colony starves (starting store 20, water 8). Forager income is ~3 food/min each at current spawn rates, below the design target of 5; the economy is spawn-bound, not forager-bound.
- The rival was tuned down three times; it's still the main killer of foragers who wander. Foragers flee soldiers within 2 tiles.
- Nurses stack with Nursery (0.7 × 1/1.36 ≈ 0.51 hatch time at 3 nurses).
- `stress(200)` spawns free foragers for frame-rate tests. Mark hasn't reported numbers yet.
- Builders choose a *reachable* repair/dig order (BFS field from the entrance) so a cut-off region doesn't deadlock them; the player can hand-dig a collapsed cell beside them.
- Spider cannot approach within 6 tiles of our entrance or 4 of the rival's.

### 4.5 Known bugs and rough edges
- No explicit "scout board"; expeditions are implicit.
- Intro's last card hides placement hints until Done is pressed.
- Rival ants are abstract inside their nest (no rival cutaway).
- Grit is still named `grit` in code; UI says Stone.
- Save versions are not migrated; each nest-model change resets players.
- No audio, no day/night, no Oak, no storyteller deck beyond rain/raids, no evolution tree UI beyond queen upgrades, no trophies beyond the spider fang, no scouts, no Majors/Armory/labs.

---

## 5. Where we're going

### 5.1 Immediate (Mark's next step)
Run `UNDERFOOT_STYLE_BRIEF.md` in Claude Code: build `styles.html` rendering the shared scene in the four shortlisted styles (then the rest), with a compare view, 0.6× zoom and slow-motion toggles. Mark picks a design language by eye.

### 5.2 Then, in rough order
1. **Phaser 3 port** of the renderer, keeping `sim.js` intact. Sprite sheets per caste (8 directions × walk/carry), tile atlases, scent as a shader or particle layer. Target 1,000 ants at 60 fps on a mid phone; measure with `stress`.
2. **Antennae duel** prototype as a popup over the surface view; decide after playing it whether it stays.
3. **Scout board + expedition types** (Forage, Scout, Raid, Hunt, Rescue, Relocate, Found) so the player's ant always has a job.
4. **Storyteller** with the event deck and pacing rules; day/night (dew at dawn, trash lid at night, birds rest).
5. **Second area + map + nuptial flight** (satellite nests of one colony), area edge transitions.
6. **Trophies and evolved castes** beyond Venom; Armory, labs, Majors; Brains and Nest branches as Workshop research.
7. **The Oak** (tree interior, branch tilt), then edges tier.
8. Organic tunnel rendering, audio, save migration.

### 5.3 Non-goals for now
3D isometric (experiment later), humans on screen, Act 3 (neighborhood/city), multiplayer.

---

## 6. Working with Mark (project conventions he stated)
- Concise, output-first. He redirects fast when over-explained or under-delivered.
- "Proof of concept" means: test the core systems that make the game possible (what it runs on, what assets are used and how they're held, how it runs, controls). He tests on his phone, portrait; mobile must always be considered.
- No waiting game. Time passing is fine; nothing to do is not.
- He wants systems to make sense biologically or physically (builders shoring tunnels, rain flooding, protein for soldiers) and to be explained in-game.
- He likes tips, cues, and explainers; he noticed immediately when the UI didn't teach itself.
- When he says "give me the whole game as is," he means the full current design implemented as far as it can be, not a stripped demo.
- Decisions get logged. Keep a "what changed and why" trail; he reads it.

---

## 7. Reference index
- `UNDERFOOT_STYLE_BRIEF.md` — art-direction generation brief (deep specs, prompts, comparisons).
- `prototype/` — build 6 source and the assembled page, smoke harness, style-mockup generator.
- Design doc (Claude Doc, "Ant Colony Game — Design Doc (working title: Underfoot)") — the longer narrative version of §2–3 including the full area catalog, tree tables, storyteller deck, decisions list, campaign arc, and the ten-style table. This handoff supersedes it where they differ.
- SimAnt sources used: Wikipedia; the original manual (via the OpenAnt wiki); COMPUTE! reviews (Jul/Sep 1992); GameFAQs strategy guide (Aristotle47); TV Tropes; lparchive playthrough; PC Gamer on Empires of the Undergrowth; `gdavidss/simant-snes` (reference only).
