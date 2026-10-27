// Underfoot simulation (build 6, from prototype/sim.js). No DOM, no renderer:
// the views read this state; nothing here knows how it is drawn.
import { makeYard, AREAS, AREA, BLOCK, SCALE, REGION, areaBounds } from './yard.js';
const SIM = (() => {
const W = AREA*BLOCK.cols, H = AREA*BLOCK.rows, T = 16; // surface tiles: the built yard (yard.js)
// Everything on the surface is twice as big as it was (yard.js SCALE), so
// ants and creatures walk faster to keep trips from dragging.
const SURF = 1.4;
// Nest cutaway cells. The soil comes in bands, top down: a deep layer of
// soft topsoil, then packed soil and clay, equally deep.
const SOIL_ROWS = [20, 14, 14];
const SOIL_TOP = [0, SOIL_ROWS[0], SOIL_ROWS[0] + SOIL_ROWS[1]];
const NW = 24, NH = SOIL_ROWS.reduce((a, b) => a + b), SHAFT = 12;
const N8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const N4 = [[1,0],[-1,0],[0,1],[0,-1]];
const CASTES = {
  forager:{name:'Forager', cost:{food:2, water:1}, hatch:20, speed:60, eat:1, fight:1, hp:2, r:2.2},
  builder:{name:'Builder', cost:{food:3, water:1}, hatch:25, speed:50, eat:1, fight:1, hp:2, r:2.4},
  nurse:  {name:'Nurse', cost:{food:2, water:1}, hatch:20, speed:50, eat:1, fight:1, hp:2, r:2.2},
  soldier:{name:'Soldier', cost:{food:4, water:1, protein:2}, hatch:40, speed:55, eat:2, fight:3, hp:6, r:3.0},
  venom:  {name:'Venom ant', cost:{food:5, water:1, protein:3}, hatch:45, speed:58, eat:2, fight:8, hp:6, r:3.0},
};
const ROOMS = {
  queen:   {name:'Queen\u2019s chamber', cost:{}, work:0, w:4, h:3, desc:'Eggs, one at a time'},
  hatchery:{name:'Hatchery', cost:{food:10}, work:20, w:4, h:3, desc:'+2 eggs at a time'},
  store:   {name:'Food store', cost:{food:10, grit:5}, work:20, w:5, h:3, desc:'Food cap 20 to 150'},
  cistern: {name:'Cistern', cost:{food:15, grit:5}, work:20, w:4, h:4, desc:'Water cap 10 to 60'},
  nursery: {name:'Nursery', cost:{food:20, water:10}, work:25, w:4, h:3, desc:'Nurses; eggs hatch 30% faster'},
  barracks:{name:'Barracks', cost:{food:30, protein:5}, work:30, w:6, h:3, desc:'Unlocks Soldiers'},
  workshop:{name:'Workshop', cost:{food:25, grit:10}, work:25, w:5, h:4, desc:'Builders dig packed soil and build 2× faster'},
};
const ROOM_KEYS = ['hatchery','store','cistern','nursery','barracks','workshop'];
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
  hotdog:   {name:'hot dog scrap', amt:[14,18], protein:true},
  // Treats are too big for one ant: the player lifts them with a crew.
  jellybean:{name:'jelly bean', amt:[40,40], treat:true, crew:6},
  cookie:   {name:'cookie', amt:[35,35], treat:true, crew:6},
  gummy:    {name:'gummy bear', amt:[50,50], treat:true, crew:8},
  chip:     {name:'potato chip', amt:[30,30], treat:true, crew:4},
  acorn:    {name:'acorn', amt:[30,30], treat:true, crew:4},
  slug:     {name:'slug', amt:[20,26], protein:true},
};
const heavy = f => !!(FOODS[f.type] && FOODS[f.type].crew);
const SOIL = [ {name:'soft', work:6}, {name:'packed', work:12}, {name:'clay', work:20} ];
const soilTier = y => y < SOIL_TOP[1] ? 0 : y < SOIL_TOP[2] ? 1 : 2;
const QUEEN_UP = [ {food:40, protein:10}, {food:80, protein:20, grit:20}, {food:150, protein:40, grit:40} ];
const queenCap = lvl => 20 + 20*lvl;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const idx = (x,y) => y*W + x;
const nidx = (x,y) => y*NW + x;

// ---------- surface world ----------
function makeWorld(seed){
  const y = makeYard(seed);
  const home = bfs(y.blocked, y.ex, y.ey);
  for (let i=0;i<W*H;i++) if (home[i] >= 9999) y.blocked[i]=1;
  return Object.assign(y, { home, rhome: bfs(y.blocked, y.rx, y.ry) });
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
  return { cells, ver: 1, rooms: [], digOrders: [], fillOrders: [], fields: {} }; // rooms: [{x0,y0,w,h,key}]
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
  n.fillOrders.push({ x, y, progress: 0, need: SOIL[soilTier(y)].work }); return 'added';
}
function removeRoom(s, x, y){
  const r = roomAt(s, x, y); if (!r || r.key === 'queen') return false; const c = s.colony;
  s.nest.rooms.splice(s.nest.rooms.indexOf(r), 1); for (const [cx,cy] of rectCells(r)) s.nest.cells[nidx(cx,cy)] = 1; s.nest.ver++;
  const R = ROOMS[r.key]; for (const k in R.cost){ const half = Math.floor(R.cost[k]/2); if (k === 'food') c.store = Math.min(c.cap, c.store + half); else c[k] += half; }
  if (r.key === 'hatchery') c.hatchCap -= 2; if (r.key === 'store'){ c.cap = 20; c.store = Math.min(c.store, 20); } if (r.key === 'cistern'){ c.waterCap = 10; c.water = Math.min(c.water, 10); } if (r.key === 'nursery') c.hatchMul = 1;
  return true;
}
function dugCount(s){ let n = 0; for (let i=0;i<NW*NH;i++) if (s.nest.cells[i] === 1) n++; return n; }
function isDugNeighbor(s, x, y){ for (const [dx,dy] of N4){ const nx=x+dx, ny=y+dy; if (nx<0||ny<0||nx>=NW||ny>=NH) continue; if (s.nest.cells[nidx(nx,ny)]) return [nx,ny]; } return null; }
function digAllowed(s, y){ const t = soilTier(y); if (t === 0) return ''; if (!roomOf(s, 'workshop')) return 'needs Workshop'; if (t === 2 && s.queen.level < 1) return 'needs queen upgrade'; return ''; }
function toggleDigOrder(s, x, y){
  const n = s.nest; if (x<1||y<1||x>=NW-1||y>=NH) return 'edge';
  const i = n.digOrders.findIndex(o => o.x===x && o.y===y); if (i >= 0){ n.digOrders.splice(i,1); return 'removed'; }
  if (n.cells[nidx(x,y)]) return 'dug'; let adj = isDugNeighbor(s, x, y);
  if (!adj){ const o = n.digOrders.find(o => Math.abs(o.x-x)+Math.abs(o.y-y) === 1); if (o) adj = [o.x, o.y]; } if (!adj) return 'not adjacent';
  const why = digAllowed(s, y); if (why) return why; if (n.digOrders.length >= 16) return 'too many';
  n.digOrders.push({ x, y, ax: adj[0], ay: adj[1], progress: 0, need: SOIL[soilTier(y)].work }); return 'added';
}

// ---------- state ----------
function newColony(ex, ey, team){
  return { team, ex, ey, store: team ? 20 : 10, cap: 20, water: 8, waterCap: 10, protein: 0, grit: 0,
    hatchCap: 1, hatchMul: 1, buildQueue: [], eggQueue: [], eggs: [],
    trophies: {spider:false}, starve: 0, deaths: {}, kills: {}, delivered: new Array(60).fill(0), eaten: new Array(60).fill(0), secAcc: 0,
    queenAlive: true, founded: team !== 0, raidT: 0, siege: 0, stolen: 0, pstarve: 0 };
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
    colony: newColony(w.ex, w.ey, 0), rival: newColony(w.rx, w.ry, 1),
    player: { ant: null, hunger: 100, tx: null, ty: null, holding: false, mark: false, pending: false, msg: '', inNest: true, ntx: null, nty: null },
    queen: { x: SHAFT, y: 0, energy: 30, placed: false, level: 0, room: null, hp: 100 },
    phase: 'dig', itemTimer: 0, dewTimer: 0, dew: false, won: false, lost: false,
    areaT: AREAS.map(() => 0), strikes: [], strikeT: AREAS.map(A => A.strike ? A.strike.every[0] + Math.random()*(A.strike.every[1] - A.strike.every[0]) : 0), mower: { state: 'idle', next: 420, t: 0, y: 0 },
    rain: { t: 0, on: false, next: 240 }, repairs: [], seen: {}, events: [],
  };
  s.rival.store = 20; s.rival.cap = 120; s.rival.water = 999; s.rival.waterCap = 999; s.rival.hatchCap = 2; s.rival.raidCd = 0;
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
  return s;
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
// One item from an area's food table; now and then a treat where people drop them.
function spawnFood(s, ai, treats){
  const A = AREAS[ai], w = s.world;
  if (treats && A.treat && w.rnd() < A.treat && !s.items.some(f => heavy(f))){
    const it = spawnInArea(s, ai, 'food', A.treats[Math.floor(w.rnd()*A.treats.length)]);
    if (it){ const F = FOODS[it.type]; s.events.push('treat'); if (!s.player.msg) s.player.msg = 'Something tasty fell by ' + A.name.replace(/^The /, 'the ') + ': a ' + F.name + ', worth ' + it.amt + ' food. It takes a crew of ' + F.crew + ' to carry.'; }
    return it;
  }
  let tot = 0; for (const f of A.foods) tot += f[1];
  let r = w.rnd()*tot, type = A.foods[0][0];
  for (const f of A.foods){ r -= f[1]; if (r <= 0){ type = f[0]; break; } }
  return spawnInArea(s, ai, FOODS[type] && FOODS[type].protein ? 'protein' : 'food', type);
}
// How far foragers roam on their own: a bigger colony reaches farther.
const forageRange = s => Math.min(100, 48 + s.ants.length*0.5);
const areaOf = (s, x, y) => s.world.area[idx(Math.max(0, Math.min(W-1, x)), Math.max(0, Math.min(H-1, y)))];
// The spider lives at its web in the Flowerbed.
function spawnSpider(s){
  const w = s.world;
  s.spider = { x:(w.web.x+0.5)*T, y:(w.web.y+2*SCALE+0.5)*T, hp: 150, maxHp: 150, wander: 0, bite: 0 };
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
const itemAt = (s,x,y) => s.items.find(f => f.x===x && f.y===y && f.amt>0);
const colonyOf = (s, a) => a.team ? s.rival : s.colony;
const homeOf = (s, a) => a.team ? s.world.rhome : s.world.home;

function stepTo(a, tx, ty, speed, dt){
  const gx = (tx+0.5)*T, gy = (ty+0.5)*T; let ddx = gx-a.x, ddy = gy-a.y; const d = Math.hypot(ddx,ddy);
  if (d < 0.5){ a.x = gx; a.y = gy; return true; }
  const m = Math.min(d, speed*SURF*dt); ddx/=d; ddy/=d; a.x += ddx*m; a.y += ddy*m; a.dx = ddx; a.dy = ddy;
  return Math.hypot(gx-a.x, gy-a.y) < 0.5;
}
function pickWeighted(opts, tot){ let r = Math.random()*tot; for (const o of opts){ r -= o[2]; if (r <= 0) return o; } return opts[opts.length-1]; }
function okDiag(s, a, dx, dy){ return !(dx && dy && (!walk(s,a.tx+dx,a.ty) || !walk(s,a.tx,a.ty+dy))); }
function chooseExplore(s, a, maxDist){
  const home = homeOf(s, a), cd = home[idx(a.tx,a.ty)]; const opts = []; let tot = 0;
  for (const [dx,dy] of N8){
    const nx = a.tx+dx, ny = a.ty+dy; if (!walk(s,nx,ny) || !okDiag(s,a,dx,dy)) continue;
    // Past the usual range only along a scent trail: the player opens up far ground.
    const nd = home[idx(nx,ny)]; if (maxDist && nd > maxDist && (a.team || s.trail[idx(nx,ny)] < 0.3)) continue;
    let wgt = 0.15; if (nd > cd) wgt += 0.6; else if (nd === cd) wgt += 0.25;
    const fw = dx*a.dx + dy*a.dy; if (fw > 0.8) wgt += 1.4; else if (fw > 0.5) wgt += 0.6; else if (fw < -0.5) wgt *= 0.1;
    if (!a.team) wgt += Math.min(4, s.trail[idx(nx,ny)]) * 4;
    if (s.spider && a.flee > 0){ const sd = Math.hypot((nx+0.5)*T - s.spider.x, (ny+0.5)*T - s.spider.y); wgt *= sd < 3*T ? 0.05 : 1.5; }
    if (s.world.pit[idx(nx,ny)]) wgt *= 0.03; // ants know to keep off the sand slopes
    opts.push([nx,ny,wgt]); tot += wgt;
  }
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
  want.protein = 1.5;
  // Enough stone for the next queen upgrade, never less than 30.
  if (!a.team && (a.caste==='builder' || c.store > c.cap*0.6) && c.grit < Math.max(30, (QUEEN_UP[s.queen.level] || {}).grit || 0)) want.grit = 0.8;
  return want;
}
function nearestItem(s, a, r, want){ let best=null, bd=r; for (const f of s.items){ if (f.amt<=0 || !want[f.kind] || (heavy(f) && !a.team) || f.carried) continue; const d = Math.hypot(f.x-a.tx, f.y-a.ty)/want[f.kind]; if (d < bd){ bd = d; best = f; } } return best; }
function deposit(s, a){
  const c = colonyOf(s, a);
  if (a.kind === 'food'){ const put = Math.min(Math.max(0, c.cap - c.store), a.carry); c.store += put; c.delivered[0] += put; }
  else if (a.kind === 'water') c.water = Math.min(c.waterCap, c.water + a.carry);
  else if (a.kind === 'protein') c.protein += a.carry;
  else if (a.kind === 'grit') c.grit += a.carry;
  a.carry = 0;
}
function killAnt(s, a, cause){
  if (a.state === 'dead') return; a.state = 'dead';
  if (a.isPlayer){ const P = s.player; if (P.big){ P.big.carried = false; P.big = null; } P.ant = null; P.pending = true; P.path = null; P.msg = ({ spider: 'The spider got you.', rival: 'A rival soldier got you.', antlion: 'An antlion dragged you under.', mower: 'The mower got you.', foot: 'A foot came down on you.', bird: 'A robin snapped you up.', toad: 'The toad\'s tongue got you.', acorn: 'An acorn fell on you.', spray: 'The bug spray got you.', fireants: 'Fire ants stung you to death.' }[cause] || 'You starved.') + ' Your crew scatters. Waiting for the next hatchling.'; }
  if (!a.team){ const i = idx(Math.min(W-1,Math.max(0,Math.floor(a.x/T))), Math.min(H-1,Math.max(0,Math.floor(a.y/T)))); s.alarm[i] += 3; s.hot.add(i); }
  const c = colonyOf(s, a); c.deaths[cause] = (c.deaths[cause]||0) + 1;
}
function payCost(c, cost){ for (const k in cost){ const have = k==='food' ? c.store : c[k]; if (have < cost[k]) return false; } for (const k in cost){ if (k==='food') c.store -= cost[k]; else c[k] -= cost[k]; } return true; }
function canPay(c, cost){ for (const k in cost){ const have = k==='food' ? c.store : c[k]; if (have < cost[k]) return false; } return true; }
function costText(cost){ return Object.entries(cost).map(([k,v]) => v+' '+k).join(' · ') || 'free'; }

// ---------- main tick ----------
function tick(s, dt){
  s.t += dt; const w = s.world, c = s.colony, P = s.player;
  // Messages fade after a while instead of sticking until the next one.
  if (P.msg !== s.msgSeen){ s.msgSeen = P.msg; s.msgAt = s.t; } else if (P.msg && P.ant && s.t - s.msgAt > 10) P.msg = '';
  const td = Math.pow(0.5, dt/(s.rain && s.rain.on ? 4 : 90)), ad = Math.pow(0.5, dt/8); const tr = s.trail, al = s.alarm;
  // Only tiles with scent on them decay (s.hot); the yard is too big to sweep.
  for (const i of s.hot){ if (tr[i] > 0.001) tr[i] *= td; else tr[i] = 0; if (al[i] > 0.001) al[i] *= ad; else al[i] = 0; if (!tr[i] && !al[i]) s.hot.delete(i); }
  for (const col of [c, s.rival]) tickColony(s, col, dt);
  // dew
  s.dewTimer += dt; if (!s.dew && s.dewTimer > 110){ s.dew = true; s.dewTimer = 0; for (const [ai, n] of [[REGION.rock, 6], [REGION.lawn, 4], [REGION.flowerbed, 4], [REGION.clover, 3], [REGION.dandelions, 3]]) for (let i=0;i<n;i++) spawnInArea(s, ai, 'water', 'dew', 8); s.events.push('dew'); if (!P.msg) P.msg = 'Dew is out. Foragers can carry water home for a minute.'; }
  if (s.dew && s.dewTimer > 60){ s.dew = false; s.dewTimer = 0; s.items = s.items.filter(f => f.type !== 'dew'); }
  tickRain(s, dt); tickMaintenance(s, dt);
  // Food grows back area by area at each area's own pace (yard.js), so the
  // ground near home runs thin and the rich food is far away.
  for (let i=0;i<AREAS.length;i++){ if (!s.active[i]) continue; const A = AREAS[i]; s.areaT[i] += dt*A.rate/60;
    if (s.areaT[i] >= 1){ s.areaT[i] -= 1; let n = 0; for (const f of s.items) if ((f.kind==='food'||f.kind==='protein') && f.amt > 0 && !f.max && w.area[idx(f.x,f.y)] === i) n++; if (n < A.max) spawnFood(s, i, s.t > 180); } }
  s.itemTimer += dt; if (s.itemTimer > 9){ s.itemTimer = 0;
    if (s.items.filter(f=>f.kind==='grit').length < 10) spawnInArea(s, Math.random() < 0.6 ? REGION.rock : REGION.woodpile, 'grit', 'pebble');
    for (const f of s.items) if (f.max) f.amt = Math.min(f.max, f.amt + 3); }
  s.items = s.items.filter(f => f.amt > 0 || f.max);
  tickMower(s, dt); tickPits(s, dt); tickStrikes(s, dt); tickStings(s, dt);
  s.seenT += dt; if (s.seenT > 0.4){ s.seenT = 0; const pa = P.ant; if (pa && !P.inNest){ reveal(s, pa.x/T, pa.y/T, SEE.player);
    // Walking into a dormant region wakes it: its food appears and starts to grow.
    const ai = w.area[idx(pa.tx, pa.ty)]; if (!s.active[ai]){ s.active[ai] = true; for (let k=0;k<AREAS[ai].start;k++) spawnFood(s, ai, false); } } }
  stepSpider(s, dt); if (!s.spider){ if (s.spiderAway){ s.spiderAway.t -= dt; if (s.spiderAway.t <= 0){ spiderEnter(s, s.spiderAway.hp); s.spiderAway = null; } } else { s.spiderRespawn -= dt; if (s.spiderRespawn <= 0){ spiderEnter(s, 150); s.spiderRespawn = 120; } } }
  stepCat(s, dt); if (!s.cat){ s.catRespawn -= dt; if (s.catRespawn <= 0){ spawnCat(s); s.catRespawn = 90; } }
  // buckets for combat
  const buckets = new Map();
  for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; const k = a.tx+','+a.ty; let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(a); }
  // Fighters near the spider, per team: guards only take it on as a crew.
  const spiderCrew = [0, 0];
  if (s.spider) for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; if ((CASTES[a.caste].fight >= 3 || a.follow) && Math.hypot(a.x - s.spider.x, a.y - s.spider.y) < 4*T) spiderCrew[a.team]++; }
  const enemiesNear = (a, r) => { const out = []; for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++){ const b = buckets.get((a.tx+dx)+','+(a.ty+dy)); if (b) for (const o of b) if (o.team !== a.team && o.state !== 'dead') out.push(o); } return out; };
  for (const a of s.ants){
    if (a.state === 'dead') continue;
    if (a.isPlayer){ stepPlayer(s, a, dt, enemiesNear); continue; }
    const C = CASTES[a.caste], col = colonyOf(s, a), home = homeOf(s, a);
    if (a.state === 'in' || a.state === 'build' || a.state === 'nest'){ tickInside(s, a, dt); continue; }
    if (a.flee > 0) a.flee -= dt; else a.fleeFrom = null;
    const aggressive = C.fight >= 3 || a.follow || a.state === 'raid';
    // spider / enemies
    if (s.spider){ const sd = Math.hypot(a.x - s.spider.x, a.y - s.spider.y);
      const brave = a.follow || a.state === 'raid' || (a.state === 'fight' && a.goal === 'spider') || spiderCrew[a.team] >= 5;
      if (sd < 3.5*T){ if (aggressive && brave){ if (a.state !== 'follow' && a.state !== 'raid') a.state = 'fight'; a.goal = 'spider'; } else if (a.state !== 'fight'){ a.flee = 2; } } }
    const en = enemiesNear(a, aggressive ? 1 : 2);
    if (en.length){
      // Rival soldiers fight half again as hard on their own doorstep.
      if (aggressive){ const o = en.find(o => Math.abs(o.tx-a.tx)<=1 && Math.abs(o.ty-a.ty)<=1); if (o){ o.hp -= C.fight*dt*(a.team && Math.hypot(a.tx - w.rx, a.ty - w.ry) < 5 ? 1.5 : 1); if (o.hp <= 0) killAnt(s, o, a.team ? 'rival' : 'war'); } if (a.state === 'explore' || a.state === 'return' || a.state === 'patrol') a.state = 'fight'; a.goal = 'enemy'; }
      else if (en.some(o => CASTES[o.caste].fight >= 3 || o.follow)){ a.flee = 2.5; }
    }
    if (a.flee > 0 && a.state !== 'fight' && a.state !== 'follow' && a.state !== 'raid'){
      const threat = a.fleeFrom || (s.spider && Math.hypot(a.x-s.spider.x, a.y-s.spider.y) < 4*T ? s.spider : (en[0] || s.spider || {x:a.x+1,y:a.y}));
      if (stepTo(a, a.tx, a.ty, C.speed+20, dt)) chooseToward(s, a, a.x + (a.x - threat.x), a.y + (a.y - threat.y));
      continue;
    }
    if (a.state === 'fight'){
      let tx = null, ty = null;
      if (a.goal === 'spider' && s.spider){ tx = s.spider.x; ty = s.spider.y; }
      else { const e2 = enemiesNear(a, 6); if (e2.length){ tx = e2[0].x; ty = e2[0].y; } else if (s.spider && Math.hypot(a.x-s.spider.x, a.y-s.spider.y) < 8*T){ tx = s.spider.x; ty = s.spider.y; } }
      if (tx == null){ a.state = a.carry ? 'return' : (a.team ? 'return' : 'patrol'); a.explore = 0; continue; }
      if (Math.hypot(a.x-tx, a.y-ty) > 0.9*T){ if (stepTo(a, a.tx, a.ty, C.speed, dt)) chooseToward(s, a, tx, ty); }
      continue;
    }
    if (a.state === 'raid'){
      const gx = (c.ex+0.5)*T, gy = (c.ey+0.5)*T;
      if (Math.hypot(a.x-gx, a.y-gy) < 1.5*T){ const guarded = s.ants.some(o => !o.team && o.state!=='dead' && CASTES[o.caste].fight >= 3 && (o.state==='patrol'||o.state==='fight') && Math.hypot(o.tx-c.ex, o.ty-c.ey) < 4);
        // Unguarded, raiders push into the nest and go for the queen.
        a.raidT = (a.raidT||0) + dt; raiseAlarm(s, c.ex, c.ey, 2);
        if (!guarded && s.queen.placed && !s.lost && a.raidT < 10){ s.queen.hp -= 0.8*dt; if (s.queen.hp < 99 && !s.queenWarned){ s.queenWarned = true; s.events.push('queenhit'); P.msg = 'Raiders are inside the nest, attacking the queen! Soldiers at the entrance stop them.'; } continue; }
        const take = Math.min(guarded ? 1 : 2, c.store); c.store -= take; c.stolen += take; a.carry = take; a.kind = 'food'; a.state = 'return'; a.raidT = 0; continue; }
      if (stepTo(a, a.tx, a.ty, C.speed, dt)) chooseToward(s, a, gx, gy);
      continue;
    }
    if (a.state === 'follow'){
      if (!P.ant || P.inNest){ a.follow = false; a.state = 'explore'; continue; }
      const pd = Math.hypot(a.x - P.ant.x, a.y - P.ant.y);
      if (pd > 16*T){ a.follow = false; a.state = 'explore'; continue; }
      if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < CAT_REACH){ s.cat.hp -= C.fight*dt; }
      // A crew that falls behind hurries to keep up with you.
      if (pd > 1.3*T){ if (stepTo(a, a.tx, a.ty, pd > 3*T ? 95 : C.speed+15, dt)) chooseToward(s, a, P.ant.x + (Math.random()-0.5)*T, P.ant.y + (Math.random()-0.5)*T); }
      continue;
    }
    if (a.state === 'explore' || a.state === 'patrol'){
      a.explore += dt; if (s.rain.on && !a.team && a.state === 'explore' && a.explore > 2){ a.state = 'return'; a.explore = 0; continue; }
      const f = itemAt(s, a.tx, a.ty); const want = wanted(s, a);
      // Pick up on arrival: within 2 px, or within this tick's step at speed.
      if (f && a.state === 'explore' && a.carry === 0 && want[f.kind] && (!heavy(f) || a.team) && !f.carried && Math.hypot(a.x-(a.tx+0.5)*T, a.y-(a.ty+0.5)*T) < 2 + C.speed*SURF*dt){ const take = Math.min(5, f.amt); f.amt -= take; a.carry = take; a.kind = f.kind; a.itype = f.type; a.state = 'return'; continue; }
      if (a.explore > (a.state === 'patrol' ? 25 : 60)){ a.state = 'return'; a.explore = 0; continue; }
      if (stepTo(a, a.tx, a.ty, C.speed, dt)){ const nf = a.state === 'explore' ? nearestItem(s, a, 7, want) : null; if (nf) chooseToward(s, a, (nf.x+0.5)*T, (nf.y+0.5)*T); else chooseExplore(s, a, a.state === 'patrol' ? (a.team ? 6 : 9) : a.team ? 64 : forageRange(s)); }
      continue;
    }
    if (a.state === 'return'){
      if (a.carry > 0 && !a.team){ const i = idx(a.tx,a.ty); s.trail[i] = Math.min(5, s.trail[i] + 1.2*dt); s.hot.add(i); }
      if (a.tx === col.ex && a.ty === col.ey && Math.hypot(a.x-(col.ex+0.5)*T, a.y-(col.ey+0.5)*T) < 2){
        if (a.carry) deposit(s, a); enterNest(s, a); continue; }
      if (stepTo(a, a.tx, a.ty, C.speed, dt)) chooseReturn(s, a);
      continue;
    }
  }
  // spider damage
  if (s.spider){
    let power = 0; const near = [];
    for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; const d = Math.hypot(a.x-s.spider.x, a.y-s.spider.y); if (d < SPIDER_REACH){ near.push(a); if (a.state==='fight' || a.state==='follow' || a.isPlayer || a.state==='raid') power += CASTES[a.caste].fight; } }
    s.spider.hp -= power*0.5*dt; s.spider.bite += dt;
    if (s.spider.bite >= 2 && near.length){ s.spider.bite = 0; killAnt(s, near[Math.floor(Math.random()*near.length)], 'spider'); }
    if (s.spider.hp <= 0){ s.items.push({ x: Math.floor(s.spider.x/T), y: Math.floor(s.spider.y/T), kind:'protein', type:'spider', amt: 40 });
      if (!c.trophies.spider){ c.trophies.spider = true; P.msg = 'Spider down. Trophy: spider fang. Venom ants unlocked at the queen.'; }
      c.kills.spider = (c.kills.spider||0)+1; s.spider = null; s.spiderRespawn = 120; }
  }
  if (s.cat && s.cat.hp <= 0){ s.items.push({ x: Math.floor(s.cat.x/T), y: Math.floor(s.cat.y/T), kind:'protein', type:'cat', amt: 40 }); c.kills.caterpillar = (c.kills.caterpillar||0)+1; if (!P.msg) P.msg = 'Caterpillar down. 40 protein on the ground. Haul it home for Soldiers.'; s.cat = null; s.catRespawn = 90; }
  // siege on rival entrance
  if (s.rival.queenAlive){
    let ours = 0, theirs = 0, power = 0;
    for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; const d = Math.hypot(a.tx - w.rx, a.ty - w.ry);
      if (!a.team && d <= 2 && (CASTES[a.caste].fight >= 3 || a.isPlayer)){ ours++; power += CASTES[a.caste].fight; } if (a.team && d <= 3 && CASTES[a.caste].fight >= 3) theirs++; }
    // Our fighters at their door raise the alarm: their soldiers pour out to defend.
    if (ours) raiseAlarm(s, w.rx, w.ry, 1.5);
    // Eight fighters holding the door with no defenders left wear the queen down (1,000 hp, she heals 3 a second).
    const r = s.rival; if (r.qhp == null) r.qhp = 1000;
    if (ours >= 8 && theirs === 0){ r.siege = 1; r.qhp -= power*0.5*dt; if (r.qhp <= 0){ r.qhp = 0; r.queenAlive = false; s.won = true; P.msg = 'The rival queen is dead. The yard is yours.'; } }
    else { r.siege = 0; r.qhp = Math.min(1000, r.qhp + 3*dt); }
  } else { for (const a of s.ants) if (a.team && Math.random() < dt/60) a.state = 'dead'; }
  for (const a of s.ants){ if (a.team && a.state !== 'dead' && a.state !== 'in' && CASTES[a.caste].fight >= 3 && Math.hypot(a.tx - c.ex, a.ty - c.ey) < 3){ raiseAlarm(s, c.ex, c.ey, 1.2); break; } }
  rivalBrain(s, dt);
  s.ants = s.ants.filter(a => a.state !== 'dead');
}

