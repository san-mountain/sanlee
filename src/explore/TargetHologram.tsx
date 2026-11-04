"use client";
import { Billboard } from "@react-three/drei";
import type { Interactable } from "./zones";

// 가벼운 월드 좌표 홀로그램: 연결선이나 DOM 업데이트를 사용하지 않는다.
export default function TargetHologram({ target }: { target: Interactable }) {
  const y = target.pos.y + (target.kind === "door" || target.kind === "checkpoint" ? 1.2 : 0.45);
  return (
    <group position={[target.pos.x, y, target.pos.z]}>
      <Billboard follow>
        <mesh>
          <ringGeometry args={[0.18, 0.205, 32]} />
          <meshBasicMaterial color="#22f0ff" transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.265, 0.28, 32, 1, Math.PI * 0.18, Math.PI * 1.64]} />
          <meshBasicMaterial color="#9ff8ff" transparent opacity={0.45} depthWrite={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.035, 16]} />
          <meshBasicMaterial color="#c8fdff" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}
