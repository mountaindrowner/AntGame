// Build 55: Old Black, the second wild boss. Out of reach in the air; the bottle cap brings him down.
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
  s.active[REGION.side3] = true; step(s, 3); return s;
}
function soldiers(s, n, x, y) { SIM.stress(s, n); const out = s.ants.slice(-n); out.forEach((a, i) => Object.assign(a, { caste: 'soldier', state: 'patrol', hp: 99, x: x + (i % 6 - 3) * 6, y: y + (Math.floor(i / 6) - 2) * 6, explore: -1e9, flee: 0 })); for (const a of out) { a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); } return out; }
const keep = (s, out, b) => () => { s.colony.store = 150; s.colony.protein = 200; out.forEach((a, i) => { if (a.state === 'away' || a.state === 'dead') return; a.hp = 99; a.x = b.x + Math.cos(i) * 2 * T; a.y = b.y + Math.sin(i) * 2 * T; }); };

const muster = (s, b) => { s.muster = { x: Math.floor(b.hx / T), y: Math.floor(b.hy / T), t0: s.t, sent: 9, from: { main: 3, war: 3, garden: 3 }, arrived: 0 }; };
const fed = (s) => () => { s.colony.store = 150; s.colony.protein = 200; };

test('Old Black roosts on the west side once the edges stir, with a bottle cap nearby', () => {
  const s = wild(), b = s.bosses.crow; assert.ok(b);
  assert.equal(SIM.WILD_SIDE[SIM.areaOf(s, Math.floor(b.hx / T), Math.floor(b.hy / T))], 'west');
  step(s, 4); assert.ok(s.items.some((f) => f.type === 'cap'), 'his lure lies by the roost');
});

test('a muster rouses him into the air, where bites can’t reach him; he snatches ants', () => {
  const s = wild(), b = s.bosses.crow, out = soldiers(s, 10, b.x, b.y);
  step(s, 2, keep(s, out, b)); assert.equal(b.mode, 'idle');
  muster(s, b); step(s, 2, keep(s, out, b)); assert.equal(b.mode, 'fight'); assert.ok(b.air);
  const hp = b.hp; step(s, 2, keep(s, out, b)); assert.equal(b.hp, hp, 'out of reach');
  const v = out[0]; b.atk = { kind: 'grab', x: v.x, y: v.y, r: 1.4 * T, t: 0, at: 0.05 }; for (const a of out.slice(1)) a.x += 20 * T;
  step(s, 0.2, fed(s)); assert.ok(b.carry, 'snatched');
  step(s, 5.5, () => { fed(s)(); b.snatchCd = 99; }); assert.ok((s.colony.deaths.crow || 0) >= 1, 'carried off');
});

test('carry the bottle cap under him and he comes down; then he can be bitten; twenty ants keep him down', () => {
  const s = wild(), b = s.bosses.crow; muster(s, b); b.mode = 'fight'; step(s, 0.2, fed(s));
  const P = s.player, me = P.ant; P.inNest = false; me.state = 'player'; me.x = b.x; me.y = b.y + 2 * T; me.tx = Math.floor(me.x / T); me.ty = Math.floor(me.y / T);
  const cap = { x: me.tx, y: me.ty, kind: 'food', type: 'cap', amt: 1, carried: true }; s.items.push(cap); P.big = cap;
  b.snatchCd = 99; step(s, 0.3, () => { fed(s)(); me.x = b.x; me.y = b.y + 2 * T; });
  assert.equal(b.air, false, 'down for the cap'); assert.ok(b.groundT > 5);
  const out = soldiers(s, 24, b.x, b.y), hp = b.hp; step(s, 1, keep(s, out, b));
  assert.ok(b.hp < hp, 'bitten'); assert.ok(b.pinned, 'twenty ants pin him');
  const g = b.groundT; step(s, 2, keep(s, out, b)); assert.ok(b.groundT >= g - 0.01, 'pinned, he stays down');
});

test('he steals glowrock while he’s up, and gives it back when he falls: his feather, the west quiet, two more', () => {
  const s = wild(), b = s.bosses.crow, c = s.colony; muster(s, b); b.mode = 'fight'; c.glow = 3; step(s, 0.2, fed(s));
  b.stealT = 0.01; b.snatchCd = 99; step(s, 0.2, fed(s)); assert.equal(c.glow, 2); assert.equal(b.loot, 1);
  b.air = false; b.groundT = 99; b.hp = 0.1; const out = soldiers(s, 6, b.x, b.y); step(s, 0.5, keep(s, out, b));
  assert.ok(b.dead); assert.equal(c.glow, 2 + 1 + 2, 'his loot back, and two'); assert.ok(c.trophies.blackfeather); assert.ok(s.wild.beaten.west);
});
