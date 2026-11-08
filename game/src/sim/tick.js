// The main tick, and day and night (build 43).
import { AREAS, REGION, SCALE } from './yard.js';
import { CASTES, FOODS, LEAF_GROUND, RIVALS, SHELL_GROUND, SURF, T, W, WOOD_GROUND, heavy, idx, rspec } from './core.js';
import { deposit, enterNest, killAnt, tickColony, tickInside } from './colony.js';
import { SEE, chooseExplore, chooseReturn, chooseToward, colonyOf, fSpeed, forageRange, homeOf, itemAt, nearestItem, raiseAlarm, reveal, spawnCat, spawnFood, spawnInArea, spawnNear, stepTo, walk, wanted } from './world.js';
import { roomOf, tickMaintenance, tickRain, wet } from './nest.js';
import { bite, carryCap, chewsTreats, gainGenes, gainXp, has, makeLegend, paceOf, picked, qtrait, reachOf, sightOf, stingSlow, tickGoals, tickSeen, trailHome } from './progress.js';
import { daughterOf, tickDaughters } from './daughters.js';
import { WILD_SIDE, tickWild } from './wilds.js';
import { wakeRival } from './state.js';
import { prizeFx, tickOutposts } from './outposts.js';
import { DUTIES, ROUND_PACE, chooseDuty, preyNear, stepPost, woodGoal } from './jobs.js';
import { rivalBrain, tickMyRaid } from './raids.js';
import { CAT_REACH, LEG_HP, SPIDER_REACH, legSlot, spiderEnter, spiderRoute, stepCat, stepSpider } from './spider.js';
import { ATTACK_LEASH, HOLD_R, attackReach, attackTarget, stepPlayer, tickAttack, tickZones } from './player.js';
import { outside, tickMower, tickPits, tickStings, tickStrikes } from './hazards.js';
import { knock, playerNear, populateBugs, stepBugs, tickSplash } from './creatures.js';
import { DUEL_ROUND, duelGangs, hurtAnt, pinnedNow, spark, swing } from './combat.js';
import { exposed, stunned } from './abilities.js';
import { bossAim, shove, tickBosses } from './bosses.js';
import { stepZombie, tickDirector } from './events.js';
import { tickCurios } from './curios.js';

