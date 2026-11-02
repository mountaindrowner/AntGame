# Backlog

Mark's wish list after build 11 (Oct 28). Grouped by area, in his words where they matter. "Notes" are first thoughts and open questions, not decisions. When an item is picked up, its decision goes in `DECISIONS.md` and it comes off this list.

Everything from Oct 28 is built (build 11.6, `DECISIONS.md`). What's left:

## Still open (Nov 2, after build 28)

**Waiting on Mark's word**
- **The itch page's text and screenshots** date from Oct 30 (around build 18). They need refreshing for builds 19–28.
- **The house's inside.** Mark: "later". The outside is built for it (`models/house.js`).
- **The grand arc** (yard → house → neighbourhood → city → world → space). This needs a design document first.
- **Combat plan (`COMBAT.md`):** crew attack (26), duels (27) and raids (28) are built. Still to build:
  - the zone frame: built (build 39). There's a crest per zone on the map, "Zones taken", and the Phase 1 end screen. Hazards ease per guardian (builds 30–36).
  - the new guardians: the Old Robin (built, build 30), Old Warty (build 31), the praying mantis (build 34), the black widow (build 35) and the giant centipede (build 36). All done; the yellowjackets are optional.
  - Crew orders: built (build 29). Formations were left out.
- **Sit-downs Mark asked for:**
  - the War camp and the other rooms left
  - The robin and the Phase 1 cap now have proposals in `COMBAT.md`: the robin becomes the Great Lawn's guardian, and Phase 1 ends when all 13 zone guardians fall.
- **Phase 2 scaling** (Mark's "radioactive waste" in the house) and the great evolutions: later phases.

**Gameplay**
- **Slowing the whole colony:** dropped. Mark: "don't slow the colony further."
- **The long game starves** (bot campaigns, build 25.1). At 40 to 60 ants, upkeep runs past what the yard near the nest regrows. Starvation deaths reach 200 to 300 over 200 minutes. Part of this is the bot, part is the economy. For the combat and economy sit-down.
- **Rooms not built yet** (`ROOMS.md`):
  - War camp (a room with Raiders)
  - Gatehouse (Doorkeepers)
  - Silk loom (Weavers)
  - Brood vault
  - Solarium
  - Beetle lodge
  - Royal chamber with winged queens and real satellite nests

  The nodes behind them already do something smaller (build 24).
- **Great evolutions:** three a colony, from the list in `growth.js` (Living Bridges, Raft Colony, Supercolony…). The list exists, but nothing uses it.
- **A rival trait not built:** odorous house ants stealing from your trails. They are now a swarm (build 25.1), but they don't steal.

**Testing**
- **Bots still don't save up for the evolved rooms:** they build them once established (build 25.1), but rarely get there. `CAMPAIGN=1` runs the long game.
- **Flaky tests,** which pass when run alone: the robin test, "a room only builds with a builder inside it" (about 1 run in 6), and, rarely, the duel test "a fight on the ground" (it depends on the dice), "medics heal the wounded", and "pointing at a rival ant: the crew kills it" (about 1 run in 5 inside the full suite, never alone).

**Later, by Mark's call**
- **A phone pass in Phase 3 or 4** (Mark).
- **Camera tilt near the house:** no. Mark: keep it close up.
