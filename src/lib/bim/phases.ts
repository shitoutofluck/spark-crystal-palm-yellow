import type { LayerId } from "./types";

/** Compact field notes from the construction-wholesaling bible (P04–P17). */
export type PhaseNote = {
  id: string;
  title: string;
  habit: string;
  looks: string[];
  hold: string;
};

export const PHASE_NOTES: Record<LayerId, PhaseNote> = {
  excavation: {
    id: "P04",
    title: "Excavation / grading",
    habit: "Wasatch: basement-deep because 30-in frost. Fontana: slab scrape. Do not pour on frost.",
    looks: ["Bottom not frozen", "Batter boards 3–4 ft outside", "6-8-10 or equal diagonals", "Organics stripped"],
    hold: "After-excavation, before footing pour (ORNL).",
  },
  foundation: {
    id: "P05",
    title: "Foundation / slab",
    habit: "Utah buys a basement because frost puts the footing there. This study uses frost-depth strip footings + SOG.",
    looks: ["Footing below 30-in frost", "Sill 8 in above grade", "Anchor bolts / hold-downs", "Dampproof on stem"],
    hold: "After footings, before walls; after foundation + dampproofing, before rough framing.",
  },
  underslab: {
    id: "P06",
    title: "Underslab MEP / radon",
    habit: "Plumbing in first. Gravel bed. 6-mil poly, 12-in laps. Wood out of the pour. Capped radon standpipe where probable.",
    looks: ["6-mil polyethylene, 12-in laps", "No wood left in the pour", "3–4 in PVC radon stub in gravel", "Waste in before slab"],
    hold: "Plumbing in first. Poly sealed to wall. Wood / grade stakes out.",
  },
  framing: {
    id: "P08",
    title: "Floor + walls",
    habit: "2x4 at 16 in o.c., sheathing nailed 6 in edge / 12 in field, headers sit on jacks. I-joists for the floor package.",
    looks: ["King + jack at every opening", "Double top plate", "Cripples under sills", "I-joist flanges + web", "Hold-downs at corners"],
    hold: "After rough framing, before MEP cover. Never notch the joist underside.",
  },
  envelope: {
    id: "P09",
    title: "Sheathing / dry-in / WRB",
    habit: "OSB 7/16, 8d 6/12. Housewrap over sheathing. Ice/water at eaves (Logan). Felt 2-in top / 4-in side.",
    looks: ["OSB joints staggered", "WRB shingled laps", "Roof deck on", "Ice barrier at eave (cold climate)"],
    hold: "Dry-in before windows. Logan ice is on the city sheet — not Fontana.",
  },
  openings: {
    id: "P10",
    title: "Windows / doors / flashings",
    habit: "WRB, pan, window, head flash. Flange window over pan, under head.",
    looks: ["Pan flashing at sills", "Head flashing", "Frame + mullion + glass", "Door leaf + threshold"],
    hold: "Window after WRB. Do not reverse the shingle order.",
  },
  exterior: {
    id: "P11",
    title: "Cladding / roof finish",
    habit: "Siding over WRB. Roof finish after ice/felt. Can overlap MEP rough and drywall.",
    looks: ["Cladding clear of grade 6 in", "Gutters after siding", "Downspouts off the footing", "Parapet / fascia / rail"],
    hold: "Roof water is not the foundation drain. Gutters after siding.",
  },
  hvac: {
    id: "P12",
    title: "MEP rough — HVAC",
    habit: "Trunks in joist bays / dropped. Boots at rooms. Riser in the wet wall. Inspection before insulation.",
    looks: ["Riser continuous", "Trunk + branch + boot", "No joist-bottom notches"],
    hold: "Rough inspection before insulation / drywall.",
  },
  electrical: {
    id: "P12",
    title: "MEP rough — electrical",
    habit: "Panel at the entry. Homeruns. Device boxes at 12 in / 48 in. Inspection before insulation.",
    looks: ["Service panel", "Homerun + ring", "Device boxes", "Can-light rough"],
    hold: "Rough electrical before insulation.",
  },
  plumbing: {
    id: "P12",
    title: "MEP rough — plumbing",
    habit: "Soil stack in the wet wall. PEX hot/cold. Fixture drains. Top out after dry-in.",
    looks: ["3–4 in soil stack", "PEX red hot / blue cold", "WC waste", "Kitchen + bath branches"],
    hold: "Rough plumbing before insulation. No skip-inspection.",
  },
  insulation: {
    id: "P13",
    title: "Insulation / air seal",
    habit: "Cavity batt in 2x4. Poly air barrier where the book calls it. Energy inspection before drywall.",
    looks: ["Batts fill the cavity", "No gaps at kings/jacks", "Air seal at top plate"],
    hold: "Insulation before drywall. Title 24 / IECC per AHJ.",
  },
  interior: {
    id: "P14",
    title: "Drywall / interiors",
    habit: "Hang then tape. Stairs cut-stringer 2x12 after the well is in. Millwork after paint-ready walls.",
    looks: ["Gypsum on, seams later", "Interior doors", "Stair treads + stringers", "Kitchen / bath / FF&E"],
    hold: "Hang after insulation inspection.",
  },
  finishes: {
    id: "P15",
    title: "Interior finish",
    habit: "Doors/casing, paint, floors after walls/ceilings. Counters after cabinets.",
    looks: ["Flooring / tile", "Base + casing", "Paint / millwork color", "Counters"],
    hold: "Floors after walls and ceilings. Devices after paint (P16).",
  },
  site: {
    id: "P17",
    title: "Site finish",
    habit: "Drive, walks, grade away from the house. Gutters already on. Not P01 site prep.",
    looks: ["Grade falls away", "Walks / stoop / patio", "Planting, fence", "Street + curb"],
    hold: "Final grade after cladding. Roof leaders not into footing drain.",
  },
};
