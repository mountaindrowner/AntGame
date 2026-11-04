// The antlion queen.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import SIM from '../../../sim/sim.js';
import { HIT, flashed, wrapAngle } from '../surfaceKit.js';

import * as THREE from 'three';
const { T } = SIM;
const tmpV = new THREE.Vector3(), tmpQ2 = new THREE.Quaternion();

export function drawAntlion(v, ctx) {
  const { s, t, fdt, B, F, tele } = ctx;
  const al = B.antlion, AA = v.antlionAnim;
  const showAl = al && (!al.dead || s.t - al.deadT < 14);
  v.antlion.visible = !!showAl;
  if (showAl) {
    tele(al);
    AA.up += ((al.dead ? 1 : al.under || al.move ? 0 : 1) - AA.up) * Math.min(1, fdt * (al.under ? 4 : 10));
    const tg = (al.atk && al.atk.x != null) ? al.atk : v.target ? { x: v.target.x, y: v.target.z } : null;
    if (tg) { const aim = Math.atan2(-(tg.y - al.y), tg.x - al.x); AA.yaw += wrapAngle(aim - AA.yaw) * Math.min(1, fdt * 3); }
    const k = 6, snap = s.t - (al.snapAt ?? -9) < 0.25 || (al.atkDone && al.atkDone.kind === 'grab' && s.t - al.atkDone.t < 0.3);
    v.antlion.geometry = v.antlionGeo[snap || (al.atk && al.atk.kind !== 'grab') ? 0 : 1];
    v.antlion.position.set(al.x, -k * 3.6 * (1 - AA.up) + 5 * AA.up + (al.dead ? -Math.max(0, (s.t - al.deadT - 10) / 4) * 20 : 0), al.y);
    v.antlion.rotation.set(al.dead ? 1.2 : 0, AA.yaw, al.dead ? 0 : 0.15 + 0.3 * AA.up);
    v.antlion.scale.setScalar(k);
    if (!al.dead && !flashed(s, B.hornworm || {}) && !flashed(s, B.beetle || {})) v.bossMat.color.set(flashed(s, al) ? HIT : '#ffffff');
    // Sand: a swirl over her while she waits, a burst when she surfaces, a trail when she tunnels.
    if (!al.dead && al.under && !al.move) for (let j = 0; j < 6; j++) { const a = t * 1.5 + j * 1.05, r = 14 + (j % 3) * 6; tmpV.set(al.x + Math.cos(a) * r, 1.5, al.y + Math.sin(a) * r); F.pushAt('dot', v.dotGeo, tmpV, tmpQ2.identity(), 2.2, '#d8c090'); }
    if (al.atkDone && al.atkDone.kind === 'surface' && s.t - al.atkDone.t < 0.8 || (!al.under && AA.up < 0.9)) for (let j = 0; j < 8; j++) { const a = j * 0.8 + t, u = (t * 2) % 1; tmpV.set(al.x + Math.cos(a) * u * 40, Math.sin(u * Math.PI) * 30, al.y + Math.sin(a) * u * 40); F.pushAt('dot', v.dotGeo, tmpV, tmpQ2.identity(), 3, '#e0cc98'); }
    if (al.move) { const w = s.world, p0 = w.pits[al.move.from], p1 = w.pits[al.move.to], u = Math.min(1, al.move.t / 2); for (let j = 0; j < 5; j++) { const f = Math.max(0, u - j * 0.05); tmpV.set((p0.x + (p1.x - p0.x) * f) * T, 2 + Math.sin(t * 20 + j) * 2, (p0.y + (p1.y - p0.y) * f) * T); F.pushAt('dot', v.dotGeo, tmpV, tmpQ2.identity(), 3.5, '#c8a870'); } }
    if (!al.dead && !al.under && al.hp < al.maxHp) ctx.bar(al.x, al.y, 46, al.hp / al.maxHp, '#b04ad0');
  }
}
