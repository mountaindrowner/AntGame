// Build 17: running the colony. Jobs ranked per ant type, idle ants that
// find work, more than one of each room (capped, dearer, with upkeep), and a
// spider that keeps its body off the rocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.critters = []; s.bugT = -1e9;
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
// n ants of a kind, resting inside, ready to choose.
function hatchN(s, caste, n) {
  const out = [];
  for (let i = 0; i < n; i++) { SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; Object.assign(a, { caste, state: 'in', rest: 0, goal: null, nx: SIM.SHAFT + 0.5, ny: 0.5, ntx: SIM.SHAFT, nty: 0, carry: 0 }); out.push(a); }
  return out;
}

test('each kind has its duties in order, and you can reorder or switch them off', () => {
  const s = founded();
  assert.deepEqual(SIM.jobsOf(s, 'forager').map((j) => j[0]), ['food', 'water', 'stone', 'wood', 'hunt']);
  assert.equal(SIM.jobsOf(s, 'soldier')[0][0], 'guard');
  SIM.setJobFirst(s, 'forager', 'stone');
  assert.deepEqual(SIM.jobsOf(s, 'forager').map((j) => j[0]), ['stone', 'food', 'water', 'wood', 'hunt']);
  SIM.toggleJob(s, 'forager', 'water');
  assert.equal(SIM.jobsOf(s, 'forager').find((j) => j[0] === 'water')[1], 0);
  // Kept across a save.
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(SIM.jobsOf(s2, 'forager')[0][0], 'stone');
});

test('foragers put on stone go out for stone, and bring it home', () => {
  const s = founded(), c = s.colony;
  c.grit = 0; c.store = 5;
  for (const k of ['food', 'water', 'hunt']) SIM.toggleJob(s, 'forager', k);
  const ants = hatchN(s, 'forager', 8);
  step(s, 4);
  const out = ants.filter((a) => a.state === 'explore');
  assert.ok(out.length >= 3, `${out.length} went out`);
  assert.ok(out.every((a) => a.duty === 'stone'), 'all on stone');
  const g0 = c.grit; step(s, 120);
  assert.ok(c.grit > g0, `stone came home: ${c.grit}`);
});

test('with food short, foragers gather food first; with it full, they help with water and stone', () => {
  const s = founded(), c = s.colony;
  c.store = 2; c.water = c.waterCap; c.grit = 99;
  const a = hatchN(s, 'forager', 10);
  step(s, 4);
  assert.ok(a.filter((x) => x.duty === 'food').length >= 4, 'food first');
  const s2 = founded(), c2 = s2.colony;
  c2.store = c2.cap; c2.water = 1; c2.grit = 0;
  const b = hatchN(s2, 'forager', 10);
  step(s2, 4);
  assert.ok(!b.some((x) => x.duty === 'food'), 'no one gathers food into a full store');
  assert.ok(b.some((x) => x.duty === 'water') && b.some((x) => x.duty === 'stone'), 'they help elsewhere');
});

test('soldiers keep a guard on the door and send the rest hunting', () => {
  const s = founded(), c = s.colony;
  c.protein = 0;
  // Prey within reach of home.
  const w = s.world; s.cat = { x: (w.ex + 25.5) * SIM.T, y: (w.ey + 0.5) * SIM.T, hp: 30, maxHp: 30, wander: 99, gx: (w.ex + 25.5) * SIM.T, gy: (w.ey + 0.5) * SIM.T };
  s.catRespawn = 1e9;
  const sol = hatchN(s, 'soldier', 6);
  for (let i = 0; i < 20 * 8; i++) { SIM.tick(s, 0.05); if (s.cat) { s.cat.wander = 99; } }
  const guard = sol.filter((a) => a.duty === 'guard').length, hunt = sol.filter((a) => a.duty === 'hunt').length;
  assert.ok(guard >= 2, `${guard} on guard`);
  assert.ok(hunt >= 1, `${hunt} hunting`);
});

test('nurses tend eggs while there are eggs, and help outside when there are none', () => {
  const s = founded(), c = s.colony;
  c.eggQueue.push('forager', 'forager', 'forager'); c.store = 3; c.water = 1;
  const n = hatchN(s, 'nurse', 4);
  step(s, 4);
  assert.ok(n.every((a) => a.state === 'in' || a.state === 'build'), 'they stay in with eggs');
  c.eggQueue.length = 0; c.eggs.length = 0;
  step(s, 8);
  assert.ok(n.some((a) => a.state !== 'in' && a.state !== 'build'), `no eggs: some go out to help (${n.map((a) => a.state)})`);
});

test('rooms: one of each per queen level, each extra dearer, and every room eats food', () => {
  const s = founded(), c = s.colony;
  assert.equal(SIM.roomCap(s), 1);
  const first = SIM.roomCost(s, 'hatchery').food;
  s.nest.rooms.push({ key: 'hatchery', x0: 2, y0: 5, w: 4, h: 3 });
  assert.match(SIM.roomLock(s, 'hatchery'), /upgrade the queen/);
  s.queen.level = 1;
  assert.equal(SIM.roomLock(s, 'hatchery'), '');
  assert.ok(SIM.roomCost(s, 'hatchery').food > first, 'the second costs more');
  // Upkeep: half a unit a minute for the first, one for the second.
  assert.equal(SIM.roomUpkeep(s), 0.5);
  s.nest.rooms.push({ key: 'hatchery', x0: 8, y0: 5, w: 4, h: 3 });
  assert.equal(SIM.roomUpkeep(s), 1.5);
});

test('a second hatchery, store and cistern add to the first', () => {
  const s = founded(), c = s.colony;
  s.queen.level = 1;
  let y = 1, x0 = 2; // (topsoil, so the depth bands of build 42 don't change the sums)
  const add = (key) => { c.buildQueue.push({ room: key, x0, y0: y, w: 4, h: 3, progress: 1e9, x: x0 + 1, y: y + 1 }); y += 4; if (y > 12) { y = 1; x0 += 6; } step(s, 0.1); };
  for (const key of ['hatchery', 'store', 'cistern']) add(key);
  const one = { hatch: c.hatchCap, cap: c.cap, water: c.waterCap };
  for (const key of ['hatchery', 'store', 'cistern']) add(key);
  assert.equal(c.hatchCap, one.hatch + 2);
  assert.equal(c.cap, Math.round(one.cap * 1.5));
  assert.equal(c.waterCap, one.water + 30);
  // Tearing one out takes its share away again.
  const r = s.nest.rooms.filter((x) => x.key === 'store')[1];
  SIM.removeRoom(s, r.x0, r.y0);
  assert.equal(c.cap, one.cap);
});

test('the spider keeps its body clear of rocks', () => {
  let tot = 0, over = 0;
  for (const seed of [3, 7]) {
    const s = SIM.create(seed), q = s.queen, W = SIM.W, T = SIM.T, w = s.world;
    SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
    for (let i = 0; i < 20 * 60 * 6; i++) {
      SIM.tick(s, 0.05); const sp = s.spider; if (!sp || sp.entering || sp.leaving) continue;
      tot++; const cx = sp.x / T, cy = sp.y / T; let hit = false;
      for (let dy = -2; dy <= 2 && !hit; dy++) for (let dx = -2; dx <= 2 && !hit; dx++) { if (dx * dx + dy * dy > 4) continue; const x = Math.floor(cx + dx), y = Math.floor(cy + dy); if (w.blocked[y * W + x]) hit = true; }
      if (hit) over++;
    }
  }
  assert.ok(over / tot < 0.01, `${(100 * over / tot).toFixed(1)}% of the time over a rock`);
});
