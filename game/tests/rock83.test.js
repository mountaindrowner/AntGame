// Build 83 (Mark: "the rock above nest is still passable"): solid where it's drawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { bigRockParts } from '../src/sim/yard.js';

test('the big rock is solid where its slabs are drawn, and only there', () => {
  const s = SIM.create(7), w = s.world, l = w.landmarks.find((q) => q.kind === 'bigrock');
  const solid = (x, y) => !!w.blocked[Math.floor(y) * SIM.W + Math.floor(x)];
  for (const e of bigRockParts(l)) { assert.ok(solid(e.cx, e.cy), 'its middle'); assert.ok(solid(e.cx + e.rx * 0.8, e.cy), 'near its edge'); }
  assert.ok(!solid(l.x0 + l.w - 0.5, l.y0 + 0.5), 'the empty corner of its old square is open');
  const [e0] = bigRockParts(l); assert.ok(solid(e0.cx, e0.cy + e0.rz * 0.9), 'the overhang the old square left walkable');
  assert.ok(!solid(w.ex + 0.5, w.ey + 0.5) && !solid(w.ex + 0.5, w.ey - 1.5), 'the nest door and the ground above it are clear');
});
