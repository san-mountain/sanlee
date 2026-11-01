"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useTexture, RoundedBox } from "@react-three/drei";
import type { Lang, SectionId } from "@/data/site";
import { works } from "@/data/site";
import { concreteTexture, hazardTexture } from "./textures";
import { BUNKER_H, BUNKER_NPCS, BUNKER_Z0, BUNKER_Z1, PAINTINGS, PILLARS, TERMINALS } from "./zones";
import { Human, Tap, useSign, type TapFn } from "./parts";
import Statue, { Pedestal } from "./Statue";
import SanNPC from "./SanNPC";
import { BUNKER } from "./zones";

const W = 12; // 방의 반폭
const LEN = BUNKER_Z1 - BUNKER_Z0;
const MIDZ = (BUNKER_Z1 + BUNKER_Z0) / 2;

function useConcrete(rx: number, ry: number, seed: number, tone?: number) {
  return useMemo(() => {
    const t = concreteTexture(seed, tone);
    t.repeat.set(rx, ry);
    return t;
  }, [rx, ry, seed, tone]);
}

function Room() {
  const floor = useConcrete(6, 8, 3, 46);
  const wallSide = useConcrete(LEN / 4, 2, 5);
  const wallEnd = useConcrete(W / 2, 2, 8);
  const ceil = useConcrete(6, 8, 11, 36);
  const hazard = useMemo(() => {
    const t = hazardTexture();
    t.repeat.set(10, 1);
    return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, MIDZ]} receiveShadow>
        <planeGeometry args={[W * 2, LEN]} />
        <meshStandardMaterial map={floor} roughness={0.55} metalness={0.15} color="#9a9a9a" />
      </mesh>
      {/* 바닥의 물웅덩이: 반사가 강한 얇은 판 */}
      {[
        [-3, 7, 2.2, 1.3],
        [4.5, -6, 1.6, 2.4],
        [-7.5, -15, 2.4, 1.2],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, i]} position={[x, 0.006, z]} scale={[w, d, 1]}>
          <circleGeometry args={[1, 24]} />
          <meshStandardMaterial color="#0d0f12" roughness={0.05} metalness={0.9} transparent opacity={0.8} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, BUNKER_H, MIDZ]}>
        <planeGeometry args={[W * 2, LEN]} />
        <meshStandardMaterial map={ceil} roughness={1} color="#777" />
      </mesh>
      {/* 좌우 벽 */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh rotation={[0, (-s * Math.PI) / 2, 0]} position={[s * W, BUNKER_H / 2, MIDZ]}>
            <planeGeometry args={[LEN, BUNKER_H]} />
            <meshStandardMaterial map={wallSide} roughness={0.95} color="#b4b2ad" />
          </mesh>
          {/* 아래쪽은 짙은 녹색 페인트 */}
          <mesh rotation={[0, (-s * Math.PI) / 2, 0]} position={[s * (W - 0.01), 0.65, MIDZ]}>
            <planeGeometry args={[LEN, 1.3]} />
            <meshStandardMaterial color="#1f2d27" roughness={0.6} />
          </mesh>
          <mesh rotation={[0, (-s * Math.PI) / 2, 0]} position={[s * (W - 0.012), 1.31, MIDZ]}>
            <planeGeometry args={[LEN, 0.04]} />
            <meshStandardMaterial color="#c9a227" roughness={0.6} />
          </mesh>
          {/* 천장 쪽 배관 */}
          {[0, 1, 2].map((k) => (
            <mesh key={k} rotation={[Math.PI / 2, 0, 0]} position={[s * (W - 0.35 - k * 0.32), BUNKER_H - 0.45 - (k % 2) * 0.25, MIDZ]}>
              <cylinderGeometry args={[0.11 + k * 0.03, 0.11 + k * 0.03, LEN, 10]} />
              <meshStandardMaterial color={k === 1 ? "#5b3b2a" : "#4a4f55"} metalness={0.7} roughness={0.45} />
            </mesh>
          ))}
        </group>
      ))}
      {/* 앞뒤 벽 (뒤쪽 벽에는 방폭문 구멍) */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, BUNKER_H / 2, BUNKER_Z1]}>
        <planeGeometry args={[W * 2, BUNKER_H]} />
        <meshStandardMaterial map={wallEnd} roughness={0.95} color="#b4b2ad" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 7.75, BUNKER_H / 2, BUNKER_Z0]}>
          <planeGeometry args={[8.5, BUNKER_H]} />
          <meshStandardMaterial map={wallEnd} roughness={0.95} color="#b4b2ad" />
        </mesh>
      ))}
      <mesh position={[0, 5.75, BUNKER_Z0]}>
        <planeGeometry args={[7, 3.5]} />
        <meshStandardMaterial map={wallEnd} roughness={0.95} color="#b4b2ad" />
      </mesh>
      {/* 방폭문 앞 위험 표시 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, BUNKER_Z0 + 2.2]}>
        <planeGeometry args={[8, 0.35]} />
        <meshStandardMaterial map={hazard} roughness={0.7} />
      </mesh>
      {/* 천장 보 */}
      {Array.from({ length: 7 }, (_, i) => BUNKER_Z1 - 2 - i * 5).map((z) => (
        <mesh key={z} position={[0, BUNKER_H - 0.25, z]}>
          <boxGeometry args={[W * 2, 0.5, 0.6]} />
          <meshStandardMaterial color="#5c5b58" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// 형광등: 하나는 고장 나서 깜빡임
function Fixtures() {
  const flick = useRef<THREE.MeshBasicMaterial>(null);
  const flickLight = useRef<THREE.PointLight>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const on = Math.sin(t * 23) > -0.2 || Math.sin(t * 3.1) > 0.6 ? (Math.sin(t * 0.9) > -0.85 ? 1 : 0.1) : 0.15;
    if (flick.current) flick.current.color.setScalar(on * 1.4);
    if (flickLight.current) flickLight.current.intensity = 100 * on;
  });
  const rows = [9.5, 2.5, -4.5, -11.5];
  return (
    <group>
      {rows.flatMap((z, i) =>
        [-4.5, 4.5].map((x, j) => (
          <mesh key={`${i}-${j}`} position={[x, BUNKER_H - 0.06, z]}>
            <boxGeometry args={[2.4, 0.08, 0.22]} />
            <meshBasicMaterial ref={i === 2 && j === 1 ? flick : undefined} color="#eef6ff" toneMapped={false} />
          </mesh>
        ))
      )}
      <pointLight position={[0, 6.6, 9.5]} intensity={140} distance={22} color="#dfe9ff" />
      <pointLight position={[0, 6.6, -11.5]} intensity={130} distance={22} color="#dfe9ff" />
      <pointLight ref={flickLight} position={[4.5, 6.6, -4.5]} intensity={100} distance={16} color="#dfe9ff" />
    </group>
  );
}

function Pillars() {
  const hazard = useMemo(() => {
    const t = hazardTexture();
    t.repeat.set(2, 1);
    return t;
  }, []);
  const tex = useConcrete(1, 3, 21);
  return (
    <group>
      {PILLARS.map(([x, , z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, BUNKER_H / 2, 0]}>
            <boxGeometry args={[1.2, BUNKER_H, 1.2]} />
            <meshStandardMaterial map={tex} color="#a8a6a2" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[1.22, 0.5, 1.22]} />
            <meshStandardMaterial map={hazard} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Terminal({ id, pos, rotY, color, lang, visited, onTap }: { id: SectionId; pos: [number, number, number]; rotY: number; color: string; lang: Lang; visited: boolean; onTap: TapFn }) {
  const ko = { about: "소개", works: "작업", writing: "글" }[id];
  const screen = useSign(
    [
      [id.toUpperCase(), 2.2],
      [lang === "ko" ? ko : `ARCHIVE / ${id}`, 1],
      [visited ? (lang === "ko" ? "✓ 복원 완료" : "✓ RESTORED") : lang === "ko" ? "▸ 기록 손상됨" : "▸ RECORD CORRUPTED", 0.9],
    ],
    { color, bg: "#03060a", mono: true, glow: true, w: 512, h: 320 }
  );
  const sign = useSign([[id.toUpperCase(), 1]], { color, glow: true, mono: true, w: 512, h: 128 });
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    if (glow.current) glow.current.opacity = 0.35 + Math.sin(s.clock.elapsedTime * 2 + pos[2]) * 0.15;
  });
  return (
    <Tap id={id} onTap={onTap}>
      <group position={pos} rotation={[0, rotY, 0]}>
        {/* 본체 */}
        <RoundedBox args={[1.5, 1.05, 0.8]} radius={0.06} position={[0, 0.52, -0.3]}>
          <meshStandardMaterial color="#2b2f36" metalness={0.6} roughness={0.45} />
        </RoundedBox>
        <mesh position={[0, 1.06, 0.02]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[1.3, 0.05, 0.45]} />
          <meshStandardMaterial color="#1a1d22" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* 비스듬한 모니터 */}
        <group position={[0, 1.65, -0.45]} rotation={[-0.22, 0, 0]}>
          <RoundedBox args={[1.45, 0.95, 0.14]} radius={0.04}>
            <meshStandardMaterial color="#1e2228" metalness={0.6} roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0, 0.075]}>
            <planeGeometry args={[1.3, 0.8]} />
            <meshBasicMaterial map={screen} toneMapped={false} />
          </mesh>
        </group>
        {/* 벽의 네온 간판 */}
        <mesh position={[0, 3.35, -1.08]}>
          <planeGeometry args={[2.6, 0.65]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
        {/* 바닥 빛 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.6]}>
          <ringGeometry args={[0.55, 0.75, 40]} />
          <meshBasicMaterial ref={glow} color={color} transparent toneMapped={false} />
        </mesh>
        {/* 케이블 */}
        {[-0.4, 0.1, 0.45].map((x, i) => (
          <mesh key={i} position={[x, 0.04, -0.85]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.4 + i * 0.2, 6]} />
            <meshStandardMaterial color="#111" roughness={0.6} />
          </mesh>
        ))}
        <pointLight position={[0, 1.8, 0.4]} intensity={visited ? 30 : 18} distance={7} color={color} />
      </group>
    </Tap>
  );
}

