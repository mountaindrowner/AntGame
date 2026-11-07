// Running a colony: deposits and deaths, costs, the colony's tick (food, water, eggs, healing, upkeep,
// starvation), rooms finishing, hatching, ants going in and out, and work inside the nest.
import { FAMILY, RANKS, rankOf } from './growth.js';
import { CASTES, CASTE_ROOM, CHITIN_OF, FOODS, H, NEST_CAP, RIVALS, ROOMS, SHAFT, SPOIL_MAX, T, W, idx, nidx, roomCount, roomLevel, roomUpkeep, rspec } from './core.js';
import { chooseExplore, chooseToward, colonyOf, itemAt, mkAnt } from './world.js';
import { bedrockGlow, bedrockPrize, builderTaskValid, carveRoom, dig, gainGlow, nestStep, pickBuilderTask, reachable, readyJob, roomOf, tickBreach, tickNestFinds, tickPlans } from './nest.js';
import { GRAIN, advise, discover, gainGenes, gainXp, has, hatchCapOf, inBand, jobMul, lvl, maxHp, picked, promo, qtrait, storeCap, workOf, youHp } from './progress.js';
import { DSPOTS, LARDER_FOOD, LARDER_FULL, LARDER_RATE, dRoomBuilt, daughterOf, farPop, joined, killFar } from './daughters.js';
import { heldFx, prizeFx, setDone, waterCapOf } from './outposts.js';
import { DUTIES, chooseDuty, doorAlarm, fungusCap, workers } from './jobs.js';
import { outside } from './hazards.js';
import { spark } from './combat.js';
import { CORD } from './events.js';
import { antCount, eggLock } from './commands.js';

