import type { Market } from "@/lib/bible/types";

export type MatId =
  | "dirt"
  | "stripped"
  | "spoil"
  | "lumber"
  | "wet-con"
  | "concrete"
  | "cmu"
  | "gravel"
  | "poly"
  | "wrb"
  | "felt"
  | "ice"
  | "batt"
  | "drywall"
  | "siding"
  | "shingle"
  | "metal"
  | "glass"
  | "paint"
  | "soil"
  | "card"
  | "gap"
  | "pipe"
  | "wire"
  | "paper"
  | "tape";

export type Part = {
  id: string;
  geom: "box" | "cyl" | "cage";
  pos: [number, number, number];
  size: [number, number, number];
  rot?: [number, number, number];
  mat: MatId;
  markets?: Market[];
};

const W = 36;
const D = 28;
const STORY = 9;
const BASEMENT = 8;
const WALL = 0.292; // 3.5 in
const STUD_OC = 16 / 12;

function box(
  id: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: MatId,
  extra: Partial<Part> = {},
): Part {
  return { id, geom: "box", pos: [x, y, z], size: [w, h, d], mat, ...extra };
}

function cyl(
  id: string,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  mat: MatId,
  extra: Partial<Part> = {},
): Part {
  return { id, geom: "cyl", pos: [x, y, z], size: [r * 2, h, r * 2], mat, ...extra };
}

function cage(
  id: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  extra: Partial<Part> = {},
): Part {
  return { id, geom: "cage", pos: [x, y, z], size: [w, h, d], mat: "gap", ...extra };
}

function wallRun(
  prefix: string,
  axis: "x" | "z",
  along: number,
  y: number,
  h: number,
  mat: MatId,
  pose: "deck" | "raised",
): Part[] {
  const parts: Part[] = [];
  const n = Math.max(4, Math.round(along / STUD_OC) + 1);
  const plateH = 1.5 / 12;
  const studH = h - plateH * 2;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * along;
    const x = axis === "x" ? t : 0;
    const z = axis === "z" ? t : 0;
    if (pose === "deck") {
      parts.push(
        box(
          `${prefix}-stud-${i}`,
          x,
          0.08 + WALL / 2,
          z,
          axis === "x" ? 1.5 / 12 : WALL,
          WALL,
          axis === "x" ? WALL : 1.5 / 12,
          "lumber",
        ),
      );
    } else {
      parts.push(
        box(
          `${prefix}-stud-${i}`,
          x,
          y + plateH + studH / 2,
          z,
          axis === "x" ? 1.5 / 12 : WALL,
          studH,
          axis === "x" ? WALL : 1.5 / 12,
          mat,
        ),
      );
    }
  }
  if (pose === "raised") {
    parts.push(box(`${prefix}-bot`, 0, y + plateH / 2, 0, axis === "x" ? along : WALL, plateH, axis === "x" ? WALL : along, "lumber"));
    parts.push(box(`${prefix}-top`, 0, y + h - plateH / 2, 0, axis === "x" ? along : WALL, plateH, axis === "x" ? WALL : along, "lumber"));
  } else {
    parts.push(box(`${prefix}-plates`, 0, 0.04, 0, axis === "x" ? along : 0.5, 0.08, axis === "x" ? 0.5 : along, "lumber"));
  }
  return parts;
}

