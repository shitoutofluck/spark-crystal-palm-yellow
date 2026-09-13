import { facadeMatId, roofMatId } from "./catalog";
import type { BuildingProgram, Geom, LayerId } from "./types";

/** Duck-typed bag from build.ts — do not import Bag (keeps the kernel closed). */
export type RoofBag = {
  add: (
    layer: LayerId,
    matId: string,
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    kind: string,
    unit?: number | { geom?: Geom; rx?: number; ry?: number; rz?: number },
    extra?: { geom?: Geom; rx?: number; ry?: number; rz?: number },
  ) => void;
  min: (
    layer: LayerId,
    matId: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    kind: string,
    unit?: number | { geom?: Geom; rx?: number; ry?: number; rz?: number },
    extra?: { geom?: Geom; rx?: number; ry?: number; rz?: number },
  ) => void;
};

const EXPOSURE = 0.127;
const SHINGLE = 0.304;
const ICE_RUN = 0.92;
const FELT_ROLL = 0.91;
const RAKE_W = 0.038;

function vinylGable(p: BuildingProgram) {
  return p.facade === "siding";
}

function pitchOf(eaveY: number, eaveZ: number, ridgeY: number, ridgeZ: number) {
  const dz = ridgeZ - eaveZ;
  const rise = ridgeY - eaveY;
  const run = Math.abs(dz);
  const len = Math.hypot(run, rise);
  const pitch = Math.atan2(rise, Math.max(run, 1e-6));
  const rx = dz >= 0 ? -pitch : pitch;
  const ny = Math.cos(pitch);
  const nz = dz >= 0 ? -Math.sin(pitch) : Math.sin(pitch);
  return { dz, rise, run, len, pitch, rx, ny, nz };
}

function slopeStrip(
  bag: RoofBag,
  layer: LayerId,
  mat: string,
  x0: number,
  w: number,
  eaveY: number,
  eaveZ: number,
  ridgeY: number,
  ridgeZ: number,
  s0: number,
  s1: number,
  thk: number,
  nOff: number,
  kind: string,
) {
  const P = pitchOf(eaveY, eaveZ, ridgeY, ridgeZ);
  const mid = (s0 + s1) / 2;
  const t = P.len > 1e-6 ? mid / P.len : 0;
  bag.add(
    layer,
    mat,
    x0 + w / 2,
    eaveY + P.rise * t + P.ny * nOff,
    eaveZ + P.dz * t + P.nz * nOff,
    Math.max(0.02, w),
    thk,
    Math.max(0.02, s1 - s0),
    kind,
    { rx: P.rx },
  );
}

