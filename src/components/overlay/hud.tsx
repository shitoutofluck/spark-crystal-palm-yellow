import {
  Eye,
  Layers,
  Move,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Scaling,
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
import { ENGINE_REV } from "@/lib/bim/engine";
import { gpuReport } from "@/lib/bim/gpu";
import type { QcGate } from "@/lib/bim/qc";
import {
  LAYER_PRESETS,
  resolveBox,
  useBim,
  type GizmoMode,
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
  const workMode = useBim((s) => s.workMode);
  const stepIndex = useBim((s) => s.stepIndex);
  const setStep = useBim((s) => s.setStep);
  const nextStep = useBim((s) => s.nextStep);
  const prevStep = useBim((s) => s.prevStep);
  const enterLive = useBim((s) => s.enterLive);
  const filter = useBim((s) => s.treeFilter);
  const setFilter = useBim((s) => s.setTreeFilter);
  const showLabels = useBim((s) => s.showLabels);
  const setShowLabels = useBim((s) => s.setShowLabels);
  const focusKind = useBim((s) => s.focusKind);
  const setFocusKind = useBim((s) => s.setFocusKind);
  const activePhase = workMode === "step" ? BUILD_SEQUENCE[stepIndex] : sequenceOn
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
          {playing ? "Stop sequence" : "Play one step at a time"}
        </Button>
        <div className="flex gap-1.5">
          <Button variant="quiet" className="flex-1" onClick={prevStep} disabled={workMode === "step" && stepIndex <= 0}>
            Prev
          </Button>
          <Button variant="quiet" className="flex-1" onClick={nextStep}>
            {workMode === "step" && stepIndex >= BUILD_SEQUENCE.length - 1 ? "Live view" : "Next step"}
          </Button>
          <Button variant={workMode === "live" ? "outline" : "quiet"} className="flex-1" onClick={enterLive}>
            <Eye className="size-3.5" />
            Live
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {BUILD_SEQUENCE.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "h-7 rounded px-1.5 font-mono text-[10px]",
                workMode === "step" && i === stepIndex
                  ? "bg-paper text-ink"
                  : "text-paper-muted shadow-[var(--shadow-border)] hover:bg-paper/10",
              )}
              title={LAYER_META[id].label}
            >
              {LAYER_META[id].phase}
            </button>
          ))}
        </div>
        <p className="px-1 text-[10px] text-paper-muted">
          {workMode === "live"
            ? "Live vantage — only nearby pieces draw. [ ] steps · L live"
            : `Working ${LAYER_META[BUILD_SEQUENCE[stepIndex]].phase} ${LAYER_META[BUILD_SEQUENCE[stepIndex]].label} only`}
        </p>
        <QcStamp />
      </div>
    </aside>
  );
}

function Light({ gate, label }: { gate: QcGate; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-paper">
      <span
        className={cn(
          "size-2 rounded-full",
          gate === "pass" ? "bg-emerald-400" : gate === "warn" ? "bg-amber-400" : "bg-rose-500",
        )}
      />
      {label} {gate}
    </span>
  );
}

function QcHeaderLights() {
  const qc = useBim((s) => s.qc);
  return (
    <p className="mt-2 flex flex-wrap gap-3">
      <Light gate={qc.committee} label="Committee" />
      <Light gate={qc.calcs} label="Calcs" />
    </p>
  );
}

