// Build 16: the yard's small creatures. A ladybug, an earwig, a field cricket
// and a millipede, low-poly with their colours baked into the vertices like
// the spider and the caterpillar (bugs.js). Each model is a handful of baked
// poses: walk frames, and the poses its habits need (wings open, tail up,
// legs cocked to jump).
//
// Local frame: +X forward, +Y up, +Z to the left. Origin on the ground under
// the body, so a model stands where it is put.
import * as THREE from 'three';
import { paint, blob, strut, bake } from './bugs.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// A leg from hip to foot, the knee lifted above both: two struts.
function leg(hip, foot, up, r0, r1, c0, c1) {
  const knee = hip.clone().lerp(foot, 0.42);
  knee.y = Math.max(hip.y, foot.y) + up;
  return [strut(hip, knee, r0, r0 * 0.8, c0, 3), strut(knee, foot, r0 * 0.8, r1, c1 || c0, 3)];
}
// An ellipsoid tilted about X then Y, then moved: elytra and wings.
function shell(c, r, rx, ry, seg, fn) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  g.scale(r[0], r[1], r[2]);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  g.translate(c[0], c[1], c[2]);
  return paint(g, fn);
}
// Six legs walking a tripod gait: legs 0 and 2 on one side swing with leg 1
// on the other. hips/feet: per pair [x, z]; frame -1 stands still.
function sixLegs(parts, frame, frames, hipY, hips, feet, up, r, c0, c1, stride = 0.8) {
  const ph = frame >= 0 ? (frame / frames) * Math.PI * 2 : 0;
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const p = ph + ((i + (side > 0 ? 1 : 0)) % 2 ? Math.PI : 0);
    const sw = frame >= 0 ? Math.sin(p) * stride : 0, lift = frame >= 0 ? Math.max(0, Math.cos(p)) * stride * 0.7 : 0;
    parts.push(...leg(V(hips[i][0], hipY, side * hips[i][1]), V(feet[i][0] + sw, lift, side * feet[i][1]), up, r, r * 0.45, c0, c1));
  }
}
export const BUG_WALK = 4;

// ---------- ladybug ----------
// Red elytra with seven black spots, a black pronotum with white cheeks.
// open: 0 shut; 1 and 2 are the two halves of a wingbeat.
const LB = { red: '#c4261b', hi: '#e2533c', black: '#120c0a', white: '#eee6d4', wing: '#d8c9ae', leg: '#1c1310' };
const LB_SPOTS = [[1.9, 0, 0.95], [1.0, 2.2, 0.9], [-1.4, 1.5, 1.05], [-1.0, 3.3, 0.8], [-3.4, 1.9, 0.85]];
const onSpot = (x, z) => LB_SPOTS.some(([sx, sz, r]) => Math.hypot(x - sx, Math.abs(z) - sz) < r);
export function ladybugGeometry(frame, open = 0) {
  const parts = [];
  if (!open) {
    parts.push(blob([-0.5, 2.6, 0], [4.7, 2.5, 4.1], [18, 11], (x, y, z) => {
      if (y < 1.2) return LB.black;
      if (Math.abs(z) < 0.22 && y > 3.4) return LB.black; // the seam between the wing cases
      if (onSpot(x, z)) return LB.black;
      return y > 4.4 && x > -2 ? LB.hi : LB.red;
    }));
  } else {
    // Wing cases up and out, the dark abdomen under them, wings a blur.
    parts.push(blob([-0.8, 2.0, 0], [3.8, 1.4, 2.8], [8, 5], LB.black));
    for (const side of [-1, 1]) {
      parts.push(shell([-0.6, 3.4, side * 2.4], [4.2, 1.0, 2.2], side * -0.9, side * 0.25, [8, 5], (x, y, z) => (onSpot(x + 0.6, z * 1.6) ? LB.black : LB.red)));
      const flap = open === 1 ? 0.55 : -0.35;
      parts.push(shell([-2.6, 3.9, side * 4.6], [3.6, 0.1, 2.9], side * -flap, side * 0.55, [6, 2], LB.wing));
    }
  }
  parts.push(blob([3.6, 2.2, 0], [1.4, 1.4, 2.6], [8, 5], (x, y, z) => (Math.abs(z) > 1.5 && y > 1.8 ? LB.white : LB.black)));
  parts.push(blob([4.8, 1.5, 0], [0.9, 0.85, 1.25], [6, 4], LB.black));
  for (const side of [-1, 1]) {
    parts.push(blob([5.3, 1.9, side * 0.7], [0.32, 0.3, 0.32], [4, 3], LB.white));
    parts.push(strut(V(5.5, 1.8, side * 0.45), V(6.5, 2.4, side * 1.1), 0.1, 0.07, LB.leg, 3));
  }
  sixLegs(parts, open ? -1 : frame, BUG_WALK, 1.0, [[2.6, 1.4], [0.9, 1.6], [-0.8, 1.5]], [[4.2, 3.2], [0.9, 3.8], [-2.4, 3.4]], 0.9, 0.28, LB.leg, LB.leg, 0.7);
  return bake(parts);
}

