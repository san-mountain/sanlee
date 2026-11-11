"use client";

import { runtime } from "./runtime";

// 대자비(大慈悲): 큰길 끝 섬에 선 거대한 입불. 이마의 렌즈로 큰길을 내려다보고,
// 시선에 오래 노출되면 눈이 붉어지고 입꼬리가 올라가다가, 레이저로 바닥을 긁으며 쏜다.
import { sfx } from "./sfx";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Lang } from "@/data/site";
import { AVENUE, BARRIERS, COVER_HP, COVERS, GAZE_ZONE, JABI, QUEUE_Z } from "./zones";
import { gaze } from "./gaze";
import { player } from "./Player";
import { hazardTexture, signTexture } from "./textures";
import { useSign } from "./parts";

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/* ---------- 엄폐물 상태 (파괴되면 alive=false) ---------- */
export const coverState = COVERS.map((c) => ({ alive: true, hp: COVER_HP[c.kind], burn: 0 }));
export function restoreCovers() {
  beam.on = false;
  beam.t = 0;
  scorch.length = 0;
  lockT = coolT = 0;
  coverState.forEach((c, i) => {
    c.alive = true;
    c.hp = COVER_HP[COVERS[i].kind];
    c.burn = 0;
  });
}

const HEAD = 1.5; // 시선 판정에 쓰는 머리 높이
// 점 (px, pz, py)에서 눈까지의 선이 살아 있는 엄폐물에 가리는지. 가리면 그 엄폐물 번호
function blockedBy(px: number, pz: number, py: number): number {
  const ex = JABI.eye.x;
  const ez = JABI.eye.z;
  const dx = ex - px;
  const dz = ez - pz;
  let best = -1;
  let bestT = 2;
  COVERS.forEach((c, i) => {
    if (!coverState[i].alive) return;
    const x0 = c.x - c.w / 2;
    const x1 = c.x + c.w / 2;
    const z0 = c.z - c.d / 2;
    const z1 = c.z + c.d / 2;
    let t0 = 0;
    let t1 = 1;
    for (const [p, d, a, b] of [
      [px, dx, x0, x1],
      [pz, dz, z0, z1],
    ]) {
      if (Math.abs(d) < 1e-6) {
        if (p < a || p > b) return;
      } else {
        let ta = (a - p) / d;
        let tb = (b - p) / d;
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
        if (t0 > t1) return;
      }
    }
    const h = py + t0 * (JABI.eye.y - py);
    if (h < c.h && t0 < bestT) {
      bestT = t0;
      best = i;
    }
  });
  return best;
}

/* ---------- 시선 판정과 레이저 (매 프레임) ---------- */
const beam = {
  on: false,
  t: 0,
  p: new THREE.Vector3(),
  target: new THREE.Vector3(),
  end: new THREE.Vector3(),
  blocked: -1,
  lastDrop: new THREE.Vector3(),
};
const scorch: { x: number; z: number; born: number }[] = [];
let lockT = 0;
const aimAt = new THREE.Vector3();
const aimTip = new THREE.Vector3();
// 발사 직전의 조준선: 눈에서 플레이어까지 얇은 붉은 실선이 TRACK초 동안 플레이어를 따라오다가,
// 마지막 HOLD초 동안 그 자리에 고정된 뒤 발사된다. 고정된 동안 레이저가 긁고 갈 길이 바닥에도 비친다
const path = { start: new THREE.Vector3(), end: new THREE.Vector3() };
const TRACK = 0.2;
const HOLD = 0.35;
function planPath(ax: number, az: number) {
  const dx = JABI.eye.x - ax;
  const dz = JABI.eye.z - az;
  const d = Math.hypot(dx, dz) || 1;
  path.start.set(ax + (dx / d) * 9, 0, az + (dz / d) * 9);
  path.start.x = THREE.MathUtils.clamp(path.start.x, -AVENUE - 2, AVENUE + 2);
  const sx = ax - path.start.x;
  const sz = az - path.start.z;
  const sl = Math.hypot(sx, sz) || 1;
  path.end.set(ax + (sx / sl) * 4, 0, az + (sz / sl) * 4);
}
let coolT = 0;
const last = { x: 0, z: 0 };

function GazeSystem() {
  useFrame((s, rawDt) => {
    if (runtime.paused) return;
    const dt = Math.min(rawDt, 0.05);
    const now = s.clock.elapsedTime;
    const px = player.pos.x;
    const pz = player.pos.z;
    const moved = Math.hypot(px - last.x, pz - last.z);
    last.x = px;
    last.z = pz;
    const inZone = gaze.enabled && !gaze.dead && Math.abs(px) < GAZE_ZONE.x && pz < GAZE_ZONE.z1 && pz > GAZE_ZONE.z0;
    gaze.inZone = inZone;
    // 줄 속에 가만히 서 있으면 시민으로 보인다
    const inLine = Math.abs(Math.abs(px) - 3.6) < 0.55 && pz < QUEUE_Z[0] + 1 && pz > QUEUE_Z[QUEUE_Z.length - 1] - 1 && moved < 0.004;
    const cover = blockedBy(px, pz, HEAD);
    // 머리 위 드론의 빛 안에서는 줄에 섞여 있어도 드러난다 (드론이 대자비에게 위치를 알린다).
    // 엄폐물이 드론 빛까지 가리면 Drones가 droneLit을 끄므로, 둘 다 가려야 숨은 것이다
    const lit = gaze.droneLit;
    gaze.hiddenBy = lit ? "" : inLine ? "line" : cover >= 0 ? "cover" : "";
    // 저장된 방문 기록이 없는 방문자는 추적할 대상이 없으므로 조준하지 못한다 (대자비는 여전히 도시를 훑는다)
    gaze.seen = inZone && gaze.mood !== "blind" && !gaze.intro && (lit || (!inLine && cover < 0));

    if (gaze.state === "fire") {
      runBeam(dt, now);
    } else if (gaze.state === "lock") {
      lockT -= dt;
      // 고정되기 전까지는 조준점이 플레이어를 따라간다
      if (lockT > HOLD) {
        aimAt.set(player.pos.x, 0, player.pos.z);
        planPath(aimAt.x, aimAt.z);
      }
      gaze.shake = 0.1 + (0.9 - lockT) * 0.12;
      if (lockT <= 0) startBeam(aimAt);
    } else if (gaze.state === "cool") {
      coolT -= dt;
      gaze.shake = Math.max(0, gaze.shake - dt * 0.4);
      if (coolT <= 0) gaze.state = "watch";
    } else {
      if (gaze.seen) {
        const dist = Math.hypot(px - JABI.eye.x, pz - JABI.eye.z);
        const near = THREE.MathUtils.clamp(1 - (dist - 90) / 90, 0, 1);
        const run = moved / Math.max(dt, 1e-4) > 4.5 ? 1.25 : 1;
        if (!gaze.firstSeenAt) gaze.firstSeenAt = performance.now();
        // 감시 게이지: 먼 곳에서 약 5.6초, 가까이 가면 약 2.9초면 가득 찬다 (예전 20에서 18로. 비우는 속도와 조준·레이저 시간은 그대로)
        gaze.meter += 18 * (1 + 0.9 * near) * run * dt;
      } else {
        gaze.meter -= (inZone ? 20 : 30) * dt;
      }
      gaze.meter = THREE.MathUtils.clamp(gaze.meter, 0, 100);
      const m = gaze.meter;
      gaze.state = m >= 100 ? "lock" : m >= 70 ? "charge" : m >= 35 ? "suspect" : m > 2 ? "watch" : "idle";
      if (gaze.state === "lock") {
        lockT = 0.9;
        // 눈이 붉어진 뒤 조준선이 플레이어를 따라오다 고정된다. 고정되면 바로 옆으로 뛰어 피할 수 있다
        aimAt.set(player.pos.x, 0, player.pos.z);
        planPath(aimAt.x, aimAt.z);
      }
      gaze.shake = m >= 70 ? ((m - 70) / 30) * 0.06 : 0;
    }
    // 불타는 엄폐물 잔해
    coverState.forEach((c) => {
      if (c.burn > 0) c.burn = Math.max(0, c.burn - dt * 0.15);
    });
  });
  return null;
}