function Paintings({ onTap }: { onTap: TapFn }) {
  const tex = useTexture(PAINTINGS.map((p) => p.w.image!));
  tex.forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  });
  return (
    <group>
      {PAINTINGS.map((p, i) => {
        const w = works[p.work];
        const ratio = (w.width ?? 4) / (w.height ?? 3);
        const max = 2.1;
        const pw = ratio >= 1 ? max : max * ratio;
        const ph = ratio >= 1 ? max / ratio : max;
        return (
          <Tap key={p.work} id={`painting-${p.work}`} onTap={onTap}>
            <group position={p.pos} rotation={[0, p.rotY, 0]}>
              <mesh position={[0, 0, 0.03]}>
                <boxGeometry args={[pw + 0.16, ph + 0.16, 0.06]} />
                <meshStandardMaterial color="#141414" roughness={0.6} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0, 0.065]}>
                <planeGeometry args={[pw, ph]} />
                <meshBasicMaterial map={tex[i]} color="#d8d8d8" toneMapped={false} />
              </mesh>
              {/* 그림등 */}
              <mesh position={[0, ph / 2 + 0.35, 0.28]}>
                <boxGeometry args={[0.7, 0.06, 0.1]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, ph / 2 + 0.31, 0.3]}>
                <boxGeometry args={[0.6, 0.015, 0.05]} />
                <meshBasicMaterial color="#fff4dc" toneMapped={false} />
              </mesh>
              <mesh position={[0, 0.1, 0.34]} rotation={[0.12, 0, 0]}>
                <coneGeometry args={[pw * 0.62, ph + 0.4, 20, 1, true]} />
                <meshBasicMaterial color="#fff2d0" transparent opacity={0.018} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            </group>
          </Tap>
        );
      })}
    </group>
  );
}

