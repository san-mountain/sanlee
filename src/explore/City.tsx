"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Float, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

// 시드 고정 난수: 새로고침해도 도시 모양이 같게
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const NEON = ["#ff2bd6", "#22f0ff", "#ffe14d", "#8a5cff"];

// 광장을 둘러싼 배경 빌딩숲 (인스턴싱으로 가볍게)
function Skyline({ count = 150 }) {
  const towers = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const r = rng(7);
    const out: { x: number; z: number; w: number; d: number; h: number; c: string }[] = [];
    while (out.length < count) {
      const a = r() * Math.PI * 2;
      const dist = 30 + r() * 45;
      const x = Math.cos(a) * dist;
      const z = Math.sin(a) * dist;
      // 스폰 지점 뒤쪽(카메라 바로 뒤)은 비워 둠
      if (z > 20 && Math.abs(x) < 14) continue;
      out.push({ x, z, w: 3 + r() * 5, d: 3 + r() * 5, h: 8 + r() * r() * 50, c: NEON[Math.floor(r() * NEON.length)] });
    }
    return out;
  }, [count]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    data.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.h / 2, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
      towers.current!.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(b.x, b.h + 0.15, b.z), q, new THREE.Vector3(b.w * 1.02, 0.3, b.d * 1.02));
      caps.current!.setMatrixAt(i, m);
      caps.current!.setColorAt(i, col.set(b.c));
    });
    towers.current!.instanceMatrix.needsUpdate = true;
    caps.current!.instanceMatrix.needsUpdate = true;
    if (caps.current!.instanceColor) caps.current!.instanceColor.needsUpdate = true;
  }, [data]);

  return (
    <group>
      <instancedMesh ref={towers} args={[undefined, undefined, data.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#120c22" roughness={0.6} metalness={0.4} emissive="#1a0d33" emissiveIntensity={0.4} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, data.length]}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// 판타지 요소: 떠다니는 섬과 수정
function FloatingIsland({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) {
  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={1.5}>
      <group position={position} scale={scale}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[2.2, 3.5, 6]} />
          <meshStandardMaterial color="#2a1d44" flatShading />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <octahedronGeometry args={[0.9, 0]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[0.9, 1.1, 0.4]} scale={0.45}>
          <octahedronGeometry args={[0.9, 0]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    </Float>
  );
}

function HoloMoon() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.03;
  });
  return (
    <mesh ref={ref} position={[-30, 48, -90]}>
      <icosahedronGeometry args={[16, 2]} />
      <meshBasicMaterial color="#ff2bd6" wireframe transparent opacity={0.35} toneMapped={false} />
    </mesh>
  );
}

export default function City() {
  return (
    <group>
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#0a0616" roughness={0.35} metalness={0.6} />
      </mesh>
      <gridHelper args={[160, 80, "#ff2bd6", "#2a1650"]} position={[0, 0.01, 0]} />
      {/* 광장 원형 테두리 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[5.6, 5.8, 64]} />
        <meshBasicMaterial color="#22f0ff" toneMapped={false} />
      </mesh>
      <Skyline />
      <FloatingIsland position={[-20, 16, -26]} color="#22f0ff" />
      <FloatingIsland position={[22, 20, -30]} color="#ff2bd6" scale={1.3} />
      <FloatingIsland position={[6, 26, -42]} color="#ffe14d" scale={0.8} />
      <HoloMoon />
      <Sparkles count={70} scale={[60, 24, 60]} position={[0, 12, -10]} size={3} speed={0.3} color="#ffe14d" />
    </group>
  );
}
