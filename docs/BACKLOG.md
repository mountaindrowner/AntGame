# Backlog

Mark's wish list after build 11 (Oct 28). Grouped by area, in his words where they matter. "Notes" are first thoughts and open questions, not decisions. When an item is picked up, its decision goes in `DECISIONS.md` and it comes off this list.

Everything from Oct 28 is built (build 11.6, `DECISIONS.md`). What's left:

## Still open (Nov 1, after build 25)

**Waiting on Mark's word**
- **The house's inside.** Mark: "later". The outside is built for it (`models/house.js`).
- **The grand arc** (yard → house → neighbourhood → city → world → space). This needs a design document first.

**Gameplay**
- **Slowing the whole colony.** Your ant is slower (build 22.1). Slowing everyone by 6–13% starved the bot colonies. It needs more food near home, or fewer threats early.
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
- **A rival trait not built:** odorous house ants stealing from your trails. For now they're just many and weak.

**Testing**
- **The bots don't use rooms or kinds from builds 23–25.** So their balance checks don't cover those rooms.
- **A flaky test:** the robin test sometimes fails in a full test run, and passes on its own.

**Later, by Mark's call**
- **A phone pass.** PC first for now.
- **A camera tilt near the house,** so more of it shows in play. Offered, not asked for.
