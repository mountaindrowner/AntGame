// Growth (build 12 on): genes, ranks and names, ant upgrades, evolutions, doctrines and queen traits, what
// they add up to (bite, reach, pace, caps, costs), the goals board, and where genes come from.
import { EVO_BY, FAMILY, GOALS, NAMES, PROMOS, QUEEN_TRAITS, RANKS, SETS, TIERS, UPGRADES, evoCost, goalBoard, rankOf } from './growth.js';
import { AREAS } from './yard.js';
import { BEDROCK_PRIZES, CASTES, FOODS, H, HOME_X0, HOME_X1, HOME_Y1, NEST_CAP, NEST_SECTIONS, QUEEN_UP, ROOMS, T, W, idx, nidx, roomCount, roomLevel, rspec, soilTier } from './core.js';
import { costText, payCost, queenCap } from './colony.js';
import { findPath } from './world.js';
import { roomOf, sectionAt } from './nest.js';
import { DAUGHTERS, DROOMS, DROOMS_OF, EVO_GATE, FLIGHT_AT, dRoomBuilt, daughterOf, joined } from './daughters.js';
import { setDone } from './outposts.js';
import { workers } from './jobs.js';
import { zonesTaken } from './player.js';
import { outside } from './hazards.js';
import { BOSSES, HEDGE_ZONE } from './bosses.js';
import { antCount, eggLock } from './commands.js';

// The yard's genes are mostly one-time finds: each source, how many found of how many.
export function genesFound(s){
  const c = s.colony, n = o => Object.keys(o || {}).length, nb = Object.keys(BOSSES).length, ncu = (s.curios || []).length;
  const rows = [
    { name: 'Scouting regions', got: n(c.scouted), of: AREAS.length - 1, each: 1 },
    { name: 'Holding regions', got: n(c.held), of: AREAS.length - 1, each: 1 }, // the rock can't be held
    { name: 'Curios', got: n(c.curios), of: ncu, each: 1.6 },
    { name: 'Goals', got: GOALS.filter(g => c.goals.done[g.key]).length, of: GOALS.length, each: GOALS.reduce((a, g) => a + TIERS[g.tier].genes, 0)/GOALS.length },
    { name: 'Guardians and bosses', got: Object.keys(BOSSES).filter(k => (c.kills || {})[k]).length, of: nb, each: 6 },
    { name: 'Buried in the nest', got: (c.buried || 0) + n(c.prizes) - ((c.prizes || {}).ring ? 1 : 0), of: NEST_SECTIONS.filter(S => S.find === 'curio').length + BEDROCK_PRIZES.length, each: 3.5 },
  ];
  const pool = Math.round(rows.reduce((a, r) => a + r.of*r.each, 0) + 60); // + rival queens, first foods and kills
  return { rows, total: c.genesTotal, pool: Math.round(pool/10)*10 };
}
// One card a limit, when you first hit it; again only after it has eased for three minutes.
export function advise(s, dt){
  const c = s.colony; c.advT = (c.advT || 0) + dt; if (c.advT < 2) return; const step = c.advT; c.advT = 0;
  const A = c.advice || (c.advice = {}), out = s.advice || (s.advice = []);
  const say = (key, on, title, text) => { const a = A[key] || (A[key] = { off: 999, shown: false });
    if (!on){ a.off += step; if (a.off > 180) a.shown = false; return; }
    a.off = 0; if (a.shown) return; a.shown = true; out.push({ key, title, text }); };
  const ants = antCount(s), cap = queenCap(s.queen.level, s), up = QUEEN_UP[s.queen.level];
  say('ants', s.queen.placed && ants >= cap, cap >= NEST_CAP ? 'The nest is full' : 'The queen is at her limit',
    cap >= NEST_CAP ? `A nest holds ${cap} ants. Daughter colonies hold more, each in her own nest.` : `She holds ${cap} ants. Upgrade her (Nest, tap the queen) for 20 more${up ? ': ' + costText(up) : ''}.`);
  say('food', s.queen.placed && c.store >= c.cap - 0.5 && c.cap < 1000, 'The food store is full',
    roomCount(s, 'store') ? 'Food coming in now goes to waste. Build another Food store, or a Granary; one in dry packed soil or clay holds 25% more.' : 'Food coming in now goes to waste. Dig a 5×3 pocket and build a Food store: it holds 150.');
  say('water', s.queen.placed && c.water >= c.waterCap - 0.5 && c.waterCap <= 70, 'The water store is full', roomCount(s, 'cistern') ? 'Build another Cistern; one in cool clay or deep rock holds half again more.' : 'Dig a 4×4 pocket and build a Cistern: it holds 60.');
  const n = s.nest; let edge = null, bottom = false;
  for (let y = 1; y <= HOME_Y1 && !edge; y++) for (const x of [HOME_X0, HOME_X1]) if (n.cells[nidx(x, y)]){ const S = sectionAt(x === HOME_X0 ? x - 1 : x + 1, y); if (S && !(n.open || {})[S.key]){ edge = S; break; } }
  for (let x = HOME_X0; x <= HOME_X1 && !bottom; x++) if (n.cells[nidx(x, HOME_Y1)] || n.cells[nidx(x, HOME_Y1 - 1)]) bottom = !NEST_SECTIONS.some(S => S.y0 > HOME_Y1 && (n.open || {})[S.key]);
  say('edge', !!edge && !n.breach, 'You have reached the edge of your ground', edge ? `Past it is ${edge.name}. Break into it: Build, then New ground (${costText(edge.cost)}). Something is always hidden behind the wall.` : '');
  say('bottom', bottom && !n.breach, 'You have reached the bottom of the clay', 'Below is deep rock, cool and wet, and under it the bedrock. Break into the Deep: Build, then New ground.');
  say('royal', zonesTaken(s) >= FLIGHT_AT[0] && !has(s, 'royal'), 'Winged queens are waiting', `With ${FLIGHT_AT[0]} guardians beaten your queen could raise winged queens to found daughter colonies, but she needs the Royal chamber: Evolve, Nest branch.`);
  say('genes', c.genes >= 15, `🧬 ${c.genes} genes waiting`, 'Spend them under Evolve (top right): the tree, or upgrades for each kind of ant.');
}

