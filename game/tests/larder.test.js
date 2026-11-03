// Build 48: the Egg larder turns food into meat, only with food to spare, up to a full larder.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.critters = []; s.bugT = -1e9; s.strikeT = s.strikeT.map(() => 1e9);
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const minute = (s, store) => { const c = s.colony, p0 = c.protein, m0 = c.larderMade || 0; for (let i = 0; i < 60; i++) { c.store = store; step(s, 1); } return [c.protein - p0, (c.larderMade || 0) - m0]; };

test('the Egg larder needs Trophic eggs, and makes 2, 3, then 4 meat a minute by level', () => {
  const s = founded(), c = s.colony; c.cap = 400;
  assert.match(SIM.roomLock(s, 'larder'), /Trophic eggs/);
  c.evo.trophic = true; s.nest.rooms.push({ key: 'larder', x0: 14, y0: 10, w: 4, h: 3 });
  c.protein = 0; const [, l1] = minute(s, 300); assert.ok(Math.abs(l1 - 2) < 0.1, `level I: ${l1.toFixed(2)}`);
  c.roomLv = { ...(c.roomLv || {}), larder: 3 }; c.protein = 0; const [, l3] = minute(s, 300); assert.ok(Math.abs(l3 - 4) < 0.1, `level III: ${l3.toFixed(2)}`);
  s.nest.rooms.push({ key: 'larder', x0: 20, y0: 10, w: 4, h: 3 }); c.protein = 0; const [, two] = minute(s, 300); assert.ok(Math.abs(two - 6) < 0.15, `two larders: ${two.toFixed(2)}`);
});

test('it runs only with food to spare and stops at a full larder', () => {
  const s = founded(), c = s.colony; c.evo.trophic = true; s.nest.rooms.push({ key: 'larder', x0: 14, y0: 10, w: 4, h: 3 });
  step(s, 1.2); c.protein = 0; const [, low] = minute(s, c.cap * 0.2); assert.equal(low, 0, 'a store under a quarter full makes none');
  c.protein = 150; const [, full] = minute(s, c.cap); assert.equal(full, 0, 'a full larder makes none');
});
