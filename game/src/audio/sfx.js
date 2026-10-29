// Game sound effects, synthesized with Web Audio (no audio files), as charted
// in docs/SOUND.md. A few building blocks (blip, chirp, puff, thump, grain)
// make every sound; play(name, at) plays one, panned and faded by where it
// happens relative to the camera. Each sound has a cooldown and a cap on
// copies at once, so a busy colony never turns into a din. Loops (rain,
// the mower, the spider's menace, fire ants) are beds whose level is set
// every frame. Browsers allow sound only after a tap, so the context is
// made, or resumed, on the first one.

const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);

export class Sfx {
  constructor() {
    this.ctx = null;
    this.on = true;
    this.vol = 0.7;
    this.last = {};    // name → time last played (cooldowns)
    this.voices = {};  // name → copies playing
    this.loops = {};
    this.ear = null;   // (x, y) in px → { gain, pan }, set by the game
    if (typeof window !== 'undefined') {
      const unlock = () => this.unlock();
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
    }
  }

  unlock() {
    if (!AC) return;
    if (!this.ctx) {
      const c = (this.ctx = new AC());
      this.master = c.createGain();
      this.master.gain.value = this.on ? this.vol : 0;
      this.master.connect(c.destination);
      const n = c.sampleRate;
      this.noise = c.createBuffer(1, n, n);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }
  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? this.vol : 0, this.ctx.currentTime, 0.05); }

  // ---------- building blocks ----------
  // Every block takes an output node (out) and a start time (t).
  _env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  blip(out, t, f, d, v = 0.3, type = 'triangle') {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; this._env(g, t, 0.004, d, v);
    o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
  }
  chirp(out, t, f0, f1, d, v = 0.3, type = 'sine') {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
    this._env(g, t, 0.008, d, v); o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
  }
  thump(out, t, f0 = 140, f1 = 45, d = 0.25, v = 0.6) { this.chirp(out, t, f0, f1, d, v, 'sine'); }
  // Filtered noise; f1 sweeps the filter if given.
  puff(out, t, d, f, v = 0.3, type = 'lowpass', f1, a = 0.005) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    this._env(g, t, a, d, v); s.connect(fl).connect(g).connect(out);
    s.start(t, Math.random() * 0.8); s.stop(t + a + d + 0.05);
  }
  // Many tiny puffs, randomized: digging, crumbling, crackles.
  grain(out, t, n, gap, f, v = 0.15, type = 'bandpass') {
    for (let i = 0; i < n; i++) this.puff(out, t + i * gap * (0.6 + Math.random() * 0.8), 0.02 + Math.random() * 0.03, f * (0.7 + Math.random() * 0.6), v * (0.6 + Math.random() * 0.6), type);
  }

  // ---------- playing ----------
  // A sound's output node: through a panner and a gain for where it is.
  _out(gain, pan) {
    const c = this.ctx, g = c.createGain(); g.gain.value = gain;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(this.master); g.connect(p); }
    else g.connect(this.master);
    return g;
  }

  // name: a key of SOUNDS. at: { x, y } in surface px (heard from where it
  // is), or nothing (heard as is). arg: passed to the recipe.
  play(name, at, arg) {
    if (!this.ready || !this.on) return;
    const S = SOUNDS[name]; if (!S) return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] ?? -9) < (S.cool ?? 0.05)) return;
    if ((this.voices[name] || 0) >= (S.cap ?? 3)) return;
    let gain = 1, pan = 0;
    if (at && this.ear) { ({ gain, pan } = this.ear(at.x, at.y)); if (S.always) gain = Math.max(gain, 0.5); if (gain < 0.02) return; }
    this.last[name] = now;
    this.voices[name] = (this.voices[name] || 0) + 1;
    const len = S.fn(this, this._out(gain * (S.vol ?? 1) * (0.9 + Math.random() * 0.2), pan), now + 0.01, arg) || 0.5;
    setTimeout(() => { this.voices[name]--; }, len * 1000 + 100);
  }

  // A looping bed (rain, the mower…): level 0 stops it.
  loop(name, level, pan = 0) {
    if (!this.ready) return;
    let L = this.loops[name];
    const want = this.on ? level : 0;
    if (!L) {
      if (want < 0.01) return;
      const c = this.ctx, g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
      g.gain.value = 0.0001;
      if (p) { g.connect(p).connect(this.master); } else g.connect(this.master);
      L = this.loops[name] = { g, p, stop: LOOPS[name](this, g) };
    }
    L.g.gain.setTargetAtTime(Math.max(0.0001, want), this.ctx.currentTime, 0.25);
    if (L.p) L.p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime, 0.1);
    if (want < 0.01) {
      clearTimeout(L.kill);
      L.kill = setTimeout(() => { if (this.loops[name] === L && L.g.gain.value < 0.02) { L.stop(); L.g.disconnect(); delete this.loops[name]; } }, 1500);
    } else clearTimeout(L.kill);
  }
}