function tickColony(s, c, dt){
  c.secAcc += dt; while (c.secAcc >= 1){ c.secAcc -= 1; c.delivered.pop(); c.delivered.unshift(0); c.eaten.pop(); c.eaten.unshift(0); }
  let eat = 0; for (const a of s.ants) if (a.state !== 'dead' && a.team === c.team) eat += CASTES[a.caste].eat;
  const bite = eat/60*dt; c.eaten[0] += bite; c.store -= bite;
  if (c.store < 0){ c.store = 0; c.starve += dt; if (!c.team && c.starve > 10 && !c.starveWarned){ c.starveWarned = true; s.events.push('starving'); s.player.msg = 'The store is empty and the colony is starving. Lead foragers farther with trails, or lay fewer eggs.'; } } else { c.starve = 0; if (c.store > 20) c.starveWarned = false; }
  if (c.starve > 20 && (c.starve - 20) % 5 < dt){ const v = s.ants.filter(a => !a.isPlayer && a.state !== 'dead' && a.team === c.team); if (v.length) killAnt(s, v[Math.floor(Math.random()*v.length)], 'starved'); }
  const overCap = !c.team && s.ants.filter(a => !a.team).length >= queenCap(s.queen.level);
  if (c.queenAlive && (c.team || s.queen.placed) && !overCap){
    while (c.eggQueue.length && c.eggs.length < c.hatchCap){ const caste = c.eggQueue.shift(); c.eggs.push({ caste, t: 0, need: CASTES[caste].hatch * c.hatchMul }); }
    const nurses = c.team ? 0 : Math.min(3, s.ants.filter(a => a.caste==='nurse' && a.team===0 && (a.state==='in'||a.state==='build')).length); const rate = 1 + 0.12*nurses;
    for (let i=c.eggs.length-1;i>=0;i--){ const e = c.eggs[i]; e.t += dt*rate; if (e.t >= e.need){ c.eggs.splice(i,1); hatch(s, c, e.caste); } }
  }
  if (!c.team){
    const P = s.player;
    // Fighters eat protein: half a unit a minute each. With none, they starve one by one.
    const fighters = s.ants.filter(a => !a.team && a.state !== 'dead' && CASTES[a.caste].fight >= 3);
    if (fighters.length){ c.protein -= fighters.length*0.5/60*dt;
      if (c.protein < 0){ c.protein = 0; c.pstarve += dt; if (c.pstarve > 30 && (c.pstarve - 30) % 10 < dt){ const v = fighters.filter(a => !a.isPlayer); if (v.length) killAnt(s, v[Math.floor(Math.random()*v.length)], 'starved'); s.events.push('soldierfood'); if (!P.msg) P.msg = 'Soldiers are starving: no protein in store. Hunt a caterpillar or haul bugs from the Woodpile.'; } }
      else c.pstarve = 0; }
    // The queen heals slowly; if raiders kill her, the colony is lost.
    const q = s.queen;
    if (q.placed && !s.lost){ q.hp = Math.min(100, q.hp + 0.1*dt); if (q.hp >= 99) s.queenWarned = false;
      if (q.hp <= 0){ q.hp = 0; s.lost = true; c.queenAlive = false; s.events.push('lost'); P.msg = 'The queen is dead. Without her the colony will dwindle away. Press Reset to found a new one.'; } }
    if (P.pending && !P.ant && !c.eggs.length && !c.eggQueue.length && s.queen.placed){ c.eggQueue.push('forager'); P.msg = 'Waiting for the next hatchling. A free Forager egg was laid.'; }
    const ws = roomOf(s, 'workshop') ? 2 : 1;
    // Construction only advances for builders standing at their own job.
    const atWork = key => s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.atWork && a.task === key).length;
    if (c.buildQueue.length){ const job = c.buildQueue[0]; const builders = Math.min(ROOM_CREW, atWork('j'));
      job.progress += builders*ws*dt; const R = ROOMS[job.room];
      if (job.progress >= R.work){ c.buildQueue.shift(); finishRoom(s, job); } }
    for (let i=s.nest.fillOrders.length-1;i>=0;i--){ const o = s.nest.fillOrders[i]; const b = atWork('f'+o.x+','+o.y); o.progress += b*ws*dt; if (o.progress >= o.need){ const occupied = s.ants.some(a => !a.team && (a.state==='in'||a.state==='build'||a.state==='nest') && Math.floor(a.nx)===o.x && Math.floor(a.ny)===o.y); if (!occupied){ s.nest.cells[nidx(o.x,o.y)] = 0; s.nest.ver++; s.nest.fillOrders.splice(i,1); } } }
    for (let i=s.nest.digOrders.length-1;i>=0;i--){ const o = s.nest.digOrders[i]; const b = atWork('d'+o.x+','+o.y); o.progress += b*ws*dt; if (o.progress >= o.need){ dig(s, o.x, o.y); s.nest.digOrders.splice(i,1); } }
  }
}
function finishRoom(s, job){
  const c = s.colony; carveRoom(s, job, job.room);
  if (job.room === 'hatchery') c.hatchCap += 2;
  if (job.room === 'store') c.cap = 150;
  if (job.room === 'cistern') c.waterCap = 60;
  if (job.room === 'nursery') c.hatchMul = 0.7;
}
function hatch(s, c, caste){
  const a = mkAnt(s, caste, 'in', c.ex, c.ey, c.team);
  if (!c.team){ const r = s.queen.room; a.nx = r.x0+1.5; a.ny = r.y0+1.5; a.ntx = r.x0+1; a.nty = r.y0+1; a.rest = 2;
    if (s.player.pending){ a.isPlayer = true; a.hp = 12; a.state = 'nest'; s.player.ant = a; s.player.pending = false; s.player.hunger = 100; s.player.inNest = true; s.player.tx = null; s.player.ntx = null; s.player.msg = ''; } }
}
function enterNest(s, a){
  a.state = 'in'; a.rest = 3 + Math.random()*8; a.explore = 0; a.goal = null;
  if (!a.team){ a.nx = SHAFT; a.ny = 0; a.ntx = SHAFT; a.nty = 0; }
}
function exitNest(s, a, state){
  const col = colonyOf(s, a); a.tx = col.ex; a.ty = col.ey; a.x = (col.ex+0.5)*T; a.y = (col.ey+0.5)*T;
  const ang = Math.random()*Math.PI*2; a.dx = Math.cos(ang); a.dy = Math.sin(ang); a.state = state; a.explore = 0; a.goal = null;
  if (state === 'fight'){ chooseToward(s, a, s.spider ? s.spider.x : a.x, s.spider ? s.spider.y : a.y); }
  else if (state === 'raid'){ chooseToward(s, a, (s.colony.ex+0.5)*T, (s.colony.ey+0.5)*T); }
  else chooseExplore(s, a, state==='patrol' ? 9 : 0);
}
function roomTarget(s, a){
  const key = a.caste==='soldier'||a.caste==='venom' ? 'barracks' : a.caste==='nurse' ? (roomOf(s,'nursery')?'nursery':'hatchery') : a.caste==='forager' ? 'store' : 'queen';
  let r = roomOf(s, key) || s.queen.room; if (!r) return [SHAFT, 0];
  return [r.x0 + Math.floor(Math.random()*(r.w||4)), r.y0 + Math.floor(Math.random()*(r.h||3))];
}
function tickInside(s, a, dt){
  const col = colonyOf(s, a), C = CASTES[a.caste];
  if (a.team){ // rival: abstract
    a.rest -= dt; if (a.rest > 0) return;
    const hunger = Math.max(0, 1 - col.store/col.cap);
    if (C.fight >= 3){ if (s.alarm[idx(col.ex,col.ey)] > 0.2) exitNest(s, a, 'fight'); else if (Math.random() < 0.2) exitNest(s, a, 'patrol'); else a.rest = 3; }
    else { if (0.3 + hunger*0.9 > a.thr.f) exitNest(s, a, 'explore'); else a.rest = 2; }
    return;
  }
  if (a.state === 'nest') return; // player inside: handled in stepPlayer
  const c = col; const q = s.queen;
  if (!q.placed){ a.rest = 1; return; }
  // decide job: builders claim one task and keep it until it is finished
  if (a.caste === 'builder'){
    if (!builderTaskValid(s, a)) pickBuilderTask(s, a);
    if (a.task){ a.state = 'build'; a.ntx = a.taskCell[0]; a.nty = a.taskCell[1]; }
    else if (a.state === 'build'){ a.state = 'in'; a.goal = null; }
  }
  if (a.state === 'in' && a.goal == null){ const [tx,ty] = roomTarget(s, a); a.ntx = tx; a.nty = ty; a.goal = 'idle'; }
  // walk inside; work only counts once the builder stands on its own cell
  const arrived = nestStep(s, a, C.speed*0.8, dt);
  a.atWork = a.state === 'build' && arrived && Math.floor(a.nx) === a.ntx && Math.floor(a.ny) === a.nty;
  if (a.state !== 'in') return;
  if (!arrived || a.goal === 'exit') return;
  a.rest -= dt; if (a.rest > 0) return;
  // leave?
  const hunger = Math.max(0, 1 - c.store/c.cap);
  let go = null;
  if (C.fight >= 3){ const stim = 0.35 + Math.min(1, s.alarm[idx(c.ex,c.ey)] + nearAlarm(s)); if (stim > a.thr.d) go = 'fight'; else if (Math.random() < 0.15) go = 'patrol'; }
  else if (a.caste === 'nurse'){ if (Math.random() < 0.05 && c.water < c.waterCap*0.5) go = 'explore'; }
  else { const stim = 0.3 + hunger*0.9 + (c.water < c.waterCap*0.4 ? 0.3 : 0); if (stim > a.thr.f && s.alarm[idx(c.ex,c.ey)] < 0.5) go = 'explore'; }
  if (go){ a.goal = 'exit'; a.ntx = SHAFT; a.nty = 0; a.state = 'in'; a.rest = 0;
    // walk to exit over following ticks; mark pending
    a.exitTo = go; }
  else a.rest = 2 + Math.random()*3;
}
// ---------- builder tasks ----------
// One builder per dig, fill or repair order, up to three on a room. A dig
// can only be worked from a dug neighbour, so chained orders wait their turn.
const ROOM_CREW = 3;
function reachable(s, x, y){ return nestField(s, x, y)[nidx(SHAFT,0)] < 9999; }
function taskSpot(s, a, task){
  const k = task[0];
  if (k === 'j'){
    const job = s.colony.buildQueue[0]; if (!job) return null;
    // Spread the crew along the room's floor.
    const crew = s.ants.filter(b => b !== a && b.task === 'j').length;
    const x = job.x0 + Math.min(job.w-1, 1 + crew*2 % job.w), y = job.y0 + job.h - 1;
    return s.nest.cells[nidx(x,y)] && reachable(s, x, y) ? [x, y] : (reachable(s, job.x, job.y) ? [job.x, job.y] : null);
  }
  const [x, y] = task.slice(1).split(',').map(Number);
  if (k === 'f') return s.nest.cells[nidx(x,y)] && reachable(s, x, y) ? (isDugNeighbor(s, x, y) || [x, y]) : null;
  const adj = isDugNeighbor(s, x, y); // dig or repair: stand on a dug cell next to it
  return adj && reachable(s, adj[0], adj[1]) ? adj : null;
}
function taskExists(s, task){
  const k = task[0]; if (k === 'j') return s.colony.buildQueue.length > 0;
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
  const dig = best(s.nest.digOrders, 'd', 'dig');
  const pick = best(s.repairs, 'r', 'repair')
    || (room && (!dig || a.id % 2 === 1) ? room : null)
    || dig || best(s.nest.fillOrders, 'f', 'fill') || room;
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
  if (!r.on && r.t >= r.next){ r.on = true; r.t = 0; r.next = 200 + Math.random()*120; s.events.push('rain'); note(s, 'Rain. Trails wash out, foragers head home.' + (buildersInside(s) ? ' Your builders are holding the drains.' : ' With no builder inside, the lowest level will cave in.')); }
  else if (r.on){
    if (roomSlotIndex(s, 'cistern') >= 0) s.colony.water = Math.min(s.colony.waterCap, s.colony.water + 0.4*dt);
    if (r.t >= 30){ r.on = false; r.t = 0; if (!buildersInside(s) && s.queen.placed){ collapse(s, true); collapse(s, true); note(s, 'The rain caved in part of the lowest level. Builders repair cave-ins on their own.'); } }
  }
}
function buildersInside(s){ return s.ants.filter(a => a.caste==='builder' && a.team===0 && (a.state==='in' || a.state==='build')).length; }
function tickMaintenance(s, dt){
  const c = s.colony; if (!s.queen.placed || s.t < 240) return;
  c.wearT = (c.wearT || 0) + dt; if (c.wearT < 1) return; c.wearT = 0;
  const need = Math.ceil(dugCount(s)/40), b = buildersInside(s);
  if (b < need && Math.random() < 0.0045 * (need - b)) { if (collapse(s, false)) note(s, 'A tunnel caved in. Every 40 dug cells need a builder inside to keep them shored up.'); }
  for (let i=s.repairs.length-1;i>=0;i--){ const rep = s.repairs[i]; const n = s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.atWork && a.task === 'r'+rep.x+','+rep.y).length; rep.progress += n; if (rep.progress >= 8){ dig(s, rep.x, rep.y); s.repairs.splice(i,1); } }
}
function collapse(s, lowest){
  const n = s.nest; const cands = []; let maxy = 0;
  for (let y=1;y<NH;y++) for (let x=1;x<NW-1;x++) if (n.cells[nidx(x,y)] === 1) maxy = Math.max(maxy, y);
  for (let y=2;y<NH;y++) for (let x=1;x<NW-1;x++){ if (n.cells[nidx(x,y)] !== 1) continue; if (lowest && y < maxy-2) continue; if (s.repairs.some(r => r.x===x && r.y===y)) continue; const adj = isDugNeighbor(s, x, y); if (!adj) continue; cands.push([x,y,adj]); }
  if (!cands.length) return false; const [x,y,adj] = cands[Math.floor(Math.random()*cands.length)];
  n.cells[nidx(x,y)] = 0; n.ver++; s.repairs.push({ x, y, ax: adj[0], ay: adj[1], progress: 0 }); s.events.push('cavein'); return true;
}
function playerDig(s, cx, cy){
  const a = s.player.ant; if (!a || !s.player.inNest) return false; const px = Math.floor(a.nx), py = Math.floor(a.ny);
  if (Math.abs(cx-px) + Math.abs(cy-py) !== 1) return false; const i = s.repairs.findIndex(r => r.x===cx && r.y===cy); if (i < 0) return false;
  dig(s, cx, cy); s.repairs.splice(i, 1); return true;
}
function nearAlarm(s){ const w = s.world; let m = 0; for (let dy=-3;dy<=3;dy++) for (let dx=-3;dx<=3;dx++){ const x=w.ex+dx,y=w.ey+dy; if (x<0||y<0||x>=W||y>=H) continue; m = Math.max(m, s.alarm[idx(x,y)]); } return m; }

