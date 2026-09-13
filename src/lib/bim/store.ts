import { create } from "zustand";
import { buildBuilding } from "./build";
import { CATALOG, finishOf, tintedFinish } from "./catalog";
import { TERRACE_PROGRAM } from "./default-program";
import { generateProgram } from "./generate-program";
import {
  canAddItem,
  classifyError,
  defaultKindFor,
  deleteLibraryFile,
  extOf,
  loadLibraryMeta,
  newItemId,
  putLibraryFile,
  saveLibraryMeta,
  type CustomItem,
} from "./library";
import { kindKey } from "./tree";
import type { BoxSpec, BuildingProgram, BuildResult, LayerId } from "./types";
import { BUILD_SEQUENCE, LAYER_IDS } from "./types";

export const DEFAULT_VISIBLE: Record<LayerId, boolean> = {
  site: true,
  excavation: false,
  foundation: false,
  underslab: false,
  framing: false,
  envelope: true,
  openings: true,
  insulation: false,
  hvac: false,
  electrical: false,
  plumbing: false,
  interior: true,
  finishes: true,
  exterior: true,
};

const off = (on: LayerId[]): Record<LayerId, boolean> =>
  Object.fromEntries(LAYER_IDS.map((id) => [id, on.includes(id)])) as Record<LayerId, boolean>;

export const LAYER_PRESETS: { id: string; label: string; layers: Record<LayerId, boolean> }[] = [
  { id: "street", label: "Street", layers: { ...DEFAULT_VISIBLE } },
  {
    id: "structure",
    label: "Structure",
    layers: off(["excavation", "foundation", "underslab", "framing", "envelope", "openings"]),
  },
  {
    id: "roughin",
    label: "Rough-ins",
    layers: off(["framing", "hvac", "electrical", "plumbing", "underslab"]),
  },
  {
    id: "energy",
    label: "Insulation",
    layers: off(["framing", "insulation", "envelope"]),
  },
  {
    id: "interior",
    label: "Interior",
    layers: off(["envelope", "openings", "interior", "finishes"]),
  },
  {
    id: "all",
    label: "All layers",
    layers: Object.fromEntries(LAYER_IDS.map((id) => [id, true])) as Record<LayerId, boolean>,
  },
];

export type RenderStyle = "studio" | "overcast" | "dusk";
export type ViewPreset = "street" | "eye" | "iso" | "top";
export type OverrideScope = "piece" | "kind" | "layer";

const LS_KEY = "lw-finishes-v1";

function loadOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function saveOverrides(o: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(o));
  } catch {
    /* ignore quota */
  }
}

type Store = {
  program: BuildingProgram;
  result: BuildResult;
  visible: Record<LayerId, boolean>;
  explode: number;
  section: number;
  seqT: number;
  sequenceOn: boolean;
  playing: boolean;
  brief: string;
  generating: boolean;
  via: "preset" | "model" | "fallback";
  error: string | null;
  cameraEpoch: number;
  selectedHex: string | null;
  hoveredHex: string | null;
  overrides: Record<string, string>;
  renderStyle: RenderStyle;
  viewPreset: ViewPreset;
  overrideScope: OverrideScope;
  hexQuery: string;
  expandedLayers: Record<LayerId, boolean>;
  expandedKinds: Record<string, boolean>;
  focusKind: string | null;
  showLabels: boolean;
  customItems: CustomItem[];
  selectedCustomId: string | null;
  placeMode: boolean;
  dropError: string | null;
  treeFilter: string;
  setBrief: (brief: string) => void;
  toggleLayer: (id: LayerId) => void;
  isolateLayer: (id: LayerId) => void;
  applyPreset: (id: string) => void;
  setExplode: (n: number) => void;
  setSection: (n: number) => void;
  playSequence: () => void;
  stopSequence: () => void;
  tickSequence: (dt: number) => void;
  loadProgram: (program: BuildingProgram, via: Store["via"]) => void;
  resetTerrace: () => void;
  refitCamera: () => void;
  generate: (brief?: string) => Promise<void>;
  selectHex: (hex: string | null) => void;
  hoverHex: (hex: string | null) => void;
  setOverrideScope: (s: OverrideScope) => void;
  applyFinish: (matIdOrHex: string) => void;
  clearOverrides: () => void;
  setRenderStyle: (s: RenderStyle) => void;
  setViewPreset: (v: ViewPreset) => void;
  setHexQuery: (q: string) => void;
  toggleExpandLayer: (id: LayerId) => void;
  toggleExpandKind: (layer: LayerId, kind: string) => void;
  isolateKind: (layer: LayerId, kind: string) => void;
  setFocusKind: (key: string | null) => void;
  setShowLabels: (v: boolean) => void;
  setTreeFilter: (q: string) => void;
  hydrateLibrary: () => void;
  ingestFiles: (files: File[], hit?: { x: number; y: number; z: number }) => Promise<void>;
  updateCustom: (id: string, patch: Partial<CustomItem>) => void;
  removeCustom: (id: string) => Promise<void>;
  selectCustom: (id: string | null) => void;
  setPlaceMode: (v: boolean) => void;
  placeAt: (p: { x: number; y: number; z: number }) => void;
};

