/** PlayCanvas-mapped renderer contract for the Three.js BIM viewer.
 *  We keep R3F (BIM + layers). These knobs follow PlayCanvas Engine:
 *  clustered-style local lights, ACES, linear/sRGB, PCF shadows, IBL split
 *  from skybox, CameraFrame-lite post. See developer.playcanvas.com/graphics.
 */
import * as THREE from "three";

export const ENGINE_REV = "pc-full-2";

export type EngineStyle = "studio" | "overcast" | "dusk";

export const ENGINE = {
  /** pc.TONEMAP_ACES */
  toneMapping: THREE.ACESFilmicToneMapping,
  /** Camera.exposure — locked like a real camera */
  exposure: { studio: 1.05, overcast: 1.18, dusk: 0.92 } as Record<EngineStyle, number>,
  /** Skybox vs IBL split (PlayCanvas skyboxIntensity vs lighting) */
  ibl: { studio: 0.82, overcast: 0.95, dusk: 0.55 } as Record<EngineStyle, number>,
  skybox: { studio: 0.85, overcast: 0.55, dusk: 1.1 } as Record<EngineStyle, number>,
  /** Directional sun (PlayCanvas physical units, Three.js non-legacy scale) */
  sun: {
    studio: { pos: [16, 18, 9] as const, intensity: 3.4, color: "#fff1dc" },
    overcast: { pos: [4, 38, 6] as const, intensity: 0.85, color: "#d5dee6" },
    dusk: { pos: [28, 6.2, 8] as const, intensity: 2.4, color: "#f0944a" },
  } as const,
  bounce: {
    studio: { pos: [-14, 10, -12] as const, intensity: 0.45, color: "#9aabba" },
    overcast: { pos: [-8, 16, -6] as const, intensity: 0.7, color: "#c5d0d8" },
    dusk: { pos: [-10, 6, -8] as const, intensity: 0.18, color: "#4a3a58" },
  } as const,
  hemi: {
    studio: ["#d7e0e8", "#3d352e", 0.48] as const,
    overcast: ["#c8d2da", "#4a504c", 0.95] as const,
    dusk: ["#8a6488", "#241c18", 0.38] as const,
  },
  ambient: { studio: 0.18, overcast: 0.42, dusk: 0.12 } as Record<EngineStyle, number>,
  /** Fog far enough that the house is not in the soup (PlayCanvas exponential, long range). */
  fogNear: 72,
  fogFar: 210,
  fogColor: { studio: "#6d7a84", overcast: "#9aa3aa", dusk: "#1a1418" } as Record<EngineStyle, string>,
  /** SHADOW_PCF5 analogue */
  shadowMapSize: { full: 4096, lite: 1024 },
  shadowBias: -0.00018,
  shadowNormalBias: 0.028,
  /** Interior clustered-style point lights (decay 2 = physically correct) */
  interior: { studio: 6.4, overcast: 4.2, dusk: 11 } as Record<EngineStyle, number>,
  windowNits: { studio: 8.5, overcast: 4.0, dusk: 14 } as Record<EngineStyle, number>,
  ao: { radius: 0.62, intensity: 1.7 },
  /** CameraFrame bloom is optional; archviz stays dry (no bloom soup). */
  bloom: false,
  vignette: { offset: 0.28, darkness: 0.22 },
} as const;

export function fitShadowCamera(
  light: THREE.DirectionalLight,
  min: readonly [number, number, number],
  max: readonly [number, number, number],
) {
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;
  const cz = (min[2] + max[2]) / 2;
  light.target.position.set(cx, Math.max(1.2, cy * 0.35), cz);
  light.target.updateMatrixWorld();
  const half = Math.max(max[0] - min[0], max[2] - min[2], 12) * 0.62;
  const cam = light.shadow.camera;
  cam.left = -half;
  cam.right = half;
  cam.top = half;
  cam.bottom = -half;
  cam.near = 1;
  cam.far = 110;
  cam.updateProjectionMatrix();
}
