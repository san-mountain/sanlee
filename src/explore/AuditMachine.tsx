"use client";

// 퍼즐 B 「봉인된 3초」 v0.7: 무명사의 기록 보관 장치.
// 위: 도시가 붙인 흰 공식 기록 화면 ('14:02:01 — 모두 동의'. 퍼즐을 풀어도 바뀌지 않는다).
// 가운데: 황동 테두리 안의 6×6 봉인 격자. 흰 봉인판들 사이에 붉은 원본 카세트가 갇혀 있고, 오른쪽에 배출구가 은은하게 빛난다.
// 격자는 2D 조작판과 같은 배치를 보여 준다. 장치 전체가 하나의 대상이고, 다가가 조작하면 2D 조작판으로 확대된다.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Lang } from "@/data/site";
import { Tap, type TapFn } from "./parts";
import { signTexture } from "./textures";
import { AUDIT_MACHINE, AUDIT_GRID, GUARANTOR } from "./zones";
import { auditRt } from "./auditRuntime";
import { CASSETTE, EXIT_ROW, LAYOUT, SIZE } from "./sealPuzzle";
import { OFFICIAL_RECORD, ORIGINAL_RECORD, RECORD_TIME } from "./recordAudit";
import { player } from "./Player";
import { auditUi } from "./story";

const IRON = "#22252a";
const IRON_EDGE = "#33363c";
const BRASS = "#bc985c";
const WOOD = "#4d3327";
const WOOD_DARK = "#2c1a10";
const PLATE = "#e4e7e2";
const RED = "#c8281e";
const ACCEPT = "#1f9e6e";

const { x: GX, y: GY, z: GZ, size: GS } = AUDIT_GRID;
const CELL = GS / SIZE;

function useTex(make: () => THREE.Texture, key: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(make, key);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

const on = () => auditRt.phase !== "dormant";
const since = (t: number) => (t ? (performance.now() - t) / 1000 : 99);

function Body({ lang }: { lang: Lang }) {
  const ko = lang === "ko";
  const plaque = useTex(() => signTexture([[ko ? auditUi.machine.ko : auditUi.machine.en.toUpperCase(), 1]], { color: "#e6ca9e", bg: "#2b201a", w: 720, h: 124, border: true }), [ko]);
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.72, 0.84, 0.82]} />
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.8, 0.12, 0.88]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.86, 0.02]}>
        <boxGeometry args={[1.78, 0.04, 0.86]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.6, -0.3]} castShadow>
        <boxGeometry args={[1.72, 1.5, 0.08]} />
        <meshStandardMaterial color={IRON} metalness={0.55} roughness={0.5} />
      </mesh>
      {[-0.84, 0.84].map((x) => (
        <mesh key={x} position={[x, 1.6, -0.14]}>
          <boxGeometry args={[0.08, 1.5, 0.3]} />
          <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 2.38, -0.16]}>
        <boxGeometry args={[1.8, 0.1, 0.36]} />
        <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh position={[0, 2.38, 0.025]}>
        <planeGeometry args={[0.9, 0.16]} />
        <meshStandardMaterial map={plaque} roughness={0.7} />
      </mesh>
    </group>
  );
}

// 도시가 덧붙인 흰 화면: 공식 기록. 어떤 단계에서도 '모두 동의'다
function OfficialScreen({ lang }: { lang: Lang }) {
  const ko = lang === "ko";
  const tex = useTex(
    () =>
      signTexture(
        [
          [ko ? `${auditUi.officialTitle.ko} · ${auditUi.officialTitle.en}` : auditUi.officialTitle.en, 0.55],
          [`${RECORD_TIME} — ✓ ${ko ? OFFICIAL_RECORD.ko : OFFICIAL_RECORD.en}`, 1],
        ],
        { color: ACCEPT, bg: "#eef2ee", w: 768, h: 240 }
      ),
    [ko]
  );
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const t = since(auditRt.poweredAt);
    // 켜지는 순간 두어 번 깜빡인다
    const boot = auditRt.poweredAt && t < 0.7 ? (Math.sin(t * 40) > 0 ? 1 : 0.3) : 1;
    const focus = auditRt.focus === "official" ? 1 : 0;
    const k = on() ? (0.78 + focus * 0.22) * boot : 0.12;
    if (mat.current) mat.current.color.setScalar(k);
    if (light.current) light.current.intensity = on() ? 0.5 + focus * 1.4 : 0;
  });
  return (
    <group position={[0, 2.02, -0.24]}>
      <mesh>
        <boxGeometry args={[1.22, 0.46, 0.05]} />
        <meshStandardMaterial color="#d9dfda" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.028]}>
        <planeGeometry args={[1.12, 0.36]} />
        <meshBasicMaterial ref={mat} map={tex} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0, 0.45]} color="#dcffe9" intensity={0} distance={1.8} decay={2} />
    </group>
  );
}

