import { ContactShadows, Environment, Html, OrbitControls, Sky, TransformControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { batchBoxes, type Batch } from "@/lib/bim/build";
import { clearMaterialCache, materialFor } from "@/lib/bim/triplanar";
import { detectLiteGpu, gpuReport, liteGpu, onGpuMode, setLiteGpu } from "@/lib/bim/gpu";
import { formatMm, kindMeta } from "@/lib/bim/kinds";
import { layerIsOn, resolveBoxes, useBim } from "@/lib/bim/store";
import { clearMaterialCache, materialFor } from "@/lib/bim/triplanar";
import { BUILD_SEQUENCE, LAYER_IDS, LAYER_META, type Geom } from "@/lib/bim/types";
import { ENGINE, fitShadowCamera, type EngineStyle } from "@/lib/bim/engine";
import { CustomLayer } from "./custom";

const WHITE = new THREE.Color("#ffffff");
const DIM = new THREE.Color("#3a3c40");
const SEL = new THREE.Color("#f2eee6");
const HOV = new THREE.Color("#c5d0d8");

function gpuIsLite(gl: THREE.WebGLRenderer) {
  return detectLiteGpu(gl);
}

class FxGuard extends Component<{ children: ReactNode }, { dead: boolean }> {
  state = { dead: false };
  static getDerivedStateFromError() {
    return { dead: true };
  }
  render() {
    return this.state.dead ? null : this.props.children;
  }
}

function GpuSanity() {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    if (!gpuReport.forced || gpuReport.lite) return;
    const id = window.setTimeout(() => {
      invalidate();
      try {
        const ctx = gl.getContext();
        if (!ctx) return;
        const w = Math.min(64, ctx.drawingBufferWidth);
        const h = Math.min(64, ctx.drawingBufferHeight);
        const buf = new Uint8Array(w * h * 4);
        ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 4) sum += buf[i]! + buf[i + 1]! + buf[i + 2]!;
        const mean = sum / (w * h * 3);
        if (mean < 12) {
          gpuReport.err = `full PBR compiled but this GPU shaded black (mean ${mean.toFixed(1)}). Reverted to LITE.`;
          setLiteGpu(true);
          clearMaterialCache();
        }
      } catch (e) {
        gpuReport.err = e instanceof Error ? e.message : String(e);
      }
    }, 1200);
    return () => window.clearTimeout(id);
  }, [gl, invalidate]);
  return null;
}

function SequenceDriver() {
  const playing = useBim((s) => s.playing);
  const tick = useBim((s) => s.tickSequence);
  useFrame((_, dt) => {
    if (playing) tick(Math.min(dt, 0.1));
  });
  return null;
}

