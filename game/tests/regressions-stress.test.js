// Build 47: the stress run. Each test pins a bug the fuzzing found.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const { T, NW } = SIM;
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each) each(); } };
function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  step(s, 25);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.rain.next = 1e9;
  return s;
}
const builders = (s, n) => { SIM.stress(s, n); for (const a of s.ants.slice(-n)) Object.assign(a, { caste: 'builder', state: 'in', goal: null, rest: 0, nx: SIM.SHAFT + 0.5, ny: 0.5, ntx: SIM.SHAFT, nty: 0 }); };

test('a cave-in in the first four minutes is still dug out', () => {
  const s = founded(), r = s.queen.room, y = r.y0 + 1;
  for (let x = r.x0 + 4; x <= r.x0 + 9; x++) s.nest.cells[y * NW + x] = 1;
  const cx = r.x0 + 6; s.nest.cells[y * NW + cx] = 0; s.nest.ver++;
  s.repairs.push({ x: cx, y, ax: cx + 1, ay: y, progress: 0 });
  builders(s, 3); step(s, 60);
  assert.ok(s.t < 240);
  assert.deepEqual(s.repairs, [], 'repaired');
  assert.equal(s.nest.cells[y * NW + cx], 1);
});

test('a young colony with no Builder is never caved in, by rain or by wear', () => {
  for (const seed of [1, 5]) {
    const s = SIM.create(seed), q = s.queen; let n = 0; while (SIM.queenDig(s, q.x, q.y + 1) && n++ < 8);
    SIM.buildNest(s); s.colony.store = 20; step(s, 600);
    assert.deepEqual(s.repairs, [], `seed ${seed}`);
  }
});

test('a fill order that cuts the nest in two is dug back by a builder on either side', () => {
  const s = founded(), r = s.queen.room, y = r.y0 + 1;
  for (let x = r.x0 + 4; x <= r.x0 + 12; x++) s.nest.cells[y * NW + x] = 1;
  const cx = r.x0 + 8; s.nest.cells[y * NW + cx] = 0; s.nest.ver++;
  builders(s, 2); const far = s.ants[s.ants.length - 1]; Object.assign(far, { nx: r.x0 + 11.5, ny: y + 0.5, ntx: r.x0 + 11, nty: y });
  assert.equal(SIM.toggleDigOrder(s, cx, y), 'added');
  step(s, 180);
  assert.equal(s.nest.cells[y * NW + cx], 1, 'dug back through');
});

test('the store follows a cap that shrinks; cancelled builds refund no water past the cap', () => {
  const s = founded(), c = s.colony;
  step(s, 1.2); const cap = c.cap; c.store = cap;
  s.capWas = cap + 100; step(s, 1.2);
  assert.ok(c.store <= c.cap + 1e-9, `store ${c.store} cap ${c.cap}`);
  c.water = c.waterCap; c.buildQueue.push({ key: 'x', paid: { water: 10 } });
  SIM.cancelBuilds && SIM.cancelBuilds(s);
  assert.ok(c.water <= c.waterCap);
});

test('the hunting wasp is sated after carrying an ant off, like the other hunters', () => {
  const s = founded(); s.critters = []; s.bugT = -1e9; s.strikeT = s.strikeT.map(() => 1e9);
  const me = s.player.ant, x = me.x, y = me.y + 12 * T, B = SIM.BUGS.wasp;
  const b = { id: s.nextId++, kind: 'wasp', region: null, hx: Math.floor(x / T), hy: Math.floor(y / T), x, y, dx: 1, dy: 0, hp: B.hp, maxHp: B.hp, state: 'carry', t: 0, life: 0, carryT: 0.1 };
  SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; Object.assign(a, { state: 'away', x, y }); b.carry = a.id; s.critters.push(b);
  step(s, 0.5);
  assert.equal(a.state, 'dead');
  assert.equal(b.state, 'eat'); assert.ok(b.fullUntil > s.t + 60, 'not hunting for a while');
  SIM.stress(s, 1); Object.assign(s.ants[s.ants.length - 1], { state: 'patrol', x: x + 20 * T, y, explore: -1e9 }); /* someone near, so it stays awake */
  step(s, 9); assert.notEqual(b.state, 'eat', 'done eating');
});

test('the antlion queen, surfaced, can be bitten from the rim of her pit', () => {
  const s = founded(); s.active[SIM.REGION.sandbox] = true; const b = SIM.ensureBoss(s, 'antlion'), pit = s.world.pits[b.pit];
  b.mode = 'fight'; b.under = false; b.upT = 99; b.cd = 99;
  SIM.stress(s, 1); const a = s.ants[s.ants.length - 1];
  const put = () => Object.assign(a, { caste: 'soldier', state: 'patrol', x: (pit.x + pit.r * 1.05 + 0.6) * T, y: pit.y * T, hp: 99, flee: 0 });
  put(); a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T);
  assert.equal(s.world.pit[Math.floor(a.y / T) * SIM.W + Math.floor(a.x / T)], 0, 'standing off the sand');
  const hp = b.hp; step(s, 2, put);
  assert.ok(b.hp < hp, `bitten (${hp} -> ${b.hp})`);
});

test('the nuptial-flight notice is saved', () => {
  const s = founded(); s.flightSaid = true;
  assert.equal(SIM.deserialize(SIM.serialize(s)).flightSaid, true);
});
