// UNDERFOOT — the shared scene. Plain data only: every renderer draws exactly
// this, and none of them may change it (the object is deep-frozen below).
//
// Coordinates are world px on a 720×480 canvas. Headings are degrees:
// 0 = east, 90 = down, 180 = west, 270 = up. The brief gives positions but
// not directions; the headings below are the one interpretation all styles share.
(function () {
  const scene = {
    width: 720,
    height: 480,

    // Surface strip y 0–70, ground line at y = 70.
    groundY: 70,
    crumb: { x: 100, y: 60 },
    surfaceWorkers: [
      { x: 140, y: 60, carrying: false, heading: 0 },
      { x: 300, y: 60, carrying: true, heading: 0 },
    ],
    spider: { x: 628, y: 44, facing: -1 },

    soil: [
      { id: 'topsoil', y0: 70, y1: 220 },
      { id: 'packed', y0: 220, y1: 350 },
      { id: 'clay', y0: 350, y1: 480 },
    ],

    tunnels: [
      { id: 'shaft', x: 348, y: 70, w: 24, h: 330 },
      { id: 'corridorA', x: 120, y: 200, w: 480, h: 22 },
      { id: 'corridorB', x: 180, y: 330, w: 360, h: 22 },
    ],

    rooms: [
      { id: 'queen', label: "Queen's chamber", x: 392, y: 130, w: 120, h: 84 },
      { id: 'hatchery', label: 'Hatchery', x: 190, y: 130, w: 120, h: 84 },
      { id: 'store', label: 'Food store', x: 150, y: 266, w: 160, h: 84 },
      { id: 'barracks', label: 'Barracks', x: 420, y: 266, w: 180, h: 84 },
    ],

    queen: { x: 452, y: 180, length: 56, heading: 0 },

    eggs: [
      { x: 215, y: 195 }, { x: 235, y: 197 }, { x: 255, y: 194 },
      { x: 275, y: 196 }, { x: 225, y: 183 }, { x: 262, y: 182 },
    ],

    foodPiles: [
      { x: 175, y: 335 }, { x: 205, y: 335 }, { x: 235, y: 335 }, { x: 265, y: 335 },
    ],

    majors: [
      { x: 450, y: 330, heading: 0, resting: true },
      { x: 495, y: 330, heading: 0, resting: true },
      { x: 540, y: 330, heading: 0, resting: true },
    ],

    workers: [
      { x: 360, y: 150, carrying: false, heading: 90 },
      { x: 300, y: 211, carrying: true, heading: 180 },
      { x: 360, y: 300, carrying: false, heading: 270 },
      { x: 250, y: 341, carrying: true, heading: 180 },
      { x: 500, y: 211, carrying: false, heading: 0 },
    ],

    // Crumb → along the surface to the shaft → down to corridor A → west to
    // the hatchery door. Only styles whose section says so draw it.
    scentTrail: [
      { x: 100, y: 64 },
      { x: 360, y: 64 },
      { x: 360, y: 211 },
      { x: 250, y: 211 },
    ],

    // Animation rates from the brief (seconds / Hz).
    motion: {
      legHz: 6,
      carryBobHz: 3,
      carryBobPx: 1,
      spiderTwitchEvery: 2,
      eggPulseHz: 0.5,
      eggPulseScale: 0.04,
    },
  };

  function freeze(o) {
    Object.values(o).forEach((v) => { if (v && typeof v === 'object') freeze(v); });
    return Object.freeze(o);
  }

  window.UF_SCENE = freeze(scene);
})();