function FitCamera() {
  const epoch = useBim((s) => s.cameraEpoch);
  const bounds = useBim((s) => s.result.bounds);
  const boxes = useBim((s) => s.result.boxes);
  const workMode = useBim((s) => s.workMode);
  const stepIndex = useBim((s) => s.stepIndex);
  const view = useBim((s) => s.viewPreset);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    let minx = bounds.min[0],
      miny = bounds.min[1],
      minz = bounds.min[2],
      maxx = bounds.max[0],
      maxy = bounds.max[1],
      maxz = bounds.max[2];
    if (workMode === "step") {
      const layer = BUILD_SEQUENCE[stepIndex];
      const slice = boxes.filter((b) => b.layer === layer);
      if (slice.length) {
        minx = Infinity;
        miny = Infinity;
        minz = Infinity;
        maxx = -Infinity;
        maxy = -Infinity;
        maxz = -Infinity;
        for (const b of slice) {
          minx = Math.min(minx, b.x - b.w / 2);
          miny = Math.min(miny, b.y - b.h / 2);
          minz = Math.min(minz, b.z - b.d / 2);
          maxx = Math.max(maxx, b.x + b.w / 2);
          maxy = Math.max(maxy, b.y + b.h / 2);
          maxz = Math.max(maxz, b.z + b.d / 2);
        }
      }
    } else {
      const built = boxes.filter((b) => b.kind !== "lawn" && b.layer !== "excavation");
      if (built.length) {
        minx = Infinity;
        miny = Infinity;
        minz = Infinity;
        maxx = -Infinity;
        maxy = -Infinity;
        maxz = -Infinity;
        for (const b of built) {
          minx = Math.min(minx, b.x - b.w / 2);
          miny = Math.min(miny, b.y);
          minz = Math.min(minz, b.z - b.d / 2);
          maxx = Math.max(maxx, b.x + b.w / 2);
          maxy = Math.max(maxy, b.y + b.h / 2);
          maxz = Math.max(maxz, b.z + b.d / 2);
        }
      }
    }
    const cx = (minx + maxx) / 2;
    const cy = (miny + maxy) / 2;
    const cz = (minz + maxz) / 2;
    const span = Math.max(maxx - minx, 8);
    const roof = Math.max(maxy, 6);
    const target = new THREE.Vector3(cx, cy, cz);
    if (workMode === "live") {
      if (view === "eye") {
        camera.position.set(cx, 1.64, -8.2);
        target.set(cx, 1.52, 3.2);
      } else if (view === "top") {
        camera.position.set(cx, 32, cz);
        target.set(cx, 0.2, cz);
      } else if (view === "iso") {
        camera.position.set(cx + span * 0.55, roof + 4, minz - 8);
        target.set(cx, roof * 0.35, 2);
      } else if (view === "eave") {
        camera.position.set(cx - span * 0.12, roof * 0.82, minz - 1.6);
        target.set(cx - span * 0.18, roof * 0.72, minz + 0.9);
      } else {
        camera.position.set(cx + span * 0.42, roof * 0.38 + 2.4, minz - 6);
        target.set(cx, 2.15, 1.4);
      }
    } else {
      camera.position.set(cx + span * 0.9, cy + Math.max(span * 0.4, 4), cz - span * 0.95);
    }
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    if (controls && "target" in controls) {
      const orbit = controls as unknown as { target: THREE.Vector3; update: () => void };
      orbit.target.copy(target);
      orbit.update();
    }
    invalidate();
  }, [epoch, bounds, boxes, workMode, stepIndex, view, camera, controls, invalidate]);

  return null;
}

function InteriorLights() {
  const program = useBim((s) => s.program);
  const style = useBim((s) => s.renderStyle) as EngineStyle;
  const intensity = ENGINE.interior[style];
  const nits = ENGINE.windowNits[style];
  const nodes = [];
  const totalW = program.units * program.unitWidth;
  const ox = -totalW / 2;
  for (let i = 0; i < program.units; i++) {
    const x = ox + (i + 0.55) * program.unitWidth;
    for (let s = 0; s < program.storeys; s++) {
      const y = s * program.storeyHeight + 2.05;
      nodes.push(
        <pointLight
          key={`p-${i}-${s}`}
          position={[x, y, program.unitDepth * 0.42]}
          intensity={intensity}
          distance={11}
          decay={2}
          color={style === "dusk" ? "#ffd4a8" : "#f7eedc"}
        />,
      );
      nodes.push(
        <rectAreaLight
          key={`w-${i}-${s}`}
          position={[ox + (i + 0.5) * program.unitWidth, s * program.storeyHeight + 1.55, -0.12]}
          width={1.55}
          height={1.35}
          intensity={nits}
          color={style === "dusk" ? "#ffb070" : "#fff4e0"}
          rotation={[-0.04, Math.PI, 0]}
        />,
      );
    }
  }
  return <group>{nodes}</group>;
}

function wedgeGeometry() {
  const g = new THREE.BufferGeometry();
  const x = 0.5;
  const yb = -0.5;
  const yt = 0.5;
  const zb = -0.5;
  const zf = 0.5;
  const p: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    p.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  const tri = (a: number[], b: number[], c: number[]) => {
    p.push(...a, ...b, ...c);
  };
  const r = (xx: number, y: number, z: number) => [xx, y, z];
  tri(r(x, yb, zb), r(x, yb, zf), r(x, yt, 0));
  tri(r(-x, yb, zf), r(-x, yb, zb), r(-x, yt, 0));
  quad(r(x, yb, zb), r(-x, yb, zb), r(-x, yb, zf), r(x, yb, zf));
  quad(r(x, yb, zb), r(x, yt, 0), r(-x, yt, 0), r(-x, yb, zb));
  quad(r(x, yb, zf), r(-x, yb, zf), r(-x, yt, 0), r(x, yt, 0));
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
}

