import { facadeMatId, finishOf, roofMatId } from "./catalog";
import { hexId } from "./hash";
import type { BoxSpec, BuildingProgram, BuildResult, Geom, LayerId } from "./types";

const STUD = 0.038;
const CAVITY = 0.089;
const OC = 0.406;
const OSB = 0.011;
const GYP = 0.013;
const CLAD = 0.028;
const WRB = 0.007;
const HEADER = 0.235;
const IJOIST = 0.302;
const FROST = 0.76;

type Hole = { x: number; y: number; w: number; h: number; kind: "window" | "door" };
type Extra = { geom?: Geom; rx?: number; ry?: number; rz?: number };

class Bag {
  boxes: BoxSpec[] = [];
  add(
    layer: LayerId,
    matId: string,
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    kind: string,
    unit?: number | Extra,
    extra?: Extra,
  ) {
    if (w < 0.0014 || h < 0.0014 || d < 0.0014) return;
    let u: number | undefined;
    let ex: Extra | undefined = extra;
    if (typeof unit === "object") {
      ex = unit;
      u = undefined;
    } else {
      u = unit;
    }
    const mat = finishOf(matId);
    this.boxes.push({
      layer,
      x: cx,
      y: cy,
      z: cz,
      w,
      h,
      d,
      rx: ex?.rx ?? 0,
      ry: ex?.ry ?? 0,
      rz: ex?.rz ?? 0,
      geom: ex?.geom ?? "box",
      matId,
      color: mat.hex,
      roughness: mat.roughness,
      metalness: mat.metalness,
      opacity: mat.opacity,
      kind,
      unit: u,
      hex: hexId(layer, kind, u ?? -1, Math.round(cx * 1000), Math.round(cy * 1000), Math.round(cz * 1000)),
    });
  }
  min(
    layer: LayerId,
    matId: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    kind: string,
    unit?: number | Extra,
    extra?: Extra,
  ) {
    this.add(layer, matId, x + w / 2, y + h / 2, z + d / 2, w, h, d, kind, unit, extra);
  }
}

function bands(x0: number, y0: number, x1: number, y1: number, holes: Hole[]) {
  const ys = new Set([y0, y1]);
  for (const h of holes) {
    ys.add(Math.max(y0, h.y));
    ys.add(Math.min(y1, h.y + h.h));
  }
  const ylist = [...ys].sort((a, b) => a - b);
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < ylist.length - 1; i++) {
    const ya = ylist[i]!;
    const yb = ylist[i + 1]!;
    if (yb - ya < 0.015) continue;
    const xs = new Set([x0, x1]);
    const band = holes.filter((h) => h.y < yb - 0.001 && h.y + h.h > ya + 0.001);
    for (const h of band) {
      xs.add(Math.max(x0, h.x));
      xs.add(Math.min(x1, h.x + h.w));
    }
    const xlist = [...xs].sort((a, b) => a - b);
    for (let j = 0; j < xlist.length - 1; j++) {
      const xa = xlist[j]!;
      const xb = xlist[j + 1]!;
      if (xb - xa < 0.015) continue;
      const covered = band.some((h) => xa + 0.008 >= h.x && xb - 0.008 <= h.x + h.w);
      if (!covered) out.push({ x: xa, y: ya, w: xb - xa, h: yb - ya });
    }
  }
  return out;
}

function wallX(
  bag: Bag,
  layer: LayerId,
  matId: string,
  z: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  t: number,
  holes: Hole[],
  kind: string,
  unit?: number,
) {
  for (const r of bands(x0, y0, x1, y1, holes)) {
    bag.min(layer, matId, r.x, r.y, z - t / 2, r.w, r.h, t, kind, unit);
  }
}

function wallZ(
  bag: Bag,
  layer: LayerId,
  matId: string,
  x: number,
  z0: number,
  z1: number,
  y0: number,
  y1: number,
  t: number,
  holes: Hole[],
  kind: string,
  unit?: number,
) {
  for (const r of bands(z0, y0, z1, y1, holes)) {
    bag.min(layer, matId, x - t / 2, r.y, r.x, t, r.h, r.w, kind, unit);
  }
}

function inHole(x: number, holes: Hole[], y0: number, y1: number) {
  return holes.some((h) => x > h.x && x < h.x + h.w && y0 < h.y + h.h && y1 > h.y);
}

function nearOpening(x: number, holes: Hole[], pad: number) {
  return holes.some((h) => x > h.x - pad && x < h.x + h.w + pad);
}

function framingX(
  bag: Bag,
  zC: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  holes: Hole[],
  unit?: number,
) {
  const z = zC - CAVITY / 2;
  bag.min("framing", "timber-spf", x0, y0, z, x1 - x0, STUD, CAVITY, "plate", unit);
  bag.min("framing", "timber-spf", x0, y1 - STUD * 2, z, x1 - x0, STUD, CAVITY, "plate", unit);
  bag.min("framing", "timber-spf", x0, y1 - STUD, z, x1 - x0, STUD, CAVITY, "double-plate", unit);
  bag.min("framing", "timber-spf", x0, y0 + 1.22, z, x1 - x0, STUD, CAVITY, "fire-block", unit);

  for (const h of holes) {
    bag.min("framing", "timber-spf", h.x - STUD, y0 + STUD, z, STUD, y1 - y0 - 3 * STUD, CAVITY, "king", unit);
    bag.min("framing", "timber-spf", h.x + h.w, y0 + STUD, z, STUD, y1 - y0 - 3 * STUD, CAVITY, "king", unit);
    const jackH = h.y + h.h - (y0 + STUD);
    bag.min("framing", "timber-spf", h.x, y0 + STUD, z, STUD, Math.max(0.05, jackH), CAVITY, "jack", unit);
    bag.min("framing", "timber-spf", h.x + h.w - STUD, y0 + STUD, z, STUD, Math.max(0.05, jackH), CAVITY, "jack", unit);
    bag.min("framing", "timber-spf", h.x - STUD, h.y + h.h, z, h.w + 2 * STUD, HEADER, CAVITY, "header", unit);
    if (h.kind === "window") {
      bag.min("framing", "timber-spf", h.x, h.y - STUD, z, h.w, STUD, CAVITY, "sill", unit);
      for (let x = h.x + OC * 0.5; x < h.x + h.w - 0.04; x += OC) {
        bag.min("framing", "timber-spf", x - STUD / 2, y0 + STUD, z, STUD, Math.max(0.04, h.y - STUD - y0 - STUD), CAVITY, "cripple", unit);
        const above = y1 - 2 * STUD - (h.y + h.h + HEADER);
        if (above > 0.05) {
          bag.min("framing", "timber-spf", x - STUD / 2, h.y + h.h + HEADER, z, STUD, above, CAVITY, "cripple", unit);
        }
      }
    }
  }
  for (let x = x0 + STUD; x <= x1 - STUD; x += OC) {
    if (inHole(x, holes, y0 + 0.1, y1 - 0.1)) continue;
    if (nearOpening(x, holes, STUD * 1.6)) continue;
    bag.min("framing", "timber-spf", x - STUD / 2, y0 + STUD, z, STUD, y1 - y0 - 3 * STUD, CAVITY, "stud", unit);
  }
}

