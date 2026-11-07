// Build 80 (docs/SIMULATION.md): the six balance changes from the numbers-only campaign, and the queen's warning
// for every raid on her.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { FOOD_YIELD } from '../src/sim/colony.js';
import { addOutpost } from '../src/sim/outposts.js';
import { EVO_BY } from '../src/sim/growth.js';

let seed = 80; const rnd0 = Math.random; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
test.after(() => { Math.random = rnd0; });

const T = SIM.T;
function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) { if (i % 100 === 0) Object.assign(s.colony, { store: 20, water: 10 }); SIM.tick(s, 0.05); }
  return s;
}
const mine = (s) => s.ants.filter((a) => !a.team && !a.isPlayer && a.state !== 'dead');
// A rival standing in your doorway, with nothing guarding it.
function raider(s) {
  const c = s.colony, r = s.ants.find((a) => a.team && a.state !== 'dead');
  Object.assign(r, { state: 'raid', tx: c.ex, ty: c.ey, x: (c.ex + 0.5) * T, y: (c.ey + 0.5) * T, raidT: 0 });
  return r;
}
// What the queen loses to one raider in a second.
function queenLoss(s) {
  s.queen.hp = 80; const r = raider(s), before = s.queen.hp;
  for (let i = 0; i < 20; i++) { r.x = (s.colony.ex + 0.5) * T; r.y = (s.colony.ey + 0.5) * T; r.state = 'raid'; r.raidT = 0; SIM.tick(s, 0.05); }
  r.state = 'dead'; // (gone, so she can heal)
  return before - s.queen.hp + 0.1; // (plus her own healing)
}

test('foragers bring home a quarter more food', () => {
  assert.equal(FOOD_YIELD, 1.25);
});

test('room upkeep is in proportion to the ants running it, full from 30', () => {
  const s = founded(), c = s.colony;
  for (const a of mine(s)) a.state = 'dead';
  s.ants = s.ants.filter((a) => a.state !== 'dead');
  c.store = 100; c.eaten.fill(0);
  const q = s.nest.rooms.find((r) => r.key === 'queen');
  for (const key of ['hatchery', 'store', 'cistern']) s.nest.rooms.push({ ...q, key, id: s.nextId++ });
  const up = SIM.roomUpkeep(s); assert.ok(up > 0, 'it has rooms');
  for (let i = 0; i < 60 * 20; i++) SIM.tick(s, 0.05);
  const eaten = 100 - c.store + c.delivered.reduce((x, y) => x + y, 0);
  const you = SIM.CASTES[s.player.ant.caste].eat; // (your own ant eats as usual)
  assert.ok(eaten - you < up * 0.1, `an empty colony barely pays for its rooms (${(eaten - you).toFixed(2)} of ${up})`);
});

test('three workers at home halve what a raider does to the queen', () => {
  const s = founded(), c = s.colony;
  for (let k = 0; k < 4; k++) { Object.assign(c, { store: 20, water: 10 }); SIM.queueEgg(s, 'forager'); for (let i = 0; i < 25 * 20; i++) SIM.tick(s, 0.05); }
  for (const a of mine(s)) a.state = 'away';
  const bare = queenLoss(s);
  for (const a of mine(s).slice(0, 3)) a.state = 'in';
  assert.ok(mine(s).filter((a) => a.state === 'in').length >= 3, 'three workers home');
  const guarded = queenLoss(s);
  assert.ok(bare > 0.7 && bare < 0.9, `alone: ${bare.toFixed(2)} a second`);
  assert.ok(Math.abs(guarded - bare / 2) < 0.08, `with workers home: ${guarded.toFixed(2)}`);
});

test('each new raid on the queen warns again, even before she has healed', () => {
  const s = founded();
  for (const a of mine(s)) a.state = 'away';
  queenLoss(s); assert.ok(s.queenWarned, 'the first raid warned');
  const hp = s.queen.hp; assert.ok(hp < 99);
  for (let i = 0; i < 35 * 20; i++) SIM.tick(s, 0.05); // a quiet half minute: she heals a little, not fully
  assert.ok(s.queen.hp < 99 && !s.queenWarned, 'the warning re-arms');
  s.events.length = 0; queenLoss(s);
  assert.ok(s.queenWarned && s.player.msg !== undefined);
});

test('Trophic eggs come with the Barracks, for genes and food', () => {
  const n = EVO_BY.trophic; assert.ok(n, 'the node exists');
  assert.equal(n.need, 'barracks'); assert.ok(!n.after); assert.ok(!n.deed);
  assert.deepEqual(n.cost, { genes: 2, food: 40 });
});

test('your ant eats at a finished outpost', () => {
  const s = founded(), P = s.player, a = P.ant;
  if (P.inNest) { P.inNest = false; a.state = 'player'; }
  const x = s.colony.ex + 60, y = s.colony.ey + 10;
  addOutpost(s, x, y, true);
  Object.assign(a, { tx: x, ty: y, x: (x + 0.5) * T, y: (y + 0.5) * T }); P.hunger = 20;
  for (let i = 0; i < 5 * 20; i++) { a.tx = x; a.ty = y; SIM.tick(s, 0.05); }
  assert.ok(P.hunger > 20, `fed at the outpost (${P.hunger.toFixed(1)})`);
});
