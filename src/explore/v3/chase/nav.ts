// 이산의 이동을 위한 작은 내비게이션과, 감시등의 가까운 미래 위치 예측.
// 고정 맵이라 노드를 격자로 깔고, 반경을 포함한 통행 여유로 연결한다. 닫힌 문은 연결을 끊는다.
// three·React 의존 없음.

import { BUILDINGS, COVERS, MAX_Z, STAIR_BOTTOM_Z, STAIR_DROP, STAIR_TOP_Z, type Block, type LightDef, type V2 } from "./level";

export const SAN_RADIUS = 0.32;
const LINK_MAX = 4.2;

export const dist2 = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z);

/** 이 z보다 남쪽은 모두 지하(ACT 4 정비·기록 공간)다. 지상에서는 큰길 끝 건물에 막혀 닿을 수 없다 */
export const UNDER_Z = -59.8;

/** 바닥 높이 (플레이어·이산 공통): 지하철 계단은 내려갈수록 낮아지고, 계단 아래 지하 공간은 계단 바닥 높이 */
export function groundY(p: V2) {
  const inStair = (Math.abs(p.x) < 2.6 && p.z < STAIR_TOP_Z) || p.z < UNDER_Z;
  return inStair ? -STAIR_DROP * Math.min(1, (STAIR_TOP_Z - p.z) / (STAIR_TOP_Z - STAIR_BOTTOM_Z)) : 0;
}

/** 반경 r만큼 부풀린 사각형과 선분 a→b가 겹치는지 (2D 슬래브) */
export function segmentHitsRect(a: V2, b: V2, rc: { x0: number; x1: number; z0: number; z1: number }, r: number) {
  const x0 = rc.x0 - r, x1 = rc.x1 + r, z0 = rc.z0 - r, z1 = rc.z1 + r;
  const dx = b.x - a.x, dz = b.z - a.z;
  let lo = 0, hi = 1;
  for (const [p, d, mn, mx] of [[a.x, dx, x0, x1], [a.z, dz, z0, z1]] as const) {
    if (Math.abs(d) < 1e-9) {
      if (p < mn || p > mx) return false;
      continue;
    }
    const t0 = (mn - p) / d, t1 = (mx - p) / d;
    lo = Math.max(lo, Math.min(t0, t1));
    hi = Math.min(hi, Math.max(t0, t1));
    if (lo > hi) return false;
  }
  return true;
}

export function segmentClear(a: V2, b: V2, blocks: Block[], r = SAN_RADIUS) {
  for (const bl of blocks) if (segmentHitsRect(a, b, bl, r)) return false;
  return true;
}

function insideAny(p: V2, blocks: Block[], r: number) {
  return blocks.some((b) => p.x > b.x0 - r && p.x < b.x1 + r && p.z > b.z0 - r && p.z < b.z1 + r);
}

/* ---------- 노드 ---------- */

const STATIC: Block[] = [...BUILDINGS, ...COVERS];

function buildNodes(): V2[] {
  const out: V2[] = [];
  // 통로 B-2와 골목 (폭 6.4m)
  for (let z = MAX_Z - 2; z >= 6; z -= 2.5) for (const x of [-1.9, 0, 1.9]) out.push({ x, z });
  // 교차로와 큰길
  for (let z = 5; z >= -46; z -= 2.2) for (const x of [-8.6, -6.4, -4.2, -2, 0.2, 2.4, 4.6, 6.8, 8.8]) out.push({ x, z });
  // 지하철 계단
  for (const z of [-48, -50.2, -52.4, -54.6]) for (const x of [-1.2, 1.2]) out.push({ x, z });
  // 엄폐 지점은 노드로도 쓴다
  for (const s of COVER_SPOTS) out.push(s.p);
  const r = SAN_RADIUS + 0.05;
  return out.filter((p) => !insideAny(p, STATIC, r) && Math.abs(p.x) <= 9.6);
}

/* ---------- 엄폐 지점 ----------
   엄폐물마다 네 변과 네 모서리 바깥 0.55m 지점. 실제로 안전한지는 감시등 위치에 따라 매번 계산한다 */
export type CoverSpot = { p: V2; cover: number };
export const COVER_SPOTS: CoverSpot[] = (() => {
  const out: CoverSpot[] = [];
  COVERS.forEach((c, i) => {
    const o = SAN_RADIUS + 0.25;
    const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
    const pts: V2[] = [
      { x: cx, z: c.z1 + o }, { x: cx, z: c.z0 - o }, { x: c.x0 - o, z: cz }, { x: c.x1 + o, z: cz },
      { x: c.x0 - o, z: c.z1 + o }, { x: c.x1 + o, z: c.z1 + o }, { x: c.x0 - o, z: c.z0 - o }, { x: c.x1 + o, z: c.z0 - o },
    ];
    for (const p of pts) if (!insideAny(p, STATIC, SAN_RADIUS) && Math.abs(p.x) <= 9.6) out.push({ p, cover: i });
  });
  return out;
})();

