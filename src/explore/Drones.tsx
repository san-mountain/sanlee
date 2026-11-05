"use client";

// 순찰 드론: 레일을 따라 오가며 바닥에 빛 원을 비춘다.
// 빛 원(그림), 빛기둥(그림), 가림 판정, 맞음 판정이 모두 아래의 같은 값(드론 위치·반지름·가림 상자)에서 나온다.
// - 광장·바깥 산책로: 망원경 가는 길. 빛 속에 오래 있으면 식별되어 그 드론 길 앞의 안전한 자리로 돌아간다 (DroneHUD → ExploreClient)
// - 큰길: 빛 속에서는 줄에 섞여 있어도 대자비에게 보이고(gaze.droneLit), 오래 비치면 대자비가 곧장 조준한다.
//   죽음은 언제나 대자비의 레이저 하나뿐이다 (드론에는 따로 죽이는 타이머가 없다)
// - 기록 없이 돌아온 둘(gaze.mood "blind"): 빛은 그대로 훑고, 몸에 닿으면 형체만 감지한다.
//   이 몸을 이을 활동 기록이 없어서 따라가지도, 게이지를 채우지도, 위치를 보내지도 않는다 (drone.shape)
// 그림자를 만드는 조명은 쓰지 않는다: 바닥 원은 셰이더에서 가림 상자를 직접 검사해 그림자 부분을 비운다
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { COVERS, DRONE_R, DRONE_RAILS, ROOFS } from "./zones";
import { coverState } from "./Jabi";
import { gaze } from "./gaze";
import { player } from "./Player";
import { sfx } from "./sfx";

type OBox = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };
// 빛 판정 높이: 바닥 원의 그림자도 같은 높이에서 계산한다 (발밑이 어두우면 안전)
const BODY = 1.0;
const TRACK = 2.4; // 방문자를 따라가는 속도 (걷기 3.4, 달리기 6.2보다 느리다)
const FILL = 70; // 식별 게이지가 차는 속도 (초당). 약 1.4초
const DRAIN = 40;
const LOSE = 0.8; // 이만큼 놓치면 다시 레일을 훑는다
const MAXB = 4;

// 광장의 지붕들 (배송 대기소 처마 등). 지붕이 새로 생기면 zones의 ROOFS에 넣으면 판정과 그림이 같이 따른다
const ROOF_BOXES: OBox[] = ROOFS.map((r) => ({ x0: r.x - r.w / 2, x1: r.x + r.w / 2, y0: r.y0, y1: r.y1, z0: r.z - r.d / 2, z1: r.z + r.d / 2 }));

// 화면 HUD와 ExploreClient가 읽는 드론 상태
export const drone = {
  lit: -1, // 지금 방문자를 비추는 드론 번호
  zone: "" as "" | "plaza" | "avenue",
  meter: 0, // 0~100. 다 차면 식별
  caught: false, // 광장에서 식별됨: ExploreClient가 구간 처음 자리로 돌려보내고 resetDrones를 부른다
  sent: 0, // 큰길에서 식별되어 대자비에게 위치를 보낸 시각 (performance.now)
  shape: false, // 기록 없는 몸에 빛이 닿음: 형체는 감지했지만 이을 활동 기록이 없다
  by: -1, // 식별한 드론 번호 (광장 A=0 / 바깥 산책로 B=1). 돌려보낼 자리를 고를 때 쓴다
};

const st = DRONE_RAILS.map((r) => ({ th: r.phase, x: r.c + r.a * Math.cos(r.phase), track: false, neg: false, lost: 0 }));
const omega = (i: number) => (Math.PI * 2) / DRONE_RAILS[i].period;

export function resetDrones() {
  drone.lit = -1;
  drone.zone = "";
  drone.meter = 0;
  drone.caught = false;
  drone.sent = 0;
  drone.shape = false;
  drone.by = -1;
  gaze.droneLit = false;
  st.forEach((s, i) => {
    if (!s.track) return;
    s.track = false;
    resume(i);
  });
}

// 따라가다 놓친 자리에서 원래 가던 방향으로 다시 훑는다
function resume(i: number) {
  const r = DRONE_RAILS[i];
  const s = st[i];
  const base = Math.acos(THREE.MathUtils.clamp((s.x - r.c) / r.a, -1, 1));
  s.th = s.neg ? base : Math.PI * 2 - base;
}

