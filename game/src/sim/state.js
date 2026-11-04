// A new game: a colony's starting state, sleeping rivals, and create().
import { AREAS, REGION } from './yard.js';
import { H, RIVALS, SHAFT, W, idx } from './core.js';
import { SEE, makeWorld, mkAnt, reveal, spawnFood, spawnInArea, spawnSpider, walk } from './world.js';
import { makeNest } from './nest.js';
import { outpostsChanged } from './outposts.js';
import { populateBugs } from './creatures.js';
import { placeCurios } from './curios.js';

function newColony(ex, ey, team){
  return { team, ex, ey, store: team ? 20 : 10, cap: 20, water: 8, waterCap: 10, protein: 0, grit: 0,
    hatchCap: 1, hatchMul: 1, buildQueue: [], eggQueue: [], eggs: [],
    trophies: {spider:false}, starve: 0, deaths: {}, kills: {}, delivered: new Array(60).fill(0), eaten: new Array(60).fill(0), secAcc: 0,
    queenAlive: true, founded: team !== 0, raidT: 0, siege: 0, stolen: 0, pstarve: 0, forage: 0, ...growthState() };
}
// Growth (build 12, growth.js): 🧬 Genes, ant-type levels and picks, evolution
// nodes, veteran doctrine, the queen's traits, and the tallies deeds read.
// A rival colony not yet woken (build 25).
export function sleepingRival(w, team){ const R = RIVALS[team - 1], n = w.rnests[team], r = newColony(n.x, n.y, team); Object.assign(r, { key: R.key, asleep: true, store: 30, cap: 200, water: 999, waterCap: 999, hatchCap: 2, raidCd: 0, qhp: R.qhp }); return r; }
export function wakeRival(s, r, say){ const R = RIVALS[r.team - 1]; r.asleep = false;
  // Build 25.1: their region comes alive with them, food and all. Food only grows in regions
  // someone has walked into, so a colony waking in an unvisited one starved out in four minutes.
  const ai = s.world.area[idx(r.ex, r.ey)]; if (ai != null && !s.active[ai]){ s.active[ai] = true; for (let k = 0; k < AREAS[ai].start; k++) spawnFood(s, ai, false); populateBugs(s, ai); }
  if (say){ s.banner = { key: 'rival-' + R.key, t: s.t, icon: '🐜', title: R.name, line: R.arrival, kind: 'hard' }; s.events.push('event'); s.player.msg = R.name + ': ' + R.arrival; }
  r.store = Math.max(r.store, 80); for (let i = 0; i < R.start[0]; i++) mkAnt(s, 'forager', 'in', r.ex, r.ey, r.team); for (let i = 0; i < R.start[1]; i++) mkAnt(s, 'soldier', 'in', r.ex, r.ey, r.team); }
export function growthState(){
  return { genes: 0, genesTotal: 0, up: {}, picks: {}, evo: {}, doctrine: {}, qtraits: {}, found: {}, scouted: {},
    hatched: 0, treats: 0, foodTotal: 0, storePeak: 0, repaired: 0, raidsBeaten: 0, fallen: [], named: 0,
    held: {}, goals: { done: {}, sets: {} }, dug: 0, sugar: 0, chitin: 0, sugarTotal: 0, chitinTotal: 0, wood: 0, fungus: 0, roomLv: {}, glow: 0, glowTotal: 0 };
}
export function create(seed){
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