function framingZ(bag: Bag, xC: number, z0: number, z1: number, y0: number, y1: number, unit?: number) {
  const x = xC - CAVITY / 2;
  bag.min("framing", "timber-spf", x, y0, z0, CAVITY, STUD, z1 - z0, "plate", unit);
  bag.min("framing", "timber-spf", x, y1 - STUD * 2, z0, CAVITY, STUD, z1 - z0, "plate", unit);
  bag.min("framing", "timber-spf", x, y1 - STUD, z0, CAVITY, STUD, z1 - z0, "double-plate", unit);
  bag.min("framing", "timber-spf", x, y0 + 1.22, z0, CAVITY, STUD, z1 - z0, "fire-block", unit);
  for (let z = z0 + STUD; z <= z1 - STUD; z += OC) {
    bag.min("framing", "timber-spf", x, y0 + STUD, z - STUD / 2, CAVITY, y1 - y0 - 3 * STUD, STUD, "stud", unit);
  }
}

function battsZ(bag: Bag, xC: number, z0: number, z1: number, y0: number, y1: number, unit?: number) {
  const x = xC - CAVITY / 2 + 0.004;
  for (let z = z0 + OC; z < z1 - 0.05; z += OC) {
    bag.min(
      "insulation",
      "batt-pink",
      x,
      y0 + STUD,
      z - OC + STUD / 2 + 0.004,
      CAVITY - 0.008,
      y1 - y0 - 3 * STUD,
      OC - STUD - 0.008,
      "batt",
      unit,
    );
  }
}

function battsX(bag: Bag, zC: number, x0: number, x1: number, y0: number, y1: number, holes: Hole[], unit?: number) {
  const z = zC - CAVITY / 2 + 0.004;
  for (let x = x0 + OC; x < x1 - 0.05; x += OC) {
    if (inHole(x - OC / 2, holes, y0 + 0.15, y1 - 0.15)) continue;
    bag.min(
      "insulation",
      "batt-pink",
      x - OC + STUD / 2 + 0.004,
      y0 + STUD,
      z,
      OC - STUD - 0.008,
      y1 - y0 - 3 * STUD,
      CAVITY - 0.008,
      "batt",
      unit,
    );
  }
}

function openingsX(bag: Bag, zFace: number, holes: Hole[], inward: number, unit?: number) {
  const frame = 0.055;
  for (const h of holes) {
    const z0 = zFace - 0.03;
    const t = 0.12;
    bag.min("openings", "frame-charcoal", h.x, h.y, z0, h.w, frame, t, "frame", unit);
    bag.min("openings", "frame-charcoal", h.x, h.y + h.h - frame, z0, h.w, frame, t, "frame", unit);
    bag.min("openings", "frame-charcoal", h.x, h.y, z0, frame, h.h, t, "frame", unit);
    bag.min("openings", "frame-charcoal", h.x + h.w - frame, h.y, z0, frame, h.h, t, "frame", unit);
    bag.min(
      "openings",
      "steel-galv",
      h.x - 0.03,
      h.y - 0.02,
      zFace - 0.05,
      h.w + 0.06,
      0.018,
      0.08,
      "pan-flash",
      unit,
    );
    bag.min(
      "openings",
      "steel-galv",
      h.x - 0.04,
      h.y + h.h,
      zFace - 0.055,
      h.w + 0.08,
      0.02,
      0.09,
      "head-flash",
      unit,
    );
    bag.min(
      "openings",
      "glass-clear",
      h.x + frame,
      h.y + frame,
      zFace - 0.01,
      h.w - 2 * frame,
      h.h - 2 * frame,
      0.018,
      h.kind === "door" ? "door-glass" : "glass",
      unit,
    );
    if (h.kind === "window" && h.w > 1.4) {
      const mullions = h.w > 2.8 ? 2 : 1;
      for (let m = 1; m <= mullions; m++) {
        bag.min(
          "openings",
          "frame-charcoal",
          h.x + (h.w * m) / (mullions + 1) - 0.018,
          h.y,
          z0,
          0.036,
          h.h,
          t + 0.01,
          "mullion",
          unit,
        );
      }
      bag.min("openings", "frame-charcoal", h.x, h.y + h.h * 0.48, z0, h.w, 0.032, t + 0.01, "transom", unit);
    }
    if (h.kind === "door") {
      bag.min(
        "openings",
        "frame-charcoal",
        h.x + frame,
        h.y + frame,
        zFace + inward * 0.05,
        (h.w - 2 * frame) * 0.94,
        h.h - 2 * frame,
        0.04,
        "leaf",
        unit,
      );
      bag.min("openings", "oak-natural", h.x, h.y - 0.012, zFace - 0.04, h.w, 0.018, 0.14, "threshold", unit);
    }
    bag.min("finishes", "mill-oat", h.x - 0.05, h.y, zFace + inward * 0.09, 0.05, h.h, 0.018, "casing", unit);
    bag.min("finishes", "mill-oat", h.x + h.w, h.y, zFace + inward * 0.09, 0.05, h.h, 0.018, "casing", unit);
    bag.min("finishes", "mill-oat", h.x - 0.05, h.y + h.h, zFace + inward * 0.09, h.w + 0.1, 0.05, 0.018, "casing", unit);
  }
}

function unitHoles(p: BuildingProgram, storey: number, x0: number): { front: Hole[]; rear: Hole[] } {
  const W = p.unitWidth;
  const H = p.storeyHeight;
  const y0 = storey * H;
  if (storey === 0) {
    return {
      front: [
        { x: x0 + 0.45, y: y0, w: 1.05, h: 2.15, kind: "door" },
        { x: x0 + 2.15, y: y0 + 0.85, w: 3.35, h: 1.55, kind: "window" },
      ],
      rear: [{ x: x0 + 1.15, y: y0, w: 3.7, h: 2.25, kind: "door" }],
    };
  }
  return {
    front: [
      { x: x0 + 0.45, y: y0 + 0.9, w: 2.2, h: 1.45, kind: "window" },
      { x: x0 + 3.15, y: y0 + 0.9, w: 2.4, h: 1.45, kind: "window" },
    ],
    rear: [
      { x: x0 + 0.5, y: y0 + 0.9, w: 2.3, h: 1.4, kind: "window" },
      { x: x0 + 3.2, y: y0 + 0.9, w: 2.3, h: 1.4, kind: "window" },
    ],
  };
}

