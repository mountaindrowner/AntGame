// The Sinkhole (builds 58-59): the fire ants' great mound caved into a pit, and the slumped ground on its lip.
// These are part of the world, so they stay in the faceted style at full detail (plain three.js): the pit's
// rim has to cover the hole cut in the ground, which a rim capped to a few sides would not.
import * as THREE from 'three';
import { V, paintFacets as paint, bakeFacets as bake, facets, hash } from './kit.js';
import { psxBasic } from '../ps1/materials.js';

const { blob, strut } = facets;

// ---------- the Sinkhole ----------
export function sinkholeGeometry(R) {
  // Build 59: the ground on the lip of the caved-in mound, slumped and split where the seam broke through:
  // a low torn dish of dark scorched earth (the pit itself is cavedPitGeometry, in the scenery).
  const prof = [[R * 1.6, 0.2], [R * 1.3, 1.6], [R * 1.08, 4.5], [R * 0.98, 5], [R * 0.86, 3], [R * 0.66, 1.2], [R * 0.4, 0.5], [0, 0.4]].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(prof, 30);
  const parts = [paint(geo, (x, y, z, f) => {
    const d = Math.hypot(x, z) / R;
    if (d < 0.66) return hash(f) < 0.12 ? '#24301c' : hash(f + 3) < 0.4 ? '#1a120c' : '#120c08';
    if (d < 1.0) return hash(f) < 0.3 ? '#3a2818' : '#2c1e12';
    if (d < 1.15) return hash(f) < 0.4 ? '#7a5434' : '#6a4a2e';
    return hash(f) < 0.3 ? '#5e4430' : '#52402a';
  })];
  // Torn clods heaved up round the edge.
  for (let k = 0; k < 14; k++) { const a = k * 0.45 + hash(k) * 0.3, r = R * (0.95 + hash(k + 2) * 0.25); parts.push(blob([Math.cos(a) * r, 3 + hash(k) * 3, Math.sin(a) * r], [5 + hash(k + 4) * 5, 3 + hash(k) * 2, 4 + hash(k + 1) * 4], [5, 3], hash(k + 6) < 0.5 ? '#7a5a3a' : '#5a3e26')); }
  return bake(parts);
}

