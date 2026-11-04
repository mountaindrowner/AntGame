// Build 56: the Cordyceps Colony, the third wild boss. Needs four colonies.
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
  s.active[REGION.hedge5] = true; step(s, 3); return s;
}
function soldiers(s, n, x, y) { SIM.stress(s, n); const out = s.ants.slice(-n); out.forEach((a, i) => Object.assign(a, { caste: 'soldier', state: 'patrol', hp: 99, x: x + (i % 6 - 3) * 6, y: y + (Math.floor(i / 6) - 2) * 6, explore: -1e9, flee: 0 })); for (const a of out) { a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); } return out; }
const keep = (s, out, b) => () => { s.colony.store = 150; s.colony.protein = 200; out.forEach((a, i) => { if (a.state === 'away' || a.state === 'dead') return; a.hp = 99; a.x = b.x + Math.cos(i) * 2 * T; a.y = b.y + Math.sin(i) * 2 * T; }); };

const muster = (s, b, n = 4) => { const from = {}; ['main', 'war', 'garden', 'quarry'].slice(0, n).forEach((k) => (from[k] = 3)); s.muster = { x: Math.floor(b.hx / T), y: Math.floor(b.hy / T), t0: s.t, sent: 12, from, arrived: 0 }; };
const fed = (s) => () => { s.colony.store = 150; s.colony.protein = 200; };

test('the dead nest sits in the hedge on the east side, and only a muster of four colonies wakes it', () => {
  const s = wild(), b = s.bosses.hollow; assert.ok(b);
  assert.equal(SIM.WILD_SIDE[SIM.areaOf(s, Math.floor(b.hx / T), Math.floor(b.hy / T))], 'east');
  const out = soldiers(s, 8, b.x, b.y); muster(s, b, 3); step(s, 2, keep(s, out, b)); assert.equal(b.mode, 'idle', 'three are not enough');
  muster(s, b, 4); step(s, 2, keep(s, out, b)); assert.equal(b.mode, 'fight');
});

test('awake, it sends out waves of infected; six round the heart shield it', () => {
  const s = wild(), b = s.bosses.hollow; muster(s, b); b.mode = 'fight'; b.waveT = 0.01; b.cd = 99;
  step(s, 0.2, fed(s)); const z = s.critters.filter((c) => c.kind === 'zombie'); assert.ok(z.length >= 6, `${z.length} infected`);
  const out = soldiers(s, 8, b.x, b.y), dmg = () => { const h = b.hp; step(s, 1, keep(s, out, b)); return h - b.hp; };
  b.waveT = 99; for (const c of s.critters) if (c.kind === 'zombie') { c.x = b.x + 3 * T; c.y = b.y; c.hp = 1e9; }
  const shielded = dmg(); for (const c of s.critters) if (c.kind === 'zombie') c.gone = true; step(s, 0.1, fed(s));
  const open = dmg(); assert.ok(open > shielded * 2.5, `shielded ${shielded.toFixed(1)}, open ${open.toFixed(1)}`);
});

test('a spored ant dies in 25 seconds and rises infected, unless a medic reaches it', () => {
  const s = wild(); SIM.stress(s, 2); const [a, m] = s.ants.slice(-2), far = (o, dx) => Object.assign(o, { state: 'patrol', x: (s.world.ex + 40 + dx) * T, y: s.world.ey * T, explore: -1e9, hp: 99, flee: 0 });
  far(a, 0); m.caste = 'medic'; far(m, 60); SIM.sporeAnt(s, a); const n0 = s.critters.filter((q) => q.kind === 'zombie').length;
  step(s, 26, () => { fed(s)(); if (a.state !== 'dead' && s.ants.includes(a)) far(a, 0); far(m, 60); });
  assert.ok(!s.ants.includes(a), 'dead'); assert.equal(s.critters.filter((q) => q.kind === 'zombie').length, n0 + 1, 'it rises as one of them');
  SIM.stress(s, 1); const b2 = s.ants.at(-1); far(b2, 0); SIM.sporeAnt(s, b2); step(s, 26, () => { fed(s)(); far(b2, 0); far(m, 2); });
  assert.notEqual(b2.state, 'dead'); assert.equal(b2.hspore, null, 'the medic cured it');
});

test('the heart falls: its infected rot, the east edge quiets, two glowrock, and no more outbreaks', () => {
  const s = wild(), b = s.bosses.hollow, c = s.colony; muster(s, b); b.mode = 'fight'; b.waveT = 0.01; step(s, 0.2, fed(s));
  b.hp = 0.1; b.waveT = 99; for (const z of s.critters) if (z.kind === 'zombie') z.gone = true; const out = soldiers(s, 6, b.x, b.y); step(s, 0.5, keep(s, out, b));
  assert.ok(b.dead); assert.ok(c.trophies.sporeheart); assert.ok(s.wild.beaten.east); assert.ok(c.glow >= 2);
  assert.equal(s.critters.filter((q) => q.kind === 'zombie').length, 0);
  SIM.stress(s, 1); const a = s.ants.at(-1); SIM.sporeAnt(s, a); assert.equal(a.hspore == null, true, 'immune');
});
