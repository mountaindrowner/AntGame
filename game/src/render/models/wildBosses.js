// Build 59: the wild bosses' own models (Mark: "vastly improve the visual look").
//   raven(): Nevermore, a big shaggy raven: a heavy arched bill, throat hackles, a wedge tail, fingered
//     primaries with a ragged gap, a blue-purple sheen on black. One eye milky and scarred, one glinting green.
//   zombieAntGeometry(frame): an ant the fungus has taken: hunched, head drooping, jaws agape, mottled grey
//     with white mycelium in its joints, a swollen gaster with glowing pustules, a broken leg, and the
//     Ophiocordyceps stalk growing out of the back of its head.
//   cordycepsHeart(): the dead nest: a cracked grey mound webbed with mycelium, husks round it, a crown of
//     twisted fruiting stalks with swollen pored heads, glowing pustules and a spore haze.
//   mole(): Old Blind, huge: velvet-dark fur with mangy patches and green-glowing veins, a pink star nose of
//     tentacles, pale spade claws, one milky eye and one green.
//   cavedPitGeometry(R) + pitGlow(R): the fire ants' great mound fallen in, a real pit (the scenery cuts the
//     ground open under the mound), the old galleries open in its walls, the seam glowing at the bottom.
//   sinkholeGeometry(R): the slumped, split ground on the pit's lip where the fight is.
// Local frame: +X forward, +Y up, +Z left.
import * as THREE from 'three';
import { paint, blob, strut, bake, hash } from './bugs.js';
import { psx, psxBasic } from '../ps1/materials.js';
import { FOOT, WALK_FRAMES } from './creatures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- Nevermore, the raven ----------
const RV = { body: '#18181f', body2: '#1e1f29', sheen: '#2b3352', sheen2: '#352a4c', belly: '#121216', bill: '#22222a', bill2: '#33333d', leg: '#151515', claw: '#0b0b0b', edge: '#2a3048' };
export function raven() {
  const mat = psx({ vertexColors: true });
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.7; g.add(body);
  // A heavy body, deep in the chest, sheened on the back.
  const bg = new THREE.SphereGeometry(1, 16, 11).scale(1.08, 0.6, 0.55);
  { const p = bg.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), t = x < 0 ? 1 + x * 0.3 : 1 + x * 0.06; p.setY(k, p.getY(k) * t); p.setZ(k, p.getZ(k) * t); } }
  body.add(new THREE.Mesh(paint(bg, (x, y, z, f) => (y < -0.3 ? RV.belly : y > 0.3 ? (hash(f) < 0.35 ? RV.sheen : hash(f + 7) < 0.3 ? RV.sheen2 : RV.body2) : hash(f) < 0.15 ? RV.sheen2 : RV.body)), mat));
  // Shaggy throat hackles under the head.
  for (let k = 0; k < 9; k++) { const z = (k - 4) * 0.07, len = 0.26 + hash(k) * 0.14; body.add(new THREE.Mesh(paint(new THREE.ConeGeometry(0.05, len, 4).rotateZ(Math.PI * 0.82).translate(0.78 + hash(k + 3) * 0.06, 0.02 - len * 0.3, z), k % 2 ? RV.body : RV.body2), mat)); }
  // A wedge tail: the middle feathers longest.
  const tail = new THREE.Group(); tail.position.set(-0.95, 0.12, 0); tail.rotation.z = 0.2; body.add(tail);
  for (let k = -3; k <= 3; k++) { const len = 0.95 - Math.abs(k) * 0.09; tail.add(new THREE.Mesh(paint(new THREE.BoxGeometry(len, 0.05, 0.11).translate(-len / 2, 0, 0).rotateY(k * 0.09), (x) => (x < -len * 0.8 ? RV.edge : k % 2 ? RV.body : RV.body2)), mat)); }
  // The head: flat-crowned, sheened; a massive arched bill with bristles over its base.
  const head = new THREE.Group(); head.position.set(0.86, 0.4, 0); body.add(head);
  head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.4, 12, 9).scale(1.12, 0.92, 0.95), (x, y, z, f) => (y > 0.18 ? (hash(f) < 0.4 ? RV.sheen : RV.body2) : RV.body)), mat));
  const bill = new THREE.ConeGeometry(0.15, 0.7, 7).rotateZ(-Math.PI / 2).scale(1, 1.45, 0.95);
  { const p = bill.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setY(k, p.getY(k) - Math.max(0, x) ** 2 * 0.35); } }
  head.add(new THREE.Mesh(paint(bill.translate(0.68, -0.06, 0), (x, y) => (y > -0.03 ? RV.bill2 : RV.bill)), mat));
  head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.13, 6, 4).scale(1.4, 0.8, 1.1).translate(0.4, 0.06, 0), RV.body2), mat));
  // Left eye: milky, scarred through. Right eye: black with a green glint (the glow).
  head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.075, 8, 6).translate(0.24, 0.1, 0.33), '#c4c0ae'), mat));
  head.add(new THREE.Mesh(paint(new THREE.BoxGeometry(0.03, 0.3, 0.03).rotateX(0.3).translate(0.24, 0.1, 0.36), '#7a7064'), mat));
  head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.07, 8, 6).translate(0.25, 0.1, -0.33), '#050505'), mat));
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4).translate(0.29, 0.13, -0.37), psxBasic({ color: '#7dff6a' })); head.add(glint);
  // Wings: coverts, then long fingered primaries splayed at the tip; the right wing has a gap where two are torn out.
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(0.1, 0.22, s * 0.42);
    pivot.add(new THREE.Mesh(paint(new THREE.SphereGeometry(1, 10, 4).scale(0.78, 0.08, 0.36).translate(-0.28, -0.02, s * 0.22), (x, y, z, f) => (hash(f) < 0.3 ? RV.sheen : RV.body2)), mat));
    for (let k = 0; k < 6; k++) { if (s > 0 && (k === 2 || k === 3)) continue; const len = 0.6 + k * 0.05, a = -0.12 + k * 0.08;
      pivot.add(new THREE.Mesh(paint(new THREE.BoxGeometry(len, 0.03, 0.09).translate(-len / 2, 0, 0).rotateY(s * a).translate(-0.62, -0.03, s * (0.3 + k * 0.035)), (x) => (x < -1.1 ? RV.edge : RV.body)), mat)); }
    body.add(pivot); return { pivot, s };
  });
  // Thick dark legs, long talons.
  for (const s of [-1, 1]) {
    g.add(new THREE.Mesh(paint(new THREE.CylinderGeometry(0.045, 0.055, 0.5, 5).translate(0.05, 0.25, s * 0.17), RV.leg), mat));
    for (const a of [-0.55, 0, 0.55, Math.PI]) g.add(new THREE.Mesh(paint(new THREE.BoxGeometry(0.3, 0.03, 0.045).translate(0.15, 0.015, 0).rotateY(a).translate(0.05, 0, s * 0.17), RV.claw), mat));
  }
  return { group: g, body, head, wings, glint };
}

