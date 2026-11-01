// Every room has its own look: a painted back wall and a small set of props
// that say what the room is for and react to the colony (stores fill up,
// the cistern rises, larvae wriggle). All props draw through instanced
// crowds, so dressing costs a few draw calls whatever the nest size.
//
// Room-local layout: x from the room's left edge, y up from its floor, z from
// the front face (0) back to the wall (-DEPTH). Ants walk at about
// z = -0.45 DEPTH, so tall props stay behind them (z < -0.6 DEPTH) or hang
// from the ceiling.
import * as THREE from 'three';
import { canvasTexture, rng } from '../ps1/textures.js';
import { psx } from '../ps1/materials.js';
import { PROPS } from './props.js';
import { NEST } from './nestProps.js';

const TRUE = '#ffffff'; // NEST models carry their own colours

// ---------------------------------------------------------------- walls
// 32×32 tiles, one texel per half world px at 1 tile per 16 units.
const WALLS = {
  // Woven fungal tapestry: a diamond lattice with gold knots.
  queen(g) {
    g.fillStyle = '#3e2448'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#5a3466';
    for (let i = 0; i < 32; i++) { g.fillRect(i, i, 1, 1); g.fillRect(31 - i, i, 1, 1); g.fillRect((i + 16) % 32, i, 1, 1); g.fillRect((47 - i) % 32, i, 1, 1); }
    g.fillStyle = '#d8a84a';
    [[0, 0], [16, 0], [8, 8], [24, 8], [0, 16], [16, 16], [8, 24], [24, 24]].forEach(([x, y]) => g.fillRect(x, y, 2, 2));
  },
  // Straw packed against the wall.
  hatchery(g, r) {
    g.fillStyle = '#6a5428'; g.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = r() < 0.5 ? '#a88a44' : '#8a7036';
      const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
      for (let k = 0; k < 5; k++) g.fillRect((x + k) % 32, (y + Math.floor(k / 2)) % 32, 1, 1);
    }
  },
  // Carved storage niches with seeds tucked in.
  store(g, r) {
    g.fillStyle = '#5e4a2a'; g.fillRect(0, 0, 32, 32);
    for (const [x, y] of [[2, 3], [18, 3], [10, 19], [26, 19]]) {
      g.fillStyle = '#3a2c18'; g.fillRect(x, y + 2, 10, 9); g.fillRect(x + 2, y, 6, 2);
      g.fillStyle = '#c9a24a';
      for (let k = 0; k < 4; k++) g.fillRect(x + 1 + Math.floor(r() * 8), y + 7 + Math.floor(r() * 3), 2, 1);
    }
  },
  // Wet blue-grey stone with drip streaks.
  cistern(g, r) {
    g.fillStyle = '#3e4a52'; g.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? '#4a5862' : '#344048'; g.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1); }
    g.fillStyle = '#6a8a9a';
    for (let i = 0; i < 5; i++) { const x = Math.floor(r() * 32); g.fillRect(x, 0, 1, 6 + Math.floor(r() * 18)); }
  },
  // Soft silk, woven in a fine check.
  nursery(g) {
    g.fillStyle = '#8a6a72'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#a8848c';
    for (let y = 0; y < 32; y += 4) g.fillRect(0, y, 32, 1);
    g.fillStyle = '#9a7880';
    for (let x = 0; x < 32; x += 4) g.fillRect(x, 0, 1, 32);
  },
  // Dark wall scratched with tally marks.
  barracks(g) {
    g.fillStyle = '#4a2a24'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#7a5040';
    for (const [x, y] of [[3, 4], [19, 18]]) {
      for (let k = 0; k < 4; k++) g.fillRect(x + k * 2, y, 1, 8);
      for (let k = 0; k < 9; k++) g.fillRect(x - 1 + k, y + 6 - Math.floor(k * 0.6), 1, 1);
    }
  },
  // Build 19's armory: dark chitin plates riveted together.
  armory(g) {
    g.fillStyle = '#2a3430'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#1a2420';
    for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < 32; x += 16) g.fillRect(x, y, 15, 7);
    g.fillStyle = '#8a9a8a';
    for (let y = 1; y < 32; y += 8) for (let x = 2; x < 32; x += 8) g.fillRect(x, y, 1, 1);
  },
  // Build 23. Fungus garden: a pale spongy comb.
  fungus(g, r) {
    g.fillStyle = '#5a4a36'; g.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 32); g.fillStyle = r() < 0.5 ? '#c8b894' : '#a8987a'; g.fillRect(x, y, 2, 2); g.fillStyle = '#3e3022'; g.fillRect(x + 1, y + 1, 1, 1); }
  },
  // Aphid barn: dark earth threaded with pale roots.
  dairy(g, r) {
    g.fillStyle = '#3e2c1c'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#8a6a44';
    for (let i = 0; i < 6; i++) { let x = Math.floor(r() * 32); for (let y = 0; y < 32; y++) { g.fillRect(x % 32, y, 1, 1); if (r() < 0.3) x += r() < 0.5 ? 1 : 31; } }
    g.fillStyle = '#7aa84a'; for (let i = 0; i < 14; i++) g.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1);
  },
  // Infirmary: soft moss-lined walls.
  infirmary(g, r) {
    g.fillStyle = '#4e5a3a'; g.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? '#5e6e44' : '#42502e'; g.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1); }
    g.fillStyle = '#c8d4a0'; for (let i = 0; i < 8; i++) g.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1);
  },
  // Granary: smoothed clay with seed niches.
  granary(g, r) {
    g.fillStyle = '#7a5434'; g.fillRect(0, 0, 32, 32);
    for (const [x, y] of [[3, 4], [19, 4], [11, 20], [27, 20]]) {
      g.fillStyle = '#4a321e'; g.fillRect(x, y, 8, 7);
      g.fillStyle = '#e0bc5a'; for (let k = 0; k < 6; k++) g.fillRect(x + 1 + Math.floor(r() * 6), y + 3 + Math.floor(r() * 3), 2, 1);
    }
  },
  // Build 24. Honeypot vault: warm amber-stained earth.
  honeypot(g, r) {
    g.fillStyle = '#5a3a1e'; g.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? '#6e4a24' : '#4e321a'; g.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1); }
    g.fillStyle = '#d89a3a'; for (let i = 0; i < 10; i++) { const x = Math.floor(r() * 32); g.fillRect(x, 0, 1, 2 + Math.floor(r() * 4)); }
  },
  // Midden: dark, crumbly refuse.
  midden(g, r) {
    g.fillStyle = '#2e241c'; g.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.4 ? '#3e3226' : r() < 0.7 ? '#241c14' : '#4a4236'; g.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1 + (r() < 0.3), 1); }
  },
  // Dressed stone blocks.
  workshop(g) {
    g.fillStyle = '#6a6256'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#3e3830';
    for (let y = 0; y < 32; y += 8) {
      g.fillRect(0, y, 32, 1);
      for (let x = (y / 8) % 2 ? 4 : 12; x < 32; x += 16) g.fillRect(x, y, 1, 8);
    }
    g.fillStyle = '#6e665a';
    for (let y = 1; y < 32; y += 8) g.fillRect(0, y, 32, 1);
  },
};

