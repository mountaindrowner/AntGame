// Build 28: raids you lead.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function atDoor(team = 1, crew = 9, seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9);
  if (team > 1) { s.patioDeadAt = s.t - 1800 * (team - 1) - 1; for (let i = 0; i < 20; i++) SIM.tick(s, 0.05); }
  const r = s.rivals[team - 1], P = s.player, me = P.ant;
  // Nobody of theirs outside; a few guards inside.
  s.ants = s.ants.filter((a) => a.team !== r.team || a.state === 'in');
  P.inNest = false; Object.assign(me, { state: 'player', tx: r.ex, ty: r.ey + 2, x: (r.ex + 0.5) * T, y: (r.ey + 2.5) * T }); P.tx = me.x; P.ty = me.y;
  for (let i = 0; i < crew; i++) { const a = { ...me, isPlayer: false, name: null, id: s.nextId++, follow: false, xp: 0, caste: 'soldier', hp: 40, state: 'patrol', tx: r.ex, ty: r.ey + 1, x: (r.ex + 0.5) * T, y: (r.ey + 1.5) * T, foeId: 0 }; s.ants.push(a); }
  SIM.recruit(s, crew);
  return { s, r, P, me };
}
const run = (s, sec, P, me, until) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (me) { P.tx = me.x; P.ty = me.y; } if (until && until()) return true; } return false; };

test('a raid needs a crew and a rival door close by', () => {
  const { s, r, P, me } = atDoor(1, 0);
  assert.match(SIM.raidLock(s, 'store'), /crew/);
  Object.assign(me, { tx: r.ex + 30, x: (r.ex + 30.5) * T });
  assert.match(SIM.raidLock(s, 'store'), /walk your crew/);
  assert.equal(SIM.startRaid(s, 'store'), false);
});

test('the scouts count their guards, store, brood and queen', () => {
  const { s, r } = atDoor(1);
  const sc = SIM.raidScout(s, r);
  assert.equal(sc.key, 'pavement');
  assert.ok(sc.crew >= 8 && sc.fighters >= 8 && sc.attack >= 16);
  assert.ok(sc.qhp > 0 && sc.qmax === 1000);
});

test('a store raid: break the door, storm in, carry food home', () => {
  const { s, r, P, me } = atDoor(1);
  r.store = 120;
  assert.ok(SIM.startRaid(s, 'store'));
  assert.ok(run(s, 20, P, me, () => s.myRaid && s.myRaid.phase === 'inside'), 'the door broke');
  assert.ok(s.ants.some((a) => a.state === 'away'), 'raiders are inside');
  assert.ok(run(s, 70, P, me, () => !s.myRaid), 'the raid ended');
  assert.equal(s.report.kind, 'myraid');
  assert.ok(s.report.food > 0, `took ${s.report.food}`);
  assert.ok(r.store < 120);
  const carriers = s.ants.filter((a) => !a.team && a.kind === 'food' && a.carry > 0 && a.state === 'return');
  assert.ok(carriers.length > 0, 'raiders carry it home');
  assert.match(P.msg, /carry home/);
});

test('a brood raid: stolen pupae hatch in your nest as your ants', () => {
  const { s, r, P, me } = atDoor(1);
  r.eggQueue.push('forager', 'forager', 'soldier');
  assert.ok(SIM.startRaid(s, 'brood'));
  assert.ok(run(s, 90, P, me, () => !s.myRaid));
  assert.ok(s.report.brood > 0, `${s.report.brood} pupae`);
  const c = s.ants.find((a) => !a.team && a.kind === 'brood' && a.carry > 0);
  assert.ok(c, 'a raider carries a pupa');
  // Walk it home in a hurry.
  const w = s.world, before = SIM.antCount(s);
  Object.assign(c, { tx: w.ex, ty: w.ey, x: (w.ex + 0.5) * T, y: (w.ey + 0.5) * T });
  run(s, 1);
  assert.ok(SIM.antCount(s) > before || (s.colony.captured || 0) > 0, `a new ant of yours (${before} → ${SIM.antCount(s)}, ${c.state}, ${c.carry} ${c.kind})`);
});

test('pull out: the raiders come back out', () => {
  const { s, r, P, me } = atDoor(1);
  r.store = 500;
  for (let i = 0; i < 6; i++) { const g = { ...me, isPlayer: false, name: null, id: s.nextId++, team: 1, caste: 'soldier', hp: 400, state: 'in', tx: r.ex, ty: r.ey, x: (r.ex + 0.5) * T, y: (r.ey + 0.5) * T, foeId: 0, rest: 99 }; s.ants.push(g); }
  assert.ok(SIM.startRaid(s, 'queen'));
  run(s, 20, P, me, () => s.myRaid && s.myRaid.phase === 'inside');
  run(s, 3, P, me);
  assert.ok(SIM.pullOut(s));
  assert.equal(s.myRaid, null);
  assert.equal(s.ants.filter((a) => a.state === 'away').length, 0, 'nobody left inside');
});

test('they strike back: even a colony that never raids comes for you after you raid it', () => {
  const { s, r, P, me } = atDoor(2);
  r.store = 80;
  for (let i = 0; i < 10; i++) { const g = { ...me, isPlayer: false, name: null, id: s.nextId++, team: 2, caste: 'forager', hp: 2, state: 'in', tx: r.ex, ty: r.ey, x: (r.ex + 0.5) * T, y: (r.ey + 0.5) * T, foeId: 0, rest: 0 }; s.ants.push(g); }
  assert.ok(SIM.startRaid(s, 'store'));
  run(s, 90, P, me, () => !s.myRaid);
  assert.ok(r.revengeAt > s.t, 'they mean to strike back');
  for (const a of s.ants) if (a.team === 2 && a.state !== 'dead') { a.state = 'in'; a.rest = 99; }
  while (s.ants.filter((a) => a.team === 2 && a.state !== 'dead').length < 8) s.ants.push({ ...me, isPlayer: false, name: null, id: s.nextId++, team: 2, caste: 'forager', hp: 2, state: 'in', tx: r.ex, ty: r.ey, x: (r.ex + 0.5) * T, y: (r.ey + 0.5) * T, foeId: 0, rest: 99 });
  s.raidLive = false; s.t = r.revengeAt + 1;
  run(s, 12);
  // Launched (and, against nine soldiers, maybe already beaten).
  assert.ok(s.raidStart && s.raidStart.team === 2 && r.revengeAt == null, 'their raid went out');
  assert.match(P.msg, /strike back|Raid over/);
});
