"use client";

import { runtime } from "./runtime";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Human, Tap, type TapFn } from "./parts";
import { player } from "./Player";
import { CITY, type Interactable } from "./zones";
import { resolve } from "./collide";
import { coverState } from "./Jabi";

// 지상에서 이산이 잠깐 먼저 가서 기다리는 자리 (ExploreClient가 정하고, 방문자가 그 자리를 지나 북쪽으로 가면 풀린다).
// 이 자리로 갈 때는 평소처럼 장애물을 피해 걷는다 (경유점 사이가 비어 있도록 ExploreClient가 점을 고른다)
// cover: 기대고 있는 엄폐물(COVERS 번호, 없으면 -1). 그 엄폐물이 부서지면 기다림을 풀고 다시 따라온다
// manual: 저절로 풀리지 않는다 (광장의 드론 길처럼 ExploreClient가 직접 풀어 준다). speed: 걸음 빠르기.
// snap: 다음 프레임에 그 자리로 곧장 옮긴다 (화면이 어두워진 재시작 때만)
export const sanHold: { at: { x: number; z: number; cover: number; manual?: boolean; speed?: number; snap?: boolean } | null } = { at: null };

// 정해진 길을 걷는 이산 (망원경 장면·결말): 미리 빈 자리만 이어 둔 점들을 차례로 걷고, 마지막 점에서 yaw 쪽을 본다.
// 길이 바뀌면 처음 점부터 다시 걷는다. 도착 여부는 sanWalk.arrived로 알린다 (ExploreClient가 도착을 기다린다)
export type SanPath = { pts: [number, number][]; yaw: number; speed?: number };
export const sanWalk: { arrived: boolean; path: SanPath | null } = { arrived: false, path: null };

// 복원된 산: 방공호에서는 동상 주위를 거닐고, 지상에서는 방문자 곁을 따라 걷는다
const PATH: [number, number][] = [
  [-3.8, 5.2],
  [3.8, 5.2],
  [4.2, -6.5],
  [-4.2, -6.5],
];

export default function SanNPC({ mode, item, onTap, start, path }: { mode: "wander" | "follow"; item: Interactable; onTap: TapFn; start: [number, number]; path?: SanPath }) {
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
    if (runtime.paused) return;
    const dt = Math.min(rawDt, 0.05);
    const g = ref.current;
    if (!g) return;
    const S = st.current;
    const dp = Math.hypot(player.pos.x - S.x, player.pos.z - S.z);
    let tx = S.x;
    let tz = S.z;
    let speed = 1.3;
    if (path) {
      // 정해진 길: 점을 하나씩 따라간다. 점 사이는 미리 장애물이 없도록 골라 둔 직선이다
      if (sanWalk.path !== path) {
        sanWalk.path = path;
        sanWalk.arrived = false;
        S.wp = 0;
      }
      const sp = path.speed ?? 1.4;
      let walking = false;
      let left = sp * dt;
      while (left > 0 && S.wp < path.pts.length) {
        const [px, pz] = path.pts[S.wp];
        const ax = px - S.x;
        const az = pz - S.z;
        const ad = Math.hypot(ax, az);
        if (ad < 0.04) {
          S.wp++;
          continue;
        }
        const st = Math.min(ad, left);
        S.x += (ax / ad) * st;
        S.z += (az / ad) * st;
        S.yaw = Math.atan2(ax, az);
        S.bob += st * 5;
        left -= st;
        walking = true;
      }
      if (S.wp >= path.pts.length) {
        sanWalk.arrived = true;
        S.yaw = path.yaw;
      }
      g.position.set(S.x, walking ? Math.abs(Math.sin(S.bob)) * 0.05 : 0, S.z);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, S.yaw, 0.12);
      item.pos.set(S.x, 1.5, S.z);
      return;
    }
    if (sanWalk.path) {
      sanWalk.path = null;
      sanWalk.arrived = false;
      S.wp = 0;
    }
    if (mode === "follow" && sanHold.at) {
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
      // 바로 뒤에서 따라온다: 2m 넘게 멀어지면 곧장 다가와 1.4m 뒤에 서고, 가까우면 멈춰서 방문자를 바라본다.
      // 달리는 방문자(6.2m/s)보다 조금 빠르게 붙는다. 돌아서면 언제든 마주할 수 있다.
      if (dp > 2 || S.wp === 1) {
        S.wp = dp > 1.5 ? 1 : 0;
        const k = 1.4 / Math.max(dp, 0.001);
        tx = player.pos.x + (S.x - player.pos.x) * k;
        tz = player.pos.z + (S.z - player.pos.z) * k;
        speed = Math.min(7.6, 2.4 + dp * 1.6);
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
      if (mode === "follow") {
        resolve(p, 0.35, CITY.bounds, CITY.boxes, CITY.circles);
      }
      S.x = p.x;
      S.z = p.z;
      S.yaw = Math.atan2(dx, dz);
      moving = true;
      S.bob += step * 5;
    } else if (dp < 6) {
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
