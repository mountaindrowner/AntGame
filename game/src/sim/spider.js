// The spider and the cat: big roaming hunters with territories.
import { SCALE } from './yard.js';
import { CASTES, H, N8, SURF, T, W, idx } from './core.js';
import { chooseToward, findPath, stepTo, walk } from './world.js';
import { bite, gainXp, paceOf, reachOf, stingSlow } from './progress.js';
import { isNight } from './tick.js';
import { spark } from './combat.js';

// The spider roams the whole yard: landmark to landmark, past our nest every
// few legs, and now and then off the edge into the next area for a while.
// The spider (build 11.6): a hunter with a territory round its web in the
// Flowerbed. Resting at the web it is hidden (ants only notice it close up)
// and lunges at what wanders near; roaming, it stalks ants it sees, lunges,
// and gives up after a few seconds, so a running ant can still get away.
export const SPIDER_REACH = 1.4*T, CAT_REACH = 1.8*T;
// Build 73 (Mark: "the ants shouldn't just go right under him. They should attack his legs. Each one of his legs
// is a point of weakness"): each ant fighting the spider holds a leg, a spot at that leg's foot that turns with
// it (eight, then a second ring); bites land on that leg; LEG_HP crippled it, and each crippled leg slows the
// spider by a tenth; four, and it can't lunge.
export const LEG_HP = 22;
export function legSlot(s, a){
  const sp = s.spider; if (!sp) return null; const S = sp.slots || (sp.slots = {});
  let i = S[a.id]; if (i == null){ const used = new Set(Object.values(S)); for (i = 0; used.has(i); i++); S[a.id] = i; }
  const face = sp.face ?? 0, ring = i < 8 ? 0 : 1, ang = face + (i % 8)*Math.PI/4 + Math.PI/8 + ring*Math.PI/8, r = (ring ? 1.3 : 1.05)*T;
  return { x: sp.x + Math.cos(ang)*r, y: sp.y + Math.sin(ang)*r, leg: i % 8 };
}
export const crippled = sp => (sp.legHp || []).filter(v => v >= LEG_HP).length;
const SPIDER = { windup: 0.25, ambush: 4*T, see: 5*T, passing: 1.5*T, lunge: 0.8, lungeSpeed: 100, chaseSpeed: 40, roamSpeed: 16, giveUp: 6, tired: 4, home: 60 };
// For the first four minutes it keeps well away, so the opening is safe to learn.
const spiderNearNest = (s, x, y) => Math.hypot(x/T - (s.world.ex+0.5), y/T - (s.world.ey+0.5)) < (s.t < 240 ? 12 : 6) || Math.hypot(x/T - (s.world.rx+0.5), y/T - (s.world.ry+0.5)) < 4;
// Room round each tile: tiles to the nearest rock, wall or fence (capped at
// 6). The spider is about five tiles across, so it keeps two clear (build
// 17: it used to hug rocks by its middle tile and its body went through).
export function clearOf(s){
  const w = s.world; if (w.clear) return w.clear;
  const cl = new Uint8Array(W*H).fill(6), q = new Int32Array(W*H); let qh = 0, qt = 0;
  for (let i = 0; i < W*H; i++) if (w.blocked[i]){ cl[i] = 0; q[qt++] = i; }
  while (qh < qt){ const i = q[qh++], x = i % W, y = (i - x)/W, v = cl[i] + 1; if (v >= 6) continue;
    for (const [dx, dy] of N8){ const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny*W + nx; if (cl[j] > v){ cl[j] = v; q[qt++] = j; } } }
  return (w.clear = cl);
}
const SPIDER_ROOM = 3;
const spiderRoom = (s, x, y) => { const tx = Math.floor(x/T), ty = Math.floor(y/T); return tx < 0 || ty < 0 || tx >= W || ty >= H ? 6 : clearOf(s)[ty*W + tx]; };
// Plan a walk to (px, py) around rocks and clear of the nests; rest there.
// Legs chain on from the last waypoint already planned.
export function spiderRoute(s, sp, px, py, rest){
  const last = sp.route.length ? sp.route[sp.route.length - 1] : [sp.x, sp.y], sx = Math.floor(last[0]/T), sy = Math.floor(last[1]/T), cl = clearOf(s);
  const avoid = (x, y) => spiderNearNest(s, (x+0.5)*T, (y+0.5)*T) || (cl[y*W + x] < SPIDER_ROOM && Math.hypot(x - sx, y - sy) > 3);
  const path = findPath(s, sx, sy, Math.floor(px/T), Math.floor(py/T), avoid);
  for (const [x, y] of path) sp.route.push([(x+0.5)*T, (y+0.5)*T]);
  if (rest && sp.route.length) sp.route[sp.route.length-1][2] = rest;
}
function spiderPlan(s, sp){
  const w = s.world; sp.legs = (sp.legs||0) + 1; sp.route = [];
  sp.passing = false;
  if (sp.legs % 4 === 0 && s.t >= 240){ // stroll past the nest along an arc 7.5 tiles out, not hunting
    const a0 = Math.random()*Math.PI*2, dir = Math.random() < 0.5 ? 1 : -1;
    const a = a0; spiderRoute(s, sp, (w.ex+0.5+Math.cos(a)*7.5)*T, (w.ey+0.5+Math.sin(a)*7.5)*T);
    for (let k=1;k<5;k++){ const t = a0 + dir*k*0.5, x = (w.ex+0.5+Math.cos(t)*7.5)*T, y = (w.ey+0.5+Math.sin(t)*7.5)*T; if (spiderRoom(s, x, y) >= SPIDER_ROOM) spiderRoute(s, sp, x, y); }
    sp.passing = true; return;
  }
  if (Math.random() < 0.45){ // back to its web in the Flowerbed
    const a = Math.random()*Math.PI*2; spiderRoute(s, sp, (w.web.x+0.5+Math.cos(a)*2.5*SCALE)*T, (w.web.y+(2+Math.abs(Math.sin(a))*2)*SCALE)*T, 30 + Math.random()*40); return;
  }
  if (sp.legs > 6 && Math.random() < 0.15){ // over the fence for a while
    // Walk to the fence on a path, then over it.
    const side = Math.floor(Math.random()*3), u = 0.2 + Math.random()*0.6;
    const out = side===0 ? [-2, u*H] : side===1 ? [W+2, u*H] : [u*W, H+2];
    const inn = [Math.max(3.5, Math.min(W-3.5, out[0])), Math.max(3.5, Math.min(H-3.5, out[1]))];
    spiderRoute(s, sp, inn[0]*T, inn[1]*T);
    sp.route.push([out[0]*T, out[1]*T]); sp.leaving = true; return;
  }
  for (let tries=0; tries<60; tries++){
    // Somewhere in its territory: within SPIDER.home tiles of the web.
    const ang = Math.random()*Math.PI*2, dd = 8 + Math.random()*(SPIDER.home - 8);
    const x = Math.floor(w.web.x + Math.cos(ang)*dd), y = Math.floor(w.web.y + Math.sin(ang)*dd);
    if (x < 3 || y < 3 || x >= W-3 || y >= H-3) continue;
    if (w.blocked[idx(x,y)] || w.home[idx(x,y)] < (s.t < 240 ? 14 : 7) || w.rhome[idx(x,y)] < 5) continue;
    if (Math.hypot((x+0.5)*T - sp.x, (y+0.5)*T - sp.y) < 12*T) continue;
    spiderRoute(s, sp, (x+0.5)*T, (y+0.5)*T); return;
  }
}
// Walk in from a random edge with the hp it left with.
export function spiderEnter(s, hp){
  const side = [0, 1, 3][Math.floor(Math.random()*3)],  // never through the house wall
    u = 0.2 + Math.random()*0.6;
  const out = side===0 ? [-2, u*H] : side===1 ? [W+2, u*H] : side===2 ? [u*W, -2] : [u*W, H+2];
  const inn = side===0 ? [5, u*H] : side===1 ? [W-5, u*H] : side===2 ? [u*W, 5] : [u*W, H-5];
  s.spider = { cost0: s.colony.deaths.spider || 0, x: out[0]*T, y: out[1]*T, hp, maxHp: 150, bite: 0, legs: 0, route: [[inn[0]*T, inn[1]*T]], entering: true, stuck: 0 };
  if (!s.player.msg) s.player.msg = 'The spider is back, walking in from the edge of the yard.';
}
export function stepSpider(s, dt){
  const sp = s.spider; if (!sp) return;
  const free = sp.leaving || sp.entering;
  // Passing the nest it only strikes at ants that walk right into it.
  // Resting at its web it waits in ambush and only strikes close.
  if (sp.rest > 0) sp.rest -= dt;
  if (sp.tired > 0) sp.tired -= dt;
  // Build 16: after a kill it stops to eat; three meals and it is full, and
  // goes back to its web to sleep it off. Full, it hunts nothing.
  if (sp.eatT > 0){ sp.eatT -= dt; sp.mode = 'eat'; sp.chaseT = 0; return; }
  if (sp.full > 0){ sp.full -= dt; if (sp.full <= 0) sp.meals = 0; }
  let target = null, bd = sp.passing ? SPIDER.passing : sp.rest > 0 ? SPIDER.ambush : SPIDER.see;
  // Ants on the nest's doorstep are out of bounds, so it never camps the entrance.
  if (!free && !(sp.tired > 0) && !(sp.full > 0)) for (const a of s.ants){ if (a.state==='dead'||a.state==='in'||a.state==='build'||a.state==='nest') continue; if (spiderNearNest(s, a.x, a.y)) continue; const d = Math.hypot(a.x-sp.x, a.y-sp.y); if (d < bd){ bd = d; target = a; } }
  // A chase: a lunge, then a steady run; after a few seconds it gives up.
  // It crouches for a moment first (the tell), then lunges.
  if (target){ if (!sp.chaseT) { sp.chaseT = 0; sp.rest = 0; } sp.chaseT += dt; if (sp.chaseT > SPIDER.giveUp + SPIDER.windup){ sp.chaseT = 0; sp.tired = SPIDER.tired; target = null; } }
  else sp.chaseT = 0;
  if (target && sp.chaseT < SPIDER.windup){ sp.mode = 'crouch'; sp.dx = target.x - sp.x; sp.dy = target.y - sp.y; return; }
  sp.mode = target ? (sp.chaseT < SPIDER.windup + SPIDER.lunge ? 'lunge' : 'chase') : sp.rest > 0 || sp.full > 0 ? 'rest' : 'walk';
  if (!sp.route || !sp.route.length) spiderPlan(s, sp);
  if (!sp.route.length && !target){ sp.rest = 1; return; } // no plan this time: wait and try again
  let gx, gy;
  if (target){ gx = target.x; gy = target.y; }
  else if (sp.rest > 0) return;
  else { [gx, gy] = sp.route[0];
    // Give up on a waypoint it can't reach (circling a rock) after a while.
    sp.legT = (sp.legT||0) + dt; if (sp.legT > 60 && !sp.entering){ sp.route.shift(); sp.legT = 0; if (sp.leaving){ sp.leaving = false; sp.route = []; } return; }
    if (Math.hypot(gx-sp.x, gy-sp.y) < T*0.6){ const done = sp.route.shift(); sp.stuck = 0; sp.legT = 0; if (done[2]) sp.rest = done[2];
    if (sp.leaving && !sp.route.length){ s.spiderAway = { hp: sp.hp, t: 40 + Math.random()*40 }; s.spider = null; return; }
    if (sp.entering) sp.entering = false;
    return; } }
  if (sp.slowT > 0) sp.slowT -= dt;
  if (sp.stunned > s.t) return; // build 32: held in a mandible lock
  const lame = crippled(sp); if (sp.mode === 'lunge' && lame >= 4) sp.mode = 'chase'; // (four legs gone: no lunge)
  const speed = (target ? (sp.mode === 'lunge' ? SPIDER.lungeSpeed : SPIDER.chaseSpeed) : SPIDER.roamSpeed)*SURF*(sp.slowT > 0 ? 0.5 : 1)*(isNight(s) ? 1.2 : 1)*(1 - 0.1*lame); /* (build 43: a night hunter; 73: lamed) */ const ddx = gx - sp.x, ddy = gy - sp.y; if (Math.hypot(ddx, ddy) < 1) return;
  const base = Math.atan2(ddy, ddx); sp.face = base;
  // Steer around rocks: straight, then increasingly wide detours.
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]){
    const nx = sp.x + Math.cos(base+off)*speed*dt, ny = sp.y + Math.sin(base+off)*speed*dt;
    const tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    // The fence is two tiles deep; a spider coming or going climbs over it.
    const inside = tx>1 && ty>0 && tx<W-2 && ty<H-2;
    if (inside ? s.world.blocked[idx(tx,ty)] : !free) continue;
    // Keep its body off rocks: never into a tighter spot than two tiles' room,
    // unless it is already squeezed in somewhere (then only to roomier ground).
    if (inside && !free){ const room = spiderRoom(s, nx, ny); if (room < SPIDER_ROOM && room < spiderRoom(s, sp.x, sp.y)) continue; }
    if (spiderNearNest(s, nx, ny)) continue;
    sp.x = nx; sp.y = ny; sp.stuck = 0; return;
  }
  sp.stuck = (sp.stuck||0) + dt;
  if (sp.stuck > 2 && !target){ sp.route.shift(); sp.stuck = 0; sp.legT = 0; }
}
export function stepCat(s, dt){
  const ct = s.cat; if (!ct) return; ct.wander -= dt; if (ct.wander <= 0){ ct.wander = 4 + Math.random()*4; const ang = Math.random()*Math.PI*2; ct.gx = ct.x + Math.cos(ang)*3*T; ct.gy = ct.y + Math.sin(ang)*3*T; }
  let ddx = ct.gx - ct.x, ddy = ct.gy - ct.y; const d = Math.hypot(ddx, ddy);
  if (ct.slowT > 0) ct.slowT -= dt;
  if (d > 1){ ddx/=d; ddy/=d; const cs = 8*SURF*dt*(ct.slowT > 0 ? 0.5 : 1), nx = ct.x + ddx*cs, ny = ct.y + ddy*cs; if (walk(s, Math.floor(nx/T), Math.floor(ny/T))){ ct.x = nx; ct.y = ny; } else ct.wander = 0; }
  // attacked by soldiers/venom on patrol/fight nearby
  for (const a of s.ants){ if (a.team || a.state==='dead' || a.state==='in' || a.state==='build' || a.state==='nest' || a.state==='away') continue; if (CASTES[a.caste].fight < 3 && !a.follow && !a.isPlayer) continue; const dd = Math.hypot(a.x-ct.x, a.y-ct.y); if (dd < CAT_REACH*reachOf(s, a)){ const dmg = bite(s, a, 'cat')*dt*0.5; ct.hp -= dmg; ct.hitT = s.t; spark(s, a, (a.x + ct.x)/2, (a.y + ct.y)/2, 0); gainXp(s, a, dmg/3); stingSlow(s, a, ct); } else if (dd < 5*T && CASTES[a.caste].fight >= 3 && a.state === 'patrol'){ a.state = 'fight'; a.goal = 'cat'; chooseToward(s, a, ct.x, ct.y); } }
  // fight-state soldiers targeting cat
  for (const a of s.ants){ if (a.goal === 'cat' && a.state === 'fight'){ if (Math.hypot(a.x-ct.x, a.y-ct.y) > CAT_REACH*0.8){ if (stepTo(a, a.tx, a.ty, paceOf(s, a, CASTES[a.caste].speed), dt)) chooseToward(s, a, ct.x, ct.y); } } }
}
