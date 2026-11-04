// The Cordyceps Colony (build 56): a great pale fungal stalk on a grey mound of dead ants, pulsing; a spore
// cloud's ring shows where it will burst.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import { flashed } from '../surfaceKit.js';
import { cordycepsHeart } from '../../models/wildBosses.js';


export function drawCordyceps(v, ctx) {
  const { s, t, B, tele } = ctx;
  const hz = B.hollow;
  if (hz && !v.heart) { v.heart = cordycepsHeart(); v.heart.mats = []; v.heart.group.traverse((o) => { if (o.material && o.material.vertexColors) v.heart.mats.push(o.material); }); v.dyn.add(v.heart.group); } // build 59
  if (v.heart) {
    const H = v.heart, show = hz && (!hz.dead || s.t - hz.deadT < 8); H.group.visible = !!show;
    if (show) {
      tele(hz);
      const rage = hz.phase === 2, wilt = hz.dead ? Math.min(1, (s.t - hz.deadT) / 8) : 0, beat = 1 + 0.05 * Math.sin(t * (rage ? 7 : 4));
      H.group.position.set(hz.x, -wilt * 40, hz.y); H.group.scale.set(1, (1 - wilt * 0.5) * beat, 1);
      const burst = hz.sporeAt != null && s.t - hz.sporeAt < 0.6 ? 1 - (s.t - hz.sporeAt) / 0.6 : 0;
      H.haze.scale.set(70 + burst * 60, 55 + burst * 40, 70 + burst * 60); H.haze.material.opacity = hz.dead ? 0 : 0.12 + 0.06 * Math.sin(t * 2) + burst * 0.25;
      H.pustules.forEach((m, i) => { const k = 1 + 0.35 * Math.sin(t * (rage ? 9 : 5) + i * 1.7); m.scale.setScalar(hz.dead ? 0.4 : k); m.visible = !hz.dead || Math.sin(t * 20 + i) > 0; });
      const col = !hz.dead && flashed(s, hz) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : (hz.guards || 0) >= 6 ? '#b8b4a0' : '#ffffff';
      for (const m of H.mats) m.color.set(col);
      if (!hz.dead && hz.hp < hz.maxHp) ctx.bar(hz.x, hz.y, 220, hz.hp / hz.maxHp, '#8a9470');
    }
  }
}
