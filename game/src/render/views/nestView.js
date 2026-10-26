// The nest cutaway, side-on. Nest cell (cx, cy) spans world
// X = [cx*T, (cx+1)*T] and Y = [-(cy+1)*T, -cy*T]; the soil's front face is
// at Z = 0 and tunnels run back to a wall at Z = -DEPTH. The soil mesh is
// rebuilt whenever the sim bumps nest.ver.
import * as THREE from 'three';
import SIM from '../../sim/sim.js';
import { CAMERA, COLORS, RENDER, ANT_SCALE } from '../../config.js';
import { psx, psxBasic } from '../ps1/materials.js';
import { rampTexture, PALETTE } from '../ps1/textures.js';
import { Crowd } from '../models/crowd.js';
import { antGeometry, planFor, FOOT, WALK_FRAMES } from '../models/creatures.js';
import { PROPS } from '../models/props.js';
import { dressRoom, roomWallMaterial } from '../models/roomDecor.js';
import { MotionTracker, idlePose } from '../motion.js';
import { antColor, hudShift } from './surfaceView.js';
import { shapesFromField } from '../geometry/contour.js';

const { NW, NH, T, SHAFT, CASTES, ROOMS } = SIM;
export const DEPTH = 22;
const SOIL_STEP = 2; // px between field samples when tracing tunnel outlines
const ROUND = 5; // corner radius of a dug cell
const BLEND = 8; // how softly neighbouring cells merge

// Signed distance to the dug space (negative inside), in nest px with y down.
// Each dug cell is a rounded box; a brick being dug is a box that grows in
// from the side its builder works from. Boxes merge with a smooth minimum,
// which rounds inside corners as well as outside ones.
function tunnelBoxes(s) {
  const cells = s.nest.cells;
  const boxes = Array.from({ length: NW * NH }, () => []);
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
    if (cells[y * NW + x]) boxes[y * NW + x].push([(x + 0.5) * T, (y + 0.5) * T, T / 2, T / 2]);
  }
  // The shaft breaks through the surface.
  boxes[SHAFT].push([(SHAFT + 0.5) * T, -T / 2, T / 2, T]);
  for (const o of s.nest.digOrders) {
    const q = Math.floor(Math.min(0.999, o.progress / o.need) * 4) / 4;
    if (q <= 0) continue;
    let ax = o.ax, ay = o.ay;
    if (!(cells[ay * NW + ax] > 0)) {
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [o.x + dx, o.y + dy]).find(([x, y]) => x >= 0 && y >= 0 && x < NW && y < NH && cells[y * NW + x]);
      if (!n) continue;
      [ax, ay] = n;
    }
    const dx = o.x - ax, dy = o.y - ay; // direction the dig advances
    const len = T * q;
    const cx = (o.x + 0.5) * T - dx * (T - len) / 2, cy = (o.y + 0.5) * T - dy * (T - len) / 2;
    boxes[o.y * NW + o.x].push([cx, cy, dx ? len / 2 : T / 2 - 1, dy ? len / 2 : T / 2 - 1]);
  }
  return boxes.flat();
}

