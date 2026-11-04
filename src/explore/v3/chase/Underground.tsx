"use client";
// ACT 4 지하 정비·기록 공간의 3D 장면. 상태는 gameRef.current.act4에서 매 프레임 읽는다 (React 상태 없음).
// 판정 사각형은 underground.ts의 UNDER_BLOCKS와 같은 숫자를 쓴다. 그림자·후처리 없음, 실제 광원은 작업등 1개 + 복구 뒤 출구등 1개.

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { concreteTexture, hazardTexture, signTexture } from "../../textures";
import { STAIR_DROP } from "./level";
import type { Game } from "./logic";
import {
  BYPASS, BYPASS_BREAKER, CONSOLE, DIAGRAM, EXIT_DOOR, EXIT_PANEL, LIMIT_X, SEAL_HANDLE, SEAL_Z, UNDER_BLOCKS,
} from "./underground";

type GameRef = React.RefObject<Game>;
const F = -STAIR_DROP;
const H = 3.1;

function useDisposable<T extends { dispose: () => void }>(make: () => T) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(make, []);
  useEffect(() => () => v.dispose(), [v]);
  return v;
}

function Sign({ lines, w, h, pos, rotY, color = "#e8eef0", bg = "#11161b", border = true }: {
  lines: [string, number][]; w: number; h: number; pos: [number, number, number]; rotY: number; color?: string; bg?: string; border?: boolean;
}) {
  const tex = useDisposable(() => signTexture(lines, { color, bg, border, w: 512, h: Math.round((512 * h) / w) }));
  return (
    <mesh position={pos} rotation-y={rotY}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

export function Underground({ gameRef }: { gameRef: GameRef }) {
  const concrete = useDisposable(() => {
    const t = concreteTexture(11, 70);
    t.repeat.set(6, 6);
    return t;
  });
  const hazard = useDisposable(() => {
    const t = hazardTexture();
    t.repeat.set(4, 1);
    return t;
  });
  const wallMat = useDisposable(() => new THREE.MeshStandardMaterial({ map: concrete, color: "#59616b", roughness: 0.92 }));
  const walls = UNDER_BLOCKS.filter((b) => b.kind === "building");

  const seal = useRef<THREE.Mesh>(null);
  const sealLamp = useRef<THREE.MeshBasicMaterial>(null);
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  const exitDoor = useRef<THREE.MeshBasicMaterial>(null);
  const exitScreen = useRef<THREE.MeshBasicMaterial>(null);
  const exitLight = useRef<THREE.PointLight>(null);
  const limitMat = useRef<THREE.MeshBasicMaterial>(null);
  const limitLabel = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const c = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const g = gameRef.current;
    const a = g.act4;
    // 지상에 있는 동안은 그리지 않는다 (계단 아래부터 보이기 시작)
    if (root.current) root.current.visible = g.player.z < -44 || g.phase === "under" || g.phase === "complete";
    if (seal.current) {
      seal.current.visible = a.door > 0.01;
      seal.current.position.y = F + H / 2 + (1 - a.door) * H;
    }
    sealLamp.current?.color.set(a.doorState === "closed" ? "#e0485c" : a.doorReq ? "#f0c35a" : "#5fe0a8");
    // 정비 단말: 꺼짐 → 기록(호박색) → 출구 회로 복구 후(초록)
    screen.current?.color.set(a.restored ? "#7ff0c0" : a.record ? "#f0c35a" : a.doorState === "closed" ? "#5b7f9c" : "#1d242b");
    // 정상 출구: 꺼져 있다가 복구와 함께 밝고 안정적인 빛
    exitDoor.current?.color.set(a.restored ? "#e6f6ef" : "#2a3036");
    exitScreen.current?.color.set(a.restored ? "#9ff7d8" : "#3a1c22");
    if (exitLight.current) exitLight.current.intensity = a.restored ? 3.2 : 0;
    // 안내 경로 제한선: 복구 순간 켜지고, 이산이 막혔을 때 반짝인다
    if (limitMat.current) {
      const on = a.restored ? 1 : 0;
      c.set("#ff5a3c").multiplyScalar(on * (0.65 + 0.2 * Math.sin(clock.elapsedTime * 3) + a.flash * 1.2));
      limitMat.current.color.copy(c);
    }
    if (limitLabel.current) limitLabel.current.visible = a.restored;
  });

  return (
    <group ref={root}>
      {/* 바닥과 천장 */}
      <mesh rotation-x={-Math.PI / 2} position={[4.1, F + 0.002, -70.6]}>
        <planeGeometry args={[25, 20]} />
        <meshStandardMaterial map={concrete} color="#6d7680" roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.002, -59.9]}>
        <planeGeometry args={[5, 2.2]} />
        <meshStandardMaterial map={concrete} color="#6d7680" roughness={0.9} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[4.1, F + H, -68.3]}>
        <planeGeometry args={[25, 24.6]} />
        <meshStandardMaterial color="#1b1f24" roughness={1} side={THREE.FrontSide} />
      </mesh>
      {walls.map((b, i) => (
        <mesh key={i} position={[(b.x0 + b.x1) / 2, F + H / 2, (b.z0 + b.z1) / 2]} material={wallMat}>
          <boxGeometry args={[b.x1 - b.x0, H, b.z1 - b.z0]} />
        </mesh>
      ))}

      {/* 배관과 전기함 (정비시설의 흔적, 적은 수로) */}
      {[-6.9, -6.5].map((x, i) => (
        <mesh key={i} position={[x, F + 2.7 - i * 0.3, -70.5]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.09, 0.09, 19, 6]} />
          <meshStandardMaterial color={i ? "#6a4f3a" : "#3d464f"} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[-3.5, F + 0.45, -68]}>
        <boxGeometry args={[2.4, 0.9, 1.0]} />
        <meshStandardMaterial color="#4a4f55" metalness={0.4} roughness={0.6} />
      </mesh>
      <Sign lines={[["B2 정비 구역", 1], ["을지로3가 · 관리 전용", 0.5]]} w={1.8} h={0.7} pos={[-4.6, F + 2.4, -61.04]} rotY={Math.PI} color="#d8dde0" bg="#1a1f25" />

      {/* 작업등: 이 공간의 유일한 상시 광원 */}
      <pointLight position={[0, F + 2.7, -69]} intensity={2.4} distance={17} decay={1.4} color="#ffd9a8" />
      {[-66, -73].map((z) => (
        <mesh key={z} position={[0, F + H - 0.06, z]}>
          <boxGeometry args={[1.4, 0.06, 0.2]} />
          <meshBasicMaterial color="#ffe6c2" toneMapped={false} />
        </mesh>
      ))}

      {/* 1. 수동 차단문: 천장에서 내려와 계단 통로를 막는다 */}
      <mesh ref={seal} position={[0, F + H * 1.5, SEAL_Z]} visible={false}>
        <boxGeometry args={[5, H, 0.3]} />
        <meshStandardMaterial color="#4b5158" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh position={[0, F + H - 0.15, SEAL_Z]}>
        <boxGeometry args={[5.2, 0.3, 0.5]} />
        <meshBasicMaterial map={hazard} />
      </mesh>
      <group position={[SEAL_HANDLE.x - 0.3, F, SEAL_HANDLE.z]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.5, 0.8, 0.2]} />
          <meshStandardMaterial color="#5a4a2e" metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.75, 0.11]}>
          <planeGeometry args={[0.18, 0.12]} />
          <meshBasicMaterial ref={sealLamp} color="#5fe0a8" toneMapped={false} />
        </mesh>
      </group>
      <Sign lines={[["수동 차단문", 1]]} w={0.9} h={0.26} pos={[SEAL_HANDLE.x - 0.33, F + 2.1, SEAL_HANDLE.z]} rotY={Math.PI / 2} color="#f0c35a" bg="#14110a" />

      {/* 3. 동선 점검 도면 (자세한 내용은 HUD 조사 패널) */}
      <group position={[DIAGRAM.x - 0.38, F, DIAGRAM.z]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 1.6, 0]}>
          <planeGeometry args={[2.4, 1.5]} />
          <meshBasicMaterial color="#d9dccf" toneMapped={false} />
        </mesh>
        <mesh position={[-0.2, 1.6, 0.005]}>
          <planeGeometry args={[0.08, 1.2]} />
          <meshBasicMaterial color="#2f6f9a" />
        </mesh>
        <mesh position={[0.3, 1.45, 0.005]}>
          <planeGeometry args={[1.0, 0.06]} />
          <meshBasicMaterial color="#c0392b" />
        </mesh>
      </group>
      <Sign lines={[["동선 점검", 1], ["안내 경로 · 대기점", 0.55]]} w={1.3} h={0.42} pos={[DIAGRAM.x - 0.37, F + 2.6, DIAGRAM.z]} rotY={Math.PI / 2} color="#1d2a33" bg="#c9ccbf" border={false} />

      {/* 4·5. 정비 단말: 제작 기록과 출구 회로를 함께 다루는 낮은 콘솔 (너머로 우회로 입구가 보인다) */}
      <group position={[CONSOLE.x, F, CONSOLE.z]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.8, 1.1, 1.2]} />
          <meshStandardMaterial color="#3c434b" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[-0.41, 0.85, 0]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[0.9, 0.42]} />
          <meshBasicMaterial ref={screen} color="#1d242b" toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.18, 0.4]} rotation-z={0.5}>
          <boxGeometry args={[0.06, 0.3, 0.06]} />
          <meshStandardMaterial color="#c0392b" />
        </mesh>
      </group>
      <Sign lines={[["정비 단말 M-3", 1], ["기록 · 출구 회로", 0.55]]} w={1.0} h={0.34} pos={[CONSOLE.x - 0.42, F + 1.32, CONSOLE.z]} rotY={-Math.PI / 2} color="#cfe2ea" bg="#121a20" />

      {/* 6. 정비 우회로: 어둡지만 사람이 지나갈 수 있는 실제 통로 */}
      <mesh position={[(LIMIT_X + 0.0), F + 0.01, (BYPASS.z0 + BYPASS.z1) / 2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.14, BYPASS.z1 - BYPASS.z0]} />
        <meshBasicMaterial ref={limitMat} color="#000000" toneMapped={false} />
      </mesh>
      {[BYPASS.z1 - 0.05, BYPASS.z0 + 0.05].map((z) => (
        <mesh key={z} position={[LIMIT_X, F + 1.2, z]}>
          <boxGeometry args={[0.12, 2.4, 0.1]} />
          <meshStandardMaterial color="#2a2f35" metalness={0.6} />
        </mesh>
      ))}
      <group ref={limitLabel} visible={false}>
        <Sign lines={[["안내 개체 통행 제한", 1], ["방문자 통과 가능", 0.6]]} w={1.2} h={0.36} pos={[LIMIT_X - 0.07, F + 2.55, (BYPASS.z0 + BYPASS.z1) / 2]} rotY={-Math.PI / 2} color="#ff9a7a" bg="#1a0c0a" />
      </group>
      <Sign lines={[["정비 우회로", 1], ["안내 경로 외 · 경로 정보 없음", 0.48], ["안전 보장 없음", 0.48]]} w={1.3} h={0.6} pos={[7.47, F + 2.0, -72.9]} rotY={-Math.PI / 2} color="#e8d9a8" bg="#16130b" />
      {[9.5, 12.5].map((x) => (
        <mesh key={x} position={[x, F + 0.02, -74.2]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.6, 0.05]} />
          <meshBasicMaterial color="#5a6a3a" toneMapped={false} />
        </mesh>
      ))}
      {/* 우회로 끝의 차단기: ACT 5에서 구역 제어 연결을 끊는 정비 단서 */}
      <group position={[BYPASS_BREAKER.x, F, BYPASS_BREAKER.z]} rotation-y={-Math.PI / 2}>
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[0.9, 1.1, 0.3]} />
          <meshStandardMaterial color="#3a3f2e" metalness={0.4} />
        </mesh>
        <mesh position={[0.3, 1.65, 0.16]}>
          <planeGeometry args={[0.1, 0.1]} />
          <meshBasicMaterial color="#c9a43a" toneMapped={false} />
        </mesh>
      </group>
      <Sign lines={[["구역 제어 연결", 1], ["정비 차단기", 0.6]]} w={0.9} h={0.3} pos={[BYPASS_BREAKER.x - 0.16, F + 2.1, BYPASS_BREAKER.z]} rotY={-Math.PI / 2} color="#d9c98a" bg="#141209" />

      {/* 7. 정상 출구: 복구 뒤 밝고 정돈된 빛 */}
      <group position={[EXIT_DOOR.x, F, EXIT_DOOR.z + 0.02]}>
        <mesh position={[0, 1.2, 0]}>
          <planeGeometry args={[2.2, 2.4]} />
          <meshBasicMaterial ref={exitDoor} color="#2a3036" toneMapped={false} />
        </mesh>
        <mesh position={[0, 2.5, 0.02]}>
          <boxGeometry args={[2.6, 0.2, 0.1]} />
          <meshStandardMaterial color="#8f9aa2" metalness={0.5} />
        </mesh>
      </group>
      <Sign lines={[["정상 출구", 1], ["안내 경로 · 서울 중심부", 0.5]]} w={1.6} h={0.5} pos={[EXIT_DOOR.x, F + 2.85, EXIT_DOOR.z + 0.03]} rotY={0} color="#e6f6ef" bg="#10221b" />
      <pointLight ref={exitLight} position={[0, F + 2.2, -78.6]} intensity={0} distance={9} decay={1.5} color="#d6f5e8" />
      <group position={[EXIT_PANEL.x, F, EXIT_PANEL.z - 0.28]}>
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[0.6, 0.8, 0.12]} />
          <meshStandardMaterial color="#3a4148" metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.38, 0.07]}>
          <planeGeometry args={[0.46, 0.34]} />
          <meshBasicMaterial ref={exitScreen} color="#3a1c22" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
