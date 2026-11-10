"use client";

import { gaze } from "./gaze";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Lang } from "@/data/site";
import { billboards, ticker } from "./story";
import { AVENUE, CAMERA_POLES, CITY, CITY_NPCS, CROSS, DEPOT, EDGE, ISLANDS, LOTS, NS2_X, OVERSEER_ISLAND, QUEUE_X, QUEUE_Z, WALK } from "./zones";
import { AirTraffic, Arks, Bridge, CloudSea, Islands, Platform, Sky, TwinBuddhas } from "./CityWorld";
import { AlleyDecor, AlleyPeople, AvenueHolo, ChalkMarks, NeonRoute, BellPavilion, Courier, EdgeKid, Grandma, Hatch, LotusStrings, RoboMonk, Scopes, StonePagoda, VendorReplica } from "./CityAlleys";
import { citizenGeometry, roofGeometry, smileGeometry, visorGeometry } from "./models";
import { towerMaterial } from "./towerMaterial";
import { useNeoPost } from "./neoPost";
import { NeonEnvironment, useBeam, useLightPool } from "./atmosphere";
import { addRim } from "./rim";
import { lite, useQuality } from "./quality";
import { concreteTexture, glowTexture, signTexture } from "./textures";
import { Human, Tap, useSign, type TapFn } from "./parts";
import { player } from "./Player";
import { sfx } from "./sfx";
import { faceRt } from "./faceRuntime";
import Jabi from "./Jabi";
import Drones from "./Drones";

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();

/* ---------- 빌딩 숲 ---------- */
type Tower = { x: number; z: number; w: number; d: number; h: number; y0?: number };
function useTowers() {
  return useMemo(() => {
    const r = rng(11);
    const towers: Tower[] = [];
    const roofs: Tower[] = [];
    const eaves: Tower[] = []; // 기와지붕을 얹을 자리
    const spires: Tower[] = []; // 고딕 첨탑
    // 오른쪽(x>0)에만 만들고 왼쪽은 거울에 비춘 듯 똑같이 복사한다
    const add = (x: number, z: number, w: number, d: number, h: number, y0 = 0) => {
      let y = 0;
      let cw = w;
      let cd = d;
      const tiers = h > 40 ? 3 : h > 22 ? 2 : 1;
      const style = r();
      const hanok = style < 0.55;
      const gothic = !hanok && h > 34;
      for (let i = 0; i < tiers; i++) {
        const th = i === tiers - 1 ? h - y : h * (0.45 + r() * 0.2) - y * 0.3;
        for (const m of [1, -1]) {
          towers.push({ x: x * m, z, w: cw, d: cd, h: th + y, y0 });
          if (hanok) eaves.push({ x: x * m, z, w: cw * 1.22, d: cd * 1.22, h: th + y, y0 });
        }
        y += th;
        cw *= 0.62 + r() * 0.2;
        cd *= 0.62 + r() * 0.2;
      }
      for (const m of [1, -1]) {
        if (gothic) {
          // 꼭대기와 네 귀퉁이에 뾰족한 첨탑
          spires.push({ x: x * m, z, w: cw * 0.7, d: cw * 0.7, h: y + cw * 3.2, y0: y0 + y });
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) spires.push({ x: x * m + sx * cw * 0.42, z: z + sz * cd * 0.42, w: cw * 0.16, d: cw * 0.16, h: cw * 1.4, y0: y0 + y });
        } else roofs.push({ x: x * m, z, w: cw, d: cd, h: y, y0 });
      }
    };
    for (const l of LOTS) {
      if (l.side < 0) continue;
      const w = l.x1 - l.x0;
      const d = l.z1 - l.z0;
      const base = [24, 16, 12][l.col];
      const extra = [76, 46, 30][l.col];
      add((l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2, w, d, base + r() * r() * extra);
    }
    // 떠 있는 섬 위의 건물들 (오른쪽 섬만 만들고 복사)
    for (const isl of ISLANDS) {
      if (isl.x < 0 || !isl.towers) continue;
      const n = 7 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const rr = r() * isl.r * 0.7;
        add(isl.x + Math.cos(a) * rr, isl.z + Math.sin(a) * rr, 6 + r() * 8, 6 + r() * 8, 18 + r() * r() * 90, isl.y);
      }
    }
    return { towers, roofs, eaves, spires };
  }, []);
}

