"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Lang } from "@/data/site";
import { billboards, ticker } from "./story";
import { AVENUE, CAMERA_POLES, CITY, CITY_NPCS, CROSS, EDGE, ISLANDS, LOTS, OVERSEER_ISLAND, QUEUE_X, QUEUE_Z } from "./zones";
import { AirTraffic, Arks, Bridge, CloudSea, Islands, Platform, Sky, TwinBuddhas } from "./CityWorld";
import { AlleyDecor, AlleyPeople, BellPavilion, Courier, EdgeKid, Grandma, Hatch, LotusStrings, RoboMonk, Scopes, StonePagoda, VendorReplica } from "./CityAlleys";
import { citizenGeometry, roofGeometry, visorGeometry } from "./models";
import { towerMaterial } from "./towerMaterial";
import { concreteTexture, hazardTexture, signTexture } from "./textures";
import { Human, Tap, useSign, type TapFn } from "./parts";
import { player } from "./Player";
import Jabi from "./Jabi";

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
      [lang === "ko" ? "통제 구역" : "RESTRICTED", 1.3],
      [lang === "ko" ? "B등급 미만 시민 출입 불가" : "GRADE C AND BELOW MAY NOT PASS", 0.6],
    ],
    { color: "#ff2a3d", glow: true, mono: true, w: 1024, h: 256, bg: "#0a0204" }
  );
  const lasers = useRef<THREE.Group>(null);
  const stone = useMemo(() => {
    const t = concreteTexture(17, 110);
    t.repeat.set(3, 3);
    return t;
  }, []);
  useFrame((s) => {
    lasers.current?.children.forEach((c, i) => {
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(s.clock.elapsedTime * 8 + i) * 0.3;
    });
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

/* ---------- 세로 한글 간판: 건물 벽에서 길 쪽으로 튀어나옴 ---------- */
const SIGN_WORDS = ["기억수리", "감정대여", "동의센터", "해장국", "등급상담", "꿈판매", "전당포", "로봇수리", "인력사무소", "만두", "여관", "신경칩", "노래방", "약국", "환불불가", "족발", "PC방", "부적"];
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
  return (
    <group>
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
      onTracked(any);
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
  const glow = useGlowTexture();
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
              <meshBasicMaterial color="#d8f0ff" toneMapped={false} />
            </mesh>
            <mesh position={[s * 1.9, 3.95, 0]}>
              <coneGeometry args={[2.4, 7.8, 20, 1, true]} />
              <meshBasicMaterial color="#bfe6ff" transparent opacity={0.012} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s * 1.9, 0.02, 0]}>
              <planeGeometry args={[6, 6]} />
              <meshBasicMaterial map={glow} color="#9fd8ff" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ---------- 순찰 드론: 탐조등으로 거리를 훑음 ---------- */
function Drones() {
  const glow = useGlowTexture();
  const drones = useMemo(
    () =>
      // 거울처럼 짝지어 반대 방향으로 똑같이 돈다
      Array.from({ length: 4 }, (_, i) => ({
        cx: 4 + (i % 2) * 2,
        cz: -8 - i * 19,
        r: 5 + (i % 3) * 2,
        y: 13 + (i % 3) * 4,
        speed: 0.25 + (i % 4) * 0.08,
        phase: i * 1.7,
      })).flatMap((d) => [
        { ...d, m: 1 },
        { ...d, m: -1 },
      ]),
    []
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const spots = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    drones.forEach((d, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = t * d.speed + d.phase;
      g.position.set(d.m * (d.cx + Math.cos(a) * d.r), d.y + Math.sin(t * 1.3 + (i >> 1)) * 0.4, d.cz + Math.sin(a) * d.r);
      g.rotation.y = -a * d.m;
      const sp = spots.current[i];
      if (sp) sp.position.set(g.position.x, 0.03, g.position.z);
    });
  });
  return (
    <group>
      {drones.map((d, i) => (
        <group key={i}>
          <group ref={(g) => { refs.current[i] = g; }}>
            <mesh>
              <boxGeometry args={[0.9, 0.25, 0.9]} />
              <meshStandardMaterial color="#1c1e24" metalness={0.8} roughness={0.3} />
            </mesh>
            {[
              [-0.65, -0.65],
              [0.65, -0.65],
              [-0.65, 0.65],
              [0.65, 0.65],
            ].map(([x, z], k) => (
              <mesh key={k} position={[x, 0.12, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 0.32, 16]} />
                <meshBasicMaterial color="#444" side={THREE.DoubleSide} />
              </mesh>
            ))}
            <mesh position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.12, 10, 8]} />
              <meshBasicMaterial color="#ff2030" toneMapped={false} />
            </mesh>
            <mesh position={[0, -d.y / 2, 0]}>
              <coneGeometry args={[2.2, d.y, 20, 1, true]} />
              <meshBasicMaterial color="#ffdede" transparent opacity={0.025} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
          <mesh ref={(m) => { spots.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[5, 5]} />
            <meshBasicMaterial map={glow} color="#ffd0d0" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- 줄 선 시민들 (모두 같은 박자로 흔들림) ---------- */
function Queue() {
  const geo = citizenGeometry();
  const vGeo = visorGeometry();
  const body = useRef<THREE.InstancedMesh>(null);
  const visor = useRef<THREE.InstancedMesh>(null);
  const slots = useMemo(
    () =>
      QUEUE_X.flatMap((x) => QUEUE_Z.map((z) => [x, z] as [number, number])).filter(
        ([x, z]) => !(Math.abs(x) === CITY_NPCS.whisper.pos[0] && z === CITY_NPCS.whisper.pos[2])
      ),
    []
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const sway = Math.sin(t * 1.2) * 0.015;
    slots.forEach(([x, z], i) => {
      tmpM.compose(tmpV.set(x, 0, z), tmpQ.setFromEuler(tmpE.set(0, Math.PI, sway)), tmpS.set(1, 1, 1));
      body.current?.setMatrixAt(i, tmpM);
      visor.current?.setMatrixAt(i, tmpM);
    });
    if (body.current) body.current.instanceMatrix.needsUpdate = true;
    if (visor.current) visor.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={body} args={[geo, undefined, slots.length]} frustumCulled={false}>
        <meshStandardMaterial color="#5a5d66" roughness={0.6} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={visor} args={[vGeo, undefined, slots.length]} frustumCulled={false}>
        <meshBasicMaterial color="#22f0ff" toneMapped={false} />
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
        <meshStandardMaterial color="#3e4048" roughness={0.6} metalness={0.25} />
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
function Rain({ count = 1400 }) {
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

export default function City({ lang, onTap, onTracked }: { lang: Lang; onTap: TapFn; onTracked: (v: boolean) => void }) {
  return (
    <group>
      <fogExp2 attach="fog" args={["#1a0e18", 0.0062]} />
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
      <AlleyPeople />
      <Hatch lang={lang} onTap={onTap} />
      <Grandma lang={lang} onTap={onTap} />
      <Courier onTap={onTap} />
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
