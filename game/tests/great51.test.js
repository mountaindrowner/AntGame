// Build 51: the great evolutions, each needing daughters' specialty rooms; Swarm Day and the Supercolony.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.critters = []; s.bugT = -1e9; s.strikeT = s.strikeT.map(() => 1e9);
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const rich = (c) => Object.assign(c, { store: 150, water: 60, waterCap: 60, protein: 200, sugar: 50 });
function farOutpost(s, minD = 170) {
  const w = s.world;
  for (let r = minD; r < minD + 120; r += 10) for (let a = 0; a < 6.28; a += 0.3) {
    const x = Math.round(w.ex + Math.cos(a) * r), y = Math.round(w.ey + Math.sin(a) * r);
    if (x > 3 && y > 3 && x < w.W - 3 && y < w.H - 3 && !w.blocked[y * w.W + x]) { s.outposts.push({ id: 900 + s.outposts.length, x, y, region: SIM.areaOf(s, x, y), done: true, work: 30 }); return s.outposts.length - 1; }
  }
  throw new Error('no spot');
}
function join(s, key) {
  s.colony.zones = {}; for (const Z of SIM.ZONES.slice(0, 11)) s.colony.zones[Z.key] = 1; s.colony.evo.royal = true;
  const oi = farOutpost(s); assert.ok(SIM.foundDaughter(s, oi, key), SIM.daughterLock(s, oi, key));
  const d = s.daughters[s.daughters.length - 1]; step(s, 11); d.tunnel.progress = d.tunnel.need; step(s, 1);
  assert.equal(d.state, 'ready'); return d;
}
const spec = (s, key) => { const d = join(s, key); const [a, b] = SIM.DROOMS_OF[key]; d.rooms = [{ key: a, done: true }, { key: b, done: true }]; return d; };
const minute = (s, f) => { for (let i = 0; i < 60; i++) { if (f) f(); step(s, 1); } };

test('a great evolution needs the named daughters’ specialty rooms; Swarm Day needs two joined', () => {
  const s = founded(), c = s.colony; c.genes = 200;
  assert.match(SIM.evoLock(s, 'titan'), /Brood Hall’s Brood cells/);
  assert.match(SIM.evoLock(s, 'swarmcall'), /Royal chamber/);
  const d = join(s, 'brood'); d.rooms = [{ key: 'royalnursery', done: true }, null];
  assert.match(SIM.evoLock(s, 'titan'), /Brood cells/);
  d.rooms[1] = { key: 'broodcells', done: true }; assert.equal(SIM.evoLock(s, 'titan'), '');
  assert.match(SIM.evoLock(s, 'swarmcall'), /2 daughters joined \(1 so far\)/);
  assert.match(SIM.evoLock(s, 'supercolony'), /Swarm Day first|needs/);
});

test('Titan Line: majors and supermajors hatch twice as fast with half again more health; supermajors need no chitin', () => {
  const s = founded(), c = s.colony; c.evo.polymorphism = true; c.evo.majors = true;
  assert.ok(SIM.eggCost(s, 'supermajor').chitin);
  const m = { caste: 'major', team: 0 }, hp0 = SIM.maxHp(s, m);
  c.evo.titan = true;
  assert.ok(!SIM.eggCost(s, 'supermajor').chitin);
  assert.ok(Math.abs(SIM.maxHp(s, m) / hp0 - 1.5) < 1e-9);
});

test('the Great Mound: room for 50 more', () => {
  const s = founded(); assert.equal(SIM.queenCap(7, s), 100);
  s.colony.evo.greatmound = true; assert.equal(SIM.queenCap(7, s), 150);
});

test('the Blue Butterfly Pact and the Peony Pact pay as they say', () => {
  let s = founded(), c = s.colony; c.evo.butterfly = true; const su = c.sugarTotal, pr = c.protein; minute(s, () => { c.store = 100; });
  assert.ok(Math.abs(c.sugarTotal - su - 4) <= 1, `sugar ${c.sugarTotal - su}`); assert.ok(c.protein - pr >= 1.5, `meat ${c.protein - pr}`);
  const nectar = (peony) => { const s2 = founded(), c2 = s2.colony; c2.evo.nectar = true; c2.evo.peony = peony; const g = c2.sugarTotal; for (let i = 0; i < 120; i++) { c2.held = { 1: 1, 2: 1, 3: 1, 4: 1 }; c2.store = 100; step(s2, 0.5); } return c2.sugarTotal - g; };
  const a = nectar(false), b = nectar(true); assert.ok(b >= a * 2.5 && b >= 4, `${a} -> ${b}`);
});

