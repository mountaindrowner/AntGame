// The game's music (docs/SOUND.md, "Music"; build 77: docs/SOUND-POLISH.md): synthesized like everything else,
// in one key (A minor) and one tempo, so any song can blend into any other on the bar line instead of cutting.
// Every song is an arrangement of layers over the same bar clock:
// - day in the yard: pad, bass, marimba melody, soft drums
// - night in the yard: a music box over a low, slow pad
// - the nest: the warm pad, with a kalimba line
// - battle, in three steps as a fight grows: war drums and a chugging bass; brass stabs; the battle tune
// - boss: its own darker progression, a low choir and timpani, with the war drums
// - danger: fast hats and a low pulse (the spider, a falling foot)
// set() is called every frame with what's going on; layers fade to their levels. Stingers (sting()) are short
// phrases played over the top (victory, defeat, discovery…) while the music ducks under them. Notes are
// scheduled a bar ahead. The same code renders offline (renderMusicWav) for listening to outside the game.
import { sfx } from './sfx.js';

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const BPM = 92, BEAT = 60 / BPM, BAR = BEAT * 4;
// Am – F – C – G, twice, then a variation: an eight-bar loop.
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
// The boss: Am – B♭ – Am – E, twice: the flat second is what makes it uneasy.
const BOSS = [[57, 60, 64], [58, 62, 65], [57, 60, 64], [52, 56, 59], [57, 60, 64], [58, 62, 65], [53, 57, 60], [52, 56, 59]];
const SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76];
// The battle tune: eight bars over the same chords, [beat, note, length in beats]. Fixed, so it's recognisable.
const TUNE = [
  [[0, 69, 1.5], [1.5, 72, 0.5], [2, 71, 1], [3, 69, 1]],
  [[0, 65, 1.5], [1.5, 69, 0.5], [2, 72, 1.5], [3.5, 71, 0.5]],
  [[0, 72, 1], [1, 76, 1], [2, 74, 1], [3, 72, 1]],
  [[0, 71, 2], [2, 74, 1], [3, 79, 1]],
  [[0, 81, 1.5], [1.5, 79, 0.5], [2, 76, 1], [3, 72, 1]],
  [[0, 77, 1.5], [1.5, 76, 0.5], [2, 72, 1], [3, 69, 1]],
  [[0, 74, 1], [1, 72, 1], [2, 77, 2]],
  [[0, 76, 3], [3, 68, 1]],
];
const hash = (n) => { const x = Math.sin(n * 91.7 + 12.3) * 43758.5453; return x - Math.floor(x); };
const MIX = {
  title: { pad: 0.7, bass: 0.35, melody: 0.8, drums: 0 },
  yard: { pad: 0.35, bass: 0.7, melody: 0.55, drums: 0.5 },
  nest: { pad: 0.8, bass: 0.45, melody: 0.3, drums: 0.25, kalimba: 0.55 },
};
const LAYERS = ['pad', 'bass', 'melody', 'drums', 'danger', 'night', 'kalimba', 'war', 'stabs', 'lead', 'boss'];
const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));

export class Music {
  // s: the sound engine (the game's, or an offline copy); live: keep scheduling on a timer.
  constructor(s = sfx, live = true) {
    this.s = s;
    this.mode = 'title'; this.danger = 0; this.rain = false; this.o = {};
    this.bar = 0; this.next = 0; this.g = null; this.lv = {};
    if (live) setInterval(() => this._tick(), 120);
  }

  _graph() {
    const c = this.s.ctx; this.g = {};
    this.duck = c.createGain(); this.duck.connect(this.s.music);
    for (const k of LAYERS) { const g = c.createGain(); g.gain.value = 0; g.connect(this.duck); this.g[k] = g; }
  }

  // Called every frame with what's going on. o: { night 0–1, battle 0–1, boss }. now: when (offline renders).
  set(mode, danger, rain, o = {}, now) {
    this.mode = mode; this.danger = danger; this.rain = rain; this.o = o;
    if (!this.g) return;
    const c = this.s.ctx; now = now ?? c.currentTime;
    const m = MIX[mode] || MIX.yard, night = mode === 'yard' ? (o.night || 0) : 0, b = mode === 'title' ? 0 : (o.battle || 0), boss = mode !== 'title' && o.boss ? 1 : 0;
    const calm = (1 - Math.min(1, b * 1.4)) * (1 - boss);
    const L = {
      pad: m.pad * (boss ? 0.15 : 1) * (1 - 0.4 * night),
      bass: m.bass * (1 - 0.6 * night) * (1 - boss) * (1 - 0.5 * Math.min(1, b * 1.5)),
      melody: m.melody * (1 - night) * calm,
      drums: m.drums * (1 - night) * calm,
      night: night * 0.55 * calm,
      kalimba: (m.kalimba || 0) * calm,
      war: Math.max(ramp(b, 0.12, 0.35), boss) * 0.5,
      stabs: ramp(b, 0.42, 0.62) * (1 - boss) * 0.55,
      lead: ramp(b, 0.68, 0.88) * (1 - boss) * 0.6,
      boss: boss * 0.5,
      danger: danger * (1 - ramp(b, 0.3, 0.6)) * (1 - boss * 0.7),
    };
    for (const k of LAYERS) { const up = L[k] > (this.lv[k] || 0); this.g[k].gain.setTargetAtTime(L[k], now, up ? (k === 'war' || k === 'boss' ? 0.8 : 1.2) : (k === 'danger' ? 2.5 : 2)); }
    this.lv = L;
    if (this.s.musicFilter) this.s.musicFilter.frequency.setTargetAtTime(rain ? 900 : 18000, now, 1.5);
  }

