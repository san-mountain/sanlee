"use client";

// 퍼즐 B 「되감긴 3초」 v0.6: 무명사의 기록 기계.
// 왼쪽 릴 = 원본 기록(낡은 나무·놋쇠), 오른쪽 릴 = 공식 기록(도시의 흰 플라스틱·초록 띠).
// 각 릴에서 종이가 판독창으로 내려온다. 공식 쪽 종이에는 도장이 계속 '동의'를 찍는다.
// 왼쪽 제동 레버 = 자동 운전 정지. 두 릴 앞을 가로지르는 축 위의 작은 기어(연결 장치) = 어느 릴이 수동 바퀴에 물렸는지.
// 오른쪽 아래 큰 바퀴 = 물린 릴을 1초씩 되감는다. 설명 글 대신 기어가 맞물리고 릴과 종이가 실제로 움직인다.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { Lang } from "@/data/site";
import { Tap, type TapFn } from "./parts";
import { signTexture } from "./textures";
import { AUDIT_MACHINE, GUARANTOR, AUDIT_PARTS } from "./zones";
import { auditRt, type AuditPart } from "./auditRuntime";
import { ACCEPT_COLOR, REJECT_COLOR, frameTexture, tapeTexture, wheelFaceTexture } from "./auditArt";
import { FRAMES, type Reel } from "./recordAudit";
import { player } from "./Player";
import { sfx } from "./sfx";
import { auditUi } from "./story";

const IRON = "#22252a";
const IRON_EDGE = "#33363c";
const BRASS = "#bc985c";
const WOOD = "#4d3327";
const WOOD_DARK = "#2c1a10";
const CITY = "#e9efeb";

const REEL_Y = 1.86;
const REEL_R = 0.3;
const REEL_X: Record<Reel, number> = { original: -0.45, official: 0.45 };
const WINDOW_Y = 1.2;
const RAIL_Y = REEL_Y - 0.16; // 연결 기어가 오가는 축 (두 릴의 허브 기어 바로 아래)
const STEP_S = 0.75; // 바퀴 한 번에 되감는 시간
const STAMP_PERIOD = 1.5;
const ROD_X = 0.78; // 바퀴와 위 축을 잇는 세로 축 (오른쪽 판독창 바깥)

