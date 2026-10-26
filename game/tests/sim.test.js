// Headless checks on the simulation: it must run without a DOM, found a
// colony, survive load, and round-trip through a save.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const step = (s, seconds) => { for (let i = 0; i < seconds * 20; i++) SIM.tick(s, 0.05); };

function founded(seed = 7) {
  const s = SIM.create(seed);
  // The queen digs two cells straight down, then builds her chamber.
  assert.ok(SIM.queenDig(s, s.queen.x, s.queen.y + 1));
  assert.ok(SIM.queenDig(s, s.queen.x, s.queen.y + 1));
  assert.ok(SIM.buildNest(s));
  return s;
}

test('creates a world with both colonies and a queen in the dig phase', () => {
  const s = SIM.create(7);
  assert.equal(s.phase, 'dig');
  assert.equal(s.world.blocked.length, SIM.W * SIM.H);
  assert.equal(s.nest.cells.length, SIM.NW * SIM.NH);
  assert.equal(s.queen.energy, 30);
});

test('founding a nest hatches the player ant', () => {
  const s = founded();
  assert.equal(s.phase, 'play');
  assert.ok(s.queen.placed);
  step(s, 30);
  assert.ok(s.player.ant, 'first egg should hatch into the player');
  assert.ok(s.player.inNest);
});

test('same seed, same world', () => {
  const a = SIM.create(11), b = SIM.create(11);
  assert.deepEqual(Array.from(a.world.blocked), Array.from(b.world.blocked));
  assert.deepEqual(a.items.map((i) => [i.x, i.y, i.kind]), b.items.map((i) => [i.x, i.y, i.kind]));
});

test('200-ant stress test runs five simulated minutes', () => {
  const s = founded();
  step(s, 30);
  SIM.stress(s, 200);
  const t0 = Date.now();
  step(s, 300);
  const ms = Date.now() - t0;
  assert.ok(SIM.antCount(s) > 0);
  // Generous bound: the sim must stay far below real time on a dev machine.
  assert.ok(ms < 60000, `sim too slow: ${ms} ms for 300 s`);
});

test('save round-trips', () => {
  const s = founded();
  step(s, 60);
  SIM.toggleDigOrder(s, s.queen.x + 3, s.queen.y);
  const json = SIM.serialize(s);
  const r = SIM.deserialize(json);
  assert.equal(r.phase, s.phase);
  assert.equal(r.ants.length, s.ants.length);
  assert.deepEqual(Array.from(r.nest.cells), Array.from(s.nest.cells));
  assert.equal(SIM.serialize(r), json);
});
