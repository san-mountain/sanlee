"use client";

import { useRef, useState } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { SectionId } from "@/data/site";
import type { Vec3 } from "./layout";

type Props = {
  id: SectionId;
  pos: Vec3;
  height: number;
  color: string;
  visited: boolean;
  onSelect: (id: SectionId) => void;
};

export function isTap(e: ThreeEvent<MouseEvent>) {
  return e.delta < 8; // 드래그로 둘러보다 손을 뗀 경우는 무시
}

export default function Landmark({ id, pos, height, color, visited, onSelect }: Props) {
  const ring = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const w = 6;

  useFrame((s) => {
    if (!ring.current) return;
    const k = 1 + Math.sin(s.clock.elapsedTime * 2.5) * 0.06;
    ring.current.scale.set(k, k, k);
  });

  // 광장 쪽을 바라보도록 회전
  const rotY = Math.atan2(-pos[0], -pos[2]);

  return (
    <group
      position={pos}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        if (!isTap(e)) return;
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
    >
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[w, height, w]} />
        <meshStandardMaterial color="#140b28" metalness={0.5} roughness={0.4} emissive={color} emissiveIntensity={hover ? 0.18 : 0.06} />
        <Edges color={color} />
      </mesh>
      {/* 네온 띠 */}
      {Array.from({ length: Math.floor(height / 2.5) }).map((_, i) => (
        <mesh key={i} position={[0, 1.6 + i * 2.5, w / 2 + 0.02]}>
          <planeGeometry args={[w * 0.8, 0.12]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={visited ? 1 : 0.55} />
        </mesh>
      ))}
      {/* 입구 바닥 링 */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, w / 2 + 2.2]}>
        <ringGeometry args={[1.1, 1.35, 40]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
