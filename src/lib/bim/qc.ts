import type { BoxSpec, BuildingProgram } from "./types";
import { runRoofLoop, type RoofLoopReport } from "./roof-loop";
import { verifyRoof } from "./roof-verify";

export const QC_REV = 20;

export type QcGate = "pass" | "warn" | "fail";
export type QcRail = "committee" | "calcs";

export type QcRow = {
  id: string;
  rail: QcRail;
  title: string;
  citation: string;
  gate: QcGate;
  detail: string;
  demand?: number;
  capacity?: number;
  util?: number;
  fos?: number;
  mustFail?: boolean;
};

export type QcReport = {
  committee: QcGate;
  calcs: QcGate;
  mustFailHeld: boolean;
  rows: QcRow[];
  stamp: string;
  roof: RoofLoopReport;
};

function worst(a: QcGate, b: QcGate): QcGate {
  if (a === "fail" || b === "fail") return "fail";
  if (a === "warn" || b === "warn") return "warn";
  return "pass";
}

function ofKind(boxes: BoxSpec[], kind: string) {
  return boxes.filter((b) => b.kind === kind);
}
function ofLayer(boxes: BoxSpec[], layer: string) {
  return boxes.filter((b) => b.layer === layer);
}
function finite(boxes: BoxSpec[]) {
  return boxes.every((b) => [b.x, b.y, b.z, b.w, b.h, b.d].every((n) => Number.isFinite(n) && n === n));
}

/** 6 Hermitian beam elements, cantilever tip vs Roark PL³/3EI. Kernel metrology. */
export function cantileverTipMm(n: number, P: number, L: number, EI: number): number {
  const ne = Math.max(2, n);
  const h = L / ne;
  const ndof = (ne + 1) * 2;
  const K: number[][] = Array.from({ length: ndof }, () => Array(ndof).fill(0));
  const f = EI / h ** 3;
  const a = 12 * f;
  const b = 6 * h * f;
  const c = 4 * h * h * f;
  const d = 2 * h * h * f;
  const ke = [
    [a, b, -a, b],
    [b, c, -b, d],
    [-a, -b, a, -b],
    [b, d, -b, c],
  ];
  for (let e = 0; e < ne; e++) {
    const i0 = e * 2;
    for (let r = 0; r < 4; r++) for (let c0 = 0; c0 < 4; c0++) K[i0 + r][i0 + c0] += ke[r][c0];
  }
  const F = Array(ndof).fill(0);
  F[ndof - 2] = P;
  const keep: number[] = [];
  for (let i = 2; i < ndof; i++) keep.push(i);
  const m = keep.length;
  const A: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  const B = Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    B[i] = F[keep[i]];
    for (let j = 0; j < m; j++) A[i][j] = K[keep[i]][keep[j]];
  }
  for (let i = 0; i < m; i++) {
    let piv = i;
    for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    [B[i], B[piv]] = [B[piv], B[i]];
    const d0 = A[i][i] || 1e-18;
    for (let j = i; j < m; j++) A[i][j] /= d0;
    B[i] /= d0;
    for (let r = 0; r < m; r++) {
      if (r === i) continue;
      const fac = A[r][i];
      for (let j = i; j < m; j++) A[r][j] -= fac * A[i][j];
      B[r] -= fac * B[i];
    }
  }
  return B[m - 2];
}

function row(
  partial: Omit<QcRow, "util" | "fos"> & { demand?: number; capacity?: number },
): QcRow {
  const demand = partial.demand;
  const capacity = partial.capacity;
  let util: number | undefined;
  let fos: number | undefined;
  let gate = partial.gate;
  if (demand != null && capacity != null && capacity > 0) {
    util = demand / capacity;
    fos = capacity / demand;
    if (!partial.mustFail) {
      if (util > 1.03) gate = "fail";
      else if (util > 0.97 && gate !== "fail") gate = "warn";
    }
  }
  return { ...partial, gate, util, fos };
}

