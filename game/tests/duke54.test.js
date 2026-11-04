// Build 54: the Duke, the first wild boss. Only a muster of three colonies wakes him.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const { T, REGION } = SIM;
function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.critters = []; s.bugT = -1e9; s.strikeT = s.strikeT.map(() => 1e9); s.rain.next = 1e9;
  return s;
}
const step = (s, sec, f) => { for (let i = 0; i < sec * 20; i++) { if (f) f(); SIM.tick(s, 0.05); } };
const daughter = (s, key, dx) => ({ key, oid: 0, region: 0, ex: s.world.ex + dx, ey: s.world.ey, state: 'ready', tunnel: { progress: 1, need: 1 }, pop: {}, real: false, eggT: -1e9, hatched: 0, rooms: [null, null] });
function wild() {
  const s = founded(); s.daughters = ['war', 'garden', 'quarry'].map((k, i) => daughter(s, k, 200 + i * 10));
  s.active[REGION.drain] = true; step(s, 3); return s;
}
function soldiers(s, n, x, y) { SIM.stress(s, n); const out = s.ants.slice(-n); out.forEach((a, i) => Object.assign(a, { caste: 'soldier', state: 'patrol', hp: 99, x: x + (i % 6 - 3) * 6, y: y + (Math.floor(i / 6) - 2) * 6, explore: -1e9, flee: 0 })); for (const a of out) { a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); } return out; }
const keep = (s, out, b) => () => { s.colony.store = 150; s.colony.protein = 200; out.forEach((a, i) => { if (a.state === 'away' || a.state === 'dead') return; a.hp = 99; a.x = b.x + Math.cos(i) * 2 * T; a.y = b.y + Math.sin(i) * 2 * T; }); };

test('the Duke lives in the Ditch only once the edges stir', () => {
  const s = founded(); s.active[REGION.drain] = true; step(s, 1); assert.ok(!s.bosses.duke);
  const w = wild(); assert.ok(w.bosses.duke); assert.equal(SIM.WILD_SIDE[SIM.areaOf(w, Math.floor(w.bosses.duke.hx / T), Math.floor(w.bosses.duke.hy / T))], 'south');
});

test('a crew can’t wake him or hurt him; a muster from three colonies at his lair does', () => {
  const s = wild(), b = s.bosses.duke, out = soldiers(s, 12, b.x, b.y);
  step(s, 3, keep(s, out, b)); assert.equal(b.mode, 'idle'); assert.equal(b.hp, b.maxHp, 'bites do nothing');
  s.muster = { x: Math.floor(b.hx / T), y: Math.floor(b.hy / T), t0: s.t, sent: 12, from: { main: 4, war: 4 }, arrived: 0 };
  step(s, 1, keep(s, out, b)); assert.equal(b.mode, 'idle', 'two colonies are not enough');
  s.muster.from.garden = 4; step(s, 2, keep(s, out, b));
  assert.equal(b.mode, 'fight'); assert.ok(b.hp < b.maxHp, 'now he can be bitten');
});

test('he gulps up to six whole; bite him hard in time and he retches them up', () => {
  const s = wild(), b = s.bosses.duke; b.mode = 'fight'; s.muster = { x: Math.floor(b.hx / T), y: Math.floor(b.hy / T), t0: 0, sent: 9, from: { main: 3, war: 3, garden: 3 } };
  const out = soldiers(s, 9, b.x, b.y); b.cd = 99; b.diveCd = 99;
  b.atk = { kind: 'grab', x: b.x, y: b.y, r: 4 * T, t: 0, at: 0.05 }; step(s, 0.2, () => { s.colony.protein = 200; });
  assert.equal(b.belly.ids.length, 6); assert.equal(out.filter((a) => a.state === 'away').length, 6);
  b.hp -= 200; step(s, 0.2);
  assert.equal(b.belly, null); assert.equal(out.filter((a) => a.state === 'away').length, 0, 'all back');
  b.atk = { kind: 'grab', x: b.x, y: b.y, r: 4 * T, t: 0, at: 0.05 }; for (const a of out) if (a.state !== 'dead') { a.x = b.x; a.y = b.y; }
  step(s, 6, () => { s.colony.protein = 200; b.cd = 99; b.diveCd = 99; });
  assert.ok((s.colony.deaths.duke || 0) >= 1, 'not bitten in time: swallowed');
});

test('he dives and surfaces where the ring showed; thirty ants on him pin him', () => {
  const s = wild(), b = s.bosses.duke; b.mode = 'fight'; s.muster = { x: Math.floor(b.hx / T), y: Math.floor(b.hy / T), t0: 0, sent: 9, from: { main: 3, war: 3, garden: 3 } };
  const out = soldiers(s, 6, b.x + 8 * T, b.y); b.cd = 0; b.diveCd = 0;
  step(s, 0.1, () => { s.colony.protein = 200; });
  assert.ok(b.under && b.dive, 'under'); const tx = b.dive.x, ty = b.dive.y; assert.equal(b.atk.kind, 'ring');
  step(s, 2.5, () => { s.colony.protein = 200; });
  assert.ok(!b.under); assert.equal(b.x, tx); assert.equal(b.y, ty);
  const many = soldiers(s, 30, b.x, b.y); b.cd = 0; b.diveCd = 0; b.belly = null;
  step(s, 0.5, keep(s, many, b)); assert.ok(b.pinned, 'pinned'); assert.ok(!b.dive, 'no dive while pinned');
});

test('beaten: his croak (water, mud), the south edge quiet, and two glowrock', () => {
  const s = wild(), b = s.bosses.duke, c = s.colony; b.mode = 'fight'; b.hp = 0.1; s.muster = { x: Math.floor(b.hx / T), y: Math.floor(b.hy / T), t0: 0, sent: 9, from: { main: 3, war: 3, garden: 3 } };
  const out = soldiers(s, 6, b.x, b.y); step(s, 0.5, keep(s, out, b));
  assert.ok(b.dead); assert.ok(c.trophies.croak); assert.ok(s.wild.beaten.south); assert.ok(c.glow >= 2);
  c.water = 0; step(s, 4); assert.ok(c.water >= 1.5, `water ${c.water}`);
});
