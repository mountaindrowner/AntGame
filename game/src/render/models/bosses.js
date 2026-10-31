// Build 19: the bosses, and the pieces of the events. Vertex-coloured, baked
// poses, like the spider (bugs.js) and the small creatures (critters.js).
//   hornwormSegment: the tomato hornworm, a chain of fat green rings with
//     white diagonal stripes, eye spots and a red horn on its last ring.
//   beetleGeometry: a glossy black ground beetle with a blue sheen on its
//     ridged wing cases and big curved jaws. Walk frames, a charge (head
//     down, legs driving) and a daze (legs splayed and kicking).
//   antlionGeometry: the antlion queen, a fat bristly sand-coloured larva
//     with huge toothed sickle jaws, open or shut.
//   stalk: a Cordyceps fruiting body, a dead ant at its foot.
//   alate: a winged queen ant fallen on the ground (Swarm day).
// Local frame: +X forward, +Y up, +Z left; origin on the ground.
import * as THREE from 'three';
import { paint, blob, strut, bake, hash } from './bugs.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function leg(hip, foot, up, r0, r1, c0, c1) {
  const knee = hip.clone().lerp(foot, 0.42);
  knee.y = Math.max(hip.y, foot.y) + up;
  return [strut(hip, knee, r0, r0 * 0.8, c0, 4), strut(knee, foot, r0 * 0.8, r1, c1 || c0, 3)];
}

// ---------- hornworm ----------
export const HORN_SEGMENTS = 13;
const HW = { green: '#6fb83e', dark: '#4e8f2a', belly: '#9fd06a', stripe: '#f2f2dc', edge: '#1e3a12', spot: '#141c10', horn: '#c8341e', hornTip: '#2a1008', head: '#7cc24a' };
export function hornwormSegment(kind) {
  const parts = [];
  if (kind === 'head') {
    parts.push(blob([0.25, 0, 0], [0.9, 0.85, 0.85], [10, 8], (x, y) => (y < -0.35 ? HW.belly : HW.head)));
    for (const side of [-1, 1]) {
      parts.push(blob([0.75, 0.15, side * 0.45], [0.16, 0.16, 0.16], [4, 3], HW.spot));
      parts.push(strut(V(0.95, -0.4, side * 0.22), V(1.2, -0.62, side * 0.08), 0.12, 0.05, '#2a3a18', 3));
    }
    return bake(parts);
  }
  // A fat, slightly lumpy ring with a white diagonal stripe edged in black,
  // a dark spiracle on each side, prolegs underneath.
  parts.push(blob([0, 0, 0], [1, 1, 1.05], [12, 9], (x, y, z) => {
    if (y < -0.45) return HW.belly;
    const az = Math.abs(z), diag = x * 0.9 + y * 0.6;
    if (az > 0.35 && y > -0.4 && Math.abs(diag) < 0.16) return HW.stripe;
    if (az > 0.35 && y > -0.4 && Math.abs(diag) < 0.28) return HW.edge;
    if (az > 0.85 && y < -0.05 && y > -0.35 && Math.abs(x) < 0.18) return HW.spot;
    return (hash(Math.floor((x + 2) * 6) * 13 + Math.floor((y + 2) * 6) * 7 + Math.floor((z + 2) * 6)) < 0.25) ? HW.dark : HW.green;
  }));
  for (const side of [-1, 1]) parts.push(strut(V(0.05, -0.6, side * 0.42), V(0.12, -1.02, side * 0.55), 0.24, 0.2, HW.dark, 4));
  if (kind === 'tail') {
    // The horn: a curved red spike, black at the tip.
    const h0 = V(-0.35, 0.75, 0), h1 = V(-0.75, 1.55, 0), h2 = V(-1.35, 1.95, 0);
    parts.push(strut(h0, h1, 0.26, 0.18, HW.horn, 5), strut(h1, h2, 0.18, 0.05, HW.hornTip, 5));
  }
  return bake(parts);
}

