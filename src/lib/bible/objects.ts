import type { BeatKind, MethodRec } from "./types";

const EXPLICIT: Record<string, string[]> = {
  "m-P00-feasibility.0": ["drawings-board", "lot"],
  "m-P00-feasibility.1": ["lot", "lot-wet"],
  "m-P00-feasibility.2": ["lot"],
  "m-P00-feasibility.3": ["test-hole-flag"],
  "m-P00-feasibility.6": ["gap-delivery"],
  "m-P00-drawings-before-permit.0": ["drawings-board"],
  "m-P00-drawings-before-permit.2": ["drawings-board", "permit-card"],
  "m-P01-site-prep.0": ["stakes"],
  "m-P01-site-prep.1": ["stakes", "utility-flags"],
  "m-P01-site-prep.2": ["test-hole"],
  "m-P01-site-prep.3": ["stripped-pad", "spoil-pile"],
  "m-P01-site-prep.5": ["trees"],
  "m-P01-site-prep.7": ["swales"],
  "m-P01-site-prep.8": ["lumber-stack"],
  "m-P02-permits.3": ["permit-card"],
  "m-P02-permits.6": ["inspect-ladder"],
  "m-P02-permit-holds.0": ["permit-card", "inspect-card"],
  "m-P03-batter-boards.0": ["stakes"],
  "m-P03-batter-boards.1": ["batter-boards"],
  "m-P03-batter-boards.2": ["batter-boards", "layout-strings"],
  "m-P04-full-excavation.2": ["hole-basement"],
  "m-P04-full-excavation.3": ["hole-basement", "back-slope"],
  "m-P04-sog-strip.1": ["strip-slab"],
  "m-P05-basement-cip-cmu.2": ["footings"],
  "m-P05-basement-cip-cmu.3": ["walls-cip"],
  "m-P05-basement-cip-cmu.4": ["waterproof"],
  "m-P05-basement-cip-cmu.5": ["drain-tile", "gravel-envelope"],
  "m-P05-basement-cip-cmu.6": ["basement-slab", "poly-6mil"],
  "m-P05-basement-cip-cmu.8": ["sill-plate", "anchor-bolts"],
  "m-P05-waterproof.2": ["waterproof"],
  "m-P05-waterproof.3": ["protection-board"],
  "m-P05-waterproof.4": ["drain-tile", "gravel-envelope"],
  "m-P05-slab.3": ["sog-gravel", "sog-poly", "sog-slab"],
  "m-P05-pwf.1": ["pwf-gravel"],
  "m-P05-pwf.2": ["pwf-plate"],
  "m-P05-pwf.3": ["pwf-walls"],
  "m-P05-pwf.4": ["pwf-sump", "pwf-gravel"],
  "m-P06-underslab-prep.0": ["underslab-plumbing"],
  "m-P06-underslab-prep.1": ["underslab-gravel"],
  "m-P06-underslab-prep.3": ["underslab-poly"],
  "m-P07-i-joist.0": ["sill-plate", "sill-gasket"],
  "m-P07-i-joist.2": ["i-joists"],
  "m-P07-i-joist.3": ["i-joist-brace"],
  "m-P07-i-joist.4": ["rim-board", "blocking"],
  "m-P07-i-joist.7": ["subfloor"],
  "m-P08-stick-16oc-2x4.0": ["subfloor"],
  "m-P08-stick-16oc-2x4.1": ["wall-south-plates", "wall-north-plates", "wall-east-plates", "wall-west-plates"],
  "m-P08-stick-16oc-2x4.2": ["wall-south-studs", "wall-north-studs", "wall-east-studs", "wall-west-studs"],
  "m-P08-stick-16oc-2x4.3": [
    "wall-south-deck",
    "wall-north-deck",
    "wall-east-deck",
    "wall-west-deck",
    "wall-south-header",
    "door-sole-uncut",
  ],
  "m-P08-stick-16oc-2x4.4": ["wall-south-deck", "wall-north-deck", "wall-east-deck", "wall-west-deck"],
  "m-P08-stick-16oc-2x4.5": ["sheathing-deck"],
  "m-P08-stick-16oc-2x4.6": [
    "wall-south-raised",
    "wall-north-raised",
    "wall-east-raised",
    "wall-west-raised",
    "sheathing-raised",
    "braces",
  ],
  "m-P08-stick-16oc-2x4.7": ["door-sole-cut", "braces"],
  "m-P08-stick-16oc-2x4.8": ["partitions", "double-plate"],
  "m-P08-bwl-wsp.3": ["bwp-panels"],
  "m-P08-stairs-cut-stringer.0": ["stairs-well"],
  "m-P08-stairs-cut-stringer.2": ["stairs-stringer"],
  "m-P08-stairs-cut-stringer.4": ["stairs-stringer"],
  "m-P08-stairs-cut-stringer.6": ["kick-plate"],
  "m-P08-stairs-cut-stringer.7": ["stairs-treads"],
  "m-P09-roof-truss.3": ["trusses"],
  "m-P09-roof-truss.4": ["trusses", "truss-brace"],
  "m-P09-roof-truss.6": ["trusses", "gable"],
  "m-P09-roof-sheathing.1": ["roof-sheathing"],
  "m-P09-roof-felt.1": ["roof-felt"],
  "m-P10-windows-wrb-flashing.2": ["wrb"],
  "m-P10-windows-wrb-flashing.3": ["pan-flash", "end-dams", "windows", "head-flash"],
  "m-P11-siding-over-wrb.2": ["siding"],
  "m-P11-asphalt-shingles-finish.2": ["shingles"],
  "m-P12-mep-rough.1": ["mep-plumb", "tub"],
  "m-P12-mep-rough.2": ["mep-elec"],
  "m-P12-mep-rough.3": ["mep-hvac"],
  "m-P13-batt-air-seal.1": ["batt"],
  "m-P13-batt-air-seal.2": ["poly-4mil"],
  "m-P13-batt-poly.0": ["batt"],
  "m-P13-batt-poly.2": ["poly-4mil"],
  "m-P14-gwb-hang.1": ["gwb-ceil"],
  "m-P14-gwb-hang.3": ["gwb-walls"],
  "m-P14-gwb-hang.6": ["tape"],
  "m-P15-interior-finish.2": ["doors-int", "casing"],
  "m-P15-interior-finish.3": ["paint"],
  "m-P15-interior-finish.1": ["floors"],
  "m-P16-mep-trim.0": ["devices", "fixtures", "equipment"],
  "m-P17-site-finish.1": ["grade"],
  "m-P17-site-finish.2": ["drive", "walks"],
  "m-P17-site-finish.4": ["gutters", "splash-block"],
  "m-P18-inspections-co.1": ["inspect-ladder", "co-card"],
  "m-P18-punch-co.2": ["punch-card"],
};

