// Small low-poly props shared by both views. Unit-sized; scale per use.
import * as THREE from 'three';

function colored(g, k = 1) {
  g = g.index ? g.toNonIndexed() : g;
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(k), 3));
  g.computeVertexNormals();
  return g;
}

export const PROPS = {
  crumb: colored(new THREE.DodecahedronGeometry(1, 0)),
  seed: colored(new THREE.SphereGeometry(1, 5, 3).scale(1.5, 0.8, 0.9)),
  dew: colored(new THREE.SphereGeometry(1, 6, 4)),
  puddle: colored(new THREE.CylinderGeometry(1, 1, 0.12, 9)),
  pebble: colored(new THREE.DodecahedronGeometry(1, 0).scale(1, 0.7, 1)),
  meat: colored(new THREE.IcosahedronGeometry(1, 0).scale(1.2, 0.8, 1)),
  ring: colored(new THREE.RingGeometry(0.8, 1, 10).rotateX(-Math.PI / 2)),
  egg: colored(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.72, 0.8)),
  box: colored(new THREE.BoxGeometry(1, 1, 1)),
  cone: colored(new THREE.ConeGeometry(1, 1, 6)),
  quad: colored(new THREE.PlaneGeometry(1, 1)),
  cyl: colored(new THREE.CylinderGeometry(1, 1, 1, 6)),
  // Room furniture.
  torus: colored(new THREE.TorusGeometry(1, 0.38, 4, 9).rotateX(Math.PI / 2)),
  thorn: colored(new THREE.ConeGeometry(0.35, 1, 4)),
  leaf: colored(new THREE.SphereGeometry(1, 6, 3).scale(1, 0.12, 0.45)),
  larva: colored(new THREE.TorusGeometry(1, 0.5, 4, 7, Math.PI * 1.35)),
  wing: colored(new THREE.SphereGeometry(1, 7, 3).scale(1, 0.32, 0.06)),
  dome: colored(new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2)),
  gem: colored(new THREE.OctahedronGeometry(1, 0)),
};

// Which prop and colour a sim item draws as.
export function itemLook(f, COLORS) {
  if (f.kind === 'water') {
    if (f.type === 'puddle') return { geo: PROPS.puddle, color: COLORS.water, r: Math.min(14, 6 + f.amt * 0.12), flat: true };
    return { geo: PROPS.dew, color: COLORS.water, r: Math.min(6, 2.2 + f.amt * 0.2) };
  }
  if (f.kind === 'grit') return { geo: PROPS.pebble, color: COLORS.grit, r: 2.6 };
  if (f.kind === 'protein') return { geo: PROPS.meat, color: COLORS.protein, r: Math.min(6, 2.5 + f.amt * 0.08) };
  if (f.type === 'seed') return { geo: PROPS.seed, color: COLORS.seed, r: Math.min(4.5, 1.8 + f.amt * 0.15) };
  return { geo: PROPS.crumb, color: COLORS.food, r: Math.min(5, 2 + f.amt * 0.16) };
}
