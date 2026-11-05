"use client";

// 방공호의 얼굴 복원 장치. 놋쇠 축에 꿴 나무 원통 세 개(위·가운데·아래)가 한 얼굴을 나눠 들고 있다.
// 손잡이를 돌리면 원통이 한 면씩 돌아가 걸린다. 맞는 조각끼리 만나면 이음매의 외곽선이 금빛으로 이어진다.
// 터미널 셋을 모두 연 뒤에야 돌아간다 (그 전에는 등이 꺼진 채 서 있다).
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { Lang } from "@/data/site";
import { Tap, type TapFn } from "./parts";
import { signTexture } from "./textures";
import { FACE_MACHINE, machinePoint } from "./zones";
import { faceRt, type FacePhase } from "./faceRuntime";
import { drumTexture, seamPoints, smileTexture } from "./faceArt";
import { FACES, seamJoined, type Drums, type FaceMethod } from "./faceAuth";
import { player } from "./Player";
import { sfx } from "./sfx";
import { faceUi } from "./story";

const R = 0.36; // 원통 반지름
const DH = 0.5; // 원통 높이
const STEP = 0.53; // 원통 사이 간격 (놋쇠 테 포함)
export const DRUM_Y = [2.24, 2.24 - STEP, 2.24 - STEP * 2];
const SEAM_Y = [(DRUM_Y[0] + DRUM_Y[1]) / 2, (DRUM_Y[1] + DRUM_Y[2]) / 2];
const TURN = (Math.PI * 2) / FACES;
const SPIN = 0.45; // 한 칸 도는 시간(초)

const WOOD = "#4a2c1a";
const WOOD_DARK = "#2c1a10";
const BRASS = "#b48a3c";