function Towers() {
  const { towers, roofs, eaves, spires } = useTowers();
  const spireRef = useRef<THREE.InstancedMesh>(null);
  const roofGeo = roofGeometry();
  const eaveRef = useRef<THREE.InstancedMesh>(null);
  const trimRef = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => towerMaterial(), []);
  useNeoPost(mat);
  const body = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  const antennas = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    towers.forEach((t, i) => {
      tmpM.compose(tmpV.set(t.x, (t.y0 ?? 0) + t.h / 2, t.z), tmpQ.identity(), tmpS.set(t.w, t.h, t.d));
      body.current!.setMatrixAt(i, tmpM);
    });
    spires.forEach((t, i) => {
      tmpM.compose(tmpV.set(t.x, (t.y0 ?? 0) + t.h / 2, t.z), tmpQ.setFromEuler(tmpE.set(0, Math.PI / 4, 0)), tmpS.set(t.w, t.h, t.d));
      spireRef.current!.setMatrixAt(i, tmpM);
    });
    if (spires.length) spireRef.current!.instanceMatrix.needsUpdate = true;
    body.current!.instanceMatrix.needsUpdate = true;
    roofs.forEach((t, i) => {
      const y0 = t.y0 ?? 0;
      tmpM.compose(tmpV.set(t.x + t.w * 0.3 * Math.sign(t.x || 1), y0 + t.h + 3, t.z), tmpQ.identity(), tmpS.set(0.25, 6, 0.25));
      antennas.current!.setMatrixAt(i, tmpM);
      tmpM.compose(tmpV.set(t.x + t.w * 0.3 * Math.sign(t.x || 1), y0 + t.h + 6.1, t.z), tmpQ.identity(), tmpS.set(0.5, 0.5, 0.5));
      lights.current!.setMatrixAt(i, tmpM);
    });
    antennas.current!.instanceMatrix.needsUpdate = true;
    eaves.forEach((t, i) => {
      const rh = Math.min(t.w, t.d) * 0.32;
      const y0 = t.y0 ?? 0;
      tmpM.compose(tmpV.set(t.x, y0 + t.h - 0.05, t.z), tmpQ.identity(), tmpS.set(t.w, rh, t.d));
      eaveRef.current!.setMatrixAt(i, tmpM);
      // 처마 밑 단청 띠 (청록)
      tmpM.compose(tmpV.set(t.x, y0 + t.h - 0.25, t.z), tmpQ.identity(), tmpS.set(t.w * 0.72, 0.4, t.d * 0.72));
      trimRef.current!.setMatrixAt(i, tmpM);
    });
    eaveRef.current!.instanceMatrix.needsUpdate = true;
    trimRef.current!.instanceMatrix.needsUpdate = true;
    lights.current!.instanceMatrix.needsUpdate = true;
  }, [towers, roofs, eaves, spires]);

  const blink = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    if (blink.current) blink.current.opacity = Math.sin(s.clock.elapsedTime * 2.2) > 0.2 ? 1 : 0.15;
  });

  return (
    <group>
      <instancedMesh ref={body} args={[undefined, mat, towers.length]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={eaveRef} args={[roofGeo, undefined, eaves.length]} frustumCulled={false}>
        <meshStandardMaterial color="#1c2026" roughness={0.55} metalness={0.5} emissive="#0b1418" />
      </instancedMesh>
      <instancedMesh ref={trimRef} args={[undefined, undefined, eaves.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color="#1fa59a" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={spireRef} args={[undefined, undefined, Math.max(1, spires.length)]} frustumCulled={false}>
        <coneGeometry args={[0.72, 1, 4]} />
        <meshStandardMaterial color="#141418" metalness={0.75} roughness={0.35} emissive="#12060a" />
      </instancedMesh>
      <instancedMesh ref={antennas} args={[undefined, undefined, roofs.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.5, 1, 1, 6]} />
        <meshStandardMaterial color="#15171c" metalness={0.8} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, roofs.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial ref={blink} color="#ff2030" transparent toneMapped={false} fog={false} />
      </instancedMesh>
    </group>
  );
}

/* ---------- 바닥, 인도, 차선, 그리고 굳이 짝을 맞춘 얼룩들 ---------- */
// 큰길에서는 물웅덩이·쓰레기·금까지 좌우가 똑같다
const MIRROR_LITTER: [number, number, number, number][] = (() => {
  const r = rng(77);
  const out: [number, number, number, number][] = [];
  for (let z = 12; z > EDGE.z0 + 6; z -= 5 + r() * 6) out.push([2 + r() * 6.5, z, 0.5 + r() * 1.3, r() * 3]);
  return out;
})();

function Ground() {
  const curb = useMemo(() => {
    const t = concreteTexture(4, 70);
    t.repeat.set(1, 30);
    return t;
  }, []);
  const dashes = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = 26; z > EDGE.z0 + 2; z -= 6) out.push([0, z]);
    return out;
  }, []);
  const W = EDGE.x * 2 + 2;
  const D = EDGE.z1 - EDGE.z0 + 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (EDGE.z1 + EDGE.z0) / 2]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0c0d11" roughness={0.22} metalness={0.75} />
      </mesh>
      {/* 큰길 양옆 인도 */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (AVENUE + 1.25), 0.08, -37]}>
          <boxGeometry args={[2.5, 0.16, 102]} />
          <meshStandardMaterial map={curb} color="#3a3c42" roughness={0.8} />
        </mesh>
      ))}
      {dashes.map(([x, z]) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, z]}>
          <planeGeometry args={[0.18, 2.4]} />
          <meshBasicMaterial color="#7a6a3a" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* 줄 선 자리 표시 */}
      {QUEUE_X.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, (QUEUE_Z[0] + QUEUE_Z[QUEUE_Z.length - 1]) / 2]}>
          <planeGeometry args={[1.1, QUEUE_Z[0] - QUEUE_Z[QUEUE_Z.length - 1] + 2]} />
          <meshBasicMaterial color="#ff2a3d" transparent opacity={0.08} />
        </mesh>
      ))}
      {MIRROR_LITTER.flatMap(([x, z, sz, rot], i) =>
        [1, -1].map((m) => (
          <group key={`${i}${m}`}>
            <mesh rotation={[-Math.PI / 2, 0, m * rot]} position={[m * x, 0.013, z]} scale={[sz * 1.5, sz, 1]}>
              <circleGeometry args={[1, 16]} />
              <meshStandardMaterial color="#08090c" roughness={0.04} metalness={0.95} transparent opacity={0.85} />
            </mesh>
            {i % 3 === 0 && (
              <mesh position={[m * (x + 0.9), 0.06, z + 0.4]} rotation={[0, m * rot, 0.4]}>
                <cylinderGeometry args={[0.035, 0.035, 0.12, 8]} />
                <meshStandardMaterial color="#c8c8c8" metalness={0.8} roughness={0.3} />
              </mesh>
            )}
            {i % 4 === 1 && (
              <mesh rotation={[-Math.PI / 2, 0, m * (rot + 0.7)]} position={[m * (x - 0.6), 0.014, z - 0.8]}>
                <planeGeometry args={[0.04, 2.2]} />
                <meshBasicMaterial color="#000" />
              </mesh>
            )}
          </group>
        ))
      )}
    </group>
  );
}

