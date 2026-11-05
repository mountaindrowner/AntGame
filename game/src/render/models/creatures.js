// Low-poly creature geometry, baked once. Each body plan is merged into one
// BufferGeometry per walk frame, so a whole colony draws as a handful of
// instanced meshes. Vertex colours carry shading (legs darker, wing scars
// pale); the per-ant tint comes from the instance colour.
//
// Local frame: +X forward, +Y up, +Z to the ant's left. Origin at the body
// centre; feet rest at y = -FOOT.
import * as THREE from './lowpoly.js'; // build 64: Lean, capped segments
import { V, paint as paintC, bake } from './kit.js';

export const FOOT = 2.8;
export const WALK_FRAMES = 3;


// Build 64, the Lean ant (Mark picked it in the ant lab): a few low-segment parts, smooth (Gouraud) shading,
// one tone per part, three-sided legs. About 200 triangles a frame, down from about 840. The grey vertex
// colours are multiplied by each ant's tint, so the castes keep their colours.
// Grey per vertex, from its position and normal: a lit back, a darker belly.
function shadeV(geo, fn) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) c.fill(fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)), i * 3, i * 3 + 3);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
const BODY = (x, y, z, nx, ny) => 0.95 + 0.35 * Math.max(0, ny) - 0.3 * Math.max(0, -ny);
const LIMB = (x, y, z, nx, ny) => 0.62 + 0.15 * Math.max(0, ny);
const flat = (k) => () => k;
function ell(c, r, w, h, fn = BODY) { return shadeV(new THREE.SphereGeometry(1, w, h).scale(r[0], r[1], r[2]).translate(c[0], c[1], c[2]), typeof fn === 'function' ? fn : flat(fn)); }
// A three-sided rod from a to b (radius r0 at a, r1 at b): the PS1 way to draw a leg.
function rod(a, b, r0, r1, fn = LIMB) {
  const len = a.distanceTo(b), g = new THREE.CylinderGeometry(r1, r0, len, 3, 1, true).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z);
  return shadeV(g, typeof fn === 'function' ? fn : flat(fn));
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
    legR: 0.3, mandible: 0.9, scars: true, plates: 5,
  },
};

