// ===== Underfoot — simulation v2 (no DOM) =====
const SIM = (() => {
const W = 48, H = 64, T = 16;            // surface tiles
const NW = 24, NH = 40, SHAFT = 12;       // nest cutaway cells
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
const SOIL = [ {name:'soft', work:4}, {name:'packed', work:8}, {name:'clay', work:14} ];
const soilTier = y => y < 14 ? 0 : y < 28 ? 1 : 2;
const QUEEN_UP = [ {food:40, protein:10}, {food:80, protein:20, grit:20}, {food:150, protein:40, grit:40} ];
const queenCap = lvl => 20 + 20*lvl;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const idx = (x,y) => y*W + x;
const nidx = (x,y) => y*NW + x;

// ---------- surface world ----------
function makeWorld(seed){
  const rnd = mulberry32(seed);
  const blocked = new Uint8Array(W*H);
  const ex = 24, ey = 44;
  for (let x=0;x<W;x++){ blocked[idx(x,0)]=1; blocked[idx(x,H-1)]=1; }
  for (let y=0;y<H;y++){ blocked[idx(0,y)]=1; blocked[idx(W-1,y)]=1; }
  for (let i=0;i<34;i++){
    const cx = 2+Math.floor(rnd()*(W-4)), cy = 2+Math.floor(rnd()*(H-4));
    if (Math.hypot(cx-ex, cy-ey) < 5 || Math.hypot(cx-24, cy-12) < 5) continue;
    const rw = 1+Math.floor(rnd()*3), rh = 1+Math.floor(rnd()*3);
    for (let y=cy;y<Math.min(H-1,cy+rh);y++) for (let x=cx;x<Math.min(W-1,cx+rw);x++) blocked[idx(x,y)]=1;
  }
  const home = bfs(blocked, ex, ey);
  for (let i=0;i<W*H;i++) if (home[i] >= 9999) blocked[i]=1;
  const rx = 24, ry = 12; const rhome = bfs(blocked, rx, ry);
  return { blocked, home, rhome, ex, ey, rx, ry, rnd };
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
  return { team, ex, ey, store: 20, cap: 20, water: 8, waterCap: 10, protein: 0, grit: 0,
    hatchCap: 1, hatchMul: 1, buildQueue: [], eggQueue: [], eggs: [],
    trophies: {spider:false}, starve: 0, deaths: {}, kills: {}, delivered: new Array(60).fill(0), eaten: new Array(60).fill(0), secAcc: 0,
    queenAlive: true, founded: team !== 0, raidT: 0, siege: 0, stolen: 0 };
}
function create(seed){
  const w = makeWorld(seed || 7);
  const s = {
    t: 0, seed: seed || 7, world: w, nest: makeNest(),
    trail: new Float32Array(W*H), alarm: new Float32Array(W*H),
    ants: [], nextId: 1, items: [],
    spider: null, spiderRespawn: 50, cat: null, catRespawn: 20,
    colony: newColony(w.ex, w.ey, 0), rival: newColony(w.rx, w.ry, 1),
    player: { ant: null, hunger: 100, tx: null, ty: null, holding: false, mark: false, pending: false, msg: '', inNest: true, ntx: null, nty: null },
    queen: { x: SHAFT, y: 0, energy: 30, placed: false, level: 0, room: null },
    phase: 'dig', itemTimer: 0, dewTimer: 0, dew: false, won: false,
    rain: { t: 0, on: false, next: 240 }, repairs: [], seen: {}, events: [],
  };
  s.rival.store = 20; s.rival.cap = 120; s.rival.water = 999; s.rival.waterCap = 999; s.rival.hatchCap = 2; s.rival.raidCd = 0;
  for (let i=0;i<9;i++) spawnItem(s, 'food', 'crumb');
  for (let i=0;i<3;i++) spawnItem(s, 'food', 'seed');
  for (let i=0;i<6;i++) spawnItem(s, 'food', 'crumb', null, true);
  for (let i=0;i<2;i++) spawnItem(s, 'food', 'seed', null, true);
  for (let i=0;i<4;i++) spawnItem(s, 'grit', 'pebble');
  spawnItem(s, 'water', 'puddle', 20);
  for (let i=0;i<6;i++) mkAnt(s, 'forager', 'in', w.rx, w.ry, 1);
  mkAnt(s, 'soldier', 'in', w.rx, w.ry, 1);
  spawnSpider(s);
  return s;
}
function mkAnt(s, caste, state, tx, ty, team){
  const rnd = Math.random, C = CASTES[caste];
  const a = { id: s.nextId++, caste, state, team: team||0, tx, ty, x: (tx+0.5)*T, y: (ty+0.5)*T, dx: 0, dy: -1,
    carry: 0, kind: 'food', hp: C.hp, thr: { f: 0.25+rnd()*0.55, d: 0.25+rnd()*0.55 }, rest: rnd()*4, explore: 0, flee: 0, follow: false, isPlayer: false,
    nx: SHAFT, ny: 0, ntx: SHAFT, nty: 0, goal: null };
  s.ants.push(a); return a;
}
function spawnItem(s, kind, type, amt, rival){
  const w = s.world; const cx0 = rival ? w.rx : w.ex, cy0 = rival ? w.ry : w.ey;
  for (let tries=0; tries<80; tries++){
    const ang = w.rnd()*Math.PI*2, r = (kind==='water' ? 10 : 5) + w.rnd()*14;
    const x = Math.round(cx0 + Math.cos(ang)*r), y = Math.round(cy0 + Math.sin(ang)*r);
    if (x<1||y<1||x>=W-1||y>=H-1||w.blocked[idx(x,y)]) continue;
    if (Math.hypot(x-w.rx, y-w.ry) < 4 || Math.hypot(x-w.ex, y-w.ey) < 3) continue;
    if (s.items.some(f => f.x===x && f.y===y)) continue;
    s.items.push({ x, y, kind, type, amt: amt != null ? amt : (type==='seed' ? 20 : type==='pebble' ? 10 : 5+Math.floor(w.rnd()*6)) });
    return;
  }
}
function spawnSpider(s){
  const w = s.world;
  for (let tries=0; tries<100; tries++){
    const x = 2+Math.floor(w.rnd()*(W-4)), y = 2+Math.floor(w.rnd()*(H-4));
    if (w.blocked[idx(x,y)] || w.home[idx(x,y)] < 16 || w.rhome[idx(x,y)] < 8) continue;
    s.spider = { x:(x+0.5)*T, y:(y+0.5)*T, hp: 150, maxHp: 150, wander: 0, bite: 0 }; return;
  }
}
function spawnCat(s){
  const w = s.world;
  for (let tries=0; tries<100; tries++){
    const x = 2+Math.floor(w.rnd()*(W-4)), y = 2+Math.floor(w.rnd()*(H-4));
    if (w.blocked[idx(x,y)] || w.home[idx(x,y)] < 8 || w.home[idx(x,y)] > 18) continue;
    s.cat = { x:(x+0.5)*T, y:(y+0.5)*T, hp: 30, maxHp: 30, wander: 0, gx: (x+0.5)*T, gy: (y+0.5)*T }; return;
  }
}

const walk = (s,x,y) => x>=0 && y>=0 && x<W && y<H && !s.world.blocked[idx(x,y)];
const itemAt = (s,x,y) => s.items.find(f => f.x===x && f.y===y && f.amt>0);
const colonyOf = (s, a) => a.team ? s.rival : s.colony;
const homeOf = (s, a) => a.team ? s.world.rhome : s.world.home;

function stepTo(a, tx, ty, speed, dt){
  const gx = (tx+0.5)*T, gy = (ty+0.5)*T; let ddx = gx-a.x, ddy = gy-a.y; const d = Math.hypot(ddx,ddy);
  if (d < 0.5){ a.x = gx; a.y = gy; return true; }
  const m = Math.min(d, speed*dt); ddx/=d; ddy/=d; a.x += ddx*m; a.y += ddy*m; a.dx = ddx; a.dy = ddy;
  return Math.hypot(gx-a.x, gy-a.y) < 0.5;
}
function pickWeighted(opts, tot){ let r = Math.random()*tot; for (const o of opts){ r -= o[2]; if (r <= 0) return o; } return opts[opts.length-1]; }
function okDiag(s, a, dx, dy){ return !(dx && dy && (!walk(s,a.tx+dx,a.ty) || !walk(s,a.tx,a.ty+dy))); }
function chooseExplore(s, a, maxDist){
  const home = homeOf(s, a), cd = home[idx(a.tx,a.ty)]; const opts = []; let tot = 0;
  for (const [dx,dy] of N8){
    const nx = a.tx+dx, ny = a.ty+dy; if (!walk(s,nx,ny) || !okDiag(s,a,dx,dy)) continue;
    const nd = home[idx(nx,ny)]; if (maxDist && nd > maxDist) continue;
    let wgt = 0.15; if (nd > cd) wgt += 0.6; else if (nd === cd) wgt += 0.25;
    const fw = dx*a.dx + dy*a.dy; if (fw > 0.8) wgt += 1.4; else if (fw > 0.5) wgt += 0.6; else if (fw < -0.5) wgt *= 0.1;
    if (!a.team) wgt += Math.min(4, s.trail[idx(nx,ny)]) * 4;
    if (s.spider && a.flee > 0){ const sd = Math.hypot((nx+0.5)*T - s.spider.x, (ny+0.5)*T - s.spider.y); wgt *= sd < 3*T ? 0.05 : 1.5; }
    opts.push([nx,ny,wgt]); tot += wgt;
  }
  if (!opts.length) return; const o = pickWeighted(opts, tot); a.tx = o[0]; a.ty = o[1];
}
function chooseReturn(s, a){
  const home = homeOf(s, a), cd = home[idx(a.tx,a.ty)]; let bd = cd; const cand = [];
  for (const [dx,dy] of N8){ const nx = a.tx+dx, ny = a.ty+dy; if (!walk(s,nx,ny) || !okDiag(s,a,dx,dy)) continue;
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
  if (!a.team && (a.caste==='builder' || c.store > c.cap*0.6) && c.grit < 30) want.grit = 0.8;
  return want;
}
function nearestItem(s, a, r, want){ let best=null, bd=r; for (const f of s.items){ if (f.amt<=0 || !want[f.kind]) continue; const d = Math.hypot(f.x-a.tx, f.y-a.ty)/want[f.kind]; if (d < bd){ bd = d; best = f; } } return best; }
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
  if (a.isPlayer){ s.player.ant = null; s.player.pending = true; s.player.msg = cause === 'spider' ? 'The spider got you. Waiting for the next hatchling.' : cause === 'rival' ? 'A rival soldier got you. Waiting for the next hatchling.' : 'You starved. Waiting for the next hatchling.'; }
  if (!a.team) s.alarm[idx(Math.min(W-1,Math.max(0,Math.floor(a.x/T))), Math.min(H-1,Math.max(0,Math.floor(a.y/T))))] += 3;
  const c = colonyOf(s, a); c.deaths[cause] = (c.deaths[cause]||0) + 1;
}
function payCost(c, cost){ for (const k in cost){ const have = k==='food' ? c.store : c[k]; if (have < cost[k]) return false; } for (const k in cost){ if (k==='food') c.store -= cost[k]; else c[k] -= cost[k]; } return true; }
function canPay(c, cost){ for (const k in cost){ const have = k==='food' ? c.store : c[k]; if (have < cost[k]) return false; } return true; }
function costText(cost){ return Object.entries(cost).map(([k,v]) => v+' '+k).join(' · ') || 'free'; }

// ---------- main tick ----------
function tick(s, dt){
  s.t += dt; const w = s.world, c = s.colony, P = s.player;
  const td = Math.pow(0.5, dt/(s.rain && s.rain.on ? 4 : 90)), ad = Math.pow(0.5, dt/8); const tr = s.trail, al = s.alarm;
  for (let i=0;i<tr.length;i++){ if (tr[i] > 0.001) tr[i] *= td; else tr[i] = 0; if (al[i] > 0.001) al[i] *= ad; else al[i] = 0; }
  for (const col of [c, s.rival]) tickColony(s, col, dt);
  // dew
  s.dewTimer += dt; if (!s.dew && s.dewTimer > 110){ s.dew = true; s.dewTimer = 0; for (let i=0;i<3;i++) spawnItem(s, 'water', 'dew', 8); s.events.push('dew'); if (!P.msg) P.msg = 'Dew is out. Foragers can carry water home for a minute.'; }
  if (s.dew && s.dewTimer > 60){ s.dew = false; s.dewTimer = 0; s.items = s.items.filter(f => f.type !== 'dew'); }
  tickRain(s, dt); tickMaintenance(s, dt);
  s.itemTimer += dt; if (s.itemTimer > 9){ s.itemTimer = 0; const w2 = s.world; const nearOurs = s.items.filter(f=>f.kind==='food' && Math.hypot(f.x-w2.ex,f.y-w2.ey) < 20).length, nearRival = s.items.filter(f=>f.kind==='food' && Math.hypot(f.x-w2.rx,f.y-w2.ry) < 20).length;
    if (nearOurs < 16) spawnItem(s, 'food', Math.random()<0.25 ? 'seed' : 'crumb'); if (nearRival < 9) spawnItem(s, 'food', Math.random()<0.25 ? 'seed' : 'crumb', null, true); if (s.items.filter(f=>f.kind==='grit').length < 4) spawnItem(s, 'grit', 'pebble'); if (!s.items.some(f=>f.type==='puddle')) spawnItem(s, 'water', 'puddle', 20); }
  s.items = s.items.filter(f => f.amt > 0);
  stepSpider(s, dt); if (!s.spider){ s.spiderRespawn -= dt; if (s.spiderRespawn <= 0){ spawnSpider(s); s.spiderRespawn = 120; } }
  stepCat(s, dt); if (!s.cat){ s.catRespawn -= dt; if (s.catRespawn <= 0){ spawnCat(s); s.catRespawn = 90; } }
  // buckets for combat
  const buckets = new Map();
  for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; const k = a.tx+','+a.ty; let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(a); }
  const enemiesNear = (a, r) => { const out = []; for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++){ const b = buckets.get((a.tx+dx)+','+(a.ty+dy)); if (b) for (const o of b) if (o.team !== a.team && o.state !== 'dead') out.push(o); } return out; };
  for (const a of s.ants){
    if (a.state === 'dead') continue;
    if (a.isPlayer){ stepPlayer(s, a, dt, enemiesNear); continue; }
    const C = CASTES[a.caste], col = colonyOf(s, a), home = homeOf(s, a);
    if (a.state === 'in' || a.state === 'build' || a.state === 'nest'){ tickInside(s, a, dt); continue; }
    if (a.flee > 0) a.flee -= dt;
    const aggressive = C.fight >= 3 || a.follow || a.state === 'raid';
    // spider / enemies
    if (s.spider){ const sd = Math.hypot(a.x - s.spider.x, a.y - s.spider.y);
      if (sd < 3.5*T){ if (aggressive){ if (a.state !== 'follow' && a.state !== 'raid') a.state = 'fight'; a.goal = 'spider'; } else if (a.state !== 'fight'){ a.flee = 2; } } }
    const en = enemiesNear(a, aggressive ? 1 : 2);
    if (en.length){
      if (aggressive){ const o = en.find(o => Math.abs(o.tx-a.tx)<=1 && Math.abs(o.ty-a.ty)<=1); if (o){ o.hp -= C.fight*dt; if (o.hp <= 0) killAnt(s, o, a.team ? 'rival' : 'war'); } if (a.state === 'explore' || a.state === 'return' || a.state === 'patrol') a.state = 'fight'; a.goal = 'enemy'; }
      else if (en.some(o => CASTES[o.caste].fight >= 3 || o.follow)){ a.flee = 2.5; }
    }
    if (a.flee > 0 && a.state !== 'fight' && a.state !== 'follow' && a.state !== 'raid'){
      const threat = s.spider && Math.hypot(a.x-s.spider.x, a.y-s.spider.y) < 4*T ? s.spider : (en[0] || s.spider || {x:a.x+1,y:a.y});
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
      if (Math.hypot(a.x-gx, a.y-gy) < 1.5*T){ const guarded = s.ants.some(o => !o.team && o.state!=='dead' && CASTES[o.caste].fight >= 3 && (o.state==='patrol'||o.state==='fight') && Math.hypot(o.tx-c.ex, o.ty-c.ey) < 4); const take = Math.min(guarded ? 1 : 2, c.store); c.store -= take; c.stolen += take; a.carry = take; a.kind = 'food'; a.state = 'return'; s.alarm[idx(c.ex,c.ey)] += 2; continue; }
      if (stepTo(a, a.tx, a.ty, C.speed, dt)) chooseToward(s, a, gx, gy);
      continue;
    }
    if (a.state === 'follow'){
      if (!P.ant || P.inNest){ a.follow = false; a.state = 'explore'; continue; }
      const pd = Math.hypot(a.x - P.ant.x, a.y - P.ant.y);
      if (pd > 12*T){ a.follow = false; a.state = 'explore'; continue; }
      if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < 1.2*T){ s.cat.hp -= C.fight*dt; }
      if (pd > 1.3*T){ if (stepTo(a, a.tx, a.ty, C.speed+15, dt)) chooseToward(s, a, P.ant.x + (Math.random()-0.5)*T, P.ant.y + (Math.random()-0.5)*T); }
      continue;
    }
    if (a.state === 'explore' || a.state === 'patrol'){
      a.explore += dt; if (s.rain.on && !a.team && a.state === 'explore' && a.explore > 2){ a.state = 'return'; a.explore = 0; continue; }
      const f = itemAt(s, a.tx, a.ty); const want = wanted(s, a);
      if (f && a.state === 'explore' && a.carry === 0 && want[f.kind] && Math.hypot(a.x-(a.tx+0.5)*T, a.y-(a.ty+0.5)*T) < 2){ const take = Math.min(5, f.amt); f.amt -= take; a.carry = take; a.kind = f.kind; a.state = 'return'; continue; }
      if (a.explore > (a.state === 'patrol' ? 25 : 45)){ a.state = 'return'; a.explore = 0; continue; }
      if (stepTo(a, a.tx, a.ty, C.speed, dt)){ const nf = a.state === 'explore' ? nearestItem(s, a, 3, want) : null; if (nf) chooseToward(s, a, (nf.x+0.5)*T, (nf.y+0.5)*T); else chooseExplore(s, a, a.state === 'patrol' ? (a.team ? 6 : 9) : 22); }
      continue;
    }
    if (a.state === 'return'){
      if (a.carry > 0 && !a.team){ const i = idx(a.tx,a.ty); s.trail[i] = Math.min(5, s.trail[i] + 1.2*dt); }
      if (a.tx === col.ex && a.ty === col.ey && Math.hypot(a.x-(col.ex+0.5)*T, a.y-(col.ey+0.5)*T) < 2){
        if (a.carry) deposit(s, a); enterNest(s, a); continue; }
      if (stepTo(a, a.tx, a.ty, C.speed, dt)) chooseReturn(s, a);
      continue;
    }
  }
  // spider damage
  if (s.spider){
    let power = 0; const near = [];
    for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; const d = Math.hypot(a.x-s.spider.x, a.y-s.spider.y); if (d < 0.9*T){ near.push(a); if (a.state==='fight' || a.state==='follow' || a.isPlayer || a.state==='raid') power += CASTES[a.caste].fight; } }
    s.spider.hp -= power*0.5*dt; s.spider.bite += dt;
    if (s.spider.bite >= 2 && near.length){ s.spider.bite = 0; killAnt(s, near[Math.floor(Math.random()*near.length)], 'spider'); }
    if (s.spider.hp <= 0){ s.items.push({ x: Math.floor(s.spider.x/T), y: Math.floor(s.spider.y/T), kind:'protein', type:'spider', amt: 40 });
      if (!c.trophies.spider){ c.trophies.spider = true; P.msg = 'Spider down. Trophy: spider fang. Venom ants unlocked at the queen.'; }
      c.kills.spider = (c.kills.spider||0)+1; s.spider = null; s.spiderRespawn = 120; }
  }
  if (s.cat && s.cat.hp <= 0){ s.items.push({ x: Math.floor(s.cat.x/T), y: Math.floor(s.cat.y/T), kind:'protein', type:'cat', amt: 40 }); c.kills.caterpillar = (c.kills.caterpillar||0)+1; if (!P.msg) P.msg = 'Caterpillar down. 40 protein on the ground. Haul it home for Soldiers.'; s.cat = null; s.catRespawn = 90; }
  // siege on rival entrance
  if (s.rival.queenAlive){
    let ours = 0, theirs = 0;
    for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; const d = Math.hypot(a.tx - w.rx, a.ty - w.ry);
      if (!a.team && d <= 2 && (CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer)) ours++; if (a.team && d <= 3 && CASTES[a.caste].fight >= 3) theirs++; }
    if (ours >= 6 && theirs === 0){ s.rival.siege += dt; if (s.rival.siege >= 5){ s.rival.queenAlive = false; s.won = true; P.msg = 'The rival queen is dead. The yard is yours.'; } } else s.rival.siege = Math.max(0, s.rival.siege - dt);
  } else { for (const a of s.ants) if (a.team && Math.random() < dt/60) a.state = 'dead'; }
  for (const a of s.ants){ if (a.team && a.state !== 'dead' && a.state !== 'in' && CASTES[a.caste].fight >= 3 && Math.hypot(a.tx - c.ex, a.ty - c.ey) < 3){ s.alarm[idx(c.ex,c.ey)] = Math.max(s.alarm[idx(c.ex,c.ey)], 1.2); break; } }
  rivalBrain(s, dt);
  s.ants = s.ants.filter(a => a.state !== 'dead');
}

