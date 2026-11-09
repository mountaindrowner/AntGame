# Underfoot: decisions log

What changed and why, newest first. Read [`HANDOFF.md`](HANDOFF.md) for the full design of record. This log picks up where its §2.6 (art direction, Oct 26) ends.

## Nov 9: the phone layer, first test (phone test 1)

Mark: "How do we make sure we don't screw up our main game?… Let's begin." The plan is in [`PHONE.md`](PHONE.md).
- **One game, one switch:**
  - At startup the game decides once whether it's on a phone: a touch screen with no mouse, short side under 500 pt (the physical screen, so a narrow desktop window never flips it).
  - Everything for phones hangs off the `phone` class on the page and `app.phone`.
  - Options → Layout (Auto / Phone / Desktop) forces either way.
- **The desktop guard** (`scripts/desktop-guard.mjs`) checks the desktop game against build 83:
  - 14 desktop screens (title, yard, crew, Jobs, Evolution, map, nest) at 1280×800 and 1600×900, from a fixed save;
  - every random number seeded, the frame loop and page timers driven by hand, page animations off;
  - compared byte for byte, with only a lone-ant speck (under 500 pixels in one small box) reported rather than failing.
  - It runs from a separate checkout of build 83 for the baseline. Result: the phone code leaves the desktop screens identical.
- **Phones only:**
  - **Renderer:** the default GPU mode (not "high-performance"), no MSAA, and the quality steps' render targets kept rather than freed and rebuilt.
  - **iOS input:** the long-press magnifier, double-tap zoom and page pinch blocked on the game.
  - **Sound:** set to "playback", so the silent switch doesn't mute it, and resumed after a call or another app.
  - **Side column:** 5 buttons of 44 pt, clear of the Dynamic Island (Zoom is a pinch, Help is on the menu).
  - **Top bar and notices:** the bar and dock clear of the Island; one notice at a time; the day clock hidden (the time is on the bar); the "⋯" a 44 pt target.
  - **Sheets:** the dock steps away while one is open, and it takes the bottom 78% of the screen.
  - **Nest:** the ground starts just below the HUD, so the nest fills the screen.
  - **Title:** in landscape, the logo sits beside the menu.
  - **Home Screen:** a manifest, an icon and the iPhone tags; the title says how to add the game in Safari, and on the Home Screen's first launch, how to bring a Safari save over.
  - **Options:** Battery saver (30 frames a second).
- **On desktop:** only the Options page changed, with the new Layout row.
- **The end-to-end test** keeps the original layout at its small size; the phone layout gets its own checks next.
- **The phone test** is published at its own link and zip, so the main link stays on build 83.

## Nov 8: builders that answer, and a solid rock (build 83)

Mark: "Builders take time to build sometimes, they don't respond to commands too quickly, why? Also the rock above nest is still passable. Remove it or make it solid."
- **Why builders were slow** (timed in a test colony):
  - A tunnel is dug a cell at a time, and only one builder could work a cell. A 10-cell tunnel took 65 s with 3 builders, and still 65 s with 5: the rest spent half their time walking about or waiting.
  - A builder on a room kept it until the room was done. With three on a room, a dig or cave-in you ordered waited for the whole room.
  - Builders gathering outside come home when there's digging to do, but a loaded one finishes its trip first: a few seconds.
- **Now:**
  - Two builders work each face, a dig or a cave-in. The same tunnel takes 46 s with 3 builders and 35 s with 5.
  - Every 2 s, a builder on a room it shares checks for an order of yours nobody has taken, and goes to it.
- **The rock** was solid as a square block, but it's drawn as three rounded slabs. Ants walked over its edges and round invisible square corners. Now the yard makes exactly the drawn shapes solid; the drawing and the solid area come from one definition.

## Nov 8: the far yard (build 82)

Mark: "Yes go for it" (why the simulated games stopped at 3 of 13 zones). The full write-up is in [`FAR-YARD.md`](FAR-YARD.md).
- **The test bot** went after guardians in a fixed order and stalled at the far beetle; the antlion is as close as the Patio. It now goes nearest first, raises outposts on long trips and eats at them.
- **The game:** guardians telegraph their big attacks for you to dodge, and the crew, which does the fighting, never dodged. A fight was decided in seconds. The crew also walked into the antlion's sand and bit the widow's web.
- **Built:**
  - Your fighters jump clear of a shown attack: half of fresh ants, a tenth more each rank, 9 in 10 Legends.
  - Set on the antlion, the crew spreads round her rim and walks round it.
  - Set on the widow in her web, it cuts the anchors first.
  - A guardian's hide halves your fighters' bites (Mark's call: `BOSS_TUNE.hide`). Without it, the crew that no longer died killed most guardians in seconds.
- **Result:** the simulated colonies took 5 zones in 6 hours (the most before was 3). The antlion fell in every run, the beetle for the first time ever (2 of 4), and the hornworm mostly on the first or second hunt.
- **Not yet:** crews can't path round walls; the robin (the bot never reached the lawn); the far rival colonies.

## Nov 7: the guards walk a round (build 81.1)

Mark: "They don't just have to stand like that… they can be walking around, patrolling slowly. Give them a little bit of a path to patrol."
- **The round:** a loop of walkable tiles two to three out from the entrance, in order round the circle. It always stays within the four tiles where a guard counts as guarding the queen.
- **The pace:** the guards keep one beat, a tile every 1.6 seconds, each starting its own share of the loop. They walk a little faster than the beat, so each steps, then stands a moment facing out. That's about 40% walking, 60% looking out.
- **Spacing:** a shared beat means they stay evenly spread however many you post. The first version, with random pauses, let two bunch onto one tile 17% of the time; now it's 0%.
- **Fighting:** they still fight what comes close, then rejoin the round where it has got to.

## Nov 7: guards at the door (build 81)

Mark: "Maybe as a part of the jobs set, we can leave some soldiers at the entrance of the nest."
- **Today:** fighters already had a "Guard the door" job, but it didn't keep the door guarded.
  - A guard wandered up to 9 tiles out for 25 seconds, then went inside to rest, so the door was often empty.
  - The queen only counts fighters within 4 tiles of the door.
  - Recruit by the door took the guards first.
  - That's how the simulated queens died with soldiers alive.
- **Now: "Guards at the door" on the Jobs page.**
  - A − / + number, 0 to 8, two to start.
  - That many fighters stand a ring two tiles round the entrance, facing out, day and night and in the rain.
  - They fight what comes close and go back to their spot.
  - They don't answer Recruit or a muster.
  - One that dies is replaced from the fighters at home: soldiers and majors before venom ants.
  - Turning off a kind's "Guard the door" job stands its guards down.
  - Raiders can't reach the queen past them.
- **The old patrols stay:** fighters whose first job is guard still patrol near the door, half of them at least.

## Nov 7: the balance changes re-simulated, and performance (build 80)

- **The six changes** (more food per trip; room upkeep scaling with the colony; workers at home halving raiders' bite; Trophic eggs with the Barracks; eating at outposts; Store II without a full store) re-ran in the same 12 colonies. The full results are in [`SIMULATION.md`](SIMULATION.md).
  - **Worked:** the economy now breaks even (1.01 from 0.92), zones fall sooner and fewer fighters starve.
  - **Didn't:** raids still kill the queen: repeated raids outpace her healing. A colony down to one ant still can't climb back, because an egg needs food and a lone ant nets none.
  - Three fixes for those are proposed there, as Mark's call.
- **Fixed:** "Queen under attack" warned only once until she healed to full, so the raid that killed her never warned. It now re-arms after half a minute without a hit.
- **The test bot** fetches food before meat when eggs can't be paid. Its lone ant used to hoard meat.
- **Performance** (Mark: "keep on looking into what the devs of those games say"). The full write-up is in [`PERFORMANCE.md`](PERFORMANCE.md).
  - The simulation already does what Total War, Supreme Commander, Factorio and Hitman describe, and costs about 1.5% of a core.
  - The flat ground was drawn at 115,000 triangles. It's now drawn at a sixteenth of that, with the same picture; the yard dropped from about 152,000 triangles a frame to about 80,000.
  - **F3** (or `?perf`) shows where each frame goes, so the next step comes from numbers on real machines.

## Nov 7: a check of builds 69–78 (build 79)

Mark: "Make sure that all the features work well, that there's no weird clashes between features or effects, buttons, things that work together." Two code reviews (the nest, and the UI, sound and saves), long bot games on both builds and old saves loaded. 15 bugs were found and fixed, each reproduced first and checked after:
- **Saves:**
  - A second click during a colony switch could save the old colony over the new one. Now nothing else starts until the page reloads.
  - If the browser's storage failed mid-switch, saving silently stopped for the rest of the session. Now it carries on and says so.
  - With storage blocked (a private window), the colony you were playing showed as "Empty" and one click wiped it. Now the Colonies page explains instead, and Start over on the colony you're playing always asks first.
  - Importing a file that isn't a save gives a plain message.
  - Exporting a colony with a non-Latin name no longer gives a nameless file.
- **Room plans** (none can be stranded now: a plan or a growing room's column keeps a dig order on every cell it still needs):
  - Clear orders wiped a growing room's digs, so it never grew.
  - Erasing a dig order a plan relied on, or a fill on its doorway or a growing column, left it waiting forever. Now your own dig orders on a plan's cells become part of it, its doorways and a growing column can't be filled, and anything lost comes back.
  - Removing a growing room left digs you couldn't cancel.
- **Input:**
  - With a mouse, clicking a cave-in started a dig stroke instead of mending it yourself. A cave-in now can't take a dig order.
  - On touch, a pinch during a dig stroke could paint a stray line.
  - Holding a key, or a shortcut such as Ctrl+R, skipped a boss's introduction.
- **Sound:**
  - Stingers for events raised by a button never played (Retreat's defeat, a great evolution's discovery). Events are now counted from where the last frame left off.
  - The introduction's roar was swallowed by the wake roar's cooldown.
  - The music didn't dip for the introduction.
- **Tests:** the crew-attack test that failed about one run in twelve now picks a rival soldier (a worker runs from a crew, by design). The Phase 5 tests are seeded.
- **What the long games showed:** no crashes, no bad values, nothing stuck and nothing growing without bound; old saves load and play on.
- **Balance shift for Mark:** the military bot now beats the Pavement ants later, or not at all within an hour: once, at 58 minutes, against twice at about 20 minutes on build 73. Rooms now take digging, which delays the Barracks. Rival deaths are higher in sensible games.

## Nov 7: boss introductions (build 78)

Mark: "Little boss animations… everything stops and the ants turn their attention to the boss and the boss turns their attention… an introduction sequence when a boss is introduced, at least when they're in fighting range. Maybe the same thing with the big enemy ants." Thought through in [`BOSS-INTROS.md`](BOSS-INTROS.md):
- **When:** the first time you're within 22 tiles of a boss that's awake and fighting, once per boss per colony. A war party's champion gets the same, the first time you come within 22 tiles of it.
- **What happens (about three and a half seconds):**
  - the game freezes (the scene keeps moving);
  - black bars slide in and the whole HUD steps aside;
  - every ant in sight turns to the boss with a small start (the champion turns to you), and the boss turns to you;
  - the camera glides to it and eases in;
  - it roars, a ring of dust bursts from it and the screen shakes;
  - its name, title and how to beat it slam in;
  - then the camera glides back and play resumes.
- **Never in the way:** any click or key skips it, and it waits while you're in the nest, in a menu or on the title screen.
- Approaching a sleeping boss now only gives its line in the feed and its ominous sound; the name card moved into the introduction, where the fight is.
- Tests in `introductions.test.js`; the end-to-end run checks the hornworm's.

## Nov 7: songs, battle music and stingers (build 77)

Mark: "A few songs for specific things… sound effects when there's a raid happening or a big fight. It slowly transitions to a battle song. Maybe successful noises if it's successful." Thought through in [`SOUND-POLISH.md`](SOUND-POLISH.md):
- **A song for each situation,** all in A minor at 92 bpm on one bar clock, so they blend on the bar line rather than cut:
  - day in the yard (as before);
  - **night** (a music box over a low pad, no drums);
  - the nest, now with a kalimba line;
  - **battle**;
  - **boss** (its own chords, Am, B♭, Am, E, with a low choir and timpani);
  - the title screen.
- **The battle song builds with the fight:** war drums and a chugging bass from a skirmish, brass stabs as it grows, and the battle tune (a fixed eight bars) at full.
  - **What drives it:** the duels near the camera, a raid you lead (full inside their nest), raiders on their way to yours, and the battle tally.
  - **How it moves:** it rises in a couple of seconds, holds six after the fighting stops and fades over eight; the day song dips under it and comes back.
  - It plays about twice as loud as the calm music.
- **Stingers,** with the music ducking under them:
  - **victory:** a raid won, a raid on your nest beaten off, a boss down;
  - **defeat:** a raid failed or called off, an outpost lost;
  - **discovery:** breaking into new ground, an outpost, a region held, a zone, a great evolution;
  - **milestone:** a goal, a daughter;
  - **nightfall** and **dawn**.
- **Sounds for events that had none:** a rumble for breaking through, a shimmer for glowrock, a chime for the first wood, sugar and chitin, a brass blip for the first veteran, a flutter for the nuptial flight, a quake for the fire ants' eruption and the sinkhole, the boss's second roar, a thud when a dig or a room is refused, and a soft tick as the room ghost turns green.
- The music renders offline too (`renderMusicWav`), so demos can be listened to outside the game.

## Nov 7: Phase 6, save slots (build 76)

Mark: "It auto saves? Yeah, that's good. But it'd be good to have, like, save files, like different options. So you can have different nests." Thought through in [`PHASE6.md`](PHASE6.md):
- **Three colonies,** each autosaved as before. On the title screen, **Continue** returns to the one you last played (its name under the button), and **Colonies** shows a card for each: its name, day, ants, queen level, time played and when last played, with Play, Rename and Delete. An empty slot offers **New colony** or **Import**.
- **New colony no longer wipes your nest:** you pick a slot, and only a full one asks before it's overwritten ("Start over" on the one you're playing).
- **Save files:** **Export** downloads the colony as a `.underfoot.json` file (its map photos come back as you explore); **Import** loads one into an empty slot, checked first, so a bad file changes nothing.
- **Storage:** the colony being played stays where it was (localStorage, with its backup and map), so the autosave is unchanged and your old save is Colony 1. The other two wait in IndexedDB, which has room for them and their maps. A switch saves, swaps and reloads, and nothing is saved while it does.
- A new colony in a slot skips the intro film (it plays once per player).
- **Recorded for the house phase:** the ants never eat people ("we don't want them eating people or kids or anything"), in `BACKLOG.md`. The ant religion stays noted, not planned.
- Tests in `slots.test.js`; the swap, rename, export and import were run in the browser.

## Nov 7: Phase 5, the yard and the air (build 75)

Mark's notes: the sand bucket "looks weird… it's not hollow"; "you wouldn't find tiny little apple cores the same size as an ant, but you might find a larger apple core somewhere"; the night glow "would be an evolution… something minor"; "make sure that rain fades in"; the spoil heap: "maybe builders can use it to fill holes". Each piece is reasoned out in [`PHASE5.md`](PHASE5.md), then built:
- **Rain fades in:** every storm has a strength that the streaks, the ground splashes, the grey of the sky, the sound and the raindrop knocks all follow. Ten seconds of scattered drops after the thunder, twelve seconds building to the downpour, then easing off over the last ten. Storms last 40 s (was 30) so the downpour keeps its time: a balance change, Mark's to tune.
- **The sand bucket** lies tipped on its side, its mouth to the view: a hollow ribbed shell with a pale inside, a rolled rim, a closed bottom, a handle, sand still in it and a tongue of sand spilled out.
- **Hidden antlion pits:** each is a faint dimple in the sand until one of your ants comes within a few tiles; then sand trickles in (with a sound, and a line the first time) and it shows in full, for good. Three more, smaller pits join the seven (from their own random stream, so nothing else in a saved yard moves). Their danger is unchanged.
- **Food at a believable size:** one apple core in the yard at a time, in the Compost Heap: drawn at its real size (about fifteen ants long, lathe-turned, bitten to the core, red skin left on its ends), worth 150 to 200 food, shrinking as it's eaten. The rest of the compost gives berries, crumbs and seeds.
- **The spoil heap fills holes:** a fill packs a load of dug dirt back in (from the loads waiting inside, or the heap by the door) three times as fast as chewing the walls, and the heap shrinks. Tapping the heap says so.
- **Bioluminescence,** a small Senses node after Rain sense (3 genes): at night your ants glow a faint blue, with a soft light pooled under each, and their trails glow blue. No stats.
- Tests in `phase5.test.js`; the rain-knock test now runs in the downpour.

## Nov 7: Phase 4, the nest (build 74)

Mark's answers: "Only in a closed chamber and hallway", "Place myself and yes drag to dig", "If we can birth it as different ants it should have those abilities", "Yes crew and water". Each piece is reasoned out in [`PHASE4.md`](PHASE4.md), then built.
- **Rooms need walls and a way in:**
  - every cell touching a room's footprint must be dirt, except one or two doorways (tunnel cells out to a hallway); no shared walls between rooms;
  - a dig that would open a third way into a room is refused ("that's a room's wall"); the queen's chamber is the hub and exempt;
  - rooms already built stay as they are.
- **You place rooms:**
  - a ghost follows the cursor: green fits, red says why, wall outlined, doorways gold, cells to dig marked; it snaps to the spot needing the least digging;
  - on dirt it's a plan: its cells and a doorway become dig orders, builders dig it out, then build it; cancel takes the digs back;
  - touch: tap to put the ghost, tap inside it to place; right-click or Esc stops.
- **Drag to dig:** a mouse stroke from soil paints dig orders (joined cell by cell); from a dig order, erases; from a tunnel or with the right button, pans. Touch: hold, then drag. The limit goes from 16 to 40 (a plan's digs don't count).
- **Your ant plays its kind:**
  - builder: digs the order beside it and builds the room it stands in at twice a builder's pace, walks to a dig you tap, and raises outposts with the work of two;
  - nurse: two nurses by the eggs, and heals your crew round it when not fighting;
  - medic: heals your crew twice as fast, fighting or not, and cures the fungus;
  - forager carries 8 (12 with Big jaws) and is a fifth faster on trails; harvester carries seed in double loads; replete carries 12 food;
  - the rebirth choice now also offers medic, harvester, replete and major, each once it can be laid; your card says what your kind does.

  The numbers are balance, Mark's to tune.
- **A crew gathers:** when you pick something up, each crew ant near you takes a load of the same kind from the nearest pile within eight tiles (spread over the piles), carries it with you, and delivers when you're home. A crew that breaks up carries its loads home.
- **Rooms grow when levelled:** a room going up a level grows a column, on whichever side keeps its wall and doorways; builders dig it out. If neither side can, only the numbers change. The six basic rooms have no levels; giving them levels is Mark's call.
- **Light in the rooms:** the earth is dimmer, and each room has a lamp (a glowing bulb on a root, coloured by the room) with a flickering pool of light; the ten rooms nearest the view are lit.
- **Fog below the topsoil:** ground more than three cells from a tunnel is dark, shading in over two, and lifts as you dig. Shut sections' names and bedrock glints show only once you've dug near.
- **Packed passages:** bought once in the Build menu (30 🌾, 40 🪨, needs a Workshop): every ant walks the nest 40% faster. The cost is Mark's to tune.
- The bot places room plans; tests in `chambers.test.js` and `castes.test.js`.

## Nov 7: Phase 3, creatures (build 73)

Each piece is reasoned out in [`PHASE3.md`](PHASE3.md), then built:
- **Hunters are a real threat:**
  - **Chitin armour:** a worker's bite does a quarter on a hunter, a soldier's or venom ant's in full, a major's half again, yours (already doubled) about a soldier's and a quarter. A crew of foragers barely scratches one.
  - **No more walking off from a crowd:** with three or more on it, a hunter lashes out every 3.5 s.
    - the jumping spider spins and bites everything next to it;
    - the assassin bug stabs the biggest;
    - the skink tail-whips and knocks them back.
  - **Hurt below a third, it runs home** (to come back healed later) unless three or more surround it. The skink keeps its tail drop.
  - **You're prey too:**
    - the jumping spider bites for 4 (was 2.5);
    - the assassin bug stabs you for 6 every 1.8 s (was 4 every 2.5 s);
    - the wasp stings for 4 (was 3).

  These are balance changes, Mark's to tune.
- **The spider fight:**
  - each ant fighting it holds one of its eight legs, a spot at that leg's foot that turns with it (a second ring past eight), so they ring it rather than pile under it;
  - bites land on the leg held, and 22 cripples a leg;
  - each crippled leg slows it 10%, and four stop its lunge; lamed, it limps; its card counts the crippled legs;
  - its strikes are visible: a real lunge (thrust low, foreleg up), and a bite that rears and slams down with dust;
  - with five or more on its legs, every 5 s it rears and stamps, knocking everyone back for a little, with a ring of dust, a stamp and a shake if you're near.
- **The millipede runs:** bitten, it runs (three times its pace) away from the nearest ant. It curls only when cornered (three on it, or caught again as it runs). Curled, it oozes: biters take a little and workers back off. When the crowd thins it runs again.
- **The foot stomps:**
  - it hangs higher, then drops fast and squashes on landing;
  - a shake by distance (strong close, felt far);
  - a white shockwave ring, flung clods and a second, slower dust cloud;
  - a deeper boom with a long rumble;
  - a print left on the ground for 20 s;
  - ants just outside it are knocked back.
- **Hover an ant** and it wears a ring in its side's colour (gold you, green yours, red theirs), with a label: its name or kind (a rival's colony too) and its health.

## Nov 6: RTS combat (build 72)

Mark: "Think of RTS games when it comes to combat, animations and obvious combat sounds and clashes." Reasoned out in [`PHASE2.md`](PHASE2.md), part 2:
- **Every bite is heard by its dice:**

  | Result | Sound |
  |---|---|
  | miss | a dry snap |
  | hit | a crunch |
  | hard hit | a heavier crunch |
  | crit | a cracking ring |
  | locked | a scrape |

  Each varies in pitch and tone, is heard from where it lands (panned, faded with distance) and is capped per kind, so a war party is a din, not one sample repeating.
- **A battle has a sound:**
  - a bed of chitin chatter and clicks whose loudness follows the duels near the camera;
  - a war drum when a battle starts near you;
  - every death a crunch and a thin squeal.
- **Hits throw something:**
  - chitin flecks arc out of each landed bite, with a puff of dust on the ground;
  - a crit spreads a white ring;
  - a crit near your ant kicks the view.
- **The fallen fall:** a dead ant (outside) lies on its back, legs up, twitches, stays eight seconds and sinks away. The mower and birds leave nothing. The bodies are not saved.
- **Health bars:** a thin bar over every ant hit in the last four seconds, green for yours (gold when nearly dead) and red for theirs. They are drawn in one batch, on top.

## Nov 6: Phase 2, combat feel (build 71)

Each piece is reasoned out in [`PHASE2.md`](PHASE2.md) (asked, means, today, others, design), then built:
- **Ants lunge when they bite.** Each swing is remembered (when, how it went, which way).
  - A fighting ant faces its foe and lunges on every swing: further on a hard hit or a crit, short on a miss.
  - The one it hits reels back.
- **Fights spread out:**
  - a fighter picks the foe in reach with the fewest on it (one-on-one, then two, then three), so a fourth goes elsewhere;
  - duellists keep biting distance;
  - fighters of one side ease apart, so a clash reads as a band of pairs rather than a heap.
- **Fights last longer:** a duel swing every 1.1 s (was 0.7), and your ant's every 0.9 s (was 0.6). Damage per hit is unchanged, so who wins doesn't change, but you can see it and answer it. This is a pace change, Mark's to tune; one test's time window was scaled to match.
- **A battle view:**
  - while four or more duels are near you, a tally under the clock ("⚔ 7 ▬▬ 6") shows both sides;
  - the camera eases in 15% (not if you zoomed by hand in the last four seconds).
- **The raid stage.** The small raid card became a panel:
  - **at the door:** your ants against theirs as tokens, and a door that cracks and shakes as you hold it, with plain words on what's needed;
  - **inside:**
    - the two sides' counts in big type and both sides as tokens;
    - each clash's pairs lunging at each other with their results (CRIT!, HIT!, miss, locked, falls);
    - free raiders running for the prize;
    - the prize and queen bars;
    - a ring counting to the next clash;
    - a drum each clash and "Breach!" when the door gives;
    - "Clash", not "Round"; "Retreat · keep what you've taken", not "Pull out".
  - **The result:** a banner with what was won and lost.
- **Defend.** While your nest is under attack (raiders coming, at the door, or the queen hit), a red Defend button (D) shows above the dock.
  - Each press rings the alarm and calls the next six nearest ants home to fight at the door, fighters first, then workers. Each shows a "!" for two seconds.
  - Four seconds' cooldown between rings, drawn as a ring.
  - The war-party and queen shouts say to press D.
- **A fix on the way:** the War party shout matched your own raid's opening line; it now matches only raids on you.

## Nov 6: a little character (build 70)

Mark, on build 69: "I love what you did with the forager section… there should be a bit of an indent, so you know it's under that category… The day clock is awesome too. Add a little pizzazz to it, like a little character… Same thing with HP."
- **The Ants page:**
  - the kind's icon sits in a green badge;
  - everything about it (its line, the ladder, its rank skills) hangs from the badge, indented along a gold guide line, like a branch of a tree;
  - the rows are narrower (640 px, was 760).
- **The day clock has character:**
  - its hub is a little ant's head (antennae, mandibles) whose eyes follow the sun or the moon;
  - the sun has a face and its rays slowly turn;
  - the moon dozes;
  - the stars twinkle;
  - a cloud drifts across by day.

  All of it still is with reduced motion.
- **The health bar:**
  - a fighting game's damage trail: a pale chunk that lingers half a second after a hit, then shrinks, so you see what the hit took;
  - glossy fills on both bars in each theme's own colours;
  - the heart beats while you're low.

## Nov 6: Phase 1, the HUD thought through (build 69)

Mark: "Think through them before just doing a first draft… what exactly am I asking for, what does that look like, how does that compare to what other games do." Each Phase 1 piece is reasoned out in [`PHASE1.md`](PHASE1.md) (asked, means, others, design), then built:
- **A command card.** The yard dock is three fixed groups:
  - places (Enter, Outpost, Raid), on the left;
  - the four actions, centred;
  - the crew's orders, on the right.

  An action you can't use now leaves a dashed socket. Every dock button has a hotkey printed on it:

  | Key | Button |
  |---|---|
  | E | Pick up |
  | T | Trail |
  | R | Recruit (hold to keep recruiting) |
  | G | Release |
  | H | Hold |
  | V | Split |
  | F | Follow |
  | N | Enter or exit |
  | O | Outpost |
  | B | Raid, or Build in the nest |
  | Q | Queen |
- **Tooltips like an RTS's:**
  - the name and its keycap, then what it does;
  - with a mouse it stays while you hover;
  - kept clear of the curved labels and the screen's edges.
- **Vitals:** two wide bars with their values (❤ 7 / 12, 🍖 96%) and quarter ticks.
  - The heartbeat and strong red edge only while you're in danger: hurt in the last eight seconds, or starving. Healing at home is quiet.
  - **An empty stomach drains your health (about eight seconds from full) instead of killing you on the spot,** and you don't heal while starving. This is a balance change, Mark's to keep or drop.
- **Three tiers of alert:**
  - **shouts**, mid-screen, for act-now moments only: the mower, the queen under attack, a war party, hunger. One at a time, queued, and the same one not again within 20 seconds.
  - **the feed**, news at the side: up to three notices under your health, coloured red, green or gold, fading after five seconds (danger eight). A repeat refreshes instead of stacking.
  - **tips**: the how-to line (first 15 minutes) and smaller first-time cards.
- **The day clock, drawn:**
  - an SVG half dial in the HUD's look (cream rim, inked edge, green outline);
  - the sky follows the light, with stars at night;
  - the sun crosses from horizon to horizon by day and the moon by night, so its place says how much is left;
  - it glows gold at dawn and silver at dusk, with a caption.
- **The Evolution window:**
  - the pages are named tabs across the top, between the arrows (the dots are gone);
  - "The Ants" shows one kind at a time, picked from its own tabs, as a ladder of five levels: done ✓, the next with its cost and Evolve (or its two choices side by side), the rest dim;
  - then its rank skills in one compact block.
- **Smooth zoom:** the wheel and the Zoom button set a target and the camera eases to it. A pinch stays direct.

## Nov 6: playtest 3, the HUD (build 68)

Mark and his brother played; the whole session is sorted in [`PLAYTEST-3.md`](PLAYTEST-3.md). This build is its interface fixes:
- **Recruit stays put.** The yard dock's four buttons (Pick up, Trail, Recruit, Release) have fixed, centred slots: a hidden one leaves its slot empty. Crew orders, Outpost, Raid and Enter grow to the right of them. Before, Release appearing re-centred the row and took Recruit's place.
- **The crew cap is on your whole crew.** It was per press, so a second press went over. Ants holding a spot count.
- **Tooltips sit above the buttons on big screens.** The HUD scales up there, and the tip's position was scaled a second time, so bottom-bar tips fell off the screen. Tap cards had the same bug.
- **Warnings you can't miss:**
  - a heartbeat with the red edge at low health, faster below 20%;
  - a growl and a shaking hunger bar when hungry;
  - "Hungry" and "Starving!" in the middle of the screen, once each.

  A **shout** (a word mid-screen that fades by itself) now carries these and the mower ("Mower!"), instead of notices at the side.
- **A day clock:** a half dial at the top centre, day and night turning under it with the sun or moon. It glows at dusk and dawn with a short caption. The night and dawn banners are gone. It is hidden on narrow screens, where the top bar's chip still counts down.
- **Fewer notices:** the how-to lines show in a colony's first 15 minutes only; warnings stay.
- **Zoom out stops sooner:** 0.65, was 0.5 (about three wheel notches).
- **Bigger text** in every sheet and the Evolution window, about two points.
- **The dead winged ants** after a swarm are named on their card ("Fallen winged ant"), not "Meat".

## Nov 5: no stuck first frame (build 67)

Mark: "There is a definite bug when starting the game for the first time where there's a first frame that's kinda stuck." Measured a first run (no save) and a returning one, frame by frame, with the processor profiled.
- **The film's pre-roll froze.**
  - Behind "Loading the yard…" it built the whole film area in one frame (6.4 s in the test browser).
  - It then compiled every shader at once (2 s), and for the screen, not the low-resolution framebuffer the game draws into. So those were the wrong versions, and the right ones still compiled in the film's first frames.
  - Now the yard is built a slice a frame (45 ms) with a progress bar. Nothing is drawn behind the black screen.
  - The shaders are compiled in the background for the right framebuffer, and the textures are uploaded.
  - Then one hidden frame from above draws everything the film will show, and the black lifts.
  - A recording (`npm run film`) still builds everything up front.
- **Play stalled on the nest.** A first run starts in the nest, which had never been drawn, so its first frame compiled all its shaders (1 s). The nest is now built and warmed during the film's pre-roll or under the title, and so is the map photo's copy pass (Skip stalled on it).
- **The title froze too (returning players).** Its first frame built the yard round home at once (3.9 s) with the title showing and the buttons dead. That yard is now built a slice a frame behind a hidden canvas, warmed, then faded in under the title.
- **Never stuck for good.** Where a browser can't report that a shader is ready, the wait gives up after 3 s, and each shader is then finished at once, while something else is on screen.
- **Results** (test browser, no graphics card):

  | Moment | Longest frame, before → after |
  |---|---|
  | Film pre-roll | 6.4 s, then 2 s → under 0.1 s each (two ~1.5 s waits on the software GPU remain, idle on the main thread) |
  | Pressing Play | 1–1.3 s → 0.3 s |
  | Skip to the title | 1.2 s → none over 0.7 s |
  | Title's first frame | 3.9 s, then 1.9 s → the yard fades in when ready; the buttons work throughout |

## Nov 5: the nest redrawn in Lean (build 66)

Mark: "I wanted you to redraw the nest, not all the bosses and stuff; that was already good after the Lean pass." Measured first: of the nest's 132k triangles a frame, the tunnels themselves were only about 1k. The rest was:
- the things buried in the ground beside the cutaway (66k);
- the cutaway's own buried things (19k);
- the back wall behind each room, a fine grid (27k for 8 rooms).

What changed:
- **The buried things are Lean.** Roots, stones, worms, grubs, snail shells, seeps, the drain pipe and the mole tunnels are smooth-shaded and welded, with no per-face speckle, like the creatures. There are fewer, bigger pieces:
  - roots in longer, slightly thicker, three-sided segments (open ends, since they sit in the soil);
  - fewer, bigger stones, and the gravel along each band boundary spaced out;
  - small pebbles as 8-triangle gems;
  - the pipe in 120 px lengths.

  Each kind of thing has its own random stream, so the layout doesn't shift when one kind changes.
- **Room back walls are a fan**: from the chamber's middle out to its wall, then two rings that fade it raggedly into the soil. That's 200 triangles a room instead of 3,000+, and it looks the same.
- **The ground beside the nest is baked in blocks 400 px across**, so the camera skips the blocks it can't see. It used to be one mesh, drawn in full whenever any of it was on screen.
- **The soil faces are unchanged.** They keep the band textures and the tunnel outlines (they were already cheap).
- **Results:**
  - the nest's own geometry is about 42k triangles, down from about 113k: buried things 85k → 33k, room walls 27k → 1.6k;
  - less of the beyond is drawn, since off-screen blocks are skipped.

## Nov 5: faster, now that there's less to draw (build 65)

Mark: "With these changes, improve the performance of the game since it's less triangles." Then: "What are some of the biggest draws… how is that possible and how can we reduce that?" Measured first: a harness times the sim, the scene update and the draw, counts triangles and draw calls, and profiles the processor, on three scenes (250 ants on the surface, the nest, the Cordyceps fight), build 63 against this one, back to back.
- **Off-screen things aren't drawn.** Every ant, ground item and bug in the loaded yard was drawn each frame, even far off-screen (the crowds can't be culled by three.js on their own). Now the view works out the patch of ground the camera sees (plus a margin) and skips the rest. The film, which has its own camera, still draws everything.
- **Lighter outfits.** The forager's apron was 284 triangles on a few pixels of green; with about 280 foragers it was 80,000 triangles a frame, more than their bodies. It is 104 now: the same apron, basket, straps, bib and bow, with fewer sides, and the basket lid, red ball and bow knot (too small to see) gone. The harvester's sack went from 260 to 156, the builder's hard hat from 180 to 138, and every outfit's bands and balls have fewer sides.
- **The map no longer stalls the game.** It was saved as one 1600 × 1120 JPEG, encoded on the main thread at every autosave after a new region was photographed. Now each region's photo is encoded once, when it is taken, as a small JPEG in a memory-backed canvas (0.3 ms instead of about 20), and saving just writes them out. Older saves' maps still load, and are converted as they load.
- **Picture quality recovers.** The game drops a quality step after three slow seconds; it now steps back up after ten smooth ones (55+ fps). A step that proves too slow again within 30 s stays down, so it never flickers.
- **No shader error checks in the released build** (only while developing): they cost time each time a new material first draws.
- **Results** (test browser without a graphics card, so the frame rates are low but comparable):

  | Scene | Triangles a frame, before → after | Draw calls | Frame rate |
  |---|---|---|---|
  | 250 ants on the surface | 515k → 110k | 66 → 32 | 1.2 → 6 |
  | Cordyceps fight | 543k → 50k | 88 → 32 | 6.8 → 10 |
  | Nest | 145k → 132k | 55 → 55 | 6.4 → 7.5 |

