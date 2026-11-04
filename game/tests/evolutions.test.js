// Build 24: every evolution node does something. A test for each family.
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
const room = (s, key, x0, y0) => { const R = SIM.ROOMS[key]; s.nest.rooms.push({ key, x0, y0, w: R.w, h: R.h }); };
function hatchN(s, caste, n) {
  const out = [];
  for (let i = 0; i < n; i++) { SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; Object.assign(a, { caste, state: 'in', rest: 0, goal: null, nx: SIM.SHAFT + 0.5, ny: 0.5, ntx: SIM.SHAFT, nty: 0, carry: 0 }); out.push(a); }
  return out;
}
const evo = (s, ...k) => { for (const x of k) s.colony.evo[x] = true; };

test('no node is a placeholder any more', async () => {
  const { EVO } = await import('../src/sim/growth.js');
  assert.deepEqual(EVO.filter((n) => n.soon).map((n) => n.name), []);
});

test('Majors and Supermajors: evolved, then laid from a Barracks; big and tough', () => {
  const s = founded();
  assert.match(SIM.eggLock(s, 'major'), /evolve Majors/);
  evo(s, 'cuticle', 'majors');
  assert.match(SIM.eggLock(s, 'major'), /Barracks/);
  room(s, 'barracks', 2, 6);
  assert.equal(SIM.eggLock(s, 'major'), '');
  assert.ok(SIM.CASTES.supermajor.hp > SIM.CASTES.major.hp && SIM.CASTES.major.hp > SIM.CASTES.soldier.hp);
});

test('an Exploder bursts when it dies, hurting rivals near it', () => {
  const s = founded();
  const [e] = hatchN(s, 'exploder', 1); e.state = 'fight'; e.x = 400; e.y = 400;
  SIM.stress(s, 1); const r = s.ants[s.ants.length - 1]; Object.assign(r, { team: 1, x: 410, y: 400, hp: 6 });
  SIM.killAnt(s, e, 'rival');
  assert.ok(r.hp <= -1 || r.state === 'dead', `rival at ${r.hp}`);
});

test('Honeypot vault: repletes hold food; Midden: Cordyceps spreads less', () => {
  const s = founded();
  evo(s, 'store2', 'store3', 'honeypot', 'midden', 'glands');
  room(s, 'honeypot', 2, 6); room(s, 'midden', 8, 6); room(s, 'store', 14, 6);
  const cap0 = SIM.storeCapOf(s);
  hatchN(s, 'replete', 3); hatchN(s, 'undertaker', 2);
  step(s, 6);
  assert.equal(SIM.storeCapOf(s), cap0 + 120);
  assert.ok(SIM.cordResist(s) <= 0.25 + 1e-9, `resist ${SIM.cordResist(s)}`);
});

test('nest nodes: a second queen, deep halls, architects', () => {
  const s = founded();
  room(s, 'hatchery', 2, 6); SIM.tick(s, 0.05);
  const h0 = SIM.hatchCapOf(s), q0 = SIM.queenCap(s.queen.level, s), r0 = SIM.roomCost(s, 'hatchery').food;
  evo(s, 'polygyny', 'deephalls', 'workshop3'); step(s, 0.1);
  assert.equal(SIM.hatchCapOf(s), h0 + 2);
  assert.equal(SIM.queenCap(s.queen.level, s), q0 + 20);
  assert.ok(SIM.roomCost(s, 'hatchery').food < r0, 'rooms cheaper');
});

test('honey economy: sugar pays when food is short', () => {
  const s = founded(), c = s.colony;
  c.store = 5; c.sugar = 50;
  assert.equal(SIM.canPay(c, { food: 30 }), false);
  evo(s, 'aphids', 'mealybugs', 'honeyeco');
  assert.equal(SIM.canPay(c, { food: 30 }), true);
});

test('Lineage: pick one line, for good', () => {
  const s = founded();
  assert.equal(SIM.pickLineage(s, 'acid'), false);
  evo(s, 'lineage');
  assert.equal(SIM.pickLineage(s, 'trapjaw'), true);
  assert.equal(SIM.pickLineage(s, 'acid'), false);
  assert.equal(s.colony.lineage, 'trapjaw');
});

test('senses: sun compass ranges further; war columns recruit 60; rain sense works in the rain', () => {
  const s = founded();
  const r0 = SIM.FORAGE[0].range;
  evo(s, 'suncompass', 'crews', 'crews2', 'warcolumns', 'nightsense');
  s.rain.on = true;
  const [f] = hatchN(s, 'forager', 1); f.thr.f = 0;
  s.colony.store = 0;
  assert.equal(SIM.forageRange(s), Math.round(r0 * 1.25));
  assert.equal(SIM.crewCap(s), 60);
  assert.ok(SIM.dutyNeed(s, f, 'food') > 0, 'still forages in the rain');
  delete s.colony.evo.nightsense;
  assert.equal(SIM.dutyNeed(s, f, 'food'), 0);
});

test('war camp: rivals killed near their nest drop food', () => {
  const s = founded(), w = s.world;
  evo(s, 'warcamp');
  SIM.stress(s, 1); const r = s.ants[s.ants.length - 1]; Object.assign(r, { team: 1, x: (w.rx + 3.5) * SIM.T, y: (w.ry + 2.5) * SIM.T });
  const n0 = s.items.length; SIM.killAnt(s, r, 'war');
  assert.ok(s.items.length === n0 + 1 && s.items[s.items.length - 1].kind === 'food');
});
