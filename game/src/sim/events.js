// Events (build 19): the director, swarm days, heatwaves, rain, and the Cordyceps outbreak.
import { AREAS, REGION } from './yard.js';
import { CASTES, H, T, W, idx } from './core.js';
import { cordResist, exitNest, killAnt, queenCap } from './colony.js';
import { areaOf, chooseToward, itemAt, mkAnt, spawnInArea, stepTo, walk } from './world.js';
import { bite, gainGenes, gainXp, has, makeLegend, maxHp, youL } from './progress.js';
import { deathTotal } from './outposts.js';
import { clearOf } from './spider.js';
import { outside } from './hazards.js';
import { playerNear } from './creatures.js';
import { spark } from './combat.js';
import { antCount } from './commands.js';

// A director, as in RimWorld: every few minutes something happens. Gifts
// (a swarm of winged queens, a picnic) and hardships (a heatwave) any time;
// the lethal ones (a war party, a Cordyceps outbreak) only once the colony
// can take it, never two within three minutes, and more likely after a long
// calm. Each is announced with a banner and ends with a report.
export const EVENTS = {
  swarm: { name: 'Swarm day', icon: '🪽', kind: 'gift', dur: 60, line: 'Winged queens from every colony are falling all over the yard: free protein. The birds have noticed too.' },
  picnic: { name: 'A picnic', icon: '🧺', kind: 'gift', dur: 100, line: 'People have sat down for a picnic. Treats are dropping, and so are feet.' },
  heat: { name: 'Heatwave', icon: '☀', kind: 'hard', dur: 120, line: 'The yard bakes. Puddles shrink, dew dries, the colony drinks more, and ants outside slow down.' },
  warparty: { name: 'War party', icon: '⚔', kind: 'lethal', dur: 180, line: 'The pavement ants march on your nest, led by their champion. Kill the champion and the rest lose heart.' },
  cordyceps: { name: 'Outbreak: Cordyceps', icon: '🍄', kind: 'lethal', dur: 600, line: 'A parasitic fungus has taken some of your foragers. Kill the zombies before stalks burst from them. Nurses can cure the newly infected inside.' },
};
const CHAMPS = ['Gravel-Jaw', 'Cinder', 'Old Crack', 'Grit-Tooth', 'Slab'];
export function tickDirector(s, dt){
  const D = s.director; if (!s.queen.placed || s.lost) return;
  if (s.event){ tickEvent(s, dt); return; }
  D.calm += dt;
  if (s.t < D.next) return;
  const n = antCount(s), cap = queenCap(s.queen.level, s), strong = n >= Math.max(12, cap*0.3);
  // Build 19.1 (Mark: "events shouldn't happen too often… the more serious
  // ones even less"): lethal ones not before 25 minutes and 20 minutes apart;
  // hardships 12 minutes from the last hard or lethal one.
  const lethalOk = strong && s.t - D.lastLethal > 1200 && s.t > 1500, k = D.calm > 900 ? 2 : 1;
  const opts = [['swarm', 3], ['picnic', 2.5]];
  if (s.t > 900 && s.t - Math.max(D.lastHard || -999, D.lastLethal) > 720) opts.push(['heat', 1.5]);
  const fighters = s.ants.filter(a => !a.team && CASTES[a.caste].fight >= 3).length;
  if (lethalOk && s.rival.queenAlive && (fighters >= 2 || s.t > 1200)) opts.push(['warparty', 2*k]);
  if (lethalOk && s.t > 1800 && n >= 15 && !s.colony.trophies.sporeheart) opts.push(['cordyceps', (D.had.cordyceps ? 1.5 : 3)*k]);
  let tot = 0; for (const o of opts) tot += o[1];
  let r = Math.random()*tot, key = opts[0][0]; for (const [kk, wt] of opts){ r -= wt; if (r <= 0){ key = kk; break; } }
  startEvent(s, key);
}
export function startEvent(s, key){
  const E = EVENTS[key], D = s.director, w = s.world, P = s.player;
  const ev = s.event = { key, t: 0, end: E.dur, lost0: deathTotal(s.colony), data: {} };
  D.had[key] = (D.had[key] || 0) + 1; if (E.kind === 'lethal') D.lastLethal = s.t; if (E.kind === 'hard') D.lastHard = s.t;
  s.banner = { key, t: s.t, icon: E.icon, title: E.name, line: E.line, kind: E.kind }; s.events.push('event');
  P.msg = `${E.icon} ${E.name}! ${E.line}`;
  if (key === 'picnic'){
    const opts = [REGION.picnic, REGION.lawn, REGION.clover].filter(i => i != null && s.active[i]);
    const ai = opts.length ? opts[Math.floor(Math.random()*opts.length)] : REGION.lawn; ev.data.region = ai;
    for (const t of ['cookie', 'jellybean', 'gummy']) spawnInArea(s, ai, 'food', t);
    s.banner.line = `People have sat down for a picnic by ${AREAS[ai].name.replace(/^The /, 'the ')}. Treats are dropping, and so are feet.`; P.msg = `${E.icon} ${E.name}! ${s.banner.line}`;
  }
  if (key === 'warparty'){
    const name = CHAMPS[(D.had.warparty - 1) % CHAMPS.length];
    const champ = mkAnt(s, 'soldier', 'in', w.rx, w.ry, 1); champ.champion = true; champ.name = name; champ.hp = champ.maxHp = 40; exitNest(s, champ, 'raid');
    // A raid's worth of soldiers and two more, behind the champion.
    const size = Math.min(14, 3 + Math.floor(Math.max(0, s.t - 360)/150)) + 1;
    for (let i = 0; i < size; i++){ const a = mkAnt(s, 'soldier', 'in', w.rx, w.ry, 1); exitNest(s, a, 'raid'); }
    ev.data.champ = champ.id; ev.data.name = name;
    s.banner.title = `War party: ${name}`; s.banner.line = `The pavement ants march on your nest, led by their champion ${name}. Kill ${name} and the rest lose heart.`; P.msg = `⚔ ${s.banner.line}`;
    s.raidLive = true; s.raidStart = { team: 1, lost: deathTotal(s.colony), killed: s.rival.deaths.war || 0, stolen: s.colony.stolen, crits: s.colony.crits || 0 };
  }
  if (key === 'cordyceps'){
    // Two foragers out working, far from home, are the first taken.
    const out = s.ants.filter(a => !a.team && !a.isPlayer && outside(a) && !a.follow).sort((a, b) => Math.hypot(b.tx - w.ex, b.ty - w.ey) - Math.hypot(a.tx - w.ex, a.ty - w.ey));
    for (const a of out.slice(0, 2)) a.infect = 0.01;
    if (!out.length){ const inside = s.ants.filter(a => !a.team && !a.isPlayer); if (inside.length) inside[0].infect = 0.01; }
  }
}
function endEvent(s, msg){
  const ev = s.event, D = s.director, E = EVENTS[ev.key];
  const lost = deathTotal(s.colony) - ev.lost0;
  s.report = { kind: 'event', key: ev.key, lost, t: s.t }; s.events.push('eventover');
  s.player.msg = msg || `${E.name} is over.${E.kind === 'lethal' ? ` You lost ${lost} ant${lost === 1 ? '' : 's'}.` : ''}`;
  // The next one 8 to 10 minutes after this one ends.
  s.event = null; D.next = s.t + 480 + Math.random()*120; if (E.kind !== 'gift') D.calm = 0;
}
function tickEvent(s, dt){
  const ev = s.event, c = s.colony; ev.t += dt;
  if (ev.key === 'swarm'){
    // A winged queen drops near ants every couple of seconds; birds come early.
    ev.data.acc = (ev.data.acc || 0) + dt;
    if (ev.t < 40 && ev.data.acc > 3.5){ ev.data.acc = 0; const out = s.ants.filter(a => !a.team && outside(a));
      if (out.length){ const a = out[Math.floor(Math.random()*out.length)];
        for (let tries = 0; tries < 20; tries++){ const x = Math.round(a.tx + (Math.random() - 0.5)*24), y = Math.round(a.ty + (Math.random() - 0.5)*24);
          if (walk(s, x, y) && !s.world.pit[idx(x,y)] && !itemAt(s, x, y)){ s.items.push({ x, y, kind: 'protein', type: 'alate', amt: 6, fell: s.t }); const ai = areaOf(s, x, y); if (AREAS[ai].strike && AREAS[ai].strike.kind === 'bird') s.strikeT[ai] = Math.min(s.strikeT[ai], 6); break; } } } }
    if (ev.t >= ev.end) endEvent(s, 'The swarm is over. Haul in what fell.');
  } else if (ev.key === 'picnic'){
    if (ev.t >= ev.end) endEvent(s, 'The picnic is packed up.');
  } else if (ev.key === 'heat'){
    c.water = Math.max(0, c.water - (has(s, 'heat') ? 0.02 : 0.06)*dt);
    for (const f of s.items) if (f.type === 'puddle') f.amt = Math.max(3, f.amt - 0.15*dt);
    s.dewTimer = 0;
    if (ev.t >= ev.end){ endEvent(s, 'The heat breaks. Thunder rolls in.'); const r = s.rain; if (!r.on) r.t = Math.max(r.t, r.next - 22); }
  } else if (ev.key === 'warparty'){
    const champ = s.ants.find(a => a.id === ev.data.champ && a.state !== 'dead');
    if (!champ){
      // The champion fell: the rest of the war party breaks and runs home.
      for (const a of s.ants) if (a.team && a.state === 'raid'){ a.state = 'return'; a.flee = 3; }
      const killer = Object.entries(ev.data.biters || {}).sort((a, b) => b[1] - a[1])[0];
      const k = killer && s.ants.find(a => a.id === +killer[0]); if (k && !k.team) makeLegend(s, k, 'Champion-killer');
      gainGenes(s, 2, ev.data.name + ' is dead');
      return endEvent(s, `${ev.data.name} is dead! The war party breaks and runs.`);
    }
    if (ev.t >= ev.end || champ.state === 'in') endEvent(s, `${ev.data.name}'s war party is over.`);
    else if (!ev.data.shown && s.player.ant && !s.player.inNest && Math.hypot(champ.x - s.player.ant.x, champ.y - s.player.ant.y) < 22*T){ ev.data.shown = true; s.introSeq = { kind: 'champ', id: champ.id, name: ev.data.name, x: champ.x, y: champ.y, t: s.t }; } // build 78: the champion's introduction
  } else if (ev.key === 'cordyceps') tickCordyceps(s, dt);
}
// Cordyceps: an infected ant works on for 15 s (nurses can cure it inside),
// then turns: it leaves its work and climbs to a high place, twitching. At
// 35 s it dies and a fungal stalk grows from it; 12 s later the stalk bursts
// and spores land on every ant close by. Fighters, your crew and you kill
// zombies and stalks. Each outbreak survived makes the colony harder to infect.
export const CORD = { turn: 15, die: 35, grow: 12, burst: 3.5 };
function tickCordyceps(s, dt){
  const ev = s.event, c = s.colony, P = s.player, yb = youL(s) >= 3 ? 1.5 : 1;
  const nurses = s.ants.filter(a => !a.team && a.caste === 'nurse' && (a.state === 'in' || a.state === 'build'));
  for (const a of s.ants){
    if (a.infect == null || a.state === 'dead') continue;
    a.infect += dt;
    const inside = a.state === 'in' || a.state === 'build';
    if (a.infect < CORD.turn){
      // Nurses cure it in time, inside; left alone inside, it spreads.
      if (inside && nurses.length && Math.random() < dt*0.12*Math.min(3, nurses.length)){ a.infect = null; ev.data.cured = (ev.data.cured || 0) + 1; for (const n of nurses) gainXp(s, n, 2); if (!ev.data.saidCure){ ev.data.saidCure = true; P.msg = 'Your nurses caught the fungus early and cured an ant.'; } continue; }
      if (inside && Math.random() < dt*0.03*cordResist(s)){ const v = s.ants.find(o => !o.team && o !== a && (o.state === 'in' || o.state === 'build') && o.infect == null && !o.isPlayer && Math.random() < 0.3); if (v) v.infect = 0.01; }
      continue;
    }
    if (!a.zombie){ a.zombie = true; a.zhp = maxHp(s, a) + 2; if (a.isPlayer){ a.zombie = false; a.infect = null; continue; }
      if (inside) exitNest(s, a, 'zombie'); else a.state = 'zombie'; a.follow = false; a.carry = 0; a.goal = null; a.explore = 0;
      if (!ev.data.saidTurn){ ev.data.saidTurn = true; P.msg = 'An infected ant has turned! It’s climbing to spread its spores: kill it.'; } }
    if (a.infect >= CORD.die){
      s.stalks.push({ x: a.x, y: a.y, t: 0, hp: 10, id: s.nextId++ });
      killAnt(s, a, 'cordyceps');
      if (!ev.data.saidStalk && playerNear(s, a.x, a.y, 30)){ ev.data.saidStalk = true; P.msg = 'A fungal stalk is growing from a dead ant! Destroy it before it bursts.'; }
    }
  }
  // Fighters, your crew and you go after zombies and stalks.
  for (const z of s.ants){
    if (!z.zombie || z.state === 'dead') continue;
    for (const a of s.ants){ if (a.team || a.zombie || !outside(a)) continue; const fighter = CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer, d = Math.hypot(a.x - z.x, a.y - z.y);
      if (fighter && d < 1.5*T){ z.zhp -= bite(s, a)*dt*(a.isPlayer ? 2*yb : 1); z.hitT = s.t; spark(s, a, (a.x + z.x)/2, (a.y + z.y)/2, 0); gainXp(s, a, dt);
        if (z.zhp <= 0){ killAnt(s, z, 'culled'); gainXp(s, a, 5); ev.data.culled = (ev.data.culled || 0) + 1; break; } }
      else if (CASTES[a.caste].fight >= 3 && d < 8*T && (a.state === 'patrol' || a.state === 'hunt')){ a.state = 'fight'; a.goal = 'zombie'; a.zid = z.id; } }
  }
  for (const st of s.stalks){
    st.t += dt;
    for (const a of s.ants){ if (a.team || a.zombie || !outside(a)) continue; const fighter = CASTES[a.caste].fight >= 3 || a.follow || a.isPlayer, d = Math.hypot(a.x - st.x, a.y - st.y);
      if (fighter && d < 1.6*T){ st.hp -= bite(s, a)*dt*(a.isPlayer ? 2*yb : 1); st.hitT = s.t; spark(s, a, (a.x + st.x)/2, (a.y + st.y)/2, 0); if (st.hp <= 0){ st.gone = true; gainXp(s, a, 5); ev.data.stalks = (ev.data.stalks || 0) + 1; break; } }
      else if (CASTES[a.caste].fight >= 3 && d < 8*T && (a.state === 'patrol' || a.state === 'hunt')){ a.state = 'fight'; a.goal = 'stalk'; a.zid = st.id; } }
    if (!st.gone && st.t >= CORD.grow){
      // It bursts: spores on every ant close by (fighters resist better; each outbreak survived helps).
      st.gone = true; s.bursts.push({ x: st.x, y: st.y, t: s.t }); s.events.push('spores');
      const resist = Math.max(0.2, 1 - 0.2*(c.immunity || 0))*cordResist(s);
      for (const a of s.ants) if (outside(a) && a.infect == null && !a.isPlayer && Math.hypot(a.x - st.x, a.y - st.y) < CORD.burst*T && Math.random() < (CASTES[a.caste].fight >= 3 ? 0.35 : 0.6)*resist) a.infect = 0.01;
    }
  }
  s.stalks = s.stalks.filter(st => !st.gone);
  if (s.bursts.length) s.bursts = s.bursts.filter(b => s.t - b.t < 2);
  const left = s.ants.filter(a => a.infect != null && a.state !== 'dead').length;
  ev.data.infected = left; ev.data.stalkN = s.stalks.length;
  if (!left && !s.stalks.length && ev.t > 5){
    c.immunity = (c.immunity || 0) + 1; gainGenes(s, 2, 'surviving an outbreak');
    const lost = deathTotal(c) - ev.lost0;
    endEvent(s, `The outbreak is over. The fungus took ${lost} ant${lost === 1 ? '' : 's'}${ev.data.cured ? `, and your nurses cured ${ev.data.cured}` : ''}. The colony is a little more resistant now.`);
  }
}
// A zombie wanders off and climbs to a high place (beside a rock or a stem),
// where it clamps on and twitches.
export function stepZombie(s, a, dt){
  if (a.clamp) return;
  if (!a.zgoal){ const cl = clearOf(s); let best = null, bd = 1e9;
    for (let k = 0; k < 40; k++){ const x = a.tx + Math.round((Math.random() - 0.5)*24), y = a.ty + Math.round((Math.random() - 0.5)*24); if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue; if (cl[y*W + x] === 1){ const d = Math.hypot(x - a.tx, y - a.ty); if (d < bd){ bd = d; best = [x, y]; } } }
    a.zgoal = best || [a.tx, a.ty]; }
  if (a.tx === a.zgoal[0] && a.ty === a.zgoal[1] && Math.hypot(a.x - (a.tx + 0.5)*T, a.y - (a.ty + 0.5)*T) < 2){ a.clamp = true; return; }
  if (stepTo(a, a.tx, a.ty, 24, dt)) chooseToward(s, a, (a.zgoal[0] + 0.5)*T, (a.zgoal[1] + 0.5)*T);
}
