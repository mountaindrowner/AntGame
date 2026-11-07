# Phase 4: the nest as a place, thought through (build 74)

Playtest 3's fourth phase ([`PLAYTEST-3.md`](PLAYTEST-3.md)). Mark's decisions, after build 73:

- "Only in a closed chamber and hallway."
- "Place myself, and yes drag to dig."
- "I think if we can birth it as different ants it should have those abilities, or what else is it for?"
- "And yes crew and water good."

Each piece has:
- **Asked:** Mark's words.
- **Means:** what's actually wanted.
- **Today:** how the game does it now.
- **Others:** how other games, or nature, do it.
- **Design:** what the build does.

Build 74 does all nine.

## 1. Rooms need walls and a way in

- **Asked:** "Any smart player is just gonna dig out every bit of dirt… it needs walls, it needs an entrance." Decision: "Only in a closed chamber and hallway."
- **Means:**
  - A room is a chamber: dirt on every side, entered by a passage.
  - Digging the whole nest out into one cave and dropping rooms anywhere should not work.
  - The shape of your nest should be a plan you make: chambers off hallways.
- **Today:**
  - A room fits wherever its whole footprint is dug.
  - Walls don't matter, so an open cave takes rooms anywhere, side by side.
- **Others:**
  - Dwarf Fortress and RimWorld: a room is an enclosed space with walls and a door; an open area isn't a room.
  - Dungeon Keeper: you dig, then claim the space as a room; it's sized by what you dug.
  - Real ants: chambers are pockets off galleries, joined by narrow passages, each with its own entrance.
- **Design:**
  - **The rule:** every cell touching the room's footprint (its wall) must be solid dirt, except one or two **doorways**: tunnel cells that lead out to a hallway.
    - No doorway: no way in.
    - Three or more: "too open, a room needs walls".
    - A wall shared with another room isn't allowed; leave a row of dirt between them.
  - **Walls stay walls.** A dig order that would open a third doorway into a room is refused ("that's the room's wall").
  - **Rooms already built stay as they are.** The rule applies to new rooms; the queen's chamber is your first, dug by her.

## 2. Choose where a room goes

- **Asked:** "It just places in the nearest space." Decision: "Place myself."
- **Means:**
  - You decide where a room goes, and see it before you commit: its footprint, its walls, its door.
  - With the chamber rule, you need to see *why* a spot won't work.
- **Today:**
  - Choose a room, and every dug cell that could start one lights green.
  - Tap one and the room snaps to the first fit around it.
  - You have to dig the pocket first, cell by cell.
- **Others:**
  - Every builder (SimCity, Age of Empires, StarCraft, RimWorld): a ghost of the building follows the cursor, green where it fits, red where it doesn't, and a click places it.
  - RimWorld and Dwarf Fortress place a blueprint on rock; the workers dig and build it.
  - Factorio shows exactly which tiles block, and why.
- **Design:**
  - **A ghost follows the cursor** in the nest: the room's footprint at its real size.
    - **Green** when it fits, **red** when it doesn't, with the reason under it ("too open: a room needs walls", "no way in", "needs a Workshop to dig packed soil").
    - Its **wall** is outlined, and its **doorways** are drawn gold.
    - It **snaps**: of the places that would hold the room over the cursor, it takes the one needing the least digging.
  - **A blueprint on dirt.** The ghost can sit on solid soil next to a hallway.
    - Click and it's placed as a plan. Its cells, and a doorway to the nearest tunnel if it needs one, become dig orders.
    - Builders dig it out, then build the room.
    - The plan's digs don't count towards the 16-order limit.
    - Cancel gives everything back, as now.
  - **On touch:** the first tap puts the ghost there; a tap inside the ghost places it.
  - **Right-click or Esc** stops placing.

## 3. Drag to dig

- **Asked:** "Work on the digging tool… drag select." Decision: "Yes drag to dig."
- **Means:** a tunnel should be one stroke, not twenty taps.
- **Today:**
  - Each tap on soil next to a tunnel adds one dig order (16 at most).
  - Dragging pans the view.
- **Others:**
  - Dungeon Keeper and Dwarf Fortress: drag a rectangle to mark rock for digging.
  - RimWorld: drag to designate mining.
  - Oxygen Not Included: drag to dig, drag again to cancel.
  - The common thread: paint the plan, and the workers come.
