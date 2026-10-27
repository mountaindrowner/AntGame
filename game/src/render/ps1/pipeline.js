// The PS1 frame: render the scene into a framebuffer (multisampled, so edges
// are smooth), quantise its colour lightly with an ordered dither, and let
// the browser upscale the canvas with nearest-neighbour. Since build 10.3 the
// framebuffer is about the CSS size of the window, so the look comes from
// the models, textures and lighting rather than from big chunky pixels.
import * as THREE from 'three';
import { RENDER } from '../../config.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
  uniform sampler2D tFrame; uniform float levels; uniform float dither; varying vec2 vUv;
  float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
  float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  vec3 toSRGB(vec3 c){
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }
  void main(){
    vec3 c = toSRGB(texture2D(tFrame, vUv).rgb);
    float b = (bayer4(gl_FragCoord.xy) - 0.5) * dither;
    gl_FragColor = vec4(clamp(floor(c * levels + b + 0.5) / levels, 0.0, 1.0), 1.0);
  }`;

export class PS1Pipeline {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = true;
    // Shared by every PS1 material: the grid vertices snap to.
    this.uniforms = { uSnap: { value: new THREE.Vector2(160, 120) } };
    this.target = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, type: THREE.HalfFloatType, samples: RENDER.msaa,
    });
    this.post = new THREE.ShaderMaterial({
      uniforms: { tFrame: { value: this.target.texture }, levels: { value: RENDER.colorLevels }, dither: { value: RENDER.dither } },
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    this.quad.frustumCulled = false;
    this.postScene = new THREE.Scene();
    this.postScene.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.width = 0;
    this.height = 0;
    this.quality = 0;
  }

  // Quality steps, best first: [pixel size multiplier, MSAA samples]. The
  // game starts at 0 and steps down if it can't hold its frame rate.
  static QUALITY = [[1, RENDER.msaa], [1, 0], [1.5, 0], [2, 0]];
  setQuality(q) {
    q = Math.max(0, Math.min(PS1Pipeline.QUALITY.length - 1, q));
    if (q === this.quality) return false;
    this.quality = q;
    this.target.samples = PS1Pipeline.QUALITY[q][1];
    this.target.dispose(); // rebuilt with the new sample count on next use
    this.width = 0; // force a resize
    if (this.cssW) this.resize(this.cssW, this.cssH);
    return true;
  }

  // cssW × cssH is the on-screen size; the framebuffer is that divided by
  // the PS1 pixel size, rounded so each PS1 pixel covers a whole number of
  // device pixels (uneven pixel widths shimmer as things move).
  // A very big window renders at a coarser pixel so the frame stays under
  // RENDER.maxPixels.
  resize(cssW, cssH) {
    this.cssW = cssW; this.cssH = cssH;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.max(RENDER.pixelSize * PS1Pipeline.QUALITY[this.quality][0], Math.sqrt((cssW * cssH) / RENDER.maxPixels));
    const px = Math.max(1, Math.round(size * dpr)) / dpr;
    const w = Math.max(64, Math.round(cssW / px)), h = Math.max(64, Math.round(cssH / px));
    if (w === this.width && h === this.height) return false;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.target.setSize(w, h);
    // Snap to a grid coarser than the framebuffer so the wobble shows.
    this.uniforms.uSnap.value.set(w / RENDER.snapDivisor, h / RENDER.snapDivisor);
    return true;
  }

  get aspect() { return this.width / Math.max(1, this.height); }

  render(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }
}
