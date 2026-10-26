// 1-BIT DITHER — the Return of the Obra Dinn look: a full 3D scene squeezed
// into two inks by an 8×8 ordered dither, with outlines doing the drawing.
(function () {
  const T = window.THREE, U3 = window.U3, R = U3.retro;
  const P = {
    sky: ['#C8C8C8', '#E0E0E0', '#F2F2F2'], grass: ['#505050', '#707070', '#909090'],
    soil: [['#6A6A6A', '#707070', '#767676', '#7C7C7C'], ['#505050', '#565656', '#5C5C5C', '#626262'], ['#383838', '#3E3E3E', '#444444', '#4A4A4A']],
    back: ['#C8C8C8', '#CECECE', '#D4D4D4'], chitin: ['#141414', '#1A1A1A', '#202020'], chitinBand: '#9A9A9A', leg: '#101010',
    queen: ['#3A3A3A', '#464646', '#525252'], queenBand: '#E0E0E0', queenLeg: '#1A1A1A', food: ['#D8D8D8', '#E8E8E8', '#F8F8F8'],
    egg: ['#F0F0F0', '#F8F8F8', '#FFFFFF'], spider: ['#0A0A0A', '#121212', '#1A1A1A'], spiderBand: '#FFFFFF', eye: '#FFFFFF',
    stone: ['#C0C0C0', '#E8E8E8'],
  };
  const INK = '#1E1C16', PAPER = '#E6DFC4';
  const meta = {
    family: 'retro',
    label: '1-bit dither',
    tagline: 'An old Macintosh screen: a fully lit 3D nest rendered in just two inks, shaded by an ordered dither and held together by outlines.',
    refs: 'Return of the Obra Dinn, Lucas Pope’s 1-bit Mac inspirations, World of Horror, Mars After Midnight, Playdate 3D games',
    matrix: ['Return of the Obra Dinn', 'Low–Medium', 'High', 'High', 'Highest'],
    palette: [['Ink', INK], ['Paper', PAPER]],
    rendering: 'The scene is lit in greyscale and rendered at 600×400. A final pass maps brightness against an 8×8 Bayer threshold to exactly two colours. Ink outlines on every creature and soil slab keep shapes legible, which Lucas Pope found essential: dithering alone turns into noise.',
    motion: '30 fps. Lamp pools flicker as dither patterns crawl; legs, bob and the spider twitch read as moving outlines.',
    fit: 'Links back to the field-guide idea in the original brief: an engraving that moves. Unmistakable, and every caste reads by silhouette.',
    risks: 'Dither shimmer on a moving camera can tire eyes; Obra Dinn needed careful stabilisation. Colour-coded UI is not possible inside the world.',
    production: 'Cheap art (greyscale and outlines), but a careful post pipeline: stabilised dither and good outlines take real engineering.',
  };
  const cfg = {
    P, renderWidth: 600, pixelated: true, fps: 30, filter: 'nearest', texSize: 32, soilTex: { stones: false, speckle: 0.1 },
    outline: ['#000000', 0.7], outlineSoil: 1.1,
    lamps: { kind: 'candle', color: '#FFFFFF', flame: '#FFFFFF', intensity: 2.6, body: '#E0E0E0' },
    lights: { ambient: ['#FFFFFF', 0.45], sun: ['#FFFFFF', 1.1, [-320, 420, 420]] },
    post: [() => R.oneBitPass(INK, PAPER, { contrast: 1.45, bias: 0.04 })],
  };
  U3.register('onebit', { meta, create: (env) => R.build(env, cfg) });
})();
