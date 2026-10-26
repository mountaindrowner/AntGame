// Playtest bot: plays Underfoot through the same actions the UI exposes
// (taps to walk, Pick up, Recruit/Release, queen sheet, build catalog, dig
// taps, Enter/Exit nest). Logs milestones and a per-minute summary.
//   node scripts/playtest.mjs <sensible|military|cheese|idle> <seed> <minutes> [saveFile]
// WHY=1 also groups deaths near the spider by ant state and distance from home.
import SIM from '../src/sim/sim.js';
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
  if (f.amt <= 0) return 0;
  if (f.kind === 'food') return c.store < c.cap - 3 ? 1 : 0;
  if (f.kind === 'water') return c.water < c.waterCap * 0.7 ? 1.4 : 0;
  if (f.kind === 'protein') return 1.6;
  if (f.kind === 'grit') { const up = SIM.QUEEN_UP[s.queen.level]; return c.grit < Math.max(20, up && up.grit || 0) ? 0.8 : 0; }
  return 0;
}
function spiderNear(x, y, r) { return s.spider && dist(s.spider.x, s.spider.y, x, y) < r * T; }

// ---------- surface play: forage by hand ----------
function playSurface() {
  const a = ant();
  if (a.carry) { home(); return; }
  if (P.hunger < 30) { home(); plan.target = null; return; }
  if (spiderNear(a.x, a.y, 5)) { home(); plan.target = null; return; }
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
    const d = dist(f.x, f.y, a.tx, a.ty) + dist(f.x, f.y, w.ex, w.ey) * 0.5;
    const score = d / k / (f.amt >= 30 ? 2 : 1);
    if (d < 22 && score < bd) { bd = score; best = f; }
  }
  plan.target = best;
  if (best) tapSurface((best.x + 0.5) * T, (best.y + 0.5) * T);
  else if (P.mark) P.mark = false;
}

// ---------- the nest: eggs, digs, rooms, upgrades ----------
const ORDER = {
  sensible: ['hatchery', 'store', 'cistern', 'workshop', 'nursery', 'barracks'],
  military: ['barracks', 'hatchery', 'store', 'cistern', 'workshop', 'nursery'],
  cheese: ['hatchery', 'store', 'cistern'],
  idle: ['hatchery', 'store'],
};
let pocket = null; // { key, x0, y0, w, h }
function roomPlan() {
  const keys = ORDER[strategy] || ORDER.sensible;
  const next = keys.find((k) => !SIM.roomOf(s, k) && !c.buildQueue.some((j) => j.room === k));
  if (!next) return;
  const R = SIM.ROOMS[next];
  // A fitting pocket already dug? Place it when affordable (Build → tap a green cell).
  for (let y = 1; y < 14; y++) for (let x = 1; x < NW - 1; x++) {
    const r = SIM.findRoomRect(s, x, y, R.w, R.h);
    if (r) {
      if (SIM.canPay(c, R.cost) && SIM.queueRoom(s, next, [x, y])) { note(`placed ${next}`); pocket = null; }
      return;
    }
  }
  if (!caste('builder')) return;
  if (!pocket || pocket.key !== next) pocket = choosePocket(next, R);
  if (!pocket) return;
  // Tap the pocket's cells as dig orders, nearest-to-tunnel first.
  for (let y = pocket.y0; y < pocket.y0 + pocket.h; y++) for (let x = pocket.x0; x < pocket.x0 + pocket.w; x++) {
    if (s.nest.digOrders.length >= 8) return;
    if (!s.nest.cells[y * NW + x] && !s.nest.digOrders.some((o) => o.x === x && o.y === y)) SIM.toggleDigOrder(s, x, y);
  }
}
function choosePocket(key, R) {
  const n = s.nest, q = s.queen.room;
  let best = null, bd = Infinity;
  for (let y0 = 1; y0 + R.h <= 14; y0++) for (let x0 = 1; x0 + R.w <= NW - 1; x0++) {
    let ok = true, touch = false;
    for (let y = y0 - 1; y <= y0 + R.h && ok; y++) for (let x = x0 - 1; x <= x0 + R.w; x++) {
      const inside = y >= y0 && y < y0 + R.h && x >= x0 && x < x0 + R.w;
      const v = n.cells[y * NW + x];
      if (inside && v) { ok = false; break; }
      if (!inside && v === 2) { ok = false; break; } // keep a wall between rooms
      if (!inside && v === 1 && (x >= x0 && x < x0 + R.w || y >= y0 && y < y0 + R.h)) touch = true;
    }
    if (!ok || !touch) continue;
    const d = Math.abs(x0 - q.x0) + Math.abs(y0 - q.y0) * 1.5;
    if (d < bd) { bd = d; best = { key, x0, y0, w: R.w, h: R.h }; }
  }
  if (!best) {
    // No pocket touches a tunnel yet: run a corridor along the chamber floor.
    const y = q.y0 + q.h - 1;
    for (let x = q.x0 + q.w; x < NW - 2 && s.nest.digOrders.length < 6; x++) if (!n.cells[y * NW + x]) SIM.toggleDigOrder(s, x, y);
    for (let x = q.x0 - 1; x > 1 && s.nest.digOrders.length < 10; x--) if (!n.cells[y * NW + x]) SIM.toggleDigOrder(s, x, y);
  }
  return best;
}
function eggs() {
  if (c.eggQueue.length >= 2) return;
  const n = SIM.antCount(s), cap = SIM.queenCap(s.queen.level);
  if (n + c.eggQueue.length + c.eggs.length >= cap) return;
  const f = caste('forager'), b = caste('builder'), nu = caste('nurse'), so = fighters();
  let want = null;
  if (strategy === 'idle') want = f < 6 ? 'forager' : b < 1 ? 'builder' : 'forager';
  else if (b < 1 && f >= 2) want = 'builder';
  else if (f < 4) want = 'forager';
  else if (b < Math.ceil(SIM.dugCount(s) / 40) + 1) want = 'builder';
  else if (SIM.roomOf(s, 'nursery') && nu < 1) want = 'nurse';
  else if (SIM.roomOf(s, 'barracks') && so < f * (strategy === 'military' ? 0.6 : 0.35) && c.protein >= 2) want = c.trophies.spider && c.protein >= 3 ? 'venom' : 'soldier';
  else want = 'forager';
  if (want && SIM.queueEgg(s, want)) note(`egg ${want}`);
}

