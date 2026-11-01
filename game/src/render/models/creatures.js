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
  // Build 20.3 (Mark: "more slender and viper-esque"): a long, slim gaster
  // with a diamond-backed pattern ending in a sting, a long thin waist, a
  // flat, wedge-shaped head wider at the back, fangs, long fine legs.
  venom: {
    abdomen: [[-4.7, 0.5, 0], [3.5, 1.3, 1.3]],
    petiole: [[-0.95, 0.1, 0], [0.8, 0.42, 0.42]],
    thorax: [[0.65, 0.15, 0], [1.75, 0.78, 0.8]],
    head: [[3.8, 0.35, 0], [1.75, 0.95, 1.3]],
    hips: [1.5, 0.7, -0.2], hipY: -0.35, hipZ: 0.55,
    reach: [3.0, 0.3, -3.2], spread: [3.0, 3.5, 3.3],
    legR: 0.26, mandible: 1.3, viper: true,
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
  if (P.viper) {
    // A slim, tapering gaster with a chain of dark diamonds down its back,
    // pale-edged, and a sting at the tip.
    const g = new THREE.SphereGeometry(1, 12, 7); g.scale(ar[0], ar[1], ar[2]);
    { const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), t = 1 - Math.max(0, -x / ar[0]) * 0.55; p.setY(k, p.getY(k) * t); p.setZ(k, p.getZ(k) * t); } }
    g.translate(ac[0], ac[1], ac[2]);
    parts.push(shadeFaces(g, (x, y, z) => {
      if (y < ac[1] - ar[1] * 0.2) return 0.62;
      const u = (x - (ac[0] - ar[0])) / (2 * ar[0]), d = Math.abs(((u * 4.5) % 1) - 0.5) * 2 + Math.abs(z) / (ar[2] * 0.55);
      return d < 0.75 ? 0.3 : d < 1.0 ? 1.55 : 1.0;
    }));
    const tip = V(ac[0] - ar[0] - 0.9, ac[1] - 0.15, 0);
    parts.push(strut(V(ac[0] - ar[0] + 0.3, ac[1], 0), tip, 0.32, 0.4));
  } else parts.push(shell(ac, ar, [10, 7], (x, y, z) => {
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
  // The venom ant's is a flat wedge, wider at the back, with a dark crown stripe.
  if (P.viper) {
    const g = new THREE.SphereGeometry(1, 10, 6); g.scale(hr[0], hr[1], hr[2]);
    { const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), w = 1 + (-x / hr[0]) * 0.45; p.setZ(k, p.getZ(k) * w); p.setY(k, p.getY(k) * (1 - Math.max(0, x / hr[0]) * 0.3)); } }
    g.translate(hc[0], hc[1], hc[2]);
    parts.push(shadeFaces(g, (x, y, z) => (y > hc[1] + hr[1] * 0.55 && Math.abs(z) < hr[2] * 0.22 ? 0.35 : y > hc[1] + hr[1] * 0.6 ? 1.35 : y < hc[1] - hr[1] * 0.4 ? 0.7 : 1.05)));
  } else parts.push(shell(hc, hr, [9, 6], (x, y, z) => (y > hc[1] + hr[1] * 0.7 ? 1.3 : x > hc[0] + hr[0] * 0.75 ? 0.78 : y < hc[1] - hr[1] * 0.5 ? 0.75 : 1.05)));
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
    parts.push(strut(a, b, (P.viper ? 0.18 : 0.26) * m, 0.82));
    parts.push(strut(b, c, (P.viper ? 0.13 : 0.18) * m, 0.45));
    // Fangs: two pale curved hooks down from the mouth.
    if (P.viper) { const f0 = V(hc[0] + hr[0] * 0.85, hc[1] - hr[1] * 0.5, side * 0.35), f1 = V(f0.x + 0.45, f0.y - 0.7, side * 0.3), f2 = V(f0.x + 0.2, f0.y - 1.15, side * 0.22); parts.push(strut(f0, f1, 0.13, 1.6), strut(f1, f2, 0.09, 1.7)); }
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
  return caste === 'venom' ? 'venom' : caste === 'soldier' ? 'soldier' : 'worker';
}

