// Build 50: a daughter's own nest, her two rooms, the tree's top nodes gated to them, and travel by tunnel.
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
const hatchMix = (s, d, n) => { const got = {}; for (let i = 0; i < n; i++) { rich(s.colony); d.eggT = 30; d.pop = {}; step(s, 0.05); for (const k in d.pop) got[k] = (got[k] || 0) + d.pop[k]; } return got; };

const inside = (s) => { const P = s.player, a = P.ant; P.inNest = true; P.nestKey = null; a.state = 'nest'; a.nx = SIM.SHAFT + 0.5; a.ny = 0.5; };
const finish = (s, d) => { for (const r of d.rooms) if (r && !r.done) r.progress = 1e9; step(s, 0.1); };

test('her nest: a shaft, her queen’s chamber, a hatchery and two empty chambers', () => {
  const s = founded(), d = join(s, 'war'), n = SIM.daughterNest(d);
  assert.deepEqual(n.rooms.map((r) => r.key), ['queen', 'hatchery', 'dslot', 'dslot']);
  for (const r of n.rooms) assert.equal(n.cells[(r.y0 + r.h - 1) * SIM.NW + r.x0], 1, r.key + ' is dug');
  assert.equal(n.cells[0 * SIM.NW + SIM.SHAFT], 1, 'the shaft');
});

test('travel by tunnel: from inside your nest to hers and back; out at her door; in again at her door', () => {
  const s = founded(), d = join(s, 'war'), P = s.player, a = P.ant;
  P.inNest = false; a.state = 'player';
  assert.match(SIM.travelLock(s, 'war'), /inside a nest/);
  inside(s); assert.equal(SIM.travelLock(s, 'war'), '');
  assert.ok(SIM.travel(s, 'war')); assert.equal(P.nestKey, 'war');
  step(s, 1); assert.equal(d.real, true, 'inside her nest her ants are real');
  assert.ok(s.ants.filter((q) => q.dh === 'war' && q.state === 'in').every((q) => q.nx > 10 && q.ny > 5), 'resting in her chambers, not at the main shaft');
  P.exiting = true; step(s, 0.1);
  assert.equal(P.inNest, false); assert.equal(P.nestKey, null);
  assert.ok(Math.hypot(a.tx - d.ex, a.ty - d.ey) < 1, 'out at her door');
  P.enterReq = true; P.enterKey = 'war'; step(s, 0.2);
  assert.equal(P.inNest, true); assert.equal(P.nestKey, 'war');
  assert.ok(SIM.travel(s, null)); assert.equal(P.nestKey, null); assert.ok(P.inNest);
});

test('her rooms: built only from inside her nest, the seat first, paid from your stores, then they go up', () => {
  const s = founded(), d = join(s, 'quarry'), c = s.colony; rich(c); c.grit = 200; c.store = 200; c.cap = 400;
  assert.match(SIM.dRoomLock(s, 'quarry', 'cutting'), /go into her nest/);
  inside(s); SIM.travel(s, 'quarry');
  assert.match(SIM.dRoomLock(s, 'quarry', 'cellar'), /Cutting hall first/);
  const f = c.store; assert.ok(SIM.buildDRoom(s, 'quarry', 'cutting')); assert.equal(c.store, f - 120);
  assert.match(SIM.dRoomLock(s, 'quarry', 'cutting'), /being built/);
  step(s, 30); assert.ok(!SIM.dRoomBuilt(s, 'cutting'));
  step(s, 32); assert.ok(SIM.dRoomBuilt(s, 'cutting'), 'a Quarry builds her 90 s room in 60');
  assert.equal(SIM.daughterNest(d).rooms[2].key, 'cutting');
});

test('the tree’s top nodes need her seat room; nodes a save owns stay owned', () => {
  const s = founded(), c = s.colony; c.evo.heat = true;
  assert.match(SIM.evoLock(s, 'longlived'), /Brood Hall’s Royal nursery/);
  c.evo.suncompass = true; assert.equal(SIM.evoLock(s, 'suncompass'), 'owned');
  const d = join(s, 'brood'); d.rooms = [{ key: 'royalnursery', done: true }, null];
  assert.equal(SIM.evoLock(s, 'longlived'), '');
  s.nest.rooms.push({ key: 'fungus', x0: 14, y0: 10, w: 5, h: 3 }); c.roomLv = { fungus: 2 };
  assert.match(SIM.roomUpLock(s, 'fungus'), /Greenhouse/);
});

test('her specialty rooms: Brood cells hold 75; the Map room 15% range; the Rock cellar and Honeydew vault double', () => {
  let s = founded(), d = join(s, 'brood');
  assert.equal(SIM.dcap(s, d), 50); d.rooms = [{ key: 'royalnursery', done: true }, { key: 'broodcells', done: true }]; assert.equal(SIM.dcap(s, d), 75);
  s = founded(); const r0 = SIM.forageRange(s); d = join(s, 'watch'); d.rooms = [{ key: 'lookout', done: true }, { key: 'maproom', done: true }];
  assert.equal(SIM.forageRange(s), Math.round(r0 * 1.15));
  s = founded(); d = join(s, 'quarry'); d.rooms = [{ key: 'cutting', done: true }, { key: 'cellar', done: true }]; d.pop = { builder: 20, forager: 20 }; d.eggT = -1e9;
  const g = s.colony.grit; for (let i = 0; i < 60; i++) { rich(s.colony); step(s, 1); }
  assert.ok(Math.abs(s.colony.grit - g - 20) <= 1, `about 20 stone (${s.colony.grit - g})`);
});

test('the Mess hall: the War Camp’s fighters eat a quarter less meat', () => {
  const eat = (mess) => { const s = founded(), d = join(s, 'war'); d.pop = { soldier: 40 }; d.eggT = -1e9; if (mess) d.rooms = [{ key: 'drill', done: true }, { key: 'mess', done: true }];
    const c = s.colony; let used = 0; for (let i = 0; i < 60; i++) { c.store = 150; c.protein = 200; step(s, 1); used += 200 - c.protein; } return used; };
  const a = eat(false), b = eat(true);
  assert.ok(b < a * 0.85, `${a.toFixed(1)} -> ${b.toFixed(1)}`);
});

test('a save keeps where you are and her rooms', () => {
  const s = founded(); const d = join(s, 'garden'); inside(s); SIM.travel(s, 'garden'); d.rooms = [{ key: 'greenhouse', done: false, progress: 40 }, null];
  const r = SIM.deserialize(SIM.serialize(s));
  assert.equal(r.player.nestKey, 'garden'); assert.equal(r.daughters[0].rooms[0].progress, 40);
});
