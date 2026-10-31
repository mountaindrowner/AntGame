// End-to-end check: build, serve, and play the opening in headless Chromium
// at phone size. Fails on any page error. Screenshots go to $SHOTS (default
// ./e2e-shots).
//   npm run test:e2e
import { build, preview } from 'vite';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// Playwright is not a project dependency; use a global or local install.
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch (e) {
  console.error('Playwright not found. Install it with: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const SHOTS = process.env.SHOTS || path.resolve('e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'warn' });
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });
const sim = (fn, arg) => page.evaluate(fn, arg);
// Advance the simulation quickly without waiting in real time.
const fastForward = (seconds) => sim((sec) => { const { app, SIM } = window.UNDERFOOT; for (let i = 0; i < sec * 20; i++) SIM.tick(app.s, 0.05); }, seconds);
// Tap the canvas where a nest cell projects.
async function tapCell(cx, cy) {
  const p = await sim(([x, y]) => {
    const { views } = window.UNDERFOOT;
    const v = views.nest.project((x + 0.5) * 16, -(y + 0.5) * 16, 0, window.innerWidth, window.innerHeight);
    return [v.x, v.y];
  }, [cx, cy]);
  await page.mouse.click(p[0], p[1]);
  await page.waitForTimeout(120);
}
const msg = () => page.$eval('#msg', (e) => e.textContent);
const step = async (label) => { await page.waitForTimeout(400); console.log(label.padEnd(22), '|', (await msg()).slice(0, 90)); };

