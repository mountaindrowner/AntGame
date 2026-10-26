// Static scenery for the whole yard, built once per world from the sim's
// yard layout (sim/yard.js): the ground painted area by area, the landmarks
// that tower over the ants, the yard's walls, rocks and grass.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AREA } from '../../sim/yard.js';
import { psx } from '../ps1/materials.js';
import { canvasTexture, rampTexture, rng, noise2, PALETTE } from '../ps1/textures.js';

const T = 16;
const col = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

// ---------- ground ----------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RAMPS = {
  grass: PALETTE.grass.map(hex), dirt: PALETTE.dirt.map(hex),
  lawn: ['#2e5a1c', '#3a6c22', '#46802a', '#529032'].map(hex),
  mulch: ['#3a2418', '#4a2c1c', '#5a3622', '#6a422a'].map(hex),
  bark: ['#5a4630', '#6a5436', '#7c643e', '#8e764a'].map(hex),
  mud: ['#3a2c20', '#44352a', '#4e3e30', '#5a4836'].map(hex),
  compost: ['#24180f', '#2c1e12', '#362618', '#40301e'].map(hex),
  sand: ['#c2ad84', '#cbb78e', '#d4c198', '#dccaa2'].map(hex),
  slab: ['#7a7670', '#84807a', '#8e8a84', '#98948c'].map(hex),
};
const pick = (ramp, v) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))];