/* ---------- 검문소: 레이저를 두른 성문 ---------- */
function Gate({ lang }: { lang: Lang }) {
  const gateSign = useSign(
    [
      [lang === "ko" ? "하층행 승강장" : "DESCENT PLATFORM", 1.3],
      [lang === "ko" ? "검문소 · 승강장 대기열 등록" : "CHECKPOINT · PLATFORM QUEUE REGISTRATION", 0.55],
    ],
    { color: "#ff2a3d", glow: true, mono: true, w: 1024, h: 256, bg: "#0a0204" }
  );
  // 성문의 붉은 빛은 벽이 아니라 열린 통로 위의 조준 장치다: 저장된 방문 기록을 따라 사람의 위치를 찾고, 찾으면 겨눈다.
  // 성문 옆 표시가 지금 무엇을 겨누는지 알려 준다
  // bound: 방문자·이산을 추적 중 / search: 기록 없는 둘 앞에서 겨눌 기록을 찾는 중 / free: 추적할 대상을 찾지 못해 조준을 거둠
  const ko = lang === "ko";
  const panelBound = useSign(
    [
      [ko ? "위치 추적 중" : "TRACKING LOCATION", 0.95],
      [ko ? "방문자 · 동행인 이산" : "VISITOR · COMPANION SAN", 0.5],
    ],
    { color: "#ff6a7a", bg: "#140406", mono: true, w: 1024, h: 192 }
  );
  const panelSearch = useSign(
    [
      [ko ? "방문자 기록 조회 중" : "LOOKING UP VISITOR RECORD", 0.95],
      [ko ? "조준할 방문 기록을 찾는 중" : "SEARCHING FOR A VISIT RECORD TO AIM AT", 0.5],
    ],
    { color: "#c8ccd4", bg: "#0c0d10", mono: true, w: 1024, h: 192 }
  );
  const panelFree = useSign(
    [
      [ko ? "방문자 기록 없음" : "NO VISITOR RECORD", 0.95],
      [ko ? "추적할 대상 없음" : "NO ONE TO TRACK", 0.5],
    ],
    { color: "#9aa0a8", bg: "#0c0d10", mono: true, w: 1024, h: 192 }
  );
  const lasers = useRef<THREE.Group>(null);
  const panels = useRef<(THREE.Mesh | null)[]>([]);
  const fade = useRef(1);
  const stone = useMemo(() => {
    const t = concreteTexture(17, 110);
    t.repeat.set(3, 3);
    return t;
  }, []);
  useFrame((s, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = s.clock.elapsedTime;
    const blind = gaze.mood === "blind";
    // 空 결말: 겨눌 방문 기록을 찾지 못해 조준 빛을 거둔다 (천천히 꺼진다. 문이 열리는 것이 아니라, 통로는 처음부터 열려 있었다)
    fade.current = gaze.gateOpen ? Math.max(0, fade.current - dt * 0.8) : 1;
    const g = lasers.current;
    if (g) {
      g.visible = fade.current > 0.01;
      g.children.forEach((c, i) => {
        const m = c as THREE.Mesh;
        const flick = gaze.gateOpen ? (Math.sin(t * 31 + i * 2.1) > 0.2 ? 1 : 0.25) : 1;
        (m.material as THREE.MeshBasicMaterial).opacity = (0.55 + Math.sin(t * 8 + i) * 0.3) * fade.current * flick;
        // 대상을 찾는 동안에는 띠가 위아래로 훑는다
        m.position.y = 0.5 + i * 0.85 + (blind && !gaze.gateOpen ? Math.sin(t * 1.6 + i * 0.5) * 0.3 : 0);
      });
    }
    const which = gaze.gateOpen ? 2 : blind ? 1 : 0;
    panels.current.forEach((m, i) => m && (m.visible = i === which));
  });
  return (
    <group>
      {/* 검문소: 레이저를 두른 성문 */}
      <group position={[0, 0, EDGE.z0 + 0.5]}>
        {/* 돌로 쌓은 기단과 홍예문 */}
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 8, 4.5, 0]}>
            <boxGeometry args={[10, 9, 6]} />
            <meshStandardMaterial map={stone} color="#6d6a64" roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0, 7.75, 0]}>
          <boxGeometry args={[6, 2.5, 6]} />
          <meshStandardMaterial map={stone} color="#6d6a64" roughness={0.95} />
        </mesh>
        <mesh position={[0, 6.5, 3.01]}>
          <ringGeometry args={[2.85, 3.05, 32, 1, 0, Math.PI]} />
          <meshBasicMaterial color="#ff1030" toneMapped={false} />
        </mesh>
        {/* 문루: 기둥 + 두 겹 기와지붕 */}
        {[-6, -2, 2, 6].map((x) => (
          <mesh key={x} position={[x, 10.6, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 3.2, 10]} />
            <meshStandardMaterial color="#7a1c1c" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 12.3, 0]}>
          <boxGeometry args={[15, 0.5, 4.6]} />
          <meshBasicMaterial color="#1fa59a" toneMapped={false} />
        </mesh>
        <mesh geometry={roofGeometry()} position={[0, 12.4, 0]} scale={[20, 4.2, 8]}>
          <meshStandardMaterial color="#1a1d22" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh geometry={roofGeometry()} position={[0, 15.6, 0]} scale={[14, 3.4, 6]}>
          <meshStandardMaterial color="#1a1d22" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0, 11, 3.2]}>
          <planeGeometry args={[9, 1.6]} />
          <meshBasicMaterial map={gateSign} toneMapped={false} />
        </mesh>
        {/* 장벽 표시: 홍예문 오른쪽 기단 앞면 */}
        {[panelBound, panelSearch, panelFree].map((tex, i) => (
          <mesh key={i} ref={(m) => { panels.current[i] = m; }} position={[6.2, 3.1, 3.02]} visible={i === 0}>
            <planeGeometry args={[4.6, 0.86]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        ))}
        <group ref={lasers} position={[0, 0, 3.1]}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[0, 0.5 + i * 0.85, 0]}>
              <boxGeometry args={[6, 0.05, 0.05]} />
              <meshBasicMaterial color="#ff1030" transparent toneMapped={false} />
            </mesh>
          ))}
        </group>
        <pointLight position={[0, 5, 6]} intensity={60} distance={22} color="#ff2030" />
      </group>
    </group>
  );
}

/* ---------- 하층행 승강장: 광장의 표지와, 성문 너머 다리 옆으로 구름 속에 내려가는 계단 ---------- */
// 이산이 가고 싶어 하는 곳. 아래가 어떤 곳인지는 보여 주지 않는다 (계단 끝은 구름에 묻힌다)
const STAIR = { x0: 4.5, z: -153, w: 4.4 };
function DescentRoute({ lang }: { lang: Lang }) {
  const ko = lang === "ko";
  const sign = useSign(
    [
      [ko ? "↑ 하층행 승강장" : "↑ DESCENT PLATFORM", 1.1],
      [ko ? "검문소 경유" : "VIA CHECKPOINT", 0.6],
    ],
    { color: "#d8d2c0", bg: "#101418", mono: true, w: 768, h: 224 }
  );
  const plate = useSign([[ko ? "하층행 승강장 ↓" : "DESCENT ↓", 1]], { color: "#ffb02e", bg: "#0a0604", glow: true, mono: true, w: 512, h: 128 });
  // 구름 속으로 길게 (空 결말에서 스무 단쯤 걸어 내려간다)
  const steps = useMemo(() => Array.from({ length: 30 }, (_, i) => i), []);
  return (
    <group>
      {/* 광장에서 큰길로 들어서는 자리의 낡은 표지판 (남쪽을 향한다). 감시 기둥(x -8.4, z 8)과 떨어진 제 기둥에 선다 */}
      <group position={[-(AVENUE - 2.7), 0, 9.6]}>
        <mesh position={[0, 1.75, -0.08]}>
          <cylinderGeometry args={[0.06, 0.08, 3.5, 8]} />
          <meshStandardMaterial color="#3a3d44" metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[0, 3.9, 0]}>
          <planeGeometry args={[3.2, 0.93]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      </group>
      {/* 다리 오른쪽: 승강장 난간 틈과 구름 속으로 내려가는 계단 */}
      <group position={[STAIR.x0, 0, STAIR.z]}>
        <mesh position={[STAIR.w / 2, -0.3, 0]}>
          <boxGeometry args={[STAIR.w, 0.6, 4]} />
          <meshStandardMaterial color="#1c1a1e" roughness={0.7} metalness={0.5} />
        </mesh>
        {steps.map((i) => (
          <group key={i} position={[STAIR.w + 0.45 + i * 0.9, -0.55 - i * 0.62, 0]}>
            <mesh>
              <boxGeometry args={[0.9, 0.5, 2.6]} />
              <meshStandardMaterial color="#3a3540" roughness={0.85} />
            </mesh>
            {/* 단마다 내려서는 쪽 모서리(위에서 내려다볼 때 보이는 끝)에 호박색 띠: 어두운 구름 속에서도 계단이 보이도록 (아래로 갈수록 흐려진다) */}
            <mesh position={[0.42, 0.26, 0]}>
              <boxGeometry args={[0.07, 0.04, 2.5]} />
              <meshBasicMaterial color="#ffb070" transparent opacity={Math.max(0.12, 1 - i * 0.045)} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.05, 1.6, s * 1.9]}>
            <boxGeometry args={[0.3, 3.2, 0.3]} />
            <meshStandardMaterial color="#6d6a64" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0.05, 3.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[3.6, 0.9]} />
          <meshBasicMaterial map={plate} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[1.5, 2.6, 0]} intensity={8} distance={9} color="#ffb070" />
        {/* 계단을 따라 내려가는 낮은 길 조명 (글로 계단을 설명하지 않는다). 그림자 없음 */}
        <pointLight position={[STAIR.w + 2.4, -0.2, 0]} intensity={9} distance={8} color="#ffb070" />
        {/* 휴대폰에서는 계단 아래쪽 조명을 줄인다 (조명 하나하나가 화면 전체의 계산을 늘린다). 호박색 띠는 그대로 보인다 */}
        {!lite && (
          <>
            <pointLight position={[STAIR.w + 6.4, -2.8, 0]} intensity={7} distance={8} color="#ff9a5a" />
            <pointLight position={[STAIR.w + 11.4, -6.3, 0]} intensity={5} distance={8} color="#ff9a5a" />
            <pointLight position={[STAIR.w + 16.4, -9.8, 0]} intensity={3.5} distance={8} color="#ff8a4a" />
          </>
        )}
      </group>
    </group>
  );
}

