// Build 37: hunters, the tier between bugs and bosses.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function yard(region, seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9;
  return s;
}
function hunter(s, kind, x, y) { const B = SIM.BUGS[kind], b = { id: s.nextId++, kind, region: null, hx: Math.floor(x / T), hy: Math.floor(y / T), x, y, dx: 1, dy: 0, hp: B.hp, maxHp: B.hp, state: 'walk', t: 0, life: 0 }; s.critters.push(b); return b; }
function ant(s, x, y, extra = {}) { const me = s.player.ant, o = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'forager', hp: 20, state: 'patrol', foeId: 0, x, y, ...extra }; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); s.ants.push(o); return o; }
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each()) return true; } return false; };
const open = (s) => { const me = s.player.ant; return [me.x + 0 * T, me.y + 12 * T]; };

test('hunters live in their regions: jumping spiders on the patio and stones, assassin bugs in the garden', () => {
  assert.ok(SIM.BUGS.jumper.hunter && SIM.BUGS.jumper.regions.test('patio') && SIM.BUGS.jumper.regions.test('stones'));
  assert.ok(SIM.BUGS.assassin.regions.test('tomatoes') && !SIM.BUGS.assassin.regions.test('patio'));
  const s = yard(); s.active[SIM.REGION.patio] = true; s.bugT = 4; s.t = 700; // hunters come after minute 10
  step(s, 0.2);
  assert.ok(s.critters.some((b) => b.kind === 'jumper'), 'a jumping spider on the patio');
});

test('the jumping spider crouches (a lane), then leaps onto an ant and bites it', () => {
  const s = yard(); const [x, y] = open(s);
  const b = hunter(s, 'jumper', x, y), a = ant(s, x + 4 * T, y, { hp: 20 });
  let lane = false; step(s, 3, () => { if (b.atk && b.atk.kind === 'lane') lane = true; return b.landAt; });
  assert.ok(lane, 'showed its leap'); assert.ok(b.landAt, 'leapt');
  assert.ok(a.hp < 20 || a.state === 'dead', 'bit');
});

test('the assassin bug impales an ant and drains it; bite the bug hard and it lets go', () => {
  const s = yard(); const [x, y] = open(s);
  const b = hunter(s, 'assassin', x, y), a = ant(s, x + 1.5 * T, y, { hp: 20 });
  step(s, 3, () => b.held);
  assert.ok(b.held && b.held.id === a.id, 'impaled');
  const hp = a.hp; step(s, 1); assert.ok(a.hp < hp, 'drained');
  b.hp -= 16; step(s, 0.1);
  assert.ok(!b.held && a.state !== 'dead', 'let go');
});

test('a crowd drives a hunter off, and killed it leaves meat (and the assassin, chitin)', () => {
  const s = yard(); const [x, y] = open(s);
  const b = hunter(s, 'assassin', x, y); b.hp = 2;
  for (let i = 0; i < 6; i++) ant(s, x - 1 * T, y + (i - 3) * 0.4 * T, { caste: 'soldier', hp: 60 });
  step(s, 2, () => !s.critters.includes(b));
  assert.ok(!s.critters.includes(b));
  assert.ok(s.items.some((f) => f.type === 'assassin' && f.kind === 'protein') && s.items.some((f) => f.kind === 'chitin'));
});

test('the wasp: out of reach in the air; its shadow settles, it dives and carries an ant off; a lock makes it drop it', () => {
  const s = yard(); const [x, y] = open(s);
  const b = hunter(s, 'wasp', x, y), a = ant(s, x + 3 * T, y, { hp: 20 });
  step(s, 0.2); assert.equal(b.state, 'fly');
  const hp = b.hp; for (let i = 0; i < 4; i++) ant(s, b.x, b.y, { caste: 'soldier', hp: 60 }); step(s, 0.3);
  assert.equal(b.hp, hp, 'not bitten in the air');
  for (const o of s.ants) if (!o.team && o !== a && !o.isPlayer) o.x = o.y = -1e5;
  b.cd = 0; let ring = false; step(s, 3, () => { if (b.atk) ring = true; return b.carry; });
  assert.ok(ring && b.carry === a.id, 'dove and took it');
  ant(s, b.x - 10 * T, b.y, { hp: 20 }); // an onlooker: creatures with no ant near aren't stepped
  b.stunned = s.t + 2; step(s, 0.1);
  assert.ok(!b.carry && a.state !== 'away' && b.state === 'rest', `dropped it, and down it comes (${b.carry} ${a.state} ${b.state} ${b.stunned - s.t})`);
});

test('the skink: hurt to half it drops its tail (40 protein) and runs; it gets away if not stopped', () => {
  const s = yard(); const [x, y] = open(s);
  const b = hunter(s, 'skink', x, y); ant(s, x + 6 * T, y, { hp: 20 });
  b.hp = b.maxHp * 0.45; step(s, 0.1);
  assert.ok(b.tailless && b.state === 'flee');
  assert.ok(s.items.some((f) => f.type === 'skinktail' && f.amt === 40), 'the tail');
  step(s, 7);
  assert.ok(!s.critters.includes(b), 'got away');
});
