// Build 22: the underground. The soil round the nest used to be one speckled
// brown in three flat bands, and the ground beside the cutaway a darker,
// plainer brown. Now each band has its own character (dark loam full of
// rootlets; packed, layered earth with pebbles; mottled orange clay), and the
// ground holds things: roots from the yard above, stones, lost human junk,
// worm burrows (one with its worm), grubs curled in their pockets, snail
// shells, damp seeps in the clay, and beside the nest an old drain pipe from
// the house and a mole's tunnel.
//
// Nest frame: px, x right, y DOWN from the surface (world Y = -y), the soil's
// front face at Z = 0 (things sit half sunk in it, toward the camera).
import * as THREE from 'three';
import { canvasTexture, rng, noise2 } from '../ps1/textures.js';
import { CURIO_GEO } from './curios.js';
import { paint as leanPaint, bake as leanBake } from './kit.js';

const col = new THREE.Color();
// Build 66: the things in the ground are Lean, like the creatures: smooth from vertex to vertex, no speckle,
// welded when baked, and fewer, bigger pieces (Mark: "redraw the nest"). The soil faces stay textured.
const paint = (geo, fn) => leanPaint(geo, fn, { dropUV: true });

const UP = new THREE.Vector3(0, 1, 0);
function rod(a, b, r0, r1, color, sides = 5) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = Math.max(0.01, A.distanceTo(B));
  const g = paint(new THREE.CylinderGeometry(r1, r0, len, sides, 1, true).translate(0, len / 2, 0), color); // open: the ends are in the soil
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, B.clone().sub(A).normalize()));
  return g.translate(A.x, A.y, A.z);
}
// A flat ribbon on the soil face from a to b (2D, nest px), w wide.
function ribbon(ax, ay, bx, by, w, color, z = 0.3) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = (-dy / len) * w / 2, ny = (dx / len) * w / 2;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([ax - nx, -(ay - ny), z, bx - nx, -(by - ny), z, ax + nx, -(ay + ny), z, ax + nx, -(ay + ny), z, bx - nx, -(by - ny), z, bx + nx, -(by + ny), z], 3));
  g.computeVertexNormals();
  // Whichever way it ran, face the camera.
  if (g.attributes.normal.getZ(0) < 0) { const p = g.attributes.position; for (let i = 0; i < 6; i += 3) { const t = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)]; p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, ...t); } g.computeVertexNormals(); }
  return paint(g, color);
}
const disc = (x, y, rx, ry, color, z = 0.25, seg = 10) => paint(new THREE.CircleGeometry(1, seg).scale(rx, ry, 1).translate(x, -y, z), color);

