# Phase 3: creatures, thought through (build 73)

Playtest 3's third phase ([`PLAYTEST-3.md`](PLAYTEST-3.md)). Each piece has:
- **Asked:** Mark's words.
- **Means:** what's actually wanted.
- **Today:** how the game does it now.
- **Others:** how other games, or nature, do it.
- **Design:** what this build does.

## 1. Hunters are a real threat

- **Asked:** "Any combating bugs should be able to kill one bug or one ant on their own… These are predator bugs, especially the predator ones. Like the jumping spiders, they shouldn't be bodied by just one ant… Maybe the strongest of the versions of ants that we have, but not just any ants. They have to be genuine threats, not just pathetic food sources."
- **Means:** a hunter should beat small numbers and weak ants. Only real fighters (soldiers, majors, venom ants), or you with care, take one down, and at a cost.
- **Today:**
  - The hunters' moves are dangerous: the jumping spider's pounce (6), the assassin bug's beak, the wasp's carry, the skink's dash.
  - But any ant in your crew, a forager included, bites them at full strength, so a crew of foragers shreds them.
  - They walk away when five or six ants are on them, which reads as weakness.
  - Your ant bites twice as hard, and the assassin bug only nicks you (4).
- **Others:**
  - **Armour against many small hits** is how strategy games make a big unit beat a swarm of small ones. StarCraft takes a flat amount off every hit, so zerglings barely scratch an ultralisk; Warcraft III has armour types.
  - In nature, a jumping spider takes a lone ant easily; ants beat it with numbers and big jaws.
  - In boss design, a cornered monster fights harder, not softer.
- **Design:**
  - **Chitin armour:**
    - a worker's bite (forager, builder, nurse…) does a quarter of its damage to a hunter;
    - soldiers and venom ants bite in full, and majors half again;
    - your ant's double bite becomes about one and a quarter times a soldier's.
  - **No more walking off from a crowd.** With three or more ants on it, a hunter lashes out every few seconds:
    - the jumping spider spins and bites everything next to it;
    - the assassin bug stabs the biggest;
    - the skink whips its tail and knocks them back.
  - **Hurt, it runs.** Below a third of its health a hunter breaks off and runs home, and comes back healed later. To kill one you have to finish it: chase it, or hold it with Mandible Lock. The skink already drops its tail; it keeps that.
  - **You're prey too:**
    - the jumping spider's bite goes from 2.5 to 4;
    - the assassin bug stabs you for 6 every 1.8 s (was 4 every 2.5 s);
    - the wasp's sting goes from 3 to 4.

## 2. The spider fights you can see

- **Asked:** "He should definitely have some kind of attacking animations, and the ants shouldn't just go right under him. They should maybe attack his legs. Each one of his legs is a point of weakness." "I wanted the spider to do something more. I thought I had coded it for it to lunge and stuff."
- **Means:**
  - The spider's attacks should be events: a wind-up, a strike, an impact.
  - Ants should fight it the way ants do, round its legs, instead of stacking under its body.
  - Its legs should matter.
- **Today:**
  - It crouches (the tell), then its "lunge" is a burst of speed with a small tilt.
  - Every two seconds it kills a random ant in reach, with a short rear.
  - Attackers walk to its centre and pile up under it.
- **Others:**
  - Monster Hunter: breakable parts, where hitting a leg cripples it.
  - Shadow of the Colossus: weak points.
  - Dota's Roshan: fighters ring the boss.
  - Real ants pin a spider by its legs, a few to a leg, and pull.
- **Design:**
  - **The ring.** Each ant fighting the spider takes one of its eight legs: a spot at that leg's foot that turns as the spider turns. Past eight, a second ring forms behind. A spider fight becomes a ring of ants on its legs.
  - **Legs are weak points.** Bites land on the leg the ant holds. A leg that takes enough is crippled.
    - Each crippled leg slows the spider by 10%.
    - At four crippled legs it can't lunge.
    - Its bar shows the crippled count, and it limps (rocks as it walks).
  - **The strike:**
    - the crouch as now;
    - a real lunge, its body thrust forward and low, front legs raised;
    - the bite, rearing up and then slamming down on its prey with a thud and a ring of dust.
  - **The stomp.** With five or more ants on its legs, every five seconds it rears high and stamps. Everyone in reach is knocked back for a little damage, with dust, a thud and a shake if you're near.

## 3. The millipede runs

- **Asked:** "The millipede should probably try to run away, not just curl up and accept death."
- **Means:** prey that behaves like prey. It escapes when it can and defends only when it can't.
- **Today:** bitten, it curls for eight seconds (taking a third of the damage), uncurls, wanders, and curls again.
- **Others:**
  - Real millipedes run first, curl when grabbed, and ooze foul chemicals that drive ants off.
  - In games, prey animals flee on first contact (the deer in Age of Empires and Rome).
- **Design:**
  - **Bitten or crowded,** it runs: about three times its walking speed, away from the nearest ant, for four seconds.
  - **It curls only when cornered:** three or more ants on it, or caught again while running.
  - **Curled, it oozes:** ants biting it take a little damage, and workers back off.
  - When the crowd thins, it uncurls and runs again.
  - It's worth hunting with a few fighters, not free food for one.

## 4. The foot stomps

- **Asked:** "The foot should have more of a stomp."
- **Means:** weight. It's the biggest thing in your world landing, and right now it settles.
- **Today:**
  - A shadow grows.
  - The sneaker comes down over 0.12 s.
  - A dust ellipse, a thud, and a small shake within 30 tiles.
- **Others:** giants and big hits in games (Shadow of the Colossus, Monster Hunter, God of War) use:
  - **anticipation** (it hangs, then drops fast);
  - **impact** (a squash on contact, a short freeze, a big shake that falls off with distance);
  - **aftermath** (a shockwave of dust, debris flung up, a mark left on the ground);
  - and a deep sound with a long rumble.
- **Design:**
  - The sneaker **hangs, then drops fast** (eased in) and **squashes** on contact.
  - A **shake by distance:** strong close, felt far.
  - A **shockwave ring** and a second, slower dust cloud.
  - **Clods** flung up.
  - A **flattened print** left on the ground for twenty seconds.
  - A **deeper boom with a rumble tail.**
  - Ants just outside the kill zone are **knocked back** and dazed, no longer untouched.

## 5. Hovering an ant outlines it

- **Asked:** "Try mousing over an ant… It should be able to outline every ant that you see."
- **Means:** with a mouse, pointing at an ant should say which one it is and what it is, the way pointing at a unit does in an RTS.
- **Today:** tapping an ant opens its card. Hovering does nothing; names only show over Elites and Legends.
- **Others:**
  - StarCraft II highlights the unit under the cursor.
  - Warcraft III shows its selection circle and a tooltip.
  - Total War lifts a unit card.
- **Design:** the ant under the mouse (any ant: yours, a rival's, your own):
  - gets a ring at its feet in its side's colour (green yours, red theirs, gold you);
  - brightens a little;
  - and shows a small label: its name if it has one, else its kind, rank and colony ("Forager · Veteran", "Pavement soldier"), with its health bar.
