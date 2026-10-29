# Sound

Status: **the engine and the first batch are built** (build 11.3): `game/src/audio/sfx.js` holds the engine and the recipes, `audio/watch.js` decides what plays. Most priority-1 rows play; the few still to do are listed under "Build order". Priority 2 and 3, the ambience and the music are next. Originally charted, not built. Mark: "We need sound effects for almost everything… We can first chart out everything in the game and what sounds they make, and then we can chart out how to make those sounds." This page is both charts. Each row is one sound: when it plays (the hook in the code), what it should sound like, and how to make it.

## How every sound is made

- **Synthesized in code, no audio files.** It's Web Audio, the same as the film's score (`game/src/intro/sound.js`): oscillators, a shared buffer of white noise, filters and volume envelopes. There's nothing to license or download, and every sound can be tuned with a number.
- **The building blocks.** Most sounds below are one or two of these:
  - **blip:** a sine or triangle note, a fast attack and a short decay (UI, pickups).
  - **chirp:** a note sliding up or down in pitch (success, warnings, birds).
  - **puff:** filtered noise with a short envelope. Low-pass gives thuds and dirt; band-pass gives scrapes and hiss; high-pass gives ticks and rain.
  - **thump:** a sine dropping fast in pitch (60–150 Hz), for impacts and stomps.
  - **drone:** a long note, often two slightly detuned, slowly swelling (the mower, music beds, menace).
  - **grain:** many tiny puffs a few ms apart, randomized (digging, rain, crowds, crumbling).
- **Heard from where it happens.** Surface sounds are panned left or right and fade with distance from the camera. Anything off screen is quiet or silent; warnings are the exception and always heard. Nest sounds are muffled, through a low-pass filter.
- **Never a din.** Each sound has a cap on copies at once (a hundred ants walking is one crowd bed, not a hundred clicks), and a cooldown so it can't machine-gun. Big moments (a stomp, the queen hit) duck everything else briefly.
- **Variation.** Each play nudges pitch (±5–10%) and volume, so repeats never sound copy-pasted.
- **Options.** Sound on/off is in Options already. Next come separate Music and Effects volumes.

Priority: **1** is the first batch (the core loop and the dangers), **2** the second, **3** polish.

## Buttons and menus

| Sound | When | Sounds like | How | P |
|---|---|---|---|---|
| Tap | Any HUD button, menu button or chip | A soft, woody click | Triangle blip at 900 Hz, 25 ms, plus a 10 ms high-pass tick | 1 |
| Toggle on / off | Mark trail, an option, Sound on | Two clicks rising / falling | Two blips a fifth apart, 40 ms each | 1 |
| Sheet open / close | Any sheet, the map | A paper swish | Band-pass puff sweeping 800→2000 Hz (open) or back (close), 120 ms | 2 |
| Tooltip | Long-press tip appears | A tiny tick | 8 ms high-pass tick, very quiet | 3 |
| Can't do that | A disabled button or blocked action | A dull bonk | Sine 180→140 Hz, 90 ms, low-pass | 1 |
| Explainer | A new explainer opens | A curious "hm?" | Two-note chirp up, marimba-like (sine plus a quiet octave) | 1 |
| Title screen | The menu opens | The logo slams in | The film's stinger, shortened | 2 |
| Map zoom / pan | Pinch, buttons | A soft whoosh | Low-pass puff, pitch with zoom direction | 3 |

## Your ant

| Sound | When | Sounds like | How | P |
|---|---|---|---|---|
| Footsteps | Your ant walking (surface and nest) | Faint skittering | grain: 3 tiny ticks per stride, 6 kHz band-pass, quiet; faster when you run | 2 |
| Pick up | `doAction` picks something up | A crisp "tuk" | Blip 600 Hz, then 900 Hz 30 ms later | 1 |
| Drop / set down | Drop, or set a treat down | A soft "dup" | Low-pass puff plus a sine at 300 Hz, 60 ms | 1 |
| Deliver home | Food, water or protein reaches the store | A happy coin-like chime | Two-note chirp up, by food kind: grain = wood, water = glassy, protein = low | 1 |
| Trail on | You mark a trail while walking | A faint wispy hiss behind you | Very quiet band-pass noise bed while marking | 2 |
| Recruit (hold) | Each ant that joins while holding | Rising pips, one per ant | Blip whose pitch climbs a scale with the count | 1 |
| Release | Release | Pips scattering down | 4 quick descending blips | 1 |
| Lift | A crew lifts a treat | "Hup!": a heave | thump plus a chirp up, slightly comic | 1 |
| Too heavy | Lift fails | A strained groan | Sine 220→160 Hz with wobble, 300 ms | 2 |
| Enter / exit nest | Crossing the hole | A muffled tunnel whoosh | Low-pass puff swept down (enter) or up (exit) | 1 |
| Hungry | Your hunger bar low | A tummy rumble now and then | Low sine with fast tremolo, 400 ms, every ~20 s | 3 |
| Bite | You bite a creature or rival | A sharp snip | 15 ms high-pass tick plus a sine at 1.2 kHz, 20 ms | 2 |
| You die | Player ant killed | A sad descending slide | Chirp 600→150 Hz over 700 ms, plus a low-pass thud | 1 |
| Hatch as you | Your new ant hatches | A pop and a bright chime | The film's pop, then a two-note chirp | 1 |

