"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Human, Tap, type TapFn } from "./parts";
import { player } from "./Player";
import { CITY, type Interactable } from "./zones";
import { resolve } from "./collide";
import { coverState } from "./Jabi";
import { walkBlock } from "./gaze";

// 지상에서 이산이 잠깐 먼저 가서 기다리는 자리 (ExploreClient가 정하고, 방문자가 그 자리를 지나 북쪽으로 가면 풀린다)
// cover: 기대고 있는 엄폐물(COVERS 번호, 없으면 -1). 그 엄폐물이 부서지면 기다림을 풀고 다시 따라온다
// manual: 저절로 풀리지 않는다 (광장의 드론 길처럼 ExploreClient가 직접 풀어 준다). speed: 걸음 빠르기.
// snap: 다음 프레임에 그 자리로 곧장 옮긴다 (화면이 어두워진 재시작 때만)
export const sanHold: { at: { x: number; z: number; cover: number; manual?: boolean; speed?: number; snap?: boolean } | null } = { at: null };

// 복원된 산: 방공호에서는 동상 주위를 거닐고, 지상에서는 방문자 곁을 따라 걷는다
const PATH: [number, number][] = [
  [-3.8, 5.2],
  [3.8, 5.2],
  [4.2, -6.5],
  [-4.2, -6.5],
];

export default function SanNPC({ mode, item, onTap, start, beside, stay, at }: { mode: "wander" | "follow"; item: Interactable; onTap: TapFn; start: [number, number]; beside?: boolean; stay?: boolean; at?: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const st = useRef({ x: start[0], z: start[1], wp: 0, yaw: 0, bob: 0 });
  // 이산이 사라지면(다시 시작 등) 상호작용 위치를 원래 자리로 되돌린다. 안 그러면 동상에게 말을 걸 수 없다.
  useEffect(() => {
    const home = item.pos.clone();
    return () => {
      item.pos.copy(home);
    };
  }, [item]);
  useFrame((s, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = ref.current;
    if (!g) return;
    const S = st.current;
    const dp = Math.hypot(player.pos.x - S.x, player.pos.z - S.z);
    let tx = S.x;
    let tz = S.z;
    let speed = 1.3;
    if (at) {
      // 결말: 정해진 자리로 천천히 걸어가 서서 정해진 쪽을 본다 (충돌 무시: 다리 위 승강장 앞에서만 쓴다)
      const ax = at[0] - S.x;
      const az = at[1] - S.z;
      const ad = Math.hypot(ax, az);
      const walking = ad > 0.05;
      if (walking) {
        const st = Math.min(ad, 1.4 * dt);
        S.x += (ax / ad) * st;
        S.z += (az / ad) * st;
        S.bob += st * 5;
      }
      S.yaw = ad > 0.4 ? Math.atan2(ax, az) : at[2];
      g.position.set(S.x, walking ? Math.abs(Math.sin(S.bob)) * 0.05 : 0, S.z);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, S.yaw, 0.12);
      item.pos.set(S.x, 1.5, S.z);
      return;
    }
    if (stay) {
      // 수락 결말: 이산은 줄 밖에 남아 배웅한다
    } else if (mode === "follow" && beside) {
      // 결말: 방문자 앞쪽 옆에 와서 마주 선다
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      tx = player.pos.x - sin * 1.7 + cos * 0.6;
      tz = player.pos.z - cos * 1.7 - sin * 0.6;
      speed = Math.max(2.4, dp * 1.4);
    } else if (mode === "follow" && sanHold.at) {
      // 대자비의 첫 시선: 엄폐물 뒤 자리로 가서 방문자를 기다린다. 방문자가 그 자리를 지나 앞으로 나가면 다시 따라온다
      const h = sanHold.at;
      if (h.snap) {
        h.snap = false;
        S.x = h.x;
        S.z = h.z;
      }
      tx = h.x;
      tz = h.z;
      speed = h.speed ?? 3.4;
      if (!h.manual && (player.pos.z < h.z - 5 || (h.cover >= 0 && !coverState[h.cover]?.alive))) sanHold.at = null;
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
      if (mode === "follow" && !beside) {
        resolve(p, 0.35, CITY.bounds, CITY.boxes, CITY.circles);
        if (walkBlock.boxes.length) resolve(p, 0.35, CITY.bounds, walkBlock.boxes, []);
      }
      S.x = p.x;
      S.z = p.z;
      S.yaw = Math.atan2(dx, dz);
      moving = true;
      S.bob += step * 5;
    } else if (dp < 6 || beside || stay) {
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