function buildSite(bag: Bag, p: BuildingProgram, ox: number, totalW: number) {
  const D = p.unitDepth;
  bag.min("site", "grass", ox - 8, -0.07, -9, totalW + 16, 0.07, D + 22, "lawn");
  bag.min("site", "asphalt", ox - 8, -0.04, -8.4, totalW + 16, 0.05, 6.2, "street");
  bag.min("site", "paving", ox - 1.2, 0, -1.85, totalW + 2.4, 0.06, 1.9, "sidewalk");
  bag.min("site", "concrete-cip", ox - 1.4, -0.12, -2.05, totalW + 2.8, 0.18, 0.22, "curb");
  for (let i = 0; i < p.units; i++) {
    const x0 = ox + i * p.unitWidth;
    bag.min("site", "paving", x0 + 0.35, 0.01, 0.05, 1.5, 0.05, 1.1, "stoop", i);
    bag.min("site", "soil", x0 + 2.1, 0.02, 0.15, p.unitWidth - 2.5, 0.18, 0.85, "planter", i);
    bag.min("site", "foliage", x0 + 2.15, 0.2, 0.2, p.unitWidth - 2.6, 0.42, 0.75, "hedge", i, { geom: "ico" });
    if (p.hasRearGarden) {
      bag.min("site", "paving", x0 + 0.4, 0.02, D + 0.05, p.unitWidth - 0.8, 0.05, 2.4, "patio", i);
      bag.min("site", "foliage", x0 + 0.3, 0.05, D + 6.4, p.unitWidth - 0.6, 0.85, 0.42, "rear-hedge", i, { geom: "ico" });
      bag.min("site", "steel-galv", x0 + 0.15, 0, D + 6.7, p.unitWidth - 0.3, 1.15, 0.04, "fence", i);
      const tx = x0 + p.unitWidth * 0.55;
      const tz = D + 4.2;
      bag.add("site", "bark", tx, 0.85, tz, 0.28, 1.7, 0.28, "tree-trunk", i, { geom: "cyl" });
      bag.add("site", "foliage", tx, 2.35, tz, 2.05, 1.85, 2.05, "canopy", i, { geom: "ico" });
      bag.add("site", "foliage", tx + 0.55, 2.05, tz + 0.28, 1.25, 1.15, 1.25, "canopy", i, { geom: "ico" });
      bag.add("site", "foliage", tx - 0.48, 2.15, tz - 0.32, 1.15, 1.05, 1.15, "canopy", i, { geom: "ico" });
    }
  }
}

function buildExcavation(bag: Bag, p: BuildingProgram, ox: number, totalW: number) {
  const D = p.unitDepth;
  const depth = FROST + 0.12;
  bag.min("excavation", "soil", ox - 1.4, -depth, -1.4, 0.55, depth - 0.02, D + 2.8, "cut-w");
  bag.min("excavation", "soil", ox + totalW + 0.85, -depth, -1.4, 0.55, depth - 0.02, D + 2.8, "cut-e");
  bag.min("excavation", "soil", ox - 1.4, -depth, -1.4, totalW + 2.8, depth - 0.02, 0.55, "cut-n");
  bag.min("excavation", "soil", ox - 1.4, -depth, D + 0.85, totalW + 2.8, depth - 0.02, 0.55, "cut-s");
  bag.min("excavation", "soil", ox - 0.9, -depth, -0.9, totalW + 1.8, 0.08, D + 1.8, "subgrade");
  const corners: [number, number][] = [
    [ox - 1.15, -1.15],
    [ox + totalW + 1.15, -1.15],
    [ox - 1.15, D + 1.15],
    [ox + totalW + 1.15, D + 1.15],
  ];
  for (const [cx, cz] of corners) {
    bag.min("excavation", "timber-spf", cx - 0.7, 0, cz - 0.04, 1.4, 0.9, 0.04, "batter");
    bag.min("excavation", "timber-spf", cx - 0.04, 0, cz - 0.7, 0.04, 0.9, 1.4, "batter");
    bag.min("excavation", "steel-galv", cx - 0.7, 0.86, cz - 0.01, 1.4, 0.012, 0.012, "string-line");
    bag.min("excavation", "steel-galv", cx - 0.01, 0.86, cz - 0.7, 0.012, 0.012, 1.4, "string-line");
  }
}

function buildFoundation(bag: Bag, p: BuildingProgram, ox: number, totalW: number) {
  const D = p.unitDepth;
  const fy = -FROST;
  bag.min("foundation", "concrete-cip", ox - 0.25, -0.16, -0.25, totalW + 0.5, 0.16, D + 0.5, "slab");
  bag.min("foundation", "concrete-cip", ox - 0.42, fy, -0.42, totalW + 0.84, 0.38, 0.5, "footing-front");
  bag.min("foundation", "concrete-cip", ox - 0.42, fy, D - 0.08, totalW + 0.84, 0.38, 0.5, "footing-rear");
  bag.min("foundation", "dampproof", ox - 0.28, fy + 0.38, -0.22, totalW + 0.56, 0.55, 0.02, "waterproof");
  bag.min("foundation", "dampproof", ox - 0.28, fy + 0.38, D + 0.2, totalW + 0.56, 0.55, 0.02, "waterproof");
  for (let i = 0; i <= p.units; i++) {
    const x = ox + i * p.unitWidth;
    bag.min("foundation", "concrete-cip", x - 0.24, fy, -0.2, 0.48, 0.38, D + 0.4, "footing-party");
  }
  bag.min("foundation", "timber-treated", ox - 0.12, 0, -0.04, totalW + 0.24, STUD, CAVITY, "sill-plate");
  bag.min("foundation", "timber-treated", ox - 0.12, 0, D - CAVITY + 0.04, totalW + 0.24, STUD, CAVITY, "sill-plate");
  bag.min("foundation", "gravel", ox - 0.55, fy, -0.78, totalW + 1.1, 0.16, 0.38, "drain-gravel");
  bag.add(
    "foundation",
    "pvc-dwv",
    ox + totalW / 2,
    fy + 0.08,
    -0.62,
    0.1,
    totalW + 0.8,
    0.1,
    "drain-tile",
    undefined,
    { geom: "cyl", rz: Math.PI / 2 },
  );
  bag.add(
    "foundation",
    "steel-dark",
    ox + totalW / 2,
    fy + 0.14,
    -0.22,
    0.016,
    totalW + 0.5,
    0.016,
    "rebar",
    undefined,
    { geom: "cyl", rz: Math.PI / 2 },
  );
  bag.add(
    "foundation",
    "steel-dark",
    ox + totalW / 2,
    fy + 0.24,
    -0.22,
    0.016,
    totalW + 0.5,
    0.016,
    "rebar",
    undefined,
    { geom: "cyl", rz: Math.PI / 2 },
  );
  bag.add(
    "foundation",
    "steel-dark",
    ox + totalW / 2,
    fy + 0.14,
    D + 0.12,
    0.016,
    totalW + 0.5,
    0.016,
    "rebar",
    undefined,
    { geom: "cyl", rz: Math.PI / 2 },
  );
  bag.min("exterior", "steel-galv", ox - 0.2, 0.92, -0.08, totalW + 0.4, 0.012, 0.04, "weep-screed");
  for (let x = ox + 0.3; x < ox + totalW; x += 1.22) {
    nailY(bag, "fasteners", x, 0.09, 0.04, 0.22, "anchor");
    bag.add("fasteners", "fastener-zinc", x, 0.21, 0.04, 0.022, 0.01, 0.022, "anchor-nut", undefined, { geom: "cyl" });
    nailY(bag, "fasteners", x, 0.09, D - 0.04, 0.22, "anchor");
    bag.add("fasteners", "fastener-zinc", x, 0.21, D - 0.04, 0.022, 0.01, 0.022, "anchor-nut", undefined, { geom: "cyl" });
  }
}