function slopeStack(
  bag: RoofBag,
  p: BuildingProgram,
  ox: number,
  totalW: number,
  eaveY: number,
  eaveZ: number,
  ridgeY: number,
  ridgeZ: number,
  roof: string,
) {
  const P = pitchOf(eaveY, eaveZ, ridgeY, ridgeZ);
  const len = P.len;
  const xDeck = ox - 0.28;
  const wDeck = totalW + 0.56;
  const xSh = ox - 0.4;
  const wSh = totalW + 0.8;

  for (let x = ox + 0.05; x < ox + totalW - 0.02; x += 0.406) {
    slopeStrip(bag, "framing", "timber-spf", x, 0.038, eaveY, eaveZ, ridgeY, ridgeZ, 0.02, len - 0.04, 0.184, -0.1, "rafter");
  }

  slopeStrip(bag, "envelope", "osb-716", xDeck, wDeck, eaveY, eaveZ, ridgeY, ridgeZ, 0, len, 0.016, 0, "roof-deck");

  const iceLen = Math.min(ICE_RUN, len * 0.28);
  slopeStrip(bag, "envelope", "membrane-charcoal", xDeck, wDeck, eaveY, eaveZ, ridgeY, ridgeZ, 0, iceLen, 0.004, 0.012, "ice-barrier");

  for (let s = iceLen - 0.05; s < len - 0.04; s += FELT_ROLL - 0.05) {
    const s1 = Math.min(len, s + FELT_ROLL);
    slopeStrip(bag, "envelope", "membrane-charcoal", xDeck, wDeck, eaveY, eaveZ, ridgeY, ridgeZ, s, s1, 0.003, 0.016, "felt");
  }

  slopeStrip(bag, "envelope", "steel-galv", xDeck - 0.02, wDeck + 0.04, eaveY, eaveZ, ridgeY, ridgeZ, -0.02, 0.08, 0.004, 0.01, "drip-edge");

  slopeStrip(bag, "exterior", roof, xSh, wSh, eaveY, eaveZ, ridgeY, ridgeZ, -0.02, 0.19, 0.01, 0.022, "starter");

  const n = Math.max(8, Math.ceil((len - 0.04) / EXPOSURE));
  for (let i = 0; i < n; i++) {
    const s0 = i * EXPOSURE - 0.01;
    const s1 = Math.min(len + 0.02, s0 + SHINGLE);
    slopeStrip(bag, "exterior", roof, xSh, wSh, eaveY, eaveZ, ridgeY, ridgeZ, s0, s1, 0.012, 0.028 + i * 0.0006, "shingle-course");
  }

  slopeStrip(bag, "envelope", "steel-galv", ox - 0.36, RAKE_W, eaveY, eaveZ, ridgeY, ridgeZ, 0, len, 0.012, 0.02, "rake-drip");
  slopeStrip(bag, "envelope", "steel-galv", ox + totalW + 0.32, RAKE_W, eaveY, eaveZ, ridgeY, ridgeZ, 0, len, 0.012, 0.02, "rake-drip");
  slopeStrip(bag, "exterior", "frame-charcoal", ox - 0.42, 0.022, eaveY - 0.04, eaveZ, ridgeY - 0.04, ridgeZ, 0, len, 0.16, 0.0, "fascia");
  slopeStrip(bag, "exterior", "frame-charcoal", ox + totalW + 0.4, 0.022, eaveY - 0.04, eaveZ, ridgeY - 0.04, ridgeZ, 0, len, 0.16, 0.0, "fascia");
  slopeStrip(bag, "exterior", roof, xSh, wSh, eaveY, eaveZ, ridgeY, ridgeZ, Math.max(0, len - 0.18), len + 0.04, 0.014, 0.04, "ridge-cap");

  void p;
}

export function buildEaveRun(
  bag: RoofBag,
  ox: number,
  totalW: number,
  eaveY: number,
  eaveZ: number,
  wallZ: number,
  towardRidge: 1 | -1,
  roof: string,
) {
  const s = towardRidge;
  bag.min("framing", "timber-spf", ox - 0.36, eaveY - 0.184, eaveZ + s * 0.008 - 0.019, totalW + 0.72, 0.184, 0.038, "sub-fascia");
  bag.min("exterior", "frame-charcoal", ox - 0.45, eaveY - 0.2, eaveZ - s * 0.03 - 0.01, totalW + 0.9, 0.2, 0.02, "fascia");
  bag.min("envelope", "steel-galv", ox - 0.43, eaveY - 0.05, eaveZ - s * 0.05, totalW + 0.86, 0.06, 0.004, "drip-edge");
  bag.min("envelope", "steel-galv", ox - 0.43, eaveY + 0.002, eaveZ - s * 0.02 - 0.03, totalW + 0.86, 0.004, 0.07, "drip-edge");
  const zA = eaveZ + s * 0.04;
  const z0 = Math.min(zA, wallZ);
  const z1 = Math.max(zA, wallZ);
  bag.min("exterior", "mill-white", ox - 0.26, eaveY - 0.198, z0, totalW + 0.52, 0.01, Math.max(0.12, z1 - z0), "soffit");
  for (let x = ox + 0.35; x < ox + totalW - 0.2; x += 1.22) {
    bag.min("exterior", "steel-dark", x, eaveY - 0.196, z0 + (z1 - z0) * 0.35, 0.62, 0.004, 0.09, "soffit-vent");
  }
  bag.min("exterior", "mill-white", ox - 0.24, eaveY - 0.055, wallZ - s * 0.012, totalW + 0.48, 0.048, 0.048, "cornice");
  bag.min("exterior", "mill-white", ox - 0.24, eaveY - 0.3, wallZ - s * 0.018, totalW + 0.48, 0.16, 0.018, "frieze");
  bag.min("exterior", "steel-galv", ox - 0.48, eaveY - 0.268, eaveZ - s * 0.11, totalW + 0.96, 0.09, 0.125, "gutter");
  for (let x = ox + 0.3; x < ox + totalW; x += 0.61) {
    bag.min("fasteners", "steel-galv", x, eaveY - 0.23, eaveZ - s * 0.06, 0.028, 0.075, 0.05, "gutter-hanger");
  }
}

