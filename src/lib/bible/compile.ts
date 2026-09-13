import { objectsFor, hidesFor } from "./objects";
import type { Beat, HabitOrAlt, Market, MethodRec } from "./types";
import { cameraForPhase, HONEST_GAPS, PHASE_IDS } from "./types";

const both: Market[] = ["logan-wasatch", "fontana"];

export const PRACTICE: Record<
  string,
  { phase: string; habit: Record<Market, string>; alts: string[] }
> = {
  excavation: {
    phase: "P04",
    habit: { "logan-wasatch": "m-P04-full-excavation", fontana: "m-P04-sog-strip" },
    alts: ["m-P04-full-excavation", "m-P04-sog-strip", "m-P04-trench-footing"],
  },
  foundation: {
    phase: "P05",
    habit: { "logan-wasatch": "m-P05-basement-cip-cmu", fontana: "m-P05-slab" },
    alts: ["m-P05-basement-cip-cmu", "m-P05-slab", "m-P05-crawl", "m-P05-pwf"],
  },
  floor: {
    phase: "P07",
    habit: { "logan-wasatch": "m-P07-i-joist", fontana: "m-P05-slab" },
    alts: ["m-P07-i-joist", "m-P07-sawn", "m-P07-floor-truss"],
  },
  walls: {
    phase: "P08",
    habit: { "logan-wasatch": "m-P08-stick-16oc-2x4", fontana: "m-P08-stick-16oc-2x4" },
    alts: ["m-P08-stick-16oc-2x4", "m-P08-advanced-24oc-2x6"],
  },
  shear: {
    phase: "P08",
    habit: { "logan-wasatch": "m-P08-bwl-wsp", fontana: "m-P08-bwl-wsp" },
    alts: ["m-P08-bwl-wsp", "m-P08-engineered-shear"],
  },
  roof: {
    phase: "P09",
    habit: { "logan-wasatch": "m-P09-roof-truss", fontana: "m-P09-roof-truss" },
    alts: ["m-P09-roof-truss", "m-P09-rafter-stick", "m-P09-low-slope"],
  },
  cladding: {
    phase: "P11",
    habit: { "logan-wasatch": "m-P11-siding-over-wrb", fontana: "m-P11-siding-over-wrb" },
    alts: ["m-P11-siding-over-wrb", "m-P11-wood-siding", "m-P11-stucco", "m-P11-eifs", "m-P11-masonry-veneer"],
  },
};

const FIXED_SPINE: Record<Market, string[]> = {
  "logan-wasatch": [
    "m-P00-feasibility",
    "m-P00-drawings-before-permit",
    "m-P01-site-prep",
    "m-P02-permits",
    "m-P02-permit-holds",
    "m-P03-batter-boards",
    "m-P04-full-excavation",
    "m-P05-basement-cip-cmu",
    "m-P05-waterproof",
    "m-P06-underslab-prep",
    "m-P07-i-joist",
    "m-P08-stick-16oc-2x4",
    "m-P08-bwl-wsp",
    "m-P08-stairs-cut-stringer",
    "m-P09-roof-truss",
    "m-P09-roof-sheathing",
    "m-P09-roof-felt",
    "m-P10-windows-wrb-flashing",
    "m-P11-siding-over-wrb",
    "m-P11-asphalt-shingles-finish",
    "m-P12-mep-rough",
    "m-P13-batt-air-seal",
    "m-P14-gwb-hang",
    "m-P15-interior-finish",
    "m-P16-mep-trim",
    "m-P17-site-finish",
    "m-P18-inspections-co",
    "m-P18-punch-co",
  ],
  fontana: [
    "m-P00-feasibility",
    "m-P00-drawings-before-permit",
    "m-P01-site-prep",
    "m-P02-permits",
    "m-P02-permit-holds",
    "m-P03-batter-boards",
    "m-P04-sog-strip",
    "m-P05-slab",
    "m-P06-underslab-prep",
    "m-P08-stick-16oc-2x4",
    "m-P08-bwl-wsp",
    "m-P08-stairs-cut-stringer",
    "m-P09-roof-truss",
    "m-P09-roof-sheathing",
    "m-P09-roof-felt",
    "m-P10-windows-wrb-flashing",
    "m-P11-siding-over-wrb",
    "m-P11-asphalt-shingles-finish",
    "m-P12-mep-rough",
    "m-P13-batt-air-seal",
    "m-P14-gwb-hang",
    "m-P15-interior-finish",
    "m-P16-mep-trim",
    "m-P17-site-finish",
    "m-P18-inspections-co",
    "m-P18-punch-co",
  ],
};

