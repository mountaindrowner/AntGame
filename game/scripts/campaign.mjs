// Campaign bot (build 80): the playtest bot (scripts/playtest.mjs), playing on for the whole yard. As well as
// foraging, laying, building, evolving and raiding rivals, it explores toward each zone's guardian, hunts the
// spider and the bosses with its biggest crew, and records the colony's numbers every minute (OUT=file.json).
// No graphics: the sim alone, by the numbers.
//   OUT=run.json node scripts/campaign.mjs <sensible|military> <seed> <minutes>
// WHY=1 also groups deaths near the spider by ant state and distance from home.
import SIM from '../src/sim/sim.js';
import { EVO_BY } from '../src/sim/growth.js';
import fs from 'node:fs';

const [strategy = 'sensible', seedArg = '7', minArg = '45', saveFile] = process.argv.slice(2);
const T = SIM.T, NW = SIM.NW;
const s = SIM.create(+seedArg);
const w = s.world, c = s.colony, P = s.player;
const log = [], miles = [], whyLog = [];
const mm = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const mile = (k, extra = '') => { if (!miles.some((m) => m.k === k)) miles.push({ k, t: s.t, extra }); };
const note = (m) => log.push(`${mm(s.t)} ${m}`);
let lastMsg = '';
const msgs = [];

// ---------- the opening, exactly as the intro asks ----------
SIM.queenDig(s, s.queen.x, s.queen.y + 1);
SIM.queenDig(s, s.queen.x, s.queen.y + 1);
SIM.buildNest(s);
s.seen.intro = 'done';

// ---------- helpers ----------
const mine = () => s.ants.filter((a) => !a.team && a.state !== 'dead');
const caste = (k) => mine().filter((a) => a.caste === k).length;
const fighters = () => mine().filter((a) => SIM.CASTES[a.caste].fight >= 3).length;
const ant = () => P.ant;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const tapSurface = (x, y) => { P.tx = x; P.ty = y; P.holding = false; };
const home = () => tapSurface((w.ex + 0.5) * T, (w.ey + 0.5) * T);
let plan = { phase: 'out', target: null, since: 0, lastPick: 0 };

function wantItem(f) {
  if (f.amt <= 0 || f.carried || (SIM.FOODS[f.type] && SIM.FOODS[f.type].crew)) return 0;
  if (f.kind === 'food') return c.store < c.cap - 3 ? (c.store < 6 ? 2 : 1) : 0; // (build 80: food first when eggs can't be paid: a lone ant fetching meat never rebuilt)
  if (f.kind === 'water') return c.water < c.waterCap * 0.7 ? 1.4 : 0;
  if (f.kind === 'protein') return 1.6;
  if (f.kind === 'grit') { const up = SIM.QUEEN_UP[s.queen.level]; return c.grit < Math.max(20, up && up.grit || 0) ? 0.8 : 0; }
  return 0;
}
function spiderNear(x, y, r) { return s.spider && dist(s.spider.x, s.spider.y, x, y) < r * T; }

