import { createFileRoute } from "@tanstack/react-router";
import { Hud } from "@/components/overlay/hud";
import { ViewerHost } from "@/components/viewer/host";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="relative h-dvh overflow-hidden bg-ink text-paper">
      <ViewerHost />
      <Hud />
    </main>
  );
}