// ---------- outfits (build 20.2) ----------
// Mark: "something that differentiates their styles or their kinds". Each
// kind wears something of its own, in true colours (not the caste tint),
// drawn with the same transform as the body:
//   builder: a leather work belt round the gaster, buckle, pouches, a hammer
//   forager: a green garden apron round the thorax, a bow on the back
//   nurse: a white nurse's cap with a red cross
//   soldier: an olive army helmet with a brim and chin strap
//   venom: a black bandana with a white skull, its knot trailing
//   queen: a gold crown with red jewels
const col2 = new THREE.Color();
function paintC(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    col2.set(typeof fn === 'function' ? fn(x, y, z) : fn); for (let k = 0; k < 3; k++) c.set([col2.r, col2.g, col2.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
// A band round a body part: a ring about the X axis, ry by rz across.
const band = (x, y, ry, rz, w, color) => paintC(new THREE.CylinderGeometry(1, 1, w, 14, 1, true).rotateZ(Math.PI / 2).scale(1, ry, rz).translate(x, y, 0), color);
const box = (w, h, d, x, y, z, color, ry = 0) => paintC(new THREE.BoxGeometry(w, h, d).rotateY(ry).translate(x, y, z), color);
const ball = (r, x, y, z, color, s = [1, 1, 1]) => paintC(new THREE.SphereGeometry(r, 6, 4).scale(...s).translate(x, y, z), color);
function outfit(kind) {
  const W = PLANS.worker, S = PLANS.soldier, Q = PLANS.queen, parts = [];
  if (kind === 'belt') {
    const [c, r] = W.abdomen, x = c[0] + r[0] * 0.45, k = Math.sqrt(1 - 0.2), ry = r[1] * k + 0.12, rz = r[2] * k + 0.12;
    parts.push(band(x, c[1], ry, rz, 0.9, '#b8742c'));
    parts.push(box(0.8, 0.26, 0.95, x, c[1] + ry + 0.04, 0, '#ffd23a'));
    parts.push(box(0.42, 0.16, 0.5, x, c[1] + ry + 0.15, 0, '#b8742c'));
    for (const s of [-1, 1]) parts.push(box(0.95, 0.9, 0.42, x, c[1] + 0.15, s * (rz + 0.16), '#d89a4a'));
    // A hammer hanging on the left.
    parts.push(box(0.18, 1.5, 0.18, x - 0.5, c[1] - 0.1, rz + 0.5, '#a0703a'), box(0.8, 0.32, 0.32, x - 0.5, c[1] + 0.65, rz + 0.5, '#c8ced6'));
    // And a yellow hard hat, so builders read from above.
    const [hc, hr] = W.head, hy = hc[1] + hr[1] * 0.45;
    parts.push(paintC(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(hr[0] * 1.05, hr[1] * 0.95, hr[2] * 1.1).translate(hc[0] - 0.1, hy, 0), (px, py, pz) => (Math.abs(pz) < 0.18 && py > hy + 0.5 ? '#f0b020' : '#ffd23a')));
    parts.push(paintC(new THREE.CylinderGeometry(hr[2] * 1.3, hr[2] * 1.3, 0.14, 12).scale(hr[0] / hr[2] * 1.05, 1, 1).translate(hc[0] + 0.15, hy, 0), '#f0b020'));
  }
  if (kind === 'apron') {
    const [c, r] = W.thorax, x = c[0] + r[0] * 0.2;
    parts.push(band(x, c[1] + 0.05, r[1] + 0.28, r[2] + 0.3, 1.9, '#62c84c'));
    // A little woven basket on its back, for what it gathers.
    const [ac, ar] = W.abdomen, bx = ac[0] + ar[0] * 0.55, by = ac[1] + ar[1] * 0.85;
    parts.push(paintC(new THREE.CylinderGeometry(0.85, 0.65, 0.75, 8, 2, true).translate(bx, by + 0.3, 0), (px, py, pz) => ((Math.floor((Math.atan2(pz, px - bx) + 4) * 2.5) + Math.floor(py * 4)) % 2 ? '#c8a060' : '#a87a40')));
    parts.push(paintC(new THREE.CylinderGeometry(0.66, 0.66, 0.06, 8).translate(bx, by - 0.04, 0), '#8a6030'));
    parts.push(ball(0.35, bx, by + 0.55, 0, '#d84040'));
    // Shoulder straps crossing on the back.
    for (const s of [-1, 1]) parts.push(box(1.7, 0.14, 0.26, x + 0.1, c[1] + r[1] + 0.2, 0, '#e8e0c8', s * 0.5));
    // The bib hanging below the chest, a pale pocket on it.
    parts.push(paintC(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(r[0] * 0.9, 0.9, r[2] + 0.18).translate(x + 0.2, c[1] - r[1] * 0.35, 0), (px, py) => (py < c[1] - r[1] - 0.25 && Math.abs(px - x - 0.4) < 0.45 ? '#e8e0c8' : '#4a8a3a')));
    // A bow tied on the back.
    for (const s of [-1, 1]) parts.push(ball(0.5, x - 0.9, c[1] + r[1] + 0.25, s * 0.55, '#fff4dc', [1, 0.45, 1.25]));
    parts.push(ball(0.24, x - 0.9, c[1] + r[1] + 0.3, 0, '#f0e2c0'));
  }
  if (kind === 'cap') {
    const [c, r] = W.head, y = c[1] + r[1] * 0.8;
    parts.push(paintC(new THREE.CylinderGeometry(1.1, 1.45, 1.0, 8).scale(1.1, 1, 1).translate(c[0] - 0.1, y + 0.35, 0), '#ffffff'));
    parts.push(box(0.3, 0.08, 1.0, c[0] - 0.1, y + 0.88, 0, '#e02020'), box(1.0, 0.08, 0.3, c[0] - 0.1, y + 0.88, 0, '#e02020'));
  }
  if (kind === 'helmet') {
    const [c, r] = S.head, y = c[1] + r[1] * 0.35;
    parts.push(paintC(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(r[0] * 1.08, r[1] * 0.95, r[2] * 1.12).translate(c[0] - 0.15, y, 0), (px, py) => (py > y + r[1] * 0.8 ? '#5c6a34' : '#4e5a2c')));
    parts.push(paintC(new THREE.CylinderGeometry(r[2] * 1.32, r[2] * 1.32, 0.16, 14).scale(r[0] / r[2], 1, 1).translate(c[0] - 0.15, y, 0), '#3e4822'));
    for (const s of [-1, 1]) parts.push(box(0.18, r[1] * 0.9, 0.12, c[0] + 0.3, y - r[1] * 0.45, s * r[2] * 1.02, '#a8946a'));
  }
  if (kind === 'bandana') {
    const [c, r] = PLANS.venom.head, x = c[0] - 0.35;
    parts.push(band(x, c[1] + 0.25, r[1] * 0.98 + 0.1, r[2] * 0.98 + 0.1, 0.9, '#181818'));
    parts.push(ball(0.55, x + 0.2, c[1] + r[1] + 0.32, 0, '#f6f6f0', [1, 0.55, 1]));
    for (const s of [-1, 1]) parts.push(ball(0.15, x + 0.55, c[1] + r[1] + 0.48, s * 0.2, '#181818'));
    for (const s of [-1, 1]) parts.push(box(1.0, 0.08, 0.32, x - r[0] - 0.4, c[1] + 0.35, s * 0.25, '#181818', s * 0.35));
  }
  if (kind === 'crown') {
    const [c, r] = Q.head, y = c[1] + r[1] * 0.75, R = 1.15;
    parts.push(paintC(new THREE.CylinderGeometry(R, R * 0.9, 0.6, 10, 1, true).translate(c[0] - 0.1, y + 0.3, 0), '#ffcc2a'));
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; parts.push(paintC(new THREE.ConeGeometry(0.24, 0.7, 4).translate(c[0] - 0.1 + Math.cos(a) * R, y + 0.95, Math.sin(a) * R), '#ffd84a')); parts.push(ball(0.15, c[0] - 0.1 + Math.cos(a + 0.6) * R * 1.03, y + 0.3, Math.sin(a + 0.6) * R * 1.03, '#e01838')); }
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeVertexNormals();
  return g;
}
const OUTFIT_OF = { builder: 'belt', forager: 'apron', nurse: 'cap', soldier: 'helmet', venom: 'bandana', queen: 'crown' };
const outfits = new Map();
// The outfit a caste wears (null for none), baked once.
export function outfitGeometry(caste) {
  const k = OUTFIT_OF[caste]; if (!k) return null;
  if (!outfits.has(k)) outfits.set(k, outfit(k));
  return outfits.get(k);
}
