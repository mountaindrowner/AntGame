// Build 60: the code audit. Each test pins a bug the audit found.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const { T } = SIM;
// Seeded, so a run is repeatable.
let seed = 60; Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
function founded(s0 = 7) {
  const s = SIM.create(s0), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.critters = []; s.bugT = -1e9; s.strikeT = s.strikeT.map(() => 1e9); s.rain.next = 1e9;
  return s;
}
const step = (s, sec, f) => { for (let i = 0; i < sec * 20; i++) { if (f) f(); SIM.tick(s, 0.05); } };
const daughter = (s, key, dx, pop) => ({ key, oid: 0, region: 0, ex: s.world.ex + dx, ey: s.world.ey, state: 'ready', tunnel: { progress: 1, need: 1 }, pop: pop || {}, real: false, eggT: -1e9, hatched: 0, rooms: [null, null] });
const fed = (s) => () => { s.colony.store = 150; s.colony.protein = 100; s.colony.water = s.colony.waterCap; };

test('a raid ends even when the raiders\' queen dies while it is out', () => {
  const s = founded();
  s.raidLive = true; s.raidStart = { team: 1, lost: 0, killed: 0, stolen: 0, crits: 0 }; s.rivals[0].queenAlive = false;
  step(s, 15);
  assert.equal(s.raidLive, false, 'other colonies can raid again');
});

test('a muster survives a save: End muster still finds its troops', () => {
  const s = founded(); SIM.stress(s, 6);
  for (const a of s.ants.slice(-6)) Object.assign(a, { caste: 'soldier', state: 'in', rest: 0, goal: null, nx: SIM.SHAFT + 0.5, ny: 0.5 });
  SIM.setOrder(s, 'main', 'ready'); s.daughters = [daughter(s, 'war', 60, { soldier: 8 })];
  SIM.callMuster(s, s.world.ex + 30, s.world.ey); step(s, 60, fed(s));
  const r = SIM.deserialize(SIM.serialize(s)), held = r.ants.filter((a) => a.state === 'hold').length;
  assert.ok(held > 0);
  assert.equal(SIM.endMuster(r), held);
});

test('a famine kills no faster with daughters far away than near', () => {
  const s = founded(); s.colony.evo.stomach = false;
  s.daughters = ['war', 'garden', 'quarry', 'brood'].map((k, i) => daughter(s, k, 300 + i * 20, { forager: 10 }));
  for (const d of s.daughters) d.eggT = -1e12; // no new eggs
  const total = () => s.ants.filter((a) => !a.team && a.state !== 'dead').length + s.daughters.reduce((n, d) => n + Object.values(d.pop).reduce((a, b) => a + b, 0), 0);
  const before = total(); step(s, 130, () => { s.colony.store = -1; });
  const lost = before - total();
  assert.ok(lost >= 4 && lost <= 12, `one death per 10 s of famine after the first 30 s, near and far together (lost ${lost})`);
});

test('an infected ant left alone in the yard still rots away', () => {
  const s = founded(); const far = { x: (s.world.ex + 300) * T, y: s.world.ey * T };
  SIM.spawnZbug(s, far.x, far.y); const z = s.critters[s.critters.length - 1];
  step(s, 125, fed(s));
  assert.ok(!s.critters.includes(z), 'gone after two minutes');
});

test('walking away from a daughter keeps what her ants carried, and her veterans', () => {
  const s = founded(), P = s.player, me = P.ant, d = daughter(s, 'war', 45, { soldier: 3 });
  P.inNest = false; Object.assign(me, { state: 'player', x: (s.world.ex + 40) * T, y: s.world.ey * T }); me.tx = Math.floor(me.x / T); me.ty = Math.floor(me.y / T); s.daughters = [d];
  step(s, 1, fed(s)); assert.ok(d.real, 'near: real ants');
  const [vet, porter] = s.ants.filter((a) => a.dh === 'war');
  Object.assign(vet, { name: 'Bristle', xp: 300 }); Object.assign(porter, { carry: 6, kind: 'protein', itype: 'beetle' });
  const protein = s.colony.protein = 10;
  d.ex += 500; step(s, 0.1); assert.ok(!d.real, 'far: numbers');
  assert.ok(s.colony.protein > protein + 5.9, 'the meat reached the store (less a moment of upkeep)');
  d.ex -= 500; step(s, 0.1);
  const back = s.ants.find((a) => a.dh === 'war' && a.name === 'Bristle');
  assert.ok(back && back.xp === 300, 'Bristle came back as herself');
});