function GeomPrim({ geom }: { geom: Geom }) {
  const wedge = useMemo(() => wedgeGeometry(), []);
  if (geom === "cyl") return <cylinderGeometry args={[0.5, 0.5, 1, 12]} />;
  if (geom === "ico") return <icosahedronGeometry args={[0.5, 1]} />;
  if (geom === "sphere") return <sphereGeometry args={[0.5, 16, 12]} />;
  if (geom === "wedge") return <primitive object={wedge} attach="geometry" />;
  return <boxGeometry args={[1, 1, 1]} />;
}

function LayerBatch({
  batch,
  explode,
  plane,
}: {
  batch: Batch;
  explode: number;
  plane: THREE.Plane;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const on = useBim((s) => layerIsOn(s, batch.layer));
  const selectHex = useBim((s) => s.selectHex);
  const hoverHex = useBim((s) => s.hoverHex);
  const selectedHex = useBim((s) => s.selectedHex);
  const hoveredHex = useBim((s) => s.hoveredHex);
  const focusKind = useBim((s) => s.focusKind);
  const lift = LAYER_META[batch.layer].order * explode * 1.45;
  const count = batch.items.length;
  const tint = batch.color.startsWith("#") && batch.matId.includes("#") ? batch.color : undefined;
  const material = useMemo(() => {
    if (!on) return null;
    return materialFor(batch.matId.split("#")[0]!, plane, tint);
  }, [on, batch.matId, batch.color, plane, tint]);

  useLayoutEffect(() => {
    const inst = mesh.current;
    if (!inst) return;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const b = batch.items[i]!;
      dummy.position.set(b.x, b.y + lift, b.z);
      dummy.rotation.set(b.rx, b.ry, b.rz);
      const hidden = selectedHex === b.hex;
      dummy.scale.set(hidden ? 0 : b.w, hidden ? 0 : b.h, hidden ? 0 : b.d);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      const key = `${b.layer}:${b.kind}`;
      if (selectedHex === b.hex) col.copy(SEL);
      else if (hoveredHex === b.hex) col.copy(HOV);
      else if (focusKind && focusKind !== key) col.copy(DIM);
      else col.copy(WHITE);
      inst.setColorAt(i, col);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.count = count;
    inst.computeBoundingSphere();
  }, [batch, count, lift, selectedHex, hoveredHex, focusKind]);

  if (count === 0 || !on || !material) return null;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId == null) return;
    const box = batch.items[e.instanceId];
    if (box) selectHex(box.hex);
  };

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
      frustumCulled={false}
      material={material}
      onPointerDown={onClick}
      onPointerMove={(e) => {
        if (e.instanceId == null) return;
        const box = batch.items[e.instanceId];
        if (box) hoverHex(box.hex);
      }}
      onPointerOut={() => hoverHex(null)}
    >
      <GeomPrim geom={batch.geom} />
    </instancedMesh>
  );
}