// ---------- growth: genes, ranks, ant upgrades, evolution (build 12) ----------
export const has = (s, key) => !!s.colony.evo[key];
// An ant type's level: foragers' first three are the old training (c.forage).
export const lvl = (s, caste) => caste === 'forager' ? (s.colony.forage || 0) : (s.colony.up[caste] || 0);
export const picked = (s, caste, key) => Object.values(s.colony.picks[caste] || {}).includes(key);
export function gainGenes(s, n, why){ const c = s.colony; c.genes += n; c.genesTotal += n; s.events.push('genes'); if (!s.player.msg || /🧬/.test(s.player.msg)) s.player.msg = `+${n} 🧬 Gene${n > 1 ? 's' : ''}: ${why}.`; }
// Each ant type learns the promotions its doctrine names: Veterans the first, Elites the second too.
export function doctrineOf(s, caste){ const d = s.colony.doctrine[caste], L = PROMOS[FAMILY[caste]] || []; return [ (d && d[0]) || (L[0] && L[0][0]), (d && d[1]) || (L[1] && L[1][0]) ]; }
export function promo(s, a, key){ if (a.team) return false; const r = rankOf(a); if (r < 2) return false; const d = doctrineOf(s, a.caste); return d[0] === key || (r >= 3 && d[1] === key); }
export const jobMul = a => a.team ? 1 : RANKS[rankOf(a)].mul;
export function gainXp(s, a, n){
  if (!a || a.team || a.state === 'dead') return;
  const before = rankOf(a); a.xp = (a.xp || 0) + n * (has(s, 'division') ? 1.25 : 1);
  const r = rankOf(a); if (r > before) rankUp(s, a, r);
}
function nameAnt(s, a){ if (a.name) return; const c = s.colony, i = c.named++; a.name = NAMES[i % NAMES.length] + (i >= NAMES.length ? ' ' + (Math.floor(i / NAMES.length) + 1) : ''); }
function rankUp(s, a, r){
  const P = s.player, who = a.isPlayer ? 'You are' : null;
  if (r === 2 && !s.seen.veteran) s.events.push('veteran');
  if (r >= 3) nameAnt(s, a);
  if (r === 3 && !P.msg) P.msg = who ? `${who} an Elite now: ${a.name}.` : `${a.name} the ${CASTES[a.caste].name} is now an Elite.`;
  if (r === 4){ a.title = a.title || ({ forager: 'Long-Legs', builder: 'the Tireless', nurse: 'the Gentle' }[a.caste] || 'the Unbroken'); P.msg = `${a.name} ${a.title} is a Legend!`; }
}
// A boss's killing bite makes a Legend.
export function makeLegend(s, a, title){ nameAnt(s, a); a.legend = true; a.title = title; if (rankOf(a) === 4) { s.player.msg = `${a.name} ${title} is a Legend!`; } }
export function maxHp(s, a){ const C = CASTES[a.caste]; if (a.team) return C.hp; let h = C.hp; if (a.caste === 'soldier' && lvl(s, 'soldier') >= 1) h *= 1.3; if (a.caste === 'soldier' && lvl(s, 'soldier') >= 4) h *= 1.5; if (a.caste === 'venom' && lvl(s, 'venom') >= 2) h *= 1.3;
  if (has(s, 'cuticle')) h *= 1.5; if (qtrait(s, 'matriarch')) h *= 1.1; if ((s.colony.prizes || {}).fossil) h *= 1.1; if (s.colony.trophies.shell && roomOf(s, 'armory')) h *= 1.5; if ((a.caste === 'major' || a.caste === 'supermajor') && has(s, 'titan')) h *= 1.5; /* build 51: Titan Line */ return h; }