  _tick() {
    const s = this.s; if (!s.ready || !s.on || s.musicVol <= 0) return;
    const c = s.ctx;
    if (!this.g) { this._graph(); this.set(this.mode, this.danger, this.rain, this.o); }
    if (this.next < c.currentTime) this.next = c.currentTime + 0.1;
    while (this.next < c.currentTime + 0.8) { this._bar(this.next, this.bar++); this.next += BAR; }
  }

  // Is a layer worth scheduling this bar (heard now, or on its way)?
  _on(k) { return (this.lv[k] || 0) > 0.005 || this.g[k].gain.value > 0.005; }

  _bar(t, k) {
    const s = this.s, g = this.g, ch = CHORDS[k % CHORDS.length], c = s.ctx, bc = BOSS[k % BOSS.length];
    if (this._on('pad')) for (const n of ch) for (const det of [-4, 4]) {
      // Pad: each chord note on two slightly detuned triangles, swelling.
      const o = c.createOscillator(), e = c.createGain();
      o.type = 'triangle'; o.frequency.value = N(n); o.detune.value = det;
      e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.035, t + BAR * 0.35); e.gain.linearRampToValueAtTime(0.0001, t + BAR * 1.05);
      o.connect(e).connect(g.pad); o.start(t); o.stop(t + BAR * 1.1);
    }
    if (this._on('bass')) { // Bass: root plucks on 1 and 3, a pickup before 3.
      const root = N(ch[0] - 12);
      s.blip(g.bass, t, root, BEAT * 0.9, 0.22, 'triangle');
      s.blip(g.bass, t + BEAT * 1.5, root * 1.5, BEAT * 0.4, 0.12, 'triangle');
      s.blip(g.bass, t + BEAT * 2, root, BEAT * 0.9, 0.2, 'triangle');
    }
    if (this._on('melody')) for (let i = 0; i < 8; i++) { // Melody: eighth notes, about half of them rests, near the chord.
      const h = hash(k % 8 * 8 + i);
      if (h < 0.45) continue;
      const pick = h > 0.82 ? ch[Math.floor(h * 31) % 3] + 12 : SCALE[Math.floor(h * 97) % SCALE.length];
      const tt = t + i * BEAT / 2;
      s.blip(g.melody, tt, N(pick), 0.28, 0.09, 'sine'); s.blip(g.melody, tt, N(pick + 12), 0.12, 0.025, 'sine');
    }
    if (this._on('drums')) for (let b = 0; b < 4; b++) { // Drums: a soft kick on 1 and 3, a brush on 2 and 4, quiet hats.
      const tb = t + b * BEAT;
      if (b % 2 === 0) s.thump(g.drums, tb, 110, 45, 0.18, 0.35);
      else s.puff(g.drums, tb, 0.12, 2500, 0.1, 'bandpass');
      s.puff(g.drums, tb + BEAT / 2, 0.025, 8000, 0.04, 'highpass');
    }
    if (this._on('danger')) { // Danger: sixteenth hats, a kick every beat, and a low pulse.
      for (let i = 0; i < 16; i++) s.puff(g.danger, t + i * BEAT / 4, 0.02, 9000, i % 4 === 0 ? 0.08 : 0.04, 'highpass');
      for (let b = 0; b < 4; b++) s.thump(g.danger, t + b * BEAT, 90, 40, 0.15, 0.3);
      s.chirp(g.danger, t, N(33), N(33), BAR * 0.95, 0.14, 'triangle');
    }
    if (this._on('night')) { // Night: a music box picking out the chord high up, over a low swelling pad.
      for (const [i, beat] of [0, 1, 2.5, 3].entries()) { if (hash(k * 4 + i + 300) < 0.3) continue; const n = ch[(i + k) % 3] + 24, tt = t + beat * BEAT;
        s.blip(g.night, tt, N(n), 1.4, 0.055, 'sine'); s.blip(g.night, tt, N(n + 19), 0.4, 0.012, 'sine'); }
      const o = c.createOscillator(), e = c.createGain(); o.type = 'triangle'; o.frequency.value = N(ch[0] - 12);
      e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.06, t + BAR * 0.5); e.gain.linearRampToValueAtTime(0.0001, t + BAR * 1.05); o.connect(e).connect(g.night); o.start(t); o.stop(t + BAR * 1.1);
    }
    if (this._on('kalimba')) for (let i = 0; i < 8; i++) { // The nest: a kalimba, plucked chord tones.
      const h = hash(k % 8 * 8 + i + 500); if (h < 0.55) continue;
      const n = ch[Math.floor(h * 13) % 3] + 12, tt = t + i * BEAT / 2;
      s.chirp(g.kalimba, tt, N(n) * 1.01, N(n), 0.5, 0.07, 'sine'); s.blip(g.kalimba, tt, N(n) * 3.01, 0.08, 0.015, 'sine');
    }
    const wch = this.lv.boss > 0.2 ? bc : ch;
    if (this._on('war')) { // Battle, step 1: war drums (low toms in a driving pattern, a snare on 2 and 4) and a chugging bass.
      for (const [e, big] of [[0, 1], [3, 0], [4, 1], [6, 0], [7, 0]]) s.thump(g.war, t + e * BEAT / 2, big ? 150 : 220, big ? 52 : 95, big ? 0.32 : 0.18, big ? 0.55 : 0.32);
      for (const b of [1, 3]) s.puff(g.war, t + b * BEAT, 0.14, 1800, 0.2, 'bandpass');
      if (k % 8 === 7) for (let i = 0; i < 8; i++) s.puff(g.war, t + 3 * BEAT + i * BEAT / 8, 0.05, 2000, 0.06 + i * 0.02, 'bandpass'); // a roll into the next phrase
      for (let e = 0; e < 8; e++) s.blip(g.war, t + e * BEAT / 2, N(wch[0] - 24), BEAT * 0.35, e % 4 === 0 ? 0.11 : 0.06, 'square');
    }
    if (this._on('stabs')) for (const e of [3, 7]) for (const n of ch) s.brass(g.stabs, t + e * BEAT / 2, N(n), 0.16, 0.045, 0.015, 3200, 700); // step 2: brass stabs on the off-beats
    if (this._on('lead')) for (const [b, n, len] of TUNE[k % 8]) { s.brass(g.lead, t + b * BEAT, N(n), len * BEAT * 0.85, 0.07, 0.04, 3600, 1300); s.brass(g.lead, t + b * BEAT, N(n - 12), len * BEAT * 0.85, 0.035, 0.04, 2000, 800); } // step 3: the tune
    if (this._on('boss')) { // The boss: a low choir on its own chords, and timpani on the beat.
      for (const n of bc) s.brass(g.boss, t, N(n - 12), BAR * 0.95, 0.04, 0.6, 1100, 650);
      for (let b = 0; b < 4; b++) s.chirp(g.boss, t + b * BEAT, N(bc[0] - 24) * 1.25, N(bc[0] - 24), 0.5, b % 2 ? 0.25 : 0.4, 'sine');
    }
  }

  // Build 79: held down under something (a boss's introduction), and back.
  hush(on) { if (!this.g) return; const now = this.s.ctx.currentTime; this.duck.gain.cancelScheduledValues(now); this.duck.gain.setTargetAtTime(on ? 0.25 : 1, now, on ? 0.15 : 0.8); }

  // ---------- stingers ----------
  // A short phrase over the music, which ducks under it. kind: victory, defeat, discovery, milestone, night, dawn.
  sting(kind, at) {
    const s = this.s; if (!s.ctx || (!at && (!s.ready || !s.on))) return 0;
    if (!this.g) this._graph();
    const c = s.ctx, t = (at ?? c.currentTime) + 0.02, o = c.createGain(); o.gain.value = kind === 'victory' || kind === 'defeat' ? 0.8 : 1.5; o.connect(s.fx || s.music);
    const len = STINGS[kind] ? STINGS[kind](s, o, t) : 0;
    if (len) { this.duck.gain.cancelScheduledValues(t); this.duck.gain.setTargetAtTime(0.3, t, 0.08); this.duck.gain.setTargetAtTime(1, t + len, 0.6); }
    return len;
  }
}

