// Build 49: the other four daughters, each with her own ants and a gift to the main nest once joined.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.critters = []; s.bugT = -1e9; s.strikeT = s.strikeT.map(() => 1e9);
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const rich = (c) => Object.assign(c, { store: 150, water: 60, waterCap: 60, protein: 200, sugar: 50 });
function farOutpost(s, minD = 170) {
  const w = s.world;
  for (let r = minD; r < minD + 120; r += 10) for (let a = 0; a < 6.28; a += 0.3) {
    const x = Math.round(w.ex + Math.cos(a) * r), y = Math.round(w.ey + Math.sin(a) * r);
    if (x > 3 && y > 3 && x < w.W - 3 && y < w.H - 3 && !w.blocked[y * w.W + x]) { s.outposts.push({ id: 900 + s.outposts.length, x, y, region: SIM.areaOf(s, x, y), done: true, work: 30 }); return s.outposts.length - 1; }
  }
  throw new Error('no spot');
}
function join(s, key) {
  s.colony.zones = {}; for (const Z of SIM.ZONES.slice(0, 11)) s.colony.zones[Z.key] = 1; s.colony.evo.royal = true;
  const oi = farOutpost(s); assert.ok(SIM.foundDaughter(s, oi, key), SIM.daughterLock(s, oi, key));
  const d = s.daughters[s.daughters.length - 1]; step(s, 11); d.tunnel.progress = d.tunnel.need; step(s, 1);
  assert.equal(d.state, 'ready'); return d;
}
const hatchMix = (s, d, n) => { const got = {}; for (let i = 0; i < n; i++) { rich(s.colony); d.eggT = 30; d.pop = {}; step(s, 0.05); for (const k in d.pop) got[k] = (got[k] || 0) + d.pop[k]; } return got; };

test('each daughter lays her own mix: the Brood Hall big castes and nurses, the Quarry builders, the Garden and Watch mostly foragers', () => {
  let s = founded(); s.colony.evo.majors = true; let d = join(s, 'brood'); let m = hatchMix(s, d, 120);
  assert.ok(m.major >= 20 && m.nurse >= 8 && m.forager >= 30, JSON.stringify(m));
  assert.ok(!m.supermajor, 'no Supermajors without Polymorphism');
  s = founded(); d = join(s, 'quarry'); m = hatchMix(s, d, 120); assert.ok(m.builder >= 30 && m.forager >= 40, JSON.stringify(m));
  s = founded(); d = join(s, 'garden'); m = hatchMix(s, d, 100); assert.ok(m.forager >= 80, JSON.stringify(m));
  s = founded(); d = join(s, 'watch'); m = hatchMix(s, d, 100); assert.ok(m.forager >= 65 && m.soldier >= 8, JSON.stringify(m));
});

test('with no meat in store, a caste that needs meat hatches as a forager', () => {
  const s = founded(); const d = join(s, 'brood'); const got = {};
  for (let i = 0; i < 60; i++) { rich(s.colony); s.colony.protein = 0; d.eggT = 30; d.pop = {}; step(s, 0.05); for (const k in d.pop) got[k] = (got[k] || 0) + d.pop[k]; }
  assert.ok(!got.major && !got.soldier && !got.supermajor, JSON.stringify(got));
});

test('the Quarry: a stone a minute for every 4 of her ants; your builders dig 25% faster', () => {
  const s = founded(), c = s.colony; const d = join(s, 'quarry'); d.pop = { builder: 20, forager: 20 }; d.eggT = -1e9;
  const g = c.grit; for (let i = 0; i < 60; i++) { rich(c); step(s, 1); }
  assert.ok(Math.abs(c.grit - g - 10) <= 1, `about 10 stone (${c.grit - g})`);
});

test('the Garden: a sugar a minute for every 5 of her ants', () => {
  const s = founded(), c = s.colony; const d = join(s, 'garden'); d.pop = { forager: 50 }; d.eggT = -1e9;
  const g = c.sugarTotal; for (let i = 0; i < 60; i++) { rich(c); step(s, 1); }
  assert.ok(Math.abs(c.sugarTotal - g - 10) <= 1, `about 10 sugar (${c.sugarTotal - g})`);
});

test('the Watch maps the ground round her and stretches the outposts\u2019 reach', () => {
  let s = founded(); farOutpost(s, 60); s = SIM.deserialize(SIM.serialize(s)); s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9;
  let before = 0; for (const v of s.reachMask) before += v;
  const seen0 = s.seenMap.reduce((t, v) => t + v, 0);
  join(s, 'watch');
  let after = 0; for (const v of s.reachMask) after += v;
  assert.ok(after > before * 1.2, `reach ${before} -> ${after}`);
  assert.ok(s.seenMap.reduce((t, v) => t + v, 0) > seen0 + 100, 'the ground round her mapped');
});

test('near her, a daughter’s builders and nurses stay in her chambers; her foragers go out', () => {
  const s = founded(); const d = join(s, 'quarry'); d.pop = { builder: 10, forager: 10 }; d.eggT = -1e9;
  const me = s.player.ant; s.player.inNest = false; me.state = 'player'; me.x = (d.ex + 5) * T; me.y = d.ey * T; me.tx = d.ex + 5; me.ty = d.ey; s.player.tx = me.x; s.player.ty = me.y;
  step(s, 30);
  const mine = s.ants.filter((a) => a.dh === 'quarry');
  assert.ok(mine.filter((a) => a.caste === 'builder').every((a) => a.state === 'in'), 'builders in');
  assert.ok(mine.filter((a) => a.caste === 'forager').some((a) => a.state !== 'in'), 'foragers out');
});

test('the Brood Hall: your queen’s eggs hatch 20% faster once she is joined', () => {
  const grow = (s) => { const c = s.colony; c.eggQueue.length = 0; c.eggs = [{ caste: 'forager', t: 0, need: 1e6 }]; step(s, 10); return c.eggs[0].t; };
  const a = founded(); rich(a.colony); const base = grow(a);
  const b = founded(); const d = join(b, 'brood'); d.eggT = -1e9; rich(b.colony); const fast = grow(b);
  assert.ok(Math.abs(fast / base - 1.2) < 0.05, `${(fast / base).toFixed(2)}×`);
});
