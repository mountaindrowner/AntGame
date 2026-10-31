// Build 16: living creatures. Small bugs with their own habits, a spider that
// eats and gets full, sparks where bites land, and rain that knocks ants about.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const { T, REGION, areaBounds } = SIM;
function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.cat = null; s.catRespawn = 1e9; s.bugT = -1e9; s.critters = []; s.strikes = []; s.strikeT = s.strikeT.map(() => 1e9);
  return s;
}
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each() === false) return; } };
// An open patch of ground in a region: every tile within r walkable.
function open(s, key, r = 6) {
  const b = areaBounds(REGION[key]), w = s.world;
  for (let y = b.y0 + 10; y < b.y1 - 10; y += 2) for (let x = b.x0 + 10; x < b.x1 - 10; x += 2) {
    let ok = true;
    for (let dy = -r; dy <= r && ok; dy++) for (let dx = -r; dx <= r && ok; dx++) if (w.blocked[(y + dy) * SIM.W + x + dx] || w.pit[(y + dy) * SIM.W + x + dx]) ok = false;
    if (ok && Math.hypot(x - w.ex, y - w.ey) > 20) return [x, y];
  }
  throw new Error('no open ground in ' + key);
}
const px = (t) => (t + 0.5) * T;
function bug(s, kind, x, y) {
  const B = SIM.BUGS[kind], b = { id: s.nextId++, kind, x: px(x), y: px(y), dx: 1, dy: 0, hp: B.hp, maxHp: B.hp, state: 'walk', t: 0, life: 0, far: 0 };
  s.critters.push(b); return b;
}
function you(s, x, y) {
  const a = s.player.ant; s.player.inNest = false; a.state = 'player'; a.x = px(x); a.y = px(y); a.tx = x; a.ty = y; s.player.tx = null; s.player.hunger = 100;
  return a;
}
function forager(s, x, y) {
  SIM.stress(s, 1); const a = s.ants[s.ants.length - 1];
  Object.assign(a, { state: 'explore', x: px(x), y: px(y), tx: x, ty: y, carry: 0, flee: 0, explore: 0, hp: 2 });
  return a;
}

test('a cricket hops away, tires after five hops, and a caught one is rich meat', () => {
  const s = founded(), [x, y] = open(s, 'lawn');
  const b = bug(s, 'cricket', x, y), a = you(s, x - 3, y);
  let hops = 0, wasHop = false;
  // Chase it: walk at it every tick.
  step(s, 30, () => { s.player.tx = b.x; s.player.ty = b.y; if (b.state === 'hop' && !wasHop) hops++; wasHop = b.state === 'hop'; s.player.hunger = 100; a.hp = 99; if (b.state === 'tired' || b.gone) return false; });
  assert.ok(hops >= 4, `it hopped ${hops} times`);
  assert.equal(b.state, 'tired');
  step(s, 6, () => { a.x = b.x - 8; a.y = b.y; s.player.tx = null; a.hp = 99; if (!s.critters.includes(b)) return false; });
  assert.ok(!s.critters.includes(b), 'caught');
  const meat = s.items.find((f) => f.type === 'cricket');
  assert.ok(meat && meat.amt === 25 && meat.kind === 'protein');
  assert.equal(s.colony.kills.cricket, 1);
});

test('a bitten millipede curls into an armoured ball', () => {
  const s = founded(), [x, y] = open(s, 'compost');
  const b = bug(s, 'millipede', x, y); you(s, x, y);
  step(s, 0.5);
  assert.equal(b.state, 'curl');
  const hp0 = b.hp; step(s, 2, () => { s.player.ant.x = b.x; s.player.ant.y = b.y; });
  const curled = hp0 - b.hp;
  assert.ok(curled > 0 && curled < 2 * 2 * 0.5, `took ${curled.toFixed(2)} in 2 s curled`);
  assert.ok(b.x === px(x) && b.y === px(y), 'curled, it does not move');
});

