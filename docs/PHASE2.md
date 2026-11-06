# Phase 2: combat feel, thought through (build 71)

Playtest 3's second phase ([`PLAYTEST-3.md`](PLAYTEST-3.md)). Each piece has:
- **Asked:** Mark's words.
- **Means:** what's actually wanted.
- **Today:** how the game does it now.
- **Others:** how other games do it.
- **Design:** what this build does.

## 1. Ants lunge when they bite

- **Asked:** "Maybe we should give the ants some kind of animation where they lunge a little bit." "I would like some attack animations for when they're fighting."
- **Means:** a bite should look like an action. It should have a cause (the ant strikes) and an effect (the other one reels), so you can read who is hitting whom.
- **Today:** a duelling ant flickers two walk frames on the spot. It faces wherever it last walked, often not its foe. Hits show as a red flash and a number. Mandibles locked shove back and forth (build 27). The bugs already lunge (the earwig's pinch, the skink's snap).
- **Others:** every melee game uses the animator's three beats: **anticipation, strike, recovery**.
  - Total War and Mount & Blade: a step in and a swing; the struck one staggers back.
  - SimAnt's ants just jitter.
  - Small units in RTS games, which ours are at game size, lean on a quick forward jab plus a hit reaction, because detail doesn't read at that size.
- **Design:** driven by the dice. The sim remembers each swing: its time, its result and the direction to the foe.
  - A fighting ant **turns to face its foe**.
  - On each swing it **lunges**: a third of its body forward in a tenth of a second, then back.
  - A **hard hit or crit** lunges further.
  - The one it hits **reels back** a little, beside the red flash.
  - A **miss** is a short jab that falls short.
  - A **lock** keeps the shove.

## 2. Fights spread out

- **Asked:** "They shouldn't just be a cluster. They should match up to each other and separate, and then that's where the fight happens… 20 versus 20, they're all creating waves and spaces of chaotic front lines." "I do wish that they weren't just all bunched up together."
- **Means:** a battle should look like many small fights along a line where two groups meet, not one heap. Each pairing should be visible.
- **Today:**
  - Each fighter picks the first enemy in its list, so they pile onto the same few.
  - Ants walk to their target's exact spot and stop on top of each other.
  - Up to three on one foe pins it, which is good, but everyone else joins too.
- **Others:**
  - Total War: units meet along a front, and the soldiers pair off along it.
  - Kingdom Rush: each soldier "blocks" one enemy, and the extras wait for the next.
  - Real ants: fights are many little tugs, one or two holding a leg, another biting, spread over the ground.
- **Design:**
  - **Spread the duels:** a fighter picks the foe in reach with the fewest attackers on it, so it's one-on-one first, then two, then three. A fourth looks for another foe nearby instead of joining.
  - **Room to fight:** duellists stand at biting distance from their foe, and fighters on the same side gently push apart. A clash becomes a band of pairs, a ragged front, instead of a pile.

## 3. Fights last longer and read better

- **Asked:** "The battle was so quick… unceremonial." "The combat was too fast. I want more like maybe a bit of a zoom in, and the ants have little animations… one on one."
- **Means:** time to see a fight happen and to react (recruit, retreat, use an ability), and a view that helps you see it.
- **Today:**
  - A swing every 0.7 seconds.
  - A forager has 2 health, so most worker duels end in one or two hits: about a second.
- **Others:**
  - Total War battles run minutes on big health pools and morale.
  - StarCraft fights are fast but readable through animation and sound.
  - Games with small units help with the camera:
    - Company of Heroes' camera stays put, but its effects are big;
    - Total War's cinematic camera moves in;
    - many action games ease in a little in combat and back out after.
- **Design:**
  - **Slower rounds:** a swing every 1.1 seconds, a little over half again as long. Damage per hit is the same, so who wins doesn't change, but a fight lasts long enough to watch and answer. It's a pace change, Mark's to tune.
  - **The camera eases in a little** (about 15%) while a fight of four or more duels is close to your ant, and eases back a few seconds after. Never if you've zoomed by hand in the last few seconds.
  - **A battle tally:** while a big fight is near you, a small "⚔ 9 vs 6" with two bars under the clock shows who is winning.

## 4. The raid as a show

- **Asked:** "Was the button obvious? There's a little bar… Inside the what? Round, what does that mean? Pull out?… Definitely the raid, all that was awesome. That was a cool thing, but let's give the UI much more presentation, because you can't see. Make sure that you can see what's going on… more pizzazz, more animation, more excitement, more tension."
- **Means:** the best moment of the session happens where you can't see it. Your raiders go into the rival nest and vanish, and the fight is a log of text in a small card. The words ("round", "pull out", "inside the…") don't explain themselves.
- **Today:**
  - **At the door:** a card with a bar.
  - **Inside:** "Round N", a line of text a round, and Pull out.
  - **At the end:** a small report.
- **Others:**
  - Heroes of Might and Magic's quick battle: two armies facing each other, stacks lunging, numbers ticking down.
  - Clash of Clans: you watch the raid.
  - XCOM: a camera that cuts to every shot.
  - The common thread: **show both sides, show each exchange, keep score in big type**.
- **Design:** a **raid stage**, a panel above the dock while the raid is on.
  - **At the door:** a door icon cracking as your crew holds it, with tokens for your ants at the door and theirs in the way.
  - **Inside:**
    - your raiders as a row of tokens on the left, their guards on the right;
    - each clash, the paired tokens lunge at each other and a die shows;
    - fallen tokens grey out and drop;
    - free raiders run to the prize (the store, the brood or the queen), which fills a bar;
    - the queen has her own health bar.
  - **Sound and clarity:** a drum each clash, and "BREACH!" shouted when the door breaks.
  - **Plain words:** "Clash 3" with a countdown ring to the next one (not "Round"). "Retreat" with "keep what you've taken" (not "Pull out").
  - **The end:** a result banner with what was won and lost.

## 5. A Defend button

- **Asked:** "When your queen's attacked… a defend button, and you have to kind of spam it a little bit to get ants back to the nest. It's not automatic, but you have to start pressing the button defend, and then there's maybe a little bit of cooldown, and you have to press it again… they'll go their way to do it."
- **Means:** an active answer to a raid on your home. You ring the bell, and the more you ring it the more come, but not all at once: it's your attention, not a free switch.
- **Today:** the alarm brings fighters out from *inside* the nest. Ants out in the yard on errands don't come back.
- **Others:**
  - Warcraft III's Call to Arms: the town hall turns peasants into militia.
  - Age of Empires' town bell: villagers run to shelter.
  - Both are one button, at the moment of danger, with a clear sound.
- **Design:**
  - **When it shows:** a red **Defend** button (hotkey **D**) appears above the dock while your nest is under attack: raiders on their way or at your door, or the queen being hit.
  - **Each press rings the alarm** and calls the next six nearest ants home to fight at the door. Fighters answer first, then workers. They drop what they're doing, run home and join the fight; a small "!" shows over each.
  - **A cooldown** of four seconds, drawn as a ring, before it rings again.
  - **The shout** for a raid says to press D, so the button is found at once.
