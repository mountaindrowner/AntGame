// The simulation's fixed tables: map and nest sizes, soil, nest sections, castes, rival colonies, rooms,
// foods, forage levels, queen levels. Pure data and small pure helpers only: this module imports no other
// sim module, so anything may read it while the modules load.
import { QUEEN_LEVELS } from './growth.js';
import { AREA, BLOCK } from './yard.js';

export const W = AREA*BLOCK.cols, H = AREA*BLOCK.rows, T = 16; // surface tiles: the built yard (yard.js)
// Everything on the surface is twice as big as it was (yard.js SCALE), so
// ants and creatures walk faster to keep trips from dragging.
export const SURF = 1.15; // surface speed: everything outdoors (ants, you, the spider) moves at this pace (build 11.6: was 1.4; build 22.1 tried 1.0 and 1.08, and colonies starved)
// Nest cutaway cells. The soil comes in bands, top down: a deep layer of
// soft topsoil, then packed soil and clay, equally deep.
// Build 42: two more below, deep rock and bedrock, and the nest twice as wide. The colony starts in the
// middle (HOME_X0..HOME_X1, the old 24 columns); the ground either side and the deep band below open in
// sections you pay for (NEST_SECTIONS), each a break-in event with something hidden behind the wall.
export const SOIL_ROWS = [20, 14, 14, 12, 4];
export const SOIL_TOP = SOIL_ROWS.map((_, i) => SOIL_ROWS.slice(0, i).reduce((a, b) => a + b, 0));
export const NW = 48, NH = SOIL_ROWS.reduce((a, b) => a + b), SHAFT = 24, NEST_SHIFT = 12; // NEST_SHIFT: how far a pre-42 save's nest moves right
export const HOME_X0 = 12, HOME_X1 = 35, HOME_Y1 = SOIL_TOP[3] - 1; // the open middle: columns 12..35, rows down to the clay's bottom
export const BEDROCK_Y = SOIL_TOP[4];
// Price: food and stone, more the further out and down. Curios are a requirement (found, not spent);
// the deep band costs genes too.
export const NEST_SECTIONS = [
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
export const SECTION_BY = Object.fromEntries(NEST_SECTIONS.map(S => [S.key, S]));
// What is hidden behind each wall, and three prizes in the bedrock (found by digging their cell).
export const NEST_FINDS = {
  mole:   { name: 'an old mole tunnel', fx: 'a run of tunnel, already dug' },
  seeds:  { name: 'a seed cache', fx: '+60 🌾' },
  grub:   { name: 'a beetle grub', fx: '+30 🥩 +10 🪲' },
  grub2:  { name: 'a fat beetle grub', fx: '+60 🥩 +20 🪲' },
  aphids: { name: 'a root aphid pocket', fx: '+1 🍯 a minute, for good' },
  seep:   { name: 'a water seep', fx: '+1 💧 every 20 s, for good' },
  curio:  { name: 'a buried trinket', fx: '+2 🧬' },
};
export const BEDROCK_PRIZES = [
  { key: 'fossil', x: 8, y: 62, name: 'a fossil ant', fx: '+5 🧬, and every ant 10% tougher' },
  { key: 'spring', x: 24, y: 63, name: 'an underground spring', fx: '+3 💧 every 20 s, for good' },
  { key: 'ring', x: 40, y: 62, name: 'a lost gold ring', fx: '+4 🧬' },
];
export const N8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
export const N4 = [[1,0],[-1,0],[0,1],[0,-1]];
export const CASTES = {
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
// start; the others sleep until they arrive (afterPatio, below: one every 30
// minutes once the Pavement ants are beaten), then grow, forage and fight.
// Only the Pavement and Argentine ants raid you. A raid on a colony's door
// (RAID.door fighters there, none of theirs) breaks in to its queen.
export const RIVALS = [
  { key: 'pavement', name: 'Pavement ants', region: 'patio', start: [6, 1], max: 60, soldiers: 0.5, hp: 1, bite: 1, size: 1, qhp: 1000, raids: true, color: '#a8463a', soldier: '#7a1f15', blurb: 'A rival. Their nest is in the Patio cracks.' },
  { key: 'odorous', name: 'Odorous house ants', region: 'trash', arrive: (s) => afterPatio(s, 1), arrival: 'They’ve moved in under the trash cans: tiny, many, after your food.', start: [24, 0], max: 110, soldiers: 0.05, hp: 0.5, bite: 0.45, size: 0.8, qhp: 600, swarm: true, color: '#3e2c24', soldier: '#2e1e18', blurb: 'Tiny, swarming and spoiling for a fight: they pick on any ant they meet. They smell of rotten coconut when crushed.' },
  { key: 'argentine', name: 'Argentine ants', region: 'tomatoes', arrive: (s) => afterPatio(s, 2), arrival: 'An invading supercolony has taken the tomato rows. They raid.', start: [10, 3], max: 80, soldiers: 0.35, hp: 0.7, bite: 0.8, size: 0.85, qhp: 800, raids: true, raidFrom: 900, color: '#9a6a44', soldier: '#7a4c2e', blurb: 'An invading supercolony from the vegetable garden. They raid anything, you included.' },
  { key: 'carpenter', name: 'Carpenter ants', region: 'oak', arrive: (s) => afterPatio(s, 3), arrival: 'Huge black ants are chewing into the Oak. They guard their trunk.', start: [4, 3], max: 24, soldiers: 0.5, hp: 2.5, bite: 1.8, size: 1.5, qhp: 1500, color: '#161212', soldier: '#0c0a0a', blurb: 'Huge and black. They chew galleries in the Oak and guard their trunk.' },
  { key: 'fire', name: 'Fire ants', region: 'firemound', arrive: (s) => afterPatio(s, 4), arrival: 'The fire ant mound is boiling over. Their sting burns.', start: [8, 4], max: 50, soldiers: 0.4, hp: 1, bite: 1.8, size: 1, qhp: 1200, fierce: true, color: '#c4441e', soldier: '#a02c14', blurb: 'Red, fierce, and their sting burns. The whole mound boils out at intruders.' },
];
// Mark: "new ants every 30 min after the patio is dead": none come while the
// Pavement ants hold the Patio; then one colony every 30 minutes, the easiest first.
const afterPatio = (s, n) => s.patioDeadAt != null && s.t >= s.patioDeadAt + 1800*n;
export const rspec = (a) => RIVALS[(a.team || 1) - 1] || RIVALS[0];
// Kinds the evolution tree unlocks (build 24); fighters among them also need a Barracks.
export const CASTE_EVO = { major: 'majors', supermajor: 'polymorphism', exploder: 'exploders', replete: 'honeypot', undertaker: 'midden' };
// The room each new kind of ant needs before the queen can lay it.
export const CASTE_ROOM = { venom: 'barracks', gardener: 'fungus', rancher: 'dairy', medic: 'infirmary', harvester: 'granary', major: 'barracks', supermajor: 'barracks', exploder: 'barracks', replete: 'honeypot', undertaker: 'midden' };
export const ROOMS = {
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
  // Build 48: meat at home. The queen lays trophic eggs, food eggs no ant will hatch from, and the colony eats
  // them: grain made into meat (real ants do this). It runs only with food to spare, and stops at a full larder.
  larder:   {name:'Egg larder', cost:{food:40, water:15}, work:30, w:4, h:3, evo:'trophic', desc:'The queen lays food eggs: 🌾 food becomes 🥩 meat, 2 a minute', more:'Another larder: half again more',
    lv:[{cost:{food:80, sugar:20}, fx:'3 🥩 a minute, and less food for each'}, {cost:{food:150, sugar:40, wood:15}, fx:'4 🥩 a minute, for less food again'}]},
  midden:   {name:'Midden', cost:{food:20, grit:15}, work:20, w:4, h:3, evo:'midden', caste:'undertaker', desc:'Undertakers carry the dead to the midden (each death near the nest gives back 2 food), and Cordyceps spreads less, more so with each undertaker', more:'Room for 3 more undertakers',
    lv:[{cost:{food:40, grit:25}, fx:'The waste composts: it feeds the fungus garden'}, {cost:{food:80, protein:10, wood:10}, fx:'Cordyceps hardly spreads at all, and cave-ins are a third rarer'}]},
};
// Build 17: more than one of a room. Each kind allows one per queen level;
// each copy costs half again more than the last, and every room eats food
// to run: half a unit a minute for the first of a kind, one for each extra.
export const roomCount = (s, key) => s.nest.rooms.filter(r => r.key === key).length;
export const roomCap = s => Math.min(5, s.queen.level + 1); // build 40: 5 at most (more than that can't fit the nest)
export function roomUpkeep(s){ let u = 0; const seen = {}; for (const r of s.nest.rooms){ if (r.key === 'queen') continue; u += seen[r.key] ? 1 : 0.5; seen[r.key] = true; } return u; }
export const ROOM_KEYS = ['hatchery','store','cistern','nursery','barracks','workshop','armory','fungus','dairy','infirmary','granary','honeypot','midden','larder'];
// A room kind's level (1 to 3, build 23).
export const roomLevel = (s, key) => (s.colony.roomLv || {})[key] || 1;
// Food on the ground: amt is how much it holds (an ant carries 5). Treats are
// rare drops from people: worth a crew and a trail.
export const FOODS = {
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
  // Build 55: Nevermore's lure. Shiny, worth nothing to eat.
  cap:      {name:'bottle cap', amt:[1,1], treat:true, crew:4, shiny:true},
  slug:     {name:'slug', amt:[20,26], protein:true},
  // Build 18: a beetle's cast-off shell, all chitin.
  shell:    {name:'beetle shell', amt:[8,8], chitin:true},
};
// Build 18: 🪲 chitin per load of each kind of carcass hauled home, and
// 🍯 sugar from honeydew (aphids) and sweet treats.
export const CHITIN_OF = { bug: 1, spider: 2, ladybug: 2, earwig: 2, cricket: 1, millipede: 2, alate: 1, boss: 1, slug: 0 };
export const SHELL_GROUND = /bark|compost|gravel|hedge|leaf|mulch/;
export const WOOD_GROUND = /bark|mulch|leaf|hedge|oak|wild/, LEAF_GROUND = /lawn|grass|long|hedge|leaf|soil|clover|wild|oak|mulch/;
export const heavy = f => !!(FOODS[f.type] && FOODS[f.type].crew);
export const SOIL = [ {name:'soft', work:6}, {name:'packed', work:12}, {name:'clay', work:20}, {name:'rock', work:30}, {name:'bedrock', work:300} ];
export const soilTier = y => y < SOIL_TOP[1] ? 0 : y < SOIL_TOP[2] ? 1 : y < SOIL_TOP[3] ? 2 : y < SOIL_TOP[4] ? 3 : 4;
// Foragers range only so far from the nest on their own (tiles of path), or
// further along a scent trail you lay. Training them reaches further and
// walks them faster. Level 0 is where a colony starts.
export const FORAGE = [ {range:40, speed:1}, {range:55, speed:1.1, cost:{food:15}}, {range:75, speed:1.2, cost:{food:40, grit:10}}, {range:100, speed:1.3, cost:{food:80, protein:10, grit:25}}, {range:130, speed:1.3} ];
// Dug dirt has to go somewhere: each dug cell is a load a builder carries up
// and out to the spoil heap. With SPOIL_MAX loads waiting, digging stops.
export const SPOIL_MAX = 3;
// Queen levels I→IV are built; V→VIII need materials from later builds (growth.js).
export const QUEEN_UP = [ {food:40, protein:10}, {food:80, protein:20, grit:20}, {food:150, protein:40, grit:40}, ...QUEEN_LEVELS ];
export const NEST_CAP = 100; // build 42: a nest holds 100 at most; more needs a daughter colony
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const idx = (x,y) => y*W + x;
export const nidx = (x,y) => y*NW + x;