const HIDES: Record<string, string[]> = {
  "m-P08-stick-16oc-2x4.6": [
    "wall-south-deck",
    "wall-north-deck",
    "wall-east-deck",
    "wall-west-deck",
    "sheathing-deck",
  ],
  "m-P08-stick-16oc-2x4.7": ["door-sole-uncut"],
};

function infer(line: string, methodId: string): string[] {
  const t = line.toLowerCase();
  const out: string[] = [];
  const add = (id: string) => {
    if (!out.includes(id)) out.push(id);
  };
  if (t.includes("batter")) add("batter-boards");
  if (t.includes("permit")) add("permit-card");
  if (t.includes("drawing") || t.includes("plans")) add("drawings-board");
  if (t.includes("test hole")) add("test-hole");
  if (t.includes("topsoil") || t.includes("strip")) add("stripped-pad");
  if (t.includes("footing")) add("footings");
  if (t.includes("drain tile") || t.includes("subdrain")) add("drain-tile");
  if (t.includes("waterproof") || t.includes("dampproof")) add("waterproof");
  if (t.includes("6-mil") || t.includes("poly")) add("underslab-poly");
  if (t.includes("gravel")) add("underslab-gravel");
  if (t.includes("i-joist")) add("i-joists");
  if (t.includes("subfloor") || t.includes("sheathing glue")) add("subfloor");
  if (t.includes("truss") && methodId.includes("P09")) add("trusses");
  if (t.includes("felt") && methodId.includes("P09")) add("roof-felt");
  if (t.includes("wrb") || t.includes("housewrap") || t.includes("type 15")) add("wrb");
  if (t.includes("window") && methodId.includes("P10")) add("windows");
  if (t.includes("siding")) add("siding");
  if (t.includes("shingle")) add("shingles");
  if (t.includes("batt")) add("batt");
  if (t.includes("drywall") || t.includes("gwb") || t.includes("gypsum")) add("gwb-walls");
  if (t.includes("gutter") || t.includes("eavestrough")) add("gutters");
  if (t.includes("occupancy") || t.includes("certificate")) add("co-card");
  return out;
}

export function objectsFor(m: MethodRec, i: number, line: string, kind: BeatKind): string[] {
  if (kind === "gap") return [`gap-${m.phase_id}`];
  const key = `${m.id}.${i}`;
  if (EXPLICIT[key]) return EXPLICIT[key];
  if (m.objects && m.objects[i]?.length) return m.objects[i]!;
  const inferred = infer(line, m.id);
  if (inferred.length) return inferred;
  if (kind === "hold") return [];
  return [`phase-${m.phase_id}`];
}

export function hidesFor(m: MethodRec, i: number, _line: string): string[] {
  return HIDES[`${m.id}.${i}`] ?? [];
}
