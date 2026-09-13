import { ContactShadows, Environment, Html, OrbitControls, Sky, SoftShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { batchBoxes, type Batch } from "@/lib/bim/build";
import { formatMm, kindMeta } from "@/lib/bim/kinds";
import { layerIsOn, resolveBoxes, useBim } from "@/lib/bim/store";
import { materialFor } from "@/lib/bim/triplanar";
import { LAYER_IDS, LAYER_META, type Geom } from "@/lib/bim/types";
import { CustomLayer } from "./custom";

const WHITE = new THREE.Color("#ffffff");
const DIM = new THREE.Color("#3a3c40");
const SEL = new THREE.Color("#f2eee6");
const HOV = new THREE.Color("#c5d0d8");

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
  const view = useBim((s) => s.viewPreset);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const [minx, miny, minz] = bounds.min;
    const [maxx, maxy, maxz] = bounds.max;
    const cx = (minx + maxx) / 2;
    const cy = (miny + maxy) / 2;
    const cz = (minz + maxz) / 2;
    const span = Math.max(maxx - minx, maxy - miny, maxz - minz, 10);
    const target = new THREE.Vector3();
    if (view === "eye") {
      camera.position.set(cx, 1.64, minz - 9.5);
      target.set(cx, 1.52, minz + 2.4);
    } else if (view === "top") {
      camera.position.set(cx, span * 1.35, cz - 0.01);
      target.set(cx, 0.2, cz);
    } else if (view === "iso") {
      camera.position.set(cx + span * 0.72, maxy + span * 0.42, cz + span * 0.72);
      target.set(cx, cy + 0.2, cz);
    } else {
      camera.position.set(cx + span * 0.78, maxy + span * 0.12, minz - span * 0.92);
      target.set(cx, cy + 0.4, minz + (maxz - minz) * 0.28);
    }
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    if (controls && "target" in controls) {
      const orbit = controls as unknown as { target: THREE.Vector3; update: () => void };
      orbit.target.copy(target);
      orbit.update();
    }
    invalidate();
  }, [epoch, bounds, view, camera, controls, invalidate]);

  return null;
}

function InteriorLights() {
  const program = useBim((s) => s.program);
  const style = useBim((s) => s.renderStyle);
  const intensity = style === "dusk" ? 9.2 : style === "overcast" ? 3.6 : 5.8;
  const nodes = [];
  const totalW = program.units * program.unitWidth;
  const ox = -totalW / 2;
  for (let i = 0; i < program.units; i++) {
    const x = ox + (i + 0.55) * program.unitWidth;
    for (let s = 0; s < program.storeys; s++) {
      nodes.push(
        <pointLight
          key={`${i}-${s}`}
          position={[x, s * program.storeyHeight + 2.05, program.unitDepth * 0.42]}
          intensity={intensity}
          distance={12}
          decay={2}
          color={style === "dusk" ? "#ffd4a8" : "#f4ead2"}
        />,
      );
    }
  }
  return <group>{nodes}</group>;
}