// ---------- The caved-in mound (the Sinkhole proper) ----------
// The fire ants' great mound, fallen in. yardScenery cuts the ground open under the mound, so this is a
// real pit, falling far below the yard: a broken red rim slumped low on the side toward the open seam,
// the old nest's galleries laid open in walls that darken stratum by stratum, roots hanging into it,
// rubble on a black floor. R is the old mound's radius (px). The glow at the bottom is pitGlow().
const PIT_BANDS = ['#7e4428', '#643620', '#4c2a1a', '#3a2016', '#281612', '#170e0c'].map((c) => new THREE.Color(c));
const PIT_GREEN = new THREE.Color('#2e8a3a');
export function cavedPitGeometry(R) {
  const D = R * 0.8;
  const prof = [[0.001, -D], [0.18, -D + 2], [0.3, -D * 0.92], [0.4, -D * 0.74], [0.5, -D * 0.54], [0.6, -D * 0.36], [0.69, -D * 0.19], [0.76, -D * 0.06], [0.81, 3], [0.855, 13], [0.9, 21], [0.94, 16], [0.98, 7], [1.03, 0.3]];
  const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x * R, y)), 48);
  // Wobble the outline and break the crest, as smooth functions of the angle so no seams open.
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), w = 1 + 0.03 * Math.sin(3 * a + 0.7) + 0.02 * Math.sin(7 * a + 2.1) + 0.01 * Math.sin(13 * a);
    let dy = 0;
    if (y > 0.5) { const up = Math.min(1, y / 21); dy = up * (5 * Math.sin(5 * a + 1.3) + 3 * Math.sin(11 * a + 0.4) + 2 * Math.sin(23 * a)); const br = Math.exp(-((a + Math.PI / 2) ** 2) / 0.12); dy -= up * br * 15; } // slumped low toward the seam (north)
    p.setXYZ(i, x * w, y + dy, z * w);
  }
  geo.computeVertexNormals();
  const c = new THREE.Color();
  const parts = [paint(geo, (x, y, z, f) => {
    const d = Math.hypot(x, z) / R, far = -z / (Math.hypot(x, z) || 1);
    if (y > 1 && d > 0.84) return d > 0.95 ? (hash(f) < 0.3 ? '#7a4028' : '#6c3a24') : hash(f) < 0.35 ? '#a85a36' : '#94502f';
    const k = Math.max(0, Math.min(1, -y / D));
    if (k > 0.9) return hash(f) < 0.1 ? '#1a3a1c' : '#0a0807';
    if (k > 0.08 && k < 0.62 && hash(f * 3 + 1) < 0.07) return '#060404'; // the fire ants' galleries, laid open
    c.copy(PIT_BANDS[Math.max(0, Math.min(5, Math.floor(k * 6 + (hash(f) - 0.5) * 0.6)))]);
    c.multiplyScalar(0.55 + 0.45 * Math.max(0, far) + (hash(f + 5) - 0.5) * 0.12); // the far wall catches the light; the near one is in shadow
    if (k > 0.55) c.lerp(PIT_GREEN, (k - 0.55) * 0.9 * (0.6 + 0.4 * Math.max(0, far))); // the seam's glow climbing the walls
    return c;
  })];
  // Roots hanging from the rim into the dark.
  for (let k = 0; k < 16; k++) { const a = k * 0.41 + hash(k) * 0.3, r0 = R * 0.84, r1 = R * (0.66 + hash(k + 1) * 0.08), y1 = -D * (0.15 + hash(k + 2) * 0.25);
    parts.push(strut(V(Math.cos(a) * r0, 6, Math.sin(a) * r0), V(Math.cos(a + 0.05) * r1, y1, Math.sin(a + 0.05) * r1), 2.2, 0.5, hash(k + 9) < 0.5 ? '#3a2616' : '#2a1c10', 3)); }
  // Clods tipping over the rim, and rubble heaped on the floor.
  for (let k = 0; k < 18; k++) { const a = k * 0.35 + hash(k + 20) * 0.2, r = R * (0.86 + hash(k + 21) * 0.08); parts.push(blob([Math.cos(a) * r, 16 + hash(k) * 8, Math.sin(a) * r], [7 + hash(k + 4) * 8, 5 + hash(k) * 4, 7 + hash(k + 1) * 6], [5, 4], hash(k + 6) < 0.5 ? '#8a4a2c' : '#6a3820')); }
  for (let k = 0; k < 14; k++) { const a = k * 0.9 + hash(k + 40), r = R * (0.08 + hash(k + 41) * 0.22); parts.push(blob([Math.cos(a) * r, -D + 4 + hash(k) * 4, Math.sin(a) * r], [9 + hash(k + 4) * 10, 5 + hash(k) * 5, 8 + hash(k + 1) * 8], [5, 3], hash(k + 6) < 0.5 ? '#2a1812' : '#1c100c')); }
  return bake(parts);
}

// The open seam at the pit's bottom: glowing cracks across the floor and a faint green shaft rising out.
export function pitGlow(R) {
  const D = R * 0.8, g = new THREE.Group(), crack = psxBasic({ color: '#7aff6a' }), core = psxBasic({ color: '#c8ffb0' });
  const seg = (x0, z0, x1, z1, w, m) => { const len = Math.hypot(x1 - x0, z1 - z0) + w * 0.5; const b = new THREE.Mesh(new THREE.BoxGeometry(len, 1.2, w), m); b.position.set((x0 + x1) / 2, -D + 3, (z0 + z1) / 2); b.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(b); };
  // A jagged split across the floor, forking as it runs, glowing hottest in the middle.
  const run = (x, z, a, n, w, seed) => { for (let j = 0; j < n; j++) { const l = R * (0.035 + hash(seed + j) * 0.03), nx = x + Math.cos(a) * l, nz = z + Math.sin(a) * l; seg(x, z, nx, nz, Math.max(1, w - j * 0.5), w > 2.5 && j < 2 ? core : crack); if (hash(seed + j + 50) < 0.3 && n - j > 2) run(nx, nz, a + (hash(seed + j + 9) < 0.5 ? 0.9 : -0.9), n - j - 2, Math.max(1, w - j * 0.6 - 1), seed + 97 * (j + 1)); x = nx; z = nz; a += (hash(seed + j + 3) - 0.5) * 0.9; } };
  run(0, 0, 0.3, 7, 3.5, 11); run(0, 0, 0.3 + Math.PI, 7, 3.5, 23); run(0, 0, 1.9, 4, 2, 37); run(0, 0, -1.4, 4, 2, 53);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.36, R * 0.16, D * 1.05, 16, 1, true).translate(0, -D * 0.47, 0), psxBasic({ color: '#5aff6a', transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(shaft);
  return { group: g, crack, shaft };
}