// 이산이 건너도 되는지: 앞으로 secs초 동안 이 드론의 빛 원이 x 근처에 오지 않는가 (따라가는 중이면 기다린다)
export function laneClear(i: number, x: number, secs: number) {
  const s = st[i];
  if (s.track) return false;
  const r = DRONE_RAILS[i];
  for (let t = 0; t <= secs; t += 0.2) if (Math.abs(r.c + r.a * Math.cos(s.th + omega(i) * t) - x) < DRONE_R + 1.2) return false;
  return true;
}
export const droneAt = (i: number) => ({ x: st[i].x, z: DRONE_RAILS[i].z });
// 골목 입구에서 망원경을 처음 바라볼 때: 앞줄 드론이 inSecs초 뒤 레일 가운데(망원경 가는 길)를 지나가도록 맞춘다
export function presetSweep(i: number, inSecs: number) {
  const s = st[i];
  if (s.track) return;
  s.th = Math.PI / 2 - omega(i) * inSecs;
  const r = DRONE_RAILS[i];
  s.x = r.c + r.a * Math.cos(s.th);
}

// 선분 a→b가 상자를 지나는가 (세 축 슬랩 검사)
function segHits(ax: number, ay: number, az: number, bx: number, by: number, bz: number, b: OBox) {
  let t0 = 0;
  let t1 = 1;
  const A = [ax, ay, az];
  const D = [bx - ax, by - ay, bz - az];
  const MN = [b.x0, b.y0, b.z0];
  const MX = [b.x1, b.y1, b.z1];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(D[k]) < 1e-6) {
      if (A[k] < MN[k] || A[k] > MX[k]) return false;
    } else {
      let ta = (MN[k] - A[k]) / D[k];
      let tb = (MX[k] - A[k]) / D[k];
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) return false;
    }
  }
  return true;
}

// 이 드론의 빛을 가릴 수 있는 상자: 광장·산책로는 배송 대기소 지붕, 큰길은 부서지지 않은 엄폐물 (빛 원 근처만)
function occluders(i: number, out: OBox[]) {
  out.length = 0;
  const r = DRONE_RAILS[i];
  const x = st[i].x;
  if (r.zone === "plaza") {
    for (const b of ROOF_BOXES) {
      if (out.length >= MAXB) break;
      if (b.z0 - r.z > DRONE_R + 4 || r.z - b.z1 > DRONE_R + 4 || b.x0 - x > DRONE_R + 4 || x - b.x1 > DRONE_R + 4) continue;
      out.push(b);
    }
    return out;
  }
  for (let k = 0; k < COVERS.length && out.length < MAXB; k++) {
    const c = COVERS[k];
    if (!coverState[k].alive) continue;
    if (Math.abs(c.z - r.z) > DRONE_R + c.d / 2 + 2 || Math.abs(c.x - x) > DRONE_R + c.w / 2 + 2) continue;
    out.push({ x0: c.x - c.w / 2, x1: c.x + c.w / 2, y0: 0, y1: c.h, z0: c.z - c.d / 2, z1: c.z + c.d / 2 });
  }
  return out;
}

function lights(i: number, px: number, pz: number, occ: OBox[]) {
  const r = DRONE_RAILS[i];
  const x = st[i].x;
  if (Math.hypot(px - x, pz - r.z) > DRONE_R) return false;
  for (const b of occ) if (segHits(px, BODY, pz, x, r.y, r.z, b)) return false;
  return true;
}

