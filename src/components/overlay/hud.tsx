import {
  Eye,
  Layers,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CATALOG, FAMILIES, FINISH_LIST, SWAP_GROUPS, swapGroupForKind, type FinishFamily } from "@/lib/bim/catalog";
import { formatHex, parseUserHex, typeHex } from "@/lib/bim/hash";
import { kindMeta } from "@/lib/bim/kinds";
import { EXAMPLE_BRIEFS } from "@/lib/bim/parse-brief";
import { PHASE_NOTES } from "@/lib/bim/phases";
import {
  LAYER_PRESETS,
  resolveBox,
  useBim,
  type OverrideScope,
  type RenderStyle,
  type ViewPreset,
} from "@/lib/bim/store";
import { BUILD_SEQUENCE, LAYER_META } from "@/lib/bim/types";
import { cn } from "@/lib/utils";
import { LayerTree } from "./layer-tree";
import { DropCapture, LibraryPanel } from "./library-panel";

function LayersPanel({ onClose }: { onClose?: () => void }) {
  const applyPreset = useBim((s) => s.applyPreset);
  const explode = useBim((s) => s.explode);
  const setExplode = useBim((s) => s.setExplode);
  const section = useBim((s) => s.section);
  const setSection = useBim((s) => s.setSection);
  const playing = useBim((s) => s.playing);
  const play = useBim((s) => s.playSequence);
  const stop = useBim((s) => s.stopSequence);
  const seqT = useBim((s) => s.seqT);
  const sequenceOn = useBim((s) => s.sequenceOn);
  const filter = useBim((s) => s.treeFilter);
  const setFilter = useBim((s) => s.setTreeFilter);
  const showLabels = useBim((s) => s.showLabels);
  const setShowLabels = useBim((s) => s.setShowLabels);
  const focusKind = useBim((s) => s.focusKind);
  const setFocusKind = useBim((s) => s.setFocusKind);
  const activePhase = sequenceOn
    ? BUILD_SEQUENCE[Math.min(BUILD_SEQUENCE.length - 1, Math.max(0, Math.floor(seqT)))]
    : null;
  const note = activePhase ? PHASE_NOTES[activePhase] : null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl bg-ink-elevated/95 p-3 shadow-[var(--shadow-border)] lg:w-80">
      <div className="flex items-center justify-between px-1 pb-2">
        <div>
          <p className="font-display text-sm tracking-mark text-steel uppercase">Assembly</p>
          <p className="text-xs text-paper-muted">Bible sequence P04–P17</p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close layers">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 px-1 pb-2">
        {LAYER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className="h-9 rounded-md px-3 text-xs text-paper shadow-[var(--shadow-border)] hover:bg-paper/10"
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="block px-1 pb-2">
        <span className="sr-only">Filter components</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter kinds, hex, spec…"
          className="h-9 w-full rounded-md bg-ink-subtle px-2 font-mono text-xs text-paper placeholder:text-paper-muted shadow-[var(--shadow-border)] focus:outline-none focus:ring-2 focus:ring-steel/70"
        />
      </label>

      <LayerTree />

      <div className="mt-3 space-y-3 border-t border-line pt-3">
        {note ? (
          <div className="rounded-md bg-ink-subtle px-3 py-2">
            <p className="font-mono text-xs text-steel">
              {note.id} · {note.title}
            </p>
            <p className="mt-1 text-xs text-paper-muted">{note.habit}</p>
            <p className="mt-1 font-mono text-xs text-paper">{note.hold}</p>
          </div>
        ) : null}
        {focusKind ? (
          <button type="button" onClick={() => setFocusKind(null)} className="px-1 text-xs text-steel hover:text-paper">
            Clear kind solo
          </button>
        ) : null}
        <label className="flex min-h-11 items-center justify-between gap-2 px-1 text-xs text-paper-muted">
          <span>3D labels</span>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="size-4 accent-paper"
          />
        </label>
        <label className="block px-1">
          <span className="flex justify-between text-xs text-paper-muted">
            <span>Explode</span>
            <span className="font-mono tabular-nums">{Math.round(explode * 100)}%</span>
          </span>
          <input
            className="lw-range mt-1"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
            suppressHydrationWarning
          />
        </label>
        <label className="block px-1">
          <span className="flex justify-between text-xs text-paper-muted">
            <span>Section cut</span>
            <span className="font-mono tabular-nums">{Math.round(section * 100)}%</span>
          </span>
          <input
            className="lw-range mt-1"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={section}
            onChange={(e) => setSection(Number(e.target.value))}
            suppressHydrationWarning
          />
        </label>
        <Button
          variant={playing ? "outline" : "quiet"}
          className="w-full"
          onClick={() => (playing ? stop() : play())}
        >
          <Play className="size-3.5" />
          {playing ? "Stop sequence" : "Play build sequence"}
        </Button>
      </div>
    </aside>
  );
}

