import * as THREE from "three";
import type { Proc } from "./catalog";

const SIZE = 512;
const cache = new Map<string, { albedo: THREE.CanvasTexture; normal: THREE.CanvasTexture }>();

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function fade(t: number) {
  return t * t * (3 - 2 * t);
}
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = fade(xf);
  const v = fade(yf);
  const n00 = hash2(xi, yi);
  const n10 = hash2(xi + 1, yi);
  const n01 = hash2(xi, yi + 1);
  const n11 = hash2(xi + 1, yi + 1);
  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
}
function fbm(x: number, y: number, oct = 4): number {
  let a = 0;
  let w = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    a += w * vnoise(x * f, y * f);
    w *= 0.5;
    f *= 2;
  }
  return a;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp(v: number, a = 0, b = 255) {
  return Math.max(a, Math.min(b, v));
}

function makeCanvases() {
  const albedo = document.createElement("canvas");
  albedo.width = albedo.height = SIZE;
  const actx = albedo.getContext("2d", { willReadFrequently: true })!;
  const aimg = actx.createImageData(SIZE, SIZE);
  const height = new Float32Array(SIZE * SIZE);
  return { albedo, actx, aimg, height };
}

function writeAlbedo(
  aimg: ImageData,
  fn: (x: number, y: number, i: number) => { r: number; g: number; b: number; h: number },
  height: Float32Array,
) {
  const d = aimg.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const p = fn(x, y, i);
      const o = i * 4;
      d[o] = clamp(p.r);
      d[o + 1] = clamp(p.g);
      d[o + 2] = clamp(p.b);
      d[o + 3] = 255;
      height[i] = p.h;
    }
  }
}

