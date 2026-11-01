// Build 19: bosses that show their attacks, change at half health and leave
// trophies; and the event director with its Cordyceps outbreak.
import test from 'node:test';
import assert from 'node:assert/strict';
import SIM from '../src/sim/sim.js';

const { T } = SIM;
function founded() {
  const s = SIM.create(7), q = s.queen;
  SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
  for (let i = 0; i < 30 * 20; i++) SIM.tick(s, 0.05);
  s.spider = null; s.spiderRespawn = 1e9; s.critters = []; s.bugT = -1e9; s.director.next = 1e9;
  return s;
}
const step = (s, sec, each) => { for (let i = 0; i < sec * 20; i++) { SIM.tick(s, 0.05); if (each && each() === false) return; } };
function ant(s, caste, x, y, extra) { SIM.stress(s, 1); const a = s.ants[s.ants.length - 1]; Object.assign(a, { caste, state: 'patrol', x, y, tx: Math.floor(x / T), ty: Math.floor(y / T), hp: 99, flee: 0 }, extra); return a; }
function wake(s, key) { s.active[SIM.REGION[SIM.BOSSES[key].region]] = true; const b = SIM.ensureBoss(s, key); return b; }

test('each boss has a lair, wakes when ants come near, and shows its name the first time you do', () => {
  const s = founded(), b = wake(s, 'hornworm');
  assert.ok(b && b.mode === 'idle');
  const a = s.player.ant; s.player.inNest = false; a.state = 'player'; a.x = b.x + 6 * T; a.y = b.y; a.tx = Math.floor(a.x / T); a.ty = Math.floor(a.y / T); s.player.tx = null;
  step(s, 0.2);
  assert.equal(b.mode, 'fight');
  assert.equal(s.bossIntro.key, 'hornworm');
  assert.match(s.player.msg, /The Hornworm/);
});

test('the hornworm rears up before it thrashes, and ants that step out are spared', () => {
  const s = founded(), b = wake(s, 'hornworm');
  const stay = ant(s, 'soldier', b.x + 2 * T, b.y), go = ant(s, 'soldier', b.x - 2 * T, b.y);
  b.mode = 'fight'; b.cd = 0;
  step(s, 0.1, () => { stay.x = b.x + 2 * T; stay.y = b.y; });
  assert.equal(b.atk && b.atk.kind, 'ring', 'it telegraphs a ring first');
  go.x = b.x - 8 * T; go.state = 'in'; // stepped out
  const hp = stay.hp; step(s, 1.4, () => { stay.x = b.x + 2 * T; stay.y = b.y; stay.state = 'patrol'; });
  assert.ok(stay.hp < hp - 3, 'the one that stayed was hit');
  assert.ok(go.hp === 99, 'the one that stepped out was not');
});

test('the beetle shrugs off bites until it charges into a rock and is dazed', () => {
  const s = founded(); s.active[SIM.REGION.rockgarden] = true; const b = wake(s, 'beetle');
  assert.ok(b, 'a beetle in the Rock Garden');
  const biter = ant(s, 'soldier', b.x + 1.5 * T, b.y);
  b.mode = 'fight'; b.cd = 99;
  const hp0 = b.hp; step(s, 2, () => { biter.x = b.x + 1.5 * T; biter.y = b.y; biter.hp = 99; });
  const armoured = hp0 - b.hp;
  b.dazeT = 3; const hp1 = b.hp; step(s, 2, () => { biter.x = b.x + 1.5 * T; biter.y = b.y; biter.hp = 99; });
  const dazed = hp1 - b.hp;
  assert.ok(dazed > armoured * 10, `dazed it takes far more (${armoured.toFixed(1)} vs ${dazed.toFixed(1)})`);
});

test('the beetle shows its charge lane, then charges down it', () => {
  const s = founded(); const b = wake(s, 'beetle');
  const a = ant(s, 'forager', b.x + 6 * T, b.y, { state: 'explore' });
  b.mode = 'fight'; b.cd = 0;
  step(s, 0.1, () => { a.x = b.x + 6 * T; a.y = b.y; });
  assert.equal(b.atk && b.atk.kind, 'lane');
  const x0 = b.x; step(s, 1.6);
  assert.ok(Math.abs(b.x - x0) > 3 * T || b.dazeT > 0, 'it charged');
});

test('the antlion queen hides under her pit; a crew at the edge draws her up', () => {
  const s = founded(), b = wake(s, 'antlion');
  assert.ok(b.under);
  const pit = s.world.pits[b.pit];
  b.mode = 'fight'; b.cd = 99;
  const crew = []; for (let i = 0; i < 9; i++) { const ang = i * 0.7; crew.push(ant(s, 'soldier', (pit.x + Math.cos(ang) * (pit.r + 1.5)) * T, (pit.y + Math.sin(ang) * (pit.r + 1.5)) * T)); }
  step(s, 2.6, () => { for (const [i, c] of crew.entries()) { const ang = i * 0.7; c.x = (pit.x + Math.cos(ang) * (pit.r + 1.5)) * T; c.y = (pit.y + Math.sin(ang) * (pit.r + 1.5)) * T; c.hp = 99; } });
  assert.equal(b.under, false, 'she surfaced');
});

test('a boss killed stays dead, pays a trophy, Genes, chitin and a Legend', () => {
  const s = founded(), c = s.colony, b = wake(s, 'beetle');
  const a = ant(s, 'soldier', b.x + T, b.y);
  b.mode = 'fight'; b.biters = { [a.id]: s.t }; b.hp = 0.01; b.dazeT = 5; const g = c.genes;
  step(s, 0.2, () => { a.x = b.x + T; a.y = b.y; a.hp = 99; });
  assert.ok(b.dead);
  assert.ok(c.trophies.shell, 'the shell');
  assert.ok(c.genes >= g + 4);
  assert.ok(s.items.some((f) => f.kind === 'chitin' && f.amt >= 40), 'its chitin');
  assert.ok(a.legend && /Shell-breaker/.test(a.title));
  assert.equal(SIM.roomLock(s, 'armory'), '', 'the Armory can be built');
  step(s, 5); assert.ok(s.bosses.beetle.dead, 'and it does not come back');
});