function rivalBrain(s, dt){
  const r = s.rival; if (!r.queenAlive) return;
  r.raidT += dt; if (r.raidT < 10) return; r.raidT = 0;
  const mine = s.ants.filter(a => a.team===1 && a.state!=='dead'); const foragers = mine.filter(a => a.caste==='forager').length, soldiers = mine.filter(a => a.caste==='soldier');
  // grow
  if (r.store >= 10 && r.eggQueue.length < 2 && mine.length < Math.min(60, 12 + s.t/30)){ r.eggQueue.push(soldiers.length < foragers/2 ? 'soldier' : 'forager'); r.store -= 4; }
  // raid when strong, not before 5 minutes, at most every 2 minutes
  r.raidCd = (r.raidCd || 0) - 10;
  const ourSoldiers = s.ants.filter(a => a.team===0 && CASTES[a.caste].fight >= 3).length;
  const idle = soldiers.filter(a => a.state==='in' || a.state==='patrol');
  // Raids start at six minutes and grow: 3 soldiers, then one more every 2.5 minutes.
  const size = Math.min(14, 3 + Math.floor(Math.max(0, s.t - 360)/150));
  if (s.t > 360 && r.raidCd <= 0 && idle.length >= size && s.queen.placed && !s.lost){ r.raidCd = Math.max(90, 160 - s.t/30); let n = 0; for (const a of idle){ if (n++ >= size) break; if (a.state==='in') exitNest(s, a, 'raid'); else a.state = 'raid'; } s.player.msg = `A rival raid of ${size} is marching on your nest from the Patio.`; s.events.push('raid'); }
}