// Sample the tunnel field on a grid (x0, y0, step, nx × ny). Each box only
// touches the samples near it, so cost scales with the dug area, not the nest.
export function tunnelGrid(s, x0, y0, step, nx, ny) {
  const far = T * 2;
  const grid = new Float32Array(nx * ny).fill(far);
  const reach = ROUND + BLEND;
  for (const b of tunnelBoxes(s)) {
    const r = Math.min(ROUND, b[2], b[3]);
    const i0 = Math.max(0, Math.floor((b[0] - b[2] - reach - x0) / step)), i1 = Math.min(nx - 1, Math.ceil((b[0] + b[2] + reach - x0) / step));
    const j0 = Math.max(0, Math.floor((b[1] - b[3] - reach - y0) / step)), j1 = Math.min(ny - 1, Math.ceil((b[1] + b[3] + reach - y0) / step));
    for (let j = j0; j <= j1; j++) {
      const qy = Math.abs(y0 + j * step - b[1]) - b[3] + r;
      for (let i = i0; i <= i1; i++) {
        const qx = Math.abs(x0 + i * step - b[0]) - b[2] + r;
        const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;
        const d = Math.min(Math.max(qx, qy), 0) + Math.sqrt(ox * ox + oy * oy) - r;
        const k = j * nx + i, a = grid[k];
        // Smooth minimum: merges neighbouring cells and rounds inside corners.
        const h = Math.max(BLEND - Math.abs(a - d), 0) / BLEND;
        grid[k] = Math.min(a, d) - h * h * BLEND * 0.25;
      }
    }
  }
  return grid;
}
const PROP_KEY = new Map(Object.entries(PROPS).map(([k, g]) => [g, k]));

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
const tmpE = new THREE.Euler();

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
    this.sideMats = PALETTE.soil.map((ramp, i) => psx({ map: rampTexture(13 + i, ramp.map((c) => shade(c, 0.5)), { size: 16, repeat: [1 / 24, 1 / 24] }) }));
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
    this.panels = new THREE.Group();
    this.scene.add(this.panels);
    this.panelSig = '';
    this.motion = new MotionTracker();
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

  // What the soil mesh depends on: the dug cells, plus how far each dig order
  // has been chipped (in quarters), so tunnels visibly grow as builders work.
  _soilSignature(s) {
    let sig = String(s.nest.ver);
    for (const o of s.nest.digOrders) sig += ';' + o.x + ',' + o.y + ',' + Math.floor(Math.min(0.999, o.progress / o.need) * 4);
    return sig;
  }

  // Rounded tunnels: a smooth distance field around the dug cells (and the
  // part-dug bricks) is traced into outlines, one per soil band, and
  // extruded back to the nest wall. The grid underneath is unchanged.
  _rebuildSoil(s) {
    this.soil.children.forEach((m) => m.geometry.dispose());
    this.soil.clear();
    const W = NW * T, H = NH * T;
    // Sample the soil field once on the tracing grid; every band reads it.
    const x0 = -4, y0 = -4, nx = Math.ceil((W + 8) / SOIL_STEP) + 1, ny = Math.ceil((H + 8) / SOIL_STEP) + 1;
    const grid = tunnelGrid(s, x0, y0, SOIL_STEP, nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * SOIL_STEP, y = y0 + j * SOIL_STEP, k = j * nx + i;
      grid[k] = Math.max(-x, x - W, -y, y - H, -grid[k]);
    }
    const soil = (x, y) => grid[Math.round((y - y0) / SOIL_STEP) * nx + Math.round((x - x0) / SOIL_STEP)];
    const bands = [[-1e9, 14 * T], [14 * T, 28 * T], [28 * T, 1e9]];
    bands.forEach(([top, bot], tier) => {
      const f = (x, y) => Math.max(soil(x, y), top - y, y - bot);
      // Trace only this band's rows (snapped to the shared grid).
      const by0 = Math.max(y0, y0 + Math.floor((top - 6 - y0) / SOIL_STEP) * SOIL_STEP);
      const by1 = Math.min(y0 + (ny - 1) * SOIL_STEP, y0 + Math.ceil((bot + 6 - y0) / SOIL_STEP) * SOIL_STEP);
      const shapes = shapesFromField(f, [x0, by0, x0 + (nx - 1) * SOIL_STEP, by1], SOIL_STEP, 0.35, (x, y) => [x, -y]);
      if (!shapes.length) return;
      const g = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: false, steps: 1, curveSegments: 1 });
      g.translate(0, 0, -DEPTH);
      this.soil.add(new THREE.Mesh(g, [this.soilMats[tier], this.sideMats[tier]]));
    });
  }

  setState(s) {
    this.state = s;
    this.ver = -1;
    this.camInit = false;
  }

  // Ants inside: walking in profile, or climbing the back wall in a shaft.
  _pushAnt(a, color, scaleMul, frameT, t) {
    const C = CASTES[a.caste];
    const k = (C.r / 2.2) * (scaleMul || 1) * ANT_SCALE.nest;
    const plan = planFor(a.caste);
    const moving = this.motion.moving(a.id, a.nx, a.ny, t);
    const idle = moving ? null : idlePose(a, t);
    const frame = idle ? idle.frame : (frameT + a.id) % WALK_FRAMES;
    const breathe = idle ? idle.breathe : 0;
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
    // Breathing: the body swells a little, mostly upward.
    this.crowd.pushAtScale(plan + frame, antGeometry(plan, frame), tmpV, tmpQ, k * (1 + 0.012 * breathe), k * (1 + 0.04 * breathe), k * (1 + 0.025 * breathe), color);
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

  // Place a prop: world position, per-axis scale, colour, optional Euler rotation.
  _put(geo, p, sc, color, rot) {
    tmpV.set(p[0], p[1], p[2]);
    if (rot) tmpQ.setFromEuler(tmpE.set(rot[0], rot[1], rot[2])); else tmpQ.identity();
    tmpM.compose(tmpV, tmpQ, tmpS.set(sc[0], sc[1], sc[2]));
    this.props.push(PROP_KEY.get(geo), geo, tmpM, color);
  }

  // Painted back wall per room, rebuilt when rooms change.
  _rebuildPanels(rooms) {
    const sig = rooms.map((r) => [r.key, r.x0, r.y0, r.w, r.h].join(',')).join(';');
    if (sig === this.panelSig) return;
    this.panelSig = sig;
    this.panels.children.forEach((m) => m.geometry.dispose());
    this.panels.clear();
    for (const r of rooms) {
      const rw = r.w || 4, rh = r.h || 3;
      const g = new THREE.PlaneGeometry(rw * T, rh * T);
      // Two wall tiles per cell keeps the texel size steady across room sizes.
      g.attributes.uv.array.forEach((v, i, arr) => { arr[i] = v * (i % 2 ? rh : rw) * 0.5; });
      const m = new THREE.Mesh(g, roomWallMaterial(r.key));
      m.position.set((r.x0 + rw / 2) * T, -(r.y0 + rh / 2) * T, -DEPTH + 0.3);
      this.panels.add(m);
    }
  }

  update(app, t, aspect) {
    const s = app.s;
    if (s !== this.state) this.setState(s);
    const sig = this._soilSignature(s);
    if (sig !== this.ver) { this.ver = sig; this._rebuildSoil(s); }
    const n = s.nest, q = s.queen, col = s.colony, P = s.player;
    const frameT = Math.floor(t * RENDER.animFps);
    this.labels = [];

    this.crowd.begin();
    this.props.begin();
    this.overlay.begin();

    // Room back panels, dressing and lamps.
    this.roomLights.forEach((l) => (l.intensity = 0));
    this._rebuildPanels(n.rooms);
    const put = (geo, p, sc, color, rot) => this._put(geo, p, sc, color, rot);
    n.rooms.forEach((r, i) => {
      const rw = r.w || 4, rh = r.h || 3;
      dressRoom(r, { T, DEPTH, t, col, put });
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
        if (adj) this._fill(x * T + T / 2 - 0.8, y * T + T / 2 - 0.8, 1.6, 1.6, '#c8a87c', 0.4);
      }
    }
    // Dig orders: the tunnel itself grows into the cell (see tunnelBoxes).
    for (const o of n.digOrders) this._outline(o.x * T + 2, o.y * T + 2, T - 4, T - 4, '#ffdc78');
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
        const pulse = 1 + 0.04 * Math.sin(t * 3 + i);
        this._put(PROPS.egg, [ex, -ey + 2.4, -DEPTH * 0.35], [3.6 * pulse, 3.2 * pulse, 3 * pulse], '#f3ead6');
        this._fill(ex - 3.5, ey + 1, 7 * Math.min(1, e.t / e.need), 1.4, '#8fd36b', 0.7);
      });
    }
    // Ants inside, then the player.
    for (const a of s.ants) {
      if (a.team || a.isPlayer || !(a.state === 'in' || a.state === 'build')) continue;
      this._pushAnt(a, antColor(a), 1, frameT, t);
    }
    const pa = P.ant;
    if (pa && P.inNest) {
      this._pushAnt(pa, COLORS.player, 1.2, frameT, t);
      if (P.ntx != null) this._outline(P.ntx * T + 2, P.nty * T + 2, T - 4, T - 4, '#ffffff', 0.7);
    }
    // Queen: grows with each upgrade; during the dig she shows where she can go.
    const qs = ANT_SCALE.queen + q.level * ANT_SCALE.queenPerLevel;
    const floorY = q.room ? -(q.room.y0 + (q.room.h || 3)) * T : -(q.y + 1) * T;
    this.queenMesh.position.set((q.x + 0.5) * T, floorY + FOOT * qs, -DEPTH * 0.5);
    const qb = Math.sin(t * 1.6);
    this.queenMesh.scale.set(qs * (1 + 0.01 * qb), qs * (1 + 0.035 * qb), qs * (1 + 0.02 * qb));
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
    this.motion.sweep();

    this.labels.push({ text: 'exit', x: (SHAFT + 0.5) * T, y: 12, z: 0, kind: 'hint' });
    this.labels.push({ text: 'packed soil · needs Workshop', x: 4, y: -14 * T - 2, z: 0, kind: 'band' });
    this.labels.push({ text: 'clay · needs Workshop + queen upgrade', x: 4, y: -28 * T - 2, z: 0, kind: 'band' });

    // Weather.
    this.scene.background.set(s.rain.on ? '#6f7f8f' : '#9bc7e6');
    this.hemi.intensity = s.rain.on ? 0.8 : 1.1;

    // Camera: follow the player or the queen; drag pans vertically.
    const a = pa && P.inNest ? pa : null;
    // app.focus ({ x, y } in cells) points the camera somewhere specific.
    const fy = (app.focus ? app.focus.y : a ? a.ny : q.y + 0.5) * T + app.panY;
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
    const fx = (app.focus ? app.focus.x : a ? a.nx : q.x + 0.5) * T;
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