## The colony and the nest

| Sound | When | Sounds like | How | P |
|---|---|---|---|---|
| Queen digs | `queenDig` | Crunchy scoops | grain of low-pass puffs (300–900 Hz), 150 ms | 1 |
| Build nest | `buildNest` | A big scoop, then a settled thump | Longer dirt grain, then a thump | 1 |
| Dig order | Tapping dirt to order a dig | A tiny pick tap | High tick at 2 kHz, 15 ms | 2 |
| Builders digging | Any builder chipping a cell (bed, while visible in the nest) | Distant chipping | Soft grain, density by number of busy builders; muffled | 2 |
| Cell dug out | A cell finishes | A small crumble | Low-pass puff burst, 80 ms | 2 |
| Room placed | `queueRoom` | A stake hammered in | Two quick wooden knocks | 1 |
| Room finished | A room completes | A cheerful "done" | Three-note chirp up plus a soft dust puff (pairs with the dust-cloud animation on the backlog) | 1 |
| Fill tunnel | Packing a cell back | A pat-pat | Two low-pass puffs | 3 |
| Remove room | Room torn out | Crumbling down | Long dirt grain falling in pitch | 3 |
| Lay egg | An egg is queued and laid | A soft wet "plip" | Sine 900→500 Hz, 60 ms, with a little reverb | 1 |
| Egg hatches | Any egg hatches | A tiny pop | The film's pop, quieter | 1 |
| Queen upgrade | `upgradeQueen` | A royal fanfare, tiny | Four-note arpeggio on a bright square wave, low-passed | 1 |
| Ant limit reached | Cap explainer | A gentle "full" chime | Two notes, the second lower | 3 |
| Cave-in | `cavein` event | A rumble and collapse | Low-pass noise swelling 0.5 s, then a thump; ducks the rest | 1 |
| Repair | A builder repairs a cave-in | Scraping | Band-pass grain, short | 3 |
| Starving | `starving` event | A hollow, worried tone | Minor-second drone swelling under everything for 2 s | 1 |
| Soldiers starving | `soldierfood` event | The same, lower | As above, an octave down | 2 |
| Food store full | Store reaches cap | A soft "ding" | Bell-like sine with a long decay | 3 |

## The yard: ambience

| Sound | When | Sounds like | How | P |
|---|---|---|---|---|
| Yard bed | Always on the surface | Breeze in grass, far birdsong | Very quiet low-pass noise bed with a slow wobble, plus a random chirp every 5–15 s | 2 |
| Region flavour | Changes with the region under the camera | Patio: hum of the house; Spigot / wet strip: drips; Lawn: crickets; hedge: rustle; Oak: creaking | One extra quiet layer per region type, crossfaded as you cross a border | 3 |
| Nest bed | Always in the nest | Close, earthy quiet | Low drone at 60 Hz, very quiet, with an occasional distant scratch | 2 |
| Dew appears | `dew` event | Sparkly twinkles | A few high sine blips with long decays | 2 |
| Puddle | Drinking or carrying water | A wet blip | Sine 1.4→2 kHz, 40 ms | 2 |
| Treat lands | `treat` event | Something tasty plops nearby | thump plus a bright two-note chirp | 1 |
| Big haul home | `bighaul` event | A crowd cheer, ant-sized | grain of high pips, swelling and falling | 2 |

## Weather

| Sound | When | Sounds like | How | P |
|---|---|---|---|---|
| Rain | `rain` event, for the whole shower | Steady rain with fat drops | High-pass noise bed (swell in, fade out) plus random low-pass "plips" | 1 |
| Thunder | Now and then during rain | A far rumble | Low-pass noise, slow attack, 2–3 s decay, random pitch | 2 |
| Rain ends | Rain stops | Drips slowing | plips thinning out over 4 s | 3 |

## Creatures and dangers

