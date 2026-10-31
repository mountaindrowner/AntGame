// Build 18: 🍯 sugar and 🪲 chitin, where they come from and what they buy.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.critters = []; s.bugT = -1e9;
  return s;
}
// A forager arriving home with a load.
function bring(s, kind, itype, carry = 5) {
  SIM.stress(s, 1); const a = s.ants[s.ants.length - 1], w = s.world;
  Object.assign(a, { state: 'return', carry, kind, itype, tx: w.ex, ty: w.ey, x: (w.ex + 0.5) * SIM.T, y: (w.ey + 0.5) * SIM.T });
  for (let i = 0; i < 4; i++) SIM.tick(s, 0.05);
}

test('honeydew brings sugar, three times as much with Aphid farming', () => {
  const s = founded(), c = s.colony;
  c.store = 0; bring(s, 'food', 'aphids');
  assert.equal(c.sugar, 1);
  c.evo.aphids = true; bring(s, 'food', 'aphids');
  assert.equal(c.sugar, 4);
  assert.ok(s.events.includes('sugar') || c.found.sugar);
});

test('dead bugs and beetle shells bring chitin', () => {
  const s = founded(), c = s.colony;
  bring(s, 'protein', 'bug'); assert.equal(c.chitin, 1);
  bring(s, 'protein', 'earwig'); assert.equal(c.chitin, 3);
  bring(s, 'chitin', 'shell', 5); assert.equal(c.chitin, 8);
});

test('beetle shells turn up on bark, compost and gravel', () => {
  const s = founded();
  for (let i = 0; i < 20 * 400 && !s.items.some((f) => f.kind === 'chitin'); i++) SIM.tick(s, 0.05);
  const f = s.items.find((f) => f.kind === 'chitin');
  assert.ok(f, 'a shell appeared');
  assert.match(SIM.AREAS[SIM.areaOf(s, f.x, f.y)].ground, /bark|compost|gravel|hedge|leaf|mulch/);
});

test('a sweet treat hauled home pays sugar as well as food', () => {
  const s = founded(), c = s.colony; c.store = 0; c.cap = 150;
  const a = s.player.ant; s.player.inNest = false; a.state = 'player';
  s.player.big = { type: 'gummy', amt: 50, kind: 'food', carried: true, x: 0, y: 0 };
  a.x = (s.world.ex + 0.5) * SIM.T; a.y = (s.world.ey + 0.5) * SIM.T;
  // A crew of eight round you.
  SIM.stress(s, 8); for (const o of s.ants.slice(-8)) Object.assign(o, { follow: true, state: 'follow', x: a.x + 3, y: a.y, tx: s.world.ex, ty: s.world.ey });
  SIM.tick(s, 0.05);
  assert.equal(c.sugar, 15);
  assert.match(s.player.msg, /\+15 🍯/);
});

test('sugar and chitin now pay for upgrades, the queen and evolutions', () => {
  const s = founded(), c = s.colony;
  Object.assign(c, { store: 2000, cap: 2000, protein: 500, grit: 500, water: 50, genes: 50, sugar: 200, chitin: 200 });
  c.forage = 3; assert.ok(SIM.upgradeCaste(s, 'forager'), 'forager IV: sugar and chitin');
  assert.equal(c.forage, 4);
  SIM.stress(s, 1); const f = s.ants[s.ants.length - 1];
  c.evo.trailrunners = true; assert.ok(SIM.buyEvo(s, 'bigcrop'));
  assert.ok(SIM.buyEvo(s, 'cuticle'));
  assert.ok(SIM.maxHp(s, f) >= 3, 'tough cuticle: half again the health');
  s.queen.level = 4; assert.ok(SIM.upgradeQueen(s), 'queen V for sugar');
  assert.equal(SIM.queenCap(s.queen.level), 120);
  // Wood is still to come.
  s.queen.level = 7; assert.equal(SIM.upgradeQueen(s), false);
});

test('a held Woodpile doubles the chitin from its dead bugs', () => {
  const s = founded(), c = s.colony, wp = SIM.REGION.woodpile;
  c.held[wp] = true;
  SIM.stress(s, 1); const a = s.ants[s.ants.length - 1], w = s.world;
  Object.assign(a, { state: 'return', carry: 5, kind: 'protein', itype: 'bug', ireg: wp, tx: w.ex, ty: w.ey, x: (w.ex + 0.5) * SIM.T, y: (w.ey + 0.5) * SIM.T });
  for (let i = 0; i < 4; i++) SIM.tick(s, 0.05);
  assert.equal(c.chitin, 2);
});
