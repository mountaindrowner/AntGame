// The sneaker that comes down on the yard: in the opening film, and on the
// Back Steps, the Grill and the Swing Set in play.
import * as THREE from 'three';
import { psx } from '../ps1/materials.js';
import { rampTexture } from '../ps1/textures.js';

// A red canvas high-top: a footprint-shaped sole with toe spring, a white
// rubber toe cap, a canvas upper rising to a padded ankle collar, a tongue,
// criss-cross laces and a side stripe. Toe points to -X, length 600.
export function sneaker() {
  const g = new THREE.Group();
  const foot = new THREE.Shape();
  foot.moveTo(-300, 0);
  foot.quadraticCurveTo(-300, 100, -170, 108); foot.quadraticCurveTo(-40, 112, 40, 80);
  foot.quadraticCurveTo(150, 72, 230, 88); foot.quadraticCurveTo(302, 92, 302, 0);
  foot.quadraticCurveTo(302, -92, 230, -88); foot.quadraticCurveTo(150, -72, 40, -80);
  foot.quadraticCurveTo(-40, -112, -170, -108); foot.quadraticCurveTo(-300, -100, -300, 0);
  // Extrude a footprint upward (shape XY → world XZ, depth → +Y).
  const slab = (shape, depth, sx, sz, y) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 1, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2); geo.scale(sx, 1, sz); geo.translate(0, y, 0);
    return geo;
  };
  // Toe spring: the front of everything curls up a little.
  const spring = (geo) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x < -140) p.setY(i, p.getY(i) + ((-140 - x) / 160) ** 2 * 30); } geo.computeVertexNormals(); return geo; };
  const add = (geo, color, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, psx({ color })); m.position.set(x, y, z); g.add(m); return m; };
  add(spring(slab(foot, 10, 1, 1, 0)), '#2a2420');              // rubber outsole
  add(spring(slab(foot, 26, 0.99, 0.99, 10)), '#f1ede4');        // white midsole
  add(spring(slab(foot, 66, 0.92, 0.9, 36)), '#c8302a');         // canvas vamp
  const toe = add(spring(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(118, 62, 96)), '#f1ede4', -200, 36, 0);
  toe.rotation.y = 0;
  // The high ankle: an oval column at the heel, its top sloping up toward the back.
  const ankle = new THREE.Shape(); ankle.absellipse(165, 0, 142, 90, 0, Math.PI * 2);
  const back = slab(ankle, 118, 1, 1, 36);
  const bp = back.attributes.position;
  for (let i = 0; i < bp.count; i++) if (bp.getY(i) > 100) bp.setY(i, bp.getY(i) + (bp.getX(i) - 25) / 280 * 34);
  back.computeVertexNormals();
  add(back, '#c8302a');
  // Padded collar and the dark opening for the foot.
  const collar = add(new THREE.TorusGeometry(1, 0.13, 6, 20).rotateX(Math.PI / 2), '#f1ede4', 180, 178, 0);
  collar.scale.set(112, 60, 74); collar.rotation.z = -0.12;
  const hole = add(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), '#1a1210', 180, 179, 0);
  hole.scale.set(100, 1, 64); hole.rotation.z = -0.12;
  // Tongue rising from the vamp to the collar, with criss-cross laces on it.
  const tongue = add(new THREE.BoxGeometry(170, 12, 86), '#b8281e', -10, 128, 0);
  tongue.rotation.z = 0.42;
  for (let i = 0; i < 5; i++) {
    const x = -80 + i * 34, y = 104 + i * 15;
    for (const sgn of [-1, 1]) { const lace = add(new THREE.BoxGeometry(10, 6, 112), '#f8f6f0', x, y, 0); lace.rotation.set(0, sgn * 0.42, 0.42); }
  }
  // A white stripe sweeping back along each side, and a heel tab.
  for (const side of [-1, 1]) {
    const stripe = add(new THREE.BoxGeometry(260, 16, 4), '#f1ede4', 60, 72, side * 93);
    stripe.rotation.z = 0.12;
  }
  add(new THREE.BoxGeometry(14, 60, 40), '#f1ede4', 306, 150, 0);
  // And the person in it: a white sock, then a jeans leg with a rolled cuff
  // and orange seam stitching, leaning back a little, up out of shot.
  add(new THREE.CylinderGeometry(64, 70, 44, 16), '#f4f0e8', 180, 196, 0);
  const leg = new THREE.Group();
  leg.position.set(180, 214, 0);
  leg.rotation.z = 0.1;
  g.add(leg);
  const denim = (seed, ramp, rep) => psx({ map: rampTexture(seed, ramp, { size: 16, repeat: rep }) });
  const jeans = new THREE.Mesh(new THREE.CylinderGeometry(92, 80, 2400, 16, 1, true).translate(0, 1220, 0), denim(41, ['#28426c', '#2f4c80', '#37578e', '#40629a'], [3, 30]));
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(98, 100, 50, 16).translate(0, 26, 0), denim(43, ['#4a6aa0', '#5878ac', '#6684b6', '#7290be'], [3, 1]));
  leg.add(jeans, cuff);
  for (const side of [-1, 1]) { const seam = new THREE.Mesh(new THREE.BoxGeometry(5, 2400, 5), psx({ color: '#c8964a' })); seam.position.set(0, 1250, side * 87); leg.add(seam); }
  return g;
}
