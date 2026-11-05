// Small low-poly props shared by both views. Unit-sized; scale per use.
import * as THREE from './lowpoly.js'; // build 64: Lean, capped segments
import { hash as h } from './kit.js';

// White, so the instance colour tints it; fn (x, y, z, face) → a grey that adds shading that survives any
// tint (layer 5: seams, ribs). Build 64, Lean: a grey per vertex, smooth, with no per-face speckle (face 0).
function colored(g, k = 1) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const v = typeof k === 'function' ? k(p.getX(i), p.getY(i), p.getZ(i), 0) : k; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

export const PROPS = {
  crumb: colored(new THREE.IcosahedronGeometry(1, 1).scale(1, 0.75, 0.9), (x, y, z, f) => (h(f) < 0.25 ? 0.72 : y > 0.4 ? 1.08 : 0.94)),
  seed: colored(new THREE.SphereGeometry(1, 8, 4).scale(1.5, 0.8, 0.9), (x, y, z) => (Math.abs(z) < 0.18 && y > 0 ? 1.25 : x > 1.2 ? 0.7 : y < -0.3 ? 0.82 : 1)),
  dew: colored(new THREE.SphereGeometry(1, 8, 5), (x, y, z) => (y > 0.5 && x < 0 && z > 0 ? 1.35 : y < -0.4 ? 0.82 : 1)),
  puddle: colored(new THREE.CylinderGeometry(1, 1, 0.12, 9)),
  pebble: colored(new THREE.IcosahedronGeometry(1, 1).scale(1, 0.62, 1), (x, y, z, f) => (h(f * 3.1) < 0.18 ? 0.78 : h(f * 3.1) > 0.9 ? 1.18 : y < -0.2 ? 0.86 : 1)),
  meat: colored(new THREE.IcosahedronGeometry(1, 0).scale(1.2, 0.8, 1)),
  ring: colored(new THREE.RingGeometry(0.8, 1, 28).rotateX(-Math.PI / 2)),
  egg: colored(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.72, 0.8)),
  box: colored(new THREE.BoxGeometry(1, 1, 1)),
  cone: colored(new THREE.ConeGeometry(1, 1, 6)),
  quad: colored(new THREE.PlaneGeometry(1, 1)),
  cyl: colored(new THREE.CylinderGeometry(1, 1, 1, 6)),
  // Room furniture.
  torus: colored(new THREE.TorusGeometry(1, 0.38, 4, 9).rotateX(Math.PI / 2)),
  thorn: colored(new THREE.ConeGeometry(0.35, 1, 6), (x, y) => (y > 0.3 ? 1.12 : y < -0.3 ? 0.84 : 1)),
  leaf: colored(new THREE.SphereGeometry(1, 10, 3).scale(1, 0.12, 0.45), (x, y, z) => (Math.abs(z) < 0.06 ? 1.3 : Math.abs(z) > 0.3 ? 0.84 : Math.abs(Math.abs(z) - 0.16 + x * 0.1) < 0.03 ? 1.12 : 1)),
  larva: colored(new THREE.TorusGeometry(1, 0.5, 4, 7, Math.PI * 1.35)),
  wing: colored(new THREE.SphereGeometry(1, 7, 3).scale(1, 0.32, 0.06)),
  dome: colored(new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2)),
  gem: colored(new THREE.OctahedronGeometry(1, 0), (x, y, z, f) => [1.3, 1, 0.85, 1.1][f % 4]),
};