/* ---------- 광장: 남쪽 전망대 표지, 배송 대기소 ---------- */
// 배송 대기소: 서쪽 난간 틈 옆의 처마와 남쪽 벽. 처마는 머리 위 드론 빛을 가린다 (Drones의 ROOFS와 같은 상자)
function Depot({ lang }: { lang: Lang }) {
  const ko = lang === "ko";
  const sign = useSign([[ko ? "배송 대기소 7-서" : "COURIER BAY 7-W", 1]], { color: "#cfd6dd", bg: "#14181c", mono: true, w: 512, h: 96 });
  const { x, z, w, d, y0, y1 } = DEPOT;
  // 처마 밑 형광등과 바닥의 푸른 불빛: 드론 빛을 피해 숨을 자리라는 것이 광장에서도 보이게
  const glow = useMemo(glowTexture, []);
  useEffect(() => () => glow.dispose(), [glow]);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, y0 - 0.04, -d / 2 + 0.4]}>
        <boxGeometry args={[w * 0.7, 0.05, 0.08]} />
        <meshBasicMaterial color="#d8fbff" toneMapped={false} />
      </mesh>
      <mesh position={[0, y1 + 0.005, -d / 2 + 0.01]}>
        <boxGeometry args={[w, 0.03, 0.03]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.03, -0.2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[w * 1.25, d * 1.5]} />
        <meshBasicMaterial map={glow} color="#7fe9ff" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh position={[0, (y0 + y1) / 2, 0]}>
        <boxGeometry args={[w, y1 - y0, d]} />
        <meshStandardMaterial color="#2c3036" metalness={0.6} roughness={0.5} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.15), y0 / 2, sz * (d / 2 - 0.15)]}>
            <boxGeometry args={[0.12, y0, 0.12]} />
            <meshStandardMaterial color="#3a3d44" metalness={0.7} roughness={0.4} />
          </mesh>
        ))
      )}
      {/* 남쪽 벽 (충돌 DEPOT_WALL과 같은 자리) */}
      <mesh position={[0, y0 / 2, d / 2 - 0.1]}>
        <boxGeometry args={[w, y0, 0.2]} />
        <meshStandardMaterial color="#24272c" roughness={0.85} metalness={0.3} />
      </mesh>
      {/* 광장 쪽(북쪽)을 향한 표지 */}
      <mesh position={[0, y1 + 0.28, -d / 2 + 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.4, 0.45]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
    </group>
  );
}

// 남쪽 전망대 가는 길 표지: 골목 입구 앞(북쪽을 향함)과 서쪽 난간 틈 옆(동쪽 광장을 향함)
function LookoutSigns({ lang }: { lang: Lang }) {
  const ko = lang === "ko";
  const sign = useSign(
    [
      [ko ? "남쪽 전망대 →" : "SOUTH LOOKOUT →", 0.9],
      [ko ? "서쪽 산책로 경유" : "VIA THE WEST WALKWAY", 0.55],
    ],
    { color: "#d8d2c0", bg: "#101418", mono: true, w: 768, h: 224 }
  );
  return (
    <group>
      {(
        [
          [-NS2_X - 2.4, 15.0, Math.PI],
          [-63.2, WALK.gate0 - 1.0, Math.PI / 2],
        ] as [number, number, number][]
      ).map(([px, pz, ry], i) => (
        <group key={i} position={[px, 0, pz]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
            <meshStandardMaterial color="#3a3d44" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, 3.3, 0]} rotation={[0, ry, 0]}>
            <planeGeometry args={[2.6, 0.76]} />
            <meshBasicMaterial map={sign} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- 세로 한글 간판: 건물 벽에서 길 쪽으로 튀어나옴 ---------- */
const SIGN_WORDS = ["기억 수리", "감정 대여", "동의 센터", "해장국", "등급 상담", "꿈 판매", "전당포", "로봇 수리", "인력사무소", "만두", "여관", "신경칩", "노래방", "약국", "환불 불가", "족발", "PC방", "부적"];
const SIGN_COLORS = ["#ff2a4d", "#22f0ff", "#ffe14d", "#7dff7a", "#ff2bd6", "#ff8a2a", "#a77bff", "#ffffff"];

function VerticalSigns() {
  const signs = useMemo(() => {
    const r = rng(23);
    const out: { pos: [number, number, number]; h: number; word: string; color: string; flip: boolean; pair: number }[] = [];
    let k = 0;
    // 큰길 쪽 벽(x=±11.5)에, 좌우 똑같은 자리·똑같은 글자로
    for (const l of LOTS) {
      if (l.side < 0 || l.col !== 0) continue;
      for (let z = l.z1 - 2; z > l.z0 + 1.5; z -= 4.5 + r() * 3) {
        const word = SIGN_WORDS[k % SIGN_WORDS.length];
        const h = 1.1 * word.length + 0.6;
        const y = 3.2 + r() * 7 + h / 2;
        const color = SIGN_COLORS[k % SIGN_COLORS.length];
        out.push({ pos: [l.x0 - 1.2, y, z], h, word, color, flip: false, pair: k });
        out.push({ pos: [-(l.x0 - 1.2), y, z], h, word, color, flip: true, pair: k });
        k++;
      }
    }
    return out;
  }, []);
  const textures = useMemo(
    () =>
      signs.map((sg) =>
        signTexture(
          sg.word.split("").map((ch) => [ch, 1] as [string, number]),
          { color: sg.color, bg: "#0a0608", glow: true, border: true, w: 128, h: 128 * sg.word.length }
        )
      ),
    [signs]
  );
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    mats.current.forEach((m, i) => {
      if (!m) return;
      // 지직거리는 순간까지 좌우 짝이 똑같다
      const p = signs[i].pair;
      const dead = p % 5 === 3 && Math.sin(t * 17 + p) > 0.6;
      m.color.setScalar(dead ? 0.15 : 1);
    });
  });
  return (
    <group>
      {signs.map((sg, i) => (
        <group key={i} position={sg.pos}>
          <mesh>
            <boxGeometry args={[0.9, sg.h, 0.12]} />
            <meshBasicMaterial ref={(m) => { mats.current[i] = m; }} map={textures[i]} toneMapped={false} />
          </mesh>
          {/* 벽에 거는 팔 */}
          <mesh position={[(sg.flip ? -1 : 1) * 0.75, sg.h / 2 - 0.2, 0]}>
            <boxGeometry args={[0.7, 0.06, 0.06]} />
            <meshStandardMaterial color="#222" metalness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- 큰길을 가로지르는 연등 줄과 전깃줄 (좌우 대칭) ---------- */
function Lanterns() {
  const strings = useMemo(() => {
    const rows = [18, 10, 2, -8, -18, -44, -52, -78, -86, -112, -118];
    return rows.map((z, i) => {
      const y = 7 + (i % 3) * 1.4;
      return { a: new THREE.Vector3(-AVENUE - 2, y, z), b: new THREE.Vector3(AVENUE + 2, y, z), sag: 1.6, n: 11, seed: i };
    });
  }, []);
  const wires = useMemo(() => {
    const out: THREE.TubeGeometry[] = [];
    [14, 6, -2, -14, -48, -74, -108].forEach((z, i) => {
      for (let w = 0; w < 2; w++) {
        const y = 9 + w * 0.8 + (i % 2) * 0.6;
        const A = new THREE.Vector3(-AVENUE - 2, y, z);
        const B = new THREE.Vector3(AVENUE + 2, y, z);
        const M = A.clone().lerp(B, 0.5);
        M.y -= 1.4 + w * 0.5;
        out.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 20, 0.022, 4, false));
      }
    });
    return out;
  }, []);
  // 대자비를 올려다보는 동안에는 눈앞의 연등 줄이 얼굴을 가리지 않도록 서서히 흐려진다
  const group = useRef<THREE.Group>(null);
  const fade = useRef(1);
  useFrame((_, dt) => {
    const want = gaze.intro ? 0 : 1;
    if (Math.abs(want - fade.current) < 0.002 || !group.current) return;
    fade.current += (want - fade.current) * Math.min(1, dt * 2.5);
    const o = Math.abs(want - fade.current) < 0.002 ? want : fade.current;
    fade.current = o;
    group.current.visible = o > 0.01;
    group.current.traverse((m) => {
      const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        if (x.userData.baseOpacity === undefined) {
          x.userData.baseOpacity = x.opacity;
          x.userData.wasTransparent = x.transparent;
        }
        const tr = o < 1 || x.userData.wasTransparent;
        if (x.transparent !== tr) {
          x.transparent = tr;
          x.needsUpdate = true;
        }
        x.opacity = x.userData.baseOpacity * o;
      });
    });
  });
  return (
    <group ref={group}>
      {wires.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#050506" />
        </mesh>
      ))}
      <LotusStrings strings={strings} />
    </group>
  );
}

/* ---------- 전광판 ---------- */
function Billboards({ lang }: { lang: Lang }) {
  const spots = useMemo(() => {
    // 큰길 쪽 건물 벽면 (x = ±11.35). 좌우 같은 높이, 같은 문구
    const out: { pos: [number, number, number]; rotY: number; w: number; h: number; k: number }[] = [];
    const rows: [number, number, number, number][] = [
      [7, 10, 9, 4.5],
      [-6, 14, 9, 4.5],
      [-20, 22, 5, 11],
      [-44, 11, 9, 4.5],
      [-53, 19, 7, 3.5],
      [-74, 12, 9, 4.5],
    ];
    rows.forEach(([z, y, w, h], k) => {
      for (const s of [-1, 1]) out.push({ pos: [s * (AVENUE + 2.35), y, z], rotY: (-s * Math.PI) / 2, w, h, k });
    });
    return out;
  }, []);
  const textures = useMemo(
    () =>
      spots.map((s, i) => {
        const b = billboards[s.k % billboards.length];
        const [big, small] = b[lang];
        const tall = s.h > s.w;
        return signTexture(
          tall
            ? [
                [big.slice(0, Math.ceil(big.length / 2)), 1.2],
                [big.slice(Math.ceil(big.length / 2)), 1.2],
                [small, 0.45],
              ]
            : [
                [big, 1.3],
                [small, 0.5],
              ],
          { color: b.color, bg: "#050308", glow: true, border: true, w: tall ? 512 : 1024, h: tall ? 1024 : 512 }
        );
      }),
    [spots, lang]
  );
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    mats.current.forEach((m, i) => {
      if (!m) return;
      // 가끔 지직거리는 전광판
      const k = spots[i].k;
      const g = Math.sin(t * 9 + k * 7) > 0.995 ? 0.3 : 1;
      m.color.setScalar(0.9 * g);
    });
  });
  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={s.pos} rotation={[0, s.rotY, 0]}>
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[s.w + 0.3, s.h + 0.3, 0.2]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh>
            <planeGeometry args={[s.w, s.h]} />
            <meshBasicMaterial ref={(m) => { mats.current[i] = m; }} map={textures[i]} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- 큰길을 가로지르는 전광 게이트 (흐르는 문구) ---------- */
