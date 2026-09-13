import { create } from "zustand";
import { compileBeats, defaultPicks, PRACTICE, type AltPicks } from "@/lib/bible/compile";
import { METHODS } from "@/lib/bible/methods";
import type { Adjust, Beat, Market } from "@/lib/bible/types";

const LS_ADJ = "fieldstep-adj-v1";
const LS_MARK = "fieldstep-mark-v1";

export type XformMode = "idle" | "grab" | "rotate" | "scale";
export type Bookmark = {
  camera: [number, number, number];
  target: [number, number, number];
  isolate: boolean;
  offsets: Record<string, Adjust>;
};

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

type Store = {
  market: Market;
  picks: AltPicks;
  beats: Beat[];
  index: number;
  playing: boolean;
  isolate: boolean;
  xray: boolean;
  clip: number;
  help: boolean;
  xform: XformMode;
  draft: Record<string, Adjust>;
  committed: Record<string, Record<string, Adjust>>;
  bookmarks: Record<string, Bookmark>;
  cameraEpoch: number;
  frameEpoch: number;
  holdEase: number;
  truck: { x: number; y: number; z: number; yaw: number };
  keys: Set<string>;
  setMarket: (m: Market) => void;
  setPick: (practice: string, methodId: string) => void;
  habit: () => void;
  cycleAlt: () => void;
  setIndex: (i: number) => void;
  next: (n?: number) => void;
  prev: (n?: number) => void;
  nextPhase: (dir: number) => void;
  nextMethod: (dir: number) => void;
  toStart: () => void;
  toEnd: () => void;
  togglePlay: () => void;
  toggleIsolate: () => void;
  toggleXray: () => void;
  nudgeClip: (d: number) => void;
  toggleHelp: () => void;
  setXform: (m: XformMode) => void;
  setDraft: (id: string, a: Adjust) => void;
  commit: () => void;
  revert: () => void;
  saveBookmark: (cam: Bookmark["camera"], target: Bookmark["target"]) => void;
  frame: () => void;
  tick: (dt: number) => void;
  setKeys: (codes: string[]) => void;
  injectKey: (code: string, down: boolean) => void;
};

function rebuild(market: Market, picks: AltPicks): Beat[] {
  return compileBeats(METHODS, market, picks);
}

function clampIndex(beats: Beat[], i: number) {
  if (beats.length === 0) return 0;
  return Math.max(0, Math.min(beats.length - 1, i));
}

const startMarket: Market = "logan-wasatch";
const startPicks = defaultPicks(startMarket);
const startBeats = rebuild(startMarket, startPicks);

