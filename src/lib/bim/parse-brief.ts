import { clampProgram, TERRACE_PROGRAM } from "./default-program";
import type { BuildingProgram, FacadeType, RoofType } from "./types";

const WORD_NUM: Record<string, number> = {
  one: 1,
  single: 1,
  a: 1,
  two: 2,
  pair: 2,
  twin: 2,
  duplex: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

function wordOrDigit(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  if (!m) return undefined;
  const raw = (m[1] ?? "").toLowerCase();
  if (WORD_NUM[raw] != null) return WORD_NUM[raw];
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Keyword fallback so a brief still yields a program if the model is unavailable. */
export function parseBrief(brief: string): BuildingProgram {
  const t = brief.toLowerCase().replace(/[–—]/g, "-").trim();
  const name =
    brief
      .trim()
      .split(/[.!\n]/)[0]
      ?.slice(0, 72)
      .trim() || "Generated building";

  let units = 3;
  let storeys = 2;
  let roof: RoofType = "flat";
  let facade: FacadeType = "stucco";
  let hasTerrace = true;
  let hasRearGarden = true;
  let unitWidth = 6;
  let unitDepth = 10.4;
  let storeyHeight = 2.82;

  const unitsFrom = wordOrDigit(
    t,
    /\b(one|single|two|pair|twin|three|four|five|six|\d+)\s*[- ]?(unit|home|house|dwelling|townhouse|terrace)/,
  );
  if (unitsFrom != null) units = unitsFrom;
  else if (/\b(detached|cottage|cabin|villa|bungalow)\b/.test(t)) units = 1;
  else if (/\b(duplex|semi[\s-]?detached|pair of)\b/.test(t)) units = 2;
  else if (/\brow of (\d+)\b/.test(t)) units = Number(t.match(/\brow of (\d+)\b/)?.[1] ?? 3);
  else if (/\bterrac/.test(t) || /\btownhous/.test(t)) units = 3;

  const storeyFrom = wordOrDigit(t, /\b(one|single|two|three|\d+)\s*[- ]?(storey|story|storied|floor|level)/);
  if (storeyFrom != null) storeys = storeyFrom;
  else if (/\bbungalow\b|\bsingle[\s-]?level\b/.test(t)) storeys = 1;
  else if (/\bthree[\s-]?stor|\btriplex\b/.test(t)) storeys = 3;

  if (/\bgable\b|\bpitched\b|\bpeaked\b|\bvictorian\b/.test(t)) roof = "gable";
  else if (/\bshed\b|\bmonopitch\b|\bsaltbox\b/.test(t)) roof = "shed";
  else if (/\bflat\b|\broof ?deck\b|\bparapet\b|\bmodern\b/.test(t)) roof = "flat";

  if (/\bbrick\b|\bvictorian\b|\bclay\b/.test(t)) facade = "brick";
  else if (/\bpanel\b|\bmetal\b|\bclad\b|\bindustrial\b|\bcorten\b/.test(t)) facade = "panel";
  else if (/\bstucco\b|\brender\b|\bplaster\b|\bwhite box\b/.test(t)) facade = "stucco";

  if (/\bno (rear )?(garden|yard|patio|softscape)\b/.test(t)) hasRearGarden = false;
  if (/\b(garden|patio|yard)\b/.test(t) && !/\bno /.test(t)) hasRearGarden = true;

  if (/\bno (terrace|deck|roof ?deck)\b/.test(t) || roof !== "flat") hasTerrace = false;
  if (/\b(terrace|roof ?deck|rooftop)\b/.test(t)) hasTerrace = true;

  if (/\bnarrow\b/.test(t)) unitWidth = 5.1;
  if (/\bwide\b|\bgenerous\b/.test(t)) unitWidth = 7.4;
  if (/\bdeep\b/.test(t)) unitDepth = 12.2;
  if (/\bshallow\b|\bcompact\b/.test(t)) unitDepth = 8.6;
  if (/\btall (ceil|storey|story)\b|\bhigh ceil/.test(t)) storeyHeight = 3.1;

  return clampProgram({
    id: `nl-${Date.now().toString(36)}`,
    name,
    note: brief.trim().slice(0, 280),
    units,
    storeys,
    unitWidth,
    unitDepth,
    storeyHeight,
    roof,
    facade,
    hasTerrace,
    hasRearGarden,
  });
}

export const EXAMPLE_BRIEFS = [
  {
    label: "Modern terrace",
    brief:
      "Three two-storey stucco terraced houses with roof decks, rear gardens, wide front windows and a street in front.",
    program: TERRACE_PROGRAM,
  },
  {
    label: "Brick four-pack",
    brief: "A row of four two-storey brick townhouses with gable roofs, rear gardens, no roof terrace.",
  },
  {
    label: "Panel shed pair",
    brief: "A pair of three-storey panel-clad houses, shed roofs, compact footprint, roof decks, no garden.",
  },
  {
    label: "Single stucco",
    brief: "One wide two-storey stucco townhouse, flat roof with a terrace, rear garden, tall ceilings.",
  },
] as const;
