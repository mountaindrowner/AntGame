// Underfoot: boot, shared app state, fixed-step simulation and the render loop.
import * as THREE from 'three';
import SIM from './sim/sim.js';
import { PS1Pipeline } from './render/ps1/pipeline.js';
import { useSnapUniforms } from './render/ps1/materials.js';
import { SurfaceView } from './render/views/surfaceView.js';
import { NestView } from './render/views/nestView.js';
import { createUI } from './ui/ui.js';
import { Callout } from './ui/callout.js';
import { TitleMenu, loadOptions } from './ui/title.js';
import { sfx } from './audio/sfx.js';
import { soundWatch, tapSounds } from './audio/watch.js';
import { music } from './audio/music.js';
import { LabelLayer } from './ui/labels.js';
import { attachPointer } from './input/pointer.js';
import { loadGame, saveGame, clearSave, saveMap, loadMap, NEW_GAME_SEED } from './game/save.js';
import { Cinematic, renderScoreWav } from './intro/cinematic.js';
import { uiScale } from './config.js';
import { GROUND_TINT } from './render/views/yardScenery.js';
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
  opts: loadOptions(),
  reset() {
    clearSave();
    this.mapFresh = true; // a new colony starts with an empty map
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
app.callout = new Callout(app, views);
attachPointer(canvas, app, ui, views);
const labels = new LabelLayer(document.getElementById('labels'));

// The opening film plays once for a new colony, and again from Help.
let cine = null;
// The yard map is a photo from straight above, pieced together a region at
// a time: each region is photographed (real scenery, no creatures) the first
// time it is built near you, at MAP_K px a tile. Regions not photographed
// yet show their ground's colour (you won't have seen them anyway).
const MAP_K = 2;
const photoQ = [];
let mapFor = null;
function mapCanvas() {
  const s = app.s, w = s.world;
  if (mapFor !== w) {
    mapFor = w; photoQ.length = 0;
    const c = (app.mapCanvas = document.createElement('canvas'));
    c.width = w.W * MAP_K; c.height = w.H * MAP_K;
    const g = c.getContext('2d');
    g.fillStyle = '#2e4a1c'; g.fillRect(0, 0, c.width, c.height);
    SIM.AREAS.forEach((A, i) => { const b = SIM.areaBounds(i); g.fillStyle = GROUND_TINT[A.ground] || GROUND_TINT.grass; g.fillRect(b.x0 * MAP_K, b.y0 * MAP_K, SIM.AREA * MAP_K, SIM.AREA * MAP_K); });
    app.mapDone = new Set();
    // Photos from earlier sessions of this colony.
    const m = loadMap();
    if (m && !app.mapFresh) {
      const img = new Image();
      // Only regions not photographed again already this session.
      img.onload = () => {
        if (mapFor !== w) return;
        const k = img.width / c.width;
        for (const i of m.done) {
          if (app.mapDone.has(i)) continue;
          const b = SIM.areaBounds(i), x = b.x0 * MAP_K, y = b.y0 * MAP_K, n = SIM.AREA * MAP_K;
          g.drawImage(img, x * k, y * k, n * k, n * k, x, y, n, n);
          app.mapDone.add(i);
        }
      };
      img.src = m.img;
    }
    app.mapFresh = false;
  }
  return app.mapCanvas;
}
// Saved with the game, when a new photo has come in since last time.
let mapSaved = 0;
function saveMapIfNew() { if (app.mapDone && app.mapDone.size !== mapSaved) { mapSaved = app.mapDone.size; saveMap(app.mapCanvas, app.mapDone); } }
views.surface.onRegionLoaded = (i) => { mapCanvas(); if (!app.mapDone.has(i) && !photoQ.includes(i)) photoQ.push(i); };

// Only a region still built near you is photographed (one that's been thrown
// away again is queued afresh when it's next built).
const built = (i) => { const R = views.surface.scenery && views.surface.scenery.regions[i]; return !!(R && R.near); };

// Render part of the yard (tiles) from straight above into a canvas px wide.
// Rain, creatures, scent and the PS1 vertex snapping are switched off for it,
// and the fog pushed out of reach (switching it off would make every
// material compile again). The targets and the copy pass are kept.
const shot = { px: 0, ph: 0 };
function photo(x0, y0, tw, th, px, done) {
  const sv = views.surface, T = SIM.T, ph = Math.round((px * th) / tw), r = pipeline.renderer;
  if (shot.px !== px || shot.ph !== ph) {
    if (shot.rtA) { shot.rtA.dispose(); shot.rtB.dispose(); }
    Object.assign(shot, { px, ph, rtA: new THREE.WebGLRenderTarget(px, ph, { type: THREE.HalfFloatType, depthBuffer: true }), rtB: new THREE.WebGLRenderTarget(px, ph), buf: new Uint8Array(px * ph * 4) });
    if (!shot.quad) {
      // Linear to sRGB into an 8-bit target we can read back.
      shot.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        uniforms: { t: { value: null } }, depthTest: false, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c = clamp(texture2D(t, vUv).rgb, 0.0, 1.0); gl_FragColor = vec4(mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c)), 1.0); }',
      }));
      shot.qs = new THREE.Scene(); shot.qs.add(shot.quad);
      shot.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    shot.quad.material.uniforms.t.value = shot.rtA.texture;
  }
  const cx = (x0 + tw / 2) * T, cz = (y0 + th / 2) * T;
  const cam = new THREE.OrthographicCamera((-tw * T) / 2, (tw * T) / 2, (th * T) / 2, (-th * T) / 2, 1, 8000);
  cam.position.set(cx, 4000, cz); cam.up.set(0, 0, -1); cam.lookAt(cx, 0, cz);
  const fog = sv.scene.fog, near = fog.near, far = fog.far, rain = sv.rain.visible, dyn = sv.dyn.visible, scent = sv.scent && sv.scent.visible, snap = pipeline.uniforms.uSnap.value.clone();
  fog.near = 1e8; fog.far = 1e9; sv.rain.visible = false; sv.dyn.visible = false; if (sv.scent) sv.scent.visible = false; pipeline.uniforms.uSnap.value.set(1e5, 1e5);
  r.setRenderTarget(shot.rtA); r.render(sv.scene, cam);
  r.setRenderTarget(shot.rtB); r.render(shot.qs, shot.qcam);
  r.setRenderTarget(null);
  fog.near = near; fog.far = far; sv.rain.visible = rain; sv.dyn.visible = dyn; if (sv.scent) sv.scent.visible = scent; pipeline.uniforms.uSnap.value.copy(snap);
  const toCanvas = () => {
    // GL rows run bottom-up.
    const c = document.createElement('canvas'); c.width = px; c.height = ph;
    const g = c.getContext('2d'), img = g.createImageData(px, ph), buf = shot.buf;
    for (let y = 0; y < ph; y++) img.data.set(buf.subarray((ph - 1 - y) * px * 4, (ph - y) * px * 4), y * px * 4);
    g.putImageData(img, 0, 0);
    return c;
  };
  // Read back without stalling the frame when we can wait for it; one at a time.
  if (done) { shot.busy = true; r.readRenderTargetPixelsAsync(shot.rtB, 0, 0, px, ph, shot.buf).then(() => { shot.busy = false; done(toCanvas()); }, () => { shot.busy = false; }); return null; }
  r.readRenderTargetPixels(shot.rtB, 0, 0, px, ph, shot.buf);
  return toCanvas();
}
// Photograph region i into the map: now (sync), or read back in the
// background and pasted in when it arrives.
app.photoRegion = (i, sync = true) => {
  const b = SIM.areaBounds(i), c = mapCanvas(), w = app.s.world;
  const paste = (img) => { if (mapFor !== w) return; c.getContext('2d').drawImage(img, b.x0 * MAP_K, b.y0 * MAP_K); app.mapDone.add(i); };
  const img = photo(b.x0, b.y0, SIM.AREA, SIM.AREA, SIM.AREA * MAP_K, sync ? null : paste);
  if (img) paste(img);
};
// The map as it stands, with any waiting photos taken first.
app.snapshotMap = () => {
  const c = mapCanvas();
  while (photoQ.length) { const i = photoQ.shift(); if (built(i)) app.photoRegion(i); }
  return c;
};