// ---------- surface play: forage by hand ----------
function playSurface() {
  const a = ant();
  // Build 13: stay by an outpost being raised; raise one when out far with stone to spare.
  const building = s.outposts.find((o) => !o.done && dist(o.x, o.y, a.tx, a.ty) < 2.5);
  if (building && !a.carry && P.hunger > 35 && !spiderNear(a.x, a.y, 6)) { P.tx = null; return; }
  if (!process.env.NOOUT && !a.carry && strategy !== 'cheese' && c.grit >= 10 + ((SIM.QUEEN_UP[s.queen.level] || {}).grit || 0) && !SIM.outpostLock(s) && dist(a.tx, a.ty, w.ex, w.ey) > 25) { if (SIM.placeOutpost(s)) { note(`outpost at ${SIM.AREAS[SIM.areaOf(s, a.tx, a.ty)].key}`); return; } }
  if (a.carry) { home(); return; }
  if (P.hunger < 30) { home(); plan.target = null; return; }
  if (spiderNear(a.x, a.y, 5)) { home(); plan.target = null; return; }
  // Out of the Lawn when the mower starts.
  const mowing = s.mower.state !== 'idle', inLawn = (x, y) => x >= 40 && x < 80 && y >= 78;
  if (mowing && inLawn(a.tx, a.ty)) { home(); plan.target = null; return; }
  const t = plan.target;
  if (t && t.amt > 0 && !spiderNear((t.x + 0.5) * T, (t.y + 0.5) * T, 4)) {
    if (a.tx === t.x && a.ty === t.y) { SIM.doAction(s); plan.target = null; return; }
    tapSurface((t.x + 0.5) * T, (t.y + 0.5) * T);
    return;
  }
  // Pick the best item within about a screen and a half.
  let best = null, bd = Infinity;
  for (const f of s.items) {
    const k = wantItem(f); if (!k) continue;
    if (spiderNear((f.x + 0.5) * T, (f.y + 0.5) * T, 4)) continue;
    if (mowing && inLawn(f.x, f.y)) continue;
    const d = dist(f.x, f.y, a.tx, a.ty) + dist(f.x, f.y, w.ex, w.ey) * 0.5;
    const score = d / k / (f.amt >= 30 ? 2 : 1);
    if (d < 50 && score < bd) { bd = score; best = f; }
  }
  plan.target = best;
  if (best) tapSurface((best.x + 0.5) * T, (best.y + 0.5) * T);
  else if (P.mark) P.mark = false;
}

// ---------- the nest: eggs, digs, rooms, upgrades ----------
const ORDER = {
  // Build 25.1: the evolved rooms come after the basics, as each unlocks.
  sensible: ['hatchery', 'store', 'barracks', 'cistern', 'workshop', 'nursery', 'infirmary', 'granary', 'fungus', 'dairy', 'midden', 'honeypot'],
  military: ['store', 'barracks', 'hatchery', 'cistern', 'workshop', 'nursery', 'infirmary', 'midden', 'granary', 'fungus', 'dairy', 'honeypot'],
  cheese: ['hatchery', 'store', 'cistern'],
  idle: ['hatchery', 'store'],
};
// Build 74: rooms go in closed chambers, placed as plans the builders dig out (Build → place the ghost).
let planT = -99;
function roomPlan() {
  const keys = SMART ? SMART_ROOMS : ORDER[strategy] || ORDER.sensible;
  // A room costing more food than the store can hold has to wait for a Food store. (SMART: a key listed twice wants
  // two of that room: more Food stores lift the food cap the queen's later levels need.)
  const seenK = {};
  const next = keys.find((k) => { seenK[k] = (seenK[k] || 0) + 1; return SIM.roomCount(s, k) < seenK[k] && !SIM.roomLock(s, k) && (!SIM.ROOMS[k].evo || established() || SMART) && !c.buildQueue.some((j) => j.room === k) && (SIM.ROOMS[k].cost.food || 0) <= c.cap; });
  if (!next || !caste('builder') || c.buildQueue.length || s.t - planT < 10) return;
  const R = SIM.ROOMS[next];
  if (!SIM.canPay(c, SIM.roomCost(s, next))) return;
  planT = s.t;
  const q = s.queen.room; let best = null, bd = Infinity;
  for (let y0 = 1; y0 + R.h <= SIM.SOIL_TOP[1]; y0++) for (let x0 = 1; x0 + R.w <= NW - 1; x0++) {
    const p = SIM.roomPlan(s, next, x0, y0); if (!p.ok) continue;
    const d = p.dig.length * 2 + Math.abs(x0 - q.x0) + Math.abs(y0 - q.y0) * 1.5;
    if (d < bd) { bd = d; best = p; }
  }
  if (best) { if (SIM.queueRoom(s, next, null, [best.x0, best.y0])) note(`placed ${next}`); return; }
  // Nowhere beside a tunnel: run a corridor along the chamber floor.
  const y = q.y0 + q.h - 1, n = s.nest;
  for (let x = q.x0 + q.w; x < NW - 2 && n.digOrders.length < 6; x++) if (!n.cells[y * NW + x]) SIM.toggleDigOrder(s, x, y);
  for (let x = q.x0 - 1; x > 1 && n.digOrders.length < 10; x--) if (!n.cells[y * NW + x]) SIM.toggleDigOrder(s, x, y);
}
// Build 25.1: two of each evolved room's ant once its room stands, and majors as a quarter of the army.
const EXTRA = ['medic', 'harvester', 'gardener', 'rancher', 'undertaker', 'replete', 'major'];
function eggs() {
  if (c.eggQueue.length >= 2) return;
  const n = SIM.antCount(s), cap = SIM.queenCap(s.queen.level);
  if (n + c.eggQueue.length + c.eggs.length >= cap) return;
  // Save up for the foragers' training once there are hands to spare.
  const fu = SIM.FORAGE[(c.forage || 0) + 1];
  if (fu && strategy !== 'idle' && n >= 12 && !SIM.canPay(c, fu.cost) && (fu.cost.food || 0) <= c.cap && (fu.cost.grit || 0) <= c.grit) return; // (build 43: not when stone is what's short: that stalled colonies for half an hour)
  const f = caste('forager'), b = caste('builder'), nu = caste('nurse'), so = fighters();
  let want = null;
  if (strategy === 'idle') want = f < 6 ? 'forager' : b < 1 ? 'builder' : 'forager';
  else if (b < 1 && f >= 2) want = 'builder';
  else if (f < 4) want = 'forager';
  else if (b < Math.ceil(SIM.dugCount(s) / 40) + 1) want = 'builder';
  else if (SIM.roomOf(s, 'nursery') && nu < 1) want = 'nurse';
  else if (SIM.roomOf(s, 'barracks') && so < Math.min(f * (strategy === 'military' ? 0.8 : 0.6), 3 + Math.floor(s.t / 120)) && c.protein >= 2) want = c.trophies.spider && c.protein >= 3 ? 'venom' : 'soldier';
  else want = (established() && f >= 15 && EXTRA.find((k) => !SIM.eggLock(s, k) && caste(k) < (k === 'major' ? Math.floor(fighters() / 4) : 2))) || 'forager';
  if (want && SIM.queueEgg(s, want)) note(`egg ${want}`);
}

