// Low-poly creature geometry, baked once. Each body plan is merged into one
// BufferGeometry per walk frame, so a whole colony draws as a handful of
// instanced meshes. Vertex colours carry shading (legs darker, wing scars
// pale); the per-ant tint comes from the instance colour.
//
// Local frame: +X forward, +Y up, +Z to the ant's left. Origin at the body
// centre; feet rest at y = -FOOT.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const FOOT = 2.8;
export const WALK_FRAMES = 3;

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function tint(geo, k) {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3).fill(k);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

function ellipsoid(c, r, shade = 1, seg = [6, 4]) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  g.scale(r[0], r[1], r[2]);
  g.translate(c[0], c[1], c[2]);
  return tint(g, shade);
}

// Shade per face from the face's centre (build 21's model pass): bands, a
// gloss highlight, darker joints, all multiplied by the ant's tint.
function shadeFaces(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const k = fn(x, y, z); for (let j = 0; j < 9; j++) c[i * 3 + j] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
function shell(c, r, seg, fn) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  g.scale(r[0], r[1], r[2]); g.translate(c[0], c[1], c[2]);
  return shadeFaces(g, fn);
}

// A three-sided strut from a to b: the PS1 way to draw a leg.
function strut(a, b, r, shade) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r * 0.8, r, len, 3, 1);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return tint(g, shade);
}

const PLANS = {
  worker: {
    abdomen: [[-3.6, 0.5, 0], [2.6, 1.9, 2.0]],
    petiole: [[-0.9, 0.1, 0], [0.55, 0.65, 0.55]],
    thorax: [[0.6, 0.1, 0], [1.6, 1.0, 1.0]],
    head: [[3.4, 0.4, 0], [1.45, 1.3, 1.3]],
    hips: [1.4, 0.6, -0.2], hipY: -0.4, hipZ: 0.6,
    reach: [2.6, 0.2, -2.8], spread: [2.6, 3.0, 2.8],
    legR: 0.32, mandible: 1,
  },
  soldier: {
    abdomen: [[-3.8, 0.5, 0], [2.7, 2.0, 2.1]],
    petiole: [[-0.9, 0.1, 0], [0.6, 0.7, 0.6]],
    thorax: [[0.7, 0.2, 0], [1.7, 1.1, 1.1]],
    head: [[3.9, 0.5, 0], [1.9, 1.75, 1.85]],
    hips: [1.5, 0.7, -0.2], hipY: -0.4, hipZ: 0.65,
    reach: [2.7, 0.2, -2.9], spread: [2.8, 3.2, 3.0],
    legR: 0.36, mandible: 1.7,
  },
  queen: {
    abdomen: [[-5.6, 0.6, 0], [4.4, 2.6, 2.8]],
    petiole: [[-1.2, 0.2, 0], [0.55, 0.65, 0.55]],
    thorax: [[0.6, 0.3, 0], [1.8, 1.25, 1.2]],
    head: [[3.3, 0.4, 0], [1.25, 1.15, 1.15]],
    hips: [1.6, 0.8, -0.1], hipY: -0.3, hipZ: 0.7,
    reach: [2.4, 0.2, -2.6], spread: [2.6, 3.0, 2.8],
    legR: 0.3, mandible: 0.9, scars: true,
  },
};