function BlastDoor({ lang, onTap }: { lang: Lang; onTap: TapFn }) {
  const beacon = useRef<THREE.Group>(null);
  const red = useRef<THREE.PointLight>(null);
  const hazard = useMemo(() => {
    const t = hazardTexture();
    t.repeat.set(3, 1);
    return t;
  }, []);
  const sign = useSign([[lang === "ko" ? "지상 출구" : "SURFACE EXIT", 1.3], ["▲ 감시구역 7 · ZONE 7", 0.7]], { color: "#ff3b3b", glow: true, mono: true, w: 512, h: 160 });
  useFrame((s, dt) => {
    if (beacon.current) beacon.current.rotation.y += dt * 4;
    if (red.current) red.current.intensity = 45 + Math.sin(s.clock.elapsedTime * 4) * 30;
  });
  const z = BUNKER_Z0;
  return (
    <Tap id="exit" onTap={onTap}>
      <group position={[0, 0, z]}>
        {/* 문틀 */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 3.75, 2.2, 0.15]}>
            <boxGeometry args={[0.6, 4.4, 0.7]} />
            <meshStandardMaterial color="#3b3e44" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 4.2, 0.15]}>
          <boxGeometry args={[8.1, 0.6, 0.7]} />
          <meshStandardMaterial color="#3b3e44" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* 문짝 두 장 */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 1.72, 1.95, -0.05]}>
            <mesh>
              <boxGeometry args={[3.42, 3.9, 0.35]} />
              <meshStandardMaterial color="#565b62" metalness={0.75} roughness={0.38} />
            </mesh>
            <mesh position={[0, -1.6, 0.18]}>
              <planeGeometry args={[3.42, 0.5]} />
              <meshStandardMaterial map={hazard} roughness={0.6} />
            </mesh>
            {[-1.2, 0, 1.2].map((y) => (
              <mesh key={y} position={[0, y, 0.19]}>
                <boxGeometry args={[3.2, 0.08, 0.04]} />
                <meshStandardMaterial color="#3a3e44" metalness={0.8} roughness={0.35} />
              </mesh>
            ))}
          </group>
        ))}
        {/* 가운데 잠금 핸들 */}
        <mesh position={[0, 2, 0.25]}>
          <torusGeometry args={[0.55, 0.06, 8, 24]} />
          <meshStandardMaterial color="#9a7b2c" metalness={0.85} roughness={0.3} />
        </mesh>
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((r) => (
          <mesh key={r} position={[0, 2, 0.25]} rotation={[0, 0, r]}>
            <boxGeometry args={[1.1, 0.06, 0.06]} />
            <meshStandardMaterial color="#9a7b2c" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 4.95, 0.05]}>
          <planeGeometry args={[3.6, 1.1]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
        {/* 회전 경광등 */}
        <group position={[0, 4.62, 0.5]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.18, 0.22, 12]} />
            <meshBasicMaterial color="#ff2020" toneMapped={false} />
          </mesh>
          <group ref={beacon}>
            <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.7, 2.4, 16, 1, true]} />
              <meshBasicMaterial color="#ff2020" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
        <pointLight ref={red} position={[0, 4, 1.6]} distance={12} color="#ff2a2a" />
      </group>
    </Tap>
  );
}

