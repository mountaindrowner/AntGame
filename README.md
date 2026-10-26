# Underfoot

An ant-colony game inspired by SimAnt: you are the mind of the colony, one body at a time. Phone-first, portrait.

- **[`docs/HANDOFF.md`](docs/HANDOFF.md)**: the project brain. Origin, design of record, prototype internals and the roadmap. Start here.
- **[`docs/DECISIONS.md`](docs/DECISIONS.md)**: what changed and why since the handoff, plus open gaps.
- **[`game/`](game/)**: the game. Build 6's simulation with a PS1-style Three.js renderer. `cd game && npm install && npm run dev`. See [`game/README.md`](game/README.md).
- **[`prototype/`](prototype/)**: build 6 as handed off (frozen reference), a single HTML page with a DOM-free `sim.js`. Open `prototype/underfoot-poc.html` on a phone. Rebuild it with `cat page-head.html sim.js app.js page-tail.html > underfoot-poc.html`, then smoke-test with `node prototype/smoke-test.js`.
- **[`art-direction-3d/`](art-direction-3d/)**: live Three.js style mockups. PS1 retro is the current favourite, with a retro-console family built around it. Open `art-direction-3d/index.html`.
- **[`art-direction/`](art-direction/)**: the earlier 2D mockups from `docs/UNDERFOOT_STYLE_BRIEF.md` (set aside).
