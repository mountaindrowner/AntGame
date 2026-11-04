// Model pass, layer 3: the nest up close. The brood (eggs, larvae, cocoons),
// the honeypot repletes that hang in the store, and the furniture of each
// room, all in true vertex colours (draw them with a white instance colour).
// A few are greyscale so one model can be tinted per room (the cradle).
//
// Each model's origin and size are noted; room dressing scales them.
import * as THREE from 'three';
import { V, paint, blob, strut, bake, hash } from './kit.js';
import { antGeometry, outfitGeometry, FOOT } from './creatures.js';
import { COLORS } from '../../config.js';


// An ant egg: a glossy oval, a little pointed at one end, pale with a
// highlight on top and the yolk showing through. Centred, about 2.4 × 1.7.
function egg() {
  const g = new THREE.SphereGeometry(1, 10, 7);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setX(i, x * (x > 0 ? 1.32 : 1.15)); p.setY(i, p.getY(i) * 0.84); p.setZ(i, p.getZ(i) * 0.84); }
  return bake([paint(g, (x, y, z) => {
    if (y > 0.5 && x < 0.1 && x > -0.75 && z > -0.1) return '#fffef6';
    if (z > 0.55 && Math.abs(x) < 0.5 && Math.abs(y) < 0.32) return '#ecdcae';
    if (y < -0.45) return '#d4c6a2';
    return x > 0.8 ? '#e8dec2' : '#f4ecd6';
  })]);
}

// A larva: a fat, curled grub in seven segments, thinning to an amber head
// with dark mandibles; the gut shows through its pale skin. Centred in the
// XY plane, curled about the origin, about 2.6 across.
function larva() {
  const parts = [], n = 7;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), a = Math.PI * (1.45 - k * 1.25), R = 0.78;
    const r = 0.6 - k * 0.26, cx = Math.cos(a) * R, cy = Math.sin(a) * R;
    parts.push(blob([cx, cy, 0], [r, r, r * 0.92], [8, 5], (x, y, z) => {
      const out = (x - cx) * Math.cos(a) + (y - cy) * Math.sin(a);
      if (z > r * 0.55 && Math.abs(out) < r * 0.4 && i > 0 && i < n - 1) return '#c4a674';
      if (out < -r * 0.6) return '#e2d6ba';
      return i % 2 ? '#f8f2e0' : '#efe6cc';
    }));
  }
  // Head at the thin end, mouthparts pointing in toward the belly.
  const a = Math.PI * 0.2, hx = Math.cos(a) * 0.86, hy = Math.sin(a) * 0.86;
  parts.push(blob([hx, hy, 0], [0.3, 0.3, 0.3], [6, 4], '#d8a868'));
  for (const s of [-1, 1]) parts.push(blob([hx - 0.12, hy - 0.2, s * 0.1], [0.08, 0.1, 0.07], [4, 3], '#4a2a12'));
  return bake(parts);
}

// A cocoon: a silk-spun oval, fibrous, with the dark spot where the pupa
// shed its waste at the bottom. Centred, 2 tall, 1.1 across.
function cocoon() {
  const g = new THREE.SphereGeometry(1, 9, 7).scale(0.55, 1, 0.55);
  return bake([paint(g, (x, y, z, f) => {
    if (y < -0.82) return '#4a3420';
    if (y > 0.55 && x < 0 && z > 0) return '#f4e6c4';
    const h = hash(f * 3.7 + Math.floor(y * 6));
    return h < 0.33 ? '#e2cc9c' : h < 0.66 ? '#d4ba86' : '#eadab2';
  })]);
}

// A cradle: a shallow woven bowl with bedding inside. Greyscale, so it takes
// the room's colour (straw in the hatchery, silk in the nursery). Origin at
// its foot, radius 1, 0.5 tall.
function cradle() {
  const weave = (x, y, z) => ((Math.floor((Math.atan2(z, x) + 4) * 3.2) + Math.floor(y * 9)) % 2 ? '#ffffff' : '#c4c4c4');
  const parts = [];
  parts.push(paint(new THREE.SphereGeometry(1, 14, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.5, 1).translate(0, 0.5, 0), weave));
  parts.push(paint(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 14).translate(0, 0.38, 0), (x, y, z, f) => (hash(f) < 0.5 ? '#d8d8d8' : '#ececec')));
  parts.push(paint(new THREE.TorusGeometry(1, 0.11, 4, 16).rotateX(Math.PI / 2).translate(0, 0.5, 0), (x, y, z) => (Math.floor((Math.atan2(z, x) + 4) * 5) % 2 ? '#e8e8e8' : '#a8a8a8')));
  return bake(parts);
}

