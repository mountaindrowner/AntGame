// Build 27: ant against ant is a duel of dice.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

// Build 55: a fixed seed ("a fight on the ground" turned on the dice now and then).
let seed = 777; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const T = SIM.T;
function arena(seed = 7) {
  const s = SIM.create(seed), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s); s.seen.intro = 'done';
  for (let i = 0; i < 20 * 20; i++) SIM.tick(s, 0.05);
  return s;
}
// A fresh ant of a kind and team, made from your ant's shape.
const ant = (s, caste, team = 0, extra = {}) => { const a = { ...s.player.ant, isPlayer: false, name: null, id: s.nextId++, team, caste, follow: false, xp: 0, hp: 50, maxHp: 50, state: 'patrol', foeId: 0, lockT: 0, slowT: 0, burnT: 0, ...extra }; s.ants.push(a); return a; };
// Fix the dice: each call to Math.random gives the next face from the list.
function dice(faces, fn) { const real = Math.random; let i = 0; Math.random = () => (faces[i++ % faces.length] - 1) / 6 + 0.01; try { return fn(); } finally { Math.random = real; } }

test('Attack and Defence by kind, rank and upgrades', () => {
  const s = arena();
  assert.deepEqual(SIM.duelStats(s, ant(s, 'forager')), [0, 0]);
  assert.deepEqual(SIM.duelStats(s, ant(s, 'soldier')), [2, 2]);
  assert.deepEqual(SIM.duelStats(s, ant(s, 'major')), [3, 4]);
  assert.deepEqual(SIM.duelStats(s, ant(s, 'soldier', 0, { xp: 60 })), [3, 3], 'a Veteran soldier');
  assert.deepEqual(SIM.duelStats(s, ant(s, 'forager', 2)), [-1, -1], 'an odorous worker');
  assert.deepEqual(SIM.duelStats(s, ant(s, 'soldier', 4)), [3, 4], 'a carpenter soldier');
});

test('beat the roll to hit; by 3 for a hard hit; a 6 that hits is a crit; a tie locks both', () => {
  const s = arena(); SIM.duelGangs(s);
  const a = ant(s, 'soldier'), o = ant(s, 'forager', 1);
  // Attacker rolls 3 (+2) = 5 against 2 (+0) = 2: hard hit by 3.
  assert.equal(dice([3, 2], () => SIM.swing(s, a, o)), 'hard');
  assert.equal(dice([2, 3], () => SIM.swing(s, a, o)), 'hit', '4 vs 3');
  assert.equal(dice([6, 5], () => SIM.swing(s, a, o)), 'crit');
  assert.ok(o.slowT > 0, 'a crit lames');
  assert.equal(dice([1, 3], () => SIM.swing(s, a, o)), 'lock', '3 vs 3');
  assert.ok(a.lockT > 0 && o.lockT > 0, 'both held a round');
  assert.equal(dice([1, 6], () => SIM.swing(s, a, o)), 'miss');
});

test('a soldier usually beats a forager, but not always', () => {
  const s = arena(); SIM.duelGangs(s);
  const a = ant(s, 'soldier'), o = ant(s, 'forager', 1, { hp: 1e9 });
  const f = ant(s, 'forager'), so = ant(s, 'soldier', 1, { hp: 1e9 });
  let up = 0, down = 0;
  // xp reset each swing: fighting ranks them up, which would shift the odds mid-test.
  for (let i = 0; i < 2000; i++) { a.xp = f.xp = 0; if (/hit|hard|crit/.test(SIM.swing(s, a, o))) up++; if (/hit|hard|crit/.test(SIM.swing(s, f, so))) down++; }
  assert.ok(up > 1200, `soldier lands ${up} of 2000`);
  assert.ok(down > 150 && down < 700, `forager lands ${down} of 2000 on a soldier`);
});

test('ganging up: more ants on one foe hit more, and three pin it', () => {
  const s = arena();
  const o = ant(s, 'soldier', 1, { hp: 1e9 });
  const crew = [0, 1, 2, 3].map(() => ant(s, 'forager', 0, { foeId: o.id }));
  SIM.duelGangs(s);
  let alone = 0, gang = 0;
  const lone = ant(s, 'forager'), o2 = ant(s, 'soldier', 1, { hp: 1e9 }); // nobody else on o2
  for (let i = 0; i < 2000; i++) { lone.xp = crew[0].xp = 0; if (/hit|hard|crit/.test(SIM.swing(s, lone, o2))) alone++; if (/hit|hard|crit/.test(SIM.swing(s, crew[0], o))) gang++; }
  assert.ok(gang > alone * 2, `with help ${gang}, alone ${alone}`);
  // Pinned, every hit counts as hard.
  assert.equal(dice([4, 4], () => SIM.swing(s, crew[0], o)), 'hard', '4+0+3 vs 4+2 hits; pinned makes it hard');
});

test('venom ants crit on a 5; fire ants burn', () => {
  const s = arena(); SIM.duelGangs(s);
  const v = ant(s, 'venom'), o = ant(s, 'forager', 1);
  assert.equal(dice([5, 1], () => SIM.swing(s, v, o)), 'crit');
  const f = ant(s, 'soldier', 5), me = ant(s, 'forager');
  dice([4, 1], () => SIM.swing(s, f, me));
  assert.ok(me.burnT > 0, 'burning');
});

test('a fight on the ground: soldiers beat foragers, kills and crits are counted', () => {
  const s = arena(), P = s.player, me = P.ant;
  s.spider = null; s.spiderRespawn = 1e9; s.director.next = 1e9;
  const gx = Math.floor(me.x / T), gy = Math.floor(me.y / T);
  const mine = [0, 1, 2, 3, 4].map((i) => ant(s, 'soldier', 0, { hp: 6, x: me.x + i * 4, y: me.y + T, tx: gx, ty: gy + 1, state: 'patrol' }));
  const theirs = [0, 1, 2, 3, 4].map((i) => ant(s, 'forager', 1, { hp: 2, x: me.x + i * 4, y: me.y + 2 * T, tx: gx, ty: gy + 2, state: 'explore' }));
  for (let i = 0; i < 20 * 24; i++) SIM.tick(s, 0.05); // (build 71: 24 s, was 15, with the slower duel rounds: 1.1 s, was 0.7)
  const dead = theirs.filter((a) => a.state === 'dead' || !s.ants.includes(a)).length;
  assert.ok(dead >= 3, `${dead} of 5 rival foragers killed`);
  assert.ok((s.colony.duelsWon || 0) >= 3);
  assert.ok(mine.filter((a) => a.state !== 'dead').length >= 4, 'soldiers mostly live');
});
