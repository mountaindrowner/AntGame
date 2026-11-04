// CEL-SHADED TOON — three-step toon ramps, inked outlines, a painted sky.
// Wind Waker and Ni no Kuni brightness on a garden-scale adventure.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    skyTop: '#3FA7E8', skyLow: '#BDE9FF', cloud: '#FFFFFF', cloudShade: '#CFE6F7',
    grass: '#5CC43C', grassDark: '#2F9A3A', flower: '#FFD23F', flower2: '#FF7AA8',
    soil: ['#D9823A', '#B85E2E', '#8E3F2C'], back: '#8A4A30', ink: '#1A0F14',
    ant: '#2E1F2B', antHi: '#5A3B52', queen: '#8A3E5E', food: '#FFC53A', egg: '#FFF7E3',
    spider: '#4B2E7A', spiderEye: '#FFE23A', stone: '#9FB3C8', glow: '#FFB25C',
  };

  const meta = {
    label: 'Cel-shaded toon',
    tagline: 'A bright adventure-game look: three-step toon shading, thick ink outlines, painted sky and clouds.',
    refs: 'The Legend of Zelda: The Wind Waker, Ni no Kuni, Sable, Hi-Fi Rush, Kirby and the Forgotten Land, A Short Hike (3D)',
    matrix: ['Wind Waker, Ni no Kuni', 'Medium', 'High', 'Highest', 'High'],
    palette: [
      ['Sky', P.skyTop], ['Horizon', P.skyLow], ['Grass', P.grass], ['Topsoil', P.soil[0]], ['Packed', P.soil[1]], ['Clay', P.soil[2]],
      ['Nest wall', P.back], ['Ink', P.ink], ['Ant', P.ant], ['Queen', P.queen], ['Food', P.food], ['Spider', P.spider], ['Spider eyes', P.spiderEye],
    ],
    rendering: 'MeshToonMaterial with a hard three-step ramp, inverted-hull ink outlines on every creature and soil slab, warm lamp pools in the rooms, a painted gradient sky with flat cloud cut-outs.',
    motion: '60 fps eased. Tripod gait at 6 Hz, carriers bob, antennae sway, the spider rears a foreleg every two seconds, clouds drift.',
    fit: 'The outline makes every ant a sticker against the soil, so castes read even at 0.6×. Heroic and warm without turning the ants into cartoon characters.',
    risks: 'Outlines cost a second draw per mesh; with 200 ants use one instanced hull pass. Bright palette can make the spider too friendly.',
    production: 'Medium: simple models, no texture painting, but the ramp, outline width and colour script need an art director’s eye.',
  };

  function ramp() {
    const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
    const tex = new T.DataTexture(data, 3, 1, T.RGBAFormat);
    tex.minFilter = tex.magFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  // Inverted-hull ink. (core's outlineMaterial reads objectNormal, which
  // MeshBasicMaterial does not declare, so this uses the raw normal.)
  function ink(color, width) {
    const m = new T.MeshBasicMaterial({ color, side: T.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  transformed += normalize(normal) * ' + width.toFixed(3) + ' / length(modelMatrix[0].xyz);'
      );
    };
    return m;
  }

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    const grad = ramp();
    const toon = (c, o) => new T.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad }, o || {}));
    const inkThin = ink(P.ink, 0.45);
    const inkMid = ink(P.ink, 0.8);
    const inkThick = ink(P.ink, 1.6);

    // Painted sky with soft cloud bands.
    root.background = U3.canvasTexture(512, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, P.skyTop);
      gr.addColorStop(0.7, P.skyLow);
      gr.addColorStop(1, '#EAF8FF');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });

    const DEPTH = 70;
    const cavs = U3.cavities(scene, { tunnelR: 11, roomR: 18 });
    const soil = U3.soilSDF(scene, cavs);

    // Soil slabs with ink hulls (merged copy so the hull has smooth normals).
    const bands = U3.bandShapes(scene, cavs, { step: 2.5, simplify: 0.8, edge: (x, i) => Math.sin(x * 0.025 + i * 2) * 6 + Math.sin(x * 0.07) * 2 });
    bands.forEach((b) => {
      const geo = U3.extrude(b.shapes, DEPTH, { bevel: true, bevelSize: 1.2, bevelThickness: 1.2, bevelSegments: 1 });
      const m = new T.Mesh(geo, toon(P.soil[b.index]));
      root.add(m);
      const hullGeo = geo.clone();
      hullGeo.deleteAttribute('normal');
      hullGeo.deleteAttribute('uv');
      const merged = T.BufferGeometryUtils.mergeVertices(hullGeo, 0.01);
      merged.computeVertexNormals();
      const hull = new T.Mesh(merged, inkThick);
      m.add(hull);
    });
    const back = new T.Mesh(new T.BoxGeometry(U3.W, U3.H - scene.groundY, 6), toon(P.back));
    back.position.set(0, U3.Y((U3.H + scene.groundY) / 2), -DEPTH - 3);
    root.add(back);

    // Stylised stones and roots in the soil face.
    const r = U3.rng(21);
    const stoneMat = toon(P.stone);
    for (let i = 0; i < 18; i++) {
      const x = 20 + r() * 680, y = 100 + r() * 360;
      if (soil(x, y) > -12) continue;
      const m = new T.Mesh(new T.SphereGeometry(1, 12, 8), stoneMat);
      const s = 4 + r() * 6;
      m.scale.set(s * 1.3, s * 0.8, s * 0.4);
      m.position.set(U3.X(x), U3.Y(y), 1);
      m.rotation.z = r() * 3;
      m.add(new T.Mesh(m.geometry, inkMid));
      root.add(m);
    }
    const rootMat = toon('#E8B27A');
    for (let i = 0; i < 7; i++) {
      const x = 30 + r() * 660;
      if (Math.abs(x - 360) < 40) continue;
      const pts = [];
      let px = x, py = scene.groundY + 2;
      for (let k = 0; k < 6; k++) { pts.push(new T.Vector3(U3.X(px), U3.Y(py), 1.5)); px += (r() - 0.5) * 22; py += 8 + r() * 10; if (soil(px, py) > -4) break; }
      if (pts.length < 3) continue;
      const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 1.3, 5), rootMat);
      tube.add(new T.Mesh(tube.geometry, inkThin));
      root.add(tube);
    }

    // Grass: chunky blades plus a few flowers.
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    const bladeGeo = new T.ConeGeometry(2.4, 1, 5);
    bladeGeo.translate(0, 0.5, 0);
    const gm = [toon(P.grass), toon(P.grassDark)];
    const blades = new T.Group();
    for (let i = 0; i < 300; i++) {
      const x = r() * 720;
      if (x > shaft.x - 3 && x < shaft.x + shaft.w + 3) continue;
      const m = new T.Mesh(bladeGeo, gm[i % 2]);
      m.scale.set(0.7 + r() * 0.5, 7 + r() * 12, 0.7 + r() * 0.5);
      m.position.set(U3.X(x), U3.Y(scene.groundY), -r() * DEPTH);
      m.rotation.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5);
      blades.add(m);
    }
    root.add(blades);
    [[60, P.flower], [215, P.flower2], [520, P.flower], [690, P.flower2], [440, P.flower2]].forEach(([x, c], i) => {
      const stem = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 22, 5), gm[1]);
      stem.position.set(U3.X(x), U3.Y(scene.groundY) + 11, -DEPTH * (0.75 + 0.1 * (i % 2)));
      const head = new T.Mesh(new T.SphereGeometry(4, 10, 6), toon(c));
      head.scale.y = 0.55;
      head.position.y = 11;
      stem.add(head);
      const core = new T.Mesh(new T.SphereGeometry(1.8, 8, 6), toon('#FF8A1F'));
      core.position.y = 2;
      head.add(core);
      head.add(new T.Mesh(head.geometry, inkMid));
      root.add(stem);
    });

    // Flat painted clouds.
    const clouds = [];
    const cloudMat = new T.MeshBasicMaterial({ color: P.cloud });
    const cloudShade = new T.MeshBasicMaterial({ color: P.cloudShade });
    [[-250, 215, -260, 1.2], [80, 235, -300, 0.9], [300, 205, -240, 1.0]].forEach(([x, y, z, s]) => {
      const c = new T.Group();
      [[0, 0, 22], [-24, -6, 15], [24, -5, 17], [10, 10, 15], [-12, 8, 13]].forEach(([dx, dy, rr]) => {
        const sh = new T.Mesh(new T.CircleGeometry(rr, 24), cloudShade);
        sh.position.set(dx + 2, dy - 4, -0.5);
        c.add(sh);
        const m = new T.Mesh(new T.CircleGeometry(rr, 24), cloudMat);
        m.position.set(dx, dy, 0);
        c.add(m);
      });
      c.position.set(x, y, z);
      c.scale.setScalar(s);
      c.userData.x = x;
      root.add(c);
      clouds.push(c);
    });

    const lay = U3.layout(scene, soil, DEPTH);

    // Props.
    const foodMat = toon(P.food);
    const crumb = new T.Mesh(new T.DodecahedronGeometry(5.5, 1), foodMat);
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 4.5, lay.crumb.z);
    crumb.add(new T.Mesh(crumb.geometry, inkMid));
    root.add(crumb);
    const eggMat = toon(P.egg);
    const eggGeo = new T.SphereGeometry(1, 14, 10);
    const eggs = lay.eggs.map((e) => {
      const m = new T.Mesh(eggGeo, eggMat);
      m.position.set(U3.X(e.x), U3.Y(e.y) + 4.6 + e.row * 7.5, e.z);
      m.add(new T.Mesh(eggGeo, ink(P.ink, 0.5)));
      root.add(m);
      return m;
    });
    lay.piles.forEach((p, i) => {
      [[0, 0, 0], [-6, 0, 4], [6, 0, -3], [0, 0, -7], [-3, 6, 0], [3.5, 6, 2], [0, 11.5, 0]].forEach(([dx, dy, dz]) => {
        const m = new T.Mesh(new T.SphereGeometry(4.2, 12, 8), foodMat);
        m.position.set(U3.X(p.x) + dx, U3.Y(p.y) + 4 + dy, p.z + dz);
        m.add(new T.Mesh(m.geometry, inkThin));
        root.add(m);
      });
    });

    // Ants.
    const eyeMat = new T.MeshBasicMaterial({ color: '#0B0709' });
    const mats = {
      worker: { body: toon(P.ant), leg: toon(P.ant), eye: eyeMat, food: foodMat },
      queen: { body: toon(P.queen), leg: toon(P.ant), eye: eyeMat, scar: toon('#FFE1EC') },
    };
    mats.major = { body: toon('#3A2433'), leg: toon(P.ant), eye: eyeMat, food: foodMat };
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, mats[a.caste], { segments: 18, legR: 0.6, carrying: a.carrying, antennaTips: true });
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH);
      U3.addOutlines(ant.root, a.caste === 'queen' ? ink(P.ink, 0.35) : inkThin);
      // A toon highlight band across the gaster.
      const ab = ant.parts.abdomen;
      const hi = new T.Mesh(new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, 0.9), new T.MeshBasicMaterial({ color: a.caste === 'queen' ? '#C96A90' : P.antHi }));
      hi.scale.set(0.62, 0.62, 0.62);
      hi.position.y = 0.38;
      hi.rotation.z = -0.5;
      ab.add(hi);
      root.add(ant.root);
      return ant;
    });

    const spider = U3.makeSpider({ body: toon(P.spider), leg: toon('#3A2160'), eye: new T.MeshBasicMaterial({ color: P.spiderEye }) }, { segments: 16, legR: 1.2, joints: true });
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + spider.footY, lay.spider.z);
    spider.root.rotation.y = Math.PI;
    U3.addOutlines(spider.root, inkMid);
    // Stripes on the spider's abdomen.
    for (let i = 0; i < 3; i++) {
      const band = new T.Mesh(new T.TorusGeometry(1, 0.08, 6, 24), new T.MeshBasicMaterial({ color: '#E3C33A' }));
      band.scale.set(10.4 - i * 1.5, 9.3 - i * 1.5, 10.5);
      band.position.set(-14 - 3 + i * 4, 4, 0);
      band.rotation.y = Math.PI / 2;
      band.rotation.x = 0.2;
      spider.root.add(band);
    }
    root.add(spider.root);

    U3.enableShadows(root);
    blades.traverse((o) => { o.castShadow = false; });

    // Warm lamp pools in the rooms make the nest feel lived in.
    scene.rooms.forEach((rm) => {
      const l = new T.PointLight(P.glow, 1.6, 75, 1.4);
      l.position.set(U3.X(rm.x + rm.w / 2), U3.Y(rm.y + 30), -DEPTH * 0.8);
      root.add(l);
    });
    root.add(new T.HemisphereLight('#E9F6FF', '#6B4A3A', 0.7));
    const sun = new T.DirectionalLight('#FFF4DC', 1.25);
    sun.position.set(-300, 480, 460);
    U3.shadowLight(sun, 2048, 430);
    root.add(sun);

    const rig = U3.makeCamera({ fov: 28, pitch: 0.12, yaw: 0.14, zoom: 0.98, tz: -30 });

    return {
      update(t, orbit) {
        U3.animateAnts(ants, scene, t);
        U3.poseSpider(spider, t);
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.set(3.4 * es, 4.6 * es, 3.4 * es));
        clouds.forEach((c, i) => { c.position.x = ((c.userData.x + t * (4 + i * 2) + 420) % 840) - 420; });
        rig.update(orbit);
      },
      render(renderer) {
        U3.prepare(renderer, { toneMapping: T.NoToneMapping });
        renderer.render(root, rig.camera);
      },
    };
  }

  U3.register('toon', { meta, create });
})();