const wallCache = new Map();
export function roomWallMaterial(key) {
  if (!wallCache.has(key)) {
    const draw = WALLS[key] || WALLS.workshop;
    const tex = canvasTexture(32, 32, (g) => draw(g, rng(key.length * 97 + 13)));
    // Vertex colour and alpha (build 20.5): the panel darkens and fades at its edge.
    wallCache.set(key, psx({ map: tex, vertexColors: true, transparent: true }));
  }
  return wallCache.get(key);
}

// ---------------------------------------------------------------- props
// d.put(geo, [x, y, z], [sx, sy, sz], color, [rx, ry, rz]) places a prop in
// room-local coordinates. d also carries the colony, time and room size.
const DRESS = {
  queen(d) {
    const { W, H, D, t } = d;
    // Moss bed behind her, a velvet petal pillow, three eggs she has just laid.
    d.put(NEST.moss, [W / 2, 0, -D * 0.8], [W * 0.36, 6, D * 0.18], TRUE);
    d.put(PROPS.dome, [W / 2 - 12, 0, -D * 0.7], [7, 3.2, 3.6], '#6a4a7a');
    for (let i = 0; i < 3; i++) d.put(NEST.egg, [W / 2 + 8 + i * 2.6, 6.4 + (i % 2) * 0.8, -D * 0.74], [1.1, 1.1, 1.1], TRUE, [0, 0, 0.3 * i]);
    // Her shed wings, pinned to the wall like a trophy.
    d.put(NEST.wingL, [W / 2 - 8, H - 15, -D + 0.6], [7, 7, 1], TRUE, [0, 0, -0.5]);
    d.put(NEST.wing, [W / 2 + 8, H - 15, -D + 0.6], [7, 7, 1], TRUE, [0, 0, 0.5]);
    // Glow-worm lamp on a root.
    const glow = 0.8 + 0.2 * Math.sin(t * 2.3);
    d.put(PROPS.box, [W - 12, H - 4, -D * 0.7], [0.6, 8, 0.6], '#6a4a30');
    d.put(PROPS.dew, [W - 12, H - 9.5, -D * 0.7], [2.2, 2.8, 2.2], d.mix('#a86a20', '#ffd27a', glow));
    // Petal rug on the floor.
    for (let i = 0; i < 5; i++) d.put(PROPS.puddle, [10 + i * 11, 0.2, -D * 0.4 + (i % 2) * 3], [4, 1, 3], i % 2 ? '#c8607a' : '#e08aa0', [0, i, 0]);
  },
  hatchery(d) {
    const { W, H, D, t } = d;
    // Woven straw bowls that cradle the eggs.
    for (let i = 0; i < Math.max(1, Math.floor(W / 24)); i++) d.put(NEST.cradle, [14 + i * 24, 0, -D * 0.72], [8, 5, 5], '#c8a24e');
    // A warming stone that glows.
    const warm = 0.5 + 0.5 * Math.sin(t * 1.4);
    d.put(PROPS.pebble, [W - 8, 3, -D * 0.75], [5, 4, 4], d.mix('#8a4a2a', '#ffa860', warm));
    // Condensation beads on the wall.
    for (let i = 0; i < 6; i++) d.put(NEST.drop, [6 + i * (W - 12) / 5, H - 6 - (i % 3) * 5, -D + 0.8], [0.9, 0.9, 0.6], TRUE);
  },
  store(d) {
    const { W, H, D, col, t } = d;
    const fill = Math.min(1, col.store / Math.max(1, col.cap));
    // Seed heaps on the floor grow with the stock.
    const n = Math.max(2, Math.round(W / 16));
    for (let i = 0; i < n; i++) {
      const x = 8 + i * (W - 16) / (n - 1), full = i < Math.max(1, Math.round(fill * n));
      if (full) d.put(NEST.seedHeap, [x, 0, -D * 0.72], [6.5, 4 + 4 * fill, 5.5], TRUE, [0, i * 1.3, 0]);
      else d.put(PROPS.cone, [x, 1, -D * 0.72], [5, 2, 4], '#5a4a2a');
    }
    // Honeypot ants hanging from the ceiling, one more for each quarter full.
    const pots = Math.round(fill * 4);
    for (let i = 0; i < pots; i++) d.put(NEST.replete, [10 + i * (W - 20) / 3, H, -D * 0.82], [3.4, 3.4, 3.4], TRUE, [0, 0.4, Math.sin(t * 0.9 + i * 2) * 0.06]);
    // Seeds stored in the wall niches, filling top shelf last.
    const seeds = Math.round(fill * 10);
    for (let i = 0; i < seeds; i++) d.put(PROPS.seed, [6 + (i % 5) * (W - 12) / 4, H - 12 - Math.floor(i / 5) * 12, -D + 1.2], [2.4, 1.6, 1.4], '#c9a24a', [0, 0, 0.4]);
    // A sugar crystal for show.
    if (fill > 0.5) d.put(PROPS.gem, [W - 7, 4, -D * 0.6], [3, 4, 3], '#f0b84a', [0, d.t * 0.5, 0]);
  },
  cistern(d) {
    // The water itself is its own mesh (nestView's waterGeometry): a tank
    // filling the back of the chamber, shaped to its walls. Here: what is in
    // and around it.
    const { W, H, D, col, t } = d;
    const lvl = Math.min(1, col.water / Math.max(1, col.waterCap));
    const h = Math.max(0.6, (H - 10) * lvl);
    // A wet tide mark on the wall where the water stood highest.
    d.put(PROPS.box, [W / 2, Math.min(H - 8, h + 1.2), -D + 0.6], [W * 0.62, 0.7, 0.2], '#2e3e46');
    // A pebble bed on the bottom, seen through the water.
    for (let i = 0; i < 6; i++) d.put(PROPS.pebble, [7 + i * (W - 14) / 5, 1.6, -D * (0.72 + (i % 2) * 0.12)], [3, 1.8, 2.4], i % 2 ? '#7a8a8c' : '#9a9a90', [0, i, 0]);
    // A leaf floating on the surface.
    d.put(PROPS.leaf, [W / 2 + Math.sin(t * 0.7) * 6, h + 0.3, -D * 0.78], [6, 4, 6], '#5a9a3a', [0, t * 0.3, 0]);
    // Bubbles rising from the bed.
    if (h > 4) for (let i = 0; i < 4; i++) { const k = (t * 0.35 + i * 0.27) % 1; d.put(PROPS.dew, [10 + i * (W - 20) / 3 + Math.sin(t * 3 + i) * 0.8, 1.5 + k * (h - 2), -D * 0.8], [0.6, 0.6, 0.6], '#d8f0ff'); }
    // Glints sliding along the surface.
    for (let i = 0; i < 3; i++) { const k = (t * 0.12 + i / 3) % 1; d.put(PROPS.box, [8 + k * (W - 16), h + 0.15, -D * (0.68 + i * 0.08)], [3 + i, 0.15, 0.6], '#f4fcff'); }
    // Drips from roots in the ceiling, falling on a loop; a ring spreads where each lands.
    for (let i = 0; i < 2; i++) {
      const x = W * (0.3 + i * 0.4), ph = (t * 0.9 + i * 0.5) % 1;
      d.put(PROPS.box, [x, H - 2, -D * 0.8], [0.6, 4, 0.6], '#6a4a30');
      if (ph < 0.75) d.put(NEST.drop, [x, H - 4 - (ph / 0.75) * (H - 4 - h), -D * 0.8], [0.9, 1, 0.9], TRUE);
      else { const k = (ph - 0.75) / 0.25; d.put(PROPS.ring, [x, h + 0.2, -D * 0.8], [1 + k * 5, 1, 1 + k * 3], d.mix('#f4fcff', '#5aa0d8', k)); }
    }
  },
  nursery(d) {
    const { W, H, D, t } = d;
    // Larvae wriggling in silk cradles.
    const n = Math.max(2, Math.floor(W / 18));
    for (let i = 0; i < n; i++) {
      const x = 9 + i * (W - 18) / (n - 1);
      d.put(NEST.cradle, [x, 0, -D * 0.72], [6, 4, 4], '#f8e0e4');
      d.put(NEST.larva, [x, 5, -D * 0.72], [2.3, 2.3, 2.3], TRUE, [0, 0.2, Math.sin(t * 3 + i * 1.7) * 0.3]);
    }
    // Cocoons standing in a row against the wall.
    for (let i = 0; i < 3; i++) d.put(NEST.cocoon, [W - 8 - i * 6, 5.6, -D + 3], [2.9, 2.9, 2.9], TRUE, [0, i, (i - 1) * 0.12]);
    // Silk threads from the ceiling.
    for (let i = 0; i < 3; i++) d.put(PROPS.box, [8 + i * 9, H - 5, -D * 0.85], [0.4, 10, 0.4], '#f0e6ea');
  },
  barracks(d) {
    const { W, H, D, t } = d;
    // Thorn spears on a twig rack.
    d.put(NEST.spearRack, [14, 0, -D + 2.5], [10, 10, 6], TRUE);
    // Training dummy: a ground beetle's husk from an old hunt.
    d.put(NEST.husk, [W - 14, 0, -D * 0.72], [8, 8, 7], TRUE, [0, -0.4, 0]);
    // Leaf banner with a red stripe.
    d.put(NEST.banner, [W / 2, H - 3, -D + 0.8], [7, 7, 7], TRUE);
    // Two soldiers asleep on the floor, helmets tipped over their eyes.
    for (let i = 0; i < 2; i++) { const b = 1 + 0.04 * Math.sin(t * 1.3 + i * 2); d.put(NEST.sleeper, [W / 2 - 12 + i * 22, 0, -D * 0.66], [1.3, 1.3 * b, 1.3], TRUE, [0, i ? 2.8 : 0.3, 0]); }
  },
  workshop(d) {
    const { W, D, col } = d;
    // Stone workbench with a leaf being cut and a thorn chisel.
    d.put(NEST.bench, [W / 2, 0, -D * 0.72], [W * 0.25, 10, 9], TRUE);
    // Twig bundle leaning on the wall.
    d.put(NEST.twigs, [W - 8, 0, -D + 3], [10, 10, 10], TRUE, [0, 0, 0.1]);
    // Stone stack: one pebble per 3 stone in stock, up to ten.
    const stones = Math.min(10, Math.floor(col.grit / 3));
    for (let i = 0; i < stones; i++) d.put(PROPS.pebble, [8 + (i % 4) * 4.5, 2 + Math.floor(i / 4) * 3.2, -D * 0.8], [2.4, 2, 2.2], '#9a948c', [0, i, 0]);
    // Sawdust heap.
    d.put(PROPS.cone, [W * 0.35, 1.5, -D * 0.6], [4, 3, 3], '#c8a868');
  },
  // Build 23.
  fungus(d) {
    const { W, H, D, col, t } = d, fill = Math.min(1, (col.fungus || 0) / 60);
    // Combs of fungus on beds of cut leaf, swelling as the garden is fed; white knots of food on them.
    for (let i = 0; i < 3; i++) {
      const x = W * (0.22 + i * 0.28), k = 0.7 + fill * 0.5 + (i % 2) * 0.1;
      for (let j = 0; j < 5; j++) d.put(PROPS.leaf, [x + (j - 2) * 3, 0.4, -D * (0.7 + (j % 2) * 0.08)], [5, 3, 5], j % 2 ? '#4a8a2a' : '#6aa83a', [0, j * 1.3, 0]);
      d.put(PROPS.dome, [x, 0.5, -D * 0.8], [10 * k, 12 * k, 6 * k], '#e4d8bc');
      d.put(PROPS.dome, [x - 4, 0.5, -D * 0.74], [6 * k, 8 * k, 4 * k], '#d8ccae');
      d.put(PROPS.dome, [x + 4, 0.5, -D * 0.76], [5 * k, 6 * k, 4 * k], '#ece2c8');
      for (let j = 0; j < 6; j++) d.put(PROPS.dew, [x + (j - 2.5) * 2.8, 10 * k + Math.sin(j * 2) * 2, -D * 0.72], [1.2, 1.2, 1.2], '#fffaf0');
    }
    // Leaf pieces waiting by the door.
    for (let i = 0; i < Math.round(fill * 6); i++) d.put(PROPS.leaf, [5 + i * 2.2, 0.6 + (i % 2), -D * 0.55], [3, 2, 3], '#5aa034', [0, i, 0.3]);
  },
  dairy(d) {
    const { W, H, D, t } = d;
    // Roots hang from the ceiling, crusted with green root aphids, honeydew dripping into a cup.
    for (let i = 0; i < 4; i++) {
      const x = W * (0.15 + i * 0.23), len = 12 + (i % 2) * 6;
      d.put(PROPS.thorn, [x, H - len / 2, -D * 0.8], [1.6, len, 1.6], '#8a6a44', [0, 0, Math.PI]);
      for (let j = 0; j < 6; j++) d.put(PROPS.dew, [x + Math.sin(j * 2.3) * 1.4, H - 2 - j * (len / 7), -D * 0.76], [1.1, 0.9, 1.1], j % 2 ? '#7ab84a' : '#9acc5a');
      const ph = (t * 0.6 + i * 0.3) % 1;
      d.put(PROPS.dew, [x, H - len - ph * (H - len - 4), -D * 0.76], [0.7, 0.9, 0.7], '#f0c860');
      d.put(PROPS.cone, [x, 1.2, -D * 0.76], [2.4, 2.4, 2.4], '#a8784a', [Math.PI, 0, 0]);
    }
    // A pool of honeydew in the middle.
    d.put(PROPS.puddle, [W / 2, 0.3, -D * 0.6], [6, 1, 4], '#e8b840');
  },
  infirmary(d) {
    const { W, H, D } = d;
    // Leaf cots, a moss pile, a dish of dew, rolled bandages of silk and a medic's satchel.
    for (let i = 0; i < 3; i++) d.put(PROPS.leaf, [8 + i * 13, 0.6, -D * 0.68], [6, 2, 4], '#6a9a3a', [0, 0.2 * i, 0]);
    d.put(NEST.moss, [W - 8, 0, -D * 0.8], [6, 5, 4], TRUE);
    d.put(PROPS.puddle, [W / 2, 0.4, -D * 0.5], [3.2, 1, 2.4], '#7ac0e8');
    d.put(PROPS.cyl, [W / 2, 0.6, -D * 0.5], [3.6, 1.2, 2.8], '#c8c0b0');
    for (let i = 0; i < 3; i++) d.put(PROPS.cyl, [6 + i * 3.2, 1.4, -D + 3], [1.4, 1.4, 1.4], '#f4f0e8', [Math.PI / 2, 0, 0]);
    d.put(PROPS.box, [W - 6, H - 10, -D + 1.2], [4, 3, 1], '#f0ece2');
    d.put(PROPS.box, [W - 6, H - 10, -D + 1.8], [2.4, 0.6, 0.2], '#e02020');
    d.put(PROPS.box, [W - 6, H - 10, -D + 1.8], [0.6, 2.4, 0.2], '#e02020');
  },
  granary(d) {
    const { W, H, D, col } = d, fill = Math.min(1, col.store / Math.max(1, col.cap));
    // Heaps of seed, a millstone pebble with rounds of ant bread, seed in the wall niches.
    for (let i = 0; i < 3; i++) d.put(NEST.seedHeap, [8 + i * (W - 16) / 2, 0, -D * 0.74], [6, 3 + 6 * fill, 5], TRUE, [0, i, 0]);
    d.put(PROPS.cyl, [W * 0.5, 2.2, -D * 0.55], [4, 1.6, 4], '#9a948c');
    d.put(PROPS.cyl, [W * 0.5, 3.6, -D * 0.55], [3, 1.2, 3], '#aaa49a');
    for (let i = 0; i < 3; i++) d.put(PROPS.puddle, [W * 0.5 + 7 + i * 0.4, 0.4 + i * 0.5, -D * 0.5], [2.6, 3, 2.6], '#d8a858');
    for (let i = 0; i < 8; i++) d.put(PROPS.seed, [6 + (i % 4) * (W - 12) / 3, H - 10 - Math.floor(i / 4) * 10, -D + 1.2], [2.4, 1.6, 1.4], '#d8b04a', [0, 0, 0.4]);
  },
  // Build 24.
  honeypot(d) {
    const { W, H, D, col, t } = d, fill = Math.min(1, col.store / Math.max(1, col.cap));
    // Repletes hang in rows from the ceiling, their amber crops swelling with the stock.
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
      const x = W * (0.16 + i * 0.22) + row * 4, k = 2.6 + fill * 1.6 + ((i + row) % 2) * 0.4;
      d.put(NEST.replete, [x, H - row * 2, -D * (0.86 - row * 0.1)], [k, k, k], TRUE, [0, 0.4 + i, Math.sin(t * 0.8 + i * 2 + row) * 0.05]);
    }
    d.put(PROPS.puddle, [W / 2, 0.3, -D * 0.55], [5, 1, 3], '#e8b040');
  },
  midden(d) {
    const { W, D } = d;
    // Heaps of refuse: husks, dark crumbs, shells, a few pale mushrooms growing on it.
    for (let i = 0; i < 3; i++) d.put(PROPS.cone, [W * (0.25 + i * 0.25), 3, -D * 0.74], [6, 6 + (i % 2) * 2, 4.5], i % 2 ? '#3a2c1e' : '#4a3a28');
    for (let i = 0; i < 10; i++) d.put(PROPS.pebble, [5 + i * (W - 10) / 9, 1 + (i % 3), -D * (0.6 + (i % 2) * 0.12)], [1.4, 1, 1.2], ['#1e1610', '#5a4a3a', '#8a7a5a'][i % 3], [0, i, 0]);
    for (let i = 0; i < 4; i++) d.put(PROPS.dome, [W * (0.2 + i * 0.2), 0.4, -D * 0.6], [1.6, 1.4, 1.6], '#e8e0cc');
    d.put(PROPS.egg, [W * 0.7, 1.2, -D * 0.62], [2.4, 1.2, 1.4], '#2a1a12');
  },
  armory(d) {
    const { W, H, D } = d;
    // Wing-case shields on the wall, a spear rack, a heap of spare plates.
    for (let i = 0; i < 3; i++) d.put(NEST.shield, [W * (0.25 + i * 0.25), H - 16, -D + 1], [11, 11, 8], TRUE, [0, 0, (i - 1) * 0.15]);
    d.put(NEST.spearRack, [W - 14, 0, -D + 2.5], [10, 10, 6], TRUE);
    for (let i = 0; i < 4; i++) d.put(PROPS.pebble, [10 + i * 4, 1.6 + (i === 3 ? 2 : 0), -D * 0.72], [3, 1.4, 2.6], i % 2 ? '#1e3a34' : '#2e5248', [0, i * 1.7, 0.2]);
  },
};