// ---------- growth (build 12): evolution nodes and ant upgrades ----------
// A rough order of what a player would want; each bought when affordable,
// keeping some food back for eggs.
// A colony that can afford luxuries: 30 ants and a store over a third full, or the Patio taken.
const established = () => (SIM.antCount(s) >= 30 && c.store > c.cap * 0.35) || s.won;
const LATE = ['infirmary', 'granary', 'aphids', 'fungus', 'mealybugs', 'midden', 'majors', 'honeypot'];
const EVO_WANT = { sensible: ['waypoints', 'hatchery2', 'scent', 'trailrunners', 'insulation', 'division', 'store2', 'mandibles', 'crews', 'hatchery3', 'drillhall', 'formic', 'stridulation', 'crews2', 'store3', 'memory'],
  military: ['waypoints', 'mandibles', 'drillhall', 'division', 'formic', 'stridulation', 'hatchery2', 'trailrunners', 'scent', 'insulation', 'store2', 'crews', 'hatchery3', 'crews2', 'memory'] };
const PICKS = { forager: ['trailblazer', 'pathfinder'], builder: ['shorer', 'engineer'], soldier: ['doorkeeper'], venom: ['paralytic'], nurse: ['wetnurse'] };
function grow() {
  // Spend on growth only with food to spare: a full store, or no room for more ants.
  // The queen's next level comes first when the colony is near her cap.
  const qu = SIM.QUEEN_UP[s.queen.level];
  if (qu && !qu.sugar && SIM.antCount(s) >= SIM.queenCap(s.queen.level) - 3) return;
  const spare = c.cap >= 150 && c.store > c.cap * 0.6;
  // Build 46: a winged queen ready: found the War Camp at the first outpost far enough away.
  if (SIM.flightReady(s)) for (let i = 0; i < s.outposts.length; i++) if (!SIM.daughterLock(s, i, 'war') && SIM.foundDaughter(s, i, 'war')) { note('nuptial flight: founding the War Camp'); mile('first daughter'); break; }
  // Build 42: break into new ground, side sections first, with food to spare and a builder or two.
  if (spare && !s.nest.breach && s.ants.some((a) => a.caste === 'builder' && !a.team)) {
    for (const S of SIM.NEST_SECTIONS) { if (SIM.sectionLock(s, S.key) || !SIM.canPay(c, S.cost) || c.store - (S.cost.food || 0) < c.cap * 0.3) continue; if (SIM.startBreach(s, S.key)) { note(`breaking into ${S.name}`); mile('first new ground'); } break; }
  }
  const order = EVO_WANT[strategy] || EVO_WANT.sensible;
  for (const k of order) {
    if (SIM.evoLock(s, k) || (process.env.SKIP || '').split(',').includes(k)) continue;
    if (k === 'waypoints' && s.queen.level < 1) continue; // stone goes to the queen first
    if (!spare && (EVO_BY[k].cost.food || 0) > 0) break; // food nodes wait for spare food
    if (SIM.buyEvo(s, k)) { note(`evolved ${k} (🧬${c.genes} left)`); mile('first evolution'); }
    break;
  }
  // Build 25.1: an established colony also spends on the late nodes, skipping what it can't pay for yet.
  if (established()) for (const k of LATE) {
    if (SIM.evoLock(s, k) || (!spare && (EVO_BY[k].cost.food || 0) > 0)) continue;
    if (SIM.buyEvo(s, k)) { note(`evolved ${k} (🧬${c.genes} left)`); break; }
  }
  if (!spare) return;
  for (const k of ['builder', 'nurse', 'soldier', 'venom']) {
    const lvl = SIM.casteLevel(s, k); if (lvl >= 3 || SIM.upgradeLock(s, k)) continue;
    const pick = (PICKS[k] || [])[lvl - 1];
    if (SIM.upgradeCaste(s, k, pick)) note(`upgraded ${k} to ${lvl + 1}${pick ? ' (' + pick + ')' : ''}`);
  }
  for (const k of ORDER[strategy] || ORDER.sensible) if (SIM.ROOMS[k].lv && !SIM.roomUpLock(s, k) && SIM.upgradeRoom(s, k)) note(`upgraded room ${k} to ${SIM.roomLevel(s, k)}`);
  if (s.queen.level >= 3) SIM.pickQueenTrait(s, 3, strategy === 'military' ? 'hardy' : 'fertile');
}

