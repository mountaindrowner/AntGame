// Build 14: your ant's upgrades, the thunder before rain, rarer rain.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  return s;
}
// How far your ant walks in 2 s on open ground.
function pace(s) {
  const a = s.player.ant, w = s.world, T = SIM.T; s.player.inNest = false; a.state = 'player';
  a.x = (w.ex + 0.5) * T; a.y = (w.ey + 2.5) * T; a.tx = w.ex; a.ty = w.ey + 2;
  s.player.tx = a.x; s.player.ty = a.y + 60 * T;
  const y0 = a.y; for (let i = 0; i < 40; i++) SIM.tick(s, 0.05);
  return a.y - y0;
}

test('your ant is slower than before, and the You levels speed it up', () => {
  const s = founded(), c = s.colony;
  const base = pace(s);
  assert.ok(base < 85 * SIM.SURF * 2 * 0.85, `base pace ${base.toFixed(0)} px in 2 s`);
  c.store = 100;
  assert.ok(SIM.upgradeCaste(s, 'you'));
  assert.ok(pace(s) > base * 1.1, 'Long legs: faster');
});

test('Thick shell raises your health to 20', () => {
  const s = founded(), c = s.colony;
  Object.assign(c, { store: 200, protein: 50 });
  SIM.upgradeCaste(s, 'you'); SIM.upgradeCaste(s, 'you', 'stomach');
  assert.equal(SIM.youHp(s), 20);
  assert.equal(s.player.ant.hp, 20);
});

test('thunder warns twenty seconds before rain, and rain is rare', () => {
  const s = founded();
  assert.ok(s.rain.next >= 480, 'the first rain is eight minutes in');
  s.rain.t = s.rain.next - 21; s.events.length = 0;
  for (let i = 0; i < 2 * 20; i++) SIM.tick(s, 0.05);
  assert.ok(s.events.includes('rainsoon'));
  assert.ok(!s.rain.on);
  for (let i = 0; i < 20 * 20; i++) SIM.tick(s, 0.05);
  assert.ok(s.rain.on);
  assert.ok(s.rain.next >= 480, 'the next one is 8 to 12 minutes off');
});
