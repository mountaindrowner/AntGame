# Underfoot on itch.io

Everything the itch.io page needs. Re-render the art after a build with `node scripts/itch-art.mjs` (from `game/`). It drives the real game, so the pictures always match it.

## Files

| File | Where it goes | Size |
|---|---|---|
| `description.html` | Edit game → Description (switch the editor to HTML and paste) | — |
| `cover.png` | Edit game → Cover image | 630×500 (itch's size) |
| `banner.png` | Edit theme → Banner image | 960×320 |
| `background.png` | Edit theme → Background image: **tile it** (repeat), don't stretch | 512×512 tile |
| `shot-1-crew.png` | Screenshots, first: a crew hauling a gummy bear home | 1280×720 |
| `shot-2-nest.png` | The nest, every room furnished | 1280×720 |
| `shot-3-spider.png` | The wolf spider in the Flowerbed | 1280×720 |
| `shot-4-outpost.png` | An outpost cairn at the Spigot | 1280×720 |
| `shot-5-evolve.png` | The evolution tree | 1280×720 |
| `phone-1-title.png` | The title screen on a phone | 1170×2532 |
| `phone-2-goals.png` | The goals board on a phone | 1170×2532 |

The game itself is `underfoot-itch.zip` (the built `dist/`), uploaded as the HTML file to play in the browser.

## Edit game

- **Title:** Underfoot!
- **Short description or tagline** (itch's 120-character line under the title): *One queen. One rock. One very big yard. Raise an ant colony in a PS1-style backyard.*
- **Kind of project:** HTML.
- **Uploads:** `underfoot-itch.zip`, ticked "This file will be played in the browser".
- **Embed options:**
  - Viewport: 540 × 960 for a portrait game in the page (or 960 × 640 if most of your audience is on desktop).
  - Tick **Mobile friendly**, orientation **Portrait**.
  - Tick **Fullscreen button**.
  - Leave "Automatically start on page load" off, so the sound unlocks on the first tap.
- **Classification:** Games.
- **Release status:** In development.
- **Genre:** Simulation.
- **Tags** (itch takes 10): ants, colony-sim, simulation, strategy, retro, low-poly, psx, nature, singleplayer, mobile.
- **Made with:** Three.js.
- **Inputs:** Touchscreen, Mouse.
- **Average session:** About an hour.
- **Languages:** English.

## Edit theme

The game's own colours: dark loam, cream paper, gold and leaf green.

| itch setting | Colour | Notes |
|---|---|---|
| Background | `#1d140c` | Under the tiled `background.png` |
| Inner background (the page panel) | `#2a1d12` | |
| Text | `#f1e8d6` | The HUD's cream |
| Links | `#ffd34d` | The title's gold |
| Buttons | `#2f7a3a`, button text `#ffffff` | The HUD's leaf green |
| Borders | `#6d5a40` | |

- **Fonts:** headers in **Bungee** (the game's title font), if itch's list has it; otherwise a chunky rounded display face such as **Lilita One** or **Luckiest Guy**. Body text in **Nunito**.
- **Banner:** `banner.png`, aligned centre.
- **Layout:** screenshots in the sidebar, so the portrait phone shots sit well.