// A day and its night last ten minutes: dawn, about six minutes of day, dusk, nearly three of night.
export const DAY = 600;
export const dayPhase = s => (((s.dayT || 0) % DAY) + DAY) % DAY/DAY;
export function daylight(s){ const p = dayPhase(s); if (p < 0.04) return 0.5 + p/0.04*0.5; if (p < 0.62) return 1; if (p < 0.68) return 1 - (p - 0.62)/0.06; if (p < 0.96) return 0; return (p - 0.96)/0.04*0.5; }
export const isNight = s => daylight(s) < 0.35;
// Seconds until the light next turns (night falls, or dawn).
export function untilTurn(s){ const p = dayPhase(s); const at = p < 0.659 ? 0.659 : p < 0.988 ? 0.988 : 1.659; return Math.round((at - p)*DAY); } // (where isNight turns: daylight 0.35)
export const DIURNAL = { jumper: 1, wasp: 1, skink: 1 }; // hunters that sleep at night
function tickDay(s, dt){
  s.dayT = (s.dayT ?? DAY*0.02) + dt; const night = isNight(s);
  if (s.nightNow === undefined) s.nightNow = night;
  if (night && !s.nightNow){ s.nightNow = true; s.nights = (s.nights || 0) + 1;
    s.events.push('night'); // (build 68: the HUD's clock marks it, not a banner)
    // Day hunters out on a kill let go and go to roost.
    for (const b of s.critters || []) if (DIURNAL[b.kind] && b.carry){ const a = s.ants.find(o => o.id === b.carry); if (a && a.state === 'away'){ a.state = 'return'; a.x = b.x; a.y = b.y; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); } b.carry = null; } }
  else if (!night && s.nightNow){ s.nightNow = false;
    if (s.queen.placed && s.nights === 1 && !s.colony.firstDawn){ s.colony.firstDawn = true; gainGenes(s, 1, 'your first night survived'); }
    s.events.push('dawn');
    spawnDew(s, 2); }
}
function spawnDew(s, mul){ s.dew = true; s.dewTimer = 0; for (const [ai, n] of [[REGION.rock, 6], [REGION.lawn, 4], [REGION.flowerbed, 4], [REGION.clover, 3], [REGION.dandelions, 3]]) for (let i = 0; i < n*mul; i++) spawnInArea(s, ai, 'water', 'dew', 8); s.events.push('dew'); if (!s.player.msg && mul === 1) s.player.msg = 'Dew is out: water for a minute.'; } // (dawn's dew: the clock says so)
// Build 80: your workers inside the nest, who stand round the queen when raiders break in (they halve the harm).
const homeGuards = (s) => { const n = s.homeGuardN; if (n && n.t === s.t) return n.n; let k = 0; for (const o of s.ants) if (!o.team && !o.isPlayer && (o.state === 'in' || o.state === 'build')) k++; s.homeGuardN = { t: s.t, n: k }; return k; };
export function tick(s, dt){
  s.t += dt; const w = s.world, c = s.colony, P = s.player;
  // Messages fade after a while instead of sticking until the next one.
  if (P.msg !== s.msgSeen){ s.msgSeen = P.msg; s.msgAt = s.t; } else if (P.msg && P.ant && s.t - s.msgAt > 10) P.msg = '';
  while (s.hits.length && s.t - s.hits[0].t > 0.6) s.hits.shift();
  while (s.splashes.length && s.t - s.splashes[0].t > 0.9) s.splashes.shift();
  if (s.spiderCorpse && s.t - s.spiderCorpse.t > 6) s.spiderCorpse = null;
  if (s.catCorpse && s.t - s.catCorpse.t > 3) s.catCorpse = null;
  const td = Math.pow(0.5, dt/(s.rain && wet(s) ? 4 : has(s, 'scent') ? 180 : 90)), ad = Math.pow(0.5, dt/8); const tr = s.trail, al = s.alarm;
  // Only tiles with scent on them decay (s.hot); the yard is too big to sweep.
  const keep = s.keepMask, wa = s.wild && s.wild.stirred ? s.world.area : null, tdW = Math.pow(0.5, dt/22); for (const i of s.hot){ if (keep[i] && !(s.rain && wet(s))){ if (al[i] > 0.001) al[i] *= ad; else al[i] = 0; continue; } if (tr[i] > 0.001) tr[i] *= wa && WILD_SIDE[wa[i]] ? tdW : td; else tr[i] = 0; /* build 53: the wilds scatter scent four times as fast */ if (al[i] > 0.001) al[i] *= ad; else al[i] = 0; if (!tr[i] && !al[i]) s.hot.delete(i); }
  for (const col of [c, ...s.rivals]) if (!col.asleep) tickColony(s, col, dt);
  if (s.queen.placed){ tickDaughters(s, dt); tickWild(s, dt); }
  // A rival colony moves in at its time, or once you've done what brings it (build 25; see RIVALS).
  for (const r of s.rivals) if (r.asleep && s.queen.placed && RIVALS[r.team - 1].arrive(s)) wakeRival(s, r, true);
  // dew
  tickDay(s, dt);
  s.dewTimer += dt; if (!s.dew && s.dewTimer > 110 && !isNight(s)) spawnDew(s, 1); // (build 43: no dew at night; a heavy one at dawn)
  if (s.dew && s.dewTimer > 60){ s.dew = false; s.dewTimer = 0; s.items = s.items.filter(f => f.type !== 'dew'); }
  tickRain(s, dt); tickSplash(s, dt); tickMaintenance(s, dt);
  // Food grows back area by area at each area's own pace (yard.js), so the
  // ground near home runs thin and the rich food is far away.
  for (let i=0;i<AREAS.length;i++){ if (!s.active[i]) continue; const A = AREAS[i], pf = prizeFx(s, i); s.areaT[i] += dt*A.rate/60*(pf === 'food2' ? 2 : pf === 'food15' ? 1.5 : 1);
    if (s.areaT[i] >= 1){ s.areaT[i] -= 1; let n = 0; for (const f of s.items) if ((f.kind==='food'||f.kind==='protein') && f.amt > 0 && !f.max && w.area[idx(f.x,f.y)] === i) n++; if (n < A.max) spawnFood(s, i, s.t > 180); } }
  s.itemTimer += dt; if (s.itemTimer > 9){ s.itemTimer = 0;
    if (s.items.filter(f=>f.kind==='grit').length < 10) spawnInArea(s, Math.random() < 0.6 ? REGION.rock : REGION.woodpile, 'grit', 'pebble');
    // Build 23: twigs (🪵) on bark, mulch, leaves, hedges and round the Oak, once wood is wanted;
    // leaf pieces on green ground once a fungus garden stands.
    if (woodGoal(s) && s.items.filter(f => f.kind === 'wood').length < 8) spawnNear(s, 'wood', 'twig', () => true, WOOD_GROUND); // (blown onto the patio and lawn too)
    if (roomOf(s, 'fungus') && s.items.filter(f => f.kind === 'leaf').length < 10) spawnNear(s, 'leaf', 'leafbit', () => true, LEAF_GROUND);
    // Beetle shells (build 18): now and then in bark, compost, gravel and leaves; more in a held Woodpile.
    if (Math.random() < 0.25 && s.items.filter(f => f.kind === 'chitin').length < 5){ const opts = []; for (let i = 0; i < AREAS.length; i++) if (s.active[i] && SHELL_GROUND.test(AREAS[i].ground || '')) opts.push(i, ...(prizeFx(s, i) === 'chitin' ? [i, i] : [])); if (opts.length) spawnInArea(s, opts[Math.floor(Math.random()*opts.length)], 'chitin', 'shell'); }
    // Held stony regions turn up extra pebbles; held gardens' aphids refill twice as fast.
    for (const i in s.colony.held) if (prizeFx(s, i) === 'stone' && s.items.filter(f => f.kind === 'grit' && w.area[idx(f.x,f.y)] === +i).length < 6) spawnInArea(s, +i, 'grit', 'pebble');
    for (const f of s.items) if (f.max) f.amt = Math.min(f.max, f.amt + (f.type === 'aphids' && prizeFx(s, w.area[idx(f.x,f.y)]) === 'aphids' ? 6 : 3)); }
  // The Picnic Blanket held: a treat lands there every few minutes.
  for (const i in s.colony.held) if (prizeFx(s, i) === 'picnic'){ s.picnicT = (s.picnicT || 0) + dt; if (s.picnicT > 150 && !s.items.some(f => heavy(f) && w.area[idx(f.x,f.y)] === +i)){ s.picnicT = 0; const A = AREAS[i]; const it = spawnInArea(s, +i, 'food', A.treats ? A.treats[Math.floor(Math.random()*A.treats.length)] : 'cookie'); if (it && !P.msg) P.msg = `A ${FOODS[it.type].name} landed on the Picnic Blanket.`; } }
  s.items = s.items.filter(f => f.amt > 0 || f.max);
  tickMower(s, dt); tickPits(s, dt); tickStrikes(s, dt); tickStings(s, dt); tickAttack(s); tickZones(s, dt); tickOutposts(s, dt); tickGoals(s, dt); tickSeen(s);
  s.seenT += dt; if (s.seenT > 0.4){ s.seenT = 0; const pa = P.ant; if (pa && !P.inNest){ reveal(s, pa.x/T, pa.y/T, SEE.player); tickCurios(s, pa);
    // Walking into a dormant region wakes it: its food appears and starts to grow.
    const ai = w.area[idx(pa.tx, pa.ty)]; if (!s.active[ai]){ s.active[ai] = true; for (let k=0;k<AREAS[ai].start;k++) spawnFood(s, ai, false); populateBugs(s, ai); }
    if (!c.scouted[ai] && ai !== REGION.rock){ c.scouted[ai] = true; gainGenes(s, 1, 'scouting ' + AREAS[ai].name.replace(/^The /, 'the ')); } } }
  stepSpider(s, dt); if (!s.spider){ if (s.spiderAway){ s.spiderAway.t -= dt; if (s.spiderAway.t <= 0){ spiderEnter(s, s.spiderAway.hp); s.spiderAway = null; } } else { s.spiderRespawn -= dt; if (s.spiderRespawn <= 0){ spiderEnter(s, 150); s.spiderRespawn = 120; } } }
  stepBugs(s, dt); tickBosses(s, dt); tickDirector(s, dt);
  stepCat(s, dt); if (!s.cat){ s.catRespawn -= dt; if (s.catRespawn <= 0){ spawnCat(s); s.catRespawn = 90; } }
  // buckets for combat
  const buckets = new Map();
  for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest' || a.state==='away') continue; const k = a.ty*W + a.tx; let b = buckets.get(k); /* build 45: number keys, not strings */ if (!b) buckets.set(k, b = []); b.push(a); }
  // Fighters near the spider, per team: guards only take it on as a crew.
  const spiderCrew = [0, 0, 0, 0, 0, 0];
  if (s.spider) for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest' || a.state==='away') continue; if ((CASTES[a.caste].fight >= 3 || a.follow) && Math.hypot(a.x - s.spider.x, a.y - s.spider.y) < 4*T) spiderCrew[a.team]++; }
  duelGangs(s);
  const enemiesNear = (a, r) => { const out = []; for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++){ const xx = a.tx+dx; if (xx < 0 || xx >= W) continue; const b = buckets.get((a.ty+dy)*W + xx); if (b) for (const o of b) if (o.team !== a.team && o.state !== 'dead') out.push(o); } return out; };
  for (const a of s.ants){
    if (a.state === 'dead') continue;
    if (a.isPlayer){ stepPlayer(s, a, dt, enemiesNear); continue; }
    const C = CASTES[a.caste], col = colonyOf(s, a);
    if (a.state === 'away') continue; // build 28: inside a rival nest on your raid
    if (a.state === 'in' || a.state === 'build' || a.state === 'nest'){ tickInside(s, a, dt); continue; }
    if (a.knockT > 0){ knock(s, a, dt); continue; }
    if (a.dodge){ // build 82: jumping clear of a guardian's attack
      if (s.t > a.dodge.until) a.dodge = null;
      else { const D = a.dodge, dx = D.x - a.x, dy = D.y - a.y, d = Math.hypot(dx, dy); if (d > 1){ const m = Math.min(d, fSpeed(s, a)*1.3*SURF*dt); a.x += dx/d*m; a.y += dy/d*m; a.dx = dx/d; a.dy = dy/d; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); } continue; }
    }
    if (a.slowT > 0) a.slowT -= dt;
    if (a.state === 'zombie'){ stepZombie(s, a, dt); continue; }
    if (a.state === 'climb') continue; // build 57: on the Oak's bark (tickClimb moves it)
    if (a.flee > 0) a.flee -= dt; else a.fleeFrom = null;
    const aggressive = C.fight >= 3 || a.follow || a.state === 'raid' || a.defendT > s.t || (a.team && (rspec(a).swarm || (rspec(a).fierce && Math.hypot(a.tx - col.ex, a.ty - col.ey) < 20)));
    // spider / enemies
    if (s.spider){ const sd = Math.hypot(a.x - s.spider.x, a.y - s.spider.y) * (s.spider.rest > 0 ? 2.5 : 1); // waiting at its web, it's hard to see
      const brave = a.follow || a.state === 'raid' || (a.state === 'fight' && a.goal === 'spider') || spiderCrew[a.team] >= 5;
      if (sd < (has(s, 'danger') && !aggressive ? 7 : 3.5)*T){ if (aggressive && brave){ if (a.state !== 'follow' && a.state !== 'raid' && a.state !== 'hold') a.state = 'fight'; a.goal = 'spider'; } else if (a.state !== 'fight'){ a.flee = 2; } } }
    const reach = reachOf(s, a), en = enemiesNear(a, aggressive ? reach : 2);
    if (a.burnT > 0){ a.burnT -= dt; a.hp -= dt/3; if (a.hp <= 0){ killAnt(s, a, 'fireants'); continue; } }
    if (!en.length) a.foeId = 0;
    if (en.length){
      // Rival soldiers fight half again as hard on their own doorstep.
      if (aggressive){ // build 27: a duel, one swing a round
        let o = a.foeId && en.find(q => q.id === a.foeId && Math.abs(q.tx-a.tx)<=reach && Math.abs(q.ty-a.ty)<=reach);
        // Build 71: spread the duels. A new foe is the one in reach with the fewest on it already (one-on-one
        // first, then two, then three); a fourth looks elsewhere instead of piling on.
        if (!o){ let best = null, bn = 3; for (const q of en){ if (Math.abs(q.tx-a.tx) > reach || Math.abs(q.ty-a.ty) > reach) continue; const g = (s.gangs && s.gangs.get(q.id)) || 0; if (g < bn){ bn = g; best = q; } } o = best; a.foeId = o ? o.id : 0; if (o){ s.gangs.set(o.id, bn + 1); if (!(a.rollT > 0)) a.rollT = Math.random()*DUEL_ROUND; } }
        if (o && !stunned(s, a)){ a.rollT = (a.rollT || 0) - dt; if (a.rollT <= 0){ a.rollT += DUEL_ROUND; swing(s, a, o); } }
        // Build 71: room to fight. A duellist keeps biting distance from its foe, and fighters of one side ease
        // apart, so a clash reads as a band of pairs, not a heap.
        if (o && !(a.lockT > 0)){ let px = 0, py = 0; const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < 0.75*T){ px += dx/d*(0.75*T - d); py += dy/d*(0.75*T - d); }
          for (let by = -1; by <= 1; by++) for (let bx = -1; bx <= 1; bx++){ const bk = buckets.get((a.ty + by)*W + a.tx + bx); if (bk) for (const q of bk){ if (q === a || q.team !== a.team || !q.foeId) continue; const ex = a.x - q.x, ey = a.y - q.y, e = Math.hypot(ex, ey); if (e > 0.01 && e < 0.85*T){ px += ex/e*(0.85*T - e); py += ey/e*(0.85*T - e); } } }
          const pm = Math.hypot(px, py); if (pm > 0.01){ const k = Math.min(pm, 20*dt)/pm, nx = a.x + px*k, ny = a.y + py*k; if (walk(s, Math.floor(nx/T), Math.floor(ny/T))){ a.x = nx; a.y = ny; a.tx = Math.floor(nx/T); a.ty = Math.floor(ny/T); } } }
        if (a.state === 'explore' || a.state === 'return' || a.state === 'patrol') { a.state = 'fight'; a.goal = 'enemy'; } }
      else if (en.some(o => CASTES[o.caste].fight >= 3 || o.follow)){ a.flee = 2.5; }
    }
    // Build 27: mandibles locked, it can't move this round; pinned by three, it can't run.
    if (a.lockT > 0){ a.lockT -= dt; continue; }
    if (a.flee > 0 && pinnedNow(s, a)) a.flee = 0;
    if (a.team && rspec(a).key === 'argentine' && en.length) a.flee = 0;
    if (a.flee > 0 && a.state !== 'fight' && a.state !== 'follow' && a.state !== 'hold' && a.state !== 'raid'){
      const threat = a.fleeFrom || (s.spider && Math.hypot(a.x-s.spider.x, a.y-s.spider.y) < 4*T ? s.spider : (en[0] || s.spider || {x:a.x+1,y:a.y}));
      if (stepTo(a, a.tx, a.ty, C.speed+20, dt)) chooseToward(s, a, a.x + (a.x - threat.x), a.y + (a.y - threat.y));
      continue;
    }
    if (a.state === 'fight'){
      let tx = null, ty = null;
      if (a.goal === 'spider' && s.spider){ const L = legSlot(s, a); tx = L.x; ty = L.y; } // build 73: its leg, not its belly
      else if (a.goal === 'bug'){ const b = s.critters.find(o => o.id === a.bugId); if (b && b.state !== 'fly' && Math.hypot(a.x - b.x, a.y - b.y) < 14*T){ tx = b.x; ty = b.y; } }
      else if (a.goal === 'cat'){ if (s.cat && Math.hypot(a.x - s.cat.x, a.y - s.cat.y) < 14*T){ tx = s.cat.x; ty = s.cat.y; } }
      else if (a.goal === 'boss'){ const b = s.bosses[a.bossKey]; if (b && !b.dead && b.mode === 'fight' && Math.hypot(a.x - b.x, a.y - b.y) < 20*T){ tx = b.x; ty = b.y; } }
      else if (a.goal === 'zombie'){ const z = s.ants.find(o => o.id === a.zid && o.zombie && o.state !== 'dead'); if (z){ tx = z.x; ty = z.y; } }
      else if (a.goal === 'stalk'){ const st = s.stalks.find(o => o.id === a.zid); if (st){ tx = st.x; ty = st.y; } }
      else if (a.goal === 'defend'){ /* build 71: called home by Defend: run to the door, then fight whoever is there */ if (Math.hypot(a.tx - c.ex, a.ty - c.ey) < 3){ a.goal = 'enemy'; const e2 = enemiesNear(a, 6); if (e2.length){ tx = e2[0].x; ty = e2[0].y; } } else { tx = (c.ex + 0.5)*T; ty = (c.ey + 0.5)*T; } }
      else { const e2 = enemiesNear(a, 6); if (e2.length){ tx = e2[0].x; ty = e2[0].y; } else if (s.spider && Math.hypot(a.x-s.spider.x, a.y-s.spider.y) < 8*T){ tx = s.spider.x; ty = s.spider.y; } }
      if (tx == null){ a.state = a.carry ? 'return' : a.team ? 'return' : a.duty === 'hunt' ? 'hunt' : 'patrol'; a.explore = 0; continue; }
      { const dd = Math.hypot(a.x-tx, a.y-ty);
        if (a.goal === 'spider' && dd < 1.6*T){ if (dd > 1){ const m = Math.min(dd, paceOf(s, a, C.speed)*SURF*dt); a.x += (tx - a.x)/dd*m; a.y += (ty - a.y)/dd*m; a.dx = (tx - a.x)/dd; a.dy = (ty - a.y)/dd; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); } else if (s.spider){ const ex = s.spider.x - a.x, ey = s.spider.y - a.y, em = Math.hypot(ex, ey) || 1; a.dx = ex/em; a.dy = ey/em; } } // (onto its leg, facing in)
        else if (dd > 0.9*T){ if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed), dt)) chooseToward(s, a, tx, ty); } }
      continue;
    }
    // Hunting (build 17): fighters range out after small game and the
    // caterpillar, and leave the meat for foragers to haul.
    if (a.state === 'hunt'){
      a.explore += dt;
      if (a.explore > 50 || wet(s)){ a.state = 'return'; a.explore = 0; continue; }
      let prey = null, pd = 10*T;
      if (s.cat){ const d = Math.hypot(a.x - s.cat.x, a.y - s.cat.y); if (d < pd){ pd = d; prey = s.cat; } }
      for (const b of s.critters){ if (b.state === 'fly') continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < pd){ pd = d; prey = b; } }
      if (prey){ a.state = 'fight'; a.goal = prey === s.cat ? 'cat' : 'bug'; a.bugId = prey.id; continue; }
      if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed), dt)){ const p = preyNear(s, 60); if (p && Math.random() < 0.6) chooseToward(s, a, p.x, p.y); else chooseExplore(s, a, 40); }
      continue;
    }
    if (a.state === 'raid' && s.colony.trophies.widowsilk && !a.webbed && Math.hypot(a.tx - c.ex, a.ty - c.ey) < 3){ a.webbed = true; a.lockT = 3; a.webT = s.t + 3; } // build 35: the widow's silk at your door
    if (a.state === 'raid'){
      const gx = (c.ex+0.5)*T, gy = (c.ey+0.5)*T;
      if (Math.hypot(a.x-gx, a.y-gy) < 1.5*T){ const guarded = s.ants.some(o => !o.team && o.state!=='dead' && CASTES[o.caste].fight >= 3 && (o.state==='patrol'||o.state==='fight') && Math.hypot(o.tx-c.ex, o.ty-c.ey) < 4) || (picked(s, 'nurse', 'broodguard') && s.ants.some(o => !o.team && o.caste === 'nurse' && (o.state === 'in' || o.state === 'build')));
        // Unguarded, raiders push into the nest and go for the queen.
        a.raidT = (a.raidT||0) + dt; raiseAlarm(s, c.ex, c.ey, 2);
        if (!guarded && s.queen.placed && !s.lost && a.raidT < 10){ s.queen.hp -= 0.8*dt*(homeGuards(s) >= 3 ? 0.5 : 1)* /* build 80: workers at home stand round her */(qtrait(s, 'hardy') ? 0.4 : 1)*(picked(s, 'soldier', 'guardian') ? 0.5 : 1)*(has(s, 'honourguard') ? 0.5 : 1); s.queenHitT = s.t; if (s.queen.hp < 99 && !s.queenWarned){ s.queenWarned = true; s.events.push('queenhit'); P.msg = 'Raiders are attacking the queen!'; } continue; }
        const take = guarded && picked(s, 'soldier', 'doorkeeper') ? 0 : Math.min(guarded ? 1 : 2, c.store); c.store -= take; c.stolen += take; a.carry = take; a.kind = 'food'; a.state = 'return'; a.raidT = 0; continue; }
      if (stepTo(a, a.tx, a.ty, C.speed, dt)) chooseToward(s, a, gx, gy);
      continue;
    }
    if (a.state === 'muster'){ // build 53: marching to a muster
      const M = s.muster; if (!M){ a.state = 'return'; a.follow = false; continue; }
      const gx = (M.x + 0.5)*T, gy = (M.y + 0.5)*T;
      if (Math.hypot(a.x - gx, a.y - gy) < 2*T){ const k = (M.arrived = (M.arrived || 0) + 1), ang = k*2.4, rr = Math.min(3, 0.6 + Math.sqrt(k)*0.45)*T;
        a.state = 'hold'; a.follow = true; a.holdX = gx + Math.cos(ang)*rr; a.holdY = gy + Math.sin(ang)*rr; a.holdCX = gx; a.holdCY = gy; a.foeId = 0; a.goal = null; continue; }
      if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed + 10), dt)) chooseToward(s, a, gx, gy);
      continue;
    }
    if (a.state === 'hold'){ // build 29: guarding a spot
      if (a.holdX == null){ a.state = 'follow'; continue; }
      const hx = a.holdX, hy = a.holdY;
      // Chase an enemy that comes within the guarded ring; never farther than the ring's edge.
      let foe = null, fd = Infinity;
      for (const o of enemiesNear(a, HOLD_R + 1)){ const d = Math.hypot(o.x - hx, o.y - hy); if (d <= HOLD_R*T && d < fd){ fd = d; foe = o; } }
      if (!foe && s.spider && Math.hypot(s.spider.x - hx, s.spider.y - hy) < HOLD_R*T) foe = s.spider;
      if (!foe) for (const b of s.critters || []){ if (b.state !== 'fly' && Math.hypot(b.x - hx, b.y - hy) < HOLD_R*T){ foe = b; break; } }
      if (foe){ if (Math.hypot(a.x - foe.x, a.y - foe.y) > 0.6*T){ if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed + 20), dt)) chooseToward(s, a, foe.x, foe.y); } continue; }
      if (Math.hypot(a.x - hx, a.y - hy) > 0.5*T){ if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed + 15), dt)) chooseToward(s, a, hx, hy); }
      continue;
    }
    if (a.state === 'follow'){
      if (!P.ant || P.inNest){ if (a.recall) continue; a.follow = false; a.fetch = null; a.state = a.carry ? 'return' : 'explore'; continue; }
      const pd = Math.hypot(a.x - P.ant.x, a.y - P.ant.y), tg = attackTarget(s);
      if (a.recall && pd < 3*T) a.recall = false;
      if (pd > (a.recall ? 400 : tg ? ATTACK_LEASH + 10 : 16)*T){ a.follow = false; a.fetch = null; a.state = a.carry ? 'return' : 'explore'; continue; }
      // Build 74: gathering with you (you picked something up), then delivering when you're home.
      if (a.carry && Math.hypot(a.tx - s.world.ex, a.ty - s.world.ey) < 1.6) deposit(s, a);
      if (a.fetch){ const F = a.fetch, gx = (F.x + 0.5)*T, gy = (F.y + 0.5)*T;
        if (tg || a.carry) a.fetch = null;
        else if (Math.hypot(a.x - gx, a.y - gy) < 0.7*T){ const it = s.items.find(x => x.x === F.x && x.y === F.y && x.kind === F.kind && !heavy(x) && !x.carried && x.amt > 0);
          if (it){ const take = Math.min(carryCap(s, a, it), it.amt); it.amt -= take; a.carry = take; a.kind = it.kind; a.itype = it.type; a.ireg = s.world.area[idx(it.x, it.y)]; } a.fetch = null; }
        else { if (stepTo(a, a.tx, a.ty, 95, dt)) chooseToward(s, a, gx, gy); continue; } }
      if (tg){ // build 26: charging what you pointed at
        if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < CAT_REACH*reachOf(s, a)){ const dmg = bite(s, a, 'cat')*dt; s.cat.hp -= dmg; s.cat.hitT = s.t; spark(s, a, (a.x + s.cat.x)/2, (a.y + s.cat.y)/2, 0); gainXp(s, a, dmg/3); stingSlow(s, a, s.cat); }
        const aim = bossAim(s, P.attack, a), gx = aim ? aim.x : tg.x, gy = aim ? aim.y : tg.y, td = Math.hypot(a.x - gx, a.y - gy); // (build 82: the rim, an anchor)
        if (td > (aim ? aim.reach : attackReach(s, P.attack))){ if (stepTo(a, a.tx, a.ty, 95*(picked(s, 'you', 'hero') ? 1.25 : 1), dt)) chooseToward(s, a, gx + (Math.random()-0.5)*T*(aim ? 0.3 : 1), gy + (Math.random()-0.5)*T*(aim ? 0.3 : 1)); }
        continue;
      }
      if (s.cat && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < CAT_REACH*reachOf(s, a)){ const dmg = bite(s, a, 'cat')*dt; s.cat.hp -= dmg; s.cat.hitT = s.t; spark(s, a, (a.x + s.cat.x)/2, (a.y + s.cat.y)/2, 0); gainXp(s, a, dmg/3); stingSlow(s, a, s.cat); }
      // A crew that falls behind hurries to keep up with you.
      if (pd > 1.3*T){ if (stepTo(a, a.tx, a.ty, (pd > 3*T ? 95 : C.speed+15)*(picked(s, 'you', 'hero') ? 1.25 : 1), dt)) chooseToward(s, a, P.ant.x + (Math.random()-0.5)*T, P.ant.y + (Math.random()-0.5)*T); }
      continue;
    }
    // A builder carrying a load of dug dirt out to the spoil heap.
    if (a.state === 'spoil'){
      const sp = s.spoilAt;
      if (Math.hypot(a.x - (sp.x+0.5)*T, a.y - (sp.y+0.5)*T) < 1.2*T){ s.spoilPile = (s.spoilPile||0) + (a.loads || 1); gainXp(s, a, a.loads || 1); a.loads = 0; a.carry = 0; a.kind = null; a.itype = null; a.state = 'return'; continue; }
      if (stepTo(a, a.tx, a.ty, paceOf(s, a, C.speed), dt)) chooseToward(s, a, (sp.x+0.5)*T, (sp.y+0.5)*T);
      continue;
    }
    if (a.state === 'patrol' && a.post != null && !a.team){ // build 81: a guard posted at the door
      const p = stepPost(s, a); if (p === 'wait') continue;
      if (stepTo(a, a.tx, a.ty, fSpeed(s, a)*(a.atPost ? ROUND_PACE : 1), dt) && (a.tx !== p[0] || a.ty !== p[1])) chooseToward(s, a, (p[0]+0.5)*T, (p[1]+0.5)*T); /* build 81.1: a slow round once there */
      continue;
    }
    if (a.state === 'explore' || a.state === 'patrol'){
      a.explore += dt; if (wet(s) && !a.team && a.state === 'explore' && a.explore > 2 && !has(s, 'nightsense')){ a.state = 'return'; a.explore = 0; continue; }
      const f = itemAt(s, a.tx, a.ty); const want0 = a.state === 'explore' ? wanted(s, a) : null, want = () => want0; // build 45: only foragers use it (worked out at the same moment as before, so answers are unchanged)
      // Pick up on arrival: within 2 px, or within this tick's step at speed.
      if (f && a.state === 'explore' && a.carry === 0 && want()[f.kind] && (!heavy(f) || a.team || chewsTreats(s, a)) && !f.carried && Math.hypot(a.x-(a.tx+0.5)*T, a.y-(a.ty+0.5)*T) < 2 + C.speed*SURF*dt){ const take = Math.min(carryCap(s, a, f), f.amt); f.amt -= take; a.carry = take; a.kind = f.kind; a.itype = f.type; a.ireg = w.area[idx(f.x,f.y)]; a.state = 'return'; continue; }
      // Its main work at home came up (orders to dig, eggs to tend): empty-handed, it heads back.
      if (!a.team && a.state === 'explore' && !a.carry && (a.caste === 'builder' || a.caste === 'nurse') && Math.floor(a.explore/2) > Math.floor((a.explore - dt)/2)){ const n = chooseDuty(s, a); if (n === 'build' || n === 'nurse'){ a.state = 'return'; a.duty = n; a.explore = 0; continue; } }
      // Nothing of its duty in sight for a while: help with the next one instead.
      if (!a.team && a.state === 'explore' && a.duty && Math.floor(a.explore/20) > Math.floor((a.explore - dt)/20)){ const n = chooseDuty(s, a, a.duty); if (n && DUTIES[n].out && (n !== 'hunt' || C.fight < 3)) a.duty = n; }
      if (a.explore > (a.state === 'patrol' ? 25 : 60)){ a.state = 'return'; a.explore = 0; continue; }
      if (stepTo(a, a.tx, a.ty, fSpeed(s, a), dt)){ const nf = a.state === 'explore' ? nearestItem(s, a, sightOf(s, a), want()) : null; if (nf) chooseToward(s, a, (nf.x+0.5)*T, (nf.y+0.5)*T); else chooseExplore(s, a, a.state === 'patrol' ? (a.team ? 6 : picked(s, 'soldier', 'escort') ? 18 : 9) : a.team ? 64 : forageRange(s)); }
      continue;
    }
    if (a.state === 'return'){
      if (a.carry > 0 && !a.team && has(s, 'royal') && s.outposts.length){
        let ob = null, od = homeOf(s, a)[idx(a.tx,a.ty)]*0.8; for (const o of s.outposts){ if (!o.done) continue; const d = Math.hypot(o.x - a.tx, o.y - a.ty); if (d < od){ od = d; ob = o; } }
        if (ob){ if (od < 1.3){ deposit(s, a); a.state = 'explore'; a.explore = 0; chooseExplore(s, a, forageRange(s)); continue; } if (stepTo(a, a.tx, a.ty, fSpeed(s, a), dt)) chooseToward(s, a, (ob.x+0.5)*T, (ob.y+0.5)*T); continue; } }
      if (a.carry > 0 && !a.team){ const i = idx(a.tx,a.ty); s.trail[i] = Math.min(5, s.trail[i] + 1.2*dt*(a.caste === 'forager' && picked(s, 'forager', 'trailblazer') ? 2 : 1)); s.hot.add(i); }
      { const door = a.dh && daughterOf(s, a) ? daughterOf(s, a) : col; // (build 46: home is her door)
      if (a.tx === door.ex && a.ty === door.ey && Math.hypot(a.x-(door.ex+0.5)*T, a.y-(door.ey+0.5)*T) < 2){
        if (a.carry) deposit(s, a); enterNest(s, a); if (a.dh && door !== col && !door.real){ door.pop[a.caste] = (door.pop[a.caste] || 0) + 1; a.state = 'dead'; a.folded = true; } /* build 53: home to a daughter who is numbers */ continue; } }
      if (stepTo(a, a.tx, a.ty, fSpeed(s, a), dt)) chooseReturn(s, a);
      continue;
    }
  }
  // spider damage
  if (s.spider){
    let power = 0; const near = [];
    const biters = [];
    for (const a of s.ants){ if (a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest' || a.state==='away') continue; const d = Math.hypot(a.x-s.spider.x, a.y-s.spider.y); if (d < SPIDER_REACH*reachOf(s, a)){ if (d < SPIDER_REACH) near.push(a); if (a.state==='fight' || a.state==='follow' || a.isPlayer || a.state==='raid'){ const b = bite(s, a, 'spider'); power += b; biters.push(a); gainXp(s, a, b*0.5*dt/3); stingSlow(s, a, s.spider); } } }
    s.spider.hp -= power*0.5*dt*(exposed(s, s.spider) ? 1.5 : 1); s.spider.bite += dt;
    // Build 73: each biter's bite lands on the leg it holds; enough and the leg is crippled. The spider's slots
    // forget ants that left the fight.
    { const sp = s.spider, L = sp.legHp || (sp.legHp = [0, 0, 0, 0, 0, 0, 0, 0]); for (const a of biters){ const i = sp.slots && sp.slots[a.id]; const leg = i != null ? i % 8 : (a.id % 8); const was = L[leg] >= LEG_HP; L[leg] += bite(s, a, 'spider')*0.5*dt; if (!was && L[leg] >= LEG_HP){ sp.crippledAt = s.t; if (playerNear(s, sp.x, sp.y, 20)) P.msg = `A leg crippled! (${L.filter(v => v >= LEG_HP).length} of 8)`; } }
      if (sp.slots) for (const id in sp.slots){ const a = s.ants.find(o => o.id === +id); if (!a || a.state === 'dead' || !(a.goal === 'spider' && a.state === 'fight')) delete sp.slots[id]; }
      // The stomp: five or more on its legs, and every five seconds it rears and stamps; everyone in reach is
      // knocked back for a little.
      sp.stompCd = (sp.stompCd ?? 2) - dt;
      if (biters.length >= 5 && sp.stompCd <= 0 && !(sp.eatT > 0)){ sp.stompCd = 5; sp.stompAt = s.t; for (const a of near.concat(biters)){ if (a.state === 'dead' || a.knockT > 0) continue; hurtAnt(s, a, 1, 'spider'); if (a.state !== 'dead') shove(s, a, sp.x, sp.y, 1.6); } } }
    // Eating or full it only bites back when bitten.
    const sp = s.spider, calm = sp.eatT > 0 || sp.full > 0;
    if (biters.length) sp.hitT = s.t;
    if (sp.bite >= 2 && near.length && (!calm || power > 0)){ sp.bite = 0; const v = near[Math.floor(Math.random()*near.length)]; spark(s, null, v.x, v.y, 1); killAnt(s, v, 'spider'); sp.biteAt = s.t;
      if (!calm){ sp.eatT = 3.5; sp.dx = v.x - sp.x; sp.dy = v.y - sp.y; sp.meals = (sp.meals || 0) + 1;
        if (sp.meals >= 3){ sp.full = 60; sp.route = []; sp.passing = false; const ang = Math.random()*Math.PI*2; spiderRoute(s, sp, (w.web.x+0.5+Math.cos(ang)*2.5*SCALE)*T, (w.web.y+(2+Math.abs(Math.sin(ang))*2)*SCALE)*T, 50);
          if (playerNear(s, sp.x, sp.y, 30)) P.msg = 'The spider has eaten its fill. It goes back to its web to sleep it off.'; } } }
    for (const a of biters) spark(s, a, (a.x + sp.x)/2, (a.y + sp.y)/2, 0);
    if (s.spider.hp <= 0){ s.items.push({ x: Math.floor(s.spider.x/T), y: Math.floor(s.spider.y/T), kind:'protein', type:'spider', amt: 40 });
      { const sx = Math.floor(s.spider.x/T) + 1, sy = Math.floor(s.spider.y/T); if (walk(s, sx, sy)) s.items.push({ x: sx, y: sy, kind: 'chitin', type: 'shell', amt: 15 }); }
      const ours = biters.filter(a => !a.team);
      if (ours.length){ for (const a of ours) gainXp(s, a, 50); makeLegend(s, ours[Math.floor(Math.random()*ours.length)], 'Spider-bane'); if (picked(s, 'venom', 'hunter')) trailHome(s, s.spider.x, s.spider.y); }
      const cost = (c.deaths.spider || 0) - (s.spider.cost0 || 0);
      if (!c.trophies.spider){ c.trophies.spider = true; gainGenes(s, 3, 'the spider is dead'); P.msg = `Spider down! It cost you ${cost} ant${cost === 1 ? '' : 's'}. Venom ants unlocked.`; } else { gainGenes(s, 1, 'the spider again'); P.msg = `Spider down again! It cost you ${cost} ant${cost === 1 ? '' : 's'}.`; }
      s.report = { kind: 'spider', lost: cost, t: s.t };
      s.spiderCorpse = { x: s.spider.x, y: s.spider.y, t: s.t };
      c.kills.spider = (c.kills.spider||0)+1; s.spider = null; s.spiderRespawn = 120; }
  }
  if (s.cat && s.cat.hp <= 0){ s.items.push({ x: Math.floor(s.cat.x/T), y: Math.floor(s.cat.y/T), kind:'protein', type:'cat', amt: 40 });
    for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x-s.cat.x, a.y-s.cat.y) < 3*T) gainXp(s, a, 15);
    if (picked(s, 'venom', 'hunter')) trailHome(s, s.cat.x, s.cat.y);
    if (!c.kills.caterpillar) gainGenes(s, 1, 'your first hunt');
    c.kills.caterpillar = (c.kills.caterpillar||0)+1; if (!P.msg) P.msg = 'Caterpillar down! Haul the meat home.'; s.catCorpse = { x: s.cat.x, y: s.cat.y, t: s.t }; s.cat = null; s.catRespawn = 90; }
  // Build 28: rival nests fall to raids you lead (tickMyRaid). A fallen colony's last ants die off.
  for (const r of s.rivals){
    if (r.asleep) continue;
    if (!r.queenAlive){ if (!r.cleared){ for (const a of s.ants) if (a.team === r.team && Math.random() < dt/60) a.state = 'dead'; if (!s.ants.some(a => a.team === r.team && a.state !== 'dead')) r.cleared = true; } continue; }
    if (r.qhp == null) r.qhp = RIVALS[r.team - 1].qhp;
    // Our fighters at their door raise the alarm: their guards pour out. Left alone, the queen heals.
    let ours = 0; for (const a of s.ants){ if (a.team || !outside(a)) continue; if ((CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer) && Math.hypot(a.tx - r.ex, a.ty - r.ey) <= 2.5) ours++; }
    if (ours) raiseAlarm(s, r.ex, r.ey, 1.5);
    r.siege = s.myRaid && s.myRaid.team === r.team ? 1 : 0;
    if (!r.siege) r.qhp = Math.min(RIVALS[r.team - 1].qhp, r.qhp + 3*dt);
  }
  tickMyRaid(s, dt);
  for (const a of s.ants){ if (a.team && a.state !== 'dead' && a.state !== 'in' && CASTES[a.caste].fight >= 3 && Math.hypot(a.tx - c.ex, a.ty - c.ey) < 3){ raiseAlarm(s, c.ex, c.ey, 1.2); break; } }
  for (const r of s.rivals) if (!r.asleep) rivalBrain(s, r, dt);
  s.ants = s.ants.filter(a => a.state !== 'dead');
}
