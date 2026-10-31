// The yard's big creatures: a wolf spider and a woolly bear caterpillar.
// Unlike the ants (one tint per instance), these bake real colours into their
// vertices: banded legs, a striped back, fuzz with pale tips.
//
// Local frame as for ants: +X forward, +Y up, +Z to the left.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const col = new THREE.Color();

// Colour every triangle by its centroid: fn(x, y, z) → CSS colour. Flat
// colours per facet keep the PS1 look.
function paint(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    col.set(typeof fn === 'function' ? fn(x, y, z, i / 3) : fn);
    for (let k = 0; k < 3; k++) c.set([col.r, col.g, col.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function blob(c, r, seg, fn) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  g.scale(r[0], r[1], r[2]);
  g.translate(c[0], c[1], c[2]);
  return paint(g, fn);
}

function strut(a, b, r0, r1, color, sides = 4) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()));
  g.translate(a.x, a.y, a.z);
  return paint(g, color);
}

function bake(parts) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeVertexNormals();
  return g;
}

// Small deterministic hash for speckles.
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- spider ----------

export const SPIDER_FOOT = 7.3;      // feet rest this far below the body origin
export const SPIDER_FRAMES = 8;      // walk cycle
export const SPIDER_CROUCH = 2.4;    // how much lower the body sits crouched (build 16)
const SP = {
  dark: '#2a1c13', base: '#3e2b1d', mid: '#5a4130', pale: '#8f7152', band: '#a88a64', eye: '#070505',
};
// Hips along the cephalothorax and where each foot rests, as angle from
// forward (degrees) and reach from the hip.
const LEGS = [
  { hx: 3.4, ang: 32, reach: 15.5 },
  { hx: 2.3, ang: 72, reach: 13.5 },
  { hx: 1.1, ang: 112, reach: 12.5 },
  { hx: -0.1, ang: 150, reach: 15.5 },
];

function leg(side, i, swing, lift, raise, pose) {
  const L = LEGS[i];
  const hip = V(L.hx, 1.5, side * 2.1);
  const a = (L.ang * Math.PI) / 180;
  // pose 'crouch': feet wide and the body low; 'dead': legs curled in.
  const reach = L.reach * (pose === 'crouch' ? 1.12 : pose === 'dead' ? 0.3 : 1);
  const footY = pose === 'crouch' ? -(SPIDER_FOOT - SPIDER_CROUCH) : pose === 'dead' ? 2.5 : -SPIDER_FOOT;
  const foot = V(hip.x + Math.cos(a) * reach + swing, footY + lift + raise, side * (2.1 + Math.sin(a) * reach));
  if (raise) foot.x += 3;
  // Two-bone IK in the vertical plane through hip and foot; leg lengths are
  // fixed from the resting pose so the knee rises as the foot comes in.
  const rest = Math.hypot(Math.cos(a) * L.reach, SPIDER_FOOT + 1.5, Math.sin(a) * L.reach);
  const L1 = rest * 0.6, L2 = rest * 0.76;
  const d = Math.min(hip.distanceTo(foot), (L1 + L2) * 0.98);
  const dir = foot.clone().sub(hip).normalize();
  const sideAx = dir.clone().cross(UP).normalize();
  const upP = sideAx.clone().cross(dir).normalize();
  if (upP.y < 0) upP.negate();
  const ang = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const knee = hip.clone().addScaledVector(dir, Math.cos(ang) * L1).addScaledVector(upP, Math.sin(ang) * L1);
  const ankle = knee.clone().lerp(foot, 0.55).addScaledVector(UP, 0.8);
  const toe = foot;
  const parts = [
    strut(hip, knee, 0.85, 0.7, SP.base),
    strut(knee, ankle, 0.7, 0.55, SP.mid),
    strut(ankle, toe, 0.5, 0.28, SP.base),
    blob([knee.x, knee.y, knee.z], [0.75, 0.75, 0.75], [4, 3], SP.band),
    blob([ankle.x, ankle.y, ankle.z], [0.55, 0.55, 0.55], [4, 3], SP.band),
  ];
  // Bristles: a few stiff hairs on the upper leg.
  for (let k = 1; k <= 2; k++) {
    const p = hip.clone().lerp(knee, k / 3);
    parts.push(strut(p, p.clone().addScaledVector(UP, 1.3).addScaledVector(dir, 0.6), 0.14, 0.05, SP.pale, 3));
  }
  return parts;
}