function rebuild(program: BuildingProgram): BuildResult {
  return buildBuilding(program);
}

const closedLayers = Object.fromEntries(LAYER_IDS.map((id) => [id, false])) as Record<LayerId, boolean>;

export const useBim = create<Store>((set, get) => ({
  program: TERRACE_PROGRAM,
  result: rebuild(TERRACE_PROGRAM),
  visible: { ...DEFAULT_VISIBLE },
  explode: 0,
  section: 1,
  seqT: 0,
  sequenceOn: false,
  playing: false,
  brief: "",
  generating: false,
  via: "preset",
  error: null,
  cameraEpoch: 0,
  selectedHex: null,
  hoveredHex: null,
  overrides: loadOverrides(),
  renderStyle: "studio",
  viewPreset: "street",
  overrideScope: "kind",
  hexQuery: "",
  expandedLayers: { ...closedLayers, framing: true },
  expandedKinds: {},
  focusKind: null,
  showLabels: true,
  customItems: [],
  selectedCustomId: null,
  placeMode: false,
  dropError: null,
  treeFilter: "",
  setBrief: (brief) => set({ brief }),
  toggleLayer: (id) =>
    set((s) => ({
      sequenceOn: false,
      playing: false,
      visible: { ...s.visible, [id]: !s.visible[id] },
    })),
  isolateLayer: (id) =>
    set({
      sequenceOn: false,
      playing: false,
      focusKind: null,
      visible: Object.fromEntries(LAYER_IDS.map((l) => [l, l === id])) as Record<LayerId, boolean>,
      expandedLayers: { ...closedLayers, [id]: true },
    }),
  applyPreset: (id) => {
    const preset = LAYER_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    set({ visible: { ...preset.layers }, sequenceOn: false, playing: false, focusKind: null });
  },
  setExplode: (n) => set({ explode: Math.min(1, Math.max(0, n)) }),
  setSection: (n) => set({ section: Math.min(1, Math.max(0, n)) }),
  playSequence: () => set({ sequenceOn: true, playing: true, seqT: -0.15, focusKind: null }),
  stopSequence: () => set({ playing: false, sequenceOn: false }),
  tickSequence: (dt) => {
    const s = get();
    if (!s.playing) return;
    const next = s.seqT + dt * 0.72;
    if (next >= BUILD_SEQUENCE.length) {
      set({ seqT: BUILD_SEQUENCE.length, playing: false, sequenceOn: false });
      return;
    }
    set({ seqT: next });
  },
  loadProgram: (program, via) =>
    set((s) => ({
      program,
      result: rebuild(program),
      via,
      generating: false,
      error: null,
      cameraEpoch: s.cameraEpoch + 1,
      sequenceOn: false,
      playing: false,
      selectedHex: null,
      focusKind: null,
    })),
  resetTerrace: () => get().loadProgram(TERRACE_PROGRAM, "preset"),
  refitCamera: () => set((s) => ({ cameraEpoch: s.cameraEpoch + 1 })),
  generate: async (briefArg) => {
    const brief = (briefArg ?? get().brief).trim();
    if (brief.length < 4) {
      set({ error: "Write a short brief first." });
      return;
    }
    set({ generating: true, error: null, brief });
    try {
      const res = await generateProgram({ data: { brief } });
      if (!res.ok) {
        set({ generating: false, error: res.error });
        return;
      }
      get().loadProgram(res.program, res.via);
    } catch (err) {
      set({
        generating: false,
        error: err instanceof Error ? err.message : "Could not generate",
      });
    }
  },
  selectHex: (hex) => set({ selectedHex: hex, selectedCustomId: hex ? null : get().selectedCustomId }),
  hoverHex: (hex) => set({ hoveredHex: hex }),
  setOverrideScope: (overrideScope) => set({ overrideScope }),
  applyFinish: (matIdOrHex) => {
    const s = get();
    const box = s.result.boxes.find((b) => b.hex === s.selectedHex);
    if (!box) return;
    const key =
      s.overrideScope === "piece"
        ? `hex:${box.hex}`
        : s.overrideScope === "layer"
          ? `layer:${box.layer}`
          : `kind:${box.kind}`;
    const next = { ...s.overrides, [key]: matIdOrHex };
    saveOverrides(next);
    set({ overrides: next });
  },
  clearOverrides: () => {
    saveOverrides({});
    set({ overrides: {} });
  },
  setRenderStyle: (renderStyle) => set({ renderStyle }),
  setViewPreset: (viewPreset) => set((s) => ({ viewPreset, cameraEpoch: s.cameraEpoch + 1 })),
  setHexQuery: (hexQuery) => {
    const q = hexQuery.trim().replace(/^0x/i, "").toUpperCase();
    set({ hexQuery });
    if (q.length >= 4) {
      const hit = get().result.boxes.find((b) => b.hex.includes(q) || b.color.replace("#", "").toUpperCase().includes(q));
      if (hit) set({ selectedHex: hit.hex });
    }
  },
  toggleExpandLayer: (id) =>
    set((s) => ({ expandedLayers: { ...s.expandedLayers, [id]: !s.expandedLayers[id] } })),
  toggleExpandKind: (layer, kind) => {
    const key = kindKey(layer, kind);
    set((s) => ({ expandedKinds: { ...s.expandedKinds, [key]: !s.expandedKinds[key] } }));
  },
  isolateKind: (layer, kind) =>
    set((s) => ({
      sequenceOn: false,
      playing: false,
      focusKind: kindKey(layer, kind),
      visible: { ...s.visible, [layer]: true },
      expandedLayers: { ...s.expandedLayers, [layer]: true },
      expandedKinds: { ...s.expandedKinds, [kindKey(layer, kind)]: true },
    })),
  setFocusKind: (focusKind) => set({ focusKind }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setTreeFilter: (treeFilter) => set({ treeFilter }),
  hydrateLibrary: () => {
    if (typeof window === "undefined") return;
    set({ customItems: loadLibraryMeta() });
  },
  ingestFiles: async (files, hit) => {
    const s = get();
    const next = [...s.customItems];
    let lastId: string | null = null;
    let err: string | null = null;
    for (const file of files) {
      const cap = canAddItem(next.length);
      if (cap) {
        err = cap;
        break;
      }
      const bad = classifyError(file);
      if (bad) {
        err = bad;
        continue;
      }
      const ext = extOf(file);
      if (!ext) continue;
      const id = newItemId();
      try {
        await putLibraryFile(id, file);
      } catch {
        err = "Could not store that file.";
        continue;
      }
      const layer: LayerId = "interior";
      const item: CustomItem = {
        id,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 48),
        layer,
        kind: defaultKindFor(ext, layer),
        x: hit?.x ?? 0,
        y: hit?.y ?? 0.4,
        z: hit?.z ?? s.program.unitDepth * 0.4,
        rx: 0,
        ry: 0,
        rz: 0,
        sx: ext === "image" ? 1.2 : 1,
        sy: ext === "image" ? 1.2 : 1,
        sz: ext === "image" ? 0.04 : 1,
        ext,
        mime: file.type || "application/octet-stream",
        visible: true,
      };
      next.push(item);
      lastId = id;
    }
    saveLibraryMeta(next);
    set({
      customItems: next,
      selectedCustomId: lastId,
      dropError: err,
      selectedHex: lastId ? null : s.selectedHex,
      visible: lastId ? { ...s.visible, interior: true } : s.visible,
    });
  },
  updateCustom: (id, patch) => {
    const next = get().customItems.map((c) => (c.id === id ? { ...c, ...patch } : c));
    saveLibraryMeta(next);
    set({ customItems: next });
  },
  removeCustom: async (id) => {
    try {
      await deleteLibraryFile(id);
    } catch {
      /* ignore */
    }
    const next = get().customItems.filter((c) => c.id !== id);
    saveLibraryMeta(next);
    set({ customItems: next, selectedCustomId: get().selectedCustomId === id ? null : get().selectedCustomId });
  },
  selectCustom: (id) => set({ selectedCustomId: id, selectedHex: id ? null : get().selectedHex }),
  setPlaceMode: (placeMode) => set({ placeMode }),
  placeAt: (p) => {
    const id = get().selectedCustomId;
    if (!id) {
      set({ placeMode: false });
      return;
    }
    get().updateCustom(id, { x: p.x, y: p.y, z: p.z });
    set({ placeMode: false });
  },
}));

