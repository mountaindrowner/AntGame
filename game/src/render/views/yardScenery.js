// The yard's scenery, built region by region as you come near it (YardScenery
// below): each region's ground is painted, and its landmarks, stones and
// grass are made, when the camera gets within a region of it, and thrown
// away again when it is far behind (its ground kept as a small painting, so
// distant regions don't go blank). Data comes from the sim's yard layout
// (sim/yard.js). Sizes are in px at SCALE 1 and multiplied by S, so a soda
// can stands as tall as the yard is big.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { AREA, AREAS, SCALE as S, areaBounds } from '../../sim/yard.js';
import { psx, psxBasic } from '../ps1/materials.js';
import { canvasTexture, rampTexture, rng, noise2, PALETTE } from '../ps1/textures.js';

const T = 16;
const col = new THREE.Color();

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
  soil: ['#2e1e12', '#3a2616', '#46301c', '#523a22'].map(hex),
  mat: ['#6a4a2a', '#7a5a32', '#8a6a3a', '#9a7842'].map(hex),
  gravel: ['#6a645a', '#7e776a', '#958c7c', '#aaa290', '#5a544a'].map(hex),
  deck: ['#7a7468', '#86806f', '#928b78', '#9c9581'].map(hex),
  hedge: ['#1e1a10', '#2a2416', '#33301c', '#3e3a22'].map(hex),
  oak: ['#2a4418', '#30501c', '#385a22', '#2a3a18'].map(hex),
  wild: ['#3e4a22', '#4a5428', '#5a5a2e', '#4a3e24'].map(hex),
  wet: ['#3a3226', '#463c2e', '#524636', '#5e5240'].map(hex),
  leaf: ['#7a3a1e', '#9a4a22', '#b8642a', '#c88a30', '#6a4226'].map(hex),
  mound: ['#6a3420', '#7a3e26', '#8a4a2e', '#9a5634'].map(hex),
};
const pick = (ramp, v) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))];
const shade = (hexc, k) => '#' + hex(hexc).map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('');
// Colours for a region's ground seen from far off (before it's painted).
export const GROUND_TINT = { slab: '#8e8a84', mulch: '#5a3622', bark: '#7c643e', mud: '#4e3e30', home: '#5a4a30', compost: '#362618', sand: '#cbb78e', lawn: '#3e6e24', picnic: '#9a8a70', soil: '#3a2616', grass: '#4a6e2a', long: '#3a6a22', gravel: '#8a8272', deck: '#86806f', hedge: '#2a3a1c', oak: '#30501c', wild: '#4a5428', wet: '#4a4032', leaf: '#9a4a22', mound: '#7a3e26' };

// One continuous backyard: a grass-and-dirt base everywhere, with each
// feature's ground blended in around its landmarks (mulch around flowers,
// sawdust around logs, mud around the tap and puddles, dark soil around the
// compost). Only man-made edges are sharp: patio slabs, sandbox, blanket,
// the deck and the doormat. Fields are worked out for one region (plus a
// margin) at a time, from the landmarks near it.
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const GKINDS = ['gravel', 'deck', 'hedge', 'oak', 'wild', 'wet', 'leaf', 'mound', 'tall'];
function* featureFields(w, L, b, out) {
  const M = 3, x0 = b.x0 - M, y0 = b.y0 - M, FW = b.x1 - b.x0 + 1 + 2 * M, FH = b.y1 - b.y0 + 1 + 2 * M, n = noise2(23);
  const field = () => new Float32Array(FW * FH);
  const F = { x0, y0, FW, FH, mulch: field(), bark: field(), mud: field(), compost: field(), sand: field(), slab: field(), stripe: field(), dirt: field(), soil: field(), mat: field(), long: field(), clover: field(), g: {} };
  for (const k of GKINDS) F.g[k] = field();
  // Only what can reach this region matters.
  const R = 22 * S, near = (x, y) => x > b.x0 - R && x < b.x1 + R && y > b.y0 - R && y < b.y1 + R;
  const nearRect = (l) => l.x0 < b.x1 + R && l.x0 + l.w > b.x0 - R && l.y0 < b.y1 + R && l.y0 + l.h > b.y0 - R;
  const flowers = L.flowers.filter(([x, y]) => near(x, y)), logs = L.logs.filter(nearRect), wet = L.wet.filter(([x, y]) => near(x, y));
  const heap = L.heap, sb = w.sandbox, lawn = w.lawn, lg = w.long;
  const slabs = w.slabs.filter(nearRect), mats = L.mats.filter(nearRect), soil = w.soil.filter(nearRect), clovers = L.clovers.filter(nearRect), dirts = w.dirt.filter(([x, y]) => near(x, y)), grounds = w.grounds.filter(nearRect);
  const inRect = (l, x, y) => x > l.x0 && x < l.x0 + l.w && y > l.y0 && y < l.y0 + l.h;
  const rect = (l, x, y) => Math.hypot(Math.max(l.x0 - x, 0, x - (l.x0 + l.w)), Math.max(l.y0 - y, 0, y - (l.y0 + l.h)));
  // Blends are measured in design units, so the edges keep their look at any SCALE.
  const sm = (e0, e1, d) => smooth(e0 * S, e1 * S, d);
  for (let ly = 0; ly < FH; ly++) for (let lx = 0; lx < FW; lx++) {
    const i = ly * FW + lx, cx = x0 + lx + 0.5, cy = y0 + ly + 0.5, j = n(cx * 0.15 / S, cy * 0.15 / S) * 2.5 * S; // wobble every edge
    let d = 1e9; for (const [px, py] of flowers) d = Math.min(d, Math.hypot(cx - px, cy - py));
    F.mulch[i] = sm(8, 3, d + j);
    d = 1e9; for (const l of logs) d = Math.min(d, rect(l, cx, cy));
    F.bark[i] = sm(5, 0.5, d + j * 0.6);
    d = 1e9; for (const [px, py, r] of wet) d = Math.min(d, Math.hypot(cx - px, cy - py) - r);
    F.mud[i] = sm(7, 1, d + j);
    if (heap) F.compost[i] = sm(9, 1, Math.hypot(cx - heap.x, cy - heap.y) - heap.r + j);
    // Sand stays inside the frame, with a little kicked out through the gaps.
    const inBox = cx > sb.x0 + sb.t && cx < sb.x1 + 1 - sb.t && cy > sb.y0 + sb.t && cy < sb.y1 + 1 - sb.t;
    F.sand[i] = inBox ? 1 : sm(2.5, 0, rect({ x0: sb.x0, y0: sb.y0, w: sb.x1 - sb.x0 + 1, h: sb.y1 - sb.y0 + 1 }, cx, cy) + j * 0.4) * 0.35;
    F.slab[i] = slabs.some((l) => inRect(l, cx, cy)) ? 1 : 0;
    F.mat[i] = mats.some((l) => inRect(l, cx, cy)) ? 1 : 0;
    d = 1e9; for (const l of soil) d = Math.min(d, rect(l, cx, cy));
    F.soil[i] = smooth(1.2, 0, d + j * 0.15);
    // The great lawn's long grass, fading in at its edges.
    F.long[i] = sm(-2, 4, Math.min(cx - lg.x0, lg.x0 + lg.w - cx, cy - lg.y0, lg.y0 + lg.h - cy) + j);
    d = 1e9; for (const l of clovers) d = Math.min(d, rect(l, cx, cy));
    F.clover[i] = sm(6, 0, d + j);
    // The Lawn's mowed stripes fade out toward its edges.
    const edge = Math.min(cx - lawn.x0, lawn.x0 + lawn.w - cx, cy - lawn.y0, lawn.y0 + lawn.h - cy);
    F.stripe[i] = sm(0, 8, edge + j);
    // Bare, trodden dirt around our entrance and the big rock (ant-sized, so it doesn't grow with SCALE).
    F.dirt[i] = Math.max(smooth(11, 4, Math.hypot(cx - w.ex - 0.5, cy - w.ey - 0.5) + j * 0.6), sm(4, 0.5, rect(w.bigrock, cx, cy) + j));
    for (const [px, py, r] of dirts) F.dirt[i] = Math.max(F.dirt[i], smooth(r, r * 0.4, Math.hypot(cx - px, cy - py) + j * 0.5));
    // Ground patches of the rest of the yard: hard-edged or blended in.
    for (const gp of grounds) {
      const inside = Math.min(cx - gp.x0, gp.x0 + gp.w - cx, cy - gp.y0, gp.y0 + gp.h - cy);
      const v = gp.soft ? smooth(-gp.soft * 0.5, gp.soft * 0.5, inside + j * (gp.soft > 3 ? 1 : 0.2)) : inside > 0 ? 1 : 0;
      if (v > F.g[gp.kind][i]) F.g[gp.kind][i] = v;
    }
    if (lx === FW - 1 && ly % 8 === 7) yield;
  }
  // Bilinear sample of a field at a point in world tiles.
  F.at = (f, tx, ty) => {
    const fx = Math.max(0, Math.min(FW - 1.001, tx - 0.5 - x0)), fy = Math.max(0, Math.min(FH - 1.001, ty - 0.5 - y0));
    const xa = Math.floor(fx), ya = Math.floor(fy), u = fx - xa, v = fy - ya, i = ya * FW + xa;
    return (f[i] * (1 - u) + f[i + 1] * u) * (1 - v) + (f[i + FW] * (1 - u) + f[i + FW + 1] * u) * v;
  };
  F.tile = (f, tx, ty) => f[(Math.floor(ty) - y0) * FW + (Math.floor(tx) - x0)];
  out.F = F;
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// One region's ground, PX texels a tile, painted a strip of rows at a time
// (a generator: each yield is a strip) so loading never stalls a frame.
const PX = 8;
function* paintGround(w, F, b, out) {
  const x0 = b.x0, y0 = b.y0, tw = b.x1 - b.x0 + 1, th = b.y1 - b.y0 + 1, cw = tw * PX, ch = th * PX;
  const n1 = noise2(5), n2 = noise2(11), r = rng(3 + x0 * 7 + y0 * 13), at = F.at, G = F.g;
  const bl = w.blanket;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d'), img = g.createImageData(cw, ch), d = img.data;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const tx = x0 + x / PX, ty = y0 + y / PX, ux = tx / S, uy = ty / S, sp = (r() - 0.5) * 0.4, nv = n2(ux * 0.2, uy * 0.2);
      // Base: grass with patches of dirt, the same everywhere.
      const gv = n1(ux * 0.12, uy * 0.12) + n1(ux * 0.5, uy * 0.5) * 0.3 + 0.32 - at(F.dirt, tx, ty) * 0.7;
      let p = pick(gv > 0.12 ? RAMPS.grass : RAMPS.dirt, sp + gv * 0.6 + 0.5);
      let k = at(F.stripe, tx, ty);
      if (k > 0) { p = mix(p, pick(RAMPS.lawn, 0.5 + sp + nv * 0.25 + (Math.floor(ux / 4) % 2 ? 0.12 : -0.05)), k * 0.85); if (k > 0.5 && n2(tx * 0.5 + 9, ty * 0.5) > 0.55) p = r() < 0.03 ? [236, 236, 228] : [74, 140, 58]; }
      if ((k = at(F.mulch, tx, ty)) > 0) p = mix(p, r() < 0.02 ? [138, 90, 58] : pick(RAMPS.mulch, 0.5 + sp + nv * 0.3), k);
      if ((k = at(F.bark, tx, ty)) > 0) p = mix(p, r() < 0.02 ? [196, 168, 120] : pick(RAMPS.bark, 0.5 + sp + nv * 0.3), k);
      if ((k = at(F.mud, tx, ty)) > 0) { const m = pick(RAMPS.mud, 0.5 + sp + nv * 0.4); p = mix(p, nv > 0.45 ? m.map((v) => v * 0.8) : m, k); }
      if ((k = at(F.compost, tx, ty)) > 0) { const q = r(); p = mix(p, q < 0.012 ? [200, 104, 42] : q < 0.022 ? [106, 138, 42] : q < 0.028 ? [200, 168, 58] : pick(RAMPS.compost, 0.5 + sp + nv * 0.3), k); }
      if ((k = at(F.sand, tx, ty)) > 0) p = mix(p, pick(RAMPS.sand, 0.5 + sp * 0.8 + Math.sin(ty * 1.3 + nv * 4) * 0.12), k);
      // The great lawn: deeper, unmown green, with clover in its patches.
      if ((k = at(F.long, tx, ty)) > 0) p = mix(p, pick(RAMPS.lawn, 0.35 + sp + nv * 0.3), k * 0.55);
      if ((k = at(G.tall, tx, ty)) > 0) p = mix(p, pick(RAMPS.lawn, 0.2 + sp + nv * 0.3), k * 0.6);
      if ((k = at(F.clover, tx, ty)) > 0 && n2(tx * 0.9, ty * 0.9) > 0.15) p = mix(p, r() < 0.02 ? [236, 232, 240] : n2(tx * 2.1, ty * 2.1) > 0.4 ? [104, 168, 72] : [78, 140, 56], k);
      // The rest of the yard's grounds.
      if ((k = at(G.oak, tx, ty)) > 0) p = mix(p, r() < 0.03 ? [120, 82, 40] : pick(RAMPS.oak, 0.5 + sp + nv * 0.4), k * 0.85);
      if ((k = at(G.wild, tx, ty)) > 0) p = mix(p, pick(RAMPS.wild, 0.5 + sp * 1.4 + nv * 0.5), k * 0.8);
      if ((k = at(G.hedge, tx, ty)) > 0) p = mix(p, r() < 0.04 ? [58, 84, 34] : pick(RAMPS.hedge, 0.5 + sp + nv * 0.3), k);
      if ((k = at(G.wet, tx, ty)) > 0) { const m = pick(RAMPS.wet, 0.5 + sp + nv * 0.5); p = mix(p, nv > 0.5 && r() < 0.05 ? [90, 96, 100] : m, k); }
      if ((k = at(G.leaf, tx, ty)) > 0) { const lv = n2(tx * 1.7 + 3, ty * 1.7); p = mix(p, pick(RAMPS.leaf, 0.5 + lv * 0.9 + sp), k * (lv > -0.2 ? 1 : 0.6)); }
      if ((k = at(G.mound, tx, ty)) > 0) p = mix(p, pick(RAMPS.mound, 0.5 + sp + nv * 0.4), k);
      if ((k = at(G.gravel, tx, ty)) > 0) p = mix(p, pick(RAMPS.gravel, r()), k);
      // Garden beds: dark, freshly turned soil in furrows.
      if ((k = at(F.soil, tx, ty)) > 0) p = mix(p, pick(RAMPS.soil, 0.45 + sp * 0.8 + Math.sin(ty * Math.PI / S) * 0.22), k);
      if (at(F.slab, tx, ty) > 0.5) {
        // Build 20: real paving. Each slab its own shade, speckled aggregate,
        // weathered stains, worn pale edges, some cracked, and moss and weeds
        // in the dark grout between them.
        const sx = Math.floor(ux / 6), sy = Math.floor(uy / 6), lx = ux - sx * 6, ly = uy - sy * 6;
        const h = ((Math.sin(sx * 127.1 + sy * 311.7) * 43758.5453) % 1 + 1) % 1, h2 = ((Math.sin(sx * 269.5 + sy * 183.3) * 43758.5453) % 1 + 1) % 1;
        const e = Math.min(lx, 6 - lx, ly, 6 - ly);
        p = pick(RAMPS.slab, 0.5 + sp * 0.5 + (h - 0.5) * 0.5);
        if (r() < 0.06) p = mix(p, r() < 0.5 ? [176, 170, 160] : [92, 88, 82], 0.6);
        const stain = n2(ux * 0.45 + sx * 3.1, uy * 0.45 + sy * 1.7);
        if (stain > 0.35) p = mix(p, [96, 92, 80], Math.min(0.45, (stain - 0.35) * 1.4));
        if (e < 0.45) p = mix(p, [184, 178, 168], (0.45 - e) * 0.8);
        if (h2 < 0.35) { const a = h2 * 18, c = Math.cos(a), s2 = Math.sin(a), along = (lx - 3) * -s2 + (ly - 3) * c, d0 = Math.abs((lx - 3) * c + (ly - 3) * s2 + Math.sin(along * 2.3 + h * 9) * 0.25);
          if (d0 < 0.07 && Math.abs(along) < 2.6) p = [62, 58, 52]; }
        if (e < 0.16) { const m = n2(ux * 1.3 + 7, uy * 1.3); p = m > 0.25 ? (r() < 0.3 ? [86, 120, 52] : [60, 92, 40]) : [70, 66, 60]; }
      }
      if (at(G.deck, tx, ty) > 0.5) {
        // Deck boards: weathered grey planks with dark gaps.
        const board = Math.floor(uy / 1.5), tint = ((board * 37) % 5 - 2) * 0.05;
        p = pick(RAMPS.deck, 0.5 + sp * 0.5 + tint + Math.sin(ux * 2.1 + board) * 0.06);
        if (uy % 1.5 < 0.12) p = [52, 48, 42];
      }
      if (at(F.mat, tx, ty) > 0.5) {
        // The doormat: coarse coir bristles in a dark border.
        p = pick(RAMPS.mat, 0.5 + sp * 1.4 + ((x + y * 3) % 5 === 0 ? 0.2 : 0));
        if (at(F.mat, tx - S * 0.8, ty) < 0.5 || at(F.mat, tx + S * 0.8, ty) < 0.5 || at(F.mat, tx, ty - S * 0.8) < 0.5 || at(F.mat, tx, ty + S * 0.8) < 0.5) p = [58, 40, 26];
      }
      if (tx >= bl.x0 && tx < bl.x0 + bl.w && ty >= bl.y0 && ty < bl.y0 + bl.h) {
        const check = (Math.floor(ux / 2) + Math.floor(uy / 2)) % 2, weave = (x % 4 === 0 || y % 4 === 0) ? 0.9 : 1;
        p = (check ? [184, 50, 58] : [236, 228, 216]).map((v) => v * weave * (1 + sp * 0.2));
        if (Math.abs(tx - bl.x0) < 0.3 || Math.abs(tx - bl.x0 - bl.w) < 0.3 || Math.abs(ty - bl.y0) < 0.3 || Math.abs(ty - bl.y0 - bl.h) < 0.3) p = [150, 40, 44];
      }
      const o = (y * cw + x) * 4;
      d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255;
    }
    if (y % 8 === 7) yield;
  }
  g.putImageData(img, 0, 0);
  out.canvas = c;
}
// A layer under the ground: drawn first, never writes depth (see the far ground).
const underMat = (m) => { m.depthWrite = false; return m; };