function Gantry({ lang }: { lang: Lang }) {
  const tex = useMemo(() => {
    const t = signTexture([[ticker[lang] + ticker[lang], 1]], { color: "#ffb02e", bg: "#080404", glow: true, mono: true, w: 4096, h: 128, align: "left" });
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(0.35, 1);
    return t;
  }, [lang]);
  useFrame((_, dt) => {
    tex.offset.x = (tex.offset.x + dt * 0.02) % 1;
  });
  const z = (CROSS[0][0] + CROSS[0][1]) / 2;
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (AVENUE + 0.5), 5.5, 0]}>
          <boxGeometry args={[0.6, 11, 0.6]} />
          <meshStandardMaterial color="#202228" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 10.2, 0]}>
        <boxGeometry args={[AVENUE * 2 + 2, 1.6, 0.5]} />
        <meshStandardMaterial color="#14161a" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 10.2, 0.26]}>
        <planeGeometry args={[AVENUE * 2 + 1.4, 1.2]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------- 감시 카메라: 플레이어를 따라 고개를 돌림 ---------- */
function Cameras({ onTracked }: { onTracked: (v: boolean) => void }) {
  const heads = useRef<(THREE.Group | null)[]>([]);
  const leds = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const tracked = useRef(false);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((s) => {
    let any = false;
    CAMERA_POLES.forEach(([x, , z], i) => {
      const h = heads.current[i];
      if (!h) return;
      // 골목은 지도에 없다: 큰길과 광장에 있을 때만 카메라가 따라온다
      const onAvenue = Math.abs(player.pos.x) < AVENUE + 3 || player.pos.z > 14;
      const d = onAvenue ? Math.hypot(player.pos.x - x, player.pos.z - z) : 99;
      if (d < 20) {
        any = true;
        target.set(player.pos.x, player.pos.y, player.pos.z);
        const m = new THREE.Matrix4().lookAt(h.getWorldPosition(tmpV), target, THREE.Object3D.DEFAULT_UP);
        const q = new THREE.Quaternion().setFromRotationMatrix(m);
        // 카메라 렌즈는 -z 방향
        h.quaternion.slerp(q, 0.08);
      } else {
        tmpE.set(0.25, (x < 0 ? -1 : 1) * Math.PI / 2 + Math.sin(s.clock.elapsedTime * 0.5 + i) * 0.7, 0);
        h.quaternion.slerp(tmpQ.setFromEuler(tmpE), 0.03);
      }
      const led = leds.current[i];
      if (led) led.color.setRGB(1, 0.05, 0.1).multiplyScalar(d < 20 ? (Math.sin(s.clock.elapsedTime * 10) > 0 ? 1.6 : 0.3) : 0.6);
    });
    if (any !== tracked.current) {
      tracked.current = any;
      onTracked(any && gaze.mood !== "blind");
    }
  });
  return (
    <group>
      {CAMERA_POLES.map(([x, , z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 6, 8]} />
            <meshStandardMaterial color="#2a2c31" metalness={0.8} roughness={0.4} />
          </mesh>
          <group ref={(g) => { heads.current[i] = g; }} position={[0, 6.1, 0]}>
            <mesh position={[0, 0, -0.15]}>
              <boxGeometry args={[0.32, 0.3, 0.7]} />
              <meshStandardMaterial color="#d9d9d9" metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, -0.51]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.12, 0.05, 16]} />
              <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0.1, 0.1, -0.535]}>
              <circleGeometry args={[0.03, 8]} />
              <meshBasicMaterial ref={(m) => { leds.current[i] = m; }} color="#ff1020" toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ---------- 가로등과 바닥의 빛 웅덩이 ---------- */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.3)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
}

