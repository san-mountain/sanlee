"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Human, Tap, type TapFn } from "./parts";
import { player } from "./Player";
import { CITY, type Interactable } from "./zones";
import { resolve } from "./collide";

// 복원된 산: 방공호에서는 동상 주위를 거닐고, 지상에서는 방문자 곁을 따라 걷는다
const PATH: [number, number][] = [
  [-3.8, 5.2],
  [3.8, 5.2],
  [4.2, -6.5],
  [-4.2, -6.5],
];

export default function SanNPC({ mode, item, onTap, start, beside }: { mode: "wander" | "follow"; item: Interactable; onTap: TapFn; start: [number, number]; beside?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const st = useRef({ x: start[0], z: start[1], wp: 0, yaw: 0, bob: 0 });
  useFrame((s, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = ref.current;
    if (!g) return;
    const S = st.current;
    const dp = Math.hypot(player.pos.x - S.x, player.pos.z - S.z);
    let tx = S.x;
    let tz = S.z;
    let speed = 1.3;
    if (mode === "follow" && beside) {
      // 결말: 방문자 앞쪽 옆에 와서 마주 선다
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      tx = player.pos.x - sin * 1.7 + cos * 0.6;
      tz = player.pos.z - cos * 1.7 - sin * 0.6;
      speed = 2.4;
    } else if (mode === "follow") {
      // 목줄처럼 따라온다: 3m 넘게 멀어질 때만 다가오고, 가까우면 멈춰서 방문자를 바라본다.
      // 그래서 돌아서면 언제든 마주할 수 있다.
      if (dp > 3.2 || S.wp === 1) {
        S.wp = dp > 2.2 ? 1 : 0;
        const k = 2.0 / Math.max(dp, 0.001);
        tx = player.pos.x + (S.x - player.pos.x) * k;
        tz = player.pos.z + (S.z - player.pos.z) * k;
        speed = Math.min(6.5, 1.6 + dp * 0.9);
      }
      // 너무 멀어지면 (다른 길로 돌아갔을 때) 가까이 다시 나타난다
      if (dp > 16) {
        S.x = player.pos.x + Math.sin(player.yaw) * 2.5;
        S.z = player.pos.z + Math.cos(player.yaw) * 2.5;
      }
    } else if (dp > 3) {
      const [wx, wz] = PATH[S.wp];
      tx = wx;
      tz = wz;
      if (Math.hypot(wx - S.x, wz - S.z) < 0.3) S.wp = (S.wp + 1) % PATH.length;
    }
    const dx = tx - S.x;
    const dz = tz - S.z;
    const d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 0.15) {
      const step = Math.min(d, speed * dt);
      const p = { x: S.x + (dx / d) * step, z: S.z + (dz / d) * step };
      if (mode === "follow") resolve(p, 0.35, CITY.bounds, CITY.boxes, CITY.circles);
      S.x = p.x;
      S.z = p.z;
      S.yaw = Math.atan2(dx, dz);
      moving = true;
      S.bob += step * 5;
    } else if (dp < 6 || beside) {
      S.yaw = Math.atan2(player.pos.x - S.x, player.pos.z - S.z);
    }
    g.position.set(S.x, moving ? Math.abs(Math.sin(S.bob)) * 0.05 : 0, S.z);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, S.yaw, 0.15);
    item.pos.set(S.x, 1.5, S.z);
  });
  return (
    <Tap id={item.id} onTap={onTap}>
      <group ref={ref}>
        <Human position={[0, 0, 0]} color="#22303f" skin="#d9b9a0" hood="#16161a">
          {/* 동상에서 돌아온 네 가지 색 */}
          <mesh position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.04, 8, 18]} />
            <meshStandardMaterial color="#ff2bd6" emissive="#ff2bd6" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 1.2, 0.125]} scale={[1, 1, 0.3]}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshBasicMaterial color="#22f0ff" toneMapped={false} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} position={[k * 0.25, 0.88, 0]}>
              <torusGeometry args={[0.05, 0.012, 6, 12]} />
              <meshBasicMaterial color="#a77bff" toneMapped={false} />
            </mesh>
          ))}
          {[-1, 1].map((k) => (
            <mesh key={k} position={[k * 0.085, 0.05, 0.04]}>
              <boxGeometry args={[0.11, 0.04, 0.23]} />
              <meshBasicMaterial color="#ffe14d" toneMapped={false} />
            </mesh>
          ))}
        </Human>
        <pointLight position={[0, 2, 0]} intensity={2.5} distance={4} color="#ffd6f4" />
      </group>
    </Tap>
  );
}
