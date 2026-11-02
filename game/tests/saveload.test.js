// Build 40: save and load, across busy game states and from older saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function busy(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  const P = s.player; P.ntx = SIM.SHAFT; P.nty = 0; P.exiting = true;
  for (let i = 0; i < 600 && P.inNest; i++) SIM.tick(s, 0.05);
  return s;
}
const run = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const round = (s) => SIM.deserialize(SIM.serialize(s));
function crew(s, n, extra = {}) { const me = s.player.ant, out = []; for (let i = 0; i < n; i++) { const o = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 30, state: 'patrol', foeId: 0, ...extra }; s.ants.push(o); out.push(o); } return out; }

test('a busy colony saves and loads, and keeps playing', () => {
  const s = busy();
  for (const k of ['mandibles', 'formic', 'danger', 'thanatosis']) s.colony.evo[k] = true;
  crew(s, 6); SIM.recruit(s, 6); SIM.crewHold(s, s.player.ant.x + 3 * T, s.player.ant.y, true);
  SIM.useAbility(s, 'alarm');
  s.active[SIM.REGION.toadhole] = true; s.active[SIM.REGION.patio] = true; run(s, 1);
  s.colony.kills.spider = 1; run(s, 1.5);
  const s2 = round(s);
  assert.equal(s2.ants.length, s.ants.length);
  assert.equal(SIM.heldCount(s2), SIM.heldCount(s));
  assert.equal(SIM.zonesTaken(s2), SIM.zonesTaken(s));
  assert.equal(s2.colony.evo.formic, true);
  run(s2, 30); // no crash
  assert.ok(s2.t > s.t);
});

test('a boss mid-fight keeps its health (and a dead one stays dead)', () => {
  const s = busy();
  s.active[SIM.REGION.toadhole] = true; s.active[SIM.REGION.bare] = true; run(s, 0.2);
  const toad = s.bosses.toad, robin = s.bosses.robin; assert.ok(toad && robin);
  toad.hp = 333; toad.mode = 'fight'; robin.dead = true; robin.deadT = s.t; s.colony.kills.robin = 1;
  const s2 = round(s);
  assert.ok(s2.bosses.toad, 'the toad is still there');
  assert.equal(Math.round(s2.bosses.toad.hp), 333, 'with its health');
  assert.ok(s2.bosses.robin && s2.bosses.robin.dead, 'the robin stays beaten');
  run(s2, 5);
});

test('mid-raid: raiders inside a nest come home after a load, nothing stuck', () => {
  const s = busy(); const r = s.rivals[0], me = s.player.ant;
  Object.assign(me, { tx: r.ex, ty: r.ey + 2, x: (r.ex + 0.5) * T, y: (r.ey + 2.5) * T }); s.player.tx = me.x; s.player.ty = me.y;
  s.ants = s.ants.filter((a) => a.team !== 1 || a.state === 'in');
  crew(s, 8, { x: (r.ex + 0.5) * T, y: (r.ey + 1.5) * T, tx: r.ex, ty: r.ey + 1 }); SIM.recruit(s, 8);
  r.store = 200; assert.ok(SIM.startRaid(s, 'store'));
  for (let i = 0; i < 20 * 20 && !(s.myRaid && s.myRaid.phase === 'inside'); i++) { SIM.tick(s, 0.05); s.player.tx = me.x; s.player.ty = me.y; }
  assert.ok(s.myRaid && s.myRaid.phase === 'inside');
  const s2 = round(s);
  assert.equal(s2.ants.filter((a) => a.state === 'away').length, 0, 'nobody left inside');
  run(s2, 10);
});

test('a hunter, a held ant and a dropped tail survive a save', () => {
  const s = busy(); const me = s.player.ant;
  s.critters.push({ id: s.nextId++, kind: 'skink', region: null, hx: me.tx, hy: me.ty + 10, x: me.x, y: me.y + 10 * T, dx: 1, dy: 0, hp: 150, maxHp: 150, state: 'walk', t: 0, life: 0 });
  s.items.push({ x: me.tx + 2, y: me.ty + 2, kind: 'protein', type: 'skinktail', amt: 40 });
  const s2 = round(s);
  assert.ok(s2.critters.some((b) => b.kind === 'skink'), 'the skink');
  assert.ok(s2.items.some((f) => f.type === 'skinktail'), 'the tail');
  run(s2, 5);
});

test('an older save (no rivals list, zones, duels, abilities, hunters) loads and plays', () => {
  const s = busy();
  const d = JSON.parse(SIM.serialize(s));
  delete d.rivals; delete d.phase1; delete d.patioDeadAt;
  for (const k of ['zones', 'duelsWon', 'duelsLost', 'crits', 'raidsLed', 'captured', 'lineage']) delete d.colony[k];
  for (const a of d.ants) { delete a.loot; delete a.lootKind; delete a.holdX; delete a.holdY; delete a.holdCX; delete a.holdCY; delete a.recall; }
  if (d.player) delete d.player.cds;
  const s2 = SIM.deserialize(JSON.stringify(d));
  assert.equal(s2.rivals.length, 5);
  run(s2, 20);
  assert.equal(SIM.zonesTaken(s2) >= 0, true);
});
