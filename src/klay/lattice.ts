import * as THREE from "three";

const recorded: THREE.Vector3[] = [];
const recordedSegs: number[] = [];

export function resetLatticeLog() {
  recorded.length = 0;
  recordedSegs.length = 0;
}

export function latticeLog() {
  return { dots: recorded, segs: recordedSegs };
}

function logChain(pts: THREE.Vector3[]) {
  const start = recorded.length;
  for (const p of pts) recorded.push(p.clone());
  for (let i = 0; i < pts.length - 1; i++) {
    recordedSegs.push(start + i, start + i + 1);
  }
}

export function V(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z);
}

/** Even dots along a straight arris. */
export function edgeDots(a: THREE.Vector3, b: THREE.Vector3, n: number) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) out.push(a.clone().lerp(b, i / n));
  logChain(out);
  return out;
}

/** Dots along a Catmull-Rom through the lattice. */
export function curveDots(lattice: THREE.Vector3[], n: number, closed = false) {
  logChain(lattice);
  if (lattice.length < 2) return lattice.map((p) => p.clone());
  const c = new THREE.CatmullRomCurve3(lattice, closed, "catmullrom", 0.18);
  const dense = c.getSpacedPoints(n);
  logChain(dense);
  return dense;
}

/** Connect two equal-length edge lattices into a ruled strip. */
export function loft(a: THREE.Vector3[], b: THREE.Vector3[]): THREE.BufferGeometry {
  const n = Math.min(a.length, b.length);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = a[i]!;
    const q = b[i]!;
    pos.push(p.x, p.y, p.z, q.x, q.y, q.z);
    uv.push(i / Math.max(1, n - 1), 0, i / Math.max(1, n - 1), 1);
    const ia = recorded.length;
    recorded.push(p.clone(), q.clone());
    recordedSegs.push(ia, ia + 1);
  }
  for (let i = 0; i < n - 1; i++) {
    const i0 = i * 2;
    idx.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/** Loft a stack of rows (each row is an edge lattice). */
export function loftRows(rows: THREE.Vector3[][]): THREE.BufferGeometry {
  if (rows.length < 2) return new THREE.BufferGeometry();
  const cols = Math.min(...rows.map((r) => r.length));
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r < rows.length; r++) {
    logChain(rows[r]!.slice(0, cols));
    for (let c = 0; c < cols; c++) {
      const p = rows[r]![c]!;
      pos.push(p.x, p.y, p.z);
      uv.push(c / Math.max(1, cols - 1), r / Math.max(1, rows.length - 1));
    }
  }
  for (let r = 0; r < rows.length - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const i = r * cols + c;
      idx.push(i, i + cols, i + cols + 1, i, i + cols + 1, i + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function tube(lattice: THREE.Vector3[], radius: number, segs = 10, radial = 8) {
  logChain(lattice);
  const path = new THREE.CatmullRomCurve3(lattice, false, "catmullrom", 0.12);
  return new THREE.TubeGeometry(path, segs, radius, radial, false);
}

export function extrude(
  outline: [number, number][],
  depth: number,
  bevel = 0.008,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
}

export function roundedRect(w: number, h: number, r: number): [number, number][] {
  const k = Math.min(r, w / 2, h / 2);
  const pts: [number, number][] = [];
  const steps = 5;
  const corners: [number, number, number, number][] = [
    [w / 2 - k, h / 2 - k, 0, 0.5],
    [-w / 2 + k, h / 2 - k, 0.5, 1],
    [-w / 2 + k, -h / 2 + k, 1, 1.5],
    [w / 2 - k, -h / 2 + k, 1.5, 2],
  ];
  for (const [cx, cy, t0, t1] of corners) {
    for (let i = 0; i <= steps; i++) {
      const t = Math.PI * (t0 + ((t1 - t0) * i) / steps);
      pts.push([cx + Math.cos(t) * k, cy + Math.sin(t) * k]);
    }
  }
  return pts;
}

/** Ellipsoid lattice (rings × meridians), then loft — organic mass, not an ico. */
export function blob(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, rings = 10, mer = 16) {
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= rings; i++) {
    const v = (i / rings) * Math.PI;
    const row: THREE.Vector3[] = [];
    for (let j = 0; j <= mer; j++) {
      const u = (j / mer) * Math.PI * 2;
      const n = 0.92 + 0.08 * Math.sin(u * 3 + v * 2);
      row.push(V(cx + Math.sin(v) * Math.cos(u) * rx * n, cy + Math.cos(v) * ry * n, cz + Math.sin(v) * Math.sin(u) * rz * n));
    }
    rows.push(row);
  }
  return loftRows(rows);
}
