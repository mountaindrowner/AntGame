// Things on the ground: each food type has its own recognisable shape and
// colours baked into its vertices (so it draws with a white instance tint),
// dew is a cluster of clear beads, and treats glint.
//
// Every geometry rests on y = 0 and spans roughly -1..1, scaled by `r`.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PROPS } from './props.js';
import { alateGeometry } from './bosses.js';
const ALATE = alateGeometry();

const col = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

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
const at = (g, x, y, z, sx = 1, sy = sx, sz = sx, ry = 0) => g.scale(sx, sy, sz).rotateY(ry).translate(x, y, z);
function bake(parts) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeVertexNormals();
  return g;
}
// Nudge vertices so shapes look torn or lumpy rather than machined.
function lumpy(g, amt, seed) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const h = Math.round(x * 40) * 17 + Math.round(y * 40) * 5 + Math.round(z * 40) * 3 + seed;
    p.setXYZ(i, x + (hash(h) - 0.5) * amt, y + (hash(h + 1) - 0.5) * amt, z + (hash(h + 2) - 0.5) * amt);
  }
  return g;
}

// Bread crumb: golden crust outside, pale torn crumb on the broken faces.
function breadCrumb() {
  // Build 21's model pass: a torn chunk of bread. A rounded golden-brown crust
  // on two faces, the torn face pale, open crumb with dark pores.
  const g = lumpy(new THREE.DodecahedronGeometry(1, 1).scale(1.05, 0.72, 0.85), 0.16, 3);
  g.computeVertexNormals();
  const n = g.attributes.normal;
  return bake([at(paint(g, (x, y, z, f) => {
    const nx = n.getX(f * 3), ny = n.getY(f * 3);
    if (nx < -0.35 || ny > 0.6) return hash(f) < 0.25 ? '#8a5020' : hash(f + 3) < 0.5 ? '#b0702c' : '#c4843a';
    return hash(f) < 0.18 ? '#c8b080' : hash(f + 7) < 0.4 ? '#efe0b8' : '#f8ecca';
  }), 0, 0.62, 0)]);
}

// Sunflower seed: a striped teardrop.
function seed() {
  // A sunflower seed: a plump, pointed teardrop with black and cream stripes
  // running its length, a pale tip.
  const g = new THREE.SphereGeometry(1, 10, 7);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); const k = 1 - Math.max(0, x) * 0.62; p.setXYZ(i, x * 1.7, p.getY(i) * 0.52 * k, p.getZ(i) * 0.88 * k); }
  return bake([at(paint(g, (x, y, z) => { if (x > 1.35) return '#d8d0bc'; const a = Math.atan2(z, y) + Math.PI, s = (a / (Math.PI / 4)) % 1; return s < 0.18 ? '#f2ecd8' : s < 0.26 ? '#8a8478' : '#1e1c1a'; }), 0, 0.5, 0)]);
}

// Raspberry: a dome of red beads under a green cap.
function berry() {
  const parts = [];
  let k = 0;
  for (let ring = 0; ring < 3; ring++) {
    const n = [7, 5, 1][ring], rr = [0.75, 0.45, 0][ring], y = [0.45, 0.95, 1.25][ring];
    for (let i = 0; i < n; i++, k++) {
      const a = (i / n) * Math.PI * 2 + ring;
      parts.push(at(paint(new THREE.SphereGeometry(1, 5, 4), hash(k) < 0.5 ? '#b81e3a' : '#d63a52'), Math.cos(a) * rr, y, Math.sin(a) * rr, 0.42));
    }
  }
  for (let i = 0; i < 4; i++) parts.push(at(paint(new THREE.SphereGeometry(1, 5, 2), '#4f7a2e'), 0, 1.55, 0, 0.5, 0.08, 0.18, (i * Math.PI) / 4));
  return bake(parts);
}

