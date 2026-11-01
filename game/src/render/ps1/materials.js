// PS1 materials: Lambert lighting with two hardware quirks patched in.
// - Vertex snapping: clip-space positions round to a coarse screen grid, so
//   geometry wobbles as the camera moves.
// - Affine texture mapping (optional, off by default): UVs interpolate
//   without perspective correction, so textures swim across big polygons.
import * as THREE from 'three';

let shared = null;

// Call once with the pipeline's shared uniforms before creating materials.
export function useSnapUniforms(uniforms) { shared = uniforms; if (!shared.uSee) shared.uSee = { value: new THREE.Vector4(0, 0, 0, 0) }; }
// Build 20: the see-through hole. Rocks and props between the camera and
// your ant dither away in a circle round it (x, y in NDC, r in NDC height,
// depth: your ant's distance from the camera). r = 0 turns it off.
export function setSeeHole(x, y, r, depth) { if (shared && shared.uSee) shared.uSee.value.set(x, y, r, depth); }

// Affine mapping is off by default since build 10.3 (textures swam); pass
// { affine: true } for the old wobble.
function patch(material, { snap = true, affine = false, see = false } = {}) {
  const key = 'psx' + (snap ? 's' : '') + (affine ? 'a' : '') + (see ? 'x' : '');
  material.customProgramCacheKey = () => key;
  material.onBeforeCompile = (sh) => {
    if (snap) sh.uniforms.uSnap = shared.uSnap;
    let vs = sh.vertexShader, fs = sh.fragmentShader;
    if (snap) vs = 'uniform vec2 uSnap;\n' + vs;
    if (affine) {
      vs = 'varying vec3 vAffine;\n' + vs;
      fs = 'varying vec3 vAffine;\n' + fs;
    }
    let proj = '#include <project_vertex>';
    if (snap) {
      proj += `
      {
        vec4 p = gl_Position;
        p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w;
        gl_Position = p;
      }`;
    }
    if (affine) {
      proj += `
      #ifdef USE_MAP
        vAffine = vec3(vMapUv * gl_Position.w, gl_Position.w);
      #endif`;
    }
    vs = vs.replace('#include <project_vertex>', proj);
    if (affine) {
      fs = fs.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vAffine.xy / vAffine.z );
        diffuseColor *= sampledDiffuseColor;
      #endif`);
    }
    if (see) {
      // A screen-door hole (ordered 4×4 dither) round your ant, for anything nearer the camera than it.
      sh.uniforms.uSee = shared.uSee; sh.uniforms.uSnapS = shared.uSnap;
      sh.vertexShader = 'varying float vSeeZ;\n' + vs.replace('#include <project_vertex>', '#include <project_vertex>\n vSeeZ = -mvPosition.z;');
      fs = 'uniform vec4 uSee;\nuniform vec2 uSnapS;\nvarying float vSeeZ;\n' + fs.replace('void main() {', `void main() {
        if (uSee.z > 0.0 && vSeeZ < uSee.w) {
          vec2 nd = gl_FragCoord.xy / uSnapS * 2.0 - 1.0 - uSee.xy; nd.x *= uSnapS.x / uSnapS.y;
          float rr = length(nd);
          if (rr < uSee.z) {
            float f = 1.0 - smoothstep(uSee.z * 0.5, uSee.z, rr);
            vec2 q = mod(floor(gl_FragCoord.xy), 4.0);
            float b = mod(q.x * 4.0 + q.y * 11.0, 16.0); b = (mod(b * 7.0, 16.0) + 0.5) / 16.0;
            if (b < f * 0.85) discard;
          }
        }`);
      sh.fragmentShader = fs;
      return;
    }
    sh.vertexShader = vs;
    sh.fragmentShader = fs;
  };
  return material;
}

// Lit and snapped. Pass any MeshLambertMaterial params.
export function psx(params = {}, quirks) {
  return patch(new THREE.MeshLambertMaterial(params), quirks);
}

// Unlit (flames, eyes, markers) but still snapped.
export function psxBasic(params = {}, quirks) {
  return patch(new THREE.MeshBasicMaterial(params), Object.assign({ affine: false }, quirks));
}
