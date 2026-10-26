// TOY ANT FARM — the classic mail-order ant farm on a desk. Layered sand-art
// soil between two panes of glass, a glossy green plastic frame, a little red
// barn and windmill on the skyline, shot like product photography.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    wall: '#BFE3DD', wallLow: '#F4E6CC', desk: '#C98E55', frame: '#2FA34F', frameDark: '#1E7A39',
    sand: [['#F1CF86', '#E8B868', '#F6DDA0'], ['#E39A63', '#D6824E', '#EDB27E'], ['#B9624A', '#A6513D', '#C9785C']],
    barn: '#D63A2F', trim: '#FFF8EC', roof: '#5A4A44', ant: '#1E1410', queen: '#3A1E12', seed: '#F7F1E1',
  };

  const meta = {
    label: 'Toy ant farm',
    tagline: 'The mail-order ant farm on your desk: layered sand between two panes of glass, a glossy green frame, a little red barn on the skyline.',
    refs: 'Uncle Milton’s Ant Farm, Toy Story, Tearaway, Captain Toad: Treasure Tracker, Lego video games',
    matrix: ['Captain Toad, Toy Story games', 'Medium', 'High', 'High', 'High'],
    palette: [
      ['Wall', P.wall], ['Desk', P.desk], ['Frame', P.frame], ['Frame shade', P.frameDark],
      ['Golden sand', P.sand[0][0]], ['Peach sand', P.sand[1][0]], ['Rust sand', P.sand[2][0]],
      ['Barn', P.barn], ['Trim', P.trim], ['Ant', P.ant], ['Queen', P.queen], ['Seed', P.seed],
    ],
    rendering: 'Product-photography lighting: a soft key with contact shadows, a studio environment map for glossy plastic and chitin, a tinted glass pane with softbox reflections faked as additive streaks. Sand is a striped canvas texture per layer.',
    motion: '60 fps. Ants walk at 6 Hz and climb the back glass in the shaft; the windmill turns; carriers bob; the spider taps the sand.',
    fit: 'Frames the colony as something you own and watch, which is the game’s fantasy. The glass box gives a natural UI frame and an obvious reason for the cross-section view. Instantly readable to anyone who had one as a kid.',
    risks: 'Can read as a children’s toy rather than a living world. The frame eats screen space on a phone; the HUD could live on the frame itself.',
    production: 'Moderate: simple shapes, but sand and glass need careful shading. Cheap at runtime: no post-processing, one shadow map.',
  };

  function studioEnv(renderer) {
    const s = new T.Scene();
    s.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), new T.MeshBasicMaterial({
      side: T.BackSide,
      map: U3.canvasTexture(8, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#FFFFFF');
        gr.addColorStop(0.5, '#D9ECE8');
        gr.addColorStop(1, '#8A6A50');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }),
    })));
    [[-50, 40, 60, 40, 30], [60, 30, 40, 20, 40]].forEach(([x, y, z, w, h]) => {
      const p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(4, 4, 4), side: T.DoubleSide }));
      p.position.set(x, y, z);
      p.lookAt(0, 0, 0);
      s.add(p);
    });
    const pm = new T.PMREMGenerator(renderer);
    const tex = pm.fromScene(s, 0.03).texture;
    pm.dispose();
    return tex;
  }

  // Sand-art layers: wavy stripes of three related colours with grain.
  function sandTexture(cols, seed) {
    const n = U3.noise(seed);
    return U3.canvasTexture(512, 512, (g, w, h) => {
      const r = U3.rng(seed);
      g.fillStyle = cols[0];
      g.fillRect(0, 0, w, h);
      let y = -20;
      const stripes = [];
      while (y < h) { const t = 10 + r() * 46; stripes.push([y, t, cols[Math.floor(r() * cols.length)]]); y += t; }
      for (let x = 0; x < w; x += 2) {
        stripes.forEach(([y0, t, c], i) => {
          const off = U3.fbm(n, x * 0.01, i * 1.7, 0, 3) * 14;
          g.fillStyle = c;
          g.fillRect(x, y0 + off, 2, t + 2);
        });
      }
      for (let i = 0; i < 26000; i++) {
        const v = r();
        g.fillStyle = v < 0.5 ? 'rgba(90,50,20,0.22)' : v < 0.93 ? 'rgba(255,250,235,0.35)' : 'rgba(40,30,25,0.5)';
        g.fillRect(r() * w, r() * h, 1 + r(), 1 + r());
      }
    }, { repeat: [1 / 300, 1 / 300] });
  }

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    root.environment = studioEnv(env.renderer);
    const DEPTH = 32;
    const cavs = U3.cavities(scene, { tunnelR: 11, roomR: 22 });
    const n = U3.noise(51);
    const top = (x) => scene.groundY + U3.fbm(n, x * 0.025, 1, 0, 2) * 4;
    const warp = (x, y) => U3.fbm(n, x * 0.04, y * 0.04, 0, 2) * 2.5;
    const soil = U3.soilSDF(scene, cavs, { top, warp });
    const r = U3.rng(12);

    // Sand layers.
    const bands = U3.bandShapes(scene, cavs, { step: 2, simplify: 0.5, top, warp, edge: (x, i) => U3.fbm(n, x * 0.012, i * 5, 0, 3) * 16 });
    bands.forEach((b) => {
      const mat = new T.MeshStandardMaterial({ map: sandTexture(P.sand[b.index], 30 + b.index), roughness: 0.95, envMapIntensity: 0.4 });
      root.add(new T.Mesh(U3.extrude(b.shapes, DEPTH), mat));
    });

    // Plastic: frame, base, and the toy farm on the skyline.
    const plastic = (c, o) => new T.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.1, envMapIntensity: 0.45 }, o || {}));
    const frameMat = plastic(P.frame);
    const ox0 = -26, ox1 = 746, oy0 = -24, oy1 = 506; // outer, scene coords
    const ix0 = -2, ix1 = 722, iy0 = 2, iy1 = 482; // inner opening
    const frameShape = new T.Shape();
    const rr = (s, x0, y0, x1, y1, rad) => {
      s.moveTo(U3.X(x0 + rad), U3.Y(y0));
      s.lineTo(U3.X(x1 - rad), U3.Y(y0));
      s.quadraticCurveTo(U3.X(x1), U3.Y(y0), U3.X(x1), U3.Y(y0 + rad));
      s.lineTo(U3.X(x1), U3.Y(y1 - rad));
      s.quadraticCurveTo(U3.X(x1), U3.Y(y1), U3.X(x1 - rad), U3.Y(y1));
      s.lineTo(U3.X(x0 + rad), U3.Y(y1));
      s.quadraticCurveTo(U3.X(x0), U3.Y(y1), U3.X(x0), U3.Y(y1 - rad));
      s.lineTo(U3.X(x0), U3.Y(y0 + rad));
      s.quadraticCurveTo(U3.X(x0), U3.Y(y0), U3.X(x0 + rad), U3.Y(y0));
    };
    rr(frameShape, ox0, oy0, ox1, oy1, 22);
    const hole = new T.Path();
    rr(hole, ix0, iy0, ix1, iy1, 6);
    frameShape.holes.push(hole);
    const FD = DEPTH + 14;
    const frameGeo = new T.ExtrudeGeometry(frameShape, { depth: FD, bevelEnabled: true, bevelSize: 3, bevelThickness: 3, bevelSegments: 4, curveSegments: 12 });
    frameGeo.translate(0, 0, -FD + 7);
    root.add(new T.Mesh(frameGeo, frameMat));
    // Stand: two feet and a base plinth.
    const base = new T.Mesh(new T.BoxGeometry(820, 26, 120), plastic(P.frameDark));
    base.position.set(0, U3.Y(oy1) - 13, -DEPTH / 2);
    root.add(base);

    // Label sticker on the bottom rail.
    const label = U3.canvasTexture(512, 64, (g, w, h) => {
      g.fillStyle = P.frameDark;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#FFF8EC';
      g.beginPath();
      g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 24) : g.rect(4, 4, w - 8, h - 8);
      g.fill();
      g.fillStyle = P.barn;
      g.font = '800 38px "Arial Rounded MT Bold", "Trebuchet MS", "Helvetica Neue", Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('UNDERFOOT  ANT  FARM', w / 2, h / 2 + 2);
    });
    const sticker = new T.Mesh(new T.PlaneGeometry(200, 25), new T.MeshStandardMaterial({ map: label, roughness: 0.5 }));
    sticker.position.set(0, U3.Y(494), 10.2);
    root.add(sticker);

    // Toy farm: barn, silo, windmill and fence.
    const farm = new T.Group();
    const zf = -DEPTH + 8;
    const barnShape = new T.Shape([new T.Vector2(-22, 0), new T.Vector2(22, 0), new T.Vector2(22, 26), new T.Vector2(0, 42), new T.Vector2(-22, 26)]);
    const barn = new T.Mesh(new T.ExtrudeGeometry(barnShape, { depth: 10, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.8, bevelSegments: 2 }), plastic(P.barn));
    barn.position.set(U3.X(222), U3.Y(scene.groundY) - 1, zf - 5);
    farm.add(barn);
    const door = new T.Mesh(new T.BoxGeometry(14, 16, 1), plastic(P.trim));
    door.position.set(U3.X(222), U3.Y(scene.groundY) + 7, zf + 6.4);
    farm.add(door);
    const roof = new T.Mesh(new T.BoxGeometry(32, 3, 12), plastic(P.roof));
    [[-1, 0.62], [1, -0.62]].forEach(([s, a]) => {
      const m = roof.clone();
      m.position.set(U3.X(222) + s * 11.5, U3.Y(scene.groundY) + 34.5, zf);
      m.rotation.z = a;
      farm.add(m);
    });
    const silo = new T.Mesh(new T.CylinderGeometry(7, 7, 40, 24), plastic(P.trim));
    silo.position.set(U3.X(256), U3.Y(scene.groundY) + 19, zf);
    farm.add(silo);
    const dome = new T.Mesh(new T.SphereGeometry(7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), plastic(P.barn));
    dome.position.set(U3.X(256), U3.Y(scene.groundY) + 39, zf);
    farm.add(dome);
    const tower = new T.Mesh(new T.CylinderGeometry(2.5, 5, 50, 4), plastic(P.trim));
    tower.position.set(U3.X(505), U3.Y(scene.groundY) + 24, zf);
    farm.add(tower);
    const rotor = new T.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new T.Mesh(new T.BoxGeometry(3.5, 20, 1), plastic(P.barn));
      blade.position.y = 10;
      const arm = new T.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      arm.add(blade);
      rotor.add(arm);
    }
    rotor.position.set(U3.X(505), U3.Y(scene.groundY) + 49, zf + 4);
    farm.add(rotor);
    const fenceMat = plastic(P.trim);
    for (let x = 410; x <= 470; x += 10) {
      const post = new T.Mesh(new T.BoxGeometry(2, 11, 2), fenceMat);
      post.position.set(U3.X(x), U3.Y(scene.groundY) + 5, zf);
      farm.add(post);
    }
    [4, 8].forEach((h) => {
      const rail = new T.Mesh(new T.BoxGeometry(62, 1.6, 1.2), fenceMat);
      rail.position.set(U3.X(440), U3.Y(scene.groundY) + h, zf);
      farm.add(rail);
    });
    root.add(farm);

    const lay = U3.layout(scene, soil, DEPTH);

    // Crumb, eggs, seeds.
    const crumb = new T.Mesh(new T.DodecahedronGeometry(5, 1), new T.MeshStandardMaterial({ color: '#D9A65A', roughness: 0.8 }));
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 4, lay.crumb.z);
    root.add(crumb);
    const eggMat = new T.MeshPhysicalMaterial({ color: '#FBF6EA', roughness: 0.3, clearcoat: 0.5, sheen: 1, sheenColor: new T.Color('#FFFFFF') });
    const eggs = lay.eggs.map((e) => {
      const m = new T.Mesh(new T.SphereGeometry(1, 16, 12), eggMat);
      m.position.set(U3.X(e.x), U3.Y(e.y) + 4.4 + e.row * 7, -DEPTH / 2 + (e.z + DEPTH / 2) * 0.4);
      root.add(m);
      return m;
    });
    const seedMat = new T.MeshPhysicalMaterial({ color: P.seed, roughness: 0.25, clearcoat: 0.6 });
    lay.piles.forEach((p) => {
      for (let k = 0; k < 12; k++) {
        const a = r() * 6.28, rad = r() * 8 * (1 - k / 16);
        const m = new T.Mesh(new T.BoxGeometry(3, 3, 3), seedMat);
        m.position.set(U3.X(p.x) + Math.cos(a) * rad, U3.Y(p.y) + 1.6 + k * 1.0, -DEPTH / 2 + Math.sin(a) * rad * 0.5);
        m.rotation.set(r() * 3, r() * 3, r() * 3);
        root.add(m);
      }
    });

    // Real ants in a toy world.
    const chitin = (c) => new T.MeshPhysicalMaterial({ color: c, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.2, envMapIntensity: 1.2 });
    const antMats = {
      worker: { body: chitin(P.ant), leg: chitin(P.ant), food: seedMat },
      queen: { body: chitin(P.queen), leg: chitin(P.ant), scar: new T.MeshStandardMaterial({ color: '#D9B48E' }) },
    };
    antMats.major = antMats.worker;
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, antMats[a.caste], { segments: 20, legR: 0.45, carrying: a.carrying });
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH, { laneZ: 0.5 });
      if (!a.wall && a.caste !== 'worker') ant.root.position.z = ant.home.z = -DEPTH / 2;
      root.add(ant.root);
      return ant;
    });
    const spider = U3.makeSpider({ body: chitin('#2A2420'), leg: chitin('#2A2420'), eye: chitin('#000000') }, { segments: 20, legR: 1.1 });
    spider.root.scale.set(1, 1, 0.55);
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + spider.footY, -DEPTH / 2);
    spider.root.rotation.y = Math.PI;
    root.add(spider.root);

    // Glass: a faint tinted pane plus additive softbox reflections.
    const glass = new T.Mesh(new T.PlaneGeometry(ix1 - ix0, iy1 - iy0), new T.MeshPhysicalMaterial({ color: '#E8FFF8', transparent: true, opacity: 0.07, roughness: 0.03, metalness: 0, depthWrite: false }));
    glass.position.set(U3.X((ix0 + ix1) / 2), U3.Y((iy0 + iy1) / 2), 2);
    root.add(glass);
    const streak = U3.canvasTexture(256, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      gr.addColorStop(0.65, 'rgba(255,255,255,0.4)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      const v = g.createLinearGradient(0, 0, 0, h);
      v.addColorStop(0, 'rgba(0,0,0,1)');
      v.addColorStop(0.2, 'rgba(0,0,0,0)');
      v.addColorStop(0.8, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = v;
      g.fillRect(0, 0, w, h);
    }, { srgb: false });
    const reflections = new T.Group();
    [[600, 60, 0.35, 0.1], [660, 26, 0.35, 0.08], [140, 90, -0.5, 0.045]].forEach(([x, w, rot, op]) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, 700), new T.MeshBasicMaterial({ map: streak, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }));
      m.position.set(U3.X(x), 0, 2.4);
      m.rotation.z = rot;
      reflections.add(m);
    });
    root.add(reflections);

    // The desk and the wall behind it.
    const wood = U3.canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = P.desk;
      g.fillRect(0, 0, w, h);
      const rw = U3.rng(4);
      for (let y = 0; y < h; y += 2) {
        g.fillStyle = 'rgba(' + (90 + rw() * 40) + ',50,20,' + (0.05 + rw() * 0.12) + ')';
        g.fillRect(0, y, w, 1 + rw() * 2);
      }
    }, { repeat: [3, 1] });
    const desk = new T.Mesh(new T.PlaneGeometry(4000, 1600), new T.MeshStandardMaterial({ map: wood, roughness: 0.45, envMapIntensity: 0.6 }));
    desk.rotation.x = -Math.PI / 2;
    desk.position.set(0, U3.Y(oy1) - 26, -300);
    root.add(desk);
    const wall = new T.Mesh(new T.PlaneGeometry(5000, 2600), new T.MeshBasicMaterial({
      map: U3.canvasTexture(512, 512, (g, w, h) => {
        const gr = g.createRadialGradient(w * 0.45, h * 0.4, 20, w * 0.5, h * 0.5, w * 0.75);
        gr.addColorStop(0, '#E6F4F0');
        gr.addColorStop(0.6, P.wall);
        gr.addColorStop(1, '#8FC4BC');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        const rb = U3.rng(6);
        for (let i = 0; i < 14; i++) {
          const x = rb() * w, y = rb() * h * 0.7, s = 10 + rb() * 40;
          const b = g.createRadialGradient(x, y, 0, x, y, s);
          b.addColorStop(0, 'rgba(255,248,230,0.35)');
          b.addColorStop(1, 'rgba(255,248,230,0)');
          g.fillStyle = b;
          g.fillRect(x - s, y - s, s * 2, s * 2);
        }
      }),
    }));
    wall.position.set(0, 300, -900);
    root.add(wall);

    U3.enableShadows(root);
    [glass, wall, desk, sticker].forEach((m) => { m.castShadow = false; });
    reflections.traverse((m) => { m.castShadow = false; m.receiveShadow = false; });

    root.add(new T.HemisphereLight('#FFFFFF', '#C9A27A', 0.45));
    const key = new T.DirectionalLight('#FFF4E4', 1.35);
    key.position.set(-380, 520, 640);
    U3.shadowLight(key, 2048, 560);
    root.add(key);
    const rim = new T.DirectionalLight('#DFF6FF', 0.6);
    rim.position.set(400, 300, -500);
    root.add(rim);
    // Light through the back glass, so tunnels glow like a real ant farm.
    const back = new T.PointLight('#FFF1D6', 0.5, 0, 0);
    back.position.set(0, 0, -260);
    root.add(back);

    const rig = U3.makeCamera({ fov: 30, pitch: 0.1, yaw: -0.16, zoom: 0.86, tz: -16, ty: -10 });

    return {
      update(t, orbit) {
        U3.animateAnts(ants, scene, t);
        U3.poseSpider(spider, t);
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.set(3.4 * es, 4.6 * es, 3.4 * es));
        rotor.rotation.z = -t * 0.8;
        rig.update(orbit);
      },
      render(renderer) {
        U3.prepare(renderer, { toneMapping: T.ACESFilmicToneMapping, exposure: 0.95, clear: 0xbfe3dd });
        renderer.render(root, rig.camera);
      },
    };
  }

  U3.register('antfarm', { meta, create });
})();