// ---------- ground beetle ----------
const GB = { shell: '#14141c', sheen: '#34407a', rim: '#4a5ea8', dark: '#08080c', leg: '#1a1a22', jaw: '#241c14', eye: '#3a2a20' };
export const BEETLE_FRAMES = 4;
// pose: 'walk' (frame 0..3), 'stand', 'charge' (frame 0..3), 'dazed' (frame 0..1)
export function beetleGeometry(pose, frame = 0) {
  const parts = [], charge = pose === 'charge', dazed = pose === 'dazed';
  const lift = charge ? -0.5 : 0;
  // Wing cases: a long glossy dome with ridges, and a blue sheen on the rims.
  parts.push(blob([-2.2, 3.0 + lift, 0], [5.2, 2.0, 3.3], [14, 8], (x, y, z) => {
    const az = Math.abs(z);
    if (y < 2.0 + lift) return GB.dark;
    if (az < 0.14) return GB.dark; // the seam
    if (Math.floor(az * 3.2) % 2 === 0 && y > 3.2 + lift) return GB.sheen;
    if (az > 2.6) return GB.rim;
    return GB.shell;
  }));
  // Pronotum and head, lowered when it charges.
  const hy = charge ? 1.7 : 2.6;
  parts.push(blob([3.2, hy + 0.4, 0], [1.6, 1.3, 2.3], [10, 6], (x, y, z) => (Math.abs(z) > 1.8 ? GB.rim : GB.shell)));
  parts.push(blob([5.0, hy, 0], [1.2, 0.9, 1.4], [8, 6], GB.shell));
  for (const side of [-1, 1]) {
    parts.push(blob([5.6, hy + 0.35, side * 0.95], [0.32, 0.32, 0.32], [5, 4], GB.eye));
    // Jaws: big curved sickles, crossing at the tips.
    const j0 = V(5.9, hy - 0.2, side * 0.6), j1 = V(7.3, hy - 0.3, side * 1.0), j2 = V(8.2, hy - 0.35, side * -0.15);
    parts.push(strut(j0, j1, 0.4, 0.3, GB.jaw, 4), strut(j1, j2, 0.3, 0.06, GB.jaw, 4));
    // Antennae.
    const a0 = V(5.8, hy + 0.5, side * 0.7), a1 = V(7.6, hy + 2.2, side * 2.2), a2 = V(9.6, hy + 2.0, side * 3.4);
    parts.push(strut(a0, a1, 0.12, 0.1, GB.leg, 3), strut(a1, a2, 0.1, 0.06, GB.leg, 3));
  }
  // Six long legs.
  const HIPS = [[3.4, 1.4], [2.0, 1.6], [0.6, 1.6]], FEET = [[6.4, 4.6], [2.2, 5.8], [-3.8, 5.2]];
  const ph = (frame / BEETLE_FRAMES) * Math.PI * 2;
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const p = ph + ((i + (side > 0 ? 1 : 0)) % 2 ? Math.PI : 0);
    let fx = FEET[i][0], fz = FEET[i][1], fy = 0;
    if (pose === 'walk' || charge) { fx += Math.sin(p) * (charge ? 2.2 : 1.2); fy = Math.max(0, Math.cos(p)) * (charge ? 1.4 : 0.9); }
    if (charge) fx -= 1.2;
    if (dazed) { fz += 1.5; fy = 1.2 + (frame ? (i % 2 ? 1.6 : 0) : (i % 2 ? 0 : 1.6)); fx += (frame ? 1 : -1) * (i - 1) * 0.8; }
    parts.push(...leg(V(HIPS[i][0], 1.9 + lift, side * HIPS[i][1]), V(fx, fy, side * fz), 2.4, 0.42, 0.14, GB.leg));
  }
  return bake(parts);
}