function startBeam(at?: THREE.Vector3) {
  sfx.beam();
  gaze.state = "fire";
  beam.on = true;
  beam.t = 0;
  // 레이저는 조준선이 고정된 자리 앞(눈 쪽으로 9m) 바닥에 떨어져, 그 자리를 지나 4m 더 긁고 간다.
  // 발사 뒤에는 플레이어를 따라오지 않으므로, 조준선이 고정되는 걸 보고 옆으로 뛰면 피할 수 있다
  if (!at) planPath(player.pos.x, player.pos.z);
  beam.p.copy(path.start);
  beam.target.copy(path.end);
  beam.lastDrop.copy(beam.p);
  gaze.shake = 0.28;
}

function runBeam(dt: number, now: number) {
  beam.t += dt;
  const dx = beam.target.x - beam.p.x;
  const dz = beam.target.z - beam.p.z;
  const d = Math.hypot(dx, dz);
  const step = Math.min(d, 14 * dt);
  if (d > 1e-4) {
    beam.p.x += (dx / d) * step;
    beam.p.z += (dz / d) * step;
  }
  // 레이저가 엄폐물에 막히면 그 엄폐물을 태운다
  const b = blockedBy(beam.p.x, beam.p.z, 0.2);
  beam.blocked = b;
  if (b >= 0) {
    const c = coverState[b];
    c.hp -= dt;
    c.burn = 1;
    beam.end.set(COVERS[b].x, COVERS[b].h * 0.6, COVERS[b].z);
    if (c.hp <= 0) c.alive = false;
  } else {
    beam.end.copy(beam.p);
    // 지나간 바닥에 녹아내린 자국
    if (beam.end.distanceTo(beam.lastDrop) > 0.45) {
      scorch.push({ x: beam.end.x, z: beam.end.z, born: now });
      if (scorch.length > 220) scorch.shift();
      beam.lastDrop.copy(beam.end);
    }
    if (Math.hypot(beam.p.x - player.pos.x, beam.p.z - player.pos.z) < 1.1 && gaze.inZone) {
      gaze.dead = performance.now();
      gaze.frozen = true;
      gaze.deaths++;
      endBeam(1.2);
      return;
    }
  }
  gaze.shake = 0.22 + Math.sin(now * 40) * 0.04;
  if (beam.t > 3.4 || (d < 0.3 && beam.t > 1.4)) endBeam(1.6);
}

function endBeam(cool: number) {
  beam.on = false;
  gaze.state = "cool";
  gaze.meter = 28;
  coolT = cool;
}