app.playFilm = () => {
  if (cine) return;
  ui.closeMenu();
  title.close();
  cine = new Cinematic(pipeline, views.surface, app, () => { cine = null; app.s.seen.film = true; last = performance.now(); title.open(); });
  cine.start();
};

// The title screen and main menu (ui/title.js), over the live yard.
const title = new TitleMenu(app, {
  help: () => ui.openHelp(),
  film: () => app.playFilm(),
  applyOptions,
});
app.openTitle = () => title.open();
// Graphics: Auto starts sharp and may step down; Sharp and Fast are fixed.
function applyOptions() {
  pipeline.setQuality(app.opts.graphics === 'fast' ? 2 : 0);
  sfx.setOn(app.opts.sound !== false);
  const V = { off: 0, quiet: 0.45, loud: 1 };
  sfx.setVolumes(V[app.opts.fx] ?? 1, V[app.opts.music] ?? 0.45);
}
// Game sounds (audio/): what changed each frame, and button taps.
const hear = soundWatch(app, views);
tapSounds();

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
  let newEvents = [];
  const evSeen = s.events.length;
  if (!app.paused) {
    acc += dt;
    while (acc >= STEP) { snapshot(s); SIM.tick(s, STEP); acc -= STEP; }
    // New sim events this frame (before the HUD's explainers take them).
    newEvents = s.events.slice(evSeen);
    clock += dt;
  } else acc = 0;
  if (s.player.inNest !== wasInNest) {
    wasInNest = s.player.inNest;
    app.view = wasInNest ? 'nest' : 'surface';
    app.panY = 0;
  }

  // Behind the title screen: a slow drift over the yard round home.
  if (app.titleOpen) {
    const w = s.world, k = performance.now() / 1000;
    app.surfaceFocus = { x: (w.ex + 0.5 + Math.sin(k * 0.05) * 60) * SIM.T, y: (w.ey + 0.5 + Math.sin(k * 0.037) * 40) * SIM.T };
  }
  const view = app.view === 'nest' && !app.titleOpen ? views.nest : views.surface;
  // Draw creatures part way between the last two sim steps, then put them back.
  const restore = blend(s, app.paused ? 1 : acc / STEP);
  view.update(app, clock, pipeline.aspect);
  pipeline.render(view.scene, view.camera);
  restore();
  if (!app.titleOpen) hear(s, newEvents);
  else hear.quiet();
  // The music follows the game: the title, the yard or the nest, tension, rain.
  music.set(app.titleOpen ? 'title' : app.view === 'nest' ? 'nest' : 'yard', app.titleOpen ? 0 : hear.mood(s), s.rain.on && !app.titleOpen);
  // One map photo a frame, for regions just built.
  if (photoQ.length && view === views.surface && !shot.busy) { const i = photoQ.shift(); if (built(i)) app.photoRegion(i, false); }
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
    slow = app.paused || app.opts.graphics !== 'auto' ? 0 : app.fps < 40 ? slow + 1 : 0;
    if (slow >= 3) { slow = 0; pipeline.setQuality(pipeline.quality + 1); }
  }
  hudT += dt;
  if (hudT > 0.2) { hudT = 0; ui.checkExplainers(); ui.update(); measureHud(); }
  saveT += dt;
  if (saveT > 10) { saveT = 0; saveGame(app.s); saveMapIfNew(); }
  requestAnimationFrame(frame);
}

window.addEventListener('pagehide', () => { saveGame(app.s); saveMapIfNew(); });
ui.update();
measureHud();
applyOptions();
// A first run opens with the film (then the menu); later runs on the menu.
if (app.s.phase === 'dig' && !app.s.seen.film) app.playFilm();
else title.open();
requestAnimationFrame(frame);

// For automated tests and debugging in the console.
// filmStep(dt) advances the opening film by exactly dt and draws it, for recording.
const filmStep = (dt) => { if (!cine) return false; clock += dt; views.surface.update(app, clock, pipeline.aspect); cine.step(dt); if (cine) cine.render(); return !!cine; };
window.UNDERFOOT = { app, SIM, views, pipeline, ui, sfx, renderScoreWav, filmStep };