// ---------- the sounds (docs/SOUND.md, priority 1) ----------
// fn(sfx, out, t, arg) schedules the sound and returns its length (s).
// cool: seconds between plays; cap: copies at once; always: a warning heard
// from anywhere.
const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note → Hz
const SOUNDS = {
  // Buttons and menus.
  tap: { cool: 0.04, vol: 0.5, fn: (s, o, t) => { s.blip(o, t, 900, 0.03, 0.25); s.puff(o, t, 0.01, 6000, 0.1, 'highpass'); return 0.06; } },
  toggleOn: { fn: (s, o, t) => { s.blip(o, t, N(76), 0.05, 0.22); s.blip(o, t + 0.05, N(83), 0.06, 0.22); return 0.15; } },
  toggleOff: { fn: (s, o, t) => { s.blip(o, t, N(83), 0.05, 0.22); s.blip(o, t + 0.05, N(76), 0.06, 0.22); return 0.15; } },
  bonk: { cool: 0.15, fn: (s, o, t) => { s.chirp(o, t, 180, 140, 0.09, 0.35); return 0.12; } },
  explainer: { cool: 0.5, fn: (s, o, t) => { for (const [k, n] of [[0, 72], [0.09, 79]]) { s.blip(o, t + k, N(n), 0.18, 0.25, 'sine'); s.blip(o, t + k, N(n + 12), 0.1, 0.06, 'sine'); } return 0.35; } },
  // Your ant.
  pickup: { fn: (s, o, t) => { s.blip(o, t, 600, 0.04, 0.3); s.blip(o, t + 0.03, 900, 0.05, 0.3); return 0.1; } },
  drop: { fn: (s, o, t) => { s.puff(o, t, 0.06, 500, 0.3); s.blip(o, t, 300, 0.06, 0.25, 'sine'); return 0.1; } },
  // arg: 'food' | 'water' | 'protein' | 'grit'
  deliver: { cool: 0.12, fn: (s, o, t, k) => {
    const base = { water: 84, protein: 64, grit: 67 }[k] ?? 76, type = k === 'water' ? 'sine' : 'triangle';
    s.blip(o, t, N(base), 0.09, 0.28, type); s.blip(o, t + 0.08, N(base + 7), 0.16, 0.28, type); return 0.3;
  } },
  recruit: { cool: 0.03, cap: 4, fn: (s, o, t, n = 1) => { s.blip(o, t, N(67 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][Math.min(9, (n - 1) % 10)]), 0.06, 0.22, 'sine'); return 0.1; } },
  release: { fn: (s, o, t) => { for (let i = 0; i < 4; i++) s.blip(o, t + i * 0.05, N(84 - i * 3), 0.05, 0.2, 'sine'); return 0.3; } },
  lift: { fn: (s, o, t) => { s.thump(o, t, 120, 60, 0.15, 0.5); s.chirp(o, t + 0.06, 300, 700, 0.18, 0.25, 'triangle'); return 0.3; } },
  enter: { fn: (s, o, t) => { s.puff(o, t, 0.35, 1800, 0.35, 'lowpass', 300, 0.05); return 0.45; } },
  exit: { fn: (s, o, t) => { s.puff(o, t, 0.35, 300, 0.35, 'lowpass', 1800, 0.05); return 0.45; } },
  die: { cool: 1, fn: (s, o, t) => { s.chirp(o, t, 600, 150, 0.7, 0.3, 'triangle'); s.thump(o, t + 0.6, 120, 50, 0.3, 0.5); return 1; } },
  hatchYou: { cool: 1, fn: (s, o, t) => { s.chirp(o, t, 300, 1200, 0.06, 0.4); s.blip(o, t + 0.1, N(79), 0.12, 0.25, 'sine'); s.blip(o, t + 0.2, N(84), 0.2, 0.25, 'sine'); return 0.45; } },
  // The colony and the nest.
  queenDig: { cool: 0.12, fn: (s, o, t) => { s.grain(o, t, 6, 0.025, 600, 0.3, 'lowpass'); return 0.25; } },
  buildNest: { cool: 1, fn: (s, o, t) => { s.grain(o, t, 16, 0.03, 500, 0.3, 'lowpass'); s.thump(o, t + 0.5, 110, 45, 0.35, 0.6); return 0.9; } },
  roomPlaced: { fn: (s, o, t) => { for (const k of [0, 0.12]) { s.blip(o, t + k, 340, 0.05, 0.4, 'square'); s.puff(o, t + k, 0.03, 900, 0.2); } return 0.25; } },
  roomDone: { cool: 0.5, fn: (s, o, t) => { s.puff(o, t, 0.4, 900, 0.2, 'lowpass', 300, 0.05); [72, 76, 79].forEach((n, i) => s.blip(o, t + 0.15 + i * 0.09, N(n), 0.15, 0.25)); return 0.6; } },
  layEgg: { cool: 0.15, fn: (s, o, t) => { s.chirp(o, t, 900, 500, 0.06, 0.25); return 0.1; } },
  hatch: { cool: 0.25, vol: 0.6, fn: (s, o, t) => { s.chirp(o, t, 300, 1200, 0.05, 0.3); return 0.08; } },
  queenUp: { cool: 1, fn: (s, o, t) => { [67, 72, 76, 79].forEach((n, i) => s.blip(o, t + i * 0.1, N(n), i === 3 ? 0.4 : 0.12, 0.18, 'square')); return 0.8; } },
  cavein: { cool: 1, fn: (s, o, t) => { s.puff(o, t, 0.7, 400, 0.5, 'lowpass', 120, 0.3); s.thump(o, t + 0.6, 90, 35, 0.4, 0.7); s.grain(o, t + 0.65, 10, 0.04, 500, 0.2, 'lowpass'); return 1.3; } },
  starving: { cool: 6, fn: (s, o, t) => { for (const f of [N(50), N(51)]) s.chirp(o, t, f, f, 2, 0.12, 'triangle'); return 2; } },
  treat: { cool: 1, fn: (s, o, t) => { s.thump(o, t, 200, 80, 0.15, 0.4); s.blip(o, t + 0.12, N(84), 0.1, 0.22); s.blip(o, t + 0.2, N(88), 0.18, 0.22); return 0.45; } },
  // Danger and big moments.
  spiderBite: { cool: 0.3, fn: (s, o, t) => { s.puff(o, t, 0.08, 1500, 0.4, 'bandpass'); s.thump(o, t, 160, 70, 0.12, 0.4); return 0.2; } },
  spiderDie: { cool: 2, always: true, fn: (s, o, t) => { s.puff(o, t, 0.3, 700, 0.5, 'lowpass', 150); [67, 72, 76, 79, 84].forEach((n, i) => s.blip(o, t + 0.3 + i * 0.09, N(n), i === 4 ? 0.5 : 0.1, 0.2, 'square')); return 1.2; } },
  catDie: { cool: 1, fn: (s, o, t) => { s.chirp(o, t, 800, 200, 0.4, 0.3, 'triangle'); return 0.5; } },
  raid: { cool: 4, always: true, fn: (s, o, t) => { for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) s.thump(o, t + r * 0.6 + i * 0.13, 110, 55, 0.12, 0.6); return 2; } },
  queenHit: { cool: 3, fn: (s, o, t) => { for (let i = 0; i < 6; i++) s.blip(o, t + i * 0.18, i % 2 ? N(76) : N(83), 0.16, 0.18, 'square'); return 1.2; } },
  win: { cool: 5, fn: (s, o, t) => { [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) => s.blip(o, t + i * 0.12, N(n), i === 7 ? 0.8 : 0.12, 0.22, 'square')); s.thump(o, t + 0.84, 120, 50, 0.5, 0.6); return 1.8; } },
  lost: { cool: 5, fn: (s, o, t) => { [69, 67, 65, 64, 60, 57].forEach((n, i) => s.blip(o, t + i * 0.35, N(n), 0.4, 0.2, 'sine')); return 2.4; } },
  // Visitors (sim strikes).
  footWarn: { cool: 1, always: true, fn: (s, o, t, d = 2) => { s.puff(o, t, d, 120, 0.4, 'lowpass', 900, d * 0.9); return d + 0.1; } },
  stomp: { cool: 0.4, always: true, fn: (s, o, t) => { s.thump(o, t, 110, 30, 0.5, 1); s.puff(o, t, 0.3, 700, 0.6, 'lowpass', 150); return 0.6; } },
  acornWarn: { cool: 1, always: true, fn: (s, o, t, d = 1.6) => { s.chirp(o, t, 1600, 400, d, 0.15, 'sine'); return d; } },
  acornHit: { cool: 0.4, fn: (s, o, t) => { s.blip(o, t, 260, 0.08, 0.5, 'square'); s.thump(o, t, 200, 80, 0.15, 0.5); return 0.2; } },
  sprayHiss: { cool: 1, always: true, fn: (s, o, t, d = 4) => { s.puff(o, t, d, 4000, 0.25, 'bandpass', 3000, 0.6); return d + 0.6; } },
  birdIn: { cool: 1, always: true, fn: (s, o, t) => { for (let i = 0; i < 10; i++) s.puff(o, t + i * 0.07, 0.05, 500, 0.3); s.chirp(o, t + 0.8, 3200, 4200, 0.08, 0.2); s.chirp(o, t + 0.92, 4200, 3000, 0.1, 0.2); return 1.1; } },
  peck: { cool: 0.2, fn: (s, o, t) => { s.puff(o, t, 0.02, 3500, 0.5, 'highpass'); s.blip(o, t, 1800, 0.02, 0.2, 'square'); return 0.05; } },
  birdOut: { cool: 1, fn: (s, o, t) => { for (let i = 0; i < 8; i++) s.puff(o, t + i * 0.06, 0.05, 600, 0.25); return 0.6; } },
  croak: { cool: 0.8, always: true, fn: (s, o, t) => { const c = s.ctx, x = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
    x.type = 'square'; x.frequency.value = 120; lfo.frequency.value = 28; lg.gain.value = 30; lfo.connect(lg).connect(x.frequency);
    f.type = 'lowpass'; f.frequency.value = 700; s._env(g, t, 0.02, 0.35, 0.35); x.connect(f).connect(g).connect(o);
    x.start(t); lfo.start(t); x.stop(t + 0.45); lfo.stop(t + 0.45); return 0.5; } },
  tongue: { cool: 0.3, fn: (s, o, t) => { s.chirp(o, t, 400, 1400, 0.07, 0.25, 'triangle'); s.puff(o, t + 0.07, 0.05, 1200, 0.4, 'bandpass'); return 0.15; } },
};

