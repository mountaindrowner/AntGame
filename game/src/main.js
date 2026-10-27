// Underfoot: boot, shared app state, fixed-step simulation and the render loop.
import * as THREE from 'three';
import SIM from './sim/sim.js';
import { PS1Pipeline } from './render/ps1/pipeline.js';
import { useSnapUniforms } from './render/ps1/materials.js';
import { SurfaceView } from './render/views/surfaceView.js';
import { NestView } from './render/views/nestView.js';
import { createUI } from './ui/ui.js';
import { LabelLayer } from './ui/labels.js';
import { attachPointer } from './input/pointer.js';
import { loadGame, saveGame, clearSave, NEW_GAME_SEED } from './game/save.js';
import { Cinematic, renderScoreWav } from './intro/cinematic.js';
import { uiScale } from './config.js';
import './ui/ui.css';

const { NW, NH } = SIM;
const STEP = 0.05; // the sim's fixed tick (20 Hz)

const canvas = document.getElementById('c');
const pipeline = new PS1Pipeline(canvas);
useSnapUniforms(pipeline.uniforms);

const s0 = loadGame();
// Everything the UI, input and views share.
const app = {
  s: s0,
  view: s0.phase === 'dig' || s0.player.inNest ? 'nest' : 'surface',
  placing: null,
  menu: null,
  menuCell: null,
  paused: false,
  zoomMul: 1,
  panY: 0,
  fps: 0,
  confirmAction: null,
  insets: { top: 0, bottom: 0, h: 1 },
  reset() {
    clearSave();
    this.s = SIM.create(NEW_GAME_SEED);
    this.s.seen.film = true; // the film plays once per player, not on every reset
    this.placing = null;
    this.view = 'nest';
    this.panY = 0;
    ui.closeMenu();
  },
  // Cells where a w×h room fits (green highlight), and whether any do.
  placeCells(w, h) {
    const set = new Set(), s = this.s;
    for (let y = 1; y < NH; y++) for (let x = 1; x < NW - 1; x++) {
      if (s.nest.cells[y * NW + x] !== 1) continue;
      if (SIM.findRoomRect(s, x, y, w, h)) set.add(y * NW + x);
    }
    return set;
  },
  anyFit(w, h) { return this.placeCells(w, h).size > 0; },
};

const views = { surface: new SurfaceView(), nest: new NestView() };
const ui = createUI(app);
attachPointer(canvas, app, ui, views);
const labels = new LabelLayer(document.getElementById('labels'));

// The opening film plays once for a new colony, and again from Help.
let cine = null;
// A photo of the whole yard from straight above, for the map: the real
// scenery and whoever is out, drawn once each time the map opens. Returns a
// canvas `px` wide. Fog and the PS1 vertex snapping are switched off for it.
app.snapshotMap = (px = 1600) => {
  const sv = views.surface, s = app.s, T = SIM.T, gw = s.world.W * T, gh = s.world.H * T;
  if (sv.state !== s) sv.update(app, clock, pipeline.aspect);
  const ph = Math.round((px * gh) / gw), r = pipeline.renderer;
  const rtA = new THREE.WebGLRenderTarget(px, ph, { type: THREE.HalfFloatType, depthBuffer: true });
  const rtB = new THREE.WebGLRenderTarget(px, ph);
  const cam = new THREE.OrthographicCamera(-gw / 2, gw / 2, gh / 2, -gh / 2, 1, 8000);
  cam.position.set(gw / 2, 4000, gh / 2); cam.up.set(0, 0, -1); cam.lookAt(gw / 2, 0, gh / 2);
  const fog = sv.scene.fog, rain = sv.rain.visible, snap = pipeline.uniforms.uSnap.value.clone();
  sv.scene.fog = null; sv.rain.visible = false; pipeline.uniforms.uSnap.value.set(1e5, 1e5);
  r.setRenderTarget(rtA); r.render(sv.scene, cam);
  // Linear to sRGB into an 8-bit target we can read back.
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { t: { value: rtA.texture } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c = clamp(texture2D(t, vUv).rgb, 0.0, 1.0); gl_FragColor = vec4(mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c)), 1.0); }',
  }));
  const qs = new THREE.Scene(); qs.add(quad);
  r.setRenderTarget(rtB); r.render(qs, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  const buf = new Uint8Array(px * ph * 4);
  r.readRenderTargetPixels(rtB, 0, 0, px, ph, buf);
  r.setRenderTarget(null);
  sv.scene.fog = fog; sv.rain.visible = rain; pipeline.uniforms.uSnap.value.copy(snap);
  rtA.dispose(); rtB.dispose(); quad.geometry.dispose(); quad.material.dispose();
  // GL rows run bottom-up.
  const c = document.createElement('canvas'); c.width = px; c.height = ph;
  const g = c.getContext('2d'), img = g.createImageData(px, ph);
  for (let y = 0; y < ph; y++) img.data.set(buf.subarray((ph - 1 - y) * px * 4, (ph - y) * px * 4), y * px * 4);
  g.putImageData(img, 0, 0);
  return c;
};

app.playFilm = () => {
  if (cine) return;
  ui.closeMenu();
  cine = new Cinematic(pipeline, views.surface, app, () => { cine = null; app.s.seen.film = true; last = performance.now(); });
};

