// The yard: one map made of a 3×3 block of regions, ours in the middle. This
// file is data and layout only (no DOM, no rendering). The sim reads the
// blocked grid, the region of each tile, landmarks, pits and the nest sites;
// the renderer reads the same landmarks to draw them.
//
//   NW Patio      N Flowerbed        NE Woodpile        (the house is north)
//   W  Spigot     C Under the Rock   E  Compost heap
//   SW Sandbox    S Lawn             SE Picnic blanket
//
// The layout is written in design units (40 per region) and stamped at
// SCALE tiles per unit, so the props tower over an ant the way a backyard
// should. These nine regions sit in the middle of a much bigger yard
// (YARD_MAP below); the rest is planned but not built yet.

export const SCALE = 2;              // tiles per design unit (build 9: everything twice as big)
export const AREA = 40 * SCALE;      // tiles per region side
export const GRID = 3;               // built regions per side

// Per region: what grows there, how fast, and what makes it dangerous.
// foods: [type, weight]; rate: items per minute; max: items at once;
// treat: chance a spawn is a treat instead; start: items at the start.
// challenge / resource / reward are the region's card on the yard map.
export const AREAS = [
  { key: 'patio', name: 'The Patio', blurb: 'Hot stone slabs. Pavement ants live in the cracks.', ground: 'slab',
    challenge: 'The rival pavement ants', resource: 'Crumbs, popcorn, now and then a cookie', reward: 'Take their queen and the yard is yours',
    foods: [['crumb', 5], ['popcorn', 2], ['seed', 3]], rate: 6, max: 26, treat: 0.05, treats: ['cookie'], start: 18 },
  { key: 'flowerbed', name: 'The Flowerbed', blurb: 'Tall stems and strawberries. The spider’s web hangs here.', ground: 'mulch',
    challenge: 'The spider, waiting at its web', resource: 'Berries and seeds', reward: 'Kill the spider: its fang unlocks Venom ants',
    foods: [['berry', 5], ['seed', 3], ['crumb', 1]], rate: 4.5, max: 20, treat: 0, start: 12 },
  { key: 'woodpile', name: 'The Woodpile', blurb: 'Stacked logs and dead bugs. Protein, if you can find a way through.', ground: 'bark',
    challenge: 'A maze of logs, far from home', resource: 'Dead bugs: protein for soldiers', reward: 'Feeds an army',
    foods: [['bug', 5], ['seed', 3], ['crumb', 2]], rate: 3.5, max: 16, treat: 0, start: 9 },
  { key: 'spigot', name: 'The Spigot', blurb: 'Mud and puddles under a dripping tap. Water, all you want.', ground: 'mud',
    challenge: 'Little food', resource: 'Puddles that never dry', reward: 'Water for every egg',
    foods: [['seed', 3], ['crumb', 2]], rate: 1.5, max: 8, treat: 0, start: 4 },
  { key: 'rock', name: 'Under the Rock', blurb: 'Home. Food here is thin and it will not last.', ground: 'home',
    challenge: 'Food runs thin', resource: 'Crumbs and seeds, for a while', reward: 'Home',
    foods: [['crumb', 5], ['seed', 3], ['berry', 1], ['popcorn', 1]], rate: 1.8, max: 12, treat: 0, start: 24 },
  { key: 'compost', name: 'The Compost Heap', blurb: 'Rotting fruit and scraps. The richest ground in the yard, and the farthest.', ground: 'compost',
    challenge: 'Caterpillars, and a long walk', resource: 'Apple cores, the richest food', reward: 'Feeds a big colony',
    foods: [['apple', 4], ['berry', 2], ['crumb', 2], ['seed', 2]], rate: 5, max: 22, treat: 0, start: 10 },
  { key: 'sandbox', name: 'The Sandbox', blurb: 'Kids drop sweets here. Antlions wait at the bottom of the pits.', ground: 'sand',
    challenge: 'Antlion pits', resource: 'Popcorn, and treats that need a crew', reward: 'Jelly beans and gummy bears',
    foods: [['popcorn', 3], ['crumb', 3]], rate: 3, max: 16, treat: 0.2, treats: ['jellybean', 'gummy'], start: 7 },
  { key: 'lawn', name: 'The Lawn', blurb: 'Seeds in the grass. Listen for the mower.', ground: 'lawn',
    challenge: 'The mower', resource: 'Seeds galore', reward: 'Lots of seeds, if you time it',
    foods: [['seed', 6], ['crumb', 1], ['berry', 1]], rate: 4.5, max: 20, treat: 0, start: 10 },
  { key: 'picnic', name: 'The Picnic Blanket', blurb: 'Crumbs everywhere, and sometimes a whole cookie.', ground: 'picnic',
    challenge: 'A long way from home', resource: 'Crumbs, popcorn and treats', reward: 'Cookies and gummy bears',
    foods: [['crumb', 6], ['popcorn', 3]], rate: 6, max: 24, treat: 0.12, treats: ['cookie', 'gummy', 'jellybean'], start: 14 },
];

