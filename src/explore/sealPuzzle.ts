// 퍼즐 B 「봉인된 3초」의 규칙. 화면·저장과 분리된 순수 함수.
// 6×6 격자. 붉은 원본 카세트(가로, 길이 2)는 EXIT_ROW 줄에 있고 오른쪽 배출구로 나가야 한다.
// 가로 봉인판은 좌우로만, 세로 봉인판은 위아래로만 움직인다. 서로 겹치거나 판 밖으로 나갈 수 없다.
// 이동 1회 = 판 하나를 한 방향으로 한 번 미는 것 (몇 칸을 가든 1회). 0칸 이동은 이동이 아니다.

export const SIZE = 6;
export const EXIT_ROW = 2;
export const CASSETTE = "original";

export type Axis = "h" | "v";
export type Piece = { id: string; axis: Axis; len: 2 | 3; row: number; col: number };
// 판의 위치만 바뀐다. 모양(축·길이)과 고정 줄/칸은 LAYOUT이 정한다
export type Layout = readonly Piece[];
// 각 판의 움직이는 축 위치: 가로 판은 col, 세로 판은 row
export type Positions = Record<string, number>;
export type Move = { id: string; from: number; to: number };

// 처음 배치. tests/seal-puzzle.test.mjs의 BFS가 풀이 가능 여부와 최단 11회를 검증한다
//   B . . . C D
//   B E E E C D
//   B R R . C D      R = 원본 카세트 → 오른쪽 배출구
//   . . . . . .
//   . . A G F F
//   . . A G . .
// 원본을 내보내려면 C·D를 내려야 하고, 그 아래 F를 비키려면 A·G를 올려야 한다.
// 올라온 A가 원본 줄을 막으니 E를 옆으로 밀어 A를 끝까지 올려야 하고, 그러려면 원본이 먼저 왼쪽으로(B를 내려서) 비켜야 한다.
export const LAYOUT: Layout = [
  { id: CASSETTE, axis: "h", len: 2, row: EXIT_ROW, col: 1 },
  { id: "a", axis: "v", len: 2, row: 4, col: 2 },
  { id: "b", axis: "v", len: 3, row: 0, col: 0 },
  { id: "c", axis: "v", len: 3, row: 0, col: 4 },
  { id: "d", axis: "v", len: 3, row: 0, col: 5 },
  { id: "e", axis: "h", len: 3, row: 1, col: 1 },
  { id: "f", axis: "h", len: 2, row: 4, col: 4 },
  { id: "g", axis: "v", len: 2, row: 4, col: 3 },
];
// 최단 이동 수 (테스트가 BFS로 확인한다)
export const MIN_MOVES = 11;

export const pieceOf = (id: string, layout: Layout = LAYOUT) => layout.find((p) => p.id === id);
export const startPositions = (layout: Layout = LAYOUT): Positions => Object.fromEntries(layout.map((p) => [p.id, p.axis === "h" ? p.col : p.row]));

// 판이 차지하는 칸들
export function cellsOf(p: Piece, at: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < p.len; k++) out.push(p.axis === "h" ? [p.row, at + k] : [at + k, p.col]);
  return out;
}

// 격자에 누가 있는지. 겹치거나 판 밖이면 null (규칙 위반 상태)
export function occupancy(pos: Positions, layout: Layout = LAYOUT): (string | null)[][] | null {
  const grid: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (const p of layout) {
    const at = pos[p.id];
    if (!Number.isInteger(at) || at < 0 || at + p.len > SIZE) return null;
    for (const [r, c] of cellsOf(p, at)) {
      if (grid[r][c]) return null;
      grid[r][c] = p.id;
    }
  }
  return grid;
}

export const isValid = (pos: Positions, layout: Layout = LAYOUT) => layout.every((p) => p.id in pos) && Object.keys(pos).length === layout.length && occupancy(pos, layout) !== null;

// 판이 지금 자리에서 갈 수 있는 범위 [min, max] (축 위치). 다른 판에 막히는 데까지
export function slideRange(pos: Positions, id: string, layout: Layout = LAYOUT): [number, number] {
  const p = pieceOf(id, layout);
  const grid = occupancy(pos, layout);
  if (!p || !grid) return [pos[id], pos[id]];
  const at = pos[id];
  const free = (k: number) => (p.axis === "h" ? grid[p.row][k] : grid[k][p.col]) === null;
  let min = at;
  while (min - 1 >= 0 && free(min - 1)) min--;
  let max = at;
  while (max + p.len < SIZE && free(max + p.len)) max++;
  return [min, max];
}

