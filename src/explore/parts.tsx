"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { citizenGeometry, visorGeometry } from "./models";
import { signTexture } from "./textures";
import { addRim } from "./rim";

export type TapFn = (id: string) => void;

// 끌어서 둘러보다 손을 뗀 경우는 무시하고, 짧게 누른 것만 '탭'으로 처리
export function Tap({ id, onTap, children }: { id: string; onTap: TapFn; children: ReactNode }) {
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8) return;
        e.stopPropagation();
        onTap(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

export function useSign(...args: Parameters<typeof signTexture>) {
  const key = JSON.stringify(args);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tex = useMemo(() => signTexture(...args), [key]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

// 한 사람 (NPC용). 숨쉬듯 아주 조금 움직인다.
export function Human({
  color = "#3a3d46",
  skin = "#b9b2ac",
  visor,
  hood,
  position,
  rotationY = 0,
  phase = 0,
  children,
}: {
  color?: string;
  skin?: string;
  visor?: string;
  hood?: string;
  position: [number, number, number];
  rotationY?: number;
  phase?: number;
  children?: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const geo = citizenGeometry();
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime + phase;
    ref.current.scale.y = 1 + Math.sin(t * 1.4) * 0.006;
    ref.current.rotation.z = Math.sin(t * 0.7) * 0.012;
  });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group ref={ref}>
        <mesh geometry={geo}>
          <meshStandardMaterial ref={(m) => void (m && addRim(m))} color={color} roughness={0.85} />
        </mesh>
        {/* 얼굴과 손은 피부색으로 덧씌움 */}
        <mesh position={[0, 1.62, 0.004]} scale={[0.93, 1.13, 1.01]}>
          <sphereGeometry args={[0.115, 16, 12]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {hood && (
          <mesh position={[0, 1.66, -0.01]} scale={[1.08, 1.12, 1.1]}>
            <sphereGeometry args={[0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={hood} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        )}
        {visor && (
          <mesh geometry={visorGeometry()}>
            <meshBasicMaterial color={visor} toneMapped={false} />
          </mesh>
        )}
        {children}
      </group>
    </group>
  );
}
