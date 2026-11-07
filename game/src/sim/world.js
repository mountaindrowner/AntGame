// The surface: building the world from the yard, pathfinding fields, fog of war, spawning ants, food and
// the spider, items on the ground, and how ants walk, explore and head home.
import { AREA, AREAS, REGION, SCALE, areaBounds, makeYard } from './yard.js';
import { CASTES, FOODS, FORAGE, H, N4, N8, QUEEN_UP, RIVALS, SHAFT, SURF, T, W, heavy, idx, rspec } from './core.js';
import { chewsTreats, has, maxHp, paceOf, picked } from './progress.js';
import { dRoomBuilt, daughterHome, daughterOf } from './daughters.js';
import { DUTIES } from './jobs.js';

export function makeWorld(seed){
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
export function bfs(blocked, sx, sy){
  const d = new Float32Array(W*H).fill(9999); const q = [[sx,sy]]; d[idx(sx,sy)] = 0; let qi = 0;
  while (qi < q.length){ const [x,y] = q[qi++]; const dd = d[idx(x,y)];
    for (const [dx,dy] of N4){ const nx=x+dx, ny=y+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue; if (blocked[idx(nx,ny)]) continue;
      if (d[idx(nx,ny)] > dd+1){ d[idx(nx,ny)] = dd+1; q.push([nx,ny]); } } }
  return d;
}
// ---------- fog of war ----------
// The yard map shows only what you have seen: a circle round your ant as it
// walks, and the ground round home from the start.
export const SEE = { cell: 4, player: 13, home: 22 };
export function reveal(s, x, y, r){
  const cw = W/SEE.cell, ch = H/SEE.cell, cx = x/SEE.cell, cy = y/SEE.cell, cr = r/SEE.cell;
  for (let j = Math.max(0, Math.floor(cy - cr)); j <= Math.min(ch-1, Math.ceil(cy + cr)); j++)
    for (let i = Math.max(0, Math.floor(cx - cr)); i <= Math.min(cw-1, Math.ceil(cx + cr)); i++)
      if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= cr) s.seenMap[j*cw + i] = 1;
}
export function mkAnt(s, caste, state, tx, ty, team){
  const rnd = Math.random, C = CASTES[caste];
  const a = { id: s.nextId++, caste, state, team: team||0, tx, ty, x: (tx+0.5)*T, y: (ty+0.5)*T, dx: 0, dy: -1,
    carry: 0, kind: 'food', hp: C.hp, thr: { f: 0.25+rnd()*0.55, d: 0.25+rnd()*0.55 }, rest: rnd()*4, explore: 0, flee: 0, follow: false, isPlayer: false,
    nx: SHAFT, ny: 0, ntx: SHAFT, nty: 0, goal: null };
  if (!a.team) a.hp = maxHp(s, a); else a.hp = C.hp*rspec(a).hp;
  s.ants.push(a); return a;
}
// An item somewhere open inside an area (0..8, see yard.js).
export function spawnInArea(s, ai, kind, type, amt){
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
export function spawnNear(s, kind, type, ok, rich){
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
export function spawnFood(s, ai, treats){
  const A = AREAS[ai], w = s.world;
  if (treats && A.treat && w.rnd() < A.treat && !s.items.some(f => heavy(f))){
    const it = spawnInArea(s, ai, 'food', A.treats[Math.floor(w.rnd()*A.treats.length)]);
    if (it){ const F = FOODS[it.type]; s.events.push('treat'); if (!s.player.msg) s.player.msg = 'A ' + F.name + ' fell by ' + A.name.replace(/^The /, 'the ') + '! Crew of ' + F.crew + ' to carry.'; }
    return it;
  }
  let tot = 0; for (const f of A.foods) tot += f[1];
  let r = w.rnd()*tot, type = A.foods[0][0];
  for (const f of A.foods){ r -= f[1]; if (r <= 0){ type = f[0]; break; } }
  if (type === 'apple' && s.items.some(f => f.type === 'apple')) type = 'berry'; // build 75: one apple core in the yard at a time
  return spawnInArea(s, ai, FOODS[type] && FOODS[type].protein ? 'protein' : 'food', type);
}
// How far foragers roam on their own: farther with each forage level and with some evolutions.
export const forageRange = s => picked(s, 'forager', 'lonewolf') ? 400 : Math.round(FORAGE[Math.min(4, s.colony.forage || 0)].range*(has(s, 'suncompass') ? 1.25 : 1)*(dRoomBuilt(s, 'maproom') ? 1.15 : 1)); // build 50: the Watch's Map room
// A forager's pace, with its training.
export const fSpeed = (s, a) => paceOf(s, a, CASTES[a.caste].speed * (!a.team && a.caste === 'forager' ? FORAGE[Math.min(4, s.colony.forage || 0)].speed : 1));
export const areaOf = (s, x, y) => s.world.area[idx(Math.max(0, Math.min(W-1, x)), Math.max(0, Math.min(H-1, y)))];
// The spider lives at its web in the Flowerbed.
export function spawnSpider(s){
  const w = s.world;
  s.spider = { x:(w.web.x+0.5)*T, y:(w.web.y+2*SCALE+0.5)*T, hp: 150, maxHp: 150, wander: 0, bite: 0, cost0: s.colony ? s.colony.deaths.spider || 0 : 0 };
}
// Caterpillars graze the Lawn, the Compost heap, the Flowerbed, the
// vegetable garden and the great lawn.
export function spawnCat(s){
  // Mostly close to home, so the first hunt's meat is within a forager's reach.
  const homes = [REGION.lawn, REGION.lawn, REGION.lawn, REGION.compost, REGION.compost, REGION.flowerbed, REGION.flowerbed, REGION.clover, REGION.tomatoes, REGION.dandelions];
  const w = s.world, ai = homes[Math.floor(Math.random()*homes.length)], b = areaBounds(ai);
  for (let tries=0; tries<100; tries++){
    const x = b.x0 + 3 + Math.floor(Math.random()*(AREA-6)), y = b.y0 + 3 + Math.floor(Math.random()*(AREA-6));
    if (w.blocked[idx(x,y)] || w.pit[idx(x,y)] || w.home[idx(x,y)] < 10) continue;
    s.cat = { x:(x+0.5)*T, y:(y+0.5)*T, hp: 30, maxHp: 30, wander: 0, gx: (x+0.5)*T, gy: (y+0.5)*T }; return;
  }
}

export const raiseAlarm = (s, x, y, v) => { const i = idx(x,y); s.alarm[i] = Math.max(s.alarm[i], v); s.hot.add(i); };
export const walk = (s,x,y) => x>=0 && y>=0 && x<W && y<H && !s.world.blocked[idx(x,y)];
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
export const itemAt = (s,x,y) => { const g = itemGrid(s), c = g.cells.get(Math.floor(y/ICELL)*g.cols + Math.floor(x/ICELL)); if (!c) return undefined; for (const i of c){ const f = s.items[i]; if (f.x===x && f.y===y && f.amt>0) return f; } return undefined; };
export const colonyOf = (s, a) => a.team ? s.rivals[a.team - 1] : s.colony;
export const homeOf = (s, a) => a.team ? rivalHome(s, a.team) : a.dh ? (daughterOf(s, a) ? daughterHome(s, daughterOf(s, a)) : s.world.home) : s.world.home;
// Each rival nest's distance field, made when the colony wakes.
export function rivalHome(s, team){ const w = s.world; if (team === 1) return w.rhome; if (!w.rhomes) w.rhomes = {}; if (!w.rhomes[team]){ const n = w.rnests[team]; w.rhomes[team] = bfs(w.blocked, n.x, n.y); } return w.rhomes[team]; }

export function stepTo(a, tx, ty, speed, dt){
  const gx = (tx+0.5)*T, gy = (ty+0.5)*T; let ddx = gx-a.x, ddy = gy-a.y; const d = Math.hypot(ddx,ddy);
  if (d < 0.5){ a.x = gx; a.y = gy; return true; }
  const m = Math.min(d, speed*SURF*dt*(a.slowT > 0 ? 0.5 : 1)); ddx/=d; ddy/=d; a.x += ddx*m; a.y += ddy*m; a.dx = ddx; a.dy = ddy;
  return Math.hypot(gx-a.x, gy-a.y) < 0.5;
}
function pickWeighted(opts, tot){ let r = Math.random()*tot; for (const o of opts){ r -= o[2]; if (r <= 0) return o; } return opts[opts.length-1]; }
function okDiag(s, a, dx, dy){ return !(dx && dy && (!walk(s,a.tx+dx,a.ty) || !walk(s,a.tx,a.ty+dy))); }
export function chooseExplore(s, a, maxDist){
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
export function chooseReturn(s, a){
  const home = homeOf(s, a), cd = home[idx(a.tx,a.ty)]; let bd = cd; const cand = [];
  for (const [dx,dy] of N8){ const nx = a.tx+dx, ny = a.ty+dy; if (!walk(s,nx,ny) || !okDiag(s,a,dx,dy) || s.world.pit[idx(nx,ny)] === 2) continue;
    const nd = home[idx(nx,ny)]; if (nd < bd){ bd = nd; cand.length = 0; cand.push([nx,ny]); } else if (nd === bd && nd < cd) cand.push([nx,ny]); }
  if (cand.length){ const b = cand[Math.floor(Math.random()*cand.length)]; a.tx = b[0]; a.ty = b[1]; }
}
export function chooseToward(s, a, px, py){
  const gx = Math.floor(px/T), gy = Math.floor(py/T); let best = null, bd = 1e9;
  for (const [dx,dy] of N8){ const nx = a.tx+dx, ny = a.ty+dy; if (!walk(s,nx,ny) || !okDiag(s,a,dx,dy)) continue;
    const d = Math.hypot(nx-gx, ny-gy) + Math.random()*0.3; if (d < bd){ bd = d; best = [nx,ny]; } }
  if (best){ a.tx = best[0]; a.ty = best[1]; }
}
export function wanted(s, a){
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
export function nearestItem(s, a, r, want){
  let wmax = 0; for (const k in want) if (want[k] > wmax) wmax = want[k]; if (!wmax) return null;
  const g = itemGrid(s), R = r*wmax, cx0 = Math.max(0, Math.floor((a.tx - R)/ICELL)), cx1 = Math.floor((a.tx + R)/ICELL), cy0 = Math.max(0, Math.floor((a.ty - R)/ICELL)), cy1 = Math.floor((a.ty + R)/ICELL);
  let best = null, bd = r, bi = Infinity;
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1 && cx < g.cols; cx++){ const c = g.cells.get(cy*g.cols + cx); if (!c) continue;
    for (const i of c){ const f = s.items[i]; if (f.amt<=0 || !want[f.kind] || (heavy(f) && !a.team && !chewsTreats(s, a)) || f.carried) continue; const d = Math.hypot(f.x-a.tx, f.y-a.ty)/want[f.kind]; if (d < bd || (d === bd && best && i < bi)){ bd = d; best = f; bi = i; } } }
  return best;
}
// Shortest walk over the tile grid (8 directions, no corner cutting, off the
// antlion pits' bottoms), smoothed to straight runs. If the goal can't be
// reached, it ends at the closest reachable tile.
export function findPath(s, sx, sy, gx, gy, avoid){
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
