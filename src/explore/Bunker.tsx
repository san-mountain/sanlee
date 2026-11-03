"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useTexture, RoundedBox } from "@react-three/drei";
import type { Lang, SectionId } from "@/data/site";
import { works } from "@/data/site";
import { concreteTexture, hazardTexture } from "./textures";
import { BACKUP_RACK, BUNKER_H, BUNKER_NPCS, BUNKER_Z0, BUNKER_Z1, PAINTINGS, PILLARS, TERMINALS } from "./zones";
import { Human, Tap, useSign, type TapFn } from "./parts";
import Statue, { Pedestal } from "./Statue";
import SanNPC from "./SanNPC";
import { player } from "./Player";
import { BUNKER } from "./zones";
import { LotusStrings } from "./CityAlleys";
import BunkerBell from "./BunkerBell";
import { useLightPool } from "./atmosphere";

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

function Paintings({ lang }: { lang: Lang }) {
  const tex = useTexture(PAINTINGS.map((p) => p.w.image!));
  const wallWash = useLightPool("#ffe6c0", 2.4, "top");
  const paintWash = useLightPool("#fff0d8", 0.3, "top");
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
          <group key={p.work}>
            <group position={p.pos} rotation={[0, p.rotY, 0]}>
              <HoloCaption work={p.work} lang={lang} x={pw / 2 + 0.85} />
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
              {/* 그림등이 닿은 자리: 위에서 아래로 옅어지는 빛. 공중에 빛기둥을 세우지 않아 그림을 가리지 않는다 */}
              <mesh position={[0, 0.12, 0.004]} material={wallWash}>
                <planeGeometry args={[pw + 1.2, ph + 0.9]} />
              </mesh>
              <mesh position={[0, 0, 0.067]} material={paintWash}>
                <planeGeometry args={[pw, ph]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

// 그림 옆 벽에 떠오르는 홀로그램 캡션: 가까이 가면 켜지고, 멀어지면 꺼진다
function captionTexture(work: number, lang: Lang) {
  const w = works[work];
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 512, 320);
  g.fillStyle = "rgba(10,40,60,0.35)";
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "rgba(127,246,255,0.9)";
  g.lineWidth = 3;
  g.strokeRect(6, 6, 500, 308);
  g.fillStyle = "rgba(127,246,255,0.9)";
  g.fillRect(6, 6, 60, 6);
  g.textBaseline = "top";
  g.shadowColor = "#22f0ff";
  g.shadowBlur = 12;
  g.fillStyle = "#e8feff";
  const title = lang === "ko" ? `〈${w.title.ko}〉` : w.title.en;
  g.font = `600 ${lang === "ko" ? 50 : 44}px "Noto Sans KR", system-ui, sans-serif`;
  g.fillText(title, 30, 44, 452);
  g.font = `400 30px "Noto Sans KR", system-ui, sans-serif`;
  g.fillStyle = "#bdf9ff";
  g.fillText(`${w.date.slice(0, 4)}`, 30, 128, 452);
  g.fillText(w.medium[lang], 30, 172, 452);
  g.fillText(w.size[lang], 30, 216, 452);
  g.shadowBlur = 0;
  g.fillStyle = "rgba(127,246,255,0.08)";
  for (let y = 0; y < 320; y += 4) g.fillRect(0, y, 512, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function HoloCaption({ work, lang, x }: { work: number; lang: Lang; x: number }) {
  const tex = useMemo(() => captionTexture(work, lang), [work, lang]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const ref = useRef<THREE.Group>(null);
  const k = useRef(0);
  const wp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.getWorldPosition(wp);
    const d = Math.hypot(wp.x - player.pos.x, wp.z - player.pos.z);
    const target = d < 4.2 ? 1 : 0;
    k.current += (target - k.current) * Math.min(1, dt * 5);
    const flick = k.current > 0.05 && Math.random() < 0.04 ? 0.45 : 1;
    if (mat.current) mat.current.opacity = k.current * 0.95 * flick;
    if (beam.current) beam.current.opacity = k.current * 0.05;
    g.scale.y = 0.2 + k.current * 0.8;
    g.visible = k.current > 0.01;
  });
  return (
    <group ref={ref} position={[x, -0.15, 0.12]}>
      <mesh>
        <planeGeometry args={[1.25, 0.78]} />
        <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {/* 아래 벽의 작은 투사기와 빛줄기 */}
      <mesh position={[0, -0.75, -0.04]}>
        <boxGeometry args={[0.3, 0.05, 0.1]} />
        <meshStandardMaterial color="#1c2a30" metalness={0.8} roughness={0.3} emissive="#0a3a44" />
      </mesh>
      <mesh position={[0, -0.57, 0]}>
        <planeGeometry args={[1.0, 0.32]} />
        <meshBasicMaterial ref={beam} color="#22f0ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
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

/* ---------- 불단 앞에서 좌선하는 스님 ---------- */
function Monk({ onTap }: { onTap: TapFn }) {
  const { pos, rotY } = BUNKER_NPCS.monk;
  const flame = useRef<THREE.PointLight>(null);
  useFrame((s) => {
    if (flame.current) flame.current.intensity = 5 + Math.sin(s.clock.elapsedTime * 13) * 0.8 + Math.sin(s.clock.elapsedTime * 7.3) * 0.6;
  });
  return (
    <Tap id="monk" onTap={onTap}>
      <group position={pos} rotation={[0, rotY, 0]}>
        {/* 가부좌: 넓게 접은 다리 위에 몸통 */}
        <mesh position={[0, 0.16, 0]} scale={[0.55, 0.16, 0.42]}>
          <sphereGeometry args={[1, 20, 12]} />
          <meshStandardMaterial color="#6e6a62" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.58, -0.04]}>
          <cylinderGeometry args={[0.2, 0.32, 0.72, 16]} />
          <meshStandardMaterial color="#6e6a62" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.6, 0]} rotation={[0, 0, 0.55]}>
          <boxGeometry args={[0.1, 0.8, 0.5]} />
          <meshStandardMaterial color="#8a3a1a" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.08, 0]}>
          <sphereGeometry args={[0.13, 18, 14]} />
          <meshStandardMaterial color="#c9a68a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.36, 0.22]} scale={[0.18, 0.06, 0.1]}>
          <sphereGeometry args={[1, 10, 6]} />
          <meshStandardMaterial color="#c9a68a" roughness={0.6} />
        </mesh>
      </group>
      {/* 불단: 낮은 상, 작은 좌상의 실루엣, 초, 향 */}
      <group position={[-9.6, 0, -19.3]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[2.2, 0.9, 0.9]} />
          <meshStandardMaterial color="#4a1c14" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[2.3, 0.05, 1]} />
          <meshStandardMaterial color="#c9a227" metalness={0.7} roughness={0.4} />
        </mesh>
        <group position={[0, 0.95, -0.15]}>
          <mesh position={[0, 0.14, 0]} scale={[0.32, 0.12, 0.22]}>
            <sphereGeometry args={[1, 14, 8]} />
            <meshStandardMaterial color="#8a6a2a" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.1, 0.16, 0.4, 12]} />
            <meshStandardMaterial color="#8a6a2a" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.1, 14, 10]} />
            <meshStandardMaterial color="#8a6a2a" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.66, -0.08]}>
            <torusGeometry args={[0.22, 0.012, 6, 32]} />
            <meshBasicMaterial color="#ffd08a" toneMapped={false} />
          </mesh>
        </group>
        {[-0.75, 0.75].map((x) => (
          <group key={x} position={[x, 0.95, 0.2]}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
              <meshStandardMaterial color="#efe8d8" />
            </mesh>
            <mesh position={[0, 0.24, 0]}>
              <sphereGeometry args={[0.025, 6, 4]} />
              <meshBasicMaterial color="#ffcf6a" toneMapped={false} />
            </mesh>
          </group>
        ))}
        <pointLight ref={flame} position={[0, 1.4, 0.6]} distance={6} color="#ffb060" />
        <Sparkles count={12} scale={[0.4, 1.4, 0.4]} position={[0.3, 1.7, 0.2]} size={6} speed={0.2} color="#ccc" opacity={0.3} />
      </group>
    </Tap>
  );
}

