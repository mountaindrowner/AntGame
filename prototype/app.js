// ===== Underfoot — app v2 (DOM, canvas, input) =====
(() => {
const { W, H, T, NW, NH, SHAFT, CASTES, ROOMS, ROOM_KEYS, SOIL, soilTier } = SIM;
const SAVE_KEY = 'underfoot-poc-v5';
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let s; try { const j = localStorage.getItem(SAVE_KEY); s = j ? SIM.deserialize(j) : SIM.create(7); } catch (e) { s = SIM.create(7); }
let cw = 0, ch = 0, dpr = 1, zoomOut = false, zoomMul = 1, panY = 0, placing = null, fps = 0, frames = 0, fpsT = 0;
let view = s.phase === 'dig' || s.player.inNest ? 'nest' : 'surface', menu = null, menuRect = null, menuCell = null;
const P = () => s.player;
const EXPL = {
  dig: ['You are the queen', 'This is the underground, seen from the side. Tap the dirt next to the queen to dig. She has 30 digs of energy. Go at least two cells down, then press Build nest. Everything in this game costs food, so dig less and save energy.'],
  nest: ['The nest', 'Tap any dirt next to a tunnel to order a dig; the faint dots show where you can. Builders chip it away a quarter at a time. Press Build to see every room, its size and cost; pick one and tap a green cell to place it. The yellow ant is you: taps on tunnels walk you; the top cell leads outside.'],
  surface: ['Outside', 'Tap to walk, hold to keep walking. Yellow dots are food, blue is water, gray is grit (pebbles), red is protein (meat). Stand on one and press Pick up, then carry it to the dark hole. Carrying lays a scent trail; other ants follow trails to what you found.'],
  dew: ['Dew', 'Blue drops near the nest for one minute, every two minutes. Every egg costs 1 water. A Cistern raises your water cap from 10 to 60. The big blue puddle is permanent but far.'],
  cat: ['Caterpillar', 'The green one is harmless and worth 40 protein, which Soldiers and the Barracks need. Hold Recruit to call about 8 ants, walk them onto it, and they will bite it down. Then haul the red meat home.'],
  spider: ['Spider', 'It hunts anything within three tiles and bites once every two seconds. Run. Thirty ants or five Venom ants can kill it. Its fang unlocks Venom ants at the queen.'],
  raid: ['Rival raid', 'The red-ringed hole at the far end is a rival colony. When it has more soldiers than you it sends four to your entrance to steal food. A Soldier patrolling near your door halves what they take. To win, put six fighters on their entrance for five seconds.'],
  rain: ['Rain', 'Trails wash away and foragers go home. If a Cistern exists it fills. If no Builder is inside when the rain ends, the lowest level caves in.'],
  cavein: ['Cave-in', 'A tunnel collapsed. Each dug level needs one Builder inside to keep it shored up. Builders repair collapses by themselves. If you are inside and stuck, tap the collapsed cell next to you to dig through.'],
  protein: ['Protein', 'Red meat on the ground. Any ant that walks onto it carries 5 home. Protein pays for Soldiers, Venom ants, and the Barracks.'],
  grit: ['Stone', 'Gray pebbles. Builders fetch them when the colony has food to spare. Stone pays for the Food store, the Cistern, the Workshop, and queen upgrades.'],
  queen: ['', 'The queen lays one egg at a time until you build a Hatchery. Each caste has a job and a passive effect. See Help for the list.'],
  build: ['', 'Each room needs a dug pocket of its own size. Builders finish it. Costs are paid now. One of each room.'],
  soil: ['Soil', 'The ground gets harder with depth: soft topsoil for 14 rows, packed soil for the next 14 (needs a Workshop), clay below that (needs a Workshop and a queen upgrade). Rooms need room: a Barracks is 6 wide, a Workshop 5 by 4. Space is the economy.'],
  cap: ['The queen\u2019s reach', 'A queen can only hold so many ants together. At the cap, eggs stop hatching. Upgrade her at the queen menu to raise it and to dig deeper.'],
};
const HELP = `
<div class="row head"><strong>Help</strong><button class="x" data-close="1">Close</button></div>
<div class="h"><b>Goal</b> Grow the colony, then kill the rival queen: six fighters on the red-ringed hole with no rival soldiers near it for five seconds.</div>
<div class="h"><b>Food</b> Yellow crumbs and tan seeds. Every ant eats 1 a minute, soldiers 2. The top bar shows income vs upkeep. Food store raises the cap from 20 to 150.</div>
<div class="h"><b>Water</b> Blue. Dew for one minute every two minutes, plus one permanent puddle. Every egg costs 1. Cistern raises the cap to 60 and fills in rain.</div>
<div class="h"><b>Protein</b> Red meat from kills (caterpillar 40, spider 40). Pays for Soldiers, Venom ants, Barracks.</div>
<div class="h"><b>Stone</b> Gray pebbles. Pays for Food store, Cistern, Workshop, queen upgrades.</div>
<div class="h"><b>Digging and building</b> Tap dirt next to a tunnel to order a dig (faint dots mark the frontier). Builders break each cell a quarter at a time and spread across orders. Topsoil is 14 rows; packed soil below needs a Workshop; clay below that needs a queen upgrade too. Every 40 dug cells need one builder inside or tunnels cave in. Tap a dug cell to see which rooms fit the pocket around it; each room lists its size (Barracks 6×3, Workshop 5×4, Cistern 4×4, Store 5×3, Hatchery and Nursery 4×3). Press Build for the catalog: every room with size, cost and status; pick one and green cells show where it fits. Tools: Fill tunnel packs dirt back, Remove room tears one out for half its cost.</div>
<div class="h"><b>The queen</b> Holds 20 ants per level of upgrade (20, 40, 60, 80). At the cap, eggs pause. Upgrades cost food, protein, and later stone.</div>
<div class="h"><b>Castes and what they do on their own</b></div>
<div class="h">Forager: gathers food, water, grit. Lays trails home.<br>Builder: digs rooms and levels. Passive: each dug level needs one builder inside or tunnels cave in; builders hold the drains in rain and repair collapses.<br>Nurse (needs Nursery): passive: each nurse inside, up to three, hatches eggs 12% faster.<br>Soldier (needs Barracks): fights on contact, answers alarm at the door. Passive: a soldier patrolling near the entrance halves what raiders steal.<br>Venom ant (needs spider fang): 8× bite. Five take a spider.</div>
<div class="h"><b>Rooms</b> Hatchery: +2 eggs at a time. Food store: cap 150. Cistern: water cap 60. Nursery: unlocks Nurses, eggs hatch 30% faster. Barracks: unlocks Soldiers. Workshop: packed soil, builders 2× faster.</div>
<div class="h"><b>Outside controls</b> Tap to walk, hold to keep walking. Pinch to zoom. Pick up / Drop. Mark trail lays scent while you walk. Hold Recruit to call up to 20 ants (near the nest or near other ants); Release lets them go, and if they are standing on food they haul it. Enter nest appears near the hole.</div>
<div class="h"><b>Nest controls</b> Tap the queen for eggs and upgrades. Tap dirt to order digging. Tap inside a dug pocket to build. Build opens the catalog; Cancel leaves placement. Exit nest walks you to the top. Pinch to zoom, drag to scroll the nest. Clear dig orders is in the build sheet.</div>
<div class="h"><b>You</b> The yellow ant. Hunger drains as you walk; it refills near the nest or beside a forager carrying food. If you die you become the next hatchling. You bite at double power and heal when not fighting.</div>
<div class="h"><b>Threats</b> Spider (run, or 30 ants), rival soldiers (foragers flee them), rain (trails wash out, cave-in without a builder inside), cave-ins (one builder per level).</div>`;
let paused = false;
const INTRO = [
  { text: 'A young queen lands after her mating flight. She drops her wings. Her body holds enough food for a few eggs, and tonight she has to get underground.', btn: 'Next' },
  { text: 'Dig. Tap the dirt directly under her.', done: s => s.queen.energy < 30 },
  { text: 'Two cells down is enough. Every dig costs energy she could spend on eggs.', done: s => s.queen.y >= 2 },
  { text: 'Press Build nest. She hollows out a chamber around herself.', done: s => s.queen.placed },
  { text: 'She lays one egg from her own body. It hatches as you.', done: s => !!s.player.ant },
  { text: 'You are a Forager. Tap the cell above you to climb the shaft, then tap the top cell to go outside.', done: s => !s.player.inNest },
  { text: 'Find a yellow crumb. Tap it, press Pick up, then carry it to the dark hole.', done: s => s.colony.delivered.reduce((a,b)=>a+b,0) > 0 },
  { text: 'That is the loop: food in, eggs out. Next: tap Nest, tap the queen, lay a Builder. Tap dirt to order digs. Press Build to see every room with its size and cost; pick one and tap a green cell to place it. Pinch to zoom.', btn: 'Done' },
];
function introStep(){ const i = s.seen.intro; return typeof i === 'number' ? i : (i === 'done' ? -1 : 0); }
function introText(){ const i = introStep(); return i < 0 ? null : INTRO[i].text; }
function introAdvance(){ let i = introStep(); if (i < 0) return; i++; if (i >= INTRO.length){ s.seen.intro = 'done'; s.seen.dig = s.seen.nest = s.seen.surface = true; } else s.seen.intro = i; }
function tickIntro(){ const i = introStep(); if (i < 0) return; const st = INTRO[i]; if (st.done && st.done(s)) introAdvance(); }
function showExplainer(key){ if (s.seen[key] || menu === 'info') return; s.seen[key] = true; const [t, b] = EXPL[key]; menu = 'info'; sheet.classList.remove('hidden'); sheet.innerHTML = `<div class="row head"><strong>${t}</strong></div><div class="h">${b}</div><div class="btns one"><button data-close="1" class="primary">Got it</button></div>`; paused = true; }
function checkExplainers(){
  tickIntro(); if (introStep() >= 0) { if (s.events.length && !EXPL[s.events[0]]) s.events.shift(); }
  if (introStep() >= 0){ while (s.events.length){ const e = s.events.shift(); if (EXPL[e] && !['dig','nest','surface'].includes(e)){ showExplainer(e); if (menu === 'info') return; } } return; }
  if (s.phase === 'dig') showExplainer('dig');
  else if (P().ant && P().inNest) showExplainer('nest');
  else if (P().ant && !P().inNest) showExplainer('surface');
  if (menu === 'info') return;
  while (s.events.length){ const e = s.events.shift(); if (EXPL[e]){ showExplainer(e); if (menu === 'info') return; } }
  const a = P().ant; if (a && !P().inNest){ if (s.spider && Math.hypot(a.x - s.spider.x, a.y - s.spider.y) < 9*T) showExplainer('spider'); if (s.cat && Math.hypot(a.x - s.cat.x, a.y - s.cat.y) < 9*T) showExplainer('cat'); }
  if (!s.seen.grit && s.colony.grit > 0) showExplainer('grit');
}
function resize(){ dpr = Math.min(2, window.devicePixelRatio || 1); cw = window.innerWidth; ch = window.innerHeight; canvas.width = Math.floor(cw*dpr); canvas.height = Math.floor(ch*dpr); canvas.style.width = cw+'px'; canvas.style.height = ch+'px'; }
window.addEventListener('resize', resize); resize();

// ---------- ground texture ----------
const ground = document.createElement('canvas'); ground.width = W*T; ground.height = H*T;
function paintGround(){
  const g = ground.getContext('2d'); g.fillStyle = '#8a6a3c'; g.fillRect(0,0,W*T,H*T);
  const rnd = (function(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})(3);
  for (let i=0;i<9000;i++){ g.fillStyle = rnd() < 0.5 ? 'rgba(60,40,20,0.25)' : 'rgba(200,170,110,0.25)'; g.fillRect(rnd()*W*T, rnd()*H*T, 2, 2); }
  for (let i=0;i<260;i++){ g.fillStyle = 'rgba(70,110,50,0.35)'; g.fillRect(rnd()*W*T, rnd()*H*T, 1, 4+rnd()*4); }
  const b = s.world.blocked;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) if (b[y*W+x]){ g.fillStyle = '#6b655c'; g.fillRect(x*T, y*T, T, T); g.fillStyle = '#857e73'; g.fillRect(x*T+2, y*T+2, T-6, T-6); }
}
paintGround();
const dirt = document.createElement('canvas'); dirt.width = NW*T; dirt.height = NH*T;
(function(){ const g = dirt.getContext('2d'); g.fillStyle = '#4a3521'; g.fillRect(0,0,NW*T,NH*T); const rnd = (function(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})(9);
  for (let i=0;i<6000;i++){ g.fillStyle = rnd()<0.5 ? 'rgba(30,18,8,0.35)' : 'rgba(140,100,60,0.25)'; g.fillRect(rnd()*NW*T, rnd()*NH*T, 2+rnd()*2, 2); } })();

// ---------- cameras ----------
function camSurface(){
  const z = (zoomOut ? Math.min(cw/(W*T), ch/(H*T)) : Math.min(2.2, cw/(26*T))) * zoomMul;
  const a = P().ant && !P().inNest ? P().ant : null; let cx = a ? a.x : (s.world.ex+0.5)*T, cy = a ? a.y : (s.world.ey+0.5)*T;
  const vw = cw/z, vh = ch/z; cx = vw >= W*T ? W*T/2 : Math.max(vw/2, Math.min(W*T - vw/2, cx)); cy = vh >= H*T ? H*T/2 : Math.max(vh/2, Math.min(H*T - vh/2, cy));
  return { z, cx, cy };
}
function camNest(){
  const z = (zoomOut ? Math.min(cw/(NW*T), (ch-170)/(NH*T)) : Math.min(2.4, cw/(NW*T))) * zoomMul;
  const a = P().ant && P().inNest ? P().ant : null; let cx = NW*T/2, cy = (a ? a.ny*T : (s.queen.y+0.5)*T) + panY;
  const vw = cw/z, vh = (ch-170)/z; cx = vw >= NW*T ? NW*T/2 : Math.max(vw/2, Math.min(NW*T - vw/2, cx)); cy = vh >= NH*T ? NH*T/2 : Math.max(vh/2, Math.min(NH*T - vh/2, cy));
  return { z, cx, cy, oy: -60 };
}
function toWorld(sx, sy){ const c = camSurface(); return [ (sx - cw/2)/c.z + c.cx, (sy - ch/2)/c.z + c.cy ]; }
function toNest(sx, sy){ const c = camNest(); return [ (sx - cw/2)/c.z + c.cx, (sy - (ch/2 + c.oy))/c.z + c.cy ]; }

// ---------- draw: surface ----------
function drawSurface(){
  const c = camSurface(); const w = s.world;
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle = '#5c4529'; ctx.fillRect(0,0,cw,ch);
  ctx.translate(cw/2, ch/2); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ground, 0, 0);
  const x0 = Math.max(0, Math.floor((c.cx - cw/c.z/2)/T)), x1 = Math.min(W-1, Math.ceil((c.cx + cw/c.z/2)/T)), y0 = Math.max(0, Math.floor((c.cy - ch/c.z/2)/T)), y1 = Math.min(H-1, Math.ceil((c.cy + ch/c.z/2)/T));
  for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){ const i = y*W+x; const t = s.trail[i], al = s.alarm[i];
    if (t > 0.04){ ctx.fillStyle = `rgba(140,230,110,${Math.min(0.7, t*0.3)})`; ctx.fillRect(x*T, y*T, T, T); }
    if (al > 0.08){ ctx.fillStyle = `rgba(230,70,50,${Math.min(0.6, al*0.2)})`; ctx.fillRect(x*T, y*T, T, T); } }
  const hole = (x, y, ring) => { ctx.fillStyle = ring; ctx.beginPath(); ctx.arc((x+0.5)*T, (y+0.5)*T, 11, 0, 7); ctx.fill(); ctx.fillStyle = '#1a1009'; ctx.beginPath(); ctx.arc((x+0.5)*T, (y+0.5)*T, 7, 0, 7); ctx.fill(); };
  hole(w.ex, w.ey, '#4a3420'); hole(w.rx, w.ry, s.rival.queenAlive ? '#8a2a1e' : '#5a4a44');
  for (const f of s.items){ if (f.amt <= 0) continue;
    ctx.fillStyle = f.kind==='water' ? 'rgba(90,170,230,0.85)' : f.kind==='grit' ? '#9a948c' : f.kind==='protein' ? '#b24a3a' : f.type==='seed' ? '#c9a24a' : '#f2d36b';
    const r = f.kind==='water' ? Math.min(10, 4 + f.amt*0.3) : Math.min(8, 2.5 + f.amt*0.22); ctx.beginPath(); ctx.arc((f.x+0.5)*T, (f.y+0.5)*T, r, 0, 7); ctx.fill(); }
  for (const a of s.ants){ if (a.isPlayer || a.state==='in' || a.state==='build' || a.state==='nest') continue; const C = CASTES[a.caste];
    ctx.fillStyle = a.team ? (C.fight>=3 ? '#7a1f15' : '#a8463a') : a.caste==='venom' ? '#5a2d6b' : C.fight>=3 ? '#0d0a08' : a.caste==='builder' ? '#4a3a2a' : a.caste==='nurse' ? '#6b5a3a' : '#1c1612';
    ctx.beginPath(); ctx.arc(a.x, a.y, C.r, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(a.x + a.dx*C.r*1.3, a.y + a.dy*C.r*1.3, C.r*0.6, 0, 7); ctx.fill();
    if (a.carry){ ctx.fillStyle = a.kind==='water' ? '#7cc4ee' : a.kind==='grit' ? '#bbb' : a.kind==='protein' ? '#d66' : '#f2d36b'; ctx.beginPath(); ctx.arc(a.x + a.dx*C.r*2.2, a.y + a.dy*C.r*2.2, 1.6, 0, 7); ctx.fill(); }
    if (a.follow){ ctx.strokeStyle = 'rgba(255,220,80,0.9)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(a.x, a.y, C.r+1.5, 0, 7); ctx.stroke(); } }
  const ct = s.cat; if (ct){ for (let i=0;i<5;i++){ ctx.fillStyle = i%2 ? '#7fb24a' : '#9ccb5a'; ctx.beginPath(); ctx.arc(ct.x - i*5, ct.y + Math.sin(s.t*4+i)*1.2, 4.5, 0, 7); ctx.fill(); } ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ct.x-16, ct.y+8, 28, 3); ctx.fillStyle = '#8fd36b'; ctx.fillRect(ct.x-16, ct.y+8, 28*Math.max(0, ct.hp/ct.maxHp), 3); }
  const sp = s.spider; if (sp){ ctx.strokeStyle = '#2e1f14'; ctx.lineWidth = 1.2; for (let i=0;i<8;i++){ const ang = i*Math.PI/4 + Math.PI/8; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x + Math.cos(ang)*14, sp.y + Math.sin(ang)*14 + (i%2?3:-3)); ctx.stroke(); }
    ctx.fillStyle = '#4b3324'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#2e1f14'; ctx.beginPath(); ctx.arc(sp.x, sp.y - 7, 5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sp.x-12, sp.y+12, 24, 3); ctx.fillStyle = '#e4524a'; ctx.fillRect(sp.x-12, sp.y+12, 24*Math.max(0, sp.hp/sp.maxHp), 3); }
  if (s.rain.on){ ctx.fillStyle = 'rgba(60,90,140,0.25)'; ctx.fillRect(0, 0, W*T, H*T); }
  const a = P().ant; if (a && !P().inNest){ if (P().tx != null){ ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(P().tx, P().ty, 4, 0, 7); ctx.stroke(); } drawPlayerAnt(a.x, a.y, a.dx, a.dy, a.carry, a.kind); }
}
function drawPlayerAnt(x, y, dx, dy, carry, kind){ ctx.fillStyle = '#1a1409'; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + dx*4.5, y + dy*4.5, 2.2, 0, 7); ctx.fill(); if (carry){ ctx.fillStyle = kind==='water' ? '#7cc4ee' : kind==='grit' ? '#ddd' : kind==='protein' ? '#e88' : '#fff1b0'; ctx.beginPath(); ctx.arc(x + dx*7.5, y + dy*7.5, 2.2, 0, 7); ctx.fill(); } }