// frame: 0..SPIDER_FRAMES-1 walking, -1 standing, -2 standing with a foreleg
// raised, -3 dead (legs curled), -4 crouched to spring, -5 rearing to strike
// (both forelegs up).
export function spiderGeometry(frame) {
  const parts = [];
  // Abdomen: dark with a pale lance down the back and speckled flanks.
  parts.push(blob([-7.4, 4.0, 0], [7.4, 5.5, 6.0], [12, 8], (x, y, z) => {
    const top = y > 6.2, back = Math.abs(z) < 1.3 + (x + 7.4) * 0.12;
    if (top && back) return SP.band;
    if (y < 2) return SP.dark;
    const k = Math.floor((x + 20) * 1.3) * 31 + Math.floor((z + 20) * 1.3) * 7 + Math.floor(y * 1.5);
    return hash(k) < 0.18 ? SP.pale : SP.base;
  }));
  parts.push(blob([-0.6, 1.8, 0], [1.2, 1.0, 1.0], [5, 3], SP.dark));
  // Cephalothorax with the two pale bands of a wolf spider.
  parts.push(blob([2.2, 2.2, 0], [4.8, 2.9, 3.9], [10, 6], (x, y, z) => {
    if (y < 1.4) return SP.dark;
    const az = Math.abs(z);
    return az > 0.9 && az < 2.1 && y > 3 ? SP.band : SP.mid;
  }));
  // Eyes: a big front pair, a low row of four, two behind. Black with glints.
  const eyes = [[6.3, 3.6, 0.8, 0.75], [5.6, 2.6, 0.45, 0.32], [5.6, 2.6, 1.25, 0.32], [4.6, 4.5, 1.5, 0.55]];
  for (const side of [-1, 1]) {
    for (const [x, y, z, r] of eyes) {
      parts.push(blob([x, y, side * z], [r, r, r], [5, 4], SP.eye));
      if (r > 0.5) parts.push(blob([x + r * 0.6, y + r * 0.45, side * (z - r * 0.15)], [0.18, 0.18, 0.18], [3, 2], '#f4f0e8'));
    }
    // Chelicerae and fangs.
    parts.push(blob([6.4, 1.0, side * 0.85], [1.2, 1.7, 0.85], [5, 4], SP.dark));
    parts.push(strut(V(7.1, -0.4, side * 0.8), V(7.0, -1.6, side * 0.25), 0.3, 0.08, '#140c08', 3));
    // Pedipalps, banded.
    const p0 = V(6.0, 0.6, side * 1.6), p1 = V(8.0, 1.6, side * 2.6), p2 = V(9.6, -0.6, side * 2.4);
    parts.push(strut(p0, p1, 0.5, 0.42, SP.mid), strut(p1, p2, 0.42, 0.36, SP.base), blob([p2.x, p2.y, p2.z], [0.55, 0.45, 0.45], [4, 3], SP.dark));
  }
  // Spinnerets.
  parts.push(strut(V(-14.2, 3.0, 0.4), V(-15.2, 2.6, 0.5), 0.45, 0.2, SP.dark, 3));
  parts.push(strut(V(-14.2, 3.0, -0.4), V(-15.2, 2.6, -0.5), 0.45, 0.2, SP.dark, 3));
  // Legs: alternating tetrapod gait. L1 R2 L3 R4 swing together, then the rest.
  const phase = frame >= 0 ? (frame / SPIDER_FRAMES) * Math.PI * 2 : 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const groupB = (i + (side > 0 ? 1 : 0)) % 2;
      const ph = phase + (groupB ? Math.PI : 0);
      const swing = frame >= 0 ? Math.sin(ph) * 2.2 : 0;
      const lift = frame >= 0 ? Math.max(0, Math.cos(ph)) * 2.6 : 0;
      const raise = (frame === -2 && i === 0 && side > 0) || (frame === -5 && i === 0) ? 6 : frame === -5 && i === 1 ? 2.5 : 0;
      parts.push(...leg(side, i, swing, lift, raise, frame === -3 ? 'dead' : frame === -4 ? 'crouch' : null));
    }
  }
  return bake(parts);
}