// ---------- expeditions: caterpillar hunt, spider, siege ----------
let mission = null, treat = null, target = null, raided = false;
function missions() {
  const a = ant(); if (!a || P.inNest) return;
  const followers = mine().filter((o) => o.follow).length;
  if (mission === 'cat' && !s.cat) { SIM.release(s); mission = null; note('caterpillar hunt over'); return; }
  if (mission === 'siege' && !s.myRaid && (!target || !target.queenAlive || followers < 4 || raided)) { SIM.release(s); mission = null; raided = false; note('siege on ' + target.key + (target.queenAlive ? ' called off' : ' won')); return; }
  if (mission === 'treat') {
    const t = treat;
    if (!t || t.amt <= 0) { SIM.release(s); mission = null; note('treat ' + (P.big ? 'lost' : 'done')); treat = null; return; }
    if (P.big) { home(); return 'busy'; }
    if (followers < SIM.FOODS[t.type].crew - 1) { SIM.release(s); mission = null; treat = null; note('treat crew too small'); return; }
    if (a.tx === t.x && a.ty === t.y) { SIM.doAction(s); if (P.big) note(`lifted ${t.type} with crew ${SIM.crewAt(s)}`); return 'busy'; }
    tapSurface((t.x + 0.5) * T, (t.y + 0.5) * T); return 'busy';
  }
  // Build 26: point the crew at the caterpillar, and at defenders by a rival door.
  if (mission === 'cat') { if (!P.attack) SIM.crewAttack(s, s.cat.x, s.cat.y); tapSurface(s.cat.x, s.cat.y); return 'busy'; }
  // Build 28: at their door, raid for the queen; while it runs, wait by the door.
  if (mission === 'siege' && s.myRaid) { if (s.myRaid.phase === 'inside') raided = true; tapSurface((target.ex + 0.5) * T, (target.ey + 3.5) * T); return 'busy'; }
  if (mission === 'siege' && target && SIM.raidTarget(s) === target && !SIM.raidLock(s, 'queen')) { if (SIM.startRaid(s, 'queen')) { note(`raid on ${target.key} (crew ${SIM.crewSize(s)})`); return 'busy'; } }
  if (mission === 'siege' && !P.attack && target) { const d = s.ants.find((o) => o.team === target.team && o.state !== 'dead' && o.state !== 'in' && dist(o.x, o.y, a.x, a.y) < 6 * T); if (d && SIM.crewAttack(s, d.x, d.y)) note('crew attack on a ' + target.key + ' ant'); }
  if (mission === 'siege') { tapSurface((target.ex + 0.5) * T, (target.ey + 0.5) * T); return 'busy'; }
  const nearHome = dist(a.tx, a.ty, w.ex, w.ey) < 3;
  if (strategy === 'idle') return;
  // A treat worth hauling: gather a crew at the nest and go get it.
  const tr = s.items.find((f) => f.amt > 0 && SIM.FOODS[f.type] && SIM.FOODS[f.type].crew && !f.carried);
  if (tr && nearHome && c.cap - c.store >= 25 && !spiderNear((tr.x + 0.5) * T, (tr.y + 0.5) * T, 6)) {
    const need = SIM.FOODS[tr.type].crew, got = SIM.recruit(s, need + 2);
    if (got >= need - 1) { mission = 'treat'; treat = tr; note(`treat run: ${tr.type} with ${got}`); return 'busy'; } SIM.release(s);
  }
  // Hunt the caterpillar for protein when there is a crew to call.
  if (s.cat && c.protein < 10 && SIM.antCount(s) >= 10 && nearHome && !spiderNear(s.cat.x, s.cat.y, 6)) {
    const got = SIM.recruit(s, 10);
    if (got >= 6) { mission = 'cat'; note(`caterpillar hunt with ${got}`); return 'busy'; } SIM.release(s);
  }
  // Siege: cheese goes as soon as six will follow; others wait for an army.
  const ready = strategy === 'cheese' ? SIM.antCount(s) >= 8 : fighters() >= 10;
  // Build 25.1: the next awake colony, in the order they arrive. Later ones want a bigger army.
  const foe = s.rivals.find((r) => !r.asleep && r.queenAlive);
  const big = foe && foe.team > 1 ? fighters() >= 10 + 4 * foe.team : true;
  if (foe && ready && big && nearHome) {
    const got = SIM.recruit(s, SIM.crewCap ? SIM.crewCap(s) : 20);
    if (got >= 6) { mission = 'siege'; target = foe; note(`siege on ${foe.key} with ${got} (${fighters()} fighters)`); return 'busy'; } SIM.release(s);
  }
}

