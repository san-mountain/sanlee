"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { input, moveVector, turnKeys } from "./input";
import { resolve } from "./collide";
import { autoWalk, gaze, route, walkArea, type Rect } from "./gaze";
import { CITY, GATE_STOP, inAvenueStrip, type Interactable, type ZoneDef } from "./zones";
import type { Box } from "./collide";

const EYE = 1.65;
const WALK = 3.4;
const RUN = 6.2;
const RADIUS = 0.38;
const JUMP_V = 6.2;
const GRAVITY = 19;

export const player = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, air: 0 };
// 디버그(?debug)에서 순간이동할 때 쓰는 요청
export const teleport: { req: { x: number; z: number; yaw: number } | null } = { req: null };

const inRects = (rs: Rect[], x: number, z: number) => rs.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
// 성문의 장벽이 빛을 거둔 뒤에는 장벽 자리의 보이지 않는 벽(GATE_STOP)만 빼고 피한다 (성문 기단은 walkArea 사각형이 막는다)
let openBoxes: Box[] | null = null;
const BIG = { x0: -1e4, x1: 1e4, z0: -1e4, z1: 1e4 };

type Props = {
  zone: ZoneDef;
  zoneKey: string;
  onNear: (item: Interactable | null) => void;
  arrived?: boolean;
};