test('a ladybug eats your aphids, and flies off when bitten to half', () => {
  const s = founded(), f = s.items.find((o) => o.type === 'aphids');
  f.amt = 20; f.max = 20;
  const b = bug(s, 'ladybug', f.x, f.y);
  // Keep a forager about so it doesn't wander off for lack of company.
  const keep = forager(s, f.x + 8, f.y);
  step(s, 6, () => { keep.state = 'explore'; keep.x = px(f.x + 8); keep.y = px(f.y); keep.flee = 0; });
  assert.equal(b.state, 'eat');
  assert.ok(f.amt < 20 - 3, `aphids down to ${f.amt.toFixed(1)}`);
  you(s, f.x, f.y); s.player.ant.x = b.x; s.player.ant.y = b.y;
  step(s, 6, () => { if (b.state === 'fly') return false; });
  assert.equal(b.state, 'fly');
  assert.equal(s.colony.kills.ladybugOff, 1);
  step(s, 2);
  assert.ok(!s.critters.includes(b), 'gone');
});

test('an earwig pinches foragers, and foragers keep clear of it', () => {
  const s = founded(), [x, y] = open(s, 'compost');
  const b = bug(s, 'earwig', x, y), a = forager(s, x + 2, y);
  step(s, 0.2);
  assert.ok(a.flee > 0 && a.fleeFrom === b, 'the forager runs');
  const v = forager(s, x, y); v.flee = 0;
  b.pinchT = 0;
  const d0 = s.colony.deaths.earwig || 0;
  step(s, 0.2);
  assert.ok((s.colony.deaths.earwig || 0) > d0 || v.hp < 2, 'pinched');
  assert.ok(s.hits.some((h) => h.k === 1), 'a red spark where it pinched');
});

test('the spider stops to eat after a kill, and three meals send it to sleep', () => {
  const s = founded(), [x, y] = open(s, 'lawn');
  s.t = Math.max(s.t, 300);
  s.spider = { x: px(x), y: px(y), hp: 150, maxHp: 150, bite: 1.99, route: [], legs: 1 };
  const v = forager(s, x, y); v.flee = 0;
  step(s, 0.1);
  assert.equal(v.state, 'dead');
  const sp = s.spider; assert.equal(sp.meals, 1); assert.ok(sp.eatT > 0);
  const at = [sp.x, sp.y]; step(s, 2);
  assert.deepEqual([sp.x, sp.y], at, 'it stays put to eat');
  assert.equal(sp.mode, 'eat');
  sp.meals = 2; sp.eatT = 0; sp.bite = 1.99;
  const v2 = forager(s, Math.floor(sp.x / T), Math.floor(sp.y / T)); v2.x = sp.x; v2.y = sp.y;
  step(s, 0.1);
  assert.ok(sp.full > 0, 'full');
  // Full, it walks straight past ants.
  sp.eatT = 0; sp.bite = 1.99;
  const v3 = forager(s, Math.floor(sp.x / T) + 2, Math.floor(sp.y / T)); v3.flee = 0;
  let hunted = false; step(s, 3, () => { if (sp.mode === 'lunge' || sp.mode === 'chase') hunted = true; });
  assert.ok(!hunted);
});

test('the spider crouches before it lunges', () => {
  const s = founded(), [x, y] = open(s, 'lawn');
  s.t = Math.max(s.t, 300);
  s.spider = { x: px(x), y: px(y), hp: 150, maxHp: 150, bite: 0, route: [], legs: 1 };
  const v = forager(s, x + 3, y); v.flee = 0; v.state = 'patrol';
  const modes = []; step(s, 1, () => { if (modes[modes.length - 1] !== s.spider.mode) modes.push(s.spider.mode); });
  assert.deepEqual(modes.slice(0, 2), ['crouch', 'lunge']);
});

test('spider and bug deaths leave a body for the renderer', () => {
  const s = founded(), [x, y] = open(s, 'lawn');
  s.spider = { x: px(x), y: px(y), hp: 0, maxHp: 150, bite: 0, route: [], legs: 1, cost0: 0 };
  step(s, 0.1);
  assert.ok(s.spiderCorpse && !s.spider);
  step(s, 7);
  assert.equal(s.spiderCorpse, null, 'the body goes after a few seconds');
});