const STINGS = {
  // Victory: a rising brass call that lands on A major, a cymbal and timpani under it.
  victory: (s, o, t) => {
    const call = [[0, 64, 0.12], [0.14, 69, 0.12], [0.28, 73, 0.12]];
    for (const [d, n, l] of call) { s.brass(o, t + d, N(n), l, 0.1, 0.01, 3600, 1500); }
    for (const n of [57, 64, 69, 73, 76]) s.brass(o, t + 0.42, N(n), 1.5, n < 60 ? 0.07 : 0.06, 0.03, 3800, 900);
    s.chirp(o, t + 0.42, N(33) * 1.3, N(33), 0.6, 0.45, 'sine'); s.chirp(o, t, N(40) * 1.3, N(40), 0.4, 0.3, 'sine');
    s.puff(o, t + 0.42, 1.6, 7000, 0.12, 'highpass');
    return 2.1;
  },
  // Defeat: a falling phrase that settles low, in the minor.
  defeat: (s, o, t) => {
    for (const [d, n] of [[0, 69], [0.32, 67], [0.64, 64]]) s.brass(o, t + d, N(n), 0.32, 0.06, 0.04, 1600, 600);
    for (const n of [45, 57, 60, 64]) s.brass(o, t + 0.96, N(n), 1.6, 0.05, 0.2, 1200, 400);
    s.chirp(o, t + 0.96, N(33) * 1.2, N(33) * 0.95, 1, 0.3, 'sine');
    return 2.6;
  },
  // Discovery: a sparkling rising arpeggio, with a shimmer.
  discovery: (s, o, t) => {
    [69, 72, 76, 81, 84, 88].forEach((n, i) => { s.blip(o, t + i * 0.07, N(n), 0.6, 0.07, 'sine'); s.blip(o, t + i * 0.07, N(n + 12), 0.2, 0.02, 'sine'); });
    s.puff(o, t + 0.1, 0.9, 9000, 0.05, 'highpass');
    return 1.1;
  },
  // Milestone: a small two-note chime.
  milestone: (s, o, t) => { s.blip(o, t, N(76), 0.4, 0.08, 'sine'); s.blip(o, t + 0.12, N(81), 0.7, 0.08, 'sine'); s.blip(o, t + 0.12, N(93), 0.25, 0.02, 'sine'); return 0.8; },
  // Nightfall: three soft notes falling on the music box.
  night: (s, o, t) => { [76, 72, 69].forEach((n, i) => { s.blip(o, t + i * 0.36, N(n), 1.2, 0.06, 'sine'); s.blip(o, t + i * 0.36, N(n + 19), 0.3, 0.012, 'sine'); }); return 1.6; },
  // Dawn: a bright rising figure, a little like birdsong.
  dawn: (s, o, t) => {
    [69, 73, 76, 81].forEach((n, i) => s.blip(o, t + i * 0.11, N(n), 0.5, 0.06, 'sine'));
    for (let i = 0; i < 3; i++) s.chirp(o, t + 0.55 + i * 0.12, 2800 + i * 300, 3800 + i * 200, 0.07, 0.03, 'sine');
    return 1.1;
  },
};

