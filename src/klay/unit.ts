import * as THREE from "three";
import { blob, curveDots, edgeDots, extrude, latticeLog, loft, loftRows, resetLatticeLog, roundedRect, tube, V } from "./lattice";

export type KlayMesh = {
  geometry: THREE.BufferGeometry;
  hex: string;
  roughness: number;
  metalness: number;
  opacity: number;
  kind: string;
  proc: "plank" | "plaster" | "wood" | "glass" | "grass" | "fabric" | "concrete" | "metal" | "siding";
  emissive?: string;
};

const W = 6.5;
const D = 12.8;
const H0 = 3.15;
const ox = -W / 2;

function mesh(
  geometry: THREE.BufferGeometry,
  hex: string,
  kind: string,
  proc: KlayMesh["proc"],
  extra?: Partial<KlayMesh>,
): KlayMesh {
  return { geometry, hex, roughness: 0.5, metalness: 0, opacity: 1, kind, proc, ...extra };
}

export function buildSolaceUnit(): {
  meshes: KlayMesh[];
  spawn: [number, number, number];
  dots: THREE.Vector3[];
  segs: number[];
} {
  resetLatticeLog();
  const m: KlayMesh[] = [];
  const oak = "#C4A574";
  const plaster = "#E4DCD0";
  const mill = "#D6C19A";
  const stone = "#D5CFC3";
  const linen = "#C9C2B4";
  const wool = "#8A7A68";
  const black = "#1A1C1E";
  const concrete = "#9A9388";
  const glass = "#C8D8E4";
  const grass = "#3D6A3A";
  const bark = "#4A3424";
  const leaf = "#2E5A30";

  const lawn = loftRows(
    Array.from({ length: 6 }, (_, iz) =>
      edgeDots(V(-14, 0, -8 + iz * 6.4), V(14, 0, -8 + iz * 6.4), 12).map((p) =>
        V(p.x, 0.02 + 0.015 * Math.sin(p.x * 0.4) * Math.cos(p.z * 0.3), p.z),
      ),
    ),
  );
  m.push(mesh(lawn, grass, "lawn", "grass", { roughness: 0.95 }));

  const floor = loft(
    edgeDots(V(ox, 0.04, 0.1), V(-ox, 0.04, 0.1), 16),
    edgeDots(V(ox, 0.04, D), V(-ox, 0.04, D), 16),
  );
  m.push(mesh(floor, oak, "floor", "plank", { roughness: 0.36 }));

  const ceil = loft(
    edgeDots(V(ox, H0, 0.1), V(-ox, H0, 0.1), 10),
    edgeDots(V(ox, H0, D), V(-ox, H0, D), 10),
  );
  m.push(mesh(ceil, plaster, "ceiling", "plaster", { roughness: 0.9 }));

  const wall = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, kind: string) => {
    m.push(mesh(loft(edgeDots(a, b, 8), edgeDots(d, c, 8)), plaster, kind, "plaster", { roughness: 0.82 }));
  };
  wall(V(ox, 0.04, 0.12), V(ox, H0, 0.12), V(ox, H0, D), V(ox, 0.04, D), "wall-w");
  wall(V(-ox, 0.04, D), V(-ox, H0, D), V(-ox, H0, 0.12), V(-ox, 0.04, 0.12), "wall-e");
  wall(V(ox, 0.04, D), V(ox, H0, D), V(-ox, H0, D), V(-ox, 0.04, D), "wall-n");

  const bays = 5;
  for (let i = 0; i < bays; i++) {
    const x = ox + 0.18 + (i * (W - 0.36)) / (bays - 1);
    m.push(
      mesh(
        tube([V(x, 0.06, 0.02), V(x, H0 * 0.5, 0.02), V(x, H0 - 0.06, 0.02)], 0.028, 8, 8),
        black,
        "mullion",
        "metal",
        { roughness: 0.28, metalness: 0.74 },
      ),
    );
  }
  m.push(
    mesh(
      tube([V(ox + 0.1, H0 - 0.05, 0.02), V(0, H0 - 0.05, 0.02), V(-ox - 0.1, H0 - 0.05, 0.02)], 0.03, 8, 8),
      black,
      "head",
      "metal",
      { roughness: 0.28, metalness: 0.74 },
    ),
  );
  m.push(
    mesh(
      tube([V(ox + 0.1, 0.07, 0.02), V(0, 0.07, 0.02), V(-ox - 0.1, 0.07, 0.02)], 0.03, 8, 8),
      black,
      "sill",
      "metal",
      { roughness: 0.28, metalness: 0.74 },
    ),
  );
  m.push(
    mesh(
      loft(edgeDots(V(ox + 0.22, 0.12, 0.04), V(-ox - 0.22, 0.12, 0.04), 10), edgeDots(V(ox + 0.22, H0 - 0.1, 0.04), V(-ox - 0.22, H0 - 0.1, 0.04), 10)),
      glass,
      "curtain",
      "glass",
      { roughness: 0.04, metalness: 0.05, opacity: 0.22 },
    ),
  );

  const rug = extrude(roundedRect(3.5, 2.5, 0.18), 0.03, 0.006);
  rug.rotateX(-Math.PI / 2);
  rug.translate(0.2, 0.055, 3.5);
  m.push(mesh(rug, wool, "rug", "fabric", { roughness: 0.92 }));

  const sofaLen = 2.45;
  const sofaRows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = -1.05 + t * sofaLen;
    const seat = curveDots([V(x, 0.08, 4.85), V(x, 0.42, 4.72), V(x, 0.44, 4.15), V(x, 0.4, 3.95)], 8);
    sofaRows.push(seat);
  }
  m.push(mesh(loftRows(sofaRows), linen, "sofa", "fabric", { roughness: 0.78 }));
  const backRows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 10; i++) {
    const x = -1.05 + (i / 10) * sofaLen;
    backRows.push(curveDots([V(x, 0.42, 4.82), V(x, 0.78, 4.9), V(x, 0.95, 4.78)], 6));
  }
  m.push(mesh(loftRows(backRows), linen, "sofa-back", "fabric", { roughness: 0.78 }));
  for (const sx of [-1.12, 1.38]) {
    m.push(mesh(blob(sx, 0.46, 4.35, 0.16, 0.28, 0.38, 7, 10), linen, "arm", "fabric", { roughness: 0.78 }));
  }

  const tableTop = extrude(roundedRect(1.2, 0.7, 0.08), 0.06, 0.01);
  tableTop.rotateX(-Math.PI / 2);
  tableTop.translate(0.2, 0.34, 3.15);
  m.push(mesh(tableTop, stone, "table", "concrete", { roughness: 0.32 }));
  m.push(mesh(tube([V(0.2, 0.06, 3.15), V(0.2, 0.32, 3.15)], 0.035, 4, 8), black, "table-leg", "metal", { roughness: 0.3, metalness: 0.65 }));

  const hearthFront = curveDots([V(-0.85, 0.04, D - 0.72), V(-0.85, 1.15, D - 0.72), V(-0.55, 1.35, D - 0.72), V(0.55, 1.35, D - 0.72), V(0.85, 1.15, D - 0.72), V(0.85, 0.04, D - 0.72)], 24);
  const hearthBack = hearthFront.map((p) => V(p.x, p.y, D - 0.22));
  m.push(mesh(loft(hearthFront, hearthBack), concrete, "hearth", "concrete", { roughness: 0.62 }));
  m.push(mesh(blob(0, 0.92, D - 0.55, 0.22, 0.08, 0.12, 5, 8), "#E8A050", "ember", "wood", { emissive: "#E07020", roughness: 0.4 }));

  const cab = extrude(roundedRect(4.05, 0.56, 0.018), 1.72, 0.008);
  cab.rotateX(-Math.PI / 2);
  cab.translate(ox + 0.48, 0.08, 9.45);
  m.push(mesh(cab, mill, "cabinets", "wood", { roughness: 0.32 }));
  const counter = extrude(roundedRect(4.2, 0.66, 0.03), 0.045, 0.012);
  counter.rotateX(-Math.PI / 2);
  counter.translate(ox + 0.52, 1.82, 9.45);
  m.push(mesh(counter, stone, "counter", "concrete", { roughness: 0.26 }));
  const island = extrude(roundedRect(1.55, 0.82, 0.04), 0.86, 0.01);
  island.rotateX(-Math.PI / 2);
  island.translate(-0.1, 0.08, 8.55);
  m.push(mesh(island, mill, "island", "wood", { roughness: 0.32 }));
  const islandTop = extrude(roundedRect(1.64, 0.9, 0.05), 0.04, 0.012);
  islandTop.rotateX(-Math.PI / 2);
  islandTop.translate(-0.1, 0.96, 8.55);
  m.push(mesh(islandTop, stone, "island-top", "concrete", { roughness: 0.26 }));

  const dining = extrude(roundedRect(1.55, 0.82, 0.06), 0.06, 0.01);
  dining.rotateX(-Math.PI / 2);
  dining.translate(-ox - 1.15, 0.74, 8.2);
  m.push(mesh(dining, mill, "dining", "wood", { roughness: 0.4 }));
  m.push(mesh(tube([V(-ox - 1.15, 0.06, 8.2), V(-ox - 1.15, 0.72, 8.2)], 0.04, 4, 8), mill, "dining-leg", "wood", { roughness: 0.4 }));

  const stairX = -ox - 0.85;
  const nosing: THREE.Vector3[] = [];
  for (let t = 0; t < 14; t++) {
    const y = 0.05 + t * 0.205;
    const z = 5.35 + t * 0.225;
    nosing.push(V(stairX - 0.48, y, z));
    const tread = loft(edgeDots(V(stairX - 0.48, y, z), V(stairX + 0.48, y, z), 6), edgeDots(V(stairX - 0.48, y, z + 0.23), V(stairX + 0.48, y, z + 0.23), 6));
    m.push(mesh(tread, oak, "tread", "plank", { roughness: 0.4 }));
  }
  const stringer = tube(nosing, 0.04, 20, 6);
  m.push(mesh(stringer, mill, "stringer", "wood", { roughness: 0.45 }));

  m.push(
    mesh(
      tube([V(0.15, H0 - 0.08, 3.3), V(0.15, H0 - 0.04, 3.3)], 0.055, 3, 10),
      "#F4E8C8",
      "downlight",
      "metal",
      { emissive: "#F4E8C8", roughness: 0.2 },
    ),
  );
  m.push(
    mesh(
      tube([V(-2.1, H0 - 0.08, 9.2), V(-2.1, H0 - 0.04, 9.2)], 0.05, 3, 10),
      "#F4E8C8",
      "downlight",
      "metal",
      { emissive: "#E8C070", roughness: 0.2 },
    ),
  );

  const plant = (tx: number, tz: number) => {
    const trunkPts = curveDots([V(tx, 0, tz), V(tx + 0.05, 0.9, tz + 0.04), V(tx - 0.04, 1.8, tz - 0.02), V(tx + 0.02, 2.55, tz)], 10);
    m.push(mesh(tube(trunkPts, 0.09, 12, 8), bark, "trunk", "wood", { roughness: 0.85 }));
    for (let b = 0; b < 5; b++) {
      const a = (b / 5) * Math.PI * 2;
      const end = V(tx + Math.cos(a) * 0.85, 2.7 + (b % 2) * 0.25, tz + Math.sin(a) * 0.85);
      m.push(mesh(tube([trunkPts[7]!.clone(), end], 0.028, 6, 6), bark, "branch", "wood", { roughness: 0.85 }));
      m.push(mesh(blob(end.x, end.y + 0.15, end.z, 0.7, 0.45, 0.7, 8, 12), leaf, "canopy", "grass", { roughness: 0.88 }));
    }
    m.push(mesh(blob(tx, 3.05, tz, 1.15, 0.7, 1.15, 8, 14), leaf, "canopy", "grass", { roughness: 0.88 }));
  };
  plant(-2.45, -4.7);
  plant(2.55, -5.05);

  const net = latticeLog();
  return { meshes: m, spawn: [0.15, 1.62, 1.9], dots: net.dots, segs: net.segs };
}

export const UNIT_BOUNDS = {
  minX: ox + 0.35,
  maxX: -ox - 0.35,
  minZ: 0.55,
  maxZ: D - 0.55,
  floorY: 1.62,
  stair: { x0: -ox - 1.35, x1: -ox - 0.35, z0: 5.3, z1: 8.6, rise: H0 },
};