function buildAnt(planName, frame) {
  const P = PLANS[planName];
  const parts = [];
  const [ac, ar] = P.abdomen, [tc, tr] = P.thorax, [hc, hr] = P.head, [pc, pr] = P.petiole;
  // Gaster: three plates banded darker at their edges, a gloss stripe along
  // the top, darker underneath.
  parts.push(shell(ac, ar, [10, 7], (x, y, z) => {
    const u = (x - (ac[0] - ar[0])) / (2 * ar[0]), band = Math.abs(((u * 3) % 1) - 0.5) > 0.42;
    if (y < ac[1] - ar[1] * 0.35) return 0.55;
    if (y > ac[1] + ar[1] * 0.7 && Math.abs(z) < ar[2] * 0.38) return 1.5;
    return band ? 0.58 : 1.04;
  }));
  // Waist: the petiole and its node, standing up a little.
  parts.push(ellipsoid(pc, pr, 0.86, [5, 4]));
  parts.push(ellipsoid([pc[0] + 0.1, pc[1] + pr[1] * 0.9, 0], [pr[0] * 0.55, pr[1] * 0.7, pr[2] * 0.8], 0.95, [4, 3]));
  // Thorax: a domed front plate and a lower back one, with a seam between.
  parts.push(shell([tc[0] + tr[0] * 0.35, tc[1] + tr[1] * 0.1, 0], [tr[0] * 0.7, tr[1], tr[2]], [8, 5], (x, y) => (y > tc[1] + tr[1] * 0.75 ? 1.25 : y < tc[1] - tr[1] * 0.4 ? 0.7 : 1)));
  parts.push(ellipsoid([tc[0] - tr[0] * 0.55, tc[1] - tr[1] * 0.05, 0], [tr[0] * 0.5, tr[1] * 0.78, tr[2] * 0.85], 0.88, [6, 4]));
  // Head: a gloss on the crown, compound eyes, the clypeus a little darker.
  parts.push(shell(hc, hr, [9, 6], (x, y, z) => (y > hc[1] + hr[1] * 0.7 ? 1.3 : x > hc[0] + hr[0] * 0.75 ? 0.78 : y < hc[1] - hr[1] * 0.5 ? 0.75 : 1.05)));
  for (let side = -1; side <= 1; side += 2) parts.push(ellipsoid([hc[0] + hr[0] * 0.25, hc[1] + hr[1] * 0.25, side * hr[2] * 0.86], [hr[0] * 0.28, hr[1] * 0.3, hr[2] * 0.18], 0.12, [5, 3]));
  const phase = (frame / WALK_FRAMES) * Math.PI * 2;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const group = (i + (side > 0 ? 1 : 0)) % 2;
      const ph = phase + (group ? Math.PI : 0);
      const swing = frame < 0 ? 0 : Math.sin(ph) * 0.42;
      const lift = frame < 0 ? 0 : Math.max(0, Math.cos(ph)) * 0.6;
      const hip = V(P.hips[i], P.hipY, side * P.hipZ);
      const reach = P.reach[i] + swing * 2.2;
      const spread = P.spread[i];
      // Femur up to the knee, tibia down, a thin tarsus to the foot; dark joints.
      const knee = V(hip.x + reach * 0.45, hip.y + 1.6, side * (P.hipZ + spread * 0.55));
      const foot = V(hip.x + reach, -FOOT + lift, side * (P.hipZ + spread));
      const ankle = knee.clone().lerp(foot, 0.72); ankle.y += 0.25;
      parts.push(strut(hip, knee, P.legR, 0.78));
      parts.push(strut(knee, ankle, P.legR * 0.78, 0.7));
      parts.push(strut(ankle, foot, P.legR * 0.45, 0.62));
      parts.push(ellipsoid([knee.x, knee.y, knee.z], [P.legR * 1.05, P.legR * 1.05, P.legR * 1.05], 0.5, [4, 3]));
    }
  }
  // Antennae: a long scape, then the elbow, then a funiculus ending in a club.
  for (let side = -1; side <= 1; side += 2) {
    const base = V(hc[0] + hr[0] * 0.4, hc[1] + hr[1] * 0.7, side * hr[2] * 0.4);
    const elbow = V(base.x + 0.5, base.y + 1.8, side * (hr[2] * 0.4 + 0.7));
    const tip = V(base.x + 2.6, base.y + 1.0, side * (hr[2] * 0.4 + 1.5));
    parts.push(strut(base, elbow, 0.2, 0.72));
    parts.push(strut(elbow, tip, 0.17, 0.66));
    parts.push(ellipsoid([tip.x, tip.y, tip.z], [0.42, 0.24, 0.24], 0.6, [4, 3]));
  }
  // Mandibles: a broad base hooking inward to a dark toothed tip.
  for (let side = -1; side <= 1; side += 2) {
    const m = P.mandible;
    const a = V(hc[0] + hr[0] * 0.8, hc[1] - hr[1] * 0.4, side * hr[2] * 0.42);
    const b = V(hc[0] + hr[0] + 0.7 * m, hc[1] - hr[1] * 0.55, side * 0.55 * m);
    const c = V(hc[0] + hr[0] + 1.1 * m, hc[1] - hr[1] * 0.62, side * 0.08 * m);
    parts.push(strut(a, b, 0.26 * m, 0.82));
    parts.push(strut(b, c, 0.18 * m, 0.45));
  }
  if (P.scars) {
    for (let side = -1; side <= 1; side += 2) {
      parts.push(ellipsoid([tc[0] - 0.4, tc[1] + tr[1] * 0.9, side * 0.55], [0.45, 0.18, 0.3], 3.2, [4, 2]));
    }
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeVertexNormals();
  return g;
}

const cache = new Map();
// Geometry for a body plan and walk frame (frame -1 = standing still).
export function antGeometry(plan, frame) {
  const key = plan + ':' + frame;
  if (!cache.has(key)) cache.set(key, buildAnt(plan, frame));
  return cache.get(key);
}

export function planFor(caste) {
  return caste === 'soldier' || caste === 'venom' ? 'soldier' : 'worker';
}
