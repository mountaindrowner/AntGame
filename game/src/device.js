// The phone layer (docs/PHONE.md): one place that decides, once at startup, whether this is a phone. Everything for
// phones hangs off it: the `phone` class on <html> for the layout, and `isPhone` for behaviour. On anything else the
// game runs exactly as before (scripts/desktop-guard.mjs checks that, screen by screen).
//
// A phone: a touch screen with no mouse whose short side is under 500 points (the physical screen, not the window,
// so a narrow desktop window never flips it). Options → Layout can force either way.
export const LAYOUTS = [['auto', 'Auto'], ['phone', 'Phone'], ['desktop', 'Desktop']];

export function detectPhone(layout) {
  if (layout === 'phone') return true;
  if (layout === 'desktop') return false;
  try {
    const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    return touchOnly && Math.min(screen.width, screen.height) < 500;
  } catch (e) { return false; }
}

// iPhone Safari's own gestures that fight a game: the long-press magnifier and callout, double-tap zoom, page pinch.
// (Pointer events still reach the game; only the browser's defaults are stopped.)
export function phoneGuards(canvas) {
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ } // (the silent switch no longer mutes the game)
}
