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
  // A new colony opens with the film; check it is there, then skip it.
  await page.waitForSelector('#cine .roll');
  await shot('00-film-poster');
  await page.click('#cine .skip');
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
  await page.click('#stress');
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
  // A tour of the yard: each of the nine areas from above.
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
  await page.waitForTimeout(300);
  await page.click('#sheet button[data-region="9"]');
  await page.waitForTimeout(300);
  await shot('yard-map');
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