/* ---------- 바닥 빛 원: 셰이더가 가림 상자를 검사해 그림자 부분을 그리지 않는다 ---------- */
const VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = /* glsl */ `
uniform vec3 uD;
uniform float uR;
uniform float uT;
uniform float uTrack;
uniform vec3 uCol;
uniform vec3 uMin[${MAXB}];
uniform vec3 uMax[${MAXB}];
uniform int uN;
varying vec3 vW;
bool hitBox(vec3 a, vec3 b, vec3 mn, vec3 mx) {
  vec3 d = b - a;
  float t0 = 0.0;
  float t1 = 1.0;
  for (int k = 0; k < 3; k++) {
    if (abs(d[k]) < 1e-5) {
      if (a[k] < mn[k] || a[k] > mx[k]) return false;
    } else {
      float ta = (mn[k] - a[k]) / d[k];
      float tb = (mx[k] - a[k]) / d[k];
      float lo = min(ta, tb);
      float hi = max(ta, tb);
      t0 = max(t0, lo);
      t1 = min(t1, hi);
      if (t0 > t1) return false;
    }
  }
  return true;
}
void main() {
  float d = length(vW.xz - uD.xz);
  if (d > uR) discard;
  vec3 a = vec3(vW.x, ${BODY.toFixed(1)}, vW.z);
  for (int i = 0; i < ${MAXB}; i++) {
    if (i >= uN) break;
    if (hitBox(a, uD, uMin[i], uMax[i])) discard;
  }
  // 또렷한 테두리 + 안쪽으로 흐르는 주사선: 가로등의 흐린 빛 웅덩이와 구별된다
  float rim = smoothstep(uR - 0.28, uR - 0.08, d) * (1.0 - smoothstep(uR - 0.06, uR, d));
  float scan = step(0.86, fract(d * 1.3 - uT * (1.2 + uTrack * 1.6))) * 0.22;
  float alpha = rim * 0.9 + 0.09 + scan + uTrack * 0.08;
  gl_FragColor = vec4(uCol, alpha);
}`;

const SWEEP = new THREE.Color("#dff4ff");
const HOLD = new THREE.Color("#ffb02e");