let cssW = 0, cssH = 0;
// How much of the screen the HUD covers, so cameras can centre in the rest.
const hudTop = document.getElementById('top');
const bars = [document.getElementById('bar'), document.getElementById('barn')];
function measureHud() {
  const top = hudTop.getBoundingClientRect().bottom;
  const bar = bars.find((b) => !b.classList.contains('hidden'));
  const bottom = bar ? cssH - bar.getBoundingClientRect().top : 0;
  app.insets = { top: Math.min(top, cssH * 0.4), bottom: Math.min(bottom, cssH * 0.3), h: cssH };
}
function resize() {
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  // Big screens get a bigger HUD (ui.css reads --ui).
  document.documentElement.style.setProperty('--ui', uiScale(cssW, cssH).toFixed(3));
  pipeline.resize(cssW, cssH);
}
window.addEventListener('resize', resize);
resize();

// The sim steps at 20 Hz but the screen draws at 60 or more. Each creature
// remembers where it was before the last step, and is drawn that fraction of
// the way to where it is now, so motion is smooth at any frame rate. A jump
// of more than two tiles (into or out of the nest) is drawn as a jump.
function snapshot(s) {
  for (const a of s.ants) { a.x0 = a.x; a.y0 = a.y; a.nx0 = a.nx; a.ny0 = a.ny; }
  for (const c of [s.spider, s.cat]) if (c) { c.x0 = c.x; c.y0 = c.y; }
}
function blend(s, k) {
  const saved = [];
  const mix = (o, kx, ky, kx0, ky0, far) => {
    const x0 = o[kx0], y0 = o[ky0];
    if (x0 == null || Math.abs(o[kx] - x0) + Math.abs(o[ky] - y0) > far) return;
    saved.push([o, kx, ky, o[kx], o[ky]]);
    o[kx] = x0 + (o[kx] - x0) * k; o[ky] = y0 + (o[ky] - y0) * k;
  };
  if (k < 1) {
    for (const a of s.ants) { mix(a, 'x', 'y', 'x0', 'y0', 2 * SIM.T); mix(a, 'nx', 'ny', 'nx0', 'ny0', 2); }
    for (const c of [s.spider, s.cat]) if (c) mix(c, 'x', 'y', 'x0', 'y0', 2 * SIM.T);
  }
  return () => { for (const [o, kx, ky, x, y] of saved) { o[kx] = x; o[ky] = y; } };
}

let slow = 0;
let last = performance.now(), acc = 0, hudT = 0, saveT = 0, frames = 0, fpsT = 0, clock = 0;
let wasInNest = app.s.player.inNest;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  const s = app.s;
  if (cine) {
    // While recording (filmStep), the recorder draws every frame itself.
    if (!cine.manual) {
      clock += dt;
      views.surface.update(app, clock, pipeline.aspect);
      cine.update(dt);
      if (cine) cine.render();
    }
    labels.set([]);
    requestAnimationFrame(frame);
    return;
  }
  if (!app.paused) {
    acc += dt;
    while (acc >= STEP) { snapshot(s); SIM.tick(s, STEP); acc -= STEP; }
    clock += dt;
  } else acc = 0;
  if (s.player.inNest !== wasInNest) {
    wasInNest = s.player.inNest;
    app.view = wasInNest ? 'nest' : 'surface';
    app.panY = 0;
  }

  const view = app.view === 'nest' ? views.nest : views.surface;
  // Draw creatures part way between the last two sim steps, then put them back.
  const restore = blend(s, app.paused ? 1 : acc / STEP);
  view.update(app, clock, pipeline.aspect);
  pipeline.render(view.scene, view.camera);
  restore();
  if (app.view === 'nest') {
    labels.set(views.nest.labels.map((l) => {
      const p = views.nest.project(l.x, l.y, l.z, cssW, cssH);
      return { text: l.text, x: l.kind === 'band' ? Math.max(8, p.x) : p.x, y: p.y, kind: l.kind };
    }));
  } else labels.set([]);

  frames++;
  fpsT += dt;
  if (fpsT >= 1) {
    app.fps = frames; frames = 0; fpsT = 0;
    // Three slow seconds in a row: drop a quality step (never back up, so it
    // doesn't flicker between steps). Skipped while the game is paused.
    slow = app.paused ? 0 : app.fps < 40 ? slow + 1 : 0;
    if (slow >= 3) { slow = 0; pipeline.setQuality(pipeline.quality + 1); }
  }
  hudT += dt;
  if (hudT > 0.2) { hudT = 0; ui.checkExplainers(); ui.update(); measureHud(); }
  saveT += dt;
  if (saveT > 10) { saveT = 0; saveGame(app.s); }
  requestAnimationFrame(frame);
}

window.addEventListener('pagehide', () => saveGame(app.s));
ui.update();
measureHud();
if (app.s.phase === 'dig' && !app.s.seen.film) app.playFilm();
requestAnimationFrame(frame);

// For automated tests and debugging in the console.
// filmStep(dt) advances the opening film by exactly dt and draws it, for recording.
const filmStep = (dt) => { if (!cine) return false; clock += dt; views.surface.update(app, clock, pipeline.aspect); cine.step(dt); if (cine) cine.render(); return !!cine; };
window.UNDERFOOT = { app, SIM, views, pipeline, ui, renderScoreWav, filmStep };
