"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Lang } from "@/data/site";
import { useSign } from "./parts";

const GREY = new THREE.Color("#a9a6ae");
const BLACK = new THREE.Color("#000000");

type Part = "head" | "torso" | "arms" | "legs";
const RESTORE_AT: Record<Part, number> = { head: 1, torso: 2, arms: 3, legs: 3 };
const COLORS: Record<Part, string> = { head: "#ff2bd6", torso: "#22f0ff", arms: "#a77bff", legs: "#ffe14d" };

// 회색 돌에서 방문한 터미널 수만큼 부위별로 색이 돌아오는 재질
function usePartMaterial(part: Part, restored: number) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: GREY, roughness: 0.75, metalness: 0.05 }), []);
  const target = restored >= RESTORE_AT[part];
  const tColor = useMemo(() => new THREE.Color(COLORS[part]), [part]);
  const dim = useMemo(() => tColor.clone().multiplyScalar(0.5), [tColor]);
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.5);
    mat.color.lerp(target ? dim : GREY, k);
    mat.emissive.lerp(target ? tColor : BLACK, k);
    mat.emissiveIntensity = target ? 0.5 : 0;
  });
  return mat;
}

const UP = new THREE.Vector3(0, 1, 0);
// 두 점 사이를 잇는 팔다리 (캡슐)
function Limb({ a, b, r, material }: { a: [number, number, number]; b: [number, number, number]; r: number; material: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    return {
      pos: va.add(vb).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
      len,
    };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} material={material} castShadow>
      <capsuleGeometry args={[r, Math.max(0.01, len - r), 6, 12]} />
    </mesh>
  );
}

