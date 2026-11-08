// Bosses and guardians (build 19 on) and the wild bosses (builds 54-58): their tables, waking, armour,
// telegraphed attacks, and each one's fight.
import { REGION, areaBounds } from './yard.js';
import { CASTES, H, SURF, T, W, idx } from './core.js';
import { killAnt } from './colony.js';
import { itemAt, walk } from './world.js';
import { gainGlow } from './nest.js';
import { bite, gainGenes, gainXp, has, makeLegend, picked, reachOf, trailHome, youL } from './progress.js';
import { CROWN, spawnZbug, sporeAnt } from './wilds.js';
import { deathTotal } from './outposts.js';
import { isNight } from './tick.js';
import { clearOf } from './spider.js';
import { outside } from './hazards.js';
import { BUGS, nearAnt, playerNear } from './creatures.js';
import { hurtAnt, spark } from './combat.js';
import { exposed, stunned } from './abilities.js';
import { rankOf } from './growth.js';

// Three great beasts, each in its own lair. Each one wakes when ants come
// near, shows every attack before it lands (the renderer paints the danger
// on the ground: b.atk), turns nastier at half health, and once dead stays
// dead and leaves a trophy that changes the colony for good.
//   hornworm: strips the plants your aphids live on; rears and thrashes
//     (a ring), spits goo (a circle), and in its frenzy rolls (a lane).
//   beetle: armoured; charges down a lane and is dazed after, longer if it
//     slams into a rock: that's when bites count. Snaps at ants close by.
//   antlion: the antlion queen, under the sand of the deepest pit. Drags
//     ants down (a swirl under them), flings sand. Eight ants at the pit's
//     edge draw her up; she surfaces after every grab. Later she tunnels
//     from pit to pit.
export const BOSSES = {
  hornworm: { name: 'The Hornworm', title: 'Glutton of the Tomato Rows', region: 'tomatoes', hp: 700, r: 2.6, aggro: 9, meat: 120, chitin: 10, trophy: 'silk', phase2: 0.5, slayer: 'Hornworm-slayer',
    tip: 'It strips the plants your aphids live on. When it rears up, get out of the red ring. Bring a big crew and soldiers.', rage: 'The hornworm thrashes into a frenzy!' },
  beetle: { name: 'The Ground Beetle', title: 'Armoured Hunter of the Rock Garden', region: 'rockgarden', hp: 520, r: 2.2, aggro: 10, meat: 60, chitin: 45, trophy: 'shell', phase2: 0.4, slayer: 'Shell-breaker',
    tip: 'Bites barely scratch its armour. Step out of its charge lane: when it slams into something it is dazed. Then bite!', rage: 'The beetle is enraged: it charges twice!' },
  antlion: { name: 'The Antlion Queen', title: 'Terror of the Sandbox', region: 'sandbox', hp: 480, r: 2.4, aggro: 7, meat: 80, chitin: 25, trophy: 'mandible', phase2: 0.5, slayer: 'Pit-breaker',
    tip: 'She hides under the deepest pit and drags ants down: step off the swirling sand. Eight ants at the pit’s edge draw her up. Then bite!', rage: 'The antlion queen tunnels between the pits!' },
  // Build 30: the Great Lawn's guardian (COMBAT.md). Robins hunt the whole lawn while it rules it.
  robin: { name: 'The Old Robin', title: 'Terror of the Great Lawn', region: 'bare', hp: 600, r: 2.0, aggro: 10, meat: 70, chitin: 0, trophy: 'feather', phase2: 0.5, slayer: 'Robin-chaser', flees: true,
    tip: 'It pecks where the red dot shows, beats its wings at a crowd and hops after the rest. Six ants on its feet pin it: no hopping, no flying off, and bites do double.', rage: 'The Old Robin takes to the air: watch its shadow, and get out of its swoop!' },
  // Build 31: the Wet Edge's guardian.
  toad: { name: 'Old Warty', title: 'King of the Wet Edge', region: 'toadhole', hp: 750, r: 2.4, aggro: 9, meat: 140, chitin: 0, trophy: 'poison', phase2: 0.5, slayer: 'Toad-sticker',
    tip: 'Its tongue shoots down the thin red lane and swallows the first ant in it: bite the toad within 3 seconds and it spits the ant out alive. It only looks ahead: bites from behind do double. Its skin is poison, unless a medic is near.', rage: 'Old Warty puffs himself up and lashes twice!' },
  // Build 34: the Hedge Row's guardian.
  mantis: { name: 'The Praying Mantis', title: 'Ghost of the Hedge Row', region: 'hedge3', hp: 560, r: 2.2, aggro: 6, meat: 90, chitin: 15, trophy: 'claw', phase2: 0.5, slayer: 'Mantis-breaker',
    tip: 'You won’t see it until you’re close. When it sways, get out of the lane in front of it: it grabs what’s there and eats it. While it eats, its claws are busy: bite it for double. A Mandible Lock makes it drop its meal.', rage: 'The mantis strikes twice now, and flutters after you!' },
  // Build 35: the Side Yard's guardian.
  widow: { name: 'The Black Widow', title: 'Queen of the Shed', region: 'shed', hp: 520, r: 1.8, aggro: 8, meat: 60, chitin: 20, trophy: 'widowsilk', phase2: 0.5, slayer: 'Web-cutter',
    tip: 'Her web holds anything that walks into it, and her bite is deadly. Bite through the four white anchors at its edge and she drops to the floor: swarm her then, bites do double. A Mandible Lock works on her anywhere.', rage: 'The widow drops on a thread to spin a new web!' },
  // Build 36: the Rot's guardian.
  centipede: { name: 'The Giant Centipede', title: 'Terror of the Rot', region: 'leaves2', hp: 540, r: 2.0, aggro: 9, meat: 100, chitin: 30, trophy: 'fang2', phase2: 0.34, slayer: 'Centipede-cutter',
    tip: 'Six segments: every 90 damage cuts one off, and it gets faster for it. When it coils, get out of the ring, but bite it then too: its joints are open (double). When it shows a lane, it rushes down it.', rage: 'Two segments left: the centipede goes frantic!' },
  // Build 54: the first wild boss (WILDS.md). Wakes only for a muster of three colonies.
  duke: { name: 'The Duke', title: 'Lord of the Ditch', region: 'drain', hp: 2600, r: 3.4, aggro: 10, meat: 320, chitin: 0, trophy: 'croak', phase2: 0.5, slayer: 'Duke-drowner', wild: 'south', need: 3,
    tip: 'A bullfrog three times Old Warty, fat on what seeps from the green seams. He ignores a crew: only a muster of three colonies rouses him (tap the map, call a muster here). He gulps whole crews where the orange ring shows: bite him hard, fast, and he retches them up. He dives and surfaces where the water stirs. Thirty ants on him and he can’t dive.', rage: 'The Duke is furious: he gulps faster and dives more often!' },
  // Build 55: the second wild boss, over the Bramble Lot (the west side).
  crow: { name: 'Nevermore', title: 'the Raven of the Bramble Lot', region: 'side3', hp: 2200, r: 2.6, aggro: 12, meat: 220, chitin: 0, trophy: 'blackfeather', phase2: 0.5, slayer: 'Raven-grounder', wild: 'west', need: 3,
    tip: 'A raven the glow has made huge, old and cruel: one eye milked white by an old fight, the other glinting green. Only a muster of three colonies draws him down to fight at all. He circles out of reach, snatches ants, and steals glowrock. He can’t resist a shiny thing: lift the bottle cap by his roost with a crew and carry it under him, and down he comes. Then swarm him: twenty ants on him keep him grounded.', rage: 'Nevermore shrieks: he snatches faster and won’t stay down as long!' },
  // Build 56: the third wild boss, deep in the hedge on the east side. Needs four colonies.
  hollow: { name: 'The Cordyceps Colony', title: 'The Dead Nest in the Hedge', region: 'hedge5', hp: 2800, r: 2.8, aggro: 12, meat: 0, chitin: 40, trophy: 'sporeheart', phase2: 0.5, slayer: 'Heart-breaker', wild: 'east', need: 4,
    tip: 'A whole ant colony the fungus has taken. At its heart, a great fungal stalk; only a muster of four colonies dares it. Infected ants pour out in waves and their bites carry spores; green clouds burst where the ring shows. Spored ants die in 25 seconds unless a medic reaches them, or they get home to the nurses. While six or more infected guard the heart, it shrugs off bites: cut them down, then strike.', rage: 'The heart pulses faster: the waves come thicker!' },
  // Build 57: the fourth wild boss, high on the Oak's trunk. Needs four colonies; you climb to her.
  hornets: { name: 'The Hornet Queen', title: 'Lady of the Oak’s Crown', region: 'oak', hp: 2600, r: 3, aggro: 14, meat: 260, chitin: 30, trophy: 'comb', phase2: 0.5, slayer: 'Comb-breaker', wild: 'oak', need: 4,
    tip: 'Her paper nest hangs high on the Oak’s trunk. A muster of four colonies at the Oak’s foot wakes her. Then climb: stand by the trunk and press Climb, and your crew climbs with you. Only ants up at her nest can bite her. Her hornets dive at climbers (a ring flashes on the ant they pick) and knock them off the bark; hunting wasps harry the ground below. When she rages, a swarm sweeps the upper trunk, unless a dozen of you hold together at the top.', rage: 'The Hornet Queen rages: her swarm sweeps the bark!' },
  // Build 58: the last wild boss, in the Sinkhole where the fire ants' mound caved in. Needs the Supercolony.
  blind: { name: 'Old Blind', title: 'The Thing Under the Mound', region: 'firemound', hp: 4200, r: 3.6, aggro: 14, meat: 400, chitin: 0, trophy: 'blindclaw', phase2: 0.5, slayer: 'Mole-ender', wild: 'south', need: 5, needEvo: 'supercolony',
    tip: 'A mole that has eaten glow-fed grubs for years: huge, half-blind, and wrong. Only the Supercolony, mustered five colonies strong, can face it. It swims under the earth (watch the ridge of dirt), then erupts where the ring shows, flinging everything. Up, it swipes with its great claws. Bite it while it’s up. Don’t linger on the green: the open seam burns.', rage: 'Old Blind thrashes: it erupts again and again!' },
};
export const ROT_ZONE = new Set(['leaves', 'leaves2', 'compost']);
export const SIDE_ZONE = new Set(['shed', 'side2', 'side3', 'side4']);
export const HEDGE_ZONE = new Set(['hedge1', 'hedge2', 'hedge3', 'hedge4', 'hedge5', 'hedge6']);
export const WET_ZONE = new Set(['toadhole', 'thistles', 'reeds', 'slugs', 'drain', 'mudflat', 'wetedge']);
// The Great Lawn: the regions the Old Robin rules (no robins over them once it's driven off).
export const LAWN_ZONE = new Set(['lawn', 'clover', 'molehills', 'dandelions', 'pool', 'sprinkler', 'fairyring', 'gnome', 'frisbee', 'bone', 'cloverhill', 'truck', 'bare', 'longgrass', 'daisies', 'lawnedge']);
export const TROPHY = {
  silk: { name: 'Hornworm silk', fx: 'builders build rooms twice as fast' },
  shell: { name: 'The beetle’s shell', fx: 'you can build an Armory: every ant 50% tougher, foragers shrug off a foot or beak' },
  mandible: { name: 'The antlion’s mandible', fx: 'fighters bite 15% harder, and the pits never drag your ants down' },
  feather: { name: 'The Old Robin’s feather', fx: 'birds never take your ants, and no robins hunt the Great Lawn' },
  fang2: { name: 'The centipede’s fang', fx: 'Venom ants stun what they bite for a second; no toads in the leaves, and the Rot can be held' },
  widowsilk: { name: 'The widow’s silk', fx: 'a web at your door: raiders stick in it for 3 seconds, and no bug spray in the shed' },
  claw: { name: 'The mantis’s claw', fx: 'each of your fighters’ first bite on a foe always lands, for double; the hedge is safe, and your ants run through it half again faster' },
  blindclaw: { name: 'Old Blind’s claw', fx: 'the glow is yours: the Sinkhole’s open seam gives a glowrock every 5 minutes. And the Takeover can be evolved' },
  comb: { name: 'The hornets’ comb', fx: 'hornet larvae: 3 🥩 meat a minute, for good' },
  sporeheart: { name: 'The spore heart', fx: 'your colony is immune to the fungus for good: no outbreaks, no spores' },
  blackfeather: { name: 'Nevermore’s feather', fx: 'the Bramble Lot is yours: no birds strike anywhere on the west side, and your outposts there can’t be knocked flat' },
  croak: { name: 'The Duke’s croak', fx: 'the Ditch is yours: water never runs short, and builders mend cave-ins four times as fast' },
  poison: { name: 'Old Warty’s poison', fx: 'your ants taste bitter: toads, birds and spiders spit out half the ants they catch, and no toads hunt the Wet Edge' },
};
// Where each boss lives, made when its region first wakes.
export function ensureBoss(s, key){
  if (s.bosses[key]) return s.bosses[key];
  const B = BOSSES[key], ai = REGION[B.region]; if (ai == null || !s.active[ai]) return null;
  if (B.wild && !(s.wild && s.wild.stirred)) return null; // build 54: wild bosses wake with the edges
  const w = s.world, b0 = areaBounds(ai), cl = clearOf(s);
  let x = null, y = null, pit = -1;
  if (key === 'blind'){ const sk = s.wild && s.wild.sinkhole; if (!sk) return null; x = sk.x + 0.5; y = sk.y + 0.5; } // build 58: in the Sinkhole
  else if (key === 'hornets'){ const oak = w.landmarks.find(l => l.kind === 'oak'); if (!oak) return null; x = oak.x; y = oak.y + oak.r + 2.5; } // build 57: at the Oak's foot, on its south face
  else if (key === 'antlion'){
    // The deepest pit: the one farthest from your nest.
    let bd = -1; w.pits.forEach((p, i) => { const d = Math.hypot(p.x - w.ex, p.y - w.ey); if (d > bd){ bd = d; pit = i; } });
    if (pit < 0) return null; x = w.pits[pit].x; y = w.pits[pit].y;
  } else {
    const shed = key === 'widow' ? w.landmarks.find(l => l.kind === 'shed') : null;
    let best = -1; const cx = key === 'mantis' || key === 'hollow' ? b0.x0 + 5 : shed ? shed.x0 + shed.w + 5 : (b0.x0 + b0.x1)/2, cy = shed ? shed.y0 + shed.h*0.4 : (b0.y0 + b0.y1)/2; // the mantis at the hedge's edge; the widow by the shed wall // the mantis waits at the hedge's edge, facing the lawn
    for (let ty = b0.y0 + 6; ty < b0.y1 - 6; ty += 2) for (let tx = b0.x0 + 6; tx < b0.x1 - 6; tx += 2){
      const room = cl[ty*W + tx]; if (room < (key === 'mantis' ? 2 : 4)) continue;
      const sc = room*3 - Math.hypot(tx - cx, ty - cy)*(key === 'mantis' || key === 'widow' || key === 'hollow' ? 1.5 : 0.3); if (sc > best){ best = sc; x = tx + 0.5; y = ty + 0.5; } }
    if (x == null) return null;
  }
  return (s.bosses[key] = { key, x: x*T, y: y*T, hx: x*T, hy: y*T, hp: B.hp, maxHp: B.hp, mode: 'idle', phase: 1, atk: null, cd: 2, dx: 1, dy: 0, t: 0, pit, under: key === 'antlion', dead: false });
}
export const bossArmour = (s, b, a) => {
  if (b.key === 'hollow') return (b.guards || 0) >= 6 ? 0.3 : b.phase === 2 ? 1.2 : 1; // build 56: shielded by its infected
  if (b.key === 'beetle'){ if (b.dazeT > 0) return 2.5; return a.caste === 'venom' ? 0.5 : a.isPlayer ? 0.35 : 0.15; }
  if (b.key === 'antlion') return b.under ? 0 : 1;
  if (b.key === 'robin') return b.air ? 0 : b.pinned ? 2 : 1;
  if (b.key === 'mantis') return b.eat ? 2 : 1;
  if (b.key === 'widow') return b.grounded ? 2 : 0.35; // up in her web she is hard to reach
  if (b.key === 'centipede') return b.atk && b.atk.kind === 'ring' ? 2 : b.rush ? 0.6 : 1; // coiled, its joints are open
  if (b.key === 'toad'){ const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, behind = ((a.x - b.x)*b.dx + (a.y - b.y)*b.dy)/d < -0.3; return (behind ? 2 : 1)*(b.puffT > 0 ? 0.5 : 1); }
  return 1;
};
export function tickBosses(s, dt){
  for (const key in BOSSES) ensureBoss(s, key);
  const P = s.player, yb = youL(s) >= 3 ? 1.5 : 1, c = s.colony;
  for (const key in s.bosses){
    const b = s.bosses[key], B = BOSSES[key]; if (b.dead) continue;
    b.t += dt; if (b.slowT > 0) b.slowT -= dt;
    // The first time you come near: its name, and how to beat it.
    if (!b.intro && playerNear(s, b.x, b.y, 18) && !(key === 'mantis' && b.mode === 'idle')){ /* the mantis stays a secret until it shows itself */ b.intro = true; s.bossIntro = { key, t: s.t }; s.events.push('boss'); P.msg = `${B.name}, ${B.title}. ${B.tip}`; }
    let near = nearAnt(s, b, B.aggro*T, (o) => !o.team); // (build 25: rival colonies living near a boss don't wake it)
    const wildOk = !B.wild || b.mode === 'fight' || musterHere(s, b, B); if (!wildOk) near = null; // build 54: a wild boss wakes only for a big enough muster
    if (key === 'robin'){ b.asleep = isNight(s) && b.mode === 'idle'; if (b.asleep) near = null; } // build 43: asleep on its roost till something bites it
    if (b.mode === 'idle' && (near || s.t - (b.hitT ?? -9) < 1)){ b.mode = 'fight'; b.leaveT = 0; b.wakeAt = s.t; b.cost0 = deathTotal(c); s.events.push('bossawake'); }
    // Build 78 (Mark: "everything stops and the ants turn their attention to the boss"): the first time you're within
    // fighting range of it awake, its introduction (the UI freezes the game and plays it; docs/BOSS-INTROS.md).
    if (b.mode === 'fight' && !b.shown && playerNear(s, b.x, b.y, 22)){ b.shown = true; s.introSeq = { kind: 'boss', key, x: b.x, y: b.y, t: s.t }; }
    if (b.mode === 'fight'){
      if (!nearAnt(s, b, 30*T)){ b.leaveT += dt; if (b.leaveT > 8){ b.mode = 'idle'; b.atk = null; b.charge = null; b.roll = null; } } else b.leaveT = 0;
    } else if (b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + 2*dt); // left alone, it heals
    // Bitten by fighters, your crew and you; fighters on patrol nearby join in.
    const lpit = b.key === 'antlion' && s.world.pits[b.pit], reach = lpit ? (lpit.r*1.05 + 1.2)*T /* build 47: bitten from the rim, off the sliding sand */ : (B.r + 0.9)*T, arm0 = (b.key === 'antlion' && b.under) || (b.key === 'robin' && b.air) || (b.key === 'duke' && b.under) || (b.key === 'crow' && b.air) || (b.key === 'blind' && b.under) || !wildOk;
    let onIt = 0;
    for (const a of s.ants){
      if (a.team || !outside(a)) continue;
      const fighter = CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer, d = Math.hypot(a.x - b.x, a.y - b.y);
      if (fighter && !arm0 && d < reach*reachOf(s, a) && (key !== 'hornets' || (a.climb || 0) >= CROWN - 40)){ // (build 57: the Hornet Queen only from the top of the climb)
        onIt++;
        // Old Warty's skin is poison to bite, unless a medic is close by.
        if (key === 'toad' && !s.ants.some(m => m.caste === 'medic' && !m.team && outside(m) && Math.hypot(m.x - a.x, m.y - a.y) < 5*T)) hurtAnt(s, a, 0.35*dt, 'toad');
        if (a.state === 'dead') continue;
        const arm = bossArmour(s, b, a)*(exposed(s, b) ? 1.5 : 1)*(a.isPlayer || B.wild ? 1 : BOSS_TUNE.hide), dmg = bite(s, a, 'boss')*dt*(a.isPlayer ? 2*yb : 1)*arm;
        b.hp -= dmg; gainXp(s, a, dmg/3); b.hitT = s.t; (b.biters || (b.biters = {}))[a.id] = s.t;
        spark(s, a, a.x + (b.x - a.x)*0.6, a.y + (b.y - a.y)*0.6, arm < 0.5 ? 2 : 0);
        if (a.caste === 'venom' && picked(s, 'venom', 'neurotoxin') && Math.random() < dt*0.8) b.slowT = 1.5;
      } else if (b.mode === 'fight' && d < 8*T && CASTES[a.caste].fight >= 3 && (a.state === 'patrol' || a.state === 'hunt')){ a.state = 'fight'; a.goal = 'boss'; a.bossKey = key; }
    }
    b.onIt = onIt;
    if (key === 'crow') b.pinned = !b.air && onIt >= 20;
    if (key === 'duke'){ const was = b.pinned; b.pinned = !b.under && onIt >= 30; if (b.pinned && !was && playerNear(s, b.x, b.y, 30)) P.msg = 'Thirty of your ants hold the Duke down: he can’t dive!'; }
    if (key === 'robin'){ const was = b.pinned; b.pinned = !b.air && (onIt >= 6 || (isNight(s) && onIt >= 3)); /* build 43: groggy at night, three ants hold it */ if (b.pinned && !was && playerNear(s, b.x, b.y, 24)) P.msg = 'Your ants have the Old Robin by the feet: it’s pinned! Bites do double!'; }
    if (b.phase === 1 && b.hp < b.maxHp*B.phase2){ b.phase = 2; s.events.push('bossphase'); if (playerNear(s, b.x, b.y, 30)) P.msg = B.rage; }
    if (b.hp <= 0){ bossDies(s, b, B); continue; }
    if (key === 'mantis' && b.eat && stunned(s, b)) mantisDrops(s, b, 'Locked in your jaws, the mantis drops its meal!');
    if (stunned(s, b)) continue; // build 32: Mandible lock
    if (key === 'hornworm') stepHornworm(s, b, B, dt);
    else if (key === 'beetle') stepBeetle(s, b, B, dt);
    else if (key === 'robin') stepRobin(s, b, B, dt);
    else if (key === 'toad') stepToad(s, b, B, dt);
    else if (key === 'duke') stepDuke(s, b, B, dt);
    else if (key === 'crow') stepCrow(s, b, B, dt);
    else if (key === 'hollow') stepHollow(s, b, B, dt);
    else if (key === 'hornets') stepHornets(s, b, B, dt);
    else if (key === 'blind') stepBlind(s, b, B, dt);
    else if (key === 'mantis') stepMantis(s, b, B, dt);
    else if (key === 'widow') stepWidow(s, b, B, dt);
    else if (key === 'centipede') stepCentipede(s, b, B, dt);
    else stepAntlion(s, b, B, dt);
    crewDodge(s, b); // build 82: your ants read its tells
  }
  // Goo the hornworm spat: it slows ants that walk through it.
  s.goo = s.goo.filter(g => s.t < g.end);
  for (const g of s.goo) for (const a of s.ants) if (outside(a) && Math.hypot(a.x - g.x, a.y - g.y) < g.r) a.slowT = Math.max(a.slowT || 0, 0.4);
}
function bossDies(s, b, B){
  const c = s.colony, P = s.player, x = Math.floor(b.x/T), y = Math.floor(b.y/T);
  b.dead = true; b.deadT = s.t;
  /* build 41: whatever it holds or is eating goes free (it used to stay 'away' for good) */
  if (b.held){ const H = b.held, a = s.ants.find(o => o.id === H.id); b.held = null; if (a && a.state === 'away'){ a.state = H.state || 'return'; a.x = b.x; a.y = b.y; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); } }
  if (b.eat) mantisDrops(s, b, null);
  if (b.belly) dukeRetch(s, b);
  if (b.key === 'blind'){ b.under = false; b.burrow = null; s.takeoverReady = { t: s.t }; s.events.push('takeoverready'); } // build 58
  if (b.key === 'hornets'){ for (const a of s.ants) if (a.climb){ a.climb = 0; if (a.state === 'climb') a.state = a.isPlayer ? 'player' : 'follow'; } s.player.climb = null; } // build 57: everyone comes down
  if (b.key === 'hollow'){ for (const z of s.critters) if (z.kind === 'zombie') z.gone = true; for (const a of s.ants) a.hspore = null; } // build 56: the infected fall with the heart
  if (b.key === 'crow'){ crowDrops(s, b); if (b.loot){ s.colony.glow += b.loot; b.loot = 0; } b.air = false; } // build 55: what he stole comes back
  if (B.wild){ s.wild.beaten[B.wild] = true; gainGlow(s, 2, 'guardian'); } // build 54: a wild boss's side goes quiet; it was glow-fed
  b.under = false; b.dive = null;
  b.atk = null; b.charge = null; b.roll = null; b.swoop = null; b.air = false;
  // The carcass: meat in heaps round it, and its chitin. (The Old Robin flies off, dropping the grubs it had.)
  for (let k = 0; k < 4; k++){ const a = k*Math.PI/2 + 0.4, mx = Math.round(x + Math.cos(a)*2), my = Math.round(y + Math.sin(a)*2); if (walk(s, mx, my)) s.items.push({ x: mx, y: my, kind: 'protein', type: 'boss', amt: Math.round(B.meat/4) }); }
  if (B.chitin && walk(s, x, y)) s.items.push({ x, y, kind: 'chitin', type: 'shell', amt: B.chitin });
  const ours = Object.entries(b.biters || {}).filter(([, t]) => s.t - t < 10).map(([id]) => s.ants.find(a => a.id === +id)).filter(a => a && a.state !== 'dead');
  for (const a of ours) gainXp(s, a, 50);
  if (ours.length) makeLegend(s, ours[Math.floor(Math.random()*ours.length)], B.slayer);
  if (picked(s, 'venom', 'hunter')) trailHome(s, b.x, b.y);
  c.trophies[B.trophy] = true; c.kills[b.key] = (c.kills[b.key] || 0) + 1;
  gainGenes(s, 6, B.name.replace(/^The /, 'the ') + ' is dead'); // build 42: was 4, so the tree's top nodes come with the boss wins
  const lost = deathTotal(c) - (b.cost0 || 0);
  s.report = { kind: 'boss', key: b.key, lost, t: s.t }; s.events.push('bossdown');
  s.bossDown = { key: b.key, t: s.t };
  P.msg = `${B.name} ${B.flees ? 'flies off for good' : 'is dead'}! It cost you ${lost} ant${lost === 1 ? '' : 's'}. Trophy: ${TROPHY[B.trophy].name}: ${TROPHY[B.trophy].fx}.`;
}
// Build 82 (docs/FAR-YARD.md): your fighters read a guardian's tells. When it shows an attack (the red ring, the
// lane), each of your ants inside it may jump clear before it lands: half of fresh hatchlings, more with each rank,
// nine in ten Legends. Before this only you could dodge, and the crew stood in every ring.
export const dodgeChance = (a) => 0.5 + 0.1*rankOf(a);
// How hard a guardian's hide is to bite through, for your fighters (not you): tuned so a fight takes about a minute.
export const BOSS_TUNE = { hide: 0.5 }; // (Mark's call: from the fight table in docs/FAR-YARD.md)
function crewDodge(s, b){
  const k = b.atk; if (!k || k === b.dodgeFor) return; b.dodgeFor = k;
  const left = Math.max(0.35, (k.at || 1) - (k.t || 0));
  for (const a of s.ants){
    if (a.team || a.isPlayer || a.state === 'dead' || !outside(a) || !(a.follow || CASTES[a.caste].fight >= 3)) continue;
    if (!inAtk(k, a.x, a.y) || Math.random() > dodgeChance(a)) continue;
    let ex, ey;
    if (k.kind === 'lane'){ const ux = a.x - k.x, uy = a.y - k.y, across = -ux*k.dy + uy*k.dx, side = across >= 0 ? 1 : -1, push = k.w/2 + 0.9*T - Math.abs(across); ex = a.x - k.dy*side*push; ey = a.y + k.dx*side*push; }
    else { let dx = a.x - k.x, dy = a.y - k.y, d = Math.hypot(dx, dy); if (d < 1){ const r = Math.random()*Math.PI*2; dx = Math.cos(r); dy = Math.sin(r); d = 1; } const push = k.r + 0.9*T - d; ex = a.x + dx/d*push; ey = a.y + dy/d*push; }
    if (!walk(s, Math.floor(ex/T), Math.floor(ey/T)) || (s.world.pit && s.world.pit[idx(Math.floor(ex/T), Math.floor(ey/T))])) continue; // (not into a wall or a pit)
    a.dodge = { x: ex, y: ey, until: s.t + left + 0.25 };
  }
}
// Build 82: where your crew should go when you set it on a guardian with a trick to it. The antlion: round the rim
// of her pit, each at its own angle (eight there draw her up; from there they bite her; nobody walks into the sand).
// The widow on her web: the nearest anchor still standing, then her once she drops. Null: just go for it.
export function bossAim(s, A, a){
  if (!A || A.kind !== 'boss') return null; const b = s.bosses && s.bosses[A.ref]; if (!b || b.dead) return null;
  if (A.ref === 'antlion'){ const p = s.world.pits[b.pit]; if (!p) return null; const px = p.x*T, py = p.y*T, R = (p.r*1.05 + 0.7)*T; const cur = Math.atan2(a.y - py, a.x - px);
    // Each takes its own spot along the rim (not all bunched where they came in), and walks round to it a short step
    // at a time, so nobody cuts across the sand.
    if (!a.rim || a.rim.t !== A.t) a.rim = { t: A.t, ang: cur + ((a.id % 9) - 4)*0.32 };
    const diff = Math.atan2(Math.sin(a.rim.ang - cur), Math.cos(a.rim.ang - cur)), ang = cur + Math.max(-0.45, Math.min(0.45, diff));
    return { x: px + Math.cos(ang)*R, y: py + Math.sin(ang)*R, reach: 0.5*T }; }
  if (A.ref === 'widow' && !b.grounded && b.web){ let best = null, bd = 1e9; for (const an of b.web.anchors){ if (an.hp <= 0) continue; const d = Math.hypot(an.x - a.x, an.y - a.y); if (d < bd){ bd = d; best = an; } } return best ? { x: best.x, y: best.y, reach: 0.8*T } : null; }
  return null;
}
// Ants inside a telegraphed attack's shape.
function inAtk(k, x, y){
  if (k.kind === 'ring' || k.kind === 'spit' || k.kind === 'grab' || k.kind === 'toss') return Math.hypot(x - k.x, y - k.y) < k.r;
  // a lane: from (x, y) along (dx, dy), len long, w wide
  const ux = x - k.x, uy = y - k.y, along = ux*k.dx + uy*k.dy, across = Math.abs(-ux*k.dy + uy*k.dx);
  return along > -T && along < k.len && across < k.w/2;
}
export function shove(s, a, fx, fy, tiles){ const d = Math.hypot(a.x - fx, a.y - fy) || 1; a.knockT = 0.3; a.kx = (a.x - fx)/d*tiles*T/0.3; a.ky = (a.y - fy)/d*tiles*T/0.3; }
const bossTarget = (s, b, r) => nearAnt(s, b, r*T);
function bossWalk(s, b, gx, gy, speed, dt){
  // Kept to its lair: never more than 16 tiles from home.
  if (Math.hypot(gx - b.hx, gy - b.hy) > 16*T){ const k = 16*T/Math.hypot(gx - b.hx, gy - b.hy); gx = b.hx + (gx - b.hx)*k; gy = b.hy + (gy - b.hy)*k; }
  const ddx = gx - b.x, ddy = gy - b.y, d = Math.hypot(ddx, ddy); if (d < 2) return;
  const base = Math.atan2(ddy, ddx), m = Math.min(d, speed*SURF*dt*(b.slowT > 0 ? 0.5 : 1)), cl = clearOf(s);
  for (const off of [0, 0.6, -0.6, 1.2, -1.2]){
    const nx = b.x + Math.cos(base + off)*m, ny = b.y + Math.sin(base + off)*m, tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    if (tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2 || cl[ty*W + tx] < 2) continue;
    b.x = nx; b.y = ny; b.dx = Math.cos(base + off); b.dy = Math.sin(base + off); return;
  }
}
function stepHornworm(s, b, B, dt){
  const w = s.world, ai = REGION[B.region];
  // It eats the plants: the aphids round it wither.
  for (const f of s.items) if (f.type === 'aphids' && w.area[idx(f.x, f.y)] === ai && Math.hypot((f.x + 0.5)*T - b.x, (f.y + 0.5)*T - b.y) < 18*T) f.amt = Math.max(0, f.amt - 0.5*dt);
  if (!b.warnedAphids && playerNear(s, b.x, b.y, 22)){ b.warnedAphids = true; if (!b.intro) s.player.msg = 'Something huge is stripping the tomato plants. The aphids there are dying.'; }
  if (b.mode === 'idle'){ if (!b.gx || b.t > 8){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*5*T; b.gy = b.hy + Math.sin(a)*5*T; } bossWalk(s, b, b.gx, b.gy, 5, dt); return; }
  const fast = b.phase === 2;
  // Rolling: it barrels down the lane it showed.
  if (b.roll){ const R = b.roll; R.t += dt; const u = Math.min(1, R.t/0.9); b.x = R.x0 + R.dx*R.len*u; b.y = R.y0 + R.dy*R.len*u;
    for (const a of s.ants) if (outside(a) && !R.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < B.r*T){ R.hit[a.id] = 1; hurtAnt(s, a, 5, 'hornworm'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x - R.dy*40, b.y + R.dx*40, 1.5); }
    if (u >= 1){ b.roll = null; b.cd = 2; b.atkDone = { kind: 'roll', t: s.t }; } return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.kind === 'ring'){ k.x = b.x; k.y = b.y; }
    if (k.t < k.at) return;
    b.atk = null; b.cd = fast ? 2.4 : 3.8; b.atkDone = { kind: k.kind, x: k.x, y: k.y, t: s.t };
    if (k.kind === 'ring') for (const a of s.ants){ if (!outside(a) || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 4, 'hornworm'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); }
    else if (k.kind === 'spit'){ s.goo.push({ x: k.x, y: k.y, r: k.r, t: s.t, end: s.t + 7 }); for (const a of s.ants) if (outside(a) && inAtk(k, a.x, a.y)){ hurtAnt(s, a, 1.5, 'hornworm'); a.slowT = 4; } }
    else if (k.kind === 'lane'){ b.roll = { x0: b.x, y0: b.y, dx: k.dx, dy: k.dy, len: k.len, t: 0, hit: {} }; }
    return; }
  b.cd -= dt;
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg;
  if (b.cd <= 0){
    if (d < 3.4*T) b.atk = { kind: 'ring', x: b.x, y: b.y, r: 3.6*T, t: 0, at: fast ? 0.9 : 1.2 };
    else if (fast && Math.random() < 0.5){ const dx = (a.x - b.x)/d, dy = (a.y - b.y)/d; b.dx = dx; b.dy = dy; b.atk = { kind: 'lane', x: b.x, y: b.y, dx, dy, len: Math.min(10*T, d + 3*T), w: 2.4*T, t: 0, at: 1.2 }; }
    else b.atk = { kind: 'spit', x: a.x, y: a.y, r: 2.4*T, t: 0, at: 1.4 };
    return;
  }
  if (d > B.r*T*1.1) bossWalk(s, b, a.x, a.y, fast ? 16 : 10, dt);
}
// The Old Robin (build 30). Pecks at a red dot, beats its wings at a crowd, hops after the rest. In its
// second phase it takes off: its shadow circles the lair, then it swoops down a lane and lands. Six ants
// on its feet pin it: no hops, no take-off, bites double.
function stepRobin(s, b, B, dt){
  if (b.mode === 'idle' && b.asleep){ b.air = false; return; } // asleep on the roost
  if (b.mode === 'idle'){ b.air = false; if (!b.gx || b.t > 5){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*5*T; b.gy = b.hy + Math.sin(a)*5*T; b.hopAt = s.t; } bossWalk(s, b, b.gx, b.gy, 12, dt); return; }
  const fast = b.phase === 2;
  // Swooping down the lane it showed: anything in the way is struck.
  if (b.swoop){ const S = b.swoop; S.t += dt; const u = Math.min(1, S.t/0.6); b.x = S.x0 + S.dx*S.len*u; b.y = S.y0 + S.dy*S.len*u;
    for (const a of s.ants) if (outside(a) && !a.team && !S.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < 1.5*T){ S.hit[a.id] = 1; hurtAnt(s, a, 5, 'bird'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); }
    if (u >= 1){ b.swoop = null; b.air = false; b.cd = 2.2; b.atkDone = { kind: 'stop', t: s.t, x: b.x, y: b.y }; b.landAt = s.t; } return; }
  // Aloft: it circles its lair, out of reach, then picks a lane.
  if (b.air && !b.atk){ b.airT -= dt; b.ang = (b.ang || 0) + dt*1.1; const gx = b.hx + Math.cos(b.ang)*6*T, gy = b.hy + Math.sin(b.ang)*6*T; b.x += (gx - b.x)*Math.min(1, dt*2); b.y += (gy - b.y)*Math.min(1, dt*2);
    if (b.airT <= 0){ const tg = bossTarget(s, b, 20); if (!tg){ b.air = false; b.landAt = s.t; return; } const [a, d] = tg, dx = (a.x - b.x)/d, dy = (a.y - b.y)/d; b.dx = dx; b.dy = dy; b.atk = { kind: 'lane', x: b.x, y: b.y, dx, dy, len: Math.min(14*T, d + 3*T), w: 2.2*T, t: 0, at: 0.9 }; }
    return; }
  // Hopping: a quick bound toward the crowd.
  if (b.hop){ const H = b.hop; H.t += dt; const u = Math.min(1, H.t/0.35); b.x = H.x0 + (H.x1 - H.x0)*u; b.y = H.y0 + (H.y1 - H.y0)*u; if (u >= 1) b.hop = null; return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t };
    if (k.kind === 'lane'){ b.swoop = { x0: b.x, y0: b.y, dx: k.dx, dy: k.dy, len: k.len, t: 0, hit: {} }; return; }
    if (k.what === 'peck'){ b.peckAt = s.t; for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 6, 'bird'); spark(s, null, a.x, a.y, 1); } }
    else { b.beatAt = s.t; for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 2, 'bird'); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2.5); } }
    b.cd = fast ? 1.3 : 1.9; return; }
  b.cd -= dt; b.flyCd = (b.flyCd ?? 6) - dt;
  // Phase 2: up it goes, unless your ants have it by the feet.
  if (fast && !b.pinned && b.flyCd <= 0 && !isNight(s)){ /* (no flying in the dark) */ b.air = true; b.airT = 3; b.flyCd = 9; b.ang = Math.atan2(b.y - b.hy, b.x - b.hx); b.upAt = s.t; return; }
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (b.cd <= 0){
    let crowd = 0; for (const o of s.ants) if (outside(o) && !o.team && Math.hypot(o.x - b.x, o.y - b.y) < 2.6*T) crowd++;
    if (crowd >= 5) b.atk = { kind: 'ring', what: 'beat', x: b.x, y: b.y, r: 3.2*T, t: 0, at: fast ? 0.8 : 1.0 };
    else if (d < 3.5*T) b.atk = { kind: 'ring', what: 'peck', x: a.x, y: a.y, r: 1.1*T, t: 0, at: fast ? 0.6 : 0.8 };
    else if (!b.pinned){ const k = Math.min(4*T, d - 1.5*T); b.hop = { x0: b.x, y0: b.y, x1: b.x + b.dx*k, y1: b.y + b.dy*k, t: 0 }; b.hopAt = s.t; b.cd = 0.7; }
    return;
  }
  if (d > 3*T && !b.pinned) bossWalk(s, b, a.x, a.y, 10, dt);
}
// Old Warty (build 31). It turns slowly to face what it hunts. Tongue: a thin lane, then the first ant
// in it is swallowed; bite the toad hard within 3 seconds and it spits the ant back out alive. Leap:
// a ring where it will land. Phase 2: two tongues in a row, and it puffs up (bites half) now and then.
// Build 58: Old Blind. Under the earth it swims toward the thickest crowd (a ridge of dirt shows where); a ring
// shows where it will erupt, and everything in it is hurt and flung. Up for 7 seconds (5 when it rages), it
// swipes a claw lane at the nearest; bites land only while it's up. Then it dives again.
function stepBlind(s, b, B, dt){
  const P = s.player, fast = b.phase === 2, say = (m) => { if (playerNear(s, b.x, b.y, 34)) P.msg = m; };
  if (b.mode === 'idle'){ b.under = true; return; }
  if (b.upT == null){ b.under = true; b.upT = 0; b.burrowT = 2; }
  if (b.under){
    b.burrowT -= dt;
    // Swim toward the thickest crowd of yours within 20 tiles.
    let best = null, bn = 0; for (const a of s.ants){ if (a.team || !outside(a) || a.climb) continue; if (Math.hypot(a.x - b.hx, a.y - b.hy) > 20*T) continue; let n = 0; for (const o of s.ants) if (!o.team && outside(o) && Math.abs(o.x - a.x) < 3*T && Math.abs(o.y - a.y) < 3*T) n++; if (n > bn){ bn = n; best = a; } }
    if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.under = false; b.x = k.x; b.y = k.y; b.atkDone = { kind: 'ring', x: k.x, y: k.y, r: k.r, t: s.t }; b.landAt = s.t; b.upT = fast ? 5 : 7; s.events.push('erupt');
      for (const a of s.ants){ if (a.team || !outside(a) || Math.hypot(a.x - b.x, a.y - b.y) > k.r) continue; hurtAnt(s, a, 7, 'blind'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 4); }
      if (!b.saidUp){ b.saidUp = true; say('Old Blind erupts! Bite it now, while it’s up!'); } return; }
    if (best){ const gx = best.x, gy = best.y, d = Math.hypot(gx - b.x, gy - b.y); if (d > 1){ const m = Math.min(d, 46*SURF*dt); b.x += (gx - b.x)/d*m; b.y += (gy - b.y)/d*m; b.dx = (gx - b.x)/d; b.dy = (gy - b.y)/d; } }
    if (b.burrowT <= 0 && best){ b.atk = { kind: 'ring', x: best.x, y: best.y, r: 3.6*T, t: 0, at: fast ? 0.9 : 1.2 }; b.burrowT = 99; }
    else if (b.burrowT <= 0 && !best){ b.burrowT = 1; }
    return; }
  // Up.
  b.upT -= dt;
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t, len: k.len, dx: k.dx, dy: k.dy }; b.swipeAt = s.t;
    for (const a of s.ants){ if (a.team || !outside(a) || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 6, 'blind'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2.5); }
    b.cd = fast ? 1.1 : 1.6; return; }
  if (b.upT <= 0){ b.under = true; b.burrowT = fast ? 2 : 3.5; b.diveAt = s.t; return; }
  b.cd = (b.cd || 0) - dt;
  const tg = bossTarget(s, b, 10); if (!tg) return; const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (b.cd <= 0) b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(9*T, d + 3*T), w: 2.4*T, t: 0, at: fast ? 0.6 : 0.8 };
}
// The Hornet Queen. Hornets dive at a climber (a ring flashes on it, then it's stung and knocked off the bark if
// it's high), every 2.5 seconds (1.6 enraged); hunting wasps come for the ground below; enraged, every 12
// seconds a swarm sweeps the upper trunk unless a dozen hold the top.
function stepHornets(s, b, B, dt){
  const P = s.player, fast = b.phase === 2, say = (m) => { if (playerNear(s, b.x, b.y, 30)) P.msg = m; };
  if (b.mode === 'idle') return;
  const climbers = s.ants.filter(a => !a.team && a.state === 'climb' && a.climb > 20);
  if (b.dive){ const D = b.dive; D.t += dt; if (D.t >= D.at){ b.dive = null; b.stingAt = s.t; const a = s.ants.find(o => o.id === D.id);
      if (a && a.state === 'climb'){ const high = a.climb > 120; hurtAnt(s, a, a.isPlayer ? 3 : 4, 'hornet'); if (high && a.state !== 'dead'){ a.climb = 0; a.knockT = 0.3; a.kx = 0; a.ky = 40; if (a.isPlayer){ P.climb = null; a.state = 'player'; say('A hornet knocked you off the bark!'); } else a.state = 'follow'; } } }
    return; }
  b.cd = (b.cd ?? 2) - dt;
  if (b.cd <= 0 && climbers.length){ const a = climbers[Math.floor(Math.random()*climbers.length)]; b.dive = { id: a.id, t: 0, at: 0.8 }; b.cd = fast ? 1.6 : 2.5; }
  b.waspT = (b.waspT ?? 10) - dt;
  if (b.waspT <= 0){ b.waspT = 30; const B2 = BUGS.wasp, a = Math.random()*Math.PI*2, x = b.x + Math.cos(a)*10*T, y = b.y + Math.sin(a)*10*T + 8*T;
    if (walk(s, Math.floor(x/T), Math.floor(y/T)) && s.critters.filter(c => c.kind === 'wasp').length < 4) s.critters.push({ id: s.nextId++, kind: 'wasp', region: null, hx: Math.floor(x/T), hy: Math.floor(y/T), x, y, dx: 1, dy: 0, hp: B2.hp, maxHp: B2.hp, state: 'fly', t: 0, life: 0 }); }
  if (fast){ b.swarmT = (b.swarmT ?? 12) - dt; if (b.swarmT <= 0){ b.swarmT = 12; b.swarmAt = s.t; const top = climbers.filter(a => a.climb >= CROWN - 40).length;
    if (top >= 12) say('Your ants ball together at the top: the swarm can’t break them!'); else { for (const a of climbers) if (a.climb > CROWN/2) hurtAnt(s, a, 2, 'hornet'); say('The swarm sweeps the bark! Hold the top together: a dozen can stand it.'); } } }
}
function stepHollow(s, b, B, dt){
  const P = s.player, fast = b.phase === 2, say = (m) => { if (playerNear(s, b.x, b.y, 30)) P.msg = m; };
  b.guards = 0; for (const z of s.critters) if (z.kind === 'zombie' && !z.gone && Math.hypot(z.x - b.x, z.y - b.y) < 8*T) b.guards++;
  if (b.mode === 'idle') return;
  b.waveT = (b.waveT ?? 2) - dt;
  if (b.waveT <= 0){ b.waveT = fast ? 14 : 20; const n = fast ? 12 : 8; b.waveAt = s.t; b.waves = (b.waves || 0) + 1;
    for (let k = 0; k < n; k++){ const a = (k/n)*Math.PI*2 + Math.random()*0.4, r = (3.5 + Math.random()*2)*T, x = b.x + Math.cos(a)*r, y = b.y + Math.sin(a)*r; if (walk(s, Math.floor(x/T), Math.floor(y/T))) spawnZbug(s, x, y); }
    if (b.waves === 1) say('The dead nest stirs: infected ants pour out of the hedge!'); }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.atkDone = { kind: 'ring', x: k.x, y: k.y, r: k.r, t: s.t }; b.sporeAt = s.t; s.events.push('spores');
    for (const a of s.ants){ if (a.team || !outside(a) || !inAtk(k, a.x, a.y)) continue; if (a.isPlayer){ hurtAnt(s, a, 3, 'cordyceps'); continue; } sporeAnt(s, a); }
    if (!b.saidSpore){ b.saidSpore = true; say('Spores! The ants they touched are infected: get a medic to them, or get them home to the nurses.'); }
    b.cd = fast ? 4 : 6; return; }
  b.cd = (b.cd ?? 3) - dt;
  if (b.cd <= 0){ const tg = bossTarget(s, b, 16); if (tg){ const [a] = tg; b.atk = { kind: 'spit', x: a.x, y: a.y, r: 3*T, t: 0, at: 1.2 }; } else b.cd = 1; }
}
// Build 55: Nevermore. Aloft he circles his roost out of reach; a ring on an ant, and he snatches it (gone in
// 5 seconds unless he's brought down first). Now and then he steals a glowrock. A crew carrying the bottle cap
// under him lures him down for 10 seconds (7 when enraged); twenty ants on him keep him grounded. On the ground
// he pecks, beats his wings at a crowd, and hops, like the Old Robin, but bigger.
function crowDrops(s, b){ const C = b.carry; b.carry = null; if (!C) return; const a = s.ants.find(o => o.id === C.id); if (a && a.state === 'away'){ a.state = C.state || 'return'; a.x = b.x; a.y = b.y; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); } }
function stepCrow(s, b, B, dt){
  const P = s.player, c = s.colony, fast = b.phase === 2, say = (m) => { if (playerNear(s, b.x, b.y, 30)) P.msg = m; };
  if (b.mode === 'idle'){ b.air = false; b.roused = false; crowDrops(s, b); if (!b.gx || b.t > 6){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*4*T; b.gy = b.hy + Math.sin(a)*4*T; b.hopAt = s.t; } bossWalk(s, b, b.gx, b.gy, 10, dt); return; }
  if (!b.roused){ b.roused = true; b.air = true; b.upAt = s.t; b.ang = Math.atan2(b.y - b.hy, b.x - b.hx); b.snatchCd = 3; b.lureCd = 0; b.stealT = b.stealT ?? 20; }
  // A snatched ant: lost if he's still up when time runs out.
  if (b.carry){ b.carry.t -= dt; if (!b.air) crowDrops(s, b); else if (b.carry.t <= 0){ const a = s.ants.find(o => o.id === b.carry.id); b.carry = null; if (a && a.state === 'away'){ a.state = 'return'; killAnt(s, a, 'crow'); } } }
  b.lureCd = (b.lureCd || 0) - dt;
  if (b.air){
    // Shiny: a crew carrying the cap under him brings him down.
    const cap = P.big && P.big.type === 'cap' && P.ant ? P.ant : null;
    if (cap && b.lureCd <= 0 && Math.hypot(cap.x - b.x, cap.y - b.y) < 12*T){ b.air = false; b.atk = null; b.x = cap.x + 2*T; b.y = cap.y; b.groundT = fast ? 7 : 10; b.landAt = s.t; crowDrops(s, b); say('Nevermore can’t resist the bottle cap: he’s down! Swarm him!'); return; }
    // Glowrock: he steals one now and then while he's up.
    b.stealT = (b.stealT || 20) - dt; if (b.stealT <= 0){ b.stealT = 90; if ((c.glow || 0) > 0){ c.glow--; b.loot = (b.loot || 0) + 1; say('Nevermore snatches a glowrock from your stores! Bring him down to get it back.'); } }
    b.ang = (b.ang || 0) + dt*0.9; const gx = b.hx + Math.cos(b.ang)*7*T, gy = b.hy + Math.sin(b.ang)*7*T; b.x += (gx - b.x)*Math.min(1, dt*2); b.y += (gy - b.y)*Math.min(1, dt*2);
    if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.atkDone = { kind: 'grab', x: k.x, y: k.y, r: k.r, t: s.t }; b.snatchAt = s.t;
      if (!b.carry) for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; if (a.isPlayer){ hurtAnt(s, a, 6, 'crow'); continue; } b.carry = { id: a.id, t: 5, state: a.state === 'away' ? 'return' : a.state }; a.state = 'away'; a.foeId = 0; say('Nevermore has one of your ants! Get the bottle cap under him, quick!'); break; }
      b.snatchCd = fast ? 3 : 5; return; }
    b.snatchCd = (b.snatchCd || 0) - dt;
    if (b.snatchCd <= 0 && !b.carry){ const tg = bossTarget(s, b, 18); if (tg){ const [a] = tg; b.atk = { kind: 'grab', x: a.x, y: a.y, r: 1.4*T, t: 0, at: fast ? 0.8 : 1.1 }; } }
    return; }
  // On the ground.
  if (!b.pinned) b.groundT -= dt;
  if (b.groundT <= 0 && !b.atk && !b.hop){ b.air = true; b.lureCd = 8; b.upAt = s.t; say('Nevermore takes to the air again.'); return; }
  if (b.hop){ const H = b.hop; H.t += dt; const u = Math.min(1, H.t/0.35); b.x = H.x0 + (H.x1 - H.x0)*u; b.y = H.y0 + (H.y1 - H.y0)*u; if (u >= 1) b.hop = null; return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t };
    if (k.what === 'peck'){ b.peckAt = s.t; for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 8, 'crow'); spark(s, null, a.x, a.y, 1); } }
    else { b.beatAt = s.t; for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 3, 'crow'); if (a.state !== 'dead') shove(s, a, b.x, b.y, 3); } }
    b.cd = fast ? 1.1 : 1.6; return; }
  b.cd = (b.cd || 0) - dt;
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (b.cd <= 0){
    let crowd = 0; for (const o of s.ants) if (outside(o) && !o.team && Math.hypot(o.x - b.x, o.y - b.y) < 3*T) crowd++;
    if (crowd >= 8) b.atk = { kind: 'ring', what: 'beat', x: b.x, y: b.y, r: 3.6*T, t: 0, at: fast ? 0.7 : 0.9 };
    else if (d < 3.5*T) b.atk = { kind: 'ring', what: 'peck', x: a.x, y: a.y, r: 1.3*T, t: 0, at: fast ? 0.55 : 0.75 };
    else if (!b.pinned){ const k = Math.min(4*T, d - 1.5*T); b.hop = { x0: b.x, y0: b.y, x1: b.x + b.dx*k, y1: b.y + b.dy*k, t: 0 }; b.hopAt = s.t; b.cd = 0.6; }
  }
}
// Build 54: is a big enough muster at this wild boss's lair?
function musterHere(s, b, B){ const M = s.muster; if (B.needEvo && !has(s, B.needEvo)) return false; return !!(M && Object.keys(M.from || {}).length >= (B.need || 1) && Math.hypot((M.x + 0.5)*T - b.hx, (M.y + 0.5)*T - b.hy) < 30*T); }
function dukeRetch(s, b){ const H = b.belly; b.belly = null; if (!H) return 0; let n = 0;
  for (const id of H.ids){ const a = s.ants.find(o => o.id === id); if (!a || a.state !== 'away') continue; a.state = H.states[id] || 'return'; const ang = Math.random()*Math.PI*2; a.x = b.x + Math.cos(ang)*3*T; a.y = b.y + Math.sin(ang)*3*T; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); shove(s, a, b.x, b.y, 2); n++; }
  b.retchAt = s.t; return n; }
