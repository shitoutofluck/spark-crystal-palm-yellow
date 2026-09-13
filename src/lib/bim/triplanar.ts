import * as THREE from "three";
import { finishOf, tintedFinish, type Finish } from "./catalog";
import { mapsFor } from "./textures";

const matCache = new Map<string, THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>();

let white: THREE.DataTexture | null = null;
function whiteTex() {
  if (!white) {
    white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    white.needsUpdate = true;
  }
  return white;
}

const VERT_INJECT = /* glsl */ `
varying vec3 vWp;
varying vec3 vWn;
`;

const VERT_TAIL = /* glsl */ `
vec4 _wp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
_wp = instanceMatrix * _wp;
#endif
_wp = modelMatrix * _wp;
vWp = _wp.xyz;
vec3 _wn = objectNormal;
#ifdef USE_INSTANCING
_wn = mat3(instanceMatrix) * _wn;
#endif
vWn = normalize(mat3(modelMatrix) * _wn);
`;

const FRAG_INJECT = /* glsl */ `
varying vec3 vWp;
varying vec3 vWn;
uniform sampler2D uAlbedo;
uniform sampler2D uNorm;
uniform float uTile;
uniform float uHasTex;
uniform float uNormStr;
`;

const TRIPLANAR = /* glsl */ `
{
  vec3 wn = normalize(vWn);
  vec3 bl = pow(abs(wn), vec3(4.0));
  bl /= (bl.x + bl.y + bl.z + 1e-5);
  float s = uTile;
  vec2 uvX = vWp.zy * s;
  vec2 uvY = vWp.xz * s;
  vec2 uvZ = vWp.xy * s;
  vec3 cx = texture2D(uAlbedo, uvX).rgb;
  vec3 cy = texture2D(uAlbedo, uvY).rgb;
  vec3 cz = texture2D(uAlbedo, uvZ).rgb;
  vec3 texC = cx * bl.x + cy * bl.y + cz * bl.z;
  float lum = dot(texC, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb *= mix(vec3(1.0), texC, uHasTex);
  roughnessFactor = mix(roughnessFactor, clamp(roughnessFactor * (0.78 + (1.0 - lum) * 0.45), 0.04, 1.0), uHasTex);
}
`;

const TRIPLANAR_NORMAL = /* glsl */ `
if (uHasTex > 0.5) {
  vec3 wn = normalize(vWn);
  vec3 bl = pow(abs(wn), vec3(4.0));
  bl /= (bl.x + bl.y + bl.z + 1e-5);
  float s = uTile;
  vec3 nx = texture2D(uNorm, vWp.zy * s).xyz * 2.0 - 1.0;
  vec3 ny = texture2D(uNorm, vWp.xz * s).xyz * 2.0 - 1.0;
  vec3 nz = texture2D(uNorm, vWp.xy * s).xyz * 2.0 - 1.0;
  nx = vec3(nx.xy + wn.zy, abs(nx.z) * wn.x);
  ny = vec3(ny.xy + wn.xz, abs(ny.z) * wn.y);
  nz = vec3(nz.xy + wn.xy, abs(nz.z) * wn.z);
  vec3 nWorld = normalize(nx * bl.x + ny * bl.y + nz * bl.z);
  nWorld = normalize(mix(wn, nWorld, uNormStr));
  normal = normalize(normalMatrix * nWorld);
}
`;

function compile(shader: THREE.WebGLProgramParametersWithUniforms, maps: ReturnType<typeof mapsFor>, tileM: number, str: number) {
  shader.uniforms.uAlbedo = { value: maps?.albedo ?? whiteTex() };
  shader.uniforms.uNorm = { value: maps?.normal ?? whiteTex() };
  shader.uniforms.uTile = { value: 1 / Math.max(0.15, tileM) };
  shader.uniforms.uHasTex = { value: maps ? 1 : 0 };
  shader.uniforms.uNormStr = { value: str };
  shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\n${VERT_INJECT}`);
  shader.vertexShader = shader.vertexShader.replace(
    "#include <project_vertex>",
    `#include <project_vertex>\n${VERT_TAIL}`,
  );
  shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${FRAG_INJECT}`);
  shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `${TRIPLANAR}\n#include <map_fragment>`);
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <normal_fragment_maps>",
    `#include <normal_fragment_maps>\n${TRIPLANAR_NORMAL}`,
  );
}

export function acquireMaterial(
  finish: Finish,
  plane: THREE.Plane,
  opts?: { wire?: boolean },
): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  const key = `${finish.id}|${finish.hex}|${opts?.wire ? "w" : "s"}|pbr4`;
  const hit = matCache.get(key);
  if (hit) {
    hit.clippingPlanes = [plane];
    return hit;
  }

  if (finish.proc === "glass") {
    const glass = new THREE.MeshPhysicalMaterial({
      color: finish.hex,
      roughness: 0.04,
      metalness: 0.04,
      transmission: 0.86,
      thickness: 0.035,
      ior: 1.52,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      envMapIntensity: 1.35,
      side: THREE.DoubleSide,
      clippingPlanes: [plane],
      clipShadows: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    matCache.set(key, glass);
    return glass;
  }

  const maps = mapsFor(finish.proc, finish.hex);
  const transparent = finish.opacity < 0.99;
  const mat = new THREE.MeshStandardMaterial({
    color: maps ? "#ffffff" : finish.hex,
    roughness: finish.roughness,
    metalness: finish.metalness,
    transparent,
    opacity: finish.opacity,
    depthWrite: !transparent,
    envMapIntensity: finish.metalness > 0.2 ? 1.05 : 0.55,
    side: transparent ? THREE.DoubleSide : THREE.FrontSide,
    clippingPlanes: [plane],
    clipShadows: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  mat.customProgramCacheKey = () => "lw-triplanar-v4";
  const tile = finish.tileM;
  const str = finish.proc === "brick" || finish.proc === "osb" || finish.proc === "gravel" ? 0.85 : 0.62;
  mat.onBeforeCompile = (shader) => compile(shader, maps, tile, str);
  matCache.set(key, mat);
  return mat;
}

export function materialFor(matId: string, plane: THREE.Plane, tintHex?: string): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  const base = finishOf(matId);
  const finish = tintHex ? tintedFinish(base, tintHex) : base;
  return acquireMaterial(finish, plane);
}

export function warmupCatalog(ids: string[]) {
  if (typeof document === "undefined") return;
  for (const id of ids) {
    const f = finishOf(id);
    mapsFor(f.proc, f.hex);
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const mat of matCache.values()) mat.dispose();
    matCache.clear();
  });
}
