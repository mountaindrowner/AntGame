// Records the opening film frame by frame at phone size in headless
// Chromium: the film is stepped exactly 1/25 s per frame, each frame is
// screenshotted and piped to ffmpeg with the synthesised score rendered
// offline, so picture and sound are in perfect sync. Needs ffmpeg.
//   node scripts/film.mjs [out-dir]
import { build, preview } from 'vite';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = path.resolve(process.argv[2] || 'film');
const FPS = 25, POSTER = 1.5, LENGTH = 50;
fs.mkdirSync(OUT, { recursive: true });
await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'warn' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(server.resolvedUrls.local[0]);
await page.waitForSelector('#cine .roll');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const wav = path.join(OUT, 'score.wav');
fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => window.UNDERFOOT.renderScoreWav(56)), 'base64'));
const mp4 = path.join(OUT, 'underfoot-opening.mp4');
// The score is scheduled 0.05 s after the film starts, which is POSTER s in.
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-itsoffset', String(POSTER), '-i', wav,
  '-map', '0:v', '-map', '1:a', '-vf', 'scale=780:-2:flags=neighbor', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22',
  '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
const write = (buf) => new Promise((ok) => (ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok)));

// The poster, held for a moment.
const poster = await page.screenshot({ type: 'jpeg', quality: 92 });
for (let i = 0; i < POSTER * FPS; i++) await write(poster);
// The film, one exact step per frame. Stills at the big beats, for review.
const beats = { 5: 'sky', 13.52: 'beam', 16.6: 'crash', 20.8: 'wings', 26.52: 'locals', 32.92: 'spider', 37.32: 'sneaker', 42: 'dig', 47.52: 'title' };
for (let f = 0; f < LENGTH * FPS; f++) {
  await page.evaluate((dt) => window.UNDERFOOT.filmStep(dt), f ? 1 / FPS : 0);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  await write(buf);
  const t = f / FPS, b = Object.keys(beats).find((k) => Math.abs(+k - t) < 0.6 / FPS);
  if (b) fs.writeFileSync(path.join(OUT, `beat-${String(b).padStart(4, '0')}-${beats[b]}.jpg`), buf);
}
ff.stdin.end();
await new Promise((ok) => ff.on('close', ok));
console.log('film', mp4);
console.log('errors', errors);
await browser.close();
server.httpServer.close();