function GeomPrim({ geom }: { geom: Geom }) {
  if (geom === "cyl") return <cylinderGeometry args={[0.5, 0.5, 1, 12]} />;
  if (geom === "ico") return <icosahedronGeometry args={[0.5, 1]} />;
  if (geom === "sphere") return <sphereGeometry args={[0.5, 16, 12]} />;
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
      dummy.scale.set(b.w, b.h, b.d);
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

function Selected() {
  const hex = useBim((s) => s.selectedHex);
  const hover = useBim((s) => s.hoveredHex);
  const boxes = useBim((s) => s.result.boxes);
  const explode = useBim((s) => s.explode);
  const overrides = useBim((s) => s.overrides);
  const show = useBim((s) => s.showLabels);
  const target = hex ?? hover;
  const box = useMemo(() => {
    if (!target) return null;
    return resolveBoxes(boxes, overrides).find((b) => b.hex === target) ?? boxes.find((b) => b.hex === target) ?? null;
  }, [target, boxes, overrides]);
  if (!box) return null;
  const lift = LAYER_META[box.layer].order * explode * 1.45;
  const meta = kindMeta(box.kind);
  return (
    <group>
      <mesh position={[box.x, box.y + lift, box.z]} scale={[box.w * 1.02, box.h * 1.02, box.d * 1.02]} raycast={() => {}}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#e8e4dc" wireframe transparent opacity={hex === box.hex ? 0.9 : 0.45} depthTest={false} />
      </mesh>
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

function LayerTags() {
  const explode = useBim((s) => s.explode);
  const boxes = useBim((s) => s.result.boxes);
  const visible = useBim((s) => s.visible);
  const sequenceOn = useBim((s) => s.sequenceOn);
  const seqT = useBim((s) => s.seqT);
  const show = useBim((s) => s.showLabels);
  if (!show || explode < 0.12) return null;
  const tags = [];
  for (const id of LAYER_IDS) {
    if (!layerIsOn({ visible, sequenceOn, seqT }, id)) continue;
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
  const placeMode = useBim((s) => s.placeMode);
  const placeAt = useBim((s) => s.placeAt);

  const batches = useMemo(() => {
    const list = batchBoxes(resolveBoxes(result.boxes, overrides));
    list.sort((a, b) => b.opacity - a.opacity);
    return list;
  }, [result, overrides]);

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
      <Selected />
      <LayerTags />
      <CustomLayer plane={plane} />
    </group>
  );
}

function Lights() {
  const { gl, scene } = useThree();
  const style = useBim((s) => s.renderStyle);

  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = style === "dusk" ? 0.92 : style === "overcast" ? 1.14 : 1.08;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    scene.fog = new THREE.Fog(style === "dusk" ? "#1a1418" : style === "overcast" ? "#8a9198" : "#0c0d0f", 48, 140);
    scene.background = new THREE.Color(style === "dusk" ? "#1a1418" : style === "overcast" ? "#9aa3aa" : "#0c0d0f");
    return () => {
      scene.fog = null;
    };
  }, [gl, scene, style]);

  const sun =
    style === "dusk"
      ? { pos: [32, 7, 10] as const, intensity: 2.15, color: "#f0a060" }
      : style === "overcast"
        ? { pos: [6, 42, 8] as const, intensity: 0.55, color: "#d8e0e8" }
        : { pos: [24, 36, 16] as const, intensity: 2.35, color: "#fff4e4" };

  return (
    <>
      <hemisphereLight
        args={
          style === "dusk"
            ? ["#8a6a88", "#2a221c", 0.55]
            : ["#c5d0d8", "#3a322b", style === "overcast" ? 1.15 : 0.62]
        }
      />
      <ambientLight intensity={style === "overcast" ? 0.48 : 0.18} />
      <directionalLight
        position={[...sun.pos]}
        intensity={sun.intensity}
        color={sun.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00022}
        shadow-normalBias={0.03}
        shadow-camera-near={2}
        shadow-camera-far={90}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
      />
      <directionalLight position={[-18, 12, -14]} intensity={style === "dusk" ? 0.18 : 0.42} color="#8a9aa8" />
      <Environment preset={style === "dusk" ? "sunset" : style === "overcast" ? "warehouse" : "city"} environmentIntensity={style === "studio" ? 0.42 : 0.55} />
      {style !== "studio" ? (
        <Sky
          sunPosition={style === "dusk" ? [20, 1.6, -6] : [4, 16, 10]}
          turbidity={style === "dusk" ? 8 : 14}
          rayleigh={style === "dusk" ? 2.6 : 0.9}
          mieCoefficient={0.006}
          mieDirectionalG={0.82}
        />
      ) : null}
    </>
  );
}

function Post() {
  const mobile = typeof window !== "undefined" && window.innerWidth < 720;
  return (
    <EffectComposer multisampling={0} enableNormalPass={!mobile}>
      {mobile ? null : <N8AO aoRadius={0.45} intensity={1.35} distanceFalloff={1.1} screenSpaceRadius />}
      <Bloom luminanceThreshold={1.2} intensity={0.16} mipmapBlur />
      <Vignette offset={0.28} darkness={0.46} />
      <SMAA />
    </EffectComposer>
  );
}

export function BuildingCanvas() {
  const selectHex = useBim((s) => s.selectHex);
  const selectCustom = useBim((s) => s.selectCustom);
  const result = useBim((s) => s.result);
  const section = useBim((s) => s.section);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 80), []);
  const maxY = result.bounds.max[1];
  const minY = result.bounds.min[1];
  plane.constant = minY + section * (maxY - minY + 1.2);

  return (
    <div className="absolute inset-0 bg-ink touch-none">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false }}
        camera={{ position: [18, 10, -16], fov: 38, near: 0.12, far: 240 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0c0d0f", 1);
          gl.localClippingEnabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        onPointerMissed={() => {
          selectHex(null);
          selectCustom(null);
        }}
      >
        <SoftShadows size={22} samples={10} focus={0.45} />
        <Lights />
        <InteriorLights />
        <SequenceDriver />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.02}
          minDistance={4}
          maxDistance={90}
          target={[0, 2.4, -2]}
        />
        <FitCamera />
        <Building plane={plane} />
        <ContactShadows position={[0, -0.09, 0]} opacity={0.48} scale={56} blur={2.4} far={14} color="#050506" />
        <Post />
      </Canvas>
    </div>
  );
}
