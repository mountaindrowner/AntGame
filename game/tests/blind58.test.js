// Build 58: the Sinkhole, Old Blind, and the Takeover that opens Phase 2.
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
  s.colony.zones = { ...(s.colony.zones || {}), fire: 1 }; step(s, 3); return s;
}
function soldiers(s, n, x, y) { SIM.stress(s, n); const out = s.ants.slice(-n); out.forEach((a, i) => Object.assign(a, { caste: 'soldier', state: 'patrol', hp: 99, x: x + (i % 6 - 3) * 6, y: y + (Math.floor(i / 6) - 2) * 6, explore: -1e9, flee: 0 })); for (const a of out) { a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); } return out; }
const keep = (s, out, b) => () => { s.colony.store = 150; s.colony.protein = 200; out.forEach((a, i) => { if (a.state === 'away' || a.state === 'dead') return; a.hp = 99; a.x = b.x + Math.cos(i) * 2 * T; a.y = b.y + Math.sin(i) * 2 * T; }); };
const muster = (s, b, n = 5) => { const from = {}; ['main', 'war', 'garden', 'quarry', 'brood', 'watch'].slice(0, n).forEach((k) => (from[k] = 3)); s.muster = { x: Math.floor(b.hx / T), y: Math.floor(b.hy / T), t0: s.t, sent: 15, from, arrived: 0 }; };
const fed = (s) => () => { s.colony.store = 150; s.colony.protein = 200; };

test('with the fire ants’ queen dead, their mound caves in: the Sinkhole, a wide open seam', () => {
  const s = wild(); assert.ok(s.wild.sinkhole); assert.match(s.banner.title, /ground gives way/);
  const m = s.wild.seams.find((q) => q.sink); assert.equal(m.r, 4);
  step(s, 1); assert.ok(s.bosses.blind, 'Old Blind lives under it');
});

test('Old Blind wakes only for the Supercolony, mustered five strong', () => {
  const s = wild(), b = s.bosses.blind, out = soldiers(s, 10, b.x + 6 * T, b.y);
  muster(s, b, 5); step(s, 2, keep(s, out, b)); assert.equal(b.mode, 'idle', 'no Supercolony, no fight');
  s.colony.evo.supercolony = true; muster(s, b, 4); step(s, 2, keep(s, out, b)); assert.equal(b.mode, 'idle', 'four are not enough');
  muster(s, b, 5); step(s, 2, keep(s, out, b)); assert.equal(b.mode, 'fight');
});

test('under the earth it can’t be bitten; it erupts where the ring was, flinging ants; up, it can be', () => {
  const s = wild(), b = s.bosses.blind; s.colony.evo.supercolony = true; muster(s, b); b.mode = 'fight';
  const out = soldiers(s, 12, b.hx + 8 * T, b.hy); const pin = () => { fed(s)(); for (const a of out) { if (a.state === 'dead') continue; a.hp = 99; } };
  const hp0 = b.hp; step(s, 1, pin); assert.ok(b.under); assert.equal(b.hp, hp0);
  b.burrowT = 0; step(s, 0.1, pin); assert.ok(b.atk && b.atk.kind === 'ring');
  const k = b.atk; step(s, 1.4, pin); assert.ok(!b.under, 'up'); assert.equal(b.x, k.x);
  for (const a of out) { a.x = b.x + T; a.y = b.y; }
  const hp1 = b.hp; step(s, 1, () => { pin(); for (const a of out) { a.x = b.x + T; a.y = b.y; } b.cd = 99; }); assert.ok(b.hp < hp1, 'bitten while up');
});

test('the Sinkhole’s open seam burns four tiles round', () => {
  const s = wild(), m = s.wild.sinkhole; SIM.stress(s, 1); const a = s.ants.at(-1);
  const put = () => { if (a.state === 'dead') return; Object.assign(a, { state: 'patrol', x: (m.x + 3) * T, y: (m.y + 0.5) * T, explore: -1e9 }); a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); };
  put(); const hp = a.hp; step(s, 2, put); assert.ok(a.hp < hp - 0.3, `${hp} -> ${a.hp}`);
});

test('Old Blind falls: the glow is yours, and the Takeover opens Phase 2', () => {
  const s = wild(), b = s.bosses.blind, c = s.colony; c.evo.supercolony = true; muster(s, b); b.mode = 'fight'; b.under = false; b.upT = 99; b.hp = 0.1;
  const out = soldiers(s, 8, b.x, b.y); step(s, 0.5, keep(s, out, b));
  assert.ok(b.dead); assert.ok(c.trophies.blindclaw); assert.ok(s.takeoverReady); assert.ok(s.wild.beaten.south);
  Object.assign(c, { glow: 5, genes: 30, store: 400, cap: 900, protein: 200 });
  assert.equal(SIM.evoLock(s, 'takeover'), ''); assert.ok(SIM.buyEvo(s, 'takeover')); assert.ok(s.phase2, 'Phase 2 begins');
  const r = SIM.deserialize(SIM.serialize(s)); assert.ok(r.phase2 && r.takeoverReady);
});

test('without Old Blind beaten, the Takeover stays shut', () => {
  const s = founded(); s.colony.evo.supercolony = true; assert.match(SIM.evoLock(s, 'takeover'), /Old Blind/);
});
