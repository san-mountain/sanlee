"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { player } from "./Player";
import { addRim } from "./rim";
import { useFrame } from "@react-three/fiber";
import type { Lang } from "@/data/site";
import { useSign } from "./parts";
import { faceRt, phaseAge } from "./faceRuntime";

const GREY = new THREE.Color("#a9a6ae");
const BLACK = new THREE.Color("#000000");

type Part = "head" | "torso" | "arms" | "legs";
const RESTORE_AT: Record<Part, number> = { head: 1, torso: 2, arms: 3, legs: 3 };
const COLORS: Record<Part, string> = { head: "#ff2bd6", torso: "#22f0ff", arms: "#a77bff", legs: "#ffe14d" };

// 회색 돌에서 부위별로 색이 돌아오는 재질. 기존 경로는 방문한 터미널 수, 얼굴 복원 경로는 깨어나는 연출의 진행도로 정한다
function usePartMaterial(part: Part, restored: number, on?: () => boolean) {
  const mat = useMemo(() => addRim(new THREE.MeshStandardMaterial({ color: GREY, roughness: 0.75, metalness: 0.05 }), "#3fd6ff", 0.7), []);
  const fixed = restored >= RESTORE_AT[part];
  const tColor = useMemo(() => new THREE.Color(COLORS[part]), [part]);
  const dim = useMemo(() => tColor.clone().multiplyScalar(0.5), [tColor]);
  useFrame((_, dt) => {
    const target = on ? on() : fixed;
    const k = Math.min(1, dt * (on ? 0.9 : 2.5));
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

// 연출 중 움직이는 팔: 매 프레임 두 끝점을 받아 캡슐을 다시 놓는다
function MovingLimb({ get, r, material }: { get: () => [THREE.Vector3, THREE.Vector3]; r: number; material: THREE.Material }) {
  const ref = useRef<THREE.Mesh>(null);
  const base = useRef(0);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const [a, b] = get();
    dir.copy(b).sub(a);
    const len = dir.length();
    if (!base.current) base.current = len;
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    m.scale.set(1, len / base.current, 1);
  });
  const [a, b] = get();
  return (
    <mesh ref={ref} material={material} castShadow>
      <capsuleGeometry args={[r, Math.max(0.01, a.distanceTo(b) - r), 6, 12]} />
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
export function Pedestal({ lang, empty, second }: { lang: Lang; empty?: boolean; second?: boolean }) {
  const plate = useSign(
    [
      second ? [lang === "ko" ? "방문자 (마지막 접속: 방금)" : "VISITOR (LAST SEEN: JUST NOW)", 1] : [lang === "ko" ? "이산 (마지막 접속: 2087년)" : "SAN LEE (LAST SEEN: 2087)", 1],
      second
        ? [lang === "ko" ? "끝까지 '모두 거부'를 누른 두 번째 사람" : "THE SECOND ONE WHO REJECTED ALL", 0.62]
        : [empty ? (lang === "ko" ? "— 걸어 나감 —" : "— WALKED AWAY —") : lang === "ko" ? "끝까지 '모두 거부'를 누른 사람" : "THE ONE WHO REJECTED ALL", 0.7],
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
const LEAN_UP = 0.16; // 고개를 든 뒤의 각도
const WAKE_S = 9; // 고개를 들고 색이 돌아오는 데 걸리는 시간(초)

// 얼굴 복원 연출의 진행도 0~1 (기존 경로에서는 늘 0)
function wakeProgress(flow: boolean) {
  if (!flow) return 0;
  if (faceRt.phase === "done") return 1;
  if (faceRt.phase !== "wake") return 0;
  return Math.min(1, phaseAge() / WAKE_S);
}
const smooth = (x: number) => x * x * (3 - 2 * x);
const span = (p: number, a: number, b: number) => smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));

// 받침대 위에 주저앉아 머리를 감싸 쥔 동상.
// faceFlow: 얼굴 복원 장치로 깨우는 새 경로. 얼굴·상체만 색이 돌아오고, 다리는 돌로 남는다
export default function Statue({ restored, lang, second, faceMethod, faceFlow }: { restored: number; lang: Lang; second?: boolean; faceMethod?: "standard" | "exception" | null; faceFlow?: boolean }) {
  const faceHead = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const features = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const prog = useRef(0);
  const flow = !!faceFlow && !!faceMethod;
  const head = usePartMaterial("head", restored, flow ? () => prog.current > 0.1 : undefined);
  const torso = usePartMaterial("torso", restored, flow ? () => prog.current > 0.3 : undefined);
  const arms = usePartMaterial("arms", restored, flow ? () => prog.current > 0.45 : undefined);
  const legs = usePartMaterial("legs", flow ? 0 : restored);

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

  // 팔의 관절: 처음에는 두 손으로 머리를 감싸고, 깨어나면 손을 무릎 위로 내린다
  const joints = useMemo(
    () =>
      [-1, 1].map((k) => ({
        k,
        shoulder: new THREE.Vector3(),
        elbow: new THREE.Vector3(),
        hand: new THREE.Vector3(),
        e0: new THREE.Vector3(k * 0.19, 0.43, 0.43),
        e1: new THREE.Vector3(k * 0.2, 0.42, 0.4),
        h0: new THREE.Vector3(k * 0.12, 0.74, 0.44),
        h1: new THREE.Vector3(k * 0.13, 0.4, 0.6),
      })),
    []
  );
  const hands = useRef<(THREE.Mesh | null)[]>([]);
  const pose = (p: number) => {
    const lp = span(p, 0.05, 0.75);
    const L = LEAN + (LEAN_UP - LEAN) * lp;
    const ap = span(p, 0.2, 0.7);
    for (const j of joints) {
      j.shoulder.set(j.k * 0.2, 0.56 * Math.cos(L) + 0.12, 0.56 * Math.sin(L));
      j.elbow.lerpVectors(j.e0, j.e1, ap);
      j.hand.lerpVectors(j.h0, j.h1, ap);
    }
    return { L, lp, ap };
  };
  pose(wakeProgress(flow));

  // 굳어 있는 동안 가끔 지직거리고, 조각이 돌아올수록 숨을 쉬듯 움직임
  useFrame((s) => {
    if (!body.current) return;
    const t = s.clock.elapsedTime;
    const p = wakeProgress(flow);
    prog.current = p;
    const { L, lp, ap } = pose(p);
    if (lean.current) lean.current.rotation.x = L;
    hands.current.forEach((h, n) => {
      if (!h) return;
      const j = joints[n];
      h.position.copy(j.hand).add(new THREE.Vector3(0, 0.06 * (1 - ap), -0.01 * (1 - ap)));
      h.rotation.set(-1.1 * ap, 0, j.k * 0.3 * (1 - ap));
    });
    if (faceHead.current && (faceMethod || flow)) {
      // 깨어나면 플레이어를 바라본다
      const look = flow ? span(p, 0.35, 0.9) : 1;
      const yaw = Math.max(-0.45, Math.min(0.45, Math.atan2(player.pos.x, player.pos.z)));
      // 머리(약 3.1m)에서 플레이어 눈높이를 내려다보는 각도
      const down = Math.max(0.05, Math.min(0.6, Math.atan2(3.1 - player.pos.y, Math.max(0.5, Math.hypot(player.pos.x, player.pos.z)))));
      const wantX = flow ? 0.55 + (down - L - 0.55) * look : -0.35;
      const wantY = flow ? 0.12 + (yaw - 0.12) * look : yaw;
      const k = flow && p < 1 ? 0.12 : 0.025;
      faceHead.current.rotation.x = THREE.MathUtils.lerp(faceHead.current.rotation.x, wantX, k);
      faceHead.current.rotation.y = THREE.MathUtils.lerp(faceHead.current.rotation.y, wantY, k);
      faceHead.current.rotation.z = THREE.MathUtils.lerp(faceHead.current.rotation.z, flow ? 0.08 * (1 - look) + (faceMethod === "exception" ? 0.05 : 0) : 0.08, k);
    }
    if (features.current) features.current.visible = !flow || p > 0.12;
    if (glow.current) glow.current.intensity = flow ? span(p, 0.1, 0.6) * 2.2 : 0;
    const glitch = !faceMethod && !flow && Math.sin(t * 13.7) > 0.985;
    body.current.position.x = glitch ? (Math.random() - 0.5) * 0.18 : 0;
    body.current.scale.x = glitch ? S * (1 + (Math.random() - 0.5) * 0.08) : S;
    body.current.scale.y = S * (1 + Math.sin(t * 1.2) * 0.004 * (flow ? 1 + lp * 2 : restored));
  });

  const ink = "#251c2c";
  const std = faceMethod === "standard";
  return (
    <group>
      <Pedestal lang={lang} second={second} />
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
        <mesh position={[0, 0.1, 0]} scale={[1, 0.6, 0.8]} material={legs}>
          <sphereGeometry args={[0.17, 16, 12]} />
        </mesh>
        {/* 앞으로 웅크린 몸통과 숙인 머리 */}
        <group ref={lean} position={[0, 0.12, 0]} rotation={[LEAN, 0, 0]}>
          <mesh geometry={torsoGeo} material={torso} />
          <mesh position={[0, 0.69, 0.01]} material={head}>
            <cylinderGeometry args={[0.048, 0.058, 0.1, 12]} />
          </mesh>
          <group ref={faceHead} position={[0, 0.8, 0.05]} rotation={[0.55, 0.12, 0.08]}>
            <mesh scale={[0.9, 1.12, 1]} material={head}>
              <sphereGeometry args={[0.115, 20, 16]} />
            </mesh>
            {(faceMethod || flow) && (
              <group ref={features}>
                {/* 눈: 흰자와 눈동자. 이산의 왼쪽(+x) 눈이 조금 더 높다 */}
                {[-1, 1].map((k) => (
                  <group key={k} position={[k * 0.04, 0.02 + (k > 0 && !std ? 0.004 : 0), 0.104]}>
                    <mesh>
                      <sphereGeometry args={[0.014, 10, 8]} />
                      <meshBasicMaterial color="#f3f5ee" />
                    </mesh>
                    <mesh position={[0, 0, 0.011]}>
                      <sphereGeometry args={[0.0065, 8, 6]} />
                      <meshBasicMaterial color={ink} />
                    </mesh>
                  </group>
                ))}
                {/* 눈썹: 표준 미소는 입만 웃고 눈썹은 불안하게 올라가 있다 */}
                {[-1, 1].map((k) => (
                  <mesh key={k} position={[k * 0.042, 0.048 + (std ? 0.006 : k > 0 ? 0.004 : 0), 0.103]} rotation={[0, 0, std ? -k * 0.38 : k > 0 ? 0.1 : -0.04]}>
                    <boxGeometry args={[0.034, 0.006, 0.006]} />
                    <meshBasicMaterial color={ink} />
                  </mesh>
                ))}
                {std ? (
                  // 귀에 걸릴 듯 크게 고정된 대칭 미소
                  <mesh position={[0, -0.04, 0.1]} rotation={[0.25, 0, Math.PI]}>
                    <torusGeometry args={[0.036, 0.0045, 6, 20, Math.PI]} />
                    <meshBasicMaterial color={ink} />
                  </mesh>
                ) : (
                  <>
                    {/* 웃지 않는 자연스러운 입, 조금 비뚤다 */}
                    <mesh position={[0.004, -0.05, 0.104]} rotation={[0, 0, 0.07]}>
                      <boxGeometry args={[0.048, 0.0055, 0.006]} />
                      <meshBasicMaterial color={ink} />
                    </mesh>
                    {/* 왼쪽 보조개 */}
                    <mesh position={[0.058, -0.044, 0.093]}>
                      <sphereGeometry args={[0.0055, 8, 6]} />
                      <meshBasicMaterial color="#5a3f48" />
                    </mesh>
                  </>
                )}
              </group>
            )}
            <mesh position={[0, -0.01, 0.112]} rotation={[0.2, 0, 0]} material={head}>
              <coneGeometry args={[0.018, 0.05, 8]} />
            </mesh>
            {flow && <pointLight ref={glow} position={[0, 0.05, 0.5]} color="#ffd9b0" intensity={0} distance={2.6} decay={1.5} />}
          </group>
          {[-1, 1].map((k) => (
            <mesh key={k} position={[k * 0.2, 0.56, 0]} material={arms}>
              <sphereGeometry args={[0.062, 12, 8]} />
            </mesh>
          ))}
        </group>
        {/* 팔: 무릎에 팔꿈치를 대고 두 손으로 머리를 감쌈 (깨어나면 손을 내린다) */}
        {joints.map((j, n) => (
          <group key={j.k}>
            <MovingLimb get={() => [j.shoulder, j.elbow]} r={0.05} material={arms} />
            <MovingLimb get={() => [j.elbow, j.hand]} r={0.043} material={arms} />
            <mesh ref={(m) => { hands.current[n] = m; }} position={j.h0} rotation={[0, 0, j.k * 0.3]} scale={[0.45, 1, 0.9]} material={arms}>
              <boxGeometry args={[0.1, 0.13, 0.1]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 얼굴 복원 경로에서 깨어난 뒤에는 떠 있는 쿠키가 이산과 플레이어 사이를 가리지 않게 치운다 */}
      {!flow && <Cookie />}
    </group>
  );
}