const tmpC1 = new THREE.Color(), tmpC2 = new THREE.Color();
function mix(a, b, k) { return '#' + tmpC1.set(a).lerp(tmpC2.set(b), Math.max(0, Math.min(1, k))).getHexString(); }

// Seams (build 20.5): roots break through the ceiling near the walls, so a
// chamber reads as dug into the soil, not cut out of it.
function seams(d, r) {
  const { W, D, ceil } = d, h = (k) => { const x = Math.sin((r.x0 * 31 + r.y0 * 17 + k) * 127.1) * 43758.5; return x - Math.floor(x); };
  if (!ceil) return;
  for (const [i, u] of [[0, 0.16 + h(1) * 0.06], [1, 0.8 + h(2) * 0.06]]) {
    const x = W * u, top = ceil(x) + 1.5, len = 7 + h(3 + i) * 5, lean = (h(5 + i) - 0.5) * 0.25;
    d.put(PROPS.thorn, [x, top - len / 2, -D * 0.86], [1.3, len, 1.3], '#6e4a2a', [0, 0, Math.PI + lean]);
    d.put(PROPS.thorn, [x + (i ? -1.2 : 1.2), top - len * 0.3, -D * 0.86], [0.7, len * 0.5, 0.7], '#7e5832', [0, 0, Math.PI + (i ? 0.5 : -0.5)]);
  }
}

// Dress one room. put(geo, pos, scale, color, rot) receives WORLD coordinates.
export function dressRoom(r, ctx) {
  const fn = DRESS[r.key];
  const T = ctx.T, w = (r.w || 4) * T, h = (r.h || 3) * T;
  const x0 = r.x0 * T, floor = -(r.y0 + (r.h || 3)) * T;
  const d = {
    W: w, H: h, D: ctx.DEPTH, t: ctx.t, col: ctx.col, mix, tier: ctx.tier || 0, ceil: ctx.ceil,
    put: (geo, p, sc, color, rot) => ctx.put(geo, [x0 + p[0], floor + p[1], p[2]], sc, color, rot),
  };
  seams(d, r);
  if (fn) fn(d);
}
