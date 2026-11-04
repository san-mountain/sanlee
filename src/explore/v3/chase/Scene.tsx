"use client";
// 추격 구간의 3D 장면. 상태는 모두 gameRef(로직)에서 읽고, React 상태는 쓰지 않는다.
// 성능 원칙: 그림자·후처리 없음, 실제 광원은 3개 이하, 빛 웅덩이와 빛기둥은 가짜(가산 합성) 메시,
// 지오메트리·머티리얼은 useMemo로 한 번만 만들고 언마운트 때 정리한다.

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { beamMaterial, lightPoolMaterial } from "../../atmosphere";
import { concreteTexture, hazardTexture, signTexture } from "../../textures";
import { towerMaterial } from "../../towerMaterial";
import { Human } from "../../parts";
import {
  BREAKER, BUILDINGS, COVERS, GATE_PANEL, GATE_Z, LIGHTS, PASSAGE_DOOR_Z, RELAY, SAN_START, SHUTTER_PANEL, SHUTTER_Z,
  STAIR_BOTTOM_Z, STAIR_DROP, STAIR_TOP_Z, type Block,
} from "./level";
import { beaconOf, type Game } from "./logic";

type GameRef = React.RefObject<Game>;
export type ChaseQuality = "low" | "high";

const SPOT_IDLE = new THREE.Color("#cfe2ff");
const SPOT_HOT = new THREE.Color("#ff334f");

function useDisposable<T extends { dispose: () => void }>(make: () => T, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(make, deps);
  useEffect(() => () => v.dispose(), [v]);
  return v;
}

function useSign(lines: [string, number][], opt: Parameters<typeof signTexture>[1]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useDisposable(() => signTexture(lines, opt), []);
}

const center = (b: { x0: number; x1: number; z0: number; z1: number }) => [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2] as const;
const size = (b: { x0: number; x1: number; z0: number; z1: number }) => [b.x1 - b.x0, b.z1 - b.z0] as const;

/* ---------- 지면과 건물 ---------- */

function Ground() {
  const tex = useDisposable(() => {
    const t = concreteTexture(7, 92);
    t.repeat.set(10, 45);
    return t;
  });
  const hazard = useDisposable(() => hazardTexture());
  return (
    <group>
      {/* 지하철 계단 자리를 비워 두고 바닥을 세 조각으로 깐다 */}
      {[
        [0, (51 + STAIR_TOP_Z) / 2, 40, 51 - STAIR_TOP_Z],
        [-11.25, (STAIR_TOP_Z - 66) / 2, 17.5, 66 + STAIR_TOP_Z],
        [11.25, (STAIR_TOP_Z - 66) / 2, 17.5, 66 + STAIR_TOP_Z],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0, z]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial map={tex} color="#7d8794" roughness={0.88} />
        </mesh>
      ))}
      {/* 계단 구덩이의 옆벽과 안쪽 벽 */}
      {[-2.5, 2.5].map((x) => (
        <mesh key={x} position={[x, -STAIR_DROP / 2 - 0.4, (STAIR_TOP_Z - 60) / 2]}>
          <boxGeometry args={[0.1, STAIR_DROP + 0.8, 60 + STAIR_TOP_Z]} />
          <meshStandardMaterial color="#2c3238" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, -STAIR_DROP / 2 - 0.4, -59.9]}>
        <boxGeometry args={[5, STAIR_DROP + 0.8, 0.2]} />
        <meshStandardMaterial color="#2c3238" roughness={0.9} />
      </mesh>
      {/* 횡단보도: 지워지다 만 흰 줄 */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[-7 + i * 2, 0.012, -2.2]}>
          <planeGeometry args={[0.9, 3]} />
          <meshBasicMaterial color="#8a8f96" transparent opacity={0.07 + (i % 3) * 0.03} depthWrite={false} />
        </mesh>
      ))}
      {/* 중앙 버스 전용 차로의 파란 선과 노란 중앙선 */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={"c" + i} rotation-x={-Math.PI / 2} position={[0, 0.011, -8 - i * 3.6]}>
          <planeGeometry args={[0.16, 1.8]} />
          <meshBasicMaterial color="#9a8530" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.013, GATE_Z + 1.2]}>
        <planeGeometry args={[19.6, 0.5]} />
        <meshBasicMaterial map={hazard} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Buildings({ quality }: { quality: ChaseQuality }) {
  const mat = useDisposable(() => towerMaterial());
  const blocks = BUILDINGS.filter((b) => b.kind === "building");
  // 멀리 보이는 스카이라인 (인스턴싱 한 번의 드로우콜)
  const skyline = useMemo(() => {
    const n = quality === "high" ? 26 : 14;
    const out: { x: number; z: number; w: number; d: number; h: number }[] = [];
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      out.push({ x: side * (24 + r() * 18), z: 30 - i * 6.5 - r() * 4, w: 8 + r() * 8, d: 8 + r() * 8, h: 30 + r() * 60 });
    }
    for (let i = 0; i < 6; i++) out.push({ x: -30 + i * 12, z: -78 - r() * 10, w: 10, d: 10, h: 50 + r() * 70 });
    return out;
  }, [quality]);
  const inst = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4();
    skyline.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.h / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
      inst.current?.setMatrixAt(i, m);
    });
    if (inst.current) inst.current.instanceMatrix.needsUpdate = true;
  }, [skyline]);
  return (
    <group>
      {blocks.map((b, i) => {
        const [cx, cz] = center(b);
        const [w, d] = size(b);
        return (
          <mesh key={i} position={[cx, b.h / 2, cz]} material={mat}>
            <boxGeometry args={[w, b.h, d]} />
          </mesh>
        );
      })}
      <instancedMesh key={skyline.length} ref={inst} args={[undefined, undefined, skyline.length]} material={mat}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}

