# Backlog

Mark's wish list after build 11 (Oct 28), not started. Grouped by area, in his words where they matter. "Notes" are first thoughts and open questions, not decisions. When an item is picked up, its decision goes in `DECISIONS.md` and it comes off this list.

## Sound

- **Charted** in [`SOUND.md`](SOUND.md), and the **first batch is built** (11.3). Next: ambience beds, the music layers, then priority 2 and 3 polish.

## Look and feel

- **Movement starts slower** (Mark: "a little fast, we should probably start much slower").
  - Open: which movement (your ant, every ant, or the camera following), and should speed then be something you upgrade?
- **The queen at the start looks alive.** She sits still now; she should look like she's crawling down the walls as she digs in.
- **A construction animation:** dust and dirt kick up and cover the room. When the dust clears, the room is built.
- **Chambers aren't perfect shapes.** A dug room keeps the same footprint but looks a little oblong and organic.
- **Smoother rocks on the surface.** The overworld rocks look too jagged.
- **Scent trails look like scent:** a light, lingering smoke rather than big squares (the overlay is one square per tile now).

## Readability

- **Surface items should be obvious at a glance.** Some are, some aren't.
- **Tapping an item tells you what it is.**
- **More icons ("techify almost everything").** Mark likes the HUD icons; carry the same style further.
- **Tooltips with more design.** The current boxes are plain.

## Gameplay

- **Dug soil has to go somewhere.** Diggers carry each load of dirt up and dump it on the surface, so digging takes real time and work. It piles up somewhere out of the way, a bit away from the entrance.
  - Notes: that pile would make a real spoil mound outside the nest that grows with it, which the surface view can show.
- **Foragers stay close unless you lead them out.** On their own they forage only within some distance of the nest. They go further after an upgrade, or along a scent trail you've laid. This keeps the game from playing itself.
  - Notes: this pairs with the 50 dormant regions. Far food is only reachable if you scout it and mark the way.
- **Investigate the spider's AI:** what it does and why, then decide what it should do.
  - Notes: today, per `YARD.md`, it rests at its web for 30–70 s, roams the yard on paths, passes near the nest every third leg (never within 6 tiles), and sometimes leaves over the fence. The investigation should check this against `sim.js` and what players actually see.

## Already noted elsewhere

- Rival colonies in the new regions (trash cans, vegetable garden, the Oak, the fire ants as a real colony): `YARD.md`, "Next for the yard".
- The military playtest bot builds no rooms (its barracks-first plan predates the deeper topsoil): `DECISIONS.md`, build 11.
