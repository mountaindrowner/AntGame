// The nest cutaway, side-on. Nest cell (cx, cy) spans world
// X = [cx*T, (cx+1)*T] and Y = [-(cy+1)*T, -cy*T]; the soil's front face is
// at Z = 0 and tunnels run back to a wall at Z = -DEPTH. The soil mesh is
// rebuilt whenever the sim bumps nest.ver.
import * as THREE from 'three';
import SIM from '../../sim/sim.js';
import { CAMERA, COLORS, RENDER, ANT_SCALE } from '../../config.js';
import { psx, psxBasic } from '../ps1/materials.js';
import { rampTexture, canvasTexture, rng, PALETTE } from '../ps1/textures.js';
import { Crowd } from '../models/crowd.js';
import { antGeometry, planFor, FOOT, WALK_FRAMES } from '../models/creatures.js';
import { PROPS } from '../models/props.js';
import { antColor, hudShift } from './surfaceView.js';

const { NW, NH, T, SHAFT, CASTES, ROOMS } = SIM;
export const DEPTH = 22;
const ROOM_COL = { queen: '#6a4a7a', hatchery: '#7a6a3a', store: '#8a7a3a', cistern: '#3a6a8a', nursery: '#7a5a6a', barracks: '#5a3a3a', workshop: '#5a5a3a' };

const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpM = new THREE.Matrix4();
const tmpS = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const QX90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const QZ_UP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
const QZ_DN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
const Q_LEFT = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI);
const Q_ID = new THREE.Quaternion();

