"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Lang } from "@/data/site";
import { billboards, ticker } from "./story";
import { AVENUE, BLOCKS, CAMERA_POLES, CITY, CITY_BOUNDS, CITY_NPCS, CROSS, HATCH, QUEUE_X, QUEUE_Z } from "./zones";
import { citizenGeometry, roofGeometry, visorGeometry } from "./models";
import { towerMaterial } from "./towerMaterial";
import { concreteTexture, hazardTexture, signTexture } from "./textures";
import { Human, Tap, useSign, type TapFn } from "./parts";
import { player } from "./Player";

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

/* ---------- 하늘: 위는 검고, 지평선은 스모그에 붉게 물듦 ---------- */
function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vP; void main(){
          float h = vP.y;
          vec3 top = vec3(0.012,0.014,0.03);
          vec3 mid = vec3(0.06,0.05,0.08);
          vec3 hor = vec3(0.22,0.07,0.09);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h));
          c = mix(c, top, smoothstep(0.18, 0.6, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
      }),
    []
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={mat} renderOrder={-1}>
      <sphereGeometry args={[400, 32, 16]} />
    </mesh>
  );
}

/* ---------- 빌딩 숲 ---------- */
type Tower = { x: number; z: number; w: number; d: number; h: number };
function useTowers() {
  return useMemo(() => {
    const r = rng(11);
    const towers: Tower[] = [];
    const roofs: Tower[] = [];
    const eaves: Tower[] = []; // 기와지붕을 얹을 자리
    const add = (x: number, z: number, w: number, d: number, h: number) => {
      // 위로 갈수록 좁아지는 2~3단
      let y = 0;
      let cw = w;
      let cd = d;
      const tiers = h > 40 ? 3 : h > 22 ? 2 : 1;
      const hanok = r() < 0.55;
      for (let i = 0; i < tiers; i++) {
        const th = i === tiers - 1 ? h - y : h * (0.45 + r() * 0.2) - y * 0.3;
        towers.push({ x, z, w: cw, d: cd, h: th + y });
        if (hanok) eaves.push({ x, z, w: cw * 1.22, d: cd * 1.22, h: th + y });
        y += th;
        cw *= 0.62 + r() * 0.2;
        cd *= 0.62 + r() * 0.2;
      }
      roofs.push({ x, z, w: cw, d: cd, h: y });
    };
    for (const b of BLOCKS) {
      const lot = 11;
      for (let x = b.x0 + lot / 2; x < b.x1; x += lot) {
        for (let z = b.z0 + lot / 2; z < b.z1; z += lot) {
          const w = Math.min(lot - 1.2, b.x1 - x + lot / 2 - 0.6) * (0.75 + r() * 0.25);
          const d = Math.min(lot - 1.2, b.z1 - z + lot / 2 - 0.6) * (0.75 + r() * 0.25);
          if (w < 3 || d < 3) continue;
          const nearAvenue = Math.abs(x) < 24;
          const h = (nearAvenue ? 24 : 14) + r() * r() * (nearAvenue ? 80 : 60);
          add(x, z, w, d, h);
        }
      }
    }
    // 경계 바깥의 먼 스카이라인
    for (let i = 0; i < 120; i++) {
      const a = r() * Math.PI * 2;
      const dist = 90 + r() * 90;
      const x = Math.cos(a) * dist;
      const z = Math.sin(a) * dist - 30;
      if (Math.abs(x) < 26 && z < -150) continue; // 관리 타워 앞은 비움
      add(x, z, 8 + r() * 12, 8 + r() * 12, 30 + r() * r() * 110);
    }
    return { towers, roofs, eaves };
  }, []);
}

