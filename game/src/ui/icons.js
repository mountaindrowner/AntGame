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
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.4"/><circle cx="12" cy="17.2" r=".9" fill="currentColor"/>'),
};
