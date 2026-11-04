// Build 57: the Oak's Crown: climbing the trunk, and the Hornet Queen. Needs four colonies.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
let seed = 5656; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; // fixed rolls

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
  s.active[REGION.oak] = true; step(s, 3); return s;
}
function soldiers(s, n, x, y) { SIM.stress(s, n); const out = s.ants.slice(-n); out.forEach((a, i) => Object.assign(a, { caste: 'soldier', state: 'patrol', hp: 99, x: x + (i % 6 - 3) * 6, y: y + (Math.floor(i / 6) - 2) * 6, explore: -1e9, flee: 0 })); for (const a of out) { a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); } return out; }
const keep = (s, out, b) => () => { s.colony.store = 150; s.colony.protein = 200; out.forEach((a, i) => { if (a.state === 'away' || a.state === 'dead') return; a.hp = 99; a.x = b.x + Math.cos(i) * 2 * T; a.y = b.y + Math.sin(i) * 2 * T; }); };
const muster = (s, b, n = 4) => { const from = {}; ['main', 'war', 'garden', 'quarry'].slice(0, n).forEach((k) => (from[k] = 3)); s.muster = { x: Math.floor(b.hx / T), y: Math.floor(b.hy / T), t0: s.t, sent: 12, from, arrived: 0 }; };
const CASTES_FIGHT = (a) => SIM.CASTES[a.caste].fight;
const fed = (s) => () => { s.colony.store = 150; s.colony.protein = 200; };
const atFoot = (s, b) => { const P = s.player, me = P.ant; P.inNest = false; me.state = 'player'; me.x = b.x; me.y = b.y; me.tx = Math.floor(me.x / T); me.ty = Math.floor(me.y / T); P.tx = null; return me; };
const crew = (s, n, b) => { const out = soldiers(s, n, b.x, b.y); for (const a of out) { a.follow = true; a.state = 'follow'; } return out; };

test('her nest hangs on the Oak’s south face; a muster of four colonies at its foot wakes her', () => {
  const s = wild(), b = s.bosses.hornets, oak = s.world.landmarks.find((l) => l.kind === 'oak'); assert.ok(b);
  assert.ok(Math.abs(b.hx / T - oak.x) < 1 && b.hy / T > oak.y + oak.r, 'at the foot, south side');
  muster(s, b, 3); step(s, 1, fed(s)); assert.equal(b.mode, 'idle');
  muster(s, b, 4); const out = crew(s, 4, b); step(s, 1, keep(s, out, b)); assert.equal(b.mode, 'fight');
});

test('you climb from the Oak’s foot with your crew; only ants up at her nest can bite her', () => {
  const s = wild(), b = s.bosses.hornets; muster(s, b); b.mode = 'fight'; b.cd = 1e9; b.waspT = 1e9;
  const P = s.player, me = P.ant; P.inNest = false; me.state = 'player'; me.x = b.x + 30 * T; me.y = b.y; assert.match(SIM.climbLock(s), /foot/);
  atFoot(s, b); const out = crew(s, 8, b), ground = soldiers(s, 8, b.x, b.y);
  const hp0 = b.hp; step(s, 1, () => { fed(s)(); for (const g of ground) { g.x = b.x; g.y = b.y; g.hp = 99; } }); assert.equal(b.hp, hp0, 'the ground can’t reach her');
  assert.ok(SIM.climb(s)); step(s, 10, () => { fed(s)(); b.cd = 1e9; });
  assert.ok(me.climb >= SIM.CROWN - 1, `you are up (${me.climb})`); assert.ok(out.every((a) => a.state === 'climb' && a.climb > SIM.CROWN - 60), 'the crew with you');
  assert.ok(b.hp < hp0, 'bitten from the top');
  SIM.climbDown(s); step(s, 6, fed(s)); assert.equal(me.climb, 0); assert.equal(P.climb, null); assert.ok(out.every((a) => a.state === 'follow'));
});

test('a diving hornet knocks a high climber off the bark', () => {
  const s = wild(), b = s.bosses.hornets; muster(s, b); b.mode = 'fight'; b.waspT = 1e9; atFoot(s, b); const out = crew(s, 3, b);
  SIM.climb(s); step(s, 6, () => { fed(s)(); b.cd = 1e9; for (const a of out) a.hp = 99; });
  const v = out[0]; assert.ok(v.climb > 120); b.dive = { id: v.id, t: 0, at: 0.05 }; step(s, 0.2, fed(s));
  assert.equal(v.climb, 0); assert.equal(v.state, 'follow');
});

test('raging, her swarm sweeps the upper trunk, unless a dozen hold the top', () => {
  const run = (n) => { const s = wild(), b = s.bosses.hornets; muster(s, b); b.mode = 'fight'; b.phase = 2; b.waspT = 1e9; atFoot(s, b); const out = crew(s, n, b);
    SIM.climb(s); step(s, 10, () => { fed(s)(); b.cd = 1e9; b.swarmT = 99; for (const a of out) a.hp = 99; }); b.swarmT = 0.01; for (const a of out) a.hp = 50; step(s, 0.1, () => { b.cd = 1e9; }); return out.reduce((t, a) => t + (50 - a.hp), 0); };
  assert.ok(run(6) >= 10, 'six get swept'); assert.equal(run(13), 0, 'thirteen hold together');
});

test('beaten: everyone comes down, the comb gives 3 meat a minute, two glowrock', () => {
  const s = wild(), b = s.bosses.hornets, c = s.colony; muster(s, b); b.mode = 'fight'; b.waspT = 1e9; atFoot(s, b); const out = crew(s, 6, b);
  SIM.climb(s); step(s, 10, () => { fed(s)(); b.cd = 1e9; for (const a of out) a.hp = 99; }); b.hp = 0.1; step(s, 0.5, () => { fed(s)(); b.cd = 1e9; });
  assert.ok(b.dead); assert.ok(c.trophies.comb); assert.ok(s.wild.beaten.oak); assert.ok(c.glow >= 2);
  assert.equal(s.player.climb, null); assert.ok(out.every((a) => !a.climb));
  s.ants = s.ants.filter((a) => a.isPlayer || CASTES_FIGHT(a) < 3); /* fighters eat meat too: measure without them */
  const p0 = c.protein; for (let i = 0; i < 60; i++) { c.store = 150; step(s, 1); } assert.ok(c.protein - p0 >= 2.5, `+${(c.protein - p0).toFixed(1)}`);
});
