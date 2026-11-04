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
  const s = founded(), [, odo, arg, carp, fire] = s.rivals;
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

test('a queen raid kills a rival queen; its nest becomes an outpost', () => {
  const s = founded(), r = s.rivals.find((x) => x.key === 'odorous'), P = s.player;
  s.patioDeadAt = s.t - 1800; step(s, 1);
  s.ants = s.ants.filter((a) => a.team !== r.team);
  r.qhp = 5;
  // You and a crew of nine soldiers at their door.
  P.inNest = false; const me = P.ant; Object.assign(me, { state: 'player', tx: r.ex, ty: r.ey + 2, x: (r.ex + 0.5) * SIM.T, y: (r.ey + 2.5) * SIM.T }); P.tx = me.x; P.ty = me.y;
  for (let i = 0; i < 9; i++) { SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; Object.assign(a, { caste: 'soldier', state: 'patrol', tx: r.ex, ty: r.ey + 1, x: (r.ex + 0.5) * SIM.T, y: (r.ey + 1.5) * SIM.T, hp: 99 }); }
  assert.ok(SIM.recruit(s, 9) >= 8);
  assert.ok(SIM.startRaid(s, 'queen'), SIM.raidLock(s, 'queen'));
  for (let i = 0; i < 20 * 20 && r.queenAlive; i++) { SIM.tick(s, 0.05); P.tx = me.x; P.ty = me.y; }
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

// Build 25.1: a colony waking in a region nobody has walked into used to starve out in four minutes.
test('every later colony is still there ten minutes after it wakes', () => {
  const s = founded();
  s.patioDeadAt = s.t - 4 * 1800 - 1; step(s, 600);
  for (const r of s.rivals.slice(1)) {
    const n = s.ants.filter((a) => a.team === r.team && a.state !== 'dead').length;
    assert.ok(!r.asleep && n >= 10, `${r.key}: ${n} ants`);
  }
});

test('the big fire mound stings at a tenth once its colony is awake, and not at all when it falls', () => {
  const s = founded(), fire = s.rivals.find((r) => r.key === 'fire'), z = s.world.stings.find((q) => q.big);
  const pa = s.player.ant, hit = () => { pa.hp = pa.maxHp = 1000; pa.state = 'out'; pa.x = (z.x + 0.5) * SIM.T; pa.y = (z.y + 4) * SIM.T; s.player.tx = pa.x; s.player.ty = pa.y; step(s, 2); return 1000 - pa.hp; };
  const asleep = hit();
  s.patioDeadAt = s.t - 4 * 1800 - 1; step(s, 0.2); assert.equal(fire.asleep, false);
  const awake = hit();
  fire.queenAlive = false; const dead = hit();
  assert.ok(asleep > 0 && awake < asleep * 0.2, `asleep ${asleep.toFixed(2)}, awake ${awake.toFixed(2)}`);
  assert.equal(dead, 0);
});
