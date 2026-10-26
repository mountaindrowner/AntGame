// The PS1 frame: render the scene into a small framebuffer, quantise it to
// 15-bit colour with an ordered dither, and let the browser upscale the
// canvas with nearest-neighbour. The canvas itself is low resolution, which
// is both the look and the cheapest thing a phone can do.
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
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, type: THREE.HalfFloatType,
    });
    this.post = new THREE.ShaderMaterial({
      uniforms: { tFrame: { value: this.target.texture }, levels: { value: RENDER.colorLevels }, dither: { value: 1 } },
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    this.quad.frustumCulled = false;
    this.postScene = new THREE.Scene();
    this.postScene.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.width = 0;
    this.height = 0;
  }

  // cssW × cssH is the on-screen size; the framebuffer is that divided by
  // the PS1 pixel size.
  resize(cssW, cssH) {
    const px = RENDER.pixelSize;
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