/* ---------- 골목: 간판, 실외기, 전선, 가로등 ---------- */

function AlleyDressing({ gameRef }: { gameRef: GameRef }) {
  const signs = [
    useSign([["인쇄 · 제본", 1.2], ["을지로 3가 골목", 0.6]], { color: "#d9c9a8", bg: "#1a1612", border: true }),
    useSign([["철물", 1.4]], { color: "#c5d2db", bg: "#121820", border: true }),
    useSign([["24시 세탁", 1], ["COIN LAUNDRY", 0.5]], { color: "#a6c4c9", bg: "#0d1517" }),
    useSign([["임대", 1.6], ["문의 010-****-****", 0.5]], { color: "#b8b0a4", bg: "#191715" }),
  ];
  const lampMat = useDisposable(() => new THREE.MeshBasicMaterial({ color: "#2a2216", toneMapped: false }));
  const poolMat = useDisposable(() => lightPoolMaterial("#ffb560", 0.0, "top"));
  const signMats = useRef<THREE.MeshBasicMaterial[]>([]);
  const lamps: [number, number, number][] = [
    [-2.9, 4.6, 26], [2.9, 4.6, 20.5], [-2.9, 4.6, 13], [2.9, 4.6, 7.5], [-9.3, 5.2, 2.5], [9.3, 5.2, -6],
  ];
  useFrame(() => {
    const k = gameRef.current.lampsOn;
    lampMat.color.setRGB(0.16 + 1.0 * k, 0.12 + 0.62 * k, 0.08 + 0.28 * k);
    poolMat.color.setRGB(1, 0.71, 0.38).multiplyScalar(0.75 * k);
    for (const m of signMats.current) m.color.setScalar(0.25 + 0.75 * k);
  });
  return (
    <group>
      {lamps.map(([x, y, z], i) => (
        <group key={i}>
          <mesh position={[x, y, z]} material={lampMat}>
            <boxGeometry args={[0.5, 0.12, 0.3]} />
          </mesh>
          <mesh position={[x * 0.82, 0.02, z]} rotation-x={-Math.PI / 2} material={poolMat}>
            <planeGeometry args={[5, 5]} />
          </mesh>
        </group>
      ))}
      {signs.map((map, i) => {
        const left = i % 2 === 0;
        return (
          <mesh key={i} position={[left ? -3.16 : 3.16, 3.1 + (i % 2) * 0.6, 27 - i * 5.5]} rotation-y={left ? Math.PI / 2 : -Math.PI / 2}>
            <planeGeometry args={[2.4, 1.2]} />
            <meshBasicMaterial ref={(m) => void (m && (signMats.current[i] = m))} map={map} toneMapped={false} />
          </mesh>
        );
      })}
      {/* 실외기 */}
      {[[-2.9, 1.9, 23], [2.9, 2.6, 16], [-2.9, 3.4, 10], [2.9, 1.4, 9.2], [-2.9, 1.2, 29]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.6, 0.7, 0.9]} />
          <meshStandardMaterial color="#5c6168" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      {/* 머리 위로 늘어진 전선 */}
      {[24, 19, 14, 9.5].map((z, i) => (
        <mesh key={i} position={[0, 5.4 - (i % 2) * 0.3, z]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.02, 0.02, 6.4, 4]} />
          <meshBasicMaterial color="#0b0d10" />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 도입부: 통로 B-2, 첫 번째 장치(국소 전원), 통로 문 ----------
   첫 장치의 케이블은 바로 앞 통로 문, 통로 조명, 그리고 골목 안쪽 셔터 제어판으로만 이어진다.
   켜면 이 좁은 통로만 살아난다. (두 번째 장치의 케이블은 큰길 감시탑으로 간다) */

const CABLE_COLOR = "#1a1d21";

/** 두 점을 잇는 케이블 한 토막 */
function Cable({ from, to, r = 0.035 }: { from: [number, number, number]; to: [number, number, number]; r?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const d = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return { pos: a.add(b).multiplyScalar(0.5), quat: q, len: d.length() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.join(","), to.join(",")]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 5]} />
      <meshBasicMaterial color={CABLE_COLOR} />
    </mesh>
  );
}

function Passage({ gameRef }: { gameRef: GameRef }) {
  const door = useRef<THREE.Group>(null);
  const doorLamp = useRef<THREE.MeshBasicMaterial>(null);
  const devLamp = useRef<THREE.MeshBasicMaterial>(null);
  const lampMat = useDisposable(() => new THREE.MeshBasicMaterial({ color: "#1c1a16", toneMapped: false }));
  const poolMat = useDisposable(() => lightPoolMaterial("#d9e6ff", 0.0, "top"));
  const label = useSign([["국소 전원 · 통로 B-2", 1], ["연결: 통로 문 · 통로 조명 · 셔터 제어", 0.55]], { color: "#b9c6cf", bg: "#0f1418", border: true, mono: true });
  const doorSign = useSign([["B-2", 1.2], ["전원 차단 시 잠김", 0.5]], { color: "#c9a25c", bg: "#14110b", border: true, mono: true });
  const ribs = useDisposable(() => {
    const t = hazardTexture();
    t.repeat.set(6, 1);
    return t;
  });
  useFrame(({ clock }) => {
    const b = gameRef.current.breaker;
    if (door.current) door.current.position.y = b.door * 3.6;
    // 꺼진 장치는 고장 난 표시등만 불규칙하게 깜빡인다
    const flick = Math.sin(clock.elapsedTime * 23) * Math.sin(clock.elapsedTime * 7.3) > 0.55 ? 0.9 : 0.12;
    devLamp.current?.color.set(b.done ? "#5fe0a8" : "#d0503e").multiplyScalar(b.done ? 1 : flick + b.hold * 0.8);
    doorLamp.current?.color.set(b.done ? "#5fe0a8" : "#1e2226");
    lampMat.color.setRGB(0.11 + 0.85 * b.light, 0.1 + 0.9 * b.light, 0.09 + 0.95 * b.light);
    poolMat.color.setRGB(0.85, 0.9, 1).multiplyScalar(0.7 * b.light);
  });
  const lamps: [number, number, number][] = [[2.9, 4.2, 35.2], [-2.9, 4.2, 42.6]];
  return (
    <group>
      {/* 통로 문 */}
      <group ref={door}>
        <mesh position={[0, 2, PASSAGE_DOOR_Z]}>
          <boxGeometry args={[6.4, 4, 0.22]} />
          <meshStandardMaterial color="#4a4f55" metalness={0.55} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.35, PASSAGE_DOOR_Z + 0.12]}>
          <planeGeometry args={[6.4, 0.3]} />
          <meshBasicMaterial map={ribs} />
        </mesh>
        <mesh position={[0, 2.4, PASSAGE_DOOR_Z + 0.12]}>
          <planeGeometry args={[1.4, 0.7]} />
          <meshBasicMaterial map={doorSign} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 4.25, PASSAGE_DOOR_Z]}>
        <boxGeometry args={[6.6, 0.5, 0.6]} />
        <meshStandardMaterial color="#1b1f24" />
      </mesh>
      <mesh position={[-2.4, 4.25, PASSAGE_DOOR_Z + 0.31]}>
        <planeGeometry args={[0.16, 0.1]} />
        <meshBasicMaterial ref={doorLamp} color="#1e2226" toneMapped={false} />
      </mesh>
      {/* 첫 번째 장치: 서쪽 벽의 작은 분전함 */}
      <group position={[-3.0, 0, BREAKER.z]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[0.8, 1.1, 0.36]} />
          <meshStandardMaterial color="#39414a" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.55, 0.19]}>
          <planeGeometry args={[0.32, 0.1]} />
          <meshBasicMaterial ref={devLamp} color="#d0503e" toneMapped={false} />
        </mesh>
        <mesh position={[0, 2.25, 0.02]}>
          <planeGeometry args={[1.5, 0.62]} />
          <meshBasicMaterial map={label} toneMapped={false} />
        </mesh>
      </group>
      {/* 케이블: 장치 → 통로 문틀 → 문 위를 건너 동쪽 벽을 따라 셔터 제어판까지 */}
      <Cable from={[-3.1, 1.8, BREAKER.z]} to={[-3.1, 3.9, BREAKER.z]} />
      <Cable from={[-3.1, 3.9, BREAKER.z]} to={[-3.1, 3.9, PASSAGE_DOOR_Z + 0.35]} />
      <Cable from={[-3.1, 3.9, PASSAGE_DOOR_Z + 0.35]} to={[3.1, 3.9, PASSAGE_DOOR_Z + 0.35]} />
      <Cable from={[3.1, 3.9, PASSAGE_DOOR_Z + 0.35]} to={[3.1, 3.9, SHUTTER_PANEL.z]} />
      <Cable from={[3.1, 3.9, SHUTTER_PANEL.z]} to={[3.1, 1.55, SHUTTER_PANEL.z]} />
      {/* 통로 조명 (첫 장치로만 켜진다) */}
      {lamps.map(([x, y, z], i) => (
        <group key={i}>
          <mesh position={[x, y, z]} material={lampMat}>
            <boxGeometry args={[0.4, 0.1, 0.9]} />
          </mesh>
          <mesh position={[x * 0.7, 0.02, z]} rotation-x={-Math.PI / 2} material={poolMat}>
            <planeGeometry args={[4.4, 4.4]} />
          </mesh>
        </group>
      ))}
      {/* 이산이 숨어 있던 벽감: 쌓인 상자와 접힌 방수포 */}
      <mesh position={[2.85, 0.45, SAN_START.z - 1.2]}>
        <boxGeometry args={[0.6, 0.9, 0.8]} />
        <meshStandardMaterial color="#4a3f30" roughness={0.9} />
      </mesh>
      <mesh position={[2.9, 0.3, SAN_START.z + 1.1]} rotation-y={0.3}>
        <boxGeometry args={[0.5, 0.6, 0.6]} />
        <meshStandardMaterial color="#3d3428" roughness={0.9} />
      </mesh>
      <mesh position={[2.6, 0.04, SAN_START.z]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.1, 1.4]} />
        <meshStandardMaterial color="#2d3a3a" roughness={1} />
      </mesh>
    </group>
  );
}