// ---------- draw: nest ----------
const ROOM_COL = { queen:'#6a4a7a', hatchery:'#7a6a3a', store:'#8a7a3a', cistern:'#3a6a8a', nursery:'#7a5a6a', barracks:'#5a3a3a', workshop:'#5a5a3a' };
function decorate(r, rw, rh){
  const x = r.x0*T, y = r.y0*T, W2 = rw*T, H2 = rh*T, fl = y + H2 - 3; const col = s.colony;
  if (r.key === 'store'){ const fill = Math.min(1, col.store/Math.max(1,col.cap)); const piles = Math.max(1, Math.round(fill*rw*2)); for (let i=0;i<rw*2;i++){ const px = x + 5 + i*(W2-10)/(rw*2); ctx.fillStyle = i < piles ? '#e8c45a' : 'rgba(232,196,90,0.18)'; ctx.beginPath(); ctx.arc(px, fl-3, 3, Math.PI, 0); ctx.fill(); ctx.fillStyle = i < piles ? '#c9a24a' : 'rgba(201,162,74,0.18)'; ctx.fillRect(px-3, fl-3, 6, 3); } }
  else if (r.key === 'cistern'){ const lvl = Math.min(1, col.water/Math.max(1,col.waterCap)); const wh = (H2-10)*lvl; ctx.fillStyle = 'rgba(80,160,230,0.75)'; ctx.fillRect(x+3, y+H2-3-wh, W2-6, wh); ctx.strokeStyle = 'rgba(200,230,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i=0;i<=W2-6;i+=4) ctx.lineTo(x+3+i, y+H2-3-wh + Math.sin(s.t*3 + i)*1); ctx.stroke(); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x+2, y+10, 2, H2-12); ctx.fillRect(x+W2-4, y+10, 2, H2-12); }
  else if (r.key === 'barracks'){ ctx.fillStyle = '#2a1a14'; for (let i=0;i<rw;i++){ const px = x + 8 + i*(W2-16)/Math.max(1,rw-1); ctx.beginPath(); ctx.arc(px, fl-4, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(px+3.5, fl-5, 2, 0, 7); ctx.fill(); } ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1; for (let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(x+6+i*7, y+12); ctx.lineTo(x+9+i*7, y+22); ctx.stroke(); } }
  else if (r.key === 'hatchery'){ ctx.fillStyle = 'rgba(220,190,120,0.5)'; for (let i=0;i<rw*3;i++){ const px = x + 4 + (i*7.3)%(W2-8), py = fl - 2 - (i%3); ctx.fillRect(px, py, 4, 1); } }
  else if (r.key === 'nursery'){ ctx.fillStyle = '#e8c9d2'; for (let i=0;i<rw;i++){ const px = x + 8 + i*(W2-16)/Math.max(1,rw-1); ctx.beginPath(); ctx.ellipse(px, fl-4, 5, 2.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c9a3b0'; ctx.fillRect(px-5, fl-4, 10, 1.5); ctx.fillStyle = '#e8c9d2'; } }
  else if (r.key === 'workshop'){ ctx.fillStyle = '#9a948c'; for (let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(x+6+i*6, fl-3, 2.5, 0, 7); ctx.fill(); } ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5; for (let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(x+W2-6-i*5, fl-1); ctx.lineTo(x+W2-10-i*5, y+12); ctx.stroke(); } }
  else if (r.key === 'queen'){ ctx.fillStyle = '#4a3528'; ctx.beginPath(); ctx.ellipse(x+W2/2, fl, W2*0.35, 4, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(x+W2/2, y+13, 1.5, 0, 7); ctx.fill(); }
}
function drawNest(){
  const c = camNest(); const n = s.nest, q = s.queen, col = s.colony;
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle = '#2b1d10'; ctx.fillRect(0,0,cw,ch);
  ctx.translate(cw/2, ch/2 + c.oy); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = s.rain.on ? '#6f7f8f' : '#9bc7e6'; ctx.fillRect(-NW*T, -NH*T, NW*T*3, NH*T); ctx.fillStyle = '#5f8f3c'; ctx.fillRect(-NW*T, -6, NW*T*3, 6);
  ctx.drawImage(dirt, 0, 0);
  ctx.fillStyle = 'rgba(20,10,5,0.22)'; ctx.fillRect(0, 14*T, NW*T, 14*T); ctx.fillStyle = 'rgba(120,40,20,0.28)'; ctx.fillRect(0, 28*T, NW*T, (NH-28)*T);
  ctx.fillStyle = 'rgba(255,240,210,0.35)'; ctx.font = '6px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('packed soil · needs Workshop', 2, 14*T + 7); ctx.fillText('clay · needs Workshop + queen upgrade', 2, 28*T + 7);
  for (let y=0;y<NH;y++) for (let x=0;x<NW;x++){ const v = n.cells[y*NW+x]; if (!v) continue; ctx.fillStyle = v === 2 ? '#2a1c10' : '#201508'; ctx.fillRect(x*T, y*T, T, T); }
  // frontier dots (where you can dig)
  if (s.phase === 'play'){ ctx.fillStyle = 'rgba(255,230,180,0.35)'; for (let y=1;y<NH;y++) for (let x=1;x<NW-1;x++){ if (n.cells[y*NW+x]) continue; let adj = false; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy; if (nx>=0&&ny>=0&&nx<NW&&ny<NH&&n.cells[ny*NW+nx]){ adj = true; break; } } if (adj){ ctx.beginPath(); ctx.arc(x*T+T/2, y*T+T/2, 1.2, 0, 7); ctx.fill(); } } }
  for (const o of n.digOrders){ const k = Math.floor(Math.min(0.999, o.progress/o.need)*4); const qd = [[0,0],[1,1],[1,0],[0,1]]; ctx.fillStyle = '#201508'; for (let i=0;i<k;i++){ const [qx,qy] = qd[i]; ctx.fillRect(o.x*T + qx*T/2, o.y*T + qy*T/2, T/2, T/2); } ctx.strokeStyle = 'rgba(255,220,120,0.9)'; ctx.setLineDash([2,2]); ctx.lineWidth = 1; ctx.strokeRect(o.x*T+2, o.y*T+2, T-4, T-4); ctx.setLineDash([]); }
  for (const r of s.repairs){ ctx.strokeStyle = 'rgba(255,120,80,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r.x*T+3, r.y*T+3); ctx.lineTo(r.x*T+T-3, r.y*T+T-3); ctx.moveTo(r.x*T+T-3, r.y*T+3); ctx.lineTo(r.x*T+3, r.y*T+T-3); ctx.stroke(); }
  for (const r of n.rooms){ const rw = r.w||4, rh = r.h||3; ctx.fillStyle = ROOM_COL[r.key] || '#555'; ctx.globalAlpha = 0.45; ctx.fillRect(r.x0*T, r.y0*T, rw*T, rh*T); ctx.globalAlpha = 1; decorate(r, rw, rh); ctx.fillStyle = 'rgba(255,240,210,0.9)'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ROOMS[r.key].name, (r.x0+rw/2)*T, r.y0*T + 8); }
  for (const j of col.buildQueue){ ctx.strokeStyle = 'rgba(255,220,120,0.9)'; ctx.setLineDash([3,3]); ctx.lineWidth = 1; ctx.strokeRect(j.x0*T+1, j.y0*T+1, j.w*T-2, j.h*T-2); ctx.setLineDash([]); const pr = j.progress/ROOMS[j.room].work; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(j.x0*T+4, j.y0*T+j.h*T-7, j.w*T-8, 3); ctx.fillStyle = '#ffd34d'; ctx.fillRect(j.x0*T+4, j.y0*T+j.h*T-7, (j.w*T-8)*Math.min(1,pr), 3); ctx.fillStyle = 'rgba(255,240,210,0.9)'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ROOMS[j.room].name, (j.x0+j.w/2)*T, j.y0*T + 8); }
  if (placing && placing.kind === 'room'){ const R = ROOMS[placing.key]; const cells = placeCells(R.w, R.h); ctx.fillStyle = 'rgba(120,220,110,0.35)'; for (const i of cells){ ctx.fillRect((i%NW)*T+1, Math.floor(i/NW)*T+1, T-2, T-2); } }
  for (const o of n.fillOrders){ ctx.fillStyle = `rgba(150,110,70,${0.35 + 0.5*Math.min(1, o.progress/o.need)})`; ctx.fillRect(o.x*T+2, o.y*T+2, T-4, T-4); ctx.strokeStyle = 'rgba(255,200,150,0.8)'; ctx.setLineDash([2,2]); ctx.strokeRect(o.x*T+2, o.y*T+2, T-4, T-4); ctx.setLineDash([]); }
  if (placing && placing.kind === 'remove'){ ctx.strokeStyle = 'rgba(255,120,80,0.9)'; ctx.setLineDash([3,2]); for (const r of n.rooms){ if (r.key !== 'queen') ctx.strokeRect(r.x0*T+1, r.y0*T+1, (r.w||4)*T-2, (r.h||3)*T-2); } ctx.setLineDash([]); }
  const er = SIM.roomOf(s, 'hatchery') || q.room;
  if (er){ col.eggs.forEach((e, i) => { const ex = er.x0*T + 6 + (i%5)*11, ey = er.y0*T + (er.h||3)*T - 8 - Math.floor(i/5)*8; ctx.fillStyle = '#f3ead6'; ctx.beginPath(); ctx.ellipse(ex, ey, 3.5, 2.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#8fd36b'; ctx.fillRect(ex-3.5, ey+3, 7*Math.min(1, e.t/e.need), 1.5); }); }
  for (const a of s.ants){ if (a.team || a.isPlayer || !(a.state==='in' || a.state==='build')) continue; const C = CASTES[a.caste]; const x = a.nx*T, y = a.ny*T;
    ctx.fillStyle = a.caste==='venom' ? '#8a4da3' : C.fight>=3 ? '#111' : a.caste==='builder' ? '#9a7a5a' : a.caste==='nurse' ? '#c9a77a' : '#3a2e24'; ctx.beginPath(); ctx.arc(x, y, C.r, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + a.dx*C.r*1.3, y + a.dy*C.r*1.3, C.r*0.6, 0, 7); ctx.fill(); }
  const qx = (q.x+0.5)*T, qy = (q.y+0.5)*T; const qs = 1 + q.level*0.15;
  ctx.fillStyle = '#3b2a1e'; ctx.beginPath(); ctx.ellipse(qx, qy+1, 9*qs, 5.5*qs, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#5c4532'; ctx.beginPath(); ctx.ellipse(qx, qy, 8*qs, 4.5*qs, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2b1d14'; ctx.beginPath(); ctx.arc(qx-7*qs, qy-1, 3*qs, 0, 7); ctx.fill();
  if (s.phase === 'dig'){ ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.setLineDash([2,3]); for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const x = q.x+dx, y = q.y+dy; if (x<1||y<0||x>=NW-1||y>=NH||n.cells[y*NW+x]) continue; ctx.strokeRect(x*T+2, y*T+2, T-4, T-4); } ctx.setLineDash([]); }
  const a = P().ant; if (a && P().inNest){ if (P().ntx != null){ ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8; ctx.strokeRect(P().ntx*T+2, P().nty*T+2, T-4, T-4); } drawPlayerAnt(a.nx*T, a.ny*T, a.dx, a.dy, a.carry, a.kind); }
  ctx.fillStyle = 'rgba(255,240,210,0.5)'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('exit', (SHAFT+0.5)*T, -10);
}
// ---------- HUD ----------
const hudStats = $('stats'), hudMsg = $('msg'), hungerBar = $('hungerbar'), actBtn = $('act'), relBtn = $('release'), markBtn = $('mark'), recBtn = $('recruit'), enterBtn = $('enter');
const barS = $('bar'), barN = $('barn'), sheet = $('sheet'), buildNestBtn = $('buildnest'), exitBtn = $('exitnest'), queenBtn = $('queenbtn'), levelBtn = $('levelbtn'), viewBtn = $('viewbtn');
function hint(){
  const c = s.colony, a = P().ant, q = s.queen; if (P().msg) return P().msg;
  if (placing && view === 'nest'){ if (placing.kind === 'room'){ const R = ROOMS[placing.key]; return `Placing ${R.name} (${R.w}×${R.h}). Tap a green cell. Cancel to stop.`; } if (placing.kind === 'fill') return 'Fill: tap dug tunnel cells to queue them for packing. Tap again to undo. Cancel to stop.'; return 'Remove: tap a room to tear it out. Cancel to stop.'; }
  if (s.won) return 'The rival queen is dead. Keep growing, or Reset for a fresh yard.';
  if (s.phase === 'dig') return q.energy > 0 ? `You are the queen. Tap the dirt next to her to dig (${q.energy} digs left). Two down, then Build nest.` : 'Out of energy. Tap Build nest.';
  if (!a) return 'Waiting for the next hatchling.';
  if (P().inNest) return view === 'nest' ? 'Walk up the shaft and tap the top cell to go outside. Tap the queen to lay eggs, tap a + slot to build.' : 'Your ant is inside. Tap Nest view.';
  if (a.carry) return 'Carry it to the dark hole. Your trail lays itself.';
  if (s.t < 180 && c.store < 8) return 'Tap a yellow crumb to walk there, then Pick up. Hold to keep walking.';
  if (c.water < 3) return 'Water is low. Blue dew appears every two minutes; the big puddle is always out there. Eggs need water.';
  if (!c.eggQueue.length && !c.eggs.length && c.store >= 4) return 'Food in store. Tap Nest, tap the queen, lay an egg.';
  if (P().hunger < 35) return 'You are hungry. Go home, or stand by a forager carrying food.';
  if (s.ants.filter(x=>x.caste==='builder').length === 0 && c.store >= 10) return 'Lay a Builder egg. Builders dig rooms.';
  if (SIM.eggLock(s,'soldier') && c.protein < 5 && s.cat) return 'Soldiers need protein. Recruit 8 ants, walk them onto the green caterpillar, and haul the meat home.';
  if (SIM.eggLock(s,'soldier') && c.protein >= 5) return 'You have protein. Build a Barracks (needs a free slot; dig a level if full).';
  return '';
}
function updateHud(){
  const st = SIM.stats(s), c = s.colony;
  const cap = SIM.queenCap(s.queen.level), nAnts = SIM.antCount(s);
  hudStats.innerHTML = `🌾 ${Math.floor(c.store)}/${c.cap} · 💧 ${Math.floor(c.water)}/${c.waterCap} · 🥩 ${Math.floor(c.protein)} · 🪨 ${Math.floor(c.grit)}<br>🐜 ${nAnts}/${cap} (${st.out} out) · rival ${st.rival} · +${st.income.toFixed(0)} −${st.upkeep.toFixed(0)} /min · ${fps} fps${s.rain.on ? ' · rain' : ''}${s.repairs.length ? ' · '+s.repairs.length+' cave-in' : ''}`;
  const it = introText(); const istep = introStep() >= 0 ? INTRO[introStep()] : null;
  if (it){ const want = istep.btn ? `${it} <button class="next" id="intronext">${istep.btn}</button>` : it; if (hudMsg.innerHTML !== want) hudMsg.innerHTML = want; } else hudMsg.textContent = hint();
  hungerBar.style.width = Math.max(0, P().hunger) + '%'; hungerBar.style.background = P().hunger < 35 ? '#e4524a' : '#8fd36b';
  const lbl = SIM.actionLabel(s); actBtn.textContent = lbl || 'Pick up'; actBtn.disabled = !lbl;
  relBtn.textContent = st.followers ? `Release ${st.followers}` : 'Release'; relBtn.disabled = !st.followers;
  markBtn.classList.toggle('on', P().mark);
  const a = P().ant; const nearHome = a && !P().inNest && Math.hypot(a.tx - s.world.ex, a.ty - s.world.ey) < 4;
  enterBtn.classList.toggle('hidden', !nearHome);
  barS.classList.toggle('hidden', view !== 'surface'); barN.classList.toggle('hidden', view !== 'nest');
  buildNestBtn.classList.toggle('hidden', s.phase !== 'dig'); buildNestBtn.disabled = s.queen.y < 2;
  queenBtn.classList.toggle('hidden', s.phase === 'dig'); levelBtn.classList.toggle('hidden', s.phase === 'dig');
  exitBtn.classList.toggle('hidden', !(a && P().inNest));
  levelBtn.textContent = placing ? 'Cancel' : 'Build'; levelBtn.disabled = false; levelBtn.classList.toggle('on', !!placing);
  if (nAnts >= cap && s.queen.placed) showExplainer('cap'); if (s.seen.nest && !s.seen.soil && SIM.dugCount(s) > 12) showExplainer('soil');
  viewBtn.textContent = view === 'nest' ? 'Surface' : 'Nest';
  if (menu) renderSheet();
}
function renderSheet(){
  if (menu === 'help' || menu === 'info') return;
  const c = s.colony; let h = '';
  if (menu === 'egg'){
    h += `<div class="row head"><strong>Queen · next egg</strong><button class="x" data-close="1">Close</button></div><div class="note">${EXPL.queen[1]}</div><div class="btns">`;
    for (const k of Object.keys(CASTES)){ const C = CASTES[k]; const lock = SIM.eggLock(s, k); const dis = lock || !SIM.canPay(c, C.cost) || c.eggQueue.length >= 10;
      h += `<button data-egg="${k}" ${dis?'disabled':''}><b>${C.name}</b><i>${lock || (SIM.costText(C.cost)+' · '+Math.round(C.hatch*c.hatchMul)+' s')}</i></button>`; }
    h += `</div>`;
    const cap = SIM.queenCap(s.queen.level), up = SIM.QUEEN_UP[s.queen.level];
    h += `<div class="note">Queen level ${s.queen.level+1} · holds ${cap} ants (${SIM.antCount(s)} now)${SIM.antCount(s) >= cap ? ' · at the cap, eggs paused' : ''}</div>`;
    if (up) h += `<div class="btns one"><button data-up="1" ${SIM.canPay(c, up)?'':'disabled'}><b>Upgrade queen</b><i>${SIM.costText(up)} · +20 ants${s.queen.level===0?' · unlocks clay digging':''}</i></button></div>`;
    if (c.eggs.length || c.eggQueue.length){ h += `<div class="eggs">`; for (const e of c.eggs) h += `<span class="egg"><em style="width:${Math.min(100, e.t/e.need*100)}%"></em>${CASTES[e.caste].name}</span>`; for (const q of c.eggQueue) h += `<span class="egg q">${CASTES[q].name}</span>`; h += `</div><div class="note">${c.eggs.length}/${c.hatchCap} hatching · ${c.eggQueue.length} queued</div>`; }
    else h += `<div class="note">No eggs. The queen waits.</div>`;
  } else if (menu === 'catalog'){
    const builders = s.ants.filter(a=>a.caste==='builder').length;
    h += `<div class="row head"><strong>Build</strong><button class="x" data-close="1">Close</button></div>`;
    h += `<div class="note">Pick a room, then tap a green spot in the nest to place it. ${builders} builder${builders===1?'':'s'}. Dug cells: ${SIM.dugCount(s)}. Dig orders: ${s.nest.digOrders.length}, fill orders: ${s.nest.fillOrders.length}.</div><div class="btns">`;
    for (const k of ROOM_KEYS){ const R = ROOMS[k]; const have = SIM.roomOf(s, k), queued = c.buildQueue.some(j=>j.room===k); const fits = anyFit(R.w, R.h); const pay = SIM.canPay(c, R.cost);
      const status = have ? 'built' : queued ? 'being built' : !fits ? 'no '+R.w+'×'+R.h+' pocket dug yet' : !pay ? 'short on: '+SIM.costText(R.cost) : 'ready to place';
      h += `<button data-place="${k}" ${(have || queued || !fits || !pay)?'disabled':''}><b>${R.name} · ${R.w}×${R.h}</b><i>${SIM.costText(R.cost)} · ${R.desc}</i><i>${status}</i></button>`; }
    h += `</div><div class="t" style="margin-top:10px">Tools</div><div class="btns">`;
    h += `<button data-tool="fill"><b>Fill tunnel</b><i>Tap dug cells to have builders pack them back with dirt</i></button>`;
    h += `<button data-tool="remove"><b>Remove room</b><i>Tap a room to tear it out, half the cost back</i></button>`;
    h += `<button data-cleardigs="1" ${(s.nest.digOrders.length||s.nest.fillOrders.length)?'':'disabled'}><b>Clear orders</b><i>Cancel pending digs and fills</i></button>`;
    h += `</div>`;
  }
  if (sheet.innerHTML !== h) sheet.innerHTML = h;
}
function anyFit(w, h){ for (let y=1;y<NH;y++) for (let x=1;x<NW-1;x++){ if (s.nest.cells[y*NW+x] !== 1) continue; if (SIM.findRoomRect(s, x, y, w, h)) return true; } return false; }
function placeCells(w, h){ const set = new Set(); for (let y=1;y<NH;y++) for (let x=1;x<NW-1;x++){ if (s.nest.cells[y*NW+x] !== 1) continue; if (SIM.findRoomRect(s, x, y, w, h)) set.add(y*NW+x); } return set; }
function openMenu(m, cell, rect){ menu = m; menuCell = cell || null; menuRect = rect || null; sheet.classList.remove('hidden'); renderSheet(); }
function closeMenu(){ menu = null; menuCell = null; menuRect = null; sheet.classList.add('hidden'); paused = false; }
function openHelp(){ menu = 'help'; sheet.classList.remove('hidden'); sheet.innerHTML = HELP; paused = true; }
$('help').addEventListener('click', openHelp); hudStats.addEventListener('click', openHelp);
hudMsg.addEventListener('click', e => { if (e.target && e.target.id === 'intronext') introAdvance(); });
sheet.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.close){ closeMenu(); return; }
  if (b.dataset.egg){ SIM.queueEgg(s, b.dataset.egg); renderSheet(); return; }
  if (b.dataset.up){ SIM.upgradeQueen(s); renderSheet(); return; }
  if (b.dataset.walk){ P().ntx = menuCell[0]; P().nty = menuCell[1]; closeMenu(); return; }
  if (b.dataset.room){ if (SIM.queueRoom(s, b.dataset.room, menuCell)) closeMenu(); else renderSheet(); return; }
  if (b.dataset.cleardigs){ s.nest.digOrders.length = 0; s.nest.fillOrders.length = 0; renderSheet(); return; }
  if (b.dataset.place){ placing = { kind:'room', key: b.dataset.place }; closeMenu(); view = 'nest'; return; }
  if (b.dataset.tool){ placing = { kind: b.dataset.tool }; closeMenu(); view = 'nest'; return; } });

// ---------- buttons ----------
viewBtn.addEventListener('click', () => { view = view === 'nest' ? 'surface' : 'nest'; closeMenu(); });
actBtn.addEventListener('click', () => SIM.doAction(s));
relBtn.addEventListener('click', () => SIM.release(s));
markBtn.addEventListener('click', () => { P().mark = !P().mark; });
enterBtn.addEventListener('click', () => { const a = P().ant; if (!a) return; P().enterReq = true; P().tx = (s.world.ex+0.5)*T; P().ty = (s.world.ey+0.5)*T; P().holding = false; });
buildNestBtn.addEventListener('click', () => { if (SIM.buildNest(s)) { closeMenu(); } });
queenBtn.addEventListener('click', () => openMenu('egg'));
levelBtn.addEventListener('click', () => { if (placing) placing = null; else openMenu('catalog'); });
exitBtn.addEventListener('click', () => { P().ntx = SHAFT; P().nty = 0; P().exiting = true; });
let recN = 0, recTimer = null;
function recStart(e){ e.preventDefault(); if (!P().ant || P().inNest) return; recN = 1; recBtn.textContent = 'Recruit 1'; recTimer = setInterval(() => { if (recN < 20){ recN++; recBtn.textContent = 'Recruit ' + recN; } }, 140); }
function recEnd(){ if (!recTimer) return; clearInterval(recTimer); recTimer = null; const got = SIM.recruit(s, recN); recBtn.textContent = 'Recruit'; if (got < recN){ P().msg = got ? `${got} ants answered. Recruit near the nest or near other ants.` : 'No ants in range. Walk back toward the nest and try again.'; setTimeout(() => { if (/answered|in range/.test(P().msg)) P().msg = ''; }, 3000); } }
recBtn.addEventListener('pointerdown', recStart); recBtn.addEventListener('pointerup', recEnd); recBtn.addEventListener('pointercancel', recEnd); recBtn.addEventListener('pointerleave', recEnd);
$('stress').addEventListener('click', () => { SIM.stress(s, 200); P().msg = '+200 foragers spawned for a frame-rate test.'; setTimeout(() => { if (P().msg.startsWith('+200')) P().msg = ''; }, 4000); });
$('reset').addEventListener('click', () => { if (!confirm('Start over? This clears the saved colony.')) return; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} s = SIM.create(7); paintGround(); closeMenu(); view = 'nest'; });

// ---------- canvas pointer (tap, hold, pinch, drag) ----------
const ptrs = new Map(); let pinch = null, drag = null;
function nestTap(cx, cy){
  if (s.phase === 'dig'){ SIM.queenDig(s, cx, cy); return; }
  const q = s.queen; if (Math.abs(cx - q.x) <= 1 && Math.abs(cy - q.y) <= 1){ openMenu('egg'); return; }
  if (SIM.playerDig(s, cx, cy)) return;
  const a = P().ant, inside = a && P().inNest;
  if (cx<0||cy<0||cx>=NW||cy>=NH) { if (cy < 0 && inside){ P().ntx = SHAFT; P().nty = 0; P().exiting = true; } return; }
  const v = s.nest.cells[cy*NW+cx];
  if (!v && placing && placing.kind !== 'room') return;
  if (!v){ const res = SIM.toggleDigOrder(s, cx, cy); if (res !== 'added' && res !== 'removed'){ P().msg = res === 'not adjacent' ? 'Dig next to an existing tunnel (the faint dots).' : res === 'too many' ? 'Too many dig orders queued. Let the builders catch up.' : res === 'edge' ? 'Not at the edge.' : 'That soil ' + res + '.'; setTimeout(() => { if (/^(Dig next|Too many|That soil|Not at)/.test(P().msg)) P().msg = ''; }, 3000); } return; }
  if (placing){
    if (placing.kind === 'room'){ if (SIM.queueRoom(s, placing.key, [cx,cy])){ placing = null; } else { P().msg = 'No room for that here. Green cells show where it fits.'; setTimeout(() => { if (P().msg.startsWith('No room')) P().msg = ''; }, 2500); } return; }
    if (placing.kind === 'fill'){ const res = SIM.toggleFillOrder(s, cx, cy); if (res !== 'added' && res !== 'removed'){ P().msg = res === 'room' ? 'Remove the room first.' : res === 'entrance' ? 'Not the entrance.' : res === 'too many' ? 'Too many fill orders.' : ''; } return; }
    if (placing.kind === 'remove'){ const r = SIM.roomAt(s, cx, cy); if (r && r.key !== 'queen' && confirm('Remove ' + ROOMS[r.key].name + '? Half the cost comes back.')) { SIM.removeRoom(s, cx, cy); placing = null; } return; }
  }
  if (!inside){ openMenu('catalog'); return; }
  P().ntx = cx; P().nty = cy; P().exiting = (cx === SHAFT && cy === 0);
}
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  if (ptrs.size === 2){ const [p1, p2] = [...ptrs.values()]; pinch = { d0: Math.hypot(p1.x-p2.x, p1.y-p2.y), z0: zoomMul }; P().holding = false; drag = null; return; }
  if (menu){ closeMenu(); ptrs.delete(e.pointerId); return; }
  if (view === 'surface'){ const a = P().ant; if (!a || P().inNest) return; const [wx, wy] = toWorld(e.clientX, e.clientY); P().tx = wx; P().ty = wy; P().holding = true; return; }
  drag = { y0: e.clientY, pan0: panY, moved: false };
});
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
  if (pinch && ptrs.size === 2){ const [p1, p2] = [...ptrs.values()]; const d = Math.hypot(p1.x-p2.x, p1.y-p2.y); zoomMul = Math.max(0.45, Math.min(2.6, pinch.z0 * d / Math.max(1, pinch.d0))); return; }
  if (view === 'surface'){ if (P().holding){ const [wx, wy] = toWorld(e.clientX, e.clientY); P().tx = wx; P().ty = wy; } return; }
  if (drag){ const dy = e.clientY - drag.y0; if (Math.abs(dy) > 12) drag.moved = true; if (drag.moved){ const c = camNest(); panY = drag.pan0 - dy / c.z; } }
});
function ptrUp(e){
  const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); P().holding = false;
  if (pinch){ if (ptrs.size < 2) pinch = null; drag = null; return; }
  if (!p) return;
  if (view === 'nest' && drag){ const moved = drag.moved; drag = null; if (!moved && e.type === 'pointerup'){ const [nx, ny] = toNest(e.clientX, e.clientY); nestTap(Math.floor(nx/T), Math.floor(ny/T)); } }
}
canvas.addEventListener('pointerup', ptrUp); canvas.addEventListener('pointercancel', ptrUp);
$('zoom').addEventListener('click', () => { zoomMul = zoomMul >= 1.5 ? 0.6 : zoomMul >= 0.9 ? 1.6 : 1; zoomOut = false; });
// ---------- loop ----------
let last = performance.now(), acc = 0, hudT = 0, saveT = 0, wasInNest = P().inNest;
function loop(now){
  let dt = (now - last)/1000; last = now; if (dt > 0.25) dt = 0.25;
  if (!paused){ acc += dt; while (acc >= 0.05){ SIM.tick(s, 0.05); acc -= 0.05; } } else acc = 0;
  if (P().inNest !== wasInNest){ wasInNest = P().inNest; view = wasInNest ? 'nest' : 'surface'; panY = 0; }
  if (view === 'nest') drawNest(); else drawSurface();
  frames++; fpsT += dt; if (fpsT >= 1){ fps = frames; frames = 0; fpsT = 0; }
  hudT += dt; if (hudT > 0.2){ hudT = 0; checkExplainers(); updateHud(); }
  saveT += dt; if (saveT > 10){ saveT = 0; try { localStorage.setItem(SAVE_KEY, SIM.serialize(s)); } catch (e) {} }
  requestAnimationFrame(loop);
}
updateHud(); requestAnimationFrame(loop);
})();
