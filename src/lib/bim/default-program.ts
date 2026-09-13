import type { BuildingProgram } from "./types";

/** Parametric rebuild of a CadNav-style modern terrace — original geometry, not a mesh import. */
export const TERRACE_PROGRAM: BuildingProgram = {
  id: "terrace-modern-3",
  name: "Modern Terraced Houses",
  note: "Three two-storey stucco terraces with roof decks, rear gardens, and full P04–P17 assemblies — 2x4 16 o.c., I-joists, WRB, underslab, batts. Working geometry, not a mesh import.",
  units: 3,
  storeys: 2,
  unitWidth: 6,
  unitDepth: 10.4,
  storeyHeight: 2.82,
  roof: "flat",
  facade: "stucco",
  hasTerrace: true,
  hasRearGarden: true,
};

export function clampProgram(p: Partial<BuildingProgram> & Pick<BuildingProgram, "name">): BuildingProgram {
  const units = Math.min(6, Math.max(1, Math.round(p.units ?? 3)));
  const storeys = Math.min(3, Math.max(1, Math.round(p.storeys ?? 2)));
  return {
    id: p.id ?? `nl-${Date.now().toString(36)}`,
    name: p.name.slice(0, 80),
    note: p.note,
    units,
    storeys,
    unitWidth: Math.min(8.5, Math.max(4.6, p.unitWidth ?? 6)),
    unitDepth: Math.min(14, Math.max(8, p.unitDepth ?? 10.4)),
    storeyHeight: Math.min(3.2, Math.max(2.5, p.storeyHeight ?? 2.82)),
    roof: p.roof === "gable" || p.roof === "shed" ? p.roof : "flat",
    facade: p.facade === "brick" || p.facade === "panel" ? p.facade : "stucco",
    hasTerrace: p.hasTerrace ?? p.roof === "flat",
    hasRearGarden: p.hasRearGarden ?? true,
  };
}
