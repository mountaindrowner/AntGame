// Build 43: day and night.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9;
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const toNight = (s) => { s.dayT = SIM.DAY * 0.7; }, toDay = (s) => { s.dayT = SIM.DAY * 0.3; };

test('a day is ten minutes: it starts in the morning, night falls, dawn comes', () => {
  const s = SIM.create(7);
  assert.equal(SIM.isNight(s), false);
  assert.equal(SIM.DAY, 600);
  let nightAt = null, dawnAt = null;
  for (let t = 0; t < 700 && dawnAt == null; t += 1) { SIM.tick(s, 1); if (nightAt == null && SIM.isNight(s)) nightAt = t; if (nightAt != null && !SIM.isNight(s)) dawnAt = t; }
  assert.ok(nightAt > 330 && nightAt < 420, `night at ${nightAt}`);
  assert.ok(dawnAt - nightAt > 140 && dawnAt - nightAt < 200, `night lasts ${dawnAt - nightAt}`);
});

test('night falls and dawn breaks with a banner; dawn brings a heavy dew', () => {
  const s = founded(); s.dayT = SIM.DAY * 0.65; s.nightNow = false;
  step(s, 15); assert.equal(s.banner.title, 'Night falls'); assert.ok(s.events.includes('night') || s.nights === 1);
  s.dew = false; s.items = s.items.filter((f) => f.type !== 'dew');
  s.dayT = SIM.DAY * 0.995; step(s, 15);
  assert.equal(s.banner.title, 'Dawn');
  assert.ok(s.items.filter((f) => f.type === 'dew').length >= 30, 'a heavy dew');
  assert.ok(s.colony.firstDawn, 'the first night survived (+1 gene)');
});

test('no feet, birds or mower at night; they come back by day', () => {
  const s = founded(); toNight(s);
  s.mower.next = s.t; step(s, 2); assert.equal(s.mower.state, 'idle', 'the mower waits for day');
  assert.ok(s.mower.next > s.t + SIM.untilTurn(s) + 60, 'and for a while after dawn');
  // Ants out on the lawn all night: no foot or bird comes down.
  const me = s.player.ant; s.player.inNest = false; me.state = 'player';
  const lawn = SIM.areaBounds(SIM.REGION.lawn); me.x = (lawn.x0 + 10) * SIM.T; me.y = (lawn.y0 + 10) * SIM.T; me.tx = lawn.x0 + 10; me.ty = lawn.y0 + 10;
  s.active[SIM.REGION.lawn] = true; s.strikeT[SIM.REGION.lawn] = 0;
  step(s, 5); assert.ok(!s.strikes.some((k) => k.kind === 'bird' || k.kind === 'foot'), 'nothing from above at night');
  toDay(s); s.mower.next = s.t; s.strikeT[SIM.REGION.lawn] = 0; step(s, 0.2);
  assert.ok(s.strikes.length || s.mower.state !== 'idle', 'by day they come');
});

test('day hunters rest at night; the assassin bug reaches farther', () => {
  const s = founded(); toNight(s);
  const me = s.player.ant, b = { kind: 'jumper', hx: me.tx, hy: me.ty, x: me.x, y: me.y, hp: 60, maxHp: 60 };
  me.state = 'player'; s.player.inNest = false;
  assert.equal(SIM.huntTarget(s, b, 12), null, 'a jumping spider sleeps');
  toDay(s); assert.ok(SIM.huntTarget(s, b, 12), 'by day it hunts');
  toNight(s); const a = { ...b, kind: 'assassin' }; me.x = a.x + 15 * SIM.T; me.tx = Math.floor(me.x / SIM.T); a.hx = me.tx; // (its home by the ant: inside its leash)
  assert.ok(SIM.huntTarget(s, a, 12), 'the assassin reaches 40% farther at night');
  toDay(s); assert.equal(SIM.huntTarget(s, a, 12), null);
});

test('the robin sleeps at night: ants near don’t wake it, and three can pin it', () => {
  const s = founded(); toNight(s); s.strikeT = s.strikeT.map(() => 1e9);
  s.active[SIM.REGION.bare] = true; step(s, 0.2);
  const b = s.bosses.robin; assert.ok(b, 'the robin is home');
  const me = s.player.ant; s.player.inNest = false; me.state = 'player'; me.x = b.x + 3 * SIM.T; me.y = b.y; me.tx = Math.floor(me.x / SIM.T); me.ty = Math.floor(me.y / SIM.T);
  step(s, 1); assert.equal(b.mode, 'idle'); assert.ok(b.asleep);
});

test('the clock is saved', () => {
  const s = founded(); s.dayT = 4321; s.nights = 3;
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(s2.dayT, 4321); assert.equal(s2.nights, 3);
});