// How far the spider travels (in its own units) per walk cycle.
export const SPIDER_STRIDE = 8.8;

// ---------- caterpillar ----------

export const CAT_SEGMENTS = 10;
const WOOL = { black: ['#16110d', '#2a211a'], rust: ['#9a4e20', '#c2702e'], tipBlack: '#5a4a3e', tipRust: '#e6a35c' };

// One body segment: a shaggy ball with bristles, prolegs underneath.
// kind: 'head' | 'black' | 'rust'; legs: 'true' | 'pro' | null.
export function caterpillarSegment(kind, legs) {
  const parts = [];
  if (kind === 'head') {
    parts.push(blob([0.2, 0, 0], [0.95, 0.85, 0.9], [8, 6], (x, y) => (y < -0.4 ? '#0c0907' : '#1e1814')));
    // Mandibles and the simple eyes (a row of tiny pale dots).
    for (const side of [-1, 1]) {
      parts.push(strut(V(0.9, -0.45, side * 0.2), V(1.2, -0.65, side * 0.05), 0.12, 0.05, '#3a2a1c', 3));
      for (let k = 0; k < 3; k++) parts.push(blob([0.75 + k * 0.08, 0.1 + k * 0.12, side * (0.55 - k * 0.06)], [0.08, 0.08, 0.08], [3, 2], '#d8c8a8'));
      parts.push(strut(V(0.9, 0.1, side * 0.35), V(1.35, 0.3, side * 0.5), 0.05, 0.03, '#2a211a', 3));
    }
    return bake(parts);
  }
  const [c0, c1] = kind === 'black' ? WOOL.black : WOOL.rust;
  const tip = kind === 'black' ? WOOL.tipBlack : WOOL.tipRust;
  // Shaggy core: jitter the radius so the silhouette is never smooth.
  const core = new THREE.SphereGeometry(1, 9, 7).toNonIndexed();
  const p = core.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (hash(Math.round(x * 50) * 13 + Math.round(y * 50) * 7 + Math.round(z * 50)) - 0.5) * 0.22;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  parts.push(paint(core, (x, y, z, f) => (hash(f + 11) < 0.5 ? c0 : c1)));
  // Bristles: tufts over the top and sides, pale at the tips.
  for (let k = 0; k < 22; k++) {
    const u = hash(k * 3 + 1), v = hash(k * 7 + 2);
    const theta = u * Math.PI * 2, phi = 0.15 + v * 1.25; // from straight up to below the side
    const n = V(Math.sin(phi) * Math.cos(theta) * 0.7, Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    const base = n.clone().multiplyScalar(0.85);
    const len = 0.55 + hash(k * 5 + 3) * 0.35;
    parts.push(strut(base, base.clone().addScaledVector(n, len), 0.12, 0.03, k % 3 ? c1 : tip, 3));
  }
  if (legs) {
    for (const side of [-1, 1]) {
      const a = V(0.1, -0.6, side * 0.45), b = V(0.25, -1.05, side * 0.62);
      parts.push(legs === 'true' ? strut(a, b, 0.14, 0.07, '#1a1410', 3) : strut(a, b, 0.22, 0.2, '#2a2018', 4));
    }
  }
  return bake(parts);
}

// Shared with critters.js (build 16).
export { paint, blob, strut, bake, hash };