const easeOutBack = (x: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// 원통 겉면을 따라 휘어진 금빛 선 (이음매의 외곽선이 이어졌을 때)
function arcGeometry(t0: number, t1: number, r: number, tube: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = t0 + ((t1 - t0) * i) / 16;
    pts.push(new THREE.Vector3(Math.sin(t) * r, 0, Math.cos(t) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, tube, 6, false);
}

function useCanvasSign(lines: [string, number][], opt: Parameters<typeof signTexture>[1]) {
  const key = JSON.stringify([lines, opt]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tex = useMemo(() => signTexture(lines, opt), [key]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Drum({ i, value, onTap }: { i: number; value: number; onTap: TapFn }) {
  const tex = useMemo(() => drumTexture(i), [i]);
  useEffect(() => () => tex.dispose(), [tex]);
  const group = useRef<THREE.Group>(null);
  const crank = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  const knob = useRef<THREE.MeshStandardMaterial>(null);
  // 지금까지 돌린 칸 수. 항상 같은 방향으로 돈다
  const anim = useRef({ turns: value, prev: value, from: -value * TURN, at: -1 });
  useEffect(() => {
    const a = anim.current;
    if (value === a.prev) return;
    const cur = group.current?.rotation.y ?? -a.turns * TURN;
    a.turns += (value - a.prev + FACES) % FACES;
    a.prev = value;
    a.from = cur;
    a.at = performance.now();
  }, [value]);
  useFrame(() => {
    const a = anim.current;
    const target = -a.turns * TURN;
    const k = a.at < 0 ? 1 : Math.min(1, (performance.now() - a.at) / 1000 / SPIN);
    const ang = k >= 1 ? target : a.from + (target - a.from) * easeOutBack(k);
    if (group.current) group.current.rotation.y = ang;
    // 손잡이는 원통이 한 칸 돌 때 한 바퀴 돈다
    if (crank.current) crank.current.rotation.x = (ang / TURN) * Math.PI * 2;
    const aimed = faceRt.phase === "idle" && faceRt.near && faceRt.aim === i;
    if (ring.current) ring.current.emissiveIntensity += ((aimed ? 0.55 : 0) - ring.current.emissiveIntensity) * 0.2;
    if (knob.current) knob.current.emissiveIntensity = aimed ? 0.9 + Math.sin(performance.now() / 160) * 0.3 : 0;
  });
  return (
    <group position={[0, DRUM_Y[i], 0]}>
      <Tap id={`face-drum-${i}`} onTap={onTap}>
        <group ref={group}>
          <mesh>
            <cylinderGeometry args={[R, R, DH, 64, 1, true, -Math.PI / 3, Math.PI * 2]} />
            <meshStandardMaterial map={tex} roughness={0.82} metalness={0} />
          </mesh>
          {/* 원통 안쪽을 막는 나무 속 */}
          <mesh>
            <cylinderGeometry args={[R - 0.02, R - 0.02, DH - 0.01, 24]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
          </mesh>
        </group>
        {/* 오른쪽 기둥의 손잡이 */}
        <group position={[0.72, 0, 0.02]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 20]} />
            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
          </mesh>
          <group ref={crank}>
            <mesh position={[0.04, 0.08, 0]}>
              <boxGeometry args={[0.025, 0.17, 0.035]} />
              <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
            </mesh>
            <mesh position={[0.09, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.028, 0.028, 0.1, 12]} />
              <meshStandardMaterial ref={knob} color="#6b3a1e" roughness={0.6} emissive="#ffb54a" emissiveIntensity={0} />
            </mesh>
          </group>
        </group>
      </Tap>
      {/* 위 놋쇠 테 (조준한 원통은 은은히 빛난다) */}
      <mesh position={[0, DH / 2 + 0.012, 0]}>
        <cylinderGeometry args={[R + 0.025, R + 0.025, 0.024, 48]} />
        <meshStandardMaterial ref={ring} color={BRASS} metalness={0.8} roughness={0.35} emissive="#ffb54a" emissiveIntensity={0} />
      </mesh>
      {i === 2 && (
        <mesh position={[0, -DH / 2 - 0.012, 0]}>
          <cylinderGeometry args={[R + 0.025, R + 0.025, 0.024, 48]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
        </mesh>
      )}
    </group>
  );
}

// 이음매: 두 조각의 외곽선이 이어지면 금빛 선이 얼굴 윤곽 자리를 따라 켜진다
function Seam({ s, joined }: { s: 0 | 1; joined: boolean }) {
  const geo = useMemo(() => {
    const [l, r] = seamPoints(s);
    return arcGeometry(l * TURN, r * TURN, R + 0.034, 0.012);
  }, [s]);
  const dots = useMemo(() => seamPoints(s).map((p) => [Math.sin(p * TURN) * (R + 0.032), 0, Math.cos(p * TURN) * (R + 0.032)] as [number, number, number]), [s]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const dotMat = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const since = useRef(0);
  useEffect(() => {
    since.current = joined ? performance.now() : 0;
  }, [joined]);
  useFrame(() => {
    const locked = faceRt.phase !== "idle" && faceRt.phase !== "locked";
    const age = since.current ? (performance.now() - since.current) / 1000 : 0;
    // 막 이어진 순간 밝게 번쩍이고 은은하게 남는다. 장치가 잠기면 계속 켜져 있다
    const o = joined || locked ? Math.min(1, age * 4) * (0.55 + 0.45 * Math.exp(-age * 2.2)) : 0;
    if (mat.current) mat.current.opacity = locked ? 0.9 : o;
    dotMat.current.forEach((m) => m && (m.opacity = locked ? 1 : o));
  });
  return (
    <group position={[0, SEAM_Y[s], 0]}>
      <mesh geometry={geo}>
        <meshBasicMaterial ref={mat} color="#fff0b8" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
      {dots.map((p, k) => (
        <mesh key={k} position={p}>
          <sphereGeometry args={[0.026, 10, 8]} />
          <meshBasicMaterial ref={(m) => { dotMat.current[k] = m; }} color="#fff0c0" transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// 도시가 덧씌우려는 표준 미소 (분홍 홀로그램)
function Smile({ method }: { method: FaceMethod | null }) {
  const tex = useMemo(() => smileTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    const p = faceRt.phase;
    const t = st.clock.elapsedTime;
    const age = (performance.now() - faceRt.since) / 1000;
    let o = 0;
    let z = R + 0.09;
    let sy = 1;
    if (p === "twist") o = age < 1.2 ? (Math.sin(age * 40) > 0 ? 0.85 : 0.15) * Math.min(1, age * 2) : 0.8;
    else if (p === "choice") o = 0.62 + Math.sin(t * 3) * 0.12 + (Math.sin(t * 23) > 0.93 ? -0.4 : 0);
    else if (p === "applying" || p === "done") {
      if (method === "standard") {
        // 얼굴 위로 눌러 붙는다
        const k = p === "applying" ? Math.min(1, age / 1.2) : 1;
        z = R + 0.09 - 0.07 * k;
        o = p === "applying" ? 0.8 + 0.2 * k : 0.55 + Math.sin(t * 2) * 0.08;
      } else if (method === "exception" && p === "applying") {
        // 지직거리며 납작하게 꺼진다
        const k = Math.min(1, age / 0.9);
        sy = 1 - k;
        o = (1 - k) * (Math.sin(age * 60) > 0 ? 0.9 : 0.3);
      }
    }
    if (mat.current) mat.current.opacity = o;
    if (mesh.current) {
      mesh.current.visible = o > 0.01;
      mesh.current.position.z = z;
      mesh.current.scale.y = Math.max(0.001, sy);
    }
  });
  return (
    <mesh ref={mesh} position={[0, (DRUM_Y[1] + DRUM_Y[2]) / 2 + 0.02, R + 0.09]} visible={false}>
      <planeGeometry args={[0.72, 1.08]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// 받침 장의 작은 화면: 장치가 하는 말을 그대로 비춘다. 장치의 말은 호박색, 도시의 말은 분홍
function Screen({ phase, method, lang }: { phase: FacePhase; method: FaceMethod | null; lang: Lang }) {
  const line = phase === "restored" ? faceUi.restored : phase === "twist" || phase === "choice" ? faceUi.smileMissing : method && (phase === "applying" || phase === "done") ? faceUi[method] : null;
  const city = phase === "twist" || phase === "choice" || (method === "standard" && (phase === "applying" || phase === "done"));
  const tex = useCanvasSign(line ? [[line[lang], 1]] : [["", 1]], { color: city ? "#ff79c0" : "#ffc76a", bg: city ? "#1d0a16" : "#120d06", w: 512, h: 160, glow: true });
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    if (!mat.current) return;
    // 도시의 말은 가끔 화면이 튄다
    const glitch = line && city && Math.sin(st.clock.elapsedTime * 17) > 0.96;
    mat.current.opacity = line ? (glitch ? 0.5 : 1) : 0.18;
  });
  return (
    <group position={[0, 0.6, 0.452]}>
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[0.6, 0.26, 0.02]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={[0.54, 0.2]} />
        <meshBasicMaterial ref={mat} map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

// 두 조작부: 왼쪽은 도시가 덧대어 놓은 분홍 버튼, 오른쪽은 장치에 원래 달린 나무 레버
function Controls({ method, lang, onTap }: { method: FaceMethod | null; lang: Lang; onTap: TapFn }) {
  const ko = lang === "ko";
  const stdSign = useCanvasSign(
    [
      [ko ? faceUi.applyStandard.ko : faceUi.applyStandard.en.toUpperCase(), 1],
      [faceUi.standard[lang], 0.6],
    ],
    { color: "#ff79c0", bg: "#22101b", w: 512, h: 220 }
  );
  const keepSign = useCanvasSign(
    [
      [ko ? faceUi.keepOriginal.ko : faceUi.keepOriginal.en.toUpperCase(), 1],
      [faceUi.exception[lang], 0.6],
    ],
    { color: "#f1d6a0", bg: "#2a1a0e", w: 512, h: 220 }
  );
  const button = useRef<THREE.Mesh>(null);
  const buttonMat = useRef<THREE.MeshStandardMaterial>(null);
  const lever = useRef<THREE.Group>(null);
  const leverLamp = useRef<THREE.MeshStandardMaterial>(null);
  const signs = useRef<THREE.MeshBasicMaterial[]>([]);
  // 바라보는 조작부를 감싸는 빛 고리
  const halos = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((st) => {
    const p = faceRt.phase;
    const t = st.clock.elapsedTime;
    const live = p === "choice";
    const age = (performance.now() - faceRt.since) / 1000;
    const chose = p === "applying" || p === "done";
    // 고른 쪽은 눌리거나 당겨진 채로 남는다
    const pressed = chose && method === "standard" ? Math.min(1, (p === "applying" ? age : 1) * 6) : 0;
    const pulled = chose && method === "exception" ? Math.min(1, (p === "applying" ? age : 1) * 2.5) : 0;
    if (button.current) button.current.position.y = 0.075 - pressed * 0.035;
    const fStd = live && faceRt.focus === "face-std";
    const fKeep = live && faceRt.focus === "face-keep";
    if (buttonMat.current) buttonMat.current.emissiveIntensity = fStd ? 1.8 + Math.sin(t * 8) * 0.5 : live ? 0.6 + Math.sin(t * 4) * 0.25 : method === "standard" && chose ? 0.8 : 0.08;
    if (lever.current) lever.current.rotation.x = -0.55 + pulled * 1.25;
    if (leverLamp.current) leverLamp.current.emissiveIntensity = fKeep ? 1.8 + Math.sin(t * 8) * 0.5 : live ? 0.6 + Math.sin(t * 4 + 1.5) * 0.25 : method === "exception" && chose ? 0.8 : 0.05;
    signs.current.forEach((m, k) => m && (m.opacity = live ? ((k ? fKeep : fStd) ? 1 : 0.7) : chose ? 1 : 0.32));
    halos.current.forEach((h, k) => {
      if (!h) return;
      const on = k ? fKeep : fStd;
      h.visible = on;
      if (on) {
        h.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
        (h.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(t * 6) * 0.25;
      }
    });
  });
  return (
    <group>
      {/* 분홍 버튼: 매끈한 플라스틱 상자가 놋쇠 띠로 장에 억지로 묶여 있다 */}
      <Tap id="face-std" onTap={onTap}>
        <group position={[-0.56, 0.92, 0.22]}>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.26, 0.06, 0.22]} />
            <meshStandardMaterial color="#f4eef2" roughness={0.25} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.28, 0.02, 0.06]} />
            <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh ref={button} position={[0, 0.075, 0]}>
            <sphereGeometry args={[0.075, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial ref={buttonMat} color="#ff5fb0" roughness={0.2} emissive="#ff3aa8" emissiveIntensity={0.08} />
          </mesh>
        </group>
      </Tap>
      {/* 나무 레버 */}
      <Tap id="face-keep" onTap={onTap}>
        <group position={[0.56, 0.92, 0.22]}>
          <mesh position={[0, 0.015, 0]}>
            <boxGeometry args={[0.18, 0.03, 0.24]} />
            <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.03, -0.09]}>
            <sphereGeometry args={[0.022, 12, 8]} />
            <meshStandardMaterial ref={leverLamp} color="#c99a4a" emissive="#ffb54a" emissiveIntensity={0.05} />
          </mesh>
          <group ref={lever} position={[0, 0.04, 0]} rotation={[-0.55, 0, 0]}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.022, 0.028, 0.4, 10]} />
              <meshStandardMaterial color="#6e4426" roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.41, 0]}>
              <sphereGeometry args={[0.045, 14, 10]} />
              <meshStandardMaterial color="#3b2112" roughness={0.6} />
            </mesh>
          </group>
        </group>
      </Tap>
      {/* 바라보는 쪽을 감싸는 빛 고리 (장 윗면에 눕힌 원) */}
      {["#ff79c0", "#ffd27a"].map((c, k) => (
        <mesh key={c} ref={(m) => { halos.current[k] = m; }} position={[k ? 0.56 : -0.56, 0.935, 0.22]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.17, 0.205, 40]} />
          <meshBasicMaterial color={c} transparent opacity={0.8} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[stdSign, keepSign].map((tex, k) => (
        <mesh key={k} position={[k ? 0.56 : -0.56, 0.6, 0.452]}>
          <planeGeometry args={[0.44, 0.19]} />
          <meshBasicMaterial ref={(m) => { if (m) signs.current[k] = m; }} map={tex} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// 몸체: 옻칠한 나무 장, 기둥, 현판, 작은 기와 지붕, 놋쇠 축
function Body({ lang }: { lang: Lang }) {
  const plaque = useCanvasSign([[lang === "ko" ? faceUi.quest.ko : faceUi.quest.en.toUpperCase(), 1]], { color: "#e8c98a", bg: "#2b1a0f", w: 768, h: 160, border: true });
  return (
    <group>
      {/* 받침 장 */}
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.62, 0.92, 0.9]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.7, 0.04, 0.96]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      {[-0.79, 0.79].map((x) => (
        <mesh key={x} position={[x, 0.46, 0.45]}>
          <boxGeometry args={[0.05, 0.92, 0.02]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.7, 0.12, 0.96]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      {/* 기둥 둘과 뒤판 */}
      {[-0.66, 0.66].map((x) => (
        <mesh key={x} position={[x, 1.75, -0.05]} castShadow>
          <boxGeometry args={[0.12, 1.7, 0.14]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 1.75, -0.42]}>
        <boxGeometry args={[1.32, 1.7, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      {/* 놋쇠 축 */}
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.72, 10]} />
        <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
      </mesh>
      {/* 인방, 단청 띠, 현판 */}
      <mesh position={[0, 2.63, -0.05]}>
        <boxGeometry args={[1.62, 0.16, 0.5]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.57, 0.205]}>
        <boxGeometry args={[1.62, 0.035, 0.01]} />
        <meshStandardMaterial color="#2f6b55" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.69, 0.205]}>
        <boxGeometry args={[1.62, 0.035, 0.01]} />
        <meshStandardMaterial color="#8a2c22" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.63, 0.215]}>
        <planeGeometry args={[0.9, 0.17]} />
        <meshStandardMaterial map={plaque} roughness={0.7} />
      </mesh>
      {/* 작은 기와 지붕 */}
      <mesh position={[0, 2.76, -0.05]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[1.95, 0.05, 0.42]} />
        <meshStandardMaterial color="#2b2a2c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.76, -0.3]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.95, 0.05, 0.42]} />
        <meshStandardMaterial color="#2b2a2c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.82, -0.17]}>
        <boxGeometry args={[1.95, 0.05, 0.06]} />
        <meshStandardMaterial color="#1c1b1d" roughness={0.8} />
      </mesh>
    </group>
  );
}

// 장치 위의 백열등: 처음 다가가면 지직거리며 켜져 시선을 끈다
function Bulb() {
  const bulb = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const on = faceRt.wokeAt ? (performance.now() - faceRt.wokeAt) / 1000 : -1;
    // 켜지는 순간 몇 번 깜박인다
    let k = on < 0 ? 0.04 : on < 0.9 ? (Math.sin(on * 31) > 0.2 ? 1 : 0.1) : 1;
    if (faceRt.phase === "restored" || faceRt.phase === "applying") k = 1.6;
    if (bulb.current) bulb.current.emissiveIntensity = 0.2 + k * 2.2;
    if (light.current) light.current.intensity = k * 2.4;
  });
  return (
    <group position={[0, 2.93, 0.5]}>
      {/* 지붕 끝에서 앞으로 뻗은 놋쇠 팔 */}
      <mesh position={[0, 0.05, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.4, 6]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.05, 12]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial ref={bulb} color="#fff1d0" emissive="#ffc46b" emissiveIntensity={0.2} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, -0.08, 0.15]} color="#ffcf8a" intensity={0} distance={4.5} decay={1.6} />
    </group>
  );
}

// 장치에서 받침대까지 이어진 낡은 선. 얼굴이 맞으면 빛이 이산에게로 흘러간다
function Conduit() {
  const geo = useMemo(() => {
    const a = machinePoint(-0.7, 0.06, -0.2);
    const b = new THREE.Vector3(1.95, 0.06, 0.55);
    const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, 0.25));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b, new THREE.Vector3(1.75, 0.35, 0.5)]), 32, 0.035, 8, false);
  }, []);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((st) => {
    if (!mat.current) return;
    const p = faceRt.phase;
    // 얼굴이 맞으면 빛이 장치에서 이산에게로 흘러간다
    mat.current.emissiveIntensity = p === "applying" ? 0.8 + Math.sin(st.clock.elapsedTime * 9) * 0.5 : p === "done" ? 0.25 : p === "locked" || p === "idle" ? 0 : 0.12;
  });
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial ref={mat} color="#2d2a26" roughness={0.6} emissive="#ffc46b" emissiveIntensity={0} />
    </mesh>
  );
}

export default function FaceMachine({ drums, phase, method, lang, onTap }: { drums: Drums; phase: FacePhase; method: FaceMethod | null; lang: Lang; onTap: TapFn }) {
  const camera = useThree((s) => s.camera);
  const inv = useMemo(() => new THREE.Matrix4(), []);
  const tmp = useMemo(() => ({ o: new THREE.Vector3(), d: new THREE.Vector3() }), []);
  const root = useRef<THREE.Group>(null);
  // 바라보는 원통 찾기: 시선을 장치 앞면에 쏘아 맞은 높이로 고른다
  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const dist = Math.hypot(player.pos.x - FACE_MACHINE.pos[0], player.pos.z - FACE_MACHINE.pos[2]);
    faceRt.near = dist < 3.4;
    if (!faceRt.wokeAt && faceRt.phase === "idle" && dist < 7.5) {
      faceRt.wokeAt = performance.now();
      sfx.clunk();
    }
    inv.copy(g.matrixWorld).invert();
    tmp.o.copy(camera.position).applyMatrix4(inv);
    camera.getWorldDirection(tmp.d);
    tmp.d.transformDirection(inv);
    if (tmp.d.z < -0.05) {
      const t = (R * 0.8 - tmp.o.z) / tmp.d.z;
      const y = tmp.o.y + tmp.d.y * t;
      const x = tmp.o.x + tmp.d.x * t;
      if (t > 0 && Math.abs(x) < 1.2) {
        let best = 0;
        for (let i = 1; i < 3; i++) if (Math.abs(DRUM_Y[i] - y) < Math.abs(DRUM_Y[best] - y)) best = i;
        faceRt.aim = best;
      }
    }
  });
  return (
    <group ref={root} position={FACE_MACHINE.pos} rotation={[0, FACE_MACHINE.rotY, 0]}>
      <Body lang={lang} />
      {[0, 1, 2].map((i) => (
        <Drum key={i} i={i} value={drums[i]} onTap={onTap} />
      ))}
      <Seam s={0} joined={seamJoined(drums, 0)} />
      <Seam s={1} joined={seamJoined(drums, 1)} />
      <Smile method={method} />
      <Screen phase={phase} method={method} lang={lang} />
      <Controls method={method} lang={lang} onTap={onTap} />
      <Bulb />
    </group>
  );
}

export { Conduit as FaceConduit };
