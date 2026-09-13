import { Link } from "@tanstack/react-router";

/** Overlay chip on the BIM app. Does not touch BIM HUD internals. */
export function KlayDoor() {
  return (
    <Link
      to="/walk"
      className="absolute bottom-4 right-4 z-30 rounded-full bg-ink/80 px-4 py-2 font-display text-xs tracking-mark text-paper backdrop-blur-md"
    >
      KLAY walkthrough
    </Link>
  );
}
