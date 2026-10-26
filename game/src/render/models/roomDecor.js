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
    // Moss bed behind her.
    d.put(PROPS.dome, [W / 2, 0, -D * 0.78], [W * 0.38, 5, D * 0.18], '#4a5a2e');
    d.put(PROPS.dome, [W / 2 - 10, 0, -D * 0.72], [8, 3.5, 4], '#6a4a7a');
    // Her shed wings, pinned to the wall like a trophy.
    d.put(PROPS.wing, [W / 2 - 7, H - 15, -D + 0.6], [10, 3.4, 1], '#e8e0d0', [0, 0, 0.5]);
    d.put(PROPS.wing, [W / 2 + 7, H - 15, -D + 0.6], [10, 3.4, 1], '#e8e0d0', [0, 0, -0.5]);
    // Glow-worm lamp on a root.
    const glow = 0.8 + 0.2 * Math.sin(t * 2.3);
    d.put(PROPS.box, [W - 12, H - 4, -D * 0.7], [0.6, 8, 0.6], '#6a4a30');
    d.put(PROPS.dew, [W - 12, H - 9.5, -D * 0.7], [2.2, 2.8, 2.2], d.mix('#a86a20', '#ffd27a', glow));
    // Petal rug on the floor.
    for (let i = 0; i < 5; i++) d.put(PROPS.puddle, [10 + i * 11, 0.2, -D * 0.4 + (i % 2) * 3], [4, 1, 3], i % 2 ? '#c8607a' : '#e08aa0', [0, i, 0]);
  },
  hatchery(d) {
    const { W, H, D, t } = d;
    // Straw bowls that cradle the eggs.
    for (let i = 0; i < Math.max(1, Math.floor(W / 24)); i++) d.put(PROPS.torus, [14 + i * 24, 1.2, -D * 0.7], [8, 3, 5], '#b8963e');
    // A warming stone that glows.
    const warm = 0.5 + 0.5 * Math.sin(t * 1.4);
    d.put(PROPS.pebble, [W - 8, 3, -D * 0.75], [5, 4, 4], d.mix('#8a4a2a', '#ffa860', warm));
    // Condensation beads on the wall.
    for (let i = 0; i < 6; i++) d.put(PROPS.dew, [6 + i * (W - 12) / 5, H - 6 - (i % 3) * 5, -D + 0.8], [0.9, 1.1, 0.6], '#9ad0f0');
  },
  store(d) {
    const { W, H, D, col } = d;
    const fill = Math.min(1, col.store / Math.max(1, col.cap));
    // Floor heaps grow with the stock.
    const n = Math.max(2, Math.round(W / 16));
    for (let i = 0; i < n; i++) {
      const full = i < Math.max(1, Math.round(fill * n));
      const h = full ? 6 + 6 * fill : 2;
      d.put(PROPS.cone, [8 + i * (W - 16) / (n - 1), h / 2, -D * 0.72], [5, h, 4], full ? '#e8c45a' : '#5a4a2a');
      if (full) d.put(PROPS.crumb, [8 + i * (W - 16) / (n - 1) + 1, h + 0.8, -D * 0.7], [1.6, 1.6, 1.6], '#f2d36b');
    }
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
    d.put(PROPS.box, [W / 2, (h * ripple) / 2, -D * 0.55], [W - 4, h * ripple, D * 0.8], '#3c8ac8');
    d.put(PROPS.leaf, [W / 2 + Math.sin(t * 0.7) * 6, h * ripple + 0.4, -D * 0.5], [6, 4, 6], '#5a9a3a', [0, t * 0.3, 0]);
    // Pebble rim along the back.
    for (let i = 0; i < 5; i++) d.put(PROPS.pebble, [6 + i * (W - 12) / 4, 2.4, -D + 2.5], [3, 2.4, 2.4], '#8a8a84', [0, i, 0]);
    // Drips from roots in the ceiling, falling on a loop.
    for (let i = 0; i < 2; i++) {
      const x = W * (0.3 + i * 0.4);
      d.put(PROPS.box, [x, H - 2, -D * 0.6], [0.6, 4, 0.6], '#6a4a30');
      const fall = ((t * 0.9 + i * 0.5) % 1) * (H - 4 - h);
      d.put(PROPS.dew, [x, H - 4 - fall, -D * 0.6], [0.9, 1.3, 0.9], '#9ad0f0');
    }
  },
  nursery(d) {
    const { W, H, D, t } = d;
    // Larvae wriggling in silk cradles.
    const n = Math.max(2, Math.floor(W / 18));
    for (let i = 0; i < n; i++) {
      const x = 9 + i * (W - 18) / (n - 1);
      d.put(PROPS.torus, [x, 1, -D * 0.72], [6, 2.4, 4], '#e8d8dc');
      d.put(PROPS.larva, [x, 3.6, -D * 0.72], [2.6, 2.6, 2.6], '#f6eedc', [0, 0.3, Math.sin(t * 3 + i * 1.7) * 0.35]);
    }
    // Pupae standing in a row against the wall.
    for (let i = 0; i < 3; i++) d.put(PROPS.egg, [W - 8 - i * 6, 5, -D + 3], [2.4, 5.2, 2.4], '#d8c098');
    // Silk threads from the ceiling.
    for (let i = 0; i < 3; i++) d.put(PROPS.box, [8 + i * 9, H - 5, -D * 0.85], [0.4, 10, 0.4], '#f0e6ea');
  },
  barracks(d) {
    const { W, H, D } = d;
    // Thorn weapon rack.
    d.put(PROPS.box, [14, 9, -D + 2], [22, 1.2, 1.2], '#6a4a30');
    for (let i = 0; i < 4; i++) d.put(PROPS.thorn, [6 + i * 5.5, 9, -D + 3], [1, 16, 1], '#c8b890', [0, 0, 0.12]);
    // Training dummy: a beetle husk from an old hunt.
    d.put(PROPS.dome, [W - 16, 0, -D * 0.72], [9, 8, 6], '#1e3a34');
    d.put(PROPS.egg, [W - 7, 3.5, -D * 0.72], [2.6, 2.2, 2.2], '#16302a');
    // Leaf banner with a red stripe.
    d.put(PROPS.leaf, [W / 2, H - 9, -D + 0.8], [9, 14, 4], '#4a7a2e', [Math.PI / 2, 0, 0]);
    d.put(PROPS.box, [W / 2, H - 9, -D + 1.5], [2, 12, 0.4], '#b03a2a');
    // Two soldiers asleep on the floor.
    for (let i = 0; i < 2; i++) d.put(PROPS.egg, [W / 2 - 6 + i * 14, 2.6, -D * 0.68], [4, 2.6, 3], '#1a100c');
  },
  workshop(d) {
    const { W, H, D, col } = d;
    // Stone workbench with a leaf being cut.
    d.put(PROPS.box, [W / 2, 8, -D * 0.72], [W * 0.5, 2.6, D * 0.4], '#b0a690');
    for (const dx of [-W * 0.2, W * 0.2]) d.put(PROPS.pebble, [W / 2 + dx, 3.4, -D * 0.72], [3.2, 4.4, 3], '#8a8070');
    d.put(PROPS.leaf, [W / 2 - 3, 9.8, -D * 0.72], [8, 4, 6], '#7cc048', [0, 0.4, 0]);
    // Twig bundle leaning on the wall.
    for (let i = 0; i < 3; i++) d.put(PROPS.box, [W - 6 - i * 4, 10, -D + 3], [1.2, 20, 1.2], '#8a6a3a', [0, 0, 0.12 + i * 0.08]);
    // Stone stack: one pebble per 3 stone in stock, up to ten.
    const stones = Math.min(10, Math.floor(col.grit / 3));
    for (let i = 0; i < stones; i++) d.put(PROPS.pebble, [8 + (i % 4) * 4.5, 2 + Math.floor(i / 4) * 3.2, -D * 0.8], [2.4, 2, 2.2], '#9a948c', [0, i, 0]);
    // Sawdust heap.
    d.put(PROPS.cone, [W * 0.35, 1.5, -D * 0.6], [4, 3, 3], '#c8a868');
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
