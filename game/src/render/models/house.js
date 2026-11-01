// Build 21: the back of the house, outside only for now (the inside comes
// later). The house is built from one layout, HOUSE_LAYOUT, which the
// interior will share: its footprint, the floor (level with the top of the
// back steps), the wall thickness, the height to the eaves, and where every
// door and window is. The walls are real walls with real openings, so a
// door can open and the rooms can later be fitted inside; the roof is its
// own group, so an interior view can lift it off.
//
// World frame (the yard's): X along the house, Y up, Z toward the yard. The
// house's back wall faces the yard at Z = front; the house runs back to
// Z = front - depth. Sizes are in px (S = the yard's scale, T = px a tile).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { psx, psxBasic } from '../ps1/materials.js';
import { canvasTexture } from '../ps1/textures.js';

const col = new THREE.Color();
function paint(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    col.set(typeof fn === 'function' ? fn(x, y, z, i / 3) : fn);
    for (let k = 0; k < 3; k++) c.set([col.r, col.g, col.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
const box = (w, h, d, x, y, z, color) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);
// UVs from world position, projected along each face's main axis, so one
// texture tiles evenly over every wall, opening reveal and gable.
function worldUV(geo, scale) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      const [u, w] = az >= ax && az >= ay ? [v.x, v.y] : ax >= ay ? [v.z, v.y] : [v.x, v.z];
      uv[(i + k) * 2] = u / scale; uv[(i + k) * 2 + 1] = w / scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
const merge = (parts) => { const g = mergeGeometries(parts.map((q) => (q.index ? q.toNonIndexed() : q))); g.computeVertexNormals(); return g; };

// The layout the interior will share. wall: the yard's 'wall' landmark (the
// house's back wall along the top of the yard); steps: the back steps.
export function houseLayout(wall, steps, S, T) {
  const x0 = wall.x0 * T, x1 = (wall.x0 + wall.w) * T, doorX = steps ? (steps.x0 + steps.w / 2) * T : (x0 + x1) / 2;
  const floorY = 210 * S, wallH = 900 * S;
  const L = {
    x0, x1, front: T, depth: 240 * T, wallT: 14 * S,
    floorY, eaveY: floorY + wallH, overhang: 60 * S, pitch: 0.42,
    // Openings in the back wall: the back door at the top of the steps, then
    // windows, wide ones for the kitchen and living room, a small bathroom one.
    doors: [{ x: doorX, w: 190 * S, h: 520 * S, room: 'kitchen' }],
    windows: [],
    basement: [],
  };
  const win = (x, w, h, room) => L.windows.push({ x, w, h, sill: floorY + 230 * S, room });
  win(doorX + 260 * S, 260 * S, 260 * S, 'kitchen');
  for (const [k, room] of [[-0.62, 'den'], [-0.38, 'laundry']]) win(doorX + (doorX - x0) * k, 180 * S, 300 * S, room);
  const span = x1 - doorX;
  for (const [f, w, room] of [[0.22, 380, 'living'], [0.42, 380, 'living'], [0.6, 120, 'bath'], [0.76, 200, 'bedroom'], [0.92, 200, 'bedroom']]) win(doorX + span * f, w * S, room === 'bath' ? 150 * S : 300 * S, room);
  for (const f of [0.12, 0.33, 0.52, 0.7, 0.88]) L.basement.push({ x: x0 + (x1 - x0) * f, w: 90 * S, h: 46 * S, y: 70 * S });
  return L;
}

const sidingTex = () => canvasTexture(32, 32, (c) => {
  for (let y = 0; y < 32; y += 8) {
    c.fillStyle = '#e8e0cc'; c.fillRect(0, y, 32, 8);
    c.fillStyle = '#f4eedc'; c.fillRect(0, y, 32, 2);
    c.fillStyle = '#b8ae98'; c.fillRect(0, y + 7, 32, 1);
  }
  c.fillStyle = '#d8d0bc'; c.fillRect(9, 2, 1, 5); c.fillRect(25, 18, 1, 5);
});
const brickTex = () => canvasTexture(32, 16, (c) => {
  c.fillStyle = '#6a5a4e'; c.fillRect(0, 0, 32, 16);
  c.fillStyle = '#9a4632'; c.fillRect(1, 1, 14, 6); c.fillRect(17, 1, 14, 6);
  c.fillStyle = '#8a3a2a'; c.fillRect(-7, 9, 14, 6); c.fillRect(9, 9, 14, 6); c.fillRect(25, 9, 14, 6);
  c.fillStyle = '#a85440'; c.fillRect(3, 2, 4, 1); c.fillRect(12, 10, 4, 1);
});
const shingleTex = () => canvasTexture(32, 32, (c) => {
  for (let y = 0; y < 32; y += 8) {
    const off = (y / 8) % 2 ? 4 : 0;
    for (let x = -8; x < 32; x += 8) { const s = ((x + y * 3) % 5) * 4; c.fillStyle = `rgb(${62 + s},${60 + s},${64 + s})`; c.fillRect(x + off, y, 7, 7); }
    c.fillStyle = '#2a282c'; c.fillRect(0, y + 7, 32, 1);
  }
});

// The outside of the house as a group: 'shell' (walls), 'roof', 'trim'
// (doors, windows, gutters, fittings), 'glass'.
export function buildHouse(L, S, T) {
  const g = new THREE.Group(); g.name = 'house';
  const { x0, x1, front, depth, wallT, floorY, eaveY } = L, back = front - depth, W = x1 - x0;
  const sid = [], brick = [], trim = [], glass = [], roofG = [], roofTrim = [];
  // Concrete foundation, proud of the wall, along the front and round the sides.
  trim.push(box(W + 12 * S, 34 * S, wallT + 6 * S, x0 + W / 2, 17 * S, front - wallT / 2 + 3 * S, (x, y, z, f) => ((f * 7) % 5 === 0 ? '#9a968c' : '#aaa69c')));
  // Brick skirt from the foundation up to the floor, with basement windows cut in.
  const skirt = (a, b) => b > a && brick.push(new THREE.BoxGeometry(b - a, floorY - 34 * S, wallT).translate((a + b) / 2, 34 * S + (floorY - 34 * S) / 2, front - wallT / 2));
  let cx = x0;
  for (const bw of [...L.basement].sort((p, q) => p.x - q.x)) {
    skirt(cx, bw.x - bw.w / 2); cx = bw.x + bw.w / 2;
    brick.push(new THREE.BoxGeometry(bw.w, bw.y - 34 * S, wallT).translate(bw.x, 34 * S + (bw.y - 34 * S) / 2, front - wallT / 2));
    brick.push(new THREE.BoxGeometry(bw.w, floorY - bw.y - bw.h, wallT).translate(bw.x, bw.y + bw.h + (floorY - bw.y - bw.h) / 2, front - wallT / 2));
    // The basement window: a dark pane in a grey frame, set back.
    trim.push(box(bw.w, bw.h, 3 * S, bw.x, bw.y + bw.h / 2, front - wallT * 0.7, (x, y) => (y > bw.y + bw.h * 0.6 && x < bw.x ? '#5a6a7a' : '#1e2630')));
    for (const [w, h, dx, dy] of [[bw.w + 8 * S, 6 * S, 0, -3 * S], [bw.w + 8 * S, 6 * S, 0, bw.h + 3 * S], [6 * S, bw.h, -bw.w / 2, bw.h / 2], [6 * S, bw.h, bw.w / 2, bw.h / 2], [4 * S, bw.h, 0, bw.h / 2]]) trim.push(box(w, h, 4 * S, bw.x + dx, bw.y + dy, front - wallT * 0.55, '#8a8a84'));
  }
  skirt(cx, x1);
  // A white trim board along the top of the brick, where the siding starts.
  trim.push(box(W + 8 * S, 10 * S, wallT + 4 * S, x0 + W / 2, floorY + 5 * S, front - wallT / 2 + 2 * S, '#f2eee4'));
  // The back wall above the floor: siding, built round its openings.
  const holes = [...L.doors.map((d) => ({ x: d.x, w: d.w, y0: floorY, y1: floorY + d.h })), ...L.windows.map((w) => ({ x: w.x, w: w.w, y0: w.sill, y1: w.sill + w.h }))].sort((p, q) => p.x - q.x);
  const wallBox = (a, b, y0, y1) => b > a && y1 > y0 && sid.push(new THREE.BoxGeometry(b - a, y1 - y0, wallT).translate((a + b) / 2, (y0 + y1) / 2, front - wallT / 2));
  cx = x0;
  for (const h of holes) { wallBox(cx, h.x - h.w / 2, floorY + 10 * S, eaveY); wallBox(h.x - h.w / 2, h.x + h.w / 2, floorY + 10 * S, h.y0); wallBox(h.x - h.w / 2, h.x + h.w / 2, h.y1, eaveY); cx = h.x + h.w / 2; }
  wallBox(cx, x1, floorY + 10 * S, eaveY);
  // The other three walls: plain siding over a brick skirt.
  for (const sx of [x0, x1]) { sid.push(new THREE.BoxGeometry(wallT, eaveY - floorY, depth).translate(sx + (sx === x0 ? wallT / 2 : -wallT / 2), (floorY + eaveY) / 2, front - depth / 2)); brick.push(new THREE.BoxGeometry(wallT, floorY, depth).translate(sx + (sx === x0 ? wallT / 2 : -wallT / 2), floorY / 2, front - depth / 2)); }
  sid.push(new THREE.BoxGeometry(W, eaveY - floorY, wallT).translate(x0 + W / 2, (floorY + eaveY) / 2, back + wallT / 2));
  // White corner boards.
  for (const sx of [x0, x1]) trim.push(box(16 * S, eaveY - floorY, 16 * S, sx + (sx === x0 ? 6 * S : -6 * S), (floorY + eaveY) / 2, front - 6 * S, '#f2eee4'));

  // The back door: frame, a blue-grey door with two raised panels below and
  // four panes of glass above, a brass knob and kick plate, a lantern beside it.
  for (const d of L.doors) {
    const dz = front - wallT * 0.5, top = floorY + d.h;
    for (const sx of [-1, 1]) trim.push(box(14 * S, d.h + 14 * S, wallT + 6 * S, d.x + sx * (d.w / 2 + 7 * S), floorY + (d.h + 14 * S) / 2, front - wallT / 2 + 3 * S, '#f2eee4'));
    trim.push(box(d.w + 40 * S, 16 * S, wallT + 8 * S, d.x, top + 8 * S, front - wallT / 2 + 4 * S, '#f2eee4'));
    trim.push(box(d.w, d.h, 6 * S, d.x, floorY + d.h / 2, dz, (x, y) => {
      const lx = Math.abs(x - d.x), ly = y - floorY;
      if (ly > d.h * 0.55 && ly < d.h * 0.92 && lx < d.w * 0.38) return '#2a3442';
      if (ly < d.h * 0.48 && ly > d.h * 0.08 && lx > d.w * 0.06 && lx < d.w * 0.4) return '#3e5670';
      return '#4a6684';
    }));
    // Panes of glass over the dark opening, and the muntins between them.
    glass.push(paint(new THREE.PlaneGeometry(d.w * 0.74, d.h * 0.35).translate(d.x, floorY + d.h * 0.735, dz + 3.2 * S), (x, y) => (x < d.x - d.w * 0.15 && y > floorY + d.h * 0.8 ? '#c8dcea' : '#5a7488')));
    trim.push(box(4 * S, d.h * 0.37, 2 * S, d.x, floorY + d.h * 0.735, dz + 4 * S, '#f2eee4'), box(d.w * 0.76, 4 * S, 2 * S, d.x, floorY + d.h * 0.735, dz + 4 * S, '#f2eee4'));
    trim.push(paint(new THREE.SphereGeometry(7 * S, 8, 5).translate(d.x + d.w * 0.38, floorY + d.h * 0.48, dz + 7 * S), '#d8b040'));
    trim.push(box(d.w * 0.8, 40 * S, 1.5 * S, d.x, floorY + 24 * S, dz + 3.5 * S, '#b8a050'));
    // The porch lantern: a black cage round a warm glass.
    const lx = d.x + d.w / 2 + 70 * S, ly = floorY + 360 * S;
    trim.push(box(26 * S, 8 * S, 26 * S, lx, ly + 50 * S, front + 13 * S, '#1e1e1e'), box(30 * S, 6 * S, 30 * S, lx, ly - 2 * S, front + 13 * S, '#1e1e1e'), box(10 * S, 22 * S, 12 * S, lx, ly + 24 * S, front + 2 * S, '#1e1e1e'));
    glass.push(box(20 * S, 46 * S, 20 * S, lx, ly + 23 * S, front + 13 * S, (x, y) => (y > ly + 34 * S ? '#fff0b0' : '#f0c860')));
  }
  // Windows: a white frame and sill, shutters, glass with a sky reflection,
  // the curtains drawn back at either side, a muntin cross.
  L.windows.forEach((w, i) => {
    const wz = front - wallT * 0.55, cx2 = w.x, cy = w.sill + w.h / 2;
    const curtain = ['#c84a3a', '#e8d8b0', '#6a8ac0', '#7aa868', '#d8a0b8'][i % 5];
    glass.push(paint(new THREE.PlaneGeometry(w.w, w.h, 8, 6).translate(cx2, cy, wz), (x, y) => {
      const u = (x - (cx2 - w.w / 2)) / w.w, v = (y - w.sill) / w.h;
      if (u < 0.16 || u > 0.84) return v > 0.93 ? '#3a3a3a' : curtain;
      if (u + v * 0.4 > 0.25 && u + v * 0.4 < 0.42 && v > 0.45) return '#d8e8f4';
      return v > 0.6 ? '#7a98b0' : '#4a6478';
    }));
    trim.push(box(4 * S, w.h, 3 * S, cx2, cy, wz + 2 * S, '#f2eee4'), box(w.w, 4 * S, 3 * S, cx2, cy, wz + 2 * S, '#f2eee4'));
    for (const sx of [-1, 1]) trim.push(box(12 * S, w.h + 24 * S, wallT + 4 * S, cx2 + sx * (w.w / 2 + 6 * S), cy, front - wallT / 2 + 2 * S, '#f2eee4'));
    trim.push(box(w.w + 36 * S, 12 * S, wallT + 4 * S, cx2, w.sill + w.h + 6 * S, front - wallT / 2 + 2 * S, '#f2eee4'));
    trim.push(box(w.w + 44 * S, 10 * S, wallT + 16 * S, cx2, w.sill - 5 * S, front - wallT / 2 + 8 * S, (x, y) => (y > w.sill - 2 * S ? '#fbf8f0' : '#dcd8cc')));
    if (w.room !== 'bath') for (const sx of [-1, 1]) {
      const shx = cx2 + sx * (w.w / 2 + 12 * S + (w.w * 0.32) / 2);
      trim.push(box(w.w * 0.32, w.h + 20 * S, 4 * S, shx, cy, front + 2 * S, (x, y) => (Math.floor((y - w.sill) / (9 * S)) % 2 ? '#2e5a3a' : '#264c30')));
    }
  });
  // A few fittings on the wall: the electric meter, an outlet, a dryer vent
  // with lint caught under it, and a hose bib near the door.
  const mx = x0 + W * 0.05;
  trim.push(box(40 * S, 60 * S, 14 * S, mx, floorY + 120 * S, front + 7 * S, '#8a8e92'), paint(new THREE.CylinderGeometry(14 * S, 14 * S, 10 * S, 12).rotateX(Math.PI / 2).translate(mx, floorY + 130 * S, front + 17 * S), '#c8dce6'));
  trim.push(box(16 * S, 24 * S, 6 * S, L.doors[0].x - L.doors[0].w / 2 - 80 * S, floorY + 60 * S, front + 3 * S, '#e8e4dc'));
  const vx = L.windows[1].x + 160 * S;
  // (Low in the brick, where dryer vents are, so it shows from the yard.)
  trim.push(box(40 * S, 34 * S, 14 * S, vx, 120 * S, front + 7 * S, (x, y) => (Math.floor(y / (5 * S)) % 2 ? '#f0ece4' : '#c8c4bc')));
  for (let k = 0; k < 7; k++) trim.push(paint(new THREE.IcosahedronGeometry((4 + (k % 3) * 2) * S, 0).scale(1, 0.6, 1).translate(vx + (k - 3) * 8 * S, 3 * S, front + (14 + (k % 3) * 8) * S), k % 2 ? '#e4e0dc' : '#cfcac4'));
  trim.push(paint(new THREE.CylinderGeometry(4 * S, 4 * S, 22 * S, 8).rotateX(Math.PI / 2).translate(L.doors[0].x - L.doors[0].w / 2 - 140 * S, floorY - 40 * S, front + 11 * S), '#b8a060'), box(16 * S, 4 * S, 4 * S, L.doors[0].x - L.doors[0].w / 2 - 140 * S, floorY - 32 * S, front + 20 * S, '#c03030'));

  // The roof: a gable running along the house, eaves overhanging the walls,
  // white fascia, a gutter along the front, downspouts to splash blocks.
  const run = depth / 2 + L.overhang, rise = Math.tan(L.pitch) * run, ridgeZ = front - depth / 2, eave = eaveY - 6 * S;
  for (const sd of [1, -1]) {
    const len = Math.hypot(run, rise), slope = new THREE.BoxGeometry(W + L.overhang * 2, 8 * S, len);
    slope.rotateX(sd * L.pitch).translate(x0 + W / 2, eave + rise / 2, ridgeZ + sd * run / 2);
    roofG.push(slope);
  }
  // Gable ends: siding triangles up into the roof.
  for (const sx of [x0, x1]) {
    const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, eaveY, front), new THREE.Vector3(0, eaveY, back), new THREE.Vector3(0, eaveY + Math.tan(L.pitch) * depth / 2, ridgeZ)]);
    tri.translate(sx, 0, 0); sid.push(tri);
  }
  roofTrim.push(box(W + L.overhang * 2, 22 * S, 6 * S, x0 + W / 2, eave - 8 * S, front + L.overhang, '#f2eee4'));
  roofTrim.push(paint(new THREE.BoxGeometry(W + L.overhang * 2, 2 * S, L.overhang).translate(x0 + W / 2, eave - 18 * S, front + L.overhang / 2), '#e0dacc'));
  roofTrim.push(paint(new THREE.CylinderGeometry(10 * S, 10 * S, W + L.overhang * 2, 8, 1, true, Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).translate(x0 + W / 2, eave - 8 * S, front + L.overhang + 12 * S), (x, y) => (y > eave - 4 * S ? '#d8d8d4' : '#bcbcb6')));
  for (const f of [0.01, 0.5, 0.99]) {
    const dx = x0 + W * f, dz = front + L.overhang + 12 * S, wz = front + 8 * S;
    trim.push(box(12 * S, 12 * S, dz - wz + 12 * S, dx, eave - 16 * S, (dz + wz) / 2, '#d8d8d4'));
    trim.push(box(12 * S, eave - 16 * S - 30 * S, 12 * S, dx, 30 * S + (eave - 46 * S) / 2, wz, (x, y) => (Math.floor(y / (60 * S)) % 6 === 0 ? '#c8c8c4' : '#d8d8d4')));
    trim.push(box(12 * S, 12 * S, 40 * S, dx, 20 * S, wz + 20 * S, '#d8d8d4'));
    trim.push(box(36 * S, 6 * S, 70 * S, dx, 3 * S, wz + 60 * S, (x, y, z) => (Math.abs(x - dx) < 10 * S && y > 3 * S ? '#8a8680' : '#a8a49c')));
  }
  // Ivy climbing the two corners from the ground.
  for (const [sx, dir] of [[x0, 1], [x1, -1]]) for (let k = 0; k < 36; k++) {
    const h = (k / 36) ** 0.8 * 520 * S, sp = (1 - k / 36) * 120 * S + 30 * S, lx = sx + dir * (10 * S + Math.abs(Math.sin(k * 2.3)) * sp);
    trim.push(paint(new THREE.SphereGeometry((9 + (k % 3) * 3) * S, 5, 3).scale(1, 0.85, 0.35).translate(lx, 12 * S + h, front + 3 * S), k % 4 ? '#2e5a24' : '#3e7a2e'));
  }

  const shell = new THREE.Group(); shell.name = 'shell';
  shell.add(new THREE.Mesh(worldUV(merge(sid.map((q) => { const p = q.index ? q.toNonIndexed() : q; if (!p.attributes.normal) p.computeVertexNormals(); if (p.attributes.uv) p.deleteAttribute('uv'); return p; })), 64 * S), psx({ map: sidingTex(), side: THREE.DoubleSide })));
  shell.add(new THREE.Mesh(worldUV(merge(brick.map((q) => { const p = q.toNonIndexed(); p.deleteAttribute('uv'); return p; })), 64 * S), psx({ map: brickTex() })));
  const trimMesh = new THREE.Mesh(merge(trim), psx({ vertexColors: true })); trimMesh.name = 'trim';
  const glassMesh = new THREE.Mesh(merge(glass), psxBasic({ vertexColors: true })); glassMesh.name = 'glass';
  const roof = new THREE.Group(); roof.name = 'roof';
  roof.add(new THREE.Mesh(worldUV(merge(roofG.map((q) => { const p = q.toNonIndexed(); p.deleteAttribute('uv'); return p; })), 48 * S), psx({ map: shingleTex() })));
  roof.add(new THREE.Mesh(merge(roofTrim), psx({ vertexColors: true })));
  g.add(shell, trimMesh, glassMesh, roof);
  g.userData.layout = L;
  return g;
}
