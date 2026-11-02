// Build 31: Old Warty, guardian of the Wet Edge.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { GUARDIANS } from '../src/sim/growth.js';

const T = SIM.T;
function wet(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9;
  s.active[SIM.REGION.toadhole] = true; for (let i = 0; i < 4; i++) SIM.tick(s, 0.05);
  const b = s.bosses.toad; assert.ok(b, 'Old Warty has a lair at the Toad Hole');
  return { s, b };
}
function ant(s, x, y, extra = {}) { const me = s.player.ant, o = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 60, state: 'patrol', foeId: 0, x, y, ...extra }; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); s.ants.push(o); return o; }
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each()) return true; } return false; };

test('Old Warty rules the Wet Edge', () => {
  for (const k of ['toadhole', 'reeds', 'drain', 'mudflat', 'wetedge', 'thistles', 'slugs']) assert.match(GUARDIANS[k][0], /Warty/, k);
});

test('bites from behind do double; puffed up, half', () => {
  const { s, b } = wet(); b.dx = 1; b.dy = 0;
  assert.equal(SIM.bossArmour(s, b, { x: b.x - 2 * T, y: b.y }), 2, 'behind');
  assert.equal(SIM.bossArmour(s, b, { x: b.x + 2 * T, y: b.y }), 1, 'in front');
  b.puffT = 3; assert.equal(SIM.bossArmour(s, b, { x: b.x + 2 * T, y: b.y }), 0.5, 'puffed');
});

test('the tongue swallows the first ant in its lane; left alone, it is lost', () => {
  const { s, b } = wet(); b.mode = 'fight'; b.dx = 1; b.dy = 0; b.cd = 9;
  const near = ant(s, b.x + 3 * T, b.y), far = ant(s, b.x + 5 * T, b.y);
  b.atk = { kind: 'lane', x: b.x, y: b.y, dx: 1, dy: 0, len: 8 * T, w: 0.9 * T, t: 0, at: 0.1 };
  step(s, 0.3);
  assert.ok(b.held && b.held.id === near.id, 'the nearer ant was taken');
  assert.equal(near.state, 'away'); assert.notEqual(far.state, 'away');
  for (const o of s.ants) if (o !== near && !o.team) o.x = o.y = -1e5; // nobody bites the toad
  step(s, 3.5);
  assert.equal(near.state, 'dead');
});

test('bite it hard in time and it spits the ant out alive', () => {
  const { s, b } = wet(); b.mode = 'fight'; b.dx = 1; b.dy = 0; b.cd = 9;
  const v = ant(s, b.x + 3 * T, b.y, { caste: 'forager' });
  b.atk = { kind: 'lane', x: b.x, y: b.y, dx: 1, dy: 0, len: 8 * T, w: 0.9 * T, t: 0, at: 0.1 };
  step(s, 0.3); assert.ok(b.held);
  for (let i = 0; i < 8; i++) ant(s, b.x - 2.2 * T + (i % 3) * 0.4 * T, b.y + (i - 4) * 0.4 * T); // a crew behind it
  step(s, 3.2, () => !b.held);
  assert.ok(!b.held && v.state !== 'dead' && v.state !== 'away', `spat out (${v.state})`);
});

test('beaten: the poison trophy, and no toads on the Wet Edge', () => {
  const { s, b } = wet(); b.mode = 'fight'; b.hp = 2;
  for (let i = 0; i < 6; i++) ant(s, b.x - 2 * T, b.y + (i - 3) * 0.5 * T);
  step(s, 2, () => b.dead);
  assert.ok(b.dead && s.colony.trophies.poison && s.colony.kills.toad === 1);
  const wi = SIM.REGION.reeds; s.active[wi] = true; s.strikeT = s.strikeT.map(() => 0); s.strikes = [];
  ant(s, (SIM.areaBounds(wi).x0 + 20) * T, (SIM.areaBounds(wi).y0 + 20) * T);
  step(s, 2);
  assert.ok(!s.strikes.some((k) => k.kind === 'toad' && k.region === wi));
});