/* ---------- 셔터 ---------- */

function Shutter({ gameRef }: { gameRef: GameRef }) {
  const door = useRef<THREE.Group>(null);
  const light = useRef<THREE.MeshBasicMaterial>(null);
  const ribs = useDisposable(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const g = c.getContext("2d")!;
    for (let y = 0; y < 256; y += 16) {
      g.fillStyle = "#3e434a";
      g.fillRect(0, y, 64, 12);
      g.fillStyle = "#23272c";
      g.fillRect(0, y + 12, 64, 4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  useFrame(() => {
    const g = gameRef.current;
    if (door.current) door.current.position.y = g.shutter.open * 3.6;
    // 국소 전원이 없으면 제어판은 꺼져 있다. 전원이 들어오면 잠김(주황), 열리면 초록
    light.current?.color.set(!g.breaker.done ? "#1e2226" : g.shutter.state === "closed" ? "#e0a040" : "#5fe0a8");
  });
  return (
    <group>
      <group ref={door}>
        <mesh position={[0, 2, SHUTTER_Z]}>
          <boxGeometry args={[6.4, 4, 0.18]} />
          <meshStandardMaterial map={ribs} color="#9aa2ab" metalness={0.5} roughness={0.55} />
        </mesh>
      </group>
      <mesh position={[0, 4.25, SHUTTER_Z]}>
        <boxGeometry args={[6.6, 0.5, 0.6]} />
        <meshStandardMaterial color="#20252b" />
      </mesh>
      <group position={[3.1, 1.3, SHUTTER_PANEL.z]}>
        <mesh>
          <boxGeometry args={[0.12, 0.5, 0.36]} />
          <meshStandardMaterial color="#2b3036" />
        </mesh>
        <mesh position={[-0.07, 0.12, 0]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[0.12, 0.06]} />
          <meshBasicMaterial ref={light} color="#d65a4a" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 두 번째 복구 장치 ---------- */

function Relay({ gameRef }: { gameRef: GameRef }) {
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  const pl = useRef<THREE.PointLight>(null);
  const warn = useSign([["구역 전원 · 7구역", 1], ["연동: 큰길 차단문 · 감시망", 0.55]], { color: "#e2b36a", bg: "#16120c", border: true, mono: true });
  useFrame(({ clock }) => {
    const g = gameRef.current;
    const done = g.relay.done;
    const blink = done ? 1 : Math.sin(clock.elapsedTime * 5) > 0 ? 1 : 0.25;
    lamp.current?.color.set(done ? "#5fe0a8" : "#f0a43a").multiplyScalar(blink);
    if (pl.current) {
      pl.current.color.set(done ? "#5fe0a8" : "#f0a43a");
      pl.current.intensity = (done ? 2.2 : 3.2) * (0.6 + 0.4 * blink) + g.relay.hold * 3;
    }
  });
  return (
    <group position={[RELAY.x - 0.75, 0, RELAY.z]} rotation-y={Math.PI / 2}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.6, 2.2, 0.7]} />
        <meshStandardMaterial color="#3a4148" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.6, 0.36]}>
        <planeGeometry args={[0.5, 0.18]} />
        <meshBasicMaterial ref={lamp} color="#f0a43a" toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.75, 0.02]}>
        <planeGeometry args={[1.6, 0.8]} />
        <meshBasicMaterial map={warn} toneMapped={false} />
      </mesh>
      {/* 굵은 케이블이 큰길 쪽 감시탑으로 이어진다 (위험의 단서) */}
      <mesh position={[0.3, 4.6, -0.1]} rotation-x={0.2}>
        <cylinderGeometry args={[0.06, 0.06, 4.8, 6]} />
        <meshStandardMaterial color="#14171b" />
      </mesh>
      <pointLight ref={pl} position={[0, 1.8, 1.4]} distance={7} decay={1.6} intensity={3} color="#f0a43a" />
    </group>
  );
}