function Swatch({
  hex,
  name,
  id,
  active,
  onPick,
}: {
  hex: string;
  name: string;
  id: string;
  active?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-md px-2 text-left shadow-[var(--shadow-border)] hover:bg-paper/10",
        active && "bg-paper/10",
      )}
    >
      <span className="size-7 shrink-0 rounded-sm" style={{ background: hex }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-paper">{name}</span>
        <span className="block font-mono text-xs text-paper-muted">{hex}</span>
      </span>
      <span className="sr-only">{id}</span>
    </button>
  );
}

function FinishesPanel() {
  const selectedHex = useBim((s) => s.selectedHex);
  const boxes = useBim((s) => s.result.boxes);
  const overrides = useBim((s) => s.overrides);
  const applyFinish = useBim((s) => s.applyFinish);
  const scope = useBim((s) => s.overrideScope);
  const setScope = useBim((s) => s.setOverrideScope);
  const clear = useBim((s) => s.clearOverrides);
  const [family, setFamily] = useState<FinishFamily | "all" | SwapGroupIdLocal>("all");
  const [custom, setCustom] = useState("");

  const selected = useMemo(() => {
    const raw = boxes.find((b) => b.hex === selectedHex);
    return raw ? resolveBox(raw, overrides) : null;
  }, [boxes, selectedHex, overrides]);

  const group = selected ? swapGroupForKind(selected.kind) : null;
  const groupIds = group ? SWAP_GROUPS[group].ids : null;

  const list = useMemo(() => {
    if (family === "all") return FINISH_LIST;
    if (family in SWAP_GROUPS) return SWAP_GROUPS[family as keyof typeof SWAP_GROUPS].ids.map((id) => CATALOG[id]!);
    return FINISH_LIST.filter((f) => f.family === family);
  }, [family]);

  const scopes: { id: OverrideScope; label: string }[] = [
    { id: "piece", label: "Piece" },
    { id: "kind", label: "Kind" },
    { id: "layer", label: "Layer" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap gap-1 px-1 pb-2">
        <button
          type="button"
          onClick={() => setFamily("all")}
          className={cn("h-8 rounded-md px-2 text-xs", family === "all" ? "bg-paper/15 text-paper" : "text-paper-muted")}
        >
          All
        </button>
        {FAMILIES.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFamily(f)}
            className={cn("h-8 rounded-md px-2 text-xs capitalize", family === f ? "bg-paper/15 text-paper" : "text-paper-muted")}
          >
            {f}
          </button>
        ))}
      </div>
      {group && groupIds ? (
        <div className="mb-2 px-1">
          <p className="mb-1 font-display text-xs tracking-mark text-steel uppercase">{SWAP_GROUPS[group].label} swaps</p>
          <div className="grid grid-cols-1 gap-1">
            {groupIds.map((id) => {
              const f = CATALOG[id]!;
              return (
                <Swatch
                  key={id}
                  hex={f.hex}
                  name={f.name}
                  id={f.id}
                  active={selected?.matId === f.id}
                  onPick={() => selected && applyFinish(f.id)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <p className="px-1 pb-2 text-xs text-paper-muted">Select a piece in the model to swap its finish.</p>
      )}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
        {list.map((f) => (
          <Swatch
            key={f.id}
            hex={f.hex}
            name={f.name}
            id={f.id}
            active={selected?.matId === f.id}
            onPick={() => selected && applyFinish(f.id)}
          />
        ))}
      </div>
      <div className="mt-2 space-y-2 border-t border-line pt-2">
        <div className="flex gap-1 px-1">
          {scopes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className={cn(
                "h-8 flex-1 rounded-md text-xs",
                scope === s.id ? "bg-paper/15 text-paper" : "text-paper-muted shadow-[var(--shadow-border)]",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-1 px-1"
          onSubmit={(e) => {
            e.preventDefault();
            const hex = parseUserHex(custom);
            if (hex && selected) applyFinish(hex);
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="#C9A06A"
            className="h-9 min-h-9 flex-1 rounded-md bg-ink-subtle px-2 font-mono text-xs text-paper placeholder:text-paper-muted shadow-[var(--shadow-border)] focus:outline-none focus:ring-2 focus:ring-steel/70"
            suppressHydrationWarning
          />
          <Button type="submit" size="sm" disabled={!selected || !parseUserHex(custom)}>
            Tint
          </Button>
        </form>
        <button type="button" onClick={() => clear()} className="px-1 text-xs text-paper-muted hover:text-paper">
          Reset finishes
        </button>
      </div>
    </div>
  );
}

type SwapGroupIdLocal = keyof typeof SWAP_GROUPS;

function InspectorPanel() {
  const selectedHex = useBim((s) => s.selectedHex);
  const boxes = useBim((s) => s.result.boxes);
  const overrides = useBim((s) => s.overrides);
  const hexQuery = useBim((s) => s.hexQuery);
  const setHexQuery = useBim((s) => s.setHexQuery);
  const selectHex = useBim((s) => s.selectHex);
  const isolateKind = useBim((s) => s.isolateKind);

  const box = useMemo(() => {
    const raw = boxes.find((b) => b.hex === selectedHex);
    return raw ? resolveBox(raw, overrides) : null;
  }, [boxes, selectedHex, overrides]);

  const phase = box ? PHASE_NOTES[box.layer] : null;
  const finish = box ? (CATALOG[box.matId.split("#")[0]!] ?? null) : null;
  const kmeta = box ? kindMeta(box.kind) : null;

  return (
    <div className="space-y-3">
      <label className="block px-1">
        <span className="text-xs text-paper-muted">Find hex</span>
        <input
          value={hexQuery}
          onChange={(e) => setHexQuery(e.target.value)}
          placeholder="0xA3F2C91B or #C9A06A"
          className="mt-1 h-9 w-full rounded-md bg-ink-subtle px-2 font-mono text-xs text-paper placeholder:text-paper-muted shadow-[var(--shadow-border)] focus:outline-none focus:ring-2 focus:ring-steel/70"
          suppressHydrationWarning
        />
      </label>
      {box && kmeta ? (
        <div className="space-y-2 px-1">
          <p className="font-display text-sm text-paper">{kmeta.label}</p>
          <p className="font-mono text-[11px] text-paper-muted">{kmeta.spec}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
            <dt className="text-paper-muted">Piece</dt>
            <dd className="text-paper">
              <button
                type="button"
                className="hover:text-steel"
                onClick={() => void navigator.clipboard?.writeText(formatHex(box.hex))}
              >
                {formatHex(box.hex)}
              </button>
            </dd>
            <dt className="text-paper-muted">Type</dt>
            <dd className="text-paper">{typeHex(box.kind)}</dd>
            <dt className="text-paper-muted">Material</dt>
            <dd className="text-paper">{box.color}</dd>
            <dt className="text-paper-muted">Finish</dt>
            <dd className="truncate text-paper">{finish?.name ?? box.matId}</dd>
            <dt className="text-paper-muted">Layer</dt>
            <dd className="text-paper">
              {LAYER_META[box.layer].phase} · {LAYER_META[box.layer].label}
            </dd>
            <dt className="text-paper-muted">IFC</dt>
            <dd className="truncate text-paper">{kmeta.ifc}</dd>
            <dt className="text-paper-muted">Size</dt>
            <dd className="text-paper">
              {Math.round(box.w * 1000)} × {Math.round(box.h * 1000)} × {Math.round(box.d * 1000)} mm
            </dd>
            {box.unit != null ? (
              <>
                <dt className="text-paper-muted">Unit</dt>
                <dd className="text-paper">{box.unit + 1}</dd>
              </>
            ) : null}
          </dl>
          <button
            type="button"
            onClick={() => isolateKind(box.layer, box.kind)}
            className="text-xs text-steel hover:text-paper"
          >
            Solo this kind in the tree
          </button>
          {phase ? (
            <div className="rounded-md bg-ink-subtle px-3 py-2">
              <p className="font-mono text-xs text-steel">
                {phase.id} · {phase.title}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-paper-muted">
                {phase.looks.slice(0, 4).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="px-1 text-xs text-paper-muted">
          Open a layer in the assembly tree, or click a piece. Every stud, flashing, and finish has an 8-character hex ID.
        </p>
      )}
      <button type="button" onClick={() => selectHex(null)} className="px-1 text-xs text-paper-muted hover:text-paper">
        Clear selection
      </button>
    </div>
  );
}

function SpecPanel({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<"inspect" | "finishes" | "library">("inspect");
  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl bg-ink-elevated/95 p-3 shadow-[var(--shadow-border)] lg:w-80">
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex gap-1">
          {(
            [
              ["inspect", "Inspect"],
              ["finishes", "Finishes"],
              ["library", "Library"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn("h-8 rounded-md px-3 text-xs", tab === id ? "bg-paper/15 text-paper" : "text-paper-muted")}
            >
              {label}
            </button>
          ))}
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close spec">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "inspect" ? <InspectorPanel /> : tab === "finishes" ? <FinishesPanel /> : <LibraryPanel />}
      </div>
    </aside>
  );
}

function BriefBar() {
  const brief = useBim((s) => s.brief);
  const setBrief = useBim((s) => s.setBrief);
  const generate = useBim((s) => s.generate);
  const generating = useBim((s) => s.generating);
  const error = useBim((s) => s.error);
  const loadProgram = useBim((s) => s.loadProgram);
  const resetTerrace = useBim((s) => s.resetTerrace);

  return (
    <div className="rounded-xl bg-ink-elevated/95 p-3 shadow-[var(--shadow-border)]">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        <label className="sr-only" htmlFor="brief">
          Building brief
        </label>
        <input
          id="brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe a building — four-unit brick terrace, gable roofs, rear gardens…"
          className="h-11 min-h-11 flex-1 rounded-md bg-ink-subtle px-3 text-sm text-paper placeholder:text-paper-muted shadow-[var(--shadow-border)] focus:outline-none focus:ring-2 focus:ring-steel/70"
          suppressHydrationWarning
        />
        <Button type="submit" disabled={generating || brief.trim().length < 4} className="shrink-0">
          {generating ? "Generating…" : "Generate"}
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLE_BRIEFS.map((ex) => (
          <button
            key={ex.label}
            type="button"
            disabled={generating}
            onClick={() => {
              if ("program" in ex && ex.program) {
                setBrief(ex.brief);
                loadProgram(ex.program, "preset");
                return;
              }
              void generate(ex.brief);
            }}
            className="h-9 rounded-md px-3 text-xs text-paper-muted shadow-[var(--shadow-border)] hover:bg-paper/10 hover:text-paper disabled:opacity-40"
          >
            {ex.label}
          </button>
        ))}
        <button type="button" onClick={() => resetTerrace()} className="h-9 rounded-md px-3 text-xs text-steel hover:text-paper">
          Reset terrace study
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-paper-muted">{error}</p> : null}
    </div>
  );
}

const VIEWS: { id: ViewPreset; label: string }[] = [
  { id: "street", label: "Street" },
  { id: "eye", label: "Eye" },
  { id: "iso", label: "Iso" },
  { id: "top", label: "Plan" },
];
const STYLES: { id: RenderStyle; label: string }[] = [
  { id: "studio", label: "Studio" },
  { id: "overcast", label: "Overcast" },
  { id: "dusk", label: "Dusk" },
];

export function Hud() {
  const [open, setOpen] = useState<"layers" | "spec" | null>(null);
  const program = useBim((s) => s.program);
  const via = useBim((s) => s.via);
  const boxes = useBim((s) => s.result.boxes.length);
  const generating = useBim((s) => s.generating);
  const refitCamera = useBim((s) => s.refitCamera);
  const view = useBim((s) => s.viewPreset);
  const setView = useBim((s) => s.setViewPreset);
  const style = useBim((s) => s.renderStyle);
  const setStyle = useBim((s) => s.setRenderStyle);
  const hydrate = useBim((s) => s.hydrateLibrary);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-3 sm:p-4 lg:grid-cols-[20rem_minmax(0,1fr)_20rem]">
      <header className="pointer-events-auto col-span-full flex items-start justify-between gap-3">
        <div className="rounded-xl bg-ink-elevated/95 px-4 py-3 shadow-[var(--shadow-border)]">
          <p className="font-display text-sm tracking-mark text-steel uppercase">Layerworks</p>
          <h1 className="mt-0.5 font-display text-lg leading-tight text-paper sm:text-xl">{program.name}</h1>
          <p className="mt-1 font-mono text-xs text-paper-muted">
            {program.units} units · {program.storeys} storeys · {program.unitWidth.toFixed(1)}×
            {program.unitDepth.toFixed(1)} m · {program.facade} · {program.roof} roof
            {via === "model" ? " · from brief" : via === "fallback" ? " · parsed brief" : " · study"}
            {" · "}
            <span className="tabular-nums">{boxes.toLocaleString()} pcs</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="hidden rounded-xl bg-ink-elevated/95 p-1 shadow-[var(--shadow-border)] sm:flex">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  "inline-flex h-9 min-h-9 items-center gap-1.5 rounded-md px-3 text-xs",
                  view === v.id ? "bg-paper/15 text-paper" : "text-paper-muted hover:text-paper",
                )}
              >
                {v.id === "eye" ? <Eye className="size-3.5" /> : null}
                {v.label}
              </button>
            ))}
          </div>
          <div className="hidden rounded-xl bg-ink-elevated/95 p-1 shadow-[var(--shadow-border)] md:flex">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={cn(
                  "inline-flex h-9 min-h-9 items-center gap-1.5 rounded-md px-3 text-xs",
                  style === s.id ? "bg-paper/15 text-paper" : "text-paper-muted hover:text-paper",
                )}
              >
                {s.id === "studio" ? <Sun className="size-3.5" /> : null}
                {s.label}
              </button>
            ))}
          </div>
          <Button variant="quiet" size="icon" className="hidden lg:inline-flex" onClick={() => refitCamera()} aria-label="Refit camera">
            <RotateCcw className="size-4" />
          </Button>
          <Button
            variant="quiet"
            className="lg:hidden px-3"
            onClick={() => setOpen((v) => (v === "layers" ? null : "layers"))}
            aria-label={open === "layers" ? "Hide layers" : "Show layers"}
          >
            <PanelLeftOpen className="size-4" />
            Layers
          </Button>
          <Button
            variant="quiet"
            className="lg:hidden px-3"
            onClick={() => setOpen((v) => (v === "spec" ? null : "spec"))}
            aria-label={open === "spec" ? "Hide spec" : "Show spec"}
          >
            <Layers className="size-4" />
            Spec
          </Button>
        </div>
      </header>

      <div className="pointer-events-auto hidden min-h-0 lg:col-start-1 lg:row-start-2 lg:block">
        <LayersPanel />
      </div>

      <div className="pointer-events-auto hidden min-h-0 lg:col-start-3 lg:row-start-2 lg:block">
        <SpecPanel />
      </div>

      {open === "layers" ? (
        <div className="pointer-events-auto absolute inset-x-3 top-24 z-20 max-h-[70dvh] lg:hidden">
          <LayersPanel onClose={() => setOpen(null)} />
        </div>
      ) : null}
      {open === "spec" ? (
        <div className="pointer-events-auto absolute inset-x-3 top-24 z-20 max-h-[70dvh] lg:hidden">
          <SpecPanel onClose={() => setOpen(null)} />
        </div>
      ) : null}

      <div className="pointer-events-auto col-span-full max-w-4xl self-end">
        <BriefBar />
      </div>

      {generating ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/40">
          <p className="rounded-md bg-ink-elevated px-4 py-2 font-display text-sm tracking-mark text-steel uppercase">
            Building program
          </p>
        </div>
      ) : null}
      <DropCapture />
    </div>
  );
}
