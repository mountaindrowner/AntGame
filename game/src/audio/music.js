// The game's music (docs/SOUND.md, "Music"): synthesized like everything
// else, in one key (A minor) and tempo, so it can shift with the game
// instead of switching tracks. Five layers play all the time:
// - pad: soft chords
// - bass: a plucked root
// - melody: a marimba
// - drums: kick, brush and hats
// - danger: fast hats and a low pulse
// Each mode (title, yard, nest) sets the layers' levels; danger fades its
// layer in on top; rain muffles the lot. Notes are scheduled a bar ahead.
import { sfx } from './sfx.js';

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const BPM = 92, BEAT = 60 / BPM, BAR = BEAT * 4;
// Am – F – C – G, twice, then a variation: an eight-bar loop.
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
const SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76];
const hash = (n) => { const x = Math.sin(n * 91.7 + 12.3) * 43758.5453; return x - Math.floor(x); };
const MIX = {
  title: { pad: 0.7, bass: 0.35, melody: 0.8, drums: 0 },
  yard: { pad: 0.35, bass: 0.7, melody: 0.55, drums: 0.5 },
  nest: { pad: 0.8, bass: 0.45, melody: 0.3, drums: 0.25 },
};

export class Music {
  constructor() {
    this.mode = 'title';
    this.danger = 0;
    this.rain = false;
    this.bar = 0;
    this.next = 0;
    this.g = null;
    setInterval(() => this._tick(), 120);
  }

  // Called every frame with what's going on.
  set(mode, danger, rain) {
    this.mode = mode; this.danger = danger; this.rain = rain;
    if (!this.g) return;
    const c = sfx.ctx, now = c.currentTime, m = MIX[mode] || MIX.yard;
    for (const k in m) this.g[k].gain.setTargetAtTime(m[k], now, 1.5);
    this.g.danger.gain.setTargetAtTime(danger, now, danger > 0.1 ? 0.6 : 2.5);
    if (danger > 0.1) this.g.drums.gain.setTargetAtTime(Math.max(m.drums, 0.8 * danger), now, 0.6);
    sfx.musicFilter.frequency.setTargetAtTime(rain ? 900 : 18000, now, 1.5);
  }

  _tick() {
    if (!sfx.ready || !sfx.on || sfx.musicVol <= 0) return;
    const c = sfx.ctx;
    if (!this.g) {
      this.g = {};
      for (const k of ['pad', 'bass', 'melody', 'drums', 'danger']) { const g = c.createGain(); g.gain.value = 0; g.connect(sfx.music); this.g[k] = g; }
      this.set(this.mode, this.danger, this.rain);
    }
    if (this.next < c.currentTime) this.next = c.currentTime + 0.1;
    while (this.next < c.currentTime + 0.8) { this._bar(this.next, this.bar++); this.next += BAR; }
  }

  _bar(t, k) {
    const s = sfx, g = this.g, ch = CHORDS[k % CHORDS.length], c = s.ctx;
    // Pad: each chord note on two slightly detuned triangles, swelling.
    for (const n of ch) for (const det of [-4, 4]) {
      const o = c.createOscillator(), e = c.createGain();
      o.type = 'triangle'; o.frequency.value = N(n); o.detune.value = det;
      e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.035, t + BAR * 0.35); e.gain.linearRampToValueAtTime(0.0001, t + BAR * 1.05);
      o.connect(e).connect(g.pad); o.start(t); o.stop(t + BAR * 1.1);
    }
    // Bass: root plucks on 1 and 3, a pickup before 3.
    const root = N(ch[0] - 12);
    s.blip(g.bass, t, root, BEAT * 0.9, 0.22, 'triangle');
    s.blip(g.bass, t + BEAT * 1.5, root * 1.5, BEAT * 0.4, 0.12, 'triangle');
    s.blip(g.bass, t + BEAT * 2, root, BEAT * 0.9, 0.2, 'triangle');
    // Melody: eighth notes, about half of them rests, near the chord.
    for (let i = 0; i < 8; i++) {
      const h = hash(k % 8 * 8 + i);
      if (h < 0.45) continue;
      // Mostly the pentatonic scale; on strong hits, a chord tone an octave up.
      const pick = h > 0.82 ? ch[Math.floor(h * 31) % 3] + 12 : SCALE[Math.floor(h * 97) % SCALE.length];
      const tt = t + i * BEAT / 2;
      s.blip(g.melody, tt, N(pick), 0.28, 0.09, 'sine'); s.blip(g.melody, tt, N(pick + 12), 0.12, 0.025, 'sine');
    }
    // Drums: a soft kick on 1 and 3, a brush on 2 and 4, quiet hats.
    for (let b = 0; b < 4; b++) {
      const tb = t + b * BEAT;
      if (b % 2 === 0) s.thump(g.drums, tb, 110, 45, 0.18, 0.35);
      else s.puff(g.drums, tb, 0.12, 2500, 0.1, 'bandpass');
      s.puff(g.drums, tb + BEAT / 2, 0.025, 8000, 0.04, 'highpass');
    }
    // Danger: sixteenth hats, a kick every beat, and a low pulse.
    for (let i = 0; i < 16; i++) s.puff(g.danger, t + i * BEAT / 4, 0.02, 9000, i % 4 === 0 ? 0.08 : 0.04, 'highpass');
    for (let b = 0; b < 4; b++) s.thump(g.danger, t + b * BEAT, 90, 40, 0.15, 0.3);
    s.chirp(g.danger, t, N(33), N(33), BAR * 0.95, 0.14, 'triangle');
  }
}

export const music = new Music();