- **Design:**
  - **With the mouse:**
    - **Drag from soil** paints a tunnel: every cell you pass gets a dig order, joined up even if the mouse jumps.
    - **Drag from a dig order** erases orders instead.
    - **Drag from a tunnel or room**, or with the right button, pans as before.
  - **On touch:** hold a moment on soil, then drag to paint; a quick drag still pans.
  - **More orders:** the limit goes from 16 to 40, so a painted tunnel fits.
  - Painting **stops at a reason** (locked ground, a room's wall, packed soil without a Workshop), and the reason shows once.

## 4. Rooms grow when upgraded

- **Asked:** "The hatchery would upgrade in the way it looks… a little bit of space."
- **Means:** an upgrade should show. A level II room should look bigger and busier than a level I.
- **Today:**
  - Eight rooms (the garden, the barn, the infirmary and the rest) have levels II and III, which change numbers only.
  - The six basic rooms (hatchery, store, cistern, nursery, barracks, workshop) have no levels; another copy is how they grow.
- **Others:**
  - Clash of Clans and Age of Empires: each level of a building has its own look, bigger and richer.
  - Dungeon Keeper: a room's power is its size.
- **Design:**
  - **A level adds a column.** When a room goes up a level, builders dig it one cell wider, on whichever side keeps the wall and the door. If neither side can, the room stays its size and only its look changes.
  - **And dressing:** the room's dressing spreads to fill the wider room.
  - **The basic rooms:** giving them levels too is a balance change, so it's Mark's call. Until then, they grow by copies.

## 5. Light in the rooms

- **Asked:** "The nest is all a little flat… each room comes with a little bit of lighting."
- **Means:** depth and warmth. Rooms should be pools of light in a dark earth, so the nest reads as places joined by passages.
- **Today:** each room has a faint warm light, but the whole nest is lit evenly from above, so the light doesn't show.
- **Others:**
  - Dungeon Keeper: torches on walls, dark between.
  - Don't Starve and Darkest Dungeon: light as mood.
  - Real ants have no light; but glow-worms and fungus glow, which fits the game's green glow.
- **Design:**
  - **Darker earth and tunnels,** less light from above.
  - **A lamp in each room,** a glowing bulb hanging from a root, its colour chosen by the room (green in the fungus garden, amber in the honeypot vault, cool in the cistern and infirmary), with a pool of light that flickers. Ten rooms are lit at a time: the ten nearest the view.
  - **Passages lit faintly,** so you can still see your ants.

## 6. Fog below the first layer

- **Asked:** "A fog that hides everything underneath… more discovery."
- **Means:** the deep should be unknown until you dig towards it: what's down there (the sections, finds, glowrock, bedrock prizes) is a surprise.
- **Today:** all the nest is drawn: every section, the bedrock and the glowing rocks are visible from the start.
- **Others:**
  - Fog of war in every strategy game.
  - Terraria and Minecraft: what's under the ground is dark until you get there.
  - Dungeon Keeper: unexplored rock is just rock.
- **Design:**
  - **Below the topsoil, the earth is dark** except within three cells of your tunnels, shading in over the next two, and on past the cutaway's edges.
  - **The fog lifts as you dig** and stays lifted.
  - Shut sections show their name and price, and bedrock prizes their glint, only once you've dug near them.

## 7. Faster passages

- **Asked:** "Faster passages, an upgrade."
- **Means:** a big nest should stay quick to cross. Walking from the deep to the door shouldn't take a minute.
- **Today:** ants walk at four-fifths of their yard pace in the nest. Highways (an evolution) speeds trails in the yard only.
- **Others:**
  - Roads in every city builder (Age of Empires 4, Anno, Settlers) speed workers.
  - Real ants pack and smooth their main galleries.
- **Design:**
  - **Packed passages,** bought once in the Build menu (needs a Workshop): every ant in the nest walks 40% faster.
  - Its cost is Mark's to tune.

## 8. Your ant plays its kind

- **Asked:** "What's the point of your ant being a builder if he cannot dig himself?" Decision: "If we can birth it as different ants it should have those abilities, or what else is it for?"
- **Means:** choosing what to be reborn as should change how you play, not only how hard you bite.
- **Today (the answer):**
  - **Soldier, venom ant, major and the other fighters:** tougher and bite harder. Your bite is your kind's bite doubled, so a soldier bites three times as hard as a forager.
  - **Forager and harvester:** nothing of their own. Your load is 5 for any kind (8 with Big jaws).
  - **Builder, nurse, medic and the rest:** nothing at all. You mend cave-ins as any kind.
  - So today, apart from the fighters, your kind is only a look.
- **Others:**
  - Hero units in RTS games carry their class's skills: Warcraft III's heroes, a StarCraft SCV that builds.
  - SimAnt lets you switch castes with different jobs.
  - In every class-based game, the class decides what you can *do*.
- **Design:**
  - **Builder:**
    - **digs:** tap soil next to you and you dig it yourself, at twice a builder's pace; tap further away and you walk there;
    - **builds:** standing in a room being built counts as two builders;
    - **in the yard:** you raise an outpost with the work of two ants.
  - **Nurse:** in the nest, by the eggs, you count as two nurses (eggs hatch faster). In the yard, your crew heals slowly around you when not fighting.
  - **Medic:** in the yard, your crew heals around you, twice a nurse's rate, even in a fight. You cure Cordyceps near you, like a medic.
  - **Forager:** you carry 8 (12 with Big jaws), and you're a fifth faster on trails.
  - **Harvester:** you carry seeds in double loads.
  - **Replete:** you carry food in your crop: 12 a load.
  - **The fighters:** as today.
  - **Your card** says what your kind can do, and so does the rebirth choice, which now offers the medic, harvester, replete and major too (each once you can lay it).

## 9. A crew picks things up

- **Asked:** "None of your ants got water." Decision: "Yes crew and water good."
- **Means:** when you gather, your crew gathers with you. Twenty ants at a puddle should bring home twenty loads, not one.
- **Today:** a crew follows and fights. Picking up is yours alone; only a heavy item (lifted together) uses the crew.
- **Others:**
  - In every RTS, selected workers all go to the resource you click.
  - Pikmin: your squad carries whatever you throw them at.
  - Real ants: recruits follow a trail to the find and each takes a load.
- **Design:**
  - **When you pick something up** (water, food, grit, anything), each ant in your crew close by takes a load of the same kind, from the nearest pile within eight tiles.
  - **They carry it with you** and keep following. When you deliver at home, they deliver too.
  - **A crew carrying still fights.** It drops nothing.
  - **Each load shows** on the ant's back, as a forager's does.