| Sound | When | Sounds like | How | P |
|---|---|---|---|---|
| Spider near | Spider on screen | A low, creeping menace | drone at 70 Hz plus slow high tremolo, fades with distance | 1 |
| Spider steps | Spider walking, near | Light, many-legged taps | grain of 8 soft ticks per stride | 2 |
| Spider bite | Spider kills or hits | A wet snap | Band-pass puff plus a sine thump | 1 |
| Spider dies | Spider killed | A big squelch and fanfare | Low-pass puff burst, then the queen-upgrade arpeggio | 1 |
| Caterpillar | Caterpillar on screen | Soft munching | Gentle low grain in a chewing rhythm | 3 |
| Caterpillar dies | Killed | A deflating squeak | Chirp 800→200 Hz | 2 |
| Rival raid | `raid` event | War drums, small | Three quick low thumps, repeating as they march | 1 |
| Fight | Ants biting each other | Clicky scuffle | grain of high ticks, density by fighters near | 2 |
| Queen hit | `queenhit` event | An alarm | Two-tone siren, a fifth apart, three times; ducks everything | 1 |
| Rival queen falls | Win | Victory | A longer version of the film stinger | 1 |
| Colony lost | `lost` event | A slow, falling minor phrase | Theremin-like sine melody, falling | 1 |
| Mower | `mower` event, while it crosses | An engine coming and going | Sawtooth drone at 45–55 Hz with a buzz, louder as it nears the camera | 1 |
| Foot | A foot strike: shadow, then hit | Whoosh down, then a STOMP | Swelling low-pass puff during the shadow, then the film's stomp, plus camera shake | 1 |
| Robin | A bird strike | Wings, a chirp, pecks | Flap: fast low-pass puffs. A two-note bird chirp (sine 3–4 kHz, fast slides). Pecks: sharp ticks | 1 |
| Toad | A toad strike | A croak and a tongue snap | Croak: a 120 Hz square, low-passed, with a fast wobble. Tongue: chirp up plus a wet snap | 1 |
| Acorn | An acorn strike | A whistle down, then a bonk | Chirp falling 1.6 kHz→400 Hz, then a woody knock | 1 |
| Bug spray | A spray strike | A hiss | Band-pass noise at 4 kHz, swelling, held, fading | 1 |
| Fire ants | Stung on their ground | Prickly crackle | Fast random high ticks, while it lasts | 1 |
| Antlion pit | Sliding in, and its bite | Sand trickle, then a snap | Band-pass grain sliding down, then a snap | 2 |

## Music

Charted here too. The plan is a few loops built from the film's instruments, so it all sounds like one game.

| Track | When | Feel | How |
|---|---|---|---|
| Title theme | The title screen | The film's theme, calmer | The theremin melody over a soft groove, looping |
| Yard | Exploring outside | Light, curious, bouncy | Plucked bass, brushed snare, a marimba melody. About 90 bpm |
| Nest | In the nest | Warm, steady, a little hypnotic | Low drone, soft kick, a slow arpeggio |
| Danger | The spider near, a raid, the queen hit | Tense, faster | The yard groove with the drums doubled and an ominous drone. Crossfades in and out |
| Rain | During rain | Quiet, soft | The current track low-passed, with fewer instruments |

- **Adaptive, not a playlist.** The tracks share a tempo and key, so the game crossfades between layers as things change.
- **Quiet by default** and ducked under big effects, with its own volume in Options.

## Build order

Done in 11.3: the engine (unlocked by the first tap; panned and faded by distance; caps, cooldowns and pitch variation; Sound on/off in Options) and these priority-1 sounds:

- **Buttons:** taps, the trail toggle, the explainer chime, the "too heavy" bonk.
- **Your ant:** pick up, drop, deliver, recruit pips, release, lift, entering and leaving the nest, dying, hatching as you.
- **The colony:** the queen digging, building the nest, placing and finishing a room, laying, hatching, the queen upgrade, a cave-in, starving, a treat landing.
- **Dangers:**
  - the spider's menace, bite and death, and the caterpillar's death
  - the raid drums and the queen alarm
  - winning and losing
  - the mower; feet (whoosh, then stomp); robins (wings, chirp, pecks)
  - toads (croak, tongue); acorns (whistle, bonk); bug spray (hiss); fire ants (crackle)
- **Weather:** rain.

Not in 11.3 from priority 1: the separate Music and Effects volumes (only on/off so far), and the "can't do that" bonk on disabled buttons (only "too heavy" plays it).

The plan from here:

1. The sound engine:
   - a shared `Sfx` module (`game/src/audio/`), unlocked by the first tap like the film
   - distance panning and fading, voice caps and cooldowns
   - the Music and Effects volumes in Options
2. Priority 1: buttons, your ant's actions, the colony's key moments, rain, and every danger's warning and hit.
3. The yard and nest ambience beds, then the music layers.
4. Priority 2 and 3 polish, tuned by ear in play.
