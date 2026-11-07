// Your ant: moving, digging, actions, your crew (attack, hold, follow, build 26 and 29), zones taken.
import { ZONES } from './growth.js';
import { CASTES, FOODS, H, NH, NW, SHAFT, SURF, T, W, heavy, idx, nidx, rspec } from './core.js';
import { addSugar, deposit, killAnt } from './colony.js';
import { findPath, itemAt, raiseAlarm, walk } from './world.js';
import { carveRoom, dig, nestStep } from './nest.js';
import { GRAIN, bite, discover, gainXp, has, maxHp, picked, storeCap, youHp, youL, youPace } from './progress.js';
import { heldFx } from './outposts.js';
import { endRaid } from './raids.js';
import { CAT_REACH, SPIDER_REACH } from './spider.js';
import { outside } from './hazards.js';
import { BUGS, knock } from './creatures.js';
import { spark, swing } from './combat.js';
import { BOSSES } from './bosses.js';

export function stepPlayer(s, a, dt, enemiesNear){
  const P = s.player, w = s.world;
  if (P.inNest && P.nestKey){
    // Build 50: inside a daughter's nest you look round from her shaft; leaving puts you out at her door.
    const d = (s.daughters || []).find(q => q.key === P.nestKey);
    if (!d || d.state !== 'ready' || P.exiting){ P.exiting = false; P.ntx = null; P.inNest = false; P.nestKey = null; const ex = d ? d.ex : w.ex, ey = d ? d.ey : w.ey; a.tx = ex; a.ty = ey; a.x = (ex+0.5)*T; a.y = (ey+0.5)*T; a.state = 'player'; P.tx = null; return; }
    a.nx = SHAFT + 0.5; a.ny = 0.5; P.ntx = null; P.hunger = Math.min(100, P.hunger + 10*dt); return;
  }
  if (P.inNest){
    // walk inside the nest
    if (P.ntx != null){ a.ntx = P.ntx; a.nty = P.nty; }
    const arrived = nestStep(s, a, 70, dt);
    if (arrived && P.ntx != null && Math.floor(a.nx) === SHAFT && Math.floor(a.ny) === 0 && P.exiting){ P.exiting = false; P.ntx = null; P.inNest = false; a.tx = w.ex; a.ty = w.ey; a.x = (w.ex+0.5)*T; a.y = (w.ey+0.5)*T; a.state = 'player'; P.tx = null; return; }
    if (arrived) P.ntx = null;
    P.hunger = Math.min(100, P.hunger + 10*dt);
    return;
  }
  if (P.climb){ P.hunger = Math.max(0, P.hunger); return; } // build 57: on the trunk (tickClimb moves you)
  if (a.knockT > 0){ knock(s, a, dt); P.pathKey = -1; return; }
  let moving = false;
  // Lifting a treat: the crew sets the pace, and too small a crew drops it.
  const onTrail = s.trail[idx(Math.max(0, Math.min(W-1, a.tx)), Math.max(0, Math.min(H-1, a.ty)))] >= 0.3;
  let speed = youPace(s)*SURF*(a.slowT > 0 ? 0.5 : 1)*(a.webT > s.t ? 0 : 1)*(has(s, 'highways') && onTrail ? 1.25 : 1)*(a.caste === 'forager' && onTrail ? 1.2 : 1); // build 74: a forager you play is a fifth faster on trails
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
  // Build 69: an empty stomach drains your health (about eight seconds from full) instead of killing you on
  // the spot, as in most survival games: time to get to food. It's still "You starved."
  if (P.hunger <= 0){ if (has(s, 'stomach')) P.hunger = 1; else { P.hunger = 0; P.starving = true; a.hp -= Math.max(youHp(s), maxHp(s, a))/8*dt; if (a.hp <= 0){ killAnt(s, a, 'hunger'); return; } } }
  else P.starving = false;
  if (moving && (P.mark || a.carry)){ const i = idx(a.tx, a.ty); s.trail[i] = Math.min(5, s.trail[i] + 2.5*dt); s.hot.add(i); }
  if (a.carry && nearHome){ deposit(s, a); }
  youTend(s, a, dt);
  if (P.big && nearHome) deliverBig(s);
  // fight: player bites enemies / cat adjacent
  const pm = Math.max(youHp(s), maxHp(s, a)), yb = youL(s) >= 3 ? 1.5 : 1;
  // Build 27: you duel too, a swing every 0.6 s, at twice an ant's bite; your rolls show by your health.
  const en = enemiesNear(a, 1); if (en.length){ const o = en.find(q => q.id === a.foeId) || en[0]; a.foeId = o.id; a.rollT = (a.rollT || 0) - dt; if (a.rollT <= 0){ a.rollT = 0.9; /* build 71: was 0.6, with the ants' slower rounds */ swing(s, a, o, 2*yb); } } else { a.foeId = 0; if (a.hp < pm && !P.starving) a.hp = Math.min(pm, a.hp + 1*dt); } // (no healing while starving)
  if (a.burnT > 0){ a.burnT -= dt; a.hp -= dt/3*0.6; if (a.hp <= 0){ killAnt(s, a, 'fireants'); return; } }
  if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < CAT_REACH){ const dmg = bite(s, a, 'cat')*yb*dt; s.cat.hp -= dmg; s.cat.hitT = s.t; spark(s, a, (a.x + s.cat.x)/2, (a.y + s.cat.y)/2, 0); gainXp(s, a, dmg/3); }
  if (P.enterReq && P.enterKey){ const d = (s.daughters || []).find(q => q.key === P.enterKey); /* build 50: in at her door */
    if (!d || d.state !== 'ready'){ P.enterReq = false; P.enterKey = null; }
    else if (Math.hypot(a.tx - d.ex, a.ty - d.ey) < 3){ P.enterReq = false; P.enterKey = null; P.inNest = true; P.nestKey = d.key; P.tx = null; a.nx = SHAFT+0.5; a.ny = 0.5; a.ntx = SHAFT; a.nty = 0; P.ntx = null; a.state = 'nest'; } }
  if (P.enterReq && !P.enterKey && nearHome){ P.enterReq = false; P.nestKey = null; P.inNest = true; P.tx = null; a.nx = SHAFT+0.5; a.ny = 0.5; a.ntx = SHAFT; a.nty = 0; P.ntx = null; a.state = 'nest'; }
}

