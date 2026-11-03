// Underfoot simulation (build 6, from prototype/sim.js). No DOM, no renderer:
// the views read this state; nothing here knows how it is drawn.
import { makeYard, AREAS, AREA, BLOCK, SCALE, REGION, areaBounds } from './yard.js';
import { UPGRADES, EVO, EVO_BY, evoCost, laterIn, RANKS, rankOf, NAMES, FAMILY, PROMOS, QUEEN_LEVELS, QUEEN_TRAITS, OUTPOST, GUARDIANS, prizeOf, GOALS, goalBoard, SETS, TIERS, ZONES, ZONE_OF } from './growth.js';
const SIM = (() => {
const W = AREA*BLOCK.cols, H = AREA*BLOCK.rows, T = 16; // surface tiles: the built yard (yard.js)
// Everything on the surface is twice as big as it was (yard.js SCALE), so
// ants and creatures walk faster to keep trips from dragging.
const SURF = 1.15; // surface speed: everything outdoors (ants, you, the spider) moves at this pace (build 11.6: was 1.4; build 22.1 tried 1.0 and 1.08, and colonies starved)
// Nest cutaway cells. The soil comes in bands, top down: a deep layer of
// soft topsoil, then packed soil and clay, equally deep.
// Build 42: two more below, deep rock and bedrock, and the nest twice as wide. The colony starts in the
// middle (HOME_X0..HOME_X1, the old 24 columns); the ground either side and the deep band below open in
// sections you pay for (NEST_SECTIONS), each a break-in event with something hidden behind the wall.
const SOIL_ROWS = [20, 14, 14, 12, 4];
const SOIL_TOP = SOIL_ROWS.map((_, i) => SOIL_ROWS.slice(0, i).reduce((a, b) => a + b, 0));
const NW = 48, NH = SOIL_ROWS.reduce((a, b) => a + b), SHAFT = 24, NEST_SHIFT = 12; // NEST_SHIFT: how far a pre-42 save's nest moves right
const HOME_X0 = 12, HOME_X1 = 35, HOME_Y1 = SOIL_TOP[3] - 1; // the open middle: columns 12..35, rows down to the clay's bottom
const BEDROCK_Y = SOIL_TOP[4];
// Price: food and stone, more the further out and down. Curios are a requirement (found, not spent);
// the deep band costs genes too.
const NEST_SECTIONS = [
  { key: 'w1', name: 'the West Roots', x0: 1, x1: 11, y0: 1, y1: 10, cost: { food: 40, grit: 15 }, work: 180, find: 'mole' },
  { key: 'e1', name: 'the East Roots', x0: 36, x1: 46, y0: 1, y1: 10, cost: { food: 40, grit: 15 }, work: 180, find: 'seeds' },
  { key: 'w2', name: 'the West Loam', x0: 1, x1: 11, y0: 11, y1: 19, cost: { food: 70, grit: 25 }, work: 240, find: 'grub' },
  { key: 'e2', name: 'the East Loam', x0: 36, x1: 46, y0: 11, y1: 19, cost: { food: 70, grit: 25 }, work: 240, find: 'aphids' },
  { key: 'w3', name: 'the West Hardpan', x0: 1, x1: 11, y0: 20, y1: 33, cost: { food: 110, grit: 40 }, curios: 2, work: 320, find: 'curio' },
  { key: 'e3', name: 'the East Hardpan', x0: 36, x1: 46, y0: 20, y1: 33, cost: { food: 110, grit: 40 }, curios: 2, work: 320, find: 'mole' },
  { key: 'w4', name: 'the West Clay', x0: 1, x1: 11, y0: 34, y1: 47, cost: { food: 140, grit: 60, sugar: 15 }, curios: 4, work: 400, find: 'seep' },
  { key: 'e4', name: 'the East Clay', x0: 36, x1: 46, y0: 34, y1: 47, cost: { food: 140, grit: 60, sugar: 15 }, curios: 4, work: 400, find: 'grub2' },
  { key: 'd1', name: 'the Deep (west)', x0: 1, x1: 15, y0: 48, y1: 59, cost: { food: 200, grit: 80, genes: 3 }, curios: 6, work: 520, find: 'seep' },
  { key: 'd2', name: 'the Deep', x0: 16, x1: 31, y0: 48, y1: 59, cost: { food: 200, grit: 80, genes: 3 }, curios: 6, work: 520, find: 'aphids' },
  { key: 'd3', name: 'the Deep (east)', x0: 32, x1: 46, y0: 48, y1: 59, cost: { food: 200, grit: 80, genes: 3 }, curios: 6, work: 520, find: 'curio' },
];
const SECTION_BY = Object.fromEntries(NEST_SECTIONS.map(S => [S.key, S]));
// What is hidden behind each wall, and three prizes in the bedrock (found by digging their cell).
const NEST_FINDS = {
  mole:   { name: 'an old mole tunnel', fx: 'a run of tunnel, already dug' },
  seeds:  { name: 'a seed cache', fx: '+60 🌾' },
  grub:   { name: 'a beetle grub', fx: '+30 🥩 +10 🪲' },
  grub2:  { name: 'a fat beetle grub', fx: '+60 🥩 +20 🪲' },
  aphids: { name: 'a root aphid pocket', fx: '+1 🍯 a minute, for good' },
  seep:   { name: 'a water seep', fx: '+1 💧 every 20 s, for good' },
  curio:  { name: 'a buried trinket', fx: '+2 🧬' },
};
const BEDROCK_PRIZES = [
  { key: 'fossil', x: 8, y: 62, name: 'a fossil ant', fx: '+5 🧬, and every ant 10% tougher' },
  { key: 'spring', x: 24, y: 63, name: 'an underground spring', fx: '+3 💧 every 20 s, for good' },
  { key: 'ring', x: 40, y: 62, name: 'a lost gold ring', fx: '+4 🧬' },
];
const N8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const N4 = [[1,0],[-1,0],[0,1],[0,-1]];
const CASTES = {
  forager:{name:'Forager', cost:{food:2, water:1}, hatch:20, speed:60, eat:1, fight:1, hp:2, r:2.2},
  builder:{name:'Builder', cost:{food:3, water:1}, hatch:25, speed:50, eat:1, fight:1, hp:2, r:2.4},
  nurse:  {name:'Nurse', cost:{food:2, water:1}, hatch:20, speed:50, eat:1, fight:1, hp:2, r:2.2},
  soldier:{name:'Soldier', cost:{food:4, water:1, protein:2}, hatch:40, speed:55, eat:2, fight:3, hp:6, r:3.0},
  venom:  {name:'Venom ant', cost:{food:5, water:1, protein:3}, hatch:45, speed:58, eat:2, fight:8, hp:6, r:3.0},
  // Build 23: each trained in its own room (see CASTE_ROOM, docs/ROOMS.md).
  gardener: {name:'Gardener', cost:{food:3, water:1}, hatch:25, speed:56, eat:1, fight:1, hp:2, r:2.0},
  rancher:  {name:'Rancher', cost:{food:3, water:1, sugar:2}, hatch:25, speed:45, eat:1, fight:1, hp:2, r:2.3},
  medic:    {name:'Medic', cost:{food:3, water:2}, hatch:30, speed:56, eat:1, fight:1, hp:3, r:2.3},
  harvester:{name:'Harvester', cost:{food:4, water:1}, hatch:30, speed:52, eat:1, fight:2, hp:3, r:2.6},
  // Build 24: from the evolution tree (CASTE_EVO).
  major:    {name:'Major', cost:{food:6, water:1, protein:4}, hatch:50, speed:42, eat:2, fight:5, hp:14, r:3.6},
  supermajor:{name:'Supermajor', cost:{food:10, water:2, protein:8, chitin:4}, hatch:70, speed:32, eat:3, fight:10, hp:30, r:4.6},
  exploder: {name:'Exploder', cost:{food:4, water:1, protein:2}, hatch:35, speed:56, eat:1, fight:3, hp:3, r:2.6},
  replete:  {name:'Replete', cost:{food:4, water:1, sugar:4}, hatch:35, speed:30, eat:1, fight:1, hp:3, r:2.4},
  undertaker:{name:'Undertaker', cost:{food:3, water:1}, hatch:25, speed:50, eat:1, fight:1, hp:2, r:2.2},
};
// Rival colonies (build 25). The Pavement ants (team 1) are there from the
// start; the others sleep until you first reach their region, then grow,
// forage and fight. Only the Pavement and Argentine ants raid you. Hold a
// colony's door with eight fighters to kill its queen.
const RIVALS = [
  { key: 'pavement', name: 'Pavement ants', region: 'patio', start: [6, 1], max: 60, soldiers: 0.5, hp: 1, bite: 1, size: 1, qhp: 1000, raids: true, color: '#a8463a', soldier: '#7a1f15', blurb: 'A rival. Their nest is in the Patio cracks.' },
  { key: 'odorous', name: 'Odorous house ants', region: 'trash', arrive: (s) => afterPatio(s, 1), arrival: 'They’ve moved in under the trash cans: tiny, many, after your food.', start: [24, 0], max: 110, soldiers: 0.05, hp: 0.5, bite: 0.45, size: 0.8, qhp: 600, swarm: true, color: '#3e2c24', soldier: '#2e1e18', blurb: 'Tiny, swarming and spoiling for a fight: they pick on any ant they meet. They smell of rotten coconut when crushed.' },
  { key: 'argentine', name: 'Argentine ants', region: 'tomatoes', arrive: (s) => afterPatio(s, 2), arrival: 'An invading supercolony has taken the tomato rows. They raid.', start: [10, 3], max: 80, soldiers: 0.35, hp: 0.7, bite: 0.8, size: 0.85, qhp: 800, raids: true, raidFrom: 900, color: '#9a6a44', soldier: '#7a4c2e', blurb: 'An invading supercolony from the vegetable garden. They raid anything, you included.' },
  { key: 'carpenter', name: 'Carpenter ants', region: 'oak', arrive: (s) => afterPatio(s, 3), arrival: 'Huge black ants are chewing into the Oak. They guard their trunk.', start: [4, 3], max: 24, soldiers: 0.5, hp: 2.5, bite: 1.8, size: 1.5, qhp: 1500, color: '#161212', soldier: '#0c0a0a', blurb: 'Huge and black. They chew galleries in the Oak and guard their trunk.' },
  { key: 'fire', name: 'Fire ants', region: 'firemound', arrive: (s) => afterPatio(s, 4), arrival: 'The fire ant mound is boiling over. Their sting burns.', start: [8, 4], max: 50, soldiers: 0.4, hp: 1, bite: 1.8, size: 1, qhp: 1200, fierce: true, color: '#c4441e', soldier: '#a02c14', blurb: 'Red, fierce, and their sting burns. The whole mound boils out at intruders.' },
];
// Mark: "new ants every 30 min after the patio is dead": none come while the
// Pavement ants hold the Patio; then one colony every 30 minutes, the easiest first.
const afterPatio = (s, n) => s.patioDeadAt != null && s.t >= s.patioDeadAt + 1800*n;
const rspec = (a) => RIVALS[(a.team || 1) - 1] || RIVALS[0];
// Kinds the evolution tree unlocks (build 24); fighters among them also need a Barracks.
const CASTE_EVO = { major: 'majors', supermajor: 'polymorphism', exploder: 'exploders', replete: 'honeypot', undertaker: 'midden' };
// The room each new kind of ant needs before the queen can lay it.
const CASTE_ROOM = { venom: 'barracks', gardener: 'fungus', rancher: 'dairy', medic: 'infirmary', harvester: 'granary', major: 'barracks', supermajor: 'barracks', exploder: 'barracks', replete: 'honeypot', undertaker: 'midden' };
const ROOMS = {
  queen:   {name:'Queen\u2019s chamber', cost:{}, work:0, w:4, h:3, desc:'Eggs, one at a time'},
  hatchery:{name:'Hatchery', cost:{food:10}, work:20, w:4, h:3, desc:'+2 eggs at a time', more:'+2 more eggs at a time'},
  store:   {name:'Food store', cost:{food:10, grit:5}, work:20, w:5, h:3, desc:'Food cap 20 to 150', more:'+50% food cap'},
  cistern: {name:'Cistern', cost:{food:15, grit:5}, work:20, w:4, h:4, desc:'Water cap 10 to 60', more:'+30 water cap'},
  nursery: {name:'Nursery', cost:{food:20, water:10}, work:25, w:4, h:3, desc:'Nurses; eggs hatch 30% faster', more:'Eggs 15% faster, 3 more nurses can help'},
  barracks:{name:'Barracks', cost:{food:30, protein:5}, work:30, w:6, h:3, desc:'Unlocks Soldiers', more:'Fighters eat 25% less protein'},
  workshop:{name:'Workshop', cost:{food:25, grit:10}, work:25, w:5, h:4, desc:'Builders dig packed soil and build 2× faster', more:'Builders work another quarter faster'},
  // Build 19: from the ground beetle's shell.
  armory:  {name:'Armory', cost:{food:40, grit:20, chitin:20}, work:30, w:5, h:3, desc:'Every ant 50% tougher; foragers shrug off a foot or beak', more:'Nothing more: one is enough'},
  // Build 23: rooms from the evolution tree (evo), each training its own ant
  // (caste), each with levels II and III bought from the Build list (lv).
  fungus:   {name:'Fungus garden', cost:{food:30, water:15}, work:30, w:5, h:3, evo:'fungus', caste:'gardener', desc:'Gardeners cut leaves; the garden grows them into food', more:'Another garden: leaves grow food twice as fast',
    lv:[{cost:{food:60, sugar:15}, fx:'Each leaf grows half again more food'}, {cost:{food:120, sugar:30, wood:15}, fx:'Twice the food from each leaf, grown twice as fast'}]},
  dairy:    {name:'Aphid barn', cost:{food:30, sugar:10}, work:30, w:5, h:3, evo:'mealybugs', caste:'rancher', desc:'Ranchers keep root aphids: 🍯 without going out', more:'Room for 4 more ranchers',
    lv:[{cost:{food:60, sugar:25}, fx:'Half again more 🍯, and 2 more ranchers'}, {cost:{food:100, sugar:40, wood:15}, fx:'Twice the 🍯, and the aphids give a little food too'}]},
  infirmary:{name:'Infirmary', cost:{food:25, water:20}, work:25, w:4, h:3, evo:'infirmary', caste:'medic', desc:'Medics heal the wounded and cure Cordyceps', more:'Heals more at once',
    lv:[{cost:{food:50, water:30}, fx:'Heals twice as fast, your ant too'}, {cost:{food:90, protein:20, wood:15}, fx:'Medics carry the fallen home: 1 in 4 ants killed near the nest is saved'}]},
  granary:  {name:'Granary', cost:{food:20, grit:25}, work:25, w:5, h:3, evo:'granary', caste:'harvester', desc:'Harvesters carry seed in double loads; +100 food cap', more:'+100 food cap more',
    lv:[{cost:{food:80, grit:40}, fx:'+150 food cap more'}, {cost:{food:150, grit:60, wood:20}, fx:'Harvesters chew seed into ant bread: worth half again'}]},
  // Build 24.
  honeypot: {name:'Honeypot vault', cost:{food:40, sugar:20}, work:30, w:4, h:4, evo:'honeypot', caste:'replete', desc:'Repletes hang here, living jars: each holds 40 more food', more:'Room for 4 more repletes',
    lv:[{cost:{food:80, sugar:30}, fx:'Each replete holds 60, and 2 more fit'}, {cost:{food:150, sugar:50, wood:15}, fx:'In a famine the repletes feed the colony from their crops'}]},
  midden:   {name:'Midden', cost:{food:20, grit:15}, work:20, w:4, h:3, evo:'midden', caste:'undertaker', desc:'Undertakers carry the dead to the midden (each death near the nest gives back 2 food), and Cordyceps spreads less, more so with each undertaker', more:'Room for 3 more undertakers',
    lv:[{cost:{food:40, grit:25}, fx:'The waste composts: it feeds the fungus garden'}, {cost:{food:80, protein:10, wood:10}, fx:'Cordyceps hardly spreads at all, and cave-ins are a third rarer'}]},
};
// Build 17: more than one of a room. Each kind allows one per queen level;
// each copy costs half again more than the last, and every room eats food
// to run: half a unit a minute for the first of a kind, one for each extra.
const roomCount = (s, key) => s.nest.rooms.filter(r => r.key === key).length;
const roomCap = s => Math.min(5, s.queen.level + 1); // build 40: 5 at most (more than that can't fit the nest)
function roomUpkeep(s){ let u = 0; const seen = {}; for (const r of s.nest.rooms){ if (r.key === 'queen') continue; u += seen[r.key] ? 1 : 0.5; seen[r.key] = true; } return u; }
const ROOM_KEYS = ['hatchery','store','cistern','nursery','barracks','workshop','armory','fungus','dairy','infirmary','granary','honeypot','midden'];
// A room kind's level (1 to 3, build 23).
const roomLevel = (s, key) => (s.colony.roomLv || {})[key] || 1;
// Food on the ground: amt is how much it holds (an ant carries 5). Treats are
// rare drops from people: worth a crew and a trail.
const FOODS = {
  crumb:    {name:'bread crumb', amt:[5,10]},
  seed:     {name:'seed', amt:[20,20]},
  berry:    {name:'berry', amt:[10,14]},
  popcorn:  {name:'popcorn', amt:[12,16]},
  apple:    {name:'apple core', amt:[20,28]},
  tomato:   {name:'piece of tomato', amt:[16,22]},
  // Aphids on a stem: milked for honeydew, they refill like a puddle.
  aphids:   {name:'aphids', amt:[20,20]},
  // Protein you can find lying about.
  bug:      {name:'dead bug', amt:[15,15], protein:true},
  // Build 23: leaf pieces for the fungus garden (only Gardeners cut them) and 🪵 wood.
  leafbit:  {name:'leaf piece', amt:[12,12]},
  twig:     {name:'twig', amt:[8,8]},
  hotdog:   {name:'hot dog scrap', amt:[14,18], protein:true},
  // Treats are too big for one ant: the player lifts them with a crew.
  jellybean:{name:'jelly bean', amt:[40,40], treat:true, crew:6, sweet:true},
  cookie:   {name:'cookie', amt:[35,35], treat:true, crew:6, sweet:true},
  gummy:    {name:'gummy bear', amt:[50,50], treat:true, crew:8, sweet:true},
  chip:     {name:'potato chip', amt:[30,30], treat:true, crew:4},
  acorn:    {name:'acorn', amt:[30,30], treat:true, crew:4},
  slug:     {name:'slug', amt:[20,26], protein:true},
  // Build 18: a beetle's cast-off shell, all chitin.
  shell:    {name:'beetle shell', amt:[8,8], chitin:true},
};
// Build 18: 🪲 chitin per load of each kind of carcass hauled home, and
// 🍯 sugar from honeydew (aphids) and sweet treats.
const CHITIN_OF = { bug: 1, spider: 2, ladybug: 2, earwig: 2, cricket: 1, millipede: 2, alate: 1, boss: 1, slug: 0 };
const SHELL_GROUND = /bark|compost|gravel|hedge|leaf|mulch/;
const WOOD_GROUND = /bark|mulch|leaf|hedge|oak|wild/, LEAF_GROUND = /lawn|grass|long|hedge|leaf|soil|clover|wild|oak|mulch/;
const heavy = f => !!(FOODS[f.type] && FOODS[f.type].crew);
const SOIL = [ {name:'soft', work:6}, {name:'packed', work:12}, {name:'clay', work:20}, {name:'rock', work:30}, {name:'bedrock', work:300} ];
const soilTier = y => y < SOIL_TOP[1] ? 0 : y < SOIL_TOP[2] ? 1 : y < SOIL_TOP[3] ? 2 : y < SOIL_TOP[4] ? 3 : 4;
// Foragers range only so far from the nest on their own (tiles of path), or
// further along a scent trail you lay. Training them reaches further and
// walks them faster. Level 0 is where a colony starts.
const FORAGE = [ {range:40, speed:1}, {range:55, speed:1.1, cost:{food:15}}, {range:75, speed:1.2, cost:{food:40, grit:10}}, {range:100, speed:1.3, cost:{food:80, protein:10, grit:25}}, {range:130, speed:1.3} ];
// Dug dirt has to go somewhere: each dug cell is a load a builder carries up
// and out to the spoil heap. With SPOIL_MAX loads waiting, digging stops.
const SPOIL_MAX = 3;
// Queen levels I→IV are built; V→VIII need materials from later builds (growth.js).
const QUEEN_UP = [ {food:40, protein:10}, {food:80, protein:20, grit:20}, {food:150, protein:40, grit:40}, ...QUEEN_LEVELS ];
const NEST_CAP = 100; // build 42: a nest holds 100 at most; more needs a daughter colony (to come)
const queenCap = (lvl, s) => Math.min(NEST_CAP, 20 + 20*lvl + (s && has(s, 'deephalls') ? 20 : 0));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const idx = (x,y) => y*W + x;
const nidx = (x,y) => y*NW + x;

// ---------- surface world ----------
function makeWorld(seed){
  const y = makeYard(seed);
  const home = bfs(y.blocked, y.ex, y.ey);
  for (let i=0;i<W*H;i++) if (home[i] >= 9999) y.blocked[i]=1;
  // Build 25: a nest site for each other rival, the open tile nearest its landmark (or its region's middle).
  const rnests = { 1: { x: y.rx, y: y.ry } };
  const LM = { trash: 'trashcan', tomatoes: 'tomato', oak: 'oak', firemound: 'firemound' };
  RIVALS.forEach((R, i) => { if (!i) return; const b = areaBounds(REGION[R.region]); let cx = (b.x0 + b.x1) >> 1, cy = (b.y0 + b.y1) >> 1;
    const lm = y.landmarks.find(l => l.kind === LM[R.region] && (l.x != null ? l.x >= b.x0 && l.x <= b.x1 && l.y >= b.y0 && l.y <= b.y1 : l.x0 >= b.x0 && l.x0 <= b.x1 && l.y0 >= b.y0 && l.y0 <= b.y1));
    const big = R.region === 'firemound' ? y.landmarks.find(l => l.kind === 'firemound' && l.big) : null;
    if (big){ cx = Math.round(big.x); cy = Math.round(big.y - big.r - 3); }
    else if (lm){ cx = Math.round(lm.x != null ? lm.x : lm.x0 + (lm.w || 1)/2); cy = Math.round((lm.y != null ? lm.y : lm.y0 + (lm.h || 1)/2) + (lm.r || 0) + 2); }
    let best = null; for (let r = 0; r < 30 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++){ const x = cx + dx, yy = cy + dy; if (x < 3 || yy < 3 || x >= W - 3 || yy >= H - 3) continue; if (y.blocked[idx(x, yy)] || y.pit[idx(x, yy)] || home[idx(x, yy)] >= 9999) continue; best = { x, y: yy }; break; }
    rnests[i + 1] = best || { x: cx, y: cy }; });
  return Object.assign(y, { home, rhome: bfs(y.blocked, y.rx, y.ry), rnests });
}
function bfs(blocked, sx, sy){
  const d = new Float32Array(W*H).fill(9999); const q = [[sx,sy]]; d[idx(sx,sy)] = 0; let qi = 0;
  while (qi < q.length){ const [x,y] = q[qi++]; const dd = d[idx(x,y)];
    for (const [dx,dy] of N4){ const nx=x+dx, ny=y+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue; if (blocked[idx(nx,ny)]) continue;
      if (d[idx(nx,ny)] > dd+1){ d[idx(nx,ny)] = dd+1; q.push([nx,ny]); } } }
  return d;
}

// ---------- nest cutaway ----------
function makeNest(){
  const cells = new Uint8Array(NW*NH); // 0 dirt, 1 dug, 2 room floor
  cells[nidx(SHAFT,0)] = 1;
  return { cells, ver: 1, rooms: [], digOrders: [], fillOrders: [], fields: {}, spoil: 0, open: {}, breach: null }; // rooms: [{x0,y0,w,h,key}]; spoil: loads of dug dirt waiting to go out
}
function nestField(s, tx, ty){
  const n = s.nest; const key = tx+','+ty; const f = n.fields[key];
  if (f && f.ver === n.ver) return f.d;
  const d = new Float32Array(NW*NH).fill(9999); const q = [[tx,ty]]; d[nidx(tx,ty)] = 0; let qi = 0;
  while (qi < q.length){ const [x,y] = q[qi++]; const dd = d[nidx(x,y)];
    for (const [dx,dy] of N4){ const nx=x+dx, ny=y+dy; if (nx<0||ny<0||nx>=NW||ny>=NH) continue; if (!n.cells[nidx(nx,ny)]) continue;
      if (d[nidx(nx,ny)] > dd+1){ d[nidx(nx,ny)] = dd+1; q.push([nx,ny]); } } }
  n.fields[key] = { ver: n.ver, d }; return d;
}
function dig(s, x, y, v){ const n = s.nest; if (x<0||y<0||x>=NW||y>=NH) return; if (n.cells[nidx(x,y)] < (v||1)){ n.cells[nidx(x,y)] = v||1; n.ver++; } }
function rectCells(r){ const out = []; for (let y=r.y0; y<r.y0+r.h; y++) for (let x=r.x0; x<r.x0+r.w; x++) out.push([x,y]); return out; }
function carveRoom(s, r, key){ const R = ROOMS[key]; const room = { x0: r.x0, y0: r.y0, w: R.w, h: R.h, key }; for (const [x,y] of rectCells(room)) dig(s, x, y, 2); s.nest.rooms.push(room); return room; }
function roomOf(s, key){ return s.nest.rooms.find(r => r.key === key) || null; }
function roomSlotIndex(s, key){ return roomOf(s, key) ? 1 : -1; }
function roomAt(s, x, y){ return s.nest.rooms.find(r => x >= r.x0 && x < r.x0+r.w && y >= r.y0 && y < r.y0+r.h) || null; }
function findRoomRect(s, cx, cy, w, h){
  const n = s.nest; w = w || 4; h = h || 3;
  for (let y0 = cy; y0 > cy-h; y0--) for (let x0 = cx; x0 > cx-w; x0--){
    if (x0 < 1 || y0 < 1 || x0+w > NW-1 || y0+h > NH) continue;
    let ok = true; for (let y=y0; y<y0+h && ok; y++) for (let x=x0; x<x0+w; x++){ if (n.cells[nidx(x,y)] !== 1){ ok = false; break; } }
    if (ok && !s.colony.buildQueue.some(j => x0 < j.x0+j.w && j.x0 < x0+w && y0 < j.y0+j.h && j.y0 < y0+h)) return { x0, y0, w, h };
  }
  return null;
}
function freePocket(s, cx, cy){ // largest free w×h around a cell, for the hint
  let best = [0,0]; for (let w=8; w>=1; w--) for (let h=5; h>=1; h--){ if (w*h <= best[0]*best[1]) continue; if (findRoomRect(s, cx, cy, w, h)) best = [w,h]; }
  return best;
}
function toggleFillOrder(s, x, y){
  const n = s.nest; if (x<1||y<1||x>=NW-1||y>=NH) return 'edge';
  const i = n.fillOrders.findIndex(o => o.x===x && o.y===y); if (i >= 0){ n.fillOrders.splice(i,1); return 'removed'; }
  if (n.cells[nidx(x,y)] !== 1) return n.cells[nidx(x,y)] === 2 ? 'room' : 'dirt';
  if (x === SHAFT && y <= 1) return 'entrance'; if (n.fillOrders.length >= 16) return 'too many';
  if (n.cells[nidx(x,y)] === 2 || s.colony.buildQueue.some(j => x >= j.x0 && x < j.x0 + j.w && y >= j.y0 && y < j.y0 + j.h)) return 'room'; // build 40
  n.fillOrders.push({ x, y, progress: 0, need: SOIL[soilTier(y)].work }); return 'added';
}
function removeRoom(s, x, y){
  const r = roomAt(s, x, y); if (!r || r.key === 'queen') return false; const c = s.colony;
  s.nest.rooms.splice(s.nest.rooms.indexOf(r), 1); for (const [cx,cy] of rectCells(r)) s.nest.cells[nidx(cx,cy)] = 1; s.nest.ver++;
  const cost = roomCost(s, r.key, roomCount(s, r.key)); for (const k in cost){ const half = Math.floor(cost[k]/2); if (k === 'food') c.store = Math.min(c.cap, c.store + half); else c[k] += half; }
  if (!roomCount(s, r.key) && c.roomLv && c.roomLv[r.key]){ // build 40: the last one gone, its levels go with it (half their cost back)
    const R = ROOMS[r.key]; for (let n = 1; n < c.roomLv[r.key]; n++) for (const k in R.lv[n - 1].cost){ const half = Math.floor(R.lv[n - 1].cost[k]/2); if (k === 'food') c.store += half; else c[k] = (c[k] || 0) + half; }
    delete c.roomLv[r.key]; }
  roomsChanged(s);
  return true;
}
function dugCount(s){ let n = 0; for (let i=0;i<NW*NH;i++) if (s.nest.cells[i] === 1) n++; return n; }
function isDugNeighbor(s, x, y){ for (const [dx,dy] of N4){ const nx=x+dx, ny=y+dy; if (nx<0||ny<0||nx>=NW||ny>=NH) continue; if (s.nest.cells[nidx(nx,ny)]) return [nx,ny]; } return null; }
// Build 42: which section a cell is in (null: the open middle or the bedrock), and whether it's still shut.
function sectionAt(x, y){ for (const S of NEST_SECTIONS) if (x >= S.x0 && x <= S.x1 && y >= S.y0 && y <= S.y1) return S; return null; }
function cellLocked(s, x, y){ const S = sectionAt(x, y); if (S) return !(s.nest.open && s.nest.open[S.key]); return !(x >= HOME_X0 && x <= HOME_X1 && y <= HOME_Y1) && y < BEDROCK_Y; }
function digAllowed(s, y, x){ if (x != null && cellLocked(s, x, y)){ const S = sectionAt(x, y); return S ? 'shut: break into ' + S.name.replace(/^the /, 'the ') + ' first' : 'shut'; } const t = soilTier(y); if (t === 0) return ''; if (!roomOf(s, 'workshop')) return 'needs Workshop'; if (t === 2 && s.queen.level < 1) return 'needs queen upgrade'; if (t >= 3 && s.queen.level < 2) return 'needs the queen at level 3'; return ''; }

// ---------- build 42: where genes come from, and alerts at every limit ----------
// The yard's genes are mostly one-time finds: each source, how many found of how many.
function genesFound(s){
  const c = s.colony, n = o => Object.keys(o || {}).length, nb = Object.keys(BOSSES).length, ncu = (s.curios || []).length;
  const rows = [
    { name: 'Scouting regions', got: n(c.scouted), of: AREAS.length - 1, each: 1 },
    { name: 'Holding regions', got: n(c.held), of: AREAS.length, each: 1 },
    { name: 'Curios', got: n(c.curios), of: ncu, each: 1.6 },
    { name: 'Goals', got: GOALS.filter(g => c.goals.done[g.key]).length, of: GOALS.length, each: GOALS.reduce((a, g) => a + TIERS[g.tier].genes, 0)/GOALS.length },
    { name: 'Guardians and bosses', got: Object.keys(BOSSES).filter(k => (c.kills || {})[k]).length, of: nb, each: 6 },
    { name: 'Buried in the nest', got: (c.buried || 0) + n(c.prizes) - ((c.prizes || {}).ring ? 1 : 0), of: NEST_SECTIONS.filter(S => S.find === 'curio').length + BEDROCK_PRIZES.length, each: 3.5 },
  ];
  const pool = Math.round(rows.reduce((a, r) => a + r.of*r.each, 0) + 60); // + rival queens, first foods and kills
  return { rows, total: c.genesTotal, pool: Math.round(pool/10)*10 };
}
// One card a limit, when you first hit it; again only after it has eased for three minutes.
function advise(s, dt){
  const c = s.colony; c.advT = (c.advT || 0) + dt; if (c.advT < 2) return; const step = c.advT; c.advT = 0;
  const A = c.advice || (c.advice = {}), out = s.advice || (s.advice = []);
  const say = (key, on, title, text) => { const a = A[key] || (A[key] = { off: 999, shown: false });
    if (!on){ a.off += step; if (a.off > 180) a.shown = false; return; }
    a.off = 0; if (a.shown) return; a.shown = true; out.push({ key, title, text }); };
  const ants = antCount(s), cap = queenCap(s.queen.level, s), up = QUEEN_UP[s.queen.level];
  say('ants', s.queen.placed && ants >= cap, cap >= NEST_CAP ? 'The nest is full' : 'The queen is at her limit',
    cap >= NEST_CAP ? `A nest holds ${NEST_CAP} ants. Daughter colonies, to come, will hold more.` : `She holds ${cap} ants. Upgrade her (Nest, tap the queen) for 20 more${up ? ': ' + costText(up) : ''}.`);
  say('food', s.queen.placed && c.store >= c.cap - 0.5 && c.cap < 1000, 'The food store is full',
    roomCount(s, 'store') ? 'Food coming in now goes to waste. Build another Food store, or a Granary; one in dry packed soil or clay holds 25% more.' : 'Food coming in now goes to waste. Dig a 5×3 pocket and build a Food store: it holds 150.');
  say('water', s.queen.placed && c.water >= c.waterCap - 0.5 && c.waterCap <= 70, 'The water store is full', roomCount(s, 'cistern') ? 'Build another Cistern; one in cool clay or deep rock holds half again more.' : 'Dig a 4×4 pocket and build a Cistern: it holds 60.');
  const n = s.nest; let edge = null, bottom = false;
  for (let y = 1; y <= HOME_Y1 && !edge; y++) for (const x of [HOME_X0, HOME_X1]) if (n.cells[nidx(x, y)]){ const S = sectionAt(x === HOME_X0 ? x - 1 : x + 1, y); if (S && !(n.open || {})[S.key]){ edge = S; break; } }
  for (let x = HOME_X0; x <= HOME_X1 && !bottom; x++) if (n.cells[nidx(x, HOME_Y1)] || n.cells[nidx(x, HOME_Y1 - 1)]) bottom = !NEST_SECTIONS.some(S => S.y0 > HOME_Y1 && (n.open || {})[S.key]);
  say('edge', !!edge && !n.breach, 'You have reached the edge of your ground', edge ? `Past it is ${edge.name}. Break into it: Build, then New ground (${costText(edge.cost)}). Something is always hidden behind the wall.` : '');
  say('bottom', bottom && !n.breach, 'You have reached the bottom of the clay', 'Below is deep rock, cool and wet, and under it the bedrock. Break into the Deep: Build, then New ground.');
  say('royal', zonesTaken(s) >= FLIGHT_AT[0] && !has(s, 'royal'), 'Winged queens are waiting', `With ${FLIGHT_AT[0]} guardians beaten your queen could raise winged queens to found daughter colonies, but she needs the Royal chamber: Evolve, Nest branch.`);
  say('genes', c.genes >= 15, `🧬 ${c.genes} genes waiting`, 'Spend them under Evolve (top right): the tree, or upgrades for each kind of ant.');
}
// ---------- build 46: daughter colonies (SUPERCOLONY.md) ----------
// Support colonies with a role, not second capitals. A nuptial flight (the Royal chamber, and guardians beaten:
// 3, 5, 7, 9, 11) sends a winged queen to a finished outpost far from home; a tunnel is dug to her from the main
// nest, slowly; when it arrives she lays her own eggs, fed from the main stores. Far away she is numbers (d.pop);
// near you, real ants (a.dh = her key) who forage and patrol round her door.
const DAUGHTERS = {
  war:    { name: 'the War Camp', short: 'War Camp', icon: '⚔', branch: 'Society', soldiers: 0.65, line: 'Her soldiers hatch Seasoned.' },
  brood:  { name: 'the Brood Hall', short: 'Brood Hall', icon: '🥚', branch: 'Bodies', soon: true },
  watch:  { name: 'the Watch', short: 'Watch', icon: '👁', branch: 'Senses', soon: true },
  quarry: { name: 'the Quarry', short: 'Quarry', icon: '⛏', branch: 'Nest', soon: true },
  garden: { name: 'the Garden', short: 'Garden', icon: '🌿', branch: 'Symbiosis', soon: true },
};
const FLIGHT_AT = [3, 5, 7, 9, 11], DAUGHTER_CAP = 50, DAUGHTER_MIN = 2*AREA, FLIGHT_TIME = 10;
const daughterOf = (s, a) => a.dh && (s.daughters || []).find(d => d.key === a.dh) || null;
function flightsAllowed(s){ if (!has(s, 'royal')) return 0; const z = zonesTaken(s); return FLIGHT_AT.filter(n => z >= n).length; }
const flightReady = s => flightsAllowed(s) > (s.daughters || []).length;
// Where a daughter can be founded, and as what ('' when it can).
function daughterLock(s, oi, role){
  const o = (s.outposts || [])[oi], R = DAUGHTERS[role]; if (!o) return 'no outpost';
  if (!R) return 'no such role'; if (R.soon) return R.short + ' comes in a later build';
  if ((s.daughters || []).some(d => d.key === role)) return 'you already have ' + R.name;
  if (!has(s, 'royal')) return 'evolve the Royal chamber (Nest) first';
  if (!flightReady(s)){ const next = FLIGHT_AT[(s.daughters || []).length]; return next ? `the next winged queen comes with guardian ${next} beaten (${zonesTaken(s)} so far)` : 'no more winged queens'; }
  if (!o.done) return 'the outpost is not finished';
  if ((s.daughters || []).some(d => d.oid === o.id)) return 'a daughter lives here already';
  const w = s.world; if (Math.hypot(o.x - w.ex, o.y - w.ey) < DAUGHTER_MIN) return 'too near home: at least two regions away';
  for (const d of s.daughters || []) if (Math.hypot(o.x - d.ex, o.y - d.ey) < DAUGHTER_MIN) return 'too near ' + DAUGHTERS[d.key].name;
  return '';
}
function foundDaughter(s, oi, role){
  if (daughterLock(s, oi, role)) return false;
  const o = s.outposts[oi], w = s.world, R = DAUGHTERS[role];
  // Her door: a walkable tile a few steps from the cairn.
  let ex = o.x, ey = o.y; for (const [dx, dy] of [[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,2],[2,-2],[-2,-2],[1,0]]) if (walk(s, o.x + dx, o.y + dy)){ ex = o.x + dx; ey = o.y + dy; break; }
  const dist = Math.hypot(ex - w.ex, ey - w.ey);
  const d = { key: role, oid: o.id, region: o.region, ex, ey, state: 'flight', t0: s.t, tunnel: { progress: 0, need: Math.round(dist*4.5) }, pop: {}, real: false, eggT: 0, hatched: 0 };
  (s.daughters = s.daughters || []).push(d);
  s.banner = { key: 'flight-' + role, t: s.t, icon: '🪽', title: 'The nuptial flight', line: `A winged queen rises from your nest and flies for ${AREAS[o.region].name.replace(/^The /, 'the ')}. She will found ${R.name}.`, kind: 'gift' }; s.events.push('flight');
  return true;
}
function daughterHome(s, d){ const w = s.world; w.dhomes = w.dhomes || {}; const k = d.key + ':' + d.ex + ',' + d.ey; return w.dhomes[k] || (w.dhomes[k] = bfs(w.blocked, d.ex, d.ey)); }
const DFORAGE = 2.5; // build 47: a far daughter's forager, food a minute (measured near: 2 to 3)
const dpop = d => Object.values(d.pop || {}).reduce((a, b) => a + b, 0);
const daughterAnts = (s, d) => s.ants.filter(a => a.dh === d.key && a.state !== 'dead');
const daughterCount = (s, d) => dpop(d) + daughterAnts(s, d).length;
// Bring her ants to life round her door, or fold them back into numbers.
function realizeDaughter(s, d){
  for (const caste in d.pop) for (let i = 0; i < d.pop[caste]; i++){ const a = mkAnt(s, caste, 'in', d.ex, d.ey, 0); a.dh = d.key; a.rest = Math.random()*8; if (CASTES[caste].fight >= 3 && d.key === 'war') a.xp = Math.max(a.xp || 0, RANKS[1].xp); }
  d.pop = {}; d.real = true;
}
function abstractDaughter(s, d){
  const c = s.colony;
  for (const a of daughterAnts(s, d)){ if (a.follow || a.isPlayer || a.state === 'away') continue;
    if (a.carry && a.kind === 'food') c.store = Math.min(c.cap, c.store + a.carry);
    d.pop[a.caste] = (d.pop[a.caste] || 0) + 1; a.state = 'dead'; a.folded = true; }
  s.ants = s.ants.filter(a => a.state !== 'dead'); d.real = false;
}
function tickDaughters(s, dt){
  const c = s.colony, P = s.player, w = s.world;
  // A winged queen ready: say so once each time.
  const ready = flightReady(s); if (ready && !s.flightSaid){ s.flightSaid = true; s.banner = { key: 'flightready' + (s.daughters || []).length, t: s.t, icon: '🪽', title: 'A winged queen is ready', line: 'Open the map and tap a finished outpost at least two regions from home: she will found a daughter colony there.', kind: 'gift' }; s.events.push('flight'); }
  if (!ready) s.flightSaid = false;
  if (!s.daughters || !s.daughters.length) return;
  const pa = P.ant && !P.inNest ? P.ant : null;
  const builders = s.ants.filter(a => !a.team && !a.dh && a.caste === 'builder').length;
  for (const d of s.daughters){
    const R = DAUGHTERS[d.key];
    if (d.state === 'flight'){ if (s.t - d.t0 >= FLIGHT_TIME){ d.state = 'tunnel'; s.banner = { key: 'landed-' + d.key, t: s.t, icon: R.icon, title: 'She has landed', line: `The new queen digs in at ${AREAS[d.region].name.replace(/^The /, 'the ')}. Your builders start the tunnel to her: the line on the map shows how far it has come.`, kind: 'gift' }; s.events.push('landed'); } continue; }
    if (d.state === 'tunnel'){
      // Food to dig with; faster with builders at home (up to six).
      if (c.store < 5){ if (!d.starved){ d.starved = true; P.msg = `The tunnel to ${R.name} has stopped: the store is empty.`; } continue; }
      d.starved = false; c.store -= 0.25*dt; d.tunnel.progress += (1 + 0.5*Math.min(6, builders))*dt;
      if (d.tunnel.progress >= d.tunnel.need){ d.state = 'ready'; d.tunnel.progress = d.tunnel.need; d.readyT = s.t;
        s.banner = { key: 'tunnel-' + d.key, t: s.t, icon: R.icon, title: R.short + ' is joined', line: `The tunnel reaches ${R.name}. Her chambers are dug and she starts laying, fed from your stores. ${R.line || ''}`, kind: 'gift' }; s.events.push('daughter');
        P.msg = `${R.short} is open: up to ${DAUGHTER_CAP} ants, fed from your stores.`; }
      continue;
    }
    // Ready: near you she is real ants, far away numbers.
    const dist = pa ? Math.hypot(pa.x/T - d.ex, pa.y/T - d.ey) : 1e9;
    if (!d.real && dist < AREA*1.5) realizeDaughter(s, d);
    else if (d.real && dist > AREA*1.8) abstractDaughter(s, d); // (under the 2 regions she must be from home: at home she is always numbers)
    // Her eggs, paid from the main stores.
    d.eggT += dt;
    if (d.eggT >= 30 && daughterCount(s, d) < DAUGHTER_CAP){
      const soldier = Math.random() < (R.soldiers || 0) && c.protein >= 2, caste = soldier ? 'soldier' : 'forager', cost = eggCost(s, caste); /* build 47.2: the same egg discounts as the main nest */
      if (c.store > 15 && payCost(c, cost)){ d.eggT = 0; d.hatched++;
        if (d.real){ const a = mkAnt(s, caste, 'in', d.ex, d.ey, 0); a.dh = d.key; a.rest = 1; if (soldier && d.key === 'war') a.xp = Math.max(a.xp || 0, RANKS[1].xp); }
        else d.pop[caste] = (d.pop[caste] || 0) + 1; }
    }
    // Build 47: far away her ants starve too, when the store has been empty a while (as real ones do).
    if (!d.real && c.starve > 30){ d.starveAcc = (d.starveAcc || 0) + dt; if (d.starveAcc >= 10){ d.starveAcc = 0; const k = Object.keys(d.pop).filter(q => d.pop[q] > 0).sort((p, q) => d.pop[q] - d.pop[p])[0]; if (k){ d.pop[k]--; c.deaths.starved = (c.deaths.starved || 0) + 1; } } }
    // Far away, her foragers' work as a rate into the main store (build 47: 2.5 a minute each, what real ones bring in).
    if (!d.real && d.pop.forager){ c.store = Math.min(c.cap, c.store + d.pop.forager*DFORAGE/60*dt); c.foodTotal += d.pop.forager*DFORAGE/60*dt; }
  }
}
// ---------- build 42: breaking into new ground ----------
// Why a section can't be opened now ('' when it can, cost aside).
function sectionLock(s, key){
  const S = SECTION_BY[key], n = s.nest, c = s.colony; if (!S) return 'no such section';
  if (n.open && n.open[key]) return 'open';
  if (n.breach) return n.breach.key === key ? 'breaking through' : 'one break-in at a time';
  const t = soilTier(S.y0);
  if (t >= 1 && !roomOf(s, 'workshop')) return 'needs a Workshop';
  if (t === 2 && s.queen.level < 1) return 'needs the queen at level 2';
  if (t >= 3 && s.queen.level < 2) return 'needs the queen at level 3';
  const cu = Object.keys(c.curios || {}).length; if (S.curios && cu < S.curios) return `needs ${S.curios} curios found (${cu} so far)`;
  return '';
}
function startBreach(s, key){
  const S = SECTION_BY[key]; if (!S || sectionLock(s, key) || !payCost(s.colony, S.cost)) return false;
  s.nest.breach = { key, progress: 0 }; s.player.msg = `Builders start breaking into ${S.name}.`; s.events.push('breach');
  return true;
}
// Builders inside chew at the wall: four at most, each at its own pace.
function tickBreach(s, dt){
  const B = s.nest.breach; if (!B) return; const S = SECTION_BY[B.key];
  const crew = s.ants.filter(a => !a.team && a.caste === 'builder' && (a.state === 'in' || a.state === 'build')).slice(0, 4);
  if (!crew.length){ if (!B.warned){ B.warned = true; s.player.msg = `Breaking into ${S.name} needs builders inside the nest.`; } return; }
  B.warned = false; for (const a of crew) B.progress += workOf(s, a)*dt;
  if (B.progress >= S.work) openSection(s, B.key);
}
function openSection(s, key){
  const S = SECTION_BY[key], n = s.nest, F = NEST_FINDS[S.find]; n.open = n.open || {}; n.open[key] = true; n.breach = null; n.ver++;
  nestFind(s, S.find, S);
  s.banner = { key: 'section-' + key, t: s.t, icon: '⛏', title: 'Broke through!', line: `Into ${S.name}: ${F.name} (${F.fx}).`, kind: 'gift' }; s.events.push('breakthrough');
  s.player.msg = `Broke through into ${S.name}! Behind the wall: ${F.name} (${F.fx}).`;
}
function nestFind(s, kind, S){
  const c = s.colony;
  if (kind === 'seeds') c.store = Math.min(c.cap, c.store + 60);
  else if (kind === 'grub' || kind === 'grub2'){ const k = kind === 'grub2' ? 2 : 1; c.protein += 30*k; addChitin(s, 10*k); }
  else if (kind === 'aphids') c.rootAphids = (c.rootAphids || 0) + 1;
  else if (kind === 'seep') c.seeps = (c.seeps || 0) + 1;
  else if (kind === 'curio'){ c.buried = (c.buried || 0) + 1; gainGenes(s, 2, 'a buried trinket'); }
  else if (kind === 'mole' && S) carveMole(s, S);
}
// An old mole tunnel: a winding run from the wall nearest home, outward.
function carveMole(s, S){
  const deep = S.y0 >= SOIL_TOP[3], west = S.x1 < HOME_X0;
  let x = deep ? Math.round((S.x0 + S.x1)/2) : west ? S.x1 : S.x0, y = deep ? S.y0 : Math.round((S.y0 + S.y1)/2);
  let h = 0; for (const ch of S.key) h = (h*31 + ch.charCodeAt(0)) >>> 0; const rnd = () => (h = (h*1103515245 + 12345) >>> 0) / 4294967296;
  // Joined to your tunnels if they come within a few cells of the wall.
  { const dx = deep ? 0 : west ? 1 : -1, dy = deep ? -1 : 0; const path = []; let jx = x + dx, jy = y + dy;
    for (let k = 0; k < 6; k++, jx += dx, jy += dy){ if (s.nest.cells[nidx(jx, jy)]){ for (const [px, py] of path) dig(s, px, py); break; } path.push([jx, jy]); } }
  for (let i = 0; i < 18; i++){ dig(s, x, y); const r = rnd();
    if (deep){ if (r < 0.5) y = Math.min(S.y1, y + 1); else x = Math.max(S.x0, Math.min(S.x1, x + (r < 0.75 ? -1 : 1))); }
    else { if (r < 0.6) x = Math.max(S.x0, Math.min(S.x1, x + (west ? -1 : 1))); else y = Math.max(S.y0, Math.min(S.y1, y + (r < 0.8 ? -1 : 1))); } }
}
// Build 45 (Mark's lore): the bedrock glows, very faintly green. The first block dug down there says so, quietly:
// something below is why these ants grow. (The glowing rocks themselves are drawn by the nest view: GLOW_ROCKS.)
const GLOW_ROCKS = [[3, 61], [6, 63], [11, 60], [15, 62], [19, 63], [27, 61], [31, 63], [35, 60], [38, 62], [44, 61], [46, 63]];
function bedrockGlow(s, y){ const c = s.colony; if (y < BEDROCK_Y || c.glowSeen) return; c.glowSeen = true; s.player.msg = 'The rock down here is warm, and it glows a faint green. Is this why we grow?'; s.events.push('glow'); }
// The bedrock's three prizes: dug out, they're found.
function bedrockPrize(s, x, y){
  const P = BEDROCK_PRIZES.find(b => b.x === x && b.y === y), c = s.colony; if (!P || (c.prizes || {})[P.key]) return;
  c.prizes = c.prizes || {}; c.prizes[P.key] = true;
  if (P.key === 'fossil') gainGenes(s, 5, 'a fossil ant in the bedrock');
  else if (P.key === 'spring') c.seeps = (c.seeps || 0) + 3;
  else if (P.key === 'ring'){ c.buried = (c.buried || 0) + 1; gainGenes(s, 4, 'a lost gold ring'); }
  s.banner = { key: 'prize-' + P.key, t: s.t, icon: '💎', title: 'Found in the bedrock!', line: `${P.name.replace(/^./, ch => ch.toUpperCase())}: ${P.fx}.`, kind: 'gift' }; s.events.push('breakthrough');
}
// Root aphids and seeps pay out over time.
function tickNestFinds(s, dt){
  const c = s.colony;
  if (c.rootAphids){ c.aphidAcc = (c.aphidAcc || 0) + c.rootAphids*dt/60; if (c.aphidAcc >= 1){ c.aphidAcc -= 1; addSugar(s, 1); } }
  if (c.seeps){ c.seepAcc = (c.seepAcc || 0) + c.seeps*dt/20; if (c.seepAcc >= 1){ c.seepAcc -= 1; c.water = Math.min(c.waterCap, c.water + 1); } }
}
function toggleDigOrder(s, x, y){
  const n = s.nest; if (x<1||y<1||x>=NW-1||y>=NH) return 'edge';
  const i = n.digOrders.findIndex(o => o.x===x && o.y===y); if (i >= 0){ n.digOrders.splice(i,1); return 'removed'; }
  if (n.cells[nidx(x,y)]) return 'dug'; let adj = isDugNeighbor(s, x, y);
  if (!adj){ const o = n.digOrders.find(o => Math.abs(o.x-x)+Math.abs(o.y-y) === 1); if (o) adj = [o.x, o.y]; } if (!adj) return 'not adjacent';
  const why = digAllowed(s, y, x); if (why) return why; if (n.digOrders.length >= 16) return 'too many';
  n.digOrders.push({ x, y, ax: adj[0], ay: adj[1], progress: 0, need: SOIL[soilTier(y)].work }); return 'added';
}

// ---------- state ----------
function newColony(ex, ey, team){
  return { team, ex, ey, store: team ? 20 : 10, cap: 20, water: 8, waterCap: 10, protein: 0, grit: 0,
    hatchCap: 1, hatchMul: 1, buildQueue: [], eggQueue: [], eggs: [],
    trophies: {spider:false}, starve: 0, deaths: {}, kills: {}, delivered: new Array(60).fill(0), eaten: new Array(60).fill(0), secAcc: 0,
    queenAlive: true, founded: team !== 0, raidT: 0, siege: 0, stolen: 0, pstarve: 0, forage: 0, ...growthState() };
}
// Growth (build 12, growth.js): 🧬 Genes, ant-type levels and picks, evolution
// nodes, veteran doctrine, the queen's traits, and the tallies deeds read.
// A rival colony not yet woken (build 25).
function sleepingRival(w, team){ const R = RIVALS[team - 1], n = w.rnests[team], r = newColony(n.x, n.y, team); Object.assign(r, { key: R.key, asleep: true, store: 30, cap: 200, water: 999, waterCap: 999, hatchCap: 2, raidCd: 0, qhp: R.qhp }); return r; }
function wakeRival(s, r, say){ const R = RIVALS[r.team - 1]; r.asleep = false;
  // Build 25.1: their region comes alive with them, food and all. Food only grows in regions
  // someone has walked into, so a colony waking in an unvisited one starved out in four minutes.
  const ai = s.world.area[idx(r.ex, r.ey)]; if (ai != null && !s.active[ai]){ s.active[ai] = true; for (let k = 0; k < AREAS[ai].start; k++) spawnFood(s, ai, false); populateBugs(s, ai); }
  if (say){ s.banner = { key: 'rival-' + R.key, t: s.t, icon: '🐜', title: R.name, line: R.arrival, kind: 'hard' }; s.events.push('event'); s.player.msg = R.name + ': ' + R.arrival; }
  r.store = Math.max(r.store, 80); for (let i = 0; i < R.start[0]; i++) mkAnt(s, 'forager', 'in', r.ex, r.ey, r.team); for (let i = 0; i < R.start[1]; i++) mkAnt(s, 'soldier', 'in', r.ex, r.ey, r.team); }
function growthState(){
  return { genes: 0, genesTotal: 0, up: {}, picks: {}, evo: {}, doctrine: {}, qtraits: {}, found: {}, scouted: {},
    hatched: 0, treats: 0, foodTotal: 0, storePeak: 0, repaired: 0, raidsBeaten: 0, fallen: [], named: 0,
    held: {}, goals: { done: {}, sets: {} }, dug: 0, sugar: 0, chitin: 0, sugarTotal: 0, chitinTotal: 0, wood: 0, fungus: 0, roomLv: {} };
}
function create(seed){
  const w = makeWorld(seed || 7);
  const s = {
    t: 0, seed: seed || 7, world: w, nest: makeNest(),
    trail: new Float32Array(W*H), alarm: new Float32Array(W*H), hot: new Set(),
    // Fog of war: which SEE.cell-tile squares of the yard you have seen.
    seenMap: new Uint8Array((W/SEE.cell)*(H/SEE.cell)), seenT: 0,
    ants: [], nextId: 1, items: [],
    spider: null, spiderRespawn: 50, spiderAway: null, cat: null, catRespawn: 20,
    colony: newColony(w.ex, w.ey, 0), rival: newColony(w.rx, w.ry, 1), rivals: [],
    player: { ant: null, hunger: 100, tx: null, ty: null, holding: false, mark: false, pending: false, msg: '', inNest: true, ntx: null, nty: null },
    queen: { x: SHAFT, y: 0, energy: 30, placed: false, level: 0, room: null, hp: 100 },
    phase: 'dig', itemTimer: 0, dewTimer: 0, dew: false, won: false, lost: false,
    areaT: AREAS.map(() => 0), strikes: [], strikeT: AREAS.map(A => A.strike ? A.strike.every[0] + Math.random()*(A.strike.every[1] - A.strike.every[0]) : 0), mower: { state: 'idle', next: 420, t: 0, y: 0 },
    rain: { t: 0, on: false, next: 480 }, repairs: [], seen: {}, events: [],
    // Build 16: small creatures, and what the renderer shows of fights and rain.
    critters: [], bugGone: {}, hits: [], pops: [], splashes: [], spiderCorpse: null, catCorpse: null,
    // Build 19: bosses, and the event director.
    bosses: {}, goo: [], stalks: [], bursts: [], event: null, banner: null, bossIntro: null,
    director: { next: 600 + Math.random()*120, calm: 0, lastLethal: -999, lastHard: -999, had: {} },
  };
  s.rival.store = 20; s.rival.cap = 120; s.rival.water = 999; s.rival.waterCap = 999; s.rival.hatchCap = 2; s.rival.raidCd = 0; s.rival.key = 'pavement';
  s.rivals = [s.rival, ...RIVALS.slice(1).map((R, i) => sleepingRival(w, i + 2))];
  // Every area starts with its own stock; home has the most, and it won't
  // last. The far regions lie dormant until you first walk into one.
  s.active = AREAS.map(A => !A.dormant);
  for (let i=0;i<AREAS.length;i++) if (s.active[i]) for (let k=0;k<AREAS[i].start;k++) spawnFood(s, i, false);
  reveal(s, w.ex, w.ey, SEE.home);
  for (let i=0;i<6;i++) spawnInArea(s, REGION.rock, 'grit', 'pebble');
  for (let i=0;i<4;i++) spawnInArea(s, REGION.woodpile, 'grit', 'pebble');
  // Puddles never dry up and aphids never run out; both refill between visits.
  for (const [x,y,amt] of w.puddles) s.items.push({ x, y, kind:'water', type:'puddle', amt, max: amt });
  for (const [x,y] of w.aphids) s.items.push({ x, y, kind:'food', type:'aphids', amt: 20, max: 20 });
  for (let i=0;i<6;i++) mkAnt(s, 'forager', 'in', w.rx, w.ry, 1);
  mkAnt(s, 'soldier', 'in', w.rx, w.ry, 1);
  spawnSpider(s);
  s.spoilAt = spoilSpot(s); s.spoilPile = 0;
  s.outposts = []; outpostsChanged(s);
  for (let i=0;i<AREAS.length;i++) if (s.active[i]) populateBugs(s, i);
  s.curios = placeCurios(s);
  return s;
}
// Where diggers dump the dirt: open ground about eight tiles from the
// entrance, out of the way (preferring south, away from the rock).
function spoilSpot(s){
  const w = s.world; let best = null, bs = Infinity;
  for (let k = 0; k < 24; k++){ const a = k/24*Math.PI*2;
    for (const r of [7, 8, 9, 10]){ const x = Math.round(w.ex + Math.cos(a)*r), y = Math.round(w.ey + Math.sin(a)*r);
      if (!walk(s, x, y) || w.home[idx(x,y)] >= 9999) continue;
      let open = 0; for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) if (walk(s, x+dx, y+dy)) open++;
      const sc = Math.abs(w.home[idx(x,y)] - 9) + (25 - open) * 0.5 - Math.sin(a) * 2;
      if (sc < bs){ bs = sc; best = { x, y }; } } }
  return best || { x: w.ex + 6, y: w.ey + 6 };
}
// ---------- fog of war ----------
// The yard map shows only what you have seen: a circle round your ant as it
// walks, and the ground round home from the start.
const SEE = { cell: 4, player: 13, home: 22 };
function reveal(s, x, y, r){
  const cw = W/SEE.cell, ch = H/SEE.cell, cx = x/SEE.cell, cy = y/SEE.cell, cr = r/SEE.cell;
  for (let j = Math.max(0, Math.floor(cy - cr)); j <= Math.min(ch-1, Math.ceil(cy + cr)); j++)
    for (let i = Math.max(0, Math.floor(cx - cr)); i <= Math.min(cw-1, Math.ceil(cx + cr)); i++)
      if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= cr) s.seenMap[j*cw + i] = 1;
}
function mkAnt(s, caste, state, tx, ty, team){
  const rnd = Math.random, C = CASTES[caste];
  const a = { id: s.nextId++, caste, state, team: team||0, tx, ty, x: (tx+0.5)*T, y: (ty+0.5)*T, dx: 0, dy: -1,
    carry: 0, kind: 'food', hp: C.hp, thr: { f: 0.25+rnd()*0.55, d: 0.25+rnd()*0.55 }, rest: rnd()*4, explore: 0, flee: 0, follow: false, isPlayer: false,
    nx: SHAFT, ny: 0, ntx: SHAFT, nty: 0, goal: null };
  if (!a.team) a.hp = maxHp(s, a); else a.hp = C.hp*rspec(a).hp;
  s.ants.push(a); return a;
}
// An item somewhere open inside an area (0..8, see yard.js).
function spawnInArea(s, ai, kind, type, amt){
  const w = s.world, b = areaBounds(ai);
  for (let tries=0; tries<60; tries++){
    const x = b.x0 + 2 + Math.floor(w.rnd()*(AREA-4)), y = b.y0 + 2 + Math.floor(w.rnd()*(AREA-4));
    if (w.blocked[idx(x,y)] || w.pit[idx(x,y)]) continue;
    if (Math.hypot(x-w.rx, y-w.ry) < 4 || Math.hypot(x-w.ex, y-w.ey) < 3) continue;
    if (s.items.some(f => f.x===x && f.y===y)) continue;
    const F = FOODS[type];
    const it = { x, y, kind, type, amt: amt != null ? amt : F ? F.amt[0] + (F.amt[1] > F.amt[0] ? Math.floor(w.rnd()*(F.amt[1]-F.amt[0]+1)) : 0) : type==='pebble' ? 10 : 5 };
    s.items.push(it);
    return it;
  }
  return null;
}
// An item within foragers' reach of home on open ground whose region's
// ground passes ok(); ground matching `rich` is tried first (build 23).
function spawnNear(s, kind, type, ok, rich){
  const w = s.world, c = s.colony, r = forageRange(s)*0.9;
  for (let tries = 0; tries < 80; tries++){
    const ang = Math.random()*Math.PI*2, d = 6 + Math.sqrt(Math.random())*(r - 6), x = Math.round(c.ex + Math.cos(ang)*d), y = Math.round(c.ey + Math.sin(ang)*d);
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || w.blocked[idx(x,y)] || w.pit[idx(x,y)]) continue;
    const g = AREAS[w.area[idx(x,y)]].ground || '';
    if (!ok(g) || (rich && tries < 40 && !rich.test(g)) || s.items.some(f => f.x === x && f.y === y)) continue;
    const it = { x, y, kind, type, amt: FOODS[type].amt[0] }; s.items.push(it); return it;
  }
  return null;
}
// One item from an area's food table; now and then a treat where people drop them.
function spawnFood(s, ai, treats){
  const A = AREAS[ai], w = s.world;
  if (treats && A.treat && w.rnd() < A.treat && !s.items.some(f => heavy(f))){
    const it = spawnInArea(s, ai, 'food', A.treats[Math.floor(w.rnd()*A.treats.length)]);
    if (it){ const F = FOODS[it.type]; s.events.push('treat'); if (!s.player.msg) s.player.msg = 'A ' + F.name + ' fell by ' + A.name.replace(/^The /, 'the ') + '! Crew of ' + F.crew + ' to carry.'; }
    return it;
  }
  let tot = 0; for (const f of A.foods) tot += f[1];
  let r = w.rnd()*tot, type = A.foods[0][0];
  for (const f of A.foods){ r -= f[1]; if (r <= 0){ type = f[0]; break; } }
  return spawnInArea(s, ai, FOODS[type] && FOODS[type].protein ? 'protein' : 'food', type);
}
// How far foragers roam on their own: a bigger colony reaches farther.
const forageRange = s => picked(s, 'forager', 'lonewolf') ? 400 : Math.round(FORAGE[Math.min(4, s.colony.forage || 0)].range*(has(s, 'suncompass') ? 1.25 : 1));
// A forager's pace, with its training.
const fSpeed = (s, a) => paceOf(s, a, CASTES[a.caste].speed * (!a.team && a.caste === 'forager' ? FORAGE[Math.min(4, s.colony.forage || 0)].speed : 1));
const areaOf = (s, x, y) => s.world.area[idx(Math.max(0, Math.min(W-1, x)), Math.max(0, Math.min(H-1, y)))];
// The spider lives at its web in the Flowerbed.
function spawnSpider(s){
  const w = s.world;
  s.spider = { x:(w.web.x+0.5)*T, y:(w.web.y+2*SCALE+0.5)*T, hp: 150, maxHp: 150, wander: 0, bite: 0, cost0: s.colony ? s.colony.deaths.spider || 0 : 0 };
}
// Caterpillars graze the Lawn, the Compost heap, the Flowerbed, the
// vegetable garden and the great lawn.
function spawnCat(s){
  // Mostly close to home, so the first hunt's meat is within a forager's reach.
  const homes = [REGION.lawn, REGION.lawn, REGION.lawn, REGION.compost, REGION.compost, REGION.flowerbed, REGION.flowerbed, REGION.clover, REGION.tomatoes, REGION.dandelions];
  const w = s.world, ai = homes[Math.floor(Math.random()*homes.length)], b = areaBounds(ai);
  for (let tries=0; tries<100; tries++){
    const x = b.x0 + 3 + Math.floor(Math.random()*(AREA-6)), y = b.y0 + 3 + Math.floor(Math.random()*(AREA-6));
    if (w.blocked[idx(x,y)] || w.pit[idx(x,y)] || w.home[idx(x,y)] < 10) continue;
    s.cat = { x:(x+0.5)*T, y:(y+0.5)*T, hp: 30, maxHp: 30, wander: 0, gx: (x+0.5)*T, gy: (y+0.5)*T }; return;
  }
}

const raiseAlarm = (s, x, y, v) => { const i = idx(x,y); s.alarm[i] = Math.max(s.alarm[i], v); s.hot.add(i); };
const walk = (s,x,y) => x>=0 && y>=0 && x<W && y<H && !s.world.blocked[idx(x,y)];
// Build 45: items in a grid of 8-tile cells, so a forager looks only at the cells round it, not every item in the
// yard. Rebuilt each tick, and again whenever the item list is replaced or grows. Answers match the plain scan
// (ties go to the item earliest in the list, as before).
const ICELL = 8;
function itemGrid(s){
  const g = s._ig; if (g && g.t === s.t && g.arr === s.items && g.len === s.items.length) return g;
  const cols = Math.ceil(W/ICELL), cells = new Map();
  s.items.forEach((f, i) => { const k = Math.floor(f.y/ICELL)*cols + Math.floor(f.x/ICELL); let c = cells.get(k); if (!c) cells.set(k, c = []); c.push(i); });
  return (s._ig = { t: s.t, arr: s.items, len: s.items.length, cols, cells });
}
const itemAt = (s,x,y) => { const g = itemGrid(s), c = g.cells.get(Math.floor(y/ICELL)*g.cols + Math.floor(x/ICELL)); if (!c) return undefined; for (const i of c){ const f = s.items[i]; if (f.x===x && f.y===y && f.amt>0) return f; } return undefined; };
const colonyOf = (s, a) => a.team ? s.rivals[a.team - 1] : s.colony;
const homeOf = (s, a) => a.team ? rivalHome(s, a.team) : a.dh ? (daughterOf(s, a) ? daughterHome(s, daughterOf(s, a)) : s.world.home) : s.world.home;
// Each rival nest's distance field, made when the colony wakes.
function rivalHome(s, team){ const w = s.world; if (team === 1) return w.rhome; if (!w.rhomes) w.rhomes = {}; if (!w.rhomes[team]){ const n = w.rnests[team]; w.rhomes[team] = bfs(w.blocked, n.x, n.y); } return w.rhomes[team]; }

function stepTo(a, tx, ty, speed, dt){
  const gx = (tx+0.5)*T, gy = (ty+0.5)*T; let ddx = gx-a.x, ddy = gy-a.y; const d = Math.hypot(ddx,ddy);
  if (d < 0.5){ a.x = gx; a.y = gy; return true; }
  const m = Math.min(d, speed*SURF*dt*(a.slowT > 0 ? 0.5 : 1)); ddx/=d; ddy/=d; a.x += ddx*m; a.y += ddy*m; a.dx = ddx; a.dy = ddy;
  return Math.hypot(gx-a.x, gy-a.y) < 0.5;
}
function pickWeighted(opts, tot){ let r = Math.random()*tot; for (const o of opts){ r -= o[2]; if (r <= 0) return o; } return opts[opts.length-1]; }
function okDiag(s, a, dx, dy){ return !(dx && dy && (!walk(s,a.tx+dx,a.ty) || !walk(s,a.tx,a.ty+dy))); }
function chooseExplore(s, a, maxDist){
  const home = homeOf(s, a), cd = home[idx(a.tx,a.ty)]; const opts = []; let tot = 0;
  for (const [dx,dy] of N8){
    const nx = a.tx+dx, ny = a.ty+dy; if (!walk(s,nx,ny) || !okDiag(s,a,dx,dy)) continue;
    // Past the usual range only along a scent trail: the player opens up far ground.
    const nd = home[idx(nx,ny)]; if (maxDist && nd > maxDist && (a.team || (s.trail[idx(nx,ny)] < 0.3 && !s.reachMask[idx(nx,ny)]))) continue;
    let wgt = 0.15; if (nd > cd) wgt += 0.6; else if (nd === cd) wgt += 0.25;
    const fw = dx*a.dx + dy*a.dy; if (fw > 0.8) wgt += 1.4; else if (fw > 0.5) wgt += 0.6; else if (fw < -0.5) wgt *= 0.1;
    if (!a.team) wgt += Math.min(4, s.trail[idx(nx,ny)]) * 4;
    if (s.spider && a.flee > 0){ const sd = Math.hypot((nx+0.5)*T - s.spider.x, (ny+0.5)*T - s.spider.y); wgt *= sd < 3*T ? 0.05 : 1.5; }
    if (s.world.pit[idx(nx,ny)]) wgt *= 0.03; // ants know to keep off the sand slopes
    opts.push([nx,ny,wgt]); tot += wgt;
  }
  // Build 47: past its range with every way out further still, after a while it heads back in instead of standing frozen.
  if (opts.length) a.stuckAt = null; else if (a.stuckAt == null) a.stuckAt = s.t;
  if (!opts.length && s.t - a.stuckAt > 10){ for (const [dx,dy] of N8){ const nx = a.tx+dx, ny = a.ty+dy; if (walk(s,nx,ny) && okDiag(s,a,dx,dy) && home[idx(nx,ny)] < cd){ opts.push([nx,ny,1]); tot += 1; } } }
  if (!opts.length) return; const o = pickWeighted(opts, tot); a.tx = o[0]; a.ty = o[1];
}
function chooseReturn(s, a){
  const home = homeOf(s, a), cd = home[idx(a.tx,a.ty)]; let bd = cd; const cand = [];
  for (const [dx,dy] of N8){ const nx = a.tx+dx, ny = a.ty+dy; if (!walk(s,nx,ny) || !okDiag(s,a,dx,dy) || s.world.pit[idx(nx,ny)] === 2) continue;
    const nd = home[idx(nx,ny)]; if (nd < bd){ bd = nd; cand.length = 0; cand.push([nx,ny]); } else if (nd === bd && nd < cd) cand.push([nx,ny]); }
  if (cand.length){ const b = cand[Math.floor(Math.random()*cand.length)]; a.tx = b[0]; a.ty = b[1]; }
}
function chooseToward(s, a, px, py){
  const gx = Math.floor(px/T), gy = Math.floor(py/T); let best = null, bd = 1e9;
  for (const [dx,dy] of N8){ const nx = a.tx+dx, ny = a.ty+dy; if (!walk(s,nx,ny) || !okDiag(s,a,dx,dy)) continue;
    const d = Math.hypot(nx-gx, ny-gy) + Math.random()*0.3; if (d < bd){ bd = d; best = [nx,ny]; } }
  if (best){ a.tx = best[0]; a.ty = best[1]; }
}
function wanted(s, a){
  const c = colonyOf(s, a); const want = {};
  if (c.store < c.cap) want.food = 1;
  if (!a.team && c.water < c.waterCap*0.6) want.water = 1.2;
  // Protein matters less once there's plenty, and much less when the colony
  // is going hungry (build 19: a Swarm day's queens drew starving foragers off food).
  want.protein = c.protein < 30 ? 1.5 : c.protein < 100 ? 1 : 0.4;
  if (!a.team && c.store < c.cap*0.25) want.protein *= 0.4;
  if (!a.team) want.chitin = 0.7;
  // Enough stone for the next queen upgrade, never less than 30.
  if (!a.team && (a.caste==='builder' || c.store > c.cap*0.6) && c.grit < Math.max(30, (QUEEN_UP[s.queen.level] || {}).grit || 0)) want.grit = 0.8;
  // On a duty (build 17): that's what it looks for; anything else it wants
  // only if it's much nearer.
  const D = !a.team && a.duty && DUTIES[a.duty];
  if (D && D.kind){ for (const k in want) want[k] *= 0.35; want[D.kind] = 1.5; if (a.duty === 'hunt') want.chitin = 1.3; }
  if (!a.team && a.caste === 'forager' && c.store < c.cap*0.15) want.food = 2; /* build 41: a hungry colony's foragers drop their duty for food */
  return want;
}
function nearestItem(s, a, r, want){
  let wmax = 0; for (const k in want) if (want[k] > wmax) wmax = want[k]; if (!wmax) return null;
  const g = itemGrid(s), R = r*wmax, cx0 = Math.max(0, Math.floor((a.tx - R)/ICELL)), cx1 = Math.floor((a.tx + R)/ICELL), cy0 = Math.max(0, Math.floor((a.ty - R)/ICELL)), cy1 = Math.floor((a.ty + R)/ICELL);
  let best = null, bd = r, bi = Infinity;
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1 && cx < g.cols; cx++){ const c = g.cells.get(cy*g.cols + cx); if (!c) continue;
    for (const i of c){ const f = s.items[i]; if (f.amt<=0 || !want[f.kind] || (heavy(f) && !a.team && !chewsTreats(s, a)) || f.carried) continue; const d = Math.hypot(f.x-a.tx, f.y-a.ty)/want[f.kind]; if (d < bd || (d === bd && best && i < bi)){ bd = d; best = f; bi = i; } } }
  return best;
}
function deposit(s, a){
  const c = colonyOf(s, a);
  if (!a.team && a.carry > 0){ gainXp(s, a, 3); discover(s, a.itype || a.kind); }
  if (!a.team && a.kind === 'food' && a.caste === 'harvester' && GRAIN[a.itype] && roomLevel(s, 'granary') >= 3) a.carry = Math.round(a.carry*1.5); // ant bread
  if (a.kind === 'food'){ const put = Math.min(Math.max(0, c.cap - c.store), a.carry); c.store += put; c.delivered[0] += put; if (!a.team){ c.foodTotal += put; if (c.store > (c.storePeak || 0)) c.storePeak = c.store;  if (a.isPlayer && put < a.carry) s.player.msg = put ? 'That filled the store. Spend food on eggs: Nest, then tap the queen.' : 'The store is full: this food is wasted. Spend some on eggs (Nest, then tap the queen), or build a Food store.'; }
    // Honeydew and bits of sweets are sugar too (build 18).
    if (!a.team && a.carry && a.itype === 'aphids') addSugar(s, (has(s, 'aphids') ? 3 : 1)*(prizeFx(s, a.ireg) === 'aphids' ? 2 : 1));
    else if (!a.team && a.carry && FOODS[a.itype] && FOODS[a.itype].sweet) addSugar(s, Math.ceil(a.carry*0.3)); }
  else if (a.kind === 'brood'){ if (!a.team){ const per = qtrait(s, 'nations') ? 2 : 1; for (let i = 0; i < a.carry*per; i++){ if (antCount(s) < queenCap(s.queen.level, s)){ const n = mkAnt(s, has(s, 'warcamp') ? 'soldier' : 'forager', 'in', c.ex, c.ey, 0); if (qtrait(s, 'nations') && n) n.xp = Math.max(n.xp || 0, RANKS[2].xp); } else c.protein += 3; } c.captured = (c.captured || 0) + a.carry; if (!s.seen.pupae){ s.seen.pupae = true; s.player.msg = 'Stolen pupae hatch in your nest as your own ants.'; } } }
  else if (a.kind === 'water') c.water = Math.min(c.waterCap, c.water + a.carry);
  else if (a.kind === 'protein'){ c.protein += a.carry; if (!a.team && CHITIN_OF[a.itype]) addChitin(s, CHITIN_OF[a.itype]*(prizeFx(s, a.ireg) === 'chitin' ? 2 : 1)); }
  else if (a.kind === 'chitin'){ if (!a.team) addChitin(s, a.carry); }
  else if (a.kind === 'grit') c.grit += a.carry;
  else if (a.kind === 'wood'){ if (!a.team){ c.wood = (c.wood || 0) + a.carry; if (!c.found.wood){ c.found.wood = true; s.events.push('wood'); } } }
  else if (a.kind === 'leaf'){ if (!a.team) c.fungus = Math.min(fungusCap(s) || 60, (c.fungus || 0) + a.carry); }
  a.carry = 0;
}
function addSugar(s, n){ const c = s.colony; c.sugar += n; c.sugarTotal += n; if (!c.found.sugar){ c.found.sugar = true; s.events.push('sugar'); } }
function addChitin(s, n){ const c = s.colony; c.chitin += n; c.chitinTotal += n; if (!c.found.chitin){ c.found.chitin = true; s.events.push('chitin'); } }
function killAnt(s, a, cause){
  if (a.state === 'dead') return;
  // Build 30: with the Old Robin's feather, birds never take your ants.
  if (cause === 'bird' && !a.team && s.colony.trophies.feather){ a.hp = Math.max(a.hp, 1); a.flee = 2; return; }
  if (a.isPlayer && a.feign > s.t && cause !== 'starved' && cause !== 'hunger'){ a.hp = Math.max(a.hp, 1); return; } // build 32: playing dead
  // Build 31: with Old Warty's poison, toads, birds and spiders spit out half the ants they catch.
  if ((cause === 'toad' || cause === 'bird' || cause === 'spider') && !a.team && s.colony.trophies.poison && Math.random() < 0.5){ a.hp = Math.max(a.hp, 1); a.flee = 2; a.state = a.state === 'away' ? 'return' : a.state; return; }
  // A Dodger slips the first foot, beak or acorn.
  if (!a.dodged && (cause === 'foot' || cause === 'bird' || cause === 'acorn' || cause === 'toad') && (promo(s, a, 'dodger') || (!a.team && a.caste === 'forager' && roomOf(s, 'armory')))){ a.dodged = true; a.flee = 2; return; }
  // Survivor: once a life, a killing blow leaves your ant at 1 health.
  if (a.isPlayer && !a.survived && picked(s, 'you', 'survivor')){ a.survived = true; a.hp = 1; s.player.hit = s.t; s.player.msg = 'That should have killed you. Get home!'; return; }
  // Infirmary III (build 23): medics carry the fallen home; 1 in 4 near the nest is saved.
  if (!a.team && !a.isPlayer && cause !== 'starved' && cause !== 'hunger' && cause !== 'nomeat' && cause !== 'culled' && cause !== 'cordyceps' && !a.zombie && roomLevel(s, 'infirmary') >= 3 && roomOf(s, 'infirmary') && a.x != null && Math.hypot(a.x/T - s.colony.ex, a.y/T - s.colony.ey) < 24 && s.ants.some(o => !o.team && o.caste === 'medic' && o.state === 'in') && Math.random() < 0.25){
    a.hp = 1; a.carry = 0; a.follow = false; a.infect = null; enterNest(s, a); s.colony.saved = (s.colony.saved || 0) + 1; if (s.colony.saved === 1) s.player.msg = 'Your medics carried a fallen ant home and saved it.'; return; }
  a.state = 'dead';
  if (!a.team && a.name){ const f = s.colony.fallen; f.unshift({ name: a.name, title: a.title || '', caste: a.caste, rank: rankOf(a), cause, t: Math.round(s.t), you: !!a.isPlayer }); if (f.length > 30) f.pop(); }
  if (a.isPlayer){ const P = s.player; if (P.big){ P.big.carried = false; P.big = null; } P.ant = null; P.pending = true; P.path = null; P.died = s.t; P.deathCause = cause; P.msg = ({ spider: 'The spider got you.', rival: 'A rival soldier got you.', antlion: 'An antlion dragged you under.', mower: 'The mower got you.', foot: 'A foot came down on you.', bird: 'A robin snapped you up.', toad: 'The toad\'s tongue got you.', acorn: 'An acorn fell on you.', spray: 'The bug spray got you.', fireants: 'Fire ants stung you to death.', earwig: 'An earwig pinched you to death.', hornworm: 'The hornworm crushed you.', beetle: 'The ground beetle got you.', mantis: 'The mantis caught you.', widow: 'The black widow bit you.', centipede: 'The centipede got you.', jumper: 'A jumping spider got you.', assassin: 'An assassin bug got you.', wasp: 'A hunting wasp got you.', skink: 'The skink got you.' }[cause] || 'You starved.') + ' Your crew scatters. Waiting for the next hatchling.'; }
  if (!a.team){ const i = idx(Math.min(W-1,Math.max(0,Math.floor(a.x/T))), Math.min(H-1,Math.max(0,Math.floor(a.y/T)))); s.alarm[i] += 3; s.hot.add(i); }
  const c = colonyOf(s, a); c.deaths[cause] = (c.deaths[cause]||0) + 1;
  // Build 40: undertakers carry the dead home to the midden: each of your ants dying near the nest gives back food.
  if (!a.team && !a.isPlayer && !a.zombie && a.x != null && Math.hypot(a.x/T - c.ex, a.y/T - c.ey) < 24 && roomOf(s, 'midden') && workers(s, 'undertaker', 'tidy', 'midden', 3)){ c.store = Math.min(c.cap, c.store + 2); c.recycled = (c.recycled || 0) + 2; if (!s.seen.recycled){ s.seen.recycled = true; s.player.msg = 'Your undertakers carried a fallen ant to the midden: nothing is wasted (+2 food).'; } }
  // Build 24. A rival killed near its own nest: the War camp loots its food; Brood raiding brings back its brood.
  if (a.team && cause === 'war' && Math.hypot(a.x/T - colonyOf(s, a).ex, a.y/T - colonyOf(s, a).ey) < 18){ // (build 40: any rival's nest, not only the pavement ants')
    if (has(s, 'warcamp')){ const x = Math.floor(a.x/T), y = Math.floor(a.y/T); if (!itemAt(s, x, y)) s.items.push({ x, y, kind: 'food', type: 'crumb', amt: 5 }); }
    if (has(s, 'broodraid') && Math.random() < 0.2 && antCount(s) < queenCap(s.queen.level, s)){ mkAnt(s, 'forager', 'in', s.world.ex, s.world.ey, 0); s.colony.captured = (s.colony.captured || 0) + 1; if (s.colony.captured === 1) s.player.msg = 'Your raiders carried home rival brood. It hatched as one of yours.'; }
  }
  // An Exploder bursts when it dies fighting: every enemy within 2 tiles takes a heavy hit.
  if (!a.team && a.caste === 'exploder' && a.x != null){
    for (const o of s.ants) if (o.team && o.state !== 'dead' && Math.hypot(o.x - a.x, o.y - a.y) < 2*T){ o.hp -= 8; if (o.hp <= 0) killAnt(s, o, 'war'); }
    for (const b of s.critters) if (Math.hypot(b.x - a.x, b.y - a.y) < 2*T) b.hp -= 8;
    if (s.spider && Math.hypot(s.spider.x - a.x, s.spider.y - a.y) < 2.5*T) s.spider.hp -= 10;
    if (s.cat && Math.hypot(s.cat.x - a.x, s.cat.y - a.y) < 2.5*T) s.cat.hp -= 8;
    spark(s, a, a.x, a.y, 0);
  }
}
function payCost(c, cost){ if (!canPay(c, cost)) return false; for (const k in cost){ if (k==='food'){ const short = Math.max(0, cost[k] - c.store); c.store -= cost[k] - short; if (short) c.sugar -= short; } else c[k] -= cost[k]; } return true; }
// Materials a colony doesn't have yet (sugar, chitin, wood) count as none.
function canPay(c, cost){ for (const k in cost){ const have = (k==='food' ? c.store + (c.evo && c.evo.honeyeco ? Math.max(0, (c.sugar || 0) - (cost.sugar || 0)) : 0) : c[k]) || 0; if (have < cost[k]) return false; } return true; }
function costText(cost){ return Object.entries(cost).map(([k,v]) => v+' '+k).join(' · ') || 'free'; }

// ---------- growth: genes, ranks, ant upgrades, evolution (build 12) ----------
const has = (s, key) => !!s.colony.evo[key];
// An ant type's level: foragers' first three are the old training (c.forage).
const lvl = (s, caste) => caste === 'forager' ? (s.colony.forage || 0) : (s.colony.up[caste] || 0);
const picked = (s, caste, key) => Object.values(s.colony.picks[caste] || {}).includes(key);
function gainGenes(s, n, why){ const c = s.colony; c.genes += n; c.genesTotal += n; s.events.push('genes'); if (!s.player.msg || /🧬/.test(s.player.msg)) s.player.msg = `+${n} 🧬 Gene${n > 1 ? 's' : ''}: ${why}.`; }
// Each ant type learns the promotions its doctrine names: Veterans the first, Elites the second too.
function doctrineOf(s, caste){ const d = s.colony.doctrine[caste], L = PROMOS[FAMILY[caste]] || []; return [ (d && d[0]) || (L[0] && L[0][0]), (d && d[1]) || (L[1] && L[1][0]) ]; }
function promo(s, a, key){ if (a.team) return false; const r = rankOf(a); if (r < 2) return false; const d = doctrineOf(s, a.caste); return d[0] === key || (r >= 3 && d[1] === key); }
const jobMul = a => a.team ? 1 : RANKS[rankOf(a)].mul;
function gainXp(s, a, n){
  if (!a || a.team || a.state === 'dead') return;
  const before = rankOf(a); a.xp = (a.xp || 0) + n * (has(s, 'division') ? 1.25 : 1);
  const r = rankOf(a); if (r > before) rankUp(s, a, r);
}
function nameAnt(s, a){ if (a.name) return; const c = s.colony, i = c.named++; a.name = NAMES[i % NAMES.length] + (i >= NAMES.length ? ' ' + (Math.floor(i / NAMES.length) + 1) : ''); }
function rankUp(s, a, r){
  const P = s.player, who = a.isPlayer ? 'You are' : null;
  if (r === 2 && !s.seen.veteran) s.events.push('veteran');
  if (r >= 3) nameAnt(s, a);
  if (r === 3 && !P.msg) P.msg = who ? `${who} an Elite now: ${a.name}.` : `${a.name} the ${CASTES[a.caste].name} is now an Elite.`;
  if (r === 4){ a.title = a.title || ({ forager: 'Long-Legs', builder: 'the Tireless', nurse: 'the Gentle' }[a.caste] || 'the Unbroken'); P.msg = `${a.name} ${a.title} is a Legend!`; }
}
// A boss's killing bite makes a Legend.
function makeLegend(s, a, title){ nameAnt(s, a); a.legend = true; a.title = title; if (rankOf(a) === 4) { s.player.msg = `${a.name} ${title} is a Legend!`; } }
function maxHp(s, a){ const C = CASTES[a.caste]; if (a.team) return C.hp; let h = C.hp; if (a.caste === 'soldier' && lvl(s, 'soldier') >= 1) h *= 1.3; if (a.caste === 'soldier' && lvl(s, 'soldier') >= 4) h *= 1.5; if (a.caste === 'venom' && lvl(s, 'venom') >= 2) h *= 1.3;
  if (has(s, 'cuticle')) h *= 1.5; if (qtrait(s, 'matriarch')) h *= 1.1; if ((s.colony.prizes || {}).fossil) h *= 1.1; if (s.colony.trophies.shell && roomOf(s, 'armory')) h *= 1.5; return h; }
// How hard an ant bites: its kind, rank, upgrades, evolution and promotions.
function bite(s, a, vs){
  const C = CASTES[a.caste]; let f = C.fight; if (a.champion) return f*2; if (a.team) return f*rspec(a).bite*(has(s, 'propaganda') ? 0.75 : 1);
  f *= jobMul(a);
  if (has(s, 'mandibles') && C.fight >= 3) f *= 1.25;
  if (s.colony.lineage === 'trapjaw' && C.fight >= 3) f *= 1.4;
  if (s.colony.lineage === 'acid' && vs && !vs.caste) f *= 1.5;
  if (a.caste === 'soldier' && lvl(s, 'soldier') >= 2) f *= 1.25;
  if (a.caste === 'venom' && lvl(s, 'venom') >= 1) f *= 1.25;
  if (promo(s, a, 'brawler')) f *= 1.2;
  if (promo(s, a, 'guard') && Math.hypot(a.tx - s.colony.ex, a.ty - s.colony.ey) < 8) f *= 1.5;
  if (promo(s, a, 'hunter') && (vs === 'spider' || vs === 'cat' || vs === 'bug' || vs === 'boss')) f *= 1.5;
  if (C.fight >= 3 && setDone(s, 'hunter')) f *= 1.1;
  if (a.follow && picked(s, 'you', 'hero')) f *= 1.2;
  // Build 18: the sugar and chitin levels.
  if (a.caste === 'venom' && lvl(s, 'venom') >= 3) f *= 1.3;
  if (C.fight >= 3 && (picked(s, 'soldier', 'phalanx') || picked(s, 'soldier', 'warlord'))){ let n = 0; for (const o of s.ants) if (o !== a && !o.team && CASTES[o.caste].fight >= 3 && outside(o) && Math.abs(o.tx - a.tx) <= 3 && Math.abs(o.ty - a.ty) <= 3 && ++n >= 2) break;
    if (n >= 2 && picked(s, 'soldier', 'phalanx')) f *= 1.5; if (n >= 1 && picked(s, 'soldier', 'warlord')) f *= 1.3; }
  if (s.colony.trophies.mandible) f *= 1.15;
  if (a.frenzy > s.t) f *= 1.3; // build 32: Alarm call
  return f;
}
// Fighters reach two tiles with Formic spray.
const reachOf = (s, a) => !a.team && CASTES[a.caste].fight >= 3 && has(s, 'formic') ? 2 : 1;
// Walking pace outdoors: rank (for gatherers), trails, upgrades, promotions.
function paceOf(s, a, base){
  if (a.team) return base*(a.stunned > s.t ? 0 : 1);
  if (s.colony.kills.mantis && HEDGE_ZONE.has(AREAS[s.world.area[idx(Math.max(0, Math.min(W-1, a.tx)), Math.max(0, Math.min(H-1, a.ty)))]].key)) base *= 1.5; // build 34: the hedge is yours
  if (a.frenzy > s.t) base *= 1.25;
  let v = base; if (FAMILY[a.caste] === 'gather') v *= jobMul(a);
  const onTrail = s.trail[idx(Math.max(0, Math.min(W-1, a.tx)), Math.max(0, Math.min(H-1, a.ty)))] >= 0.3;
  if (onTrail && has(s, 'trailrunners')) v *= 1.25;
  if (onTrail && has(s, 'highways')) v *= 1.3;
  if (onTrail && picked(s, 'forager', 'trailqueen')) v *= 1.4;
  if (a.caste === 'soldier' && lvl(s, 'soldier') >= 3) v *= 1.2;
  if (onTrail && promo(s, a, 'trailwise')) v *= 1.2;
  if (!onTrail && a.caste === 'forager' && picked(s, 'forager', 'sprinter')) v *= 1.25;
  if (promo(s, a, 'skirmisher')) v *= 1.2;
  if (s.event && s.event.key === 'heat' && !has(s, 'heat')) v *= 0.85;
  return v;
}
// Build 22.1: 6 (was 5), to make up for everyone walking 6% slower.
const GRAIN = { seed: 1, crumb: 1, popcorn: 1 };
const carryCap = (s, a, f) => (!a.team && a.caste === 'harvester' && f && GRAIN[f.type] ? 2 : 1)*5 + (promo(s, a, 'strongback') ? 1 : 0) + (!a.team && setDone(s, 'garden') ? 1 : 0) + (!a.team && has(s, 'bigcrop') ? 3 : 0) + (!a.team && a.caste === 'forager' && (s.colony.forage || 0) >= 4 ? 2 : 0);
const sightOf = (s, a) => 7 + (!a.team && has(s, 'lookout') ? 3 : 0) + (!a.team && a.caste === 'forager' && picked(s, 'forager', 'pathfinder') ? 7 : 0) + (promo(s, a, 'keen') ? 4 : 0);
const chewsTreats = (s, a) => !a.team && a.caste === 'forager' && picked(s, 'forager', 'hauler');
const crewCap = s => has(s, 'warcolumns') ? 60 : has(s, 'crews2') ? 45 : has(s, 'crews') ? 30 : 20;
// A builder's share of a job (d dig, f fill, r repair, j room).
function workOf(s, a, kind){
  let m = jobMul(a); const L = lvl(s, 'builder');
  if (kind !== 'j' && L >= 1) m *= 1.3;
  if (kind === 'j' && L >= 3) m *= 1.5;
  if (kind === 'j' && setDone(s, 'builder')) m *= 1.25;
  if (kind === 'j' && s.colony.trophies.silk) m *= 2;
  if (kind === 'd' && picked(s, 'builder', 'excavator')) m *= 1.5;
  if (kind === 'd' && L >= 4) m *= 2; // build 40: level IV, "digs any soil 2x faster"
  if (picked(s, 'builder', 'foreman')) m *= 1.5; // build 40: Foreman
  if (has(s, 'workshop3')) m *= 1.5;
  if (kind === 'd' && promo(s, a, 'quick')) m *= 1.25;
  if (kind === 'r' && (picked(s, 'builder', 'engineer') || promo(s, a, 'fixer'))) m *= 2;
  return m;
}
// Build 42: depth bands. Warm topsoil hatches eggs faster; dry packed soil and clay keep stores;
// the cool wet depths suit the cistern and the fungus garden. The fraction of a kind's rooms in its band.
const roomTier = r => soilTier(r.y0 + r.h - 1);
const BAND_GOOD = { hatchery: [0], nursery: [0], store: [1, 2], granary: [1, 2], cistern: [2, 3], fungus: [2, 3] };
const BAND_TEXT = { hatchery: 'warm topsoil: eggs hatch 10% faster', nursery: 'warm topsoil: eggs hatch 10% faster', store: 'dry packed soil or clay: holds 25% more', granary: 'dry packed soil or clay: holds 25% more', cistern: 'cool clay or deep rock: holds 50% more', fungus: 'cool clay or deep rock: grows 25% more' };
function inBand(s, key){ const rs = s.nest.rooms.filter(r => r.key === key); if (!rs.length) return 0; return rs.filter(r => BAND_GOOD[key].includes(roomTier(r))).length/rs.length; }
const storeCap = s => { const n = roomCount(s, 'store'), g = roomCount(s, 'granary'); return (n ? Math.round((has(s, 'store3') ? 1000 : has(s, 'store2') ? 400 : 150)*(1 + 0.5*(n - 1))*(1 + 0.25*inBand(s, 'store'))) : 20) + Math.round(g*(100 + (roomLevel(s, 'granary') >= 2 ? 150 : 0))*(1 + 0.25*inBand(s, 'granary'))) + repleteCap(s) + (has(s, 'shared') ? 50*s.outposts.filter(o => o.done).length : 0); };
// Repletes at work in the Honeypot vault (build 24): each a living jar.
function repleteCap(s){ if (!roomOf(s, 'honeypot')) return 0; return workers(s, 'replete', 'hang', 'honeypot', 4)*(roomLevel(s, 'honeypot') >= 2 ? 60 : 40); }
const hatchCapOf = s => { const n = roomCount(s, 'hatchery'); return 1 + (has(s, 'polygyny') ? 2 : 0) + (n ? 2*n + (has(s, 'hatchery2') ? 1 : 0) + (has(s, 'hatchery3') ? 1 : 0) : 0); };
function eggCost(s, caste){
  const cost = Object.assign({}, CASTES[(caste === 'soldier' || caste === 'venom') && picked(s, 'nurse', 'shaper') ? 'forager' : caste].cost);
  let k = 1; if (picked(s, 'nurse', 'wetnurse')) k *= 0.7; if (has(s, 'brood')) k *= 0.75; if (qtrait(s, 'broodmother')) k *= 0.7;
  if (cost.food) cost.food = Math.ceil(cost.food * k); if (cost.protein && k < 1) cost.protein = Math.ceil(cost.protein * Math.max(k, 0.7)); return cost; }
function roomCost(s, key, nth){
  const arch = has(s, 'workshop3') ? 0.8 : 1;
  // nth: which copy (0 the first); by default the next one you'd build.
  const n = nth != null ? nth : roomCount(s, key) + s.colony.buildQueue.filter(j => j.room === key).length, k = (1 + 0.5*n)*arch;
  const cost = {}; for (const x in ROOMS[key].cost) cost[x] = Math.ceil(ROOMS[key].cost[x]*k);
  if (picked(s, 'builder', 'mason') && cost.grit) cost.grit = Math.ceil(cost.grit * 0.75); return cost; }
// Buy an ant type's next level; a level with picks needs one of them.
function upgradeLock(s, caste){ return caste === 'forager' || caste === 'builder' || caste === 'you' ? '' : eggLock(s, caste); }
// Your ant (build 14): pace, health, bite and carry from the You levels.
const youL = s => s.colony.up.you || 0;
// Build 22.1 (Mark: "he moves a little too fast at the beginning"): a slower start, won back by the You levels.
const youPace = s => 50*(1 + (youL(s) >= 1 ? 0.25 : 0) + (youL(s) >= 4 ? 0.25 : 0) + (picked(s, 'you', 'sprint') ? 0.1 : 0));
const youHp = s => youL(s) >= 2 ? 20 : 12;
function upgradeCaste(s, caste, pick){
  const c = s.colony, L = UPGRADES[caste]; if (!L || upgradeLock(s, caste)) return false;
  const n = lvl(s, caste), U = L[n]; if (!U) return false;
  if (U.picks && !U.picks.some(p => p[0] === pick)) return false;
  if (!payCost(c, U.cost)) return false;
  if (caste === 'forager') c.forage = n + 1; else c.up[caste] = n + 1;
  if (U.picks) (c.picks[caste] = c.picks[caste] || {})[n + 1] = pick;
  for (const a of s.ants) if (!a.team && a.caste === caste) a.hp = Math.max(a.hp, maxHp(s, a));
  if (caste === 'you' && s.player.ant) s.player.ant.hp = Math.max(s.player.ant.hp, youHp(s));
  return true;
}
// Evolution: why a node can't be bought ('' if it can).
function evoLock(s, key){
  const n = EVO_BY[key], c = s.colony; if (!n) return 'unknown';
  if (c.evo[key]) return 'owned';
  if (n.soon) return 'coming in a later build';
  if (n.after && !c.evo[n.after]) return 'needs ' + EVO_BY[n.after].name + ' first';
  if (n.need && !roomOf(s, n.need)) return 'needs a ' + ROOMS[n.need].name;
  return '';
}
function buyEvo(s, key){
  if (evoLock(s, key)) return false; const c = s.colony;
  if (!payCost(c, evoCost(s, EVO_BY[key]))) return false;
  c.evo[key] = true; c.cap = storeCap(s); c.hatchCap = hatchCapOf(s);
  if (key === 'waypoints'){ s.player.msg = 'Outposts unlocked! Walk far from the nest and press Outpost on the bottom bar.'; s.events.push('waypoints'); }
  return true;
}
function setDoctrine(s, caste, slot, key){ const L = PROMOS[FAMILY[caste]]; if (!L || !L.some(p => p[0] === key)) return false; const d = doctrineOf(s, caste); d[slot] = key; if (d[0] === d[1]) d[1 - slot] = L.find(p => p[0] !== key)[0]; s.colony.doctrine[caste] = d; return true; }
function pickQueenTrait(s, level, key){ const c = s.colony, Q = QUEEN_TRAITS.find(q => q.level === level); if (!Q || s.queen.level < level || c.qtraits[level] || !Q.picks.some(p => p[0] === key)) return false; c.qtraits[level] = key; return true; }
const qtrait = (s, key) => Object.values(s.colony.qtraits).includes(key);
// Reborn as one of your named ants: you take it over where it is.
function possess(s, id){
  const P = s.player, a = s.ants.find(o => o.id === id && !o.team && o.state !== 'dead' && !o.isPlayer);
  if (!a || P.ant || !P.pending || rankOf(a) < 3) return false;
  a.isPlayer = true; a.follow = false; a.task = null; a.taskCell = null; a.goal = null; a.exitTo = null; a.carry = 0; a.hp = Math.max(a.hp, youHp(s));
  // Build 47: a daughter's veteran becomes yours alone, and steps out of her door, not the main nest's.
  const dd = daughterOf(s, a); a.dh = null;
  if (dd && (a.state === 'in' || a.state === 'build')){ a.state = 'player'; a.tx = dd.ex; a.ty = dd.ey; a.x = (dd.ex + 0.5)*T; a.y = (dd.ey + 0.5)*T; }
  const inside = a.state === 'in' || a.state === 'build' || a.state === 'nest';
  P.ant = a; P.pending = false; P.hunger = 100; P.tx = null; P.ntx = null; P.inNest = inside; a.state = inside ? 'nest' : 'player';
  const qi = s.colony.eggQueue.indexOf('forager'); if (qi >= 0 && !s.colony.eggs.length) s.colony.eggQueue.splice(qi, 1);
  P.msg = `You are ${a.name}${a.title ? ' ' + a.title : ''}, ${RANKS[rankOf(a)].name} ${CASTES[a.caste].name}.`;
  return true;
}
// A trail from where a kill fell back to the nest, for the haulers.
function trailHome(s, x, y){
  const w = s.world, path = findPath(s, Math.floor(x/T), Math.floor(y/T), w.ex, w.ey); let px = Math.floor(x/T), py = Math.floor(y/T);
  for (const [qx, qy] of path){ const n = Math.max(1, Math.ceil(Math.hypot(qx - px, qy - py))); for (let k = 0; k <= n; k++){ const i = idx(Math.round(px + (qx - px)*k/n), Math.round(py + (qy - py)*k/n)); s.trail[i] = Math.max(s.trail[i], 2.5); s.hot.add(i); } px = qx; py = qy; }
}
// Paralytic venom: stung prey slows to half speed for a while.
function stingSlow(s, a, prey){ if (prey && !a.team && ((a.caste === 'venom' && picked(s, 'venom', 'paralytic')) || (s.colony.lineage === 'bullet' && CASTES[a.caste].fight >= 3))) prey.slowT = 2; }
// ---------- outposts and held regions (build 13) ----------
// Cairns you raise far from home. s.outposts: [{ id, x, y, region, work, done, hp }].
// s.reachMask: tiles foragers may roam (round an outpost, and along the road
// back to the nest); s.keepMask: tiles whose trails never fade.
const prizeFx = (s, ai) => s.colony.held[ai] ? prizeOf(AREAS[ai].key).fx : null;
const heldFx = (s, fx) => { for (const i in s.colony.held) if (prizeOf(AREAS[i].key) && prizeOf(AREAS[i].key).fx === fx) return true; return false; };
const setDone = (s, set) => !!s.colony.goals.sets[set];
function outpostCap(s){ return 2 + s.queen.level + (setDone(s, 'explorer') ? 1 : 0); }
// Why an outpost can't go here ('' if it can).
function outpostLock(s){
  const P = s.player, a = P.ant, c = s.colony;
  if (!has(s, 'waypoints')) return 'needs Waypoints (Evolve)';
  if (!a || P.inNest) return 'go outside';
  const ai = areaOf(s, a.tx, a.ty);
  if (GUARDIANS[AREAS[ai].key] && AREAS[ai].key.startsWith('fire')) return 'the fire ants won’t allow it';
  if (Math.hypot(a.tx - c.ex, a.ty - c.ey) < OUTPOST.spacing) return 'too close to the nest';
  if (s.outposts.some(o => Math.hypot(a.tx - o.x, a.ty - o.y) < OUTPOST.spacing)) return 'too close to another outpost';
  if (s.outposts.length >= outpostCap(s)) return `at most ${outpostCap(s)} outposts (more with queen levels)`;
  if (!canPay(c, OUTPOST.cost)) return 'needs 10 stone';
  return '';
}
function placeOutpost(s){
  if (outpostLock(s)) return false; const a = s.player.ant;
  payCost(s.colony, OUTPOST.cost);
  s.outposts.push({ id: s.nextId++, x: a.tx, y: a.ty, region: areaOf(s, a.tx, a.ty), work: 0, done: false, hp: OUTPOST.hp });
  s.player.msg = 'Outpost started. Stay close: you and your crew pile the pebbles.';
  return true;
}
function addOutpost(s, x, y, done){ const o = { id: s.nextId++, x, y, region: areaOf(s, x, y), work: done ? OUTPOST.work : 0, done: !!done, hp: OUTPOST.hp }; s.outposts.push(o); if (done) outpostsChanged(s); return o; }
function outpostsChanged(s){
  const reach = new Uint8Array(W*H), keep = new Uint8Array(W*H), w = s.world;
  const disc = (m, cx, cy, r) => { for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H-1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W-1, Math.ceil(cx + r)); x++) if ((x-cx)*(x-cx) + (y-cy)*(y-cy) <= r*r) m[idx(x,y)] = 1; };
  for (const o of s.outposts){ if (!o.done) continue;
    disc(reach, o.x, o.y, OUTPOST.reach); disc(keep, o.x, o.y, OUTPOST.keep);
    // The road home: a band along the walk from the outpost to the nest.
    let px = o.x, py = o.y;
    for (const [qx, qy] of findPath(s, o.x, o.y, w.ex, w.ey)){ const n = Math.max(1, Math.ceil(Math.hypot(qx - px, qy - py))); for (let k = 0; k <= n; k++) disc(reach, px + (qx - px)*k/n, py + (qy - py)*k/n, OUTPOST.road); px = qx; py = qy; } }
  s.reachMask = reach; s.keepMask = keep;
}
function tickOutposts(s, dt){
  const c = s.colony, P = s.player;
  for (const o of s.outposts){
    if (o.done) continue;
    // You and any of your ants close by pile the pebbles.
    let n = 0; for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x/T - o.x - 0.5, a.y/T - o.y - 0.5) < 3) n++;
    o.work += n*dt;
    if (o.work >= OUTPOST.work){ o.done = true; reveal(s, o.x, o.y, OUTPOST.see); outpostsChanged(s); s.events.push('outpost'); P.msg = `Outpost raised in ${AREAS[o.region].name.replace(/^The /, 'the ')}. Foragers range from here now.`; }
  }
  // Holding: an outpost in the region, its guardian beaten.
  s.holdT = (s.holdT || 0) + dt; if (s.holdT < 1) return; s.holdT = 0;
  const now = {};
  for (const o of s.outposts){ if (!o.done) continue; const A = AREAS[o.region], G = GUARDIANS[A.key]; if (A.key === 'rock' || (G && !G[1](s))) continue; now[o.region] = true; }
  for (const i in now) if (!c.held[i]){ c.held[i] = true; const A = AREAS[i]; gainGenes(s, 1, 'holding ' + A.name.replace(/^The /, 'the ')); s.events.push('held'); P.msg = `You hold ${A.name.replace(/^The /, 'the ')}! Prize: ${prizeOf(A.key).text.replace(/^./, ch => ch.toLowerCase())}.`; if (prizeFx(s, i) === 'water') c.waterCap = waterCapOf(s); }
  for (const i in c.held) if (!now[i]){ delete c.held[i]; P.msg = `You lost your hold on ${AREAS[i].name.replace(/^The /, 'the ')}.`; c.waterCap = waterCapOf(s); }
}
// An outpost knocked about by a foot or flattened by the mower.
function hitOutpost(s, o, dmg){ o.hp -= dmg; if (o.hp > 0) return; s.outposts.splice(s.outposts.indexOf(o), 1); outpostsChanged(s); s.player.msg = `An outpost in ${AREAS[o.region].name.replace(/^The /, 'the ')} was knocked flat.`; s.events.push('outpostlost'); }
const deathTotal = c => Object.values(c.deaths).reduce((t, n) => t + n, 0);
const waterCapOf = s => { const n = roomCount(s, 'cistern'); return (n ? Math.round((60 + 30*(n - 1))*(1 + 0.5*inBand(s, 'cistern'))) : 10) + (heldFx(s, 'water') ? 40 : 0); };
// ---------- the goals board ----------
function tickGoals(s, dt){
  s.goalT = (s.goalT || 0) + dt; if (s.goalT < 1 || !s.queen.placed) return; s.goalT = 0;
  const c = s.colony, G = c.goals;
  for (let pass = 0; pass < 3; pass++){
    let any = false;
    for (const g of goalBoard(s)){ if (!g || g.n(s) < g.of) continue;
      G.done[g.key] = true; any = true; gainGenes(s, TIERS[g.tier].genes, 'goal done: ' + g.text.toLowerCase()); s.events.push('goal');
      const set = SETS[g.set]; if (!G.sets[g.set] && GOALS.filter(x => x.set === g.set).every(x => G.done[x.key])){ G.sets[g.set] = true; s.player.msg = `${set.name} goals all done! For good: ${set.reward.toLowerCase()}.`; } }
    if (!any) break;
  }
}
const FOUND_NAME = { dew: 'dew', puddle: 'puddle water', pebble: 'a pebble', spider: 'spider meat', cat: 'caterpillar meat', ladybug: 'a ladybug', alate: 'a winged queen', boss: 'boss meat', earwig: 'earwig meat', cricket: 'cricket meat', millipede: 'millipede meat', dirt: null };
function discover(s, type){
  const c = s.colony; if (!type || c.found[type] || FOUND_NAME[type] === null) return; c.found[type] = true;
  const nm = FOUND_NAME[type] || (FOODS[type] ? FOODS[type].name : type); gainGenes(s, 1, 'first ' + nm + ' brought home');
}

// ---------- main tick ----------
// ---------- build 43: day and night ----------
// A day and its night last ten minutes: dawn, about six minutes of day, dusk, nearly three of night.
const DAY = 600;
const dayPhase = s => (((s.dayT || 0) % DAY) + DAY) % DAY/DAY;
function daylight(s){ const p = dayPhase(s); if (p < 0.04) return 0.5 + p/0.04*0.5; if (p < 0.62) return 1; if (p < 0.68) return 1 - (p - 0.62)/0.06; if (p < 0.96) return 0; return (p - 0.96)/0.04*0.5; }
const isNight = s => daylight(s) < 0.35;
// Seconds until the light next turns (night falls, or dawn).
function untilTurn(s){ const p = dayPhase(s); const at = p < 0.659 ? 0.659 : p < 0.988 ? 0.988 : 1.659; return Math.round((at - p)*DAY); } // (where isNight turns: daylight 0.35)
const DIURNAL = { jumper: 1, wasp: 1, skink: 1 }; // hunters that sleep at night
function tickDay(s, dt){
  s.dayT = (s.dayT ?? DAY*0.02) + dt; const night = isNight(s), P = s.player;
  if (s.nightNow === undefined) s.nightNow = night;
  if (night && !s.nightNow){ s.nightNow = true; s.nights = (s.nights || 0) + 1;
    if (s.nights <= 3) s.banner = { key: 'night' + s.nights, t: s.t, icon: '🌙', title: 'Night falls', line: 'The yard changes in the dark. Some things sleep. Others wake.', kind: 'event' }; s.events.push('night'); // (build 43.1: the first three nights only, and no spoilers)
    // Day hunters out on a kill let go and go to roost.
    for (const b of s.critters || []) if (DIURNAL[b.kind] && b.carry){ const a = s.ants.find(o => o.id === b.carry); if (a && a.state === 'away'){ a.state = 'return'; a.x = b.x; a.y = b.y; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); } b.carry = null; } }
  else if (!night && s.nightNow){ s.nightNow = false;
    if (s.queen.placed && s.nights === 1 && !s.colony.firstDawn){ s.colony.firstDawn = true; gainGenes(s, 1, 'your first night survived'); }
    if ((s.nights || 0) <= 3) s.banner = { key: 'dawn' + (s.nights || 0), t: s.t, icon: '🌅', title: 'Dawn', line: 'The yard stirs. Dew on the grass.', kind: 'gift' }; s.events.push('dawn');
    spawnDew(s, 2); }
}
function spawnDew(s, mul){ s.dew = true; s.dewTimer = 0; for (const [ai, n] of [[REGION.rock, 6], [REGION.lawn, 4], [REGION.flowerbed, 4], [REGION.clover, 3], [REGION.dandelions, 3]]) for (let i = 0; i < n*mul; i++) spawnInArea(s, ai, 'water', 'dew', 8); s.events.push('dew'); if (!s.player.msg) s.player.msg = mul > 1 ? 'Dawn dew: water all over the grass for a minute.' : 'Dew is out: water for a minute.'; }
function tick(s, dt){
  s.t += dt; const w = s.world, c = s.colony, P = s.player;
  // Messages fade after a while instead of sticking until the next one.
  if (P.msg !== s.msgSeen){ s.msgSeen = P.msg; s.msgAt = s.t; } else if (P.msg && P.ant && s.t - s.msgAt > 10) P.msg = '';
  while (s.hits.length && s.t - s.hits[0].t > 0.6) s.hits.shift();
  while (s.splashes.length && s.t - s.splashes[0].t > 0.9) s.splashes.shift();
  if (s.spiderCorpse && s.t - s.spiderCorpse.t > 6) s.spiderCorpse = null;
  if (s.catCorpse && s.t - s.catCorpse.t > 3) s.catCorpse = null;
  const td = Math.pow(0.5, dt/(s.rain && s.rain.on ? 4 : has(s, 'scent') ? 180 : 90)), ad = Math.pow(0.5, dt/8); const tr = s.trail, al = s.alarm;
  // Only tiles with scent on them decay (s.hot); the yard is too big to sweep.
  const keep = s.keepMask; for (const i of s.hot){ if (keep[i] && !(s.rain && s.rain.on)){ if (al[i] > 0.001) al[i] *= ad; else al[i] = 0; continue; } if (tr[i] > 0.001) tr[i] *= td; else tr[i] = 0; if (al[i] > 0.001) al[i] *= ad; else al[i] = 0; if (!tr[i] && !al[i]) s.hot.delete(i); }
  for (const col of [c, ...s.rivals]) if (!col.asleep) tickColony(s, col, dt);
  if (s.queen.placed) tickDaughters(s, dt);
  // A rival colony moves in at its time, or once you've done what brings it (build 25; see RIVALS).
  for (const r of s.rivals) if (r.asleep && s.queen.placed && RIVALS[r.team - 1].arrive(s)) wakeRival(s, r, true);
  // dew
  tickDay(s, dt);
  s.dewTimer += dt; if (!s.dew && s.dewTimer > 110 && !isNight(s)) spawnDew(s, 1); // (build 43: no dew at night; a heavy one at dawn)
  if (s.dew && s.dewTimer > 60){ s.dew = false; s.dewTimer = 0; s.items = s.items.filter(f => f.type !== 'dew'); }
  tickRain(s, dt); tickSplash(s, dt); tickMaintenance(s, dt);
  // Food grows back area by area at each area's own pace (yard.js), so the
  // ground near home runs thin and the rich food is far away.
  for (let i=0;i<AREAS.length;i++){ if (!s.active[i]) continue; const A = AREAS[i], pf = prizeFx(s, i); s.areaT[i] += dt*A.rate/60*(pf === 'food2' ? 2 : pf === 'food15' ? 1.5 : 1);
    if (s.areaT[i] >= 1){ s.areaT[i] -= 1; let n = 0; for (const f of s.items) if ((f.kind==='food'||f.kind==='protein') && f.amt > 0 && !f.max && w.area[idx(f.x,f.y)] === i) n++; if (n < A.max) spawnFood(s, i, s.t > 180); } }
  s.itemTimer += dt; if (s.itemTimer > 9){ s.itemTimer = 0;
    if (s.items.filter(f=>f.kind==='grit').length < 10) spawnInArea(s, Math.random() < 0.6 ? REGION.rock : REGION.woodpile, 'grit', 'pebble');
    // Build 23: twigs (🪵) on bark, mulch, leaves, hedges and round the Oak, once wood is wanted;
    // leaf pieces on green ground once a fungus garden stands.
    if (woodGoal(s) && s.items.filter(f => f.kind === 'wood').length < 8) spawnNear(s, 'wood', 'twig', () => true, WOOD_GROUND); // (blown onto the patio and lawn too)
    if (roomOf(s, 'fungus') && s.items.filter(f => f.kind === 'leaf').length < 10) spawnNear(s, 'leaf', 'leafbit', () => true, LEAF_GROUND);
    // Beetle shells (build 18): now and then in bark, compost, gravel and leaves; more in a held Woodpile.
    if (Math.random() < 0.25 && s.items.filter(f => f.kind === 'chitin').length < 5){ const opts = []; for (let i = 0; i < AREAS.length; i++) if (s.active[i] && SHELL_GROUND.test(AREAS[i].ground || '')) opts.push(i, ...(prizeFx(s, i) === 'chitin' ? [i, i] : [])); if (opts.length) spawnInArea(s, opts[Math.floor(Math.random()*opts.length)], 'chitin', 'shell'); }
    // Held stony regions turn up extra pebbles; held gardens' aphids refill twice as fast.
    for (const i in s.colony.held) if (prizeFx(s, i) === 'stone' && s.items.filter(f => f.kind === 'grit' && w.area[idx(f.x,f.y)] === +i).length < 6) spawnInArea(s, +i, 'grit', 'pebble');
    for (const f of s.items) if (f.max) f.amt = Math.min(f.max, f.amt + (f.type === 'aphids' && prizeFx(s, w.area[idx(f.x,f.y)]) === 'aphids' ? 6 : 3)); }
  // The Picnic Blanket held: a treat lands there every few minutes.
  for (const i in s.colony.held) if (prizeFx(s, i) === 'picnic'){ s.picnicT = (s.picnicT || 0) + dt; if (s.picnicT > 150 && !s.items.some(f => heavy(f) && w.area[idx(f.x,f.y)] === +i)){ s.picnicT = 0; const A = AREAS[i]; const it = spawnInArea(s, +i, 'food', A.treats ? A.treats[Math.floor(Math.random()*A.treats.length)] : 'cookie'); if (it && !P.msg) P.msg = `A ${FOODS[it.type].name} landed on the Picnic Blanket.`; } }
  s.items = s.items.filter(f => f.amt > 0 || f.max);
  tickMower(s, dt); tickPits(s, dt); tickStrikes(s, dt); tickStings(s, dt); tickAttack(s); tickZones(s, dt); tickOutposts(s, dt); tickGoals(s, dt);
  s.seenT += dt; if (s.seenT > 0.4){ s.seenT = 0; const pa = P.ant; if (pa && !P.inNest){ reveal(s, pa.x/T, pa.y/T, SEE.player); tickCurios(s, pa);
    // Walking into a dormant region wakes it: its food appears and starts to grow.
    const ai = w.area[idx(pa.tx, pa.ty)]; if (!s.active[ai]){ s.active[ai] = true; for (let k=0;k<AREAS[ai].start;k++) spawnFood(s, ai, false); populateBugs(s, ai); }
    if (!c.scouted[ai] && ai !== REGION.rock){ c.scouted[ai] = true; gainGenes(s, 1, 'scouting ' + AREAS[ai].name.replace(/^The /, 'the ')); } } }
  stepSpider(s, dt); if (!s.spider){ if (s.spiderAway){ s.spiderAway.t -= dt; if (s.spiderAway.t <= 0){ spiderEnter(s, s.spiderAway.hp); s.spiderAway = null; } } else { s.spiderRespawn -= dt; if (s.spiderRespawn <= 0){ spiderEnter(s, 150); s.spiderRespawn = 120; } } }
  stepBugs(s, dt); tickBosses(s, dt); tickDirector(s, dt);
  stepCat(s, dt); if (!s.cat){ s.catRespawn -= dt; if (s.catRespawn <= 0){ spawnCat(s); s.catRespawn = 90; } }
  // buckets for combat
  const buckets = new Map();
  for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest' || a.state==='away') continue; const k = a.ty*W + a.tx; let b = buckets.get(k); /* build 45: number keys, not strings */ if (!b) buckets.set(k, b = []); b.push(a); }
  // Fighters near the spider, per team: guards only take it on as a crew.
  const spiderCrew = [0, 0, 0, 0, 0, 0];
  if (s.spider) for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest' || a.state==='away') continue; if ((CASTES[a.caste].fight >= 3 || a.follow) && Math.hypot(a.x - s.spider.x, a.y - s.spider.y) < 4*T) spiderCrew[a.team]++; }
  duelGangs(s);
  const enemiesNear = (a, r) => { const out = []; for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++){ const xx = a.tx+dx; if (xx < 0 || xx >= W) continue; const b = buckets.get((a.ty+dy)*W + xx); if (b) for (const o of b) if (o.team !== a.team && o.state !== 'dead') out.push(o); } return out; };
  for (const a of s.ants){
    if (a.state === 'dead') continue;
    if (a.isPlayer){ stepPlayer(s, a, dt, enemiesNear); continue; }
    const C = CASTES[a.caste], col = colonyOf(s, a), home = homeOf(s, a);
    if (a.state === 'away') continue; // build 28: inside a rival nest on your raid
    if (a.state === 'in' || a.state === 'build' || a.state === 'nest'){ tickInside(s, a, dt); continue; }
    if (a.knockT > 0){ knock(s, a, dt); continue; }
    if (a.slowT > 0) a.slowT -= dt;
    if (a.state === 'zombie'){ stepZombie(s, a, dt); continue; }
    if (a.flee > 0) a.flee -= dt; else a.fleeFrom = null;
    const aggressive = C.fight >= 3 || a.follow || a.state === 'raid' || (a.team && (rspec(a).swarm || (rspec(a).fierce && Math.hypot(a.tx - col.ex, a.ty - col.ey) < 20)));
    // spider / enemies
    if (s.spider){ const sd = Math.hypot(a.x - s.spider.x, a.y - s.spider.y) * (s.spider.rest > 0 ? 2.5 : 1); // waiting at its web, it's hard to see
      const brave = a.follow || a.state === 'raid' || (a.state === 'fight' && a.goal === 'spider') || spiderCrew[a.team] >= 5;
      if (sd < (has(s, 'danger') && !aggressive ? 7 : 3.5)*T){ if (aggressive && brave){ if (a.state !== 'follow' && a.state !== 'raid' && a.state !== 'hold') a.state = 'fight'; a.goal = 'spider'; } else if (a.state !== 'fight'){ a.flee = 2; } } }
    const reach = reachOf(s, a), en = enemiesNear(a, aggressive ? reach : 2);
    if (a.burnT > 0){ a.burnT -= dt; a.hp -= dt/3; if (a.hp <= 0){ killAnt(s, a, 'fireants'); continue; } }
    if (!en.length) a.foeId = 0;
    if (en.length){
      // Rival soldiers fight half again as hard on their own doorstep.
      if (aggressive){ // build 27: a duel, one swing a round
        let o = a.foeId && en.find(q => q.id === a.foeId && Math.abs(q.tx-a.tx)<=reach && Math.abs(q.ty-a.ty)<=reach);
        if (!o){ o = en.find(q => Math.abs(q.tx-a.tx)<=reach && Math.abs(q.ty-a.ty)<=reach); a.foeId = o ? o.id : 0; if (o && !(a.rollT > 0)) a.rollT = Math.random()*DUEL_ROUND; }
        if (o && !stunned(s, a)){ a.rollT = (a.rollT || 0) - dt; if (a.rollT <= 0){ a.rollT += DUEL_ROUND; swing(s, a, o); } }
        if (a.state === 'explore' || a.state === 'return' || a.state === 'patrol') { a.state = 'fight'; a.goal = 'enemy'; } }
      else if (en.some(o => CASTES[o.caste].fight >= 3 || o.follow)){ a.flee = 2.5; }
    }
    // Build 27: mandibles locked, it can't move this round; pinned by three, it can't run.
    if (a.lockT > 0){ a.lockT -= dt; continue; }
    if (a.flee > 0 && pinnedNow(s, a)) a.flee = 0;
    if (a.team && rspec(a).key === 'argentine' && en.length) a.flee = 0;
    if (a.flee > 0 && a.state !== 'fight' && a.state !== 'follow' && a.state !== 'hold' && a.state !== 'raid'){
      const threat = a.fleeFrom || (s.spider && Math.hypot(a.x-s.spider.x, a.y-s.spider.y) < 4*T ? s.spider : (en[0] || s.spider || {x:a.x+1,y:a.y}));
      if (stepTo(a, a.tx, a.ty, C.speed+20, dt)) chooseToward(s, a, a.x + (a.x - threat.x), a.y + (a.y - threat.y));
      continue;
    }
    if (a.state === 'fight'){
      let tx = null, ty = null;
      if (a.goal === 'spider' && s.spider){ tx = s.spider.x; ty = s.spider.y; }
      else if (a.goal === 'bug'){ const b = s.critters.find(o => o.id === a.bugId); if (b && b.state !== 'fly' && Math.hypot(a.x - b.x, a.y - b.y) < 14*T){ tx = b.x; ty = b.y; } }
      else if (a.goal === 'cat'){ if (s.cat && Math.hypot(a.x - s.cat.x, a.y - s.cat.y) < 14*T){ tx = s.cat.x; ty = s.cat.y; } }
      else if (a.goal === 'boss'){ const b = s.bosses[a.bossKey]; if (b && !b.dead && b.mode === 'fight' && Math.hypot(a.x - b.x, a.y - b.y) < 20*T){ tx = b.x; ty = b.y; } }
      else if (a.goal === 'zombie'){ const z = s.ants.find(o => o.id === a.zid && o.zombie && o.state !== 'dead'); if (z){ tx = z.x; ty = z.y; } }
      else if (a.goal === 'stalk'){ const st = s.stalks.find(o => o.id === a.zid); if (st){ tx = st.x; ty = st.y; } }
      else { const e2 = enemiesNear(a, 6); if (e2.length){ tx = e2[0].x; ty = e2[0].y; } else if (s.spider && Math.hypot(a.x-s.spider.x, a.y-s.spider.y) < 8*T){ tx = s.spider.x; ty = s.spider.y; } }
      if (tx == null){ a.state = a.carry ? 'return' : a.team ? 'return' : a.duty === 'hunt' ? 'hunt' : 'patrol'; a.explore = 0; continue; }
      if (Math.hypot(a.x-tx, a.y-ty) > 0.9*T){ if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed), dt)) chooseToward(s, a, tx, ty); }
      continue;
    }
    // Hunting (build 17): fighters range out after small game and the
    // caterpillar, and leave the meat for foragers to haul.
    if (a.state === 'hunt'){
      a.explore += dt;
      if (a.explore > 50 || s.rain.on){ a.state = 'return'; a.explore = 0; continue; }
      let prey = null, pd = 10*T;
      if (s.cat){ const d = Math.hypot(a.x - s.cat.x, a.y - s.cat.y); if (d < pd){ pd = d; prey = s.cat; } }
      for (const b of s.critters){ if (b.state === 'fly') continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < pd){ pd = d; prey = b; } }
      if (prey){ a.state = 'fight'; a.goal = prey === s.cat ? 'cat' : 'bug'; a.bugId = prey.id; continue; }
      if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed), dt)){ const p = preyNear(s, 60); if (p && Math.random() < 0.6) chooseToward(s, a, p.x, p.y); else chooseExplore(s, a, 40); }
      continue;
    }
    if (a.state === 'raid' && s.colony.trophies.widowsilk && !a.webbed && Math.hypot(a.tx - c.ex, a.ty - c.ey) < 3){ a.webbed = true; a.lockT = 3; a.webT = s.t + 3; } // build 35: the widow's silk at your door
    if (a.state === 'raid'){
      const gx = (c.ex+0.5)*T, gy = (c.ey+0.5)*T;
      if (Math.hypot(a.x-gx, a.y-gy) < 1.5*T){ const guarded = s.ants.some(o => !o.team && o.state!=='dead' && CASTES[o.caste].fight >= 3 && (o.state==='patrol'||o.state==='fight') && Math.hypot(o.tx-c.ex, o.ty-c.ey) < 4) || (picked(s, 'nurse', 'broodguard') && s.ants.some(o => !o.team && o.caste === 'nurse' && (o.state === 'in' || o.state === 'build')));
        // Unguarded, raiders push into the nest and go for the queen.
        a.raidT = (a.raidT||0) + dt; raiseAlarm(s, c.ex, c.ey, 2);
        if (!guarded && s.queen.placed && !s.lost && a.raidT < 10){ s.queen.hp -= 0.8*dt*(qtrait(s, 'hardy') ? 0.4 : 1)*(picked(s, 'soldier', 'guardian') ? 0.5 : 1)*(has(s, 'honourguard') ? 0.5 : 1); if (s.queen.hp < 99 && !s.queenWarned){ s.queenWarned = true; s.events.push('queenhit'); P.msg = 'Raiders are attacking the queen!'; } continue; }
        const take = guarded && picked(s, 'soldier', 'doorkeeper') ? 0 : Math.min(guarded ? 1 : 2, c.store); c.store -= take; c.stolen += take; a.carry = take; a.kind = 'food'; a.state = 'return'; a.raidT = 0; continue; }
      if (stepTo(a, a.tx, a.ty, C.speed, dt)) chooseToward(s, a, gx, gy);
      continue;
    }
    if (a.state === 'hold'){ // build 29: guarding a spot
      if (a.holdX == null){ a.state = 'follow'; continue; }
      const hx = a.holdX, hy = a.holdY, ht = Math.floor(hx/T), hty = Math.floor(hy/T);
      // Chase an enemy that comes within the guarded ring; never farther than the ring's edge.
      let foe = null, fd = Infinity;
      for (const o of enemiesNear(a, HOLD_R + 1)){ const d = Math.hypot(o.x - hx, o.y - hy); if (d <= HOLD_R*T && d < fd){ fd = d; foe = o; } }
      if (!foe && s.spider && Math.hypot(s.spider.x - hx, s.spider.y - hy) < HOLD_R*T) foe = s.spider;
      if (!foe) for (const b of s.critters || []){ if (b.state !== 'fly' && Math.hypot(b.x - hx, b.y - hy) < HOLD_R*T){ foe = b; break; } }
      if (foe){ if (Math.hypot(a.x - foe.x, a.y - foe.y) > 0.6*T){ if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed + 20), dt)) chooseToward(s, a, foe.x, foe.y); } continue; }
      if (Math.hypot(a.x - hx, a.y - hy) > 0.5*T){ if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed + 15), dt)) chooseToward(s, a, hx, hy); }
      continue;
    }
    if (a.state === 'follow'){
      if (!P.ant || P.inNest){ if (a.recall) continue; a.follow = false; a.state = 'explore'; continue; }
      const pd = Math.hypot(a.x - P.ant.x, a.y - P.ant.y), tg = attackTarget(s);
      if (a.recall && pd < 3*T) a.recall = false;
      if (pd > (a.recall ? 400 : tg ? ATTACK_LEASH + 10 : 16)*T){ a.follow = false; a.state = 'explore'; continue; }
      if (tg){ // build 26: charging what you pointed at
        if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < CAT_REACH*reachOf(s, a)){ const dmg = bite(s, a, 'cat')*dt; s.cat.hp -= dmg; s.cat.hitT = s.t; spark(s, a, (a.x + s.cat.x)/2, (a.y + s.cat.y)/2, 0); gainXp(s, a, dmg/3); stingSlow(s, a, s.cat); }
        const td = Math.hypot(a.x - tg.x, a.y - tg.y);
        if (td > attackReach(s, P.attack)){ if (stepTo(a, a.tx, a.ty, 95*(picked(s, 'you', 'hero') ? 1.25 : 1), dt)) chooseToward(s, a, tg.x + (Math.random()-0.5)*T, tg.y + (Math.random()-0.5)*T); }
        continue;
      }
      if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < CAT_REACH*reachOf(s, a)){ const dmg = bite(s, a, 'cat')*dt; s.cat.hp -= dmg; s.cat.hitT = s.t; spark(s, a, (a.x + s.cat.x)/2, (a.y + s.cat.y)/2, 0); gainXp(s, a, dmg/3); stingSlow(s, a, s.cat); }
      // A crew that falls behind hurries to keep up with you.
      if (pd > 1.3*T){ if (stepTo(a, a.tx, a.ty, (pd > 3*T ? 95 : C.speed+15)*(picked(s, 'you', 'hero') ? 1.25 : 1), dt)) chooseToward(s, a, P.ant.x + (Math.random()-0.5)*T, P.ant.y + (Math.random()-0.5)*T); }
      continue;
    }
    // A builder carrying a load of dug dirt out to the spoil heap.
    if (a.state === 'spoil'){
      const sp = s.spoilAt;
      if (Math.hypot(a.x - (sp.x+0.5)*T, a.y - (sp.y+0.5)*T) < 1.2*T){ s.spoilPile = (s.spoilPile||0) + (a.loads || 1); gainXp(s, a, a.loads || 1); a.loads = 0; a.carry = 0; a.kind = null; a.itype = null; a.state = 'return'; continue; }
      if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed), dt)) chooseToward(s, a, (sp.x+0.5)*T, (sp.y+0.5)*T);
      continue;
    }
    if (a.state === 'explore' || a.state === 'patrol'){
      a.explore += dt; if (s.rain.on && !a.team && a.state === 'explore' && a.explore > 2 && !has(s, 'nightsense')){ a.state = 'return'; a.explore = 0; continue; }
      const f = itemAt(s, a.tx, a.ty); const want0 = a.state === 'explore' ? wanted(s, a) : null, want = () => want0; // build 45: only foragers use it (worked out at the same moment as before, so answers are unchanged)
      // Pick up on arrival: within 2 px, or within this tick's step at speed.
      if (f && a.state === 'explore' && a.carry === 0 && want()[f.kind] && (!heavy(f) || a.team || chewsTreats(s, a)) && !f.carried && Math.hypot(a.x-(a.tx+0.5)*T, a.y-(a.ty+0.5)*T) < 2 + C.speed*SURF*dt){ const take = Math.min(carryCap(s, a, f), f.amt); f.amt -= take; a.carry = take; a.kind = f.kind; a.itype = f.type; a.ireg = w.area[idx(f.x,f.y)]; a.state = 'return'; continue; }
      // Its main work at home came up (orders to dig, eggs to tend): empty-handed, it heads back.
      if (!a.team && a.state === 'explore' && !a.carry && (a.caste === 'builder' || a.caste === 'nurse') && Math.floor(a.explore/2) > Math.floor((a.explore - dt)/2)){ const n = chooseDuty(s, a); if (n === 'build' || n === 'nurse'){ a.state = 'return'; a.duty = n; a.explore = 0; continue; } }
      // Nothing of its duty in sight for a while: help with the next one instead.
      if (!a.team && a.state === 'explore' && a.duty && Math.floor(a.explore/20) > Math.floor((a.explore - dt)/20)){ const n = chooseDuty(s, a, a.duty); if (n && DUTIES[n].out && (n !== 'hunt' || C.fight < 3)) a.duty = n; }
      if (a.explore > (a.state === 'patrol' ? 25 : 60)){ a.state = 'return'; a.explore = 0; continue; }
      if (stepTo(a, a.tx, a.ty, fSpeed(s, a), dt)){ const nf = a.state === 'explore' ? nearestItem(s, a, sightOf(s, a), want()) : null; if (nf) chooseToward(s, a, (nf.x+0.5)*T, (nf.y+0.5)*T); else chooseExplore(s, a, a.state === 'patrol' ? (a.team ? 6 : picked(s, 'soldier', 'escort') ? 18 : 9) : a.team ? 64 : forageRange(s)); }
      continue;
    }
    if (a.state === 'return'){
      if (a.carry > 0 && !a.team && has(s, 'royal') && s.outposts.length){
        let ob = null, od = homeOf(s, a)[idx(a.tx,a.ty)]*0.8; for (const o of s.outposts){ if (!o.done) continue; const d = Math.hypot(o.x - a.tx, o.y - a.ty); if (d < od){ od = d; ob = o; } }
        if (ob){ if (od < 1.3){ deposit(s, a); a.state = 'explore'; a.explore = 0; chooseExplore(s, a, forageRange(s)); continue; } if (stepTo(a, a.tx, a.ty, fSpeed(s, a), dt)) chooseToward(s, a, (ob.x+0.5)*T, (ob.y+0.5)*T); continue; } }
      if (a.carry > 0 && !a.team){ const i = idx(a.tx,a.ty); s.trail[i] = Math.min(5, s.trail[i] + 1.2*dt*(a.caste === 'forager' && picked(s, 'forager', 'trailblazer') ? 2 : 1)); s.hot.add(i); }
      { const door = a.dh && daughterOf(s, a) ? daughterOf(s, a) : col; // (build 46: home is her door)
      if (a.tx === door.ex && a.ty === door.ey && Math.hypot(a.x-(door.ex+0.5)*T, a.y-(door.ey+0.5)*T) < 2){
        if (a.carry) deposit(s, a); enterNest(s, a); continue; } }
      if (stepTo(a, a.tx, a.ty, fSpeed(s, a), dt)) chooseReturn(s, a);
      continue;
    }
  }
  // spider damage
  if (s.spider){
    let power = 0; const near = [];
    const biters = [];
    for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest' || a.state==='away') continue; const d = Math.hypot(a.x-s.spider.x, a.y-s.spider.y); if (d < SPIDER_REACH*reachOf(s, a)){ if (d < SPIDER_REACH) near.push(a); if (a.state==='fight' || a.state==='follow' || a.isPlayer || a.state==='raid'){ const b = bite(s, a, 'spider'); power += b; biters.push(a); gainXp(s, a, b*0.5*dt/3); stingSlow(s, a, s.spider); } } }
    s.spider.hp -= power*0.5*dt*(exposed(s, s.spider) ? 1.5 : 1); s.spider.bite += dt;
    // Eating or full it only bites back when bitten.
    const sp = s.spider, calm = sp.eatT > 0 || sp.full > 0;
    if (biters.length) sp.hitT = s.t;
    if (sp.bite >= 2 && near.length && (!calm || power > 0)){ sp.bite = 0; const v = near[Math.floor(Math.random()*near.length)]; spark(s, null, v.x, v.y, 1); killAnt(s, v, 'spider'); sp.biteAt = s.t;
      if (!calm){ sp.eatT = 3.5; sp.dx = v.x - sp.x; sp.dy = v.y - sp.y; sp.meals = (sp.meals || 0) + 1;
        if (sp.meals >= 3){ sp.full = 60; sp.route = []; sp.passing = false; const ang = Math.random()*Math.PI*2; spiderRoute(s, sp, (w.web.x+0.5+Math.cos(ang)*2.5*SCALE)*T, (w.web.y+(2+Math.abs(Math.sin(ang))*2)*SCALE)*T, 50);
          if (playerNear(s, sp.x, sp.y, 30)) P.msg = 'The spider has eaten its fill. It goes back to its web to sleep it off.'; } } }
    for (const a of biters) spark(s, a, (a.x + sp.x)/2, (a.y + sp.y)/2, 0);
    if (s.spider.hp <= 0){ s.items.push({ x: Math.floor(s.spider.x/T), y: Math.floor(s.spider.y/T), kind:'protein', type:'spider', amt: 40 });
      { const sx = Math.floor(s.spider.x/T) + 1, sy = Math.floor(s.spider.y/T); if (walk(s, sx, sy)) s.items.push({ x: sx, y: sy, kind: 'chitin', type: 'shell', amt: 15 }); }
      const ours = biters.filter(a => !a.team);
      if (ours.length){ for (const a of ours) gainXp(s, a, 50); makeLegend(s, ours[Math.floor(Math.random()*ours.length)], 'Spider-bane'); if (picked(s, 'venom', 'hunter')) trailHome(s, s.spider.x, s.spider.y); }
      const cost = (c.deaths.spider || 0) - (s.spider.cost0 || 0);
      if (!c.trophies.spider){ c.trophies.spider = true; gainGenes(s, 3, 'the spider is dead'); P.msg = `Spider down! It cost you ${cost} ant${cost === 1 ? '' : 's'}. Venom ants unlocked.`; } else { gainGenes(s, 1, 'the spider again'); P.msg = `Spider down again! It cost you ${cost} ant${cost === 1 ? '' : 's'}.`; }
      s.report = { kind: 'spider', lost: cost, t: s.t };
      s.spiderCorpse = { x: s.spider.x, y: s.spider.y, t: s.t };
      c.kills.spider = (c.kills.spider||0)+1; s.spider = null; s.spiderRespawn = 120; }
  }
  if (s.cat && s.cat.hp <= 0){ s.items.push({ x: Math.floor(s.cat.x/T), y: Math.floor(s.cat.y/T), kind:'protein', type:'cat', amt: 40 });
    for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < 3*T) gainXp(s, a, 15);
    if (picked(s, 'venom', 'hunter')) trailHome(s, s.cat.x, s.cat.y);
    if (!c.kills.caterpillar) gainGenes(s, 1, 'your first hunt');
    c.kills.caterpillar = (c.kills.caterpillar||0)+1; if (!P.msg) P.msg = 'Caterpillar down! Haul the meat home.'; s.catCorpse = { x: s.cat.x, y: s.cat.y, t: s.t }; s.cat = null; s.catRespawn = 90; }
  // Build 28: rival nests fall to raids you lead (tickMyRaid). A fallen colony's last ants die off.
  for (const r of s.rivals){
    if (r.asleep) continue;
    if (!r.queenAlive){ if (!r.cleared){ for (const a of s.ants) if (a.team === r.team && Math.random() < dt/60) a.state = 'dead'; if (!s.ants.some(a => a.team === r.team && a.state !== 'dead')) r.cleared = true; } continue; }
    if (r.qhp == null) r.qhp = RIVALS[r.team - 1].qhp;
    // Our fighters at their door raise the alarm: their guards pour out. Left alone, the queen heals.
    let ours = 0; for (const a of s.ants){ if (a.team || !outside(a)) continue; if ((CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer) && Math.hypot(a.tx - r.ex, a.ty - r.ey) <= 2.5) ours++; }
    if (ours) raiseAlarm(s, r.ex, r.ey, 1.5);
    r.siege = s.myRaid && s.myRaid.team === r.team ? 1 : 0;
    if (!r.siege) r.qhp = Math.min(RIVALS[r.team - 1].qhp, r.qhp + 3*dt);
  }
  tickMyRaid(s, dt);
  for (const a of s.ants){ if (a.team && a.state !== 'dead' && a.state !== 'in' && CASTES[a.caste].fight >= 3 && Math.hypot(a.tx - c.ex, a.ty - c.ey) < 3){ raiseAlarm(s, c.ex, c.ey, 1.2); break; } }
  for (const r of s.rivals) if (!r.asleep) rivalBrain(s, r, dt);
  s.ants = s.ants.filter(a => a.state !== 'dead');
}

function tickColony(s, c, dt){
  if (!c.team && s.queen.placed){ tickBreach(s, dt); tickNestFinds(s, dt); }
  if (!c.team) advise(s, dt);
  c.secAcc += dt; while (c.secAcc >= 1){ c.secAcc -= 1; c.delivered.pop(); c.delivered.unshift(0); c.eaten.pop(); c.eaten.unshift(0); }
  let eat = 0; for (const a of s.ants) if (a.state !== 'dead' && a.team === c.team) eat += CASTES[a.caste].eat;
  if (!c.team) for (const d of s.daughters || []) for (const k in d.pop || {}) eat += CASTES[k].eat*d.pop[k]; // (build 46: a far daughter's ants still eat)
  if (!c.team && has(s, 'longlived')) eat *= 0.75; // (build 47.2: far daughters' ants too, as near ones)
  if (!c.team) eat += roomUpkeep(s); // rooms cost food to run (build 17)
  // Build 25.1: the later colonies also feed beyond what we model (the bins, the tree, their side
  // of the fence), so they need half what they eat from the yard.
  if (c.team > 1) eat *= 0.5;
  const bite = eat/60*dt; c.eaten[0] += bite; c.store -= bite; if (!c.team && c.store > c.storePeak) c.storePeak = c.store;
  if (c.store < 0 && !c.team && has(s, 'honeyeco') && (c.sugar || 0) >= 1){ const k = Math.min(c.sugar, Math.ceil(-c.store)); c.sugar -= k; c.store += k; } // build 40: Honey economy, sugar feeds the colony when food runs out
  /* build 41: out of grain, the colony eats its meat before anyone starves */
  if (c.store < 0 && !c.team && c.protein >= 1){ const k = Math.min(Math.floor(c.protein), Math.ceil(-c.store)); c.protein -= k; c.store += k; if (!c.ateMeat){ c.ateMeat = true; s.player.msg = 'Out of food: the colony is eating its 🥩 meat. Forage!'; } } else if (c.store > 20) c.ateMeat = false;
  if (c.store < 0){ c.store = 0; c.starve += dt; if (!c.team && c.starve > 10 && !c.starveWarned){ c.starveWarned = true; s.events.push('starving'); s.player.msg = 'The colony is starving. Forage farther.'; } } else { c.starve = 0; if (c.store > 20) c.starveWarned = false; }
  if (c.starve > 30 && (c.starve - 30) % (!c.team ? (has(s, 'stomach') ? 20 : 10) : 5) < dt){ /* build 41: slower for yours (was 20 s, then one every 5) */ const v = s.ants.filter(a => !a.isPlayer && a.state !== 'dead' && a.state !== 'away' && a.team === c.team); if (v.length && !(c.team > 1 && v.length <= RIVALS[c.team - 1].start[0] + RIVALS[c.team - 1].start[1])) killAnt(s, v[Math.floor(Math.random()*v.length)], 'starved'); } // build 25.1: a later colony never starves below the size it came with
  const overCap = !c.team && antCount(s) >= queenCap(s.queen.level, s);
  if (c.queenAlive && (c.team || s.queen.placed) && !overCap){
    while (c.eggQueue.length && c.eggs.length < c.hatchCap){ const caste = c.eggQueue.shift(); c.eggs.push({ caste, t: 0, need: CASTES[caste].hatch * c.hatchMul }); }
    // Nurses inside speed the eggs: three can help (six with Nurse II), each by its rank.
    let rate = 1;
    if (!c.team){ const nurses = s.ants.filter(a => a.caste==='nurse' && a.team===0 && (a.state==='in'||a.state==='build')).slice(0, (lvl(s, 'nurse') >= 2 ? 6 : 3) + 3*Math.max(0, roomCount(s, 'nursery') - 1));
      for (const a of nurses) rate += 0.12*jobMul(a)*(promo(s, a, 'gentle') ? 1.3 : 1);
      if (s.ants.some(a => !a.team && a.caste !== 'nurse' && a.state === 'in' && promo(s, a, 'gentle'))) rate *= 1.1; // build 40: a Gentle medic, rancher, replete or undertaker helps a little too
      if (nurses.length && lvl(s, 'nurse') >= 1) rate *= 1.15;
      if (nurses.length && lvl(s, 'nurse') >= 3) rate *= 1.3;
      if (lvl(s, 'nurse') >= 4) rate *= 1.25;
      if (picked(s, 'nurse', 'attendant')) rate *= 1.2;
      if (qtrait(s, 'fertile')) rate *= 1.25;
      if (heldFx(s, 'warm')) rate *= 1.15;
      if (setDone(s, 'colony')) rate *= 1.1;
      if (has(s, 'chimneys')) rate *= 1.15;
      if (has(s, 'polygyny')) rate *= 1.3; }
    for (let i=c.eggs.length-1;i>=0;i--){ const e = c.eggs[i]; e.t += dt*rate; if (e.t >= e.need){ c.eggs.splice(i,1); hatch(s, c, e.caste); } }
  }
  if (!c.team){
    const P = s.player;
    // Fighters eat protein: half a unit a minute each. With none, they starve one by one.
    // Hurt ants heal in the nest with Medic training, or near a Healer.
    if (picked(s, 'nurse', 'medic') || s.ants.some(a => !a.team && a.caste !== 'forager' && FAMILY[a.caste] === 'nest' && (a.state === 'in' || a.state === 'build') && promo(s, a, 'healer')))
      for (const a of s.ants) if (!a.team && (a.state === 'in' || a.state === 'build') && a.hp < maxHp(s, a)) a.hp = Math.min(maxHp(s, a), a.hp + 0.5*dt);
    const fighters = s.ants.filter(a => !a.team && a.state !== 'dead' && CASTES[a.caste].fight >= 3);
    let farF = 0; for (const d of s.daughters || []) for (const k in d.pop || {}) if (CASTES[k].fight >= 3) farF += d.pop[k]; /* build 47: a far daughter's soldiers eat protein too */
    if (fighters.length + farF){ c.protein -= (fighters.length + farF)*0.5/60*dt*Math.pow(0.75, Math.max(0, roomCount(s, 'barracks') - 1));
      if (c.protein < 0){ c.protein = 0; c.pstarve += dt; if (c.pstarve > 30 && (c.pstarve - 30) % 10 < dt){ const v = fighters.filter(a => !a.isPlayer), r = Math.floor(Math.random()*(v.length + farF)); /* build 47.2: any fighter, near or far, by their numbers */ if (r < v.length) killAnt(s, v[r], 'nomeat'); else { let k = r - v.length; for (const d of s.daughters || []){ if (d.real) continue; for (const q in d.pop || {}){ if (CASTES[q].fight < 3) continue; if (k < d.pop[q]){ d.pop[q]--; c.deaths.nomeat = (c.deaths.nomeat || 0) + 1; k = -1; break; } k -= d.pop[q]; } if (k < 0) break; } } s.events.push('soldierfood'); if (!P.msg) P.msg = 'Soldiers are starving: they need protein.'; } }
      else c.pstarve = 0; }
    // Build 23: the rooms at work.
    // Fungus garden: leaves the gardeners brought in grow into food.
    const fg = roomCount(s, 'fungus');
    if (fg && (c.fungus || 0) > 0){ const lv = roomLevel(s, 'fungus'), rate = fg*(lv >= 3 ? 0.2 : 0.1)*(1 + 0.25*inBand(s, 'fungus'))*dt, use = Math.min(c.fungus, rate); c.fungus -= use; c.store = Math.min(c.cap, c.store + use*(lv >= 3 ? 3 : lv >= 2 ? 2.25 : 1.5)); }
    // Aphid barn: each rancher at work makes half a 🍯 a minute.
    const rh = workers(s, 'rancher', 'herd', 'dairy', 4);
    if (rh){ const lv = roomLevel(s, 'dairy'), gentle = s.ants.some(a => !a.team && a.caste === 'rancher' && a.state === 'in' && promo(s, a, 'gentle')) ? 1.3 : 1; c.dairyAcc = (c.dairyAcc || 0) + rh*0.5/60*dt*(lv >= 3 ? 2 : lv >= 2 ? 1.5 : 1)*gentle; /* build 40: a Gentle rancher milks 30% more */ if (c.dairyAcc >= 1){ c.dairyAcc -= 1; addSugar(s, 1); if (lv >= 3) c.store = Math.min(c.cap, c.store + 1); } }
    // Infirmary: medics heal the wounded inside (your ant too, at level II) and cure Cordyceps.
    const md = workers(s, 'medic', 'heal', 'infirmary', 3);
    if (md){ const lv = roomLevel(s, 'infirmary'), hr = (lv >= 2 ? 2 : 1)*md*0.5*dt; // build 40: every medic counts (was capped at 3)
      for (const a of s.ants) if (!a.team && (a.state === 'in' || a.state === 'build' || (a.isPlayer && lv >= 2 && P.inNest)) && a.hp < maxHp(s, a)) a.hp = Math.min(maxHp(s, a), a.hp + hr);
      for (const a of s.ants) if (!a.team && a.infect != null && a.infect < CORD.turn && a.state === 'in' && Math.random() < dt*0.25*md){ a.infect = null; if (!c.saidMedic){ c.saidMedic = true; P.msg = 'Your medics cured an ant of the fungus.'; } } }
    // Honeypot vault III: in a famine the repletes feed the colony (half a food a second each, from a reserve refilled when food is plenty).
    const rp = roomLevel(s, 'honeypot') >= 3 ? workers(s, 'replete', 'hang', 'honeypot', 4) : 0;
    if (rp){ if (c.store > c.cap*0.6 && (c.crop || 0) < rp*40){ const put = Math.min(dt, rp*40 - (c.crop || 0)); c.crop = (c.crop || 0) + put; c.store -= put; } /* build 40: filled from the store, not from nothing */ else if (c.store < 3 && (c.crop || 0) > 0){ const g = Math.min(c.crop, rp*0.5*dt); c.crop -= g; c.store += g; } }
    // Midden II: the undertakers' compost feeds the fungus garden.
    const ut = roomLevel(s, 'midden') >= 2 && roomOf(s, 'fungus') ? workers(s, 'undertaker', 'tidy', 'midden', 3) : 0;
    if (ut) c.fungus = Math.min(fungusCap(s), (c.fungus || 0) + ut*0.5/60*dt);
    // Flower nectar (build 18): each region held gives half a 🍯 a minute.
    if (has(s, 'nectar') && Object.keys(c.held || {}).length) for (const a of s.ants) if (!a.team && !a.zombie && outside(a) && c.held[s.world.area[idx(a.tx, a.ty)]] && a.hp < maxHp(s, a)) a.hp = Math.min(maxHp(s, a), a.hp + 0.4*dt); // build 40: nectar heals your ants in regions you hold
    if (has(s, 'nectar')){ const n = Object.keys(c.held || {}).length; if (n){ c.nectarAcc = (c.nectarAcc || 0) + n*0.5/60*dt; if (c.nectarAcc >= 1){ c.nectarAcc -= 1; addSugar(s, 1); } } }
    // The queen heals slowly; if raiders kill her, the colony is lost.
    const q = s.queen;
    if (q.placed && q.hp <= 0 && qtrait(s, 'eternal') && !c.eternalUsed){ c.eternalUsed = true; q.hp = 60; P.msg = 'The queen fell, but a daughter takes her place. The line goes on.'; }
    if (q.placed && !s.lost){ q.hp = Math.min(100, q.hp + 0.1*dt); if (q.hp >= 99) s.queenWarned = false;
      if (q.hp <= 0){ q.hp = 0; s.lost = true; c.queenAlive = false; s.events.push('lost'); P.msg = 'The queen is dead. The colony is lost.'; } }
    // The queen sitting idle with food to spare: say so (build 15).
    if (s.queen.placed && !c.eggs.length && !c.eggQueue.length && !P.pending && c.store >= 8 && c.water >= 1 && !overCap){ c.idleT = (c.idleT || 0) + dt;
      if (c.idleT > 25 && s.t - (c.nudgeT || -999) > 90){ c.nudgeT = s.t; s.events.push('idlequeen'); P.msg = 'The queen is idle and you have food: tap her in the nest and lay eggs.'; } } else c.idleT = 0;
    if (P.pending && !P.ant && !c.eggs.length && !c.eggQueue.length && s.queen.placed){ c.eggQueue.push(P.rebirth && !eggLock(s, P.rebirth) ? P.rebirth : 'forager'); P.msg = 'Waiting for the next hatchling.'; }
    const nw = roomCount(s, 'workshop'), ws = nw ? 1.5 + 0.5*nw : 1;
    // Construction only advances for builders standing at their own job.
    const crewOf = key => s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.atWork && a.task === key);
    const atWork = key => crewOf(key).reduce((t, a) => t + workOf(s, a, key[0]), 0);
    if (c.buildQueue.length){ const job = c.buildQueue[0]; const builders = atWork('j');
      job.progress += builders*ws*dt; const R = ROOMS[job.room];
      if (job.progress >= R.work){ for (const a of crewOf('j')) gainXp(s, a, 3); c.buildQueue.shift(); finishRoom(s, job); } }
    for (let i=s.nest.fillOrders.length-1;i>=0;i--){ const o = s.nest.fillOrders[i]; if (s.nest.cells[nidx(o.x,o.y)] === 2){ s.nest.fillOrders.splice(i, 1); continue; } /* never into a room */ const b = atWork('f'+o.x+','+o.y); o.progress += b*ws*dt; if (o.progress >= o.need){ const occupied = s.ants.some(a => !a.team && (a.state==='in'||a.state==='build'||a.state==='nest') && Math.floor(a.nx)===o.x && Math.floor(a.ny)===o.y); if (!occupied){ for (const a of crewOf('f'+o.x+','+o.y)) gainXp(s, a, 1); s.nest.cells[nidx(o.x,o.y)] = 0; s.nest.ver++; s.nest.fillOrders.splice(i,1); } } }
    const full = (s.nest.spoil||0) >= SPOIL_MAX; // dirt waiting to go out: digging stops
    for (let i=s.nest.digOrders.length-1;i>=0;i--){ const o = s.nest.digOrders[i]; if (full) break; const b = atWork('d'+o.x+','+o.y); o.progress += b*ws*dt; if (o.progress >= o.need){ for (const a of crewOf('d'+o.x+','+o.y)) gainXp(s, a, 1); c.dug++; dig(s, o.x, o.y); bedrockPrize(s, o.x, o.y); bedrockGlow(s, o.y); s.nest.digOrders.splice(i,1); s.nest.spoil = (s.nest.spoil||0) + 1; } }
  }
}
function finishRoom(s, job){
  const c = s.colony; carveRoom(s, job, job.room);
  s.player.msg = `${ROOMS[job.room].name} finished: ${ROOMS[job.room].desc.replace(/^./, ch => ch.toLowerCase())}.`; s.events.push('roomdone');
  roomsChanged(s);
}
// What the rooms add up to: recomputed whenever one is built or torn out.
function roomsChanged(s){
  const c = s.colony, nn = roomCount(s, 'nursery');
  c.hatchCap = hatchCapOf(s); c.cap = storeCap(s); c.waterCap = waterCapOf(s); c.hatchMul = (nn ? 0.7*Math.pow(0.85, nn - 1) : 1)*(1 - 0.1*inBand(s, 'hatchery'))*(1 - 0.1*inBand(s, 'nursery'));
  c.store = Math.min(c.store, c.cap); c.water = Math.min(c.water, c.waterCap);
}
function hatch(s, c, caste){
  const a = mkAnt(s, caste, 'in', c.ex, c.ey, c.team);
  if (!c.team){ c.hatched++; if (c.hatched % 10 === 0) gainGenes(s, 1, c.hatched + ' eggs hatched');
    // A head start: the Drill hall for fighters, Colony memory for everyone.
    if (has(s, 'memory') || picked(s, 'nurse', 'teacher') || (has(s, 'drillhall') && CASTES[caste].fight >= 3)) a.xp = RANKS[1].xp;
    if (has(s, 'memory')) a.xp = RANKS[2].xp; // build 40: Colony memory now hatches Veterans
    for (const n of s.ants) if (n.caste === 'nurse' && !n.team && (n.state === 'in' || n.state === 'build')) gainXp(s, n, 1); const r = s.queen.room; a.nx = r.x0+1.5; a.ny = r.y0+1.5; a.ntx = r.x0+1; a.nty = r.y0+1; a.rest = 2;
    if (s.player.pending){ a.isPlayer = true; a.hp = Math.max(youHp(s), maxHp(s, a)); s.player.rebirth = null; a.state = 'nest'; s.player.ant = a; s.player.pending = false; s.player.hunger = 100; s.player.inNest = true; s.player.tx = null; s.player.ntx = null; s.player.msg = ''; } }
}
// How readily Cordyceps spreads (build 24): halved by glands, and by a working Midden (all but stopped at its III).
function cordResist(s){ let k = 1; if (has(s, 'glands')) k *= 0.5; const u = roomOf(s, 'midden') ? workers(s, 'undertaker', 'tidy', 'midden', 3) : 0; if (u) k *= roomLevel(s, 'midden') >= 3 ? 0.15 : Math.max(0.3, 0.7 - 0.1*u); return k; } // build 40: each undertaker counts
function enterNest(s, a){
  a.state = 'in'; a.rest = 3 + Math.random()*8; a.explore = 0; a.goal = null;
  if (!a.team){ a.nx = SHAFT; a.ny = 0; a.ntx = SHAFT; a.nty = 0; }
}
function exitNest(s, a, state){
  const col = a.dh && daughterOf(s, a) ? daughterOf(s, a) : colonyOf(s, a); /* (build 46: a daughter's ants come out of her door) */ a.tx = col.ex; a.ty = col.ey; a.x = (col.ex+0.5)*T; a.y = (col.ey+0.5)*T;
  const ang = Math.random()*Math.PI*2; a.dx = Math.cos(ang); a.dy = Math.sin(ang); a.state = state; a.explore = 0; a.goal = null;
  if (state === 'fight'){ chooseToward(s, a, s.spider ? s.spider.x : a.x, s.spider ? s.spider.y : a.y); }
  else if (state === 'raid'){ chooseToward(s, a, (s.colony.ex+0.5)*T, (s.colony.ey+0.5)*T); }
  else chooseExplore(s, a, state==='patrol' ? 9 : 0);
}
function roomTarget(s, a){
  const key = CASTE_ROOM[a.caste] && roomOf(s, CASTE_ROOM[a.caste]) ? CASTE_ROOM[a.caste] : a.caste==='soldier'||a.caste==='venom' ? 'barracks' : a.caste==='nurse' ? (roomOf(s,'nursery')?'nursery':'hatchery') : a.caste==='forager' ? 'store' : 'queen';
  let r = roomOf(s, key) || s.queen.room; if (!r) return [SHAFT, 0];
  return [r.x0 + Math.floor(Math.random()*(r.w||4)), r.y0 + Math.floor(Math.random()*(r.h||3))];
}
function tickInside(s, a, dt){
  const col = colonyOf(s, a), C = CASTES[a.caste];
  if (a.dh){ // build 46: a daughter's ant, resting in her chambers (abstract, like a rival's)
    a.rest -= dt; if (a.rest > 0) return; const d = daughterOf(s, a); if (!d){ a.dh = null; a.rest = 2; return; }
    if (C.fight >= 3){ if (s.alarm[idx(d.ex, d.ey)] > 0.2) exitNest(s, a, 'fight'); else if (Math.random() < 0.35) exitNest(s, a, 'patrol'); else a.rest = 3; }
    else { a.duty = 'food'; exitNest(s, a, 'explore'); }
    return;
  }
  if (a.team){ // rival: abstract
    a.rest -= dt; if (a.rest > 0) return;
    if (s.myRaid && s.myRaid.phase === 'inside' && s.myRaid.team === a.team){ a.rest = 1; return; } // build 28: holding their halls
    const hunger = Math.max(0, 1 - col.store/col.cap);
    if (rspec(a).swarm && s.alarm[idx(col.ex,col.ey)] > 0.2){ exitNest(s, a, 'fight'); return; } // build 25.1: the whole swarm pours out to defend
    if (C.fight >= 3){ if (s.alarm[idx(col.ex,col.ey)] > 0.2) exitNest(s, a, 'fight'); else if (Math.random() < 0.2) exitNest(s, a, 'patrol'); else a.rest = 3; }
    else { if (0.3 + hunger*0.9 > a.thr.f) exitNest(s, a, 'explore'); else a.rest = 2; }
    return;
  }
  if (a.state === 'nest') return; // player inside: handled in stepPlayer
  const c = col; const q = s.queen;
  if (!q.placed){ a.rest = 1; return; }
  // Builders claim one task and keep it until it is finished. Free, they take
  // nest work when Dig and build is the first of their duties that needs doing.
  if (a.caste === 'builder'){
    if (a.task && !builderTaskValid(s, a)){ a.task = null; a.taskCell = null; }
    if (!a.task && a.goal !== 'exit' && chooseDuty(s, a) === 'build') pickBuilderTask(s, a);
    if (a.task){ a.state = 'build'; a.duty = 'build'; a.ntx = a.taskCell[0]; a.nty = a.taskCell[1]; }
    else if (a.state === 'build'){ a.state = 'in'; a.goal = null; }
  }
  if (a.state === 'in' && a.goal == null){ const [tx,ty] = roomTarget(s, a); a.ntx = tx; a.nty = ty; a.goal = 'idle'; }
  // walk inside; work only counts once the builder stands on its own cell
  const arrived = nestStep(s, a, C.speed*0.8, dt);
  a.atWork = a.state === 'build' && arrived && Math.floor(a.nx) === a.ntx && Math.floor(a.ny) === a.nty;
  // A hauler at the top of the shaft takes a load of dirt out.
  if (a.task === 'h' && a.atWork){ a.task = null; a.taskCell = null;
    if ((s.nest.spoil||0) > 0){ const loads = Math.min(s.nest.spoil, 1 + (lvl(s, 'builder') >= 2 ? 1 : 0) + (promo(s, a, 'packer') ? 1 : 0)); s.nest.spoil -= loads; exitNest(s, a, 'spoil'); a.carry = 1; a.loads = loads; a.kind = 'dirt'; a.itype = 'dirt'; chooseToward(s, a, (s.spoilAt.x+0.5)*T, (s.spoilAt.y+0.5)*T); }
    return; }
  if (a.state !== 'in') return;
  if (arrived && a.goal === 'exit' && !a.exitTo) a.goal = null; /* build 41: a save from before exitTo was kept */
  if (arrived && a.goal === 'exit' && !reachable(s, Math.floor(a.nx), Math.floor(a.ny))){ a.goal = null; a.exitTo = null; a.rest = 4; } /* build 47: walled in: wait for the builders instead of freezing */
  if (!arrived || a.goal === 'exit') return;
  a.rest -= dt; if (a.rest > 0) return;
  // What next: the first of its duties that needs doing (build 17).
  const d = chooseDuty(s, a); a.duty = d;
  let go = null;
  if (d === 'guard') go = doorAlarm(s) > 0.05 ? 'fight' : 'patrol';
  else if (d === 'hunt' && C.fight >= 3) go = 'hunt';
  else if (d && DUTIES[d].out && s.alarm[idx(c.ex,c.ey)] < 0.5) go = 'explore';
  if (go){ a.goal = 'exit'; a.ntx = SHAFT; a.nty = 0; a.state = 'in'; a.rest = 0;
    // walk to exit over following ticks; mark pending
    a.exitTo = go; }
  else a.rest = 2 + Math.random()*3;
}
// ---------- jobs (build 17) ----------
// Each kind of ant works down its own list of duties, in the order you set
// on the Jobs page: the first one that needs doing is what it does, so its
// main duty comes first and it helps elsewhere when that is done. A duty can
// be switched off. Ants differ in how readily they answer (their thresholds),
// so a colony spreads itself across what needs doing.
const DUTIES = {
  food:  { name: 'Gather food', icon: '🌾', out: true, kind: 'food' },
  water: { name: 'Fetch water', icon: '💧', out: true, kind: 'water' },
  stone: { name: 'Fetch stone', icon: '🪨', out: true, kind: 'grit' },
  hunt:  { name: 'Hunt', icon: '🥩', out: true, kind: 'protein' },
  build: { name: 'Dig and build', icon: '⛏' },
  nurse: { name: 'Tend eggs', icon: '🥚' },
  guard: { name: 'Guard the door', icon: '🛡' },
  // Build 23.
  wood:   { name: 'Fetch wood', icon: '🪵', out: true, kind: 'wood' },
  leaves: { name: 'Cut leaves', icon: '🍃', out: true, kind: 'leaf' },
  herd:   { name: 'Herd aphids', icon: '🐛' },
  heal:   { name: 'Tend the wounded', icon: '🩹' },
  // Build 24.
  hang:   { name: 'Hang in the vault', icon: '🍯' },
  tidy:   { name: 'Clear the dead', icon: '⚱' },
};
// Duties done inside the nest (an ant on one stays in).
const INSIDE = { build: 1, nurse: 1, herd: 1, heal: 1, hang: 1, tidy: 1 };
// Who can do what, main duty first.
const JOBS0 = {
  forager: ['food', 'water', 'stone', 'wood', 'hunt'],
  builder: ['build', 'stone', 'wood', 'food', 'water'],
  nurse:   ['nurse', 'water', 'food'],
  soldier: ['guard', 'hunt', 'food'],
  venom:   ['hunt', 'guard', 'food'],
  gardener: ['leaves', 'food', 'water'],
  rancher:  ['herd', 'food'],
  medic:    ['heal', 'food', 'water'],
  harvester:['food', 'stone', 'wood', 'water'],
  major:    ['guard', 'hunt', 'food'],
  supermajor:['guard', 'hunt'],
  exploder: ['guard', 'hunt'],
  replete:  ['hang'],
  undertaker:['tidy', 'food', 'water'],
};
function jobsOf(s, caste){
  const c = s.colony; if (!c.jobs) c.jobs = {};
  if (!c.jobs[caste]) c.jobs[caste] = (JOBS0[caste] || []).map(d => [d, 1]);
  for (const d of JOBS0[caste] || []) if (!c.jobs[caste].some(j => j[0] === d)) c.jobs[caste].push([d, 1]); // duties added since the save
  return c.jobs[caste];
}
// Make a duty this kind's main one (first), or switch it on or off.
function setJobFirst(s, caste, duty){ const L = jobsOf(s, caste), i = L.findIndex(j => j[0] === duty); if (i < 0) return false; const [j] = L.splice(i, 1); j[1] = 1; L.unshift(j); return true; }
function toggleJob(s, caste, duty){ const L = jobsOf(s, caste), j = L.find(j => j[0] === duty); if (!j) return false; j[1] = j[1] ? 0 : 1; return true; }
const stoneGoal = s => Math.max(30, (QUEEN_UP[s.queen.level] || {}).grit || 0);
// 🪵 wanted once something needs it: the queen's last levels, a room's level III.
const woodGoal = s => (s.queen.level >= 2 || ROOM_KEYS.some(k => ROOMS[k].lv && roomCount(s, k) && roomLevel(s, k) >= 2)) ? 40 : 0;
// Gardeners keep the fungus garden fed: up to 60 leaf a garden.
const fungusCap = s => roomCount(s, 'fungus')*60;
// Ants working a room from inside: up to `per` a room, more with its level II.
function workers(s, caste, duty, room, per){ const cap = roomCount(s, room)*(per + (roomLevel(s, room) >= 2 ? 2 : 0)); let n = 0; for (const a of s.ants) if (!a.team && a.caste === caste && a.duty === duty && a.state === 'in') n++; return Math.min(n, cap); }
function buildWork(s){ const n = s.nest, spoil = n.spoil || 0; return s.colony.buildQueue.length > 0 || s.repairs.length > 0 || spoil > 0 || n.fillOrders.length > 0 || (n.digOrders.length > 0 && spoil < SPOIL_MAX); }
const doorAlarm = s => { const c = s.colony; return s.alarm[idx(c.ex, c.ey)] + nearAlarm(s); };
// Prey for hunters: a small creature or the caterpillar within reach of home.
function preyNear(s, r){ const c = s.colony; if (s.cat && Math.hypot(s.cat.x/T - c.ex, s.cat.y/T - c.ey) < r) return s.cat; for (const b of s.critters) if (b.state !== 'fly' && Math.hypot(b.x/T - c.ex, b.y/T - c.ey) < r) return b; return null; }
// Ants already on a duty: out, or on their way out.
function onDuty(s, d, me){ let n = 0; for (const o of s.ants) if (o !== me && !o.team && o.duty === d && (outside(o) || o.goal === 'exit')) n++; return n; }
// Enough hands on a gathering duty already for what's short (each ant
// carries about 5): then it doesn't need this one, so ants spread out.
function covered(s, a, d, short){ return onDuty(s, d, a) >= Math.max(1, Math.ceil(short/5)); }
// How much a duty needs doing right now, for this ant (0: not at all).
function dutyNeed(s, a, d){
  const c = s.colony, raining = s.rain.on;
  if (DUTIES[d].out && raining && d !== 'hunt' && !has(s, 'nightsense')) return 0;
  if (d === 'food' && covered(s, a, d, c.cap - c.store)) return 0;
  if (d === 'water' && covered(s, a, d, c.waterCap - c.water)) return 0;
  if (d === 'stone' && covered(s, a, d, stoneGoal(s) - c.grit)) return 0;
  if (d === 'wood' && covered(s, a, d, woodGoal(s) - (c.wood || 0))) return 0;
  if (d === 'leaves' && covered(s, a, d, fungusCap(s) - (c.fungus || 0))) return 0;
  switch (d){
    case 'food': return c.store < c.cap - 1 ? 0.3 + Math.max(0, 1 - c.store/c.cap)*0.9 : 0;
    case 'water': return c.water < c.waterCap*0.9 ? 0.3 + (1 - c.water/c.waterCap)*0.9 : 0;
    case 'stone': return c.grit < stoneGoal(s) ? 0.3 + (1 - c.grit/stoneGoal(s))*0.9 : 0;
    case 'hunt':
      if (raining) return 0;
      if (CASTES[a.caste].fight >= 3) return preyNear(s, 60) ? (c.protein < 60 ? 0.9 : 0.4) : 0;
      // Hauling meat matters as much as protein is short (build 19).
      return s.items.some(f => (f.kind === 'protein' || f.kind === 'chitin') && f.amt > 0 && !heavy(f) && !f.carried && Math.hypot(f.x - c.ex, f.y - c.ey) < forageRange(s)) ? (c.protein < 30 ? 0.9 : c.protein < 100 ? 0.5 : 0.15) : 0;
    case 'build': return a.caste === 'builder' && buildWork(s) ? 1 : 0;
    case 'wood': return (c.wood || 0) < woodGoal(s) ? 0.3 + (1 - (c.wood || 0)/woodGoal(s))*0.8 : 0;
    case 'leaves': return a.caste === 'gardener' && fungusCap(s) && (c.fungus || 0) < fungusCap(s)*0.9 ? 0.6 + (1 - (c.fungus || 0)/fungusCap(s))*0.8 : 0; /* build 41: their own job first (leaves become food anyway) */
    case 'herd': return a.caste === 'rancher' && roomOf(s, 'dairy') ? 1 : 0;
    case 'heal': return a.caste === 'medic' && roomOf(s, 'infirmary') ? 1 : 0;
    case 'hang': return a.caste === 'replete' && roomOf(s, 'honeypot') ? 1 : 0;
    case 'tidy': return a.caste === 'undertaker' && roomOf(s, 'midden') ? 1 : 0;
    case 'nurse': return a.caste === 'nurse' && (c.eggs.length || c.eggQueue.length) ? 1 : 0;
    case 'guard': {
      const al = doorAlarm(s); if (al > 0.2 && (has(s, 'stridulation') || picked(s, 'soldier', 'alarm'))) return 2;
      if (al > 0.05) return 0.35 + Math.min(1, al);
      // Enough on guard already (half the fighters, at least two): free for other work.
      let out = 0, all = 0; for (const o of s.ants) if (o !== a && !o.team && CASTES[o.caste].fight >= 3 && !o.isPlayer){ all++; if (o.duty === 'guard' && (o.state === 'patrol' || o.state === 'fight' || o.goal === 'exit')) out++; }
      all++;
      return out < Math.max(2, Math.ceil(all*0.5)) ? 0.9 : 0;
    }
  }
  return 0;
}
// The first duty on its list that needs doing, past its threshold.
function chooseDuty(s, a, except){
  for (const [d, on] of jobsOf(s, a.caste)){
    if (!on || d === except) continue;
    const n = dutyNeed(s, a, d), thr = (has(s, 'hivemind') ? 0.5 : 1)*(INSIDE[d] ? 0 : d === 'guard' || d === 'hunt' && CASTES[a.caste].fight >= 3 ? a.thr.d : a.thr.f);
    if (n > thr) return d;
  }
  return null;
}
// What each kind is busy with right now, for the Jobs page.
function dutyCounts(s){
  const out = {};
  for (const a of s.ants){ if (a.team || a.isPlayer || a.state === 'dead') continue; const o = out[a.caste] || (out[a.caste] = { n: 0, idle: 0 });
    o.n++; const busy = a.follow ? 'crew' : a.state === 'build' ? 'build' : a.state === 'spoil' ? 'build' : a.state === 'in' ? (a.caste === 'nurse' && a.duty === 'nurse' ? 'nurse' : null) : a.duty || null;
    if (busy) o[busy] = (o[busy] || 0) + 1; else o.idle++; }
  return out;
}

// ---------- builder tasks ----------
// One builder per dig, fill or repair order, up to three on a room. A dig
// can only be worked from a dug neighbour, so chained orders wait their turn.
const ROOM_CREW = 3;
function reachable(s, x, y){ return nestField(s, x, y)[nidx(SHAFT,0)] < 9999; }
function taskSpot(s, a, task){
  const k = task[0];
  if (k === 'h') return reachable(s, SHAFT, 0) ? [SHAFT, 0] : null;
  if (k === 'j'){
    const job = s.colony.buildQueue[0]; if (!job) return null;
    // Spread the crew along the room's floor.
    const crew = s.ants.filter(b => b !== a && b.task === 'j').length;
    const x = job.x0 + Math.min(job.w-1, 1 + crew*2 % job.w), y = job.y0 + job.h - 1;
    return s.nest.cells[nidx(x,y)] && reachable(s, x, y) ? [x, y] : (reachable(s, job.x, job.y) ? [job.x, job.y] : null);
  }
  const [x, y] = task.slice(1).split(',').map(Number);
  if (k === 'f') return s.nest.cells[nidx(x,y)] && reachable(s, x, y) ? (isDugNeighbor(s, x, y) || [x, y]) : null;
  // Dig or repair: stand on a dug cell next to it that the shaft can reach. (Build 47: it used to try only the
  // first dug neighbour, so a cave-in that cut the nest in two, or a fill order, could never be mended.)
  // A spot the builder itself can reach comes first, so one walled in on the far side digs its own way out.
  const mine = a && a.nx != null ? nidx(Math.floor(a.nx), Math.floor(a.ny)) : -1; let fallback = null;
  for (const [dx,dy] of N4){ const nx = x+dx, ny = y+dy; if (nx<0||ny<0||nx>=NW||ny>=NH || !s.nest.cells[nidx(nx,ny)]) continue;
    const f = nestField(s, nx, ny); if (mine >= 0 && f[mine] < 9999) return [nx, ny]; if (!fallback && f[nidx(SHAFT,0)] < 9999) fallback = [nx, ny]; }
  return fallback;
}
function taskExists(s, task){
  const k = task[0]; if (k === 'j') return s.colony.buildQueue.length > 0;
  if (k === 'h') return (s.nest.spoil||0) > 0;
  if (k === 'd' && (s.nest.spoil||0) >= SPOIL_MAX) return false; // go haul instead
  const [x, y] = task.slice(1).split(',').map(Number);
  const list = k === 'd' ? s.nest.digOrders : k === 'f' ? s.nest.fillOrders : s.repairs;
  return list.some(o => o.x === x && o.y === y);
}
function builderTaskValid(s, a){
  if (!a.task || !taskExists(s, a.task)) return false;
  const spot = taskSpot(s, a, a.task); if (!spot) return false;
  if (a.task[0] !== 'j') a.taskCell = spot; // a neighbour may have opened up nearer
  return true;
}
function pickBuilderTask(s, a){
  a.task = null; a.taskCell = null;
  const claimed = new Map();
  for (const b of s.ants) if (b !== a && b.task) claimed.set(b.task, (claimed.get(b.task)||0) + 1);
  const cx = Math.floor(a.nx), cy = Math.floor(a.ny);
  const best = (list, prefix, goal) => {
    let pick = null, pd = Infinity;
    for (const o of list){ const t = prefix + o.x + ',' + o.y; if (claimed.get(t)) continue;
      const spot = taskSpot(s, a, t); if (!spot) continue;
      const d = Math.abs(spot[0]-cx) + Math.abs(spot[1]-cy); if (d < pd){ pd = d; pick = { t, spot, goal }; } }
    return pick;
  };
  const job = s.colony.buildQueue[0];
  const room = job && (claimed.get('j')||0) < ROOM_CREW ? (() => { const spot = taskSpot(s, a, 'j'); return spot ? { t: 'j', spot, goal: 'job' } : null; })() : null;
  const spoil = s.nest.spoil || 0, full = spoil >= SPOIL_MAX;
  const haul = spoil > (claimed.get('h')||0) && reachable(s, SHAFT, 0) ? { t: 'h', spot: [SHAFT, 0], goal: 'haul' } : null;
  const dig = full ? null : best(s.nest.digOrders, 'd', 'dig');
  const pick = best(s.repairs, 'r', 'repair')
    || (full ? haul : null)
    || (room && (!dig || a.id % 2 === 1) ? room : null)
    || dig || haul || best(s.nest.fillOrders, 'f', 'fill') || room;
  if (pick){ a.task = pick.t; a.taskCell = pick.spot; a.goal = pick.goal; }
}
function nestStep(s, a, speed, dt){
  // move a.nx,a.ny (cell coords, center = +0.5) toward a.ntx,a.nty along the dug field
  const gx = a.ntx + 0.5, gy = a.nty + 0.5;
  const cx = Math.floor(a.nx), cy = Math.floor(a.ny);
  if (cx === a.ntx && cy === a.nty){ const d = Math.hypot(gx - a.nx, gy - a.ny); if (d < 0.05){ a.nx = gx; a.ny = gy; if (a.exitTo && a.ntx === SHAFT && a.nty === 0){ const go = a.exitTo; a.exitTo = null; exitNest(s, a, go); } return true; } }
  const f = nestField(s, a.ntx, a.nty); const here = f[nidx(cx,cy)];
  if (here >= 9999){ return true; }
  // choose next cell
  let bx = cx, by = cy, bd = here;
  for (const [dx,dy] of N4){ const nx = cx+dx, ny = cy+dy; if (nx<0||ny<0||nx>=NW||ny>=NH) continue; const d = f[nidx(nx,ny)]; if (d < bd){ bd = d; bx = nx; by = ny; } }
  const tx = bx + 0.5, ty = by + 0.5; let ddx = tx - a.nx, ddy = ty - a.ny; const d = Math.hypot(ddx, ddy);
  const m = Math.min(d, speed/T*dt); if (d > 0){ ddx/=d; ddy/=d; a.nx += ddx*m; a.ny += ddy*m; a.dx = ddx; a.dy = ddy; }
  return false;
}
function note(s, msg){ s.player.msg = msg; }
function tickRain(s, dt){
  const r = s.rain; r.t += dt;
  // Thunder in the distance twenty seconds before it rains (build 14).
  if (!r.on && !r.warned && r.t >= r.next - 20 && s.queen.placed){ r.warned = true; s.events.push('rainsoon'); note(s, 'Thunder in the distance. Rain is coming: get your builders inside.'); }
  // Rain every 8 to 12 minutes (build 14: was every 3 to 5).
  if (!r.on && r.t >= r.next){ r.on = true; r.warned = false; r.t = 0; r.next = 480 + Math.random()*240; s.events.push('rain'); note(s, 'Rain! Trails wash out.' + (buildersInside(s) ? '' : ' Get a Builder inside.')); }
  else if (r.on){
    if (roomSlotIndex(s, 'cistern') >= 0) s.colony.water = Math.min(s.colony.waterCap, s.colony.water + 0.4*dt);
    if (r.t >= 30){ r.on = false; r.t = 0; if (!buildersInside(s) && s.queen.placed && canCave(s) && !has(s, 'chimneys') && !picked(s, 'builder', 'tunnelmaster')){ let fell = collapse(s, true); if (!has(s, 'insulation') && !picked(s, 'builder', 'shorer')) fell = collapse(s, true) || fell; if (fell) note(s, 'The rain caved in a tunnel.'); } }
  }
}
function buildersInside(s){ return s.ants.filter(a => a.caste==='builder' && a.team===0 && (a.state==='in' || a.state==='build')).length; }
/* Build 47: a young colony with no Builder yet (under 12 ants) can't be caved in; nobody could dig it out. */
function canCave(s){ return s.ants.some(b => b.caste==='builder' && b.team===0 && !b.dh) || antCount(s) >= 12; }
function tickRepairs(s){
  const c = s.colony;
  for (let i=s.repairs.length-1;i>=0;i--){ const rep = s.repairs[i], crew = s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.atWork && a.task === 'r'+rep.x+','+rep.y); rep.progress += crew.reduce((t, a) => t + workOf(s, a, 'r'), 0)*(has(s, 'beetles') ? 1.5 : 1); if (rep.progress >= 8){ for (const a of crew) gainXp(s, a, 2); dig(s, rep.x, rep.y); s.repairs.splice(i,1); c.repaired++; } }
}
function tickMaintenance(s, dt){
  const c = s.colony; if (!s.queen.placed) return;
  c.wearT = (c.wearT || 0) + dt; if (c.wearT < 1) return; c.wearT = 0;
  tickRepairs(s);
  if (s.t < 240) return;
  // Steady veterans count double; Shorers and Insulation make cave-ins rarer.
  const need = Math.ceil(dugCount(s)/40), b = buildersInside(s) + s.ants.filter(a => a.caste==='builder' && a.team===0 && (a.state==='in' || a.state==='build') && promo(s, a, 'steady')).length;
  const risk = 0.0045 * (picked(s, 'builder', 'shorer') ? 0.4 : 1) * (has(s, 'insulation') ? 0.5 : 1) * (roomLevel(s, 'midden') >= 3 && roomOf(s, 'midden') ? 0.67 : 1);
  if (!picked(s, 'builder', 'tunnelmaster') && canCave(s) && b < need && Math.random() < risk * (need - b)) { if (collapse(s, false)) note(s, 'A tunnel caved in. You need more Builders inside.'); }
  // Rove beetle guests (build 24) tidy loose spoil away, a load every 20 s.
  if (has(s, 'beetles') && (s.nest.spoil || 0) > 0 && Math.random() < 0.05) s.nest.spoil--;
  /* build 47: repairs moved to tickRepairs, which runs before the early-game gate */
}
function collapse(s, lowest){
  const n = s.nest; const cands = []; let maxy = 0;
  for (let y=1;y<NH;y++) for (let x=1;x<NW-1;x++) if (n.cells[nidx(x,y)] === 1) maxy = Math.max(maxy, y);
  for (let y=2;y<NH;y++) for (let x=1;x<NW-1;x++){ if (n.cells[nidx(x,y)] !== 1 || soilTier(y) >= 3) continue; /* build 42: the deep never caves in */ if (lowest && y < maxy-2) continue; if (s.repairs.some(r => r.x===x && r.y===y)) continue; const adj = isDugNeighbor(s, x, y); if (!adj) continue; cands.push([x,y,adj]); }
  if (!cands.length) return false; const [x,y,adj] = cands[Math.floor(Math.random()*cands.length)];
  n.cells[nidx(x,y)] = 0; n.ver++; s.repairs.push({ x, y, ax: adj[0], ay: adj[1], progress: 0 }); s.events.push('cavein'); return true;
}
function playerDig(s, cx, cy){
  const a = s.player.ant; if (!a || !s.player.inNest) return false; const px = Math.floor(a.nx), py = Math.floor(a.ny);
  if (Math.abs(cx-px) + Math.abs(cy-py) !== 1) return false; const i = s.repairs.findIndex(r => r.x===cx && r.y===cy); if (i < 0) return false;
  dig(s, cx, cy); s.repairs.splice(i, 1); s.colony.repaired++; gainXp(s, a, 2); return true;
}
function nearAlarm(s){ const w = s.world; let m = 0; for (let dy=-3;dy<=3;dy++) for (let dx=-3;dx<=3;dx++){ const x=w.ex+dx,y=w.ey+dy; if (x<0||y<0||x>=W||y>=H) continue; m = Math.max(m, s.alarm[idx(x,y)]); } return m; }

function rivalBrain(s, r, dt){
  if (!r.queenAlive) return;
  const RS = RIVALS[r.team - 1];
  r.raidT += dt; if (r.raidT < 10) return; r.raidT = 0;
  if (s.raidLive && ((s.raidStart || {}).team || 1) === r.team && !s.ants.some(a => a.team === r.team && a.state === 'raid')){ s.raidLive = false; s.colony.raidsBeaten++;
    // The battle report (build 15): what the raid cost on both sides.
    const R = s.raidStart || {}, lost = deathTotal(s.colony) - (R.lost || 0), killed = (r.deaths.war || 0) - (R.killed || 0), took = Math.round(s.colony.stolen - (R.stolen || 0)), crits = (s.colony.crits || 0) - (R.crits || 0);
    s.report = { kind: 'raid', lost, killed, took, crits, t: s.t }; s.events.push('report');
    s.player.msg = `Raid over. You lost ${lost} ant${lost === 1 ? '' : 's'}, killed ${killed} raider${killed === 1 ? '' : 's'}${crits > 0 ? ` (${crits} crit${crits === 1 ? '' : 's'})` : ''}${took > 0 ? `, and they carried off ${took} food` : ''}.`; }
  const mine = s.ants.filter(a => a.team===r.team && a.state!=='dead'); const foragers = mine.filter(a => a.caste==='forager').length, soldiers = mine.filter(a => a.caste==='soldier');
  // grow
  if (r.store >= 10 && r.eggQueue.length < (RS.swarm ? 4 : 2) && mine.length < Math.min(RS.max, (RS.swarm ? 30 : 12) + s.t/30)){ r.eggQueue.push(soldiers.length < foragers*RS.soldiers ? 'soldier' : 'forager'); r.store -= 4; }
  const revenge = r.revengeAt && s.t >= r.revengeAt;
  if (!RS.raids && !revenge) return;
  // raid when strong, not before 5 minutes, at most every 2 minutes
  r.raidCd = (r.raidCd || 0) - 10;
  const ourSoldiers = s.ants.filter(a => a.team===0 && CASTES[a.caste].fight >= 3).length;
  const idle = (revenge ? mine.filter(a => CASTES[a.caste].fight >= 3 || RS.swarm || RS.fierce || mine.length < 12) : soldiers).filter(a => a.state==='in' || a.state==='patrol');
  // Raids start at six minutes and grow: 3 soldiers, then one more every 2.5 minutes.
  const size = Math.min(14, 3 + Math.floor(Math.max(0, s.t - 360)/150));
  if (revenge && !s.raidLive && idle.length >= 3 && s.queen.placed && !s.lost){ const n = Math.min(idle.length, Math.max(4, size)); for (let i = 0; i < n; i++){ const a = idle[i]; if (a.state==='in') exitNest(s, a, 'raid'); else a.state = 'raid'; } r.revengeAt = null; s.raidLive = true; s.raidStart = { team: r.team, lost: deathTotal(s.colony), killed: r.deaths.war || 0, stolen: s.colony.stolen, crits: s.colony.crits || 0 }; s.player.msg = `The ${RS.name.toLowerCase()} strike back! ${n} of them march on your nest.`; s.events.push('raid'); return; }
  if (revenge && s.t > r.revengeAt + 300) r.revengeAt = null;
  if (!RS.raids) return;
  if (s.t > (RS.raidFrom || 360) && !s.raidLive && !isNight(s) && r.raidCd <= 0 && idle.length >= size && s.queen.placed && !s.lost){ r.raidCd = Math.max(90, 160 - s.t/30); let n = 0; for (const a of idle){ if (n++ >= size) break; if (a.state==='in') exitNest(s, a, 'raid'); else a.state = 'raid'; } s.raidLive = true; s.raidStart = { team: r.team, lost: deathTotal(s.colony), killed: r.deaths.war || 0, stolen: s.colony.stolen, crits: s.colony.crits || 0 }; s.player.msg = `Raid! ${size} ${r.team === 1 ? 'rivals are' : RS.name.toLowerCase() + ' are'} coming.`; s.events.push('raid'); }
}

// The spider roams the whole yard: landmark to landmark, past our nest every
// few legs, and now and then off the edge into the next area for a while.
// The spider (build 11.6): a hunter with a territory round its web in the
// Flowerbed. Resting at the web it is hidden (ants only notice it close up)
// and lunges at what wanders near; roaming, it stalks ants it sees, lunges,
// and gives up after a few seconds, so a running ant can still get away.
const SPIDER_REACH = 1.4*T, CAT_REACH = 1.8*T;
const SPIDER = { windup: 0.25, ambush: 4*T, see: 5*T, passing: 1.5*T, lunge: 0.8, lungeSpeed: 100, chaseSpeed: 40, roamSpeed: 16, giveUp: 6, tired: 4, home: 60 };
// For the first four minutes it keeps well away, so the opening is safe to learn.
const spiderNearNest = (s, x, y) => Math.hypot(x/T - (s.world.ex+0.5), y/T - (s.world.ey+0.5)) < (s.t < 240 ? 12 : 6) || Math.hypot(x/T - (s.world.rx+0.5), y/T - (s.world.ry+0.5)) < 4;
// Room round each tile: tiles to the nearest rock, wall or fence (capped at
// 6). The spider is about five tiles across, so it keeps two clear (build
// 17: it used to hug rocks by its middle tile and its body went through).
function clearOf(s){
  const w = s.world; if (w.clear) return w.clear;
  const cl = new Uint8Array(W*H).fill(6), q = new Int32Array(W*H); let qh = 0, qt = 0;
  for (let i = 0; i < W*H; i++) if (w.blocked[i]){ cl[i] = 0; q[qt++] = i; }
  while (qh < qt){ const i = q[qh++], x = i % W, y = (i - x)/W, v = cl[i] + 1; if (v >= 6) continue;
    for (const [dx, dy] of N8){ const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny*W + nx; if (cl[j] > v){ cl[j] = v; q[qt++] = j; } } }
  return (w.clear = cl);
}
const SPIDER_ROOM = 3;
const spiderRoom = (s, x, y) => { const tx = Math.floor(x/T), ty = Math.floor(y/T); return tx < 0 || ty < 0 || tx >= W || ty >= H ? 6 : clearOf(s)[ty*W + tx]; };
// Plan a walk to (px, py) around rocks and clear of the nests; rest there.
// Legs chain on from the last waypoint already planned.
function spiderRoute(s, sp, px, py, rest){
  const last = sp.route.length ? sp.route[sp.route.length - 1] : [sp.x, sp.y], sx = Math.floor(last[0]/T), sy = Math.floor(last[1]/T), cl = clearOf(s);
  const avoid = (x, y) => spiderNearNest(s, (x+0.5)*T, (y+0.5)*T) || (cl[y*W + x] < SPIDER_ROOM && Math.hypot(x - sx, y - sy) > 3);
  const path = findPath(s, sx, sy, Math.floor(px/T), Math.floor(py/T), avoid);
  for (const [x, y] of path) sp.route.push([(x+0.5)*T, (y+0.5)*T]);
  if (rest && sp.route.length) sp.route[sp.route.length-1][2] = rest;
}
function spiderPlan(s, sp){
  const w = s.world; sp.legs = (sp.legs||0) + 1; sp.route = [];
  sp.passing = false;
  if (sp.legs % 4 === 0 && s.t >= 240){ // stroll past the nest along an arc 7.5 tiles out, not hunting
    const a0 = Math.random()*Math.PI*2, dir = Math.random() < 0.5 ? 1 : -1;
    const a = a0; spiderRoute(s, sp, (w.ex+0.5+Math.cos(a)*7.5)*T, (w.ey+0.5+Math.sin(a)*7.5)*T);
    for (let k=1;k<5;k++){ const t = a0 + dir*k*0.5, x = (w.ex+0.5+Math.cos(t)*7.5)*T, y = (w.ey+0.5+Math.sin(t)*7.5)*T; if (spiderRoom(s, x, y) >= SPIDER_ROOM) spiderRoute(s, sp, x, y); }
    sp.passing = true; return;
  }
  if (Math.random() < 0.45){ // back to its web in the Flowerbed
    const a = Math.random()*Math.PI*2; spiderRoute(s, sp, (w.web.x+0.5+Math.cos(a)*2.5*SCALE)*T, (w.web.y+(2+Math.abs(Math.sin(a))*2)*SCALE)*T, 30 + Math.random()*40); return;
  }
  if (sp.legs > 6 && Math.random() < 0.15){ // over the fence for a while
    // Walk to the fence on a path, then over it.
    const side = Math.floor(Math.random()*3), u = 0.2 + Math.random()*0.6;
    const out = side===0 ? [-2, u*H] : side===1 ? [W+2, u*H] : [u*W, H+2];
    const inn = [Math.max(3.5, Math.min(W-3.5, out[0])), Math.max(3.5, Math.min(H-3.5, out[1]))];
    spiderRoute(s, sp, inn[0]*T, inn[1]*T);
    sp.route.push([out[0]*T, out[1]*T]); sp.leaving = true; return;
  }
  for (let tries=0; tries<60; tries++){
    // Somewhere in its territory: within SPIDER.home tiles of the web.
    const ang = Math.random()*Math.PI*2, dd = 8 + Math.random()*(SPIDER.home - 8);
    const x = Math.floor(w.web.x + Math.cos(ang)*dd), y = Math.floor(w.web.y + Math.sin(ang)*dd);
    if (x < 3 || y < 3 || x >= W-3 || y >= H-3) continue;
    if (w.blocked[idx(x,y)] || w.home[idx(x,y)] < (s.t < 240 ? 14 : 7) || w.rhome[idx(x,y)] < 5) continue;
    if (Math.hypot((x+0.5)*T - sp.x, (y+0.5)*T - sp.y) < 12*T) continue;
    spiderRoute(s, sp, (x+0.5)*T, (y+0.5)*T); return;
  }
}
// Walk in from a random edge with the hp it left with.
function spiderEnter(s, hp){
  const side = [0, 1, 3][Math.floor(Math.random()*3)],  // never through the house wall
    u = 0.2 + Math.random()*0.6;
  const out = side===0 ? [-2, u*H] : side===1 ? [W+2, u*H] : side===2 ? [u*W, -2] : [u*W, H+2];
  const inn = side===0 ? [5, u*H] : side===1 ? [W-5, u*H] : side===2 ? [u*W, 5] : [u*W, H-5];
  s.spider = { cost0: s.colony.deaths.spider || 0, x: out[0]*T, y: out[1]*T, hp, maxHp: 150, bite: 0, legs: 0, route: [[inn[0]*T, inn[1]*T]], entering: true, stuck: 0 };
  if (!s.player.msg) s.player.msg = 'The spider is back, walking in from the edge of the yard.';
}
function stepSpider(s, dt){
  const sp = s.spider; if (!sp) return;
  const free = sp.leaving || sp.entering;
  // Passing the nest it only strikes at ants that walk right into it.
  // Resting at its web it waits in ambush and only strikes close.
  if (sp.rest > 0) sp.rest -= dt;
  if (sp.tired > 0) sp.tired -= dt;
  // Build 16: after a kill it stops to eat; three meals and it is full, and
  // goes back to its web to sleep it off. Full, it hunts nothing.
  if (sp.eatT > 0){ sp.eatT -= dt; sp.mode = 'eat'; sp.chaseT = 0; return; }
  if (sp.full > 0){ sp.full -= dt; if (sp.full <= 0) sp.meals = 0; }
  let target = null, bd = sp.passing ? SPIDER.passing : sp.rest > 0 ? SPIDER.ambush : SPIDER.see;
  // Ants on the nest's doorstep are out of bounds, so it never camps the entrance.
  if (!free && !(sp.tired > 0) && !(sp.full > 0)) for (const a of s.ants){ if (a.state==='dead'||a.state==='in'||a.state==='build'||a.state==='nest') continue; if (spiderNearNest(s, a.x, a.y)) continue; const d = Math.hypot(a.x-sp.x, a.y-sp.y); if (d < bd){ bd = d; target = a; } }
  // A chase: a lunge, then a steady run; after a few seconds it gives up.
  // It crouches for a moment first (the tell), then lunges.
  if (target){ if (!sp.chaseT) { sp.chaseT = 0; sp.rest = 0; } sp.chaseT += dt; if (sp.chaseT > SPIDER.giveUp + SPIDER.windup){ sp.chaseT = 0; sp.tired = SPIDER.tired; target = null; } }
  else sp.chaseT = 0;
  if (target && sp.chaseT < SPIDER.windup){ sp.mode = 'crouch'; sp.dx = target.x - sp.x; sp.dy = target.y - sp.y; return; }
  sp.mode = target ? (sp.chaseT < SPIDER.windup + SPIDER.lunge ? 'lunge' : 'chase') : sp.rest > 0 || sp.full > 0 ? 'rest' : 'walk';
  if (!sp.route || !sp.route.length) spiderPlan(s, sp);
  if (!sp.route.length && !target){ sp.rest = 1; return; } // no plan this time: wait and try again
  let gx, gy;
  if (target){ gx = target.x; gy = target.y; }
  else if (sp.rest > 0) return;
  else { [gx, gy] = sp.route[0];
    // Give up on a waypoint it can't reach (circling a rock) after a while.
    sp.legT = (sp.legT||0) + dt; if (sp.legT > 60 && !sp.entering){ sp.route.shift(); sp.legT = 0; if (sp.leaving){ sp.leaving = false; sp.route = []; } return; }
    if (Math.hypot(gx-sp.x, gy-sp.y) < T*0.6){ const done = sp.route.shift(); sp.stuck = 0; sp.legT = 0; if (done[2]) sp.rest = done[2];
    if (sp.leaving && !sp.route.length){ s.spiderAway = { hp: sp.hp, t: 40 + Math.random()*40 }; s.spider = null; return; }
    if (sp.entering) sp.entering = false;
    return; } }
  if (sp.slowT > 0) sp.slowT -= dt;
  if (sp.stunned > s.t) return; // build 32: held in a mandible lock
  const speed = (target ? (sp.mode === 'lunge' ? SPIDER.lungeSpeed : SPIDER.chaseSpeed) : SPIDER.roamSpeed)*SURF*(sp.slowT > 0 ? 0.5 : 1)*(isNight(s) ? 1.2 : 1); /* (build 43: a night hunter) */ const ddx = gx - sp.x, ddy = gy - sp.y; if (Math.hypot(ddx, ddy) < 1) return;
  const base = Math.atan2(ddy, ddx);
  // Steer around rocks: straight, then increasingly wide detours.
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]){
    const nx = sp.x + Math.cos(base+off)*speed*dt, ny = sp.y + Math.sin(base+off)*speed*dt;
    const tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    // The fence is two tiles deep; a spider coming or going climbs over it.
    const inside = tx>1 && ty>0 && tx<W-2 && ty<H-2;
    if (inside ? s.world.blocked[idx(tx,ty)] : !free) continue;
    // Keep its body off rocks: never into a tighter spot than two tiles' room,
    // unless it is already squeezed in somewhere (then only to roomier ground).
    if (inside && !free){ const room = spiderRoom(s, nx, ny); if (room < SPIDER_ROOM && room < spiderRoom(s, sp.x, sp.y)) continue; }
    if (spiderNearNest(s, nx, ny)) continue;
    sp.x = nx; sp.y = ny; sp.stuck = 0; return;
  }
  sp.stuck = (sp.stuck||0) + dt;
  if (sp.stuck > 2 && !target){ sp.route.shift(); sp.stuck = 0; sp.legT = 0; }
}
function stepCat(s, dt){
  const ct = s.cat; if (!ct) return; ct.wander -= dt; if (ct.wander <= 0){ ct.wander = 4 + Math.random()*4; const ang = Math.random()*Math.PI*2; ct.gx = ct.x + Math.cos(ang)*3*T; ct.gy = ct.y + Math.sin(ang)*3*T; }
  let ddx = ct.gx - ct.x, ddy = ct.gy - ct.y; const d = Math.hypot(ddx, ddy);
  if (ct.slowT > 0) ct.slowT -= dt;
  if (d > 1){ ddx/=d; ddy/=d; const cs = 8*SURF*dt*(ct.slowT > 0 ? 0.5 : 1), nx = ct.x + ddx*cs, ny = ct.y + ddy*cs; if (walk(s, Math.floor(nx/T), Math.floor(ny/T))){ ct.x = nx; ct.y = ny; } else ct.wander = 0; }
  // attacked by soldiers/venom on patrol/fight nearby
  for (const a of s.ants){ if (a.team || a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest' || a.state==='away') continue; if (CASTES[a.caste].fight < 3 && !a.follow && !a.isPlayer) continue; const dd = Math.hypot(a.x-ct.x, a.y-ct.y); if (dd < CAT_REACH*reachOf(s, a)){ const dmg = bite(s, a, 'cat')*dt*0.5; ct.hp -= dmg; ct.hitT = s.t; spark(s, a, (a.x + ct.x)/2, (a.y + ct.y)/2, 0); gainXp(s, a, dmg/3); stingSlow(s, a, ct); } else if (dd < 5*T && CASTES[a.caste].fight >= 3 && a.state === 'patrol'){ a.state = 'fight'; a.goal = 'cat'; chooseToward(s, a, ct.x, ct.y); } }
  // fight-state soldiers targeting cat
  for (const a of s.ants){ if (a.goal === 'cat' && a.state === 'fight'){ if (Math.hypot(a.x-ct.x, a.y-ct.y) > CAT_REACH*0.8){ if (stepTo(a, a.tx, a.ty, paceOf(s, a, CASTES[a.caste].speed), dt)) chooseToward(s, a, ct.x, ct.y); } } }
}

function stepPlayer(s, a, dt, enemiesNear){
  const P = s.player, w = s.world, C = CASTES[a.caste];
  if (P.inNest){
    // walk inside the nest
    if (P.ntx != null){ a.ntx = P.ntx; a.nty = P.nty; }
    const arrived = nestStep(s, a, 70, dt);
    if (arrived && P.ntx != null && Math.floor(a.nx) === SHAFT && Math.floor(a.ny) === 0 && P.exiting){ P.exiting = false; P.ntx = null; P.inNest = false; a.tx = w.ex; a.ty = w.ey; a.x = (w.ex+0.5)*T; a.y = (w.ey+0.5)*T; a.state = 'player'; P.tx = null; return; }
    if (arrived) P.ntx = null;
    P.hunger = Math.min(100, P.hunger + 10*dt);
    return;
  }
  if (a.knockT > 0){ knock(s, a, dt); P.pathKey = -1; return; }
  let moving = false;
  // Lifting a treat: the crew sets the pace, and too small a crew drops it.
  let speed = youPace(s)*SURF*(a.slowT > 0 ? 0.5 : 1)*(a.webT > s.t ? 0 : 1)*(has(s, 'highways') && s.trail[idx(Math.max(0, Math.min(W-1, a.tx)), Math.max(0, Math.min(H-1, a.ty)))] >= 0.3 ? 1.25 : 1);
  if (a.slowT > 0) a.slowT -= dt;
  if (P.big){ const crew = crewAt(s), need = FOODS[P.big.type].crew;
    if (crew < need){ dropBig(s); P.msg = `Too heavy: ${crew} of ${need} ants. Recruit more.`; }
    else speed = Math.min(70, 30 + 6*(crew - need))*SURF*(heldFx(s, 'crew') ? 1.3 : 1); }
  if (P.tx != null){
    // Walk around rocks: follow a path over the tile grid toward the tapped point.
    const gx = Math.floor(P.tx/T), gy = Math.floor(P.ty/T), key = gx*1000 + gy;
    if (P.pathKey !== key){ P.path = findPath(s, Math.floor(a.x/T), Math.floor(a.y/T), gx, gy); P.pathKey = key; }
    const path = P.path || [];
    while (path.length > 1 && Math.hypot((path[0][0]+0.5)*T - a.x, (path[0][1]+0.5)*T - a.y) < 4) path.shift();
    let wx = P.tx, wy = P.ty;
    const last = path[path.length-1], reachable = !last || (last[0] === gx && last[1] === gy);
    if (path.length > 1 || !reachable){ wx = (path[0][0]+0.5)*T; wy = (path[0][1]+0.5)*T; }
    let ddx = wx - a.x, ddy = wy - a.y; const d = Math.hypot(ddx, ddy);
    if (d > 2){ ddx/=d; ddy/=d; const m = Math.min(d, speed*dt); const nx = a.x + ddx*m, ny = a.y + ddy*m;
      if (walk(s, Math.floor(nx/T), Math.floor(ny/T))){ a.x = nx; a.y = ny; moving = true; a.dx = ddx; a.dy = ddy; }
      else P.pathKey = -1; // nudged off the path: plan again
    } else if (!P.holding && path.length <= 1){ P.tx = null; P.path = null; P.pathKey = -1; }
  }
  a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T);
  if (P.big){ P.big.x = a.tx; P.big.y = a.ty; P.big.px = a.x + a.dx*8; P.big.py = a.y + a.dy*8; }
  P.hunger -= (moving ? 1.3 : 0.3)*dt*(picked(s, 'you', 'stomach') ? 0.5 : 1);
  const nearHome = Math.hypot(a.tx - w.ex, a.ty - w.ey) < 1.6;
  let fed = nearHome; if (!fed) for (const o of s.ants){ if (o !== a && !o.team && o.state === 'return' && o.carry && o.kind==='food' && Math.hypot(o.x-a.x, o.y-a.y) < 1.2*T){ fed = true; break; } }
  if (fed && P.hunger < 100) P.hunger = Math.min(100, P.hunger + 20*dt);
  if (P.hunger <= 0){ if (has(s, 'stomach')) P.hunger = 1; else { killAnt(s, a, 'hunger'); return; } }
  if (moving && (P.mark || a.carry)){ const i = idx(a.tx, a.ty); s.trail[i] = Math.min(5, s.trail[i] + 2.5*dt); s.hot.add(i); }
  if (a.carry && nearHome){ deposit(s, a); }
  if (P.big && nearHome) deliverBig(s);
  // fight: player bites enemies / cat adjacent
  const pm = Math.max(youHp(s), maxHp(s, a)), yb = youL(s) >= 3 ? 1.5 : 1;
  // Build 27: you duel too, a swing every 0.6 s, at twice an ant's bite; your rolls show by your health.
  const en = enemiesNear(a, 1); if (en.length){ const o = en.find(q => q.id === a.foeId) || en[0]; a.foeId = o.id; a.rollT = (a.rollT || 0) - dt; if (a.rollT <= 0){ a.rollT = 0.6; swing(s, a, o, 2*yb); } } else { a.foeId = 0; if (a.hp < pm) a.hp = Math.min(pm, a.hp + 1*dt); }
  if (a.burnT > 0){ a.burnT -= dt; a.hp -= dt/3*0.6; if (a.hp <= 0){ killAnt(s, a, 'fireants'); return; } }
  if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < CAT_REACH){ const dmg = bite(s, a, 'cat')*yb*dt; s.cat.hp -= dmg; s.cat.hitT = s.t; spark(s, a, (a.x + s.cat.x)/2, (a.y + s.cat.y)/2, 0); gainXp(s, a, dmg/3); }
  if (P.enterReq && nearHome){ P.enterReq = false; P.inNest = true; P.tx = null; a.nx = SHAFT+0.5; a.ny = 0.5; a.ntx = SHAFT; a.nty = 0; P.ntx = null; a.state = 'nest'; }
}

// ---------- player / UI actions ----------
function queenDig(s, cx, cy){
  const q = s.queen; if (s.phase !== 'dig' || q.placed) return false;
  if (Math.abs(cx - q.x) + Math.abs(cy - q.y) !== 1) return false;
  if (cx<1||cy<0||cx>=NW-1||cy>=NH) return false;
  if (q.energy <= 0) return false;
  if (!s.nest.cells[nidx(cx,cy)]){ dig(s, cx, cy); q.energy--; }
  q.x = cx; q.y = cy; return true;
}
function buildNest(s){
  const q = s.queen; if (q.placed) return false; if (q.y < 2) return false;
  const x0 = Math.max(1, Math.min(NW-5, q.x-1)), y0 = Math.max(1, Math.min(NH-3, q.y-1));
  const r = carveRoom(s, { x0, y0, w:4, h:3 }, 'queen'); q.room = r; q.placed = true; q.x = x0+1; q.y = y0+1; s.phase = 'play';
  s.colony.eggQueue.push('forager'); s.player.pending = true; s.player.msg = '';
  return true;
}
function actionLabel(s){ const a = s.player.ant, P = s.player; if (!a || P.inNest) return null; if (P.big) return 'Set down'; if (a.carry) return 'Drop'; const f = itemAt(s, a.tx, a.ty); if (f && heavy(f)) return `Lift ${crewAt(s)}/${FOODS[f.type].crew}`; if (f) return 'Pick up'; return null; }
function doAction(s){
  const a = s.player.ant, P = s.player; if (!a || P.inNest) return;
  if (P.big){ dropBig(s); return; }
  if (a.carry){ const f = s.items.find(x => x.x===a.tx && x.y===a.ty && x.kind===a.kind && !heavy(x)); if (f) f.amt += a.carry; else s.items.push({ x:a.tx, y:a.ty, amt:a.carry, kind:a.kind, type: a.kind==='food'?(FOODS[a.itype] && !FOODS[a.itype].crew ? a.itype : 'crumb'):a.kind==='water'?'dew':a.kind==='grit'?'pebble':'spider' }); a.carry = 0; return; }
  const f = itemAt(s, a.tx, a.ty);
  if (f && heavy(f)){ const crew = crewAt(s), need = FOODS[f.type].crew;
    if (crew >= need){ P.big = f; f.carried = true; P.msg = 'Lifted! Walk it home; your crew carries it with you.'; }
    else P.msg = `Too heavy: ${crew} of ${need} ants. Recruit more.`;
    return; }
  if (f){ const take = Math.min(picked(s, 'you', 'bigjaws') ? 8 : 5, f.amt); f.amt -= take; a.carry = take; a.kind = f.kind; a.itype = f.type; }
}
// You plus every recruited ant within three tiles.
// Build 26: attack on purpose (Mark: "you recruit everybody and then you attack on purpose... you hover
// over an enemy and it causes ants to begin a combat where they just bite at it"). With a crew, point at an
// enemy: the crew leaves your side, charges it and bites until it falls, then falls back in.
const ATTACK_LEASH = 22; // tiles from you a crew will chase before giving up
function enemyAt(s, x, y){
  let best = null, bd = Infinity;
  const take = (kind, ref, ox, oy, r, name) => { const d = Math.hypot(ox - x, oy - y) / r; if (d < 1 && d < bd){ bd = d; best = { kind, ref, name }; } };
  for (const k in s.bosses || {}){ const b = s.bosses[k]; if (!b.dead) take('boss', k, b.x, b.y, (BOSSES[k].r + 1.5)*T, BOSSES[k].name); }
  if (s.spider) take('spider', 0, s.spider.x, s.spider.y, 3.5*T, 'the spider');
  if (s.cat) take('cat', 0, s.cat.x, s.cat.y, 3*T, 'the caterpillar');
  for (const b of s.critters || []) if (b.hp > 0) take('bug', b.id, b.x, b.y, 2*T, 'the ' + (BUGS[b.kind] ? BUGS[b.kind].name : b.kind));
  for (const q of s.stalks || []) if (!q.gone) take('stalk', q.id, q.x, q.y, 2*T, 'the stalk');
  { const wb = s.bosses && s.bosses.widow; if (wb && !wb.dead && wb.web && !wb.grounded) wb.web.anchors.forEach((an, i) => { if (an.hp > 0) take('anchor', i, an.x, an.y, 1.6*T, 'a web anchor'); }); }
  for (const a of s.ants) if (outside(a) && (a.team || a.zombie)) take('ant', a.id, a.x, a.y, 1.4*T, a.zombie ? 'the infected ant' : a.champion ? a.name : 'the ' + rspec(a).name.toLowerCase().replace(/s$/, ''));
  return best;
}
function attackTarget(s){
  const A = s.player.attack; if (!A) return null;
  if (A.kind === 'boss'){ const b = (s.bosses || {})[A.ref]; return b && !b.dead ? b : null; }
  if (A.kind === 'door'){ const r = s.rivals[A.ref - 1]; return r && r.queenAlive && s.myRaid ? { x: (r.ex + 0.5)*T, y: (r.ey + 0.5)*T } : null; }
  if (A.kind === 'anchor'){ const wb = s.bosses && s.bosses.widow; const an = wb && !wb.dead && !wb.grounded && wb.web && wb.web.anchors[A.ref]; return an && an.hp > 0 ? an : null; }
  if (A.kind === 'spider') return s.spider || null;
  if (A.kind === 'cat') return s.cat || null;
  if (A.kind === 'bug') return (s.critters || []).find(b => b.id === A.ref && b.hp > 0) || null;
  if (A.kind === 'stalk') return (s.stalks || []).find(q => q.id === A.ref && !q.gone) || null;
  return s.ants.find(a => a.id === A.ref && outside(a)) || null;
}
// How close the crew stands to bite it.
function attackReach(s, A){ return A.kind === 'anchor' ? 0.8*T : A.kind === 'door' ? 1.2*T : A.kind === 'boss' ? (BOSSES[A.ref].r + 0.5)*T : A.kind === 'spider' ? SPIDER_REACH*0.8 : A.kind === 'cat' ? CAT_REACH*0.8 : A.kind === 'bug' ? 0.9*T : A.kind === 'stalk' ? 1.2*T : 0.5*T; }
const crewSize = s => s.ants.filter(o => o.follow && o.state === 'follow').length;
function crewAttack(s, x, y){
  const P = s.player; if (!P.ant || P.inNest || !crewSize(s)) return false;
  const e = enemyAt(s, x, y); if (!e) return false;
  if (P.attack && P.attack.kind === e.kind && P.attack.ref === e.ref) return true;
  P.attack = { kind: e.kind, ref: e.ref, name: e.name, t: s.t };
  P.msg = `Your crew charges ${e.name}!`; s.seen.attacked = true; s.events.push('attack'); return true;
}
// Build 29: crew orders (Mark picked "hold, formations, splitting"). Hold: the crew plants itself at a
// spot and guards a few tiles round it, fighting whatever comes in. Split: half holds, half follows.
// Follow: the held crew comes back to you from anywhere.
const HOLD_R = 5; // tiles a held crew guards round its spot
function crewHold(s, x, y, half){
  const P = s.player; if (!P.ant || P.inNest) return 0;
  let crew = s.ants.filter(o => o.follow && o.state === 'follow');
  if (!crew.length && !half) crew = s.ants.filter(o => o.follow && o.state === 'hold'); // no one following: move the held crew
  const pick = half ? crew.filter((o, i) => i % 2 === 0) : crew; if (!pick.length) return 0;
  const tx = Math.floor(x/T), ty = Math.floor(y/T);
  pick.forEach((o, i) => { const a = (i / pick.length)*Math.PI*2, rr = pick.length > 1 ? 0.9*T : 0; o.state = 'hold'; o.holdX = x + Math.cos(a)*rr; o.holdY = y + Math.sin(a)*rr; o.holdCX = x; o.holdCY = y; o.foeId = 0; o.goal = null; o.recall = false; });
  if (P.attack && !crewSize(s) && P.attack.kind !== 'door') P.attack = null;
  P.msg = half ? `${pick.length} of your crew hold here; the rest stay with you.` : `Your crew holds ${Math.hypot(x - P.ant.x, y - P.ant.y) > 2*T ? 'there' : 'here'}: they guard ${HOLD_R} tiles round it.`;
  s.seen.held = true; return pick.length;
}
function crewFollow(s){
  const P = s.player; if (!P.ant || P.inNest) return 0; let n = 0;
  for (const o of s.ants) if (o.follow && o.state === 'hold'){ o.state = 'follow'; o.recall = true; o.foeId = 0; n++; }
  if (n) P.msg = `${n} of your crew come back to you.`;
  return n;
}
const heldCount = s => s.ants.filter(o => o.follow && o.state === 'hold').length;
// Build 39: zones taken. Each second, any zone whose guardian has fallen is marked; all 13 ends Phase 1.
function zonesTaken(s){ return ZONES.filter(z => (s.colony.zones || {})[z.key] != null).length; }
function tickZones(s, dt){
  s.zoneT = (s.zoneT || 0) + dt; if (s.zoneT < 1) return; s.zoneT = 0;
  const c = s.colony; if (!c.zones) c.zones = {};
  { const was = s.capWas ?? c.cap; c.cap = s.capWas = storeCap(s); if (c.cap < was) c.store = Math.min(c.store, c.cap); } // build 40: kept current every second (repletes hanging, outposts sharing the store); build 47: a cap that shrinks (outposts lost) takes the overflow with it
  for (const z of ZONES){ if (c.zones[z.key] != null || !z.done(s)) continue;
    c.zones[z.key] = s.t; const n = zonesTaken(s);
    s.zoneTaken = { key: z.key, t: s.t, n }; s.events.push('zone');
    s.player.msg = `Zone taken: ${z.name} (${n} of ${ZONES.length}).${n < ZONES.length ? '' : ' The whole yard is yours!'}`;
    if (n >= ZONES.length && !s.phase1){ s.phase1 = { t: s.t }; s.events.push('phase1'); } }
}
function tickAttack(s){
  const P = s.player, A = P.attack; if (!A) return;
  const o = attackTarget(s), a = P.ant;
  if (!a || P.inNest || !crewSize(s)){ P.attack = null; return; }
  if (!o && A.kind === 'door'){ P.attack = null; return; }
  if (!o){ P.attack = null; P.msg = `${A.name.replace(/^the /, 'The ').replace(/^./, ch => ch.toUpperCase())} is down. Your crew falls back in.`; s.events.push('attackdone'); return; }
  if (Math.hypot(o.x - a.x, o.y - a.y) > ATTACK_LEASH*T){ P.attack = null; P.msg = 'Too far: your crew falls back in.'; if (s.myRaid && s.myRaid.phase === 'breach') endRaid(s, 'called off'); }
}
function crewAt(s){ const a = s.player.ant; if (!a) return 0; let n = 1; for (const o of s.ants) if (o.follow && o.state !== 'dead' && Math.hypot(o.x-a.x, o.y-a.y) < 3*T) n++; return n; }
function dropBig(s){ const b = s.player.big; if (!b) return; b.carried = false; delete b.px; delete b.py; s.player.big = null; }
function deliverBig(s){
  const P = s.player, b = P.big, c = s.colony; P.big = null; b.carried = false;
  const put = Math.min(Math.max(0, c.cap - c.store), b.amt), lost = b.amt - put; c.store += put; c.delivered[0] += put; c.foodTotal += put; c.treats++;
  const sweet = FOODS[b.type].sweet ? Math.round(b.amt*0.3) : 0; if (sweet) addSugar(s, sweet); b.amt = 0;
  for (const o of s.ants) if (!o.team && (o.follow || o.isPlayer)) gainXp(s, o, 8);
  discover(s, b.type);
  P.msg = lost >= 1 ? `${Math.round(put)} food stored, ${Math.round(lost)} wasted: the store was full.${c.cap < 150 ? ' A Food store holds 150.' : ''}` : `Your crew hauls in the ${FOODS[b.type].name}: +${Math.round(put)} food${sweet ? `, +${sweet} 🍯 sugar` : ''}.`;
  s.events.push('bighaul');
}
// Shortest walk over the tile grid (8 directions, no corner cutting, off the
// antlion pits' bottoms), smoothed to straight runs. If the goal can't be
// reached, it ends at the closest reachable tile.
function findPath(s, sx, sy, gx, gy, avoid){
  const w = s.world, ok = (x, y) => walk(s, x, y) && w.pit[idx(x,y)] !== 2 && !(avoid && avoid(x, y));
  if (!ok(sx, sy)) return [[gx, gy]];
  // Search a box round start and goal, not the whole yard.
  const M = 48, bx0 = Math.max(0, Math.min(sx, gx) - M), by0 = Math.max(0, Math.min(sy, gy) - M), bw = Math.min(W, Math.max(sx, gx) + M + 1) - bx0, bh = Math.min(H, Math.max(sy, gy) + M + 1) - by0;
  const inBox = (x, y) => x >= bx0 && y >= by0 && x < bx0 + bw && y < by0 + bh, li = (x, y) => (y - by0)*bw + (x - bx0);
  const prev = new Int32Array(bw*bh).fill(-1), q = new Int32Array(bw*bh); let qh = 0, qt = 0;
  const start = li(sx, sy); prev[start] = start; q[qt++] = start;
  let best = start, bd = Math.hypot(sx-gx, sy-gy);
  while (qh < qt){ const i = q[qh++], lx = i % bw, x = lx + bx0, y = (i - lx) / bw + by0;
    if (x === gx && y === gy){ best = i; bd = 0; break; }
    for (const [dx,dy] of N8){ const nx = x+dx, ny = y+dy; if (!inBox(nx, ny) || !ok(nx, ny)) continue; if (dx && dy && (!ok(x+dx, y) || !ok(x, y+dy))) continue;
      const j = li(nx, ny); if (prev[j] >= 0) continue; prev[j] = i; q[qt++] = j;
      const d = Math.hypot(nx-gx, ny-gy); if (d < bd){ bd = d; best = j; } } }
  const tiles = []; for (let i = best; i !== start; i = prev[i]) tiles.push([i % bw + bx0, Math.floor(i / bw) + by0]); tiles.reverse();
  if (!tiles.length) return [[sx, sy]];
  // String-pull: from each anchor, jump to the farthest tile in clear sight.
  const out = []; let from = [sx, sy], k = 0;
  while (k < tiles.length){ let j = tiles.length - 1; while (j > k && !clearLine(s, from, tiles[j], avoid)) j--; out.push(tiles[j]); from = tiles[j]; k = j + 1; }
  return out;
}
function clearLine(s, a, b, avoid){
  const x0 = (a[0]+0.5)*T, y0 = (a[1]+0.5)*T, x1 = (b[0]+0.5)*T, y1 = (b[1]+0.5)*T, n = Math.ceil(Math.hypot(x1-x0, y1-y0)/4);
  for (let k = 1; k < n; k++){ const x = x0 + (x1-x0)*k/n, y = y0 + (y1-y0)*k/n;
    for (const [ox, oy] of [[3,3],[-3,3],[3,-3],[-3,-3]]){ const tx = Math.floor((x+ox)/T), ty = Math.floor((y+oy)/T); if (!walk(s, tx, ty) || s.world.pit[idx(tx,ty)] === 2 || (avoid && avoid(tx, ty))) return false; } }
  return true;
}
// The Lawn's mower: a warning, then a blade sweeping the whole Lawn north to
// south, killing anything in the grass and shredding trails and seeds.
function tickMower(s, dt){
  const m = s.mower, P = s.player, L = s.world.lawn; if (!s.queen.placed) return; m.t += dt;
  if (m.state === 'idle'){ if (s.t >= m.next && isNight(s)) m.next = s.t + untilTurn(s) + 90 + Math.random()*90; /* build 43: people mow a while after dawn, not at first light */ if (s.t >= m.next && !isNight(s)){ m.state = 'warn'; m.t = 0; s.events.push('mower'); P.msg = 'The mower is coming! Get off the Lawn.'; } return; }
  if (m.state === 'warn'){ if (m.t >= (heldFx(s, 'mower') ? 16 : 8)){ m.state = 'cut'; m.t = 0; m.y = L.y0; } return; }
  m.y += 4*dt;
  const half = 1.5*SCALE, y0 = m.y - half, y1 = m.y + half;
  for (let y = Math.max(L.y0, Math.floor(y0)); y <= Math.min(H-1, Math.floor(y1)); y++) for (let x = L.x0; x < L.x0 + L.w; x++) s.trail[idx(x,y)] = 0;
  const inBlade = (px, py) => px/T >= L.x0 && px/T < L.x0 + L.w && py/T >= y0 && py/T <= y1;
  for (const a of s.ants){ if (a.state==='dead'||a.state==='in'||a.state==='build'||a.state==='nest') continue; if (inBlade(a.x, a.y)) killAnt(s, a, 'mower'); }
  for (const f of s.items) if (!f.max && !f.carried && inBlade((f.x+0.5)*T, (f.y+0.5)*T)) f.amt = 0;
  if (s.cat && inBlade(s.cat.x, s.cat.y)) s.cat.hp = 0;
  for (const o of [...s.outposts]) if (inBlade((o.x+0.5)*T, (o.y+0.5)*T)) hitOutpost(s, o, 99);
  if (m.y >= L.y0 + L.h){ m.state = 'idle'; m.next = s.t + 240 + Math.random()*120; }
}
// Antlion pits in the Sandbox: the rim slides ants toward the bottom, where
// the antlion bites.
function tickPits(s, dt){
  const w = s.world; if (!w.pits.length) return;
  const spared = s.colony.trophies.mandible;
  for (const a of s.ants){ if (a.state==='dead'||a.state==='in'||a.state==='build'||a.state==='nest') continue;
    if (spared && !a.team) continue;
    const p = w.pit[idx(Math.floor(a.x/T), Math.floor(a.y/T))]; if (!p) continue;
    const pp = w.pits.find(q => Math.hypot(q.x - a.x/T, q.y - a.y/T) < q.r*1.4); if (!pp) continue;
    if (p === 2){ if (Math.random() < 1.5*dt) killAnt(s, a, 'antlion'); }
    else { const dx = pp.x*T - a.x, dy = pp.y*T - a.y, d = Math.hypot(dx, dy) || 1; a.x += dx/d*20*dt; a.y += dy/d*20*dt; }
  }
}
// ---------- feet and birds ----------
// Some regions get visitors (AREAS[].strike), each showing itself first:
// - things that come down (DROP): a shoe on the steps, the grill, the swings
//   and the side path; an acorn under the Oak (it stays, a crew's worth of
//   food); a cloud of bug spray at the shed. A shadow spreads, then it hits.
// - hunters (HUNT): a robin over the garden, the feeder, the birdbath and
//   the lawn; a toad in the wild corner, the wet strip and the leaves. It
//   arrives, goes after the nearest ant a few times, and leaves. Five
//   fighters round it chase it off.
// Each comes only while ants are out in that region.
const DROP = {
  foot:  { warn: 2.2, hold: 1.2, lift: 0.8, a: 9, b: 3.4, cause: 'foot', msg: 'A shadow! Get out from under it!', ev: 'feet' },
  acorn: { warn: 1.6, hold: 0.3, lift: 0.1, a: 2.4, b: 2.4, cause: 'acorn', msg: 'An acorn is falling! Move!', ev: 'acorn' },
  spray: { warn: 2.0, hold: 2.2, lift: 0.6, a: 6, b: 6, cause: 'spray', msg: 'Bug spray! Get out of the mist!', ev: 'spray' },
};
const HUNT = {
  bird: { land: 1.4, peck: 1.3, pecks: 4, leave: 1.2, reach: 1.6, hop: 2.5, sight: 12, scare: 5, cause: 'bird', name: 'robin', msg: 'A robin! Run, or bring five fighters.', ev: 'bird' },
  toad: { land: 1.0, peck: 1.7, pecks: 5, leave: 1.0, reach: 5, hop: 1.2, sight: 10, scare: 5, cause: 'toad', name: 'toad', msg: 'A toad! Keep your distance.', ev: 'toad' },
};
const FOOT = DROP.foot, BIRD = HUNT.bird;
const outside = a => a.state !== 'dead' && a.state !== 'in' && a.state !== 'build' && a.state !== 'nest' && a.state !== 'away';
// Inside a drop's print (x, y in tiles), scaled by k.
const underFoot = (st, x, y, k) => { const D = DROP[st.kind], dx = x - st.x, dy = y - st.y, c = Math.cos(st.yaw), n = Math.sin(st.yaw), u = (dx*c + dy*n)/(D.a*k), v = (-dx*n + dy*c)/(D.b*k); return u*u + v*v <= 1; };
const PICNIC_FEET = { kind: 'foot', every: [16, 28] }; // feet round a picnic (build 19)
function tickStrikes(s, dt){
  if (!s.queen.placed) return;
  const w = s.world, P = s.player, pa = P.ant && !P.inNest ? P.ant : null;
  const out = new Map();
  for (const a of s.ants){ if (!outside(a)) continue; const r = w.area[idx(a.tx,a.ty)]; if (!out.has(r)) out.set(r, []); out.get(r).push(a); }
  // New visitors: each region's clock only runs while ants are about.
  for (let i=0;i<AREAS.length;i++){ const st = s.event && s.event.key === 'picnic' && s.event.data.region === i ? PICNIC_FEET : AREAS[i].strike; if (!st || !s.active[i] || s.strikes.some(k => k.region === i)) continue;
    if (st.kind === 'bird' && s.colony.kills.robin && LAWN_ZONE.has(AREAS[i].key)) continue;
    if (st.kind === 'toad' && s.colony.kills.toad && WET_ZONE.has(AREAS[i].key)) continue;
    if (st.kind === 'spray' && s.colony.kills.widow && SIDE_ZONE.has(AREAS[i].key)) continue;
    if (st.kind === 'toad' && s.colony.kills.centipede && ROT_ZONE.has(AREAS[i].key)) continue; // build 36: the centipede beaten // build 35: the widow beaten // build 31: Old Warty beaten // build 30: the Old Robin driven off, no robins over the lawn
    if (isNight(s) && (st.kind === 'foot' || st.kind === 'bird' || st.kind === 'spray')) continue; // build 43: people and birds are in bed
    const here = out.get(i); if (!here) continue;
    s.strikeT[i] -= dt*(st.kind === 'toad' && isNight(s) ? 1.8 : 1); /* (toads hunt at night) */ if (s.strikeT[i] > 0) continue;
    s.strikeT[i] = (st.every[0] + Math.random()*(st.every[1] - st.every[0]))*(prizeFx(s, i) === 'calm' ? 2 : 1);
    const t = here[Math.floor(Math.random()*here.length)], b = areaBounds(i);
    const x = Math.max(b.x0 + 3, Math.min(b.x1 - 3, t.x/T + (Math.random()-0.5)*4)), y = Math.max(b.y0 + 3, Math.min(b.y1 - 3, t.y/T + (Math.random()-0.5)*4));
    s.strikes.push({ kind: st.kind, region: i, x, y, yaw: Math.random()*Math.PI*2, t: (st.kind === 'foot' || st.kind === 'acorn') && has(s, 'vibration') ? -1.2 : 0, phase: DROP[st.kind] ? 'warn' : 'land', pecks: 0, next: 0 });
    const K = DROP[st.kind] || HUNT[st.kind];
    if (pa && Math.hypot(pa.x/T - x, pa.y/T - y) < 14){ s.events.push(K.ev); P.msg = K.msg; }
  }
  for (const st of s.strikes){
    st.t += dt;
    const D = DROP[st.kind];
    if (D){
      if (st.phase === 'warn'){
        // In the last second, as the shadow darkens, most ants under it run for its edge.
        if (st.t > D.warn - 1) for (const a of s.ants) if (outside(a) && !a.isPlayer && a.id % 3 && underFoot(st, a.x/T, a.y/T, 1.3)){ a.flee = Math.max(a.flee, 1.2); a.fleeFrom = { x: st.x*T, y: st.y*T }; }
        if (st.t >= D.warn){ st.phase = 'hold'; st.hit = true;
          for (const a of s.ants) if (outside(a) && underFoot(st, a.x/T, a.y/T, 1)) killAnt(s, a, D.cause);
          // Ants that got out from under it learn something.
          for (const a of s.ants) if (outside(a) && !a.team && underFoot(st, a.x/T, a.y/T, 1.6)) gainXp(s, a, 10);
          if (s.cat && underFoot(st, s.cat.x/T, s.cat.y/T, 1)) s.cat.hp = 0;
          if (s.spider && underFoot(st, s.spider.x/T, s.spider.y/T, 1)) s.spider.hp -= 60;
          for (const o of [...s.outposts]) if (underFoot(st, o.x + 0.5, o.y + 0.5, 1)) hitOutpost(s, o, 1);
          // A fallen acorn stays where it lands: food for a crew of four.
          if (st.kind === 'acorn'){ const x = Math.floor(st.x), y = Math.floor(st.y); if (walk(s, x, y) && !s.items.some(f => f.x === x && f.y === y)) s.items.push({ x, y, kind: 'food', type: 'acorn', amt: FOODS.acorn.amt[0] }); } }
      } else if (st.phase === 'hold'){
        // Spray lingers: anything wandering into the cloud dies too.
        if (st.kind === 'spray') for (const a of s.ants) if (outside(a) && underFoot(st, a.x/T, a.y/T, 1)) killAnt(s, a, D.cause);
        if (st.t >= D.warn + D.hold) st.phase = 'lift';
      }
      else if (st.t >= D.warn + D.hold + D.lift) st.done = true;
      continue;
    }
    // A hunter: arrives, goes after the nearest ant, then leaves.
    const B = HUNT[st.kind];
    if (st.phase === 'land'){ if (st.t >= B.land){ st.phase = 'hunt'; st.next = 0.4; } continue; }
    if (st.phase === 'leave'){ if (st.t >= st.leaveAt + B.leave) st.done = true; continue; }
    const esc = picked(s, 'soldier', 'escort');
    let guards = 0; for (const a of s.ants) if (outside(a) && !a.team && (CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer) && Math.hypot(a.x/T - st.x, a.y/T - st.y) < (esc && a.caste === 'soldier' ? 8 : 5)) guards++;
    if (guards >= B.scare){ st.phase = 'leave'; st.leaveAt = st.t; if (pa && Math.hypot(pa.x/T - st.x, pa.y/T - st.y) < 14) P.msg = `Your crew swarms the ${B.name}. It gives up and goes.`; continue; }
    st.next -= dt; if (st.next > 0) continue; st.next = B.peck;
    let best = null, bd = B.sight;
    for (const a of s.ants){ if (!outside(a)) continue; const d = Math.hypot(a.x/T - st.x, a.y/T - st.y); if (d < bd){ bd = d; best = a; } }
    if (best){ st.yaw = Math.atan2(best.y/T - st.y, best.x/T - st.x);
      if (bd <= B.reach + 1.2){ killAnt(s, best, B.cause); st.peckAt = st.t; st.peckD = bd; }
      else { const m = Math.min(B.hop, bd - B.reach); const nx = st.x + Math.cos(st.yaw)*m, ny = st.y + Math.sin(st.yaw)*m; if (walk(s, Math.floor(nx), Math.floor(ny))){ st.x = nx; st.y = ny; st.hopAt = st.t; } } }
    else st.peckAt = st.t;
    if (++st.pecks >= B.pecks){ st.phase = 'leave'; st.leaveAt = st.t + 0.4; }
  }
  s.strikes = s.strikes.filter(k => !k.done);
}
// Fire ants: the ground round their mounds stings anything that stays on it.
function tickStings(s, dt){
  const w = s.world; s.stingT = (s.stingT || 0) + dt; if (s.stingT < 0.5) return; const k = s.stingT; s.stingT = 0;
  // Build 25.1: once the fire colony is awake the big mound's stinging is its ants' work: the ground
  // stings at a tenth, so a siege can stand at the door, and not at all once their queen is dead.
  const fire = s.rivals.find(r => r.key === 'fire');
  for (const z of w.stings){ const zf = z.big && fire && !fire.asleep ? (fire.queenAlive ? 0.1 : 0) : 1; if (!zf) continue; for (const a of s.ants){
    if (!outside(a) || a.team) continue;
    const d = Math.hypot(a.x/T - z.x, a.y/T - z.y); if (d > z.r) continue;
    a.hp -= z.power * zf * k * (a.isPlayer ? 0.6 : 1); if (a.isPlayer) s.player.hit = s.t;
    if (!a.isPlayer){ a.flee = Math.max(a.flee, 1); a.fleeFrom = { x: z.x*T, y: z.y*T }; }
    else if (!s.stungWarned){ s.stungWarned = true; s.events.push('fireants'); s.player.msg = 'Fire ants! Keep moving.'; }
    if (a.hp <= 0) killAnt(s, a, 'fireants');
  } }
}
// ---------- small creatures (build 16) ----------
// Ladybugs eat your aphids, earwigs pinch, crickets hop away, millipedes curl
// up. Each lives where its kind would (ground), spread over the yard. speed
// is px/s; reach in tiles.
const BUGS = {
  ladybug:  { name: 'ladybug', hp: 14, speed: 12, meat: 8, reach: 1.3 },
  earwig:   { name: 'earwig', hp: 18, speed: 14, rush: 48, meat: 15, reach: 1.5, pinch: 2, pinchEvery: 1.6, ground: /bark|mulch|compost|soil|hedge|leaf/ },
  cricket:  { name: 'cricket', hp: 9, speed: 0, meat: 25, reach: 1.4, ground: /lawn|long|grass|wild/ },
  millipede:{ name: 'millipede', hp: 30, speed: 7, meat: 20, reach: 1.9, armour: 0.35, ground: /compost|mulch|bark|soil|mud|wet|hedge|leaf/ },
  // Build 37: hunters. Bigger than a bug, smaller than a boss: they hunt your ants, one move each, a crew
  // of five to ten beats them, and they come back after a while. They live in regions (by key), not ground.
  jumper:   { name: 'jumping spider', hp: 60, speed: 22, meat: 25, reach: 1.6, hunter: true, regions: /^(patio|steps|porch|grill|cooler|stones|gnomes|rockgarden2?)$/ },
  // Build 38.
  wasp:     { name: 'hunting wasp', hp: 45, speed: 30, meat: 20, reach: 1.6, hunter: true, regions: /^(lawn|picnic|feeder|suet|birdbath|pool|sprinkler|frisbee|bone|truck|fairyring|gnome|molehills)$/ },
  skink:    { name: 'skink', hp: 150, speed: 30, meat: 60, reach: 2.2, hunter: true, regions: /^(rockgarden2?|woodpile|fallen|gnomes|grill|oakroots)$/ },
  assassin: { name: 'assassin bug', hp: 80, speed: 9, meat: 30, chitin: 6, reach: 1.8, hunter: true, regions: /^(tomatoes|beans|peppers|herbs|flowerbed|clover|cloverhill|dandelions|daisies)$/ },
};
const HUNTER_BACK = 240; // seconds before a killed hunter's region gets another
// A bright spark where a bite lands (the renderer draws them). One every so
// often per biter, so a crowd on the spider reads as a scrap, not a fire.
// Build 27: ant against ant is a duel of dice (Mark: "it should be something. Dice rolls against each
// other"). Every DUEL_ROUND seconds a fighter swings at its foe: 1d6 + Attack against the foe's
// 1d6 + Defence. Beat it to hit; by 3 or more (or on a pinned foe) for half again; a natural 6 that
// hits is a crit for double that also lames. A tie locks mandibles: neither moves for a round.
// Each extra ant on the same foe adds +1 (a swarm ant +2), up to +3; three or more on it pin it.
const DUEL_ROUND = 0.7, DUEL_DMG = 1.4;
const DUEL_STAT = { harvester: [1, 1], soldier: [2, 2], venom: [2, 1], major: [3, 4], supermajor: [4, 6], exploder: [1, 0] };
const RIVAL_DUEL = { pavement: [[0, 0], [2, 2]], odorous: [[-1, -1], [-1, -1]], argentine: [[0, 0], [1, 1]], carpenter: [[3, 4], [3, 4]], fire: [[2, 1], [2, 1]] };
function duelStats(s, a){
  const C = CASTES[a.caste];
  if (a.team){ const R = RIVAL_DUEL[rspec(a).key] || RIVAL_DUEL.pavement, st = C.fight >= 3 ? R[1] : R[0];
    return [st[0] + (a.champion ? 2 : 0) - (has(s, 'propaganda') ? 1 : 0), st[1] + (a.champion ? 2 : 0)]; }
  const base = a.isPlayer ? [2, 2] : DUEL_STAT[a.caste] || [0, 0], r = rankOf(a);
  let atk = base[0] + [0, 1, 1, 2, 3][r], def = base[1] + [0, 0, 1, 2, 3][r];
  if (has(s, 'mandibles') && C.fight >= 3) atk++;
  if (s.colony.lineage === 'trapjaw' && C.fight >= 3) atk++;
  if (has(s, 'cuticle')) def++;
  if (s.colony.trophies.shell && roomOf(s, 'armory')) def++;
  if (a.isPlayer && youL(s) >= 3){ atk++; def++; }
  // Build 40: fighting at your own door. Stridulation: +1 Attack while the alarm sounds. Honour guard: +2
  // Defence. Hive mind: +1 Attack for every ant answering a raid.
  const home = Math.hypot(a.tx - s.colony.ex, a.ty - s.colony.ey) < 8;
  if (home && has(s, 'stridulation') && s.alarm[idx(s.colony.ex, s.colony.ey)] > 0.2) atk++;
  if (home && has(s, 'honourguard')) def += 2;
  if (home && has(s, 'hivemind') && s.raidLive) atk++;
  // Bullet line: +1 Attack against anything slowed.
  return [atk, def];
}
// Who is on whom, from last tick's choices: weight of attackers per foe id.
function duelGangs(s){ const m = new Map(); for (const a of s.ants){ if (!a.foeId || !outside(a)) continue; m.set(a.foeId, (m.get(a.foeId) || 0) + (a.team && rspec(a).swarm ? 2 : 1)); } s.gangs = m; return m; }
const pinnedNow = (s, o) => o.caste !== 'supermajor' && s.gangs && (s.gangs.get(o.id) || 0) >= 3;
function pop(s, x, y, text, k){ (s.pops || (s.pops = [])).push({ x, y, text, k, t: s.t }); if (s.pops.length > 40) s.pops.shift(); }
// One swing of a at o. Returns what happened. mul scales the damage (your ant bites twice as hard).
function swing(s, a, o, mul = 1){
  const P = s.player, [atk0] = duelStats(s, a), [, def0] = duelStats(s, o), atk = atk0 + (frenzied(s, a) ? (a.frenzyAtk || 2) : 0) + (!a.team && s.colony.lineage === 'bullet' && o.slowT > 0 ? 1 : 0), def = def0 - (exposed(s, o) ? 1 : 0);
  if (o.isPlayer && o.feign > s.t) return 'miss'; // playing dead
  const me = a.team && rspec(a).swarm ? 2 : 1, help = Math.min(3, Math.max(0, ((s.gangs && s.gangs.get(o.id)) || 0) - (a.foeId === o.id ? me : 0)));
  const pinned = pinnedNow(s, o), ra = 1 + Math.floor(Math.random()*6), rd = 1 + Math.floor(Math.random()*6);
  const A = ra + atk + help, D = rd + def, critOn = !a.team && a.caste === 'venom' ? 5 : 6;
  let kind = 'miss', m = 0;
  if (!a.team && s.colony.trophies.claw && a.clawFoe !== o.id){ a.clawFoe = o.id; kind = 'crit'; m = 2; } // build 34: the mantis's claw
  else if (A > D){ if (ra >= critOn){ kind = 'crit'; m = 2; } else if (A - D >= 3 || pinned){ kind = 'hard'; m = 1.5; } else { kind = 'hit'; m = 1; } }
  else if (A === D){ kind = 'lock'; if (!a.isPlayer) a.lockT = DUEL_ROUND; if (!o.isPlayer) o.lockT = DUEL_ROUND; }
  const col = colonyOf(s, a);
  let dmg = 0;
  if (m){
    dmg = bite(s, a)*DUEL_ROUND*DUEL_DMG*m*mul*(a.team && Math.hypot(a.tx - col.ex, a.ty - col.ey) < 5 ? 1.5 : 1)*(exposed(s, o) ? 1.5 : 1);
    o.hp -= dmg; o.hitT = s.t; if (o.isPlayer) P.hit = s.t;
    if (!a.team && a.caste === 'venom' && picked(s, 'venom', 'lethal') && !o.champion) o.hp = 0;
    if (kind === 'crit'){ o.slowT = Math.max(o.slowT || 0, 4); if (!a.team) s.colony.crits = (s.colony.crits || 0) + 1; }
    if (!a.team && a.caste === 'venom' && s.colony.trophies.fang2){ o.stunned = s.t + 1; o.lockT = Math.max(o.lockT || 0, 1); } // build 36: the centipede's fang
    if (a.team && rspec(a).key === 'fire') o.burnT = 3;
    if (!a.team && s.colony.lineage === 'bullet' && CASTES[a.caste].fight >= 3) o.slowT = Math.max(o.slowT || 0, 2); // build 40: the Bullet line's sting slows in duels too
    if (o.champion && s.event && s.event.key === 'warparty'){ const B = s.event.data.biters || (s.event.data.biters = {}); B[a.id] = (B[a.id] || 0) + dmg; }
    gainXp(s, a, dmg/3);
  }
  spark(s, null, (a.x + o.x)/2, (a.y + o.y)/2, kind === 'crit' ? 2 : a.team ? 1 : 0);
  const mx = (a.x + o.x)/2, my = (a.y + o.y)/2, seen = a.isPlayer || o.isPlayer || (P.ant && Math.hypot(mx - P.ant.x, my - P.ant.y) < 20*T);
  if (seen && (kind === 'crit' || a.isPlayer || o.isPlayer || (kind === 'lock' && Math.random() < 0.3))) pop(s, mx, my, kind === 'crit' ? 'CRIT ' + Math.max(1, Math.round(dmg)) : kind === 'lock' ? '⚔' : kind === 'miss' ? 'miss' : String(Math.max(1, Math.round(dmg))), kind + (a.team ? '-r' : ''));
  if (a.isPlayer || o.isPlayer) P.duel = { you: a.isPlayer, ra, ma: atk + help, rd, md: def, kind, foe: (a.isPlayer ? o : a).team ? rspec(a.isPlayer ? o : a).name.replace(/s$/, '') : 'Ant', t: s.t };
  if (o.hp <= 0 && o.state !== 'dead'){ killAnt(s, o, a.team ? 'rival' : 'war'); gainXp(s, a, 5); if (!a.team) s.colony.duelsWon = (s.colony.duelsWon || 0) + 1; else if (!o.team) s.colony.duelsLost = (s.colony.duelsLost || 0) + 1; }
  return kind;
}
// Build 28: raids you lead (Mark: "I want raids to feel interesting and important. You raid other
// colonies"). Bring a crew to a rival door and press Raid; pick a prize; break their door (six of yours
// there, none of theirs, for 5 s); then the crew storms in and the fight plays out in rounds of dice on
// the raid card. Pull out when you like. Survivors carry the prize home, and the colony strikes back.
const RAID = { near: 8, minCrew: 3, door: 6, hold: 5, round: 1.0, maxRounds: 60, breachMax: 120 };
function raidTarget(s){
  const a = s.player.ant; if (!a || s.player.inNest || s.myRaid) return null;
  return s.rivals.find(r => !r.asleep && r.queenAlive && Math.hypot(a.tx - r.ex, a.ty - r.ey) <= RAID.near) || null;
}
// What your scouts see: their numbers, store, brood and queen, against your crew.
function raidScout(s, r){
  const R = RIVALS[r.team - 1], theirs = s.ants.filter(a => a.team === r.team && a.state !== 'dead');
  const guards = theirs.filter(a => CASTES[a.caste].fight >= 3 || R.swarm || R.fierce).length;
  const crew = s.ants.filter(a => a.follow && a.state === 'follow');
  return { team: r.team, key: R.key, name: R.name, guards, workers: theirs.length - guards, total: theirs.length, store: Math.floor(r.store), brood: broodOf(s, r), qhp: Math.ceil(r.qhp == null ? R.qhp : r.qhp), qmax: R.qhp,
    crew: crew.length, fighters: crew.filter(a => CASTES[a.caste].fight >= 3).length, attack: crew.reduce((n, a) => n + duelStats(s, a)[0], 0) };
}
const broodOf = (s, r) => r.eggs.length + r.eggQueue.length + Math.floor(s.ants.filter(a => a.team === r.team && a.state !== 'dead').length / 5);
function raidLock(s, prize){
  const r = raidTarget(s); if (!r) return 'walk your crew to a rival nest';
  const n = crewSize(s); if (n < RAID.minCrew) return `recruit a crew first (${n} of ${RAID.minCrew})`;
  if (prize === 'store' && r.store < 4) return 'their store is empty';
  if (prize === 'brood' && !broodOf(s, r)) return 'they have no brood';
  return '';
}
function startRaid(s, prize){
  if (raidLock(s, prize)) return false;
  const r = raidTarget(s), R = RIVALS[r.team - 1], P = s.player;
  const theirs = s.ants.filter(a => a.team === r.team && a.state !== 'dead').length;
  s.myRaid = { team: r.team, prize, phase: 'breach', t0: s.t, hold: 0, round: 0, rT: 0, raiders: [], log: [], loot: { food: 0, brood: 0 }, cap: Math.floor(r.store/2), broodLeft: broodOf(s, r),
    start: { theirs, lost: deathTotal(s.colony), killed: r.deaths.war || 0, crits: s.colony.crits || 0, qhp: r.qhp == null ? R.qhp : r.qhp } };
  P.attack = { kind: 'door', ref: r.team, name: 'the ' + R.name.toLowerCase() + '’ door', t: s.t };
  raiseAlarm(s, r.ex, r.ey, 3);
  P.msg = `Raid! Break the ${R.name.toLowerCase()}’ door: ${RAID.door} of yours there, none of theirs.`; s.seen.raided = true; s.events.push('attack');
  return true;
}
function raidSay(M, text){ M.log.push(text); if (M.log.length > 6) M.log.shift(); }
function tickMyRaid(s, dt){
  const M = s.myRaid; if (!M) return;
  const r = s.rivals[M.team - 1], R = RIVALS[M.team - 1], P = s.player;
  if (M.phase === 'breach'){
    const crew = s.ants.filter(a => a.follow && a.state === 'follow');
    let ours = 0, theirs = 0;
    for (const a of s.ants){ if (!outside(a)) continue; const d = Math.hypot(a.tx - r.ex, a.ty - r.ey);
      if (!a.team && d <= 2 && (a.follow || a.isPlayer || CASTES[a.caste].fight >= 3)) ours++;
      if (a.team === r.team && d <= 3 && (CASTES[a.caste].fight >= 3 || R.fierce || R.swarm)) theirs++; }
    M.ours = ours; M.theirs = theirs;
    const need = Math.min(RAID.door, Math.max(RAID.minCrew, crew.length));
    M.need = need;
    if (ours >= need && theirs === 0) M.hold += dt; else M.hold = Math.max(0, M.hold - dt*0.5);
    if (!P.attack && crew.length) P.attack = { kind: 'door', ref: r.team, name: 'the door', t: s.t };
    if (!r.queenAlive || crew.length + (P.ant ? 0 : 0) < 1 || s.t - M.t0 > RAID.breachMax){ endRaid(s, 'broken'); return; }
    if (M.hold >= RAID.hold){
      // Storm: every crew ant near the door goes in.
      M.phase = 'inside'; M.rT = 0.5; P.attack = null;
      for (const a of crew) if (Math.hypot(a.x/T - r.ex, a.y/T - r.ey) < 5){ a.state = 'away'; a.follow = false; a.x = (r.ex + 0.5)*T; a.y = (r.ey + 0.5)*T; a.tx = r.ex; a.ty = r.ey; a.foeId = 0; a.loot = 0; M.raiders.push(a.id); }
      raidSay(M, `The door is yours. ${M.raiders.length} raiders storm the nest.`);
      M.left = M.raiders.length; M.guards = s.ants.filter(a => a.team === r.team && a.state === 'in').length;
      P.msg = `Your crew storms the ${R.name.toLowerCase()}’ nest!`; s.events.push('attack');
    }
    return;
  }
  if (M.phase !== 'inside') return;
  M.rT -= dt; if (M.rT > 0) return; M.rT = RAID.round; M.round++;
  const raiders = M.raiders.map(id => s.ants.find(a => a.id === id)).filter(a => a && a.state === 'away');
  if (!raiders.length){ raidSay(M, 'Your last raider falls.'); endRaid(s, 'lost'); return; }
  // Their guards inside: soldiers first; a swarm sends everyone.
  const inside = s.ants.filter(a => a.team === r.team && a.state === 'in');
  const guards = inside.filter(a => CASTES[a.caste].fight >= 3 || R.swarm || R.fierce);
  const def = guards.length ? guards : inside.slice(0, Math.ceil(inside.length/3));
  // Everyone on both sides fights in pairs; ganging up counts as in a duel on the surface.
  for (const a of raiders) a.foeId = 0;
  const order = raiders.slice().sort(() => Math.random() - 0.5);
  let crits = 0, felled = 0, lost = 0, named = null; const free = [];
  order.forEach((a, i) => { if (!def.length || a.loot) { free.push(a); return; } a.foeId = def[i % def.length].id; });
  duelGangs(s);
  for (const a of order){
    if (!a.foeId){ continue; }
    const o = def.find(d => d.id === a.foeId); if (!o || o.state === 'dead'){ free.push(a); continue; }
    const k = swing(s, a, o); if (k === 'crit'){ crits++; if (a.name) named = a.name; } if (o.state === 'dead') felled++;
    if (o.state !== 'dead' && a.state !== 'dead'){ swing(s, o, a); if (a.state === 'dead') lost++; }
  }
  // Raiders with nobody in front of them go for the prize.
  let took = 0, qhits = 0;
  for (const a of free){
    if (a.state === 'dead') continue;
    if (M.prize === 'store' && M.loot.food < M.cap && r.store >= 1){ const n = Math.min(carryCap(s, a, { type: 'crumb' })*2, M.cap - M.loot.food, r.store); a.loot = (a.loot || 0) + n; M.loot.food += n; r.store -= n; took += n; }
    else if (M.prize === 'brood' && M.broodLeft > 0 && !a.loot){ a.loot = 1; a.lootKind = 'brood'; M.loot.brood++; M.broodLeft--; if (r.eggQueue.length) r.eggQueue.pop(); else if (r.eggs.length) r.eggs.pop(); took++; }
    else if (M.prize === 'queen' && r.queenAlive){
      // The queen: 1d6 + Attack against her 1d6 + 4; she bites back at one raider a round.
      const ra = 1 + Math.floor(Math.random()*6), rd = 1 + Math.floor(Math.random()*6), [atk] = duelStats(s, a);
      if (ra + atk > rd + 4){ const dmg = bite(s, a)*3*(ra === 6 ? 2 : 1); r.qhp -= dmg; qhits++; if (ra === 6){ crits++; if (a.name) named = a.name; s.colony.crits = (s.colony.crits || 0) + 1; } }
    }
  }
  if (M.prize === 'queen' && r.queenAlive && free.length){ const v = free[Math.floor(Math.random()*free.length)]; const [, d] = duelStats(s, v); if (1 + Math.floor(Math.random()*6) + 3 > 1 + Math.floor(Math.random()*6) + d){ v.hp -= 4; if (v.hp <= 0){ killAnt(s, v, 'rival'); lost++; } } }
  // One line a round: the best thing that happened.
  const left = raiders.filter(a => a.state !== 'dead').length, gl = def.filter(d => d.state !== 'dead').length;
  M.left = left; M.guards = s.ants.filter(a => a.team === r.team && a.state === 'in').length;
  let line = `Round ${M.round}: `;
  if (crits) line += named ? `${named} rolls a 6, crit${crits > 1 ? ` (${crits} crits)` : ''}! ` : crits > 1 ? `${crits} crits! ` : 'A raider rolls a 6, crit! ';
  if (felled) line += `${felled} guard${felled === 1 ? '' : 's'} fall${felled === 1 ? 's' : ''}. `;
  if (lost) line += `${lost} raider${lost === 1 ? '' : 's'} fall${lost === 1 ? 's' : ''}. `;
  if (took && M.prize === 'store') line += `+${Math.round(took)} food grabbed. `;
  if (took && M.prize === 'brood') line += `${took} pupa${took === 1 ? '' : 'e'} taken. `;
  if (M.prize === 'queen' && !gl && r.queenAlive) line += qhits ? `${qhits} bite${qhits === 1 ? '' : 's'} on the queen: ${Math.max(0, Math.ceil(r.qhp))} health left. ` : 'The queen fends them off. ';
  if (line === `Round ${M.round}: `) line += gl ? `${left} raiders against ${gl} guards. Mandibles locked.` : 'The halls are clear.';
  raidSay(M, line.trim());
  if (M.prize === 'queen' && r.queenAlive && r.qhp <= 0){ queenFalls(s, r); raidSay(M, 'The queen is dead!'); endRaid(s, 'won'); return; }
  if (M.prize === 'store' && (M.loot.food >= M.cap || r.store < 1)){ raidSay(M, 'Their store is stripped.'); endRaid(s, 'done'); return; }
  if (M.prize === 'brood' && M.broodLeft <= 0){ raidSay(M, 'All their brood is taken.'); endRaid(s, 'done'); return; }
  if (M.prize === 'brood' && raiders.every(a => a.state === 'dead' || a.loot)){ raidSay(M, 'Every raider has a pupa.'); endRaid(s, 'done'); return; }
  if (M.round >= RAID.maxRounds){ raidSay(M, 'Worn out, your raiders fall back.'); endRaid(s, 'out'); }
}
function pullOut(s){ const M = s.myRaid; if (!M) return false; if (M.phase === 'inside'){ raidSay(M, 'You pull your raiders out.'); endRaid(s, 'out'); } else endRaid(s, 'called off'); return true; }
// The raid ends: survivors come out at the door carrying what they took, and head home.
function endRaid(s, how){
  const M = s.myRaid; if (!M) return; const r = s.rivals[M.team - 1], R = RIVALS[M.team - 1], P = s.player, c = s.colony;
  const out = M.raiders.map(id => s.ants.find(a => a.id === id)).filter(a => a && a.state === 'away');
  for (const a of out){
    a.x = (r.ex + 0.5)*T + (Math.random() - 0.5)*T; a.y = (r.ey + 0.5)*T + (Math.random() - 0.5)*T; a.tx = r.ex; a.ty = r.ey; a.foeId = 0;
    if (a.loot){ a.carry = a.loot; a.kind = a.lootKind === 'brood' ? 'brood' : 'food'; a.itype = a.lootKind === 'brood' ? 'pupa' : 'crumb'; a.state = 'return'; a.explore = 0; }
    else if (P.ant && !P.inNest && Math.hypot(P.ant.x - a.x, P.ant.y - a.y) < 16*T){ a.state = 'follow'; a.follow = true; }
    else a.state = 'return';
    a.loot = 0; a.lootKind = null;
  }
  const theirs = s.ants.filter(a => a.team === r.team && a.state !== 'dead').length, lost = deathTotal(c) - M.start.lost, killed = (r.deaths.war || 0) - M.start.killed, crits = (c.crits || 0) - M.start.crits;
  const got = M.loot.food ? `${Math.round(M.loot.food)} food` : M.loot.brood ? `${M.loot.brood} pupa${M.loot.brood === 1 ? '' : 'e'}` : '';
  s.report = { kind: 'myraid', how, team: M.team, name: R.name, prize: M.prize, food: Math.round(M.loot.food), brood: M.loot.brood, lost, killed, crits, before: M.start.theirs, after: theirs, rounds: M.round, t: s.t };
  c.raidsLed = (c.raidsLed || 0) + 1;
  const head = how === 'won' ? `You took the ${R.name.toLowerCase()}’ nest!` : how === 'lost' ? `Your raid on the ${R.name.toLowerCase()} failed.` : how === 'broken' || how === 'called off' ? `The raid on the ${R.name.toLowerCase()} broke at the door.` : `Raid on the ${R.name.toLowerCase()}:`;
  P.msg = `${head}${got ? ` ${out.length} raider${out.length === 1 ? '' : 's'} carry home ${got}.` : ''} Lost ${lost}, killed ${killed}${crits > 0 ? ` (${crits} crit${crits === 1 ? '' : 's'})` : ''}. Their numbers: ${M.start.theirs} → ${theirs}.`;
  s.events.push('report');
  // They strike back, a few minutes on, if they still can.
  if (r.queenAlive) r.revengeAt = s.t + 90 + Math.random()*120;
  M.phase = 'over'; s.lastRaid = M; s.myRaid = null; if (P.attack && P.attack.kind === 'door') P.attack = null;
}
function queenFalls(s, r){
  const R = RIVALS[r.team - 1], c = s.colony, P = s.player;
  r.qhp = 0; r.queenAlive = false;
  const ai = areaOf(s, r.ex, r.ey); if (!s.outposts.some(o => o.region === ai)) addOutpost(s, r.ex, r.ey, true);
  c.kills.queens = (c.kills.queens || 0) + 1;
  if (r.team === 1){ s.won = true; s.patioDeadAt = s.t; gainGenes(s, 5, 'the rival queen is dead'); P.msg = 'The rival queen is dead. The yard is yours.'; }
  else { gainGenes(s, 3, 'the ' + R.name.toLowerCase() + '’ queen is dead'); P.msg = `The ${R.name.toLowerCase()}’ queen is dead. Their nest is yours.`; s.events.push('held'); }
}
// Build 32: your ant's abilities (Mark: "The boss battles are basically rts and a kind of diablo esque.
// Maybe we need to give our main ant abilities the player can trigger that are based on him or the
// crowd or weakening the enemy like statuses"). Four, each on its own cooldown.
const ABILITIES = {
  spray:  { name: 'Formic Spray', icon: '🧪', evo: 'formic', cd: 10, range: 6, r: 2.5, dur: 6, line: 'A cloud of acid where you point: enemies in it are Exposed for 6 s (half again damage, −1 Defence).' },
  alarm:  { name: 'Alarm Call', icon: '📯', evo: 'danger', cd: 24, r: 8, dur: 8, line: 'Your crew and fighters within 8 tiles Frenzy for 8 s: +2 Attack, bites 30% harder, faster.' },
  lock:   { name: 'Mandible Lock', icon: '🦷', evo: 'mandibles', cd: 16, range: 2.6, dur: 2.5, boss: 1.5, line: 'Grab the nearest enemy: Stunned 2.5 s. A boss: 1.5 s, and the attack it was winding up is cancelled.' },
  dead:   { name: 'Play Dead', icon: '💀', evo: 'thanatosis', cd: 30, dur: 3, heal: 0.3, line: 'Drop and lie still: nothing hurts you for 3 s, and you heal 30%.' },
};
const ABILITY_KEYS = ['spray', 'alarm', 'lock', 'dead'];
// Build 33: second levels, from the evolution tree. abil(s, k) gives an ability's numbers as they stand.
const ABILITY_II = {
  spray: { evo: 'spray2', cd: 7, r: 3.5, dur: 9 },
  alarm: { evo: 'alarm2', r: 12, dur: 12, atk: 3 },
  lock:  { evo: 'lock2', cd: 11, dur: 4, boss: 2.5 },
  dead:  { evo: 'dead2', dur: 5, heal: 0.6, shake: true },
};
const abilityLevel = (s, k) => (ABILITY_II[k] && has(s, ABILITY_II[k].evo) ? 2 : 1);
const abil = (s, k) => abilityLevel(s, k) === 2 ? { ...ABILITIES[k], ...ABILITY_II[k], level: 2 } : { ...ABILITIES[k], atk: 2, level: 1 };
const exposed = (s, o) => o && o.exposed > s.t;
const stunned = (s, o) => o && o.stunned > s.t;
const frenzied = (s, a) => a && a.frenzy > s.t;
function abilityLock(s, key){
  const P = s.player, A = ABILITIES[key]; if (!A) return 'unknown';
  if (A.evo && !has(s, A.evo)) return 'evolve ' + EVO_BY[A.evo].name + ' to learn it'; // build 32.1: learned in the evolution tree
  if (!P.ant || P.inNest) return 'outside only';
  const left = ((P.cds || {})[key] || 0) - s.t; if (left > 0) return `ready in ${Math.ceil(left)} s`;
  return '';
}
// Every enemy thing in reach of a point: rival ants, zombies, bugs, the spider, the caterpillar, bosses.
function foesNear(s, x, y, r){
  const out = [];
  for (const a of s.ants) if (outside(a) && (a.team || a.zombie) && Math.hypot(a.x - x, a.y - y) <= r) out.push(a);
  for (const b of s.critters || []) if (b.hp > 0 && Math.hypot(b.x - x, b.y - y) <= r) out.push(b);
  if (s.spider && Math.hypot(s.spider.x - x, s.spider.y - y) <= r + 1.5*T) out.push(s.spider);
  if (s.cat && Math.hypot(s.cat.x - x, s.cat.y - y) <= r + T) out.push(s.cat);
  for (const k in s.bosses || {}){ const b = s.bosses[k]; if (!b.dead && Math.hypot(b.x - x, b.y - y) <= r + BOSSES[k].r*T) out.push(b); }
  return out;
}
function useAbility(s, key, x, y){
  if (abilityLock(s, key)) return false;
  const P = s.player, a = P.ant, A = abil(s, key);
  if (x == null){ x = a.x + (a.dx || 0)*3*T; y = a.y + (a.dy || 0)*3*T; }
  let n = 0;
  if (key === 'spray'){
    // Clamp the cloud to your range.
    const d = Math.hypot(x - a.x, y - a.y), m = A.range*T; if (d > m){ x = a.x + (x - a.x)/d*m; y = a.y + (y - a.y)/d*m; }
    for (const o of foesNear(s, x, y, A.r*T)){ o.exposed = s.t + A.dur; o.hitT = s.t; if (o.caste && o.state !== 'dead'){ o.hp -= 1; if (o.hp <= 0) killAnt(s, o, 'war'); } n++; }
    P.msg = n ? `Formic spray! ${n} ${n === 1 ? 'enemy is' : 'enemies are'} Exposed.` : 'Formic spray: nothing caught in it.';
  } else if (key === 'alarm'){
    for (const o of s.ants) if (!o.team && !o.isPlayer && outside(o) && (o.follow || CASTES[o.caste].fight >= 3) && Math.hypot(o.x - a.x, o.y - a.y) <= A.r*T){ o.frenzy = s.t + A.dur; o.frenzyAtk = A.atk; n++; }
    a.frenzy = s.t + A.dur; a.frenzyAtk = A.atk; x = a.x; y = a.y;
    P.msg = n ? `Alarm call! ${n} of your ants Frenzy.` : 'Alarm call: no fighters near enough to hear it.';
  } else if (key === 'lock'){
    let best = null, bd = Infinity;
    for (const o of foesNear(s, a.x, a.y, A.range*T + 2*T)){ const d = Math.hypot(o.x - a.x, o.y - a.y) - (o.key && BOSSES[o.key] ? BOSSES[o.key].r*T : 0); if (d < bd && d <= A.range*T){ bd = d; best = o; } }
    if (!best){ P.msg = 'Mandible lock: nothing close enough to grab.'; return false; }
    const boss = best.key && BOSSES[best.key];
    if (boss){ best.stunned = s.t + A.boss; if (best.atk){ best.atk = null; best.interruptAt = s.t; } best.hop = null; best.leap = null; }
    else { best.stunned = s.t + A.dur; best.lockT = A.dur; best.slowT = Math.max(best.slowT || 0, A.dur); }
    best.hitT = s.t; x = best.x; y = best.y; n = 1;
    P.msg = boss ? `You lock your mandibles on ${boss.name}! Stunned${best.interruptAt === s.t ? ', its attack cancelled' : ''}.` : 'Mandible lock! It’s stunned.';
  } else if (key === 'dead'){
    a.feign = s.t + A.dur; a.foeId = 0;
    if (A.shake) for (const o of s.ants) if (o.team && o.state !== 'dead' && o.foeId === a.id){ o.foeId = 0; if (o.state === 'fight') o.state = 'return'; } const pm = Math.max(youHp(s), maxHp(s, a)); a.hp = Math.min(pm, a.hp + pm*A.heal); x = a.x; y = a.y;
    P.msg = A.level === 2 ? 'You drop and play dead so well your attackers lose track of you.' : 'You drop and play dead. Nothing touches you.';
  }
  (P.cds || (P.cds = {}))[key] = s.t + A.cd;
  (s.casts || (s.casts = [])).push({ key, x, y, r: key === 'spray' ? A.r*T : key === 'alarm' ? A.r*T : T, t: s.t }); if (s.casts.length > 12) s.casts.shift();
  s.events.push('cast:' + key); s.seen.ability = true;
  return true;
}
function spark(s, by, x, y, k){
  if (by){ if (s.t - (by.sparkT || -9) < 0.3) return; by.sparkT = s.t; }
  s.hits.push({ x, y, t: s.t, k: k || 0 }); if (s.hits.length > 60) s.hits.shift();
}
function hurtAnt(s, a, dmg, cause){ if (a.isPlayer && a.feign > s.t) return; a.hp -= dmg; a.hitT = s.t; if (a.isPlayer) s.player.hit = s.t; if (a.hp <= 0) killAnt(s, a, cause); }
const bugTile = (s, x, y) => { const tx = Math.floor(x/T), ty = Math.floor(y/T); return walk(s, tx, ty) && !s.world.pit[idx(tx,ty)] && Math.hypot(tx - s.world.ex, ty - s.world.ey) > 6; };
function bugMove(s, b, gx, gy, speed, dt){
  const ddx = gx - b.x, ddy = gy - b.y, d = Math.hypot(ddx, ddy); if (d < 1) return true;
  const base = Math.atan2(ddy, ddx), m = Math.min(d, speed*SURF*dt*(b.slowT > 0 ? 0.5 : 1));
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]){
    const nx = b.x + Math.cos(base+off)*m, ny = b.y + Math.sin(base+off)*m;
    if (!bugTile(s, nx, ny)) continue;
    b.x = nx; b.y = ny; b.dx = Math.cos(base+off); b.dy = Math.sin(base+off); b.stuck = 0; return d - m < 1;
  }
  b.stuck = (b.stuck || 0) + dt; if (b.stuck > 1.5){ b.stuck = 0; return true; } return false;
}
function bugWander(s, b, r){
  // It keeps to its own patch: strayed far from home, it heads back.
  const hx = b.hx != null ? (b.hx + 0.5)*T : b.x, hy = b.hy != null ? (b.hy + 0.5)*T : b.y, far = Math.hypot(b.x - hx, b.y - hy) > 9*T;
  const ox = far ? hx : b.x, oy = far ? hy : b.y;
  for (let k = 0; k < 10; k++){ const ang = Math.random()*Math.PI*2, d = (1 + Math.random()*r)*T, x = ox + Math.cos(ang)*d, y = oy + Math.sin(ang)*d; if (bugTile(s, x, y)){ b.gx = x; b.gy = y; return; } }
  b.gx = b.x; b.gy = b.y;
}
function nearAnt(s, b, r, pred){ let best = null, bd = r; for (const a of s.ants){ if (Math.abs(a.x - b.x) >= bd || Math.abs(a.y - b.y) >= bd || !outside(a) || (pred && !pred(a)) || (a.isPlayer && a.feign > s.t)) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < bd){ bd = d; best = a; } } return best ? [best, bd] : null; }
const playerNear = (s, x, y, r) => { const pa = s.player.ant; return !!pa && !s.player.inNest && Math.hypot(pa.x - x, pa.y - y) < r*T; };
// Build 16.1: the yard is populated region by region, each bug placed
// anywhere in its region and keeping to its own patch, so they are spread
// across the yard rather than turning up round your ants. A region holds one
// of each kind its ground suits (ladybugs where there are aphids), three at
// most. One that dies or leaves is replaced a couple of minutes later, out
// of your sight. Dormant regions get theirs when you first walk in.
const BUG_BACK = [100, 160]; // seconds before a gone bug is replaced
function bugSlots(s, ai){
  const g = AREAS[ai].ground || '', out = [];
  if (s.items.some(f => f.type === 'aphids' && s.world.area[idx(f.x,f.y)] === ai)) out.push('ladybug');
  for (const k of ['earwig', 'cricket', 'millipede']) if (BUGS[k].ground.test(g)) out.push(k);
  const bugs = out.slice(0, 3);
  if (s.t >= 600) for (const k in BUGS) if (BUGS[k].hunter && BUGS[k].regions.test(AREAS[ai].key)) bugs.push(k); // no hunters in the first 10 minutes
  return bugs;
}
function placeBug(s, ai, k, hidden){
  const w = s.world, b = areaBounds(ai), B = BUGS[k], P = s.player, pa = P.ant && !P.inNest ? P.ant : null;
  const aph = k === 'ladybug' ? s.items.filter(f => f.type === 'aphids' && w.area[idx(f.x,f.y)] === ai) : null;
  for (let tries = 0; tries < 60; tries++){
    const ang = Math.random()*Math.PI*2; let x, y;
    if (aph){ if (!aph.length) return false; const f = aph[Math.floor(Math.random()*aph.length)]; x = Math.round(f.x + Math.cos(ang)*5); y = Math.round(f.y + Math.sin(ang)*5); }
    else { x = b.x0 + 4 + Math.floor(Math.random()*(AREA - 8)); y = b.y0 + 4 + Math.floor(Math.random()*(AREA - 8)); }
    if (x < b.x0 + 2 || y < b.y0 + 2 || x > b.x1 - 2 || y > b.y1 - 2) continue;
    if (!bugTile(s, (x+0.5)*T, (y+0.5)*T) || Math.hypot(x - w.ex, y - w.ey) < (k === 'earwig' || B.hunter ? 30 : 14) || Math.hypot(x - w.rx, y - w.ry) < 8) continue;
    if (s.critters.some(o => Math.hypot(o.x/T - (x+0.5), o.y/T - (y+0.5)) < 12)) continue;
    if (hidden && pa && Math.hypot(pa.x/T - x, pa.y/T - y) < 18) continue;
    s.critters.push({ id: s.nextId++, kind: k, region: ai, hx: x, hy: y, x: (x+0.5)*T, y: (y+0.5)*T, dx: Math.cos(ang), dy: Math.sin(ang), hp: B.hp, maxHp: B.hp, state: hidden && k === 'ladybug' ? 'land' : 'walk', t: Math.random()*5, life: 0 });
    return true;
  }
  return false;
}
function populateBugs(s, ai){ for (const k of bugSlots(s, ai)) placeBug(s, ai, k, false); }
function spawnBugs(s, dt){
  s.bugT = (s.bugT || 0) + dt; if (s.bugT < 4) return; s.bugT = 0;
  const gone = s.bugGone;
  for (let ai = 0; ai < AREAS.length; ai++){
    if (!s.active[ai]) continue;
    for (const k of bugSlots(s, ai)){
      const key = ai + ':' + k, at = gone[key];
      if ((at == null && !BUGS[k].hunter) || s.critters.some(o => o.region === ai && o.kind === k)) continue; // (a hunter needn't have died first: it turns up after minute 10)
      if (at != null && s.t - at < (BUGS[k].hunter ? HUNTER_BACK : BUG_BACK[0]) + (ai * 37 % 60)) continue;
      // Ladybugs fly in where you can see; the rest turn up out of sight.
      if (placeBug(s, ai, k, k !== 'ladybug')) delete gone[key];
    }
  }
}
// Which bugs have ants near enough to matter: only those are stepped.
const BUG_CELL = 16, BUG_GW = Math.ceil(W/BUG_CELL), bugOcc = new Uint8Array(BUG_GW*Math.ceil(H/BUG_CELL));
function bugsAwake(s){
  bugOcc.fill(0);
  for (const a of s.ants) if (outside(a)) bugOcc[Math.floor(a.y/T/BUG_CELL)*BUG_GW + Math.floor(a.x/T/BUG_CELL)] = 1;
  return (b) => { const cx = Math.floor(b.x/T/BUG_CELL), cy = Math.floor(b.y/T/BUG_CELL);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++){ const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < BUG_GW && bugOcc[y*BUG_GW + x]) return true; }
    return false; };
}
function stepBugs(s, dt){
  spawnBugs(s, dt);
  const P = s.player, yb = youL(s) >= 3 ? 1.5 : 1, awake = bugsAwake(s);
  for (const b of s.critters){
    // With no ant within about fifty tiles it waits where it is.
    if (!awake(b) && !b.carry) continue; /* build 41: a wasp carrying an ant off flies on even with no one near */
    const B = BUGS[b.kind]; b.t += dt; b.life += dt; if (b.slowT > 0) b.slowT -= dt;
    // Bitten: fighters, your crew and you. Off the ground (hopping, flying) it can't be.
    if (b.state !== 'fly' && b.state !== 'hop' && b.state !== 'land' && b.state !== 'carry'){
      const R = B.reach*T, arm = b.state === 'curl' ? B.armour : 1, lim = Math.max(6*T, R*2); // (build 45: ants further than any reach here are skipped before the sums)
      for (const a of s.ants){
        if (a.team || Math.abs(a.x - b.x) >= lim || Math.abs(a.y - b.y) >= lim || !outside(a)) continue;
        const fighter = CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer, d = Math.hypot(a.x - b.x, a.y - b.y);
        if (fighter && d < R*reachOf(s, a)){
          const dmg = bite(s, a, 'bug')*dt*(a.isPlayer ? 2*yb : 1)*arm*(exposed(s, b) ? 1.5 : 1); b.hp -= a.caste === 'venom' && picked(s, 'venom', 'lethal') ? b.hp : dmg; gainXp(s, a, dmg/3); b.hitT = s.t; stingSlow(s, a, b);
          spark(s, a, (a.x + b.x)/2, (a.y + b.y)/2, 0);
          if (b.kind === 'millipede'){ if (b.state !== 'curl'){ b.state = 'curl'; b.t = 0; if (playerNear(s, b.x, b.y, 14) && !s.seen.curl){ s.seen.curl = true; P.msg = 'The millipede curls into an armoured ball. Keep biting.'; } } b.curlT = 8; }
        } else if (d < 6*T && CASTES[a.caste].fight >= 3 && a.state === 'patrol'){ a.state = 'fight'; a.goal = 'bug'; a.bugId = b.id; }
      }
      if (b.hp <= 0){ bugDies(s, b); continue; }
    }
    if (b.stunned > s.t){ if (b.kind === 'wasp' && (b.carry || b.state !== 'rest')){ waspDrops(s, b); b.atk = null; b.state = 'rest'; b.restT = 4; if (playerNear(s, b.x, b.y, 16)) s.player.msg = 'Locked in your jaws, the wasp drops to the ground!'; } continue; } // build 38: held in a mandible lock (still bitten)
    if (b.kind === 'ladybug') stepLadybug(s, b, B, dt);
    else if (b.kind === 'earwig') stepEarwig(s, b, B, dt);
    else if (b.kind === 'cricket') stepCricket(s, b, B, dt);
    else if (b.kind === 'jumper') stepJumper(s, b, B, dt);
    else if (b.kind === 'assassin') stepAssassin(s, b, B, dt);
    else if (b.kind === 'wasp') stepWasp(s, b, B, dt);
    else if (b.kind === 'skink') stepSkink(s, b, B, dt);
    else stepMillipede(s, b, B, dt);
  }
  for (const b of s.critters) if ((b.gone || b.hp <= 0) && b.region != null) s.bugGone[b.region + ':' + b.kind] = s.t;
  s.critters = s.critters.filter(b => !b.gone && b.hp > 0);
}
function bugDies(s, b){
  const B = BUGS[b.kind], c = s.colony, P = s.player, x = Math.floor(b.x/T), y = Math.floor(b.y/T);
  s.items.push({ x, y, kind: 'protein', type: b.kind, amt: B.meat, yaw: Math.atan2(b.dy || 0, b.dx || 1) });
  if (B.chitin){ const cx = x + 1; if (walk(s, cx, y) && !itemAt(s, cx, y)) s.items.push({ x: cx, y, kind: 'chitin', type: 'shell', amt: B.chitin }); }
  if (b.held) assassinLets(s, b); // whatever it held is free
  if (b.carry) waspDrops(s, b);
  for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < 3*T) gainXp(s, a, 8);
  if (picked(s, 'venom', 'hunter')) trailHome(s, b.x, b.y);
  if (!c.kills[b.kind]) gainGenes(s, 1, 'your first ' + B.name);
  c.kills[b.kind] = (c.kills[b.kind] || 0) + 1; b.gone = true;
  s.bugDead = { kind: b.kind, x: b.x, y: b.y, t: s.t };
  if (playerNear(s, b.x, b.y, 16) && (!P.msg || /down!|🧬/.test(P.msg))) P.msg = `${B.name.charAt(0).toUpperCase() + B.name.slice(1)} down! ${B.meat} protein: haul it home.`;
}
// Build 37: hunters. Each sees ants within 8 tiles; with five or more of your ants on top of it, it backs
// off toward home for a few seconds. Their attacks are telegraphed (b.atk), drawn like a boss's.
// After a kill a hunter stops to eat, 8 s, still and easy to bite.
function hunterEats(s, b){ b.eatT = 8; b.state = 'eat'; b.atk = null; b.fullUntil = s.t + 8 + 90; } // then sated: it won't hunt for 90 s
const crowdOn = (s, b, r) => { let n = 0; const R = r*T; for (const a of s.ants) if (!a.team && Math.abs(a.x - b.x) < R && Math.abs(a.y - b.y) < R && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < R) n++; return n; };
// Leashed: it hunts only ants within 12 tiles of its home (it won't follow foragers back to your nest).
function huntTarget(s, b, r){ if (b.fullUntil > s.t && !b.carry) return null; if (isNight(s) && !b.carry){ if (DIURNAL[b.kind]) return null; if (b.kind === 'assassin') r *= 1.4; } /* build 43 */ let best = null, bd = r*T; const hx = (b.hx + 0.5)*T, hy = (b.hy + 0.5)*T; for (const a of s.ants){ if (a.team || !outside(a) || (a.isPlayer && a.feign > s.t) || Math.hypot(a.x - hx, a.y - hy) > 12*T) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < bd){ bd = d; best = a; } } return best ? [best, bd] : null; }
// The jumping spider: a short crouch (the tell, a lane on the ground), then a leap of up to 5 tiles onto
// an ant; it bites what it lands on. Between leaps it bites what's next to it.
function stepJumper(s, b, B, dt){
  const P = s.player;
  if (b.eatT > 0){ b.eatT -= dt; if (b.eatT <= 0) b.state = 'walk'; return; }
  if (b.state === 'hop'){ const u = Math.min(1, b.t/0.35); b.x = b.hx0 + (b.hx1 - b.hx0)*u; b.y = b.hy0 + (b.hy1 - b.hy0)*u;
    if (u >= 1){ b.state = 'walk'; b.t = 0; b.cd = 2.4; b.leaps = (b.leaps || 0) + 1; b.landAt = s.t;
      let killed = false; for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < 1.3*T){ hurtAnt(s, a, 6, 'jumper'); spark(s, null, a.x, a.y, 1); if (a.state === 'dead') killed = true; }
      if (killed) hunterEats(s, b); else if (b.leaps >= 3){ b.leaps = 0; b.restT = 6; } }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.state = 'hop'; b.t = 0; b.hx0 = b.x; b.hy0 = b.y; b.hx1 = b.x + k.dx*k.len; b.hy1 = b.y + k.dy*k.len; return; }
  b.cd = (b.cd || 0) - dt; b.biteCd = (b.biteCd || 0) - dt;
  if (crowdOn(s, b, 3) >= 5 || b.restT > 0){ if (!(b.restT > 0)) b.restT = 4; b.restT -= dt; b.state = 'walk'; if (bugMove(s, b, (b.hx + 0.5)*T, (b.hy + 0.5)*T, 40, dt)) b.restT = 0; if (b.leaps >= 4) b.leaps = 0; return; }
  const tg = huntTarget(s, b, 8);
  if (!tg){ b.state = 'walk'; if (b.gx == null || bugMove(s, b, b.gx, b.gy, B.speed*0.6, dt)) bugWander(s, b, 6); return; }
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (!b.warned && playerNear(s, b.x, b.y, 14)){ b.warned = true; P.msg = 'A jumping spider! When it crouches, it leaps: get out of its line.'; }
  if (d < 1.4*T){ if (b.biteCd <= 0){ b.biteCd = 1.0; hurtAnt(s, a, 2.5, 'jumper'); spark(s, null, a.x, a.y, 1); b.pinchAt = s.t; if (a.state === 'dead') hunterEats(s, b); } return; }
  if (b.cd <= 0 && d < 6*T){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(5*T, d + 0.4*T), w: 1.3*T, t: 0, at: 0.5 }; b.state = 'crouch'; return; }
  b.state = 'walk'; bugMove(s, b, a.x, a.y, B.speed, dt);
}
// The assassin bug: slow, it stalks. A red dot on an ant, then its beak goes in: the ant is held and
// drained. Bite the bug for 15 and it lets go; otherwise the ant is lost in about four seconds.
function assassinLets(s, b){ const H = b.held; b.held = null; if (!H) return; const a = s.ants.find(o => o.id === H.id); if (a && a.state !== 'dead'){ a.lockT = 0; a.impaled = false; shove(s, a, b.x, b.y, 1.5); } }
function stepAssassin(s, b, B, dt){
  const P = s.player;
  if (b.eatT > 0 && !b.held){ b.eatT -= dt; if (b.eatT <= 0) b.state = 'walk'; return; }
  if (b.held){ const H = b.held, a = s.ants.find(o => o.id === H.id);
    if (!a || a.state === 'dead'){ b.held = null; b.cd = 3; return; }
    a.x = b.x + b.dx*1.9*T; a.y = b.y + b.dy*1.9*T; a.lockT = 0.2; a.impaled = true;
    a.hp -= 1.6*dt; a.hitT = s.t; if (a.isPlayer) P.hit = s.t;
    if (a.hp <= 0){ a.impaled = false; killAnt(s, a, 'assassin'); b.held = null; b.cd = 3; hunterEats(s, b); return; }
    if (H.hp0 - b.hp >= 15){ assassinLets(s, b); b.cd = 2; if (playerNear(s, b.x, b.y, 16)) P.msg = 'Bitten hard, the assassin bug lets go!'; }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.stabAt = s.t;
    const a = s.ants.find(o => !o.team && outside(o) && Math.hypot(o.x - k.x, o.y - k.y) < k.r);
    if (a){ if (a.isPlayer){ hurtAnt(s, a, 4, 'assassin'); b.cd = 2.5; } else { b.held = { id: a.id, hp0: b.hp }; if (playerNear(s, b.x, b.y, 16)) P.msg = 'The assassin bug has an ant on its beak! Bite it hard to make it let go.'; } }
    else b.cd = 2; return; }
  b.cd = (b.cd || 0) - dt;
  if (crowdOn(s, b, 3) >= 6){ b.state = 'walk'; bugMove(s, b, (b.hx + 0.5)*T, (b.hy + 0.5)*T, B.speed*2, dt); return; }
  const tg = huntTarget(s, b, 7);
  if (!tg){ b.state = 'walk'; if (b.gx == null || bugMove(s, b, b.gx, b.gy, B.speed, dt)) bugWander(s, b, 5); return; }
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (!b.warned && playerNear(s, b.x, b.y, 14)){ b.warned = true; P.msg = 'An assassin bug is stalking your ants. It stabs where the red dot shows.'; }
  if (b.cd <= 0 && d < 2.2*T){ b.atk = { kind: 'ring', x: a.x, y: a.y, r: 1.0*T, t: 0, at: 0.8 }; b.state = 'stab'; return; }
  b.state = 'walk'; bugMove(s, b, a.x, a.y, B.speed, dt);
}
// The hunting wasp (build 38): in the air it can't be bitten. Its shadow settles on an ant (the tell, a
// ring), then it dives: the ant is carried off and lost, unless the wasp is stunned or killed first (a
// Mandible Lock reaches it as it lifts away). Then it lands to rest and eat: on the ground it can be
// bitten, and it stings back. With nothing to hunt it lands now and then anyway.
function waspDrops(s, b){ const a = s.ants.find(o => o.id === b.carry); b.carry = null; if (a && a.state === 'away'){ a.state = 'return'; a.x = b.x; a.y = b.y; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); a.lockT = 0.5; } }
function stepWasp(s, b, B, dt){
  const P = s.player;
  if (b.state === 'walk') b.state = 'fly'; // (spawned on the ground: up it goes)
  if (b.state === 'rest'){ b.restT -= dt; b.stingCd = (b.stingCd || 0) - dt;
    const tg = huntTarget(s, b, 1.6); if (tg && b.stingCd <= 0){ b.stingCd = 1.2; hurtAnt(s, tg[0], 3, 'wasp'); spark(s, null, tg[0].x, tg[0].y, 1); b.stingAt = s.t; if (tg[0].state === 'dead'){ hunterEats(s, b); return; } }
    if (b.restT <= 0){ b.state = 'fly'; b.t = 0; } return; }
  if (b.state === 'carry'){ b.t += 0; b.carryT -= dt; const a = s.ants.find(o => o.id === b.carry); bugMove(s, b, (b.hx + 0.5)*T, (b.hy + 0.5)*T, 50, dt);
    if (!a || a.state !== 'away'){ b.carry = null; b.state = 'fly'; return; }
    if (b.carryT <= 0){ b.carry = null; a.state = 'return'; killAnt(s, a, 'wasp'); hunterEats(s, b); /* build 47: fed like the other hunters */ } return; }
  if (b.state === 'eat'){ b.eatT -= dt; if (b.eatT <= 0){ b.state = 'rest'; b.restT = 2; } return; } /* on the ground eating: it can be bitten */
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.x = k.x; b.y = k.y; b.diveAt = s.t;
    const a = s.ants.find(o => !o.team && outside(o) && Math.hypot(o.x - k.x, o.y - k.y) < k.r);
    if (a){ if (a.isPlayer){ hurtAnt(s, a, 4, 'wasp'); b.state = 'rest'; b.restT = 4; } else { a.state = 'away'; a.foeId = 0; b.carry = a.id; b.carryT = 1.6; b.state = 'carry'; if (playerNear(s, b.x, b.y, 16)) P.msg = 'The wasp has an ant! Stun it before it gets away.'; } }
    else { b.state = 'rest'; b.restT = 4; } return; }
  // In the air: circle home, hunt.
  b.flyT = (b.flyT || 0) + dt; b.cd = (b.cd || 0) - dt;
  if (b.flyT > 9){ b.flyT = 0; b.state = 'rest'; b.restT = 5; return; }
  const tg = huntTarget(s, b, 9);
  if (tg && b.cd <= 0){ const [a] = tg; b.flyT = 0; b.cd = 4; b.atk = { kind: 'ring', x: a.x, y: a.y, r: 1.1*T, t: 0, at: 1.0 }; if (!b.warned && playerNear(s, b.x, b.y, 16)){ b.warned = true; P.msg = 'A hunting wasp! When its shadow settles on an ant, move it. Kill the wasp when it lands.'; } return; }
  const ang = s.t*0.8 + b.id, gx = (b.hx + 0.5)*T + Math.cos(ang)*5*T, gy = (b.hy + 0.5)*T + Math.sin(ang)*5*T;
  const d = Math.hypot(gx - b.x, gy - b.y); if (d > 2){ b.dx = (gx - b.x)/d; b.dy = (gy - b.y)/d; const m = Math.min(d, 40*SURF*dt); b.x += b.dx*m; b.y += b.dy*m; }
}
// The skink (build 38): the biggest hunter. It dashes down a lane, biting what it passes, and snaps at
// what's beside it. Hurt to half, it drops its wriggling blue tail (40 protein) and runs for 6 s; if it
// gets away it's gone, so stun it (a Mandible Lock) or burst it down before then.
function stepSkink(s, b, B, dt){
  const P = s.player;
  if (b.eatT > 0){ b.eatT -= dt; if (b.eatT <= 0) b.state = 'walk'; return; }
  if (!b.tailless && b.hp < b.maxHp*0.5){ b.tailless = true; b.atk = null; b.dash = null;
    const x = Math.floor((b.x - (b.dx || 1)*2*T)/T), y = Math.floor((b.y - (b.dy || 0)*2*T)/T);
    if (walk(s, x, y)) s.items.push({ x, y, kind: 'protein', type: 'skinktail', amt: 40, t0: s.t, yaw: Math.atan2(b.dy || 0, b.dx || 1) });
    b.state = 'flee'; b.fleeT = 6; if (playerNear(s, b.x, b.y, 18)) P.msg = 'The skink drops its tail and runs! Lock it before it gets away.'; return; }
  if (b.state === 'flee'){ b.fleeT -= dt; const n = huntTarget(s, b, 10), from = n ? n[0] : { x: b.x - (b.dx || 1), y: b.y - (b.dy || 0) };
    bugMove(s, b, b.x + (b.x - from.x)*4, b.y + (b.y - from.y)*4, 75, dt);
    if (b.fleeT <= 0){ b.gone = true; if (playerNear(s, b.x, b.y, 24)) P.msg = 'The skink got away into the rocks. It will be back, tail and all.'; } return; }
  if (b.dash){ const R = b.dash, step = 190*SURF*dt, nx = b.x + R.dx*step, ny = b.y + R.dy*step;
    if (bugTile(s, nx, ny)){ b.x = nx; b.y = ny; R.done += step; }
    for (const a of s.ants) if (!a.team && outside(a) && !R.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < 1.5*T){ R.hit[a.id] = 1; hurtAnt(s, a, 5, 'skink'); spark(s, null, a.x, a.y, 1); if (a.state === 'dead') R.kill = true; }
    if (!bugTile(s, nx, ny) || R.done >= R.len){ b.dash = null; b.cd = 2.2; if (R.kill) hunterEats(s, b); } return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null;
    if (k.kind === 'lane'){ b.dash = { dx: k.dx, dy: k.dy, len: k.len, done: 0, hit: {} }; return; }
    b.snapAt = s.t; let kill = false; for (const a of s.ants){ if (a.team || !outside(a) || Math.hypot(a.x - k.x, a.y - k.y) > k.r) continue; hurtAnt(s, a, 6, 'skink'); spark(s, null, a.x, a.y, 1); if (a.state === 'dead') kill = true; }
    b.cd = 1.4; if (kill) hunterEats(s, b); return; }
  b.cd = (b.cd || 0) - dt;
  if (crowdOn(s, b, 3) >= 8){ b.state = 'walk'; bugMove(s, b, (b.hx + 0.5)*T, (b.hy + 0.5)*T, 50, dt); return; }
  const tg = huntTarget(s, b, 9);
  if (!tg){ b.state = 'walk'; if (b.gx == null || bugMove(s, b, b.gx, b.gy, B.speed*0.5, dt)) bugWander(s, b, 6); return; }
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (!b.warned && playerNear(s, b.x, b.y, 16)){ b.warned = true; P.msg = 'A skink! It dashes down the lane it shows. Hurt, it drops its tail and runs: lock it first.'; }
  if (b.cd <= 0){ if (d < 2*T) b.atk = { kind: 'ring', x: a.x, y: a.y, r: 1.2*T, t: 0, at: 0.5 }; else if (d < 8*T) b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(8*T, d + 2*T), w: 1.6*T, t: 0, at: 0.6 }; if (b.atk) return; }
  b.state = 'walk'; bugMove(s, b, a.x, a.y, B.speed, dt);
}
// Ladybug: flies in by your aphids and eats them. Bitten to half, or full, it flies away.
function stepLadybug(s, b, B, dt){
  const P = s.player, c = s.colony;
  if (b.state === 'land'){ if (b.t > 1.2){ b.state = 'walk'; b.t = 0; } return; }
  if (b.state === 'fly'){ if (b.t > 1.6) b.gone = true; return; }
  if (b.hp < b.maxHp*0.5 || (b.ate || 0) >= 40 || b.life > 180){
    const chased = b.hp < b.maxHp*0.5; b.state = 'fly'; b.t = 0;
    if (chased){
      for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < 3*T) gainXp(s, a, 6);
      if (!c.kills.ladybugOff) gainGenes(s, 1, 'chasing off a ladybug');
      c.kills.ladybugOff = (c.kills.ladybugOff || 0) + 1;
      if (playerNear(s, b.x, b.y, 16)) P.msg = 'The ladybug flies off. Your aphids are safe.';
    }
    return;
  }
  let f = b.ax != null ? s.items.find(o => o.type === 'aphids' && o.x === b.ax && o.y === b.ay) : null;
  if (!f || f.amt < 1){ f = null; let bd = 24; for (const o of s.items) if (o.type === 'aphids' && o.amt >= 3){ const d = Math.hypot(o.x + 0.5 - b.x/T, o.y + 0.5 - b.y/T); if (d < bd){ bd = d; f = o; } } b.ax = f ? f.x : null; b.ay = f ? f.y : null; }
  if (f){
    const gx = (f.x + 0.5)*T + 6, gy = (f.y + 0.5)*T;
    if (Math.hypot(gx - b.x, gy - b.y) < 0.6*T){ b.state = 'eat'; b.dx = -1; b.dy = 0; const take = Math.min(f.amt, 1.2*dt); f.amt -= take; b.ate = (b.ate || 0) + take;
      if (!b.warned && playerNear(s, b.x, b.y, 18)){ b.warned = true; P.msg = 'A ladybug is eating your aphids! Bite it and it flies off.'; } }
    else { b.state = 'walk'; bugMove(s, b, gx, gy, B.speed, dt); }
    return;
  }
  b.state = 'walk'; if (b.gx == null || bugMove(s, b, b.gx, b.gy, B.speed, dt)) bugWander(s, b, 4);
}
// Earwig: rushes any ant that comes close and pinches. Foragers keep clear;
// badly hurt, it runs for cover and is gone.
function stepEarwig(s, b, B, dt){
  b.pinchT = Math.max(0, (b.pinchT || 0) - dt);
  for (const a of s.ants){ if (!outside(a) || a.isPlayer || a.follow || CASTES[a.caste].fight >= 3) continue; if (Math.hypot(a.x - b.x, a.y - b.y) < 4*T){ a.flee = Math.max(a.flee, 1.5); a.fleeFrom = b; } }
  if (b.hp < b.maxHp*0.3 && b.state !== 'flee'){ b.state = 'flee'; b.t = 0; }
  if (b.state === 'flee'){
    if (b.t > 10){ b.gone = true; return; }
    const n = nearAnt(s, b, 12*T); if (n) bugMove(s, b, b.x + (b.x - n[0].x), b.y + (b.y - n[0].y), 38, dt);
    return;
  }
  const n = nearAnt(s, b, 3.5*T);
  if (n){
    const [a, d] = n; b.state = 'rush';
    if (d < B.reach*T){ b.dx = (a.x - b.x)/(d || 1); b.dy = (a.y - b.y)/(d || 1);
      if (!b.pinchT){ b.pinchT = B.pinchEvery; b.pinchAt = s.t; spark(s, null, a.x, a.y, 1); hurtAnt(s, a, a.isPlayer ? 1.5 : B.pinch, 'earwig'); } }
    else bugMove(s, b, a.x, a.y, B.rush, dt);
    return;
  }
  b.state = 'walk'; if (b.gx == null || b.t > 10 || bugMove(s, b, b.gx, b.gy, B.speed, dt)){ bugWander(s, b, 5); b.t = 0; }
}
// Cricket: hops away from anything that comes near, five hops and it's worn
// out for a few seconds. That's when you catch it.
function stepCricket(s, b, B, dt){
  const P = s.player;
  if (b.stam == null) b.stam = 5;
  if (b.state === 'hop'){ const u = Math.min(1, b.t/0.55); b.x = b.hx0 + (b.hx1 - b.hx0)*u; b.y = b.hy0 + (b.hy1 - b.hy0)*u; if (u >= 1){ b.state = 'sit'; b.t = 0; } return; }
  if (b.state === 'tired'){ if (b.t > 5){ b.state = 'sit'; b.t = 0; b.stam = 3; } return; }
  if (b.state === 'walk') b.state = 'sit';
  b.stam = Math.min(5, b.stam + dt/6);
  const n = nearAnt(s, b, 4.5*T), hit = s.t - (b.hitT || -9) < 0.15;
  if ((n || hit) && b.t > 0.35){
    if (b.stam < 1){ b.state = 'tired'; b.t = 0; if (playerNear(s, b.x, b.y, 14)) P.msg = 'The cricket is worn out. Get it now!'; return; }
    const from = n ? n[0] : P.ant || { x: b.x - 1, y: b.y };
    if (bugHop(s, b, Math.atan2(b.y - from.y, b.x - from.x), 3 + Math.random()*2)) b.stam -= 1;
    return;
  }
  // Now and then it chirps, or takes a short hop of its own.
  if (!n && b.t > 3 && Math.random() < dt*0.4) { b.chirpAt = s.t; b.t = 0; if (Math.random() < 0.3) bugHop(s, b, Math.random()*Math.PI*2, 1.5); }
}
function bugHop(s, b, away, tiles){
  for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4]){
    const d = tiles*T, x = b.x + Math.cos(away + off)*d, y = b.y + Math.sin(away + off)*d;
    if (!bugTile(s, x, y)) continue;
    b.state = 'hop'; b.t = 0; b.hx0 = b.x; b.hy0 = b.y; b.hx1 = x; b.hy1 = y; b.dx = Math.cos(away + off); b.dy = Math.sin(away + off); b.hops = (b.hops || 0) + 1; return true;
  }
  return false;
}
// Millipede: harmless, slow, armoured. Bitten, it curls into a ball for a
// while and takes a third of the damage.
function stepMillipede(s, b, B, dt){
  if (b.state === 'curl'){ b.curlT -= dt; if (b.curlT <= 0){ b.state = 'walk'; b.t = 0; } return; }
  if (b.gx == null || b.t > 14 || bugMove(s, b, b.gx, b.gy, B.speed, dt)){ bugWander(s, b, 5); b.t = 0; }
}
// Rain (build 16): drops knock ants about outside. Some lose what they carry.
function tickSplash(s, dt){
  if (!s.rain.on) return;
  const P = s.player;
  for (const a of s.ants){
    if (!outside(a) || a.knockT > 0 || (a.isPlayer && P.big)) continue;
    if (Math.random() > dt*(a.isPlayer ? 0.12 : 0.08)) continue;
    const ang = Math.random()*Math.PI*2, d = (1 + Math.random())*T*(a.isPlayer ? 0.6 : 1);
    a.knockT = 0.3; a.kx = Math.cos(ang)*d/0.3; a.ky = Math.sin(ang)*d/0.3; a.hitT = s.t;
    s.splashes.push({ x: a.x, y: a.y, t: s.t }); if (s.splashes.length > 40) s.splashes.shift();
    if (!a.isPlayer && a.carry && a.kind !== 'water' && Math.random() < 0.35 && !itemAt(s, a.tx, a.ty)){
      const F = FOODS[a.itype], type = !a.itype || (F && F.crew) || a.itype === 'aphids' || a.itype === 'dew' ? (a.kind === 'grit' ? 'pebble' : a.kind === 'protein' ? 'bug' : 'crumb') : a.itype;
      s.items.push({ x: a.tx, y: a.ty, kind: a.kind, type, amt: a.carry }); a.carry = 0; a.itype = null;
    }
    if (a.isPlayer){ P.splashed = s.t; if (!s.seen.splash){ s.seen.splash = true; P.msg = 'Raindrops knock ants about. Some drop what they carry.'; } }
  }
}
// Knocked by a raindrop: slide, then carry on from wherever it lands.
function knock(s, a, dt){
  a.knockT -= dt; const nx = a.x + a.kx*dt, ny = a.y + a.ky*dt;
  if (walk(s, Math.floor(nx/T), Math.floor(ny/T))){ a.x = nx; a.y = ny; }
  a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T);
}
// ---------- bosses (build 19) ----------
// Three great beasts, each in its own lair. Each one wakes when ants come
// near, shows every attack before it lands (the renderer paints the danger
// on the ground: b.atk), turns nastier at half health, and once dead stays
// dead and leaves a trophy that changes the colony for good.
//   hornworm: strips the plants your aphids live on; rears and thrashes
//     (a ring), spits goo (a circle), and in its frenzy rolls (a lane).
//   beetle: armoured; charges down a lane and is dazed after, longer if it
//     slams into a rock: that's when bites count. Snaps at ants close by.
//   antlion: the antlion queen, under the sand of the deepest pit. Drags
//     ants down (a swirl under them), flings sand. Eight ants at the pit's
//     edge draw her up; she surfaces after every grab. Later she tunnels
//     from pit to pit.
const BOSSES = {
  hornworm: { name: 'The Hornworm', title: 'Glutton of the Tomato Rows', region: 'tomatoes', hp: 700, r: 2.6, aggro: 9, meat: 120, chitin: 10, trophy: 'silk', phase2: 0.5, slayer: 'Hornworm-slayer',
    tip: 'It strips the plants your aphids live on. When it rears up, get out of the red ring. Bring a big crew and soldiers.', rage: 'The hornworm thrashes into a frenzy!' },
  beetle: { name: 'The Ground Beetle', title: 'Armoured Hunter of the Rock Garden', region: 'rockgarden', hp: 520, r: 2.2, aggro: 10, meat: 60, chitin: 45, trophy: 'shell', phase2: 0.4, slayer: 'Shell-breaker',
    tip: 'Bites barely scratch its armour. Step out of its charge lane: when it slams into something it is dazed. Then bite!', rage: 'The beetle is enraged: it charges twice!' },
  antlion: { name: 'The Antlion Queen', title: 'Terror of the Sandbox', region: 'sandbox', hp: 480, r: 2.4, aggro: 7, meat: 80, chitin: 25, trophy: 'mandible', phase2: 0.5, slayer: 'Pit-breaker',
    tip: 'She hides under the deepest pit and drags ants down: step off the swirling sand. Eight ants at the pit’s edge draw her up. Then bite!', rage: 'The antlion queen tunnels between the pits!' },
  // Build 30: the Great Lawn's guardian (COMBAT.md). Robins hunt the whole lawn while it rules it.
  robin: { name: 'The Old Robin', title: 'Terror of the Great Lawn', region: 'bare', hp: 600, r: 2.0, aggro: 10, meat: 70, chitin: 0, trophy: 'feather', phase2: 0.5, slayer: 'Robin-chaser', flees: true,
    tip: 'It pecks where the red dot shows, beats its wings at a crowd and hops after the rest. Six ants on its feet pin it: no hopping, no flying off, and bites do double.', rage: 'The Old Robin takes to the air: watch its shadow, and get out of its swoop!' },
  // Build 31: the Wet Edge's guardian.
  toad: { name: 'Old Warty', title: 'King of the Wet Edge', region: 'toadhole', hp: 750, r: 2.4, aggro: 9, meat: 140, chitin: 0, trophy: 'poison', phase2: 0.5, slayer: 'Toad-sticker',
    tip: 'Its tongue shoots down the thin red lane and swallows the first ant in it: bite the toad within 3 seconds and it spits the ant out alive. It only looks ahead: bites from behind do double. Its skin is poison, unless a medic is near.', rage: 'Old Warty puffs himself up and lashes twice!' },
  // Build 34: the Hedge Row's guardian.
  mantis: { name: 'The Praying Mantis', title: 'Ghost of the Hedge Row', region: 'hedge3', hp: 560, r: 2.2, aggro: 6, meat: 90, chitin: 15, trophy: 'claw', phase2: 0.5, slayer: 'Mantis-breaker',
    tip: 'You won’t see it until you’re close. When it sways, get out of the lane in front of it: it grabs what’s there and eats it. While it eats, its claws are busy: bite it for double. A Mandible Lock makes it drop its meal.', rage: 'The mantis strikes twice now, and flutters after you!' },
  // Build 35: the Side Yard's guardian.
  widow: { name: 'The Black Widow', title: 'Queen of the Shed', region: 'shed', hp: 520, r: 1.8, aggro: 8, meat: 60, chitin: 20, trophy: 'widowsilk', phase2: 0.5, slayer: 'Web-cutter',
    tip: 'Her web holds anything that walks into it, and her bite is deadly. Bite through the four white anchors at its edge and she drops to the floor: swarm her then, bites do double. A Mandible Lock works on her anywhere.', rage: 'The widow drops on a thread to spin a new web!' },
  // Build 36: the Rot's guardian.
  centipede: { name: 'The Giant Centipede', title: 'Terror of the Rot', region: 'leaves2', hp: 540, r: 2.0, aggro: 9, meat: 100, chitin: 30, trophy: 'fang2', phase2: 0.34, slayer: 'Centipede-cutter',
    tip: 'Six segments: every 90 damage cuts one off, and it gets faster for it. When it coils, get out of the ring, but bite it then too: its joints are open (double). When it shows a lane, it rushes down it.', rage: 'Two segments left: the centipede goes frantic!' },
};
const ROT_ZONE = new Set(['leaves', 'leaves2', 'compost']);
const SIDE_ZONE = new Set(['shed', 'side2', 'side3', 'side4']);
const HEDGE_ZONE = new Set(['hedge1', 'hedge2', 'hedge3', 'hedge4', 'hedge5', 'hedge6']);
const WET_ZONE = new Set(['toadhole', 'thistles', 'reeds', 'slugs', 'drain', 'mudflat', 'wetedge']);
// The Great Lawn: the regions the Old Robin rules (no robins over them once it's driven off).
const LAWN_ZONE = new Set(['lawn', 'clover', 'molehills', 'dandelions', 'pool', 'sprinkler', 'fairyring', 'gnome', 'frisbee', 'bone', 'cloverhill', 'truck', 'bare', 'longgrass', 'daisies', 'lawnedge']);
const TROPHY = {
  silk: { name: 'Hornworm silk', fx: 'builders build rooms twice as fast' },
  shell: { name: 'The beetle’s shell', fx: 'you can build an Armory: every ant 50% tougher, foragers shrug off a foot or beak' },
  mandible: { name: 'The antlion’s mandible', fx: 'fighters bite 15% harder, and the pits never drag your ants down' },
  feather: { name: 'The Old Robin’s feather', fx: 'birds never take your ants, and no robins hunt the Great Lawn' },
  fang2: { name: 'The centipede’s fang', fx: 'Venom ants stun what they bite for a second; no toads in the leaves, and the Rot can be held' },
  widowsilk: { name: 'The widow’s silk', fx: 'a web at your door: raiders stick in it for 3 seconds, and no bug spray in the shed' },
  claw: { name: 'The mantis’s claw', fx: 'each of your fighters’ first bite on a foe always lands, for double; the hedge is safe, and your ants run through it half again faster' },
  poison: { name: 'Old Warty’s poison', fx: 'your ants taste bitter: toads, birds and spiders spit out half the ants they catch, and no toads hunt the Wet Edge' },
};
// Where each boss lives, made when its region first wakes.
function ensureBoss(s, key){
  if (s.bosses[key]) return s.bosses[key];
  const B = BOSSES[key], ai = REGION[B.region]; if (ai == null || !s.active[ai]) return null;
  const w = s.world, b0 = areaBounds(ai), cl = clearOf(s);
  let x = null, y = null, pit = -1;
  if (key === 'antlion'){
    // The deepest pit: the one farthest from your nest.
    let bd = -1; w.pits.forEach((p, i) => { const d = Math.hypot(p.x - w.ex, p.y - w.ey); if (d > bd){ bd = d; pit = i; } });
    if (pit < 0) return null; x = w.pits[pit].x; y = w.pits[pit].y;
  } else {
    const shed = key === 'widow' ? w.landmarks.find(l => l.kind === 'shed') : null;
    let best = -1; const cx = key === 'mantis' ? b0.x0 + 5 : shed ? shed.x0 + shed.w + 5 : (b0.x0 + b0.x1)/2, cy = shed ? shed.y0 + shed.h*0.4 : (b0.y0 + b0.y1)/2; // the mantis at the hedge's edge; the widow by the shed wall // the mantis waits at the hedge's edge, facing the lawn
    for (let ty = b0.y0 + 6; ty < b0.y1 - 6; ty += 2) for (let tx = b0.x0 + 6; tx < b0.x1 - 6; tx += 2){
      const room = cl[ty*W + tx]; if (room < (key === 'mantis' ? 2 : 4)) continue;
      const sc = room*3 - Math.hypot(tx - cx, ty - cy)*(key === 'mantis' || key === 'widow' ? 1.5 : 0.3); if (sc > best){ best = sc; x = tx + 0.5; y = ty + 0.5; } }
    if (x == null) return null;
  }
  return (s.bosses[key] = { key, x: x*T, y: y*T, hx: x*T, hy: y*T, hp: B.hp, maxHp: B.hp, mode: 'idle', phase: 1, atk: null, cd: 2, dx: 1, dy: 0, t: 0, pit, under: key === 'antlion', dead: false });
}
const bossArmour = (s, b, a) => {
  if (b.key === 'beetle'){ if (b.dazeT > 0) return 2.5; return a.caste === 'venom' ? 0.5 : a.isPlayer ? 0.35 : 0.15; }
  if (b.key === 'antlion') return b.under ? 0 : 1;
  if (b.key === 'robin') return b.air ? 0 : b.pinned ? 2 : 1;
  if (b.key === 'mantis') return b.eat ? 2 : 1;
  if (b.key === 'widow') return b.grounded ? 2 : 0.35; // up in her web she is hard to reach
  if (b.key === 'centipede') return b.atk && b.atk.kind === 'ring' ? 2 : b.rush ? 0.6 : 1; // coiled, its joints are open
  if (b.key === 'toad'){ const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, behind = ((a.x - b.x)*b.dx + (a.y - b.y)*b.dy)/d < -0.3; return (behind ? 2 : 1)*(b.puffT > 0 ? 0.5 : 1); }
  return 1;
};
function tickBosses(s, dt){
  for (const key in BOSSES) ensureBoss(s, key);
  const P = s.player, yb = youL(s) >= 3 ? 1.5 : 1, c = s.colony;
  for (const key in s.bosses){
    const b = s.bosses[key], B = BOSSES[key]; if (b.dead) continue;
    b.t += dt; if (b.slowT > 0) b.slowT -= dt;
    // The first time you come near: its name, and how to beat it.
    if (!b.intro && playerNear(s, b.x, b.y, 18) && !(key === 'mantis' && b.mode === 'idle')){ /* the mantis stays a secret until it shows itself */ b.intro = true; s.bossIntro = { key, t: s.t }; s.events.push('boss'); P.msg = `${B.name}, ${B.title}. ${B.tip}`; }
    let near = nearAnt(s, b, B.aggro*T, (o) => !o.team); // (build 25: rival colonies living near a boss don't wake it)
    if (key === 'robin'){ b.asleep = isNight(s) && b.mode === 'idle'; if (b.asleep) near = null; } // build 43: asleep on its roost till something bites it
    if (b.mode === 'idle' && (near || s.t - (b.hitT ?? -9) < 1)){ b.mode = 'fight'; b.leaveT = 0; b.wakeAt = s.t; b.cost0 = deathTotal(c); s.events.push('bossawake'); }
    if (b.mode === 'fight'){
      if (!nearAnt(s, b, 30*T)){ b.leaveT += dt; if (b.leaveT > 8){ b.mode = 'idle'; b.atk = null; b.charge = null; b.roll = null; } } else b.leaveT = 0;
    } else if (b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + 2*dt); // left alone, it heals
    // Bitten by fighters, your crew and you; fighters on patrol nearby join in.
    const lpit = b.key === 'antlion' && s.world.pits[b.pit], reach = lpit ? (lpit.r*1.05 + 1.2)*T /* build 47: bitten from the rim, off the sliding sand */ : (B.r + 0.9)*T, arm0 = (b.key === 'antlion' && b.under) || (b.key === 'robin' && b.air);
    let onIt = 0;
    for (const a of s.ants){
      if (a.team || !outside(a)) continue;
      const fighter = CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer, d = Math.hypot(a.x - b.x, a.y - b.y);
      if (fighter && !arm0 && d < reach*reachOf(s, a)){
        onIt++;
        // Old Warty's skin is poison to bite, unless a medic is close by.
        if (key === 'toad' && !s.ants.some(m => m.caste === 'medic' && !m.team && outside(m) && Math.hypot(m.x - a.x, m.y - a.y) < 5*T)) hurtAnt(s, a, 0.35*dt, 'toad');
        if (a.state === 'dead') continue;
        const arm = bossArmour(s, b, a)*(exposed(s, b) ? 1.5 : 1), dmg = bite(s, a, 'boss')*dt*(a.isPlayer ? 2*yb : 1)*arm;
        b.hp -= dmg; gainXp(s, a, dmg/3); b.hitT = s.t; (b.biters || (b.biters = {}))[a.id] = s.t;
        spark(s, a, a.x + (b.x - a.x)*0.6, a.y + (b.y - a.y)*0.6, arm < 0.5 ? 2 : 0);
        if (a.caste === 'venom' && picked(s, 'venom', 'neurotoxin') && Math.random() < dt*0.8) b.slowT = 1.5;
      } else if (b.mode === 'fight' && d < 8*T && CASTES[a.caste].fight >= 3 && (a.state === 'patrol' || a.state === 'hunt')){ a.state = 'fight'; a.goal = 'boss'; a.bossKey = key; }
    }
    if (key === 'robin'){ const was = b.pinned; b.pinned = !b.air && (onIt >= 6 || (isNight(s) && onIt >= 3)); /* build 43: groggy at night, three ants hold it */ if (b.pinned && !was && playerNear(s, b.x, b.y, 24)) P.msg = 'Your ants have the Old Robin by the feet: it’s pinned! Bites do double!'; }
    if (b.phase === 1 && b.hp < b.maxHp*B.phase2){ b.phase = 2; s.events.push('bossphase'); if (playerNear(s, b.x, b.y, 30)) P.msg = B.rage; }
    if (b.hp <= 0){ bossDies(s, b, B); continue; }
    if (key === 'mantis' && b.eat && stunned(s, b)) mantisDrops(s, b, 'Locked in your jaws, the mantis drops its meal!');
    if (stunned(s, b)) continue; // build 32: Mandible lock
    if (key === 'hornworm') stepHornworm(s, b, B, dt);
    else if (key === 'beetle') stepBeetle(s, b, B, dt);
    else if (key === 'robin') stepRobin(s, b, B, dt);
    else if (key === 'toad') stepToad(s, b, B, dt);
    else if (key === 'mantis') stepMantis(s, b, B, dt);
    else if (key === 'widow') stepWidow(s, b, B, dt);
    else if (key === 'centipede') stepCentipede(s, b, B, dt);
    else stepAntlion(s, b, B, dt);
  }
  // Goo the hornworm spat: it slows ants that walk through it.
  s.goo = s.goo.filter(g => s.t < g.end);
  for (const g of s.goo) for (const a of s.ants) if (outside(a) && Math.hypot(a.x - g.x, a.y - g.y) < g.r) a.slowT = Math.max(a.slowT || 0, 0.4);
}
function bossDies(s, b, B){
  const c = s.colony, P = s.player, x = Math.floor(b.x/T), y = Math.floor(b.y/T);
  b.dead = true; b.deadT = s.t;
  /* build 41: whatever it holds or is eating goes free (it used to stay 'away' for good) */
  if (b.held){ const H = b.held, a = s.ants.find(o => o.id === H.id); b.held = null; if (a && a.state === 'away'){ a.state = H.state || 'return'; a.x = b.x; a.y = b.y; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); } }
  if (b.eat) mantisDrops(s, b, null);
  b.atk = null; b.charge = null; b.roll = null; b.swoop = null; b.air = false;
  // The carcass: meat in heaps round it, and its chitin. (The Old Robin flies off, dropping the grubs it had.)
  for (let k = 0; k < 4; k++){ const a = k*Math.PI/2 + 0.4, mx = Math.round(x + Math.cos(a)*2), my = Math.round(y + Math.sin(a)*2); if (walk(s, mx, my)) s.items.push({ x: mx, y: my, kind: 'protein', type: 'boss', amt: Math.round(B.meat/4) }); }
  if (B.chitin && walk(s, x, y)) s.items.push({ x, y, kind: 'chitin', type: 'shell', amt: B.chitin });
  const ours = Object.entries(b.biters || {}).filter(([, t]) => s.t - t < 10).map(([id]) => s.ants.find(a => a.id === +id)).filter(a => a && a.state !== 'dead');
  for (const a of ours) gainXp(s, a, 50);
  if (ours.length) makeLegend(s, ours[Math.floor(Math.random()*ours.length)], B.slayer);
  if (picked(s, 'venom', 'hunter')) trailHome(s, b.x, b.y);
  c.trophies[B.trophy] = true; c.kills[b.key] = (c.kills[b.key] || 0) + 1;
  gainGenes(s, 6, B.name.replace(/^The /, 'the ') + ' is dead'); // build 42: was 4, so the tree's top nodes come with the boss wins
  const lost = deathTotal(c) - (b.cost0 || 0);
  s.report = { kind: 'boss', key: b.key, lost, t: s.t }; s.events.push('bossdown');
  s.bossDown = { key: b.key, t: s.t };
  P.msg = `${B.name} ${B.flees ? 'flies off for good' : 'is dead'}! It cost you ${lost} ant${lost === 1 ? '' : 's'}. Trophy: ${TROPHY[B.trophy].name}: ${TROPHY[B.trophy].fx}.`;
}
// Ants inside a telegraphed attack's shape.
function inAtk(k, x, y){
  if (k.kind === 'ring' || k.kind === 'spit' || k.kind === 'grab' || k.kind === 'toss') return Math.hypot(x - k.x, y - k.y) < k.r;
  // a lane: from (x, y) along (dx, dy), len long, w wide
  const ux = x - k.x, uy = y - k.y, along = ux*k.dx + uy*k.dy, across = Math.abs(-ux*k.dy + uy*k.dx);
  return along > -T && along < k.len && across < k.w/2;
}
function shove(s, a, fx, fy, tiles){ const d = Math.hypot(a.x - fx, a.y - fy) || 1; a.knockT = 0.3; a.kx = (a.x - fx)/d*tiles*T/0.3; a.ky = (a.y - fy)/d*tiles*T/0.3; }
const bossTarget = (s, b, r) => nearAnt(s, b, r*T);
function bossWalk(s, b, gx, gy, speed, dt){
  // Kept to its lair: never more than 16 tiles from home.
  if (Math.hypot(gx - b.hx, gy - b.hy) > 16*T){ const k = 16*T/Math.hypot(gx - b.hx, gy - b.hy); gx = b.hx + (gx - b.hx)*k; gy = b.hy + (gy - b.hy)*k; }
  const ddx = gx - b.x, ddy = gy - b.y, d = Math.hypot(ddx, ddy); if (d < 2) return;
  const base = Math.atan2(ddy, ddx), m = Math.min(d, speed*SURF*dt*(b.slowT > 0 ? 0.5 : 1)), cl = clearOf(s);
  for (const off of [0, 0.6, -0.6, 1.2, -1.2]){
    const nx = b.x + Math.cos(base + off)*m, ny = b.y + Math.sin(base + off)*m, tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    if (tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2 || cl[ty*W + tx] < 2) continue;
    b.x = nx; b.y = ny; b.dx = Math.cos(base + off); b.dy = Math.sin(base + off); return;
  }
}
function stepHornworm(s, b, B, dt){
  const w = s.world, ai = REGION[B.region];
  // It eats the plants: the aphids round it wither.
  for (const f of s.items) if (f.type === 'aphids' && w.area[idx(f.x, f.y)] === ai && Math.hypot((f.x + 0.5)*T - b.x, (f.y + 0.5)*T - b.y) < 18*T) f.amt = Math.max(0, f.amt - 0.5*dt);
  if (!b.warnedAphids && playerNear(s, b.x, b.y, 22)){ b.warnedAphids = true; if (!b.intro) s.player.msg = 'Something huge is stripping the tomato plants. The aphids there are dying.'; }
  if (b.mode === 'idle'){ if (!b.gx || b.t > 8){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*5*T; b.gy = b.hy + Math.sin(a)*5*T; } bossWalk(s, b, b.gx, b.gy, 5, dt); return; }
  const fast = b.phase === 2;
  // Rolling: it barrels down the lane it showed.
  if (b.roll){ const R = b.roll; R.t += dt; const u = Math.min(1, R.t/0.9); b.x = R.x0 + R.dx*R.len*u; b.y = R.y0 + R.dy*R.len*u;
    for (const a of s.ants) if (outside(a) && !R.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < B.r*T){ R.hit[a.id] = 1; hurtAnt(s, a, 5, 'hornworm'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x - R.dy*40, b.y + R.dx*40, 1.5); }
    if (u >= 1){ b.roll = null; b.cd = 2; b.atkDone = { kind: 'roll', t: s.t }; } return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.kind === 'ring'){ k.x = b.x; k.y = b.y; }
    if (k.t < k.at) return;
    b.atk = null; b.cd = fast ? 2.4 : 3.8; b.atkDone = { kind: k.kind, x: k.x, y: k.y, t: s.t };
    if (k.kind === 'ring') for (const a of s.ants){ if (!outside(a) || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 4, 'hornworm'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); }
    else if (k.kind === 'spit'){ s.goo.push({ x: k.x, y: k.y, r: k.r, t: s.t, end: s.t + 7 }); for (const a of s.ants) if (outside(a) && inAtk(k, a.x, a.y)){ hurtAnt(s, a, 1.5, 'hornworm'); a.slowT = 4; } }
    else if (k.kind === 'lane'){ b.roll = { x0: b.x, y0: b.y, dx: k.dx, dy: k.dy, len: k.len, t: 0, hit: {} }; }
    return; }
  b.cd -= dt;
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg;
  if (b.cd <= 0){
    if (d < 3.4*T) b.atk = { kind: 'ring', x: b.x, y: b.y, r: 3.6*T, t: 0, at: fast ? 0.9 : 1.2 };
    else if (fast && Math.random() < 0.5){ const dx = (a.x - b.x)/d, dy = (a.y - b.y)/d; b.dx = dx; b.dy = dy; b.atk = { kind: 'lane', x: b.x, y: b.y, dx, dy, len: Math.min(10*T, d + 3*T), w: 2.4*T, t: 0, at: 1.2 }; }
    else b.atk = { kind: 'spit', x: a.x, y: a.y, r: 2.4*T, t: 0, at: 1.4 };
    return;
  }
  if (d > B.r*T*1.1) bossWalk(s, b, a.x, a.y, fast ? 16 : 10, dt);
}
// The Old Robin (build 30). Pecks at a red dot, beats its wings at a crowd, hops after the rest. In its
// second phase it takes off: its shadow circles the lair, then it swoops down a lane and lands. Six ants
// on its feet pin it: no hops, no take-off, bites double.
function stepRobin(s, b, B, dt){
  if (b.mode === 'idle' && b.asleep){ b.air = false; return; } // asleep on the roost
  if (b.mode === 'idle'){ b.air = false; if (!b.gx || b.t > 5){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*5*T; b.gy = b.hy + Math.sin(a)*5*T; b.hopAt = s.t; } bossWalk(s, b, b.gx, b.gy, 12, dt); return; }
  const fast = b.phase === 2;
  // Swooping down the lane it showed: anything in the way is struck.
  if (b.swoop){ const S = b.swoop; S.t += dt; const u = Math.min(1, S.t/0.6); b.x = S.x0 + S.dx*S.len*u; b.y = S.y0 + S.dy*S.len*u;
    for (const a of s.ants) if (outside(a) && !a.team && !S.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < 1.5*T){ S.hit[a.id] = 1; hurtAnt(s, a, 5, 'bird'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); }
    if (u >= 1){ b.swoop = null; b.air = false; b.cd = 2.2; b.atkDone = { kind: 'stop', t: s.t, x: b.x, y: b.y }; b.landAt = s.t; } return; }
  // Aloft: it circles its lair, out of reach, then picks a lane.
  if (b.air && !b.atk){ b.airT -= dt; b.ang = (b.ang || 0) + dt*1.1; const gx = b.hx + Math.cos(b.ang)*6*T, gy = b.hy + Math.sin(b.ang)*6*T; b.x += (gx - b.x)*Math.min(1, dt*2); b.y += (gy - b.y)*Math.min(1, dt*2);
    if (b.airT <= 0){ const tg = bossTarget(s, b, 20); if (!tg){ b.air = false; b.landAt = s.t; return; } const [a, d] = tg, dx = (a.x - b.x)/d, dy = (a.y - b.y)/d; b.dx = dx; b.dy = dy; b.atk = { kind: 'lane', x: b.x, y: b.y, dx, dy, len: Math.min(14*T, d + 3*T), w: 2.2*T, t: 0, at: 0.9 }; }
    return; }
  // Hopping: a quick bound toward the crowd.
  if (b.hop){ const H = b.hop; H.t += dt; const u = Math.min(1, H.t/0.35); b.x = H.x0 + (H.x1 - H.x0)*u; b.y = H.y0 + (H.y1 - H.y0)*u; if (u >= 1) b.hop = null; return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t };
    if (k.kind === 'lane'){ b.swoop = { x0: b.x, y0: b.y, dx: k.dx, dy: k.dy, len: k.len, t: 0, hit: {} }; return; }
    if (k.what === 'peck'){ b.peckAt = s.t; for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 6, 'bird'); spark(s, null, a.x, a.y, 1); } }
    else { b.beatAt = s.t; for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 2, 'bird'); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2.5); } }
    b.cd = fast ? 1.3 : 1.9; return; }
  b.cd -= dt; b.flyCd = (b.flyCd ?? 6) - dt;
  // Phase 2: up it goes, unless your ants have it by the feet.
  if (fast && !b.pinned && b.flyCd <= 0 && !isNight(s)){ /* (no flying in the dark) */ b.air = true; b.airT = 3; b.flyCd = 9; b.ang = Math.atan2(b.y - b.hy, b.x - b.hx); b.upAt = s.t; return; }
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (b.cd <= 0){
    let crowd = 0; for (const o of s.ants) if (outside(o) && !o.team && Math.hypot(o.x - b.x, o.y - b.y) < 2.6*T) crowd++;
    if (crowd >= 5) b.atk = { kind: 'ring', what: 'beat', x: b.x, y: b.y, r: 3.2*T, t: 0, at: fast ? 0.8 : 1.0 };
    else if (d < 3.5*T) b.atk = { kind: 'ring', what: 'peck', x: a.x, y: a.y, r: 1.1*T, t: 0, at: fast ? 0.6 : 0.8 };
    else if (!b.pinned){ const k = Math.min(4*T, d - 1.5*T); b.hop = { x0: b.x, y0: b.y, x1: b.x + b.dx*k, y1: b.y + b.dy*k, t: 0 }; b.hopAt = s.t; b.cd = 0.7; }
    return;
  }
  if (d > 3*T && !b.pinned) bossWalk(s, b, a.x, a.y, 10, dt);
}
// Old Warty (build 31). It turns slowly to face what it hunts. Tongue: a thin lane, then the first ant
// in it is swallowed; bite the toad hard within 3 seconds and it spits the ant back out alive. Leap:
// a ring where it will land. Phase 2: two tongues in a row, and it puffs up (bites half) now and then.
function stepToad(s, b, B, dt){
  if (b.dx == null){ b.dx = 1; b.dy = 0; }
  const turn = (tx, ty) => { const want = Math.atan2(ty - b.y, tx - b.x), have = Math.atan2(b.dy, b.dx); let d = want - have; while (d > Math.PI) d -= Math.PI*2; while (d < -Math.PI) d += Math.PI*2; const a = have + Math.max(-1, Math.min(1, d))*Math.min(Math.abs(d), 1.6*dt); b.dx = Math.cos(a); b.dy = Math.sin(a); return Math.abs(d); };
  if (b.puffT > 0) b.puffT -= dt;
  // A swallowed ant: freed if the toad is bitten hard enough in time, else lost.
  if (b.held){ const H = b.held, a = s.ants.find(o => o.id === H.id); H.t -= dt;
    if (!a || a.state === 'dead'){ b.held = null; }
    else if (b.maxHp - b.hp >= H.hp0 + 18 || b.hp <= 0){ a.state = H.state; a.x = b.x + b.dx*B.r*T; a.y = b.y + b.dy*B.r*T; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); shove(s, a, b.x, b.y, 2); b.held = null; b.spitAt = s.t; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'Old Warty gags and spits your ant out alive!'; }
    else if (H.t <= 0){ b.held = null; a.state = H.state; killAnt(s, a, 'toad'); b.gulpAt = s.t; } }
  if (b.mode === 'idle'){ if (!b.gx || b.t > 7){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*4*T; b.gy = b.hy + Math.sin(a)*4*T; } turn(b.gx, b.gy); bossWalk(s, b, b.gx, b.gy, 6, dt); return; }
  const fast = b.phase === 2;
  if (b.leap){ const L = b.leap; L.t += dt; const u = Math.min(1, L.t/0.5); b.x = L.x0 + (L.x1 - L.x0)*u; b.y = L.y0 + (L.y1 - L.y0)*u;
    if (u >= 1){ b.leap = null; b.atkDone = { kind: 'ring', x: b.x, y: b.y, r: 2.6*T, t: s.t }; b.landAt = s.t;
      for (const a of s.ants){ if (!outside(a) || a.team || Math.hypot(a.x - b.x, a.y - b.y) > 2.6*T) continue; hurtAnt(s, a, 5, 'toad'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); }
      b.cd = fast ? 1.4 : 2.2; }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t, len: k.len, dx: k.dx, dy: k.dy };
    if (k.kind === 'lane'){ // the tongue: the first ant along the lane
      b.lashAt = s.t; let best = null, bd = Infinity;
      for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; const al = (a.x - k.x)*k.dx + (a.y - k.y)*k.dy; if (al < bd){ bd = al; best = a; } }
      b.lashLen = best ? bd : k.len;
      if (best){ if (best.isPlayer || b.held) hurtAnt(s, best, 6, 'toad'); else { b.held = { id: best.id, t: 3, state: best.state === 'away' ? 'return' : best.state, hp0: b.maxHp - b.hp }; best.state = 'away'; best.foeId = 0; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'Old Warty swallowed an ant! Bite it hard, now, and it spits it out!'; } }
      if (fast && !k.second){ const tg = bossTarget(s, b, 12); if (tg){ const [a, d] = tg, dx = (a.x - b.x)/d, dy = (a.y - b.y)/d; b.atk = { kind: 'lane', x: b.x, y: b.y, dx, dy, len: Math.min(9*T, d + 2*T), w: 0.9*T, t: 0, at: 0.6, second: true }; return; } }
      b.cd = fast ? 1.6 : 2.4; return; }
    if (k.kind === 'ring'){ b.leap = { x0: b.x, y0: b.y, x1: k.x, y1: k.y, t: 0 }; return; }
    return; }
  b.cd -= dt; b.puffCd = (b.puffCd ?? 8) - dt;
  if (fast && b.puffCd <= 0){ b.puffT = 5; b.puffCd = 12; b.puffAt = s.t; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'Old Warty puffs up: bites do half. Wait it out, or get behind him.'; }
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg; const off = turn(a.x, a.y);
  if (b.cd <= 0){
    if (d > 6*T || (d > 3*T && Math.random() < 0.3)){ const k = Math.min(d, 7*T); b.atk = { kind: 'ring', x: b.x + (a.x - b.x)/d*k, y: b.y + (a.y - b.y)/d*k, r: 2.6*T, t: 0, at: fast ? 0.8 : 1.1 }; return; }
    if (off < 0.5){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(9*T, d + 2*T), w: 0.9*T, t: 0, at: fast ? 0.7 : 0.9 }; return; }
  }
}
// The praying mantis (build 34). Hidden (a shimmer) until an ant comes within 6 tiles. It sways for a
// moment, then snaps a lane in front of it and grabs the first one or two ants there; while it eats (4 s)
// it can't strike and bites on it do double. Hurt it badly or lock it, and it drops its meal alive.
// Phase 2: two strikes in a row, and short fluttering hops after you.
function mantisDrops(s, b, msg){
  const E = b.eat; if (!E) return; b.eat = null;
  for (const id of E.ids){ const a = s.ants.find(o => o.id === id); if (!a || a.state !== 'away') continue; a.state = E.states[id] || 'return'; a.x = b.x + b.dx*1.6*T; a.y = b.y + b.dy*1.6*T; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); shove(s, a, b.x, b.y, 1.5); }
  if (msg && playerNear(s, b.x, b.y, 24)) s.player.msg = msg; b.cd = 1.2;
}
function stepMantis(s, b, B, dt){
  if (b.dx == null){ b.dx = 1; b.dy = 0; }
  const near = nearAnt(s, b, 6*T, (o) => !o.team);
  if (b.mode === 'idle'){ b.hidden = !near; if (!b.gx || b.t > 9){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*3*T; b.gy = b.hy + Math.sin(a)*3*T; } bossWalk(s, b, b.gx, b.gy, 4, dt); return; }
  if (b.hidden){ b.hidden = false; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'The hedge moves: a mantis was there all along!'; }
  const fast = b.phase === 2;
  // Eating: claws busy. Big damage makes it let go.
  if (b.eat){ const E = b.eat; E.t -= dt;
    if (b.maxHp - b.hp >= E.hp0 + 40){ mantisDrops(s, b, 'Bitten hard, the mantis drops its meal!'); return; }
    if (E.t <= 0){ for (const id of E.ids){ const a = s.ants.find(o => o.id === id); if (a && a.state === 'away'){ a.state = E.states[id] || 'return'; killAnt(s, a, 'mantis'); } } b.eat = null; b.cd = fast ? 0.8 : 1.4; }
    return; }
  if (b.hop){ const H = b.hop; H.t += dt; const u = Math.min(1, H.t/0.45); b.x = H.x0 + (H.x1 - H.x0)*u; b.y = H.y0 + (H.y1 - H.y0)*u; if (u >= 1) b.hop = null; return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, t: s.t, x: k.x, y: k.y }; b.strikeAt = s.t;
    const hit = [];
    for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hit.push([((a.x - k.x)*k.dx + (a.y - k.y)*k.dy), a]); }
    hit.sort((p, q) => p[0] - q[0]);
    const grab = hit.slice(0, 2).map(h => h[1]), E = { ids: [], states: {}, t: 4, hp0: b.maxHp - b.hp };
    for (const a of grab){ if (a.isPlayer){ hurtAnt(s, a, 6, 'mantis'); continue; } E.states[a.id] = a.state; a.state = 'away'; a.foeId = 0; E.ids.push(a.id); }
    for (const [, a] of hit.slice(2)) if (outside(a)) hurtAnt(s, a, 2, 'mantis');
    if (E.ids.length){ b.eat = E; if (playerNear(s, b.x, b.y, 24)) s.player.msg = `The mantis snatched ${E.ids.length === 1 ? 'an ant' : 'two ants'}! While it eats, bite it: double damage.`; return; }
    if (fast && !k.second){ const tg = bossTarget(s, b, 8); if (tg){ const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d; b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: 4.8*T, w: 2.2*T, t: 0, at: 0.4, second: true }; return; } }
    b.cd = fast ? 1.1 : 1.8; return; }
  b.cd -= dt;
  const tg = bossTarget(s, b, 14); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (b.cd <= 0 && d < 4.6*T){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: 4.8*T, w: 2.2*T, t: 0, at: fast ? 0.45 : 0.6 }; return; }
  if (fast && d > 6*T && b.cd <= 0){ const k = Math.min(5*T, d - 2.5*T); b.hop = { x0: b.x, y0: b.y, x1: b.x + b.dx*k, y1: b.y + b.dy*k, t: 0 }; b.cd = 0.6; return; }
  if (d > 3.5*T) bossWalk(s, b, a.x, a.y, 9, dt);
}
// The black widow (build 35). Her web (4½ tiles round) holds any ant that walks in for 3 s. Four white
// anchors at its edge: bite through all four and she falls to the floor for 12 s (bites double; up in
// the web, a third). She bites at a red dot, deadly. Phase 2: she drops on a thread to a new spot and
// spins a fresh web there (anchors already cut stay cut).
function spinWeb(s, b, x, y, keep){
  const R = 4.5*T, old = b.web ? b.web.anchors : null;
  // Each anchor sits on open ground an ant can reach: pulled in toward the middle if the edge is blocked.
  b.web = { x, y, r: R, anchors: [0, 1, 2, 3].map(i => { const a = i*Math.PI/2 + 0.4; const cut = keep && old && old[i].hp <= 0; let k = R; while (k > 1.5*T && !walk(s, Math.floor((x + Math.cos(a)*k)/T), Math.floor((y + Math.sin(a)*k)/T))) k -= 0.5*T; return { x: x + Math.cos(a)*k, y: y + Math.sin(a)*k, hp: cut ? 0 : 30, max: 30 }; }) };
}
function stepWidow(s, b, B, dt){
  const P = s.player;
  if (!b.web) spinWeb(s, b, b.hx, b.hy);
  const W2 = b.web;
  // The web holds what walks into it.
  if (!b.grounded) for (const a of s.ants){ if (a.team || !outside(a)) continue;
    if (Math.hypot(a.x - W2.x, a.y - W2.y) < W2.r && !(a.webT > s.t) && !(a.webFree > s.t)){ a.webT = s.t + 3; a.webFree = s.t + 5; if (!a.isPlayer) a.lockT = 3; if (a.isPlayer || !b.warnedWeb){ b.warnedWeb = true; if (playerNear(s, W2.x, W2.y, 24)) P.msg = a.isPlayer ? 'You’re stuck in the widow’s web!' : 'Your ants are stuck in the widow’s web. Cut the anchors!'; } } }
  // The anchors: fighters, your crew and you bite through them.
  if (!b.grounded){ let cutNow = false;
    for (const an of W2.anchors){ if (an.hp <= 0) continue;
      for (const a of s.ants){ if (a.team || !outside(a) || !(CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer)) continue; if (Math.hypot(a.x - an.x, a.y - an.y) < 1.2*T){ an.hp -= bite(s, a)*dt*(a.isPlayer ? 2 : 1); an.hitT = s.t; } }
      if (an.hp <= 0){ an.hp = 0; cutNow = true; s.events.push('attackdone'); } }
    const left = W2.anchors.filter(an => an.hp > 0).length;
    if (cutNow && left && playerNear(s, b.x, b.y, 24)) P.msg = `An anchor snaps! ${left} left.`;
    if (!left){ b.grounded = true; b.groundT = 12; b.atk = null; b.drop = null; b.x = W2.x; b.y = W2.y; b.landAt = s.t; if (playerNear(s, b.x, b.y, 24)) P.msg = 'The web falls, and the widow with it! Swarm her: bites do double!'; s.events.push('bossphase'); } }
  else { b.groundT -= dt; if (b.groundT <= 0){ b.grounded = false; spinWeb(s, b, b.x, b.y); if (playerNear(s, b.x, b.y, 24)) P.msg = 'The widow climbs back up and spins a new web.'; } }
  if (b.mode === 'idle'){ if (!b.grounded){ b.x += (W2.x - b.x)*Math.min(1, dt); b.y += (W2.y - b.y)*Math.min(1, dt); } return; }
  const fast = b.phase === 2;
  if (b.drop){ const D = b.drop; D.t += dt; if (D.t < D.at) return; b.drop = null; b.x = D.x; b.y = D.y; spinWeb(s, b, D.x, D.y, true); b.cd = 1.5; b.landAt = s.t; return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: 'ring', x: k.x, y: k.y, r: k.r, t: s.t }; b.biteAt = s.t;
    if (k.what === 'drop'){ b.drop = { x: k.x, y: k.y, t: 0, at: 0.3 }; return; }
    for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 8, 'widow'); spark(s, null, a.x, a.y, 1); }
    b.cd = fast ? 1.1 : 1.6; return; }
  b.cd -= dt; b.dropCd = (b.dropCd ?? 10) - dt;
  if (fast && !b.grounded && b.dropCd <= 0){ b.dropCd = 13; const a = Math.random()*Math.PI*2, d = 3*T + Math.random()*3*T; let x = b.hx + Math.cos(a)*d, y = b.hy + Math.sin(a)*d; if (!walk(s, Math.floor(x/T), Math.floor(y/T))){ x = b.hx; y = b.hy; } b.atk = { kind: 'ring', what: 'drop', x, y, r: 2*T, t: 0, at: 1.0 }; return; }
  // Prey: a stuck ant first, else the nearest.
  let tg = null, td = Infinity; for (const a of s.ants){ if (a.team || !outside(a) || (a.isPlayer && a.feign > s.t)) continue; const d = Math.hypot(a.x - b.x, a.y - b.y) - (a.webT > s.t ? 2*T : 0); if (d < td){ td = d; tg = a; } }
  if (!tg) return; const d = Math.hypot(tg.x - b.x, tg.y - b.y); b.dx = (tg.x - b.x)/(d || 1); b.dy = (tg.y - b.y)/(d || 1);
  if (b.cd <= 0 && d < 3.5*T){ b.atk = { kind: 'ring', what: 'bite', x: tg.x, y: tg.y, r: 0.9*T, t: 0, at: fast ? 0.55 : 0.7 }; return; }
  // She keeps to her web (on the floor she crawls).
  const gx = b.grounded ? tg.x : W2.x + Math.max(-1, Math.min(1, (tg.x - W2.x)/W2.r))*W2.r*0.7, gy = b.grounded ? tg.y : W2.y + Math.max(-1, Math.min(1, (tg.y - W2.y)/W2.r))*W2.r*0.7;
  if (d > 1.5*T) bossWalk(s, b, gx, gy, b.grounded ? 6 : 14, dt);
}
// The giant centipede (build 36). Six segments of 90 health: each 90 damage cuts the tail segment off
// (it drops as meat) and makes it faster. Coil: a ring round it, then it lashes out (bites on it while
// coiled do double: its joints are open). Rush: a lane, then it races down it biting all it passes.
// Two segments left: frantic. Its body follows the head's path (b.path) for drawing.
const CENT_SEG = 90;
function stepCentipede(s, b, B, dt){
  const P = s.player;
  if (!b.path) b.path = [[b.x, b.y]];
  const last = b.path[b.path.length - 1]; if (Math.hypot(b.x - last[0], b.y - last[1]) > 4){ b.path.push([b.x, b.y]); if (b.path.length > 80) b.path.shift(); }
  const segs = Math.max(0, Math.ceil(b.hp / CENT_SEG)); if (b.segs == null) b.segs = segs;
  if (segs < b.segs && b.hp > 0){ // a segment breaks off: meat where the tail was
    const tail = b.path[Math.max(0, b.path.length - 1 - b.segs*5)] || [b.x, b.y], x = Math.floor(tail[0]/T), y = Math.floor(tail[1]/T);
    if (walk(s, x, y) && !itemAt(s, x, y)) s.items.push({ x, y, kind: 'protein', type: 'boss', amt: 12 });
    b.segs = segs; b.cutAt = s.t; if (playerNear(s, b.x, b.y, 24)) P.msg = `A segment breaks off! ${segs} left, and it’s faster.`; }
  const quick = 1 + (6 - Math.min(6, b.segs))*0.15, fast = b.phase === 2;
  if (b.mode === 'idle'){ if (!b.gx || b.t > 6){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*5*T; b.gy = b.hy + Math.sin(a)*5*T; } bossWalk(s, b, b.gx, b.gy, 10, dt); return; }
  if (b.rush){ const R = b.rush, step = 170*quick*SURF*dt, nx = b.x + R.dx*step, ny = b.y + R.dy*step, cl = clearOf(s), tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    const wall = tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2 || cl[ty*W + tx] < 2;
    if (!wall){ b.x = nx; b.y = ny; R.done += step; b.dx = R.dx; b.dy = R.dy; }
    for (const a of s.ants) if (outside(a) && !a.team && !R.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < 1.5*T){ R.hit[a.id] = 1; hurtAnt(s, a, 5, 'centipede'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x - R.dy*40, b.y + R.dx*40, 1.5); }
    if (wall || R.done >= R.len){ b.rush = null; b.cd = fast ? 0.9 : 1.6; b.atkDone = { kind: 'stop', t: s.t, x: b.x, y: b.y }; }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.kind === 'ring'){ k.x = b.x; k.y = b.y; } if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t };
    if (k.kind === 'ring'){ b.lashAt = s.t; for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 5, 'centipede'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); } b.cd = fast ? 1.0 : 1.8; }
    else if (k.kind === 'lane') b.rush = { dx: k.dx, dy: k.dy, len: k.len, done: 0, hit: {} };
    return; }
  b.cd -= dt;
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (b.cd <= 0){
    let near = 0; for (const o of s.ants) if (outside(o) && !o.team && Math.hypot(o.x - b.x, o.y - b.y) < 3*T) near++;
    if (near >= 3 || d < 2.5*T) b.atk = { kind: 'ring', x: b.x, y: b.y, r: 3.4*T, t: 0, at: fast ? 0.8 : 1.1 };
    else b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(11*T, d + 3*T), w: 1.8*T, t: 0, at: fast ? 0.6 : 0.85 };
    return;
  }
  if (d > 2.2*T) bossWalk(s, b, a.x, a.y, 16*quick, dt);
}
function stepBeetle(s, b, B, dt){
  if (b.dazeT > 0){ b.dazeT -= dt; return; }
  if (b.mode === 'idle'){ if (!b.gx || b.t > 6){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*6*T; b.gy = b.hy + Math.sin(a)*6*T; } bossWalk(s, b, b.gx, b.gy, 8, dt); return; }
  const cl = clearOf(s);
  // Charging: fast down the lane; whatever is in the way is bowled over.
  if (b.charge){ const C = b.charge, step = 150*SURF*dt, nx = b.x + C.dx*step, ny = b.y + C.dy*step, tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    const wall = tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2 || cl[ty*W + tx] < 2;
    if (!wall){ b.x = nx; b.y = ny; C.done += step; }
    for (const a of s.ants) if (outside(a) && !C.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < 1.6*T){ C.hit[a.id] = 1; hurtAnt(s, a, 5, 'beetle'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x - C.dy*50, b.y + C.dx*50, 2); }
    if (wall || C.done >= C.len){
      b.charge = null; b.atkDone = { kind: wall ? 'slam' : 'stop', t: s.t, x: b.x, y: b.y };
      // Enraged, it turns and charges again before it tires.
      if (b.phase === 2 && !C.second && !wall){ const tg = bossTarget(s, b, 14); if (tg){ const [a, d] = tg, dx = (a.x - b.x)/d, dy = (a.y - b.y)/d; b.dx = dx; b.dy = dy; b.atk = { kind: 'lane', x: b.x, y: b.y, dx, dy, len: 11*T, w: 1.8*T, t: 0, at: 0.6, second: true }; return; } }
      b.dazeT = wall ? 4.5 : 2.2; b.cd = 1.5; if (playerNear(s, b.x, b.y, 24)) s.player.msg = wall ? 'It slammed into the rock: it’s dazed! Bite it now!' : 'It’s winded: bite it now!';
    }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.charge = { dx: k.dx, dy: k.dy, len: k.len, done: 0, hit: {}, second: !!k.second }; return; }
  b.cd -= dt; b.snapT = (b.snapT || 0) - dt;
  const tg = bossTarget(s, b, 14); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (d < 1.9*T){ if (b.snapT <= 0){ b.snapT = b.phase === 2 ? 1 : 1.4; b.snapAt = s.t; hurtAnt(s, a, 4, 'beetle'); spark(s, null, a.x, a.y, 1); } }
  if (b.cd <= 0 && d > 2.2*T){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: 11*T, w: 1.8*T, t: 0, at: 1.0 }; return; }
  if (d > 4*T) bossWalk(s, b, a.x, a.y, 14, dt);
}
function stepAntlion(s, b, B, dt){
  const w = s.world, pit = w.pits[b.pit]; if (!pit) return;
  const px = pit.x*T, py = pit.y*T, fast = b.phase === 2;
  if (b.move){ b.move.t += dt; if (b.move.t >= 2){ b.pit = b.move.to; const q = w.pits[b.pit]; b.x = q.x*T; b.y = q.y*T; b.move = null; b.cd = 1; } return; }
  b.x = px; b.y = py;
  if (!b.under){ b.upT -= dt; b.snapT = (b.snapT || 0) - dt;
    const tg = bossTarget(s, b, B.r + 1.2); if (tg && b.snapT <= 0){ b.snapT = 1.2; b.snapAt = s.t; hurtAnt(s, tg[0], 3, 'antlion'); spark(s, null, tg[0].x, tg[0].y, 1); }
    if (b.upT <= 0){ b.under = true; b.cd = 1.2; } return; }
  if (b.mode === 'idle') return;
  // A crew round the pit's edge draws her up.
  let edge = 0; for (const a of s.ants) if (!a.team && outside(a)){ const d = Math.hypot(a.x - px, a.y - py); if (d < (pit.r + 3)*T) edge++; }
  b.lureT = edge >= 8 ? (b.lureT || 0) + dt : 0;
  if (b.lureT > 2){ b.lureT = 0; b.atk = null; b.under = false; b.upT = 5; b.atkDone = { kind: 'surface', t: s.t }; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'She bursts out of the sand! Bite her now!'; return; }
  if (fast){ b.tunnelT = (b.tunnelT || 0) + dt; if (b.tunnelT > 22 && w.pits.length > 1){ b.tunnelT = 0; let to = b.pit; while (to === b.pit) to = Math.floor(Math.random()*w.pits.length); b.move = { from: b.pit, to, t: 0 }; b.atk = null; return; } }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, t: s.t };
    if (k.kind === 'grab'){ const v = s.ants.find(a => a.id === k.id); if (v && outside(v) && inAtk(k, v.x, v.y)){ killAnt(s, v, 'antlion'); b.under = false; b.upT = fast ? 2.6 : 3.6; } b.cd = fast ? 1 : 1.6; }
    else { for (const a of s.ants) if (outside(a) && inAtk(k, a.x, a.y)){ a.slowT = 3; shove(s, a, a.x + (a.x - px), a.y + (a.y - py), 1.5); hurtAnt(s, a, 0.5, 'antlion'); } b.cd = 2; }
    return; }
  b.cd -= dt; if (b.cd > 0) return;
  // The nearest ant to the pit: grabbed if close, showered with sand if not.
  let best = null, bd = 10*T; for (const a of s.ants){ if (!outside(a)) continue; const d = Math.hypot(a.x - px, a.y - py); if (d < bd){ bd = d; best = a; } }
  if (!best) return;
  if (bd < (pit.r*1.7)*T) b.atk = { kind: 'grab', id: best.id, x: best.x, y: best.y, r: 1.2*T, t: 0, at: fast ? 0.8 : 1.05 };
  else b.atk = { kind: 'toss', x: best.x, y: best.y, r: 1.6*T, t: 0, at: 1.3 };
}

// ---------- events (build 19) ----------
// A director, as in RimWorld: every few minutes something happens. Gifts
// (a swarm of winged queens, a picnic) and hardships (a heatwave) any time;
// the lethal ones (a war party, a Cordyceps outbreak) only once the colony
// can take it, never two within three minutes, and more likely after a long
// calm. Each is announced with a banner and ends with a report.
const EVENTS = {
  swarm: { name: 'Swarm day', icon: '🪽', kind: 'gift', dur: 60, line: 'Winged queens from every colony are falling all over the yard: free protein. The birds have noticed too.' },
  picnic: { name: 'A picnic', icon: '🧺', kind: 'gift', dur: 100, line: 'People have sat down for a picnic. Treats are dropping, and so are feet.' },
  heat: { name: 'Heatwave', icon: '☀', kind: 'hard', dur: 120, line: 'The yard bakes. Puddles shrink, dew dries, the colony drinks more, and ants outside slow down.' },
  warparty: { name: 'War party', icon: '⚔', kind: 'lethal', dur: 180, line: 'The pavement ants march on your nest, led by their champion. Kill the champion and the rest lose heart.' },
  cordyceps: { name: 'Outbreak: Cordyceps', icon: '🍄', kind: 'lethal', dur: 600, line: 'A parasitic fungus has taken some of your foragers. Kill the zombies before stalks burst from them. Nurses can cure the newly infected inside.' },
};
const CHAMPS = ['Gravel-Jaw', 'Cinder', 'Old Crack', 'Grit-Tooth', 'Slab'];
function tickDirector(s, dt){
  const D = s.director, P = s.player; if (!s.queen.placed || s.lost) return;
  if (s.event){ tickEvent(s, dt); return; }
  D.calm += dt;
  if (s.t < D.next) return;
  const n = antCount(s), cap = queenCap(s.queen.level, s), strong = n >= Math.max(12, cap*0.3);
  // Build 19.1 (Mark: "events shouldn't happen too often… the more serious
  // ones even less"): lethal ones not before 25 minutes and 20 minutes apart;
  // hardships 12 minutes from the last hard or lethal one.
  const lethalOk = strong && s.t - D.lastLethal > 1200 && s.t > 1500, k = D.calm > 900 ? 2 : 1;
  const opts = [['swarm', 3], ['picnic', 2.5]];
  if (s.t > 900 && s.t - Math.max(D.lastHard || -999, D.lastLethal) > 720) opts.push(['heat', 1.5]);
  const fighters = s.ants.filter(a => !a.team && CASTES[a.caste].fight >= 3).length;
  if (lethalOk && s.rival.queenAlive && (fighters >= 2 || s.t > 1200)) opts.push(['warparty', 2*k]);
  if (lethalOk && s.t > 1800 && n >= 15) opts.push(['cordyceps', (D.had.cordyceps ? 1.5 : 3)*k]);
  let tot = 0; for (const o of opts) tot += o[1];
  let r = Math.random()*tot, key = opts[0][0]; for (const [kk, wt] of opts){ r -= wt; if (r <= 0){ key = kk; break; } }
  startEvent(s, key);
}
function startEvent(s, key){
  const E = EVENTS[key], D = s.director, w = s.world, P = s.player;
  const ev = s.event = { key, t: 0, end: E.dur, lost0: deathTotal(s.colony), data: {} };
  D.had[key] = (D.had[key] || 0) + 1; if (E.kind === 'lethal') D.lastLethal = s.t; if (E.kind === 'hard') D.lastHard = s.t;
  s.banner = { key, t: s.t, icon: E.icon, title: E.name, line: E.line, kind: E.kind }; s.events.push('event');
  P.msg = `${E.icon} ${E.name}! ${E.line}`;
  if (key === 'picnic'){
    const opts = [REGION.picnic, REGION.lawn, REGION.clover].filter(i => i != null && s.active[i]);
    const ai = opts.length ? opts[Math.floor(Math.random()*opts.length)] : REGION.lawn; ev.data.region = ai;
    for (const t of ['cookie', 'jellybean', 'gummy']) spawnInArea(s, ai, 'food', t);
    s.banner.line = `People have sat down for a picnic by ${AREAS[ai].name.replace(/^The /, 'the ')}. Treats are dropping, and so are feet.`; P.msg = `${E.icon} ${E.name}! ${s.banner.line}`;
  }
  if (key === 'warparty'){
    const name = CHAMPS[(D.had.warparty - 1) % CHAMPS.length];
    const champ = mkAnt(s, 'soldier', 'in', w.rx, w.ry, 1); champ.champion = true; champ.name = name; champ.hp = champ.maxHp = 40; exitNest(s, champ, 'raid');
    // A raid's worth of soldiers and two more, behind the champion.
    const size = Math.min(14, 3 + Math.floor(Math.max(0, s.t - 360)/150)) + 1;
    for (let i = 0; i < size; i++){ const a = mkAnt(s, 'soldier', 'in', w.rx, w.ry, 1); exitNest(s, a, 'raid'); }
    ev.data.champ = champ.id; ev.data.name = name;
    s.banner.title = `War party: ${name}`; s.banner.line = `The pavement ants march on your nest, led by their champion ${name}. Kill ${name} and the rest lose heart.`; P.msg = `⚔ ${s.banner.line}`;
    s.raidLive = true; s.raidStart = { team: 1, lost: deathTotal(s.colony), killed: s.rival.deaths.war || 0, stolen: s.colony.stolen, crits: s.colony.crits || 0 };
  }
  if (key === 'cordyceps'){
    // Two foragers out working, far from home, are the first taken.
    const out = s.ants.filter(a => !a.team && !a.isPlayer && outside(a) && !a.follow).sort((a, b) => Math.hypot(b.tx - w.ex, b.ty - w.ey) - Math.hypot(a.tx - w.ex, a.ty - w.ey));
    for (const a of out.slice(0, 2)) a.infect = 0.01;
    if (!out.length){ const inside = s.ants.filter(a => !a.team && !a.isPlayer); if (inside.length) inside[0].infect = 0.01; }
  }
}
function endEvent(s, msg){
  const ev = s.event, D = s.director, E = EVENTS[ev.key];
  const lost = deathTotal(s.colony) - ev.lost0;
  s.report = { kind: 'event', key: ev.key, lost, t: s.t }; s.events.push('eventover');
  s.player.msg = msg || `${E.name} is over.${E.kind === 'lethal' ? ` You lost ${lost} ant${lost === 1 ? '' : 's'}.` : ''}`;
  // The next one 8 to 10 minutes after this one ends.
  s.event = null; D.next = s.t + 480 + Math.random()*120; if (E.kind !== 'gift') D.calm = 0;
}
function tickEvent(s, dt){
  const ev = s.event, w = s.world, c = s.colony; ev.t += dt;
  if (ev.key === 'swarm'){
    // A winged queen drops near ants every couple of seconds; birds come early.
    ev.data.acc = (ev.data.acc || 0) + dt;
    if (ev.t < 40 && ev.data.acc > 3.5){ ev.data.acc = 0; const out = s.ants.filter(a => !a.team && outside(a));
      if (out.length){ const a = out[Math.floor(Math.random()*out.length)];
        for (let tries = 0; tries < 20; tries++){ const x = Math.round(a.tx + (Math.random() - 0.5)*24), y = Math.round(a.ty + (Math.random() - 0.5)*24);
          if (walk(s, x, y) && !s.world.pit[idx(x,y)] && !itemAt(s, x, y)){ s.items.push({ x, y, kind: 'protein', type: 'alate', amt: 6, fell: s.t }); const ai = areaOf(s, x, y); if (AREAS[ai].strike && AREAS[ai].strike.kind === 'bird') s.strikeT[ai] = Math.min(s.strikeT[ai], 6); break; } } } }
    if (ev.t >= ev.end) endEvent(s, 'The swarm is over. Haul in what fell.');
  } else if (ev.key === 'picnic'){
    if (ev.t >= ev.end) endEvent(s, 'The picnic is packed up.');
  } else if (ev.key === 'heat'){
    c.water = Math.max(0, c.water - (has(s, 'heat') ? 0.02 : 0.06)*dt);
    for (const f of s.items) if (f.type === 'puddle') f.amt = Math.max(3, f.amt - 0.15*dt);
    s.dewTimer = 0;
    if (ev.t >= ev.end){ endEvent(s, 'The heat breaks. Thunder rolls in.'); const r = s.rain; if (!r.on) r.t = Math.max(r.t, r.next - 22); }
  } else if (ev.key === 'warparty'){
    const champ = s.ants.find(a => a.id === ev.data.champ && a.state !== 'dead');
    if (!champ){
      // The champion fell: the rest of the war party breaks and runs home.
      for (const a of s.ants) if (a.team && a.state === 'raid'){ a.state = 'return'; a.flee = 3; }
      const killer = Object.entries(ev.data.biters || {}).sort((a, b) => b[1] - a[1])[0];
      const k = killer && s.ants.find(a => a.id === +killer[0]); if (k && !k.team) makeLegend(s, k, 'Champion-killer');
      gainGenes(s, 2, ev.data.name + ' is dead');
      return endEvent(s, `${ev.data.name} is dead! The war party breaks and runs.`);
    }
    if (ev.t >= ev.end || champ.state === 'in') endEvent(s, `${ev.data.name}'s war party is over.`);
  } else if (ev.key === 'cordyceps') tickCordyceps(s, dt);
}
// Cordyceps: an infected ant works on for 15 s (nurses can cure it inside),
// then turns: it leaves its work and climbs to a high place, twitching. At
// 35 s it dies and a fungal stalk grows from it; 12 s later the stalk bursts
// and spores land on every ant close by. Fighters, your crew and you kill
// zombies and stalks. Each outbreak survived makes the colony harder to infect.
const CORD = { turn: 15, die: 35, grow: 12, burst: 3.5 };
function tickCordyceps(s, dt){
  const ev = s.event, c = s.colony, P = s.player, yb = youL(s) >= 3 ? 1.5 : 1;
  const nurses = s.ants.filter(a => !a.team && a.caste === 'nurse' && (a.state === 'in' || a.state === 'build'));
  for (const a of s.ants){
    if (a.infect == null || a.state === 'dead') continue;
    a.infect += dt;
    const inside = a.state === 'in' || a.state === 'build';
    if (a.infect < CORD.turn){
      // Nurses cure it in time, inside; left alone inside, it spreads.
      if (inside && nurses.length && Math.random() < dt*0.12*Math.min(3, nurses.length)){ a.infect = null; ev.data.cured = (ev.data.cured || 0) + 1; for (const n of nurses) gainXp(s, n, 2); if (!ev.data.saidCure){ ev.data.saidCure = true; P.msg = 'Your nurses caught the fungus early and cured an ant.'; } continue; }
      if (inside && Math.random() < dt*0.03*cordResist(s)){ const v = s.ants.find(o => !o.team && o !== a && (o.state === 'in' || o.state === 'build') && o.infect == null && !o.isPlayer && Math.random() < 0.3); if (v) v.infect = 0.01; }
      continue;
    }
    if (!a.zombie){ a.zombie = true; a.zhp = maxHp(s, a) + 2; if (a.isPlayer){ a.zombie = false; a.infect = null; continue; }
      if (inside) exitNest(s, a, 'zombie'); else a.state = 'zombie'; a.follow = false; a.carry = 0; a.goal = null; a.explore = 0;
      if (!ev.data.saidTurn){ ev.data.saidTurn = true; P.msg = 'An infected ant has turned! It’s climbing to spread its spores: kill it.'; } }
    if (a.infect >= CORD.die){
      s.stalks.push({ x: a.x, y: a.y, t: 0, hp: 10, id: s.nextId++ });
      killAnt(s, a, 'cordyceps');
      if (!ev.data.saidStalk && playerNear(s, a.x, a.y, 30)){ ev.data.saidStalk = true; P.msg = 'A fungal stalk is growing from a dead ant! Destroy it before it bursts.'; }
    }
  }
  // Fighters, your crew and you go after zombies and stalks.
  for (const z of s.ants){
    if (!z.zombie || z.state === 'dead') continue;
    for (const a of s.ants){ if (a.team || a.zombie || !outside(a)) continue; const fighter = CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer, d = Math.hypot(a.x - z.x, a.y - z.y);
      if (fighter && d < 1.5*T){ z.zhp -= bite(s, a)*dt*(a.isPlayer ? 2*yb : 1); z.hitT = s.t; spark(s, a, (a.x + z.x)/2, (a.y + z.y)/2, 0); gainXp(s, a, dt);
        if (z.zhp <= 0){ killAnt(s, z, 'culled'); gainXp(s, a, 5); ev.data.culled = (ev.data.culled || 0) + 1; break; } }
      else if (CASTES[a.caste].fight >= 3 && d < 8*T && (a.state === 'patrol' || a.state === 'hunt')){ a.state = 'fight'; a.goal = 'zombie'; a.zid = z.id; } }
  }
  for (const st of s.stalks){
    st.t += dt;
    for (const a of s.ants){ if (a.team || a.zombie || !outside(a)) continue; const fighter = CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer, d = Math.hypot(a.x - st.x, a.y - st.y);
      if (fighter && d < 1.6*T){ st.hp -= bite(s, a)*dt*(a.isPlayer ? 2*yb : 1); st.hitT = s.t; spark(s, a, (a.x + st.x)/2, (a.y + st.y)/2, 0); if (st.hp <= 0){ st.gone = true; gainXp(s, a, 5); ev.data.stalks = (ev.data.stalks || 0) + 1; break; } }
      else if (CASTES[a.caste].fight >= 3 && d < 8*T && (a.state === 'patrol' || a.state === 'hunt')){ a.state = 'fight'; a.goal = 'stalk'; a.zid = st.id; } }
    if (!st.gone && st.t >= CORD.grow){
      // It bursts: spores on every ant close by (fighters resist better; each outbreak survived helps).
      st.gone = true; s.bursts.push({ x: st.x, y: st.y, t: s.t }); s.events.push('spores');
      const resist = Math.max(0.2, 1 - 0.2*(c.immunity || 0))*cordResist(s);
      for (const a of s.ants) if (outside(a) && a.infect == null && !a.isPlayer && Math.hypot(a.x - st.x, a.y - st.y) < CORD.burst*T && Math.random() < (CASTES[a.caste].fight >= 3 ? 0.35 : 0.6)*resist) a.infect = 0.01;
    }
  }
  s.stalks = s.stalks.filter(st => !st.gone);
  if (s.bursts.length) s.bursts = s.bursts.filter(b => s.t - b.t < 2);
  const left = s.ants.filter(a => a.infect != null && a.state !== 'dead').length;
  ev.data.infected = left; ev.data.stalkN = s.stalks.length;
  if (!left && !s.stalks.length && ev.t > 5){
    c.immunity = (c.immunity || 0) + 1; gainGenes(s, 2, 'surviving an outbreak');
    const lost = deathTotal(c) - ev.lost0;
    endEvent(s, `The outbreak is over. The fungus took ${lost} ant${lost === 1 ? '' : 's'}${ev.data.cured ? `, and your nurses cured ${ev.data.cured}` : ''}. The colony is a little more resistant now.`);
  }
}
// A zombie wanders off and climbs to a high place (beside a rock or a stem),
// where it clamps on and twitches.
function stepZombie(s, a, dt){
  if (a.clamp) return;
  if (!a.zgoal){ const cl = clearOf(s); let best = null, bd = 1e9;
    for (let k = 0; k < 40; k++){ const x = a.tx + Math.round((Math.random() - 0.5)*24), y = a.ty + Math.round((Math.random() - 0.5)*24); if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue; if (cl[y*W + x] === 1){ const d = Math.hypot(x - a.tx, y - a.ty); if (d < bd){ bd = d; best = [x, y]; } } }
    a.zgoal = best || [a.tx, a.ty]; }
  if (a.tx === a.zgoal[0] && a.ty === a.zgoal[1] && Math.hypot(a.x - (a.tx + 0.5)*T, a.y - (a.ty + 0.5)*T) < 2){ a.clamp = true; return; }
  if (stepTo(a, a.tx, a.ty, 24, dt)) chooseToward(s, a, (a.zgoal[0] + 0.5)*T, (a.zgoal[1] + 0.5)*T);
}
// ---------- curios (build 20) ----------
// One lost thing in every region: a marble, a button, a coin… Huge to an
// ant, and it glints from afar. Walk your ant up to it and the stash round
// it spills out (what the ground there gives), with a 🧬 Gene, and every
// fifth curio pays three more. Found curios show on the yard map.
const CURIOS = {
  marble: { name: 'a glass marble' }, button: { name: 'a red button' }, coin: { name: 'a copper coin' }, cap: { name: 'a bottle cap' },
  brick: { name: 'a toy brick' }, clip: { name: 'a paper clip' }, bead: { name: 'a glass bead' }, die: { name: 'a lost die' },
};
const CURIO_KINDS = Object.keys(CURIOS);
// What spills out, by the ground it lies on: [kind, type, amount] × n.
function curioStash(ground){
  if (/soil|picnic/.test(ground)) return [['food', 'aphids', 0], ['food', 'tomato', 20], ['food', 'jellybean', 0]];
  if (/bark|compost|leaf|hedge|mulch/.test(ground)) return [['chitin', 'shell', 8], ['chitin', 'shell', 8], ['protein', 'bug', 15]];
  if (/gravel|home/.test(ground)) return [['grit', 'pebble', 10], ['grit', 'pebble', 10], ['grit', 'pebble', 10]];
  if (/slab|deck/.test(ground)) return [['food', 'crumb', 10], ['food', 'popcorn', 14], ['food', 'cookie', 0]];
  if (/sand/.test(ground)) return [['food', 'gummy', 0], ['food', 'popcorn', 14]];
  if (/mud|wet/.test(ground)) return [['water', 'dew', 8], ['water', 'dew', 8], ['food', 'seed', 20]];
  return [['food', 'seed', 20], ['food', 'seed', 20], ['food', 'berry', 12]];
}
function placeCurios(s){
  const w = s.world, out = [], cl = clearOf(s);
  for (let i = 0; i < AREAS.length; i++){
    const rnd = mulberry32((s.seed || 7)*7919 + i*104729), b = areaBounds(i);
    for (let tries = 0; tries < 80; tries++){
      const x = b.x0 + 8 + Math.floor(rnd()*(AREA - 16)), y = b.y0 + 8 + Math.floor(rnd()*(AREA - 16));
      if (w.blocked[idx(x,y)] || w.pit[idx(x,y)] || (tries < 60 && cl[idx(x,y)] < 3) || Math.hypot(x - w.ex, y - w.ey) < 18 || Math.hypot(x - w.rx, y - w.ry) < 10) continue;
      out.push({ i, x, y, kind: CURIO_KINDS[Math.floor(rnd()*CURIO_KINDS.length)], yaw: rnd()*Math.PI*2 }); break;
    }
  }
  return out;
}
function tickCurios(s, pa){
  const c = s.colony, found = c.curios || (c.curios = {});
  for (const q of s.curios){
    if (found[q.i] || Math.hypot(pa.x/T - (q.x + 0.5), pa.y/T - (q.y + 0.5)) > 2.6) continue;
    found[q.i] = q.kind; const n = Object.keys(found).length, C = CURIOS[q.kind];
    // The stash round it.
    const st = curioStash(AREAS[q.i].ground || ''); let k = 0;
    for (const [kind, type, amt] of st){
      for (let tries = 0; tries < 12; tries++){ const a = k*2.1 + tries*0.7, r = 2 + (tries % 3), x = Math.round(q.x + Math.cos(a)*r), y = Math.round(q.y + Math.sin(a)*r);
        if (!walk(s, x, y) || s.world.pit[idx(x,y)] || itemAt(s, x, y)) continue;
        const F = FOODS[type]; s.items.push({ x, y, kind, type, amt: amt || (F ? F.amt[0] : 10) }); break; }
      k++;
    }
    gainGenes(s, 1, 'finding ' + C.name);
    if (n % 5 === 0) gainGenes(s, 3, n + ' curios found');
    s.curioFound = { i: q.i, kind: q.kind, t: s.t, n }; s.events.push('curio');
    s.player.msg = `You found ${C.name}! Something was stashed round it. (${n} of ${s.curios.length} curios${n % 5 === 0 ? ': +3 🧬 for every fifth' : ''})`;
  }
}
function recruit(s, n){
  const a = s.player.ant; if (!a || s.player.inNest) return 0; const w = s.world; let got = 0;
  const nearHome = Math.hypot(a.tx - w.ex, a.ty - w.ey) < 3.5;
  const cands = s.ants.filter(o => !o.isPlayer && !o.team && o.state !== 'dead' && !o.follow && (
    ((o.state==='explore' || o.state==='patrol' || (o.state==='return' && !o.carry)) && Math.hypot(o.x-a.x, o.y-a.y) < (picked(s, 'you', 'rally') ? 10 : 7)*(has(s, 'rally') ? 1.5 : 1)*T) || (nearHome && o.state === 'in' && o.goal !== 'job')));
  // Fighters answer first, so a recruited crew near the nest can be an army.
  cands.sort((p,q) => CASTES[q.caste].fight - CASTES[p.caste].fight || (p.state==='in'?1:0) - (q.state==='in'?1:0) || Math.hypot(p.x-a.x,p.y-a.y) - Math.hypot(q.x-a.x,q.y-a.y));
  for (const o of cands){ if (got >= n) break; if (o.state === 'in'){ o.x = (w.ex+0.5)*T; o.y = (w.ey+0.5)*T; o.tx = w.ex; o.ty = w.ey; } o.follow = true; o.state = 'follow'; o.goal = null; got++; }
  return got;
}
function release(s){ let n = 0; for (const o of s.ants){ if (o.follow){ o.follow = false; o.state = 'explore'; o.explore = 0; o.rest = 0; n++; } } return n; }
function queueEgg(s, caste){
  const c = s.colony, C = CASTES[caste]; if (!C || !s.queen.placed) return false;
  if (caste === 'soldier' && roomSlotIndex(s,'barracks') < 0) return false;
  if (caste === 'nurse' && roomSlotIndex(s,'nursery') < 0) return false;
  if (caste === 'venom' && !c.trophies.spider) return false;
  if (eggLock(s, caste)) return false; // build 40: the same rules the menu shows
  if (c.eggQueue.length >= 10) return false;
  if (!payCost(c, eggCost(s, caste))) return false; c.eggQueue.push(caste); return true;
}
function eggLock(s, caste){ const c = s.colony; if (CASTE_EVO[caste] && !has(s, CASTE_EVO[caste])) return 'evolve ' + EVO_BY[CASTE_EVO[caste]].name + ' first'; if (CASTE_ROOM[caste] && !roomOf(s, CASTE_ROOM[caste]) && !ROOMS[CASTE_ROOM[caste]].evo) return 'needs a ' + ROOMS[CASTE_ROOM[caste]].name; if (CASTE_ROOM[caste] && !roomOf(s, CASTE_ROOM[caste])) return 'needs ' + (has(s, ROOMS[CASTE_ROOM[caste]].evo) ? 'a ' : 'to evolve and build a ') + ROOMS[CASTE_ROOM[caste]].name; if (caste==='soldier' && roomSlotIndex(s,'barracks')<0) return 'needs Barracks'; if (caste==='nurse' && roomSlotIndex(s,'nursery')<0) return 'needs Nursery'; if (caste==='venom' && !c.trophies.spider) return 'needs spider fang'; return ''; }
// Why another of this room can't be placed now, or ''.
function roomLock(s, room){
  const n = roomCount(s, room), q = s.colony.buildQueue.filter(j => j.room === room).length;
  if (q) return 'being built';
  if (room === 'armory'){ if (!s.colony.trophies.shell) return 'needs the ground beetle’s shell'; if (n) return 'built'; }
  if (ROOMS[room].evo && !has(s, ROOMS[room].evo)) return 'evolve ' + EVO_BY[ROOMS[room].evo].name + ' first';
  if (n >= roomCap(s)) return n ? `${n} of ${roomCap(s)}: upgrade the queen for another` : 'upgrade the queen';
  return '';
}
// Room levels (build 23): why this room kind can't go up a level now, or ''.
function pickLineage(s, k){ const c = s.colony; if (!has(s, 'lineage') || c.lineage || !['acid', 'trapjaw', 'bullet'].includes(k)) return false; c.lineage = k; s.player.msg = 'Your line is ' + { acid: 'Acid', trapjaw: 'Trap-jaw', bullet: 'Bullet' }[k] + ', for good.'; return true; }
function roomUpLock(s, key){ const R = ROOMS[key], n = roomLevel(s, key); if (!R.lv) return 'no levels'; if (!roomCount(s, key)) return 'build one first'; if (n > R.lv.length) return 'top level'; return ''; }
function upgradeRoom(s, key){ if (roomUpLock(s, key)) return false; const c = s.colony, n = roomLevel(s, key); if (!payCost(c, ROOMS[key].lv[n - 1].cost)) return false; if (!c.roomLv) c.roomLv = {}; c.roomLv[key] = n + 1; roomsChanged(s); s.player.msg = `${ROOMS[key].name} is now level ${['', 'I', 'II', 'III'][n + 1]}: ${ROOMS[key].lv[n - 1].fx.replace(/^./, ch => ch.toLowerCase())}.`; s.events.push('roomdone'); return true; }
// Build 40: cancel every room still waiting to be built. Not started, all its cost back; started, half.
function cancelBuilds(s){
  const c = s.colony; let n = 0;
  for (const j of c.buildQueue){ const cost = j.paid || roomCost(s, j.room, roomCount(s, j.room)), k2 = j.progress > 0 ? 0.5 : 1; for (const k in cost){ const back = Math.floor(cost[k]*k2); if (k === 'food') c.store = Math.min(c.cap, c.store + back); else c[k] = (c[k] || 0) + back; } n++; }
  c.buildQueue.length = 0; c.water = Math.min(c.water, c.waterCap); return n; // (build 47: refunds never past the caps)
}
function queueRoom(s, room, cell){
  const c = s.colony, R = ROOMS[room]; if (!R || !s.queen.placed || !cell) return false;
  if (roomLock(s, room)) return false;
  const rect = findRoomRect(s, cell[0], cell[1], R.w, R.h); if (!rect) return false;
  if (!payCost(c, roomCost(s, room))) return false;
  c.buildQueue.push({ room, x0: rect.x0, y0: rect.y0, w: R.w, h: R.h, progress: 0, x: rect.x0+1, y: rect.y0+1, paid: roomCost(s, room, roomCount(s, room)) });
  s.nest.fillOrders = s.nest.fillOrders.filter(o => !(o.x >= rect.x0 && o.x < rect.x0 + R.w && o.y >= rect.y0 && o.y < rect.y0 + R.h)); // build 40: a room's ground isn't filled in
  return true;
}
// The old "Train foragers": the Forager's next level, taking the first pick if it has one.
function upgradeForage(s){ const U = UPGRADES.forager[s.colony.forage || 0]; return !!U && upgradeCaste(s, 'forager', U.picks ? U.picks[0][0] : undefined); }
function upgradeQueen(s){ const q = s.queen, c = s.colony; const cost = QUEEN_UP[q.level]; if (!cost || !payCost(c, cost)) return false; q.level++; return true; }
function antCount(s){ return s.ants.filter(a => !a.team && !a.dh).length; } // (build 46: the main nest's; a daughter counts her own)
function roomStateAt(s, x, y){ const r = roomAt(s, x, y); if (r) return { kind:'room', room: r }; const j = s.colony.buildQueue.find(j => x >= j.x0 && x < j.x0+j.w && y >= j.y0 && y < j.y0+j.h); if (j) return { kind:'job', job: j }; return { kind:'none' }; }
function stress(s, n){ for (let i=0;i<n;i++){ const a = mkAnt(s, 'forager', 'in', s.world.ex, s.world.ey, 0); exitNest(s, a, 'explore'); } }
function stats(s){
  const c = s.colony; let inside = 0, out = 0, rival = 0; const byCaste = {};
  for (const a of s.ants){ if (a.isPlayer) continue; if (a.team){ rival++; continue; } byCaste[a.caste] = (byCaste[a.caste]||0)+1; if (a.state==='in'||a.state==='build') inside++; else out++; }
  return { inside, out, rival, byCaste, income: c.delivered.reduce((x,y)=>x+y,0), upkeep: c.eaten.reduce((x,y)=>x+y,0), followers: s.ants.filter(a=>a.follow).length };
}
// ---------- save / load ----------
function serialize(s){
  return JSON.stringify({ v: SAVE_VERSION, active: s.active, raidStart: s.raidStart || null, seed: s.seed, t: s.t, lost: s.lost, mower: s.mower, areaT: s.areaT, strikeT: s.strikeT, colony: s.colony, rival: s.rival, rivals: s.rivals.slice(1), items: s.items, spider: s.spider, spiderRespawn: s.spiderRespawn, spiderAway: s.spiderAway, cat: s.cat, catRespawn: s.catRespawn, critters: s.critters, bugGone: s.bugGone, bosses: s.bosses, director: s.director, event: s.event, goo: s.goo, stalks: s.stalks,
    nest: { cells: Array.from(s.nest.cells), rooms: s.nest.rooms, digOrders: s.nest.digOrders, fillOrders: s.nest.fillOrders, spoil: s.nest.spoil, open: s.nest.open || {}, breach: s.nest.breach || null }, spoilPile: s.spoilPile, raidLive: !!s.raidLive, patioDeadAt: s.patioDeadAt, outposts: s.outposts, queen: s.queen, phase: s.phase, won: s.won, dew: s.dew, dewTimer: s.dewTimer, rain: s.rain, repairs: s.repairs, seen: s.seen,
    ants: s.ants.map(a => ({ infect:a.infect, zombie:a.zombie, zhp:a.zhp, clamp:a.clamp, zgoal:a.zgoal, champion:a.champion, id:a.id, caste:a.caste, state:a.state, team:a.team, tx:a.tx, ty:a.ty, x:a.x, y:a.y, carry:a.carry, kind:a.kind, itype:a.itype, hp:a.hp, thr:a.thr, isPlayer:a.isPlayer, follow:a.follow, nx:a.nx, ny:a.ny, ntx:a.ntx, nty:a.nty, goal:a.goal, dh:a.dh || null, exitTo:a.exitTo || null, duty:a.duty || null, xp:a.xp, name:a.name, title:a.title, legend:a.legend, dodged:a.dodged, loads:a.loads, loot:a.loot, lootKind:a.lootKind, survived:a.survived, frenzy:a.frenzy, frenzyAtk:a.frenzyAtk, feign:a.feign, stunned:a.stunned, exposed:a.exposed, raidT:a.raidT, webbed:a.webbed, webT:a.webT, webFree:a.webFree, holdX:a.holdX, holdY:a.holdY, holdCX:a.holdCX, holdCY:a.holdCY, recall:a.recall })),
    phase1: s.phase1 || null, cds: s.player.cds || null, dayT: s.dayT, nights: s.nights || 0, daughters: s.daughters || [], flightSaid: !!s.flightSaid,
    player: { hunger: s.player.hunger, mark: s.player.mark, pending: s.player.pending, msg: s.player.msg, inNest: s.player.inNest, rebirth: s.player.rebirth || null }, nextId: s.nextId,
    seenMap: Array.from(s.seenMap).join(''),
    trail: [...s.hot].filter(i => s.trail[i] > 0.04).flatMap(i => [i, Math.round(s.trail[i]*100)/100]) });
}
// Build 40: save versions. 11 was written by builds 12-39, 12 from build 40. Older ones step up through
// migrate(); a save from a newer build than this one is refused (rather than half-read).
const SAVE_VERSION = 14;
function migrate(d){
  if (!d || typeof d !== 'object') throw new Error('not a save');
  if (d.v > SAVE_VERSION) throw new Error('save from a newer version of the game');
  if (d.v < 10) throw new Error('save from before the whole yard (build 10)');
  if (d.v <= 11){ d.v = 12; /* build 40 added raidStart, player cooldowns and timed ant effects: all default to empty */ }
  if (d.v <= 12){ d.v = 13; // build 42: the nest is 48 wide and 64 deep, the old one its open middle (12 cells in)
    const X = NEST_SHIFT, OW = 24, OH = 48, old = d.nest.cells, cells = new Array(NW*NH).fill(0);
    for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) cells[y*NW + x + X] = old[y*OW + x] || 0;
    d.nest.cells = cells; d.nest.open = {}; d.nest.breach = null;
    const mx = o => { if (o && typeof o.x === 'number') o.x += X; if (o && typeof o.ax === 'number') o.ax += X; if (o && typeof o.x0 === 'number') o.x0 += X; };
    for (const r of d.nest.rooms || []) mx(r); for (const o of d.nest.digOrders || []) mx(o); for (const o of d.nest.fillOrders || []) mx(o);
    for (const o of d.repairs || []) mx(o); for (const j of (d.colony && d.colony.buildQueue) || []) mx(j);
    if (d.queen){ if (typeof d.queen.x === 'number') d.queen.x += X; if (d.queen.room) mx(d.queen.room); }
    for (const a of d.ants || []) if (!a.team){ if (typeof a.nx === 'number') a.nx += X; if (typeof a.ntx === 'number') a.ntx += X; }
  }
  if (d.v <= 13){ d.v = 14; d.daughters = d.daughters || []; /* build 46: daughter colonies */ }
  return d;
}
function deserialize(json){
  const d = migrate(JSON.parse(json)); const s = create(d.seed);
  // Saves from before build 12 have no growth fields: start them at zero.
  const fill = c => { const g = growthState(); for (const k in g) if (!(k in c)) c[k] = g[k]; return c; };
  s.t = d.t; s.phase1 = d.phase1 || null; s.dayT = d.dayT ?? (d.t + DAY*0.02); s.nights = d.nights || 0; s.daughters = d.daughters || []; s.flightSaid = !!d.flightSaid; s.nightNow = isNight(s); s.raidStart = d.raidStart || null; if (d.cds) s.player.cds = d.cds; s.colony = fill(d.colony); s.rival = fill(d.rival); s.rival.key = 'pavement'; s.rivals = [s.rival, ...RIVALS.slice(1).map((R, i) => (d.rivals && d.rivals[i]) ? fill(d.rivals[i]) : sleepingRival(s.world, i + 2))]; s.raidLive = !!d.raidLive; s.patioDeadAt = d.patioDeadAt ?? (d.rival && d.rival.queenAlive === false ? d.t : undefined); s.items = d.items; s.spider = d.spider; s.spiderRespawn = d.spiderRespawn; s.spiderAway = d.spiderAway || null; s.cat = d.cat; s.catRespawn = d.catRespawn; s.critters = d.critters || s.critters; s.bugGone = d.bugGone || {}; s.bosses = d.bosses || {}; if (d.director) s.director = d.director; s.event = d.event || null; s.goo = d.goo || []; s.stalks = d.stalks || []; s.nextId = d.nextId;
  s.nest.cells.set(d.nest.cells); s.nest.rooms = d.nest.rooms || []; s.nest.digOrders = d.nest.digOrders || []; s.nest.fillOrders = d.nest.fillOrders || []; s.nest.spoil = d.nest.spoil || 0; s.nest.open = d.nest.open || {}; s.nest.breach = d.nest.breach || null; s.spoilPile = d.spoilPile || 0; s.nest.ver++; s.queen = d.queen; s.phase = d.phase; s.won = d.won; s.dew = d.dew; s.dewTimer = d.dewTimer; s.rain = d.rain || s.rain; s.repairs = d.repairs || []; s.seen = d.seen && typeof d.seen === 'object' ? d.seen : {};
  s.ants = d.ants.map(a => Object.assign({ dx:0, dy:-1, rest:0, explore:0, flee:0, exitTo:null }, a));
  // A raid in progress isn't saved: its raiders walk home with what they carried (build 28). Ants held by a
  // creature (a toad's mouth, a mantis's claws, a wasp's legs) stay held (build 40).
  { const held = new Set(); for (const k in s.bosses || {}){ const b = s.bosses[k]; if (b.dead) continue; if (b.held && b.held.id) held.add(b.held.id); if (b.eat) for (const id of b.eat.ids || []) held.add(id); } for (const b of s.critters || []){ if (b.carry) held.add(b.carry); }
    for (const a of s.ants) if (a.state === 'away' && !held.has(a.id)){ a.state = 'return'; a.follow = false; a.carry = a.loot || 0; a.kind = a.lootKind === 'brood' ? 'brood' : 'food'; a.loot = 0; } }
  s.player.ant = s.ants.find(a => a.isPlayer) || null; Object.assign(s.player, d.player);
  s.lost = !!d.lost; if (d.mower) s.mower = d.mower; if (d.areaT) s.areaT = d.areaT; if (d.strikeT) s.strikeT = d.strikeT; s.player.big = s.player.ant && s.items.find(f => f.carried) || null;
  if (d.active) s.active = d.active;
  s.outposts = d.outposts || []; outpostsChanged(s);
  // The fog-of-war map (saves before 11.1 wrote it over 'seen' by mistake).
  const sm = d.seenMap || (typeof d.seen === 'string' ? d.seen : null);
  if (sm && sm.length === s.seenMap.length) for (let i=0;i<sm.length;i++) s.seenMap[i] = sm.charCodeAt(i) === 49 ? 1 : 0;
  if (d.trail) for (let k=0;k<d.trail.length;k+=2){ s.trail[d.trail[k]] = d.trail[k+1]; s.hot.add(d.trail[k]); }
  return s;
}
return { DAUGHTERS, FLIGHT_AT, DAUGHTER_CAP, flightsAllowed, flightReady, daughterLock, foundDaughter, daughterCount, dpop, _fast: { nearestItem, itemAt, wanted }, GLOW_ROCKS, huntTarget, DAY, dayPhase, daylight, isNight, untilTurn, genesFound, advise, NEST_SECTIONS, SECTION_BY, NEST_FINDS, BEDROCK_PRIZES, sectionAt, cellLocked, sectionLock, startBreach, openSection, HOME_X0, HOME_X1, HOME_Y1, BEDROCK_Y, NEST_SHIFT, BAND_TEXT, BAND_GOOD, roomTier, inBand, NEST_CAP, cancelBuilds, ZONES, ZONE_OF, zonesTaken, ROT_ZONE, SIDE_ZONE, HEDGE_ZONE, abil, abilityLevel, ABILITY_II, bite, ABILITIES, ABILITY_KEYS, abilityLock, useAbility, WET_ZONE, bossArmour, LAWN_ZONE, crewHold, crewFollow, heldCount, HOLD_R, raidTarget, raidScout, raidLock, startRaid, pullOut, RAID, duelStats, swing, duelGangs, DUEL_ROUND, enemyAt, crewAttack, attackTarget, crewSize, RIVALS, rspec, rivalHome, hatchCapOf, crewCap, forageRange, dutyNeed, CASTE_EVO, pickLineage, cordResist, killAnt, carryCap, storeCapOf: storeCap, CASTE_ROOM, roomLevel, roomUpLock, upgradeRoom, woodGoal, fungusCap, CURIOS, BOSSES, TROPHY, EVENTS, startEvent, ensureBoss, DUTIES, JOBS0, jobsOf, setJobFirst, toggleJob, dutyCounts, roomCount, roomCap, roomUpkeep, roomLock, BUGS, W, H, T, NW, NH, SHAFT, AREAS, AREA, SCALE, SURF, REGION, FOOT, BIRD, DROP, HUNT, SEE, areaBounds, CASTES, ROOMS, FOODS, areaOf, findPath, crewAt, ROOM_KEYS, SOIL, SOIL_ROWS, SOIL_TOP, soilTier, QUEEN_UP, queenCap, create, tick, playerDig, buildersInside, actionLabel, doAction, recruit, release, queueEgg, eggLock, queueRoom, roomStateAt, roomAt, roomOf, findRoomRect, freePocket, toggleDigOrder, toggleFillOrder, removeRoom, digAllowed, upgradeQueen, upgradeForage, FORAGE, SPOIL_MAX, antCount, dugCount, queenDig, buildNest, stress, stats, serialize, deserialize, itemAt, nidx, canPay, costText,
  upgradeCaste, upgradeLock, casteLevel: lvl, youHp, picked, buyEvo, evoLock, has, crewCap, possess, setDoctrine, doctrineOf, pickQueenTrait, eggCost, roomCost, maxHp, storeCap,
  placeOutpost, outpostLock, outpostCap, waterCapOf };
})();
export default SIM;
export { SIM };
