// Build 82 (docs/FAR-YARD.md): your crew reads a guardian's tells, fights the antlion from her rim and cuts the
// widow's anchors first.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { mkAnt } from '../src/sim/world.js';
import { BOSS_TUNE, bossAim, dodgeChance } from '../src/sim/bosses.js';

let seed = 82; const rnd0 = Math.random; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
test.after(() => { Math.random = rnd0; });

const T = SIM.T;
function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.critters = []; s.bugT = -1e9; s.director.next = 1e9;
  return s;
}
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each) each(); } };
function wake(s, key) { s.active[SIM.REGION[SIM.BOSSES[key].region]] = true; return SIM.ensureBoss(s, key); }
// You, out by the guardian, with a crew of n soldiers.
function withCrew(s, b, n) {
  const P = s.player, me = P.ant; P.inNest = false; me.state = 'player';
  me.x = b.x + 10 * T; me.y = b.y; me.tx = Math.floor(me.x / T); me.ty = Math.floor(me.y / T); P.tx = null;
  const crew = []; for (let i = 0; i < n; i++) { const a = mkAnt(s, 'soldier', 'follow', me.tx, me.ty, 0); a.follow = true; a.x = me.x + (i % 4) * 4; a.y = me.y + Math.floor(i / 4) * 4; s.ants.push(a); crew.push(a); }
  return crew;
}

test('the more seasoned an ant, the likelier it jumps clear of a tell', () => {
  assert.equal(dodgeChance({ xp: 0 }), 0.5);
  assert.ok(dodgeChance({ legend: true }) >= 0.9);
});

test('crew inside a shown ring jump clear before it lands', () => {
  const s = founded(), b = wake(s, 'hornworm'), crew = withCrew(s, b, 12);
  for (const a of crew) { a.x = b.x + 1.5 * T; a.y = b.y + (Math.random() - 0.5) * T; a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); a.state = 'fight'; a.goal = 'boss'; }
  b.mode = 'fight'; b.atk = { kind: 'ring', x: b.x, y: b.y, r: 3.6 * T, t: 0, at: 1.2 }; b.cd = 9;
  step(s, 0.05);
  const jumping = crew.filter((a) => a.dodge).length;
  assert.ok(jumping >= 3 && jumping < 12, `some jump, not all (${jumping} of 12)`);
  step(s, 1.0);
  const out = crew.filter((a) => a.dodge || Math.hypot(a.x - b.x, a.y - b.y) > 3.6 * T).length;
  assert.ok(out >= jumping, 'those that jumped are clear of the ring');
});

test('set on the antlion, the crew rings her pit instead of walking into the sand', () => {
  const s = founded(), b = wake(s, 'antlion'), crew = withCrew(s, b, 12), p = s.world.pits[b.pit];
  assert.ok(SIM.crewAttack(s, b.x, b.y), 'the crew charges');
  const aim = bossAim(s, s.player.attack, crew[0]); assert.ok(aim, 'a spot on the rim');
  assert.ok(Math.abs(Math.hypot(aim.x - p.x * T, aim.y - p.y * T) / T - (p.r * 1.05 + 0.7)) < 0.01);

  let surfaced = false; step(s, 12, () => { s.player.hunger = 100; if (!b.under) surfaced = true; });
  assert.equal(s.colony.deaths.antlion || 0, 0, 'nobody dragged under on the way');
  assert.ok(surfaced || b.dead, 'enough at the edge drew her up');
  const angles = new Set(crew.filter((a) => a.state !== 'dead').map((a) => Math.round(Math.atan2(a.y - p.y * T, a.x - p.x * T) * 4)));
  assert.ok(angles.size >= 4, `spread along the rim (${angles.size} spots)`);
});

test('set on the widow in her web, the crew bites through the anchors first', () => {
  const s = founded(), b = wake(s, 'widow'), crew = withCrew(s, b, 12);
  b.mode = 'fight'; step(s, 0.1);
  assert.ok(b.web && !b.grounded, 'she is up in her web');
  assert.ok(SIM.crewAttack(s, b.x, b.y));
  const aim = bossAim(s, s.player.attack, crew[0]);
  assert.ok(aim && b.web.anchors.some((an) => an.x === aim.x && an.y === aim.y), 'aimed at an anchor');
  // Those that get there bite it (crews still step greedily, so a wall between can hold some up).
  const an = b.web.anchors.find((q) => q.x === aim.x && q.y === aim.y), hp = an.hp;
  for (const a of crew.slice(0, 4)) { a.x = an.x + 0.5 * T; a.y = an.y; a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); }
  step(s, 2, () => { s.player.hunger = 100; });
  assert.ok(an.hp < hp, `the anchor is bitten (${hp} -> ${Math.round(an.hp)})`);
});

test('your fighters bite a guardian at half strength (its hide)', () => {
  const once = (hide) => { const s = founded(), b = wake(s, 'mantis'), [a] = withCrew(s, b, 1); BOSS_TUNE.hide = hide;
    b.mode = 'fight'; b.cd = 99; a.state = 'fight'; a.x = b.x + 1.5 * T; a.y = b.y; a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T);
    const hp = b.hp; SIM.tick(s, 0.05); return hp - b.hp; };
  const was = BOSS_TUNE.hide, full = once(1), now = once(was); BOSS_TUNE.hide = was;
  assert.equal(was, 0.5); assert.ok(full > 0 && Math.abs(now / full - 0.5) < 0.01, `${now.toFixed(3)} vs ${full.toFixed(3)}`);
});
