// The yard, top-down at a PS1 three-quarter angle. Sim surface coordinates
// (x right, y down, in px) map to world X = x, Z = y on a ground plane at
// Y = 0. Static scenery is built once per world; creatures, items and scent
// are redrawn from the sim every frame.
import * as THREE from 'three';
import SIM from '../../sim/sim.js';
import { CAMERA, COLORS, RENDER, ANT_SCALE } from '../../config.js';
import { psx, psxBasic } from '../ps1/materials.js';
import { rampTexture, PALETTE } from '../ps1/textures.js';
import { Crowd } from '../models/crowd.js';
import { antGeometry, planFor, FOOT, WALK_FRAMES } from '../models/creatures.js';
import { spiderGeometry, caterpillarSegment, SPIDER_FOOT, SPIDER_FRAMES, SPIDER_STRIDE, CAT_SEGMENTS } from '../models/bugs.js';
import { PROPS } from '../models/props.js';
import { FOOD, itemLook, carryLook } from '../models/food.js';
import { MotionTracker, idlePose } from '../motion.js';
import { buildYardScenery, mowerMesh } from './yardScenery.js';

const { W, H, T, CASTES, AREA } = SIM;
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const ZAX = new THREE.Vector3(0, 0, 1);
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

export function antColor(a) {
  const C = CASTES[a.caste];
  if (a.team) return C.fight >= 3 ? COLORS.rivalSoldier : COLORS.rivalAnt;
  if (a.caste === 'venom') return COLORS.venom;
  if (C.fight >= 3) return COLORS.soldier;
  if (a.caste === 'builder') return COLORS.builder;
  if (a.caste === 'nurse') return COLORS.nurse;
  return COLORS.ourAnt;
}

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
    this.spiderHead = { x: 0, y: 0, yaw: 0, aim: 0, phase: 0, moved: -9, seen: false };
    // Caterpillar: segments follow the path the head took, with a wave of
    // lifting segments rolling forward as it crawls.
    const catMat = psx({ vertexColors: true });
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
  setState(s) {
    this.state = s;
    this.camInit = false;
    if (this.static) {
      this.scene.remove(this.static);
      this.static.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    const g = new THREE.Group();
    this.static = g;
    this.scene.add(g);
    const w = s.world;

    // The yard: ground, landmarks, walls, rocks and grass (yardScenery.js).
    g.add(buildYardScenery(w));

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

    // Scent overlay: one texel per tile, written from the sim each frame.
    this.scentData = new Uint8Array(W * H * 4);
    this.scentTex = new THREE.DataTexture(this.scentData, W, H, THREE.RGBAFormat);
    this.scentTex.magFilter = this.scentTex.minFilter = THREE.NearestFilter;
    this.scentTex.flipY = false;
    // One overlay piece per region, like the ground, so off-screen ones are culled.
    const scentMat = psxBasic({ map: this.scentTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }, { affine: false });
    for (let y0 = 0; y0 < H; y0 += AREA) for (let x0 = 0; x0 < W; x0 += AREA) {
      const cw = Math.min(AREA, W - x0), ch = Math.min(AREA, H - y0);
      const geo = new THREE.PlaneGeometry(cw * T, ch * T, cw, ch).rotateX(-Math.PI / 2).translate((x0 + cw / 2) * T, 0.4, (y0 + ch / 2) * T);
      // Map this piece onto its part of the whole-yard scent texture.
      // PlaneGeometry's v runs bottom-up; the sim's rows run top-down.
      geo.attributes.uv.array.forEach((v, i, arr) => { arr[i] = i % 2 ? (y0 + (1 - v) * ch) / H : (x0 + v * cw) / W; });
      const overlay = new THREE.Mesh(geo, scentMat);
      overlay.renderOrder = 1;
      g.add(overlay);
    }
  }

  // Only the tiles around the camera are rewritten each frame.
  _updateScent(s) {
    const d = this.scentData, tr = s.trail, al = s.alarm;
    const tc = new THREE.Color(COLORS.trail), ac = new THREE.Color(COLORS.alarm);
    const R = 48, cx = Math.floor(this.target.x / T), cy = Math.floor(this.target.z / T);
    for (let y = Math.max(0, cy - R); y < Math.min(H, cy + R); y++) for (let x = Math.max(0, cx - R); x < Math.min(W, cx + R); x++) {
      const i = y * W + x, t = tr[i], a = al[i];
      let rr = 0, gg = 0, bb = 0, aa = 0;
      if (t > 0.04) { rr = tc.r; gg = tc.g; bb = tc.b; aa = Math.min(0.7, t * 0.3); }
      if (a > 0.08) { const k = Math.min(0.6, a * 0.2); rr = rr * (1 - k) + ac.r * k; gg = gg * (1 - k) + ac.g * k; bb = bb * (1 - k) + ac.b * k; aa = Math.max(aa, k); }
      d[i * 4] = rr * 255; d[i * 4 + 1] = gg * 255; d[i * 4 + 2] = bb * 255; d[i * 4 + 3] = aa * 255;
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

    this._updateScent(s);
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
      const L = itemLook(f, COLORS);
      // A treat being carried rides on its crew, just ahead of you.
      const lifted = f.carried && f.px != null;
      const cx = lifted ? f.px : (f.x + 0.5) * T, cz = lifted ? f.py : (f.y + 0.5) * T, spin = (f.x * 7 + f.y * 13) % 6;
      if (L.dew) { this._dew(f, L, cx, cz, spin, t); continue; }
      tmpV.set(cx, L.water ? 0.3 : (L.lift || 0) * L.r + 0.15 + (lifted ? 5 + Math.abs(Math.sin(t * 9)) : 0), cz);
      tmpQ.setFromAxisAngle(UP, spin);
      (L.water ? this.water : this.items).pushAt(L.key, L.geo, tmpV, tmpQ, L.r, L.color);
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
      ant(a, antColor(a));
    }
    const pa = P.ant;
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
    const across = (CAMERA.surfaceTilesAcross * T) / app.zoomMul;
    const dist = across / 2 / Math.tan(hfov / 2);
    // Keep the player centred in the space the HUD leaves free.
    const viewH = (across / aspect) / Math.sin(CAMERA.surfacePitch);
    const shift = hudShift(app) * viewH;
    this.target.lerp(tmpV.set(fx, 0, fy - shift), this.camInit ? 0.18 : 1);
    this.camInit = true;
    const pitch = CAMERA.surfacePitch;
    this.camera.aspect = aspect;
    this.camera.position.set(this.target.x, Math.sin(pitch) * dist, this.target.z + Math.cos(pitch) * dist);
    this.camera.lookAt(this.target);
    this.camera.far = dist * 3 + 400;
    this.camera.updateProjectionMatrix();
    this.scene.fog.near = dist * 1.1;
    this.scene.fog.far = dist * 2.4 + 200;

    if (raining) this._updateRain(t);
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
  _spider(s, t, fdt) {
    const sp = s.spider, h = this.spiderHead;
    this.spider.visible = !!sp;
    this.bars[0].group.visible = false;
    if (!sp) { h.seen = false; return; }
    const dx = sp.x - h.x, dy = sp.y - h.y, d = Math.hypot(dx, dy);
    if (!h.seen || d > 60) { h.seen = true; h.yaw = h.aim; }
    else if (d > 0.05) { h.aim = Math.atan2(-dy, dx); h.phase += d / (SPIDER_STRIDE * SPIDER_SCALE); h.moved = t; }
    h.x = sp.x; h.y = sp.y;
    h.yaw += wrapAngle(h.aim - h.yaw) * Math.min(1, fdt * 7);
    const walking = t - h.moved < 0.2;
    const frame = Math.floor(h.phase * SPIDER_FRAMES) % SPIDER_FRAMES;
    this.spider.geometry = walking ? this.spiderWalk[frame] : (s.t % 4) < 0.5 ? this.spiderUp : this.spiderRest;
    const bob = walking ? Math.abs(Math.sin(h.phase * Math.PI * 2)) * 0.5 : 0;
    this.spider.position.set(sp.x, (SPIDER_FOOT + bob) * SPIDER_SCALE, sp.y);
    const sb = walking ? 0 : Math.sin(t * 1.9);
    this.spider.scale.set(SPIDER_SCALE, SPIDER_SCALE * (1 + 0.03 * sb), SPIDER_SCALE * (1 + 0.02 * sb));
    this.spider.rotation.set(0, h.yaw, 0);
    this._placeBar(this.bars[0], sp.x, sp.y, 62, sp.hp / sp.maxHp, '#e4524a');
  }

  // Caterpillar: the head is the sim position; the body follows its trail.
  _caterpillar(s, t, fdt) {
    const ct = s.cat, path = this.catPath, A = this.catAnim;
    this.bars[1].group.visible = false;
    this.cat.forEach((m) => (m.visible = !!ct));
    if (!ct) { path.length = 0; return; }
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
    });
    this._placeBar(this.bars[1], pts[4][0], pts[4][1], 22, ct.hp / ct.maxHp, '#8fd36b');
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