// ---------- the zombie ant ----------
const ZC = { shell: '#3e3a30', shell2: '#4c4639', myc: '#d8d4be', myc2: '#bfbba2', sick: '#6c7a4a', glow: '#b6ff5a', stalk: '#8a5a2a', stalk2: '#b07a3a', head: '#d89a48', pore: '#5a3418', tip: '#ecc890', eye: '#b4b29c' };
function zShell(c, r, seg, f0) { return blob(c, r, seg, (x, y, z, f) => (hash(f + f0) < 0.28 ? (hash(f + f0 + 9) < 0.5 ? ZC.myc : ZC.myc2) : y < c[1] - r[1] * 0.35 ? ZC.sick : hash(f + f0 + 4) < 0.5 ? ZC.shell : ZC.shell2)); }
function buildZombie(frame) {
  const parts = [];
  // Swollen, sagging gaster with pustules.
  parts.push(zShell([-3.4, 0.6, 0], [2.8, 2.15, 2.2], [10, 7], 1));
  for (let k = 0; k < 6; k++) { const a = k * 1.1, x = -3.4 + Math.cos(a) * 1.6, z = Math.sin(a) * 1.7; parts.push(blob([x, 1.9 + Math.sin(k) * 0.4, z], [0.38, 0.38, 0.38], [5, 4], ZC.glow)); }
  parts.push(blob([-0.9, 0.0, 0], [0.55, 0.62, 0.55], [5, 4], ZC.shell));
  parts.push(zShell([0.6, 0.2, 0], [1.6, 1.0, 1.0], [8, 5], 3));
  // The head hangs low, tilted, mandibles agape, milky eyes.
  parts.push(zShell([2.9, -0.5, 0.25], [1.4, 1.22, 1.25], [9, 6], 5));
  for (const sd of [-1, 1]) {
    parts.push(blob([3.2, -0.2, 0.25 + sd * 1.05], [0.38, 0.36, 0.22], [5, 3], ZC.eye));
    const a = V(4.0, -1.0, 0.25 + sd * 0.55), b = V(4.9, -1.5, 0.25 + sd * 1.1), c = V(5.3, -1.9, 0.25 + sd * 0.9);
    parts.push(strut(a, b, 0.24, 0.18, ZC.shell, 3), strut(b, c, 0.18, 0.08, '#1e1a14', 3));
  }
  // The stalk: out of the back of the head, curving up and forward, a swollen pored fruiting body near the top.
  const s0 = V(2.2, 0.4, 0.2), s1 = V(1.9, 4.2, 0.5), s2 = V(2.8, 7.6, -0.2), s3 = V(3.9, 10.2, -0.1);
  parts.push(strut(s0, s1, 0.34, 0.27, ZC.stalk, 5), strut(s1, s2, 0.27, 0.2, ZC.stalk2, 5), strut(s2, s3, 0.2, 0.08, ZC.stalk2, 4));
  parts.push(blob([3.2, 8.6, -0.15], [0.62, 1.15, 0.62], [7, 6], (x, y, z, f) => (hash(f) < 0.3 ? ZC.pore : ZC.head)));
  parts.push(blob([3.95, 10.3, -0.1], [0.24, 0.32, 0.24], [5, 4], ZC.tip));
  // White tufts bursting from the joints.
  for (const [x, y, z] of [[-0.9, 0.7, 0.5], [0.0, 1.0, -0.6], [-1.6, 2.4, 0.2], [1.4, -0.2, 0.9]]) parts.push(blob([x, y, z], [0.45, 0.5, 0.45], [5, 4], ZC.myc));
  // Legs: splayed, high-kneed, jerky; the front left broken at the knee.
  const phase = (frame / WALK_FRAMES) * Math.PI * 2, hips = [1.4, 0.6, -0.2], reach = [2.8, 0.3, -3.0], spread = [3.1, 3.5, 3.2];
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const grp = (i + (side > 0 ? 1 : 0)) % 2, ph = phase + (grp ? Math.PI : 0) + i * 0.7, sw = frame < 0 ? 0 : Math.sin(ph) * 0.6, lift = frame < 0 ? 0 : Math.max(0, Math.cos(ph * 1.3)) * 0.9;
    const hip = V(hips[i], -0.4, side * 0.6), knee = V(hip.x + (reach[i] + sw * 2.4) * 0.4, hip.y + 2.2, side * (0.6 + spread[i] * 0.6)), foot = V(hip.x + reach[i] + sw * 2.4, -FOOT + lift, side * (0.6 + spread[i]));
    parts.push(strut(hip, knee, 0.3, 0.26, ZC.shell, 3));
    if (i === 0 && side > 0) { parts.push(blob([knee.x, knee.y, knee.z], [0.4, 0.4, 0.4], [4, 3], ZC.myc)); continue; }
    parts.push(strut(knee, foot, 0.26, 0.12, ZC.shell2, 3));
  }
  // One antenna limp, one bent wrong.
  parts.push(strut(V(3.6, 0.3, 0.7), V(4.3, -0.6, 1.9), 0.17, 0.1, ZC.shell, 3), strut(V(4.3, -0.6, 1.9), V(4.6, -2.0, 2.4), 0.1, 0.06, ZC.shell, 3));
  parts.push(strut(V(3.6, 0.3, -0.3), V(4.0, 2.2, -1.0), 0.17, 0.1, ZC.shell, 3), strut(V(4.0, 2.2, -1.0), V(5.8, 1.4, -1.9), 0.1, 0.06, ZC.shell, 3));
  return bake(parts);
}
const zCache = new Map();
export function zombieAntGeometry(frame) { if (!zCache.has(frame)) zCache.set(frame, buildZombie(frame)); return zCache.get(frame); }

