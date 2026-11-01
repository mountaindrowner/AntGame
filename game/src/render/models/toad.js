// A toad: a squat, warty brown body, gold eyes, folded back legs. Built along
// +X (mouth forward), sitting on y = 0, about 2 units long. The tongue is its
// own mesh along +X from the mouth, scaled to reach.
import * as THREE from 'three';
import { psx } from '../ps1/materials.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const col = new THREE.Color();
function paint(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    col.set(typeof fn === 'function' ? fn(x, y, z, i / 3) : fn);
    for (let k = 0; k < 3; k++) c.set([col.r, col.g, col.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}
function bakeParts(parts) { const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p))); g.computeVertexNormals(); return g; }
// Model pass, layer 3: an American toad. A squat olive-brown body with
// dark blotches, each ringing a cluster of warts; the kidney-shaped glands
// behind the eyes; gold eyes with a black bar pupil under a bony brow; the
// round eardrum; a pale speckled belly and a throat that swells; splayed
// toes on all four feet. Built along +X (mouth forward), sitting on y = 0,
// about 2 units long. The tongue is its own mesh along +X from the mouth.
const hsh = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const blotch = (x, z) => Math.sin(x * 7.3 + z * 2.1) * Math.cos(z * 6.1 - x * 1.7);
const skin = (x, y, z) => {
  if (y < 0.16) return Math.sin(x * 23) * Math.sin(z * 19) > 0.7 ? '#a89a72' : '#d8caa0';
  if (Math.abs(z) < 0.05 && y > 0.6 && x < 0.5) return '#c8b47a';
  const n = blotch(x, z);
  return n > 0.5 ? '#3a2c1a' : n > 0.36 ? '#54422a' : n < -0.55 ? '#a08e5a' : '#7a6840';
};
const geo = (g, fn) => paint(g, fn);
const ball = (r, x, y, z, fn, s = [1, 1, 1], seg = [8, 6]) => geo(new THREE.SphereGeometry(r, seg[0], seg[1]).scale(...s).translate(x, y, z), fn);

export function toad() {
  const mat = psx({ vertexColors: true });
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const parts = [];
  // Body: broad, flat-backed, a little hunched over the hips.
  parts.push(ball(1, -0.05, 0.42, 0, skin, [0.92, 0.5, 0.74], [14, 9]));
  // Head: wide and flat, the jaw line dark, the snout blunt.
  parts.push(ball(1, 0.7, 0.5, 0, (x, y, z) => (y < 0.36 ? '#d8caa0' : y < 0.42 && x > 0.75 ? '#2e2414' : skin(x, y, z)), [0.5, 0.3, 0.6], [12, 7]));
  // Warts: raised bumps across the back, darker in the blotches.
  for (let i = 0; i < 44; i++) {
    const a = hsh(i) * Math.PI * 2, rr = Math.sqrt(hsh(i + 50)) * 0.85, x = -0.05 + Math.cos(a) * rr * 0.85, z = Math.sin(a) * rr * 0.68;
    const yy = 0.42 + 0.5 * Math.sqrt(Math.max(0, 1 - (Math.cos(a) * rr) ** 2 - (Math.sin(a) * rr) ** 2 * 0.9)) - 0.02;
    if (yy < 0.55) continue;
    const big = hsh(i + 9) > 0.6;
    parts.push(ball(big ? 0.095 : 0.065, x, yy + 0.01, z, (px, py) => (py > yy + 0.03 ? (blotch(x, z) > 0.38 ? '#a86a32' : '#c8ae6a') : '#4a3a20'), [1, 0.75, 1], [6, 4]));
  }
  for (const s of [-1, 1]) {
    // Parotoid gland: the long poison bump behind each eye.
    parts.push(ball(1, 0.3, 0.76, s * 0.36, (x, y) => (y > 0.84 ? '#8a7a4a' : '#6a5832'), [0.26, 0.09, 0.11], [8, 4]));
    // Eardrum behind the eye, a bony brow ridge over it.
    parts.push(geo(new THREE.CircleGeometry(0.075, 7).rotateY(s < 0 ? Math.PI : 0).translate(0.56, 0.62, s * 0.54), '#4a3c24'));
    parts.push(ball(1, 0.78, 0.83, s * 0.3, '#5a4a2c', [0.17, 0.05, 0.08], [6, 3]));
    // Eyes: gold, a black bar pupil, a white glint.
    parts.push(ball(0.15, 0.82, 0.76, s * 0.31, (x, y, z) => (Math.abs(y - 0.77) < 0.05 && x > 0.83 ? '#0a0a0a' : y > 0.84 ? '#f0c040' : '#c88a1c'), [1, 1, 1], [10, 7]));
    parts.push(ball(0.025, 0.92, 0.84, s * 0.36, '#ffffff', [1, 1, 1], [4, 3]));
    // Nostril.
    parts.push(ball(0.02, 1.16, 0.6, s * 0.08, '#1a140a', [1, 1, 1], [4, 3]));
    // Back legs folded at the hips: thigh, shin, and a long webbed foot.
    parts.push(ball(1, -0.5, 0.26, s * 0.62, skin, [0.46, 0.22, 0.24], [9, 5]));
    parts.push(ball(1, -0.2, 0.12, s * 0.8, skin, [0.36, 0.11, 0.13], [7, 4]));
    for (let t = 0; t < 4; t++) parts.push(geo(new THREE.BoxGeometry(0.34 - t * 0.04, 0.035, 0.05).translate(0.12 + (0.34 - t * 0.04) / 2, 0.02, 0).rotateY(s * (-0.5 + t * 0.32)).translate(-0.1, 0, s * 0.86), '#b8a474'));
    // Front legs propping it up, toes splayed.
    parts.push(geo(new THREE.CylinderGeometry(0.06, 0.085, 0.42, 6).rotateZ(0.3).rotateX(s * 0.2).translate(0.56, 0.2, s * 0.44), (x, y) => (y > 0.25 ? '#76663e' : '#9a8a58')));
    for (let t = 0; t < 4; t++) parts.push(geo(new THREE.BoxGeometry(0.15, 0.03, 0.04).translate(0.075, 0.015, 0).rotateY(s * (-0.7 + t * 0.4)).translate(0.63, 0, s * 0.47), '#b8a474'));
  }
  body.add(new THREE.Mesh(bakeParts(parts), mat));
  // The throat: its own mesh, so it can puff (pale, speckled).
  const throat = new THREE.Mesh(geo(new THREE.SphereGeometry(1, 9, 6).scale(0.3, 0.14, 0.38).translate(0, 0, 0), (x, y, z, f) => (hsh(f) > 0.8 ? '#a89670' : '#ece0bc')), mat);
  throat.position.set(0.82, 0.3, 0);
  body.add(throat);
  const tongue = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.05, 0.05, 1, 5).rotateZ(-Math.PI / 2).translate(0.5, 0, 0), (x) => (x > 0.9 ? '#f08a9a' : '#e06a7a')), mat);
  tongue.position.set(1.1, 0.4, 0);
  tongue.visible = false;
  body.add(tongue);
  return { group: g, body, tongue, throat };
}

