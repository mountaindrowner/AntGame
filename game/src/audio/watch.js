// What makes the game's sounds: each frame, compare the sim with how it was
// last frame and play what changed (a pickup, an egg, a stomp…), plus the
// sim's new events (rain, a raid…). The sim itself knows nothing of sound.
import SIM from '../sim/sim.js';
import { sfx } from './sfx.js';

const { T, DROP } = SIM;

export function soundWatch(app, views) {
  // Heard from where it happens: panned and faded by distance from the
  // camera; surface sounds are quieter from inside the nest.
  sfx.ear = (x, y) => {
    const c = views.surface.target, dx = (x - c.x) / T, d = Math.hypot(dx, (y - c.z) / T);
    let gain = Math.max(0, Math.min(1, 1 - (d - 20) / 50));
    if (app.view === 'nest') gain *= 0.35;
    return { gain, pan: Math.max(-0.8, Math.min(0.8, dx / 30)) };
  };
  let p = null;
  const seenStrike = new WeakMap();

  function hear(s, events) {
    const P = s.player, a = P.ant, c = s.colony, w = s.world;
    const now = {
      world: w, ant: a, carry: a ? a.carry : 0, kind: a ? a.kind : null, inNest: P.inNest, mark: !!P.mark, big: !!P.big,
      followers: s.ants.reduce((n, o) => n + (o.follow ? 1 : 0), 0),
      energy: s.queen.energy, placed: s.queen.placed, level: s.queen.level, queue: c.buildQueue.length, rooms: s.nest.rooms.length,
      eggs: c.eggQueue.length + c.eggs.length, hatching: c.eggs.length, ours: s.ants.reduce((n, o) => n + (!o.team && o.state !== 'dead' ? 1 : 0), 0),
      spiderKills: c.kills.spider || 0, catKills: c.kills.caterpillar || 0, spiderBites: c.deaths.spider || 0,
      won: !!s.won, lost: !!s.lost, msg: P.msg,
    };
    if (p && p.world === w) {
      const at = a ? { x: a.x, y: a.y } : null;
      // Your ant.
      if (p.ant && !a) sfx.play('die');
      else if (!p.ant && a) sfx.play('hatchYou');
      if (a && p.ant === a) {
        if (!p.carry && now.carry) sfx.play('pickup', P.inNest ? null : at);
        else if (p.carry && !now.carry) { if (P.inNest || Math.hypot(a.x / T - w.ex - 0.5, a.y / T - w.ey - 0.5) < 2.5) sfx.play('deliver', null, p.kind); else sfx.play('drop', at); }
        if (p.inNest !== now.inNest) sfx.play(now.inNest ? 'enter' : 'exit');
      }
      if (now.mark !== p.mark) sfx.play(now.mark ? 'toggleOn' : 'toggleOff');
      if (now.followers > p.followers) sfx.play('recruit', null, now.followers);
      else if (p.followers && !now.followers && a) sfx.play('release');
      if (now.big && !p.big) sfx.play('lift');
      if (now.msg !== p.msg && /^Too heavy/.test(now.msg || '')) sfx.play('bonk');
      // The colony and the nest.
      if (!now.placed && now.energy < p.energy) sfx.play('queenDig');
      if (now.placed && !p.placed) sfx.play('buildNest');
      if (now.queue > p.queue) sfx.play('roomPlaced');
      else if (now.queue < p.queue && now.rooms >= p.rooms) sfx.play('roomDone');
      if (now.eggs > p.eggs) sfx.play('layEgg');
      if (now.hatching < p.hatching && now.ours > p.ours) sfx.play('hatch');
      if (now.level > p.level) sfx.play('queenUp');
      if (now.spiderKills > p.spiderKills) sfx.play('spiderDie');
      if (now.catKills > p.catKills) sfx.play('catDie');
      if (now.spiderBites > p.spiderBites && s.spider) sfx.play('spiderBite', { x: s.spider.x, y: s.spider.y });
      if (now.won && !p.won) sfx.play('win');
      if (now.lost && !p.lost) sfx.play('lost');
    }
    // The sim's events this frame.
    for (const e of events) {
      if (e === 'cavein') sfx.play('cavein');
      else if (e === 'starving' || e === 'soldierfood') sfx.play('starving');
      else if (e === 'treat') sfx.play('treat');
      else if (e === 'raid') sfx.play('raid');
      else if (e === 'queenhit') sfx.play('queenHit');
    }
    // Visitors: a warning when one arrives, then its hit, pecks and exit.
    for (const st of s.strikes || []) {
      const pos = { x: st.x * T, y: st.y * T }, D = DROP[st.kind], was = seenStrike.get(st);
      if (!was) {
        if (st.kind === 'foot') sfx.play('footWarn', pos, D.warn);
        else if (st.kind === 'acorn') sfx.play('acornWarn', pos, D.warn);
        else if (st.kind === 'spray') sfx.play('sprayHiss', pos, D.warn + D.hold);
        else if (st.kind === 'bird') sfx.play('birdIn', pos);
        else if (st.kind === 'toad') sfx.play('croak', pos);
      } else {
        if (was.phase === 'warn' && st.phase === 'hold') sfx.play(st.kind === 'acorn' ? 'acornHit' : st.kind === 'foot' ? 'stomp' : 'tap', pos);
        if (st.peckAt != null && st.peckAt !== was.peckAt) sfx.play(st.kind === 'toad' ? 'tongue' : 'peck', pos);
        if (st.phase === 'leave' && was.phase !== 'leave') sfx.play(st.kind === 'toad' ? 'croak' : 'birdOut', pos);
      }
      seenStrike.set(st, { phase: st.phase, peckAt: st.peckAt });
    }
    // Beds: rain, the mower, the spider's menace, fire ants underfoot.
    const ear = (x, y) => sfx.ear(x, y);
    sfx.loop('rain', s.rain.on ? (app.view === 'nest' ? 0.25 : 0.55) : 0);
    const mw = s.mower;
    if (mw && mw.state === 'cut') { const e = ear((w.lawn.x0 + w.lawn.w / 2) * T, mw.y * T); sfx.loop('mower', e.gain * 0.9, e.pan); } else sfx.loop('mower', 0);
    if (s.spider) { const e = ear(s.spider.x, s.spider.y); sfx.loop('spider', e.gain * e.gain * 0.8, e.pan); } else sfx.loop('spider', 0);
    const stung = a && !P.inNest && w.stings.some((z) => Math.hypot(a.x / T - z.x, a.y / T - z.y) < z.r);
    sfx.loop('fireants', stung ? 0.5 : 0);
    p = now;
  }
  // Behind the title screen: the beds fall silent.
  hear.quiet = () => { for (const k of ['rain', 'mower', 'spider', 'fireants']) sfx.loop(k, 0); };
  return hear;
}

// Button taps, for every button in the page (HUD, sheets, menus, the map).
export function tapSounds() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (b && b.id !== 'mark' && b.id !== 'recruit' && b.id !== 'release' && b.id !== 'act') sfx.play('tap');
  }, true);
}