function Towers() {
  const { towers, roofs, eaves } = useTowers();
  const roofGeo = roofGeometry();
  const eaveRef = useRef<THREE.InstancedMesh>(null);
  const trimRef = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => towerMaterial(), []);
  const body = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  const antennas = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    towers.forEach((t, i) => {
      tmpM.compose(tmpV.set(t.x, t.h / 2, t.z), tmpQ.identity(), tmpS.set(t.w, t.h, t.d));
      body.current!.setMatrixAt(i, tmpM);
    });
    body.current!.instanceMatrix.needsUpdate = true;
    roofs.forEach((t, i) => {
      tmpM.compose(tmpV.set(t.x + t.w * 0.3, t.h + 3, t.z), tmpQ.identity(), tmpS.set(0.25, 6, 0.25));
      antennas.current!.setMatrixAt(i, tmpM);
      tmpM.compose(tmpV.set(t.x + t.w * 0.3, t.h + 6.1, t.z), tmpQ.identity(), tmpS.set(0.5, 0.5, 0.5));
      lights.current!.setMatrixAt(i, tmpM);
    });
    antennas.current!.instanceMatrix.needsUpdate = true;
    eaves.forEach((t, i) => {
      const rh = Math.min(t.w, t.d) * 0.32;
      tmpM.compose(tmpV.set(t.x, t.h - 0.05, t.z), tmpQ.identity(), tmpS.set(t.w, rh, t.d));
      eaveRef.current!.setMatrixAt(i, tmpM);
      // 처마 밑 단청 띠 (청록)
      tmpM.compose(tmpV.set(t.x, t.h - 0.25, t.z), tmpQ.identity(), tmpS.set(t.w * 0.72, 0.4, t.d * 0.72));
      trimRef.current!.setMatrixAt(i, tmpM);
    });
    eaveRef.current!.instanceMatrix.needsUpdate = true;
    trimRef.current!.instanceMatrix.needsUpdate = true;
    lights.current!.instanceMatrix.needsUpdate = true;
  }, [towers, roofs, eaves]);

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

