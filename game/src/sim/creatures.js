// Small creatures (build 16) and hunters (build 37): ladybugs, earwigs, crickets, millipedes, jumping
// spiders, assassin bugs, wasps, skinks; where they live and when they wake.
import { AREA, AREAS, areaBounds } from './yard.js';
import { CASTES, FOODS, H, SURF, T, W, idx } from './core.js';
import { killAnt } from './colony.js';
import { itemAt, walk } from './world.js';
import { wet } from './nest.js';
import { bite, gainGenes, gainXp, picked, reachOf, stingSlow, trailHome, youL } from './progress.js';
import { stepZbug } from './wilds.js';
import { DIURNAL, isNight } from './tick.js';
import { outside } from './hazards.js';
import { hurtAnt, spark } from './combat.js';
import { exposed } from './abilities.js';
import { shove } from './bosses.js';

// Ladybugs eat your aphids, earwigs pinch, crickets hop away, millipedes curl
// up. Each lives where its kind would (ground), spread over the yard. speed
// is px/s; reach in tiles.
export const BUGS = {
  ladybug:  { name: 'ladybug', hp: 14, speed: 12, meat: 8, reach: 1.3 },
  earwig:   { name: 'earwig', hp: 18, speed: 14, rush: 48, meat: 15, reach: 1.5, pinch: 2, pinchEvery: 1.6, ground: /bark|mulch|compost|soil|hedge|leaf/ },
  cricket:  { name: 'cricket', hp: 9, speed: 0, meat: 25, reach: 1.4, ground: /lawn|long|grass|wild/ },
  millipede:{ name: 'millipede', hp: 30, speed: 7, meat: 20, reach: 1.9, armour: 0.35, ground: /compost|mulch|bark|soil|mud|wet|hedge|leaf/ },
  // Build 37: hunters. Bigger than a bug, smaller than a boss: they hunt your ants, one move each, a crew
  // of five to ten beats them, and they come back after a while. They live in regions (by key), not ground.
  jumper:   { name: 'jumping spider', hp: 60, speed: 22, meat: 25, reach: 1.6, hunter: true, regions: /^(patio|steps|porch|grill|cooler|stones|gnomes|rockgarden2?)$/ },
  // Build 38.
  wasp:     { name: 'hunting wasp', hp: 45, speed: 30, meat: 20, reach: 1.6, hunter: true, regions: /^(lawn|picnic|feeder|suet|birdbath|pool|sprinkler|frisbee|bone|truck|fairyring|gnome|molehills)$/ },
  skink:    { name: 'skink', hp: 150, speed: 30, meat: 60, reach: 2.2, hunter: true, regions: /^(rockgarden2?|woodpile|fallen|gnomes|grill|oakroots)$/ },
  // Build 56: an infected ant from the Hollow: it hunts yours, and its bite carries spores. Never spawns on its own.
  zombie:   { name: 'infected ant', hp: 9, speed: 26, rush: 40, meat: 1, reach: 1.3 },
  assassin: { name: 'assassin bug', hp: 80, speed: 9, meat: 30, chitin: 6, reach: 1.8, hunter: true, regions: /^(tomatoes|beans|peppers|herbs|flowerbed|clover|cloverhill|dandelions|daisies)$/ },
};
const HUNTER_BACK = 240; // seconds before a killed hunter's region gets another
const bugTile = (s, x, y) => { const tx = Math.floor(x/T), ty = Math.floor(y/T); return walk(s, tx, ty) && !s.world.pit[idx(tx,ty)] && Math.hypot(tx - s.world.ex, ty - s.world.ey) > 6; };
export function bugMove(s, b, gx, gy, speed, dt){
  const ddx = gx - b.x, ddy = gy - b.y, d = Math.hypot(ddx, ddy); if (d < 1) return true;
  const base = Math.atan2(ddy, ddx), m = Math.min(d, speed*SURF*dt*(b.slowT > 0 ? 0.5 : 1));
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]){
    const nx = b.x + Math.cos(base+off)*m, ny = b.y + Math.sin(base+off)*m;
    if (!bugTile(s, nx, ny)) continue;
    b.x = nx; b.y = ny; b.dx = Math.cos(base+off); b.dy = Math.sin(base+off); b.stuck = 0; return d - m < 1;
  }
  b.stuck = (b.stuck || 0) + dt; if (b.stuck > 1.5){ b.stuck = 0; return true; } return false;
}
export function bugWander(s, b, r){
  // It keeps to its own patch: strayed far from home, it heads back.
  const hx = b.hx != null ? (b.hx + 0.5)*T : b.x, hy = b.hy != null ? (b.hy + 0.5)*T : b.y, far = Math.hypot(b.x - hx, b.y - hy) > 9*T;
  const ox = far ? hx : b.x, oy = far ? hy : b.y;
  for (let k = 0; k < 10; k++){ const ang = Math.random()*Math.PI*2, d = (1 + Math.random()*r)*T, x = ox + Math.cos(ang)*d, y = oy + Math.sin(ang)*d; if (bugTile(s, x, y)){ b.gx = x; b.gy = y; return; } }
  b.gx = b.x; b.gy = b.y;
}
export function nearAnt(s, b, r, pred){ let best = null, bd = r; for (const a of s.ants){ if (Math.abs(a.x - b.x) >= bd || Math.abs(a.y - b.y) >= bd || !outside(a) || (pred && !pred(a)) || (a.isPlayer && a.feign > s.t)) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < bd){ bd = d; best = a; } } return best ? [best, bd] : null; }
export const playerNear = (s, x, y, r) => { const pa = s.player.ant; return !!pa && !s.player.inNest && Math.hypot(pa.x - x, pa.y - y) < r*T; };
// Build 16.1: the yard is populated region by region, each bug placed
// anywhere in its region and keeping to its own patch, so they are spread
// across the yard rather than turning up round your ants. A region holds one
// of each kind its ground suits (ladybugs where there are aphids), three at
// most. One that dies or leaves is replaced a couple of minutes later, out
// of your sight. Dormant regions get theirs when you first walk in.
const BUG_BACK = [100, 160]; // seconds before a gone bug is replaced
function bugSlots(s, ai){
  const g = AREAS[ai].ground || '', out = [];
  if (s.items.some(f => f.type === 'aphids' && s.world.area[idx(f.x,f.y)] === ai)) out.push('ladybug');
  for (const k of ['earwig', 'cricket', 'millipede']) if (BUGS[k].ground.test(g)) out.push(k);
  const bugs = out.slice(0, 3);
  if (s.t >= 600) for (const k in BUGS) if (BUGS[k].hunter && BUGS[k].regions.test(AREAS[ai].key)) bugs.push(k); // no hunters in the first 10 minutes
  return bugs;
}
function placeBug(s, ai, k, hidden){
  const w = s.world, b = areaBounds(ai), B = BUGS[k], P = s.player, pa = P.ant && !P.inNest ? P.ant : null;
  const aph = k === 'ladybug' ? s.items.filter(f => f.type === 'aphids' && w.area[idx(f.x,f.y)] === ai) : null;
  for (let tries = 0; tries < 60; tries++){
    const ang = Math.random()*Math.PI*2; let x, y;
    if (aph){ if (!aph.length) return false; const f = aph[Math.floor(Math.random()*aph.length)]; x = Math.round(f.x + Math.cos(ang)*5); y = Math.round(f.y + Math.sin(ang)*5); }
    else { x = b.x0 + 4 + Math.floor(Math.random()*(AREA - 8)); y = b.y0 + 4 + Math.floor(Math.random()*(AREA - 8)); }
    if (x < b.x0 + 2 || y < b.y0 + 2 || x > b.x1 - 2 || y > b.y1 - 2) continue;
    if (!bugTile(s, (x+0.5)*T, (y+0.5)*T) || Math.hypot(x - w.ex, y - w.ey) < (k === 'earwig' || B.hunter ? 30 : 14) || Math.hypot(x - w.rx, y - w.ry) < 8) continue;
    if (s.critters.some(o => Math.hypot(o.x/T - (x+0.5), o.y/T - (y+0.5)) < 12)) continue;
    if (hidden && pa && Math.hypot(pa.x/T - x, pa.y/T - y) < 18) continue;
    s.critters.push({ id: s.nextId++, kind: k, region: ai, hx: x, hy: y, x: (x+0.5)*T, y: (y+0.5)*T, dx: Math.cos(ang), dy: Math.sin(ang), hp: B.hp, maxHp: B.hp, state: hidden && k === 'ladybug' ? 'land' : 'walk', t: Math.random()*5, life: 0 });
    return true;
  }
  return false;
}
export function populateBugs(s, ai){ for (const k of bugSlots(s, ai)) placeBug(s, ai, k, false); }
function spawnBugs(s, dt){
  s.bugT = (s.bugT || 0) + dt; if (s.bugT < 4) return; s.bugT = 0;
  const gone = s.bugGone;
  for (let ai = 0; ai < AREAS.length; ai++){
    if (!s.active[ai]) continue;
    for (const k of bugSlots(s, ai)){
      const key = ai + ':' + k, at = gone[key];
      if ((at == null && !BUGS[k].hunter) || s.critters.some(o => o.region === ai && o.kind === k)) continue; // (a hunter needn't have died first: it turns up after minute 10)
      if (at != null && s.t - at < (BUGS[k].hunter ? HUNTER_BACK : BUG_BACK[0]) + (ai * 37 % 60)) continue;
      // Ladybugs fly in where you can see; the rest turn up out of sight.
      if (placeBug(s, ai, k, k !== 'ladybug')) delete gone[key];
    }
  }
}
// Which bugs have ants near enough to matter: only those are stepped.
const BUG_CELL = 16, BUG_GW = Math.ceil(W/BUG_CELL), bugOcc = new Uint8Array(BUG_GW*Math.ceil(H/BUG_CELL));
function bugsAwake(s){
  bugOcc.fill(0);
  for (const a of s.ants) if (outside(a)) bugOcc[Math.floor(a.y/T/BUG_CELL)*BUG_GW + Math.floor(a.x/T/BUG_CELL)] = 1;
  return (b) => { const cx = Math.floor(b.x/T/BUG_CELL), cy = Math.floor(b.y/T/BUG_CELL);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++){ const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < BUG_GW && bugOcc[y*BUG_GW + x]) return true; }
    return false; };
}
export function stepBugs(s, dt){
  spawnBugs(s, dt);
  const yb = youL(s) >= 3 ? 1.5 : 1, awake = bugsAwake(s);
  for (const b of s.critters){
    // With no ant within about fifty tiles it waits where it is.
    if (!awake(b) && !b.carry){ if (b.kind === 'zombie' && (b.life += dt) > 120) b.gone = true; continue; } /* build 41: a wasp carrying an ant off flies on even with no one near; an infected ant rots away even alone */
    const B = BUGS[b.kind]; b.t += dt; b.life += dt; if (b.slowT > 0) b.slowT -= dt;
    // Bitten: fighters, your crew and you. Off the ground (hopping, flying) it can't be.
    if (b.state !== 'fly' && b.state !== 'hop' && b.state !== 'land' && b.state !== 'carry'){
      const R = B.reach*T, arm = b.state === 'curl' ? B.armour : 1, lim = Math.max(6*T, R*2); // (build 45: ants further than any reach here are skipped before the sums)
      for (const a of s.ants){
        if (a.team || Math.abs(a.x - b.x) >= lim || Math.abs(a.y - b.y) >= lim || !outside(a)) continue;
        const fighter = CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer, d = Math.hypot(a.x - b.x, a.y - b.y);
        if (fighter && d < R*reachOf(s, a)){
          const dmg = bite(s, a, 'bug')*dt*(a.isPlayer ? 2*yb : 1)*arm*(exposed(s, b) ? 1.5 : 1)*(B.hunter ? hunterArmour(a) : 1); b.hp -= a.caste === 'venom' && picked(s, 'venom', 'lethal') ? b.hp : dmg; gainXp(s, a, dmg/3); b.hitT = s.t; stingSlow(s, a, b);
          spark(s, a, (a.x + b.x)/2, (a.y + b.y)/2, 0);
          if (b.kind === 'millipede') millipedeBitten(s, b);
        } else if (d < 6*T && CASTES[a.caste].fight >= 3 && a.state === 'patrol'){ a.state = 'fight'; a.goal = 'bug'; a.bugId = b.id; }
      }
      if (b.hp <= 0){ bugDies(s, b); continue; }
    }
    if (b.stunned > s.t){ if (b.kind === 'wasp' && (b.carry || b.state !== 'rest')){ waspDrops(s, b); b.atk = null; b.state = 'rest'; b.restT = 4; if (playerNear(s, b.x, b.y, 16)) s.player.msg = 'Locked in your jaws, the wasp drops to the ground!'; } continue; } // build 38: held in a mandible lock (still bitten)
    if (B.hunter && hunterTurns(s, b, B, dt)) continue; // build 73: cornered it lashes out; hurt it runs
    if (b.kind === 'ladybug') stepLadybug(s, b, B, dt);
    else if (b.kind === 'earwig') stepEarwig(s, b, B, dt);
    else if (b.kind === 'cricket') stepCricket(s, b, B, dt);
    else if (b.kind === 'jumper') stepJumper(s, b, B, dt);
    else if (b.kind === 'assassin') stepAssassin(s, b, B, dt);
    else if (b.kind === 'wasp') stepWasp(s, b, B, dt);
    else if (b.kind === 'skink') stepSkink(s, b, B, dt);
    else if (b.kind === 'zombie') stepZbug(s, b, B, dt);
    else stepMillipede(s, b, B, dt);
  }
  for (const b of s.critters) if ((b.gone || b.hp <= 0) && b.region != null) s.bugGone[b.region + ':' + b.kind] = s.t;
  s.critters = s.critters.filter(b => !b.gone && b.hp > 0);
}
function bugDies(s, b){
  const B = BUGS[b.kind], c = s.colony, P = s.player, x = Math.floor(b.x/T), y = Math.floor(b.y/T);
  s.items.push({ x, y, kind: 'protein', type: b.kind, amt: B.meat, yaw: Math.atan2(b.dy || 0, b.dx || 1) });
  if (B.chitin){ const cx = x + 1; if (walk(s, cx, y) && !itemAt(s, cx, y)) s.items.push({ x: cx, y, kind: 'chitin', type: 'shell', amt: B.chitin }); }
  if (b.held) assassinLets(s, b); // whatever it held is free
  if (b.carry) waspDrops(s, b);
  for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < 3*T) gainXp(s, a, 8);
  if (picked(s, 'venom', 'hunter')) trailHome(s, b.x, b.y);
  if (!c.kills[b.kind]) gainGenes(s, 1, 'your first ' + B.name);
  c.kills[b.kind] = (c.kills[b.kind] || 0) + 1; b.gone = true;
  s.bugDead = { kind: b.kind, x: b.x, y: b.y, t: s.t };
  if (playerNear(s, b.x, b.y, 16) && (!P.msg || /down!|🧬/.test(P.msg))) P.msg = `${B.name.charAt(0).toUpperCase() + B.name.slice(1)} down! ${B.meat} protein: haul it home.`;
}
// Build 37: hunters. Each sees ants within 8 tiles; with five or more of your ants on top of it, it backs
// off toward home for a few seconds. Their attacks are telegraphed (b.atk), drawn like a boss's.
// After a kill a hunter stops to eat, 8 s, still and easy to bite.
// Build 73 (Mark: hunters "have to be genuine threats, not just pathetic food sources"). Chitin armour: a
// worker's bite does a quarter on a hunter, a soldier's or venom ant's in full, a major's half again; yours
// (already doubled) comes to about a soldier's and a quarter.
export function hunterArmour(a){ if (a.isPlayer) return 0.62; const f = CASTES[a.caste].fight; return a.caste === 'major' || a.caste === 'supermajor' ? 1.5 : f >= 3 ? 1 : 0.25; }
// Cornered, it fights harder: three or more on it and every few seconds it lashes out. Hurt below a third, it
// breaks off and runs home (gone, to come back healed later) unless it's held or surrounded by three. Returns
// true if it acted.
function hunterTurns(s, b, B, dt){
  const P = s.player;
  if (b.state === 'carry' || b.state === 'fly' || b.held || b.eatT > 0) return false;
  const pinned = crowdOn(s, b, 1.2) >= 3; // surrounded, it can't break away
  if (b.kind !== 'skink' && !b.runHome && !pinned && b.hp < b.maxHp/3){ b.runHome = 8; b.atk = null; b.dash = null; if (playerNear(s, b.x, b.y, 16)) P.msg = `Hurt, the ${B.name} runs for home! Finish it, or lock it in your jaws.`; }
  if (b.runHome > 0){ b.runHome -= dt; b.state = 'walk'; const home = bugMove(s, b, (b.hx + 0.5)*T, (b.hy + 0.5)*T, B.speed*2.2 + 20, dt); if (home || b.runHome <= 0) b.gone = true; return true; }
  if (crowdOn(s, b, 1.8) < 3){ b.lashCd = Math.max(b.lashCd || 0, 1.2); return false; }
  b.lashCd = (b.lashCd || 0) - dt; if (b.lashCd > 0) return false;
  b.lashCd = 3.5; b.lashAt = s.t; b.atk = null;
  const near = s.ants.filter(a => !a.team && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < 2.2*T);
  if (b.kind === 'jumper' || b.kind === 'wasp'){ for (const a of near){ hurtAnt(s, a, 3, b.kind); spark(s, null, a.x, a.y, 1); } }
  else if (b.kind === 'assassin'){ const a = near.sort((p, q) => q.hp - p.hp)[0]; if (a){ hurtAnt(s, a, 5, 'assassin'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 1.2); } }
  else if (b.kind === 'skink'){ for (const a of near){ hurtAnt(s, a, 3, 'skink'); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); } }
  if (near.some(a => a.state === 'dead')) hunterEats(s, b);
  return false;
}
function hunterEats(s, b){ b.eatT = 8; b.state = 'eat'; b.atk = null; b.fullUntil = s.t + 8 + 90; } // then sated: it won't hunt for 90 s
const crowdOn = (s, b, r) => { let n = 0; const R = r*T; for (const a of s.ants) if (!a.team && Math.abs(a.x - b.x) < R && Math.abs(a.y - b.y) < R && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < R) n++; return n; };
// Leashed: it hunts only ants within 12 tiles of its home (it won't follow foragers back to your nest).
export function huntTarget(s, b, r){ if (b.fullUntil > s.t && !b.carry) return null; if (isNight(s) && !b.carry){ if (DIURNAL[b.kind]) return null; if (b.kind === 'assassin') r *= 1.4; } /* build 43 */ let best = null, bd = r*T; const hx = (b.hx + 0.5)*T, hy = (b.hy + 0.5)*T; for (const a of s.ants){ if (a.team || !outside(a) || (a.isPlayer && a.feign > s.t) || Math.hypot(a.x - hx, a.y - hy) > 12*T) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < bd){ bd = d; best = a; } } return best ? [best, bd] : null; }
// The jumping spider: a short crouch (the tell, a lane on the ground), then a leap of up to 5 tiles onto
// an ant; it bites what it lands on. Between leaps it bites what's next to it.
function stepJumper(s, b, B, dt){
  const P = s.player;
  if (b.eatT > 0){ b.eatT -= dt; if (b.eatT <= 0) b.state = 'walk'; return; }
  if (b.state === 'hop'){ const u = Math.min(1, b.t/0.35); b.x = b.hx0 + (b.hx1 - b.hx0)*u; b.y = b.hy0 + (b.hy1 - b.hy0)*u;
    if (u >= 1){ b.state = 'walk'; b.t = 0; b.cd = 2.4; b.leaps = (b.leaps || 0) + 1; b.landAt = s.t;
      let killed = false; for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < 1.3*T){ hurtAnt(s, a, 6, 'jumper'); spark(s, null, a.x, a.y, 1); if (a.state === 'dead') killed = true; }
      if (killed) hunterEats(s, b); else if (b.leaps >= 3){ b.leaps = 0; b.restT = 6; } }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.state = 'hop'; b.t = 0; b.hx0 = b.x; b.hy0 = b.y; b.hx1 = b.x + k.dx*k.len; b.hy1 = b.y + k.dy*k.len; return; }
  b.cd = (b.cd || 0) - dt; b.biteCd = (b.biteCd || 0) - dt;
  if (b.restT > 0){ b.restT -= dt; b.state = 'walk'; if (bugMove(s, b, (b.hx + 0.5)*T, (b.hy + 0.5)*T, 40, dt)) b.restT = 0; if (b.leaps >= 4) b.leaps = 0; return; }
  const tg = huntTarget(s, b, 8);
  if (!tg){ b.state = 'walk'; if (b.gx == null || bugMove(s, b, b.gx, b.gy, B.speed*0.6, dt)) bugWander(s, b, 6); return; }
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (!b.warned && playerNear(s, b.x, b.y, 14)){ b.warned = true; P.msg = 'A jumping spider! When it crouches, it leaps: get out of its line.'; }
  if (d < 1.4*T){ if (b.biteCd <= 0){ b.biteCd = 1.0; hurtAnt(s, a, 4, 'jumper'); /* build 73: was 2.5 */ spark(s, null, a.x, a.y, 1); b.pinchAt = s.t; if (a.state === 'dead') hunterEats(s, b); } return; }
  if (b.cd <= 0 && d < 6*T){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(5*T, d + 0.4*T), w: 1.3*T, t: 0, at: 0.5 }; b.state = 'crouch'; return; }
  b.state = 'walk'; bugMove(s, b, a.x, a.y, B.speed, dt);
}
// The assassin bug: slow, it stalks. A red dot on an ant, then its beak goes in: the ant is held and
// drained. Bite the bug for 15 and it lets go; otherwise the ant is lost in about four seconds.
function assassinLets(s, b){ const H = b.held; b.held = null; if (!H) return; const a = s.ants.find(o => o.id === H.id); if (a && a.state !== 'dead'){ a.lockT = 0; a.impaled = false; shove(s, a, b.x, b.y, 1.5); } }
function stepAssassin(s, b, B, dt){
  const P = s.player;
  if (b.eatT > 0 && !b.held){ b.eatT -= dt; if (b.eatT <= 0) b.state = 'walk'; return; }
  if (b.held){ const H = b.held, a = s.ants.find(o => o.id === H.id);
    if (!a || a.state === 'dead'){ b.held = null; b.cd = 3; return; }
    a.x = b.x + b.dx*1.9*T; a.y = b.y + b.dy*1.9*T; a.lockT = 0.2; a.impaled = true;
    a.hp -= 1.6*dt; a.hitT = s.t; if (a.isPlayer) P.hit = s.t;
    if (a.hp <= 0){ a.impaled = false; killAnt(s, a, 'assassin'); b.held = null; b.cd = 3; hunterEats(s, b); return; }
    if (H.hp0 - b.hp >= 15){ assassinLets(s, b); b.cd = 2; if (playerNear(s, b.x, b.y, 16)) P.msg = 'Bitten hard, the assassin bug lets go!'; }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.stabAt = s.t;
    const a = s.ants.find(o => !o.team && outside(o) && Math.hypot(o.x - k.x, o.y - k.y) < k.r);
    if (a){ if (a.isPlayer){ hurtAnt(s, a, 6, 'assassin'); b.cd = 1.8; /* build 73: was 4 every 2.5 s */ } else { b.held = { id: a.id, hp0: b.hp }; if (playerNear(s, b.x, b.y, 16)) P.msg = 'The assassin bug has an ant on its beak! Bite it hard to make it let go.'; } }
    else b.cd = 2; return; }
  b.cd = (b.cd || 0) - dt;
  const tg = huntTarget(s, b, 7);
  if (!tg){ b.state = 'walk'; if (b.gx == null || bugMove(s, b, b.gx, b.gy, B.speed, dt)) bugWander(s, b, 5); return; }
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (!b.warned && playerNear(s, b.x, b.y, 14)){ b.warned = true; P.msg = 'An assassin bug is stalking your ants. It stabs where the red dot shows.'; }
  if (b.cd <= 0 && d < 2.2*T){ b.atk = { kind: 'ring', x: a.x, y: a.y, r: 1.0*T, t: 0, at: 0.8 }; b.state = 'stab'; return; }
  b.state = 'walk'; bugMove(s, b, a.x, a.y, B.speed, dt);
}
// The hunting wasp (build 38): in the air it can't be bitten. Its shadow settles on an ant (the tell, a
// ring), then it dives: the ant is carried off and lost, unless the wasp is stunned or killed first (a
// Mandible Lock reaches it as it lifts away). Then it lands to rest and eat: on the ground it can be
// bitten, and it stings back. With nothing to hunt it lands now and then anyway.
function waspDrops(s, b){ const a = s.ants.find(o => o.id === b.carry); b.carry = null; if (a && a.state === 'away'){ a.state = 'return'; a.x = b.x; a.y = b.y; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); a.lockT = 0.5; } }
function stepWasp(s, b, B, dt){
  const P = s.player;
  if (b.state === 'walk') b.state = 'fly'; // (spawned on the ground: up it goes)
  if (b.state === 'rest'){ b.restT -= dt; b.stingCd = (b.stingCd || 0) - dt;
    const tg = huntTarget(s, b, 1.6); if (tg && b.stingCd <= 0){ b.stingCd = 1.2; hurtAnt(s, tg[0], 4, 'wasp'); /* build 73: was 3 */ spark(s, null, tg[0].x, tg[0].y, 1); b.stingAt = s.t; if (tg[0].state === 'dead'){ hunterEats(s, b); return; } }
    if (b.restT <= 0){ b.state = 'fly'; b.t = 0; } return; }
  if (b.state === 'carry'){ b.t += 0; b.carryT -= dt; const a = s.ants.find(o => o.id === b.carry); bugMove(s, b, (b.hx + 0.5)*T, (b.hy + 0.5)*T, 50, dt);
    if (!a || a.state !== 'away'){ b.carry = null; b.state = 'fly'; return; }
    if (b.carryT <= 0){ b.carry = null; a.state = 'return'; killAnt(s, a, 'wasp'); hunterEats(s, b); /* build 47: fed like the other hunters */ } return; }
  if (b.state === 'eat'){ b.eatT -= dt; if (b.eatT <= 0){ b.state = 'rest'; b.restT = 2; } return; } /* on the ground eating: it can be bitten */
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.x = k.x; b.y = k.y; b.diveAt = s.t;
    const a = s.ants.find(o => !o.team && outside(o) && Math.hypot(o.x - k.x, o.y - k.y) < k.r);
    if (a){ if (a.isPlayer){ hurtAnt(s, a, 4, 'wasp'); b.state = 'rest'; b.restT = 4; } else { a.state = 'away'; a.foeId = 0; b.carry = a.id; b.carryT = 1.6; b.state = 'carry'; if (playerNear(s, b.x, b.y, 16)) P.msg = 'The wasp has an ant! Stun it before it gets away.'; } }
    else { b.state = 'rest'; b.restT = 4; } return; }
  // In the air: circle home, hunt.
  b.flyT = (b.flyT || 0) + dt; b.cd = (b.cd || 0) - dt;
  if (b.flyT > 9){ b.flyT = 0; b.state = 'rest'; b.restT = 5; return; }
  const tg = huntTarget(s, b, 9);
  if (tg && b.cd <= 0){ const [a] = tg; b.flyT = 0; b.cd = 4; b.atk = { kind: 'ring', x: a.x, y: a.y, r: 1.1*T, t: 0, at: 1.0 }; if (!b.warned && playerNear(s, b.x, b.y, 16)){ b.warned = true; P.msg = 'A hunting wasp! When its shadow settles on an ant, move it. Kill the wasp when it lands.'; } return; }
  const ang = s.t*0.8 + b.id, gx = (b.hx + 0.5)*T + Math.cos(ang)*5*T, gy = (b.hy + 0.5)*T + Math.sin(ang)*5*T;
  const d = Math.hypot(gx - b.x, gy - b.y); if (d > 2){ b.dx = (gx - b.x)/d; b.dy = (gy - b.y)/d; const m = Math.min(d, 40*SURF*dt); b.x += b.dx*m; b.y += b.dy*m; }
}
// The skink (build 38): the biggest hunter. It dashes down a lane, biting what it passes, and snaps at
// what's beside it. Hurt to half, it drops its wriggling blue tail (40 protein) and runs for 6 s; if it
// gets away it's gone, so stun it (a Mandible Lock) or burst it down before then.
function stepSkink(s, b, B, dt){
  const P = s.player;
  if (b.eatT > 0){ b.eatT -= dt; if (b.eatT <= 0) b.state = 'walk'; return; }
  if (!b.tailless && b.hp < b.maxHp*0.5){ b.tailless = true; b.atk = null; b.dash = null;
    const x = Math.floor((b.x - (b.dx || 1)*2*T)/T), y = Math.floor((b.y - (b.dy || 0)*2*T)/T);
    if (walk(s, x, y)) s.items.push({ x, y, kind: 'protein', type: 'skinktail', amt: 40, t0: s.t, yaw: Math.atan2(b.dy || 0, b.dx || 1) });
    b.state = 'flee'; b.fleeT = 6; if (playerNear(s, b.x, b.y, 18)) P.msg = 'The skink drops its tail and runs! Lock it before it gets away.'; return; }
  if (b.state === 'flee'){ b.fleeT -= dt; const n = huntTarget(s, b, 10), from = n ? n[0] : { x: b.x - (b.dx || 1), y: b.y - (b.dy || 0) };
    bugMove(s, b, b.x + (b.x - from.x)*4, b.y + (b.y - from.y)*4, 75, dt);
    if (b.fleeT <= 0){ b.gone = true; if (playerNear(s, b.x, b.y, 24)) P.msg = 'The skink got away into the rocks. It will be back, tail and all.'; } return; }
  if (b.dash){ const R = b.dash, step = 190*SURF*dt, nx = b.x + R.dx*step, ny = b.y + R.dy*step;
    if (bugTile(s, nx, ny)){ b.x = nx; b.y = ny; R.done += step; }
    for (const a of s.ants) if (!a.team && outside(a) && !R.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < 1.5*T){ R.hit[a.id] = 1; hurtAnt(s, a, 5, 'skink'); spark(s, null, a.x, a.y, 1); if (a.state === 'dead') R.kill = true; }
    if (!bugTile(s, nx, ny) || R.done >= R.len){ b.dash = null; b.cd = 2.2; if (R.kill) hunterEats(s, b); } return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null;
    if (k.kind === 'lane'){ b.dash = { dx: k.dx, dy: k.dy, len: k.len, done: 0, hit: {} }; return; }
    b.snapAt = s.t; let kill = false; for (const a of s.ants){ if (a.team || !outside(a) || Math.hypot(a.x - k.x, a.y - k.y) > k.r) continue; hurtAnt(s, a, 6, 'skink'); spark(s, null, a.x, a.y, 1); if (a.state === 'dead') kill = true; }
    b.cd = 1.4; if (kill) hunterEats(s, b); return; }
  b.cd = (b.cd || 0) - dt;
  const tg = huntTarget(s, b, 9);
  if (!tg){ b.state = 'walk'; if (b.gx == null || bugMove(s, b, b.gx, b.gy, B.speed*0.5, dt)) bugWander(s, b, 6); return; }
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (!b.warned && playerNear(s, b.x, b.y, 16)){ b.warned = true; P.msg = 'A skink! It dashes down the lane it shows. Hurt, it drops its tail and runs: lock it first.'; }
  if (b.cd <= 0){ if (d < 2*T) b.atk = { kind: 'ring', x: a.x, y: a.y, r: 1.2*T, t: 0, at: 0.5 }; else if (d < 8*T) b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(8*T, d + 2*T), w: 1.6*T, t: 0, at: 0.6 }; if (b.atk) return; }
  b.state = 'walk'; bugMove(s, b, a.x, a.y, B.speed, dt);
}
// Ladybug: flies in by your aphids and eats them. Bitten to half, or full, it flies away.
function stepLadybug(s, b, B, dt){
  const P = s.player, c = s.colony;
  if (b.state === 'land'){ if (b.t > 1.2){ b.state = 'walk'; b.t = 0; } return; }
  if (b.state === 'fly'){ if (b.t > 1.6) b.gone = true; return; }
  if (b.hp < b.maxHp*0.5 || (b.ate || 0) >= 40 || b.life > 180){
    const chased = b.hp < b.maxHp*0.5; b.state = 'fly'; b.t = 0;
    if (chased){
      for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x - b.x, a.y - b.y) < 3*T) gainXp(s, a, 6);
      if (!c.kills.ladybugOff) gainGenes(s, 1, 'chasing off a ladybug');
      c.kills.ladybugOff = (c.kills.ladybugOff || 0) + 1;
      if (playerNear(s, b.x, b.y, 16)) P.msg = 'The ladybug flies off. Your aphids are safe.';
    }
    return;
  }
  let f = b.ax != null ? s.items.find(o => o.type === 'aphids' && o.x === b.ax && o.y === b.ay) : null;
  if (!f || f.amt < 1){ f = null; let bd = 24; for (const o of s.items) if (o.type === 'aphids' && o.amt >= 3){ const d = Math.hypot(o.x + 0.5 - b.x/T, o.y + 0.5 - b.y/T); if (d < bd){ bd = d; f = o; } } b.ax = f ? f.x : null; b.ay = f ? f.y : null; }
  if (f){
    const gx = (f.x + 0.5)*T + 6, gy = (f.y + 0.5)*T;
    if (Math.hypot(gx - b.x, gy - b.y) < 0.6*T){ b.state = 'eat'; b.dx = -1; b.dy = 0; const take = Math.min(f.amt, 1.2*dt); f.amt -= take; b.ate = (b.ate || 0) + take;
      if (!b.warned && playerNear(s, b.x, b.y, 18)){ b.warned = true; P.msg = 'A ladybug is eating your aphids! Bite it and it flies off.'; } }
    else { b.state = 'walk'; bugMove(s, b, gx, gy, B.speed, dt); }
    return;
  }
  b.state = 'walk'; if (b.gx == null || bugMove(s, b, b.gx, b.gy, B.speed, dt)) bugWander(s, b, 4);
}
// Earwig: rushes any ant that comes close and pinches. Foragers keep clear;
// badly hurt, it runs for cover and is gone.
function stepEarwig(s, b, B, dt){
  b.pinchT = Math.max(0, (b.pinchT || 0) - dt);
  for (const a of s.ants){ if (!outside(a) || a.isPlayer || a.follow || CASTES[a.caste].fight >= 3) continue; if (Math.hypot(a.x - b.x, a.y - b.y) < 4*T){ a.flee = Math.max(a.flee, 1.5); a.fleeFrom = b; } }
  if (b.hp < b.maxHp*0.3 && b.state !== 'flee'){ b.state = 'flee'; b.t = 0; }
  if (b.state === 'flee'){
    if (b.t > 10){ b.gone = true; return; }
    const n = nearAnt(s, b, 12*T); if (n) bugMove(s, b, b.x + (b.x - n[0].x), b.y + (b.y - n[0].y), 38, dt);
    return;
  }
  const n = nearAnt(s, b, 3.5*T);
  if (n){
    const [a, d] = n; b.state = 'rush';
    if (d < B.reach*T){ b.dx = (a.x - b.x)/(d || 1); b.dy = (a.y - b.y)/(d || 1);
      if (!b.pinchT){ b.pinchT = B.pinchEvery; b.pinchAt = s.t; spark(s, null, a.x, a.y, 1); hurtAnt(s, a, a.isPlayer ? 1.5 : B.pinch, 'earwig'); } }
    else bugMove(s, b, a.x, a.y, B.rush, dt);
    return;
  }
  b.state = 'walk'; if (b.gx == null || b.t > 10 || bugMove(s, b, b.gx, b.gy, B.speed, dt)){ bugWander(s, b, 5); b.t = 0; }
}
// Cricket: hops away from anything that comes near, five hops and it's worn
// out for a few seconds. That's when you catch it.
function stepCricket(s, b, B, dt){
  const P = s.player;
  if (b.stam == null) b.stam = 5;
  if (b.state === 'hop'){ const u = Math.min(1, b.t/0.55); b.x = b.hx0 + (b.hx1 - b.hx0)*u; b.y = b.hy0 + (b.hy1 - b.hy0)*u; if (u >= 1){ b.state = 'sit'; b.t = 0; } return; }
  if (b.state === 'tired'){ if (b.t > 5){ b.state = 'sit'; b.t = 0; b.stam = 3; } return; }
  if (b.state === 'walk') b.state = 'sit';
  b.stam = Math.min(5, b.stam + dt/6);
  const n = nearAnt(s, b, 4.5*T), hit = s.t - (b.hitT || -9) < 0.15;
  if ((n || hit) && b.t > 0.35){
    if (b.stam < 1){ b.state = 'tired'; b.t = 0; if (playerNear(s, b.x, b.y, 14)) P.msg = 'The cricket is worn out. Get it now!'; return; }
    const from = n ? n[0] : P.ant || { x: b.x - 1, y: b.y };
    if (bugHop(s, b, Math.atan2(b.y - from.y, b.x - from.x), 3 + Math.random()*2)) b.stam -= 1;
    return;
  }
  // Now and then it chirps, or takes a short hop of its own.
  if (!n && b.t > 3 && Math.random() < dt*0.4) { b.chirpAt = s.t; b.t = 0; if (Math.random() < 0.3) bugHop(s, b, Math.random()*Math.PI*2, 1.5); }
}
function bugHop(s, b, away, tiles){
  for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4]){
    const d = tiles*T, x = b.x + Math.cos(away + off)*d, y = b.y + Math.sin(away + off)*d;
    if (!bugTile(s, x, y)) continue;
    b.state = 'hop'; b.t = 0; b.hx0 = b.x; b.hy0 = b.y; b.hx1 = x; b.hy1 = y; b.dx = Math.cos(away + off); b.dy = Math.sin(away + off); b.hops = (b.hops || 0) + 1; return true;
  }
  return false;
}
// Millipede: harmless, slow, armoured. Bitten, it curls into a ball for a
// while and takes a third of the damage.
// Build 73 (Mark: "the millipede should probably try to run away, not just curl up and accept death"): bitten,
// it runs; it curls only when cornered (three on it, or caught again as it runs), and curled it oozes poison:
// biters take a little, workers back off. When the crowd thins it uncurls and runs again.
function millipedeBitten(s, b){
  const P = s.player;
  if (b.state === 'curl'){ b.curlT = Math.max(b.curlT, 4); return; }
  if (crowdOn(s, b, 1.8) >= 3 || (b.state === 'run' && b.t > 0.6)){ b.state = 'curl'; b.t = 0; b.curlT = 6;
    if (playerNear(s, b.x, b.y, 14) && !s.seen.curl){ s.seen.curl = true; P.msg = 'Cornered, the millipede curls into an armoured ball and oozes poison. Keep biting.'; } return; }
  if (b.state !== 'run'){ b.state = 'run'; b.t = 0; b.runT = 4; if (playerNear(s, b.x, b.y, 14) && !s.seen.millirun){ s.seen.millirun = true; P.msg = 'The millipede runs for it! Cut it off: cornered, it curls up.'; } }
}
function stepMillipede(s, b, B, dt){
  if (b.state === 'curl'){ b.curlT -= dt;
    for (const a of s.ants){ if (a.team || !outside(a) || Math.abs(a.x - b.x) > 2*T || Math.abs(a.y - b.y) > 2*T) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 2*T) continue;
      if (CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer){ if (d < B.reach*T) hurtAnt(s, a, 0.35*dt, 'millipede'); } else if (a.state !== 'fight') a.flee = Math.max(a.flee || 0, 1.5); }
    if (b.curlT <= 0){ if (crowdOn(s, b, 1.8) >= 3) b.curlT = 1.5; else { b.state = 'run'; b.t = 0; b.runT = 3; } } return; }
  if (b.state === 'run'){ b.runT -= dt; let n = null, nd = 8*T; for (const a of s.ants){ if (a.team || !outside(a)) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < nd){ nd = d; n = a; } }
    let fx = n ? b.x - n.x : b.dx || 1, fy = n ? b.y - n.y : b.dy || 0; if (Math.hypot(fx, fy) < 1){ const r = (b.id * 2.4) % 6.28; fx = Math.cos(r); fy = Math.sin(r); } // (on top of it: any way out)
    const fm = Math.hypot(fx, fy); bugMove(s, b, b.x + fx/fm*3*T, b.y + fy/fm*3*T, B.speed*3, dt);
    if (b.runT <= 0){ b.state = 'walk'; b.t = 0; } return; }
  if (b.gx == null || b.t > 14 || bugMove(s, b, b.gx, b.gy, B.speed, dt)){ bugWander(s, b, 5); b.t = 0; }
}
// Rain (build 16): drops knock ants about outside. Some lose what they carry.
export function tickSplash(s, dt){
  if (!wet(s)) return;
  const P = s.player;
  for (const a of s.ants){
    if (!outside(a) || a.knockT > 0 || (a.isPlayer && P.big)) continue;
    if (Math.random() > dt*(a.isPlayer ? 0.12 : 0.08)) continue;
    const ang = Math.random()*Math.PI*2, d = (1 + Math.random())*T*(a.isPlayer ? 0.6 : 1);
    a.knockT = 0.3; a.kx = Math.cos(ang)*d/0.3; a.ky = Math.sin(ang)*d/0.3; a.hitT = s.t;
    s.splashes.push({ x: a.x, y: a.y, t: s.t }); if (s.splashes.length > 40) s.splashes.shift();
    if (!a.isPlayer && a.carry && a.kind !== 'water' && Math.random() < 0.35 && !itemAt(s, a.tx, a.ty)){
      const F = FOODS[a.itype], type = !a.itype || (F && F.crew) || a.itype === 'aphids' || a.itype === 'dew' ? (a.kind === 'grit' ? 'pebble' : a.kind === 'protein' ? 'bug' : 'crumb') : a.itype;
      s.items.push({ x: a.tx, y: a.ty, kind: a.kind, type, amt: a.carry }); a.carry = 0; a.itype = null;
    }
    if (a.isPlayer){ P.splashed = s.t; if (!s.seen.splash){ s.seen.splash = true; P.msg = 'Raindrops knock ants about. Some drop what they carry.'; } }
  }
}
// Knocked by a raindrop: slide, then carry on from wherever it lands.
export function knock(s, a, dt){
  a.knockT -= dt; const nx = a.x + a.kx*dt, ny = a.y + a.ky*dt;
  if (walk(s, Math.floor(nx/T), Math.floor(ny/T))){ a.x = nx; a.y = ny; }
  a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T);
}