// Popcorn: puffy cream lumps around a little golden hull.
function popcorn() {
  // Popped kernels: puffy white wings bursting from a yellow-gold core,
  // a scrap of brown hull.
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39, el = (hash(i + 1) - 0.3) * 1.4, r = i ? 0.55 + hash(i) * 0.15 : 0;
    const blobG = lumpy(new THREE.SphereGeometry(1, 7, 5).scale(1, 0.85, 0.9), 0.2, i + 3);
    parts.push(at(paint(blobG, (x, y, z, f) => (hash(f + i) < 0.12 ? '#efe2b8' : y < -0.5 ? '#f0e4c4' : '#fffaf0')), Math.cos(a) * r, 0.75 + Math.sin(el) * 0.4, Math.sin(a) * r, 0.42 + hash(i + 5) * 0.16));
  }
  parts.push(at(paint(new THREE.SphereGeometry(1, 6, 4), (x, y) => (y > 0.2 ? '#f2c040' : '#e0a028')), 0.15, 0.42, 0.05, 0.42, 0.3, 0.36));
  parts.push(at(paint(new THREE.SphereGeometry(1, 5, 3, 0, Math.PI), '#8a5a28'), -0.1, 0.32, 0.25, 0.26, 0.12, 0.2));
  return bake(parts);
}

// Apple core: a pinched waist of cream flesh, red skin top and bottom, a stem.
function apple() {
  const g = new THREE.CylinderGeometry(1, 1, 2.2, 9, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 0.45 + Math.abs(y) * 0.5; p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k); }
  const core = paint(g, (x, y) => (Math.abs(y) > 0.75 ? '#c8282e' : Math.abs(y) < 0.2 && Math.abs(x) < 0.2 ? '#4a2a14' : '#f2e2b0'));
  const parts = [at(core.rotateZ(Math.PI / 2), 0, 0.95, 0)];
  parts.push(at(paint(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 4).rotateZ(Math.PI / 2), '#5a3a1e'), 1.4, 1.0, 0));
  return bake(parts);
}