export const queenCap = (lvl, s) => Math.min(NEST_CAP + (s && has(s, 'greatmound') ? 50 : 0), 20 + 20*lvl + (s && has(s, 'deephalls') ? 20 : 0) + (s && has(s, 'greatmound') ? 50 : 0)); // build 51: the Great Mound, +50
export function deposit(s, a){
  const c = colonyOf(s, a);
  if (!a.team && a.carry > 0){ gainXp(s, a, 3); discover(s, a.itype || a.kind); }
  if (!a.team && a.kind === 'food' && a.caste === 'harvester' && GRAIN[a.itype] && roomLevel(s, 'granary') >= 3) a.carry = Math.round(a.carry*1.5); // ant bread
  if (a.kind === 'food'){ const put = Math.min(Math.max(0, c.cap - c.store), a.carry); c.store += put; c.delivered[0] += put; if (!a.team){ c.foodTotal += put; if (c.store > (c.storePeak || 0)) c.storePeak = c.store;  if (a.isPlayer && put < a.carry) s.player.msg = put ? 'That filled the store. Spend food on eggs: Nest, then tap the queen.' : 'The store is full: this food is wasted. Spend some on eggs (Nest, then tap the queen), or build a Food store.'; }
    // Honeydew and bits of sweets are sugar too (build 18).
    if (!a.team && a.carry && a.itype === 'aphids') addSugar(s, (has(s, 'aphids') ? 3 : 1)*(prizeFx(s, a.ireg) === 'aphids' ? 2 : 1));
    else if (!a.team && a.carry && FOODS[a.itype] && FOODS[a.itype].sweet) addSugar(s, Math.ceil(a.carry*0.3)); }
  else if (a.kind === 'brood'){ if (!a.team){ const per = (qtrait(s, 'nations') ? 2 : 1)*(has(s, 'broodempire') ? 2 : 1); /* build 51: Brood Empire */ for (let i = 0; i < a.carry*per; i++){ if (antCount(s) < queenCap(s.queen.level, s)){ const n = mkAnt(s, has(s, 'warcamp') ? 'soldier' : 'forager', 'in', c.ex, c.ey, 0); if (qtrait(s, 'nations') && n) n.xp = Math.max(n.xp || 0, RANKS[2].xp); } else c.protein += 3; } c.captured = (c.captured || 0) + a.carry; if (!s.seen.pupae){ s.seen.pupae = true; s.player.msg = 'Stolen pupae hatch in your nest as your own ants.'; } } }
  else if (a.kind === 'water') c.water = Math.min(c.waterCap, c.water + a.carry);
  else if (a.kind === 'protein'){ c.protein += a.carry; if (!a.team && CHITIN_OF[a.itype]) addChitin(s, CHITIN_OF[a.itype]*(prizeFx(s, a.ireg) === 'chitin' ? 2 : 1)); }
  else if (a.kind === 'chitin'){ if (!a.team) addChitin(s, a.carry); }
  else if (a.kind === 'grit') c.grit += a.carry;
  else if (a.kind === 'wood'){ if (!a.team){ c.wood = (c.wood || 0) + a.carry; if (!c.found.wood){ c.found.wood = true; s.events.push('wood'); } } }
  else if (a.kind === 'leaf'){ if (!a.team) c.fungus = Math.min(fungusCap(s) || 60, (c.fungus || 0) + a.carry); }
  a.carry = 0;
}
export function addSugar(s, n){ const c = s.colony; c.sugar += n; c.sugarTotal += n; if (!c.found.sugar){ c.found.sugar = true; s.events.push('sugar'); } }
export function addChitin(s, n){ const c = s.colony; c.chitin += n; c.chitinTotal += n; if (!c.found.chitin){ c.found.chitin = true; s.events.push('chitin'); } }
export function killAnt(s, a, cause){
  if (a.state === 'dead') return;
  // Build 30: with the Old Robin's feather, birds never take your ants.
  if (cause === 'bird' && !a.team && s.colony.trophies.feather){ a.hp = Math.max(a.hp, 1); a.flee = 2; return; }
  if (a.isPlayer && a.feign > s.t && cause !== 'starved' && cause !== 'hunger'){ a.hp = Math.max(a.hp, 1); return; } // build 32: playing dead
  // Build 31: with Old Warty's poison, toads, birds and spiders spit out half the ants they catch.
  if ((cause === 'toad' || cause === 'bird' || cause === 'spider') && !a.team && s.colony.trophies.poison && Math.random() < 0.5){ a.hp = Math.max(a.hp, 1); a.flee = 2; a.state = a.state === 'away' ? 'return' : a.state; return; }
  // A Dodger slips the first foot, beak or acorn.
  if (!a.dodged && (cause === 'foot' || cause === 'bird' || cause === 'acorn' || cause === 'toad') && (promo(s, a, 'dodger') || (!a.team && a.caste === 'forager' && roomOf(s, 'armory')))){ a.dodged = true; a.flee = 2; return; }
  // Survivor: once a life, a killing blow leaves your ant at 1 health.
  if (a.isPlayer && !a.survived && picked(s, 'you', 'survivor')){ a.survived = true; a.hp = 1; s.player.hit = s.t; s.player.msg = 'That should have killed you. Get home!'; return; }
  // Infirmary III (build 23): medics carry the fallen home; 1 in 4 near the nest is saved.
  if (!a.team && !a.isPlayer && cause !== 'starved' && cause !== 'hunger' && cause !== 'nomeat' && cause !== 'culled' && cause !== 'cordyceps' && !a.zombie && roomLevel(s, 'infirmary') >= 3 && roomOf(s, 'infirmary') && a.x != null && Math.hypot(a.x/T - s.colony.ex, a.y/T - s.colony.ey) < 24 && s.ants.some(o => !o.team && o.caste === 'medic' && o.state === 'in') && Math.random() < 0.25){
    a.hp = 1; a.carry = 0; a.follow = false; a.infect = null; enterNest(s, a); s.colony.saved = (s.colony.saved || 0) + 1; if (s.colony.saved === 1) s.player.msg = 'Your medics carried a fallen ant home and saved it.'; return; }
  const was = a.state; a.state = 'dead';
  // Build 72: the body stays a while where it fell, outside (the renderer flips it and sinks it; not saved).
  if (a.x != null && !['in', 'build', 'nest', 'away', 'climb'].includes(was) && cause !== 'mower' && cause !== 'bird' && cause !== 'culled'){ const B = s.corpses || (s.corpses = []); B.push({ x: a.x, y: a.y, caste: a.caste, team: a.team || 0, t: s.t, yaw: Math.atan2(-(a.dy || 0), a.dx || 1), zombie: !!a.zombie }); if (B.length > 50) B.shift(); s.lastDeath = { x: a.x, y: a.y, t: s.t, team: a.team || 0 }; }
  if (!a.team && a.name){ const f = s.colony.fallen; f.unshift({ name: a.name, title: a.title || '', caste: a.caste, rank: rankOf(a), cause, t: Math.round(s.t), you: !!a.isPlayer }); if (f.length > 30) f.pop(); }
  if (a.isPlayer){ const P = s.player; if (P.big){ P.big.carried = false; P.big = null; } P.ant = null; P.pending = true; P.path = null; P.died = s.t; P.deathCause = cause; P.msg = ({ spider: 'The spider got you.', rival: 'A rival soldier got you.', antlion: 'An antlion dragged you under.', mower: 'The mower got you.', foot: 'A foot came down on you.', bird: 'A robin snapped you up.', toad: 'The toad\'s tongue got you.', acorn: 'An acorn fell on you.', spray: 'The bug spray got you.', fireants: 'Fire ants stung you to death.', earwig: 'An earwig pinched you to death.', hornworm: 'The hornworm crushed you.', beetle: 'The ground beetle got you.', mantis: 'The mantis caught you.', widow: 'The black widow bit you.', centipede: 'The centipede got you.', jumper: 'A jumping spider got you.', assassin: 'An assassin bug got you.', wasp: 'A hunting wasp got you.', skink: 'The skink got you.', millipede: 'The millipede\'s poison got you.' }[cause] || 'You starved.') + ' Your crew scatters. Waiting for the next hatchling.'; }
  if (!a.team){ const i = idx(Math.min(W-1,Math.max(0,Math.floor(a.x/T))), Math.min(H-1,Math.max(0,Math.floor(a.y/T)))); s.alarm[i] += 3; s.hot.add(i); }
  const c = colonyOf(s, a); c.deaths[cause] = (c.deaths[cause]||0) + 1;
  // Build 40: undertakers carry the dead home to the midden: each of your ants dying near the nest gives back food.
  if (!a.team && !a.isPlayer && !a.zombie && a.x != null && Math.hypot(a.x/T - c.ex, a.y/T - c.ey) < 24 && roomOf(s, 'midden') && workers(s, 'undertaker', 'tidy', 'midden', 3)){ c.store = Math.min(c.cap, c.store + 2); c.recycled = (c.recycled || 0) + 2; if (!s.seen.recycled){ s.seen.recycled = true; s.player.msg = 'Your undertakers carried a fallen ant to the midden: nothing is wasted (+2 food).'; } }
  // Build 24. A rival killed near its own nest: the War camp loots its food; Brood raiding brings back its brood.
  if (a.team && cause === 'war' && Math.hypot(a.x/T - colonyOf(s, a).ex, a.y/T - colonyOf(s, a).ey) < 18){ // (build 40: any rival's nest, not only the pavement ants')
    if (has(s, 'warcamp')){ const x = Math.floor(a.x/T), y = Math.floor(a.y/T); if (!itemAt(s, x, y)) s.items.push({ x, y, kind: 'food', type: 'crumb', amt: 5 }); }
    if (has(s, 'broodraid') && Math.random() < 0.2 && antCount(s) < queenCap(s.queen.level, s)){ mkAnt(s, 'forager', 'in', s.world.ex, s.world.ey, 0); s.colony.captured = (s.colony.captured || 0) + 1; if (s.colony.captured === 1) s.player.msg = 'Your raiders carried home rival brood. It hatched as one of yours.'; }
  }
  // An Exploder bursts when it dies fighting: every enemy within 2 tiles takes a heavy hit.
  if (!a.team && a.caste === 'exploder' && a.x != null){
    for (const o of s.ants) if (o.team && o.state !== 'dead' && Math.hypot(o.x - a.x, o.y - a.y) < 2*T){ o.hp -= 8; if (o.hp <= 0) killAnt(s, o, 'war'); }
    for (const b of s.critters) if (Math.hypot(b.x - a.x, b.y - a.y) < 2*T) b.hp -= 8;
    if (s.spider && Math.hypot(s.spider.x - a.x, s.spider.y - a.y) < 2.5*T) s.spider.hp -= 10;
    if (s.cat && Math.hypot(s.cat.x - a.x, s.cat.y - a.y) < 2.5*T) s.cat.hp -= 8;
    spark(s, a, a.x, a.y, 0);
  }
}
export function payCost(c, cost){ if (!canPay(c, cost)) return false; for (const k in cost){ if (k==='food'){ const short = Math.max(0, cost[k] - c.store); c.store -= cost[k] - short; if (short) c.sugar -= short; } else c[k] -= cost[k]; } return true; }
// Materials a colony doesn't have yet (sugar, chitin, wood) count as none.
export function canPay(c, cost){ for (const k in cost){ const have = (k==='food' ? c.store + (c.evo && c.evo.honeyeco ? Math.max(0, (c.sugar || 0) - (cost.sugar || 0)) : 0) : c[k]) || 0; if (have < cost[k]) return false; } return true; }
export function costText(cost){ return Object.entries(cost).map(([k,v]) => v+' '+k).join(' · ') || 'free'; }

