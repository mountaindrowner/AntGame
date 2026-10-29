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
      menu: app.menu, digs: s.nest.digOrders.length, fills: s.nest.fillOrders.length, repairs: s.repairs.length, dug: s.nest.ver,
      full: SIM.antCount(s) >= SIM.queenCap(s.queen.level), store: c.store >= c.cap - 0.5, rain: s.rain.on,
      rivalWar: s.rival.deaths.war || 0, oursWar: c.deaths.rival || 0, antlion: c.deaths.antlion || 0,
      ax: a ? a.x : 0, ay: a ? a.y : 0,
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
      // Priority 2 and 3 (build 11.6).
      if (now.menu !== p.menu) sfx.play(now.menu ? 'sheetOpen' : 'sheetClose');
      if (a && p.ant === a && !P.inNest && Math.hypot(now.ax - p.ax, now.ay - p.ay) > 0.3) { stepAcc += Math.hypot(now.ax - p.ax, now.ay - p.ay); if (stepAcc > 9) { stepAcc = 0; sfx.play('step'); } }
      if (a && p.ant === a && !p.carry && now.carry && now.kind === 'water') sfx.play('drip');
      if (now.msg !== p.msg && /^Too heavy/.test(now.msg || '')) sfx.play('groan');
      if (a && P.hunger < 25) sfx.play('rumble');
      if (now.rivalWar > p.rivalWar || now.oursWar > p.oursWar) sfx.play('bite', at);
      if (now.digs > p.digs) sfx.play('digTick');
      else if (now.digs < p.digs) sfx.play('crumble');
      if (now.fills < p.fills) sfx.play('pat');
      if (now.rooms < p.rooms) sfx.play('crumbleBig');
      if (now.repairs < p.repairs) sfx.play('scrape');
      if (now.full && !p.full) sfx.play('full');
      if (now.store && !p.store) sfx.play('ding');
      if (now.antlion > p.antlion) sfx.play('snap');
      if (p.rain && !now.rain) sfx.play('drips');
      if (now.rain && Math.random() < 0.002) sfx.play('thunder');
    }
    // The sim's events this frame.
    for (const e of events) {
      if (e === 'cavein') sfx.play('cavein');
      else if (e === 'starving' || e === 'soldierfood') sfx.play('starving');
      else if (e === 'treat') sfx.play('treat');
      else if (e === 'raid') sfx.play('raid');
      else if (e === 'queenhit') sfx.play('queenHit');
      else if (e === 'dew') sfx.play('twinkle');
      else if (e === 'bighaul') sfx.play('cheer');
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
    // Ambience: the yard or the nest, and the region's own flavour.
    const outside = app.view !== 'nest';
    sfx.loop('yard', outside ? 0.8 : 0);
    sfx.loop('nest', outside ? 0 : 0.7);
    const ground = SIM.AREAS[SIM.areaOf(s, Math.floor(views.surface.target.x / T), Math.floor(views.surface.target.z / T))]?.ground;
    sfx.loop('crickets', outside && /lawn|long|grass|wild/.test(ground || '') ? 0.6 : 0);
    sfx.loop('wet', outside && /wet|mud/.test(ground || '') ? 0.7 : 0);
    // Builders at work, heard while you watch the nest.
    const chipping = !outside && s.ants.some((o) => o.caste === 'builder' && o.atWork && o.task && o.task[0] !== 'h');
    sfx.loop('chipping', chipping ? 0.6 : 0);
    sfx.loop('trail', a && !P.inNest && P.mark && P.tx != null ? 0.6 : 0);
    if (s.cat) { const e = ear(s.cat.x, s.cat.y); sfx.loop('munch', e.gain * e.gain * 0.6, e.pan); } else sfx.loop('munch', 0);
    p = now;
  }
  let stepAcc = 0;
  // How tense things are, for the music: 0 calm, 1 danger.
  hear.mood = (s) => {
    const a = s.player.ant, c = views.surface.target;
    let d = 0;
    if (s.spider) d = Math.max(d, Math.max(0, 1 - Math.hypot(s.spider.x - c.x, s.spider.y - c.z) / (25 * T)));
    if (s.ants.some((o) => o.team && o.state === 'raid')) d = Math.max(d, 0.8);
    if (s.queen.placed && s.queen.hp < 60) d = 1;
    if ((s.strikes || []).some((st) => Math.hypot(st.x * T - c.x, st.y * T - c.z) < 20 * T)) d = Math.max(d, 0.6);
    return a || s.queen.placed ? d : 0;
  };
  // Behind the title screen: the beds fall silent.
  hear.quiet = () => { for (const k of ['rain', 'mower', 'spider', 'fireants', 'yard', 'nest', 'crickets', 'wet', 'chipping', 'trail', 'munch']) sfx.loop(k, 0); };
  return hear;
}

// Button taps, for every button in the page (HUD, sheets, menus, the map).
export function tapSounds() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (b && b.id !== 'mark' && b.id !== 'recruit' && b.id !== 'release' && b.id !== 'act') sfx.play('tap');
  }, true);
  // A greyed-out button you can't press yet: a dull bonk.
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (b && b.disabled) sfx.play('bonk');
  }, true);
}
