// Build 29: crew orders: hold, send, split, follow.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function withCrew(n = 8, seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  const P = s.player; P.ntx = SIM.SHAFT; P.nty = 0; P.exiting = true;
  for (let i = 0; i < 600 && P.inNest; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.critters = []; s.bugT = -1e9;
  const me = P.ant;
  for (let i = 0; i < n; i++) s.ants.push({ ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 30, state: 'patrol', foeId: 0 });
  P.tx = me.x; P.ty = me.y; SIM.recruit(s, n);
  return { s, P, me };
}
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each) each(); } };
// Open ground about d tiles east of you.
function openSpot(s, me, d) { const W = SIM.W, ok = (x, y) => !s.world.blocked[y * W + x]; let x = Math.floor(me.x / T) + d, y = Math.floor(me.y / T); for (let k = 0; k < 8 && !ok(x, y); k++) y += k % 2 ? k : -k; return [x, y]; }

test('hold: the crew plants itself and stays when you walk off', () => {
  const { s, P, me } = withCrew();
  const [hx, hy] = openSpot(s, me, 4);
  assert.equal(SIM.crewHold(s, (hx + 0.5) * T, (hy + 0.5) * T), 8);
  assert.equal(SIM.crewSize(s), 0); assert.equal(SIM.heldCount(s), 8);
  step(s, 6);
  const near = s.ants.filter((a) => a.state === 'hold' && Math.hypot(a.x / T - hx - 0.5, a.y / T - hy - 0.5) < 2).length;
  assert.ok(near >= 6, `${near} at the spot`);
  // You walk 30 tiles away: they keep holding.
  me.x += 30 * T; me.tx += 30; P.tx = me.x; P.ty = me.y; step(s, 3, () => { P.tx = me.x; P.ty = me.y; });
  assert.equal(SIM.heldCount(s), 8, 'still holding');
});

test('a held crew fights what comes into its ring', () => {
  const { s, me } = withCrew();
  const [hx, hy] = openSpot(s, me, 4);
  SIM.crewHold(s, (hx + 0.5) * T, (hy + 0.5) * T); step(s, 5);
  const r = s.ants.find((a) => a.team === 1 && a.state !== 'dead');
  Object.assign(r, { caste: 'soldier', state: 'fight', goal: 'enemy', x: (hx + 3.5) * T, y: (hy + 0.5) * T, tx: hx + 3, ty: hy, hp: 6, flee: 0 });
  let dead = false, tr = ''; let k = 0; step(s, 15, () => { if (r.state === 'dead' || !s.ants.includes(r)) dead = true; if (++k % 20 === 0) tr += ` ${(Math.min(...s.ants.filter((a) => a.state === 'hold').map((a) => Math.hypot(a.x - r.x, a.y - r.y))) / T).toFixed(1)}/${r.hp.toFixed(0)}/${r.state[0]}/${(Math.hypot(r.x / T - hx - 0.5, r.y / T - hy - 0.5)).toFixed(1)}`; });
  assert.ok(dead, 'the intruder is dead' + tr + ' blocked ' + s.world.blocked[(hy) * SIM.W + hx + 3]);
  assert.equal(SIM.heldCount(s), 8, 'and they went back to holding');
});

test('split: half holds, half keeps following', () => {
  const { s } = withCrew(8);
  const n = SIM.crewHold(s, s.player.ant.x, s.player.ant.y, true);
  assert.equal(n, 4); assert.equal(SIM.heldCount(s), 4); assert.equal(SIM.crewSize(s), 4);
});

test('follow: a held crew comes back from far off', () => {
  const { s, P, me } = withCrew();
  SIM.crewHold(s, me.x, me.y);
  // You go 25 tiles away along open ground, then call them.
  const [fx, fy] = openSpot(s, me, 25); Object.assign(me, { x: (fx + 0.5) * T, y: (fy + 0.5) * T, tx: fx, ty: fy }); P.tx = me.x; P.ty = me.y;
  step(s, 1);
  assert.equal(SIM.crewFollow(s), 8);
  step(s, 25, () => { P.tx = me.x; P.ty = me.y; });
  const back = s.ants.filter((a) => a.follow && a.state === 'follow' && Math.hypot(a.x - me.x, a.y - me.y) < 4 * T).length;
  assert.ok(back >= 6, `${back} back with you`);
});

test('holding is kept across a save', () => {
  const { s, me } = withCrew();
  SIM.crewHold(s, me.x + 3 * T, me.y);
  const s2 = SIM.deserialize(SIM.serialize(s));
  const h = s2.ants.filter((a) => a.state === 'hold');
  assert.equal(h.length, 8); assert.ok(h.every((a) => a.holdX != null));
});
