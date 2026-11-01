"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { Vec3 } from "./layout";

export type Anchor = { key: string; pos: Vec3; scaleAt: number; maxScale?: number };
export type LabelEls = React.MutableRefObject<Record<string, HTMLDivElement | null>>;

// 3D 좌표를 화면 좌표로 바꿔 DOM 라벨을 매 프레임 옮깁니다 (리렌더 없이)
export default function Labels({ anchors, els }: { anchors: Anchor[]; els: LabelEls }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const a of anchors) {
      const el = els.current[a.key];
      if (!el) continue;
      v.set(...a.pos);
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1 || v.z < -1) {
        el.style.visibility = "hidden";
        continue;
      }
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      const s = Math.min(a.maxScale ?? 1.4, a.scaleAt / dist);
      el.style.visibility = s < 0.35 ? "hidden" : "visible";
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
      el.style.zIndex = String(Math.round(1000 - dist));
    }
  });
  return null;
}