/* ---------- 레이저와 바닥 자국 ---------- */
function Beam() {
  const g = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const hit = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const aim = useRef<THREE.Mesh>(null);
  const lane = useRef<THREE.Mesh>(null);
  const dark = useRef<THREE.InstancedMesh>(null);
  const molten = useRef<THREE.InstancedMesh>(null);
  const col = useMemo(() => new THREE.Color(), []);
  const N = 220;
  useLayoutEffect(() => {
    for (let i = 0; i < N; i++) {
      tmpM.makeScale(0, 0, 0);
      dark.current!.setMatrixAt(i, tmpM);
      molten.current!.setMatrixAt(i, tmpM);
      molten.current!.setColorAt(i, col.set("#000"));
    }
  }, [col]);
  const place = (m: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, r: number) => {
    const len = from.distanceTo(to);
    m.position.copy(from).lerp(to, 0.5);
    tmpV.copy(to).sub(from).normalize();
    m.quaternion.setFromUnitVectors(UP, tmpV);
    m.scale.set(r, len, r);
  };
  useFrame((s) => {
    const now = s.clock.elapsedTime;
    const on = beam.on;
    if (g.current) g.current.visible = on;
    if (hit.current) hit.current.visible = on;
    if (light.current) {
      light.current.intensity = on ? 260 + Math.sin(now * 60) * 80 : 0;
      light.current.position.copy(beam.end).setY(beam.end.y + 1.5);
    }
    if (on && core.current && glow.current) {
      place(core.current, JABI.eye, beam.end, 0.35);
      place(glow.current, JABI.eye, beam.end, 1.6 + Math.sin(now * 50) * 0.3);
      hit.current!.position.copy(beam.end);
    }
    // 발사 직전: 얇은 조준 실선. 따라오는 동안은 은은하게, 고정되면 밝게 깜빡인다
    if (aim.current) {
      const show = gaze.state === "lock" && lockT <= TRACK + HOLD;
      aim.current.visible = show;
      if (show) {
        aimTip.set(aimAt.x, 1.0, aimAt.z);
        const held = lockT <= HOLD;
        place(aim.current, JABI.eye, aimTip, held ? 0.06 : 0.035);
        (aim.current.material as THREE.MeshBasicMaterial).opacity = held ? (Math.sin(now * 45) > 0 ? 1 : 0.45) : 0.55;
      }
    }
    // 조준선이 고정된 동안: 레이저가 긁고 갈 길이 바닥에 가늘게 비친다
    if (lane.current) {
      const show = gaze.state === "lock" && lockT <= HOLD;
      lane.current.visible = show;
      if (show) {
        const len = path.start.distanceTo(path.end);
        lane.current.position.copy(path.start).lerp(path.end, 0.5).setY(0.04);
        lane.current.rotation.set(-Math.PI / 2, 0, Math.atan2(path.end.x - path.start.x, path.end.z - path.start.z));
        lane.current.scale.set(0.14, len, 1);
        const k = 1 - Math.max(0, lockT) / HOLD;
        (lane.current.material as THREE.MeshBasicMaterial).opacity = (0.35 + 0.5 * k) * (Math.sin(now * 40) > -0.3 ? 1 : 0.5);
      }
    }
    // 바닥 자국: 처음엔 녹은 주황, 몇 초 뒤 검게 식는다
    scorch.forEach((sc, i) => {
      const age = now - sc.born;
      const k = Math.max(0, 1 - age / 5);
      tmpM.compose(tmpV.set(sc.x, 0.025 + (i % 7) * 0.0006, sc.z), tmpQ.setFromAxisAngle(tmpS.set(1, 0, 0), -Math.PI / 2), tmpS.set(1.3, 1.3, 1));
      dark.current!.setMatrixAt(i, tmpM);
      tmpM.compose(tmpV.set(sc.x, 0.03 + (i % 7) * 0.0006, sc.z), tmpQ, new THREE.Vector3(1.1 * (0.4 + k * 0.6), 1.1 * (0.4 + k * 0.6), 1));
      molten.current!.setMatrixAt(i, tmpM);
      molten.current!.setColorAt(i, col.setRGB(1 * k, 0.35 * k * k, 0.05 * k * k * k));
    });
    if (dark.current) {
      dark.current.count = scorch.length;
      dark.current.instanceMatrix.needsUpdate = true;
    }
    if (molten.current) {
      molten.current.count = scorch.length;
      molten.current.instanceMatrix.needsUpdate = true;
      if (molten.current.instanceColor) molten.current.instanceColor.needsUpdate = true;
    }
  });
  return (
    <group>
      <group ref={g} visible={false}>
        <mesh ref={core}>
          <cylinderGeometry args={[1, 1, 1, 10, 1, true]} />
          <meshBasicMaterial color="#fff2f2" toneMapped={false} fog={false} />
        </mesh>
        <mesh ref={glow}>
          <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
          <meshBasicMaterial color="#ff1030" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
        </mesh>
      </group>
      <mesh ref={aim} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 6, 1, true]} />
        <meshBasicMaterial color="#ff2a3d" transparent opacity={0.6} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={lane} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ff2a3d" transparent opacity={0.6} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight ref={light} distance={26} color="#ff5030" intensity={0} />
      <group ref={hit} visible={false}>
        <mesh>
          <sphereGeometry args={[0.9, 16, 10]} />
          <meshBasicMaterial color="#fff0c0" toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.4, 16, 10]} />
          <meshBasicMaterial color="#ff4020" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <Sparkles count={40} scale={[3, 4, 3]} position={[0, 1.5, 0]} size={18} speed={3} color="#ffb070" />
      </group>
      <instancedMesh ref={dark} args={[undefined, undefined, N]} frustumCulled={false}>
        <circleGeometry args={[1, 12]} />
        <meshStandardMaterial color="#050505" roughness={1} transparent opacity={0.9} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={molten} args={[undefined, undefined, N]} frustumCulled={false}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ---------- 큰길의 엄폐물: 비석, 컨테이너, 방벽 (대칭) ---------- */
