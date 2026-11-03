// Build 45: the sim got faster without changing what happens. The quick lookups must give exactly the answers
// of the old full scans.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import SIM from '../src/sim/sim.js';

const { nearestItem, itemAt, wanted } = SIM._fast;
const slowItemAt = (s, x, y) => s.items.find((f) => f.x === x && f.y === y && f.amt > 0);

function busy() {
  const s = SIM.create(11), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 120; i++) SIM.tick(s, 0.05);
  for (let i = 0; i < 60; i++) SIM.stress(s, 1);
  for (let i = 0; i < 20 * 30; i++) SIM.tick(s, 0.05);
  return s;
}

test('finding the nearest food: the quick search answers exactly as a full scan of every item', () => {
  const s = busy(); let checked = 0;
  for (const a of s.ants) {
    if (a.team || a.tx == null) continue;
    for (const r of [4, 9, 20, 40, 80]) {
      const want = wanted(s, a), fast = nearestItem(s, a, r, want);
      // The full scan, item by item, with the same rules the sim uses (heavy treats only for crews).
      let best = null, bd = r; for (const f of s.items) { if (f.amt <= 0 || !want[f.kind] || f.carried) continue; const heavy = !!(SIM.FOODS[f.type] && SIM.FOODS[f.type].crew); if (heavy) continue; const d = Math.hypot(f.x - a.tx, f.y - a.ty) / want[f.kind]; if (d < bd) { bd = d; best = f; } }
      assert.equal(fast, best, `ant ${a.id} r ${r}`); checked++;
    }
  }
  assert.ok(checked > 100, `${checked} searches checked`);
});

test('what lies on a tile: the quick lookup matches a full scan, also after items come and go', () => {
  const s = busy();
  for (const f of s.items.slice(0, 200)) assert.equal(itemAt(s, f.x, f.y), slowItemAt(s, f.x, f.y));
  s.items.push({ x: 5, y: 5, kind: 'food', type: 'crumb', amt: 3 });
  assert.equal(itemAt(s, 5, 5), slowItemAt(s, 5, 5));
  s.items = s.items.filter((f) => !(f.x === 5 && f.y === 5));
  assert.equal(itemAt(s, 5, 5), undefined);
});

test('the bedrock glows: the first block dug there says so, once', () => {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 25; i++) SIM.tick(s, 0.05);
  assert.ok(!s.colony.glowSeen);
  assert.ok(SIM.GLOW_ROCKS.length >= 8 && SIM.GLOW_ROCKS.every(([, y]) => y >= SIM.BEDROCK_Y));
  s.queen.level = 2; s.nest.rooms.push({ key: 'workshop', x0: 14, y0: 10, w: 5, h: 3 }); SIM.openSection(s, 'd2');
  for (let y = 48; y <= 59; y++) s.nest.cells[y * SIM.NW + 20] = 1;
  assert.equal(SIM.toggleDigOrder(s, 20, 60), 'added');
  s.nest.digOrders.find((o) => o.y === 60).progress = 1e9;
  SIM.stress(s, 1); const b = s.ants[s.ants.length - 1]; Object.assign(b, { caste: 'builder', state: 'in', rest: 0, goal: null, nx: SIM.SHAFT + 0.5, ny: 0.5, ntx: SIM.SHAFT, nty: 0 });
  for (let i = 0; i < 40; i++) SIM.tick(s, 0.05);
  assert.ok(s.colony.glowSeen, 'seen'); assert.match(s.player.msg + '', /glows/);
});