// A wedge of tomato: red skin, wet pink flesh, pale seeds.
function tomato() {
  // Build 21's model pass: half a tomato lying cut face up. Glossy red skin
  // below; on top, pink flesh round three jelly chambers full of pale seeds,
  // the walls between them and a pale core.
  const skin = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.75, 1);
  // A ring split into rings and spokes, so the chambers are rounded pockets, not pie slices.
  const top = new THREE.RingGeometry(0.001, 1, 28, 7).rotateX(-Math.PI / 2);
  const face = paint(top, (x, y, z, f) => {
    const d = Math.hypot(x, z), a = Math.atan2(z, x);
    if (d > 0.9) return '#c8302a';
    if (d < 0.18) return '#f0c8b0';
    // Three oval jelly chambers between the walls, seeds in them.
    const ca = ((a + Math.PI) % (Math.PI * 2 / 3)) / (Math.PI * 2 / 3) - 0.5, inC = Math.abs(ca) < 0.32 && d > 0.3 && d < 0.72;
    if (!inC) return '#e2483a';
    return hash(f * 7 + 3) < 0.22 ? '#efe0a0' : '#ee8a5c';
  });
  return bake([at(paint(skin, (x, y) => (y > -0.25 ? '#e0402e' : '#c42a20')), 0, 0.75, 0, 1.1, 1, 1.1), at(face, 0, 0.76, 0, 1.1, 1, 1.1)]);
}
// Aphids clustered on a leaf: little green bodies, one dewy drop of honeydew.
function aphids() {
  const parts = [at(paint(new THREE.SphereGeometry(1, 7, 3).scale(1.5, 0.12, 0.9), '#4a8a2e'), 0, 0.05, 0)];
  for (let i = 0; i < 9; i++) {
    const a = hash(i) * Math.PI * 2, r = 0.25 + hash(i + 5) * 0.8;
    parts.push(at(paint(new THREE.SphereGeometry(0.22, 6, 4).scale(1.3, 0.9, 1), hash(i + 2) < 0.3 ? '#b8e070' : '#8cc850'), Math.cos(a) * r, 0.25, Math.sin(a) * r * 0.6));
  }
  parts.push(at(paint(new THREE.SphereGeometry(0.28, 6, 4), '#f4e8a0'), 0.2, 0.35, 0.1));
  return bake(parts);
}
// A scrap of hot dog: a pink sausage stub in a torn bit of bun. Protein.
function hotdog() {
  // A bitten hot-dog end: a split bun, pale inside and golden outside, round a
  // browned sausage with grill marks, a zigzag of mustard on top.
  const parts = [];
  const sausage = new THREE.CylinderGeometry(0.4, 0.4, 1.9, 10).rotateZ(Math.PI / 2);
  parts.push(at(paint(sausage, (x, y, z) => (Math.abs(x) > 0.9 ? '#8a2e1c' : (Math.floor((x + 2) * 3.5) % 3 === 0 && y > 0.2) ? '#5a1c10' : '#c0482e')), 0.1, 0.7, 0));
  for (const s of [-1, 1]) {
    const bun = lumpy(new THREE.SphereGeometry(1, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.55, 0.42), 0.06, s + 9);
    parts.push(at(paint(bun.rotateX(s * 1.25), (x, y, z) => (Math.abs(z) < 0.15 && y > 0 ? '#f4e6c4' : y > 0.25 ? '#c88a3a' : '#d8a050')), -0.05, 0.5, s * 0.32));
  }
  for (let k = 0; k < 6; k++) parts.push(at(paint(new THREE.BoxGeometry(0.28, 0.06, 0.09).rotateY(k % 2 ? 0.7 : -0.7), '#f0c418'), -0.6 + k * 0.24, 1.1, 0));
  return bake(parts);
}
// A potato chip: a thin, wavy golden disc. A treat for a crew of four.
function chip() {
  // A ridged, curled potato chip: rippled gold, darker toasted edges and
  // blisters, flecks of salt.
  const g = new THREE.CircleGeometry(1.3, 20, 0, Math.PI * 2).rotateX(-Math.PI / 2);
  const gg = new THREE.PlaneGeometry(2.6, 2.4, 14, 12).rotateX(-Math.PI / 2), p = gg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x / 1.3, z / 1.2); const k = Math.min(1, 1 / Math.max(rr, 1e-3)); const ex = rr > 1 ? x * k : x, ez = rr > 1 ? z * k : z;
    p.setXYZ(i, ex, Math.sin(ex * 6) * 0.06 + ex * ex * 0.16 - ez * ez * 0.12 + 0.1, ez); }
  void g;
  const top = paint(gg, (x, y, z, f) => { const rr = Math.hypot(x / 1.3, z / 1.2); if (hash(f) < 0.04) return '#ffffff'; if (rr > 0.88) return '#b07020'; if (hash(f + 5) < 0.1) return '#d89a30'; return Math.sin(x * 6) > 0 ? '#f6d060' : '#ecc04c'; });
  const under = paint(gg.clone().translate(0, -0.05, 0).rotateX(Math.PI).translate(0, 0.0, 0), '#d8a840');
  return bake([at(top, 0, 0.3, 0), at(under, 0, 0.3, 0)]);
}

// An acorn on its side: a glossy brown nut in a scaly cap. A treat for a crew of four.
function acorn() {
  const parts = [at(paint(new THREE.SphereGeometry(0.75, 10, 7).scale(1.35, 1, 1), (x, y) => (x > 0.75 ? '#5a3a1a' : y > 0.35 ? '#b07a3e' : '#8a5a2a')), 0.15, 0.72, 0)];
  parts.push(at(paint(new THREE.SphereGeometry(0.82, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2), (x, y, z, f) => (hash(f) < 0.5 ? '#6a5236' : '#5a4430')), -0.55, 0.72, 0));
  parts.push(at(paint(new THREE.CylinderGeometry(0.06, 0.07, 0.35, 4).rotateZ(Math.PI / 2), '#4a3824'), -1.5, 0.72, 0));
  return bake(parts);
}
// A slug: a long, glistening grey-brown body with two eye stalks. Protein.
function slug() {
  const g = new THREE.SphereGeometry(1, 12, 6).scale(1.8, 0.42, 0.55).toNonIndexed(), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) * (1 - Math.max(0, -x - 0.6) * 0.35)); }
  const parts = [at(paint(g, (x, y, z, f) => (y < -0.15 ? '#a8a090' : hash(f) < 0.12 ? '#8a7a5a' : x > 0.6 ? '#7a6a52' : '#6a5a44')), 0, 0.42, 0)];
  for (const s of [-1, 1]) {
    parts.push(paint(new THREE.CylinderGeometry(0.05, 0.06, 0.6, 4).rotateZ(-0.5).translate(1.75, 0.95, s * 0.15), '#6a5a44'));
    parts.push(paint(new THREE.SphereGeometry(0.09, 5, 3).translate(1.9, 1.22, s * 0.15), '#2a2420'));
  }
  return bake(parts);
}

