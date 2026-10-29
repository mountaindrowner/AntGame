// Growth (build 12): Genes, ant upgrades, the evolution tree, ranks and rebirth.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';
import { rankOf, RANKS } from '../src/sim/growth.js';

function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  return s;
}
const step = (s, sec) => { for (let i = 0; i < sec * 20; i++) SIM.tick(s, 0.05); };
const rich = (s) => Object.assign(s.colony, { store: 200, cap: 400, water: 50, waterCap: 60, protein: 200, grit: 200, genes: 30 });

test('genes come from playing: ten eggs hatched, and the first of each find', () => {
  const s = founded(), c = s.colony;
  step(s, 30);
  const before = c.genes;
  for (let i = 0; i < 10; i++) { c.store = 20; c.water = 10; c.hatched = 9; }
  c.hatched = 9; c.eggQueue.push('forager'); c.store = 20; c.water = 10;
  step(s, 40);
  assert.ok(c.hatched >= 10 && c.genes > before, 'the tenth egg pays a Gene');
  // A forager bringing home a crumb, the colony's first, pays one more.
  const a = s.ants.find((o) => !o.team && !o.isPlayer) || SIM.stress(s, 1) || s.ants.at(-1);
  const g = c.genes; a.carry = 5; a.kind = 'food'; a.itype = 'berry';
  a.state = 'return'; a.tx = s.world.ex; a.ty = s.world.ey; a.x = (a.tx + 0.5) * SIM.T; a.y = (a.ty + 0.5) * SIM.T;
  step(s, 0.2);
  assert.equal(c.found.berry, true);
  assert.equal(c.genes, g + 1);
});

test('evolution nodes need their parent, their room and the Genes', () => {
  const s = founded(), c = s.colony; rich(s);
  assert.equal(SIM.evoLock(s, 'formic'), 'needs Strong mandibles first');
  assert.match(SIM.evoLock(s, 'hatchery2'), /Hatchery/);
  assert.equal(SIM.evoLock(s, 'crews2'), 'needs Bigger crews first');
  assert.equal(SIM.evoLock(s, 'bigcrop'), 'coming in a later build', 'needs sugar: shown, not sold');
  const g = c.genes;
  assert.ok(SIM.buyEvo(s, 'mandibles'));
  assert.equal(c.genes, g - 2);
  assert.ok(SIM.has(s, 'mandibles'));
  assert.equal(SIM.buyEvo(s, 'mandibles'), false, 'owned');
  c.genes = 0;
  assert.equal(SIM.buyEvo(s, 'scent'), false, 'no Genes, no node');
});

test('Store II and III raise the food cap once there is a Food store', () => {
  const s = founded(), c = s.colony; rich(s);
  s.nest.rooms.push({ x0: 1, y0: 5, w: 5, h: 3, key: 'store' });
  c.cap = SIM.storeCap(s);
  assert.equal(c.cap, 150);
  c.store = 140;
  assert.ok(SIM.buyEvo(s, 'store2')); assert.equal(c.cap, 400);
  c.store = 390;
  assert.ok(SIM.buyEvo(s, 'store3')); assert.equal(c.cap, 1000);
});

test('ant upgrades: levels in order, a pick for levels with picks, later materials locked', () => {
  const s = founded(), c = s.colony; rich(s);
  assert.ok(SIM.upgradeForage(s)); assert.equal(c.forage, 1);
  assert.equal(SIM.upgradeCaste(s, 'forager', 'nonsense'), false, 'level 2 needs a real pick');
  assert.ok(SIM.upgradeCaste(s, 'forager', 'sprinter'));
  assert.ok(SIM.picked(s, 'forager', 'sprinter'));
  assert.ok(SIM.upgradeCaste(s, 'forager', 'hauler'));
  assert.equal(c.forage, 3);
  assert.equal(SIM.upgradeCaste(s, 'forager'), false, 'level 4 needs sugar and chitin');
  assert.equal(SIM.upgradeCaste(s, 'soldier'), false, 'soldiers need a Barracks first');
  assert.ok(SIM.upgradeCaste(s, 'builder'));
  assert.equal(SIM.casteLevel(s, 'builder'), 1);
});

test('ranks climb with experience; Elites get names; a named ant can be your next body', () => {
  const s = founded(); step(s, 30);
  const a = s.ants.find((o) => !o.team && !o.isPlayer) || (SIM.stress(s, 1), s.ants.at(-1));
  assert.equal(rankOf(a), 0);
  a.xp = RANKS[2].xp; assert.equal(rankOf(a), 2);
  a.xp = RANKS[3].xp; a.name = 'Thorn';
  assert.equal(rankOf(a), 3);
  // The player dies: you may take over Thorn.
  const P = s.player; if (P.ant) { P.ant.state = 'dead'; s.ants = s.ants.filter((o) => o !== P.ant); P.ant = null; }
  P.pending = true;
  assert.ok(SIM.possess(s, a.id));
  assert.equal(P.ant, a);
  assert.ok(a.isPlayer);
});

test('doctrine: veterans learn the promotion you choose', () => {
  const s = founded();
  assert.deepEqual(SIM.doctrineOf(s, 'soldier'), ['brawler', 'guard']);
  assert.ok(SIM.setDoctrine(s, 'soldier', 0, 'hunter'));
  assert.deepEqual(SIM.doctrineOf(s, 'soldier'), ['hunter', 'guard']);
  assert.ok(SIM.setDoctrine(s, 'soldier', 1, 'hunter'));
  assert.equal(SIM.doctrineOf(s, 'soldier')[1], 'hunter');
  assert.notEqual(SIM.doctrineOf(s, 'soldier')[0], 'hunter', 'the two picks differ');
});

test('growth survives a save', () => {
  const s = founded(), c = s.colony; rich(s);
  SIM.buyEvo(s, 'mandibles'); SIM.upgradeForage(s); SIM.upgradeCaste(s, 'forager', 'trailblazer');
  step(s, 30);
  const a = s.ants.find((o) => !o.team); a.xp = 77; a.name = 'Pip';
  const r = SIM.deserialize(SIM.serialize(s));
  assert.equal(r.colony.genes, c.genes);
  assert.ok(SIM.has(r, 'mandibles'));
  assert.ok(SIM.picked(r, 'forager', 'trailblazer'));
  const b = r.ants.find((o) => o.id === a.id);
  assert.equal(b.xp, 77); assert.equal(b.name, 'Pip');
});
