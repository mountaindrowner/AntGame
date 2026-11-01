// Build 25: rival colonies across the yard.
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

test('five colonies: the pavement ants awake, the rest asleep in their regions', () => {
  const s = SIM.create(7);
  assert.deepEqual(s.rivals.map((r) => r.key), ['pavement', 'odorous', 'argentine', 'carpenter', 'fire']);
  assert.ok(!s.rivals[0].asleep && s.rivals.slice(1).every((r) => r.asleep));
  for (const r of s.rivals.slice(1)) assert.equal(SIM.AREAS[SIM.areaOf(s, r.ex, r.ey)].key, SIM.RIVALS[r.team - 1].region, `${r.key} nest in its region`);
});

test('no new colony while the Patio colony lives; then one every 30 minutes, easiest first', () => {
  const s = founded(), [pav, odo, arg, carp, fire] = s.rivals;
  s.t = 5000; step(s, 1); assert.ok(odo.asleep && arg.asleep, 'none while the pavement ants live');
  s.patioDeadAt = s.t;
  s.t += 1790; step(s, 1); assert.ok(odo.asleep, 'not before 30 min');
  s.t += 15; step(s, 0.2); assert.ok(!odo.asleep && arg.asleep, 'odorous at 30 min');
  assert.match(s.banner.title, /Odorous/);
  s.t += 1800; step(s, 0.2); assert.ok(!arg.asleep && carp.asleep, 'argentine at 60');
  s.t += 1800; step(s, 0.2); assert.ok(!carp.asleep && fire.asleep, 'carpenters at 90');
  s.t += 1800; step(s, 0.2); assert.ok(!fire.asleep, 'fire ants at 120');
});

test('a woken colony grows ants of its kind, and forages', () => {
  const s = founded();
  const fire = s.rivals.find((r) => r.key === 'fire');
  s.patioDeadAt = s.t - 4 * 1800; step(s, 1);
  assert.equal(fire.asleep, false);
  const mine = s.ants.filter((a) => a.team === fire.team);
  assert.ok(mine.length >= 12, `${mine.length} fire ants`);
  assert.ok(mine.find((a) => a.caste === 'soldier').hp > SIM.CASTES.soldier.hp - 0.01);
  step(s, 60);
  assert.ok(s.ants.some((a) => a.team === fire.team && a.state !== 'in'), 'out and about');
});

test('carpenter ants are big and tough; odorous house ants small and weak', () => {
  const s = founded();
  s.patioDeadAt = s.t - 3 * 1800; step(s, 1);
  const carp = s.ants.find((a) => a.team === 4 && a.caste === 'forager'), odo = s.ants.find((a) => a.team === 2 && a.caste === 'forager');
  assert.ok(carp.hp > odo.hp * 3, `carpenter ${carp.hp} vs odorous ${odo.hp}`);
  assert.ok(SIM.rspec(carp).size > SIM.rspec(odo).size);
  assert.ok(s.ants.filter((a) => a.team === 2).length > s.ants.filter((a) => a.team === 4).length * 3, 'odorous ants swarm');
});

test('eight fighters at a rival door kill its queen; its region can then be held', () => {
  const s = founded(), r = s.rivals.find((x) => x.key === 'odorous');
  s.patioDeadAt = s.t - 1800; step(s, 1);
  s.ants = s.ants.filter((a) => a.team !== r.team);
  r.qhp = 5;
  for (let i = 0; i < 9; i++) { SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; Object.assign(a, { caste: 'soldier', state: 'patrol', tx: r.ex, ty: r.ey, x: (r.ex + 0.5) * SIM.T, y: (r.ey + 0.5) * SIM.T, hp: 99 }); }
  step(s, 3);
  assert.equal(r.queenAlive, false);
  assert.ok(s.outposts.some((o) => o.x === r.ex && o.y === r.ey), 'their nest becomes an outpost');
  assert.equal(s.won, false, 'only the pavement queen wins the yard');
});

test('rival colonies are kept across a save', () => {
  const s = founded(); s.patioDeadAt = s.t - 3 * 1800; step(s, 1);
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(s2.rivals.length, 5);
  assert.equal(s2.rivals.find((r) => r.key === 'carpenter').asleep, false);
  assert.equal(s2.rivals.find((r) => r.key === 'fire').asleep, true);
  step(s2, 2);
});
