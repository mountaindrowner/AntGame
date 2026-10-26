// The yard, top-down at a PS1 three-quarter angle. Sim surface coordinates
// (x right, y down, in px) map to world X = x, Z = y on a ground plane at
// Y = 0. Static scenery is built once per world; creatures, items and scent
// are redrawn from the sim every frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import SIM from '../../sim/sim.js';
import { CAMERA, COLORS, RENDER, ANT_SCALE } from '../../config.js';
import { psx, psxBasic } from '../ps1/materials.js';
import { canvasTexture, rampTexture, rng, noise2, PALETTE } from '../ps1/textures.js';
import { Crowd } from '../models/crowd.js';
import { antGeometry, planFor, spiderGeometry, caterpillarSegment, FOOT, SPIDER_FOOT, WALK_FRAMES } from '../models/creatures.js';
import { PROPS, itemLook } from '../models/props.js';

const { W, H, T, CASTES } = SIM;
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

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
    this.marks = new Crowd(this.dyn, psxBasic({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));

    this.spiderRest = spiderGeometry(false);
    this.spiderUp = spiderGeometry(true);
    this.spider = new THREE.Mesh(this.spiderRest, psx({ vertexColors: true, color: '#4b3324' }));
    this.spiderHead = { x: 0, y: 0, yaw: 0 };
    this.cat = [];
    const catGeo = caterpillarSegment();
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(catGeo, psx({ vertexColors: true, color: i % 2 ? '#7fb24a' : '#9ccb5a' }));
      this.cat.push(m);
    }
    this.bars = [this._bar(), this._bar()];
    this.dyn.add(this.spider, ...this.cat, ...this.bars.map((b) => b.group));

    // Rain: a box of falling streaks that follows the camera target.
    const n = 420, pos = new Float32Array(n * 6);
    this.rainSeeds = new Float32Array(n * 3).map(() => Math.random());
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#c8d8ff', transparent: true, opacity: 0.55 }));
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);

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

    // Ground: one quad per tile so the snapping has vertices to wobble.
    const gw = W * T, gh = H * T;
    const grassN = noise2(5), r = rng(3);
    const groundTex = canvasTexture(W * 8, H * 8, (c, cw, ch) => {
      const dirt = PALETTE.dirt, grass = PALETTE.grass;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const tx = x / 8, ty = y / 8;
        const gv = grassN(tx * 0.18, ty * 0.18) + grassN(tx * 0.6, ty * 0.6) * 0.35;
        const ramp = gv > 0.12 ? grass : dirt;
        const v = (r() - 0.5) * 0.9 + gv * 0.6 + 0.5;
        c.fillStyle = ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))];
        c.fillRect(x, y, 1, 1);
      }
      // Darker soil where rocks sit.
      c.fillStyle = 'rgba(40,30,20,0.45)';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (w.blocked[y * W + x]) c.fillRect(x * 8 - 1, y * 8 - 1, 10, 10);
    }, { wrap: false });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh, W, H).rotateX(-Math.PI / 2).translate(gw / 2, 0, gh / 2), psx({ map: groundTex }));
    g.add(ground);

    // Rocks on blocked tiles; the border becomes a wall of rocks and tall grass.
    const rockParts = [];
    const grassParts = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!w.blocked[y * W + x]) continue;
      const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (border) {
        for (let k = 0; k < 3; k++) {
          const h = 18 + r() * 22;
          const q = new THREE.PlaneGeometry(10, h).translate(0, h / 2, 0).rotateY(r() * Math.PI);
          q.translate((x + r()) * T, 0, (y + r()) * T);
          grassParts.push(q);
        }
        continue;
      }
      const rad = 7 + r() * 4;
      const d = new THREE.DodecahedronGeometry(rad, 0).toNonIndexed();
      d.scale(1, 0.55 + r() * 0.35, 1);
      d.rotateY(r() * 3);
      d.translate((x + 0.5) * T + (r() - 0.5) * 3, rad * 0.25, (y + 0.5) * T + (r() - 0.5) * 3);
      rockParts.push(d);
    }
    // Scattered grass clumps for texture.
    for (let i = 0; i < 260; i++) {
      const x = 1 + r() * (W - 2), y = 1 + r() * (H - 2);
      if (w.blocked[Math.floor(y) * W + Math.floor(x)]) continue;
      if (Math.hypot(x - w.ex, y - w.ey) < 3 || Math.hypot(x - w.rx, y - w.ry) < 3) continue;
      if (grassN(x * 0.18, y * 0.18) < 0.05) continue;
      const h = 6 + r() * 7;
      for (let k = 0; k < 2; k++) {
        const q = new THREE.PlaneGeometry(7, h).translate(0, h / 2, 0).rotateY(k * Math.PI / 2 + r());
        q.translate(x * T, 0, y * T);
        grassParts.push(q);
      }
    }
    if (rockParts.length) {
      const rocks = new THREE.Mesh(mergeGeometries(rockParts), psx({ map: rampTexture(21, PALETTE.rock, { size: 16, repeat: [0.08, 0.08] }) }));
      rocks.geometry.computeVertexNormals();
      g.add(rocks);
    }
    const grassTex = canvasTexture(16, 16, (c) => {
      const rr = rng(8);
      for (let x = 0; x < 16; x++) {
        const h = 5 + Math.floor(rr() * 11);
        c.fillStyle = rr() < 0.5 ? '#4f7a2e' : '#3a5e22';
        c.fillRect(x, 16 - h, 1, h);
      }
    }, { wrap: false });
    if (grassParts.length) {
      g.add(new THREE.Mesh(mergeGeometries(grassParts), psx({ map: grassTex, alphaTest: 0.5, side: THREE.DoubleSide })));
    }

    // Nest mounds: a ring of dug-out soil around a dark hole.
    this.holes = [];
    const moundTex = rampTexture(31, PALETTE.dirt, { size: 16, repeat: [3, 1] });
    for (const [hx, hy, rival] of [[w.ex, w.ey, false], [w.rx, w.ry, true]]) {
      // Open-topped ring of spoil, so an ant standing in the hole stays visible.
      const mound = new THREE.Mesh(new THREE.CylinderGeometry(11, 20, 4, 9, 1, true), psx({ map: moundTex, side: THREE.DoubleSide }));
      mound.position.set((hx + 0.5) * T, 2, (hy + 0.5) * T);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(10, 9).rotateX(-Math.PI / 2), psxBasic({ color: '#120a05' }));
      hole.position.set((hx + 0.5) * T, 0.25, (hy + 0.5) * T);
      const ring = new THREE.Mesh(new THREE.RingGeometry(18, 22, 12).rotateX(-Math.PI / 2), psxBasic({ color: '#8a2a1e', transparent: true, opacity: 0.8 }));
      ring.position.set((hx + 0.5) * T, 0.6, (hy + 0.5) * T);
      ring.visible = rival;
      g.add(mound, hole, ring);
      this.holes.push({ ring, rival });
    }

    // Scent overlay: one texel per tile, written from the sim each frame.
    this.scentData = new Uint8Array(W * H * 4);
    this.scentTex = new THREE.DataTexture(this.scentData, W, H, THREE.RGBAFormat);
    this.scentTex.magFilter = this.scentTex.minFilter = THREE.NearestFilter;
    this.scentTex.flipY = false;
    const overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(gw, gh, W, H).rotateX(-Math.PI / 2).translate(gw / 2, 0.4, gh / 2),
      psxBasic({ map: this.scentTex, transparent: true, depthWrite: false }, { affine: false })
    );
    // PlaneGeometry's v runs bottom-up; the sim's rows run top-down.
    overlay.geometry.attributes.uv.array.forEach((v, i, arr) => { if (i % 2) arr[i] = 1 - v; });
    g.add(overlay);
  }

  _updateScent(s) {
    const d = this.scentData, tr = s.trail, al = s.alarm;
    const tc = new THREE.Color(COLORS.trail), ac = new THREE.Color(COLORS.alarm);
    for (let i = 0; i < W * H; i++) {
      const t = tr[i], a = al[i];
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

    // Ants, the things they carry, and items on the ground.
    this.crowd.begin();
    this.marks.begin();
    const ant = (a, color, scaleMul) => {
      const C = CASTES[a.caste];
      const k = (C.r / 2.2) * (scaleMul || 1) * ANT_SCALE.surface;
      const frame = (frameT + a.id) % WALK_FRAMES;
      const plan = planFor(a.caste);
      tmpQ.setFromAxisAngle(UP, Math.atan2(-a.dy, a.dx));
      tmpV.set(a.x, FOOT * k, a.y);
      this.crowd.pushAt(plan + frame, antGeometry(plan, frame), tmpV, tmpQ, k, color);
      if (a.carry) {
        const c = itemLook({ kind: a.kind, type: a.kind === 'food' ? 'crumb' : a.kind, amt: 1 }, COLORS);
        tmpV.set(a.x + a.dx * 6.4 * k, FOOT * k + 0.2, a.y + a.dy * 6.4 * k);
        this.items.pushAt('carry' + a.kind, c.geo === PROPS.puddle ? PROPS.dew : c.geo, tmpV, tmpQ, 1.6 * k, c.color);
      }
      if (a.follow) {
        tmpV.set(a.x, 0.6, a.y);
        this.marks.pushAt('ring', PROPS.ring, tmpV, tmpQ.identity(), 6 * k, COLORS.player);
      }
    };
    this.items.begin();
    for (const f of s.items) {
      if (f.amt <= 0) continue;
      const L = itemLook(f, COLORS);
      tmpV.set((f.x + 0.5) * T, L.flat ? 0.3 : L.r * 0.6, (f.y + 0.5) * T);
      tmpQ.setFromAxisAngle(UP, (f.x * 7 + f.y * 13) % 6);
      this.items.pushAt(f.kind + f.type, L.geo, tmpV, tmpQ, L.r, L.color);
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
    this.marks.end();

    // Spider: heading from its motion, a foreleg raised every two seconds.
    const sp = s.spider;
    this.spider.visible = !!sp;
    this.bars[0].group.visible = false;
    if (sp) {
      const h = this.spiderHead;
      const dx = sp.x - h.x, dy = sp.y - h.y;
      if (dx * dx + dy * dy > 0.04) h.yaw = Math.atan2(-dy, dx);
      h.x = sp.x; h.y = sp.y;
      this.spider.geometry = (s.t % 2) < 0.3 ? this.spiderUp : this.spiderRest;
      this.spider.position.set(sp.x, SPIDER_FOOT * 1.3, sp.y);
      this.spider.scale.setScalar(1.3);
      this.spider.rotation.set(0, h.yaw, 0);
      this._placeBar(this.bars[0], sp.x, sp.y, 34, sp.hp / sp.maxHp, '#e4524a');
    }
    // Caterpillar: a wiggling chain of segments.
    const ct = s.cat;
    this.bars[1].group.visible = false;
    this.cat.forEach((m, i) => {
      m.visible = !!ct;
      if (!ct) return;
      m.position.set(ct.x - i * 5.2, 4.2 + Math.abs(Math.sin(s.t * 4 + i)) * 1.2, ct.y + Math.sin(s.t * 4 + i) * 1.6);
      m.scale.setScalar(i === 0 ? 4.6 : 4.2 - i * 0.2);
    });
    if (ct) this._placeBar(this.bars[1], ct.x - 10, ct.y, 18, ct.hp / ct.maxHp, '#8fd36b');

    // Weather and light.
    const raining = s.rain.on;
    this.rain.visible = raining;
    this.hemi.intensity = raining ? 0.75 : 1.25;
    this.sun.intensity = raining ? 0.35 : 1.6;
    this.scene.background.set(raining ? '#6f7f8f' : '#9bc7e6');
    this.scene.fog.color.set(raining ? '#6f7f8f' : '#b9cfd8');

    // Camera: follow the player, or the nest entrance.
    const a = pa && !P.inNest ? pa : null;
    const fx = a ? a.x : (w.ex + 0.5) * T, fy = a ? a.y : (w.ey + 0.5) * T;
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