// ---------- SMART=1: a competent player's habits (build 80) ----------
// It rings Defend when the nest is attacked, builds more Food stores (the queen's later levels cost more food than
// one store holds) and the Egg larder (meat at home), spends genes on a sensible list whenever it can pay and keep
// 30 food back, and upgrades the queen whenever it can pay.
const SMART = !!process.env.SMART;
const SMART_ROOMS = ['hatchery', 'store', 'barracks', 'cistern', 'workshop', 'larder', 'nursery', 'store', 'infirmary', 'store', 'granary', 'midden', 'honeypot', 'fungus', 'dairy'];
const SMART_EVOS = ['waypoints', 'hatchery2', 'trophic', 'scent', 'store2', 'insulation', 'mandibles', 'crews', 'drillhall', 'formic', 'division', 'trailrunners', 'hatchery3', 'stridulation', 'infirmary', 'granary', 'crews2', 'store3', 'memory', 'midden', 'majors', 'honeypot', 'cuticle', 'brood'];
let defT = 0;
function smart() {
  if (!SMART) return;
  if (SIM.underAttack(s) && s.t - defT > 4.5 && SIM.callDefend(s)) { defT = s.t; mile('rang Defend'); }
  for (const k of SMART_EVOS) { if (!EVO_BY[k] || SIM.evoLock(s, k)) continue; const f = EVO_BY[k].cost.food || 0; if (c.store - f < 30 && f > 0) continue; if (SIM.buyEvo(s, k)) { note(`evolved ${k} (smart)`); break; } }
  if (SIM.QUEEN_UP[s.queen.level] && SIM.upgradeQueen(s)) note(`queen upgraded to ${s.queen.level} (smart)`);
}

