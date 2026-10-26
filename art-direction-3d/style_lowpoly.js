// LOW-POLY DIORAMA — faceted, flat-shaded, pastel. A tabletop slice of
// garden in the spirit of Townscaper and Monument Valley.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    sky: '#BFE3EE', skyLow: '#F6E3C8', grass: '#8CC084', grassDark: '#5E9E63',
    soil: ['#E0A86C', '#C98454', '#A6633F'], back: '#A8714E', floor: '#7A4B36',
    ant: '#40303D', queen: '#7C4C5E', food: '#F4C95D', egg: '#FFF4E0', spider: '#3A3150', eye: '#E05A5A', rock: '#B8B2A6',
  };

  const meta = {
    label: 'Low-poly diorama',
    tagline: 'A faceted tabletop slice of garden: flat-shaded triangles, soft pastel light, everything readable from across the room.',
    refs: 'Townscaper, Monument Valley, Alto’s Adventure, Islanders, Mini Motorways, Pikuniku',
    matrix: ['Townscaper, Islanders', 'Low', 'High', 'High', 'Medium'],
    palette: [
      ['Sky', P.sky], ['Haze', P.skyLow], ['Grass', P.grass], ['Topsoil', P.soil[0]], ['Packed', P.soil[1]], ['Clay', P.soil[2]],
      ['Nest wall', P.back], ['Ant', P.ant], ['Queen', P.queen], ['Food', P.food], ['Egg', P.egg], ['Spider', P.spider],
    ],
    rendering: 'Flat-shaded standard materials, nest outline simplified to big facets, one soft shadow-casting sun plus hemisphere fill. No textures at all.',
    motion: '60 fps eased. Legs on a tripod gait at 6 Hz, carriers bob, the spider lifts a foreleg every two seconds.',
    fit: 'Reads instantly on a phone and makes the colony feel like a toy world you want to tend. Castes separate cleanly by size and silhouette.',
    risks: 'Can feel generic or “mobile casual”. Needs a strong colour script to stay distinctive.',
    production: 'Cheapest 3D option: primitives and a palette, no texture painting. 200+ ants as instanced meshes run well on phones.',
  };

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    root.background = U3.canvasTexture(4, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, P.sky);
      gr.addColorStop(0.55, P.skyLow);
      gr.addColorStop(1, P.skyLow);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    const DEPTH = 70;
    const cavs = U3.cavities(scene, { tunnelR: 11, roomR: 14 });
    const soil = U3.soilSDF(scene, cavs);
    const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.9, metalness: 0 }, o || {}));

    // Soil bands, outline simplified into big facets.
    const bands = U3.bandShapes(scene, cavs, { step: 3, simplify: 4.5, edge: (x, i) => Math.round(Math.sin(x * 0.03 + i) * 5) });
    bands.forEach((b) => {
      const m = new T.Mesh(U3.extrude(b.shapes, DEPTH), mat(P.soil[b.index]));
      root.add(m);
    });
    // Back wall of the nest.
    const back = new T.Mesh(new T.BoxGeometry(U3.W, U3.H - scene.groundY, 6), mat(P.back));
    back.position.set(0, U3.Y((U3.H + scene.groundY) / 2), -DEPTH - 3);
    root.add(back);

    // Faceted rocks embedded in the front face.
    const r = U3.rng(11);
    for (let i = 0; i < 26; i++) {
      const x = 20 + r() * 680, y = 90 + r() * 380;
      if (soil(x, y) > -10) continue;
      const g = new T.DodecahedronGeometry(3 + r() * 6, 0);
      const m = new T.Mesh(g, mat(i % 3 ? P.rock : '#9C9488'));
      m.position.set(U3.X(x), U3.Y(y), 0.5);
      m.scale.z = 0.5;
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      root.add(m);
    }

    // Grass tufts and pebbles on the surface.
    const grassMat = mat(P.grass), grassDark = mat(P.grassDark);
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    for (let i = 0; i < 260; i++) {
      const x = r() * 720;
      if (x > shaft.x - 4 && x < shaft.x + shaft.w + 4) continue;
      const h = 5 + r() * 9;
      const m = new T.Mesh(new T.ConeGeometry(1.6 + r() * 1.6, h, 4), r() < 0.5 ? grassMat : grassDark);
      m.position.set(U3.X(x), U3.Y(scene.groundY) + h / 2, -r() * DEPTH);
      m.rotation.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4);
      root.add(m);
    }
    const pebble = new T.Mesh(new T.DodecahedronGeometry(7, 0), mat(P.rock));
    pebble.position.set(U3.X(470), U3.Y(scene.groundY) + 3, -DEPTH * 0.3);
    pebble.scale.y = 0.6;
    root.add(pebble);

    const lay = U3.layout(scene, soil, DEPTH);

    // Crumb, eggs, food store.
    const crumb = new T.Mesh(new T.DodecahedronGeometry(5.5, 0), mat(P.food));
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 4, lay.crumb.z);
    root.add(crumb);
    const eggMat = mat(P.egg);
    const eggs = lay.eggs.map((e) => {
      const m = new T.Mesh(new T.IcosahedronGeometry(1, 1), eggMat);
      m.scale.set(3.4, 4.6, 3.4);
      m.position.set(U3.X(e.x), U3.Y(e.y) + 4.4 + e.row * 7, e.z);
      root.add(m);
      return m;
    });
    const foodMat = mat(P.food);
    lay.piles.forEach((p, i) => {
      [[0, 0, 0], [-5, 0, 3], [5, 0, -3], [0, 0, -6], [-2, 6, -1], [3, 5, 2], [0, 11, 0]].forEach(([dx, dy, dz]) => {
        const m = new T.Mesh(new T.OctahedronGeometry(4, 0), foodMat);
        m.position.set(U3.X(p.x) + dx, U3.Y(p.y) + 4 + dy, p.z + dz);
        m.rotation.set(i + dx, dz, dy);
        root.add(m);
      });
    });

    // Ants.
    const antMats = {
      worker: { body: mat(P.ant, { roughness: 0.55 }), leg: mat(P.ant), food: foodMat },
      queen: { body: mat(P.queen, { roughness: 0.5 }), leg: mat(P.ant), scar: mat('#E8C9B0') },
    };
    antMats.major = antMats.worker;
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, antMats[a.caste], { flat: true, detail: 1, segments: 6, legR: 0.55, carrying: a.carrying });
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH);
      root.add(ant.root);
      return ant;
    });

    const spider = U3.makeSpider({ body: mat(P.spider), leg: mat(P.spider), eye: mat(P.eye, { emissive: '#5a1010' }) }, { flat: true, detail: 1, legR: 1.1 });
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + spider.footY, lay.spider.z);
    spider.root.rotation.y = Math.PI; // face left
    root.add(spider.root);

    U3.enableShadows(root);
    root.background.encoding = T.sRGBEncoding;

    root.add(new T.HemisphereLight('#FFF6E6', '#7A5A6A', 0.75));
    // Warm lamps inside each room so the nest reads as lived-in.
    scene.rooms.forEach((rm) => {
      const l = new T.PointLight('#FFC48A', 0.9, 150, 1.6);
      l.position.set(U3.X(rm.x + rm.w / 2), U3.Y(rm.y + rm.h * 0.45), -DEPTH * 0.35);
      root.add(l);
    });
    const sun = new T.DirectionalLight('#FFF1DA', 1.15);
    sun.position.set(-260, 420, 520);
    U3.shadowLight(sun, 2048, 420);
    root.add(sun);

    const rig = U3.makeCamera({ fov: 28, pitch: 0.16, yaw: -0.18, zoom: 1.02, tz: -30 });

    return {
      update(t, orbit) {
        U3.animateAnts(ants, scene, t);
        U3.poseSpider(spider, t);
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.set(3.4 * es, 4.6 * es, 3.4 * es));
        rig.update(orbit);
      },
      render(renderer) {
        U3.prepare(renderer, { toneMapping: T.ACESFilmicToneMapping, exposure: 1.1 });
        renderer.render(root, rig.camera);
      },
    };
  }

  U3.register('lowpoly', { meta, create });
})();
