// N64 — Nintendo 64: three-point texture filtering turns tiny textures into
// soft smears, thick fog hides the draw distance, everything is bright and
// saturated, and the video output blurs the whole frame a little.
(function () {
  const T = window.THREE, U3 = window.U3, R = U3.retro;
  const P = {
    sky: ['#3E7BD6', '#9CC8F0', '#D8ECF8'], grass: ['#2E8A2A', '#3EA83A', '#6CCB4A'],
    soil: [['#9A5A28', '#B8702E', '#CC8438', '#DE9C4A'], ['#7E4626', '#94562C', '#A66634', '#B87A40'], ['#8A3424', '#A2442C', '#B85434', '#C86A40']],
    back: ['#5A2E1A', '#683820', '#744026'], chitin: ['#2A1410', '#3A1E16', '#4A281C'], chitinBand: '#C8642E', leg: '#2A1410',
    queen: ['#9A3A2E', '#B84C36', '#D0623E'], queenBand: '#FFD070', queenLeg: '#5A2418', food: ['#E8A020', '#F8C030', '#FFE070'],
    egg: ['#E8E0D0', '#F8F4E8', '#FFFFFF'], spider: ['#3A2A5A', '#4A3A70', '#5E4A88'], spiderBand: '#E83A5A', eye: '#FFE040',
    stone: ['#8A8A98', '#C8C8D8'],
  };
  const meta = {
    family: 'retro',
    label: 'N64',
    tagline: 'A Rare-era Nintendo 64 platformer: soft blurry textures, candy colours and fog that swallows the edges of the world.',
    refs: 'Banjo-Kazooie, Super Mario 64, Conker’s Bad Fur Day, Beetle Adventure Racing, Pseudoregalia and Beeny (N64-style indies)',
    matrix: ['Banjo-Kazooie, Mario 64', 'Low', 'High', 'High', 'High'],
    palette: [['Sky', P.sky[0]], ['Fog', '#B8D8F0'], ['Grass', P.grass[1]], ['Topsoil', P.soil[0][1]], ['Packed', P.soil[1][1]], ['Clay', P.soil[2][1]], ['Ant', P.chitin[1]], ['Band', P.chitinBand], ['Queen', P.queen[1]], ['Food', P.food[1]], ['Spider', P.spider[1]], ['Spider eye', P.eye]],
    rendering: 'Rendered at 320×213 and upscaled smoothly like the console’s video interface. 32 px textures use the N64’s three-point bilinear filter (a triangle of three texels, not four), so they smear rather than pixelate. Perspective-correct, no vertex wobble. 16-bit colour with light dithering, then a composite pass softens the frame.',
    motion: '30 fps. Legs, bob and the spider twitch on that clock; the bright lamps pulse gently.',
    fit: 'Friendly and heroic without being twee. The blur makes 200 ants read as one living mass while each caste still has a clear colour.',
    risks: 'The blur that makes it charming also softens fine detail on small phone screens, and fog can hide gameplay at the edges.',
    production: 'Very cheap: tiny textures, low-poly models, one texture-filter shader. Vertex-coloured lighting can stand in for lightmaps.',
  };
  const cfg = {
    P, renderWidth: 320, pixelated: false, fps: 30, filter: 'threepoint', texSize: 32,
    fog: ['#B8D8F0', 560, 1220],
    lamps: { kind: 'candle', color: '#FFC870', flame: '#FFF0A0', intensity: 1.6, body: '#E04A3A' },
    lights: { ambient: ['#B8C0D8', 1.0], sun: ['#FFF2D8', 1.05, [-300, 500, 400]] },
    post: [() => R.ditherPass(31, 0.7), () => R.compositePass({ chroma: 1.6, luma: 0.9, sat: 1.12 })],
  };
  U3.register('n64', { meta, create: (env) => R.build(env, cfg) });
})();