/* ---------- 무전수: 헤드폰을 쓰고 지상 주파수를 듣는다 ---------- */
function Radio({ onTap }: { onTap: TapFn }) {
  const { pos, rotY } = BUNKER_NPCS.radio;
  const led = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    if (led.current) led.current.color.setRGB(1, 0.6, 0.1).multiplyScalar(Math.sin(s.clock.elapsedTime * 8) > 0.3 ? 1 : 0.2);
  });
  return (
    <Tap id="radio" onTap={onTap}>
      <Human position={pos} rotationY={rotY} color="#4a3a2a" skin="#c49a7a">
        <mesh position={[0, 1.64, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.13, 0.015, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * 0.13, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        ))}
      </Human>
      <group position={[10.9, 0, -16.8]}>
        <mesh position={[0, 0.76, 0]}>
          <boxGeometry args={[1.1, 0.06, 2.2]} />
          <meshStandardMaterial color="#3a3026" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.9, 0.76, 2]} />
          <meshStandardMaterial color="#26221c" roughness={0.9} />
        </mesh>
        <mesh position={[0.1, 1.0, 0]}>
          <boxGeometry args={[0.5, 0.42, 0.9]} />
          <meshStandardMaterial color="#5a5a4a" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[-0.16, 1.02, 0.15]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 0.18]} />
          <meshBasicMaterial color="#ffb347" toneMapped={false} transparent opacity={0.85} />
        </mesh>
        <mesh position={[-0.16, 1.12, -0.28]}>
          <sphereGeometry args={[0.025, 6, 4]} />
          <meshBasicMaterial ref={led} color="#ff9a1a" toneMapped={false} />
        </mesh>
        <mesh position={[0.2, 1.65, -0.3]}>
          <cylinderGeometry args={[0.01, 0.01, 0.9, 4]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      </group>
    </Tap>
  );
}

