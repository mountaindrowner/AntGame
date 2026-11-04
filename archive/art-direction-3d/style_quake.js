// QUAKE-ERA SOFTWARE RENDERER — every pixel forced into one 64-colour
// palette with lighting stepped through it, brown-on-brown stone and
// fullbright torch flames that ignore the dark.
(function () {
  const T = window.THREE, U3 = window.U3, R = U3.retro;
  const P = {
    sky: ['#1A1028', '#3A2448', '#5A3A5A'], grass: ['#2A3418', '#3A4420', '#4E582A'],
    soil: [['#3A2A1A', '#4E3A24', '#62482C', '#765834'], ['#2E2620', '#3E342A', '#4E4234', '#5E5040'], ['#4A2618', '#5E3220', '#723E28', '#864A30']],
    back: ['#241C14', '#2A2018', '#30241A'], chitin: ['#140E0A', '#1E1610', '#281E16'], chitinBand: '#6E5A3A', leg: '#140E0A',
    queen: ['#4E2A1A', '#643622', '#7A442A'], queenBand: '#B48A50', queenLeg: '#2A1810', food: ['#8A6A20', '#AE862A', '#CCA040'],
    egg: ['#9A8E78', '#B4A88E', '#CEC2A6'], spider: ['#1A161E', '#26202C', '#322A3A'], spiderBand: '#6A1A14', eye: '#FF3010',
    stone: ['#4A4440', '#6E6660'],
  };
  // 64 entries: eight 8-step ramps, ordered dark to light, like Quake's palette.
  const ramp = (a, b) => Array.from({ length: 8 }, (_, i) => {
    const t = i / 7;
    const A = new T.Color(a), B = new T.Color(b);
    return '#' + A.lerp(B, t).getHexString();
  });
  const PALETTE = [].concat(
    ramp('#0A0806', '#C8B8A0'), // brown-grey
    ramp('#100A04', '#E0A860'), // tan
    ramp('#140604', '#E07040'), // rust
    ramp('#080A04', '#90A060'), // olive
    ramp('#060608', '#A8A8B8'), // stone
    ramp('#0A0610', '#9080B0'), // purple sky
    ramp('#180404', '#FF4020'), // blood red
    ramp('#201004', '#FFF0A0') // fullbright yellow
  );
  const meta = {
    family: 'retro',
    label: 'Quake software',
    tagline: 'A 1996 software-rendered dungeon: one 64-colour palette, light stepped into hard bands, fullbright torches burning in the brown.',
    refs: 'Quake, Hexen II, Dusk, Ultrakill, Wrath: Aeon of Ruin, Warhammer 40,000: Boltgun',
    matrix: ['Quake, Dusk', 'Low', 'High', 'Medium', 'High'],
    palette: [['Brown', PALETTE[4]], ['Tan', PALETTE[13]], ['Rust', PALETTE[21]], ['Olive', PALETTE[28]], ['Stone', PALETTE[36]], ['Sky', PALETTE[44]], ['Blood', PALETTE[52]], ['Fullbright', PALETTE[61]]],
    rendering: 'Rendered at 400×267, nearest-filtered 64 px textures, flat-shaded creatures. A final pass steps each pixel’s brightness into 16 bands (the colormap’s job in Quake) and snaps it to the nearest of 64 palette colours built as eight ramps. Flames and the spider’s eyes are fullbright: they skip lighting entirely. Harsh torch falloff, no fog.',
    motion: '30 fps. Torches flicker hard; everything else is steady and heavy.',
    fit: 'Underground stone and dirt is exactly what this palette was made for. Reads as gritty and tactile, and gives the colony a dungeon-crawl edge.',
    risks: 'The brown palette is the point and the problem: castes must be told apart by shape and the few warm accents, not colour.',
    production: 'Cheap: one palette shader, small textures, simple models. Boomer-shooter fans will recognise it instantly.',
  };
  const cfg = {
    P, renderWidth: 400, pixelated: true, fps: 30, filter: 'nearest', texSize: 64, flatCreatures: true, creatureSegments: 6,
    lamps: { kind: 'torch', color: '#FFB040', flame: '#FFE070', intensity: 5.5, range: 210, decay: 1.8, body: '#3A2A1A' },
    lights: { ambient: ['#8A7864', 1.15], sun: ['#D0C0A8', 0.75, [-200, 420, 520]] },
    eyeGlow: '#FF3010',
    post: [() => R.palettePass(PALETTE, { lightSteps: 16 })],
  };
  U3.register('quake', { meta, create: (env) => R.build(env, cfg) });
})();