function Lamps() {
  // 가로등 빛줄기는 은은하게만, 바닥은 흰 칠 대신 원래 색을 밝힌다: 시야를 가리지 않도록
  const beam = useBeam("#bfe6ff", 0.022);
  const pool = useLightPool("#d6e6f2", 3.5);
  // 빛 웅덩이와 빛줄기는 1번 층에만 둔다. 젖은 바닥의 반사 카메라는 0번 층만 보므로, 반사 속에서 검은 테두리로 번지지 않는다
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    camera.layers.enable(1);
  }, [camera]);
  const onlyMain = useCallback((m: THREE.Object3D | null) => m?.layers.set(1), []);
  const spots = useMemo(() => [-1, 1].flatMap((s) => [16, -4, -24, -48, -74].map((z) => [s * (AVENUE + 0.4), z] as [number, number])), []);
  return (
    <group>
      {spots.map(([x, z], i) => {
        const s = x < 0 ? 1 : -1;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.06, 0.09, 8, 6]} />
              <meshStandardMaterial color="#202227" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[s * 1.1, 7.95, 0]}>
              <boxGeometry args={[2.2, 0.12, 0.3]} />
              <meshStandardMaterial color="#202227" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[s * 1.9, 7.86, 0]}>
              <boxGeometry args={[0.7, 0.04, 0.22]} />
              <meshBasicMaterial color="#8fa6b4" toneMapped={false} />
            </mesh>
            <mesh ref={onlyMain} position={[s * 1.9, 3.95, 0]} material={beam}>
              <coneGeometry args={[2.4, 7.8, 20, 1, true]} />
            </mesh>
            <mesh ref={onlyMain} rotation={[-Math.PI / 2, 0, 0]} position={[s * 1.9, 0.02, 0]} material={pool}>
              <planeGeometry args={[6.5, 6.5]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ---------- 줄 선 시민들 (모두 같은 박자로 흔들림) ---------- */
// 이산이 곁을 지나가면 얼굴에 따라 반응한다 (이야기는 바뀌지 않는다):
// 원본 얼굴이면 하나둘 몸을 돌려 이산을 지켜보고 바이저가 붉어진다. 표준 미소면 돌아보지 않고 바이저만 분홍으로 맞춰 깜빡인다 (한 사람으로 받아들인다)
const Q_NEAR = 5.5;
const Q_STARE = new THREE.Color("#ff3b4e");
const Q_STD = new THREE.Color("#ff79c0");
// 방문자를 바라보기 시작하는 거리(m)
const P_NEAR = 6;
// 줄의 남쪽 끝에서 45m 넘게 떨어진 곳
const QUEUE_FAR_Z = Math.max(...QUEUE_Z) + 45;

function Queue() {
  const geo = citizenGeometry();
  const vGeo = visorGeometry();
  const body = useRef<THREE.InstancedMesh>(null);
  const visor = useRef<THREE.InstancedMesh>(null);
  // 줄 선 시민은 모두 같은 표준 미소를 하고 있다 (도시가 정한 얼굴)
  const sGeo = smileGeometry();
  const smileRef = useRef<THREE.InstancedMesh>(null);
  const wasStaring = useRef(false);
  const slots = useMemo(
    () =>
      QUEUE_X.flatMap((x) => QUEUE_Z.map((z) => [x, z] as [number, number])).filter(
        ([x, z]) => !(Math.abs(x) === CITY_NPCS.whisper.pos[0] && z === CITY_NPCS.whisper.pos[2])
      ),
    []
  );
  // 시민마다 지금 돌아간 정도(라디안)와 바이저가 물든 정도(0~1)
  const turn = useMemo(() => new Float32Array(slots.length), [slots]);
  const tint = useMemo(() => new Float32Array(slots.length), [slots]);
  const san = useMemo(() => CITY.items.find((i) => i.id === "san")?.pos, []);
  // 물든 바이저: 평소 바이저 위에 살짝 크게 겹쳐 그리는 두 번째 바이저 (물든 시민만 크기 1, 나머지는 0)
  const alert = useRef<THREE.InstancedMesh>(null);
  const alertMat = useRef<THREE.MeshBasicMaterial>(null);
  const farTick = useRef(0);
  useFrame((s, dt) => {
    // 줄에서 멀리 있을 때(광장·골목)는 흔들림이 보이지 않는다: 여섯 프레임에 한 번만 계산해 올린다
    if (player.pos.z > QUEUE_FAR_Z && ++farTick.current % 6) return;
    const t = s.clock.elapsedTime;
    const sway = Math.sin(t * 1.2) * 0.015;
    const m = faceRt.method;
    const k = Math.min(1, dt * 2.5);
    let staring = 0;
    slots.forEach(([x, z], i) => {
      let want = 0;
      let tw = 0;
      // 가까이 온 방문자를 줄 선 시민들이 일제히 돌아본다 (섬뜩하게): 다 같은 순간에, 기계처럼 끊어지는 각도로 빠르게 돌고,
      // 방문자가 움직이는 대로 끝까지 따라 본다. 미소는 그대로. 줄 앞(−z)을 완전히 등지는 데까지는 돌지 않는다
      const px = player.pos.x - x;
      const pz = player.pos.z - z;
      const pd = Math.hypot(px, pz);
      let stare = false;
      if (pd < P_NEAR && pd > 0.3) {
        let a = Math.atan2(px, pz) - Math.PI;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        want = Math.round(Math.max(-1.5, Math.min(1.5, a)) / 0.14) * 0.14;
        stare = true;
        staring++;
      }
      if (san && m) {
        const dx = san.x - x;
        const dz = san.z - z;
        const d = Math.hypot(dx, dz);
        if (d < Q_NEAR) {
          tw = 1 - d / Q_NEAR;
          if (m === "exception") {
            // 줄 앞(−z)을 보던 몸을 이산 쪽으로. 등 뒤까지는 돌지 않는다. 시민마다 조금씩 늦게
            let a = Math.atan2(dx, dz) - Math.PI;
            a = Math.atan2(Math.sin(a), Math.cos(a));
            want = Math.max(-1.4, Math.min(1.4, a)) * Math.min(1, tw * 2.2);
          }
        }
      }
      const lag = stare ? 3.2 : 0.6 + ((i * 37) % 10) / 25;
      turn[i] += (want - turn[i]) * Math.min(1, k * lag);
      tint[i] += (tw - tint[i]) * k;
      const nod = m === "standard" ? Math.sin(t * 2.4) * 0.05 * tint[i] : 0;
      tmpM.compose(tmpV.set(x, 0, z), tmpQ.setFromEuler(tmpE.set(nod, Math.PI + turn[i], sway)), tmpS.set(1, 1, 1));
      body.current?.setMatrixAt(i, tmpM);
      visor.current?.setMatrixAt(i, tmpM);
      smileRef.current?.setMatrixAt(i, tmpM);
      // 옆으로만 살짝 넓혀 평소 바이저를 덮는다 (높이는 그대로)
      const on = tint[i] > 0.12 ? 1 : 0;
      tmpM.compose(tmpV.set(x, 0, z), tmpQ, tmpS.set(1.06 * on, on, 1.06 * on));
      alert.current?.setMatrixAt(i, tmpM);
    });
    // 돌아보기 시작하는 순간 한 번, 여럿의 목이 같이 꺾이는 작은 소리
    if (staring > 0 && !wasStaring.current) sfx.stare();
    wasStaring.current = staring > 0;
    if (body.current) body.current.instanceMatrix.needsUpdate = true;
    if (visor.current) visor.current.instanceMatrix.needsUpdate = true;
    if (smileRef.current) smileRef.current.instanceMatrix.needsUpdate = true;
    if (alert.current) alert.current.instanceMatrix.needsUpdate = true;
    if (alertMat.current) {
      alertMat.current.color.copy(m === "standard" ? Q_STD : Q_STARE);
      alertMat.current.opacity = m === "standard" ? 0.85 + Math.sin(t * 2.4) * 0.15 : 1;
    }
  });
  return (
    <group>
      <instancedMesh ref={body} args={[geo, undefined, slots.length]} frustumCulled={false}>
        <meshStandardMaterial ref={(m) => void (m && addRim(m))} color="#5a5d66" roughness={0.6} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={visor} args={[vGeo, undefined, slots.length]} frustumCulled={false}>
        <meshBasicMaterial color="#22f0ff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={smileRef} args={[sGeo, undefined, slots.length]} frustumCulled={false}>
        <meshBasicMaterial color="#ff5fb0" toneMapped={false} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={alert} args={[vGeo, undefined, slots.length]} frustumCulled={false}>
        <meshBasicMaterial ref={alertMat} color="#ff3b4e" transparent toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ---------- 같은 보폭으로 행진하는 시민들 ---------- */
function Marchers() {
  const geo = citizenGeometry();
  const vGeo = visorGeometry();
  const body = useRef<THREE.InstancedMesh>(null);
  const visor = useRef<THREE.InstancedMesh>(null);
  const rows = useMemo(() => {
    const out: { z: number; dir: number; off: number }[] = [];
    CROSS.forEach(([z0, z1], ci) => {
      for (let k = 0; k < 2; k++) {
        const z = z0 + 2.5 + k * (z1 - z0 - 5);
        for (let i = 0; i < 14; i++) out.push({ z, dir: k ? 1 : -1, off: i * 1.4 + ci * 3 });
      }
    });
    return out;
  }, []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const span = 104;
    rows.forEach((r, i) => {
      let x = ((t * 1.3 + r.off) % span) - span / 2;
      x *= r.dir;
      // 큰길을 건너지 않고 각자 블록 사이에서만 걷도록
      const bob = Math.abs(Math.sin(t * 4.2)) * 0.04;
      tmpM.compose(tmpV.set(x, bob, r.z), tmpQ.setFromEuler(tmpE.set(0, (r.dir * Math.PI) / 2, 0)), tmpS.set(1, 1, 1));
      body.current?.setMatrixAt(i, tmpM);
      visor.current?.setMatrixAt(i, tmpM);
    });
    if (body.current) body.current.instanceMatrix.needsUpdate = true;
    if (visor.current) visor.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={body} args={[geo, undefined, rows.length]} frustumCulled={false}>
        <meshStandardMaterial ref={(m) => void (m && addRim(m, "#ff3fa8", 0.8))} color="#3e4048" roughness={0.6} metalness={0.25} />
      </instancedMesh>
      <instancedMesh ref={visor} args={[vGeo, undefined, rows.length]} frustumCulled={false}>
        <meshBasicMaterial color="#ff2a3d" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ---------- 순찰 기계 P-3 ---------- */
// P-3과 그 거울상 P-3′는 완전히 같은 박자로 움직인다
function Patrols({ onTap }: { onTap: TapFn }) {
  return (
    <group>
      <Patrol onTap={onTap} id="patrol" m={1} />
      <Patrol onTap={onTap} id="patrol2" m={-1} />
    </group>
  );
}

const patrolState = { z: -10, dir: -1, stop: false, t: 0 };
function Patrol({ onTap, id, m }: { onTap: TapFn; id: string; m: number }) {
  const ref = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const item = CITY.items.find((i) => i.id === id)!;
  const st = { current: patrolState };
  useFrame((s, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = s.clock.elapsedTime;
    // 둘 중 하나에게라도 가까이 가면 둘 다 멈춘다 (한 번만 계산)
    if (m > 0) st.current.stop = Math.hypot(Math.abs(player.pos.x) - 10.4, player.pos.z - st.current.z) < 4;
    const near = st.current.stop;
    if (!near) {
      if (m > 0) st.current.z += st.current.dir * dt * 1.6;
      if (st.current.z < EDGE.z0 + 12) st.current.dir = 1;
      if (st.current.z > 12) st.current.dir = -1;
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, st.current.dir < 0 ? 0 : Math.PI * m, 0.05);
      const sw = Math.sin(t * 5) * 0.4;
      if (legL.current) legL.current.rotation.x = sw;
      if (legR.current) legR.current.rotation.x = -sw;
    } else {
      // 멈춰서 플레이어를 바라봄 (모델 정면은 -z)
      // 거울상은 당신이 아니라, 당신의 거울 위치를 바라본다
      const a = Math.atan2(10.4 - player.pos.x, g.position.z - player.pos.z);
      const yaw = m > 0 ? a : -a;
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, yaw, 0.1);
    }
    g.position.set(10.4 * m, 0, st.current.z);
    item.pos.set(10.4 * m, 2, st.current.z);
  });
  return (
    <Tap id={id} onTap={onTap}>
      <group ref={ref}>
        {[-1, 1].map((k) => (
          <group key={k} ref={k < 0 ? legL : legR} position={[k * 0.28, 1.3, 0]}>
            <mesh position={[0, -0.65, 0]}>
              <boxGeometry args={[0.22, 1.3, 0.3]} />
              <meshStandardMaterial color="#2a2d33" metalness={0.8} roughness={0.35} />
            </mesh>
            <mesh position={[0, -1.25, -0.08]}>
              <boxGeometry args={[0.3, 0.12, 0.5]} />
              <meshStandardMaterial color="#1a1c20" metalness={0.8} roughness={0.35} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[0.95, 1.2, 0.6]} />
          <meshStandardMaterial color="#e5e5e8" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.95, -0.31]}>
          <boxGeometry args={[0.5, 0.5, 0.02]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * 0.6, 1.75, 0]} rotation={[0.1, 0, k * 0.08]}>
            <boxGeometry args={[0.2, 1.3, 0.24]} />
            <meshStandardMaterial color="#2a2d33" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}
        <mesh position={[0, 2.78, 0]}>
          <boxGeometry args={[0.6, 0.42, 0.55]} />
          <meshStandardMaterial color="#e5e5e8" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 2.8, -0.28]}>
          <boxGeometry args={[0.5, 0.08, 0.02]} />
          <meshBasicMaterial color="#ff1030" toneMapped={false} />
        </mesh>
      </group>
    </Tap>
  );
}

