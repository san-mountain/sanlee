"use client";

// 무명사의 기록 검증 장치 (퍼즐 B 「없었던 3초」).
// 무전수가 지상 검문소에서 떼어 온 도시 인증 단말기(검은 금속)를 낡은 나무 장 위에 얹고 놋쇠로 기워 놓았다.
// 위: 기록 재생 화면 / 가운데: 입력(INPUT)·처리 결과(OUTPUT) 표시창과 표시등 / 앞: 수락·거부 버튼 / 오른쪽: 재생 손잡이 / 왼쪽: 감사 기록함
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { Lang } from "@/data/site";
import { Tap, type TapFn } from "./parts";
import { signTexture } from "./textures";
import { AUDIT_MACHINE, AUDIT_PARTS, GUARANTOR } from "./zones";
import { auditRt } from "./auditRuntime";
import { ACCEPT_COLOR, REJECT_COLOR, ioTexture, relationTexture, slipTexture } from "./auditArt";
import type { AuditChoice, AuditPhase } from "./recordAudit";
import { auditUi } from "./story";

const WOOD = "#4a2c1a";
const WOOD_DARK = "#2c1a10";
const BRASS = "#b48a3c";
const IRON = "#141517";
const IRON_EDGE = "#25272a";

const age = () => (performance.now() - auditRt.since) / 1000;
const powered = () => auditRt.phase !== "dormant";
// 기록지를 꺼낸 뒤 (마무리 중이거나 끝)
const slipOut = (p: AuditPhase) => p === "reading" || p === "ending" || p === "done";
const boxOpen = (p: AuditPhase) => p === "unlock" || p === "slip" || slipOut(p);

