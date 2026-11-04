// Ground beetle.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import { HIT, flashed, wrapAngle } from '../surfaceKit.js';
import { BEETLE_FRAMES } from '../../models/bosses.js';
import { FOOD } from '../../models/food.js';
import * as THREE from 'three';

const tmpV = new THREE.Vector3(), tmpQ2 = new THREE.Quaternion();

export function drawBeetle(v, ctx) {
  const { s, t, fdt, B, F, tele } = ctx;
  const gb = B.beetle, BA = v.beetleAnim;
  const showGb = gb && (!gb.dead || s.t - gb.deadT < 14);
  v.beetle.visible = !!showGb;
  if (showGb) {
    tele(gb);
    const d = Math.hypot(gb.x - BA.x, gb.y - BA.y);
    if (d > 0.05 && d < 100) { BA.phase += d / (gb.charge ? 18 : 10); BA.moved = t; }
    BA.x = gb.x; BA.y = gb.y;
    const aim = Math.atan2(-(gb.dy || 0), gb.dx || 1); BA.yaw += wrapAngle(aim - BA.yaw) * Math.min(1, fdt * (gb.charge ? 20 : 6));
    const fr = Math.floor(BA.phase * BEETLE_FRAMES) % BEETLE_FRAMES, k = 4.2;
    let geo = v.beetleGeo.stand, roll = 0, pitch = 0, y = 0, shiver = 0;
    if (gb.dead) { geo = v.beetleGeo.dazed[Math.floor(t * 3) % 2 && s.t - gb.deadT < 3 ? 1 : 0]; roll = Math.PI * Math.min(1, (s.t - gb.deadT) / 0.5); y = 5 * k * Math.min(1, (s.t - gb.deadT) / 0.5) - Math.max(0, (s.t - gb.deadT - 10) / 4) * 20; }
    else if (gb.dazeT > 0) { geo = v.beetleGeo.dazed[Math.floor(t * 8) % 2]; roll = Math.sin(t * 5) * 0.25;
      // Stars round its head while it's dazed.
      for (let j = 0; j < 3; j++) { const a = t * 4 + j * 2.1; tmpV.set(gb.x + Math.cos(a) * 18, 38 + Math.sin(t * 6 + j) * 3, gb.y + Math.sin(a) * 18); F.pushAt('star', FOOD.star, tmpV, v.camera.quaternion, 9, '#ffe060'); } }
    else if (gb.charge) { geo = v.beetleGeo.charge[fr]; pitch = -0.08; }
    else if (gb.atk) { geo = v.beetleGeo.charge[0]; pitch = -0.12; shiver = Math.sin(t * 50) * 1.2; }
    else geo = t - BA.moved < 0.2 ? v.beetleGeo.walk[fr] : v.beetleGeo.stand;
    v.beetle.geometry = geo;
    v.beetle.position.set(gb.x + shiver, y, gb.y);
    v.beetle.rotation.set(roll, BA.yaw, pitch);
    v.beetle.scale.setScalar(k);
    if (!gb.dead && !flashed(s, B.hornworm || {})) v.bossMat.color.set(flashed(s, gb) ? HIT : '#ffffff');
    if (!gb.dead && gb.hp < gb.maxHp) ctx.bar(gb.x, gb.y, 44, gb.hp / gb.maxHp, '#b04ad0');
    // Dust kicked up as it paws the ground and charges.
    if (gb.charge || gb.atk) for (let j = 0; j < 3; j++) { const a = t * 13 + j * 2; tmpV.set(gb.x - (gb.dx || 1) * 26 + Math.cos(a) * 8, 3 + (t * 20 + j * 3) % 8, gb.y - (gb.dy || 0) * 26 + Math.sin(a) * 8); F.pushAt('dot', v.dotGeo, tmpV, tmpQ2.identity(), 2.4, '#a89070'); }
  }
}
