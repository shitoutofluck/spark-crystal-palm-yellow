import { useState } from "react";
import { KlayHud } from "./hud";
import { KlayCanvas } from "./scene";

export function KlayApp() {
  const [dusk, setDusk] = useState(true);
  const [showDots, setShowDots] = useState(true);
  return (
    <main className="relative h-dvh overflow-hidden bg-ink text-paper">
      <KlayCanvas dusk={dusk} showDots={showDots} />
      <KlayHud dusk={dusk} onDusk={setDusk} showDots={showDots} onDots={setShowDots} />
    </main>
  );
}