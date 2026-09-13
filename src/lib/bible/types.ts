export type Market = "logan-wasatch" | "fontana";
export type BeatKind = "build" | "hold" | "gap";
export type HabitOrAlt = "habit" | "alt" | "step";
export type CameraDefault =
  | "aerial-34"
  | "eye-level"
  | "roof-oblique"
  | "site-aerial";

export type FastenerRow = {
  what: string;
  size: string | null;
  pattern: string | null;
  oc: string | null;
  source: string | null;
};

export type MethodRec = {
  id: string;
  phase_id: string;
  practice_name: string;
  habit_or_alt: HabitOrAlt;
  is_habit: boolean;
  markets: Market[];
  how_it_is_done: string[];
  inspection_hold_points: string[];
  fastener_schedule: FastenerRow[];
  do_not_cheap: string[];
  inspector_looks_for: string[];
  inspector_fails?: string[];
  locators: string[];
  source_files: string[];
  sequence_before: string[];
  sequence_after: string[];
  can_overlap_with: string[];
  alt_to: string[];
  open_gaps: string[];
  objects?: string[][];
  spanish_summary?: string;
};

export type Beat = {
  id: string;
  phase_id: string;
  method_id: string;
  practice_name: string;
  beat_index: number;
  kind: BeatKind;
  habit_or_alt: HabitOrAlt;
  markets: Market[];
  how_it_is_done: string;
  sequence_before: string[];
  sequence_after: string[];
  can_overlap_with: string[];
  object_ids: string[];
  hides: string[];
  additive: boolean;
  camera_default: CameraDefault;
  hold_text: string | null;
  fastener_schedule: FastenerRow[];
  do_not_cheap: string[];
  inspector_looks_for: string[];
  inspector_fails: string[];
  source_files: string[];
  locators: string[];
  user_adjust: null;
  gap_id?: string;
  spanish_summary?: string;
};

export type Adjust = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

export const PHASES = [
  { id: "P00", name: "Intake / feasibility" },
  { id: "P01", name: "Site prep" },
  { id: "P02", name: "Permits" },
  { id: "P03", name: "Layout / batter boards" },
  { id: "P04", name: "Excavation" },
  { id: "P05", name: "Foundation" },
  { id: "P06", name: "Underslab MEP" },
  { id: "P07", name: "Floor structure" },
  { id: "P08", name: "Walls / shear / stairs" },
  { id: "P09", name: "Roof / dry-in" },
  { id: "P10", name: "Windows / WRB / flashings" },
  { id: "P11", name: "Cladding / roof finish" },
  { id: "P12", name: "MEP rough" },
  { id: "P13", name: "Insulation / air seal" },
  { id: "P14", name: "Drywall" },
  { id: "P15", name: "Interior finish" },
  { id: "P16", name: "MEP trim" },
  { id: "P17", name: "Site finish" },
  { id: "P18", name: "Punch / CO" },
] as const;

export const PHASE_IDS = PHASES.map((p) => p.id);

export function cameraForPhase(phase: string): CameraDefault {
  if (["P00", "P01", "P02", "P03", "P04", "P05"].includes(phase)) return "aerial-34";
  if (["P09", "P10", "P11"].includes(phase)) return "roof-oblique";
  if (["P17", "P18"].includes(phase)) return "site-aerial";
  return "eye-level";
}

export const HONEST_GAPS: {
  id: string;
  phase_id: string;
  method_id: string;
  text: string;
  markets: Market[];
}[] = [
  {
    id: "gap-P00-delivery-method-alts",
    phase_id: "P00",
    method_id: "m-P00-feasibility",
    text: "Delivery method (custom vs spec vs ADU) is not in ORNL / HUD RSDG / AF&PA. Gap. Do not invent a delivery SOP.",
    markets: ["logan-wasatch", "fontana"],
  },
  {
    id: "gap-P01-demo-existing-house",
    phase_id: "P01",
    method_id: "m-P01-site-prep",
    text: "Demo of an existing house is a Gap.",
    markets: ["logan-wasatch", "fontana"],
  },
  {
    id: "gap-P02-hoa-impact-special-inspect",
    phase_id: "P02",
    method_id: "m-P02-permit-holds",
    text: "HOA, impact fees, and special-inspection agreements are silent in these books. Gap gap-P02-hoa-impact-special-inspect. Do not invent them as Methods.",
    markets: ["logan-wasatch", "fontana"],
  },
  {
    id: "gap-P03-temp-toilet",
    phase_id: "P03",
    method_id: "m-P03-batter-boards",
    text: "Temp toilet is silent. Gap gap-P03-temp-toilet. Do not invent a toilet Method.",
    markets: ["logan-wasatch", "fontana"],
  },
  {
    id: "gap-P06-fontana-utah-split",
    phase_id: "P06",
    method_id: "m-P06-underslab-prep",
    text: "Do not invent a Fontana-vs-Utah split — ORNL only says 'in some regions termite control may be considered more critical than thermal considerations, while the reverse is true elsewhere.' Gap gap-P06-fontana-utah-split.",
    markets: ["logan-wasatch", "fontana"],
  },
  {
    id: "gap-P13-title24-text",
    phase_id: "P13",
    method_id: "m-P13-batt-air-seal",
    text: "Title 24: Fontana P13 hold point only. We do not have Title 24 text on disk. Do not invent the checklist. Do not copy a Utah batt as Title 24 compliance. See mn-fontana and gap-P13-title24-text.",
    markets: ["fontana"],
  },
  {
    id: "gap-P18-punch-list-procedure",
    phase_id: "P18",
    method_id: "m-P18-punch-co",
    text: "Architect punch / substantial completion assumes an architect of record. Gap for production spec SFR with no architect on site. Do not invent a substitute stamp. The AHJ CO is the occupancy paper CMHC names.",
    markets: ["logan-wasatch", "fontana"],
  },
];