/* ---------- 바닥, 인도, 차선 ---------- */
function Ground() {
  const curb = useMemo(() => {
    const t = concreteTexture(4, 70);
    t.repeat.set(20, 1);
    return t;
  }, []);
  const dashes = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = 26; z > -90; z -= 6) out.push([0, z]);
    return out;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]} receiveShadow>
        <planeGeometry args={[260, 300]} />
        <meshStandardMaterial color="#0c0d11" roughness={0.22} metalness={0.75} />
      </mesh>
      {/* 블록 가장자리의 인도 */}
      {BLOCKS.map((b, i) => (
        <mesh key={i} position={[(b.x0 + b.x1) / 2, 0.08, (b.z0 + b.z1) / 2]}>
          <boxGeometry args={[b.x1 - b.x0 + 4, 0.16, b.z1 - b.z0 + 4]} />
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
    </group>
  );
}

/* ---------- 경계 벽과 검문소 ---------- */
function Walls({ lang }: { lang: Lang }) {
  const tex = useMemo(() => {
    const t = concreteTexture(9, 52);
    t.repeat.set(30, 3);
    return t;
  }, []);
  const hazard = useMemo(() => {
    const t = hazardTexture();
    t.repeat.set(40, 1);
    return t;
  }, []);
  const gateSign = useSign(
    [
      [lang === "ko" ? "통제 구역" : "RESTRICTED", 1.3],
      [lang === "ko" ? "점수 900 미만 시민 출입 불가" : "CITIZENS BELOW SCORE 900 MAY NOT PASS", 0.6],
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
  const { x0, x1, z0, z1 } = CITY_BOUNDS;
  const H = 14;
  return (
    <group>
      {[
        [x0 - 0.5, (z0 + z1) / 2, 1, z1 - z0],
        [x1 + 0.5, (z0 + z1) / 2, 1, z1 - z0],
        [0, z1 + 0.5, x1 - x0, 1],
      ].map(([x, z, w, d], i) => (
        <group key={i}>
          <mesh position={[x, H / 2, z]}>
            <boxGeometry args={[w, H, d]} />
            <meshStandardMaterial map={tex} color="#4a4a50" roughness={0.9} />
          </mesh>
          <mesh position={[x, 1.2, z]}>
            <boxGeometry args={[w + 0.05, 0.6, d + 0.05]} />
            <meshStandardMaterial map={hazard} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* 검문소: 레이저를 두른 성문 */}
      <group position={[0, 0, z0 + 0.5]}>
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

/* ---------- 관리 탑: 여러 겹 지붕을 얹은 탑 꼭대기의 거대한 눈 ---------- */
function Overseer() {
  const eye = useRef<THREE.Group>(null);
  const iris = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const roof = roofGeometry();
  const tiers = useMemo(() => {
    const out: { y: number; w: number; h: number }[] = [];
    let y = 0;
    let w = 46;
    for (let i = 0; i < 6; i++) {
      const h = i === 0 ? 26 : 16 - i;
      out.push({ y, w, h });
      y += h;
      w *= 0.8;
    }
    return out;
  }, []);
  const top = tiers[tiers.length - 1].y + tiers[tiers.length - 1].h;
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    eye.current?.lookAt(player.pos);
    if (iris.current) iris.current.color.setRGB(1, 0.08 + Math.sin(t * 1.3) * 0.05, 0.12);
    if (ringMat.current) ringMat.current.opacity = 0.35 + Math.sin(t * 0.8) * 0.15;
  });
  return (
    <group position={[0, 0, -175]}>
      {tiers.map((t, i) => (
        <group key={i} position={[0, t.y, 0]}>
          <mesh position={[0, t.h / 2, 0]}>
            <boxGeometry args={[t.w * 0.78, t.h, t.w * 0.78]} />
            <meshStandardMaterial color="#120f12" metalness={0.7} roughness={0.4} emissive="#200407" emissiveIntensity={0.7} fog={false} />
          </mesh>
          {/* 층마다 붉은 창 띠 */}
          <mesh position={[0, t.h * 0.55, 0]}>
            <boxGeometry args={[t.w * 0.79, t.h * 0.12, t.w * 0.79]} />
            <meshBasicMaterial color="#ff1030" toneMapped={false} fog={false} />
          </mesh>
          <mesh geometry={roof} position={[0, t.h - 0.5, 0]} scale={[t.w * 1.05, t.w * 0.22, t.w * 1.05]}>
            <meshStandardMaterial color="#0d0d10" metalness={0.6} roughness={0.35} emissive="#16080a" fog={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, top + 12, 0]}>
        <cylinderGeometry args={[0.6, 1.4, 24, 8]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.3} fog={false} />
      </mesh>
      <group ref={eye} position={[0, top + 22, 0]}>
        <mesh>
          <sphereGeometry args={[10, 32, 24]} />
          <meshStandardMaterial color="#d8d4cf" roughness={0.2} metalness={0.1} emissive="#3a2a2a" emissiveIntensity={0.6} fog={false} />
        </mesh>
        <mesh position={[0, 0, 9.3]}>
          <circleGeometry args={[4.8, 48]} />
          <meshBasicMaterial ref={iris} color="#ff1030" toneMapped={false} fog={false} />
        </mesh>
        <mesh position={[0, 0, 9.7]}>
          <circleGeometry args={[2.2, 32]} />
          <meshBasicMaterial color="#000" fog={false} />
        </mesh>
        <mesh position={[1.5, 1.5, 9.9]}>
          <circleGeometry args={[0.6, 16]} />
          <meshBasicMaterial color="#fff" fog={false} />
        </mesh>
      </group>
      <mesh position={[0, top + 22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[16, 0.5, 8, 64]} />
        <meshBasicMaterial ref={ringMat} color="#ff1030" transparent toneMapped={false} fog={false} />
      </mesh>
      <pointLight position={[0, top, 30]} intensity={3000} distance={260} color="#ff2030" />
    </group>
  );
}

/* ---------- 세로 한글 간판: 건물 벽에서 길 쪽으로 튀어나옴 ---------- */
const SIGN_WORDS = ["기억수리", "감정대여", "동의센터", "해장국", "점수상담", "꿈판매", "전당포", "로봇수리", "인력사무소", "만두", "여관", "신경칩", "노래방", "약국", "환불불가", "족발", "PC방", "부적"];
const SIGN_COLORS = ["#ff2a4d", "#22f0ff", "#ffe14d", "#7dff7a", "#ff2bd6", "#ff8a2a", "#a77bff", "#ffffff"];

function VerticalSigns() {
  const signs = useMemo(() => {
    const r = rng(23);
    const out: { pos: [number, number, number]; h: number; word: string; color: string; flip: boolean }[] = [];
    let k = 0;
    for (const b of BLOCKS) {
      if (b.x1 < -AVENUE - 2.5 && b.x1 > -AVENUE - 3) {
        /* 왼쪽 블록 */
      }
      const edgeX = b.x0 > 0 ? b.x0 - 2 : b.x1 + 2; // 인도 끝
      const side = b.x0 > 0 ? 1 : -1;
      for (let z = b.z1 - 3; z > b.z0 + 2; z -= 5 + r() * 4) {
        const word = SIGN_WORDS[k % SIGN_WORDS.length];
        const h = 1.1 * word.length + 0.6;
        out.push({ pos: [edgeX + side * 0.2, 3.2 + r() * 7 + h / 2, z], h, word, color: SIGN_COLORS[k % SIGN_COLORS.length], flip: side < 0 });
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
      const dead = i % 7 === 3 && Math.sin(t * 17 + i) > 0.6;
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

/* ---------- 청사초롱 줄과 엉킨 전깃줄 ---------- */
function Lanterns() {
  const { lanterns, wires } = useMemo(() => {
    const lanterns: THREE.Vector3[] = [];
    const wires: THREE.TubeGeometry[] = [];
    const r = rng(31);
    const rows = [18, 10, 2, -8, -18, -44, -52, -78, -84];
    rows.forEach((z, i) => {
      const y = 7 + (i % 3) * 1.4;
      const sag = 1.4 + r();
      const a = new THREE.Vector3(-AVENUE - 2, y, z);
      const b = new THREE.Vector3(AVENUE + 2, y + (r() - 0.5), z + (r() - 0.5) * 3);
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= sag;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      wires.push(new THREE.TubeGeometry(curve, 20, 0.03, 4, false));
      if (i % 2 === 0) for (let k = 1; k < 10; k++) lanterns.push(curve.getPoint(k / 10).add(new THREE.Vector3(0, -0.45, 0)));
      // 전깃줄 몇 가닥 더
      for (let w = 0; w < 2; w++) {
        const a2 = a.clone().add(new THREE.Vector3(0, 1 + w * 0.7 + r(), (r() - 0.5) * 4));
        const b2 = b.clone().add(new THREE.Vector3(0, 0.5 + r() * 1.5, (r() - 0.5) * 4));
        const m2 = a2.clone().lerp(b2, 0.5);
        m2.y -= 1 + r() * 1.5;
        wires.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a2, m2, b2), 20, 0.022, 4, false));
      }
    });
    return { lanterns, wires };
  }, []);
  const body = useRef<THREE.InstancedMesh>(null);
  const cap = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    lanterns.forEach((p, i) => {
      tmpM.compose(p, tmpQ.identity(), tmpS.set(1, 1, 1));
      body.current!.setMatrixAt(i, tmpM);
      tmpM.compose(tmpV.copy(p).add(new THREE.Vector3(0, 0.26, 0)), tmpQ.identity(), tmpS.set(1, 1, 1));
      cap.current!.setMatrixAt(i, tmpM);
    });
    body.current!.instanceMatrix.needsUpdate = true;
    cap.current!.instanceMatrix.needsUpdate = true;
  }, [lanterns]);
  return (
    <group>
      {wires.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#050506" />
        </mesh>
      ))}
      {/* 홍색 몸통, 청색 위 덮개 */}
      <instancedMesh ref={body} args={[undefined, undefined, lanterns.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.2, 0.2, 0.42, 10]} />
        <meshBasicMaterial color="#ff3a3a" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={cap} args={[undefined, undefined, lanterns.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.12, 0.21, 0.12, 10]} />
        <meshBasicMaterial color="#2a5cff" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ---------- 전광판 ---------- */
function Billboards({ lang }: { lang: Lang }) {
  const spots = useMemo(() => {
    // 큰길 쪽 블록 벽면 (x = ±(AVENUE+2))
    const out: { pos: [number, number, number]; rotY: number; w: number; h: number }[] = [];
    const zs = [6, -12, -44, -52, -78];
    zs.forEach((z, i) => {
      const s = i % 2 ? 1 : -1;
      out.push({ pos: [s * (AVENUE + 1.85), 9 + (i % 3) * 4, z], rotY: (-s * Math.PI) / 2, w: 11, h: 5.5 });
    });
    out.push({ pos: [AVENUE + 1.85, 7, 0], rotY: -Math.PI / 2, w: 7, h: 3.5 });
    out.push({ pos: [-(AVENUE + 1.85), 20, -20], rotY: Math.PI / 2, w: 6, h: 12 });
    out.push({ pos: [AVENUE + 1.85, 22, -30 + 4], rotY: -Math.PI / 2, w: 6, h: 12 });
    return out;
  }, []);
  const textures = useMemo(
    () =>
      spots.map((s, i) => {
        const b = billboards[i % billboards.length];
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
      const g = Math.sin(t * 9 + i * 7) > 0.995 ? 0.3 : 1;
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
      const d = Math.hypot(player.pos.x - x, player.pos.z - z);
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
      Array.from({ length: 6 }, (_, i) => ({
        cx: (i % 2 ? 1 : -1) * (2 + (i % 3) * 3),
        cz: -10 - i * 13,
        r: 6 + (i % 3) * 3,
        y: 13 + (i % 3) * 4,
        speed: 0.25 + (i % 4) * 0.08,
        phase: i * 1.7,
      })),
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
      g.position.set(d.cx + Math.cos(a) * d.r, d.y + Math.sin(t * 1.3 + i) * 0.4, d.cz + Math.sin(a) * d.r);
      g.rotation.y = -a;
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
        ([x, z]) => !(x === CITY_NPCS.whisper.pos[0] && z === CITY_NPCS.whisper.pos[2])
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
function Patrol({ onTap }: { onTap: TapFn }) {
  const ref = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const item = CITY.items.find((i) => i.id === "patrol")!;
  const st = useRef({ z: -10, dir: -1 });
  useFrame((s, dt) => {
    const g = ref.current;
    if (!g) return;
    const near = Math.hypot(player.pos.x - g.position.x, player.pos.z - g.position.z) < 4;
    const t = s.clock.elapsedTime;
    if (!near) {
      st.current.z += st.current.dir * dt * 1.6;
      if (st.current.z < -84) st.current.dir = 1;
      if (st.current.z > 12) st.current.dir = -1;
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, st.current.dir < 0 ? 0 : Math.PI, 0.05);
      const sw = Math.sin(t * 5) * 0.4;
      if (legL.current) legL.current.rotation.x = sw;
      if (legR.current) legR.current.rotation.x = -sw;
    } else {
      // 멈춰서 플레이어를 바라봄 (모델 정면은 -z)
      const a = Math.atan2(g.position.x - player.pos.x, g.position.z - player.pos.z);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, a, 0.1);
    }
    g.position.set(6.2, 0, st.current.z);
    item.pos.set(6.2, 2, st.current.z);
  });
  return (
    <Tap id="patrol" onTap={onTap}>
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
        <pointLight position={[0, 2.8, -0.8]} intensity={4} distance={5} color="#ff1030" />
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
  useFrame(() => {
    const near = Math.hypot(player.pos.x - pos[0], player.pos.z - pos[2]) < 3;
    if (head.current) head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, near ? 0.9 : Math.PI, 0.04);
  });
  return (
    <Tap id="whisper" onTap={onTap}>
      <group ref={head} position={pos} rotation={[0, Math.PI, 0]}>
        <Human position={[0, 0, 0]} color="#5f626b" skin="#c0b4aa" visor="#7dff7a" />
      </group>
    </Tap>
  );
}

/* ---------- 방공호 입구 (배전실로 위장) ---------- */
function Hatch({ lang, onTap }: { lang: Lang; onTap: TapFn }) {
  const sign = useSign([[lang === "ko" ? "배전실 7-B" : "SUBSTATION 7-B", 1], ["⚡ DANGER · 고압 주의", 0.6]], { color: "#e8e2c8", bg: "#1a1a14", w: 512, h: 200, border: true });
  const tex = useMemo(() => {
    const t = concreteTexture(15, 60);
    t.repeat.set(2, 1);
    return t;
  }, []);
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    if (lamp.current) lamp.current.color.setRGB(0.2, 1, 0.5).multiplyScalar(0.6 + Math.sin(s.clock.elapsedTime * 2) * 0.4);
  });
  const [x, , z] = HATCH.pos;
  return (
    <Tap id="hatch" onTap={onTap}>
      <group position={[x, 0, z + 0.5]}>
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[5.4, 3.2, 4.2]} />
          <meshStandardMaterial map={tex} color="#77756e" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.3, 0]}>
          <boxGeometry args={[5.8, 0.2, 4.6]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.15, -2.11]}>
          <boxGeometry args={[1.4, 2.3, 0.05]} />
          <meshStandardMaterial color="#3a4a3a" metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.75, -2.12]}>
          <planeGeometry args={[2.4, 0.9]} />
          <meshBasicMaterial map={sign} />
        </mesh>
        <mesh position={[0.9, 2.45, -2.13]}>
          <circleGeometry args={[0.07, 12]} />
          <meshBasicMaterial ref={lamp} color="#3f8" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 2.6, -3]} intensity={6} distance={7} color="#66ff99" />
      </group>
    </Tap>
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
      <fog attach="fog" args={["#140c12", 12, 120]} />
      <Sky />
      <ambientLight intensity={0.3} color="#8a90b0" />
      <hemisphereLight args={["#3a3050", "#05050a", 0.5]} />
      <directionalLight position={[-30, 60, 20]} intensity={0.25} color="#8aa0ff" />
      <pointLight position={[0, 6, 14]} intensity={30} distance={26} color="#22f0ff" />
      <pointLight position={[0, 8, -40]} intensity={40} distance={30} color="#ff2bd6" />
      <Towers />
      <Ground />
      <Walls lang={lang} />
      <Overseer />
      <Billboards lang={lang} />
      <VerticalSigns />
      <Lanterns />
      <Gantry lang={lang} />
      <Cameras onTracked={onTracked} />
      <Lamps />
      <Drones />
      <Queue />
      <Marchers />
      <Patrol onTap={onTap} />
      <Vendor onTap={onTap} />
      <Whisper onTap={onTap} />
      <Hatch lang={lang} onTap={onTap} />
      <CookieHolo />
      <Rain />
      <Sparkles count={40} scale={[4, 3, 4]} position={[-5, 1.2, -20]} size={8} speed={0.4} color="#888" opacity={0.25} />
      <Sparkles count={40} scale={[4, 3, 4]} position={[5, 1.2, -56]} size={8} speed={0.4} color="#888" opacity={0.25} />
    </group>
  );
}
