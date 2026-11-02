// Build 35: the black widow, guardian of the Side Yard.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { GUARDIANS } from '../src/sim/growth.js';

const T = SIM.T;
function shed(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9;
  s.active[SIM.REGION.shed] = true; for (let i = 0; i < 4; i++) SIM.tick(s, 0.05);
  const b = s.bosses.widow; assert.ok(b && b.web, 'the widow and her web, by the shed');
  return { s, b };
}
function ant(s, x, y, extra = {}) { const me = s.player.ant, o = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 60, state: 'patrol', foeId: 0, x, y, ...extra }; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); s.ants.push(o); return o; }
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each()) return true; } return false; };

test('the widow rules the Side Yard and the Shed', () => {
  for (const k of ['shed', 'side2', 'side3', 'side4']) assert.match(GUARDIANS[k][0], /widow/, k);
});

test('her web holds an ant that walks into it', () => {
  const { s, b } = shed();
  const a = ant(s, b.web.x + 2 * T, b.web.y); step(s, 0.1);
  assert.ok(a.webT > s.t && a.lockT > 0, 'stuck');
});

test('up in her web she is hard to hurt; cut all four anchors and she falls, bites double', () => {
  const { s, b } = shed();
  assert.ok(SIM.bossArmour(s, b, {}) < 0.5);
  b.mode = 'fight'; b.cd = 99;
  // Three ants holding at each anchor (patrolling ones would wander off).
  for (const an of b.web.anchors) { for (let i = 0; i < 3; i++) ant(s, an.x + (i - 1) * 0.4 * T, an.y, { webFree: 1e9, follow: true, state: 'hold', holdX: an.x, holdY: an.y }); }
  step(s, 8, () => b.grounded);
  assert.ok(b.grounded, 'on the floor'); assert.equal(SIM.bossArmour(s, b, {}), 2);
  b.groundT = 0.05; step(s, 0.2);
  assert.ok(!b.grounded && b.web.anchors.every((a) => a.hp > 0), 'climbs back, new web');
});

test('her bite comes at a red dot and is deadly', () => {
  const { s, b } = shed();
  const a = ant(s, b.x + 2 * T, b.y, { caste: 'forager', hp: 6, webFree: 1e9 });
  b.mode = 'fight'; b.cd = 0;
  let saw = false; step(s, 2, () => { if (b.atk && b.atk.what === 'bite') saw = true; return a.state === 'dead'; });
  assert.ok(saw, 'a bite was shown'); assert.equal(a.state, 'dead');
});

test('a web anchor can be targeted by your crew', () => {
  const { s, b } = shed();
  const an = b.web.anchors[0], e = SIM.enemyAt(s, an.x, an.y);
  assert.ok(e && e.kind === 'anchor');
});

test('beaten: her silk at your door, and no bug spray by the shed', () => {
  const { s, b } = shed();
  b.mode = 'fight'; b.grounded = true; b.groundT = 99; b.hp = 2;
  for (let i = 0; i < 6; i++) ant(s, b.x - 1.2 * T, b.y + (i - 3) * 0.4 * T, { webFree: 1e9 });
  step(s, 2, () => b.dead);
  assert.ok(b.dead && s.colony.trophies.widowsilk && s.colony.kills.widow === 1);
});
