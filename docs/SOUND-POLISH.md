# Sound polish: songs, battle music, stingers (build 77)

Mark, after build 76: "Maybe a few songs for specific things… specific sound effects for specific things that maybe we haven't keyed up yet. Sound effects when there's a raid happening or a big fight. It slowly transitions to a battle song. Maybe successful noises if it's successful."

Each piece has:
- **Asked:** Mark's words.
- **Means:** what's actually wanted.
- **Today:** how the game does it now.
- **Others:** how other games do it.
- **Design:** what this build does.

## 1. A song for each situation

- **Asked:** "A few songs for specific things."
- **Means:** the music should tell you where you are and what's happening: a calm day, a night, the nest, a battle, a boss. You should be able to hear the change without looking.
- **Today:**
  - One eight-bar loop in A minor (marimba, bass, pad, soft drums), synthesized live.
  - The yard, the nest and the title screen change only how loud each layer is.
  - A "danger" layer (fast hats and a low pulse) fades in near the spider, a raid, a boss or a falling foot.
  - Rain muffles everything.
- **Others:**
  - **Adaptive music.** Most modern games layer it rather than cut between tracks: the same tempo and key, with instruments joining as things intensify.
    - Zelda: Breath of the Wild's battle music builds from a few piano stabs to full drums as enemies close in.
    - Red Dead Redemption 2 and Halo swap whole arrangements on the beat.
  - **RTS games** (Warcraft III, Age of Empires) pick a calm or a war track depending on what's on screen, and shift at musical boundaries.
- **Design:** one tempo (92) and one key (A minor), as now, so every song can blend into any other on the bar line. Each song is its own arrangement:
  - **Day in the yard:** today's marimba song.
  - **Night in the yard** (new): a music box over a low, slow pad. No drums, wide and quiet.
  - **The nest:** today's warm pad, plus a soft kalimba line so it isn't only chords.
  - **Battle** (new), built in three steps as the fight grows:
    1. war drums (low toms in a driving pattern) and a bass that chugs in eighths;
    2. brass-like chord stabs on the off-beats;
    3. a battle melody: a fixed eight-bar tune, not random notes, so it's recognisable.
  - **Boss** (new): its own progression (A minor, B flat, A minor, E: darker and more uneasy), a low choir-like pad, timpani on the beat, and the battle drums.
  - **The title screen:** as now.

## 2. It slowly turns into a battle song

- **Asked:** "When there's a raid happening or a big fight. It slowly transitions to a battle song."
- **Means:** the score should follow a fight's size: a skirmish stirs the drums; a war at your door is the full battle song; and when it's over, the music settles back down rather than snapping off.
- **Today:** the danger layer jumps in and out, and a big fight between your ants and a rival's sounds the same as a falling foot.
- **Design:**
  - **Battle intensity,** from 0 to 1, worked out every frame. It rises with:
    - the number of duels near the camera (a big fight is the full song);
    - a raid you're leading (inside the rival nest it's at full);
    - raiders at your door or the Defend alarm;
    - a war party marching.
  - **It rises in a couple of seconds and falls slowly:** it holds about six seconds after the fighting stops, then fades over about eight, so a fight doesn't flicker the music.
  - **The steps join in as it rises:** drums from about a quarter, stabs from about half, and the melody from three-quarters.
  - **The day song dips** under the battle (it never cuts), and comes back as the battle fades.
  - **A boss fight** brings in the boss song instead of the battle song.

## 3. Success sounds, and failure ones

- **Asked:** "Maybe successful noises if it's successful."
- **Means:** a moment of payoff you can hear: a short musical phrase that says "you did it" (or "that went badly") at the end of a fight or on a milestone, with the music stepping aside for it.
- **Today:**
  - A cheer for the end-of-zone screens and treats hauled home, and a few blips.
  - A raid won, a war party beaten or a boss killed has no sound of its own.
- **Others:**
  - Final Fantasy's victory fanfare, Zelda's item jingle, Age of Empires' "wonder built" horn.
  - They're short (one to three seconds), in the music's key, and the music ducks under them.
- **Design:** stingers, short musical phrases in A minor's world, played over the music (which ducks under them for their length).

  | Stinger | What it is | When |
  |---|---|---|
  | **Victory** | a rising brass fanfare that lands on A major, with a cymbal | a raid you led won; a raid on your nest beaten off; a war party broken; a boss killed; a rival queen killed |
  | **Defeat** | a falling phrase that settles low and minor | your raid failed or was called off; an outpost lost |
  | **Discovery** | a sparkling rising arpeggio | breaking into new ground; a bedrock prize; glowrock; a region taken or held; an outpost raised; a great evolution |
  | **Milestone** | a small two-note chime | a goal done; a room grown a level; packed passages |
  | **Nightfall** | a soft descending three notes on the music box | night falls |
  | **Dawn** | a bright rising figure, birdsong-like | dawn |

## 4. Sounds for events that have none

- **Means:** every event the game tells you about should have its own sound, so you learn what happened by ear.
- **Today:** of the sim's 55 kinds of event, 36 make no sound (a banner sometimes plays a generic one).
- **Design:**

  | Event | Sound |
  |---|---|
  | Boss wakes | a deep horn, and the boss song starts |
  | Boss turns savage (second phase) | a roar: a low growl swelling |
  | Boss down | the victory stinger |
  | War party or rival arrives | the war horn (as now), then the battle song |
  | A raid on your nest beaten off | the victory stinger |
  | Your raid ends | victory or defeat, by how it went |
  | Outpost raised / lost | discovery / defeat |
  | Region held, zone taken | discovery |
  | Breaking through into new ground | a rumble, then discovery |
  | Glowrock, bedrock prize | a glassy shimmer |
  | A great evolution | discovery, over the evolve sound |
  | Goal done | milestone |
  | A veteran made | a short brass blip |
  | Night falls / dawn | their stingers |
  | Wood, sugar or chitin found the first time | a small chime |
  | Nuptial flight, a daughter founded | a fluttering rise, then the milestone |
  | Fire ants erupt, the sinkhole | a deep rumble and a crack |
  | Build 74's room tools | the ghost going green: a soft tick; placed: the placed sound; refused (a room's wall): a dull thud; painting digs: a light scratch per cell |