// How hard an ant bites: its kind, rank, upgrades, evolution and promotions.
export function bite(s, a, vs){
  const C = CASTES[a.caste]; let f = C.fight; if (a.champion) return f*2; if (a.team) return f*rspec(a).bite*(has(s, 'propaganda') ? 0.75 : 1);
  f *= jobMul(a);
  if (has(s, 'mandibles') && C.fight >= 3) f *= 1.25;
  if (s.colony.lineage === 'trapjaw' && C.fight >= 3) f *= 1.4;
  if (s.colony.lineage === 'acid' && vs && !vs.caste) f *= 1.5;
  if (a.caste === 'soldier' && lvl(s, 'soldier') >= 2) f *= 1.25;
  if (a.caste === 'venom' && lvl(s, 'venom') >= 1) f *= 1.25;
  if (promo(s, a, 'brawler')) f *= 1.2;
  if (promo(s, a, 'guard') && Math.hypot(a.tx - s.colony.ex, a.ty - s.colony.ey) < 8) f *= 1.5;
  if (promo(s, a, 'hunter') && (vs === 'spider' || vs === 'cat' || vs === 'bug' || vs === 'boss')) f *= 1.5;
  if (C.fight >= 3 && setDone(s, 'hunter')) f *= 1.1;
  if (a.follow && picked(s, 'you', 'hero')) f *= 1.2;
  // Build 18: the sugar and chitin levels.
  if (a.caste === 'venom' && lvl(s, 'venom') >= 3) f *= 1.3;
  if (C.fight >= 3 && (picked(s, 'soldier', 'phalanx') || picked(s, 'soldier', 'warlord'))){ let n = 0; for (const o of s.ants) if (o !== a && !o.team && CASTES[o.caste].fight >= 3 && outside(o) && Math.abs(o.tx - a.tx) <= 3 && Math.abs(o.ty - a.ty) <= 3 && ++n >= 2) break;
    if (n >= 2 && picked(s, 'soldier', 'phalanx')) f *= 1.5; if (n >= 1 && picked(s, 'soldier', 'warlord')) f *= 1.3; }
  if (s.colony.trophies.mandible) f *= 1.15;
  if (a.frenzy > s.t) f *= 1.3; // build 32: Alarm call
  return f;
}
// Fighters reach two tiles with Formic spray.
export const reachOf = (s, a) => !a.team && CASTES[a.caste].fight >= 3 && has(s, 'formic') ? 2 : 1;
// Walking pace outdoors: rank (for gatherers), trails, upgrades, promotions.
export function paceOf(s, a, base){
  if (a.team) return base*(a.stunned > s.t ? 0 : 1);
  if (s.colony.kills.mantis && HEDGE_ZONE.has(AREAS[s.world.area[idx(Math.max(0, Math.min(W-1, a.tx)), Math.max(0, Math.min(H-1, a.ty)))]].key)) base *= 1.5; // build 34: the hedge is yours
  if (a.frenzy > s.t) base *= 1.25;
  if (has(s, 'bridges')) base *= 1.15; // build 51: Living Bridges
  let v = base; if (FAMILY[a.caste] === 'gather') v *= jobMul(a);
  const onTrail = s.trail[idx(Math.max(0, Math.min(W-1, a.tx)), Math.max(0, Math.min(H-1, a.ty)))] >= 0.3;
  if (onTrail && has(s, 'trailrunners')) v *= 1.25;
  if (onTrail && has(s, 'highways')) v *= 1.3;
  if (onTrail && picked(s, 'forager', 'trailqueen')) v *= 1.4;
  if (a.caste === 'soldier' && lvl(s, 'soldier') >= 3) v *= 1.2;
  if (onTrail && promo(s, a, 'trailwise')) v *= 1.2;
  if (!onTrail && a.caste === 'forager' && picked(s, 'forager', 'sprinter')) v *= 1.25;
  if (promo(s, a, 'skirmisher')) v *= 1.2;
  if (s.event && s.event.key === 'heat' && !has(s, 'heat')) v *= 0.85;
  return v;
}
// Build 22.1: 6 (was 5), to make up for everyone walking 6% slower.
export const GRAIN = { seed: 1, crumb: 1, popcorn: 1 };
export const carryCap = (s, a, f) => (!a.team && a.caste === 'harvester' && f && GRAIN[f.type] ? 2 : 1)*5 + (promo(s, a, 'strongback') ? 1 : 0) + (!a.team && setDone(s, 'garden') ? 1 : 0) + (!a.team && has(s, 'bigcrop') ? 3 : 0) + (!a.team && a.caste === 'forager' && (s.colony.forage || 0) >= 4 ? 2 : 0);
export const sightOf = (s, a) => 7 + (!a.team && has(s, 'lookout') ? 3 : 0) + (!a.team && a.caste === 'forager' && picked(s, 'forager', 'pathfinder') ? 7 : 0) + (promo(s, a, 'keen') ? 4 : 0);
export const chewsTreats = (s, a) => !a.team && a.caste === 'forager' && picked(s, 'forager', 'hauler');
export const crewCap = s => has(s, 'warcolumns') ? 60 : has(s, 'crews2') ? 45 : has(s, 'crews') ? 30 : 20;
// A builder's share of a job (d dig, f fill, r repair, j room).
export function workOf(s, a, kind){
  let m = jobMul(a); const L = lvl(s, 'builder');
  if (kind !== 'j' && L >= 1) m *= 1.3;
  if (kind === 'j' && L >= 3) m *= 1.5;
  if (kind === 'j' && setDone(s, 'builder')) m *= 1.25;
  if (kind === 'j' && s.colony.trophies.silk) m *= 2;
  if (kind === 'd' && picked(s, 'builder', 'excavator')) m *= 1.5;
  if ((kind === 'd' || kind === 'r') && joined(s, 'quarry')) m *= 1.25; // build 49: the Quarry
  if (kind === 'd' && L >= 4) m *= 2; // build 40: level IV, "digs any soil 2x faster"
  if (picked(s, 'builder', 'foreman')) m *= 1.5; // build 40: Foreman
  if (has(s, 'workshop3')) m *= 1.5;
  if (kind === 'd' && promo(s, a, 'quick')) m *= 1.25;
  if (kind === 'r' && (picked(s, 'builder', 'engineer') || promo(s, a, 'fixer'))) m *= 2;
  return m;
}
// Build 42: depth bands. Warm topsoil hatches eggs faster; dry packed soil and clay keep stores;
// the cool wet depths suit the cistern and the fungus garden. The fraction of a kind's rooms in its band.
export const roomTier = r => soilTier(r.y0 + r.h - 1);
export const BAND_GOOD = { hatchery: [0], nursery: [0], store: [1, 2], granary: [1, 2], cistern: [2, 3], fungus: [2, 3] };
export const BAND_TEXT = { hatchery: 'warm topsoil: eggs hatch 10% faster', nursery: 'warm topsoil: eggs hatch 10% faster', store: 'dry packed soil or clay: holds 25% more', granary: 'dry packed soil or clay: holds 25% more', cistern: 'cool clay or deep rock: holds 50% more', fungus: 'cool clay or deep rock: grows 25% more' };
export function inBand(s, key){ const rs = s.nest.rooms.filter(r => r.key === key); if (!rs.length) return 0; return rs.filter(r => BAND_GOOD[key].includes(roomTier(r))).length/rs.length; }
export const storeCap = s => { const n = roomCount(s, 'store'), g = roomCount(s, 'granary'); return (n ? Math.round((has(s, 'store3') ? 1000 : has(s, 'store2') ? 400 : 150)*(1 + 0.5*(n - 1))*(1 + 0.25*inBand(s, 'store'))) : 20) + Math.round(g*(100 + (roomLevel(s, 'granary') >= 2 ? 150 : 0))*(1 + 0.25*inBand(s, 'granary'))) + repleteCap(s) + (has(s, 'shared') ? 50*s.outposts.filter(o => o.done).length : 0); };
// Repletes at work in the Honeypot vault (build 24): each a living jar.
function repleteCap(s){ if (!roomOf(s, 'honeypot')) return 0; return workers(s, 'replete', 'hang', 'honeypot', 4)*(roomLevel(s, 'honeypot') >= 2 ? 60 : 40); }
export const hatchCapOf = s => { const n = roomCount(s, 'hatchery'); return 1 + (has(s, 'polygyny') ? 2 : 0) + (n ? 2*n + (has(s, 'hatchery2') ? 1 : 0) + (has(s, 'hatchery3') ? 1 : 0) : 0); };
export function eggCost(s, caste){
  const cost = Object.assign({}, CASTES[(caste === 'soldier' || caste === 'venom') && picked(s, 'nurse', 'shaper') ? 'forager' : caste].cost);
  let k = 1; if (picked(s, 'nurse', 'wetnurse')) k *= 0.7; if (has(s, 'brood')) k *= 0.75; if (qtrait(s, 'broodmother')) k *= 0.7;
  if (cost.food) cost.food = Math.ceil(cost.food * k); if (cost.protein && k < 1) cost.protein = Math.ceil(cost.protein * Math.max(k, 0.7));
  if (caste === 'supermajor' && has(s, 'titan')) delete cost.chitin; /* build 51: Titan Line */ return cost; }
