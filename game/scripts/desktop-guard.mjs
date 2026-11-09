// The desktop guard (phone work, Nov 2026): the desktop game must look exactly the same after each phone change.
// It loads a fixed save in a desktop browser at two window sizes, seeds every random number, drives the frame loop
// by hand at exactly 60 frames a second with a fixed date, and photographs the main screens. The first run
// (--baseline) keeps the photos; later runs compare byte for byte and fail on any difference.
//   node scripts/desktop-guard.mjs --baseline    (before a change)
//   node scripts/desktop-guard.mjs               (after: must match)
import { build, preview } from 'vite';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const G = process.env.GUARD_DIR || path.resolve('.guard'), BASE = path.join(G, 'baseline'), NOW = path.join(G, 'now'); // (GUARD_DIR: to take the baseline from another checkout)
const baseline = process.argv.includes('--baseline');
const OUT = baseline ? BASE : NOW;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const SAVE = fs.readFileSync(path.resolve('tests/fixtures/guard-save.json'), 'utf8');

await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'warn' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const SIZES = [[1280, 800], [1600, 900]];
const errors = [];

for (const [W, H] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: false, isMobile: false, reducedMotion: 'reduce' });
  await ctx.clock.install({ time: new Date('2026-11-09T12:00:00Z') }); // (timers run only as the frames do: below)
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${W}x${H} pageerror: ${e.message}`));
  await page.addInitScript((save) => {
    // Seeded randomness, reseedable, and a hand-driven frame loop with its own clock.
    let sd = 1; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    window.__seed = (n) => { sd = n >>> 0; };
    let q = [], vt = 0; window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    performance.now = () => vt;
    window.__step = (n = 1) => { for (let i = 0; i < n; i++) { vt += 1000 / 60; const cbs = q; q = []; for (const cb of cbs) cb(vt); } };
    // Page animations off (a pulse or a fade would be caught mid-way).
    document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st); });
    localStorage.clear();
    localStorage.setItem('underfoot-v11', save);
    localStorage.setItem('underfoot-tips', JSON.stringify({ nest: 1, surface: 1, dig: 1 }));
    localStorage.setItem('underfoot-options', JSON.stringify({ sound: false, graphics: 'sharp' }));
  }, SAVE);
  await page.goto(server.resolvedUrls.local[0]);
  // Let it boot: frames by hand, with real pauses so shaders compile and promises settle.
  const run = async (frames) => { for (let i = 0; i < frames; i += 20) { await page.evaluate(() => window.__step(20)); await ctx.clock.runFor(333); await page.waitForTimeout(5); } };
  await run(240);
  // A screenshot straight from Chrome (Playwright's own waits for a browser-driven frame, which the hand-driven loop holds).
  const cdp = await ctx.newCDPSession(page);
  const shot = async (name) => { await run(4); const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `${W}x${H}-${name}.png`), Buffer.from(data, 'base64')); };
  await shot('0-title');
  // Into the yard, frozen: the sim holds still (paused), the scene keeps drawing.
  await page.evaluate(() => { const { app, SIM } = window.UNDERFOOT; window.__seed(42);
    document.querySelector('#title button[data-t="continue"]').click(); app.paused = true;
    const s = app.s, P = s.player, T = SIM.T; if (P.inNest) { P.inNest = false; P.ant.state = 'player'; }
    P.ant.x = (s.world.ex + 0.5) * T; P.ant.y = (s.world.ey + 4) * T; P.ant.tx = s.world.ex; P.ant.ty = s.world.ey + 4; P.tx = null; });
  await run(450); // (and every region's map photo taken: they're made a few a frame as regions load)
  await page.evaluate(() => window.__seed(43));
  await shot('1-yard');
  await page.evaluate(() => { const { app, SIM } = window.UNDERFOOT; SIM.recruit(app.s, 10); });
  await shot('2-crew');
  const panel = async (sel, name) => { await page.click(sel); await run(10); await shot(name); await page.keyboard.press('Escape'); await run(10); };
  await panel('#jobsbtn', '3-jobs');
  await panel('#evolvebtn', '4-evolve');
  await panel('#mapbtn', '5-map');
  await page.evaluate(() => { window.UNDERFOOT.app.s.player.inNest = true; });
  await run(60); await page.waitForTimeout(3000); await run(60); // (the nest's shaders compile in the background as you enter: let them finish)
  await shot('6-nest');
  await ctx.close();
}
await browser.close(); server.httpServer.close();

if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1); }
if (baseline) { console.log(`desktop guard: baseline of ${fs.readdirSync(BASE).length} screens kept in ${BASE}`); process.exit(0); }
// Compare byte for byte; on a difference, say how much (with Python's PIL if there is one) and keep a diff image.
const bad = [], specks = [];
for (const f of fs.readdirSync(BASE)) {
  const a = fs.readFileSync(path.join(BASE, f)), bp = path.join(NOW, f);
  if (!fs.existsSync(bp)) { bad.push(`${f}: missing`); continue; }
  if (a.equals(fs.readFileSync(bp))) continue;
  let how = 'differs';
  try { how = execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
a=Image.open(${JSON.stringify(path.join(BASE, f))}).convert('RGB'); b=Image.open(${JSON.stringify(bp)}).convert('RGB')
d=ImageChops.difference(a,b); bb=d.getbbox(); n=sum(1 for p in d.getdata() if p!=(0,0,0))
d.point(lambda v: 255 if v else 0).save(${JSON.stringify(bp.replace('.png', '-DIFF.png'))})
print(f"{n} pixels differ ({100*n/(a.width*a.height):.3f}%), in box {bb}")`]).toString().trim(); } catch (e) { /* no PIL */ }
  // A speck (under 500 pixels in one small box) is reported but doesn't fail: a lone ant drawn a frame early or late.
  const m = /^(\d+) pixels differ .*box \((\d+), (\d+), (\d+), (\d+)\)/.exec(how), small = m && +m[1] < 500 && +m[4] - +m[2] < 80 && +m[5] - +m[3] < 80;
  (small ? specks : bad).push(`${f}: ${how}`);
}
if (specks.length) console.log('desktop guard: specks (reported, not failing):\n  ' + specks.join('\n  '));
if (bad.length) { console.error('desktop guard: the desktop game changed:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`desktop guard: all ${fs.readdirSync(BASE).length} desktop screens identical`);