// The spider roams the whole yard: landmark to landmark, past our nest every
// few legs, and now and then off the edge into the next area for a while.
const SPIDER_REACH = 1.1*T, CAT_REACH = 1.8*T;
// For the first four minutes it keeps well away, so the opening is safe to learn.
const spiderNearNest = (s, x, y) => Math.hypot(x/T - (s.world.ex+0.5), y/T - (s.world.ey+0.5)) < (s.t < 240 ? 12 : 6) || Math.hypot(x/T - (s.world.rx+0.5), y/T - (s.world.ry+0.5)) < 4;
// Plan a walk to (px, py) around rocks and clear of the nests; rest there.
function spiderRoute(s, sp, px, py, rest){
  const avoid = (x, y) => spiderNearNest(s, (x+0.5)*T, (y+0.5)*T);
  const path = findPath(s, Math.floor(sp.x/T), Math.floor(sp.y/T), Math.floor(px/T), Math.floor(py/T), avoid);
  for (const [x, y] of path) sp.route.push([(x+0.5)*T, (y+0.5)*T]);
  if (rest && sp.route.length) sp.route[sp.route.length-1][2] = rest;
}
function spiderPlan(s, sp){
  const w = s.world; sp.legs = (sp.legs||0) + 1; sp.route = [];
  sp.passing = false;
  if (sp.legs % 3 === 0 && s.t >= 240){ // stroll past the nest along an arc 7.5 tiles out, not hunting
    const a0 = Math.random()*Math.PI*2, dir = Math.random() < 0.5 ? 1 : -1;
    const a = a0; spiderRoute(s, sp, (w.ex+0.5+Math.cos(a)*7.5)*T, (w.ey+0.5+Math.sin(a)*7.5)*T);
    const pts = []; for (let k=1;k<5;k++){ const t = a0 + dir*k*0.5; pts.push([(w.ex+0.5+Math.cos(t)*7.5)*T, (w.ey+0.5+Math.sin(t)*7.5)*T]); }
    sp.route.push(...pts.filter(([x, y]) => walk(s, Math.floor(x/T), Math.floor(y/T)))); sp.passing = true; return;
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
    // Somewhere 15–70 tiles away, inside the yard.
    const ang = Math.random()*Math.PI*2, dd = 15 + Math.random()*55;
    const x = Math.floor(sp.x/T + Math.cos(ang)*dd), y = Math.floor(sp.y/T + Math.sin(ang)*dd);
    if (x < 3 || y < 3 || x >= W-3 || y >= H-3) continue;
    if (w.blocked[idx(x,y)] || w.home[idx(x,y)] < (s.t < 240 ? 14 : 7) || w.rhome[idx(x,y)] < 5) continue;
    if (Math.hypot((x+0.5)*T - sp.x, (y+0.5)*T - sp.y) < 15*T || Math.hypot((x+0.5)*T - sp.x, (y+0.5)*T - sp.y) > 70*T) continue;
    spiderRoute(s, sp, (x+0.5)*T, (y+0.5)*T); return;
  }
}
// Walk in from a random edge with the hp it left with.
function spiderEnter(s, hp){
  const side = [0, 1, 3][Math.floor(Math.random()*3)],  // never through the house wall
    u = 0.2 + Math.random()*0.6;
  const out = side===0 ? [-2, u*H] : side===1 ? [W+2, u*H] : side===2 ? [u*W, -2] : [u*W, H+2];
  const inn = side===0 ? [5, u*H] : side===1 ? [W-5, u*H] : side===2 ? [u*W, 5] : [u*W, H-5];
  s.spider = { x: out[0]*T, y: out[1]*T, hp, maxHp: 150, bite: 0, legs: 0, route: [[inn[0]*T, inn[1]*T]], entering: true, stuck: 0 };
  if (!s.player.msg) s.player.msg = 'The spider is back, walking in from the edge of the yard.';
}
function stepSpider(s, dt){
  const sp = s.spider; if (!sp) return;
  const free = sp.leaving || sp.entering;
  // Passing the nest it only strikes at ants that walk right into it.
  // Resting at its web it waits in ambush and only strikes close.
  if (sp.rest > 0) sp.rest -= dt;
  let target = null, bd = sp.passing || sp.rest > 0 ? 1.5*T : 3*T;
  // Ants on the nest's doorstep are out of bounds, so it never camps the entrance.
  if (!free) for (const a of s.ants){ if (a.state==='dead'||a.state==='in'||a.state==='build'||a.state==='nest') continue; if (spiderNearNest(s, a.x, a.y)) continue; const d = Math.hypot(a.x-sp.x, a.y-sp.y); if (d < bd){ bd = d; target = a; } }
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
  const speed = (target ? 30 : 16)*SURF; const ddx = gx - sp.x, ddy = gy - sp.y; if (Math.hypot(ddx, ddy) < 1) return;
  const base = Math.atan2(ddy, ddx);
  // Steer around rocks: straight, then increasingly wide detours.
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]){
    const nx = sp.x + Math.cos(base+off)*speed*dt, ny = sp.y + Math.sin(base+off)*speed*dt;
    const tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    // The fence is two tiles deep; a spider coming or going climbs over it.
    const inside = tx>1 && ty>0 && tx<W-2 && ty<H-2;
    if (inside ? s.world.blocked[idx(tx,ty)] : !free) continue;
    if (spiderNearNest(s, nx, ny)) continue;
    sp.x = nx; sp.y = ny; sp.stuck = 0; return;
  }
  sp.stuck = (sp.stuck||0) + dt;
  if (sp.stuck > 2 && !target){ sp.route.shift(); sp.stuck = 0; sp.legT = 0; }
}
function stepCat(s, dt){
  const ct = s.cat; if (!ct) return; ct.wander -= dt; if (ct.wander <= 0){ ct.wander = 4 + Math.random()*4; const ang = Math.random()*Math.PI*2; ct.gx = ct.x + Math.cos(ang)*3*T; ct.gy = ct.y + Math.sin(ang)*3*T; }
  let ddx = ct.gx - ct.x, ddy = ct.gy - ct.y; const d = Math.hypot(ddx, ddy);
  if (d > 1){ ddx/=d; ddy/=d; const nx = ct.x + ddx*8*SURF*dt, ny = ct.y + ddy*8*SURF*dt; if (walk(s, Math.floor(nx/T), Math.floor(ny/T))){ ct.x = nx; ct.y = ny; } else ct.wander = 0; }
  // attacked by soldiers/venom on patrol/fight nearby
  for (const a of s.ants){ if (a.team || a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; if (CASTES[a.caste].fight < 3 && !a.follow && !a.isPlayer) continue; const dd = Math.hypot(a.x-ct.x, a.y-ct.y); if (dd < CAT_REACH){ ct.hp -= CASTES[a.caste].fight*dt*0.5; } else if (dd < 5*T && CASTES[a.caste].fight >= 3 && a.state === 'patrol'){ a.state = 'fight'; a.goal = 'cat'; chooseToward(s, a, ct.x, ct.y); } }
  // fight-state soldiers targeting cat
  for (const a of s.ants){ if (a.goal === 'cat' && a.state === 'fight'){ if (Math.hypot(a.x-ct.x, a.y-ct.y) > CAT_REACH*0.8){ if (stepTo(a, a.tx, a.ty, CASTES[a.caste].speed, dt)) chooseToward(s, a, ct.x, ct.y); } } }
}

function stepPlayer(s, a, dt, enemiesNear){
  const P = s.player, w = s.world, C = CASTES[a.caste];
  if (P.inNest){
    // walk inside the nest
    if (P.ntx != null){ a.ntx = P.ntx; a.nty = P.nty; }
    const arrived = nestStep(s, a, 85, dt);
    if (arrived && P.ntx != null && Math.floor(a.nx) === SHAFT && Math.floor(a.ny) === 0 && P.exiting){ P.exiting = false; P.ntx = null; P.inNest = false; a.tx = w.ex; a.ty = w.ey; a.x = (w.ex+0.5)*T; a.y = (w.ey+0.5)*T; a.state = 'player'; P.tx = null; return; }
    if (arrived) P.ntx = null;
    P.hunger = Math.min(100, P.hunger + 10*dt);
    return;
  }
  let moving = false;
  // Lifting a treat: the crew sets the pace, and too small a crew drops it.
  let speed = 85*SURF;
  if (P.big){ const crew = crewAt(s), need = FOODS[P.big.type].crew;
    if (crew < need){ dropBig(s); P.msg = `Too heavy for ${crew}. It takes a crew of ${need}: Recruit more, then Lift again.`; }
    else speed = Math.min(70, 30 + 6*(crew - need))*SURF; }
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
  P.hunger -= (moving ? 1.3 : 0.3)*dt;
  const nearHome = Math.hypot(a.tx - w.ex, a.ty - w.ey) < 1.6;
  let fed = nearHome; if (!fed) for (const o of s.ants){ if (o !== a && !o.team && o.state === 'return' && o.carry && o.kind==='food' && Math.hypot(o.x-a.x, o.y-a.y) < 1.2*T){ fed = true; break; } }
  if (fed && P.hunger < 100) P.hunger = Math.min(100, P.hunger + 20*dt);
  if (P.hunger <= 0){ killAnt(s, a, 'hunger'); return; }
  if (moving && (P.mark || a.carry)){ const i = idx(a.tx, a.ty); s.trail[i] = Math.min(5, s.trail[i] + 2.5*dt); s.hot.add(i); }
  if (a.carry && nearHome){ deposit(s, a); }
  if (P.big && nearHome) deliverBig(s);
  // fight: player bites enemies / cat adjacent
  const en = enemiesNear(a, 1); if (en.length){ en[0].hp -= C.fight*2*dt; if (en[0].hp <= 0) killAnt(s, en[0], 'war'); } else if (a.hp < 12) a.hp = Math.min(12, a.hp + 1*dt);
  if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < CAT_REACH) s.cat.hp -= C.fight*dt;
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
    else P.msg = `Too heavy: ${crew} of ${need}. Hold Recruit near the nest or other ants, bring them here, then Lift.`;
    return; }
  if (f){ const take = Math.min(5, f.amt); f.amt -= take; a.carry = take; a.kind = f.kind; a.itype = f.type; }
}
// You plus every recruited ant within three tiles.
function crewAt(s){ const a = s.player.ant; if (!a) return 0; let n = 1; for (const o of s.ants) if (o.follow && o.state !== 'dead' && Math.hypot(o.x-a.x, o.y-a.y) < 3*T) n++; return n; }
function dropBig(s){ const b = s.player.big; if (!b) return; b.carried = false; delete b.px; delete b.py; s.player.big = null; }
function deliverBig(s){
  const P = s.player, b = P.big, c = s.colony; P.big = null; b.carried = false;
  const put = Math.min(Math.max(0, c.cap - c.store), b.amt), lost = b.amt - put; c.store += put; c.delivered[0] += put; b.amt = 0;
  P.msg = lost > 0 ? `${put} food stored, ${lost} wasted: the store was full. A Food store holds 150.` : `Your crew hauls in the ${FOODS[b.type].name}: +${put} food.`;
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
  if (m.state === 'idle'){ if (s.t >= m.next){ m.state = 'warn'; m.t = 0; s.events.push('mower'); P.msg = 'An engine starts up past the Lawn. The mower is coming: get out of the grass!'; } return; }
  if (m.state === 'warn'){ if (m.t >= 8){ m.state = 'cut'; m.t = 0; m.y = L.y0; } return; }
  m.y += 4*dt;
  const half = 1.5*SCALE, y0 = m.y - half, y1 = m.y + half;
  for (let y = Math.max(L.y0, Math.floor(y0)); y <= Math.min(H-1, Math.floor(y1)); y++) for (let x = L.x0; x < L.x0 + L.w; x++) s.trail[idx(x,y)] = 0;
  const inBlade = (px, py) => px/T >= L.x0 && px/T < L.x0 + L.w && py/T >= y0 && py/T <= y1;
  for (const a of s.ants){ if (a.state==='dead'||a.state==='in'||a.state==='build'||a.state==='nest') continue; if (inBlade(a.x, a.y)) killAnt(s, a, 'mower'); }
  for (const f of s.items) if (!f.max && !f.carried && inBlade((f.x+0.5)*T, (f.y+0.5)*T)) f.amt = 0;
  if (s.cat && inBlade(s.cat.x, s.cat.y)) s.cat.hp = 0;
  if (m.y >= L.y0 + L.h){ m.state = 'idle'; m.next = s.t + 240 + Math.random()*120; }
}
// Antlion pits in the Sandbox: the rim slides ants toward the bottom, where
// the antlion bites.
function tickPits(s, dt){
  const w = s.world; if (!w.pits.length) return;
  for (const a of s.ants){ if (a.state==='dead'||a.state==='in'||a.state==='build'||a.state==='nest') continue;
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
  foot:  { warn: 2.2, hold: 1.2, lift: 0.8, a: 9, b: 3.4, cause: 'foot', msg: 'A shadow falls over you. Something is coming down: get out from under it!', ev: 'feet' },
  acorn: { warn: 1.6, hold: 0.3, lift: 0.1, a: 2.4, b: 2.4, cause: 'acorn', msg: 'Something is falling out of the Oak! Get out from under the shadow.', ev: 'acorn' },
  spray: { warn: 2.0, hold: 2.2, lift: 0.6, a: 6, b: 6, cause: 'spray', msg: 'A hiss from the shed: bug spray! Get out of the cloud.', ev: 'spray' },
};
const HUNT = {
  bird: { land: 1.4, peck: 1.3, pecks: 4, leave: 1.2, reach: 1.6, hop: 2.5, sight: 12, scare: 5, cause: 'bird', name: 'robin', msg: 'A robin drops out of the sky to hunt. Run, or bring five soldiers to chase it off.', ev: 'bird' },
  toad: { land: 1.0, peck: 1.7, pecks: 5, leave: 1.0, reach: 5, hop: 1.2, sight: 10, scare: 5, cause: 'toad', name: 'toad', msg: 'A toad! Its tongue reaches five tiles. Keep away, or bring five fighters.', ev: 'toad' },
};
const FOOT = DROP.foot, BIRD = HUNT.bird;
const outside = a => a.state !== 'dead' && a.state !== 'in' && a.state !== 'build' && a.state !== 'nest';
// Inside a drop's print (x, y in tiles), scaled by k.
const underFoot = (st, x, y, k) => { const D = DROP[st.kind], dx = x - st.x, dy = y - st.y, c = Math.cos(st.yaw), n = Math.sin(st.yaw), u = (dx*c + dy*n)/(D.a*k), v = (-dx*n + dy*c)/(D.b*k); return u*u + v*v <= 1; };
function tickStrikes(s, dt){
  if (!s.queen.placed) return;
  const w = s.world, P = s.player, pa = P.ant && !P.inNest ? P.ant : null;
  const out = new Map();
  for (const a of s.ants){ if (!outside(a)) continue; const r = w.area[idx(a.tx,a.ty)]; if (!out.has(r)) out.set(r, []); out.get(r).push(a); }
  // New visitors: each region's clock only runs while ants are about.
  for (let i=0;i<AREAS.length;i++){ const st = AREAS[i].strike; if (!st || !s.active[i] || s.strikes.some(k => k.region === i)) continue;
    const here = out.get(i); if (!here) continue;
    s.strikeT[i] -= dt; if (s.strikeT[i] > 0) continue;
    s.strikeT[i] = st.every[0] + Math.random()*(st.every[1] - st.every[0]);
    const t = here[Math.floor(Math.random()*here.length)], b = areaBounds(i);
    const x = Math.max(b.x0 + 3, Math.min(b.x1 - 3, t.x/T + (Math.random()-0.5)*4)), y = Math.max(b.y0 + 3, Math.min(b.y1 - 3, t.y/T + (Math.random()-0.5)*4));
    s.strikes.push({ kind: st.kind, region: i, x, y, yaw: Math.random()*Math.PI*2, t: 0, phase: DROP[st.kind] ? 'warn' : 'land', pecks: 0, next: 0 });
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
          if (s.cat && underFoot(st, s.cat.x/T, s.cat.y/T, 1)) s.cat.hp = 0;
          if (s.spider && underFoot(st, s.spider.x/T, s.spider.y/T, 1)) s.spider.hp -= 60;
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
    let guards = 0; for (const a of s.ants) if (outside(a) && !a.team && (CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer) && Math.hypot(a.x/T - st.x, a.y/T - st.y) < 5) guards++;
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
  for (const z of w.stings) for (const a of s.ants){
    if (!outside(a) || a.team) continue;
    const d = Math.hypot(a.x/T - z.x, a.y/T - z.y); if (d > z.r) continue;
    a.hp -= z.power * k * (a.isPlayer ? 0.6 : 1);
    if (!a.isPlayer){ a.flee = Math.max(a.flee, 1); a.fleeFrom = { x: z.x*T, y: z.y*T }; }
    else if (!s.stungWarned){ s.stungWarned = true; s.events.push('fireants'); s.player.msg = 'Fire ants! They sting anything on their ground. Keep moving, and keep out of the mound\'s red earth.'; }
    if (a.hp <= 0) killAnt(s, a, 'fireants');
  }
}
function recruit(s, n){
  const a = s.player.ant; if (!a || s.player.inNest) return 0; const w = s.world; let got = 0;
  const nearHome = Math.hypot(a.tx - w.ex, a.ty - w.ey) < 3.5;
  const cands = s.ants.filter(o => !o.isPlayer && !o.team && o.state !== 'dead' && !o.follow && (
    ((o.state==='explore' || o.state==='patrol' || (o.state==='return' && !o.carry)) && Math.hypot(o.x-a.x, o.y-a.y) < 7*T) || (nearHome && o.state === 'in' && o.goal !== 'job')));
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
  if (c.eggQueue.length >= 10) return false;
  if (!payCost(c, C.cost)) return false; c.eggQueue.push(caste); return true;
}
function eggLock(s, caste){ const c = s.colony; if (caste==='soldier' && roomSlotIndex(s,'barracks')<0) return 'needs Barracks'; if (caste==='nurse' && roomSlotIndex(s,'nursery')<0) return 'needs Nursery'; if (caste==='venom' && !c.trophies.spider) return 'needs spider fang'; return ''; }
function queueRoom(s, room, cell){
  const c = s.colony, R = ROOMS[room]; if (!R || !s.queen.placed || !cell) return false;
  if (roomOf(s, room) || c.buildQueue.some(j=>j.room===room)) return false;
  const rect = findRoomRect(s, cell[0], cell[1], R.w, R.h); if (!rect) return false;
  if (!payCost(c, R.cost)) return false;
  c.buildQueue.push({ room, x0: rect.x0, y0: rect.y0, w: R.w, h: R.h, progress: 0, x: rect.x0+1, y: rect.y0+1 }); return true;
}
function upgradeQueen(s){ const q = s.queen, c = s.colony; const cost = QUEEN_UP[q.level]; if (!cost || !payCost(c, cost)) return false; q.level++; return true; }
function antCount(s){ return s.ants.filter(a => !a.team).length; }
function roomStateAt(s, x, y){ const r = roomAt(s, x, y); if (r) return { kind:'room', room: r }; const j = s.colony.buildQueue.find(j => x >= j.x0 && x < j.x0+j.w && y >= j.y0 && y < j.y0+j.h); if (j) return { kind:'job', job: j }; return { kind:'none' }; }
function stress(s, n){ for (let i=0;i<n;i++){ const a = mkAnt(s, 'forager', 'in', s.world.ex, s.world.ey, 0); exitNest(s, a, 'explore'); } }
function stats(s){
  const c = s.colony; let inside = 0, out = 0, rival = 0; const byCaste = {};
  for (const a of s.ants){ if (a.isPlayer) continue; if (a.team){ rival++; continue; } byCaste[a.caste] = (byCaste[a.caste]||0)+1; if (a.state==='in'||a.state==='build') inside++; else out++; }
  return { inside, out, rival, byCaste, income: c.delivered.reduce((x,y)=>x+y,0), upkeep: c.eaten.reduce((x,y)=>x+y,0), followers: s.ants.filter(a=>a.follow).length };
}
// ---------- save / load ----------
function serialize(s){
  return JSON.stringify({ v: 10, active: s.active, seed: s.seed, t: s.t, lost: s.lost, mower: s.mower, areaT: s.areaT, strikeT: s.strikeT, colony: s.colony, rival: s.rival, items: s.items, spider: s.spider, spiderRespawn: s.spiderRespawn, spiderAway: s.spiderAway, cat: s.cat, catRespawn: s.catRespawn,
    nest: { cells: Array.from(s.nest.cells), rooms: s.nest.rooms, digOrders: s.nest.digOrders, fillOrders: s.nest.fillOrders }, queen: s.queen, phase: s.phase, won: s.won, dew: s.dew, dewTimer: s.dewTimer, rain: s.rain, repairs: s.repairs, seen: s.seen,
    ants: s.ants.map(a => ({ id:a.id, caste:a.caste, state:a.state, team:a.team, tx:a.tx, ty:a.ty, x:a.x, y:a.y, carry:a.carry, kind:a.kind, itype:a.itype, hp:a.hp, thr:a.thr, isPlayer:a.isPlayer, follow:a.follow, nx:a.nx, ny:a.ny, ntx:a.ntx, nty:a.nty, goal:a.goal })),
    player: { hunger: s.player.hunger, mark: s.player.mark, pending: s.player.pending, msg: s.player.msg, inNest: s.player.inNest }, nextId: s.nextId,
    seen: Array.from(s.seenMap).join(''),
    trail: [...s.hot].filter(i => s.trail[i] > 0.04).flatMap(i => [i, Math.round(s.trail[i]*100)/100]) });
}
function deserialize(json){
  const d = JSON.parse(json); if (d.v !== 10) throw new Error('old save'); const s = create(d.seed);
  s.t = d.t; s.colony = d.colony; s.rival = d.rival; s.items = d.items; s.spider = d.spider; s.spiderRespawn = d.spiderRespawn; s.spiderAway = d.spiderAway || null; s.cat = d.cat; s.catRespawn = d.catRespawn; s.nextId = d.nextId;
  s.nest.cells.set(d.nest.cells); s.nest.rooms = d.nest.rooms || []; s.nest.digOrders = d.nest.digOrders || []; s.nest.fillOrders = d.nest.fillOrders || []; s.nest.ver++; s.queen = d.queen; s.phase = d.phase; s.won = d.won; s.dew = d.dew; s.dewTimer = d.dewTimer; s.rain = d.rain || s.rain; s.repairs = d.repairs || []; s.seen = d.seen || {};
  s.ants = d.ants.map(a => Object.assign({ dx:0, dy:-1, rest:0, explore:0, flee:0, exitTo:null }, a));
  s.player.ant = s.ants.find(a => a.isPlayer) || null; Object.assign(s.player, d.player);
  s.lost = !!d.lost; if (d.mower) s.mower = d.mower; if (d.areaT) s.areaT = d.areaT; if (d.strikeT) s.strikeT = d.strikeT; s.player.big = s.player.ant && s.items.find(f => f.carried) || null;
  if (d.active) s.active = d.active;
  if (d.seen && d.seen.length === s.seenMap.length) for (let i=0;i<d.seen.length;i++) s.seenMap[i] = d.seen.charCodeAt(i) === 49 ? 1 : 0;
  if (d.trail) for (let k=0;k<d.trail.length;k+=2){ s.trail[d.trail[k]] = d.trail[k+1]; s.hot.add(d.trail[k]); }
  return s;
}
return { W, H, T, NW, NH, SHAFT, AREAS, AREA, SCALE, SURF, REGION, FOOT, BIRD, DROP, HUNT, SEE, areaBounds, CASTES, ROOMS, FOODS, areaOf, findPath, crewAt, ROOM_KEYS, SOIL, SOIL_ROWS, SOIL_TOP, soilTier, QUEEN_UP, queenCap, create, tick, playerDig, buildersInside, actionLabel, doAction, recruit, release, queueEgg, eggLock, queueRoom, roomStateAt, roomAt, roomOf, findRoomRect, freePocket, toggleDigOrder, toggleFillOrder, removeRoom, digAllowed, upgradeQueen, antCount, dugCount, queenDig, buildNest, stress, stats, serialize, deserialize, itemAt, nidx, canPay, costText };
})();
export default SIM;
export { SIM };
