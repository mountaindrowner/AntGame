// A robin: grey-brown back, orange breast, yellow beak. Built along +X (beak
// forward), standing on y = 0, about 2 units long; the head and each wing are
// their own pivots so it can peck and flap.
import * as THREE from 'three';
import { psx } from '../ps1/materials.js';

const col = new THREE.Color();
function paint(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    col.set(typeof fn === 'function' ? fn(x, y, z) : fn);
    for (let k = 0; k < 3; k++) c.set([col.r, col.g, col.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

export function robin() {
  const mat = psx({ vertexColors: true });
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.62;
  g.add(body);
  body.add(new THREE.Mesh(paint(new THREE.SphereGeometry(1, 12, 8).scale(0.95, 0.52, 0.48), (x, y) => (y < 0.05 && x > -0.45 ? '#e2702e' : y < -0.3 ? '#f0e4d0' : '#5a4e44')), mat));
  const tail = new THREE.Mesh(paint(new THREE.BoxGeometry(0.75, 0.06, 0.32).translate(-0.37, 0, 0), '#3e3630'), mat);
  tail.position.set(-0.75, 0.12, 0);
  tail.rotation.z = 0.35;
  body.add(tail);
  const head = new THREE.Group();
  head.position.set(0.7, 0.32, 0);
  body.add(head);
  head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.36, 10, 8), (x, y) => (y < -0.12 && x > 0 ? '#e2702e' : '#3a322c')), mat));
  head.add(new THREE.Mesh(paint(new THREE.ConeGeometry(0.09, 0.42, 6).rotateZ(-Math.PI / 2).translate(0.5, -0.04, 0), '#f2c030'), mat));
  for (const s of [-1, 1]) {
    head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.085, 6, 4).translate(0.2, 0.1, s * 0.27), '#f4f0e8'), mat));
    head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.055, 6, 4).translate(0.24, 0.1, s * 0.31), '#0a0a0a'), mat));
  }
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.1, 0.18, s * 0.38);
    pivot.add(new THREE.Mesh(paint(new THREE.SphereGeometry(1, 8, 4).scale(0.7, 0.08, 0.34).translate(-0.25, 0, s * 0.22), (x) => (x < -0.6 ? '#2e2824' : '#4a4038')), mat));
    body.add(pivot);
    return { pivot, s };
  });
  for (const s of [-1, 1]) {
    g.add(new THREE.Mesh(paint(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 4).translate(0.05, 0.21, s * 0.16), '#8a6a3a'), mat));
    g.add(new THREE.Mesh(paint(new THREE.BoxGeometry(0.3, 0.02, 0.05).translate(0.12, 0.01, s * 0.16), '#8a6a3a'), mat));
  }
  return { group: g, body, head, wings };
}
