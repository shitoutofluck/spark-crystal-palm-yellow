import { useEffect, useState, type ComponentType } from "react";

const preload = typeof window === "undefined" ? null : import("./scene");

export function ViewerHost() {
  const [Scene, setScene] = useState<ComponentType | null>(null);

  useEffect(() => {
    let live = true;
    const p = preload ?? import("./scene");
    void p.then((mod) => {
      if (live) setScene(() => mod.BuildingCanvas);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!Scene) {
    return <div className="absolute inset-0 bg-ink" aria-hidden />;
  }

  return <Scene />;
}
