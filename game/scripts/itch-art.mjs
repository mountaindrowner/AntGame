// itch.io page art, rendered by the game itself: screenshots, a cover, a
// banner and a page background. Builds, serves, and drives the game in
// headless Chromium like the e2e test.
//   node scripts/itch-art.mjs [outDir]   (default ../docs/itch)
import { build, preview } from 'vite';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = path.resolve(process.argv[2] || '../docs/itch');
fs.mkdirSync(OUT, { recursive: true });
await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'warn' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

// One page per size. hud: false hides the HUD for clean art.
async function open(w, h, dpr) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.UNDERFOOT && window.UNDERFOOT.app, null, { timeout: 120000 });
  await page.waitForSelector('#cine .skip'); await page.waitForTimeout(800);
  await page.click('#cine .skip'); await page.waitForSelector('#title:not(.hidden)'); await page.waitForTimeout(600);
  return page;
}
const hud = (page, on) => page.evaluate((on) => { let st = document.getElementById('art-hide'); if (!st) { st = document.createElement('style'); st.id = 'art-hide'; document.head.appendChild(st); } st.textContent = on ? '' : '#top,#bar,#bar2,#barn,#labels,#sheet,#tip,#mapview{display:none!important}'; }, on);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') });

// Every explainer marked seen, the event queue and message cleared, no sheet.
const quiet = (page) => page.evaluate(() => { const { app, ui } = window.UNDERFOOT, s = app.s; for (const k of ['dig', 'nest', 'surface', 'soil', 'cap', 'rain', 'raid', 'dew', 'cat', 'spider', 'grit', 'protein', 'cavein', 'treat', 'genes', 'veteran', 'goal', 'outpost', 'held', 'queen', 'build', 'starving', 'feet', 'bird', 'toad', 'acorn', 'spray', 'fireants', 'mower', 'queenhit', 'soldierfood', 'lost']) s.seen[k] = true; s.seen.intro = 'done'; s.events.length = 0; s.player.msg = ''; ui.closeMenu(); });
// Scenes, written straight into the sim (render-only set-ups, as in e2e).
const SCENES = {
  // A colony at work round the entrance: a crew hauling a gummy bear home,
  // foragers on a trail, veterans with their rings.
  yard: () => {
    const { app, SIM, ui } = window.UNDERFOOT;
    app.reset();
    const s = app.s, w = s.world, q = s.queen, T = SIM.T;
    SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
    for (const k of Object.keys(s.seen)) s.seen[k] = true;
    for (const k of ['dig', 'nest', 'surface', 'soil', 'cap', 'rain', 'raid', 'dew', 'cat', 'spider', 'grit', 'protein', 'cavein', 'treat', 'genes', 'veteran', 'goal']) s.seen[k] = true;
    s.seen.intro = 'done'; ui.closeMenu();
    s.player.pending = true; s.colony.eggQueue.push('forager');
    for (let i = 0; i < 20 * 25 && !s.player.ant; i++) SIM.tick(s, 0.05);
    const a = s.player.ant; s.player.inNest = false; a.state = 'player';
    a.x = (w.ex + 12.5) * T; a.y = (w.ey + 4.5) * T; a.tx = w.ex + 12; a.ty = w.ey + 4;
    SIM.stress(s, 40);
    let k = 0;
    for (const o of s.ants) if (!o.isPlayer && !o.team) {
      const ang = k * 2.4, r = k < 12 ? 0.6 + (k % 3) * 0.6 : 3 + (k % 9) * 1.4; k++;
      o.x = a.x + Math.cos(ang) * r * T; o.y = a.y + Math.sin(ang) * r * T; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T);
      o.xp = [0, 0, 20, 60, 160][k % 5]; if (o.xp >= 150) o.name = 'Thorn' + k;
    }
    SIM.recruit(s, 14);
    s.items = s.items.filter((f) => Math.hypot(f.x - w.ex, f.y - w.ey) > 14);
    s.items.push({ x: a.tx, y: a.ty, kind: 'food', type: 'gummy', amt: 50 });
    SIM.doAction(s); s.player.msg = '';
    for (const [dx, dy, type] of [[-4, -3, 'berry'], [-2, -5, 'crumb'], [8, -2, 'cookie'], [-6, 2, 'seed'], [3, -6, 'popcorn']]) s.items.push({ x: w.ex + dx, y: w.ey + dy, kind: 'food', type, amt: 15 });
    s.items.push({ x: w.ex - 3, y: w.ey + 5, kind: 'water', type: 'dew', amt: 8 });
    for (let x = w.ex; x < w.ex + 16; x++) for (const y of [w.ey + 1, w.ey + 2]) { const i = y * SIM.W + x; s.trail[i] = 3; s.hot.add(i); }
    s.player.tx = (w.ex + 0.5) * T; s.player.ty = (w.ey + 0.5) * T;
    s.spider = null; s.spiderRespawn = 999; s.cat = null; s.catRespawn = 999; s.strikes = [];
    app.view = 'surface'; app.zoomMul = 1.15;
  },
  // The nest: every room furnished, ants about, eggs in the hatchery.
  nest: () => {
    const { app, SIM, ui } = window.UNDERFOOT;
    app.reset();
    const s = app.s, n = s.nest, NW = SIM.NW, q = s.queen;
    SIM.queenDig(s, q.x, q.y + 1); SIM.queenDig(s, q.x, q.y + 1); SIM.buildNest(s);
    for (const k of Object.keys(s.seen)) s.seen[k] = true; s.seen.intro = 'done'; ui.closeMenu();
    const set = (x, y, v) => { n.cells[y * NW + x] = v; };
    for (let x = 1; x < 23; x++) { set(x, 4, 1); set(x, 10, 1); set(x, 14, 1); }
    for (let y = 0; y < 15; y++) set(12, y, 1);
    const rooms = [['hatchery', 2, 1, 4, 3], ['store', 16, 1, 5, 3], ['cistern', 2, 6, 4, 4], ['workshop', 8, 6, 5, 4], ['nursery', 15, 6, 4, 3], ['barracks', 3, 11, 6, 3]];
    for (const [key, x0, y0, w, h] of rooms) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, 2); n.rooms.push({ x0, y0, w, h, key }); }
    n.ver++;
    Object.assign(s.colony, { store: 110, cap: 150, water: 40, waterCap: 60, grit: 24 });
    s.colony.eggs = [{ caste: 'forager', t: 5, need: 20 }, { caste: 'builder', t: 15, need: 25 }, { caste: 'nurse', t: 2, need: 20 }];
    SIM.stress(s, 14);
    const spots = [[3, 2], [4, 3], [17, 2], [19, 3], [3, 8], [10, 8], [11, 9], [16, 7], [5, 12], [7, 13], [12, 4], [12, 10], [20, 10], [8, 4]];
    const castes = ['nurse', 'nurse', 'forager', 'forager', 'builder', 'builder', 'builder', 'nurse', 'soldier', 'soldier', 'forager', 'builder', 'forager', 'forager'];
    s.ants.filter((o) => !o.team && !o.isPlayer).forEach((o, i) => { const [x, y] = spots[i % spots.length]; o.caste = castes[i % castes.length]; o.state = 'in'; o.nx = x + 0.5; o.ny = y + 0.5; o.ntx = x; o.nty = y; o.goal = 'idle'; o.rest = 99; o.xp = i % 3 ? 20 : 0; });
    s.player.inNest = true; app.view = 'nest'; app.paused = true; app.zoomMul = 1.15; app.panY = 0; app.focus = { x: 12, y: 7.5 };
  },
  // The wolf spider stalking a foraging line near its web.
  spider: () => {
    const { app, SIM, ui } = window.UNDERFOOT;
    const s = app.s, w = s.world, T = SIM.T;
    app.paused = false; app.panY = 0; app.focus = null;
    const fx = w.web.x, fy = w.web.y + 10;
    const a = s.player.ant || s.ants.find((o) => !o.team);
    s.player.inNest = false; a.isPlayer = true; s.player.ant = a; a.state = 'player'; a.x = (fx + 0.5) * T; a.y = (fy + 6.5) * T; a.tx = fx; a.ty = fy + 6;
    SIM.stress(s, 12);
    let k = 0; for (const o of s.ants) if (!o.isPlayer && !o.team && o.state !== 'in') { o.x = (fx - 6 + k) * T; o.y = (fy + 4 + (k % 3)) * T; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); o.state = 'explore'; k++; }
    // Stalking, not biting: tired, and the ants a little beyond its reach.
    s.spider = { x: (fx + 1.5) * T, y: (fy + 0.5) * T, hp: 150, maxHp: 150, bite: -999, legs: 1, route: [[(fx - 2) * T, (fy + 1) * T]], stuck: 0, tired: 999 };
    for (const o of s.ants) if (!o.team && o.state !== 'in') o.flee = 0;
    s.items.push({ x: fx - 2, y: fy + 4, kind: 'food', type: 'berry', amt: 12 }, { x: fx + 3, y: fy + 5, kind: 'food', type: 'berry', amt: 12 });
    app.view = 'surface'; app.zoomMul = 1.3; ui.closeMenu();
  },
  // An outpost cairn at the Spigot, a crew round it.
  outpost: () => {
    const { app, SIM, ui } = window.UNDERFOOT;
    const s = app.s, T = SIM.T, i = SIM.AREAS.findIndex((A) => A.key === 'spigot'), b = SIM.areaBounds(i), w = s.world;
    let x = Math.floor((b.x0 + b.x1) / 2), y = Math.floor((b.y0 + b.y1) / 2); while (w.blocked[y * SIM.W + x]) x++;
    s.outposts.push({ id: 9001, x, y, region: i, work: 30, done: true, hp: 2 });
    s.spider = null; SIM.stress(s, 10);
    const a = s.player.ant || s.ants.find((q) => !q.team); a.isPlayer = true; s.player.ant = a; s.player.inNest = false; a.state = 'player'; a.x = (x + 2.5) * T; a.y = (y + 3.5) * T; a.tx = x + 2; a.ty = y + 3;
    let k = 0; for (const o of s.ants) if (!o.isPlayer && !o.team && o.state !== 'in' && k < 14) { const ang = k * 1.9, r = 2.5 + (k % 4); o.state = 'explore'; o.x = (x + 0.5 + Math.cos(ang) * r) * T; o.y = (y + 0.5 + Math.sin(ang) * r) * T; o.tx = Math.floor(o.x / T); o.ty = Math.floor(o.y / T); k++; }
    app.view = 'surface'; app.zoomMul = 1.6; ui.closeMenu();
  },
};

