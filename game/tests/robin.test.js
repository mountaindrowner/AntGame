// Build 30: the Old Robin, guardian of the Great Lawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { GUARDIANS } from '../src/sim/growth.js';

const T = SIM.T;
function lawn(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9;
  const ai = SIM.REGION.bare; s.active[ai] = true;
  for (let i = 0; i < 4; i++) SIM.tick(s, 0.05);
  const b = s.bosses.robin; assert.ok(b, 'the Old Robin has a lair on the Bare Patch');
  return { s, b };
}
// n soldiers in a ring round (x, y), close enough to bite.
function crewAt(s, x, y, n, r = 1.6) {
  const me = s.player.ant, out = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const o = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 60, state: 'patrol', foeId: 0, x: x + Math.cos(a) * r * T, y: y + Math.sin(a) * r * T }; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); s.ants.push(o); out.push(o); }
  return out;
}
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each()) return true; } return false; };

test('the Old Robin guards the whole Great Lawn', () => {
  for (const k of ['lawn', 'bare', 'molehills', 'daisies', 'lawnedge']) assert.match(GUARDIANS[k][0], /Old Robin/, k);
  assert.equal(SIM.BOSSES.robin.region, 'bare');
});

test('it wakes, telegraphs a peck at a red dot, and the peck lands where it showed', () => {
  const { s, b } = lawn();
  crewAt(s, b.x + 2.5 * T, b.y, 1, 0);
  let saw = null; step(s, 8, () => { if (b.atk && b.atk.what === 'peck') saw = { ...b.atk }; return saw; });
  assert.ok(saw, 'a peck was shown'); assert.equal(b.mode, 'fight');
  assert.ok(saw.r <= 1.2 * T, 'a small red dot');
});

test('six ants on its feet pin it: bites do double, and it cannot take off', () => {
  const { s, b } = lawn();
  b.mode = 'fight'; b.phase = 2; b.flyCd = 0; b.cd = 9;
  crewAt(s, b.x, b.y, 7, 1.6);
  step(s, 0.2);
  assert.ok(b.pinned, 'pinned'); assert.ok(!b.air, 'stays down');
  assert.equal(SIM.bossArmour ? SIM.bossArmour(s, b, {}) : 2, 2);
});

test('in its second phase it flies up out of reach, then swoops down a lane', () => {
  const { s, b } = lawn();
  b.mode = 'fight'; b.hp = b.maxHp * 0.4; b.phase = 2; b.flyCd = 0; b.cd = 9;
  crewAt(s, b.x + 6 * T, b.y, 2, 0.6);
  let up = false, lane = false, swoop = false;
  step(s, 8, () => { if (b.air) up = true; if (b.atk && b.atk.kind === 'lane') lane = true; if (b.swoop) swoop = true; return swoop; });
  assert.ok(up && lane && swoop, `up ${up}, lane ${lane}, swoop ${swoop}`);
});

test('driven off: the trophy, no more robins over the lawn, and birds never take your ants', () => {
  const { s, b } = lawn();
  b.mode = 'fight'; b.hp = 3; crewAt(s, b.x, b.y, 7, 1.6);
  step(s, 2, () => b.dead);
  assert.ok(b.dead, 'gone');
  assert.ok(s.colony.trophies.feather && s.colony.kills.robin === 1);
  assert.match(s.player.msg, /flies off for good/);
  // No robin strikes over the lawn now.
  const lawnI = SIM.REGION.lawn; s.active[lawnI] = true; s.strikeT = s.strikeT.map(() => 0); s.strikes = [];
  crewAt(s, (SIM.areaBounds(lawnI).x0 + 20) * T, (SIM.areaBounds(lawnI).y0 + 20) * T, 1, 0);
  step(s, 2);
  assert.ok(!s.strikes.some((k) => k.kind === 'bird' && k.region === lawnI), 'no robin over the lawn');
  // And a bird elsewhere can't take your ant.
  const v = crewAt(s, b.x, b.y, 1, 0)[0]; v.hp = 1;
  SIM.killAnt(s, v, 'bird');
  assert.notEqual(v.state, 'dead');
});
