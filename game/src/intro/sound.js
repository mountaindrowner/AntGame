// The opening film's sound, synthesised with WebAudio so the game ships no
// audio files: a wobbly theremin, a slide whistle, boings, pops, a stomp.
// Every call schedules at an absolute AudioContext time.

export class FilmSound {
  // ctx: an AudioContext, or an OfflineAudioContext to render the score to a file.
  constructor(ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = ctx || (AC ? new AC() : null);
    if (!this.ctx) return;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    // One second of white noise, reused for crashes, stomps and dirt.
    const n = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, n, n);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  mute(on) { if (this.ctx) this.master.gain.setTargetAtTime(on ? 0 : 0.55, this.ctx.currentTime, 0.05); }

  stop() { if (this.ctx) { this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); setTimeout(() => this.ctx.close(), 400); } }

  _env(t, a, hold, r, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.linearRampToValueAtTime(0, t + a + hold + r);
    g.connect(this.master);
    return g;
  }

  // A theremin line: one voice gliding between notes, with a nervous vibrato.
  theremin(t, notes, step, vol = 0.18) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), depth = this.ctx.createGain();
    o.type = 'sine';
    lfo.frequency.value = 6.2;
    depth.gain.value = 9;
    lfo.connect(depth); depth.connect(o.frequency);
    notes.forEach((f, i) => o.frequency.setTargetAtTime(f, t + i * step, 0.09));
    o.frequency.setValueAtTime(notes[0], t);
    const g = this._env(t, 0.4, notes.length * step - 0.8, 0.6, vol);
    o.connect(g);
    o.start(t); lfo.start(t);
    o.stop(t + notes.length * step + 0.2); lfo.stop(t + notes.length * step + 0.2);
  }

  slideWhistle(t, dur = 1.3) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1500, t);
    o.frequency.exponentialRampToValueAtTime(260, t + dur);
    o.connect(this._env(t, 0.05, dur - 0.15, 0.1, 0.16));
    o.start(t); o.stop(t + dur + 0.1);
  }

  boing(t) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), depth = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.25);
    lfo.frequency.value = 18; depth.gain.value = 40;
    lfo.connect(depth); depth.connect(o.frequency);
    o.connect(this._env(t, 0.01, 0.15, 0.45, 0.25));
    o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7);
  }

  pop(t) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(950, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.09);
    o.connect(this._env(t, 0.005, 0.03, 0.06, 0.3));
    o.start(t); o.stop(t + 0.15);
  }

  // Filtered noise: a crash, a stomp, the hiss of digging.
  noiseHit(t, dur, freq, vol, type = 'lowpass') {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    src.buffer = this.noise; src.loop = true;
    f.type = type; f.frequency.value = freq;
    src.connect(f); f.connect(this._env(t, 0.005, dur * 0.2, dur * 0.8, vol));
    src.start(t); src.stop(t + dur + 0.05);
  }

  stomp(t) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.8);
    o.connect(this._env(t, 0.005, 0.1, 0.9, 0.9));
    o.start(t); o.stop(t + 1.1);
    this.noiseHit(t, 0.9, 260, 0.8);
  }

  // Low, menacing swell for the spider.
  ominous(t, dur) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(55, t); o.frequency.linearRampToValueAtTime(52, t + dur);
    f.type = 'lowpass'; f.frequency.setValueAtTime(200, t); f.frequency.linearRampToValueAtTime(700, t + dur);
    o.connect(f); f.connect(this._env(t, dur * 0.6, dur * 0.2, dur * 0.2, 0.22));
    o.start(t); o.stop(t + dur + 0.1);
  }

  // ---------- the funky beat ----------
  kick(t) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    o.connect(this._env(t, 0.003, 0.04, 0.26, 0.5));
    o.start(t); o.stop(t + 0.35);
  }

  snare(t, vol = 0.22) {
    if (!this.ctx) return;
    this.noiseHit(t, 0.14, 1900, vol, 'bandpass');
    const o = this.ctx.createOscillator();
    o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.07);
    o.connect(this._env(t, 0.002, 0.02, 0.06, vol * 0.6));
    o.start(t); o.stop(t + 0.12);
  }

  hat(t, open) { this.noiseHit(t, open ? 0.14 : 0.03, 7500, open ? 0.06 : 0.045, 'highpass'); }

  // A plucky slap bass: a bright attack that closes fast.
  bass(t, f, dur = 0.2) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), lp = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 1.004;
    lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(this._env(t, 0.004, dur * 0.4, dur * 0.6, 0.11));
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  // "Boom, ta boom, boom, boom, boom": kick and snare on eighths, hats, and a
  // bass that follows the kicks around E minor pentatonic. Two-bar loop.
  groove(t0, t1, bpm = 104) {
    const e = 30 / bpm; // one eighth
    const drums = ['K', 'S', 'K', '', 'K', 'K', 'K', 's'];
    const E2 = 82.41, E3 = 164.81, G2 = 98, A2 = 110, B2 = 123.47, D3 = 146.83;
    const bassA = [E2, E3, E2, 0, G2, A2, B2, 0], bassB = [E2, E3, E2, 0, D3, B2, A2, G2];
    for (let i = 0, t = t0; t < t1 - 0.01; i++, t += e) {
      const k = i % 8, bar = Math.floor(i / 8) % 2;
      if (drums[k] === 'K') this.kick(t);
      if (drums[k] === 'S') this.snare(t);
      if (drums[k] === 's') this.snare(t, 0.1);
      this.hat(t, k === 7);
      this.hat(t + e / 2, false);
      const f = (bar ? bassB : bassA)[k];
      if (f) this.bass(t, f, e * 0.8);
    }
  }

  // A needle dragged across the record: the music stops dead.
  scratch(t) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    src.buffer = this.noise; f.type = 'bandpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.12); f.frequency.exponentialRampToValueAtTime(2200, t + 0.25);
    src.connect(f); f.connect(this._env(t, 0.005, 0.18, 0.08, 0.5));
    src.start(t); src.stop(t + 0.3);
  }

  // The flying saucer warble: two wobbling tones sliding down as they near.
  ufo(t, dur) {
    if (!this.ctx) return;
    for (const [f, d] of [[880, 220], [1320, 300]]) {
      const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), depth = this.ctx.createGain();
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + dur);
      lfo.frequency.setValueAtTime(5, t); lfo.frequency.linearRampToValueAtTime(11, t + dur);
      depth.gain.value = d;
      lfo.connect(depth); depth.connect(o.frequency);
      o.connect(this._env(t, dur * 0.25, dur * 0.5, dur * 0.25, f > 1000 ? 0.035 : 0.06));
      o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    }
  }

  // A brassy B-movie stinger for the title: a stacked chord and a cymbal.
  stinger(t) {
    if (!this.ctx) return;
    for (const f of [196, 247, 311, 392]) {
      const o = this.ctx.createOscillator(), lp = this.ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f;
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 0.25);
      o.connect(lp); lp.connect(this._env(t, 0.02, 0.9, 1.2, 0.07));
      o.start(t); o.stop(t + 2.3);
    }
    this.noiseHit(t, 1.6, 6000, 0.25, 'highpass');
  }
}
