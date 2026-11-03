"use client";

// 퍼즐 B 「없었던 3초」: 거부 원본 위에 '동의'를 계속 찍는 실제 기계.
// 플레이어는 도장 잠금쇠를 직접 당겨 덮어쓰기를 멈추고, 노출된 원본 테이프를 꺼낸다.
// 화면 위 조작 레이블 없이, 큰 레버·노출된 종이와 광원으로만 다음 행동을 보여 준다.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Lang } from "@/data/site";
import { Tap, type TapFn } from "./parts";
import { signTexture } from "./textures";
import { AUDIT_MACHINE, GUARANTOR } from "./zones";
import { auditRt } from "./auditRuntime";
import { auditUi } from "./story";

const IRON = "#22252a";
const BRASS = "#bc985c";
const WOOD = "#4d3327";
const PAPER = "#e5d8bc";

function useTex(make: () => THREE.Texture, key: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(make, key);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function StampWorks({ lang, onTap }: { lang: Lang; onTap: TapFn }) {
  const ko = lang === "ko";
  const rejectTex = useTex(() => signTexture([[ko ? "✕ 거부" : "✕ REFUSED", 1]], {
    color: "#bb383b", bg: "#eee0c3", w: 512, h: 208, mono: !ko,
  }), [ko]);
  const acceptTex = useTex(() => signTexture([[ko ? "✓ 동의" : "✓ ACCEPTED", 1]], {
    color: "#243c30", bg: "#e5d8bc", w: 512, h: 208, mono: !ko,
  }), [ko]);
  const plaque = useTex(() => signTexture([[ko ? "기록 수정 장치" : "RECORD REVISION", 1]], {
    color: "#e6ca9e", bg: "#2b201a", w: 720, h: 124, border: true,
  }), [ko]);
  const stripSign = useTex(() => signTexture([[ko ? "14:02:01  ·  모두 거부" : "14:02:01  ·  REJECT ALL", 1]], {
    color: "#9b292f", bg: "#e5d8bc", w: 768, h: 128, mono: !ko,
  }), [ko]);

  const hammer = useRef<THREE.Group>(null);
  const lever = useRef<THREE.Group>(null);
  const movingTape = useRef<THREE.Group>(null);
  const marks = useRef<(THREE.Mesh | null)[]>([]);
  const original = useRef<THREE.Group>(null);
  const workLamp = useRef<THREE.MeshStandardMaterial>(null);
  const stopLamp = useRef<THREE.MeshStandardMaterial>(null);
  const pressLight = useRef<THREE.PointLight>(null);
  const originalLight = useRef<THREE.PointLight>(null);
  const stamp = useRef<THREE.Mesh>(null);
  const begin = useRef(performance.now());

  useFrame((st) => {
    const p = auditRt.phase;
    const running = p === "test" || p === "replay";
    const stopped = p === "unlock" || p === "slip" || p === "reading" || p === "ending" || p === "done";
    const elapsed = (performance.now() - begin.current) / 1000;
    const beat = elapsed * 3.6;
    // 위에서 떨어지는 도장과 롤러는 시선을 끄는 주된 연출. 뒤쪽에 작은 메시지 창을 두지 않는다.
    const strike = running ? Math.pow(Math.max(0, Math.sin(beat)), 8) : 0;
    if (hammer.current) {
      const wanted = stopped ? 0.27 : -strike * 0.24;
      hammer.current.position.y += (wanted - hammer.current.position.y) * 0.23;
    }
    if (stamp.current) stamp.current.rotation.z = running ? Math.sin(beat) * 0.035 : 0;
    if (movingTape.current) movingTape.current.visible = running;
    // 실제 기록의 '거부'가 이동하며 프레스 아래를 통과한 뒤 '동의'가 되는 과정.
    // 텍스트 독해 없이도 원본을 덮어쓰는 행위를 이해할 수 있게 한다.
    marks.current.forEach((mesh, index) => {
      if (!mesh || !running) return;
      const x = ((elapsed * 0.45 + index * 0.58) % 1.74) - 0.87;
      mesh.position.x = x;
      const material = mesh.material as THREE.MeshBasicMaterial;
      const expected = x > 0.13 ? acceptTex : rejectTex;
      if (material.map !== expected) { material.map = expected; material.needsUpdate = true; }
    });
    if (original.current) {
      original.current.visible = stopped;
      const target = p === "unlock" ? 0.18 : stopped ? 0.55 : 0;
      original.current.position.z += (target - original.current.position.z) * 0.11;
    }
    if (lever.current) lever.current.rotation.x += ((stopped ? -0.7 : 0.2) - lever.current.rotation.x) * 0.18;
    if (workLamp.current) workLamp.current.emissiveIntensity = running ? (0.45 + strike * 1.5) : 0.02;
    if (stopLamp.current) stopLamp.current.emissiveIntensity = stopped ? 0.03 : (0.35 + Math.sin(st.clock.elapsedTime * 3) * 0.18);
    if (pressLight.current) pressLight.current.intensity = running ? (0.35 + strike * 1.0) : 0;
    if (originalLight.current) originalLight.current.intensity = stopped ? (0.7 + Math.sin(st.clock.elapsedTime * 2.8) * 0.2) : 0;
  });

  return (
    <group position={AUDIT_MACHINE.pos} rotation={[0, AUDIT_MACHINE.rotY, 0]}>
      {/* 낮고 넓은 나무 받침 위 황동 프레스. 원통이나 버튼이 여러 개 달린 단말기로 보이지 않게 한다 */}
      <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.84, 1.04]} />
        <meshStandardMaterial color={WOOD} roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.88, 0]} receiveShadow>
        <boxGeometry args={[1.9, 0.09, 1.1]} />
        <meshStandardMaterial color="#37241c" roughness={0.78} />
      </mesh>
      {[-0.87, 0.87].map((x) => (
        <mesh key={x} position={[x, 0.5, 0.52]}>
          <boxGeometry args={[0.035, 0.7, 0.022]} />
          <meshStandardMaterial color={BRASS} metalness={0.76} roughness={0.32} />
        </mesh>
      ))}
      <mesh position={[0, 0.99, 0.23]}>
        <boxGeometry args={[1.65, 0.12, 0.71]} />
        <meshStandardMaterial color={IRON} metalness={0.65} roughness={0.48} />
      </mesh>

      {/* 원본은 왼쪽에서 들어오고 도장이 지나면 오른쪽에서 '동의'로 바뀐다. */}
      <group ref={movingTape} position={[-0.04, 0, 0]}>
        <mesh position={[0, 1.064, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 0.53]} />
          <meshStandardMaterial color={PAPER} roughness={0.94} side={THREE.DoubleSide} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} ref={(m) => { marks.current[i] = m; }} position={[i * 0.55 - 0.8, 1.071, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.39, 0.22]} />
            <meshBasicMaterial map={rejectTex} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* 빨간 X가 들어간 뒤 초록 승인이 나오는 것을 한눈에 이해할 수 있게 판에 작은 레일을 덧댄다 */}
      {[-0.1, 0.58].map((z) => (
        <mesh key={z} position={[0, 1.08, z]}>
          <boxGeometry args={[1.73, 0.045, 0.035]} />
          <meshStandardMaterial color={BRASS} roughness={0.48} metalness={0.7} />
        </mesh>
      ))}
      {[-0.74, 0.74].map((x) => (
        <mesh key={x} position={[x, 1.10, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.58, 16]} />
          <meshStandardMaterial color="#6b5745" metalness={0.55} roughness={0.56} />
        </mesh>
      ))}

      {/* 덮어쓰는 도장 본체: 반복해서 종이를 때리고, 멈추면 높이 올라간다 */}
      {[-0.58, 0.58].map((x) => (
        <mesh key={x} position={[x, 1.64, -0.12]} castShadow>
          <boxGeometry args={[0.095, 1.07, 0.1]} />
          <meshStandardMaterial color={BRASS} metalness={0.74} roughness={0.36} />
        </mesh>
      ))}
      <mesh position={[0, 2.17, -0.10]}>
        <boxGeometry args={[1.32, 0.17, 0.38]} />
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </mesh>
      <group ref={hammer}>
        <mesh position={[0, 1.82, 0.24]} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.66, 18]} />
          <meshStandardMaterial color={BRASS} metalness={0.84} roughness={0.34} />
        </mesh>
        <mesh ref={stamp} position={[0, 1.43, 0.24]} castShadow>
          <boxGeometry args={[0.59, 0.22, 0.46]} />
          <meshStandardMaterial color="#383132" metalness={0.62} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.30, 0.24]}>
          <boxGeometry args={[0.52, 0.045, 0.4]} />
          <meshStandardMaterial color="#a93d3d" emissive="#67161b" emissiveIntensity={0.4} />
        </mesh>
      </group>
      <mesh position={[0, 2.24, 0.04]}>
        <planeGeometry args={[0.97, 0.16]} />
        <meshBasicMaterial map={plaque} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.06, 0.09]}>
        <sphereGeometry args={[0.06, 14, 10]} />
        <meshStandardMaterial ref={workLamp} color="#9a7437" emissive="#ffbc54" emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
      <pointLight ref={pressLight} position={[0, 1.55, 0.44]} color="#f4ad65" intensity={0} distance={2.2} />

      {/* 조작할 수 있는 유일한 레버. 레버 자신이 빛나며 위치를 알려 준다. */}
      <Tap id="audit-test" onTap={onTap}>
        <group position={[0.75, 1.36, 0.45]}>
          <mesh position={[0, 0.10, 0]}>
            <boxGeometry args={[0.57, 0.70, 0.51]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.25, 0.16, 0.25]} />
            <meshStandardMaterial color="#282527" metalness={0.5} roughness={0.55} />
          </mesh>
          <group ref={lever}>
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.037, 0.048, 0.45, 14]} />
              <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.36} />
            </mesh>
            <mesh position={[0, 0.37, 0]}>
              <sphereGeometry args={[0.115, 18, 12]} />
              <meshStandardMaterial ref={stopLamp} color="#b64742" emissive="#e64a45" emissiveIntensity={0.4} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </Tap>

      {/* 레버를 당기면 도장이 들리고, 가려져 있던 원본 종이가 앞으로 길게 튀어나온다 */}
      <Tap id="audit-box" onTap={onTap}>
        <group ref={original} visible={false} position={[0, 0, 0]}>
          <mesh position={[0, 1.12, 0.63]}>
            <boxGeometry args={[1.24, 0.22, 0.44]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
          <mesh position={[0, 1.06, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.25, 0.48]} />
            <meshStandardMaterial color={PAPER} side={THREE.DoubleSide} roughness={0.94} />
          </mesh>
          <mesh position={[0, 1.069, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.08, 0.26]} />
            <meshBasicMaterial map={stripSign} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1.09, 0.84]}>
            <boxGeometry args={[1.31, 0.04, 0.055]} />
            <meshStandardMaterial color="#d2aa64" emissive="#9f7b3e" emissiveIntensity={0.48} />
          </mesh>
        </group>
      </Tap>
      <pointLight ref={originalLight} position={[0, 1.21, 1.10]} color="#ffe0aa" intensity={0} distance={2.2} />
    </group>
  );
}