function buildAnt(planName, frame) {
  const P = PLANS[planName], parts = [];
  const [ac, ar] = P.abdomen, [tc, tr] = P.thorax, [hc, hr] = P.head, [pc, pr] = P.petiole;
  // Gaster. The venom ant's is long and tapering, darker down the back, with a sting.
  if (P.viper) {
    const g = new THREE.SphereGeometry(1, 7, 4).scale(ar[0], ar[1], ar[2]);
    { const q = g.attributes.position; for (let k = 0; k < q.count; k++) { const x = q.getX(k), t = 1 - Math.max(0, -x / ar[0]) * 0.55; q.setY(k, q.getY(k) * t); q.setZ(k, q.getZ(k) * t); } }
    g.translate(ac[0], ac[1], ac[2]);
    parts.push(shadeV(g, (x, y, z, nx, ny) => (ny > 0.75 ? 0.45 : BODY(x, y, z, nx, ny))));
    parts.push(rod(V(ac[0] - ar[0] + 0.3, ac[1], 0), V(ac[0] - ar[0] - 0.9, ac[1] - 0.15, 0), 0.32, 0.05, 0.4));
  } else parts.push(ell(ac, ar, 6, 4));
  parts.push(ell(pc, pr, 4, 2), ell(tc, tr, 5, 3));
  // Head. The venom ant's is a flat wedge, wider at the back.
  if (P.viper) {
    const g = new THREE.SphereGeometry(1, 6, 4).scale(hr[0], hr[1], hr[2]);
    { const q = g.attributes.position; for (let k = 0; k < q.count; k++) { const x = q.getX(k); q.setZ(k, q.getZ(k) * (1 + (-x / hr[0]) * 0.45)); q.setY(k, q.getY(k) * (1 - Math.max(0, x / hr[0]) * 0.3)); } }
    parts.push(shadeV(g.translate(hc[0], hc[1], hc[2]), BODY));
  } else parts.push(ell(hc, hr, 6, 4));
  // The queen's wing scars: two pale patches on her back.
  if (P.scars) for (const side of [-1, 1]) parts.push(ell([tc[0] - 0.4, tc[1] + tr[1] * 0.9, side * 0.55], [0.45, 0.16, 0.3], 4, 2, 2.2));
  // Legs: femur up to the knee, tibia down to the foot. Tripod gait; frame -1 stands still.
  const phase = (frame / WALK_FRAMES) * Math.PI * 2;
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const ph = phase + ((i + (side > 0 ? 1 : 0)) % 2 ? Math.PI : 0);
    const swing = frame < 0 ? 0 : Math.sin(ph) * 0.42, lift = frame < 0 ? 0 : Math.max(0, Math.cos(ph)) * 0.6;
    const hip = V(P.hips[i], P.hipY, side * P.hipZ), reach = P.reach[i] + swing * 2.2, spread = P.spread[i];
    const knee = V(hip.x + reach * 0.45, hip.y + 1.6, side * (P.hipZ + spread * 0.55)), foot = V(hip.x + reach, -FOOT + lift, side * (P.hipZ + spread));
    parts.push(rod(hip, knee, P.legR, P.legR * 0.8), rod(knee, foot, P.legR * 0.8, P.legR * 0.35));
  }
  // Antennae: the scape, the elbow, the funiculus.
  for (const side of [-1, 1]) {
    const base = V(hc[0] + hr[0] * 0.4, hc[1] + hr[1] * 0.7, side * hr[2] * 0.4), elbow = V(base.x + 0.5, base.y + 1.8, side * (hr[2] * 0.4 + 0.7)), tip = V(base.x + 2.6, base.y + 1.0, side * (hr[2] * 0.4 + 1.5));
    parts.push(rod(base, elbow, 0.16, 0.13), rod(elbow, tip, 0.13, 0.08));
  }
  // Mandibles, bigger on soldiers; the venom ant also has pale fangs.
  for (const side of [-1, 1]) {
    const m = P.mandible, a = V(hc[0] + hr[0] * 0.8, hc[1] - hr[1] * 0.4, side * hr[2] * 0.42), c = V(hc[0] + hr[0] + 1.1 * m, hc[1] - hr[1] * 0.6, side * 0.1 * m);
    parts.push(rod(a, c, (P.viper ? 0.18 : 0.24) * m, 0.05, 0.55));
    if (P.viper) { const f0 = V(hc[0] + hr[0] * 0.85, hc[1] - hr[1] * 0.5, side * 0.35); parts.push(rod(f0, V(f0.x + 0.3, f0.y - 1.1, side * 0.25), 0.12, 0.03, 1.6)); }
  }
  return bake(parts);
}

const cache = new Map();
// Geometry for a body plan and walk frame (frame -1 = standing still).
export function antGeometry(plan, frame) {
  const key = plan + ':' + frame;
  if (!cache.has(key)) cache.set(key, buildAnt(plan, frame));
  return cache.get(key);
}