// A dead beetle on its back: a shiny shell, legs in the air. Protein.
function bug() {
  // A dead beetle on its back: dark underside with segment lines, a glossy
  // green-bronze wing case showing at the edges, six legs curled up, antennae.
  const parts = [];
  parts.push(at(paint(new THREE.SphereGeometry(1, 12, 7).scale(1.25, 0.5, 0.85), (x, y, z) => (y < -0.1 ? (Math.abs(z) > 0.7 ? '#3a5a32' : '#2c3e2a') : Math.floor((x + 2) * 3) % 2 ? '#1e1c18' : '#2a2620')), 0, 0.5, 0));
  parts.push(at(paint(new THREE.SphereGeometry(0.42, 8, 5).scale(1, 0.8, 1), '#1a1814'), 1.25, 0.48, 0));
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
    const hip = new THREE.Vector3(-0.45 + i * 0.45, 0.85, s * 0.35), knee = hip.clone().add(new THREE.Vector3(0.1, 0.55, s * 0.35)), toe = knee.clone().add(new THREE.Vector3(0.25 - i * 0.15, 0.2, -s * 0.3));
    for (const [a, b, r] of [[hip, knee, 0.07], [knee, toe, 0.05]]) { const len = a.distanceTo(b), c = new THREE.CylinderGeometry(r * 0.7, r, len, 4).translate(0, len / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize())); c.translate(a.x, a.y, a.z); parts.push(paint(c, '#141210')); }
  }
  for (const s of [-1, 1]) { const a = new THREE.Vector3(1.55, 0.55, s * 0.2), b = new THREE.Vector3(2.3, 0.75, s * 0.55), len = a.distanceTo(b), c = new THREE.CylinderGeometry(0.025, 0.035, len, 3).translate(0, len / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize())); c.translate(a.x, a.y, a.z); parts.push(paint(c, '#141210')); }
  return bake(parts);
}

// A beetle's cast-off shell (build 18): a ridged, glossy dark wing case with
// a green-bronze sheen along the top, split down the middle.
function shell() {
  const g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.5, 0.75, 1.05);
  const parts = [at(paint(g, (x, y, z) => (Math.abs(z) < 0.08 ? '#0c0c0a' : y > 0.55 ? '#4a6a3a' : Math.floor((x + 2) * 3) % 2 ? '#1c2418' : '#283422')), 0, 0.05, 0)];
  parts.push(at(paint(new THREE.SphereGeometry(0.42, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1.3), '#141410'), 1.55, 0.05, 0));
  return bake(parts);
}

// Jelly bean: a glossy bent bean with a pale shine.
function jellybean(color, shine) {
  const g = new THREE.SphereGeometry(1, 10, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) * 1.7, z = p.getZ(i) * 0.85; p.setXYZ(i, x, p.getY(i) * 0.8, z + 0.18 * x * x - 0.25); }
  return bake([at(paint(g, (x, y, z) => (y > 0.55 && x > -0.9 && x < 0.2 ? shine : color)), 0, 0.8, 0)]);
}

// A broken cookie wedge with chocolate chips.
function cookie() {
  const parts = [];
  const g = lumpy(new THREE.CylinderGeometry(1.3, 1.3, 0.5, 10, 1, false, 0, Math.PI * 1.25), 0.12, 9);
  parts.push(at(paint(g, (x, y, z, f) => (y > 0.2 ? (hash(f) < 0.3 ? '#b97a3a' : '#d39a52') : '#a8692e')), 0, 0.25, 0));
  for (let i = 0; i < 6; i++) {
    const a = hash(i) * Math.PI * 1.2, r = 0.35 + hash(i + 9) * 0.8;
    parts.push(at(paint(lumpy(new THREE.DodecahedronGeometry(1, 0), 0.2, i), '#3a2214'), Math.sin(a) * r, 0.55, Math.cos(a) * r, 0.22));
  }
  return bake(parts);
}

