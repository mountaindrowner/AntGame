// Build 75 (Phase 5): rain fades in, hidden antlion pits, one apple core at its real size, fills from the spoil
// heap, and Bioluminescence.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { EVO_BY } from '../src/sim/growth.js';
import { spawnFood } from '../src/sim/world.js';

let seed = 75; const rnd0 = Math.random; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
test.after(() => { Math.random = rnd0; });

const T = SIM.T;
function founded(builders = 0) {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  const run = (sec) => { for (let i = 0; i < sec * 20; i++) { if (i % 100 === 0) Object.assign(s.colony, { store: 20, water: 10, grit: 20 }); SIM.tick(s, 0.05); } };
  run(30); for (let i = 0; i < builders; i++) SIM.queueEgg(s, 'builder'); if (builders) run(40);
  return s;
}

test('rain fades in: drips after the thunder, builds over twelve seconds, eases off at the end', () => {
  const s = founded(), r = s.rain;
  r.on = false; r.warned = true; r.t = 100; r.next = 108; assert.ok(SIM.rainK(s) > 0 && SIM.rainK(s) < 0.05, 'a few drips');
  r.on = true; r.t = 0; assert.ok(SIM.rainK(s) <= 0.11);
  r.t = 6; assert.ok(SIM.rainK(s) > 0.4 && SIM.rainK(s) < 0.7, 'building');
  r.t = 20; assert.equal(SIM.rainK(s), 1, 'the downpour');
  r.t = SIM.RAIN_LEN - 3; assert.ok(SIM.rainK(s) < 0.5, 'easing off');
});

test('one apple core in the yard at a time, a feast at its real size', () => {
  const s = founded(), c = SIM.AREAS.findIndex((a) => a.key === 'compost');
  s.items = s.items.filter((f) => f.type !== 'apple');
  for (let i = 0; i < 200; i++) spawnFood(s, c);
  assert.equal(s.items.filter((f) => f.type === 'apple').length, 1, 'one, not a scatter');
  assert.ok(SIM.FOODS.apple.amt[0] >= 150);
});

test('a fill packs dirt from the spoil heap, three times as fast, and the heap shrinks', () => {
  const s = founded(1);
  assert.ok(s.ants.some((a) => a.caste === 'builder'), 'a builder');
  const r = s.queen.room, x = r.x0 + r.w;
  s.nest.cells[(r.y0 + 2) * SIM.NW + x] = 1; s.nest.ver++;
  s.spoilPile = 5; s.nest.spoil = 0;
  assert.equal(SIM.toggleFillOrder(s, x, r.y0 + 2), 'added');
  const need = s.nest.fillOrders[0].need; let t = 0;
  for (let i = 0; i < need * 20 && s.nest.fillOrders.length; i++) { Object.assign(s.colony, { store: 20, water: 10 }); SIM.tick(s, 0.05); t += 0.05; }
  assert.equal(s.nest.fillOrders.length, 0, 'filled'); assert.equal(s.spoilPile, 4, 'a load from the heap');
  assert.ok(t < need * 0.7, `${t.toFixed(1)} s of ${need}`);
});

test('antlion pits hide until one of your ants comes close; ten in the sandpit', () => {
  const s = founded(), w = s.world;
  assert.equal(w.pits.length, 10);
  assert.equal((s.colony.pitsSeen || []).length, 0);
  const q = w.pits[8], a = s.player.ant || s.ants.find((o) => !o.team);
  if (s.player.inNest) { s.player.inNest = false; a.state = 'player'; }
  a.x = (q.x + q.r + 1.5) * T; a.y = q.y * T; a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T);
  for (let i = 0; i < 10; i++) SIM.tick(s, 0.05);
  assert.ok(s.colony.pitsSeen.includes(8), 'found');
});

test('Bioluminescence: a small Senses node after Rain sense', () => {
  const E = EVO_BY.glow; assert.ok(E); assert.equal(E.branch, 'senses'); assert.equal(E.after, 'nightsense'); assert.ok(E.cost.genes <= 3);
});