// ---------- landscape screenshots (1280×720) ----------
const L = await open(1280, 720, 1);
await L.click('#title button[data-t="new"]').catch(() => {});
await L.waitForTimeout(300);
await L.evaluate(SCENES.yard); await quiet(L); await L.waitForTimeout(2200); await quiet(L); await hud(L, true); await shot(L, 'shot-1-crew');
await L.evaluate(SCENES.nest); await quiet(L); await L.waitForTimeout(5000); await quiet(L); await L.waitForTimeout(300); await shot(L, 'shot-2-nest');
await L.evaluate(SCENES.spider); await quiet(L); await L.waitForTimeout(1200); await L.evaluate(() => { window.UNDERFOOT.app.paused = true; }); await L.waitForTimeout(2500); await quiet(L); await L.waitForTimeout(300); await shot(L, 'shot-3-spider'); await L.evaluate(() => { window.UNDERFOOT.app.paused = false; });
await L.evaluate(SCENES.outpost); await quiet(L); await L.waitForTimeout(9000); await quiet(L); await L.waitForTimeout(300); await shot(L, 'shot-4-outpost');
// Evolve, over the yard.
await L.evaluate(SCENES.yard); await quiet(L); await L.waitForTimeout(2000); await quiet(L);
await L.evaluate(() => { const { app } = window.UNDERFOOT; Object.assign(app.s.colony, { genes: 14, genesTotal: 20, protein: 40, grit: 40 }); app.growTab = 'evo'; });
await L.click('#evolvebtn', { force: true }); await L.waitForTimeout(500); await shot(L, 'shot-5-evolve');
await L.close();

