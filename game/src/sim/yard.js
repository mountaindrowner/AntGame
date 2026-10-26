// The yard: one map made of a 3×3 block of areas, ours in the middle. This
// file is data and layout only (no DOM, no rendering). The sim reads the
// blocked grid, the area of each tile, landmarks, pits and the nest sites;
// the renderer reads the same landmarks to draw them.
//
//   NW Patio      N Flowerbed        NE Woodpile        (the house is north)
//   W  Spigot     C Under the Rock   E  Compost heap
//   SW Sandbox    S Lawn             SE Picnic blanket

export const AREA = 40;          // tiles per area side
export const GRID = 3;           // areas per side

// Per area: what grows there, how fast, and what makes it dangerous.
// foods: [type, weight]; rate: items per minute; max: items at once;
// treat: chance a spawn is a treat instead; start: items at the start.
export const AREAS = [
  { key: 'patio', name: 'The Patio', blurb: 'Hot stone slabs. Pavement ants live in the cracks.', ground: 'slab',
    foods: [['crumb', 5], ['popcorn', 2], ['seed', 3]], rate: 4, max: 14, treat: 0.05, treats: ['cookie'], start: 10 },
  { key: 'flowerbed', name: 'The Flowerbed', blurb: 'Tall stems and strawberries. The spider’s web hangs here.', ground: 'mulch',
    foods: [['berry', 5], ['seed', 3], ['crumb', 1]], rate: 3, max: 10, treat: 0, start: 6 },
  { key: 'woodpile', name: 'The Woodpile', blurb: 'Stacked logs and dead bugs. Protein, if you can find a way through.', ground: 'bark',
    foods: [['bug', 5], ['seed', 3], ['crumb', 2]], rate: 2.5, max: 8, treat: 0, start: 5 },
  { key: 'spigot', name: 'The Spigot', blurb: 'Mud and puddles under a dripping tap. Water, all you want.', ground: 'mud',
    foods: [['seed', 3], ['crumb', 2]], rate: 1, max: 4, treat: 0, start: 2 },
  { key: 'rock', name: 'Under the Rock', blurb: 'Home. Food here is thin and it will not last.', ground: 'home',
    foods: [['crumb', 5], ['seed', 3], ['berry', 1], ['popcorn', 1]], rate: 1.2, max: 6, treat: 0, start: 14 },
  { key: 'compost', name: 'The Compost Heap', blurb: 'Rotting fruit and scraps. The richest ground in the yard, and the farthest.', ground: 'compost',
    foods: [['apple', 4], ['berry', 2], ['crumb', 2], ['seed', 2]], rate: 3.5, max: 12, treat: 0, start: 6 },
  { key: 'sandbox', name: 'The Sandbox', blurb: 'Kids drop sweets here. Antlions wait at the bottom of the pits.', ground: 'sand',
    foods: [['popcorn', 3], ['crumb', 3]], rate: 2, max: 8, treat: 0.2, treats: ['jellybean', 'gummy'], start: 4 },
  { key: 'lawn', name: 'The Lawn', blurb: 'Seeds in the grass. Listen for the mower.', ground: 'lawn',
    foods: [['seed', 6], ['crumb', 1], ['berry', 1]], rate: 3, max: 10, treat: 0, start: 6 },
  { key: 'picnic', name: 'The Picnic Blanket', blurb: 'Crumbs everywhere, and sometimes a whole cookie.', ground: 'picnic',
    foods: [['crumb', 6], ['popcorn', 3]], rate: 4, max: 12, treat: 0.12, treats: ['cookie', 'gummy', 'jellybean'], start: 8 },
];

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Build the yard. Returns the blocked grid, the area index of every tile,
// landmarks (for drawing), antlion pits, and where things live.
export function makeYard(seed) {
  const W = AREA * GRID, H = AREA * GRID;
  const rnd = mulberry32(seed * 7919 + 13);
  const blocked = new Uint8Array(W * H), area = new Uint8Array(W * H), pit = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) area[idx(x, y)] = Math.floor(y / AREA) * GRID + Math.floor(x / AREA);
  const landmarks = [];
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const stamp = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inMap(x, y)) blocked[idx(x, y)] = 1; };
  const disc = (cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (inMap(x, y) && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) blocked[idx(x, y)] = 1; };
  const mark = (kind, props) => { const l = Object.assign({ kind }, props); landmarks.push(l); return l; };

  // Nests: ours under the big rock in the middle, the rival in the patio cracks.
  const ex = 60, ey = 60, rx = 17, ry = 17;
  const clear = (x, y, r) => Math.hypot(x - ex, y - ey) < r || Math.hypot(x - rx, y - ry) < r;

  // The yard's edges: the house's brick wall to the north, a fence elsewhere.
  for (let x = 0; x < W; x++) { blocked[idx(x, 0)] = 1; blocked[idx(x, H - 1)] = 1; }
  for (let y = 0; y < H; y++) { blocked[idx(0, y)] = 1; blocked[idx(W - 1, y)] = 1; }
  mark('wall', { x0: 0, y0: 0, w: W, h: 1 });
  mark('fence', { side: 'w' }); mark('fence', { side: 'e' }); mark('fence', { side: 's' });

  // C: Under the Rock. A big flat stone just north of our entrance.
  stamp(54, 50, 13, 6); mark('bigrock', { x0: 54, y0: 50, w: 13, h: 6 });
  scatterRocks(41, 41, 38, 38, 7);

  // N: the Flowerbed. Stems, strawberry plants, and the spider's web.
  const web = { x: 60, y: 17 };
  for (let i = 0; i < 26; i++) {
    const x = 42 + Math.floor(rnd() * 36), y = 3 + Math.floor(rnd() * 34);
    if (Math.hypot(x - web.x, y - web.y) < 4 || blocked[idx(x, y)]) continue;
    stamp(x, y, 1, 1);
    mark('flower', { x, y, h: 70 + rnd() * 70, petal: ['#e86a8a', '#f2c84a', '#f4f0e8', '#b07ad8', '#ff8a3a'][Math.floor(rnd() * 5)], seed: rnd() });
  }
  for (let i = 0; i < 5; i++) {
    const x = 44 + Math.floor(rnd() * 30), y = 5 + Math.floor(rnd() * 30);
    if (Math.hypot(x - web.x, y - web.y) < 5) continue;
    stamp(x, y, 2, 2); mark('strawberry', { x0: x, y0: y, w: 2, h: 2 });
  }
  stamp(web.x - 3, web.y, 1, 1); stamp(web.x + 3, web.y, 1, 1);
  mark('flower', { x: web.x - 3, y: web.y, h: 120, petal: '#e86a8a', seed: 0.3 });
  mark('flower', { x: web.x + 3, y: web.y, h: 115, petal: '#f4f0e8', seed: 0.7 });
  mark('web', { x: web.x, y: web.y, r: 4 });

  // NE: the Woodpile. Logs stacked in rows with gaps to squeeze through.
  for (let row = 0; row < 6; row++) {
    let x = 82 + Math.floor(rnd() * 4);
    const y = 4 + row * 6;
    while (x < 116) {
      const len = 8 + Math.floor(rnd() * 12);
      const w = Math.min(len, 117 - x);
      if (w >= 5) { stamp(x, y, w, 3); mark('log', { x0: x, y0: y, w, h: 3 }); }
      x += w + 2 + Math.floor(rnd() * 3);
    }
  }

  // W: the Spigot. The tap's pipe at the wall, a coiled hose, mud.
  stamp(1, 44, 4, 4); mark('spigot', { x0: 1, y0: 44, w: 4, h: 4 });
  disc(15, 68, 4); mark('hose', { x: 15, y: 68, r: 4 });
  const puddles = [[10, 50, 34], [24, 58, 30], [8, 74, 26]];
  scatterRocks(2, 41, 36, 38, 3);

  // E: the Compost heap, a big mound of scraps.
  disc(100, 58, 6.5); mark('heap', { x: 100, y: 58, r: 6.5 });
  scatterRocks(81, 41, 37, 37, 3);

  // SW: the Sandbox. A wooden frame with two gaps, a bucket and a shovel.
  const sb = { x0: 4, y0: 84, x1: 35, y1: 115 };
  for (let x = sb.x0; x <= sb.x1; x++) { if (x < 17 || x > 22) stamp(x, sb.y0, 1, 1); stamp(x, sb.y1, 1, 1); }
  for (let y = sb.y0; y <= sb.y1; y++) { stamp(sb.x0, y, 1, 1); if (y < 96 || y > 101) stamp(sb.x1, y, 1, 1); }
  mark('frame', sb);
  stamp(10, 104, 3, 3); mark('bucket', { x0: 10, y0: 104, w: 3, h: 3 });
  stamp(26, 90, 2, 6); mark('shovel', { x0: 26, y0: 90, w: 2, h: 6 });
  const pits = [];
  for (let i = 0; i < 40 && pits.length < 5; i++) {
    const x = sb.x0 + 4 + rnd() * (sb.x1 - sb.x0 - 8), y = sb.y0 + 4 + rnd() * (sb.y1 - sb.y0 - 8);
    if (pits.some((p) => Math.hypot(p.x - x, p.y - y) < 7)) continue;
    let ok = true;
    for (let yy = Math.floor(y - 2); yy <= y + 2; yy++) for (let xx = Math.floor(x - 2); xx <= x + 2; xx++) if (blocked[idx(xx, yy)]) ok = false;
    if (!ok) continue;
    pits.push({ x, y, r: 1.8 });
    // 2 = the deadly bottom, 1 = the sliding rim.
    for (let yy = Math.floor(y - 2); yy <= y + 2; yy++) for (let xx = Math.floor(x - 2); xx <= x + 2; xx++) {
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y);
      if (d < 0.9) pit[idx(xx, yy)] = 2; else if (d < 1.9) pit[idx(xx, yy)] = 1;
    }
  }
  mark('pits', { pits });

  // S: the Lawn. A few stones in deep grass (the renderer grows the grass).
  scatterRocks(41, 81, 38, 37, 4);
  mark('lawn', { x0: 40, y0: 80, w: 40, h: 40 });

  // SE: the Picnic blanket, with a soda can and a plate on it.
  const bl = { x0: 84, y0: 84, w: 31, h: 28 };
  mark('blanket', bl);
  stamp(105, 90, 3, 3); mark('can', { x0: 105, y0: 90, w: 3, h: 3 });
  mark('plate', { x: 94, y: 100, r: 4.5 });

  // NW: the Patio. Slabs (drawn in the ground), a flower pot.
  disc(30, 30, 3.5); mark('pot', { x: 30, y: 30, r: 3.5 });
  scatterRocks(2, 2, 36, 36, 2);

  function scatterRocks(x0, y0, w, h, n) {
    for (let i = 0; i < n * 3 && n > 0; i++) {
      const cx = x0 + Math.floor(rnd() * w), cy = y0 + Math.floor(rnd() * h);
      if (clear(cx, cy, 6)) continue;
      const rw = 1 + Math.floor(rnd() * 2), rh = 1 + Math.floor(rnd() * 2);
      let ok = true;
      for (let y = cy - 1; y < cy + rh + 1; y++) for (let x = cx - 1; x < cx + rw + 1; x++) if (!inMap(x, y) || blocked[idx(x, y)]) ok = false;
      if (!ok) continue;
      stamp(cx, cy, rw, rh); n--;
    }
  }
  // Nest sites stay open.
  for (const [nx, ny] of [[ex, ey], [rx, ry]]) for (let y = ny - 2; y <= ny + 2; y++) for (let x = nx - 2; x <= nx + 2; x++) blocked[idx(x, y)] = 0;
  return { W, H, blocked, area, pit, landmarks, pits, puddles, ex, ey, rx, ry, web, sandbox: sb, blanket: bl, rnd };
}

// Which area a tile is in, and that area's bounds.
export function areaBounds(i) {
  const ax = (i % GRID) * AREA, ay = Math.floor(i / GRID) * AREA;
  return { x0: ax, y0: ay, x1: ax + AREA - 1, y1: ay + AREA - 1 };
}