function useTex(make: () => THREE.Texture, key: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tex = useMemo(make, key);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

// 몸체: 나무 장, 검은 단말기 함체, 놋쇠 띠, 현판
function Body({ lang }: { lang: Lang }) {
  const plaque = useTex(() => signTexture([[lang === "ko" ? auditUi.machine.ko : auditUi.machine.en.toUpperCase(), 1]], { color: "#e8c98a", bg: "#2b1a0f", w: 768, h: 160, border: true }), [lang]);
  return (
    <group>
      {/* 나무 장 */}
      <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.42, 0.86, 0.8]} />
        <meshStandardMaterial color={WOOD} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.5, 0.12, 0.86]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      {[-0.69, 0.69].map((x) => (
        <mesh key={x} position={[x, 0.45, 0.405]}>
          <boxGeometry args={[0.05, 0.86, 0.02]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      {/* 비스듬한 버튼 받침 */}
      <mesh position={[0, 0.9, 0.2]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[1.42, 0.06, 0.42]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      {/* 검은 금속 단말기 함체 */}
      <mesh position={[0, 1.52, -0.13]} castShadow>
        <boxGeometry args={[1.22, 1.24, 0.42]} />
        <meshStandardMaterial color={IRON} metalness={0.55} roughness={0.5} />
      </mesh>
      {/* 함체 테두리와 놋쇠로 기운 이음매 */}
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 1.52, 0.085]}>
          <boxGeometry args={[0.04, 1.24, 0.03]} />
          <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {[0.93, 1.72].map((y) => (
        <mesh key={y} position={[0, y, 0.09]}>
          <boxGeometry args={[1.26, 0.035, 0.03]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      {[-0.5, -0.17, 0.17, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.93, 0.108]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
      {/* 현판 */}
      <mesh position={[0, 2.22, -0.05]}>
        <boxGeometry args={[1.0, 0.18, 0.06]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.22, -0.018]}>
        <planeGeometry args={[0.94, 0.15]} />
        <meshStandardMaterial map={plaque} roughness={0.7} />
      </mesh>
    </group>
  );
}

// 위쪽 재생 화면: 이산의 마지막 공식 기록 세 줄. 재생하면 한 줄씩 찍히고, 누락 줄은 붉게 깜박인다
function RecordScreen({ lang }: { lang: Lang }) {
  const ko = lang === "ko";
  const lines = auditUi.record;
  const texs = useMemo(
    () => lines.map((l, i) => signTexture([[ko ? l.ko : l.en, 1]], { color: i === 2 ? "#ff6a5f" : "#ffc76a", bg: "#0b0906", w: 768, h: 96, glow: true, mono: !ko, align: "left" })),
    [ko, lines]
  );
  useEffect(() => () => texs.forEach((t) => t.dispose()), [texs]);
  const idle = useTex(() => signTexture([[ko ? "기록 재생 대기 · 손잡이를 돌리십시오" : "STANDBY · TURN THE HANDLE", 1]], { color: "#8d7448", bg: "#0b0906", w: 768, h: 96, mono: !ko }), [ko]);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const idleMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    const p = auditRt.phase;
    const t = st.clock.elapsedTime;
    const on = powered();
    const flick = auditRt.poweredAt && performance.now() - auditRt.poweredAt < 900 ? (Math.sin(t * 40) > 0 ? 1 : 0.2) : 1;
    if (idleMat.current) idleMat.current.opacity = on && p === "idle" ? (0.55 + Math.sin(t * 2.4) * 0.25) * flick : 0;
    const shown = p === "replay" ? Math.min(3, Math.floor(age() / 0.75) + 1) : on && p !== "idle" ? 3 : 0;
    const stopped = p === "ending" || p === "done";
    mats.current.forEach((m, i) => {
      if (!m) return;
      let o = i < shown ? 1 : 0;
      if (i === 2 && o) o = Math.sin(t * 5) > -0.3 ? 1 : 0.35;
      // 장치가 멈추면 화면이 어둡게 식는다
      if (stopped) o *= p === "done" ? 0.22 : Math.max(0.22, 1 - age());
      m.opacity = o * flick;
    });
  });
  return (
    <group position={[0, 1.93, 0.083]}>
      <mesh position={[0, 0, -0.006]}>
        <boxGeometry args={[1.08, 0.4, 0.02]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[1.0, 0.33]} />
        <meshBasicMaterial color="#0b0906" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={[1.0, 0.125]} />
        <meshBasicMaterial ref={idleMat} map={idle} transparent opacity={0} toneMapped={false} />
      </mesh>
      {texs.map((tex, i) => (
        <mesh key={i} position={[0, 0.105 - i * 0.105, 0.008]}>
          <planeGeometry args={[1.0, 0.125]} />
          <meshBasicMaterial ref={(m) => { mats.current[i] = m; }} map={tex} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// 표시창 하나 + 위의 표시등. which = input | output
function IoPanel({ which, x, value, lang }: { which: "input" | "output"; x: number; value: AuditChoice | null; lang: Lang }) {
  const ko = lang === "ko";
  const label = which === "input" ? auditUi.input : auditUi.output;
  const word = value === "accept" ? auditUi.accepted : auditUi.rejected;
  const tex = useTex(() => ioTexture(ko ? label.ko : label.en, ko ? label.en : label.ko, value, ko ? word.ko : word.en), [ko, value, which]);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const color = value === "accept" ? ACCEPT_COLOR : value === "reject" ? REJECT_COLOR : "#3a352c";
  useFrame(() => {
    const p = auditRt.phase;
    // 처리 중에는 결과 창이 잠깐 비었다가 켜진다 (입력은 바로)
    const waiting = which === "output" && p === "processing" && age() < 0.7;
    const on = !!value && !waiting && p !== "dormant";
    const stopped = p === "ending" || p === "done";
    const k = on ? (stopped ? 0.5 : 1) : 0;
    if (lamp.current) lamp.current.emissiveIntensity = k * 2.2;
    if (light.current) light.current.intensity = k * 0.9;
    if (mat.current) mat.current.opacity = p === "dormant" ? 0.15 : waiting ? 0.35 + Math.random() * 0.2 : 1;
  });
  return (
    <group position={[x, 1.33, 0.083]}>
      <mesh position={[0, 0, -0.006]}>
        <boxGeometry args={[0.44, 0.38, 0.02]} />
        <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[0.4, 0.333]} />
        <meshBasicMaterial ref={mat} map={tex} transparent toneMapped={false} />
      </mesh>
      {/* 표시등: 놋쇠 테에 끼운 유리구 */}
      <group position={[0, 0.27, 0.02]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.03, 18]} />
          <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshStandardMaterial ref={lamp} color={value ? color : "#2a2620"} emissive={color} emissiveIntensity={0} toneMapped={false} />
        </mesh>
        <pointLight ref={light} position={[0, 0, 0.18]} color={color} intensity={0} distance={1.6} decay={2} />
      </group>
    </group>
  );
}

// 두 창 사이의 관계 표시: = 일치 / ≠ 불일치
function Relation({ input, output, lang }: { input: AuditChoice | null; output: AuditChoice | null; lang: Lang }) {
  const ko = lang === "ko";
  const rel = input && output ? (input === output ? "match" : "mismatch") : null;
  const word = rel === "mismatch" ? auditUi.mismatch : auditUi.match;
  const tex = useTex(() => relationTexture(rel, ko ? word.ko : word.en), [rel, ko]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    if (!mat.current) return;
    const p = auditRt.phase;
    const hide = p === "dormant" || (p === "processing" && age() < 0.7);
    // 불일치는 깜박이며 시선을 끈다
    const blink = rel === "mismatch" && (p === "processing" || p === "unlock" || p === "slip") ? (Math.sin(st.clock.elapsedTime * 6) > -0.2 ? 1 : 0.4) : 1;
    mat.current.opacity = hide ? 0 : blink;
  });
  return (
    <mesh position={[0, 1.33, 0.09]}>
      <planeGeometry args={[0.15, 0.2]} />
      <meshBasicMaterial ref={mat} map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

// 수락(청록) · 거부(빨강) 물리 버튼. 보이는 버섯 머리보다 훨씬 넓은 투명 판정이 붙어 있다
function TestButton({ kind, lang, onTap }: { kind: AuditChoice; lang: Lang; onTap: TapFn }) {
  const ko = lang === "ko";
  const [x, y, z] = AUDIT_PARTS[kind];
  const color = kind === "accept" ? ACCEPT_COLOR : REJECT_COLOR;
  const label = kind === "accept" ? auditUi.acceptBtn : auditUi.rejectBtn;
  const sign = useTex(
    () => signTexture([[(kind === "accept" ? "✓ " : "✕ ") + (ko ? label.ko : label.en.toUpperCase()), 1]], { color, bg: "#120d08", w: 512, h: 128, glow: true }),
    [ko, kind]
  );
  const cap = useRef<THREE.Mesh>(null);
  const capMat = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((st) => {
    const p = auditRt.phase;
    const t = st.clock.elapsedTime;
    const live = p === "test";
    const since = (performance.now() - auditRt.pressedAt) / 1000;
    const down = auditRt.pressed === kind && since < 0.35 ? 1 - Math.abs(since / 0.175 - 1) : 0;
    if (cap.current) cap.current.position.y = 0.07 - down * 0.04;
    const aimed = live && auditRt.aim === kind;
    if (capMat.current) capMat.current.emissiveIntensity = p === "dormant" ? 0.03 : live ? (aimed ? 1.4 : 0.6) + Math.sin(t * 3 + (kind === "accept" ? 0 : 1.5)) * 0.2 : 0.2;
    if (ring.current) ring.current.emissiveIntensity += ((aimed ? 0.9 : 0) - ring.current.emissiveIntensity) * 0.2;
  });
  return (
    <Tap id={`audit-${kind}`} onTap={onTap}>
      <group position={[x, y, z]} rotation={[0.22, 0, 0]}>
        {/* 넓은 터치 판정 (보이지 않음) */}
        <mesh position={[0, 0.05, 0.02]}>
          <boxGeometry args={[0.52, 0.3, 0.42]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.12, 0.13, 0.04, 28]} />
          <meshStandardMaterial ref={ring} color={BRASS} metalness={0.85} roughness={0.35} emissive={color} emissiveIntensity={0} />
        </mesh>
        <mesh ref={cap} position={[0, 0.07, 0]}>
          <sphereGeometry args={[0.1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial ref={capMat} color={color} roughness={0.25} emissive={color} emissiveIntensity={0.03} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.032, 0.145]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.26, 0.065]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      </group>
    </Tap>
  );
}

// 오른쪽 옆면의 기록 재생 손잡이 (재생하는 동안 돈다)
function Handle({ onTap }: { onTap: TapFn }) {
  const [x, y, z] = AUDIT_PARTS.handle;
  const arm = useRef<THREE.Group>(null);
  const knob = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((st) => {
    const p = auditRt.phase;
    if (arm.current) arm.current.rotation.x = p === "replay" ? -age() * 5 : arm.current.rotation.x;
    if (knob.current) knob.current.emissiveIntensity = p === "idle" ? 0.7 + Math.sin(st.clock.elapsedTime * 4) * 0.35 : 0;
  });
  return (
    <Tap id="audit-handle" onTap={onTap}>
      <group position={[x - 0.1, y, z - 0.15]}>
        <mesh position={[0.08, 0, 0]}>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.06, 22]} />
          <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
        </mesh>
        <group ref={arm} position={[0.05, 0, 0]}>
          <mesh position={[0.01, 0.1, 0]}>
            <boxGeometry args={[0.03, 0.22, 0.045]} />
            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0.07, 0.19, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.13, 12]} />
            <meshStandardMaterial ref={knob} color="#6b3a1e" roughness={0.6} emissive="#ffb54a" emissiveIntensity={0} />
          </mesh>
        </group>
      </group>
    </Tap>
  );
}

// 왼쪽 옆면의 감사 기록함: 경고등, 걸쇠, 위로 들리는 덮개, 그 안에서 올라오는 기록지
function AuditBox({ lang, onTap }: { lang: Lang; onTap: TapFn }) {
  const ko = lang === "ko";
  const [x, y, z] = AUDIT_PARTS.box;
  const slipTex = useTex(() => slipTexture(ko ? auditUi.slipTag.ko : auditUi.slipTag.en, ko ? auditUi.slipLine.ko : auditUi.slipLine.en, ko ? auditUi.slipWho.ko : auditUi.slipWho.en), [ko]);
  const lid = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const slip = useRef<THREE.Group>(null);
  const latch = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    const p = auditRt.phase;
    const t = st.clock.elapsedTime;
    const a = age();
    // 덮개: 잠금이 풀리면 조금 들리고, 기록지를 꺼내면 더 열린 채로 남는다
    const open = p === "unlock" ? Math.min(1, Math.max(0, (a - 0.6) / 0.5)) * 0.45 : p === "slip" ? 0.45 : slipOut(p) ? 1.1 : 0;
    if (lid.current) lid.current.rotation.x += (-open - lid.current.rotation.x) * 0.2;
    if (latch.current) latch.current.rotation.z = boxOpen(p) ? 0.9 : 0;
    // 경고등: 불일치 직후 깜박이고, 기록지를 꺼낼 때까지 호박색으로 숨쉰다
    const warn = p === "unlock" ? (Math.sin(t * 14) > 0 ? 1 : 0.15) : p === "slip" ? 0.6 + Math.sin(t * 4) * 0.4 : slipOut(p) ? 0.25 : 0;
    if (lamp.current) lamp.current.emissiveIntensity = warn * 2.4;
    if (light.current) light.current.intensity = warn * 1.4;
    // 기록지: 덮개 틈으로 끝이 보이다가, 꺼내면 위로 쭉 올라온다
    const rise = p === "slip" ? 0.06 + Math.sin(t * 3) * 0.01 : p === "unlock" ? Math.min(1, Math.max(0, (a - 1) / 0.6)) * 0.06 : slipOut(p) ? 0.3 : 0;
    if (slip.current) {
      slip.current.position.y += (0.12 + rise - slip.current.position.y) * 0.15;
      slip.current.visible = boxOpen(p);
    }
  });
  return (
    <Tap id="audit-box" onTap={onTap}>
      <group position={[x, y, z]}>
        {/* 넓은 터치 판정 */}
        <mesh position={[-0.04, 0.12, 0.05]}>
          <boxGeometry args={[0.42, 0.62, 0.62]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        {/* 함 */}
        <mesh>
          <boxGeometry args={[0.26, 0.4, 0.42]} />
          <meshStandardMaterial color="#2a2722" metalness={0.6} roughness={0.45} />
        </mesh>
        {/* 놋쇠 모서리 */}
        {[-0.2, 0.2].map((zz) => (
          <mesh key={zz} position={[0, 0, zz]}>
            <boxGeometry args={[0.27, 0.41, 0.025]} />
            <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        {/* 기록지 (덮개 아래에서 올라온다) */}
        <group ref={slip} position={[-0.01, 0.12, 0.02]} visible={false}>
          <mesh>
            <planeGeometry args={[0.22, 0.28]} />
            <meshBasicMaterial map={slipTex} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
        {/* 덮개: 바깥 모서리에 경첩 */}
        <group position={[0, 0.2, -0.21]}>
          <group ref={lid}>
            <mesh position={[0, 0.012, 0.21]}>
              <boxGeometry args={[0.28, 0.025, 0.44]} />
              <meshStandardMaterial color="#34302a" metalness={0.65} roughness={0.4} />
            </mesh>
          </group>
        </group>
        {/* 걸쇠와 경고등 (앞면) */}
        <mesh ref={latch} position={[0, 0.14, 0.222]}>
          <boxGeometry args={[0.08, 0.03, 0.02]} />
          <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
        </mesh>
        <group position={[0, 0.0, 0.225]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <sphereGeometry args={[0.036, 14, 10]} />
            <meshStandardMaterial ref={lamp} color="#ffb03a" emissive="#ffa12a" emissiveIntensity={0} toneMapped={false} />
          </mesh>
          <pointLight ref={light} position={[0, 0, 0.2]} color="#ffa12a" intensity={0} distance={1.8} decay={2} />
        </group>
      </group>
    </Tap>
  );
}

export default function AuditMachine({ lang, input, output, onTap }: { lang: Lang; input: AuditChoice | null; output: AuditChoice | null; onTap: TapFn }) {
  const camera = useThree((s) => s.camera);
  const root = useRef<THREE.Group>(null);
  const inv = useMemo(() => new THREE.Matrix4(), []);
  const tmp = useMemo(() => ({ o: new THREE.Vector3(), d: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  const marks = useMemo(() => Object.entries(AUDIT_PARTS).map(([id, v]) => [id, new THREE.Vector3(...v)] as const), []);
  // 바라보는 버튼 찾기: 시선을 장치 앞(버튼 높이의 세로 판)에 쏘아 맞은 좌우로 고른다
  useFrame(() => {
    const g = root.current;
    if (!g) return;
    for (const [id, v] of marks) {
      tmp.p.copy(v).applyMatrix4(g.matrixWorld).project(camera);
      auditRt.screen[id] = tmp.p.z < 1 ? [(tmp.p.x + 1) / 2, (1 - tmp.p.y) / 2] : [-1, -1];
    }
    inv.copy(g.matrixWorld).invert();
    tmp.o.copy(camera.position).applyMatrix4(inv);
    camera.getWorldDirection(tmp.d);
    tmp.d.transformDirection(inv);
    if (tmp.d.z < -0.05) {
      const t = (0.24 - tmp.o.z) / tmp.d.z;
      const x = tmp.o.x + tmp.d.x * t;
      if (t > 0 && Math.abs(x) < 1.4) auditRt.aim = x < 0 ? "accept" : "reject";
    }
  });
  return (
    <group ref={root} position={AUDIT_MACHINE.pos} rotation={[0, AUDIT_MACHINE.rotY, 0]}>
      <Body lang={lang} />
      <RecordScreen lang={lang} />
      <IoPanel which="input" x={-0.33} value={input} lang={lang} />
      <IoPanel which="output" x={0.33} value={output} lang={lang} />
      <Relation input={input} output={output} lang={lang} />
      <TestButton kind="accept" lang={lang} onTap={onTap} />
      <TestButton kind="reject" lang={lang} onTap={onTap} />
      <Handle onTap={onTap} />
      <AuditBox lang={lang} onTap={onTap} />
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
      {/* 비어 있는 손바닥 자리 두 개: 보증인이 손을 얹을 곳 */}
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