export function roomCost(s, key, nth){
  const arch = has(s, 'workshop3') ? 0.8 : 1;
  // nth: which copy (0 the first); by default the next one you'd build.
  const n = nth != null ? nth : roomCount(s, key) + s.colony.buildQueue.filter(j => j.room === key).length, k = (1 + 0.5*n)*arch;
  const cost = {}; for (const x in ROOMS[key].cost) cost[x] = Math.ceil(ROOMS[key].cost[x]*k);
  if (picked(s, 'builder', 'mason') && cost.grit) cost.grit = Math.ceil(cost.grit * 0.75); return cost; }
// Buy an ant type's next level; a level with picks needs one of them.
export function upgradeLock(s, caste){ return caste === 'forager' || caste === 'builder' || caste === 'you' ? '' : eggLock(s, caste); }
// Your ant (build 14): pace, health, bite and carry from the You levels.
export const youL = s => s.colony.up.you || 0;
// Build 22.1 (Mark: "he moves a little too fast at the beginning"): a slower start, won back by the You levels.
export const youPace = s => 50*(1 + (youL(s) >= 1 ? 0.25 : 0) + (youL(s) >= 4 ? 0.25 : 0) + (picked(s, 'you', 'sprint') ? 0.1 : 0));
export const youHp = s => youL(s) >= 2 ? 20 : 12;
export function upgradeCaste(s, caste, pick){
  const c = s.colony, L = UPGRADES[caste]; if (!L || upgradeLock(s, caste)) return false;
  const n = lvl(s, caste), U = L[n]; if (!U) return false;
  if (U.picks && !U.picks.some(p => p[0] === pick)) return false;
  if (!payCost(c, U.cost)) return false;
  if (caste === 'forager') c.forage = n + 1; else c.up[caste] = n + 1;
  if (U.picks) (c.picks[caste] = c.picks[caste] || {})[n + 1] = pick;
  for (const a of s.ants) if (!a.team && a.caste === caste) a.hp = Math.max(a.hp, maxHp(s, a));
  if (caste === 'you' && s.player.ant) s.player.ant.hp = Math.max(s.player.ant.hp, youHp(s));
  return true;
}
// Evolution: why a node can't be bought ('' if it can).
export function evoLock(s, key){
  const n = EVO_BY[key], c = s.colony; if (!n) return 'unknown';
  if (c.evo[key]) return 'owned';
  if (n.soon) return 'coming in a later build';
  if (n.dneed){ const miss = n.dneed.find(k => !dRoomBuilt(s, DROOMS_OF[k][1])); if (miss) return 'needs ' + DAUGHTERS[miss].name + '’s ' + DROOMS[DROOMS_OF[miss][1]].name; } // build 51: great evolutions
  if (key === 'takeover' && !(s.colony.kills || {}).blind) return 'beat Old Blind in the Sinkhole first'; // build 58
  if (n.djoin){ if (!has(s, 'royal')) return 'needs the Royal chamber'; const j = (s.daughters || []).filter(d => d.state === 'ready').length; if (j < n.djoin) return `needs ${n.djoin} daughters joined (${j} so far)`; }
  if (EVO_GATE[key] && !dRoomBuilt(s, EVO_GATE[key])){ const R = DROOMS[EVO_GATE[key]]; return 'needs ' + DAUGHTERS[R.d].name + '’s ' + R.name; } // build 50
  if (n.after && !c.evo[n.after]) return 'needs ' + EVO_BY[n.after].name + ' first';
  if (n.need && !roomOf(s, n.need)) return 'needs a ' + ROOMS[n.need].name;
  return '';
}
export function buyEvo(s, key){
  if (evoLock(s, key)) return false; const c = s.colony;
  if (!payCost(c, evoCost(s, EVO_BY[key]))) return false;
  c.evo[key] = true; c.cap = storeCap(s); c.hatchCap = hatchCapOf(s);
  if (key === 'takeover'){ s.phase2 = { t: s.t }; s.events.push('phase2'); } // build 58: the house
  if (EVO_BY[key].branch === 'great'){ s.events.push('great'); s.banner = key === 'takeover' ? null : key === 'supercolony'
    ? { key: 'great-supercolony', t: s.t, icon: '🌍', title: 'The Supercolony', line: 'Six nests, one colony. Every daughter holds 100, their gifts double, and beyond the fence the wilds are waiting.', kind: 'gift' }
    : { key: 'great-' + key, t: s.t, icon: '✨', title: EVO_BY[key].name, line: EVO_BY[key].fx + '.', kind: 'gift' }; } // build 51
  if (key === 'waypoints'){ s.player.msg = 'Outposts unlocked! Walk far from the nest and press Outpost on the bottom bar.'; s.events.push('waypoints'); }
  return true;
}
export function setDoctrine(s, caste, slot, key){ const L = PROMOS[FAMILY[caste]]; if (!L || !L.some(p => p[0] === key)) return false; const d = doctrineOf(s, caste); d[slot] = key; if (d[0] === d[1]) d[1 - slot] = L.find(p => p[0] !== key)[0]; s.colony.doctrine[caste] = d; return true; }
export function pickQueenTrait(s, level, key){ const c = s.colony, Q = QUEEN_TRAITS.find(q => q.level === level); if (!Q || s.queen.level < level || c.qtraits[level] || !Q.picks.some(p => p[0] === key)) return false; c.qtraits[level] = key; return true; }
export const qtrait = (s, key) => Object.values(s.colony.qtraits).includes(key);
// Reborn as one of your named ants: you take it over where it is.
export function possess(s, id){
  const P = s.player, a = s.ants.find(o => o.id === id && !o.team && o.state !== 'dead' && !o.isPlayer);
  if (!a || P.ant || !P.pending || rankOf(a) < 3) return false;
  a.isPlayer = true; a.follow = false; a.task = null; a.taskCell = null; a.goal = null; a.exitTo = null; a.carry = 0; a.hp = Math.max(a.hp, youHp(s));
  // Build 47: a daughter's veteran becomes yours alone, and steps out of her door, not the main nest's.
  const dd = daughterOf(s, a); a.dh = null;
  if (dd && (a.state === 'in' || a.state === 'build')){ a.state = 'player'; a.tx = dd.ex; a.ty = dd.ey; a.x = (dd.ex + 0.5)*T; a.y = (dd.ey + 0.5)*T; }
  const inside = a.state === 'in' || a.state === 'build' || a.state === 'nest';
  P.ant = a; P.pending = false; P.hunger = 100; P.tx = null; P.ntx = null; P.inNest = inside; P.nestKey = null; a.state = inside ? 'nest' : 'player';
  const qi = s.colony.eggQueue.indexOf('forager'); if (qi >= 0 && !s.colony.eggs.length) s.colony.eggQueue.splice(qi, 1);
  P.msg = `You are ${a.name}${a.title ? ' ' + a.title : ''}, ${RANKS[rankOf(a)].name} ${CASTES[a.caste].name}.`;
  return true;
}
// A trail from where a kill fell back to the nest, for the haulers.
export function trailHome(s, x, y){
  const w = s.world, path = findPath(s, Math.floor(x/T), Math.floor(y/T), w.ex, w.ey); let px = Math.floor(x/T), py = Math.floor(y/T);
  for (const [qx, qy] of path){ const n = Math.max(1, Math.ceil(Math.hypot(qx - px, qy - py))); for (let k = 0; k <= n; k++){ const i = idx(Math.round(px + (qx - px)*k/n), Math.round(py + (qy - py)*k/n)); s.trail[i] = Math.max(s.trail[i], 2.5); s.hot.add(i); } px = qx; py = qy; }
}
// Paralytic venom: stung prey slows to half speed for a while.
export function stingSlow(s, a, prey){ if (prey && !a.team && ((a.caste === 'venom' && picked(s, 'venom', 'paralytic')) || (s.colony.lineage === 'bullet' && CASTES[a.caste].fight >= 3))) prey.slowT = 2; }
// ---------- the goals board ----------
// Build 62: the materials the colony has come across, or needs, so the HUD shows only those. Once seen,
// a material stays shown. Meat shows as soon as you have fighters (they eat it), even before any is caught.
const SEEN_RULES = {
  protein: (s, c) => c.protein > 0 || s.ants.some(a => !a.team && a.state !== 'dead' && CASTES[a.caste].fight >= 3),
  grit: (s, c) => c.grit > 0,
  sugar: (s, c) => c.sugarTotal > 0,
  chitin: (s, c) => c.chitinTotal > 0,
  wood: (s, c) => !!(c.found && c.found.wood) || c.wood > 0,
  glow: (s, c) => c.glowTotal > 0,
};
export function tickSeen(s){ const c = s.colony, m = c.seenRes || (c.seenRes = {}); for (const k in SEEN_RULES) if (!m[k] && SEEN_RULES[k](s, c)) m[k] = true; }
export const resSeen = (s, k) => !!(s.colony.seenRes || {})[k];
export function tickGoals(s, dt){
  s.goalT = (s.goalT || 0) + dt; if (s.goalT < 1 || !s.queen.placed) return; s.goalT = 0;
  const c = s.colony, G = c.goals;
  for (let pass = 0; pass < 3; pass++){
    let any = false;
    for (const g of goalBoard(s)){ if (!g || g.n(s) < g.of) continue;
      G.done[g.key] = true; any = true; gainGenes(s, TIERS[g.tier].genes, 'goal done: ' + g.text.toLowerCase()); s.events.push('goal');
      const set = SETS[g.set]; if (!G.sets[g.set] && GOALS.filter(x => x.set === g.set).every(x => G.done[x.key])){ G.sets[g.set] = true; s.player.msg = `${set.name} goals all done! For good: ${set.reward.toLowerCase()}.`; } }
    if (!any) break;
  }
}
const FOUND_NAME = { dew: 'dew', puddle: 'puddle water', pebble: 'a pebble', spider: 'spider meat', cat: 'caterpillar meat', ladybug: 'a ladybug', alate: 'a winged queen', boss: 'boss meat', earwig: 'earwig meat', cricket: 'cricket meat', millipede: 'millipede meat', dirt: null };
export function discover(s, type){
  const c = s.colony; if (!type || c.found[type] || FOUND_NAME[type] === null) return; c.found[type] = true;
  const nm = FOUND_NAME[type] || (FOODS[type] ? FOODS[type].name : type); gainGenes(s, 1, 'first ' + nm + ' brought home');
}
