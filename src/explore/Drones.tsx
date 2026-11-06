"use client";

import { runtime } from "./runtime";

// 순찰 드론: 레일을 따라 오가며 바닥에 빛 원을 비춘다.
// 빛 원(그림), 빛기둥(그림), 가림 판정, 맞음 판정이 모두 아래의 같은 값(드론 위치·반지름·가림 상자)에서 나온다.
// - 광장·바깥 산책로: 망원경 가는 길. 빛 속에 오래 있으면 식별되어 그 드론 길 앞의 안전한 자리로 돌아간다 (DroneHUD → ExploreClient)
// - 큰길: 드론 게이지는 없다. 빛 속에서는 엄폐물 뒤나 줄 속이라도 대자비에게 보이고(gaze.droneLit), 대자비의 감시 게이지 하나가 찬다.
//   죽음은 언제나 대자비의 레이저 하나뿐이다
// - 빛에 든 사람은 순찰 범위(레일 둘레 x c±a, z z±dz) 안에서 앞뒤좌우로 따라간다. 그 범위 밖이나 지붕·엄폐물 밑으로 들어가면 놓친다
// - 따라갈 때는 방문자 발밑에 표적 고리가 붙는다. 저장된 방문 기록이 없는 방문자(gaze.mood "blind")에게는
//   빛이 닿아도 고리가 붙지 못하고 흩어진다: 따라가지도, 게이지를 채우지도, 위치를 보내지도 않는다 (drone.shape)
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
const TRACK = 3.6; // 방문자를 따라가는 속도 (걷기 3.4보다 조금 빠르고 달리기 6.2보다 느리다: 걸어서는 못 떨치고, 뛰면 엄폐물까지 간다)
const FILL = 70; // 식별 게이지가 차는 속도 (초당). 약 1.4초 (바꾸지 않는다)
const DRAIN = 40;
const LOSE = 1.1; // 이만큼 놓치면 다시 레일을 훑는다 (잠깐 빠졌다 들어오면 그대로 따라간다)
const RETURN = 2.4; // 따라가다 놓친 뒤 레일(z)로 돌아가는 속도
const MAXB = 4;

// 광장의 지붕들 (배송 대기소 처마 등). 지붕이 새로 생기면 zones의 ROOFS에 넣으면 판정과 그림이 같이 따른다
const ROOF_BOXES: OBox[] = ROOFS.map((r) => ({ x0: r.x - r.w / 2, x1: r.x + r.w / 2, y0: r.y0, y1: r.y1, z0: r.z - r.d / 2, z1: r.z + r.d / 2 }));

// 화면 HUD와 ExploreClient가 읽는 드론 상태
export const drone = {
  lit: -1, // 지금 방문자를 비추는 드론 번호
  zone: "" as "" | "plaza" | "avenue",
  meter: 0, // 0~100. 다 차면 식별
  caught: false, // 광장에서 식별됨: ExploreClient가 구간 처음 자리로 돌려보내고 resetDrones를 부른다
  shape: false, // 기록 없는 방문자에게 빛이 닿음: 표적 고리를 붙일 방문 기록이 없다
  by: -1, // 식별한 드론 번호 (광장 A=0 / 바깥 산책로 B=1). 돌려보낼 자리를 고를 때 쓴다
  shapeSeen: false, // 기록 없는 방문자에게 고리가 붙지 못한 일이 이번 방문에 한 번이라도 있었나 (HUD 문구는 이때 한 번만)
};

const st = DRONE_RAILS.map((r) => ({ th: r.phase, x: r.c + r.a * Math.cos(r.phase), z: r.z, track: false, neg: false, lost: 0 }));
const omega = (i: number) => (Math.PI * 2) / DRONE_RAILS[i].period;

