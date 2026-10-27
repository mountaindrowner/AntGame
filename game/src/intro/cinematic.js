// The opening film: a campy 1950s alien-invasion short, shot in the game's
// own engine over the real yard. It borrows the surface view's scene (yard,
// spider, items), adds its own actors and camera, and plays a scripted
// timeline of shots, title cards and sound. Skippable at any point.
import * as THREE from 'three';
import { antGeometry, FOOT, WALK_FRAMES } from '../render/models/creatures.js';
import { SPIDER_FOOT } from '../render/models/bugs.js';
import { FOOD } from '../render/models/food.js';
import { psx, psxBasic } from '../render/ps1/materials.js';
import { COLORS, ANT_SCALE } from '../config.js';
import { FilmSound } from './sound.js';
import { sneaker } from '../render/models/sneaker.js';
import { SCALE, REGION, areaBounds } from '../sim/yard.js';

const T = 16;
// Anchors in the yard (sim/yard.js design units from the Patio's corner, at
// its SCALE); the shots are placed relative to them.
const O = areaBounds(REGION.patio);
const UX = (v) => (v * SCALE + O.x0 + 0.5) * T, UZ = (v) => (v * SCALE + O.y0 + 0.5) * T;
const L = new THREE.Vector3(UX(60), 0, UZ(60));                 // where the queen lands and digs: the nest's entrance tile
const WEB = new THREE.Vector3(UX(60), 0, UZ(17) + 2 * SCALE * T); // the spider, below its web
const HOLE = new THREE.Vector3(UX(17), 0, UZ(17));              // the pavement ants' crack in the patio
const STOMP = L.clone().add(new THREE.Vector3(37, 0, 114));  // where the sneaker comes down, just short of her
const END = 60;                                  // the title waits for a tap until here

const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, u) => a + (b - a) * u;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Shots: camera position and look-at target, eased from the first pair to the second.
const SHOTS = [
  { t0: 0, t1: 11, from: [V(L.x, 30, L.z + 332), V(L.x, 230, L.z - 368)], to: [V(L.x + 22, 36, L.z + 292), V(L.x + 12, 300, L.z - 268)] },
  { t0: 11, t1: 18, from: [V(L.x + 236, 90, L.z + 218), V(L.x - 64, 140, L.z - 72)], to: [V(L.x + 166, 55, L.z + 148), V(L.x, 16, L.z)] },
  { t0: 18, t1: 24, from: [V(L.x + 70, 22, L.z + 60), V(L.x, 10, L.z)], to: [V(L.x + 55, 18, L.z + 45), V(L.x, 9, L.z)] },
  { t0: 24, t1: 29, from: [V(HOLE.x, 38, HOLE.z + 250), V(HOLE.x, 8, HOLE.z + 20)], to: [V(HOLE.x, 30, HOLE.z + 200), V(HOLE.x, 7, HOLE.z + 20)] },
  { t0: 29, t1: 34, from: [V(WEB.x, 55, WEB.z + 168), V(WEB.x, 28, WEB.z)], to: [V(WEB.x, 40, WEB.z + 106), V(WEB.x, 30, WEB.z)] },
  { t0: 34, t1: 40, from: [V(L.x + 2, 380, L.z + 692), V(L.x + 37, 0, L.z + 42)], to: [V(L.x + 2, 340, L.z + 642), V(L.x + 42, 0, L.z + 37)] },
  { t0: 40, t1: 44, from: [V(L.x, 70, L.z + 98), V(L.x, 4, L.z)], to: [V(L.x, 52, L.z + 68), V(L.x, 2, L.z)] },
  { t0: 44, t1: END, from: [V(L.x, 200, L.z + 368), V(L.x, 0, L.z - 32)], to: [V(L.x, 520, L.z + 628), V(L.x, 0, L.z - 72)] },
];

// Title cards: when, what, how long.
const CARDS = [
  { t: 0.4, text: 'From beyond the picket fence…', dur: 2.5, kind: 'card' },
  { t: 4.4, text: 'They came from the sky!', dur: 3.2 },
  { t: 16.5, text: '…one of them landed. Sort of.', dur: 1.5 },
  { t: 21.0, text: 'She had no wings. No home.', dur: 1.6 },
  { t: 22.6, text: 'And one good idea.', dur: 1.4 },
  { t: 26.2, text: 'The locals were not impressed.', dur: 2.6 },
  { t: 32.0, text: 'Something hungry noticed.', dur: 2.0 },
  { t: 37.5, text: 'And something enormous didn’t notice at all.', dur: 2.4 },
  { t: 40.5, text: 'So she did what any sensible queen would do…', dur: 3.3 },
];

