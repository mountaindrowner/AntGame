# Playtest 3: Mark and his brother (Nov 6)

Mark's voice-over while his brother played, on PC, on build 67 or close to it. Pulled out of the transcript and broken into phases (Mark, after build 68: "Break it down in phases, so we can spend time improving the quality and look… one more pass, piece by piece").

How a piece is worked: one at a time, a screenshot or short clip for Mark, his notes, a second pass, then the next piece. Phase 1 revisits what build 68 put in at speed. The rest is new work, in the order below; Phase 4 waits on Mark's decisions.

## What landed well

- The attack controls ("the attack options do work well"); the attack animation he saw.
- The music ("not intrusive… perfect").
- The great evolutions, the region cuts on the map, Continue being instant.
- The nest feeling deep and expansive.
- The dark nights, play dead, the raid itself ("that was awesome").
- Names and veterans (Flint, Thorn "now an elite"); the millipede carried home in pieces.

## The plan, in phases

### Phase 1: polish what build 68 added

**Done in build 69**, each piece thought through first in [`PHASE1.md`](PHASE1.md).

A first pass of each is in the game (build 68). Each gets a second look: how it looks, how it sounds, how it reads at a glance.

1. **The bottom dock.** "You press recruit and release takes its place." The four main buttons now keep their slots; check the empty slots read well (or show a dimmed button instead), the curved labels, the badges.
2. **Tooltips and tap cards.** "The tooltip, because it's low, it needs to go up." Now above the button on big screens; check every edge of the screen, the timing and the wording.
3. **Health and hunger warnings.** "A slight pulsing that your HP is low, or a slight rumble… your stomach." A heartbeat, a growl, a shaking bar and "Hungry"/"Starving!" mid-screen; tune the look and the sounds so they warn without nagging.
4. **The mid-screen shout.** "Beware of the mower… it just comes up in the middle of the screen." Its type, colour and timing, and which other alerts belong there (the spider, the foot, the queen under attack).
5. **The day clock.** "A little half wheel on top… like Warcraft 3… it glows a little." A first version is in; it needs real art: a carved or brass rim, a painted sky and night, the sun and moon drawn rather than emoji.
6. **The notices at the side.** "So many notifications… you're not sure what's important." How-to lines now stop after 15 minutes. Next, rank the rest (danger, good news, information), shorten them, and decide which become shouts and which go quiet.
7. **Menu text and the Evolution window's ant pages.** "Text is too small… the ants menu is giant bars… some parts so much text." The text is bigger now. Next: redo the ant pages' layout (smaller bars, shorter lines), and put the pages' tabs and arrows at the top.
8. **The top-left bars.** "We could probably expand the upper-left bars."
9. **Zoom range.** "Two or three ticks less." It now stops about three notches sooner; confirm it feels right.

### Phase 2: combat feel

**Done in build 71**, each piece thought through first in [`PHASE2.md`](PHASE2.md).

1. **Ants lunge when they bite.** "Maybe we should give the ants some kind of animation where they lunge a little bit." Today a fighting ant only flickers its walk.
2. **Fights spread out.** "They shouldn't just be a cluster… match up to each other and separate… chaotic front lines." Ants pair off one-on-one in a loose front.
3. **Fights last longer and read better.** "The battle was so quick… unceremonial… maybe a bit of a zoom in." Longer duels, and the camera nudges in a little.
4. **The raid as a show.** "Give the UI much more presentation… more animation, more excitement, more tension."
5. **A Defend button** when the queen is attacked. "You have to kind of spam it… a little bit of cooldown." Ants come home only while you keep calling them.

### Phase 3: creatures

**Done in build 73**, each piece thought through first in [`PHASE3.md`](PHASE3.md).

1. **Predators are a real threat.** "They have to be genuine threats, not just pathetic food sources." Jumping spiders, assassin bugs and wasps should kill an ant or more before they go down, and need your strongest ants or a real crew.
2. **The spider fights visibly.** "He should definitely have some kind of attacking animations… the ants shouldn't just go right under him. They should attack his legs." A lunge, a rear and a slam; ants spread round its legs.
3. **The millipede runs** before it curls up. "The millipede should probably try to run away, not just curl up and accept death."
4. **The foot stomps.** "The foot should have more of a stomp." More shake, dust and weight.
5. **Hovering an ant outlines it.** "It should be able to outline every ant that you see."

### Phase 4: the nest as a place

Mark's answers: rooms only in a closed chamber with a hallway; he places them himself; drag to dig; your ant plays its kind; a crew gathers. Thought through in [`PHASE4.md`](PHASE4.md). **Done in build 74.**

1. **Rooms need walls and a way in.** "Any smart player is just gonna dig out every bit of dirt… it needs walls, it needs an entrance." Does a room only work inside a closed chamber, or does open digging cost something?
2. **Choose where a room goes.** "It just places in the nearest space."
3. **Drag to dig.** "Work on the digging tool… drag select."
4. **Rooms grow when upgraded.** "The hatchery would upgrade in the way it looks… a little bit of space."
5. **Light in the rooms.** "The nest is all a little flat… each room comes with a little bit of lighting."
6. **Fog below the first layer.** "A fog that hides everything underneath… more discovery."
7. **Faster passages**, an upgrade.
8. **Your ant digs** when it's a builder. "What's the point of your ant being a builder if he cannot dig himself?"
9. **A crew picks things up** (water, food). "None of your ants got water."

### Phase 5: the yard and the air

**Done in build 75**, each piece thought through first in [`PHASE5.md`](PHASE5.md).

1. **Rain fades in.** "A few drips, and then slowly it picks up."
2. **Hidden antlion holes in the sandpit.** "A little more hidden… like the hole at the end of the game, but lesser." The sand pail "looks odd".
3. **Food ants would really find.** "Apple cores… probably not realistic… should be crumbs and stuff." (Apple cores are only in the Compost Heap already.)
4. **The spoil heap does something.** "I don't know if we ever fixed what to do with the mass pile of dirt on top."
5. **Bioluminescence or night vision.** "Each individual ant… even your trails… a faint blue glow."

### Phase 6: bigger systems and later

1. **Save slots.** "Different save files… so you can have different nests."
2. **Phase 2 notes:** the ants shouldn't eat people.
3. **An ant religion:** noted, not planned.

## Answers to questions from the session

- **Does eating drain the food?** No. You eat at the nest entrance or beside a forager carrying food, and nothing is taken from a food pile, the forager or the store.
- **Crew of 20:** the default. Bigger crews (30), Bigger crews II (45) and War columns (60) raise it, all evolutions.
- **The spider and spawn camping:** it can't stand near your nest (6 tiles; 12 in the first four minutes). It goes home to rest, wanders, sometimes leaves over the fence, and after three meals it's full for a minute. It has no day schedule.
- **The dirt pile on top** is the spoil your builders carry out of the nest. It's only for looks today; nothing uses it.
- **The "protein" bodies after a swarm** are winged queens and males that died in the nuptial swarm. Their card now says so (it said "Meat").
- **The map's bottom right:** the zoom buttons. In the yard, that corner is Fire Ant Country (its crest and pin).
- **Can a builder you play dig?** Yes, from build 74: it digs and builds at twice a builder's pace.
- **Can a recruited crew carry water?** Yes, from build 74: when you pick something up, your crew takes a load each and delivers with you.
