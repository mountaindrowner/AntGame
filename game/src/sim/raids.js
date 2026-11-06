// Rival colonies' brains, and raids: theirs on you, and the ones you lead (build 28).
import { CASTES, H, RIVALS, T, W, idx } from './core.js';
import { exitNest, killAnt } from './colony.js';
import { areaOf, raiseAlarm } from './world.js';
import { bite, carryCap, gainGenes, has } from './progress.js';
import { watchWarns } from './daughters.js';
import { addOutpost, deathTotal } from './outposts.js';
import { isNight } from './tick.js';
import { crewSize } from './player.js';
import { outside } from './hazards.js';
import { duelGangs, duelStats, swing } from './combat.js';

export function nearAlarm(s){ const w = s.world; let m = 0; for (let dy=-3;dy<=3;dy++) for (let dx=-3;dx<=3;dx++){ const x=w.ex+dx,y=w.ey+dy; if (x<0||y<0||x>=W||y>=H) continue; m = Math.max(m, s.alarm[idx(x,y)]); } return m; }

export function rivalBrain(s, r, dt){
  r.raidT += dt; if (r.raidT < 10) return; r.raidT = 0;
  if (s.raidLive && ((s.raidStart || {}).team || 1) === r.team && !s.ants.some(a => a.team === r.team && a.state === 'raid')){ s.raidLive = false; s.colony.raidsBeaten++;
    // The battle report (build 15): what the raid cost on both sides.
    const R = s.raidStart || {}, lost = deathTotal(s.colony) - (R.lost || 0), killed = (r.deaths.war || 0) - (R.killed || 0), took = Math.round(s.colony.stolen - (R.stolen || 0)), crits = (s.colony.crits || 0) - (R.crits || 0);
    s.report = { kind: 'raid', lost, killed, took, crits, t: s.t }; s.events.push('report');
    s.player.msg = `Raid over. You lost ${lost} ant${lost === 1 ? '' : 's'}, killed ${killed} raider${killed === 1 ? '' : 's'}${crits > 0 ? ` (${crits} crit${crits === 1 ? '' : 's'})` : ''}${took > 0 ? `, and they carried off ${took} food` : ''}.`; }
  // (A raid ends even if their queen fell while it was out: the check above runs first.)
  if (!r.queenAlive) return;
  const RS = RIVALS[r.team - 1];
  const mine = s.ants.filter(a => a.team===r.team && a.state!=='dead'); const foragers = mine.filter(a => a.caste==='forager').length, soldiers = mine.filter(a => a.caste==='soldier');
  // grow
  if (r.store >= 10 && r.eggQueue.length < (RS.swarm ? 4 : 2) && mine.length < Math.min(RS.max, (RS.swarm ? 30 : 12) + s.t/30)){ r.eggQueue.push(soldiers.length < foragers*RS.soldiers ? 'soldier' : 'forager'); r.store -= 4; }
  const revenge = r.revengeAt && s.t >= r.revengeAt;
  if (!RS.raids && !revenge) return;
  // raid when strong, not before 5 minutes, at most every 2 minutes
  r.raidCd = (r.raidCd || 0) - 10;
  const idle = (revenge ? mine.filter(a => CASTES[a.caste].fight >= 3 || RS.swarm || RS.fierce || mine.length < 12) : soldiers).filter(a => a.state==='in' || a.state==='patrol');
  // Raids start at six minutes and grow: 3 soldiers, then one more every 2.5 minutes.
  const size = Math.min(14, 3 + Math.floor(Math.max(0, s.t - 360)/150));
  if (revenge && !s.raidLive && idle.length >= 3 && s.queen.placed && !s.lost){ const n = Math.min(idle.length, Math.max(4, size)); for (let i = 0; i < n; i++){ const a = idle[i]; if (a.state==='in') exitNest(s, a, 'raid'); else a.state = 'raid'; } r.revengeAt = null; s.raidLive = true; s.raidStart = { team: r.team, lost: deathTotal(s.colony), killed: r.deaths.war || 0, stolen: s.colony.stolen, crits: s.colony.crits || 0 }; s.player.msg = `The ${RS.name.toLowerCase()} strike back! ${n} of them march on your nest.` + watchWarns(s); s.events.push('raid'); return; }
  if (revenge && s.t > r.revengeAt + 300) r.revengeAt = null;
  if (!RS.raids) return;
  if (s.t > (RS.raidFrom || 360) && !s.raidLive && !isNight(s) && r.raidCd <= 0 && idle.length >= size && s.queen.placed && !s.lost){ r.raidCd = Math.max(90, 160 - s.t/30); let n = 0; for (const a of idle){ if (n++ >= size) break; if (a.state==='in') exitNest(s, a, 'raid'); else a.state = 'raid'; } s.raidLive = true; s.raidStart = { team: r.team, lost: deathTotal(s.colony), killed: r.deaths.war || 0, stolen: s.colony.stolen, crits: s.colony.crits || 0 }; s.player.msg = `Raid! ${size} ${r.team === 1 ? 'rivals are' : RS.name.toLowerCase() + ' are'} coming.` + watchWarns(s); s.events.push('raid'); }
}
// Build 28: raids you lead (Mark: "I want raids to feel interesting and important. You raid other
// colonies"). Bring a crew to a rival door and press Raid; pick a prize; break their door (six of yours
// there, none of theirs, for 5 s); then the crew storms in and the fight plays out in rounds of dice on
// the raid card. Pull out when you like. Survivors carry the prize home, and the colony strikes back.
export const RAID = { near: 8, minCrew: 3, door: 6, hold: 5, round: 1.0, maxRounds: 60, breachMax: 120 };
export function raidTarget(s){
  const a = s.player.ant; if (!a || s.player.inNest || s.myRaid) return null;
  return s.rivals.find(r => !r.asleep && r.queenAlive && Math.hypot(a.tx - r.ex, a.ty - r.ey) <= RAID.near) || null;
}
// What your scouts see: their numbers, store, brood and queen, against your crew.
export function raidScout(s, r){
  const R = RIVALS[r.team - 1], theirs = s.ants.filter(a => a.team === r.team && a.state !== 'dead');
  const guards = theirs.filter(a => CASTES[a.caste].fight >= 3 || R.swarm || R.fierce).length;
  const crew = s.ants.filter(a => a.follow && a.state === 'follow');
  return { team: r.team, key: R.key, name: R.name, guards, workers: theirs.length - guards, total: theirs.length, store: Math.floor(r.store), brood: broodOf(s, r), qhp: Math.ceil(r.qhp == null ? R.qhp : r.qhp), qmax: R.qhp,
    crew: crew.length, fighters: crew.filter(a => CASTES[a.caste].fight >= 3).length, attack: crew.reduce((n, a) => n + duelStats(s, a)[0], 0) };
}
const broodOf = (s, r) => r.eggs.length + r.eggQueue.length + Math.floor(s.ants.filter(a => a.team === r.team && a.state !== 'dead').length / 5);
export function raidLock(s, prize){
  const r = raidTarget(s); if (!r) return 'walk your crew to a rival nest';
  const n = crewSize(s); if (n < RAID.minCrew) return `recruit a crew first (${n} of ${RAID.minCrew})`;
  if (prize === 'store' && r.store < 4) return 'their store is empty';
  if (prize === 'brood' && !broodOf(s, r)) return 'they have no brood';
  return '';
}
export function startRaid(s, prize){
  if (raidLock(s, prize)) return false;
  const r = raidTarget(s), R = RIVALS[r.team - 1], P = s.player;
  const theirs = s.ants.filter(a => a.team === r.team && a.state !== 'dead').length;
  s.myRaid = { team: r.team, prize, phase: 'breach', t0: s.t, hold: 0, round: 0, rT: 0, raiders: [], log: [], loot: { food: 0, brood: 0 }, cap: Math.floor(r.store/2), broodLeft: broodOf(s, r),
    start: { theirs, lost: deathTotal(s.colony), killed: r.deaths.war || 0, crits: s.colony.crits || 0, qhp: r.qhp == null ? R.qhp : r.qhp } };
  P.attack = { kind: 'door', ref: r.team, name: 'the ' + R.name.toLowerCase() + '’ door', t: s.t };
  raiseAlarm(s, r.ex, r.ey, 3);
  P.msg = `Raid! Break the ${R.name.toLowerCase()}’ door: ${RAID.door} of yours there, none of theirs.`; s.seen.raided = true; s.events.push('attack');
  return true;
}
function raidSay(M, text){ M.log.push(text); if (M.log.length > 6) M.log.shift(); }
export function tickMyRaid(s, dt){
  const M = s.myRaid; if (!M) return;
  const r = s.rivals[M.team - 1], R = RIVALS[M.team - 1], P = s.player;
  if (M.phase === 'breach'){
    const crew = s.ants.filter(a => a.follow && a.state === 'follow');
    let ours = 0, theirs = 0;
    for (const a of s.ants){ if (!outside(a)) continue; const d = Math.hypot(a.tx - r.ex, a.ty - r.ey);
      if (!a.team && d <= 2 && (a.follow || a.isPlayer || CASTES[a.caste].fight >= 3)) ours++;
      if (a.team === r.team && d <= 3 && (CASTES[a.caste].fight >= 3 || R.fierce || R.swarm)) theirs++; }
    M.ours = ours; M.theirs = theirs;
    const need = Math.min(RAID.door, Math.max(RAID.minCrew, crew.length));
    M.need = need;
    if (ours >= need && theirs === 0) M.hold += dt; else M.hold = Math.max(0, M.hold - dt*0.5);
    if (!P.attack && crew.length) P.attack = { kind: 'door', ref: r.team, name: 'the door', t: s.t };
    if (!r.queenAlive || crew.length + (P.ant ? 0 : 0) < 1 || s.t - M.t0 > RAID.breachMax){ endRaid(s, 'broken'); return; }
    if (M.hold >= RAID.hold){
      // Storm: every crew ant near the door goes in.
      M.phase = 'inside'; M.rT = 0.5; P.attack = null;
      for (const a of crew) if (Math.hypot(a.x/T - r.ex, a.y/T - r.ey) < 5){ a.state = 'away'; a.follow = false; a.x = (r.ex + 0.5)*T; a.y = (r.ey + 0.5)*T; a.tx = r.ex; a.ty = r.ey; a.foeId = 0; a.loot = 0; M.raiders.push(a.id); }
      raidSay(M, `The door is yours. ${M.raiders.length} raiders storm the nest.`);
      M.left = M.raiders.length; M.guards = s.ants.filter(a => a.team === r.team && a.state === 'in').length;
      P.msg = `Your crew storms the ${R.name.toLowerCase()}’ nest!`; s.events.push('attack');
    }
    return;
  }
  if (M.phase !== 'inside') return;
  M.rT -= dt; if (M.rT > 0) return; M.rT = RAID.round; M.round++;
  const raiders = M.raiders.map(id => s.ants.find(a => a.id === id)).filter(a => a && a.state === 'away');
  if (!raiders.length){ raidSay(M, 'Your last raider falls.'); endRaid(s, 'lost'); return; }
  // Their guards inside: soldiers first; a swarm sends everyone.
  const inside = s.ants.filter(a => a.team === r.team && a.state === 'in');
  const guards = inside.filter(a => CASTES[a.caste].fight >= 3 || R.swarm || R.fierce);
  const def = guards.length ? guards : inside.slice(0, Math.ceil(inside.length/3));
  // Everyone on both sides fights in pairs; ganging up counts as in a duel on the surface.
  for (const a of raiders) a.foeId = 0;
  const order = raiders.slice().sort(() => Math.random() - 0.5);
  let crits = 0, felled = 0, lost = 0, named = null; const free = [], pairs = []; // pairs: build 71, for the raid stage
  order.forEach((a, i) => { if (!def.length || a.loot) { free.push(a); return; } a.foeId = def[i % def.length].id; });
  duelGangs(s);
  for (const a of order){
    if (!a.foeId){ continue; }
    const o = def.find(d => d.id === a.foeId); if (!o || o.state === 'dead'){ free.push(a); continue; }
    const k = swing(s, a, o); if (k === 'crit'){ crits++; if (a.name) named = a.name; } if (o.state === 'dead') felled++;
    let k2 = null; if (o.state !== 'dead' && a.state !== 'dead'){ k2 = swing(s, o, a); if (a.state === 'dead') lost++; }
    pairs.push([a.id, o.id, k, k2, a.state === 'dead', o.state === 'dead']);
  }
  // Raiders with nobody in front of them go for the prize.
  let took = 0, qhits = 0;
  for (const a of free){
    if (a.state === 'dead') continue;
    if (M.prize === 'store' && M.loot.food < M.cap && r.store >= 1){ const n = Math.min(carryCap(s, a, { type: 'crumb' })*2, M.cap - M.loot.food, r.store); a.loot = (a.loot || 0) + n; M.loot.food += n; r.store -= n; took += n; }
    else if (M.prize === 'brood' && M.broodLeft > 0 && !a.loot){ a.loot = 1; a.lootKind = 'brood'; M.loot.brood++; M.broodLeft--; if (r.eggQueue.length) r.eggQueue.pop(); else if (r.eggs.length) r.eggs.pop(); took++; }
    else if (M.prize === 'queen' && r.queenAlive){
      // The queen: 1d6 + Attack against her 1d6 + 4; she bites back at one raider a round.
      const ra = 1 + Math.floor(Math.random()*6), rd = 1 + Math.floor(Math.random()*6), [atk] = duelStats(s, a);
      if (ra + atk > rd + 4){ const dmg = bite(s, a)*3*(ra === 6 ? 2 : 1); r.qhp -= dmg; qhits++; if (ra === 6){ crits++; if (a.name) named = a.name; s.colony.crits = (s.colony.crits || 0) + 1; } }
    }
  }
  if (M.prize === 'queen' && r.queenAlive && free.length){ const v = free[Math.floor(Math.random()*free.length)]; const [, d] = duelStats(s, v); if (1 + Math.floor(Math.random()*6) + 3 > 1 + Math.floor(Math.random()*6) + d){ v.hp -= 4; if (v.hp <= 0){ killAnt(s, v, 'rival'); lost++; } } }
  // Build 71: the clash as it happened, for the raid stage: who met whom and how each side rolled, who ran
  // for the prize, what it brought.
  M.clash = { n: M.round, pairs, free: free.filter(a => a.state !== 'dead').map(a => a.id), took, qhits, t: s.t };
  M.defIds = def.filter(d => d.state !== 'dead').map(d => d.id).slice(0, 16);
  // One line a round: the best thing that happened.
  const left = raiders.filter(a => a.state !== 'dead').length, gl = def.filter(d => d.state !== 'dead').length;
  M.left = left; M.guards = s.ants.filter(a => a.team === r.team && a.state === 'in').length;
  let line = `Clash ${M.round}: `; // (build 71: "clash", was "round")
  if (crits) line += named ? `${named} rolls a 6, crit${crits > 1 ? ` (${crits} crits)` : ''}! ` : crits > 1 ? `${crits} crits! ` : 'A raider rolls a 6, crit! ';
  if (felled) line += `${felled} guard${felled === 1 ? '' : 's'} fall${felled === 1 ? 's' : ''}. `;
  if (lost) line += `${lost} raider${lost === 1 ? '' : 's'} fall${lost === 1 ? 's' : ''}. `;
  if (took && M.prize === 'store') line += `+${Math.round(took)} food grabbed. `;
  if (took && M.prize === 'brood') line += `${took} pupa${took === 1 ? '' : 'e'} taken. `;
  if (M.prize === 'queen' && !gl && r.queenAlive) line += qhits ? `${qhits} bite${qhits === 1 ? '' : 's'} on the queen: ${Math.max(0, Math.ceil(r.qhp))} health left. ` : 'The queen fends them off. ';
  if (line === `Clash ${M.round}: `) line += gl ? `${left} raiders against ${gl} guards. Mandibles locked.` : 'The halls are clear.';
  raidSay(M, line.trim());
  if (M.prize === 'queen' && r.queenAlive && r.qhp <= 0){ queenFalls(s, r); raidSay(M, 'The queen is dead!'); endRaid(s, 'won'); return; }
  if (M.prize === 'store' && (M.loot.food >= M.cap || r.store < 1)){ raidSay(M, 'Their store is stripped.'); endRaid(s, 'done'); return; }
  if (M.prize === 'brood' && M.broodLeft <= 0){ raidSay(M, 'All their brood is taken.'); endRaid(s, 'done'); return; }
  if (M.prize === 'brood' && raiders.every(a => a.state === 'dead' || a.loot)){ raidSay(M, 'Every raider has a pupa.'); endRaid(s, 'done'); return; }
  if (M.round >= RAID.maxRounds){ raidSay(M, 'Worn out, your raiders fall back.'); endRaid(s, 'out'); }
}
export function pullOut(s){ const M = s.myRaid; if (!M) return false; if (M.phase === 'inside'){ raidSay(M, 'You pull your raiders out.'); endRaid(s, 'out'); } else endRaid(s, 'called off'); return true; }
// The raid ends: survivors come out at the door carrying what they took, and head home.
export function endRaid(s, how){
  const M = s.myRaid; if (!M) return; const r = s.rivals[M.team - 1], R = RIVALS[M.team - 1], P = s.player, c = s.colony;
  const out = M.raiders.map(id => s.ants.find(a => a.id === id)).filter(a => a && a.state === 'away');
  for (const a of out){
    a.x = (r.ex + 0.5)*T + (Math.random() - 0.5)*T; a.y = (r.ey + 0.5)*T + (Math.random() - 0.5)*T; a.tx = r.ex; a.ty = r.ey; a.foeId = 0;
    if (a.loot){ a.carry = a.loot; a.kind = a.lootKind === 'brood' ? 'brood' : 'food'; a.itype = a.lootKind === 'brood' ? 'pupa' : 'crumb'; a.state = 'return'; a.explore = 0; }
    else if (P.ant && !P.inNest && Math.hypot(P.ant.x - a.x, P.ant.y - a.y) < 16*T){ a.state = 'follow'; a.follow = true; }
    else a.state = 'return';
    a.loot = 0; a.lootKind = null;
  }
  const theirs = s.ants.filter(a => a.team === r.team && a.state !== 'dead').length, lost = deathTotal(c) - M.start.lost, killed = (r.deaths.war || 0) - M.start.killed, crits = (c.crits || 0) - M.start.crits;
  const got = M.loot.food ? `${Math.round(M.loot.food)} food` : M.loot.brood ? `${M.loot.brood} pupa${M.loot.brood === 1 ? '' : 'e'}` : '';
  s.report = { kind: 'myraid', how, team: M.team, name: R.name, prize: M.prize, food: Math.round(M.loot.food), brood: M.loot.brood, lost, killed, crits, before: M.start.theirs, after: theirs, rounds: M.round, t: s.t };
  c.raidsLed = (c.raidsLed || 0) + 1;
  if (how === 'won' && has(s, 'broodempire')) c.protein += 30; // build 51: Brood Empire
  const head = how === 'won' ? `You took the ${R.name.toLowerCase()}’ nest!` : how === 'lost' ? `Your raid on the ${R.name.toLowerCase()} failed.` : how === 'broken' || how === 'called off' ? `The raid on the ${R.name.toLowerCase()} broke at the door.` : `Raid on the ${R.name.toLowerCase()}:`;
  P.msg = `${head}${got ? ` ${out.length} raider${out.length === 1 ? '' : 's'} carry home ${got}.` : ''} Lost ${lost}, killed ${killed}${crits > 0 ? ` (${crits} crit${crits === 1 ? '' : 's'})` : ''}. Their numbers: ${M.start.theirs} → ${theirs}.`;
  s.events.push('report');
  // They strike back, a few minutes on, if they still can.
  if (r.queenAlive) r.revengeAt = s.t + 90 + Math.random()*120;
  M.phase = 'over'; s.lastRaid = M; s.myRaid = null; if (P.attack && P.attack.kind === 'door') P.attack = null;
}
function queenFalls(s, r){
  const R = RIVALS[r.team - 1], c = s.colony, P = s.player;
  r.qhp = 0; r.queenAlive = false;
  const ai = areaOf(s, r.ex, r.ey); if (!s.outposts.some(o => o.region === ai)) addOutpost(s, r.ex, r.ey, true);
  c.kills.queens = (c.kills.queens || 0) + 1;
  if (r.team === 1){ s.won = true; s.patioDeadAt = s.t; gainGenes(s, 5, 'the rival queen is dead'); P.msg = 'The rival queen is dead. The yard is yours.'; }
  else { gainGenes(s, 3, 'the ' + R.name.toLowerCase() + '’ queen is dead'); P.msg = `The ${R.name.toLowerCase()}’ queen is dead. Their nest is yours.`; s.events.push('held'); }
}
