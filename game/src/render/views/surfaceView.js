// The yard, top-down at a PS1 three-quarter angle. Sim surface coordinates
// (x right, y down, in px) map to world X = x, Z = y on a ground plane at
// Y = 0. Scenery is built region by region around the camera (yardScenery.js);
// creatures, items and scent are redrawn from the sim every frame.
import * as THREE from 'three';
import SIM from '../../sim/sim.js';
import { CAMERA, COLORS, RENDER, ANT_SCALE, fitWide } from '../../config.js';
import { psx, psxBasic } from '../ps1/materials.js';
import { rampTexture, PALETTE, noise2 } from '../ps1/textures.js';
import { Crowd } from '../models/crowd.js';
import { antGeometry, planFor, FOOT, WALK_FRAMES } from '../models/creatures.js';
import { spiderGeometry, caterpillarSegment, SPIDER_FOOT, SPIDER_FRAMES, SPIDER_STRIDE, CAT_SEGMENTS, SPIDER_CROUCH } from '../models/bugs.js';
import { ladybugGeometry, earwigGeometry, cricketGeometry, millipedeSegment, BUG_WALK, MILLI } from '../models/critters.js';
import { PROPS } from '../models/props.js';
import { FOOD, itemLook, carryLook } from '../models/food.js';
import { MotionTracker, idlePose } from '../motion.js';
import { rankOf } from '../../sim/growth.js';
import { YardScenery, mowerMesh } from './yardScenery.js';
import { sneaker } from '../models/sneaker.js';
import { robin } from '../models/bird.js';
import { toad, fallingAcorn } from '../models/toad.js';

const { W, H, T, CASTES, DROP, HUNT } = SIM;
// The scent overlay covers a window this many tiles a side round the camera.
const SW = 96, SR = 2, TW = SW * SR; // window tiles; texels a tile
const SMOKE = noise2(41);
const TOAD = 48;
// toad model scale (px a unit): about six tiles nose to tail
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const ZAX = new THREE.Vector3(0, 0, 1);
const XAX = new THREE.Vector3(1, 0, 0);
const tmpQ3 = new THREE.Quaternion();
// Build 16: the small creatures. Model scale (px a unit), how far one walk
// cycle carries each (px), and how high its health bar floats.
const BUG = {
  ladybug: { k: 1.8, stride: 9, bar: 18, back: 5.1 },
  earwig: { k: 2.2, stride: 12, bar: 18, back: 2.7 },
  cricket: { k: 2.4, stride: 10, bar: 22, back: 5.4 },
  millipede: { k: 1.9, stride: 7, bar: 14, back: 2.6 },
};
const HIT = '#ff7a6a';   // the flash on whatever a bite lands on
// Under attack it flickers, so a long fight doesn't just turn it red.
const flashed = (s, o) => s.t - (o.hitT ?? -9) < 0.12 && (s.t * 9) % 1 < 0.5;
const SPIDER_SCALE = 2.6;
// Caterpillar: segment size and spacing (px), and the crawl wave.
const CAT = { r: 5.6, head: 5.2, gap: 7, lift: 2.6, waveLen: 12 };
const CAT_KIND = ['head', 'black', 'black', 'rust', 'rust', 'rust', 'rust', 'rust', 'black', 'black'];
const CAT_LEGS = [null, 'true', 'true', 'true', null, null, 'pro', 'pro', 'pro', 'pro'];
const wrapAngle = (a) => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));

// Fraction of the screen height to move the camera so the subject sits in
// the middle of the area between the top HUD and the bottom bar.
export function hudShift(app) {
  const ins = app.insets;
  if (!ins || !ins.h) return 0;
  return ((ins.top - ins.bottom) / 2) / ins.h;
}

function casteColor(a) {
  const C = CASTES[a.caste];
  if (a.team) return C.fight >= 3 ? COLORS.rivalSoldier : COLORS.rivalAnt;
  if (a.caste === 'venom') return COLORS.venom;
  if (C.fight >= 3) return COLORS.soldier;
  if (a.caste === 'builder') return COLORS.builder;
  if (a.caste === 'nurse') return COLORS.nurse;
  return COLORS.ourAnt;
}
// Rank shows on the ant (build 12): fresh Callows hatch pale, as real ants
// do, and darken as they learn; Veterans and better are a touch darker.
const RANK_TINT = [['#d8c6a6', 0.55], null, ['#000000', 0.18], ['#000000', 0.28], ['#000000', 0.3]];
const tintCache = new Map();
export function antColor(a) {
  const base = casteColor(a);
  if (a.team) return base;
  const r = rankOf(a), tint = RANK_TINT[r];
  if (!tint) return base;
  const key = base + r;
  let c = tintCache.get(key);
  if (!c) { c = new THREE.Color(base).lerp(new THREE.Color(tint[0]), tint[1]); tintCache.set(key, c); }
  return c;
}
// Veterans stand a little bigger; Elites and Legends wear a ring.
export const rankScale = (a) => (a.team ? 1 : [1, 1, 1.05, 1.1, 1.15][rankOf(a)]);
export const rankRing = (a) => (a.team ? null : [null, null, null, '#d9c48a', '#ffd34d'][rankOf(a)]);

