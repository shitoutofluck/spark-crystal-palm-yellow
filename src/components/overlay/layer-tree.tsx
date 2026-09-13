import {
  Armchair,
  Box,
  ChevronDown,
  ChevronRight,
  Cylinder,
  Droplets,
  Grid3x3,
  Home,
  Layers,
  LayoutGrid,
  Mountain,
  Snowflake,
  Square,
  SquareStack,
  Trees,
  Wind,
  Zap,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useMemo } from "react";
import { formatMm } from "@/lib/bim/kinds";
import { PHASE_NOTES } from "@/lib/bim/phases";
import { layerIsOn, useBim } from "@/lib/bim/store";
import { buildLayerTree, kindKey, type KindNode } from "@/lib/bim/tree";
import { LAYER_META, type LayerId } from "@/lib/bim/types";
import { cn } from "@/lib/utils";

const ICONS: Record<LayerId, ComponentType<SVGProps<SVGSVGElement>>> = {
  site: Trees,
  excavation: Mountain,
  foundation: Cylinder,
  underslab: SquareStack,
  framing: LayoutGrid,
  envelope: Box,
  openings: Square,
  insulation: Snowflake,
  hvac: Wind,
  electrical: Zap,
  plumbing: Droplets,
  interior: Armchair,
  finishes: Layers,
  exterior: Home,
};

function PieceRows({ items, kind }: { items: KindNode["items"]; kind: string }) {
  const selectedHex = useBim((s) => s.selectedHex);
  const selectHex = useBim((s) => s.selectHex);
  const hoverHex = useBim((s) => s.hoverHex);
  const shown = items.slice(0, 32);
  return (
    <ul className="ml-8 space-y-0.5 border-l border-line pl-2">
      {shown.map((p) => (
        <li key={p.hex}>
          <button
            type="button"
            onClick={() => selectHex(p.hex)}
            onMouseEnter={() => hoverHex(p.hex)}
            onMouseLeave={() => hoverHex(null)}
            className={cn(
              "flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2 text-left",
              selectedHex === p.hex ? "bg-paper/15 text-paper" : "text-paper-muted hover:bg-paper/8 hover:text-paper",
            )}
          >
            <span className="min-w-0 truncate font-mono text-xs">
              0x{p.hex}
              {p.unit != null ? ` · U${p.unit + 1}` : ""}
            </span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-paper-muted">{formatMm(p.w, p.h, p.d)}</span>
          </button>
        </li>
      ))}
      {items.length > shown.length ? (
        <li className="px-2 py-1 font-mono text-[10px] text-paper-muted">
          +{items.length - shown.length} more {kind.replace(/-/g, " ")}
        </li>
      ) : null}
    </ul>
  );
}