function QcStamp() {
  const qc = useBim((s) => s.qc);
  const workMode = useBim((s) => s.workMode);
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md bg-ink-subtle px-2 py-2">
      <button type="button" className="flex w-full flex-wrap items-center gap-2 text-left" onClick={() => setOpen((v) => !v)}>
        <Light gate={qc.committee} label="Committee" />
        <Light gate={qc.calcs} label="Calcs" />
        {!qc.mustFailHeld ? <span className="font-mono text-[10px] text-rose-400">must-fail broken</span> : null}
      </button>
      <p className="mt-1 text-[10px] text-paper-muted">{qc.stamp}</p>
      {workMode === "live" && qc.committee !== "pass" ? (
        <p className="mt-1 font-mono text-[10px] text-amber-300">Live shot is not a shop-drawing stamp</p>
      ) : null}
      {open ? (
        <div className="mt-2 max-h-64 space-y-2 overflow-auto">
          <div className="grid grid-cols-2 gap-1">
            <figure>
              <img src="/roof-section/anatomy-cutaway.jpg" alt="Roof cutaway section" className="h-20 w-full rounded object-cover" />
              <figcaption className="mt-0.5 font-mono text-[9px] text-steel">Evidence · cutaway</figcaption>
            </figure>
            <figure>
              <img src="/roof-section/eave-soffit.jpg" alt="Eave soffit fascia drip section" className="h-20 w-full rounded object-cover" />
              <figcaption className="mt-0.5 font-mono text-[9px] text-steel">Evidence · eave</figcaption>
            </figure>
            <figure>
              <img src="/roof-section/anatomy.jpg" alt="Roof anatomy exploded" className="h-20 w-full rounded object-cover" />
              <figcaption className="mt-0.5 font-mono text-[9px] text-steel">Evidence · layers</figcaption>
            </figure>
            <figure>
              <img src="/roof-section/eave-drip.jpg" alt="Eave drip fascia gutter section" className="h-20 w-full rounded object-cover" />
              <figcaption className="mt-0.5 font-mono text-[9px] text-steel">Evidence · drip</figcaption>
            </figure>
          </div>
          {qc.roof?.repairs?.length ? (
            <p className="font-mono text-[10px] text-amber-300">Roof loop: {qc.roof.repairs.join(" · ")}</p>
          ) : (
            <p className="font-mono text-[10px] text-emerald-400">Roof loop: bible sequence present</p>
          )}
        <ul className="space-y-1">
          {qc.rows.map((r) => (
            <li key={r.id} className="border-t border-line/60 pt-1">
              <p className="font-mono text-[10px] text-paper">
                <span
                  className={
                    r.gate === "pass" ? "text-emerald-400" : r.gate === "warn" ? "text-amber-300" : "text-rose-400"
                  }
                >
                  {r.gate}
                </span>{" "}
                {r.id}
                {r.mustFail ? " · MUST-FAIL" : ""}
              </p>
              <p className="text-[10px] text-paper-muted">{r.title}</p>
              <p className="font-mono text-[10px] text-steel">{r.citation}</p>
              <p className="text-[10px] text-paper-muted">{r.detail}</p>
              {r.util != null ? (
                <p className="font-mono text-[10px] text-paper-muted">
                  util {r.util.toFixed(2)}
                  {r.fos != null && Number.isFinite(r.fos) ? ` · FoS ${r.fos.toFixed(2)}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        </div>
      ) : (
        <p className="mt-1 font-mono text-[10px] text-steel">Tap stamp for RTM</p>
      )}
    </div>
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

function NumField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] text-paper-muted">{label}</span>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 h-9 w-full rounded-md bg-ink-subtle px-1.5 font-mono text-xs text-paper shadow-[var(--shadow-border)] focus:outline-none focus:ring-2 focus:ring-steel/70"
      />
    </label>
  );
}

function InspectorPanel() {
  const selectedHex = useBim((s) => s.selectedHex);
  const selectedCustomId = useBim((s) => s.selectedCustomId);
  const boxes = useBim((s) => s.result.boxes);
  const overrides = useBim((s) => s.overrides);
  const xforms = useBim((s) => s.xforms);
  const hexQuery = useBim((s) => s.hexQuery);
  const setHexQuery = useBim((s) => s.setHexQuery);
  const selectHex = useBim((s) => s.selectHex);
  const isolateKind = useBim((s) => s.isolateKind);
  const setPieceXform = useBim((s) => s.setPieceXform);
  const setPieceSize = useBim((s) => s.setPieceSize);
  const resetPieceXform = useBim((s) => s.resetPieceXform);
  const applyFinish = useBim((s) => s.applyFinish);
  const gizmoMode = useBim((s) => s.gizmoMode);
  const setGizmoMode = useBim((s) => s.setGizmoMode);
  const customItems = useBim((s) => s.customItems);
  const updateCustom = useBim((s) => s.updateCustom);
  const [tint, setTint] = useState("");

  const box = useMemo(() => {
    const raw = boxes.find((b) => b.hex === selectedHex);
    return raw ? resolveBox(raw, overrides, xforms) : null;
  }, [boxes, selectedHex, overrides, xforms]);

  const custom = customItems.find((c) => c.id === selectedCustomId) ?? null;
  const phase = box ? PHASE_NOTES[box.layer] : null;
  const finish = box ? (CATALOG[box.matId.split("#")[0]!] ?? null) : null;
  const kmeta = box ? kindMeta(box.kind) : null;
  const colorVal = box?.color?.startsWith("#") && box.color.length === 7 ? box.color : "#C9A06A";

  const modes: { id: GizmoMode; label: string; icon: typeof Move }[] = [
    { id: "translate", label: "Move", icon: Move },
    { id: "scale", label: "Size", icon: Scaling },
    { id: "rotate", label: "Turn", icon: RotateCcw },
  ];

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain" data-selected-hex={selectedHex ?? ""}>
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

      <div className="flex gap-1 px-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setGizmoMode(m.id)}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md text-xs",
              gizmoMode === m.id ? "bg-paper/15 text-paper" : "text-paper-muted shadow-[var(--shadow-border)]",
            )}
          >
            <m.icon className="size-3.5" />
            {m.label}
          </button>
        ))}
      </div>
      <p className="px-1 font-mono text-[10px] leading-snug text-paper-muted">
        {selectedHex ? `Selected 0x${selectedHex}` : custom ? `Selected ${custom.name}` : "No piece selected"}
        {" · "}
        Drag the gizmo or use arrow keys. Q/E height · Shift 1 mm · Alt 250 mm · 1/2/3 mode
      </p>

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
            <dt className="text-paper-muted">Layer</dt>
            <dd className="text-paper">
              {LAYER_META[box.layer].phase} · {LAYER_META[box.layer].label}
            </dd>
            <dt className="text-paper-muted">IFC</dt>
            <dd className="truncate text-paper">{kmeta.ifc}</dd>
          </dl>

          <p className="pt-1 font-display text-xs tracking-mark text-steel uppercase">Position m</p>
          <div className="grid grid-cols-3 gap-1">
            <NumField label="X" value={Number(box.x.toFixed(3))} step={0.05} onChange={(n) => setPieceXform(box.hex, { x: n })} />
            <NumField label="Y" value={Number(box.y.toFixed(3))} step={0.05} onChange={(n) => setPieceXform(box.hex, { y: n })} />
            <NumField label="Z" value={Number(box.z.toFixed(3))} step={0.05} onChange={(n) => setPieceXform(box.hex, { z: n })} />
          </div>

          <p className="pt-1 font-display text-xs tracking-mark text-steel uppercase">Size mm</p>
          <div className="grid grid-cols-3 gap-1">
            <NumField
              label="W"
              value={Math.round(box.w * 1000)}
              step={1}
              onChange={(n) => setPieceSize(box.hex, n / 1000, box.h, box.d)}
            />
            <NumField
              label="H"
              value={Math.round(box.h * 1000)}
              step={1}
              onChange={(n) => setPieceSize(box.hex, box.w, n / 1000, box.d)}
            />
            <NumField
              label="D"
              value={Math.round(box.d * 1000)}
              step={1}
              onChange={(n) => setPieceSize(box.hex, box.w, box.h, n / 1000)}
            />
          </div>

          <p className="pt-1 font-display text-xs tracking-mark text-steel uppercase">Rotation °</p>
          <div className="grid grid-cols-3 gap-1">
            <NumField
              label="Rx"
              value={Math.round((box.rx * 180) / Math.PI)}
              step={1}
              onChange={(n) => setPieceXform(box.hex, { rx: (n * Math.PI) / 180 })}
            />
            <NumField
              label="Ry"
              value={Math.round((box.ry * 180) / Math.PI)}
              step={1}
              onChange={(n) => setPieceXform(box.hex, { ry: (n * Math.PI) / 180 })}
            />
            <NumField
              label="Rz"
              value={Math.round((box.rz * 180) / Math.PI)}
              step={1}
              onChange={(n) => setPieceXform(box.hex, { rz: (n * Math.PI) / 180 })}
            />
          </div>

          <p className="pt-1 font-display text-xs tracking-mark text-steel uppercase">Color / texture</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorVal}
              onChange={(e) => applyFinish(e.target.value.toUpperCase())}
              className="h-9 w-11 cursor-pointer rounded-md bg-ink-subtle shadow-[var(--shadow-border)]"
              aria-label="Piece color"
            />
            <span className="font-mono text-xs text-paper">{box.color}</span>
          </div>
          <label className="block">
            <span className="text-[10px] text-paper-muted">Texture</span>
            <select
              value={box.matId.split("#")[0]}
              onChange={(e) => applyFinish(e.target.value)}
              className="mt-0.5 h-9 w-full rounded-md bg-ink-subtle px-2 text-xs text-paper shadow-[var(--shadow-border)]"
            >
              {FAMILIES.map((fam) => (
                <optgroup key={fam} label={fam}>
                  {FINISH_LIST.filter((f) => f.family === fam).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const hex = parseUserHex(tint);
              if (hex) applyFinish(hex);
            }}
          >
            <input
              value={tint}
              onChange={(e) => setTint(e.target.value)}
              placeholder="#C9A06A"
              className="h-9 min-h-9 flex-1 rounded-md bg-ink-subtle px-2 font-mono text-xs text-paper placeholder:text-paper-muted shadow-[var(--shadow-border)]"
            />
            <Button type="submit" size="sm" disabled={!parseUserHex(tint)}>
              Tint
            </Button>
          </form>
          <p className="font-mono text-[10px] text-paper-muted">{finish?.name ?? box.matId} · {finish?.proc}</p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => isolateKind(box.layer, box.kind)} className="text-xs text-steel hover:text-paper">
              Solo this kind
            </button>
            <button type="button" onClick={() => resetPieceXform(box.hex)} className="text-xs text-paper-muted hover:text-paper">
              Reset placement
            </button>
          </div>
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
      ) : custom ? (
        <div className="space-y-2 px-1">
          <p className="font-display text-sm text-paper">{custom.name}</p>
          <p className="font-mono text-[11px] text-paper-muted">
            {custom.ext.toUpperCase()} · {LAYER_META[custom.layer].label}
          </p>
          <p className="pt-1 font-display text-xs tracking-mark text-steel uppercase">Position m</p>
          <div className="grid grid-cols-3 gap-1">
            <NumField label="X" value={Number(custom.x.toFixed(3))} step={0.05} onChange={(n) => updateCustom(custom.id, { x: n })} />
            <NumField label="Y" value={Number(custom.y.toFixed(3))} step={0.05} onChange={(n) => updateCustom(custom.id, { y: n })} />
            <NumField label="Z" value={Number(custom.z.toFixed(3))} step={0.05} onChange={(n) => updateCustom(custom.id, { z: n })} />
          </div>
          <p className="pt-1 font-display text-xs tracking-mark text-steel uppercase">Scale</p>
          <div className="grid grid-cols-3 gap-1">
            <NumField label="Sx" value={Number(custom.sx.toFixed(3))} step={0.05} onChange={(n) => updateCustom(custom.id, { sx: Math.max(0.02, n) })} />
            <NumField label="Sy" value={Number(custom.sy.toFixed(3))} step={0.05} onChange={(n) => updateCustom(custom.id, { sy: Math.max(0.02, n) })} />
            <NumField label="Sz" value={Number(custom.sz.toFixed(3))} step={0.05} onChange={(n) => updateCustom(custom.id, { sz: Math.max(0.02, n) })} />
          </div>
        </div>
      ) : (
        <p className="px-1 text-xs text-paper-muted">
          Open a layer in the assembly tree, or click a piece. Every stud, flashing, and finish is selectable — drag to place, resize in the fields, swap color and texture.
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          selectHex(null);
          useBim.getState().selectCustom(null);
        }}
        className="px-1 text-xs text-paper-muted hover:text-paper"
      >
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
  { id: "eave", label: "Eave" },
  { id: "top", label: "Plan" },
];
const STYLES: { id: RenderStyle; label: string }[] = [
  { id: "studio", label: "Studio" },
  { id: "overcast", label: "Overcast" },
  { id: "dusk", label: "Dusk" },
];

function GizmoBar() {
  const hex = useBim((s) => s.selectedHex);
  const customId = useBim((s) => s.selectedCustomId);
  const mode = useBim((s) => s.gizmoMode);
  const setMode = useBim((s) => s.setGizmoMode);
  const reset = useBim((s) => s.resetPieceXform);
  if (!hex && !customId) return null;
  const modes: { id: GizmoMode; label: string }[] = [
    { id: "translate", label: "Move" },
    { id: "scale", label: "Size" },
    { id: "rotate", label: "Turn" },
  ];
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1 rounded-xl bg-ink-elevated/95 p-1 shadow-[var(--shadow-border)]">
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={cn(
            "h-9 rounded-md px-3 text-xs",
            mode === m.id ? "bg-paper/15 text-paper" : "text-paper-muted hover:text-paper",
          )}
        >
          {m.label}
        </button>
      ))}
      {hex ? (
        <button type="button" onClick={() => reset(hex)} className="h-9 rounded-md px-3 text-xs text-paper-muted hover:text-paper">
          Reset piece
        </button>
      ) : null}
      <span className="px-2 font-mono text-[10px] text-paper-muted">Arrows · Q/E height · 1/2/3</span>
    </div>
  );
}

function GpuStamp() {
  const [label, setLabel] = useState("GPU …");
  useEffect(() => {
    const tick = () => {
      const g = gpuReport;
      setLabel(
        `${g.lite ? "GPU LITE" : "GPU FULL"}${g.forced ? " (forced)" : ""}${
          g.compileOk === true ? " · PBR ok" : g.compileOk === false ? " · PBR fail" : ""
        }`,
      );
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);
  return <span className="text-steel">{label}</span>;
}

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
            {" · "}
            <span className="text-steel">engine {ENGINE_REV}</span>
            {" · "}
            <GpuStamp />
          </p>
          <QcHeaderLights />
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
        <GizmoBar />
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
