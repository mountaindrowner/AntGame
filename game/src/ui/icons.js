// Small line icons for the HUD buttons (24×24, drawn in currentColor). Each
// button's name lives in its tooltip and aria-label; see ui.js.
const svg = (body) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  // Pick up: a crumb with an arrow lifting off it.
  pick: svg('<path d="M12 14V4M8 8l4-4 4 4"/><circle cx="12" cy="19" r="2.6" fill="currentColor"/>'),
  // Drop / set down: an arrow down onto the ground.
  drop: svg('<path d="M12 3v11M8 10l4 4 4-4"/><path d="M5 20h14"/>'),
  // Mark trail: a dotted path to a spot.
  trail: svg('<path d="M4 20c5 0 3-7 8-7s4-6 8-6" stroke-dasharray="1.5 3.2"/><circle cx="20" cy="7" r="2.2" fill="currentColor"/>'),
  // Recruit: an ant-head and a plus.
  recruit: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6"/><path d="M19 7v6M16 10h6"/>'),
  // Release: a crew scattering.
  release: svg('<circle cx="12" cy="12" r="2.6"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.4 2.4M16 16l2.4 2.4M18.4 5.6L16 8M8 16l-2.4 2.4"/>'),
  // Into the nest / out of it: an arrow and the hole.
  enter: svg('<path d="M12 3v10M8 9l4 4 4-4"/><ellipse cx="12" cy="18.5" rx="7.5" ry="2.6"/>'),
  exit: svg('<path d="M12 14V3M8 7l4-4 4 4"/><ellipse cx="12" cy="18.5" rx="7.5" ry="2.6"/>'),
  // Build nest (the queen digs in): a spade.
  dig: svg('<path d="M15 3l6 6M18 6l-7 7"/><path d="M11 13l-6 1-2 7 7-2 1-6z"/>'),
  // Queen: a crown.
  queen: svg('<path d="M4 19h16M5 19L4 8l5 4 3-7 3 7 5-4-1 11"/>'),
  // Build rooms: three bricks.
  build: svg('<rect x="3" y="12" width="8" height="6" rx="1"/><rect x="13" y="12" width="8" height="6" rx="1"/><rect x="8" y="5" width="8" height="6" rx="1"/>'),
  cancel: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  // Nest view: a tunnel under the ground line. Surface view: the sun.
  nest: svg('<path d="M2 7h20"/><path d="M8 7v5c0 2.2 1.8 4 4 4s4-1.8 4-4V7"/><path d="M4 21h16" opacity=".55"/>'),
  surface: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  map: svg('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  zoom: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M8 10.5h5M10.5 8v5"/>'),
  // Castes, for the queen's egg menu.
  forager: svg('<ellipse cx="9" cy="14" rx="3" ry="2.3"/><circle cx="14" cy="13" r="1.9"/><path d="M16 12l3-5M17 7c2-1 4 0 4 2-2 1-4 0-4-2z"/><path d="M7 16l-2 3M10 16l0 3M12 15l2 3"/>'),
  builder: svg('<path d="M14 4l6 6M17 7l-7 7"/><path d="M10 14l-5 1-1 5 5-1 1-5z"/>'),
  nurse: svg('<ellipse cx="12" cy="13" rx="5" ry="6.5"/><path d="M12 9.5c-1.4-1.6-3.8-.4-3 1.6.5 1.2 3 2.9 3 2.9s2.5-1.7 3-2.9c.8-2-1.6-3.2-3-1.6z" fill="currentColor"/>'),
  soldier: svg('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 8v8M9 11h6"/>'),
  venom: svg('<path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5"/>'),
  // Rooms, for the build catalog.
  hatchery: svg('<ellipse cx="8" cy="15" rx="3" ry="4"/><ellipse cx="16" cy="15" rx="3" ry="4"/><ellipse cx="12" cy="8" rx="3" ry="4"/>'),
  store: svg('<path d="M7 8c0-2 2-4 5-4s5 2 5 4"/><path d="M5 9h14l-1.5 11h-11z"/><path d="M9 13h6"/>'),
  cistern: svg('<path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z"/><path d="M8 15h8" opacity=".6"/>'),
  nursery: svg('<path d="M4 12a8 8 0 0 0 16 0z"/><path d="M4 12h16M7 20l2-3M17 20l-2-3"/><ellipse cx="12" cy="9" rx="2.5" ry="3"/>'),
  barracks: svg('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
  workshop: svg('<path d="M14 6l4 4-8 8-4-4z"/><path d="M14 6l2-2 4 4-2 2M6 14l-3 3 4 4 3-3"/>'),
  train: svg('<path d="M4 18l5-5 4 3 7-8"/><path d="M15 8h5v5"/>'),
  // Main menu: play, new, options, the film, back.
  play: svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  plus: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>'),
  film: svg('<rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M3 8l2.5-4 4 1-2.5 4M10 5l4 1-2.5 4M15 6l4 1-2 3"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.4"/><circle cx="12" cy="17.2" r=".9" fill="currentColor"/>'),
};
