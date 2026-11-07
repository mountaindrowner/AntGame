# Backlog

Mark's wish list after build 11 (Oct 28). Grouped by area, in his words where they matter. "Notes" are first thoughts and open questions, not decisions. When an item is picked up, its decision goes in `DECISIONS.md` and it comes off this list.

Everything from Oct 28 is built (build 11.6, `DECISIONS.md`). What's left:

## Playtest 3 (Nov 6)

Broken into six phases in [`PLAYTEST-3.md`](PLAYTEST-3.md), worked piece by piece with Mark: Phase 1 polishes what build 68 added, then combat, creatures, the nest (his decisions first), the yard, bigger systems.

## Still open (Nov 4, after build 52)

**Proposed, waiting on Mark**
- **Phase 2, the house:** the Takeover (build 58) opens its back door. Needs a design document (the grand arc, the "radioactive waste").
  - **A rule for it (Mark, playtest 3):** "We don't want them eating people or kids or anything." People are a force of nature (feet, the mower, spray, the trash), never prey: ants take people's food, never people.
- **Balance levers from the stress run (build 47), Mark's call:**
  - meat is the late-game ceiling (the Egg larder and the Blue Butterfly Pact help, by design not fully);
  - forager return about 2.5× upkeep (real ants 4–9×), so about 40% of a colony must forage;
  - sugar only feeds the colony in a famine (real supercolonies run on honeydew);
  - guardian fights won by sheer numbers (a biter cap of about 10–12 was suggested);
  - majors trivialise raids; fire ants collapsed;
  - early starvation in every run by minute 40.
- **Stored glowrock being dangerous** (left out of build 52; with the wilds).
- **The grand arc** (yard → house → neighbourhood → city → world → space) and **Phase 2** (the "radioactive waste" in the house): needs a design document.
- **The house's inside:** "later".
- **Boss characters** (names, looks, the eye-patch robin): "later".
- **The itch page's text and screenshots** date from build 18.

**Daughters, still to do**
- Walking about inside a daughter's nest (you look round from her shaft).
- Her rooms' own looks (they borrow the main nest's nearest kin).
- War Camp soldiers marching to your guardian fights, as well as your crew (the Army of the March does the crew).

**Known gaps**
- **Rooms from `ROOMS.md` not built:** Gatehouse (Doorkeepers), Silk loom (Weavers), Brood vault, Solarium, Beetle lodge. The nodes behind them do something smaller (build 24).
- Odorous house ants don't steal from your trails.
- Nest sections: shut ground could read darker; builders break in from where they stand.
- From the build 40 audit, left as is: heat tolerance and social stomach are situational; granary and store overlap; surplus ranchers, medics, repletes and undertakers idle; falls of feet and birds in progress aren't saved; room levels live in two places.

**Testing**
- **The bot can't reach the late game** (stalls at queen level 2), so time-to-daughters and time-to-Supercolony are estimates (about 2.5–3 hours to five daughters, 4–6 hours for the tree).
- **Frame rate on a real phone** is unmeasured (the browser test machine was too loaded).
- **Flaky tests** that pass alone: "a room only builds with a builder inside it" (about 1 in 6), the duel "a fight on the ground", "medics heal the wounded", "pointing at a rival ant: the crew kills it". The robin test is fixed (build 52).

**Later, by Mark's call**
- **A phone pass in Phase 3 or 4.**
- **Camera tilt near the house:** no. Keep it close up.

**Done since build 28** (details in `DECISIONS.md`): crew orders (29), the five guardians (30–36), your ant's abilities (32), zones and the Phase 1 ending (39), the audit (40), nest expansion with sections, bedrock and the 100 cap (42), day and night (43), UI themes with Town Hall (44), speed (45), the nuptial flight and all five daughters (46, 49), the stress run and fixes (47), the Egg larder (48), daughters' nests, rooms and tunnels with the tree gated (50), the great evolutions (51) and glowrock (52). The War Camp, Royal chamber with winged queens, and satellite nests from the rooms list are done as daughters.