// Gummy bear lying on its back: bright, chunky, unmistakable.
function gummy(color, shine) {
  const parts = [];
  const c = (x, y, z) => (y > 0.8 && x > -0.7 && x < 0.4 && z > 0.1 ? shine : color);
  parts.push(at(paint(new THREE.SphereGeometry(1, 8, 6), c), -0.3, 0.6, 0, 0.95, 0.6, 0.72));
  parts.push(at(paint(new THREE.SphereGeometry(1, 8, 6), c), 1.15, 0.58, 0, 0.72, 0.56, 0.72));
  parts.push(at(paint(new THREE.SphereGeometry(1, 5, 4), color), 1.95, 0.5, 0, 0.3, 0.26, 0.3));
  for (const s of [-1, 1]) {
    parts.push(at(paint(new THREE.SphereGeometry(1, 6, 4), color), 1.55, 0.7, s * 0.62, 0.3, 0.26, 0.3));
    parts.push(at(paint(new THREE.SphereGeometry(1, 6, 4), color), 0.25, 0.45, s * 1.05, 0.55, 0.32, 0.38, s * 0.5));
    parts.push(at(paint(new THREE.SphereGeometry(1, 6, 4), color), -1.25, 0.42, s * 0.62, 0.55, 0.36, 0.42, -s * 0.4));
  }
  return bake(parts);
}

// A dew bead: clear blue, brighter low down where light gathers. Drawn with
// a transparent material; the shine dot is separate and unlit.
function bead() {
  return bake([at(paint(new THREE.SphereGeometry(1, 8, 6), (x, y, z) => (Math.hypot(x, z) > 0.85 ? '#6fb8ec' : y > 0.3 ? '#b4e2ff' : '#f0fbff')), 0, 0.9, 0, 1, 0.9, 1)]);
}
// A blade of grass the beads cling to.
function blade() {
  const g = new THREE.CylinderGeometry(0.06, 0.4, 4, 3, 4).translate(0, 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i), y, p.getZ(i) + y * y * 0.12); }
  return bake([paint(g, (x, y) => (y > 2.5 ? '#7aa846' : '#4f7a2e'))]);
}
// A puddle (build 14): a lumpy pool in rings, deep blue in the middle,
// shallow and bright at the shore, with a dark wet-mud edge. Flat rings
// (each one colour) so the faces don't streak.
function puddle() {
  const lump = (g, y) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.12 * Math.sin(a * 3 + 1.3) + 0.07 * Math.sin(a * 5 + 0.4); p.setXYZ(i, x * k, y, z * k); } return g; };
  const ring = (r0, r1, y, col) => paint(lump(r0 ? new THREE.RingGeometry(r0, r1, 32, 1).rotateX(-Math.PI / 2) : new THREE.CircleGeometry(r1, 32).rotateX(-Math.PI / 2), y), col);
  return bake([ring(1.0, 1.14, 0.02, '#3e3020'), ring(0.9, 1.0, 0.05, '#bfe4f6'), ring(0.68, 0.9, 0.06, '#6fb2e6'), ring(0.4, 0.68, 0.07, '#3f86d0'), ring(0, 0.4, 0.08, '#2a6ab8')]);
}

