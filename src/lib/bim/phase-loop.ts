/**
 * Phase verifier — bible first, then geometry.
 * One phase at a time. Fasteners are excluded from the viz column.
 * Honest gaps stay gaps (yellow cage). Do not invent a Method.
 */
import { METHODS } from "@/lib/bible/methods";
import { objectsFor } from "@/lib/bible/objects";
import { METHODS_REST } from "@/lib/bible/rest";
import type { MethodRec } from "@/lib/bible/types";
import type { BoxSpec } from "./types";

export type VizStatus = "yes" | "partial" | "missing" | "gap" | "skip-fastener";

export type PhaseBeatRow = {
  beat: number;
  process: string;
  objects: string[];
  materials: string[];
  kinds: string[];
  counts: Record<string, number>;
  viz: VizStatus;
  note: string;
  citation: string;
};

export type PhaseLoopReport = {
  phase: string;
  methodId: string;
  practice: string;
  hold: string[];
  bibleGaps: string[];
  rows: PhaseBeatRow[];
  missingKinds: string[];
  missingMaterials: string[];
  allVizExceptFasteners: boolean;
};

/** Bible object id → BIM kinds that visualize it. Fasteners listed so we can skip. */
export const OBJECT_KINDS: Record<string, { kinds: string[]; material: string; fastener?: boolean; gap?: boolean }> = {
  stakes: { kinds: ["stake"], material: "2×2 corner stakes (FM)" },
  "batter-boards": { kinds: ["batter", "batter-post"], material: "4×4 posts + 1×6 boards, 3–4 ft outside (FM Fig 4-3)" },
  "layout-strings": { kinds: ["string-line"], material: "Heavy cord / fine wire on boards" },
  "gap-toilet": { kinds: ["gap-toilet"], material: "GAP — temp toilet silent; yellow cage only", gap: true },
  "permit-card": { kinds: [], material: "Permit card (P02 — not this phase)" },
  "hole-basement": { kinds: ["hole-basement", "subgrade", "cut-w", "cut-e", "cut-n", "cut-s"], material: "Native soil cut / workspace" },
  "back-slope": { kinds: ["back-slope"], material: "Banked native soil (deep-hole safety)" },
  "spoil-pile": { kinds: ["spoil-pile"], material: "Spoil (native soil stockpile)" },
  "paint-limit": { kinds: ["paint-limit"], material: "Fluorescent marking paint" },
  "stripped-pad": { kinds: ["rough-grade"], material: "Stripped pad / rough grade" },
  subgrade: { kinds: ["subgrade"], material: "Undisturbed footing subgrade" },
  "rough-grade": { kinds: ["rough-grade"], material: "Rough grade ~4 in below finish" },
  "compacted-fill": { kinds: ["compacted-fill"], material: "Compacted fill CLASS (not loose overdig)" },
  footings: { kinds: ["footing-front", "footing-rear", "footing-party"], material: "CIP spread footing below frost" },
  "walls-cip": { kinds: ["stem"], material: "CIP stem wall" },
  stem: { kinds: ["stem"], material: "CIP stem wall, footing to slab" },
  waterproof: { kinds: ["waterproof"], material: "Dampproof / waterproof on stem" },
  "drain-tile": { kinds: ["drain-tile"], material: "4-in perf pipe, holes down" },
  "gravel-envelope": { kinds: ["drain-gravel"], material: "Drain gravel envelope" },
  "sog-slab": { kinds: ["slab"], material: "SOG slab 4 in min" },
  "sog-gravel": { kinds: [], material: "Capillary gravel is P06" },
  "sog-poly": { kinds: [], material: "6-mil poly is P06" },
  "basement-slab": { kinds: ["slab"], material: "CIP slab" },
  "sill-plate": { kinds: ["sill-plate"], material: "PT sill, ≥8 in above grade" },
  "anchor-bolts": { kinds: ["anchor"], material: "½ in anchors ~6 ft o.c.", fastener: true },
  "protection-board": { kinds: ["protection-board"], material: "Protection board on dampproof" },
  wwf: { kinds: ["wwf"], material: "WWF / fibers in slab" },
  "isolation-joint": { kinds: ["isolation-joint"], material: "Isolation at slab edge" },
  "filter-fabric": { kinds: ["filter-fabric"], material: "Filter fabric on drain gravel" },
  "edge-foam": { kinds: ["edge-foam"], material: "Vertical edge insulation" },
  rebar: { kinds: ["rebar"], material: "2-#4 in strip footing" },
  "underslab-gravel": { kinds: ["gravel-bed"], material: "Clean coarse gravel min 4 in" },
  "underslab-plumbing": { kinds: ["underslab-waste"], material: "Underslab plumbing CLASS" },
  "underslab-poly": { kinds: ["poly", "poly-lap"], material: "6-mil poly, 12-in laps" },
  "poly-6mil": { kinds: ["poly", "poly-lap"], material: "6-mil poly, 12-in laps" },
  radon: { kinds: ["radon"], material: "Radon standpipe in gravel (alt)" },
  "trench-backfill": { kinds: ["trench-backfill"], material: "Compacted trench backfill" },
  "caulk-bead": { kinds: ["caulk-bead"], material: "PU caulk at penetrations / wall" },
  "sill-gasket": { kinds: ["sill-gasket"], material: "Sill sealer under PT plate" },
  "i-joists": { kinds: ["i-flange", "i-web"], material: "I-joist CLASS (flange + web)" },
  "i-joist-brace": { kinds: ["i-joist-brace"], material: "Temp 1×4 strut ≤8 ft o.c." },
  "rim-board": { kinds: ["rim-joist"], material: "Rim / band" },
  blocking: { kinds: ["blocking"], material: "Full-depth blocking" },
  "squash-block": { kinds: ["squash-block"], material: "Squash blocks at interior bearing" },
  subfloor: { kinds: ["floor-deck"], material: "OSB subfloor, long way across" },
  "web-stiffener": { kinds: ["web-stiffener"], material: "Web stiffener at hanger" },
  hangers: { kinds: ["hanger"], material: "ICC-ES hangers", fastener: true },
  "wall-south-plates": { kinds: ["plate"], material: "2×4 sole / top plate" },
  "wall-north-plates": { kinds: ["plate"], material: "2×4 sole / top plate" },
  "wall-east-plates": { kinds: ["plate"], material: "2×4 sole / top plate" },
  "wall-west-plates": { kinds: ["plate"], material: "2×4 sole / top plate" },
  "wall-south-studs": { kinds: ["stud"], material: "2×4 @ 16 in o.c." },
  "wall-north-studs": { kinds: ["stud"], material: "2×4 @ 16 in o.c." },
  "wall-east-studs": { kinds: ["stud"], material: "2×4 @ 16 in o.c." },
  "wall-west-studs": { kinds: ["stud"], material: "2×4 @ 16 in o.c." },
  "wall-south-header": { kinds: ["header", "header-spacer", "king", "jack"], material: "Sit-on-jack header + spacer" },
  "door-sole-uncut": { kinds: ["plate"], material: "Door sole uncut until after raise" },
  "door-sole-cut": { kinds: [], material: "Door kerf AFTER raise — not applied" },
  braces: { kinds: ["wall-brace"], material: "Temp 2×4 wall brace" },
  "double-plate": { kinds: ["double-plate"], material: "Double top plate, laps last" },
  partitions: { kinds: ["stud"], material: "Interior partitions after exteriors" },
  "sheathing-deck": { kinds: ["sheathing"], material: "WSP, do not glue wall panels" },
  "wall-south-raised": { kinds: ["stud", "plate"], material: "Raised wall" },
  "wall-north-raised": { kinds: ["stud", "plate"], material: "Raised wall" },
  "wall-east-raised": { kinds: ["stud", "plate"], material: "Raised wall" },
  "wall-west-raised": { kinds: ["stud", "plate"], material: "Raised wall" },
  "sheathing-raised": { kinds: ["sheathing"], material: "Sheathing after raise" },
  "wall-south-deck": { kinds: ["stud", "plate", "king"], material: "Wall assembled on deck" },
  "wall-north-deck": { kinds: ["stud", "plate", "king"], material: "Wall assembled on deck" },
  "wall-east-deck": { kinds: ["stud", "plate", "king"], material: "Wall assembled on deck" },
  "wall-west-deck": { kinds: ["stud", "plate", "king"], material: "Wall assembled on deck" },
  "ceiling-joist": { kinds: ["ceiling-joist"], material: "Ceiling joists before rafters" },
  ridge: { kinds: ["ridge"], material: "Ridge 2 in deeper than rafters" },
  rafter: { kinds: ["rafter"], material: "Common rafters opposite across ridge" },
  "collar-tie": { kinds: ["collar-tie"], material: "Collar ties upper third, every 3rd pair" },
  "roof-sheathing": { kinds: ["roof-deck"], material: "OSB roof deck, long way across" },
  "h-clip": { kinds: ["h-clip"], material: "H-clips at unsupported edges" },
  "roof-felt": { kinds: ["felt"], material: "Roofing felt 2-in top / 4-in side lap" },
  "ice-barrier": { kinds: ["ice-barrier"], material: "Logan ice barrier (city sheet)" },
  wrb: { kinds: ["wrb"], material: "Housewrap / Type 15 CLASS, shingle-lapped" },
  "pan-flash": { kinds: ["pan-flash"], material: "WI sill / pan membrane" },
  "end-dams": { kinds: ["end-dam"], material: "End dam at pan joints" },
  windows: { kinds: ["frame", "glass"], material: "Window unit" },
  "head-flash": { kinds: ["head-flash"], material: "Head / drip flashing" },
  "corner-membrane": { kinds: ["corner-membrane"], material: "WI corner before the unit" },
  shim: { kinds: ["shim"], material: "Shims at jamb / sill" },
  siding: { kinds: ["siding-course", "cladding", "end-clad"], material: "Lap siding over WRB" },
  shingles: { kinds: ["shingle-course", "starter", "ridge-cap"], material: "Asphalt strip shingles" },
  "corner-board": { kinds: ["corner-board"], material: "Corner boards" },
  "wrb-lap": { kinds: ["wrb-lap"], material: "WRB horizontal lap" },
  "mep-plumb": { kinds: ["soil-stack", "wc-waste", "tub-waste", "hw-kit", "cw-kit"], material: "DWV + water CLASS" },
  tub: { kinds: ["tub"], material: "Bathtub set at rough" },
  "mep-elec": { kinds: ["panel", "home-run", "device", "smoke-box", "three-way"], material: "Wiring and boxes CLASS" },
  "mep-hvac": { kinds: ["riser", "trunk", "boot", "furnace"], material: "Ductwork CLASS" },
};