// ---------- the soil faces ----------
// 64 px tiles, one texel per 1.5 world px (repeat 1/96). Each band has its
// own grain; all three tile seamlessly.
export function soilTexture(tier, dim = 1) {
  const sh = (h, k) => '#' + col.set(h).multiplyScalar(k * dim).getHexString();
  return canvasTexture(64, 64, (g) => {
    const r = rng(41 + tier * 7), n = noise2(17 + tier), size = 64, k = 6 / size;
    const ramps = [
      ['#3e2818', '#4e3220', '#5e3c26', '#6e4a2e', '#7a5434'], // loam
      ['#4a3828', '#56422e', '#625036', '#6e5a3e', '#7c6648'], // packed
      ['#6a321e', '#7a3e26', '#8a4a2e', '#9a5634', '#a8643c'], // clay
      ['#3a3430', '#46403a', '#524a42', '#5e564c', '#6a6256'], // deep rock (build 42)
      ['#22242a', '#2c2e34', '#36383e', '#404248', '#4c4e54'], // bedrock (build 42)
    ][tier];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, s = (xx, yy) => n(xx * k * (tier === 1 ? 0.6 : 1), yy * k * (tier === 1 ? 2.2 : 1));
      let t = (s(x, y) * (1 - u) * (1 - v) + s(x - size, y) * u * (1 - v) + s(x, y - size) * (1 - u) * v + s(x - size, y - size) * u * v) * 0.5 + 0.5 + (r() - 0.5) * 0.22;
      if (tier === 1) t += Math.sin((y / size) * Math.PI * 8) * 0.08; // faint layering
      g.fillStyle = sh(ramps[Math.max(0, Math.min(4, Math.floor(t * 5)))], 1); g.fillRect(x, y, 1, 1);
    }
    if (tier === 0) {
      // Rootlets, humus crumbs and pale grit.
      for (let i = 0; i < 14; i++) { let x = r() * size, y = r() * size; g.fillStyle = sh(r() < 0.5 ? '#8a6a42' : '#2e1e12', 1); for (let s = 0; s < 6; s++) { g.fillRect(Math.floor(x) % size, Math.floor(y) % size, 1, 1); x += (r() - 0.5) * 2; y += 1; } }
      for (let i = 0; i < 26; i++) { g.fillStyle = sh(r() < 0.6 ? '#2a1a10' : '#b8a888', 1); g.fillRect(Math.floor(r() * size), Math.floor(r() * size), 1 + (r() < 0.3), 1); }
    } else if (tier === 1) {
      // Pebbles, each with a lit edge.
      for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 60), y = Math.floor(r() * 60), w = 2 + Math.floor(r() * 3); g.fillStyle = sh(r() < 0.5 ? '#8a8476' : '#6e6a62', 1); g.fillRect(x, y, w, w - 1); g.fillStyle = sh('#b4ac9c', 1); g.fillRect(x, y, w - 1, 1); }
    } else if (tier >= 3) {
      // Build 42: cracked stone, and in the bedrock, block seams.
      for (let i = 0; i < 6; i++) { let x = r() * size, y = r() * size; g.fillStyle = sh(tier === 3 ? '#26201c' : '#14161a', 1); for (let s = 0; s < 10; s++) { g.fillRect(Math.floor(x) & 63, Math.floor(y) & 63, 1, 1); x += r() * 2 - 0.6; y += r() * 2 - 0.4; } }
      if (tier === 4) { g.fillStyle = sh('#121418', 1); for (let y = 0; y < size; y += 16) { g.fillRect(0, y, size, 1); for (let x = (y / 16) % 2 ? 0 : 16; x < size; x += 32) g.fillRect(x, y, 1, 16); } }
      for (let i = 0; i < 14; i++) { g.fillStyle = sh(r() < 0.5 ? '#8a8478' : '#6a7480', 1); g.fillRect(Math.floor(r() * size), Math.floor(r() * size), 1, 1); }
    } else {
      // Grey-blue mottles where the clay stays wet, rusty specks.
      for (let i = 0; i < 7; i++) { const x = r() * size, y = r() * size, rr = 2 + r() * 4; g.fillStyle = sh('#7a6a68', 1); for (let a = 0; a < 18; a++) { const q = r() * 6.28, d = r() * rr; g.fillRect(Math.floor(x + Math.cos(q) * d) % size, Math.floor(y + Math.sin(q) * d) % size, 1, 1); } }
      for (let i = 0; i < 20; i++) { g.fillStyle = sh(r() < 0.5 ? '#c07040' : '#5a2a18', 1); g.fillRect(Math.floor(r() * size), Math.floor(r() * size), 1, 1); }
    }
  }, { repeat: [1 / 96, 1 / 96] });
}