function useStoneTex() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#77736a";
    g.fillRect(0, 0, 128, 256);
    // 새겨진 글자 줄 (읽을 수 없는 비문)
    g.fillStyle = "#4a4740";
    for (let x = 18; x < 112; x += 14) for (let y = 30; y < 230; y += 13) if (Math.random() > 0.15) g.fillRect(x, y, 9, 8);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Covers({ lang }: { lang: Lang }) {
  // 벽 엄폐물 앞면의 안내: 숨지 말라면서 숨은 사람 수를 세고 있다
  const hideSign = useSign(
    [
      [lang === "ko" ? "이 구조물 뒤에 숨지 마십시오" : "DO NOT HIDE BEHIND THIS STRUCTURE", 1],
      [lang === "ko" ? "숨은 시민 수 집계 중" : "HIDDEN CITIZENS ARE BEING COUNTED", 0.6],
    ],
    { color: "#2a2206", bg: "#ffd23f", w: 1024, h: 200 }
  );
  const stone = useStoneTex();
  const hazardStripe = useMemo(() => {
    const t = hazardTexture();
    t.repeat.set(6, 1);
    return t;
  }, []);
  const refs = useRef<{ whole: THREE.Group | null; rubble: THREE.Group | null; fire: THREE.Group | null }[]>([]);
  useFrame(() => {
    coverState.forEach((c, i) => {
      const r = refs.current[i];
      if (!r) return;
      if (r.whole) r.whole.visible = c.alive;
      if (r.rubble) r.rubble.visible = !c.alive;
      if (r.fire) r.fire.visible = c.burn > 0.05;
    });
  });
  return (
    <group>
      {COVERS.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <group ref={(g) => { refs.current[i] = { ...refs.current[i], whole: g }; }}>
            {c.kind === "stele" && (
              <>
                {/* 거북 받침 위의 비석 */}
                <mesh position={[0, 0.45, 0]} scale={[1.3, 0.45, 0.9]}>
                  <sphereGeometry args={[1, 14, 10]} />
                  <meshStandardMaterial color="#5e5a52" roughness={0.95} />
                </mesh>
                <mesh position={[0, 0.55, 0.85]}>
                  <sphereGeometry args={[0.32, 10, 8]} />
                  <meshStandardMaterial color="#5e5a52" roughness={0.95} />
                </mesh>
                <mesh position={[0, 2.1, 0]}>
                  <boxGeometry args={[c.w * 0.85, 2.8, 0.45]} />
                  <meshStandardMaterial map={stone} roughness={0.95} />
                </mesh>
                <mesh position={[0, 3.55, 0]}>
                  <boxGeometry args={[c.w, 0.3, 0.7]} />
                  <meshStandardMaterial color="#5e5a52" roughness={0.95} />
                </mesh>
              </>
            )}
            {c.kind === "container" && (
              <>
                <mesh position={[0, c.h / 2, 0]}>
                  <boxGeometry args={[c.w, c.h, c.d]} />
                  <meshStandardMaterial color="#8a2a22" roughness={0.6} metalness={0.5} />
                </mesh>
                {[-0.35, -0.12, 0.12, 0.35].map((f) =>
                  c.w >= c.d ? (
                    <mesh key={f} position={[f * c.w, c.h / 2, c.d / 2 + 0.01]}>
                      <boxGeometry args={[0.08, c.h * 0.92, 0.04]} />
                      <meshStandardMaterial color="#5a1a14" roughness={0.6} metalness={0.5} />
                    </mesh>
                  ) : (
                    <mesh key={f} position={[c.w / 2 + 0.01, c.h / 2, f * c.d]}>
                      <boxGeometry args={[0.04, c.h * 0.92, 0.08]} />
                      <meshStandardMaterial color="#5a1a14" roughness={0.6} metalness={0.5} />
                    </mesh>
                  )
                )}
                <mesh position={[0, c.h + 0.06, 0]}>
                  <boxGeometry args={[Math.min(c.w, c.d) * 0.4, 0.12, 0.3]} />
                  <meshBasicMaterial color="#ffb02e" toneMapped={false} />
                </mesh>
              </>
            )}
            {c.kind === "wall" && (
              <>
                <mesh position={[0, c.h / 2, 0]}>
                  <boxGeometry args={[c.w, c.h, c.d]} />
                  <meshStandardMaterial color="#6a6a68" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.5, c.d / 2 + 0.01]}>
                  <planeGeometry args={[c.w, 0.4]} />
                  <meshBasicMaterial color="#ffd23f" />
                </mesh>
                <mesh position={[0, 1.55, c.d / 2 + 0.012]}>
                  <planeGeometry args={[c.w * 0.82, c.w * 0.82 * (200 / 1024)]} />
                  <meshBasicMaterial map={hideSign} />
                </mesh>
              </>
            )}
            {c.kind === "kiosk" && (
              <>
                {/* 무인 동의 키오스크: 화면에 '모두 수락' */}
                <mesh position={[0, c.h / 2, 0]}>
                  <boxGeometry args={[c.w, c.h, c.d]} />
                  <meshStandardMaterial color="#23262e" roughness={0.5} metalness={0.4} />
                </mesh>
                <mesh position={[0, c.h * 0.62, c.d / 2 + 0.01]}>
                  <planeGeometry args={[c.w * 0.75, c.h * 0.32]} />
                  <meshBasicMaterial color="#22f0ff" toneMapped={false} />
                </mesh>
                <mesh position={[0, c.h * 0.36, c.d / 2 + 0.01]}>
                  <planeGeometry args={[c.w * 0.5, 0.18]} />
                  <meshBasicMaterial color="#ff2bd6" toneMapped={false} />
                </mesh>
                <mesh position={[0, c.h + 0.05, 0]}>
                  <boxGeometry args={[c.w + 0.2, 0.1, c.d + 0.2]} />
                  <meshStandardMaterial color="#14161b" />
                </mesh>
              </>
            )}
            {c.kind === "truck" && (
              <>
                {/* 멈춰 선 수거 트럭: 짐칸과 운전석, 바퀴 */}
                <mesh position={[0, c.h / 2 + 0.25, 0.7]}>
                  <boxGeometry args={[c.w, c.h - 0.5, c.d - 1.6]} />
                  <meshStandardMaterial color="#c9c6bd" roughness={0.7} metalness={0.2} />
                </mesh>
                <mesh position={[0, 0.9, 0.7]}>
                  <boxGeometry args={[c.w + 0.02, 0.35, c.d - 1.6]} />
                  <meshBasicMaterial map={hazardStripe} />
                </mesh>
                <mesh position={[0, 1.35, -c.d / 2 + 0.75]}>
                  <boxGeometry args={[c.w * 0.92, 2.2, 1.5]} />
                  <meshStandardMaterial color="#3b4048" roughness={0.6} metalness={0.3} />
                </mesh>
                <mesh position={[0, 1.75, -c.d / 2 - 0.01]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[c.w * 0.8, 0.7]} />
                  <meshStandardMaterial color="#0b0d10" metalness={0.8} roughness={0.2} />
                </mesh>
                {[-1, 1].flatMap((sx) =>
                  [-c.d / 2 + 0.9, c.d / 2 - 1.2].map((wz) => (
                    <mesh key={`${sx}${wz}`} position={[sx * (c.w / 2 - 0.05), 0.42, wz]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.42, 0.42, 0.3, 12]} />
                      <meshStandardMaterial color="#111" roughness={0.9} />
                    </mesh>
                  ))
                )}
              </>
            )}
          </group>
          {/* 파괴된 뒤의 잔해 */}
          <group ref={(g) => { refs.current[i] = { ...refs.current[i], rubble: g }; }} visible={false}>
            {[
              [-0.6, 0.25, 0.1, 0.7],
              [0.5, 0.2, -0.2, 0.6],
              [0.1, 0.5, 0.2, 0.5],
              [-0.2, 0.15, -0.4, 0.4],
            ].map(([x, y, z, sz], k) => (
              <mesh key={k} position={[x, y, z]} rotation={[k, k * 0.7, 0.3]}>
                <boxGeometry args={[sz, sz * 0.7, sz]} />
                <meshStandardMaterial color="#1a1614" roughness={1} emissive="#2a0a00" />
              </mesh>
            ))}
          </group>
          <group ref={(g) => { refs.current[i] = { ...refs.current[i], fire: g }; }} visible={false}>
            <Sparkles count={24} scale={[c.w, 3, c.d + 0.6]} position={[0, 1.5, 0]} size={14} speed={1.5} color="#ff7a2a" />
          </group>
        </group>
      ))}
    </group>
  );
}

