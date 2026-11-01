"use client";

import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import type { SectionId } from "@/data/site";
import City from "./City";
import Landmark from "./Landmark";
import Statue from "./Statue";
import { LANDMARKS, SPAWN, STATUE_VIEW, viewFor, type Focus } from "./layout";
import Labels, { type Anchor, type LabelEls } from "./Labels";

const { ACTION } = CameraControlsImpl;

type Props = {
  focus: Focus;
  visited: SectionId[];
  onSelectSection: (id: SectionId) => void;
  onSelectStatue: () => void;
  onReady?: () => void;
  labelEls: LabelEls;
};

export const ANCHORS: Anchor[] = [
  ...LANDMARKS.map((l) => {
    const len = Math.hypot(l.pos[0], l.pos[2]);
    // 건물 정면(광장 쪽) 위에 붙는 간판
    return {
      key: l.id,
      pos: [l.pos[0] - (l.pos[0] / len) * 3.4, l.height * 0.72, l.pos[2] - (l.pos[2] / len) * 3.4] as [number, number, number],
      scaleAt: 22,
    };
  }),
  { key: "popup", pos: [2.3, 6.1, 0.9], scaleAt: 7, maxScale: 0.9 },
  { key: "plaque", pos: [0, 0.55, 1.95], scaleAt: 14, maxScale: 1.2 },
];

// 세로 화면(휴대폰)에서는 시야각을 넓혀 건물 세 채가 다 보이게
function ResponsiveFov() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    camera.fov = aspect < 0.8 ? 72 : aspect < 1.2 ? 62 : 52;
    camera.updateProjectionMatrix();
  }, [aspect, camera]);
  return null;
}

function Rig({ focus }: { focus: Focus }) {
  const ref = useRef<CameraControls>(null);
  const first = useRef(true);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let v = SPAWN;
    if (focus === "statue") v = STATUE_VIEW;
    else if (focus !== "spawn") {
      const l = LANDMARKS.find((x) => x.id === focus)!;
      v = viewFor(l.pos, l.height);
    }
    c.setLookAt(...v.pos, ...v.target, !first.current);
    first.current = false;
  }, [focus]);
  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={3}
      maxDistance={38}
      maxPolarAngle={Math.PI * 0.49}
      smoothTime={0.6}
      draggingSmoothTime={0.15}
      mouseButtons={{ left: ACTION.ROTATE, middle: ACTION.DOLLY, right: ACTION.NONE, wheel: ACTION.DOLLY }}
      touches={{ one: ACTION.TOUCH_ROTATE, two: ACTION.TOUCH_DOLLY, three: ACTION.NONE }}
    />
  );
}

export default function World({ focus, visited, onSelectSection, onSelectStatue, onReady, labelEls }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 55, near: 0.1, far: 220, position: SPAWN.pos }}
      onCreated={() => onReady?.()}
    >
      <color attach="background" args={["#07030f"]} />
      <fog attach="fog" args={["#07030f", 24, 110]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#8a5cff", "#07030f", 0.6]} />
      <pointLight position={[0, 9, 6]} intensity={70} color="#e8e4f4" distance={30} />
      <pointLight position={[-14, 6, -6]} intensity={50} color="#ff2bd6" distance={30} />
      <pointLight position={[14, 6, -6]} intensity={40} color="#ffe14d" distance={28} />

      <City />
      {LANDMARKS.map((l) => (
        <Landmark
          key={l.id}
          id={l.id}
          pos={l.pos}
          height={l.height}
          color={l.color}
          visited={visited.includes(l.id)}
          onSelect={onSelectSection}
        />
      ))}
      <Statue
        restored={visited.length}
        onSelect={onSelectStatue}
      />
      <Labels anchors={ANCHORS} els={labelEls} />
      <ResponsiveFov />
      <Rig focus={focus} />
    </Canvas>
  );
}