function buildUnderslab(bag: Bag, p: BuildingProgram, ox: number, totalW: number) {
  const D = p.unitDepth;
  bag.min("underslab", "gravel", ox - 0.18, -0.28, -0.18, totalW + 0.36, 0.12, D + 0.36, "gravel-bed");
  bag.min("underslab", "poly-6mil", ox - 0.2, -0.165, -0.2, totalW + 0.4, 0.008, D + 0.4, "poly");
  const rx = ox + totalW * 0.35;
  const rz = D * 0.45;
  bag.min("underslab", "pvc-dwv", rx, -0.22, rz, 0.1, 0.55, 0.1, "radon", undefined, { geom: "cyl" });
  bag.add(
    "underslab",
    "pvc-dwv",
    ox + 1.4 + 0.0375,
    -0.24 + 0.0375,
    4.6 + 0.8,
    0.075,
    1.6,
    0.075,
    "underslab-waste",
    undefined,
    { geom: "cyl", rx: Math.PI / 2 },
  );
}

function iJoists(bag: Bag, x0: number, x1: number, yTop: number, z0: number, z1: number, unit?: number) {
  const yb = yTop - IJOIST;
  const span = z1 - z0;
  bag.min("framing", "timber-spf", x0, yb, z0, x1 - x0, IJOIST, STUD, "rim-joist", unit);
  bag.min("framing", "timber-spf", x0, yb, z1 - STUD, x1 - x0, IJOIST, STUD, "rim-joist", unit);
  const fw = 0.063;
  const fl = 0.038;
  const tw = 0.011;
  for (let x = x0 + 0.22; x < x1 - 0.12; x += OC) {
    bag.min("framing", "timber-spf", x - fw / 2, yb, z0 + STUD, fw, fl, span - 2 * STUD, "i-flange", unit);
    bag.min("framing", "osb-716", x - tw / 2, yb + fl, z0 + STUD, tw, IJOIST - 2 * fl, span - 2 * STUD, "i-web", unit);
    bag.min("framing", "timber-spf", x - fw / 2, yb + IJOIST - fl, z0 + STUD, fw, fl, span - 2 * STUD, "i-flange", unit);
    hangerU(bag, x, yb, z0 + STUD + 0.01, 1, unit);
    hangerU(bag, x, yb, z1 - STUD - 0.01, -1, unit);
  }
  bag.min("framing", "timber-spf", x0 + 0.15, yb, (z0 + z1) / 2 - 0.02, x1 - x0 - 0.3, IJOIST - 0.02, 0.038, "blocking", unit);
}

function hangerU(bag: Bag, x: number, y: number, z: number, sign: number, unit?: number) {
  const t = 0.004;
  const w = 0.072;
  const seat = 0.042;
  const zh = z - sign * seat * 0.5;
  bag.min("fasteners", "fastener-galv", x - w / 2, y, zh - t / 2, t, IJOIST, seat, "hanger", unit);
  bag.min("fasteners", "fastener-galv", x + w / 2 - t, y, zh - t / 2, t, IJOIST, seat, "hanger", unit);
  bag.min("fasteners", "fastener-galv", x - w / 2, y, zh - t / 2, w, t, seat, "hanger", unit);
  nailZ(bag, "fasteners", x - w / 2 + 0.006, y + 0.05, z, 0.038, "hanger-nail", unit);
  nailZ(bag, "fasteners", x - w / 2 + 0.006, y + IJOIST - 0.05, z, 0.038, "hanger-nail", unit);
  nailZ(bag, "fasteners", x + w / 2 - 0.006, y + 0.05, z, 0.038, "hanger-nail", unit);
}

function nailZ(
  bag: Bag,
  layer: LayerId,
  x: number,
  y: number,
  z: number,
  len: number,
  kind: string,
  unit?: number,
) {
  const dia = kind === "nail-plate" ? 0.0041 : 0.0033;
  bag.add(layer, "fastener-bright", x, y, z, dia, len, dia, kind, unit, { geom: "cyl", rx: Math.PI / 2 });
}

function nailY(bag: Bag, layer: LayerId, x: number, y: number, z: number, len: number, kind: string, unit?: number) {
  const dia = 0.0127;
  bag.add(layer, "fastener-zinc", x, y, z, dia, len, dia, kind, unit, { geom: "cyl" });
}

function sheathingNails(
  bag: Bag,
  zFace: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  holes: Hole[],
  unit?: number,
) {
  const edge = 0.152;
  const field = 0.305;
  const len = 0.064;
  const z = zFace + (zFace < 1 ? -0.006 : 0.006);
  for (let y = y0 + 0.04; y <= y1 - 0.03; y += y === y0 + 0.04 || y > y1 - 0.2 ? edge : field) {
    for (let x = x0 + 0.04; x <= x1 - 0.03; x += edge) {
      const onEdge = y < y0 + 0.12 || y > y1 - 0.12 || x < x0 + 0.12 || x > x1 - 0.12;
      if (!onEdge && Math.abs((x - x0) % field) > 0.04 && Math.abs((x - x0) % field) < field - 0.04) {
        /* field uses coarser step below */
      }
      if (!onEdge) continue;
      if (inHole(x, holes, y - 0.04, y + 0.04)) continue;
      nailZ(bag, "fasteners", x, y, z, len, "nail-sheathing", unit);
    }
  }
  for (let y = y0 + field; y < y1 - 0.12; y += field) {
    for (let x = x0 + field; x < x1 - 0.12; x += field) {
      if (inHole(x, holes, y - 0.05, y + 0.05)) continue;
      nailZ(bag, "fasteners", x, y, z, len, "nail-sheathing", unit);
    }
  }
}