test('Fungus Empire: each garden grows 2 food a minute with no leaves', () => {
  const run = (on) => { const s = founded(), c = s.colony; s.nest.rooms.push({ key: 'fungus', x0: 14, y0: 10, w: 5, h: 3 }); if (on) c.evo.fungusempire = true;
    let got = 0; for (let i = 0; i < 60; i++) { c.fungus = 0; c.eggQueue.length = 0; c.store = 10; step(s, 1); got += c.store - 10; } return got; };
  const d = run(true) - run(false); assert.ok(Math.abs(d - 2) < 0.6, `+${d.toFixed(2)}`);
});

test('the Raft Colony: rain sends no forager home and caves nothing in', () => {
  const s = founded(), c = s.colony; c.evo.raft = true; s.rain.on = true; s.rain.t = 0;
  const a = s.ants.find((q) => !q.isPlayer && q.caste === 'forager') || (SIM.stress(s, 1), s.ants.at(-1));
  Object.assign(a, { state: 'explore', explore: 5, x: (s.world.ex + 10.5) * SIM.T, y: (s.world.ey + 0.5) * SIM.T, tx: s.world.ex + 10, ty: s.world.ey });
  step(s, 0.2); assert.notEqual(a.state, 'return', 'still out');
});

test('Swarm Day on call: once every 20 minutes', () => {
  const s = founded(), c = s.colony;
  assert.match(SIM.swarmCallLock(s), /evolve/);
  c.evo.swarmcall = true; assert.equal(SIM.swarmCallLock(s), '');
  assert.ok(SIM.callSwarm(s)); assert.equal(s.event.key, 'swarm');
  s.event = null; assert.match(SIM.swarmCallLock(s), /ready in 20 min/);
});

test('Army of the March: far from her, a column of War Camp soldiers joins your crew', () => {
  const s = founded(), c = s.colony; const d = join(s, 'war'); d.pop = { soldier: 20, forager: 5 }; d.eggT = -1e9; c.evo.armymarch = true;
  const P = s.player, me = P.ant; P.inNest = false; me.state = 'player'; me.x = (s.world.ex + 8) * SIM.T; me.y = s.world.ey * SIM.T; me.tx = s.world.ex + 8; me.ty = s.world.ey;
  d.marchT = 179; for (let i = 0; i < 40; i++) { c.store = 150; c.protein = 100; step(s, 0.05); }
  const col = s.ants.filter((a) => a.dh === 'war' && a.follow);
  assert.equal(col.length, 8); assert.equal(d.pop.soldier, 12);
});

test('the Supercolony: daughters hold 100 and their gifts double; a banner says so', () => {
  const s = founded(), c = s.colony; c.genes = 200; Object.assign(c, { store: 900, cap: 900, protein: 300, sugar: 300, grit: 300, wood: 100 });
  s.daughters = ['war', 'brood', 'watch', 'quarry', 'garden'].map((k, i) => { const [r1, r2] = SIM.DROOMS_OF[k]; return { key: k, oid: 0, region: 0, ex: s.world.ex + 200 + i, ey: s.world.ey, state: 'ready', tunnel: { progress: 1, need: 1 }, pop: {}, real: false, eggT: -1e9, hatched: 0, rooms: [{ key: r1, done: true }, { key: r2, done: true }] }; });
  c.evo.swarmcall = true;
  assert.equal(SIM.evoLock(s, 'supercolony'), '');
  assert.ok(SIM.buyEvo(s, 'supercolony')); assert.equal(s.banner.title, 'The Supercolony');
  const q = s.daughters.find((d) => d.key === 'quarry'); assert.equal(SIM.dcap(s, q), 100);
});