const now = () => performance.now();
const since = (t: number) => (t ? (now() - t) / 1000 : 99);
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function useTex(make: () => THREE.Texture, key: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(make, key);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// 지금 움직이는 중인 칸의 진행도(0~1). 되감기는 STEP_S 동안 이어진다
const windK = () => (auditRt.moved === "wheel" ? ease(since(auditRt.movedAt) / STEP_S) : 1);
// 부품의 은은한 반응: 가까이 있을 때 지금 쓸 수 있는 부품만, 조준하면 조금 더
function glow(part: AuditPart) {
  const p = auditRt.phase;
  const usable = part === "brake" ? p === "auto" : p === "manual";
  if (!usable || !auditRt.near) return 0;
  return auditRt.aim === part ? 0.75 : 0.28;
}
// 걸려서 덜컥 흔들리는 양
const jolt = (part: AuditPart) => (auditRt.jammed === part ? Math.sin(since(auditRt.jammedAt) * 60) * Math.exp(-since(auditRt.jammedAt) * 7) : 0);

// 투명한 넓은 판정 (모바일 탭·PC 조준). 보이는 부품보다 넉넉하다
function Hit({ size, register, part }: { size: [number, number, number]; register: (p: AuditPart, m: THREE.Mesh | null) => void; part: AuditPart }) {
  return (
    <mesh ref={(m) => register(part, m)}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

function Body({ lang }: { lang: Lang }) {
  const ko = lang === "ko";
  const plaque = useTex(() => signTexture([[ko ? auditUi.machine.ko : auditUi.machine.en.toUpperCase(), 1]], { color: "#e6ca9e", bg: "#2b201a", w: 720, h: 124, border: true }), [ko]);
  return (
    <group>
      {/* 나무 장 */}
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
      {/* 검은 철 뒤판과 기둥 */}
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
      {/* 현판 */}
      <mesh position={[0, 2.38, 0.025]}>
        <planeGeometry args={[0.9, 0.16]} />
        <meshStandardMaterial map={plaque} roughness={0.7} />
      </mesh>
    </group>
  );
}

// 릴 하나: 허브 기어, 살, 감긴 종이. 공식 = 도시의 흰 플라스틱·초록 띠, 원본 = 낡은 나무·붉은 띠
function ReelUnit({ reel, lang, pos, solved }: { reel: Reel; lang: Lang; pos: number; solved: boolean }) {
  const ko = lang === "ko";
  const official = reel === "official";
  const x = REEL_X[reel];
  const name = official ? auditUi.reelOfficial : auditUi.reelOriginal;
  const sign = useTex(() => signTexture([[ko ? `${name.ko} · ${name.en}` : name.en, 1]], { color: official ? "#1e7a58" : "#e8c98a", bg: official ? "#e9efeb" : "#2b1a0f", w: 512, h: 96, mono: !ko }), [ko, official]);
  const frame = FRAMES[reel][pos];
  const frameTex = useTex(() => frameTexture(reel, frame, ko ? frame.word.ko : frame.word.en, solved && !official), [reel, pos, ko, solved]);
  const tape = useTex(() => tapeTexture(reel), [reel]);
  const spin = useRef<THREE.Group>(null);
  const windowMat = useRef<THREE.MeshBasicMaterial>(null);
  const back = useRef<THREE.PointLight>(null);
  const shown = useRef(pos);
  const autoT = useRef(0);
  useFrame((_, dt) => {
    const p = auditRt.phase;
    const running = p === "auto";
    // 되감은 칸 수만큼 반시계로 (되감기). 자동 운전 중 공식 릴은 앞으로 천천히 감긴다
    const winding = auditRt.moved === "wheel" && auditRt.link === reel ? windK() : 1;
    const target = auditRt.pos[reel];
    if (winding >= 1) shown.current = target;
    const cur = winding < 1 ? target - 1 + winding : shown.current;
    if (running && official) autoT.current += dt;
    const ang = cur * 2.1 - autoT.current * 1.2;
    if (spin.current) spin.current.rotation.z = ang;
    tape.offset.y = cur * 0.25 - autoT.current * 0.35;
    const linked = auditRt.link === reel && (p === "manual" || p === "moving");
    const lit = p === "dormant" ? 0.25 : solved && !official ? 1.15 : linked ? 1 : 0.62;
    // 되감는 동안 판독창이 지직거린다
    const flick = winding < 1 ? 0.55 + Math.random() * 0.3 : 1;
    if (windowMat.current) windowMat.current.color.setScalar(Math.min(1, lit) * flick);
    if (back.current) back.current.intensity = (solved && !official ? 2.6 : linked ? 0.9 : 0.2) * (p === "dormant" ? 0 : 1);
  });
  const rim = official ? CITY : "#5a3a22";
  const band = official ? ACCEPT_COLOR : REJECT_COLOR;
  return (
    <group position={[x, 0, 0]}>
      {/* 이름판 */}
      <mesh position={[0, REEL_Y + REEL_R + 0.1, -0.05]}>
        <planeGeometry args={[0.42, 0.08]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* 회전하는 릴 */}
      <group position={[0, REEL_Y, -0.08]}>
        <group ref={spin}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[REEL_R, REEL_R, 0.03, 32]} />
            <meshStandardMaterial color={rim} roughness={official ? 0.3 : 0.7} metalness={official ? 0.05 : 0.2} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]}>
            <cylinderGeometry args={[REEL_R * 0.72, REEL_R * 0.72, 0.09, 28]} />
            <meshStandardMaterial color={official ? "#f4f6f0" : "#d9cdb0"} roughness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.12]}>
            <torusGeometry args={[REEL_R - 0.02, 0.018, 8, 32]} />
            <meshStandardMaterial color={band} emissive={band} emissiveIntensity={0.25} />
          </mesh>
          {/* 살 셋: 돌고 있는지 바로 보인다 */}
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0, 0, 0.115]} rotation={[0, 0, (k * Math.PI * 2) / 3]}>
              <boxGeometry args={[0.05, REEL_R * 1.4, 0.02]} />
              <meshStandardMaterial color={official ? "#c9d4cf" : BRASS} metalness={official ? 0.1 : 0.8} roughness={0.4} />
            </mesh>
          ))}
          {/* 허브 기어 (연결 기어가 이 아래에서 물린다) */}
          <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.04, 12]} />
            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      </group>
      {/* 릴에서 판독창으로 내려오는 종이 */}
      <mesh position={[0, (REEL_Y - REEL_R * 0.72 + WINDOW_Y + 0.15) / 2, 0.02]}>
        <planeGeometry args={[0.2, REEL_Y - REEL_R * 0.72 - WINDOW_Y - 0.15]} />
        <meshStandardMaterial map={tape} roughness={0.9} />
      </mesh>
      {/* 판독창 */}
      <mesh position={[0, WINDOW_Y, 0.03]}>
        <boxGeometry args={[0.5, 0.34, 0.05]} />
        <meshStandardMaterial color={official ? "#c9d4cf" : IRON_EDGE} metalness={official ? 0.1 : 0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, WINDOW_Y, 0.058]}>
        <planeGeometry args={[0.44, 0.275]} />
        <meshBasicMaterial ref={windowMat} map={frameTex} toneMapped={false} />
      </mesh>
      <pointLight ref={back} position={[0, WINDOW_Y, 0.4]} color={official ? "#d8ffe9" : "#ffd9b8"} intensity={0} distance={1.6} decay={2} />
    </group>
  );
}