// The Duke: Old Warty's kin, three times the size. He gulps a ring of ants whole (bite him 150 in 5 seconds and he
// retches them up alive), sweeps a long tongue down a lane, and dives, to surface where the water stirs (a ring
// shows where) with a splash. Thirty ants on him pin him: no dive.
function stepDuke(s, b, B, dt){
  if (b.dx == null){ b.dx = 1; b.dy = 0; }
  const P = s.player, fast = b.phase === 2, say = (m) => { if (playerNear(s, b.x, b.y, 30)) P.msg = m; };
  if (b.belly){ const H = b.belly; H.t -= dt;
    if (b.maxHp - b.hp >= H.hp0 + 150){ const n = dukeRetch(s, b); say(`The Duke retches up ${n} ant${n === 1 ? '' : 's'} alive!`); }
    else if (H.t <= 0){ for (const id of H.ids){ const a = s.ants.find(o => o.id === id); if (a && a.state === 'away'){ a.state = H.states[id] || 'return'; killAnt(s, a, 'duke'); } } b.belly = null; b.gulpAt = s.t; } }
  if (b.dive){ const D = b.dive; D.t += dt;
    if (D.t >= D.at){ b.dive = null; b.under = false; b.x = D.x; b.y = D.y; b.atk = null; b.atkDone = { kind: 'ring', x: b.x, y: b.y, r: 3.2*T, t: s.t }; b.landAt = s.t;
      for (const a of s.ants){ if (!outside(a) || a.team || Math.hypot(a.x - b.x, a.y - b.y) > 3.2*T) continue; hurtAnt(s, a, 6, 'duke'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 3); }
      b.cd = 1.2; }
    return; }
  if (b.mode === 'idle'){ if (!b.gx || b.t > 8){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*5*T; b.gy = b.hy + Math.sin(a)*5*T; } bossWalk(s, b, b.gx, b.gy, 5, dt); return; }
  b.cd = (b.cd || 0) - dt; b.diveCd = (b.diveCd ?? 12) - dt;
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t, len: k.len, dx: k.dx, dy: k.dy };
    if (k.kind === 'grab'){ b.gulpAt = s.t; const ids = [], states = {};
      for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; if (a.isPlayer){ hurtAnt(s, a, 8, 'duke'); continue; } if (ids.length >= 6 || b.belly) continue; ids.push(a.id); states[a.id] = a.state === 'away' ? 'return' : a.state; a.state = 'away'; a.foeId = 0; }
      if (ids.length){ b.belly = { ids, states, t: 5, hp0: b.maxHp - b.hp }; say(`The Duke gulped ${ids.length} ant${ids.length === 1 ? '' : 's'}! Bite him hard, now, and he’ll retch them up!`); }
      b.cd = fast ? 1.3 : 2.1; return; }
    if (k.kind === 'lane'){ b.lashAt = s.t; b.lashLen = k.len;
      for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 4, 'duke'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, a.x + k.dx*T, a.y + k.dy*T, -2); }
      b.cd = fast ? 1.2 : 2; return; }
    return; }
  if (b.cd > 0) return;
  if (b.diveCd <= 0 && !b.pinned && !b.belly){ b.diveCd = fast ? 9 : 14;
    const tg = bossTarget(s, b, 16), ang = Math.random()*Math.PI*2; let x = tg ? tg[0].x + Math.cos(ang)*2*T : b.hx + Math.cos(ang)*6*T, y = tg ? tg[0].y + Math.sin(ang)*2*T : b.hy + Math.sin(ang)*6*T;
    if (Math.hypot(x - b.hx, y - b.hy) > 16*T){ const k = 16*T/Math.hypot(x - b.hx, y - b.hy); x = b.hx + (x - b.hx)*k; y = b.hy + (y - b.hy)*k; }
    if (!walk(s, Math.floor(x/T), Math.floor(y/T))){ x = b.hx; y = b.hy; }
    b.under = true; b.dive = { t: 0, at: fast ? 1.6 : 2.2, x, y }; b.atk = { kind: 'ring', x, y, r: 3.2*T, t: 0, at: b.dive.at }; b.diveAt = s.t;
    if (!b.saidDive){ b.saidDive = true; say('The Duke dives! Watch where the water stirs, and get clear of the ring.'); }
    return; }
  const tg = bossTarget(s, b, 14); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (d < 6*T && !b.belly && Math.random() < 0.55){ b.atk = { kind: 'grab', x: a.x, y: a.y, r: 2.6*T, t: 0, at: fast ? 0.8 : 1.1 }; return; }
  if (d < 14*T){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(14*T, d + 3*T), w: 1.4*T, t: 0, at: fast ? 0.7 : 1 }; return; }
  bossWalk(s, b, a.x, a.y, 8, dt);
}
function stepToad(s, b, B, dt){
  if (b.dx == null){ b.dx = 1; b.dy = 0; }
  const turn = (tx, ty) => { const want = Math.atan2(ty - b.y, tx - b.x), have = Math.atan2(b.dy, b.dx); let d = want - have; while (d > Math.PI) d -= Math.PI*2; while (d < -Math.PI) d += Math.PI*2; const a = have + Math.max(-1, Math.min(1, d))*Math.min(Math.abs(d), 1.6*dt); b.dx = Math.cos(a); b.dy = Math.sin(a); return Math.abs(d); };
  if (b.puffT > 0) b.puffT -= dt;
  // A swallowed ant: freed if the toad is bitten hard enough in time, else lost.
  if (b.held){ const H = b.held, a = s.ants.find(o => o.id === H.id); H.t -= dt;
    if (!a || a.state === 'dead'){ b.held = null; }
    else if (b.maxHp - b.hp >= H.hp0 + 18 || b.hp <= 0){ a.state = H.state; a.x = b.x + b.dx*B.r*T; a.y = b.y + b.dy*B.r*T; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); shove(s, a, b.x, b.y, 2); b.held = null; b.spitAt = s.t; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'Old Warty gags and spits your ant out alive!'; }
    else if (H.t <= 0){ b.held = null; a.state = H.state; killAnt(s, a, 'toad'); b.gulpAt = s.t; } }
  if (b.mode === 'idle'){ if (!b.gx || b.t > 7){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*4*T; b.gy = b.hy + Math.sin(a)*4*T; } turn(b.gx, b.gy); bossWalk(s, b, b.gx, b.gy, 6, dt); return; }
  const fast = b.phase === 2;
  if (b.leap){ const L = b.leap; L.t += dt; const u = Math.min(1, L.t/0.5); b.x = L.x0 + (L.x1 - L.x0)*u; b.y = L.y0 + (L.y1 - L.y0)*u;
    if (u >= 1){ b.leap = null; b.atkDone = { kind: 'ring', x: b.x, y: b.y, r: 2.6*T, t: s.t }; b.landAt = s.t;
      for (const a of s.ants){ if (!outside(a) || a.team || Math.hypot(a.x - b.x, a.y - b.y) > 2.6*T) continue; hurtAnt(s, a, 5, 'toad'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); }
      b.cd = fast ? 1.4 : 2.2; }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t, len: k.len, dx: k.dx, dy: k.dy };
    if (k.kind === 'lane'){ // the tongue: the first ant along the lane
      b.lashAt = s.t; let best = null, bd = Infinity;
      for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; const al = (a.x - k.x)*k.dx + (a.y - k.y)*k.dy; if (al < bd){ bd = al; best = a; } }
      b.lashLen = best ? bd : k.len;
      if (best){ if (best.isPlayer || b.held) hurtAnt(s, best, 6, 'toad'); else { b.held = { id: best.id, t: 3, state: best.state === 'away' ? 'return' : best.state, hp0: b.maxHp - b.hp }; best.state = 'away'; best.foeId = 0; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'Old Warty swallowed an ant! Bite it hard, now, and it spits it out!'; } }
      if (fast && !k.second){ const tg = bossTarget(s, b, 12); if (tg){ const [a, d] = tg, dx = (a.x - b.x)/d, dy = (a.y - b.y)/d; b.atk = { kind: 'lane', x: b.x, y: b.y, dx, dy, len: Math.min(9*T, d + 2*T), w: 0.9*T, t: 0, at: 0.6, second: true }; return; } }
      b.cd = fast ? 1.6 : 2.4; return; }
    if (k.kind === 'ring'){ b.leap = { x0: b.x, y0: b.y, x1: k.x, y1: k.y, t: 0 }; return; }
    return; }
  b.cd -= dt; b.puffCd = (b.puffCd ?? 8) - dt;
  if (fast && b.puffCd <= 0){ b.puffT = 5; b.puffCd = 12; b.puffAt = s.t; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'Old Warty puffs up: bites do half. Wait it out, or get behind him.'; }
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg; const off = turn(a.x, a.y);
  if (b.cd <= 0){
    if (d > 6*T || (d > 3*T && Math.random() < 0.3)){ const k = Math.min(d, 7*T); b.atk = { kind: 'ring', x: b.x + (a.x - b.x)/d*k, y: b.y + (a.y - b.y)/d*k, r: 2.6*T, t: 0, at: fast ? 0.8 : 1.1 }; return; }
    if (off < 0.5){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(9*T, d + 2*T), w: 0.9*T, t: 0, at: fast ? 0.7 : 0.9 }; return; }
  }
}
// The praying mantis (build 34). Hidden (a shimmer) until an ant comes within 6 tiles. It sways for a
// moment, then snaps a lane in front of it and grabs the first one or two ants there; while it eats (4 s)
// it can't strike and bites on it do double. Hurt it badly or lock it, and it drops its meal alive.
// Phase 2: two strikes in a row, and short fluttering hops after you.
function mantisDrops(s, b, msg){
  const E = b.eat; if (!E) return; b.eat = null;
  for (const id of E.ids){ const a = s.ants.find(o => o.id === id); if (!a || a.state !== 'away') continue; a.state = E.states[id] || 'return'; a.x = b.x + b.dx*1.6*T; a.y = b.y + b.dy*1.6*T; a.tx = Math.floor(a.x/T); a.ty = Math.floor(a.y/T); shove(s, a, b.x, b.y, 1.5); }
  if (msg && playerNear(s, b.x, b.y, 24)) s.player.msg = msg; b.cd = 1.2;
}
function stepMantis(s, b, B, dt){
  if (b.dx == null){ b.dx = 1; b.dy = 0; }
  const near = nearAnt(s, b, 6*T, (o) => !o.team);
  if (b.mode === 'idle'){ b.hidden = !near; if (!b.gx || b.t > 9){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*3*T; b.gy = b.hy + Math.sin(a)*3*T; } bossWalk(s, b, b.gx, b.gy, 4, dt); return; }
  if (b.hidden){ b.hidden = false; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'The hedge moves: a mantis was there all along!'; }
  const fast = b.phase === 2;
  // Eating: claws busy. Big damage makes it let go.
  if (b.eat){ const E = b.eat; E.t -= dt;
    if (b.maxHp - b.hp >= E.hp0 + 40){ mantisDrops(s, b, 'Bitten hard, the mantis drops its meal!'); return; }
    if (E.t <= 0){ for (const id of E.ids){ const a = s.ants.find(o => o.id === id); if (a && a.state === 'away'){ a.state = E.states[id] || 'return'; killAnt(s, a, 'mantis'); } } b.eat = null; b.cd = fast ? 0.8 : 1.4; }
    return; }
  if (b.hop){ const H = b.hop; H.t += dt; const u = Math.min(1, H.t/0.45); b.x = H.x0 + (H.x1 - H.x0)*u; b.y = H.y0 + (H.y1 - H.y0)*u; if (u >= 1) b.hop = null; return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, t: s.t, x: k.x, y: k.y }; b.strikeAt = s.t;
    const hit = [];
    for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hit.push([((a.x - k.x)*k.dx + (a.y - k.y)*k.dy), a]); }
    hit.sort((p, q) => p[0] - q[0]);
    const grab = hit.slice(0, 2).map(h => h[1]), E = { ids: [], states: {}, t: 4, hp0: b.maxHp - b.hp };
    for (const a of grab){ if (a.isPlayer){ hurtAnt(s, a, 6, 'mantis'); continue; } E.states[a.id] = a.state; a.state = 'away'; a.foeId = 0; E.ids.push(a.id); }
    for (const [, a] of hit.slice(2)) if (outside(a)) hurtAnt(s, a, 2, 'mantis');
    if (E.ids.length){ b.eat = E; if (playerNear(s, b.x, b.y, 24)) s.player.msg = `The mantis snatched ${E.ids.length === 1 ? 'an ant' : 'two ants'}! While it eats, bite it: double damage.`; return; }
    if (fast && !k.second){ const tg = bossTarget(s, b, 8); if (tg){ const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d; b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: 4.8*T, w: 2.2*T, t: 0, at: 0.4, second: true }; return; } }
    b.cd = fast ? 1.1 : 1.8; return; }
  b.cd -= dt;
  const tg = bossTarget(s, b, 14); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (b.cd <= 0 && d < 4.6*T){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: 4.8*T, w: 2.2*T, t: 0, at: fast ? 0.45 : 0.6 }; return; }
  if (fast && d > 6*T && b.cd <= 0){ const k = Math.min(5*T, d - 2.5*T); b.hop = { x0: b.x, y0: b.y, x1: b.x + b.dx*k, y1: b.y + b.dy*k, t: 0 }; b.cd = 0.6; return; }
  if (d > 3.5*T) bossWalk(s, b, a.x, a.y, 9, dt);
}
// The black widow (build 35). Her web (4½ tiles round) holds any ant that walks in for 3 s. Four white
// anchors at its edge: bite through all four and she falls to the floor for 12 s (bites double; up in
// the web, a third). She bites at a red dot, deadly. Phase 2: she drops on a thread to a new spot and
// spins a fresh web there (anchors already cut stay cut).
function spinWeb(s, b, x, y, keep){
  const R = 4.5*T, old = b.web ? b.web.anchors : null;
  // Each anchor sits on open ground an ant can reach: pulled in toward the middle if the edge is blocked.
  b.web = { x, y, r: R, anchors: [0, 1, 2, 3].map(i => { const a = i*Math.PI/2 + 0.4; const cut = keep && old && old[i].hp <= 0; let k = R; while (k > 1.5*T && !walk(s, Math.floor((x + Math.cos(a)*k)/T), Math.floor((y + Math.sin(a)*k)/T))) k -= 0.5*T; return { x: x + Math.cos(a)*k, y: y + Math.sin(a)*k, hp: cut ? 0 : 30, max: 30 }; }) };
}
function stepWidow(s, b, B, dt){
  const P = s.player;
  if (!b.web) spinWeb(s, b, b.hx, b.hy);
  const W2 = b.web;
  // The web holds what walks into it.
  if (!b.grounded) for (const a of s.ants){ if (a.team || !outside(a)) continue;
    if (Math.hypot(a.x - W2.x, a.y - W2.y) < W2.r && !(a.webT > s.t) && !(a.webFree > s.t)){ a.webT = s.t + 3; a.webFree = s.t + 5; if (!a.isPlayer) a.lockT = 3; if (a.isPlayer || !b.warnedWeb){ b.warnedWeb = true; if (playerNear(s, W2.x, W2.y, 24)) P.msg = a.isPlayer ? 'You’re stuck in the widow’s web!' : 'Your ants are stuck in the widow’s web. Cut the anchors!'; } } }
  // The anchors: fighters, your crew and you bite through them.
  if (!b.grounded){ let cutNow = false;
    for (const an of W2.anchors){ if (an.hp <= 0) continue;
      for (const a of s.ants){ if (a.team || !outside(a) || !(CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer)) continue; if (Math.hypot(a.x - an.x, a.y - an.y) < 1.2*T){ an.hp -= bite(s, a)*dt*(a.isPlayer ? 2 : 1); an.hitT = s.t; } }
      if (an.hp <= 0){ an.hp = 0; cutNow = true; s.events.push('attackdone'); } }
    const left = W2.anchors.filter(an => an.hp > 0).length;
    if (cutNow && left && playerNear(s, b.x, b.y, 24)) P.msg = `An anchor snaps! ${left} left.`;
    if (!left){ b.grounded = true; b.groundT = 12; b.atk = null; b.drop = null; b.x = W2.x; b.y = W2.y; b.landAt = s.t; if (playerNear(s, b.x, b.y, 24)) P.msg = 'The web falls, and the widow with it! Swarm her: bites do double!'; s.events.push('bossphase'); } }
  else { b.groundT -= dt; if (b.groundT <= 0){ b.grounded = false; spinWeb(s, b, b.x, b.y); if (playerNear(s, b.x, b.y, 24)) P.msg = 'The widow climbs back up and spins a new web.'; } }
  if (b.mode === 'idle'){ if (!b.grounded){ b.x += (W2.x - b.x)*Math.min(1, dt); b.y += (W2.y - b.y)*Math.min(1, dt); } return; }
  const fast = b.phase === 2;
  if (b.drop){ const D = b.drop; D.t += dt; if (D.t < D.at) return; b.drop = null; b.x = D.x; b.y = D.y; spinWeb(s, b, D.x, D.y, true); b.cd = 1.5; b.landAt = s.t; return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: 'ring', x: k.x, y: k.y, r: k.r, t: s.t }; b.biteAt = s.t;
    if (k.what === 'drop'){ b.drop = { x: k.x, y: k.y, t: 0, at: 0.3 }; return; }
    for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 8, 'widow'); spark(s, null, a.x, a.y, 1); }
    b.cd = fast ? 1.1 : 1.6; return; }
  b.cd -= dt; b.dropCd = (b.dropCd ?? 10) - dt;
  if (fast && !b.grounded && b.dropCd <= 0){ b.dropCd = 13; const a = Math.random()*Math.PI*2, d = 3*T + Math.random()*3*T; let x = b.hx + Math.cos(a)*d, y = b.hy + Math.sin(a)*d; if (!walk(s, Math.floor(x/T), Math.floor(y/T))){ x = b.hx; y = b.hy; } b.atk = { kind: 'ring', what: 'drop', x, y, r: 2*T, t: 0, at: 1.0 }; return; }
  // Prey: a stuck ant first, else the nearest.
  let tg = null, td = Infinity; for (const a of s.ants){ if (a.team || !outside(a) || (a.isPlayer && a.feign > s.t)) continue; const d = Math.hypot(a.x - b.x, a.y - b.y) - (a.webT > s.t ? 2*T : 0); if (d < td){ td = d; tg = a; } }
  if (!tg) return; const d = Math.hypot(tg.x - b.x, tg.y - b.y); b.dx = (tg.x - b.x)/(d || 1); b.dy = (tg.y - b.y)/(d || 1);
  if (b.cd <= 0 && d < 3.5*T){ b.atk = { kind: 'ring', what: 'bite', x: tg.x, y: tg.y, r: 0.9*T, t: 0, at: fast ? 0.55 : 0.7 }; return; }
  // She keeps to her web (on the floor she crawls).
  const gx = b.grounded ? tg.x : W2.x + Math.max(-1, Math.min(1, (tg.x - W2.x)/W2.r))*W2.r*0.7, gy = b.grounded ? tg.y : W2.y + Math.max(-1, Math.min(1, (tg.y - W2.y)/W2.r))*W2.r*0.7;
  if (d > 1.5*T) bossWalk(s, b, gx, gy, b.grounded ? 6 : 14, dt);
}
// The giant centipede (build 36). Six segments of 90 health: each 90 damage cuts the tail segment off
// (it drops as meat) and makes it faster. Coil: a ring round it, then it lashes out (bites on it while
// coiled do double: its joints are open). Rush: a lane, then it races down it biting all it passes.
// Two segments left: frantic. Its body follows the head's path (b.path) for drawing.
const CENT_SEG = 90;
function stepCentipede(s, b, B, dt){
  const P = s.player;
  if (!b.path) b.path = [[b.x, b.y]];
  const last = b.path[b.path.length - 1]; if (Math.hypot(b.x - last[0], b.y - last[1]) > 4){ b.path.push([b.x, b.y]); if (b.path.length > 80) b.path.shift(); }
  const segs = Math.max(0, Math.ceil(b.hp / CENT_SEG)); if (b.segs == null) b.segs = segs;
  if (segs < b.segs && b.hp > 0){ // a segment breaks off: meat where the tail was
    const tail = b.path[Math.max(0, b.path.length - 1 - b.segs*5)] || [b.x, b.y], x = Math.floor(tail[0]/T), y = Math.floor(tail[1]/T);
    if (walk(s, x, y) && !itemAt(s, x, y)) s.items.push({ x, y, kind: 'protein', type: 'boss', amt: 12 });
    b.segs = segs; b.cutAt = s.t; if (playerNear(s, b.x, b.y, 24)) P.msg = `A segment breaks off! ${segs} left, and it’s faster.`; }
  const quick = 1 + (6 - Math.min(6, b.segs))*0.15, fast = b.phase === 2;
  if (b.mode === 'idle'){ if (!b.gx || b.t > 6){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*5*T; b.gy = b.hy + Math.sin(a)*5*T; } bossWalk(s, b, b.gx, b.gy, 10, dt); return; }
  if (b.rush){ const R = b.rush, step = 170*quick*SURF*dt, nx = b.x + R.dx*step, ny = b.y + R.dy*step, cl = clearOf(s), tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    const wall = tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2 || cl[ty*W + tx] < 2;
    if (!wall){ b.x = nx; b.y = ny; R.done += step; b.dx = R.dx; b.dy = R.dy; }
    for (const a of s.ants) if (outside(a) && !a.team && !R.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < 1.5*T){ R.hit[a.id] = 1; hurtAnt(s, a, 5, 'centipede'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x - R.dy*40, b.y + R.dx*40, 1.5); }
    if (wall || R.done >= R.len){ b.rush = null; b.cd = fast ? 0.9 : 1.6; b.atkDone = { kind: 'stop', t: s.t, x: b.x, y: b.y }; }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.kind === 'ring'){ k.x = b.x; k.y = b.y; } if (k.t < k.at) return;
    b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, r: k.r, t: s.t };
    if (k.kind === 'ring'){ b.lashAt = s.t; for (const a of s.ants){ if (!outside(a) || a.team || !inAtk(k, a.x, a.y)) continue; hurtAnt(s, a, 5, 'centipede'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x, b.y, 2); } b.cd = fast ? 1.0 : 1.8; }
    else if (k.kind === 'lane') b.rush = { dx: k.dx, dy: k.dy, len: k.len, done: 0, hit: {} };
    return; }
  b.cd -= dt;
  const tg = bossTarget(s, b, 16); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (b.cd <= 0){
    let near = 0; for (const o of s.ants) if (outside(o) && !o.team && Math.hypot(o.x - b.x, o.y - b.y) < 3*T) near++;
    if (near >= 3 || d < 2.5*T) b.atk = { kind: 'ring', x: b.x, y: b.y, r: 3.4*T, t: 0, at: fast ? 0.8 : 1.1 };
    else b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: Math.min(11*T, d + 3*T), w: 1.8*T, t: 0, at: fast ? 0.6 : 0.85 };
    return;
  }
  if (d > 2.2*T) bossWalk(s, b, a.x, a.y, 16*quick, dt);
}
function stepBeetle(s, b, B, dt){
  if (b.dazeT > 0){ b.dazeT -= dt; return; }
  if (b.mode === 'idle'){ if (!b.gx || b.t > 6){ b.t = 0; const a = Math.random()*Math.PI*2; b.gx = b.hx + Math.cos(a)*6*T; b.gy = b.hy + Math.sin(a)*6*T; } bossWalk(s, b, b.gx, b.gy, 8, dt); return; }
  const cl = clearOf(s);
  // Charging: fast down the lane; whatever is in the way is bowled over.
  if (b.charge){ const C = b.charge, step = 150*SURF*dt, nx = b.x + C.dx*step, ny = b.y + C.dy*step, tx = Math.floor(nx/T), ty = Math.floor(ny/T);
    const wall = tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2 || cl[ty*W + tx] < 2;
    if (!wall){ b.x = nx; b.y = ny; C.done += step; }
    for (const a of s.ants) if (outside(a) && !C.hit[a.id] && Math.hypot(a.x - b.x, a.y - b.y) < 1.6*T){ C.hit[a.id] = 1; hurtAnt(s, a, 5, 'beetle'); spark(s, null, a.x, a.y, 1); if (a.state !== 'dead') shove(s, a, b.x - C.dy*50, b.y + C.dx*50, 2); }
    if (wall || C.done >= C.len){
      b.charge = null; b.atkDone = { kind: wall ? 'slam' : 'stop', t: s.t, x: b.x, y: b.y };
      // Enraged, it turns and charges again before it tires.
      if (b.phase === 2 && !C.second && !wall){ const tg = bossTarget(s, b, 14); if (tg){ const [a, d] = tg, dx = (a.x - b.x)/d, dy = (a.y - b.y)/d; b.dx = dx; b.dy = dy; b.atk = { kind: 'lane', x: b.x, y: b.y, dx, dy, len: 11*T, w: 1.8*T, t: 0, at: 0.6, second: true }; return; } }
      b.dazeT = wall ? 4.5 : 2.2; b.cd = 1.5; if (playerNear(s, b.x, b.y, 24)) s.player.msg = wall ? 'It slammed into the rock: it’s dazed! Bite it now!' : 'It’s winded: bite it now!';
    }
    return; }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.charge = { dx: k.dx, dy: k.dy, len: k.len, done: 0, hit: {}, second: !!k.second }; return; }
  b.cd -= dt; b.snapT = (b.snapT || 0) - dt;
  const tg = bossTarget(s, b, 14); if (!tg) return;
  const [a, d] = tg; b.dx = (a.x - b.x)/d; b.dy = (a.y - b.y)/d;
  if (d < 1.9*T){ if (b.snapT <= 0){ b.snapT = b.phase === 2 ? 1 : 1.4; b.snapAt = s.t; hurtAnt(s, a, 4, 'beetle'); spark(s, null, a.x, a.y, 1); } }
  if (b.cd <= 0 && d > 2.2*T){ b.atk = { kind: 'lane', x: b.x, y: b.y, dx: b.dx, dy: b.dy, len: 11*T, w: 1.8*T, t: 0, at: 1.0 }; return; }
  if (d > 4*T) bossWalk(s, b, a.x, a.y, 14, dt);
}
function stepAntlion(s, b, B, dt){
  const w = s.world, pit = w.pits[b.pit]; if (!pit) return;
  const px = pit.x*T, py = pit.y*T, fast = b.phase === 2;
  if (b.move){ b.move.t += dt; if (b.move.t >= 2){ b.pit = b.move.to; const q = w.pits[b.pit]; b.x = q.x*T; b.y = q.y*T; b.move = null; b.cd = 1; } return; }
  b.x = px; b.y = py;
  if (!b.under){ b.upT -= dt; b.snapT = (b.snapT || 0) - dt;
    const tg = bossTarget(s, b, B.r + 1.2); if (tg && b.snapT <= 0){ b.snapT = 1.2; b.snapAt = s.t; hurtAnt(s, tg[0], 3, 'antlion'); spark(s, null, tg[0].x, tg[0].y, 1); }
    if (b.upT <= 0){ b.under = true; b.cd = 1.2; } return; }
  if (b.mode === 'idle') return;
  // A crew round the pit's edge draws her up.
  let edge = 0; for (const a of s.ants) if (!a.team && outside(a)){ const d = Math.hypot(a.x - px, a.y - py); if (d < (pit.r + 3)*T) edge++; }
  b.lureT = edge >= 8 ? (b.lureT || 0) + dt : 0;
  if (b.lureT > 2){ b.lureT = 0; b.atk = null; b.under = false; b.upT = 5; b.atkDone = { kind: 'surface', t: s.t }; if (playerNear(s, b.x, b.y, 24)) s.player.msg = 'She bursts out of the sand! Bite her now!'; return; }
  if (fast){ b.tunnelT = (b.tunnelT || 0) + dt; if (b.tunnelT > 22 && w.pits.length > 1){ b.tunnelT = 0; let to = b.pit; while (to === b.pit) to = Math.floor(Math.random()*w.pits.length); b.move = { from: b.pit, to, t: 0 }; b.atk = null; return; } }
  if (b.atk){ const k = b.atk; k.t += dt; if (k.t < k.at) return; b.atk = null; b.atkDone = { kind: k.kind, x: k.x, y: k.y, t: s.t };
    if (k.kind === 'grab'){ const v = s.ants.find(a => a.id === k.id); if (v && outside(v) && inAtk(k, v.x, v.y)){ killAnt(s, v, 'antlion'); b.under = false; b.upT = fast ? 2.6 : 3.6; } b.cd = fast ? 1 : 1.6; }
    else { for (const a of s.ants) if (outside(a) && inAtk(k, a.x, a.y)){ a.slowT = 3; shove(s, a, a.x + (a.x - px), a.y + (a.y - py), 1.5); hurtAnt(s, a, 0.5, 'antlion'); } b.cd = 2; }
    return; }
  b.cd -= dt; if (b.cd > 0) return;
  // The nearest ant to the pit: grabbed if close, showered with sand if not.
  let best = null, bd = 10*T; for (const a of s.ants){ if (!outside(a)) continue; const d = Math.hypot(a.x - px, a.y - py); if (d < bd){ bd = d; best = a; } }
  if (!best) return;
  if (bd < (pit.r*1.7)*T) b.atk = { kind: 'grab', id: best.id, x: best.x, y: best.y, r: 1.2*T, t: 0, at: fast ? 0.8 : 1.05 };
  else b.atk = { kind: 'toss', x: best.x, y: best.y, r: 1.6*T, t: 0, at: 1.3 };
}