function Selected({ plane }: { plane: THREE.Plane }) {
  const hex = useBim((s) => s.selectedHex);
  const hover = useBim((s) => s.hoveredHex);
  const boxes = useBim((s) => s.result.boxes);
  const explode = useBim((s) => s.explode);
  const overrides = useBim((s) => s.overrides);
  const xforms = useBim((s) => s.xforms);
  const show = useBim((s) => s.showLabels);
  const gizmoMode = useBim((s) => s.gizmoMode);
  const setDragging = useBim((s) => s.setGizmoDragging);
  const setPieceXform = useBim((s) => s.setPieceXform);
  const dragging = useBim((s) => s.gizmoDragging);
  const meshRef = useRef<THREE.Mesh>(null);
  const [obj, setObj] = useState<THREE.Mesh | null>(null);

  const box = useMemo(() => {
    if (!hex && !hover) return null;
    const target = hex ?? hover;
    if (!target) return null;
    return resolveBoxes(boxes, overrides, xforms).find((b) => b.hex === target) ?? null;
  }, [hex, hover, boxes, overrides, xforms]);

  const lift = box ? LAYER_META[box.layer].order * explode * 1.45 : 0;
  const tint = box?.color.startsWith("#") && box.matId.includes("#") ? box.color : undefined;
  const material = useMemo(() => {
    if (!box || !hex) return null;
    return materialFor(box.matId.split("#")[0]!, plane, tint);
  }, [box, hex, plane, tint]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !box || dragging) return;
    mesh.position.set(box.x, box.y + lift, box.z);
    mesh.rotation.set(box.rx, box.ry, box.rz);
    mesh.scale.set(box.w, box.h, box.d);
  }, [box, lift, dragging]);

  if (!box) return null;
  const meta = kindMeta(box.kind);
  const selected = hex === box.hex;

  const commit = () => {
    const mesh = meshRef.current;
    if (!mesh || !hex) return;
    setPieceXform(hex, {
      x: mesh.position.x,
      y: mesh.position.y - lift,
      z: mesh.position.z,
      w: Math.max(0.002, Math.abs(mesh.scale.x)),
      h: Math.max(0.002, Math.abs(mesh.scale.y)),
      d: Math.max(0.002, Math.abs(mesh.scale.z)),
      rx: mesh.rotation.x,
      ry: mesh.rotation.y,
      rz: mesh.rotation.z,
    });
  };

  return (
    <group>
      {selected && material ? (
        <mesh
          ref={(n) => {
            meshRef.current = n;
            setObj((prev) => (prev === n ? prev : n));
          }}
          castShadow
          receiveShadow
          material={material}
        >
          <GeomPrim geom={box.geom} />
        </mesh>
      ) : (
        <mesh position={[box.x, box.y + lift, box.z]} scale={[box.w * 1.02, box.h * 1.02, box.d * 1.02]} raycast={() => {}}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#e8e4dc" wireframe transparent opacity={0.45} depthTest={false} />
        </mesh>
      )}
      {selected && obj ? (
        <TransformControls
          object={obj}
          mode={gizmoMode}
          size={0.85}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => {
            commit();
            setDragging(false);
          }}
        />
      ) : null}
      {show ? (
        <Html
          position={[box.x, box.y + lift + box.h * 0.55 + 0.12, box.z]}
          center
          sprite
          distanceFactor={16}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded-md bg-ink-elevated/95 px-2.5 py-1.5 shadow-[var(--shadow-border)]">
            <p className="font-display text-[11px] tracking-wide text-paper uppercase">{meta.label}</p>
            <p className="font-mono text-[10px] text-steel">
              0x{box.hex} · {formatMm(box.w, box.h, box.d)}
            </p>
            <p className="font-mono text-[10px] text-paper-muted">
              {LAYER_META[box.layer].phase} · {meta.ifc}
            </p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function NudgeKeys() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) {
        return;
      }
      const st = useBim.getState();
      if (e.key === "Escape") {
        st.selectHex(null);
        st.selectCustom(null);
        return;
      }
      if (e.key === "1") {
        st.setGizmoMode("translate");
        return;
      }
      if (e.key === "2") {
        st.setGizmoMode("scale");
        return;
      }
      if (e.key === "3") {
        st.setGizmoMode("rotate");
        return;
      }
      if (e.key === "[" || e.key === ",") {
        st.prevStep();
        return;
      }
      if (e.key === "]" || e.key === ".") {
        st.nextStep();
        return;
      }
      if (e.key === "l" || e.key === "L") {
        st.enterLive();
        return;
      }
      if (!st.selectedHex && !st.selectedCustomId) return;

      const step = e.shiftKey ? 0.001 : e.altKey ? 0.25 : 0.05;
      const away = new THREE.Vector3();
      camera.getWorldDirection(away);
      away.y = 0;
      if (away.lengthSq() < 1e-8) {
        away.set(-camera.matrixWorld.elements[8], 0, -camera.matrixWorld.elements[10]);
        if (away.lengthSq() < 1e-8) away.set(0, 0, -1);
      }
      away.normalize();
      const right = new THREE.Vector3().crossVectors(away, new THREE.Vector3(0, 1, 0));
      if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
      else right.normalize();

      let dx = 0;
      let dy = 0;
      let dz = 0;
      if (e.key === "ArrowLeft") {
        dx = -right.x * step;
        dz = -right.z * step;
      } else if (e.key === "ArrowRight") {
        dx = right.x * step;
        dz = right.z * step;
      } else if (e.key === "ArrowUp") {
        dx = away.x * step;
        dz = away.z * step;
      } else if (e.key === "ArrowDown") {
        dx = -away.x * step;
        dz = -away.z * step;
      } else if (e.key === "PageUp" || e.key === "e" || e.key === "E") {
        dy = step;
      } else if (e.key === "PageDown" || e.key === "q" || e.key === "Q") {
        dy = -step;
      } else {
        return;
      }
      e.preventDefault();
      st.nudgeSelected(dx, dy, dz);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [camera]);
  return null;
}