/** 두 번째 장치의 굵은 케이블: 서쪽 벽을 따라 큰길로 내려가, 머리 위로 길을 건너 감시탑(L1)에 닿는다.
 *  첫 장치의 가는 케이블과 굵기·경로가 달라서, 이 장치가 감시망과 연결돼 있다는 것을 공간으로 읽을 수 있다 */
function RelayCable() {
  const tower = LIGHTS.find((l) => l.id === "L1")!;
  const x = -9.9, y = 5.4;
  return (
    <group>
      <Cable r={0.07} from={[RELAY.x - 0.75, 2.2, RELAY.z]} to={[x, y, RELAY.z]} />
      <Cable r={0.07} from={[x, y, RELAY.z]} to={[x, y, tower.src.z]} />
      <Cable r={0.07} from={[x, y, tower.src.z]} to={[tower.src.x, tower.src.y - 1.5, tower.src.z]} />
      {/* 큰길 차단문 쪽 분기 */}
      <Cable r={0.05} from={[x, y, GATE_Z + 1.5]} to={[x, y, GATE_Z + 0.4]} />
      <Cable r={0.05} from={[x, y, GATE_Z + 0.4]} to={[GATE_PANEL.x + 1.0, y, GATE_Z + 0.4]} />
    </group>
  );
}

