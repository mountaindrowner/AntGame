// Build 52: glowrock, the great evolutions' rare ingredient.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { EVO_BY } from '../src/sim/growth.js';

function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.critters = []; s.bugT = -1e9; s.strikeT = s.strikeT.map(() => 1e9); s.rain.next = 1e9;
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const builders = (s, n) => { SIM.stress(s, n); for (const a of s.ants.slice(-n)) Object.assign(a, { caste: 'builder', state: 'in', rest: 0, goal: null, nx: SIM.SHAFT + 0.5, ny: 0.5, ntx: SIM.SHAFT, nty: 0 }); };

test('every great evolution costs glowrock: 1, 2, or 5 for the Supercolony', () => {
  assert.equal(EVO_BY.titan.cost.glow, 1); assert.equal(EVO_BY.raft.cost.glow, 2); assert.equal(EVO_BY.supercolony.cost.glow, 5);
  assert.ok(!EVO_BY.longlived.cost.glow, 'the ordinary tree needs none');
});

test('a glowing rock in the bedrock takes about 25 minutes to prise out, however many dig', () => {
  const s = founded(), c = s.colony; Object.assign(c, { store: 300, cap: 2000, water: 100, waterCap: 100, protein: 100, grit: 300, genes: 50 }); s.queen.level = 2;
  s.nest.rooms.push({ key: 'workshop', x0: 14, y0: 10, w: 5, h: 3 }); SIM.openSection(s, 'd1');
  const [gx, gy] = SIM.GLOW_ROCKS.find(([x]) => x < 20);
  const D = (x, y) => { s.nest.cells[y * SIM.NW + x] = 1; }; for (let y = 0; y <= 47; y++) D(SIM.SHAFT, y); for (let x = Math.min(gx, SIM.SHAFT); x <= Math.max(gx, SIM.SHAFT); x++) D(x, 47); for (let y = 47; y < gy; y++) D(gx, y); s.nest.ver++;
  assert.equal(SIM.toggleDigOrder(s, gx, gy), 'added');
  const o = s.nest.digOrders.find((d) => d.x === gx && d.y === gy); assert.equal(o.need, SIM.GLOW_NEED); assert.ok(o.glow);
  builders(s, 8); o.progress = SIM.GLOW_NEED - 60; let t = 0;
  while (o.progress < o.need && t < 200) { c.store = 300; step(s, 1); t++; if (!s.nest.digOrders.includes(o)) break; }
  assert.ok(t >= 55, `8 builders still take a minute for the last 60 work (${t} s)`);
  assert.equal(c.glow, 1); assert.equal(s.banner.title, 'Glowrock');
});

test('the 9th, 10th and 11th guardians each leave one', () => {
  const s = founded(), c = s.colony; c.zones = {}; for (const Z of SIM.ZONES.slice(0, 8)) c.zones[Z.key] = 1; step(s, 3); assert.equal(c.glow || 0, 0);
  for (const Z of SIM.ZONES.slice(0, 11)) c.zones[Z.key] = 1; step(s, 3); assert.equal(c.glow, 3);
  step(s, 3); assert.equal(c.glow, 3, 'once each');
});

test('the Quarry mines one every 20 minutes once her Cutting hall stands', () => {
  const s = founded(), c = s.colony;
  s.daughters = [{ key: 'quarry', oid: 0, region: 0, ex: s.world.ex + 200, ey: s.world.ey, state: 'ready', tunnel: { progress: 1, need: 1 }, pop: {}, real: false, eggT: -1e9, hatched: 0, rooms: [{ key: 'cutting', done: true }, null], glowT: 1195 }];
  step(s, 6); assert.equal(c.glow, 1);
});

test('a save keeps glowrock', () => {
  const s = founded(); SIM.gainGlow(s, 2, 'dug');
  const r = SIM.deserialize(SIM.serialize(s)); assert.equal(r.colony.glow, 2); assert.equal(r.colony.glowTotal, 2);
});
