// Ant against ant (build 27): dice duels, gang-ups, sparks, hurting an ant.
import { rankOf } from './growth.js';
import { CASTES, T, idx, rspec } from './core.js';
import { killAnt } from './colony.js';
import { colonyOf } from './world.js';
import { roomOf } from './nest.js';
import { bite, gainXp, has, picked, youL } from './progress.js';
import { outside } from './hazards.js';
import { exposed, frenzied } from './abilities.js';

// A bright spark where a bite lands (the renderer draws them). One every so
// often per biter, so a crowd on the spider reads as a scrap, not a fire.
// Build 27: ant against ant is a duel of dice (Mark: "it should be something. Dice rolls against each
// other"). Every DUEL_ROUND seconds a fighter swings at its foe: 1d6 + Attack against the foe's
// 1d6 + Defence. Beat it to hit; by 3 or more (or on a pinned foe) for half again; a natural 6 that
// hits is a crit for double that also lames. A tie locks mandibles: neither moves for a round.
// Each extra ant on the same foe adds +1 (a swarm ant +2), up to +3; three or more on it pin it.
export const DUEL_ROUND = 0.7, DUEL_DMG = 1.4;
const DUEL_STAT = { harvester: [1, 1], soldier: [2, 2], venom: [2, 1], major: [3, 4], supermajor: [4, 6], exploder: [1, 0] };
const RIVAL_DUEL = { pavement: [[0, 0], [2, 2]], odorous: [[-1, -1], [-1, -1]], argentine: [[0, 0], [1, 1]], carpenter: [[3, 4], [3, 4]], fire: [[2, 1], [2, 1]] };
export function duelStats(s, a){
  const C = CASTES[a.caste];
  if (a.team){ const R = RIVAL_DUEL[rspec(a).key] || RIVAL_DUEL.pavement, st = C.fight >= 3 ? R[1] : R[0];
    return [st[0] + (a.champion ? 2 : 0) - (has(s, 'propaganda') ? 1 : 0), st[1] + (a.champion ? 2 : 0)]; }
  const base = a.isPlayer ? [2, 2] : DUEL_STAT[a.caste] || [0, 0], r = rankOf(a);
  let atk = base[0] + [0, 1, 1, 2, 3][r], def = base[1] + [0, 0, 1, 2, 3][r];
  if (has(s, 'mandibles') && C.fight >= 3) atk++;
  if (s.colony.lineage === 'trapjaw' && C.fight >= 3) atk++;
  if (has(s, 'cuticle')) def++;
  if (s.colony.trophies.shell && roomOf(s, 'armory')) def++;
  if (a.isPlayer && youL(s) >= 3){ atk++; def++; }
  // Build 40: fighting at your own door. Stridulation: +1 Attack while the alarm sounds. Honour guard: +2
  // Defence. Hive mind: +1 Attack for every ant answering a raid.
  const home = Math.hypot(a.tx - s.colony.ex, a.ty - s.colony.ey) < 8;
  if (home && has(s, 'stridulation') && s.alarm[idx(s.colony.ex, s.colony.ey)] > 0.2) atk++;
  if (home && has(s, 'honourguard')) def += 2;
  if (home && has(s, 'hivemind') && s.raidLive) atk++;
  // Bullet line: +1 Attack against anything slowed.
  return [atk, def];
}
// Who is on whom, from last tick's choices: weight of attackers per foe id.
export function duelGangs(s){ const m = new Map(); for (const a of s.ants){ if (!a.foeId || !outside(a)) continue; m.set(a.foeId, (m.get(a.foeId) || 0) + (a.team && rspec(a).swarm ? 2 : 1)); } s.gangs = m; return m; }
export const pinnedNow = (s, o) => o.caste !== 'supermajor' && s.gangs && (s.gangs.get(o.id) || 0) >= 3;
function pop(s, x, y, text, k){ (s.pops || (s.pops = [])).push({ x, y, text, k, t: s.t }); if (s.pops.length > 40) s.pops.shift(); }
// One swing of a at o. Returns what happened. mul scales the damage (your ant bites twice as hard).
export function swing(s, a, o, mul = 1){
  const P = s.player, [atk0] = duelStats(s, a), [, def0] = duelStats(s, o), atk = atk0 + (frenzied(s, a) ? (a.frenzyAtk || 2) : 0) + (!a.team && s.colony.lineage === 'bullet' && o.slowT > 0 ? 1 : 0), def = def0 - (exposed(s, o) ? 1 : 0);
  if (o.isPlayer && o.feign > s.t) return 'miss'; // playing dead
  const me = a.team && rspec(a).swarm ? 2 : 1, help = Math.min(3, Math.max(0, ((s.gangs && s.gangs.get(o.id)) || 0) - (a.foeId === o.id ? me : 0)));
  const pinned = pinnedNow(s, o), ra = 1 + Math.floor(Math.random()*6), rd = 1 + Math.floor(Math.random()*6);
  const A = ra + atk + help, D = rd + def, critOn = !a.team && a.caste === 'venom' ? 5 : 6;
  let kind = 'miss', m = 0;
  if (!a.team && s.colony.trophies.claw && a.clawFoe !== o.id){ a.clawFoe = o.id; kind = 'crit'; m = 2; } // build 34: the mantis's claw
  else if (A > D){ if (ra >= critOn){ kind = 'crit'; m = 2; } else if (A - D >= 3 || pinned){ kind = 'hard'; m = 1.5; } else { kind = 'hit'; m = 1; } }
  else if (A === D){ kind = 'lock'; if (!a.isPlayer) a.lockT = DUEL_ROUND; if (!o.isPlayer) o.lockT = DUEL_ROUND; }
  const col = colonyOf(s, a);
  let dmg = 0;
  if (m){
    dmg = bite(s, a)*DUEL_ROUND*DUEL_DMG*m*mul*(a.team && Math.hypot(a.tx - col.ex, a.ty - col.ey) < 5 ? 1.5 : 1)*(exposed(s, o) ? 1.5 : 1);
    o.hp -= dmg; o.hitT = s.t; if (o.isPlayer) P.hit = s.t;
    if (!a.team && a.caste === 'venom' && picked(s, 'venom', 'lethal') && !o.champion) o.hp = 0;
    if (kind === 'crit'){ o.slowT = Math.max(o.slowT || 0, 4); if (!a.team) s.colony.crits = (s.colony.crits || 0) + 1; }
    if (!a.team && a.caste === 'venom' && s.colony.trophies.fang2){ o.stunned = s.t + 1; o.lockT = Math.max(o.lockT || 0, 1); } // build 36: the centipede's fang
    if (a.team && rspec(a).key === 'fire') o.burnT = 3;
    if (!a.team && s.colony.lineage === 'bullet' && CASTES[a.caste].fight >= 3) o.slowT = Math.max(o.slowT || 0, 2); // build 40: the Bullet line's sting slows in duels too
    if (o.champion && s.event && s.event.key === 'warparty'){ const B = s.event.data.biters || (s.event.data.biters = {}); B[a.id] = (B[a.id] || 0) + dmg; }
    gainXp(s, a, dmg/3);
  }
  spark(s, null, (a.x + o.x)/2, (a.y + o.y)/2, kind === 'crit' ? 2 : a.team ? 1 : 0);
  const mx = (a.x + o.x)/2, my = (a.y + o.y)/2, seen = a.isPlayer || o.isPlayer || (P.ant && Math.hypot(mx - P.ant.x, my - P.ant.y) < 20*T);
  if (seen && (kind === 'crit' || a.isPlayer || o.isPlayer || (kind === 'lock' && Math.random() < 0.3))) pop(s, mx, my, kind === 'crit' ? 'CRIT ' + Math.max(1, Math.round(dmg)) : kind === 'lock' ? '⚔' : kind === 'miss' ? 'miss' : String(Math.max(1, Math.round(dmg))), kind + (a.team ? '-r' : ''));
  if (a.isPlayer || o.isPlayer) P.duel = { you: a.isPlayer, ra, ma: atk + help, rd, md: def, kind, foe: (a.isPlayer ? o : a).team ? rspec(a.isPlayer ? o : a).name.replace(/s$/, '') : 'Ant', t: s.t };
  if (o.hp <= 0 && o.state !== 'dead'){ killAnt(s, o, a.team ? 'rival' : 'war'); gainXp(s, a, 5); if (!a.team) s.colony.duelsWon = (s.colony.duelsWon || 0) + 1; else if (!o.team) s.colony.duelsLost = (s.colony.duelsLost || 0) + 1; }
  return kind;
}
export function spark(s, by, x, y, k){
  if (by){ if (s.t - (by.sparkT || -9) < 0.3) return; by.sparkT = s.t; }
  s.hits.push({ x, y, t: s.t, k: k || 0 }); if (s.hits.length > 60) s.hits.shift();
}
export function hurtAnt(s, a, dmg, cause){ if (a.isPlayer && a.feign > s.t) return; a.hp -= dmg; a.hitT = s.t; if (a.isPlayer) s.player.hit = s.t; if (a.hp <= 0) killAnt(s, a, cause); }