function tickColony(s, c, dt){
  c.secAcc += dt; while (c.secAcc >= 1){ c.secAcc -= 1; c.delivered.pop(); c.delivered.unshift(0); c.eaten.pop(); c.eaten.unshift(0); }
  let eat = 0; for (const a of s.ants) if (a.state !== 'dead' && a.team === c.team) eat += CASTES[a.caste].eat;
  const bite = eat/60*dt; c.eaten[0] += bite; c.store -= bite;
  if (c.store < 0){ c.store = 0; c.starve += dt; } else c.starve = 0;
  if (c.starve > 20 && (c.starve - 20) % 5 < dt){ const v = s.ants.filter(a => !a.isPlayer && a.state !== 'dead' && a.team === c.team); if (v.length) killAnt(s, v[Math.floor(Math.random()*v.length)], 'starved'); }
  const overCap = !c.team && s.ants.filter(a => !a.team).length >= queenCap(s.queen.level);
  if (c.queenAlive && (c.team || s.queen.placed) && !overCap){
    while (c.eggQueue.length && c.eggs.length < c.hatchCap){ const caste = c.eggQueue.shift(); c.eggs.push({ caste, t: 0, need: CASTES[caste].hatch * c.hatchMul }); }
    const nurses = c.team ? 0 : Math.min(3, s.ants.filter(a => a.caste==='nurse' && a.team===0 && (a.state==='in'||a.state==='build')).length); const rate = 1 + 0.12*nurses;
    for (let i=c.eggs.length-1;i>=0;i--){ const e = c.eggs[i]; e.t += dt*rate; if (e.t >= e.need){ c.eggs.splice(i,1); hatch(s, c, e.caste); } }
  }
  if (!c.team){
    const P = s.player;
    if (P.pending && !P.ant && !c.eggs.length && !c.eggQueue.length && s.queen.placed){ c.eggQueue.push('forager'); P.msg = 'Waiting for the next hatchling. A free Forager egg was laid.'; }
    const ws = roomOf(s, 'workshop') ? 2 : 1;
    if (c.buildQueue.length){ const job = c.buildQueue[0]; const builders = s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.goal === 'job' && Math.hypot(a.nx - job.x - 0.5, a.ny - job.y - 0.5) < 2.5).length;
      job.progress += builders*ws*dt; const R = ROOMS[job.room];
      if (job.progress >= R.work){ c.buildQueue.shift(); finishRoom(s, job); } }
    for (let i=s.nest.fillOrders.length-1;i>=0;i--){ const o = s.nest.fillOrders[i]; const b = s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.goal==='fill' && Math.hypot(a.nx - o.x - 0.5, a.ny - o.y - 0.5) < 1.6).length; o.progress += b*ws*dt; if (o.progress >= o.need){ const occupied = s.ants.some(a => !a.team && (a.state==='in'||a.state==='build'||a.state==='nest') && Math.floor(a.nx)===o.x && Math.floor(a.ny)===o.y); if (!occupied){ s.nest.cells[nidx(o.x,o.y)] = 0; s.nest.ver++; s.nest.fillOrders.splice(i,1); } } }
    for (let i=s.nest.digOrders.length-1;i>=0;i--){ const o = s.nest.digOrders[i]; const b = s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.goal==='dig' && Math.hypot(a.nx - o.ax - 0.5, a.ny - o.ay - 0.5) < 1.2).length; o.progress += b*ws*dt; if (o.progress >= o.need){ dig(s, o.x, o.y); s.nest.digOrders.splice(i,1); } }
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
  // decide job
  const reps = s.repairs.filter(r => nestField(s, r.ax, r.ay)[nidx(SHAFT,0)] < 9999); const rep = reps.length ? reps[a.id % reps.length] : null; const job = c.buildQueue[0];
  const ords = s.nest.digOrders.filter(o => nestField(s, o.ax, o.ay)[nidx(SHAFT,0)] < 9999); const ord = ords.length ? ords[a.id % ords.length] : null;
  if (a.caste === 'builder' && rep){ a.state = 'build'; a.goal = 'repair'; a.ntx = rep.ax; a.nty = rep.ay; }
  else if (a.caste === 'builder' && ord && (!job || a.id % 2 === 0)){ a.state = 'build'; a.goal = 'dig'; a.ntx = ord.ax; a.nty = ord.ay; }
  else if (a.caste === 'builder' && s.nest.fillOrders.length){ const fo = s.nest.fillOrders[a.id % s.nest.fillOrders.length]; const adj = isDugNeighbor(s, fo.x, fo.y) || [fo.x, fo.y]; a.state = 'build'; a.goal = 'fill'; a.ntx = adj[0]; a.nty = adj[1]; }
  else if (a.caste === 'builder' && job){ a.state = 'build'; a.goal = 'job'; a.ntx = job.x; a.nty = job.y; }
  else if (a.state === 'build'){ a.state = 'in'; a.goal = null; }
  if (a.state === 'in' && a.goal == null){ const [tx,ty] = roomTarget(s, a); a.ntx = tx; a.nty = ty; a.goal = 'idle'; }
  // walk inside
  const arrived = nestStep(s, a, C.speed*0.8, dt);
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
  for (let i=s.repairs.length-1;i>=0;i--){ const rep = s.repairs[i]; const n = s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.goal==='repair' && Math.hypot(a.nx - rep.ax - 0.5, a.ny - rep.ay - 0.5) < 1.2).length; rep.progress += n; if (rep.progress >= 8){ dig(s, rep.x, rep.y); s.repairs.splice(i,1); } }
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
  if (r.store >= 10 && r.eggQueue.length < 2 && mine.length < Math.min(30, 10 + s.t/45)){ r.eggQueue.push(soldiers.length < foragers/4 ? 'soldier' : 'forager'); r.store -= 4; }
  // raid when strong, not before 5 minutes, at most every 2 minutes
  r.raidCd = (r.raidCd || 0) - 10;
  const ourSoldiers = s.ants.filter(a => a.team===0 && CASTES[a.caste].fight >= 3).length;
  const idle = soldiers.filter(a => a.state==='in' || a.state==='patrol');
  if (s.t > 480 && r.raidCd <= 0 && idle.length >= 4 && idle.length >= ourSoldiers + 2 && s.queen.placed){ r.raidCd = 120; let n = 0; for (const a of idle){ if (n++ >= 4) break; if (a.state==='in') exitNest(s, a, 'raid'); else a.state = 'raid'; } s.player.msg = 'Rival soldiers are marching on your entrance.'; s.events.push('raid'); }
}

