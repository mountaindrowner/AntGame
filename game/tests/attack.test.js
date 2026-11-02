// Build 26: attack on purpose. With a crew, point at an enemy and the crew charges it.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function withCrew(n = 8, seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  const P0 = s.player; P0.ntx = SIM.SHAFT; P0.nty = 0; P0.exiting = true;
  for (let i = 0; i < 30 * 20 && P0.inNest; i++) SIM.tick(s, 0.05);
  assert.ok(P0.ant && !P0.inNest, 'you are outside');
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9);
  const P = s.player, me = P.ant;
  // Workers made from your ant's shape (none hatch in a test this short).
  const pool = [];
  while (pool.length < n) { const c = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0 }; s.ants.push(c); pool.push(c); }
  for (const a of pool.slice(0, n)) { a.caste = 'soldier'; a.hp = 20; a.state = 'patrol'; a.x = me.x; a.y = me.y; a.tx = me.tx; a.ty = me.ty; a.carry = 0; }
  P.tx = me.x; P.ty = me.y;
  assert.ok(SIM.recruit(s, n) >= n - 1, 'crew recruited');
  return s;
}
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each()) return true; } return false; };
function bugNear(s, kind, dx) {
  const me = s.player.ant, b = s.critters.find((o) => o.kind === kind) || s.critters[0];
  assert.ok(b, 'a critter to fight');
  Object.assign(b, { x: me.x + dx * T, y: me.y, state: 'walk' }); b.hp = b.maxHp;
  for (const o of s.critters) if (o !== b) o.x = o.y = -1e5;
  return b;
}

test('no crew, no attack', () => {
  const s = withCrew(8); SIM.release(s); step(s, 1);
  const b = bugNear(s, 'earwig', 6);
  assert.equal(SIM.crewAttack(s, b.x, b.y), false);
  assert.equal(SIM.crewAttack(s, b.x + 40 * T, b.y), false, 'nothing there');
});

test('pointing at a critter sends the crew to bite it till it dies, then they fall back in', () => {
  const s = withCrew(8), P = s.player;
  const b = bugNear(s, 'earwig', 7);
  assert.ok(SIM.crewAttack(s, b.x, b.y), 'attack starts');
  assert.match(P.msg, /charges/);
  const me = P.ant;
  // You stay put; the crew goes.
  let reached = false;
  const dead = step(s, 40, () => { P.tx = me.x; P.ty = me.y; if (s.ants.some((a) => a.follow && Math.hypot(a.x - b.x, a.y - b.y) < 1.5 * T)) reached = true; return !s.critters.includes(b) || b.hp <= 0; });
  assert.ok(reached, 'the crew reached it');
  assert.ok(dead, 'it died');
  step(s, 0.5);
  assert.equal(P.attack, null, 'target cleared');
  step(s, 6);
  const back = s.ants.filter((a) => a.follow && Math.hypot(a.x - me.x, a.y - me.y) < 3 * T).length;
  assert.ok(back >= 4, `${back} back at your side`);
});

test('pointing at a rival ant: the crew kills it', () => {
  const s = withCrew(8), P = s.player, me = P.ant;
  const r = s.ants.find((a) => a.team === 1 && a.state !== 'dead');
  // Open ground about 6 tiles off (a test that dropped it inside an obstacle failed at random).
  const W = s.world.W || SIM.W, ok = (x, y) => !s.world.blocked[y * W + x];
  let gx = Math.floor(me.x / T) + 6, gy = Math.floor(me.y / T);
  for (let d = 0; d < 6 && !ok(gx, gy); d++) for (const [dx, dy] of [[0, d], [0, -d], [d, 0], [-d, 0]]) if (ok(gx + dx, gy + dy)) { gx += dx; gy += dy; break; }
  Object.assign(r, { state: 'patrol', x: (gx + 0.5) * T, y: (gy + 0.5) * T, tx: gx, ty: gy, hp: 10, flee: 0 });
  assert.ok(SIM.crewAttack(s, r.x, r.y));
  const dead = step(s, 30, () => { P.tx = me.x; P.ty = me.y; return r.state === 'dead' || !s.ants.includes(r); });
  assert.ok(dead, 'the rival ant is dead');
});

test('the crew gives up on a target that gets too far from you', () => {
  const s = withCrew(8), P = s.player;
  const b = bugNear(s, 'earwig', 6);
  assert.ok(SIM.crewAttack(s, b.x, b.y));
  b.x += 40 * T; step(s, 0.2);
  assert.equal(P.attack, null);
  assert.match(P.msg, /Too far/);
});
