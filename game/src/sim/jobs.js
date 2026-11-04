// Jobs (build 17): each kind of ant works down its own list of duties, the first that needs doing.
import { CASTES, QUEEN_UP, ROOMS, ROOM_KEYS, SPOIL_MAX, T, heavy, idx, roomCount, roomLevel } from './core.js';
import { forageRange } from './world.js';
import { roomOf, wet } from './nest.js';
import { has, picked } from './progress.js';
import { nearAlarm } from './raids.js';
import { outside } from './hazards.js';

// Each kind of ant works down its own list of duties, in the order you set
// on the Jobs page: the first one that needs doing is what it does, so its
// main duty comes first and it helps elsewhere when that is done. A duty can
// be switched off. Ants differ in how readily they answer (their thresholds),
// so a colony spreads itself across what needs doing.
export const DUTIES = {
  food:  { name: 'Gather food', icon: '🌾', out: true, kind: 'food' },
  water: { name: 'Fetch water', icon: '💧', out: true, kind: 'water' },
  stone: { name: 'Fetch stone', icon: '🪨', out: true, kind: 'grit' },
  hunt:  { name: 'Hunt', icon: '🥩', out: true, kind: 'protein' },
  build: { name: 'Dig and build', icon: '⛏' },
  nurse: { name: 'Tend eggs', icon: '🥚' },
  guard: { name: 'Guard the door', icon: '🛡' },
  // Build 23.
  wood:   { name: 'Fetch wood', icon: '🪵', out: true, kind: 'wood' },
  leaves: { name: 'Cut leaves', icon: '🍃', out: true, kind: 'leaf' },
  herd:   { name: 'Herd aphids', icon: '🐛' },
  heal:   { name: 'Tend the wounded', icon: '🩹' },
  // Build 24.
  hang:   { name: 'Hang in the vault', icon: '🍯' },
  tidy:   { name: 'Clear the dead', icon: '⚱' },
};
// Duties done inside the nest (an ant on one stays in).
const INSIDE = { build: 1, nurse: 1, herd: 1, heal: 1, hang: 1, tidy: 1 };
// Who can do what, main duty first.
export const JOBS0 = {
  forager: ['food', 'water', 'stone', 'wood', 'hunt'],
  builder: ['build', 'stone', 'wood', 'food', 'water'],
  nurse:   ['nurse', 'water', 'food'],
  soldier: ['guard', 'hunt', 'food'],
  venom:   ['hunt', 'guard', 'food'],
  gardener: ['leaves', 'food', 'water'],
  rancher:  ['herd', 'food'],
  medic:    ['heal', 'food', 'water'],
  harvester:['food', 'stone', 'wood', 'water'],
  major:    ['guard', 'hunt', 'food'],
  supermajor:['guard', 'hunt'],
  exploder: ['guard', 'hunt'],
  replete:  ['hang'],
  undertaker:['tidy', 'food', 'water'],
};
export function jobsOf(s, caste){
  const c = s.colony; if (!c.jobs) c.jobs = {};
  if (!c.jobs[caste]) c.jobs[caste] = (JOBS0[caste] || []).map(d => [d, 1]);
  for (const d of JOBS0[caste] || []) if (!c.jobs[caste].some(j => j[0] === d)) c.jobs[caste].push([d, 1]); // duties added since the save
  return c.jobs[caste];
}
// Make a duty this kind's main one (first), or switch it on or off.
export function setJobFirst(s, caste, duty){ const L = jobsOf(s, caste), i = L.findIndex(j => j[0] === duty); if (i < 0) return false; const [j] = L.splice(i, 1); j[1] = 1; L.unshift(j); return true; }
export function toggleJob(s, caste, duty){ const L = jobsOf(s, caste), j = L.find(j => j[0] === duty); if (!j) return false; j[1] = j[1] ? 0 : 1; return true; }
const stoneGoal = s => Math.max(30, (QUEEN_UP[s.queen.level] || {}).grit || 0);
// 🪵 wanted once something needs it: the queen's last levels, a room's level III.
export const woodGoal = s => (s.queen.level >= 2 || ROOM_KEYS.some(k => ROOMS[k].lv && roomCount(s, k) && roomLevel(s, k) >= 2)) ? 40 : 0;
// Gardeners keep the fungus garden fed: up to 60 leaf a garden.
export const fungusCap = s => roomCount(s, 'fungus')*60;
// Ants working a room from inside: up to `per` a room, more with its level II.
export function workers(s, caste, duty, room, per){ const cap = roomCount(s, room)*(per + (roomLevel(s, room) >= 2 ? 2 : 0)); let n = 0; for (const a of s.ants) if (!a.team && a.caste === caste && a.duty === duty && a.state === 'in') n++; return Math.min(n, cap); }
function buildWork(s){ const n = s.nest, spoil = n.spoil || 0; return s.colony.buildQueue.length > 0 || s.repairs.length > 0 || spoil > 0 || n.fillOrders.length > 0 || (n.digOrders.length > 0 && spoil < SPOIL_MAX); }
export const doorAlarm = s => { const c = s.colony; return s.alarm[idx(c.ex, c.ey)] + nearAlarm(s); };
// Prey for hunters: a small creature or the caterpillar within reach of home.
export function preyNear(s, r){ const c = s.colony; if (s.cat && Math.hypot(s.cat.x/T - c.ex, s.cat.y/T - c.ey) < r) return s.cat; for (const b of s.critters) if (b.state !== 'fly' && Math.hypot(b.x/T - c.ex, b.y/T - c.ey) < r) return b; return null; }
// Ants already on a duty: out, or on their way out.
function onDuty(s, d, me){ let n = 0; for (const o of s.ants) if (o !== me && !o.team && o.duty === d && (outside(o) || o.goal === 'exit')) n++; return n; }
// Enough hands on a gathering duty already for what's short (each ant
// carries about 5): then it doesn't need this one, so ants spread out.
function covered(s, a, d, short){ return onDuty(s, d, a) >= Math.max(1, Math.ceil(short/5)); }
// How much a duty needs doing right now, for this ant (0: not at all).
export function dutyNeed(s, a, d){
  const c = s.colony, raining = wet(s);
  if (DUTIES[d].out && raining && d !== 'hunt' && !has(s, 'nightsense')) return 0;
  if (d === 'food' && covered(s, a, d, c.cap - c.store)) return 0;
  if (d === 'water' && covered(s, a, d, c.waterCap - c.water)) return 0;
  if (d === 'stone' && covered(s, a, d, stoneGoal(s) - c.grit)) return 0;
  if (d === 'wood' && covered(s, a, d, woodGoal(s) - (c.wood || 0))) return 0;
  if (d === 'leaves' && covered(s, a, d, fungusCap(s) - (c.fungus || 0))) return 0;
  switch (d){
    case 'food': return c.store < c.cap - 1 ? 0.3 + Math.max(0, 1 - c.store/c.cap)*0.9 : 0;
    case 'water': return c.water < c.waterCap*0.9 ? 0.3 + (1 - c.water/c.waterCap)*0.9 : 0;
    case 'stone': return c.grit < stoneGoal(s) ? 0.3 + (1 - c.grit/stoneGoal(s))*0.9 : 0;
    case 'hunt':
      if (raining) return 0;
      if (CASTES[a.caste].fight >= 3) return preyNear(s, 60) ? (c.protein < 60 ? 0.9 : 0.4) : 0;
      // Hauling meat matters as much as protein is short (build 19).
      return s.items.some(f => (f.kind === 'protein' || f.kind === 'chitin') && f.amt > 0 && !heavy(f) && !f.carried && Math.hypot(f.x - c.ex, f.y - c.ey) < forageRange(s)) ? (c.protein < 30 ? 0.9 : c.protein < 100 ? 0.5 : 0.15) : 0;
    case 'build': return a.caste === 'builder' && buildWork(s) ? 1 : 0;
    case 'wood': return (c.wood || 0) < woodGoal(s) ? 0.3 + (1 - (c.wood || 0)/woodGoal(s))*0.8 : 0;
    case 'leaves': return a.caste === 'gardener' && fungusCap(s) && (c.fungus || 0) < fungusCap(s)*0.9 ? 0.6 + (1 - (c.fungus || 0)/fungusCap(s))*0.8 : 0; /* build 41: their own job first (leaves become food anyway) */
    case 'herd': return a.caste === 'rancher' && roomOf(s, 'dairy') ? 1 : 0;
    case 'heal': return a.caste === 'medic' && roomOf(s, 'infirmary') ? 1 : 0;
    case 'hang': return a.caste === 'replete' && roomOf(s, 'honeypot') ? 1 : 0;
    case 'tidy': return a.caste === 'undertaker' && roomOf(s, 'midden') ? 1 : 0;
    case 'nurse': return a.caste === 'nurse' && (c.eggs.length || c.eggQueue.length) ? 1 : 0;
    case 'guard': {
      const al = doorAlarm(s); if (al > 0.2 && (has(s, 'stridulation') || picked(s, 'soldier', 'alarm'))) return 2;
      if (al > 0.05) return 0.35 + Math.min(1, al);
      // Enough on guard already (half the fighters, at least two): free for other work.
      let out = 0, all = 0; for (const o of s.ants) if (o !== a && !o.team && CASTES[o.caste].fight >= 3 && !o.isPlayer){ all++; if (o.duty === 'guard' && (o.state === 'patrol' || o.state === 'fight' || o.goal === 'exit')) out++; }
      all++;
      return out < Math.max(2, Math.ceil(all*0.5)) ? 0.9 : 0;
    }
  }
  return 0;
}
// The first duty on its list that needs doing, past its threshold.
export function chooseDuty(s, a, except){
  for (const [d, on] of jobsOf(s, a.caste)){
    if (!on || d === except) continue;
    const n = dutyNeed(s, a, d), thr = (has(s, 'hivemind') ? 0.5 : 1)*(INSIDE[d] ? 0 : d === 'guard' || d === 'hunt' && CASTES[a.caste].fight >= 3 ? a.thr.d : a.thr.f);
    if (n > thr) return d;
  }
  return null;
}
// What each kind is busy with right now, for the Jobs page.
export function dutyCounts(s){
  const out = {};
  for (const a of s.ants){ if (a.team || a.isPlayer || a.state === 'dead') continue; const o = out[a.caste] || (out[a.caste] = { n: 0, idle: 0 });
    o.n++; const busy = a.follow ? 'crew' : a.state === 'build' ? 'build' : a.state === 'spoil' ? 'build' : a.state === 'in' ? (a.caste === 'nurse' && a.duty === 'nurse' ? 'nurse' : null) : a.duty || null;
    if (busy) o[busy] = (o[busy] || 0) + 1; else o.idle++; }
  return out;
}
