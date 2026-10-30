// Build 13: outposts, held regions and their prizes, the goals board, rebirth.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { OUTPOST, goalBoard } from '../src/sim/growth.js';

function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
// Hatch your ant and stand it outside at tile (x, y).
function outsideAt(s, x, y) {
  step(s, 30);
  const a = s.player.ant; s.player.inNest = false; a.state = 'player';
  a.tx = x; a.ty = y; a.x = (x + 0.5) * SIM.T; a.y = (y + 0.5) * SIM.T;
  return a;
}
// An open tile in a region, well inside it.
function openIn(s, key) {
  const i = SIM.AREAS.findIndex((A) => A.key === key), b = SIM.areaBounds(i), w = s.world;
  for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = Math.floor((b.x0 + b.x1) / 2) + dx, y = Math.floor((b.y0 + b.y1) / 2) + dy;
    if (!w.blocked[y * SIM.W + x] && !w.pit[y * SIM.W + x]) return [x, y, i];
  }
}

test('an outpost needs Waypoints, stone, and room from the nest', () => {
  const s = founded(), c = s.colony, w = s.world;
  outsideAt(s, w.ex + 2, w.ey);
  assert.match(SIM.outpostLock(s), /Waypoints/);
  c.genes = 5; c.grit = 30; assert.ok(SIM.buyEvo(s, 'waypoints'));
  assert.match(SIM.outpostLock(s), /close to the nest/);
  const [x, y] = openIn(s, 'spigot'); outsideAt(s, x, y);
  c.grit = 5; assert.match(SIM.outpostLock(s), /stone/);
  c.grit = 30; assert.equal(SIM.outpostLock(s), '');
  assert.ok(SIM.placeOutpost(s));
  assert.equal(c.grit, 20);
  assert.match(SIM.outpostLock(s), /another outpost/);
});

test('your ants raise it; then foragers may roam round it and trails there keep', () => {
  const s = founded(), c = s.colony;
  c.genes = 5; c.grit = 30; SIM.buyEvo(s, 'waypoints');
  const [x, y] = openIn(s, 'spigot'); const a = outsideAt(s, x, y);
  SIM.placeOutpost(s);
  const o = s.outposts[0], i = y * SIM.W + x;
  assert.equal(s.reachMask[i], 0, 'not yet');
  for (let k = 0; k < (OUTPOST.work + 5) * 20 && !o.done; k++) { a.x = (x + 0.5) * SIM.T; a.y = (y + 0.5) * SIM.T; s.player.hunger = 100; SIM.tick(s, 0.05); }
  assert.ok(o.done, 'raised by your ant alone in about 30 s');
  assert.equal(s.reachMask[i], 1);
  assert.equal(s.keepMask[i], 1);
  s.trail[i] = 3; s.hot.add(i); s.rain.on = false; s.rain.next = 1e9;
  step(s, 60);
  assert.equal(s.trail[i], 3, 'a trail beside an outpost does not fade');
});

test('holding a region pays its prize; the Flowerbed needs the spider dead first', () => {
  const s = founded(), c = s.colony;
  const [x, y, si] = openIn(s, 'spigot');
  s.outposts.push({ id: 999, x, y, region: si, work: OUTPOST.work, done: true, hp: 2 });
  const g = c.genes; step(s, 2);
  assert.ok(c.held[si], 'the Spigot has no guardian');
  assert.equal(c.waterCap, 50, 'water cap +40');
  assert.ok(c.genes > g);
  const [fx, fy, fi] = openIn(s, 'flowerbed');
  s.outposts.push({ id: 998, x: fx, y: fy, region: fi, work: OUTPOST.work, done: true, hp: 2 });
  step(s, 2);
  assert.ok(!c.held[fi], 'not while the spider lives');
  c.kills.spider = 1; step(s, 2);
  assert.ok(c.held[fi]);
  // Lose the outpost, lose the hold.
  s.outposts = s.outposts.filter((o) => o.region !== si); step(s, 2);
  assert.ok(!c.held[si]); assert.equal(c.waterCap, 10);
});

test('the goals board: three goals, done ones pay Genes and make way', () => {
  const s = founded(), c = s.colony;
  const b = goalBoard(s);
  assert.deepEqual(b.map((g) => g.tier), ['short', 'medium', 'long']);
  const first = b[0];
  c.foodTotal = 60; const g0 = c.genes; step(s, 2);
  assert.ok(c.goals.done.food50);
  assert.ok(c.genes >= g0 + 1);
  assert.notEqual(goalBoard(s)[0].key, first.key);
});

test('a finished set pays its reward for good', () => {
  const s = founded(), c = s.colony;
  // Goals only complete once they're on the board: clear the way to 'Haul 5 treats'.
  for (const k of ['food50', 'treat1', 'store100', 'food1000', 'hold1', 'spider', 'rooms6', 'queen3', 'vets3', 'hold3']) c.goals.done[k] = true;
  c.treats = 5; step(s, 2);
  assert.ok(c.goals.done.treat5);
  assert.ok(c.goals.sets.garden, 'Garden set done');
});

test('choose your rebirth: the next egg hatches as the kind you picked', () => {
  const s = founded(), c = s.colony; step(s, 30);
  s.nest.rooms.push({ x0: 1, y0: 5, w: 6, h: 3, key: 'barracks' });
  const P = s.player; const a = P.ant; a.state = 'dead'; s.ants = s.ants.filter((o) => o !== a); P.ant = null; P.pending = true;
  P.rebirth = 'soldier'; c.eggQueue.length = 0; c.eggs.length = 0; c.store = 20; c.water = 10;
  step(s, 60);
  assert.ok(P.ant, 'hatched');
  assert.equal(P.ant.caste, 'soldier');
});

test('outposts survive a save', () => {
  const s = founded(), c = s.colony;
  const [x, y, si] = openIn(s, 'spigot');
  s.outposts.push({ id: 999, x, y, region: si, work: OUTPOST.work, done: true, hp: 2 });
  step(s, 2);
  const r = SIM.deserialize(SIM.serialize(s));
  assert.equal(r.outposts.length, 1);
  assert.equal(r.reachMask[y * SIM.W + x], 1);
  assert.ok(r.colony.held[si]);
});
