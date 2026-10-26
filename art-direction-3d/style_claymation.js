// CLAYMATION — plasticine on a foam-board set, shot on twos.
// Lumpy thumb-pressed geometry, a soft studio key, googly eyes, felt grass.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    sky: '#A9D3EF', cloud: '#F4F7FA', sun: '#FFD45A', felt: '#6FAE3D', feltDark: '#4F8A2B',
    soil: ['#9A6234', '#84502A', '#8A4228'], blob: ['#7E4E27', '#966438', '#6E3F22'], back: '#6A4228',
    ant: '#4A3122', antDark: '#24160E', queen: '#9A6A4A', food: '#F6C445', egg: '#FFF6E2',
    spider: '#3A2A2A', cap: '#C8372D', mat: '#3F7FB0', bed: '#6B4426',
  };

  const meta = {
    label: 'Claymation',
    tagline: 'Plasticine ants on a foam-board set: thumb-pressed lumps, googly eyes, felt grass, a soft studio key, and motion shot on twos.',
    refs: 'Wallace & Gromit, The Neverhood, Armikrog, Harold Halibut, Clay Fighter, Skullmonkeys',
    matrix: ['The Neverhood, Armikrog', 'Medium–High', 'Medium', 'High', 'Highest'],
    palette: [
      ['Foam sky', P.sky], ['Felt', P.felt], ['Topsoil clay', P.soil[0]], ['Packed clay', P.soil[1]], ['Clay', P.soil[2]],
      ['Nest wall', P.back], ['Ant', P.ant], ['Queen', P.queen], ['Food drop', P.food], ['Egg', P.egg], ['Bottle cap', P.cap], ['Spider', P.spider],
    ],
    rendering: 'Every mesh is displaced with 3D noise so it looks hand-rolled; a fingerprint bump map, slightly glossy clay, one soft shadow-casting key, a cool rim, and real props (a bottle cap, a felt mat, a pebble).',
    motion: 'Stop-motion: 12 fps with poses held on twos (six unique poses a second), a three-pose walk, per-frame position jitter and a faint light flicker. Googly eyes blink every few seconds.',
    fit: 'The most charming direction: every ant is a little actor. Material honesty makes the nest feel like a real object you could touch.',
    risks: 'Cuteness can fight the colony-as-hero tone; 200 googly-eyed ants may be noisy. Stepped motion hides gameplay feedback unless UI stays smooth.',
    production: 'Medium–High: sculpt or displace models once, render sprite sheets or use instanced meshes. Real-time works; pre-rendered sheets are cheaper on phones.',
  };

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    root.background = new T.Color(P.sky);
    const n = U3.noise(77);
    const n2 = U3.noise(12);

    // Fingerprint bump texture: concentric ridges over fine grain.
    const thumb = U3.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#808080';
      g.fillRect(0, 0, w, h);
      const r = U3.rng(5);
      for (let k = 0; k < 7; k++) {
        const cx = r() * w, cy = r() * h, rot = r() * 3;
        for (let ring = 3; ring < 26; ring++) {
          g.strokeStyle = ring % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
          g.lineWidth = 2;
          g.beginPath();
          g.ellipse(cx, cy, ring * 3, ring * 2.2, rot, 0, Math.PI * 2);
          g.stroke();
        }
      }
      const img = g.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) { const v = (r() - 0.5) * 30; img.data[i] += v; img.data[i + 1] += v; img.data[i + 2] += v; }
      g.putImageData(img, 0, 0);
    }, { srgb: false });

    const clay = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0, bumpMap: thumb, bumpScale: 0.35 }, o || {}));

    // Hand-rolled ellipsoid: a sphere pushed in and out by noise.
    let seed = 0;
    const lumpCache = new Map();
    function lumpGeo(detail, amp) {
      const key = (seed++ % 9) + '|' + detail + '|' + amp;
      if (lumpCache.has(key)) return lumpCache.get(key);
      const g = new T.SphereGeometry(1, detail, Math.round(detail * 0.66));
      const p = g.attributes.position;
      const off = (seed % 9) * 13.7;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = 1 + amp * n(x * 2.1 + off, y * 2.1, z * 2.1) + amp * 0.35 * n2(x * 6 + off, y * 6, z * 6);
        p.setXYZ(i, x * k, y * k, z * k);
      }
      g.computeVertexNormals();
      lumpCache.set(key, g);
      return g;
    }
    const ellipsoid = (mat, rx, ry, rz) => {
      const m = new T.Mesh(lumpGeo(26, 0.07), mat);
      m.scale.set(rx, ry, rz);
      return m;
    };
    const segment = (mat, a, b, r) => {
      const len = a.distanceTo(b);
      const g = new T.CapsuleGeometry(r, len, 3, 8);
      g.translate(0, len / 2, 0);
      const m = new T.Mesh(g, mat);
      m.position.copy(a);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      return m;
    };

    // Googly eyes, pupils looking the way the creature travels.
    const white = new T.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.25 });
    const pupil = new T.MeshStandardMaterial({ color: '#0C0C0C', roughness: 0.2 });
    function googly(parent, x, y, z, r, look) {
      const g = new T.Group();
      const w = new T.Mesh(new T.SphereGeometry(r, 18, 12), white);
      g.add(w);
      const p = new T.Mesh(new T.SphereGeometry(r * 0.5, 12, 8), pupil);
      const d = (look || new T.Vector3(1, -0.35, 0)).clone().normalize();
      p.position.copy(d.multiplyScalar(r * 0.68));
      p.scale.set(1, 1, 0.55);
      p.lookAt(p.position.clone().multiplyScalar(2));
      g.add(p);
      g.position.set(x, y, z);
      parent.add(g);
      return g;
    }

    const DEPTH = 70;
    const cavs = U3.cavities(scene, { tunnelR: 11, roomR: 26 });
    const warp = (x, y) => n(x * 0.05, y * 0.05, 3) * 2.2;
    const soil = U3.soilSDF(scene, cavs, { warp });

    // Clay slabs: rounded, lumpy, each band its own slab slightly proud of the one below.
    const bands = U3.bandShapes(scene, cavs, { step: 2.5, simplify: 0.6, warp, edge: (x, i) => n(x * 0.03, i * 4, 1) * 7 });
    bands.forEach((b) => {
      const geo = U3.extrude(b.shapes, DEPTH, { bevel: true, bevelSize: 3, bevelThickness: 3, bevelSegments: 3, front: 2 - b.index * 1.5 });
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        p.setXYZ(i, x + n(x * 0.06, y * 0.06, z * 0.06) * 1.6, y + n(x * 0.06 + 9, y * 0.06, z * 0.06) * 1.6, z);
      }
      geo.computeVertexNormals();
      const merged = geo;
      const mat = clay(P.soil[b.index]);
      mat.bumpMap = thumb.clone();
      mat.bumpMap.needsUpdate = true;
      mat.bumpMap.repeat.set(1 / 70, 1 / 70);
      mat.bumpScale = 0.6;
      root.add(new T.Mesh(merged, mat));
    });
    const back = new T.Mesh(new T.BoxGeometry(U3.W, U3.H - scene.groundY, 6), clay(P.back, { roughness: 0.75 }));
    back.position.set(0, U3.Y((U3.H + scene.groundY) / 2), -DEPTH - 3);
    root.add(back);

    // Pressed blobs on the face of the set.
    const r = U3.rng(31);
    const blobMats = P.blob.map((c) => clay(c));
    for (let i = 0; i < 70; i++) {
      const x = r() * 720, y = 80 + r() * 395;
      if (soil(x, y) > -10) continue;
      const s = 5 + r() * 11;
      const m = ellipsoid(blobMats[i % 3], s, s * (0.6 + r() * 0.3), 1.6);
      m.position.set(U3.X(x), U3.Y(y), 1.6);
      m.rotation.z = r() * 3;
      root.add(m);
    }

    // Felt grass strip with tufts, a clay pebble, a cardboard sun and clouds.
    const feltTex = U3.canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = P.felt;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) {
        g.strokeStyle = r() < 0.5 ? 'rgba(255,255,210,0.22)' : 'rgba(20,50,10,0.25)';
        g.lineWidth = 1;
        const x = r() * w, y = r() * h, a = r() * 6.3;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); g.stroke();
      }
    });
    feltTex.repeat.set(6, 1);
    const feltMat = new T.MeshStandardMaterial({ map: feltTex, roughness: 1 });
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    [[0, shaft.x - 2], [shaft.x + shaft.w + 2, 720]].forEach(([a, b]) => {
      const m = new T.Mesh(new T.BoxGeometry(b - a, 8, DEPTH + 8, 1, 1, 1), feltMat);
      m.position.set(U3.X((a + b) / 2), U3.Y(scene.groundY) + 4, -DEPTH / 2);
      root.add(m);
    });
    const tuftMat = new T.MeshStandardMaterial({ color: P.feltDark, roughness: 1 });
    for (let i = 0; i < 90; i++) {
      const x = r() * 720;
      if (x > shaft.x - 6 && x < shaft.x + shaft.w + 6) continue;
      const th = 9 + r() * 8;
      const m = new T.Mesh(new T.ConeGeometry(3, th, 6), i % 3 ? feltMat : tuftMat);
      m.position.set(U3.X(x), U3.Y(scene.groundY) + 8 + th / 2 - 1, i % 4 ? -DEPTH * (0.6 + r() * 0.42) : -r() * DEPTH * 0.12);
      m.rotation.z = (r() - 0.5) * 0.6;
      root.add(m);
    }
    const pebble = ellipsoid(clay('#9A9088'), 9, 5.5, 7);
    pebble.position.set(U3.X(470), U3.Y(scene.groundY) + 12, -DEPTH * 0.4);
    root.add(pebble);
    const sun = ellipsoid(new T.MeshStandardMaterial({ color: P.sun, roughness: 0.6, emissive: '#7a5a10', emissiveIntensity: 0.25 }), 26, 26, 4);
    sun.position.set(270, 250, -230);
    root.add(sun);
    const cloudMat = clay(P.cloud, { roughness: 0.8 });
    [[-260, 250, -200], [40, 270, -260]].forEach(([x, y, z], i) => {
      [[0, 0, 22], [-22, -6, 15], [22, -5, 17]].forEach(([dx, dy, rr]) => {
        const c = ellipsoid(cloudMat, rr, rr * 0.75, 6);
        c.position.set(x + dx, y + dy, z);
        root.add(c);
      });
    });

    const lay = U3.layout(scene, soil, DEPTH);

    // Set dressing.
    const foodMat = clay(P.food, { roughness: 0.3 });
    const crumb = ellipsoid(foodMat, 6.5, 5, 6);
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 13, lay.crumb.z);
    root.add(crumb);

    // Hatchery: eggs heaped in a crimped bottle cap.
    const capX = 245, capY = lay.eggs[0].y, capZ = -DEPTH * 0.58;
    const capGeo = new T.CylinderGeometry(21, 22, 6, 42, 1, false);
    const cp = capGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), z = cp.getZ(i), y = cp.getY(i);
      const rad = Math.hypot(x, z);
      if (rad > 20) { const a = Math.atan2(z, x); const k = 1 + 0.045 * Math.sin(a * 21); cp.setX(i, x * k); cp.setZ(i, z * k); }
      cp.setY(i, y);
    }
    capGeo.computeVertexNormals();
    const cap = new T.Mesh(capGeo, new T.MeshStandardMaterial({ color: P.cap, metalness: 0.55, roughness: 0.35 }));
    cap.position.set(U3.X(capX), U3.Y(capY) + 3.2, capZ);
    root.add(cap);
    const inner = new T.Mesh(new T.CircleGeometry(19.5, 32), new T.MeshStandardMaterial({ color: '#D7D2CA', metalness: 0.7, roughness: 0.3 }));
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(U3.X(capX), U3.Y(capY) + 6.3, capZ);
    root.add(inner);
    const eggMat = clay(P.egg, { roughness: 0.4 });
    const eggs = lay.eggs.map((e, i) => {
      const m = ellipsoid(eggMat, 3.6, 4.8, 3.6);
      const ex = capX + (e.x - capX) * 0.5;
      const ez = capZ + ((i % 3) - 1) * 7;
      m.position.set(U3.X(ex), U3.Y(capY) + 11 + e.row * 7.5, ez);
      m.rotation.z = 0.3;
      root.add(m);
      return m;
    });

    // Food store: glossy drops stacked in pyramids.
    lay.piles.forEach((p) => {
      [[-6, 0, 0], [6, 0, 0], [0, 0, -6], [0, 0, 6], [0, 7.5, 0], [-3, 7, 3], [3, 7, -3], [0, 13.5, 0]].forEach(([dx, dy, dz]) => {
        const m = ellipsoid(foodMat, 4.4, 4.2, 4.4);
        m.position.set(U3.X(p.x) + dx, U3.Y(p.y) + 4.4 + dy, p.z + dz);
        root.add(m);
      });
    });

    // Barracks: a felt mat. Queen: a clay bed.
    const matTex = feltTex.clone();
    matTex.needsUpdate = true;
    const mat = new T.Mesh(new T.BoxGeometry(150, 2.5, 40), new T.MeshStandardMaterial({ color: P.mat, roughness: 1, map: matTex }));
    const majorFloor = lay.ants.find((a) => a.caste === 'major').floor;
    mat.position.set(U3.X(495), U3.Y(majorFloor) + 2.6, -DEPTH * 0.58);
    root.add(mat);
    const q = lay.ants.find((a) => a.caste === 'queen');
    const bed = ellipsoid(clay(P.bed), 52, 9, 24);
    bed.position.set(U3.X(q.x - 4), U3.Y(q.floor) + 1, -DEPTH * 0.58);
    root.add(bed);

    // Ants.
    const antMat = clay(P.ant);
    const legMat = clay(P.antDark, { roughness: 0.5 });
    const mats = {
      worker: { body: antMat, leg: legMat, food: foodMat },
      major: { body: clay('#3E2719'), leg: legMat, food: foodMat },
      queen: { body: clay(P.queen, { roughness: 0.35, metalness: 0.15, emissive: '#2a1420', emissiveIntensity: 0.3 }), leg: legMat, scar: clay('#E9D0BC') },
    };
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, mats[a.caste], { ellipsoid, segment, legR: 0.75, carrying: a.carrying, antennaTips: true, joints: true });
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH);
      const raise = a.floor === scene.groundY ? 8 : a.caste === 'major' ? 3.8 : 0; // felt and the barracks mat
      ant.root.position.y += raise;
      ant.home.y += raise;
      const hd = ant.spec.head;
      const er = a.caste === 'queen' ? 1.25 : a.caste === 'major' ? 1.35 : 1.7;
      ant.eyes = [
        googly(ant.body, hd.x + hd.rx * 0.3, hd.y + hd.ry * 0.75, hd.rz * 0.42, er),
        googly(ant.body, hd.x + hd.rx * 0.3, hd.y + hd.ry * 0.75, -hd.rz * 0.42, er),
      ];
      root.add(ant.root);
      return ant;
    });

    const spider = U3.makeSpider({ body: clay(P.spider), leg: clay('#2A1C1C') }, { ellipsoid, segment, legR: 1.5, joints: true });
    googly(spider.root, 9.2, 4.2, 2.6, 2.9, new T.Vector3(1, -0.2, 0));
    googly(spider.root, 9.2, 4.2, -2.6, 2.9, new T.Vector3(1, -0.2, 0));
    googly(spider.root, 7.5, 7.0, 4.2, 1.5, new T.Vector3(1, 0.1, 0));
    googly(spider.root, 7.5, 7.0, -4.2, 1.5, new T.Vector3(1, 0.1, 0));
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + 8 + spider.footY, lay.spider.z);
    spider.root.rotation.y = Math.PI;
    root.add(spider.root);

    U3.enableShadows(root);
    back.castShadow = false;

    root.add(new T.HemisphereLight('#F3F7FF', '#5A3A28', 0.75));
    // Practical lamps tucked inside the set light the rooms.
    scene.rooms.forEach((rm) => {
      const l = new T.PointLight('#FFC98A', 1.3, 130, 1.5);
      l.position.set(U3.X(rm.x + rm.w / 2), U3.Y(rm.y + 24), -DEPTH * 0.45);
      root.add(l);
    });
    const shaftLamp = new T.PointLight('#FFD9A8', 0.8, 160, 1.5);
    shaftLamp.position.set(U3.X(360), U3.Y(230), -DEPTH * 0.4);
    root.add(shaftLamp);
    const key = new T.DirectionalLight('#FFE9C8', 1.45);
    key.position.set(-260, 380, 520);
    U3.shadowLight(key, 2048, 430);
    root.add(key);
    const rim = new T.DirectionalLight('#9FC4FF', 0.55);
    rim.position.set(320, 200, -300);
    root.add(rim);
    const baseKey = key.intensity;

    const rig = U3.makeCamera({ fov: 26, pitch: 0.14, yaw: -0.1, zoom: 0.97, tz: -30 });

    return {
      fps: 12,
      update(t, orbit) {
        const f = Math.floor(t * 12 + 1e-6);
        const held = Math.floor(f / 2); // on twos
        const tq = held / 6;
        U3.animateAnts(ants, scene, tq, { phaseFn: () => held * ((Math.PI * 2) / 3), bob: 1.6, swing: 0.42 });
        ants.forEach((ant, i) => {
          const h = U3.rng(held * 131 + i * 7 + 1);
          ant.root.position.x += (h() - 0.5) * 0.35;
          ant.root.position.y += (h() - 0.5) * 0.25;
          const period = 18 + (U3.hash(ant.entry.key) % 12);
          const blink = (held + U3.hash(ant.entry.key + 'b')) % period === 0;
          ant.eyes.forEach((e) => (e.scale.y = blink ? 0.15 : 1));
        });
        U3.poseSpider(spider, tq, { stepped: true });
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(tq * Math.PI));
        eggs.forEach((m) => m.scale.set(3.6 * es, 4.8 * es, 3.6 * es));
        key.intensity = baseKey * (1 + (U3.rng(held + 999)() - 0.5) * 0.03);
        rig.update(orbit);
      },
      render(renderer) {
        U3.prepare(renderer, { toneMapping: T.ACESFilmicToneMapping, exposure: 1.15 });
        renderer.render(root, rig.camera);
      },
    };
  }

  U3.register('claymation', { meta, create });
})();
