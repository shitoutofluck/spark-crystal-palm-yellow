import { kindMeta } from "./kinds";
import { LAYER_IDS, type BoxSpec, type LayerId } from "./types";

export type PieceRef = {
  hex: string;
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

export function buildLayerTree(boxes: BoxSpec[]): LayerNode[] {
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
  return LAYER_IDS.map((id) => {
    const kinds = layerMaps.get(id)!;
    const nodes: KindNode[] = [];
    let count = 0;
    for (const [kind, items] of kinds) {
      const meta = kindMeta(kind);
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
    nodes.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return { id, count, kinds: nodes };
  });
}

export function kindKey(layer: LayerId, kind: string): string {
  return `${layer}:${kind}`;
}