export function buildLeader(bag: RoofBag, x: number, eaveY: number, eaveZ: number, towardRidge: 1 | -1) {
  const s = towardRidge;
  const zG = eaveZ - s * 0.16;
  bag.min("exterior", "steel-galv", x - 0.04, eaveY - 0.34, zG - 0.04, 0.09, 0.09, 0.14, "elbow");
  bag.min("exterior", "steel-galv", x - 0.028, 0.22, zG - 0.02, 0.055, eaveY - 0.52, 0.055, "downspout", undefined, {
    geom: "cyl",
  });
  bag.min("exterior", "steel-galv", x - 0.04, 0.16, zG - s * 0.12, 0.09, 0.08, 0.2, "elbow");
  bag.min("exterior", "steel-galv", x - 0.05, 0.05, zG - s * 0.38, 0.09, 0.05, 0.38, "leader-ext");
  bag.min("site", "paving", x - 0.22, 0, zG - s * 0.72, 0.44, 0.05, 0.55, "splash");
}

export function buildPitchedGable(bag: RoofBag, p: BuildingProgram, ox: number, totalW: number) {
  const D = p.unitDepth;
  const top = p.storeys * p.storeyHeight;
  const face = facadeMatId(p.facade);
  const roof = roofMatId(p.roof);
  const over = 0.55;
  const run = D / 2 + over;
  const rise = vinylGable(p) ? run * 0.5 : run * 0.38;
  const eaveY = top + 0.04;
  const ridgeY = top + rise;
  const ridgeZ = D / 2;
  const frontEaveZ = -over;
  const rearEaveZ = D + over;

  bag.min("framing", "osb-716", ox - 0.12, top, -0.05, totalW + 0.24, 0.02, D + 0.1, "ceiling-deck");
  bag.min("framing", "timber-spf", ox - 0.08, ridgeY - 0.09, ridgeZ - 0.045, totalW + 0.16, 0.184, 0.09, "ridge");

  slopeStack(bag, p, ox, totalW, eaveY, frontEaveZ, ridgeY, ridgeZ, roof);
  slopeStack(bag, p, ox, totalW, eaveY, rearEaveZ, ridgeY, ridgeZ, roof);

  bag.min("envelope", "steel-galv", ox - 0.2, ridgeY + 0.02, ridgeZ - 0.08, totalW + 0.4, 0.04, 0.16, "ridge-vent");

  bag.add("exterior", face, ox - 0.13, eaveY + rise / 2, ridgeZ, 0.14, rise, run * 2, "gable-end", { geom: "wedge" });
  bag.add("exterior", face, ox + totalW + 0.13, eaveY + rise / 2, ridgeZ, 0.14, rise, run * 2, "gable-end", { geom: "wedge" });

  buildEaveRun(bag, ox, totalW, eaveY, frontEaveZ, -0.04, 1, roof);
  buildEaveRun(bag, ox, totalW, eaveY, rearEaveZ, D + 0.04, -1, roof);
  buildLeader(bag, ox - 0.12, eaveY, frontEaveZ, 1);
  buildLeader(bag, ox + totalW + 0.08, eaveY, frontEaveZ, 1);
  buildLeader(bag, ox - 0.12, eaveY, rearEaveZ, -1);
  buildLeader(bag, ox + totalW + 0.08, eaveY, rearEaveZ, -1);

  if (vinylGable(p)) {
    const W = p.unitWidth;
    const gRise = 1.55;
    const gRun = 1.7;
    const gEaveY = eaveY;
    for (let i = 0; i < p.units; i++) {
      const cx = ox + i * W + W / 2;
      const gz = -0.62;
      const gRidgeY = gEaveY + gRise;
      slopeStrip(bag, "exterior", roof, cx - gRun, gRun * 2, gEaveY, gz - 0.05, gRidgeY, gz - 0.55, 0, Math.hypot(gRun, gRise), 0.014, 0.02, "gablet-shingle");
      bag.min("exterior", face, cx - 0.07, gEaveY, gz, 0.14, gRise, 0.1, "gablet");
      bag.min("exterior", "mill-white", cx - gRun - 0.05, gEaveY, gz - 0.1, 0.07, gRise + 0.08, 0.07, "gablet-trim");
      bag.min("exterior", "mill-white", cx + gRun, gEaveY, gz - 0.1, 0.07, gRise + 0.08, 0.07, "gablet-trim");
    }
  }
}