export const music = new Music();

// Build 77: render the music offline to a 16-bit WAV (base64), for listening outside the game.
// script(t): what's going on at t seconds ({ mode, danger, night, battle, boss, rain }); stings: [[t, kind], …].
export async function renderMusicWav(seconds, script, stings = []) {
  const rate = 44100, ctx = new OfflineAudioContext(1, rate * seconds, rate);
  const os = Object.create(sfx); os.ctx = ctx; os.on = true; os.musicVol = 1;
  os.noise = ctx.createBuffer(1, rate, rate); { const d = os.noise.getChannelData(0); for (let i = 0; i < rate; i++) d[i] = Math.random() * 2 - 1; }
  os.master = ctx.createGain(); os.master.gain.value = 0.8; os.master.connect(ctx.destination);
  os.music = ctx.createGain(); os.music.gain.value = 0.9; os.music.connect(os.master); os.fx = os.master; os.musicFilter = null;
  const m = new Music(os, false); m._graph();
  for (let t = 0; t < seconds; t += 0.25) { const st = script(t); m.set(st.mode || 'yard', st.danger || 0, !!st.rain, st, t); }
  const all = Object.fromEntries(LAYERS.map((k) => [k, 1])); // (offline: every layer is scheduled; the gains decide what's heard)
  let bt = 0.05; for (let k = 0; bt < seconds; k++, bt += BAR) { m.lv = all; m._bar(bt, k); }
  for (const [t, kind] of stings) m.sting(kind, t);
  const data = (await ctx.startRendering()).getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + data.length * 2));
  const str = (o, x) => { for (let i = 0; i < x.length; i++) out.setUint8(o + i, x.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true);
  out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 32767, true);
  let bin = ''; const bytes = new Uint8Array(out.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
