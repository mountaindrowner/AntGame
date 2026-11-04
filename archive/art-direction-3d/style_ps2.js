// PS2 / "HAUNTED PS2" — a step up in polygons and texture size, swallowed by
// heavy fog, lit by a flashlight, finished with bloom, film grain and the
// faint comb of an interlaced 480i signal.
(function () {
  const T = window.THREE, U3 = window.U3, R = U3.retro;
  const P = {
    sky: ['#3A403A', '#5E665A', '#7A8272'], grass: ['#2E3A24', '#3E4A2E', '#55603E'],
    soil: [['#3A3026', '#4A3E30', '#5A4C3A', '#6A5A44'], ['#33302A', '#423D34', '#524A3E', '#605848'], ['#4A2E26', '#5A3A30', '#6A463A', '#7A5444']],
    back: ['#2A2620', '#302B24', '#363028'], chitin: ['#0E0B09', '#16110D', '#1E1712'], chitinBand: '#5A4A3A', leg: '#0E0B09',
    queen: ['#4A2A24', '#5E362E', '#72443A'], queenBand: '#B89070', queenLeg: '#2A1A16', food: ['#8A7A40', '#A89450', '#C4B068'],
    egg: ['#B8B4A4', '#CCC8B8', '#E0DCCC'], spider: ['#121214', '#1C1C20', '#26262C'], spiderBand: '#4A2020', eye: '#FF2020',
    stone: ['#5A5A54', '#7A7A72'],
  };
  const meta = {
    family: 'retro',
    label: 'Haunted PS2',
    tagline: 'A 2001 survival-horror nest: heavy fog, a wandering flashlight, glowing highlights, film grain and the comb of an interlaced TV.',
    refs: 'Silent Hill 2 and 3, Fatal Frame, ICO, Shadow of the Colossus, Haunted PS2 indies, Sorry We’re Closed',
    matrix: ['Silent Hill 2, ICO', 'Medium', 'Medium', 'Medium', 'High'],
    palette: [['Fog', '#7A8070'], ['Topsoil', P.soil[0][2]], ['Packed', P.soil[1][2]], ['Clay', P.soil[2][2]], ['Chitin', P.chitin[1]], ['Queen', P.queen[1]], ['Food', P.food[1]], ['Egg', P.egg[1]], ['Spider', P.spider[1]], ['Eye', P.eye], ['Flashlight', '#FFF2D0']],
    rendering: 'Rendered at 640×427 with smooth 64 px textures and rounder models: the PS2 jump. Heavy distance fog, a spotlight that sweeps the nest like a held flashlight, Unreal-style bloom on lit edges, then a pass for film grain, desaturation, a green-grey grade, interlace lines and a strong vignette.',
    motion: '30 fps. The flashlight drifts slowly across the nest; grain boils every frame; dim lamps flicker.',
    fit: 'Gives the colony real dread: the spider above and the dark below. Strong if the game leans into survival and predators.',
    risks: 'Dark and murky: castes are hard to read at 0.6× and on bright phone screens outdoors. A whole game of this needs a lighter mode.',
    production: 'Moderate: bloom and the grain pass cost fill rate on phones. Models and textures stay small and cheap.',
  };
  const cfg = {
    P, renderWidth: 640, pixelated: false, fps: 30, filter: 'linear', texSize: 64, creatureSegments: 14,
    fog: ['#7A8070', 560, 1500],
    lamps: { kind: 'candle', color: '#FFB060', flame: '#FFE0A0', intensity: 2.2, body: '#8A8070' },
    lights: { ambient: ['#7A8278', 0.95], flashlight: ['#FFF2D0', 3.2], sun: ['#B0B8A8', 0.45] },
    eyeGlow: '#FF2020',
    prePost: [(low) => new T.UnrealBloomPass(new T.Vector2(low[0], low[1]), 0.55, 0.5, 0.72)],
    post: [() => R.grainPass({ amount: 0.09, interlace: 0.1, tint: [0.96, 1.02, 0.94], desat: 0.3, vignette: 0.55 })],
  };
  U3.register('ps2', { meta, create: (env) => R.build(env, cfg) });
})();
