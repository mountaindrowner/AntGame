// Daughter colonies (build 46, docs/SUPERCOLONY.md): nuptial flights, the tunnel, her rooms, her ants as
// real ants near you and numbers far away, travel between nests.
import { RANKS } from './growth.js';
import { AREA, AREAS } from './yard.js';
import { CASTES, NEST_SECTIONS, NH, NW, ROOMS, SHAFT, T } from './core.js';
import { addSugar, canPay, deposit, exitNest, payCost } from './colony.js';
import { bfs, mkAnt, raiseAlarm, reveal, walk } from './world.js';
import { GLOW_QUARRY, GLOW_ZONES, gainGlow } from './nest.js';
import { eggCost, has } from './progress.js';
import { outpostsChanged } from './outposts.js';
import { zonesTaken } from './player.js';

// Support colonies with a role, not second capitals. A nuptial flight (the Royal chamber, and guardians beaten:
// 3, 5, 7, 9, 11) sends a winged queen to a finished outpost far from home; a tunnel is dug to her from the main
// nest, slowly; when it arrives she lays her own eggs, fed from the main stores. Far away she is numbers (d.pop);
// near you, real ants (a.dh = her key) who forage and patrol round her door.
export const DAUGHTERS = {
  // mix: what she lays, by weight (a caste that needs meat falls back to a forager when there's none; build 49).
  war:    { name: 'the War Camp', short: 'War Camp', icon: '⚔', branch: 'Society', mix: { soldier: 0.65, forager: 0.35 }, does: 'soldiers that hatch Seasoned', line: 'Her soldiers hatch Seasoned.' },
  brood:  { name: 'the Brood Hall', short: 'Brood Hall', icon: '🥚', branch: 'Bodies', mix: { forager: 0.45, nurse: 0.15, major: 0.3, supermajor: 0.1 }, does: 'big castes; your eggs hatch faster', line: 'She raises the big castes, and your queen’s eggs hatch 20% faster.' },
  watch:  { name: 'the Watch', short: 'Watch', icon: '👁', branch: 'Senses', mix: { forager: 0.8, soldier: 0.2 }, does: 'scouts; sees far, warns of raids', line: 'Her scouts map the ground round her, your outposts reach a quarter further, and raiders are seen coming.' },
  quarry: { name: 'the Quarry', short: 'Quarry', icon: '⛏', branch: 'Nest', mix: { builder: 0.4, forager: 0.5, soldier: 0.1 }, does: 'stone; your builders dig faster', line: 'She quarries 🪨 stone, a stone a minute for every 4 of her ants, and your builders dig and mend 25% faster.' },
  garden: { name: 'the Garden', short: 'Garden', icon: '🌿', branch: 'Symbiosis', mix: { forager: 0.9, soldier: 0.1 }, does: 'honeydew; your fungus grows faster', line: 'Her herds give 🍯 sugar, one a minute for every 5 of her ants, and your fungus gardens grow 25% faster.' },
};
// Build 50: each daughter's own nest. Pre-dug for her: a shaft, her queen's chamber, a hatchery, and two empty
// chambers for her two rooms, built from your stores while you're inside her nest. Her first room (her seat)
// unlocks her branch's top evolutions; her second is her specialty.
export const DROOMS = {
  drill:        { d: 'war',    seat: true, name: 'Drill yard',     cost: { food: 120, grit: 30, protein: 20 }, work: 90,  w: 5, h: 3, desc: 'Unlocks the War Camp’s evolutions: Colony memory, Brood raiding, Honour guard' },
  mess:         { d: 'war',    name: 'Mess hall',                  cost: { food: 200, protein: 40, wood: 10 }, work: 150, w: 5, h: 3, desc: 'Her fighters eat 25% less 🥩 meat' },
  royalnursery: { d: 'brood',  seat: true, name: 'Royal nursery',  cost: { food: 120, grit: 30, sugar: 20 }, work: 90,  w: 5, h: 3, desc: 'Unlocks the Brood Hall’s evolutions: Polymorphism, Exploders, Long-lived workers, Lineage' },
  broodcells:   { d: 'brood',  name: 'Brood cells',                cost: { food: 220, water: 30, sugar: 30 }, work: 150, w: 5, h: 3, desc: 'She holds 75 ants, not 50' },
  lookout:      { d: 'watch',  seat: true, name: 'Lookout',        cost: { food: 120, grit: 40 }, work: 90,  w: 5, h: 3, desc: 'Unlocks the Watch’s evolutions: Hive mind, War columns, Propaganda scent, Sun compass' },
  maproom:      { d: 'watch',  name: 'Map room',                   cost: { food: 180, grit: 40, wood: 15 }, work: 150, w: 5, h: 3, desc: 'Your foragers range 15% further' },
  cutting:      { d: 'quarry', seat: true, name: 'Cutting hall',   cost: { food: 120, grit: 30 }, work: 90,  w: 5, h: 3, desc: 'Unlocks the Quarry’s evolutions: Deep halls, Thermal chimneys, Highways, Shared stores' },
  cellar:       { d: 'quarry', name: 'Rock cellar',                cost: { food: 180, grit: 60 }, work: 150, w: 5, h: 3, desc: 'Her stone doubled' },
  greenhouse:   { d: 'garden', seat: true, name: 'Greenhouse',     cost: { food: 120, water: 30, sugar: 10 }, work: 90,  w: 5, h: 3, desc: 'Unlocks the Garden’s evolutions: Honey economy, Flower nectar, and the Fungus garden’s level III' },
  dewvault:     { d: 'garden', name: 'Honeydew vault',             cost: { food: 180, sugar: 40, wood: 10 }, work: 150, w: 5, h: 3, desc: 'Her 🍯 sugar doubled' },
};
for (const k in DROOMS) ROOMS[k] = DROOMS[k];
ROOMS.dslot = { name: 'Empty chamber', cost: {}, work: 0, w: 5, h: 3, desc: 'Room for one of her rooms' };
export const DROOMS_OF = {}; for (const k in DROOMS) (DROOMS_OF[DROOMS[k].d] = DROOMS_OF[DROOMS[k].d] || []).push(k); // seat first
for (const k in DROOMS_OF) DROOMS_OF[k].sort((a, b) => (DROOMS[b].seat ? 1 : 0) - (DROOMS[a].seat ? 1 : 0));
// The tree's top nodes, each needing a daughter's seat room (the plan of record). Nodes a save owns stay owned.
export const EVO_GATE = { polymorphism: 'royalnursery', exploders: 'royalnursery', longlived: 'royalnursery', lineage: 'royalnursery',
  memory: 'drill', broodraid: 'drill', honourguard: 'drill', hivemind: 'lookout', warcolumns: 'lookout', propaganda: 'lookout', suncompass: 'lookout',
  deephalls: 'cutting', chimneys: 'cutting', highways: 'cutting', shared: 'cutting', honeyeco: 'greenhouse', nectar: 'greenhouse' };
