"use client";

// 지상의 사람 사는 쪽: 골목 장식, 골목 사람들, 숨겨진 방공호 입구, 포장마차, 범종각과 석탑, 망원경, 새 NPC들
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { addRim } from "./rim";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Lang } from "@/data/site";
import { ALLEYS, ALLEY_PEOPLE, AVENUE, AVENUE_HOLO, BELL, CHALK, CITY_NPCS, HATCH, JUNK, LOOKOUT_PATH, LOTS, PAGODA, SCOPES } from "./zones";
import { citizenGeometry, roofGeometry } from "./models";
import { chalkArrowTexture, concreteTexture, signTexture } from "./textures";
import { Human, Tap, useSign, type TapFn } from "./parts";
import { player } from "./Player";
import { gaze, route } from "./gaze";

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpE = new THREE.Euler();

const lotAt = (x: number, z: number) => LOTS.some((l) => x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1);

export const LOTUS_COLORS = ["#ff5a8a", "#ffd23f", "#6dff8a", "#ff4040", "#f4f0ff", "#4fb0ff"];

/* ---------- 분필 화살표: 방공호 골목에서 광장까지, 골목 사람들이 바닥에 그려 둔 길 ---------- */
export function ChalkMarks() {
  const tex = useMemo(() => ({ straight: chalkArrowTexture(false), turn: chalkArrowTexture(true) }), []);
  return (
    <group>
      {CHALK.map((m, i) => (
        <mesh key={i} position={[m.x, 0.025, m.z]} rotation={[-Math.PI / 2, 0, m.rotY]} renderOrder={1}>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial map={m.turn ? tex.turn : tex.straight} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 망원경 가는 길의 네온: 골목 입구에서 남쪽 망원경까지 바닥에 깔린 빛줄기 ---------- */
// 망원경 단계(scope)에서만 켜진다. 화살표 무늬가 망원경 쪽으로 흘러간다. 경유점(LOOKOUT_PATH)을 그대로 잇는다
function neonArrowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d")!;
  // 가운데 줄
  g.fillStyle = "rgba(80,240,255,0.55)";
  g.fillRect(0, 28, 128, 8);
  // 화살촉 (오른쪽 = 나아가는 쪽)
  g.strokeStyle = "#7ff6ff";
  g.lineWidth = 9;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.shadowColor = "#3ff0ff";
  g.shadowBlur = 10;
  g.beginPath();
  g.moveTo(50, 10);
  g.lineTo(78, 32);
  g.lineTo(50, 54);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}
export function NeonRoute() {
  const segs = useMemo(() => {
    const base = neonArrowTexture();
    // 네온은 배송 대기소 처마 밑(경유점 2)부터 전망대까지 (골목에서 처마까지는 퀘스트 화살표가 안내한다)
    const pts = LOOKOUT_PATH.slice(2);
    return pts.slice(1).map((b, i) => {
      const a = pts[i];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const tex = base.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, Math.round(len / 1.1)), 1);
      return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, len, yaw: -Math.atan2(b.z - a.z, b.x - a.x), tex };
    });
  }, []);
  useLayoutEffect(() => () => segs.forEach((s) => s.tex.dispose()), [segs]);
  const group = useRef<THREE.Group>(null);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame((st, dt) => {
    const on = route.phase === "scope";
    if (group.current) group.current.visible = on;
    if (!on) return;
    const t = st.clock.elapsedTime;
    segs.forEach((s) => (s.tex.offset.x -= dt * 1.4));
    mats.current.forEach((m) => m && (m.opacity = 0.75 + Math.sin(t * 3) * 0.15));
  });
  return (
    <group ref={group} visible={false}>
      {segs.map((s, i) => (
        <group key={i} position={[s.x, 0.035, s.z]} rotation={[0, s.yaw, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
            <planeGeometry args={[s.len, 0.62]} />
            <meshBasicMaterial ref={(m) => { mats.current[i] = m; }} map={s.tex} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- 큰길 차단막: 망원경을 보기 전에는 큰길 입구마다 붉은 홀로그램 막이 선다 ---------- */
export function AvenueHolo() {
  const sign = useSign([["통행 제한", 1], ["RESTRICTED", 0.55]], { color: "#ffd0dc", bg: "#2a0610", w: 512, h: 200, border: true });
  const group = useRef<THREE.Group>(null);
  const film = useRef<THREE.MeshBasicMaterial>(null);
  const lines = useRef<THREE.MeshBasicMaterial>(null);
  const H = 3.2;
  useFrame((st) => {
    const on = route.avenueLocked;
    if (group.current) group.current.visible = on;
    if (!on) return;
    const t = st.clock.elapsedTime;
    const flick = Math.sin(t * 37) > 0.93 ? 0.5 : 1;
    if (film.current) film.current.opacity = (0.16 + Math.sin(t * 2.2) * 0.04) * flick;
    if (lines.current) lines.current.opacity = (0.75 + Math.sin(t * 5) * 0.15) * flick;
  });
  return (
    <group ref={group} visible={false}>
      {AVENUE_HOLO.map(([x0, z0, x1, z1], i) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const yaw = -Math.atan2(z1 - z0, x1 - x0);
        return (
          <group key={i} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} rotation={[0, yaw, 0]}>
            <mesh position={[0, H / 2, 0]} renderOrder={3}>
              <planeGeometry args={[len, H]} />
              <meshBasicMaterial ref={i === 0 ? film : undefined} color="#ff2a55" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
            </mesh>
            {[0.15, 1.1, 2.05, 3.0].map((y) => (
              <mesh key={y} position={[0, y, 0]} renderOrder={3}>
                <boxGeometry args={[len, 0.05, 0.05]} />
                <meshBasicMaterial ref={i === 0 && y === 0.15 ? lines : undefined} color="#ff3a66" transparent opacity={0.8} toneMapped={false} />
              </mesh>
            ))}
            {i === 0 && (
              <mesh position={[0, 1.7, 0.03]}>
                <planeGeometry args={[3.2, 1.25]} />
                <meshBasicMaterial map={sign} transparent opacity={0.92} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/* ---------- 연등: 줄에 매단 색색의 등 (인스턴스) ---------- */
export function LotusStrings({ strings }: { strings: { a: THREE.Vector3; b: THREE.Vector3; sag: number; n: number; seed: number }[] }) {
  const { lamps, wires } = useMemo(() => {
    const lamps: { p: THREE.Vector3; c: string }[] = [];
    const wires: THREE.TubeGeometry[] = [];
    for (const s of strings) {
      const mid = s.a.clone().lerp(s.b, 0.5);
      mid.y -= s.sag;
      const curve = new THREE.QuadraticBezierCurve3(s.a, mid, s.b);
      wires.push(new THREE.TubeGeometry(curve, 16, 0.025, 4, false));
      for (let k = 1; k <= s.n; k++) lamps.push({ p: curve.getPoint(k / (s.n + 1)).add(new THREE.Vector3(0, -0.38, 0)), c: LOTUS_COLORS[(k + s.seed) % LOTUS_COLORS.length] });
    }
    return { lamps, wires };
  }, [strings]);
  const body = useRef<THREE.InstancedMesh>(null);
  const tail = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const c = new THREE.Color();
    lamps.forEach(({ p, c: col }, i) => {
      tmpM.compose(p, tmpQ.identity(), tmpS.set(1, 1.05, 1));
      body.current!.setMatrixAt(i, tmpM);
      body.current!.setColorAt(i, c.set(col));
      tmpM.compose(tmpV.copy(p).add(new THREE.Vector3(0, -0.3, 0)), tmpQ.identity(), tmpS.set(1, 1, 1));
      tail.current!.setMatrixAt(i, tmpM);
      tail.current!.setColorAt(i, c.set(col));
    });
    for (const m of [body.current!, tail.current!]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [lamps]);
  return (
    <group>
      {wires.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#060607" />
        </mesh>
      ))}
      {/* 연꽃잎이 겹친 둥근 등: 굴곡진 구 */}
      <instancedMesh ref={body} args={[undefined, undefined, lamps.length]} frustumCulled={false}>
        <icosahedronGeometry args={[0.26, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tail} args={[undefined, undefined, lamps.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.008, 0.008, 0.2, 4]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ---------- 골목 장식: 실외기, 배관, 전깃줄, 간판, 쓰레기, 물웅덩이, 백열등 ---------- */
const ALLEY_WORDS = ["국밥", "수선", "복덕방", "점집", "세탁", "이발", "철물", "만화", "다방", "기도원", "사주", "중고칩"];
const ALLEY_SIGN_COLORS = ["#ffb070", "#ff6a6a", "#7dff7a", "#ffe14d", "#22f0ff", "#ff7ad9"];

export function AlleyDecor() {
  const data = useMemo(() => {
    const r = rng(41);
    const ac: { p: [number, number, number]; ry: number }[] = [];
    const pipes: { p: [number, number, number]; h: number }[] = [];
    const bags: [number, number, number, number][] = [];
    const crates: { p: [number, number, number]; ry: number; s: number }[] = [];
    const puddles: [number, number, number, number][] = [];
    const bulbs: [number, number, number][] = [];
    const signs: { p: [number, number, number]; ry: number; word: number }[] = [];
    const strings: { a: THREE.Vector3; b: THREE.Vector3; sag: number; n: number; seed: number }[] = [];
    let w = 0;
    for (const a of ALLEYS) {
      const ns = a.dir === "ns";
      const L = ns ? a.z1 - a.z0 : a.x1 - a.x0;
      // 골목 양쪽 벽: ns 골목은 x0, x1 / ew 골목은 z0, z1
      for (let t = 1.5; t < L - 1; t += 2.2 + r() * 2.6) {
        for (const side of [0, 1]) {
          const along = ns ? a.z0 + t : a.x0 + t;
          const wall = ns ? (side ? a.x1 : a.x0) : side ? a.z1 : a.z0;
          const inward = side ? -1 : 1;
          const wx = ns ? wall : along;
          const wz = ns ? along : wall;
          const probe = ns ? [wall - inward * 0.4, along] : [along, wall - inward * 0.4];
          if (!lotAt(probe[0], probe[1])) continue; // 교차로엔 벽이 없다
          const k = r();
          const ry = ns ? (side ? -Math.PI / 2 : Math.PI / 2) : side ? Math.PI : 0;
          const off = (d: number): [number, number] => (ns ? [wx + inward * d, wz] : [wx, wz + inward * d]);
          if (k < 0.35) {
            const [x, z] = off(0.3);
            ac.push({ p: [x, 2.6 + r() * 7, z], ry });
          } else if (k < 0.5) {
            const [x, z] = off(0.12);
            pipes.push({ p: [x, 0, z], h: 6 + r() * 10 });
          } else if (k < 0.65) {
            const [x, z] = off(0.55);
            signs.push({ p: [x, 3 + r() * 1.5, z], ry, word: w++ % ALLEY_WORDS.length });
          }
          const g = r();
          if (g < 0.25) {
            const [x, z] = off(0.4);
            bags.push([x, 0.25, z, 0.25 + r() * 0.15]);
          } else if (g < 0.36) {
            const [x, z] = off(0.45);
            crates.push({ p: [x, 0.3, z], ry: r() * 0.5, s: 0.6 + r() * 0.2 });
          }
        }
        // 골목을 가로지르는 연등 줄과 백열등
        if (r() < 0.32) {
          const along = ns ? a.z0 + t : a.x0 + t;
          const y = 4.2 + r() * 1.4;
          const A = ns ? new THREE.Vector3(a.x0, y, along) : new THREE.Vector3(along, y, a.z0);
          const B = ns ? new THREE.Vector3(a.x1, y + (r() - 0.5) * 0.6, along + (r() - 0.5) * 2) : new THREE.Vector3(along + (r() - 0.5) * 2, y + (r() - 0.5) * 0.6, a.z1);
          strings.push({ a: A, b: B, sag: 0.5 + r() * 0.4, n: 3, seed: Math.floor(r() * 6) });
        }
        if (r() < 0.22) {
          const along = ns ? a.z0 + t : a.x0 + t;
          const cx = (a.x0 + a.x1) / 2;
          const cz = (a.z0 + a.z1) / 2;
          bulbs.push(ns ? [cx, 3.4, along] : [along, 3.4, cz]);
        }
        if (r() < 0.18) {
          const along = ns ? a.z0 + t : a.x0 + t;
          const cx = (a.x0 + a.x1) / 2 + (r() - 0.5);
          const cz = (a.z0 + a.z1) / 2 + (r() - 0.5);
          puddles.push(ns ? [cx, along, 0.8 + r() * 0.6, r() * 3] : [along, cz, 0.8 + r() * 0.6, r() * 3]);
        }
      }
    }
    return { ac, pipes, bags, crates, puddles, bulbs, signs, strings };
  }, []);

  const acRef = useRef<THREE.InstancedMesh>(null);
  const fanRef = useRef<THREE.InstancedMesh>(null);
  const pipeRef = useRef<THREE.InstancedMesh>(null);
  const bagRef = useRef<THREE.InstancedMesh>(null);
  const crateRef = useRef<THREE.InstancedMesh>(null);
  const bulbRef = useRef<THREE.InstancedMesh>(null);
  const poolRef = useRef<THREE.InstancedMesh>(null);
  const puddleRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    data.ac.forEach(({ p, ry }, i) => {
      tmpQ.setFromEuler(tmpE.set(0, ry, 0));
      tmpM.compose(tmpV.set(...p), tmpQ, tmpS.set(1, 1, 1));
      acRef.current!.setMatrixAt(i, tmpM);
      // 팬 덮개: 실외기 앞면
      const f = new THREE.Vector3(0, 0, 0.26).applyQuaternion(tmpQ);
      tmpM.compose(tmpV.set(p[0] + f.x, p[1], p[2] + f.z), tmpQ, tmpS.set(1, 1, 1));
      fanRef.current!.setMatrixAt(i, tmpM);
    });
    data.pipes.forEach(({ p, h }, i) => {
      tmpM.compose(tmpV.set(p[0], h / 2, p[2]), tmpQ.identity(), tmpS.set(1, h, 1));
      pipeRef.current!.setMatrixAt(i, tmpM);
    });
    data.bags.forEach(([x, y, z, s], i) => {
      tmpM.compose(tmpV.set(x, y * s * 3, z), tmpQ.identity(), tmpS.set(s * 4, s * 3, s * 4));
      bagRef.current!.setMatrixAt(i, tmpM);
    });
    data.crates.forEach(({ p, ry, s }, i) => {
      tmpM.compose(tmpV.set(p[0], s / 2, p[2]), tmpQ.setFromEuler(tmpE.set(0, ry, 0)), tmpS.set(s, s, s));
      crateRef.current!.setMatrixAt(i, tmpM);
    });
    data.bulbs.forEach(([x, y, z], i) => {
      tmpM.compose(tmpV.set(x, y, z), tmpQ.identity(), tmpS.set(1, 1, 1));
      bulbRef.current!.setMatrixAt(i, tmpM);
      tmpM.compose(tmpV.set(x, 0.03, z), tmpQ.setFromEuler(tmpE.set(-Math.PI / 2, 0, 0)), tmpS.set(1, 1, 1));
      poolRef.current!.setMatrixAt(i, tmpM);
    });
    data.puddles.forEach(([x, z, s, rot], i) => {
      tmpM.compose(tmpV.set(x, 0.012, z), tmpQ.setFromEuler(tmpE.set(-Math.PI / 2, 0, rot)), tmpS.set(s * 1.6, s, 1));
      puddleRef.current!.setMatrixAt(i, tmpM);
    });
    for (const m of [acRef, fanRef, pipeRef, bagRef, crateRef, bulbRef, poolRef, puddleRef]) if (m.current) m.current.instanceMatrix.needsUpdate = true;
  }, [data]);

  const signTex = useMemo(
    () =>
      ALLEY_WORDS.map((wd, i) =>
        signTexture(
          wd.split("").map((ch) => [ch, 1] as [string, number]),
          { color: ALLEY_SIGN_COLORS[i % ALLEY_SIGN_COLORS.length], bg: "#0c0808", glow: true, border: true, w: 96, h: 96 * wd.length }
        )
      ),
    []
  );
  const glow = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <group>
      <instancedMesh ref={acRef} args={[undefined, undefined, data.ac.length]} frustumCulled={false}>
        <boxGeometry args={[0.9, 0.62, 0.5]} />
        <meshStandardMaterial color="#9a9890" roughness={0.7} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={fanRef} args={[undefined, undefined, data.ac.length]} frustumCulled={false}>
        <circleGeometry args={[0.22, 14]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={pipeRef} args={[undefined, undefined, data.pipes.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.07, 0.07, 1, 6]} />
        <meshStandardMaterial color="#4a4038" roughness={0.6} metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={bagRef} args={[undefined, undefined, data.bags.length]} frustumCulled={false}>
        <sphereGeometry args={[0.25, 8, 6]} />
        <meshStandardMaterial color="#121214" roughness={0.3} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={crateRef} args={[undefined, undefined, data.crates.length]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#3a5a8a" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={bulbRef} args={[undefined, undefined, data.bulbs.length]} frustumCulled={false}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshBasicMaterial color="#ffcf8a" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={poolRef} args={[undefined, undefined, data.bulbs.length]} frustumCulled={false}>
        <planeGeometry args={[4.5, 4.5]} />
        <meshBasicMaterial map={glow} color="#ffb070" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </instancedMesh>
      <instancedMesh ref={puddleRef} args={[undefined, undefined, data.puddles.length]} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshStandardMaterial color="#0a0b0e" roughness={0.04} metalness={0.95} transparent opacity={0.85} />
      </instancedMesh>
      {data.signs.map((sg, i) => (
        <group key={i} position={sg.p} rotation={[0, sg.ry + Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[0.55, 0.55 * ALLEY_WORDS[sg.word].length, 0.08]} />
            <meshBasicMaterial map={signTex[sg.word]} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <LotusStrings strings={data.strings} />
    </group>
  );
}

/* ---------- 골목 사람들: 아무 데나 기대 선 채 굳어 있는 정지된 시민들 (다가가 보면 '정지된 시민이다.') ---------- */
export function AlleyPeople() {
  const geo = citizenGeometry();
  const ref = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const c = new THREE.Color();
    const coats = ["#6b4a3a", "#3f4f3a", "#5a3a4a", "#4a4a5a", "#7a6a4a", "#2f3a4a"];
    const skins = ["#d9b9a0", "#c49a7a", "#b98a6a", "#e0c4ac"];
    ALLEY_PEOPLE.forEach((p, i) => {
      const s = 0.92 + p.tone * 0.14;
      tmpM.compose(tmpV.set(p.x, 0, p.z), tmpQ.setFromEuler(tmpE.set(0, p.rotY, 0)), tmpS.set(s, s, s));
      ref.current!.setMatrixAt(i, tmpM);
      ref.current!.setColorAt(i, c.set(coats[Math.floor(p.tone * 997) % coats.length]));
      tmpM.compose(tmpV.set(p.x, 1.62 * s, p.z), tmpQ.identity(), tmpS.set(s, s * 1.15, s));
      heads.current!.setMatrixAt(i, tmpM);
      heads.current!.setColorAt(i, c.set(skins[Math.floor(p.tone * 31) % skins.length]));
    });
    for (const m of [ref.current!, heads.current!]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, []);
  return (
    <group>
      <instancedMesh ref={ref} args={[geo, undefined, ALLEY_PEOPLE.length]} frustumCulled={false}>
        <meshStandardMaterial ref={(m) => void (m && addRim(m, "#ff9a3c", 0.6))} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, ALLEY_PEOPLE.length]} frustumCulled={false}>
        <sphereGeometry args={[0.112, 12, 10]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      {/* 담배 불빛 몇 개 */}
      {ALLEY_PEOPLE.filter((_, i) => i % 3 === 0).map((p, i) => (
        <mesh key={i} position={[p.x + Math.sin(p.rotY) * 0.25, 1.5, p.z + Math.cos(p.rotY) * 0.25]}>
          <sphereGeometry args={[0.018, 6, 4]} />
          <meshBasicMaterial color="#ff6a2a" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 방공호 입구: 막다른 골목 끝, 낡은 배전실 문 ---------- */
export function Hatch({ lang, onTap }: { lang: Lang; onTap: TapFn }) {
  const sign = useSign([[lang === "ko" ? "배전실 7-B" : "SUBSTATION 7-B", 1], ["⚡ 고압 주의 · 관계자 외 출입금지", 0.55]], { color: "#e8e2c8", bg: "#1a1a14", w: 512, h: 200, border: true });
  const rust = useMemo(() => {
    const t = concreteTexture(23, 52);
    t.repeat.set(1, 2);
    return t;
  }, []);
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  const bulb = useRef<THREE.PointLight>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (lamp.current) lamp.current.color.setRGB(0.2, 1, 0.5).multiplyScalar(0.5 + Math.sin(t * 2) * 0.4);
    // 깜빡이는 골목 전구
    if (bulb.current) bulb.current.intensity = Math.sin(t * 23) > 0.85 || Math.sin(t * 3.1) > 0.97 ? 0.5 : 7;
  });
  const [x, , z] = HATCH.pos;
  const ax = HATCH.alleyX;
  return (
    <group>
      <Tap id="hatch" onTap={onTap}>
        {/* 벽(x=-25.5)에 붙은 녹슨 철문, +x 쪽을 향함 */}
        <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <mesh position={[0, 1.1, 0.04]}>
            <boxGeometry args={[1.15, 2.2, 0.08]} />
            <meshStandardMaterial map={rust} color="#4d5a4a" metalness={0.5} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.15, 0.03]}>
            <boxGeometry args={[1.35, 2.4, 0.04]} />
            <meshStandardMaterial color="#2a2a26" metalness={0.6} roughness={0.6} />
          </mesh>
          <mesh position={[0.42, 1.05, 0.1]}>
            <boxGeometry args={[0.06, 0.2, 0.06]} />
            <meshStandardMaterial color="#9a8a60" metalness={0.8} />
          </mesh>
          <mesh position={[0, 2.65, 0.06]}>
            <planeGeometry args={[1.5, 0.58]} />
            <meshBasicMaterial map={sign} />
          </mesh>
          <mesh position={[0.62, 2.2, 0.07]}>
            <circleGeometry args={[0.05, 10]} />
            <meshBasicMaterial ref={lamp} color="#3f8" toneMapped={false} />
          </mesh>
          {/* 옆의 배전함 */}
          <mesh position={[-1.25, 0.8, 0.22]}>
            <boxGeometry args={[0.8, 1.6, 0.44]} />
            <meshStandardMaterial color="#6e6c60" metalness={0.4} roughness={0.8} />
          </mesh>
          <mesh position={[-1.25, 1.2, 0.45]}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshBasicMaterial color="#ffd23f" />
          </mesh>
        </group>
      </Tap>
      {/* 골목 남쪽을 막은 잡동사니 더미: 상자, 고장 난 자판기, 방수포 */}
      <group position={[(JUNK.x0 + JUNK.x1) / 2, 0, (JUNK.z0 + JUNK.z1) / 2]}>
        <mesh position={[-0.9, 0.95, 0]} rotation={[0, 0.1, -0.06]}>
          <boxGeometry args={[1.1, 1.9, 0.8]} />
          <meshStandardMaterial color="#8a2a2a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[-0.9, 1.25, 0.41]} rotation={[0, 0.1, -0.06]}>
          <planeGeometry args={[0.8, 0.9]} />
          <meshBasicMaterial color="#1a3a4a" />
        </mesh>
        {[
          [0.4, 0.3, 0, 0.6],
          [1.1, 0.3, 0.1, 0.6],
          [0.75, 0.9, 0.05, 0.6],
          [1.3, 0.85, -0.1, 0.5],
          [0.2, 0.85, -0.2, 0.5],
        ].map(([cx, cy, cz, s], i) => (
          <mesh key={i} position={[cx, cy, cz]} rotation={[0, i * 0.4, 0]}>
            <boxGeometry args={[s, s, s]} />
            <meshStandardMaterial color={i % 2 ? "#5a4a32" : "#3a5a8a"} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0.6, 1.25, 0.2]} rotation={[0.3, 0.2, 0.1]}>
          <boxGeometry args={[2.2, 0.05, 1.4]} />
          <meshStandardMaterial color="#2a5aa0" roughness={0.6} />
        </mesh>
      </group>
      <mesh position={[ax, 3.3, z - 0.5]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshBasicMaterial color="#ffd8a0" toneMapped={false} />
      </mesh>
      <pointLight ref={bulb} position={[ax, 3.1, z - 0.5]} distance={9} color="#ffcf8a" />
      <Sparkles count={20} scale={[2.5, 3, 4]} position={[ax, 1.5, z - 2]} size={6} speed={0.3} color="#aaa" opacity={0.2} />
    </group>
  );
}

/* ---------- 골목 포장마차와 할머니 ---------- */
// 판대는 할머니 앞 0.9m (zones의 판대 충돌 상자와 같은 자리). 할머니가 보는 쪽이 손님 쪽이다
export function Grandma({ onTap, lang }: { onTap: TapFn; lang: Lang }) {
  const { pos, rotY } = CITY_NPCS.grandma;
  const sx = pos[0] + Math.sin(rotY) * 0.9;
  const sz = pos[2] + Math.cos(rotY) * 0.9;
  const sign = useSign([[lang === "ko" ? "어묵 · 떡볶이" : "FISHCAKE · TTEOKBOKKI", 1], [lang === "ko" ? "누구나 쉬어 가세요" : "EVERYONE WELCOME TO REST", 0.55]], { color: "#ffe9c0", bg: "#a8321e", w: 512, h: 180 });
  return (
    <Tap id="grandma" onTap={onTap}>
      <group scale={0.88}>
        <Human position={[pos[0] / 0.88, 0, pos[2] / 0.88]} rotationY={rotY} color="#7a4a5a" skin="#d8b8a0" hood="#c8c0b0" />
      </group>
      <group position={[sx, 0, sz]} rotation={[0, rotY, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[2.4, 1, 0.6]} />
          <meshStandardMaterial color="#8a7a60" roughness={0.8} />
        </mesh>
        <mesh position={[-0.5, 1.12, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.25, 16]} />
          <meshStandardMaterial color="#b8b8b8" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.5, 1.03, 0]}>
          <boxGeometry args={[0.8, 0.06, 0.45]} />
          <meshStandardMaterial color="#c8362a" roughness={0.5} />
        </mesh>
        {/* 주황 천막 */}
        <mesh position={[0, 2.5, -0.5]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[3.2, 0.05, 2.4]} />
          <meshStandardMaterial color="#ff7a2a" roughness={0.7} emissive="#5a1a00" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 2.3, 0.62]} scale={0.8}>
          <planeGeometry args={[1.6, 0.56]} />
          <meshBasicMaterial map={sign} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 2, 0.2]} intensity={7} distance={7} color="#ffb070" />
        <Sparkles count={14} scale={[0.6, 1.2, 0.6]} position={[-0.5, 1.8, 0]} size={8} speed={0.5} color="#fff" opacity={0.3} />
      </group>
    </Tap>
  );
}

/* ---------- 배송 대기소 처마 밑에서 쉬는 배달 로봇 D-12 ---------- */
// 몸은 멈춰 쉬고 있는데, 머리 위 상태 표시는 여전히 '배송 중'이다 (기록과 지금이 어긋난다)
export function Courier({ onTap, lang }: { onTap: TapFn; lang: Lang }) {
  const { pos, rotY } = CITY_NPCS.courier;
  const ref = useRef<THREE.Group>(null);
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  const tag = useSign([[lang === "ko" ? "D-12 · 배송 중" : "D-12 · DELIVERING", 1]], { color: "#7dff7a", bg: "#06120a", mono: true, w: 512, h: 96 });
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    // 쉬는 숨처럼 아주 천천히 고개(몸)를 돌린다
    if (ref.current) ref.current.rotation.y = rotY + Math.sin(t * 0.25) * 0.18;
    if (screen.current) screen.current.color.setRGB(0.1, 0.9, 1).multiplyScalar(0.45 + Math.sin(t * 1.2) * 0.15);
  });
  return (
    <Tap id="courier" onTap={onTap}>
      <group position={pos}>
        <mesh position={[0, 1.55, 0]} rotation={[0, rotY, 0]}>
          <planeGeometry args={[1.1, 0.21]} />
          <meshBasicMaterial map={tag} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <group ref={ref}>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[0.7, 0.6, 0.9]} />
            <meshStandardMaterial color="#e8e6df" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.88, 0]}>
            <boxGeometry args={[0.66, 0.06, 0.86]} />
            <meshStandardMaterial color="#ff7a2a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.6, 0.46]}>
            <planeGeometry args={[0.44, 0.22]} />
            <meshBasicMaterial ref={screen} color="#22f0ff" toneMapped={false} />
          </mesh>
          {[-0.36, 0.36].flatMap((x) =>
            [-0.3, 0.3].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.15, z]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
            ))
          )}
          <mesh position={[0.22, 1.2, -0.3]}>
            <cylinderGeometry args={[0.01, 0.01, 0.6, 4]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          <mesh position={[0.22, 1.52, -0.3]}>
            <sphereGeometry args={[0.04, 6, 4]} />
            <meshBasicMaterial color="#ff7a2a" toneMapped={false} />
          </mesh>
        </group>
      </group>
    </Tap>
  );
}

/* ---------- 난간에서 아래를 내려다보는 아이 ---------- */
export function EdgeKid({ onTap }: { onTap: TapFn }) {
  const { pos, rotY } = CITY_NPCS.edgekid;
  return (
    <Tap id="edgekid" onTap={onTap}>
      <group position={pos} rotation={[0, rotY, 0]} scale={0.62}>
        <Human position={[0, 0, 0]} color="#e0b040" skin="#e0c4ac" hood="#2a2a30" />
      </group>
    </Tap>
  );
}

/* ---------- 로봇 스님: 염주를 굴리며 고개를 숙인다 ---------- */
export function RoboMonk({ onTap }: { onTap: TapFn }) {
  const { pos, rotY } = CITY_NPCS.robomonk;
  const body = useRef<THREE.Group>(null);
  const beads = useRef<THREE.Group>(null);
  const eye = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (body.current) body.current.rotation.x = Math.max(0, Math.sin(t * 0.5)) * 0.25;
    if (beads.current) beads.current.rotation.z = t * 0.6;
    if (eye.current) eye.current.color.setRGB(0.15, 0.95, 1).multiplyScalar(0.7 + Math.sin(t * 1.3) * 0.3);
  });
  return (
    <Tap id="robomonk" onTap={onTap}>
      <group position={pos} rotation={[0, rotY, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <coneGeometry args={[0.5, 1.2, 16]} />
          <meshStandardMaterial color="#6a6a68" roughness={0.9} />
        </mesh>
        <group ref={body} position={[0, 1.1, 0]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.24, 0.34, 0.6, 16]} />
            <meshStandardMaterial color="#6a6a68" roughness={0.9} />
          </mesh>
          {/* 가사: 어깨에 비스듬히 두른 갈색 천 */}
          <mesh position={[0, 0.28, 0]} rotation={[0, 0, 0.6]}>
            <boxGeometry args={[0.12, 0.85, 0.66]} />
            <meshStandardMaterial color="#7a3a1e" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.17, 20, 16]} />
            <meshStandardMaterial color="#e8e6e2" roughness={0.25} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.74, 0.155]}>
            <boxGeometry args={[0.16, 0.025, 0.02]} />
            <meshBasicMaterial ref={eye} color="#22f0ff" toneMapped={false} />
          </mesh>
          <group ref={beads} position={[0.05, 0.12, 0.3]}>
            {Array.from({ length: 18 }, (_, i) => (
              <mesh key={i} position={[Math.cos((i / 18) * Math.PI * 2) * 0.13, Math.sin((i / 18) * Math.PI * 2) * 0.13, 0]}>
                <sphereGeometry args={[0.022, 6, 4]} />
                <meshStandardMaterial color="#3a2010" roughness={0.5} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </Tap>
  );
}

/* ---------- 범종각: 붉은 기둥, 기와지붕, 청동 종. 정해진 간격으로 저절로 울린다 ---------- */
export function BellPavilion() {
  const striker = useRef<THREE.Group>(null);
  const bell = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const bellGeo = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.0, 2.2],
          [0.35, 2.2],
          [0.55, 2.0],
          [0.62, 1.4],
          [0.7, 0.6],
          [0.86, 0.1],
          [0.9, 0.0],
          [0.8, 0.0],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        28
      ),
    []
  );
  const roof = roofGeometry();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const period = 24;
    const u = t % period;
    // 당목이 뒤로 물러났다가 종을 친다
    const back = u < 2 ? Math.sin((u / 2) * Math.PI) * 0.9 : 0;
    if (striker.current) striker.current.rotation.z = -back;
    const hit = u > 2 ? u - 2 : 99;
    if (bell.current) bell.current.rotation.z = Math.sin(hit * 6) * 0.04 * Math.exp(-hit * 0.8);
    if (ring.current) {
      const k = Math.min(hit / 5, 1);
      ring.current.scale.setScalar(1 + k * 40);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = hit < 5 ? (1 - k) * 0.5 : 0;
    }
  });
  const [x, , z] = BELL.pos;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[5.2, 0.5, 5.2]} />
        <meshStandardMaterial color="#6d6a64" roughness={0.95} />
      </mesh>
      {[-1, 1].flatMap((a) =>
        [-1, 1].map((b) => (
          <mesh key={`${a}${b}`} position={[a * 2.1, 2.6, b * 2.1]}>
            <cylinderGeometry args={[0.16, 0.18, 4.2, 10]} />
            <meshStandardMaterial color="#8a1c1c" roughness={0.6} />
          </mesh>
        ))
      )}
      <mesh position={[0, 4.6, 0]}>
        <boxGeometry args={[4.8, 0.3, 4.8]} />
        <meshBasicMaterial color="#1fa59a" toneMapped={false} />
      </mesh>
      <mesh geometry={roof} position={[0, 4.7, 0]} scale={[8, 2.6, 8]}>
        <meshStandardMaterial color="#1c1d22" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <boxGeometry args={[4.4, 0.2, 0.2]} />
        <meshStandardMaterial color="#5a1414" />
      </mesh>
      <group ref={bell} position={[0, 4.3, 0]}>
        <mesh geometry={bellGeo} position={[0, -2.6, 0]}>
          <meshStandardMaterial color="#5a4a2a" metalness={0.9} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* 당목: 줄에 매달린 통나무 */}
      <group ref={striker} position={[1.4, 4.3, 0]}>
        {[-0.3, 0.3].map((zz) => (
          <mesh key={zz} position={[0, -1.1, zz]}>
            <cylinderGeometry args={[0.015, 0.015, 2.2, 4]} />
            <meshStandardMaterial color="#c8b080" />
          </mesh>
        ))}
        <mesh position={[0.2, -2.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 1.6, 10]} />
          <meshStandardMaterial color="#6a4a2a" roughness={0.8} />
        </mesh>
      </group>
      <mesh ref={ring} position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.02, 4, 48]} />
        <meshBasicMaterial color="#ffd08a" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------- 석탑: 3층 돌탑과 향 연기 ---------- */