export const PHASE_MATERIAL_KINDS: Record<string, { kind: string; material: string; fastener?: boolean }[]> = {
  P03: [
    { kind: "stake", material: "2×2 corner stake" },
    { kind: "batter-post", material: "2×4 / 4×4 batter-board post" },
    { kind: "batter", material: "1×4 / 1×6 batter board" },
    { kind: "string-line", material: "String / heavy cord / fine wire" },
    { kind: "gap-toilet", material: "GAP cage (not a toilet)" },
  ],
  P04: [
    { kind: "subgrade", material: "Undisturbed subgrade" },
    { kind: "cut-w", material: "West cut / workspace" },
    { kind: "back-slope", material: "Back-sloped bank" },
    { kind: "spoil-pile", material: "Spoil pile" },
    { kind: "paint-limit", material: "Fluorescent excavation paint" },
    { kind: "rough-grade", material: "Rough grade" },
    { kind: "compacted-fill", material: "Compacted fill CLASS" },
  ],
  P05: [
    { kind: "footing-front", material: "Front strip footing" },
    { kind: "footing-rear", material: "Rear strip footing" },
    { kind: "footing-party", material: "Party strip footing" },
    { kind: "stem", material: "CIP stem wall" },
    { kind: "slab", material: "SOG slab" },
    { kind: "rebar", material: "Footing rebar" },
    { kind: "sill-plate", material: "PT sill plate" },
    { kind: "waterproof", material: "Dampproof on stem" },
    { kind: "drain-tile", material: "4-in drain tile" },
    { kind: "drain-gravel", material: "Drain gravel" },
    { kind: "filter-fabric", material: "Filter fabric" },
    { kind: "wwf", material: "WWF in slab" },
    { kind: "isolation-joint", material: "Isolation joint" },
    { kind: "edge-foam", material: "Edge insulation" },
    { kind: "protection-board", material: "Protection board" },
    { kind: "anchor", material: "½ in anchors", fastener: true },
  ],
  P06: [
    { kind: "underslab-waste", material: "Underslab plumbing CLASS" },
    { kind: "trench-backfill", material: "Compacted trench backfill" },
    { kind: "gravel-bed", material: "Clean coarse gravel" },
    { kind: "poly", material: "6-mil poly" },
    { kind: "poly-lap", material: "12-in poly lap" },
    { kind: "caulk-bead", material: "Penetration / wall caulk" },
    { kind: "radon", material: "Radon stub (alt)" },
  ],
  P07: [
    { kind: "sill-gasket", material: "Sill gasket" },
    { kind: "i-flange", material: "I-joist flange" },
    { kind: "i-web", material: "I-joist web" },
    { kind: "i-joist-brace", material: "Temp 1×4 brace" },
    { kind: "rim-joist", material: "Rim board" },
    { kind: "blocking", material: "Blocking" },
    { kind: "squash-block", material: "Squash block" },
    { kind: "web-stiffener", material: "Web stiffener" },
    { kind: "floor-deck", material: "OSB subfloor" },
    { kind: "hanger", material: "Joist hanger", fastener: true },
  ],
  P08: [
    { kind: "plate", material: "2×4 sole / top plate" },
    { kind: "double-plate", material: "Double top plate" },
    { kind: "stud", material: "2×4 @ 16 in o.c." },
    { kind: "king", material: "King stud" },
    { kind: "jack", material: "Jack / trimmer" },
    { kind: "header", material: "Built-up header" },
    { kind: "header-spacer", material: "1/2 in header spacer" },
    { kind: "sill", material: "Rough window sill" },
    { kind: "cripple", material: "Cripple stud" },
    { kind: "corner-post", material: "Corner post" },
    { kind: "wall-brace", material: "Temp wall brace" },
    { kind: "sheathing", material: "WSP wall sheathing" },
  ],
  P09: [
    { kind: "ceiling-joist", material: "Ceiling joist" },
    { kind: "ridge", material: "Ridge board 2 in deeper" },
    { kind: "rafter", material: "Common rafter" },
    { kind: "collar-tie", material: "Collar tie" },
    { kind: "roof-deck", material: "OSB roof deck" },
    { kind: "h-clip", material: "H-clip" },
    { kind: "ice-barrier", material: "Ice barrier (Logan)" },
    { kind: "felt", material: "Roofing felt" },
    { kind: "drip-edge", material: "Drip edge" },
    { kind: "sub-fascia", material: "Sub-fascia" },
  ],
  P10: [
    { kind: "wrb", material: "WRB housewrap" },
    { kind: "pan-flash", material: "Sill pan" },
    { kind: "end-dam", material: "End dam" },
    { kind: "corner-membrane", material: "Corner membrane" },
    { kind: "frame", material: "Window / door frame" },
    { kind: "glass", material: "Glazing" },
    { kind: "head-flash", material: "Head flashing" },
    { kind: "shim", material: "Shim" },
  ],
  P11: [
    { kind: "siding-course", material: "Lap siding course" },
    { kind: "corner-board", material: "Corner board" },
    { kind: "plinth", material: "Brick plinth" },
    { kind: "shingle-course", material: "Asphalt shingle course" },
    { kind: "starter", material: "Starter strip" },
    { kind: "ridge-cap", material: "Ridge cap" },
  ],
  P12: [
    { kind: "soil-stack", material: "Soil stack" },
    { kind: "vent", material: "Roof vent" },
    { kind: "tub-waste", material: "Tub waste" },
    { kind: "tub", material: "Bathtub" },
    { kind: "panel", material: "Service panel" },
    { kind: "device", material: "Device box" },
    { kind: "smoke-box", material: "Smoke alarm box" },
    { kind: "three-way", material: "Three-way switch" },
    { kind: "riser", material: "HVAC riser" },
    { kind: "furnace", material: "Furnace" },
    { kind: "nail-plate", material: "Nail plate" },
  ],
};