function makeAnt(plan, color, scale) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(antGeometry(plan, -1), psx({ vertexColors: true, color }));
  body.position.y = FOOT;
  g.add(body);
  g.scale.setScalar(scale);
  return { group: g, body };
}

function makeQueen(scale) {
  const q = makeAnt('queen', COLORS.queen, scale);
  const wingGeo = new THREE.SphereGeometry(1, 8, 4).scale(4.8, 0.08, 1.7);
  const wingMat = psx({ color: '#e6f2ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  q.wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.4, FOOT + 1.4, side * 0.5);
    const w = new THREE.Mesh(wingGeo, wingMat);
    w.position.set(-4.2, 0, side * 1.5);
    pivot.add(w);
    q.group.add(pivot);
    return { pivot, side, free: false, v: new THREE.Vector3(), spin: 0 };
  });
  return q;
}

// The score and the sound gags, all scheduled up front from time z.
export function scoreFilm(S, z) {
  // The saucers are heard before they're seen; the theremin joins under the first card.
  S.ufo(z + 0.2, 11);
  S.theremin(z + 1.0, [440, 523, 494, 392, 415, 330, 349, 440, 523, 622, 587, 440, 494], 1.05);
  // The beat: it stops dead for the spider and for the stomp, then picks back up.
  S.groove(z + 0.4, z + 29);
  S.scratch(z + 29);
  S.groove(z + 34, z + 36.4);
  S.groove(z + 38.2, z + 56);
  S.slideWhistle(z + 14.9);
  S.noiseHit(z + 16.2, 0.5, 900, 0.6);
  S.boing(z + 16.3);
  S.pop(z + 20.5); S.pop(z + 20.62);
  for (let i = 0; i < 5; i++) S.pop(z + 25.6 + i * 0.03);
  for (let i = 0; i < 4; i++) S.pop(z + 27.4 + i * 0.03);
  S.pop(z + 27.85);
  S.ominous(z + 29.2, 4.6);
  S.theremin(z + 32.4, [233, 220, 208], 0.7, 0.12);
  S.stomp(z + 37.2);
  for (let i = 0; i < 22; i++) S.noiseHit(z + 40.6 + i * 0.13, 0.08, 2500, 0.25, 'bandpass');
  S.stinger(z + 44.0);
}