function stepSpider(s, dt){
  const sp = s.spider; if (!sp) return; let target = null, bd = 3*T;
  for (const a of s.ants){ if (a.state==='dead'||a.state==='in'||a.state==='build'||a.state==='nest') continue; const d = Math.hypot(a.x-sp.x, a.y-sp.y); if (d < bd){ bd = d; target = a; } }
  let gx, gy; if (target){ gx = target.x; gy = target.y; }
  else { sp.wander -= dt; if (sp.wander <= 0){ sp.wander = 3 + Math.random()*4; const ang = Math.random()*Math.PI*2; sp.gx = sp.x + Math.cos(ang)*6*T; sp.gy = sp.y + Math.sin(ang)*6*T; } gx = sp.gx ?? sp.x; gy = sp.gy ?? sp.y; }
  const speed = target ? 30 : 16; let ddx = gx - sp.x, ddy = gy - sp.y; const d = Math.hypot(ddx, ddy);
  if (d > 1){ ddx/=d; ddy/=d; const nx = sp.x + ddx*speed*dt, ny = sp.y + ddy*speed*dt; const tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    if (walk(s, tx, ty) && Math.hypot(tx - s.world.ex, ty - s.world.ey) > 6 && Math.hypot(tx - s.world.rx, ty - s.world.ry) > 4){ sp.x = nx; sp.y = ny; } else sp.wander = 0; }
}
function stepCat(s, dt){
  const ct = s.cat; if (!ct) return; ct.wander -= dt; if (ct.wander <= 0){ ct.wander = 4 + Math.random()*4; const ang = Math.random()*Math.PI*2; ct.gx = ct.x + Math.cos(ang)*3*T; ct.gy = ct.y + Math.sin(ang)*3*T; }
  let ddx = ct.gx - ct.x, ddy = ct.gy - ct.y; const d = Math.hypot(ddx, ddy);
  if (d > 1){ ddx/=d; ddy/=d; const nx = ct.x + ddx*8*dt, ny = ct.y + ddy*8*dt; if (walk(s, Math.floor(nx/T), Math.floor(ny/T))){ ct.x = nx; ct.y = ny; } else ct.wander = 0; }
  // attacked by soldiers/venom on patrol/fight nearby
  for (const a of s.ants){ if (a.team || a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest') continue; if (CASTES[a.caste].fight < 3 && !a.follow && !a.isPlayer) continue; const dd = Math.hypot(a.x-ct.x, a.y-ct.y); if (dd < 1.2*T){ ct.hp -= CASTES[a.caste].fight*dt*0.5; } else if (dd < 5*T && CASTES[a.caste].fight >= 3 && a.state === 'patrol'){ a.state = 'fight'; a.goal = 'cat'; chooseToward(s, a, ct.x, ct.y); } }
  // fight-state soldiers targeting cat
  for (const a of s.ants){ if (a.goal === 'cat' && a.state === 'fight'){ if (Math.hypot(a.x-ct.x, a.y-ct.y) > 1.0*T){ if (stepTo(a, a.tx, a.ty, CASTES[a.caste].speed, dt)) chooseToward(s, a, ct.x, ct.y); } } }
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
  if (P.tx != null){
    let ddx = P.tx - a.x, ddy = P.ty - a.y; const d = Math.hypot(ddx, ddy);
    if (d > 2){ ddx/=d; ddy/=d; const m = Math.min(d, 85*dt); const nx = a.x + ddx*m, ny = a.y + ddy*m; const tx = Math.floor(nx/T), ty = Math.floor(ny/T);
      if (walk(s, tx, ty)){ a.x = nx; a.y = ny; moving = true; a.dx = ddx; a.dy = ddy; }
      else { const tx2 = Math.floor((a.x+ddx*m)/T); if (walk(s, tx2, a.ty)){ a.x += ddx*m; moving = true; } else if (walk(s, a.tx, Math.floor((a.y+ddy*m)/T))){ a.y += ddy*m; moving = true; } else P.tx = null; }
    } else if (!P.holding) P.tx = null;
  }
  a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T);
  P.hunger -= (moving ? 1.3 : 0.3)*dt;
  const nearHome = Math.hypot(a.tx - w.ex, a.ty - w.ey) < 1.6;
  let fed = nearHome; if (!fed) for (const o of s.ants){ if (o !== a && !o.team && o.state === 'return' && o.carry && o.kind==='food' && Math.hypot(o.x-a.x, o.y-a.y) < 1.2*T){ fed = true; break; } }
  if (fed && P.hunger < 100) P.hunger = Math.min(100, P.hunger + 20*dt);
  if (P.hunger <= 0){ killAnt(s, a, 'hunger'); return; }
  if (moving && (P.mark || a.carry)){ const i = idx(a.tx, a.ty); s.trail[i] = Math.min(5, s.trail[i] + 2.5*dt); }
  if (a.carry && nearHome){ deposit(s, a); }
  // fight: player bites enemies / cat adjacent
  const en = enemiesNear(a, 1); if (en.length){ en[0].hp -= C.fight*2*dt; if (en[0].hp <= 0) killAnt(s, en[0], 'war'); } else if (a.hp < 12) a.hp = Math.min(12, a.hp + 1*dt);
  if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < 1.2*T) s.cat.hp -= C.fight*dt;
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
function actionLabel(s){ const a = s.player.ant; if (!a || s.player.inNest) return null; if (a.carry) return 'Drop'; if (itemAt(s, a.tx, a.ty)) return 'Pick up'; return null; }
function doAction(s){
  const a = s.player.ant; if (!a || s.player.inNest) return;
  if (a.carry){ const f = s.items.find(x => x.x===a.tx && x.y===a.ty && x.kind===a.kind); if (f) f.amt += a.carry; else s.items.push({ x:a.tx, y:a.ty, amt:a.carry, kind:a.kind, type: a.kind==='food'?'crumb':a.kind==='water'?'dew':a.kind==='grit'?'pebble':'spider' }); a.carry = 0; return; }
  const f = itemAt(s, a.tx, a.ty); if (f){ const take = Math.min(5, f.amt); f.amt -= take; a.carry = take; a.kind = f.kind; }
}
function recruit(s, n){
  const a = s.player.ant; if (!a || s.player.inNest) return 0; const w = s.world; let got = 0;
  const nearHome = Math.hypot(a.tx - w.ex, a.ty - w.ey) < 3.5;
  const cands = s.ants.filter(o => !o.isPlayer && !o.team && o.state !== 'dead' && !o.follow && (
    ((o.state==='explore' || o.state==='patrol' || (o.state==='return' && !o.carry)) && Math.hypot(o.x-a.x, o.y-a.y) < 7*T) || (nearHome && o.state === 'in' && o.goal !== 'job')));
  cands.sort((p,q) => (p.state==='in'?1:0) - (q.state==='in'?1:0) || Math.hypot(p.x-a.x,p.y-a.y) - Math.hypot(q.x-a.x,q.y-a.y));
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
  return JSON.stringify({ v: 5, seed: s.seed, t: s.t, colony: s.colony, rival: s.rival, items: s.items, spider: s.spider, spiderRespawn: s.spiderRespawn, cat: s.cat, catRespawn: s.catRespawn,
    nest: { cells: Array.from(s.nest.cells), rooms: s.nest.rooms, digOrders: s.nest.digOrders, fillOrders: s.nest.fillOrders }, queen: s.queen, phase: s.phase, won: s.won, dew: s.dew, dewTimer: s.dewTimer, rain: s.rain, repairs: s.repairs, seen: s.seen,
    ants: s.ants.map(a => ({ id:a.id, caste:a.caste, state:a.state, team:a.team, tx:a.tx, ty:a.ty, x:a.x, y:a.y, carry:a.carry, kind:a.kind, hp:a.hp, thr:a.thr, isPlayer:a.isPlayer, follow:a.follow, nx:a.nx, ny:a.ny, ntx:a.ntx, nty:a.nty, goal:a.goal })),
    player: { hunger: s.player.hunger, mark: s.player.mark, pending: s.player.pending, msg: s.player.msg, inNest: s.player.inNest }, nextId: s.nextId,
    trail: Array.from(s.trail, v => Math.round(v*100)/100) });
}
function deserialize(json){
  const d = JSON.parse(json); if (d.v !== 5) throw new Error('old save'); const s = create(d.seed);
  s.t = d.t; s.colony = d.colony; s.rival = d.rival; s.items = d.items; s.spider = d.spider; s.spiderRespawn = d.spiderRespawn; s.cat = d.cat; s.catRespawn = d.catRespawn; s.nextId = d.nextId;
  s.nest.cells.set(d.nest.cells); s.nest.rooms = d.nest.rooms || []; s.nest.digOrders = d.nest.digOrders || []; s.nest.fillOrders = d.nest.fillOrders || []; s.nest.ver++; s.queen = d.queen; s.phase = d.phase; s.won = d.won; s.dew = d.dew; s.dewTimer = d.dewTimer; s.rain = d.rain || s.rain; s.repairs = d.repairs || []; s.seen = d.seen || {};
  s.ants = d.ants.map(a => Object.assign({ dx:0, dy:-1, rest:0, explore:0, flee:0, exitTo:null }, a));
  s.player.ant = s.ants.find(a => a.isPlayer) || null; Object.assign(s.player, d.player);
  if (d.trail && d.trail.length === s.trail.length) s.trail.set(d.trail);
  return s;
}
return { W, H, T, NW, NH, SHAFT, CASTES, ROOMS, ROOM_KEYS, SOIL, soilTier, QUEEN_UP, queenCap, create, tick, playerDig, buildersInside, actionLabel, doAction, recruit, release, queueEgg, eggLock, queueRoom, roomStateAt, roomAt, roomOf, findRoomRect, freePocket, toggleDigOrder, toggleFillOrder, removeRoom, digAllowed, upgradeQueen, antCount, dugCount, queenDig, buildNest, stress, stats, serialize, deserialize, itemAt, nidx, canPay, costText };
})();
if (typeof module !== 'undefined') module.exports = SIM;