/** Explicit beat → objects. Prefer this over infer() so P04 does not pull P05 footings. */
export const PHASE_BEAT_OBJECTS: Record<string, string[][]> = {
  P04: [
    [],
    ["spoil-pile", "paint-limit"],
    ["hole-basement"],
    ["back-slope"],
    ["hole-basement"],
    ["subgrade", "compacted-fill"],
    [],
    ["rough-grade"],
  ],
  P05: [
    [],
    ["footings", "stem"],
    ["drain-tile", "gravel-envelope", "waterproof"],
    ["sog-slab"],
    ["isolation-joint"],
    ["wwf"],
    ["edge-foam"],
    ["footings"],
    ["sill-plate", "anchor-bolts"],
  ],
  P06: [
    ["underslab-plumbing", "trench-backfill"],
    ["underslab-gravel"],
    ["trench-backfill"],
    ["underslab-poly"],
    [],
    ["caulk-bead"],
    ["isolation-joint"],
    ["radon"],
  ],
  P07: [
    ["sill-plate", "sill-gasket", "anchor-bolts"],
    [],
    ["i-joists"],
    ["i-joist-brace"],
    ["rim-board", "blocking", "squash-block"],
    ["web-stiffener", "hangers"],
    [],
    ["subfloor"],
    [],
  ],
  P08: [
    ["subfloor"],
    ["wall-south-plates"],
    ["wall-south-studs", "wall-south-header"],
    ["wall-south-deck", "door-sole-uncut"],
    [],
    ["sheathing-deck"],
    ["braces"],
    ["door-sole-uncut", "braces"],
    ["double-plate"],
  ],
  P09: [
    ["ceiling-joist"],
    ["ridge", "rafter"],
    ["rafter"],
    ["collar-tie"],
    [],
    ["roof-sheathing", "h-clip"],
    ["roof-felt", "ice-barrier"],
    [],
  ],
  P10: [
    [],
    ["sheathing-deck"],
    ["wrb"],
    ["pan-flash", "end-dams", "corner-membrane", "windows", "head-flash"],
    ["head-flash"],
    ["windows", "shim"],
    ["pan-flash"],
    [],
  ],
  P11: [
    ["wrb"],
    ["siding"],
    ["siding"],
    ["siding"],
    [],
    ["corner-board"],
    [],
  ],
  P12: [
    [],
    ["mep-plumb", "tub"],
    ["mep-elec"],
    ["mep-hvac"],
    [],
    [],
    [],
  ],
};