// One continuous backyard: a grass-and-dirt base everywhere, with each
// feature's ground blended in around its landmarks (mulch around flowers,
// sawdust around logs, mud around the tap and puddles, dark soil around the
// compost). Only man-made edges are sharp: patio slabs, sandbox, blanket.
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function featureFields(w) {
  const W = w.W, H = w.H, n = noise2(23);
  const field = () => new Float32Array(W * H);
  const F = { mulch: field(), bark: field(), mud: field(), compost: field(), sand: field(), slab: field(), stripe: field(), dirt: field() };
  const pts = (kind) => w.landmarks.filter((l) => l.kind === kind);
  const flowers = [...pts('flower').map((l) => [l.x + 0.5, l.y + 0.5]), ...pts('strawberry').map((l) => [l.x0 + 1, l.y0 + 1]), ...pts('web').map((l) => [l.x + 0.5, l.y + 2])];
  const logs = pts('log'), heap = pts('heap')[0], sb = w.sandbox;
  const wet = [...w.puddles.map(([x, y]) => [x + 0.5, y + 0.5, 3]), ...pts('hose').map((l) => [l.x, l.y, l.r]), ...pts('spigot').map((l) => [l.x0 + l.w, l.y0 + l.h / 2, 2])];
  const rect = (l, x, y) => Math.hypot(Math.max(l.x0 - x, 0, x - (l.x0 + l.w)), Math.max(l.y0 - y, 0, y - (l.y0 + l.h)));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, cx = x + 0.5, cy = y + 0.5, j = n(cx * 0.15, cy * 0.15) * 2.5; // wobble every edge
    let d = 1e9; for (const [px, py] of flowers) d = Math.min(d, Math.hypot(cx - px, cy - py));
    F.mulch[i] = smooth(8, 3, d + j);
    d = 1e9; for (const l of logs) d = Math.min(d, rect(l, cx, cy));
    F.bark[i] = smooth(5, 0.5, d + j * 0.6);
    d = 1e9; for (const [px, py, r] of wet) d = Math.min(d, Math.hypot(cx - px, cy - py) - r);
    F.mud[i] = smooth(7, 1, d + j);
    if (heap) F.compost[i] = smooth(9, 1, Math.hypot(cx - heap.x, cy - heap.y) - heap.r + j);
    // Sand stays inside the frame, with a little kicked out through the gaps.
    const inBox = cx > sb.x0 + 1 && cx < sb.x1 && cy > sb.y0 + 1 && cy < sb.y1;
    F.sand[i] = inBox ? 1 : smooth(2.5, 0, rect({ x0: sb.x0, y0: sb.y0, w: sb.x1 - sb.x0 + 1, h: sb.y1 - sb.y0 + 1 }, cx, cy) + j * 0.4) * 0.35;
    // Patio slabs: a laid rectangle around the rival's crack.
    F.slab[i] = cx > 2 && cx < 35 && cy > 1 && cy < 33 ? 1 : 0;
    // The Lawn's mowed stripes fade out toward its edges.
    const edge = Math.min(cx - 40, 80 - cx, cy - 80, 120 - cy);
    F.stripe[i] = smooth(0, 8, edge + j);
    // Bare, trodden dirt around our entrance and the big rock.
    F.dirt[i] = Math.max(smooth(9, 3, Math.hypot(cx - w.ex - 0.5, cy - w.ey - 0.5) + j), smooth(4, 0.5, rect({ x0: 54, y0: 50, w: 13, h: 6 }, cx, cy) + j));
  }
  return F;
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function groundTexture(w, F) {
  const S = 8, cw = w.W * S, ch = w.H * S, W = w.W, H = w.H;
  const n1 = noise2(5), n2 = noise2(11), r = rng(3);
  const bl = w.blanket;
  // Bilinear sample of a tile field at a texel.
  const at = (f, tx, ty) => {
    const fx = Math.max(0, Math.min(W - 1.001, tx - 0.5)), fy = Math.max(0, Math.min(H - 1.001, ty - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0, i = y0 * W + x0;
    return (f[i] * (1 - u) + f[i + 1] * u) * (1 - v) + (f[i + W] * (1 - u) + f[i + W + 1] * u) * v;
  };
  return canvasTexture(cw, ch, (c) => {
    const img = c.createImageData(cw, ch), d = img.data;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const tx = x / S, ty = y / S, sp = (r() - 0.5) * 0.4, nv = n2(tx * 0.2, ty * 0.2);
      // Base: grass with patches of dirt, the same everywhere.
      const gv = n1(tx * 0.12, ty * 0.12) + n1(tx * 0.5, ty * 0.5) * 0.3 + 0.32 - at(F.dirt, tx, ty) * 0.7;
      let p = pick(gv > 0.12 ? RAMPS.grass : RAMPS.dirt, sp + gv * 0.6 + 0.5);
      let k = at(F.stripe, tx, ty);
      if (k > 0) { p = mix(p, pick(RAMPS.lawn, 0.5 + sp + nv * 0.25 + (Math.floor(tx / 4) % 2 ? 0.12 : -0.05)), k * 0.85); if (k > 0.5 && n2(tx * 0.5 + 9, ty * 0.5) > 0.55) p = r() < 0.03 ? [236, 236, 228] : [74, 140, 58]; }
      if ((k = at(F.mulch, tx, ty)) > 0) p = mix(p, r() < 0.02 ? [138, 90, 58] : pick(RAMPS.mulch, 0.5 + sp + nv * 0.3), k);
      if ((k = at(F.bark, tx, ty)) > 0) p = mix(p, r() < 0.02 ? [196, 168, 120] : pick(RAMPS.bark, 0.5 + sp + nv * 0.3), k);
      if ((k = at(F.mud, tx, ty)) > 0) { const m = pick(RAMPS.mud, 0.5 + sp + nv * 0.4); p = mix(p, nv > 0.45 ? m.map((v) => v * 0.8) : m, k); }
      if ((k = at(F.compost, tx, ty)) > 0) { const q = r(); p = mix(p, q < 0.012 ? [200, 104, 42] : q < 0.022 ? [106, 138, 42] : q < 0.028 ? [200, 168, 58] : pick(RAMPS.compost, 0.5 + sp + nv * 0.3), k); }
      if ((k = at(F.sand, tx, ty)) > 0) p = mix(p, pick(RAMPS.sand, 0.5 + sp * 0.8 + Math.sin(ty * 1.3 + nv * 4) * 0.12), k);
      if (at(F.slab, tx, ty) > 0.5) {
        const sx = Math.floor(tx / 6), sy = Math.floor(ty / 6), tint = (((sx * 7 + sy * 13) % 5) - 2) * 0.04;
        p = pick(RAMPS.slab, 0.5 + sp * 0.6 + tint);
        if (tx % 6 < 0.25 || ty % 6 < 0.25) p = [74, 70, 64];
      }
      if (tx >= bl.x0 && tx < bl.x0 + bl.w && ty >= bl.y0 && ty < bl.y0 + bl.h) {
        const check = (Math.floor(tx / 2) + Math.floor(ty / 2)) % 2, weave = (x % 4 === 0 || y % 4 === 0) ? 0.9 : 1;
        p = (check ? [184, 50, 58] : [236, 228, 216]).map((v) => v * weave * (1 + sp * 0.2));
        if (Math.abs(tx - bl.x0) < 0.3 || Math.abs(tx - bl.x0 - bl.w) < 0.3 || Math.abs(ty - bl.y0) < 0.3 || Math.abs(ty - bl.y0 - bl.h) < 0.3) p = [150, 40, 44];
      }
      const o = (y * cw + x) * 4;
      d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, { wrap: false });
}

// ---------- vertex-coloured parts ----------
// Colour a geometry per face, with a little random shading so facets read.
function paint(geo, fn, seed = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, c = new Float32Array(p.count * 3), r = rng(seed);
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    col.set(typeof fn === 'function' ? fn(x, y, z) : fn).multiplyScalar(0.92 + r() * 0.16);
    for (let k = 0; k < 3; k++) c.set([col.r, col.g, col.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
const at = (g, x, y, z) => g.translate(x, y, z);

function flower(l, parts) {
  const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, h = l.h, lean = (l.seed - 0.5) * 6;
  parts.push(paint(at(new THREE.CylinderGeometry(1.1, 1.6, h, 5).translate(0, h / 2, 0).rotateZ(lean * 0.01), x, 0, z), '#3e6e26'));
  for (let k = 0; k < 2; k++) {
    const leaf = new THREE.SphereGeometry(1, 6, 3).scale(9, 0.8, 3.2).translate(9, 0, 0).rotateY(k * 2.6 + l.seed * 3).rotateZ(0.35);
    parts.push(paint(at(leaf, x, h * (0.3 + k * 0.22), z), '#4a8a2e'));
  }
  const hx = x + lean * h * 0.01, hy = h;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    parts.push(paint(at(new THREE.SphereGeometry(1, 6, 3).scale(7, 1.2, 4).translate(7, 0, 0).rotateY(a), hx, hy, z), l.petal, k + 1));
  }
  parts.push(paint(at(new THREE.SphereGeometry(4, 6, 4).scale(1, 0.6, 1), hx, hy + 1, z), '#d8a02a'));
}

function logGeo(l) {
  const rad = l.h * T * 0.55, len = l.w * T;
  const g = new THREE.CylinderGeometry(rad, rad, len, 10, 1).rotateZ(Math.PI / 2);
  return paint(at(g, (l.x0 + l.w / 2) * T, rad * 0.9, (l.y0 + l.h / 2) * T), (x, y, z) => {
    const lx = x - (l.x0 + l.w / 2) * T;
    if (Math.abs(Math.abs(lx) - len / 2) < 0.5) { const rr = Math.hypot(y - rad * 0.9, z - (l.y0 + l.h / 2) * T); return Math.floor(rr / 4) % 2 ? '#c8a070' : '#b08a5a'; }
    return Math.floor((Math.atan2(y - rad * 0.9, z - (l.y0 + l.h / 2) * T) + 4) * 3) % 2 ? '#5a3e24' : '#6e4c2e';
  }, l.x0 + l.y0);
}

// ---------- the yard ----------
export function buildYardScenery(w) {
  const g = new THREE.Group();
  const W = w.W, H = w.H, gw = W * T, gh = H * T;
  const r = rng(17);

  // Ground: one quad per tile so the vertex snapping has something to wobble.
  const F = featureFields(w);
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(gw, gh, W, H).rotateX(-Math.PI / 2).translate(gw / 2, 0, gh / 2), psx({ map: groundTexture(w, F) })));

  // Tiles that belong to a landmark, so plain rocks aren't drawn under them.
  const own = new Uint8Array(W * H);
  const claim = (x0, y0, ww, hh) => { for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + ww; x++) if (x >= 0 && y >= 0 && x < W && y < H) own[y * W + x] = 1; };
  const claimDisc = (cx, cy, rr) => { for (let y = Math.floor(cy - rr - 1); y <= cy + rr + 1; y++) for (let x = Math.floor(cx - rr - 1); x <= cx + rr + 1; x++) if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= rr + 0.5) own[y * W + x] = 1; };

  const parts = [], decals = [];
  for (const l of w.landmarks) {
    switch (l.kind) {
      case 'bigrock': {
        claim(l.x0, l.y0, l.w, l.h);
        for (let k = 0; k < 3; k++) {
          const rr = new THREE.IcosahedronGeometry(1, 1);
          const pos = rr.attributes.position;
          for (let i = 0; i < pos.count; i++) { const f = 0.85 + r() * 0.3; pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f); }
          rr.scale(l.w * T * (0.42 - k * 0.08), 26 - k * 6, l.h * T * (0.55 - k * 0.1));
          parts.push(paint(at(rr, (l.x0 + l.w * (0.45 + k * 0.08)) * T, 10 + k * 6, (l.y0 + l.h * 0.5) * T), (x, y) => (y > 30 ? '#9a9488' : y > 14 ? '#857e73' : '#6b655c'), 40 + k));
        }
        break;
      }
      case 'flower': claim(l.x, l.y, 1, 1); flower(l, parts); break;
      case 'strawberry': {
        claim(l.x0, l.y0, l.w, l.h);
        const cx = (l.x0 + 1) * T, cz = (l.y0 + 1) * T;
        for (let k = 0; k < 4; k++) parts.push(paint(at(new THREE.SphereGeometry(1, 6, 3).scale(12, 1.5, 6).translate(10, 0, 0).rotateY(k * 1.6), cx, 14 + k * 3, cz), '#3e7a2a', k));
        for (let k = 0; k < 3; k++) parts.push(paint(at(new THREE.SphereGeometry(6, 7, 5).scale(1, 1.2, 1), cx + (k - 1) * 9, 7, cz + (k % 2) * 8 - 4), (x, y, z) => (y > 11 ? '#3e7a2a' : (Math.floor(x + z) % 3 === 0 ? '#f0d070' : '#d02a3a')), k + 9));
        break;
      }
      case 'log': claim(l.x0, l.y0, l.w, l.h); parts.push(logGeo(l)); break;
      case 'spigot': {
        claim(l.x0, l.y0, l.w, l.h);
        parts.push(paint(at(new THREE.BoxGeometry(l.w * T, 90, l.h * T), (l.x0 + l.w / 2) * T, 45, (l.y0 + l.h / 2) * T), (x, y, z) => (Math.floor(y / 8) % 2 ? '#8a3a2a' : '#9a4632')));
        const px = (l.x0 + l.w) * T, pz = (l.y0 + l.h / 2) * T;
        parts.push(paint(at(new THREE.CylinderGeometry(3, 3, 26, 8).rotateZ(Math.PI / 2), px + 13, 62, pz), '#a8a8a0'));
        parts.push(paint(at(new THREE.CylinderGeometry(3, 2.4, 14, 8), px + 24, 54, pz), '#a8a8a0'));
        parts.push(paint(at(new THREE.TorusGeometry(6, 1.6, 4, 10).rotateX(Math.PI / 2), px + 14, 70, pz), '#c03030'));
        break;
      }
      case 'hose': {
        claimDisc(l.x, l.y, l.r);
        for (let k = 0; k < 3; k++) parts.push(paint(at(new THREE.TorusGeometry(l.r * T * (0.8 - k * 0.12), 6, 6, 18).rotateX(Math.PI / 2), l.x * T, 6 + k * 11, l.y * T), k % 2 ? '#2e8a3a' : '#3a9a46', k));
        break;
      }
      case 'heap': {
        claimDisc(l.x, l.y, l.r);
        parts.push(paint(at(new THREE.SphereGeometry(l.r * T, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1), l.x * T, 0, l.y * T), (x, y) => (y > 30 ? '#3a2a1a' : '#2c1e12'), 77));
        const scraps = ['#e08a2a', '#e8d04a', '#6aa83a', '#ece4d0', '#a83a2a', '#8a5a2a'];
        for (let k = 0; k < 30; k++) {
          const a = r() * Math.PI * 2, d = Math.sqrt(r()) * l.r * T * 0.85, hh = Math.sqrt(Math.max(0, 1 - (d / (l.r * T)) ** 2)) * l.r * T * 0.45;
          const s = new THREE.BoxGeometry(6 + r() * 10, 2 + r() * 3, 4 + r() * 8).rotateY(r() * 3).rotateX((r() - 0.5) * 0.6);
          parts.push(paint(at(s, l.x * T + Math.cos(a) * d, hh + 1, l.y * T + Math.sin(a) * d), scraps[k % scraps.length], k));
        }
        break;
      }
      case 'frame': {
        const sb = l;
        for (let x = sb.x0; x <= sb.x1; x++) for (const y of [sb.y0, sb.y1]) if (w.blocked[y * W + x]) { claim(x, y, 1, 1); parts.push(paint(at(new THREE.BoxGeometry(T, 24, T), (x + 0.5) * T, 12, (y + 0.5) * T), x % 2 ? '#a8783e' : '#9a6e38')); }
        for (let y = sb.y0 + 1; y < sb.y1; y++) for (const x of [sb.x0, sb.x1]) if (w.blocked[y * W + x]) { claim(x, y, 1, 1); parts.push(paint(at(new THREE.BoxGeometry(T, 24, T), (x + 0.5) * T, 12, (y + 0.5) * T), y % 2 ? '#a8783e' : '#9a6e38')); }
        break;
      }
      case 'bucket': {
        claim(l.x0, l.y0, l.w, l.h);
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T;
        parts.push(paint(at(new THREE.CylinderGeometry(l.w * T * 0.55, l.w * T * 0.42, 46, 12, 1, true), cx, 23, cz), (x, y) => (y > 40 ? '#5aa0f0' : '#2a7ad8')));
        parts.push(paint(at(new THREE.CircleGeometry(l.w * T * 0.42, 12).rotateX(-Math.PI / 2), cx, 2, cz), '#1e5aa8'));
        parts.push(paint(at(new THREE.TorusGeometry(l.w * T * 0.55, 1.4, 4, 14, Math.PI).rotateY(Math.PI / 2), cx, 46, cz), '#d8d8d0'));
        break;
      }
      case 'shovel': {
        claim(l.x0, l.y0, l.w, l.h);
        const cx = (l.x0 + l.w / 2) * T;
        parts.push(paint(at(new THREE.BoxGeometry(l.w * T, 4, 2.4 * T), cx, 3, (l.y0 + 1.2) * T), '#d83a2a'));
        parts.push(paint(at(new THREE.CylinderGeometry(3, 3, (l.h - 2.4) * T, 6).rotateX(Math.PI / 2), cx, 4, (l.y0 + 2.4 + (l.h - 2.4) / 2) * T), '#f0c23a'));
        break;
      }
      case 'pits':
        for (const p of l.pits) {
          decals.push(paint(at(new THREE.CircleGeometry(p.r * T + 6, 14, 0, Math.PI * 2).rotateX(-Math.PI / 2), p.x * T, 0, p.y * T), (x, y, z) => { const d = Math.hypot(x - p.x * T, z - p.y * T) / (p.r * T + 6); return d < 0.25 ? '#3a2c1c' : d < 0.55 ? '#7a6446' : d < 0.8 ? '#a8926a' : '#bca880'; }));
        }
        break;
      case 'can': {
        claim(l.x0, l.y0, l.w, l.h);
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T, rad = l.w * T * 0.5;
        parts.push(paint(at(new THREE.CylinderGeometry(rad, rad, 96, 14), cx, 48, cz), (x, y) => (y > 92 ? '#c8c8c8' : y > 40 && y < 56 ? '#f2f2f2' : '#c8282e')));
        break;
      }
      case 'plate':
        decals.push(paint(at(new THREE.CircleGeometry(l.r * T, 18).rotateX(-Math.PI / 2), l.x * T, 0, l.y * T), (x, y, z) => (Math.hypot(x - l.x * T, z - l.y * T) > l.r * T * 0.8 ? '#e4ded2' : '#f4f0e8')));
        break;
      case 'pot': {
        claimDisc(l.x, l.y, l.r);
        parts.push(paint(at(new THREE.CylinderGeometry(l.r * T, l.r * T * 0.8, 64, 14), l.x * T, 32, l.y * T), (x, y) => (y > 56 ? '#c8704a' : '#b0603a')));
        parts.push(paint(at(new THREE.CircleGeometry(l.r * T * 0.92, 14).rotateX(-Math.PI / 2), l.x * T, 62, l.y * T), '#3a2618'));
        for (let k = 0; k < 6; k++) parts.push(paint(at(new THREE.SphereGeometry(1, 6, 3).scale(26, 2, 9).translate(24, 0, 0).rotateZ(0.5).rotateY(k * 1.05), l.x * T, 66 + k * 4, l.y * T), '#3e7a2a', k));
        break;
      }
      case 'wall': {
        const brick = canvasTexture(32, 16, (c) => {
          c.fillStyle = '#5a4a40'; c.fillRect(0, 0, 32, 16);
          c.fillStyle = '#9a4632'; c.fillRect(1, 1, 14, 6); c.fillRect(17, 1, 14, 6);
          c.fillStyle = '#8a3a2a'; c.fillRect(-7, 9, 14, 6); c.fillRect(9, 9, 14, 6); c.fillRect(25, 9, 14, 6);
        }, { repeat: [gw / 64, 6] });
        g.add(new THREE.Mesh(new THREE.BoxGeometry(gw, 190, T).translate(gw / 2, 95, T / 2), psx({ map: brick })));
        break;
      }
      case 'fence': {
        const fp = [];
        const along = l.side === 's' ? W : H;
        for (let i = 0; i < along; i += 2) {
          const hgt = 120 + (i % 6 === 0 ? 8 : 0);
          const b = new THREE.BoxGeometry(l.side === 's' ? 2 * T - 3 : T, hgt, l.side === 's' ? T : 2 * T - 3);
          const px = l.side === 's' ? (i + 1) * T : l.side === 'w' ? T / 2 : gw - T / 2, pz = l.side === 's' ? gh - T / 2 : (i + 1) * T;
          fp.push(paint(at(b, px, hgt / 2, pz), (i / 2) % 2 ? '#8a6a46' : '#7a5c3c', i));
        }
        parts.push(...fp);
        break;
      }
      case 'web': {
        const pts = [], cx = (l.x + 0.5) * T, cy = 58, cz = (l.y + 0.5) * T, R = l.r * T * 0.85;
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pts.push(cx, cy, cz, cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9, cz); }
        for (let ring = 1; ring <= 6; ring++) for (let k = 0; k < 12; k++) {
          const a0 = (k / 12) * Math.PI * 2, a1 = ((k + 1) / 12) * Math.PI * 2, rr = (ring / 6.5) * R;
          pts.push(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr * 0.9, cz, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr * 0.9, cz);
        }
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#f4f0ff', transparent: true, opacity: 0.55 })));
        break;
      }
      default: break;
    }
  }

  // Plain rocks on any other blocked tile.
  const rockParts = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!w.blocked[y * W + x] || own[y * W + x]) continue;
    const rad = 7 + r() * 4;
    const d = new THREE.DodecahedronGeometry(rad, 0).toNonIndexed();
    d.scale(1, 0.55 + r() * 0.35, 1);
    d.rotateY(r() * 3);
    d.translate((x + 0.5) * T + (r() - 0.5) * 3, rad * 0.25, (y + 0.5) * T + (r() - 0.5) * 3);
    rockParts.push(d);
  }
  if (rockParts.length) {
    const rocks = new THREE.Mesh(mergeGeometries(rockParts), psx({ map: rampTexture(21, PALETTE.rock, { size: 16, repeat: [0.08, 0.08] }) }));
    rocks.geometry.computeVertexNormals();
    g.add(rocks);
  }
  if (parts.length) {
    const m = mergeGeometries(parts.map((p) => { if (!p.attributes.normal) p.computeVertexNormals(); return p; }));
    m.computeVertexNormals();
    g.add(new THREE.Mesh(m, psx({ vertexColors: true })));
  }
  if (decals.length) {
    const m = new THREE.Mesh(mergeGeometries(decals), psx({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    m.position.y = 0.2;
    m.renderOrder = 0;
    g.add(m);
  }

  // Grass: dense and tall on the Lawn, scattered on grassy ground elsewhere.
  const grassTex = canvasTexture(16, 16, (c) => {
    const rr = rng(8);
    for (let x = 0; x < 16; x++) { const h = 5 + Math.floor(rr() * 11); c.fillStyle = rr() < 0.5 ? '#4f7a2e' : '#3a5e22'; c.fillRect(x, 16 - h, 1, h); }
  }, { wrap: false });
  const grassParts = [];
  const gn = noise2(5);
  const clump = (x, y, h, wd) => { for (let k = 0; k < 2; k++) { const q = new THREE.PlaneGeometry(wd, h).translate(0, h / 2, 0).rotateY(k * Math.PI / 2 + r()); q.translate(x * T, 0, y * T); grassParts.push(q); } };
  for (let i = 0; i < 4200; i++) {
    const x = 1 + r() * (W - 2), y = 1 + r() * (H - 2), ti = Math.floor(y) * W + Math.floor(x);
    if (w.blocked[ti] || w.pit[ti]) continue;
    if (Math.hypot(x - w.ex, y - w.ey) < 3 || Math.hypot(x - w.rx, y - w.ry) < 3) continue;
    // Tall and thick where the Lawn's stripes are, sparse on open ground,
    // none on beds, sawdust, mud, compost, sand or slabs.
    const bare = Math.max(F.mulch[ti], F.bark[ti], F.mud[ti], F.compost[ti], F.sand[ti], F.slab[ti], F.dirt[ti]);
    if (bare > 0.5) continue;
    if (x >= w.blanket.x0 && x < w.blanket.x0 + w.blanket.w && y >= w.blanket.y0 && y < w.blanket.y0 + w.blanket.h) continue;
    const lawn = F.stripe[ti];
    if (r() < 0.75 * lawn) { clump(x, y, 14 + r() * 16, 8); continue; }
    if (gn(x * 0.18, y * 0.18) > 0.05 && r() < 0.25) clump(x, y, 6 + r() * 7, 7);
  }
  if (grassParts.length) g.add(new THREE.Mesh(mergeGeometries(grassParts), psx({ map: grassTex, alphaTest: 0.5, side: THREE.DoubleSide })));
  return g;
}

// The Lawn's mower: a red deck with wheels, a blade's worth wide.
export function mowerMesh() {
  const parts = [];
  const wd = AREA * T, depth = 3 * T;
  parts.push(paint(new THREE.BoxGeometry(wd, 34, depth).translate(0, 30, 0), '#c8302a'));
  parts.push(paint(new THREE.BoxGeometry(wd * 0.98, 10, depth * 1.1).translate(0, 12, 0), '#3a3a3a'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(new THREE.CylinderGeometry(18, 18, 10, 12).rotateX(Math.PI / 2).translate(sx * wd * 0.46, 18, sz * depth * 0.6), '#1a1a1a'));
  const m = mergeGeometries(parts);
  m.computeVertexNormals();
  return new THREE.Mesh(m, psx({ vertexColors: true }));
}