export const NAV_NODES: V2[] = buildNodes();

/* ---------- 경로 ---------- */

const adjCache = new Map<string, number[][]>();

function adjacency(key: string, blocks: Block[]) {
  const hit = adjCache.get(key);
  if (hit) return hit;
  const n = NAV_NODES.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist2(NAV_NODES[i], NAV_NODES[j]) > LINK_MAX) continue;
      if (!segmentClear(NAV_NODES[i], NAV_NODES[j], blocks)) continue;
      adj[i].push(j);
      adj[j].push(i);
    }
  }
  adjCache.set(key, adj);
  return adj;
}

/**
 * from → to 경로(시작점 제외, 도착점 포함)를 찾는다. doorKey는 문 개폐 상태(연결 캐시 키),
 * blocks는 지금 막혀 있는 모든 사각형(닫힌 문 포함). 못 찾으면 null.
 */
export function findPath(from: V2, to: V2, blocks: Block[], doorKey: string): V2[] | null {
  if (segmentClear(from, to, blocks)) return [to];
  const adj = adjacency(doorKey, blocks);
  const n = NAV_NODES.length;
  const near = (p: V2) => {
    const list: number[] = [];
    for (let i = 0; i < n; i++) if (dist2(p, NAV_NODES[i]) < LINK_MAX * 1.6 && segmentClear(p, NAV_NODES[i], blocks)) list.push(i);
    return list;
  };
  const starts = near(from);
  const ends = new Set(near(to));
  if (!starts.length || !ends.size) return null;
  // A*
  const g = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const open = new Set<number>();
  for (const s of starts) {
    g[s] = dist2(from, NAV_NODES[s]);
    open.add(s);
  }
  const done = new Uint8Array(n);
  let best = -1;
  let bestCost = Infinity;
  while (open.size) {
    let cur = -1, cf = Infinity;
    for (const i of open) {
      const f = g[i] + dist2(NAV_NODES[i], to);
      if (f < cf) { cf = f; cur = i; }
    }
    if (cf >= bestCost) break;
    open.delete(cur);
    done[cur] = 1;
    if (ends.has(cur)) {
      const total = g[cur] + dist2(NAV_NODES[cur], to);
      if (total < bestCost) { bestCost = total; best = cur; }
    }
    for (const nb of adj[cur]) {
      if (done[nb]) continue;
      const c = g[cur] + dist2(NAV_NODES[cur], NAV_NODES[nb]);
      if (c < g[nb]) {
        g[nb] = c;
        prev[nb] = cur;
        open.add(nb);
      }
    }
  }
  if (best < 0) return null;
  const path: V2[] = [{ ...to }];
  for (let i = best; i >= 0; i = prev[i]) path.unshift({ ...NAV_NODES[i] });
  // 앞쪽 노드 중 바로 보이는 것은 건너뛴다 (지그재그 줄이기)
  const smooth: V2[] = [];
  let anchor = from;
  let k = 0;
  while (k < path.length) {
    let far = k;
    for (let j = path.length - 1; j > k; j--) if (segmentClear(anchor, path[j], blocks)) { far = j; break; }
    smooth.push(path[far]);
    anchor = path[far];
    k = far + 1;
  }
  return smooth;
}

export function pathLength(from: V2, path: V2[]) {
  let len = 0, a = from;
  for (const p of path) { len += dist2(a, p); a = p; }
  return len;
}

/** 경로 위, 출발 후 t초 지점 (속도 v) */
export function pointAlong(from: V2, path: V2[], v: number, t: number): V2 {
  let left = v * t, a = from;
  for (const p of path) {
    const d = dist2(a, p);
    if (left <= d) {
      const k = d > 0 ? left / d : 0;
      return { x: a.x + (p.x - a.x) * k, z: a.z + (p.z - a.z) * k };
    }
    left -= d;
    a = p;
  }
  return { ...a };
}

/* ---------- 감시등의 미래 위치 ---------- */

/** 순찰 중인 감시등이 t초 뒤 어디에 있을지. 2점 경로는 왕복, 그 이상은 순환 */
export function predictPatrol(def: LightDef, x: number, z: number, seg: number, t: number): V2 {
  let px = x, pz = z, s = seg, left = def.speed * t;
  for (let guard = 0; guard < 64 && left > 0; guard++) {
    const goal = def.path[s];
    const d = Math.hypot(goal.x - px, goal.z - pz);
    if (d >= left) {
      px += ((goal.x - px) / (d || 1)) * left;
      pz += ((goal.z - pz) / (d || 1)) * left;
      left = 0;
      break;
    }
    left -= d;
    px = goal.x;
    pz = goal.z;
    s = (s + 1) % def.path.length;
  }
  return { x: px, z: pz };
}
