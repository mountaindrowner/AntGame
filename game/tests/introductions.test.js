// Build 78: a boss's (or a champion's) introduction is raised once, when you're within fighting range of it awake.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function outside() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  const P = s.player; P.ntx = SIM.SHAFT; P.nty = 0; P.exiting = true;
  for (let i = 0; i < 600 && P.inNest; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9;
  return { s, P, me: P.ant };
}
const put = (a, x, y) => { a.x = x; a.y = y; a.tx = Math.floor(x / T); a.ty = Math.floor(y / T); };

test('a boss is introduced once: awake, and you within 22 tiles', () => {
  const { s, me } = outside();
  SIM.tick(s, 0.05); const key = Object.keys(s.bosses)[0], b = s.bosses[key];
  put(me, b.x + 15 * T, b.y); SIM.tick(s, 0.05);
  assert.ok(!s.introSeq, 'asleep: not yet');
  b.mode = 'fight'; SIM.tick(s, 0.05);
  assert.ok(s.introSeq && s.introSeq.kind === 'boss' && s.introSeq.key === key, 'introduced');
  const first = s.introSeq; b.mode = 'idle'; SIM.tick(s, 0.05); b.mode = 'fight'; SIM.tick(s, 0.05);
  assert.equal(s.introSeq, first, 'only once');
});

test('a war party’s champion is introduced when you come within 22 tiles', () => {
  const { s, me } = outside();
  SIM.startEvent(s, 'warparty'); SIM.tick(s, 0.05);
  const c = s.ants.find((a) => a.champion); assert.ok(c, 'a champion');
  put(me, c.x + 40 * T, c.y); SIM.tick(s, 0.05); assert.ok(!s.introSeq || s.introSeq.kind !== 'champ', 'far: not yet');
  put(me, c.x + 10 * T, c.y); SIM.tick(s, 0.05);
  assert.ok(s.introSeq && s.introSeq.kind === 'champ' && s.introSeq.id === c.id && s.introSeq.name === c.name);
});