export function layerIsOn(state: Pick<Store, "visible" | "sequenceOn" | "seqT">, id: LayerId): boolean {
  if (state.sequenceOn) {
    const idx = BUILD_SEQUENCE.indexOf(id);
    return idx >= 0 && idx <= Math.floor(state.seqT);
  }
  return state.visible[id];
}

export function resolveBox(box: BoxSpec, overrides: Record<string, string>): BoxSpec {
  const val = overrides[`hex:${box.hex}`] ?? overrides[`kind:${box.kind}`] ?? overrides[`layer:${box.layer}`];
  if (!val) return box;
  if (val.startsWith("#")) {
    const tinted = tintedFinish(finishOf(box.matId), val);
    return {
      ...box,
      matId: tinted.id,
      color: tinted.hex,
      roughness: tinted.roughness,
      metalness: tinted.metalness,
      opacity: tinted.opacity,
    };
  }
  const mat = CATALOG[val];
  if (!mat) return box;
  return {
    ...box,
    matId: mat.id,
    color: mat.hex,
    roughness: mat.roughness,
    metalness: mat.metalness,
    opacity: mat.opacity,
  };
}

export function resolveBoxes(boxes: BoxSpec[], overrides: Record<string, string>): BoxSpec[] {
  if (!overrides || Object.keys(overrides).length === 0) return boxes;
  return boxes.map((b) => resolveBox(b, overrides));
}