function normalFromHeight(height: Float32Array, strength = 4): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const l = height[y * SIZE + ((x - 1 + SIZE) % SIZE)]!;
      const r = height[y * SIZE + ((x + 1) % SIZE)]!;
      const u = height[((y - 1 + SIZE) % SIZE) * SIZE + x]!;
      const dn = height[((y + 1) % SIZE) * SIZE + x]!;
      const dx = (r - l) * strength;
      const dy = (dn - u) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const o = (y * SIZE + x) * 4;
      d[o] = clamp((-dx * inv) * 127.5 + 127.5);
      d[o + 1] = clamp((-dy * inv) * 127.5 + 127.5);
      d[o + 2] = clamp(inv * 127.5 + 127.5);
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function tex(canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function draw(proc: Proc, hex: string): { albedo: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const [cr, cg, cb] = rgb(hex);
  const { albedo, actx, aimg, height } = makeCanvases();

  const brick = (x: number, y: number) => {
    const course = 48;
    const mortar = 5;
    const row = Math.floor(y / course);
    const off = (row % 2) * 56;
    const col = Math.floor((x + off) / 112);
    const lx = (x + off) % 112;
    const ly = y % course;
    const joint = lx < mortar || ly < mortar || lx > 112 - mortar;
    const n = fbm(x * 0.08, y * 0.08, 3);
    if (joint) {
      const g = 52 + n * 28;
      return { r: g, g: g - 2, b: g - 6, h: 0.15 + n * 0.1 };
    }
    const varn = (hash2(col, row) - 0.5) * 28 + (n - 0.5) * 22;
    return {
      r: cr + varn,
      g: cg + varn * 0.85,
      b: cb + varn * 0.7,
      h: 0.55 + n * 0.25,
    };
  };

  const wood = (x: number, y: number, plankW: number) => {
    const p = Math.floor(x / plankW);
    const lx = x - p * plankW;
    const seam = lx < 2 || lx > plankW - 2;
    const grain = Math.sin((y + p * 40) * 0.09 + fbm(p * 3, y * 0.02, 2) * 8) * 0.5 + 0.5;
    const ring = Math.sin(y * 0.35 + p) * 0.08;
    const n = fbm(x * 0.2, y * 0.04, 4);
    const t = grain * 0.55 + n * 0.35 + ring;
    if (seam) return { r: cr * 0.45, g: cg * 0.45, b: cb * 0.42, h: 0.1 };
    return {
      r: mix(cr * 0.72, cr * 1.12, t),
      g: mix(cg * 0.72, cg * 1.1, t),
      b: mix(cb * 0.7, cb * 1.08, t),
      h: 0.4 + grain * 0.25 + n * 0.15,
    };
  };

  writeAlbedo(
    aimg,
    (x, y) => {
      switch (proc) {
        case "brick":
          return brick(x, y);
        case "wood":
          return wood(x, y, 64);
        case "plank":
          return wood(x, y, 86);
        case "osb": {
          const chip = hash2(Math.floor(x / 7), Math.floor(y / 5));
          const n = fbm(x * 0.07, y * 0.07, 4);
          const orient = hash2(Math.floor(x / 11 + 2), Math.floor(y / 9)) > 0.5;
          const streak = orient ? vnoise(x * 0.4, y * 0.08) : vnoise(x * 0.08, y * 0.4);
          const t = 0.45 + n * 0.3 + streak * 0.2 + (chip - 0.5) * 0.15;
          return {
            r: mix(cr * 0.7, cr * 1.15, t),
            g: mix(cg * 0.72, cg * 1.1, t),
            b: mix(cb * 0.65, cb * 1.05, t),
            h: 0.35 + n * 0.4,
          };
        }
        case "plaster": {
          const n = fbm(x * 0.05, y * 0.05, 5);
          const fine = vnoise(x * 0.6, y * 0.6);
          const t = n * 0.7 + fine * 0.3;
          return {
            r: mix(cr * 0.92, cr * 1.06, t),
            g: mix(cg * 0.92, cg * 1.05, t),
            b: mix(cb * 0.9, cb * 1.04, t),
            h: 0.45 + fine * 0.2,
          };
        }
        case "concrete": {
          const n = fbm(x * 0.03, y * 0.03, 5);
          const agg = vnoise(x * 0.45, y * 0.45);
          const form = Math.sin(x * 0.024) * 0.04;
          const t = n * 0.65 + agg * 0.3 + form;
          return {
            r: mix(cr * 0.82, cr * 1.1, t),
            g: mix(cg * 0.82, cg * 1.08, t),
            b: mix(cb * 0.8, cb * 1.06, t),
            h: 0.4 + agg * 0.3 + form,
          };
        }
        case "tile": {
          const cell = 86;
          const g = 5;
          const lx = x % cell;
          const ly = y % cell;
          const grout = lx < g || ly < g;
          const n = fbm(x * 0.04, y * 0.04, 3);
          if (grout) return { r: 96, g: 92, b: 86, h: 0.12 };
          const vein = Math.abs(Math.sin((x + y) * 0.02 + n * 4));
          return {
            r: mix(cr * 0.9, Math.min(255, cr * 1.08 + 18), 1 - vein * 0.35 + n * 0.1),
            g: mix(cg * 0.9, Math.min(255, cg * 1.06 + 14), 1 - vein * 0.35 + n * 0.1),
            b: mix(cb * 0.9, Math.min(255, cb * 1.05 + 12), 1 - vein * 0.35 + n * 0.1),
            h: 0.62 + n * 0.1,
          };
        }
        case "siding": {
          const exp = 28;
          const row = Math.floor(y / exp);
          const ly = y % exp;
          const n = fbm(x * 0.015, row * 0.4, 3);
          const lap = ly < 3;
          const dirt = vnoise(x * 0.04, y * 0.08);
          if (lap) {
            return {
              r: cr * 0.62 + dirt * 8,
              g: cg * 0.62 + dirt * 8,
              b: cb * 0.64 + dirt * 6,
              h: 0.22,
            };
          }
          const shade = 0.88 + n * 0.18 + (ly / exp) * 0.08;
          return {
            r: cr * shade,
            g: cg * shade,
            b: cb * shade * 1.02,
            h: 0.45 + (1 - ly / exp) * 0.25,
          };
        }
        case "grass": {
          const n = fbm(x * 0.018, y * 0.018, 6);
          const clump = fbm(x * 0.07, y * 0.07, 5);
          const blade = vnoise(x * 4.8, y * 0.22);
          const blade2 = vnoise(x * 1.4 + 19, y * 5.6);
          const thatch = vnoise(x * 0.31, y * 0.29);
          const dry = vnoise(x * 0.02, y * 0.024);
          const t = n * 0.22 + blade * 0.42 + clump * 0.2 + blade2 * 0.16;
          if (dry > 0.88) {
            return { r: mix(118, 168, blade), g: mix(122, 148, blade), b: mix(42, 68, blade), h: 0.28 };
          }
          const lush = 0.55 + thatch * 0.45;
          return {
            r: mix(18, 62, t * 0.7) * lush,
            g: mix(68, 178, t) * (0.85 + lush * 0.2),
            b: mix(12, 48, t * 0.65) * lush,
            h: 0.18 + blade * 0.82,
          };
        }
        case "soil": {
          const n = fbm(x * 0.05, y * 0.05, 5);
          const clod = vnoise(x * 0.2, y * 0.2);
          const t = n * 0.6 + clod * 0.4;
          return {
            r: mix(cr * 0.7, cr * 1.2, t),
            g: mix(cg * 0.7, cg * 1.15, t),
            b: mix(cb * 0.65, cb * 1.1, t),
            h: 0.25 + clod * 0.5,
          };
        }
        case "gravel": {
          const gx = Math.floor(x / 9);
          const gy = Math.floor(y / 9);
          const stone = hash2(gx, gy);
          const n = vnoise(x * 0.3, y * 0.3);
          const t = stone * 0.7 + n * 0.3;
          return {
            r: mix(70, cr * 1.15, t),
            g: mix(68, cg * 1.12, t),
            b: mix(64, cb * 1.08, t),
            h: 0.2 + stone * 0.7,
          };
        }
        case "asphalt": {
          const n = fbm(x * 0.04, y * 0.04, 4);
          const agg = vnoise(x * 0.7, y * 0.7);
          const t = n * 0.5 + agg * 0.5;
          return {
            r: mix(cr * 0.75, cr * 1.2, t),
            g: mix(cg * 0.75, cg * 1.18, t),
            b: mix(cb * 0.78, cb * 1.15, t),
            h: 0.35 + agg * 0.3,
          };
        }
        case "metal": {
          const n = fbm(x * 0.02, y * 0.08, 3);
          const scratch = vnoise(x * 0.02, y * 0.5);
          const t = n * 0.7 + scratch * 0.3;
          return {
            r: mix(cr * 0.75, cr * 1.2, t),
            g: mix(cg * 0.75, cg * 1.18, t),
            b: mix(cb * 0.78, cb * 1.16, t),
            h: 0.5 + scratch * 0.15,
          };
        }
        case "copper": {
          const n = fbm(x * 0.03, y * 0.1, 3);
          const patina = vnoise(x * 0.08, y * 0.08);
          return {
            r: mix(cr * 0.7, Math.min(255, cr * 1.2 + 20), n),
            g: mix(cg * 0.65, cg * 1.15 + patina * 20, n),
            b: mix(cb * 0.6, cb * 1.05 + patina * 12, n),
            h: 0.45 + n * 0.2,
          };
        }
        case "batt": {
          const fiber = vnoise(x * 0.9, y * 0.15 + x * 0.02);
          const n = fbm(x * 0.08, y * 0.08, 3);
          const t = fiber * 0.7 + n * 0.3;
          return {
            r: mix(cr * 0.75, cr * 1.15, t),
            g: mix(cg * 0.8, cg * 1.1, t),
            b: mix(cb * 0.85, cb * 1.08, t),
            h: 0.3 + fiber * 0.5,
          };
        }
        case "wrap": {
          const grid = x % 32 < 1 || y % 32 < 1;
          const n = vnoise(x * 0.05, y * 0.05);
          if (grid) return { r: cr * 0.78, g: cg * 0.78, b: cb * 0.72, h: 0.35 };
          return {
            r: mix(cr * 0.92, cr * 1.05, n),
            g: mix(cg * 0.92, cg * 1.04, n),
            b: mix(cb * 0.9, cb * 1.02, n),
            h: 0.48,
          };
        }
        case "shingle": {
          const rowH = 36;
          const row = Math.floor(y / rowH);
          const off = (row % 2) * 40;
          const lx = (x + off) % 80;
          const ly = y % rowH;
          const tab = ly < 3 || lx < 2;
          const n = fbm(x * 0.06, y * 0.06, 3);
          const gran = vnoise(x * 0.8, y * 0.8);
          if (tab) return { r: cr * 0.55, g: cg * 0.55, b: cb * 0.55, h: 0.2 };
          const t = n * 0.5 + gran * 0.5;
          return {
            r: mix(cr * 0.75, cr * 1.2, t),
            g: mix(cg * 0.75, cg * 1.18, t),
            b: mix(cb * 0.78, cb * 1.15, t),
            h: 0.4 + gran * 0.3,
          };
        }
        case "membrane": {
          const n = fbm(x * 0.03, y * 0.03, 3);
          const seam = y % 96 < 3;
          if (seam) return { r: cr * 0.7, g: cg * 0.7, b: cb * 0.7, h: 0.25 };
          return {
            r: mix(cr * 0.88, cr * 1.08, n),
            g: mix(cg * 0.88, cg * 1.08, n),
            b: mix(cb * 0.9, cb * 1.06, n),
            h: 0.5 + n * 0.1,
          };
        }
        case "fabric": {
          const weave = ((x >> 1) + (y >> 1)) % 2;
          const n = fbm(x * 0.08, y * 0.08, 3);
          const t = weave * 0.15 + n * 0.85;
          return {
            r: mix(cr * 0.85, cr * 1.1, t),
            g: mix(cg * 0.85, cg * 1.08, t),
            b: mix(cb * 0.85, cb * 1.08, t),
            h: 0.4 + weave * 0.15,
          };
        }
        case "poly": {
          const n = fbm(x * 0.02, y * 0.02, 2);
          const wrinkle = Math.sin(x * 0.04 + n * 6) * 0.08;
          return {
            r: mix(cr * 0.9, cr * 1.05, n + wrinkle),
            g: mix(cg * 0.9, cg * 1.05, n + wrinkle),
            b: mix(cb * 0.92, cb * 1.08, n + wrinkle),
            h: 0.5 + wrinkle,
          };
        }
        default:
          return { r: cr, g: cg, b: cb, h: 0.5 };
      }
    },
    height,
  );

  actx.putImageData(aimg, 0, 0);
  const ncanvas = normalFromHeight(height, proc === "brick" || proc === "gravel" || proc === "osb" ? 6.5 : 3.6);
  return { albedo: tex(albedo, true), normal: tex(ncanvas, false) };
}

const SKIP = new Set<Proc>(["glass", "solid"]);

export function mapsFor(proc: Proc, hex: string): { albedo: THREE.CanvasTexture; normal: THREE.CanvasTexture } | null {
  if (typeof document === "undefined") return null;
  if (SKIP.has(proc)) return null;
  const key = `${proc}|${hex.toUpperCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const made = draw(proc, hex);
  cache.set(key, made);
  return made;
}