// 1인칭 이동: 키보드·조이스틱으로 걷고, 드래그로 고개를 돌린다
export default function Player({ zone, zoneKey, onNear, arrived }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  const lookDone = useRef(false);
  // 소개 장면: 제자리에서 고개를 들어 대자비를 올려다본다. 눈이 초점을 맞추듯 시야가 살짝 좁아져(줌) 멀리 있는 얼굴이 커진다
  const baseFov = useRef(62);
  const zoom = useRef(1);
  const st = useRef({ yaw: 0, pitch: 0, x: 0, z: 0, bob: 0, near: null as string | null, y: 0, vy: 0 });

  useEffect(() => {
    baseFov.current = aspect < 0.8 ? 78 : aspect < 1.2 ? 70 : 62;
    camera.fov = baseFov.current * zoom.current;
    camera.updateProjectionMatrix();
  }, [aspect, camera]);

  useEffect(() => {
    const s = st.current;
    const sp = arrived && zone.entry ? zone.entry : zone.spawn;
    s.x = sp.pos[0];
    s.z = sp.pos[2];
    s.yaw = sp.yaw;
    s.pitch = 0.04;
    s.near = null;
    s.y = 0;
    s.vy = 0;
    input.look.yaw = 0;
    input.look.pitch = 0;
    onNear(null);
  }, [zoneKey, zone, onNear, arrived]);

  const fwd = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const jumpBuf = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;

    if (teleport.req) {
      s.x = teleport.req.x;
      s.z = teleport.req.z;
      s.yaw = teleport.req.yaw;
      s.pitch = 0;
      teleport.req = null;
    }
    // 시점. 소개 장면 중에는 입력을 버리고 대상 쪽으로 천천히 고개를 돌린다
    const la = gaze.lookAt;
    if (!la) lookDone.current = false;
    const zt = gaze.intro ? 0.62 : gaze.zoom;
    if (Math.abs(zt - zoom.current) > 0.001) {
      zoom.current += (zt - zoom.current) * Math.min(1, dt * (gaze.intro ? 1.1 : 2));
      camera.fov = baseFov.current * zoom.current;
      camera.updateProjectionMatrix();
    }
    if (la) {
      const k = Math.min(1, dt * (gaze.intro ? 1.8 : 1.6));
      const want = Math.atan2(-(la.x - s.x), -(la.z - s.z));
      let dy = want - s.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      s.yaw += dy * k;
      // 세로 화면은 팝업이 아래 절반을 덮으므로 얼굴이 화면 위쪽에 오도록 덜 올려다본다. 가로 화면은 팝업이 오른쪽에 뜬다
      const wantP = Math.min(1.1, Math.atan2(la.y - EYE, Math.hypot(la.x - s.x, la.z - s.z)) - (aspect < 1 ? 0.56 : 0.12) * zt);
      s.pitch += (wantP - s.pitch) * k;
      // 다 돌아봤으면 알린다 (소개 팝업이 이때 뜬다)
      if (!lookDone.current && Math.abs(dy) < 0.02 && Math.abs(wantP - s.pitch) < 0.02) {
        lookDone.current = true;
        window.dispatchEvent(new Event("sanlee-look-done"));
      }
    } else if (!gaze.intro) {
      // 소개 팝업이 떠 있는 동안에는 마우스가 움직여도 시선이 대자비에 머문다
      // 망원경으로 볼 때는 배율만큼 천천히 돌고, 정해진 범위 안에서만 둘러본다
      const z = gaze.zoom;
      s.yaw += (input.look.yaw + turnKeys() * dt * 1.8) * z;
      s.pitch = Math.max(-1.1, Math.min(1.25, s.pitch + input.look.pitch * z));
      const c = gaze.clamp;
      if (c) {
        let d = s.yaw - c.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        s.yaw = c.yaw + Math.max(-c.dy, Math.min(c.dy, d));
        s.pitch = Math.max(c.p0, Math.min(c.p1, s.pitch));
      }
    }
    input.look.yaw = 0;
    input.look.pitch = 0;

    // 이동
    const mv = input.enabled && !gaze.frozen && !gaze.still ? moveVector() : { x: 0, y: 0, run: false };
    const speed = mv.run ? RUN : WALK;
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    // yaw=0 이면 -z 방향을 바라봄
    const dx = (mv.x * cos - mv.y * sin) * speed * dt;
    const dz = (-mv.x * sin - mv.y * cos) * speed * dt;
    const p = { x: s.x + dx, z: s.z + dz };
    const aw = autoWalk.to;
    if (aw) {
      // 시점이 스스로 걸어간다 (결말, 망원경에 다가가고 물러날 때). 길을 향해 고개를 돌리고, 다 오면 정해진 쪽을 본다
      const ax = aw.x - s.x;
      const az = aw.z - s.z;
      const ad = Math.hypot(ax, az);
      const k = Math.min(1, dt * 2.2);
      const want = ad > 0.6 && !aw.faceYaw ? Math.atan2(-ax, -az) : (aw.yaw ?? 0);
      let dy = want - s.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      s.yaw += dy * k;
      if (aw.pitch !== undefined) s.pitch += (aw.pitch - s.pitch) * Math.min(1, dt * 1.2);
      const st = Math.min(ad, aw.speed * dt);
      p.x = ad > 1e-4 ? s.x + (ax / ad) * st : s.x;
      p.z = ad > 1e-4 ? s.z + (az / ad) * st : s.z;
      // 다 왔으면 다음 점으로. 마지막 점이면 도착을 알린다 (그 점의 방향은 계속 맞춘다)
      if (ad - st < 0.03) {
        const next = autoWalk.queue.shift();
        if (next) autoWalk.to = next;
        else autoWalk.arrived = true;
      }
    } else if (walkArea.rects) {
      // 결말의 다리 위: 평소처럼 걷되 장애물을 피하고, 보이는 난간·기단이 정한 사각형들 밖으로는 나가지 않는다
      const rs = walkArea.rects;
      if (!openBoxes) openBoxes = zone.boxes.filter((b) => b !== GATE_STOP);
      resolve(p, RADIUS, BIG, gaze.gateOpen ? openBoxes : zone.boxes, zone.circles);
      if (inRects(rs, s.x, s.z) && !inRects(rs, p.x, p.z)) {
        if (inRects(rs, p.x, s.z)) p.z = s.z;
        else if (inRects(rs, s.x, p.z)) p.x = s.x;
        else {
          p.x = s.x;
          p.z = s.z;
        }
      }
    } else {
      resolve(p, RADIUS, zone.bounds, zone.boxes, zone.circles);
      // 망원경 전: 큰길의 홀로그램 차단막을 넘지 못한다 (밖에서 안으로만 막는다)
      if (route.avenueLocked && zone === CITY && !inAvenueStrip(s.x, s.z, RADIUS) && inAvenueStrip(p.x, p.z, RADIUS)) {
        if (!inAvenueStrip(p.x, s.z, RADIUS)) p.z = s.z;
        else if (!inAvenueStrip(s.x, p.z, RADIUS)) p.x = s.x;
        else {
          p.x = s.x;
          p.z = s.z;
        }
      }
    }
    const moved = Math.hypot(p.x - s.x, p.z - s.z);
    s.x = p.x;
    s.z = p.z;
    // 점프: 달리거나 걷는 중에도 언제든. 착지 직전에 누른 것도 0.15초 동안 기억했다가 닿자마자 뛰고,
    // 누르고 있으면 착지할 때마다 이어서 뛴다
    if (input.jump) jumpBuf.current = 0.15;
    input.jump = false;
    jumpBuf.current -= dt;
    if ((jumpBuf.current > 0 || input.jumpHeld) && s.y <= 0 && s.vy <= 0 && input.enabled) {
      s.vy = JUMP_V;
      jumpBuf.current = 0;
    }
    if (s.y > 0 || s.vy > 0) {
      s.vy -= GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y <= 0) {
        s.y = 0;
        s.vy = 0;
      }
    }
    const grounded = s.y <= 0;
    if (grounded) s.bob += moved * (mv.run ? 2.2 : 2.6);

    const bobY = input.bob && grounded ? Math.sin(s.bob * 2) * 0.035 * Math.min(1, moved / (dt * 2 + 1e-4)) : 0;
    const floorY = walkArea.floor ? walkArea.floor(s.x, s.z) : 0;
    camera.position.set(s.x, EYE + floorY + s.y + bobY, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0, "YXZ");
    // 대자비가 분노하면 화면이 흔들린다
    const sh = gaze.shake;
    if (sh > 0.001) {
      camera.position.x += (Math.random() - 0.5) * sh;
      camera.position.y += (Math.random() - 0.5) * sh;
      camera.rotation.z += (Math.random() - 0.5) * sh * 0.25;
      camera.rotation.x += (Math.random() - 0.5) * sh * 0.15;
    }
    player.pos.set(s.x, EYE, s.z);
    player.yaw = s.yaw;
    player.pitch = s.pitch;
    player.air = s.y;

    // 가까이 있는 상호작용 대상 찾기 (앞쪽에 있는 것 우선)
    camera.getWorldDirection(fwd.current);
    fwd.current.y = 0;
    fwd.current.normalize();
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of zone.items) {
      if (it.when && !it.when()) continue;
      tmp.current.set(it.pos.x - s.x, 0, it.pos.z - s.z);
      const d = tmp.current.length();
      if (d > it.radius) continue;
      const facing = d < 0.01 ? 1 : tmp.current.divideScalar(d).dot(fwd.current);
      if (facing < 0.25 && d > 1.4) continue;
      const score = d * (1.6 - facing);
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    const id = best?.id ?? null;
    if (id !== s.near) {
      s.near = id;
      onNear(best);
    }
  });

  return null;
}