// Renders the score offline to a 16-bit WAV, base64 (for recording the film).
export async function renderScoreWav(seconds = 56) {
  const rate = 44100, ctx = new OfflineAudioContext(1, rate * seconds, rate);
  scoreFilm(new FilmSound(ctx), 0.05);
  const data = (await ctx.startRendering()).getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + data.length * 2));
  const str = (o, t) => { for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true);
  out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 32767, true);
  let bin = '';
  const bytes = new Uint8Array(out.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export class Cinematic {
  constructor(pipeline, surface, app, onDone) {
    this.pipeline = pipeline;
    this.surface = surface;
    this.app = app;
    this.onDone = onDone;
    this.t = 0;
    this.started = false;
    this.done = false;
    this.camera = new THREE.PerspectiveCamera(50, 1, 2, 9000);
    this.cards = CARDS;
    this.shake = 0;
    this._build();
    this._dom();
  }

  // ---------- set dressing ----------
  _build() {
    const sc = this.surface.scene;
    this.group = new THREE.Group();
    sc.add(this.group);

    // A dusk sky dome with a few early stars.
    const sky = new THREE.SphereGeometry(4000, 24, 12);
    const top = new THREE.Color('#2a1a4a'), mid = new THREE.Color('#a2507a'), low = new THREE.Color('#f29a52');
    const cols = [];
    const p = sky.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i) / 4000;
      const c = h > 0.25 ? mid.clone().lerp(top, Math.min(1, (h - 0.25) / 0.55)) : low.clone().lerp(mid, Math.max(0, h / 0.25));
      cols.push(c.r, c.g, c.b);
    }
    sky.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.sky = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -10;
    const star = [];
    for (let i = 0; i < 160; i++) { const a = Math.random() * Math.PI * 2, e = 0.45 + Math.random() * 0.5; star.push(Math.cos(a) * Math.cos(e) * 3800, Math.sin(e) * 3800, Math.sin(a) * Math.cos(e) * 3800); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(star, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff6dc', size: 2, sizeAttenuation: false, fog: false }));
    this.group.add(this.sky, this.stars);

    // The fleet of winged queens, and the one who lands.
    this.fleet = Array.from({ length: 7 }, (_, i) => { const q = makeQueen(3.6); q.i = i; this.group.add(q.group); return q; });
    this.hero = this.fleet[0];
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(30, 1, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    this.group.add(this.beam);

    // The locals.
    this.locals = Array.from({ length: 5 }, (_, i) => {
      const a = makeAnt('worker', COLORS.rivalAnt, ANT_SCALE.surface * 1.3);
      a.group.position.set(HOLE.x - 36 + i * 18, 0, HOLE.z + 20);
      this.group.add(a.group);
      return a;
    });

    // The sneaker and its shadow.
    this.shoe = sneaker();
    this.shoe.scale.setScalar(0.5);
    this.shoe.position.copy(STOMP).setY(2000);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), psxBasic({ color: '#000000', transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    this.shadow.position.copy(STOMP).setY(1);
    this.shadow.renderOrder = 4;
    this.group.add(this.shoe, this.shadow);

    // Eye glints for the spider.
    this.glints = [-1, 1].map(() => { const m = new THREE.Mesh(FOOD.star, psxBasic({ vertexColors: true, transparent: true, depthWrite: false })); m.visible = false; this.group.add(m); return m; });

    // The hole she digs.
    this.hole = new THREE.Mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), psxBasic({ color: '#120a05', polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    this.hole.position.copy(L).setY(1.2);
    this.hole.scale.setScalar(0.01);
    this.hole.renderOrder = 4;
    this.group.add(this.hole);

    // Particles: dust puffs and flying dirt.
    this.parts = [];
    this.dustGeo = new THREE.SphereGeometry(1, 6, 4);
    this.dirtGeo = new THREE.BoxGeometry(1, 1, 1);

    // Dusk light; restored when the film ends.
    const s = this.surface;
    this.saved = { hemi: s.hemi.color.clone(), ground: s.hemi.groundColor.clone(), sun: s.sun.color.clone() };
    s.hemi.color.set('#ffc69a'); s.hemi.groundColor.set('#4a3050'); s.sun.color.set('#ffb070');
  }

  _dom() {
    const el = document.createElement('div');
    el.id = 'cine';
    el.innerHTML = `
      <div class="grain"></div><div class="vignette"></div>
      <div class="bar top"></div><div class="bar bottom"></div>
      <div class="caption" aria-live="polite"></div>
      <div class="title hidden"><div class="big">Underfoot!</div><div class="sub">One queen. One rock. One very big yard.</div><button class="go">Tap to dig</button></div>
      <div class="poster"><div class="presents">A motion picture from beneath your feet</div><button class="roll">Roll the film</button><div class="hint">Sound on for the full effect</div></div>
      <div class="controls"><button class="mute">Sound: on</button><button class="skip">Skip</button></div>`;
    document.body.appendChild(el);
    document.body.classList.add('cine-on');
    this.el = el;
    this.caption = el.querySelector('.caption');
    el.querySelector('.roll').addEventListener('click', () => this.start());
    el.querySelector('.skip').addEventListener('click', () => this.finish());
    el.querySelector('.go').addEventListener('click', () => this.finish());
    const mute = el.querySelector('.mute');
    mute.addEventListener('click', () => { this.muted = !this.muted; if (this.sound) this.sound.mute(this.muted); mute.textContent = this.muted ? 'Sound: off' : 'Sound: on'; });
  }

  // ---------- playback ----------
  start() {
    if (this.started) return;
    this.started = true;
    this.el.querySelector('.poster').classList.add('hidden');
    this.sound = new FilmSound();
    if (this.muted) this.sound.mute(true);
    scoreFilm(this.sound, this.sound.now + 0.05);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    if (this.sound) this.sound.stop();
    const s = this.surface;
    s.hemi.color.copy(this.saved.hemi); s.hemi.groundColor.copy(this.saved.ground); s.sun.color.copy(this.saved.sun);
    s.scene.remove(this.group);
    this.el.remove();
    document.body.classList.remove('cine-on');
    this.onDone();
  }

  // Title cards and the title are animated from the film's clock (not CSS
  // timers), so a recording made frame by frame matches what players see.
  _cards(t) {
    const cap = this.caption;
    const c = this.cards.filter((k) => t >= k.t && t < k.t + k.dur).pop();
    if (!c) { cap.style.opacity = 0; return; }
    if (cap.dataset.text !== c.text) { cap.dataset.text = c.text; cap.textContent = c.text; cap.className = 'caption ' + (c.kind || ''); }
    const k = t - c.t, slam = Math.min(1, k / 0.45);
    const back = 1 + 2.7 * Math.pow(slam - 1, 3) + 1.7 * Math.pow(slam - 1, 2); // ease-out with overshoot
    const scale = slam < 1 ? lerp(2.4, 1, back) : 1 + Math.sin((k - 0.45) * 4.5) * 0.02;
    const rot = slam < 1 ? lerp(-12, -3, back) : -3 + Math.sin((k - 0.45) * 4.5) * 1;
    cap.style.opacity = Math.min(1, slam * 2) * Math.min(1, (c.t + c.dur - t) / 0.15);
    cap.style.transform = `rotate(${rot}deg) scale(${scale})`;
  }

  _title(t) {
    const el = this.el.querySelector('.title');
    if (t < 44) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const k = t - 44, u = Math.min(1, k / 0.6), back = 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2);
    const big = el.querySelector('.big'), sub = el.querySelector('.sub'), go = el.querySelector('.go');
    big.style.opacity = Math.min(1, u * 2);
    big.style.transform = u < 1 ? `scale(${lerp(4, 1, back)}) rotate(${lerp(-20, -4, back)}deg)` : `scale(${1 + Math.sin((k - 0.6) * 5) * 0.03}) rotate(${-4 + Math.sin((k - 0.6) * 5) * 1.5}deg)`;
    sub.style.opacity = Math.max(0, Math.min(1, (k - 1.3) / 0.5));
    go.style.opacity = Math.max(0, Math.min(1, (k - 2.5) / 0.5));
    go.style.transform = `scale(${k > 3 ? 1 + Math.abs(Math.sin((k - 3) * 3.4)) * 0.07 : 1})`;
  }

  // Recording: start without sound and advance exactly dt per call.
  step(dt) {
    if (!this.started) { this.started = true; this.manual = true; this.el.querySelector('.poster').classList.add('hidden'); }
    this.t += dt;
    this._advance(dt);
  }

  _puff(pos, n, size, color, speed) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.dustGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
      const a = Math.random() * Math.PI * 2;
      m.position.copy(pos).add(V(Math.cos(a) * size * 0.3, 2, Math.sin(a) * size * 0.3));
      m.scale.setScalar(size * 0.2);
      this.group.add(m);
      this.parts.push({ m, v: V(Math.cos(a) * speed, speed * 0.25 + Math.random() * speed * 0.3, Math.sin(a) * speed), life: 1.2, grow: size * 0.6, g: 0 });
    }
  }

  _dirt(pos) {
    const m = new THREE.Mesh(this.dirtGeo, psx({ color: Math.random() < 0.5 ? '#6e4a2e' : '#8a6038' }));
    m.position.copy(pos).add(V((Math.random() - 0.5) * 8, 3, (Math.random() - 0.5) * 8));
    m.scale.setScalar(1.5 + Math.random() * 2.5);
    this.group.add(m);
    this.parts.push({ m, v: V((Math.random() - 0.5) * 80, 70 + Math.random() * 80, 40 + Math.random() * 60), life: 1.4, grow: 0, g: 260 });
  }

  update(dt) {
    if (this.manual) return; // a recording steps the film itself
    if (this.started && !this.done) this.t += dt;
    this._advance(dt);
  }

  _advance(dt) {
    const s = this.surface, t = this.t;
    if (this.t > END) { this.finish(); return; }
    // Keep the borrowed scene clear of distance fog and lit for dusk.
    s.scene.fog.near = 6000; s.scene.fog.far = 9000;
    s.hemi.intensity = 1.1; s.sun.intensity = 1.3;
    s.bars[0].group.visible = s.bars[1].group.visible = false;

    this._cards(t);
    this._title(t);

    this._fleet(t, dt);
    this._locals(t);
    this._spider(t);
    this._stomp(t, dt);
    this._dig(t, dt);

    // Particles.
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.grow) { p.m.scale.multiplyScalar(1 + dt * 1.2); p.m.material.opacity = Math.max(0, p.life * 0.55); }
      if (p.m.position.y < 0) { p.m.position.y = 0; p.v.set(0, 0, 0); }
      if (p.life <= 0) { this.group.remove(p.m); this.parts.splice(i, 1); }
    }

    // Camera: the current shot, eased, with shake on the big hits.
    const shot = SHOTS.find((k) => t >= k.t0 && t < k.t1) || SHOTS[SHOTS.length - 1];
    const u = ease((t - shot.t0) / (shot.t1 - shot.t0));
    const cam = this.camera;
    cam.position.lerpVectors(shot.from[0], shot.to[0], u);
    const target = shot.from[1].clone().lerp(shot.to[1], u);
    if (this.shake > 0) { this.shake -= dt; const k = this.shake * 30; cam.position.add(V((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, 0)); }
    cam.lookAt(target);
    cam.aspect = this.pipeline.aspect;
    cam.updateProjectionMatrix();
    this.sky.position.copy(cam.position);
    this.stars.position.copy(cam.position);
  }

  // The fleet crosses the sky; the hero breaks off, rides a beam down and crashes.
  _fleet(t, dt) {
    const crash = 16.2;
    this.fleet.forEach((q, i) => {
      const g = q.group;
      const flying = t < crash || (i > 0 && t < 18);
      g.visible = i === 0 ? t < 24 || (t >= 34 && t < 44) : t < 11;
      for (const w of q.wings) if (!w.free) w.pivot.rotation.x = w.side * (flying ? 0.35 + Math.sin(t * 38 + i) * 0.7 : 0.12);
      if (i > 0 || t < 11) {
        // In formation: a wobbly V swooping in out of the dusk toward the camera.
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        const u = Math.max(0, (t - 1.0) / 10.5);
        g.position.set(L.x + 7 + side * row * 34 + Math.sin(t * 1.7 + i) * 6, lerp(520, 250, u) + Math.sin(t * 2.3 + i) * 10 + row * 6, lerp(L.z - 1268, L.z + 32, u) - row * 60);
        g.rotation.set(Math.sin(t * 3 + i) * 0.25, -Math.PI / 2, Math.sin(t * 2 + i * 2) * 0.12); // nose toward the camera
        g.scale.setScalar(3.6);
        return;
      }
      if (t < crash) {
        // Breaking formation: a wobbling corkscrew down to the rock.
        const u = (t - 11) / (crash - 11), e = ease(u);
        g.position.set(lerp(L.x - 268, L.x, e) + Math.sin(u * 12) * 40 * (1 - u), lerp(320, 0, u * u), lerp(L.z - 208, L.z, e) + Math.cos(u * 10) * 20 * (1 - u));
        g.rotation.set(Math.sin(t * 9) * 0.5 * (1 - u * 0.5), -0.66 + Math.sin(t * 2) * 0.35, Math.sin(t * 7) * 0.3); // heading for her landing spot
        g.scale.setScalar(lerp(3.6, 3.0, u));
        const beamOn = t > 11.8 && t < 15.7, h = Math.max(1, g.position.y);
        this.beam.visible = beamOn;
        if (beamOn) { this.beam.scale.set(1 + h / 160, h, 1 + h / 160); this.beam.position.set(g.position.x, h / 2, g.position.z); this.beam.material.opacity = 0.18 + Math.sin(t * 30) * 0.06; }
        return;
      }
      this.beam.visible = false;
      if (!this.crashed) { this.crashed = true; this.shake = 0.6; this._puff(L, 10, 12, '#d8c09a', 45); }
      const k = t - crash;
      // Bounce, tumble, settle; then face the camera for her close-up.
      const bounce = k < 1 ? Math.abs(Math.sin(k * 9)) * 26 * Math.exp(-k * 3.2) : 0;
      g.position.set(L.x, bounce, L.z);
      g.scale.setScalar(3.0);
      const facing = -0.71;
      if (k < 1) g.rotation.set(0, facing + Math.sin(k * 14) * 0.6 * (1 - k), Math.sin(k * 11) * 0.5 * (1 - k));
      else if (t > 19 && t < 20.45) g.rotation.set(Math.sin(t * 60) * 0.12, facing + Math.sin(t * 45) * 0.15, 0);
      else g.rotation.set(0, t >= 34 ? -0.3 : facing, 0);
      // The wings pop off like a cheap costume and flutter away.
      if (t >= 20.5) for (const w of q.wings) {
        if (!w.free) {
          w.free = true;
          const wp = new THREE.Vector3(); w.pivot.getWorldPosition(wp);
          const wq = new THREE.Quaternion(); w.pivot.getWorldQuaternion(wq);
          g.remove(w.pivot); this.group.add(w.pivot);
          w.pivot.position.copy(wp); w.pivot.quaternion.copy(wq); w.pivot.scale.setScalar(3.0);
          w.v.set(w.side * 30 + 10, 60, w.side * 20 - 10);
          w.spin = w.side * 6;
        }
        w.v.y -= 10 * dt; w.v.multiplyScalar(1 - 0.6 * dt);
        w.pivot.position.addScaledVector(w.v, dt);
        w.pivot.rotation.y += w.spin * dt; w.pivot.rotation.z = Math.sin(t * 7 + w.side) * 0.6;
        w.pivot.visible = t < 24;
      }
      // When the sneaker lands she hops in fright.
      if (t > 37.2 && t < 37.9) g.position.y = Math.sin((t - 37.2) / 0.7 * Math.PI) * 14;
    });
  }

  // Five pavement ants do a synchronised double-take (one is late).
  _locals(t) {
    const show = t >= 24 && t < 29;
    this.locals.forEach((a, i) => {
      a.group.visible = show;
      if (!show) return;
      let yaw = 0;
      if (t >= 25.6) yaw = -Math.PI / 2;
      if (t >= 27.4 && (i !== 3 || t >= 27.85)) yaw = Math.PI;
      a.group.rotation.y = yaw;
      a.body.scale.y = 1 + Math.sin(t * 2 + i) * 0.02;
    });
  }

  // The spider turns slowly to camera; its eyes glint.
  _spider(t) {
    const s = this.app.s, sp = s.spider;
    if (sp) { sp.x = WEB.x; sp.y = WEB.z; }
    const mesh = this.surface.spider;
    if (t >= 29 && t < 34) {
      const u = ease((t - 31) / 1.6);
      mesh.rotation.y = lerp(Math.PI, Math.PI * 1.5, u);
    }
    const on = t > 32.7 && t < 33.5;
    this.glints.forEach((g, k) => {
      g.visible = on;
      if (!on) return;
      g.position.set(WEB.x + (k ? 2.1 : -2.1), SPIDER_FOOT * 2.6 + 9.5, WEB.z + 17);
      g.quaternion.copy(this.camera.quaternion);
      g.scale.setScalar(Math.sin((t - 32.7) / 0.8 * Math.PI) * 9);
    });
  }

  // A giant shadow, then the sneaker, then it walks off.
  _stomp(t, dt) {
    const sh = this.shadow, shoe = this.shoe;
    if (t < 34.4 || t > 40) { sh.material.opacity = 0; shoe.visible = false; return; }
    shoe.visible = true;
    const grow = ease((t - 34.4) / 2.8);
    sh.scale.set(170 * grow + 1, 1, 70 * grow + 1);
    sh.material.opacity = t < 38.8 ? 0.15 + grow * 0.4 : Math.max(0, 0.55 - (t - 38.8) * 0.6);
    let y;
    if (t < 36.6) y = 2000;
    else if (t < 37.2) { const u = (t - 36.6) / 0.6; y = lerp(1400, 0, u * u); }
    else if (t < 38.7) y = 0;
    else y = (t - 38.7) * (t - 38.7) * 1400;
    shoe.position.set(STOMP.x, y, STOMP.z);
    shoe.rotation.set(0, 0.25, t > 38.7 ? -(t - 38.7) * 0.4 : 0);
    if (t >= 37.2 && !this.stomped) { this.stomped = true; this.shake = 0.9; this._puff(STOMP.clone().add(V(-100, 0, 0)), 14, 26, '#c8b090', 90); }
  }

  // She digs like mad and is gone.
  _dig(t, dt) {
    const q = this.hero, g = q.group;
    if (t < 40.4 || t >= 44) return;
    g.visible = t < 43.6;
    const f = Math.floor(t * 14) % WALK_FRAMES;
    q.body.geometry = antGeometry('queen', f);
    g.rotation.set(0.35, -Math.PI / 2 + Math.sin(t * 40) * 0.12, 0);
    g.position.set(L.x + Math.sin(t * 50) * 0.8, -Math.max(0, (t - 41) / 2.4) * 22, L.z);
    this.hole.scale.setScalar(Math.min(14, 4 + (t - 40.4) * 4));
    this.dirtT = (this.dirtT || 0) + dt;
    while (this.dirtT > 0.04) { this.dirtT -= 0.04; this._dirt(L); }
  }

  render() { this.pipeline.render(this.surface.scene, this.camera); }
}