/* ---------- 통제선: 붉은 레이저 울타리와 표지 ---------- */
function Barriers({ lang }: { lang: Lang }) {
  const hazard = useMemo(() => {
    const t = hazardTexture();
    t.repeat.set(4, 1);
    return t;
  }, []);
  const sign = useSign(
    [
      [lang === "ko" ? "감시 구역" : "SURVEILLANCE ZONE", 1],
      [lang === "ko" ? "검문소는 큰길 끝에 있습니다." : "THE CHECKPOINT IS AT THE END OF THE AVENUE.", 0.55],
    ],
    { color: "#ff2a3d", glow: true, mono: true, w: 512, h: 160, bg: "#0a0204" }
  );
  const lasers = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    if (lasers.current) lasers.current.opacity = 0.55 + Math.sin(s.clock.elapsedTime * 9) * 0.3;
  });
  void signTexture;
  return (
    <group>
      {BARRIERS.map((b, i) => {
        const along = b.axis === "x" ? b.x1 - b.x0 : b.z1 - b.z0;
        const cx = (b.x0 + b.x1) / 2;
        const cz = (b.z0 + b.z1) / 2;
        return (
          <group key={i} position={[cx, 0, cz]} rotation={[0, b.axis === "x" ? 0 : Math.PI / 2, 0]}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[along, 0.6, 0.5]} />
              <meshStandardMaterial map={hazard} roughness={0.7} />
            </mesh>
            {[-1, 1].map((k) => (
              <mesh key={k} position={[(k * along) / 2, 1.8, 0]}>
                <boxGeometry args={[0.25, 3.6, 0.25]} />
                <meshStandardMaterial color="#2a2c31" metalness={0.8} roughness={0.35} />
              </mesh>
            ))}
            {[1.1, 1.8, 2.5, 3.2].map((y) => (
              <mesh key={y} position={[0, y, 0]}>
                <boxGeometry args={[along, 0.04, 0.04]} />
                <meshBasicMaterial ref={y === 1.1 ? lasers : undefined} color="#ff1030" transparent toneMapped={false} />
              </mesh>
            ))}
            <mesh position={[0, 3.75, 0]}>
              <planeGeometry args={[Math.min(3, along * 0.9), 0.95]} />
              <meshBasicMaterial map={sign} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ---------- 거대한 입불: 오른손은 들어 손바닥을 보이고, 왼손은 내려 손바닥을 펼쳤다 ---------- */
function useCurls() {
  return useMemo(() => {
    const out: THREE.Vector3[] = [];
    // 머리 윗부분과 육계를 덮는 소라 모양 머리칼
    const shell = (cy: number, r: number, phiMax: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * (1 - Math.cos(phiMax));
        const rr = Math.sqrt(1 - y * y);
        const a = i * 2.399963;
        out.push(new THREE.Vector3(Math.cos(a) * rr * r, cy + y * r, Math.sin(a) * rr * r));
      }
    };
    shell(80, 7.6, 1.25, 260);
    shell(87.5, 4.1, 1.6, 90);
    return out.filter((p) => !(p.z > 4.2 && p.y < 82.5)); // 이마는 비운다
  }, []);
}

// 얼굴 연출에 쓰는 도구들
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const ARC_COUNT = 28;
// 초승달 웃음: 윗선은 입꼬리가 치솟는 곡선, 아랫선은 깊게 처진 곡선 (너비 2W, 깊이 1)
const GRIN_W = 3.2;
const grinTop = (x: number) => 0.9 * Math.pow(x / GRIN_W, 4) * 1.4 - 0.15;
const GRIN_TEETH: [number, number, number][] = Array.from({ length: 13 }, (_, i) => {
  const x = -GRIN_W * 0.82 + (i / 12) * GRIN_W * 1.64;
  return [x, grinTop(x) - 0.22, Math.PI]; // 윗니: 아래를 향한 삼각형
});
function useGrinGeometry() {
  return useMemo(() => {
    const sh = new THREE.Shape();
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const x = -GRIN_W + (i / N) * 2 * GRIN_W;
      if (i === 0) sh.moveTo(x, grinTop(x));
      else sh.lineTo(x, grinTop(x));
    }
    for (let i = N; i >= 0; i--) {
      const x = -GRIN_W + (i / N) * 2 * GRIN_W;
      const u = x / GRIN_W;
      sh.lineTo(x, grinTop(x) - 1.6 * (1 - u * u) * (0.7 + 0.3 * Math.cos(u * 9) * 0.2));
    }
    return new THREE.ShapeGeometry(sh);
  }, []);
}
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.25, "rgba(255,255,255,.55)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
}

function StandingBuddha() {
  const curls = useCurls();
  const curlRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    curls.forEach((p, i) => {
      tmpM.compose(p, tmpQ.identity(), tmpS.set(1, 1, 1));
      curlRef.current!.setMatrixAt(i, tmpM);
    });
    curlRef.current!.instanceMatrix.needsUpdate = true;
  }, [curls]);
  const bronze = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8a6c40", metalness: 0.85, roughness: 0.38, emissive: "#24160a", fog: false }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a2c1c", metalness: 0.8, roughness: 0.5, emissive: "#140a04", fog: false }), []);
  const seam = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffb02e", toneMapped: false, fog: false }), []);
  // 몸통(가사를 걸친 몸): 회전체에 세로 주름을 새긴다
  const robe = useMemo(() => {
    const pts: [number, number][] = [
      [12.5, 14],
      [11.5, 18],
      [10.4, 30],
      [10.8, 44],
      [10.2, 52],
      [11.6, 60],
      [12.6, 64],
      [9, 67],
      [3.6, 68],
    ];
    const g = new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(r, y)),
      72
    );
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const fold = Math.sin(a * 11 + y * 0.08) * 0.45 * THREE.MathUtils.clamp((60 - y) / 40, 0, 1);
      const r = Math.hypot(x, z) + fold;
      p.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r * 0.62);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const petals = useMemo(() => Array.from({ length: 20 }, (_, i) => (i / 20) * Math.PI * 2), []);

  // 얼굴: 시선 게이지에 따라 눈에서 레이저가 지글거리고, 입이 찢어지게 웃고, 온몸이 붉게 달아오른다
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#400808", toneMapped: false, fog: false }), []);
  const glowTex = useGlowTexture();
  const eyeGlowMat = useMemo(
    () => new THREE.SpriteMaterial({ map: glowTex, color: "#ff2020", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }),
    [glowTex]
  );
  const faceGlowMat = useMemo(
    () => new THREE.SpriteMaterial({ map: glowTex, color: "#ff1010", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }),
    [glowTex]
  );
  const arcMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffd0d0", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }), []);
  const leakMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff3020", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, side: THREE.DoubleSide }), []);
  const arcs = useRef<THREE.InstancedMesh>(null);
  const leaks = useRef<THREE.Group>(null);
  const lens = useRef<THREE.MeshBasicMaterial>(null);
  const lensRing = useRef<THREE.Mesh>(null);
  const lids = useRef<THREE.Group>(null);
  const brows = useRef<THREE.Group>(null);
  const smile = useRef<THREE.Mesh>(null);
  const grin = useRef<THREE.Group>(null);
  const grinMat = useRef<THREE.MeshBasicMaterial>(null);
  const teeth = useRef<THREE.InstancedMesh>(null);
  const faceLight = useRef<THREE.PointLight>(null);
  const halo = useRef<THREE.Group>(null);
  const k = useRef(0);
  const calmEmissive = useMemo(() => new THREE.Color("#24160a"), []);
  const wrathEmissive = useMemo(() => new THREE.Color("#7a0604"), []);
  const grinGeo = useGrinGeometry();
  const teethPos = useMemo(() => GRIN_TEETH, []);
  useLayoutEffect(() => {
    teethPos.forEach(([x, y, r], i) => {
      tmpM.compose(tmpV.set(x, y, 0.02), tmpQ.setFromAxisAngle(Z_AXIS, r), tmpS.set(1, 1, 1));
      teeth.current!.setMatrixAt(i, tmpM);
    });
    teeth.current!.instanceMatrix.needsUpdate = true;
  }, [teethPos]);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const hot = gaze.state === "fire" || gaze.state === "lock";
    const target = hot ? 1 : gaze.meter / 100;
    k.current += (target - k.current) * Math.min(1, dt * 4);
    const v = k.current;
    const rage = THREE.MathUtils.clamp((v - 0.35) / 0.65, 0, 1); // 의심부터 차오르는 분노
    const sizzle = 0.75 + Math.random() * 0.5; // 지글거림
    const flash = gaze.state === "lock" ? (Math.sin(t * 34) > 0 ? 1.6 : 0.5) : 1;

    // 눈: 검붉은 → 새빨간 → 하얗게 타는 눈
    if (hot) eyeMat.color.setRGB(3, 1.4 + Math.random() * 0.6, 1.2).multiplyScalar(flash);
    else eyeMat.color.setRGB(0.25 + v * 2.6, 0.04 + rage * rage * 0.5, 0.04 + rage * 0.2).multiplyScalar(rage > 0.2 ? sizzle : 1);
    eyeGlowMat.opacity = Math.min(1, rage * 0.9 * sizzle + (hot ? 0.4 : 0));
    faceGlowMat.opacity = rage * 0.55 * (hot ? 1.3 : 1) * (0.85 + Math.random() * 0.3);
    // 눈가에서 튀는 전기 불꽃
    if (arcs.current) {
      const n = ARC_COUNT;
      for (let i = 0; i < n; i++) {
        const side = i < n / 2 ? -1 : 1;
        const on = Math.random() < rage * 0.85;
        const len = on ? 0.6 + Math.random() * (1.2 + rage * 2.4) : 0.0001;
        const ang = Math.random() * Math.PI * 2;
        tmpV.set(side * 2.7 + Math.cos(ang) * 1.6, 81.2 + Math.sin(ang) * 0.8, 7.9);
        tmpQ.setFromAxisAngle(Z_AXIS, ang + (Math.random() - 0.5) * 1.2);
        tmpM.compose(tmpV, tmpQ, tmpS.set(len, 0.09 + Math.random() * 0.08, 1));
        arcs.current.setMatrixAt(i, tmpM);
      }
      arcs.current.instanceMatrix.needsUpdate = true;
    }
    arcMat.opacity = rage > 0.05 ? 0.6 + Math.random() * 0.4 : 0;
    // 눈에서 새어 나오는 짧은 레이저 줄기: 분노가 찰수록 길고 굵어진다
    leakMat.opacity = rage * (0.45 + Math.random() * 0.4) + (hot ? 0.3 : 0);
    if (leaks.current)
      leaks.current.children.forEach((c, i) => {
        const L = (2 + rage * 14 + (hot ? 10 : 0)) * (0.7 + Math.random() * 0.6);
        c.scale.set(0.35 + rage * 0.5 + Math.random() * 0.2, L, 0.35 + rage * 0.5);
        c.position.z = 7.6 + L / 2;
        c.visible = rage > 0.08;
        c.rotation.z = (i % 2 ? 1 : -1) * Math.random() * 0.04;
      });

    if (lens.current) {
      if (hot) lens.current.color.setRGB(3, 2.2, 2.2).multiplyScalar(flash);
      else lens.current.color.setRGB(0.5 + v * 2.5, 0.04, 0.08);
    }
    if (lensRing.current) lensRing.current.scale.setScalar(1 + v * 0.9 + (gaze.state === "charge" ? Math.sin(t * 14) * 0.18 : 0));
    // 눈꺼풀은 걷히고, 눈썹은 안쪽이 내려앉아 성난 얼굴이 된다
    if (lids.current) lids.current.position.y = v * 0.8;
    if (brows.current)
      brows.current.children.forEach((c, i) => {
        const sd = i === 0 ? -1 : 1;
        c.rotation.z = sd * (-0.12 + rage * 0.55);
        c.position.y = 83.1 - rage * 0.5;
      });

    // 입: 평온한 일자 → 입꼬리 치켜든 미소 → 이빨 드러낸 초승달 웃음 → 턱이 빠지게 벌어진 아가리
    const openA = THREE.MathUtils.clamp((v - 0.45) / 0.3, 0, 1);
    const openB = THREE.MathUtils.clamp((v - 0.8) / 0.2, 0, 1) + (hot ? 0.35 : 0);
    if (smile.current) {
      smile.current.scale.set(1 + v * 0.6, 0.15 + v * 1.3, 1);
      smile.current.visible = openA < 0.6;
    }
    if (grin.current) {
      grin.current.visible = openA > 0.02;
      const jitter = hot ? (Math.random() - 0.5) * 0.12 : 0;
      grin.current.scale.set(0.7 + openA * 0.7 + openB * 0.25, 0.25 + openA * 0.85 + openB * 1.1 + jitter, 1);
    }
    if (grinMat.current) grinMat.current.color.setRGB(1.6 + v * 1.6, 0.06 + (hot ? Math.random() * 0.4 : 0), 0.05);
    if (teeth.current) teeth.current.visible = openA > 0.35;

    // 청동 몸 전체가 붉게 달아오르고, 얼굴 앞 붉은 빛이 거세진다
    bronze.emissive.copy(calmEmissive).lerp(wrathEmissive, rage * (0.85 + Math.random() * 0.15 * rage));
    if (faceLight.current) faceLight.current.intensity = rage * 9000 * (hot ? 1.6 : 1) * (0.85 + Math.random() * 0.3);
    if (halo.current) halo.current.rotation.z = t * (0.03 + rage * 0.4);

    // 결말: 수락하면 눈이 평온하게 감기고 붉은 빛이 금빛으로 돌아온다
    const ringMat = lensRing.current?.material as THREE.MeshBasicMaterial | undefined;
    // 기록 없는 방문자(blind)에게도 대자비는 평소처럼 도시를 훑는다. 그 방문자를 조준하지 못할 뿐이다 (gaze.seen)
    ringMat?.color.set(gaze.mood === "calm" ? "#ffc040" : "#ff2a3d");
    if (gaze.mood === "calm") {
      eyeMat.color.setRGB(1.8, 1.25, 0.35);
      eyeGlowMat.color.set("#ffc040");
      eyeGlowMat.opacity = 0.45;
      faceGlowMat.opacity = 0;
      arcMat.opacity = 0;
      leakMat.opacity = 0;
      if (lens.current) lens.current.color.setRGB(2.2, 1.6, 0.5);
      if (lids.current) lids.current.position.y = -0.32;
      if (smile.current) {
        smile.current.visible = true;
        smile.current.scale.set(1, 0.15, 1);
      }
      if (grin.current) grin.current.visible = false;
      if (teeth.current) teeth.current.visible = false;
      bronze.emissive.set("#4a3008");
      if (faceLight.current) faceLight.current.intensity = 0;
    } else eyeGlowMat.color.set("#ff2020");
  });

  return (
    <group position={[JABI.x, JABI.y, JABI.z]}>
      {/* 팔각 기단과 연꽃 대좌 */}
      <mesh position={[0, 3, 0]} rotation={[0, Math.PI / 8, 0]} material={dark}>
        <cylinderGeometry args={[24, 26, 6, 8]} />
      </mesh>
      {petals.map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 15, 9.5, Math.cos(a) * 15]} rotation={[0, a, 0]} scale={[5.2, 5, 3.4]} material={bronze}>
          <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        </mesh>
      ))}
      <mesh position={[0, 12.5, 0]} material={bronze}>
        <cylinderGeometry args={[15, 17, 3, 32]} />
      </mesh>
      {/* 몸 */}
      <mesh geometry={robe} material={bronze} />
      {[24, 40, 56].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]} material={seam}>
          <torusGeometry args={[11.3, 0.12, 4, 64]} />
        </mesh>
      ))}
      {/* 가슴의 가사 깃: 비스듬한 띠 */}
      <mesh position={[1.5, 58, 6.6]} rotation={[0.1, 0, -0.55]} material={dark}>
        <boxGeometry args={[2.2, 20, 0.6]} />
      </mesh>
      {/* 어깨 */}
      <mesh position={[0, 64.5, 0]} scale={[14, 4.5, 8]} material={bronze}>
        <sphereGeometry args={[1, 24, 14]} />
      </mesh>
      {/* 목의 삼도 */}
      <mesh position={[0, 70, 0.5]} material={bronze}>
        <cylinderGeometry args={[3.6, 4.2, 6, 20]} />
      </mesh>
      {[68.5, 70, 71.5].map((y) => (
        <mesh key={y} position={[0, y, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={dark}>
          <torusGeometry args={[3.9, 0.12, 4, 24]} />
        </mesh>
      ))}
      {/* 오른팔(보는 쪽 왼편): 들어 올린 손, 손바닥이 앞을 향한다 (시무외인) */}
      <group position={[-13, 63, 1]}>
        <mesh position={[-1.5, -7, 0]} rotation={[0, 0, -0.18]} material={bronze}>
          <cylinderGeometry args={[3, 3.4, 15, 14]} />
        </mesh>
        <mesh position={[-3, -14, 3]} rotation={[-0.9, 0, 0.05]} material={bronze}>
          <cylinderGeometry args={[2.4, 2.8, 12, 14]} />
        </mesh>
        {/* 늘어진 소매 */}
        <mesh position={[-3.4, -22, 0.5]} scale={[3.6, 16, 4.4]} material={bronze}>
          <sphereGeometry args={[1, 14, 12]} />
        </mesh>
        <group position={[-3, -6, 7.5]}>
          <mesh material={bronze}>
            <boxGeometry args={[6, 6.5, 1.5]} />
          </mesh>
          {[-2.1, -0.7, 0.7, 2.1].map((x, i) => (
            <mesh key={x} position={[x, 5.2 + (i === 1 || i === 2 ? 0.6 : 0), 0]} material={bronze}>
              <capsuleGeometry args={[0.62, 4 + (i === 1 || i === 2 ? 1 : 0), 4, 8]} />
            </mesh>
          ))}
          <mesh position={[3.6, 0.5, 0.3]} rotation={[0, 0, -0.7]} material={bronze}>
            <capsuleGeometry args={[0.7, 3, 4, 8]} />
          </mesh>
          {/* 손바닥의 바퀴 문양 */}
          <mesh position={[0, -0.5, 0.78]} material={seam}>
            <ringGeometry args={[1.1, 1.35, 20]} />
          </mesh>
        </group>
      </group>
      {/* 왼팔(보는 쪽 오른편): 내려서 손바닥을 펼친다 (여원인) */}
      <group position={[13, 63, 1]}>
        <mesh position={[1.5, -7, 0]} rotation={[0, 0, 0.18]} material={bronze}>
          <cylinderGeometry args={[3, 3.4, 15, 14]} />
        </mesh>
        <mesh position={[3, -17, 3]} rotation={[0.6, 0, -0.1]} material={bronze}>
          <cylinderGeometry args={[2.4, 2.8, 10, 14]} />
        </mesh>
        <mesh position={[3.6, -26, -0.5]} scale={[3.8, 17, 4.4]} material={bronze}>
          <sphereGeometry args={[1, 14, 12]} />
        </mesh>
        <group position={[3.6, -24, 7]} rotation={[0.35, 0, 0]}>
          <mesh material={bronze}>
            <boxGeometry args={[6, 6, 1.5]} />
          </mesh>
          {[-2.1, -0.7, 0.7, 2.1].map((x, i) => (
            <mesh key={x} position={[x, -5 - (i === 1 || i === 2 ? 0.5 : 0), 0]} material={bronze}>
              <capsuleGeometry args={[0.62, 4 + (i === 1 || i === 2 ? 1 : 0), 4, 8]} />
            </mesh>
          ))}
          <mesh position={[0, 0.3, 0.78]} material={seam}>
            <ringGeometry args={[1.1, 1.35, 20]} />
          </mesh>
        </group>
      </group>
      {/* 머리 */}
      <group>
        <mesh position={[0, 79.5, 0.6]} scale={[7.2, 8.6, 7.6]} material={bronze}>
          <sphereGeometry args={[1, 32, 24]} />
        </mesh>
        <mesh position={[0, 87.5, 0]} scale={[4.1, 4.1, 4.1]} material={bronze}>
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>
        <instancedMesh ref={curlRef} args={[undefined, bronze, curls.length]} frustumCulled={false}>
          <icosahedronGeometry args={[0.72, 0]} />
        </instancedMesh>
        {/* 길게 늘어진 귀 */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 7.2, 77, 0]} scale={[1.2, 5, 2.1]} material={bronze}>
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
        ))}
        {/* 코 */}
        <mesh position={[0, 78.2, 8.1]} scale={[1.1, 2.4, 1.1]} material={bronze}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        {/* 눈: 붉게 빛나는 눈동자와 그 위를 덮은 눈꺼풀 */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 2.7, 81.2, 7.35]} rotation={[0, s * 0.22, 0]} scale={[1.9, 0.75, 0.3]} material={eyeMat}>
            <sphereGeometry args={[1, 16, 10]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <sprite key={s} position={[s * 2.7, 81.2, 8.4]} scale={[9, 6, 1]} material={eyeGlowMat} />
        ))}
        <sprite position={[0, 79, 9]} scale={[34, 30, 1]} material={faceGlowMat} />
        <instancedMesh ref={arcs} args={[undefined, arcMat, ARC_COUNT]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
        </instancedMesh>
        <group ref={leaks}>
          {[-1, 1].flatMap((s) =>
            [0, 1].map((j) => (
              <mesh key={`${s}${j}`} position={[s * 2.7 + (j ? 0.25 : -0.25) * s, 81.2 + (j ? 0.1 : -0.1), 8]} rotation={[Math.PI / 2, 0, 0]} material={leakMat} visible={false}>
                <coneGeometry args={[0.5, 1, 8, 1, true]} />
              </mesh>
            ))
          )}
        </group>
        <group ref={lids}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 2.7, 81.45, 7.55]} rotation={[0, s * 0.22, 0]} scale={[2.1, 0.55, 0.45]} material={bronze}>
              <sphereGeometry args={[1, 16, 10]} />
            </mesh>
          ))}
        </group>
        <group ref={brows}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 2.8, 83.1, 7.3]} rotation={[0, 0, s * -0.12]} material={dark}>
              <boxGeometry args={[3.6, 0.3, 0.5]} />
            </mesh>
          ))}
        </group>
        {/* 이마의 렌즈 (백호 자리) */}
        <mesh position={[0, 84, 8.25]}>
          <circleGeometry args={[0.85, 24]} />
          <meshBasicMaterial ref={lens} color="#400810" toneMapped={false} fog={false} />
        </mesh>
        <mesh ref={lensRing} position={[0, 84, 8.3]}>
          <ringGeometry args={[1.0, 1.25, 32]} />
          <meshBasicMaterial color="#ff2a3d" toneMapped={false} fog={false} transparent opacity={0.8} />
        </mesh>
        {/* 입: 평온한 미소 선, 그리고 이빨이 드러나는 초승달 웃음 */}
        <mesh ref={smile} position={[0, 75.4, 7.55]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[1.8, 0.18, 6, 24, Math.PI]} />
          <meshBasicMaterial color="#1a0a04" fog={false} />
        </mesh>
        <group ref={grin} position={[0, 75.9, 7.6]} visible={false}>
          <mesh geometry={grinGeo}>
            <meshBasicMaterial ref={grinMat} color="#ff2020" toneMapped={false} fog={false} side={THREE.DoubleSide} />
          </mesh>
          <instancedMesh ref={teeth} args={[undefined, undefined, GRIN_TEETH.length]} frustumCulled={false}>
            <coneGeometry args={[0.16, 0.5, 3]} />
            <meshBasicMaterial color="#f2e6d0" fog={false} />
          </instancedMesh>
        </group>
        <pointLight ref={faceLight} position={[0, 79, 16]} distance={70} color="#ff1a10" intensity={0} />
      </group>
      {/* 머리 뒤 광배: 성당의 장미창 모양 */}
      <group ref={halo} position={[0, 81, -7]}>
        <mesh>
          <ringGeometry args={[15, 15.8, 64]} />
          <meshBasicMaterial color="#ffb02e" toneMapped={false} fog={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[19.5, 19.9, 64]} />
          <meshBasicMaterial color="#ff2a3d" toneMapped={false} fog={false} side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={i} rotation={[0, 0, (i / 16) * Math.PI * 2]} position={[0, 0, 0]}>
            <planeGeometry args={[0.3, 31]} />
            <meshBasicMaterial color="#ffb02e" toneMapped={false} fog={false} side={THREE.DoubleSide} transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 50, -9]}>
        <ringGeometry args={[42, 42.6, 96]} />
        <meshBasicMaterial color="#22f0ff" toneMapped={false} fog={false} side={THREE.DoubleSide} transparent opacity={0.4} />
      </mesh>
      <pointLight position={[0, 40, 40]} intensity={5000} distance={140} color="#ffb070" />
    </group>
  );
}

export default function Jabi({ lang }: { lang: Lang }) {
  return (
    <group>
      <StandingBuddha />
      <GazeSystem />
      <Beam />
      <Covers lang={lang} />
      <Barriers lang={lang} />
    </group>
  );
}
