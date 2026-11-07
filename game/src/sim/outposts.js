// Outposts and held regions (build 13): placing and building them, region prizes, water caps.
import { GUARDIANS, OUTPOST, prizeOf } from './growth.js';
import { AREAS } from './yard.js';
import { H, T, W, idx, roomCount } from './core.js';
import { canPay, payCost } from './colony.js';
import { areaOf, findPath, reveal } from './world.js';
import { gainGenes, has, inBand } from './progress.js';
import { joined } from './daughters.js';
import { WILD_SIDE } from './wilds.js';
import { outside } from './hazards.js';

// Cairns you raise far from home. s.outposts: [{ id, x, y, region, work, done, hp }].
// s.reachMask: tiles foragers may roam (round an outpost, and along the road
// back to the nest); s.keepMask: tiles whose trails never fade.
export const prizeFx = (s, ai) => s.colony.held[ai] ? prizeOf(AREAS[ai].key).fx : null;
export const heldFx = (s, fx) => { for (const i in s.colony.held) if (prizeOf(AREAS[i].key) && prizeOf(AREAS[i].key).fx === fx) return true; return false; };
export const setDone = (s, set) => !!s.colony.goals.sets[set];
export function outpostCap(s){ return 2 + s.queen.level + (setDone(s, 'explorer') ? 1 : 0); }
// Why an outpost can't go here ('' if it can).
export function outpostLock(s){
  const P = s.player, a = P.ant, c = s.colony;
  if (!has(s, 'waypoints')) return 'needs Waypoints (Evolve)';
  if (!a || P.inNest) return 'go outside';
  const ai = areaOf(s, a.tx, a.ty);
  if (GUARDIANS[AREAS[ai].key] && AREAS[ai].key.startsWith('fire')) return 'the fire ants won’t allow it';
  if (Math.hypot(a.tx - c.ex, a.ty - c.ey) < OUTPOST.spacing) return 'too close to the nest';
  if (s.outposts.some(o => Math.hypot(a.tx - o.x, a.ty - o.y) < OUTPOST.spacing)) return 'too close to another outpost';
  if (s.outposts.length >= outpostCap(s)) return `at most ${outpostCap(s)} outposts (more with queen levels)`;
  if (!canPay(c, OUTPOST.cost)) return 'needs 10 stone';
  return '';
}
export function placeOutpost(s){
  if (outpostLock(s)) return false; const a = s.player.ant;
  payCost(s.colony, OUTPOST.cost);
  s.outposts.push({ id: s.nextId++, x: a.tx, y: a.ty, region: areaOf(s, a.tx, a.ty), work: 0, done: false, hp: OUTPOST.hp });
  s.player.msg = 'Outpost started. Stay close: you and your crew pile the pebbles.';
  return true;
}
export function addOutpost(s, x, y, done){ const o = { id: s.nextId++, x, y, region: areaOf(s, x, y), work: done ? OUTPOST.work : 0, done: !!done, hp: OUTPOST.hp }; s.outposts.push(o); if (done) outpostsChanged(s); return o; }
export function outpostsChanged(s){
  const reach = new Uint8Array(W*H), keep = new Uint8Array(W*H), w = s.world;
  const disc = (m, cx, cy, r) => { for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H-1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W-1, Math.ceil(cx + r)); x++) if ((x-cx)*(x-cx) + (y-cy)*(y-cy) <= r*r) m[idx(x,y)] = 1; };
  for (const o of s.outposts){ if (!o.done) continue;
    disc(reach, o.x, o.y, OUTPOST.reach*(joined(s, 'watch') ? 1.25 : 1)); disc(keep, o.x, o.y, OUTPOST.keep); /* build 49: the Watch */
    // The road home: a band along the walk from the outpost to the nest.
    let px = o.x, py = o.y;
    for (const [qx, qy] of findPath(s, o.x, o.y, w.ex, w.ey)){ const n = Math.max(1, Math.ceil(Math.hypot(qx - px, qy - py))); for (let k = 0; k <= n; k++) disc(reach, px + (qx - px)*k/n, py + (qy - py)*k/n, OUTPOST.road); px = qx; py = qy; } }
  s.reachMask = reach; s.keepMask = keep;
}
export function tickOutposts(s, dt){
  const c = s.colony, P = s.player;
  for (const o of s.outposts){
    if (o.done) continue;
    // You and any of your ants close by pile the pebbles.
    let n = 0; for (const a of s.ants) if (!a.team && outside(a) && Math.hypot(a.x/T - o.x - 0.5, a.y/T - o.y - 0.5) < 3) n += a.isPlayer && a.caste === 'builder' ? 2 : 1; // build 74: a builder you play, twice
    o.work += n*dt;
    if (o.work >= OUTPOST.work){ o.done = true; reveal(s, o.x, o.y, OUTPOST.see); outpostsChanged(s); s.events.push('outpost'); P.msg = `Outpost raised in ${AREAS[o.region].name.replace(/^The /, 'the ')}. Foragers range from here now, and you can eat here.`; }
  }
  // Holding: an outpost in the region, its guardian beaten.
  s.holdT = (s.holdT || 0) + dt; if (s.holdT < 1) return; s.holdT = 0;
  const now = {};
  for (const o of s.outposts){ if (!o.done) continue; const A = AREAS[o.region], G = GUARDIANS[A.key]; if (A.key === 'rock' || (G && !G[1](s))) continue; now[o.region] = true; }
  for (const i in now) if (!c.held[i]){ c.held[i] = true; const A = AREAS[i]; gainGenes(s, 1, 'holding ' + A.name.replace(/^The /, 'the ')); s.events.push('held'); P.msg = `You hold ${A.name.replace(/^The /, 'the ')}! Prize: ${prizeOf(A.key).text.replace(/^./, ch => ch.toLowerCase())}.`; if (prizeFx(s, i) === 'water') c.waterCap = waterCapOf(s); }
  for (const i in c.held) if (!now[i]){ delete c.held[i]; P.msg = `You lost your hold on ${AREAS[i].name.replace(/^The /, 'the ')}.`; c.waterCap = waterCapOf(s); }
}
// An outpost knocked about by a foot or flattened by the mower.
export function hitOutpost(s, o, dmg){ if (has(s, 'weaver') || (s.colony.trophies.blackfeather && WILD_SIDE[o.region] === 'west')) return; /* build 51: Weaver Canopy */ o.hp -= dmg; if (o.hp > 0) return; s.outposts.splice(s.outposts.indexOf(o), 1); outpostsChanged(s); s.player.msg = `An outpost in ${AREAS[o.region].name.replace(/^The /, 'the ')} was knocked flat.`; s.events.push('outpostlost'); }
export const deathTotal = c => Object.values(c.deaths).reduce((t, n) => t + n, 0);
export const waterCapOf = s => { const n = roomCount(s, 'cistern'); return (n ? Math.round((60 + 30*(n - 1))*(1 + 0.5*inBand(s, 'cistern'))) : 10) + (heldFx(s, 'water') ? 40 : 0); };
