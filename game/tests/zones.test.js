// Build 39: the 13 zones and the end of Phase 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 10; i++) SIM.tick(s, 0.05);
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };

test('13 zones, each a guardian and real regions, no region in two', () => {
  assert.equal(SIM.ZONES.length, 13);
  const seen = new Set();
  for (const z of SIM.ZONES) {
    assert.ok(z.guardian && z.name && z.regions.length, z.key);
    for (const k of z.regions) { assert.ok(SIM.REGION[k] != null, `${z.key}: ${k} is a region`); assert.ok(!seen.has(k), `${k} in one zone`); seen.add(k); }
  }
});

test('a guardian falls: its zone is taken, with a banner and the count', () => {
  const s = founded();
  assert.equal(SIM.zonesTaken(s), 0);
  s.colony.kills.spider = 1; step(s, 1.2);
  assert.ok(s.colony.zones.flowerbed != null);
  assert.equal(SIM.zonesTaken(s), 1);
  assert.equal(s.zoneTaken.key, 'flowerbed');
  assert.match(s.player.msg, /Zone taken: The Flowerbed \(1 of 13\)/);
});

test('all 13 taken: Phase 1 is over, and that is kept in a save', () => {
  const s = founded();
  for (const k of ['spider', 'hornworm', 'beetle', 'antlion', 'robin', 'toad', 'mantis', 'widow', 'centipede']) s.colony.kills[k] = 1;
  for (const r of s.rivals) r.queenAlive = false;
  step(s, 1.2);
  assert.equal(SIM.zonesTaken(s), 13);
  assert.ok(s.phase1, 'phase 1 done');
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.ok(s2.phase1 && SIM.zonesTaken(s2) === 13);
});