export const dRoomBuilt = (s, rkey) => { const R = DROOMS[rkey], d = R && (s.daughters || []).find(q => q.key === R.d); return !!(d && (d.rooms || []).some(r => r && r.key === rkey && r.done)); };
export const dcap = (s, d) => DAUGHTER_CAP + (d.key === 'brood' && dRoomBuilt(s, 'broodcells') ? 25 : 0) + (has(s, 'supercolony') ? 50 : 0); // build 51: the Supercolony, +50 each
const DQUEEN = { key: 'queen', x0: 19, y0: 6, w: 4, h: 3 }, DHATCH = { key: 'hatchery', x0: 26, y0: 6, w: 4, h: 3 };
const DSLOTS = [{ x0: 16, y0: 12, w: 5, h: 3 }, { x0: 28, y0: 12, w: 5, h: 3 }];
const DOPEN = {}; for (const S of NEST_SECTIONS) DOPEN[S.key] = true;
const dnestCache = new WeakMap();
export function daughterNest(d){
  let n = dnestCache.get(d);
  if (!n){ const cells = new Uint8Array(NW*NH), dig = (x, y) => { cells[y*NW + x] = 1; };
    for (let y = 0; y <= 14; y++) dig(SHAFT, y);
    for (const r of [DQUEEN, DHATCH, ...DSLOTS]) for (let y = r.y0; y < r.y0 + r.h; y++) for (let x = r.x0; x < r.x0 + r.w; x++) dig(x, y);
    dig(23, 7); dig(25, 7); for (let x = 21; x < SHAFT; x++) dig(x, 13); for (let x = SHAFT + 1; x < 28; x++) dig(x, 13);
    n = { cells, rooms: [], digOrders: [], fillOrders: [], spoil: 0, open: DOPEN, breach: null, ver: 'd:' + d.key, sig: null }; dnestCache.set(d, n); }
  const sig = (d.rooms || []).map(r => r ? r.key + (r.done ? '+' : '-') : '_').join();
  if (n.sig !== sig){ n.sig = sig; n.rooms = [DQUEEN, DHATCH, ...DSLOTS.map((S, i) => { const r = (d.rooms || [])[i]; return { key: r && r.done ? r.key : 'dslot', x0: S.x0, y0: S.y0, w: S.w, h: S.h }; })]; }
  return n;
}
// Floor spots in her chambers, where her ants rest when you're inside.
export const DSPOTS = []; for (const r of [DQUEEN, DHATCH, ...DSLOTS]) for (let x = r.x0; x < r.x0 + r.w; x++) DSPOTS.push([x + 0.5, r.y0 + r.h - 0.5]);
export function dRoomLock(s, dkey, rkey){
  const R = DROOMS[rkey], d = (s.daughters || []).find(q => q.key === dkey), P = s.player;
  if (!R || R.d !== dkey || !d) return 'not hers';
  if (d.state !== 'ready') return 'her tunnel isn’t through yet';
  const i = R.seat ? 0 : 1, have = (d.rooms || [])[i];
  if (have) return have.done ? 'built' : 'being built';
  if (!R.seat && !((d.rooms || [])[0] || {}).done) return 'build her ' + DROOMS[DROOMS_OF[dkey][0]].name + ' first';
  if (!(P.inNest && P.nestKey === dkey)) return 'go into her nest to build it';
  if (!canPay(s.colony, R.cost)) return 'needs ' + Object.entries(R.cost).map(([k, v]) => v + ' ' + k).join(', ');
  return '';
}
export function buildDRoom(s, dkey, rkey){
  if (dRoomLock(s, dkey, rkey)) return false;
  const R = DROOMS[rkey], d = s.daughters.find(q => q.key === dkey); payCost(s.colony, R.cost);
  d.rooms = d.rooms || [null, null]; d.rooms[R.seat ? 0 : 1] = { key: rkey, done: false, progress: 0 }; s.events.push('roomPlaced'); return true;
}
// Travel by tunnel (build 50): from inside one nest to inside another, home or a joined daughter.
export function travelLock(s, dkey){
  const P = s.player; if (!P.ant || !P.inNest) return 'be inside a nest';
  if ((P.nestKey || null) === (dkey || null)) return 'you are there';
  if (dkey){ const d = (s.daughters || []).find(q => q.key === dkey); if (!d || d.state !== 'ready') return 'her tunnel isn’t through yet'; }
  return '';
}
export function travel(s, dkey){
  if (travelLock(s, dkey)) return false;
  const P = s.player, a = P.ant, w = s.world, d = dkey ? s.daughters.find(q => q.key === dkey) : null;
  P.nestKey = dkey || null; P.ntx = null; P.exiting = false; P.tx = null;
  a.nx = SHAFT + 0.5; a.ny = 0.5; a.ntx = SHAFT; a.nty = 0;
  const ex = d ? d.ex : w.ex, ey = d ? d.ey : w.ey; a.tx = ex; a.ty = ey; a.x = (ex + 0.5)*T; a.y = (ey + 0.5)*T;
  s.events.push('tunnel'); return true;
}
// Build 49: a daughter joined by her tunnel (her gifts to the main nest work only then).
export const joined = (s, key) => !!(s.daughters && s.daughters.length && s.daughters.some(d => d.key === key && d.state === 'ready'));
// Build 49: the Watch sees raiders set off: every fighter at home turns out to meet them.
export function watchWarns(s){ if (!joined(s, 'watch')) return ''; const c = s.colony; raiseAlarm(s, c.ex, c.ey, 1.5);
  let n = 0; for (const a of s.ants) if (!a.team && !a.dh && a.state === 'in' && CASTES[a.caste].fight >= 3){ exitNest(s, a, 'fight'); n++; }
  return n ? ` The Watch saw them set off: ${n} fighter${n === 1 ? '' : 's'} turn out.` : ' The Watch saw them set off.'; }
