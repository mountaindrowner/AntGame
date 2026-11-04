// The nest cutaway: digging, rooms, fill orders, breaking into new sections (build 42), glowrock, and the
// builders' jobs: dig, fill, repair, rain and cave-ins.
import { BEDROCK_PRIZES, BEDROCK_Y, HOME_X0, HOME_X1, HOME_Y1, N4, NEST_FINDS, NEST_SECTIONS, NH, NW, ROOMS, SECTION_BY, SHAFT, SOIL, SOIL_TOP, SPOIL_MAX, T, nidx, roomCount, roomLevel, soilTier } from './core.js';
import { addChitin, addSugar, exitNest, payCost, roomsChanged } from './colony.js';
import { gainGenes, gainXp, has, picked, promo, roomCost, workOf } from './progress.js';
import { antCount } from './commands.js';

export function makeNest(){
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
export function dig(s, x, y, v){ const n = s.nest; if (x<0||y<0||x>=NW||y>=NH) return; if (n.cells[nidx(x,y)] < (v||1)){ n.cells[nidx(x,y)] = v||1; n.ver++; } }
function rectCells(r){ const out = []; for (let y=r.y0; y<r.y0+r.h; y++) for (let x=r.x0; x<r.x0+r.w; x++) out.push([x,y]); return out; }
export function carveRoom(s, r, key){ const R = ROOMS[key]; const room = { x0: r.x0, y0: r.y0, w: R.w, h: R.h, key }; for (const [x,y] of rectCells(room)) dig(s, x, y, 2); s.nest.rooms.push(room); return room; }
export function roomOf(s, key){ return s.nest.rooms.find(r => r.key === key) || null; }
export function roomSlotIndex(s, key){ return roomOf(s, key) ? 1 : -1; }
export function roomAt(s, x, y){ return s.nest.rooms.find(r => x >= r.x0 && x < r.x0+r.w && y >= r.y0 && y < r.y0+r.h) || null; }
export function findRoomRect(s, cx, cy, w, h){
  const n = s.nest; w = w || 4; h = h || 3;
  for (let y0 = cy; y0 > cy-h; y0--) for (let x0 = cx; x0 > cx-w; x0--){
    if (x0 < 1 || y0 < 1 || x0+w > NW-1 || y0+h > NH) continue;
    let ok = true; for (let y=y0; y<y0+h && ok; y++) for (let x=x0; x<x0+w; x++){ if (n.cells[nidx(x,y)] !== 1){ ok = false; break; } }
    if (ok && !s.colony.buildQueue.some(j => x0 < j.x0+j.w && j.x0 < x0+w && y0 < j.y0+j.h && j.y0 < y0+h)) return { x0, y0, w, h };
  }
  return null;
}
export function toggleFillOrder(s, x, y){
  const n = s.nest; if (x<1||y<1||x>=NW-1||y>=NH) return 'edge';
  const i = n.fillOrders.findIndex(o => o.x===x && o.y===y); if (i >= 0){ n.fillOrders.splice(i,1); return 'removed'; }
  if (n.cells[nidx(x,y)] !== 1) return n.cells[nidx(x,y)] === 2 ? 'room' : 'dirt';
  if (x === SHAFT && y <= 1) return 'entrance'; if (n.fillOrders.length >= 16) return 'too many';
  if (s.colony.buildQueue.some(j => x >= j.x0 && x < j.x0 + j.w && y >= j.y0 && y < j.y0 + j.h)) return 'room'; // build 40
  n.fillOrders.push({ x, y, progress: 0, need: SOIL[soilTier(y)].work }); return 'added';
}
export function removeRoom(s, x, y){
  const r = roomAt(s, x, y); if (!r || r.key === 'queen') return false; const c = s.colony;
  s.nest.rooms.splice(s.nest.rooms.indexOf(r), 1); for (const [cx,cy] of rectCells(r)) s.nest.cells[nidx(cx,cy)] = 1; s.nest.ver++;
  const cost = roomCost(s, r.key, roomCount(s, r.key)); for (const k in cost){ const half = Math.floor(cost[k]/2); if (k === 'food') c.store = Math.min(c.cap, c.store + half); else c[k] += half; }
  if (!roomCount(s, r.key) && c.roomLv && c.roomLv[r.key]){ // build 40: the last one gone, its levels go with it (half their cost back)
    const R = ROOMS[r.key]; for (let n = 1; n < c.roomLv[r.key]; n++) for (const k in R.lv[n - 1].cost){ const half = Math.floor(R.lv[n - 1].cost[k]/2); if (k === 'food') c.store += half; else c[k] = (c[k] || 0) + half; }
    delete c.roomLv[r.key]; }
  roomsChanged(s);
  return true;
}
export function dugCount(s){ let n = 0; for (let i=0;i<NW*NH;i++) if (s.nest.cells[i] === 1) n++; return n; }
function isDugNeighbor(s, x, y){ for (const [dx,dy] of N4){ const nx=x+dx, ny=y+dy; if (nx<0||ny<0||nx>=NW||ny>=NH) continue; if (s.nest.cells[nidx(nx,ny)]) return [nx,ny]; } return null; }
// Build 42: which section a cell is in (null: the open middle or the bedrock), and whether it's still shut.
export function sectionAt(x, y){ for (const S of NEST_SECTIONS) if (x >= S.x0 && x <= S.x1 && y >= S.y0 && y <= S.y1) return S; return null; }
export function cellLocked(s, x, y){ const S = sectionAt(x, y); if (S) return !(s.nest.open && s.nest.open[S.key]); return !(x >= HOME_X0 && x <= HOME_X1 && y <= HOME_Y1) && y < BEDROCK_Y; }
export function digAllowed(s, y, x){ if (x != null && cellLocked(s, x, y)){ const S = sectionAt(x, y); return S ? 'shut: break into ' + S.name.replace(/^the /, 'the ') + ' first' : 'shut'; } const t = soilTier(y); if (t === 0) return ''; if (!roomOf(s, 'workshop')) return 'needs Workshop'; if (t === 2 && s.queen.level < 1) return 'needs queen upgrade'; if (t >= 3 && s.queen.level < 2) return 'needs the queen at level 3'; return ''; }
// ---------- build 42: breaking into new ground ----------
// Why a section can't be opened now ('' when it can, cost aside).
export function sectionLock(s, key){
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
export function startBreach(s, key){
  const S = SECTION_BY[key]; if (!S || sectionLock(s, key) || !payCost(s.colony, S.cost)) return false;
  s.nest.breach = { key, progress: 0 }; s.player.msg = `Builders start breaking into ${S.name}.`; s.events.push('breach');
  return true;
}
// Builders inside chew at the wall: four at most, each at its own pace.
export function tickBreach(s, dt){
  const B = s.nest.breach; if (!B) return; const S = SECTION_BY[B.key];
  const crew = s.ants.filter(a => !a.team && a.caste === 'builder' && (a.state === 'in' || a.state === 'build')).slice(0, 4);
  if (!crew.length){ if (!B.warned){ B.warned = true; s.player.msg = `Breaking into ${S.name} needs builders inside the nest.`; } return; }
  B.warned = false; for (const a of crew) B.progress += workOf(s, a)*dt;
  if (B.progress >= S.work) openSection(s, B.key);
}
export function openSection(s, key){
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
export const GLOW_ROCKS = [[3, 61], [6, 63], [11, 60], [15, 62], [19, 63], [27, 61], [31, 63], [35, 60], [38, 62], [44, 61], [46, 63]];
// Build 52: glowrock 🟢, the great evolutions' rare ingredient. Eleven in the bedrock (25 minutes' digging each),
// one each from the 9th, 10th and 11th guardian, and a slow seam the Quarry mines once her Cutting hall stands.
export const GLOW_NEED = 1500, GLOW_QUARRY = 1200, GLOW_ZONES = [9, 10, 11];
export const isGlowRock = (x, y) => GLOW_ROCKS.some(([gx, gy]) => gx === x && gy === y);
export function gainGlow(s, n, why){
  const c = s.colony, first = !c.glowTotal; c.glow = (c.glow || 0) + n; c.glowTotal = (c.glowTotal || 0) + n; s.events.push('glow');
  const line = why === 'dug' ? 'Your builders prise out a glowing rock.' : why === 'quarry' ? 'The Quarry sends up a glowing rock from her deep seam.' : 'Where the guardian fell, the ground glows: a rock of it, warm to the touch.';
  s.player.msg = `🟢 ${line} ${first ? 'Is this why we grow? It is what the great evolutions need.' : `You have ${c.glow}.`}`;
  if (first) s.banner = { key: 'glow-first', t: s.t, icon: '🟢', title: 'Glowrock', line: 'Warm, faintly green, and rare. The great evolutions are made from it.', kind: 'gift' };
}
export function bedrockGlow(s, y){ const c = s.colony; if (y < BEDROCK_Y || c.glowSeen) return; c.glowSeen = true; s.player.msg = 'The rock down here is warm, and it glows a faint green. Is this why we grow?'; s.events.push('glow'); }
// The bedrock's three prizes: dug out, they're found.
export function bedrockPrize(s, x, y){
  const P = BEDROCK_PRIZES.find(b => b.x === x && b.y === y), c = s.colony; if (!P || (c.prizes || {})[P.key]) return;
  c.prizes = c.prizes || {}; c.prizes[P.key] = true;
  if (P.key === 'fossil') gainGenes(s, 5, 'a fossil ant in the bedrock');
  else if (P.key === 'spring') c.seeps = (c.seeps || 0) + 3;
  else if (P.key === 'ring'){ c.buried = (c.buried || 0) + 1; gainGenes(s, 4, 'a lost gold ring'); }
  s.banner = { key: 'prize-' + P.key, t: s.t, icon: '💎', title: 'Found in the bedrock!', line: `${P.name.replace(/^./, ch => ch.toUpperCase())}: ${P.fx}.`, kind: 'gift' }; s.events.push('breakthrough');
}
// Root aphids and seeps pay out over time.
export function tickNestFinds(s, dt){
  const c = s.colony;
  if (c.rootAphids){ c.aphidAcc = (c.aphidAcc || 0) + c.rootAphids*dt/60; if (c.aphidAcc >= 1){ c.aphidAcc -= 1; addSugar(s, 1); } }
  if (c.seeps){ c.seepAcc = (c.seepAcc || 0) + c.seeps*dt/20; if (c.seepAcc >= 1){ c.seepAcc -= 1; c.water = Math.min(c.waterCap, c.water + 1); } }
}
export function toggleDigOrder(s, x, y){
  const n = s.nest; if (x<1||y<1||x>=NW-1||y>=NH) return 'edge';
  const i = n.digOrders.findIndex(o => o.x===x && o.y===y); if (i >= 0){ n.digOrders.splice(i,1); return 'removed'; }
  if (n.cells[nidx(x,y)]) return 'dug'; let adj = isDugNeighbor(s, x, y);
  if (!adj){ const o = n.digOrders.find(o => Math.abs(o.x-x)+Math.abs(o.y-y) === 1); if (o) adj = [o.x, o.y]; } if (!adj) return 'not adjacent';
  const why = digAllowed(s, y, x); if (why) return why; if (n.digOrders.length >= 16) return 'too many';
  const glow = isGlowRock(x, y); /* build 52: a glowing rock: 25 minutes' work, however many dig */
  if (glow) s.player.msg = '🟢 A glowing rock. Prising it out takes about 25 minutes, however many builders work it.';
  n.digOrders.push({ x, y, ax: adj[0], ay: adj[1], progress: 0, need: glow ? GLOW_NEED : SOIL[soilTier(y)].work, ...(glow ? { glow: true } : {}) }); return 'added';
}

// ---------- builder tasks ----------
// One builder per dig, fill or repair order, up to three on a room. A dig
// can only be worked from a dug neighbour, so chained orders wait their turn.
const ROOM_CREW = 3;
export function reachable(s, x, y){ return nestField(s, x, y)[nidx(SHAFT,0)] < 9999; }
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
export function builderTaskValid(s, a){
  if (!a.task || !taskExists(s, a.task)) return false;
  const spot = taskSpot(s, a, a.task); if (!spot) return false;
  if (a.task[0] !== 'j') a.taskCell = spot; // a neighbour may have opened up nearer
  return true;
}
export function pickBuilderTask(s, a){
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
export function nestStep(s, a, speed, dt){
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
// Build 51: rain that matters to your ants (not with the Raft Colony).
export const wet = s => s.rain.on && !has(s, 'raft');
export function tickRain(s, dt){
  const r = s.rain; r.t += dt;
  // Thunder in the distance twenty seconds before it rains (build 14).
  if (!r.on && !r.warned && r.t >= r.next - 20 && s.queen.placed){ r.warned = true; s.events.push('rainsoon'); note(s, 'Thunder in the distance. Rain is coming: get your builders inside.'); }
  // Rain every 8 to 12 minutes (build 14: was every 3 to 5).
  if (!r.on && r.t >= r.next){ r.on = true; r.warned = false; r.t = 0; r.next = 480 + Math.random()*240; s.events.push('rain'); note(s, 'Rain! Trails wash out.' + (buildersInside(s) ? '' : ' Get a Builder inside.')); }
  else if (r.on){
    if (roomSlotIndex(s, 'cistern') >= 0) s.colony.water = Math.min(s.colony.waterCap, s.colony.water + (has(s, 'raft') ? 0.8 : 0.4)*dt); // build 51: Raft Colony, twice
    if (r.t >= 30){ r.on = false; r.t = 0; if (!buildersInside(s) && s.queen.placed && canCave(s) && !has(s, 'chimneys') && !has(s, 'raft') && !picked(s, 'builder', 'tunnelmaster')){ let fell = collapse(s, true); if (!has(s, 'insulation') && !picked(s, 'builder', 'shorer')) fell = collapse(s, true) || fell; if (fell) note(s, 'The rain caved in a tunnel.'); } }
  }
}
export function buildersInside(s){ return s.ants.filter(a => a.caste==='builder' && a.team===0 && (a.state==='in' || a.state==='build')).length; }
/* Build 47: a young colony with no Builder yet (under 12 ants) can't be caved in; nobody could dig it out. */
function canCave(s){ return s.ants.some(b => b.caste==='builder' && b.team===0 && !b.dh) || antCount(s) >= 12; }
function tickRepairs(s){
  const c = s.colony;
  for (let i=s.repairs.length-1;i>=0;i--){ const rep = s.repairs[i], crew = s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.atWork && a.task === 'r'+rep.x+','+rep.y); rep.progress += crew.reduce((t, a) => t + workOf(s, a, 'r'), 0)*(has(s, 'beetles') ? 1.5 : 1)*(c.trophies && c.trophies.croak ? 4 : 1); /* build 54: the Ditch's mud */ if (rep.progress >= 8){ for (const a of crew) gainXp(s, a, 2); dig(s, rep.x, rep.y); s.repairs.splice(i,1); c.repaired++; } }
}
export function tickMaintenance(s, dt){
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
export function playerDig(s, cx, cy){
  const a = s.player.ant; if (!a || !s.player.inNest) return false; const px = Math.floor(a.nx), py = Math.floor(a.ny);
  if (Math.abs(cx-px) + Math.abs(cy-py) !== 1) return false; const i = s.repairs.findIndex(r => r.x===cx && r.y===cy); if (i < 0) return false;
  dig(s, cx, cy); s.repairs.splice(i, 1); s.colony.repaired++; gainXp(s, a, 2); return true;
}
