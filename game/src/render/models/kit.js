// The tools every model is built with. Build 64: the Lean style (Mark: "Lean looks better overall").
//   paint, blob, strut, bake: Lean. Colours run smoothly from vertex to vertex and parts are welded, so each
//     part is smooth-shaded like a PlayStation model, with no per-face speckle (colour functions get face 0).
//   paintFacets, bakeFacets, facets.blob, facets.strut: the old faceted style, one colour per triangle with
//     an optional seeded jitter. The world (ground, landmarks, house, soil, the Sinkhole) still uses these.
// Local frame as for the ants: +X forward, +Y up, +Z to the left.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const col = new THREE.Color();

// Lean: colour each vertex: fn(x, y, z, 0) → a colour (or one colour for all). Options: normals (recompute
// them), dropUV (for vertex-coloured materials).
export function paint(geo, fn, o) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { col.set(typeof fn === 'function' ? fn(p.getX(i), p.getY(i), p.getZ(i), 0) : fn); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (o && o.dropUV && geo.attributes.uv) geo.deleteAttribute('uv');
  if (o && o.normals) geo.computeVertexNormals();
  return geo;
}
// Lean: merge painted parts into one geometry, welded so each part shades smoothly.
export function bake(parts) {
  const list = parts.map((p) => { const q = p.index ? p.toNonIndexed() : p.clone(); for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'color') q.deleteAttribute(k); if (!q.attributes.color) paint(q, '#888888'); return q; });
  const g = mergeVertices(mergeGeometries(list), 1e-4);
  g.computeVertexNormals();
  return g;
}

// Faceted: colour every triangle by its centroid: fn(x, y, z, face). Options: normals, dropUV, and a
// brightness jitter per face: jitter (the lowest), span, rng (a seeded random, called once a face).
export function paintFacets(geo, fn, o) {
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
export function bakeFacets(parts) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeVertexNormals();
  return g;
}

// A painted ellipsoid (centre c, radii r, segments seg = [around, up]) and a tapering rod from a to b.
function tools(painter) {
  return {
    blob(c, r, seg, fn) { const g = new THREE.SphereGeometry(1, seg[0], seg[1]); g.scale(r[0], r[1], r[2]); g.translate(c[0], c[1], c[2]); return painter(g, fn); },
    strut(a, b, r0, r1, color, sides = 4) {
      const len = a.distanceTo(b), g = new THREE.CylinderGeometry(r1, r0, len, sides, 1);
      g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z);
      return painter(g, color);
    },
  };
}
export const { blob, strut } = tools(paint);
export const facets = tools(paintFacets);

// Small deterministic hash for speckles: 0..1 from any number.
export const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