const CAIRN_WORK = 30;
export class SurfaceView {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 4, 3000);
    this.sky = new THREE.Color('#9bc7e6');
    this.scene.background = this.sky.clone();
    this.scene.fog = new THREE.Fog('#b9cfd8', 420, 900);
    this.hemi = new THREE.HemisphereLight('#fff2dc', '#4a3a24', 1.25);
    this.sun = new THREE.DirectionalLight('#fff0d8', 1.6);
    this.sun.position.set(-0.4, 1, 0.35);
    this.scene.add(this.hemi, this.sun);

    this.dyn = new THREE.Group();
    this.scene.add(this.dyn);
    this.creatureMat = psx({ vertexColors: true });
    this.crowd = new Crowd(this.dyn, this.creatureMat);
    this.items = new Crowd(this.dyn, psx({ vertexColors: true }));
    this.water = new Crowd(this.dyn, psx({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, emissive: '#1c4466' }));
    this.glints = new Crowd(this.dyn, psxBasic({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    this.marks = new Crowd(this.dyn, psxBasic({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));

    // Spider: a baked walk cycle advanced by distance travelled, so feet
    // plant instead of sliding.
    this.spiderWalk = Array.from({ length: SPIDER_FRAMES }, (_, i) => spiderGeometry(i));
    this.spiderRest = spiderGeometry(-1);
    this.spiderUp = spiderGeometry(-2);
    this.spider = new THREE.Mesh(this.spiderRest, psx({ vertexColors: true }));
    this.spider.rotation.order = 'YZX'; // yaw, then pitch (nose down), then roll
    this.spiderHead = { x: 0, y: 0, yaw: 0, aim: 0, phase: 0, moved: -9, seen: false };
    // Build 16: crouched to spring or resting low, rearing to bite, dead.
    this.spiderCrouch = spiderGeometry(-4);
    this.spiderRear = spiderGeometry(-5);
    this.spiderDead = spiderGeometry(-3);
    // Caterpillar: segments follow the path the head took, with a wave of
    // lifting segments rolling forward as it crawls.
    const catMat = (this.catMat = psx({ vertexColors: true }));
    const segGeo = new Map();
    this.cat = CAT_KIND.map((kind, i) => {
      const key = kind + CAT_LEGS[i];
      if (!segGeo.has(key)) segGeo.set(key, caterpillarSegment(kind, CAT_LEGS[i]));
      return new THREE.Mesh(segGeo.get(key), catMat);
    });
    this.catPath = [];
    this.catAnim = { phase: 0, moved: -9 };
    this.lastT = 0;
    this.mower = mowerMesh();
    this.mower.visible = false;
    this.bars = [this._bar(), this._bar()];
    this.dyn.add(this.spider, this.mower, ...this.cat, ...this.bars.map((b) => b.group));

    // Build 16: ladybugs, earwigs, crickets and millipedes, each a few baked
    // poses drawn instanced; bars for the hurt ones; sparks and splashes.
    this.bugs = new Crowd(this.dyn, psx({ vertexColors: true }));
    const walk = (fn) => Array.from({ length: BUG_WALK }, (_, i) => fn(i));
    this.bugGeo = {
      lb: walk((i) => ladybugGeometry(i)), lbStill: ladybugGeometry(-1), lbFly: [ladybugGeometry(-1, 1), ladybugGeometry(-1, 2)],
      ew: walk((i) => earwigGeometry(i, 0)), ewUp: walk((i) => earwigGeometry(i, 0.85)), ewStill: earwigGeometry(-1, 0), ewSnap: earwigGeometry(-1, 1, true),
      cr: Object.fromEntries(['sit', 'walk0', 'walk1', 'crouch', 'leap', 'chirp'].map((p) => [p, cricketGeometry(p)])),
      mpHead: millipedeSegment('head', 0), mp: walk((i) => millipedeSegment('body', i)), mpTail: walk((i) => millipedeSegment('tail', i)),
    };
    this.bugAnim = new Map();
    this.bugBars = Array.from({ length: 6 }, () => this._bar());
    this.dyn.add(...this.bugBars.map((b) => b.group));
    this.fx = new Crowd(this.dyn, psxBasic({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    this.drops = [];

    // Visitors (sim strikes): a sneaker, a falling acorn, a cloud of bug
    // spray, a robin, a toad, and the shadow each casts first. Pooled;
    // hidden when idle.
    this.shoes = [0, 1].map(() => { const g = sneaker(); g.scale.setScalar(0.5); g.visible = false; this.dyn.add(g); return g; });
    this.robins = [0, 1, 2].map(() => { const b = robin(); b.group.scale.setScalar(80); b.group.visible = false; this.dyn.add(b.group); return b; });
    this.toads = [0, 1].map(() => { const b = toad(); b.group.scale.setScalar(TOAD); b.group.visible = false; this.dyn.add(b.group); return b; });
    this.acorns = [0, 1].map(() => { const g = fallingAcorn(); g.scale.setScalar(2.6 * T); g.visible = false; this.dyn.add(g); return g; });
    const puffMat = psxBasic({ color: '#e8eef0', transparent: true, opacity: 0.4, depthWrite: false });
    this.sprays = [0, 1].map(() => {
      const g = new THREE.Group();
      for (let k = 0; k < 9; k++) { const a = k * 2.4, d = k ? 0.3 + (k % 3) * 0.22 : 0; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + (k % 2) * 0.12, 1), puffMat.clone()); m.position.set(Math.cos(a) * d, 0.3 + (k % 4) * 0.12, Math.sin(a) * d); m.renderOrder = 4; g.add(m); }
      g.visible = false; this.dyn.add(g); return g;
    });
    this.shadows = [0, 1, 2, 3, 4].map(() => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), psxBasic({ color: '#0a0806', transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
      m.renderOrder = 2; m.visible = false; this.dyn.add(m); return m;
    });
    this.shake = 0;

    // Rain: a box of falling streaks that follows the camera target.
    const n = 420, pos = new Float32Array(n * 6);
    this.rainSeeds = new Float32Array(n * 3).map(() => Math.random());
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#c8d8ff', transparent: true, opacity: 0.55 }));
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);

    this.motion = new MotionTracker();
    this.target = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.static = null;
    this.state = null;
  }

  _bar() {
    const group = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.55, depthTest: false }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#e4524a', depthTest: false }));
    bg.renderOrder = 10;
    fg.renderOrder = 11;
    group.add(bg, fg);
    return { group, bg, fg };
  }

  // Build everything that only depends on the world layout.
  // One cairn per outpost; stones appear as the work goes on.
  _cairns(s, t) {
    const live = new Set();
    for (const o of s.outposts || []) {
      live.add(o.id);
      let c = this.cairns.get(o.id);
      if (!c) {
        c = new THREE.Group(); c.parts = this.cairnParts.map((p) => { const m = new THREE.Mesh(p.geo, p.mat); c.add(m); return m; });
        c.position.set((o.x + 0.5) * T, 0, (o.y + 0.5) * T); c.rotation.y = (o.id * 2.4) % 6.28;
        this.cairnGroup.add(c); this.cairns.set(o.id, c);
      }
      const k = o.done ? 1 : o.work / CAIRN_WORK;
      c.parts.forEach((m, i) => { m.visible = i < 4 ? k >= i / 4 : o.done; });
      c.parts[5].rotation.y = Math.sin(t * 2 + o.id) * 0.35;
      c.scale.setScalar(1.3);
    }
    for (const [id, c] of this.cairns) if (!live.has(id)) { this.cairnGroup.remove(c); this.cairns.delete(id); }
  }

  setState(s) {
    this.state = s;
    this.camInit = false;
    if (this.static) {
      this.scenery.dispose();
      this.scene.remove(this.static);
      this.static.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    const g = new THREE.Group();
    this.static = g;
    this.scene.add(g);
    const w = s.world;

    // The yard: ground, landmarks, walls, rocks and grass (yardScenery.js),
    // built as the camera comes near each region.
    this.scenery = new YardScenery(w);
    this.scenery.onLoaded = (i) => { if (this.onRegionLoaded) this.onRegionLoaded(i); };
    g.add(this.scenery.group);

    // Nest mounds: a ring of dug-out soil around a dark hole.
    this.holes = [];
    const moundTex = rampTexture(31, PALETTE.dirt, { size: 16, repeat: [3, 1] });
    for (const [hx, hy, rival] of [[w.ex, w.ey, false], [w.rx, w.ry, true]]) {
      // Open-topped ring of spoil, so an ant standing in the hole stays visible.
      const mound = new THREE.Mesh(new THREE.CylinderGeometry(11, 20, 4, 9, 1, true), psx({ map: moundTex, side: THREE.DoubleSide }));
      mound.position.set((hx + 0.5) * T, 2, (hy + 0.5) * T);
      // The hole sits above the scent overlay and always draws after it, so
      // trail colour never shows inside it and the two never z-fight.
      const hole = new THREE.Mesh(new THREE.CircleGeometry(11.6, 9).rotateX(-Math.PI / 2), psxBasic({ color: '#120a05', polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
      hole.position.set((hx + 0.5) * T, 1.2, (hy + 0.5) * T);
      hole.renderOrder = 3;
      mound.renderOrder = 3;
      const ring = new THREE.Mesh(new THREE.RingGeometry(18, 22, 12).rotateX(-Math.PI / 2), psxBasic({ color: '#8a2a1e', transparent: true, opacity: 0.8 }));
      ring.position.set((hx + 0.5) * T, 0.6, (hy + 0.5) * T);
      ring.visible = rival;
      g.add(mound, hole, ring);
      this.holes.push({ ring, rival, mound, hole });
    }

    // The spoil heap: dug dirt that builders carry out of the nest, a low
    // mound of loose soil that grows with every load.
    const heapGeo = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    const hp = heapGeo.attributes.position;
    for (let i = 0; i < hp.count; i++) { const y = hp.getY(i), k = 1 + Math.sin(hp.getX(i) * 7 + hp.getZ(i) * 5) * 0.06 * (1 - y); hp.setXYZ(i, hp.getX(i) * k, y, hp.getZ(i) * k); }
    heapGeo.computeVertexNormals();
    this.heap = new THREE.Mesh(heapGeo, psx({ map: rampTexture(33, PALETTE.dirt, { size: 16, repeat: [2, 1] }) }));
    this.heap.position.set((s.spoilAt.x + 0.5) * T, 0, (s.spoilAt.y + 0.5) * T);
    this.heap.visible = false;
    g.add(this.heap);
    // Outposts (build 13): a cairn of pebbles with a twig and a leaf for a
    // flag. It rises stone by stone while your ants build it.
    this.cairnGroup = new THREE.Group(); g.add(this.cairnGroup); this.cairns = new Map();
    // Your crew's reach (build 15): gold while you hold Recruit (how far the
    // call carries), faint blue while you lead a crew (how far they follow).
    const thin = new THREE.RingGeometry(0.97, 1, 72).rotateX(-Math.PI / 2);
    this.callRing = new THREE.Mesh(thin, psxBasic({ color: '#ffd34d', transparent: true, opacity: 0.55, depthWrite: false }));
    this.leashRing = new THREE.Mesh(thin, psxBasic({ color: '#9cc8ff', transparent: true, opacity: 0.3, depthWrite: false }));
    this.callRing.visible = this.leashRing.visible = false; g.add(this.callRing, this.leashRing);
    const stone = psx({ map: rampTexture(21, PALETTE.rock, { size: 16, repeat: [0.5, 0.5] }) });
    this.cairnParts = [[0, 4.2, 0, 9, 4.6, 8], [1.2, 10.4, 0.8, 6.6, 3.8, 6], [-0.6, 15.4, 0.2, 4.6, 3, 4.4], [0.4, 19.2, -0.4, 3, 2.2, 3]].map(([x, y, z, sx, sy, sz], i) => {
      const geo = new THREE.IcosahedronGeometry(1, 1); geo.scale(sx, sy, sz); geo.rotateY(i * 1.3); geo.translate(x, y, z); return { geo, mat: stone };
    });
    const twig = new THREE.CylinderGeometry(0.5, 0.6, 18, 5).translate(0, 29, 0);
    const leaf = new THREE.PlaneGeometry(8, 5).translate(4.2, 34, 0);
    this.cairnParts.push({ geo: twig, mat: psx({ color: '#6e4c2e' }), flag: true }, { geo: leaf, mat: psx({ color: '#d8a02a', side: THREE.DoubleSide }), flag: true });

        // Scent overlay: a lingering, drifting haze over the trails, for a
    // window of tiles round the camera, rewritten from the sim each frame
    // and moved with it (two texels a tile, smoothly filtered).
    this.scentData = new Uint8Array(TW * TW * 4);
    this.scentGrid = new Float32Array((SW + 1) * (SW + 1) * 2);
    this.scentRaw = new Float32Array((SW + 1) * (SW + 1) * 2);
    this.scentTex = new THREE.DataTexture(this.scentData, TW, TW, THREE.RGBAFormat);
    this.scentTex.magFilter = this.scentTex.minFilter = THREE.LinearFilter;
    this.scentTex.flipY = false;
    const geo = new THREE.PlaneGeometry(SW * T, SW * T, 32, 32).rotateX(-Math.PI / 2).translate((SW * T) / 2, 0.4, (SW * T) / 2);
    // PlaneGeometry's v runs bottom-up; the sim's rows run top-down.
    geo.attributes.uv.array.forEach((v, i, arr) => { if (i % 2) arr[i] = 1 - v; });
    this.scent = new THREE.Mesh(geo, psxBasic({ map: this.scentTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }, { affine: false }));
    this.scent.renderOrder = 1;
    this.scent.frustumCulled = false;
    g.add(this.scent);
  }

  // Only the tiles around the camera are rewritten each frame.
  // Trails as smoke: each tile's scent is blended smoothly between tiles,
  // then broken up by slowly drifting noise so it wisps instead of tiling.
  // Only texels near some scent are worked out.
  _updateScent(s, time) {
    const d = this.scentData, G = this.scentGrid, Rw = this.scentRaw, tr = s.trail, al = s.alarm, N = SW + 1;
    const x0 = Math.floor(this.target.x / T) - SW / 2, y0 = Math.floor(this.target.z / T) - SW / 2;
    this.scent.position.set(x0 * T, 0, y0 * T);
    d.fill(0);
    let any = false;
    for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
      const x = x0 + k, y = y0 + j, o = (j * N + k) * 2;
      const i = x >= 0 && y >= 0 && x < W && y < H ? y * W + x : -1;
      Rw[o] = i < 0 ? 0 : tr[i] > 0.04 ? Math.min(1, tr[i] * 0.45) : 0;
      Rw[o + 1] = i < 0 ? 0 : al[i] > 0.08 ? Math.min(1, al[i] * 0.3) : 0;
      if (Rw[o] || Rw[o + 1]) any = true;
    }
    // A soft blur, so the haze has round edges instead of tile steps.
    if (any) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) for (let c = 0; c < 2; c++) {
      let sum = 0, wsum = 0;
      for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) {
        const jj = j + dj, kk = k + dk; if (jj < 0 || kk < 0 || jj >= N || kk >= N) continue;
        const wt = dj || dk ? (dj && dk ? 0.5 : 1) : 2; sum += Rw[(jj * N + kk) * 2 + c] * wt; wsum += wt;
      }
      G[(j * N + k) * 2 + c] = sum / wsum;
    }
    if (any) {
      if (!this.tc) { this.tc = new THREE.Color(COLORS.trail).lerp(new THREE.Color('#ffffff'), 0.4); this.ac = new THREE.Color(COLORS.alarm); }
      const tc = this.tc, ac = this.ac, drift = time * 0.35;
      for (let ty = 0; ty < TW; ty++) {
        const fy = Math.max(0, Math.min(SW - 1.001, (ty + 0.5) / SR - 0.5)), j = Math.floor(fy), v = fy - j;
        for (let tx = 0; tx < TW; tx++) {
          const fx = Math.max(0, Math.min(SW - 1.001, (tx + 0.5) / SR - 0.5)), k = Math.floor(fx), u = fx - k;
          const o00 = (j * N + k) * 2, o01 = o00 + 2, o10 = o00 + N * 2, o11 = o10 + 2;
          if (G[o00] + G[o01] + G[o10] + G[o11] + G[o00 + 1] + G[o01 + 1] + G[o10 + 1] + G[o11 + 1] < 0.004) continue;
          const lerp2 = (c) => (G[o00 + c] * (1 - u) + G[o01 + c] * u) * (1 - v) + (G[o10 + c] * (1 - u) + G[o11 + c] * u) * v;
          const ts = lerp2(0), as = lerp2(1);
          const wx = x0 + fx, wy = y0 + fy;
          const wisp = Math.max(0, Math.min(1, 0.5 + 0.9 * (SMOKE(wx * 0.55 + drift, wy * 0.55 - drift * 0.6) * 0.65 + SMOKE(wx * 1.4 - drift * 1.3, wy * 1.4 + drift) * 0.35)));
          let aa = Math.pow(ts, 0.8) * (0.25 + 0.75 * wisp * wisp) * 0.7, rr = tc.r, gg = tc.g, bb = tc.b;
          if (as > 0.01) { const m = Math.min(1, as * (0.4 + 0.6 * wisp)); rr = rr * (1 - m) + ac.r * m; gg = gg * (1 - m) + ac.g * m; bb = bb * (1 - m) + ac.b * m; aa = Math.max(aa, m * 0.6); }
          const o = (ty * TW + tx) * 4;
          d[o] = rr * 255; d[o + 1] = gg * 255; d[o + 2] = bb * 255; d[o + 3] = Math.min(0.55, aa) * 255;
        }
      }
    }
    this.scentTex.needsUpdate = true;
  }

  _placeBar(bar, x, y, h, frac, color) {
    bar.group.visible = true;
    bar.group.position.set(x, h, y);
    bar.group.quaternion.copy(this.camera.quaternion);
    bar.bg.scale.set(26, 3, 1);
    bar.fg.scale.set(26 * Math.max(0, frac), 3, 1);
    bar.fg.position.x = -13 * (1 - Math.max(0, frac));
    bar.fg.material.color.set(color);
  }

  // app: { s, zoomMul }, t: seconds of real time (for animation), aspect.
  update(app, t, aspect) {
    const s = app.s;
    if (s !== this.state || s.world !== this.world) { this.world = s.world; this.setState(s); }
    const P = s.player, w = s.world;
    const frameT = Math.floor(t * RENDER.animFps);

    this._updateScent(s, t);
    // The spoil heap grows with the loads dumped on it.
    const pile = s.spoilPile || 0;
    this.heap.visible = pile > 0;
    if (pile > 0) { const r = Math.min(5.5, 0.9 + Math.sqrt(pile) * 0.32) * T; this.heap.scale.set(r, Math.min(r * 0.42, 6 + Math.sqrt(pile) * 2.2), r); }
    this._cairns(s, t);
    this.holes[1].ring.visible = s.rival.queenAlive;
    // Our entrance only exists once the queen has dug in and founded the nest.
    this.holes[0].mound.visible = this.holes[0].hole.visible = s.queen.placed;

    // Ants, the things they carry, and items on the ground.
    this.crowd.begin();
    this.marks.begin();
    const ant = (a, color, scaleMul) => {
      const C = CASTES[a.caste];
      const k = (C.r / 2.2) * (scaleMul || 1) * ANT_SCALE.surface;
      const moving = this.motion.moving(a.id, a.x, a.y, t);
      const idle = moving ? null : idlePose(a, t);
      const frame = idle ? idle.frame : (frameT + a.id) % WALK_FRAMES;
      const b = idle ? idle.breathe : 0;
      const plan = planFor(a.caste);
      tmpQ.setFromAxisAngle(UP, Math.atan2(-a.dy, a.dx));
      tmpV.set(a.x, FOOT * k, a.y);
      // Bitten: a red flash. Knocked by a raindrop: it tumbles (build 16).
      if (flashed(s, a)) color = HIT;
      if (a.knockT > 0) { const u = 1 - a.knockT / 0.3; tmpQ.multiply(tmpQ3.setFromAxisAngle(XAX, u * Math.PI * 2)); tmpV.y += Math.sin(u * Math.PI) * 6; }
      // Still ants stand and breathe instead of walking on the spot.
      this.crowd.pushAtScale(plan + frame, antGeometry(plan, frame), tmpV, tmpQ, k * (1 + 0.012 * b), k * (1 + 0.04 * b), k * (1 + 0.025 * b), color);
      if (a.carry) {
        const c = carryLook(a.kind, a.itype, COLORS);
        tmpV.set(a.x + a.dx * 6.4 * k, FOOT * k * 0.7, a.y + a.dy * 6.4 * k);
        (c.water ? this.water : this.items).pushAt(c.key, c.geo, tmpV, tmpQ, 1.6 * k * c.r, c.color);
      }
      if (a.follow) {
        tmpV.set(a.x, 0.6, a.y);
        this.marks.pushAt('ring', PROPS.ring, tmpV, tmpQ.identity(), 6 * k, COLORS.player);
      }
    };
    this.items.begin();
    this.water.begin();
    this.glints.begin();
    for (const f of s.items) {
      if (f.amt <= 0) continue;
      if (f.kind === 'protein' && BUG[f.type]) continue; // a dead bug lies where it fell (_critters)
      const L = itemLook(f, COLORS);
      // A treat being carried rides on its crew, just ahead of you.
      const lifted = f.carried && f.px != null;
      const cx = lifted ? f.px : (f.x + 0.5) * T, cz = lifted ? f.py : (f.y + 0.5) * T, spin = (f.x * 7 + f.y * 13) % 6;
      // (Build 14: the coloured rings under items are gone; Mark didn't like them.)
      if (L.dew) { this._dew(f, L, cx, cz, spin, t); continue; }
      tmpV.set(cx, L.water ? 0.3 : (L.lift || 0) * L.r + 0.15 + (lifted ? 5 + Math.abs(Math.sin(t * 9)) : 0), cz);
      tmpQ.setFromAxisAngle(UP, spin);
      (L.water ? this.water : this.items).pushAt(L.key, L.geo, tmpV, tmpQ, L.r, L.color);
      // Puddles ripple now and then and catch the light (build 14).
      if (f.type === 'puddle') for (let k = 0; k < 2; k++) {
        const ph = ((t * 0.35 + k * 0.5 + (f.x * 0.37 + f.y * 0.21)) % 1);
        tmpV.set(cx + Math.sin(f.x + k * 3) * L.r * 0.3, 0.5, cz + Math.cos(f.y + k * 2) * L.r * 0.25);
        this.water.pushAt('ripple', PROPS.ring, tmpV, tmpQ2.identity(), L.r * (0.12 + ph * 0.5), ph < 0.8 ? '#e8f8ff' : '#8ac8f0');
      }
      // Treats glint so they read as something special from across the yard.
      if (L.treat) {
        const tw = Math.max(0, Math.sin(t * 2.4 + f.x));
        if (tw > 0.2) {
          tmpV.set(cx - L.r * 0.4, L.r * 1.6 + 2, cz - L.r * 0.2);
          tmpQ2.copy(this.camera.quaternion).multiply(tmpQ.setFromAxisAngle(ZAX, t * 0.8));
          this.glints.pushAt('star', FOOD.star, tmpV, tmpQ2, 9 * tw, '#ffffff');
        }
      }
    }
    for (const a of s.ants) {
      if (a.isPlayer || a.state === 'in' || a.state === 'build' || a.state === 'nest' || a.state === 'dead') continue;
      ant(a, antColor(a), rankScale(a));
      const ring = rankRing(a);
      if (ring) { tmpV.set(a.x, 0.55, a.y); this.marks.pushAt('rank', PROPS.ring, tmpV, tmpQ.identity(), 6.5, ring); }
    }
    const pa = P.ant;
    const out = pa && !P.inNest, crew = out && s.ants.some((o) => o.follow);
    this.callRing.visible = !!(out && app.recruiting); this.leashRing.visible = !!crew;
    if (this.callRing.visible) { const r = (SIM.picked(s, 'you', 'rally') ? 10 : 7) * T; this.callRing.position.set(pa.x, 0.7, pa.y); this.callRing.scale.setScalar(r * (1 + 0.03 * Math.sin(t * 6))); }
    if (crew) { this.leashRing.position.set(pa.x, 0.65, pa.y); this.leashRing.scale.setScalar(16 * T); }
    if (pa && !P.inNest) {
      ant(pa, COLORS.player, 1.25);
      tmpV.set(pa.x, 0.5, pa.y);
      this.marks.pushAt('you', PROPS.ring, tmpV, tmpQ.identity(), 13, COLORS.player);
      if (P.tx != null) {
        tmpV.set(P.tx, 0.7, P.ty);
        this.marks.pushAt('target', PROPS.ring, tmpV, tmpQ.identity(), 5, '#ffffff');
      }
    }
    this.crowd.end();
    this.items.end();
    this.water.end();
    this.glints.end();
    this.marks.end();
    this.motion.sweep();

    // The mower sweeps the Lawn.
    const mw = s.mower;
    this.mower.visible = !!mw && mw.state === 'cut';
    if (this.mower.visible) this.mower.position.set((w.lawn.x0 + w.lawn.w / 2) * T, Math.abs(Math.sin(t * 30)) * 1.5, mw.y * T);
    const fdt = Math.min(0.1, Math.max(0, t - this.lastT));
    this.lastT = t;
    this._spider(s, t, fdt);
    this._caterpillar(s, t, fdt);
    this._critters(s, t, fdt);
    this._fx(s, t, fdt);
    this._strikes(s, t, fdt);

    // Weather and light.
    const raining = s.rain.on;
    this.rain.visible = raining;
    this.hemi.intensity = raining ? 0.75 : 1.25;
    this.sun.intensity = raining ? 0.35 : 1.6;
    this.scene.background.set(raining ? '#6f7f8f' : '#9bc7e6');
    this.scene.fog.color.set(raining ? '#6f7f8f' : '#b9cfd8');

    // Camera: follow the player, or the nest entrance.
    const a = pa && !P.inNest ? pa : null;
    // app.surfaceFocus (px) overrides, for screenshots and tours.
    const sf = app.surfaceFocus;
    const fx = sf ? sf.x : a ? a.x : (w.ex + 0.5) * T, fy = sf ? sf.y : a ? a.y : (w.ey + 0.5) * T;
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const across = (CAMERA.surfaceTilesAcross * T * fitWide(aspect)) / app.zoomMul;
    const dist = across / 2 / Math.tan(hfov / 2);
    // Keep the player centred in the space the HUD leaves free.
    const viewH = (across / aspect) / Math.sin(CAMERA.surfacePitch);
    const shift = hudShift(app) * viewH;
    const jump = !this.camInit;
    this.target.lerp(tmpV.set(fx, 0, fy - shift), this.camInit ? 0.18 : 1);
    this.camInit = true;
    const pitch = CAMERA.surfacePitch;
    this.camera.aspect = aspect;
    this.camera.position.set(this.target.x, Math.sin(pitch) * dist, this.target.z + Math.cos(pitch) * dist);
    this.camera.lookAt(this.target);
    // A stomp nearby shakes the view.
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - fdt); const k = this.shake * 14; this.camera.position.x += (Math.random() - 0.5) * k; this.camera.position.y += (Math.random() - 0.5) * k; }
    this.camera.far = dist * 3 + 400;
    this.camera.updateProjectionMatrix();
    this.scene.fog.near = dist * 1.1;
    this.scene.fog.far = dist * 2.4 + 200;

    if (raining) this._updateRain(t);
    // Build the regions coming into reach (all of what's on screen at once
    // after a jump), and drop those left far behind.
    // app.sceneryFocus ({ x, y, view, now }) builds round another spot (the film's).
    this.camera.updateMatrixWorld();
    const lf = app.sceneryFocus, view = lf ? lf.view : this._viewReach(dist), lx = lf ? lf.x : this.target.x, lz = lf ? lf.y : this.target.z;
    if (jump || (lf && lf.now)) { this.scenery.loadNow(lx, lz, view); if (lf) lf.now = false; }
    this.scenery.update(lx, lz, view);
  }

  // Visitors: each shows itself first (a shadow, a hiss, a landing).
  _strikes(s, t, fdt) {
    const n = { foot: 0, acorn: 0, spray: 0, bird: 0, toad: 0 }, pool = { foot: this.shoes, acorn: this.acorns, spray: this.sprays, bird: this.robins, toad: this.toads };
    let shadow = 0;
    const shade = (x, z, yaw, sx, sz, op) => { const sh = this.shadows[shadow++]; if (!sh) return; sh.visible = true; sh.position.set(x, 0.5, z); sh.rotation.set(0, -yaw, 0); sh.scale.set(sx, 1, sz); sh.material.opacity = op; };
    for (const st of s.strikes || []) {
      const P = pool[st.kind];
      if (!P || n[st.kind] >= P.length) continue;
      const it = P[n[st.kind]++], x = st.x * T, z = st.y * T;
      const D = DROP[st.kind], B = HUNT[st.kind];
      if (st.kind === 'foot') {
        const k = Math.min(1, st.t / D.warn);
        let y;
        if (st.phase === 'warn') y = 1700 - 900 * k * k;
        else if (st.phase === 'hold') y = Math.max(0, 800 * (1 - (st.t - D.warn) / 0.12));
        else y = 1700 * Math.min(1, (st.t - D.warn - D.hold) / D.lift) ** 2;
        it.visible = true; it.position.set(x, y, z); it.rotation.set(0, -st.yaw, 0);
        if (st.phase === 'hold' && !st.shook) { st.shook = true; if (Math.hypot(x - this.target.x, z - this.target.z) < 30 * T) this.shake = 0.35; }
        const near = 1 - Math.min(1, y / 1700);
        shade(x, z, st.yaw, D.a * T * (0.7 + 0.35 * near), D.b * T * (0.7 + 0.35 * near), 0.12 + 0.45 * near);
      } else if (st.kind === 'acorn') {
        // Falls from out of sight, spinning, and lands where the shadow was
        // (the sim then leaves an acorn there to eat).
        const k = Math.min(1, st.t / D.warn), y = st.phase === 'warn' ? 1400 * (1 - k * k) : 0;
        it.visible = st.phase === 'warn';
        it.position.set(x, y, z); it.rotation.set(0.4 * Math.sin(st.t * 9), st.t * 7, 0);
        if (st.phase === 'hold' && !st.shook) { st.shook = true; if (Math.hypot(x - this.target.x, z - this.target.z) < 20 * T) this.shake = 0.2; }
        if (st.phase === 'warn') shade(x, z, 0, D.a * T * (0.5 + 0.5 * k), D.b * T * (0.5 + 0.5 * k), 0.1 + 0.4 * k);
      } else if (st.kind === 'spray') {
        // A cloud: a faint hiss of mist first, then thick, then it drifts off.
        const k = st.phase === 'warn' ? Math.min(1, st.t / D.warn) : 1, fade = st.phase === 'lift' ? 1 - (st.t - D.warn - D.hold) / D.lift : 1;
        const op = (st.phase === 'warn' ? 0.08 + 0.12 * k : 0.55) * Math.max(0, fade);
        it.visible = true; it.position.set(x, 0, z);
        it.scale.setScalar(D.a * T * (st.phase === 'warn' ? 0.5 + 0.4 * k : 1 + 0.15 * Math.sin(t * 3)));
        it.children.forEach((m, i) => { m.material.opacity = op * (0.7 + 0.3 * Math.sin(t * 2 + i)); m.position.y = 0.3 + (i % 4) * 0.12 + 0.04 * Math.sin(t * 1.7 + i); });
      } else if (B) {
        // A robin flies down and up again; a toad hops in and out.
        const fly = st.kind === 'bird', top = fly ? 700 : 260;
        let y = 0, flap = false;
        if (st.phase === 'land') { const k = Math.min(1, st.t / B.land); y = (1 - k) ** 2 * top; flap = k < 0.95; }
        else if (st.phase === 'leave') { const k = Math.max(0, (st.t - st.leaveAt) / B.leave); y = k * k * (fly ? 900 : 300); flap = k > 0; }
        else if (st.hopAt != null && st.t - st.hopAt < 0.3) y = Math.sin(Math.PI * (st.t - st.hopAt) / 0.3) * (fly ? 18 : 40);
        const peck = st.peckAt != null && st.t - st.peckAt < 0.35 ? Math.sin(Math.PI * (st.t - st.peckAt) / 0.35) : 0;
        it.group.visible = true; it.group.position.set(x, y, z); it.group.rotation.set(0, -st.yaw, 0);
        if (fly) {
          it.body.rotation.z = -0.75 * peck;
          it.head.rotation.z = -0.4 * peck;
          for (const w of it.wings) w.pivot.rotation.x = flap ? w.s * (0.2 + Math.sin(t * 28) * 0.9) : w.s * 0.05;
        } else {
          // The tongue shoots out to the ant it was after, and back.
          it.tongue.visible = peck > 0;
          if (peck > 0) it.tongue.scale.set(Math.max(0.4, ((st.peckD || 1) * T) / TOAD - 1.05) * peck, 1, 1);
          it.body.scale.set(1, 1 + 0.06 * Math.sin(t * 5), 1); // throat pulsing
        }
        const near = 1 - Math.min(1, y / top);
        shade(x + Math.cos(st.yaw) * (fly ? 20 : 10), z + Math.sin(st.yaw) * (fly ? 20 : 10), st.yaw, (fly ? 56 : 80) * (0.6 + 0.4 * near), (fly ? 40 : 60) * (0.6 + 0.4 * near), 0.15 + 0.3 * near);
      }
    }
    for (const k in pool) for (let i = n[k]; i < pool[k].length; i++) { const it = pool[k][i]; (it.group || it).visible = false; }
    for (let i = shadow; i < this.shadows.length; i++) this.shadows[i].visible = false;
  }

  // Dew: beads on and around a grass blade, each with an unlit shine.
  _dew(f, L, cx, cz, spin, t) {
    tmpQ.setFromAxisAngle(UP, spin);
    tmpV.set(cx, 0, cz);
    this.items.pushAt('blade', FOOD.blade, tmpV, tmpQ, 2.4, '#ffffff');
    // One bead hangs near the blade's tip, the rest sit in the grass.
    const spots = [[0, 6.4, 3.0, 0.8], [-3.4, 0, 1.2, 1], [2.8, 0, -1.8, 0.85], [-0.8, 0, -3.6, 0.7]];
    const cs = Math.cos(spin), sn = Math.sin(spin);
    for (let i = 0; i < L.beads; i++) {
      const [ox, oy, oz, k] = spots[i];
      const r = L.r * k * (1 + 0.03 * Math.sin(t * 2 + i + f.x));
      const x = cx + ox * cs + oz * sn, z = cz - ox * sn + oz * cs;
      tmpV.set(x, oy, z);
      this.water.pushAt('bead', FOOD.bead, tmpV, tmpQ, r, '#ffffff');
      tmpV.set(x - r * 0.35, oy + r * 1.35, z + r * 0.3);
      this.glints.pushAt('shine', FOOD.shine, tmpV, tmpQ, r * 0.26, '#ffffff');
    }
  }

  // Spider: turns smoothly, walks a gait synced to distance, rests and
  // breathes when still, and now and then lifts a foreleg to taste the air.
  // Build 16: it crouches before it springs, rears to bite, hunches over a
  // kill to eat, sleeps low at its web when full, and dies on its back.
  _spider(s, t, fdt) {
    const sp = s.spider, h = this.spiderHead, m = this.spider, S = SPIDER_SCALE;
    this.bars[0].group.visible = false;
    m.material.color.set(sp && flashed(s, sp) ? HIT : '#ffffff');
    if (!sp) {
      h.seen = false;
      const dead = s.spiderCorpse;
      m.visible = !!dead;
      if (!dead) return;
      // Over on its back with a little hop, legs curled; then it sinks away.
      const age = s.t - dead.t, u = Math.min(1, age / 0.55), gone = Math.max(0, (age - 4) / 2);
      m.geometry = this.spiderDead;
      m.position.set(dead.x, (SPIDER_FOOT + (8.6 - SPIDER_FOOT) * u) * S + Math.sin(Math.PI * u) * 14 - gone * 26, dead.y);
      m.rotation.set(Math.PI * u, h.yaw, 0);
      m.scale.setScalar(S * (1 - gone * 0.3));
      return;
    }
    m.visible = true;
    const dx = sp.x - h.x, dy = sp.y - h.y, d = Math.hypot(dx, dy);
    if (!h.seen || d > 60) { h.seen = true; h.yaw = h.aim; }
    else if (d > 0.05) { h.aim = Math.atan2(-dy, dx); h.phase += d / (SPIDER_STRIDE * S); h.moved = t; }
    h.x = sp.x; h.y = sp.y;
    const mode = sp.mode || 'walk';
    // Crouched or eating it faces its prey.
    if ((mode === 'crouch' || mode === 'eat') && (sp.dx || sp.dy)) h.aim = Math.atan2(-sp.dy, sp.dx);
    h.yaw += wrapAngle(h.aim - h.yaw) * Math.min(1, fdt * (mode === 'crouch' ? 14 : 7));
    const walking = t - h.moved < 0.2;
    const frame = Math.floor(h.phase * SPIDER_FRAMES) % SPIDER_FRAMES;
    let geo = this.spiderRest, y = SPIDER_FOOT, pitch = 0, breathe = Math.sin(t * 1.9), shiver = 0;
    const bit = s.t - (sp.biteAt ?? -9);
    if (bit < 0.35) { geo = this.spiderRear; pitch = 0.22 * Math.sin((bit / 0.35) * Math.PI); }
    else if (walking) { geo = this.spiderWalk[frame]; y += Math.abs(Math.sin(h.phase * Math.PI * 2)) * 0.5; breathe = 0; if (mode === 'lunge') pitch = 0.1; }
    else if (mode === 'crouch') { geo = this.spiderCrouch; y -= SPIDER_CROUCH; shiver = Math.sin(t * 60) * 0.25; breathe = 0; }
    else if (mode === 'eat') { geo = this.spiderRest; pitch = -0.2 + Math.sin(t * 7) * 0.05; y -= 0.6; breathe = 0; }
    else if (mode === 'rest') { geo = this.spiderCrouch; y -= SPIDER_CROUCH; breathe = Math.sin(t * (sp.full > 0 ? 0.9 : 1.4)) * 1.6; }
    else geo = (s.t % 4) < 0.5 ? this.spiderUp : this.spiderRest;
    m.geometry = geo;
    m.position.set(sp.x + shiver, y * S, sp.y);
    m.scale.set(S, S * (1 + 0.03 * breathe), S * (1 + 0.02 * breathe));
    m.rotation.set(0, h.yaw, pitch);
    this._placeBar(this.bars[0], sp.x, sp.y, 62, sp.hp / sp.maxHp, '#e4524a');
  }

  // Caterpillar: the head is the sim position; the body follows its trail.
  _caterpillar(s, t, fdt) {
    const ct = s.cat, path = this.catPath, A = this.catAnim;
    this.bars[1].group.visible = false;
    this.catMat.color.set(ct && flashed(s, ct) ? HIT : '#ffffff');
    this.cat.forEach((m) => (m.visible = !!ct));
    if (!ct) {
      // Build 16: a dead caterpillar sags flat and rolls a little, then is gone.
      const dead = s.catCorpse;
      if (dead && this.catLast) {
        const u = Math.min(1, (s.t - dead.t) / 0.6), gone = Math.max(0, (s.t - dead.t - 2) / 1);
        this.cat.forEach((m, i) => {
          const L = this.catLast[i]; m.visible = gone < 1;
          m.position.set(L.x, L.y * (1 - 0.45 * u) - gone * 6, L.z);
          m.rotation.set(0.5 * u * (i % 2 ? 1 : -1) * 0.3, L.yaw, 0);
          m.scale.set(L.r * (1 + 0.15 * u), L.r * (1 - 0.4 * u), L.r * (1 + 0.2 * u));
        });
      }
      path.length = 0; return;
    }
    const need = CAT.gap * CAT_SEGMENTS + 20;
    if (!path.length || Math.hypot(path[0][0] - ct.x, path[0][1] - ct.y) > 40) {
      // First sight: lay the body out straight behind where it is heading.
      path.length = 0;
      const hx = (ct.gx ?? ct.x + 1) - ct.x, hy = (ct.gy ?? ct.y) - ct.y, hl = Math.hypot(hx, hy) || 1;
      for (let i = 0; i * 4 < need; i++) path.push([ct.x - (hx / hl) * i * 4, ct.y - (hy / hl) * i * 4]);
    } else {
      const d = Math.hypot(path[0][0] - ct.x, path[0][1] - ct.y);
      if (d > 0.8) { path.unshift([ct.x, ct.y]); A.phase += d / CAT.waveLen; A.moved = t; }
    }
    // Trim the trail to what the body needs.
    let len = 0;
    for (let i = 1; i < path.length; i++) {
      len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      if (len > need) { path.length = i + 1; break; }
    }
    const crawling = t - A.moved < 0.4;
    // Walk along the trail placing segments; lifted ones bunch up.
    let seg = 0, want = 0, acc = 0, prev = [ct.x, ct.y];
    const pts = [];
    const lift = (i) => (crawling ? Math.max(0, Math.sin(A.phase * Math.PI * 2 + i * 0.75)) : 0);
    for (let i = 0; i <= path.length && seg < CAT_SEGMENTS; i++) {
      const cur = i === 0 ? [ct.x, ct.y] : path[i - 1];
      const l = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
      while (seg < CAT_SEGMENTS && acc + l >= want) {
        const u = l ? (want - acc) / l : 0;
        pts.push([prev[0] + (cur[0] - prev[0]) * u, prev[1] + (cur[1] - prev[1]) * u]);
        want += CAT.gap * (1 - 0.18 * lift(seg));
        seg++;
      }
      acc += l;
      prev = cur;
    }
    while (pts.length < CAT_SEGMENTS) { const p = pts[pts.length - 1] || [ct.x, ct.y]; pts.push([p[0] - CAT.gap, p[1]]); }
    const breathe = crawling ? 0 : Math.sin(t * 1.6);
    this.cat.forEach((m, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(CAT_SEGMENTS - 1, i + 1)];
      const yaw = Math.atan2(-(a[1] - b[1]), a[0] - b[0]);
      const r = i === 0 ? CAT.head : CAT.r * (i > 7 ? 1 - (i - 7) * 0.08 : 1);
      const up = lift(i) * CAT.lift;
      m.position.set(pts[i][0], r * (i === 0 ? 0.9 : 1.05) + up, pts[i][1]);
      m.rotation.set(0, yaw || 0, i === 0 ? -0.15 + up * 0.04 : 0);
      m.scale.set(r, r * (1 + 0.04 * breathe), r * (1 + 0.03 * breathe));
      (this.catLast || (this.catLast = []))[i] = { x: pts[i][0], y: r * (i === 0 ? 0.9 : 1.05), z: pts[i][1], yaw: yaw || 0, r };
    });
    this._placeBar(this.bars[1], pts[4][0], pts[4][1], 22, ct.hp / ct.maxHp, '#8fd36b');
  }

  // Build 16: ladybugs, earwigs, crickets and millipedes, live and dead.
  _critters(s, t, fdt) {
    const B = this.bugs, G = this.bugGeo, live = new Set();
    B.begin();
    let bars = 0;
    const put = (geo, x, y, z, q, k, color, sy) => { tmpV.set(x, y, z); if (sy) B.pushAtScale(geo.uuid, geo, tmpV, q, k, k * sy, k, color); else B.pushAt(geo.uuid, geo, tmpV, q, k, color); };
    // yaw about up, then pitch (nose up +) about the body's side, then roll about its length.
    const orient = (yaw, pitch = 0, roll = 0) => {
      tmpQ.setFromAxisAngle(UP, yaw);
      if (pitch) tmpQ.multiply(tmpQ2.setFromAxisAngle(ZAX, pitch));
      if (roll) tmpQ.multiply(tmpQ2.setFromAxisAngle(XAX, roll));
      return tmpQ;
    };
    for (const b of s.critters || []) {
      live.add(b.id);
      const K = BUG[b.kind], k = K.k;
      let A = this.bugAnim.get(b.id);
      const aim = Math.atan2(-(b.dy || 0), b.dx || 1);
      if (!A) { A = { x: b.x, y: b.y, yaw: aim, phase: 0, moved: -9, path: [], curl: b.state === 'curl' ? 1 : 0 }; this.bugAnim.set(b.id, A); }
      const d = Math.hypot(b.x - A.x, b.y - A.y);
      if (d > 0.05 && d < 80) { A.phase += d / K.stride; A.moved = t; }
      A.x = b.x; A.y = b.y;
      A.yaw += wrapAngle(aim - A.yaw) * Math.min(1, fdt * 9);
      const walking = t - A.moved < 0.15, frame = Math.floor(A.phase * BUG_WALK) % BUG_WALK;
      const color = flashed(s, b) ? HIT : '#ffffff';
      if (b.kind === 'ladybug') {
        if (b.state === 'land' || b.state === 'fly') {
          // Drops in from above, wings a blur; leaves the same way.
          const u = Math.min(1, b.t / (b.state === 'land' ? 1.2 : 1.6));
          const up = b.state === 'land' ? (1 - u) * (1 - u) * 90 : u * u * 150 + u * 8;
          const go = b.state === 'fly' ? u * 70 : -(1 - u) * 30;
          const geo = u > 0.97 && b.state === 'land' ? G.lbStill : G.lbFly[Math.floor(t * 34) % 2];
          put(geo, b.x + (b.dx || 1) * go, up, b.y + (b.dy || 0) * go, orient(A.yaw, b.state === 'fly' ? 0.35 : 0.15), k, color);
        } else if (b.state === 'eat') put(G.lbStill, b.x, 0, b.y, orient(A.yaw, -0.12 + Math.sin(t * 6) * 0.08), k, color);
        else put(walking ? G.lb[frame] : G.lbStill, b.x, 0, b.y, orient(A.yaw), k, color);
      } else if (b.kind === 'earwig') {
        const snap = s.t - (b.pinchAt ?? -9) < 0.3;
        const geo = snap ? G.ewSnap : b.state === 'rush' ? G.ewUp[walking ? frame : 0] : walking ? G.ew[frame] : G.ewStill;
        const lunge = snap ? Math.sin(((s.t - b.pinchAt) / 0.3) * Math.PI) * 5 : 0;
        put(geo, b.x + (b.dx || 0) * lunge, 0, b.y + (b.dy || 0) * lunge, orient(A.yaw), k, color);
      } else if (b.kind === 'cricket') {
        if (b.state === 'hop') {
          const u = Math.min(1, b.t / 0.55), L = Math.hypot(b.hx1 - b.hx0, b.hy1 - b.hy0);
          const geo = u < 0.12 ? G.cr.crouch : u < 0.82 ? G.cr.leap : G.cr.sit;
          put(geo, b.x, Math.sin(Math.PI * u) * Math.min(40, L * 0.55), b.y, orient(A.yaw, (0.45 - u) * 0.9), k, color);
        } else if (b.state === 'tired') put(G.cr.sit, b.x, -0.5 * k, b.y, orient(A.yaw, -0.08), k, color, 1 + Math.sin(t * 7) * 0.05);
        else {
          const chirp = s.t - (b.chirpAt ?? -9) < 0.9 && Math.floor(t * 14) % 2;
          put(chirp ? G.cr.chirp : G.cr.sit, b.x, 0, b.y, orient(A.yaw), k, color);
        }
      } else this._millipede(s, b, A, t, fdt, put, orient, color, walking);
      if (b.hp < b.maxHp && bars < this.bugBars.length) this._placeBar(this.bugBars[bars++], b.x, b.y, K.bar + (b.kind === 'cricket' && b.state === 'hop' ? 30 : 0), b.hp / b.maxHp, '#f0b040');
    }
    for (const id of this.bugAnim.keys()) if (!live.has(id)) this.bugAnim.delete(id);
    for (let i = bars; i < this.bugBars.length; i++) this.bugBars[i].group.visible = false;
    // Dead ones lie on their backs, legs in the air, smaller as they're eaten away.
    for (const f of s.items) {
      if (f.kind !== 'protein' || !BUG[f.type] || f.amt <= 0) continue;
      const K = BUG[f.type], k = K.k * (0.55 + 0.45 * Math.min(1, f.amt / SIM.BUGS[f.type].meat)), x = (f.x + 0.5) * T, z = (f.y + 0.5) * T;
      const yaw = -(f.yaw || 0);
      if (f.type === 'millipede') { this._coil(x, z, yaw, k, put, orient, '#ffffff', 1, 0); continue; }
      const geo = f.type === 'ladybug' ? G.lbStill : f.type === 'earwig' ? G.ewStill : G.cr.sit;
      put(geo, x, K.back * k * 0.9, z, orient(yaw, 0, Math.PI), k, '#ffffff');
    }
    B.end();
  }

  // Millipede: rings along the head's trail, a leg wave rolling down them;
  // bitten, it coils up into a tight spiral, legs in.
  _millipede(s, b, A, t, fdt, put, orient, color, walking) {
    const k = BUG.millipede.k, gap = MILLI.gap * k, n = MILLI.n, path = A.path;
    if (!path.length || Math.hypot(path[0][0] - b.x, path[0][1] - b.y) > 60) {
      path.length = 0;
      for (let i = 0; i <= n; i++) path.push([b.x - (b.dx || 1) * i * gap, b.y - (b.dy || 0) * i * gap]);
    } else if (Math.hypot(path[0][0] - b.x, path[0][1] - b.y) > 0.8) path.unshift([b.x, b.y]);
    // Points along the trail, a gap apart.
    const pts = [[b.x, b.y]];
    let acc = 0, want = gap, prev = path[0];
    for (let i = 1; i < path.length && pts.length < n; i++) {
      const cur = path[i], l = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
      while (pts.length < n && acc + l >= want) { const u = (want - acc) / l; pts.push([prev[0] + (cur[0] - prev[0]) * u, prev[1] + (cur[1] - prev[1]) * u]); want += gap; }
      acc += l; prev = cur;
      if (acc > gap * (n + 4)) { path.length = i + 1; break; }
    }
    while (pts.length < n) { const p = pts[pts.length - 1]; pts.push([p[0] - (b.dx || 1) * gap, p[1] - (b.dy || 0) * gap]); }
    A.curl += ((b.state === 'curl' ? 1 : 0) - A.curl) * Math.min(1, fdt * 5);
    if (A.curl > 0.02) { this._coil(b.x, b.y, A.yaw, k, put, orient, color, A.curl, 0, pts); return; }
    const ph = Math.floor(A.phase * BUG_WALK);
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)];
      const yaw = i === 0 ? A.yaw : Math.atan2(-(a[1] - c[1]), a[0] - c[0]);
      const f = walking ? (ph + n - i) % BUG_WALK : 0;
      const geo = i === 0 ? this.bugGeo.mpHead : i >= n - 2 ? this.bugGeo.mpTail[f] : this.bugGeo.mp[f];
      put(geo, pts[i][0], 0, pts[i][1], orient(yaw), k, color);
    }
  }
  // A flat spiral round (cx, cz): head in the middle, tail outside, the rings
  // rolled onto their sides so the legs point in. curl blends from pts.
  _coil(cx, cz, yaw0, k, put, orient, color, curl, phase, pts) {
    const n = MILLI.n, gap = MILLI.gap * k * 0.9, r0 = 1.6 * k, pitch = 2.7 * k / (Math.PI * 2);
    let th = 0;
    for (let i = 0; i < n; i++) {
      const r = r0 + pitch * th, ang = yaw0 + th;
      let x = cx + Math.cos(ang) * r, z = cz - Math.sin(ang) * r, yaw = ang + Math.PI / 2, y = 1.3 * k * curl;
      if (pts && curl < 1) {
        const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)], sy = Math.atan2(-(a[1] - c[1]), a[0] - c[0]);
        x = pts[i][0] + (x - pts[i][0]) * curl; z = pts[i][1] + (z - pts[i][1]) * curl; yaw = sy + wrapAngle(yaw - sy) * curl;
      }
      const geo = i === 0 ? this.bugGeo.mpHead : i >= n - 2 ? this.bugGeo.mpTail[0] : this.bugGeo.mp[0];
      put(geo, x, y, z, orient(yaw, 0, curl * Math.PI / 2), k, color);
      th += gap / r;
    }
  }

  // Sparks where bites land, splashes where raindrops hit ants, and drops
  // pocking the ground all round while it rains.
  _fx(s, t, fdt) {
    const F = this.fx, cq = this.camera.quaternion;
    F.begin();
    for (const h of s.hits || []) {
      const u = (s.t - h.t) / 0.35; if (u < 0 || u > 1) continue;
      const c = h.k ? '#ff5236' : '#fff0b0';
      tmpV.set(h.x, 8 + u * 5, h.y);
      tmpQ.copy(cq).multiply(tmpQ2.setFromAxisAngle(ZAX, h.t * 13 + u));
      F.pushAt('star', FOOD.star, tmpV, tmpQ, 12 * (1 - u) + 3, c);
      for (let j = 0; j < 4; j++) {
        const a = h.t * 31 + j * 1.7, r = u * 13;
        tmpV.set(h.x + Math.cos(a) * r, 8 + u * 9 - u * u * 10, h.y + Math.sin(a) * r);
        F.pushAt('star', FOOD.star, tmpV, tmpQ, 4 * (1 - u), c);
      }
    }
    const splash = (x, z, u, big) => {
      tmpV.set(x, 0.8, z);
      F.pushAt('ring', PROPS.ring, tmpV, tmpQ2.identity(), (big ? 5 : 1.5) + u * (big ? 16 : 5), u < 0.5 ? '#e4f2fb' : '#9cb8c8');
      if (u < 0.7) for (let j = 0; j < (big ? 5 : 2); j++) {
        const a = j * 2.4 + x, r = u * (big ? 16 : 7);
        tmpV.set(x + Math.cos(a) * r, Math.sin(Math.PI * u) * (big ? 12 : 5), z + Math.sin(a) * r);
        F.pushAt('bead', FOOD.bead, tmpV, tmpQ2, big ? 1.8 : 1.1, '#dff0fa');
      }
    };
    for (const sp of s.splashes || []) { const u = (s.t - sp.t) / 0.6; if (u >= 0 && u <= 1) splash(sp.x, sp.y, u, true); }
    if (s.rain.on) {
      for (let n = Math.round(fdt * 70 + Math.random() * 0.5); n > 0; n--) this.drops.push({ x: this.target.x + (Math.random() - 0.5) * 420, z: this.target.z + (Math.random() - 0.5) * 300, t });
    }
    this.drops = this.drops.filter((d) => t - d.t < 0.4);
    for (const d of this.drops) splash(d.x, d.z, (t - d.t) / 0.4, false);
    F.end();
  }

  _updateRain(t) {
    const pos = this.rain.geometry.attributes.position.array, sd = this.rainSeeds;
    const span = 520, hgt = 260;
    for (let i = 0; i < sd.length / 3; i++) {
      const x = this.target.x + (sd[i * 3] - 0.5) * span;
      const z = this.target.z + (sd[i * 3 + 1] - 0.5) * span;
      const y = hgt - ((t * 340 + sd[i * 3 + 2] * hgt) % hgt);
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x - 2; pos[i * 6 + 4] = y - 14; pos[i * 6 + 5] = z;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  // How far (tiles, either axis) the ground on screen reaches from the
  // camera's target: the farthest of the screen's corners, or the fog where
  // a corner looks above the horizon.
  _viewReach(dist) {
    let d = 0;
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = this.pick(x, y), far = this.scene.fog.far;
      d = Math.max(d, p ? Math.max(Math.abs(p.x - this.target.x), Math.abs(p.y - this.target.z)) : far);
    }
    return Math.min(d, this.scene.fog.far) / T;
  }

  // Screen NDC → sim surface px, or null.
  pick(ndcX, ndcY) {
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const r = this.raycaster.ray;
    if (Math.abs(r.direction.y) < 1e-4) return null;
    const k = -r.origin.y / r.direction.y;
    if (k < 0) return null;
    return { x: r.origin.x + r.direction.x * k, y: r.origin.z + r.direction.z * k };
  }
}
