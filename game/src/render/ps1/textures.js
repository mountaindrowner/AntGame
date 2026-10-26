// Small procedural textures, nearest-filtered, the way a PS1 game held them
// in a few kilobytes of VRAM. Everything is generated at startup, so the
// game ships no image files yet.
import * as THREE from 'three';

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise in [-1, 1].
export function noise2(seed) {
  const r = rng(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512).map((_, i) => p[i & 255]);
  const val = new Float32Array(256).map(() => r() * 2 - 1);
  const f = (t) => t * t * (3 - 2 * t);
  const h = (x, y) => val[perm[(x & 255) + perm[y & 255]]];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = f(x - xi), v = f(y - yi);
    const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * u;
    const b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * u;
    return a + (b - a) * v;
  };
}

export function canvasTexture(w, h, draw, { repeat = null, wrap = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}

// Speckled texture from a ramp of colours, with optional pebbles and a band.
export function rampTexture(seed, colors, { size = 32, stones = 0, band = null, speckle = 0.35, stone = ['#8a8274', '#b4ac9c'], repeat = null } = {}) {
  return canvasTexture(size, size, (g) => {
    const r = rng(seed), n = noise2(seed);
    const k = 8 / size;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // Blend the four wrapped samples so the tile repeats without a seam.
      const u = x / size, v = y / size;
      const s = (xx, yy) => n(xx * k, yy * k);
      const val = s(x, y) * (1 - u) * (1 - v) + s(x - size, y) * u * (1 - v) + s(x, y - size) * (1 - u) * v + s(x - size, y - size) * u * v;
      const t = val * 0.5 + 0.5 + (r() - 0.5) * speckle;
      g.fillStyle = colors[Math.max(0, Math.min(colors.length - 1, Math.floor(t * colors.length)))];
      g.fillRect(x, y, 1, 1);
    }
    const sz = Math.max(1, Math.round(size / 16));
    for (let i = 0; i < stones; i++) {
      const x = Math.floor(r() * (size - 2 * sz)), y = Math.floor(r() * (size - 2 * sz));
      g.fillStyle = stone[0];
      g.fillRect(x, y, 2 * sz, 2 * sz);
      g.fillStyle = stone[1];
      g.fillRect(x, y, sz, sz);
    }
    if (band) {
      g.fillStyle = band;
      g.fillRect(0, Math.round(size * 0.32), size, Math.max(1, Math.round(size * 0.09)));
    }
  }, { repeat });
}

export const PALETTE = {
  soil: [
    ['#4e3220', '#6e4a2e', '#7e5634', '#94683e'], // soft topsoil
    ['#4a3426', '#5e4434', '#6e5440', '#7e644c'], // packed
    ['#5a2a1c', '#7a3e2a', '#8a4a30', '#9a5a3a'], // clay
  ],
  back: ['#3e2a1a', '#46301e', '#4e3624'], // nest wall: darker than the soil face so tunnels read; dark ants still show
  grass: ['#2e4a1a', '#3a5e22', '#4f7a2e', '#5e8a34'],
  dirt: ['#5e4026', '#6e4c2e', '#7e5a36', '#8a6a3c'],
  rock: ['#5a554c', '#6b655c', '#857e73', '#9a9488'],
  chitin: ['#100a07', '#170e09', '#1e130c'],
  queen: ['#6e3422', '#8a4630', '#9a5638'],
};
