// PAPERCRAFT — a shadow-box diorama of layered construction paper.
// Soil is a stack of hand-cut sheets; ants and the spider are card cut-outs
// with a white sticker border, pinned so they rock and scissor their legs.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    sky: '#5DB2EA', cloud: '#FBF8F1', sun: '#FFC93C', grass: ['#79B552', '#629E43', '#4E8636'],
    soil: ['#D49352', '#B06F3E', '#8C5130'], back: '#7A4E32', floor: '#C79A6A',
    card: '#4A2A1E', major: '#3A2016', queen: '#9A4E3A', queenStripe: '#C77B5C', far: '#2E1A12',
    paper: '#F4EFE6', food: '#F0A040', egg: '#FBF8F1', spider: '#3D2B57', spiderFar: '#2A1D3E', ink: '#1B1410',
  };

  const meta = {
    label: 'Papercraft',
    tagline: 'A shadow-box of layered construction paper: hand-cut soil sheets, card cut-out ants with sticker borders, paper grass and a cardboard sky.',
    refs: 'Tearaway, Paper Mario: The Origami King, Yoshi’s Crafted World, Lumino City, LittleBigPlanet, Paper Beast',
    matrix: ['Tearaway, Paper Mario', 'Medium', 'High', 'High', 'High'],
    palette: [
      ['Card sky', P.sky], ['Paper grass', P.grass[0]], ['Topsoil sheet', P.soil[0]], ['Packed sheet', P.soil[1]], ['Clay sheet', P.soil[2]],
      ['Backing', P.back], ['Ant card', P.card], ['Queen card', P.queen], ['Sticker border', P.paper], ['Orange card', P.food], ['Spider card', P.spider],
    ],
    rendering: 'Each soil band is four parallel paper sheets with slightly different hand-cut holes, so tunnels show stepped paper edges; one warm key casts soft shadows sheet-on-sheet. Creatures are extruded card silhouettes traced from signed-distance shapes, with a white sticker border and a fibre texture on everything.',
    motion: '12 fps puppet motion: legs are separate card strips that scissor on a pin, bodies rock ±2.5°, carriers bob, the spider jerks a foreleg every two seconds.',
    fit: 'Turns the cross-section into a handmade box you peer into, which is exactly what an ant farm is. The sticker border keeps every caste readable at 0.6×.',
    risks: 'Can read twee or childish; silhouettes in profile lose the 3/4 depth when the camera swings far. Props must stay sparse so the material does the work.',
    production: 'Medium: 2D silhouettes become geometry automatically, so new castes are cheap. Layered sheets are just extruded outlines.',
  };

  // ---------------------------------------------------------------- SDF bits
  const ell = (px, py, cx, cy, rx, ry) => {
    const dx = (px - cx) / rx, dy = (py - cy) / ry;
    return (Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(rx, ry);
  };
  const seg = (px, py, ax, ay, bx, by, r) => {
    const vx = bx - ax, vy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(px - ax - vx * t, py - ay - vy * t) - r;
  };
  const poly = (px, py, pts, r) => {
    let d = Infinity;
    for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, seg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r));
    return d;
  };

  function loopsToShapes(loops) {
    const area = (p) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
    const inside = (pt, pl) => {
      let c = false;
      for (let i = 0, j = pl.length - 1; i < pl.length; j = i++) {
        const [xi, yi] = pl[i], [xj, yj] = pl[j];
        if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    loops = loops.filter((l) => Math.abs(area(l)) > 0.05).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
    const depth = loops.map((l, i) => loops.slice(0, i).filter((m) => inside(l[0], m)).length);
    const shapes = [];
    loops.forEach((l, i) => {
      if (depth[i] % 2) return;
      const s = new T.Shape(l.map(([x, y]) => new T.Vector2(x, y)));
      loops.forEach((h, k) => { if (depth[k] === depth[i] + 1 && inside(h[0], l)) s.holes.push(new T.Path(h.map(([x, y]) => new T.Vector2(x, y)))); });
      shapes.push(s);
    });
    return shapes;
  }

  // A card cut-out: the silhouette extruded thin, with a white sticker
  // border behind it.
  function cutout(f, bb, mats, o) {
    o = o || {};
    const step = o.step || 0.25;
    const g = new T.Group();
    const shapes = loopsToShapes(U3.contours(f, bb[0], bb[1], bb[2], bb[3], step).map((l) => U3.simplify(l, step * 0.3)));
    const th = o.thick || 0.7;
    if (!o.border) {
      const geo = new T.ExtrudeGeometry(shapes, { depth: th, bevelEnabled: false, curveSegments: 2 });
      geo.translate(0, 0, -th / 2);
      g.add(new T.Mesh(geo, [mats.face, mats.edge]));
      return g;
    }
    // Sticker sandwich: face, white border sheet, face again on the back.
    const geo = new T.ExtrudeGeometry(shapes, { depth: 0.3, bevelEnabled: false, curveSegments: 2 });
    const front = new T.Mesh(geo, [mats.face, mats.edge]);
    front.position.z = th / 2;
    const back = new T.Mesh(geo, [mats.face, mats.edge]);
    back.position.z = -th / 2 - 0.3;
    const bshapes = loopsToShapes(U3.contours((x, y) => f(x, y) - o.border, bb[0] - 2, bb[1] - 2, bb[2] + 2, bb[3] + 2, step).map((l) => U3.simplify(l, step * 0.3)));
    const bgeo = new T.ExtrudeGeometry(bshapes, { depth: th, bevelEnabled: false, curveSegments: 2 });
    bgeo.translate(0, 0, -th / 2);
    g.add(front, back, new T.Mesh(bgeo, [mats.border, mats.edge]));
    return g;
  }

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    const r = U3.rng(41);
    const n = U3.noise(55);

    // Paper fibre texture, near-white so material colour tints it.
    const fibre = U3.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#F2EFEA';
      g.fillRect(0, 0, w, h);
      const img = g.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) { const v = (r() - 0.5) * 14; img.data[i] += v; img.data[i + 1] += v; img.data[i + 2] += v; }
      g.putImageData(img, 0, 0);
      for (let i = 0; i < 900; i++) {
        g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(120,100,80,0.18)';
        g.lineWidth = 0.6 + r() * 0.6;
        const x = r() * w, y = r() * h, a = r() * 6.3, l = 3 + r() * 10;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    });
    const tex = (rep) => { const t = fibre.clone(); t.needsUpdate = true; t.repeat.set(rep, rep); return t; };
    const paperTex = tex(1 / 90);
    const smallTex = tex(1 / 14);
    const paper = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, map: paperTex, roughness: 0.95, metalness: 0 }, o || {}));
    const card = (c) => new T.MeshStandardMaterial({ color: c, map: smallTex, roughness: 0.9 });
    const edge = new T.MeshStandardMaterial({ color: '#E9E1D2', roughness: 1 });

    root.background = new T.Color(P.sky);
    const sky = new T.Mesh(new T.PlaneGeometry(7000, 4000), new T.MeshBasicMaterial({ color: P.sky, map: paperTex }));
    sky.position.set(0, 100, -420);
    root.add(sky);

    // ---------------------------------------------------------------- soil sheets
    const DEPTH = 64, SHEETS = 4, GAP = 15, THICK = 1.6;
    const cavs = U3.cavities(scene, { tunnelR: 11, roomR: 20 });
    const soil = U3.soilSDF(scene, cavs);
    for (let k = 0; k < SHEETS; k++) {
      // Each sheet is cut by hand: its own wobble on cavity and band edges.
      const off = k * 17.3;
      const warp = (x, y) => n(x * 0.06 + off, y * 0.06, k) * 1.8 + (k ? -0.6 * k : 0);
      const bands = U3.bandShapes(scene, cavs, { step: 2.5, simplify: 0.7, warp, edge: (x, i) => n(x * 0.035 + off, i * 3, 2) * 5 + Math.sin(x * 0.02 + i) * 3 });
      bands.forEach((b) => {
        const shade = 1 - k * 0.07;
        const c = new T.Color(P.soil[b.index]).multiplyScalar(shade);
        const geo = U3.extrude(b.shapes, THICK, { front: -k * GAP });
        const m = new T.Mesh(geo, [paper(c), edge]);
        root.add(m);
      });
    }
    const backing = new T.Mesh(new T.BoxGeometry(U3.W + 10, U3.H - scene.groundY + 10, 2), paper(P.back));
    backing.position.set(0, U3.Y((U3.H + scene.groundY) / 2) - 5, -DEPTH - 1);
    root.add(backing);

    // Paper floor strips under every cavity floor so creatures have
    // somewhere to stand between the sheets.
    const floorMat = paper(P.floor);
    let run = null;
    const runs = [];
    for (let x = 0; x <= 720; x += 2) {
      const floors = [];
      for (let y = scene.groundY + 1; y < U3.H; y += 1) if (soil(x, y - 1) > 0 && soil(x, y) <= 0) floors.push(y);
      floors.forEach((fy) => {
        const hit = runs.find((q) => q.open && Math.abs(q.y - fy) < 2.5 && q.x1 === x - 2);
        if (hit) { hit.x1 = x; hit.y = Math.max(hit.y, fy); } else runs.push({ x0: x, x1: x, y: fy, open: true });
      });
      runs.forEach((q) => { if (q.x1 < x) q.open = false; });
    }
    runs.filter((q) => q.x1 - q.x0 >= 6).forEach((q) => {
      const m = new T.Mesh(new T.BoxGeometry(q.x1 - q.x0 + 6, 1, DEPTH), floorMat);
      m.position.set(U3.X((q.x0 + q.x1) / 2), U3.Y(q.y) - 0.5, -DEPTH / 2);
      root.add(m);
    });
    void run;

    // ---------------------------------------------------------------- surface
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    [-1.5, -DEPTH * 0.45, -DEPTH + 6].forEach((z, row) => {
      [[0, shaft.x - 1], [shaft.x + shaft.w + 1, 720]].forEach(([a, b]) => {
        const s = new T.Shape();
        s.moveTo(U3.X(a), 0);
        for (let x = a; x < b; x += 6) {
          const h = 8 + row * 2 + r() * 8;
          s.lineTo(U3.X(Math.min(b, x + 3)), h);
          s.lineTo(U3.X(Math.min(b, x + 6)), 2 + r() * 2);
        }
        s.lineTo(U3.X(b), 0);
        s.lineTo(U3.X(a), 0);
        const geo = new T.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false });
        const m = new T.Mesh(geo, [paper(P.grass[row]), edge]);
        m.position.set(0, U3.Y(scene.groundY) - 1, z);
        root.add(m);
      });
    });
    // A grass top sheet so the surface reads as a lawn.
    const lawn = new T.Mesh(new T.BoxGeometry(U3.W, 1, DEPTH), paper(P.grass[1]));
    lawn.position.set(0, U3.Y(scene.groundY) + 0.5, -DEPTH / 2);
    root.add(lawn);

    // Clouds and sun as sticker cut-outs on the sky card.
    const flat = (c) => ({ face: card(c), edge, border: card(P.paper) });
    const cloudF = (x, y) => Math.min(ell(x, y, 0, 0, 22, 14), ell(x, y, -20, -5, 15, 10), ell(x, y, 21, -4, 16, 11), ell(x, y, 6, 9, 13, 10));
    [[-250, 215, -380, 1.6], [70, 240, -390, 1.2], [210, 190, -300, 0.9]].forEach(([x, y, z, s]) => {
      const c = cutout(cloudF, [-40, -20, 40, 22], flat(P.cloud), { step: 1, thick: 2, border: 0 });
      c.position.set(x, y, z);
      c.scale.setScalar(s);
      root.add(c);
    });
    const sunF = (x, y) => {
      const a = Math.atan2(y, x), rr = Math.hypot(x, y);
      return Math.min(rr - 14, rr - 18 - 4 * Math.max(0, Math.cos(a * 12)) * 1.2);
    };
    const sunCut = cutout(sunF, [-26, -26, 26, 26], flat(P.sun), { step: 0.8, thick: 2, border: 2 });
    sunCut.position.set(-40, 245, -360);
    sunCut.scale.setScalar(1.6);
    root.add(sunCut);

    // Paper pebbles and a root glued to the front sheet.
    const stoneCard = { face: card('#A9A39A'), edge, border: card(P.paper) };
    const stoneCard2 = { face: card('#8E877D'), edge, border: card(P.paper) };
    for (let i = 0, placed = 0; i < 80 && placed < 16; i++) {
      const x = 20 + r() * 680, y = 100 + r() * 360;
      if (soil(x, y) > -14) continue;
      const rx = 3 + r() * 6, ry = rx * (0.55 + r() * 0.3), rot = r() * 3;
      const f = (px, py) => { const c = Math.cos(rot), sn = Math.sin(rot); return ell(px * c + py * sn, -px * sn + py * c, 0, 0, rx, ry); };
      const m = cutout(f, [-rx - 3, -rx - 3, rx + 3, rx + 3], placed % 2 ? stoneCard : stoneCard2, { step: 0.5, border: 0.7, thick: 0.6 });
      m.position.set(U3.X(x), U3.Y(y), 1.4);
      root.add(m);
      placed++;
    }
    const rootPts = Array.from({ length: 16 }, (_, i) => [Math.sin(i * 0.55) * 5 + i * 0.3, -i * 4]);
    const rootCut = cutout((x, y) => poly(x, y, rootPts, 1.4 - Math.min(0.9, -y / 70)), [-8, -66, 16, 4], { face: card('#E7C08A'), edge, border: card(P.paper) }, { step: 0.5, border: 0.5, thick: 0.5 });
    rootCut.position.set(U3.X(560), U3.Y(scene.groundY) - 1, 1.4);
    root.add(rootCut);
    const rootCut2 = rootCut.clone();
    rootCut2.position.set(U3.X(90), U3.Y(scene.groundY) - 1, 1.4);
    rootCut2.scale.set(-1, 0.8, 1);
    root.add(rootCut2);

    const lay = U3.layout(scene, soil, DEPTH);

    // ---------------------------------------------------------------- props
    const crumpled = (rad, mat, seed) => {
      const g = new T.IcosahedronGeometry(rad, 1);
      const p = g.attributes.position, rr = U3.rng(seed);
      const map = new Map();
      for (let i = 0; i < p.count; i++) {
        const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
        if (!map.has(key)) map.set(key, 0.82 + rr() * 0.3);
        const k = map.get(key);
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      const m = new T.Mesh(g, mat);
      return m;
    };
    const eggMat = new T.MeshStandardMaterial({ color: P.egg, map: smallTex, roughness: 0.95, flatShading: true });
    const eggs = lay.eggs.map((e, i) => {
      const m = crumpled(1, eggMat, i + 3);
      m.position.set(U3.X(e.x), U3.Y(e.y) + 4.2 + e.row * 7, e.z);
      m.scale.set(3.6, 4.6, 3.6);
      root.add(m);
      return m;
    });
    const foodMat = new T.MeshStandardMaterial({ color: P.food, map: smallTex, roughness: 0.9, flatShading: true });
    lay.piles.forEach((p, i) => {
      [[-5, 0, 2], [5, 0, -2], [0, 0, -7], [0, 8, -2]].forEach(([dx, dy, dz], k) => {
        const m = new T.Mesh(new T.ConeGeometry(5, 9, 4), foodMat);
        m.position.set(U3.X(p.x) + dx, U3.Y(p.y) + 4.5 + dy, p.z + dz);
        m.rotation.y = (i + k) * 0.7;
        root.add(m);
      });
    });
    const crumb = crumpled(5, foodMat, 99);
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 5, lay.crumb.z);
    root.add(crumb);

    // Index-card labels taped above each room.
    scene.rooms.forEach((rm, i) => {
      const t = U3.canvasTexture(256, 72, (g, w, h) => {
        g.fillStyle = '#FFFDF6';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(80,140,210,0.45)';
        g.lineWidth = 2;
        for (let y = 26; y < h; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.strokeStyle = 'rgba(220,80,80,0.5)';
        g.beginPath(); g.moveTo(22, 0); g.lineTo(22, h); g.stroke();
        g.fillStyle = '#2B2A6B';
        let fs = 34;
        g.font = '600 ' + fs + 'px "Patrick Hand", "Comic Sans MS", "Segoe Print", cursive';
        while (g.measureText(rm.label).width > w - 44 && fs > 18) { fs -= 2; g.font = '600 ' + fs + 'px "Patrick Hand", "Comic Sans MS", "Segoe Print", cursive'; }
        g.textBaseline = 'middle';
        g.fillText(rm.label, 32, h / 2 + 4);
      });
      const cardM = new T.Mesh(new T.BoxGeometry(72, 20, 0.5), [edge, edge, edge, edge, new T.MeshStandardMaterial({ map: t, roughness: 0.9 }), edge]);
      cardM.position.set(U3.X(rm.x + 46), U3.Y(rm.y - 12), 1.6);
      cardM.rotation.z = (i % 2 ? 1 : -1) * 0.05;
      root.add(cardM);
      const tape = new T.Mesh(new T.PlaneGeometry(14, 6), new T.MeshStandardMaterial({ color: '#F3E9C6', transparent: true, opacity: 0.75, roughness: 0.6 }));
      tape.position.set(U3.X(rm.x + 46), U3.Y(rm.y - 20), 1.95);
      tape.rotation.z = 0.12;
      root.add(tape);
    });

    // ---------------------------------------------------------------- ants
    const cutCache = new Map();
    function antParts(caste, carrying) {
      const key = caste + carrying;
      if (cutCache.has(key)) return cutCache.get(key);
      const s = U3.antSpec(caste);
      const ab = s.abdomen, th = s.thorax, hd = s.head, pt = s.petiole;
      const body = (x, y) => {
        let d = Math.min(ell(x, y, ab.x, ab.y, ab.rx, ab.ry), ell(x, y, pt.x, pt.y, pt.r, pt.r * 1.3), ell(x, y, th.x, th.y, th.rx, th.ry), ell(x, y, hd.x, hd.y, hd.rx, hd.ry));
        const ax = hd.x + hd.rx * 0.45, ay = hd.y + hd.ry * 0.7;
        d = Math.min(d, poly(x, y, [[ax, ay], [ax + 1.2, ay + 4.2], [ax + 6, ay + 2.4]], 0.42));
        const mb = caste === 'major' ? 1.6 : 1;
        d = Math.min(d, poly(x, y, [[hd.x + hd.rx * 0.7, hd.y - hd.ry * 0.4], [hd.x + hd.rx + 1.8 * mb, hd.y - hd.ry * 0.55], [hd.x + hd.rx + 1.2 * mb, hd.y - hd.ry * 0.9 - 0.6 * mb]], 0.45 * mb));
        if (carrying) d = Math.min(d, ell(x, y, s.carry.x, s.carry.y, s.carry.r, s.carry.r * 0.85));
        return d;
      };
      const face = card(caste === 'queen' ? P.queen : caste === 'major' ? P.major : P.card);
      const out = {
        spec: s,
        body: cutout(body, [-18, -8, 17, 12], { face, edge, border: card(P.paper) }, { border: 0.7 }),
        legs: [],
      };
      if (carrying) {
        const food = new T.Mesh(new T.CircleGeometry(s.carry.r * 0.9, 16), card(P.food));
        food.position.set(s.carry.x, s.carry.y, 0.7);
        out.body.add(food);
        const food2 = food.clone();
        food2.position.z = -0.7;
        food2.rotation.y = Math.PI;
        out.body.add(food2);
      }
      for (let i = 0; i < 3; i++) {
        const hx = s.hips[i], hy = s.hipY;
        const reach = s.reach[i];
        const pts = [[0, 0], [reach * 0.42, 3.0], [reach * 0.9, -s.footY + 1.3 - hy], [reach * 1.05 + (i === 2 ? -1 : 1), -s.footY - hy]];
        const f = (x, y) => poly(x, y, pts, 0.55);
        out.legs.push({ hx, hy, geo: cutout(f, [-12, -9, 12, 6], { face, edge, border: card(P.paper) }, { border: 0.45, step: 0.25 }) });
      }
      // Eyes and wing scars as paper dots.
      const eye = new T.Mesh(new T.CircleGeometry(1.1, 14), card(P.paper));
      eye.position.set(hd.x + hd.rx * 0.35, hd.y + hd.ry * 0.25, 0.7);
      const pupil = new T.Mesh(new T.CircleGeometry(0.55, 10), card(P.ink));
      pupil.position.set(0.35, -0.05, 0.02);
      eye.add(pupil);
      out.body.add(eye);
      const eyeB = eye.clone();
      eyeB.position.z = -0.7;
      eyeB.rotation.y = Math.PI;
      out.body.add(eyeB);
      if (caste === 'queen') {
        for (let k = 0; k < 3; k++) {
          const stripe = new T.Mesh(new T.PlaneGeometry(1.4, ab.ry * 1.5 - k * 0.8), card(P.queenStripe));
          stripe.position.set(ab.x + (k - 1) * 3.4, ab.y, 0.68);
          stripe.rotation.z = 0.12;
          out.body.add(stripe);
        }
        [[-0.8, 0.5], [0.8, 0.25]].forEach(([dx, rot]) => {
          const scar = new T.Mesh(new T.PlaneGeometry(1.2, 2.2), card(P.paper));
          scar.position.set(th.x + dx, th.y + th.ry + 0.6, 0.7);
          scar.rotation.z = rot;
          out.body.add(scar);
        });
      }
      cutCache.set(key, out);
      return out;
    }

    const pinMat = new T.MeshStandardMaterial({ color: '#C9A54A', metalness: 0.8, roughness: 0.35 });
    const ants = lay.ants.map((a) => {
      const parts = antParts(a.caste, a.carrying);
      const s = parts.spec;
      const rootG = new T.Group();
      const sway = new T.Group();
      rootG.add(sway);
      const scaled = new T.Group();
      scaled.scale.setScalar(s.scale);
      sway.add(scaled);
      scaled.add(parts.body.clone());
      const legs = [];
      for (let side = 0; side < 2; side++) {
        parts.legs.forEach((L, i) => {
          const pivot = new T.Group();
          pivot.position.set(L.hx - side * 0.6, L.hy, side ? -1.4 : 1.4);
          const m = L.geo.clone();
          if (side) m.traverse((o) => { if (o.isMesh && Array.isArray(o.material)) o.material = [card(P.far), edge]; });
          pivot.add(m);
          pivot.userData = { group: (i + side) % 2 };
          scaled.add(pivot);
          legs.push(pivot);
        });
      }
      const pin = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 4.2, 10), pinMat);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(s.thorax.x, s.thorax.y, 0);
      scaled.add(pin);
      const lift = s.footY * s.scale;
      if (a.wall) {
        rootG.position.set(U3.X(a.x), U3.Y(a.y), -DEPTH + 4);
        rootG.rotation.z = a.heading === 270 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        const z = a.caste === 'major' || a.caste === 'queen' ? -DEPTH * 0.6 : -DEPTH * 0.4;
        rootG.position.set(U3.X(a.x), U3.Y(a.floor) + lift, z);
        if (a.heading === 180) rootG.rotation.y = Math.PI;
      }
      root.add(rootG);
      return { a, rootG, sway, legs, home: rootG.position.clone(), seed: U3.hash(a.key) % 2 };
    });

    // ---------------------------------------------------------------- spider
    const spBody = (x, y) => Math.min(ell(x, y, -14, 4, 13, 10.5), ell(x, y, 2, 0, 8, 6));
    const spMats = { face: card(P.spider), edge, border: card(P.paper) };
    const spider = new T.Group();
    spider.add(cutout(spBody, [-30, -10, 12, 18], spMats, { step: 0.4, border: 0.9, thick: 1 }));
    const spLegs = [];
    const fwd = [20, 9, -6, -18];
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 4; i++) {
        const hx = 4 - i * 2.6, reach = fwd[i] - hx + (side ? -3 : 3);
        const pts = [[0, 0], [reach * 0.35, 15], [reach * 0.8, -6], [reach, -25]];
        const leg = cutout((x, y) => poly(x, y, pts, 0.9), [-30, -28, 30, 18], side ? { face: card(P.spiderFar), edge, border: card(P.paper) } : spMats, { step: 0.4, border: 0.6 });
        const pivot = new T.Group();
        pivot.position.set(hx, -1, side ? -1.6 : 1.6);
        pivot.add(leg);
        pivot.userData = { index: i };
        spider.add(pivot);
        spLegs.push(pivot);
      }
    }
    [[8.6, 2.6, 1.5], [6.6, 3.6, 1.0], [9.4, 0.6, 0.8]].forEach(([x, y, rr]) => {
      const e = new T.Mesh(new T.CircleGeometry(rr, 14), card('#FFE36B'));
      e.position.set(x, y, 0.9);
      spider.add(e);
    });
    spider.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + 26, lay.spider.z);
    spider.rotation.y = Math.PI;
    root.add(spider);

    U3.enableShadows(root);
    sky.castShadow = false;
    sky.receiveShadow = false;
    scene.rooms.forEach((rm) => {
      const l = new T.PointLight('#FFD7A0', 1.1, 120, 1.5);
      l.position.set(U3.X(rm.x + rm.w / 2), U3.Y(rm.y + 26), -DEPTH * 0.5);
      root.add(l);
    });
    root.add(new T.HemisphereLight('#FFFFFF', '#8A6A50', 0.7));
    const key = new T.DirectionalLight('#FFF0D8', 1.35);
    key.position.set(-220, 360, 480);
    U3.shadowLight(key, 2048, 440);
    key.shadow.normalBias = 0.3;
    root.add(key);

    const rig = U3.makeCamera({ fov: 26, pitch: 0.1, yaw: 0.12, zoom: 0.98, tz: -30 });

    return {
      fps: 12,
      update(t, orbit) {
        const f = Math.floor(t * 12 + 1e-6);
        ants.forEach((ant) => {
          const pose = (f + ant.seed) % 2;
          if (!ant.a.resting) ant.legs.forEach((p) => { p.rotation.z = (p.userData.group === pose ? 1 : -1) * 0.22; });
          else ant.legs.forEach((p) => { p.rotation.z = 0.35; });
          ant.sway.rotation.z = ant.a.resting ? 0 : (Math.floor(f / 2) % 2 ? 1 : -1) * 0.044;
          const bob = ant.a.carrying ? (pose ? 1 : 0) : 0;
          ant.rootG.position.copy(ant.home);
          ant.rootG.position.y += bob;
        });
        const tw = t % 2 < 0.25;
        spLegs.forEach((p) => { p.rotation.z = p.userData.index === 0 && tw ? 0.4 : 0; });
        const es = f % 12 < 6 ? 1 : 1.04;
        eggs.forEach((m) => m.scale.set(3.6 * es, 4.6 * es, 3.6 * es));
        rig.update(orbit);
      },
      render(renderer) {
        U3.prepare(renderer, { toneMapping: T.ACESFilmicToneMapping, exposure: 1.05 });
        renderer.render(root, rig.camera);
      },
    };
  }

  U3.register('papercraft', { meta, create });
})();
