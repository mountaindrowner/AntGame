// A toad: a squat, warty brown body, gold eyes, folded back legs. Built along
// +X (mouth forward), sitting on y = 0, about 2 units long. The tongue is its
// own mesh along +X from the mouth, scaled to reach.
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
// Warts: darker and lighter blotches on the back.
const skin = (x, y, z) => {
  const n = Math.sin(x * 9.1 + z * 4.3) * Math.cos(z * 8.7 - x * 3.1);
  if (y < 0.12) return '#c8b07a';
  return n > 0.55 ? '#4a3a22' : n < -0.6 ? '#9a8452' : '#76623a';
};

export function toad() {
  const mat = psx({ vertexColors: true });
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  body.add(new THREE.Mesh(paint(new THREE.SphereGeometry(1, 12, 8).scale(0.9, 0.5, 0.72).translate(0, 0.42, 0), skin), mat));
  // Head: wide and flat, with the mouth line and two bulging eyes.
  body.add(new THREE.Mesh(paint(new THREE.SphereGeometry(1, 10, 6).scale(0.48, 0.3, 0.58).translate(0.72, 0.5, 0), (x, y, z) => (y < 0.42 ? '#c8b07a' : skin(x, y, z))), mat));
  for (const s of [-1, 1]) {
    body.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.15, 8, 6).translate(0.8, 0.78, s * 0.3), '#d8a028'), mat));
    body.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.08, 6, 4).translate(0.9, 0.8, s * 0.33), '#0a0a0a'), mat));
    // Back legs folded at the hips, front legs propping it up.
    body.add(new THREE.Mesh(paint(new THREE.SphereGeometry(1, 8, 5).scale(0.5, 0.22, 0.24).translate(-0.45, 0.2, s * 0.68), skin), mat));
    body.add(new THREE.Mesh(paint(new THREE.BoxGeometry(0.42, 0.05, 0.22).translate(-0.1, 0.03, s * 0.86), '#a8925e'), mat));
    body.add(new THREE.Mesh(paint(new THREE.CylinderGeometry(0.07, 0.08, 0.4, 5).rotateZ(0.35).translate(0.55, 0.2, s * 0.42), '#8a7446'), mat));
    body.add(new THREE.Mesh(paint(new THREE.BoxGeometry(0.2, 0.04, 0.16).translate(0.66, 0.02, s * 0.45), '#a8925e'), mat));
  }
  const tongue = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.05, 0.05, 1, 5).rotateZ(-Math.PI / 2).translate(0.5, 0, 0), '#e06a7a'), mat);
  tongue.position.set(1.05, 0.38, 0);
  tongue.visible = false;
  body.add(tongue);
  return { group: g, body, tongue };
}

// A falling acorn, 1 unit long, point down.
export function fallingAcorn() {
  const mat = psx({ vertexColors: true });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.36, 10, 8).scale(1, 1.35, 1).translate(0, 0.46, 0), (x, y) => (y < 0.25 ? '#8a5a2a' : '#a8743a')), mat));
  g.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.8, 0), (x, y, z) => (Math.sin(x * 40) * Math.sin(z * 40) > 0 ? '#6a5236' : '#5a4430')), mat));
  g.add(new THREE.Mesh(paint(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 4).translate(0, 1.28, 0), '#4a3824'), mat));
  return g;
}