// ---------- the Cordyceps Colony's heart ----------
export function cordycepsHeart() {
  const g = new THREE.Group(), mat = psx({ vertexColors: true }), parts = [];
  // The dead mound: lumpy grey-brown earth crusted with pale fungus. Coloured by place, not by face, so the
  // lathe's long slices don't stripe it; lumped by smooth functions of the angle, so no seams open.
  const prof = [[64, 0], [58, 4], [50, 11], [41, 18], [31, 24], [20, 28], [9, 30], [0.01, 30.5]].map(([x, y]) => new THREE.Vector2(x, y));
  const mg = new THREE.LatheGeometry(prof, 40);
  { const p = mg.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), an = Math.atan2(z, x), r = Math.hypot(x, z), w = 1 + 0.07 * Math.sin(3 * an + 0.5) + 0.05 * Math.sin(7 * an + 1.9);
    p.setXYZ(k, x * w, y * (1 + 0.12 * Math.sin(5 * an + 2.2) * Math.min(1, r / 20)), z * w); } }
  const crust = (x, z) => Math.sin(x * 0.19 + z * 0.11) + Math.sin(z * 0.23 - x * 0.08 + 1.3) + Math.sin((x + z) * 0.31);
  parts.push(paint(mg, (x, y, z, f) => { const n = crust(x, z); return n > 1.3 ? (hash(f) < 0.5 ? '#d8d4c0' : '#c4bea6') : n > 0.6 ? '#8a8270' : hash(f) < 0.5 ? '#4e483c' : '#423c32'; }));
  // Its dead doorways, dark and gaping, and white fuzz bursting from cracks.
  for (let k = 0; k < 5; k++) { const an = k * 1.3 + 0.4, r = 30 + hash(k) * 14, y = 30.5 * (1 - (r / 64) ** 1.6) - 1; parts.push(blob([Math.cos(an) * r, y, Math.sin(an) * r], [7, 3.5, 6], [7, 4], '#0c0a08')); }
  for (let k = 0; k < 26; k++) { const an = k * 2.39, r = 8 + hash(k + 30) * 52, y = 30.5 * (1 - (r / 64) ** 1.6); parts.push(blob([Math.cos(an) * r, y, Math.sin(an) * r], [2.5 + hash(k) * 3, 2 + hash(k + 1) * 2, 2.5 + hash(k + 2) * 3], [5, 3], hash(k + 4) < 0.5 ? '#f0ecdc' : '#dcd6c2')); }
  // Stalks: six twisted, one great one in the middle; swollen pored heads.
  const stalks = [[0, 0, 175, 1.6], [16, 6, 120, 1.0], [-14, 10, 105, 0.9], [8, -16, 130, 1.1], [-12, -12, 95, 0.85], [20, -6, 85, 0.75]];
  for (const [sx, sz, h, k] of stalks) {
    let p0 = V(sx, 26, sz); const segs = 6;
    for (let i = 1; i <= segs; i++) { const u = i / segs, p1 = V(sx + Math.sin(u * 3 + sx) * 10 * k + u * 6, 26 + h * u, sz + Math.cos(u * 2.4 + sz) * 8 * k); parts.push(strut(p0, p1, (6 - u * 3) * k, (6 - (u + 0.17) * 3) * k, i < 3 ? '#5a3a1e' : i < 5 ? '#8a5a2c' : '#b07a3a', 6)); p0 = p1; }
    parts.push(blob([p0.x - 2, p0.y - 18 * k, p0.z], [8 * k, 22 * k, 8 * k], [8, 7], (x, y, z, f) => (hash(f) < 0.32 ? '#4a2a14' : '#d08a3a')));
    parts.push(blob([p0.x, p0.y + 3, p0.z], [3.5 * k, 5 * k, 3.5 * k], [5, 4], '#ecc890'));
  }
  // Husks: dead ants curled round the mound's foot.
  for (let k = 0; k < 9; k++) { const a = k * 0.7 + 0.3, r = 60 + hash(k) * 12; const hg = buildZombie(-1).clone(); hg.scale(2.2, 2.2, 2.2); hg.rotateZ(Math.PI / 2 * (k % 2 ? 1 : -1) * 0.9); hg.rotateY(-a); hg.translate(Math.cos(a) * r, 6, Math.sin(a) * r); parts.push(hg); }
  // Mycelium: white threads creeping out over the ground, forking as they go.
  const thread = (x, z, an, n, w, seed) => { for (let j = 0; j < n; j++) { const l = 9 + hash(seed + j) * 7, nx = x + Math.cos(an) * l, nz = z + Math.sin(an) * l;
    parts.push(strut(V(x, 0.6, z), V(nx, 0.6, nz), w, Math.max(0.4, w - 0.2), hash(seed + j + 7) < 0.5 ? '#e8e4d2' : '#cfc9b4', 3));
    if (hash(seed + j + 40) < 0.35 && n - j > 2) thread(nx, nz, an + (hash(seed + j + 3) < 0.5 ? 0.7 : -0.7), n - j - 2, Math.max(0.45, w - 0.4), seed + 31 * (j + 1));
    x = nx; z = nz; an += (hash(seed + j + 11) - 0.5) * 0.8; } };
  for (let k = 0; k < 14; k++) { const an = k * 0.449 + hash(k) * 0.3; thread(Math.cos(an) * 60, Math.sin(an) * 60, an, 5 + Math.floor(hash(k + 9) * 3), 1.1, k * 101); }
  g.add(new THREE.Mesh(bake(parts), mat));
  // A pale bloom of fungus on the ground round its foot.
  const web = new THREE.RingGeometry(50, 92, 30, 1).rotateX(-Math.PI / 2); { const p = web.attributes.position; for (let k = 0; k < p.count; k++) { const r = Math.hypot(p.getX(k), p.getZ(k)); if (r > 60) { const s = 0.8 + hash(k) * 0.35; p.setX(k, p.getX(k) * s); p.setZ(k, p.getZ(k) * s); } } }
  const webM = new THREE.Mesh(web, psxBasic({ color: '#d8d4c0', transparent: true, opacity: 0.07, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); webM.position.y = 0.3; webM.renderOrder = 2; g.add(webM);
  // Glowing pustules, half sunk in the mound; a drifting cloud of spores round the crown.
  const pustules = []; for (let k = 0; k < 11; k++) { const a = k * 2.1, r = 10 + hash(k + 5) * 40, m = new THREE.Mesh(new THREE.SphereGeometry(2.4 + hash(k) * 1.8, 6, 5), psxBasic({ color: '#b6ff5a' })); m.position.set(Math.cos(a) * r, 30.5 * (1 - (r / 64) ** 1.6), Math.sin(a) * r); g.add(m); pustules.push(m); }
  const hazeMat = psxBasic({ color: '#c8e070', transparent: true, opacity: 0.12, depthWrite: false }), haze = new THREE.Group(); haze.material = hazeMat; haze.position.y = 175; g.add(haze);
  for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.34 + hash(k) * 0.16, 8, 6), hazeMat), an = k * 0.9; m.position.set(Math.cos(an) * (0.2 + hash(k + 2) * 0.45), (hash(k + 4) - 0.4) * 0.5, Math.sin(an) * (0.2 + hash(k + 3) * 0.45)); haze.add(m); }
  return { group: g, pustules, haze };
}

