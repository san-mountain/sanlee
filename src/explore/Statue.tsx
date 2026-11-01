"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { isTap } from "./Landmark";

const GREY = new THREE.Color("#a6a3ad");
const STONE_EMISSIVE = new THREE.Color("#000000");

type Part = "head" | "torso" | "arms" | "legs";
const RESTORE_AT: Record<Part, number> = { head: 1, torso: 2, arms: 3, legs: 3 };
const COLORS: Record<Part, string> = { head: "#ff2bd6", torso: "#22f0ff", arms: "#a77bff", legs: "#ffe14d" };

// 회색으로 굳은 상태에서 방문한 건물 수만큼 부위별로 색이 돌아오는 재질
function usePartMaterial(part: Part, restored: number) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: GREY, flatShading: true, roughness: 0.8 }), []);
  const target = restored >= RESTORE_AT[part];
  const tColor = useMemo(() => new THREE.Color(COLORS[part]), [part]);
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.5);
    mat.color.lerp(target ? tColor.clone().multiplyScalar(0.55) : GREY, k);
    mat.emissive.lerp(target ? tColor : STONE_EMISSIVE, k);
    mat.emissiveIntensity = target ? 0.55 : 0;
  });
  return mat;
}

function Cookie() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.8;
    ref.current.position.y = 4.55 + Math.sin(s.clock.elapsedTime * 1.6) * 0.08;
  });
  const chips = useMemo(
    () => [
      [0.18, 0.09, 0.1],
      [-0.2, 0.09, -0.05],
      [0.02, 0.09, -0.22],
      [-0.05, -0.09, 0.2],
      [0.15, -0.09, -0.15],
    ] as [number, number, number][],
    []
  );
  return (
    <group ref={ref} position={[1.55, 4.55, 0.9]} rotation={[0, 0, 0]}>
      <group rotation={[Math.PI / 2.4, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.42, 0.14, 14]} />
          <meshStandardMaterial color="#c8873a" flatShading emissive="#5a3510" emissiveIntensity={0.4} />
        </mesh>
        {chips.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.055, 6, 4]} />
            <meshStandardMaterial color="#2b170b" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

type Props = {
  restored: number; // 0~4
  onSelect: () => void;
};

export default function Statue({ restored, onSelect }: Props) {
  const body = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const head = usePartMaterial("head", restored);
  const torso = usePartMaterial("torso", restored);
  const arms = usePartMaterial("arms", restored);
  const legs = usePartMaterial("legs", restored);
  const complete = restored >= 3;

  // 완전히 복원되기 전에는 가끔 지직거림
  useFrame((s) => {
    if (!body.current) return;
    const t = s.clock.elapsedTime;
    const glitch = !complete && Math.sin(t * 13.7) > 0.985 - restored * 0.004;
    body.current.position.x = glitch ? (Math.random() - 0.5) * 0.18 : 0;
    body.current.scale.x = glitch ? 1 + (Math.random() - 0.5) * 0.08 : 1;
    if (complete) body.current.rotation.y = Math.sin(t * 0.5) * 0.08;
  });

  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!isTap(e)) return;
        e.stopPropagation();
        onSelect();
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
      {/* 받침대 */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.6, 1.9, 1, 8]} />
        <meshStandardMaterial color="#25203a" flatShading emissive="#22f0ff" emissiveIntensity={hover ? 0.12 : 0.03} />
      </mesh>
      <mesh position={[0, 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.45, 1.6, 8]} />
        <meshBasicMaterial color="#22f0ff" toneMapped={false} />
      </mesh>

      <group ref={body} position={[0, 1, 0]}>
        {/* 다리 */}
        <mesh position={[-0.28, 0.75, 0]} material={legs}>
          <boxGeometry args={[0.38, 1.5, 0.42]} />
        </mesh>
        <mesh position={[0.28, 0.75, 0.1]} rotation={[-0.12, 0, 0]} material={legs}>
          <boxGeometry args={[0.38, 1.5, 0.42]} />
        </mesh>
        {/* 몸통 */}
        <mesh position={[0, 2.15, 0]} material={torso}>
          <boxGeometry args={[1.05, 1.35, 0.6]} />
        </mesh>
        {/* 팔: 왼팔은 축 늘어지고, 오른팔은 쿠키를 향해 손바닥을 내밀며 '거부' */}
        <mesh position={[-0.68, 2.05, 0]} rotation={[0, 0, -0.12]} material={arms}>
          <boxGeometry args={[0.28, 1.25, 0.32]} />
        </mesh>
        <group position={[0.62, 2.7, 0]} rotation={[-0.55, 0, -1.05]}>
          <mesh position={[0, 0.6, 0]} material={arms}>
            <boxGeometry args={[0.28, 1.2, 0.32]} />
          </mesh>
          {/* 손바닥 */}
          <mesh position={[0, 1.32, 0]} material={head}>
            <boxGeometry args={[0.42, 0.34, 0.1]} />
          </mesh>
        </group>
        {/* 머리: 쿠키 반대쪽으로 고개를 돌림 */}
        <mesh position={[-0.05, 3.25, 0]} rotation={[0.1, -0.5, 0.08]} material={head}>
          <icosahedronGeometry args={[0.46, 0]} />
        </mesh>
      </group>

      <Cookie />


    </group>
  );
}