// ---------- portrait phone screenshots (390×844 @3) ----------
const Pp = await open(390, 844, 3);
await shot(Pp, 'phone-1-title');
await Pp.click('#title button[data-t="new"]').catch(() => {});
await Pp.waitForTimeout(300);
await Pp.evaluate(SCENES.yard); await quiet(Pp); await Pp.waitForTimeout(1500);
await Pp.evaluate(() => { const { app } = window.UNDERFOOT; Object.assign(app.s.colony, { genes: 9, genesTotal: 14, foodTotal: 32, hatched: 6 }); app.s.colony.goals.done.scout2 = true; app.growTab = 'goals'; });
await quiet(Pp); await Pp.click('#evolvebtn', { force: true }); await Pp.waitForTimeout(800); await Pp.evaluate(() => { window.UNDERFOOT.app.s.player.msg = ''; }); await Pp.waitForTimeout(400); await shot(Pp, 'phone-2-goals');
await Pp.close();

// ---------- clean renders for the cover and banner ----------
const C = await open(1260, 1000, 1);
await C.click('#title button[data-t="new"]').catch(() => {});
await C.waitForTimeout(300); await hud(C, false);
await C.evaluate(SCENES.yard); await C.evaluate(() => { window.UNDERFOOT.app.zoomMul = 1.45; }); await quiet(C); await C.waitForTimeout(2500);
const coverBg = (await C.screenshot()).toString('base64');
await C.close();
const B = await open(1920, 640, 1);
await B.click('#title button[data-t="new"]').catch(() => {});
await B.waitForTimeout(300); await hud(B, false);
await B.evaluate(SCENES.yard); await B.evaluate(() => { window.UNDERFOOT.app.zoomMul = 1.0; }); await quiet(B); await B.waitForTimeout(2500);
const bannerBg = (await B.screenshot()).toString('base64');
await B.close();