export function StonePagoda() {
  const [x, , z] = PAGODA.pos;
  const stone = "#8a857c";
  const tiers = [
    { y: 1.6, b: 1.5, h: 1.1, r: 2.6 },
    { y: 3.25, b: 1.2, h: 0.75, r: 2.2 },
    { y: 4.55, b: 0.95, h: 0.6, r: 1.85 },
  ];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[3.4, 0.8, 3.4]} />
        <meshStandardMaterial color={stone} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[2.4, 0.3, 2.4]} />
        <meshStandardMaterial color={stone} roughness={0.95} />
      </mesh>
      {tiers.map((t, i) => (
        <group key={i} position={[0, t.y, 0]}>
          <mesh position={[0, t.h / 2 - 0.5, 0]}>
            <boxGeometry args={[t.b, t.h, t.b]} />
            <meshStandardMaterial color={stone} roughness={0.95} />
          </mesh>
          <mesh position={[0, t.h - 0.42, 0]}>
            <boxGeometry args={[t.r, 0.18, t.r]} />
            <meshStandardMaterial color="#7a756c" roughness={0.95} />
          </mesh>
          <mesh position={[0, t.h - 0.3, 0]}>
            <boxGeometry args={[t.r * 0.7, 0.12, t.r * 0.7]} />
            <meshStandardMaterial color="#7a756c" roughness={0.95} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.6, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 1.4, 6]} />
        <meshStandardMaterial color="#5a4a2a" metalness={0.7} />
      </mesh>
      {[5.3, 5.6, 5.9].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.13, 0.025, 4, 12]} />
          <meshStandardMaterial color="#5a4a2a" metalness={0.7} />
        </mesh>
      ))}
      {/* 기단 앞의 촛불과 향 */}
      {[-0.6, 0, 0.6].map((cx) => (
        <mesh key={cx} position={[cx, 0.9, 1.75]}>
          <cylinderGeometry args={[0.04, 0.04, 0.2, 6]} />
          <meshBasicMaterial color="#ffd08a" toneMapped={false} />
        </mesh>
      ))}
      <Sparkles count={18} scale={[1.2, 2.5, 0.6]} position={[0, 2.1, 1.75]} size={7} speed={0.25} color="#ccc" opacity={0.25} />
    </group>
  );
}

