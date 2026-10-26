// PS1 materials: Lambert lighting with two hardware quirks patched in.
// - Vertex snapping: clip-space positions round to a coarse screen grid, so
//   geometry wobbles as the camera moves.
// - Affine texture mapping: UVs interpolate without perspective correction,
//   so textures swim across big polygons.
import * as THREE from 'three';

let shared = null;

// Call once with the pipeline's shared uniforms before creating materials.
export function useSnapUniforms(uniforms) { shared = uniforms; }

function patch(material, { snap = true, affine = true } = {}) {
  const key = 'psx' + (snap ? 's' : '') + (affine ? 'a' : '');
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
    sh.vertexShader = vs;
    sh.fragmentShader = fs;
  };
  return material;
}

// Lit, snapped, affine-textured. Pass any MeshLambertMaterial params.
export function psx(params = {}, quirks) {
  return patch(new THREE.MeshLambertMaterial(params), quirks);
}

// Unlit (flames, eyes, markers) but still snapped.
export function psxBasic(params = {}, quirks) {
  return patch(new THREE.MeshBasicMaterial(params), Object.assign({ affine: false }, quirks));
}
