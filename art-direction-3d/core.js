// UNDERFOOT 3D — helpers shared by every style.
//
// The 2D scene (scene.js, 720×480 px, y down) becomes a cross-section
// diorama: a slab of soil whose front face sits at z = 0, with the nest
// carved through it to a back wall at z = -depth. World units are scene px.
//   world X = x - 360, world Y = 240 - y.
//
// A style registers with
//   U3.register(id, { meta, create(env) -> instance })
// and the instance provides
//   update(t, orbit)        animate and aim the camera (orbit = drag offsets)
//   render(renderer, size)  draw one frame into the shared renderer
//   resize(w, h)            optional, called when the render size changes
//   fps                     optional, frames per second the style animates at
//   renderScale             optional, fraction of view px to render (pixel styles)
//   pixelated               optional, upscale with nearest-neighbour
(function () {
  const T = window.THREE;
  // Treat every hex colour as sRGB and light in linear space.
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  const U3 = (window.U3 = { styles: {}, order: [] });
  U3.register = function (id, def) {
    def.id = id;
    U3.styles[id] = def;
    U3.order.push(id);
  };
  U3.W = 720;
  U3.H = 480;
  U3.X = (x) => x - 360;
  U3.Y = (y) => 240 - y;
  U3.v3 = (x, y, z) => new T.Vector3(x - 360, 240 - y, z || 0);

  // ---------------------------------------------------------------- random
  U3.rng = function (seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U3.hash = function (s) {
    let h = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  // Smooth 2D/3D value noise in [-1, 1].
  U3.noise = function (seed) {
    const r = U3.rng(seed);
    const p = new Uint8Array(512);
    const base = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    const val = new Float32Array(256).map(() => r() * 2 - 1);
    const f = (t) => t * t * (3 - 2 * t);
    const h3 = (x, y, z) => val[p[p[p[x & 255] + (y & 255)] + (z & 255)]];
    return function (x, y, z) {
      z = z || 0;
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const u = f(x - xi), v = f(y - yi), w = f(z - zi);
      const l = (a, b, t) => a + (b - a) * t;
      return l(
        l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
        l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v),
        w
      );
    };
  };
  U3.fbm = function (n, x, y, z, oct) {
    let s = 0, a = 0.5, fr = 1, norm = 0;
    for (let i = 0; i < (oct || 4); i++) { s += a * n(x * fr, y * fr, z * fr); norm += a; a *= 0.5; fr *= 2; }
    return s / norm;
  };

  // ---------------------------------------------------------------- nest SDF
  // Every excavated shape. The shaft runs past the ground line so it opens.
  U3.cavities = function (scene, o) {
    o = o || {};
    const out = [];
    scene.tunnels.forEach((t) => {
      const c = { kind: 'tunnel', id: t.id, x: t.x, y: t.y, w: t.w, h: t.h, r: o.tunnelR == null ? 11 : o.tunnelR };
      if (t.id === 'shaft') { c.y -= 30; c.h += 30; }
      out.push(c);
    });
    scene.rooms.forEach((r) => out.push({ kind: 'room', id: r.id, label: r.label, x: r.x, y: r.y, w: r.w, h: r.h, r: o.roomR == null ? 16 : o.roomR }));
    return out;
  };
  function sdRoundBox(px, py, c) {
    const r = Math.min(c.r, c.w / 2, c.h / 2);
    const qx = Math.abs(px - (c.x + c.w / 2)) - c.w / 2 + r;
    const qy = Math.abs(py - (c.y + c.h / 2)) - c.h / 2 + r;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
  }
  U3.cavitySDF = function (cavs, warp) {
    return function (x, y) {
      let d = Infinity;
      for (let i = 0; i < cavs.length; i++) d = Math.min(d, sdRoundBox(x, y, cavs[i]));
      return warp ? d + warp(x, y) : d;
    };
  };
  // Negative inside solid soil.
  U3.soilSDF = function (scene, cavs, o) {
    o = o || {};
    const cav = U3.cavitySDF(cavs, o.warp);
    const x0 = o.x0 == null ? 0 : o.x0, x1 = o.x1 == null ? U3.W : o.x1, y1 = o.y1 == null ? U3.H : o.y1;
    const top = o.top || (() => scene.groundY);
    return function (x, y) {
      const box = Math.max(x0 - x, x - x1, top(x) - y, y - y1);
      return Math.max(box, -cav(x, y));
    };
  };

  // Scan down from (x, y) to the first solid soil: the floor under a creature.
  U3.floorY = function (soil, x, y) {
    for (let yy = y; yy < U3.H; yy += 0.5) if (soil(x, yy) < 0) return yy;
    return y;
  };

  // ---------------------------------------------------------------- contours
  // Marching squares over f (negative = inside). Returns closed loops in
  // scene coordinates.
  U3.contours = function (f, x0, y0, x1, y1, step) {
    const nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1;
    const v = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = f(x0 + i * step, y0 + j * step);
    const pts = new Map();
    const edgePt = (key, ax, ay, av, bx, by, bv) => {
      if (!pts.has(key)) { const t = av / (av - bv); pts.set(key, [ax + (bx - ax) * t, ay + (by - ay) * t]); }
      return key;
    };
    const segs = [];
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
        const xa = x0 + i * step, ya = y0 + j * step, xb = xa + step, yb = ya + step;
        const E = [];
        if ((a < 0) !== (b < 0)) E.push(edgePt('h' + i + ',' + j, xa, ya, a, xb, ya, b));
        if ((b < 0) !== (c < 0)) E.push(edgePt('v' + (i + 1) + ',' + j, xb, ya, b, xb, yb, c));
        if ((d < 0) !== (c < 0)) E.push(edgePt('h' + i + ',' + (j + 1), xa, yb, d, xb, yb, c));
        if ((a < 0) !== (d < 0)) E.push(edgePt('v' + i + ',' + j, xa, ya, a, xa, yb, d));
        if (E.length === 2) segs.push([E[0], E[1]]);
        else if (E.length === 4) {
          const mid = (a + b + c + d) / 4;
          if ((a < 0) === (mid < 0)) { segs.push([E[0], E[1]], [E[2], E[3]]); }
          else { segs.push([E[0], E[3]], [E[1], E[2]]); }
        }
      }
    }
    const adj = new Map();
    segs.forEach((s, k) => s.forEach((key) => { if (!adj.has(key)) adj.set(key, []); adj.get(key).push(k); }));
    const used = new Uint8Array(segs.length);
    const loops = [];
    for (let k = 0; k < segs.length; k++) {
      if (used[k]) continue;
      used[k] = 1;
      const start = segs[k][0];
      let cur = segs[k][1];
      const loop = [pts.get(start)];
      let guard = 0;
      while (cur !== start && guard++ < 200000) {
        loop.push(pts.get(cur));
        const next = (adj.get(cur) || []).find((n) => !used[n]);
        if (next == null) break;
        used[next] = 1;
        cur = segs[next][0] === cur ? segs[next][1] : segs[next][0];
      }
      if (loop.length > 2) loops.push(loop);
    }
    return loops;
  };

  U3.simplify = function (pts, tol) {
    if (!tol || pts.length < 8) return pts;
    const rdp = (a, b) => {
      let dmax = 0, idx = -1;
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      const L = Math.hypot(bx - ax, by - ay) || 1;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
        if (d > dmax) { dmax = d; idx = i; }
      }
      if (dmax > tol) return rdp(a, idx).slice(0, -1).concat(rdp(idx, b));
      return [pts[a], pts[b]];
    };
    const mid = Math.floor(pts.length / 2);
    const out = rdp(0, mid).slice(0, -1).concat(rdp(mid, pts.length - 1));
    return out.length >= 3 ? out : pts;
  };

  const area = (p) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
  const inside = (pt, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };

  // Region where f < 0 as THREE.Shapes in world XY (holes resolved).
  U3.shapes = function (f, o) {
    o = o || {};
    const step = o.step || 2;
    let loops = U3.contours(f, -8, 0, U3.W + 8, U3.H + 8, step).map((l) => U3.simplify(l, o.simplify || 0.35));
    loops = loops.filter((l) => Math.abs(area(l)) > step * step * 2);
    loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
    const depth = loops.map((l, i) => loops.slice(0, i).filter((m) => inside(l[0], m)).length);
    const toV = (l) => l.map(([x, y]) => new T.Vector2(x - 360, 240 - y));
    const shapes = [];
    loops.forEach((l, i) => {
      if (depth[i] % 2) return;
      const s = new T.Shape(toV(l));
      loops.forEach((h, k) => {
        if (depth[k] === depth[i] + 1 && inside(h[0], l)) s.holes.push(new T.Path(toV(h)));
      });
      shapes.push(s);
    });
    return shapes;
  };

  // Soil split into its three bands. o.edge(x, bandIndex) can wobble the
  // band boundaries; o.warp(x, y) can wobble the cavity walls.
  U3.bandShapes = function (scene, cavs, o) {
    o = o || {};
    const soil = U3.soilSDF(scene, cavs, o);
    return scene.soil.map((b, i) => {
      const last = i === scene.soil.length - 1;
      const yTop = (x) => (i === 0 ? -1e9 : b.y0 + (o.edge ? o.edge(x, i) : 0));
      const yBot = (x) => (last ? 1e9 : b.y1 + (o.edge ? o.edge(x, i + 1) : 0));
      const f = (x, y) => Math.max(soil(x, y), yTop(x) - y, y - yBot(x));
      return { band: b, index: i, shapes: U3.shapes(f, o) };
    });
  };

  // Extrude shapes so the front face is at z = 0 and the back at z = -depth.
  U3.extrude = function (shapes, depth, o) {
    o = o || {};
    const g = new T.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: !!o.bevel,
      bevelSize: o.bevelSize || 1.5,
      bevelThickness: o.bevelThickness || 1.5,
      bevelSegments: o.bevelSegments || 2,
      curveSegments: 4,
      steps: o.steps || 1,
    });
    g.translate(0, 0, -depth - (o.bevel ? (o.bevelThickness || 1.5) : 0) + (o.front || 0));
    g.computeVertexNormals();
    return g;
  };

  // ---------------------------------------------------------------- textures
  U3.canvasTexture = function (w, h, draw, o) {
    o = o || {};
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    if (o.nearest) { tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.generateMipmaps = false; }
    if (o.srgb !== false) tex.encoding = T.sRGBEncoding;
    if (o.repeat) tex.repeat.set(o.repeat[0], o.repeat[1]);
    return tex;
  };
  // Greyscale fractal noise canvas (tileable enough at low frequency).
  U3.noiseCanvas = function (size, seed, freq, oct, contrast) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const n = U3.noise(seed);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // Blend four offset samples so the tile wraps.
      const u = x / size, v = y / size;
      const s = (xx, yy) => U3.fbm(n, xx * freq, yy * freq, 0.5, oct || 4);
      const val = s(x, y) * (1 - u) * (1 - v) + s(x - size, y) * u * (1 - v) + s(x, y - size) * (1 - u) * v + s(x - size, y - size) * u * v;
      const k = Math.max(0, Math.min(255, 128 + val * 128 * (contrast || 1.6)));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = k;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  };

  // ---------------------------------------------------------------- creatures
  // Ant in local frame: +X forward, +Y up, Z across. Origin at body centre;
  // feet rest at y = -spec.footY * scale.
  U3.antSpec = function (caste) {
    const s = {
      head: { x: 7.8, y: 1.0, rx: 3.4, ry: 3.0, rz: 3.0 },
      thorax: { x: 0.8, y: 0.6, rx: 3.6, ry: 2.2, rz: 2.2 },
      petiole: { x: -3.4, y: 0.6, r: 1.3 },
      abdomen: { x: -9.6, y: 1.6, rx: 6.0, ry: 4.4, rz: 4.6 },
      hips: [2.6, 0.9, -0.8],
      hipY: -1.0,
      hipZ: 1.5,
      footY: 6.6,
      reach: [6.0, 0.6, -6.5],
      spread: [6.0, 7.2, 6.4],
      carry: { x: 13.4, y: 0.0, r: 2.6 },
      scale: 1,
    };
    if (caste === 'major') {
      s.scale = 1.4;
      s.head = { x: 8.6, y: 1.2, rx: 3.9, ry: 3.6, rz: 3.9 };
      s.carry.x = 15;
    } else if (caste === 'queen') {
      s.scale = 2.4;
      s.head = { x: 9.2, y: 0.8, rx: 2.6, ry: 2.4, rz: 2.4 };
      s.thorax = { x: 2.4, y: 0.6, rx: 3.6, ry: 2.8, rz: 2.6 };
      s.petiole = { x: -1.8, y: 0.4, r: 1.0 };
      s.abdomen = { x: -10.4, y: 1.2, rx: 9.0, ry: 5.2, rz: 5.4 };
      s.hips = [4.0, 2.4, 0.9];
      s.footY = 6.2;
      s.reach = [5.0, 0.6, -5.4];
      s.spread = [5.4, 6.4, 6.0];
    }
    return s;
  };

  // Default part builders; styles can override through opts.
  function defEllipsoid(mat, rx, ry, rz, o) {
    const seg = o.segments || 20;
    const g = o.flat ? new T.IcosahedronGeometry(1, o.detail == null ? 1 : o.detail) : new T.SphereGeometry(1, seg, Math.max(8, seg * 0.6));
    const m = new T.Mesh(g, mat);
    m.scale.set(rx, ry, rz);
    return m;
  }
  function defSegment(mat, a, b, r, o) {
    const len = a.distanceTo(b);
    const g = new T.CylinderGeometry(r * 0.85, r, len, o.flat ? 4 : 8, 1);
    g.translate(0, len / 2, 0);
    const m = new T.Mesh(g, mat);
    m.position.copy(a);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  }
  U3.segment = (mat, a, b, r, o) => defSegment(mat, a, b, r, o || {});

  // Build an ant. mats: { body, leg, eye?, scar?, food? }.
  // opts: { flat, detail, segments, legR, ellipsoid(mat,rx,ry,rz), segment(mat,a,b,r) , joints }
  U3.makeAnt = function (caste, mats, opts) {
    opts = opts || {};
    const spec = U3.antSpec(caste);
    const ell = opts.ellipsoid || ((m, rx, ry, rz) => defEllipsoid(m, rx, ry, rz, opts));
    const seg = opts.segment || ((m, a, b, r) => defSegment(m, a, b, r, opts));
    const root = new T.Group();
    const body = new T.Group();
    body.scale.setScalar(spec.scale);
    root.add(body);
    const V = (x, y, z) => new T.Vector3(x, y, z);
    const parts = {};
    const add = (name, e, rx, ry, rz) => {
      const m = ell(mats.body, rx, ry, rz);
      m.position.set(e.x, e.y, 0);
      body.add(m);
      parts[name] = m;
      return m;
    };
    add('abdomen', spec.abdomen, spec.abdomen.rx, spec.abdomen.ry, spec.abdomen.rz);
    parts.abdomen.rotation.z = 0.12;
    add('petiole', spec.petiole, spec.petiole.r, spec.petiole.r * 1.3, spec.petiole.r);
    add('thorax', spec.thorax, spec.thorax.rx, spec.thorax.ry, spec.thorax.rz);
    parts.thorax.rotation.z = -0.12;
    add('head', spec.head, spec.head.rx, spec.head.ry, spec.head.rz);
    const hd = spec.head;
    const lr = (opts.legR || 0.45) * (caste === 'queen' ? 0.8 : 1);

    // Legs: pivot at the hip so a single rotation swings the whole leg.
    const legs = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const pivot = new T.Group();
        const hip = V(spec.hips[i], spec.hipY, side * spec.hipZ);
        pivot.position.copy(hip);
        const reach = spec.reach[i], spread = spec.spread[i];
        const knee = V(reach * 0.42, 3.0, side * spread * 0.55);
        const ankle = V(reach * 0.9, -spec.footY + 1.3 - spec.hipY, side * spread * 0.95);
        const foot = V(reach * 1.05 + (i === 2 ? -1 : 1), -spec.footY - spec.hipY, side * spread);
        pivot.add(seg(mats.leg, V(0, 0, 0), knee, lr));
        pivot.add(seg(mats.leg, knee, ankle, lr * 0.8));
        pivot.add(seg(mats.leg, ankle, foot, lr * 0.6));
        if (opts.joints) {
          const j = ell(mats.leg, lr * 1.2, lr * 1.2, lr * 1.2);
          j.position.copy(knee);
          pivot.add(j);
        }
        pivot.userData = { group: (i + (side > 0 ? 1 : 0)) % 2, index: i, side };
        body.add(pivot);
        legs.push(pivot);
      }
    }

    // Antennae: scape up and forward, funiculus out and down.
    const antennae = [];
    for (let side = -1; side <= 1; side += 2) {
      const pivot = new T.Group();
      pivot.position.set(hd.x + hd.rx * 0.45, hd.y + hd.ry * 0.7, side * hd.rz * 0.45);
      const elbow = V(1.2, 4.2, side * 1.6);
      const tip = V(6.0, 2.4, side * 3.4);
      pivot.add(seg(mats.leg, V(0, 0, 0), elbow, lr * 0.75));
      pivot.add(seg(mats.leg, elbow, tip, lr * 0.6));
      if (opts.antennaTips) {
        const b = ell(mats.leg, lr * 1.3, lr * 1.3, lr * 1.3);
        b.position.copy(tip);
        pivot.add(b);
      }
      body.add(pivot);
      antennae.push(pivot);
    }

    // Mandibles.
    const mand = caste === 'major' ? 1.6 : 1;
    for (let side = -1; side <= 1; side += 2) {
      const a = V(hd.x + hd.rx * 0.8, hd.y - hd.ry * 0.45, side * hd.rz * 0.35);
      const b = V(hd.x + hd.rx + 2.0 * mand, hd.y - hd.ry * 0.7, side * 0.6 * mand);
      body.add(seg(mats.leg, a, b, lr * 0.9 * mand));
    }

    // Compound eyes.
    if (mats.eye) {
      for (let side = -1; side <= 1; side += 2) {
        const e = ell(mats.eye, 1.0, 1.15, 0.7);
        e.position.set(hd.x + hd.rx * 0.25, hd.y + hd.ry * 0.25, side * hd.rz * 0.85);
        body.add(e);
      }
    }

    // Queen: wing scars on the thorax.
    if (caste === 'queen') {
      for (let side = -1; side <= 1; side += 2) {
        const sc = ell(mats.scar || mats.leg, 0.9, 0.35, 0.6);
        sc.position.set(spec.thorax.x - 0.6, spec.thorax.y + spec.thorax.ry * 0.95, side * 1.3);
        sc.rotation.z = 0.4;
        body.add(sc);
      }
    }

    let carried = null;
    if (opts.carrying) {
      carried = ell(mats.food || mats.body, spec.carry.r, spec.carry.r * 0.85, spec.carry.r);
      carried.position.set(spec.carry.x, spec.carry.y, 0);
      body.add(carried);
    }

    return { root, body, legs, antennae, parts, spec, caste, carried, phase: Math.random() * 0 };
  };

  // Walk cycle. phase in radians; resting ants tuck legs and hold.
  U3.poseAnt = function (ant, phase, o) {
    o = o || {};
    ant.legs.forEach((p) => {
      const d = p.userData;
      if (o.resting) {
        p.rotation.set(0, 0, 0);
        p.rotation.y = -d.side * 0.25 * (d.index - 1);
        p.rotation.x = -d.side * 0.15;
        return;
      }
      const ph = phase + (d.group ? Math.PI : 0);
      p.rotation.y = Math.sin(ph) * (o.swing || 0.38) * -d.side;
      p.rotation.x = -d.side * Math.max(0, Math.cos(ph)) * (o.lift || 0.22);
    });
    ant.antennae.forEach((a, i) => {
      a.rotation.z = Math.sin(phase * 0.25 + i * 1.7) * 0.12;
    });
    if (ant.carried && !o.resting) ant.carried.position.y = ant.spec.carry.y;
  };

  // Spider in local frame: +X forward. mats: { body, leg, eye? }.
  U3.makeSpider = function (mats, opts) {
    opts = opts || {};
    const ell = opts.ellipsoid || ((m, rx, ry, rz) => defEllipsoid(m, rx, ry, rz, opts));
    const seg = opts.segment || ((m, a, b, r) => defSegment(m, a, b, r, opts));
    const root = new T.Group();
    const V = (x, y, z) => new T.Vector3(x, y, z);
    const ab = ell(mats.body, 13, 10.5, 11);
    ab.position.set(-14, 4, 0);
    ab.rotation.z = 0.2;
    root.add(ab);
    const ce = ell(mats.body, 8, 6, 7);
    ce.position.set(2, 0, 0);
    root.add(ce);
    const lr = opts.legR || 1.0;
    const legs = [];
    const fwd = [20, 9, -6, -18];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const pivot = new T.Group();
        pivot.position.set(4 - i * 2.6, -1, side * 3);
        const reach = fwd[i] - (4 - i * 2.6);
        const knee = V(reach * 0.35, 15, side * 12);
        const ankle = V(reach * 0.8, -6, side * 24);
        const foot = V(reach * 1.0, -25, side * 28);
        pivot.add(seg(mats.leg, V(0, 0, 0), knee, lr));
        pivot.add(seg(mats.leg, knee, ankle, lr * 0.8));
        pivot.add(seg(mats.leg, ankle, foot, lr * 0.6));
        if (opts.joints) { const j = ell(mats.leg, lr * 1.3, lr * 1.3, lr * 1.3); j.position.copy(knee); pivot.add(j); }
        pivot.userData = { side, index: i };
        root.add(pivot);
        legs.push(pivot);
      }
    }
    if (mats.eye) {
      [[8.6, 2.6, 2.0, 1.3], [8.6, 2.6, -2.0, 1.3], [8.0, 4.4, 3.6, 0.8], [8.0, 4.4, -3.6, 0.8]].forEach(([x, y, z, r]) => {
        const e = ell(mats.eye, r, r, r);
        e.position.set(x, y, z);
        root.add(e);
      });
    }
    for (let side = -1; side <= 1; side += 2) {
      root.add(seg(mats.leg, V(9, -2, side * 2), V(12.5, -5.5, side * 3), lr * 0.9));
    }
    // Feet at y = -26 relative to root.
    return { root, legs, footY: 26 };
  };

  // Front legs lift for a beat every two seconds.
  U3.poseSpider = function (sp, t, o) {
    o = o || {};
    const every = o.every || 2;
    const ph = t % every;
    const tw = o.stepped ? (ph < 0.25 ? 1 : 0) : ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI) : 0;
    sp.legs.forEach((p) => {
      const d = p.userData;
      p.rotation.set(0, 0, 0);
      if (d.index === 0) { p.rotation.z = tw * 0.35; p.rotation.y = -d.side * tw * 0.1; }
      if (d.index === 1) p.rotation.z = tw * 0.08;
    });
  };

  // ---------------------------------------------------------------- layout
  // Where every creature and prop goes in 3D. depth = cavity depth.
  U3.layout = function (scene, soil, depth) {
    const zMid = -depth / 2;
    const out = { ants: [], eggs: [], piles: [], crumb: null, spider: null };
    const floor = (x, y) => U3.floorY(soil, x, y);
    const add = (a, caste, key) => {
      const shaft = scene.tunnels.find((t) => t.id === 'shaft');
      const inShaft = a.x > shaft.x && a.x < shaft.x + shaft.w && (a.heading === 90 || a.heading === 270);
      out.ants.push({
        key, caste, carrying: !!a.carrying, resting: !!a.resting,
        x: a.x, y: a.y, heading: a.heading || 0,
        wall: inShaft,
        floor: inShaft ? null : floor(a.x, a.y),
      });
    };
    scene.surfaceWorkers.forEach((a, i) => add(a, 'worker', 's' + i));
    scene.workers.forEach((a, i) => add(a, 'worker', 'w' + i));
    scene.majors.forEach((a, i) => add(a, 'major', 'm' + i));
    add(scene.queen, 'queen', 'q');
    // Eggs heap on the hatchery floor; brief positions keep their order.
    const r = U3.rng(4);
    scene.eggs.forEach((e, i) => {
      const fy = floor(e.x, e.y);
      out.eggs.push({ x: e.x, y: fy, z: -depth * 0.62 + (r() - 0.5) * depth * 0.4, row: e.y < 190 ? 1 : 0 });
    });
    scene.foodPiles.forEach((p) => out.piles.push({ x: p.x, y: floor(p.x, p.y), z: -depth * 0.62 }));
    out.crumb = { x: scene.crumb.x, y: scene.groundY, z: zMid };
    out.spider = { x: scene.spider.x, y: scene.groundY, z: zMid, facing: scene.spider.facing };
    return out;
  };

  // Put a built ant into the world for a layout entry.
  U3.placeAnt = function (ant, a, depth, o) {
    o = o || {};
    const k = ant.spec.scale;
    const lift = ant.spec.footY * k;
    const q = new T.Quaternion();
    if (a.wall) {
      // Climbing the back wall: belly to the wall, head up or down.
      const qx = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
      const qz = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), a.heading === 270 ? Math.PI / 2 : -Math.PI / 2);
      q.multiplyQuaternions(qz, qx);
      ant.root.position.set(U3.X(a.x), U3.Y(a.y), -depth + lift + (o.wallGap || 0.5));
    } else {
      const h = (a.heading || 0) === 180 ? Math.PI : 0;
      q.setFromAxisAngle(new T.Vector3(0, 1, 0), h);
      const z = a.caste === 'major' || a.caste === 'queen' ? -depth * 0.58 : -depth * (o.laneZ || 0.42);
      ant.root.position.set(U3.X(a.x), U3.Y(a.floor) + lift, z);
    }
    ant.root.quaternion.copy(q);
    ant.home = ant.root.position.clone();
    ant.up = new T.Vector3(0, 1, 0).applyQuaternion(q);
  };

  // Standard animation for every ant: legs at 6 Hz, carry bob 3 Hz.
  U3.animateAnts = function (ants, scene, t, o) {
    o = o || {};
    ants.forEach((ant) => {
      const a = ant.entry;
      const phase = (o.phaseFn ? o.phaseFn(t) : t * scene.motion.legHz * Math.PI * 2) + (U3.hash(a.key) % 7);
      U3.poseAnt(ant, phase, { resting: a.resting, swing: o.swing, lift: o.lift });
      const bob = a.carrying ? Math.sin(t * scene.motion.carryBobHz * Math.PI * 2) * (o.bob || 0.8) : 0;
      ant.root.position.copy(ant.home).addScaledVector(ant.up, bob);
    });
  };

  // ---------------------------------------------------------------- camera
  // Camera on a sphere around the scene centre, framing the 720×480 face.
  U3.makeCamera = function (o) {
    o = o || {};
    const fov = o.fov || 30;
    let cam;
    if (o.ortho) {
      cam = new T.OrthographicCamera(-360, 360, 240, -240, 1, 5000);
    } else {
      cam = new T.PerspectiveCamera(fov, 1.5, 5, 6000);
    }
    const rig = {
      camera: cam,
      yaw: o.yaw || 0,
      pitch: o.pitch == null ? 0.12 : o.pitch,
      zoom: o.zoom || 1,
      target: new T.Vector3(o.tx || 0, o.ty || 0, o.tz == null ? -20 : o.tz),
      update(orbit) {
        const yaw = this.yaw + ((orbit && orbit.yaw) || 0);
        const pitch = Math.max(-0.2, Math.min(0.9, this.pitch + ((orbit && orbit.pitch) || 0)));
        if (o.ortho) {
          const dist = 1500;
          cam.position.set(
            this.target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
            this.target.y + Math.sin(pitch) * dist,
            this.target.z + Math.cos(yaw) * Math.cos(pitch) * dist
          );
          const z = this.zoom;
          cam.left = -360 / z; cam.right = 360 / z; cam.top = 240 / z; cam.bottom = -240 / z;
          cam.updateProjectionMatrix();
        } else {
          const dist = (250 / Math.tan(((fov / 2) * Math.PI) / 180)) / this.zoom;
          cam.position.set(
            this.target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
            this.target.y + Math.sin(pitch) * dist,
            this.target.z + Math.cos(yaw) * Math.cos(pitch) * dist
          );
        }
        cam.lookAt(this.target);
      },
    };
    return rig;
  };

  // Reset shared renderer state before each style draws.
  U3.prepare = function (renderer, o) {
    o = o || {};
    renderer.toneMapping = o.toneMapping == null ? T.NoToneMapping : o.toneMapping;
    renderer.toneMappingExposure = o.exposure || 1;
    renderer.outputEncoding = o.linear ? T.LinearEncoding : T.sRGBEncoding;
    renderer.setClearColor(o.clear == null ? 0x000000 : o.clear, o.clearAlpha == null ? 1 : o.clearAlpha);
    renderer.shadowMap.enabled = true;
  };

  // Inverted-hull outline: a back-face copy pushed out along normals.
  U3.outlineMaterial = function (color, width) {
    const m = new T.MeshBasicMaterial({ color, side: T.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  transformed += normalize(objectNormal) * ' + width.toFixed(3) + ' / length(modelMatrix[0].xyz);'
      );
    };
    return m;
  };
  U3.addOutlines = function (root, mat, filter) {
    const list = [];
    root.traverse((o) => { if (o.isMesh && (!filter || filter(o))) list.push(o); });
    list.forEach((o) => {
      const h = new T.Mesh(o.geometry, mat);
      h.renderOrder = -1;
      o.add(h);
    });
  };

  U3.shadowLight = function (light, size, extent) {
    light.castShadow = true;
    light.shadow.mapSize.set(size || 1024, size || 1024);
    const c = light.shadow.camera;
    const e = extent || 420;
    c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = 10; c.far = 3000;
    light.shadow.bias = -0.0008;
    light.shadow.normalBias = 0.6;
  };
  U3.enableShadows = function (root, cast, receive) {
    root.traverse((o) => { if (o.isMesh) { o.castShadow = cast !== false; o.receiveShadow = receive !== false; } });
  };
})();