export class NestView {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 4, 4000);
    this.scene.background = new THREE.Color('#9bc7e6');
    this.scene.fog = new THREE.Fog('#1a1009', 900, 1800);
    this.hemi = new THREE.HemisphereLight('#ffe8c8', '#3a2a1c', 1.1);
    this.key = new THREE.DirectionalLight('#fff0d8', 1.1);
    this.key.position.set(-0.3, 0.6, 1);
    this.scene.add(this.hemi, this.key);

    this.soilMats = PALETTE.soil.map((ramp, i) => psx({ map: rampTexture(3 + i, ramp, { size: 32, stones: [3, 6, 2][i], repeat: [1 / 48, 1 / 48] }) }));
    this.sideMats = PALETTE.soil.map((ramp, i) => psx({ map: rampTexture(13 + i, ramp.map((c) => shade(c, 0.7)), { size: 16, repeat: [1 / 24, 1 / 24] }) }));
    this.soil = new THREE.Group();
    this.scene.add(this.soil);

    // Back wall of the whole cutaway.
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(NW * T, NH * T, NW, NH).translate((NW * T) / 2, -(NH * T) / 2, -DEPTH),
      psx({ map: rampTexture(7, PALETTE.back, { size: 32, repeat: [NW / 3, NH / 3] }) })
    );
    this.scene.add(back);
    // Grass lip along the surface, and sky behind.
    const grass = new THREE.Mesh(new THREE.BoxGeometry(NW * T + 40, 5, DEPTH + 10).translate((NW * T) / 2, 2.5, -DEPTH / 2), psx({ map: rampTexture(9, PALETTE.grass, { size: 16, repeat: [20, 1] }) }));
    this.scene.add(grass);
    const sideDirt = psx({ map: rampTexture(4, PALETTE.soil[0], { size: 32, repeat: [1 / 48, 1 / 48] }) });
    // Solid ground either side of and under the cutaway.
    for (const sx of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(400, NH * T + 400, DEPTH + 10), sideDirt);
      slab.position.set(sx < 0 ? -200 : NW * T + 200, -(NH * T + 400) / 2, -DEPTH / 2 - 5);
      this.scene.add(slab);
    }
    const under = new THREE.Mesh(new THREE.BoxGeometry(NW * T, 400, DEPTH + 10), psx({ map: rampTexture(5, PALETTE.soil[2], { size: 32, repeat: [1 / 48, 1 / 48] }) }));
    under.position.set((NW * T) / 2, -NH * T - 200, -DEPTH / 2 - 5);
    this.scene.add(under);

    this.dyn = new THREE.Group();
    this.scene.add(this.dyn);
    this.crowd = new Crowd(this.dyn, psx({ vertexColors: true }));
    this.props = new Crowd(this.dyn, psx({ vertexColors: true }));
    this.overlay = new Crowd(this.dyn, psxBasic({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }, { snap: false }));
    this.queenMesh = new THREE.Mesh(antGeometry('queen', -1), psx({ vertexColors: true, color: COLORS.queen }));
    this.dyn.add(this.queenMesh);
    this.roomLights = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight('#ffb870', 0, 140, 1.4);
      this.scene.add(l);
      this.roomLights.push(l);
    }
    this.lantern = new THREE.PointLight('#ffe0b0', 0.8, 260, 1.2);
    this.scene.add(this.lantern);

    this.target = new THREE.Vector3(NW * T / 2, -100, 0);
    this.raycaster = new THREE.Raycaster();
    this.ver = -1;
    this.state = null;
    this.labels = [];
  }

  // Soil blocks: a front face per dirt cell, side walls where a dug cell is next door.
  _rebuildSoil(s) {
    this.soil.children.forEach((m) => m.geometry.dispose());
    this.soil.clear();
    const cells = s.nest.cells;
    const fronts = [[], [], []], sides = [[], [], []];
    const dug = (x, y) => x >= 0 && y >= 0 && x < NW && y < NH && cells[y * NW + x] > 0;
    const quad = (arr, a, b, c, d, n) => arr.push(a, b, c, d, n);
    for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
      if (cells[y * NW + x]) continue;
      const tier = SIM.soilTier(y);
      const x0 = x * T, x1 = x0 + T, y0 = -y * T, y1 = y0 - T;
      quad(fronts[tier], [x0, y1, 0], [x1, y1, 0], [x1, y0, 0], [x0, y0, 0], [0, 0, 1]);
      if (dug(x - 1, y)) quad(sides[tier], [x0, y1, -DEPTH], [x0, y1, 0], [x0, y0, 0], [x0, y0, -DEPTH], [-1, 0, 0]);
      if (dug(x + 1, y)) quad(sides[tier], [x1, y1, 0], [x1, y1, -DEPTH], [x1, y0, -DEPTH], [x1, y0, 0], [1, 0, 0]);
      if (dug(x, y - 1)) quad(sides[tier], [x0, y0, 0], [x1, y0, 0], [x1, y0, -DEPTH], [x0, y0, -DEPTH], [0, 1, 0]);
      if (dug(x, y + 1)) quad(sides[tier], [x0, y1, -DEPTH], [x1, y1, -DEPTH], [x1, y1, 0], [x0, y1, 0], [0, -1, 0]);
    }
    for (let t = 0; t < 3; t++) {
      if (fronts[t].length) this.soil.add(new THREE.Mesh(quadsGeometry(fronts[t]), this.soilMats[t]));
      if (sides[t].length) this.soil.add(new THREE.Mesh(quadsGeometry(sides[t]), this.sideMats[t]));
    }
  }

  setState(s) {
    this.state = s;
    this.ver = -1;
    this.camInit = false;
  }

  // Ants inside: walking in profile, or climbing the back wall in a shaft.
  _pushAnt(a, color, scaleMul, frameT) {
    const C = CASTES[a.caste];
    const k = (C.r / 2.2) * (scaleMul || 1) * ANT_SCALE.nest;
    const plan = planFor(a.caste);
    const frame = (frameT + a.id) % WALK_FRAMES;
    const x = a.nx * T, yc = -a.ny * T;
    const climbing = Math.abs(a.dy) > Math.abs(a.dx) + 0.05;
    if (climbing) {
      tmpQ.multiplyQuaternions(a.dy > 0 ? QZ_DN : QZ_UP, QX90);
      tmpV.set(x, yc, -DEPTH + FOOT * k + 0.6);
    } else {
      tmpQ.copy(a.dx < 0 ? Q_LEFT : Q_ID);
      const floorY = -(Math.floor(a.ny) + 1) * T;
      tmpV.set(x, floorY + FOOT * k, -DEPTH * 0.45);
    }
    this.crowd.pushAt(plan + frame, antGeometry(plan, frame), tmpV, tmpQ, k, color);
    if (a.carry) {
      const fx = climbing ? 0 : (a.dx < 0 ? -1 : 1), fy = climbing ? (a.dy > 0 ? -1 : 1) : 0;
      tmpV.x += fx * 6.4 * k;
      tmpV.y += fy * 6.4 * k;
      this.props.pushAt('carry', PROPS.crumb, tmpV, Q_ID, 1.6 * k, a.kind === 'water' ? COLORS.water : a.kind === 'grit' ? COLORS.grit : a.kind === 'protein' ? COLORS.protein : COLORS.food);
    }
  }

  _outline(x0, y0, w, h, color, th = 0.9) {
    // Four thin quads around a cell rectangle (scene units, y down → -Y).
    const z = 0.6;
    const put = (cx, cy, sx, sy) => {
      tmpV.set(cx, -cy, z);
      tmpM.compose(tmpV, Q_ID, tmpS.set(sx, sy, 1));
      this.overlay.push('q', PROPS.quad, tmpM, color);
    };
    put(x0 + w / 2, y0 + th / 2, w, th);
    put(x0 + w / 2, y0 + h - th / 2, w, th);
    put(x0 + th / 2, y0 + h / 2, th, h);
    put(x0 + w - th / 2, y0 + h / 2, th, h);
  }

  _fill(x0, y0, w, h, color, z = 0.5) {
    tmpV.set(x0 + w / 2, -(y0 + h / 2), z);
    tmpM.compose(tmpV, Q_ID, tmpS.set(w, h, 1));
    this.overlay.push('q', PROPS.quad, tmpM, color);
  }

  _prop(geo, key, x, y, z, sx, sy, sz, color, rotY = 0) {
    tmpV.set(x, y, z);
    tmpQ.setFromAxisAngle(Y_AXIS, rotY);
    tmpM.compose(tmpV, tmpQ, tmpS.set(sx, sy, sz));
    this.props.push(key, geo, tmpM, color);
  }

  // Procedural room dressing, scaled by live colony numbers.
  _decorate(r, col, t) {
    const rw = r.w || 4, rh = r.h || 3;
    const x = r.x0 * T, W2 = rw * T, floor = -(r.y0 + rh) * T, z = -DEPTH * 0.7;
    if (r.key === 'store') {
      const fill = Math.min(1, col.store / Math.max(1, col.cap));
      const n = rw * 2, piles = Math.max(1, Math.round(fill * n));
      for (let i = 0; i < n; i++) this._prop(PROPS.cone, 'cone', x + 5 + (i * (W2 - 10)) / (n - 1), floor + 3, z, 4, 6, 4, i < piles ? COLORS.food : '#5a4a2a');
    } else if (r.key === 'cistern') {
      const lvl = Math.min(1, col.water / Math.max(1, col.waterCap));
      const h = Math.max(0.5, (rh * T - 8) * lvl);
      this._prop(PROPS.box, 'box', x + W2 / 2, floor + h / 2, z + 2, W2 - 6, h, DEPTH * 0.6, COLORS.water);
      for (const px of [x + 3, x + W2 - 3]) this._prop(PROPS.box, 'box', px, floor + (rh * T - 6) / 2, z, 2, rh * T - 6, 2, '#5a4a3a');
    } else if (r.key === 'barracks') {
      for (let i = 0; i < rw; i++) {
        const px = x + 8 + (i * (W2 - 16)) / Math.max(1, rw - 1);
        this._prop(PROPS.egg, 'egg', px, floor + 3, z, 3.2, 2.6, 2.6, '#2a1a14');
        this._prop(PROPS.box, 'box', px - 3, floor + 9, z - 3, 0.8, 18, 0.8, '#8a6a4a', 0.2);
      }
    } else if (r.key === 'hatchery') {
      const rr = rng(r.x0 * 31 + r.y0);
      for (let i = 0; i < rw * 4; i++) this._prop(PROPS.box, 'box', x + 3 + rr() * (W2 - 6), floor + 0.6, z + (rr() - 0.5) * 8, 4, 0.8, 1, '#c9a860', rr() * 3);
    } else if (r.key === 'nursery') {
      for (let i = 0; i < rw; i++) {
        const px = x + 8 + (i * (W2 - 16)) / Math.max(1, rw - 1);
        this._prop(PROPS.egg, 'egg', px, floor + 2.4, z, 5, 3, 3.5, '#e8c9d2');
      }
    } else if (r.key === 'workshop') {
      for (let i = 0; i < 4; i++) this._prop(PROPS.pebble, 'pebble', x + 6 + i * 6, floor + 2, z, 2.6, 2.6, 2.6, COLORS.grit, i);
      for (let i = 0; i < 3; i++) this._prop(PROPS.box, 'box', x + W2 - 6 - i * 5, floor + 9, z - 2, 1.2, 18, 1.2, '#8a6a3a', 0.15 + i * 0.1);
    } else if (r.key === 'queen') {
      this._prop(PROPS.egg, 'egg', x + W2 / 2, floor, z, W2 * 0.36, 5, DEPTH * 0.35, '#4a3528');
    }
  }

  update(app, t, aspect) {
    const s = app.s;
    if (s !== this.state) this.setState(s);
    if (s.nest.ver !== this.ver) { this.ver = s.nest.ver; this._rebuildSoil(s); }
    const n = s.nest, q = s.queen, col = s.colony, P = s.player;
    const frameT = Math.floor(t * RENDER.animFps);
    this.labels = [];

    this.crowd.begin();
    this.props.begin();
    this.overlay.begin();

    // Room back panels, dressing and lamps.
    this.roomLights.forEach((l) => (l.intensity = 0));
    n.rooms.forEach((r, i) => {
      const rw = r.w || 4, rh = r.h || 3;
      tmpV.set((r.x0 + rw / 2) * T, -(r.y0 + rh / 2) * T, -DEPTH + 0.3);
      tmpM.compose(tmpV, Q_ID, tmpS.set(rw * T, rh * T, 1));
      this.props.push('panel', PROPS.quad, tmpM, ROOM_COL[r.key] || '#555555');
      this._decorate(r, col, t);
      if (i < this.roomLights.length) {
        const l = this.roomLights[i];
        l.intensity = 1.4 + 0.12 * Math.sin(t * 9 + i * 2);
        l.position.set((r.x0 + rw / 2) * T, -(r.y0 + 0.8) * T, -DEPTH * 0.3);
      }
      this.labels.push({ text: ROOMS[r.key].name, x: (r.x0 + rw / 2) * T, y: -r.y0 * T - 2, z: 0, kind: 'room' });
    });

    // Frontier dots: where a dig order can go.
    if (s.phase === 'play') {
      for (let y = 1; y < NH; y++) for (let x = 1; x < NW - 1; x++) {
        if (n.cells[y * NW + x]) continue;
        const adj = (x > 0 && n.cells[y * NW + x - 1]) || (x < NW - 1 && n.cells[y * NW + x + 1]) || (y > 0 && n.cells[(y - 1) * NW + x]) || (y < NH - 1 && n.cells[(y + 1) * NW + x]);
        if (adj) this._fill(x * T + T / 2 - 1.2, y * T + T / 2 - 1.2, 2.4, 2.4, '#ffe6b4', 0.4);
      }
    }
    // Dig orders chip away a quarter at a time.
    const qd = [[0, 0], [1, 1], [1, 0], [0, 1]];
    for (const o of n.digOrders) {
      const k = Math.floor(Math.min(0.999, o.progress / o.need) * 4);
      for (let i = 0; i < k; i++) this._fill(o.x * T + qd[i][0] * T / 2, o.y * T + qd[i][1] * T / 2, T / 2, T / 2, '#120a04', 0.3);
      this._outline(o.x * T + 2, o.y * T + 2, T - 4, T - 4, '#ffdc78');
    }
    for (const o of n.fillOrders) {
      const k = Math.min(1, o.progress / o.need);
      this._fill(o.x * T + 2, o.y * T + 2, T - 4, T - 4, k > 0.5 ? '#8a6040' : '#5a3e28', -DEPTH * 0.2);
      this._outline(o.x * T + 2, o.y * T + 2, T - 4, T - 4, '#ffc896');
    }
    for (const r of s.repairs) {
      for (const sgn of [1, -1]) {
        tmpV.set(r.x * T + T / 2, -(r.y * T + T / 2), 0.7);
        tmpQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), sgn * Math.PI / 4);
        tmpM.compose(tmpV, tmpQ, tmpS.set(T * 1.1, 1.4, 1));
        this.overlay.push('q', PROPS.quad, tmpM, '#ff7850');
      }
    }
    // Rooms being built: outline, progress bar, label.
    for (const j of col.buildQueue) {
      this._outline(j.x0 * T + 1, j.y0 * T + 1, j.w * T - 2, j.h * T - 2, '#ffdc78');
      const pr = Math.min(1, j.progress / ROOMS[j.room].work);
      this._fill(j.x0 * T + 4, (j.y0 + j.h) * T - 7, j.w * T - 8, 3, '#000000');
      this._fill(j.x0 * T + 4, (j.y0 + j.h) * T - 7, (j.w * T - 8) * pr, 3, '#ffd34d', 0.7);
      this.labels.push({ text: ROOMS[j.room].name + ' ' + Math.round(pr * 100) + '%', x: (j.x0 + j.w / 2) * T, y: -j.y0 * T - 2, z: 0, kind: 'room' });
    }
    // Placement tools.
    const placing = app.placing;
    if (placing && placing.kind === 'room') {
      const R = ROOMS[placing.key];
      for (const i of app.placeCells(R.w, R.h)) this._fill((i % NW) * T + 1, Math.floor(i / NW) * T + 1, T - 2, T - 2, '#78dc6e', 0.8);
    }
    if (placing && placing.kind === 'remove') {
      for (const r of n.rooms) if (r.key !== 'queen') this._outline(r.x0 * T + 1, r.y0 * T + 1, (r.w || 4) * T - 2, (r.h || 3) * T - 2, '#ff7850', 1.4);
    }
    // Eggs, with a hatch bar under each.
    const er = SIM.roomOf(s, 'hatchery') || q.room;
    if (er) {
      col.eggs.forEach((e, i) => {
        const ex = er.x0 * T + 6 + (i % 5) * 11, ey = er.y0 * T + (er.h || 3) * T - 4 - Math.floor(i / 5) * 7;
        this._prop(PROPS.egg, 'egg', ex, -ey + 2.4, -DEPTH * 0.35, 3.6, 3.2, 3, '#f3ead6');
        this._fill(ex - 3.5, ey + 1, 7 * Math.min(1, e.t / e.need), 1.4, '#8fd36b', 0.7);
      });
    }
    // Ants inside, then the player.
    for (const a of s.ants) {
      if (a.team || a.isPlayer || !(a.state === 'in' || a.state === 'build')) continue;
      this._pushAnt(a, antColor(a), 1, frameT);
    }
    const pa = P.ant;
    if (pa && P.inNest) {
      this._pushAnt(pa, COLORS.player, 1.2, frameT);
      if (P.ntx != null) this._outline(P.ntx * T + 2, P.nty * T + 2, T - 4, T - 4, '#ffffff', 0.7);
    }
    // Queen: grows with each upgrade; during the dig she shows where she can go.
    const qs = ANT_SCALE.queen + q.level * ANT_SCALE.queenPerLevel;
    const floorY = q.room ? -(q.room.y0 + (q.room.h || 3)) * T : -(q.y + 1) * T;
    this.queenMesh.position.set((q.x + 0.5) * T, floorY + FOOT * qs, -DEPTH * 0.5);
    this.queenMesh.scale.setScalar(qs);
    this.queenMesh.quaternion.copy(Q_LEFT);
    if (s.phase === 'dig') {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = q.x + dx, y = q.y + dy;
        if (x < 1 || y < 0 || x >= NW - 1 || y >= NH || n.cells[y * NW + x]) continue;
        this._outline(x * T + 2, y * T + 2, T - 4, T - 4, '#ffffff', 0.8);
      }
    }
    this.crowd.end();
    this.props.end();
    this.overlay.end();

    this.labels.push({ text: 'exit', x: (SHAFT + 0.5) * T, y: 12, z: 0, kind: 'hint' });
    this.labels.push({ text: 'packed soil · needs Workshop', x: 4, y: -14 * T - 2, z: 0, kind: 'band' });
    this.labels.push({ text: 'clay · needs Workshop + queen upgrade', x: 4, y: -28 * T - 2, z: 0, kind: 'band' });

    // Weather.
    this.scene.background.set(s.rain.on ? '#6f7f8f' : '#9bc7e6');
    this.hemi.intensity = s.rain.on ? 0.8 : 1.1;

    // Camera: follow the player or the queen; drag pans vertically.
    const a = pa && P.inNest ? pa : null;
    const fy = (a ? a.ny : q.y + 0.5) * T + app.panY;
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const across = (CAMERA.nestCellsAcross * T * 1.06) / app.zoomMul;
    const dist = across / 2 / Math.tan(hfov / 2);
    const viewH = 2 * dist * Math.tan(vfov / 2);
    const shift = hudShift(app) * viewH;
    // Let the surface row drop below the HUD; stop before the view is all sky or all rock.
    const minY = -viewH / 2 + 90, maxY = NH * T - viewH / 2 + 60 - shift;
    const cy = maxY < minY ? (NH * T) / 2 : Math.max(minY, Math.min(maxY, fy - shift));
    const viewW = across;
    const fx = a ? a.nx * T : (q.x + 0.5) * T;
    const cx = viewW >= NW * T ? (NW * T) / 2 : Math.max(viewW / 2 - 20, Math.min(NW * T - viewW / 2 + 20, fx));
    this.target.lerp(tmpV.set(cx, -cy, -DEPTH / 2), this.camInit ? 0.2 : 1);
    this.camInit = true;
    this.camera.aspect = aspect;
    this.camera.position.set(this.target.x, this.target.y + dist * 0.1, dist);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.lantern.position.set(this.target.x, this.target.y + 40, 90);
    this.scene.fog.near = dist + 200;
    this.scene.fog.far = dist + 1200;
  }

  // Screen NDC → nest cell [cx, cy] on the front face.
  pick(ndcX, ndcY) {
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const r = this.raycaster.ray;
    if (Math.abs(r.direction.z) < 1e-4) return null;
    const k = -r.origin.z / r.direction.z;
    const X = r.origin.x + r.direction.x * k, Y = r.origin.y + r.direction.y * k;
    return [Math.floor(X / T), Math.floor(-Y / T)];
  }

  // World → CSS px for labels.
  project(x, y, z, cssW, cssH) {
    tmpV.set(x, y, z).project(this.camera);
    return { x: (tmpV.x * 0.5 + 0.5) * cssW, y: (-tmpV.y * 0.5 + 0.5) * cssH, visible: tmpV.z < 1 };
  }
}

function shade(hex, k) {
  const c = new THREE.Color(hex).multiplyScalar(k);
  return '#' + c.getHexString();
}

// Quads given as [a, b, c, d, normal] in sequence → one non-indexed geometry
// with world-space UVs (so textures tile across cells).
function quadsGeometry(list) {
  const nq = list.length / 5;
  const pos = new Float32Array(nq * 18), nor = new Float32Array(nq * 18), uv = new Float32Array(nq * 12);
  for (let i = 0; i < nq; i++) {
    const [a, b, c, d, nn] = list.slice(i * 5, i * 5 + 5);
    const tri = [a, b, c, a, c, d];
    tri.forEach((p, k) => {
      pos.set(p, i * 18 + k * 3);
      nor.set(nn, i * 18 + k * 3);
      // Project onto the plane the face lies in for UVs.
      const u = nn[0] !== 0 ? p[2] : p[0];
      const v = nn[1] !== 0 ? p[2] : p[1];
      uv[i * 12 + k * 2] = u;
      uv[i * 12 + k * 2 + 1] = v;
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