/* ---------- 음향 담당: 헤드폰을 쓰고 믹서 앞에서 고개를 까딱인다 ---------- */
function Dj({ onTap }: { onTap: TapFn }) {
  const { pos, rotY } = BUNKER_NPCS.dj;
  const head = useRef<THREE.Group>(null);
  const meters = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (head.current) head.current.rotation.x = Math.max(0, Math.sin(t * 7.4)) * 0.12;
    meters.current.forEach((m, i) => {
      if (m) m.scale.y = 0.25 + Math.abs(Math.sin(t * (5 + i * 1.7) + i)) * 0.75;
    });
  });
  return (
    <Tap id="dj" onTap={onTap}>
      <Human position={pos} rotationY={rotY} color="#2c3440" skin="#c9a184">
        <group ref={head} position={[0, 1.5, 0]}>
          <mesh position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.13, 0.016, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#ff2bd6" emissive="#ff2bd6" emissiveIntensity={0.4} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} position={[k * 0.13, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.055, 0.055, 0.045, 12]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          ))}
        </group>
      </Human>
      <group position={[-10.3, 0, -7.4]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.8, 0.8, 1.6]} />
          <meshStandardMaterial color="#24211d" roughness={0.9} />
        </mesh>
        <mesh position={[0.05, 0.86, 0]} rotation={[0, 0, 0.12]}>
          <boxGeometry args={[0.6, 0.08, 1.3]} />
          <meshStandardMaterial color="#3b3d44" metalness={0.4} roughness={0.5} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} ref={(m) => { meters.current[i] = m; }} position={[0.36, 0.95, -0.45 + i * 0.18]}>
            <boxGeometry args={[0.02, 0.14, 0.08]} />
            <meshBasicMaterial color={i > 3 ? "#ff2bd6" : "#22f0ff"} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </Tap>
  );
}

