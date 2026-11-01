"use client";

// 하늘 도시의 바깥 풍경: 하늘, 구름 바다, 도시를 받친 판과 난간, 떠 있는 섬, 다리,
// 쌍둥이 기계 불상, 섬 사이를 흐르는 비행 차량, 머리 위를 지나가는 거대한 사원 비행선.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { BUDDHAS, EDGE, ISLANDS, OVERSEER_ISLAND } from "./zones";
import { roofGeometry } from "./models";
import { player } from "./Player";

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpE = new THREE.Euler();

/* ---------- 하늘: 위는 검고, 지평선은 붉고, 발밑은 구름 빛 ---------- */
export function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vP;
        float h31(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){
          float h = vP.y;
          vec3 top = vec3(0.012,0.014,0.035);
          vec3 mid = vec3(0.07,0.05,0.09);
          vec3 hor = vec3(0.26,0.08,0.10);
          vec3 below = vec3(0.12,0.06,0.10);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.16, h));
          c = mix(c, top, smoothstep(0.16, 0.6, h));
          if (h < 0.0) c = mix(hor, below, smoothstep(0.0, -0.2, h));
          // 별 몇 개
          vec3 q = floor(vP * 220.0);
          float st = step(0.9975, h31(q)) * smoothstep(0.15, 0.5, h);
          c += st * 0.7;
          // 낮게 뜬 창백한 달
          vec3 md = normalize(vec3(-0.55, 0.16, -0.8));
          float d = dot(vP, md);
          c += vec3(0.95,0.85,0.8) * smoothstep(0.9988, 0.9992, d);
          c += vec3(0.5,0.25,0.25) * pow(max(d,0.0), 180.0) * 0.6;
          gl_FragColor = vec4(c, 1.0);
        }`,
      }),
    []
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={mat} renderOrder={-1}>
      <sphereGeometry args={[480, 32, 16]} />
    </mesh>
  );
}

/* ---------- 발밑의 구름 바다 ---------- */
export function CloudSea() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `varying vec3 vW; uniform float uTime;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.03; a*=0.5; } return s; }
        void main(){
          vec2 p = vW.xz * 0.006 + vec2(uTime*0.004, uTime*0.002);
          float n = fbm(p + fbm(p*1.7));
          float r = length(vW.xz - vec2(0.0,-30.0));
          vec3 dark = vec3(0.07,0.04,0.08);
          vec3 lit = vec3(0.42,0.18,0.24);
          vec3 c = mix(dark, lit, smoothstep(0.35, 0.85, n));
          // 도시 바로 밑은 도시 불빛이 비쳐 더 밝다
          c += vec3(0.25,0.08,0.18) * exp(-r*r/22000.0);
          float a = 1.0 - smoothstep(500.0, 1300.0, r);
          gl_FragColor = vec4(c, a);
        }`,
      }),
    []
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
  });
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -110, -30]} renderOrder={-1}>
      <planeGeometry args={[2800, 2800, 1, 1]} />
    </mesh>
  );
}

/* ---------- 섬 밑동: 아래로 뾰족한 바위와 기계 ---------- */
function Underside({ r, depth, lights = 16 }: { r: number; depth: number; lights?: number }) {
  return (
    <group>
      <mesh position={[0, -depth / 2 - 2.5, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[r, depth, 10, 3]} />
        <meshStandardMaterial color="#1a1618" roughness={0.95} metalness={0.2} flatShading />
      </mesh>
      {/* 밑동에 박힌 불빛 */}
      {Array.from({ length: lights }, (_, i) => {
        const a = (i / lights) * Math.PI * 2;
        const k = 0.35 + (i % 3) * 0.18;
        return (
          <mesh key={i} position={[Math.cos(a) * r * (1 - k) * 0.95, -2.5 - depth * k, Math.sin(a) * r * (1 - k) * 0.95]}>
            <sphereGeometry args={[0.6 + (i % 2) * 0.4, 6, 4]} />
            <meshBasicMaterial color={i % 4 === 0 ? "#ff2a3d" : "#ffb070"} toneMapped={false} />
          </mesh>
        );
      })}
      {/* 맨 아래 추진기 */}
      <mesh position={[0, -depth - 2.6, 0]}>
        <sphereGeometry args={[r * 0.08, 12, 8]} />
        <meshBasicMaterial color="#22f0ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, -depth - 2.6 - r * 0.4, 0]}>
        <coneGeometry args={[r * 0.18, r * 0.8, 16, 1, true]} />
        <meshBasicMaterial color="#22f0ff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ---------- 도시를 받친 판, 가장자리 난간 ---------- */
export function Platform() {
  const W = EDGE.x * 2 + 2;
  const D = EDGE.z1 - EDGE.z0 + 2;
  const cz = (EDGE.z1 + EDGE.z0) / 2;
  // 난간 구간: 북쪽은 성문 자리(|x|<13)를 비운다
  const segs = useMemo(() => {
    const x = EDGE.x;
    return [
      { a: [-x, EDGE.z1], b: [x, EDGE.z1] },
      { a: [-x, EDGE.z0], b: [-13, EDGE.z0] },
      { a: [13, EDGE.z0], b: [x, EDGE.z0] },
      { a: [-x, EDGE.z0], b: [-x, EDGE.z1] },
      { a: [x, EDGE.z0], b: [x, EDGE.z1] },
    ] as { a: [number, number]; b: [number, number] }[];
  }, []);
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    for (const s of segs) {
      const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      const n = Math.round(len / 2.5);
      for (let i = 0; i <= n; i++) out.push([s.a[0] + ((s.b[0] - s.a[0]) * i) / n, s.a[1] + ((s.b[1] - s.a[1]) * i) / n]);
    }
    return out;
  }, [segs]);
  const postRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    posts.forEach(([x, z], i) => {
      tmpM.compose(tmpV.set(x, 0.55, z), tmpQ.identity(), tmpS.set(1, 1, 1));
      postRef.current!.setMatrixAt(i, tmpM);
    });
    postRef.current!.instanceMatrix.needsUpdate = true;
  }, [posts]);
  return (
    <group>
      {/* 판 두께 */}
      <mesh position={[0, -3.02, cz]}>
        <boxGeometry args={[W, 6, D]} />
        <meshStandardMaterial color="#121216" roughness={0.6} metalness={0.7} />
      </mesh>
      {/* 판 옆면의 띠 조명 */}
      {[
        [0, EDGE.z1 + 1, W, 0.2],
        [0, EDGE.z0 - 1, W, 0.2],
        [-EDGE.x - 1, cz, 0.2, D],
        [EDGE.x + 1, cz, 0.2, D],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, -1.2, z]}>
          <boxGeometry args={[w + 0.05, 0.25, d + 0.05]} />
          <meshBasicMaterial color={i < 2 ? "#ff2a3d" : "#22f0ff"} toneMapped={false} />
        </mesh>
      ))}
      <group position={[0, -6, cz]}>
        <group scale={[1, 1, D / W]}>
          <Underside r={W * 0.72} depth={95} lights={28} />
        </group>
      </group>
      {/* 난간 */}
      <instancedMesh ref={postRef} args={[undefined, undefined, posts.length]} frustumCulled={false}>
        <boxGeometry args={[0.1, 1.1, 0.1]} />
        <meshStandardMaterial color="#2a2c33" metalness={0.8} roughness={0.35} />
      </instancedMesh>
      {segs.map((s, i) => {
        const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        const mx = (s.a[0] + s.b[0]) / 2;
        const mz = (s.a[1] + s.b[1]) / 2;
        const rot = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]);
        return (
          <group key={i} position={[mx, 0, mz]} rotation={[0, -rot, 0]}>
            <mesh position={[0, 1.12, 0]}>
              <boxGeometry args={[len, 0.08, 0.16]} />
              <meshStandardMaterial color="#3a3d45" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 1.07, 0.09]}>
              <boxGeometry args={[len, 0.012, 0.012]} />
              <meshBasicMaterial color="#c8801e" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <boxGeometry args={[len, 0.9, 0.03]} />
              <meshStandardMaterial color="#8fd8ff" transparent opacity={0.12} roughness={0.05} metalness={0.2} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ---------- 떠 있는 섬들 (건물은 Towers에서 함께 그림) ---------- */
export function Islands() {
  return (
    <group>
      {[...ISLANDS, { ...OVERSEER_ISLAND, towers: true }].map((it, i) => (
        <group key={i} position={[it.x, it.y, it.z]}>
          <mesh position={[0, -1.25, 0]}>
            <cylinderGeometry args={[it.r, it.r * 0.96, 2.5, 10]} />
            <meshStandardMaterial color="#17151a" roughness={0.8} metalness={0.4} flatShading />
          </mesh>
          <mesh position={[0, -0.6, 0]}>
            <torusGeometry args={[it.r * 0.985, 0.18, 4, 40]} />
            <meshBasicMaterial color={i % 2 ? "#ff2a3d" : "#ffb02e"} toneMapped={false} />
          </mesh>
          <Underside r={it.r} depth={it.r * 1.7} lights={12} />
        </group>
      ))}
    </group>
  );
}

/* ---------- 검문소 너머 관리 탑의 섬으로 이어지는 다리 ---------- */
export function Bridge() {
  const z0 = EDGE.z0 - 1;
  const z1 = OVERSEER_ISLAND.z + OVERSEER_ISLAND.r - 2;
  const len = z0 - z1;
  const lamps = useMemo(() => {
    const out: number[] = [];
    for (let z = z0 - 4; z > z1; z -= 7) out.push(z);
    return out;
  }, [z0, z1]);
  return (
    <group>
      <mesh position={[0, -0.6, (z0 + z1) / 2]}>
        <boxGeometry args={[9, 1.2, len]} />
        <meshStandardMaterial color="#1c1a1e" roughness={0.6} metalness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4.4, 0.5, (z0 + z1) / 2]}>
          <boxGeometry args={[0.15, 1, len]} />
          <meshStandardMaterial color="#5a1418" roughness={0.6} />
        </mesh>
      ))}
      {lamps.flatMap((z) =>
        [-1, 1].map((s) => (
          <group key={`${z}${s}`} position={[s * 4.4, 0, z]}>
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[0.35, 3.2, 0.35]} />
              <meshStandardMaterial color="#6d6a64" roughness={0.9} />
            </mesh>
            <mesh position={[0, 3.4, 0]}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshBasicMaterial color="#ff4a3a" toneMapped={false} />
            </mesh>
          </group>
        ))
      )}
      {/* 다리 밑을 받치는 아치 */}
      {[0.25, 0.5, 0.75].map((k) => (
        <mesh key={k} position={[0, -6, z0 - len * k]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[6, 0.6, 6, 20, Math.PI]} />
          <meshStandardMaterial color="#1c1a1e" roughness={0.7} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 쌍둥이 기계 불상: 양쪽 섬에서 똑같은 자세로 큰길을 내려다본다 ---------- */
function Buddha({ flip }: { flip: boolean }) {
  const urna = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.Group>(null);
  const bronze = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3b3328", metalness: 0.85, roughness: 0.38, emissive: "#140c06" }), []);
  const seam = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffb02e", toneMapped: false }), []);
  const petals = useMemo(() => Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2), []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (urna.current) urna.current.color.setRGB(1, 0.06 + Math.sin(t * 0.9) * 0.04, 0.1).multiplyScalar(1.2 + Math.sin(t * 0.9) * 0.4);
    if (halo.current) halo.current.rotation.z = t * 0.05 * (flip ? -1 : 1);
  });
  return (
    // 정면(+z)이 도시 쪽(x=0)을 향하도록
    <group rotation={[0, flip ? Math.PI / 2 : -Math.PI / 2, 0]} scale={1.15}>
      {/* 연꽃 대좌 */}
      <mesh position={[0, 3, 0]} material={bronze}>
        <cylinderGeometry args={[24, 27, 6, 16]} />
      </mesh>
      {petals.map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 23, 7, Math.cos(a) * 23]} rotation={[0.5 * Math.cos(0), a, 0]}>
          <sphereGeometry args={[5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#4a2a2e" metalness={0.6} roughness={0.4} emissive="#3a0a18" />
        </mesh>
      ))}
      {/* 가부좌한 다리 */}
      <mesh position={[0, 12, 2]} scale={[22, 7, 14]} material={bronze}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      {/* 몸통 (층마다 이음매가 빛나는 기계) */}
      <mesh position={[0, 26, -1]} material={bronze}>
        <cylinderGeometry args={[8.5, 11, 24, 20]} />
      </mesh>
      {[18, 24, 30].map((y) => (
        <mesh key={y} position={[0, y, -1]} rotation={[Math.PI / 2, 0, 0]} material={seam}>
          <torusGeometry args={[11 - (y - 14) * 0.1, 0.15, 4, 40]} />
        </mesh>
      ))}
      <mesh position={[0, 37, -1]} scale={[14, 5, 8.5]} material={bronze}>
        <sphereGeometry args={[1, 20, 12]} />
      </mesh>
      {/* 선정인: 배 앞에 모은 손 */}
      <mesh position={[0, 17, 9]} scale={[7, 2.2, 4]} material={bronze}>
        <sphereGeometry args={[1, 16, 10]} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 12, 26, 2]} rotation={[0.5, 0, k * 0.35]} scale={[3.2, 12, 3.2]} material={bronze}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      ))}
      {/* 머리 */}
      <mesh position={[0, 47, 0]} scale={[7, 8.4, 7.4]} material={bronze}>
        <sphereGeometry args={[1, 28, 20]} />
      </mesh>
      <mesh position={[0, 55.5, -0.5]} material={bronze}>
        <sphereGeometry args={[3.6, 16, 12]} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 7, 45, 0]} scale={[1.1, 4.4, 1.6]} material={bronze}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
      ))}
      {/* 반쯤 감은 눈 */}
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 2.6, 47.6, 7.05]} rotation={[0, k * 0.25, 0]}>
          <boxGeometry args={[2.4, 0.18, 0.2]} />
          <meshBasicMaterial color="#05040a" />
        </mesh>
      ))}
      {/* 백호 자리에 박힌 렌즈 */}
      <mesh position={[0, 50.2, 7.1]}>
        <circleGeometry args={[0.9, 24]} />
        <meshBasicMaterial ref={urna} color="#ff1030" toneMapped={false} fog={false} />
      </mesh>
      {/* 광배: 천천히 도는 두 겹 고리 */}
      <group ref={halo} position={[0, 47, -9]}>
        <mesh>
          <torusGeometry args={[17, 0.5, 6, 64]} />
          <meshBasicMaterial color="#ffb02e" toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[21, 0.25, 6, 64]} />
          <meshBasicMaterial color="#ff2a3d" toneMapped={false} transparent opacity={0.8} />
        </mesh>
        {Array.from({ length: 24 }, (_, i) => (
          <mesh key={i} rotation={[0, 0, (i / 24) * Math.PI * 2]} position={[0, 0, 0]}>
            <boxGeometry args={[0.25, 6, 0.25]} />
            <meshBasicMaterial color="#ffb02e" toneMapped={false} transparent opacity={0.5} />
          </mesh>
        )).map((m, i) => (
          <group key={i} rotation={[0, 0, (i / 24) * Math.PI * 2]}>
            <group position={[0, 19, 0]}>{m}</group>
          </group>
        ))}
      </group>
      <mesh position={[0, 32, -12]}>
        <torusGeometry args={[36, 0.3, 4, 80]} />
        <meshBasicMaterial color="#22f0ff" toneMapped={false} transparent opacity={0.35} />
      </mesh>
      <pointLight position={[0, 50, 30]} intensity={1800} distance={120} color="#ffb070" />
    </group>
  );
}

export function TwinBuddhas() {
  return (
    <group>
      {BUDDHAS.map((b, i) => (
        <group key={i} position={[b.x, b.y, b.z]}>
          <Buddha flip={b.x < 0} />
        </group>
      ))}
    </group>
  );
}

/* ---------- 섬 사이를 같은 간격으로 흐르는 비행 차량 ---------- */
export function AirTraffic() {
  const lanes = useMemo(() => {
    // 대칭으로 짝지은 항로
    const half = [
      { a: [90, 18, 120], b: [90, 18, -260], n: 22 },
      { a: [120, -12, 160], b: [120, -12, -240], n: 18 },
      { a: [70, 46, -260], b: [70, 46, 200], n: 16 },
      { a: [300, 8, -60], b: [80, 8, -60], n: 14 },
    ];
    return half.flatMap((l) => [l, { ...l, a: [-l.a[0], l.a[1], l.a[2]], b: [-l.b[0], l.b[1], l.b[2]] }]);
  }, []);
  const total = lanes.reduce((s, l) => s + l.n * 2, 0);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const c = new THREE.Color();
    let k = 0;
    lanes.forEach((l) => {
      for (let i = 0; i < l.n * 2; i++) ref.current!.setColorAt(k++, c.set(i % 2 ? "#ff3040" : "#e8f4ff"));
    });
    ref.current!.instanceColor!.needsUpdate = true;
  }, [lanes]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    let k = 0;
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    lanes.forEach((l, li) => {
      A.set(l.a[0], l.a[1], l.a[2]);
      B.set(l.b[0], l.b[1], l.b[2]);
      const yaw = Math.atan2(B.x - A.x, B.z - A.z);
      for (let i = 0; i < l.n; i++) {
        // 두 방향: 흰 앞불은 한쪽으로, 붉은 뒷불은 반대쪽으로
        for (let dir = 0; dir < 2; dir++) {
          let u = (i / l.n + t * 0.012 * (1 + (li % 3) * 0.2)) % 1;
          if (dir) u = 1 - u;
          tmpV.copy(A).lerp(B, u);
          tmpV.x += dir ? 3 : -3;
          tmpM.compose(tmpV, tmpQ.setFromEuler(tmpE.set(0, yaw, 0)), tmpS.set(1, 1, 1));
          ref.current?.setMatrixAt(k++, tmpM);
        }
      }
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, total]} frustumCulled={false}>
      <boxGeometry args={[0.9, 0.5, 2.6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* ---------- 거대한 사원 비행선: 기와지붕을 층층이 얹은 선체가 머리 위를 천천히 가로지른다 ---------- */
function Ark({ len }: { len: number }) {
  const roof = roofGeometry();
  const hull = useMemo(() => new THREE.MeshStandardMaterial({ color: "#16141a", metalness: 0.75, roughness: 0.4, emissive: "#0a0608", side: THREE.DoubleSide }), []);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1c1d22", metalness: 0.5, roughness: 0.5, emissive: "#0b1214" }), []);
  const red = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff2a3d", toneMapped: false }), []);
  const teal = useMemo(() => new THREE.MeshBasicMaterial({ color: "#1fa59a", toneMapped: false }), []);
  const amber = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffb02e", toneMapped: false }), []);
  const eye = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (eye.current) eye.current.rotation.x = Math.sin(t * 0.2) * 0.35;
    if (beam.current) ((beam.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(t * 0.7) * 0.015);
  });
  const W = len * 0.22;
  return (
    <group>
      {/* 선체: 길이 방향(z)으로 눕힌 반원기둥, 둥근 쪽이 아래 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[W / 2, 1, W * 0.45]} material={hull}>
        <cylinderGeometry args={[1, 1, len, 18, 1, true, -Math.PI / 2, Math.PI]} />
      </mesh>
      {/* 갑판과 붉은 띠 */}
      <mesh position={[0, 0.2, 0]} material={hull}>
        <boxGeometry args={[W, 0.6, len]} />
      </mesh>
      <mesh position={[0, -0.6, 0]} material={red}>
        <boxGeometry args={[W + 0.4, 0.5, len * 0.98]} />
      </mesh>
      {/* 갑판 위의 전각들: 가운데 높은 탑, 앞뒤로 대칭 */}
      {[-0.32, -0.16, 0, 0.16, 0.32].map((k, i) => {
        const tall = i === 2 ? 3 : i % 2 ? 1 : 2;
        const bw = W * (i === 2 ? 0.7 : 0.55);
        return (
          <group key={k} position={[0, 0.5, k * len]}>
            {Array.from({ length: tall }, (_, j) => {
              const w = bw * Math.pow(0.78, j);
              const y = j * w * 0.5;
              return (
                <group key={j} position={[0, y, 0]}>
                  <mesh position={[0, w * 0.2, 0]} material={hull}>
                    <boxGeometry args={[w * 0.7, w * 0.4, w * 0.7]} />
                  </mesh>
                  <mesh position={[0, w * 0.27, 0]} material={amber}>
                    <boxGeometry args={[w * 0.71, w * 0.05, w * 0.71]} />
                  </mesh>
                  <mesh position={[0, w * 0.38, 0]} material={teal}>
                    <boxGeometry args={[w * 0.75, w * 0.03, w * 0.75]} />
                  </mesh>
                  <mesh geometry={roof} position={[0, w * 0.38, 0]} scale={[w * 1.3, w * 0.32, w * 1.3]} material={roofMat} />
                </group>
              );
            })}
          </group>
        );
      })}
      {/* 고딕 첨탑 두 개 (뱃머리와 꼬리) */}
      {[-0.46, 0.46].map((k) => (
        <mesh key={k} position={[0, W * 0.5, k * len]} material={hull}>
          <coneGeometry args={[W * 0.07, W * 1.1, 4]} />
        </mesh>
      ))}
      {/* 배 밑의 거대한 눈과 탐조등 */}
      <group ref={eye} position={[0, -W * 0.42, 0]}>
        <mesh>
          <sphereGeometry args={[W * 0.12, 20, 14]} />
          <meshStandardMaterial color="#d8d4cf" roughness={0.25} emissive="#2a1a1a" />
        </mesh>
        <mesh position={[0, -W * 0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[W * 0.06, 24]} />
          <meshBasicMaterial color="#ff1030" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={beam} position={[0, -70, 0]}>
          <coneGeometry args={[W * 0.9, 140, 24, 1, true]} />
          <meshBasicMaterial color="#ff9a9a" transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      {/* 선체 옆 둥근 창 + 매달린 연등 */}
      {Array.from({ length: 14 }, (_, i) => (i / 13 - 0.5) * len * 0.85).flatMap((z) =>
        [-1, 1].map((s) => (
          <mesh key={`${z}${s}`} position={[s * (W / 2 + 0.05), -W * 0.12, z]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <circleGeometry args={[W * 0.035, 12]} />
            <meshBasicMaterial color="#ffd08a" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))
      )}
      {/* 꼬리의 추진 고리 */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * W * 0.32, -W * 0.15, -len / 2]}>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[W * 0.1, W * 0.02, 8, 24]} />
            <meshBasicMaterial color="#22f0ff" toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -W * 0.5]}>
            <coneGeometry args={[W * 0.1, W, 16, 1, true]} />
            <meshBasicMaterial color="#22f0ff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// 두 척이 도시 위에서 X자로 교차한다 (서로의 거울상). 한 번 지나가는 데 몇 분이 걸린다.
export function Arks() {
  const paths = useMemo(
    () => [
      { a: new THREE.Vector3(-420, 120, 160), b: new THREE.Vector3(420, 120, -260), len: 240, period: 420, phase: 0 },
      { a: new THREE.Vector3(420, 150, 160), b: new THREE.Vector3(-420, 150, -260), len: 200, period: 420, phase: 0.5 },
      { a: new THREE.Vector3(0, 230, 420), b: new THREE.Vector3(0, 230, -520), len: 320, period: 560, phase: 0.25 },
    ],
    []
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    paths.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      const u = (t / p.period + p.phase) % 1;
      g.position.copy(p.a).lerp(p.b, u);
      g.position.y += Math.sin(t * 0.1 + i) * 2;
      g.rotation.y = Math.atan2(p.b.x - p.a.x, p.b.z - p.a.z);
      g.rotation.z = Math.sin(t * 0.07 + i) * 0.02;
    });
  });
  // 플레이어 위치는 쓰지 않지만, 눈이 아래를 훑는 느낌을 위해 player를 import해 둔다
  void player;
  return (
    <group>
      {paths.map((p, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }}>
          <Ark len={p.len} />
        </group>
      ))}
    </group>
  );
}