function LayerTags() {
  const explode = useBim((s) => s.explode);
  const boxes = useBim((s) => s.result.boxes);
  const visible = useBim((s) => s.visible);
  const sequenceOn = useBim((s) => s.sequenceOn);
  const seqT = useBim((s) => s.seqT);
  const workMode = useBim((s) => s.workMode);
  const stepIndex = useBim((s) => s.stepIndex);
  const show = useBim((s) => s.showLabels);
  if (!show || explode < 0.12) return null;
  const tags = [];
  for (const id of LAYER_IDS) {
    if (!layerIsOn({ visible, sequenceOn, seqT, workMode, stepIndex }, id)) continue;
    const list = boxes.filter((b) => b.layer === id);
    if (list.length === 0) continue;
    let x = 0,
      y = 0,
      z = 0;
    for (const b of list) {
      x += b.x;
      y += b.y;
      z += b.z;
    }
    const n = list.length;
    const lift = LAYER_META[id].order * explode * 1.45;
    tags.push(
      <Html
        key={id}
        position={[x / n, y / n + lift + 0.4, z / n]}
        center
        sprite
        distanceFactor={22}
        style={{ pointerEvents: "none" }}
      >
        <div className="rounded-md bg-ink-elevated/90 px-2 py-1 font-display text-[10px] tracking-mark text-steel uppercase shadow-[var(--shadow-border)]">
          {LAYER_META[id].phase} {LAYER_META[id].label}
        </div>
      </Html>,
    );
  }
  return <group>{tags}</group>;
}

function Building({ plane }: { plane: THREE.Plane }) {
  const result = useBim((s) => s.result);
  const explode = useBim((s) => s.explode);
  const overrides = useBim((s) => s.overrides);
  const xforms = useBim((s) => s.xforms);
  const placeMode = useBim((s) => s.placeMode);
  const placeAt = useBim((s) => s.placeAt);
  const workMode = useBim((s) => s.workMode);
  const stepIndex = useBim((s) => s.stepIndex);
  const visible = useBim((s) => s.visible);
  const sequenceOn = useBim((s) => s.sequenceOn);
  const seqT = useBim((s) => s.seqT);
  const camera = useThree((s) => s.camera);
  const camHold = useRef(new THREE.Vector3(0, 8, -12));
  const [lod, setLod] = useState(0);

  useFrame(() => {
    if (workMode !== "live") return;
    if (camera.position.distanceToSquared(camHold.current) < 9) return;
    camHold.current.copy(camera.position);
    setLod((n) => n + 1);
  });

  const batches = useMemo(() => {
    let boxes = resolveBoxes(result.boxes, overrides, xforms);
    if (workMode === "step") {
      const layer = BUILD_SEQUENCE[stepIndex];
      boxes = boxes.filter((b) => b.layer === layer);
    } else {
      boxes = boxes.filter((b) => layerIsOn({ visible, sequenceOn, seqT, workMode, stepIndex }, b.layer));
      const c = camHold.current;
      boxes = boxes.filter((b) => {
        const dx = b.x - c.x;
        const dy = b.y - c.y;
        const dz = b.z - c.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 480 && b.w * b.h * b.d < 0.002) return false;
        if (d2 > 720 && b.layer === "fasteners") return false;
        return true;
      });
    }
    const list = batchBoxes(boxes);
    list.sort((a, b) => b.opacity - a.opacity);
    return list;
  }, [result, overrides, xforms, workMode, stepIndex, visible, sequenceOn, seqT, lod, placeMode]);

  const onPlace = (e: ThreeEvent<MouseEvent>) => {
    if (!placeMode) return;
    e.stopPropagation();
    placeAt({ x: e.point.x, y: e.point.y, z: e.point.z });
  };

  return (
    <group onPointerDown={placeMode ? onPlace : undefined}>
      {batches.map((batch) => (
        <LayerBatch
          key={`${batch.key}:${batch.items.length}`}
          batch={batch}
          explode={explode}
          plane={plane}
        />
      ))}
      <Selected plane={plane} />
      <LayerTags />
      <CustomLayer plane={plane} />
    </group>
  );
}