// A honeypot replete: a worker hanging from the ceiling, her gaster swollen
// into an amber globe of stored sugar, the dark back plates islands on the
// stretched skin. Origin at the ceiling, hanging down about 2.6.
function replete() {
  const parts = [], gy = -1.6;
  parts.push(blob([0, gy, 0], [1, 1, 1], [12, 8], (x, y, z) => {
    const u = y - gy, band = Math.abs(((Math.atan2(u, x) / Math.PI) * 3.5 + 10) % 1 - 0.5) < 0.09;
    if (u > 0.45 && x < 0 && z > 0.2) return '#fff0b0';
    if (band && z > -0.2) return '#6a3c1a';
    return u < -0.55 ? '#b86a18' : z > 0.5 ? '#f4b444' : '#e09a2c';
  }));
  // Thorax and head tucked against the roof, legs gripping it.
  parts.push(blob([0, -0.42, 0], [0.32, 0.26, 0.26], [6, 4], '#4a2a18'));
  parts.push(blob([0.18, -0.2, 0], [0.24, 0.2, 0.22], [6, 4], '#3a2012'));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const hip = V(-0.15 + i * 0.15, -0.45, s * 0.2), knee = V(-0.4 + i * 0.4, -0.2, s * 0.55), foot = V(-0.45 + i * 0.45, 0, s * 0.7);
    parts.push(strut(hip, knee, 0.05, 0.05, '#3a2012', 3), strut(knee, foot, 0.04, 0.03, '#3a2012', 3));
  }
  return bake(parts);
}

// A heap of stored seeds: sixteen grains in a mound, a few husks. Origin at
// its foot, radius 1, 1 tall.
function seedHeap() {
  const parts = [], C = ['#e8c45a', '#d4a840', '#f2d47a', '#c89a38'];
  for (let i = 0; i < 16; i++) {
    const layer = i < 8 ? 0 : i < 13 ? 1 : i < 15 ? 2 : 3, ring = [8, 5, 2, 1][layer], j = [0, 8, 13, 15][layer], a = ((i - j) / ring) * Math.PI * 2 + layer;
    const rr = [0.7, 0.45, 0.2, 0][layer], y = 0.14 + layer * 0.24;
    parts.push(paint(new THREE.SphereGeometry(1, 7, 4).scale(0.27, 0.17, 0.18).rotateY(a * 1.7).translate(Math.cos(a) * rr, y, Math.sin(a) * rr), (x, yy) => (yy > y + 0.08 ? '#fae6a0' : C[i % 4])));
  }
  return bake(parts);
}

// Water: a pool block, pale at the surface and deep blue at the bottom.
// Unit box, origin at its centre.
function pool() {
  return bake([paint(new THREE.BoxGeometry(1, 1, 1, 1, 4, 1), (x, y) => (y > 0.49 ? '#8ccaf0' : y > 0.2 ? '#4a9ad6' : y > -0.2 ? '#3a86c4' : '#2c6aa8'))]);
}

// A water drop: a teardrop, clear blue with a white glint. Centred, unit.
function drop() {
  const g = new THREE.SphereGeometry(1, 7, 5); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0) { const k = 1 - y * 0.75; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, y * 1.5); } }
  return bake([paint(g, (x, y, z) => (y > 0.1 && x < 0 && z > 0.2 ? '#ffffff' : y < -0.5 ? '#5a9ad0' : '#9ad0f0'))]);
}

// A shed queen's wing, pinned to the wall: a pale membrane with brown veins
// and the dark stigma spot. In the XY plane facing +Z, centred, 2 long.
function wing() {
  const s = new THREE.Shape();
  s.moveTo(-1, 0); s.bezierCurveTo(-0.7, 0.32, 0.4, 0.48, 1, 0.12); s.bezierCurveTo(1.05, -0.05, 0.6, -0.3, -0.2, -0.22); s.lineTo(-1, -0.05);
  const parts = [paint(new THREE.ShapeGeometry(s, 6), (x, y) => (x < -0.6 ? '#d8d0bc' : '#ece6d6'))];
  const vein = (a, b, r) => strut(V(a[0], a[1], 0.02), V(b[0], b[1], 0.02), r, r * 0.7, '#8a6a40', 3);
  parts.push(vein([-1, 0], [0.2, 0.3], 0.035), vein([-1, -0.02], [0.75, 0.05], 0.03), vein([-0.9, -0.04], [0.1, -0.18], 0.025));
  parts.push(vein([-0.3, 0.2], [-0.1, -0.1], 0.02), vein([0.05, 0.25], [0.3, 0.02], 0.02), vein([-0.55, 0.12], [-0.35, -0.12], 0.02));
  parts.push(paint(new THREE.CircleGeometry(0.09, 6).scale(1.6, 1, 1).translate(0.25, 0.3, 0.03), '#5a3a1e'));
  return bake(parts);
}

