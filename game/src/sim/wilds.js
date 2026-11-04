// The wilds (build 53, docs/WILDS.md): the yard's outer ring stirs; standing orders and musters; climbing
// the Oak (build 57); the Cordyceps spores and the infected (build 56).
import { RANKS } from './growth.js';
import { AREA, AREAS, REGION, areaBounds } from './yard.js';
import { CASTES, RIVALS, T, idx } from './core.js';
import { exitNest, killAnt } from './colony.js';
import { itemAt, mkAnt, walk } from './world.js';
import { gainGlow } from './nest.js';
import { has } from './progress.js';
import { DAUGHTERS, daughterAnts } from './daughters.js';
import { outside } from './hazards.js';
import { BUGS, bugMove, bugWander, nearAnt } from './creatures.js';
import { hurtAnt, spark } from './combat.js';
import { startEvent } from './events.js';

// The three sides farthest from the house: the west column (below the trash cans), the east column, the south row.
export const WILD_SIDE = AREAS.map(A => { const [c, r] = A.at; return r === 7 ? 'south' : c === 0 && r >= 2 ? 'west' : c === 9 ? 'east' : null; });
const WILD_STIR = 3; // joined daughters: with the main nest, four colonies (Mark: "amass at least three colonies" for the edges)
export const coloniesJoined = s => (s.daughters || []).filter(d => d.state === 'ready').length;
export function tickWild(s, dt){
  const W0 = s.wild || (s.wild = { stirred: false, at: null, beaten: {}, seams: [] });
  tickClimb(s, dt); // build 57
  if (!W0.stirred){ W0.chk = (W0.chk || 0) + dt; if (W0.chk < 2) return; W0.chk = 0; if (coloniesJoined(s) >= WILD_STIR) stirWild(s); return; }
  // Build 58: with the fire ants' queen dead, their mound caves in: the Sinkhole, an open seam (4 tiles).
  if (!W0.sinkhole && (s.colony.zones || {}).fire != null){ const team = RIVALS.findIndex(r => r.key === 'fire') + 1, n = s.world.rnests && s.world.rnests[team];
    if (n){ let x = n.x, y = n.y; for (let k = 0; k < 30 && !walk(s, x, y); k++){ x = n.x + Math.round((Math.random() - 0.5)*8); y = n.y + Math.round((Math.random() - 0.5)*8); }
      W0.sinkhole = { x, y, t: s.t }; W0.seams.push({ x, y, side: 'south', r: 4, sink: true }); s.active[REGION.firemound] = true;
      s.banner = { key: 'sinkhole', t: s.t, icon: '🕳', title: 'The ground gives way', line: 'Where the fire ants nested, their mound has caved in. At the bottom, the green seam lies open, and something huge stirs under it. That is why they were so fierce.', kind: 'hard' }; s.events.push('sinkhole'); } }
  if (W0.sinkhole && s.colony.trophies.blindclaw){ W0.sinkT = (W0.sinkT || 0) + dt; if (W0.sinkT >= 300){ W0.sinkT = 0; gainGlow(s, 1, 'quarry'); } }
  // Build 55: Nevermore's lure, a bottle cap by his roost while he lives (back after a minute if it goes).
  const cr = s.bosses && s.bosses.crow; if (cr && !cr.dead){ W0.capT = (W0.capT || 0) + dt; if (W0.capT >= 3){ W0.capT = 0;
    const has = s.items.some(f => f.type === 'cap' && f.amt > 0) || (s.player.big && s.player.big.type === 'cap');
    if (!has){ W0.capGone = (W0.capGone || 0) + 3; if (!W0.capPut || W0.capGone >= 60){ W0.capGone = 0; W0.capPut = true; for (let k = 0; k < 40; k++){ const x = Math.floor(cr.hx/T) + 6 + Math.floor(Math.random()*6), y = Math.floor(cr.hy/T) + Math.floor(Math.random()*7) - 3; if (walk(s, x, y) && !itemAt(s, x, y)){ s.items.push({ x, y, kind: 'food', type: 'cap', amt: 1 }); break; } } } } } }
  tickSpores(s, dt); // build 56
  // Glow sickness: an open seam burns the ants who stand on it.
  for (const m of W0.seams){ const mr = (m.r || 1.6) + 0.5; for (const a of s.ants){ if (a.team || !outside(a) || a.climb || Math.abs(a.x/T - m.x) > mr || Math.abs(a.y/T - m.y) > mr) continue;
    if (Math.hypot(a.x/T - (m.x + 0.5), a.y/T - (m.y + 0.5)) < (m.r || 1.6)){ hurtAnt(s, a, 0.25*dt, 'glow'); if (a.isPlayer && !W0.toldSeam){ W0.toldSeam = true; s.player.msg = '🟢 The ground here is warm and wrong. It burns. Don’t linger on the green.'; } } } }
}
export function stirWild(s){
  const W0 = s.wild, w = s.world; W0.stirred = true; W0.at = s.t;
  // Two open seams a side, on open ground.
  for (const side of ['west', 'south', 'east']){ const regs = AREAS.map((A, i) => i).filter(i => WILD_SIDE[i] === side);
    for (let k = 0, tries = 0; k < 2 && tries < 200; tries++){ const ri = regs[Math.floor(Math.random()*regs.length)], b = areaBounds(ri);
      const x = b.x0 + 8 + Math.floor(Math.random()*(AREA - 16)), y = b.y0 + 8 + Math.floor(Math.random()*(AREA - 16));
      if (!walk(s, x, y) || w.pit[idx(x, y)] || W0.seams.some(m => Math.hypot(m.x - x, m.y - y) < AREA)) continue; W0.seams.push({ x, y, side }); k++; } }
  s.banner = { key: 'wild-stir', t: s.t, icon: '🌑', title: 'Something stirs at the yard’s edges', line: 'Out by the fence, the ground cracks green. The edges are wild now: scent fades fast, the hazards come harder, and things are waking. Three colonies are needed out there: call a muster from the map.', kind: 'hard' };
  s.events.push('wildstir'); s.player.msg = '🌑 Something stirs at the yard’s edges.';
}
// Standing orders: how much of a colony's army answers a muster. Gather: none (and a daughter lays only foragers);
// Guard: half; Ready: all.
export const ORDERS = ['gather', 'guard', 'ready'], ORDER_SHARE = { gather: 0, guard: 0.5, ready: 1 };
export const orderOf = (s, key) => key === 'main' ? (s.colony.order || 'guard') : (((s.daughters || []).find(d => d.key === key) || {}).order || (key === 'war' ? 'ready' : 'guard'));
export function setOrder(s, key, order){ if (!ORDERS.includes(order)) return false; if (key === 'main'){ s.colony.order = order; return true; } const d = (s.daughters || []).find(q => q.key === key); if (!d) return false; d.order = order; return true; }
// Who would answer a muster now: per colony, how many fighters.
export function musterRoll(s){
  const out = [], isF = a => CASTES[a.caste].fight >= 3;
  const main = s.ants.filter(a => !a.team && !a.dh && !a.isPlayer && !a.follow && isF(a) && (a.state === 'in' || a.state === 'patrol' || a.state === 'fight' || a.state === 'explore' || a.state === 'return'));
  out.push({ key: 'main', name: 'Your nest', order: orderOf(s, 'main'), have: main.length, send: Math.floor(main.length*ORDER_SHARE[orderOf(s, 'main')]), ants: main });
  for (const d of s.daughters || []){ if (d.state !== 'ready') continue; const real = daughterAnts(s, d).filter(a => !a.follow && isF(a) && a.state !== 'muster'), abs = Object.entries(d.pop || {}).filter(([k]) => CASTES[k].fight >= 3).reduce((t, [, n]) => t + n, 0);
    const have = real.length + abs, o = orderOf(s, d.key); out.push({ key: d.key, name: DAUGHTERS[d.key].short, order: o, have, send: Math.floor(have*ORDER_SHARE[o]), ants: real, d }); }
  return out;
}
export function musterLock(s){ if (!coloniesJoined(s)) return 'needs a daughter joined by her tunnel'; if (s.muster) return 'one muster at a time: release this one first'; if (!musterRoll(s).some(r => r.send > 0)) return 'no colony has fighters to send: set one to Ready or Guard'; return ''; }
export function callMuster(s, x, y){
  if (musterLock(s) || !walk(s, x, y)) return false;
  const M = s.muster = { x, y, t0: s.t, sent: 0, from: {}, arrived: 0 };
  for (const r of musterRoll(s)){ let left = r.send; if (!left) continue; M.from[r.key] = left;
    for (const a of r.ants){ if (!left) break; left--; a.muster = true; a.foeId = 0; a.goal = null; if (a.state === 'in' || a.state === 'build') exitNest(s, a, 'muster'); else a.state = 'muster'; M.sent++; }
    if (left && r.d){ for (const k of Object.keys(r.d.pop)){ while (left > 0 && r.d.pop[k] > 0 && CASTES[k].fight >= 3){ r.d.pop[k]--; left--; const a = mkAnt(s, k, 'in', r.d.ex, r.d.ey, 0); a.dh = r.d.key; a.muster = true; if (r.d.key === 'war') a.xp = Math.max(a.xp || 0, RANKS[1].xp); exitNest(s, a, 'muster'); M.sent++; } } } }
  s.events.push('rally'); s.player.msg = `⚑ Muster called: ${M.sent} fighter${M.sent === 1 ? '' : 's'} march from ${Object.keys(M.from).length} colon${Object.keys(M.from).length === 1 ? 'y' : 'ies'}.`;
  return true;
}
export function endMuster(s){ if (!s.muster) return 0; let n = 0; for (const a of s.ants) if (a.muster && a.state !== 'dead'){ a.muster = false; a.follow = false; a.state = 'return'; a.holdX = null; n++; } s.muster = null; s.player.msg = n ? `The muster disbands: ${n} march home.` : 'The muster is over.'; return n; }
// Build 51: Swarm Day, called by you once every 20 minutes.
export function swarmCallLock(s){ if (!has(s, 'swarmcall')) return 'evolve Swarm Day first'; if (s.event) return 'something is already happening'; const left = (s.colony.swarmCallAt ?? -1e9) + 1200 - s.t; if (left > 0) return `ready in ${Math.ceil(left/60)} min`; return ''; }
export function callSwarm(s){ if (swarmCallLock(s)) return false; s.colony.swarmCallAt = s.t; startEvent(s, 'swarm'); return true; }
// Build 57: the Oak's Crown. Climbing: you (and your crew) go up the trunk's south face from the boss's spot at
// its foot; a.climb is height in px. The queen's nest hangs at CROWN.
export const CROWN = 420, CLIMB_UP = 48, CLIMB_DOWN = 110;
export function climbLock(s){ const P = s.player, a = P.ant, b = s.bosses && s.bosses.hornets; if (!a || P.inNest) return 'be outside'; if (!b || b.dead) return 'nothing to climb to'; if (Math.hypot(a.x - b.x, a.y - b.y) > 5*T) return 'go to the Oak’s foot'; if (P.climb) return 'climbing already'; return ''; }
export function climb(s){ if (climbLock(s)) return false; const P = s.player; P.climb = 'up'; P.tx = null; P.attack = null; for (const o of s.ants) if (o.follow && (o.state === 'follow' || o.state === 'hold') && Math.hypot(o.x - P.ant.x, o.y - P.ant.y) < 12*T){ o.state = 'climb'; o.climb = o.climb || 0; o.x = P.ant.x + (Math.random() - 0.5)*5*T; o.y = P.ant.y; } return true; }
export function climbDown(s){ const P = s.player; if (!P.climb) return false; P.climb = 'down'; return true; }
function tickClimb(s, dt){
  const P = s.player, me = P.ant;
  if (P.climb && me){ me.state = 'climb'; me.climb = me.climb || 0;
    if (P.climb === 'up') me.climb = Math.min(CROWN, me.climb + CLIMB_UP*dt); else { me.climb = Math.max(0, me.climb - CLIMB_DOWN*dt); if (!me.climb){ P.climb = null; me.state = 'player'; } } }
  for (const a of s.ants){ if (a.state !== 'climb' || a.isPlayer) continue;
    const want = P.climb === 'up' && me ? me.climb : 0; // the crew climbs with you, a little behind
    if (a.climb < want - 6) a.climb = Math.min(want, a.climb + CLIMB_UP*1.05*dt); else if (a.climb > want) a.climb = Math.max(want, a.climb - CLIMB_DOWN*dt);
    if (!a.climb && (!P.climb || P.climb === 'down')){ a.climb = 0; a.state = 'follow'; } }
}
// Build 56: the Cordyceps Colony. The heart doesn't move. Waves of infected ants pour out (8, or 12 when it
// rages), every 20 seconds (14); spore clouds burst where a green ring shows. Six infected near the heart
// shield it (bites do 30%).
export function spawnZbug(s, x, y){ const B = BUGS.zombie, a = Math.random()*Math.PI*2; const b = { id: s.nextId++, kind: 'zombie', region: null, hx: Math.floor(x/T), hy: Math.floor(y/T), x, y, dx: Math.cos(a), dy: Math.sin(a), hp: B.hp, maxHp: B.hp, state: 'walk', t: 0, life: 0 }; s.critters.push(b); return b; }
export function sporeAnt(s, a){ if (a.team || a.isPlayer || a.hspore != null || s.colony.trophies.sporeheart) return; a.hspore = 0; }
// An infected ant hunts the nearest of yours; its bite hurts and may spore it. It rots away after two minutes.
export function stepZbug(s, b, B, dt){
  if (b.life > 120){ b.gone = true; return; }
  b.biteT = Math.max(0, (b.biteT || 0) - dt);
  const n = nearAnt(s, b, 16*T);
  if (!n){ bugWander(s, b, 3); return; }
  const [a, d] = n;
  if (d < B.reach*T){ b.dx = (a.x - b.x)/(d || 1); b.dy = (a.y - b.y)/(d || 1); if (!b.biteT){ b.biteT = 1.2; b.pinchAt = s.t; spark(s, null, a.x, a.y, 1); hurtAnt(s, a, a.isPlayer ? 1 : 1.5, 'cordyceps'); if (Math.random() < 0.3) sporeAnt(s, a); } }
  else bugMove(s, b, a.x, a.y, B.rush, dt);
}
// Spores (tickWild): a spored ant dies in 25 seconds and rises as one of them, unless a medic out in the yard
// reaches it (4 tiles) or it gets inside a nest (inside, it soon shakes the spores off; no nurse needed).
function tickSpores(s, dt){
  for (const a of s.ants){ if (a.hspore == null || a.state === 'dead') continue; a.hspore += dt;
    const inside = a.state === 'in' || a.state === 'build';
    if (inside || s.ants.some(m => m.caste === 'medic' && !m.team && outside(m) && Math.abs(m.x - a.x) < 4*T && Math.abs(m.y - a.y) < 4*T)){ if (Math.random() < dt*(inside ? 0.5 : 0.8)){ a.hspore = null; s.colony.sporeCured = (s.colony.sporeCured || 0) + 1; } continue; }
    if (a.hspore >= 25){ const x = a.x, y = a.y, out = outside(a); a.hspore = null; killAnt(s, a, 'cordyceps'); if (out && a.state === 'dead') spawnZbug(s, x, y); } }
}