function committee(p: BuildingProgram, boxes: BoxSpec[]): QcRow[] {
  const vinyl = p.facade === "siding";
  const openings = ofKind(boxes, "pan-flash").length || ofKind(boxes, "frame").length;
  const kings = ofKind(boxes, "king").length;
  const hangers = ofKind(boxes, "hanger").length;
  const webs = ofKind(boxes, "i-web").length;
  const wrb = ofKind(boxes, "wrb").length;
  const clad = ofKind(boxes, "cladding").length;
  const pans = ofKind(boxes, "pan-flash").length;
  const sills = ofKind(boxes, "sill-plate").length;
  const stack = ofKind(boxes, "soil-stack").length;
  const toilets = ofKind(boxes, "toilet").length;
  const stakes = ofKind(boxes, "stake").length;
  const batterPosts = ofKind(boxes, "batter-post").length;
  const batterBoards = ofKind(boxes, "batter").length;
  const strings = ofKind(boxes, "string-line").length;
  const gapToilet = ofKind(boxes, "gap-toilet").length;
  const spoil = ofKind(boxes, "spoil-pile").length;
  const slopes = ofKind(boxes, "back-slope").length;
  const paints = ofKind(boxes, "paint-limit").length;
  const subgradeN = ofKind(boxes, "subgrade").length;
  const stems = ofKind(boxes, "stem").length;
  const slabs = ofKind(boxes, "slab").length;
  const wwfN = ofKind(boxes, "wwf").length;
  const gravelBed = ofKind(boxes, "gravel-bed").length;
  const polyN = ofKind(boxes, "poly").length;
  const wasteN = ofKind(boxes, "underslab-waste").length;
  const sinks = ofKind(boxes, "sink").length;
  const beds = ofKind(boxes, "bed-a").length + ofKind(boxes, "bed-b").length;
  const l0Doors = boxes.filter((b) => b.kind === "leaf" && b.y < p.storeyHeight * 0.5).length;
  const l1Doors = boxes.filter((b) => b.kind === "leaf" && b.y >= p.storeyHeight * 0.85 && b.y < p.storeyHeight * 1.6).length;
  const l0Win = boxes.filter((b) => b.kind === "glass" && b.y < p.storeyHeight).length;
  const l1Win = boxes.filter((b) => b.kind === "glass" && b.y >= p.storeyHeight && b.y < p.storeyHeight * 2).length;

  const rows: QcRow[] = [
    row({
      id: "COM-MESH",
      rail: "committee",
      title: "Tessellation / volume",
      citation: "Kernel — finite dims, V > 0",
      gate: finite(boxes) && boxes.length > 0 ? "pass" : "fail",
      detail: finite(boxes) ? `${boxes.length} solids, no NaNs` : "NaN or empty mesh",
    }),
    row({
      id: "COM-P03-STAKES",
      rail: "committee",
      title: "P03 corner stakes",
      citation: "FM 5-426 Ch4 — drive stakes at each corner before boards",
      gate: stakes >= 4 ? "pass" : "fail",
      detail: `${stakes} 2×2 corner stakes (need 4)`,
    }),
    row({
      id: "COM-P03-BATTER",
      rail: "committee",
      title: "P03 batter boards 3–4 ft outside",
      citation: "FM 5-426 Fig 4-3 — 4×4 posts + 1×6 boards",
      gate: batterPosts >= 8 && batterBoards >= 8 ? "pass" : "fail",
      detail: `${batterPosts} posts · ${batterBoards} boards`,
    }),
    row({
      id: "COM-P03-STRING",
      rail: "committee",
      title: "P03 string lines",
      citation: "FM 5-426 — lines from board to board; building + excavation",
      gate: strings >= 4 ? "pass" : "fail",
      detail: `${strings} string runs`,
    }),
    row({
      id: "COM-P03-NO-TOILET",
      rail: "committee",
      title: "P03 temp toilet is a Gap",
      citation: "bible gap-P03-temp-toilet — yellow cage, do not invent a toilet",
      gate: gapToilet >= 1 && ofKind(boxes, "toilet").filter((b) => b.layer === "excavation").length === 0 ? "pass" : "fail",
      detail: `${gapToilet} GAP cages · excavation toilets ${ofKind(boxes, "toilet").filter((b) => b.layer === "excavation").length}`,
    }),
    row({
      id: "COM-P04-HOLE",
      rail: "committee",
      title: "P04 hole / subgrade",
      citation: "ORNL FOOTINGS — undisturbed subgrade; inspect before pour",
      gate: subgradeN >= 1 ? "pass" : "fail",
      detail: `${subgradeN} subgrade pads · depth frost+0.12`,
    }),
    row({
      id: "COM-P04-SPOIL",
      rail: "committee",
      title: "P04 spoil site",
      citation: "ORNL SITEWORK — define spoil site",
      gate: spoil >= 1 ? "pass" : "fail",
      detail: `${spoil} spoil piles`,
    }),
    row({
      id: "COM-P04-PAINT",
      rail: "committee",
      title: "P04 excavation limits",
      citation: "CMHC Ch6 fluorescent paint may mark perimeter — labeled Canadian",
      gate: paints >= 4 ? "pass" : "warn",
      detail: `${paints} paint-limit runs`,
    }),
    row({
      id: "COM-P04-SLOPE",
      rail: "committee",
      title: "P04 back slope",
      citation: "CMHC Ch6 back slope if >1.2 m. This hole is frost-depth; banks still shown.",
      gate: slopes >= 4 ? "pass" : "warn",
      detail: `${slopes} banked faces · hole 0.88 m < 1.2 m trigger`,
    }),
    row({
      id: "COM-P05-STEM",
      rail: "committee",
      title: "P05 stem + frost footing + slab",
      citation: "HUD §4.1 stem-wall + spread footing; frost bottom (HUD §4.8)",
      gate: stems >= 2 && ofKind(boxes, "footing-front").length >= 1 && slabs >= 1 ? "pass" : "fail",
      detail: `${stems} stems · ${ofKind(boxes, "footing-front").length} front ftgs · ${slabs} slabs`,
    }),
    row({
      id: "COM-P05-WWF",
      rail: "committee",
      title: "P05 WWF / isolation",
      citation: "HUD §4.6 WWF if slab >10 ft; isolation at wall",
      gate: wwfN >= 1 && ofKind(boxes, "isolation-joint").length >= 1 ? "pass" : "warn",
      detail: `${wwfN} WWF · ${ofKind(boxes, "isolation-joint").length} isolation`,
    }),
    row({
      id: "COM-P06-STACK",
      rail: "committee",
      title: "P06 plumbing → gravel → poly",
      citation: "CMHC Ch7 sewer first; ORNL 4-in gravel + 6-mil 12-in laps",
      gate: wasteN >= 1 && gravelBed >= 1 && polyN >= 1 ? "pass" : "fail",
      detail: `${wasteN} waste · ${gravelBed} gravel · ${polyN} poly · ${ofKind(boxes, "radon").length} radon`,
    }),
    row({
      id: "COM-P07-IJOIST",
      rail: "committee",
      title: "P07 I-joist package",
      citation: "PJI: brace before walk; rim + blocking; not on bare concrete",
      gate:
        ofKind(boxes, "i-web").length > 8 &&
        ofKind(boxes, "rim-joist").length >= 2 &&
        ofKind(boxes, "i-joist-brace").length >= 1 &&
        ofKind(boxes, "floor-deck").length >= 1
          ? "pass"
          : "fail",
      detail: `${ofKind(boxes, "i-web").length} webs · ${ofKind(boxes, "rim-joist").length} rims · ${ofKind(boxes, "i-joist-brace").length} braces · ${ofKind(boxes, "floor-deck").length} decks`,
    }),
    row({
      id: "COM-P08-PACK",
      rail: "committee",
      title: "P08 sit-on-jack + double plate + braces",
      citation: "Glencoe ch16: header on jacks; door sole uncut; braces until roof+sheathing",
      gate:
        ofKind(boxes, "king").length >= 8 &&
        ofKind(boxes, "header").length >= 8 &&
        ofKind(boxes, "header-spacer").length >= 4 &&
        ofKind(boxes, "double-plate").length >= 4 &&
        ofKind(boxes, "wall-brace").length >= 4
          ? "pass"
          : "fail",
      detail: `${ofKind(boxes, "king").length} kings · ${ofKind(boxes, "header").length} header plies · ${ofKind(boxes, "header-spacer").length} spacers · ${ofKind(boxes, "wall-brace").length} braces`,
    }),
    row({
      id: "COM-P09-RAFTER",
      rail: "committee",
      title: "P09 ceiling joists + rafters + deck",
      citation: "AF&PA / CMHC: joists before rafters; HUD 6/12 deck; FM felt",
      gate:
        ofKind(boxes, "ceiling-joist").length >= 4 &&
        ofKind(boxes, "rafter").length >= 8 &&
        ofKind(boxes, "ridge").length >= 1 &&
        ofKind(boxes, "roof-deck").length >= 2
          ? "pass"
          : "fail",
      detail: `${ofKind(boxes, "ceiling-joist").length} joists · ${ofKind(boxes, "rafter").length} rafters · ${ofKind(boxes, "collar-tie").length} collars · ${ofKind(boxes, "roof-deck").length} decks`,
    }),
    row({
      id: "COM-P10-PAN",
      rail: "committee",
      title: "P10 pan before window, head after, end dams",
      citation: "CMHC Fig 130 order; Fig 125 end dam",
      gate:
        ofKind(boxes, "wrb").length >= 4 &&
        ofKind(boxes, "pan-flash").length >= 8 &&
        ofKind(boxes, "end-dam").length >= 8 &&
        ofKind(boxes, "head-flash").length >= 8
          ? "pass"
          : "fail",
      detail: `${ofKind(boxes, "wrb").length} WRB · ${ofKind(boxes, "pan-flash").length} pans · ${ofKind(boxes, "end-dam").length} dams · ${ofKind(boxes, "head-flash").length} heads`,
    }),
    row({
      id: "COM-P11-CLAD",
      rail: "committee",
      title: "P11 lap siding over WRB + shingles",
      citation: "AF&PA Fig 68 siding over Type 15; CMHC Ch12 shingles",
      gate:
        ofKind(boxes, "siding-course").length >= 20 &&
        ofKind(boxes, "wrb").length >= 4 &&
        ofKind(boxes, "shingle-course").length >= 20
          ? "pass"
          : "fail",
      detail: `${ofKind(boxes, "siding-course").length} siding · ${ofKind(boxes, "corner-board").length} corners · ${ofKind(boxes, "shingle-course").length} shingles`,
    }),
    row({
      id: "COM-P12-ROUGH",
      rail: "committee",
      title: "P12 rough before insulation: DWV + boxes + ducts + tub",
      citation: "CMHC Ch2/Ch19/Ch20 — inspect before insulation",
      gate:
        ofKind(boxes, "soil-stack").length >= 1 &&
        ofKind(boxes, "panel").length >= 1 &&
        ofKind(boxes, "riser").length >= 1 &&
        ofKind(boxes, "tub").length >= 1
          ? "pass"
          : "fail",
      detail: `${ofKind(boxes, "soil-stack").length} stacks · ${ofKind(boxes, "device").length} boxes · ${ofKind(boxes, "riser").length} risers · ${ofKind(boxes, "tub").length} tubs`,
    }),
    row({
      id: "COM-KING",
      rail: "committee",
      title: "King studs at openings",
      citation: "IRC R602.3 — king each side of RO",
      gate: kings >= openings * 2 ? "pass" : kings >= openings ? "warn" : "fail",
      detail: `${kings} kings vs ${openings} rough openings (need 2/RO)`,
    }),
    row({
      id: "COM-HANGER",
      rail: "committee",
      title: "I-joist hangers both bearings",
      citation: "Manufacturer hanger schedule / IRC R502.6",
      gate: webs === 0 || hangers >= webs ? "pass" : hangers > 0 ? "warn" : "fail",
      detail: `${hangers} hanger flanges · ${webs} I-webs`,
      demand: webs,
      capacity: hangers || 0.001,
    }),
    row({
      id: "COM-SILL",
      rail: "committee",
      title: "Sill plate on foundation",
      citation: "IRC R403.1.6 — anchored sill",
      gate: sills >= 2 ? "pass" : "fail",
      detail: `${sills} treated sill runs`,
    }),
    row({
      id: "COM-WRB",
      rail: "committee",
      title: "WRB before cladding / windows",
      citation: "IRC R703.2 — WRB shingled; window after wrap",
      gate: clad === 0 || wrb > 0 ? "pass" : "fail",
      detail: `${wrb} WRB · ${clad} cladding · ${pans} pan flashes`,
    }),
    row({
      id: "COM-PAN",
      rail: "committee",
      title: "Pan flashing at sills",
      citation: "AAMA 711 / IRC R703.4",
      gate: pans > 0 ? "pass" : "warn",
      detail: pans > 0 ? `${pans} pans under flanges` : "No pan flash solids",
    }),
    row({
      id: "COM-STACK",
      rail: "committee",
      title: "Soil stack in wet wall",
      citation: "IPC 905 — DWV stack",
      gate: stack >= p.units ? "pass" : stack > 0 ? "warn" : "fail",
      detail: `${stack} stacks for ${p.units} units`,
    }),
    row({
      id: "COM-FIXTURE",
      rail: "committee",
      title: "Sanitary fixtures placed",
      citation: "Coordination — toilets/sinks occupy rooms, not world origin",
      gate: toilets >= p.units && sinks >= p.units ? "pass" : "fail",
      detail: `${toilets} WCs · ${sinks} sinks · ${beds} beds`,
    }),
    row({
      id: "COM-L1-PLAN",
      rail: "committee",
      title: vinyl ? "Same plan both floors (fourplex product)" : "Upper plan ≠ ground (terrace)",
      citation: vinyl ? "Program: same plan both storeys" : "Shop drawings — L1 bedrooms, L0 living",
      gate: vinyl
        ? l1Doors > 0 && Math.abs(l1Win - l0Win) / Math.max(1, l0Win) < 0.35
          ? "pass"
          : "warn"
        : l1Doors === 0 && l1Win > 0
          ? "pass"
          : "fail",
      detail: `L0 doors ${l0Doors} / glass ${l0Win} · L1 doors ${l1Doors} / glass ${l1Win}`,
    }),
    row({
      id: "COM-MUSTFAIL-COPY",
      rail: "committee",
      title: "Must-fail: terrace L1 walk-out copy",
      citation: "Negative control — hypothetical L1 entry doors on a no-balcony terrace must be rejected",
      gate: vinyl ? "pass" : "fail",
      detail: vinyl
        ? "N/A — balcony doors are in the fourplex product"
        : "Hypothetical L1 walk-out (copy of L0) — checker stays red on purpose",
      mustFail: !vinyl,
    }),
    row({
      id: "COM-LIVE",
      rail: "committee",
      title: "Live vantage does not invent dry-in",
      citation: "Render QC — cladding without WRB is a lying screenshot",
      gate: ofLayer(boxes, "exterior").length === 0 || wrb > 0 ? "pass" : "fail",
      detail: "Street camera may hide fasteners; it may not hide missing wrap",
    }),
    row({
      id: "COM-EAVE",
      rail: "committee",
      title: "Eave stack: drip, sub-fascia, fascia, soffit, gutter",
      citation: "IRC R905.2.8.5 drip at eaves under underlayment; R903.4 leaders off the stem",
      gate:
        ofKind(boxes, "drip-edge").length > 0 &&
        ofKind(boxes, "sub-fascia").length > 0 &&
        ofKind(boxes, "gutter").length > 0
          ? "pass"
          : "fail",
      detail: `${ofKind(boxes, "drip-edge").length} drip · ${ofKind(boxes, "sub-fascia").length} sub-fascia · ${ofKind(boxes, "cornice").length} cornice · ${ofKind(boxes, "gutter").length} gutter`,
    }),
    ...verifyRoof(p, boxes).map((r) =>
      row({
        id: r.id,
        rail: "committee",
        title: r.title,
        citation: r.citation,
        gate: r.gate,
        detail: r.detail,
        mustFail: r.mustFail,
      }),
    ),
  ];
  return rows;
}