function daughterCaste(s, d){
  if (d.order === 'gather') return 'forager'; /* build 53: her standing order */
  const R = DAUGHTERS[d.key], m = R.mix || { forager: 1 }; let tot = 0; for (const k in m) tot += m[k];
  let r = Math.random()*tot, caste = 'forager'; for (const k in m){ r -= m[k]; if (r <= 0){ caste = k; break; } }
  if (caste === 'major' && !has(s, 'majors')) caste = 'soldier';
  if (caste === 'supermajor' && !has(s, 'polymorphism')) caste = has(s, 'majors') ? 'major' : 'soldier';
  if (!canPay(s.colony, eggCost(s, caste))) caste = 'forager';
  return caste;
}
export const FLIGHT_AT = [3, 5, 7, 9, 11], DAUGHTER_CAP = 50, DAUGHTER_MIN = 2*AREA, FLIGHT_TIME = 10;
export const daughterOf = (s, a) => a.dh && (s.daughters || []).find(d => d.key === a.dh) || null;
export function flightsAllowed(s){ if (!has(s, 'royal')) return 0; const z = zonesTaken(s); return FLIGHT_AT.filter(n => z >= n).length; }
export const flightReady = s => flightsAllowed(s) > (s.daughters || []).length;
// Where a daughter can be founded, and as what ('' when it can).
export function daughterLock(s, oi, role){
  const o = (s.outposts || [])[oi], R = DAUGHTERS[role]; if (!o) return 'no outpost';
  if (!R) return 'no such role'; if (R.soon) return R.short + ' comes in a later build';
  if ((s.daughters || []).some(d => d.key === role)) return 'you already have ' + R.name;
  if (!has(s, 'royal')) return 'evolve the Royal chamber (Nest) first';
  if (!flightReady(s)){ const next = FLIGHT_AT[(s.daughters || []).length]; return next ? `the next winged queen comes with guardian ${next} beaten (${zonesTaken(s)} so far)` : 'no more winged queens'; }
  if (!o.done) return 'the outpost is not finished';
  if ((s.daughters || []).some(d => d.oid === o.id)) return 'a daughter lives here already';
  const w = s.world; if (Math.hypot(o.x - w.ex, o.y - w.ey) < DAUGHTER_MIN) return 'too near home: at least two regions away';
  for (const d of s.daughters || []) if (Math.hypot(o.x - d.ex, o.y - d.ey) < DAUGHTER_MIN) return 'too near ' + DAUGHTERS[d.key].name;
  return '';
}
export function foundDaughter(s, oi, role){
  if (daughterLock(s, oi, role)) return false;
  const o = s.outposts[oi], w = s.world, R = DAUGHTERS[role];
  // Her door: a walkable tile a few steps from the cairn.
  let ex = o.x, ey = o.y; for (const [dx, dy] of [[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,2],[2,-2],[-2,-2],[1,0]]) if (walk(s, o.x + dx, o.y + dy)){ ex = o.x + dx; ey = o.y + dy; break; }
  const dist = Math.hypot(ex - w.ex, ey - w.ey);
  const d = { key: role, oid: o.id, region: o.region, ex, ey, state: 'flight', t0: s.t, tunnel: { progress: 0, need: Math.round(dist*4.5) }, pop: {}, real: false, eggT: 0, hatched: 0 };
  (s.daughters = s.daughters || []).push(d);
  s.banner = { key: 'flight-' + role, t: s.t, icon: '🪽', title: 'The nuptial flight', line: `A winged queen rises from your nest and flies for ${AREAS[o.region].name.replace(/^The /, 'the ')}. She will found ${R.name}.`, kind: 'gift' }; s.events.push('flight');
  return true;
}
export function daughterHome(s, d){ const w = s.world; w.dhomes = w.dhomes || {}; const k = d.key + ':' + d.ex + ',' + d.ey; return w.dhomes[k] || (w.dhomes[k] = bfs(w.blocked, d.ex, d.ey)); }
export const LARDER_RATE = [2, 3, 4], LARDER_FOOD = [3, 2.5, 2], LARDER_FULL = 150; // build 48: meat a minute per level, food per meat, where it stops
const DLOSS = 0.001; // build 47.3: a far daughter's ant lost to the yard, per ant per minute
const DFORAGE = 2.5; // build 47: a far daughter's forager, food a minute (measured near: 2 to 3)
export const dpop = d => Object.values(d.pop || {}).reduce((a, b) => a + b, 0);
export const daughterAnts = (s, d) => s.ants.filter(a => a.dh === d.key && a.state !== 'dead');
export const daughterCount = (s, d) => dpop(d) + daughterAnts(s, d).length;
// Bring her ants to life round her door, or fold them back into numbers.
function realizeDaughter(s, d){
  const vets = d.vets || [];
  for (const caste in d.pop) for (let i = 0; i < d.pop[caste]; i++){ const a = mkAnt(s, caste, 'in', d.ex, d.ey, 0); a.dh = d.key; a.rest = Math.random()*8; if (CASTES[caste].fight >= 3 && d.key === 'war') a.xp = Math.max(a.xp || 0, RANKS[1].xp);
    const v = vets.findIndex(q => q.caste === caste); if (v >= 0){ const kept = vets.splice(v, 1)[0]; delete kept.caste; Object.assign(a, kept); } } // her veterans come back as themselves
  d.pop = {}; d.vets = []; d.real = true;
}
function abstractDaughter(s, d){
  for (const a of daughterAnts(s, d)){ if (a.follow || a.isPlayer || a.state === 'away' || a.state === 'muster') continue;
    if (a.carry > 0) deposit(s, a); // whatever it was carrying reaches the stores (it used to be only food)
    if (a.name || a.xp > 0) (d.vets = d.vets || []).push({ caste: a.caste, xp: a.xp, name: a.name, title: a.title, legend: a.legend }); // names and ranks kept
    d.pop[a.caste] = (d.pop[a.caste] || 0) + 1; a.state = 'dead'; a.folded = true; }
  s.ants = s.ants.filter(a => a.state !== 'dead'); d.real = false;
}
export function tickDaughters(s, dt){
  const c = s.colony, P = s.player;
  // A winged queen ready: say so once each time.
  const ready = flightReady(s); if (ready && !s.flightSaid){ s.flightSaid = true; s.banner = { key: 'flightready' + (s.daughters || []).length, t: s.t, icon: '🪽', title: 'A winged queen is ready', line: 'Open the map and tap a finished outpost at least two regions from home: she will found a daughter colony there.', kind: 'gift' }; s.events.push('flight'); }
  if (!ready) s.flightSaid = false;
  // Build 52: the 9th, 10th and 11th guardian each leave a glowrock.
  c.glowZT = (c.glowZT || 0) + dt; if (c.glowZT >= 2){ c.glowZT = 0; const z = zonesTaken(s); c.glowZones = c.glowZones || {}; for (const n of GLOW_ZONES) if (z >= n && !c.glowZones[n]){ c.glowZones[n] = true; gainGlow(s, 1, 'guardian'); } }
  if (!s.daughters || !s.daughters.length) return;
  const pa = P.ant && !P.inNest ? P.ant : null;
  const builders = s.ants.filter(a => !a.team && !a.dh && a.caste === 'builder').length;
  for (const d of s.daughters){
    const R = DAUGHTERS[d.key];
    if (d.state === 'flight'){ if (s.t - d.t0 >= FLIGHT_TIME){ d.state = 'tunnel'; s.banner = { key: 'landed-' + d.key, t: s.t, icon: R.icon, title: 'She has landed', line: `The new queen digs in at ${AREAS[d.region].name.replace(/^The /, 'the ')}. Your builders start the tunnel to her: the line on the map shows how far it has come.`, kind: 'gift' }; s.events.push('landed'); } continue; }
    if (d.state === 'tunnel'){
      // Food to dig with; faster with builders at home (up to six).
      if (c.store < 5){ if (!d.starved){ d.starved = true; P.msg = `The tunnel to ${R.name} has stopped: the store is empty.`; } continue; }
      d.starved = false; c.store -= 0.25*dt; d.tunnel.progress += (1 + 0.5*Math.min(6, builders))*dt;
      if (d.tunnel.progress >= d.tunnel.need){ d.state = 'ready'; d.tunnel.progress = d.tunnel.need; d.readyT = s.t;
        if (d.key === 'watch'){ reveal(s, d.ex, d.ey, AREA*2.5); outpostsChanged(s); } /* build 49: her scouts map the ground round her; outposts reach further */
        s.banner = { key: 'tunnel-' + d.key, t: s.t, icon: R.icon, title: R.short + ' is joined', line: `The tunnel reaches ${R.name}. Her chambers are dug and she starts laying, fed from your stores. ${R.line || ''}`, kind: 'gift' }; s.events.push('daughter');
        d.rooms = d.rooms || [null, null]; P.msg = `${R.short} is open: up to ${DAUGHTER_CAP} ants, fed from your stores. Travel there by tunnel from inside your nest.`; }
      continue;
    }
    // Ready: near you she is real ants, far away numbers.
    const dist = P.inNest && P.nestKey === d.key ? 0 : pa ? Math.hypot(pa.x/T - d.ex, pa.y/T - d.ey) : 1e9; /* build 50: inside her nest counts as near */
    if (!d.real && dist < AREA*1.5) realizeDaughter(s, d);
    else if (d.real && dist > AREA*1.8) abstractDaughter(s, d); // (under the 2 regions she must be from home: at home she is always numbers)
    // Her eggs, paid from the main stores.
    d.eggT += dt;
    if (d.eggT >= 30 && daughterCount(s, d) < dcap(s, d)){
      const caste = daughterCaste(s, d), cost = eggCost(s, caste); /* build 47.2: the same egg discounts as the main nest; build 49: her own mix */
      if (c.store > 15 && payCost(c, cost)){ d.eggT = 0; d.hatched++;
        if (d.real){ const a = mkAnt(s, caste, 'in', d.ex, d.ey, 0); a.dh = d.key; a.rest = 1; if (CASTES[caste].fight >= 3 && d.key === 'war') a.xp = Math.max(a.xp || 0, RANKS[1].xp); }
        else d.pop[caste] = (d.pop[caste] || 0) + 1; }
    }
    // (Far away her ants starve too: the colony's one starvation death at a time is drawn from them as well,
    // by their numbers, in tickColony. Build 47 gave each far daughter her own clock, which starved 5× as fast.)
    // Build 51: Army of the March. Far from her, every 3 minutes a column of up to 8 of her soldiers joins your crew.
    if (d.key === 'war' && has(s, 'armymarch')){ d.marchT = (d.marchT || 0) + dt;
      if (d.marchT >= 180 && pa && !d.real && (d.pop.soldier || 0) > 0 && !s.lost){ d.marchT = 0; const n = Math.min(8, d.pop.soldier); d.pop.soldier -= n;
        for (let i = 0; i < n; i++){ const a = mkAnt(s, 'soldier', 'follow', pa.tx, pa.ty, 0); a.dh = 'war'; a.follow = true; a.state = 'follow'; a.xp = Math.max(a.xp || 0, RANKS[1].xp); a.x = pa.x + (Math.random() - 0.5)*3*T; a.y = pa.y + (Math.random() - 0.5)*3*T; }
        P.msg = `⚔ A column of ${n} from the War Camp marches up and joins your crew.`; s.events.push('rally'); } }
    // Build 52: the Quarry's deep seam, a glowrock every 20 minutes once her Cutting hall stands.
    if (d.key === 'quarry' && dRoomBuilt(s, 'cutting')){ d.glowT = (d.glowT || 0) + dt; if (d.glowT >= GLOW_QUARRY){ d.glowT = 0; gainGlow(s, 1, 'quarry'); } }
    // Build 50: her rooms going up (a Quarry builds half again faster).
    for (const r of d.rooms || []) if (r && !r.done){ r.progress = (r.progress || 0) + dt*(d.key === 'quarry' ? 1.5 : 1); if (r.progress >= ROOMS[r.key].work){ r.done = true; s.events.push('roomDone');
      s.banner = { key: 'droom-' + r.key, t: s.t, icon: R.icon, title: ROOMS[r.key].name + ' built', line: `In ${R.name}: ${ROOMS[r.key].desc}.`, kind: 'gift' }; } }
    // Build 49: the Quarry's stone and the Garden's honeydew, from her ants near or far (build 50: doubled by her Rock cellar or Honeydew vault).
    if (d.key === 'quarry' || d.key === 'garden'){ const per = (d.key === 'quarry' ? 4 : 5)/(dRoomBuilt(s, d.key === 'quarry' ? 'cellar' : 'dewvault') ? 2 : 1)/(has(s, 'supercolony') ? 2 : 1); d.giftAcc = (d.giftAcc || 0) + (d.real ? daughterAnts(s, d).length : dpop(d))/per/60*dt;
      while (d.giftAcc >= 1){ d.giftAcc -= 1; if (d.key === 'quarry'){ c.grit += 1; c.gritTotal = (c.gritTotal || 0) + 1; } else addSugar(s, 1); } }
    // Build 47.3: far away her ants still meet the yard's dangers, at about half the rate measured near her
    // (0.1 a minute per 50 there): one ant per 1,000 ant-minutes. Conservative, not immune.
    if (!d.real){ const n = dpop(d); d.lossAcc = (d.lossAcc || 0) + n*DLOSS/60*dt;
      if (d.lossAcc >= 1){ d.lossAcc -= 1; let r = Math.floor(Math.random()*n); for (const k in d.pop){ if (r < d.pop[k]){ d.pop[k]--; c.deaths.afield = (c.deaths.afield || 0) + 1; break; } r -= d.pop[k]; } } }
    // Far away, her foragers' work as a rate into the main store (build 47: 2.5 a minute each, what real ones bring in).
    if (!d.real && d.pop.forager){ c.store = Math.min(c.cap, c.store + d.pop.forager*DFORAGE/60*dt); c.foodTotal += d.pop.forager*DFORAGE/60*dt; }
  }
}

// Far daughters' ants (abstract head counts): how many, and the k-th one dying (build 47.2 / the code audit).
export function farPop(s, pred){ let n = 0; for (const d of s.daughters || []) if (!d.real) for (const q in d.pop || {}) if (!pred || pred(q)) n += d.pop[q]; return n; }
export function killFar(s, k, pred){ for (const d of s.daughters || []){ if (d.real) continue; for (const q in d.pop || {}){ if (pred && !pred(q)) continue; if (k < d.pop[q]){ d.pop[q]--; return q; } k -= d.pop[q]; } } return null; }