// ---------- player / UI actions ----------
export function queenDig(s, cx, cy){
  const q = s.queen; if (s.phase !== 'dig' || q.placed) return false;
  if (Math.abs(cx - q.x) + Math.abs(cy - q.y) !== 1) return false;
  if (cx<1||cy<0||cx>=NW-1||cy>=NH) return false;
  if (q.energy <= 0) return false;
  if (!s.nest.cells[nidx(cx,cy)]){ dig(s, cx, cy); q.energy--; }
  q.x = cx; q.y = cy; return true;
}
export function buildNest(s){
  const q = s.queen; if (q.placed) return false; if (q.y < 2) return false;
  const x0 = Math.max(1, Math.min(NW-5, q.x-1)), y0 = Math.max(1, Math.min(NH-3, q.y-1));
  const r = carveRoom(s, { x0, y0, w:4, h:3 }, 'queen'); q.room = r; q.placed = true; q.x = x0+1; q.y = y0+1; s.phase = 'play';
  s.colony.eggQueue.push('forager'); s.player.pending = true; s.player.msg = '';
  return true;
}
export function actionLabel(s){ const a = s.player.ant, P = s.player; if (!a || P.inNest) return null; if (P.big) return 'Set down'; if (a.carry) return 'Drop'; const f = itemAt(s, a.tx, a.ty); if (f && heavy(f)) return `Lift ${crewAt(s)}/${FOODS[f.type].crew}`; if (f) return 'Pick up'; return null; }
export function doAction(s){
  const a = s.player.ant, P = s.player; if (!a || P.inNest) return;
  if (P.big){ dropBig(s); return; }
  if (a.carry){ const f = s.items.find(x => x.x===a.tx && x.y===a.ty && x.kind===a.kind && !heavy(x)); if (f) f.amt += a.carry; else s.items.push({ x:a.tx, y:a.ty, amt:a.carry, kind:a.kind, type: a.kind==='food'?(FOODS[a.itype] && !FOODS[a.itype].crew ? a.itype : 'crumb'):a.kind==='water'?'dew':a.kind==='grit'?'pebble':'spider' }); a.carry = 0; return; }
  const f = itemAt(s, a.tx, a.ty);
  if (f && heavy(f)){ const crew = crewAt(s), need = FOODS[f.type].crew;
    if (crew >= need){ P.big = f; f.carried = true; P.msg = 'Lifted! Walk it home; your crew carries it with you.'; }
    else P.msg = `Too heavy: ${crew} of ${need} ants. Recruit more.`;
    return; }
  if (f){ const take = Math.min(youLoad(s, a, f), f.amt); f.amt -= take; a.carry = take; a.kind = f.kind; a.itype = f.type; crewGather(s, a, f); }
}
// What your ant can do as each kind (build 74), for the rebirth choice and your card.
export const YOU_AS = {
  forager: 'Carries 8 a load, a fifth faster on trails', builder: 'Digs and builds itself, at twice a builder; raises outposts fast',
  nurse: 'Two nurses by the eggs; heals your crew', medic: 'Heals your crew fast, even fighting; cures the fungus',
  harvester: 'Carries seed in double loads', replete: 'Carries 12 food in its crop',
  soldier: 'Bites three times as hard as a forager', venom: 'Bites eight times as hard: kills big things', major: 'Bites five times as hard; very tough', supermajor: 'Bites ten times as hard; a tank',
};
// Build 74 (Mark: "if we can birth it as different ants it should have those abilities, or what else is it for?"):
// your load by your kind. A forager carries 8 (12 with Big jaws), a harvester seed in double loads, a replete 12 food in its crop.
export function youLoad(s, a, f){
  const big = picked(s, 'you', 'bigjaws'); let n = a.caste === 'forager' ? (big ? 12 : 8) : big ? 8 : 5;
  if (f && f.kind === 'food'){ if (a.caste === 'harvester' && GRAIN[f.type]) n *= 2; if (a.caste === 'replete') n = Math.max(n, 12); }
  return n;
}
// A nurse you play heals the crew round you when it isn't fighting; a medic twice as fast, fighting or not, and
// it cures Cordyceps near it.
function youTend(s, a, dt){
  const k = a.caste === 'nurse' ? 0.25 : a.caste === 'medic' ? 0.5 : 0; if (!k) return;
  for (const o of s.ants){ if (o === a || o.team || !o.follow || !outside(o) || Math.abs(o.x - a.x) > 3*T || Math.abs(o.y - a.y) > 3*T) continue;
    if (a.caste === 'nurse' && o.hitT > s.t - 2) continue;
    const m = maxHp(s, o); if (o.hp < m) o.hp = Math.min(m, o.hp + k*dt);
    if (a.caste === 'medic' && (o.hspore || (o.infect != null && !o.zombie)) && Math.random() < dt*0.3){ o.hspore = null; o.infect = null; } }
}
// Build 74 (Mark: "none of your ants got water"): when you pick something up, each ant of your crew close by takes a
// load of the same kind from the nearest pile within eight tiles, carries it with you, and delivers when you do.
export const GATHER_R = 8;
function crewGather(s, a, f){
  const piles = s.items.filter(x => x.kind === f.kind && !heavy(x) && !x.carried && x.amt > 0 && Math.abs(x.x - a.tx) <= GATHER_R && Math.abs(x.y - a.ty) <= GATHER_R);
  if (!piles.length) return 0; let n = 0;
  for (const o of s.ants){ if (o.team || !o.follow || o.state !== 'follow' || o.carry || o.fetch || Math.hypot(o.x - a.x, o.y - a.y) > 6*T) continue;
    let best = null, bd = Infinity; for (const x of piles){ if ((x.claim || 0)*5 >= x.amt) continue; const d = Math.hypot(x.x - o.x/T, x.y - o.y/T); if (d < bd){ bd = d; best = x; } } // a load each, so they spread over the piles
    if (!best) break; best.claim = (best.claim || 0) + 1; o.fetch = { x: best.x, y: best.y, kind: f.kind }; n++; }
  for (const x of piles) delete x.claim;
  if (n && !s.seen.gather){ s.seen.gather = true; s.player.msg = `Your crew gathers too: ${n} go for ${f.kind === 'water' ? 'water' : 'a load each'}, and they deliver when you do.`; }
  return n;
}
// You plus every recruited ant within three tiles.
// Build 26: attack on purpose (Mark: "you recruit everybody and then you attack on purpose... you hover
// over an enemy and it causes ants to begin a combat where they just bite at it"). With a crew, point at an
// enemy: the crew leaves your side, charges it and bites until it falls, then falls back in.
export const ATTACK_LEASH = 22; // tiles from you a crew will chase before giving up
export function enemyAt(s, x, y){
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
export function attackTarget(s){
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
export function attackReach(s, A){ return A.kind === 'anchor' ? 0.8*T : A.kind === 'door' ? 1.2*T : A.kind === 'boss' ? (BOSSES[A.ref].r + 0.5)*T : A.kind === 'spider' ? SPIDER_REACH*0.8 : A.kind === 'cat' ? CAT_REACH*0.8 : A.kind === 'bug' ? 0.9*T : A.kind === 'stalk' ? 1.2*T : 0.5*T; }
export const crewSize = s => s.ants.filter(o => o.follow && o.state === 'follow').length;
export function crewAttack(s, x, y){
  const P = s.player; if (!P.ant || P.inNest || !crewSize(s)) return false;
  const e = enemyAt(s, x, y); if (!e) return false;
  if (P.attack && P.attack.kind === e.kind && P.attack.ref === e.ref) return true;
  P.attack = { kind: e.kind, ref: e.ref, name: e.name, t: s.t };
  P.msg = `Your crew charges ${e.name}!`; s.seen.attacked = true; s.events.push('attack'); return true;
}
// Build 29: crew orders (Mark picked "hold, formations, splitting"). Hold: the crew plants itself at a
// spot and guards a few tiles round it, fighting whatever comes in. Split: half holds, half follows.
// Follow: the held crew comes back to you from anywhere.
export const HOLD_R = 5; // tiles a held crew guards round its spot
export function crewHold(s, x, y, half){
  const P = s.player; if (!P.ant || P.inNest) return 0;
  let crew = s.ants.filter(o => o.follow && o.state === 'follow');
  if (!crew.length && !half) crew = s.ants.filter(o => o.follow && o.state === 'hold'); // no one following: move the held crew
  const pick = half ? crew.filter((o, i) => i % 2 === 0) : crew; if (!pick.length) return 0;
  pick.forEach((o, i) => { const a = (i / pick.length)*Math.PI*2, rr = pick.length > 1 ? 0.9*T : 0; o.state = 'hold'; o.holdX = x + Math.cos(a)*rr; o.holdY = y + Math.sin(a)*rr; o.holdCX = x; o.holdCY = y; o.foeId = 0; o.goal = null; o.recall = false; });
  if (P.attack && !crewSize(s) && P.attack.kind !== 'door') P.attack = null;
  P.msg = half ? `${pick.length} of your crew hold here; the rest stay with you.` : `Your crew holds ${Math.hypot(x - P.ant.x, y - P.ant.y) > 2*T ? 'there' : 'here'}: they guard ${HOLD_R} tiles round it.`;
  s.seen.held = true; return pick.length;
}
export function crewFollow(s){
  const P = s.player; if (!P.ant || P.inNest) return 0; let n = 0;
  for (const o of s.ants) if (o.follow && o.state === 'hold'){ o.state = 'follow'; o.recall = true; o.foeId = 0; n++; }
  if (n) P.msg = `${n} of your crew come back to you.`;
  return n;
}
export const heldCount = s => s.ants.filter(o => o.follow && o.state === 'hold').length;
// Build 39: zones taken. Each second, any zone whose guardian has fallen is marked; all 13 ends Phase 1.
export function zonesTaken(s){ return ZONES.filter(z => (s.colony.zones || {})[z.key] != null).length; }
export function tickZones(s, dt){
  s.zoneT = (s.zoneT || 0) + dt; if (s.zoneT < 1) return; s.zoneT = 0;
  const c = s.colony; if (!c.zones) c.zones = {};
  { const was = s.capWas ?? c.cap; c.cap = s.capWas = storeCap(s); if (c.cap < was) c.store = Math.min(c.store, c.cap); } // build 40: kept current every second (repletes hanging, outposts sharing the store); build 47: a cap that shrinks (outposts lost) takes the overflow with it
  for (const z of ZONES){ if (c.zones[z.key] != null || !z.done(s)) continue;
    c.zones[z.key] = s.t; const n = zonesTaken(s);
    s.zoneTaken = { key: z.key, t: s.t, n }; s.events.push('zone');
    s.player.msg = `Zone taken: ${z.name} (${n} of ${ZONES.length}).${n < ZONES.length ? '' : ' The whole yard is yours!'}`;
    if (n >= ZONES.length && !s.phase1){ s.phase1 = { t: s.t }; s.events.push('phase1'); } }
}
export function tickAttack(s){
  const P = s.player, A = P.attack; if (!A) return;
  const o = attackTarget(s), a = P.ant;
  if (!a || P.inNest || !crewSize(s)){ P.attack = null; return; }
  if (!o && A.kind === 'door'){ P.attack = null; return; }
  if (!o){ P.attack = null; P.msg = `${A.name.replace(/^the /, 'The ').replace(/^./, ch => ch.toUpperCase())} is down. Your crew falls back in.`; s.events.push('attackdone'); return; }
  if (Math.hypot(o.x - a.x, o.y - a.y) > ATTACK_LEASH*T){ P.attack = null; P.msg = 'Too far: your crew falls back in.'; if (s.myRaid && s.myRaid.phase === 'breach') endRaid(s, 'called off'); }
}
export function crewAt(s){ const a = s.player.ant; if (!a) return 0; let n = 1; for (const o of s.ants) if (o.follow && o.state !== 'dead' && Math.hypot(o.x-a.x, o.y-a.y) < 3*T) n++; return n; }
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

// Build 69→71, the Defend call (Mark: "a defend button, and you have to kind of spam it… a little bit of
// cooldown"). While your nest is under attack, each call rings the alarm and sends the next DEFEND.n nearest
// ants out in the yard home to fight at the door: fighters first, then workers. It's a bell, not a switch:
// DEFEND.cd seconds between calls, and those already answering aren't called again.
export const DEFEND = { n: 6, cd: 4, near: 8, answer: 40 };
export function underAttack(s){
  if (!s.queen.placed || s.lost) return false;
  if (s.raidLive) return true;
  if (s.t - (s.queenHitT ?? -99) < 15) return true;
  const c = s.colony; return s.ants.some(a => a.team && a.state !== 'dead' && outside(a) && Math.hypot(a.tx - c.ex, a.ty - c.ey) < DEFEND.near);
}
export const defendLeft = s => Math.max(0, (s.defendAt ?? -99) + DEFEND.cd - s.t);
export function callDefend(s){
  if (!underAttack(s) || defendLeft(s) > 0) return 0;
  const c = s.colony, home = (a) => Math.hypot(a.tx - c.ex, a.ty - c.ey);
  const cands = s.ants.filter(a => !a.team && !a.isPlayer && !a.follow && a.state !== 'dead' && outside(a) && a.state !== 'climb' && !(a.defendT > s.t) && home(a) >= 3);
  cands.sort((p, q) => (CASTES[q.caste].fight >= 3) - (CASTES[p.caste].fight >= 3) || home(p) - home(q));
  const got = cands.slice(0, DEFEND.n);
  for (const a of got){ a.state = 'fight'; a.goal = 'defend'; a.defendT = s.t + DEFEND.answer; a.defendMark = s.t; a.flee = 0; a.explore = 0; }
  raiseAlarm(s, c.ex, c.ey, 2); // (and the alarm brings the fighters out from inside)
  s.defendAt = s.t; s.defendCalls = (s.defendCalls || 0) + 1;
  return got.length;
}
