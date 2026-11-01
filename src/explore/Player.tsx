"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { input, moveVector, turnKeys } from "./input";
import { resolve } from "./collide";
import type { Interactable, ZoneDef } from "./zones";

const EYE = 1.65;
const WALK = 3.4;
const RUN = 6.2;
const RADIUS = 0.38;

export const player = { pos: new THREE.Vector3(), yaw: 0 };
// 디버그(?debug)에서 순간이동할 때 쓰는 요청
export const teleport: { req: { x: number; z: number; yaw: number } | null } = { req: null };

type Props = {
  zone: ZoneDef;
  zoneKey: string;
  onNear: (item: Interactable | null) => void;
};

// 1인칭 이동: 키보드·조이스틱으로 걷고, 드래그로 고개를 돌린다
export default function Player({ zone, zoneKey, onNear }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  const st = useRef({ yaw: 0, pitch: 0, x: 0, z: 0, bob: 0, near: null as string | null });

  useEffect(() => {
    camera.fov = aspect < 0.8 ? 78 : aspect < 1.2 ? 70 : 62;
    camera.updateProjectionMatrix();
  }, [aspect, camera]);

  useEffect(() => {
    const s = st.current;
    s.x = zone.spawn.pos[0];
    s.z = zone.spawn.pos[2];
    s.yaw = zone.spawn.yaw;
    s.pitch = 0.04;
    s.near = null;
    input.look.yaw = 0;
    input.look.pitch = 0;
    onNear(null);
  }, [zoneKey, zone, onNear]);

  const fwd = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;

    if (teleport.req) {
      s.x = teleport.req.x;
      s.z = teleport.req.z;
      s.yaw = teleport.req.yaw;
      s.pitch = 0;
      teleport.req = null;
    }
    // 시점
    s.yaw += input.look.yaw + turnKeys() * dt * 1.8;
    s.pitch = Math.max(-1.1, Math.min(1.25, s.pitch + input.look.pitch));
    input.look.yaw = 0;
    input.look.pitch = 0;

    // 이동
    const mv = input.enabled ? moveVector() : { x: 0, y: 0, run: false };
    const speed = mv.run ? RUN : WALK;
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    // yaw=0 이면 -z 방향을 바라봄
    const dx = (mv.x * cos - mv.y * sin) * speed * dt;
    const dz = (-mv.x * sin - mv.y * cos) * speed * dt;
    const p = { x: s.x + dx, z: s.z + dz };
    resolve(p, RADIUS, zone.bounds, zone.boxes, zone.circles);
    const moved = Math.hypot(p.x - s.x, p.z - s.z);
    s.x = p.x;
    s.z = p.z;
    s.bob += moved * (mv.run ? 2.2 : 2.6);

    const bobY = Math.sin(s.bob * 2) * 0.035 * Math.min(1, moved / (dt * 2 + 1e-4));
    camera.position.set(s.x, EYE + bobY, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0, "YXZ");
    player.pos.set(s.x, EYE, s.z);
    player.yaw = s.yaw;

    // 가까이 있는 상호작용 대상 찾기 (앞쪽에 있는 것 우선)
    camera.getWorldDirection(fwd.current);
    fwd.current.y = 0;
    fwd.current.normalize();
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of zone.items) {
      tmp.current.set(it.pos.x - s.x, 0, it.pos.z - s.z);
      const d = tmp.current.length();
      if (d > it.radius) continue;
      const facing = d < 0.01 ? 1 : tmp.current.divideScalar(d).dot(fwd.current);
      if (facing < 0.25 && d > 1.4) continue;
      const score = d * (1.6 - facing);
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    const id = best?.id ?? null;
    if (id !== s.near) {
      s.near = id;
      onNear(best);
    }
  });

  return null;
}
