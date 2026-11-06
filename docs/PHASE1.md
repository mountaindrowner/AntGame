# Phase 1: the HUD, thought through (build 69)

Playtest 3's first phase ([`PLAYTEST-3.md`](PLAYTEST-3.md)). Build 68 put in a first pass at speed. Mark: "Think through them before just doing a first draft. What does that change mean? What exactly am I asking for? What does that look like? How does that compare to what other games do?"

Each piece below has:
- **Asked:** his words.
- **Means:** what's actually wanted.
- **Others:** how other games do it.
- **Design:** what this build does.

The HUD's look stays the game's own: cream cards with an inked edge, green rims, the Bungee display face, round icon buttons.

## 1. The bottom dock

- **Asked:** "You press recruit and release takes its place… if you want to mass recruit you have to click and then move to the side."
- **Means:** the buttons you press again and again must never move. It's muscle memory: your hand learns where Recruit is. Build 68 fixed the jump, but a hidden button now leaves an unexplained gap, and only the four main buttons are pinned.
- **Others:** an RTS command card (StarCraft, Warcraft III, Age of Empires) has a fixed grid, and each command always sits in the same cell. A command you can't use yet leaves its cell empty, but the grid stays. Every command has a hotkey, printed on the button. An MMO action bar works the same way.
- **Design:**
  - **Three fixed groups, always in the same order:**
    - **Actions:** Pick up, Trail, Recruit, Release (centred).
    - **Crew:** Hold, Split, Follow (on the right, when you have a crew).
    - **Places:** Enter, Outpost, Raid (on the left).
    - A thin divider marks each group.
  - **Empty slots:** in the actions group, an unusable button leaves a faint socket (a dashed ring), so the gap reads as "a button lives here", not as a missing one.
  - **Hotkeys:** printed on each button as a small keycap. You can hold R to keep recruiting, like holding the button.

    | Key | Button |
    |---|---|
    | E | Pick up |
    | T | Trail |
    | R | Recruit |
    | G | Release ("let go") |
    | H | Hold |
    | V | Split |
    | F | Follow |
    | N | Enter or exit the nest |
    | O | Outpost |
    | B | Raid |

    The abilities keep 1–4.

## 2. Tooltips

- **Asked:** "The little tool tip, because it's low, it needs to go up instead of appearing under the mouse." Also: "Are there tooltips that tell you what they do?"
- **Means:** on PC, hovering is how you learn a button. A tip has to appear where you can read it, stay while you read it, and say what the thing is before the details.
- **Others:** Warcraft III, StarCraft II and Dota have the same shape: a bold name with its hotkey, one line on what it does, then numbers or cost. The tip stays as long as you hover. Touch games show it on a long press.
- **Design:**
  - The tip has a **name line** in the display face with the **keycap**, then the **line** in plain text. The name and line are split from the existing tip text.
  - With a mouse it **stays while you hover**. Build 68 hid it after 2.6 s, too fast for a long tip. On touch it still fades.
  - It sits above the button, clear of the curved label, and it's kept on the screen at every edge.

## 3. Health and hunger warnings

- **Asked:** "Maybe a little slight pulsing that your HP is low, or a slight rumble to simulate your stomach rumbling… a little warning." "Too often you die without knowing. There's no warning your character's dying."
- **Means:** two things. You need to *notice* (sound, movement at the edge of your eye). You also need *time to act*: hunger reaching zero kills you on the spot, so even a perfect warning can come too late.
- **Others:**
  - Shooters (Call of Duty, Halo): a heartbeat and a red edge when hurt, which fade as you recover.
  - Minecraft: the hunger bar's icons shake when low, and an empty bar drains health slowly instead of killing outright.
  - Don't Starve: the stomach growls, the hunger meter pulses, and starving takes health over time.
  - Valheim: starving removes your health regeneration.
  - The common rule: **an empty meter starts a slow loss, it doesn't kill**.
- **Design:**
  - **Heartbeat only in danger:** below 40% health *and* hit in the last eight seconds, faster below 20%. Healing at home is quiet, with only a faint red edge.
  - **Hunger:** the stomach growl and the bar's shake from build 68 stay, with "Hungry" and "Starving!" mid-screen once each.
  - **Starving takes health instead of killing at once:** at zero hunger you lose about a sixth of your health a second (about six seconds from full), with the heartbeat. The cause still reads "You starved."

    This makes starving slower than before: a few seconds to reach food instead of none. It's a balance change, so it's Mark's to keep or drop.

## 4. The mid-screen shout

- **Asked:** "Instead of a closable notification… it just comes up in the middle of the screen, 'Beware of the mower'… and then it doesn't give you notifications every time."
- **Means:** a few things need you to act *now*. Those should interrupt your eyes for a moment, then get out of the way, with nothing to close.
- **Others:**
  - Warcraft III: "Your base is under attack!" (a voice, a line of text, a flash on the minimap).
  - Age of Empires: a bell and a flash.
  - Into the Breach / XCOM: a short banner across the middle, gone in two seconds.
  - Rules they share: **rare**, **one at a time**, **a sound of its own**, **never needs closing**.
- **Design:**
  - **Only "act now" moments:** the mower, the queen under attack, a war party marching on your nest, and Hungry/Starving.
  - **One at a time, queued.** The same alert can't repeat within 20 seconds.
  - **Each kind has its own sting:** a horn for war, a siren-like rise for the mower, the queen's alarm.
  - **Placement:** in the upper middle of the screen, not over your ant (the camera centres on you).

