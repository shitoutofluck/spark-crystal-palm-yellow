import { kindMeta } from "./kinds";
import type { CustomItem } from "./library";
import { LAYER_IDS, type BoxSpec, type LayerId } from "./types";

export type PieceRef = {
  hex: string;
  customId?: string;
  label?: string;
  w: number;
  h: number;
  d: number;
  unit?: number;
  x: number;
  y: number;
  z: number;
};

export type KindNode = {
  kind: string;
  label: string;
  spec: string;
  ifc: string;
  count: number;
  items: PieceRef[];
};

export type LayerNode = {
  id: LayerId;
  count: number;
  kinds: KindNode[];
};

export function buildLayerTree(boxes: BoxSpec[], custom: CustomItem[] = []): LayerNode[] {
  const layerMaps = new Map<LayerId, Map<string, PieceRef[]>>();
  for (const id of LAYER_IDS) layerMaps.set(id, new Map());
  for (const b of boxes) {
    const kinds = layerMaps.get(b.layer);
    if (!kinds) continue;
    let list = kinds.get(b.kind);
    if (!list) {
      list = [];
      kinds.set(b.kind, list);
    }
    list.push({ hex: b.hex, w: b.w, h: b.h, d: b.d, unit: b.unit, x: b.x, y: b.y, z: b.z });
  }
  for (const c of custom) {
    const kinds = layerMaps.get(c.layer);
    if (!kinds) continue;
    const kind = "uploaded";
    let list = kinds.get(kind);
    if (!list) {
      list = [];
      kinds.set(kind, list);
    }
    list.push({
      hex: `C-${c.id}`,
      customId: c.id,
      label: c.name,
      w: c.sx,
      h: c.sy,
      d: c.sz,
      x: c.x,
      y: c.y,
      z: c.z,
    });
  }
  return LAYER_IDS.map((id) => {
    const kinds = layerMaps.get(id)!;
    const nodes: KindNode[] = [];
    let count = 0;
    for (const [kind, items] of kinds) {
      const meta = kind === "uploaded"
        ? { label: "Uploaded components", spec: "Library drop", ifc: "IfcBuildingElementProxy" }
        : kindMeta(kind);
      count += items.length;
      nodes.push({
        kind,
        label: meta.label,
        spec: meta.spec,
        ifc: meta.ifc,
        count: items.length,
        items,
      });
    }
    nodes.sort((a, b) => {
      if (a.kind === "uploaded") return -1;
      if (b.kind === "uploaded") return 1;
      return b.count - a.count || a.label.localeCompare(b.label);
    });
    return { id, count, kinds: nodes };
  });
}

export function kindKey(layer: LayerId, kind: string): string {
  return `${layer}:${kind}`;
}