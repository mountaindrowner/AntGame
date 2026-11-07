// What the UI asks for: recruiting, eggs, rooms, upgrades, and the numbers it shows (stats).
import { EVO_BY, UPGRADES } from './growth.js';
import { CASTES, CASTE_EVO, CASTE_ROOM, QUEEN_UP, ROOMS, SOIL, T, roomCap, roomCount, roomLevel, soilTier } from './core.js';
import { exitNest, payCost, roomsChanged } from './colony.js';
import { mkAnt } from './world.js';
import { growRoom, roomOf, roomPlan, roomSlotIndex, snapPlan } from './nest.js';
import { crewCap, eggCost, has, picked, roomCost, upgradeCaste } from './progress.js';
import { dRoomBuilt } from './daughters.js';

export function recruit(s, n){
  const a = s.player.ant; if (!a || s.player.inNest) return 0; const w = s.world; let got = 0;
  n = Math.min(n, crewCap(s) - s.ants.filter(o => o.follow).length); if (n <= 0) return 0; // build 68: the cap is on your whole crew (holding ones too), not each press
  const nearHome = Math.hypot(a.tx - w.ex, a.ty - w.ey) < 3.5;
  const cands = s.ants.filter(o => !o.isPlayer && !o.team && o.state !== 'dead' && !o.follow && (
    ((o.state==='explore' || o.state==='patrol' || (o.state==='return' && !o.carry)) && Math.hypot(o.x-a.x, o.y-a.y) < (picked(s, 'you', 'rally') ? 10 : 7)*(has(s, 'rally') ? 1.5 : 1)*T) || (nearHome && o.state === 'in' && o.goal !== 'job')));
  // Fighters answer first, so a recruited crew near the nest can be an army.
  cands.sort((p,q) => CASTES[q.caste].fight - CASTES[p.caste].fight || (p.state==='in'?1:0) - (q.state==='in'?1:0) || Math.hypot(p.x-a.x,p.y-a.y) - Math.hypot(q.x-a.x,q.y-a.y));
  for (const o of cands){ if (got >= n) break; if (o.state === 'in'){ o.x = (w.ex+0.5)*T; o.y = (w.ey+0.5)*T; o.tx = w.ex; o.ty = w.ey; } o.follow = true; o.state = 'follow'; o.goal = null; got++; }
  return got;
}
export function release(s){ let n = 0; for (const o of s.ants){ if (o.follow){ o.follow = false; o.fetch = null; o.state = o.carry ? 'return' : 'explore'; o.explore = 0; o.rest = 0; n++; } } return n; }
export function queueEgg(s, caste){
  const c = s.colony, C = CASTES[caste]; if (!C || !s.queen.placed) return false;
  if (caste === 'soldier' && roomSlotIndex(s,'barracks') < 0) return false;
  if (caste === 'nurse' && roomSlotIndex(s,'nursery') < 0) return false;
  if (caste === 'venom' && !c.trophies.spider) return false;
  if (eggLock(s, caste)) return false; // build 40: the same rules the menu shows
  if (c.eggQueue.length >= 10) return false;
  if (!payCost(c, eggCost(s, caste))) return false; c.eggQueue.push(caste); return true;
}
export function eggLock(s, caste){ const c = s.colony; if (CASTE_EVO[caste] && !has(s, CASTE_EVO[caste])) return 'evolve ' + EVO_BY[CASTE_EVO[caste]].name + ' first'; if (CASTE_ROOM[caste] && !roomOf(s, CASTE_ROOM[caste]) && !ROOMS[CASTE_ROOM[caste]].evo) return 'needs a ' + ROOMS[CASTE_ROOM[caste]].name; if (CASTE_ROOM[caste] && !roomOf(s, CASTE_ROOM[caste])) return 'needs ' + (has(s, ROOMS[CASTE_ROOM[caste]].evo) ? 'a ' : 'to evolve and build a ') + ROOMS[CASTE_ROOM[caste]].name; if (caste==='soldier' && roomSlotIndex(s,'barracks')<0) return 'needs Barracks'; if (caste==='nurse' && roomSlotIndex(s,'nursery')<0) return 'needs Nursery'; if (caste==='venom' && !c.trophies.spider) return 'needs spider fang'; return ''; }
// Why another of this room can't be placed now, or ''.
export function roomLock(s, room){
  const n = roomCount(s, room), q = s.colony.buildQueue.filter(j => j.room === room).length;
  if (q) return 'being built';
  if (room === 'armory'){ if (!s.colony.trophies.shell) return 'needs the ground beetle’s shell'; if (n) return 'built'; }
  if (ROOMS[room].evo && !has(s, ROOMS[room].evo)) return 'evolve ' + EVO_BY[ROOMS[room].evo].name + ' first';
  if (n >= roomCap(s)) return n ? `${n} of ${roomCap(s)}: upgrade the queen for another` : 'upgrade the queen';
  return '';
}
// Room levels (build 23): why this room kind can't go up a level now, or ''.
export function pickLineage(s, k){ const c = s.colony; if (!has(s, 'lineage') || c.lineage || !['acid', 'trapjaw', 'bullet'].includes(k)) return false; c.lineage = k; s.player.msg = 'Your line is ' + { acid: 'Acid', trapjaw: 'Trap-jaw', bullet: 'Bullet' }[k] + ', for good.'; return true; }
export function roomUpLock(s, key){ const R = ROOMS[key], n = roomLevel(s, key); if (!R.lv) return 'no levels'; if (!roomCount(s, key)) return 'build one first'; if (key === 'fungus' && n === 2 && !dRoomBuilt(s, 'greenhouse')) return 'needs the Garden’s Greenhouse'; /* build 50 */ if (n > R.lv.length) return 'top level'; return ''; }
export function upgradeRoom(s, key){ if (roomUpLock(s, key)) return false; const c = s.colony, n = roomLevel(s, key); if (!payCost(c, ROOMS[key].lv[n - 1].cost)) return false; if (!c.roomLv) c.roomLv = {}; c.roomLv[key] = n + 1; let grew = 0; for (const r of s.nest.rooms) if (r.key === key && !r.grow && growRoom(s, r)) grew++; roomsChanged(s); /* build 74: and it grows a column */ s.player.msg = `${ROOMS[key].name} is now level ${['', 'I', 'II', 'III'][n + 1]}: ${ROOMS[key].lv[n - 1].fx.replace(/^./, ch => ch.toLowerCase())}.${grew ? ' Builders dig it a column wider.' : ''}`; s.events.push('roomdone'); return true; }
// Build 40: cancel every room still waiting to be built. Not started, all its cost back; started, half.
export function cancelBuilds(s){
  const c = s.colony; let n = 0;
  for (const j of c.buildQueue){ const cost = j.paid || roomCost(s, j.room, roomCount(s, j.room)), k2 = j.progress > 0 ? 0.5 : 1; for (const k in cost){ const back = Math.floor(cost[k]*k2); if (k === 'food') c.store = Math.min(c.cap, c.store + back); else c[k] = (c[k] || 0) + back; } n++; }
  c.buildQueue.length = 0; const growing = o => s.nest.rooms.some(r => r.grow === o.x && o.y >= r.y0 && o.y < r.y0 + (r.h || 3)); s.nest.digOrders = s.nest.digOrders.filter(o => !o.plan || o.progress > 0 || growing(o)); for (const o of s.nest.digOrders) if (!growing(o)) delete o.plan; /* build 74: a plan's digs go with it (ones begun are finished) */ c.water = Math.min(c.water, c.waterCap); return n; // (build 47: refunds never past the caps)
}
// Build 74: a room goes where you put it (at: its top-left), or snapped round a cell, in a closed chamber with
// one or two doorways (roomPlan). On solid soil it's a plan: its cells become dig orders and it waits until dug.
export function queueRoom(s, room, cell, at){
  const c = s.colony, R = ROOMS[room]; if (!R || !s.queen.placed || !(cell || at)) return false;
  if (roomLock(s, room)) return false;
  const plan = at ? roomPlan(s, room, at[0], at[1]) : snapPlan(s, room, cell[0], cell[1]); if (!plan.ok) return false;
  if (!payCost(c, roomCost(s, room))) return false;
  const door = plan.dig.find(([x, y]) => plan.door.some(d => d[0] === x && d[1] === y)) || null;
  c.buildQueue.push({ room, x0: plan.x0, y0: plan.y0, w: R.w, h: R.h, progress: 0, x: plan.x0+1, y: plan.y0+1, paid: roomCost(s, room, roomCount(s, room)), ...(plan.dig.length ? { wait: true, door } : {}) });
  for (const [x, y] of plan.dig) if (!s.nest.digOrders.some(o => o.x === x && o.y === y)) s.nest.digOrders.push({ x, y, ax: x, ay: y, progress: 0, need: SOIL[soilTier(y)].work, plan: true });
  const mine = (x, y) => (x >= plan.x0 && x < plan.x0 + R.w && y >= plan.y0 && y < plan.y0 + R.h) || (door && door[0] === x && door[1] === y);
  s.nest.fillOrders = s.nest.fillOrders.filter(o => !mine(o.x, o.y)); // build 40: a room's ground isn't filled in
  return true;
}
// Build 74 (Phase 4: "faster passages, an upgrade"): builders pack and smooth the galleries; every ant walks
// 40% faster in the nest. Bought once, from the Build menu, with a Workshop.
export const PASSAGES = { cost: { food: 30, grit: 40 }, speed: 1.4 };
export function passagesLock(s){ if (s.colony.passages) return 'done'; if (!roomOf(s, 'workshop')) return 'needs a Workshop'; return ''; }
export function buyPassages(s){ if (passagesLock(s) || !payCost(s.colony, PASSAGES.cost)) return false; s.colony.passages = true; s.player.msg = 'Packed passages: your ants walk the nest 40% faster.'; s.events.push('roomdone'); return true; }
// The old "Train foragers": the Forager's next level, taking the first pick if it has one.
export function upgradeForage(s){ const U = UPGRADES.forager[s.colony.forage || 0]; return !!U && upgradeCaste(s, 'forager', U.picks ? U.picks[0][0] : undefined); }
export function upgradeQueen(s){ const q = s.queen, c = s.colony; const cost = QUEEN_UP[q.level]; if (!cost || !payCost(c, cost)) return false; q.level++; return true; }
export function antCount(s){ return s.ants.filter(a => !a.team && !a.dh).length; } // (build 46: the main nest's; a daughter counts her own)
export function stress(s, n){ for (let i=0;i<n;i++){ const a = mkAnt(s, 'forager', 'in', s.world.ex, s.world.ey, 0); exitNest(s, a, 'explore'); } }
export function stats(s){
  const c = s.colony; let inside = 0, out = 0, rival = 0; const byCaste = {};
  for (const a of s.ants){ if (a.isPlayer) continue; if (a.team){ rival++; continue; } byCaste[a.caste] = (byCaste[a.caste]||0)+1; if (a.state==='in'||a.state==='build') inside++; else out++; }
  return { inside, out, rival, byCaste, income: c.delivered.reduce((x,y)=>x+y,0), upkeep: c.eaten.reduce((x,y)=>x+y,0), followers: s.ants.filter(a=>a.follow).length };
}