try {
  await page.goto(url);
  await page.waitForFunction(() => window.UNDERFOOT && window.UNDERFOOT.app);
  await page.waitForTimeout(800);
  // A new colony opens with the film rolling (no poster); skip it, and the
  // title screen's main menu comes up. Play starts the game.
  await page.waitForSelector('#cine .skip');
  await page.waitForTimeout(1500);
  await shot('00-film');
  await page.click('#cine .skip');
  await page.waitForSelector('#title:not(.hidden)');
  await page.waitForTimeout(800);
  await shot('00b-title');
  await page.click('#title button[data-t="options"]');
  await page.waitForTimeout(200);
  await shot('00c-options');
  await page.click('#title button[data-t="back"]');
  await page.click('#title button[data-t="new"]');
  await page.waitForTimeout(300);
  await step('boot');
  await shot('01-dig-intro');

  await page.click('#intronext');
  await step('intro next');
  const q = await sim(() => ({ x: window.UNDERFOOT.app.s.queen.x, y: window.UNDERFOOT.app.s.queen.y }));
  await tapCell(q.x, q.y + 1);
  await tapCell(q.x, q.y + 2);
  await step('dug two');
  await page.click('#buildnest');
  await step('built nest');
  await fastForward(25);
  await step('hatched');
  await shot('02-nest-hatched');

  // Walk out: tap the cell above, then the top of the shaft.
  const climb = await sim(() => { const P = window.UNDERFOOT.app.s.player; return P.ant ? [Math.floor(P.ant.nx), Math.floor(P.ant.ny)] : null; });
  if (!climb) throw new Error('player ant did not hatch');
  await page.click('#exitnest');
  for (let i = 0; i < 40 && (await sim(() => window.UNDERFOOT.app.s.player.inNest)); i++) await fastForward(1);
  await page.waitForTimeout(300);
  await step('outside');
  await shot('03-surface');

  // Try the core loop: walk to the nearest crumb.
  await sim(() => {
    const { app } = window.UNDERFOOT, s = app.s, a = s.player.ant;
    const f = s.items.filter((i) => i.kind === 'food').sort((p, q) => Math.hypot(p.x * 16 - a.x, p.y * 16 - a.y) - Math.hypot(q.x * 16 - a.x, q.y * 16 - a.y))[0];
    s.player.tx = (f.x + 0.5) * 16; s.player.ty = (f.y + 0.5) * 16;
  });
  await fastForward(8);
  await page.waitForTimeout(300);
  await step('at crumb');
  await shot('04-surface-crumb');

  // Stress: +200 foragers, then look at the swarm from above.
  await page.click('#help');
  await shot('help');
  await page.click('#sheet button[data-helptab="4"]');
  await page.click('#sheet [data-stress]');
  await fastForward(20);
  await page.click('#zoom');
  await page.click('#zoom');
  await page.waitForTimeout(600);
  const fps = await page.$eval('#stats', (e) => e.textContent);
  console.log('stats'.padEnd(22), '|', fps);
  await shot('05-surface-stress');

  await page.click('#viewbtn');
  await page.waitForTimeout(600);
  await shot('06-nest-view');

  // Grow the nest through the sim API: builders, a dug pocket, rooms.
  const built = await sim(() => {
    // A fresh colony (the stress test pushed this one past the queen's cap).
    const { app, SIM } = window.UNDERFOOT;
    app.reset();
    const s = app.s, q = s.queen;
    SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
    s.seen.intro = 'done'; s.seen.dig = s.seen.nest = s.seen.surface = s.seen.soil = s.seen.cap = true;
    // No one forages in this script, so keep the larder topped up.
    const run = (sec) => { for (let i = 0; i < sec * 20; i++) { if (i % 200 === 0) { s.colony.store = 20; s.colony.water = 10; s.colony.grit = 20; } SIM.tick(s, 0.05); } };
    run(30);
    for (let i = 0; i < 3; i++) SIM.queueEgg(s, 'builder');
    run(120);
    const r = q.room, x0 = r.x0 + r.w;
    let n = 0;
    // Dig a corridor east of the chamber and a 4x3 pocket at its end.
    for (let x = x0; x < x0 + 7; x++) if (SIM.toggleDigOrder(s, x, r.y0 + 2) === 'added') n++;
    run(120);
    // The pocket, one row at a time upward from the corridor.
    for (let y = r.y0 + 1; y >= r.y0; y--) { for (let x = x0 + 3; x < x0 + 7; x++) SIM.toggleDigOrder(s, x, y); run(90); }
    const placed = SIM.queueRoom(s, 'hatchery', [x0 + 4, r.y0 + 1]);
    run(60);
    for (let x = x0; x < x0 + 3; x++) SIM.toggleDigOrder(s, x, r.y0 + 4);
    SIM.queueEgg(s, 'forager');
    return { orders: n, placed: !!placed, rooms: s.nest.rooms.map((m) => m.key), building: s.colony.buildQueue.map((j) => j.room), dug: SIM.dugCount(s), ants: SIM.antCount(s) };
  });
  console.log('built'.padEnd(22), '|', JSON.stringify(built));
  await page.waitForTimeout(800);
  await shot('07-nest-built');

  // Room showcase: every room laid out in one fresh nest, for reviewing the
  // dressing. Render-only: the sim is paused and the layout is written directly.
  await sim(() => {
    const { app, SIM, ui } = window.UNDERFOOT;
    app.reset();
    const s = app.s, n = s.nest, NW = SIM.NW, q = s.queen;
    SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
    for (const k of ['dig', 'nest', 'surface', 'soil', 'cap', 'rain', 'raid', 'dew', 'cat', 'spider', 'grit', 'protein', 'cavein']) s.seen[k] = true;
    s.seen.intro = 'done';
    const set = (x, y, v) => { n.cells[y * NW + x] = v; };
    for (let x = 1; x < 23; x++) { set(x, 4, 1); set(x, 10, 1); set(x, 14, 1); }
    for (let y = 0; y < 15; y++) set(12, y, 1);
    const rooms = [['hatchery', 2, 1, 4, 3], ['store', 16, 1, 5, 3], ['cistern', 2, 6, 4, 4], ['workshop', 8, 6, 5, 4], ['nursery', 15, 6, 4, 3], ['barracks', 3, 11, 6, 3]];
    for (const [key, x0, y0, w, h] of rooms) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, 2);
      n.rooms.push({ x0, y0, w, h, key });
    }
    n.ver++;
    Object.assign(s.colony, { store: 110, cap: 150, water: 40, waterCap: 60, grit: 24 });
    s.colony.eggs = [{ caste: 'forager', t: 5, need: 20 }, { caste: 'builder', t: 15, need: 25 }, { caste: 'nurse', t: 2, need: 20 }];
    s.player.inNest = true;
    ui.closeMenu();
    app.paused = true;
    app.zoomMul = 0.62;
    app.panY = 70;
  });
  await page.waitForTimeout(900);
  await shot('08-rooms-all');
  // Close-ups, one per room.
  const rooms = await sim(() => window.UNDERFOOT.app.s.nest.rooms.map((r) => ({ key: r.key, x: r.x0 + r.w / 2, y: r.y0 + r.h / 2 })));
  for (const r of rooms) {
    await sim((f) => { const { app } = window.UNDERFOOT; app.zoomMul = 2.4; app.panY = 0; app.focus = f; }, { x: r.x, y: r.y });
    await page.waitForTimeout(700);
    await shot('room-' + r.key);
  }
  await sim(() => { window.UNDERFOOT.app.focus = null; });

  // Yard showcase: every food, dew, a treat, the spider and the caterpillar
  // around the entrance, for reviewing the models.
  await sim(() => {
    const { app, SIM, ui } = window.UNDERFOOT;
    app.reset();
    const s = app.s, w = s.world, q = s.queen;
    SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
    for (const k of Object.keys(s.seen)) s.seen[k] = true;
    for (const k of ['dig', 'nest', 'surface', 'soil', 'cap', 'rain', 'raid', 'dew', 'cat', 'spider', 'grit', 'protein', 'cavein', 'treat']) s.seen[k] = true;
    s.seen.intro = 'done';
    s.player.inNest = false;
    ui.closeMenu();
    s.items = [];
    const put = (dx, dy, kind, type, amt) => { if (!w.blocked[(w.ey + dy) * SIM.W + w.ex + dx]) s.items.push({ x: w.ex + dx, y: w.ey + dy, kind, type, amt }); };
    put(-3, -2, 'food', 'crumb', 9); put(-1, -2, 'food', 'seed', 20); put(1, -2, 'food', 'berry', 12); put(3, -2, 'food', 'popcorn', 14);
    put(-3, 2, 'food', 'jellybean', 40); put(0, 3, 'food', 'cookie', 35); put(3, 2, 'food', 'gummy', 50);
    put(-2, -4, 'water', 'dew', 8); put(2, -4, 'water', 'dew', 4);
    s.spider = { x: (w.ex + 6.5) * SIM.T, y: (w.ey - 5.5) * SIM.T, hp: 150, maxHp: 150, bite: 0, legs: 1, route: [[(w.ex + 6.5) * SIM.T, (w.ey - 12) * SIM.T]], stuck: 0 };
    s.cat = { x: (w.ex - 5.5) * SIM.T, y: (w.ey + 5.5) * SIM.T, hp: 30, maxHp: 30, wander: 30, gx: (w.ex - 5.5) * SIM.T, gy: (w.ey - 6) * SIM.T };
    s.spiderRespawn = 999; s.itemTimer = -999; s.dewTimer = 0;
    app.zoomMul = 0.85;
  });
  await page.waitForTimeout(1200);
  await shot('09-yard');
  await page.waitForTimeout(700);
  await shot('09b-yard');
  await sim(() => { window.UNDERFOOT.app.zoomMul = 2.2; });
  await page.waitForTimeout(500);
  await shot('10-yard-food');
  // Close-ups of the two big creatures, walking past the entrance.
  await sim(() => {
    const { app, SIM } = window.UNDERFOOT, s = app.s, w = s.world, T = SIM.T;
    s.items = [];
    s.spider = null;
    s.cat = { x: (w.ex + 2.5) * T, y: (w.ey - 2.5) * T, hp: 30, maxHp: 30, wander: 30, gx: (w.ex - 6) * T, gy: (w.ey - 4) * T };
    app.zoomMul = 1.6;
  });
  await page.waitForTimeout(3500);
  await shot('11-caterpillar');
  await sim(() => {
    const { app, SIM } = window.UNDERFOOT, s = app.s, w = s.world, T = SIM.T;
    s.cat = null;
    s.spider = { x: (w.ex - 5) * T, y: (w.ey - 5) * T, hp: 150, maxHp: 150, bite: 0, legs: 1, route: [[(w.ex + 9) * T, (w.ey - 5) * T]], stuck: 0 };
    app.zoomMul = 1.1;
  });
  await page.waitForTimeout(1300);
  await shot('12-spider');
  await page.waitForTimeout(250);
  await shot('12b-spider');
  // A tour of the yard: every region from above (each is built as the camera arrives).
  await sim(() => { const { app } = window.UNDERFOOT, s = app.s; s.cat = null; s.spider = null; s.player.pending = false; s.colony.eggQueue.length = 0; s.colony.eggs.length = 0; app.zoomMul = 0.62; });
  const areas = await sim(() => { const { SIM } = window.UNDERFOOT; return SIM.AREAS.map((A, i) => { const b = SIM.areaBounds(i); return { key: A.key, x: (b.x0 + b.x1 + 1) / 2 * SIM.T, y: (b.y0 + b.y1 + 1) / 2 * SIM.T }; }); });
  for (const A of areas) {
    await sim((f) => { const { app, views } = window.UNDERFOOT; app.surfaceFocus = f; app.view = 'surface'; views.surface.camInit = false; }, { x: A.x, y: A.y });
    await page.waitForTimeout(600);
    await shot('area-' + A.key);
  }
  // The yard map: the whole backyard, with a region's card.
  await sim(() => { const { app } = window.UNDERFOOT; app.surfaceFocus = null; });
  await page.click('#mapbtn');
  await page.waitForTimeout(500);
  await shot('yard-map');
  await page.click('#mapview button[data-plan]');
  await page.waitForTimeout(300);
  await page.click('#sheet button[data-region="9"]');
  await page.waitForTimeout(300);
  await shot('yard-plan');
  await page.click('#sheet button[data-close]');
  // The mower crossing the Lawn.
  await sim(() => { const { app } = window.UNDERFOOT, L = app.s.world.lawn; Object.assign(app.s.mower, { state: 'cut', y: L.y0 + 14, t: 0 }); app.surfaceFocus = { x: (L.x0 + L.w / 2) * 16, y: (L.y0 + 14) * 16 }; app.zoomMul = 0.8; });
  await page.waitForTimeout(500);
  await shot('mower');
  await sim(() => { const { app } = window.UNDERFOOT; Object.assign(app.s.mower, { state: 'idle', next: 1e9 }); app.surfaceFocus = null; });
  // A crew carrying a gummy bear home.
  const carried = await sim(() => {
    const { app, SIM } = window.UNDERFOOT, s = app.s, w = s.world, T = SIM.T;
    s.player.pending = true; s.colony.eggQueue.push('forager');
    for (let i = 0; i < 20 * 25 && !s.player.ant; i++) SIM.tick(s, 0.05);
    const a = s.player.ant; if (!a) return 'no ant';
    s.player.inNest = false; a.state = 'player'; a.x = (w.ex + 6.5) * T; a.y = (w.ey + 4.5) * T; a.tx = w.ex + 6; a.ty = w.ey + 4;
    SIM.stress(s, 10); for (const o of s.ants) if (!o.isPlayer && !o.team) { o.x = a.x + (Math.random() - 0.5) * 30; o.y = a.y + (Math.random() - 0.5) * 30; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); }
    SIM.recruit(s, 10);
    s.items.push({ x: a.tx, y: a.ty, kind: 'food', type: 'gummy', amt: 50 });
    SIM.doAction(s);
    s.player.tx = (w.ex + 0.5) * T; s.player.ty = (w.ey + 0.5) * T;
    app.view = 'surface'; app.zoomMul = 1.6;
    return !!s.player.big;
  });
  console.log('crew lift'.padEnd(22), '|', carried);
  await page.waitForTimeout(900);
  await shot('crew-carry');
  // Build 12: ranks on the ants, the Evolve sheet's three tabs, a purchase, rebirth.
  await sim(() => {
    const { app } = window.UNDERFOOT, s = app.s;
    Object.assign(s.colony, { genes: 12, genesTotal: 12, protein: 80, grit: 80, store: Math.max(s.colony.store, 60) });
    const crew = s.ants.filter((o) => !o.team && !o.isPlayer);
    crew.forEach((o, i) => { o.xp = [0, 0, 15, 60, 160, 420][i % 6]; if (o.xp >= 150) o.name = 'Thorn' + i; });
    s.player.big = null;
  });
  await page.waitForTimeout(500);
  await shot('ranks-on-ants');
  // The Evolution window (build 14): pages, a tree, a node's card, Evolve.
  await page.click('#evolvebtn', { force: true, timeout: 5000 });
  await page.waitForTimeout(500);
  await shot('evolve-goals');
  await page.click('#evo .evo-next', { force: true, timeout: 5000 });
  await page.waitForTimeout(400);
  await shot('evolve-you');
  await page.click('#evo .evo-dots button[data-page="3"]', { force: true, timeout: 5000 });
  await page.waitForTimeout(400);
  await page.click('#evo .enode[data-node="mandibles"]', { force: true, timeout: 5000 });
  await page.waitForTimeout(300);
  await shot('evolve-tree-pick');
  await page.click('#evo .evo-buy', { force: true, timeout: 5000 });
  await page.waitForTimeout(400);
  await shot('evolve-tree');
  const bought = await sim(() => window.UNDERFOOT.SIM.has(window.UNDERFOOT.app.s, 'mandibles'));
  console.log('evolve: mandibles'.padEnd(22), '|', bought);
  if (!bought) errors.push('test: Strong mandibles did not buy');
  await page.click('#evo .evo-dots button[data-page="8"]', { force: true, timeout: 5000 });
  await page.waitForTimeout(400);
  await shot('evolve-ranks');
  await page.click('#evo .evo-x', { force: true, timeout: 5000 });
  // Your ant dies with named ants alive: the rebirth choice opens.
  await sim(() => { const { app } = window.UNDERFOOT, s = app.s, a = s.player.ant; if (a) { a.state = 'dead'; s.ants = s.ants.filter((o) => o !== a); s.player.ant = null; } s.player.pending = true; s.player.died = s.t; s.player.deathCause = 'spider'; app.rebirthAsked = false; });
  await page.waitForTimeout(700);
  // Explainers (Genes, Goals…) come first; dismiss them, then the choice opens.
  const dismiss = async () => { for (let k = 0; k < 6; k++) { const ok = await page.$('#sheet:not(.hidden) .btns.one button[data-close]'); if (!ok) break; await ok.click({ force: true }); await page.waitForTimeout(400); } };
  await dismiss();
  await shot('reborn');
  const reborn = await page.$('#sheet button[data-possess]');
  if (!reborn) errors.push('test: no rebirth choice');
  else { await reborn.click({ force: true, timeout: 5000 }); await page.waitForTimeout(300); }
  const who = await sim(() => { const a = window.UNDERFOOT.app.s.player.ant; return a ? a.name : null; });
  console.log('reborn as'.padEnd(22), '|', who);
  // Build 13: an outpost at the Spigot, raised, holding the region; the Goals tab; the map card.
  const held = await sim(() => {
    const { app, SIM } = window.UNDERFOOT, s = app.s, c = s.colony, T = SIM.T;
    Object.assign(c, { genes: Math.max(c.genes, 5), grit: 40 }); SIM.buyEvo(s, 'waypoints');
    const i = SIM.AREAS.findIndex((A) => A.key === 'spigot'), b = SIM.areaBounds(i), w = s.world;
    let x = Math.floor((b.x0 + b.x1) / 2), y = Math.floor((b.y0 + b.y1) / 2);
    while (w.blocked[y * SIM.W + x]) x++;
    if (!s.player.ant) { s.player.pending = true; for (let k = 0; k < 20 * 40 && !s.player.ant; k++) SIM.tick(s, 0.05); }
    const a = s.player.ant; s.player.inNest = false; a.state = 'player'; a.tx = x; a.ty = y; a.x = (x + 0.5) * T; a.y = (y + 0.5) * T;
    s.spider = null; s.strikes = []; app.view = 'surface'; app.zoomMul = 1.3;
    return SIM.outpostLock(s) || 'ok';
  });
  console.log('outpost lock'.padEnd(22), '|', held);
  await page.waitForTimeout(400);
  await dismiss();
  await page.click('#outpostbtn', { force: true, timeout: 5000 });
  await page.waitForTimeout(300);
  await shot('outpost-started');
  const raised = await sim(() => { const { app, SIM } = window.UNDERFOOT, s = app.s, a = s.player.ant; for (let k = 0; k < 20 * 40; k++) { s.player.hunger = 100; SIM.tick(s, 0.05); a.x = (a.tx + 0.5) * SIM.T; a.y = (a.ty + 0.5) * SIM.T; } const o = s.outposts.at(-1); return { done: o && o.done, held: Object.keys(s.colony.held).length }; });
  console.log('outpost raised/held'.padEnd(22), '|', JSON.stringify(raised));
  if (!raised.done || !raised.held) errors.push('test: outpost not raised or region not held');
  await page.waitForTimeout(600);
  await dismiss();
  await shot('outpost-raised');
  await page.click('#evolvebtn', { force: true, timeout: 5000 });
  await page.waitForTimeout(300);
  await page.click('#evo .evo-dots button[data-page="0"]', { force: true, timeout: 5000 });
  await page.waitForTimeout(200);
  await shot('goals');
  await page.click('#evo .evo-x', { force: true, timeout: 5000 });
  await page.click('#mapbtn', { force: true, timeout: 5000 });
  await page.waitForTimeout(500);
  await shot('map-outpost');
  await page.click('#mapview button', { force: true, timeout: 5000 }).catch(() => {});
  await page.keyboard.press('Escape');
  // Build 15: names over Elites, tapping an ant for its card, the recruit ring, the menu.
  const tapAt = await sim(() => {
    const { app, views, SIM } = window.UNDERFOOT, s = app.s, a = s.player.ant;
    const nm = s.ants.find((o) => !o.team && !o.isPlayer && o.name && o.state !== 'in' && o.state !== 'build');
    if (!nm || !a) return null;
    nm.x = a.x + 3 * SIM.T; nm.y = a.y; nm.tx = Math.floor(nm.x / SIM.T); nm.ty = Math.floor(nm.y / SIM.T); nm.state = 'patrol'; nm.follow = false;
    app.view = 'surface'; app.zoomMul = 1.6; app.paused = true; s.player.msg = 'Raid over. You lost 3 ants, killed 5 raiders.';
    return { x: nm.x, y: nm.y };
  });
  await page.waitForTimeout(600);
  await shot('names-and-report');
  if (tapAt) {
    const p = await sim((t) => { const { views } = window.UNDERFOOT; const v = new views.surface.camera.position.constructor(t.x, 4, t.y).project(views.surface.camera); return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; }, tapAt);
    await sim((xy) => window.UNDERFOOT.app.callout.tap(xy.x, xy.y), tapAt);
    await page.waitForTimeout(300);
    await shot('ant-card');
    const card = await page.$eval('#callout', (e) => e.textContent).catch(() => '');
    console.log('ant card'.padEnd(22), '|', card.slice(0, 80));
    if (!/xp/.test(card)) errors.push('test: ant card shows no rank or xp');
  }
  await sim(() => { const { app } = window.UNDERFOOT; app.paused = false; });
  await page.dispatchEvent('#recruit', 'pointerdown');
  await page.waitForTimeout(500);
  await shot('recruit-ring');
  await page.dispatchEvent('#recruit', 'pointerup');
  await page.click('#menubtn', { force: true, timeout: 5000 });
  await page.waitForTimeout(400);
  const menu = await sim(() => window.UNDERFOOT.app.titleOpen);
  console.log('menu button'.padEnd(22), '|', menu);
  if (!menu) errors.push('test: Menu button did not open the main menu');
  await page.click('#title button[data-t="continue"]', { force: true, timeout: 5000 }).catch(() => {});
} catch (e) {
  errors.push('test: ' + e.message);
}

await browser.close();
server.httpServer.close();
if (errors.length) {
  console.error('FAILED\n' + [...new Set(errors)].join('\n'));
  process.exit(1);
}
console.log('e2e ok, screenshots in', SHOTS);