// Typeset over them, in the game's own fonts and colours.
const FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&family=Bungee+Shade&family=Nunito:wght@700;800&display=swap">';
const typeset = async (w, h, bg, html, name) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(`<!doctype html><html><head>${FONT}<style>
    body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#120a05 url(data:image/png;base64,${bg}) center/cover;font-family:Bungee,Impact,sans-serif;color:#ffd34d;position:relative}
    .shade{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(18,8,2,0) 30%,rgba(18,8,2,.72) 100%)}
    .t{position:absolute;left:0;right:0;text-align:center;text-shadow:0 4px 0 #6a2c0c,0 8px 0 #2a1206,0 10px 18px rgba(0,0,0,.6);letter-spacing:.02em}
    .s{position:absolute;left:0;right:0;text-align:center;font:800 22px Nunito,system-ui,sans-serif;color:#fff3dc;text-shadow:0 2px 0 #000,0 0 12px rgba(0,0,0,.8)}
  </style></head><body><div class="shade"></div>${html}</body></html>`);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, name + '.png') });
  await p.close();
};
await typeset(630, 500, coverBg, '<div class="t" style="top:300px;font-size:82px">Underfoot!</div><div class="s" style="top:420px">One queen. One rock. One very big yard.</div>', 'cover');
await typeset(960, 320, bannerBg, '<div class="t" style="top:80px;font-size:96px">Underfoot!</div><div class="s" style="top:220px;font-size:24px">One queen. One rock. One very big yard.</div>', 'banner');

// A tiling page background: dark loam with grit and the odd root.
const T = await browser.newPage({ viewport: { width: 512, height: 512 } });
await T.setContent('<canvas id="c" width="512" height="512"></canvas>');
await T.evaluate(() => {
  const c = document.getElementById('c'), g = c.getContext('2d'); let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#1d140c'; g.fillRect(0, 0, 512, 512);
  const cols = ['#24180e', '#2a1d12', '#181009', '#2f2114', '#3a2918'];
  // Blocky PS1-ish grain: 4 px cells, wrapped so the tile repeats.
  for (let y = 0; y < 512; y += 4) for (let x = 0; x < 512; x += 4) { if (r() < 0.55) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, 4, 4); } }
  for (let i = 0; i < 140; i++) { const x = r() * 512, y = r() * 512, s = 2 + Math.floor(r() * 3) * 2; g.fillStyle = r() < 0.5 ? '#4a3a2a' : '#5a4836'; for (const [ox, oy] of [[0, 0], [512, 0], [0, 512], [-512, 0], [0, -512]]) g.fillRect(x + ox, y + oy, s, s); }
  g.strokeStyle = 'rgba(80,58,34,0.6)'; g.lineWidth = 2;
  for (let i = 0; i < 6; i++) { let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 40; y += r() * 22; g.lineTo(x, y); } g.stroke(); }
});
await (await T.$('#c')).screenshot({ path: path.join(OUT, 'background.png') });

await browser.close();
server.httpServer.close();
console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'ok', '→', OUT);
console.log(fs.readdirSync(OUT).join('\n'));
