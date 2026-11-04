// Build 53: the wilds, step 1. The yard's outer ring stirs at the third daughter; standing orders; musters.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const { T, REGION } = SIM;
function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.critters = []; s.bugT = -1e9; s.strikeT = s.strikeT.map(() => 1e9); s.rain.next = 1e9;
  return s;
}
const step = (s, sec, f) => { for (let i = 0; i < sec * 20; i++) { if (f) f(); SIM.tick(s, 0.05); } };
const daughter = (s, key, dx, pop) => ({ key, oid: 0, region: 0, ex: s.world.ex + dx, ey: s.world.ey, state: 'ready', tunnel: { progress: 1, need: 1 }, pop: pop || {}, real: false, eggT: -1e9, hatched: 0, rooms: [null, null] });
const fighters = (s, n) => { SIM.stress(s, n); for (const a of s.ants.slice(-n)) Object.assign(a, { caste: 'soldier', state: 'in', rest: 0, goal: null, nx: SIM.SHAFT + 0.5, ny: 0.5 }); };

test('the wild ring: the west column below the trash, the east column and the south row', () => {
  assert.equal(SIM.WILD_SIDE[REGION.shed], 'west'); assert.equal(SIM.WILD_SIDE[REGION.hedge1], 'east');
  assert.equal(SIM.WILD_SIDE[REGION.toadhole], 'south'); assert.equal(SIM.WILD_SIDE[REGION.firemound], 'south');
  assert.equal(SIM.WILD_SIDE[REGION.trash], null, 'the trash cans by the house are not'); assert.equal(SIM.WILD_SIDE[REGION.patio], null);
  assert.equal(SIM.WILD_SIDE.filter(Boolean).length, 21);
});

test('the edges stir when the third daughter is joined: a banner, and two green seams a side', () => {
  const s = founded(); s.daughters = [daughter(s, 'war', 200), daughter(s, 'garden', 210)];
  step(s, 3); assert.ok(!(s.wild && s.wild.stirred));
  s.daughters.push(daughter(s, 'quarry', 220)); step(s, 3);
  assert.ok(s.wild.stirred); assert.match(s.banner.title, /stirs at the yard/);
  assert.equal(s.wild.seams.length, 6);
  for (const m of s.wild.seams) assert.equal(SIM.WILD_SIDE[SIM.areaOf(s, m.x, m.y)], m.side);
});

test('an open seam burns an ant that stands on it', () => {
  const s = founded(); s.daughters = ['war', 'garden', 'quarry'].map((k, i) => daughter(s, k, 200 + i * 10)); step(s, 3);
  const m = s.wild.seams[0]; SIM.stress(s, 1); const a = s.ants.at(-1);
  const put = () => Object.assign(a, { state: 'patrol', x: (m.x + 0.5) * T, y: (m.y + 0.5) * T, tx: m.x, ty: m.y, explore: -1e9, hp: Math.max(a.hp, 0) });
  put(); const hp = a.hp; step(s, 2, () => { a.x = (m.x + 0.5) * T; a.y = (m.y + 0.5) * T; a.tx = m.x; a.ty = m.y; });
  assert.ok(a.hp < hp - 0.3, `${hp} -> ${a.hp}`);
});

test('in the stirred wilds scent fades four times as fast', () => {
  const s = founded(); s.daughters = ['war', 'garden', 'quarry'].map((k, i) => daughter(s, k, 200 + i * 10)); step(s, 3);
  const b = SIM.areaBounds(REGION.side3), i = (b.y0 + 20) * s.world.W + b.x0 + 20, home = s.world.ey * s.world.W + s.world.ex + 6;
  s.trail[i] = 4; s.hot.add(i); s.trail[home] = 4; s.hot.add(home); step(s, 22);
  assert.ok(s.trail[i] < 2.2 && s.trail[home] > 3.2, `wild ${s.trail[i].toFixed(2)}, home ${s.trail[home].toFixed(2)}`);
});

test('standing orders: Ready sends every fighter, Guard half, Gather none; a daughter on Gather lays foragers', () => {
  const s = founded(); fighters(s, 10); s.daughters = [daughter(s, 'war', 200, { soldier: 20, forager: 5 })];
  let roll = SIM.musterRoll(s); assert.equal(roll[0].send, 5, 'your nest on Guard: half'); assert.equal(roll[1].send, 20, 'the War Camp starts Ready');
  SIM.setOrder(s, 'main', 'ready'); SIM.setOrder(s, 'war', 'gather'); roll = SIM.musterRoll(s);
  assert.equal(roll[0].send, 10); assert.equal(roll[1].send, 0);
  const d = s.daughters[0]; d.pop = {}; let soldiers = 0;
  for (let k = 0; k < 40; k++) { s.colony.store = 150; s.colony.protein = 100; d.eggT = 30; step(s, 0.05); soldiers += d.pop.soldier || 0; d.pop = {}; }
  assert.equal(soldiers, 0, 'Gather: only foragers');
});

test('a muster: your fighters and a far daughter’s march out, hold the spot, and go home when sent', () => {
  const s = founded(); fighters(s, 6); SIM.setOrder(s, 'main', 'ready'); s.daughters = [daughter(s, 'war', 60, { soldier: 8 })];
  const x = s.world.ex + 30, y = s.world.ey;
  assert.equal(SIM.musterLock(s), '');
  assert.ok(SIM.callMuster(s, x, y)); assert.equal(s.muster.sent, 14); assert.equal(s.daughters[0].pop.soldier, 0, 'her soldiers come out as real ants');
  assert.match(SIM.musterLock(s), /one muster/);
  step(s, 60, () => { s.colony.store = 150; s.colony.protein = 100; });
  const held = s.ants.filter((a) => a.muster && a.state === 'hold');
  assert.ok(s.muster.arrived >= 10 && held.length >= 10, `arrived ${s.muster.arrived}`);
  assert.ok(held.every((a) => Math.hypot(a.holdX / T - x, a.holdY / T - y) < 4));
  SIM.endMuster(s); assert.equal(s.muster, null);
  step(s, 90, () => { s.colony.store = 150; s.colony.protein = 100; });
  assert.ok((s.daughters[0].pop.soldier || 0) >= 5, `her soldiers folded back home (${s.daughters[0].pop.soldier})`);
});

test('a save keeps the stirred edges, the seams and a muster', () => {
  const s = founded(); s.daughters = ['war', 'garden', 'quarry'].map((k, i) => daughter(s, k, 200 + i * 10)); step(s, 3);
  s.muster = { x: 1, y: 2, t0: 0, sent: 3, from: {}, arrived: 1 };
  const r = SIM.deserialize(SIM.serialize(s));
  assert.ok(r.wild.stirred); assert.equal(r.wild.seams.length, 6); assert.equal(r.muster.sent, 3);
});
