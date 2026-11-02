// Build 34: the praying mantis, guardian of the Hedge Row.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { GUARDIANS } from '../src/sim/growth.js';

const T = SIM.T;
function hedge(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9;
  s.active[SIM.REGION.hedge3] = true; for (let i = 0; i < 4; i++) SIM.tick(s, 0.05);
  const b = s.bosses.mantis; assert.ok(b, 'the mantis has a lair in the hedge');
  return { s, b };
}
function ant(s, x, y, extra = {}) { const me = s.player.ant, o = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 60, state: 'patrol', foeId: 0, x, y, ...extra }; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); s.ants.push(o); return o; }
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each()) return true; } return false; };
const strikeAt = (b, len = 4.8) => { b.mode = 'fight'; b.hidden = false; b.dx = 1; b.dy = 0; b.cd = 9; b.atk = { kind: 'lane', x: b.x, y: b.y, dx: 1, dy: 0, len: len * T, w: 2.2 * T, t: 0, at: 0.1 }; };

test('the mantis rules the Hedge Row', () => {
  for (const k of ['hedge1', 'hedge3', 'hedge6']) assert.match(GUARDIANS[k][0], /mantis/, k);
});

test('hidden until an ant comes close', () => {
  const { s, b } = hedge();
  step(s, 0.5); assert.equal(b.hidden, true);
  ant(s, b.x + 3 * T, b.y); step(s, 1);
  assert.equal(b.hidden, false); assert.equal(b.mode, 'fight');
});

test('a strike takes the first two ants in its lane; left alone, it eats them', () => {
  const { s, b } = hedge();
  const a1 = ant(s, b.x + 1.5 * T, b.y), a2 = ant(s, b.x + 2.5 * T, b.y), a3 = ant(s, b.x + 3.5 * T, b.y);
  strikeAt(b); step(s, 0.2);
  assert.ok(b.eat); assert.deepEqual(b.eat.ids.sort(), [a1.id, a2.id].sort());
  assert.equal(a3.state === 'away', false, 'only two');
  assert.equal(SIM.bossArmour(s, b, {}), 2, 'eating: bites double');
  for (const o of s.ants) if (!o.team && o !== a1 && o !== a2) o.x = o.y = -1e5;
  step(s, 4.5);
  assert.equal(a1.state, 'dead'); assert.equal(a2.state, 'dead');
});

test('bite it hard, or lock it, and it drops its meal alive', () => {
  const { s, b } = hedge();
  const a1 = ant(s, b.x + 1.5 * T, b.y, { caste: 'forager', hp: 3 });
  strikeAt(b); step(s, 0.2); assert.ok(b.eat);
  b.hp -= 45; step(s, 0.1);
  assert.ok(!b.eat && a1.state !== 'away' && a1.state !== 'dead', 'dropped by damage');
  const a2 = ant(s, b.x + 1.5 * T, b.y, { caste: 'forager', hp: 3 });
  strikeAt(b); step(s, 0.2); assert.ok(b.eat);
  b.stunned = s.t + 1.5; step(s, 0.1);
  assert.ok(!b.eat && a2.state !== 'away', 'dropped by a lock');
});

test('beaten: the claw (first bite always lands, double), and the hedge is quick to cross', () => {
  const { s, b } = hedge();
  b.mode = 'fight'; b.hidden = false; b.hp = 2;
  for (let i = 0; i < 6; i++) ant(s, b.x - 1.5 * T, b.y + (i - 3) * 0.5 * T);
  step(s, 2, () => b.dead);
  assert.ok(b.dead && s.colony.trophies.claw && s.colony.kills.mantis === 1);
  SIM.duelGangs(s);
  const a = ant(s, 0, 0, { caste: 'forager' }), o = ant(s, 0, 0, { team: 1, caste: 'soldier', hp: 1e6 });
  assert.equal(SIM.swing(s, a, o), 'crit', 'first bite');
});
