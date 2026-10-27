// The spider roams the yard from its web in the Flowerbed: it passes the nest
// and keeps its distance. Food spawns in several kinds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

// The sim's creatures use Math.random; seed it so the test is repeatable.
function seeded(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('spider lives at its web, passes the nest, and keeps 6 tiles off it', (t) => {
  const real = Math.random;
  Math.random = seeded(12);
  t.after(() => { Math.random = real; });
  const s = SIM.create(7), w = s.world, T = SIM.T;
  let minD = Infinity, passes = 0, near = false, atWeb = 0;
  for (let i = 0; i < 20 * 900; i++) {
    SIM.tick(s, 0.05);
    s.player.msg = '';
    const sp = s.spider;
    if (sp) {
      const d = Math.hypot(sp.x / T - w.ex - 0.5, sp.y / T - w.ey - 0.5);
      minD = Math.min(minD, d);
      if (d < 9 && !near) { passes++; near = true; }
      if (d > 11) near = false;
      if (Math.hypot(sp.x / T - w.web.x, sp.y / T - w.web.y) < 6 * SIM.SCALE) atWeb++;
    }
  }
  assert.ok(minD >= 5.9, 'spider came within ' + minD.toFixed(2) + ' tiles of the nest');
  assert.ok(passes >= 1, 'spider passed the nest ' + passes + ' times in 15 minutes');
  assert.ok(atWeb > 20 * 60, 'spider spent ' + (atWeb / 20).toFixed(0) + ' s at its web');
});

test('food spawns in several kinds, and an away spider survives a save', () => {
  const s = SIM.create(3);
  for (let i = 0; i < 20 * 300; i++) SIM.tick(s, 0.05);
  const kinds = new Set(s.items.filter((f) => f.kind === 'food').map((f) => f.type));
  assert.ok(kinds.size >= 3, 'food kinds: ' + [...kinds].join(', '));
  for (const k of kinds) assert.ok(SIM.FOODS[k], 'unknown food ' + k);
  s.spiderAway = { hp: 90, t: 5 }; s.spider = null;
  const r = SIM.deserialize(SIM.serialize(s));
  assert.deepEqual(r.spiderAway, { hp: 90, t: 5 });
});
