import { createServerFn } from "@tanstack/react-start";
import { clampProgram } from "./default-program";
import { parseBrief } from "./parse-brief";
import type { BuildingProgram, FacadeType, RoofType } from "./types";

export type GenerateResult =
  | { ok: true; program: BuildingProgram; via: "model" | "fallback" }
  | { ok: false; error: string };

function extractJson(text: string): Record<string, unknown> {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

function asRoof(v: unknown): RoofType | undefined {
  return v === "flat" || v === "shed" || v === "gable" ? v : undefined;
}
function asFacade(v: unknown): FacadeType | undefined {
  return v === "stucco" || v === "brick" || v === "panel" ? v : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function fromModel(obj: Record<string, unknown>, brief: string): BuildingProgram {
  const name = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : brief.slice(0, 72);
  return clampProgram({
    id: `nl-${Date.now().toString(36)}`,
    name,
    note: typeof obj.note === "string" ? obj.note : brief.slice(0, 280),
    units: num(obj.units),
    storeys: num(obj.storeys),
    unitWidth: num(obj.unitWidth),
    unitDepth: num(obj.unitDepth),
    storeyHeight: num(obj.storeyHeight),
    roof: asRoof(obj.roof),
    facade: asFacade(obj.facade),
    hasTerrace: typeof obj.hasTerrace === "boolean" ? obj.hasTerrace : undefined,
    hasRearGarden: typeof obj.hasRearGarden === "boolean" ? obj.hasRearGarden : undefined,
  });
}

const SYSTEM = `You convert an architectural brief into a compact terraced-house building program.
Return ONLY JSON (no markdown) matching:
{"name":string,"note":string,"units":1-6,"storeys":1-3,"unitWidth":4.6-8.5,"unitDepth":8-14,"storeyHeight":2.5-3.2,"roof":"flat"|"shed"|"gable","facade":"stucco"|"brick"|"panel","hasTerrace":boolean,"hasRearGarden":boolean}
Units/storeys/width/depth are meters. The generator builds a row-house/terrace massing, so interpret villas, townhouses, and detached homes into that schema. Prefer the user's explicit counts, materials, and roof. hasTerrace only with a flat or shed roof.`;

async function askModel(brief: string): Promise<BuildingProgram | null> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 14000);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: brief },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text) return null;
    return fromModel(extractJson(text), brief);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const generateProgram = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const brief =
      typeof input === "object" && input !== null && "brief" in input && typeof (input as { brief: unknown }).brief === "string"
        ? (input as { brief: string }).brief.trim().slice(0, 600)
        : "";
    if (brief.length < 4) throw new Error("Brief is too short");
    return { brief };
  })
  .handler(async ({ data }): Promise<GenerateResult> => {
    const modeled = await askModel(data.brief);
    if (modeled) return { ok: true, program: modeled, via: "model" };
    return { ok: true, program: parseBrief(data.brief), via: "fallback" };
  });