function plateNails(bag: Bag, zC: number, x0: number, x1: number, y0: number, y1: number, holes: Hole[], unit?: number) {
  const z = zC;
  for (let x = x0 + OC; x < x1 - 0.05; x += OC) {
    if (inHole(x, holes, y0 + 0.1, y1 - 0.1)) continue;
    nailZ(bag, "fasteners", x, y0 + STUD * 0.5, z, 0.082, "nail-plate", unit);
    nailZ(bag, "fasteners", x, y1 - STUD * 1.5, z, 0.082, "nail-plate", unit);
  }
}

function hurricaneTies(bag: Bag, x0: number, x1: number, y1: number, zFront: number, zRear: number, unit?: number) {
  for (let x = x0 + OC; x < x1 - 0.08; x += OC * 2) {
    bag.min("fasteners", "fastener-galv", x - 0.02, y1 - 0.12, zFront - 0.01, 0.04, 0.11, 0.018, "hurricane-tie", unit);
    bag.min("fasteners", "fastener-galv", x - 0.02, y1 - 0.12, zRear - 0.01, 0.04, 0.11, 0.018, "hurricane-tie", unit);
  }
}

function cornerStraps(bag: Bag, x0: number, x1: number, y1: number, z: number, unit?: number) {
  bag.min("fasteners", "fastener-galv", x0 + 0.02, y1 - 0.05, z, 0.42, 0.002, 0.05, "strap", unit);
  bag.min("fasteners", "fastener-galv", x1 - 0.44, y1 - 0.05, z, 0.42, 0.002, 0.05, "strap", unit);
}

function holdDown(bag: Bag, x: number, y0: number, z: number, unit?: number) {
  bag.min("fasteners", "fastener-galv", x, y0, z, 0.05, 0.46, 0.01, "hold-down", unit);
  bag.min("fasteners", "fastener-galv", x, y0, z, 0.09, 0.01, 0.09, "hold-down", unit);
  nailY(bag, "fasteners", x + 0.025, y0 + 0.12, z + 0.02, 0.08, "hold-lag", unit);
  nailY(bag, "fasteners", x + 0.025, y0 + 0.28, z + 0.02, 0.08, "hold-lag", unit);
}

function buildStairs(bag: Bag, p: BuildingProgram, x0: number, unit: number) {
  const H = p.storeyHeight;
  const treads = 16;
  const rise = H / treads;
  const run = 0.254;
  const sx = x0 + 1.55;
  const sz = 0.85;
  bag.min("framing", "timber-spf", sx - 0.02, 0, sz, 0.038, H - 0.05, treads * run, "stringer", unit);
  bag.min("framing", "timber-spf", sx + 0.93, 0, sz, 0.038, H - 0.05, treads * run, "stringer", unit);
  for (let i = 0; i < treads; i++) {
    bag.min("interior", "oak-natural", sx, i * rise, sz + i * run, 0.95, 0.028, run + 0.02, "tread", unit);
  }
  bag.min("interior", "steel-dark", sx - 0.04, 0.9, sz, 0.03, H - 1, treads * run, "rail", unit);
  bag.min("interior", "steel-dark", sx + 0.96, 0.9, sz, 0.03, H - 1, treads * run, "rail", unit);
}

function buildInteriors(bag: Bag, p: BuildingProgram, x0: number, unit: number) {
  const W = p.unitWidth;
  const D = p.unitDepth;
  const H = p.storeyHeight;
  const t = 0.1;
  wallZ(bag, "interior", "paint-alabaster", x0 + 1.5, 0.25, 4.4, 0, H, t, [], "hall-wall", unit);
  wallX(bag, "interior", "paint-alabaster", 4.4, x0 + 0.12, x0 + 1.55, 0, H, t, [], "wc-wall", unit);
  wallZ(
    bag,
    "interior",
    "paint-alabaster",
    x0 + 1.55,
    4.4,
    6.05,
    0,
    H,
    t,
    [{ x: 4.7, y: 0, w: 0.8, h: 2.05, kind: "door" }],
    "wc-door-wall",
    unit,
  );
  bag.min("interior", "mill-white", x0 + 1.52, 0, 4.72, 0.04, 2.05, 0.78, "door-interior", unit);
  bag.min("interior", "tile-porcelain", x0 + 0.18, 0.01, 4.5, 1.28, 0.02, 1.45, "wc-pan", unit);
  bag.add("interior", "mill-white", x0 + 0.45, 0.42, 5.55, 0.38, 0.42, 0.52, "toilet", unit);
  bag.min("interior", "mill-white", x0 + 0.22, 0.78, 4.62, 0.5, 0.12, 0.4, "wc-vanity", unit);

  bag.min("interior", "mill-oat", x0 + 0.2, 0, D - 3.55, 0.6, 0.9, 3.1, "base-cab", unit);
  bag.min("finishes", "quartz-calacatta", x0 + 0.2, 0.9, D - 3.55, 0.62, 0.04, 3.1, "counter", unit);
  bag.min("interior", "mill-oat", x0 + 0.2, 1.45, D - 3.55, 0.38, 0.7, 3.1, "upper-cab", unit);
  bag.min("interior", "steel-dark", x0 + 0.48, 0.55, D - 2.2, 0.52, 1.72, 0.58, "fridge", unit);
  bag.min("interior", "steel-galv", x0 + 0.42, 0.92, D - 3.05, 0.42, 0.14, 0.48, "sink", unit);
  bag.min("interior", "steel-dark", x0 + 0.38, 0.94, D - 2.55, 0.5, 0.04, 0.52, "cooktop", unit);
  bag.min("interior", "steel-dark", x0 + 0.4, 1.55, D - 2.55, 0.48, 0.12, 0.5, "hood", unit);
  bag.min("interior", "mill-oat", x0 + 2.15, 0, D - 2.55, 1.7, 0.9, 0.85, "island", unit);
  bag.min("finishes", "quartz-calacatta", x0 + 2.15, 0.9, D - 2.55, 1.7, 0.04, 0.85, "island-top", unit);

  bag.min("interior", "fabric", x0 + 2.6, 0.38, 2.5, 2.4, 0.55, 0.95, "sofa", unit);
  bag.min("interior", "fabric", x0 + 2.7, 0.62, 2.42, 2.2, 0.22, 0.28, "sofa", unit);
  bag.min("interior", "oak-natural", x0 + 3.1, 0.32, 4.0, 1.35, 0.08, 0.75, "table", unit);

  bag.min("finishes", "mill-oat", x0 + 0.14, 0, 0.14, W - 0.28, 0.08, 0.014, "baseboard", unit);
  bag.min("finishes", "mill-oat", x0 + 0.14, 0, D - 0.16, W - 0.28, 0.08, 0.014, "baseboard", unit);

  if (p.storeys > 1) {
    const y = H;
    wallZ(
      bag,
      "interior",
      "paint-alabaster",
      x0 + W * 0.5,
      0.25,
      5.2,
      y,
      y + H,
      t,
      [{ x: 2.2, y: y, w: 0.85, h: 2.05, kind: "door" }],
      "bed-split",
      unit,
    );
    wallX(
      bag,
      "interior",
      "paint-alabaster",
      5.25,
      x0 + 0.15,
      x0 + W - 0.15,
      y,
      y + H,
      t,
      [{ x: x0 + W - 2.3, y: y, w: 0.85, h: 2.05, kind: "door" }],
      "bath-wall",
      unit,
    );
    bag.min("interior", "linen", x0 + 0.4, y + 0.28, 0.7, 1.9, 0.28, 1.6, "bed-a", unit);
    bag.min("interior", "linen", x0 + W * 0.5 + 0.35, y + 0.28, 0.7, 1.9, 0.28, 1.6, "bed-b", unit);
    bag.min("interior", "mill-oat", x0 + 0.3, y, 3.4, 1.1, 1.15, 0.5, "wardrobe", unit);
    bag.min("interior", "tile-porcelain", x0 + W - 2.55, y + 0.01, 5.4, 2.3, 0.02, D - 5.7, "bath-tile", unit);
    bag.min("interior", "mill-white", x0 + W - 2.4, y + 0.4, 5.55, 0.95, 0.55, 0.45, "tub", unit);
    bag.min("interior", "mill-white", x0 + W - 0.85, y + 0.42, 6.4, 0.38, 0.42, 0.52, "toilet-up", unit);
    bag.min("interior", "mill-white", x0 + W - 2.35, y + 0.8, 6.85, 0.9, 0.12, 0.42, "vanity", unit);
    bag.min("interior", "glass-clear", x0 + W - 1.35, y + 0.95, 5.5, 0.02, 1.85, 0.9, "shower-glass", unit);
    bag.min("finishes", "mill-oat", x0 + 0.14, y, 0.14, W - 0.28, 0.08, 0.014, "baseboard", unit);
  }
}

