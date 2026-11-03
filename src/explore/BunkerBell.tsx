"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Lang } from "@/data/site";
import { Tap, useSign, type TapFn } from "./parts";
import { BUNKER_BELL } from "./zones";
import { protection } from "./recordProtection";

// 지상 범종각과 같은 종 단면을 사용한다. 보호는 소리가 아니라 별도의 장치 작동으로 켜진다.
export default function BunkerBell({ lang, onTap }: { lang: Lang; onTap: TapFn }) {
  const bell = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => new THREE.LatheGeometry(
    [[0, 2.2], [0.35, 2.2], [0.55, 2], [0.62, 1.4], [0.7, 0.6], [0.86, 0.1], [0.9, 0], [0.8, 0]]
      .map(([r, y]) => new THREE.Vector2(r, y)), 28), []);
  const sign = useSign(
    [[lang === "ko" ? "범종 · 기록 보호 장치" : "BELL · RECORD PROTECTION", 1]],
    { color: "#d8d2c0", w: 1024, h: 160 },
  );
  useFrame(() => {
    const state = protection.snapshot();
    const elapsed = state.startedAt === null ? Infinity : (state.endsAt! - state.remainingMs - state.startedAt) / 1000;
    if (bell.current) bell.current.rotation.z = state.active ? Math.sin(elapsed * 6) * 0.045 * Math.exp(-elapsed * 0.8) : 0;
    if (lamp.current) lamp.current.color.set(state.active ? "#82efce" : "#a89c79");
  });
  return (
    <Tap id="record-bell" onTap={onTap}>
      <group position={BUNKER_BELL.pos}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[2.3, 0.3, 1.8]} />
          <meshStandardMaterial color="#625c50" roughness={0.9} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side, 1.7, 0]}>
            <boxGeometry args={[0.16, 2.8, 0.2]} />
            <meshStandardMaterial color="#713f2b" roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, 3.1, 0]}>
          <boxGeometry args={[2.3, 0.2, 0.3]} />
          <meshStandardMaterial color="#713f2b" roughness={0.7} />
        </mesh>
        <group ref={bell} position={[0, 2.9, 0]}>
          <mesh geometry={geometry} position={[0, -1.65, 0]} scale={0.7}>
            <meshStandardMaterial color="#6e5932" metalness={0.85} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <mesh position={[0.65, 1.65, 0.55]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 1.2, 10]} />
          <meshStandardMaterial color="#725333" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.65, 0.92]}>
          <boxGeometry args={[0.7, 0.35, 0.12]} />
          <meshStandardMaterial color="#303a36" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.66, 1]}>
          <circleGeometry args={[0.07, 12]} />
          <meshBasicMaterial ref={lamp} color="#a89c79" toneMapped={false} />
        </mesh>
        <mesh position={[0, 3.6, 0]}>
          <planeGeometry args={[3.8, 0.6]} />
          <meshBasicMaterial map={sign} transparent />
        </mesh>
      </group>
    </Tap>
  );
}