function Lights() {
  const { gl, scene } = useThree();
  const style = useBim((s) => s.renderStyle) as EngineStyle;
  const bounds = useBim((s) => s.result.bounds);
  const lite = detectLiteGpu(gl);
  const sunRef = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    gl.toneMapping = ENGINE.toneMapping;
    gl.toneMappingExposure = lite ? ENGINE.exposure[style] * 1.08 : ENGINE.exposure[style];
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    const bg = ENGINE.fogColor[style];
    scene.fog = new THREE.Fog(bg, ENGINE.fogNear, ENGINE.fogFar);
    scene.background = new THREE.Color(bg);
    return () => {
      scene.fog = null;
    };
  }, [gl, scene, style, lite]);

  useLayoutEffect(() => {
    if (sunRef.current) fitShadowCamera(sunRef.current, bounds.min, bounds.max);
  }, [bounds, style]);

  const sun = ENGINE.sun[style];
  const bounce = ENGINE.bounce[style];
  const hemi = ENGINE.hemi[style];
  const mapSize = lite ? ENGINE.shadowMapSize.lite : ENGINE.shadowMapSize.full;

  return (
    <>
      <hemisphereLight args={[hemi[0], hemi[1], hemi[2]]} />
      <ambientLight intensity={lite ? ENGINE.ambient[style] + 0.28 : ENGINE.ambient[style]} />
      <directionalLight
        ref={sunRef}
        position={[...sun.pos]}
        intensity={lite ? sun.intensity * 0.55 : sun.intensity}
        color={sun.color}
        castShadow
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={ENGINE.shadowBias}
        shadow-normalBias={ENGINE.shadowNormalBias}
        shadow-radius={lite ? 1 : 2.4}
      />
      <directionalLight position={[...bounce.pos]} intensity={bounce.intensity} color={bounce.color} />
      <directionalLight position={[3, 1.8, 12]} intensity={style === "dusk" ? 0.16 : 0.22} color="#e4ddd2" />
      {lite ? null : (
        <Environment
          preset={style === "dusk" ? "sunset" : style === "overcast" ? "warehouse" : "city"}
          background={false}
          environmentIntensity={ENGINE.ibl[style]}
          frames={1}
        />
      )}
      {style !== "studio" || lite ? (
        <Sky
          sunPosition={style === "dusk" ? [20, 1.6, -6] : [6, 14, 8]}
          turbidity={style === "dusk" ? 8 : 4.2}
          rayleigh={style === "dusk" ? 2.4 : 0.42}
          mieCoefficient={0.004}
          mieDirectionalG={0.78}
          inclination={style === "dusk" ? 0.48 : 0.44}
        />
      ) : null}
    </>
  );
}

