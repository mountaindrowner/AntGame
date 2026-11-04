// Your ant's abilities (build 32): spray, alarm call, mandible lock, play dead.
import { EVO_BY } from './growth.js';
import { CASTES, T } from './core.js';
import { killAnt } from './colony.js';
import { has, maxHp, youHp } from './progress.js';
import { outside } from './hazards.js';
import { BOSSES } from './bosses.js';

// Build 32: your ant's abilities (Mark: "The boss battles are basically rts and a kind of diablo esque.
// Maybe we need to give our main ant abilities the player can trigger that are based on him or the
// crowd or weakening the enemy like statuses"). Four, each on its own cooldown.
export const ABILITIES = {
  spray:  { name: 'Formic Spray', icon: '🧪', evo: 'formic', cd: 10, range: 6, r: 2.5, dur: 6, line: 'A cloud of acid where you point: enemies in it are Exposed for 6 s (half again damage, −1 Defence).' },
  alarm:  { name: 'Alarm Call', icon: '📯', evo: 'danger', cd: 24, r: 8, dur: 8, line: 'Your crew and fighters within 8 tiles Frenzy for 8 s: +2 Attack, bites 30% harder, faster.' },
  lock:   { name: 'Mandible Lock', icon: '🦷', evo: 'mandibles', cd: 16, range: 2.6, dur: 2.5, boss: 1.5, line: 'Grab the nearest enemy: Stunned 2.5 s. A boss: 1.5 s, and the attack it was winding up is cancelled.' },
  dead:   { name: 'Play Dead', icon: '💀', evo: 'thanatosis', cd: 30, dur: 3, heal: 0.3, line: 'Drop and lie still: nothing hurts you for 3 s, and you heal 30%.' },
};
export const ABILITY_KEYS = ['spray', 'alarm', 'lock', 'dead'];
// Build 33: second levels, from the evolution tree. abil(s, k) gives an ability's numbers as they stand.
export const ABILITY_II = {
  spray: { evo: 'spray2', cd: 7, r: 3.5, dur: 9 },
  alarm: { evo: 'alarm2', r: 12, dur: 12, atk: 3 },
  lock:  { evo: 'lock2', cd: 11, dur: 4, boss: 2.5 },
  dead:  { evo: 'dead2', dur: 5, heal: 0.6, shake: true },
};
export const abilityLevel = (s, k) => (ABILITY_II[k] && has(s, ABILITY_II[k].evo) ? 2 : 1);
export const abil = (s, k) => abilityLevel(s, k) === 2 ? { ...ABILITIES[k], ...ABILITY_II[k], level: 2 } : { ...ABILITIES[k], atk: 2, level: 1 };
export const exposed = (s, o) => o && o.exposed > s.t;
export const stunned = (s, o) => o && o.stunned > s.t;
export const frenzied = (s, a) => a && a.frenzy > s.t;
export function abilityLock(s, key){
  const P = s.player, A = ABILITIES[key]; if (!A) return 'unknown';
  if (A.evo && !has(s, A.evo)) return 'evolve ' + EVO_BY[A.evo].name + ' to learn it'; // build 32.1: learned in the evolution tree
  if (!P.ant || P.inNest) return 'outside only';
  const left = ((P.cds || {})[key] || 0) - s.t; if (left > 0) return `ready in ${Math.ceil(left)} s`;
  return '';
}
// Every enemy thing in reach of a point: rival ants, zombies, bugs, the spider, the caterpillar, bosses.
function foesNear(s, x, y, r){
  const out = [];
  for (const a of s.ants) if (outside(a) && (a.team || a.zombie) && Math.hypot(a.x - x, a.y - y) <= r) out.push(a);
  for (const b of s.critters || []) if (b.hp > 0 && Math.hypot(b.x - x, b.y - y) <= r) out.push(b);
  if (s.spider && Math.hypot(s.spider.x - x, s.spider.y - y) <= r + 1.5*T) out.push(s.spider);
  if (s.cat && Math.hypot(s.cat.x - x, s.cat.y - y) <= r + T) out.push(s.cat);
  for (const k in s.bosses || {}){ const b = s.bosses[k]; if (!b.dead && Math.hypot(b.x - x, b.y - y) <= r + BOSSES[k].r*T) out.push(b); }
  return out;
}
export function useAbility(s, key, x, y){
  if (abilityLock(s, key)) return false;
  const P = s.player, a = P.ant, A = abil(s, key);
  if (x == null){ x = a.x + (a.dx || 0)*3*T; y = a.y + (a.dy || 0)*3*T; }
  let n = 0;
  if (key === 'spray'){
    // Clamp the cloud to your range.
    const d = Math.hypot(x - a.x, y - a.y), m = A.range*T; if (d > m){ x = a.x + (x - a.x)/d*m; y = a.y + (y - a.y)/d*m; }
    for (const o of foesNear(s, x, y, A.r*T)){ o.exposed = s.t + A.dur; o.hitT = s.t; if (o.caste && o.state !== 'dead'){ o.hp -= 1; if (o.hp <= 0) killAnt(s, o, 'war'); } n++; }
    P.msg = n ? `Formic spray! ${n} ${n === 1 ? 'enemy is' : 'enemies are'} Exposed.` : 'Formic spray: nothing caught in it.';
  } else if (key === 'alarm'){
    for (const o of s.ants) if (!o.team && !o.isPlayer && outside(o) && (o.follow || CASTES[o.caste].fight >= 3) && Math.hypot(o.x - a.x, o.y - a.y) <= A.r*T){ o.frenzy = s.t + A.dur; o.frenzyAtk = A.atk; n++; }
    a.frenzy = s.t + A.dur; a.frenzyAtk = A.atk; x = a.x; y = a.y;
    P.msg = n ? `Alarm call! ${n} of your ants Frenzy.` : 'Alarm call: no fighters near enough to hear it.';
  } else if (key === 'lock'){
    let best = null, bd = Infinity;
    for (const o of foesNear(s, a.x, a.y, A.range*T + 2*T)){ const d = Math.hypot(o.x - a.x, o.y - a.y) - (o.key && BOSSES[o.key] ? BOSSES[o.key].r*T : 0); if (d < bd && d <= A.range*T){ bd = d; best = o; } }
    if (!best){ P.msg = 'Mandible lock: nothing close enough to grab.'; return false; }
    const boss = best.key && BOSSES[best.key];
    if (boss){ best.stunned = s.t + A.boss; if (best.atk){ best.atk = null; best.interruptAt = s.t; } best.hop = null; best.leap = null; }
    else { best.stunned = s.t + A.dur; best.lockT = A.dur; best.slowT = Math.max(best.slowT || 0, A.dur); }
    best.hitT = s.t; x = best.x; y = best.y; n = 1;
    P.msg = boss ? `You lock your mandibles on ${boss.name}! Stunned${best.interruptAt === s.t ? ', its attack cancelled' : ''}.` : 'Mandible lock! It’s stunned.';
  } else if (key === 'dead'){
    a.feign = s.t + A.dur; a.foeId = 0;
    if (A.shake) for (const o of s.ants) if (o.team && o.state !== 'dead' && o.foeId === a.id){ o.foeId = 0; if (o.state === 'fight') o.state = 'return'; } const pm = Math.max(youHp(s), maxHp(s, a)); a.hp = Math.min(pm, a.hp + pm*A.heal); x = a.x; y = a.y;
    P.msg = A.level === 2 ? 'You drop and play dead so well your attackers lose track of you.' : 'You drop and play dead. Nothing touches you.';
  }
  (P.cds || (P.cds = {}))[key] = s.t + A.cd;
  (s.casts || (s.casts = [])).push({ key, x, y, r: key === 'spray' ? A.r*T : key === 'alarm' ? A.r*T : T, t: s.t }); if (s.casts.length > 12) s.casts.shift();
  s.events.push('cast:' + key); s.seen.ability = true;
  return true;
}