// 도장: 공식 종이 위에서 앞뒤로 내려찍는다. 제동하면 위로 들린 채 멈춘다
function Stamp() {
  const head = useRef<THREE.Group>(null);
  const ink = useRef<THREE.MeshStandardMaterial>(null);
  const lastBeat = useRef(-1);
  const t0 = useRef(now());
  useFrame(() => {
    const p = auditRt.phase;
    let k = 0; // 0 = 들림, 1 = 종이에 닿음
    if (p === "auto") {
      const t = (now() - t0.current) / 1000 / STAMP_PERIOD;
      const f = t % 1;
      k = f < 0.12 ? f / 0.12 : f < 0.2 ? 1 : f < 0.45 ? 1 - (f - 0.2) / 0.25 : 0;
      const beat = Math.floor(t);
      if (f > 0.12 && beat !== lastBeat.current) {
        lastBeat.current = beat;
        if (Math.hypot(player.pos.x - AUDIT_MACHINE.pos[0], player.pos.z - AUDIT_MACHINE.pos[2]) < 9) sfx.stamp();
      }
    } else if (p === "dormant") k = 0.2;
    if (head.current) head.current.position.z = 0.46 - k * 0.32 + (p === "auto" ? 0 : 0.06);
    if (ink.current) ink.current.emissiveIntensity = p === "auto" ? 0.25 + k * 0.6 : 0.05;
  });
  const x = REEL_X.official;
  const y = (REEL_Y - REEL_R * 0.72 + WINDOW_Y + 0.15) / 2;
  return (
    <group position={[x, y, 0]}>
      {/* 오른쪽 기둥에서 나온 철 팔 */}
      <mesh position={[0.3, 0.12, 0.38]}>
        <boxGeometry args={[0.36, 0.05, 0.05]} />
        <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.45} />
      </mesh>
      <group ref={head} position={[0, 0, 0.46]}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.04, 0.2, 0.04]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[0.22, 0.14, 0.1]} />
          <meshStandardMaterial color="#e9efeb" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -0.095]}>
          <boxGeometry args={[0.2, 0.12, 0.012]} />
          <meshStandardMaterial ref={ink} color={ACCEPT_COLOR} emissive={ACCEPT_COLOR} emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  );
}

// 제동 레버 (왼쪽): 서 있으면 자동 운전, 앞으로 당겨 내리면 정지
function Brake({ onTap, register }: { onTap: TapFn; register: (p: AuditPart, m: THREE.Mesh | null) => void }) {
  const [x, y, z] = AUDIT_PARTS.brake;
  const arm = useRef<THREE.Group>(null);
  const knob = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const down = auditRt.braked ? (auditRt.moved === "brake" ? ease(since(auditRt.movedAt) / 0.6) : 1) : 0;
    if (arm.current) arm.current.rotation.x = -0.25 + down * 1.35 + jolt("brake") * 0.05;
    if (knob.current) knob.current.emissiveIntensity = glow("brake");
  });
  return (
    <Tap id="audit-brake" onTap={onTap}>
      <group position={[x, y, z]}>
        <group position={[0, 0.25, 0.05]}>
          <Hit part="brake" register={register} size={[0.36, 0.75, 0.6]} />
        </group>
        {/* 축받이 */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.12, 16]} />
          <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
        </mesh>
        <group ref={arm}>
          <mesh position={[0, 0.27, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.54, 10]} />
            <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.56, 0]}>
            <sphereGeometry args={[0.07, 16, 12]} />
            <meshStandardMaterial ref={knob} color="#b0261c" roughness={0.45} emissive="#ff6a4a" emissiveIntensity={0} />
          </mesh>
        </group>
      </group>
    </Tap>
  );
}