function buildMep(bag: Bag, p: BuildingProgram, x0: number, unit: number) {
  const W = p.unitWidth;
  const D = p.unitDepth;
  const H = p.storeyHeight;
  const floors = p.storeys;
  const riserX = x0 + 1.15;
  const riserZ = 5.15;
  bag.min("hvac", "steel-galv", riserX, 0.3, riserZ, 0.38, floors * H - 0.5, 0.32, "riser", unit);
  for (let s = 0; s < floors; s++) {
    const y = s * H + H - 0.32;
    bag.min("hvac", "steel-galv", x0 + 0.35, y, 2.4, W - 0.7, 0.22, 0.32, "trunk", unit);
    bag.min("hvac", "steel-galv", x0 + W * 0.45, y, 2.55, 0.28, 0.18, D - 3.4, "branch", unit);
    bag.min("hvac", "steel-galv", x0 + 0.9, y - 0.12, 1.4, 0.35, 0.12, 0.35, "boot", unit);
    bag.min("hvac", "steel-galv", x0 + W - 1.4, y - 0.12, 1.4, 0.35, 0.12, 0.35, "boot", unit);
    bag.min("hvac", "steel-galv", x0 + W * 0.5, y - 0.12, D - 2.0, 0.35, 0.12, 0.35, "boot", unit);
    bag.min("hvac", "steel-galv", x0 + 1.1, s * H + 2.55, 2.2, 0.28, 0.04, 0.28, "register", unit);
    bag.min("hvac", "steel-galv", x0 + W - 1.5, s * H + 2.55, 2.2, 0.28, 0.04, 0.28, "register", unit);
  }
  bag.min("electrical", "device-blk", x0 + 0.22, 0.7, 0.55, 0.12, 0.85, 0.38, "panel", unit);
  for (let s = 0; s < floors; s++) {
    const y = s * H + 0.32;
    bag.add(
      "electrical",
      "conduit",
      x0 + 0.28 + 0.0125,
      y + 0.0125,
      0.7 + (D - 1.2) / 2,
      0.025,
      D - 1.2,
      0.025,
      "home-run",
      unit,
      { geom: "cyl", rx: Math.PI / 2 },
    );
    bag.add(
      "electrical",
      "conduit",
      x0 + 0.3 + (W - 0.6) / 2,
      s * H + 1.2 + 0.011,
      0.35 + 0.011,
      0.022,
      W - 0.6,
      0.022,
      "ring",
      unit,
      { geom: "cyl", rz: Math.PI / 2 },
    );
    for (let k = 0; k < 4; k++) {
      bag.min(
        "electrical",
        "device-blk",
        x0 + 0.35 + k * ((W - 1) / 3),
        s * H + 1.15,
        0.22,
        0.08,
        0.12,
        0.04,
        "device",
        unit,
      );
    }
    bag.min("electrical", "device-blk", x0 + W * 0.35, s * H + H - 0.08, 2.6, 0.14, 0.05, 0.14, "can-light", unit, {
      geom: "cyl",
    });
    bag.min("electrical", "device-blk", x0 + W * 0.65, s * H + H - 0.08, 3.8, 0.14, 0.05, 0.14, "can-light", unit, {
      geom: "cyl",
    });
  }
  const stackX = x0 + W - 1.55;
  const stackZ = 6.1;
  bag.min("plumbing", "copper", stackX, 0.05, stackZ, 0.09, floors * H + 0.4, 0.09, "soil-stack", unit, { geom: "cyl" });
  bag.add("plumbing", "pex-hot", x0 + 0.35 + 0.014, 0.22 + 0.014, D - 3.4 + 1.3, 0.028, 2.6, 0.028, "hw-kit", unit, {
    geom: "cyl",
    rx: Math.PI / 2,
  });
  bag.add("plumbing", "pex-cold", x0 + 0.38 + 0.014, 0.18 + 0.014, D - 3.4 + 1.3, 0.028, 2.6, 0.028, "cw-kit", unit, {
    geom: "cyl",
    rx: Math.PI / 2,
  });
  bag.add("plumbing", "pex-hot", stackX - 0.8 + 0.014, H + 0.22 + 0.014, 5.5 + 0.7, 0.028, 1.4, 0.028, "hw-bath", unit, {
    geom: "cyl",
    rx: Math.PI / 2,
  });
  bag.add("plumbing", "pex-cold", stackX - 0.75 + 0.014, H + 0.18 + 0.014, 5.5 + 0.7, 0.028, 1.4, 0.028, "cw-bath", unit, {
    geom: "cyl",
    rx: Math.PI / 2,
  });
  bag.add("plumbing", "copper", x0 + 0.7 + 0.03, 0.12 + 0.03, 4.85 + 0.45, 0.06, 0.9, 0.06, "wc-waste", unit, {
    geom: "cyl",
    rx: Math.PI / 2,
  });
}

