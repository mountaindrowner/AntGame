// The spider roams: it passes the nest, keeps its distance, and leaves and
// re-enters through the edges. Food spawns in several kinds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

test('spider passes the nest, keeps 4.5 tiles off it, and leaves and returns', () => {
  const s = SIM.create(7), w = s.world, T = SIM.T;
  let minD = Infinity, passes = 0, near = false, left = 0, back = 0, away = false;
  for (let i = 0; i < 20 * 900; i++) {
    SIM.tick(s, 0.05);
    s.player.msg = '';
    const sp = s.spider;
    if (sp) {
      const d = Math.hypot(sp.x / T - w.ex - 0.5, sp.y / T - w.ey - 0.5);
      minD = Math.min(minD, d);
      if (d < 7 && !near) { passes++; near = true; }
      if (d > 9) near = false;
    }
    if (s.spiderAway && !away) left++;
    if (!s.spiderAway && away) back++;
    away = !!s.spiderAway;
  }
  assert.ok(minD >= 4.49, 'spider came within ' + minD.toFixed(2) + ' tiles of the nest');
  assert.ok(passes >= 1, 'spider passed the nest ' + passes + ' times in 15 minutes');
  assert.ok(left >= 1 && back >= 1, `spider left ${left} and came back ${back} times`);
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
