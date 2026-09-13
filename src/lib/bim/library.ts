import { LAYER_IDS, type LayerId } from "./types";

export type CustomKind = "gltf" | "obj" | "image" | "json";

export type CustomItem = {
  id: string;
  name: string;
  layer: LayerId;
  kind: string;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  ext: CustomKind;
  mime: string;
  visible: boolean;
};

const META_KEY = "lw-library-meta-v1";
const DB_NAME = "lw-library-v1";
const STORE = "files";
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_ITEMS = 24;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb"));
  });
}

export async function putLibraryFile(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb put"));
  });
  db.close();
}

export async function getLibraryFile(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("idb get"));
  });
  db.close();
  return blob;
}

export async function deleteLibraryFile(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb del"));
  });
  db.close();
}

export function loadLibraryMeta(): CustomItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomItem);
  } catch {
    return [];
  }
}

export function saveLibraryMeta(items: CustomItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

function isCustomItem(v: unknown): v is CustomItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.layer === "string" && LAYER_IDS.includes(o.layer as LayerId);
}

export function extOf(file: File): CustomKind | null {
  const n = file.name.toLowerCase();
  if (n.endsWith(".glb") || n.endsWith(".gltf")) return "gltf";
  if (n.endsWith(".obj")) return "obj";
  if (n.endsWith(".json")) return "json";
  if (/\.(png|jpe?g|webp|avif)$/.test(n) || file.type.startsWith("image/")) return "image";
  return null;
}

export function classifyError(file: File): string | null {
  if (file.size > MAX_BYTES) return `File is over ${MAX_BYTES / (1024 * 1024)} MB.`;
  if (!extOf(file)) return "Use GLB, GLTF, OBJ, PNG/JPG, or JSON boxes.";
  return null;
}

export function canAddItem(count: number): string | null {
  if (count >= MAX_ITEMS) return `Library holds ${MAX_ITEMS} components. Remove one first.`;
  return null;
}

export function newItemId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultKindFor(ext: CustomKind, layer: LayerId): string {
  if (ext === "image") return "decal";
  if (ext === "json") return "imported-assembly";
  return `custom-${layer}`;
}

export type JsonBox = {
  layer?: LayerId;
  kind: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  matId?: string;
};

export function parseJsonBoxes(text: string): JsonBox[] {
  const raw = JSON.parse(text) as unknown;
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === "object" && "boxes" in raw ? (raw as { boxes: unknown }).boxes : null;
  if (!Array.isArray(arr)) throw new Error("JSON must be an array of boxes or { boxes: [] }");
  const out: JsonBox[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const num = (k: string) => (typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : null);
    const x = num("x");
    const y = num("y");
    const z = num("z");
    const w = num("w");
    const h = num("h");
    const d = num("d");
    if (x == null || y == null || z == null || w == null || h == null || d == null) continue;
    const kind = typeof o.kind === "string" ? o.kind : "imported";
    const layer = typeof o.layer === "string" && LAYER_IDS.includes(o.layer as LayerId) ? (o.layer as LayerId) : undefined;
    const matId = typeof o.matId === "string" ? o.matId : undefined;
    out.push({ layer, kind, x, y, z, w, h, d, matId });
  }
  if (out.length === 0) throw new Error("No valid boxes in JSON.");
  return out;
}