// Looping beds: start(sfx, out) → stop().
const LOOPS = {
  rain: (s, o) => {
    const c = s.ctx, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = s.noise; n.loop = true; f.type = 'highpass'; f.frequency.value = 2500; g.gain.value = 0.25;
    n.connect(f).connect(g).connect(o); n.start();
    const drip = setInterval(() => { if (s.ready) s.puff(o, c.currentTime + Math.random() * 0.2, 0.03, 1200 + Math.random() * 1500, 0.25, 'bandpass'); }, 90);
    return () => { clearInterval(drip); n.stop(); };
  },
  mower: (s, o) => {
    const c = s.ctx, a = c.createOscillator(), b = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    a.type = 'sawtooth'; a.frequency.value = 48; b.type = 'sawtooth'; b.frequency.value = 50.5; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.18;
    a.connect(f); b.connect(f); f.connect(g).connect(o); a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  },
  spider: (s, o) => {
    const c = s.ctx, a = c.createOscillator(), b = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
    a.type = 'triangle'; a.frequency.value = 70; b.type = 'sine'; b.frequency.value = 1240; lfo.frequency.value = 5; lg.gain.value = 0.02;
    const bg = c.createGain(); bg.gain.value = 0.02; lfo.connect(lg).connect(bg.gain);
    g.gain.value = 0.25; a.connect(g); b.connect(bg).connect(g); g.connect(o); a.start(); b.start(); lfo.start();
    return () => { a.stop(); b.stop(); lfo.stop(); };
  },
  fireants: (s, o) => {
    const c = s.ctx, tick = setInterval(() => { if (s.ready) s.grain(o, c.currentTime, 3, 0.02, 5000, 0.25, 'highpass'); }, 70);
    return () => clearInterval(tick);
  },
};

export const sfx = new Sfx();