test('rain knocks ants about, and some drop what they carry', () => {
  const s = founded(), [x, y] = open(s, 'lawn');
  s.rain.on = true; s.rain.t = 0;
  SIM.stress(s, 6); const ants = s.ants.slice(-6);
  let knocked = 0, dropped = 0;
  for (let k = 0; k < 1600; k++) {
    for (const a of ants) Object.assign(a, { state: 'explore', x: px(x), y: px(y), tx: x, ty: y, carry: 5, kind: 'food', itype: 'seed', explore: 0, flee: 0 });
    s.items = s.items.filter((f) => !(f.x === x && f.y === y));
    SIM.tick(s, 0.05); s.rain.t = 0;
    for (const a of ants) { if (a.knockT > 0) knocked++; if (a.carry === 0) dropped++; }
  }
  assert.ok(knocked > 3, `${knocked} knocks`);
  assert.ok(dropped > 0, 'a load or two dropped');
  assert.ok(s.splashes.length > 0 || knocked > 0);
});

test('bites leave sparks and a flash on what they hit', () => {
  const s = founded(), [x, y] = open(s, 'compost');
  const b = bug(s, 'millipede', x, y); you(s, x, y);
  step(s, 0.2);
  assert.ok(s.hits.length > 0 && s.hits.every((h) => s.t - h.t < 0.6));
  assert.ok(s.t - b.hitT < 0.1);
});

test('bugs are spread across the yard from the start, each region its own', () => {
  const s = SIM.create(7), w = s.world;
  const bugs = s.critters;
  assert.ok(bugs.length >= 8, `${bugs.length} bugs in the yard`);
  const regions = new Set(bugs.map((b) => b.region));
  assert.ok(regions.size >= 5, `in ${regions.size} regions`);
  for (const b of bugs) assert.ok(Math.hypot(b.x / T - w.ex, b.y / T - w.ey) >= 14, 'none on the doorstep');
  for (const a of bugs) for (const b of bugs) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 12 * T, 'never bunched');
  for (const b of bugs) assert.equal(SIM.areaOf(s, Math.floor(b.x / T), Math.floor(b.y / T)), b.region, 'it lives in its own region');
  // A dormant region gets its bugs when you first walk in.
  const di = SIM.AREAS.findIndex((A, i) => !s.active[i] && /long|grass|soil|bark|leaf|hedge/.test(A.ground));
  assert.ok(!bugs.some((b) => b.region === di));
  const q = s.queen; SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  const b0 = areaBounds(di), [x, y] = [Math.floor((b0.x0 + b0.x1) / 2), Math.floor((b0.y0 + b0.y1) / 2)];
  const a = you(s, x, y); step(s, 0.5, () => { a.x = px(x); a.y = px(y); });
  assert.ok(s.critters.some((b) => b.region === di), 'woken region populated');
});

test('bugs keep to their patch, wait while nobody is near, and a lost one is replaced out of sight', () => {
  const s = founded(), [x, y] = open(s, 'lawn');
  const b = bug(s, 'cricket', x, y); b.region = SIM.areaOf(s, x, y); b.hx = x; b.hy = y;
  // Nobody out: it doesn't move or age.
  s.player.inNest = true; s.player.ant.state = 'nest'; for (const o of s.ants) if (!o.team && !o.isPlayer) o.state = 'in';
  const t0 = b.t; step(s, 5); assert.equal(b.t, t0, 'asleep');
  // Killed: a new one turns up in the same region a couple of minutes later, not beside you.
  const a = you(s, x, y); b.hp = 0;
  step(s, 0.1);
  assert.ok(!s.critters.includes(b) && s.bugGone[b.region + ':cricket'] != null);
  s.bugT = 0;
  step(s, 200, () => { a.x = px(x); a.y = px(y); a.hp = 99; s.player.hunger = 100; s.player.tx = null; if (s.critters.some((o) => o.region === b.region && o.kind === 'cricket')) return false; });
  const n = s.critters.find((o) => o.region === b.region && o.kind === 'cricket');
  assert.ok(n, 'replaced');
  assert.ok(Math.hypot(n.x - a.x, n.y - a.y) >= 18 * T, 'out of sight');
  // Saved and loaded, the yard's bugs are still there.
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(s2.critters.length, s.critters.length);
});