function textureFrom(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
// Nudge vertices so a shape looks lumpy rather than machined.
function lumpy(geo, amt, seed) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, r = rng(Math.floor(seed * 977) + 5);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + (r() - 0.5) * amt, p.getY(i) + (r() - 0.5) * amt * 0.6, p.getZ(i) + (r() - 0.5) * amt);
  return g;
}

// A smooth, rounded rock: an icosphere welded into one surface (so it shades
// smoothly), bulged by a few soft lumps and flattened underneath. Jittering
// each vertex at random is what made the old rocks jagged.
function smoothRock(seed, detail = 2, lumps = 0.22) {
  const r = rng(Math.floor(seed * 1e6) + 3);
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const L = Array.from({ length: 5 }, () => [new THREE.Vector3(r() * 2 - 1, r() * 1.2 - 0.2, r() * 2 - 1).normalize(), (r() - 0.35) * lumps * 2, 1.5 + r() * 2.5]);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let k = 1;
    for (const [d, a, sharp] of L) k += a * Math.pow(Math.max(0, v.dot(d)), sharp);
    v.multiplyScalar(k);
    if (v.y < 0) v.y *= 0.35;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

// ---------- model pass, layer 4: shared shapes ----------
const lighten = (h, k) => '#' + hex(h).map((v) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
const UPV = new THREE.Vector3(0, 1, 0);
// A round rod from a to b ([x, y, z] arrays), painted.
function rod(a, b, r0, r1, color, sides = 6, seed = 1) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const g = paint(new THREE.CylinderGeometry(r1, r0, len, sides, 1).translate(0, len / 2, 0), color, seed);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UPV, B.clone().sub(A).normalize()));
  return g.translate(A.x, A.y, A.z);
}
// A petal (or sepal) along +X from the origin: darker at its base, paler at its tip.
function petal(len, wid, c, seed) {
  return paint(new THREE.SphereGeometry(1, 6, 3).scale(len / 2, Math.max(0.6, wid * 0.1), wid / 2).translate(len / 2, 0, 0), (x) => (x < len * 0.22 ? shade(c, 0.78) : x > len * 0.72 ? lighten(c, 0.28) : c), seed);
}
// A leaf along +X with a pale midrib and darker edges.
function leafRib(len, wid, c, seed) {
  return paint(new THREE.SphereGeometry(1, 8, 3).scale(len / 2, Math.max(0.6, wid * 0.08), wid / 2).translate(len / 2, 0, 0), (x, y, z) => (Math.abs(z) < wid * 0.09 ? lighten(c, 0.3) : Math.abs(z) > wid * 0.32 ? shade(c, 0.82) : c), seed);
}
// A disc whose rim alternates in radius: dandelion florets, ruffles. n even.
function ruffle(r, h, n, inner, fn, seed) {
  const g = new THREE.CylinderGeometry(r, r, h, n * 2, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (Math.hypot(x, z) > r * 0.5) { const k = Math.round(Math.atan2(z, x) / (Math.PI / n)) & 1 ? inner : 1; p.setX(i, x * k); p.setZ(i, z * k); } }
  return paint(g, fn, seed);
}
// A flat, toothed leaf lying on the ground along +X (a dandelion's "lion's teeth").
function toothLeaf(len, wid, c, seed) {
  const sh = new THREE.Shape(); sh.moveTo(0, 0);
  for (let i = 1; i <= 5; i++) { const t = i / 6, w = wid * (1 - t * 0.55); sh.lineTo(len * (t - 0.06), w); sh.lineTo(len * t, w * 0.45); }
  sh.lineTo(len, 0);
  for (let i = 5; i >= 1; i--) { const t = i / 6, w = wid * (1 - t * 0.55); sh.lineTo(len * t, -w * 0.45); sh.lineTo(len * (t - 0.06), -w); }
  sh.lineTo(0, 0);
  return paint(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), (x, y, z) => (Math.abs(z) < wid * 0.12 ? lighten(c, 0.25) : c), seed);
}

// A garden flower: a stem with ribbed leaves, green sepals, two rings of
// petals (darker at the base, paler at the tips) cupped upward, and a domed
// centre of seeds.
function flower(l, parts) {
  const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, h = l.h, lean = (l.seed - 0.5) * 6, k2 = l.small ? 0.6 : 1, c = l.petal;
  parts.push(at(paint(new THREE.CylinderGeometry(1.1 * S * k2, 1.6 * S * k2, h, 6, 2).translate(0, h / 2, 0), (px, py) => (py < h * 0.3 ? '#2e5a1e' : '#3e6e26')).rotateZ(lean * 0.01), x, 0, z));
  for (let k = 0; k < (l.small ? 2 : 3); k++) parts.push(at(leafRib(18 * S * k2, 7 * S * k2, '#4a8a2e', k).rotateZ(0.45 - k * 0.12).rotateY(k * 2.4 + l.seed * 3), x, h * (0.16 + k * 0.2), z));
  const hx = x + lean * h * 0.01, hy = h, n = l.small ? 9 : 7;
  for (let k = 0; k < 5; k++) parts.push(at(petal(5 * S * k2, 2.6 * S * k2, '#3e7a2a', k).rotateZ(-0.55).rotateY((k / 5) * Math.PI * 2), hx, hy - 0.6 * S, z));
  for (let ring = 0; ring < 2; ring++) for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + ring * (Math.PI / n);
    parts.push(at(petal((ring ? 10 : 14) * S * k2, (l.small ? 3 : 6) * S * k2 * (ring ? 0.85 : 1), c, k + ring * 9).rotateZ(ring ? 0.42 : 0.14).rotateY(a), hx, hy + ring * 1.1 * S, z));
  }
  const cR = 4.5 * S * k2;
  parts.push(at(paint(new THREE.SphereGeometry(cR, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), (px, py, pz) => { const d = Math.hypot(px, pz); return d < cR * 0.38 ? '#7a4a14' : Math.sin(px * 3.1) * Math.sin(pz * 3.1) > 0.4 ? '#b8781a' : '#e0a82a'; }, 3), hx, hy + 1.6 * S, z));
}

// A fallen log: bark in ridges with dark fissures, a gentle taper and bow,
// cut ends showing rings and heartwood, a couple of branch stubs; rotten
// ones carry moss and shelf fungus. Twigs are the same, thin and plain.
function logGeo(l) {
  const rad = l.h * T * (l.twig ? 0.4 : 0.55), len = l.w * T, cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T, cy = rad * 0.9, seed = (l.x0 * 7 + l.y0 * 13) % 17;
  const radial = l.twig ? 6 : 12, segs = l.twig ? 2 : Math.max(4, Math.round(len / (14 * S)));
  const g = new THREE.CylinderGeometry(rad, rad, len, radial, segs).rotateZ(Math.PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = x / len, rr = Math.hypot(y, z);
    if (rr < 1e-3) continue;
    const k = l.twig ? 1 : 1 - 0.12 * (u + 0.5) + 0.05 * Math.sin(Math.atan2(y, z) * 7 + u * 4 + seed);
    p.setY(i, y * k + Math.sin((u + 0.5) * Math.PI) * rad * 0.06); p.setZ(i, z * k);
  }
  const bark = l.rot ? ['#4a4436', '#5a5242', '#2e2a22'] : ['#5a3e24', '#6e4c2e', '#3a2614'];
  const parts = [paint(g, (x, y, z) => {
    const rr = Math.hypot(y, z), ang = Math.atan2(y, z);
    if (Math.abs(Math.abs(x) - len / 2) < 0.6 && rr < rad * 0.98) return rr < rad * 0.22 ? '#7a4a26' : rr > rad * 0.84 ? bark[2] : Math.floor(rr / (3 * S)) % 2 ? '#c8a070' : '#b08a5a';
    if (l.rot && y > rad * 0.45 && Math.sin(x * 0.04 + seed) > 0.1) return Math.sin(x * 0.3 + z) > 0 ? '#4a6a2a' : '#5a7a32';
    // Colour by whole segment, so both triangles of a facet match: furrows of bark with dark fissures.
    const sg = Math.floor((ang + Math.PI) / ((Math.PI * 2) / radial)) + seed;
    return sg % 3 === 0 ? bark[2] : sg % 3 === 1 ? bark[0] : bark[1];
  }, seed)];
  if (!l.twig) {
    for (const [u, a] of [[0.28, 1.1], [0.66, -0.7]]) {
      const bx = (u - 0.5) * len, dir = [0, Math.sin(a + 1.2), Math.cos(a + 1.2)], base = [bx, dir[1] * rad * 0.8, dir[2] * rad * 0.8], tip = [bx + rad * 0.3, dir[1] * rad * 1.6, dir[2] * rad * 1.6];
      parts.push(rod(base, tip, rad * 0.26, rad * 0.2, bark[1], 6, u * 10));
      parts.push(at(paint(new THREE.SphereGeometry(rad * 0.2, 6, 3).scale(1, 0.3, 1), '#b08a5a'), tip[0], tip[1], tip[2]));
    }
    if (l.rot) for (let k = 0; k < 3; k++) parts.push(at(paint(new THREE.CylinderGeometry(rad * (0.34 - k * 0.07), rad * (0.38 - k * 0.07), 2.2 * S, 8, 1, false, 0, Math.PI).rotateY(-Math.PI / 2), (px, py) => (py > 0.5 * S ? '#d8b07a' : '#f0e0c0'), k), (k - 1) * rad * 0.5, -rad * 0.1 + k * rad * 0.28, rad * 0.95));
  }
  return at(mergeGeometries(parts.map((q) => (q.index ? q.toNonIndexed() : q))), cx, cy, cz);
}