- **The biggest draws left:**
  - the nest's underground (about 120k, the soil and tunnels);
  - the yard's ground and landmarks (about 50k on screen);
  - the ant bodies themselves in a big crowd (about 210 each);
  - the Cordyceps heart (about 14k, mostly its nine ant husks).
  - The world is next only when Mark says so. For crowds, the next step would be a far-away ant: the 64-triangle Ultra ant, with no outfit, for ants that are only a few pixels tall.

## Nov 5: every creature and object in the Lean style (build 64)

Mark, after the ant lab and the bosses in Lean: "Lean looks better overall… apply this to every single ant and boss and model everything, maybe not the world itself for now." Then: "Keep the other creature models, the first ones, but let's use the Lean versions."
- **The ants are the Lean ant from the lab:**
  - a few low-segment parts, smooth shading, one tone per part, three-sided legs;
  - built from each body plan's own proportions: the worker, the soldier's big head and jaws, the venom ant's wedge head, tapering gaster, sting and fangs, and the queen's wing scars;
  - about 210–230 triangles a frame, down from 840–930;
  - they keep the walk, the size and every caste's tint;
  - outfits are lighter too.
- **Everything else keeps its own design, in Lean.** The spider, caterpillar, small creatures, hunters, robin, toad, every guardian and wild boss, food, nest props, curios, props, the sneaker and the acorn are the same models, run through Lean's rules:
  - fewer segments on every rounded part (`render/models/lowpoly.js` caps them);
  - colours that run smoothly from vertex to vertex, with no per-face speckle;
  - welded parts, so they shade smoothly.
  - Markings that depend on where they sit (stripes, the widow's red, the mole's veins) stay.
- **The world is unchanged:** the ground, landmarks, house, soil and the Sinkhole keep the faceted style (`paintFacets`, `bakeFacets`). The Sinkhole's pit and lip moved from `wildBosses.js` to their own `sinkhole.js`, at full detail, since its rim must cover the hole cut in the ground.
- **How:**
  - `render/models/kit.js`'s `paint` and `bake` are now Lean, with the old ones kept as `paintFacets` and `bakeFacets`;
  - the props' own painter is Lean too;
  - the nest props' mirror handles welded models.
  - All 137 models in the gallery checked; tests, e2e and the `.glb` exports are redone.
- **Next, Mark's idea for later:** exploring what more the Lean approach can do.

## Nov 4: button labels and badges placed properly (build 63)

Mark: "The sidebar text is a little high and not centred with the buttons; the bottom-layer buttons have text clipping with the buttons and aren't centred; and the notification bubbles clip under the text."
- **Labels centred.** Each button's curved name was placed from inside the button's white border, so it sat about 3px right and low; on the bottom row that pushed it into the rim. It is now centred on the button, whatever its border.
- **Each curve fits its own button.** The side buttons are smaller than the bottom ones, but their names used the same curve, so they floated high. The bottom names now ride just clear of the rim, and the side names hug their buttons.
- **Badges moved.** The counts on buttons (your crew "6/20", Release "6") are now a pill centred under the button, clear of the name curved over its top.
- **One more stale hint fixed:** after beating the rival, it now names New colony on the main menu instead of a Reset button that no longer exists.

## Nov 4: buttons and materials appear when they matter (build 62)

Mark: "Let's hide buttons on the UI until they become available," then: "same with any materials or resources until we need them or we've been exposed to them."
- **Buttons show only when they'd work.**
  - **Bottom row:**
    - Pick up appears when there's something to pick up or set down.
    - Release appears when you have a crew.
    - Raid appears at a rival's door once your crew is big enough.
    - Outpost appears (after Waypoints) only where one can go.
  - **Abilities:** each of the four slots appears once it's learned; the bar shows once there's one.
  - **Build nest** appears when the queen is deep enough.
  - **Top right:**
    - Nest and Map appear once the nest is founded.
    - Evolve appears with your first gene.
    - Jobs appears with your first ant besides yourself.
    - Menu, Zoom and Help always show.
  - A top button, once shown, stays (a new colony starts over).
- **Materials show once the colony has met them, or needs them.**
  - Food, water and ants show from the start: eggs need them.
  - Meat shows with the first catch, or as soon as you have fighters, since they eat it. It turns red while they're starving.
  - Stone shows with the first pebble.
  - Sugar, chitin, wood and glowrock already showed only once found; they now use the same rule.
  - Once shown, a material stays, even at zero (`SIM.resSeen`; saved with the colony). Colony details follows the same rule.
- **The tutorial's abilities tip** now says they appear bottom left once learned.

## Nov 4: the audit's leftovers (build 61)

