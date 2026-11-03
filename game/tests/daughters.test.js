// Build 46: the nuptial flight and the first daughter colony, the War Camp.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const T = SIM.T;
function founded(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9; s.strikeT = s.strikeT.map(() => 1e9); s.mower.next = 1e9;
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const rich = (c) => Object.assign(c, { store: 150, water: 60, waterCap: 60, protein: 200 });
const beat = (s, n) => { s.colony.zones = {}; for (const Z of SIM.ZONES.slice(0, n)) s.colony.zones[Z.key] = 1; };
function farOutpost(s, minD = 170) {
  const w = s.world;
  for (let r = minD; r < minD + 120; r += 10) for (let a = 0; a < 6.28; a += 0.3) {
    const x = Math.round(w.ex + Math.cos(a) * r), y = Math.round(w.ey + Math.sin(a) * r);
    if (x > 3 && y > 3 && x < w.W - 3 && y < w.H - 3 && !w.blocked[y * w.W + x]) { s.outposts.push({ id: 900 + s.outposts.length, x, y, region: SIM.areaOf(s, x, y), done: true, work: 30 }); return s.outposts.length - 1; }
  }
  throw new Error('no spot');
}

test('a winged queen comes with the Royal chamber and the 3rd, 5th, 7th, 9th and 11th guardian', () => {
  const s = founded(); beat(s, 3);
  assert.equal(SIM.flightsAllowed(s), 0, 'no Royal chamber, no flight');
  s.colony.evo.royal = true; assert.equal(SIM.flightsAllowed(s), 1); assert.ok(SIM.flightReady(s));
  beat(s, 9); assert.equal(SIM.flightsAllowed(s), 4); beat(s, 13); assert.equal(SIM.flightsAllowed(s), 5);
});

test('where she may land: a finished outpost two regions from every nest; one War Camp; the rest come later', () => {
  const s = founded(); beat(s, 5); s.colony.evo.royal = true;
  const w = s.world; s.outposts.push({ id: 801, x: w.ex + 30, y: w.ey, region: 0, done: true, work: 30 });
  assert.match(SIM.daughterLock(s, s.outposts.length - 1, 'war'), /too near home/);
  const oi = farOutpost(s);
  assert.equal(SIM.daughterLock(s, oi, 'war'), '');
  assert.match(SIM.daughterLock(s, oi, 'garden'), /later build/);
  assert.ok(SIM.foundDaughter(s, oi, 'war'));
  const oj = farOutpost(s, 420);
  assert.match(SIM.daughterLock(s, oj, 'war'), /already/);
});

test('the flight, the landing, a slow tunnel fed from the store, then she lays her own eggs', () => {
  const s = founded(); beat(s, 3); s.colony.evo.royal = true; rich(s.colony);
  const oi = farOutpost(s); SIM.foundDaughter(s, oi, 'war'); const d = s.daughters[0];
  assert.equal(d.state, 'flight'); assert.equal(s.banner.title, 'The nuptial flight');
  step(s, 11); assert.equal(d.state, 'tunnel'); assert.equal(s.banner.title, 'She has landed');
  assert.ok(d.tunnel.need > 600, `a long way to dig (${d.tunnel.need})`);
  const st0 = s.colony.store; step(s, 20); assert.ok(d.tunnel.progress > 0 && s.colony.store < st0 + 40, 'digging eats food');
  d.tunnel.progress = d.tunnel.need - 1; step(s, 2);
  assert.equal(d.state, 'ready'); assert.match(s.banner.title, /War Camp is joined/);
  const main0 = SIM.antCount(s);
  for (let i = 0; i < 4; i++) { rich(s.colony); step(s, 31); }
  assert.ok(SIM.daughterCount(s, d) >= 3, `she lays (${SIM.daughterCount(s, d)})`);
  assert.ok(SIM.antCount(s) <= main0 + 4, "her ants don't count against the main queen's cap");
});

test('far away she is numbers; walk near and her ants come out, forage and patrol round her door; walk away and they fold back', () => {
  const s = founded(); beat(s, 3); s.colony.evo.royal = true; rich(s.colony);
  const oi = farOutpost(s); SIM.foundDaughter(s, oi, 'war'); const d = s.daughters[0];
  step(s, 11); d.tunnel.progress = d.tunnel.need; step(s, 1);
  d.pop = { forager: 6, soldier: 6 };
  step(s, 1); assert.equal(d.real, false);
  const me = s.player.ant; s.player.inNest = false; me.state = 'player'; me.x = (d.ex + 5) * T; me.y = d.ey * T; me.tx = d.ex + 5; me.ty = d.ey; s.player.tx = me.x; s.player.ty = me.y;
  step(s, 1); assert.equal(d.real, true); const mine = s.ants.filter((a) => a.dh === 'war'); assert.ok(mine.length >= 12);
  assert.ok(mine.filter((a) => a.caste === 'soldier').every((a) => a.xp > 0), 'War Camp soldiers hatch Seasoned');
  step(s, 60);
  const out = s.ants.filter((a) => a.dh === 'war' && a.state !== 'in');
  assert.ok(out.length >= 3, `some are out (${out.length})`);
  assert.ok(out.every((a) => Math.hypot(a.tx - d.ex, a.ty - d.ey) < 70), 'they keep round her door, not the main nest');
  me.x = (s.world.ex + 1) * T; me.y = s.world.ey * T; me.tx = s.world.ex + 1; me.ty = s.world.ey; step(s, 1);
  assert.equal(d.real, false); assert.ok(SIM.dpop(d) >= 12);
});

test('daughters are saved, and an older save gains none', () => {
  const s = founded(); beat(s, 3); s.colony.evo.royal = true; rich(s.colony);
  const oi = farOutpost(s); SIM.foundDaughter(s, oi, 'war'); step(s, 12);
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(s2.daughters.length, 1); assert.equal(s2.daughters[0].state, 'tunnel');
  const old = JSON.parse(SIM.serialize(founded())); old.v = 13; delete old.daughters;
  assert.deepEqual(SIM.deserialize(JSON.stringify(old)).daughters, []);
});