// ---------- the campaign: the zones' guardians ----------
const BOSS_ORDER = ['hornworm', 'beetle', 'antlion', 'robin', 'toad', 'mantis', 'widow', 'centipede'];
let hunt = null, huntCool = 0, explore = null;
const regionCentre = (key) => { const i = SIM.REGION[key]; if (i == null) return null; const b = SIM.areaBounds(i); return { x: (b.x0 + b.x1 + 1) / 2 * T, y: (b.y0 + b.y1 + 1) / 2 * T, i }; };
function campaign() {
  const a = ant(); if (!a || P.inNest || strategy === 'idle') return;
  const followers = mine().filter((o) => o.follow).length;
  if (hunt) {
    const b = hunt.k === 'spider' ? s.spider : s.bosses[hunt.k];
    const won = hunt.k === 'spider' ? (c.kills.spider || 0) > hunt.kills0 : (c.kills[hunt.k] || 0) >= 1 || (b && b.dead);
    if (won) { note(`killed ${hunt.k}`); mile('killed ' + hunt.k); SIM.release(s); hunt = null; huntCool = s.t + 60; return; }
    if (followers < 5 || s.t - hunt.t0 > 600 || P.hunger < 25) { note(`hunt on ${hunt.k} broke off (${followers} left, ${Math.round(s.t - hunt.t0)} s)`); SIM.release(s); hunt = null; huntCool = s.t + 240; home(); return; }
    if (!b) { const R = regionCentre(SIM.BOSSES[hunt.k] ? SIM.BOSSES[hunt.k].region : 'flowerbed'); if (R) tapSurface(R.x, R.y); return 'busy'; } // still to find it: go to its ground
    const d = dist(a.x, a.y, b.x, b.y);
    if (d < 26 * T && !P.attack) SIM.crewAttack(s, b.x, b.y);
    // You keep a little way off (your crew does the fighting), but close enough to lead it.
    if (d > 10 * T) tapSurface(b.x, b.y); else { const k = 9 * T / Math.max(1, d); tapSurface(b.x + (a.x - b.x) * k, b.y + (a.y - b.y) * k); }
    return 'busy';
  }
  if (mission) return; // a treat run, caterpillar hunt or siege is under way
  if (s.t < huntCool) return;
  const nearHome = dist(a.tx, a.ty, w.ex, w.ey) < 3;
  // The next guardian: the spider first, then the bosses in order. Its ground found first.
  const f = fighters(), cap = SIM.crewCap ? SIM.crewCap(s) : 20;
  let next = null;
  if (!(c.kills.spider || 0) && s.spider && f >= 12) next = { k: 'spider', need: 12 };
  else for (const [i, k] of BOSS_ORDER.entries()) { if ((c.kills[k] || 0) >= 1) continue; next = { k, need: 14 + 3 * i }; break; }
  if (!next) return;
  const B = SIM.BOSSES[next.k];
  if (B && !s.bosses[next.k]) { // scout its ground so it shows itself (alone, when fed)
    const R = regionCentre(B.region); if (!R || P.hunger < 60 || a.carry) return;
    if (!explore || explore.k !== next.k) { explore = { k: next.k, t0: s.t }; note(`scouting ${B.region} for ${next.k}`); }
    if (s.t - explore.t0 > 240) { explore = null; huntCool = s.t + 120; home(); return; }
    tapSurface(R.x, R.y); return 'busy';
  }
  explore = null;
  if (f < next.need || !nearHome) return;
  const got = SIM.recruit(s, cap);
  if (got >= Math.min(next.need, 10)) { hunt = { k: next.k, t0: s.t, kills0: c.kills.spider || 0 }; note(`hunt on ${next.k} with ${got} (${f} fighters)`); mile('first hunt: ' + next.k); return 'busy'; }
  SIM.release(s);
}

