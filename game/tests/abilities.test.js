// Build 32: your ant's abilities and the statuses they cause.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function out(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  const P = s.player; P.ntx = SIM.SHAFT; P.nty = 0; P.exiting = true;
  for (let i = 0; i < 600 && P.inNest; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9;
  for (const k of ['formic', 'danger', 'mandibles', 'thanatosis']) s.colony.evo[k] = true; // learned
  return { s, P, me: P.ant };
}
const ant = (s, x, y, extra = {}) => { const me = s.player.ant, o = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 30, state: 'patrol', foeId: 0, x, y, ...extra }; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); s.ants.push(o); return o; };

test('formic spray exposes enemies in the cloud, and only them; then it cools down', () => {
  const { s, me } = out();
  const inC = ant(s, me.x + 3 * T, me.y, { team: 1 }), outC = ant(s, me.x + 9 * T, me.y, { team: 1 });
  assert.ok(SIM.useAbility(s, 'spray', me.x + 3 * T, me.y));
  assert.ok(inC.exposed > s.t && !(outC.exposed > s.t));
  assert.match(SIM.abilityLock(s, 'spray'), /ready in/);
  assert.equal(SIM.useAbility(s, 'spray', me.x, me.y), false);
});

test('exposed: one less Defence and half again damage in a duel', () => {
  const { s, me } = out(); SIM.duelGangs(s); delete s.colony.evo.mandibles; // plain soldier stats for the dice below
  const a = ant(s, me.x, me.y), o = ant(s, me.x + T, me.y, { team: 1, caste: 'forager', hp: 1e6 });
  const real = Math.random; const roll = (f) => { let i = 0; Math.random = () => (f[i++ % f.length] - 1) / 6 + 0.01; };
  try {
    roll([3, 4]); const before = o.hp; SIM.swing(s, a, o); const plain = before - o.hp; a.xp = 0; // 3+2 vs 4+0: a hit
    o.exposed = s.t + 5; roll([3, 4]); const b2 = o.hp; SIM.swing(s, a, o); const hurt = b2 - o.hp; // 5 vs 4+0-1=3: a hit, ×1.5 for exposed
    assert.ok(Math.abs(hurt / plain - 1.5) < 0.05, `exposed ${hurt.toFixed(1)} vs ${plain.toFixed(1)}`);
  } finally { Math.random = real; }
});

test('alarm call: nearby crew Frenzy, bite 30% harder', () => {
  const { s, me } = out();
  const c = ant(s, me.x + 2 * T, me.y, { follow: true, state: 'follow' }), far = ant(s, me.x + 20 * T, me.y, { follow: true, state: 'follow' });
  const b0 = SIM.bite(s, c);
  assert.ok(SIM.useAbility(s, 'alarm'));
  assert.ok(c.frenzy > s.t && !(far.frenzy > s.t));
  assert.ok(Math.abs(SIM.bite(s, c) / b0 - 1.3) < 0.01);
});

test('mandible lock on a boss cancels its wind-up and holds it still', () => {
  const { s, me } = out();
  s.active[SIM.REGION.toadhole] = true; SIM.tick(s, 0.05);
  const b = s.bosses.toad; Object.assign(me, { x: b.x + 3.2 * T, y: b.y }); me.tx = Math.floor(me.x / T); me.ty = Math.floor(me.y / T); s.player.tx = me.x; s.player.ty = me.y;
  b.mode = 'fight'; b.cd = 0; b.atk = { kind: 'lane', x: b.x, y: b.y, dx: 1, dy: 0, len: 8 * T, w: T, t: 0, at: 0.9 };
  assert.ok(SIM.useAbility(s, 'lock'));
  assert.equal(b.atk, null, 'cancelled'); assert.ok(b.stunned > s.t);
  for (let i = 0; i < 20; i++) { SIM.tick(s, 0.05); s.player.tx = me.x; s.player.ty = me.y; }
  assert.equal(b.atk, null, 'no new attack while stunned');
});

test('play dead: nothing hurts you for 3 s, and you heal', () => {
  const { s, me } = out();
  me.hp = 2; assert.ok(SIM.useAbility(s, 'dead'));
  assert.ok(me.hp > 2, 'healed');
  const h = me.hp; SIM.killAnt(s, me, 'rival'); assert.notEqual(me.state, 'dead'); assert.ok(me.hp >= 1);
  const r = ant(s, me.x + 0.5 * T, me.y, { team: 1 }); SIM.duelGangs(s);
  assert.equal(SIM.swing(s, r, me), 'miss');
  assert.ok(me.hp >= Math.min(h, 1));
});

test('each ability is learned in the evolution tree', () => {
  const { s } = out();
  for (const k of ['formic', 'danger', 'mandibles', 'thanatosis']) delete s.colony.evo[k];
  for (const k of SIM.ABILITY_KEYS) assert.match(SIM.abilityLock(s, k), /evolve/, k);
  assert.equal(SIM.useAbility(s, 'dead'), false);
  s.colony.genes = 10; assert.ok(SIM.buyEvo(s, 'thanatosis'));
  assert.equal(SIM.abilityLock(s, 'dead'), '');
  assert.ok(SIM.useAbility(s, 'dead'));
});

test('second levels: wider, longer, stronger', () => {
  const { s, me } = out();
  assert.equal(SIM.abilityLevel(s, 'spray'), 1);
  for (const k of ['spray2', 'alarm2', 'lock2', 'dead2']) s.colony.evo[k] = true;
  assert.equal(SIM.abil(s, 'spray').r, 3.5); assert.equal(SIM.abil(s, 'spray').cd, 7);
  // A rival 3 tiles off the cloud's centre: inside at level II, not at level I.
  const r = ant(s, me.x + 6 * T, me.y + 3 * T, { team: 1 });
  assert.ok(SIM.useAbility(s, 'spray', me.x + 6 * T, me.y)); assert.ok(r.exposed > s.t + 8);
  const c = ant(s, me.x + 10 * T, me.y, { follow: true, state: 'follow' });
  assert.ok(SIM.useAbility(s, 'alarm')); assert.ok(c.frenzy > s.t + 11); assert.equal(c.frenzyAtk, 3);
  // Death feint: a rival on you loses track.
  const f = ant(s, me.x + 0.5 * T, me.y, { team: 1, state: 'fight', foeId: me.id });
  assert.ok(SIM.useAbility(s, 'dead')); assert.equal(f.foeId, 0); assert.ok(me.feign > s.t + 4.5);
});