// A falling acorn, 1 unit long, point down (layer 5): a glossy nut with
// faint stripes, a highlight and a dark pointed tip, in a cap of overlapping
// scales with a rolled lip, and a little bent stalk.
export function fallingAcorn() {
  const mat = psx({ vertexColors: true });
  const g = new THREE.Group(), parts = [];
  const nut = new THREE.SphereGeometry(0.36, 12, 10).scale(1, 1.35, 1);
  { const p = nut.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) { const k = 1 - Math.pow(-y / 0.486, 2.2) * 0.45; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } } }
  nut.translate(0, 0.46, 0);
  parts.push(paint(nut, (x, y, z) => {
    if (y < 0.06) return '#3a2412';
    if (x < -0.12 && z > 0.05 && y > 0.4 && y < 0.7) return '#e0b070';
    return Math.floor((Math.atan2(z, x) + 4) * 12 / 6.283) % 3 === 0 ? '#8a5a2a' : y < 0.3 ? '#94622e' : '#a8743a';
  }));
  parts.push(paint(new THREE.SphereGeometry(0.4, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.78, 0), '#5a4430'));
  parts.push(paint(new THREE.TorusGeometry(0.39, 0.05, 4, 16).rotateX(Math.PI / 2).translate(0, 0.79, 0), '#7a6040'));
  for (let row = 0; row < 3; row++) {
    const n = 12 - row * 3, el = 0.25 + row * 0.42;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + row * 0.4, cr = 0.4 * Math.cos(el), cy = 0.78 + 0.4 * Math.sin(el);
      parts.push(paint(new THREE.SphereGeometry(0.075, 5, 3).scale(1.1, 0.55, 1).rotateZ(-el).rotateY(-a).translate(Math.cos(a) * cr, cy, Math.sin(a) * cr), (k + row) % 2 ? '#6a5236' : '#7e6444'));
    }
  }
  parts.push(paint(new THREE.CylinderGeometry(0.035, 0.05, 0.2, 5).rotateZ(0.35).translate(-0.03, 1.27, 0), '#4a3824'));
  g.add(new THREE.Mesh(bakeParts(parts), mat));
  return g;
}
