// The yard: one continuous map made of square regions. This file is data and
// layout only (no DOM, no rendering). The sim reads the blocked grid, the
// region of each tile, landmarks, pits and the nest sites; the renderer reads
// the same landmarks to draw them.
//
// The whole backyard is YARD_MAP below (a 10×8 grid of regions with the house
// along the top). The built part is a block of it (BLOCK): the first nine
// regions around home, and since build 10 the ring around them:
//
//   col:   2               3          4                5               6
//   row 1  Back Steps      Patio      Flowerbed        Woodpile        Grill
//   row 2  Tomato Rows     Spigot     Under the Rock   Compost Heap    Bird Feeder
//   row 3  Beans/Lettuce   Sandbox    Lawn             Picnic Blanket  Birdbath
//   row 4  Kiddie Pool     Swing Set  Clover Patch     Molehills       Dandelions
//
// Layouts are written in design units (40 per region) and stamped at SCALE
// tiles per unit, so the props tower over an ant the way a backyard should.

export const SCALE = 2;              // tiles per design unit (build 9: everything twice as big)
export const AREA = 40 * SCALE;      // tiles per region side
// The built block, in yard-map cells.
export const BLOCK = { c0: 2, r0: 1, cols: 5, rows: 4 };

// Per region: where it sits on the yard map, what grows there, how fast, and
// what makes it dangerous. foods: [type, weight]; rate: items per minute;
// max: items at once; treat: chance a spawn is a treat instead; start: items
// at the start. strike: feet or birds coming down now and then ([min, max]
// seconds apart while ants are about). challenge / resource / reward are the
// region's card on the yard map.
export const AREAS = [
  { key: 'steps', at: [2, 1], name: 'The Back Steps', short: 'Steps', ground: 'slab',
    blurb: 'Where people come and go. Crumbs fall here, and so do feet.',
    challenge: 'Feet on the steps', resource: 'Kitchen crumbs, popcorn, cookies', reward: 'The most crumbs in the yard',
    foods: [['crumb', 6], ['popcorn', 3], ['seed', 1]], rate: 6, max: 20, treat: 0.15, treats: ['cookie'], start: 10, strike: { kind: 'foot', every: [40, 75] } },
  { key: 'patio', at: [3, 1], name: 'The Patio', short: 'Patio', ground: 'slab',
    blurb: 'Hot stone slabs. Pavement ants live in the cracks.',
    challenge: 'The rival pavement ants', resource: 'Crumbs, popcorn, now and then a cookie', reward: 'Take their queen and the yard is yours',
    foods: [['crumb', 5], ['popcorn', 2], ['seed', 3]], rate: 6, max: 26, treat: 0.05, treats: ['cookie'], start: 18 },
  { key: 'flowerbed', at: [4, 1], name: 'The Flowerbed', short: 'Flowerbed', ground: 'mulch',
    blurb: 'Tall stems and strawberries. The spider’s web hangs here.',
    challenge: 'The spider, waiting at its web', resource: 'Berries and seeds', reward: 'Kill the spider: its fang unlocks Venom ants',
    foods: [['berry', 5], ['seed', 3], ['crumb', 1]], rate: 4.5, max: 20, treat: 0, start: 12 },
  { key: 'woodpile', at: [5, 1], name: 'The Woodpile', short: 'Woodpile', ground: 'bark',
    blurb: 'Stacked logs and dead bugs. Protein, if you can find a way through.',
    challenge: 'A maze of logs, far from home', resource: 'Dead bugs: protein for soldiers', reward: 'Feeds an army',
    foods: [['bug', 5], ['seed', 3], ['crumb', 2]], rate: 3.5, max: 16, treat: 0, start: 9 },
  { key: 'grill', at: [6, 1], name: 'The Grill', short: 'Grill', ground: 'slab',
    blurb: 'A cookout table and a kettle grill. Hot dog scraps, chips, and people.',
    challenge: 'Feet under the table', resource: 'Hot dog scraps (protein), crumbs, chips', reward: 'Protein without a hunt',
    foods: [['crumb', 4], ['hotdog', 3], ['popcorn', 2]], rate: 5, max: 18, treat: 0.15, treats: ['chip'], start: 9, strike: { kind: 'foot', every: [50, 90] } },
  { key: 'tomatoes', at: [2, 2], name: 'The Tomato Rows', short: 'Tomatoes', ground: 'soil',
    blurb: 'Soft dug soil and tomato plants. Aphids crowd the stems.',
    challenge: 'Robins hunting the rows', resource: 'Fallen tomato, and aphids to milk', reward: 'Honeydew that never runs out',
    foods: [['tomato', 4], ['seed', 2], ['crumb', 1]], rate: 3.5, max: 14, treat: 0, start: 8, strike: { kind: 'bird', every: [55, 95] } },
  { key: 'spigot', at: [3, 2], name: 'The Spigot', short: 'Spigot', ground: 'mud',
    blurb: 'Mud and puddles under a dripping tap. Water, all you want.',
    challenge: 'Little food', resource: 'Puddles that never dry', reward: 'Water for every egg',
    foods: [['seed', 3], ['crumb', 2]], rate: 1.5, max: 8, treat: 0, start: 4 },
  { key: 'rock', at: [4, 2], name: 'Under the Rock', short: 'Home', ground: 'home',
    blurb: 'Home. Food here is thin and it will not last.',
    challenge: 'Food runs thin', resource: 'Crumbs and seeds for a while, now and then a dead bug', reward: 'Home',
    foods: [['crumb', 5], ['seed', 3], ['berry', 1], ['popcorn', 1], ['bug', 1]], rate: 1.8, max: 12, treat: 0, start: 24 },
  { key: 'compost', at: [5, 2], name: 'The Compost Heap', short: 'Compost', ground: 'compost',
    blurb: 'Rotting fruit and scraps. The richest ground in the yard, and the farthest.',
    challenge: 'Caterpillars, and a long walk', resource: 'Apple cores, the richest food', reward: 'Feeds a big colony',
    foods: [['apple', 4], ['berry', 2], ['crumb', 2], ['seed', 2]], rate: 5, max: 22, treat: 0, start: 10 },
  { key: 'feeder', at: [6, 2], name: 'Under the Bird Feeder', short: 'Feeder', ground: 'grass',
    blurb: 'Seed rains down from the feeder. So do the birds.',
    challenge: 'Birds, all day', resource: 'Seed, more than anywhere', reward: 'Seed rain from above',
    foods: [['seed', 8], ['crumb', 1]], rate: 8, max: 28, treat: 0, start: 14, strike: { kind: 'bird', every: [30, 55] } },
  { key: 'beans', at: [2, 3], name: 'Beans and Lettuce', short: 'Beans', ground: 'soil',
    blurb: 'Bean poles and lettuce heads in soft soil. Aphids on the vines.',
    challenge: 'Robins hunting the rows', resource: 'Seeds, tomato, and aphids to milk', reward: 'Honeydew that never runs out',
    foods: [['seed', 4], ['tomato', 1], ['crumb', 1]], rate: 3.5, max: 14, treat: 0, start: 8, strike: { kind: 'bird', every: [55, 95] } },
  { key: 'sandbox', at: [3, 3], name: 'The Sandbox', short: 'Sandbox', ground: 'sand',
    blurb: 'Kids drop sweets here. Antlions wait at the bottom of the pits.',
    challenge: 'Antlion pits', resource: 'Popcorn, and treats that need a crew', reward: 'Jelly beans and gummy bears',
    foods: [['popcorn', 3], ['crumb', 3]], rate: 3, max: 16, treat: 0.2, treats: ['jellybean', 'gummy'], start: 7 },
  { key: 'lawn', at: [4, 3], name: 'The Lawn', short: 'Lawn', ground: 'lawn',
    blurb: 'Seeds in the grass. Listen for the mower.',
    challenge: 'The mower', resource: 'Seeds galore, a few dead bugs', reward: 'Lots of seeds, if you time it',
    foods: [['seed', 6], ['crumb', 1], ['berry', 1], ['bug', 1]], rate: 4.5, max: 20, treat: 0, start: 10 },
  { key: 'picnic', at: [5, 3], name: 'The Picnic Blanket', short: 'Picnic', ground: 'picnic',
    blurb: 'Crumbs everywhere, and sometimes a whole cookie.',
    challenge: 'A long way from home', resource: 'Crumbs, popcorn and treats', reward: 'Cookies and gummy bears',
    foods: [['crumb', 6], ['popcorn', 3]], rate: 6, max: 24, treat: 0.12, treats: ['cookie', 'gummy', 'jellybean'], start: 14 },
  { key: 'birdbath', at: [6, 3], name: 'The Birdbath', short: 'Birdbath', ground: 'grass',
    blurb: 'A stone bowl of water on a pedestal. Splashes fill the grass below.',
    challenge: 'Birds come to drink', resource: 'Splash puddles, a few seeds', reward: 'Clean water, if the birds let you',
    foods: [['seed', 3], ['crumb', 1]], rate: 2, max: 8, treat: 0, start: 4, strike: { kind: 'bird', every: [40, 70] } },
  { key: 'pool', at: [2, 4], name: 'The Kiddie Pool', short: 'Pool', ground: 'long',
    blurb: 'A plastic pool in the long grass. Splashes and dropped snacks.',
    challenge: 'Birds in the open grass', resource: 'Splash puddles, snacks', reward: 'Water and seeds',
    foods: [['seed', 3], ['crumb', 2], ['popcorn', 1]], rate: 3, max: 12, treat: 0, start: 6, strike: { kind: 'bird', every: [60, 100] } },
  { key: 'swings', at: [3, 4], name: 'The Swing Set', short: 'Swings', ground: 'long',
    blurb: 'Kids kick up the dirt under the swings, and drop their sweets.',
    challenge: 'Running feet', resource: 'Crumbs, popcorn, treats', reward: 'Jelly beans and gummy bears',
    foods: [['crumb', 3], ['popcorn', 2], ['seed', 2]], rate: 4, max: 14, treat: 0.1, treats: ['jellybean', 'gummy'], start: 6, strike: { kind: 'foot', every: [45, 80] } },
  { key: 'clover', at: [4, 4], name: 'The Clover Patch', short: 'Clover', ground: 'long',
    blurb: 'Clover and long grass on the great lawn.',
    challenge: 'Birds in the open grass', resource: 'Seeds and berries', reward: 'Steady food',
    foods: [['seed', 5], ['berry', 1]], rate: 4, max: 16, treat: 0, start: 8, strike: { kind: 'bird', every: [55, 95] } },
  { key: 'molehills', at: [5, 4], name: 'The Molehills', short: 'Molehills', ground: 'long',
    blurb: 'Heaps of fresh dirt where a mole tunnels. It turns up grubs and dead bugs.',
    challenge: 'Birds after the grubs', resource: 'Seeds and dead bugs (protein)', reward: 'Protein near the great lawn',
    foods: [['seed', 3], ['bug', 2]], rate: 3, max: 12, treat: 0, start: 6, strike: { kind: 'bird', every: [55, 95] } },
  { key: 'dandelions', at: [6, 4], name: 'The Dandelions', short: 'Dandelions', ground: 'long',
    blurb: 'Yellow flowers and seed clocks in the long grass.',
    challenge: 'Birds in the open grass', resource: 'Seeds', reward: 'Seeds on the wind',
    foods: [['seed', 6]], rate: 4, max: 16, treat: 0, start: 8, strike: { kind: 'bird', every: [55, 95] } },
];
export const REGION = Object.fromEntries(AREAS.map((A, i) => [A.key, i]));

