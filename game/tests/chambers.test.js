// Build 74 (Phase 4): rooms only in a closed chamber with a hallway; placed where you put them, on dirt as a plan
// the builders dig out; a builder you play digs and builds.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

let seed = 74; const rnd0 = Math.random; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
test.after(() => { Math.random = rnd0; });

const NW = SIM.NW, cell = (s, x, y) => s.nest.cells[y * NW + x];
function founded(builders = 0) {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  const feed = () => Object.assign(s.colony, { store: 20, water: 10, grit: 20 });
  const run = (sec, each) => { for (let i = 0; i < sec * 20; i++) { if (i % 100 === 0) feed(); SIM.tick(s, 0.05); if (each) each(); } };
  run(30);
  for (let i = 0; i < builders; i++) SIM.queueEgg(s, 'builder');
  if (builders) run(30 * builders + 10);
  return { s, run, r: s.queen.room };
}
const carve = (s, x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) s.nest.cells[y * NW + x] = 1; s.nest.ver++; };

test('an open cave holds no room: it needs walls', () => {
  const { s, r } = founded(); const x0 = r.x0 + r.w + 1;
  carve(s, r.x0 + r.w, r.y0 + 1, 1, 1); carve(s, x0, r.y0, 8, 5);
  const p = SIM.roomPlan(s, 'hatchery', x0 + 2, r.y0 + 1);
  assert.equal(p.ok, false); assert.match(p.why, /too open/);
  // A pocket the room's own size, one doorway: fits.
  const { s: s2, r: r2 } = founded(); carve(s2, r2.x0 + r2.w, r2.y0 + 1, 1, 1); carve(s2, r2.x0 + r2.w + 1, r2.y0, 4, 3);
  const p2 = SIM.roomPlan(s2, 'hatchery', r2.x0 + r2.w + 1, r2.y0);
  assert.ok(p2.ok, p2.why); assert.equal(p2.door.length, 1); assert.equal(p2.dig.length, 0);
});

test('a room may not share a wall with another; dirt between is fine', () => {
  const { s, r } = founded();
  const p = SIM.roomPlan(s, 'hatchery', r.x0 + r.w, r.y0);
  assert.equal(p.ok, false); assert.match(p.why, /share a wall/);
});

test('a plan on solid soil beside a tunnel: its digs and a doorway, then the builders build it', () => {
  const { s, run, r } = founded(2); const x0 = r.x0 + r.w, y = r.y0 + 2;
  for (let x = x0; x < x0 + 7; x++) SIM.toggleDigOrder(s, x, y);
  run(120);
  assert.ok(cell(s, x0 + 6, y), 'corridor dug');
  Object.assign(s.colony, { store: 20, water: 10, grit: 20 });
  const p = SIM.snapPlan(s, 'hatchery', x0 + 3, y + 3);
  assert.ok(p.ok, p.why); assert.equal(p.door.length, 1); assert.equal(p.dig.length, 13, '12 cells and a doorway');
  const before = s.nest.digOrders.length;
  assert.ok(SIM.queueRoom(s, 'hatchery', null, [p.x0, p.y0]), 'placed');
  assert.equal(s.nest.digOrders.length - before, 13); assert.ok(s.nest.digOrders.every((o) => o.plan));
  const job = s.colony.buildQueue[0]; assert.ok(job.wait, 'waits to be dug');
  assert.equal(SIM.toggleDigOrder(s, p.door[0][0], p.door[0][1]), 'planned', 'a plan’s digs stay');
  run(400);
  assert.ok(SIM.roomOf(s, 'hatchery'), 'room built');
  const h = SIM.roomOf(s, 'hatchery'); assert.equal(h.x0, p.x0); assert.equal(h.y0, p.y0);
});

test('a room’s wall stays a wall: no third way in', () => {
  const { s, r } = founded(); const x0 = r.x0 + r.w + 1;
  carve(s, r.x0 + r.w, r.y0 + 1, 1, 1); carve(s, x0, r.y0, 4, 3); carve(s, x0 + 4, r.y0 + 2, 2, 1); // two doorways
  s.nest.rooms.push({ key: 'hatchery', x0, y0: r.y0, w: 4, h: 3 }); carve(s, x0, r.y0 + 4, 4, 1);
  assert.equal(SIM.toggleDigOrder(s, x0 + 1, r.y0 + 3), 'wall');
});

test('cancelling a plan takes its digs with it', () => {
  const { s, r } = founded(); const x0 = r.x0 + r.w; Object.assign(s.colony, { store: 20, water: 10, grit: 20 });
  carve(s, x0, r.y0 + 2, 6, 1);
  assert.ok(SIM.queueRoom(s, 'hatchery', [x0 + 2, r.y0 + 5]));
  assert.ok(s.nest.digOrders.length > 10);
  assert.equal(SIM.cancelBuilds(s), 1); assert.equal(s.nest.digOrders.length, 0);
});

test('a builder you play digs: twice a builder’s pace, no builders needed', () => {
  const { s, run, r } = founded(); const P = s.player;
  assert.ok(P.ant, 'you hatched'); P.ant.caste = 'builder'; P.inNest = true; P.ant.state = 'nest';
  const x0 = r.x0 + r.w, y = r.y0 + 2; P.ant.nx = x0 - 0.5; P.ant.ny = y + 0.5; P.ntx = x0 - 1; P.nty = y;
  assert.equal(SIM.toggleDigOrder(s, x0, y), 'added');
  const need = s.nest.digOrders[0].need; let t = 0;
  run(need, () => { if (s.nest.digOrders.length) t += 0.05; });
  assert.ok(cell(s, x0, y), 'dug');
  assert.ok(t < need * 0.6, `took ${t.toFixed(1)} s of ${need}`);
});
