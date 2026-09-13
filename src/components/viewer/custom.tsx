import { Html, TransformControls } from "@react-three/drei";
import { useLoader, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { getLibraryFile, parseJsonBoxes, type CustomItem } from "@/lib/bim/library";
import { layerIsOn, useBim } from "@/lib/bim/store";
import { materialFor } from "@/lib/bim/triplanar";
import { LAYER_META } from "@/lib/bim/types";

function useObjectUrl(id: string, visible: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    let revoke: string | null = null;
    let live = true;
    void getLibraryFile(id).then((blob) => {
      if (!live || !blob) return;
      const u = URL.createObjectURL(blob);
      revoke = u;
      setUrl(u);
    });
    return () => {
      live = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [id, visible]);
  return url;
}

function GltfItem({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);
  useEffect(() => {
    scene.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }, [scene]);
  return <primitive object={scene} />;
}

function ObjItem({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  const scene = useMemo(() => obj.clone(true), [obj]);
  useEffect(() => {
    scene.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        if (!m.material) m.material = new THREE.MeshStandardMaterial({ color: "#c9a06a", roughness: 0.6 });
      }
    });
  }, [scene]);
  return <primitive object={scene} />;
}

function ImageItem({ url }: { url: string }) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh castShadow receiveShadow>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial map={tex} roughness={0.55} metalness={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}

function JsonItem({ url, plane }: { url: string; plane: THREE.Plane }) {
  const [boxes, setBoxes] = useState<ReturnType<typeof parseJsonBoxes> | null>(null);
  useEffect(() => {
    let live = true;
    void fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (!live) return;
        setBoxes(parseJsonBoxes(t));
      })
      .catch(() => {
        if (live) setBoxes([]);
      });
    return () => {
      live = false;
    };
  }, [url]);
  if (!boxes) return null;
  return (
    <group>
      {boxes.map((b, i) => {
        const matId = b.matId ?? "timber-spf";
        const mat = materialFor(matId, plane);
        return (
          <mesh key={i} position={[b.x, b.y, b.z]} scale={[b.w, b.h, b.d]} castShadow receiveShadow material={mat}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
}

function CustomBody({ item, url, plane }: { item: CustomItem; url: string; plane: THREE.Plane }) {
  if (item.ext === "gltf") return <GltfItem url={url} />;
  if (item.ext === "obj") return <ObjItem url={url} />;
  if (item.ext === "image") return <ImageItem url={url} />;
  if (item.ext === "json") return <JsonItem url={url} plane={plane} />;
  return null;
}

function Placed({ item, plane }: { item: CustomItem; plane: THREE.Plane }) {
  const on = useBim((s) => layerIsOn(s, item.layer));
  const explode = useBim((s) => s.explode);
  const selected = useBim((s) => s.selectedCustomId === item.id);
  const select = useBim((s) => s.selectCustom);
  const update = useBim((s) => s.updateCustom);
  const showLabels = useBim((s) => s.showLabels);
  const url = useObjectUrl(item.id, item.visible && on);
  const lift = LAYER_META[item.layer].order * explode * 1.45;

  if (!item.visible || !on || !url) return null;

  const onDown = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    select(item.id);
  };

  const group = (
    <group
      position={[item.x, item.y + lift, item.z]}
      rotation={[item.rx, item.ry, item.rz]}
      scale={[item.sx, item.sy, item.sz]}
      onPointerDown={onDown}
    >
      <CustomBody item={item} url={url} plane={plane} />
      {showLabels && selected ? (
        <Html center sprite distanceFactor={14} style={{ pointerEvents: "none" }}>
          <div className="rounded-md bg-ink-elevated/95 px-2 py-1 font-mono text-[10px] whitespace-nowrap text-paper shadow-[var(--shadow-border)]">
            {item.name} · {LAYER_META[item.layer].phase}
          </div>
        </Html>
      ) : null}
    </group>
  );

  if (!selected) return group;
  return (
    <TransformControls
      mode="translate"
      onMouseUp={(e) => {
        const obj = (e as unknown as { target?: { object?: THREE.Object3D } }).target?.object;
        if (!obj) return;
        update(item.id, { x: obj.position.x, y: obj.position.y - lift, z: obj.position.z });
      }}
    >
      {group}
    </TransformControls>
  );
}

export function CustomLayer({ plane }: { plane: THREE.Plane }) {
  const items = useBim((s) => s.customItems);
  if (items.length === 0) return null;
  return (
    <group>
      {items.map((item) => (
        <Placed key={item.id} item={item} plane={plane} />
      ))}
    </group>
  );
}