export function resetDrones() {
  drone.lit = -1;
  drone.zone = "";
  drone.meter = 0;
  drone.caught = false;
  drone.shape = false;
  drone.by = -1;
  gaze.droneLit = false;
  st.forEach((s, i) => {
    s.z = DRONE_RAILS[i].z;
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

// 이산이 건너도 되는지: 앞으로 secs초 동안 이 드론의 빛 원 가장자리가 x에서 margin 안으로 오지 않는가.
// 따라가는 중이거나 아직 레일로 돌아오는 중이면 기다린다 (순찰 범위 전체가 아니라 레일 위의 훑기만 내다본다)
export function laneClear(i: number, x: number, secs: number, margin = 1.2) {
  const s = st[i];
  const r = DRONE_RAILS[i];
  if (s.track || Math.abs(s.z - r.z) > 0.3) return false;
  for (let t = 0; t <= secs; t += 0.2) if (Math.abs(r.c + r.a * Math.cos(s.th + omega(i) * t) - x) < DRONE_R + margin) return false;
  return true;
}
export const droneAt = (i: number) => ({ x: st[i].x, z: st[i].z });
// 골목 입구에서 망원경을 처음 바라볼 때: 앞줄 드론이 inSecs초 뒤 레일 가운데(망원경 가는 길)를 지나가도록 맞춘다
export function presetSweep(i: number, inSecs: number) {
  const s = st[i];
  if (s.track) return;
  s.th = Math.PI / 2 - omega(i) * inSecs;
  const r = DRONE_RAILS[i];
  s.x = r.c + r.a * Math.cos(s.th);
  s.z = r.z;
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
  const z = st[i].z;
  if (r.zone === "plaza") {
    for (const b of ROOF_BOXES) {
      if (out.length >= MAXB) break;
      if (b.z0 - z > DRONE_R + 4 || z - b.z1 > DRONE_R + 4 || b.x0 - x > DRONE_R + 4 || x - b.x1 > DRONE_R + 4) continue;
      out.push(b);
    }
    return out;
  }
  for (let k = 0; k < COVERS.length && out.length < MAXB; k++) {
    const c = COVERS[k];
    if (!coverState[k].alive) continue;
    if (Math.abs(c.z - z) > DRONE_R + c.d / 2 + 2 || Math.abs(c.x - x) > DRONE_R + c.w / 2 + 2) continue;
    out.push({ x0: c.x - c.w / 2, x1: c.x + c.w / 2, y0: 0, y1: c.h, z0: c.z - c.d / 2, z1: c.z + c.d / 2 });
  }
  return out;
}

function lights(i: number, px: number, pz: number, occ: OBox[]) {
  const r = DRONE_RAILS[i];
  const { x, z } = st[i];
  if (Math.hypot(px - x, pz - z) > DRONE_R) return false;
  for (const b of occ) if (segHits(px, BODY, pz, x, r.y, z, b)) return false;
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
  // 표적 고리: 따라갈 때는 방문자 발밑에 붙어 조여 들고, 기록 없는 방문자에게는 빛 가운데서 붙지 못하고 퍼지며 흩어진다
  const ring = useRef<THREE.Mesh>(null);
  const ringT = useRef(0);

  useFrame((s, rawDt) => {
    if (runtime.paused) return;
    const dt = Math.min(rawDt, 0.05);
    const now = runtime.now() / 1000;
    const px = player.pos.x;
    const pz = player.pos.z;
    // 지금 빛이 사람을 찾을 수 있는가. 기록 없이 돌아온 둘(blind)에게는 빛이 닿아도 형체만 감지된다
    const awake = gaze.enabled && !gaze.dead && !gaze.frozen && !gaze.intro && !drone.caught;
    const blind = gaze.mood === "blind";
    const live = awake && !blind;
    let litI = -1;
    let shape = false;
    let shapeI = -1;
    DRONE_RAILS.forEach((r, i) => {
      const S = st[i];
      occluders(i, occ[i]);
      const onFloor = r.zone === "plaza" || gaze.inZone;
      if (awake && blind && onFloor && lights(i, px, pz, occ[i])) {
        shape = true;
        if (shapeI < 0) shapeI = i;
      }
      const hit = live && onFloor && lights(i, px, pz, occ[i]);
      if (hit && litI < 0) litI = i;
      if (hit) {
        if (!S.track) {
          S.neg = Math.sin(S.th) > 0;
          S.track = true;
        }
        S.lost = 0;
        // 순찰 범위 안에서 방문자 쪽으로 곧장 따라온다 (x와 z 모두). 범위 끝에 닿으면 거기서 멈춘다
        const wx = THREE.MathUtils.clamp(px, r.c - r.a, r.c + r.a) - S.x;
        const wz = THREE.MathUtils.clamp(pz, r.z - r.dz, r.z + r.dz) - S.z;
        const wd = Math.hypot(wx, wz);
        if (wd > 1e-4) {
          const k = Math.min(wd, TRACK * dt) / wd;
          S.x += wx * k;
          S.z += wz * k;
        }
      } else if (S.track) {
        S.lost += dt;
        if (S.lost > LOSE || !live) {
          S.track = false;
          resume(i);
        }
      } else {
        S.th += omega(i) * dt;
        S.x = r.c + r.a * Math.cos(S.th);
        // 따라가느라 벗어났던 z는 훑으면서 천천히 레일로 돌아온다
        const back = r.z - S.z;
        S.z += Math.sign(back) * Math.min(Math.abs(back), RETURN * dt);
      }

      // 그림: 몸체·빛기둥·바닥 원이 같은 위치와 상태를 쓴다
      const g = groups.current[i];
      if (g) g.position.set(S.x, r.y + Math.sin(now * 1.3 + i) * 0.15, S.z);
      const m = mats[i];
      const u = m.uniforms;
      (u.uD.value as THREE.Vector3).set(S.x, r.y, S.z);
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

    // 드론 게이지는 광장·산책로에만 있다. 큰길에서는 드론 빛이 대자비의 감시 게이지 하나를 채운다:
    // 빛 속이면 엄폐물 뒤나 줄 속이라도 대자비에게 보이는 것으로 친다(gaze.droneLit → Jabi의 gaze.seen). 두 시선이 겹쳐도 더 빨리 차지 않는다
    const plazaLit = litI >= 0 && DRONE_RAILS[litI].zone === "plaza";
    if (!drone.caught) {
      drone.meter = plazaLit ? Math.min(100, drone.meter + FILL * dt) : Math.max(0, drone.meter - DRAIN * dt);
    }
    if (litI !== prevLit.current) {
      if (litI >= 0 && prevLit.current < 0) sfx.droneSpot();
      else if (litI < 0 && prevLit.current >= 0 && !drone.caught) sfx.droneLost();
      prevLit.current = litI;
    }
    drone.lit = litI;
    drone.shape = shape;
    // 표적 고리 (한 번에 하나)
    const rg = ring.current;
    if (rg) {
      const rm = rg.material as THREE.MeshBasicMaterial;
      if (litI >= 0) {
        ringT.current = Math.min(1, ringT.current + dt * 1.6);
        rg.visible = true;
        rg.position.set(px, 0.06, pz);
        rg.scale.setScalar(1.6 - ringT.current * 0.9);
        rm.color.copy(HOLD);
        rm.opacity = 0.85;
      } else if (shapeI >= 0) {
        // 붙을 기록이 없다: 빛 가운데에서 퍼지기만 하고 방문자에게 다가가지 않는다
        ringT.current = (ringT.current + dt * 0.8) % 1;
        rg.visible = true;
        rg.position.set(st[shapeI].x, 0.06, st[shapeI].z);
        rg.scale.setScalar(0.6 + ringT.current * 1.6);
        rm.color.copy(SWEEP);
        rm.opacity = 0.7 * (1 - ringT.current) * (Math.sin(now * 20) > -0.3 ? 1 : 0.2);
      } else {
        ringT.current = 0;
        rg.visible = false;
      }
    }
    if (litI >= 0) drone.zone = DRONE_RAILS[litI].zone;
    gaze.droneLit = litI >= 0 && DRONE_RAILS[litI].zone === "avenue";
    if (drone.meter >= 100 && !drone.caught && plazaLit) {
      sfx.droneId();
      drone.caught = true;
      drone.by = litI;
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
          {/* 바닥 빛 원은 드론의 지금 x·z를 셰이더가 uD로 그린다. 바닥 판은 순찰 범위 전체를 덮고, 판(fx) 밖 허공 위에는 그리지 않는다 */}
          {(() => {
            const x0 = r.fx ? r.fx[0] : r.c - r.a - DRONE_R - 0.5;
            const x1 = r.fx ? r.fx[1] : r.c + r.a + DRONE_R + 0.5;
            return (
              <mesh position={[(x0 + x1) / 2, 0.035, r.z]} rotation={[-Math.PI / 2, 0, 0]} material={mats[i]} frustumCulled={false}>
                <planeGeometry args={[x1 - x0, (DRONE_R + r.dz) * 2 + 1]} />
              </mesh>
            );
          })()}
        </group>
      ))}
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <ringGeometry args={[0.55, 0.68, 32]} />
        <meshBasicMaterial color="#ffb02e" transparent opacity={0.85} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}