// ---------- Old Blind, the mole ----------
const MO = { fur: '#2c2826', fur2: '#36302c', fur3: '#221e1c', sheen: '#4a4440', mange: '#a07070', vein: '#5aff5a', pink: '#f0a0b0', pink2: '#d87888', palm: '#e8c4bc', nail: '#f0ece0', nail2: '#8a7a6a' };
export function mole() {
  const g = new THREE.Group(), mat = psx({ vertexColors: true }), veinM = psxBasic({ color: '#7dff6a' }), parts = [], vp = [];
  // Velvet: fine facets in close dark tones, a dull sheen along the top.
  const fur = (x, y, z, f) => { const h = hash(f); return y > 92 ? (h < 0.35 ? MO.sheen : MO.fur2) : h < 0.5 ? MO.fur : h < 0.8 ? MO.fur3 : MO.fur2; };
  // A long barrel, humped over the shoulders, flat underneath, running straight into the head (no neck).
  const surf = (x, th) => { const u = Math.max(0, 1 - (x / 128) ** 2), r = Math.sqrt(u); return V(x, 52 + 62 * Math.cos(th) * r * (Math.cos(th) > 0 ? 1 + 0.18 * Math.cos((x - 30) / 128 * Math.PI) : 0.55), 82 * Math.sin(th) * r); };
  const bg = new THREE.SphereGeometry(1, 30, 18).scale(128, 62, 82);
  { const p = bg.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k); p.setY(k, 52 + (y > 0 ? y * (1 + 0.18 * Math.cos((x - 30) / 128 * Math.PI)) : y * 0.55)); } }
  parts.push(paint(bg, fur));
  const hg = new THREE.SphereGeometry(1, 20, 12).scale(74, 42, 50); { const p = hg.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), t = 1 - Math.max(0, x / 74) * 0.62; p.setY(k, p.getY(k) * t); p.setZ(k, p.getZ(k) * t); } }
  parts.push(paint(hg.translate(124, 54, 0), fur));
  parts.push(paint(new THREE.ConeGeometry(13, 34, 8).rotateZ(-Math.PI / 2).translate(206, 50, 0), MO.pink2)); // the bare snout
  // Mange: a few scabbed, bald patches.
  for (let k = 0; k < 6; k++) { const q = surf(-80 + k * 28 + hash(k) * 10, (hash(k + 3) - 0.5) * 2.2); parts.push(blob([q.x, q.y + 1, q.z], [9 + hash(k + 1) * 6, 2.5, 7 + hash(k + 2) * 5], [6, 3], hash(k + 7) < 0.5 ? MO.mange : '#7a5a52')); }
  // Eyes, pinpricks sunk in the fur: one milky, one glowing.
  parts.push(blob([162, 66, 20], [3.4, 3, 2.6], [5, 4], '#c8c4b0'));
  // Hind feet, a stub of a tail, whiskers.
  for (const sd of [-1, 1]) parts.push(blob([-96, 8, sd * 58], [24, 7, 15], [7, 4], MO.palm));
  parts.push(strut(V(-124, 46, 0), V(-158, 34, 0), 7, 2.5, MO.pink2, 5));
  for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) parts.push(strut(V(196, 50 + k * 3, sd * 8), V(222, 44 + k * 7, sd * (30 + k * 5)), 0.9, 0.3, '#e8e0d0', 3));
  g.add(new THREE.Mesh(bake(parts), mat));
  // The glow in its blood: green veins branching back over the shoulders and down the flanks.
  for (let v = 0; v < 6; v++) { let x = 70 - hash(v) * 30, th = (v - 2.5) * 0.42; const n = 7; let q = surf(x, th).multiplyScalar(1); q.y += 1;
    for (let j = 0; j < n; j++) { const nx = x - 16 - hash(v * 9 + j) * 10, nth = th + (hash(v * 5 + j) - 0.5) * 0.5 + Math.sign(th || 1) * 0.06, nq = surf(nx, nth); nq.y += 1;
      vp.push(strut(q, nq, Math.max(0.6, 2.4 - j * 0.28), Math.max(0.5, 2.1 - j * 0.28), '#ffffff', 3));
      if (hash(v * 13 + j) < 0.35 && j < n - 2) { const bq = surf(nx - 18, nth + (hash(v + j) < 0.5 ? 0.35 : -0.35)); bq.y += 1; vp.push(strut(nq, bq, 1.2, 0.5, '#ffffff', 3)); }
      x = nx; th = nth; q = nq; } }
  const veins = new THREE.Mesh(bake(vp), veinM); g.add(veins);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(3.4, 6, 5), psxBasic({ color: '#7dff6a' })); eye.position.set(162, 66, -20); g.add(eye);
  // The star nose: twenty-two fleshy pink rays round the nostrils, splayed wide, the mole's whole face.
  const nose = new THREE.Group(); nose.position.set(222, 50, 0); g.add(nose);
  const np = [blob([0, 0, 0], [7, 13, 13], [8, 6], MO.pink2), blob([5, 2, 3], [2, 2.4, 2], [4, 3], '#4a2028'), blob([5, 2, -3], [2, 2.4, 2], [4, 3], '#4a2028')];
  for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2, len = k % 11 === 0 ? 30 : 24; np.push(strut(V(1, Math.sin(a) * 10, Math.cos(a) * 10), V(10, Math.sin(a) * len, Math.cos(a) * len), 3.4, 1.6, k % 2 ? MO.pink : '#ffbccb', 5)); }
  nose.add(new THREE.Mesh(bake(np), mat));
  // Spade hands: huge pink paddles thrust out sideways at the shoulders, palms turned out and back, five long
  // pale nails fanned forward on each.
  const claws = [-1, 1].map((sd) => {
    const c = new THREE.Group(); c.position.set(96, 30, sd * 78); c.userData.bx = 96; c.rotation.set(sd * 0.25, sd * -0.35, 0); g.add(c);
    const cp = [strut(V(-20, 6, -sd * 22), V(4, 0, 0), 16, 12, MO.fur, 6), blob([10, 0, sd * 22], [34, 8, 36], [9, 5], MO.palm), blob([4, 4, sd * 18], [24, 5, 24], [7, 4], '#d8aea6')];
    for (let k = 0; k < 5; k++) { const z = sd * 22 + (k - 2) * 13; cp.push(strut(V(36, 0, z), V(76, -8, z * 1.18 + (k - 2) * 4), 5.5, 1.4, MO.nail, 4), blob([76, -8, z * 1.18 + (k - 2) * 4], [3, 2, 2], [4, 3], MO.nail2)); }
    c.add(new THREE.Mesh(bake(cp), mat)); return c;
  });
  return { group: g, nose, claws, eye, veins: veinM };
}