// A moss cushion for the queen: a lumpy dome of moss with tiny flowers.
// Origin at its foot, radius 1, 1 tall.
function moss() {
  const g = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > 0.02) { const k = 1 + (hash(Math.round(x * 9) * 7 + Math.round(z * 9) * 13 + Math.round(y * 5)) - 0.5) * 0.22; p.setXYZ(i, x * k, y * k, z * k); } }
  return bake([paint(g, (x, y, z, f) => { const h = hash(f * 1.3); return h > 0.94 ? '#f0e8a0' : h > 0.9 ? '#e8a8c0' : h < 0.35 ? '#3e5a28' : h < 0.7 ? '#4e6e30' : '#62843a'; })]);
}

// A weapon rack: two twig posts, a crossbar, four thorn spears leaning on it.
// Origin at its foot, 2 wide, about 1.7 tall, against the wall.
function spearRack() {
  const parts = [], bark = (x, y) => (Math.floor(y * 8) % 3 ? '#6a4a30' : '#54381f');
  for (const x of [-0.95, 0.95]) parts.push(paint(new THREE.CylinderGeometry(0.06, 0.08, 1.3, 5).translate(x, 0.65, 0), bark));
  parts.push(paint(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 5).rotateZ(Math.PI / 2).translate(0, 1.15, 0.05), bark));
  for (const x of [-0.95, 0.95]) parts.push(paint(new THREE.TorusGeometry(0.09, 0.03, 3, 6).translate(x, 1.15, 0.05), '#a8c060'));
  for (let i = 0; i < 4; i++) {
    const x = -0.65 + i * 0.43, foot = V(x - 0.1, 0, 0.3), tip = V(x + 0.12, 1.75, -0.02);
    parts.push(strut(foot, tip.clone().lerp(foot, 0.25), 0.045, 0.04, '#b8a070', 4));
    parts.push(strut(tip.clone().lerp(foot, 0.25), tip, 0.09, 0.005, '#e8dcc0', 4));
    parts.push(paint(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 5).translate(x + 0.06, 1.3, 0.05), '#b03a2a'));
  }
  return bake(parts);
}

// The training dummy: an old ground beetle's husk, stuffed with straw where
// its back has cracked. Origin at its foot, 2 long along X, 1 tall.
function husk() {
  const parts = [];
  parts.push(paint(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.95, 0.85, 0.72).translate(-0.15, 0.08, 0), (x, y, z) => {
    if (Math.abs(z) < 0.05) return '#0a1612';
    if (x > -0.4 && x < 0.05 && z > 0.18 && z < 0.5 && y > 0.4) return '#c8a858';
    if (y > 0.7 && z > -0.1 && x < -0.2) return '#4a7a6a';
    return Math.floor((z + 1) * 7) % 2 ? '#1e3a34' : '#18302a';
  }));
  parts.push(blob([0.9, 0.38, 0], [0.32, 0.3, 0.5], [8, 5], (x, y) => (y > 0.55 ? '#2e5248' : '#1a302a')));
  parts.push(blob([1.25, 0.32, 0], [0.22, 0.2, 0.3], [6, 4], '#14241f'));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) parts.push(strut(V(0.5 - i * 0.5, 0.15, s * 0.6), V(0.6 - i * 0.6, 0, s * 0.95), 0.06, 0.04, '#14241f', 3));
  for (let i = 0; i < 4; i++) parts.push(strut(V(-0.2 + i * 0.06, 0.62, 0.32), V(-0.3 + i * 0.12, 0.92, 0.42 + i * 0.05), 0.02, 0.01, '#e0c070', 3));
  return bake(parts);
}

// A soldier asleep: her body in its colour, helmet tipped over her eyes.
// Origin at her feet, ant units (scale like an ant).
function sleeper() {
  const body = antGeometry('soldier', -1).clone(), c = new THREE.Color(COLORS.soldier), a = body.attributes.color;
  for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * c.r, a.getY(i) * c.g, a.getZ(i) * c.b);
  const hat = outfitGeometry('soldier').clone().translate(-3.9, -0.5, 0).rotateZ(-0.35).translate(3.9, 0.1, 0);
  const g = bake([body, hat]);
  return g.translate(0, FOOT - 0.5, 0);
}