// ---------- expeditions: caterpillar hunt, spider, siege ----------
let mission = null;
function missions() {
  const a = ant(); if (!a || P.inNest) return;
  const followers = mine().filter((o) => o.follow).length;
  if (mission === 'cat' && !s.cat) { SIM.release(s); mission = null; note('caterpillar hunt over'); return; }
  if (mission === 'siege' && (s.won || followers < 4)) { SIM.release(s); mission = null; note('siege ended' + (s.won ? ' (won)' : '')); return; }
  if (mission === 'cat') { tapSurface(s.cat.x, s.cat.y); return 'busy'; }
  if (mission === 'siege') { tapSurface((w.rx + 0.5) * T, (w.ry + 0.5) * T); return 'busy'; }
  const nearHome = dist(a.tx, a.ty, w.ex, w.ey) < 3;
  if (strategy === 'idle') return;
  // Hunt the caterpillar for protein when there is a crew to call.
  if (s.cat && c.protein < 10 && SIM.antCount(s) >= 10 && nearHome && !spiderNear(s.cat.x, s.cat.y, 6)) {
    const got = SIM.recruit(s, 10);
    if (got >= 6) { mission = 'cat'; note(`caterpillar hunt with ${got}`); return 'busy'; } SIM.release(s);
  }
  // Siege: cheese goes as soon as six will follow; others wait for an army.
  const ready = strategy === 'cheese' ? SIM.antCount(s) >= 8 : fighters() >= 8;
  if (s.rival.queenAlive && ready && nearHome) {
    const got = SIM.recruit(s, 14);
    if (got >= 6) { mission = 'siege'; note(`siege with ${got} (${fighters()} fighters)`); return 'busy'; } SIM.release(s);
  }
}

// ---------- main loop ----------
const minutes = +minArg;
let think = 0, nestThink = 0, lastPlayerAnt = null, playerDeaths = 0, minute = 0;
const deathsBefore = {};
for (let i = 0; i < minutes * 60 * 20; i++) {
  const before = new Map(s.ants.filter((a) => !a.team && a.state !== 'dead').map((a) => [a, [a.state, a.caste, a.follow, a.goal]]));
  const spBefore = s.spider ? { passing: s.spider.passing, x: s.spider.x, y: s.spider.y } : null;
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
      else if (missions() !== 'busy') playSurface();
    }
  }
  if ((nestThink += 0.05) >= 3) {
    nestThink = 0;
    eggs(); roomPlan();
    if (SIM.QUEEN_UP[s.queen.level] && SIM.antCount(s) >= SIM.queenCap(s.queen.level) - 3 && SIM.upgradeQueen(s)) note(`queen upgraded to ${s.queen.level}`);
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
  if (!c.queenAlive) { mile('LOST: queen dead'); }
  if (s.t >= (minute + 1) * 60) {
    minute++;
    if (minute % 5 === 0) {
      const st = SIM.stats(s);
      note(`[min ${minute}] ants ${SIM.antCount(s)}/${SIM.queenCap(s.queen.level)} ${JSON.stringify(st.byCaste)} food ${Math.round(c.store)}/${c.cap} water ${Math.round(c.water)}/${c.waterCap} prot ${c.protein} grit ${c.grit} rooms ${s.nest.rooms.length - 1} dug ${SIM.dugCount(s)} rival ${st.rival} income ${st.income} upkeep ${st.upkeep} deaths ${JSON.stringify(c.deaths)}`);
    }
  }
  if (s.won && strategy === 'cheese' && s.t > 60 * 3) break;
}
const out = { strategy, seed: +seedArg, minutes: Math.round(s.t / 60), miles: miles.map((m) => `${mm(m.t)} ${m.k}`), playerDeaths, deaths: c.deaths, kills: c.kills, starve: c.starve, raids: msgs.filter((m) => /marching/.test(m)).length, caveins: msgs.filter((m) => /caved/.test(m)).length };
console.log(JSON.stringify(out, null, 1));
console.log(log.filter((l) => /\[min|placed|upgraded|hunt|siege|died/.test(l)).join('\n'));
const uniq = [...new Set(msgs.map((m) => m.slice(m.indexOf(' ') + 1)))];
console.log('--- distinct messages:', uniq.length); console.log(uniq.slice(0, 40).join('\n'));
if (process.env.WHY) { const g = {}; for (const d of whyLog) { const k = d.st + ' home~' + Math.min(20, Math.floor(d.home / 5) * 5) + (d.passing ? ' passing' : ''); g[k] = (g[k] || 0) + 1; } console.log(g); }
if (saveFile) fs.writeFileSync(saveFile, SIM.serialize(s));
