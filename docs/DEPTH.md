# Depth: the colony fights to survive

Mark's direction (Oct 26): "The colony is striving to survive. It's a fight. And the player choices are the things that actively fight that off… Do choices feel like they pay off?… Does exploring more regions feel adventurous and cool, but also dangerous?" He named three SimAnt novelties to push: gathering and foraging, building an army to take out large opponents, and seeing the colony's power grow until it does things it couldn't before.

## Pillars

1. **Survival is at stake.** Pressure builds on its own: food near home runs out, upkeep bites, raids grow, and the queen can die. A colony left alone should decline. Without a possible loss, no choice can pay off.
2. **Choices are trade-offs.** Eggs, rooms and big purchases compete for the same food, protein, stone and space, and the right mix shifts with each crisis. Saving up for something expensive is a gamble that should change what the colony can do.
3. **Payoffs are visible: the power ladder.** Each step unlocks something the colony couldn't do before:
   - one crumb
   - a crew carrying a gummy bear home
   - a squad killing a caterpillar
   - an army taking down the spider (its fang unlocks a new caste)
   - a siege that breaks the rival
   - a nuptial flight that founds a second nest
4. **Your ant takes the risks.** Only you recruit and lead: treats, hunts, sieges and scouting. Your trails open far ground to the colony. Dying costs your crew and what you carried.

## Slices

| Slice | What | Status |
|---|---|---|
| **1. The fight** | Food near home runs thin; fighters eat protein; raids grow and attack the queen (the game can be lost); only fighters count in a siege; treats need a crew you lead; the 3×3 yard | **Built (build 8)** |
| 2. The power ladder | Trophies from big kills unlock castes (spider fang → Venom ants exists; more bosses and castes); a use for protein beyond soldiers | Next |
| 3. Choices that cost | Room upgrades with exclusive branches; space limits; queen upgrades that change abilities, not just the cap | Later |
| 4. Adventure | Fog over unscouted ground, scouting, second nest sites, nuptial flights, tier 2 areas | Later |

## Targets the playtest bot checks

`node game/scripts/playtest.mjs <strategy> <seed> <minutes>` plays through the UI's actions.

- A hands-off colony stalls or declines; it never thrives.
- A good player hits at least two real crises before minute 20: a raid on the queen, a food crunch, a mower, a hunt gone wrong.
- A forager-only rush on the rival can't win.
- New things to do keep arriving every 5–8 minutes.
- A good player can still win, in roughly 25–45 minutes.