// 판을 to까지 민다. 막힌 곳을 넘으면 거절 (화면은 slideRange로 미리 멈춘다)
export function slide(pos: Positions, id: string, to: number, layout: Layout = LAYOUT): { ok: true; pos: Positions; move: Move } | { ok: false } {
  if (!(id in pos)) return { ok: false };
  const from = pos[id];
  const [min, max] = slideRange(pos, id, layout);
  if (!Number.isInteger(to) || to === from || to < min || to > max) return { ok: false };
  return { ok: true, pos: { ...pos, [id]: to }, move: { id, from, to } };
}

// 원본 카세트가 오른쪽 끝(배출구 앞)에 닿았는가
export const isSolved = (pos: Positions, layout: Layout = LAYOUT) => {
  const r = pieceOf(CASSETTE, layout)!;
  return pos[CASSETTE] === SIZE - r.len;
};

// 진행 상태: 위치 + 이동 기록 (되돌리기용)
export type SealState = { pos: Positions; history: Move[] };
export const emptySeal = (layout: Layout = LAYOUT): SealState => ({ pos: startPositions(layout), history: [] });

export function applyMove(state: SealState, id: string, to: number, layout: Layout = LAYOUT): SealState | null {
  const r = slide(state.pos, id, to, layout);
  return r.ok ? { pos: r.pos, history: [...state.history, r.move] } : null;
}

// 마지막 유효 이동 하나를 취소
export function undo(state: SealState): SealState {
  const last = state.history[state.history.length - 1];
  if (!last) return state;
  return { pos: { ...state.pos, [last.id]: last.from }, history: state.history.slice(0, -1) };
}

// 저장된 진행을 읽는다. 기록을 처음부터 다시 따라가 보고, 규칙에 어긋나면 처음 배치로
export function parseSeal(d: unknown, layout: Layout = LAYOUT): SealState {
  const fresh = emptySeal(layout);
  if (!d || typeof d !== "object") return fresh;
  const h = (d as { history?: unknown }).history;
  if (!Array.isArray(h) || h.length > 500) return fresh;
  let s = fresh;
  for (const m of h) {
    if (!m || typeof m !== "object") return fresh;
    const { id, from, to } = m as Move;
    if (typeof id !== "string" || s.pos[id] !== from) return fresh;
    const next = applyMove(s, id, to, layout);
    if (!next) return fresh;
    s = next;
  }
  // 저장된 위치가 기록과 다르면 기록을 믿는다 (위치만 손상된 경우)
  return s;
}

// 상태 공간 너비 우선 탐색: 최단 이동 수와 풀이 하나
export function solve(start: Positions = startPositions(), layout: Layout = LAYOUT): { moves: number; path: Move[]; states: number } | null {
  const ids = layout.map((p) => p.id);
  const key = (pos: Positions) => ids.map((i) => pos[i]).join(",");
  const seen = new Map<string, { prev: string | null; move: Move | null }>();
  const k0 = key(start);
  seen.set(k0, { prev: null, move: null });
  let frontier: Positions[] = [start];
  while (frontier.length) {
    const next: Positions[] = [];
    for (const pos of frontier) {
      if (isSolved(pos, layout)) {
        const path: Move[] = [];
        let k: string | null = key(pos);
        while (k) {
          const e: { prev: string | null; move: Move | null } = seen.get(k)!;
          if (e.move) path.unshift(e.move);
          k = e.prev;
        }
        return { moves: path.length, path, states: seen.size };
      }
      const kp = key(pos);
      for (const id of ids) {
        const [min, max] = slideRange(pos, id, layout);
        for (let to = min; to <= max; to++) {
          if (to === pos[id]) continue;
          const np = { ...pos, [id]: to };
          const kn = key(np);
          if (seen.has(kn)) continue;
          seen.set(kn, { prev: kp, move: { id, from: pos[id], to } });
          next.push(np);
        }
      }
    }
    frontier = next;
  }
  return null;
}