/* ---------- 엄폐물 ---------- */

function Cover({ c }: { c: (typeof COVERS)[number] }) {
  const [cx, cz] = center(c);
  const [w, d] = size(c);
  const body = (color: string, h = c.h, metal = 0.3) => (
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={metal} />
    </mesh>
  );
  switch (c.look) {
    case "container":
      return <group position={[cx, 0, cz]}>{body("#4b3a33", c.h, 0.5)}<mesh position={[w / 2 + 0.01, 1.6, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[d * 0.8, 0.5]} /><meshBasicMaterial color="#8f7a5a" transparent opacity={0.35} /></mesh></group>;
    case "shelter":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, c.h / 2, d / 2 - 0.1]}><boxGeometry args={[w, c.h, 0.12]} /><meshStandardMaterial color="#3d4650" metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[0, c.h + 0.05, 0]}><boxGeometry args={[w + 0.4, 0.12, d + 0.4]} /><meshStandardMaterial color="#2b3138" /></mesh>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[w - 0.4, 0.08, 0.5]} /><meshStandardMaterial color="#555b62" /></mesh>
          <mesh position={[0, c.h / 2 + 0.3, d / 2 - 0.17]} rotation-y={Math.PI}><planeGeometry args={[1.4, 0.8]} /><meshBasicMaterial color="#1e4a7a" /></mesh>
        </group>
      );
    case "van":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[w, 0.5, d]} /><meshStandardMaterial color="#202326" /></mesh>
          <mesh position={[0, 1.35, 0.4]}><boxGeometry args={[w, 1.7, d - 0.8]} /><meshStandardMaterial color="#9ea4a8" roughness={0.5} metalness={0.4} /></mesh>
          <mesh position={[0, 1.15, -d / 2 + 0.45]}><boxGeometry args={[w * 0.96, 1.3, 0.9]} /><meshStandardMaterial color="#7f878c" metalness={0.5} roughness={0.3} /></mesh>
        </group>
      );
    case "kiosk":
      return (
        <group position={[cx, 0, cz]}>
          {body("#3d5a4f")}
          <mesh position={[0, c.h - 0.4, d / 2 + 0.01]}><planeGeometry args={[w * 0.9, 0.4]} /><meshBasicMaterial color="#c9b98a" transparent opacity={0.4} /></mesh>
        </group>
      );
    case "barrier":
      return (
        <group position={[cx, 0, cz]}>
          {body("#7d7a73", c.h, 0.05)}
          <mesh position={[0, c.h * 0.7, d / 2 + 0.01]}><planeGeometry args={[w, 0.25]} /><meshBasicMaterial color="#a07d2a" transparent opacity={0.5} /></mesh>
        </group>
      );
    case "truck":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[w, 0.6, d]} /><meshStandardMaterial color="#1b1d20" /></mesh>
          <mesh position={[0, 1.75, 0.6]}><boxGeometry args={[w, 2.3, d - 1.2]} /><meshStandardMaterial color="#5a6066" metalness={0.5} roughness={0.5} /></mesh>
          <mesh position={[0, 1.35, -d / 2 + 0.6]}><boxGeometry args={[w * 0.95, 1.5, 1.1]} /><meshStandardMaterial color="#38536b" metalness={0.5} roughness={0.35} /></mesh>
        </group>
      );
    default:
      return (
        <group position={[cx, 0, cz]}>
          {body("#5a4c3a", c.h * 0.55, 0.05)}
          <mesh position={[0.2, c.h * 0.55 + (c.h * 0.45) / 2, 0.1]} rotation-y={0.2}><boxGeometry args={[w * 0.6, c.h * 0.45, d * 0.6]} /><meshStandardMaterial color="#4a3f30" /></mesh>
        </group>
      );
  }
}

