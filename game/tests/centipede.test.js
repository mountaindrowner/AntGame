// Build 36: the giant centipede, guardian of the Rot.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { GUARDIANS } from '../src/sim/growth.js';

const T = SIM.T;
function rot(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9;
  s.active[SIM.REGION.leaves2] = true; for (let i = 0; i < 4; i++) SIM.tick(s, 0.05);
  const b = s.bosses.centipede; assert.ok(b, 'the centipede, deep in the leaves');
  return { s, b };
}
function ant(s, x, y, extra = {}) { const me = s.player.ant, o = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 60, state: 'patrol', foeId: 0, x, y, ...extra }; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); s.ants.push(o); return o; }
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each()) return true; } return false; };

test('the centipede rules the Rot', () => {
  for (const k of ['leaves', 'leaves2', 'compost']) assert.match(GUARDIANS[k][0], /centipede/, k);
});

test('every 90 damage cuts a segment off: meat drops, and it speeds up', () => {
  const { s, b } = rot(); b.mode = 'fight'; b.cd = 99;
  step(s, 0.1); assert.equal(b.segs, 6);
  const meat0 = s.items.filter((f) => f.type === 'boss').length;
  b.hp -= 100; step(s, 0.1);
  assert.equal(b.segs, 4 + 1); assert.ok(s.items.filter((f) => f.type === 'boss').length > meat0, 'a chunk of meat');
  b.hp = 150; step(s, 0.1); assert.equal(b.segs, 2); assert.equal(b.phase, 2, 'frantic at two');
});

test('coiled, its joints are open: bites double', () => {
  const { s, b } = rot(); b.mode = 'fight';
  b.atk = { kind: 'ring', x: b.x, y: b.y, r: 3.4 * T, t: 0, at: 1 };
  assert.equal(SIM.bossArmour(s, b, {}), 2);
});

test('it rushes down the lane it showed, biting what is in it', () => {
  const { s, b } = rot(); b.mode = 'fight'; b.cd = 99;
  const a = ant(s, b.x + 4 * T, b.y, { caste: 'forager', hp: 3 });
  b.atk = { kind: 'lane', x: b.x, y: b.y, dx: 1, dy: 0, len: 8 * T, w: 1.8 * T, t: 0, at: 0.1 };
  step(s, 1.5);
  assert.ok(a.state === 'dead' || a.hp < 3, 'bitten in passing');
});

test('beaten: venom ants stun what they bite', () => {
  const { s, b } = rot(); b.mode = 'fight'; b.hp = 2;
  for (let i = 0; i < 6; i++) ant(s, b.x - 1.4 * T, b.y + (i - 3) * 0.4 * T);
  step(s, 2, () => b.dead);
  assert.ok(b.dead && s.colony.trophies.fang2 && s.colony.kills.centipede === 1);
  SIM.duelGangs(s);
  const v = ant(s, 0, 0, { caste: 'venom' }), o = ant(s, 0, 0, { team: 1, caste: 'forager', hp: 1e6 });
  const real = Math.random; let i = 0; Math.random = () => ([4, 1][i++ % 2] - 1) / 6 + 0.01;
  try { SIM.swing(s, v, o); } finally { Math.random = real; }
  assert.ok(o.stunned > s.t);
});