// Build 23: a cut leaf piece (a half-moon bitten from a leaf, ribbed), and a twig.
function leafPiece() {
  const sh = new THREE.Shape(); sh.moveTo(-1, 0); sh.absarc(0, 0, 1, Math.PI, 0, true); sh.quadraticCurveTo(0.4, 0.35, 0, 0.25); sh.quadraticCurveTo(-0.4, 0.35, -1, 0);
  const g = new THREE.ShapeGeometry(sh, 6).rotateX(-Math.PI / 2).translate(0, 0.08, 0.3);
  return bake([paint(g, (x, y, z) => (Math.abs(x) < 0.06 ? '#a8d870' : Math.abs(x + z * 0.3) < 0.05 || Math.abs(x - z * 0.3) < 0.05 ? '#8ac850' : '#5aa034')), paint(new THREE.ShapeGeometry(sh, 6).rotateX(Math.PI / 2).translate(0, 0.06, -0.3), '#4a8a2a')]);
}
function twig() {
  const parts = [], len = 2.2;
  parts.push(paint(new THREE.CylinderGeometry(0.14, 0.18, len, 6).rotateZ(Math.PI / 2).translate(0, 0.17, 0), (x, y) => (y > 0.25 ? '#9a7a4e' : '#6a4e2e')));
  parts.push(paint(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 5).rotateZ(Math.PI / 2 - 0.7).translate(0.4, 0.35, 0.05), '#7a5a36'));
  for (const sx of [-1, 1]) parts.push(paint(new THREE.CircleGeometry(0.15, 6).rotateY(sx * Math.PI / 2).translate(sx * len / 2, 0.17, 0), '#c8a070'));
  return bake(parts);
}
export const FOOD = {
  leafbit: leafPiece(),
  twig: twig(),
  crumb: breadCrumb(),
  seed: seed(),
  berry: berry(),
  popcorn: popcorn(),
  jellybean: [jellybean('#d8283a', '#ff9aa4'), jellybean('#3aa040', '#a8f0a0'), jellybean('#f08a1e', '#ffd09a')],
  cookie: cookie(),
  apple: apple(),
  tomato: tomato(),
  aphids: aphids(),
  hotdog: hotdog(),
  chip: chip(),
  acorn: acorn(),
  slug: slug(),
  bug: bug(),
  shell: shell(),
  gummy: [gummy('#e0283c', '#ff9aa8'), gummy('#f2b81e', '#fff0a0'), gummy('#3cb84a', '#b8f8b0')],
  bead: bead(),
  blade: blade(),
  puddle: puddle(),
  shine: PROPS.dew,
  // A four-point sparkle that marks a treat.
  star: bake([paint(new THREE.PlaneGeometry(1, 0.16), '#ffffff'), paint(new THREE.PlaneGeometry(0.16, 1), '#ffffff'), paint(new THREE.PlaneGeometry(0.34, 0.34).rotateZ(Math.PI / 4), '#fff6c8')]),
};
const TREAT_COLOR = { jellybean: '#e04050', cookie: '#c98a46', gummy: '#e85060', chip: '#f0c850', acorn: '#a8743a' };