// 격자 칸 → 장치 좌표 (판의 가운데)
function cellCenter(axis: "h" | "v", len: number, row: number, col: number, at: number) {
  const c = axis === "h" ? at + len / 2 : col + 0.5;
  const r = axis === "h" ? row + 0.5 : at + len / 2;
  return [-GS / 2 + c * CELL, GS / 2 - r * CELL] as const;
}

// 봉인 격자: 2D 조작판과 같은 배치. 판은 저장된 위치로 부드럽게 미끄러진다
function SealGrid({ lang, solved }: { lang: Lang; solved: boolean }) {
  const ko = lang === "ko";
  const sign = useTex(
    () => signTexture([[ko ? (solved ? `${auditUi.readSign.ko} · ${RECORD_TIME} ${ORIGINAL_RECORD.ko}` : auditUi.sealedSign.ko) : solved ? `${auditUi.readSign.en} · ${RECORD_TIME} ${ORIGINAL_RECORD.en}` : auditUi.sealedSign.en, 1]], { color: solved ? "#ff6a52" : "#e8c98a", bg: "#1b120c", w: 768, h: 96, mono: !ko }),
    [ko, solved]
  );
  const pieces = useRef<Record<string, THREE.Group | null>>({});
  const shown = useRef<Record<string, number>>({});
  const cassetteMat = useRef<THREE.MeshStandardMaterial>(null);
  const exitMat = useRef<THREE.MeshStandardMaterial>(null);
  const exitLight = useRef<THREE.PointLight>(null);
  const signMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st, dt) => {
    const lit = on();
    const sealedFocus = auditRt.focus === "sealed";
    const ejected = solved || auditRt.ejectedAt > 0;
    for (const p of LAYOUT) {
      const g = pieces.current[p.id];
      if (!g) continue;
      const target = auditRt.pos[p.id] ?? (p.axis === "h" ? p.col : p.row);
      const cur = shown.current[p.id] ?? target;
      const next = cur + (target - cur) * Math.min(1, dt * 12);
      shown.current[p.id] = next;
      const [x, y] = cellCenter(p.axis, p.len, p.row, p.col, next);
      g.position.set(x, y, 0);
      // 꺼낸 원본은 배출구 밖 받침에 놓인다
      if (p.id === CASSETTE) {
        g.visible = !ejected;
      }
    }
    const pulse = 0.5 + Math.sin(st.clock.elapsedTime * 3) * 0.5;
    if (cassetteMat.current) cassetteMat.current.emissiveIntensity = lit ? (sealedFocus ? 0.5 + pulse * 0.7 : 0.22) : 0.05;
    const exitK = lit ? (ejected ? 1.3 : sealedFocus ? 0.8 + pulse * 0.8 : 0.55 + Math.sin(st.clock.elapsedTime * 1.9) * 0.15) : 0;
    if (exitMat.current) exitMat.current.emissiveIntensity = exitK;
    if (exitLight.current) exitLight.current.intensity = exitK * 0.9;
    if (signMat.current) signMat.current.color.setScalar(lit ? (sealedFocus ? 1 : 0.8) : 0.15);
  });
  const [ex, ey] = cellCenter("h", 1, EXIT_ROW, 0, SIZE);
  return (
    <group position={[GX, GY, GZ]}>
      {/* 황동 테두리와 검은 철판 */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[GS + 0.08, GS + 0.08, 0.03]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[GS, GS]} />
        <meshStandardMaterial color="#141518" metalness={0.4} roughness={0.7} />
      </mesh>
      {LAYOUT.map((p) => {
        const w = (p.axis === "h" ? p.len : 1) * CELL - 0.012;
        const h = (p.axis === "v" ? p.len : 1) * CELL - 0.012;
        const red = p.id === CASSETTE;
        return (
          <group key={p.id} ref={(g) => { pieces.current[p.id] = g; }}>
            <mesh position={[0, 0, 0.014]}>
              <boxGeometry args={[w, h, 0.026]} />
              {red ? (
                <meshStandardMaterial ref={cassetteMat} color={RED} emissive="#ff3a24" emissiveIntensity={0.2} roughness={0.45} />
              ) : (
                <meshStandardMaterial color={PLATE} roughness={0.35} />
              )}
            </mesh>
          </group>
        );
      })}
      {/* 오른쪽 배출구 */}
      <mesh position={[GS / 2 + 0.035, ey, 0.01]}>
        <boxGeometry args={[0.05, CELL * 0.8, 0.04]} />
        <meshStandardMaterial ref={exitMat} color="#1a0f08" emissive="#ffa25a" emissiveIntensity={0} />
      </mesh>
      <pointLight ref={exitLight} position={[GS / 2 + 0.08, ey, 0.2]} color="#ffb36b" intensity={0} distance={1.1} decay={2} />
      {/* 꺼낸 원본: 배출구 밖 받침 위 */}
      <Ejected x={ex + 0.05} y={ey} solved={solved} />
      {/* 표지 */}
      <mesh position={[0, -GS / 2 - 0.09, 0]}>
        <planeGeometry args={[GS + 0.08, 0.075]} />
        <meshBasicMaterial ref={signMat} map={sign} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Ejected({ x, y, solved }: { x: number; y: number; solved: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const out = solved || auditRt.ejectedAt > 0;
    if (!g.current) return;
    g.current.visible = out;
    const k = auditRt.ejectedAt ? Math.min(1, since(auditRt.ejectedAt) / 0.7) : 1;
    g.current.position.set(x + 0.06 + k * 0.1, y - k * 0.02, 0.05);
  });
  return (
    <group ref={g} visible={false}>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[0.24, 0.02, 0.12]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <boxGeometry args={[CELL * 2 - 0.012, CELL - 0.012, 0.026]} />
        <meshStandardMaterial color={RED} emissive="#ff3a24" emissiveIntensity={0.55} roughness={0.45} />
      </mesh>
    </group>
  );
}