// The whole backyard as the yard map shows it: a 10×8 grid of regions with
// the house along the top. Each zone is a rectangle [col, row, cols, rows].
// built: an index into AREAS. Everything else is planned, not built yet.
export const YARD_MAP = {
  cols: 10, rows: 8, origin: [3, 1], // where the built 3×3 sits
  zones: [
    { name: 'The House', at: [1, 0, 8, 1], house: true },
    { name: 'Side gate', at: [0, 0, 1, 1] },
    { name: 'Trash cans', at: [0, 1, 1, 1], note: 'Odorous house ants' },
    { name: 'Back steps', at: [1, 1, 2, 1], note: 'The doormat, and feet' },
    { name: 'Side yard', at: [0, 2, 1, 3] },
    { name: 'Vegetable garden', at: [1, 2, 2, 2], note: 'Aphids, Argentine ants' },
    { name: 'Grill and table', at: [6, 1, 2, 1], note: 'Grease and dropped food' },
    { name: 'Rock garden', at: [8, 1, 1, 2] },
    { name: 'Bird feeder', at: [6, 2, 2, 1], note: 'Birds' },
    { name: 'Birdbath', at: [6, 3, 1, 1], note: 'Birds, deep water' },
    { name: 'Stepping stones', at: [7, 3, 2, 1] },
    { name: 'Hedge row', at: [9, 0, 1, 7] },
    { name: 'Great lawn', at: [1, 4, 6, 3], note: 'Swing set, kiddie pool, moles' },
    { name: 'Garden shed', at: [0, 5, 1, 1], note: 'Bug spray, a centipede' },
    { name: 'The Oak', at: [7, 4, 2, 3], note: 'Carpenter ants' },
    { name: 'Wild corner', at: [0, 6, 1, 2], note: 'Weeds, a toad' },
    { name: 'Low wet strip', at: [1, 7, 5, 1] },
    { name: 'Leaf pile', at: [6, 7, 2, 1] },
    { name: 'Fire ant mound', at: [8, 7, 2, 1], note: 'The last fight' },
    ...AREAS.map((A, i) => ({ name: A.name, at: [3 + (i % 3), 1 + Math.floor(i / 3), 1, 1], built: i })),
  ],
};

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Build the yard. Returns the blocked grid, the region index of every tile,
// landmarks (for drawing), antlion pits, and where things live.
export function makeYard(seed) {
  const S = SCALE, W = AREA * GRID, H = AREA * GRID;
  const rnd = mulberry32(seed * 7919 + 13);
  const blocked = new Uint8Array(W * H), area = new Uint8Array(W * H), pit = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) area[idx(x, y)] = Math.floor(y / AREA) * GRID + Math.floor(x / AREA);
  const landmarks = [];
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const stamp = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inMap(x, y)) blocked[idx(x, y)] = 1; };
  const disc = (cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (inMap(x, y) && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) blocked[idx(x, y)] = 1; };
  const mark = (kind, props) => { const l = Object.assign({ kind }, props); landmarks.push(l); return l; };
  const u = (v) => Math.round(v * S); // design units to tiles

  // Nests: ours under the big rock in the middle, the rival in the patio cracks.
  const ex = u(60), ey = u(60), rx = u(17), ry = u(17);
  const clear = (x, y, r) => Math.hypot(x - ex, y - ey) < r || Math.hypot(x - rx, y - ry) < r;

  // The house's brick wall to the north. The rest of the yard goes on past
  // the other edges, but isn't built yet: a thicket of weeds closes it off.
  for (let x = 0; x < W; x++) blocked[idx(x, 0)] = 1;
  for (let k = 0; k < 2; k++) {
    for (let x = 0; x < W; x++) blocked[idx(x, H - 1 - k)] = 1;
    for (let y = 0; y < H; y++) { blocked[idx(k, y)] = 1; blocked[idx(W - 1 - k, y)] = 1; }
  }
  mark('wall', { x0: 0, y0: 0, w: W, h: 1 });
  mark('thicket', { side: 'w' }); mark('thicket', { side: 'e' }); mark('thicket', { side: 's' });

  // C: Under the Rock. A big flat stone just north of our entrance.
  const big = { x0: u(54), y0: u(50), w: u(13), h: u(6) };
  stamp(big.x0, big.y0, big.w, big.h); mark('bigrock', big);
  scatterRocks(u(41), u(41), u(38), u(38), 10);

  // N: the Flowerbed. Stems, strawberry plants, and the spider's web.
  const web = { x: u(60), y: u(17) };
  for (let i = 0; i < 70; i++) {
    const x = u(42) + Math.floor(rnd() * u(36)), y = u(3) + Math.floor(rnd() * u(34));
    if (Math.hypot(x - web.x, y - web.y) < u(4) || blocked[idx(x, y)]) continue;
    stamp(x, y, 1, 1);
    mark('flower', { x, y, h: (70 + rnd() * 70) * S, petal: ['#e86a8a', '#f2c84a', '#f4f0e8', '#b07ad8', '#ff8a3a'][Math.floor(rnd() * 5)], seed: rnd() });
  }
  for (let i = 0; i < 10; i++) {
    const x = u(44) + Math.floor(rnd() * u(30)), y = u(5) + Math.floor(rnd() * u(30));
    if (Math.hypot(x - web.x, y - web.y) < u(5)) continue;
    stamp(x, y, u(2), u(2)); mark('strawberry', { x0: x, y0: y, w: u(2), h: u(2) });
  }
  stamp(web.x - u(3), web.y, 1, 1); stamp(web.x + u(3), web.y, 1, 1);
  mark('flower', { x: web.x - u(3), y: web.y, h: 120 * S, petal: '#e86a8a', seed: 0.3 });
  mark('flower', { x: web.x + u(3), y: web.y, h: 115 * S, petal: '#f4f0e8', seed: 0.7 });
  mark('web', { x: web.x, y: web.y, r: u(4) });

  // NE: the Woodpile. Logs stacked in rows with gaps to squeeze through.
  for (let row = 0; row < 6; row++) {
    let x = u(82) + Math.floor(rnd() * u(4));
    const y = u(4) + row * u(6);
    while (x < u(116)) {
      const len = u(8) + Math.floor(rnd() * u(12));
      const w = Math.min(len, u(117) - x);
      if (w >= u(5)) { stamp(x, y, w, u(3)); mark('log', { x0: x, y0: y, w, h: u(3) }); }
      x += w + u(2) + Math.floor(rnd() * u(3));
    }
  }

  // W: the Spigot. The tap's pipe on a brick post, a coiled hose, mud.
  stamp(2, u(44), u(4), u(4)); mark('spigot', { x0: 2, y0: u(44), w: u(4), h: u(4) });
  disc(u(15), u(68), u(4)); mark('hose', { x: u(15), y: u(68), r: u(4) });
  const puddles = [[u(10), u(50), 34], [u(24), u(58), 30], [u(8), u(74), 26], [u(30), u(46), 22]];
  scatterRocks(u(2), u(41), u(36), u(38), 4);

  // E: the Compost heap, a big mound of scraps.
  disc(u(100), u(58), u(6.5)); mark('heap', { x: u(100), y: u(58), r: u(6.5) });
  scatterRocks(u(81), u(41), u(37), u(37), 4);

  // SW: the Sandbox. A wooden frame (two tiles thick) with two gaps, a bucket and a shovel.
  const sb = { x0: u(4), y0: u(84), x1: u(35) + 1, y1: u(115) + 1, t: S };
  for (let x = sb.x0; x <= sb.x1; x++) { if (x < u(17) || x > u(22)) stamp(x, sb.y0, 1, S); stamp(x, sb.y1 - S + 1, 1, S); }
  for (let y = sb.y0; y <= sb.y1; y++) { stamp(sb.x0, y, S, 1); if (y < u(96) || y > u(101)) stamp(sb.x1 - S + 1, y, S, 1); }
  mark('frame', sb);
  stamp(u(10), u(104), u(3), u(3)); mark('bucket', { x0: u(10), y0: u(104), w: u(3), h: u(3) });
  stamp(u(26), u(90), u(2), u(6)); mark('shovel', { x0: u(26), y0: u(90), w: u(2), h: u(6) });
  const pits = [], pr = 1.8 * S;
  for (let i = 0; i < 80 && pits.length < 7; i++) {
    const x = sb.x0 + u(4) + rnd() * (sb.x1 - sb.x0 - u(8)), y = sb.y0 + u(4) + rnd() * (sb.y1 - sb.y0 - u(8));
    if (pits.some((p) => Math.hypot(p.x - x, p.y - y) < pr * 3.6)) continue;
    let ok = true;
    for (let yy = Math.floor(y - pr - 1); yy <= y + pr + 1; yy++) for (let xx = Math.floor(x - pr - 1); xx <= x + pr + 1; xx++) if (blocked[idx(xx, yy)]) ok = false;
    if (!ok) continue;
    pits.push({ x, y, r: pr });
    // 2 = the deadly bottom, 1 = the sliding rim.
    for (let yy = Math.floor(y - pr - 1); yy <= y + pr + 1; yy++) for (let xx = Math.floor(x - pr - 1); xx <= x + pr + 1; xx++) {
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y);
      if (d < pr * 0.5) pit[idx(xx, yy)] = 2; else if (d < pr * 1.05) pit[idx(xx, yy)] = 1;
    }
  }
  mark('pits', { pits });

  // S: the Lawn. A few stones in deep grass (the renderer grows the grass).
  scatterRocks(u(41), u(81), u(38), u(37), 6);
  const lawn = { x0: u(40), y0: u(80), w: u(40), h: u(40) };
  mark('lawn', lawn);

  // SE: the Picnic blanket, with a soda can and a plate on it.
  const bl = { x0: u(84), y0: u(84), w: u(31), h: u(28) };
  mark('blanket', bl);
  stamp(u(105), u(90), u(3), u(3)); mark('can', { x0: u(105), y0: u(90), w: u(3), h: u(3) });
  mark('plate', { x: u(94), y: u(100), r: u(4.5) });

  // NW: the Patio. Laid slabs around the rival's crack, a flower pot.
  const slabs = { x0: u(2), y0: u(1), w: u(33), h: u(32) };
  mark('slabs', slabs);
  disc(u(30), u(30), u(3.5)); mark('pot', { x: u(30), y: u(30), r: u(3.5) });
  scatterRocks(u(2), u(2), u(36), u(36), 3);

  // Loose stones: a rock is a landmark of its own, one to four tiles across.
  function scatterRocks(x0, y0, w, h, n) {
    for (let i = 0; i < n * 3 && n > 0; i++) {
      const cx = x0 + Math.floor(rnd() * w), cy = y0 + Math.floor(rnd() * h);
      if (clear(cx, cy, 12)) continue;
      const rw = 1 + Math.floor(rnd() * 2 * S), rh = 1 + Math.floor(rnd() * 2 * S);
      let ok = true;
      for (let y = cy - 2; y < cy + rh + 2; y++) for (let x = cx - 2; x < cx + rw + 2; x++) if (!inMap(x, y) || blocked[idx(x, y)]) ok = false;
      if (!ok) continue;
      stamp(cx, cy, rw, rh); mark('stone', { x0: cx, y0: cy, w: rw, h: rh, seed: rnd() }); n--;
    }
  }
  // Nest sites stay open.
  for (const [nx, ny] of [[ex, ey], [rx, ry]]) for (let y = ny - 2; y <= ny + 2; y++) for (let x = nx - 2; x <= nx + 2; x++) blocked[idx(x, y)] = 0;
  return { W, H, S, blocked, area, pit, landmarks, pits, puddles, ex, ey, rx, ry, web, sandbox: sb, blanket: bl, lawn, slabs, bigrock: big, rnd };
}

// A region's bounds, in tiles.
export function areaBounds(i) {
  const ax = (i % GRID) * AREA, ay = Math.floor(i / GRID) * AREA;
  return { x0: ax, y0: ay, x1: ax + AREA - 1, y1: ay + AREA - 1 };
}
