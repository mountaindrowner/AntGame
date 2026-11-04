// The small tools every model is built with: vertex-coloured facets, merged into one geometry.
// Local frame as for the ants: +X forward, +Y up, +Z to the left.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const col = new THREE.Color();

// Colour every triangle by its centroid: fn(x, y, z, face) → a colour (or one colour for all). Flat colours
// per facet keep the PS1 look. Options: normals (recompute them), dropUV (for vertex-coloured materials),
// and a brightness jitter per face: jitter (the lowest), span, rng (a seeded random, called once a face).
export function paint(geo, fn, o) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    col.set(typeof fn === 'function' ? fn(x, y, z, i / 3) : fn);
    if (o && o.rng) col.multiplyScalar(o.jitter + o.rng() * o.span);
    for (let k = 0; k < 3; k++) c.set([col.r, col.g, col.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (o && o.dropUV && g.attributes.uv) g.deleteAttribute('uv');
  if (o && o.normals) g.computeVertexNormals();
  return g;
}

// A painted ellipsoid: centre c, radii r, segments seg = [around, up].
export function blob(c, r, seg, fn) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  g.scale(r[0], r[1], r[2]);
  g.translate(c[0], c[1], c[2]);
  return paint(g, fn);
}

// A painted tapering rod from a to b (radius r0 at a, r1 at b).
export function strut(a, b, r0, r1, color, sides = 4) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()));
  g.translate(a.x, a.y, a.z);
  return paint(g, color);
}

// Merge painted parts into one geometry, with smooth-enough normals.
export function bake(parts) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeVertexNormals();
  return g;
}

// Small deterministic hash for speckles: 0..1 from any number.
export const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
