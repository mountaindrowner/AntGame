# Phase 6: save slots, thought through (build 76)

Playtest 3's last phase ([`PLAYTEST-3.md`](PLAYTEST-3.md)).

## 1. Save slots

- **Asked:** "Is there a save? No, right? It auto saves? Yeah, that's good. But it'd be good to have, like, save files, like different options. So you can have different nests."
- **Means:**
  - Keep the autosave (he likes it).
  - Let one player keep several colonies side by side: try a different strategy without losing the nest you've built.
  - Starting a new colony shouldn't mean throwing the old one away.
- **Today:**
  - One colony, saved every ten seconds in the browser (with a backup a minute old, and the map's photos).
  - "New colony" on the title screen warns "this one is lost for good" and wipes it.
- **Others:**
  - Stardew Valley, RimWorld, Don't Starve and Civilization: a list of saves, each with its name, a few numbers (day, colonists, money), when it was last played, and Load and Delete.
  - Console games: three fixed slots; an empty one says "New game".
  - Most also let you copy a save out as a file.
- **Design:**
  - **Three colonies,** each autosaved as now. Each has a name ("Colony 1" until you rename it), and its card shows:
    - day, ants and queen level;
    - time played;
    - when it was last played.
  - **The title screen:**
    - **Continue** goes back to the colony you last played;
    - **Colonies** opens the three cards, with Play, Rename and Delete on each, or **New colony** on an empty one.
  - **New colony** no longer wipes anything. It asks which slot; a full slot asks before it's overwritten.
  - **Save files:**
    - **Export** downloads the colony as a file;
    - **Import** loads one into an empty slot (or one you agree to overwrite).
    - Good for backups, or for moving a nest to another computer.
  - **Under the hood:** the colony you're playing stays where it is in the browser's storage. The other two wait in the browser's larger database (IndexedDB), so three colonies and their maps fit. Switching colonies saves the one you're in, swaps them over and reloads.
  - **Your old save** becomes Colony 1.

## 2. Phase 2 note: the ants don't eat people

- **Asked:** "Once we get into phase two. We don't want them eating people or kids or anything."
- **Means:** when the game moves into the house, people are a force of nature (feet, the mower, spray, the trash), never prey. Ants take food from people, not people as food.
- **Design:** recorded as a rule for the house phase's design (in [`BACKLOG.md`](BACKLOG.md)). Nothing to build now.

## 3. An ant religion

- Noted, not planned (Mark).
