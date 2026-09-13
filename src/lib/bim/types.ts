export const LAYER_IDS = [
  "site",
  "excavation",
  "foundation",
  "underslab",
  "framing",
  "fasteners",
  "envelope",
  "openings",
  "insulation",
  "hvac",
  "electrical",
  "plumbing",
  "interior",
  "finishes",
  "exterior",
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export type RoofType = "flat" | "shed" | "gable";
export type FacadeType = "stucco" | "brick" | "panel";
export type Geom = "box" | "cyl" | "ico" | "sphere";

export type BuildingProgram = {
  id: string;
  name: string;
  note?: string;
  units: number;
  storeys: number;
  unitWidth: number;
  unitDepth: number;
  storeyHeight: number;
  roof: RoofType;
  facade: FacadeType;
  hasTerrace: boolean;
  hasRearGarden: boolean;
};

export type BoxSpec = {
  layer: LayerId;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rx: number;
  ry: number;
  rz: number;
  geom: Geom;
  matId: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  unit?: number;
  kind: string;
  hex: string;
};

export type BuildResult = {
  boxes: BoxSpec[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
};

export const LAYER_META: Record<
  LayerId,
  { label: string; ifc: string; swatch: string; order: number; hint: string; phase: string }
> = {
  site: {
    label: "Site finish",
    ifc: "IfcSite",
    swatch: "#4a6b3f",
    order: 0,
    hint: "P17 — drive, walks, grade, planting",
    phase: "P17",
  },
  excavation: {
    label: "Excavation",
    ifc: "IfcEarthworksCut",
    swatch: "#5a4636",
    order: 1,
    hint: "P04 — hole, frost depth, batter boards",
    phase: "P04",
  },
  foundation: {
    label: "Foundation",
    ifc: "IfcFooting / IfcSlab",
    swatch: "#c4c0b6",
    order: 2,
    hint: "P05 — frost footings, stem, slab, dampproof",
    phase: "P05",
  },
  underslab: {
    label: "Underslab",
    ifc: "IfcCovering / IfcPipe",
    swatch: "#8a8680",
    order: 3,
    hint: "P06 — gravel, 6-mil poly, radon, waste",
    phase: "P06",
  },
  framing: {
    label: "Framing",
    ifc: "IfcMember / IfcBeam",
    swatch: "#c9a06a",
    order: 4,
    hint: "P07–P08 — 2x4 16 o.c., kings/jacks, I-joists",
    phase: "P08",
  },
  fasteners: {
    label: "Fasteners",
    ifc: "IfcMechanicalFastener",
    swatch: "#9aa3a8",
    order: 5,
    hint: "Nails, hangers, straps, anchors — off in live view",
    phase: "P08",
  },
  envelope: {
    label: "Sheathing / WRB",
    ifc: "IfcWall / IfcRoof",
    swatch: "#d7b07a",
    order: 6,
    hint: "P09–P10 — OSB 7/16, housewrap, roof deck",
    phase: "P09",
  },
  openings: {
    label: "Windows / doors",
    ifc: "IfcWindow / IfcDoor",
    swatch: "#2c2f33",
    order: 7,
    hint: "P10 — frames, pan flash, glass, leaves",
    phase: "P10",
  },
  insulation: {
    label: "Insulation",
    ifc: "IfcCovering",
    swatch: "#e8a0b0",
    order: 8,
    hint: "P13 — cavity batts, air seal",
    phase: "P13",
  },
  hvac: {
    label: "HVAC rough-in",
    ifc: "IfcDuctSegment",
    swatch: "#b0b6bb",
    order: 9,
    hint: "P12 — trunks, branches, boots, riser",
    phase: "P12",
  },
  electrical: {
    label: "Electrical rough-in",
    ifc: "IfcCableCarrier",
    swatch: "#c45a1a",
    order: 10,
    hint: "P12 — panel, homeruns, device boxes",
    phase: "P12",
  },
  plumbing: {
    label: "Plumbing rough-in",
    ifc: "IfcPipeSegment",
    swatch: "#b87333",
    order: 11,
    hint: "P12 — soil stack, PEX, fixture drains",
    phase: "P12",
  },
  interior: {
    label: "Drywall / interiors",
    ifc: "IfcWall / IfcStair / IfcFurnishing",
    swatch: "#ece8df",
    order: 12,
    hint: "P14–P15 — gypsum, stair, millwork, FF&E",
    phase: "P14",
  },
  finishes: {
    label: "Finishes",
    ifc: "IfcCovering",
    swatch: "#8a6a45",
    order: 13,
    hint: "P15 — floors, paint, casing, counters",
    phase: "P15",
  },
  exterior: {
    label: "Cladding / roof",
    ifc: "IfcCovering / IfcRailing",
    swatch: "#f3f0e8",
    order: 14,
    hint: "P11 — cladding, roofing, gutters, rails",
    phase: "P11",
  },
};

/** Field sequence from the construction bible (visual phases only). */
export const BUILD_SEQUENCE: LayerId[] = [
  "excavation",
  "foundation",
  "underslab",
  "framing",
  "fasteners",
  "envelope",
  "openings",
  "exterior",
  "hvac",
  "electrical",
  "plumbing",
  "insulation",
  "interior",
  "finishes",
  "site",
];
