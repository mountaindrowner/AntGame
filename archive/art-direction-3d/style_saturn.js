// SEGA SATURN — warped quads, a sunset sky, and transparency faked with a
// checkerboard "mesh" that composite video blends into a 50% shadow.
(function () {
  const T = window.THREE, U3 = window.U3, R = U3.retro;
  const P = {
    sky: ['#24145E', '#B83A8A', '#FFB060'], grass: ['#1E6A3A', '#2A8A44', '#4AAE52'],
    soil: [['#7A2A1E', '#9A3A22', '#B44E28', '#CC6A30'], ['#5E2430', '#7A2E36', '#943A3C', '#A84A42'], ['#3E1E44', '#52284E', '#66325A', '#7A3E66']],
    back: ['#2A143A', '#341A44', '#3C1E4C'], chitin: ['#120A14', '#1C1020', '#26162A'], chitinBand: '#3AC8D8', leg: '#120A14',
    queen: ['#6A1E4A', '#8A2A5E', '#A63A72'], queenBand: '#FFD24A', queenLeg: '#3A1028', food: ['#E07A10', '#F8A020', '#FFD050'],
    egg: ['#D8D0E8', '#ECE6F8', '#FFFFFF'], spider: ['#0E1A2A', '#14243A', '#1E3450'], spiderBand: '#F8E040', eye: '#40FFD0',
    stone: ['#5A4A6A', '#8A7A9A'],
  };
  const meta = {
    family: 'retro',
    label: 'Sega Saturn',
    tagline: 'A 1996 Sega title at sunset: warped textures, neon dusk colours and checkerboard shadows that the TV melts into transparency.',
    refs: 'Panzer Dragoon Saga, NiGHTS into Dreams, Burning Rangers, Sonic R, Quake (Saturn port), Bug! (Saturn)',
    matrix: ['Panzer Dragoon, NiGHTS', 'Low', 'High', 'Medium', 'Highest'],
    palette: [['Night', P.sky[0]], ['Magenta dusk', P.sky[1]], ['Sunset', P.sky[2]], ['Topsoil', P.soil[0][2]], ['Packed', P.soil[1][2]], ['Clay', P.soil[2][2]], ['Ant', P.chitin[1]], ['Ant band', P.chitinBand], ['Queen', P.queen[1]], ['Food', P.food[1]], ['Spider', P.spider[1]], ['Spider eye', P.eye]],
    rendering: 'Rendered at 352×235. Fine vertex snapping and affine texturing give the Saturn’s quad warping, the nest outline is simplified into big quads, and creature shadows are drawn with mesh transparency: a checkerboard of discarded pixels, exactly how Saturn games faked alpha. A composite-video pass smears chroma so the checkerboard reads as a soft shadow, as it did on a real TV.',
    motion: '30 fps. The sky’s VDP2-style colour bands stay fixed while the world swings round them; torches flicker.',
    fit: 'The most distinctive of the retro set: the colour script alone separates it from every PS1 tribute. Dusk light gives the surface danger and the nest warmth.',
    risks: 'The look depends on the composite blur; on sharp phone screens without it, the mesh dither looks noisy. Saturn nostalgia is narrower than PS1.',
    production: 'Same cost as PS1 retro. Mesh transparency is cheaper than real alpha blending, a bonus on low-end phones.',
  };
  const cfg = {
    P, renderWidth: 352, pixelated: false, fps: 30, snap: [176, 117], affine: true, filter: 'nearest', texSize: 32, simplify: 4,
    fog: ['#4A2A5E', 700, 1400],
    lamps: { kind: 'torch', color: '#FF9A40', flame: '#FFD060', intensity: 2.8, body: '#5A3A2A' },
    lights: { ambient: ['#9070B0', 0.85], sun: ['#FFB880', 0.9, [300, 260, 400]] },
    eyeGlow: '#40FFD0',
    post: [() => R.compositePass({ chroma: 3.0, luma: 0.7, sat: 1.15 })],
    extra(ctx) {
      // Mesh-transparency blob shadows under everything that stands on a floor.
      const meshMat = new T.ShaderMaterial({
        vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'void main(){ if (mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard; gl_FragColor = vec4(0.06, 0.0, 0.08, 1.0); }',
        polygonOffset: true, polygonOffsetFactor: -2,
      });
      const add = (x, y, z, rx, rz) => {
        const m = new T.Mesh(new T.CircleGeometry(1, 12), meshMat);
        m.rotation.x = -Math.PI / 2;
        m.scale.set(rx, rz, 1);
        m.position.set(x, y + 0.4, z);
        ctx.root.add(m);
      };
      ctx.ants.forEach((ant) => {
        if (ant.entry.wall) return;
        const k = ant.spec.scale;
        add(ant.root.position.x - 2 * k, U3.Y(ant.entry.floor), ant.root.position.z, 13 * k, 6 * k);
      });
      add(U3.X(ctx.lay.spider.x) + 8, U3.Y(ctx.lay.spider.y), ctx.lay.spider.z, 30, 22);
    },
  };
  U3.register('saturn', { meta, create: (env) => R.build(env, cfg) });
})();