const WEB_MAT = new THREE.LineBasicMaterial({ color: '#f4f0ff', transparent: true, opacity: 0.55 });
const TRAMP_MAT = psxBasic({ color: '#141418', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
const GROUND_ONLY = new Set(['lawn', 'blanket', 'mat', 'clover', 'wall', 'fence']);

// Build one landmark's geometry into the region's buckets.
function meshLandmark(l, w, ctx) {
  const { parts, decals, stoneParts, extra, r } = ctx, W = w.W;
  const claim = () => {}, claimDisc = () => {};
  switch (l.kind) {
      case 'bigrock': {
        claim(l.x0, l.y0, l.w, l.h);
        // A big flat stone, worn smooth, with two smaller ones leaning on it.
        for (let k = 0; k < 3; k++) {
          const rr = smoothRock(0.31 + k * 0.17, 3, 0.16);
          rr.scale(l.w * T * (0.5 - k * 0.12), (22 - k * 5) * S, l.h * T * (0.6 - k * 0.12));
          stoneParts.push(at(rr, (l.x0 + l.w * (0.45 + k * 0.12)) * T, (6 + k * 7) * S, (l.y0 + l.h * (0.5 + (k === 2 ? 0.2 : 0))) * T));
        }
        break;
      }
      case 'stone': {
        claim(l.x0, l.y0, l.w, l.h);
        const st = smoothRock(l.seed), rs = rng(Math.floor(l.seed * 1e6));
        const hgt = Math.min(l.w, l.h) * T * (0.35 + rs() * 0.2);
        st.scale(l.w * T * 0.58, hgt, l.h * T * 0.58).rotateY(rs() * 0.6 - 0.3);
        stoneParts.push(at(st, (l.x0 + l.w / 2) * T, hgt * 0.3, (l.y0 + l.h / 2) * T));
        break;
      }
      case 'flower': claim(l.x, l.y, 1, 1); flower(l, parts); break;
      case 'strawberry': {
        claim(l.x0, l.y0, l.w, l.h);
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T;
        for (let k = 0; k < 4; k++) parts.push(paint(at(new THREE.SphereGeometry(1, 6, 3).scale(12 * S, 1.5 * S, 6 * S).translate(10 * S, 0, 0).rotateY(k * 1.6), cx, (14 + k * 3) * S, cz), '#3e7a2a', k));
        for (let k = 0; k < 3; k++) parts.push(paint(at(new THREE.SphereGeometry(6 * S, 7, 5).scale(1, 1.2, 1), cx + (k - 1) * 9 * S, 7 * S, cz + ((k % 2) * 8 - 4) * S), (x, y, z) => (y > 11 * S ? '#3e7a2a' : (Math.floor((x + z) / S) % 3 === 0 ? '#f0d070' : '#d02a3a')), k + 9));
        break;
      }
      case 'log': parts.push(logGeo(l)); break;
      case 'spigot': {
        claim(l.x0, l.y0, l.w, l.h);
        parts.push(paint(at(new THREE.BoxGeometry(l.w * T, 90 * S, l.h * T), (l.x0 + l.w / 2) * T, 45 * S, (l.y0 + l.h / 2) * T), (x, y, z) => (Math.floor(y / (8 * S)) % 2 ? '#8a3a2a' : '#9a4632')));
        const px = (l.x0 + l.w) * T, pz = (l.y0 + l.h / 2) * T;
        parts.push(paint(at(new THREE.CylinderGeometry(3 * S, 3 * S, 26 * S, 8).rotateZ(Math.PI / 2), px + 13 * S, 62 * S, pz), '#a8a8a0'));
        parts.push(paint(at(new THREE.CylinderGeometry(3 * S, 2.4 * S, 14 * S, 8), px + 24 * S, 54 * S, pz), '#a8a8a0'));
        parts.push(paint(at(new THREE.TorusGeometry(6 * S, 1.6 * S, 4, 10).rotateX(Math.PI / 2), px + 14 * S, 70 * S, pz), '#c03030'));
        break;
      }
      case 'hose': {
        claimDisc(l.x, l.y, l.r);
        for (let k = 0; k < 3; k++) parts.push(paint(at(new THREE.TorusGeometry(l.r * T * (0.8 - k * 0.12), 6 * S, 6, 18).rotateX(Math.PI / 2), l.x * T, (6 + k * 11) * S, l.y * T), k % 2 ? '#2e8a3a' : '#3a9a46', k));
        break;
      }
      case 'heap': {
        claimDisc(l.x, l.y, l.r);
        parts.push(paint(at(new THREE.SphereGeometry(l.r * T, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1), l.x * T, 0, l.y * T), (x, y) => (y > 30 * S ? '#3a2a1a' : '#2c1e12'), 77));
        const scraps = ['#e08a2a', '#e8d04a', '#6aa83a', '#ece4d0', '#a83a2a', '#8a5a2a'];
        for (let k = 0; k < 30 * S; k++) {
          const a = r() * Math.PI * 2, d = Math.sqrt(r()) * l.r * T * 0.85, hh = Math.sqrt(Math.max(0, 1 - (d / (l.r * T)) ** 2)) * l.r * T * 0.45;
          const s = new THREE.BoxGeometry((6 + r() * 10) * S, (2 + r() * 3) * S, (4 + r() * 8) * S).rotateY(r() * 3).rotateX((r() - 0.5) * 0.6);
          parts.push(paint(at(s, l.x * T + Math.cos(a) * d, hh + 1, l.y * T + Math.sin(a) * d), scraps[k % scraps.length], k));
        }
        break;
      }
      case 'frame': {
        // The sandbox: boards of weathered pine round the sand, the grain
        // running along each side, joints with nail heads every few tiles,
        // and a triangular seat board across each corner.
        const sb = l, band = (x, y) => x < sb.x0 + sb.t || x > sb.x1 - sb.t || y < sb.y0 + sb.t || y > sb.y1 - sb.t, bh = 24 * S;
        for (let y = sb.y0; y <= sb.y1; y++) for (let x = sb.x0; x <= sb.x1; x++) {
          if (!band(x, y) || !w.blocked[y * W + x]) continue;
          claim(x, y, 1, 1);
          const horiz = y < sb.y0 + sb.t || y > sb.y1 - sb.t, along = horiz ? x : y, joint = along % 7 === 0;
          parts.push(paint(at(new THREE.BoxGeometry(T, bh, T), (x + 0.5) * T, bh / 2, (y + 0.5) * T), (px, py, pz) => {
            const u = horiz ? pz : px;
            if (joint && Math.abs((horiz ? px : pz) - ((horiz ? x : y)) * T) < 1.5) return '#6a4a26';
            if (py > bh - 0.5) return Math.floor(u / 3) % 3 === 0 ? '#b88a4e' : Math.floor(u / 3) % 3 === 1 ? '#c49656' : '#ac7e44';
            return Math.floor(py / (6 * S)) % 2 ? '#9a6e38' : '#8a6232';
          }, x * 3 + y));
          if (joint) for (const o of [-0.3, 0.3]) parts.push(at(paint(new THREE.CylinderGeometry(1.1 * S, 1.1 * S, 0.6 * S, 6), '#3a3a3a'), horiz ? x * T + 2 : (x + 0.5 + o) * T, bh + 0.3 * S, horiz ? (y + 0.5 + o) * T : y * T + 2));
        }
        const L = (sb.t + 2.5) * T;
        for (const [ox, oy, dx, dy] of [[sb.x0, sb.y0, 1, 1], [sb.x1 + 1, sb.y0, -1, 1], [sb.x0, sb.y1 + 1, 1, -1], [sb.x1 + 1, sb.y1 + 1, -1, -1]]) {
          const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(dx * L, 0); sh.lineTo(0, dy * L); sh.lineTo(0, 0);
          const g = new THREE.ExtrudeGeometry(sh, { depth: 4 * S, bevelEnabled: false }).rotateX(Math.PI / 2);
          parts.push(at(paint(g, (px, py, pz) => (py > -1 ? (Math.floor((px * dx + pz * dy) / 6) % 2 ? '#c8985a' : '#bc8e52') : '#8a6232'), ox + oy), ox * T, bh + 4 * S, oy * T));
        }
        break;
      }
      case 'bucket': {
        // A toy bucket: ribbed blue plastic, a rolled rim, sand heaped inside,
        // a white handle.
        claim(l.x0, l.y0, l.w, l.h);
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T, R = l.w * T * 0.55;
        parts.push(paint(at(new THREE.CylinderGeometry(R, l.w * T * 0.42, 46 * S, 16, 4), cx, 23 * S, cz), (x, y) => (Math.floor(y / (6 * S)) % 3 === 0 ? '#2470d0' : y > 40 * S ? '#5aa0f0' : '#2a7ad8'), 44));
        parts.push(paint(at(new THREE.TorusGeometry(R, 2.2 * S, 4, 18).rotateX(Math.PI / 2), cx, 46 * S, cz), '#6ab0ff'));
        parts.push(paint(at(new THREE.SphereGeometry(R * 0.95, 14, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.25, 1), cx, 41 * S, cz), (x, y, z) => (Math.sin(x * 0.9) * Math.sin(z * 0.8) > 0.5 ? '#c8b07c' : '#dcc898'), 45));
        parts.push(paint(at(new THREE.TorusGeometry(R, 1.4 * S, 4, 14, Math.PI).rotateY(Math.PI / 2), cx, 46 * S, cz), '#e8e8e0'));
        break;
      }
      case 'shovel': {
        // A toy spade: a red scoop with raised sides, a collar, a yellow
        // handle ending in a T grip.
        claim(l.x0, l.y0, l.w, l.h);
        const cx = (l.x0 + l.w / 2) * T, blade = 2.4 * S, bw = l.w * T, bz = (l.y0 + blade / 2) * T, bl = blade * T;
        parts.push(paint(at(new THREE.BoxGeometry(bw, 2.5 * S, bl), cx, 1.5 * S, bz), (x, y) => (y > 2 * S ? '#e84a3a' : '#b82a1e')));
        for (const sx of [-1, 1]) parts.push(paint(at(new THREE.BoxGeometry(2 * S, 6 * S, bl * 0.9).rotateZ(sx * -0.4), cx + sx * (bw / 2 - 1 * S), 4 * S, bz + bl * 0.05), '#d83a2a'));
        parts.push(paint(at(new THREE.BoxGeometry(bw * 0.9, 6 * S, 2 * S), cx, 4 * S, bz + bl / 2), '#c8321e'));
        parts.push(paint(at(new THREE.CylinderGeometry(5 * S, 4 * S, 8 * S, 8).rotateX(Math.PI / 2), cx, 5 * S, bz + bl / 2 + 4 * S), '#e8b02a'));
        const hl = (l.h - blade) * T;
        parts.push(paint(at(new THREE.CylinderGeometry(3 * S, 3 * S, hl - 10 * S, 8).rotateX(Math.PI / 2), cx, 5 * S, (l.y0 + blade) * T + hl / 2), (x, y, z) => (Math.floor(z / (10 * S)) % 2 ? '#f0c23a' : '#e8b830')));
        parts.push(paint(at(new THREE.CylinderGeometry(3.2 * S, 3.2 * S, 20 * S, 8).rotateZ(Math.PI / 2), cx, 5 * S, (l.y0 + l.h) * T - 4 * S), '#f0c23a'));
        break;
      }
      case 'pit': {
        // An antlion's funnel (build 14): a raised rim of sand, a slope with
        // grains streaking down it, a dark hole, and the antlion's jaws.
        const p = l, R = p.r * T, cx = p.x * T, cz = p.y * T, H = Math.max(5, R * 0.22);
        const prof = [[0, 0.4], [R * 0.12, 0.5], [R * 0.35, H * 0.35], [R * 0.7, H * 0.8], [R * 0.95, H], [R * 1.1, H * 0.8], [R * 1.35, 0.2]].reverse().map(([x, y]) => new THREE.Vector2(x, y)); // outside in, so the faces look up
        const cone = new THREE.LatheGeometry(prof, 24);
        parts.push(paint(at(cone, cx, 0, cz), (x, y, z) => {
          const d = Math.hypot(x - cx, z - cz) / R, a = Math.atan2(z - cz, x - cx);
          if (d < 0.14) return '#1c140c';
          if (d < 0.95) return Math.sin(a * 11 + d * 3) > 0.55 ? '#9c8258' : d < 0.4 ? '#8a7048' : '#b89c6c';
          return d < 1.05 ? '#e2cc98' : '#c8b07c';
        }));
        for (const side of [-1, 1]) {
          const jaw = new THREE.ConeGeometry(0.9, R * 0.22, 4).rotateZ(side * 0.5).rotateX(-0.6);
          parts.push(paint(at(jaw, cx + side * R * 0.05, 1.2, cz), '#4a2e18'));
        }
        break;
      }
      case 'can': {
        // A soda can: steel chimes top and bottom, red with a white swoosh,
        // beads of condensation, a ring-pull on the lid.
        claim(l.x0, l.y0, l.w, l.h);
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T, rad = l.w * T * 0.5, H = 96 * S;
        parts.push(paint(at(new THREE.CylinderGeometry(rad * 0.9, rad * 0.82, 6 * S, 18), cx, 3 * S, cz), (x, y) => (y > 1.5 * S ? '#d8d8dc' : '#9a9aa0')));
        parts.push(paint(at(new THREE.CylinderGeometry(rad, rad * 0.9, 6 * S, 18), cx, 9 * S, cz), '#c8c8cc'));
        parts.push(paint(at(new THREE.CylinderGeometry(rad, rad, H - 20 * S, 24, 1), cx, 12 * S + (H - 20 * S) / 2, cz), '#c8282e', 46));
        parts.push(paint(at(new THREE.CylinderGeometry(rad * 1.01, rad * 1.01, 9 * S, 24, 1, true), cx, 50 * S, cz), '#f6f6f2', 47));
        parts.push(paint(at(new THREE.CylinderGeometry(rad * 1.012, rad * 1.012, 2.5 * S, 24, 1, true), cx, 43 * S, cz), '#1a3a8a', 48));
        parts.push(paint(at(new THREE.CylinderGeometry(rad * 0.84, rad, 8 * S, 18), cx, H - 4 * S, cz), '#c8c8cc'));
        parts.push(paint(at(new THREE.CircleGeometry(rad * 0.84, 18).rotateX(-Math.PI / 2), cx, H, cz), (x, y, z) => (Math.hypot(x - cx, z - cz) > rad * 0.74 ? '#b8b8bc' : '#d0d0d4')));
        parts.push(paint(at(new THREE.BoxGeometry(rad * 0.3, 1.2 * S, rad * 0.5), cx, H + 0.6 * S, cz + rad * 0.3), '#e0e0e4'));
        parts.push(paint(at(new THREE.CylinderGeometry(rad * 0.1, rad * 0.1, 0.4 * S, 6), cx, H + 0.2, cz + rad * 0.55), '#2a2a2a'));
        for (let k = 0; k < 16; k++) { const a = r() * 6.3, y = (16 + r() * 66) * S; parts.push(paint(at(new THREE.SphereGeometry((1 + r()) * S, 4, 3), cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad), '#f0f6ff')); }
        break;
      }
      case 'plate':
        decals.push(paint(at(new THREE.CircleGeometry(l.r * T, 18).rotateX(-Math.PI / 2), l.x * T, 0, l.y * T), (x, y, z) => (Math.hypot(x - l.x * T, z - l.y * T) > l.r * T * 0.8 ? '#e4ded2' : '#f4f0e8')));
        break;
      case 'pot': {
        // A terracotta pot on its saucer, open at the top: a rolled rim with
        // its inner wall in shadow, potting soil a little below the rim with
        // grit and perlite in it, and a geranium growing out of the soil, a
        // mound of round leaves with the dark zone ring on long stalks from
        // the crown, and red flower heads held up above them.
        claimDisc(l.x, l.y, l.r);
        const x = l.x * T, z = l.y * T, R = l.r * T, H = 64 * S, Ri = R * 0.9, soilY = H - 9 * S, seedR = rng(Math.floor(l.x * 31 + l.y * 17));
        const flip = (g) => { g.scale(-1, 1, 1); return g; }; // turn an open tube inside out, so its inner face shows
        parts.push(at(paint(new THREE.CylinderGeometry(R * 1.06, R * 0.96, 5 * S, 20), (px, py) => (py > 2 * S ? '#b8643c' : '#94502e'), 40), x, 2.5 * S, z));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.97, R * 0.78, H - 14 * S, 20, 3, true), (px, py) => (py < -(H - 14 * S) * 0.2 ? '#9a4e2c' : Math.abs(py - (H - 14 * S) * 0.18) < 1.5 * S ? '#a85a34' : '#b4623a'), 41), x, 5 * S + (H - 14 * S) / 2, z));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 1.1, R * 1.04, 12 * S, 20, 1, true), (px, py, pz) => (Math.atan2(pz, px) > 2.6 ? '#a0522e' : py > 3 * S ? '#d07a50' : '#c8704a'), 42), x, H - 8 * S, z));
        parts.push(at(paint(new THREE.RingGeometry(Ri, R * 1.1, 20, 1).rotateX(-Math.PI / 2), (px, py, pz) => (Math.hypot(px, pz) > R * 1.04 ? '#d8845a' : '#e0906a'), 43), x, H - 2 * S, z));
        parts.push(at(paint(flip(new THREE.CylinderGeometry(Ri, Ri * 0.97, 9 * S, 20, 1, true)), (px, py) => (py > 2 * S ? '#a85a34' : '#7a3e22'), 44), x, H - 6.5 * S, z));
        // Soil: a low mound, dark and crumbly, with grit and white perlite.
        parts.push(at(paint(new THREE.SphereGeometry(Ri * 0.99, 20, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.06, 1), (px, py, pz) => { const n = Math.sin(px * 0.21 + pz * 0.07) * Math.sin(pz * 0.19 - px * 0.05); return n > 0.55 ? '#4a3420' : n < -0.6 ? '#24160c' : '#33220f'; }, 45), x, soilY, z));
        for (let k = 0; k < 16; k++) { const a = seedR() * 6.3, d = Ri * (0.45 + seedR() * 0.48); parts.push(at(paint(new THREE.IcosahedronGeometry((0.9 + seedR() * 0.9) * S, 0), k % 3 ? '#ece8e0' : '#7a7468'), x + Math.cos(a) * d, soilY + 1.6 * S, z + Math.sin(a) * d)); }
        // The crown where the stems come out of the soil.
        parts.push(at(paint(new THREE.SphereGeometry(R * 0.14, 8, 4).scale(1, 0.5, 1), '#4a6a28'), x, soilY + 1 * S, z));
        // Leaves: three tiers on stalks, the low ones reaching out over the rim.
        const tiers = [[8, 0.62, 10, 0.24], [7, 0.4, 24, 0.22], [5, 0.18, 36, 0.2]];
        tiers.forEach(([n, reach, up, size], ti) => {
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + ti * 0.7 + seedR() * 0.3, d = R * reach * (0.9 + seedR() * 0.2), lr = R * size * (0.85 + seedR() * 0.3), ly = soilY + (up + seedR() * 6) * S;
            const lx = x + Math.cos(a) * d, lz = z + Math.sin(a) * d;
            parts.push(rod([x + Math.cos(a) * R * 0.06, soilY + 1 * S, z + Math.sin(a) * R * 0.06], [lx, ly - 1 * S, lz], 1.5 * S, 1.1 * S, '#5a8a32', 4, k + ti * 10));
            parts.push(at(paint(new THREE.SphereGeometry(1, 10, 3).scale(lr, 1.4 * S, lr).rotateZ(0.18 + ti * 0.1).rotateY(-a), (px, py, pz) => { const q = Math.hypot(px, pz) / lr; return q < 0.12 ? '#8ac04a' : q > 0.46 && q < 0.6 ? '#5e6a26' : q > 0.88 ? '#4a8a2c' : '#62a83a'; }, k + ti * 7), lx, ly, lz));
          }
        });
        // Flower heads: a round umbel of florets on a tall stalk.
        for (let k = 0; k < 3; k++) {
          const a = k * 2.1 + seedR(), fx = x + Math.cos(a) * R * 0.22, fz = z + Math.sin(a) * R * 0.22, fy = soilY + (64 + k * 8) * S;
          parts.push(rod([x, soilY + 1 * S, z], [fx, fy, fz], 1.7 * S, 1.3 * S, '#5a8a32', 4, k + 30));
          for (let j = 0; j < 12; j++) {
            const ph = j < 1 ? 0 : j < 6 ? 1 : 2, b = j * 1.3 + k, rr = [0, 5, 8.5][ph] * S, hy = [4.5, 3, 0][ph] * S;
            parts.push(at(paint(new THREE.IcosahedronGeometry(3.4 * S, 0), j % 3 === 0 ? '#ff5a64' : j % 2 ? '#e0283a' : '#f04450', j), fx + Math.cos(b) * rr, fy + hy, fz + Math.sin(b) * rr));
          }
        }
        break;
      }
      case 'steps': {
        // Three wooden steps down from the back door, the top one against the wall.
        claim(l.x0, l.y0, l.w, l.h);
        for (let k = 0; k < 3; k++) {
          const d = l.h * (3 - k) / 3, hgt = (70 + k * 70) * S;
          parts.push(paint(at(new THREE.BoxGeometry(l.w * T, hgt, d * T), (l.x0 + l.w / 2) * T, hgt / 2, (l.y0 + d / 2) * T), (x, y, z) => (y > hgt - 5 * S ? (Math.floor(x / (12 * S)) % 2 ? '#b08a5a' : '#a27e50') : '#7a5a38'), 60 + k));
        }
        break;
      }
      case 'grill': {
        // A kettle grill: three legs splayed out from under the bowl, two of
        // them on wheels with an axle, a triangle rack holding the ash pan, a
        // black bowl with vents and a steel rim, a domed lid with a vent on
        // top and a wooden handle on brackets.
        const cx = l.x * T, cz = l.y * T, R = l.r * T, top = 180 * S, attach = top - R * 0.8, rackY = top * 0.36;
        const legAt = (a, y) => { const t = y / attach, rr = R * 1.05 + (R * 0.55 - R * 1.05) * t; return [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr]; };
        const A = [0.4, 2.5, 4.6];
        for (let k = 0; k < 3; k++) {
          parts.push(rod(legAt(A[k], 0), legAt(A[k], attach), 2 * S, 1.6 * S, '#2a2a2a', 6, k));
          parts.push(rod(legAt(A[k], rackY), legAt(A[(k + 1) % 3], rackY), 1 * S, 1 * S, '#9a9a9a', 4, k + 3));
        }
        for (const k of [0, 1]) {
          const [fx, , fz] = legAt(A[k], 0), w = paint(new THREE.CylinderGeometry(10 * S, 10 * S, 4 * S, 12).rotateX(Math.PI / 2), (px, py) => (Math.hypot(px, py) < 4.5 * S ? '#9a9a9a' : '#161616'), k + 5);
          parts.push(at(w.rotateY(-A[k] + Math.PI / 2), fx, 10 * S, fz));
        }
        parts.push(rod([legAt(A[0], 0)[0], 10 * S, legAt(A[0], 0)[2]], [legAt(A[1], 0)[0], 10 * S, legAt(A[1], 0)[2]], 1.2 * S, 1.2 * S, '#8a8a8a', 4, 7));
        const [px0, , pz0] = [0, 1, 2].map((i) => (legAt(A[0], rackY)[i] + legAt(A[1], rackY)[i] + legAt(A[2], rackY)[i]) / 3);
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.42, R * 0.36, 4 * S, 14), (px, py) => (py > 1.5 * S ? '#8a8a8a' : '#5a5a5a'), 80), px0, rackY + 2 * S, pz0));
        parts.push(at(paint(new THREE.SphereGeometry(R, 16, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), (px, py, pz) => (py < -R * 0.82 && Math.sin(Math.atan2(pz, px) * 3) > 0.3 ? '#8a8a8a' : '#1e1e1e'), 81), cx, top, cz));
        parts.push(at(paint(new THREE.TorusGeometry(R, 1.6 * S, 4, 24).rotateX(Math.PI / 2), '#a8a8a8'), cx, top + 1 * S, cz));
        parts.push(at(paint(new THREE.SphereGeometry(R, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1), (px, py, pz) => (py > R * 0.66 ? '#3a3a3a' : py > R * 0.3 && pz > 0 ? '#2e2e2e' : '#262626'), 82), cx, top + 2 * S, cz));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.14, R * 0.16, 2 * S, 10), (px, py, pz) => (Math.sin(Math.atan2(pz, px) * 3) > 0.3 ? '#c8c8c8' : '#7a7a7a'), 83), cx, top + 2 * S + R * 0.75, cz));
        const hy = top + 2 * S + R * 0.62;
        for (const sx of [-1, 1]) parts.push(rod([cx + sx * 8 * S, hy, cz + R * 0.48], [cx + sx * 8 * S, hy + 5 * S, cz + R * 0.56], 1 * S, 1 * S, '#b8b8b8', 4));
        parts.push(at(paint(new THREE.BoxGeometry(22 * S, 4 * S, 4 * S), (px, py) => (py > 1 * S ? '#a07a50' : '#7a5a36')), cx, hy + 6 * S, cz + R * 0.56));
        break;
      }
      case 'table': case 'chair': {
        // Patio furniture in white resin: slatted tops with gaps, an apron
        // under the table and its umbrella hole, slightly splayed legs on
        // grey foot caps; the chair has a slatted back and arms.
        const cx = l.x * T, cz = l.y * T, hw = l.w * T / 2, hd = l.h * T / 2, table = l.kind === 'table', top = (table ? 150 : 80) * S;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const fx = cx + sx * (hw - 2 * S), fz = cz + sz * (hd - 2 * S);
          parts.push(rod([fx, 2 * S, fz], [cx + sx * (hw - 6 * S), top - 3 * S, cz + sz * (hd - 6 * S)], 2.4 * S, 2.2 * S, '#ece8e0', 6));
          parts.push(at(paint(new THREE.CylinderGeometry(3 * S, 3.2 * S, 2.5 * S, 6), '#8a8a86'), fx, 1.25 * S, fz));
        }
        const n = Math.max(3, Math.round((hw * 2) / (12 * S))), sw = (hw * 2) / n;
        for (let i = 0; i < n; i++) parts.push(at(paint(new THREE.BoxGeometry(sw - 2 * S, 5 * S, hd * 2), (px, py) => (py > 2 * S ? (i % 2 ? '#f6f2ea' : '#eeeae0') : '#d8d4ca'), 90 + i), cx - hw + sw * (i + 0.5), top, cz));
        for (const sz of [-1, 1]) parts.push(at(paint(new THREE.BoxGeometry(hw * 2 - 6 * S, 7 * S, 3 * S), '#e4e0d6'), cx, top - 6 * S, cz + sz * (hd - 4 * S)));
        if (table) parts.push(at(paint(new THREE.CircleGeometry(5 * S, 10).rotateX(-Math.PI / 2), '#2a2622'), cx, top + 2.6 * S, cz));
        else {
          const bz = cz + l.back * hd, by = top + 4 * S;
          for (let i = 0; i < 4; i++) parts.push(at(paint(new THREE.BoxGeometry((hw * 2 - 16 * S) / 4 - 2 * S, 56 * S, 3.5 * S), '#f2eee6', 95 + i), cx - hw + 8 * S + ((hw * 2 - 16 * S) / 4) * (i + 0.5), by + 30 * S, bz));
          parts.push(at(paint(new THREE.BoxGeometry(hw * 2, 8 * S, 4.5 * S), '#ece8de'), cx, by + 62 * S, bz));
          for (const sx of [-1, 1]) {
            parts.push(at(paint(new THREE.BoxGeometry(5 * S, 4 * S, hd * 1.8), '#f0ece4'), cx + sx * (hw - 2 * S), by + 24 * S, cz));
            parts.push(rod([cx + sx * (hw - 2 * S), top, cz - l.back * (hd - 5 * S)], [cx + sx * (hw - 2 * S), by + 22 * S, cz - l.back * (hd - 5 * S)], 2 * S, 2 * S, '#ece8e0', 6));
          }
        }
        break;
      }
      case 'grease':
        for (const [x, y, rr] of l.spots) decals.push(paint(at(new THREE.CircleGeometry(rr * T, 10).rotateX(-Math.PI / 2), x * T, 0, y * T), (px, py, pz) => (Math.hypot(px - x * T, pz - y * T) < rr * T * 0.6 ? '#2a2620' : '#4a463e')));
        break;
      case 'tomato': {
        // A staked tomato plant: a thick stem, leaf sprays, red and green fruit.
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, h = l.h, rs = rng(Math.floor(l.seed * 1e6));
        parts.push(paint(at(new THREE.CylinderGeometry(1.8 * S, 2.4 * S, h, 6).translate(0, h / 2, 0), x, 0, z), '#4a7a2e'));
        parts.push(paint(at(new THREE.CylinderGeometry(1 * S, 1 * S, h * 1.08, 4).translate(0, h * 0.54, 0), x + 4 * S, 0, z + 2 * S), '#a8885a'));
        for (let k = 0; k < 5; k++) {
          const leaf = new THREE.SphereGeometry(1, 6, 3).scale(14 * S, 2 * S, 6 * S).translate(11 * S, 0, 0).rotateY(k * 1.3 + rs() * 0.6).rotateZ(0.25);
          parts.push(paint(at(leaf, x, h * (0.25 + k * 0.16), z), k % 2 ? '#3e7a2a' : '#4a8a30', k));
        }
        for (let k = 0; k < 4; k++) {
          const a = rs() * Math.PI * 2, ripe = rs() < 0.7;
          // Tomatoes are round and red; peppers hang long, yellow or green.
          const fruit = l.fruit ? new THREE.SphereGeometry(5 * S, 8, 6).scale(1, 2, 1) : new THREE.SphereGeometry(7 * S, 8, 6).scale(1, 0.85, 1);
          const colr = l.fruit === 'yellow' ? '#f0c020' : l.fruit === 'green' ? '#3e9a2a' : null;
          parts.push(paint(at(fruit, x + Math.cos(a) * 9 * S, h * (0.3 + rs() * 0.45), z + Math.sin(a) * 9 * S), (px, py) => (colr || (ripe ? (py > 0 && rs() < 0.1 ? '#f0604a' : '#d8282a') : '#7ab040')), 90 + k));
        }
        break;
      }
      case 'beanpole': {
        // A bean pole wound with a vine: leaves spiralling up, a few pods.
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, h = l.h, rs = rng(Math.floor(l.seed * 1e6));
        parts.push(paint(at(new THREE.CylinderGeometry(1.4 * S, 1.8 * S, h, 5).translate(0, h / 2, 0), x, 0, z), '#9a7a4e'));
        for (let k = 0; k < 9; k++) {
          const a = k * 1.9, y = h * (0.1 + k * 0.095);
          parts.push(paint(at(new THREE.SphereGeometry(1, 6, 3).scale(8 * S, 1.5 * S, 6 * S).translate(7 * S, 0, 0).rotateY(a), x, y, z), k % 2 ? '#4a8a30' : '#5a9a3a', k));
          if (rs() < 0.35) parts.push(paint(at(new THREE.CylinderGeometry(1.2 * S, 0.8 * S, 16 * S, 4).rotateZ(0.2), x + Math.cos(a) * 6 * S, y - 8 * S, z + Math.sin(a) * 6 * S), '#7ab83e', k + 20));
        }
        break;
      }
      case 'lettuce': {
        // A lettuce head: ruffled leaves in two rings round a pale heart.
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, R = l.r * T;
        parts.push(paint(at(new THREE.SphereGeometry(R * 0.55, 8, 6).scale(1, 0.8, 1), x, R * 0.4, z), '#c8e08a'));
        for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 7; k++) {
          const a = k * 0.9 + ring * 0.45, leaf = new THREE.SphereGeometry(1, 6, 4).scale(R * 0.55, R * (0.5 - ring * 0.12), R * 0.3).translate(R * (0.45 + ring * 0.2), 0, 0).rotateZ(0.5 - ring * 0.3).rotateY(a);
          parts.push(paint(at(leaf, x, R * 0.35, z), ring ? '#5aa03a' : '#86c050', k + ring * 9));
        }
        break;
      }
      case 'feeder': {
        // A bird feeder on a pole: a little house with a seed tray.
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, top = 200 * S;
        parts.push(paint(at(new THREE.CylinderGeometry(3 * S, 3.5 * S, top, 6).translate(0, top / 2, 0), x, 0, z), '#3a3a36'));
        parts.push(paint(at(new THREE.BoxGeometry(44 * S, 4 * S, 44 * S), x, top, z), '#8a5e3a'));
        if (l.suet) {
          // A wire cage of suet: a pale block behind grey bars.
          parts.push(paint(at(new THREE.BoxGeometry(22 * S, 22 * S, 10 * S), x, top + 13 * S, z), '#e8dcb8'));
          for (let k = -2; k <= 2; k++) parts.push(paint(at(new THREE.BoxGeometry(1.4 * S, 26 * S, 12 * S), x + k * 5 * S, top + 13 * S, z), '#6a6a6a'));
        } else {
          parts.push(paint(at(new THREE.BoxGeometry(26 * S, 34 * S, 26 * S), x, top + 19 * S, z), (px, py, pz) => (Math.abs(px - x) > 12 * S || Math.abs(pz - z) > 12 * S ? '#c8a86a' : '#e8d8a8')));
          parts.push(paint(at(new THREE.ConeGeometry(28 * S, 18 * S, 4).rotateY(Math.PI / 4), x, top + 45 * S, z), '#a8402a'));
        }
        break;
      }
      case 'birdbath': {
        // A stone birdbath: a square plinth with moss, a fluted pedestal with
        // collars, a wide bowl with a lip, water with a glint and a leaf.
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, R = l.r * T, B = l.bowl * T, top = 150 * S;
        const stone = (px, py, pz) => (Math.sin(px * 0.13 + pz * 0.11) > 0.75 ? '#7a8a5a' : '#b0aa9e');
        parts.push(at(paint(new THREE.BoxGeometry(R * 2.3, 14 * S, R * 2.3), stone, 50), x, 7 * S, z));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.55, R * 0.95, top - 30 * S, 16, 3).translate(0, (top - 30 * S) / 2, 0), (px, py, pz) => (Math.floor((Math.atan2(pz, px) + Math.PI) / (Math.PI / 8)) % 2 ? '#b4aea2' : '#9a9488'), 51), x, 14 * S, z));
        for (const [y, rr] of [[18 * S, R * 1.02], [top - 18 * S, R * 0.68]]) parts.push(at(paint(new THREE.CylinderGeometry(rr, rr, 6 * S, 16), '#c0baae'), x, y, z));
        parts.push(at(paint(new THREE.CylinderGeometry(B, B * 0.55, 20 * S, 20), '#bcb6aa'), x, top + 10 * S, z));
        parts.push(at(paint(new THREE.TorusGeometry(B, 2.4 * S, 4, 24).rotateX(Math.PI / 2), '#c8c2b6'), x, top + 20 * S, z));
        parts.push(at(paint(new THREE.CircleGeometry(B * 0.95, 20).rotateX(-Math.PI / 2), (px, py, pz) => { const d = Math.hypot(px - x, pz - z); return d > B * 0.8 ? '#8ac4e8' : (px - x) < -B * 0.2 && (pz - z) < -B * 0.2 && d < B * 0.5 ? '#d8f0ff' : '#4aa0d8'; }), x, top + 18.5 * S, z));
        parts.push(at(paint(new THREE.SphereGeometry(1, 6, 3).scale(9 * S, 0.6 * S, 4 * S).rotateY(0.7), '#c88a30'), x + B * 0.3, top + 19 * S, z + B * 0.2));
        break;
      }
      case 'pool': {
        // A blue plastic kiddie pool with a white rim, half full.
        const x = l.x * T, z = l.y * T, R = l.r * T, hgt = 50 * S;
        claimDisc(l.x, l.y, l.r);
        parts.push(paint(at(new THREE.CylinderGeometry(R, R * 0.97, hgt, 24, 1, true).translate(0, hgt / 2, 0), x, 0, z), (px, py) => (py > hgt - 6 * S ? '#f4f4f4' : '#3a8ae0')));
        parts.push(paint(at(new THREE.TorusGeometry(R, 4 * S, 4, 24).rotateX(Math.PI / 2), x, hgt, z), '#f4f4f4'));
        parts.push(paint(at(new THREE.CircleGeometry(R * 0.98, 24).rotateX(-Math.PI / 2), x, hgt * 0.55, z), (px, py, pz) => { const d = Math.hypot(px - x, pz - z) / R; return d > 0.9 ? '#7ac4f4' : Math.floor(d * 6) % 2 ? '#58b0ec' : '#4aa4e4'; }));
        break;
      }
      case 'swingset': {
        // A swing set: an A-frame at each end, a top bar, two seats on chains.
        const top = 300 * S, z = l.y * T, sp = l.spread * T;
        for (const xx of [l.x0, l.x1]) for (const sgn of [-1, 1]) {
          const len = Math.hypot(top, sp), leg = new THREE.CylinderGeometry(3 * S, 3 * S, len, 6).translate(0, len / 2, 0).rotateX(sgn * Math.atan2(sp, top));
          parts.push(paint(at(leg, (xx + 0.5) * T, 0, z + sgn * sp), '#d8402a', xx));
        }
        parts.push(paint(at(new THREE.CylinderGeometry(3.4 * S, 3.4 * S, (l.x1 - l.x0) * T, 6).rotateZ(Math.PI / 2), ((l.x0 + l.x1) / 2 + 0.5) * T, top, z), '#d8402a'));
        for (const f of [0.32, 0.68]) {
          const sx = (l.x0 + (l.x1 - l.x0) * f + 0.5) * T, seat = 50 * S;
          parts.push(paint(at(new THREE.BoxGeometry(34 * S, 3 * S, 14 * S), sx, seat, z), '#2a2a2a'));
          for (const cs of [-1, 1]) parts.push(paint(at(new THREE.CylinderGeometry(0.8 * S, 0.8 * S, top - seat, 3).translate(0, (top - seat) / 2, 0), sx + cs * 15 * S, seat, z), '#9a9a9a'));
        }
        break;
      }
      case 'dandelion': {
        // A dandelion: a rosette of toothed leaves flat on the ground, a
        // hollow stem, and a head of ragged florets in three tiers on green
        // bracts; or a white seed clock.
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, h = l.h;
        parts.push(at(paint(new THREE.CylinderGeometry(1 * S, 1.3 * S, h, 5).translate(0, h / 2, 0), (px, py) => (py > h * 0.8 ? '#6a9a3a' : '#5a8a30')), x, 0, z));
        for (let k = 0; k < 5; k++) parts.push(at(toothLeaf(24 * S, 4.5 * S, k % 2 ? '#4a8a2e' : '#3e7a28', k).rotateZ(0.1).rotateY(k * 1.26 + l.seed * 3), x, 0.8 + k * 0.25, z));
        if (l.puff) {
          parts.push(at(paint(new THREE.IcosahedronGeometry(9 * S, 2), (px, py, pz) => (Math.sin(px * 1.7) * Math.sin(py * 1.9) * Math.sin(pz * 1.3) > 0.2 ? '#d8d8d0' : '#f6f6f2'), 7), x, h + 6 * S, z));
          parts.push(at(paint(new THREE.SphereGeometry(2.4 * S, 6, 4), '#c8b890'), x, h + 0.5 * S, z));
        } else {
          parts.push(at(paint(new THREE.ConeGeometry(4.5 * S, 5 * S, 8).rotateX(Math.PI), '#4a7a28'), x, h + 0.5 * S, z));
          parts.push(at(ruffle(8.5 * S, 2 * S, 12, 0.72, (px, py) => (py > 0 ? '#f8c824' : '#e8a818'), 8), x, h + 2 * S, z));
          parts.push(at(ruffle(6.5 * S, 2.4 * S, 10, 0.7, '#ffd83a', 9), x, h + 3.6 * S, z));
          parts.push(at(ruffle(3.8 * S, 2 * S, 8, 0.66, '#ffe866', 10), x, h + 5 * S, z));
        }
        break;
      }
      case 'molehill': {
        // A molehill: a heap of loose, crumbly dirt.
        const x = l.x * T, z = l.y * T, R = l.r * T;
        claimDisc(l.x, l.y, l.r);
        const g2 = new THREE.SphereGeometry(R, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).toNonIndexed(), p2 = g2.attributes.position, rs = rng(Math.floor(l.x * 31 + l.y));
        for (let i = 0; i < p2.count; i++) { const f = 0.88 + rs() * 0.24; p2.setXYZ(i, p2.getX(i) * f, p2.getY(i) * f, p2.getZ(i) * f); }
        parts.push(paint(at(g2, x, 0, z), (px, py) => (py > R * 0.35 ? '#6a4a2e' : '#5a3e26'), 99));
        break;
      }
      case 'web': {
        const pts = [], cx = (l.x + 0.5) * T, cy = 58 * S, cz = (l.y + 0.5) * T, R = l.r * T * 0.85;
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pts.push(cx, cy, cz, cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9, cz); }
        for (let ring = 1; ring <= 6; ring++) for (let k = 0; k < 12; k++) {
          const a0 = (k / 12) * Math.PI * 2, a1 = ((k + 1) / 12) * Math.PI * 2, rr = (ring / 6.5) * R;
          pts.push(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr * 0.9, cz, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr * 0.9, cz);
        }
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        extra.push(new THREE.LineSegments(lg, WEB_MAT));
        break;
      }
      // ---------- the rest of the yard (build 11) ----------
      case 'trashcan': {
        // A wheelie bin: a ribbed, tapered body, a bumper round the foot,
        // two wheels and an axle at the back, a lid with a lip and a hinge
        // strip, a handle bar.
        const x = l.x * T, z = l.y * T, R = l.r * T, h = 150 * S, c = l.color;
        const body = new THREE.CylinderGeometry(R, R * 0.86, h, 24, 4).translate(0, h / 2, 0), p = body.attributes.position;
        for (let i = 0; i < p.count; i++) { const ax = p.getX(i), az = p.getZ(i), rr = Math.hypot(ax, az); if (rr > 1) { const k = Math.round(Math.atan2(az, ax) / (Math.PI / 12)) & 1 ? 0.95 : 1; p.setX(i, ax * k); p.setZ(i, az * k); } }
        parts.push(at(paint(body, (px, py, pz) => (py < 10 * S ? shade(c, 0.7) : Math.floor((Math.atan2(pz, px) + Math.PI) / (Math.PI / 12)) & 1 ? shade(c, 0.86) : c), 31), x, 0, z));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.92, R * 0.9, 6 * S, 16), shade(c, 0.6)), x, 6 * S, z));
        for (const sx of [-1, 1]) parts.push(at(paint(new THREE.CylinderGeometry(11 * S, 11 * S, 6 * S, 12).rotateZ(Math.PI / 2), (px, py, pz) => (Math.hypot(py, pz) < 5 * S ? '#7a7a7a' : '#161616')), x + sx * R * 0.6, 11 * S, z - R * 0.86));
        parts.push(rod([x - R * 0.6, 11 * S, z - R * 0.86], [x + R * 0.6, 11 * S, z - R * 0.86], 2 * S, 2 * S, '#5a5a5a', 6));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 1.06, R * 1.06, 8 * S, 18), (px, py) => (py > 2 * S ? shade(c, 0.82) : shade(c, 0.7)), 32), x, h + 4 * S, z));
        parts.push(at(paint(new THREE.BoxGeometry(R * 1.6, 4 * S, 6 * S), shade(c, 0.55)), x, h + 6 * S, z - R * 0.95));
        parts.push(at(paint(new THREE.BoxGeometry(R * 1.1, 5 * S, 5 * S), '#2a2a2a'), x, h + 10 * S, z - R * 0.7));
        break;
      }
      case 'bag': {
        // A tied rubbish sack (or a sack of fertiliser), slumped.
        const x = l.x * T, z = l.y * T, R = l.r * T, g2 = lumpy(new THREE.SphereGeometry(R, 10, 7).scale(1, 0.7, 1), R * 0.12, l.x);
        parts.push(paint(at(g2, x, R * 0.55, z), (px, py) => (l.color ? (py > R * 0.9 ? '#8a7a50' : l.color) : py > R * 0.95 ? '#3a3a3a' : '#1e1e22'), 33));
        break;
      }
      case 'cooler': {
        // A picnic cooler: a blue body with a white band, a white lid with a
        // recessed top, side handles, a latch and a drain plug at the front,
        // rubber feet.
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T, h = 60 * S, wx = l.w * T, wz = l.h * T;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(at(paint(new THREE.BoxGeometry(10 * S, 3 * S, 10 * S), '#2a2a2a'), cx + sx * (wx / 2 - 8 * S), 1.5 * S, cz + sz * (wz / 2 - 8 * S)));
        parts.push(at(paint(new THREE.BoxGeometry(wx, h - 3 * S, wz, 2, 3, 2), (px, py) => (Math.abs(py - h * 0.12) < 4 * S ? '#f2f2ee' : py < -h * 0.38 ? '#1e5aa0' : '#2a6ab8'), 34), cx, 3 * S + (h - 3 * S) / 2, cz));
        parts.push(at(paint(new THREE.BoxGeometry(wx * 1.04, 10 * S, wz * 1.04), (px, py) => (py < -3 * S ? '#dcdcd6' : '#f2f2ee'), 35), cx, h + 5 * S, cz));
        parts.push(at(paint(new THREE.BoxGeometry(wx * 0.8, 1.5 * S, wz * 0.7), '#e2e2dc'), cx, h + 10.5 * S, cz));
        for (const sx of [-1, 1]) parts.push(at(paint(new THREE.BoxGeometry(5 * S, 8 * S, wz * 0.45), '#f2f2ee'), cx + sx * (wx / 2 + 2.5 * S), h - 12 * S, cz));
        parts.push(at(paint(new THREE.BoxGeometry(12 * S, 10 * S, 3 * S), '#d8d8d0'), cx, h - 2 * S, cz + wz / 2 + 1.5 * S));
        parts.push(at(paint(new THREE.CylinderGeometry(3 * S, 3 * S, 3 * S, 8).rotateX(Math.PI / 2), '#f2f2ee'), cx + wx * 0.38, 9 * S, cz + wz / 2 + 1.5 * S));
        break;
      }
      case 'boulder': {
        const st = smoothRock(l.seed, 3, 0.28), rs = rng(Math.floor(l.seed * 1e6));
        const R = l.r * T, hgt = R * (0.7 + rs() * 0.3);
        st.scale(R * 1.05, hgt, R * 1.05).rotateY(rs() * 3);
        stoneParts.push(at(st, l.x * T, hgt * 0.35, l.y * T));
        break;
      }
      case 'succulent': case 'herb': case 'bush': {
        // Rosettes of fat leaves (succulents), or rounded leafy bushes.
        const x = l.x * T, z = l.y * T, R = l.r * T, rs = rng(Math.floor(l.seed * 1e6));
        if (l.kind === 'succulent') {
          for (let k = 0; k < 9; k++) { const a = k * 2.4; parts.push(paint(at(new THREE.ConeGeometry(R * 0.22, R * 0.9, 5).rotateZ(-1.0 + (k % 3) * 0.25).translate(R * 0.3, R * 0.25, 0).rotateY(a), x, 0, z), k % 2 ? '#6aa08a' : '#8ab89a', k)); }
        } else {
          const tint = l.kind === 'bush' ? ['#2e5a24', '#3a6a2a'] : [['#4aa048', '#5ab858'], ['#2e6a2e', '#3a7a34'], ['#7a8a6a', '#8a9a78']][l.kind2 || 0];
          for (let k = 0; k < 6; k++) { const a = rs() * Math.PI * 2, d = rs() * R * 0.5; parts.push(paint(at(new THREE.IcosahedronGeometry(R * (0.45 + rs() * 0.25), 0), x + Math.cos(a) * d, R * (0.4 + rs() * 0.5), z + Math.sin(a) * d), tint[k % 2], k)); }
        }
        break;
      }
      case 'cactus': {
        const x = l.x * T, z = l.y * T, R = l.r * T, h = 110 * S;
        parts.push(paint(at(new THREE.CylinderGeometry(R * 0.7, R * 0.8, h, 8).translate(0, h / 2, 0), x, 0, z), (px, py, pz) => (Math.floor(Math.atan2(pz - z, px - x) * 4) % 2 ? '#3a7a3a' : '#2e6a30')));
        for (const s2 of [-1, 1]) parts.push(paint(at(new THREE.CylinderGeometry(R * 0.4, R * 0.4, h * 0.35, 6).translate(0, h * 0.18, 0), x + s2 * R * 1.1, h * 0.4, z), '#3a7a3a'));
        break;
      }
      case 'hedge': {
        // A hedge: a dense mass of dark leafy domes, as tall as a fence.
        const rs = rng(Math.floor(l.seed * 1e6)), n = Math.max(3, Math.round((l.w * l.h) / (5 * S * S)));
        for (let k = 0; k < n; k++) {
          const x = (l.x0 + rs() * l.w) * T, z = (l.y0 + rs() * l.h) * T, R = (3 + rs() * 2.5) * S * T, y = (60 + rs() * 90) * S;
          parts.push(paint(at(new THREE.IcosahedronGeometry(R, 1).scale(1, 0.85, 1), x, y, z), (px, py) => (py > y + R * 0.4 ? '#3a6a2a' : py > y ? '#2e5a22' : '#22461a'), k + 40));
        }
        break;
      }
      case 'hosereel': {
        const x = l.x * T, z = l.y * T, R = l.r * T;
        parts.push(paint(at(new THREE.BoxGeometry(R * 1.6, 8 * S, R * 0.4), x, 4 * S, z), '#5a5a5a'));
        for (let k = 0; k < 4; k++) parts.push(paint(at(new THREE.TorusGeometry(R * 0.75, 4 * S, 5, 16).rotateY(Math.PI / 2), x - R * 0.15 + k * 6 * S, R * 0.85, z), k % 2 ? '#2e8a3a' : '#3a9a46', k));
        break;
      }
      case 'drainpipe': {
        const x = l.x * T, z = l.y * T;
        if (l.out) parts.push(paint(at(new THREE.CylinderGeometry(9 * S, 9 * S, 80 * S, 10).rotateX(Math.PI / 2), x, 9 * S, z), '#8a8a86'));
        else { parts.push(paint(at(new THREE.CylinderGeometry(7 * S, 7 * S, 320 * S, 8).translate(0, 160 * S, 0), x, 0, z), '#9a9a96')); parts.push(paint(at(new THREE.CylinderGeometry(7 * S, 9 * S, 30 * S, 8).rotateX(-1.1), x, 12 * S, z + 12 * S), '#9a9a96')); }
        break;
      }
      case 'squash': {
        const x = l.x * T, z = l.y * T, R = l.r * T, rs = rng(Math.floor(l.seed * 1e6));
        for (let k = 0; k < 5; k++) parts.push(paint(at(new THREE.SphereGeometry(1, 8, 4).scale(R * 0.75, 2 * S, R * 0.6).translate(R * 0.6, 0, 0).rotateZ(0.3).rotateY(k * 1.26 + rs()), x, 30 * S + k * 4 * S, z), k % 2 ? '#3a7a2a' : '#4a8a34', k));
        parts.push(paint(at(new THREE.SphereGeometry(R * 0.38, 10, 7).scale(1.4, 0.9, 1), x + R * 0.3, R * 0.3, z - R * 0.2), (px, py) => (py > R * 0.45 ? '#f0a83a' : '#e08a2a'), 13));
        break;
      }
      case 'stepstone': {
        // A flat stepping stone, barely proud of the grass (you can walk on it).
        const x = l.x * T, z = l.y * T, R = l.r * T, rs = rng(Math.floor(l.seed * 1e6));
        const g2 = new THREE.CylinderGeometry(R, R * 1.02, 4 * S, 9).scale(1, 1, 0.8 + rs() * 0.3).rotateY(rs() * 3);
        stoneParts.push(at(g2, x, 2 * S, z));
        break;
      }
      case 'gnome': {
        // A garden gnome: boots, a blue coat with a belt and buckle, arms,
        // a pink face with a round nose, a big white beard, a tall red hat.
        const x = l.x * T, z = l.y * T, R = l.r * T;
        for (const sx of [-1, 1]) parts.push(at(paint(new THREE.SphereGeometry(R * 0.36, 8, 5).scale(1, 0.6, 1.5), (px, py) => (py < -R * 0.1 ? '#2a180e' : '#4a2e1a')), x + sx * R * 0.4, R * 0.18, z + R * 0.92));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.7, R, 70 * S, 12, 3).translate(0, 35 * S, 0), (px, py) => (py < 7 * S ? '#4a7ad0' : '#2a5ab0'), 47), x, 0, z));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.86, R * 0.88, 7 * S, 12), '#3a2416'), x, 38 * S, z));
        parts.push(at(paint(new THREE.BoxGeometry(R * 0.45, 9 * S, 2 * S), (px, py, pz) => (Math.abs(px) < R * 0.12 && Math.abs(py) < 2 * S ? '#3a2416' : '#e8c040')), x, 38 * S, z + R * 0.88));
        for (const sx of [-1, 1]) {
          parts.push(rod([x + sx * R * 0.72, 64 * S, z], [x + sx * R * 0.95, 40 * S, z + R * 0.45], R * 0.2, R * 0.17, '#2a5ab0', 6));
          parts.push(at(paint(new THREE.SphereGeometry(R * 0.18, 6, 4), '#f0c0a0'), x + sx * R * 0.95, 38 * S, z + R * 0.5));
        }
        parts.push(at(paint(new THREE.SphereGeometry(R * 0.55, 10, 6), '#f0c0a0'), x, 82 * S, z));
        parts.push(at(paint(new THREE.SphereGeometry(R * 0.16, 6, 4), '#e8988a'), x, 82 * S, z + R * 0.55));
        for (const sx of [-1, 1]) parts.push(at(paint(new THREE.SphereGeometry(R * 0.06, 4, 3), '#1a1a1a'), x + sx * R * 0.2, 86 * S, z + R * 0.48));
        parts.push(at(paint(new THREE.ConeGeometry(R * 0.62, 34 * S, 10).rotateX(Math.PI).translate(0, -17 * S, 0), (px, py) => (Math.sin(px * 0.8 + py * 0.3) > 0.5 ? '#e4e4de' : '#f6f6f2'), 48), x, 80 * S, z + R * 0.32));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.62, R * 0.62, 5 * S, 12), '#b81e1e'), x, 91 * S, z));
        parts.push(at(paint(new THREE.ConeGeometry(R * 0.6, 60 * S, 10).translate(0, 30 * S, 0).rotateX(-0.12), (px, py) => (py > 40 * S ? '#e03a3a' : '#d02a2a'), 49), x, 92 * S, z));
        if (l.rod) parts.push(paint(at(new THREE.CylinderGeometry(1 * S, 1 * S, 120 * S, 4).rotateZ(-0.8).translate(0, 50 * S, 0), x + R, 40 * S, z), '#7a5a32'));
        break;
      }
      case 'oak': {
        // The Oak's trunk: wide at the foot, ribbed bark, up out of sight.
        const x = l.x * T, z = l.y * T, R = l.r * T, h = 900 * S;
        parts.push(paint(at(new THREE.CylinderGeometry(R * 0.82, R * 1.15, h, 18, 6).translate(0, h / 2, 0), x, 0, z), (px, py, pz) => (Math.floor(Math.atan2(pz - z, px - x) * 5 + py / (40 * S)) % 2 ? '#5a4632' : '#4a3a28'), 71));
        break;
      }
      case 'root': {
        const len = l.len * T, g2 = new THREE.CylinderGeometry(0.9 * S * T * 0.5, 1.5 * S * T * 0.5, len, 7).rotateZ(Math.PI / 2).translate(len / 2, 0, 0).rotateY(-l.a);
        parts.push(paint(at(g2, l.x * T, 4 * S, l.y * T), (px, py) => (py > 6 * S ? '#6a5238' : '#4e3c28'), 72));
        break;
      }
      case 'twig': parts.push(logGeo({ ...l, h: 1, twig: true })); break;
      case 'shed': {
        // The garden shed: plank walls, a door, a pitched roof of felt.
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T, w2 = l.w * T, d2 = l.h * T, h = 240 * S;
        parts.push(paint(at(new THREE.BoxGeometry(w2, h, d2).translate(0, h / 2, 0), cx, 0, cz), (px) => (Math.floor(px / (10 * S)) % 2 ? '#8a6a46' : '#7a5c3c'), 73));
        parts.push(paint(at(new THREE.BoxGeometry(46 * S, 150 * S, 4 * S).translate(0, 75 * S, 0), cx, 0, cz + d2 / 2 + 2 * S), '#5a4430'));
        // The roof: two slopes of overlapping shingle rows up to a ridge.
        const run = d2 * 0.6, rise = 80 * S, slope = Math.hypot(run, rise), tilt = Math.atan2(rise, run), rows = 9;
        for (const sd of [-1, 1]) for (let k = 0; k < rows; k++) {
          const f = (k + 0.5) / rows, row = new THREE.BoxGeometry(w2 * 1.08, 3 * S, (slope / rows) * 1.15).rotateX(sd * tilt);
          parts.push(paint(at(row, cx, h + rise * (1 - f), cz + sd * run * f), k % 2 ? '#5a4e48' : '#4a403c', 74 + k));
        }
        break;
      }
      case 'thistle': {
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, h = l.h;
        parts.push(paint(at(new THREE.CylinderGeometry(1.2 * S, 1.6 * S, h, 4).translate(0, h / 2, 0), x, 0, z), '#5a7a3a'));
        for (let k = 0; k < 3; k++) parts.push(paint(at(new THREE.ConeGeometry(4 * S, 22 * S, 3).rotateZ(1.2).rotateY(k * 2.1 + l.seed * 4), x, h * (0.3 + k * 0.2), z), '#4a6a32', k));
        if (!l.weed) { parts.push(paint(at(new THREE.SphereGeometry(7 * S, 6, 4), x, h, z), '#4a6a2a')); parts.push(paint(at(new THREE.ConeGeometry(7 * S, 12 * S, 8), x, h + 9 * S, z), '#a85ac0')); }
        break;
      }
      case 'toadhole':
        decals.push(paint(at(new THREE.CircleGeometry(l.r * T, 12).rotateX(-Math.PI / 2).scale(1.3, 1, 1), l.x * T, 0, l.y * T), (px, py, pz) => (Math.hypot((px - l.x * T) / 1.3, pz - l.y * T) < l.r * T * 0.6 ? '#140e08' : '#4a3a24')));
        break;
      case 'sprinkler': {
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T;
        parts.push(paint(at(new THREE.CylinderGeometry(7 * S, 9 * S, 10 * S, 10), x, 5 * S, z), '#2a6a2a'));
        parts.push(paint(at(new THREE.CylinderGeometry(2 * S, 2 * S, 22 * S, 6), x, 20 * S, z), '#b8b8b0'));
        parts.push(paint(at(new THREE.BoxGeometry(26 * S, 3 * S, 4 * S), x, 31 * S, z), '#b8b8b0'));
        break;
      }
      case 'trampoline': {
        // Legs and a padded ring on the ground; the mat itself is see-through
        // so an ant under it is never hidden.
        const x = l.x * T, z = l.y * T, R = l.r * T, h = 160 * S;
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; parts.push(paint(at(new THREE.CylinderGeometry(3 * S, 3 * S, h, 6).translate(0, h / 2, 0), x + Math.cos(a) * R * 0.92, 0, z + Math.sin(a) * R * 0.92), '#2a2a2a', k)); }
        parts.push(paint(at(new THREE.TorusGeometry(R, 9 * S, 5, 28).rotateX(Math.PI / 2), x, h, z), '#2a6ad8'));
        const mat = new THREE.Mesh(new THREE.CircleGeometry(R * 0.9, 28).rotateX(-Math.PI / 2), TRAMP_MAT);
        mat.position.set(x, h - 2 * S, z); extra.push(mat);
        decals.push(paint(at(new THREE.CircleGeometry(R * 0.95, 24).rotateX(-Math.PI / 2), x, 0, z), '#2e4a20'));
        break;
      }
      case 'ball': {
        const x = l.x * T, z = l.y * T, R = l.r * T;
        parts.push(paint(at(new THREE.IcosahedronGeometry(R, 1), x, R, z), (px, py, pz) => (Math.abs(Math.sin((px - x) * 0.02) * Math.cos((pz - z) * 0.02 + py * 0.01)) > 0.75 ? '#1a1a1a' : '#f4f4f0'), 75));
        break;
      }
      case 'mushroom': {
        // A toadstool: a bulb at the foot, a stem with a skirt, gills under a
        // cap paler at its edge; red caps carry raised white warts.
        const x = l.x * T, z = l.y * T, R = l.r * T, h = 30 * S + R * 0.8, rs = rng(Math.floor(l.seed * 1e6)), red = rs() < 0.5;
        const capC = red ? '#c8302a' : '#b8946a', capTop = red ? '#e04a36' : '#c8a47a', edge = red ? '#a82420' : '#e0c8a0';
        parts.push(at(paint(new THREE.SphereGeometry(R * 0.46, 8, 5).scale(1, 0.6, 1), '#e4d8c0'), x, R * 0.12, z));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.28, R * 0.4, h, 8, 2).translate(0, h / 2, 0), (px, py) => (py < h * 0.3 ? '#e2d6be' : '#efe6d2')), x, 0, z));
        parts.push(at(paint(new THREE.CylinderGeometry(R * 0.32, R * 0.46, 4 * S, 10, 1, true), '#f4ecdc'), x, h * 0.72, z));
        parts.push(at(paint(new THREE.RingGeometry(R * 0.28, R * 0.98, 18, 1).rotateX(Math.PI / 2), (px, py, pz) => (Math.floor((Math.atan2(pz, px) + 4) * 9) % 2 ? '#e8dcc4' : '#cbbca0')), x, h + 0.2, z));
        parts.push(at(paint(new THREE.SphereGeometry(R, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), (px, py) => (py < R * 0.12 ? edge : py > R * 0.45 ? capTop : capC), 76), x, h, z));
        if (red) for (let k = 0; k < 8; k++) { const a = rs() * 6.3, e = 0.25 + rs() * 0.55, sy = Math.sqrt(1 - e * e) * R * 0.6; parts.push(at(paint(new THREE.SphereGeometry(R * (0.08 + rs() * 0.06), 5, 3).scale(1, 0.5, 1), '#f6f2e8'), x + Math.cos(a) * e * R, h + sy, z + Math.sin(a) * e * R)); }
        break;
      }
      case 'barrow': {
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T;
        parts.push(paint(at(new THREE.BoxGeometry(l.w * T, 16 * S, l.h * T), cx, 22 * S, cz), '#2a7ac8'));
        parts.push(paint(at(new THREE.CylinderGeometry(9 * S, 9 * S, 5 * S, 10).rotateX(Math.PI / 2), cx + l.w * T * 0.55, 9 * S, cz), '#1a1a1a'));
        break;
      }
      case 'frisbee': {
        const x = l.x * T, z = l.y * T, R = l.r * T;
        parts.push(paint(at(new THREE.TorusGeometry(R, 4 * S, 4, 22).rotateX(Math.PI / 2), x, 4 * S, z), '#e8402a'));
        decals.push(paint(at(new THREE.CircleGeometry(R, 22).rotateX(-Math.PI / 2), x, 0, z), '#d8382a'));
        break;
      }
      case 'bone': {
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T, len = l.w * T;
        parts.push(paint(at(new THREE.CylinderGeometry(6 * S, 6 * S, len, 8).rotateZ(Math.PI / 2), cx, 7 * S, cz), '#ece2cc'));
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(at(new THREE.SphereGeometry(8 * S, 8, 6), cx + sx * len / 2, 8 * S, cz + sz * 6 * S), '#f0e8d6'));
        break;
      }
      case 'truck': {
        // A plastic toy dump truck: red cab, yellow tipper, fat black wheels.
        const cx = (l.x0 + l.w / 2) * T, cz = (l.y0 + l.h / 2) * T, w2 = l.w * T, d2 = l.h * T;
        parts.push(paint(at(new THREE.BoxGeometry(w2 * 0.35, 50 * S, d2 * 0.9), cx - w2 * 0.3, 40 * S, cz), '#d8302a'));
        parts.push(paint(at(new THREE.BoxGeometry(w2 * 0.6, 34 * S, d2), cx + w2 * 0.18, 44 * S, cz), '#f2c020'));
        for (const fx of [-0.32, 0.3]) for (const fz of [-1, 1]) parts.push(paint(at(new THREE.CylinderGeometry(15 * S, 15 * S, 10 * S, 12).rotateX(Math.PI / 2), cx + w2 * fx, 15 * S, cz + fz * d2 * 0.5), '#1a1a1a'));
        break;
      }
      case 'reed': {
        const x = (l.x + 0.5) * T, z = (l.y + 0.5) * T, h = l.h;
        for (let k = 0; k < 3; k++) parts.push(paint(at(new THREE.CylinderGeometry(0.8 * S, 1.4 * S, h * (0.7 + k * 0.15), 3).translate(0, h * (0.35 + k * 0.07), 0).rotateZ((k - 1) * 0.12).rotateY(l.seed * 6 + k), x, 0, z), k % 2 ? '#5a7a3a' : '#6a8a42', k));
        if (l.seed > 0.4) parts.push(paint(at(new THREE.CylinderGeometry(3 * S, 3 * S, 22 * S, 6), x, h * 0.9, z), '#6a4228'));
        break;
      }
      case 'slime':
        for (const [x, y, a] of l.pts) decals.push(paint(at(new THREE.PlaneGeometry(26 * S * T / 16, 4 * S).rotateX(-Math.PI / 2).rotateY(a), x * T, 0, y * T), '#b8c0b4'));
        break;
      case 'leafheap': {
        // A heap of fallen leaves: flat, overlapping, in autumn colours.
        const x = l.x * T, z = l.y * T, R = l.r * T, rs = rng(Math.floor(l.seed * 1e6)), n = Math.round(10 * l.r);
        const cols = ['#b8642a', '#9a4a22', '#c88a30', '#7a3a1e', '#a87a3a'];
        for (let k = 0; k < n; k++) { const a = rs() * Math.PI * 2, d = Math.sqrt(rs()) * R, hh = Math.sqrt(Math.max(0, 1 - (d / R) ** 2)) * R * 0.5;
          parts.push(paint(at(new THREE.SphereGeometry(1, 6, 3).scale(14 * S, 1.5 * S, 8 * S).rotateX((rs() - 0.5) * 0.8).rotateY(rs() * 6), x + Math.cos(a) * d, hh + 2 * S, z + Math.sin(a) * d), cols[k % cols.length], k)); }
        break;
      }
      case 'firemound': {
        // A fire-ant mound: crumbly red earth, entry holes, and its ants.
        const x = l.x * T, z = l.y * T, R = l.r * T;
        const g2 = lumpy(new THREE.SphereGeometry(R, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, l.big ? 0.5 : 0.4, 1), R * 0.06, l.x);
        parts.push(paint(at(g2, x, 0, z), (px, py) => (py > R * 0.3 ? '#9a5232' : '#7a4028'), 77));
        const holes = l.big ? 7 : 2;
        for (let k = 0; k < holes; k++) { const a = k * 2.4, d = R * (0.2 + (k % 3) * 0.2); parts.push(paint(at(new THREE.CircleGeometry(4 * S, 8).rotateX(-Math.PI / 2), x + Math.cos(a) * d, R * (l.big ? 0.5 : 0.4) * Math.sqrt(Math.max(0.05, 1 - (d / R) ** 2)) + 0.5 * S, z + Math.sin(a) * d), '#1a0e08')); }
        break;
      }
      default: break;
    }
}