function Keeper({ onTap }: { onTap: TapFn }) {
  const { pos, rotY } = BUNKER_NPCS.keeper;
  return (
    <Tap id="keeper" onTap={onTap}>
      <Human position={pos} rotationY={rotY} color="#3d4434" skin="#c4a68e" hood="#2b3026" />
      {/* 책상, 모니터, 스탠드 */}
      <group position={[-4.6, 0, -18.6]}>
        <mesh position={[0, 0.78, 0]}>
          <boxGeometry args={[2.6, 0.06, 1]} />
          <meshStandardMaterial color="#4a3a2c" roughness={0.8} />
        </mesh>
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, 0.39, 0]}>
            <boxGeometry args={[0.08, 0.78, 0.9]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
        ))}
        {[-0.6, 0.35].map((x, i) => (
          <group key={x} position={[x, 1.08, -0.15]} rotation={[0, i ? -0.25 : 0.2, 0]}>
            <mesh>
              <boxGeometry args={[0.62, 0.48, 0.4]} />
              <meshStandardMaterial color="#c9c2b0" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.02, 0.205]}>
              <planeGeometry args={[0.5, 0.36]} />
              <meshBasicMaterial color={i ? "#36ff8a" : "#ffb347"} toneMapped={false} transparent opacity={0.8} />
            </mesh>
          </group>
        ))}
        <mesh position={[1.0, 1.15, 0.1]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0.82, 1.45, 0.1]}>
          <coneGeometry args={[0.12, 0.16, 12, 1, true]} />
          <meshStandardMaterial color="#2c4a3a" side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0.8, 1.3, 0.2]} intensity={4} distance={4} color="#ffcf8a" />
      </group>
    </Tap>
  );
}