// ---------- the things in the ground ----------
const JUNK = ['cap', 'button', 'coin', 'marble', 'clip', 'bead'];
// Build the buried things over a box of ground (nest px; y down). bands: [top
// of packed, top of clay] in px. Returns a list of { geo, x0, y0, x1, y1 }
// (each with the box it covers) so a caller can drop the ones a tunnel has
// dug into.
export function buryThings({ x0, x1, y0, y1, bands, seed, extras = false }) {
  // Each kind of thing draws from its own random stream, so changing one kind doesn't move the others.
  let r = rng(seed);
  const out = [], tier = (y) => (y < bands[0] ? 0 : y < bands[1] ? 1 : 2);
  // Only what lies wholly inside the box: roots and burrows wander, and one from beside the nest must not stray into it.
  const add = (geo, bx0, by0, bx1, by1) => { if (bx0 >= x0 && bx1 <= x1 && by0 >= y0 - 1 && by1 <= y1) out.push({ geo, x0: bx0, y0: by0, x1: bx1, y1: by1 }); };
  const W = x1 - x0, H = y1 - y0;
  // Roots down from the surface: a tapering, wandering main root that forks.
  const root = (sx, sy, len, w, depth = 0) => {
    let x = sx, y = sy, a = Math.PI / 2 + (r() - 0.5) * 0.6, prev = [x, y];
    const steps = Math.ceil(len / 20);
    for (let s = 0; s < steps && y < bands[1] + 20; s++) {
      a += (r() - 0.5) * 0.5; a = Math.max(0.3, Math.min(Math.PI - 0.3, a));
      x += Math.cos(a) * 20; y += Math.sin(a) * 20;
      const k = 1 - s / steps, rr = Math.max(0.6, w * k);
      add(rod([prev[0], -prev[1], 0], [x, -y, 0], rr * 1.15, rr, (px, py, pz) => (pz > rr * 0.5 ? '#6a4e30' : '#4a3420'), 3), Math.min(prev[0], x) - rr, Math.min(prev[1], y) - rr, Math.max(prev[0], x) + rr, Math.max(prev[1], y) + rr);
      if (depth < 2 && r() < 0.2) root(x, y, len * (1 - s / steps) * 0.6, rr * 0.7, depth + 1);
      prev = [x, y];
    }
  };
  for (let i = 0, n = Math.round(W / 70); i < n; i++) root(x0 + r() * W, 0, 120 + r() * 220, 2.8 + r() * 2.4);
  r = rng(seed * 31 + 1);
  // Stones, half sunk; most in the packed band, and a seam of gravel along each band boundary.
  const stone = (x, y, rr) => {
    const t = tier(y), g = (rr < 3.5 ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 0)).scale(rr, rr * (0.6 + r() * 0.3), rr * 0.6).rotateZ(r() * 3).translate(x, -y, 0);
    const c = [['#6e685c', '#857e70', '#5a5650'], ['#8a8476', '#a49c8c', '#6a666e'], ['#8a6a58', '#7a6a62', '#9a7a62']][t][Math.floor(r() * 3)];
    add(paint(g, (px, py) => (py > -y + rr * 0.3 ? '#b8b0a0' : c)), x - rr, y - rr, x + rr, y + rr);
  };
  const area = W * H;
  for (let i = 0, n = Math.round(area / 3000); i < n; i++) { const y = y0 + r() * H, t = tier(y); if (r() > [0.45, 1, 0.25][t]) continue; stone(x0 + r() * W, y, 3 + r() * r() * 10); }
  for (const by of bands) for (let x = x0; x < x1; x += 22 + r() * 26) stone(x, by + (r() - 0.5) * 10, 2.4 + r() * 2.8);
  r = rng(seed * 31 + 2);
  // Worm burrows: dark wandering tunnels, some with their worm.
  for (let i = 0, n = Math.max(1, Math.round(area / 90000)); i < n; i++) {
    let x = x0 + r() * W, y = Math.max(y0 + 20, Math.min(y1 - 20, bands[0] * (0.3 + r() * 1.2))), a = r() * 6.28; const pts = [[x, y]];
    for (let s = 0; s < 14; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 6; pts.push([x, y]); }
    const bx = pts.map((p) => p[0]), by = pts.map((p) => p[1]);
    for (let s = 0; s < pts.length - 1; s++) add(ribbon(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], 4.5, '#24160c'), Math.min(...bx) - 4, Math.min(...by) - 4, Math.max(...bx) + 4, Math.max(...by) + 4);
    if (r() < 0.6) for (let s = 3; s < 10; s++) add(rod([pts[s][0], -pts[s][1], 0.4], [pts[s + 1][0], -pts[s + 1][1], 0.4], 1.9, 1.9, s % 2 ? '#c87a78' : '#b86a6a', 5), Math.min(...bx) - 4, Math.min(...by) - 4, Math.max(...bx) + 4, Math.max(...by) + 4);
  }
  r = rng(seed * 31 + 3);
  // Grubs curled in their pockets, and snail shells, in the loam.
  for (let i = 0, n = Math.max(1, Math.round(area / 140000)); i < n; i++) {
    const x = x0 + 20 + r() * (W - 40), y = 20 + r() * (bands[0] - 30);
    add(disc(x, y, 9, 7, '#24160c'), x - 9, y - 7, x + 9, y + 7);
    add(paint(new THREE.TorusGeometry(4, 2.2, 4, 8, Math.PI * 1.5).rotateZ(r() * 6).translate(x, -y, 0.8), (px, py) => (Math.hypot(px - x, py + y) > 5.5 ? '#f0e8d0' : '#e0d4b4')), x - 9, y - 7, x + 9, y + 7);
  }
  for (let i = 0, n = Math.max(1, Math.round(area / 160000)); i < n; i++) {
    const x = x0 + r() * W, y = 15 + r() * (bands[1] - 30);
    for (let k = 0; k < 3; k++) add(paint(new THREE.TorusGeometry(4.5 - k * 1.4, 1.6 - k * 0.3, 3, 8).translate(x + k * 1.2, -y + k * 0.8, 0.5 + k * 0.4), k % 2 ? '#c8a878' : '#e0c898'), x - 7, y - 7, x + 7, y + 7);
  }
  r = rng(seed * 31 + 4);
  // Damp seeps in the clay: a darker stain with a bead of water.
  for (let i = 0, n = Math.max(1, Math.round(area / 180000)); i < n; i++) {
    const x = x0 + r() * W, y = bands[1] + 20 + r() * Math.max(10, y1 - bands[1] - 40);
    add(disc(x, y, 16 + r() * 10, 9 + r() * 5, '#5a3a32', 0.2, 12), x - 26, y - 14, x + 26, y + 14);
    add(paint(new THREE.SphereGeometry(2, 5, 3).translate(x, -y - 6, 1), '#9ac8e0'), x - 26, y - 14, x + 26, y + 14);
  }
  r = rng(seed * 31 + 5);
  // Lost human things, rarely: a bottle cap, a button, a coin, a marble...
  for (let i = 0, n = Math.max(1, Math.round(area / 120000)); i < n; i++) {
    const x = x0 + r() * W, y = 30 + r() * (y1 - 60), k = JUNK[Math.floor(r() * JUNK.length)], sc = k === 'clip' ? 7 : 5;
    add(CURIO_GEO[k].clone().rotateX(Math.PI / 2 - 0.25).rotateZ((r() - 0.5) * 1.2).scale(sc, sc, sc).translate(x, -y, -1), x - sc * 1.2, y - sc * 1.2, x + sc * 1.2, y + sc * 1.2);
  }
  if (extras) {
    // An old clay drain pipe from the house, running through the packed band.
    const py = bands[0] + (bands[1] - bands[0]) * 0.45, R = 16;
    for (let x = x0; x < x1; x += 120) {
      add(paint(new THREE.CylinderGeometry(R, R, 118, 8, 1, true).rotateZ(Math.PI / 2).translate(x + 59, -py, -R * 0.3), (px, py2) => (py2 > -py + R * 0.5 ? '#c07850' : '#a05a38')), x, py - R, x + 120, py + R);
      add(paint(new THREE.CylinderGeometry(R * 1.12, R * 1.12, 8, 8, 1, true).rotateZ(Math.PI / 2).translate(x + 2, -py, -R * 0.3), '#8a4a30'), x, py - R, x + 120, py + R);
    }
  }
  return out;
}
// A mole's tunnel: a big round bore, its rim crumbling, loose clods in it.
export function moleTunnel(x, y, R, seed) {
  const r = rng(seed), parts = [disc(x, y, R, R * 0.9, '#1e140c', 0.3, 12), paint(new THREE.RingGeometry(R * 0.9, R * 1.12, 12).translate(x, -y, 0.35), '#5a4028')];
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + r() * 0.7), d = R * (0.4 + r() * 0.5); parts.push(paint(new THREE.IcosahedronGeometry(2 + r() * 3, 0).translate(x + Math.cos(a) * d * (r() < 0.5 ? -1 : 1), -y - Math.sin(a) * d * 0.9, 0.8), r() < 0.5 ? '#6a4a2e' : '#4e3620')); }
  return parts;
}

// Welded (Lean), so each stone and root shades smoothly. null for nothing.
export function bake(parts) {
  return parts.length ? leanBake(parts) : null;
}
