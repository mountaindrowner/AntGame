// Build 42: the nest twice as wide and deeper, opened a section at a time; depth bands; the bedrock;
// the 100-ant nest; alerts at limits; where genes come from.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9;
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const rich = (c) => Object.assign(c, { store: 300, cap: 2000, water: 200, waterCap: 300, protein: 200, grit: 300, sugar: 200, chitin: 50, wood: 100, genes: 50 });
const builders = (s, n) => { for (let i = 0; i < n; i++) { SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; Object.assign(a, { caste: 'builder', state: 'in', rest: 0, goal: null, nx: SIM.SHAFT + 0.5, ny: 0.5, ntx: SIM.SHAFT, nty: 0 }); } };
const cell = (s, x, y) => s.nest.cells[y * SIM.NW + x];

test('the nest is 48 wide and 64 deep; the colony starts in the open middle, the sides shut', () => {
  const s = founded();
  assert.equal(SIM.NW, 48); assert.equal(SIM.NH, 64); assert.equal(SIM.SHAFT, 24);
  assert.equal(s.queen.x, 24);
  assert.equal(SIM.cellLocked(s, 20, 5), false, 'the middle is open');
  assert.equal(SIM.cellLocked(s, 5, 5), true, 'the West Roots are shut');
  assert.equal(SIM.cellLocked(s, 20, 50), true, 'so is the deep');
  // A dig order into shut ground is refused, and says which section it is.
  s.nest.cells[5 * SIM.NW + 12] = 1; // a tunnel up against the west wall
  assert.match(SIM.toggleDigOrder(s, 11, 5), /^shut: break into the West Roots/);
});

test('breaking in: pay, builders chew through, the section opens with what was behind the wall', () => {
  const s = founded(), c = s.colony; c.store = 100; c.grit = 30; builders(s, 4);
  assert.ok(!SIM.startBreach(s, 'w3'), 'the hardpan needs a Workshop first');
  const before = c.store;
  assert.ok(SIM.startBreach(s, 'e1'), 'the East Roots: food and stone');
  assert.equal(c.store, before - 40); assert.equal(c.grit, 15);
  assert.equal(SIM.sectionLock(s, 'w1'), 'one break-in at a time');
  step(s, 5); assert.ok(s.nest.breach && s.nest.breach.progress > 0, 'the builders are at it');
  step(s, 120);
  assert.ok(s.nest.open.e1, 'open'); assert.equal(s.nest.breach, null);
  assert.equal(SIM.cellLocked(s, 40, 5), false);
  assert.match(s.banner.title, /Broke through/);
  assert.ok(c.store >= Math.min(c.cap, before - 40 + 60) - 15, 'the seed cache: +60 food (to the cap)');
});

test('the mole tunnel is dug for you; the deeper sections need curios found, and genes', () => {
  const s = founded(), c = s.colony; rich(c);
  SIM.openSection(s, 'w1');
  let dug = 0; for (let y = 1; y <= 10; y++) for (let x = 1; x <= 11; x++) if (cell(s, x, y)) dug++;
  assert.ok(dug >= 8, `an old mole run (${dug} cells)`);
  s.nest.rooms.push({ key: 'workshop', x0: 14, y0: 10, w: 5, h: 3 });
  assert.match(SIM.sectionLock(s, 'w3'), /curios/);
  c.curios = { 1: 'die', 2: 'coin' };
  assert.equal(SIM.sectionLock(s, 'w3'), '');
  s.queen.level = 2; c.curios = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f' };
  const g = c.genes; assert.ok(SIM.startBreach(s, 'd2')); assert.equal(c.genes, g - 3);
});

test('root aphids and a water seep pay out for good', () => {
  const s = founded(), c = s.colony; rich(c); c.water = 0;
  SIM.openSection(s, 'e2'); SIM.openSection(s, 'w4');
  const sug = c.sugar; step(s, 65);
  assert.ok(c.sugar >= sug + 1, 'a sugar a minute');
  assert.ok(c.water >= 3, `water from the seep (${c.water})`);
});

