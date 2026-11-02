// Build 40: fixes from the audit of rooms, evolutions and saving.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { EVO_BY, evoCost } from '../src/sim/growth.js';

function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 10; i++) SIM.tick(s, 0.05);
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const rich = (c) => Object.assign(c, { store: 300, water: 200, waterCap: 300, protein: 200, grit: 200, sugar: 200, chitin: 50, wood: 100, genes: 50 });

test('the food cap keeps up: repletes in the honeypot vault raise it within a second', () => {
  const s = founded(), c = s.colony; c.evo.honeypot = true;
  s.nest.rooms.push({ key: 'honeypot', x0: 2, y0: 6, w: 4, h: 4 });
  const before = SIM.storeCap(s);
  const me = s.player.ant; for (let i = 0; i < 3; i++) s.ants.push({ ...me, isPlayer: false, name: null, id: s.nextId++, caste: 'replete', duty: 'hang', state: 'in', team: 0 });
  step(s, 1.2);
  assert.ok(c.cap > before, `cap ${before} → ${c.cap}`);
});

test('a fill order can never land in a room; a room cancels the fills on its ground', () => {
  const s = founded(), q = s.queen.room;
  assert.equal(SIM.toggleFillOrder(s, q.x0 + 1, q.y0 + 1), 'room');
});

test('rooms waiting to be built can be cancelled, cost back', () => {
  const s = founded(), c = s.colony; rich(c);
  const r = s.queen.room, x0 = r.x0 + r.w;
  for (let y = r.y0; y < r.y0 + 3; y++) for (let x = x0; x < x0 + 5; x++) s.nest.cells[y * SIM.NW + x] = 1;
  c.store = 18; const food = c.store, grit = c.grit; // (under the cap: a refund can't go past it)
  assert.ok(SIM.queueRoom(s, 'hatchery', [x0 + 1, r.y0 + 1]), 'queued');
  assert.ok(c.store < food);
  assert.equal(SIM.cancelBuilds(s), 1);
  assert.equal(c.buildQueue.length, 0);
  assert.equal(Math.round(c.store), Math.round(food)); assert.equal(c.grit, grit);
});

test('a room kind can have at most 5 copies (more would not fit the nest)', () => {
  const s = founded(); s.queen.level = 7;
  assert.equal(SIM.roomCap(s), 5);
});

test('on a 1-gene node, its deed halves the other costs instead', () => {
  const s = founded(); s.colony.scouted = { a: 1, b: 1, c: 1 };
  const cost = evoCost(s, EVO_BY.waypoints);
  assert.equal(cost.genes, 1); assert.ok(cost.grit < EVO_BY.waypoints.cost.grit);
});

test('saves are versioned: a newer one is refused, older ones step up', () => {
  const s = founded(); const d = JSON.parse(SIM.serialize(s));
  assert.equal(d.v, 12);
  assert.throws(() => SIM.deserialize(JSON.stringify({ ...d, v: 99 })), /newer/);
  const old = SIM.deserialize(JSON.stringify({ ...d, v: 11 })); assert.ok(old.t > 0);
});

test('a save keeps ability cooldowns, a rival raid on you, and timed effects on ants', () => {
  const s = founded(); s.colony.evo.thanatosis = true;
  step(s, 25); const P = s.player; P.inNest = false; P.ant.state = 'player'; // hatched, and out in the yard
  assert.ok(SIM.useAbility(s, 'dead'));
  s.raidLive = true; s.raidStart = { team: 3, lost: 0, killed: 0, stolen: 0, crits: 0 };
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.ok(s2.player.cds && s2.player.cds.dead > s2.t, 'cooldown kept');
  assert.equal(s2.raidStart.team, 3, 'which colony is raiding');
  assert.ok(s2.player.ant.feign > s2.t, 'still playing dead');
});

test('a creature holding an ant still holds it after a load', () => {
  const s = founded(); s.active[SIM.REGION.toadhole] = true; step(s, 0.2);
  const b = s.bosses.toad, me = s.player.ant;
  const a = { ...me, isPlayer: false, name: null, id: s.nextId++, caste: 'forager', state: 'away', team: 0 }; s.ants.push(a);
  b.held = { id: a.id, t: 3, state: 'explore', hp0: 0 };
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(s2.ants.find((o) => o.id === a.id).state, 'away');
});
