// Build 76 (Phase 6): save slots. The browser storage itself is checked in the browser; here, the index's
// defaults and the cards' numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { SLOT_COUNT, slotMeta, summary } from '../src/game/slots.js';

test('three colonies; with nothing saved, slot 1 is playing and all are empty', () => {
  const m = slotMeta();
  assert.equal(SLOT_COUNT, 3); assert.equal(m.active, 1); assert.equal(m.list.length, 3);
  assert.deepEqual(m.list.map((x) => x.name), ['Colony 1', 'Colony 2', 'Colony 3']);
  assert.ok(m.list.every((x) => x.empty));
});

test('a colony’s card: day, ants, queen level and time played', () => {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 20 * 40; i++) SIM.tick(s, 0.05);
  const c = summary(s);
  assert.equal(c.day, 1); assert.equal(c.queen, 1); assert.equal(c.t, 40); assert.ok(c.ants >= 1); assert.equal(c.lost, false);
});