test('the bedrock is slow to dig and holds three prizes', () => {
  const s = founded(), c = s.colony; rich(c); s.queen.level = 2;
  s.nest.rooms.push({ key: 'workshop', x0: 14, y0: 10, w: 5, h: 3 });
  SIM.openSection(s, 'd1');
  for (let y = 48; y <= 61; y++) s.nest.cells[y * SIM.NW + 8] = 1; // a shaft down to just above the fossil
  assert.equal(SIM.toggleDigOrder(s, 8, 62), 'added');
  const o = s.nest.digOrders.find((d) => d.x === 8 && d.y === 62);
  assert.ok(o.need >= 200, `a block of bedrock is a lot of work (${o.need})`);
  o.progress = o.need; builders(s, 1); const g = c.genesTotal;
  step(s, 2);
  assert.ok(c.prizes && c.prizes.fossil, 'the fossil ant');
  assert.equal(c.genesTotal - g >= 5, true);
});

test('depth bands: a store in dry packed soil holds more, a cistern in cool clay too', () => {
  const s = founded(), c = s.colony;
  s.nest.rooms.push({ key: 'store', x0: 14, y0: 2, w: 5, h: 3 }); s.colony.buildQueue.length = 0; step(s, 1.2);
  const top = SIM.storeCap(s);
  s.nest.rooms.find((r) => r.key === 'store').y0 = 22; step(s, 1.2);
  assert.equal(SIM.storeCap(s), Math.round(top * 1.25));
  s.nest.rooms.push({ key: 'cistern', x0: 20, y0: 40, w: 4, h: 4 }); step(s, 1.2);
  assert.equal(SIM.waterCapOf ? SIM.waterCapOf(s) : c.waterCap, 90);
});

test('a nest holds 100 ants at most', () => {
  for (let lv = 0; lv <= 8; lv++) assert.ok(SIM.queenCap(lv) <= SIM.NEST_CAP);
  assert.equal(SIM.queenCap(4), 100);
});

test('a card at each limit: the food store full, the edge of your ground, genes waiting', () => {
  const s = founded(), c = s.colony; s.advice = [];
  c.store = c.cap; c.genes = 20; s.nest.cells[5 * SIM.NW + SIM.HOME_X0] = 1;
  step(s, 3);
  const keys = s.advice.map((a) => a.key);
  assert.ok(keys.includes('food'), 'store full'); assert.ok(keys.includes('genes'), 'genes'); assert.ok(keys.includes('edge'), 'the edge');
  s.advice.length = 0; step(s, 5);
  assert.ok(!s.advice.some((a) => a.key === 'food'), 'once, not every second');
});

test('where genes come from: found of about how many', () => {
  const s = founded(), G = SIM.genesFound(s);
  assert.ok(G.pool >= 350 && G.pool <= 500, `pool ${G.pool}`);
  assert.ok(G.rows.find((r) => r.name === 'Curios').of > 0);
});

test('a save from before build 42 moves into the middle of the bigger nest, rooms and ants with it', () => {
  const s = founded(); step(s, 10);
  const d = JSON.parse(SIM.serialize(s)), X = SIM.NEST_SHIFT, cells = [];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 24; x++) cells.push(d.nest.cells[y * SIM.NW + x + X]);
  const old = JSON.parse(JSON.stringify(d)); old.v = 12; old.nest.cells = cells; delete old.nest.open; delete old.nest.breach;
  for (const r of old.nest.rooms) r.x0 -= X; old.queen.x -= X; if (old.queen.room) old.queen.room.x0 -= X;
  for (const a of old.ants) if (!a.team) { a.nx -= X; a.ntx -= X; }
  const s2 = SIM.deserialize(JSON.stringify(old));
  assert.deepEqual(Array.from(s2.nest.cells), Array.from(s.nest.cells));
  assert.equal(s2.queen.x, s.queen.x);
  assert.deepEqual(s2.nest.rooms.map((r) => r.x0), s.nest.rooms.map((r) => r.x0));
  const me = s2.ants.find((a) => a.isPlayer); assert.equal(me.nx, s.ants.find((a) => a.isPlayer).nx);
  assert.deepEqual(s2.nest.open, {});
});