export function planFor(caste) {
  return caste === 'venom' ? 'venom' : caste === 'soldier' || caste === 'major' || caste === 'supermajor' ? 'soldier' : 'worker';
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
// A band round a body part: a ring about the X axis, ry by rz across.
const band = (x, y, ry, rz, w, color) => paintC(new THREE.CylinderGeometry(1, 1, w, 6, 1, true).rotateZ(Math.PI / 2).scale(1, ry, rz).translate(x, y, 0), color);
const box = (w, h, d, x, y, z, color, ry = 0) => paintC(new THREE.BoxGeometry(w, h, d).rotateY(ry).translate(x, y, z), color);
const ball = (r, x, y, z, color, s = [1, 1, 1]) => paintC(new THREE.SphereGeometry(r, 5, 3).scale(...s).translate(x, y, z), color);
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
    parts.push(paintC(new THREE.SphereGeometry(1, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(hr[0] * 1.05, hr[1] * 0.95, hr[2] * 1.1).translate(hc[0] - 0.1, hy, 0), (px, py, pz) => (Math.abs(pz) < 0.18 && py > hy + 0.5 ? '#f0b020' : '#ffd23a')));
    parts.push(paintC(new THREE.CylinderGeometry(hr[2] * 1.3, hr[2] * 1.3, 0.14, 12).scale(hr[0] / hr[2] * 1.05, 1, 1).translate(hc[0] + 0.15, hy, 0), '#f0b020'));
  }
  if (kind === 'apron') {
    const [c, r] = W.thorax, x = c[0] + r[0] * 0.2;
    parts.push(band(x, c[1] + 0.05, r[1] + 0.28, r[2] + 0.3, 1.9, '#62c84c'));
    // A little woven basket on its back, for what it gathers. (Build 65: lighter, the lid and red ball gone.)
    const [ac, ar] = W.abdomen, bx = ac[0] + ar[0] * 0.55, by = ac[1] + ar[1] * 0.85;
    parts.push(paintC(new THREE.CylinderGeometry(0.85, 0.65, 0.75, 5, 1, true).translate(bx, by + 0.3, 0), (px, py, pz) => ((Math.floor((Math.atan2(pz, px - bx) + 4) * 2.5) + Math.floor(py * 4)) % 2 ? '#c8a060' : '#a87a40')));
    // Shoulder straps crossing on the back.
    for (const s of [-1, 1]) parts.push(box(1.7, 0.14, 0.26, x + 0.1, c[1] + r[1] + 0.2, 0, '#e8e0c8', s * 0.5));
    // The bib hanging below the chest, a pale pocket on it.
    parts.push(paintC(new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(r[0] * 0.9, 0.9, r[2] + 0.18).translate(x + 0.2, c[1] - r[1] * 0.35, 0), (px, py) => (py < c[1] - r[1] - 0.25 && Math.abs(px - x - 0.4) < 0.45 ? '#e8e0c8' : '#4a8a3a')));
    // A bow tied on the back.
    for (const s of [-1, 1]) parts.push(ball(0.5, x - 0.9, c[1] + r[1] + 0.25, s * 0.55, '#fff4dc', [1, 0.45, 1.25]));
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
    // Layer 3: her gaster swollen with eggs, the pale skin showing between
    // its five plates, and the stubs where she tore off her wings.
    const [ac, ar] = Q.abdomen;
    for (let k = 1; k < 5; k++) {
      const x = ac[0] - ar[0] + (2 * ar[0] * k) / 5, f = Math.sqrt(Math.max(0, 1 - ((x - ac[0]) / ar[0]) ** 2));
      parts.push(band(x, ac[1], ar[1] * f + 0.04, ar[2] * f + 0.04, 0.3, '#d8c49c'));
    }
    const [tc, tr] = Q.thorax;
    for (const s of [-1, 1]) for (const [dx, len] of [[0.5, 1.5], [-0.5, 1.0]]) {
      const g = new THREE.BufferGeometry().setFromPoints([V(tc[0] + dx + 0.35, 0, 0), V(tc[0] + dx - 0.35, 0, 0), V(tc[0] + dx - len, 0, s * 0.35), V(tc[0] + dx + 0.35, 0, 0), V(tc[0] + dx - len, 0, s * 0.35), V(tc[0] + dx - 0.35, 0, 0)]);
      g.translate(0, tc[1] + tr[1] * 0.95, s * tr[2] * 0.55);
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(12), 2)); g.computeVertexNormals();
      parts.push(paintC(g, '#e2d6bc'));
    }
    const [c, r] = Q.head, y = c[1] + r[1] * 0.75, R = 1.15;
    parts.push(paintC(new THREE.CylinderGeometry(R, R * 0.9, 0.6, 10, 1, true).translate(c[0] - 0.1, y + 0.3, 0), '#ffcc2a'));
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; parts.push(paintC(new THREE.ConeGeometry(0.24, 0.7, 4).translate(c[0] - 0.1 + Math.cos(a) * R, y + 0.95, Math.sin(a) * R), '#ffd84a')); parts.push(ball(0.15, c[0] - 0.1 + Math.cos(a + 0.6) * R * 1.03, y + 0.3, Math.sin(a + 0.6) * R * 1.03, '#e01838')); }
  }
  // Build 23's kinds.
  if (kind === 'straw') {
    // Gardener: a wide straw sun hat, and a green leaf-pattern sash.
    const [c, r] = W.head, y = c[1] + r[1] * 0.75;
    parts.push(paintC(new THREE.CylinderGeometry(2.2, 2.2, 0.14, 14).translate(c[0] - 0.1, y + 0.1, 0), (px, py, pz) => (Math.floor(Math.hypot(px - c[0], pz) * 3) % 2 ? '#e8cc78' : '#d8b860')));
    parts.push(paintC(new THREE.CylinderGeometry(0.9, 1.15, 0.8, 10).translate(c[0] - 0.1, y + 0.5, 0), '#e0c470'), paintC(new THREE.CylinderGeometry(1.17, 1.17, 0.2, 10).translate(c[0] - 0.1, y + 0.25, 0), '#4a8a2a'));
    const [tc, tr] = W.thorax;
    parts.push(band(tc[0] + tr[0] * 0.1, tc[1], tr[1] + 0.2, tr[2] + 0.22, 0.7, '#5aa034'));
  }
  if (kind === 'stetson') {
    // Rancher: a brown cowboy hat with a dented crown, a red neckerchief.
    const [c, r] = W.head, y = c[1] + r[1] * 0.8;
    const brim = new THREE.CylinderGeometry(2, 2, 0.14, 14), bp = brim.attributes.position;
    for (let i = 0; i < bp.count; i++) { const z = bp.getZ(i); bp.setY(i, bp.getY(i) + Math.max(0, Math.abs(z) - 1) * 0.5); }
    parts.push(paintC(brim.translate(c[0] - 0.1, y + 0.05, 0), '#8a5a2e'));
    parts.push(paintC(new THREE.CylinderGeometry(0.85, 1.05, 1.1, 10).translate(c[0] - 0.1, y + 0.6, 0), (px, py) => (py > y + 1 ? '#7a4e26' : '#8a5a2e')), paintC(new THREE.CylinderGeometry(1.07, 1.07, 0.18, 10).translate(c[0] - 0.1, y + 0.2, 0), '#3a2414'));
    parts.push(band(c[0] - r[0] * 0.9, c[1] - 0.1, r[1] * 0.75, r[2] * 0.8, 0.5, '#d83a2a'));
  }
  if (kind === 'medic') {
    // Medic: a white armband with a red cross on the thorax, and a satchel on the gaster.
    const [tc, tr] = W.thorax;
    parts.push(band(tc[0] + tr[0] * 0.2, tc[1], tr[1] + 0.15, tr[2] + 0.18, 0.9, '#f4f2ee'));
    for (const sd of [-1, 1]) { parts.push(box(0.5, 0.16, 0.12, tc[0] + tr[0] * 0.2, tc[1] + 0.1, sd * (tr[2] + 0.22), '#e02020'), box(0.16, 0.5, 0.12, tc[0] + tr[0] * 0.2, tc[1] + 0.1, sd * (tr[2] + 0.22), '#e02020')); }
    const [ac, ar] = W.abdomen;
    parts.push(box(1.3, 0.9, 0.9, ac[0] + ar[0] * 0.3, ac[1] + ar[1] * 0.9, 0, '#f0ece2'), box(0.5, 0.14, 0.92, ac[0] + ar[0] * 0.3, ac[1] + ar[1] * 0.9 + 0.2, 0, '#e02020'), box(0.14, 0.5, 0.92, ac[0] + ar[0] * 0.3, ac[1] + ar[1] * 0.9 + 0.2, 0, '#e02020'));
  }
  if (kind === 'sack') {
    // Harvester: a bulging burlap sack of seed on its back, tied at the neck.
    const [ac, ar] = W.abdomen, x = ac[0] + ar[0] * 0.35, y = ac[1] + ar[1] + 0.6;
    parts.push(paintC(new THREE.SphereGeometry(1.2, 6, 4).scale(1.2, 0.9, 1).translate(x, y, 0), (px, py, pz) => ((Math.floor(px * 4) + Math.floor(pz * 4)) % 2 ? '#b8965a' : '#a8864a')));
    parts.push(paintC(new THREE.CylinderGeometry(0.3, 0.5, 0.5, 6).translate(x + 0.6, y + 0.9, 0), '#a8864a'), paintC(new THREE.TorusGeometry(0.34, 0.08, 3, 6).rotateX(Math.PI / 2).translate(x + 0.6, y + 0.8, 0), '#6a4a2a'));
    for (let k = 0; k < 3; k++) parts.push(ball(0.22, x + 0.5 + k * 0.15, y + 1.2, (k - 1) * 0.2, '#e8c45a', [1.4, 0.7, 0.8]));
  }
  // Build 24's kinds.
  if (kind === 'fuse') {
    // Exploder: a gaster banded red and yellow like a warning, a fuse on its tail.
    const [ac, ar] = W.abdomen;
    for (let k = 0; k < 3; k++) { const x = ac[0] - ar[0] * 0.6 + k * ar[0] * 0.6, f = Math.sqrt(Math.max(0, 1 - ((x - ac[0]) / ar[0]) ** 2)); parts.push(band(x, ac[1], ar[1] * f + 0.08, ar[2] * f + 0.08, 0.5, k % 2 ? '#f0c020' : '#d8301e')); }
    parts.push(paintC(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 4).rotateZ(0.9).translate(ac[0] - ar[0] - 0.3, ac[1] + 0.6, 0), '#e8e0c8'), ball(0.22, ac[0] - ar[0] - 0.75, ac[1] + 1.05, 0, '#ffb020'));
  }
  if (kind === 'honey') {
    // Replete: its gaster swollen into an amber globe of stored food.
    const [ac, ar] = W.abdomen;
    parts.push(paintC(new THREE.SphereGeometry(1, 12, 8).scale(ar[0] * 1.15, ar[1] * 1.5, ar[2] * 1.5).translate(ac[0] - 0.3, ac[1] + 0.3, 0), (px, py, pz) => (py > ac[1] + ar[1] && pz > 0 ? '#ffe098' : Math.abs(((px - ac[0]) * 1.4 % 1)) < 0.12 ? '#7a4a1e' : '#e8a030')));
  }
  if (kind === 'hood') {
    // Undertaker: a dark hood over the head and a grey shroud on the back.
    const [c, r] = W.head;
    parts.push(paintC(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(r[0] * 1.2, r[1] * 1.15, r[2] * 1.2).translate(c[0] - 0.3, c[1] + 0.1, 0), '#2e2e34'));
    const [tc, tr] = W.thorax;
    parts.push(paintC(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(tr[0] * 1.5, tr[1] * 0.9, tr[2] * 1.3).translate(tc[0] - 0.4, tc[1] + tr[1] * 0.4, 0), '#5a5a62'));
  }
  return bake(parts);
}
const OUTFIT_OF = { builder: 'belt', forager: 'apron', nurse: 'cap', soldier: 'helmet', venom: 'bandana', queen: 'crown', gardener: 'straw', rancher: 'stetson', medic: 'medic', harvester: 'sack', major: 'helmet', supermajor: 'helmet', exploder: 'fuse', replete: 'honey', undertaker: 'hood' };
const outfits = new Map();
// The outfit a caste wears (null for none), baked once.
export function outfitGeometry(caste) {
  const k = OUTFIT_OF[caste]; if (!k) return null;
  if (!outfits.has(k)) outfits.set(k, outfit(k));
  return outfits.get(k);
}