function buildRoof(bag: Bag, p: BuildingProgram, ox: number, totalW: number) {
  const D = p.unitDepth;
  const top = p.storeys * p.storeyHeight;
  const face = facadeMatId(p.facade);
  const roof = roofMatId(p.roof);
  if (p.roof === "gable") {
    const rise = 1.7;
    bag.min("envelope", "osb-716", ox - 0.2, top, -0.15, totalW + 0.4, 0.05, D + 0.3, "ceiling-deck");
    bag.min("envelope", "osb-716", ox - 0.25, top + 0.04, -0.35, totalW + 0.5, 0.018, D / 2 + 0.5, "roof-deck");
    bag.add("exterior", face, ox + totalW / 2, top + rise / 2, -0.12, totalW + 0.2, rise, 0.12, "gable-front");
    bag.add("exterior", face, ox + totalW / 2, top + rise / 2, D + 0.12, totalW + 0.2, rise, 0.12, "gable-rear");
    bag.min("exterior", roof, ox - 0.35, top + 0.18, -0.45, totalW + 0.7, 0.08, D / 2 + 0.6, "slope-a");
    bag.min("exterior", roof, ox - 0.35, top + 0.18, D / 2 - 0.15, totalW + 0.7, 0.08, D / 2 + 0.6, "slope-b");
    bag.min("framing", "timber-spf", ox, top, D / 2 - 0.05, totalW, rise, 0.1, "ridge");
    bag.min("exterior", "frame-charcoal", ox - 0.38, top + 0.1, -0.48, totalW + 0.76, 0.12, 0.04, "fascia");
    return;
  }
  if (p.roof === "shed") {
    bag.min("envelope", "osb-716", ox - 0.2, top, -0.2, totalW + 0.4, 0.05, D + 0.4, "roof-deck");
    bag.min("exterior", roof, ox - 0.3, top + 0.05, -0.35, totalW + 0.6, 0.08, D + 0.7, "membrane");
    bag.min("exterior", "frame-charcoal", ox - 0.25, top, -0.25, totalW + 0.5, 0.55, 0.12, "high-parapet");
    return;
  }
  bag.min("envelope", "osb-716", ox - 0.15, top, -0.15, totalW + 0.3, 0.05, D + 0.3, "roof-deck");
  bag.min("envelope", "membrane-charcoal", ox - 0.18, top + 0.03, -0.22, totalW + 0.36, 0.01, 0.55, "ice-barrier");
  bag.min("envelope", "membrane-charcoal", ox - 0.16, top + 0.038, 0.28, totalW + 0.32, 0.008, D - 0.2, "felt");
  bag.min("exterior", roof, ox - 0.2, top + 0.05, -0.2, totalW + 0.4, 0.06, D + 0.4, "membrane");
  const ph = p.hasTerrace ? 0.95 : 0.45;
  bag.min("exterior", face, ox - 0.18, top, -0.18, totalW + 0.36, ph, 0.14, "parapet-n");
  bag.min("exterior", face, ox - 0.18, top, D + 0.04, totalW + 0.36, ph, 0.14, "parapet-s");
  bag.min("exterior", face, ox - 0.18, top, -0.18, 0.14, ph, D + 0.36, "parapet-w");
  bag.min("exterior", face, ox + totalW + 0.04, top, -0.18, 0.14, ph, D + 0.36, "parapet-e");
  if (p.hasTerrace) {
    bag.min("finishes", "oak-natural", ox + 0.25, top + 0.07, 0.25, totalW - 0.5, 0.03, D - 0.5, "decking");
    bag.min("exterior", "steel-galv", ox + 0.2, top + 0.1, 0.15, totalW - 0.4, 0.95, 0.04, "rail-n");
    bag.min("exterior", "steel-galv", ox + 0.2, top + 0.1, D - 0.2, totalW - 0.4, 0.95, 0.04, "rail-s");
    bag.min("exterior", "glass-clear", ox + 0.22, top + 0.25, 0.17, totalW - 0.44, 0.7, 0.02, "rail-glass");
  }
  bag.min("exterior", "steel-galv", ox - 0.22, top - 0.08, -0.28, totalW + 0.44, 0.08, 0.1, "gutter");
  bag.min("exterior", "steel-galv", ox - 0.18, 0.15, -0.22, 0.06, top - 0.2, 0.06, "downspout", undefined, { geom: "cyl" });
  bag.min("exterior", "steel-galv", ox + totalW + 0.12, 0.15, -0.22, 0.06, top - 0.2, 0.06, "downspout", undefined, {
    geom: "cyl",
  });
}

