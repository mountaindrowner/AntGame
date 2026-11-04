// Build 20: curios, the lost human things in every region. Each is about one
// unit across (the renderer scales it), vertex-coloured, low-poly, lying on
// the ground: origin on the ground, +Y up.
import * as THREE from 'three';
import { V, paint, blob, strut, bake } from './kit.js';

const cyl = (r0, r1, h, seg, y, fn) => paint(new THREE.CylinderGeometry(r1, r0, h, seg).translate(0, y + h / 2, 0), fn);

function marble() {
  // Clear blue glass with a white and orange swirl.
  return bake([blob([0, 1, 0], [1, 1, 1], [12, 9], (x, y, z) => { const a = Math.atan2(z, x) + (y - 1) * 2.4; return Math.sin(a * 2) > 0.72 ? '#f4f0e8' : Math.sin(a * 2 + 1.6) > 0.85 ? '#f08a2a' : y > 1.55 ? '#a8d8ff' : '#3a7ad8'; })]);
}
function button() {
  // A red four-hole button with a raised rim.
  const parts = [cyl(1, 1, 0.22, 16, 0, (x, y, z) => (Math.hypot(x, z) > 0.82 ? '#b81e1e' : '#d8322a'))];
  for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) parts.push(paint(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6).translate(x, 0.24, z), '#3a0a0a'));
  return bake(parts);
}
function coin() {
  // A worn copper coin: rim, a raised head, a green tarnish patch.
  const parts = [cyl(1, 1, 0.12, 18, 0, (x, y, z) => (Math.hypot(x, z) > 0.88 ? '#a8622a' : x + z > 1.05 ? '#6a8a5a' : '#c8803a'))];
  parts.push(paint(new THREE.SphereGeometry(0.42, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.18, 1.2).translate(0, 0.12, 0), '#d8904a'));
  return bake(parts);
}
function cap() {
  // A crimped bottle cap lying open side up, red with a silver lining.
  const parts = [], n = 20;
  parts.push(cyl(1, 1, 0.08, n, 0, '#d0d4d8'));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2, r = i % 2 ? 1.08 : 0.96;
    const g = new THREE.BoxGeometry(0.32, 0.38, 0.1).translate(0, 0.27, 0).rotateY(-(a + a2) / 2 + Math.PI / 2).translate(Math.cos((a + a2) / 2) * r, 0, Math.sin((a + a2) / 2) * r);
    parts.push(paint(g, '#c41e24')); }
  return bake(parts);
}
function brick() {
  // A yellow toy brick, two by two studs.
  const parts = [paint(new THREE.BoxGeometry(1.6, 0.9, 1.6).translate(0, 0.45, 0), (x, y) => (y > 0.85 ? '#ffd02a' : '#e8b416'))];
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) parts.push(cyl(0.24, 0.24, 0.18, 10, 0.9, '#ffda40').translate(x, 0, z));
  return bake(parts);
}
function clip() {
  // A bent steel paper clip lying flat.
  const pts = [V(-1.1, 0.06, -0.25), V(0.9, 0.06, -0.25), V(1.1, 0.06, 0), V(0.9, 0.06, 0.25), V(-0.8, 0.06, 0.25), V(-0.95, 0.06, 0.05), V(-0.8, 0.06, -0.1), V(0.6, 0.06, -0.1)];
  const parts = []; for (let i = 0; i < pts.length - 1; i++) parts.push(strut(pts[i], pts[i + 1], 0.06, 0.06, '#c8ccd2', 4));
  return bake(parts);
}
function bead() {
  // A faceted purple glass bead with its hole.
  return bake([paint(new THREE.IcosahedronGeometry(0.8, 0).scale(1, 0.85, 1).translate(0, 0.7, 0), (x, y, z, f) => (f % 3 ? '#8a3ad0' : '#c890ff')), cyl(0.18, 0.18, 0.02, 8, 1.36, '#2a0a3a')]);
}
function die() {
  // A white die tipped on one edge, black pips.
  const parts = [paint(new THREE.BoxGeometry(1.4, 1.4, 1.4).translate(0, 0.7, 0), '#f4f0e8')];
  for (const [x, z] of [[-0.35, -0.35], [0.35, 0.35], [0, 0], [0.35, -0.35], [-0.35, 0.35]]) parts.push(paint(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 6).translate(x, 1.41, z), '#141414'));
  for (const [x, y] of [[-0.35, 0.35], [0.35, 1.05]]) parts.push(paint(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 6).rotateX(Math.PI / 2).translate(x, y, 0.71), '#141414'));
  return bake(parts);
}
export const CURIO_GEO = { marble: marble(), button: button(), coin: coin(), cap: cap(), brick: brick(), clip: clip(), bead: bead(), die: die() };
// How big each lies (px a unit): a marble is about four ant-lengths across.
export const CURIO_SIZE = { marble: 22, button: 26, coin: 30, cap: 28, brick: 24, clip: 34, bead: 18, die: 20 };
