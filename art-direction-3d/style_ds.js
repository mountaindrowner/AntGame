// NINTENDO DS — a 256-pixel-wide handheld screen: toon-shaded low-poly
// models with hardware edge-marking outlines, bright fog and crisp pixels.
(function () {
  const T = window.THREE, U3 = window.U3, R = U3.retro;
  const P = {
    sky: ['#3A90F0', '#88C8F8', '#D0ECFF'], grass: ['#30A030', '#48C040', '#78E058'],
    soil: [['#C8783A', '#D88A44', '#E89C52', '#F0B064'], ['#A85E34', '#B86C3C', '#C87C46', '#D48C52'], ['#8E4030', '#A04C36', '#B05A3E', '#C06A48']],
    back: ['#6A3A26', '#72402A', '#7A462E'], chitin: ['#2A1A20', '#36222A', '#422A34'], chitinBand: '#E87A3A', leg: '#2A1A20',
    queen: ['#C84A6A', '#D85C7A', '#E8708C'], queenBand: '#FFE070', queenLeg: '#6A2438', food: ['#F0B020', '#FFD040', '#FFE878'],
    egg: ['#F0EADC', '#FAF6EC', '#FFFFFF'], spider: ['#4A2A80', '#5A3896', '#6C48AC'], spiderBand: '#FFD040', eye: '#FF4040',
    stone: ['#9898A8', '#D0D0E0'],
  };
  const meta = {
    family: 'retro',
    label: 'Nintendo DS',
    tagline: 'A bright handheld adventure on a 256-pixel screen: toon-shaded models with crisp edge outlines, built to read on a tiny display.',
    refs: 'The Legend of Zelda: Phantom Hourglass, Mario Kart DS, Animal Crossing: Wild World, Professor Layton (3D scenes), Pokémon HeartGold',
    matrix: ['Phantom Hourglass, Mario Kart DS', 'Low', 'Highest', 'Highest', 'Medium'],
    palette: [['Sky', P.sky[0]], ['Grass', P.grass[1]], ['Topsoil', P.soil[0][1]], ['Packed', P.soil[1][1]], ['Clay', P.soil[2][1]], ['Ant', P.chitin[1]], ['Band', P.chitinBand], ['Queen', P.queen[1]], ['Food', P.food[1]], ['Spider', P.spider[1]], ['Outline', '#101018']],
    rendering: 'Rendered at 256×171 and upscaled nearest-neighbour. Two-tone toon shading (the DS had a hardware toon table) with dark edge outlines on every creature and soil slab (the DS’s edge-marking feature), low-segment models, bright distance fog and no dithering.',
    motion: '30 fps, the DS’s usual 3D rate. Legs, bob and the spider twitch on that clock.',
    fit: 'Designed for exactly our problem: tiny characters on a tiny screen. Outlines make every caste pop even at 0.6×, and it is the most phone-legible retro option.',
    risks: 'Can look like a kids’ handheld game; the low resolution limits how many ants fit before the screen gets busy.',
    production: 'Cheapest of all: very low-poly models, flat colours, outlines from a single shader.',
  };
  const cfg = {
    P, renderWidth: 256, pixelated: true, fps: 30, filter: 'nearest', texSize: 16, shading: 'toon', creatureSegments: 6, soilTex: { stones: false, speckle: 0.12 },
    outline: ['#101018', 0.9], outlineSoil: 1.3,
    fog: ['#A8D8F8', 900, 1500],
    lamps: { kind: 'candle', color: '#FFD080', flame: '#FFF0A0', intensity: 1.2, body: '#E05040' },
    lights: { ambient: ['#C0C8E0', 0.85], sun: ['#FFFFFF', 1.1, [-260, 420, 520]] },
    post: [],
  };
  U3.register('ds', { meta, create: (env) => R.build(env, cfg) });
})();