// Where a landmark sits (tiles), to file it under a region.
function anchor(l) {
  if (l.kind === 'grease') return [l.spots[0][0], l.spots[0][1]];
  if (l.kind === 'slime') return [l.pts[0][0], l.pts[0][1]];
  const mid = (c, c0, c1, len) => (c != null ? c : c0 + (len != null ? len : c1 != null ? c1 - c0 : 0) / 2);
  return [mid(l.x, l.x0, l.x1, l.w), mid(l.y, l.y0, l.y1, l.h)];
}

// Tiles a landmark stands on, so plain rocks aren't drawn under it.
function claimAll(w) {
  const W = w.W, H = w.H, own = new Uint8Array(W * H);
  const rect = (x0, y0, ww, hh) => { for (let y = Math.floor(y0); y < y0 + hh; y++) for (let x = Math.floor(x0); x < x0 + ww; x++) if (x >= 0 && y >= 0 && x < W && y < H) own[y * W + x] = 1; };
  const disc = (cx, cy, rr) => { for (let y = Math.floor(cy - rr - 1); y <= cy + rr + 1; y++) for (let x = Math.floor(cx - rr - 1); x <= cx + rr + 1; x++) if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= rr + 0.5) own[y * W + x] = 1; };
  for (const l of w.landmarks) {
    if (l.kind === 'frame') rect(l.x0, l.y0, l.x1 - l.x0 + 1, l.y1 - l.y0 + 1);
    else if (l.kind === 'root') for (let t = 0; t <= l.len; t += 0.5) disc(l.x + Math.cos(l.a) * t, l.y + Math.sin(l.a) * t, 1.5);
    else if (l.x0 != null && l.w != null) rect(l.x0, l.y0, l.w, l.h);
    else if (l.r != null && l.x != null) disc(l.x, l.y, l.r);
    else if (l.x != null) rect(l.x, l.y, 1, 1);
  }
  return own;
}