Mark: "Sure, let's try it", on the three items build 60 left for later. All three are organisation; the game plays and looks the same.
- **Each boss has its own drawing file.** `surfaceView.js`'s 400-line boss function is now 13 files in `render/views/bosses/`, drawn in the same order. A script moved each block, and the shared helpers went to `views/surfaceKit.js`.
  - Screenshots of all 13 bosses, before and after, match.
  - Two clashes caught on the way and fixed: a local `v` that hid the view (it would have broken the antlion's sand trail), and a local `k` (a size) that hid the shared slots for the health bars.
- **One shared toolkit for the models.** The vertex-colouring, merging, `hash` and `V` helpers had 10, 6, 5 and 8 copies. Now there is one of each, in `render/models/kit.js`, with options for the few real differences (recompute normals, drop texture coordinates, a seeded brightness jitter).
  - A fingerprint of every model's geometry (383 of them) is byte-identical before and after.
  - The 116 `.glb` exports regenerated to identical files.
- **The gallery and exports are up to date.** It now shows every model in the game, 137 in all, up from 116. New are the hunters (jumping spider, assassin bug, hunting wasp, skink), the mantis, widow and centipede, and a new Wild bosses page: Nevermore, the Cordyceps Colony, an infected ant, the Hornet Queen, Old Blind and the Sinkhole. Each is also a `.glb` in `game/assets/models/`.
- **Decided (Mark, Nov 4): the Cordyceps outbreak keeps infecting rival ants too.** "Let's try it out and see as is." Their zombies count toward the event; to revisit after playing it.

## Nov 4: the code audit (build 60)

Mark: "Do a thorough look at all our project code… confirm everything is where it should be and clean and organized… further perfect our project from a code aspect." An automated lint pass, then three read-throughs (simulation, rendering, UI and repo layout), each finding checked before it was fixed. There are no balance changes; every fix is a bug or a mismatch between near and far play.

**Bugs fixed.** The simulation ones are pinned by `tests/regressions-code-audit.test.js`, which fails on the old code.
- **Raids could stop for good.** A raid never ended if the raiding colony's queen died while it was out. That blocked every later raid, kept the Hive mind bonus on, and gave no raid report.
- **Musters and fighters' targets weren't saved.** After a reload, End muster found no one, and fighters forgot the boss or bug they were on.
- **Far daughters starved 5× too fast.** Each one starved on her own clock and ignored Iron Stomach. Now the colony takes one famine death at a time, drawn from near and far ants by their numbers, as meat starvation already was.
- **Lone infected ants never rotted.** An infected ant with no one near never rotted away; now it goes after two minutes, as described.
- **Daughters lost things when you walked away.** Her ants' water, meat, grit and chitin vanished (only food arrived), and so did her veterans' names and ranks. Now the loads arrive, and the veterans come back as themselves.
- **The crew's war cry never played.** Two sounds were both called "charge", and the beetle's thunder replaced it.
- **Rendering:**
  - the hornet-dive warning ring drew with broken sizes;
  - every infected ant took the first one's tint;
  - turned ants wore two stalks.
- **Menus with progress bars rebuilt 5 times a second**, which could swallow a tap (the egg menu while eggs hatch). The bars now move in place.
- **A new game or a load leaked graphics memory** (materials and textures).
- **Old saves filled storage.** Saves from before the whole yard (v10 and earlier) can never load. They're now cleared on start, so they can't fill the browser's storage.
- **A test button was visible to everyone.** The "+200 ants" button now shows only with `?debug` in the address.
- **Corrected text:** two goals now say what they count ("Kill 10 Pavement ants", "Build 6 rooms"), and the lost-colony hint names the real button.

**Organisation:**
- **The simulation is split by topic.** It was one 4,000-line file; now it's 23 modules in `game/src/sim/`, one per topic, each headed with what it holds. `sim.js` gathers them into the same `SIM` object as before, so nothing outside changed.
  - A script did the split from the parsed code, moving each statement whole with its comments.
  - 12 minutes of seeded play give a byte-identical save before and after.
- **Dead code removed:**
  - the old Evolve sheet (replaced by the Evolution book in build 14 but still in the code);
  - functions and exports nothing used;
  - unused variables and imports;
  - unused CSS.
- **Stale comments corrected** across the sim, the renderer and the film.
- **`npm run lint`.** ESLint now checks for mistakes (not style) and passes with no warnings.
- **Tests renamed by topic.** The build-numbered test files now have topic names (`qa47` → `regressions-stress`, `crow55` → `wild-nevermore`, and so on).
- **Old material archived.** `prototype/` and the two art-direction folders moved into `archive/`.
- **READMEs rewritten.** The root README and `game/README.md` were rewritten; the latter is now the map of the code.
- **New npm scripts:** `npm run playtest`, `film` and `itch-art`.

**Found, not done (for later):**
- **Duplicated helpers in the renderer.** It has about 10 copies of the small colouring helper and 6 of the merge helper; they could share one file.
- **`surfaceView.js` could split up.** It draws all 12 bosses in one long function; each could get its own file, as the sim now has.
- **The model gallery and the `.glb` exports are behind.** They don't have the newer creatures and the wild bosses.
- **One design question:** the Cordyceps outbreak's spores also infect rival ants, and their zombies count toward the event. (Build 61: Mark keeps it as is, to see in play.)

## Nov 4: the wild bosses' new look; Old Black becomes Nevermore (build 59)

Mark: "Old Black is a bad name, and should be more raven-esque / Cordyceps should be a different ant design, more zombie-esque / the crater reads as a mound, not a hole / let's vastly improve the visual look of these." Each now has its own model (`render/models/wildBosses.js`).

- **Nevermore, the Raven of the Bramble Lot** (was Old Black). Only the name changed in play; the sim's key is still `crow`, so saves keep working. The new model:
  - a heavy, shaggy raven: throat hackles, a wedge tail, a massive arched bill, and fingered primaries with two missing from one wing;
  - black with a blue-purple sheen;
  - one eye milked white and scarred, the other glinting green.
  - It flies lower (85, was 160), so it stays on screen.
- **The Cordyceps zombies** have their own ant model, used both for the Hollow's zombie waves and for your own ants once they turn:
  - hunched, the head drooping, jaws agape, milky eyes;
  - mottled grey, white fungus bursting from the joints, one leg broken at the knee;
  - a swollen gaster with glowing pustules;
  - the fungus's stalk growing out of the back of the head.
- **The Cordyceps Colony's heart:**
  - a lumpy dead mound crusted with pale fungus, with gaping dark doorways;
  - six twisted fruiting stalks with swollen pored heads, and husks curled round its foot;
  - white mycelium threads creeping out over the ground;
  - glowing pustules, and a drifting cloud of spores (it bursts when the heart spores).
- **The Sinkhole is a real hole now.** The old crater sat beside the fire ants' great mound, which still stood, so the place read as a mound.
  - When the Sinkhole opens, the mound is replaced by a deep pit. The ground under the mound is always cut open (the standing mound hides the cut), so the pit truly falls below the yard.
  - The pit has a broken red rim, slumped low toward the seam, and the fire ants' old galleries open in walls that darken stratum by stratum. Roots hang into it and rubble lies on the floor.
  - At the bottom, the seam glows through a jagged split, with a faint green shaft rising out.
  - The fight ground on the pit's lip, the old seam, is a low torn dish of scorched earth. The fire ants' nest door there is gone.
  - No rules changed: the pit stands on the mound's own blocked tiles.
- **Old Blind** is remodelled:
  - a humped velvet barrel with no neck, bald mangy patches, and **glowing green veins branching over its back** (they pulse);
  - huge pink spade hands thrust out at the shoulders, with five long nails each;
  - a wide pink star nose of 22 rays;
  - one milky eye and one green.
  - Under the earth: a heaving ridge with a trail of turned earth behind it. When it erupts, clods fly.

## Nov 4: the wilds, step 6: the Sinkhole, Old Blind, and the Takeover (build 58)

Mark: "Sure, let's do it." The finale of the yard.

- **The Sinkhole.**
  - When the fire ants' queen falls (once the edges have stirred), their mound caves in. Banner: "The ground gives way."
  - It's a dark crater with green cracks, an open seam four tiles across that burns ants who linger. The fire ants had nested on it, which is why they were so fierce.
- **Old Blind, the Thing Under the Mound**, 4,200 health: a velvet-dark mole with a pink star nose, pale shovel claws and pinprick green eyes.
  - Only the Supercolony evolved **and** a muster of five colonies wakes it.
  - **Under the earth** it can't be bitten. A ridge of dirt swims toward your thickest crowd, then a ring shows where it will **erupt** (7, and everything flung).
  - **Up** for 7 seconds (5 when it rages), it swipes a claw lane (6), and bites land; then it dives again.
- **Beaten:**
  - Old Blind's claw: the Sinkhole's seam gives a glowrock every 5 minutes;
  - the south edge quiets; two glowrock;
  - a banner, "The glow is yours", points to the last evolution.
- **The Takeover:** the last great evolution (after the Supercolony; 3 glowrock, 20 genes, 300 food, 100 meat). Evolving it shows the ending:
  - "The yard is yours, to the very edges";
  - your colony's record (nests, ants in the supercolony, zones, wild bosses, glowrock);
  - "Behind you, the back door of the house swings open… Phase 2, the house, is the next chapter."
- **The 13-zone ending changed:** it no longer opens the door. It says something is still waking at the edges, and the house will wait for a colony that can face it.
- **The wilds are complete:** all six steps of `WILDS.md`.

## Nov 4: the wilds, step 5: the Oak's Crown and the Hornet Queen (build 57)

Mark: "keep going." The first height in the game: you climb the Oak.

- **Her nest** hangs 420 px up the Oak's south face: a grey paper ball banded in rings, hornets wheeling round it, the queen on its flank (2,600 health). A muster of **four** colonies at the Oak's foot wakes her.
- **Climbing.**
  - At the Oak's foot the Enter button becomes **Climb the Oak**, and your crew climbs with you, just behind.
  - The camera rides up the bark; you reach her in about 9 seconds. **Climb down** brings you all back in about 4.
  - Climbers are drawn head up on the bark, and nothing else (duels, bugs, orders) moves them while they're up.
- **Only ants at her nest** (the top 40 px) can bite her; ants below can't reach.
- **Hornets dive** at a climber every 2.5 seconds (1.6 when she rages), and one streaks down to it. Above 120 px it's stung and knocked off the bark to the foot; lower down it's just stung. You can be knocked off too.
- **Hunting wasps** come for the ground below, one every 30 seconds (four at most).
- **Raging:** every 12 seconds a swarm sweeps the upper trunk, 2 to everyone above halfway, unless a dozen hold the top together.
- **Beaten:**
  - everyone comes down;
  - **the comb: hornet larvae, 3 meat a minute for good** (the plan's late answer to the meat ceiling);
  - two glowrock.

## Nov 4: the wilds, step 4: the Cordyceps Colony (build 56)

Mark: "Do it." The third wild boss: a dead ant colony the fungus has taken, at the inner edge of the hedge on the east side (the fifth hedge region). It needs a muster of **four** colonies.

- **The heart:** a great pale fungal stalk on a grey mound, 2,800 health. It doesn't move; it pulses faster when it rages.
- **Waves:** every 20 seconds (14 when it rages), 8 infected ants (12) pour out round it. They hunt your nearest ants, bite (1.5), and three bites in ten carry spores. They rot away after two minutes. They're a new kind of creature: drawn as grey-green twitching ants with a pale stalk, bitten by your fighters like any bug.
- **Spore clouds:** a ring on a crowd, and a burst 1.2 seconds later. Every ant of yours in it is spored; you take a hit instead.
- **Spored ants** go grey. In 25 seconds they die and **rise as one of the infected**, unless a medic out in the yard comes within 4 tiles, or they get inside a nest (the nurses). So medics matter in this fight.
- **The shield:** while six or more infected are within 8 tiles of the heart, bites on it do 30%. Its status says how many shield it; cut them down, then strike.
- **Beaten:**
  - the spore heart: your colony is immune to the fungus for good (no Cordyceps outbreaks, no spores);
  - every infected rots on the spot; the east edge quiets;
  - two glowrock.

## Nov 4: the wilds, step 3: Old Black (build 55)

The second wild boss, roosting in the side yard on the west edge. Like the Duke he wakes only for a muster of three colonies at his roost.

- **2,200 health.** The Old Robin's model, a third bigger and black.
- **Aloft** he circles his roost, out of reach of bites:
  - **snatches:** an orange ring on an ant, then he carries it off; it's lost in 5 seconds unless he's brought down first;
  - **steals glowrock** from your stores, one every 90 seconds while he's up. He gives it all back when he falls.
- **The lure:** a **bottle cap** lies by his roost (and comes back a minute after it's gone). Lift it with a crew of four and carry it within 12 tiles of him, and down he comes for it: 10 seconds on the ground (7 when enraged), and he drops any ant he holds. Then 8 seconds before the cap works again.
- **On the ground** he pecks (a red dot), beats his wings at a crowd of eight, and hops, like the Old Robin. **Twenty ants on him keep him down.**
- **Beaten:**
  - his feather: the Bramble Lot is yours, so no birds strike anywhere on the west side, and your outposts there can't be knocked flat;
  - the west edge quiets;
  - two glowrock, plus what he stole.
- **Also:** the duel test "a fight on the ground" runs on a fixed seed now.

## Nov 4: the wilds, step 2: the Duke (build 54)

Mark: "keep going." The first wild boss, in the Ditch (the drain, on the south row).

- **He wakes only for a muster.** At least three colonies in it, called within 30 tiles of his lair. A crew alone can't wake him, and its bites do nothing; his status says so, and his first sighting explains how to rouse him.
- **2,600 health** (Old Warty has 750), half again Old Warty's size on screen, mud-green.
- **The gulp:** an orange ring, then up to six ants swallowed whole. Bite him for 150 within 5 seconds and he retches them up alive; otherwise they're lost. You in the ring take a hard hit instead.
- **The tongue:** a long lane (14 tiles) that hurts everything in it and drags it toward him.
- **The dive:** every 14 seconds (9 when furious) he sinks out of reach; a ring shows where he'll surface, with a splash that hurts and throws ants. **Thirty ants on him pin him: no dive.**
- **Beaten:**
  - his croak: the Ditch is yours, so water never runs short and builders mend cave-ins four times as fast;
  - the south edge quiets (its hazards back to normal);
  - **two glowrock** (he was glow-fed).
- **Also:** the "a room only builds with a builder inside it" test runs on a fixed random seed now (it was flaky).

## Nov 4: the wilds, step 1: the edges stir; musters and standing orders (build 53)

Mark: "step 1" of `WILDS.md`.

- **The wild ring:** the yard's 21 outermost regions on the three sides farthest from the house (the west column below the trash cans, the east column, the south row).
- **The stir.** When the third daughter is joined, a banner: "Something stirs at the yard's edges." From then on, until that side's wild boss falls (steps 2 to 6):
  - scent fades four times as fast there (outposts still hold trails);
  - hazards there strike half again as often;
  - two open **green seams** a side: cracks that pulse green with a haze over them, shown on the map too. They burn any ant standing on them (¼ health a second; "burned by the glow").
  - On the map the wild ring is tinted, a region card says it's wild, and a 🌑 chip sits in the top bar.
- **Standing orders.** Each colony has one, set in the 🏕 sheet: **Ready** (all its fighters answer a muster), **Guard** (half; the default), **Gather** (none, and a daughter on Gather lays only foragers). The War Camp starts Ready.
- **Musters.**
  - Tap a spot on the map, then "Call N fighters". Needs a daughter joined; one muster at a time.
  - Each colony sends its share. A far daughter's soldiers come out of her door as real ants.
  - They march there on their own and hold the spot like a held crew. Walk up and call your crew to you, and they follow.
  - A ⚑ chip shows how many have arrived. "Send them home" disbands them, and a daughter's ants fold back into her numbers when they reach her door.
- **Not yet:** the wild bosses themselves (steps 2–6), and their rule that they only wake for a muster of enough colonies.

## Nov 4: the wilds, agreed in outline (design, not built)

Mark, on `WILDS.md`: "All good but the drum. The ore was already underground. Maybe this is another thing affected, and when we beat it, it prompts the house takeover, and the evolution prompting the second takeover, Phase 2."

Then: "This is still in the fence, but it's the farthest edges before hitting the fences… the furthest regions in the same square space, the 3 farthest sides from the house."

**What stands:**
- The wilds are the yard's own outer ring (west column, east column, south row), inside the fence. No new ground; the edges "stir" and turn wild once you have three colonies. The yard's guardians there stay as Phase 1.
- Four wild zones and bosses: the Ditch (the Duke), the Bramble Lot (Old Black), the Hollow (the Cordyceps Colony), and the Oak's climbable Crown (the Hornet Queen).
- Musters and standing orders as the macro layer.

**The change:**
- **No drum.** The glow was always underground; past the fence its seams break the surface.
- **The final wild zone is the Sinkhole,** with **Old Blind**, a mole the glow has changed.
- **Beating Old Blind** offers **the Takeover** evolution, which opens the house's back door and Phase 2.
- **The 13-guardian ending** becomes "the yard is yours"; the door now opens after Old Blind.

## Nov 4: glowrock, the great evolutions' rare ingredient (build 52)

Mark: the great evolutions should need "some really costly rare ingredient… maybe some of that suspicious green rock", taking "20 to 30 minutes" to dig out.

- **Glowrock 🟢.** A new resource; its chip shows once you have some. The first piece found shows a banner tying it to the lore ("Is this why we grow?").
- **Where it comes from:**
  - **The 11 glowing rocks in the bedrock** (they were scenery since build 45). Ordering one dug says it takes about 25 minutes, and it does: builders chip at most one unit of work a second, however many there are (20 minutes with the Quarry joined). A 🟢 % label shows how far it's come. Each gives one, and they're gone for good.
  - **The 9th, 10th and 11th guardians** each leave one (a save already past them gets them on load).
  - **The Quarry's deep seam:** one every 20 minutes once her Cutting hall stands. The only steady source.
- **What it costs:** 1 for the five root great evolutions, 2 for the six after them, 5 for the Supercolony; 22 in all against 14 found plus the Quarry. So you choose your path, and the Quarry matters.
- **Left out for now:** stored glowrock being dangerous; it can come with the wilds.
- **Also:** the robin test, flaky about 1 run in 20, now runs on a fixed random seed.

## Nov 3: the great evolutions (build 51)

Mark: "do great evos." The twelve names reserved in the tree since build 24 are now real, on a sixth Evolve page. The table is in SUPERCOLONY.md; Mark can veto any.

- **What they need:** each needs the named daughters' **specialty** (second) room, as the plan of record says ("great evolutions need the daughter's specialisations"). Swarm Day needs the Royal chamber and two daughters joined; the Supercolony needs all five, and Swarm Day before it.
- **The tree:** five roots (Titan Line, Army of the March, the Great Mound, Fungus Empire, Swarm Day), the pacts after them. Each node shows the icons of the daughters it still waits on.
- **Cost:** 12–30 genes plus resources, the most expensive nodes in the game.
- **Deliberately modest where it touches the economy:**
  - Blue Butterfly gives 2 meat a minute, a little help with the meat ceiling, not a fix.
  - The Supercolony's 100-a-daughter cap means up to 650 ants. Far daughters are numbers, so the cost is food, not frames.
- **The way into the wilds** is promised by the Supercolony's banner; it comes with the outer wasteland build.

## Nov 3: her nest, her rooms, travel by tunnel; the tree's top nodes gated (build 50)

Mark: "Do it" (the next daughter build in SUPERCOLONY.md).

- **Her nest.** Pre-dug for her, with a shaft, her queen's chamber, a hatchery and two empty chambers. It's drawn by the same nest view, given her nest, queen and eggs in place of yours. Her ants rest in her chambers, and inside her nest they're real ants.
- **Getting there.**
  - Walk to her door and go in.
  - Or travel by tunnel from inside any nest: tap 🏕 in the top bar, pick her, and get about a second of dark rings (the loading moment) before you're in her nest.
  - Leave by her door, or travel home the same way.
- **Her two rooms.**
  - Built from your stores while you're inside her nest: her seat first, then her specialty (table in SUPERCOLONY.md).
  - They borrow the look of the main nest's nearest kin room, for now.
- **The tree's top nodes** (17 of them, the plan of record's list) need the right daughter's seat. They show her icon in the tree. The Fungus garden's level III needs the Garden's Greenhouse. **Nodes a save already owns stay owned.**
- **Fixed on the way:** a daughter's real ants resting inside used to be drawn at the main nest's shaft. The main nest now shows only its own ants.
- **Not yet:** walking about inside her nest (you look round from her shaft), and the great evolutions that need several daughters.

## Nov 3: the other four daughters (build 49)

Mark: "build the rest of the daughter types." From the plan of record (SUPERCOLONY.md), each is now foundable, lays her role's ants, and gives the main nest a gift once joined:

- **Brood Hall** 🥚: the big castes (30% majors, 10% supermajors, when evolved), nurses, foragers. Your queen's eggs hatch 20% faster.
- **Watch** 👁: mostly scouts. Maps the ground 2½ regions round her, outposts reach a quarter further, and when raiders set off every fighter at home turns out (the message says so).
- **Quarry** ⛏: builders and foragers. A stone a minute per 4 of her ants; your builders dig and mend 25% faster.
- **Garden** 🌿: nearly all foragers. A sugar a minute per 5 of her ants; your fungus gardens grow 25% faster.

**Why gifts by headcount:** stone and sugar come from her ants near or far alike, so the game doesn't change with where you stand (the build 47 rule).

**Also:** a caste that needs meat hatches as a forager when the larder's empty; a daughter's builders and nurses stay in her chambers instead of foraging; the map card says what each one does.

**Not yet:** her own nest view with the loading animation, her special rooms, and the tree's top nodes gated to her (the next daughter build).

## Nov 3: the Egg larder, meat you can build (build 48)

Mark: "add a meat type of room. I like the tension of scarcity, but players need to be able to build sustainability to a certain extent."

**Trophic eggs** (Nest branch, after Hatchery II; 4 genes and 60 food, half the genes with the deed "have 10 fighters at once") unlocks the **Egg larder**. Real ants do this: many species lay trophic eggs, food eggs that never hatch.

- **What it does:** turns food into meat, 2 a minute at level I for 3 food each; 3 at II for 2.5; 4 at III for 2. Each extra larder adds half again (two at III: 6 a minute; five: 12).
- **Its limits:** it runs only while the food store is over a quarter full, so it never starves the colony, and stops at 150 meat.
- **No ant to train:** the queen lays the eggs. Room cost 40 food, 15 water; level II 80 food, 20 sugar; level III 150 food, 40 sugar, 15 wood.
- When soldiers starve, the message now says to hunt or build an Egg larder.

**How far it goes** (the 95% colony, 60 game-minutes, two seeds):

| | Main nest at min 60 | Deaths for want of meat, min 31–60 |
|---|---|---|
| No larder, five daughters | 74–87 | 87–101 |
| Three larders at III (8 a minute, 16 food a minute) | 100 | 49–54 |
| Five larders at III (12 a minute, 24 food a minute) | 86–100 | 21–78 |

Enough to keep the main army; not enough for every army at once. The Brood Hall's big castes and the War Camp still have to be paid for with hunting.

## Nov 3: far daughters lose ants too; the supercolony re-run with roles (build 47.3)

Mark: far daughters get "a steady death rate, conservative but not immune."

- **Measured near the War Camp (after the wasp fix):** 0, 2 and 7 deaths in 30 minutes across three seeds, about 0.1 a minute for 50 ants.
- **Far away, half that:** one ant per 1,000 ant-minutes (a full camp loses one every 20 minutes, all five about one every 4). Logged as "lost far afield".

**The re-run, each daughter in its planned role** (approximate: only the War Camp is built; the other four as numbers with role mixes from SUPERCOLONY.md: the Brood Hall's big castes, the Watch's scouts, the Quarry's builders, the Garden's foragers):

- **Food is fine.** 350 ants net +10 to +60 a minute at first, +130 to +240 later, the store full all hour.
- **Meat is the ceiling.** Every run, 3 seeds, home or five daughters: protein is gone by minute 20–40, then fighters die for want of it until about 15 are left of 59 to 85. The daughters re-lay foragers, so their soldiers and big castes don't come back.
- **There is no meat room.** Protein only comes from bugs and scraps foragers find, hunts, grubs in the nest and bosses: about 11–14 a minute at this size.

What to do about meat is Mark's call.

## Nov 3: the late-game supercolony, checked (build 47.2)

Mark: "simulate a full-blown 95% supercolony: what it consumes, is it maintainable or achievable; the math and realism first." Two passes: a ledger from the code, then a live simulation (100 main ants, every room at level III, 58 of 61 evolutions, the War Camp at 50, 60 game-minutes, 3 seeds, all threats on; and a five-daughter approximation, the four unbuilt ones on War Camp rules).

**Found:** protein runs out first (25–40 min: 59 fighters eat about 22 a minute against 11–14 coming in), then food slides 20–50 a minute once the near ground is picked over. Main nest alone: about +50 food a minute. With the War Camp: about break-even. Five War-Camp-style daughters: a full store lasts about 25 minutes. The sim runs at 2–4% of a core with 150 real ants. Getting there takes a human an estimated 4–6 hours (the tree is 274 genes).

Balance is Mark's call; none of that changed. **Fixed (far vs near again):**

1. Long-lived now cuts a far daughter's upkeep too (it ate a third more than the same ants near).
2. A daughter's eggs get the same discounts as the main nest's (Brood, Wet nurse, Broodmother).
3. With no protein, a fighter dies from anywhere, near or far, by their numbers (the main army used to die first, though the War Camp eats most of it). It's logged as "for want of meat", not "starved", so the deaths list no longer says starved with a full store.

## Nov 3: the stress run (build 47)

Mark: "put it to the wringer." Bots, a fuzzer and a numbers pass ran the game hard: 30 fuzz runs (10.7 simulated hours, 7,610 random actions, 524 save round-trips), UI abuse in the browser (no errors), a 90-minute bot playthrough, and duel, raid and progression tables.

**Fixed:**

1. **A tunnel cut in two was never mended.** Builders only tried the first dug cell beside a cave-in or fill, so a split nest stayed split. They now try every side, and one walled in on the far side digs its own way out.
2. **Early cave-ins froze.** Repairs only ran after minute 4. They now run from the start.
3. **No cave-ins before the colony can mend them.** A colony with no Builder and under 12 ants isn't caved in by rain or wear. (Before, the queen's deep entrance could collapse at the first rain with nobody to dig it out.)
4. **Ants leaving the nest kept their old spot.** A comment swallowed the line that put them at the door.
5. **Store over the cap.** When outposts are lost and the cap shrinks, the store shrinks with it. Cancelled builds refund no water past the cap.
6. **Taking over a daughter's veteran** now steps you out of her door, and the ant becomes yours.
7. **A walled-in ant heading out** waits for the builders instead of freezing.
8. **An ant past its range** with every way out further still heads home after 10 seconds instead of standing frozen.
9. **Far-off daughters' ants starve too** when the store has been empty a while, as near ones do.
10. **The flight notice is saved** (it repeated after a load).
11. **The hunting wasp** now eats after a kill and is sated for 90 s, like every other hunter. It ate nothing before, and killed 5–20× more. It eats on the ground, where it can be bitten.
12. **The Antlion Queen could not be killed.** Biters had to stand on the sliding sand, which dragged them to the bottom. She can now be bitten from the rim once she surfaces.
13. **A daughter far away now counts the same as near.** Her soldiers eat protein (½ a minute each, as real ones do; none before), and her foragers bring in 2.5 food a minute each (was 1.5; real ones measured 2–3). Measured: War Camp of 50, far 42.5 food a minute, near 35–44; protein 16.5 a minute either way.

Mark: balance changes are his call, unless one is absolutely necessary. This one isn't tuning: the game shouldn't change with where you stand.

**Found, not changed (for Mark):** guardian fights won by raw numbers; majors making raids trivial; every run starving by minute 40; the War Camp's 45–60 food a minute; flights at about 30, 45, 55 and 70 minutes, the 5th past 2 hours. See the build-47 report.

## Nov 3: the nuptial flight and the first daughter, the War Camp (build 46)

Mark: daughter queens "add ants", laying their own eggs fed from the main nest. Flights come after the 3rd, 5th, 7th, 9th and 11th guardian: "that's perfect."

**How it plays:**

1. **A winged queen is ready.** It needs the Royal chamber (Nest branch), and comes with the 3rd, 5th, 7th, 9th and 11th zone taken. A banner says so.
   - At 3 guardians with no Royal chamber, a card says what's missing.
2. **Open the map and tap a finished outpost.** Its card lists the five daughters:
   - **War Camp** is available;
   - Brood Hall, Watch, Quarry and Garden are shown as "comes in a later build";
   - a daughter needs an outpost **two regions (160 tiles) from home and from every other daughter**, and there's one of each kind.
3. **"The nuptial flight"** banner. After 10 seconds: **"She has landed".** Her mound and flag appear by the cairn.
4. **The tunnel:**
   - It's dug from the main nest, slowly: 4.5 work per tile of distance, about 6–9 minutes. It goes faster with up to six builders at home.
   - It eats ¼ food a second while it digs, and stops (and says so) if the store is empty.
   - On the map, a faint dashed line runs to her, and fills in solid gold as the tunnel comes.
5. **"War Camp is joined":**
   - She lays her own eggs every 30 s, up to **50 ants**, paid from your main stores.
   - About two thirds are soldiers (Seasoned, the War Camp's gift), the rest foragers.
   - Her ants don't count against the main queen's 100.
   - The map pin and the top-bar chip 🏕 show her count.

**Her ants:**
- They call her door home. They rest in her chambers, patrol and forage around her, and bring food back to her door into the shared stores.
- **Far away, she's numbers:** ants by kind, plus her foragers' food as a rate (1½ a minute each), and their eating from the main store.
  - She turns into real ants when your ant comes within 1½ regions, and back into numbers beyond 1.8. That's always while you're at home, since she's at least two regions away.
  - Crews following you stay real.

**Saves:** daughters, and each ant's home, are saved. Saves are now **v14**.

**Not yet (next builds):**
- her own nest view and special rooms;
- the tree's daughter-only top nodes;
- the other four daughters;
- raids on daughters and defending them;
- War Camp fighters marching to your fights;
- the great evolutions.

**Tests:**
- `tests/daughters.test.js`: flight timing; where she may land; flight → landing → tunnel → her eggs; numbers ⇄ real ants; saves.
- 202 tests in all, and the end-to-end browser test passes.
- Bots grow as before. They never beat guardians, so they never fly a queen. The bot founds a War Camp when it can.

## Nov 3: faster, with nothing changed (build 45)

Mark: speed first, but "what does that mean for ants within my area, in my nest, or within my range of view?" Plus his lore: "at the very, very bottom, you find slightly green glowing rocks… some kind of radioactive material… that's what's prompting the growth of these ants."

**The rule:** speed work may not change what you see. This build goes further: it changes **nothing at all.**

**What was slow,** from a profile of 200 ants:
- Every forager re-scanned every item in the yard each time it reached a tile, to find the nearest food. This alone was 18% of all the time.
- Neighbour checks built text keys every tick, which made a lot of garbage collection.
- Every creature measured its distance to every ant.

**The fixes, all exact:**
- **Items sit in a grid of 8-tile cells,** so a forager looks only at the cells around it. Ties go to the same item as before.
- **The neighbour lookups use number keys,** with a guard so they don't wrap round the edge of the yard.
- **Creatures skip ants that are clearly out of reach** before doing the real distance sums.
- **A forager's shopping list is worked out only for foragers,** at the same moment as before.

**Proof:**
- The old and new sim ran side by side with the same seeded randomness: three colonies, each with and without 120 extra ants, four minutes each, compared every minute. The game state came out **byte-identical** every time.
- **New tests** in `tests/speed.test.js` compare the quick lookups against full scans across a busy colony.

**Timings, per tick (20 ticks a second):**

| Your ants | Before | After |
|---|---|---|
| 54 | 1.7 ms | 1.1 ms |
| 111 | 2.7–3.5 ms | 1.5 ms |
| 191 | 4.6 ms | 2.0 ms |
| 290 | 6.0–7.1 ms | 2.2–2.4 ms |

That's about 3× faster with many ants.

**Not done, on purpose:**
- **"Idle ants sleep":** this turned out to be there already. Ants resting in the nest skip almost all their work.
- **"Spread decisions":** this would change behaviour, and with this headroom it isn't needed now. It's held for the daughter colonies, if measuring them says so.

**The green glow (lore):**
- Eleven rocks in the bedrock carry a faint green glow, barely lifted from the stone, that pulses slowly.
- The first block your builders dig in the bedrock brings a quiet line, not a banner: *"The rock down here is warm, and it glows a faint green. Is this why we grow?"*
- After that, the rocks glow brighter.
- It's a seed for Mark's "radioactive" Phase 2.

**Tests:** 197 in all, and the end-to-end browser test passes.

## Nov 3: daughter colonies, decided (plan only)

Mark's calls:
- Daughters are **support colonies with a role, not second capitals.**
- Some of the tree's top nodes can be built **only in the right daughter**, and the big things only **once a tunnel connects it**.
- **One of each kind, five in all:**
  - Brood Hall (Bodies);
  - War Camp (Society);
  - Watch (Senses);
  - Quarry (Nest);
  - Garden (Symbiosis).
- **Founding:**
  - at an outpost;
  - far enough away that the walk there hides the loading;
  - far daughters run as numbers, not ants;
  - idle ants sleep;
  - the thinking is spread over ticks.

Research behind it: how Dwarf Fortress, Oxygen Not Included, Factorio, RimWorld, Stellaris, Anno 1800, Frostpunk 2, SimAnt and Empires of the Undergrowth handle many bases and many agents.

The full plan, the node-by-node gating and the build order are in `SUPERCOLONY.md`. **Assumed, for Mark to confirm:** losing the main queen is still game over unless the Eternal line trait.

## Nov 3: Town Hall is the look (build 44.2)

Mark: "Let's do town hall."

**Town Hall is the default for everyone,** after Animal Crossing's notice board:
- cream cards with a thick leafy-green stripe;
- green leaf buttons with white rims;
- a sunny yellow main button;
- M PLUS Rounded lettering.

**Saved options:** a saved setting only keeps another theme if the player picked it under Options → Look themselves. Anyone who only had the old default saved gets Town Hall. The other seven and Classic stay there to choose from.

**Checked under Town Hall:**
- the yard and nest HUD, the egg and Build sheets, Help, Jobs, the map, banners, and phone width;
- 194 unit tests and the end-to-end browser test pass.

**Fixed along the way:**
- **Ability slots:** they take the theme's tiles. On phones they had sat on top of the button dock, in every theme including Classic; they now sit in a row above it, and the "Saved ✓" badge moved up out of their way.
- **Banners:** themes recolour only the friendly ones. The orange raid banner keeps its warning colours.

## Nov 3: themes after four games (build 44.1)

Mark: "Think more Stardew Valley, Animal Crossing, Graveyard Keeper, Planet Zoo."

**The ten generic themes are replaced by eight, two after each game.** They take the game's feel (materials, shapes, lettering), not its art.

| Theme | After | Idea |
|---|---|---|
| Homestead | Stardew Valley | orange parchment in a double dark-wood frame, pixel lettering (Pixelify Sans), plank buttons, a green OK button |
| Cellar | Stardew Valley | the same woodwork in dark oak and lantern gold |
| Island Phone | Animal Crossing | cream, very round, a faint dotted paper, speech-bubble hints, mint (M PLUS Rounded 1c) |
| Town Hall | Animal Crossing | leafy notice board: a green stripe on every card, leaf buttons, a sunny yellow main button |
| Lantern & Ledger | Graveyard Keeper | stained parchment with darkened edges, ink frames, letterpress type (IM Fell English), iron and brass buttons, a wax-seal red |
| Crypt | Graveyard Keeper | cold stone panels and candle-gold lettering |
| Field Station | Planet Zoo | clean white management panels, a green header stripe, uppercase section titles (Nunito Sans) |
| Keeper Tablet | Planet Zoo | the same on slate-blue panels with teal |

**How it was done and checked:**
- The shared theme layer gained two hooks: a heading font for card titles, and an optional coloured stripe across the top of cards.
- The same paused-colony screenshots were taken for each theme.
- One fix: Island Phone fell back to another font because only the bold weights of its rounded face were loaded. The regular weight is now loaded too, and both Animal Crossing themes are a little bolder.
- **The gallery:** https://claude.ai/artifact/8ywmVRqY98WFpS9BKP3Xte (same link as before).

Classic stays the default until Mark picks one.

## Nov 3: ten UI themes to choose from (build 44)

Mark: "Let's work on creating a new UI theme. Can you provide me some options? Let's make like 10 different options. Something ant themed or nature themed, round themed... Do a few tests and create some options."

**What's built:**
- **Ten themes, all playable now** under Menu → Options → Look. Classic (today's look) stays the default until Mark picks one.
- **How they work:** `src/ui/themes.css`. A shared layer restyles the top bar, the hint and tip cards, the health and hunger bars, the round buttons and their curved names, the sheets and their tiles, and banners. Each theme only sets variables (paper, ink, accent, border, radius, shadow, button fill and shape, a background pattern, font) plus a few extras of its own.
- **Unchanged in every theme:** the 3D yard and nest, the title screen and the Evolve window. Banners keep the game's Bungee lettering.
- **Fonts:** Fredoka, Baloo 2, Nunito and Patrick Hand from Google Fonts, with system fallbacks.

| Theme | Idea |
|---|---|
| Leaf Litter | parchment with leaf veins, leaf-green, soft round letters |
| Honeypot | amber honeycomb cards, glossy honey-drop buttons |
| Clay Mound | terracotta, chunky outlines, claymation offset shadow |
| Mossy Pebble | stone-grey cards, moss edges, pebble-shaped buttons |
| Dewdrop | frosted glass, water-drop buttons |
| Beetle Shell | dark iridescent chitin, gold lettering (the dark one) |
| Field Journal | ruled notebook paper, red pencil, hand lettering |
| Meadow | sky blue and sunflower, bold cartoon outlines |
| Firefly Night | night blue, glowing yellow-green |
| Toadstool | cream stems, red spotted caps |

**How they were tested:**
- Every theme was screenshotted in the real game on the same paused 90-minute colony, with the same hint and tip card, then the egg sheet in the nest. All four fonts loaded.
- Two fixes came from it:
  - Toadstool's spots sat on top of the button icons, so they moved to the rim.
  - A tip card had been caught mid-fade, so the waits were lengthened.
- **The gallery of all ten against Classic:** https://claude.ai/artifact/8ywmVRqY98WFpS9BKP3Xte

## Nov 3: night, quieter (build 43.1)

Mark: "The nightfalls should only show up once or twice. Maybe the first two or three times and then no more. The notification also, make it more vague. Don't give away the people or the bosses."

- **The "Night falls" and "Dawn" banners show for the first three nights only.** After that, the top-bar clock is enough.
- **No spoilers.**
  - The night banner now reads "The yard changes in the dark. Some things sleep. Others wake."
  - The first-night tip, the Help page and the clock's tooltip no longer list who sleeps and who hunts.
  - The player finds out by playing. The full list stays in the build 43 entry below.
- **Tests:** one more test checks for three banners in five nights, with nothing named.

## Nov 3: day and night (build 43)

Mark: "For sure day and night, which gives us a schedule. Just a day night, a day cycle and a night cycle. Gives us more room to play with concepts." He asked for it as its own build, after the nest expansion.

**The clock:**
- A day lasts 10 minutes: a short dawn, about 6 minutes of day, dusk, then nearly 3 minutes of night.
- A new colony starts in the morning.
- A chip in the top bar shows ☀️, 🌅 or 🌙 and how long until the light turns.
- A banner marks each change, "Night falls" and "Dawn", and a tip explains night the first time.
- Surviving your first night pays +1 🧬.
- The clock is saved; older saves pick it up from their game time.

**What night changes.** Most of it follows real habits:
- **People and birds are in bed:** no feet, bird strikes or bug spray.
- **No mower.** It also waits a minute or two after dawn: the heavy dawn dew draws ants onto the lawn, and an early mower there killed far more ants.
- **Rivals don't send raids at night.**
- **Night hunters come out:**
  - the wolf spider moves 20% faster;
  - toads strike almost twice as often;
  - assassin bugs reach 40% farther.
- **Day hunters sleep.** Jumping spiders, hunting wasps and skinks don't hunt, and one carrying an ant drops it when night falls.
- **The robin sleeps on its roost.**
  - Ants nearby don't wake it; only being bitten does.
  - While it's dark it can't fly.
  - Three ants pin it instead of six.
  - A night attack on the Old Robin is the clever play.
- **Dew never forms at night. Dawn brings a heavy dew,** twice the usual amount.

**The look:**
- The sky and fog shade from day blue through orange at dusk and dawn to deep night blue.
- The sun dims to a pale blue moonlight.
- A soft pool of light follows your ant so you can see where you're going.
- Fireflies blink over the grass.
- The scent-trail overlay dims with the light, so it doesn't glow at night.
- The sky above the nest cutaway darkens too; underground stays lamplit.
- Birdsong fades at night and crickets sing everywhere.

**Checks:**
- **Tests:** 6 new ones in `tests/daynight.test.js`, 193 in all. The end-to-end browser test passes.
- **Bots against an always-day copy:** the night rules aren't what slows colonies. Both versions stalled the same way because of the bot's own rule: it saved for a forager upgrade it couldn't pay for, waiting on stone that never came. The bot is fixed, and now reaches about 40 ants by minutes 10–15 on six seeds.

## Nov 2: the nest grows, a section at a time (build 42)

Mark: "Lets build all the progression that doesnt require anything that isnt build already, and implement the single nest internal expansion." The plan is `SUPERCOLONY.md`. Mark left section prices to me: "appropriately costly without being restrictive". The ant cap is 100 for now, and day/night is a separate build.

**The nest is twice as wide and deeper:**
- It's now 48 wide × 64 deep. Your colony starts in the open middle: the old 24 columns, down to the bottom of the clay.
- The brown ground either side, and two new bands below, are real but shut:
  - **deep rock** (12 rows): cool and wet; needs the queen at level 3;
  - **bedrock** (4 rows): no section to open, but each block takes about 15× the work of clay.

**Eleven sections, each opened with a break-in event.** You pay, then the builders inside (up to four) chew through the wall. The seam glows while they work. Then a banner, "Broke through!", says what was hidden behind it.

| Section | Price | Behind the wall |
|---|---|---|
| West / East Roots (topsoil) | 🌾40 🪨15 | an old mole tunnel, already dug / a seed cache (+60 🌾) |
| West / East Loam | 🌾70 🪨25 | a beetle grub (+30 🥩 +10 🪲) / root aphids (+1 🍯 a minute, for good) |
| West / East Hardpan (packed soil; needs a Workshop) | 🌾110 🪨40, 2 curios found | a buried trinket (+2 🧬) / a mole tunnel |
| West / East Clay (needs the queen at level 2) | 🌾140 🪨60 🍯15, 4 curios found | a water seep (+1 💧 every 20 s, for good) / a fat grub |
| The Deep: west, middle, east (needs the queen at level 3) | 🌾200 🪨80 🧬3, 6 curios found | a seep / root aphids / a buried trinket |

- **Curios are a requirement, not a payment.** You need that many found in the yard, and you keep them.
- **No price is above what the stores can hold for that depth:**
  - the clay costs 140, under one Food store's 150;
  - the Deep's 200 needs a second store or Store II, and the sheet says so.
- **The bedrock's three prizes:**
  - a fossil ant: +5 🧬, and every ant 10% tougher;
  - an underground spring: +3 💧 every 20 s;
  - a gold ring: +4 🧬.
  - A ✦ glints where each one lies.

**Ways to break in:**
- tap shut ground;
- Build → New ground.

Each section shows its name, price and lock on the map.

**Depth bands (rooms work better in the right place):**
- Hatchery or Nursery in warm topsoil: eggs hatch 10% faster each.
- Food store or Granary in dry packed soil or clay: holds 25% more.
- Cistern in cool clay or deep rock: holds 50% more.
- Fungus garden in cool clay or deep rock: grows 25% more.
- Tunnels in the deep never cave in.
- The Build sheet says where each room does best.

**The nest view now pans sideways too.** Drag left or right.

**Old saves (v12 and before) move into the middle of the bigger nest.** Every room, tunnel, order and ant shifts 12 columns right; the save is now **v13**. A build-41 campaign save was checked in the browser.

**A nest holds 100 ants.** Queen levels past that give their traits but no more room; the queen sheet says so. Daughter colonies will be the way past it.

**Cards at every limit, one each:** when the queen is at her cap, the food or water store is full, your tunnels reach the edge of your ground or the bottom of the clay, or 15 or more genes are waiting. Each says what gets you past it. A card shows once, and again only after that limit has eased for 3 minutes.

**Genes:**
- Evolve → Goals now shows "🧬 Genes found: X of about 430", with each source: scouting, held regions, curios, goals, guardians, buried finds.
- Filling the tree means taking the yard.
- Guardians and bosses now pay 6 🧬, up from 4, so the tree's top nodes come with boss wins.

**Checks:**
- **Tests:** 10 new ones in `tests/nest42.test.js`, 187 in all, including the old-save move checked cell by cell against the new layout. The end-to-end browser test passes.
- **Bots:** six 45-minute games. None collapsed, and most reached 40–60 ants. The bot now buys sections when it has food to spare, and no longer plans rooms on shut ground.
- **A 20-minute stress run** on a 90-minute colony opened 8 sections and saved and loaded every minute: no NaN, no ants lost on load. The Deep waited for more food cap, as it should.

## Nov 2: the second pass, and playing it (build 41)

Mark: "Do another pass and check it all again. Play the game and see how it feels."

**How it was checked:**
- A second read-only review re-tested every build-40 fix headlessly. All of them work.
- I played the opening in a real browser with clicks only: dig, Build nest, hatch, climb out, fetch food, lay eggs, dig, build.
- I loaded a bot's 45-minute colony into the browser and played on: recruit, attack, abilities, the map, Evolve, Jobs, the nest, and reloading the page.
- Bots: six 45-minute games before and after the changes, plus a 90-minute campaign, with save/load every 30–300 s.

**How it feels:**
- **The first minute is good.** You're out of the nest by about 45 s and the steps are clear.
- **Then the store fills after two berries, and nothing says so.** The store holds 20. Every crumb after that vanished, while the tutorial asked for 15 delivered, so a new player walked food home for nothing.
  - Now the tutorial step ends when the store is full.
  - A full store tells you, and says how to spend it.
- **The middle game lived on the edge of starving.** Food sat at 0–20 of 150 most of the time. When it hit 0, an ant died every 5 s: 14 of 15 died in about 90 s, and the colony never came back. Meanwhile 78–276 🥩 meat sat unused.
  - Out of food, the colony now eats its meat first.
  - Starving now kills one ant every 10 s, after 30 s (20 s with Big stomach), instead of every 5 s after 20 s.
  - When the store is below 15%, foragers drop their duty and bring food.
  - Gardeners keep cutting leaves first, since that becomes food anyway.
  - **Result, same six seeds:** before, one colony fell to just you for 25 minutes and none passed 32 ants. After, none collapsed, four reached 38–60 ants, and one won.
- **The hint line nagged the wrong way.** It said "Food in store, lay an egg" at 4 food with 26 ants to feed.
  - Now a low store says "Food is low: lead a crew to a treat, or walk a Trail out."
  - Your own hunger comes first.
  - "Lay an egg" waits until the store is 15% full.

**Bugs fixed (from the review):**
- **Ants walking out when the game saved got stuck at the top of the shaft for good.** Where they were heading wasn't saved, and stuck ants piled up with every load. It's saved now, and older saves repair themselves.
- **A guardian that died with an ant in its mouth or claws kept it 'away' forever.** This happened at the end of most toad and mantis fights. A dying guardian now lets go.
- **A wasp carrying an ant froze in mid-air** if no other ant was within about 50 tiles. It now flies on.
- **Cancelling a room queued in a pre-build-40 save refunded too much:** it was priced as the next copy. Fixed.
- **Opening the game in an older build no longer buries a newer save.** The unreadable save stays under `-bad`, and later failures never overwrite it. Once a build can read it again, it comes back, unless the colony saved over it has played longer.
- **Smaller ones:**
  - What each ant is doing inside is saved now.
  - "The rain caved in a tunnel" only shows when one did.
  - Your own infected ants no longer give food at the Midden or heal from nectar.
- **The flaky gardener test** was the test, not the game: a full garden rightly sends gardeners to other work.
- **Tests:** 5 new ones in `tests/audit.test.js`.

**Still open (in the backlog):**
- The economy stays tight through the middle game, with food often under 20% of the cap. It's playable now, not comfortable.
- A colony down to just you can only rebuild by your own foraging.

## Nov 2: the audit: rooms, evolutions, the nest, features, saving (build 40)

Mark: "make sure every room has a purpose every evolution has depth every part of the nest can be well used that every function and feature in the game works and works well and that we can save the game and load it with updates."

**How it was checked:**
- Three read-only reviews ran side by side, one each for rooms and the nest, the evolution tree, and save/load. Each traced every item to the code.
- The end-to-end browser test passed: intro, nest, building, crews, evolving, rebirth, outposts, creatures, events, bosses.
- A new save/load stress test (`tests/saveload.test.js`) covers a busy colony, a boss mid-fight, a raid in progress, hunters, and an older save with the newer fields stripped.
- Everything they found is fixed, except the few listed under "Left as is".

**Saving and loading:**
- **A save that fails to load is never lost.**
  - Before: the game quietly started a new colony and saved it over the old one within 10 s.
  - Now: the unreadable save is kept under its own key (`-bad`), and the backup from a minute earlier (`-prev`, refreshed every minute) is loaded if it works. A message says which happened.
- **Real versions:**
  - Saves were all "v11" from build 12 to 39. They're now **v12** with a `migrate()` step, so each future change steps old saves up.
  - Older saves (v10–11) load.
  - A save from a newer build is refused with a reason, rather than half-read or wiped.
- **Kept now:**
  - which rival colony is raiding you. Before, a save mid-raid by a later colony could leave raids stuck forever;
  - ability cooldowns (reloading used to reset them);
  - timed effects on ants: Frenzy, Play Dead, Exposed, Stunned, the Survivor perk, web stickiness, a raider's queen timer.
- **Ants a creature is holding stay held after a load:** in a toad's mouth, a mantis's claws or a wasp's legs. Only raiders inside a rival nest walk home, as before.
- **"Saved ✓" shows only when the save was really written.** The game now also saves when the tab is hidden, which matters on phones.

**Rooms and the nest:**
- **Food cap:** it's recalculated every second.
  - The **Honeypot vault's** repletes never raised it before.
  - The **Shared stores** cap at outposts never changed after an outpost was finished or lost.
- **Fill orders** can't land in a room, and building a room clears the fill orders on its ground. Before, they punched dirt holes into finished rooms.
- **Clear orders** now also cancels rooms still waiting to be built: all their cost back, or half once building has begun. Before, one badly placed room blocked every room queued behind it.
- **Infirmary:** every medic heals (it was capped at 3), so a second Infirmary and level II's extra medics matter. Level III no longer "saves" Cordyceps victims.
- **Midden:**
  - Undertakers now carry the dead to it: each of your ants that dies near the nest gives back 2 food.
  - Each undertaker makes Cordyceps spread less.
  - It used to do almost nothing.
- **Honeypot III's** famine reserve is filled from the store. It used to make food from nothing.
- **Removing the last copy of a room** resets its levels and refunds half of what they cost. Before, a rebuilt room got its levels free.
- **Room copies are capped at 5.** At queen level VIII the cap was 8, which can't fit the nest: all of them need 1,451 cells against 1,034.
- **Venom ants** need a Barracks like Soldiers. Eggs can only be queued when the menu would allow it.
- **Text:** the Workshop's and the Midden's descriptions say what they do.

**Evolutions, upgrades and traits:**
- **They did nothing before, and work now:**
  - **Foreman**: builders work 50% faster.
  - **Tunnel master**: no cave-ins, ever, from wear or rain.
  - **Builder level IV**: digs 2× faster.
  - **Mother of nations** now has a real effect: stolen pupae hatch two to one, as Veterans. Satellite queens don't exist yet.
- **Deeds:**
  - On a 1-gene node (Waypoints, Hatchery II, Store II), finishing the deed now halves the other costs. Halving 1 gene left it at 1, so the deed did nothing.
  - "Fill the store to 150" counts deliveries, so it can be done with one Food store.
  - "Kill 20 rival ants" counts every rival colony.
- **War camp loot and Brood raiding** work at any rival's nest, not just the Patio's.
- **Overlapping nodes now do something of their own**, in dice duels at your door:
  - Stridulation: +1 Attack while the alarm sounds.
  - Honour guard: +2 Defence.
  - Hive mind: +1 Attack during a raid on you.
  - Highways: your ant runs a quarter faster on a trail.
- **Shallow nodes deepened:**
  - Colony memory (the 12-gene capstone) hatches Veterans.
  - Honey economy lets 🍯 feed the colony when the store runs dry.
  - Flower nectar heals your ants in regions you hold.
- **Nest-family promotions** (Gentle, Healer) work for medics, ranchers and the other nest ants, not only nurses.
- **The Bullet line's** sting slows in duels too, and gives +1 Attack against anything slowed. It was the weakest of the three lines.
- **Text fixes:** Fertile (25%, as coded), Neurotoxin, Guardian, Big crop.

**Left as is (logged in the backlog):**
- Heat tolerance and Social stomach stay situational.
- The Granary and the Store both mainly raise the food cap.
- Surplus ranchers, medics and the like sit idle.
- Falls of feet and birds in progress aren't saved.
- Rooms' own levels (Build list) and the older Hatchery and Store levels (evolution tree) live in two places.

**Checks:**
- 172 tests, 13 new (`tests/saveload.test.js`, `tests/audit.test.js`).
- The end-to-end browser test passes.
- 45-minute bots: 3 of 4 reached 40 ants and 1 won, as usual.

## Nov 2: the zone map and the end of Phase 1 (build 39)

Mark: "Do the zone map."

**The 13 zones** (`ZONES` in `growth.js`): the yard's regions grouped under the guardian that rules each group.

| Zone | Guardian |
|---|---|
| The Patio | pavement ants' queen |
| The Trash | odorous ants' queen |
| The Flowerbed | the wolf spider |
| The Vegetable Garden | the hornworm |
| The Rock Garden | the ground beetle |
| The Playground | the antlion queen |
| The Oak | carpenter ants' queen |
| Fire Ant Country | fire ants' queen |
| The Great Lawn | the Old Robin |
| The Wet Edge | Old Warty |
| The Hedge Row | the mantis |
| The Side Yard | the black widow |
| The Rot | the giant centipede |

- A few regions belong to no zone and are free ground: under the Rock (home), the Woodpile, the bird feeders, the birdbath and the Picnic Blanket.
- Outlying regions with no guardian of their own, like the Spigot and the Back Steps, stay free to hold as before. A first try locked them behind their zone's guardian. That would have taken away the easy early outposts, and the outpost tests caught it.

**On the map:**
- **Outlines:** every zone is outlined, red while its guardian rules it and gold once taken. Unexplored zones are faint.
- **Crests:** a crest sits on the guardian's own region. It shows the guardian's sign while it lives, a gold ★ once taken, and a ? where you haven't been. Zoomed out, the zone names show under the crests.
- **The count:** "Zones taken: 3 of 13" in the map's header.
- **The card:** tapping a region now also says its zone and who rules it ("The Great Lawn: ruled by the Old Robin", or "★ taken"), or "Free ground".

**Taking a zone:** within a second of its guardian falling, a gold banner says "Zone taken: The Great Lawn, 5 of 13 zones. Open the map to see what's left."

**The end of Phase 1:** when all 13 are taken, Phase 1 is over (`s.phase1`, kept in saves).
- The camera pulls back over the yard and "The yard is yours" comes up.
- The 13 zone crests light one by one.
- **Your colony's record:** time, ants raised and alive, duels won, crits, raids led, queens killed, guardians beaten, Legends and regions held.
- Then: "Behind you, the back door of the house creaks open…". Phase 2, the house, is still to come.
- **Keep playing the yard** closes it.

**Checks:**
- 159 tests, 3 new (`tests/zones.test.js`): 13 zones made of real regions, none in two; a guardian falling takes its zone with the banner and count; and all 13 end Phase 1, kept in a save.
- A browser run showed the zone map zoomed out and in, with crests, outlines, the count and the ending screen. Two errors found on the way are fixed: two crests stacked on the Flowerbed, and a map helper used before it was defined.

## Nov 2: the hunting wasp and the skink (build 38)

Mark: "Go". These are the other two hunters, which completes the tier.

**Hunting wasp** (the lawn, picnic, feeders, birdbath, pool, sprinkler, fairy ring and the lawn's toys): 45 health.
- **In the air it can't be bitten.** It circles its home with a shadow below it.
- When it picks an ant, a ring settles on it (1 s). Then it **dives**: the ant is **carried off** and lost, unless the wasp is stunned first.
- A **Mandible Lock** on it, in the air or as it lifts away, makes it **drop the ant alive** and fall to the ground.
- Then it **lands to rest** (5–7 s). On the ground it can be bitten, and it stings back.
- It also lands now and then even with nothing to hunt. 20 protein.
- The model: yellow and black, a striped pointed abdomen with a sting on a thin waist, a yellow face, big eyes, and glassy wings that blur in flight. Poses: flying and resting.

**Skink**, a five-lined skink (the rock gardens, woodpile, fallen limb, gnomes, grill, oak roots): 150 health, the biggest hunter.
- **Dash:** a lane, then it races down it, biting all it passes.
- **Snap:** a small ring on an ant beside it.
- **Tail drop:** hurt to half, it drops its **wriggling blue tail** (40 protein) and **runs for 6 s**. If it gets away it's gone, and comes back later with a new tail. To kill it outright, stun it (Mandible Lock) or burst it down before it runs.
- 60 protein if you do.
- The model: glossy black with five cream stripes, a wedge head, four sprawling legs, and the bright blue tail young skinks have. Without its tail it shows a stump, and the dropped tail wriggles on the ground for 12 s.

**All four hunters, tuned on the bots:**
- **No hunters in the first 10 minutes**, so the opening stays safe. They turn up in their regions after that.
- **After a kill a hunter eats (8 s), then is sated for 90 s**, wandering without hunting. With 45 s, one jumping spider on a forager route still took 34 ants in a game.
- **Results:** hunter kills per 45-minute game fell to 0–8 in all. Two of 4 bots reached 40 ants, within the usual swing (one run starved).
- **Bug found and fixed:** at first no hunters appeared at all once the 10-minute delay was added. A region that woke before minute 10 never got its hunter. Hunters now come to awake regions whenever they're due.
- Mandible Lock now holds any small creature in place, as it does a boss.

**Checks:**
- 156 tests, 2 new: the wasp can't be bitten in the air, then dives, carries an ant off and drops it when locked; the skink drops its tail (40) when hurt to half, runs, and gets away.
- A browser run showed both models and their first-time tips, with no errors.

## Nov 2: hunters, the tier between bugs and bosses (build 37)

Mark: "Can we have more like the wolf spider? Not full bosses or guardians but larger threats than ants but not full huge fights."

**What a hunter is:**
- It's a real yard predator of ants that roams its home regions and hunts.
- It has one signature move, telegraphed on the ground like a boss's, and a small health bar. There's no banner, no phases and no zone to win.
- A crew of 5–10 beats one, and it drops good meat. It comes back to its region 4 minutes after it's killed.
- They're built on the small-creature system (`BUGS`, with `hunter: true` and a region list), so they spawn, respawn, take bites, show a card when hovered and can be crew-targeted like the earwig and the rest.

**The first two:**
- **Jumping spider** (the Patio, steps, porch, grill, cooler, stepping stones, gnomes, rock gardens): 60 health.
  - It **crouches** while a lane shows on the ground (0.5 s), then **leaps up to 5 tiles** onto an ant and bites what it lands on.
  - Next to an ant, it bites every second.
  - It rests after 3 leaps. 25 protein.
  - The model: chunky and fuzzy, black with a white band, two huge glossy front eyes, an orange-rimmed abdomen with white chevrons, and eight short thick legs. Poses: walking, crouched, and leaping.
- **Assassin bug** (the vegetable rows, flowerbed, clovers, dandelions, daisies): 80 health and slow.
  - It **stalks**, then a red dot shows on an ant (0.8 s), and its beak goes in: the ant is **impaled and drained**.
  - **Bite the bug for 15 and it lets go.** Otherwise the ant is lost in a few seconds.
  - 30 protein and 6 chitin.
  - The model: long and narrow, a slim head on a neck, a curved beak (folded, or stabbing), orange-barred edges and long legs.

**How they behave (tuned on the bots):**
- **They eat:** after a kill a hunter stops for 8 seconds, still, which is the time to swarm it.
- **They stay home:** a hunter only goes after ants within 12 tiles of where it lives, so it won't follow foragers back to the nest.
- **Crowds drive them off:** with 5 or more of your ants on it (6 for the assassin) it backs off toward home.
- **Why:** before this tuning, one jumping spider on a forager route killed 78 ants in a 45-minute bot run. After it, it killed 1 at most, and 3 of 4 bots reached 40 ants with 1 win, as usual.

**Also fixed:** a critter with no first-time tip written crashed the tip code in the browser. The two hunters have tips now, and a missing tip is simply skipped.

**Checks:**
- 154 tests, 4 new (`tests/hunters.test.js`): their regions and spawning; the jumping spider's lane, leap and bite; the assassin's impale, drain and letting go when bitten; and a crowd killing one for meat and chitin.
- A browser run showed both models, the assassin's red dot on an ant, and no errors after the fix.

**Next:** the hunting wasp (it swoops from the air and carries an ant off; kill it when it lands to rest) and the skink (a lizard: it dashes and snaps, and drops its tail as a distraction when hurt).

## Nov 2: the centipede reshaped (build 36.1)

Mark: "Centipede looks strange."

It read as a few round beads strung out with gaps, each with one pair of legs. Now it's a long flat chain, like a real centipede:
- **Plates:** two flat armour plates for each of its six segments, so 13 pieces with the head. They touch end to end, each with a bright band on its back edge.
- **Legs:** two pairs per plate, angled back. Four frames send a **wave** of steps running down the body.
- **Head:** a flatter head with longer antennae and curved venom claws.
- **Coiling** winds the longer body into a tighter spiral.

Nothing in the fight changed. A browser close-up checked the new look, walking and coiled.

## Nov 2: the giant centipede, guardian of the Rot (build 36)

Mark: "Go". This is the last guardian on the `COMBAT.md` list, with a new model. Every zone in the plan now has its guardian. (The yellowjacket nest was always optional.)

**The fight:**
- **Lair:** Deep in the Leaves. It rules the Rot: the Leaf Pile, Deep in the Leaves and the Compost Heap.
- **Six segments of 90 health each:**
  - Every 90 damage cuts the tail segment off. It drops as a chunk of meat (12 protein), and the message says "A segment breaks off! 5 left, and it's faster."
  - Each lost segment makes it 15% faster.
  - At two segments it goes **frantic** (phase 2): shorter wind-ups and quicker attacks.
- **Coil:** with 3 or more ants close, or one right by it, it coils and shows a ring, then lashes out (5 damage and a shove). **While coiled its joints are open: bites do double.** The bar says "COILED, JOINTS OPEN: BITE, THEN JUMP CLEAR!", so you have a choice: bite and get hurt, or dodge.
- **Rush:** a lane, then it races down it at speed, biting everything it passes. Bites while it rushes do 60%.

**What you get:**
- **The centipede's fang:** your Venom ants stun whatever they bite for 1 second.
- **The Rot eases:** no more toads in the leaves, and the Rot can be held.
- Plus 100 meat (on top of the segment chunks), 30 chitin, 4 genes and a Legend ("Centipede-cutter").

**The model** (`centipedeGeometry`):
- **Pieces:** a head with long antennae and curved venom claws; flat armoured segments with one pair of legs each; and a tail with long legs trailing back.
- **Movement:** the segments follow the path its head took, their legs ripple, and it curls round itself when it coils.
- **Colours:** the first try was brown and lost in the leaf litter. It's now dark-backed with bright orange legs and band, a red head, and a third bigger.

**Checks:**
- 150 tests, 5 new (`tests/centipede.test.js`): it rules the Rot; damage cuts segments (meat drops, frantic at two); coiled it takes double; it rushes down its lane biting; and beaten, Venom ants stun.
- A browser run showed segments breaking off, the coil ring and the bar lines, with no errors.

## Nov 2: the black widow, guardian of the Side Yard (build 35)

Mark: "Go". This is the fourth new guardian, with a new model.

**The fight:**
- **Lair:** her web in the corner by the shed's east wall. She rules the Side Yard (three regions) and the Shed.
- **The web:** silk 4½ tiles round. Any of your ants that walks in is **stuck for 3 seconds**, and then free for 5. That includes your own ant, which can't move while stuck. A white ring marks stuck ants.
- **Up in her web she's hard to reach:** bites do a third.
- **Weakness: the four anchors.** White knots at the web's edge, each with 30 health.
  - Your fighters, your crew and you bite through them. They can be targeted by hover, right-click or a hold order.
  - "An anchor snaps! 3 left."
  - When all four are cut, the web falls and **she drops to the floor for 12 seconds**: bites do double. The bar says "ON THE FLOOR: SWARM HER!"
  - Then she climbs back and spins a new web.
- **Bite:** a red dot on an ant (stuck ones first), then a deadly bite.
- **Phase 2 (half health):** every 13 seconds she drops on a thread (a ring shows where) and spins a fresh web there. Anchors you already cut stay cut.
- **Mandible Lock** works on her anywhere.

**What you get:**
- **The widow's silk:** a web at your door. Raiders stick in it for 3 seconds, once each.
- **The Side Yard eases:** no more bug spray in the Shed and Side Yard, and they can be held.
- Plus 60 meat, 20 chitin, 4 genes and a Legend ("Web-cutter").

**The model** (`widowGeometry`): glossy black, a big round abdomen with the red hourglass on top (so it reads from above), a small head with fangs, and eight long jointed legs. Poses: hanging, and biting with the front legs raised.

**The web:** silver lines from the middle to each anchor, three rings between, and loose threads where an anchor has been cut.

**Checks:**
- 145 tests, 6 new (`tests/widow.test.js`): she rules the Side Yard; the web holds ants; she's hard to hurt up high, and cutting all four anchors drops her (bites double) until she climbs back; her bite is shown first and kills; anchors can be targeted; and beaten, she gives the silk.
- Anchors are kept on open ground ants can reach, pulled in from a wall if need be.
- A browser run showed the web, her, the anchors and stuck ants, with no errors.

## Nov 2: the praying mantis, guardian of the Hedge Row (build 34)

This is the third new guardian from `COMBAT.md`, and the first with a new model.

**The fight:**
- **Lair:** at the Hedge Row's west edge (by the stones), facing the lawn. It rules all six hedge regions.
  - The first try put it deep in the hedge, where the leaves cover the whole screen. It now waits at the edge, still in the hedge and in sight.
- **Hidden:** until an ant comes within 6 tiles it's a faint shimmer (12% opacity). Its banner only comes up once it shows itself, and the message says "The hedge moves: a mantis was there all along!"
- **Strike:** it sways for 0.6 s (the tell, and the bar says "Swaying"), then snaps a lane 4.8 tiles long in front of it.
  - It grabs the first **two** ants in the lane. Anything else in the lane takes a cut.
  - Your own ant is hurt, not grabbed.
- **Eating (4 s):** the grabbed ants are in its claws.
  - Its claws are busy, so it can't strike, and **bites on it do double**. The bar says "EATING, CLAWS BUSY: BITE IT NOW!"
  - Bite it for 40 or more, or **Mandible Lock** it, and it drops them alive. Otherwise they're eaten.
- **Phase 2 (half health):** two strikes in a row, and fluttering 5-tile hops after you.

**What you get:**
- **The mantis's claw:** each of your fighters' first bite on a new foe always lands, as a double-damage crit.
- **The hedge:** it can be held, and your ants run through it half again faster.
- Plus 90 meat, 15 chitin, 4 genes and a Legend ("Mantis-breaker").

**The model** (`mantisGeometry` in `models/bosses.js`), built from simple shapes like the other bosses:
- a long green abdomen with folded wings over it;
- a tall raised neck, and a triangle head with bulging eyes and antennae;
- spiny raptorial forelegs and four thin walking legs.
- Three poses: forelegs folded as if praying, flung out to the ground to strike, and clutched to the jaws to eat.
- It rocks as it sways and turns to face its prey.

**Checks:**
- 139 tests, 5 new (`tests/mantis.test.js`): it rules the hedge; it stays hidden until an ant is close; a strike takes the first two in the lane and eats them if left alone; hard bites or a lock make it drop its meal alive; and beaten, it gives the claw (first bite is a crit).
- A browser run showed it hidden, then the strike, the eating and the close-up, with no errors.

## Nov 2: second levels for your ant's abilities (build 33)

Mark: "do the second levels, then the mantis."

Each ability gets a level II node in the evolution tree, right after the node that teaches it:

| Node (branch) | Cost | Level II |
|---|---|---|
| **Acid jets** (Bodies, after Formic spray) | 4 🧬 + 20 protein | 🧪 Formic Spray II: cloud 2½ → 3½ tiles wide, Exposed 6 → 9 s, cooldown 10 → 7 s |
| **War scent** (Senses, after Danger scent) | 4 🧬 | 📯 Alarm Call II: reaches 8 → 12 tiles, Frenzy 8 → 12 s, +2 → +3 Attack |
| **Iron grip** (Bodies, after Strong mandibles) | 4 🧬 + 15 protein | 🦷 Mandible Lock II: stun 2½ → 4 s (a boss 1½ → 2½ s), cooldown 16 → 11 s |
| **Death feint** (Bodies, after Playing dead) | 3 🧬 | 💀 Play Dead II: 3 → 5 s, heal 30 → 60%, and rival ants fighting you lose track of you |

**On the bar:** a level II ability has a gold rim and a small "II". Its tooltip gives the level II numbers, or names the node that gives them.

**Checks:** 134 tests, 1 new (level II numbers; a rival 3 tiles from the cloud's centre is caught only at level II; a +3 Frenzy; Death feint shaking off an attacker). "Pointing at a rival ant: the crew kills it" fails about 1 run in 5 inside the full suite and never alone. It's logged with the other known flaky tests.

## Nov 2: abilities are learned in the evolution tree (build 32.1)

Mark: "Maybe make those available through evolve tree."

Each ability now comes with the node that fits it, from real ant behaviour. This adds one new node and no clutter:

| Ability | Learned with | Branch, cost |
|---|---|---|
| 🦷 Mandible Lock | **Strong mandibles** | Bodies, 2 🧬 + 10 protein |
| 🧪 Formic Spray | **Formic spray** | Bodies (after Strong mandibles), 4 🧬 + 20 protein |
| 📯 Alarm Call | **Danger scent**: ants raise the alarm with a scent | Senses (after Strong scent), 2 🧬 |
| 💀 Play Dead | **Playing dead**, a new node. Ants caught by a predator often go limp and play dead (thanatosis). | Bodies, 2 🧬, no prerequisite |

- **In the tree:** each node's text now ends with the ability it teaches.
- **On the bar:** locked abilities stay in place, greyed out with a 🔒. Their tooltip and the message on a press name the node to evolve.
- **Help and the tutorial** say where each is learned.

**Checks:** 133 tests, 1 new (each ability is locked until its node is bought, and works after). A browser check showed the bar with three locked and Mandible Lock learned.

## Nov 2: your ant's abilities (build 32)

Mark: "The boss battles are basically rts and a kind of diablo esque. Maybe we need to give our main ant abilities the player can trigger that are based on him or the crowd or weakening the enemy like statuses."

**Four abilities, one of each kind Mark named.** They sit in a bar at the bottom left. Click them, or press 1–4. Each has a cooldown, shown as a dark sweep with the seconds left.

| | Ability | Kind | What it does | Cooldown |
|---|---|---|---|---|
| 1 | 🧪 **Formic Spray** | weakens the enemy | An acid cloud where the mouse points (up to 6 tiles away, 2½ wide). Everything in it is **Exposed** for 6 s: it takes half again damage and has −1 Defence in duels, and rival ants also take 1 straight away. | 10 s |
| 2 | 📯 **Alarm Call** | the crowd | Your crew and fighters within 8 tiles, and you, **Frenzy** for 8 s: +2 Attack in duels, bites 30% harder, 25% faster. | 24 s |
| 3 | 🦷 **Mandible Lock** | control | Grab the nearest enemy within 2½ tiles: **Stunned**. Ants, bugs and the spider are held for 2½ s and can't swing. A boss is held for 1½ s, and **the attack it was winding up is cancelled**: the answer to a telegraph you can't dodge. | 16 s |
| 4 | 💀 **Play Dead** | yourself | You flip on your back: for 3 s nothing hurts you and bosses look past you. You heal 30%. | 30 s |

**Statuses work on everything:** rival ants, zombies, bugs, the spider, the caterpillar and every boss.

**On screen:**
- Exposed things wear a yellow-green ring.
- Stunned things have stars circling over them.
- Frenzied ants wear a red ring.
- **Casts:** the spray is a drifting green cloud, the alarm call sends red rings outward, and the lock a white flash.
- Help has a line on them, and the tutorial has a step.

**Not yet:** abilities that unlock or upgrade over time (through your ant's upgrades or evolution), and more of them. These four are there from the start.

**Checks:**
- 132 tests, 5 new (`tests/abilities.test.js`): the spray exposes only what's in the cloud, then cools down; exposed means half again damage in a duel; the alarm call frenzies nearby crew (+30% bite); a lock on Old Warty cancels his wind-up and holds him still; and while playing dead nothing hurts or kills you, and you heal.
- A browser run used all three attack abilities on Old Warty with keys 1–3, with no errors. It showed the bar and cooldown numbers, Warty exposed and stunned (stars), and 9 frenzied ants. Big rings now draw as thin outlines, after a first try drew them as thick red bands.

## Nov 2: Old Warty, guardian of the Wet Edge (build 31)

Mark: "go". This is the second new guardian from `COMBAT.md`.

**The fight:**
- **Lair:** the Toad Hole. He rules the Wet Edge: the toad hole, thistles, reeds, slugs, drain, mud flats and wet edge. None of them can be held while he's there.
- **He only looks ahead:** he turns slowly to face what he hunts. Bites from behind his head do double.
- **Tongue:** a thin red lane, then the first ant in it is **swallowed**.
  - The ant disappears and his throat bulges. The bar says "AN ANT IS IN ITS MOUTH: BITE IT, NOW!"
  - Bite him for 18 or more within 3 seconds and he gags and spits it out alive. Otherwise it's lost.
  - Your own ant isn't swallowed: the tongue just hurts you.
- **Leap:** a ring where he'll land, then he arcs over and squashes what's under it.
- **Poison skin:** every ant biting him slowly loses health, unless a medic is within 5 tiles.
- **Phase 2 (half health):** two tongues in a row. Every 12 seconds he puffs up for 5 seconds, and bites do half.

**What you get:**
- **Old Warty's poison:** your ants taste bitter. Toads, birds and the spider spit out half the ants they catch.
- **The Wet Edge eases:** no more toads there, and it can be held.
- Plus 140 meat, 4 genes and a Legend ("Toad-sticker").

**On screen:**
- The strike toad's model at twice the size, olive.
- His tongue shoots to whatever it caught. He leaps in an arc and swells when puffed.
- His own banner (🐸) and bar lines.

**Also fixed:** constant biting kept the Old Robin and Old Warty solid red from the hit flash. Being bitten is now a soft flicker on both.

**Checks:**
- 127 tests, 5 new (`tests/toad.test.js`): he rules the Wet Edge; bites from behind are double and puffed-up bites half; the tongue takes the first ant in its lane, and left alone it's lost; a crew biting hard gets it spat out alive; and beaten, he gives the trophy and no toads come to the Wet Edge.
- A browser run showed the spit-out, the swallow, the puff and the bar lines, with no errors.

## Nov 2: the Old Robin, guardian of the Great Lawn (build 30)

This is the first new guardian from `COMBAT.md`. It answers Mark's "I don't know what the robin does yet": ordinary robins stay a hazard, and the Old Robin is the one that rules the lawn and can be driven off.

**The fight:**
- **Lair:** the Bare Patch, in the middle of the lawn. It rules all 16 Great Lawn regions, and none of them can be held while it's there.
- **Peck:** a small red dot at an ant, then a strike that kills.
- **Wing beat:** with 5 or more ants round it, a ring that knocks them back 2½ tiles.
- **Hop:** a 4-tile bound after the nearest ant.
- **Phase 2 (half health):** about every 9 seconds it takes off and circles its lair for 3 seconds, out of reach, with its shadow on the grass. Then it shows a lane and swoops down it, striking everything in the way, and lands.
- **Weakness: its feet.** With 6 or more of your ants biting it, it is **pinned**: no hops, no take-off, and every bite does double. The bar says "PINNED BY THE FEET: BITE NOW!" and it struggles with its wings half up.
- **Win:** you don't kill it. At 0 health it flies off for good, dropping the grubs it had (70 meat).

**What you get:**
- **The Old Robin's feather:** birds never take your ants anywhere.
- **The lawn eases:** no more robins over the Great Lawn.
- **The lawn can be held:** all 16 regions, with outposts.
- Plus 4 genes and a Legend ("Robin-chaser").

**On screen:**
- The robin model is the one ordinary robins use, at 1.6× their size. It hops, pecks and beats its wings, and flies and swoops with a shadow.
- Its own banner (🐦) and boss bar lines.
- When it's beaten: "The Old Robin flies off for good!"

**Checks:**
- 122 tests, 5 new (`tests/robin.test.js`): it guards the lawn; a peck is shown first as a small dot; six ants pin it (double bites, no take-off); in phase 2 it goes up, shows a lane and swoops; and driven off, it gives the trophy, stops robins over the lawn and keeps birds off your ants.
- A browser run showed it pinned and aloft, with no errors.

## Nov 2: crew orders: hold, send, split, follow (build 29)

Mark picked the new guardians and "crew orders beyond attack that (hold, formations, splitting)": "Lets do 2 and 3". Crew orders came first, because they're smaller. The guardians follow, one per build.

**The orders** (buttons appear next to Release when they apply):
- **Hold:** the crew plants itself where you stand, in a small ring, and guards 5 tiles round it.
  - It chases anything that comes in (rival ants, the spider, bugs) but never past the ring's edge, then goes back to its spot.
  - A faint green ring on the ground shows the guarded ground.
  - It holds however far you walk away.
- **Split:** half the crew holds where you stand and half keeps following you.
- **Follow:** calls every holding ant back. They come from anywhere: the usual 16-tile leash doesn't apply until they reach you.
- **Right-click:**
  - on an enemy, with a crew, your crew attacks it (as hovering does, build 26);
  - on the ground, the crew goes there and holds;
  - with nobody following, the crew already holding moves there instead;
  - right-click no longer walks your ant.

**How it fits with the rest:**
- Holding ants are still your crew: Release frees them, and they count as fighters against the spider and bugs.
- They don't count toward a raid's crew or an attack order. Those take the ants following you.
- Holding is kept in saves.

**Formations** (tight against wide) are left out. Hold and split cover what they were for, and they'd need a design of their own.

**Checks:**
- 117 tests, 5 new (`tests/orders.test.js`): hold, and staying held when you walk 30 tiles off; a held crew killing an intruder and going back to its spot; split; follow from 25 tiles; and holding kept across a save.
- Raid fixes found while testing:
  - A brood raid now ends when every pupa is taken. It used to keep its raiders inside until round 60.
  - Raiders carrying a prize stop fighting.
  - A starving home colony no longer kills raiders who are inside a rival nest.
- A browser run showed Split, then a right-click sending the rest, two green hold rings and the Follow button's count, with no errors.

## Nov 2: raids you lead (build 28)

Mark: "I want raids to feel interesting and important. You raid other colonies." Then "okay next build", so I built step 2 of `COMBAT.md`.

**How a raid goes:**
1. **Muster.** Take a crew to a rival nest. Within 8 tiles of its door a **Raid** button appears (crossed mandibles). Press it for the scouts' sheet:
   - their numbers and guards, their store, their brood, and their queen's health;
   - your crew, its fighters and its total Attack;
   - a one-line read of the odds, from "Your crew is far stronger" to "They outnumber you".
2. **Pick a prize:**
   - **Their store:** carry off up to half their food.
   - **Their brood:** steal pupae, which hatch in your nest as your workers, or as soldiers with the War camp evolution.
   - **Their queen:** kill her. The colony falls, its nest becomes your outpost and its region can be held.
   - It needs a crew of 3 or more.
3. **Break the door.** The crew charges their door, under a red ring, and their guards pour out. Hold it with 6 of yours (or the whole crew, if smaller) and none of theirs for 5 seconds. The raid breaks if the crew is lost, you walk too far off, or 2 minutes pass.
4. **Inside.** The crew vanishes into the hole, and the fight runs on the **raid card**, a round a second:
   - Each raider duels a guard with the same dice as on the surface (ganging up counts). Guards strike back.
   - Raiders with nobody in front of them go for the prize: they grab food, take a pupa each, or bite the queen. She rolls a die plus 4 to defend and bites one raider a round.
   - The card shows raiders left, guards left, the prize so far (and the queen's health bar), and a line per round, such as "Round 5: Thorn rolls a 6, crit! 2 guards fall."
   - **Pull out** at any round with what you've taken. After 60 rounds the raiders fall back on their own.
5. **Get home.** Survivors come out at their door carrying the prize and head home. The rivals can chase them.
6. **The report:** on the card and as a message. "Raid on the pavement ants: 10 raiders carry home 44 food. Lost 0, killed 1 (1 crit). Their numbers: 3 → 2."
7. **They strike back.** Any colony you raid sends a raid at your nest 1½ to 3½ minutes later, even the ones that never raid on their own.

**What changed underneath:**
- **The old siege is gone.** Eight fighters standing at a door no longer wear a queen down; a queen raid does that now. Fighters at a rival door still raise their alarm, and a queen nobody is raiding heals 3 a second.
- **Raiders inside a nest are off the yard:** not drawn, not hit, not counted. A save made mid-raid sends them home with whatever they carried.
- **The bot:** its sieges walk the crew to the door and start a queen raid.

**Checks:**
- 112 tests, 6 new (`tests/raids.test.js`): a raid needs a crew and a door; the scout numbers; a store raid end to end; a brood raid whose pupa hatches at home; pulling out; and a colony that never raids striking back. The old siege test is now a queen raid.
- A browser run showed the Raid button, the scouts' sheet, the breach and inside cards, and a queen raid won in 35 rounds (2 lost, 11 killed), with no errors.
- 45-minute bots: the sensible and military bots both took the Patio by queen raid in some runs (2 of 6 runs won). The rest never gathered 10 fighters, as before.

## Nov 2: ant against ant is a duel of dice (build 27)

Mark: "think one-on-one, when it's ants against ants, it should be something. Dice rolls against each other, or attacks against each other." He asked "What's next?", and I took step 1 of `COMBAT.md`.

**How a duel works** (`swing` in the sim):
- A fighter that meets an enemy locks on to one foe and swings at it every 0.7 seconds. Your ant swings every 0.6.
- Each swing rolls **1d6 + Attack** against the foe's **1d6 + Defence**:
  - **Higher:** a hit.
  - **Higher by 3 or more:** a hard hit, for half again.
  - **A natural 6 that hits:** a **crit**, for double. It also lames the foe, which is slower for 4 seconds. Venom ants crit on a 5 or 6.
  - **A tie:** mandibles locked. Neither moves for a round, and they shove at each other on screen.
  - **Lower:** a miss.
- **Ganging up:** each other ant on the same foe adds +1, up to +3. A swarm ant (odorous) counts double.
- **Pinned:** with 3 or more on it, a foe is pinned. It can't run, and every hit on it is a hard hit. Supermajors can't be pinned.
- **Fire ants:** each hit burns for 1 more over 3 seconds.
- **Argentine ants:** never run.
- **Damage:** bite strength, the same as before, times 1.4 per hit. On average a duel hurts about as much as the old steady damage did. The difference is that ganging up, ranks and luck now matter.

**Attack / Defence:**

| Ant | Attack / Defence |
|---|---|
| Workers | 0 / 0 |
| Harvester | 1 / 1 |
| Soldier | 2 / 2 |
| Venom ant | 2 / 1 |
| Major | 3 / 4 |
| Supermajor | 4 / 6 |
| Exploder | 1 / 0 |
| Your ant | 2 / 2 |
| Pavement ants | 0 / 0, soldiers 2 / 2 |
| Odorous ants | −1 / −1 |
| Argentine ants | 0 / 0, soldiers 1 / 1 |
| Carpenter ants | 3 / 4 |
| Fire ants | 2 / 1 |

- The war party's champion gets +2 / +2.
- **Ranks:** Seasoned +1 / 0, Veteran +1 / +1, Elite +2 / +2, Legend +3 / +3.
- **Upgrades:** Strong mandibles and the Trap-jaw line +1 Attack. Tough cuticle and the Armory +1 Defence. Your ant's third upgrade +1 / +1. Propaganda takes 1 off rival Attack.

**What you see:**
- **Your duel:** your dice next to your health bar for a second and a half: "🎲 You 5+2 vs Pavement ant 3+2: hit". Their swings at you show too: "🎲 Pavement ant 4+0 vs you 2+2: blocked".
- **Numbers over fights:** small rising numbers over your own fights. "CRIT 6" over crits nearby, gold for yours and red for theirs. Now and then "⚔" over locked mandibles.
- **Crit sparks:** a crit flashes white and twice the size.
- **The raid report** now counts your crits.
- **Help** has a Duels line.

**Checks:**
- 106 tests, 6 new (`tests/duels.test.js`): the stats; each outcome with fixed dice; a soldier landing about 60%+ on a forager while a forager still lands 8–35% on a soldier; ganging up doubling hits and pinning making hard hits; venom crits and fire burns; and a ground fight where 5 soldiers beat 5 foragers.
- The crew-attack test sometimes dropped its rival ant inside an obstacle. It now uses open ground.
- A browser run showed the dice readout, crit pops and the white crit flash, with no errors.
- 45-minute bots, same seeds side by side: the previous build reached 40 ants in 3 of 4, duels in 2 of 4, with no more ants lost to rivals. That is within the usual swing. Military bots won both their runs.

## Nov 2: attack on purpose (build 26)

Mark: "attacking on purpose, when you have recruits, say you recruit everybody and then you attack on purpose, I think that's the best way to go. You hover over an enemy and it causes ants to begin a combat where they just bite at it."

**How it plays:**
- **When it works:** you have a crew (Recruit).
- **Starting it:** rest the mouse on an enemy for a moment (0.18 s), or click it.
- **What you see:**
  - the cursor turns to a crosshair over anything the crew can attack;
  - a turning red ring marks the target;
  - "Your crew charges the earwig!" appears, with a war-cry sound.
- **What the crew does:** it leaves your side, runs at the target (as fast as a crew catching up to you) and bites it. The biting is the same as before; what's new is that you say what they go for.
- **What you do:** a click on an enemy is an order, not a walk, so you stay where you are.
- **When it falls:** "The earwig is down. Your crew falls back in."
- **If it gets more than 22 tiles from you,** the crew gives up and comes back. Release still sends them all home.
- **Targets:**
  - rival ants, and the war party's champion
  - the bugs (earwig, cricket, millipede, ladybug)
  - the caterpillar and the spider
  - the three bosses
  - Cordyceps zombies and stalks

**Where it's taught:** a new tutorial step after Recruit, a Help line, and the Recruit button's tip.

**Not in this build:** crew commands beyond "attack that" (hold here, formations, splitting the crew), and a touch version (phone pass is Phase 3 or 4; a tap on an enemy already works).

**Checks:**
- 100 tests, 4 new (`tests/attack.test.js`):
  - no crew, no attack
  - the crew reaches a critter, kills it and falls back in
  - the crew kills a rival ant
  - the crew gives up when the target is too far
- A browser run: hovering an earwig with a crew of 8 gave the crosshair, the ring and the charge, and it died in under 2 seconds.
- The bot now points its crew at the caterpillar on hunts and at defenders in sieges.
- 45-minute bot runs are about the same as the previous bot against the same game (2 or 3 of 4 reach 40 ants). Runs vary a lot between seeds and between runs.

## Nov 2: odorous swarm, one zoom notch less, bots on the new content (build 25.1)

Mark: "make the odorous house ants really aggressive and numerous. Not as damaging, but more numerous." "I would remove one zoom notch." "We have to make sure number 7 works out" (the bots on the new content). Also: "don't slow the colony further."

**Odorous house ants:**
- They start with 24 ants and grow up to 110, twice as fast as other colonies.
- Each one is weaker: 0.5 health, 0.45 bite, 0.8 size.
- Every one of them picks a fight with any ant it meets.
- When you siege their nest the whole swarm pours out to hold the door, and while any of them stand there their queen can't be hurt.
- In a test, 10 soldiers lose to them; 20 win with one ant lost.

**Zoom:** the farthest zoom is one wheel notch closer (`zoomMin` 0.45 to 0.5).

**Bugs the bots found, now fixed:**
- **Later colonies starved out in about four minutes.** Food only grows in regions someone has walked into, and they woke in unvisited ones. Now:
  - when a colony wakes, its region comes alive with food;
  - it starts with 80 food;
  - it needs only half its food from the yard (the bins, the tree, beyond the fence);
  - it never starves below the size it arrived with.
  - Ten minutes in: odorous about 60, carpenter about 26, Argentine about 30, fire 12.
- **The fire ants couldn't be beaten.** Their door sits inside the big mound's sting zone, which killed a 30-ant siege in 5 seconds. Now, once their colony is awake, the ground there stings at a tenth (their ants do the fighting), and not at all once their queen is dead. 20 soldiers come within 26 health of the queen; 30 win.
- **Carpenter ants:** 20 plain soldiers lose to them, which is meant. They are the wall that majors are for.

**The bot (`scripts/playtest.mjs`) now plays the new content:**
- Once the colony is established (30 ants with a third of the store full, or the Patio taken), it:
  - evolves the late nodes;
  - builds the evolved rooms and raises their levels;
  - lays two of each new ant once its room stands, and majors as a quarter of the army.
- Its sieges go after each awake colony in turn.
- `CAMPAIGN=1` plays on past the Patio.

**Results:**
- 45-minute runs: all 4 reached 40 ants and 3 won, about as before.
- Three 200-minute campaigns:
  - every colony arrived on schedule;
  - the bot took the Patio and attacked the odorous ants;
  - but the long game starves. At 40 to 60 ants, upkeep (55 to 80 a minute) runs past income (25 to 60). Starvation deaths reach 200 to 300, and in 2 of 6 long runs the Argentines killed a starving queen.
- This is partly the bot (it never saves up for the fungus garden or granary, and holds few outposts) and partly real: the yard near the nest regrows food more slowly than a big colony eats. It is listed in BACKLOG for the combat and economy sit-down.

**Tests:** 96, 2 new (later colonies survive ten minutes; the fire mound's stings soften). Known flakes, which pass when run alone: the robin test, and "a room only builds with a builder inside it" (about 1 run in 6).

## Nov 1: rival colonies across the yard (build 25)

Mark: "next." Then, as I built it: "obviously the rivals should show up at specific times... say after the patio colony is gone or after 30 min." I first had them arrive at 20, 30, 40 and 50 minutes. Mark: "thats too fast. Maybe new ants every 30 min after the patio is dead."

**When they come.** No new colony comes while the Pavement ants hold the Patio. Once their queen is dead, one colony moves in every 30 minutes, easiest first:

| When | Colony | Where | What they're like |
|---|---|---|---|
| From the start | **Pavement ants** | the Patio cracks | As before. They raid you. |
| Patio + 30 min | **Odorous house ants** | under the trash cans | Many, tiny and weak (0.6 health, 0.7 bite, 0.85 size). They compete for food. Queen 600. |
| Patio + 60 min | **Argentine ants** | the tomato rows | An invading supercolony: up to 80, small. **They raid you.** Queen 800. |
| Patio + 90 min | **Carpenter ants** | the foot of the Oak | Few, huge and black (2.5× health, 1.8× bite, 1.5× size). They guard their trunk. Queen 1,500. |
| Patio + 2 h | **Fire ants** | beside the big fire mound | Fierce: every one of them fights within 20 tiles of the mound, with a 1.8× bite. Queen 1,200. |

**When one arrives:** an orange banner says who has moved in and where, and their nest appears with its red ring.

**How you beat one:** as with the Pavement ants, hold their door with eight fighters until their queen dies.
- Their nest becomes your outpost, and +3 🧬.
- The Fire ants', Odorous ants' and Carpenter ants' regions can then be held. The Fire mound used to be "never".
- Only the Pavement queen wins the yard.

**How it works:**
- The one rival became a list of colonies (`RIVALS` in the sim). Each has its own nest, a homing map made when it wakes, its own growth caps and soldier share, and its own colour on the ants.
- Rival colonies fight each other too.
- Bosses no longer wake for rival ants living near them. This came up because the Argentine nest shares the hornworm's Tomato Rows.
- Saves keep every colony.

**Checks:**
- 94 tests, 6 of them new (`tests/rivals.test.js`).
- The bots are unchanged by this build: in 45-minute runs, 3 of 4 reached 40 ants and 1 won. The new colonies only come after the Patio falls.

## Nov 1: every evolution does something (build 24)

Mark: "Lets do the evolutions."

All 30 nodes that still said "coming in a later build" now work. Where a node promised a big system that doesn't exist yet, it got a real effect in the same spirit, and its text says exactly what it does:
- Night sense became Rain sense, because the game has no night.
- Royal chamber became satellite nests at outposts, and Highways became faster trails, because there are no second nests.
- Deep halls holds more ants instead of adding a soil band.

`docs/ROOMS.md` keeps the bigger versions for later.

**Bodies**
- **Exploders:** the Exploder ant, banded red and yellow with a fuse. When it dies it bursts, hitting every rival within 2 tiles for 8, and the spider and the caterpillar too.
- **Majors:** the Major ant: 14 health, bites 5, slow. It's laid from a Barracks.
- **Polymorphism:** the Supermajor: 30 health, bites 10, slower still, and costs chitin. Also laid from a Barracks.
- **Metapleural glands:** Cordyceps spreads half as much.
- **Heat tolerance:** heat waves don't slow your ants, and they dry the cistern a third as fast.
- **Long-lived workers:** ants eat 25% less.
- **Lineage:** once evolved, the node's card offers three lines. You pick one, for good:
  - **Acid:** fighters hurt bugs and bosses 50% more.
  - **Trap-jaw:** fighters bite 40% harder.
  - **Bullet:** fighters' bites slow their prey.

**Senses**
- **Lookout:** ants spot things 3 tiles further off.
- **Sun compass:** foragers range 25% further.
- **Danger scent:** foragers keep twice as wide of the spider.
- **Rally scent:** you recruit from half again as far.
- **Hive mind:** every ant answers the colony's needs twice as readily (duty thresholds halved).
- **Propaganda scent:** rival ants bite 25% weaker.
- **War columns:** recruit up to 60.
- **Rain sense** (was Night sense): ants keep foraging in the rain.
- **Vibration sense:** feet and acorns give over a second more warning.

**Nest**
- **Honeypot vault:** a new room, with **Repletes**, amber living jars hanging from its ceiling.
  - Each replete adds 40 food cap, or 60 at level II.
  - At level III they feed the colony in a famine, from a reserve they fill when food is plenty.
- **Midden:** a new room, with **Undertakers** in hoods.
  - While they work, Cordyceps spreads half as much.
  - Level II: their compost feeds the fungus garden.
  - Level III: Cordyceps hardly spreads, and cave-ins are a third rarer.
- **Thermal chimneys:** rain never caves tunnels in, and eggs hatch 15% faster.
- **Workshop III (Architects):** builders work 50% faster, and rooms cost 20% less.
- **Deep halls:** the queen holds 20 more ants.
- **Royal chamber:** satellite nests. Foragers drop their loads at a finished outpost when it's nearer than home.
- **Highways:** ants on a trail are 30% faster.
- **Shared stores:** each finished outpost adds 50 food cap.

**Society**
- **War camp:** rivals killed near their nest drop their food.
- **Brood raiding:** 1 in 5 rivals killed near their nest comes home as brood and hatches as your forager.
- **Polygyny:** a second queen: 2 more eggs at once, laid 30% faster.
- **Honour guard:** raiders hurt the queen half as much.

**Symbiosis**
- **Honey economy:** 🍯 pays wherever 🌾 does, covering any food shortfall.
- **Beetle guests:** cave-ins mend half again faster, and loose spoil is tidied away.

**Checks:**
- 88 tests, 9 of them new (`tests/evolutions.test.js`).
- The bots are about the same: 2 of 3 reached 40 ants and 1 won. They buy few of these nodes.

## Nov 1: rooms from the evolution tree, their own ants, room levels, and wood (build 23)

Mark: "I'd like later more complicated rooms to become available with later evolutions. Maybe building or training other ants requires special rooms? With each room also having individual upgrades... Keep thinking into ant ecology."

The whole room plan, from real ant ecology, is in `docs/ROOMS.md`. This build is its first wave.

**A correction:** I had told Mark that 53 of 56 evolution nodes worked. That was wrong: 34 were still placeholders ("coming in a later build"). I had counted only the ones waiting on wood. This build makes four of them real, the four rooms below; build 24 does the other 30.

**The rules every new room follows:**
- **Evolution.** It comes from a node in the evolution tree. Until that node is evolved, the room shows in the Build list greyed, with "evolve … first".
- **Its own ant.** The room trains an ant of its own: the queen can't lay one until the room stands, and the egg menu doesn't list it until the room is evolved.
- **Room levels II and III,** bought from a new "Room levels" section in the Build list. Level III costs 🪵 wood.

**The four rooms:**
- **Fungus garden** (Symbiosis, after Aphid farming), based on leafcutters.
  - Its **Gardeners**, in straw sun hats, go out cutting leaf pieces. They carry them home over their heads.
  - The garden grows the leaf into food: 1.5 food a leaf. At level II it's 2.25; at level III it's 3, grown twice as fast.
  - A 🍃 chip shows the leaf stock.
- **Aphid barn** (Symbiosis, after Aphid farming; the node is now "Root aphid ranching"), based on *Lasius flavus*.
  - Its **Ranchers**, in cowboy hats, stay in and herd root aphids: half a 🍯 a minute each, 4 to a barn.
  - Level II: half again more, and 2 more ranchers.
  - Level III: twice the 🍯, and a little food.
- **Infirmary** (Nest, after Insulation), based on *Megaponera*.
  - Its **Medics** wear a red-cross armband and satchel. They heal the wounded inside and cure Cordyceps before it turns.
  - Level II: twice as fast, your ant too.
  - Level III: the medics carry the fallen home. One in four ants killed within 24 tiles of the nest is saved; starving ants are not.
- **Granary** (Nest, after Store II), based on harvester ants.
  - It adds +100 food cap, and +150 more at level II.
  - Its **Harvesters**, with sacks of seed on their backs, carry seed, crumbs and popcorn in double loads.
  - Level III: they chew seed into ant bread, worth half again.

**Wood:**
- **Where it comes from:** 🪵 twigs fall within your foragers' reach, more on bark, mulch, leaves and hedges.
- **When it turns up:** only once something needs it, which is the queen's level 3 or a room reaching level II.
- **Who fetches it:** a new "Fetch wood" duty for foragers and builders. Duties added in a build are now appended to saved job lists.
- **What it unlocks:** "coming in a later build" is gone from wood costs. The queen's last levels and the builder's last upgrade can now be bought. The wood-gated nodes (Workshop III, Royal chamber, Highways) stay placeholders until their features are built.

**Checks:**
- 79 tests, 7 of them new (`tests/rooms.test.js`).
- The bots are unchanged by this build: 3 of 3 reached 40 ants and 1 won. They don't use the new rooms yet.

## Nov 1: your ant starts slower (build 22.1)

Mark: "The slower speed is meant generally for the ant, but especially for our ant, because I feel like he moves a little too fast [at the] beginning."

**Your ant:** it starts 24% slower, 58 px a second where it was 76. The You levels now give more of that back:
- Long legs: +25% (was 15%)
- Swift: +25% (was 15%)
- Sprinter: still +10%

Fully upgraded it reaches about 92 px a second, a little under the old 106. So the early game is slower and the upgrades matter more.

**The colony is not slowed yet. The bots say it can't be without more to make up for it.** Six seeds, 45 minutes each:

| What changed | Wins | Reached 40 ants |
|---|---|---|
| Before | 3 | 5 |
| Everyone outdoors 13% slower | 1 | 1 |
| 13% slower, foragers carry 6 (was 5) | 1 | 0 (and one lost colony) |
| 6% slower, carry 6 | 1 | 1 |
| Only your ant slower (shipped) | 2 | 3 (within the bots' noise) |

Slower ants don't just bring home less food; they get caught by the spider, the feet and the birds more often. Slowing the colony will need its own pass:
- more food on the ground near home
- or fewer threats early

## Nov 1: the underground (build 22)

Mark: "We should start looking at improving the underground designs to the sides of the nest instead of plain basic brown." Also from this message: the HUD is good on PC, no keyboard shortcuts, the house's inside later. Next are rivals in the new regions, slower movement, and the last of the tech tree and rooms.

**Before:** the soil round the nest was one speckled brown in three flat bands. The ground beside the cutaway was a darker, plainer brown, so the nest read as a box set into a wall.

**Each band has its own grain** (`models/underground.js`, `soilTexture`):
- **Topsoil:** dark loam with rootlets, humus crumbs and pale grit.
- **Packed earth:** faint layering and pebbles with a lit edge.
- **Clay:** mottled orange, grey-blue where it stays wet, rusty specks.

The ground beside and under the cutaway now uses the same grain at the same scale, mapped by world position, and barely darker. So the cutaway no longer shows a box edge.

**Things in the ground** (`buryThings`):
- roots from the yard above, tapering, wandering and forking
- stones, mostly in the packed earth, with a seam of gravel along each band boundary
- worm burrows, some with their worm
- grubs curled in their pockets, and snail shells, in the loam
- damp seeps in the clay
- now and then a lost human thing: a bottle cap, button, coin, marble, paper clip or bead
- beside the nest, an old clay drain pipe from the house running through the packed earth, and two mole tunnels

Inside the cutaway itself, a buried thing shows only while the soil all round it is whole, so digging clears it away.

## Nov 1: model pass, layer 4c: the garden, the thistles and the reeds (build 21.2)

Mark: "Cool, next."

These are some of the most common things in the yard: 25 tomato plants, 12 bean poles, 30 thistles and 54 reed clumps. From the play camera they looked like bare sticks.

**The plants** (`yardScenery.js`, with new shared shapes `ruffleLeaf` and `blade`):
- **Tomatoes:**
  - a stem tied to a cane in three places
  - eight side branches, each with a spray of drooping leaflets
  - yellow flowers
  - three trusses of tomatoes, ripe, orange and green, each with its green star on top
  - peppers hang long instead
- **Bean poles:**
  - a bamboo cane with nodes, the vine winding five times up it
  - three-leaflet leaves
  - pods hanging
  - scarlet runner-bean flowers
- **Lettuce:** three rings of ruffled leaves, pale ribs and frilled edges, folding up round a tight pale heart.
- **Squash:**
  - big lobed, ruffled leaves on long stalks
  - a ribbed orange squash in their shade
  - a trumpet flower
  - a curling tendril
- **Thistles:**
  - a rosette of spiny leaves with pale veins
  - a ridged stem with more spiny leaves
  - a prickly green bulb of bracts under a two-tier purple brush, with a smaller bud beside it

  Thistle weeds are just the rosette.
- **Reeds:** clumps of eight flat blades arching out, paler at the tips. The tall ones carry a cattail: a brown velvet head with its spike.

## Nov 1: the opening film with the house in it (build 21.1)

Mark: "what does the intro look like now? doesnt the house show up?"

**The problem:** it did show up, too much. The film's first shot looks north from the nest across the yard, straight at the back of the house. The old beige box was low, so the dusk sky showed above it. The new house is a full storey and blocked the sky. "They came from the sky!" played against a wall, with the fleet crossing the siding.

**The fix:**
- **The opening is a crane down.** It starts on the dusk sky and its stars above the roofline, with the fleet high over the house. Then it tilts down with them as they swoop past the windows to the yard and the rock.
- **The fleet** now comes in from high over the roof, behind the house, instead of from just in front of the wall.
- Checked at both the desktop and the phone (portrait) framing.

**Also fixed:** the window glass reflection came out as jagged white teeth, because the diagonal band was painted by triangle. It is now painted by whole pane cells, a clean stepped diagonal glint.

## Nov 1: the back of the house, outside (build 21)

Mark: "To the house." Then: "We can build exterior for now and build interior later." And: "keep in mind that the house we build now needs to be a good accommodating shape for a later interior."

**Before:** the house was a strip of brick along the top of the yard with a plain beige box behind it.

**Built for an interior later.** The house is now built from one layout (`houseLayout` in `models/house.js`), which the interior will share:
- the footprint: the length of the yard's top edge, and 240 tiles deep
- the floor, level with the top of the back steps
- the wall thickness and the height to the eaves
- where every door and window is, each tagged with the room behind it (kitchen, den, laundry, living, bath, bedroom)

The walls are real walls of that thickness with real openings for the door and windows, so a door can open and rooms can be fitted inside. `buildHouse` returns named groups:
- `shell`: the walls
- `roof`: its own group, so an interior view can lift it off
- `trim`: doors, windows, gutters and fittings
- `glass`

**The outside:**
- **Walls:** a concrete foundation; a brick skirt with five small basement windows; a white trim board; cream clapboard siding to the eaves; white corner boards.
- **The back door** at the top of the steps:
  - a white frame
  - a blue-grey door with raised panels and four panes of glass
  - a brass knob and kick plate
  - a black porch lantern with a warm glass
- **Seven windows**, kitchen, den, laundry, living room, bathroom and bedrooms:
  - frames, sills and muntins
  - green louvred shutters (none on the bathroom)
  - glass with a sky reflection
  - curtains drawn back, a different colour in each room
- **The roof:** a gable along the house, eaves overhanging, white fascia and soffit, a gutter, and three downspouts to concrete splash blocks.
- **Fittings:** an electric meter, an outlet, and a hose bib. The dryer vent sits low in the brick with lint on the ground under it.
- **Ivy** climbs both corners.
- **The steps** now have a rounded nosing on each tread, and white railings with posts at each step.

**What you see from the play camera:** it looks down into the yard, so the house shows only along the top of the screen. That means mostly its base: the foundation, brick, basement windows, splash blocks, ivy, the vent and the railings. The door, windows and siding show when you zoom right out.

## Nov 1: the Oak's roots spread round it, and no bundle of sticks (build 20.12)

Mark asked about "that batch of roots or sticks" up and left of the trunk.

**The cause:** it was the Oak Roots region's own five roots. All five started from one spot, 26 tiles out from the trunk's edge and joined to nothing, so they read as a dropped bundle of sticks.

**The fix.** Mark: "some roots but not tons, spread them around the tree."
- The bundle is gone.
- The trunk has seven roots, evenly round it, about 51° apart.
- Those heading west are the long ones, 50 to 70 tiles. They run out across the Oak Roots, so the region still has its "great roots heave out of the ground."
- The removed roots' random draws are kept, so the rest of the yard's layout is unchanged.

A first try instead attached the five as extra long roots from the trunk. That made twelve, crowded on the west side, and Mark asked for fewer.

## Nov 1: thicker oak roots that grow out of the trunk (build 20.11)

Mark: "Let's make the roots of the trunk of the tree a little bit thicker. They seem a little too slim. Let's try to make them seam into each other, you know, like an organic seaming."

- **Roots that leave the trunk are broad and flattened.** They are about 8 tiles across at the trunk and taper slowly to a point, half sunk in the ground. They snake and dip, then dive back into the ground at the tip.
- **The seam:** each root starts inside the trunk and rises up it.
  - The trunk's foot has a buttress swelling toward each root it feeds, aimed at that root (the angles come from the yard layout). Before, the buttresses were at five fixed angles.
  - So trunk and root are one surface.
- **The roots are coloured like the trunk's bark:** furrows along their length and dark beneath. They are coloured while still a plain tube, so both triangles of a facet match.
- **The separate roots in the Oak Roots area** are a little wider too.
- **The yard layout (`yard.js`) blocks the same width.** Before, it blocked only one tile along each root. Without the change, ants walking beside a root would have been hidden under it.
  - Trunk roots block up to four tiles each side at the trunk, and none at the tip.
  - Oak Roots roots block two, then one.
  - The scenery claims those tiles too, so no filler pebbles appear along them. A first try left the pebbles in.
- **Two attempts didn't work:**
  - A small widening barely showed.
  - A very large buttress flare swallowed the roots' thick bases, so only their thin tips poked out.

  The final version keeps the flare about the size of a root where it meets the trunk.

## Nov 1: model pass, layer 4b: the rest of the yard (build 20.10)

Mark: "Next."

Each of these was checked from the play camera. The changes are all in `yardScenery.js`.

- **The Oak:**
  - Buttress roots flare at its foot.
  - The bark is in deep vertical furrows, coloured by whole facet.
  - Moss grows low on the shady side.
- **Its roots:** thick where they leave the trunk, then tapering. They rise and dip as they snake away, then dive back into the ground.
- **Hedges and bushes** are built from a shared `leafBall`: a lumpy ball of foliage, lighter on top, flecked with pale new growth and dark in the gaps.
  - Hedges show woody stems underneath.
  - Bushes carry red berries, and flowering sage has purple flowers.
- **The kiddie pool:**
  - three inflatable rings with stripes
  - a pale inner wall
  - water with ripples and a glint
  - a rubber duck
- **The swing set:**
  - thicker capped legs on ground anchors
  - chains of grey links
  - black strap seats
  - the grass worn to dirt under each swing
- **The trampoline:** steel W-shaped legs, a top rail ringed with 40 springs, and blue padding.
- **The wheelbarrow** was a flat blue box. It now has:
  - a sloped steel tray with mud in it
  - a wheel on its fork
  - wooden handles with grips
  - two legs at the back
- **The shed:**
  - a door frame, hinges and a latch
  - a window with cross bars
  - white corner trim
  - a stone step
- **Molehills:** clods tumbled down the sides, and some spilled round the foot.
- **The bird feeder:** a squirrel baffle on the pole, and seed spilled round its foot.

## Nov 1: model pass, layer 5: the sneaker, the acorn, the robin, and props (build 20.9)

Mark: "Let's do layer 5." Each of these was checked from the play camera at the moment it matters: the warning shadow, the impact and the landing.

- **Shadows shaped like what casts them** (new `shadows.js`). Each shadow is soft at the edge (vertex alpha) instead of a hard dark disc.
  - The sneaker's warning shadow is its sole: wide at the toe, a narrow waist, a round heel. It starts a little darker, so it reads while the shoe is still high.
  - A flying robin's shadow is a bird with its wings spread. On the ground it is a soft pool.
  - Everything else gets a soft disc.
- **Dust where things land:**
  - the sneaker stamping down
  - the acorn hitting the ground
  - the robin touching down

  Each burst is clumps of soft, see-through puffs that roll outward and up and thin as they go, drawn in their own faint layer. As solid puffs at first, they looked like beads, so they were made see-through.
- **The sneaker:**
  - a navy stripe round the midsole
  - tread lugs along the outsole edge
  - silver eyelets down both sides of the laces
  - a tied bow
  - a round ankle patch on each side
- **The falling acorn:**
  - a glossy nut with faint stripes, a highlight and a dark pointed tip
  - a cap of overlapping scales with a rolled lip
  - a bent stalk
- **Shared props** (`props.js`). They stay white so each use can tint them, but they now carry grey shading that survives any tint:
  - seeds have a pale seam
  - pebbles are rounder and speckled
  - leaves have a midrib and veins
  - crumbs are porous
  - dewdrops have a glint
  - the marker rings are smooth (28 segments instead of 10)

## Nov 1: potted plants growing out of their soil (build 20.8)

Mark: "Potted plants looks bad still. Should have soil inside the terracotta pot, the plants sprouting from the soil inside."

**Why it looked wrong:** the pot's rim was a solid cylinder, so its top cap hid the soil, and the plant seemed to float over an orange lid.

**The pot now:**
- It is open: an outer wall, a flat lip on the rim, and an inner wall in shadow.
- The soil sits a little below the rim, as a low dark mound with grit and white perlite.

**The geranium:**
- It grows from a crown in the soil.
- Three tiers of round leaves with the zone ring sit on stalks from the crown. The low ones reach out over the rim.
- Three red flower heads stand on tall stalks above them, each a round head of florets.

## Nov 1: model pass, layer 4: the yard's landmarks (build 20.7)

Mark: "After that go to the next part."

At play zoom the camera sees tall landmarks (the can, the bins, the gnome, the birdbath) mostly from the base, so detail went where the eye lands. All of these are in `yardScenery.js`, in vertex colour as before.

- **Flowers:**
  - leaves with a pale midrib
  - green sepals
  - two rings of petals cupped upward, darker at the base and paler at the tip
  - a domed seed centre
- **Dandelions:** a rosette of toothed leaves flat on the ground, and a head of ragged florets in three tiers on green bracts.
- **Logs:**
  - bark in furrows with dark fissures
  - a taper and a slight bow
  - cut ends with rings and heartwood
  - two branch stubs
  - shelf fungus and moss on rotten logs
- **Pots:** a saucer, a rolled rim, potting soil with grit, and a geranium with zoned leaves and two red flower heads.
- **The grill:**
  - Its legs now splay out from under the bowl. Before, they leaned out past it.
  - Wheels and an axle.
  - A triangle rack with the ash pan.
  - Vents, a steel rim, a lid vent, and a wooden handle on brackets.
- **The patio set:**
  - slatted tops with gaps
  - an apron under the table and its umbrella hole
  - grey foot caps
  - the chair has a slatted back and arms
- **The sandbox:**
  - Boards with grain along each side, joints with nail heads, and a seat board across each corner.
  - A ribbed bucket with a rolled rim and sand heaped inside.
  - A spade with a scoop, a collar and a T grip.
- **The soda can:** steel rims top and bottom, a white band with a blue stripe, a ring-pull, and beads of condensation.
- **Mushrooms:** a bulb at the foot, a skirt on the stem, gills, and a cap paler at the edge; red caps have raised white warts.
- **Gnomes:** boots, a belt and buckle, arms, a nose and eyes, and a fuller beard.
- **The birdbath:** a mossy plinth, a fluted pedestal with collars, a lip on the bowl, and a glint and a leaf on the water.
- **Wheelie bins:** ribbed, with a bumper, wheels and axle at the back, and a hinge strip.
- **The cooler:**
  - a white band
  - a recessed lid
  - side handles
  - a latch
  - a drain plug
  - rubber feet

**One lesson:** colouring stripes by angle has to follow whole mesh segments. Otherwise the two triangles of a facet get different colours, and the bark, ribs and swoosh came out as a checkerboard.

## Nov 1: the cistern as a tank of water (build 20.6)

Mark: "Cistern could have a more tank of water look to it, makes sense."

The cistern's water used to be an opaque blue box. It stuck out past the curved chamber walls, and the ants walking through the room were hidden inside it.

It is now its own mesh, `waterGeometry` in `nestView.js`:
- **Shape.** It fills the back of the chamber, from about 0.6 of the room's depth to the wall, and is traced from the chamber's own outline, so it follows the curved walls.
- **Translucent front face.** Ants walk past the front face; the wall shows through.
- **Colour.** Shallow blue near the top deepening to dark blue at the bottom, with a bright lip at the surface and a pale surface seen from a little above.
- **Material.** Unlit, so it keeps its colour.
- **Level.** It is rebuilt whenever the level moves by half a pixel or more.

Inside and around it:
- a pebble bed seen through the water
- bubbles rising
- glints sliding along the surface
- the floating leaf
- a wet tide mark on the wall
- ripple rings where the root drips land

## Nov 1: rooms that sit in the soil (build 20.5)

Mark: "What about the transitioning of rooms and their surrounding backgrounds so it fits into the spacing better instead of just being a blocky jutting space with no natural seams?"

Two things made rooms look cut out of the soil rather than dug into it:
- Each room's painted back wall was a flat rectangle inside a rounded chamber, so its straight edges showed.
- Corridors butted straight into rooms, with square steps where they met.

The fixes:
- **Walls that follow the chamber.**
  - The back wall is now a fine grid built from the chamber's own outline (`roomField`, shared with the soil tracing).
  - It reaches past the outline into the soil, which hides it, so where the chamber meets soil its edge is the chamber's own curved edge.
  - Where a tunnel opens, the wall darkens a little and fades into the bare soil wall over about 10 px, with a ragged noise edge. Each room's wall runs out into the tunnel and into its neighbour without a line.
- **Tunnel mouths that flare.** Rooms and tunnels now merge with a much wider blend (20 px instead of 8), so where a tunnel meets a chamber its walls sweep out like a mouth.
  - Rooms still merge with one another at the old blend. Otherwise the one-tile soil wall between neighbouring rooms was eaten away; it now stands as a pillar that narrows toward the tunnel.
- **Roots.** Every room has two roots, each with a rootlet, hanging from the real ceiling (`roomCeiling`) near its walls.
- I also tried stones half buried in the wall, but they looked like floating chips and were dropped.

This is a rendering change only. Rooms are the same cells to the sim, so ants walk where they did.

## Nov 1: model pass, layer 3: the nest up close, and the toad (build 20.4)

Mark: "Go ahead with layer 3."

- **The brood** (new `nestProps.js`, drawn in true colours):
  - Eggs are glossy ovals, one end a little pointed, the yolk showing through, and a bit bigger than before.
  - Larvae are fat curled grubs in seven segments, with an amber head, dark mouthparts, and the gut showing through the skin. They still wriggle.
  - Pupae are silk cocoons, each with a dark spot at its foot.
- **The queen:**
  - Her gaster has five plates with pale skin showing between them, so it reads as swollen with eggs.
  - She has stubs where she tore off her wings.
  - She keeps her crown. Like the other outfits, these are true colours drawn over her tinted body.
- **Room furniture:**
  - Queen's chamber: a lumpy moss bed with tiny flowers, three new-laid eggs, and her shed wings pinned up as a pair, veined, each with its dark spot.
  - Hatchery and nursery: woven cradles, straw in the hatchery and silk in the nursery.
  - Food store: seed heaps that grow with the stock. Up to four honeypot ants hang from the ceiling, one for each quarter full, with amber gasters swollen with stored sugar.
  - Cistern: water that is pale at the surface and deep blue below, and teardrop drips.
  - Barracks: a twig rack of thorn spears, a beetle-husk training dummy with straw poking through a crack, a leaf banner, and two soldiers asleep with their helmets tipped over their eyes.
  - Workshop: a stone bench with a part-cut leaf and a thorn chisel, and a twig bundle tied with grass.
  - Armory: before this build it had no dressing and borrowed the workshop's wall. It now has a riveted chitin wall, three wing-case shields, a spear rack, and spare plates.
- **The toad:**
  - About 40 raised warts, darker blotches, a poison gland behind each eye, eardrums, and a bony brow.
  - Gold eyes with a black bar pupil.
  - Splayed toes, and a long webbed foot on each back leg.
  - A pale speckled throat that puffs. It is its own mesh now; the whole body used to pulse.
- **Gallery and export:** a new Nest tab in the model gallery, and 17 new `.glb` files, for 106 in all.
- **Two fixes while testing:**
  - Bug spacing measured from a tile's corner instead of its centre, so two bugs could start just under 12 tiles apart. This was a rare failure of the "never bunched" test.
  - The nurse test only counted nurses that were exploring. Nurses that left for another job outdoors, such as hunting or gathering, made it fail now and then. It now counts any nurse outside the nest.

## Nov 1: a viper of a venom ant (build 20.3)

Mark: "Maybe venom is more slender and viper-esque."

- The venom ant has its own body now; it used to share the soldier's.
  - Long and slim, with a tapering gaster carrying a chain of dark, pale-edged diamonds down its back, like an adder.
  - A sting at the tip.
  - A long thin waist.
  - A flat, wedge-shaped head wider at the back, with a dark crown stripe.
  - Pale curved fangs below fine mandibles.
  - Long fine legs.
  - It keeps its skull bandana.
- Its stats are unchanged.

## Nov 1: an outfit for each kind of ant, and the dead spider's legs (build 20.2)

Mark: "make the ant kinds more unique… worker ants have like a little work belt… the soldier ants have like an army helmet… foragers… some kind of apron… Also, the dead spider, the legs seem to be under the body when they should be above."

- **Every kind of our ant wears something of its own**, in true colours on top of its caste tint, drawn with the body:
  - **Builder:** a yellow hard hat, plus a leather tool belt round the gaster with a gold buckle, side pouches and a hammer. The hat was added so builders read from the top-down camera.
  - **Forager:** a green garden apron round the thorax with crossed straps and a bow on the back, and a little woven basket on its back.
  - **Nurse:** a white nurse's cap with a red cross.
  - **Soldier:** an olive army helmet with a brim and chin straps.
  - **Venom ant:** a black bandana with a white skull, its knot trailing.
  - **The queen:** a gold crown with red jewels.
  - Your ant wears its kind's outfit too.
  - Rival ants and Cordyceps zombies wear none, so they stand apart.
  - In the gallery, each kind is shown in its colours and outfit.
  - The first versions were too small and dark to read at game size, so every piece was made bigger and brighter.
- **The dead spider's legs:** turned on its back, its legs curled down into the body instead of up over it. The knees were bent the wrong way for a body drawn upside down. Now the legs tuck in over the belly with the knees high in the air.

## Nov 1: model pass, layers 1 and 2 (build 20.1)

Mark: "do that in different layers. Do the full pass and then give me screenshots of the most major changes." The pass works from the model gallery, most-seen first. Before-and-after sheets go to Mark each layer.

- **Layer 1, on screen most:**
  - **The ants** (the most-seen model, and the queen's body too):
    - a gaster in three plates banded darker at their edges, with a gloss stripe along the top
    - a two-part thorax (domed front, lower back) and a waist node
    - dark compound eyes
    - antennae ending in a club
    - mandibles that hook inward to a dark tip
    - four-segment legs with dark knee joints
    - The caste tints still apply on top.
  - **The robin:**
    - a teardrop body full in the chest, the brick-orange breast running to a white belly
    - a pale throat patch
    - layered wing feathers with pale edges
    - a fanned five-feather tail
    - toes
- **Layer 2, food on the ground:**
  - **Bread crumb:** a torn chunk with a golden crust and pale, pored crumb (was blocky boxes).
  - **Sunflower seed:** plumper, with finer stripes and a pale tip.
  - **Popcorn:** puffy white kernels round a golden core with a scrap of hull (was beige cubes).
  - **Tomato:** half a tomato lying cut face up, with three jelly chambers full of seeds (was a flat red lump). A first try drew whole pie slices and looked like a peppermint, so the face is now split into rings and spokes.
  - **Hot dog scrap:** a grill-marked sausage in a split bun with a mustard zigzag.
  - **Potato chip:** rippled and curled, with toasted edges, blisters and salt flecks (was a flat card).
  - **Dead bug:** on its back, with segment lines, curled two-part legs and antennae.
- Also tried and taken back: a dotted white eye ring on the robin read as a scatter of specks at game scale, so it's back to a clean white eye.
- The `.glb` files in `game/assets/models/` and the gallery are regenerated.
- **Next layers, proposed:**
  - **Layer 3:** the nest (the queen up close, eggs and larvae, room furniture) and the toad.
  - **Layer 4:** the yard's landmarks (flowers, logs, pots, the grill, the sandbox).
  - **Layer 5:** visitors (the sneaker, the acorn) and the props.

## Nov 1: the world's look and pull (build 20)

`PLAYTEST-2.md` items 5, 6, 7, 32 and 33. Mark: "First hour felt good, just enough difficulty and learning curve."

- **The big rock no longer swallows your ant** (item 6). Walk north of the big rock and the camera, looking down from the south, had the rock between it and you: your ant vanished.
  - Now any rock or landmark nearer the camera than your ant dithers away in a circle round it, a PS1-style screen-door hole, and the hole grows a little as you zoom in.
  - It's a shader trick on the shared rock and landmark materials, so it works for every rock, log and pot in the yard, not just that one.
- **Rain over the whole view** (item 7). The rain box was a fixed 520 px square round the middle of the screen, so zoomed out the edges were dry.
  - It now covers as far as the view reaches, with more streaks for a bigger box so the density stays the same (up to 2,400).
  - The drops pocking the ground spread the same way.
- **The Patio has real paving** (item 5), and so do the Steps, the Grill and the Cooler:
  - each slab its own shade, with speckled aggregate
  - weathered stains
  - worn pale edges
  - about a third of them cracked
  - dark grout between them with moss and weeds in it
- **Curios: things worth exploring for** (item 32: "the yard feels small, yet he uncovered very little").
  - Every one of the 70 regions hides one lost human thing: a glass marble, a red button, a copper coin, a bottle cap, a toy brick, a paper clip, a glass bead or a die. Each is several ant-lengths across and glints with a twinkling star you can see across the region.
  - Walk your ant up to one and the stash round it spills out, by its ground: garden treats and honeydew, chitin on bark and compost, stone on gravel, crumbs and a cookie on paving, sweets in the sand, dew in the mud, seeds and berries elsewhere. It also pays a 🧬 Gene, and every fifth curio pays three more.
  - Placed at the start, a fixed spot per region and seed, on clear ground away from rocks and both nests.
  - The yard map counts them ("✦ Curios found: 3 of 70"), marks found regions with ✦, and each region's card says whether its curio is found or "something glints here: find it".
  - A first-find tip, a Help line, a tap card and a sparkly chime.
- **The asset pass** (item 33: "make them proper standalone assets instead of shapes drawn in code").
  - **A model gallery:** every model in the game, 80 of them, grouped as the game uses them (ants, creatures, bosses, events, curios, food, visitors, props), each turning on its own stand. Run `npm run gallery`, or open the published page. It's for reviewing them one by one.
  - **Standalone files:** each model is also written out as a binary glTF in `game/assets/models/` (80 `.glb` files with an index), by `npm run models`. They open in Blender or any 3D viewer, so they can be reworked by hand or replaced by commissioned models later.
  - **First fix from the review:** the ladybug's spots were painted onto the dome's faces and came out as jagged black triangles. They're now round spots sitting on the shell.
- **Tests:** 72 (new: every region has a curio, and walking up to one pays its stash and a Gene, kept across a save). The browser test passes.

## Nov 1: events less often (build 19.1)

Mark: "events shouldn't happen too often… maybe like 8 minutes to 10 minutes. And the more serious ones, even less frequently. My brother did a 45 minute to an hour run and had barely taken out the enemy colony and the spider."

- **The first event** comes at 10–12 minutes. **The next one** comes 8–10 minutes after the last one ends (was 4–7).
- **Lethal events** (the war party, the Cordyceps outbreak) come no earlier than 25 minutes, and at least 20 minutes apart (was 10 minutes, and 3 apart).
  - The outbreak waits until 30 minutes.
  - After 15 calm minutes they become twice as likely (was 6 minutes, and three times).
- **Heatwaves** come after 15 minutes, and at least 12 minutes from the last hardship or lethal event.
- So in a typical hour: about six events, mostly gifts, a heatwave or two, and one or two lethal ones in the second half.
- **What his run says about pace:** about an hour to beat the rival and the spider means the three bosses (Hornworm, Ground Beetle, Antlion Queen) are the second hour's content, which is where the design (`PROGRESSION.md`) puts them. They stay as they are. Lethal events now land in that same stretch, rather than piling onto a colony still fighting its first war.
- **Tests:** 71 (new: events 8–10 minutes apart; over a simulated hour, nothing lethal before 25 minutes, and lethal ones 20 minutes apart).

## Nov 1: bosses and events (build 19)

`PLAYTEST-2.md` items 29 and 30. Mark: "make them proper bosses and events, really enthralling stuff."

**Three bosses**, each in its own lair, built so you can read and dodge them:

- **The shape of every fight:**
  - The first time you come near a boss, a title card names it (name, epithet, how to beat it), the view shakes, a cinematic sting plays, and a boss bar appears at the top of the screen. The bar has a live line on what it's doing: "Rearing to thrash: get out of the ring!", "★ DAZED: BITE NOW! ★".
  - Every attack shows first as red on the ground: a ring, a circle or a lane. The fill grows to the edge as the blow nears, and it lands when it touches. Step out and you're spared. A rising whoosh plays for exactly as long as the warning.
  - Each boss turns at half health: the bar burns orange and its pattern changes.
  - Music goes to full danger while a boss fight is on screen.
  - Killed, a boss stays dead. It drops its meat and chitin and pays 🧬4, and the ant that bit last becomes a Legend with a title ("Shell-breaker"). A victory card names its trophy.
  - Only then can you hold its region.
  - A boss left alone goes back to sleep and heals.
- **The Hornworm** ("Glutton of the Tomato Rows"):
  - A fat green caterpillar 13 rings long, with white stripes and a red horn.
  - It strips the plants in its region, so your aphids there wither while it lives.
  - It rears up (its front rises) and thrashes a ring 3.6 tiles across: 4 damage and a shove.
  - It spits goo at the ants further off: a circle that hurts and leaves a slowing puddle for 7 s.
  - In its frenzy it's faster, attacks more often, and rolls down a lane, crushing what's in it.
  - 700 health. Trophy, **hornworm silk**: builders build rooms twice as fast.
- **The Ground Beetle** ("Armoured Hunter of the Rock Garden"):
  - Glossy black with a blue sheen and crossed sickle jaws.
  - Bites barely scratch it: workers 15%, you 35%, Venom ants 50%.
  - It paws the ground (a lane appears), then charges down it, bowling ants over.
  - If the charge hits a rock it's dazed for 4.5 s, otherwise 2.2 s. Stars circle its head, the bar flashes "DAZED", and it takes 2.5× damage.
  - Dodge, then punish. You can bait it into rocks.
  - Enraged, it charges twice. It snaps at ants close by.
  - 520 health. Trophy, **its shell**: the new **Armory** room (🌾40 🪨20 🪲20). Every ant is 50% tougher, and foragers shrug off one foot or beak.
- **The Antlion Queen** ("Terror of the Sandbox"):
  - Under the deepest pit, only her jaws showing through swirling sand.
  - Ants near the pit: the sand swirls orange under one, and if it's still there when the swirl closes, she drags it down.
  - Ants further off get sand flung at them: slowed and shoved toward the pit.
  - After every grab she surfaces for a few seconds, and only then can she be hurt. Eight ants at the pit's edge for two seconds draw her up for five ("Lure it with a rally mark", from the design).
  - At half health she tunnels from pit to pit, with a dust trail between them.
  - 480 health. Trophy, **her mandible**: fighters bite 15% harder, and the pits never drag your ants again.

**The event director**, after RimWorld's storytellers.

- **The rules:**
  - The first event comes at 9–11 minutes, then one every 4–7 minutes after each ends.
  - Lethal ones need a colony of at least 12 ants, or 30% of the queen's cap, and come after the 10-minute mark. Never two within 3 minutes.
  - After 6 calm minutes, lethal events become twice as likely.
- **What you see:** each is announced with a banner (gold for gifts, orange for hardships, red for lethal), its own sting, and a chip in the top bar (a countdown, or the outbreak's infected and stalk counts). It ends with a report.
- **Swarm day** (gift): winged queens from every colony rain down near your ants for 40 s, 6 protein each, and the birds come early.
- **A picnic** (gift): three treats land by the Picnic blanket, Lawn or Clover, and feet come every 16–28 s there for 100 s.
- **Heatwave** (hardship, after 10 minutes): for 2 minutes water drains, puddles shrink, dew dries, and ants outside are 15% slower. It breaks with thunder and rain.
- **War party** (lethal):
  - A **named champion** (Gravel-Jaw, Cinder, Old Crack…) leads 6 or more soldiers on your nest.
  - The champion is twice the size, red-ringed and labelled, with 45 health, bites three times as hard, and has its own boss bar.
  - Kill it and the rest break and run; the ant that did most of the work becomes a Legend, "Champion-killer". +2 🧬.
- **Cordyceps outbreak** (lethal, after 15 minutes with 15 ants; the first time it's twice as likely):
  - Two foragers far from home are infected and go faintly grey. For 15 s they work on: nurses inside can cure them, but left inside they can spread it.
  - Then they **turn**: grey-green, twitching, a stalk poking from the head. They abandon their work and climb to a high place beside a rock or stem, and clamp on.
  - At 35 s they die and a **fungal stalk** grows from the body, swelling and puffing spores. 12 s later it **bursts**, infecting ants within 3.5 tiles (60% of workers, 35% of fighters).
  - Fighters on patrol, your crew and you go after zombies and stalks.
  - It ends when nothing is infected and no stalk stands. A report follows ("the fungus took 4 ants, and your nurses cured 2"), plus +2 🧬, and the colony gets a little more resistant each time (−20% infection).

- **Tests:** 70 (new: lairs and the first-sight intro, the hornworm's ring that spares those who step out, the beetle's armour against a dazed beetle, its charge lane, the antlion queen drawn up by a crew, a boss kill's trophy, Genes, chitin, Legend and the Armory unlocked, the director's early gift, the outbreak's turning, stalks and spores, soldiers and nurses ending an outbreak, the war party's champion, a save mid-boss and mid-event). The browser test shows a Swarm day banner and walks up to the hornworm for its boss bar.

## Nov 1: sugar and chitin (build 18)

PROGRESSION step 2 (`PLAYTEST-2.md` items 30 and 31): two new materials, and the tech that was waiting on them.

- **🍯 Sugar**:
  - Honeydew: every load of aphid honeydew brings 1. Aphid farming makes it 3, and a held garden doubles that.
  - Sweet treats (jelly beans, gummy bears, cookies) pay 30% of their size in sugar as well as food, hauled by a crew or chewed off by Haulers.
  - Held regions give half a 🍯 a minute each with Flower nectar.
- **🪲 Chitin**:
  - Carcasses: every load of a dead bug brings 1; the ladybug, earwig, millipede and spider 2.
  - **Beetle shells**, a new item worth 8, turn up now and then on bark, compost, gravel, mulch, leaves and hedges.
  - The spider leaves a shell worth 15 when it dies.
  - A held Woodpile turns up more shells and doubles the chitin from its dead bugs; that is its new prize.
  - Foragers on Hunt bring shells as well as meat.
- Both show in the top bar once you have found any, with a first-find tip and a line in Help.
- **What they buy now** (all were marked "later build"):
  - **Queen** levels 5, 6 and 7 (100, 120 and 140 ants), with her level-5 traits: **Brood mother** (eggs 30% cheaper) or **Matriarch** (10% more health). Level 8 still needs 🪵 wood.
  - **Forager** IV (carries 2 more, range 130) and Mastery: **Trail queen** (every ant on a trail 40% faster) or **Lone wolf** (forages anywhere).
  - **Soldier** III (20% faster; picks **Alarm caller**, every idle fighter answers an alarm, or **Phalanx**, bites 50% harder with 3 or more together), IV (50% more health again) and Mastery (**Warlord**, fighters together bite 30% harder; **Guardian**, raiders hurt the queen half as much).
  - **Venom** III (stings 30% harder; **Neurotoxin**, stings slow bosses; **Lethal dose**, small foes die in one sting).
  - **Nurse** III (eggs 30% faster with nurses in; **Brood guard**, nurses guard the door from inside; **Attendant**, the queen lays 20% faster), IV (25% faster again) and Mastery (**Teacher**, every ant hatches Seasoned; **Caste-shaper**, fighter eggs at a worker's cost).
  - **Evolutions:**
    - Big crop: foragers carry 3 more.
    - Social stomach: your ant never starves, and colony starvation kills half as often.
    - Tough cuticle: every ant has 50% more health.
    - Brood chambers: eggs 25% cheaper.
    - Aphid farming.
    - Flower nectar.
- Still "later": the Major and Supermajor, Long-lived workers, the Honeypot, Polygyny, mealybugs, and everything wood pays for.
- **Tests:** 59 (new: honeydew sugar and Aphid farming, chitin from carcasses and shells, shells on the right ground, sugar from a treat, sugar and chitin paying for upgrades, the queen and evolutions, the Woodpile prize).

## Oct 31: running the colony (build 17)

The third build phase from `PLAYTEST-2.md` (items 27, 34 and 36), and the spider walking through a rock.

- **A Jobs page** (the clipboard button on the right): each kind of ant has a list of duties in order.
  - Duties: gather food, fetch water, fetch stone, hunt, dig and build, tend eggs, guard the door.
  - Defaults:
    - Foragers: food, water, stone, hunt (they haul meat).
    - Builders: dig and build, stone, food, water.
    - Nurses: tend eggs, water, food.
    - Soldiers: guard, hunt, food.
    - Venom ants: hunt, guard, food.
  - Tap a duty to put it first; ✕ turns it off. Each row shows what that kind is doing right now ("12 · 🌾 6 · 💧 2 · 🪨 2 · 2 resting"). Kept with the save.
  - This is the per-ant-type setting Mark asked for, with one simple page rather than a menu per ant.
- **How ants choose.** An ant ready for work takes the first duty on its kind's list that needs doing. Main duty first, then it helps with the next.
  - A gathering duty only needs more hands while what's short isn't already covered by the ants out on it (about one ant per 5 units short), so a colony spreads itself out. All the foragers no longer pile onto water.
  - Ants differ in how readily they answer, as before.
  - In rain nobody goes out to gather.
  - Fighters on guard keep at least two, or half of them, by the door. The rest hunt (a new state: they range out after small game and the caterpillar, and leave the meat for foragers) or forage.
- **Idle ants find work** (insight 27): with nothing of its duty in sight for 20 s, an ant out gathering switches to its next duty that needs doing. With nothing on their list to do, ants rest in their room, and the Jobs page says so.
- **More than one of each room** (insight 34, the proposal Mark approved):
  - **Cap:** one of each per queen level (two at level 2, three at level 3…).
  - **Cost:** each copy costs half again more than the last.
  - **Upkeep:** rooms eat food, half a unit a minute for the first of a kind and one for each extra.
  - **Space:** each needs its own dug pocket.
  - What extras add:
    - Hatchery: +2 eggs at a time.
    - Food store: +50% cap.
    - Cistern: +30 water.
    - Nursery: eggs 15% faster, and 3 more nurses can help.
    - Barracks: fighters eat 25% less protein.
    - Workshop: builders half again faster.
  - Tearing one out takes its share away again.
  - The Build sheet shows "1/2" and the upkeep now.
- **The spider kept its body on a rock** (Mark: "the spider clipped through the rock").
  - Cause: it only checked the one tile under its middle, but it's about five tiles across, so its body hung over rocks it skirted. Its stroll past the nest also joined waypoints with straight lines, cutting corners through rock.
  - Fix: it now keeps three tiles of room from any rock, wall or fence, both when planning its walk and when steering. The stroll is a planned path. If it's ever squeezed in somewhere, it only moves to roomier ground.
  - Over 45 simulated minutes its body was over a rock 21.6% of the time; now 0%. It roams as far as before.
- **Tests:** 53 (new: duties ordered and kept across a save, foragers on stone, food first when short and helping elsewhere when full, soldiers keeping a guard and hunting, nurses with and without eggs, the room cap, cost and upkeep, extra rooms adding up and coming off, the spider clear of rocks). The browser test puts stone first on the Jobs page.

## Oct 31: living creatures (build 16)

The second build phase from `PLAYTEST-2.md` (items 21, 22, 25, 26 and 28): the yard's animals act like animals, and you can see a fight land.

- **Four new creatures, spread across the yard.** Mark: "have them spread out through the area, not all bunched in the beginning."
  - Each region holds one of each kind its ground suits (ladybugs where there are aphids), three at most, placed anywhere in the region and at least 12 tiles apart. That's 21 to start, over 14 regions; none within 14 tiles of your nest, and no earwigs within 30.
  - Each keeps to its own patch, wandering within about 9 tiles of where it started.
  - A dormant region gets its bugs when you first walk in.
  - One that dies or leaves is replaced 100–160 s later, out of your sight (ladybugs fly in where you can see them).
  - Bugs with no ant within about 50 tiles wait where they are, which keeps the sim cheap.
  - **Ladybug:** flies in beside your aphids and eats them (1.2 food a second, so a patch stays empty while it feeds). Bite it to half health and it flies off (+1 🧬 the first time). Full, or after three minutes, it leaves anyway. 8 protein if you kill it outright.
  - **Earwig** (bark, mulch, compost, soil, hedges; not in the first four minutes): rushes any ant within 3.5 tiles and pinches for 2 (a forager dies; a soldier takes three). Foragers give it a wide berth. Below 30% health it runs for cover and is gone. 15 protein.
  - **Cricket** (lawns and long grass): hops 3–5 tiles away from any ant that comes near. Five hops and it's worn out for 5 s: that's when you catch it. 25 protein, the richest small game.
  - **Millipede** (compost, mulch, bark, soil, mud): harmless and slow. Bitten, it curls into an armoured ball for 8 s and takes 35% damage. 20 protein for a patient crew.
  - Patrolling fighters within 6 tiles go after them. Your crew and you bite them as you would the caterpillar. Kills pay xp, and the first of each kind +1 🧬.
  - Dead ones lie on their backs, legs up, and shrink as they're carried off.
  - Tap one for its card. Each has a first-sight tip, and a line in Help → Dangers.
- **The spider has habits.**
  - It crouches for a quarter second before it lunges (the tell), then springs.
  - It rears to bite.
  - After a kill it stops for 3.5 s to eat, facing its meal; it only bites back if bitten.
  - Three meals and it is full: it walks back to its web and sleeps for a minute, hunting nothing. "The spider has eaten its fill."
  - It dies on its back with its legs curled, then sinks away.
  - At its web it rests low, breathing slowly.
- **Fights you can see:** every bite throws a spark (pale for yours, red for the spider's and the earwig's, and for rival bites). Whatever is bitten flickers red: ants, the spider, the caterpillar, the new bugs. The caterpillar sags flat when it dies.
- **Rain knocks ants about.** Drops hit ants outside: they tumble a tile or two with a splash, and about a third drop what they carry (it stays on the ground). Your ant gets a smaller push. Raindrops pock the ground all round the view.
- **Sounds:** a tick when a bite lands, the spider's lunge hiss and its crunching meal, the earwig's pinch, the cricket's chirp and hop, the ladybug's buzz, the millipede curling, a squelch when a small bug dies, and a plip when a drop knocks an ant. All are charted in `SOUND.md`.
- **Tests:** 45 (new: the cricket's hops and tiring, the millipede's armour, the ladybug eating and fleeing, the earwig's pinch and the foragers keeping clear, the spider's meals and fullness, its crouch before the lunge, the bodies, rain knocks, sparks, bugs spread over the yard from the start and in a newly woken region, and bugs keeping still with nobody near, replaced out of sight, kept across a save). The browser test bites a millipede till it curls, taps a cricket for its card, and runs rain.

## Oct 31: clarity and feedback (build 15)

The first of the build phases from Mark's brother's playtest (`PLAYTEST-2.md`, items 1–3 and 10–24): the game now says what everything is and what just happened.

- **Notices are colour-coded:** red edge for danger (a raid, the spider, a cave-in, the mower, hunger), green for good news (Genes, a goal, a room finished, an outpost up), gold for something new (a region you walk into), blue for a battle report. The tutorial's own lines stay plain.
- **Things say when they're done:** "Hatchery finished: +2 eggs at a time." When Waypoints is evolved: "Outposts unlocked! Walk far from the nest and press Outpost."
- **Battle reports:** when a raid is beaten off, "Raid over. You lost 3 ants, killed 5 raiders, and they carried off 4 food." When the spider dies: "It cost you 6 ants."
- **The idle queen:** if she sits with no eggs, food to spare and room for more ants for 25 s, "The queen is idle and you have food: tap her in the nest and lay eggs." At most once every 90 s.
- **The ant card:** tap any ant for its name (if it has one), rank, kind, what it's doing ("Elite Forager, on guard", "carrying food home"), its experience and the next rank, and what its kind is for.
- **Names over named ants:** Elites wear their name over them on the surface; Legends get a ★ and gold. That's the twelve nearest the middle of the view.
- **The crew's reach:** holding Recruit shows a gold ring for how far the call carries (7 tiles, 10 with Rallying cry). While you lead a crew, a faint blue ring shows how far they'll follow (16 tiles) before giving up. The Recruit button shows your crew against the cap, such as "12/20", and its tip says how to raise it.
- **What everything is for:** each egg in the queen's sheet has a line ("Nurse: tends the eggs: they hatch faster"). The ant upgrades say "At Veteran (50 xp) it learns" and "At Elite (150 xp) it also learns", not "Veterans learn / Elites add".
- **A Menu button** tops the side column (Main menu: options, sound, new colony). **Escape** opens the menu, or closes whatever is open.
- **"Saved ✓"** shows for a moment each time the game autosaves (every 10 s).
- **Bigger badges** on the buttons, with a dark border, so counts read.
- **The puzzling noise** was the caterpillar's munching, a dull thud every third of a second in the Compost heap. It's now crisp leaf-chewing crunches in uneven pairs, quieter.
- **Tests:** 34 (new: the raid report, a room finished, the idle-queen nudge, the spider's cost). The browser test checks the ant card's text, the names over ants, the recruit ring and the Menu button.

## Oct 30: playtest notes, round two (build 14)

Mark's list after playing on his phone, all addressed:

- **The intro film stuttered and started badly.** It rolled its clock the moment it was made. The yard for its wide shots was built in one hitch on the first frame, more regions loaded mid-film, and every long frame made it jump ahead.
  - It now holds the first frame behind black ("Loading the yard…") until nothing is left to build for ten frames running. Then it compiles its materials, uncovers, and starts its clock and the music together.
  - After that the picture follows the music's clock, so a slow frame never lets them drift apart.
- **No more coloured rings under food.**
- **Pop-ups are simpler and rarer.** Tips are now a small card under the hint that doesn't pause the game and fades after 9 s (tap to dismiss).
  - Each tip shows once, ever: one seen in an earlier colony isn't shown again.
  - Help → Menu → "Show tips again" brings them back.
- **Names on the side buttons.** Nest/Yard, Map, Evolve, Zoom and Help wear their names curved round the circle, like the bottom buttons.
- **Evolution opens its own window.** Evolve, or a tap on the 🧬 chip, opens a full-screen book:
  - dark soil and gold, with drifting spores
  - pages you flip with ‹ › or a swipe: Goals, You, The Ants, Bodies, Senses, Nest, Society, Symbiosis, Ranks
  - each branch drawn as a tree, with nodes glowing gold (evolved), pulsing green (ready), dim (not yet) or dashed (a later build)
  - tap a node for its card (effect, cost, deed), then a big Evolve button, with a burst of light when you do

  The old Evolve sheet is gone.
- **Help is organised** into tabs: Basics, Colony, Growth, Dangers, Menu (main menu, show tips again, start over, the speed test).
- **Water pools.** Puddles are lumpy pools in rings: deep blue in the middle, bright at the shore, a dark wet-mud edge, and ripples spreading across them.
- **Antlion pits look like pits.** Each is a real sand funnel: a raised pale rim, grains streaking down the slope, a dark hole, and the antlion's jaws at the bottom.
- **Your health shows, and so do hits and death.**
  - A labelled ❤ health bar sits beside 🍖 hunger. Both pulse when low.
  - The screen edge flashes red when you're bitten or stung, and beats red while health is under 40%.
  - Dying darkens the screen. The rebirth sheet now opens with "You died" and what killed you, then the choice of what to come back as.
- **The nest's edges don't show.** Zoomed out underground, the soil bands carry on past the cutaway, a little darker, instead of ending at a box edge. Zooming out stops at a little more than the nest's width.
- **Hand-holding for the first minutes.** The intro now runs past the landing, through:
  - fetching food (and what ❤ and 🍖 mean)
  - laying a Builder
  - digging a pocket and placing a Hatchery
  - laying Foragers
  - recruiting a crew
  - laying a trail
  - opening Evolve

  Each step waits for you to do it, pulses the button it names, and has a "Skip tips" button.
- **Your ant is slower, and you can improve it.**
  - It walks at 66 instead of 85, barely faster than a forager's 60.
  - A new **You** page under Evolve has five levels:
    1. Long legs, +15% speed
    2. Thick shell, health 12 → 20, then pick Sprinter (+10% speed) or Iron stomach (hunger drains half as fast)
    3. Strong jaws, bite +50%, then pick Big mandibles (carry 8) or Rallying cry (recruit from 10 tiles)
    4. Swift, +15% speed again
    5. Mastery: Hero (your crew keeps up and bites 20% harder) or Survivor (once a life, a killing blow leaves you at 1 health)

    These carry over every time you're reborn.
- **Weather is gentler.**
  - Rain comes every 8–12 minutes (was 3–5), and the first after 8 minutes (was 4).
  - Twenty seconds before it, thunder rumbles in the distance with a warning to get builders inside.
  - The rain itself is a soft patter (was a bright hiss with a drip every 90 ms), with long rolling thunder now and then.
- **Found while testing: sheets redrew five times a second.** They compared against the browser's own rewrite of their HTML, which never matches, so a tap could land on a button just as it was replaced. They now redraw only when their content changes.
- **Bots** (6 games, 20 minutes): the same pattern as build 13. Seed 21 still loses its queen to raiders; the rest hold 8–15 ants. A slower ant doesn't starve the bot colonies.
- **Tests:** 30 (new: your ant's pace and levels, Thick shell, thunder before rain and the rain interval). The browser test walks the Evolution window's pages, picks and evolves a node, and opens Help's tabs.

## Oct 30: outposts, held regions and the goals board (build 13)

Mark: "Let's build it and then test it." The rest of step 1 of `PROGRESSION.md`. Data in `growth.js` (OUTPOST, GUARDIANS, PRIZES, GOALS, SETS); logic in `sim.js`.

- **Outposts.** Evolve **Waypoints** (Senses: 🧬1 🪨10; its deed, scouting 3 regions, halves the 🧬). Then, out in the yard, an **Outpost** button joins the dock.
  - It costs 10 stone and goes up as a cairn of pebbles with a twig and a leaf for a flag. You and any of your ants within 3 tiles pile it: 30 ant-seconds, so about 30 s alone or a few with a crew. It rises stone by stone.
  - At least 14 tiles from the nest and from other outposts. You can have 2, plus one per queen level, plus one for the Explorer set. None in fire-ant ground.
  - Raised, it lifts the fog 20 tiles round it, and **foragers may roam 26 tiles round it and along a band of road back to the nest**, as they do round home. Trails within 6 tiles of it never fade (except in rain).
  - A foot coming down on it twice, or one pass of the mower, knocks it flat.
  - The button says why when you can't (too close, out of stone, at the cap). Outposts show on the yard map, with ⛳ on the plan.
- **Held regions.** A region is **held** while a raised outpost stands in it and its guardian is beaten. That pays 🧬1 the first time, and the region's **prize**, for as long as the outpost stands.
  - Guardians so far: the spider (the Flowerbed), the pavement ants' queen (the Patio), the fire ants (their two regions, not holdable). Regions whose bosses come in later builds can be held with an outpost alone for now. Home (Under the Rock) has no prize.
  - Prizes: berries, scraps and seed rain grow back twice as fast (Flowerbed, Grill, Feeder); garden aphids refill twice as fast (Tomato Rows, Beans, Peppers, Herbs); water cap +40 (Spigot); eggs hatch 15% faster (Compost); crews carry treats 30% faster (Sandbox); the mower warns twice as early (Lawn); a treat lands every few minutes (Picnic Blanket); feet or birds half as often (Back Steps, Birdbath); twice the pebbles (Woodpile, Rock Garden); acorns (the Oak). Every other region: its food grows half again as fast.
  - Killing the rival queen makes their nest your outpost.
  - The yard plan's region cards now say how to hold each region and what its prize is; held regions show ★.
- **The goals board** (Evolve → Goals, the first tab now):
  - Three goals at a time, next, soon and later, paying 🧬1, 2 and 3. A goal completes once it reaches the board, so the board always points at something new.
  - 24 goals in five themed sets. Finishing a set pays for good:
    - Explorer: one more outpost
    - Garden: foragers carry one more
    - Hunter: fighters bite 10% harder
    - Builder: rooms build 25% faster
    - Colony: eggs hatch 10% faster
- **Choose your rebirth.** When your ant dies, a sheet always opens: come back as a named Elite (build 12), or hatch again as any kind you've unlocked (Forager, Builder, Nurse, Soldier, Venom ant).
- **Tests:** `tests/outposts.test.js` covers the outpost rules, raising one, roaming and lasting trails, holding and losing a region and its prize, the board, a finished set, rebirth as a soldier, and saves. The browser test raises an outpost at the Spigot, holds it, and shoots the Goals tab and the map.
- **Bots:** the bot buys Waypoints after the queen's first upgrade and raises outposts far out. Colony sizes and losses look like build 12.1. Head-to-head, six games a side on two seeds: food income was 33 vs 24 on one seed and 21 vs 27 on the other, so the swing is noise. The bot places outposts blindly, mostly in the home region (no prize), so it rarely holds anything. A player choosing rich regions will.

## Oct 30: three progression decisions

Mark, on the open questions in `PROGRESSION.md`: "No. Yes. House inside."

- **No seasons.** The year-of-four-seasons layer is shelved. Anything that leaned on it (summer heat, winter stores, hibernation) gets another reason or goes.
- **Three great evolutions per colony**, out of twelve, as proposed.
- **After the yard comes the house**, the original plan's Act 2: the edges (sidewalk, driveway, porch, doormat), then the ground floor (kitchen, pantry, bathroom), then the deep house (walls, basement, attic). No separate New Game+ for now.

## Oct 30: no more lines across the ground, softer footsteps (build 12.1)

Mark, playing on his iPhone: dark horizontal lines across the yard as he walks, and "the walking audio is too crisp and sharp. Maybe more muted and low to mid and rounded."

- **The lines were depth fighting.** Under the ground lie two more layers: a dark green underlay (0.6 units down) and each region's far painting. A phone's depth buffer is coarser than a desktop's, so far from the camera it couldn't tell them from the ground. They fought, and with a camera looking north the fight shows as horizontal bands of underlay.
  - Not reproduced at first: the headless test renders are too precise. Faking a coarse depth buffer (a tiny camera near plane) brought the bands straight back on build 12.
  - The fix: both under-layers now draw first and never write depth, so the real ground always wins. The same faked test shows no bands.
  - The far painting also stays under the built ground now, a tile wider, so any crack where a region's fine ground grid meets a coarse unbuilt neighbour shows ground, not dark green.
- **Footsteps** are a soft, low thud (a low-passed grain around 500 Hz and a little thump), not a 6 kHz tick.

## Oct 29: Genes, ant upgrades, veterans and the evolution tree (build 12)

Mark: "Make it so. Start coding it in." This is the first piece of `PROGRESSION.md`, everything that works with what the yard has today. The data lives in `game/src/sim/growth.js`; the sim applies it; the new **Evolve** button (a twist of DNA, under the map button) shows it.

- **🧬 Genes,** earned by playing, never by waiting:
  - 1 for each region you scout for the first time
  - 1 for the first of each kind of thing brought home (a crumb, a berry, dew, a pebble, caterpillar meat…)
  - 1 for every 10 eggs hatched
  - 1 for your first hunt; 3 for the spider (1 each time after); 5 for the rival queen

  A 🧬 chip joins the top bar once you have any, and a chime plays for each.
- **Upgrades for each kind of ant** (Evolve → Ants), bought with materials, once for the whole kind:
  - Forager, Builder and Nurse have five levels; Soldier five; Venom ant three. Levels 2 and 3 are bought by picking one of two abilities, for good; level 5 is a gold "mastery" pick.
  - The Forager's first three levels are the old "Train foragers". That button is now "Train ants · evolve" in the queen's sheet.
  - Every level is shown. The ones costing 🍯 sugar, 🪲 chitin or 🪵 wood say so and can't be bought until those materials arrive. That leaves Forager 1–3, Builder 1–3, Soldier 1–2, Venom 1–2 and Nurse 1–2 buyable now.
  - Live picks:
    - Forager: Trailblazer (stronger trails) or Sprinter (faster off a trail); then Pathfinder (spots food twice as far off) or Hauler (foragers chew pieces off treats and bring them home on their own).
    - Builder: Shorer (cave-ins less than half as likely) or Mason (rooms cost 25% less stone); then Excavator (digs 50% faster) or Field engineer (repairs twice as fast).
    - Soldier: Doorkeeper (raiders steal nothing past a guarded door) or Escort (patrols twice as far; counts against birds from farther).
    - Venom ant: Paralytic (stung spiders and caterpillars slow to half) or Hunter (a kill lays a trail home).
    - Nurse: Wet nurse (eggs cost 30% less food) or Medic training (hurt ants heal in the nest).
  - **The queen's trait** at level IV: Fertile (eggs 20% faster) or Hardy (raiders hurt her less than half as much). Her levels V–VIII and later traits are listed but need sugar.
- **Veteran ranks** (Civilization's unit experience):
  - Ants earn experience at their own job: foragers per load home, builders per cell dug or room built, fighters by biting and killing, nurses per egg hatched, any ant for getting out from under a foot or acorn, a crew for hauling a treat.
  - Five ranks: Callow, Seasoned (10 xp), Veteran (50), Elite (150), Legend (400, or the spider's killing bite). Each makes an ant 10% better at its job, up to 40%.
  - **You can see it:** callows hatch pale, as real ants do, and darken; Veterans stand a little bigger; Elites wear a pale-gold ring and Legends a gold one.
  - **Doctrine:** with dozens of ants, picking per ant would be a chore, so each kind of ant has one setting: which promotion its Veterans learn, and which second one its Elites add (Trailwise, Strongback, Keen nose, Dodger for gatherers; Quick digger, Steady, Packer, Fixer for diggers; Brawler, Guard, Hunter, Skirmisher for fighters; Gentle, Healer for nurses).
  - **Elites get names** (Thorn, Burr, Pip…), Legends a title ("Spider-bane"). Named ants who die are listed under Evolve → Ranks, "The fallen".
  - **Rebirth:** when your ant dies and you have named ants, you can come back as one of them, where it stands, instead of waiting for an egg. The first step of "choose your rebirth".
- **The evolution tree** (Evolve → Evolution): all five branches and their ~60 nodes are listed, with what each needs first. These 15 are live now:
  - Strong mandibles (fighters bite 25% harder), Formic spray (fighters bite from 2 tiles), Stridulation (every fighter answers an alarm), Trail runners (25% faster on a trail).
  - Strong scent (trails last twice as long), Bigger crews and Bigger crews II (recruit 30, then 45).
  - Hatchery II and III (4 and 5 eggs at once), Store II and III (400 and 1,000 food), Insulation (cave-ins halved, rain caves in once not twice).
  - Division of labour (experience 25% faster), Drill hall (fighters hatch Seasoned), Colony memory (every ant hatches Seasoned).
  - Each has a deed that halves its 🧬 once done (for example: Strong mandibles, kill 20 rival ants; Hatchery II, hatch 30 eggs).
  - The rest show faded, "coming in a later build". Respec, the lineage pick and the great evolutions are not built yet.
- **Saves** move to format 11; build 11.6 saves load with everything at zero.
- **Balance.** A first version made fresh ants 10% worse at their jobs. That shrank every bot colony (median 15 ants at 25 minutes, against 27 on build 11.6), because every ant starts fresh, so Callow is now a look only.
- **Bots, 30 minutes, 14 games:** losses match build 11.6 (seed 21 loses its queen to raiders on both builds; the rest survive). Colonies reach 16–58 ants, and earn 15–29 Genes. The bot buys growth only with a full Food store, after the queen, so it spends little; a player choosing well should do better.
- **Tests:** `tests/growth.test.js` covers Genes, the tree's locks and costs, Store II/III, upgrade levels and picks, ranks, rebirth, doctrine and saves. The browser test opens all three Evolve tabs, buys a node, and takes over a Legend.

## Oct 29: the rest of the wish list (build 11.6)

Mark: "Do it all now." Everything left on the backlog, in one build.

- **Slower movement.** Everything outdoors moves at 1.15 instead of 1.4 (`SURF`): your ant, the colony, the spider, raiders. That's about 18% slower. Mark's word was "much slower", but 25% starved every bot colony, so 18% is a compromise.
- **Foragers stay close until trained.**
  - On their own they range 40 tiles of path from the nest, about the home region, or farther only along a scent trail you lay. The old range grew by itself with colony size.
  - **Train foragers** at the queen buys range and speed:
    - level 1: 55 tiles, 10% faster, 🌾15 (affordable before a Food store)
    - level 2: 75 tiles, 20% faster, 🌾40 🪨10
    - level 3: 100 tiles, 30% faster, 🌾80 🥩10 🪨25
  - Far food is reached by scouting and marking the way, or by training.
- **Dug dirt goes somewhere.**
  - Each dug cell is a load a builder carries up the shaft and out to the **spoil heap**, a mound of soil about eight tiles from the entrance that grows with every load.
  - With 3 loads waiting, digging stops until they're hauled.
  - Builders pick hauling themselves, so digging takes real work and builders, and you can see it outside.
  - Saved with the game.
- **The spider, investigated.** Over 30 simulated minutes with a hungry colony foraging, it killed **no ants**:
  - 58% of its time in the Flowerbed, and 30% circling the nest without hunting.
  - Its chase was half an ant's speed and its bite reached barely a tile, so everything outran it.
  - Changed: it now hunts its territory, within 60 tiles of its web.
    - **At its web it waits in ambush,** and ants only notice it close up.
    - It lunges at what wanders within 4 tiles: a fast burst, then a 40-speed run.
    - Roaming, it stalks ants within 5 tiles and gives up after 6 s, so a running ant still escapes.
    - Its bite reaches 1.4 tiles, and it passes the nest every fourth leg (was every third).
  - Result in the same test: about one kill every three minutes, mostly round the Flowerbed. It guards the berries now. Thirty ants or five Venom ants still kill it.
- **The queen looks alive.** She crawls from cell to cell instead of jumping: head down the shaft wall as she digs in, legs walking. Her legs shuffle while she waits for your next tap, and once settled she paces her chamber.
- **Building is a dust cloud.** While a room is built, a pale cloud of dust hides it, with clods of dirt flying out. When it's done the cloud swells and clears, and the furnished room is there. Bricks being dug puff dust as builders chip.
- **Chambers are organic.** A finished room is drawn as one squarish oval with a gently wobbling ceiling and walls and a flat floor, on the same cells. Tunnels stay as they were.
- **Items stand out.** Anything you can pick up sits in a ring of its kind's colour: gold food, blue water, red protein, grey stone, pink treats.
- **More icons:**
  - Each caste and room has its own line icon in the queen and build menus.
  - Costs show as the top bar's resource icons (🌾10 🪨5), not words, and hatch times as ⏱20s.
- **Sound, the rest** (`docs/SOUND.md`):
  - **Music** (`audio/music.js`): synthesized like the effects, in A minor at 92 bpm, an eight-bar loop of pad, bass, marimba and drums. It shifts with the game rather than switching tracks:
    - a title mix, a yard mix and a nest mix
    - a danger layer (fast hats, a low pulse) that rises when the spider is near, raiders march, the queen is hurt or a visitor strikes nearby
    - rain muffles it
  - **Ambience:** breeze and birdsong outside, an earthy hum below, crickets on the lawns, drips in the wet ground, builders chipping while you watch the nest.
  - **The second and third batches:**
    - your footsteps, sheet swishes, the tooltip tick, the map's whoosh, the title stinger
    - a groan when a treat is too heavy, a tummy rumble when you're hungry, bites in fights
    - dig ticks, crumbles, pats, a scrape for repairs
    - the full-colony and full-store chimes, dew twinkles, a cheer for a big haul
    - thunder, and drips as rain ends
    - the spider's feet, the caterpillar munching, the antlion's snap, and a bonk for greyed-out buttons
  - **Options:** Music and Effects each Off, Quiet or Loud, beside Sound on/off.
- **The military playtest bot works again.** It wanted a Barracks first, which costs 30 food when the store holds 20. It now skips rooms it can't afford yet.
- **Bots, 30 minutes:**
  - 6 of 7 colonies survive. Two reach 60 ants; most build every room.
  - One loses its queen to raiders. That seed also lost sometimes before.
  - Growth is slower than build 11 (most stayed 20–40 ants), and starvation is the main cause of death.
  - The bots buy forager training but don't scout far with trails the way a player can, so a human should do better.

## Oct 29: tap a thing to see what it is, and tips with a design (build 11.5)

Mark: "maybe when you click on it, it kind of tells you." And: "Text boxes for the tooltips and stuff, they're a little simple. Let's give them more of a design."

- **Tap anything on the surface for its card** (`ui/callout.js`). A small card pops up over it: an emoji, its name, and one line on what it's for. For example: "Gummy bear: a treat, 50 food, needs a crew of 8." "Puddle: water, it never dries up." "Wolf spider: run!"
  - It covers food, treats, water, pebbles, meat and protein, aphids, the spider, the caterpillar, your ants and rivals, robins and toads, and both nests.
  - It follows the thing as the camera moves and fades after two seconds.
  - The tap still walks your ant there. Food under an ant wins over the ant.
- **Tips and cards share a new look,** matching the title screen: cream, an inked border, a hard shadow, and a pointer to what they name. The button tips use it too.

## Oct 29: smooth rocks, and trails like smoke (build 11.4)

Mark: "Rocks look really jagged on the overworld." And: "smooth out the scent trails. Right now it's just like big squares… maybe like a light smoke that lingers."

- **Rocks are smooth.** Every rock was an icosphere with each vertex pushed in or out at random, drawn as flat facets: spikes and shards. Now each is one welded surface:
  - bulged by a few soft lumps, flattened underneath, and smooth-shaded (`smoothRock` in `yardScenery.js`)
  - this covers the big rock over home (now textured stone, not painted bands), pebbles, boulders and the plain rocks on blocked ground
  - stepping stones keep their flat tops
- **Trails are a drifting haze, not squares.** The overlay now works like this:
  - It has two texels a tile, smoothly filtered.
  - Each frame the trail and alarm scent is blurred a little, so the haze has round edges instead of tile steps.
  - Two layers of slowly drifting noise break it into wisps that move as you watch.
  - It is pale green and more see-through, with a floor so the trail's path stays readable.
  - Alarm scent tints it red, as before.
  - It costs about 1–2 ms a frame with trails everywhere, on the test machine's software renderer.

## Oct 29: sound effects, the first batch (build 11.3)

The plan is `docs/SOUND.md`. Built so far:

- **An engine with no audio files** (`audio/sfx.js`): every sound is synthesized with Web Audio from a few blocks (blip, chirp, puff, thump, grain), like the film's score.
- **Rules for every sound:**
  - Heard from where it happens: panned, fading with distance from the camera, and quieter from inside the nest. Warnings stay audible from anywhere.
  - A cooldown and a cap on copies at once, and a small random pitch and volume change on each play.
  - Sound starts on the first tap, as browsers require.
- **The sim knows nothing of sound.** `audio/watch.js` compares the game each frame with the frame before, plus the sim's new events, and plays what changed: a pickup, an egg, a stomp, a toad's tongue. Loops (rain, the mower, the spider's menace, fire ants) are set to a level every frame and fall silent behind the title screen.
- **About 50 sounds,** covering most of the chart's priority-1 batch: buttons, your ant, the colony's key moments, rain, and every danger's warning and hit. The list is in `SOUND.md`.
- **Options:** Sound on/off covers them. Separate Music and Effects volumes come with the music.

## Oct 29: less reading, and names on the buttons (build 11.2)

Mark: "All the instructions and stuff tend to be a lot of text… we don't want to create reading fatigue." And: "text that revolves around the buttons… on the bottom of the screen."

- **Names curved over the bottom buttons.** Each bottom-bar button wears its short name on an arc over its top: Pick up / Drop / Lift, Trail, Recruit, Release, Enter, and in the nest Dig in, Queen, Build, Exit. They dim with a disabled button. The side buttons keep their hover and long-press tips.
- **Every explainer is one or two short lines** (was a paragraph). For example, Stone is now "Builders fetch pebbles. Stone pays for rooms and queen upgrades." The full numbers stay in the Build and queen sheets, where you need them.
- **The intro steps are one line each,** and the Help sheet is a short reference: goal, controls, resources, ants, rooms, dangers.
- **Messages from the game are shorter too:** "Raid! 5 rivals are coming." "A shadow! Get out from under it!" "A cookie fell by the Patio! Crew of 6 to carry."
- Copy no longer comes from build 6 word for word; `ui/copy.js` says so.

## Oct 29: the film rolls by itself, then a title screen (build 11.1)

Mark: "On the first run… it just starts with that video. And then after that we need an intro screen. Like a main menu… load game, play game, options."

- **No poster.** A new player goes straight into the film. Browsers won't play sound before the first tap, so when sound is blocked the film starts silent with a pulsing "Tap for sound" button. The first tap anywhere starts the score in time with the picture: cues already past are dropped, and the beat picks up mid-bar.
- **The title screen** (`ui/title.js`) comes after the film, and opens every later run instead of it. The logo sits over a slow drift across the live yard round home, with the game paused.
  - **Continue** (once a colony has started) or **Play**.
  - **New colony**, which asks first if there's a colony to lose.
  - **How to play** (the Help sheet), **Options**, and **Watch the intro**.
- **Options,** kept in the browser apart from the save:
  - **Sound:** on or off. The film follows it now; game sounds will too.
  - **Graphics:** Auto (sharp, easing off on a slow device, as before), Sharp (never eases off) or Fast.
- Help's "Watch the film again" became **Main menu**. The film's last button now reads "Continue", into the menu.
- **Load game:** there is one saved colony, so Continue is the load. Save slots can come later if wanted.
- **Fixed: what you've seen was lost on reload.** Since build 10.4 the save wrote the fog-of-war map over the record of what you'd seen. After any reload the film and every explainer came back, as if new. The map now has its own key, and saves written before the fix still load.

## Oct 27: the whole yard, loaded in pieces (build 11)

Mark: "Now let's take the time and thoughtfully build out the entire map area. Let's do it in separate chunks that load when you cross into the other areas for now."

- **The whole yard is built: 70 regions, 800×560 tiles,** out to the fence. The 50 new ones follow the yard plan (`docs/YARD.md` has every region's contents):
  - **Along the house:** the trash cans by the side gate, the porch, the cooler.
  - **West:** the gravel side path, peppers and squash, the herb patch, the garden shed, the thistles and the toad's hole.
  - **East:** the rock garden, the suet feeder, the stepping stones and gnomes, the Oak, its roots and fallen limb, and a hedge along the whole east fence.
  - **South:** the great lawn (sprinkler, trampoline, toys, a fairy ring, daisies), the wet strip (reeds, slugs, a drain, mud), the leaf pile, and fire ant country in the far corner.
  - About 600 landmarks of 40 new kinds, eight new kinds of ground (gravel, deck boards, hedge litter, oak shade, wild grass, wet mud, leaves, fire ant earth), and new food: fallen acorns (a crew of four) and slugs (protein).
- **New dangers.** Each shows itself first, like feet and robins:
  - **Toads** hunt the wild corner, the wet strip and the leaves. Each one flicks its tongue five tiles at the nearest ant, five times, then leaves. Five fighters drive it off.
  - **Acorns** fall under the Oak. They kill what they land on and stay as food.
  - **Bug spray** at the shed: a cloud that kills anything inside it for two seconds.
  - **Fire ants:** their red earth stings our ants a little every half second.
- **Chunks: the scenery is built a region at a time.** A region is built when the camera comes within ¾ of a region of it, and thrown away beyond 1.3 regions.
  - Building is sliced into small steps, at most 6 ms a frame, so crossing into a new region never stalls. A region already on screen gets 24 ms a frame. Whatever is on screen after a jump is built at once.
  - Zoomed out on a wide screen, the view can reach past that ring. The reach then grows to cover the ground on screen, up to 1¼ regions.
  - The opening film builds the regions round home, the patio and the flowerbed while its poster is up.
  - A region thrown away keeps a small painting of its ground for the distance.
  - The scent overlay is now a 96-tile window that follows the camera, instead of a whole-yard texture uploaded every frame.
  - Checked: touring all 70 regions leaves nothing behind (no geometry or textures leak). The busiest region is about 61k vertices; one takes about 0.4 s of work, spread over frames.
- **The sim is not chunked,** only the drawing. All 70 regions are simulated, but the 50 new ones are **dormant** until you first walk into one: no food grows and nothing strikes there. When you enter, its starting food appears and it stays awake. Pathfinding searches a box round the start and goal instead of the whole yard. Scent fades only where there is some.
- **The map is pieced together.** It can't photograph the whole yard at once any more, since most of it isn't built. Instead, each region is photographed the first time it is built near you, and the photos are kept, saved with the game, as one picture. The photo is read back asynchronously, because a plain read-back stalled the frame for seconds in the software renderer.
- **Edges:** the thicket is gone. The house wall runs along the north; a board fence closes the rest, with the neighbours' grass beyond.
- **Saves:** format v10, under `underfoot-v11`. Older saves don't load: the yard is a different size.
- **Deferred:** the rival colonies the plan puts in the new regions (odorous house ants at the trash, Argentine ants in the garden, carpenter ants in the Oak, the fire ants as a real colony with a queen). For now the fire ants are stinging ground.
- **Bots:** in seven 30-minute games all colonies survive, and five reach 40–60 ants. One wins, taking the rival queen at 27:53. The military bot builds no rooms, but it does the same on build 10.4: its barracks-first plan predates the deeper topsoil, so this is the bot, not the build.

## Oct 27: a compact HUD, and a real map with fog of war (build 10.4)

Mark: "Minimize the menu items. Everything looks so big. The words on the bottom… should be symbols or something smaller… same thing with the food symbols up top. Maybe when you highlight over them or press them, it'll tell you… Real estate is massive in a game like this." And: "when I click on map, it's not just squares, but… a realistic version of the map… based on what I can see… a fog of war… I can zoom in on it."

- **Icon buttons.**
  - Every HUD button is now a small round line icon (`ui/icons.js`): 46 px at the bottom, 38 px on the side.
  - Its name is a tip on hover, or on a long press on touch screens; a long press shows the tip instead of acting. The name is also the button's `aria-label`.
  - Numbers ride as a badge: Lift 3/6, Release 4, and a live count while holding Recruit.
  - +200 and Reset moved into Help.
- **Stat chips.** The two-line stats box is one thin row of emoji chips (food, water, protein, stone, ants, plus queen health, rival queen, rain and cave-ins when they matter). Touching a chip says what it is. The ⋯ at the end opens the full colony numbers (income and upkeep, rival count, ants by kind, fps). Hint text and the sheets are smaller and tighter, and the desktop HUD scale is capped at 1.3.
- **Learning the icons.** When a hint tells you to press, tap or hold a button by name, that button pulses, so the intro and hints still teach the controls.
- **The map is a photo of the yard.** The Map button opens a full-screen map. It's the real yard rendered straight down by the game's own renderer (`app.snapshotMap`), with fog and vertex snapping switched off for the shot.
  - **Fog of war:** the sim keeps `seenMap`, a 4×4-tile grid of what you've seen. It's revealed in a 13-tile circle round your ant as you walk, and round home from the start, and is saved with the game.
  - **Display:** unseen ground is under a dark, misty fog with soft edges. Region names appear once you've seen part of a region and it's big enough on screen to label.
  - **Controls:** pinch, scroll, double-tap or the +/− buttons to zoom; drag to pan; tap a spot for that region's card ("Unexplored" if you haven't been there).
  - **Pins:** You, the Nest, and the rival nest once seen.
  - The schematic plan of the whole backyard is still one tap away: "Whole yard".
- **Rejected:** revealing the map wherever any of your ants goes. "Based on what I can see" reads as your ant's own eyes, and it makes exploring with the player ant matter.

## Oct 27: smoother motion and a sharper frame (build 10.3)

Mark: "Can we improve the graphics a bit more? It's a bit choppy still. Keep smoothing out and removing over-pixelation."

- **Choppy motion: the sim steps at 20 Hz and creatures were drawn where the last step left them.** At 60 fps, ants, the spider, the caterpillar and the camera following you moved in visible jumps every third frame. Each creature now remembers where it was before the last step, and is drawn the right fraction of the way between the two (`snapshot`/`blend` in `main.js`). A jump of more than two tiles, such as into or out of the nest, is still drawn as a jump. The sim itself is unchanged.
- **Over-pixelation, all PS1 settings eased back:**
  - Render at the window's CSS resolution: `pixelSize` 1.75 → 1. Big windows coarsen past 2.4 M pixels.
  - Multisampled edges: MSAA ×4 in the framebuffer.
  - Textures filtered smoothly and mipmapped, so far ground no longer shimmers.
  - Affine texture swim off by default.
  - Gentler colour quantising: 96 levels, dither 0.2 (was 48 levels, 0.5).
  - Walk cycles at 14 frames a second (was 10).
  - The PS1 character stays in the low-poly models, palettes and vertex snapping, which is now per screen pixel and barely visible.
- **Automatic quality.** Full resolution is about 3× the pixels of before. Any real GPU is fine with that, but a weak phone might not be. If the game runs under 40 fps for three seconds in a row, it drops one quality step: no MSAA, then 1.5× pixels, then 2×. It never steps back up, so it can't flicker between steps.
- **Rejected:** dropping the sim to a variable timestep. Interpolation gives the same smoothness without touching the sim or its tuning.

## Oct 27: big screens (build 10.2)

Mark tried the itch.io build on a PC: "it's very small".

- **The views were framed for a phone held upright.** The camera fitted 13 tiles across the screen's width. In a wide window that zoomed the world in hard, the HUD stayed phone-sized, and the bottom buttons and sheets stretched edge to edge.
- **Frame by height on wide screens.** `fitWide(aspect)` in `config.js` is 1 on a phone and grows with how much wider the screen is than a phone (390×844). Both views multiply their width by it. A PC shows more of the yard to the sides at the same scale as a phone, instead of magnifying it.
- **Scale the HUD and the PS1 pixels with the window.** `uiScale` is 1 on a phone and up to 1.6 on a desktop (about 1.4 at 1080p). It sets `--ui`, which zooms the HUD, the bars and the sheets. The framebuffer's pixel size grows with it, so the PS1 look and the pixel count stay close to a phone's.
- **Keep the controls together.** The bottom bars and sheets are capped at 560 px wide, centred.
- **itch.io:** embed at a landscape size (e.g. 1280×720) with the fullscreen button on; the game fills whatever frame it gets.

## Oct 27: deeper topsoil (build 10.1)

Mark, on the nest: "First soil should be deeper, and all others are equal."

- **Soft topsoil is now 20 rows deep (was 14).** Packed soil and clay below it are 14 rows each. Clay was 12 rows, because the nest stopped at row 40. The nest is now 48 rows deep.
- **One place for it.** The bands are `SOIL_ROWS = [20, 14, 14]` in `sim.js`. The nest view's soil bands and their labels, the dig rules, the bot and the help text all read from it.
- **Effect:** more of the early nest is cheap to dig before a Workshop is needed. In two 20-minute bot games, both built every room and reached 60 ants.
- **Saves:** format v9, under `underfoot-v10`. Older saves don't load, because the nest grid changed size.

## Oct 27: the first ring of new regions (build 10)

Mark, on the yard map: "That's a great space, let's start building."

- **Build the space out first, ring by ring.** I read "start building" as building out the yard on the map, and left claiming regions for the next step. The ring around the first nine was the natural slice: it touches the house, the vegetable garden and the great lawn, and each new region has something of its own. The built yard is now a 5×4 block of the yard map (columns 2–6, rows 1–4): 20 regions, 400×320 tiles.
- **The eleven new regions:**
  - The **Back Steps**: crumbs and feet.
  - The **Grill**: hot dog scraps as protein, potato chips for a crew of four, and feet under the table.
  - Two **vegetable garden** regions: tomato plants, bean poles and lettuce in dug beds, with **aphid clusters that refill like puddles** (endless honeydew).
  - **Under the Bird Feeder**: the most seed in the yard, and the most birds.
  - The **Birdbath**: splash puddles.
  - The great lawn's top row in long grass: the **Kiddie Pool**, the **Swing Set**, the **Clover Patch**, the **Molehills** (dead bugs) and the **Dandelions**.
  - The full table is in `docs/YARD.md`.
- **Two new dangers, both telegraphed by a shadow,** so they're readable on a phone:
  - **Feet** (Back Steps, Grill, Swing Set): the sneaker from the opening film comes down. Its shadow spreads for 2.2 s, and in the last second two in three ants under it run. Everything under the sole dies.
  - **Robins** (garden, feeder, birdbath, great lawn): a robin drops in, hops after the nearest ant and pecks four times, then leaves. Five fighters around it chase it off.
  - Both only come while ants are out in that region, and only interrupt you (with an explainer) when they land near your ant.
- **Rejected for this ring:** a second rival colony (Argentine ants in the garden) and a mole that surfaces under ants. Both are good, but each needs its own systems; the shadow-strike covers feet and birds with one.
- **Protein near home.** The first bot runs stalled at 20 ants in two games out of four. Caterpillars now spawn across more regions, so a far kill left its meat out of foragers' reach (or under the mower). With no protein there was no barracks, no soldiers, and raiders killed the queen. Fixed two ways:
  - Caterpillars mostly spawn near home again (Lawn, Compost, Flowerbed).
  - Under the Rock and the Lawn now turn up a dead bug now and then.
- **Plumbing:**
  - Regions are looked up by key (`REGION.rock`), not by index.
  - Scent decays only on tiles that have some (`s.hot`). Saves store scent sparsely.
  - Each region's ground is painted the first time the camera comes near, nearest first, so the bigger yard loads as fast as before.
  - The opening film's anchors follow the Patio region wherever the block puts it.
  - Save format v8, under `underfoot-v9`.
- **Bot results** (30-minute runs):
  - All seven games survive.
  - The four sensible games reach 40–60 ants but don't take the rival queen within 30 minutes.
  - Feet kill 0–10 ants a game and birds 0–1.
  - Headless frame rate is 30–40 fps across the regions.
- **Next:** claiming regions and their rewards, aphid tending, and the next ring out (the rest of the vegetable garden and great lawn, the rock garden, the side yard).

## Oct 27: a bigger yard, in regions (build 9)

Mark: things "aren't totally to scale… the ant is either too big or everything is too small… I'd like it to be maybe twice as big." Then: "separate regions that each have their own unique challenges and benefits and rewards… each region is maybe pretty big… like a nice big backyard would be", at "a similar scope to SimAnt's map".

- **Everything is twice as big; the ant isn't.** Before, a soda can was about 5 ant-lengths across (a real one is 20 or more), and the whole yard was about 60 cm at real scale. Now the layout is written in design units and stamped at `SCALE = 2`.
  - A region is 80×80 tiles, about 6×6 phone screens. The built yard is 240×240.
  - Props are twice as tall. Loose stones are now landmarks of their own, up to 4×4 tiles.
  - The Flowerbed has about 70 flowers. The Sandbox has up to seven antlion pits, and the Spigot has four puddles.
  - Ants, the spider, the caterpillar, the nest mound and the trodden patch around it stay the same size, because they're ant-scale.
- **Nine regions.** Today's nine areas are now regions. Each has a danger, a find and a prize, shown on its card on the new yard map. The walk between regions is seamless (a banner names each one).
  - **Rejected:** separate maps with a loading step at each edge. That would need an off-screen summary sim for the colony's own economy, which is a big risk for little gain while the whole yard fits in one sim. It will be needed once the yard is much bigger.
- **The yard map, at SimAnt scope.** A Map button shows the whole backyard: 72 regions on a 10×8 grid, with the house along the top. The built nine sit in the middle and open a card when tapped. The other zones come from the yard sketch (vegetable garden, great lawn, the Oak, the fire ant mound and so on) and are named but greyed out until built.
- **Edges.** The fences are gone, since the built nine sit in the middle of the yard. A thicket of tall weeds closes off the unbuilt yard on three sides, with overgrown ground beyond it out to the fog. The house wall is still north.
- **Pace.** Trips are twice as long, so ants and creatures move 1.4× faster on the surface (real ants cover 10+ body-lengths a second). Food per region is about 1.5–2× (rate, cap, start), and other distances were scaled to match:
  - Forager range: 48–100 tiles.
  - Food sense: 7 tiles.
  - Explore timeout: 60 s.
  - Rival range: 64 tiles.
  - Spider legs: 15–70 tiles. It now rests 30–70 s at its web and goes home more often.
  - The mower sweeps at 4 tiles/s.
- **Bug found by the bot.** Ants only picked up food if they were within 2 px of it at the start of a tick. At the faster speed they often stepped straight past that window and circled food forever. The first bot runs starved, and the rival colony died out. Fixed: the window is now 2 px plus one tick's step.
- **Frame rate.** At first, landmarks, rocks and grass were each merged into one yard-wide mesh, so the whole yard was drawn every frame (24 fps in headless Chromium, down from 38). Now they're merged in 40-tile blocks and the ground in region tiles, so off-screen blocks are culled (about 41 fps). The scent overlay only updates the tiles near the camera.
- **Bot results** (30-minute runs, compared with build 8):
  - Sensible play won once (10:31), lost once (raiders killed the queen at 18:37), and grew to 40–60 ants without winning twice.
  - Build 8 won all four of those seeds, in 13–31 minutes.
  - Idle and cheese play survive. The rival raids 2–7 times per game.
  - It's a little harder, mostly because the rival nest is twice as far away. That's in line with "a fight to survive", so it stays as is for now.
- **The opening film** now places its shots relative to the entrance, the web and the rival crack, so it follows the yard at any scale.
- **Saves:** format v7, under the key `underfoot-v8`. Build 8 saves don't load (the yard changed).
- **Next:** claiming regions and their rewards, supply lines, and opening more of the yard (see `docs/YARD.md`).

## Oct 27: a leg in the shoe, and no hole before the dig (build 8.4)

Mark: "Obviously, a leg and jeans connected to that shoe. And there's already an ant mound hole. Maybe it shouldn't be there until she digs."
- **The sneaker has a leg:** a white sock, then blue jeans with orange seams and a rolled cuff, running up out of frame.
- **No entrance until the queen digs, in the game too.** Our mound and hole are hidden until the queen is placed and founds the nest. Rival nests are unaffected.
- **The film lands her where the game puts her.** The queen now descends onto the actual entrance tile and digs there, so the hole she makes in the film is the hole you play with. The shots and the stomp mark moved to match.

## Oct 27: opening film, second cut (build 8.3)

Mark loved it and asked for four changes. All are done:
- **A funky beat:** "Boom, ta boom, boom, boom, boom."
  - A two-bar loop at 104 BPM: kick and snare on eighths in exactly that pattern, closed hats on sixteenths with an open hat at the end of the bar, and a plucky slap bass following the kicks around E minor pentatonic.
  - It stops dead with a record scratch when the spider appears, picks back up after, cuts to silence as the sneaker's shadow spreads, and returns after the stomp.
- **The shoe looks like a shoe:** a red canvas high-top.
  - Footprint-shaped sole with toe spring, a dark rubber outsole and white midsole.
  - White rubber toe cap, a canvas upper rising to a padded ankle collar with the opening visible.
  - A tongue with criss-cross laces, a side stripe and a heel tab.
- **The UFO sound starts earlier:** a flying-saucer warble (two wobbling tones sliding down) from 0.2 s, the theremin from 1 s, and the fleet in sight from the first card.
- **The queens flew in backwards:** they were turned away from the camera. They now fly nose-first, and the one that descends faces the rock.

## Oct 27: the opening film (build 8.2)

Mark: "a really interesting cinematic intro… kind of comedic… evoking Mars Attacks… zany… film that with the graphics we have."

- **What it is:** a 50-second, 1950s-style alien-invasion short in the spirit of the campy B-movies Mars Attacks spoofed. The gags and cards are original, nothing lifted from the film. It plays in the game engine over the real yard, letterboxed, with flickering film grain, title cards slammed in with a wobble (Bungee and Bungee Shade from Google Fonts, falling back to Impact), and a dusk sky.
- **The beats:**
  1. "From beyond the picket fence…"
  2. A V of winged queens swoops out of the dusk: "They came from the sky!"
  3. One rides a tractor beam down and crash-lands by the rock, with a slide whistle, a boing and dust: "…one of them landed. Sort of."
  4. Her wings pop off like a cheap costume: "She had no wings. No home. And one good idea."
  5. Five pavement ants on the Patio do a synchronised double-take, and one is late: "The locals were not impressed."
  6. The spider turns slowly to camera and its eyes glint: "Something hungry noticed."
  7. A shadow, then a giant red sneaker stomps down beside her and walks off: "And something enormous didn't notice at all."
  8. She digs like mad and vanishes: "So she did what any sensible queen would do…"
  9. The title, "UNDERFOOT!", then "Tap to dig" starts the game.
- **Sound:** synthesised with WebAudio, so there are no audio files: a wobbly theremin score, a slide whistle, a boing, pops, a low menacing swell for the spider, a stomp, digging scratches and a brassy title stinger. A "Roll the film" poster provides the tap browsers need before they play sound. Sound and Skip buttons stay on screen throughout.
- **When it plays:** once, at the start of a player's first colony. Reset doesn't replay it; Help has "Watch the opening film again".
- **Code:**
  - `game/src/intro/cinematic.js`: the shot list, cards, actors and timeline. It borrows the surface view's scene and adds its own camera and props.
  - `game/src/intro/sound.js`: the synthesiser.
  - Cards and the title animate from the film's clock, not CSS timers, so a frame-by-frame recording matches live play.
- **Recording:** `node scripts/film.mjs [dir]` steps the film exactly 1/25 s per frame in headless Chromium, renders the score offline, and muxes both into `underfoot-opening.mp4`, in perfect sync.

## Oct 26: one continuous backyard, and a sketch of the whole yard (build 8.1)

Mark: the areas are "patchy": stark lines between them, left to right and top to bottom. It should look like a natural backyard, one continuous space. He also asked for a flat 2D sketch of the whole yard, with today's map as about 10% of it, sketched but not built.

- **Ground is one continuous yard.** Before, each 40×40 area painted its own ground, so neighbours met at a seam. Now:
  - The whole yard shares one grass-and-dirt base.
  - Each feature blends in around its own landmarks with soft, noisy edges: mulch around flowers and strawberries, sawdust around logs, mud around the tap, hose and puddles, dark soil around the compost, bare dirt around our entrance and the rock.
  - The Lawn's mowed stripes fade toward its edges.
  - Only man-made edges are sharp: the patio slabs, the sandbox frame, the blanket.
  - Grass tufts follow the same blend instead of area lines.

  The sim's areas are unchanged: they still decide food, hazards and names.
- **The whole-yard sketch** is a Design canvas, "Underfoot Yard Map" (claude.ai). Every region is a separate shape, so it can be dragged around. Today's map is the dashed square, about 120×120 tiles of a roughly 400×380-tile yard.

  The new regions:
  - **Along the house:** the porch and back steps, and the grill and table.
  - **West side:** the side yard and gate, the trash cans, the vegetable garden.
  - **South-west:** the garden shed and the wild corner.
  - **South:** the great lawn, with the swing set, kiddie pool, birdbath and bird feeder.
  - **East and south-east:** the rock garden, the hedge row, the Oak, the leaf pile, the low wet strip, and the fire ant mound in the far corner.

  Rival colonies follow the handoff's ladder: pavement ants (Patio, built), odorous house ants (trash cans), Argentine ants (vegetable garden), carpenter ants (the Oak), and fire ants (the mound, the finale). Not built; for Mark to rework.

## Oct 26: the fight to survive, and the 3×3 yard (build 8)

Mark: "We have to add difficulty… depth. The colony is striving to survive. It's a fight. And the player choices are the things that actively fight that off." He also asked for the eight areas around our start, all on one map, with ours in the middle. The direction is written up in `docs/DEPTH.md`, the yard in `docs/YARD.md`.

**The yard is one 120×120-tile map** (`game/src/sim/yard.js`, drawn by `yardScenery.js`): nine 40×40 areas, home in the middle.
- **Patio:** the rival pavement ants.
- **Flowerbed:** the spider's web.
- **Woodpile:** dead bugs, a protein source.
- **Spigot:** puddles that never dry.
- **Compost:** apple cores, the richest food.
- **Sandbox:** treats and antlion pits.
- **Lawn:** seeds and the mower.
- **Picnic blanket:** crumbs and treats.

Each area has its own ground, landmarks, food table and regrowth rate. A brick wall closes the north side and a fence the rest.

**Slice 1, "the fight":**
- **Food near home runs out.** Home regrows 1.2 items a minute, and the store starts at 10. Foragers' range grows with the colony, and past it they follow your trails. Your trails are how the colony reaches far, rich ground.
- **Fighters eat protein:** half a unit a minute each, and they starve without it. Hunts and Woodpile bugs now matter.
- **Raids grow and can kill the queen.**
  - They start at 6:00 with 3 soldiers and add one every 2.5 minutes.
  - Unguarded raiders get into the nest and wound the queen (100 hp, healing 6 a minute).
  - If she dies, the colony is lost.
  - Soldiers patrolling the door turn raids away.
- **Sieges are real battles.**
  - Only fighters count, and Recruit calls fighters first.
  - Eight fighters must hold the rival's door until their queen falls: 1,000 hp, healing 3 a second.
  - Their soldiers come out to defend and fight harder at home.
  - Their army is up to a third of their ants.
- **Treats need a crew you lead:** 6–8 ants. Press Lift; the crew sets the pace, and too few drops it. If the store is full, the excess is wasted.
- **Your ant walks around rocks.** Taps use pathfinding. This was the biggest feel complaint from the last playtest.
- **Hazards:**
  - The mower sweeps the whole Lawn every 4–6 minutes after a warning.
  - Antlion pits pull ants in.
  - The spider walks on paths, rests at its web, passes the nest every few legs (never camping the entrance), and sometimes goes over the fence.
- **Feedback:**
  - Area names appear as you cross into them, with a description the first time.
  - The HUD shows queen and rival-queen health.
  - Explainer cards for raids on the queen, starving soldiers, the mower, starvation and losing.
  - Messages fade after 10 seconds.
- **Saves:** the save format is v6 and the key is `underfoot-v7`. Older colonies can't load and start fresh.

**Playtest results** (`scripts/playtest.mjs`; final round, 30–45 simulated minutes per run):

| Strategy | Result |
|---|---|
| Sensible (4 seeds) | Won at 12:53, 14:15, 22:54, 31:21. Every run had at least one crisis: starvation (4–45 ants), raids on the queen (down to 77–84 hp), the mower (up to 7 ants), the spider. Each run lifted 2–6 treats and made 2–5 hunts. |
| Forager rush | Can't win; no win in 30 minutes. In build 7.5 it won at 7:00–11:00. |
| Hands-off | Stalls at 20 ants. Raids wear the queen down to 39 hp by 25:00. |

The bot reacts instantly, so the fastest wins (about 13 minutes) are faster than a person will manage.

**Known issues:**
- The rival's economy is fragile: in some runs it collapses to 0 ants without being attacked.
- The bot's soldiers-first build order never builds a Barracks; that's a bot bug, not the game.
- In software rendering the yard costs some frame rate: 33–48 fps, against 44–60 before. Needs a real phone.

## Oct 26: first full playtest (build 7.5)

Mark asked for a few gameplay loops: how it plays, how it feels, how far you get.

**How it was played:**
- **`game/scripts/playtest.mjs`:** a bot that plays only through the UI's actions (tap to walk, Pick up, Recruit, the queen sheet, digs, the catalog). It ran 20–45 minutes per style: sensible, military-first, a forager rush on the rival nest, and idle.
- **A real-time phone-size browser session:** about 4.5 minutes per run, playing with real taps.

**How far it goes (sensible play):**
- First food at 0:23.
- 10 ants at about 3:30.
- All six rooms and the 60-ant cap by about 10:00.
- The rival queen dies between 30:00 and 37:00.

**Regressions from build 7.3, fixed:**
- **The roaming spider massacred the colony.** It killed 42–61 ants per 20 minutes; build 7.2 lost 0–6. It patrolled 4.5 tiles from the nest, where foragers are, and lone guards charged it.
  - It now walks past at 7.5 tiles and doesn't hunt on the way unless an ant walks into it.
  - The nest exclusion is back to 6 tiles and its reach to 1.1 tiles.
  - Guards only attack it as a crew of five or more; recruited and led ants still fight.
  - For the first four minutes it keeps 12 tiles away.

  Result: 0–11 deaths per 20 minutes.
- **The opening.**
  - In the browser the spider killed the player 33 seconds after hatching, before any warning, because the warning card waited for the intro to end. It can now show during the intro.
  - A treat card interrupted the intro before the first hatch. Treats now wait three minutes.

**Small bugs, fixed:**
- **Rooms that cost more food than the cap** (Barracks 30, Workshop 25, against a cap of 20) showed "short on: 30 food" forever. A military-first run sat at 20 ants and 0 rooms for 35 minutes. The catalog now says "needs a Food store first (food cap 20)".
- **Foragers stopped fetching stone at 30, but the last queen upgrade needs 40.** They now fetch enough for the next upgrade.

**Found, not fixed (for Mark):**
1. **Tap-to-walk has no pathfinding.** Tap past a rock and your ant walks into it and stops. This is the biggest feel problem in hands-on play.
2. **You can win with zero soldiers.** The siege counts any recruited follower, so 7–14 foragers marched onto the rival entrance win at about 7:00–11:00.
3. **A long mid-game plateau.** Everything is built and capped by about 10:00. From then until the win around 30:00 there is no new goal, and protein piles up unused (300–440).
4. **The 80-ant level starves.** After the last upgrade, upkeep outruns income: food went from 148 to 7 and stayed down.
5. **A new player ant takes over the next egg, whatever its caste.** A Builder you paid for can hatch as your Forager body instead.
6. **The first deliveries are wasted.** Food starts at the cap (20/20), so early trips add nothing until eggs use it up.

## Oct 26: a softer PS1 (build 7.4)

Mark: "I like our graphics, but they are kind of rough to look at… so it's not so hard on the eyes, so fuzzy and so abrasive." This is a small polish, not a style change.

- **Finer pixels:** 1.75 CSS px per PS1 pixel (was 2.25), about 223×482 on a phone.
- **Pixels line up with the screen:** the pixel size is rounded so each PS1 pixel covers a whole number of device pixels. Before, uneven pixel widths shimmered as things moved.
- **Half the dither grain:** dither strength is 0.5 (was 1), with 48 colour levels per channel (was 31), so banding is gentler too.
- **Calmer textures:**
  - Per-texel random speckle is halved, both on the shared texture ramps (0.35 → 0.18) and on the yard ground (0.9 → 0.4).
  - The nest soil has fewer stones, tinted from the soil instead of grey.

## Oct 26: creatures, food and the yard plan (build 7.3)

Mark asked for:
- **Spider:** about twice as big, with more detail and a walking animation. It should roam between areas, but definitely pass the nest every now and then.
- **Caterpillar:** about twice as big and long, with a fuzzy texture and a walking animation.
- **Dew:** should look like dew, not spots.
- **Food:** recognisable kinds, plus the occasional high-quality drop such as candy.
- **The yard:** start planning all of it.

What changed:
- **The spider roams.** This is a sim change.
  - It walks from landmark to landmark across the whole patch.
  - Every third leg it walks an arc 5.5 tiles from the nest. It can't come closer than 4.5 tiles (was 6).
  - After a few legs it sometimes walks off an edge "into the next area" for 40–80 s, then walks back in from a random edge with the health it left with.
  - After a death it also walks in from an edge, no longer appearing mid-map.
  - Its bite reach grew with its body (0.9 → 1.3 tiles).
- **New spider model** (`game/src/render/models/bugs.js`): a wolf spider at 2.6× scale (was 1.3×).
  - A pale stripe and speckles on the abdomen, and banded thorax and legs.
  - Eight eyes with glints, plus fangs, pedipalps and spinnerets.
  - Four-segment legs with bristles.
  - Walking is an 8-frame alternating gait, with knees solved by IK and frames advanced by distance travelled so the feet plant instead of sliding.
  - It turns smoothly, breathes when still, and lifts a foreleg now and then.
- **New caterpillar model:** a woolly bear (black–rust–black) of 10 shaggy segments, each a jittered core with pale-tipped bristles, true legs at the front and prolegs at the back.
  - The body follows the path the head took.
  - A wave of lifting, bunching segments rolls forward as it crawls.
  - It is about 75 px long (was about 40). Ants can bite it from 1.8 tiles (was 1.2).
- **Food has kinds** (`game/src/render/models/food.js`, `FOODS` in the sim):
  - **Everyday food:** bread crumb (5–10), sunflower seed (20), raspberry (10–14), popcorn (12–16). Each has its own shape and colours.
  - **Treats:** a jelly bean (40), cookie piece (35) or gummy bear (50) drops on about 1 in 16 food spawns, one at a time. Treats sparkle, and the drop raises a message and a one-time explainer.
  - Ants carry a piece of whatever they picked up.
- **Dew looks like dew:** clusters of clear, glinting beads, one hanging off a grass blade. The puddle has a lighter rim.
- **Copy:** the hints and Help no longer say "yellow crumbs" or "the green one"; they describe the new food, the fuzzy caterpillar and the roaming spider.
- **The yard plan is a draft:** `docs/YARD.md`. The specs only list the six yard areas in one line each. The draft adds:
  - a map with the house to the north and a start in the south-east corner
  - each area's look, food, creatures, hazard, mechanic and payoff
  - which creatures roam between areas
  - a food catalog and a build order

  Three questions there are for Mark.

## Oct 26: builders cost time, rounded tunnels (build 7.2)

Mark: no CRT filter, and the wobble is "maybe a little bit too jittery". He liked the rounded tunnels in the mockups. Builders "break every brick that they're in contact with", bricks break before builders reach them, and rooms start building before anyone arrives: "Make it so it costs time."

- **No CRT filter.** It is dropped from the to-do list.
- **Half the jitter.** Vertices now snap to the framebuffer's own pixel grid instead of a grid half as fine (`RENDER.snapDivisor` 2 → 1).
- **Builders work one job at a time, on site.** This is the first change to the sim since build 6. Before, every builder near any order counted toward all of them, so one ant chipped several bricks at once, and work started from 2.5 cells away. Now:
  - Each builder claims one task: a dig, a fill, a repair, or a room.
  - Each brick takes one builder; a room takes up to three, spread along its floor.
  - Work only counts once the builder is standing at the job. A dig is worked from the dug cell next to it.
  - Soil takes longer: 6, 12 and 20 builder-seconds for soft, packed and clay (was 4, 8 and 14).

  `game/tests/builders.test.js` checks all of this. It also fixes the earlier "pocket ordered all at once never finishes" quirk: a 4×3 pocket now finishes in about a minute with three builders.
- **Rounded tunnels.** The nest grid is unchanged; only the drawing is new. Each dug cell becomes a rounded box, the boxes blend into one smooth field, and marching squares (`game/src/render/geometry/contour.js`) trace its outline into extruded soil. A brick being dug grows a rounded bite from the side the builder works on, in quarters, which replaces the old square chip overlay. Rebuilding takes about 15–20 ms and only happens when a cell or a dig quarter changes.
- **Tunnels read darker.** The nest's back wall and the tunnel side walls are darker, so the rounded shapes stand out from the soil face.

## Oct 26: first phone feedback (build 7.1)

Mark, playing on his phone: the grass blinked and clipped with the nest hole; ants that aren't moving should stay still, maybe with a slight breathing animation; start giving each room its own decorations.

- **Hole flicker fixed.** The green scent overlay was drawn over the nest hole, and the near-coplanar layers (ground, scent, hole) z-fought as the vertices snapped. The hole now sits above the overlay in a fixed draw order with polygon offsets, and is wide enough to cover the mound's opening.
- **Still ants hold still.** The renderer tracks each creature's movement. An ant that hasn't moved for 0.25 s switches to a standing pose and breathes, its body swelling about 4%. Builders on a job scrape (a slow two-frame cycle) and fighters bite (a fast one). The queen and the spider breathe too.
- **Every room has its own look** (`game/src/render/models/roomDecor.js`): a painted back wall plus props that react to the colony.
  - **Queen's chamber:** a woven fungal wall, a moss bed, her shed wings pinned up as a trophy, a glow-worm lamp and a petal rug.
  - **Hatchery:** straw walls, straw bowls under the eggs, a warming stone that glows, and condensation beads.
  - **Food store:** carved seed niches that fill with stock, heaps that grow, and a sugar crystal once it is half full.
  - **Cistern:** wet stone, a pool that rises with water, a floating leaf, and drips falling from roots.
  - **Nursery:** silk walls, wriggling larvae in silk cradles, a row of pupae, and silk threads.
  - **Barracks:** tally marks on the wall, a thorn weapon rack, a beetle-husk training dummy, a leaf banner, and sleeping soldiers.
  - **Workshop:** stone-block walls, a stone workbench with a leaf on it, a twig bundle, a stone stack that grows with stone stock, and sawdust.
- Eggs now pulse gently. The dots marking where you can dig are smaller and fainter.

## Oct 26: the game starts (`game/`)

Mark: "Let's build the game starting with our file structure and then building using ps1."

- **Engine: Three.js, not Phaser 3.** The PS1 look comes from 3D-hardware quirks (vertex snapping, affine textures), which a 2D sprite engine can only fake. This overrides the handoff's Phaser 3 plan (§4.1, §5.2) and its "2D top-down; 3D later" view lock (§2.4, §5.3). Babylon.js remains a valid alternative: the renderer is isolated in `game/src/render/`, so swapping it touches nothing else.
- **Views:** the views stay what §2.4 describes, a top-down surface and a side-on nest, but both are now 3D. The surface camera sits at a PS1-style three-quarter angle. The nest is a real cutaway with tunnel depth.
- **Structure:** a Vite + ES-module project (Three.js 0.180.0, Vite 6.3.5) with the folders sim / render / ui / input / game. The handoff's "no build step" choice suited a single-file prototype; a game needs modules, tests and a production build. `npm run build` still produces a static site that publishes anywhere.
- **The sim is unchanged.** `game/src/sim/sim.js` is build 6's `sim.js`; only its export line differs. Everything else reads its state and calls its public API.
- **Crowds are instanced.** Each body plan is baked into three walk frames and drawn as instanced meshes, so `+200` ants is a few draw calls. In headless Chromium, using software rendering, 200 ants ran at about 45 fps; real phone numbers are still to come.
- **Small behaviour changes from build 6:** in-page confirmations replace `confirm()`, two stale hints are fixed, and the HUD hint no longer runs under the side buttons. `game/README.md` lists them all.
- **Tests:** `npm test` runs headless simulation tests (founding, hatching, determinism, a 200-ant stress run, save round-trip). `npm run test:e2e` plays the opening in a browser and screenshots each step.
- **Noticed while testing, not yet investigated:** in a scripted test, a 4×3 pocket ordered all at once did not finish digging in 150 simulated seconds, while the same pocket ordered row by row did. This may be a sim quirk with orders whose only neighbour is another pending order. Worth checking in play.

## Oct 26: art direction

**2D style mockups built, then set aside.** `art-direction/` renders the shared brief scene in ten 2D canvas styles, exactly as `UNDERFOOT_STYLE_BRIEF.md` specified. Mark's verdict: "none of that would work". He felt the brief's author had misunderstood, and asked for real game art styles built with Three.js instead.

**3D style exploration.** `art-direction-3d/` renders the same nest as a live Three.js diorama in ten game art styles: low-poly, toon, claymation, macro, voxel, HD-2D, bioluminescent, toy ant farm, PS1 retro and papercraft.

**PS1 retro is the favourite.** Mark: "PS1 retro is the win so far". A retro-console family was then built around it: PS1 on a CRT, N64, Sega Saturn, Haunted PS2, Nintendo DS, Quake software renderer and 1-bit dither. All share one pipeline, `art-direction-3d/retro.js`, so traits can be mixed cheaply. No final pick yet.

### Open gaps this creates (flagged, not decided)

- **Renderer vs. style.** The handoff locks a 2D top-down view (§2.4), Phaser 3 as the production renderer (§4.1, §5.2), and 3D as "a later experiment" (§5.3). The PS1 look is defined by 3D-hardware quirks: vertex snapping, affine texture swim and fog. There are three ways to keep it:
  1. Render in 3D with Babylon.js or Three.js. This keeps the real wobble, and Mark already uses Babylon.js.
  2. Pre-render PS1-style sprites and tiles and keep Phaser 3. The wobble is lost; the palette, dither and low resolution stay.
  3. Make the PS1 look a 3D isometric experiment layered over the existing sim.

  `sim.js` has no DOM, so any of these leaves the simulation intact.
- **Only the nest cutaway has been mocked.** The game spends about half its time on the top-down surface view, which no style mockup covers yet. Pick-by-eye should include a surface shot before locking a style.
- **Scale.** The mockups show about 10 ants. The target is 1,000 at 60 fps on a mid-range phone (§5.2). None of the styles have been measured on a phone.

## Prototype housekeeping (Oct 26)

- The build 6 prototype and the handoff docs are now in the repo (`prototype/`, `docs/`).
- `prototype/smoke-test.js` pointed at a sandbox path (`/mnt/user-data/outputs/…`) and a missing `sim5.js`. It now resolves both relative to itself: run `node prototype/smoke-test.js`.
- The smoke run gets through the intro, the queen menu and the build catalog. Its scripted dig taps then queue no orders, so placing the hatchery fails with "no 4×3 pocket dug yet". This is probably the script's tap coordinates rather than a game bug, but that is unconfirmed.