export function buildHouse(): Part[] {
  const p: Part[] = [];
  const hw = W / 2;
  const hd = D / 2;

  p.push(box("lot", 0, -0.08, 0, 80, 0.16, 100, "dirt"));
  p.push(box("lot-wet", -18, 0.02, 22, 16, 0.04, 12, "soil"));
  p.push(box("stripped-pad", 0, 0.04, 0, W + 8, 0.08, D + 8, "stripped"));
  p.push(box("spoil-pile", 28, 1.1, -22, 10, 2.2, 8, "spoil"));
  p.push(cyl("trees", -32, 4, 28, 1.1, 8, "lumber"));
  p.push(box("swales", 0, 0.06, hd + 18, 40, 0.12, 4, "soil"));
  p.push(box("lumber-stack", 22, 0.6, 22, 8, 1.2, 3, "lumber"));
  p.push(box("drawings-board", -28, 3.2, -8, 4, 2.4, 0.12, "paper"));
  p.push(box("permit-card", -26, 3.4, -6.2, 1.6, 2.2, 0.08, "card"));
  p.push(box("inspect-card", -24.2, 3.4, -6.2, 1.6, 2.2, 0.08, "card"));
  p.push(box("inspect-ladder", -24, 4.4, 4, 0.4, 8.8, 2.4, "metal"));
  p.push(box("punch-card", -22, 3.6, -6.2, 1.6, 2.2, 0.08, "card"));
  p.push(box("co-card", -20.2, 3.6, -6.2, 1.6, 2.2, 0.08, "card"));
  p.push(cyl("test-hole-flag", 0, 1.6, 0, 0.08, 3.2, "metal"));
  p.push(cyl("test-hole", 0, -1.2, 0, 0.7, 2.4, "soil"));

  for (const [sx, sz] of [
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
  ] as const) {
    p.push(box(`stakes-${sx}-${sz}`, sx, 1, sz, 0.12, 2, 0.12, "lumber"));
    p.push(box(`batter-${sx}-${sz}`, sx + Math.sign(sx) * 3.5, 1.6, sz + Math.sign(sz) * 3.5, 4, 0.12, 0.12, "lumber"));
    p.push(box(`batter-post-${sx}-${sz}`, sx + Math.sign(sx) * 3.5, 0.9, sz + Math.sign(sz) * 3.5, 0.2, 1.8, 0.2, "lumber"));
  }
  p.push(box("layout-strings", 0, 1.66, 0, W + 7, 0.02, D + 7, "wire"));
  p.push(box("utility-flags", -hw - 6, 0.7, 0, 0.2, 1.4, 8, "card"));
  p.push(box("batter-boards", 0, 1.6, 0, W + 7, 0.16, D + 7, "lumber"));

  p.push(box("hole-basement", 0, -BASEMENT / 2, 0, W + 6, BASEMENT, D + 6, "soil", { markets: ["logan-wasatch"] }));
  p.push(box("back-slope", 0, -BASEMENT / 2 + 0.4, 0, W + 10, BASEMENT - 0.8, D + 10, "soil", { markets: ["logan-wasatch"] }));
  p.push(box("strip-slab", 0, -0.4, 0, W + 4, 0.8, D + 4, "stripped", { markets: ["fontana"] }));

  p.push(box("footings", 0, -BASEMENT - 0.42, 0, W + 2.4, 0.84, D + 2.4, "wet-con", { markets: ["logan-wasatch"] }));
  p.push(box("walls-cip", 0, -BASEMENT / 2, 0, W + 0.8, BASEMENT, D + 0.8, "concrete", { markets: ["logan-wasatch"] }));
  p.push(box("walls-cip-void", 0, -BASEMENT / 2 + 0.2, 0, W - 0.6, BASEMENT - 0.2, D - 0.6, "soil", { markets: ["logan-wasatch"] }));
  p.push(box("drain-tile", 0, -BASEMENT + 0.2, 0, W + 1.6, 0.33, D + 1.6, "pipe", { markets: ["logan-wasatch"] }));
  p.push(box("gravel-envelope", 0, -BASEMENT + 0.28, 0, W + 2.2, 0.5, D + 2.2, "gravel", { markets: ["logan-wasatch"] }));
  p.push(box("waterproof", 0, -BASEMENT / 2, 0, W + 1.05, BASEMENT - 0.4, D + 1.05, "felt", { markets: ["logan-wasatch"] }));
  p.push(box("protection-board", 0, -BASEMENT / 2 + 0.4, 0, W + 1.2, BASEMENT - 1.2, D + 1.2, "card", { markets: ["logan-wasatch"] }));
  p.push(box("basement-slab", 0, -BASEMENT + 0.17, 0, W - 0.8, 0.33, D - 0.8, "concrete", { markets: ["logan-wasatch"] }));
  p.push(box("poly-6mil", 0, -BASEMENT + 0.02, 0, W - 0.6, 0.02, D - 0.6, "poly", { markets: ["logan-wasatch"] }));
  p.push(box("sill-plate", 0, 0.08, 0, W + 0.4, 0.125, D + 0.4, "lumber"));
  p.push(box("sill-gasket", 0, 0.02, 0, W + 0.4, 0.02, D + 0.4, "felt"));
  p.push(box("anchor-bolts", hw - 0.4, 0.2, hd - 0.4, 0.04, 0.5, 0.04, "metal"));

  p.push(box("sog-gravel", 0, -0.3, 0, W + 1, 0.3, D + 1, "gravel", { markets: ["fontana"] }));
  p.push(box("sog-poly", 0, -0.14, 0, W + 0.8, 0.02, D + 0.8, "poly", { markets: ["fontana"] }));
  p.push(box("sog-slab", 0, 0.17, 0, W + 0.6, 0.33, D + 0.6, "concrete", { markets: ["fontana"] }));
  p.push(box("sog-edge", 0, 0.17, 0, W + 1.4, 0.5, D + 1.4, "wet-con", { markets: ["fontana"] }));

  p.push(box("pwf-gravel", 0, -0.35, 0, W + 1.2, 0.5, D + 1.2, "gravel"));
  p.push(box("pwf-plate", 0, -0.05, 0, W, 0.125, D, "lumber"));
  p.push(box("pwf-walls", 0, BASEMENT / 2 - 0.4, 0, W + 0.4, BASEMENT - 0.5, D + 0.4, "lumber"));
  p.push(cyl("pwf-sump", 0, -1.1, 0, 0.7, 2, "pipe"));

  p.push(box("underslab-plumbing", -4, -BASEMENT + 0.4, 2, 18, 0.2, 0.2, "pipe"));
  p.push(box("underslab-gravel", 0, -BASEMENT + 0.22, 0, W - 1, 0.33, D - 1, "gravel"));
  p.push(box("underslab-poly", 0, -BASEMENT + 0.4, 0, W - 0.8, 0.02, D - 0.8, "poly"));
  p.push(cyl("radon-pipe", 6, 4, 4, 0.17, 16, "pipe"));
  p.push(box("termite", 0, -BASEMENT + 0.5, 0, W, 0.04, D, "felt"));

  const joistN = Math.round(D / (16 / 12));
  for (let i = 0; i < joistN; i++) {
    const z = -hd + 0.5 + i * (16 / 12);
    p.push(box(`i-joists-${i}`, 0, 0.7, z, W - 0.6, 1, 0.2, "lumber", { markets: ["logan-wasatch"] }));
  }
  p.push(box("i-joists", 0, 0.7, 0, W - 0.6, 1, D - 0.8, "lumber", { markets: ["logan-wasatch"] }));
  p.push(box("i-joist-brace", 0, 1.15, 0, W - 1, 0.08, D - 1, "lumber", { markets: ["logan-wasatch"] }));
  p.push(box("rim-board", 0, 0.7, 0, W, 1.17, D, "lumber", { markets: ["logan-wasatch"] }));
  p.push(box("blocking", 0, 0.7, 0, 0.3, 1, D - 1, "lumber", { markets: ["logan-wasatch"] }));
  p.push(box("girder", 0, 0.4, 0, W - 2, 0.8, 0.5, "lumber", { markets: ["logan-wasatch"] }));
  p.push(box("subfloor", 0, 1.28, 0, W, 0.1, D, "lumber"));

  const y1 = 1.33;
  p.push(...wallRun("wall-south-deck", "x", W, y1, 8, "lumber", "deck").map((x) => ({ ...x, id: x.id.replace("wall-south-deck", "wsd") })));
  p.push(box("wall-south-deck", 0, 0.2, -hd + 2.5, W, WALL, 8, "lumber"));
  p.push(box("wall-north-deck", 0, 0.2, hd - 2.5, W, WALL, 8, "lumber"));
  p.push(box("wall-east-deck", hw - 2.5, 0.2, 0, 8, WALL, D, "lumber"));
  p.push(box("wall-west-deck", -hw + 2.5, 0.2, 0, 8, WALL, D, "lumber"));
  p.push(box("wall-south-plates", 0, 1.36, -hd, W, 0.125, WALL, "lumber"));
  p.push(box("wall-north-plates", 0, 1.36, hd, W, 0.125, WALL, "lumber"));
  p.push(box("wall-east-plates", hw, 1.36, 0, WALL, 0.125, D, "lumber"));
  p.push(box("wall-west-plates", -hw, 1.36, 0, WALL, 0.125, D, "lumber"));
  p.push(box("wall-south-studs", 0, y1 + 4, -hd, W, 8, WALL, "lumber"));
  p.push(box("wall-north-studs", 0, y1 + 4, hd, W, 8, WALL, "lumber"));
  p.push(box("wall-east-studs", hw, y1 + 4, 0, WALL, 8, D, "lumber"));
  p.push(box("wall-west-studs", -hw, y1 + 4, 0, WALL, 8, D, "lumber"));
  p.push(box("wall-south-header", -6, y1 + 6.6, -hd, 6.5, 0.96, WALL, "lumber"));
  p.push(box("door-sole-uncut", -6, y1 + 0.06, -hd, 3.2, 0.125, WALL, "lumber"));
  p.push(box("sheathing-deck", 0, 0.28, -hd + 2.5, W, 0.04, 8, "lumber"));

  p.push(box("wall-south-raised", 0, y1 + 4, -hd, W, 8, WALL, "lumber"));
  p.push(box("wall-north-raised", 0, y1 + 4, hd, W, 8, WALL, "lumber"));
  p.push(box("wall-east-raised", hw, y1 + 4, 0, WALL, 8, D, "lumber"));
  p.push(box("wall-west-raised", -hw, y1 + 4, 0, WALL, 8, D, "lumber"));
  p.push(box("sheathing-raised", 0, y1 + 4, -hd - 0.04, W, 8, 0.04, "lumber"));
  p.push(box("bwp-panels", 0, y1 + 4, -hd - 0.05, W, 8, 0.05, "lumber"));
  p.push(box("door-sole-cut", -6, y1 + 0.02, -hd, 3.2, 0.02, WALL, "lumber"));
  p.push(box("braces", hw + 2.4, y1 + 4, 0, 0.2, 8, 6, "lumber"));
  p.push(box("double-plate", 0, y1 + 8.1, 0, W + WALL, 0.125, D + WALL, "lumber"));
  p.push(box("partitions", 0, y1 + 4, 0, WALL, 8, D - 2, "lumber"));

  const y2 = y1 + STORY;
  p.push(box("wall-south-l2", 0, y2 + 4, -hd, W, 8, WALL, "lumber"));
  p.push(box("wall-north-l2", 0, y2 + 4, hd, W, 8, WALL, "lumber"));
  p.push(box("wall-east-l2", hw, y2 + 4, 0, WALL, 8, D, "lumber"));
  p.push(box("wall-west-l2", -hw, y2 + 4, 0, WALL, 8, D, "lumber"));
  p.push(box("floor-2", 0, y2, 0, W, 0.1, D, "lumber"));

  p.push(box("stairs-well", hw - 5, y1 + 4.5, hd - 6, 3.5, 9, 8, "lumber"));
  p.push(box("stairs-stringer", hw - 5, y1 + 4, hd - 6, 0.2, 9, 8, "lumber"));
  p.push(box("kick-plate", hw - 5, y1 + 0.1, hd - 2, 3.2, 0.2, 0.4, "lumber"));
  for (let i = 0; i < 14; i++) {
    p.push(box(`stairs-treads-${i}`, hw - 5, y1 + 0.3 + i * 0.64, hd - 2 - i * 0.5, 3.2, 0.08, 0.92, "lumber"));
  }
  p.push(box("stairs-treads", hw - 5, y1 + 4, hd - 6, 3.2, 0.08, 8, "lumber"));

  const roofY = y2 + 8.2;
  const trussN = Math.round(W / 2);
  for (let i = 0; i < trussN; i++) {
    const x = -hw + 1 + i * 2;
    p.push(box(`trusses-${i}`, x, roofY + 2.4, 0, 0.15, 5.2, D + 2, "lumber"));
  }
  p.push(box("trusses", 0, roofY + 2.4, 0, W, 5.2, D + 2, "lumber"));
  p.push(box("truss-brace", 0, roofY + 1.2, 0, W - 2, 0.12, D, "lumber"));
  p.push(box("gable", -hw, roofY + 2.4, 0, 0.2, 5.2, D + 2, "lumber"));
  p.push(box("roof-sheathing", 0, roofY + 5.0, 0, W + 1.5, 0.08, D + 3.2, "lumber"));
  p.push(box("roof-felt", 0, roofY + 5.08, 0, W + 1.6, 0.02, D + 3.3, "felt"));
  p.push(box("ice-logan", 0, roofY + 5.1, -hd - 0.6, W + 1.6, 0.03, 4, "ice", { markets: ["logan-wasatch"] }));
  p.push(box("shingles", 0, roofY + 5.16, 0, W + 1.7, 0.08, D + 3.4, "shingle"));

  p.push(box("wrb", 0, y1 + 4, -hd - 0.06, W, 8, 0.02, "wrb"));
  p.push(box("pan-flash", -6, y1 + 1.1, -hd - 0.08, 3.4, 0.04, 0.4, "metal"));
  p.push(box("end-dams", -4.4, y1 + 1.3, -hd - 0.08, 0.08, 0.4, 0.4, "metal"));
  p.push(box("windows", -6, y1 + 4.2, -hd - 0.1, 3, 4.2, 0.12, "glass"));
  p.push(box("head-flash", -6, y1 + 6.4, -hd - 0.12, 3.6, 0.06, 0.5, "metal"));
  p.push(box("siding", 0, y1 + 4, -hd - 0.14, W, 8, 0.06, "siding"));
  p.push(box("siding-n", 0, y1 + 4, hd + 0.14, W, 8, 0.06, "siding"));
  p.push(box("siding-e", hw + 0.14, y1 + 4, 0, 0.06, 8, D, "siding"));
  p.push(box("siding-w", -hw - 0.14, y1 + 4, 0, 0.06, 8, D, "siding"));

  p.push(box("mep-plumb", 4, y1 + 3, 2, 0.2, 6, 0.2, "pipe"));
  p.push(box("tub", 8, y1 + 0.7, 6, 5, 1.4, 2.8, "paint"));
  p.push(box("mep-elec", -4, y1 + 4.5, -2, 0.08, 0.3, 10, "wire"));
  p.push(box("mep-hvac", 0, y1 + 7.4, 0, 14, 0.6, 0.8, "metal"));
  p.push(box("nail-plates", 4, y1 + 2, 2, 0.2, 0.3, 0.04, "metal"));

  p.push(box("batt", 0, y1 + 4, -hd + 0.2, W - 0.4, 7.4, 0.3, "batt"));
  p.push(box("poly-4mil", 0, y1 + 4, -hd + 0.38, W - 0.4, 7.4, 0.02, "poly"));
  p.push(box("gwb-ceil", 0, y2 - 0.08, 0, W - 0.4, 0.04, D - 0.4, "drywall"));
  p.push(box("gwb-walls", 0, y1 + 4, -hd + 0.42, W - 0.3, 8, 0.04, "drywall"));
  p.push(box("tape", 0, y1 + 4, -hd + 0.45, W - 0.3, 8, 0.01, "tape"));
  p.push(box("doors-int", 0, y1 + 3.4, 0, 3, 6.8, 0.16, "paint"));
  p.push(box("casing", 0, y1 + 3.4, 0.12, 3.3, 7, 0.08, "lumber"));
  p.push(box("paint", 0, y1 + 4, -hd + 0.48, W - 0.2, 8, 0.02, "paint"));
  p.push(box("floors", 0, y1 + 0.06, 0, W - 0.8, 0.06, D - 0.8, "lumber"));
  p.push(box("devices", -8, y1 + 4, -hd + 0.55, 0.2, 0.3, 0.08, "card"));
  p.push(box("fixtures", 0, y2 - 0.4, 0, 1.2, 0.4, 1.2, "metal"));
  p.push(box("equipment", 10, -BASEMENT + 2.2, 6, 3, 4, 2.4, "metal", { markets: ["logan-wasatch"] }));

  p.push(box("grade", 0, 0.12, hd + 10, 50, 0.24, 16, "dirt"));
  p.push(box("drive", 0, 0.18, -hd - 16, 12, 0.33, 18, "concrete"));
  p.push(box("walks", -10, 0.16, -hd - 8, 4, 0.33, 12, "concrete"));
  p.push(box("gutters", 0, roofY + 4.4, -hd - 1.6, W + 1.8, 0.16, 0.2, "metal"));
  p.push(box("splash-block", 14, 0.12, -hd - 2.4, 2, 0.1, 3, "concrete"));

  p.push(cage("gap-delivery", -28, 1.4, -12, 4, 2.8, 4));
  p.push(cage("gap-P00-delivery-method-alts", -28, 1.4, -12, 4, 2.8, 4));
  p.push(cage("gap-demo", 18, 1.6, 18, 6, 3.2, 6));
  p.push(cage("gap-P01-demo-existing-house", 18, 1.6, 18, 6, 3.2, 6));
  p.push(cage("gap-hoa", -22, 3.2, -10, 3, 2.2, 3));
  p.push(cage("gap-P02-hoa-impact-special-inspect", -22, 3.2, -10, 3, 2.2, 3));
  p.push(cage("gap-toilet", 24, 1.2, 10, 3, 2.4, 3));
  p.push(cage("gap-P03-temp-toilet", 24, 1.2, 10, 3, 2.4, 3));
  p.push(cage("gap-split", 0, -BASEMENT + 2, 0, 6, 3, 6));
  p.push(cage("gap-P06-fontana-utah-split", 0, -BASEMENT + 2, 0, 6, 3, 6));
  p.push(cage("gap-title24", 0, y1 + 4, 8, 5, 3, 4, { markets: ["fontana"] }));
  p.push(cage("gap-P13-title24-text", 0, y1 + 4, 8, 5, 3, 4, { markets: ["fontana"] }));
  p.push(cage("gap-punch", -20, 2.4, -12, 4, 2.6, 4));
  p.push(cage("gap-P18-punch-list-procedure", -20, 2.4, -12, 4, 2.6, 4));
  p.push(cage("gap-P00", -28, 1.4, -12, 4, 2.8, 4));
  p.push(cage("gap-P01", 18, 1.6, 18, 6, 3.2, 6));
  p.push(cage("gap-P02", -22, 3.2, -10, 3, 2.2, 3));
  p.push(cage("gap-P03", 24, 1.2, 10, 3, 2.4, 3));
  p.push(cage("gap-P06", 0, -BASEMENT + 2, 0, 6, 3, 6));
  p.push(cage("gap-P13", 0, y1 + 4, 8, 5, 3, 4));
  p.push(cage("gap-P18", -20, 2.4, -12, 4, 2.6, 4));
  p.push(box("phase-P00", -28, 0.4, -8, 5, 0.2, 5, "card"));
  p.push(box("phase-P01", 0, 0.2, 0, 4, 0.2, 4, "stripped"));
  p.push(box("phase-P02", -24, 0.4, -6, 3, 0.2, 3, "card"));
  p.push(box("phase-P03", 0, 1.5, 0, W + 8, 0.08, D + 8, "lumber"));

  return p;
}

export const HOUSE_PARTS = buildHouse();

export const PARTS_BY_ID: Record<string, Part[]> = {};
for (const part of HOUSE_PARTS) {
  (PARTS_BY_ID[part.id] ??= []).push(part);
  const group = part.id.replace(/-\d+$/, "");
  if (group !== part.id) (PARTS_BY_ID[group] ??= []).push(part);
}
