"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { input, moveVector, turnKeys } from "./input";
import { resolve } from "./collide";
import { autoWalk, gaze } from "./gaze";
import type { Interactable, ZoneDef } from "./zones";
import { faceRt } from "./faceRuntime";
import { interactionProjection, clearInteractionProjection } from "./interactionProjection";

const EYE = 1.65;
const WALK = 3.4;
const RUN = 6.2;
const RADIUS = 0.38;
const JUMP_V = 6.2;
const GRAVITY = 19;

export const player = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, air: 0 };
// 디버그(?debug)에서 순간이동할 때 쓰는 요청
export const teleport: { req: { x: number; z: number; yaw: number } | null } = { req: null };

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
    clearInteractionProjection();
  }, [zoneKey, zone, onNear, arrived]);

  const tmp = useRef(new THREE.Vector3());
  const screenPt = useRef(new THREE.Vector3());
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
    const zt = gaze.intro ? 0.62 : 1;
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
      const wantP = Math.min(1.1, Math.atan2(la.y - EYE, Math.hypot(la.x - s.x, la.z - s.z)) - (gaze.intro ? (aspect < 1 ? 0.56 : 0.12) * zt : 0));
      s.pitch += (wantP - s.pitch) * k;
      // 다 돌아봤으면 알린다 (소개 팝업이 이때 뜬다)
      if (!lookDone.current && Math.abs(dy) < 0.02 && Math.abs(wantP - s.pitch) < 0.02) {
        lookDone.current = true;
        window.dispatchEvent(new Event("sanlee-look-done"));
      }
    } else if (!gaze.intro) {
      // 소개 팝업이 떠 있는 동안에는 마우스가 움직여도 시선이 대자비에 머문다
      s.yaw += input.look.yaw + turnKeys() * dt * 1.8;
      s.pitch = Math.max(-1.1, Math.min(1.25, s.pitch + input.look.pitch));
    }
    input.look.yaw = 0;
    input.look.pitch = 0;

    // 이동
    const mv = input.enabled && !gaze.frozen ? moveVector() : { x: 0, y: 0, run: false };
    const speed = mv.run ? RUN : WALK;
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    // yaw=0 이면 -z 방향을 바라봄
    const dx = (mv.x * cos - mv.y * sin) * speed * dt;
    const dz = (-mv.x * sin - mv.y * cos) * speed * dt;
    const p = { x: s.x + dx, z: s.z + dz };
    const aw = autoWalk.to;
    if (aw) {
      // 결말: 시점이 스스로 걸어간다. 길을 향해 고개를 돌리고, 다 오면 앞(북쪽)을 본다
      const ax = aw.x - s.x;
      const az = aw.z - s.z;
      const ad = Math.hypot(ax, az);
      const k = Math.min(1, dt * 2.2);
      const want = ad > 0.6 ? Math.atan2(-ax, -az) : 0;
      let dy = want - s.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      s.yaw += dy * k;
      if (aw.pitch !== undefined) s.pitch += (aw.pitch - s.pitch) * Math.min(1, dt * 1.2);
      const st = Math.min(ad, aw.speed * dt);
      p.x = ad > 1e-4 ? s.x + (ax / ad) * st : s.x;
      p.z = ad > 1e-4 ? s.z + (az / ad) * st : s.z;
    } else resolve(p, RADIUS, zone.bounds, zone.boxes, zone.circles);
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
    camera.position.set(s.x, EYE + s.y + bobY, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0, "YXZ");
    // 대자비가 분노하면 화면이 흔들린다
    const sh = gaze.shake;
    if (sh > 0.001) {
      camera.position.x += (Math.random() - 0.5) * sh;
      camera.position.y += (Math.random() - 0.5) * sh;
      camera.rotation.z += (Math.random() - 0.5) * sh * 0.25;
      camera.rotation.x += (Math.random() - 0.5) * sh * 0.15;
    }
    // Projection uses the camera's current frame, not the previous rendered frame.
    camera.updateMatrixWorld();
    player.pos.set(s.x, EYE, s.z);
    player.yaw = s.yaw;
    player.pitch = s.pitch;
    player.air = s.y;

    // 화면에 실제로 보이는 대상 중 가장 중앙에 가까운 것을 고른다.
    // 거리만으로 고르면 A 원통을 보면서 뒤의 이산을 선택하는 식의 오작동이 생긴다.
    // 기존 대상을 조금 우대해(히스테리시스) 걷거나 고개를 움직일 때 버튼이 깜빡이지 않게 한다.
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of zone.items) {
      if (it.when && !it.when()) continue;
      const d = Math.hypot(it.pos.x - s.x, it.pos.z - s.z);
      // Dialogue targets are usable from farther away; machinery keeps its tighter range.
      const reach = it.radius + (it.kind === "npc" ? 2.0 : it.kind === "statue" ? 1.5 : 0);
      if (d > reach) continue;
      screenPt.current.copy(it.pos).project(camera);
      const { x, y, z } = screenPt.current;
      if (z < -1 || z >= 1 || Math.abs(x) > 1.08 || Math.abs(y) > 1.08) continue;
      const center = Math.hypot(x, y * 0.82);
      const score = center * 2.15 + d * 0.12 + (s.near === it.id ? 0 : 0.26);
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }

    // HUD 연결선의 종점은 3D 장치 중심이 아닌, 누르면 실제 반응하는 부분을 가리킨다.
    // A의 경우 조준 원통 또는 선택 레버의 기존 투영 좌표를 공유한다.
    interactionProjection.id = best?.id ?? null;
    if (best) {
      let screen: [number, number] | undefined;
      if (best.id === "face-machine") screen = faceRt.screen[`drum-${faceRt.aim}`];
      else if (best.id === "face-std") screen = faceRt.screen.std;
      else if (best.id === "face-keep") screen = faceRt.screen.keep;
      if (screen && screen[0] >= 0 && screen[0] <= 1 && screen[1] >= 0 && screen[1] <= 1) {
        interactionProjection.x = screen[0];
        interactionProjection.y = screen[1];
        interactionProjection.visible = true;
      } else {
        screenPt.current.copy(best.pos).project(camera);
        interactionProjection.x = (screenPt.current.x + 1) / 2;
        interactionProjection.y = (1 - screenPt.current.y) / 2;
        interactionProjection.visible = Math.abs(screenPt.current.x) < 0.94 && Math.abs(screenPt.current.y) < 0.94 && screenPt.current.z < 1;
      }
    } else clearInteractionProjection();

    const id = best?.id ?? null;
    if (id !== s.near) {
      s.near = id;
      onNear(best);
    }
  });

  return null;
}
