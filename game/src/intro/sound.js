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