const grassTex = () => canvasTexture(16, 16, (c) => {
  const rr = rng(8);
  for (let x = 0; x < 16; x++) { const h = 5 + Math.floor(rr() * 11); c.fillStyle = rr() < 0.5 ? '#4f7a2e' : '#3a5e22'; c.fillRect(x, 16 - h, 1, h); }
}, { wrap: false });

// ---------- the yard, region by region ----------
// Regions within reach of the camera are built (nearest first, a slice of
// work a frame), and those well beyond it are thrown away again, so only the
// few around you are ever in memory. Reach is at least LOAD tiles, more when
// the view shows more ground (zoomed out on a wide screen). A thrown-away
// region keeps a small painting of its ground, for the view into the distance.
const LOAD = AREA * 0.75, MAX_REACH = AREA * 1.25, SLACK = AREA * 0.55;
const BUDGET = 6, RUSH = 24; // ms of building a frame: ahead of you, or already on screen
export class YardScenery {
  constructor(w) {
    this.w = w;
    this.group = new THREE.Group();
    this.onLoaded = null; // (region index) once a region is fully built
    const W = w.W, H = w.H, gw = W * T, gh = H * T;
    this.mats = {
      part: psx({ vertexColors: true }, { see: true }),
      decal: psx({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
      rock: psx({ map: rampTexture(21, PALETTE.rock, { size: 16, repeat: [0.08, 0.08] }) }, { see: true }),
      grass: psx({ map: grassTex(), alphaTest: 0.5, side: THREE.DoubleSide }),
    };
    // Lists the ground fields read, worked out once for the whole yard.
    const pts = (kind) => w.landmarks.filter((l) => l.kind === kind);
    this.L = {
      flowers: [...pts('flower').filter((l) => !l.small).map((l) => [l.x + 0.5, l.y + 0.5]), ...pts('strawberry').map((l) => [l.x0 + l.w / 2, l.y0 + l.h / 2]), ...pts('web').map((l) => [l.x + 0.5, l.y + 2 * S])],
      logs: pts('log'), heap: pts('heap')[0], mats: pts('mat'), clovers: pts('clover'),
      wet: [...w.puddles.map(([x, y]) => [x + 0.5, y + 0.5, 3 * S]), ...pts('hose').map((l) => [l.x, l.y, l.r]), ...pts('spigot').map((l) => [l.x0 + l.w, l.y0 + l.h / 2, 2 * S])],
    };
    this.own = claimAll(w);
    // Each region: its bounds, its landmarks, and its far-off ground.
    this.regions = AREAS.map((A, i) => {
      const b = areaBounds(i);
      // The layers under the ground (the underlay, then each region's far
      // painting) draw first and never write depth (build 12.1). Stacked
      // a hair apart, they fought the ground on phones with a coarse depth
      // buffer, which showed as dark bands across the screen. The far painting
      // also stays under the near ground, a tile wider, so any crack where a
      // fine near grid meets a coarse far one shows ground.
      const far = new THREE.Mesh(new THREE.PlaneGeometry((AREA + 2) * T, (AREA + 2) * T, 8, 8).rotateX(-Math.PI / 2).translate((b.x0 + AREA / 2) * T, 0, (b.y0 + AREA / 2) * T), underMat(psx({ color: GROUND_TINT[A.ground] || GROUND_TINT.grass })));
      far.renderOrder = -1;
      this.group.add(far);
      return { i, b, lms: [], far, near: null, small: null, job: null };
    });
    for (const l of w.landmarks) {
      if (GROUND_ONLY.has(l.kind)) continue;
      if (l.kind === 'pits') { for (const p of l.pits) this._file({ kind: 'pit', ...p }); continue; }
      this._file(l);
    }

    // The house's brick wall along the top of the yard.
    const wall = pts('wall')[0];
    if (wall) {
      const ww = wall.w * T, brick = canvasTexture(32, 16, (c) => {
        c.fillStyle = '#5a4a40'; c.fillRect(0, 0, 32, 16);
        c.fillStyle = '#9a4632'; c.fillRect(1, 1, 14, 6); c.fillRect(17, 1, 14, 6);
        c.fillStyle = '#8a3a2a'; c.fillRect(-7, 9, 14, 6); c.fillRect(9, 9, 14, 6); c.fillRect(25, 9, 14, 6);
      }, { repeat: [ww / (64 * S), 6] });
      this.group.add(new THREE.Mesh(new THREE.BoxGeometry(ww, 190 * S, T).translate(wall.x0 * T + ww / 2, 95 * S, T / 2), psx({ map: brick })));
    }
    // A wooden fence round the rest: weathered boards on two rails.
    const boards = canvasTexture(32, 32, (c) => {
      for (let x = 0; x < 32; x += 8) { c.fillStyle = (x / 8) % 2 ? '#8a6e4a' : '#7e6444'; c.fillRect(x, 0, 7, 32); c.fillStyle = '#4a3a28'; c.fillRect(x + 7, 0, 1, 32); }
      c.fillStyle = '#6a5438'; c.fillRect(0, 6, 32, 3); c.fillRect(0, 24, 32, 3);
    });
    const fh = 170 * S, fence = (x0, z0, len, along) => {
      const t = boards.clone(); t.needsUpdate = true; t.repeat.set(len / (32 * S), 1);
      const geo = along === 'x' ? new THREE.BoxGeometry(len, fh, 1.6 * T).translate(x0 + len / 2, fh / 2, z0) : new THREE.BoxGeometry(1.6 * T, fh, len).translate(x0, fh / 2, z0 + len / 2);
      this.group.add(new THREE.Mesh(geo, psx({ map: t })));
    };
    for (const f of pts('fence')) {
      if (f.side === 's') fence(0, gh - T, gw, 'x');
      else if (f.side === 'n') fence(f.x0 * T, T, (f.x1 - f.x0) * T, 'x');
      else fence(f.side === 'w' ? T : gw - T, 0, gh, 'z');
    }
    // Past the fence: the neighbours' grass out to the fog, so the edge
    // never shows open sky. Past the wall: the house.
    const M = 60 * S * T;
    const underTex = rampTexture(27, ['#2e4a1c', '#34521e', '#3a5a22', '#2a4418'], { size: 16, repeat: [(gw + M * 2) / 64, (gh + M * 2) / 64] });
    const under = new THREE.Mesh(new THREE.PlaneGeometry(gw + M * 2, gh + M * 2, 8, 8).rotateX(-Math.PI / 2).translate(gw / 2, 0, gh / 2), underMat(psx({ map: underTex })));
    under.renderOrder = -2;
    this.group.add(under);
    if (wall) this.group.add(new THREE.Mesh(new THREE.BoxGeometry(wall.w * T, 420 * S, 300 * S).translate((wall.x0 + wall.w / 2) * T, 210 * S, -150 * S), psx({ color: '#b8ae9c' })));
  }

  _file(l) {
    const [x, y] = anchor(l), i = this.w.area[Math.max(0, Math.min(this.w.H - 1, Math.floor(y))) * this.w.W + Math.max(0, Math.min(this.w.W - 1, Math.floor(x)))];
    this.regions[i].lms.push(l);
  }

  // How far (tiles) a region is from a point: 0 inside it.
  _dist(R, tx, ty) { const b = R.b; return Math.max(0, b.x0 - tx, tx - b.x1 - 1, b.y0 - ty, ty - b.y1 - 1); }

  get loaded() { return this.regions.filter((R) => R.near).map((R) => R.i); }
  get busy() { return this.regions.some((R) => R.job); }

  // Call every frame with the camera's target (px) and how far (tiles) the
  // view reaches from it.
  update(x, z, view = 0, budget, reach) {
    const tx = x / T, ty = z / T;
    reach = reach ?? Math.min(MAX_REACH, Math.max(LOAD, view + 12));
    for (const R of this.regions) if ((R.near || R.job) && this._dist(R, tx, ty) > reach + SLACK) this._unload(R);
    // A hole on screen is filled faster than the ground ahead is prepared.
    budget = budget ?? (this.regions.some((R) => !R.near && this._dist(R, tx, ty) < view) ? RUSH : BUDGET);
    const t0 = performance.now();
    while (performance.now() - t0 < budget) {
      let R = this.regions.find((Q) => Q.job);
      if (!R) {
        let bd = reach;
        for (const Q of this.regions) { if (Q.near) continue; const d = this._dist(Q, tx, ty); if (d < bd) { bd = d; R = Q; } }
        if (!R) return;
        R.job = this._build(R);
      }
      if (R.job.next().done) { R.job = null; if (this.onLoaded) this.onLoaded(R.i); }
    }
  }

  // Build what's on screen round a point now (the first frame, a jump).
  loadNow(x, z, view = AREA * 0.3) { this.update(x, z, view, Infinity, Math.min(MAX_REACH, view)); }

  _unload(R) {
    if (R.job) { R.job.return(); R.job = null; }
    if (R.near) {
      this.group.remove(R.near);
      R.near.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.userData.own) { o.material.map.dispose(); o.material.dispose(); } });
      R.near = null;
    }
    R.far.visible = true;
  }

  // One region, a slice at a time (each yield hands the frame back).
  *_build(R) {
    const w = this.w, b = R.b, W = w.W, r = rng(17 + R.i * 101), g = new THREE.Group();
    const out = {};
    yield* featureFields(w, this.L, b, out);
    const F = out.F;
    yield* paintGround(w, F, b, out);
    const tex = textureFrom(out.canvas);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(AREA * T, AREA * T, AREA, AREA).rotateX(-Math.PI / 2).translate((b.x0 + AREA / 2) * T, 0, (b.y0 + AREA / 2) * T), psx({ map: tex }));
    ground.userData.own = true;
    g.add(ground);
    // Keep a small copy of the painting for when this region is far away.
    if (!R.small) {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const cg = c.getContext('2d'); cg.imageSmoothingEnabled = true; cg.drawImage(out.canvas, 0, 0, 160, 160);
      R.far.material.dispose(); R.far.material = underMat(psx({ map: textureFrom(c) })); R.small = c;
    }
    yield;
    // Landmarks, merged by material.
    const ctx = { parts: [], decals: [], stoneParts: [], extra: [], r };
    for (let k = 0; k < R.lms.length; k++) { meshLandmark(R.lms[k], w, ctx); if (k % 8 === 7) yield; }
    yield;
    // Plain rocks on any blocked tile no landmark stands on.
    for (let y = Math.max(1, b.y0); y <= Math.min(w.H - 3, b.y1); y++) for (let x = Math.max(2, b.x0); x <= Math.min(W - 3, b.x1); x++) {
      if (!w.blocked[y * W + x] || this.own[y * W + x]) continue;
      const rad = 7 + r() * 4, d = smoothRock(r(), 1).scale(rad, rad, rad);
      d.scale(1, 0.55 + r() * 0.35, 1); d.rotateY(r() * 3);
      ctx.stoneParts.push(d.translate((x + 0.5) * T + (r() - 0.5) * 3, rad * 0.25, (y + 0.5) * T + (r() - 0.5) * 3));
    }
    if (ctx.stoneParts.length) {
      // Welded (indexed), so the rocks shade smoothly instead of in facets.
      const geo = mergeGeometries(ctx.stoneParts.map((p) => { if (p.attributes.normal) p.deleteAttribute('normal'); if (p.attributes.uv) p.deleteAttribute('uv'); return p.index ? p : mergeVertices(p); }));
      // Planar UVs from world position, so every rock shares one stone texture.
      const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) + pos.getY(i) * 0.5) / 64; uv[i * 2 + 1] = (pos.getZ(i) + pos.getY(i) * 0.5) / 64; }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, this.mats.rock));
      yield;
    }
    if (ctx.parts.length) {
      const geo = mergeGeometries(ctx.parts.map((p) => { p = p.index ? p.toNonIndexed() : p; if (p.attributes.normal) p.deleteAttribute('normal'); return p; }));
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, this.mats.part));
      yield;
    }
    if (ctx.decals.length) {
      const m = new THREE.Mesh(mergeGeometries(ctx.decals.map((p) => (p.index ? p.toNonIndexed() : p))), this.mats.decal);
      m.geometry.computeVertexNormals();
      m.position.y = 0.2;
      g.add(m);
    }
    for (const e of ctx.extra) g.add(e);
    yield;
    // Grass: dense on the Lawn and in long grass, scattered on grassy ground,
    // none on beds, sawdust, mud, compost, sand, slabs, boards or leaves.
    const gn = noise2(5), quads = [];
    const clump = (x, y, h, wd) => { for (let k = 0; k < 2; k++) { const q = new THREE.PlaneGeometry(wd, h).translate(0, h / 2, 0).rotateY(k * Math.PI / 2 + r()); q.translate(x * T, 0, y * T); quads.push(q); } };
    const at2 = F.tile, G = F.g, bl = w.blanket;
    for (let i = 0; i < 1900; i++) {
      if (i % 400 === 399) yield;
      const x = b.x0 + r() * AREA, y = b.y0 + r() * AREA, ti = Math.floor(y) * W + Math.floor(x);
      if (x < 2 || y < 1 || x > W - 2 || y > w.H - 2 || w.blocked[ti] || w.pit[ti]) continue;
      if (Math.hypot(x - w.ex, y - w.ey) < 3 * S || Math.hypot(x - w.rx, y - w.ry) < 3 * S) continue;
      if (x >= bl.x0 && x < bl.x0 + bl.w && y >= bl.y0 && y < bl.y0 + bl.h) continue;
      const bare = Math.max(at2(F.mulch, x, y), at2(F.bark, x, y), at2(F.mud, x, y), at2(F.compost, x, y), at2(F.sand, x, y), at2(F.slab, x, y), at2(F.dirt, x, y), at2(F.soil, x, y), at2(F.mat, x, y),
        at2(G.gravel, x, y), at2(G.deck, x, y), at2(G.hedge, x, y), at2(G.leaf, x, y), at2(G.mound, x, y), at2(G.wet, x, y) * 0.5);
      if (bare > 0.5) continue;
      if (r() < 0.75 * at2(F.stripe, x, y)) { clump(x, y, (14 + r() * 16) * 1.5, 12); continue; }
      const tall = Math.max(at2(F.long, x, y), at2(G.tall, x, y), at2(G.wild, x, y) * 0.8);
      if (r() < 0.6 * tall) { clump(x, y, (20 + r() * 26) * 1.5, 13); continue; }
      if (r() < 0.3 * at2(G.oak, x, y)) { clump(x, y, (8 + r() * 8) * 1.5, 10); continue; }
      if (gn(x * 0.18 / S, y * 0.18 / S) > 0.05 && r() < 0.25) clump(x, y, (6 + r() * 7) * 1.5, 10);
    }
    if (quads.length) g.add(new THREE.Mesh(mergeGeometries(quads), this.mats.grass));
    this.group.add(g);
    R.near = g;
  }

  dispose() {
    for (const R of this.regions) this._unload(R);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}

// The Lawn's mower: a red deck with wheels, a blade's worth wide.
export function mowerMesh() {
  const parts = [];
  const wd = AREA * T, depth = 3 * S * T;
  parts.push(paint(new THREE.BoxGeometry(wd, 34 * S, depth).translate(0, 30 * S, 0), '#c8302a'));
  parts.push(paint(new THREE.BoxGeometry(wd * 0.98, 10 * S, depth * 1.1).translate(0, 12 * S, 0), '#3a3a3a'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(new THREE.CylinderGeometry(18 * S, 18 * S, 10 * S, 12).rotateX(Math.PI / 2).translate(sx * wd * 0.46, 18 * S, sz * depth * 0.6), '#1a1a1a'));
  const m = mergeGeometries(parts);
  m.computeVertexNormals();
  return new THREE.Mesh(m, psx({ vertexColors: true }));
}