// ---------- antlion queen ----------
const AL = { body: '#8e7c58', dark: '#5a4a32', spot: '#3a2e1e', bristle: '#c8b48a', jaw: '#3a2414', tooth: '#d8c8a0', head: '#6a5636' };
export function antlionGeometry(open) {
  const parts = [];
  // A fat, round, bristly abdomen, spotted.
  parts.push(blob([-2.6, 2.4, 0], [4.2, 2.6, 3.6], [12, 9], (x, y, z) => {
    if (y < 0.8) return AL.dark;
    const k = Math.floor((x + 9) * 1.1) * 31 + Math.floor((z + 9) * 1.1) * 7 + Math.floor(y * 1.2);
    return hash(k) < 0.22 ? AL.spot : AL.body;
  }));
  for (let k = 0; k < 26; k++) { const u = hash(k * 3 + 5), v = hash(k * 7 + 9), th = u * Math.PI * 2, ph = 0.3 + v * 1.1;
    const n = V(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)), base = V(-2.6 + n.x * 4.0, 2.4 + n.y * 2.5, n.z * 3.4);
    parts.push(strut(base, base.clone().addScaledVector(n, 0.9), 0.1, 0.03, AL.bristle, 3)); }
  // Thorax and a small flat head.
  parts.push(blob([1.6, 1.9, 0], [1.6, 1.3, 1.9], [9, 6], AL.body));
  parts.push(blob([3.3, 1.7, 0], [1.1, 0.7, 1.3], [8, 5], AL.head));
  // Huge toothed sickle jaws, wide open or snapped shut.
  for (const side of [-1, 1]) {
    const spread = open ? 1.8 : 0.4;
    const j0 = V(3.9, 1.7, side * 0.7), j1 = V(5.8, 1.9, side * (0.9 + spread)), j2 = V(7.6, 1.8, side * (0.4 + spread * 0.4)), j3 = V(8.2, 1.7, side * (open ? 0.6 : -0.2));
    parts.push(strut(j0, j1, 0.42, 0.34, AL.jaw, 4), strut(j1, j2, 0.34, 0.22, AL.jaw, 4), strut(j2, j3, 0.22, 0.04, AL.jaw, 4));
    for (let t = 0; t < 3; t++) { const p = j1.clone().lerp(j2, 0.2 + t * 0.3); parts.push(strut(p, p.clone().add(V(0.15, 0, -side * 0.55)), 0.09, 0.02, AL.tooth, 3)); }
    parts.push(blob([3.6, 2.15, side * 0.75], [0.22, 0.22, 0.22], [4, 3], '#120c08'));
    // Short, stubby legs.
    for (let i = 0; i < 3; i++) parts.push(...leg(V(1.6 - i * 0.9, 1.2, side * 1.3), V(2.2 - i * 1.4, 0, side * 3.0), 0.8, 0.3, 0.12, AL.dark));
  }
  return bake(parts);
}

// ---------- Cordyceps ----------
// A unit-high stalk with a swollen orange head, on a curled dead ant.
export function stalkGeometry() {
  const parts = [];
  parts.push(blob([0, 0.6, 0], [1.6, 0.6, 0.9], [8, 5], '#3a2a1e'));
  parts.push(blob([1.5, 0.55, 0], [0.7, 0.55, 0.6], [6, 4], '#2a1e14'));
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) parts.push(strut(V(-0.4 + i * 0.5, 0.6, side * 0.4), V(-0.2 + i * 0.4, 1.3, side * 1.1), 0.08, 0.05, '#2a1e14', 3));
  const s0 = V(1.5, 0.9, 0), s1 = V(1.9, 4.5, 0.3), s2 = V(1.6, 8.5, -0.2);
  parts.push(strut(s0, s1, 0.32, 0.24, '#b8862e', 5), strut(s1, s2, 0.24, 0.2, '#c89a3a', 5));
  parts.push(blob([1.6, 9.4, -0.2], [0.75, 1.3, 0.75], [8, 6], (x, y) => (y > 9.8 ? '#e8a040' : '#d2782a')));
  return bake(parts);
}

// ---------- a winged queen (Swarm day) ----------
export function alateGeometry() {
  const parts = [];
  parts.push(blob([-1.4, 0.7, 0], [1.5, 0.75, 0.85], [8, 5], '#3a2618'));
  parts.push(blob([0.5, 0.75, 0], [0.8, 0.6, 0.6], [6, 4], '#4a3020'));
  parts.push(blob([1.5, 0.75, 0], [0.55, 0.5, 0.55], [6, 4], '#2a1a10'));
  for (const side of [-1, 1]) for (const [x, len, ang] of [[0.6, 3.4, 0.35], [0.3, 2.6, 0.75]]) {
    const g = new THREE.SphereGeometry(1, 6, 2).scale(len / 2, 0.04, 0.6).rotateY(side * ang).translate(x - Math.cos(ang) * len / 2, 1.25, side * (0.4 + Math.sin(ang) * len / 2));
    parts.push(paint(g, '#d8dce0'));
  }
  return bake(parts);
}