/* ---------- 노점, 귓속말하는 시민 ---------- */
function Vendor({ onTap }: { onTap: TapFn }) {
  const { pos, rotY } = CITY_NPCS.vendor;
  return (
    <Tap id="vendor" onTap={onTap}>
      <Human position={pos} rotationY={rotY} color="#5a3b2a" skin="#c9a68a" hood="#3a2a20" />
      <group position={[-7.2, 0, 5.2]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[2, 0.9, 1.2]} />
          <meshStandardMaterial color="#6b5a3c" roughness={0.8} />
        </mesh>
        {/* 투명 우산들 */}
        {[-0.6, 0, 0.6].map((x, i) => (
          <mesh key={x} position={[x, 1.25 + i * 0.05, 0]} rotation={[0, 0, (i - 1) * 0.2]}>
            <coneGeometry args={[0.45, 0.25, 12, 1, true]} />
            <meshStandardMaterial color="#cfe9ff" transparent opacity={0.45} roughness={0.1} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* 머리 위 큰 우산 */}
        <mesh position={[0.2, 2.6, -1.1]}>
          <coneGeometry args={[1.7, 0.7, 16, 1, true]} />
          <meshStandardMaterial color="#d33" roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.2, 1.4, -1.1]}>
          <cylinderGeometry args={[0.025, 0.025, 2.4, 6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <pointLight position={[0, 2.1, -0.4]} intensity={6} distance={6} color="#ffb070" />
        <mesh position={[0, 1.95, -0.4]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshBasicMaterial color="#ffd09a" toneMapped={false} />
        </mesh>
      </group>
    </Tap>
  );
}

function Whisper({ onTap }: { onTap: TapFn }) {
  const { pos } = CITY_NPCS.whisper;
  const head = useRef<THREE.Group>(null);
  const twin = useRef<THREE.Group>(null);
  useFrame(() => {
    const near = Math.hypot(player.pos.x - pos[0], player.pos.z - pos[2]) < 3;
    if (head.current) head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, near ? 0.9 : Math.PI, 0.04);
    // 반대편 줄의 짝도 같은 순간 똑같이 (거울처럼) 고개를 돌린다
    if (twin.current && head.current) twin.current.rotation.y = -head.current.rotation.y;
  });
  return (
    <group>
      <Tap id="whisper" onTap={onTap}>
        <group ref={head} position={pos} rotation={[0, Math.PI, 0]}>
          <Human position={[0, 0, 0]} color="#5f626b" skin="#c0b4aa" visor="#7dff7a" />
        </group>
      </Tap>
      <group ref={twin} position={[-pos[0], 0, pos[2]]} rotation={[0, -Math.PI, 0]}>
        <Human position={[0, 0, 0]} color="#5f626b" skin="#c0b4aa" visor="#7dff7a" />
      </group>
    </group>
  );
}

/* ---------- 비 ---------- */
function Rain({ count = lite ? 500 : 1400 }) {
  const ref = useRef<THREE.LineSegments>(null);
  const { geo, drops } = useMemo(() => {
    const r = rng(5);
    const drops = Array.from({ length: count }, () => ({ x: (r() - 0.5) * 50, y: r() * 30, z: (r() - 0.5) * 50, s: 22 + r() * 10 }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    return { geo, drops };
  }, [count]);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const arr = geo.attributes.position.array as Float32Array;
    const px = player.pos.x;
    const pz = player.pos.z;
    drops.forEach((d, i) => {
      d.y -= d.s * dt;
      if (d.y < 0) d.y += 30;
      // 플레이어 주변 50m 안에서 반복
      const x = px + ((((d.x - px) % 50) + 75) % 50) - 25;
      const z = pz + ((((d.z - pz) % 50) + 75) % 50) - 25;
      arr[i * 6] = x;
      arr[i * 6 + 1] = d.y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x + 0.04;
      arr[i * 6 + 4] = d.y + 0.7;
      arr[i * 6 + 5] = z;
    });
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <lineSegments ref={ref} geometry={geo} frustumCulled={false}>
      <lineBasicMaterial color="#9fb4c8" transparent opacity={0.35} />
    </lineSegments>
  );
}

/* ---------- 하늘에 떠 있는 쿠키 홀로그램 ---------- */
function CookieHolo() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.25;
    ref.current.position.y = 38 + Math.sin(s.clock.elapsedTime * 0.5) * 1.2;
  });
  return (
    <group ref={ref} position={[0, 38, -58]}>
      <group rotation={[Math.PI / 2.6, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[7, 7, 1.2, 32, 1]} />
          <meshBasicMaterial color="#ffb02e" wireframe transparent opacity={0.4} toneMapped={false} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[Math.cos(i * 2.3) * (2 + (i % 3) * 1.6), 0.7, Math.sin(i * 2.3) * (2 + (i % 3) * 1.6)]}>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshBasicMaterial color="#ff6a2e" wireframe transparent opacity={0.6} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// 화면 글자(안내·대사)가 바뀔 때마다 도시 전체(물체 약 2천 개)를 다시 계산하지 않도록 memo로 감싼다
function City({ lang, onTap, onTracked }: { lang: Lang; onTap: TapFn; onTracked: (v: boolean) => void }) {
  const q = useQuality();
  return (
    <group>
      <fogExp2 attach="fog" args={["#1a0e18", 0.0062]} />
      {q !== "low" && <NeonEnvironment />}
      <Sky />
      <CloudSea />
      <ambientLight intensity={0.32} color="#8a90b0" />
      <hemisphereLight args={["#3a3050", "#05050a", 0.5]} />
      <directionalLight position={[-30, 60, 20]} intensity={0.25} color="#8aa0ff" />
      <pointLight position={[0, 8, -40]} intensity={40} distance={30} color="#ff2bd6" />
      <pointLight position={[0, 6, 10]} intensity={30} distance={26} color="#22f0ff" />
      <Platform />
      <Islands />
      <Bridge />
      <TwinBuddhas />
      <AirTraffic />
      <Arks />
      <Towers />
      <Ground />
      <Gate lang={lang} />
      <DescentRoute lang={lang} />
      <Depot lang={lang} />
      <LookoutSigns lang={lang} />
      <Jabi lang={lang} />
      <Billboards lang={lang} />
      <VerticalSigns />
      <Lanterns />
      <Gantry lang={lang} />
      <Cameras onTracked={onTracked} />
      <Lamps />
      <Drones />
      <Queue />
      <Marchers />
      <Patrols onTap={onTap} />
      <Vendor onTap={onTap} />
      <VendorReplica />
      <Whisper onTap={onTap} />
      <AlleyDecor />
      <ChalkMarks />
      <NeonRoute />
      <AvenueHolo />
      <AlleyPeople />
      <Hatch lang={lang} onTap={onTap} />
      <Grandma lang={lang} onTap={onTap} />
      <Courier lang={lang} onTap={onTap} />
      <EdgeKid onTap={onTap} />
      <RoboMonk onTap={onTap} />
      <BellPavilion />
      <StonePagoda />
      <Scopes onTap={onTap} />
      <CookieHolo />
      <Rain />
      <Sparkles count={40} scale={[4, 3, 4]} position={[-5, 1.2, -20]} size={8} speed={0.4} color="#888" opacity={0.25} />
      <Sparkles count={40} scale={[4, 3, 4]} position={[5, 1.2, -20]} size={8} speed={0.4} color="#888" opacity={0.25} />
    </group>
  );
}

export default memo(City);