## 5. The day clock

- **Asked:** "A little wheel on top, a half wheel that symbolizes the clock… like Warcraft 3 has it… once it finally hits daytime officially, it glows a little bit, until with night, the moon glows."
- **Means:** time of day at a glance, without reading a number, and a small ceremony at dawn and dusk instead of a pop-up.
- **Others:** Warcraft III's is a half dial hanging from the top centre with a gold frame: the sun crosses it by day and the moon by night, and it glints at the turn. Don't Starve has a round clock with day, dusk and night segments. Both are art pieces, not widgets.
- **Design:**
  - Drawn in SVG to match the HUD: a cream frame with an inked edge and a green rim, like the top bar.
  - Inside, the sky's colour follows the light: blue by day, orange at dusk and dawn, deep blue with stars at night.
  - **The sun travels the arc from left horizon to right during the day, and the moon does the same at night**, so where it sits tells you how much is left. Build 68's turning disc showed the time but not the "how long".
  - At dawn the frame glows gold and the caption says "Dawn: dew on the grass"; at dusk it glows silver-blue with "Night falls".
  - Hovering it gives the minutes left.

## 6. The notices at the side

- **Asked:** "There's so many notifications that happen on the side… you're not sure what's going on and what's important… It says tap the top cell to go outside… why do I need to know that? I know that. Everything's just being announced." Also: "Thorn the Forager is now an elite. That's cool."
- **Means:** a hierarchy. Today one line at the side carries everything (instructions, news, danger and praise), so nothing stands out, and a card teaches you things you already know. He *likes* the news (elites, finds); he doesn't like being told how to play twice.
- **Others:**
  - Strategy games split by urgency.
  - Civilization: a stack of icon notices at the side that you can glance at.
  - Total War / Stellaris: a feed of small toasts, colour-coded, that fade.
  - RimWorld separates letters (big events, coloured by severity) from messages (small text that fades at the top left). Its alerts (persistent problems) sit at the right.
  - The common thread: **three tiers, each with its own look and place**.
- **Design:** three tiers, each with its own look.
  - **Shout** (piece 4): act now.
  - **Feed:** news. Up to three small toasts under your health, each with an icon and a coloured edge:
    - red: danger;
    - green: good news;
    - gold: information.

    They fade after five seconds (danger after eight), and a repeat refreshes its toast instead of stacking.
  - **Tips:** how-to lines and the first-time explainer cards. The how-to lines only in a colony's first 15 minutes (build 68); explainer cards stay once ever, smaller, and fade.

## 7. The Evolution window's ant pages

- **Asked:** "The ants menu is like giant bars and not a lot of text, or some parts just have so much text… the text is kind of small… not everything has to be so explicitly written." "I wish the bottom bar was on top and you could see all the tabs on the top and the arrows were on top."
- **Means:**
  - Today "The Ants" is one long scroll of every kind of ant: a row of chips per level, a wide bar for the next level, and two rows of rank skills each.
  - It's hard to see where you are, and the page dots at the bottom don't say what's on each page.
  - Wanted: find a page by name, then see one kind of ant clearly.
- **Others:**
  - Hades' Mirror of Night and Darkest Dungeon's guild: one list of rows, each with an icon, a short name, a short effect, rank pips and a cost.
  - Most upgrade screens have **named tabs across the top**: Civilization's tech and civic tabs, any RPG's skill trees.
- **Design:**
  - **Named page tabs across the top** with the arrows beside them: Goals, You, The Ants, the tree's branches, Ranks. The dots at the bottom go.
  - **"The Ants" gets a tab per kind of ant** (Forager, Builder, Nurse, Soldier…) and shows one at a time.
  - **Each of its five levels is one row:** a number pip, a short effect and its state (✓ owned, the next one with its cost and an Evolve button, or locked). A choice level shows its two options side by side.
  - **Rank skills ("At Veteran it learns…")** become one compact row of choices under the levels.

## 8. The top-left bars

- **Asked:** "We could probably expand the upper-left bars."
- **Means:**
  - The health and hunger bars are 70 pixels each with no numbers, the smallest things on the HUD, yet the ones that kill you.
  - "Expand" also fits the resource bar, which is already full width.
  - So it's the vitals: bigger, with numbers.
- **Others:**
  - Action and survival games give vitals a fixed corner and a clear size: Minecraft's hearts and drumsticks, Don't Starve's three meters, Valheim's bars with numbers on hover.
  - Health shows as a number against its maximum.
- **Design:**
  - **One panel under the resource bar** with two wide bars, about 200 px, each with its icon and value: "❤ 7 / 12" and "🍖 Hunger 22%".
  - **Ticks every quarter.**
  - The colours and the build 68 warnings stay.

## 9. Zoom

- **Asked:** "It zooms out too far… two or three ticks less."
- **Means:** the far limit (done in build 68: about three notches). The steps themselves also jump.
- **Others:** RTS and city builders (StarCraft II, Cities: Skylines) zoom smoothly: each wheel notch sets a target and the camera eases to it.
- **Design:** the wheel and the Zoom button set a target and the camera eases to it in about a fifth of a second. A pinch stays direct.
