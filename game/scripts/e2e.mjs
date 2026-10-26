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