function KindBlock({ layer, node }: { layer: LayerId; node: KindNode }) {
  const key = kindKey(layer, node.kind);
  const open = useBim((s) => s.expandedKinds[key] ?? false);
  const focus = useBim((s) => s.focusKind);
  const toggle = useBim((s) => s.toggleExpandKind);
  const isolate = useBim((s) => s.isolateKind);
  const selectHex = useBim((s) => s.selectHex);
  const active = focus === key;

  return (
    <div>
      <div className="group flex items-center gap-1">
        <button
          type="button"
          onClick={() => toggle(layer, node.kind)}
          className={cn(
            "flex min-h-10 flex-1 items-center gap-2 rounded-md px-2 text-left",
            active ? "bg-paper/12" : "hover:bg-paper/6",
          )}
        >
          {open ? <ChevronDown className="size-3 shrink-0 text-steel" /> : <ChevronRight className="size-3 shrink-0 text-steel" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs text-paper">{node.label}</span>
            <span className="block truncate font-mono text-[10px] text-paper-muted">{node.spec}</span>
          </span>
          <span className="font-mono text-[10px] tabular-nums text-paper-muted">{node.count}</span>
        </button>
        <button
          type="button"
          title={`Solo ${node.label}`}
          onClick={() => {
            isolate(layer, node.kind);
            const first = node.items[0];
            if (first) selectHex(first.hex);
          }}
          className="grid size-10 shrink-0 place-items-center rounded-md text-paper-muted opacity-70 hover:text-paper lg:opacity-0 lg:group-hover:opacity-100"
        >
          <Grid3x3 className="size-3" />
          <span className="sr-only">Solo {node.label}</span>
        </button>
      </div>
      {open ? <PieceRows items={node.items} kind={node.kind} /> : null}
    </div>
  );
}

function LayerBlock({ id, kinds, count }: { id: LayerId; kinds: KindNode[]; count: number }) {
  const meta = LAYER_META[id];
  const on = useBim((s) => layerIsOn(s, id));
  const expanded = useBim((s) => s.expandedLayers[id]);
  const toggleVis = useBim((s) => s.toggleLayer);
  const toggleOpen = useBim((s) => s.toggleExpandLayer);
  const isolate = useBim((s) => s.isolateLayer);
  const Icon = ICONS[id];
  const phase = PHASE_NOTES[id];

  return (
    <div className="mb-0.5">
      <div className="group flex items-center gap-1">
        <button
          type="button"
          onClick={() => toggleVis(id)}
          aria-pressed={on}
          className="grid size-10 shrink-0 place-items-center rounded-md"
          title={on ? `Hide ${meta.label}` : `Show ${meta.label}`}
        >
          <span
            className={cn(
              "grid size-5 place-items-center rounded-sm border",
              on ? "border-paper bg-paper text-ink" : "border-paper/30",
            )}
          >
            {on ? <span className="block size-2 bg-ink" /> : null}
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleOpen(id)}
          className={cn(
            "flex min-h-11 flex-1 items-center gap-2 rounded-md px-1.5 text-left",
            on ? "bg-paper/8" : "opacity-50 hover:opacity-80",
          )}
        >
          {expanded ? <ChevronDown className="size-3.5 shrink-0 text-steel" /> : <ChevronRight className="size-3.5 shrink-0 text-steel" />}
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.swatch }} aria-hidden />
          <Icon className="size-3.5 shrink-0 text-steel" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-paper">{meta.label}</span>
            <span className="block truncate font-mono text-[10px] text-paper-muted">
              {meta.phase} · {kinds.length} kinds
            </span>
          </span>
          <span className="font-mono text-xs tabular-nums text-paper-muted">{count}</span>
        </button>
        <button
          type="button"
          onClick={() => isolate(id)}
          className="grid size-11 shrink-0 place-items-center rounded-md text-paper-muted opacity-70 hover:text-paper lg:opacity-0 lg:group-hover:opacity-100"
          title={`Solo ${meta.label}`}
        >
          <Grid3x3 className="size-3.5" />
          <span className="sr-only">Solo {meta.label}</span>
        </button>
      </div>
      {expanded ? (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-line pl-1">
          {phase ? <p className="px-2 py-1 text-[11px] leading-snug text-paper-muted">{phase.habit}</p> : null}
          {kinds.map((k) => (
            <KindBlock key={k.kind} layer={id} node={k} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LayerTree() {
  const boxes = useBim((s) => s.result.boxes);
  const custom = useBim((s) => s.customItems);
  const filter = useBim((s) => s.treeFilter);
  const tree = useMemo(() => buildLayerTree(boxes), [boxes]);
  const q = filter.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return tree;
    return tree
      .map((layer) => ({
        ...layer,
        kinds: layer.kinds.filter(
          (k) =>
            k.label.toLowerCase().includes(q) ||
            k.kind.includes(q) ||
            k.spec.toLowerCase().includes(q) ||
            k.items.some((p) => p.hex.toLowerCase().includes(q.replace(/^0x/, ""))),
        ),
      }))
      .filter((l) => l.kinds.length > 0 || LAYER_META[l.id].label.toLowerCase().includes(q));
  }, [tree, q]);

  const customCount = custom.length;

  return (
    <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-1">
      {filtered.map((layer) => (
        <LayerBlock key={layer.id} id={layer.id} kinds={layer.kinds} count={layer.count} />
      ))}
      {customCount > 0 ? (
        <p className="px-2 pt-2 font-mono text-[10px] text-paper-muted">{customCount} uploaded component{customCount === 1 ? "" : "s"} in library</p>
      ) : null}
    </div>
  );
}