const STUDY_METHOD: Record<string, string> = {
  P03: "m-P03-batter-boards",
  P04: "m-P04-full-excavation",
  P05: "m-P05-slab",
  P06: "m-P06-underslab-prep",
  P07: "m-P07-i-joist",
  P08: "m-P08-stick-16oc-2x4",
  P09: "m-P09-rafter-stick",
  P10: "m-P10-windows-wrb-flashing",
  P11: "m-P11-siding-over-wrb",
  P12: "m-P12-mep-rough",
};

function allMethods(): MethodRec[] {
  return [...METHODS, ...METHODS_REST];
}

function countKind(boxes: BoxSpec[], kind: string) {
  return boxes.filter((b) => b.kind === kind).length;
}

function beatViz(objects: string[], boxes: BoxSpec[]): { viz: VizStatus; counts: Record<string, number>; kinds: string[]; note: string } {
  const counts: Record<string, number> = {};
  const kinds: string[] = [];
  if (objects.length === 0) {
    return { viz: "yes", counts, kinds, note: "Process / check — no physical object in this beat" };
  }
  let anyGap = false;
  let anyMissing = false;
  let anyPresent = false;
  const notes: string[] = [];
  for (const obj of objects) {
    const map = OBJECT_KINDS[obj];
    if (!map) {
      anyMissing = true;
      notes.push(`${obj}: no kind map`);
      continue;
    }
    if (map.fastener) {
      notes.push(`${obj}: fastener — skipped`);
      continue;
    }
    if (map.kinds.length === 0) {
      notes.push(`${obj}: not this phase / later layer`);
      continue;
    }
    kinds.push(...map.kinds);
    if (map.gap) {
      anyGap = true;
      const n = map.kinds.reduce((s, k) => s + countKind(boxes, k), 0);
      counts[obj] = n;
      notes.push(n > 0 ? `${obj}: yellow GAP cage ×${n} (not invented)` : `${obj}: GAP not caged`);
      if (n === 0) anyMissing = true;
      else anyPresent = true;
      continue;
    }
    let n = 0;
    for (const k of map.kinds) n += countKind(boxes, k);
    counts[obj] = n;
    if (n === 0) {
      anyMissing = true;
      notes.push(`${obj}: 0 pieces`);
    } else {
      anyPresent = true;
      notes.push(`${obj}: ${n}`);
    }
  }
  let viz: VizStatus = "yes";
  if (anyGap && !anyMissing) viz = "gap";
  else if (anyMissing && anyPresent) viz = "partial";
  else if (anyMissing) viz = "missing";
  return { viz, counts, kinds, note: notes.join("; ") };
}