test('the director starts a gift early and lethal events only once the colony can take it', () => {
  const s = founded(); s.director.next = s.t;
  step(s, 0.1);
  assert.ok(s.event, 'something happened');
  assert.notEqual(SIM.EVENTS[s.event.key].kind, 'lethal', 'never lethal this early');
  assert.ok(s.banner && s.banner.title);
});

test('Cordyceps: the infected turn, climb, die and sprout stalks that burst onto ants nearby', () => {
  const s = founded(); SIM.stress(s, 10);
  const w = s.world, x = (w.ex + 20.5) * T, y = (w.ey + 0.5) * T;
  for (const a of s.ants.slice(-10)) Object.assign(a, { state: 'explore', x, y, tx: Math.floor(x / T), ty: Math.floor(y / T) });
  SIM.startEvent(s, 'cordyceps');
  assert.equal(s.event.key, 'cordyceps');
  const sick = s.ants.filter((a) => a.infect != null);
  assert.equal(sick.length, 2);
  step(s, 16);
  assert.ok(sick.some((a) => a.zombie && (a.state === 'zombie' || a.state === 'dead')), 'turned');
  step(s, 21);
  assert.ok(s.stalks.length >= 1, 'a stalk grew');
  // Ants crowd round the stalk; it bursts.
  const st = s.stalks[0]; for (const a of s.ants.filter((a) => !a.team && a.infect == null && !a.isPlayer).slice(0, 8)) Object.assign(a, { caste: 'forager', state: 'explore', x: st.x + 8, y: st.y, tx: Math.floor(st.x / T), ty: Math.floor(st.y / T) });
  step(s, 13, () => { for (const a of s.ants) if (!a.team && a.infect == null && !a.isPlayer && a.state === 'explore') { a.x = st.x + 8; a.y = st.y; } });
  assert.ok(s.ants.some((a) => a.infect != null && a.infect < 14), 'spores took new ants');
});

test('Cordyceps: soldiers kill zombies and nurses cure the newly infected inside; the outbreak ends', () => {
  const s = founded(), c = s.colony;
  SIM.stress(s, 6); const sick = s.ants.slice(-2);
  for (const a of sick) Object.assign(a, { state: 'in', nx: SIM.SHAFT + 0.5, ny: 0.5, ntx: SIM.SHAFT, nty: 0, goal: null, rest: 99 });
  const nurse = s.ants.slice(-6, -2); for (const n of nurse) Object.assign(n, { caste: 'nurse', state: 'in', rest: 99 });
  // Everyone else stays out of the nest, so the cure is what's tested.
  for (const a of s.ants) if (!a.team && !a.isPlayer && !sick.includes(a) && !nurse.includes(a)) a.state = 'dead';
  s.ants = s.ants.filter((a) => a.state !== 'dead');
  SIM.startEvent(s, 'cordyceps');
  for (const a of s.ants) if (a.infect != null && !sick.includes(a)) a.infect = null;
  for (const a of sick) a.infect = 0.01;
  step(s, 30, () => { for (const a of sick) if (a.state === 'explore') { a.state = 'in'; } if (!s.event) return false; });
  assert.equal(s.event, null, 'over');
  assert.ok((c.immunity || 0) >= 1, 'a little more resistant');
});

test('a war party comes with a named champion; kill it and the rest break', () => {
  const s = founded(); s.t = Math.max(s.t, 700);
  SIM.startEvent(s, 'warparty');
  const champ = s.ants.find((a) => a.champion);
  assert.ok(champ && champ.name && champ.hp >= 40);
  champ.hp = 0; champ.state = 'dead';
  step(s, 0.2);
  assert.equal(s.event, null);
  assert.match(s.player.msg, /is dead! The war party breaks/);
});

test('bosses and events survive a save', () => {
  const s = founded(), b = wake(s, 'hornworm'); b.hp = 300; b.mode = 'fight';
  SIM.startEvent(s, 'heat');
  const s2 = SIM.deserialize(SIM.serialize(s));
  assert.equal(s2.bosses.hornworm.hp, 300);
  assert.equal(s2.event.key, 'heat');
});

test('events come 8 to 10 minutes apart, and the lethal ones rarely and late', () => {
  const s = founded(); SIM.stress(s, 30);
  s.director.next = s.t; step(s, 0.1);
  const first = s.event; assert.ok(first);
  s.event.t = s.event.end; step(s, 0.1); // let it end
  assert.equal(s.event && s.event.key === first.key ? 'same' : 'ok', 'ok');
  const gap = s.director.next - s.t;
  assert.ok(gap >= 470 && gap <= 610, `next in ${Math.round(gap)} s`);
  // Over a simulated hour of draws, nothing lethal before 25 minutes, and lethal ones 20 minutes apart.
  const s2 = founded(); SIM.stress(s2, 40); const D = s2.director; const lethal = [];
  for (let t = 300; t < 3600; t += 30) { s2.t = t; if (s2.event) { s2.event = null; } D.next = t; step(s2, 0.05); if (s2.event && SIM.EVENTS[s2.event.key].kind === 'lethal') lethal.push(t); }
  assert.ok(lethal.every((t) => t >= 1500), `lethal at ${lethal}`);
  for (let i = 1; i < lethal.length; i++) assert.ok(lethal[i] - lethal[i - 1] >= 1200, `lethal at ${lethal}`);
});