// 연결 장치: 두 릴 앞을 가로지르는 사각 축 위의 작은 기어와 손잡이. 물린 릴의 허브 기어 바로 아래에 있다
function Link({ onTap, register }: { onTap: TapFn; register: (p: AuditPart, m: THREE.Mesh | null) => void }) {
  const carriage = useRef<THREE.Group>(null);
  const pinion = useRef<THREE.Mesh>(null);
  const rail = useRef<THREE.Mesh>(null);
  const grip = useRef<THREE.MeshStandardMaterial>(null);
  const from = useRef(auditRt.link);
  const xNow = useRef(REEL_X[auditRt.link]);
  useFrame(() => {
    const to = auditRt.link;
    let x = REEL_X[to];
    if (auditRt.moved === "link") {
      const k = ease(since(auditRt.movedAt) / 0.7);
      x = REEL_X[from.current] + (REEL_X[to] - REEL_X[from.current]) * k;
      if (k >= 1) from.current = to;
    } else from.current = to;
    x += jolt("link") * 0.02;
    xNow.current = x;
    if (carriage.current) carriage.current.position.x = x;
    // 바퀴를 돌리는 동안 축과 기어가 함께 돈다
    const turning = auditRt.moved === "wheel" && windK() < 1 ? since(auditRt.movedAt) : 0;
    if (pinion.current) pinion.current.rotation.z = -turning * 9 - auditRt.pos[to] * 2.1 * 3.3;
    if (rail.current) rail.current.rotation.x = turning * 9;
    if (grip.current) grip.current.emissiveIntensity = glow("link");
  });
  return (
    <group position={[0, RAIL_Y, 0.07]}>
      {/* 사각 축 (바퀴와 이어져 함께 돈다) */}
      <mesh ref={rail} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.035, 1.62, 0.035]} />
        <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
      </mesh>
      <Tap id="audit-link" onTap={onTap}>
        <group ref={carriage}>
          <group position={[0, -0.08, 0.15]}>
            <Hit part="link" register={register} size={[0.36, 0.42, 0.42]} />
          </group>
          {/* 연결 기어: 위의 허브 기어와 맞물린다 */}
          <mesh ref={pinion} position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.05, 10]} />
            <meshStandardMaterial color="#d8b46a" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* 축을 감싼 집과 앞으로 나온 T자 손잡이 */}
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.12, 0.08, 0.06]} />
            <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.09, 0.14]} rotation={[0.9, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.26, 8]} />
            <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.17, 0.25]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.2, 12]} />
            <meshStandardMaterial ref={grip} color="#6b3a1e" roughness={0.6} emissive="#ffb54a" emissiveIntensity={0} />
          </mesh>
        </group>
      </Tap>
    </group>
  );
}

// 수동 바퀴 (오른쪽 아래): 한 번 누르면 반시계로 한 바퀴 = 연결된 릴을 1초 되감는다. 세로 축으로 위의 사각 축과 이어진다
function Wheel({ onTap, register }: { onTap: TapFn; register: (p: AuditPart, m: THREE.Mesh | null) => void }) {
  const [x, y, z] = AUDIT_PARTS.wheel;
  const face = useTex(() => wheelFaceTexture(), []);
  const wheel = useRef<THREE.Group>(null);
  const rod = useRef<THREE.Mesh>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const turned = auditRt.pos.official + auditRt.pos.original;
    const k = auditRt.moved === "wheel" ? windK() : 1;
    const ang = (turned - 1 + k) * Math.PI * 2 + jolt("wheel") * 0.12;
    if (wheel.current) wheel.current.rotation.z = ang;
    if (rod.current) rod.current.rotation.y = ang;
    if (rimMat.current) rimMat.current.emissiveIntensity = glow("wheel");
  });
  return (
    <group>
      {/* 바퀴에서 위 축까지 올라가는 세로 축 */}
      <mesh ref={rod} position={[ROD_X, (y + RAIL_Y) / 2, 0.07]}>
        <boxGeometry args={[0.035, RAIL_Y - y, 0.035]} />
        <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
      </mesh>
      {[y, RAIL_Y].map((yy) => (
        <mesh key={yy} position={[ROD_X, yy, 0.07]}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color={IRON_EDGE} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <Tap id="audit-wheel" onTap={onTap}>
        <group position={[x, y, z]}>
          <Hit part="wheel" register={register} size={[0.66, 0.66, 0.3]} />
          <group ref={wheel}>
            <mesh>
              <torusGeometry args={[0.24, 0.028, 10, 32]} />
              <meshStandardMaterial ref={rimMat} color={BRASS} metalness={0.8} roughness={0.35} emissive="#ffb54a" emissiveIntensity={0} />
            </mesh>
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} rotation={[0, 0, (k * Math.PI) / 4 + Math.PI / 8]}>
                <boxGeometry args={[0.025, 0.46, 0.02]} />
                <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
              </mesh>
            ))}
            {/* 돌리는 손잡이 */}
            <mesh position={[0.22, 0.1, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.12, 10]} />
              <meshStandardMaterial color="#6b3a1e" roughness={0.6} />
            </mesh>
          </group>
          {/* 가운데 판: 반시계 화살표 = 되감기 */}
          <mesh position={[0, 0, 0.02]}>
            <circleGeometry args={[0.085, 24]} />
            <meshBasicMaterial map={face} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.16, 10]} />
            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      </Tap>
    </group>
  );
}

