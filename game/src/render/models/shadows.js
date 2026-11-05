// Model pass, layer 5: shadows shaped like what casts them. Each is a flat
// shape on the ground (XZ plane, facing up), about ±1 across, dark in the
// middle and fading to nothing at a soft edge (vertex alpha), drawn black.
import * as THREE from './lowpoly.js'; // build 64: Lean, capped segments

// Build a soft shadow from an outline (points in XZ, CCW seen from above).
function softShape(pts, soft = 0.22) {
  let cx = 0, cz = 0; for (const [x, z] of pts) { cx += x; cz += z; } cx /= pts.length; cz /= pts.length;
  const pos = [], col = [], n = pts.length;
  const inner = pts.map(([x, z]) => [cx + (x - cx) * (1 - soft), cz + (z - cz) * (1 - soft)]);
  const v = (x, z, a) => { pos.push(x, 0, z); col.push(1, 1, 1, a); };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, [ax, az] = inner[i], [bx, bz] = inner[j], [ox, oz] = pts[i], [px, pz] = pts[j];
    v(cx, cz, 1); v(bx, bz, 1); v(ax, az, 1);
    v(ax, az, 1); v(bx, bz, 1); v(ox, oz, 0);
    v(ox, oz, 0); v(bx, bz, 1); v(px, pz, 0);
  }
  // Whichever way the outline ran, make every triangle face up.
  for (let t = 0; t < pos.length; t += 9) {
    const ux = pos[t + 3] - pos[t], uz = pos[t + 5] - pos[t + 2], wx = pos[t + 6] - pos[t], wz = pos[t + 8] - pos[t + 2];
    if (uz * wx - ux * wz < 0) for (let k = 0; k < 3; k++) { [pos[t + 3 + k], pos[t + 6 + k]] = [pos[t + 6 + k], pos[t + 3 + k]]; [col[(t / 3 + 1) * 4 + k], col[(t / 3 + 2) * 4 + k]] = [col[(t / 3 + 2) * 4 + k], col[(t / 3 + 1) * 4 + k]]; }
    if (uz * wx - ux * wz < 0) { const a = (t / 3 + 1) * 4 + 3, b = (t / 3 + 2) * 4 + 3; [col[a], col[b]] = [col[b], col[a]]; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.computeVertexNormals();
  return g;
}
function sample(shape, n) { return shape.getSpacedPoints(n).slice(0, n).map((p) => [p.x, p.y]); }

// A disc.
export const SHADOW_DISC = softShape(Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return [Math.cos(a), -Math.sin(a)]; }), 0.3);

// A sneaker's sole, toe to -X like the sneaker model: wide at the toe, a
// narrow waist, a round heel. Normalised to x ±1, z ±1.
const sole = new THREE.Shape();
sole.moveTo(-1, 0);
sole.quadraticCurveTo(-1, 0.9, -0.57, 0.96); sole.quadraticCurveTo(-0.13, 1, 0.13, 0.71);
sole.quadraticCurveTo(0.5, 0.64, 0.77, 0.79); sole.quadraticCurveTo(1, 0.82, 1, 0);
sole.quadraticCurveTo(1, -0.82, 0.77, -0.79); sole.quadraticCurveTo(0.5, -0.64, 0.13, -0.71);
sole.quadraticCurveTo(-0.13, -1, -0.57, -0.96); sole.quadraticCurveTo(-1, -0.9, -1, 0);
export const SHADOW_SOLE = softShape(sample(sole, 48).reverse(), 0.18);

// A bird with its wings spread, beak to +X: wings swept a little back, a
// fanned tail. Normalised to about x ±1, z ±1 (the wingspan).
const bird = new THREE.Shape();
bird.moveTo(1, 0);
bird.quadraticCurveTo(0.7, 0.16, 0.35, 0.2); bird.lineTo(0.1, 1); bird.quadraticCurveTo(-0.1, 0.95, -0.2, 0.24);
bird.lineTo(-0.6, 0.14); bird.lineTo(-1, 0.3); bird.lineTo(-0.92, 0); bird.lineTo(-1, -0.3); bird.lineTo(-0.6, -0.14);
bird.lineTo(-0.2, -0.24); bird.quadraticCurveTo(-0.1, -0.95, 0.1, -1); bird.lineTo(0.35, -0.2); bird.quadraticCurveTo(0.7, -0.16, 1, 0);
export const SHADOW_BIRD = softShape(sample(bird, 60).reverse(), 0.14);