// 은퇴한 수락 로봇 R-07: 바닥을 닦고 있다
function R07({ onTap }: { onTap: TapFn }) {
  const ref = useRef<THREE.Group>(null);
  const eye = useRef<THREE.MeshBasicMaterial>(null);
  const { pos, rotY } = BUNKER_NPCS.r07;
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y = rotY + Math.sin(t * 0.8) * 0.5;
      ref.current.position.y = Math.abs(Math.sin(t * 3)) * 0.02;
    }
    if (eye.current) eye.current.color.setScalar(Math.sin(t * 0.6) > 0.97 ? 0.1 : 1);
  });
  return (
    <Tap id="r07" onTap={onTap}>
      <group position={pos}>
        <group ref={ref}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.38, 0.42, 0.22, 20]} />
            <meshStandardMaterial color="#2f3338" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <capsuleGeometry args={[0.33, 0.55, 6, 16]} />
            <meshStandardMaterial color="#d6cdb8" metalness={0.3} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.72, 0.31]}>
            <boxGeometry args={[0.36, 0.22, 0.06]} />
            <meshStandardMaterial color="#c9a227" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.18, 0.2]}>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.18, 0.29]}>
            <circleGeometry args={[0.07, 16]} />
            <meshBasicMaterial ref={eye} color="#22f0ff" toneMapped={false} />
          </mesh>
          {/* 부러진 안테나 */}
          <mesh position={[0.12, 1.42, 0]} rotation={[0, 0, -0.6]}>
            <cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />
            <meshStandardMaterial color="#666" />
          </mesh>
          {/* 팔과 대걸레 */}
          <mesh position={[0.36, 0.8, 0.15]} rotation={[0.5, 0, -0.3]}>
            <capsuleGeometry args={[0.04, 0.4, 4, 8]} />
            <meshStandardMaterial color="#555" metalness={0.6} />
          </mesh>
          <mesh position={[0.48, 0.55, 0.42]} rotation={[0.55, 0, -0.15]}>
            <cylinderGeometry args={[0.02, 0.02, 1.3, 6]} />
            <meshStandardMaterial color="#7a5a32" />
          </mesh>
          <mesh position={[0.56, 0.06, 0.8]}>
            <boxGeometry args={[0.4, 0.08, 0.16]} />
            <meshStandardMaterial color="#8a8578" roughness={1} />
          </mesh>
        </group>
      </group>
    </Tap>
  );
}

function WallText({ lang }: { lang: Lang }) {
  const big = useSign([["B-7", 1]], { color: "#c9a227", w: 512, h: 256 });
  const warn = useSign(
    [
      [lang === "ko" ? "비인가 신호 차단 구역" : "SIGNAL-FREE ZONE", 1],
      [lang === "ko" ? "쿠키 · 추적 · 점수 없음" : "NO COOKIES · NO TRACKING · NO SCORES", 0.6],
    ],
    { color: "#d8d2c0", w: 1024, h: 256 }
  );
  return (
    <group>
      <mesh position={[0, 4.6, BUNKER_Z1 - 0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[4, 2]} />
        <meshBasicMaterial map={big} transparent opacity={0.75} />
      </mesh>
      <mesh position={[-11.97, 4.7, -1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6, 1.5]} />
        <meshBasicMaterial map={warn} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export default function Bunker({ lang, visited, onTap }: { lang: Lang; visited: SectionId[]; onTap: TapFn }) {
  return (
    <group>
      <color attach="background" args={["#060607"]} />
      <fog attach="fog" args={["#0a0a0b", 14, 46]} />
      <ambientLight intensity={0.9} color="#d9d2c4" />
      <hemisphereLight args={["#b9c6d6", "#2a2620", 0.8]} />
      <Room />
      <Fixtures />
      <Pillars />
      <WallText lang={lang} />
      {TERMINALS.map((t) => (
        <Terminal key={t.id} {...t} lang={lang} visited={visited.includes(t.id)} onTap={onTap} />
      ))}
      <Paintings onTap={onTap} />
      <BlastDoor lang={lang} onTap={onTap} />
      <Keeper onTap={onTap} />
      <R07 onTap={onTap} />
      {visited.length >= TERMINALS.length ? (
        <>
          <Pedestal lang={lang} empty />
          <SanNPC mode="wander" item={BUNKER.items.find((i) => i.id === "statue")!} onTap={onTap} start={[0, 3]} />
        </>
      ) : (
        <Tap id="statue" onTap={onTap}>
          <Statue restored={visited.length} lang={lang} />
        </Tap>
      )}
      <spotLight position={[0, BUNKER_H - 0.2, 4]} target-position={[0, 2.5, 0]} angle={0.5} penumbra={0.6} intensity={120} distance={16} color="#f2efe8" />
      <Sparkles count={60} scale={[22, 6, 30]} position={[0, 3.5, MIDZ]} size={1.6} speed={0.15} color="#d8d2c0" opacity={0.5} />
    </group>
  );
}