export type AuditMachineProps = { lang: Lang; onTap: TapFn; braked: boolean; link: Reel; pos: Record<Reel, number>; solved: boolean };

export default function AuditMachine({ lang, onTap, pos, solved }: AuditMachineProps) {
  const camera = useThree((s) => s.camera);
  const root = useRef<THREE.Group>(null);
  const hits = useRef<Partial<Record<AuditPart, THREE.Mesh>>>({});
  const register = useMemo(() => (p: AuditPart, m: THREE.Mesh | null) => {
    if (m) hits.current[p] = m;
    else delete hits.current[p];
  }, []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  // 화면 가운데가 향한 부품: 투명 판정 상자에 시선을 쏜다. 빗나가면 화면 가운데에 가장 가까운 부품(넉넉하게)
  useFrame(() => {
    const dist = Math.hypot(player.pos.x - AUDIT_MACHINE.pos[0], player.pos.z - AUDIT_MACHINE.pos[2]);
    auditRt.near = dist < 4.6;
    const g = root.current;
    if (!g) return;
    let aim: AuditPart | null = null;
    if (auditRt.near) {
      ray.setFromCamera(center, camera);
      let best = Infinity;
      for (const [p, m] of Object.entries(hits.current) as [AuditPart, THREE.Mesh][]) {
        const hit = ray.intersectObject(m, false)[0];
        if (hit && hit.distance < best) {
          best = hit.distance;
          aim = p;
        }
      }
      if (!aim) {
        let bestD = 0.16;
        for (const [p, m] of Object.entries(hits.current) as [AuditPart, THREE.Mesh][]) {
          m.getWorldPosition(tmp).project(camera);
          const d = Math.hypot(tmp.x, tmp.y) / 2;
          if (tmp.z < 1 && d < bestD) {
            bestD = d;
            aim = p;
          }
        }
      }
    }
    auditRt.aim = aim;
    for (const [p, m] of Object.entries(hits.current) as [AuditPart, THREE.Mesh][]) {
      m.getWorldPosition(tmp).project(camera);
      auditRt.screen[p] = tmp.z < 1 ? [(tmp.x + 1) / 2, (1 - tmp.y) / 2] : [-1, -1];
    }
  });
  return (
    <group ref={root} position={AUDIT_MACHINE.pos} rotation={[0, AUDIT_MACHINE.rotY, 0]}>
      <Body lang={lang} />
      <ReelUnit reel="original" lang={lang} pos={pos.original} solved={solved} />
      <ReelUnit reel="official" lang={lang} pos={pos.official} solved={solved} />
      <Stamp />
      <Brake onTap={onTap} register={register} />
      <Link onTap={onTap} register={register} />
      <Wheel onTap={onTap} register={register} />
      {/* 원본이 드러나면 위에서 비추는 작업등 */}
      <RevealLight />
    </group>
  );
}

function RevealLight() {
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(REEL_X.original, WINDOW_Y, 0.05);
    return o;
  }, []);
  useFrame(() => {
    const p = auditRt.phase;
    const on = p === "reveal" || p === "done";
    if (light.current) light.current.intensity += ((on ? 14 : 0) - light.current.intensity) * 0.08;
  });
  return (
    <>
      <primitive object={target} />
      <spotLight ref={light} position={[REEL_X.original, 2.9, 1.1]} target={target} angle={0.32} penumbra={0.6} intensity={0} distance={4} color="#ffe6c8" />
    </>
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
