// Saving and loading: serialize, save versions and migrations, deserialize.
import { NEST_SHIFT, NH, NW, RIVALS } from './core.js';
import { create, growthState, sleepingRival } from './state.js';
import { outpostsChanged } from './outposts.js';
import { DAY, isNight } from './tick.js';

export function serialize(s){
  return JSON.stringify({ v: SAVE_VERSION, active: s.active, raidStart: s.raidStart || null, seed: s.seed, t: s.t, lost: s.lost, mower: s.mower, areaT: s.areaT, strikeT: s.strikeT, colony: s.colony, rival: s.rival, rivals: s.rivals.slice(1), items: s.items, spider: s.spider, spiderRespawn: s.spiderRespawn, spiderAway: s.spiderAway, cat: s.cat, catRespawn: s.catRespawn, critters: s.critters, bugGone: s.bugGone, bosses: s.bosses, director: s.director, event: s.event, goo: s.goo, stalks: s.stalks,
    nest: { cells: Array.from(s.nest.cells), rooms: s.nest.rooms, digOrders: s.nest.digOrders, fillOrders: s.nest.fillOrders, spoil: s.nest.spoil, open: s.nest.open || {}, breach: s.nest.breach || null }, spoilPile: s.spoilPile, raidLive: !!s.raidLive, patioDeadAt: s.patioDeadAt, outposts: s.outposts, queen: s.queen, phase: s.phase, won: s.won, dew: s.dew, dewTimer: s.dewTimer, rain: s.rain, repairs: s.repairs, seen: s.seen,
    ants: s.ants.map(a => ({ infect:a.infect, hspore:a.hspore, climb:a.climb, zombie:a.zombie, zhp:a.zhp, clamp:a.clamp, zgoal:a.zgoal, champion:a.champion, id:a.id, caste:a.caste, state:a.state, team:a.team, tx:a.tx, ty:a.ty, x:a.x, y:a.y, carry:a.carry, kind:a.kind, itype:a.itype, hp:a.hp, thr:a.thr, isPlayer:a.isPlayer, follow:a.follow, nx:a.nx, ny:a.ny, ntx:a.ntx, nty:a.nty, goal:a.goal, dh:a.dh || null, exitTo:a.exitTo || null, duty:a.duty || null, xp:a.xp, name:a.name, title:a.title, legend:a.legend, dodged:a.dodged, loads:a.loads, loot:a.loot, lootKind:a.lootKind, survived:a.survived, frenzy:a.frenzy, frenzyAtk:a.frenzyAtk, feign:a.feign, stunned:a.stunned, exposed:a.exposed, raidT:a.raidT, webbed:a.webbed, webT:a.webT, webFree:a.webFree, holdX:a.holdX, holdY:a.holdY, holdCX:a.holdCX, holdCY:a.holdCY, recall:a.recall, muster:a.muster, bossKey:a.bossKey, bugId:a.bugId, zid:a.zid, post:a.post })), // muster: End muster finds its troops after a reload; bossKey/bugId/zid: fighters keep their target
    phase1: s.phase1 || null, phase2: s.phase2 || null, takeoverReady: s.takeoverReady || null, cds: s.player.cds || null, dayT: s.dayT, nights: s.nights || 0, daughters: s.daughters || [], flightSaid: !!s.flightSaid, wild: s.wild || null, muster: s.muster || null,
    player: { hunger: s.player.hunger, mark: s.player.mark, pending: s.player.pending, msg: s.player.msg, inNest: s.player.inNest, nestKey: s.player.nestKey || null, climb: s.player.climb || null, rebirth: s.player.rebirth || null }, nextId: s.nextId,
    seenMap: Array.from(s.seenMap).join(''),
    trail: [...s.hot].filter(i => s.trail[i] > 0.04).flatMap(i => [i, Math.round(s.trail[i]*100)/100]) });
}
// Build 40: save versions. 11 was written by builds 12-39, 12 from build 40. Older ones step up through
// migrate(); a save from a newer build than this one is refused (rather than half-read).
const SAVE_VERSION = 14;
function migrate(d){
  if (!d || typeof d !== 'object') throw new Error('not a save');
  if (d.v > SAVE_VERSION) throw new Error('save from a newer version of the game');
  if (d.v < 10) throw new Error('save from before the whole yard (build 10)');
  if (d.v <= 11){ d.v = 12; /* build 40 added raidStart, player cooldowns and timed ant effects: all default to empty */ }
  if (d.v <= 12){ d.v = 13; // build 42: the nest is 48 wide and 64 deep, the old one its open middle (12 cells in)
    const X = NEST_SHIFT, OW = 24, OH = 48, old = d.nest.cells, cells = new Array(NW*NH).fill(0);
    for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) cells[y*NW + x + X] = old[y*OW + x] || 0;
    d.nest.cells = cells; d.nest.open = {}; d.nest.breach = null;
    const mx = o => { if (o && typeof o.x === 'number') o.x += X; if (o && typeof o.ax === 'number') o.ax += X; if (o && typeof o.x0 === 'number') o.x0 += X; };
    for (const r of d.nest.rooms || []) mx(r); for (const o of d.nest.digOrders || []) mx(o); for (const o of d.nest.fillOrders || []) mx(o);
    for (const o of d.repairs || []) mx(o); for (const j of (d.colony && d.colony.buildQueue) || []) mx(j);
    if (d.queen){ if (typeof d.queen.x === 'number') d.queen.x += X; if (d.queen.room) mx(d.queen.room); }
    for (const a of d.ants || []) if (!a.team){ if (typeof a.nx === 'number') a.nx += X; if (typeof a.ntx === 'number') a.ntx += X; }
  }
  if (d.v <= 13){ d.v = 14; d.daughters = d.daughters || []; /* build 46: daughter colonies */ }
  return d;
}
export function deserialize(json){
  const d = migrate(JSON.parse(json)); const s = create(d.seed);
  // Saves from before build 12 have no growth fields: start them at zero.
  const fill = c => { const g = growthState(); for (const k in g) if (!(k in c)) c[k] = g[k]; return c; };
  s.t = d.t; s.phase1 = d.phase1 || null; s.phase2 = d.phase2 || null; s.takeoverReady = d.takeoverReady || null; s.dayT = d.dayT ?? (d.t + DAY*0.02); s.nights = d.nights || 0; s.daughters = d.daughters || []; s.flightSaid = !!d.flightSaid; s.wild = d.wild || null; s.muster = d.muster || null; s.nightNow = isNight(s); s.raidStart = d.raidStart || null; if (d.cds) s.player.cds = d.cds; s.colony = fill(d.colony); s.rival = fill(d.rival); s.rival.key = 'pavement'; s.rivals = [s.rival, ...RIVALS.slice(1).map((R, i) => (d.rivals && d.rivals[i]) ? fill(d.rivals[i]) : sleepingRival(s.world, i + 2))]; s.raidLive = !!d.raidLive; s.patioDeadAt = d.patioDeadAt ?? (d.rival && d.rival.queenAlive === false ? d.t : undefined); s.items = d.items; s.spider = d.spider; s.spiderRespawn = d.spiderRespawn; s.spiderAway = d.spiderAway || null; s.cat = d.cat; s.catRespawn = d.catRespawn; s.critters = d.critters || s.critters; s.bugGone = d.bugGone || {}; s.bosses = d.bosses || {}; if (d.director) s.director = d.director; s.event = d.event || null; s.goo = d.goo || []; s.stalks = d.stalks || []; s.nextId = d.nextId;
  s.nest.cells.set(d.nest.cells); s.nest.rooms = d.nest.rooms || []; s.nest.digOrders = d.nest.digOrders || []; s.nest.fillOrders = d.nest.fillOrders || []; s.nest.spoil = d.nest.spoil || 0; s.nest.open = d.nest.open || {}; s.nest.breach = d.nest.breach || null; s.spoilPile = d.spoilPile || 0; s.nest.ver++; s.queen = d.queen; s.phase = d.phase; s.won = d.won; s.dew = d.dew; s.dewTimer = d.dewTimer; s.rain = d.rain || s.rain; s.repairs = d.repairs || []; s.seen = d.seen && typeof d.seen === 'object' ? d.seen : {};
  s.ants = d.ants.map(a => Object.assign({ dx:0, dy:-1, rest:0, explore:0, flee:0, exitTo:null }, a));
  // A raid in progress isn't saved: its raiders walk home with what they carried (build 28). Ants held by a
  // creature (a toad's mouth, a mantis's claws, a wasp's legs) stay held (build 40).
  { const held = new Set(); for (const k in s.bosses || {}){ const b = s.bosses[k]; if (b.dead) continue; if (b.held && b.held.id) held.add(b.held.id); if (b.eat) for (const id of b.eat.ids || []) held.add(id); } for (const b of s.critters || []){ if (b.carry) held.add(b.carry); }
    for (const a of s.ants) if (a.state === 'away' && !held.has(a.id)){ a.state = 'return'; a.follow = false; a.carry = a.loot || 0; a.kind = a.lootKind === 'brood' ? 'brood' : 'food'; a.loot = 0; } }
  s.player.ant = s.ants.find(a => a.isPlayer) || null; Object.assign(s.player, d.player);
  s.lost = !!d.lost; if (d.mower) s.mower = d.mower; if (d.areaT) s.areaT = d.areaT; if (d.strikeT) s.strikeT = d.strikeT; s.player.big = s.player.ant && s.items.find(f => f.carried) || null;
  if (d.active) s.active = d.active;
  s.outposts = d.outposts || []; outpostsChanged(s);
  // The fog-of-war map (saves before 11.1 wrote it over 'seen' by mistake).
  const sm = d.seenMap || (typeof d.seen === 'string' ? d.seen : null);
  if (sm && sm.length === s.seenMap.length) for (let i=0;i<sm.length;i++) s.seenMap[i] = sm.charCodeAt(i) === 49 ? 1 : 0;
  if (d.trail) for (let k=0;k<d.trail.length;k+=2){ s.trail[d.trail[k]] = d.trail[k+1]; s.hot.add(d.trail[k]); }
  return s;
}
