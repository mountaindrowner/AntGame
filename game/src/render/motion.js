// Tells moving creatures from still ones, so idle ants can stand and breathe
// instead of walking on the spot. The sim has no "moving" flag; position
// change between frames is the honest signal.
export class MotionTracker {
  constructor() {
    this.entries = new Map();
    this.frame = 0;
  }

  // True if (x, y) changed within the last `hold` seconds.
  moving(id, x, y, t, hold = 0.25) {
    let e = this.entries.get(id);
    if (!e) { e = { x, y, last: -1e9, seen: 0 }; this.entries.set(id, e); }
    if (Math.abs(x - e.x) + Math.abs(y - e.y) > 0.01) e.last = t;
    e.x = x;
    e.y = y;
    e.seen = this.frame;
    return t - e.last < hold;
  }

  // Call once per frame; forgets creatures that have not been seen for a while.
  sweep() {
    this.frame++;
    if (this.frame % 300) return;
    for (const [k, e] of this.entries) if (this.frame - e.seen > 120) this.entries.delete(k);
  }
}

// Idle pose for a still ant: which walk frame to show and how to breathe.
// Builders at work scrape, fighters bite, everyone else stands and breathes.
export function idlePose(a, t) {
  if (a.state === 'fight') return { frame: Math.floor(t * 14) % 2, breathe: 0 };
  if (a.state === 'build') return { frame: Math.floor(t * 5) % 2, breathe: 0 };
  return { frame: -1, breathe: Math.sin(t * 2.4 + a.id * 1.7) };
}