/* ---------- 벽에 분필 그림을 그리는 아이 ---------- */
function useChalkTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.strokeStyle = "rgba(240,236,220,0.85)";
    g.lineWidth = 5;
    g.lineCap = "round";
    // 손잡은 사람 둘, 해, 집, 그리고 하늘에 뜬 섬
    const person = (x: number, s: number) => {
      g.beginPath();
      g.arc(x, 150 - 40 * s, 14 * s, 0, Math.PI * 2);
      g.moveTo(x, 150 - 26 * s);
      g.lineTo(x, 150 + 20 * s);
      g.moveTo(x - 20 * s, 150 - 6 * s);
      g.lineTo(x + 20 * s, 150 - 6 * s);
      g.moveTo(x, 150 + 20 * s);
      g.lineTo(x - 14 * s, 150 + 50 * s);
      g.moveTo(x, 150 + 20 * s);
      g.lineTo(x + 14 * s, 150 + 50 * s);
      g.stroke();
    };
    person(150, 1.1);
    person(195, 0.8);
    g.beginPath();
    g.arc(420, 60, 26, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.moveTo(420 + Math.cos(a) * 34, 60 + Math.sin(a) * 34);
      g.lineTo(420 + Math.cos(a) * 48, 60 + Math.sin(a) * 48);
    }
    g.stroke();
    g.beginPath();
    g.moveTo(260, 70);
    g.lineTo(340, 70);
    g.lineTo(300, 120);
    g.closePath();
    g.stroke();
    g.font = "700 30px sans-serif";
    g.fillStyle = "rgba(140,220,255,0.85)";
    g.fillText("모두 거부", 300, 220);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Kid({ onTap }: { onTap: TapFn }) {
  const { pos, rotY } = BUNKER_NPCS.kid;
  const chalk = useChalkTexture();
  const arm = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (arm.current) arm.current.position.x = 0.18 + Math.sin(s.clock.elapsedTime * 3) * 0.06;
  });
  return (
    <Tap id="kid" onTap={onTap}>
      <group position={pos} rotation={[0, rotY, 0]} scale={0.62}>
        <Human position={[0, 0, 0]} color="#c8402a" skin="#e0c4ac" hood="#1a1a1e" />
        <mesh ref={arm} position={[0.18, 1.5, 0.28]} rotation={[-1.2, 0, 0]}>
          <capsuleGeometry args={[0.05, 0.4, 4, 8]} />
          <meshStandardMaterial color="#c8402a" />
        </mesh>
      </group>
      <mesh position={[pos[0] - 0.3, 1.25, BUNKER_Z0 + 0.02]}>
        <planeGeometry args={[3.2, 1.6]} />
        <meshBasicMaterial map={chalk} transparent />
      </mesh>
    </Tap>
  );
}

/* ---------- 간이침대에서 잠든 사람 ---------- */
/* ---------- 끊긴 백업 단말: 서버 랙 하나, 붉은 불빛만 깜빡인다 ---------- */
function BackupRack({ lang, onTap }: { lang: Lang; onTap: TapFn }) {
  const { pos, rotY } = BACKUP_RACK;
  const screen = useSign(
    [
      ["BACKUP", 1.6],
      [lang === "ko" ? "신호 끊김" : "SIGNAL LOST", 0.9],
    ],
    { color: "#ff4a5a", bg: "#0a0204", mono: true, glow: true, w: 512, h: 256 }
  );
  const leds = useRef<THREE.Group>(null);
  useFrame((s) => {
    leds.current?.children.forEach((c, i) => {
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(s.clock.elapsedTime * (3 + i * 0.7) + i) > 0.2 ? 1 : 0.15;
    });
  });
  return (
    <Tap id="backup" onTap={onTap}>
      <group position={pos} rotation={[0, rotY, 0]}>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[1.0, 1.8, 0.8]} />
          <meshStandardMaterial color="#1a1c20" metalness={0.7} roughness={0.45} />
        </mesh>
        {[0.35, 0.65, 0.95, 1.25].map((y) => (
          <mesh key={y} position={[0, y, 0.41]}>
            <boxGeometry args={[0.86, 0.22, 0.02]} />
            <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
        <group ref={leds}>
          {[0.35, 0.65, 0.95, 1.25].map((y, i) => (
            <mesh key={y} position={[0.32, y, 0.43]}>
              <boxGeometry args={[0.05, 0.05, 0.01]} />
              <meshBasicMaterial color={i % 2 ? "#ff2a3d" : "#ffb02e"} transparent toneMapped={false} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 1.62, 0.42]}>
          <planeGeometry args={[0.8, 0.4]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        {/* 뽑혀 늘어진 케이블 */}
        <mesh position={[-0.3, 0.05, 0.7]} rotation={[0, 0.4, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.9, 6]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <pointLight position={[0, 1.4, 0.9]} intensity={4} distance={3.5} color="#ff3040" />
      </group>
    </Tap>
  );
}

function Sleeper({ onTap }: { onTap: TapFn }) {
  const { pos } = BUNKER_NPCS.sleeper;
  const chest = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (chest.current) chest.current.scale.y = 0.2 + Math.sin(s.clock.elapsedTime * 1.1) * 0.02;
  });
  return (
    <Tap id="sleeper" onTap={onTap}>
      <group position={[pos[0] - 0.15, 0, pos[2]]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.95, 0.08, 2.1]} />
          <meshStandardMaterial color="#4a5a3a" roughness={0.9} />
        </mesh>
        {[-0.42, 0.42].flatMap((x) =>
          [-0.95, 0.95].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.22, z]}>
              <boxGeometry args={[0.05, 0.44, 0.05]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          ))
        )}
        {/* 담요를 덮은 몸 */}
        <mesh ref={chest} position={[0, 0.58, 0.15]} scale={[0.36, 0.2, 0.85]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color="#7a3a3a" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.6, -0.78]}>
          <sphereGeometry args={[0.13, 14, 10]} />
          <meshStandardMaterial color="#c49a7a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.52, -0.82]} scale={[0.28, 0.08, 0.18]}>
          <boxGeometry />
          <meshStandardMaterial color="#d8d2c0" roughness={1} />
        </mesh>
      </group>
    </Tap>
  );
}

