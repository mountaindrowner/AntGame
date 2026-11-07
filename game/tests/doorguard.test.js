// Build 81: guards posted at the door (Mark: "as a part of the jobs set, we can leave some soldiers at the entrance
// of the nest").
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

let seed = 81; const rnd0 = Math.random; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
test.after(() => { Math.random = rnd0; });

const T = SIM.T;
const run = (s, sec) => { for (let i = 0; i < sec * 20; i++) { if (i % 100 === 0) Object.assign(s.colony, { store: 40, water: 10, protein: 40 }); SIM.tick(s, 0.05); } };
// A colony with five soldiers at home.
function garrison(n = 5) {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  run(s, 30);
  for (let k = 0; k < n; k++) { SIM.queueEgg(s, 'forager'); run(s, 25); }
  for (const a of s.ants) if (!a.team && !a.isPlayer && a.state !== 'dead') { a.caste = 'soldier'; a.hp = SIM.CASTES.soldier.hp; }
  s.spider = null; s.director.next = 1e9;
  return s;
}
const near = (s, a) => Math.hypot(a.tx - s.colony.ex, a.ty - s.colony.ey);

test('two guards go out and walk a slow round of the door, and keep to it', () => {
  const s = garrison();
  assert.equal(SIM.doorGuardWanted(s), 2, 'two to start');
  run(s, 30);
  const g = SIM.posted(s); assert.equal(g.length, 2);
  const seen = new Set(), far = [];
  for (let k = 0; k < 120; k++) { run(s, 1); for (const a of SIM.posted(s)) { assert.equal(a.state, 'patrol'); seen.add(a.id + ':' + a.tx + ',' + a.ty); far.push(near(s, a)); } }
  assert.ok(Math.max(...far) <= 4, `never past the four tiles that count (${Math.max(...far).toFixed(1)})`);
  assert.ok(seen.size >= 12, `they walk the round, not stand (${seen.size} tiles visited)`);
  const ring = SIM.doorRound(s); assert.ok(ring.length >= 8, 'a loop of tiles round the door');
});

test('more, fewer, or none: the Jobs page number is obeyed', () => {
  const s = garrison();
  SIM.setDoorGuard(s, 4); run(s, 90); assert.equal(SIM.posted(s).length, 4, 'four, once enough fighters are home'); // (those out hunting are posted as they come home)
  SIM.setDoorGuard(s, 1); run(s, 3); assert.equal(SIM.posted(s).length, 1);
  SIM.setDoorGuard(s, 0); run(s, 3); assert.equal(SIM.posted(s).length, 0);
  assert.equal(SIM.setDoorGuard(s, 99), SIM.DOOR_GUARD_MAX);
});

test('turning a kind\'s guard duty off stands its guards down', () => {
  const s = garrison(); run(s, 30); assert.equal(SIM.posted(s).length, 2);
  SIM.toggleJob(s, 'soldier', 'guard'); run(s, 3); assert.equal(SIM.posted(s).length, 0);
});

test('Recruit by the door leaves the guards at their posts', () => {
  const s = garrison(); run(s, 30);
  const P = s.player, me = P.ant; if (P.inNest) { P.inNest = false; me.state = 'player'; }
  Object.assign(me, { tx: s.colony.ex, ty: s.colony.ey + 1, x: (s.colony.ex + 0.5) * T, y: (s.colony.ey + 1.5) * T });
  SIM.recruit(s, 10);
  assert.ok(SIM.posted(s).every((a) => !a.follow), 'none of them follow you');
  assert.equal(SIM.posted(s).length, 2);
});

test('a guard that dies is replaced from home', () => {
  const s = garrison(); run(s, 30);
  const [g] = SIM.posted(s); g.state = 'dead';
  run(s, 30); assert.equal(SIM.posted(s).length, 2);
});

test('with guards at the door, a raider can\'t get at the queen', () => {
  const s = garrison(); run(s, 30);
  const c = s.colony, r = s.ants.find((a) => a.team && a.state !== 'dead');
  s.queen.hp = 80;
  for (let i = 0; i < 40; i++) { Object.assign(r, { state: 'raid', tx: c.ex, ty: c.ey, x: (c.ex + 0.5) * T, y: (c.ey + 0.5) * T, raidT: 0 }); SIM.tick(s, 0.05); }
  assert.ok(s.queen.hp >= 80, `the queen untouched (${s.queen.hp.toFixed(1)})`);
});

test('posts are kept in a save', () => {
  const s = garrison(); run(s, 30);
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(SIM.posted(s2).length, 2); assert.equal(SIM.doorGuardWanted(s2), 2);
  SIM.setDoorGuard(s, 3); assert.equal(SIM.doorGuardWanted(SIM.deserialize(SIM.serialize(s))), 3);
});
