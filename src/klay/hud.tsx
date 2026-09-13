import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function KlayHud({
  dusk,
  onDusk,
  showDots,
  onDots,
}: {
  dusk: boolean;
  onDusk: (v: boolean) => void;
  showDots: boolean;
  onDots: (v: boolean) => void;
}) {
  const [hint, setHint] = useState(true);
  useEffect(() => {
    const onLock = () => setHint(!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onLock);
    return () => document.removeEventListener("pointerlockchange", onLock);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-paper">
      <header className="pointer-events-auto absolute top-5 left-5 right-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-[0.68rem] tracking-mark text-paper-muted">KLAY ATTEMPT · DIGITAL TWIN</p>
          <h1 className="font-display mt-1 text-2xl tracking-tight">Solace · Unit 02</h1>
          <p className="mt-1 max-w-sm text-sm text-paper-muted">
            {showDots ? "Edge lattices — yellow dots, teal connectors. Surfaces loft between them." : "Finished sales unit. Walk it. Not the construction model."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full bg-ink-elevated/80 px-3 py-2 text-xs tracking-wide backdrop-blur-md"
            onClick={() => onDots(!showDots)}
          >
            {showDots ? "Hide dots" : "Show dots"}
          </button>
          <button
            type="button"
            className="rounded-full bg-ink-elevated/80 px-3 py-2 text-xs tracking-wide backdrop-blur-md"
            onClick={() => onDusk(!dusk)}
          >
            {dusk ? "Dusk" : "Day"}
          </button>
          <Link
            to="/"
            className="rounded-full bg-ink-elevated/80 px-3 py-2 text-xs tracking-wide backdrop-blur-md"
          >
            Back to BIM
          </Link>
        </div>
      </header>

      {!showDots && hint ? (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-16">
          <button
            type="button"
            className="pointer-events-auto rounded-2xl bg-ink/70 px-6 py-5 text-center backdrop-blur-md"
            onClick={() => {
              const c = document.querySelector("canvas");
              void c?.requestPointerLock();
            }}
          >
            <p className="font-display text-lg">Click to walk</p>
            <p className="mt-1 text-sm text-paper-muted">W A S D move · mouse look · Shift sprint · Esc release</p>
          </button>
        </div>
      ) : null}
    </div>
  );
}