export type AuditMachineProps = { lang: Lang; onTap: TapFn; solved: boolean };

export default function AuditMachine({ lang, onTap, solved }: AuditMachineProps) {
  useFrame(() => {
    auditRt.near = Math.hypot(player.pos.x - AUDIT_MACHINE.pos[0], player.pos.z - AUDIT_MACHINE.pos[2]) < 4.6;
  });
  return (
    <group position={AUDIT_MACHINE.pos} rotation={[0, AUDIT_MACHINE.rotY, 0]}>
      <Tap id="audit-machine" onTap={onTap}>
        <Body lang={lang} />
        <OfficialScreen lang={lang} />
        <SealGrid lang={lang} solved={solved} />
      </Tap>
    </group>
  );
}

// 받침대 뒤의 보증 장치 (퍼즐 C 예고). 외형과 표시등뿐이다
export function Guarantor({ lang, litAt }: { lang: Lang; litAt: number }) {
  const ko = lang === "ko";
  const sign = useTex(() => signTexture([[ko ? auditUi.guarantorSign.ko : auditUi.guarantorSign.en, 1]], { color: "#ffd27a", bg: "#1a120a", w: 512, h: 128, glow: true }), [ko]);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const signMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    const lit = auditRt.phase === "done" || (litAt > 0 && performance.now() >= litAt);
    const t = litAt > 0 ? (performance.now() - litAt) / 1000 : 9;
    const k = lit ? (t < 0.8 ? (Math.sin(t * 30) > 0 ? 1 : 0.2) : 0.85 + Math.sin(st.clock.elapsedTime * 1.6) * 0.15) : 0.03;
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
