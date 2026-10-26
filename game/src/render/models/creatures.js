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
  parts.push(ellipsoid(...P.abdomen, 1, [7, 5]));
  parts.push(ellipsoid(...P.petiole, 0.9, [4, 3]));
  parts.push(ellipsoid(...P.thorax, 1, [6, 4]));
  parts.push(ellipsoid(...P.head, 1.05, [6, 4]));
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
      const knee = V(hip.x + reach * 0.45, hip.y + 1.6, side * (P.hipZ + spread * 0.55));
      const foot = V(hip.x + reach, -FOOT + lift, side * (P.hipZ + spread));
      parts.push(strut(hip, knee, P.legR, 0.7));
      parts.push(strut(knee, foot, P.legR * 0.8, 0.7));
    }
  }
  // Antennae: elbowed, sweeping forward.
  const h = P.head;
  for (let side = -1; side <= 1; side += 2) {
    const base = V(h[0][0] + h[1][0] * 0.4, h[0][1] + h[1][1] * 0.7, side * h[1][2] * 0.4);
    const elbow = V(base.x + 0.5, base.y + 1.8, side * (h[1][2] * 0.4 + 0.7));
    const tip = V(base.x + 2.6, base.y + 1.0, side * (h[1][2] * 0.4 + 1.5));
    parts.push(strut(base, elbow, 0.2, 0.7));
    parts.push(strut(elbow, tip, 0.18, 0.7));
  }
  // Mandibles.
  for (let side = -1; side <= 1; side += 2) {
    const m = P.mandible;
    const a = V(h[0][0] + h[1][0] * 0.8, h[0][1] - h[1][1] * 0.4, side * h[1][2] * 0.35);
    const b = V(h[0][0] + h[1][0] + 0.9 * m, h[0][1] - h[1][1] * 0.6, side * 0.25 * m);
    parts.push(strut(a, b, 0.24 * m, 0.8));
  }
  if (P.scars) {
    for (let side = -1; side <= 1; side += 2) {
      const t = P.thorax;
      parts.push(ellipsoid([t[0][0] - 0.4, t[0][1] + t[1][1] * 0.9, side * 0.55], [0.45, 0.18, 0.3], 3.2, [4, 2]));
    }
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
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
