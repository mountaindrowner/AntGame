// Build 68: fixes from playtest 3 (Mark and his brother, Nov 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function outside(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  const P = s.player; P.ntx = SIM.SHAFT; P.nty = 0; P.exiting = true;
  for (let i = 0; i < 600 && P.inNest; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.critters = [];
  return s;
}
const addAnts = (s, n) => { const me = s.player.ant; for (let i = 0; i < n; i++) s.ants.push({ ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 30, state: 'patrol', foeId: 0 }); };

test('the crew cap holds across presses, holding ants included', () => {
  const s = outside(); addAnts(s, 40);
  const cap = SIM.crewCap(s);
  assert.equal(SIM.recruit(s, 15), 15);
  assert.equal(SIM.recruit(s, 15), cap - 15, 'the second press only fills up to the cap');
  assert.equal(SIM.recruit(s, 5), 0, 'a full crew takes no more');
  SIM.crewHold(s, s.player.ant.x + 3 * SIM.T, s.player.ant.y, true);
  assert.equal(SIM.recruit(s, 5), 0, 'ants holding a spot still count');
  SIM.release(s);
  assert.equal(SIM.recruit(s, 5), 5);
});

test('the mower warns without a notice: it marks the time for the UI', () => {
  const s = outside(); s.mower.next = s.t; s.dayT = SIM.DAY * 0.3; s.player.msg = '';
  SIM.tick(s, 0.05);
  assert.equal(s.mower.state, 'warn');
  assert.ok(s.player.mowerAt > 0); assert.ok(!/mower/i.test(s.player.msg || ''));
});

test('build 69: an empty stomach drains your health instead of killing you at once', () => {
  const s = outside(); const a = s.player.ant;
  a.x += 8 * SIM.T; a.tx = Math.floor(a.x / SIM.T); s.player.tx = null; s.ants = s.ants.filter((o) => o === a || o.team || o.state !== 'return'); // away from home and foragers
  s.player.hunger = 0.01; const hp0 = a.hp;
  for (let i = 0; i < 40; i++) SIM.tick(s, 0.05);
  assert.equal(s.player.ant, a, 'still alive two seconds in');
  assert.ok(a.hp < hp0 - 1, 'losing health'); assert.ok(s.player.starving);
  for (let i = 0; i < 200 && s.player.ant; i++) SIM.tick(s, 0.05);
  assert.equal(s.player.ant, null, 'starved within ten seconds'); assert.equal(s.player.deathCause, 'hunger');
});