// The whole backyard as the yard map shows it: a 10×8 grid of regions with
// the house along the top. Each zone is a rectangle [col, row, cols, rows];
// built regions (AREAS) are drawn over them.
export const YARD_MAP = {
  cols: 10, rows: 8,
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
  ],
};

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Build the yard. Returns the blocked grid, the region index of every tile,
// landmarks (for drawing), antlion pits, and where things live.
export function makeYard(seed) {
  const S = SCALE, W = AREA * BLOCK.cols, H = AREA * BLOCK.rows;
  const rnd = mulberry32(seed * 7919 + 13);
  const blocked = new Uint8Array(W * H), area = new Uint8Array(W * H), pit = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  for (let i = 0; i < AREAS.length; i++) {
    const b = areaBounds(i);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) area[idx(x, y)] = i;
  }
  const landmarks = [];
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  // Layouts are written relative to a region's corner: O is that corner, in tiles.
  const O = { x: 0, y: 0 };
  const at = (key) => { const b = areaBounds(REGION[key]); O.x = b.x0; O.y = b.y0; };
  const u = (v) => Math.round(v * S); // design units to tiles
  const stamp = (x0, y0, w, h) => { for (let y = O.y + y0; y < O.y + y0 + h; y++) for (let x = O.x + x0; x < O.x + x0 + w; x++) if (inMap(x, y)) blocked[idx(x, y)] = 1; };
  const disc = (cx, cy, r) => { cx += O.x; cy += O.y; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (inMap(x, y) && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) blocked[idx(x, y)] = 1; };
  const shift = (p) => { for (const k of ['x', 'x0', 'x1']) if (p[k] != null) p[k] += O.x; for (const k of ['y', 'y0', 'y1']) if (p[k] != null) p[k] += O.y; return p; };
  const mark = (kind, props) => { const l = shift(Object.assign({ kind }, props)); landmarks.push(l); return l; };
  const isBlocked = (x, y) => !inMap(O.x + x, O.y + y) || blocked[idx(O.x + x, O.y + y)];
  const puddles = [], aphids = [], slabs = [], soil = [], dirt = [];
  const puddle = (x, y, amt) => puddles.push([O.x + x, O.y + y, amt]);

  // Nests: ours under the big rock in the middle, the rival in the patio cracks.
  at('patio');
  const ex = O.x + u(60), ey = O.y + u(60), rx = O.x + u(17), ry = O.y + u(17);
  const clear = (x, y, r) => Math.hypot(O.x + x - ex, O.y + y - ey) < r || Math.hypot(O.x + x - rx, O.y + y - ry) < r;

  // The house's brick wall to the north. The rest of the yard goes on past
  // the other edges, but isn't built yet: a thicket of weeds closes it off.
  for (let x = 0; x < W; x++) blocked[idx(x, 0)] = 1;
  for (let k = 0; k < 2; k++) {
    for (let x = 0; x < W; x++) blocked[idx(x, H - 1 - k)] = 1;
    for (let y = 0; y < H; y++) { blocked[idx(k, y)] = 1; blocked[idx(W - 1 - k, y)] = 1; }
  }
  O.x = O.y = 0;
  mark('wall', { x0: 0, y0: 0, w: W, h: 1 });
  mark('thicket', { side: 'w' }); mark('thicket', { side: 'e' }); mark('thicket', { side: 's' });

  // ---------- the first nine (build 8), written across three regions from the Patio's corner ----------
  at('patio');
  // Under the Rock. A big flat stone just north of our entrance.
  const big = mark('bigrock', { x0: u(54), y0: u(50), w: u(13), h: u(6) });
  stamp(u(54), u(50), u(13), u(6));
  scatterRocks(u(41), u(41), u(38), u(38), 10);

  // The Flowerbed. Stems, strawberry plants, and the spider's web.
  const web = { x: O.x + u(60), y: O.y + u(17) };
  for (let i = 0; i < 70; i++) {
    const x = u(42) + Math.floor(rnd() * u(36)), y = u(3) + Math.floor(rnd() * u(34));
    if (Math.hypot(O.x + x - web.x, O.y + y - web.y) < u(4) || isBlocked(x, y)) continue;
    stamp(x, y, 1, 1);
    mark('flower', { x, y, h: (70 + rnd() * 70) * S, petal: ['#e86a8a', '#f2c84a', '#f4f0e8', '#b07ad8', '#ff8a3a'][Math.floor(rnd() * 5)], seed: rnd() });
  }
  for (let i = 0; i < 10; i++) {
    const x = u(44) + Math.floor(rnd() * u(30)), y = u(5) + Math.floor(rnd() * u(30));
    if (Math.hypot(O.x + x - web.x, O.y + y - web.y) < u(5)) continue;
    stamp(x, y, u(2), u(2)); mark('strawberry', { x0: x, y0: y, w: u(2), h: u(2) });
  }
  stamp(u(57), u(17), 1, 1); stamp(u(63), u(17), 1, 1);
  mark('flower', { x: u(57), y: u(17), h: 120 * S, petal: '#e86a8a', seed: 0.3 });
  mark('flower', { x: u(63), y: u(17), h: 115 * S, petal: '#f4f0e8', seed: 0.7 });
  mark('web', { x: u(60), y: u(17), r: u(4) });

  // The Woodpile. Logs stacked in rows with gaps to squeeze through.
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

  // The Spigot. The tap's pipe on a brick post, a coiled hose, mud.
  stamp(2, u(44), u(4), u(4)); mark('spigot', { x0: 2, y0: u(44), w: u(4), h: u(4) });
  disc(u(15), u(68), u(4)); mark('hose', { x: u(15), y: u(68), r: u(4) });
  for (const [x, y, a] of [[10, 50, 34], [24, 58, 30], [8, 74, 26], [30, 46, 22]]) puddle(u(x), u(y), a);
  scatterRocks(u(2), u(41), u(36), u(38), 4);

  // The Compost heap, a big mound of scraps.
  disc(u(100), u(58), u(6.5)); mark('heap', { x: u(100), y: u(58), r: u(6.5) });
  scatterRocks(u(81), u(41), u(37), u(37), 4);

  // The Sandbox. A wooden frame (two tiles thick) with two gaps, a bucket and a shovel.
  const sb = mark('frame', { x0: u(4), y0: u(84), x1: u(35) + 1, y1: u(115) + 1, t: S });
  {
    const lx0 = u(4), ly0 = u(84), lx1 = u(35) + 1, ly1 = u(115) + 1;
    for (let x = lx0; x <= lx1; x++) { if (x < u(17) || x > u(22)) stamp(x, ly0, 1, S); stamp(x, ly1 - S + 1, 1, S); }
    for (let y = ly0; y <= ly1; y++) { stamp(lx0, y, S, 1); if (y < u(96) || y > u(101)) stamp(lx1 - S + 1, y, S, 1); }
  }
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
  landmarks.push({ kind: 'pits', pits });

  // The Lawn. A few stones in deep grass (the renderer grows the grass).
  scatterRocks(u(41), u(81), u(38), u(37), 6);
  const lawn = mark('lawn', { x0: u(40), y0: u(80), w: u(40), h: u(40) });

  // The Picnic blanket, with a soda can and a plate on it.
  const bl = mark('blanket', { x0: u(84), y0: u(84), w: u(31), h: u(28) });
  stamp(u(105), u(90), u(3), u(3)); mark('can', { x0: u(105), y0: u(90), w: u(3), h: u(3) });
  mark('plate', { x: u(94), y: u(100), r: u(4.5) });

  // The Patio. Laid slabs around the rival's crack, a flower pot.
  slabs.push(shift({ x0: u(2), y0: u(1), w: u(33), h: u(32) }));
  disc(u(30), u(30), u(3.5)); mark('pot', { x: u(30), y: u(30), r: u(3.5) });
  scatterRocks(u(2), u(2), u(36), u(36), 3);

  // ---------- the ring (build 10): one region at a time, each from its own corner ----------
  // The Back Steps: wooden steps down from the back door onto a concrete
  // landing, a doormat, a pot on each side.
  at('steps');
  stamp(u(7), 1, u(26), u(9)); mark('steps', { x0: u(7), y0: 1, w: u(26), h: u(9) });
  mark('mat', { x0: u(11), y0: u(10) + 1, w: u(18), h: u(7) });
  slabs.push(shift({ x0: u(4), y0: 0, w: u(32), h: u(20) }));
  for (const px of [3.5, 36.5]) { disc(u(px), u(6), u(2.5)); mark('pot', { x: u(px), y: u(6), r: u(2.5) }); }
  scatterRocks(u(2), u(22), u(36), u(16), 3);

  // The Grill: a kettle grill on three legs, a table and two chairs on a
  // concrete pad, grease spots underneath.
  at('grill');
  slabs.push(shift({ x0: u(3), y0: 1, w: u(34), h: u(34) }));
  const gr = mark('grill', { x: u(13), y: u(12), r: u(4.5) });
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; disc(u(13) + Math.cos(a) * u(3.6), u(12) + Math.sin(a) * u(3.6), 1.2); }
  const table = mark('table', { x: u(26), y: u(22), w: u(14), h: u(9) });
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) disc(u(26) + sx * u(6), u(22) + sy * u(3.8), 1.3);
  for (const [cx, cy, back] of [[u(26), u(31), 1], [u(26), u(13), -1]]) {
    mark('chair', { x: cx, y: cy, w: u(6), h: u(5), back });
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) disc(cx + sx * u(2.5), cy + sy * u(2), 1);
  }
  mark('grease', { spots: [[gr.x - O.x, gr.y - O.y + u(3)], [table.x - O.x - u(3), table.y - O.y + u(1)], [table.x - O.x + u(4), table.y - O.y - u(2)]].map(([x, y]) => [O.x + x, O.y + y, u(1.5 + rnd() * 1.5)]) });

  // The vegetable garden: three beds of soft soil each, tomatoes in the
  // north region, beans and lettuce in the south. Aphids cluster on stems.
  at('tomatoes');
  for (let k = 0; k < 3; k++) {
    const by = 3 + k * 12.5;
    soil.push(shift({ x0: u(4), y0: u(by), w: u(32), h: u(8) }));
    for (let x = 7; x < 34; x += 6.5) {
      const tx = u(x + rnd() * 1.5), ty = u(by + 4 + (rnd() - 0.5) * 2);
      stamp(tx, ty, 1, 1); mark('tomato', { x: tx, y: ty, h: (110 + rnd() * 50) * S, seed: rnd() });
      if (rnd() < 0.45 && !isBlocked(tx + 2, ty)) aphids.push([O.x + tx + 2, O.y + ty]);
    }
  }
  at('beans');
  for (let k = 0; k < 3; k++) {
    const by = 3 + k * 12.5;
    soil.push(shift({ x0: u(4), y0: u(by), w: u(32), h: u(8) }));
    for (let x = 7; x < 34; x += k === 1 ? 6 : 5) {
      const tx = u(x + rnd()), ty = u(by + 4 + (rnd() - 0.5) * 2);
      if (k === 1) { if (!isBlocked(tx, ty)) { disc(tx, ty, u(1.8)); mark('lettuce', { x: tx, y: ty, r: u(1.8), seed: rnd() }); } continue; }
      stamp(tx, ty, 1, 1); mark('beanpole', { x: tx, y: ty, h: (200 + rnd() * 60) * S, seed: rnd() });
      if (rnd() < 0.4 && !isBlocked(tx - 2, ty)) aphids.push([O.x + tx - 2, O.y + ty]);
    }
  }

  // Under the Bird Feeder: a pole with the feeder up high, seed spilled below.
  at('feeder');
  disc(u(20), u(20), 1.6); mark('feeder', { x: u(20), y: u(20) });
  dirt.push([O.x + u(20), O.y + u(20), u(6)]);
  scatterRocks(u(2), u(2), u(36), u(36), 4);

  // The Birdbath: a stone bowl on a pedestal; splashes leave puddles.
  at('birdbath');
  disc(u(20), u(18), u(2.4)); mark('birdbath', { x: u(20), y: u(18), r: u(2.4), bowl: u(8) });
  for (const [x, y, a] of [[13, 25, 24], [28, 24, 22], [21, 30, 20]]) puddle(u(x), u(y), a);
  scatterRocks(u(2), u(2), u(36), u(36), 3);

  // The great lawn's top row: long grass, and one thing in each region.
  at('pool');
  disc(u(20), u(18), u(8.5)); mark('pool', { x: u(20), y: u(18), r: u(8.5) });
  for (const [x, y, a] of [[8, 30, 26], [32, 30, 22], [20, 31, 20]]) puddle(u(x), u(y), a);
  at('swings');
  const sw = mark('swingset', { x0: u(6), x1: u(34), y: u(18), spread: u(4) });
  for (const lx of [u(6), u(34)]) for (const s of [-1, 1]) disc(lx, u(18) + s * u(4), 1.5);
  for (const sx of [15, 25]) dirt.push([O.x + u(sx), sw.y, u(4)]);
  at('clover');
  for (let i = 0; i < 24; i++) { const x = u(3) + Math.floor(rnd() * u(34)), y = u(3) + Math.floor(rnd() * u(34)); if (isBlocked(x, y)) continue; stamp(x, y, 1, 1); mark('dandelion', { x, y, h: (40 + rnd() * 40) * S, puff: rnd() < 0.3, seed: rnd() }); }
  mark('clover', { x0: u(4), y0: u(4), w: u(32), h: u(32) });
  at('molehills');
  for (let i = 0; i < 12 && landmarks.filter((l) => l.kind === 'molehill').length < 6; i++) {
    const x = u(6) + Math.floor(rnd() * u(28)), y = u(6) + Math.floor(rnd() * u(28)), r = u(2 + rnd());
    if (landmarks.some((l) => l.kind === 'molehill' && Math.hypot(l.x - O.x - x, l.y - O.y - y) < r * 3)) continue;
    disc(x, y, r); mark('molehill', { x, y, r });
    dirt.push([O.x + x, O.y + y, r + u(2)]);
  }
  at('dandelions');
  for (let i = 0; i < 40; i++) { const x = u(3) + Math.floor(rnd() * u(34)), y = u(3) + Math.floor(rnd() * u(34)); if (isBlocked(x, y)) continue; stamp(x, y, 1, 1); mark('dandelion', { x, y, h: (45 + rnd() * 45) * S, puff: rnd() < 0.4, seed: rnd() }); }
  scatterRocks(u(2), u(2), u(36), u(36), 3);
  // The great lawn's long grass covers the whole row.
  O.x = O.y = 0;
  const long = { x0: 0, y0: areaBounds(REGION.pool).y0, w: W, h: AREA };

  // Loose stones: a rock is a landmark of its own, one to four tiles across.
  function scatterRocks(x0, y0, w, h, n) {
    for (let i = 0; i < n * 3 && n > 0; i++) {
      const cx = x0 + Math.floor(rnd() * w), cy = y0 + Math.floor(rnd() * h);
      if (clear(cx, cy, 12)) continue;
      const rw = 1 + Math.floor(rnd() * 2 * S), rh = 1 + Math.floor(rnd() * 2 * S);
      let ok = true;
      for (let y = cy - 2; y < cy + rh + 2; y++) for (let x = cx - 2; x < cx + rw + 2; x++) if (isBlocked(x, y)) ok = false;
      if (!ok) continue;
      stamp(cx, cy, rw, rh); mark('stone', { x0: cx, y0: cy, w: rw, h: rh, seed: rnd() }); n--;
    }
  }
  // Nest sites and aphid spots stay open.
  for (const [nx, ny] of [[ex, ey], [rx, ry]]) for (let y = ny - 2; y <= ny + 2; y++) for (let x = nx - 2; x <= nx + 2; x++) blocked[idx(x, y)] = 0;
  for (const [x, y] of aphids) blocked[idx(x, y)] = 0;
  return { W, H, S, blocked, area, pit, landmarks, pits, puddles, aphids, ex, ey, rx, ry, web, sandbox: sb, blanket: bl, lawn, long, slabs, soil, dirt, bigrock: big, rnd };
}

// A region's bounds, in tiles.
export function areaBounds(i) {
  const [c, r] = AREAS[i].at, ax = (c - BLOCK.c0) * AREA, ay = (r - BLOCK.r0) * AREA;
  return { x0: ax, y0: ay, x1: ax + AREA - 1, y1: ay + AREA - 1 };
}