// ---------- the numbers, every minute ----------
const series = [];
function record() {
  const st = SIM.stats(s), d = c.deaths || {}, dt = Object.values(d).reduce((x, y) => x + y, 0);
  series.push({ min: Math.round(s.t / 60), ants: SIM.antCount(s), cap: SIM.queenCap(s.queen.level), castes: st.byCaste, fighters: fighters(),
    food: Math.round(c.store), foodCap: c.cap, water: Math.round(c.water), protein: Math.round(c.protein), grit: Math.round(c.grit), sugar: Math.round(c.sugar || 0), chitin: Math.round(c.chitin || 0), wood: Math.round(c.wood || 0), glow: c.glow || 0,
    genes: c.genes, genesTotal: c.genesTotal || 0, evos: Object.keys(c.evo || {}).filter((k) => c.evo[k]).length, rooms: s.nest.rooms.length - 1, queen: s.queen.level + 1, queenHp: Math.round(s.queen.hp),
    outposts: s.outposts.filter((o) => o.done).length, held: Object.keys(c.held || {}).length, zones: Object.keys(c.zones || {}).length, kills: { ...c.kills }, rivalsBeaten: s.rivals.filter((r) => !r.queenAlive).length, rivalsAwake: s.rivals.filter((r) => !r.asleep && r.queenAlive).length,
    deaths: dt, deathsBy: { ...d }, playerDeaths, daughters: (s.daughters || []).length, dug: SIM.dugCount(s), starving: c.starve > 0 });
}