// A war banner: a leaf hung from a twig, a red stripe and a pale mandible
// mark. Origin at the twig, the leaf hanging 2 down, 1.2 wide.
function banner() {
  const parts = [];
  parts.push(paint(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 5).rotateZ(Math.PI / 2), '#6a4a30'));
  const s = new THREE.Shape(); s.moveTo(-0.6, 0); s.lineTo(0.6, 0); s.lineTo(0.55, -1.6); s.quadraticCurveTo(0, -2.15, -0.55, -1.6); s.lineTo(-0.6, 0);
  parts.push(paint(new THREE.ShapeGeometry(s, 4).translate(0, -0.04, 0.02), (x, y) => (Math.abs(x) < 0.04 ? '#3a6a24' : Math.abs(x) < 0.18 ? '#b03a2a' : y < -1.2 ? '#3e6e26' : '#4a7a2e')));
  for (const sg of [-1, 1]) parts.push(strut(V(sg * 0.32, -0.6, 0.04), V(sg * 0.08, -1.05, 0.04), 0.07, 0.04, '#f0e2c0', 3));
  return bake(parts);
}

// The workbench: a stone slab on two stone legs, a leaf on it with a bite cut
// out, a thorn chisel. Origin at its foot, 2 wide, 1 tall, 0.8 deep.
function bench() {
  const parts = [], stone = (x, y, z, f) => (hash(f * 2.1) < 0.3 ? '#9a9080' : hash(f * 2.1) < 0.6 ? '#b0a690' : '#c0b6a0');
  parts.push(paint(new THREE.BoxGeometry(2, 0.22, 0.8, 4, 1, 2).translate(0, 0.78, 0), stone));
  for (const x of [-0.7, 0.7]) parts.push(paint(new THREE.DodecahedronGeometry(0.3, 0).scale(0.9, 1.25, 0.9).translate(x, 0.35, 0), stone));
  const s = new THREE.Shape(); s.moveTo(-0.55, 0); s.quadraticCurveTo(-0.1, 0.32, 0.5, 0.05); s.lineTo(0.35, -0.06); s.quadraticCurveTo(0.25, 0.08, 0.15, -0.08); s.quadraticCurveTo(-0.1, -0.3, -0.55, 0);
  parts.push(paint(new THREE.ShapeGeometry(s, 5).rotateX(-Math.PI / 2).translate(-0.2, 0.9, 0.05), (x, y, z) => (Math.abs(z - 0.05) < 0.03 ? '#5a9a30' : '#7cc048')));
  parts.push(strut(V(0.45, 0.92, -0.15), V(0.85, 0.92, 0.05), 0.04, 0.005, '#e8dcc0', 4));
  parts.push(strut(V(0.3, 0.92, -0.22), V(0.47, 0.92, -0.14), 0.05, 0.05, '#8a6a3a', 4));
  parts.push(paint(new THREE.DodecahedronGeometry(0.12, 0).translate(-0.75, 0.97, -0.2), '#8a8478'));
  return bake(parts);
}

// A bundle of twigs leaning on the wall, tied with grass. Origin at its foot, 2 tall.
function twigs() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.12, a = V(x * 1.4, 0, 0.08 * (i % 2)), b = V(x + 0.35, 2 - i * 0.1, -0.1);
    parts.push(strut(a, b, 0.065, 0.045, (px, py) => (Math.floor(py * 7 + i) % 4 ? '#8a6a3a' : '#6a4e28'), 5));
  }
  parts.push(paint(new THREE.TorusGeometry(0.22, 0.04, 3, 8).rotateX(Math.PI / 2).translate(0.15, 0.9, 0), '#a8c060'));
  return bake(parts);
}

// A chitin shield for the armory wall: a beetle's wing case, glossy black-green,
// a strap across. Centred, facing +Z, 1 tall.
function shieldPlate() {
  const g = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(0.42, 0.62, 0.22);
  return bake([paint(g, (x, y) => (Math.abs(x) < 0.03 ? '#0a1612' : y > 0.25 && x < 0 ? '#5a8a7a' : Math.floor((x + 1) * 9) % 2 ? '#1e3a34' : '#16302a')),
    paint(new THREE.BoxGeometry(0.9, 0.1, 0.05).translate(0, -0.1, 0.22), '#8a5a2a')]);
}

// Mirror a model left to right, keeping its faces facing out.
function flipX(src) {
  const g = src.clone().scale(-1, 1, 1);
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name], n = a.itemSize;
    for (let i = 0; i < a.count; i += 3) for (let k = 0; k < n; k++) { const t = a.array[(i + 1) * n + k]; a.array[(i + 1) * n + k] = a.array[(i + 2) * n + k]; a.array[(i + 2) * n + k] = t; }
  }
  g.computeVertexNormals();
  return g;
}
const WING = wing();

export const NEST = {
  egg: egg(), larva: larva(), cocoon: cocoon(), cradle: cradle(), replete: replete(), seedHeap: seedHeap(),
  pool: pool(), drop: drop(), wing: WING, wingL: flipX(WING), moss: moss(), spearRack: spearRack(), husk: husk(), sleeper: sleeper(),
  banner: banner(), bench: bench(), twigs: twigs(), shield: shieldPlate(),
};
