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

test('build 71: Defend calls the next six nearest home, fighters first, with a cooldown', () => {
  const s = outside(); const c = s.colony, T = SIM.T;
  // Ants out in the yard, some far, some near; a rival at the door.
  for (let i = 0; i < 14; i++) { const me = s.player.ant; s.ants.push({ ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: i < 4 ? 'soldier' : 'forager', hp: 6, state: 'explore', foeId: 0, x: (c.ex + 10 + i) * T, y: (c.ey + 0.5) * T, tx: c.ex + 10 + i, ty: c.ey }); }
  assert.equal(SIM.underAttack(s), false); assert.equal(SIM.callDefend(s), 0, 'nothing to defend against');
  s.raidLive = true;
  assert.ok(SIM.underAttack(s));
  const n = SIM.callDefend(s);
  assert.equal(n, 6);
  const called = s.ants.filter((a) => a.goal === 'defend');
  assert.equal(called.filter((a) => a.caste === 'soldier').length, 4, 'every soldier answers first');
  assert.equal(SIM.callDefend(s), 0, 'the bell needs a moment');
  { const a = called.find((o) => o.caste === 'soldier'), d0 = Math.hypot(a.x / T - c.ex, a.y / T - c.ey); for (let i = 0; i < 20; i++) SIM.tick(s, 0.05); assert.ok(Math.hypot(a.x / T - c.ex, a.y / T - c.ey) < d0 - 0.5, 'running home'); }
  for (let i = 0; i < (SIM.DEFEND.cd - 1) * 20 + 2; i++) SIM.tick(s, 0.05);
  s.raidLive = true; // (no real raiders in this test: the game clears the flag after a moment)
  const before = called.length; assert.ok(SIM.callDefend(s) > 0, 'a second ring calls more'); assert.ok(s.ants.filter((a) => a.defendT > s.t).length > before);
});

test('build 73: the spider fight: ants take its legs in a ring, legs cripple and slow it, five on it make it stomp', () => {
  const s = outside(); const T = SIM.T, me = s.player.ant;
  s.spider = { x: me.x + 8 * T, y: me.y, hp: 1e6, maxHp: 1e6, bite: -1e9, legs: 0, route: [], face: 0, cost0: 0 };
  const crew = []; for (let i = 0; i < 9; i++) { const a = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 500, state: 'fight', goal: 'spider', foeId: 0, x: s.spider.x - 3 * T + (i % 3) * 4, y: s.spider.y + (Math.floor(i / 3) - 1) * 6 }; a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); s.ants.push(a); crew.push(a); }
  for (let i = 0; i < 60; i++) { SIM.tick(s, 0.05); s.spider.bite = -1e9; s.spider.x = me.x + 8 * T; s.spider.y = me.y; }
  const slots = new Set(crew.map((a) => s.spider.slots && s.spider.slots[a.id]));
  assert.equal(slots.size, 9, 'each ant its own leg');
  const pos = crew.map((a) => [Math.round(a.x), Math.round(a.y)].join()); assert.ok(new Set(pos).size >= 8, 'spread round it, not piled up');
  for (let i = 0; i < 200; i++) { SIM.tick(s, 0.05); s.spider.bite = -1e9; s.spider.x = me.x + 8 * T; s.spider.y = me.y; }
  assert.ok(SIM.crippledLegs(s.spider) >= 1, 'a leg crippled');
  assert.ok(s.spider.stompAt != null, 'it stomped');
});