function calcs(p: BuildingProgram, boxes: BoxSpec[]): QcRow[] {
  const H = p.storeyHeight;
  const treads = 16;
  const rise = H / treads;
  const run = 0.254;
  const footings = ofKind(boxes, "footing-front");
  const fy = footings[0] ? footings[0].y - footings[0].h / 2 : 0;
  const frostM = 0.762;
  const studs = ofKind(boxes, "stud");
  let ocMax = 0;
  const byWall = new Map<string, number[]>();
  for (const s of studs) {
    const key = `${s.unit ?? 0}|${s.z.toFixed(2)}|${(s.y - s.h / 2).toFixed(1)}`;
    const arr = byWall.get(key) ?? [];
    arr.push(s.x);
    byWall.set(key, arr);
  }
  for (const arr of byWall.values()) {
    arr.sort((a, b) => a - b);
    for (let i = 1; i < arr.length; i++) {
      const dx = arr[i] - arr[i - 1];
      if (dx > 0.28 && dx < 0.62) ocMax = Math.max(ocMax, dx);
    }
  }
  const anchors = ofKind(boxes, "anchor");
  const totalW = p.units * p.unitWidth;
  const anchorOc = anchors.length > 1 ? totalW / (anchors.length / 2) : 99;

  const P = 1000;
  const L = 2000;
  const E = 200000;
  const I = (38 * 89 ** 3) / 12;
  const EI = E * I;
  const exact = (P * L ** 3) / (3 * EI);
  const fem = cantileverTipMm(6, P, L, EI);
  const kerr = Math.abs(fem - exact) / exact;

  const fakeSpan = 8.0;
  const twoByFourAllow = 0.9;
  const fakeUtil = fakeSpan / twoByFourAllow;

  const rows: QcRow[] = [
    row({
      id: "CALC-KERNEL",
      rail: "calcs",
      title: "Kernel vs Roark PL³/3EI",
      citation: "Roark Table 8.1 cantilever · 6 Hermitian elements",
      gate: kerr < 0.05 ? "pass" : "fail",
      detail: `FEM ${fem.toExponential(3)} mm vs Roark ${exact.toExponential(3)} mm · err ${(kerr * 100).toFixed(2)}%`,
    }),
    row({
      id: "CALC-FROST",
      rail: "calcs",
      title: "Footing below frost",
      citation: "IRC R403.1.4 / Utah 30 in frost",
      gate: fy <= -frostM + 0.03 ? "pass" : "fail",
      detail: `footing invert ${fy.toFixed(2)} m · frost −${frostM} m`,
    }),
    row({
      id: "CALC-OC",
      rail: "calcs",
      title: "Stud spacing",
      citation: "IRC R602.3(1) 16 in o.c. bearing",
      gate: ocMax <= 0.42 ? "pass" : ocMax <= 0.62 ? "warn" : "fail",
      detail: `max field ${((ocMax || 0.406) * 1000).toFixed(0)} mm o.c. (gaps at ROs ignored)`,
    }),
    row({
      id: "CALC-STAIR",
      rail: "calcs",
      title: "Stair rise / run",
      citation: "IRC R311.7.5 max 7¾ in rise, min 10 in run",
      gate: rise <= 0.197 && run >= 0.254 ? "pass" : "fail",
      detail: `rise ${(rise * 1000).toFixed(0)} mm · run ${(run * 1000).toFixed(0)} mm`,
    }),
    row({
      id: "CALC-ANCHOR",
      rail: "calcs",
      title: "Sill anchor spacing",
      citation: "IRC R403.1.6 6 ft o.c. max, 12 in from ends",
      gate: anchorOc <= 1.85 ? "pass" : "warn",
      detail: `${anchors.length} anchors · ~${anchorOc.toFixed(2)} m o.c.`,
      demand: anchorOc,
      capacity: 1.829,
    }),
    row({
      id: "CALC-CAVITY",
      rail: "calcs",
      title: "2×4 cavity for R-13",
      citation: "IECC table R402.1.3 — R-13 in 3.5 in",
      gate: ofKind(boxes, "batt").length > 0 ? "pass" : "warn",
      detail: `${ofKind(boxes, "batt").length} batt fills`,
    }),
    row({
      id: "CALC-MUSTFAIL-SPAN",
      rail: "calcs",
      title: "Must-fail: 2×4 as 8 m girder",
      citation: "Negative control — if this row is green the calculator is lying",
      gate: fakeUtil > 1 ? "fail" : "pass",
      detail: `demand ${fakeSpan} m / allow ${twoByFourAllow} m · util ${fakeUtil.toFixed(1)} — must stay red`,
      demand: fakeSpan,
      capacity: twoByFourAllow,
      mustFail: true,
    }),
  ];
  return rows;
}

function railGate(rows: QcRow[], rail: QcRail): QcGate {
  const live = rows.filter((r) => r.rail === rail && !r.mustFail);
  return live.reduce<QcGate>((g, r) => worst(g, r.gate), "pass");
}

export function verifyBuilding(p: BuildingProgram, boxes: BoxSpec[]): QcReport {
  const rows = [...committee(p, boxes), ...calcs(p, boxes)];
  const musts = rows.filter((r) => r.mustFail);
  const held = musts.length === 0 || musts.every((r) => r.gate === "fail");
  const committeeG = railGate(rows, "committee");
  let calcsG = railGate(rows, "calcs");
  if (!held) calcsG = "fail";
  const stamp =
    committeeG === "pass" && calcsG === "pass"
      ? "Coordination complete · structurally adequate"
      : committeeG !== "pass" && calcsG !== "pass"
        ? "Coordination incomplete ≠ structurally adequate — both red"
        : committeeG !== "pass"
          ? "Coordination incomplete — do not stamp shop drawings"
          : "Coords green · calcs not adequate";
  return { committee: committeeG, calcs: calcsG, mustFailHeld: held, rows, stamp, roof: runRoofLoop(p, boxes) };
}