// ---------- the Sinkhole ----------
export function sinkholeGeometry(R) {
  // Build 59: the ground on the lip of the caved-in mound, slumped and split where the seam broke through:
  // a low torn dish of dark scorched earth (the pit itself is cavedPitGeometry, in the scenery).
  const prof = [[R * 1.6, 0.2], [R * 1.3, 1.6], [R * 1.08, 4.5], [R * 0.98, 5], [R * 0.86, 3], [R * 0.66, 1.2], [R * 0.4, 0.5], [0, 0.4]].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(prof, 30);
  const parts = [paint(geo, (x, y, z, f) => {
    const d = Math.hypot(x, z) / R;
    if (d < 0.66) return hash(f) < 0.12 ? '#24301c' : hash(f + 3) < 0.4 ? '#1a120c' : '#120c08';
    if (d < 1.0) return hash(f) < 0.3 ? '#3a2818' : '#2c1e12';
    if (d < 1.15) return hash(f) < 0.4 ? '#7a5434' : '#6a4a2e';
    return hash(f) < 0.3 ? '#5e4430' : '#52402a';
  })];
  // Torn clods heaved up round the edge.
  for (let k = 0; k < 14; k++) { const a = k * 0.45 + hash(k) * 0.3, r = R * (0.95 + hash(k + 2) * 0.25); parts.push(blob([Math.cos(a) * r, 3 + hash(k) * 3, Math.sin(a) * r], [5 + hash(k + 4) * 5, 3 + hash(k) * 2, 4 + hash(k + 1) * 4], [5, 3], hash(k + 6) < 0.5 ? '#7a5a3a' : '#5a3e26')); }
  return bake(parts);
}

