// Turn a 2D field into polygons: marching squares, loop tracing, simplify,
// then THREE.Shapes with holes. Used for the nest's rounded tunnels.
import * as THREE from 'three';

// Loops where f crosses zero (negative = inside), sampled every `step`.
export function contours(f, x0, y0, x1, y1, step) {
  const nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1;
  const v = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = f(x0 + i * step, y0 + j * step);
  const pts = new Map();
  const edge = (key, ax, ay, av, bx, by, bv) => {
    if (!pts.has(key)) { const t = av / (av - bv); pts.set(key, [ax + (bx - ax) * t, ay + (by - ay) * t]); }
    return key;
  };
  const segs = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
    const xa = x0 + i * step, ya = y0 + j * step, xb = xa + step, yb = ya + step;
    const E = [];
    // Numeric edge ids: horizontal edges even, vertical edges odd.
    const H = (ii, jj) => (jj * nx + ii) * 2, Vt = (ii, jj) => (jj * nx + ii) * 2 + 1;
    if ((a < 0) !== (b < 0)) E.push(edge(H(i, j), xa, ya, a, xb, ya, b));
    if ((b < 0) !== (c < 0)) E.push(edge(Vt(i + 1, j), xb, ya, b, xb, yb, c));
    if ((d < 0) !== (c < 0)) E.push(edge(H(i, j + 1), xa, yb, d, xb, yb, c));
    if ((a < 0) !== (d < 0)) E.push(edge(Vt(i, j), xa, ya, a, xa, yb, d));
    if (E.length === 2) segs.push(E);
    else if (E.length === 4) {
      if ((a < 0) === ((a + b + c + d) / 4 < 0)) segs.push([E[0], E[1]], [E[2], E[3]]);
      else segs.push([E[0], E[3]], [E[1], E[2]]);
    }
  }
  const adj = new Map();
  segs.forEach((sg, k) => sg.forEach((key) => { if (!adj.has(key)) adj.set(key, []); adj.get(key).push(k); }));
  const used = new Uint8Array(segs.length);
  const loops = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const start = segs[k][0];
    let cur = segs[k][1];
    const loop = [pts.get(start)];
    for (let guard = 0; cur !== start && guard < 500000; guard++) {
      loop.push(pts.get(cur));
      const next = adj.get(cur).find((n) => !used[n]);
      if (next == null) break;
      used[next] = 1;
      cur = segs[next][0] === cur ? segs[next][1] : segs[next][0];
    }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}

// Ramer–Douglas–Peucker on a closed loop.
export function simplify(pts, tol) {
  if (pts.length < 8) return pts;
  const rdp = (a, b) => {
    let dmax = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
      if (d > dmax) { dmax = d; idx = i; }
    }
    return dmax > tol ? rdp(a, idx).slice(0, -1).concat(rdp(idx, b)) : [pts[a], pts[b]];
  };
  const mid = Math.floor(pts.length / 2);
  const out = rdp(0, mid).slice(0, -1).concat(rdp(mid, pts.length - 1));
  return out.length >= 3 ? out : pts;
}

const area = (p) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Region where f < 0 as THREE.Shapes. map(x, y) → [X, Y] converts to world.
export function shapesFromField(f, bounds, step, tol, map) {
  let loops = contours(f, bounds[0], bounds[1], bounds[2], bounds[3], step).map((l) => simplify(l, tol));
  loops = loops.filter((l) => Math.abs(area(l)) > step * step * 2);
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const depth = loops.map((l, i) => loops.slice(0, i).filter((m) => inside(l[0], m)).length);
  const toV = (l) => l.map(([x, y]) => { const [X, Y] = map(x, y); return new THREE.Vector2(X, Y); });
  const shapes = [];
  loops.forEach((l, i) => {
    if (depth[i] % 2) return;
    const shape = new THREE.Shape(toV(l));
    loops.forEach((h, k) => { if (depth[k] === depth[i] + 1 && inside(h[0], l)) shape.holes.push(new THREE.Path(toV(h))); });
    shapes.push(shape);
  });
  return shapes;
}