/* ---------- 천장에 건 연등 ---------- */
function BunkerLotus() {
  const strings = useMemo(
    () =>
      [-16, -9, 8].map((z, i) => ({
        a: new THREE.Vector3(-11.8, 6.6, z),
        b: new THREE.Vector3(11.8, 6.6, z),
        sag: 1.1,
        n: 13,
        seed: i * 2,
      })),
    []
  );
  return <LotusStrings strings={strings} />;
}

function WallText({ lang }: { lang: Lang }) {
  const big = useSign([["B-7", 1]], { color: "#c9a227", w: 512, h: 256 });
  const warn = useSign(
    [
      [lang === "ko" ? "비인가 신호 차단 구역" : "SIGNAL-FREE ZONE", 1],
      [lang === "ko" ? "쿠키 · 추적 · 등급 없음" : "NO COOKIES · NO TRACKING · NO GRADES", 0.6],
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

import type { FaceState } from "./faceAuth";
import FaceAuthObjects from "./FaceAuthObjects";

export default function Bunker({ face, lang, visited, onTap, secondStatue, awake }: { face: FaceState; lang: Lang; visited: SectionId[]; onTap: TapFn; secondStatue?: boolean; awake?: boolean }) {
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
      <BunkerBell lang={lang} onTap={onTap} />
      <FaceAuthObjects state={face} onTap={onTap} lang={lang} />
      {TERMINALS.map((t) => (
        <Terminal key={t.id} {...t} lang={lang} visited={visited.includes(t.id)} onTap={onTap} />
      ))}
      <Paintings lang={lang} />
      <BlastDoor lang={lang} onTap={onTap} />
      <Keeper onTap={onTap} />
      <R07 onTap={onTap} />
      <Monk onTap={onTap} />
      <Radio onTap={onTap} />
      <Dj onTap={onTap} />
      <Kid onTap={onTap} />
      <Sleeper onTap={onTap} />
      <BackupRack lang={lang} onTap={onTap} />
      <BunkerLotus />
      {secondStatue ? (
        <>
          {/* 거부 결말: 이산도 다시 보관 처리되어 굳었다. 그 곁에 두 번째 동상이 나란히 앉아 있다 */}
          <group position={[-2.3, 0, 0]} rotation={[0, 0.12, 0]}>
            <Statue restored={0} lang={lang} />
          </group>
          <group position={[2.3, 0, 0]} rotation={[0, -0.12, 0]}>
            <Statue restored={0} lang={lang} second />
          </group>
        </>
      ) : awake || (face.legacy && visited.length >= TERMINALS.length) ? (
        <>
          <Pedestal lang={lang} empty />
          <SanNPC mode="wander" item={BUNKER.items.find((i) => i.id === "statue")!} onTap={onTap} start={[0, 3]} />
        </>
      ) : (
        <Tap id="statue" onTap={onTap}>
          <Statue restored={face.legacy ? visited.length : face.method ? 1 : 0} faceMethod={face.method} lang={lang} />
        </Tap>
      )}
      <spotLight position={[0, BUNKER_H - 0.2, 4]} target-position={[0, 2.5, 0]} angle={0.5} penumbra={0.6} intensity={face.lampDim ? 15 : 120} distance={16} color="#f2efe8" />
      <Sparkles count={60} scale={[22, 6, 30]} position={[0, 3.5, MIDZ]} size={1.6} speed={0.15} color="#d8d2c0" opacity={0.5} />
    </group>
  );
}
