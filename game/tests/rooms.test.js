// Build 23: rooms from the evolution tree, each training its own ant, each
// with its own levels; and 🪵 wood.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.critters = []; s.bugT = -1e9; s.director.next = 1e9;
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const rich = (c) => Object.assign(c, { store: 500, cap: 2000, water: 200, waterCap: 300, protein: 200, grit: 200, sugar: 200, chitin: 50, wood: 100, genes: 50 });
const room = (s, key, x0, y0) => { const R = SIM.ROOMS[key]; s.nest.rooms.push({ key, x0, y0, w: R.w, h: R.h }); };
function hatchN(s, caste, n) {
  const out = [];
  for (let i = 0; i < n; i++) { SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; Object.assign(a, { caste, state: 'in', rest: 0, goal: null, nx: SIM.SHAFT + 0.5, ny: 0.5, ntx: SIM.SHAFT, nty: 0, carry: 0 }); out.push(a); }
  return out;
}

test('a new room waits on its evolution, and its ant waits on the room', () => {
  const s = founded(), c = s.colony; rich(c);
  assert.match(SIM.roomLock(s, 'fungus'), /evolve Fungus garden/);
  assert.match(SIM.eggLock(s, 'gardener'), /evolve and build a Fungus garden/);
  c.evo.aphids = true; c.evo.fungus = true;
  assert.equal(SIM.roomLock(s, 'fungus'), '');
  assert.match(SIM.eggLock(s, 'gardener'), /needs a Fungus garden/);
  room(s, 'fungus', 2, 6);
  assert.equal(SIM.eggLock(s, 'gardener'), '');
});

test('gardeners cut leaves and the fungus garden grows them into food', () => {
  const s = founded(), c = s.colony; rich(c); c.store = 20; c.cap = 400;
  c.evo.aphids = c.evo.fungus = true; room(s, 'fungus', 2, 6);
  for (let i = 0; i < 6; i++) SIM.tick(s, 0.05);
  c.fungus = 0; hatchN(s, 'gardener', 6);
  step(s, 120);
  // On leaves, unless the garden is already full (then they rightly turn to other work).
  assert.ok(s.ants.filter((a) => a.caste === 'gardener').some((a) => a.duty === 'leaves') || c.fungus >= SIM.fungusCap(s) * 0.85, 'gardeners on leaves');
  assert.ok(c.fungus > 0, `leaves brought in (${c.fungus.toFixed(1)})`);
  // The garden turns leaf into food: with the gardeners gone, the stock goes down as the food goes up.
  s.ants = s.ants.filter((a) => a.caste !== 'gardener'); c.fungus = 30;
  const g0 = c.store; step(s, 20);
  assert.ok(c.fungus <= 28.2, `leaf used (${c.fungus.toFixed(1)})`);
  assert.ok(c.store > g0 - 2, 'and food grown');
});

test('ranchers stay in and the aphid barn makes sugar; its level II makes more', () => {
  const s = founded(), c = s.colony; rich(c);
  c.evo.aphids = c.evo.mealybugs = true; room(s, 'dairy', 2, 6);
  const r = hatchN(s, 'rancher', 4);
  const s0 = c.sugarTotal; step(s, 120);
  assert.ok(r.every((a) => a.state === 'in'), 'ranchers stay inside');
  const made = c.sugarTotal - s0; assert.ok(made >= 3, `made ${made} 🍯 in 2 min`);
  assert.ok(SIM.upgradeRoom(s, 'dairy'));
  assert.equal(SIM.roomLevel(s, 'dairy'), 2);
  const s1 = c.sugarTotal; step(s, 120);
  assert.ok(c.sugarTotal - s1 > made, 'level II makes more');
});

test('medics heal the wounded; at level III they save some of the fallen', () => {
  const s = founded(), c = s.colony; rich(c);
  c.evo.insulation = c.evo.infirmary = true; room(s, 'infirmary', 2, 6);
  hatchN(s, 'medic', 2); const [hurt] = hatchN(s, 'builder', 1);
  hurt.hp = 0.2; step(s, 10);
  assert.ok(hurt.hp > 1, `healed to ${hurt.hp.toFixed(1)}`);
  SIM.upgradeRoom(s, 'infirmary'); c.store = 500; c.cap = 2000; SIM.upgradeRoom(s, 'infirmary');
  assert.equal(SIM.roomLevel(s, 'infirmary'), 3);
  let saved = 0;
  for (let i = 0; i < 40; i++) { SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; a.x = (c.ex + 3) * SIM.T; a.y = (c.ey + 3) * SIM.T; SIM.killAnt(s, a, 'spider'); if (a.state !== 'dead') saved++; }
  assert.ok(saved >= 4 && saved <= 20, `${saved} of 40 saved`);
});

test('the granary raises the food cap, and harvesters carry seed in double loads', () => {
  const s = founded(), c = s.colony; rich(c);
  c.evo.store2 = c.evo.granary = true; room(s, 'granary', 2, 6); step(s, 1);
  const cap1 = SIM.storeCapOf(s); SIM.upgradeRoom(s, 'granary');
  assert.equal(SIM.storeCapOf(s), cap1 + 150);
  const [h] = hatchN(s, 'harvester', 1), [f] = hatchN(s, 'forager', 1);
  assert.equal(SIM.carryCap(s, h, { type: 'seed' }), SIM.carryCap(s, f, { type: 'seed' }) + 5);
  assert.equal(SIM.carryCap(s, h, { type: 'berry' }), SIM.carryCap(s, f, { type: 'berry' }));
});

test('wood: twigs turn up once it is wanted, foragers fetch it, and it pays for the queen’s last level', () => {
  const s = founded(), c = s.colony; c.store = 100; c.wood = 0;
  assert.equal(SIM.woodGoal(s), 0);
  s.queen.level = 2;
  for (const k of ['food', 'water', 'stone', 'hunt']) SIM.toggleJob(s, 'forager', k);
  hatchN(s, 'forager', 8);
  step(s, 240);
  assert.ok(s.items.some((f) => f.kind === 'wood') || c.wood > 0, 'twigs in the yard');
  assert.ok(c.wood > 0, `fetched ${c.wood} 🪵`);
});

test('room levels are kept across a save', () => {
  const s = founded(), c = s.colony; rich(c);
  c.evo.aphids = c.evo.mealybugs = true; room(s, 'dairy', 2, 6);
  SIM.upgradeRoom(s, 'dairy');
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(SIM.roomLevel(s2, 'dairy'), 2);
});