export const useStepper = create<Store>((set, get) => ({
  market: startMarket,
  picks: startPicks,
  beats: startBeats,
  index: 0,
  playing: false,
  isolate: false,
  xray: false,
  clip: 1,
  help: false,
  xform: "idle",
  draft: {},
  committed: loadJson(LS_ADJ, {}),
  bookmarks: loadJson(LS_MARK, {}),
  cameraEpoch: 0,
  frameEpoch: 0,
  holdEase: 0,
  truck: { x: 0, y: 0, z: 0, yaw: 0 },
  keys: new Set(),
  setMarket: (market) => {
    const picks = defaultPicks(market);
    const beats = rebuild(market, picks);
    set({ market, picks, beats, index: 0, playing: false, cameraEpoch: get().cameraEpoch + 1 });
  },
  setPick: (practice, methodId) => {
    const picks = { ...get().picks, [practice]: methodId };
    const beats = rebuild(get().market, picks);
    set({ picks, beats, index: clampIndex(beats, get().index), playing: false });
  },
  habit: () => {
    const picks = defaultPicks(get().market);
    const beats = rebuild(get().market, picks);
    set({ picks, beats, index: clampIndex(beats, get().index), playing: false });
  },
  cycleAlt: () => {
    const beat = get().beats[get().index];
    if (!beat) return;
    const practice = Object.entries(PRACTICE).find(([, v]) => v.phase === beat.phase_id);
    if (!practice) return;
    const [key, spec] = practice;
    const alts = spec.alts;
    const cur = get().picks[key] ?? spec.habit[get().market];
    const i = alts.indexOf(cur);
    const next = alts[(i + 1) % alts.length]!;
    get().setPick(key, next);
  },
  setIndex: (i) => {
    const beats = get().beats;
    const index = clampIndex(beats, i);
    const beat = beats[index];
    const bm = beat ? get().bookmarks[beat.id] : undefined;
    set({
      index,
      playing: false,
      draft: {},
      xform: "idle",
      holdEase: beat?.kind === "hold" ? 1 : 0,
      cameraEpoch: bm ? get().cameraEpoch + 1 : get().cameraEpoch,
    });
  },
  next: (n = 1) => get().setIndex(get().index + n),
  prev: (n = 1) => get().setIndex(get().index - n),
  nextPhase: (dir) => {
    const { beats, index } = get();
    const cur = beats[index];
    if (!cur) return;
    if (dir > 0) {
      const i = beats.findIndex((b, k) => k > index && b.phase_id !== cur.phase_id);
      get().setIndex(i === -1 ? beats.length - 1 : i);
    } else {
      let i = index;
      while (i > 0 && beats[i]!.phase_id === cur.phase_id) i -= 1;
      const phase = beats[i]?.phase_id;
      while (i > 0 && beats[i - 1]?.phase_id === phase) i -= 1;
      get().setIndex(i);
    }
  },
  nextMethod: (dir) => {
    const { beats, index } = get();
    const cur = beats[index];
    if (!cur) return;
    if (dir > 0) {
      const i = beats.findIndex((b, k) => k > index && b.method_id !== cur.method_id);
      if (i >= 0) get().setIndex(i);
    } else {
      let i = index;
      while (i > 0 && beats[i]!.method_id === cur.method_id) i -= 1;
      const method = beats[i]?.method_id;
      while (i > 0 && beats[i - 1]?.method_id === method) i -= 1;
      get().setIndex(i);
    }
  },
  toStart: () => get().setIndex(0),
  toEnd: () => get().setIndex(get().beats.length - 1),
  togglePlay: () => set({ playing: !get().playing }),
  toggleIsolate: () => set({ isolate: !get().isolate }),
  toggleXray: () => set({ xray: !get().xray }),
  nudgeClip: (d) => set({ clip: Math.max(0.05, Math.min(1, get().clip + d)) }),
  toggleHelp: () => set({ help: !get().help }),
  setXform: (xform) => set({ xform, playing: false }),
  setDraft: (id, a) => set({ draft: { ...get().draft, [id]: a } }),
  commit: () => {
    const beat = get().beats[get().index];
    if (!beat) return;
    const committed = { ...get().committed, [beat.id]: { ...get().draft } };
    saveJson(LS_ADJ, committed);
    set({ committed, xform: "idle" });
  },
  revert: () => set({ draft: {}, xform: "idle" }),
  saveBookmark: (camera, target) => {
    const beat = get().beats[get().index];
    if (!beat) return;
    const bookmarks = {
      ...get().bookmarks,
      [beat.id]: { camera, target, isolate: get().isolate, offsets: { ...get().draft } },
    };
    saveJson(LS_MARK, bookmarks);
    set({ bookmarks });
  },
  frame: () => set({ frameEpoch: get().frameEpoch + 1 }),
  tick: (dt) => {
    const { playing, beats, index } = get();
    if (!playing) return;
    const beat = beats[index];
    if (!beat) return;
    if (beat.kind === "hold") {
      set({ playing: false });
      return;
    }
    const acc = (get() as Store & { _acc?: number })._acc ?? 0;
    const nextAcc = acc + dt;
    if (nextAcc >= 1.35) {
      (get() as Store & { _acc?: number })._acc = 0;
      const ni = index + 1;
      if (ni >= beats.length) {
        set({ playing: false, index: beats.length - 1 });
        return;
      }
      const nb = beats[ni]!;
      set({ index: ni, holdEase: nb.kind === "hold" ? 1 : 0, playing: nb.kind !== "hold" });
      if (nb.kind === "hold") set({ playing: false });
    } else {
      (get() as Store & { _acc?: number })._acc = nextAcc;
    }
  },
  setKeys: (codes) => set({ keys: new Set(codes) }),
  injectKey: (code, down) => {
    const keys = new Set(get().keys);
    if (down) keys.add(code);
    else keys.delete(code);
    set({ keys });
  },
}));

export function visibleIds(beats: Beat[], index: number, hidden: Set<string>): Set<string> {
  const ids = new Set<string>();
  const hide = new Set<string>(hidden);
  for (let i = 0; i <= index && i < beats.length; i++) {
    const b = beats[i]!;
    for (const h of b.hides) hide.add(h);
    for (const id of b.object_ids) {
      if (!hide.has(id)) ids.add(id);
    }
  }
  return ids;
}

export function currentBeat(): Beat | undefined {
  const s = useStepper.getState();
  return s.beats[s.index];
}

if (typeof window !== "undefined") {
  (window as unknown as { __controlsTest?: unknown }).__controlsTest = {
    getYaw: () => useStepper.getState().truck.yaw,
    getSpeed: () => {
      const k = useStepper.getState().keys;
      return k.has("KeyW") || k.has("KeyS") || k.has("KeyA") || k.has("KeyD") ? 1 : 0;
    },
    setKeys: (codes: string[]) => useStepper.getState().setKeys(codes),
    setSteer: (v: number) => {
      const t = useStepper.getState().truck;
      useStepper.setState({ truck: { ...t, yaw: t.yaw + v * 0.2 } });
    },
  };
}