// ---------- earwig ----------
// Chestnut plates, short pale wing cases, the forceps at the tail. tail: 0
// flat to 1 curled up over its back (the threat); closed: forceps shut.
const EW = { head: '#6c2a12', shield: '#47200e', wing: '#a8763f', plate: '#5c2811', plate2: '#3d190b', rim: '#7e4224', leg: '#b88c54', forceps: '#2c1408' };
export function earwigGeometry(frame, tail = 0, closed = false) {
  const parts = [];
  parts.push(blob([6.2, 1.7, 0], [1.4, 0.95, 1.15], [7, 5], EW.head));
  parts.push(blob([4.4, 1.85, 0], [1.25, 0.75, 1.35], [7, 4], EW.shield));
  parts.push(blob([2.5, 1.95, 0], [1.75, 0.72, 1.45], [8, 4], (x, y, z) => (Math.abs(z) < 0.14 ? EW.shield : EW.wing)));
  for (const side of [-1, 1]) {
    parts.push(blob([7.0, 1.9, side * 0.62], [0.28, 0.28, 0.28], [4, 3], '#120806'));
    parts.push(strut(V(7.4, 1.3, side * 0.3), V(7.9, 1.0, side * 0.1), 0.18, 0.06, EW.forceps, 3));
    // Beaded antennae.
    const a0 = V(7.2, 2.0, side * 0.5), a1 = V(9.2, 2.7, side * 1.9), a2 = V(11.0, 2.3, side * 2.9);
    parts.push(strut(a0, a1, 0.12, 0.09, EW.head, 3), strut(a1, a2, 0.09, 0.06, EW.head, 3));
    for (let k = 1; k < 4; k++) { const p = a0.clone().lerp(a1, k / 4); parts.push(blob([p.x, p.y, p.z], [0.14, 0.14, 0.14], [3, 2], EW.rim)); }
  }
  // Abdomen: six plates, curling up and forward as the tail rises.
  const segs = [];
  for (let k = 0; k < 6; k++) {
    const u = k / 5, x = 0.6 - k * 1.45 + tail * u * u * 1.6, y = 1.75 + tail * u * u * 4.2;
    segs.push(V(x, y, 0));
    const wide = 1.45 + Math.sin(u * Math.PI) * 0.25 - u * 0.2;
    parts.push(blob([x, y, 0], [0.95, 0.8, wide], [8, 4], (px, py, pz) => (px > x + 0.55 ? EW.rim : k % 2 ? EW.plate2 : EW.plate)));
  }
  // Forceps: from the last plate, along the line of the body, bowed out.
  const end = segs[5], dir = end.clone().sub(segs[4]).normalize(), out = 3.2;
  for (const side of [-1, 1]) {
    const base = end.clone().addScaledVector(dir, 0.6).add(V(0, 0, side * 0.45));
    const mid = end.clone().addScaledVector(dir, out * 0.55).add(V(0, 0, side * (closed ? 0.55 : 1.25)));
    const tip = end.clone().addScaledVector(dir, out).add(V(0, 0, side * (closed ? 0.02 : 0.55)));
    parts.push(strut(base, mid, 0.32, 0.24, EW.forceps, 3), strut(mid, tip, 0.24, 0.07, EW.forceps, 3));
  }
  sixLegs(parts, frame, BUG_WALK, 1.3, [[4.5, 0.8], [3.2, 0.9], [1.9, 0.9]], [[6.6, 2.8], [3.2, 3.4], [-0.6, 3.0]], 1.1, 0.24, EW.leg, EW.leg, 0.9);
  return bake(parts);
}