function Post() {
  const gl = useThree((s) => s.gl);
  const ctx = gl.getContext();
  const attrs = ctx?.getContextAttributes?.() ?? null;
  if (!ctx || !attrs) return null;
  const mobile = typeof window !== "undefined" && window.innerWidth < 720;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false} stencilBuffer={false} autoClear>
      {mobile ? null : <N8AO aoRadius={ENGINE.ao.radius} intensity={ENGINE.ao.intensity} distanceFalloff={1.05} />}
      {ENGINE.bloom ? <Bloom luminanceThreshold={1.35} intensity={0.08} mipmapBlur /> : null}
      <Vignette offset={ENGINE.vignette.offset} darkness={ENGINE.vignette.darkness} />
      <SMAA />
    </EffectComposer>
  );
}

export function BuildingCanvas() {
  const selectHex = useBim((s) => s.selectHex);
  const selectCustom = useBim((s) => s.selectCustom);
  const result = useBim((s) => s.result);
  const section = useBim((s) => s.section);
  const dragging = useBim((s) => s.gizmoDragging);
  const placeMode = useBim((s) => s.placeMode);
  const [gpu, setGpu] = useState<"unknown" | "lite" | "full">("unknown");
  useEffect(() => onGpuMode(() => setGpu(liteGpu ? "lite" : "full")), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 80), []);
  const maxY = result.bounds.max[1];
  const minY = result.bounds.min[1];
  plane.constant = minY + section * (maxY - minY + 1.2);
  const lite = gpu !== "full";

  return (
    <div className="absolute inset-0 bg-ink touch-none">
      <Canvas
        shadows
        dpr={lite ? [1, 1] : [1, 2]}
        gl={{
          antialias: lite,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          preserveDrawingBuffer: true,
          failIfMajorPerformanceCaveat: false,
        }}
        camera={{ position: [18, 10, -16], fov: 38, near: 0.12, far: 240 }}
        onCreated={({ gl, scene, camera }) => {
          RectAreaLightUniformsLib.init();
          gl.setClearColor("#6d7a84", 1);
          gl.localClippingEnabled = true;
          gl.toneMapping = ENGINE.toneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
          const liteNow = gpuIsLite(gl);
          setLiteGpu(liteNow);
          clearMaterialCache();
          if (!liteNow) {
            const t0 = performance.now();
            try {
              const probe = new THREE.Mesh(
                new THREE.SphereGeometry(0.4, 24, 16),
                new THREE.MeshPhysicalMaterial({ color: "#c9b49a", roughness: 0.32, metalness: 0.08, clearcoat: 0.25 }),
              );
              const sc = new THREE.Scene();
              sc.add(probe);
              sc.add(new THREE.DirectionalLight("#ffffff", 3));
              gl.compile(sc, camera);
              gpuReport.compileOk = true;
              gpuReport.compileMs = Math.round(performance.now() - t0);
              gpuReport.err = null;
              probe.geometry.dispose();
              (probe.material as THREE.Material).dispose();
            } catch (e) {
              gpuReport.compileOk = false;
              gpuReport.compileMs = Math.round(performance.now() - t0);
              gpuReport.err = e instanceof Error ? e.message : String(e);
            }
          }
          if (typeof window !== "undefined") {
            (window as unknown as { __lwGpu: typeof gpuReport }).__lwGpu = gpuReport;
          }
          setGpu(liteNow ? "lite" : "full");
          void scene;
        }}
        onPointerMissed={(event) => {
          if (useBim.getState().gizmoDragging) return;
          const target = event.target as HTMLElement | null;
          if (target && target.tagName !== "CANVAS") return;
          selectHex(null);
          selectCustom(null);
        }}
      >
        <Lights />
        <InteriorLights />
        <GpuSanity />
        <SequenceDriver />
        <NudgeKeys />
        <OrbitControls
          makeDefault
          enabled={!dragging && !placeMode}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.02}
          minDistance={4}
          maxDistance={90}
          target={[0, 2.4, -2]}
        />
        <FitCamera />
        <Building plane={plane} />
        {gpu === "full" ? (
          <ContactShadows position={[0, -0.09, 0]} opacity={0.5} scale={56} blur={2.2} far={14} color="#050506" />
        ) : null}
        {gpu === "full" ? (
          <FxGuard>
            <Post />
          </FxGuard>
        ) : null}
      </Canvas>
    </div>
  );
}
