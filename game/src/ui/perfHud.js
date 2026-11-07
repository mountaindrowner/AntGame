// Build 80: a hidden performance readout (F3, or ?perf in the address). Where each frame goes on the machine
// you're playing on: the simulation, updating the scene, handing it to the GPU, and the whole frame, with how
// many draw calls and triangles that was. docs/PERFORMANCE.md says what to do with the numbers.
const N = 120; // frames kept (about two seconds)

export class PerfHud {
  constructor(renderer) {
    this.r = renderer; this.on = /[?&]perf\b/.test(location.search);
    this.k = 0; this.n = 0; this.t0 = 0; this.lastShow = 0;
    this.buf = { frame: new Float32Array(N), sim: new Float32Array(N), update: new Float32Array(N), draw: new Float32Array(N), ticks: new Float32Array(N) };
    const el = (this.el = document.createElement('pre'));
    el.id = 'perfhud';
    el.style.cssText = 'position:fixed;left:8px;bottom:110px;z-index:60;margin:0;padding:6px 8px;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#d8f5c8;background:rgba(0,0,0,.72);border-radius:4px;pointer-events:none;white-space:pre;display:none';
    document.body.appendChild(el);
    window.addEventListener('keydown', (e) => { if (e.key === 'F3' && !e.repeat) { e.preventDefault(); this.toggle(); } });
    this.toggle(this.on);
  }
  toggle(on = !this.on) {
    this.on = on; this.el.style.display = on ? 'block' : 'none';
    this.r.info.autoReset = !on; // (counts both passes of a frame: the scene and the PS1 post pass)
  }
  // The frame loop calls these around its parts.
  begin(now) { if (!this.on) return; if (this.t0) this.put('frame', now - this.t0); this.t0 = now; this.r.info.reset(); this.mark = now; this.ticks = 0; }
  lap(part) { if (!this.on) return; const t = performance.now(); this.put(part, t - this.mark); this.mark = t; }
  tick() { if (this.on) this.ticks++; }
  put(part, v) { this.buf[part][this.k] = v; }
  end(app, pipeline) {
    if (!this.on) return;
    this.put('ticks', this.ticks); this.k = (this.k + 1) % N; this.n = Math.min(N, this.n + 1);
    const now = performance.now(); if (now - this.lastShow < 250) return; this.lastShow = now;
    const q = (part, p) => { const a = Array.from(this.buf[part].subarray(0, this.n)).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; };
    const avg = (part) => { let t = 0; for (let i = 0; i < this.n; i++) t += this.buf[part][i]; return this.n ? t / this.n : 0; };
    const f = (v) => v.toFixed(1).padStart(5);
    const s = app.s, ants = s.ants.filter((a) => a.state !== 'dead').length, ri = this.r.info;
    const fr = avg('frame'), busy = avg('sim') + avg('update') + avg('draw');
    this.el.textContent = [
      `fps ${app.fps || 0}   frame ${f(q('frame', 0.5))} ms  (95%: ${f(q('frame', 0.95))})`,
      `sim     ${f(avg('sim'))} ms  ${(avg('ticks')).toFixed(1)} ticks/frame`,
      `update  ${f(avg('update'))} ms  (scene, models, labels)`,
      `draw    ${f(avg('draw'))} ms  (handing it to the GPU)`,
      `waiting ${f(Math.max(0, fr - busy))} ms  (GPU, browser, vsync)`,
      `calls ${ri.render.calls}  tris ${ri.render.triangles}  geo ${ri.memory.geometries}  tex ${ri.memory.textures}`,
      `ants ${ants}  bugs ${(s.critters || []).length}  ${pipeline.width}×${pipeline.height}  quality step ${pipeline.quality}`,
    ].join('\n');
  }
}