export function buildBuilding(p: BuildingProgram): BuildResult {
  const bag = new Bag();
  const W = p.unitWidth;
  const D = p.unitDepth;
  const H = p.storeyHeight;
  const totalW = p.units * W;
  const ox = -totalW / 2;
  const face = facadeMatId(p.facade);
  const plinth = 0.95;

  const frontFrame = CAVITY / 2;
  const rearFrame = D - CAVITY / 2;
  const frontSheath = -OSB / 2;
  const rearSheath = D + OSB / 2;
  const frontWrb = -OSB - WRB / 2;
  const rearWrb = D + OSB + WRB / 2;
  const frontClad = -OSB - WRB - CLAD / 2;
  const rearClad = D + OSB + WRB + CLAD / 2;
  const frontGyp = CAVITY + GYP / 2;
  const rearGyp = D - CAVITY - GYP / 2;

  buildSite(bag, p, ox, totalW);
  buildExcavation(bag, p, ox, totalW);
  buildFoundation(bag, p, ox, totalW);
  buildUnderslab(bag, p, ox, totalW);

  for (let i = 0; i < p.units; i++) {
    const x0 = ox + i * W;
    const x1 = x0 + W;
    for (let s = 0; s < p.storeys; s++) {
      const y0 = s * H;
      const y1 = y0 + H;
      const { front, rear } = unitHoles(p, s, x0);
      framingX(bag, frontFrame, x0, x1, y0, y1, front, i);
      framingX(bag, rearFrame, x0, x1, y0, y1, rear, i);
      if (i === 0) framingZ(bag, x0 + CAVITY / 2, 0, D, y0, y1, i);
      if (i < p.units - 1) framingZ(bag, x1, 0, D, y0, y1, i);
      if (i === p.units - 1) framingZ(bag, x1 - CAVITY / 2, 0, D, y0, y1, i);

      wallX(bag, "envelope", "osb-716", frontSheath, x0, x1, y0, y1, OSB, front, "sheathing", i);
      wallX(bag, "envelope", "osb-716", rearSheath, x0, x1, y0, y1, OSB, rear, "sheathing", i);
      wallX(bag, "envelope", "housewrap", frontWrb, x0, x1, y0, y1, WRB, front, "wrb", i);
      wallX(bag, "envelope", "housewrap", rearWrb, x0, x1, y0, y1, WRB, rear, "wrb", i);
      if (i === 0) {
        wallZ(bag, "envelope", "osb-716", x0 - OSB / 2, 0, D, y0, y1, OSB, [], "sheathing", i);
        wallZ(bag, "envelope", "housewrap", x0 - OSB - WRB / 2, 0, D, y0, y1, WRB, [], "wrb", i);
      }
      if (i === p.units - 1) {
        wallZ(bag, "envelope", "osb-716", x1 + OSB / 2, 0, D, y0, y1, OSB, [], "sheathing", i);
        wallZ(bag, "envelope", "housewrap", x1 + OSB + WRB / 2, 0, D, y0, y1, WRB, [], "wrb", i);
      }

      wallX(bag, "exterior", "brick-red", frontClad, x0, x1, y0, Math.min(y1, y0 === 0 ? plinth : y0), CLAD, front, "plinth", i);
      if (y0 === 0) {
        wallX(bag, "exterior", face, frontClad, x0, x1, plinth, y1, CLAD, front, "cladding", i);
      } else {
        wallX(bag, "exterior", face, frontClad, x0, x1, y0, y1, CLAD, front, "cladding", i);
      }
      wallX(bag, "exterior", face, rearClad, x0, x1, y0, y1, CLAD, rear, "cladding", i);
      if (i === 0) {
        wallZ(bag, "exterior", y0 === 0 ? "brick-red" : face, x0 - OSB - WRB - CLAD / 2, 0, D, y0, y0 === 0 ? plinth : y1, CLAD, [], "end-clad", i);
        if (y0 === 0) wallZ(bag, "exterior", face, x0 - OSB - WRB - CLAD / 2, 0, D, plinth, y1, CLAD, [], "end-clad", i);
      }
      if (i === p.units - 1) {
        wallZ(bag, "exterior", y0 === 0 ? "brick-red" : face, x1 + OSB + WRB + CLAD / 2, 0, D, y0, y0 === 0 ? plinth : y1, CLAD, [], "end-clad", i);
        if (y0 === 0) wallZ(bag, "exterior", face, x1 + OSB + WRB + CLAD / 2, 0, D, plinth, y1, CLAD, [], "end-clad", i);
      }

      wallX(bag, "finishes", "paint-alabaster", frontGyp, x0 + 0.05, x1 - 0.05, y0, y1, GYP, front, "gypsum", i);
      wallX(bag, "finishes", "paint-alabaster", rearGyp, x0 + 0.05, x1 - 0.05, y0, y1, GYP, rear, "gypsum", i);
      openingsX(bag, 0, front, 1, i);
      openingsX(bag, D, rear, -1, i);
      battsX(bag, frontFrame, x0, x1, y0, y1, front, i);
      battsX(bag, rearFrame, x0, x1, y0, y1, rear, i);
      if (i === 0) battsZ(bag, x0 + CAVITY / 2, 0, D, y0, y1, i);
      if (i === p.units - 1) battsZ(bag, x1 - CAVITY / 2, 0, D, y0, y1, i);

      bag.min("envelope", "osb-716", x0 + 0.05, y1 - 0.022, 0.08, W - 0.1, 0.022, D - 0.16, "floor-deck", i);
      iJoists(bag, x0 + 0.08, x1 - 0.08, y1 - 0.022, 0.12, D - 0.12, i);
      bag.min("finishes", "oak-natural", x0 + 0.12, y0 + 0.01, 0.12, W - 0.24, 0.018, D - 0.24, "floor", i);
      if (s === 0) bag.min("finishes", "tile-limestone", x0 + 0.15, 0.014, D - 3.7, W - 0.3, 0.016, 3.4, "kitchen-tile", i);

      holdDown(bag, x0 + 0.06, y0, 0.06, i);
      holdDown(bag, x1 - 0.14, y0, 0.06, i);
      hurricaneTies(bag, x0, x1, y1, frontFrame, rearFrame, i);
      cornerStraps(bag, x0, x1, y1, frontFrame, i);
      plateNails(bag, frontFrame, x0, x1, y0, y1, front, i);
      if (i === 0 && s === 0) {
        sheathingNails(bag, frontSheath, x0, x1, y0, y1, front, i);
      }
    }
    wallZ(bag, "envelope", "osb-716", x0 + W, 0.05, D - 0.05, 0, p.storeys * H, 0.2, [], "party", i);
    wallZ(bag, "finishes", "paint-alabaster", x0 + 0.08, 0.1, D - 0.1, 0, p.storeys * H, GYP, [], "party-gyp", i);
    wallZ(bag, "finishes", "paint-alabaster", x1 - 0.08, 0.1, D - 0.1, 0, p.storeys * H, GYP, [], "party-gyp", i);

    buildStairs(bag, p, x0, i);
    buildInteriors(bag, p, x0, i);
    buildMep(bag, p, x0, i);
  }

  buildRoof(bag, p, ox, totalW);

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (const b of bag.boxes) {
    minX = Math.min(minX, b.x - b.w / 2);
    minY = Math.min(minY, b.y - b.h / 2);
    minZ = Math.min(minZ, b.z - b.d / 2);
    maxX = Math.max(maxX, b.x + b.w / 2);
    maxY = Math.max(maxY, b.y + b.h / 2);
    maxZ = Math.max(maxZ, b.z + b.d / 2);
  }
  return {
    boxes: bag.boxes,
    bounds: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

export type Batch = {
  key: string;
  layer: LayerId;
  matId: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  geom: Geom;
  items: BoxSpec[];
};

export function batchBoxes(boxes: BoxSpec[]): Batch[] {
  const map = new Map<string, Batch>();
  for (const b of boxes) {
    const key = `${b.layer}|${b.matId}|${b.color}|${b.opacity}|${b.geom}`;
    let batch = map.get(key);
    if (!batch) {
      batch = {
        key,
        layer: b.layer,
        matId: b.matId,
        color: b.color,
        roughness: b.roughness,
        metalness: b.metalness,
        opacity: b.opacity,
        geom: b.geom,
        items: [],
      };
      map.set(key, batch);
    }
    batch.items.push(b);
  }
  return [...map.values()];
}
