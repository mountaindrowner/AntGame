// PS1 ON A CRT — the PS1 look as players actually saw it: a 384-line frame
// pushed through a living-room tube with scanlines, an aperture grille,
// convergence error and a curved glass face.
(function () {
  const T = window.THREE, U3 = window.U3, R = U3.retro;
  const P = {
    sky: ['#241A3A', '#6A3A4A', '#B85C36'], grass: ['#2E4A1A', '#3A5E22', '#4F7A2E'],
    soil: [['#4E3220', '#6E4A2E', '#7E5634', '#94683E'], ['#4A3426', '#5E4434', '#6E5440', '#7E644C'], ['#5A2A1C', '#7A3E2A', '#8A4A30', '#9A5A3A']],
    back: ['#4A3628', '#4E3A2B', '#523D2D'], chitin: ['#100A07', '#170E09', '#1E130C'], chitinBand: '#8A6444', leg: '#140C08',
    queen: ['#6E3422', '#8A4630', '#9A5638'], queenBand: '#E0A070', queenLeg: '#3A2418', food: ['#A87018', '#D8A030', '#F0C050'],
    egg: ['#C8BCA0', '#E8DCC0', '#F8F0E0'], spider: ['#1A141E', '#2A2230', '#3A3040'], spiderBand: '#5A2A2A', eye: '#FF2A2A',
  };
  const meta = {
    family: 'retro',
    label: 'PS1 on a CRT',
    tagline: 'The PS1 winner as it looked in 1998: through a curved tube with scanlines, an aperture grille and colour that bleeds sideways.',
    refs: 'MediEvil, Silent Hill (1999), Haunted PS1 indies played through CRT shaders, Signalis (CRT menus), Lunacid',
    matrix: ['PS1 classics on a real TV', 'Low', 'High', 'Medium', 'High'],
    palette: [['Dusk', P.sky[0]], ['Horizon', P.sky[2]], ['Topsoil', P.soil[0][1]], ['Packed', P.soil[1][1]], ['Clay', P.soil[2][1]], ['Chitin', P.chitin[1]], ['Band', P.chitinBand], ['Queen', P.queen[1]], ['Food', P.food[1]], ['Eye glow', P.eye], ['Candle', '#FFC060']],
    rendering: 'Identical scene and quirks to PS1 retro (384×256, vertex snap, affine textures, 15-bit dither), then a full-resolution CRT pass: barrel curvature, scanlines that follow the source rows, an RGB aperture grille, horizontal phosphor bleed, red/blue convergence error, vignette and rounded tube corners.',
    motion: '20 fps stepped like PS1 retro; a faint rolling hum bar drifts down the glass.',
    fit: 'Everything that won with PS1 retro, plus the warmth that softens the dither. Pixel noise turns into texture, so the nest feels less harsh and more nostalgic.',
    risks: 'Curvature and mask cost a little legibility on small phones; offer the CRT as a toggle rather than forcing it.',
    production: 'Free on top of PS1 retro: one extra full-screen shader. Ship it as an options-menu filter.',
  };
  const cfg = {
    P, crt: 384, fps: 20, snap: [96, 64], affine: true, filter: 'nearest', texSize: 32,
    fog: ['#1A1016', 760, 1400],
    lamps: { kind: 'candle', color: '#FFA040', flame: '#FFC060', intensity: 3.2 },
    lights: { ambient: ['#6A5A7A', 0.7], lantern: ['#FFD8A0', 0.7], sun: ['#C8B8E8', 0.65] },
    eyeGlow: '#FF3020',
    post: [() => R.ditherPass(22)],
  };
  U3.register('ps1crt', { meta, create: (env) => R.build(env, cfg) });
})();