// ---------- The caved-in mound (the Sinkhole proper) ----------
// The fire ants' great mound, fallen in. yardScenery cuts the ground open under the mound, so this is a
// real pit, falling far below the yard: a broken red rim slumped low on the side toward the open seam,
// the old nest's galleries laid open in walls that darken stratum by stratum, roots hanging into it,
// rubble on a black floor. R is the old mound's radius (px). The glow at the bottom is pitGlow().
const PIT_BANDS = ['#7e4428', '#643620', '#4c2a1a', '#3a2016', '#281612', '#170e0c'].map((c) => new THREE.Color(c));
const PIT_GREEN = new THREE.Color('#2e8a3a'), PIT_BLACK = new THREE.Color('#050404');
export function cavedPitGeometry(R) {
  const D = R * 0.8;
  const prof = [[0.001, -D], [0.18, -D + 2], [0.3, -D * 0.92], [0.4, -D * 0.74], [0.5, -D * 0.54], [0.6, -D * 0.36], [0.69, -D * 0.19], [0.76, -D * 0.06], [0.81, 3], [0.855, 13], [0.9, 21], [0.94, 16], [0.98, 7], [1.03, 0.3]];
  const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x * R, y)), 48);
  // Wobble the outline and break the crest, as smooth functions of the angle so no seams open.
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), w = 1 + 0.03 * Math.sin(3 * a + 0.7) + 0.02 * Math.sin(7 * a + 2.1) + 0.01 * Math.sin(13 * a);
    let dy = 0;
    if (y > 0.5) { const up = Math.min(1, y / 21); dy = up * (5 * Math.sin(5 * a + 1.3) + 3 * Math.sin(11 * a + 0.4) + 2 * Math.sin(23 * a)); const br = Math.exp(-((a + Math.PI / 2) ** 2) / 0.12); dy -= up * br * 15; } // slumped low toward the seam (north)
    p.setXYZ(i, x * w, y + dy, z * w);
  }
  geo.computeVertexNormals();
  const c = new THREE.Color();
  const parts = [paint(geo, (x, y, z, f) => {
    const d = Math.hypot(x, z) / R, far = -z / (Math.hypot(x, z) || 1);
    if (y > 1 && d > 0.84) return d > 0.95 ? (hash(f) < 0.3 ? '#7a4028' : '#6c3a24') : hash(f) < 0.35 ? '#a85a36' : '#94502f';
    const k = Math.max(0, Math.min(1, -y / D));
    if (k > 0.9) return hash(f) < 0.1 ? '#1a3a1c' : '#0a0807';
    if (k > 0.08 && k < 0.62 && hash(f * 3 + 1) < 0.07) return '#060404'; // the fire ants' galleries, laid open
    c.copy(PIT_BANDS[Math.max(0, Math.min(5, Math.floor(k * 6 + (hash(f) - 0.5) * 0.6)))]);
    c.multiplyScalar(0.55 + 0.45 * Math.max(0, far) + (hash(f + 5) - 0.5) * 0.12); // the far wall catches the light; the near one is in shadow
    if (k > 0.55) c.lerp(PIT_GREEN, (k - 0.55) * 0.9 * (0.6 + 0.4 * Math.max(0, far))); // the seam's glow climbing the walls
    return c;
  })];
  // Roots hanging from the rim into the dark.
  for (let k = 0; k < 16; k++) { const a = k * 0.41 + hash(k) * 0.3, r0 = R * 0.84, r1 = R * (0.66 + hash(k + 1) * 0.08), y1 = -D * (0.15 + hash(k + 2) * 0.25);
    parts.push(strut(V(Math.cos(a) * r0, 6, Math.sin(a) * r0), V(Math.cos(a + 0.05) * r1, y1, Math.sin(a + 0.05) * r1), 2.2, 0.5, hash(k + 9) < 0.5 ? '#3a2616' : '#2a1c10', 3)); }
  // Clods tipping over the rim, and rubble heaped on the floor.
  for (let k = 0; k < 18; k++) { const a = k * 0.35 + hash(k + 20) * 0.2, r = R * (0.86 + hash(k + 21) * 0.08); parts.push(blob([Math.cos(a) * r, 16 + hash(k) * 8, Math.sin(a) * r], [7 + hash(k + 4) * 8, 5 + hash(k) * 4, 7 + hash(k + 1) * 6], [5, 4], hash(k + 6) < 0.5 ? '#8a4a2c' : '#6a3820')); }
  for (let k = 0; k < 14; k++) { const a = k * 0.9 + hash(k + 40), r = R * (0.08 + hash(k + 41) * 0.22); parts.push(blob([Math.cos(a) * r, -D + 4 + hash(k) * 4, Math.sin(a) * r], [9 + hash(k + 4) * 10, 5 + hash(k) * 5, 8 + hash(k + 1) * 8], [5, 3], hash(k + 6) < 0.5 ? '#2a1812' : '#1c100c')); }
  return bake(parts);
}

