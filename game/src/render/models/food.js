// Things on the ground: each food type has its own recognisable shape and
// colours baked into its vertices (so it draws with a white instance tint),
// dew is a cluster of clear beads, and treats glint.
//
// Every geometry rests on y = 0 and spans roughly -1..1, scaled by `r`.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PROPS } from './props.js';

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
  const g = lumpy(new THREE.BoxGeometry(1.7, 1.1, 1.4, 2, 1, 2), 0.28, 3);
  g.computeVertexNormals();
  const n = g.attributes.normal;
  return bake([at(paint(g, (x, y, z, f) => {
    const nx = n.getX(f * 3), nz = n.getZ(f * 3);
    if (nx > 0.6 || nz < -0.6) return hash(f) < 0.3 ? '#e8d29c' : '#f4e4b8';
    return hash(f) < 0.35 ? '#a8692a' : '#c98a3c';
  }), 0, 0.55, 0)]);
}

// Sunflower seed: a striped teardrop.
function seed() {
  const g = new THREE.SphereGeometry(1, 8, 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); const k = 1 - Math.max(0, x) * 0.45; p.setXYZ(i, x * 1.6, p.getY(i) * 0.5 * k, p.getZ(i) * 0.85 * k); }
  // Stripes run the length of the seed: bands by angle around its long axis.
  return bake([at(paint(g, (x, y, z) => { const a = Math.atan2(z, y) + Math.PI; return (a % (Math.PI / 3)) < 0.3 ? '#efe8d4' : '#2a2624'; }), 0, 0.5, 0)]);
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
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.7, r = i ? 0.55 : 0;
    parts.push(at(paint(lumpy(new THREE.IcosahedronGeometry(1, 0), 0.25, i), hash(i) < 0.5 ? '#fbf3dc' : '#f2e6c4'), Math.cos(a) * r, 0.6 + (i % 3) * 0.25, Math.sin(a) * r, 0.5 + hash(i + 5) * 0.2));
  }
  parts.push(at(paint(new THREE.SphereGeometry(1, 5, 3), '#d9a440'), 0.2, 0.35, 0.1, 0.35, 0.25, 0.3));
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

// A dead beetle on its back: a shiny shell, legs in the air. Protein.
function bug() {
  const parts = [at(paint(new THREE.SphereGeometry(1, 8, 5).scale(1.3, 0.55, 0.9), (x, y) => (y > 0.2 ? '#2a3a2a' : '#1a221a')), 0, 0.5, 0)];
  parts.push(at(paint(new THREE.SphereGeometry(0.45, 6, 4), '#141814'), 1.3, 0.5, 0));
  for (let i = 0; i < 3; i++) for (const sz of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.07, 0.07, 0.9, 3).rotateX(sz * 0.6).translate(-0.5 + i * 0.5, 1.1, sz * 0.35);
    parts.push(paint(leg, '#141814'));
  }
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
function puddle() {
  return bake([paint(new THREE.CylinderGeometry(1, 1, 0.08, 16), (x, y, z) => { const r = Math.hypot(x, z); return r > 0.88 ? '#bfe6ff' : r > 0.55 ? '#5ab0f0' : '#3a8ee0'; })]);
}

export const FOOD = {
  crumb: breadCrumb(),
  seed: seed(),
  berry: berry(),
  popcorn: popcorn(),
  jellybean: [jellybean('#d8283a', '#ff9aa4'), jellybean('#3aa040', '#a8f0a0'), jellybean('#f08a1e', '#ffd09a')],
  cookie: cookie(),
  apple: apple(),
  bug: bug(),
  gummy: [gummy('#e0283c', '#ff9aa8'), gummy('#f2b81e', '#fff0a0'), gummy('#3cb84a', '#b8f8b0')],
  bead: bead(),
  blade: blade(),
  puddle: puddle(),
  shine: PROPS.dew,
  // A four-point sparkle that marks a treat.
  star: bake([paint(new THREE.PlaneGeometry(1, 0.16), '#ffffff'), paint(new THREE.PlaneGeometry(0.16, 1), '#ffffff'), paint(new THREE.PlaneGeometry(0.34, 0.34).rotateZ(Math.PI / 4), '#fff6c8')]),
};
const TREAT_COLOR = { jellybean: '#e04050', cookie: '#c98a46', gummy: '#e85060' };

// Which geometry, colour and size an item draws as. variant picks colour
// variants deterministically from the item's position.
export function itemLook(f, COLORS) {
  const v = (f.x * 7 + f.y * 13) >>> 0;
  if (f.kind === 'water') {
    if (f.type === 'puddle') return { geo: FOOD.puddle, key: 'puddle', color: '#ffffff', r: 10 + Math.min(f.amt, 40) * 0.45, water: true };
    return { dew: true, r: Math.min(5, 2.6 + f.amt * 0.3), beads: Math.max(1, Math.min(4, Math.ceil(f.amt / 2))) };
  }
  if (f.kind === 'grit') return { geo: PROPS.pebble, key: 'pebble', color: COLORS.grit, r: 2.6, lift: 0.6 };
  if (f.kind === 'protein' && f.type === 'bug') return { geo: FOOD.bug, key: 'bug', color: '#ffffff', r: Math.min(5.5, 2.5 + f.amt * 0.2) };
  if (f.kind === 'protein') return { geo: PROPS.meat, key: 'meat', color: COLORS.protein, r: Math.min(6, 2.5 + f.amt * 0.08), lift: 0.6 };
  switch (f.type) {
    case 'seed': return { geo: FOOD.seed, key: 'seed', color: '#ffffff', r: Math.min(5.2, 2.8 + f.amt * 0.12) };
    case 'berry': return { geo: FOOD.berry, key: 'berry', color: '#ffffff', r: Math.min(5, 2.8 + f.amt * 0.17) };
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
  if (kind === 'protein') return { geo: PROPS.meat, key: 'cmeat', color: COLORS.protein, r: 1 };
  if (TREAT_COLOR[itype]) return { geo: PROPS.crumb, key: 'c' + itype, color: TREAT_COLOR[itype], r: 1 };
  const g = FOOD[itype] && !Array.isArray(FOOD[itype]) ? itype : 'crumb';
  return { geo: FOOD[g], key: 'c' + g, color: '#ffffff', r: 0.8 };
}
