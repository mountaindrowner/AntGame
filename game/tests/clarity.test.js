// Build 15: the game says what just happened: raid reports, rooms finished,
// the queen idle, what the spider cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  return s;
}
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each) each(); } };

test('a raid ends with a report of what it cost', () => {
  const s = founded(), c = s.colony;
  s.raidLive = true; s.raidStart = { lost: 0, killed: 0, stolen: 0 };
  c.deaths.war = 3; s.rival.deaths.war = 5; c.stolen = 4;
  for (const a of s.ants) if (a.team && a.state === 'raid') a.state = 'in';
  s.rival.raidT = 9.99; s.player.msg = '';
  step(s, 0.2);
  assert.ok(!s.raidLive);
  assert.equal(s.report.kind, 'raid');
  assert.deepEqual([s.report.lost, s.report.killed, s.report.took], [3, 5, 4]);
  assert.match(s.player.msg, /Raid over\. You lost 3 ants, killed 5 raiders, and they carried off 4 food/);
});

test('a finished room says so', () => {
  const s = founded(), c = s.colony;
  c.buildQueue.push({ room: 'hatchery', x0: 2, y0: 5, w: 4, h: 3, progress: 1e9, x: 3, y: 6 });
  s.player.msg = '';
  step(s, 0.1);
  assert.match(s.player.msg, /Hatchery finished/);
  assert.ok(s.events.includes('roomdone') || s.nest.rooms.some((r) => r.key === 'hatchery'));
});

test('an idle queen with food to spare gets a nudge', () => {
  const s = founded(), c = s.colony;
  c.eggQueue.length = 0; c.eggs.length = 0;
  let nudged = false;
  step(s, 40, () => { c.store = 15; c.water = 5; c.eggQueue.length = 0; c.eggs.length = 0; if (/queen is idle/.test(s.player.msg)) nudged = true; });
  assert.ok(nudged);
});

test('killing the spider says what it cost', () => {
  const s = founded(), c = s.colony, sp = s.spider;
  c.deaths.spider = 7; sp.cost0 = 2; sp.hp = 0;
  step(s, 0.1);
  assert.match(s.player.msg, /It cost you 5 ants/);
});
