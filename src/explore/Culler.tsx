"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { warm } from "./runtime";

// 멀리 있어 화면에서 점 하나도 안 되는 작은 물체는 그리지 않는다.
// 도시는 물체가 2천 개쯤이라 한 프레임에 그리기 호출이 천 번 가까이 되는데, 그중 상당수가 안개 속 먼 곳의
// 손톱만 한 장식(창틀, 작은 간판, 사람 등)이었다. 그리기 호출 수가 곧 노트북의 계산 부담이라, 이것만 빼도 한결 가볍다.
// visible은 장면 쪽 코드가 쓰므로 건드리지 않고, 그 물체의 층(layers)만 잠시 꺼 둔다 (자식은 그대로 따로 판단한다).
const EVERY = 0.15; // 몇 초마다 다시 볼지
const NEAR = 40; // 이보다 가까운 것은 늘 그린다 (m)
const MIN_PX = 3; // 안개를 거친 뒤 화면에 남는 크기(CSS 픽셀)가 이보다 작으면 뺀다
const MAX_PX = 12; // 안개가 짙어도 이보다 크게 보이는 것은 남긴다 (하늘을 등진 윤곽이 툭 사라지지 않게)

const DEBUG = typeof location !== "undefined" && location.search.includes("debug");
// 비교용: 주소에 ?nocull 을 붙이면 끈다
const OFF = typeof location !== "undefined" && location.search.includes("nocull");
const sphere = new THREE.Sphere();
export default function Culler() {
  const scene = useThree((s) => s.scene);
  const culled = useRef(new Map<THREE.Object3D, number>());
  const since = useRef(EVERY);

  const restoreAll = () => {
    culled.current.forEach((mask, o) => {
      // 그사이 장면 코드가 층을 바꿨다면 그 값을 따른다
      if (o.layers.mask === 0) o.layers.mask = mask;
    });
    culled.current.clear();
  };
  useEffect(() => restoreAll, [scene]);

  useFrame(({ camera, size }, dt) => {
    // 구역을 옮겨 장면을 데우는 동안은 전부 그린다 (모든 셰이더를 미리 만들어 둬야 나중에 안 멈춘다)
    if (!warm.ready || OFF) {
      if (culled.current.size) restoreAll();
      return;
    }
    since.current += dt;
    if (since.current < EVERY) return;
    since.current = 0;
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    const focal = ((size.height / 2) * (cam.zoom || 1)) / Math.tan((cam.fov * Math.PI) / 360);
    const fog = scene.fog instanceof THREE.FogExp2 ? scene.fog.density : 0;
    const cp = cam.getWorldPosition(new THREE.Vector3());
    const map = culled.current;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh || !m.frustumCulled) return;
      const g = m.geometry;
      if (!g) return;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingSphere) return;
      sphere.copy(g.boundingSphere).applyMatrix4(m.matrixWorld);
      const d = sphere.center.distanceTo(cp) - sphere.radius;
      let hide = false;
      if (d > NEAR) {
        const px = (sphere.radius * focal) / d;
        const f = fog ? Math.exp(-(fog * d) * (fog * d)) : 1;
        hide = px < MAX_PX && px * f < MIN_PX;
      }
      const was = map.has(m);
      if (hide && !was) {
        if (m.layers.mask === 0) return;
        map.set(m, m.layers.mask);
        m.layers.mask = 0;
      } else if (!hide && was) {
        if (m.layers.mask === 0) m.layers.mask = map.get(m)!;
        map.delete(m);
      }
    });
    // 장면에서 빠진 물체는 잊는다
    if (map.size) map.forEach((_, o) => !o.parent && map.delete(o));
    if (DEBUG) (window as unknown as Record<string, unknown>).__cull = map.size;
  });
  return null;
}