/* ---------- 전망 망원경 ---------- */
// 어두운 난간 앞에서도 멀리서 찾을 수 있게: 옆에 따뜻한 등 하나, 발밑에 둥근 불빛, 몸체의 금색 테와 렌즈가 은은히 빛난다.
// 망원경을 보러 가는 단계(scope)에서는 남쪽 망원경 발밑의 고리가 퍼지듯 숨 쉬고, 위로 옅은 빛기둥이 선다 (실제 광원은 쓰지 않는다)
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.35, "rgba(255,255,255,0.45)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const SCOPE_WARM = "#ffc46b";
export function Scopes({ onTap }: { onTap: TapFn }) {
  // 남쪽 망원경으로 들여다보는 동안(시야가 좁아진 동안)에는 망원경 몸체가 시야를 가리지 않게 감춘다 (눈 자리가 몸체 바로 뒤라서)
  const south = useRef<THREE.Group>(null);
  const glow = useMemo(glowTexture, []);
  useLayoutEffect(() => () => glow.dispose(), [glow]);
  const beacon = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const column = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    if (south.current) south.current.visible = gaze.zoom === 1;
    const on = route.phase === "scope";
    if (beacon.current) beacon.current.visible = on;
    if (!on) return;
    // 고리가 망원경 발밑에서 바깥으로 퍼지며 옅어진다 (2초에 한 번)
    const k = (st.clock.elapsedTime % 2) / 2;
    if (ring.current) ring.current.scale.setScalar(0.6 + k * 1.6);
    if (ringMat.current) ringMat.current.opacity = 0.7 * (1 - k);
    if (column.current) column.current.opacity = 0.16 + Math.sin(st.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <group>
      {SCOPES.map((s, i) => (
        <Tap key={i} id={`scope-${i}`} onTap={onTap}>
          <group ref={i === 0 ? south : undefined} position={s.pos} rotation={[0, s.rotY, 0]}>
            <mesh position={[0, 0.55, 0]}>
              <cylinderGeometry args={[0.06, 0.12, 1.1, 8]} />
              <meshStandardMaterial color="#3a3d44" metalness={0.7} roughness={0.4} emissive="#3a2a10" emissiveIntensity={0.6} />
            </mesh>
            <group position={[0, 1.25, 0]} rotation={[-0.15, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.42, 0.28, 0.32]} />
                <meshStandardMaterial color="#e2b836" metalness={0.4} roughness={0.45} emissive="#b8860b" emissiveIntensity={0.55} />
              </mesh>
              {/* 금색 테 */}
              <mesh position={[0, 0.145, 0]}>
                <boxGeometry args={[0.44, 0.015, 0.34]} />
                <meshBasicMaterial color="#ffe08a" toneMapped={false} />
              </mesh>
              {[-0.1, 0.1].map((x) => (
                <mesh key={x} position={[x, 0.02, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.07, 0.08, 0.32, 10]} />
                  <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
                </mesh>
              ))}
              {/* 바깥을 향한 대물렌즈: 하늘빛이 비친다 */}
              <mesh position={[0, 0.0, -0.165]}>
                <circleGeometry args={[0.1, 20]} />
                <meshBasicMaterial color="#8fe3ff" toneMapped={false} side={THREE.DoubleSide} />
              </mesh>
            </group>
            {/* 옆의 낮은 등: 기둥과 따뜻한 갓 */}
            <group position={[1.15, 0, -0.45]}>
              <mesh position={[0, 1.1, 0]}>
                <cylinderGeometry args={[0.035, 0.05, 2.2, 6]} />
                <meshStandardMaterial color="#2a2c31" metalness={0.8} roughness={0.4} />
              </mesh>
              <mesh position={[0, 2.28, 0]}>
                <coneGeometry args={[0.22, 0.16, 12, 1, true]} />
                <meshStandardMaterial color="#2a2c31" metalness={0.8} roughness={0.4} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, 2.18, 0]}>
                <sphereGeometry args={[0.09, 12, 8]} />
                <meshBasicMaterial color="#fff0c8" toneMapped={false} />
              </mesh>
              <sprite position={[0, 2.18, 0]} scale={[1.2, 1.2, 1]}>
                <spriteMaterial map={glow} color={SCOPE_WARM} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
              </sprite>
            </group>
            {/* 발밑의 둥근 불빛 */}
            <mesh position={[0.5, 0.03, -0.2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
              <planeGeometry args={[4.2, 4.2]} />
              <meshBasicMaterial map={glow} color={SCOPE_WARM} transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </mesh>
            {i === 0 && (
              <group ref={beacon} visible={false}>
                <mesh ref={ring} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
                  <ringGeometry args={[0.9, 1.0, 40]} />
                  <meshBasicMaterial ref={ringMat} color="#ffd98a" transparent depthWrite={false} toneMapped={false} />
                </mesh>
                <mesh position={[0, 4, 0]}>
                  <cylinderGeometry args={[0.35, 0.6, 8, 16, 1, true]} />
                  <meshBasicMaterial ref={column} color={SCOPE_WARM} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
              </group>
            )}
          </group>
        </Tap>
      ))}
    </group>
  );
}

/* ---------- 우산 장수 맞은편: 똑같은 자세로 굳어 있는 기계 복제품 ---------- */
export function VendorReplica() {
  const { pos, rotY } = CITY_NPCS.vendor;
  return (
    <group>
      <Human position={[-pos[0], 0, pos[2]]} rotationY={-rotY} color="#6a6d74" skin="#9aa0a8" visor="#ff2a3d" />
      <group position={[7.2, 0, 5.2]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[2, 0.9, 1.2]} />
          <meshStandardMaterial color="#5a5d64" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[-0.2, 2.6, -1.1]}>
          <coneGeometry args={[1.7, 0.7, 16, 1, true]} />
          <meshStandardMaterial color="#8a8d94" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.2, 1.4, -1.1]}>
          <cylinderGeometry args={[0.025, 0.025, 2.4, 6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>
    </group>
  );
}

// 미사용 경고 방지 (AVENUE, player는 다른 컴포넌트와 공유하는 값)
void AVENUE;
void player;