export type AltPicks = Record<string, string>;

export function defaultPicks(market: Market): AltPicks {
  const out: AltPicks = {};
  for (const [k, v] of Object.entries(PRACTICE)) out[k] = v.habit[market];
  return out;
}

export function spineIds(market: Market, picks: AltPicks): string[] {
  const ids = [...FIXED_SPINE[market]];
  const swap = (from: string, to: string) => {
    const i = ids.indexOf(from);
    if (i >= 0 && to && to !== from) ids[i] = to;
  };
  swap(FIXED_SPINE[market].find((id) => id.startsWith("m-P04-")) ?? "", picks.excavation);
  if (market === "logan-wasatch") {
    swap("m-P05-basement-cip-cmu", picks.foundation);
    if (picks.foundation === "m-P05-pwf" || picks.foundation === "m-P05-slab") {
      const w = ids.indexOf("m-P05-waterproof");
      if (w >= 0) ids.splice(w, 1);
    }
    if (picks.foundation === "m-P05-slab") {
      const j = ids.indexOf("m-P07-i-joist");
      if (j >= 0) ids.splice(j, 1);
    } else {
      swap("m-P07-i-joist", picks.floor === "m-P05-slab" ? "m-P07-i-joist" : picks.floor);
    }
  } else {
    swap("m-P05-slab", picks.foundation);
    if (picks.foundation === "m-P05-basement-cip-cmu" || picks.foundation === "m-P05-crawl") {
      const s = ids.indexOf("m-P05-slab");
      if (s >= 0) {
        ids[s] = picks.foundation;
        ids.splice(s + 1, 0, "m-P05-waterproof", "m-P07-i-joist");
      }
    }
    if (picks.foundation === "m-P05-pwf") {
      const s = ids.indexOf("m-P05-slab");
      if (s >= 0) ids[s] = "m-P05-pwf";
    }
  }
  swap("m-P08-stick-16oc-2x4", picks.walls);
  swap("m-P08-bwl-wsp", picks.shear);
  swap("m-P09-roof-truss", picks.roof);
  swap("m-P11-siding-over-wrb", picks.cladding);
  return ids.filter(Boolean);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function holdMatches(hold: string, line: string): boolean {
  const h = hold.toLowerCase();
  const l = line.toLowerCase();
  const keys = ["square", "door", "brace", "header", "permit", "footing", "frozen", "poly", "6-mil", "12-in", "sheath", "raise", "nail", "batt", "tub", "notch", "wrb", "pan", "flash", "drain", "waterproof", "gravel", "felt", "ice", "float", "co", "occupancy"];
  let hits = 0;
  for (const k of keys) if (h.includes(k) && l.includes(k)) hits += 1;
  return hits >= 1;
}

function methodMarkets(m: MethodRec): Market[] {
  return m.markets.length ? m.markets : both;
}

export function compileBeats(
  methods: MethodRec[],
  market: Market,
  picks: AltPicks,
): Beat[] {
  const byId = new Map(methods.map((m) => [m.id, m]));
  const beats: Beat[] = [];
  const usedGaps = new Set<string>();

  for (const id of spineIds(market, picks)) {
    const m = byId.get(id);
    if (!m) continue;
    if (!methodMarkets(m).includes(market) && m.id !== picks.foundation && m.id !== picks.excavation) {
      if (m.id !== "m-P05-waterproof") continue;
    }
    const holds = [...m.inspection_hold_points];
    const usedHold = new Set<number>();
    m.how_it_is_done.forEach((line, i) => {
      const n = i + 1;
      const kind = "build" as const;
      beats.push({
        id: `${m.phase_id}.${m.id}.${pad(n)}`,
        phase_id: m.phase_id,
        method_id: m.id,
        practice_name: m.practice_name,
        beat_index: n,
        kind,
        habit_or_alt: m.habit_or_alt,
        markets: methodMarkets(m),
        how_it_is_done: line,
        sequence_before: m.sequence_before,
        sequence_after: m.sequence_after,
        can_overlap_with: m.can_overlap_with,
        object_ids: objectsFor(m, i, line, "build"),
        hides: hidesFor(m, i, line),
        additive: true,
        camera_default: cameraForPhase(m.phase_id),
        hold_text: null,
        fastener_schedule: m.fastener_schedule,
        do_not_cheap: m.do_not_cheap,
        inspector_looks_for: m.inspector_looks_for,
        inspector_fails: m.inspector_fails ?? [],
        source_files: m.source_files,
        locators: m.locators,
        user_adjust: null,
        spanish_summary: m.spanish_summary,
      });
      holds.forEach((h, hi) => {
        if (usedHold.has(hi)) return;
        if (holdMatches(h, line) || i === m.how_it_is_done.length - 1) {
          usedHold.add(hi);
          beats.push({
            id: `${m.phase_id}.${m.id}.HOLD-${pad(hi + 1)}`,
            phase_id: m.phase_id,
            method_id: m.id,
            practice_name: m.practice_name,
            beat_index: n,
            kind: "hold",
            habit_or_alt: m.habit_or_alt,
            markets: methodMarkets(m),
            how_it_is_done: h,
            sequence_before: m.sequence_before,
            sequence_after: m.sequence_after,
            can_overlap_with: m.can_overlap_with,
            object_ids: objectsFor(m, i, h, "hold"),
            hides: [],
            additive: true,
            camera_default: cameraForPhase(m.phase_id),
            hold_text: h,
            fastener_schedule: m.fastener_schedule,
            do_not_cheap: m.do_not_cheap,
            inspector_looks_for: m.inspector_looks_for,
            inspector_fails: m.inspector_fails ?? [],
            source_files: m.source_files,
            locators: m.locators,
            user_adjust: null,
            spanish_summary: m.spanish_summary,
          });
        }
      });
    });
    for (const g of HONEST_GAPS) {
      if (g.method_id !== m.id && g.phase_id !== m.phase_id) continue;
      if (g.method_id !== m.id) continue;
      if (!g.markets.includes(market)) continue;
      if (usedGaps.has(g.id)) continue;
      usedGaps.add(g.id);
      beats.push({
        id: `${g.phase_id}.${m.id}.GAP-01`,
        phase_id: g.phase_id,
        method_id: m.id,
        practice_name: m.practice_name,
        beat_index: m.how_it_is_done.length + 1,
        kind: "gap",
        habit_or_alt: m.habit_or_alt,
        markets: g.markets,
        how_it_is_done: g.text,
        sequence_before: [],
        sequence_after: [],
        can_overlap_with: [],
        object_ids: [`gap-${g.id}`],
        hides: [],
        additive: true,
        camera_default: cameraForPhase(g.phase_id),
        hold_text: null,
        fastener_schedule: [],
        do_not_cheap: [],
        inspector_looks_for: [],
        inspector_fails: [],
        source_files: m.source_files,
        locators: m.locators,
        user_adjust: null,
        gap_id: g.id,
      });
    }
  }
  return beats;
}

export function methodById(methods: MethodRec[], id: string) {
  return methods.find((m) => m.id === id) ?? null;
}

export function altsForPractice(practice: string, methods: MethodRec[]): MethodRec[] {
  const p = PRACTICE[practice];
  if (!p) return [];
  return p.alts.map((id) => methods.find((m) => m.id === id)).filter(Boolean) as MethodRec[];
}

export function phaseIndex(id: string) {
  return PHASE_IDS.indexOf(id as (typeof PHASE_IDS)[number]);
}

export type HabitFlag = HabitOrAlt;