// ---------- main loop ----------
const minutes = +minArg;
let qmin = 100, think = 0, nestThink = 0, lastPlayerAnt = null, playerDeaths = 0, minute = 0;
for (let i = 0; i < minutes * 60 * 20; i++) {
  const before = new Map(s.ants.filter((a) => !a.team && a.state !== 'dead').map((a) => [a, [a.state, a.caste, a.follow, a.goal]]));
  const spBefore = s.spider ? { passing: s.spider.passing, x: s.spider.x, y: s.spider.y } : null;
  if (process.env.NODAY) s.dayT = 100; // (A/B: always day)
  SIM.tick(s, 0.05);
  if (process.env.WHY && spBefore) for (const [a, st] of before) if (a.state === 'dead' && Math.hypot(a.x - spBefore.x, a.y - spBefore.y) < 2 * T) whyLog.push({ st: st.join('/'), home: Math.round(Math.hypot(a.x / T - w.ex, a.y / T - w.ey)), passing: !!spBefore.passing, t: Math.round(s.t) });
  if (P.msg && P.msg !== lastMsg) { msgs.push(`${mm(s.t)} ${P.msg}`); lastMsg = P.msg; }
  P.msg = ''; lastMsg = '';
  const a = ant();
  if (a !== lastPlayerAnt) { if (lastPlayerAnt && !a) { playerDeaths++; note('player ant died'); } lastPlayerAnt = a; }
  if ((think += 0.05) >= 0.5) {
    think = 0;
    if (a) {
      if (P.inNest) { if (!P.exiting) { P.ntx = SIM.SHAFT; P.nty = 0; P.exiting = true; } }
      else if (strategy === 'idle') { if (!a.carry) home(); }
      else if (campaign() !== 'busy' && missions() !== 'busy') playSurface();
    }
  }
  if ((nestThink += 0.05) >= 3) {
    nestThink = 0;
    eggs(); roomPlan(); smart();
    if (SIM.QUEEN_UP[s.queen.level] && SIM.antCount(s) >= SIM.queenCap(s.queen.level) - 3 && SIM.upgradeQueen(s)) note(`queen upgraded to ${s.queen.level}`);
    const fu = SIM.FORAGE && SIM.FORAGE[(c.forage || 0) + 1];
    if (fu && strategy !== 'idle' && SIM.upgradeForage(s)) note(`foragers trained to ${c.forage}`);
    if (strategy !== 'idle' && !process.env.NOGROW) grow();
  }
  // Milestones.
  const del = c.delivered.reduce((x, y) => x + y, 0);
  if (del > 0) mile('first food delivered');
  for (const r of s.nest.rooms) if (r.key !== 'queen') mile('room ' + r.key);
  if (SIM.antCount(s) >= 10) mile('10 ants'); if (SIM.antCount(s) >= 20) mile('20 ants'); if (SIM.antCount(s) >= 40) mile('40 ants'); if (SIM.antCount(s) >= 60) mile('60 ants');
  if (fighters() > 0) mile('first soldier');
  if (c.kills.caterpillar) mile('caterpillar killed'); if (c.kills.spider) mile('spider killed');
  if (s.queen.level >= 1) mile('queen level 1'); if (s.queen.level >= 2) mile('queen level 2');
  if (s.won) mile('WON: rival queen dead');
  for (const r of s.rivals) { if (!r.asleep) mile('rival ' + r.key + ' arrived'); if (!r.queenAlive) mile('rival ' + r.key + ' beaten'); }
  for (const k of EXTRA) if (caste(k)) mile('first ' + k);
  if (s.lost) mile('LOST: queen killed by raiders');
  qmin = Math.min(qmin, s.queen.hp);
  if (s.queen.hp < 60) mile('queen below 60 hp');
  if (!c.queenAlive) { mile('LOST: queen dead'); }
  if (s.t >= (minute + 1) * 60) {
    minute++; record();
    if (minute % 5 === 0) {
      const st = SIM.stats(s);
      note(`[min ${minute}] ants ${SIM.antCount(s)}/${SIM.queenCap(s.queen.level)} ${JSON.stringify(st.byCaste)} food ${Math.round(c.store)}/${c.cap} water ${Math.round(c.water)}/${c.waterCap} prot ${Math.round(c.protein)} grit ${c.grit} out ${s.outposts.filter((o) => o.done).length} held ${Object.keys(c.held).length} goals ${Object.keys(c.goals.done).length} 🧬${c.genes}/${c.genesTotal} evo ${Object.keys(c.evo).length} vets ${mine().filter((a) => (a.xp || 0) >= 50).length} named ${c.named} queen ${Math.round(s.queen.hp)} rooms ${s.nest.rooms.length - 1} dug ${SIM.dugCount(s)} rival ${st.rival} income ${st.income} upkeep ${st.upkeep} deaths ${JSON.stringify(c.deaths)}`);
    }
  }
  // CAMPAIGN=1 plays on past the Patio, into the later colonies.
  if (s.lost && s.t > 60 * 3) break;
  if (s.phase1 && !process.env.ON) { mile('PHASE 1 DONE: the whole yard'); break; }
}
const out = { strategy, seed: +seedArg, minutes: Math.round(s.t / 60), queenMinHp: Math.round(qmin), lost: s.lost, won: s.won, miles: miles.map((m) => `${mm(m.t)} ${m.k}`), playerDeaths, deaths: c.deaths, kills: c.kills, starve: c.starve, raids: msgs.filter((m) => /Raid!/.test(m)).length, caveins: msgs.filter((m) => /caved/.test(m)).length };
console.log(JSON.stringify(out, null, 1));
console.log(log.filter((l) => /\[min|placed|upgraded|trained|evolved|outpost|hunt|siege|raid|died|treat|lifted/.test(l)).join('\n'));
const uniq = [...new Set(msgs.map((m) => m.slice(m.indexOf(' ') + 1)))];
console.log('--- distinct messages:', uniq.length); console.log(uniq.slice(0, 40).join('\n'));
if (process.env.WHY) { const g = {}; for (const d of whyLog) { const k = d.st + ' home~' + Math.min(20, Math.floor(d.home / 5) * 5) + (d.passing ? ' passing' : ''); g[k] = (g[k] || 0) + 1; } console.log(g); }
if (saveFile) fs.writeFileSync(saveFile, SIM.serialize(s));
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ strategy, seed: +seedArg, minutes: Math.round(s.t / 60), lost: s.lost, phase1: s.phase1 || null, miles: miles.map((m) => ({ t: Math.round(m.t), k: m.k })), log: log.filter((l) => !/\[min/.test(l)), series, evos: Object.keys(c.evo || {}).filter((k) => c.evo[k]), zones: c.zones || {}, kills: c.kills, deaths: c.deaths, final: series[series.length - 1] }));