// The open seam at the pit's bottom: glowing cracks across the floor and a faint green shaft rising out.
export function pitGlow(R) {
  const D = R * 0.8, g = new THREE.Group(), crack = psxBasic({ color: '#7aff6a' }), core = psxBasic({ color: '#c8ffb0' });
  const seg = (x0, z0, x1, z1, w, m) => { const len = Math.hypot(x1 - x0, z1 - z0) + w * 0.5; const b = new THREE.Mesh(new THREE.BoxGeometry(len, 1.2, w), m); b.position.set((x0 + x1) / 2, -D + 3, (z0 + z1) / 2); b.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(b); };
  // A jagged split across the floor, forking as it runs, glowing hottest in the middle.
  const run = (x, z, a, n, w, seed) => { for (let j = 0; j < n; j++) { const l = R * (0.035 + hash(seed + j) * 0.03), nx = x + Math.cos(a) * l, nz = z + Math.sin(a) * l; seg(x, z, nx, nz, Math.max(1, w - j * 0.5), w > 2.5 && j < 2 ? core : crack); if (hash(seed + j + 50) < 0.3 && n - j > 2) run(nx, nz, a + (hash(seed + j + 9) < 0.5 ? 0.9 : -0.9), n - j - 2, Math.max(1, w - j * 0.6 - 1), seed + 97 * (j + 1)); x = nx; z = nz; a += (hash(seed + j + 3) - 0.5) * 0.9; } };
  run(0, 0, 0.3, 7, 3.5, 11); run(0, 0, 0.3 + Math.PI, 7, 3.5, 23); run(0, 0, 1.9, 4, 2, 37); run(0, 0, -1.4, 4, 2, 53);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.36, R * 0.16, D * 1.05, 16, 1, true).translate(0, -D * 0.47, 0), psxBasic({ color: '#5aff6a', transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(shaft);
  return { group: g, crack, shaft };
}