function DroneBody() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.9, 0.22, 0.9]} />
        <meshStandardMaterial color="#e6e8ec" metalness={0.5} roughness={0.35} />
      </mesh>
      {[
        [-0.65, -0.65],
        [0.65, -0.65],
        [-0.65, 0.65],
        [0.65, 0.65],
      ].map(([x, z], k) => (
        <mesh key={k} position={[x, 0.12, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.32, 16]} />
          <meshBasicMaterial color="#9aa0a8" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export default function Drones() {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const beams = useRef<(THREE.Mesh | null)[]>([]);
  const lens = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(
    () =>
      DRONE_RAILS.map(
        () =>
          new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            transparent: true,
            depthWrite: false,
            fog: false,
            uniforms: {
              uD: { value: new THREE.Vector3() },
              uR: { value: DRONE_R },
              uT: { value: 0 },
              uTrack: { value: 0 },
              uCol: { value: SWEEP.clone() },
              uMin: { value: Array.from({ length: MAXB }, () => new THREE.Vector3()) },
              uMax: { value: Array.from({ length: MAXB }, () => new THREE.Vector3()) },
              uN: { value: 0 },
            },
          })
      ),
    []
  );
  const occ = useMemo(() => DRONE_RAILS.map(() => [] as OBox[]), []);
  const prevLit = useRef(-1);

  useFrame((s, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const now = s.clock.elapsedTime;
    const px = player.pos.x;
    const pz = player.pos.z;
    // 지금 빛이 사람을 찾을 수 있는가. 기록 없이 돌아온 둘(blind)에게는 빛이 닿아도 형체만 감지된다
    const awake = gaze.enabled && !gaze.dead && !gaze.frozen && !gaze.intro && !drone.caught;
    const blind = gaze.mood === "blind";
    const live = awake && !blind;
    let litI = -1;
    let shape = false;
    DRONE_RAILS.forEach((r, i) => {
      const S = st[i];
      occluders(i, occ[i]);
      const onFloor = r.zone === "plaza" || gaze.inZone;
      if (awake && blind && onFloor && lights(i, px, pz, occ[i])) shape = true;
      const hit = live && onFloor && lights(i, px, pz, occ[i]);
      if (hit && litI < 0) litI = i;
      if (hit) {
        if (!S.track) {
          S.neg = Math.sin(S.th) > 0;
          S.track = true;
        }
        S.lost = 0;
        // 레일 위에서만 천천히 따라온다: 빛 원 밖으로 앞뒤로 빠지면 곧 놓친다
        const want = THREE.MathUtils.clamp(px, r.c - r.a, r.c + r.a) - S.x;
        S.x += Math.sign(want) * Math.min(Math.abs(want), TRACK * dt);
      } else if (S.track) {
        S.lost += dt;
        if (S.lost > LOSE || !live) {
          S.track = false;
          resume(i);
        }
      } else {
        S.th += omega(i) * dt;
        S.x = r.c + r.a * Math.cos(S.th);
      }

      // 그림: 몸체·빛기둥·바닥 원이 같은 위치와 상태를 쓴다
      const g = groups.current[i];
      if (g) g.position.set(S.x, r.y + Math.sin(now * 1.3 + i) * 0.15, r.z);
      const m = mats[i];
      const u = m.uniforms;
      (u.uD.value as THREE.Vector3).set(S.x, r.y, r.z);
      u.uT.value = now;
      u.uTrack.value = S.track ? 1 : 0;
      (u.uCol.value as THREE.Color).copy(S.track ? HOLD : SWEEP);
      const o = occ[i];
      u.uN.value = o.length;
      o.forEach((b, k) => {
        (u.uMin.value as THREE.Vector3[])[k].set(b.x0, b.y0, b.z0);
        (u.uMax.value as THREE.Vector3[])[k].set(b.x1, b.y1, b.z1);
      });
      const bm = beams.current[i];
      if (bm) {
        const mat = bm.material as THREE.MeshBasicMaterial;
        mat.color.copy(S.track ? HOLD : SWEEP);
        mat.opacity = S.track ? 0.09 : 0.045;
      }
      const ln = lens.current[i];
      if (ln) (ln.material as THREE.MeshBasicMaterial).color.copy(S.track ? HOLD : SWEEP);
    });

    // 식별 게이지 하나 (한 번에 한 드론만 방문자를 비춘다)
    if (!drone.caught) {
      drone.meter = litI >= 0 ? Math.min(100, drone.meter + FILL * dt) : Math.max(0, drone.meter - DRAIN * dt);
    }
    if (litI !== prevLit.current) {
      if (litI >= 0 && prevLit.current < 0) sfx.droneSpot();
      else if (litI < 0 && prevLit.current >= 0 && !drone.caught) sfx.droneLost();
      prevLit.current = litI;
    }
    drone.lit = litI;
    drone.shape = shape;
    if (litI >= 0) drone.zone = DRONE_RAILS[litI].zone;
    gaze.droneLit = litI >= 0 && DRONE_RAILS[litI].zone === "avenue";
    if (drone.meter >= 100 && !drone.caught && litI >= 0) {
      sfx.droneId();
      if (drone.zone === "plaza") {
        drone.caught = true;
        drone.by = litI;
      } else {
        // 큰길: 드론이 위치를 보내면 대자비가 곧장 조준한다 (기존의 붉은 조준 신호와 바닥 선이 그대로 나온다)
        if (gaze.state !== "lock" && gaze.state !== "fire" && gaze.state !== "cool") gaze.meter = 100;
        drone.meter = 0;
        drone.sent = performance.now();
      }
    }
  });

  return (
    <group>
      {DRONE_RAILS.map((r, i) => (
        <group key={i}>
          <group ref={(g) => { groups.current[i] = g; }}>
            <DroneBody />
            {/* 아래를 향한 렌즈: 빛과 같은 색 (훑을 때 흰빛, 따라올 때 주황) */}
            <mesh ref={(m) => { lens.current[i] = m; }} position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.14, 10, 8]} />
              <meshBasicMaterial color="#dff4ff" toneMapped={false} />
            </mesh>
            <mesh ref={(m) => { beams.current[i] = m; }} position={[0, -r.y / 2, 0]}>
              <coneGeometry args={[DRONE_R, r.y, 24, 1, true]} />
              <meshBasicMaterial color="#dff4ff" transparent opacity={0.045} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} fog={false} />
            </mesh>
          </group>
          {/* 바닥 빛 원은 드론과 같은 x, 레일의 z에 고정. 셰이더가 uD로 그린다. 판(fx) 밖 허공 위에는 그리지 않는다 */}
          {(() => {
            const x0 = r.fx ? r.fx[0] : r.c - r.a - DRONE_R - 0.5;
            const x1 = r.fx ? r.fx[1] : r.c + r.a + DRONE_R + 0.5;
            return (
              <mesh position={[(x0 + x1) / 2, 0.035, r.z]} rotation={[-Math.PI / 2, 0, 0]} material={mats[i]} frustumCulled={false}>
                <planeGeometry args={[x1 - x0, DRONE_R * 2 + 1]} />
              </mesh>
            );
          })()}
        </group>
      ))}
    </group>
  );
}
