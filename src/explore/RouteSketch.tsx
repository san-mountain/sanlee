"use client";

// 망원경 가는 길 약도 (팝업용 그림). 실제 경유점·드론 레일·처마·다리 값을 그대로 그린다
import type { Lang } from "@/data/site";
import { BAY, DEPOT, DRONE_R, DRONE_RAILS, EDGE, LOOK, LOOKOUT_PATH, SCOPES, WALK } from "./zones";

// 보이는 범위: 서쪽 x −72…−24, 남쪽 z 8…53 (위가 북쪽)
const X0 = -72;
const Z0 = 8;
const S = 10;
const W = 48 * S;
const H = 45 * S;
const px = (x: number) => (x - X0) * S;
const pz = (z: number) => (z - Z0) * S;
const rect = (x0: number, x1: number, z0: number, z1: number) => ({ x: px(x0), y: pz(z0), width: (x1 - x0) * S, height: (z1 - z0) * S });

// 망원경 가는 길의 드론: 0 광장, 1 바깥 산책로, 6 남쪽 다리
const LANES = [0, 1, 6].map((i) => {
  const r = DRONE_RAILS[i];
  const [f0, f1] = r.fx ?? [r.c - r.a, r.c + r.a];
  return { z: r.z, x0: Math.max(r.c - r.a, f0), x1: Math.min(r.c + r.a, f1), mid: Math.max(f0, Math.min(f1, r.c)) };
});

export default function RouteSketch({ lang }: { lang: Lang }) {
  const ko = lang === "ko";
  const pts = LOOKOUT_PATH.map((p) => `${px(p.x)},${pz(p.z)}`).join(" ");
  const start = LOOKOUT_PATH[0];
  const scope = SCOPES[0].pos;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ko ? "망원경 가는 길 약도" : "Map of the way to the scope"}>
      <defs>
        <filter id="rs-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="rs-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M1 1 L8 5 L1 9" fill="none" stroke="#8ff8ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {/* 바닥: 도시 판(광장), 바깥 산책로, 남쪽 다리, 전망대 */}
      <rect {...rect(-64, -24, Z0, EDGE.z1)} fill="#15161d" />
      <rect {...rect(WALK.x0, WALK.x1, WALK.z0, LOOK.z0)} fill="#1d1f28" />
      <rect {...rect(LOOK.x0, BAY.x0, LOOK.z0, LOOK.z1)} fill="#1d1f28" />
      <rect {...rect(BAY.x0, BAY.x1, BAY.z0, BAY.z1)} fill="#1d1f28" />
      {/* 처마 밑 (빛이 닿지 않는 지붕) */}
      <rect {...rect(DEPOT.x - DEPOT.w / 2, DEPOT.x + DEPOT.w / 2, DEPOT.z - DEPOT.d / 2, DEPOT.z + DEPOT.d / 2)} fill="#3a2a1a" stroke="#ffb877" strokeWidth="2" />
      <text x={px(DEPOT.x)} y={pz(DEPOT.z + DEPOT.d / 2) + 22} fill="#ffb877" fontSize="17" textAnchor="middle">
        {ko ? "처마 밑" : "Under the eaves"}
      </text>
      {/* 드론이 훑는 길 */}
      {LANES.map((l, i) => (
        <g key={i}>
          <line x1={px(l.x0)} y1={pz(l.z)} x2={px(l.x1)} y2={pz(l.z)} stroke="#ff9a3c" strokeWidth="3" strokeDasharray="10 8" opacity="0.8" />
          <circle cx={px(l.mid)} cy={pz(l.z)} r={DRONE_R * S} fill="#ff9a3c" opacity="0.28" />
          <circle cx={px(l.mid)} cy={pz(l.z)} r="6" fill="#ffd2a0" />
        </g>
      ))}
      {/* 네온 길 */}
      <polyline points={pts} fill="none" stroke="#3ff0ff" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" filter="url(#rs-glow)" />
      {LOOKOUT_PATH.slice(1).map((b, i) => {
        const a = LOOKOUT_PATH[i];
        return <line key={i} x1={px(a.x)} y1={pz(a.z)} x2={px((a.x + b.x) / 2)} y2={pz((a.z + b.z) / 2)} stroke="transparent" markerEnd="url(#rs-arrow)" />;
      })}
      {/* 출발과 도착 */}
      <circle cx={px(start.x)} cy={pz(start.z)} r="9" fill="#8ff8ff" />
      <text x={px(start.x)} y={pz(start.z) - 16} fill="#e6faff" fontSize="18" textAnchor="middle">
        {ko ? "골목 입구" : "Alley mouth"}
      </text>
      <circle cx={px(scope[0])} cy={pz(scope[2])} r="13" fill="none" stroke="#fff3c4" strokeWidth="4" />
      <circle cx={px(scope[0])} cy={pz(scope[2])} r="4" fill="#fff3c4" />
      <text x={px(scope[0])} y={pz(BAY.z0) - 10} fill="#fff3c4" fontSize="19" textAnchor="middle">
        {ko ? "망원경" : "Scope"}
      </text>
      <text x={px(-44)} y={pz(DRONE_RAILS[0].z) - 34} fill="#ffb36b" fontSize="16" textAnchor="middle">
        {ko ? "드론의 빛" : "Drone light"}
      </text>
    </svg>
  );
}
