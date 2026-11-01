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
    wallCache.set(key, psx({ map: tex }));
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
    const { W, H, D, col, t } = d;
    const lvl = Math.min(1, col.water / Math.max(1, col.waterCap));
    const h = Math.max(0.6, (H - 10) * lvl);
    const ripple = 1 + 0.03 * Math.sin(t * 3);
    d.put(NEST.pool, [W / 2, (h * ripple) / 2, -D * 0.55], [W - 4, h * ripple, D * 0.8], TRUE);
    d.put(PROPS.leaf, [W / 2 + Math.sin(t * 0.7) * 6, h * ripple + 0.4, -D * 0.5], [6, 4, 6], '#5a9a3a', [0, t * 0.3, 0]);
    // Pebble rim along the back.
    for (let i = 0; i < 5; i++) d.put(PROPS.pebble, [6 + i * (W - 12) / 4, 2.4, -D + 2.5], [3, 2.4, 2.4], '#8a8a84', [0, i, 0]);
    // Drips from roots in the ceiling, falling on a loop.
    for (let i = 0; i < 2; i++) {
      const x = W * (0.3 + i * 0.4);
      d.put(PROPS.box, [x, H - 2, -D * 0.6], [0.6, 4, 0.6], '#6a4a30');
      const fall = ((t * 0.9 + i * 0.5) % 1) * (H - 4 - h);
      d.put(NEST.drop, [x, H - 4 - fall, -D * 0.6], [0.9, 1, 0.9], TRUE);
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

// Dress one room. put(geo, pos, scale, color, rot) receives WORLD coordinates.
export function dressRoom(r, ctx) {
  const fn = DRESS[r.key];
  if (!fn) return;
  const T = ctx.T, w = (r.w || 4) * T, h = (r.h || 3) * T;
  const x0 = r.x0 * T, floor = -(r.y0 + (r.h || 3)) * T;
  fn({
    W: w, H: h, D: ctx.DEPTH, t: ctx.t, col: ctx.col, mix,
    put: (geo, p, sc, color, rot) => ctx.put(geo, [x0 + p[0], floor + p[1], p[2]], sc, color, rot),
  });
}
