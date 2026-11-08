// Build 83 (Mark: "builders take time to build sometimes, they don't respond to commands too quickly"): two builders
// to a face, and a builder on a shared room job goes to an order nobody has taken.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { FACE_CREW, rethinkRoom } from '../src/sim/nest.js';

let seed = 83; const rnd0 = Math.random; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
test.after(() => { Math.random = rnd0; });
const run = (s, sec) => { for (let i = 0; i < sec * 20; i++) { if (i % 100 === 0) Object.assign(s.colony, { store: 60, water: 20 }); SIM.tick(s, 0.05); } };
function crew(nb) {
  const s = SIM.create(7), q = s.queen; SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done'; run(s, 30);
  for (let k = 0; k < 4; k++) { SIM.queueEgg(s, 'forager'); run(s, 22); } for (let k = 0; k < nb; k++) { SIM.queueEgg(s, 'builder'); run(s, 28); }
  s.spider = null; s.director.next = 1e9; return s;
}
const builders = (s) => s.ants.filter((a) => !a.team && a.caste === 'builder' && a.state !== 'dead');
// A tunnel of n orders off a dug cell.
function tunnel(s, len) {
  const n = s.nest;
  for (let y = 2; y < 30; y++) for (let x = 2; x < SIM.NW - len - 2; x++) { if (!n.cells[SIM.nidx(x, y)]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) { const got = []; for (let k = 1; k <= len; k++) { if (SIM.toggleDigOrder(s, x + dx * k, y + dy * k) === 'added') got.push([x + dx * k, y + dy * k]); else break; }
      if (got.length === len) return got; for (const [a, b] of got) SIM.toggleDigOrder(s, a, b); } }
  return null;
}

test('two builders work one face together', () => {
  assert.equal(FACE_CREW, 2);
  const s = crew(3), t = tunnel(s, 1); assert.ok(t);
  const k = 'd' + t[0][0] + ',' + t[0][1]; let most = 0;
  for (let i = 0; i < 30 * 20 && s.nest.digOrders.length; i++) { SIM.tick(s, 0.05); most = Math.max(most, builders(s).filter((a) => a.task === k).length); }
  assert.equal(most, 2, 'two on it, not one');
});

test('more builders dig a tunnel faster (five beat three)', () => {
  const time = (nb) => { const s = crew(nb); assert.ok(tunnel(s, 8)); let t = 0; while (s.nest.digOrders.length && t < 600) { run(s, 0.5); t += 0.5; } return t; };
  const three = time(3), five = time(5);
  assert.ok(five < three * 0.9, `five ${five} s vs three ${three} s`);
});

test('a builder on a shared room job goes to an order nobody has taken', () => {
  const s = crew(3), [a, b] = builders(s);
  for (const o of [a, b]) { o.state = 'in'; o.task = 'j'; o.goal = 'job'; o.nx = 20; o.ny = 2; }
  const t = tunnel(s, 1); assert.ok(t);
  rethinkRoom(s, a, 2.1);
  assert.equal(a.task, 'd' + t[0][0] + ',' + t[0][1], 'it went to the dig');
  b.rethinkT = 0; a.task = 'j'; b.task = 'j'; for (const o of s.ants) if (o !== a && o !== b) o.task = null;
  // alone on the room, it stays
  a.task = 'j'; b.task = null; rethinkRoom(s, a, 2.1); assert.equal(a.task, 'j');
});
