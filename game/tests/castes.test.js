// Build 74 (Phase 4): your ant plays its kind, and a crew gathers with you.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

let seed = 99; const rnd0 = Math.random; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
test.after(() => { Math.random = rnd0; });

const T = SIM.T;
function outside(n, caste = 'forager') {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  const P = s.player; P.ntx = SIM.SHAFT; P.nty = 0; P.exiting = true;
  for (let i = 0; i < 600 && P.inNest; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9; s.rain.next = 1e9;
  const me = P.ant; me.caste = caste;
  for (let i = 0; i < n; i++) s.ants.push({ ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'forager', hp: 2, state: 'patrol', foeId: 0, carry: 0 });
  P.tx = me.x; P.ty = me.y; if (n) SIM.recruit(s, n);
  return { s, P, me };
}
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each) each(); } };

test('your load by your kind', () => {
  const { s, me } = outside(0);
  const crumb = { kind: 'food', type: 'crumb' }, leaf = { kind: 'food', type: 'apple' };
  assert.equal(SIM.youLoad(s, me, crumb), 8, 'forager');
  me.caste = 'builder'; assert.equal(SIM.youLoad(s, me, crumb), 5);
  me.caste = 'harvester'; assert.equal(SIM.youLoad(s, me, crumb), 10, 'seed, double'); assert.equal(SIM.youLoad(s, me, leaf), 5);
  me.caste = 'replete'; assert.equal(SIM.youLoad(s, me, leaf), 12);
});

test('your crew gathers water with you and delivers it when you do', () => {
  const { s, P, me } = outside(5);
  // Away from the door (nearer it, everyone delivers at once): ten tiles off on open ground.
  const W = SIM.W, open = (x, y) => !s.world.blocked[y * W + x];
  let gx = s.world.ex + 10, gy = s.world.ey; for (let k = 0; k < 12 && !open(gx, gy); k++) gy += k % 2 ? k : -k;
  for (const a of s.ants.filter((o) => o.follow || o === me)) { a.x = (gx + 0.5) * T; a.y = (gy + 0.5) * T; a.tx = gx; a.ty = gy; }
  step(s, 2, () => { P.tx = me.x; P.ty = me.y; });
  const x = me.tx, y = me.ty;
  // Three drops beside you, a load or two each.
  for (const [dx, dy] of [[0, 0], [2, 0], [0, 2], [-2, 1]]) s.items.push({ x: x + dx, y: y + dy, amt: 6, kind: 'water', type: 'puddle' });
  SIM.doAction(s);
  assert.ok(me.carry > 0 && me.kind === 'water', 'you carry water');
  const crew = s.ants.filter((a) => a.follow);
  assert.ok(crew.filter((a) => a.fetch).length >= 3, `${crew.filter((a) => a.fetch).length} sent to fetch`);
  step(s, 8, () => { P.tx = me.x; P.ty = me.y; });
  const carrying = crew.filter((a) => a.carry > 0 && a.kind === 'water').length;
  assert.ok(carrying >= 3, `${carrying} carrying`);
  assert.ok(crew.every((a) => a.follow), 'still a crew');
  // Home: everyone delivers.
  const w = s.world, before = s.colony.water; s.colony.waterCap = 999;
  step(s, 40, () => { P.tx = (w.ex + 0.5) * T; P.ty = (w.ey + 0.5) * T; P.holding = true; });
  assert.ok(s.colony.water - before >= 4 * 4, `+${s.colony.water - before} water`);
});

test('a medic you play heals your crew round it', () => {
  const { s, P, me } = outside(3, 'medic');
  const crew = s.ants.filter((a) => a.follow); for (const a of crew) { a.caste = 'soldier'; a.hp = 1; }
  step(s, 6, () => { P.tx = me.x; P.ty = me.y; });
  assert.ok(crew.every((a) => a.hp > 3), crew.map((a) => a.hp.toFixed(1)).join(','));
});