export default function AuditMachine({
  lang, onTap,
}: {
  lang: Lang;
  input: "accept" | "reject" | null; // 이전 저장/World props 호환 (더 이상 화면에서 사용하지 않음)
  output: "accept" | "reject" | null;
  onTap: TapFn;
}) {
  return <StampWorks lang={lang} onTap={onTap} />;
}

// 퍼즐 C 예고용 장치는 B의 리디자인과 무관하므로 원형 유지.
export function Guarantor({ lang, litAt }: { lang: Lang; litAt: number }) {
  const ko = lang === "ko";
  const sign = useTex(() => signTexture([[ko ? auditUi.guarantorSign.ko : auditUi.guarantorSign.en, 1]], { color: "#ffd27a", bg: "#1a120a", w: 512, h: 128, glow: true }), [ko]);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const signMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    const lit = auditRt.phase === "done" || (litAt > 0 && performance.now() >= litAt);
    const since = litAt > 0 ? (performance.now() - litAt) / 1000 : 9;
    const k = lit ? (since < 0.8 ? (Math.sin(since * 30) > 0 ? 1 : 0.2) : 0.85 + Math.sin(st.clock.elapsedTime * 1.6) * 0.15) : 0.03;
    if (lamp.current) lamp.current.emissiveIntensity = k * 2.6;
    if (light.current) light.current.intensity = k * 2.2;
    if (signMat.current) signMat.current.opacity = lit ? Math.min(1, k + 0.1) : 0.12;
  });
  return (
    <group position={GUARANTOR.pos} rotation={[0, GUARANTOR.rotY, 0]}>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[0.6, 0.24, 0.6]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.34, 1.12, 0.3]} />
        <meshStandardMaterial color={IRON} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.38, 0]}>
        <boxGeometry args={[0.42, 0.05, 0.38]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
      </mesh>
      {[-0.08, 0.08].map((xx) => (
        <mesh key={xx} position={[xx, 1.41, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06, 20]} />
          <meshStandardMaterial color="#3b2f1c" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.08, 18, 12]} />
        <meshStandardMaterial ref={lamp} color="#ffd27a" emissive="#ffb84a" emissiveIntensity={0} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.6, 0.3]} color="#ffc46b" intensity={0} distance={3.5} decay={1.8} />
      <mesh position={[0, 1.0, 0.152]}>
        <planeGeometry args={[0.3, 0.075]} />
        <meshBasicMaterial ref={signMat} map={sign} transparent opacity={0.12} toneMapped={false} />
      </mesh>
    </group>
  );
}
