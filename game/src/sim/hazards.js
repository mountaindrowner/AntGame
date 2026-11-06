// Hazards: the mower, antlion pits, things that come down (feet, acorns, spray), birds and toads, fire ants.
import { AREAS, SCALE, areaBounds } from './yard.js';
import { CASTES, FOODS, H, T, idx } from './core.js';
import { killAnt } from './colony.js';
import { walk } from './world.js';
import { gainXp, has, picked } from './progress.js';
import { WILD_SIDE } from './wilds.js';
import { heldFx, hitOutpost, prizeFx } from './outposts.js';
import { isNight, untilTurn } from './tick.js';
import { LAWN_ZONE, ROT_ZONE, SIDE_ZONE, WET_ZONE } from './bosses.js';

// The Lawn's mower: a warning, then a blade sweeping the whole Lawn north to
// south, killing anything in the grass and shredding trails and seeds.
export function tickMower(s, dt){
  const m = s.mower, P = s.player, L = s.world.lawn; if (!s.queen.placed) return; m.t += dt;
  if (m.state === 'idle'){ if (s.t >= m.next && isNight(s)) m.next = s.t + untilTurn(s) + 90 + Math.random()*90; /* build 43: people mow a while after dawn, not at first light */ if (s.t >= m.next && !isNight(s)){ m.state = 'warn'; m.t = 0; s.events.push('mower'); if (P.ant && !P.inNest) P.mowerAt = s.t; } return; } // build 68: a word mid-screen (the UI), not a notice
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
export function tickPits(s, dt){
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
export const DROP = {
  foot:  { warn: 2.2, hold: 1.2, lift: 0.8, a: 9, b: 3.4, cause: 'foot', msg: 'A shadow! Get out from under it!', ev: 'feet' },
  acorn: { warn: 1.6, hold: 0.3, lift: 0.1, a: 2.4, b: 2.4, cause: 'acorn', msg: 'An acorn is falling! Move!', ev: 'acorn' },
  spray: { warn: 2.0, hold: 2.2, lift: 0.6, a: 6, b: 6, cause: 'spray', msg: 'Bug spray! Get out of the mist!', ev: 'spray' },
};
export const HUNT = {
  bird: { land: 1.4, peck: 1.3, pecks: 4, leave: 1.2, reach: 1.6, hop: 2.5, sight: 12, scare: 5, cause: 'bird', name: 'robin', msg: 'A robin! Run, or bring five fighters.', ev: 'bird' },
  toad: { land: 1.0, peck: 1.7, pecks: 5, leave: 1.0, reach: 5, hop: 1.2, sight: 10, scare: 5, cause: 'toad', name: 'toad', msg: 'A toad! Keep your distance.', ev: 'toad' },
};
export const outside = a => a.state !== 'dead' && a.state !== 'in' && a.state !== 'build' && a.state !== 'nest' && a.state !== 'away';
// Inside a drop's print (x, y in tiles), scaled by k.
const underFoot = (st, x, y, k) => { const D = DROP[st.kind], dx = x - st.x, dy = y - st.y, c = Math.cos(st.yaw), n = Math.sin(st.yaw), u = (dx*c + dy*n)/(D.a*k), v = (-dx*n + dy*c)/(D.b*k); return u*u + v*v <= 1; };
const PICNIC_FEET = { kind: 'foot', every: [16, 28] }; // feet round a picnic (build 19)
export function tickStrikes(s, dt){
  if (!s.queen.placed) return;
  const w = s.world, P = s.player, pa = P.ant && !P.inNest ? P.ant : null;
  const out = new Map();
  for (const a of s.ants){ if (!outside(a)) continue; const r = w.area[idx(a.tx,a.ty)]; if (!out.has(r)) out.set(r, []); out.get(r).push(a); }
  // New visitors: each region's clock only runs while ants are about.
  for (let i=0;i<AREAS.length;i++){ const st = s.event && s.event.key === 'picnic' && s.event.data.region === i ? PICNIC_FEET : AREAS[i].strike; if (st && st.kind === 'bird' && WILD_SIDE[i] === 'west' && s.colony.trophies.blackfeather) continue; /* build 55 */ if (!st || !s.active[i] || s.strikes.some(k => k.region === i)) continue;
    if (st.kind === 'bird' && s.colony.kills.robin && LAWN_ZONE.has(AREAS[i].key)) continue;
    if (st.kind === 'toad' && s.colony.kills.toad && WET_ZONE.has(AREAS[i].key)) continue;
    if (st.kind === 'spray' && s.colony.kills.widow && SIDE_ZONE.has(AREAS[i].key)) continue;
    if (st.kind === 'toad' && s.colony.kills.centipede && ROT_ZONE.has(AREAS[i].key)) continue; // build 36: the centipede beaten // build 35: the widow beaten // build 31: Old Warty beaten // build 30: the Old Robin driven off, no robins over the lawn
    if (isNight(s) && (st.kind === 'foot' || st.kind === 'bird' || st.kind === 'spray')) continue; // build 43: people and birds are in bed
    const here = out.get(i); if (!here) continue;
    s.strikeT[i] -= dt*(st.kind === 'toad' && isNight(s) ? 1.8 : 1)*(s.wild && s.wild.stirred && WILD_SIDE[i] && !s.wild.beaten[WILD_SIDE[i]] ? 1.5 : 1); /* build 53: a stirred edge strikes half again as often */ /* (toads hunt at night) */ if (s.strikeT[i] > 0) continue;
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
export function tickStings(s, dt){
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
