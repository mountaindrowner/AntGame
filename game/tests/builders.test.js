// Builders must do the work: one brick at a time per builder, nothing
// breaks before a builder reaches it, and rooms only rise with a crew inside.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function colonyWithBuilders(n) {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  const feed = () => { s.colony.store = 20; s.colony.water = 10; s.colony.grit = 20; };
  const run = (sec, each) => { for (let i = 0; i < sec * 20; i++) { if (i % 100 === 0) feed(); SIM.tick(s, 0.05); if (each) each(); } };
  run(30);
  for (let i = 0; i < n; i++) SIM.queueEgg(s, 'builder');
  run(30 * n + 10);
  assert.equal(s.ants.filter((a) => a.caste === 'builder').length, n, 'builders hatched');
  return { s, run };
}

test('one builder works one brick at a time', () => {
  const { s, run } = colonyWithBuilders(1);
  const r = s.queen.room, y = r.y0 + 2, x0 = r.x0 + r.w;
  for (let x = x0; x < x0 + 5; x++) assert.equal(SIM.toggleDigOrder(s, x, y), 'added');
  let maxActive = 0;
  run(60, () => {
    const active = s.nest.digOrders.filter((o) => o.progress > 0 && o.progress < o.need).length;
    maxActive = Math.max(maxActive, active);
  });
  assert.equal(maxActive, 1, 'only the brick being worked should be part-dug');
});

test('a brick does not break before its builder arrives', () => {
  const { s, run } = colonyWithBuilders(1);
  const r = s.queen.room, y = r.y0 + 2, x0 = r.x0 + r.w;
  // A tunnel of five, then the far brick: the builder must walk to it.
  for (let x = x0; x < x0 + 5; x++) SIM.toggleDigOrder(s, x, y);
  run(120);
  assert.equal(s.nest.digOrders.length, 0, 'tunnel finished');
  const b = s.ants.find((a) => a.caste === 'builder');
  b.nx = r.x0 + 0.5; b.ny = r.y0 + 0.5; // stand it at the far end of the chamber
  SIM.toggleDigOrder(s, x0 + 5, y);
  let early = false;
  run(8, () => {
    const o = s.nest.digOrders[0];
    if (o && o.progress > 0 && !(Math.floor(b.nx) === b.ntx && Math.floor(b.ny) === b.nty)) early = true;
  });
  assert.equal(early, false, 'no progress while the builder is still walking');
});

test('digging a soft cell takes about six builder-seconds once there', () => {
  const { s, run } = colonyWithBuilders(1);
  const r = s.queen.room;
  SIM.toggleDigOrder(s, r.x0 + r.w, r.y0 + 2);
  let worked = 0;
  run(30, () => { if (s.nest.digOrders.length && s.ants.find((a) => a.caste === 'builder').atWork) worked += 0.05; });
  assert.equal(s.nest.digOrders.length, 0);
  assert.ok(worked >= 5.9 && worked <= 6.5, `worked ${worked.toFixed(2)} s`);
});

test('a room only builds with a builder inside it', () => {
  const { s, run } = colonyWithBuilders(2);
  const r = s.queen.room, x0 = r.x0 + r.w;
  for (let x = x0; x < x0 + 7; x++) SIM.toggleDigOrder(s, x, r.y0 + 2);
  run(120);
  for (let y = r.y0 + 1; y >= r.y0; y--) { for (let x = x0 + 3; x < x0 + 7; x++) SIM.toggleDigOrder(s, x, y); run(90); }
  assert.ok(SIM.queueRoom(s, 'hatchery', [x0 + 4, r.y0 + 1]), 'pocket fits a hatchery');
  const job = s.colony.buildQueue[0];
  let early = false;
  run(60, () => {
    const inside = s.ants.some((a) => a.caste === 'builder' && a.atWork && a.task === 'j');
    if (job.progress > 0 && !inside && s.colony.buildQueue[0] === job) early = true;
  });
  assert.equal(early, false, 'room progress before any builder arrived');
  assert.ok(SIM.roomOf(s, 'hatchery'), 'room finished');
});
