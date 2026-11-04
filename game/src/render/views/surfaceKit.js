// Small helpers the yard view and its boss views (views/bosses/) share.
export const HIT = '#ff7a6a'; // the flash on whatever a bite lands on
// Under attack it flickers, so a long fight doesn't just turn it red.
export const flashed = (s, o) => s.t - (o.hitT ?? -9) < 0.12 && (s.t * 9) % 1 < 0.5;
// An angle brought into -π..π, for turning the short way round.
export const wrapAngle = (a) => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));
