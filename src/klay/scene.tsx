import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { detectLiteGpu } from "@/lib/bim/gpu";
import { mapsFor } from "@/lib/bim/textures";
import { applyCamera, bindWalkKeys, createWalkState, installControlsTest, look, stepWalk, type WalkState } from "./walker";
import { buildSolaceUnit, type KlayMesh } from "./unit";

function matFor(s: KlayMesh, lite: boolean, ghost: boolean) {
  const maps = mapsFor(s.proc === "glass" ? "plaster" : s.proc, s.hex);
  const opacity = ghost ? Math.min(s.opacity, 0.16) : s.opacity;
  if (lite) {
    return new THREE.MeshLambertMaterial({
      color: s.hex,
      map: opacity < 0.9 ? null : maps?.albedo ?? null,
      transparent: opacity < 0.95,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: opacity >= 0.95,
      emissive: s.emissive ? new THREE.Color(s.emissive) : new THREE.Color(0),
      emissiveIntensity: s.emissive ? 1.4 : 0,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: s.hex,
    roughness: s.roughness,
    metalness: s.metalness,
    transparent: opacity < 0.95,
    opacity,
    map: s.proc === "glass" ? null : maps?.albedo ?? null,
    normalMap: s.proc === "glass" ? null : maps?.normal ?? null,
    side: THREE.DoubleSide,
    emissive: s.emissive ? new THREE.Color(s.emissive) : new THREE.Color(0),
    emissiveIntensity: s.emissive ? 1.8 : 0,
    envMapIntensity: 0.9,
  });
}

function Piece({ s, lite, ghost }: { s: KlayMesh; lite: boolean; ghost: boolean }) {
  const material = useMemo(() => matFor(s, lite, ghost), [s, lite, ghost]);
  return <mesh geometry={s.geometry} material={material} />;
}

function LatticeNet({ dots, segs }: { dots: THREE.Vector3[]; segs: number[] }) {
  const pointsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(dots);
    return g;
  }, [dots]);
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (let i = 0; i < segs.length; i += 2) {
      const a = dots[segs[i]!];
      const b = dots[segs[i + 1]!];
      if (!a || !b) continue;
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [dots, segs]);
  return (
    <>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#7EE0C8" transparent opacity={0.55} />
      </lineSegments>
      <points geometry={pointsGeo}>
        <pointsMaterial color="#F5C542" size={0.055} sizeAttenuation />
      </points>
    </>
  );
}

function Rig({ state, dusk, iso }: { state: WalkState; dusk: boolean; iso: boolean }) {
  const cam = useThree((t) => t.camera);
  useFrame((_, dt) => {
    if (iso) {
      cam.position.set(6.4, 4.8, 1.15);
      cam.lookAt(0.1, 1.05, 7.2);
      cam.rotation.z = 0;
    } else {
      stepWalk(state, dt);
      applyCamera(cam, state);
    }
  });
  return (
    <>
      <hemisphereLight args={[dusk ? "#c9a070" : "#c5d2dc", dusk ? "#2a241c" : "#5a6058", dusk ? 0.35 : 0.45]} />
      <directionalLight
        position={dusk ? [8, 9, -6] : [4, 14, 4]}
        intensity={dusk ? 1.35 : 0.95}
        color={dusk ? "#ffb060" : "#f2f0ea"}
      />
      <pointLight position={[0.2, 2.4, 3.4]} intensity={dusk ? 1.8 : 0.7} color="#f4e2c0" distance={8} />
      <pointLight position={[-2.4, 2.5, 9.2]} intensity={dusk ? 1.6 : 0.6} color="#f0d8a8" distance={7} />
      <Sky
        sunPosition={dusk ? [6, 1.1, -8] : [2, 8, 4]}
        mieCoefficient={dusk ? 0.008 : 0.004}
        rayleigh={dusk ? 2.4 : 1.1}
        turbidity={dusk ? 8 : 3}
      />
    </>
  );
}

function World({ lite, dusk, showDots }: { lite: boolean; dusk: boolean; showDots: boolean }) {
  const unit = useMemo(() => buildSolaceUnit(), []);
  const state = useMemo(() => createWalkState(unit.spawn), [unit.spawn]);
  const gl = useThree((t) => t.gl);

  useEffect(() => {
    installControlsTest(state);
    const unbind = bindWalkKeys();
    const onMove = (e: MouseEvent) => {
      if (!state.locked || showDots) return;
      look(state, e.movementX, e.movementY);
    };
    const onLock = () => {
      state.locked = document.pointerLockElement === gl.domElement;
    };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      unbind();
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", onLock);
    };
  }, [state, gl, showDots]);

  return (
    <>
      <Rig state={state} dusk={dusk} iso={showDots} />
      <fog attach="fog" args={[dusk ? "#6a5340" : "#c5d0d8", 22, 48]} />
      {unit.meshes.map((s, i) => (
        <Piece key={`${s.kind}-${i}`} s={s} lite={lite} ghost={showDots} />
      ))}
      {showDots ? <LatticeNet dots={unit.dots} segs={unit.segs} /> : null}
    </>
  );
}

export function KlayCanvas({ dusk, showDots }: { dusk: boolean; showDots: boolean }) {
  const [lite, setLite] = useState(true);
  return (
    <Canvas
      shadows={!lite}
      dpr={[1, 1.5]}
      camera={{ fov: 52, near: 0.08, far: 80, position: [6.4, 4.8, 1.15] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      onCreated={({ gl }) => {
        const soft = detectLiteGpu(gl);
        setLite(soft);
        gl.toneMappingExposure = dusk ? 0.92 : 0.85;
        gl.domElement.addEventListener("click", () => {
          if (!showDots) void gl.domElement.requestPointerLock();
        });
      }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
    >
      <color attach="background" args={[dusk ? "#1c1814" : "#9aafbc"]} />
      <World lite={lite} dusk={dusk} showDots={showDots} />
    </Canvas>
  );
}