// Which geometry, colour and size an item draws as. variant picks colour
// variants deterministically from the item's position.
export function itemLook(f, COLORS) {
  const v = (f.x * 7 + f.y * 13) >>> 0;
  if (f.kind === 'water') {
    if (f.type === 'puddle') return { geo: FOOD.puddle, key: 'puddle', color: '#ffffff', r: (10 + Math.min(f.amt, 40) * 0.45) * 2, water: true };
    return { dew: true, r: Math.min(5, 2.6 + f.amt * 0.3), beads: Math.max(1, Math.min(4, Math.ceil(f.amt / 2))) };
  }
  if (f.kind === 'leaf') return { geo: FOOD.leafbit, key: 'leafbit', color: '#ffffff', r: 3.4 };
  if (f.kind === 'wood') return { geo: FOOD.twig, key: 'twig', color: '#ffffff', r: 3.2 };
  if (f.kind === 'grit') return { geo: PROPS.pebble, key: 'pebble', color: COLORS.grit, r: 2.6, lift: 0.6 };
  if (f.kind === 'chitin') return { geo: FOOD.shell, key: 'shell', color: '#ffffff', r: 3 + Math.min(f.amt, 15) * 0.15 };
  if (f.kind === 'protein' && f.type === 'hotdog') return { geo: FOOD.hotdog, key: 'hotdog', color: '#ffffff', r: Math.min(5.5, 3 + f.amt * 0.12) };
  if (f.kind === 'protein' && f.type === 'slug') return { geo: FOOD.slug, key: 'slug', color: '#ffffff', r: 6 };
  if (f.kind === 'protein' && f.type === 'alate') return { geo: ALATE, key: 'alate', color: '#ffffff', r: 2.6 };
  if (f.kind === 'protein' && f.type === 'bug') return { geo: FOOD.bug, key: 'bug', color: '#ffffff', r: Math.min(5.5, 2.5 + f.amt * 0.2) };
  if (f.kind === 'protein') return { geo: PROPS.meat, key: 'meat', color: COLORS.protein, r: Math.min(6, 2.5 + f.amt * 0.08), lift: 0.6 };
  switch (f.type) {
    case 'seed': return { geo: FOOD.seed, key: 'seed', color: '#ffffff', r: Math.min(5.2, 2.8 + f.amt * 0.12) };
    case 'berry': return { geo: FOOD.berry, key: 'berry', color: '#ffffff', r: Math.min(5, 2.8 + f.amt * 0.17) };
    case 'tomato': return { geo: FOOD.tomato, key: 'tomato', color: '#ffffff', r: Math.min(6, 3.2 + f.amt * 0.13) };
    case 'aphids': return { geo: FOOD.aphids, key: 'aphids', color: '#ffffff', r: 3.6 + Math.min(f.amt, 20) * 0.08 };
    case 'acorn': return { geo: FOOD.acorn, key: 'acorn', color: '#ffffff', r: 6, treat: true };
    case 'chip': return { geo: FOOD.chip, key: 'chip', color: '#ffffff', r: 6.5, treat: true };
    case 'apple': return { geo: FOOD.apple, key: 'apple', color: '#ffffff', r: Math.min(6.5, 3.5 + f.amt * 0.12) };
    case 'popcorn': return { geo: FOOD.popcorn, key: 'popcorn', color: '#ffffff', r: Math.min(5.5, 3 + f.amt * 0.16) };
    case 'jellybean': return { geo: FOOD.jellybean[v % 3], key: 'jb' + (v % 3), color: '#ffffff', r: 5 + f.amt * 0.14, treat: true };
    case 'cookie': return { geo: FOOD.cookie, key: 'cookie', color: '#ffffff', r: 5 + f.amt * 0.15, treat: true };
    case 'gummy': return { geo: FOOD.gummy[v % 3], key: 'gb' + (v % 3), color: '#ffffff', r: 4.5 + f.amt * 0.13, treat: true };
    default: return { geo: FOOD.crumb, key: 'crumb', color: '#ffffff', r: Math.min(6, 3 + f.amt * 0.2) };
  }
}

// What an ant holds in its mandibles: a small piece of whatever it picked up.
export function carryLook(kind, itype, COLORS) {
  if (kind === 'water') return { geo: FOOD.bead, key: 'cbead', color: '#ffffff', r: 0.7, water: true };
  if (kind === 'grit') return { geo: PROPS.pebble, key: 'cgrit', color: COLORS.grit, r: 1 };
  if (kind === 'dirt') return { geo: PROPS.pebble, key: 'cdirt', color: '#6a4628', r: 1.15 }; // a clod of dug dirt for the spoil heap
  if (kind === 'protein') return { geo: PROPS.meat, key: 'cmeat', color: COLORS.protein, r: 1 };
  if (kind === 'chitin') return { geo: FOOD.shell, key: 'cshell', color: '#ffffff', r: 0.9 };
  // A gardener holds its leaf up over its head, like a sail (leafcutters do).
  if (kind === 'leaf') return { geo: FOOD.leafbit, key: 'cleaf', color: '#ffffff', r: 1.5 };
  if (kind === 'wood') return { geo: FOOD.twig, key: 'ctwig', color: '#ffffff', r: 0.9 };
  if (itype === 'aphids') return { geo: PROPS.crumb, key: 'choney', color: '#e8c860', r: 0.9 }; // a drop of honeydew
  if (TREAT_COLOR[itype]) return { geo: PROPS.crumb, key: 'c' + itype, color: TREAT_COLOR[itype], r: 1 };
  const g = FOOD[itype] && !Array.isArray(FOOD[itype]) ? itype : 'crumb';
  return { geo: FOOD[g], key: 'c' + g, color: '#ffffff', r: 0.8 };
}
