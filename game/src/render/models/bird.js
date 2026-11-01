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

// Build 21's model pass: a proper American robin. A teardrop body, full
// in the chest; brick-orange breast running down to a white belly; grey-
// brown back; near-black head with a broken white eye ring and a streaked
// white throat; layered wing feathers with pale edges; a fanned dark tail.
const RB = { back: '#5e554c', back2: '#6c6258', head: '#26211d', breast: '#c8582a', breast2: '#e07a3a', belly: '#f2ece0', wing: '#4e463e', edge: '#9a8e80', tail: '#2e2824', beak: '#f2c030', leg: '#9a7a4a' };
export function robin() {
  const mat = psx({ vertexColors: true });
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.62;
  g.add(body);
  // Teardrop: a fat front, tapering to the tail.
  const bg = new THREE.SphereGeometry(1, 14, 10).scale(0.95, 0.55, 0.5);
  { const p = bg.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), t = x < 0 ? 1 + x * 0.35 : 1 + x * 0.08; p.setY(k, p.getY(k) * t); p.setZ(k, p.getZ(k) * t); } }
  body.add(new THREE.Mesh(paint(bg, (x, y, z) => {
    if (y < -0.32 && x < 0.2) return RB.belly;
    if (y < 0.12 && x > -0.5) return x > 0.35 && y > -0.1 ? RB.breast2 : RB.breast;
    return Math.abs(z) < 0.14 && y > 0.4 ? RB.back : RB.back2;
  }), mat));
  // A fanned tail, a little up.
  const tail = new THREE.Group(); tail.position.set(-0.78, 0.12, 0); tail.rotation.z = 0.32; body.add(tail);
  for (let k = -2; k <= 2; k++) tail.add(new THREE.Mesh(paint(new THREE.BoxGeometry(0.72, 0.05, 0.12).translate(-0.36, 0, 0).rotateY(k * 0.12), k % 2 ? RB.tail : '#3a322c'), mat));
  const head = new THREE.Group();
  head.position.set(0.72, 0.36, 0);
  body.add(head);
  head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.37, 12, 9), (x, y, z) => (y < -0.2 && x > 0.12 && Math.abs(z) < 0.12 ? '#e8e0d0' : RB.head)), mat));
  head.add(new THREE.Mesh(paint(new THREE.ConeGeometry(0.085, 0.44, 6).rotateZ(-Math.PI / 2).translate(0.5, -0.05, 0), (x, y) => (y > -0.04 ? '#d8a020' : RB.beak)), mat));
  for (const s of [-1, 1]) {
    // A white eye ring round a black eye with a glint.
    head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.088, 8, 6).translate(0.2, 0.11, s * 0.29), '#f4f0e8'), mat));
    head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.06, 8, 6).translate(0.225, 0.11, s * 0.33), '#060606'), mat));
    head.add(new THREE.Mesh(paint(new THREE.SphereGeometry(0.018, 4, 3).translate(0.24, 0.13, s * 0.355), '#ffffff'), mat));
  }
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.12, 0.2, s * 0.4);
    // Coverts over primaries: two layers, each feather row edged paler.
    pivot.add(new THREE.Mesh(paint(new THREE.SphereGeometry(1, 10, 4).scale(0.74, 0.07, 0.34).translate(-0.3, -0.02, s * 0.2), (x) => (x < -0.75 ? '#2a2420' : (Math.floor((x + 2) * 6) % 2 ? RB.wing : '#5a5046'))), mat));
    pivot.add(new THREE.Mesh(paint(new THREE.SphereGeometry(1, 8, 3).scale(0.42, 0.06, 0.28).translate(-0.05, 0.03, s * 0.18), (x, y, z) => (Math.abs(z) > 0.38 ? RB.edge : RB.back2)), mat));
    body.add(pivot);
    return { pivot, s };
  });
  for (const s of [-1, 1]) {
    g.add(new THREE.Mesh(paint(new THREE.CylinderGeometry(0.03, 0.035, 0.42, 5).translate(0.05, 0.21, s * 0.16), RB.leg), mat));
    for (const a of [-0.5, 0, 0.5]) g.add(new THREE.Mesh(paint(new THREE.BoxGeometry(0.24, 0.02, 0.035).translate(0.12, 0.01, 0).rotateY(a).translate(0.05, 0, s * 0.16), RB.leg), mat));
  }
  return { group: g, body, head, wings };
}
