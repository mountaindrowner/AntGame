// Feet and birds: a shoe kills what is under it when it lands, nothing
// outside; a robin pecks ants, and five fighters around it chase it off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function setup(key) {
  const s = SIM.create(7), T = SIM.T, b = SIM.areaBounds(SIM.REGION[key]);
  s.queen.placed = true; s.phase = 'play'; s.queen.room = { x0: 10, y0: 3, w: 4, h: 3 };
  s.spider = null; s.spiderRespawn = 1e9; s.cat = null; s.catRespawn = 1e9;
  s.strikeT = s.strikeT.map(() => 1e9); // no surprise visitors
  const x = b.x0 + 40, y = b.y0 + 44;
  // Park an ant out here: on patrol far from home it stays put.
  const park = (caste, dx, dy) => { SIM.stress(s, 1); const o = s.ants[s.ants.length - 1]; o.caste = caste; o.x = (x + dx + 0.5) * T; o.y = (y + dy + 0.5) * T; o.tx = x + dx; o.ty = y + dy; o.state = 'patrol'; o.explore = -1e9; return o; };
  return { s, x, y, park };
}

test('a foot kills the ants under it and spares the rest', () => {
  const { s, x, y, park } = setup('steps');
  const under = [park('forager', 0, 0), park('forager', 3, 1)], clear = [park('forager', 0, 9), park('forager', 14, 0)];
  for (const a of under) a.id = 3; // id % 3 === 0: these don't notice the shadow
  s.strikes.push({ kind: 'foot', region: SIM.REGION.steps, x: x + 0.5, y: y + 0.5, yaw: 0, t: 0, phase: 'warn', pecks: 0, next: 0 });
  for (let i = 0; i < 20 * 5; i++) { s.colony.store = 20; SIM.tick(s, 0.05); s.player.msg = ''; }
  for (const a of under) assert.ok(!s.ants.includes(a), 'ant under the foot survived');
  for (const a of clear) assert.ok(s.ants.includes(a), 'ant clear of the foot died');
  assert.equal(s.colony.deaths.foot, 2);
  assert.equal(s.strikes.length, 0, 'the foot lifts and goes');
});

test('a robin pecks ants, and five soldiers chase it off', () => {
  let { s, x, y, park } = setup('feeder');
  for (let i = 0; i < 3; i++) park('forager', i, 1);
  s.strikes.push({ kind: 'bird', region: SIM.REGION.feeder, x, y, yaw: 0, t: 0, phase: 'land', pecks: 0, next: 0 });
  for (let i = 0; i < 20 * 10; i++) { s.colony.store = 20; s.colony.protein = 50; SIM.tick(s, 0.05); s.player.msg = ''; }
  assert.ok((s.colony.deaths.bird || 0) >= 1, 'the robin caught nothing');

  ({ s, x, y, park } = setup('feeder'));
  for (let i = 0; i < 5; i++) park('soldier', i - 2, 2);
  s.strikes.push({ kind: 'bird', region: SIM.REGION.feeder, x, y, yaw: 0, t: 0, phase: 'land', pecks: 0, next: 0 });
  for (let i = 0; i < 20 * 2; i++) { s.colony.store = 20; s.colony.protein = 50; SIM.tick(s, 0.05); s.player.msg = ''; }
  assert.ok(!s.strikes.length || s.strikes[0].phase === 'leave', 'the robin stayed with five soldiers around it');
  assert.ok(!s.colony.deaths.bird, 'the robin caught a soldier');
});
