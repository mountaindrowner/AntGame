// Build 20's asset pass: write every model as a standalone binary glTF
// (game/assets/models/<group>-<name>.glb), opened in Blender or any viewer.
// It builds the gallery page and asks it for each model, in headless Chromium.
//   node scripts/export-models.mjs
import { build, preview } from 'vite';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = path.resolve('assets/models');
fs.mkdirSync(OUT, { recursive: true });
await build({ configFile: 'vite.gallery.config.js', logLevel: 'warn' });
const server = await preview({ configFile: 'vite.gallery.config.js', preview: { port: 0, host: '127.0.0.1' }, logLevel: 'warn' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(server.resolvedUrls.local[0] + 'gallery.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.MODELS && window.exportGLB, null, { timeout: 120000 });
const list = await page.evaluate(() => window.MODELS);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const index = [];
for (let i = 0; i < list.length; i++) {
  const b64 = await page.evaluate((i) => window.exportGLB(i), i);
  const file = `${slug(list[i].group)}-${slug(list[i].name)}.glb`;
  fs.writeFileSync(path.join(OUT, file), Buffer.from(b64, 'base64'));
  index.push(`| ${list[i].group} | ${list[i].name} | \`${file}\` |`);
}
fs.writeFileSync(path.join(OUT, 'README.md'), `# Underfoot models\n\nEvery model in the game as a standalone binary glTF (\`.glb\`), written by \`node scripts/export-models.mjs\` from the code that makes them (\`src/render/models/\`). Open them in Blender (File → Import → glTF) or any glTF viewer. Colours are vertex colours (\`COLOR_0\`). See them all turning in the gallery: \`npm run gallery\`.\n\n| Group | Model | File |\n|---|---|---|\n${index.join('\n')}\n`);
console.log('wrote', list.length, 'models', errors.length ? 'errors: ' + errors.join('; ') : '');
await browser.close(); server.httpServer.close();
