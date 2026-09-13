import * as THREE from "three";
import { UNIT_BOUNDS } from "./unit";

export type WalkState = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speed: number;
  locked: boolean;
};

export function createWalkState(spawn: [number, number, number]): WalkState {
  return { x: spawn[0], y: spawn[1], z: spawn[2], yaw: Math.PI, pitch: -0.08, speed: 0, locked: false };
}

const keys = new Set<string>();
let injected: string[] | null = null;

export function held(): Set<string> {
  if (injected) return new Set(injected);
  return keys;
}

export function bindWalkKeys() {
  const down = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const clear = () => keys.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", clear);
  };
}

export function look(state: WalkState, dx: number, dy: number) {
  state.yaw -= dx * 0.0024;
  state.pitch = Math.max(-1.15, Math.min(1.15, state.pitch - dy * 0.0024));
}

export function stepWalk(state: WalkState, dt: number) {
  dt = Math.min(dt, 0.05);
  const k = held();
  let ax = 0;
  let az = 0;
  if (k.has("KeyW") || k.has("ArrowUp")) az += 1;
  if (k.has("KeyS") || k.has("ArrowDown")) az -= 1;
  if (k.has("KeyD") || k.has("ArrowRight")) ax += 1;
  if (k.has("KeyA") || k.has("ArrowLeft")) ax -= 1;
  const len = Math.hypot(ax, az) || 1;
  ax /= len;
  az /= len;
  const fx = -Math.sin(state.yaw);
  const fz = -Math.cos(state.yaw);
  const rx = Math.cos(state.yaw);
  const rz = -Math.sin(state.yaw);
  const sprint = k.has("ShiftLeft") || k.has("ShiftRight") ? 1.7 : 1;
  const wish = 2.55 * sprint;
  const vx = (fx * az + rx * ax) * wish;
  const vz = (fz * az + rz * ax) * wish;
  state.speed = Math.hypot(vx, vz);
  let nx = state.x + vx * dt;
  let nz = state.z + vz * dt;
  nx = Math.max(UNIT_BOUNDS.minX, Math.min(UNIT_BOUNDS.maxX, nx));
  nz = Math.max(UNIT_BOUNDS.minZ, Math.min(UNIT_BOUNDS.maxZ, nz));
  const st = UNIT_BOUNDS.stair;
  let ny = UNIT_BOUNDS.floorY;
  if (nx > st.x0 && nx < st.x1 && nz > st.z0 && nz < st.z1) {
    const t = (nz - st.z0) / (st.z1 - st.z0);
    ny = UNIT_BOUNDS.floorY + t * st.rise;
  } else if (nz > st.z1 && nx > st.x0 - 0.4) {
    ny = UNIT_BOUNDS.floorY + st.rise;
  }
  state.x = nx;
  state.z = nz;
  state.y = ny;
}

export function applyCamera(cam: THREE.Camera, state: WalkState) {
  cam.position.set(state.x, state.y, state.z);
  cam.rotation.set(0, 0, 0);
  cam.rotateY(state.yaw);
  cam.rotateX(state.pitch);
}

export function installControlsTest(state: WalkState) {
  window.__controlsTest = {
    getYaw: () => state.yaw,
    getSpeed: () => state.speed,
    setKeys: (codes: string[]) => {
      injected = codes.length ? codes : null;
    },
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
