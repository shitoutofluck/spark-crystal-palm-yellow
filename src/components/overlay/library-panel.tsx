import { Crosshair, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { CustomItem } from "@/lib/bim/library";
import { useBim } from "@/lib/bim/store";
import { LAYER_IDS, LAYER_META, type LayerId } from "@/lib/bim/types";
import { cn } from "@/lib/utils";

function ItemRow({ item }: { item: CustomItem }) {
  const selected = useBim((s) => s.selectedCustomId === item.id);
  const select = useBim((s) => s.selectCustom);
  const update = useBim((s) => s.updateCustom);
  const remove = useBim((s) => s.removeCustom);
  const setPlace = useBim((s) => s.setPlaceMode);

  return (
    <div className={cn("rounded-md px-2 py-2", selected ? "bg-paper/10" : "shadow-[var(--shadow-border)]")}>
      <button type="button" onClick={() => select(item.id)} className="flex w-full items-start justify-between gap-2 text-left">
        <span>
          <span className="block truncate text-xs text-paper">{item.name}</span>
          <span className="block font-mono text-[10px] text-paper-muted">
            {item.ext.toUpperCase()} · {LAYER_META[item.layer].label}
          </span>
        </span>
        <span className="font-mono text-[10px] text-paper-muted">{item.visible ? "on" : "off"}</span>
      </button>
      {selected ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e: FormEvent) => e.preventDefault()}
        >
          <label className="block">
            <span className="text-[10px] text-paper-muted">Layer</span>
            <select
              value={item.layer}
              onChange={(e) => update(item.id, { layer: e.target.value as LayerId })}
              className="mt-0.5 h-9 w-full rounded-md bg-ink-subtle px-2 text-xs text-paper shadow-[var(--shadow-border)]"
            >
              {LAYER_IDS.map((id) => (
                <option key={id} value={id}>
                  {LAYER_META[id].phase} · {LAYER_META[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] text-paper-muted">Kind label</span>
            <input
              value={item.kind}
              onChange={(e) => update(item.id, { kind: e.target.value.slice(0, 40) })}
              className="mt-0.5 h-9 w-full rounded-md bg-ink-subtle px-2 font-mono text-xs text-paper shadow-[var(--shadow-border)]"
            />
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={axis} className="block">
                <span className="font-mono text-[10px] text-paper-muted">{axis.toUpperCase()} m</span>
                <input
                  type="number"
                  step={0.05}
                  value={Number(item[axis].toFixed(3))}
                  onChange={(e) => update(item.id, { [axis]: Number(e.target.value) })}
                  className="mt-0.5 h-9 w-full rounded-md bg-ink-subtle px-1.5 font-mono text-xs text-paper shadow-[var(--shadow-border)]"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(["sx", "sy", "sz"] as const).map((axis) => (
              <label key={axis} className="block">
                <span className="font-mono text-[10px] text-paper-muted">{axis}</span>
                <input
                  type="number"
                  step={0.05}
                  min={0.02}
                  value={Number(item[axis].toFixed(3))}
                  onChange={(e) => update(item.id, { [axis]: Math.max(0.02, Number(e.target.value)) })}
                  className="mt-0.5 h-9 w-full rounded-md bg-ink-subtle px-1.5 font-mono text-xs text-paper shadow-[var(--shadow-border)]"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="quiet" className="flex-1" onClick={() => setPlace(true)}>
              <Crosshair className="size-3.5" />
              Place
            </Button>
            <Button type="button" size="sm" variant="quiet" onClick={() => update(item.id, { visible: !item.visible })}>
              {item.visible ? "Hide" : "Show"}
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Remove" onClick={() => void remove(item.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function LibraryPanel() {
  const items = useBim((s) => s.customItems);
  const ingest = useBim((s) => s.ingestFiles);
  const error = useBim((s) => s.dropError);
  const hydrate = useBim((s) => s.hydrateLibrary);
  const placeMode = useBim((s) => s.placeMode);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = [...(e.dataTransfer.files ?? [])];
    if (files.length) void ingest(files);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md px-3 py-4 text-center shadow-[var(--shadow-border)]",
          over ? "bg-paper/10" : "bg-ink-subtle/60",
        )}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-5 text-steel" />
        <p className="text-xs text-paper">Drop GLB, OBJ, PNG, or JSON boxes</p>
        <p className="font-mono text-[10px] text-paper-muted">Classify the layer, then place in the model</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".glb,.gltf,.obj,.png,.jpg,.jpeg,.webp,.json,model/gltf-binary,image/*,application/json"
          className="sr-only"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            if (files.length) void ingest(files);
            e.target.value = "";
          }}
        />
      </div>
      {placeMode ? (
        <p className="mt-2 rounded-md bg-ink-subtle px-2 py-1.5 text-xs text-paper">Click the model to set position.</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-paper-muted">{error}</p> : null}
      <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
        {items.length === 0 ? (
          <p className="px-1 text-xs text-paper-muted">
            Uploaded parts join the feature tree under the layer you assign. JSON is a list of
            {" "}
            {`{ kind, x, y, z, w, h, d }`} boxes in metres.
          </p>
        ) : (
          items.map((item) => <ItemRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

export function DropCapture() {
  const ingest = useBim((s) => s.ingestFiles);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const enter = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      depth.current += 1;
      setOver(true);
    };
    const leave = () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };
    const drop = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      void ingest([...e.dataTransfer.files]);
    };
    const overEv = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("dragover", overEv);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      window.removeEventListener("dragover", overEv);
    };
  }, [ingest]);

  if (!over) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-ink/70">
      <p className="rounded-xl bg-ink-elevated px-5 py-3 font-display text-sm tracking-mark text-steel uppercase">
        Drop to library
      </p>
    </div>
  );
}