export function verifyPhase(phaseId: string, boxes: BoxSpec[]): PhaseLoopReport {
  const method =
    allMethods().find((m) => m.id === STUDY_METHOD[phaseId]) ??
    allMethods().find((m) => m.phase_id === phaseId && m.is_habit);
  if (!method) {
    return {
      phase: phaseId,
      methodId: "—",
      practice: "no habit Method on disk",
      hold: [],
      bibleGaps: [`gap-${phaseId}-method-missing`],
      rows: [],
      missingKinds: [],
      missingMaterials: [],
      allVizExceptFasteners: false,
    };
  }
  const rows: PhaseBeatRow[] = method.how_it_is_done.map((how, i) => {
    const objects =
      PHASE_BEAT_OBJECTS[phaseId]?.[i] ??
      method.objects?.[i] ??
      objectsFor(method, i, how, "build").filter((o) => o !== `phase-${phaseId}`);
    const hit = beatViz(objects, boxes);
    const materials = objects
      .map((o) => OBJECT_KINDS[o]?.material)
      .filter((m): m is string => !!m);
    return {
      beat: i,
      process: how.slice(0, 220),
      objects,
      materials,
      kinds: hit.kinds,
      counts: hit.counts,
      viz: hit.viz,
      note: hit.note,
      citation: method.locators[0] ?? method.id,
    };
  });

  const required = PHASE_MATERIAL_KINDS[phaseId] ?? [];
  const missingMaterials = required
    .filter((r) => !r.fastener && countKind(boxes, r.kind) === 0)
    .map((r) => `${r.kind} (${r.material})`);
  const missingKinds = [...new Set(rows.flatMap((r) => (r.viz === "missing" || r.viz === "partial" ? r.objects : [])))];

  return {
    phase: phaseId,
    methodId: method.id,
    practice: method.practice_name,
    hold: method.inspection_hold_points,
    bibleGaps: method.open_gaps,
    rows,
    missingKinds,
    missingMaterials,
    allVizExceptFasteners: missingMaterials.length === 0,
  };
}