function Cookie() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.8;
    ref.current.position.y = 3.6 + Math.sin(s.clock.elapsedTime * 1.6) * 0.08;
  });
  const chips = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = i * 2.4;
        const r = 0.12 + (i % 3) * 0.1;
        return [Math.cos(a) * r, i % 2 ? 0.075 : -0.075, Math.sin(a) * r] as [number, number, number];
      }),
    []
  );
  return (
    <group ref={ref} position={[1.5, 3.6, 1.5]}>
      <group rotation={[Math.PI / 2.4, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.46, 0.44, 0.13, 24]} />
          <meshStandardMaterial color="#c8873a" roughness={0.9} emissive="#5a3510" emissiveIntensity={0.5} />
        </mesh>
        {chips.map((p, i) => (
          <mesh key={i} position={p} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color="#2b170b" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const S = 2.1; // 사람 크기 모델을 동상 크기로
const TOP = 1.2; // 받침대 높이

// 받침대: 복원이 끝나면 비어 있고 명판만 남는다
export function Pedestal({ lang, empty }: { lang: Lang; empty?: boolean }) {
  const plate = useSign(
    [
      [lang === "ko" ? "이산 (보관 처리됨)" : "SAN LEE (ARCHIVED)", 1],
      [empty ? (lang === "ko" ? "— 걸어 나감 —" : "— WALKED AWAY —") : lang === "ko" ? "끝까지 '모두 거부'를 누른 자" : "THE ONE WHO REJECTED ALL", 0.7],
    ],
    { color: "#2a1d08", w: 512, h: 144 }
  );
  return (
    <group>
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[2.05, 2.15, 0.4, 8, 1, false, Math.PI / 8]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[1.7, 1.8, 0.8, 8, 1, false, Math.PI / 8]} />
        <meshStandardMaterial color="#33323a" roughness={0.85} />
      </mesh>
      <mesh position={[0, TOP + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.66, 8]} />
        <meshBasicMaterial color="#22f0ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.78, 1.63]} rotation={[-0.05, 0, 0]}>
        <boxGeometry args={[1.5, 0.42, 0.04]} />
        <meshStandardMaterial color="#8a6a2a" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.78, 1.653]} rotation={[-0.05, 0, 0]}>
        <planeGeometry args={[1.42, 0.38]} />
        <meshStandardMaterial map={plate} transparent metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

const LEAN = 0.5; // 앞으로 웅크린 각도

// 받침대 위에 주저앉아 머리를 감싸 쥔 동상
export default function Statue({ restored, lang }: { restored: number; lang: Lang }) {
  const body = useRef<THREE.Group>(null);
  const head = usePartMaterial("head", restored);
  const torso = usePartMaterial("torso", restored);
  const arms = usePartMaterial("arms", restored);
  const legs = usePartMaterial("legs", restored);

  const torsoGeo = useMemo(() => {
    const pts: [number, number][] = [
      [0, 0],
      [0.15, 0.02],
      [0.165, 0.13],
      [0.14, 0.26],
      [0.165, 0.41],
      [0.2, 0.53],
      [0.19, 0.6],
      [0.09, 0.65],
      [0, 0.66],
    ];
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 24);
    g.scale(1, 1, 0.62);
    return g;
  }, []);

  // 굳어 있는 동안 가끔 지직거리고, 조각이 돌아올수록 숨을 쉬듯 움직임
  useFrame((s) => {
    if (!body.current) return;
    const t = s.clock.elapsedTime;
    const glitch = Math.sin(t * 13.7) > 0.985 - restored * 0.004;
    body.current.position.x = glitch ? (Math.random() - 0.5) * 0.18 : 0;
    body.current.scale.x = glitch ? S * (1 + (Math.random() - 0.5) * 0.08) : S;
    body.current.scale.y = S * (1 + Math.sin(t * 1.2) * 0.004 * restored);
  });

  return (
    <group>
      <Pedestal lang={lang} />
      <group ref={body} position={[0, TOP, -0.35]} scale={S}>
        {/* 무릎을 세우고 앉은 다리 */}
        {[-1, 1].map((k) => (
          <group key={k}>
            <Limb a={[k * 0.09, 0.1, 0]} b={[k * 0.13, 0.38, 0.36]} r={0.07} material={legs} />
            <Limb a={[k * 0.13, 0.38, 0.36]} b={[k * 0.12, 0.06, 0.5]} r={0.058} material={legs} />
            <mesh position={[k * 0.12, 0.035, 0.56]} material={legs}>
              <boxGeometry args={[0.11, 0.07, 0.24]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.1, 0]} scale={[1, 0.6, 0.8]} material={torso}>
          <sphereGeometry args={[0.17, 16, 12]} />
        </mesh>
        {/* 앞으로 웅크린 몸통과 숙인 머리 */}
        <group position={[0, 0.12, 0]} rotation={[LEAN, 0, 0]}>
          <mesh geometry={torsoGeo} material={torso} />
          <mesh position={[0, 0.69, 0.01]} material={head}>
            <cylinderGeometry args={[0.048, 0.058, 0.1, 12]} />
          </mesh>
          <group position={[0, 0.8, 0.05]} rotation={[0.55, 0.12, 0.08]}>
            <mesh scale={[0.9, 1.12, 1]} material={head}>
              <sphereGeometry args={[0.115, 20, 16]} />
            </mesh>
            <mesh position={[0, -0.01, 0.112]} rotation={[0.2, 0, 0]} material={head}>
              <coneGeometry args={[0.018, 0.05, 8]} />
            </mesh>
          </group>
          {[-1, 1].map((k) => (
            <mesh key={k} position={[k * 0.2, 0.56, 0]} material={arms}>
              <sphereGeometry args={[0.062, 12, 8]} />
            </mesh>
          ))}
        </group>
        {/* 팔: 무릎에 팔꿈치를 대고 두 손으로 머리를 감쌈 */}
        {[-1, 1].map((k) => (
          <group key={k}>
            <Limb a={[k * 0.2, 0.61, 0.27]} b={[k * 0.19, 0.43, 0.43]} r={0.05} material={arms} />
            <Limb a={[k * 0.19, 0.43, 0.43]} b={[k * 0.12, 0.74, 0.44]} r={0.043} material={arms} />
            <mesh position={[k * 0.105, 0.8, 0.43]} rotation={[0, 0, k * 0.3]} scale={[0.45, 1, 0.9]} material={arms}>
              <boxGeometry args={[0.1, 0.13, 0.1]} />
            </mesh>
          </group>
        ))}
      </group>

      <Cookie />
    </group>
  );
}