/* ---------- 차단문과 지하철 입구 ---------- */

function Gate({ gameRef }: { gameRef: GameRef }) {
  const door = useRef<THREE.Group>(null);
  const status = useRef<THREE.MeshBasicMaterial>(null);
  const bar = useRef<THREE.Mesh>(null);
  const hazard = useDisposable(() => {
    const t = hazardTexture();
    t.repeat.set(12, 1);
    return t;
  });
  const label = useSign([["통제 구역", 1], ["대자비 관리 · 무단 접근 시 기록", 0.45]], { color: "#e05a66", bg: "#120a0c", border: true });
  useFrame(() => {
    const g = gameRef.current;
    if (door.current) door.current.position.y = g.gate.open * 4.2;
    const k = g.gate.hold / 3.2;
    // 구역 전원(두 번째 장치)이 꺼져 있으면 제어판도 꺼져 있다
    status.current?.color.set(!g.relay.done ? "#262a30" : g.gate.opened ? "#5fe0a8" : k > 0 ? "#f0c35a" : "#e0485c");
    if (bar.current) bar.current.scale.x = Math.max(0.001, k);
  });
  return (
    <group>
      <group ref={door}>
        <mesh position={[0, 2.1, GATE_Z]}>
          <boxGeometry args={[20, 4.2, 0.5]} />
          <meshStandardMaterial color="#3a3f46" metalness={0.6} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.5, GATE_Z + 0.26]}>
          <planeGeometry args={[20, 0.4]} />
          <meshBasicMaterial map={hazard} />
        </mesh>
        <mesh position={[0, 2.6, GATE_Z + 0.26]}>
          <planeGeometry args={[3.6, 1.2]} />
          <meshBasicMaterial map={label} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 4.6, GATE_Z]}>
        <boxGeometry args={[20.4, 0.8, 0.9]} />
        <meshStandardMaterial color="#1c1f24" />
      </mesh>
      <group position={[GATE_PANEL.x + 0.7, 0, GATE_PANEL.z]} rotation-y={-Math.PI / 2}>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[0.8, 2.3, 0.5]} />
          <meshStandardMaterial color="#454c55" metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.7, 0.26]}>
          <planeGeometry args={[0.5, 0.3]} />
          <meshBasicMaterial ref={status} color="#e0485c" toneMapped={false} />
        </mesh>
        <mesh ref={bar} position={[0, 1.35, 0.26]}>
          <planeGeometry args={[0.5, 0.06]} />
          <meshBasicMaterial color="#f0c35a" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Subway() {
  const sign = useSign([["2  을지로3가", 1.1], ["Euljiro 3(sam)-ga · 출구 2", 0.5]], { color: "#f2f5f3", bg: "#0f2a1b", border: false });
  const steps = 10;
  const depth = STAIR_TOP_Z - STAIR_BOTTOM_Z;
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => {
        const z = STAIR_TOP_Z - (i + 0.5) * (depth / steps);
        const y = -((i + 1) / steps) * STAIR_DROP;
        return (
          <mesh key={i} position={[0, y / 2 - 0.05, z]}>
            <boxGeometry args={[5, Math.abs(y) + 0.1, depth / steps]} />
            <meshStandardMaterial color={i % 2 ? "#3e444b" : "#454c53"} roughness={0.85} />
          </mesh>
        );
      })}
      {/* 계단 아래에서 올라오는 차가운 빛: 목적지 랜드마크 */}
      <mesh position={[0, -STAIR_DROP + 0.05, STAIR_BOTTOM_Z - 1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[5, 4]} />
        <meshBasicMaterial color="#bfeee0" toneMapped={false} />
      </mesh>
      <pointLight position={[0, -1.2, STAIR_BOTTOM_Z]} intensity={6} distance={11} decay={1.4} color="#a8f0dc" />
      {/* 캐노피 */}
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 1.4, -51]}>
          <boxGeometry args={[0.12, 2.8, 8]} />
          <meshStandardMaterial color="#6f7a80" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.85, -51]}>
        <boxGeometry args={[5.6, 0.1, 8.2]} />
        <meshStandardMaterial color="#9fb3ba" transparent opacity={0.35} metalness={0.4} roughness={0.1} />
      </mesh>
      <mesh position={[0, 3.35, STAIR_TOP_Z + 0.2]}>
        <planeGeometry args={[4.2, 0.9]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <mesh position={[-1.75, 3.35, STAIR_TOP_Z + 0.21]}>
        <circleGeometry args={[0.32, 20]} />
        <meshBasicMaterial color="#2bb35a" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------- 감시등 ---------- */

function Searchlights({ gameRef }: { gameRef: GameRef }) {
  const n = gameRef.current.lights.length;
  const cone = useDisposable(() => {
    const g = new THREE.ConeGeometry(1, 1, 28, 1, true);
    g.translate(0, -0.5, 0);
    return g;
  });
  const beams = useMemo(() => Array.from({ length: n }, () => beamMaterial("#cfe2ff", 0.42)), [n]);
  const spotTex = useDisposable(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,0.85)");
    grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.78, "rgba(255,255,255,0.32)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  });
  // 바닥 위 감시 구역: 가산 합성이라 어두운 바닥 위에서도 경계가 분명하다 (게임 판정 반경과 일치)
  const pools = useMemo(
    () => Array.from({ length: n }, () => new THREE.MeshBasicMaterial({ map: spotTex, color: "#cfe2ff", transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 })),
    [n, spotTex]
  );
  const rings = useMemo(
    () => Array.from({ length: n }, () => new THREE.MeshBasicMaterial({ color: "#cfe2ff", transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })),
    [n]
  );
  const heads = useMemo(() => Array.from({ length: n }, () => new THREE.MeshBasicMaterial({ color: "#2a2f36", toneMapped: false })), [n]);
  useEffect(() => () => [...beams, ...pools, ...rings, ...heads].forEach((m) => m.dispose()), [beams, pools, rings, heads]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const beamMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const poolMeshes = useRef<(THREE.Group | null)[]>([]);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), down: new THREE.Vector3(0, -1, 0), c: new THREE.Color() }), []);
  useFrame(({ clock }) => {
    const g = gameRef.current;
    g.lights.forEach((l, i) => {
      const beam = beamMeshes.current[i];
      const pool = poolMeshes.current[i];
      const on = l.on;
      if (beam) beam.visible = on;
      if (pool) pool.visible = on;
      heads[i].color.set(on ? (l.tracking ? "#ff6a7c" : "#f4f8ff") : "#2a2f36");
      if (!on || !beam || !pool) return;
      const s = l.def.src;
      tmp.v.set(l.x - s.x, -s.y, l.z - s.z);
      const len = tmp.v.length();
      beam.position.set(s.x, s.y, s.z);
      beam.quaternion.setFromUnitVectors(tmp.down, tmp.v.normalize());
      beam.scale.set(l.def.radius, len, l.def.radius);
      pool.position.set(l.x, 0.03, l.z);
      const hot = l.tracking ? 1 : 0;
      tmp.c.copy(SPOT_IDLE).lerp(SPOT_HOT, hot);
      (beams[i].uniforms.uColor.value as THREE.Color).copy(tmp.c);
      pools[i].color.copy(tmp.c).multiplyScalar(0.55 + 0.25 * hot);
      rings[i].color.copy(tmp.c);
      rings[i].opacity = 0.35 + 0.25 * Math.sin(clock.elapsedTime * (l.tracking ? 14 : 3));
    });
  });
  return (
    <group>
      {gameRef.current.lights.map((l, i) => {
        const s = l.def.src;
        const giant = l.def.id === "L3";
        return (
          <group key={l.def.id} ref={(g) => void (groups.current[i] = g)}>
            {/* 감시탑 */}
            <mesh position={[s.x, s.y / 2, s.z]}>
              <boxGeometry args={[giant ? 1.6 : 0.5, s.y, giant ? 1.6 : 0.5]} />
              <meshStandardMaterial color="#1a1d22" metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh position={[s.x, s.y + (giant ? 0.6 : 0.25), s.z]} material={heads[i]}>
              <sphereGeometry args={[giant ? 1.4 : 0.55, 16, 10]} />
            </mesh>
            <mesh ref={(m) => void (beamMeshes.current[i] = m)} geometry={cone} material={beams[i]} visible={false} />
            <group ref={(m) => void (poolMeshes.current[i] = m)} visible={false}>
              <mesh rotation-x={-Math.PI / 2} material={pools[i]}>
                <planeGeometry args={[l.def.radius * 2.15, l.def.radius * 2.15]} />
              </mesh>
              <mesh rotation-x={-Math.PI / 2} position-y={0.01} material={rings[i]}>
                <ringGeometry args={[l.def.radius - 0.08, l.def.radius, 40]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/* ---------- 이산 ---------- */

function San({ gameRef }: { gameRef: GameRef }) {
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const visor = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const s = gameRef.current.san;
    if (!g.current) return;
    // 표시 여부와 자세는 React 재렌더링이 아니라 게임 상태에서 매 프레임 읽는다 (첫 만남 전에는 보이지 않는다)
    g.current.visible = s.visible;
    if (!s.visible) return;
    const t = clock.elapsedTime;
    g.current.position.set(s.x, s.moving ? Math.abs(Math.sin(t * 9)) * 0.06 : 0, s.z);
    // 웅크림(숨어 있을 때, 감시등에 걸렸을 때)
    const crouch = s.pose === "stand" ? 1 : s.pose === "hide" ? 0.6 : 0.68;
    const bd = body.current;
    if (bd) bd.scale.y += (crouch - bd.scale.y) * 0.2;
    // 부드럽게 돈다
    let dy = s.yaw - g.current.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.current.rotation.y += dy * 0.18;
    g.current.rotation.x = s.moving ? 0.12 : 0;
    const speaking = gameRef.current.line?.who === "san";
    visor.current?.color.set(speaking ? "#9ff7ec" : "#3fb5ac");
  });
  return (
    <group ref={g} visible={false}>
      <group ref={body} scale={[1, 0.6, 1]}>
        <Human position={[0, 0, 0]} color="#22303f" skin="#d9b9a0" hood="#16161a" />
        <mesh position={[0, 1.66, 0.11]}>
          <boxGeometry args={[0.2, 0.035, 0.02]} />
          <meshBasicMaterial ref={visor} color="#3fb5ac" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 목표 비컨 ---------- */

function Beacon({ gameRef }: { gameRef: GameRef }) {
  const g = useRef<THREE.Group>(null);
  const mat = useDisposable(() => beamMaterial("#7fe8d8", 0.35));
  const dia = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const game = gameRef.current;
    const b = beaconOf(game);
    if (!g.current) return;
    g.current.visible = !!b;
    if (!b) return;
    g.current.position.set(b.x, 0, b.z);
    const near = Math.hypot(game.player.x - b.x, game.player.z - b.z);
    g.current.visible = near > 3.2;
    if (dia.current) {
      dia.current.rotation.y = clock.elapsedTime * 1.5;
      dia.current.position.y = 3 + Math.sin(clock.elapsedTime * 2) * 0.15;
    }
  });
  return (
    <group ref={g}>
      <mesh position={[0, 6, 0]} material={mat}>
        <cylinderGeometry args={[0.02, 0.22, 12, 10, 1, true]} />
      </mesh>
      <mesh ref={dia}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshBasicMaterial color="#9ff7ec" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------- 비 (고품질에서만) ---------- */

function Rain({ gameRef }: { gameRef: GameRef }) {
  const mat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uOrigin: { value: new THREE.Vector3() } },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform vec3 uOrigin;
          attribute float aSeed;
          varying float vA;
          void main() {
            vec3 p = position;
            p.y = mod(p.y - uTime * 14.0 * (0.8 + aSeed * 0.4), 14.0);
            p.xz = mod(p.xz - uOrigin.xz + 15.0, 30.0) - 15.0 + uOrigin.xz;
            vA = 0.35 * aSeed;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = 1.6;
          }`,
        fragmentShader: /* glsl */ `varying float vA; void main(){ gl_FragColor = vec4(0.7,0.78,0.86,vA); }`,
      })
  );
  const geo = useDisposable(() => {
    const n = 2200;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * 30 - 15;
      pos[i * 3 + 1] = Math.random() * 14;
      pos[i * 3 + 2] = Math.random() * 30 - 15;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  });
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    const p = gameRef.current.player;
    (mat.uniforms.uOrigin.value as THREE.Vector3).set(p.x, 0, p.z);
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/* ---------- 조합 ---------- */

export function ChaseScene({ gameRef, quality }: { gameRef: GameRef; quality: ChaseQuality }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  useFrame(() => {
    const g = gameRef.current;
    // 전력이 돌아오면 도시 전체가 아주 조금 밝아지고, 경보 순간에 붉게 질린다
    if (hemi.current) {
      hemi.current.intensity = 2.0 + 0.5 * g.lampsOn;
      hemi.current.color.setRGB(0.42 + 0.5 * g.alarm, 0.5 - 0.1 * g.alarm, 0.62 - 0.2 * g.alarm);
    }
  });
  return (
    <>
      <color attach="background" args={["#05080d"]} />
      <fog attach="fog" args={["#070b11", 10, quality === "high" ? 78 : 62]} />
      <hemisphereLight ref={hemi} args={["#6b7f9e", "#2a2e36", 2.0]} />
      <ambientLight intensity={0.45} color="#5b6b80" />
      <directionalLight position={[-12, 30, 18]} intensity={0.6} color="#8ea6c8" />
      <Ground />
      <Buildings quality={quality} />
      <AlleyDressing gameRef={gameRef} />
      <Passage gameRef={gameRef} />
      <Shutter gameRef={gameRef} />
      <Relay gameRef={gameRef} />
      <RelayCable />
      {COVERS.map((c, i) => <Cover key={i} c={c} />)}
      {BUILDINGS.filter((b: Block) => b.kind === "cover").map((b, i) => {
        const [cx, cz] = center(b);
        const [w, d] = size(b);
        return (
          <mesh key={i} position={[cx, b.h / 2, cz]}>
            <boxGeometry args={[w, b.h, d]} />
            <meshStandardMaterial color="#59616a" roughness={0.8} />
          </mesh>
        );
      })}
      <Gate gameRef={gameRef} />
      <Subway />
      <Searchlights gameRef={gameRef} />
      <San gameRef={gameRef} />
      <Beacon gameRef={gameRef} />
      {quality === "high" && <Rain gameRef={gameRef} />}
    </>
  );
}