export function tickColony(s, c, dt){
  if (!c.team && s.queen.placed){ tickBreach(s, dt); tickNestFinds(s, dt); }
  if (!c.team) advise(s, dt);
  c.secAcc += dt; while (c.secAcc >= 1){ c.secAcc -= 1; c.delivered.pop(); c.delivered.unshift(0); c.eaten.pop(); c.eaten.unshift(0); }
  let eat = 0; for (const a of s.ants) if (a.state !== 'dead' && a.team === c.team) eat += CASTES[a.caste].eat;
  if (!c.team) for (const d of s.daughters || []) for (const k in d.pop || {}) eat += CASTES[k].eat*d.pop[k]; // (build 46: a far daughter's ants still eat)
  if (!c.team && has(s, 'longlived')) eat *= 0.75; // (build 47.2: far daughters' ants too, as near ones)
  if (!c.team) eat += roomUpkeep(s); // rooms cost food to run (build 17)
  // Build 25.1: the later colonies also feed beyond what we model (the bins, the tree, their side
  // of the fence), so they need half what they eat from the yard.
  if (c.team > 1) eat *= 0.5;
  const bite = eat/60*dt; c.eaten[0] += bite; c.store -= bite; if (!c.team && c.store > c.storePeak) c.storePeak = c.store;
  if (c.store < 0 && !c.team && has(s, 'honeyeco') && (c.sugar || 0) >= 1){ const k = Math.min(c.sugar, Math.ceil(-c.store)); c.sugar -= k; c.store += k; } // build 40: Honey economy, sugar feeds the colony when food runs out
  /* build 41: out of grain, the colony eats its meat before anyone starves */
  if (c.store < 0 && !c.team && c.protein >= 1){ const k = Math.min(Math.floor(c.protein), Math.ceil(-c.store)); c.protein -= k; c.store += k; if (!c.ateMeat){ c.ateMeat = true; s.player.msg = 'Out of food: the colony is eating its 🥩 meat. Forage!'; } } else if (c.store > 20) c.ateMeat = false;
  if (c.store < 0){ c.store = 0; c.starve += dt; if (!c.team && c.starve > 10 && !c.starveWarned){ c.starveWarned = true; s.events.push('starving'); s.player.msg = 'The colony is starving. Forage farther.'; } } else { c.starve = 0; if (c.store > 20) c.starveWarned = false; }
  if (c.starve > 30 && (c.starve - 30) % (!c.team ? (has(s, 'stomach') ? 20 : 10) : 5) < dt){ /* build 41: slower for yours (was 20 s, then one every 5) */ const v = s.ants.filter(a => !a.isPlayer && a.state !== 'dead' && a.state !== 'away' && a.team === c.team), far = c.team ? 0 : farPop(s); if (!(c.team > 1 && v.length <= RIVALS[c.team - 1].start[0] + RIVALS[c.team - 1].start[1])){ const i = Math.floor(Math.random()*(v.length + far)); if (i < v.length) killAnt(s, v[i], 'starved'); else if (far && killFar(s, i - v.length)) c.deaths.starved = (c.deaths.starved || 0) + 1; } } // build 25.1: a later colony never starves below the size it came with
  const overCap = !c.team && antCount(s) >= queenCap(s.queen.level, s);
  if (c.queenAlive && (c.team || s.queen.placed) && !overCap){
    while (c.eggQueue.length && c.eggs.length < c.hatchCap){ const caste = c.eggQueue.shift(); c.eggs.push({ caste, t: 0, need: CASTES[caste].hatch * c.hatchMul * ((caste === 'major' || caste === 'supermajor') && has(s, 'titan') ? 0.5 : 1) }); } /* build 51: Titan Line */
    // Nurses inside speed the eggs: three can help (six with Nurse II), each by its rank.
    let rate = 1;
    if (!c.team){ const nurses = s.ants.filter(a => a.caste==='nurse' && a.team===0 && (a.state==='in'||a.state==='build')).slice(0, (lvl(s, 'nurse') >= 2 ? 6 : 3) + 3*Math.max(0, roomCount(s, 'nursery') - 1));
      for (const a of nurses) rate += 0.12*jobMul(a)*(promo(s, a, 'gentle') ? 1.3 : 1);
      if (youNurse(s)) rate += 0.24; // build 74: a nurse you play, by the eggs, is two nurses
      if (s.ants.some(a => !a.team && a.caste !== 'nurse' && a.state === 'in' && promo(s, a, 'gentle'))) rate *= 1.1; // build 40: a Gentle medic, rancher, replete or undertaker helps a little too
      if (nurses.length && lvl(s, 'nurse') >= 1) rate *= 1.15;
      if (nurses.length && lvl(s, 'nurse') >= 3) rate *= 1.3;
      if (lvl(s, 'nurse') >= 4) rate *= 1.25;
      if (picked(s, 'nurse', 'attendant')) rate *= 1.2;
      if (qtrait(s, 'fertile')) rate *= 1.25;
      if (heldFx(s, 'warm')) rate *= 1.15;
      if (setDone(s, 'colony')) rate *= 1.1;
      if (has(s, 'chimneys')) rate *= 1.15;
      if (has(s, 'polygyny')) rate *= 1.3;
      if (joined(s, 'brood')) rate *= 1.2; } /* build 49: the Brood Hall */
    for (let i=c.eggs.length-1;i>=0;i--){ const e = c.eggs[i]; e.t += dt*rate; if (e.t >= e.need){ c.eggs.splice(i,1); hatch(s, c, e.caste); } }
  }
  if (!c.team){
    const P = s.player;
    // Fighters eat protein: half a unit a minute each. With none, they starve one by one.
    // Hurt ants heal in the nest with Medic training, or near a Healer.
    if (picked(s, 'nurse', 'medic') || s.ants.some(a => !a.team && a.caste !== 'forager' && FAMILY[a.caste] === 'nest' && (a.state === 'in' || a.state === 'build') && promo(s, a, 'healer')))
      for (const a of s.ants) if (!a.team && (a.state === 'in' || a.state === 'build') && a.hp < maxHp(s, a)) a.hp = Math.min(maxHp(s, a), a.hp + 0.5*dt);
    const fighters = s.ants.filter(a => !a.team && a.state !== 'dead' && CASTES[a.caste].fight >= 3);
    let farF = 0; for (const d of s.daughters || []) for (const k in d.pop || {}) if (CASTES[k].fight >= 3) farF += d.pop[k]; /* build 47: a far daughter's soldiers eat protein too */
    const messK = dRoomBuilt(s, 'mess') ? 0.75 : 1, load = messK === 1 ? fighters.length + farF : fighters.length + farF - (1 - messK)*(fighters.filter(a => a.dh === 'war').length + (((s.daughters || []).find(q => q.key === 'war' && !q.real) || { pop: {} }).pop.soldier || 0)); /* build 50: the War Camp's Mess hall */
    if (fighters.length + farF){ c.protein -= load*0.5/60*dt*Math.pow(0.75, Math.max(0, roomCount(s, 'barracks') - 1));
      if (c.protein < 0){ c.protein = 0; c.pstarve += dt; if (c.pstarve > 30 && (c.pstarve - 30) % 10 < dt){ const v = fighters.filter(a => !a.isPlayer), r = Math.floor(Math.random()*(v.length + farF)); /* build 47.2: any fighter, near or far, by their numbers */ if (r < v.length) killAnt(s, v[r], 'nomeat'); else { let k = r - v.length; for (const d of s.daughters || []){ if (d.real) continue; for (const q in d.pop || {}){ if (CASTES[q].fight < 3) continue; if (k < d.pop[q]){ d.pop[q]--; c.deaths.nomeat = (c.deaths.nomeat || 0) + 1; k = -1; break; } k -= d.pop[q]; } if (k < 0) break; } } s.events.push('soldierfood'); if (!P.msg) P.msg = 'Soldiers are starving: they need 🥩 meat.' + (roomOf(s, 'larder') ? ' Hunt, or keep the store fuller for the Egg larder.' : ' Hunt, or build an Egg larder (Trophic eggs).'); } }
      else c.pstarve = 0; }
    // Build 23: the rooms at work.
    // Fungus garden: leaves the gardeners brought in grow into food.
    const fg = roomCount(s, 'fungus');
    if (fg && (c.fungus || 0) > 0){ const lv = roomLevel(s, 'fungus'), rate = fg*(lv >= 3 ? 0.2 : 0.1)*(1 + 0.25*inBand(s, 'fungus'))*(joined(s, 'garden') ? 1.25 : 1)*dt, /* build 49: the Garden */ use = Math.min(c.fungus, rate); c.fungus -= use; c.store = Math.min(c.cap, c.store + use*(lv >= 3 ? 3 : lv >= 2 ? 2.25 : 1.5)); }
    // Aphid barn: each rancher at work makes half a 🍯 a minute.
    const rh = workers(s, 'rancher', 'herd', 'dairy', 4);
    if (rh){ const lv = roomLevel(s, 'dairy'), gentle = s.ants.some(a => !a.team && a.caste === 'rancher' && a.state === 'in' && promo(s, a, 'gentle')) ? 1.3 : 1; c.dairyAcc = (c.dairyAcc || 0) + rh*0.5/60*dt*(lv >= 3 ? 2 : lv >= 2 ? 1.5 : 1)*gentle; /* build 40: a Gentle rancher milks 30% more */ if (c.dairyAcc >= 1){ c.dairyAcc -= 1; addSugar(s, 1); if (lv >= 3) c.store = Math.min(c.cap, c.store + 1); } }
    // Infirmary: medics heal the wounded inside (your ant too, at level II) and cure Cordyceps.
    const md = workers(s, 'medic', 'heal', 'infirmary', 3);
    if (md){ const lv = roomLevel(s, 'infirmary'), hr = (lv >= 2 ? 2 : 1)*md*0.5*dt; // build 40: every medic counts (was capped at 3)
      for (const a of s.ants) if (!a.team && (a.state === 'in' || a.state === 'build' || (a.isPlayer && lv >= 2 && P.inNest)) && a.hp < maxHp(s, a)) a.hp = Math.min(maxHp(s, a), a.hp + hr);
      for (const a of s.ants) if (!a.team && a.infect != null && a.infect < CORD.turn && a.state === 'in' && Math.random() < dt*0.25*md){ a.infect = null; if (!c.saidMedic){ c.saidMedic = true; P.msg = 'Your medics cured an ant of the fungus.'; } } }
    // Honeypot vault III: in a famine the repletes feed the colony (half a food a second each, from a reserve refilled when food is plenty).
    const rp = roomLevel(s, 'honeypot') >= 3 ? workers(s, 'replete', 'hang', 'honeypot', 4) : 0;
    if (rp){ if (c.store > c.cap*0.6 && (c.crop || 0) < rp*40){ const put = Math.min(dt, rp*40 - (c.crop || 0)); c.crop = (c.crop || 0) + put; c.store -= put; } /* build 40: filled from the store, not from nothing */ else if (c.store < 3 && (c.crop || 0) > 0){ const g = Math.min(c.crop, rp*0.5*dt); c.crop -= g; c.store += g; } }
    // Build 51: Fungus Empire (2 food a minute a garden, leaves or not), Blue Butterfly Pact (4 sugar, 2 meat a minute),
    // Weaver Canopy (your ants heal beside an outpost).
    if (has(s, 'fungusempire') && fg) c.store = Math.min(c.cap, c.store + fg*2/60*dt);
    if (c.trophies.comb) c.protein += 3/60*dt; // build 57: hornet larvae
    if (c.trophies.croak) c.water = Math.min(c.waterCap, c.water + 0.5*dt); // build 54: the Ditch is yours, water never runs short
    if (has(s, 'butterfly')){ c.bflyAcc = (c.bflyAcc || 0) + dt/15; while (c.bflyAcc >= 1){ c.bflyAcc -= 1; addSugar(s, 1); c.bflyN = ((c.bflyN || 0) + 1) % 2; if (c.bflyN) c.protein += 1; /* every other one */ } }
    if (has(s, 'weaver') && s.keepMask) for (const a of s.ants) if (!a.team && outside(a) && s.keepMask[idx(a.tx, a.ty)] && a.hp < maxHp(s, a)) a.hp = Math.min(maxHp(s, a), a.hp + 0.5*dt);
    // Egg larder (build 48): food made into meat while the store is over a quarter full and the larder under 150.
    const lr = roomCount(s, 'larder');
    if (lr && c.store > c.cap*0.25 && c.protein < LARDER_FULL){ const lv = roomLevel(s, 'larder'), per = LARDER_RATE[lv - 1]*(1 + 0.5*(lr - 1))/60*dt, cost = per*LARDER_FOOD[lv - 1];
      c.store -= cost; c.protein = Math.min(LARDER_FULL, c.protein + per); c.larderMade = (c.larderMade || 0) + per; }
    // Midden II: the undertakers' compost feeds the fungus garden.
    const ut = roomLevel(s, 'midden') >= 2 && roomOf(s, 'fungus') ? workers(s, 'undertaker', 'tidy', 'midden', 3) : 0;
    if (ut) c.fungus = Math.min(fungusCap(s), (c.fungus || 0) + ut*0.5/60*dt);
    // Flower nectar (build 18): each region held gives half a 🍯 a minute.
    if (has(s, 'nectar') && Object.keys(c.held || {}).length) for (const a of s.ants) if (!a.team && !a.zombie && outside(a) && c.held[s.world.area[idx(a.tx, a.ty)]] && a.hp < maxHp(s, a)) a.hp = Math.min(maxHp(s, a), a.hp + 0.4*dt); // build 40: nectar heals your ants in regions you hold
    if (has(s, 'nectar')){ const n = Object.keys(c.held || {}).length; if (n){ c.nectarAcc = (c.nectarAcc || 0) + n*0.5*(has(s, 'peony') ? 3 : 1)/60*dt; /* build 51: the Peony Pact */ if (c.nectarAcc >= 1){ c.nectarAcc -= 1; addSugar(s, 1); } } }
    // The queen heals slowly; if raiders kill her, the colony is lost.
    const q = s.queen;
    if (q.placed && q.hp <= 0 && qtrait(s, 'eternal') && !c.eternalUsed){ c.eternalUsed = true; q.hp = 60; P.msg = 'The queen fell, but a daughter takes her place. The line goes on.'; }
    if (q.placed && !s.lost){ q.hp = Math.min(100, q.hp + 0.1*dt); if (q.hp >= 99) s.queenWarned = false;
      if (q.hp <= 0){ q.hp = 0; s.lost = true; c.queenAlive = false; s.events.push('lost'); P.msg = 'The queen is dead. The colony is lost.'; } }
    // The queen sitting idle with food to spare: say so (build 15).
    if (s.queen.placed && !c.eggs.length && !c.eggQueue.length && !P.pending && c.store >= 8 && c.water >= 1 && !overCap){ c.idleT = (c.idleT || 0) + dt;
      if (c.idleT > 25 && s.t - (c.nudgeT || -999) > 90){ c.nudgeT = s.t; s.events.push('idlequeen'); P.msg = 'The queen is idle and you have food: tap her in the nest and lay eggs.'; } } else c.idleT = 0;
    if (P.pending && !P.ant && !c.eggs.length && !c.eggQueue.length && s.queen.placed){ c.eggQueue.push(P.rebirth && !eggLock(s, P.rebirth) ? P.rebirth : 'forager'); P.msg = 'Waiting for the next hatchling.'; }
    const nw = roomCount(s, 'workshop'), ws = nw ? 1.5 + 0.5*nw : 1;
    // Construction only advances for builders standing at their own job.
    const crewOf = key => s.ants.filter(a => a.caste==='builder' && a.team===0 && a.state==='build' && a.atWork && a.task === key);
    const atWork = key => crewOf(key).reduce((t, a) => t + workOf(s, a, key[0]), 0);
    tickPlans(s); const job = readyJob(s); // build 74: a planned room waits until it's dug out
    if (job){ const builders = atWork('j') + youBuild(s, job);
      job.progress += builders*ws*dt; const R = ROOMS[job.room];
      if (job.progress >= R.work){ for (const a of crewOf('j')) gainXp(s, a, 3); c.buildQueue.splice(c.buildQueue.indexOf(job), 1); finishRoom(s, job); } }
    for (let i=s.nest.fillOrders.length-1;i>=0;i--){ const o = s.nest.fillOrders[i]; if (s.nest.cells[nidx(o.x,o.y)] === 2){ s.nest.fillOrders.splice(i, 1); continue; } /* never into a room */ const b = atWork('f'+o.x+','+o.y); o.progress += b*ws*dt; if (o.progress >= o.need){ const occupied = s.ants.some(a => !a.team && (a.state==='in'||a.state==='build'||a.state==='nest') && Math.floor(a.nx)===o.x && Math.floor(a.ny)===o.y); if (!occupied){ for (const a of crewOf('f'+o.x+','+o.y)) gainXp(s, a, 1); s.nest.cells[nidx(o.x,o.y)] = 0; s.nest.ver++; s.nest.fillOrders.splice(i,1); } } }
    const full = (s.nest.spoil||0) >= SPOIL_MAX; // dirt waiting to go out: digging stops
    for (let i=s.nest.digOrders.length-1;i>=0;i--){ const o = s.nest.digOrders[i]; if (full) break; const b = atWork('d'+o.x+','+o.y) + youDig(s, o); o.progress += o.glow ? Math.min(b*ws, 1)*(joined(s, 'quarry') ? 1.25 : 1)*dt : b*ws*dt; /* build 52: glowrock comes out at its own pace */ if (o.progress >= o.need){ for (const a of crewOf('d'+o.x+','+o.y)) gainXp(s, a, 1); c.dug++; dig(s, o.x, o.y); bedrockPrize(s, o.x, o.y); bedrockGlow(s, o.y); if (o.glow) gainGlow(s, 1, 'dug'); s.nest.digOrders.splice(i,1); s.nest.spoil = (s.nest.spoil||0) + 1; } }
  }
}
// Build 74 (Mark: "what's the point of your ant being a builder if he cannot dig himself?"): a builder you play
// digs the order beside it and builds the room it stands in, at twice a builder's pace.
function youNurse(s){ const P = s.player, a = P.ant; if (!a || !P.inNest || P.nestKey || a.caste !== 'nurse') return false; const r = roomOf(s, 'hatchery') || s.queen.room, x = Math.floor(a.nx), y = Math.floor(a.ny); return !!r && x >= r.x0 - 1 && x <= r.x0 + (r.w || 4) && y >= r.y0 - 1 && y <= r.y0 + (r.h || 3); }
function youBuilder(s){ const P = s.player, a = P.ant; return a && P.inNest && !P.nestKey && a.caste === 'builder' ? a : null; }
function youBuild(s, job){ const a = youBuilder(s); if (!a) return 0; const x = Math.floor(a.nx), y = Math.floor(a.ny); return x >= job.x0 && x < job.x0 + job.w && y >= job.y0 && y < job.y0 + job.h ? 2 : 0; }
function youDig(s, o){ const a = youBuilder(s); if (!a) return 0; const x = Math.floor(a.nx), y = Math.floor(a.ny); if (Math.abs(x - o.x) + Math.abs(y - o.y) !== 1) return 0; if (o.progress + 0.05 >= o.need) gainXp(s, a, 1); return o.glow ? 1 : 2; }
function finishRoom(s, job){
  carveRoom(s, job, job.room);
  s.player.msg = `${ROOMS[job.room].name} finished: ${ROOMS[job.room].desc.replace(/^./, ch => ch.toLowerCase())}.`; s.events.push('roomdone');
  roomsChanged(s);
}
// What the rooms add up to: recomputed whenever one is built or torn out.
export function roomsChanged(s){
  const c = s.colony, nn = roomCount(s, 'nursery');
  c.hatchCap = hatchCapOf(s); c.cap = storeCap(s); c.waterCap = waterCapOf(s); c.hatchMul = (nn ? 0.7*Math.pow(0.85, nn - 1) : 1)*(1 - 0.1*inBand(s, 'hatchery'))*(1 - 0.1*inBand(s, 'nursery'));
  c.store = Math.min(c.store, c.cap); c.water = Math.min(c.water, c.waterCap);
}
function hatch(s, c, caste){
  const a = mkAnt(s, caste, 'in', c.ex, c.ey, c.team);
  if (!c.team){ c.hatched++; if (c.hatched % 10 === 0) gainGenes(s, 1, c.hatched + ' eggs hatched');
    // A head start: the Drill hall for fighters, Colony memory for everyone.
    if (has(s, 'memory') || picked(s, 'nurse', 'teacher') || (has(s, 'drillhall') && CASTES[caste].fight >= 3)) a.xp = RANKS[1].xp;
    if (has(s, 'memory')) a.xp = RANKS[2].xp; // build 40: Colony memory now hatches Veterans
    for (const n of s.ants) if (n.caste === 'nurse' && !n.team && (n.state === 'in' || n.state === 'build')) gainXp(s, n, 1); const r = s.queen.room; a.nx = r.x0+1.5; a.ny = r.y0+1.5; a.ntx = r.x0+1; a.nty = r.y0+1; a.rest = 2;
    if (s.player.pending){ s.player.nestKey = null; a.isPlayer = true; a.hp = Math.max(youHp(s), maxHp(s, a)); s.player.rebirth = null; a.state = 'nest'; s.player.ant = a; s.player.pending = false; s.player.hunger = 100; s.player.inNest = true; s.player.tx = null; s.player.ntx = null; s.player.msg = ''; } }
}
// How readily Cordyceps spreads (build 24): halved by glands, and by a working Midden (all but stopped at its III).
export function cordResist(s){ let k = 1; if (has(s, 'glands')) k *= 0.5; const u = roomOf(s, 'midden') ? workers(s, 'undertaker', 'tidy', 'midden', 3) : 0; if (u) k *= roomLevel(s, 'midden') >= 3 ? 0.15 : Math.max(0.3, 0.7 - 0.1*u); return k; } // build 40: each undertaker counts
export function enterNest(s, a){
  a.state = 'in'; a.rest = 3 + Math.random()*8; a.explore = 0; a.goal = null;
  if (!a.team){ a.nx = SHAFT; a.ny = 0; a.ntx = SHAFT; a.nty = 0; }
}
export function exitNest(s, a, state){
  const col = a.dh && daughterOf(s, a) ? daughterOf(s, a) : colonyOf(s, a); /* (build 46: a daughter's ants come out of her door) */ a.dhSpot = null; a.tx = col.ex; a.ty = col.ey; a.x = (col.ex+0.5)*T; a.y = (col.ey+0.5)*T;
  const ang = Math.random()*Math.PI*2; a.dx = Math.cos(ang); a.dy = Math.sin(ang); a.state = state; a.explore = 0; a.goal = null;
  if (state === 'fight'){ chooseToward(s, a, s.spider ? s.spider.x : a.x, s.spider ? s.spider.y : a.y); }
  else if (state === 'raid'){ chooseToward(s, a, (s.colony.ex+0.5)*T, (s.colony.ey+0.5)*T); }
  else chooseExplore(s, a, state==='patrol' ? 9 : 0);
}
function roomTarget(s, a){
  const key = CASTE_ROOM[a.caste] && roomOf(s, CASTE_ROOM[a.caste]) ? CASTE_ROOM[a.caste] : a.caste==='soldier'||a.caste==='venom' ? 'barracks' : a.caste==='nurse' ? (roomOf(s,'nursery')?'nursery':'hatchery') : a.caste==='forager' ? 'store' : 'queen';
  let r = roomOf(s, key) || s.queen.room; if (!r) return [SHAFT, 0];
  return [r.x0 + Math.floor(Math.random()*(r.w||4)), r.y0 + Math.floor(Math.random()*(r.h||3))];
}
export function tickInside(s, a, dt){
  const col = colonyOf(s, a), C = CASTES[a.caste];
  if (a.dh){ // build 46: a daughter's ant, resting in her chambers (abstract, like a rival's)
    if (a.dhSpot == null){ a.dhSpot = Math.floor(Math.random()*DSPOTS.length); a.nx = DSPOTS[a.dhSpot][0]; a.ny = DSPOTS[a.dhSpot][1]; a.ntx = Math.floor(a.nx); a.nty = Math.floor(a.ny); } /* build 50 */
    a.rest -= dt; if (a.rest > 0) return; const d = daughterOf(s, a); if (!d){ a.dh = null; a.rest = 2; return; }
    if (C.fight >= 3){ if (s.alarm[idx(d.ex, d.ey)] > 0.2) exitNest(s, a, 'fight'); else if (Math.random() < 0.35) exitNest(s, a, 'patrol'); else a.rest = 3; }
    else if (a.caste !== 'forager'){ a.rest = 6; } /* build 49: her builders and nurses work in her chambers */
    else { a.duty = 'food'; exitNest(s, a, 'explore'); }
    return;
  }
  if (a.team){ // rival: abstract
    a.rest -= dt; if (a.rest > 0) return;
    if (s.myRaid && s.myRaid.phase === 'inside' && s.myRaid.team === a.team){ a.rest = 1; return; } // build 28: holding their halls
    const hunger = Math.max(0, 1 - col.store/col.cap);
    if (rspec(a).swarm && s.alarm[idx(col.ex,col.ey)] > 0.2){ exitNest(s, a, 'fight'); return; } // build 25.1: the whole swarm pours out to defend
    if (C.fight >= 3){ if (s.alarm[idx(col.ex,col.ey)] > 0.2) exitNest(s, a, 'fight'); else if (Math.random() < 0.2) exitNest(s, a, 'patrol'); else a.rest = 3; }
    else { if (0.3 + hunger*0.9 > a.thr.f) exitNest(s, a, 'explore'); else a.rest = 2; }
    return;
  }
  if (a.state === 'nest') return; // player inside: handled in stepPlayer
  const c = col; const q = s.queen;
  if (!q.placed){ a.rest = 1; return; }
  // Builders claim one task and keep it until it is finished. Free, they take
  // nest work when Dig and build is the first of their duties that needs doing.
  if (a.caste === 'builder'){
    if (a.task && !builderTaskValid(s, a)){ a.task = null; a.taskCell = null; }
    if (!a.task && a.goal !== 'exit' && chooseDuty(s, a) === 'build') pickBuilderTask(s, a);
    if (a.task){ a.state = 'build'; a.duty = 'build'; a.ntx = a.taskCell[0]; a.nty = a.taskCell[1]; }
    else if (a.state === 'build'){ a.state = 'in'; a.goal = null; }
  }
  if (a.state === 'in' && a.goal == null){ const [tx,ty] = roomTarget(s, a); a.ntx = tx; a.nty = ty; a.goal = 'idle'; }
  // walk inside; work only counts once the builder stands on its own cell
  const arrived = nestStep(s, a, C.speed*0.8, dt);
  a.atWork = a.state === 'build' && arrived && Math.floor(a.nx) === a.ntx && Math.floor(a.ny) === a.nty;
  // A hauler at the top of the shaft takes a load of dirt out.
  if (a.task === 'h' && a.atWork){ a.task = null; a.taskCell = null;
    if ((s.nest.spoil||0) > 0){ const loads = Math.min(s.nest.spoil, 1 + (lvl(s, 'builder') >= 2 ? 1 : 0) + (promo(s, a, 'packer') ? 1 : 0)); s.nest.spoil -= loads; exitNest(s, a, 'spoil'); a.carry = 1; a.loads = loads; a.kind = 'dirt'; a.itype = 'dirt'; chooseToward(s, a, (s.spoilAt.x+0.5)*T, (s.spoilAt.y+0.5)*T); }
    return; }
  if (a.state !== 'in') return;
  if (arrived && a.goal === 'exit' && !a.exitTo) a.goal = null; /* build 41: a save from before exitTo was kept */
  if (arrived && a.goal === 'exit' && !reachable(s, Math.floor(a.nx), Math.floor(a.ny))){ a.goal = null; a.exitTo = null; a.rest = 4; } /* build 47: walled in: wait for the builders instead of freezing */
  if (!arrived || a.goal === 'exit') return;
  a.rest -= dt; if (a.rest > 0) return;
  // What next: the first of its duties that needs doing (build 17).
  const d = chooseDuty(s, a); a.duty = d;
  let go = null;
  if (d === 'guard') go = doorAlarm(s) > 0.05 ? 'fight' : 'patrol';
  else if (d === 'hunt' && C.fight >= 3) go = 'hunt';
  else if (d && DUTIES[d].out && s.alarm[idx(c.ex,c.ey)] < 0.5) go = 'explore';
  if (go){ a.goal = 'exit'; a.ntx = SHAFT; a.nty = 0; a.state = 'in'; a.rest = 0;
    // walk to exit over following ticks; mark pending
    a.exitTo = go; }
  else a.rest = 2 + Math.random()*3;
}