// ---------- field cricket ----------
// Black, glossy, the big hind legs. pose: 'sit', 'walk0', 'walk1', 'crouch'
// (cocked to jump), 'leap' (legs thrown back), 'chirp' (wings lifted).
const CR = { body: '#1d1510', head: '#130e0b', wing: '#3e2c1d', vein: '#5c4532', leg: '#271c15', femur: '#33251a', spine: '#7a6046', eye: '#3a2a1e' };
export function cricketGeometry(pose) {
  const parts = [], chirp = pose === 'chirp';
  parts.push(blob([5.6, 2.9, 0], [1.9, 2.0, 1.9], [9, 7], (x, y) => (y < 1.6 ? CR.body : CR.head)));
  parts.push(blob([3.6, 2.9, 0], [1.6, 1.5, 1.95], [8, 5], CR.body));
  parts.push(blob([-1.6, 2.5, 0], [4.6, 1.5, 1.95], [10, 5], CR.body));
  // Wings over the back, veined; lifted and parted to chirp.
  for (const side of [-1, 1]) {
    parts.push(shell([-1.2, 3.55 + (chirp ? 0.5 : 0), side * 0.95], [4.7, 0.42, 1.15], side * (chirp ? -0.35 : -0.08), 0, [8, 3],
      (x, y, z) => ((Math.floor(x * 1.3 + Math.abs(z) * 2) % 3 === 0) ? CR.vein : CR.wing)));
    parts.push(blob([6.6, 3.6, side * 1.3], [0.55, 0.6, 0.5], [5, 4], CR.eye));
    // Antennae longer than the body, swept out and back.
    const a0 = V(7.0, 3.8, side * 0.6), a1 = V(9.5, 5.0, side * 2.6), a2 = V(11.0, 5.4, side * 5.4), a3 = V(10.6, 4.6, side * 8.6);
    parts.push(strut(a0, a1, 0.12, 0.09, CR.leg, 3), strut(a1, a2, 0.09, 0.06, CR.leg, 3), strut(a2, a3, 0.06, 0.04, CR.leg, 3));
    // Cerci.
    parts.push(strut(V(-6.0, 2.6, side * 0.4), V(-8.6, 3.0, side * 1.2), 0.14, 0.05, CR.leg, 3));
  }
  // Front and middle legs.
  const step = pose === 'walk0' ? 0.7 : pose === 'walk1' ? -0.7 : 0;
  for (const side of [-1, 1]) {
    const s2 = side > 0 ? step : -step;
    parts.push(...leg(V(4.3, 1.8, side * 1.0), V(6.6 + s2, 0, side * 2.6), 1.0, 0.24, 0.12, CR.leg));
    parts.push(...leg(V(2.6, 1.8, side * 1.2), V(2.4 - s2, 0, side * 3.4), 1.0, 0.24, 0.12, CR.leg));
    // Hind legs: a thick femur up and back, the tibia down to the ground.
    const hip = V(0.6, 2.1, side * 1.6);
    const knee = pose === 'leap' ? V(-5.6, 2.2, side * 2.0) : pose === 'crouch' ? V(-4.0, 6.4, side * 2.6) : V(-4.9, 5.4, side * 2.4);
    const foot = pose === 'leap' ? V(-11.0, -0.4, side * 2.4) : pose === 'crouch' ? V(-2.4, 0, side * 2.8) : V(-3.4, 0, side * 2.7);
    parts.push(strut(hip, knee, 0.95, 0.5, CR.femur, 4));
    parts.push(blob([(hip.x + knee.x) / 2, (hip.y + knee.y) / 2 + 0.3, (hip.z + knee.z) / 2], [2.0, 0.75, 0.6], [6, 3], CR.femur));
    parts.push(strut(knee, foot, 0.32, 0.16, CR.leg, 3));
    for (let k = 1; k <= 3; k++) { const p = knee.clone().lerp(foot, k / 4); parts.push(strut(p, p.clone().add(V(-0.5, 0.35, side * 0.4)), 0.07, 0.02, CR.spine, 3)); }
  }
  return bake(parts);
}

// ---------- millipede ----------
// A chain of shiny rings (the renderer lays them along the path the head
// took), two pairs of legs on each, rippling front to back.
export const MILLI = { n: 16, gap: 2.3 };
const MP = { body: '#2c1812', band: '#82402a', belly: '#190d09', dot: '#d89a58', leg: '#caa070' };
export function millipedeSegment(kind, frame) {
  const parts = [], ph = (frame / BUG_WALK) * Math.PI * 2;
  const r = kind === 'tail' ? 0.85 : 1;
  if (kind === 'head') {
    parts.push(blob([0.4, 1.45, 0], [1.1, 1.05, 1.2], [7, 5], MP.body));
    for (const side of [-1, 1]) {
      parts.push(blob([1.2, 1.8, side * 0.7], [0.22, 0.22, 0.22], [3, 2], '#0a0605'));
      const a0 = V(1.3, 1.9, side * 0.45), a1 = V(2.4, 2.9, side * 1.2), a2 = V(3.4, 2.4, side * 1.8);
      parts.push(strut(a0, a1, 0.13, 0.1, MP.band, 3), strut(a1, a2, 0.1, 0.06, MP.band, 3));
    }
    return bake(parts);
  }
  parts.push(blob([0, 1.5 * r, 0], [1.3 * r, 1.3 * r, 1.4 * r], [8, 6], (x, y, z) => {
    if (y < 0.75 * r) return MP.belly;
    if (x > 0.8 * r) return MP.band;
    if (Math.abs(z) > 1.05 * r && y > 1.2 * r && y < 2.0 * r) return MP.dot;
    return MP.body;
  }));
  for (const side of [-1, 1]) for (const [lx, off] of [[0.45, 0], [-0.45, Math.PI * 0.5]]) {
    const p = ph + off, sw = Math.sin(p) * 0.55, lift = Math.max(0, Math.cos(p)) * 0.45;
    parts.push(...leg(V(lx, 0.75, side * 0.95 * r), V(lx + sw, lift, side * 2.0 * r), 0.35, 0.13, 0.07, MP.leg));
  }
  return bake(parts);
}
