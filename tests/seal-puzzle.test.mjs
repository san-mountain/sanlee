// 퍼즐 B 「봉인된 3초」의 봉인 격자 규칙과 처음 배치의 풀이 검증 (너비 우선 탐색)
// 이동 1회 = 판 하나를 한 방향으로 한 번 미는 것. 몇 칸을 가든 1회이고, 0칸은 이동이 아니다.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";

const P = await import("../src/explore/sealPuzzle.ts");
const { CASSETTE, EXIT_ROW, LAYOUT, MIN_MOVES, SIZE, applyMove, emptySeal, isSolved, isValid, occupancy, parseSeal, slide, slideRange, solve, startPositions, undo } = P;

const at = (pos, id, to) => ({ ...pos, [id]: to });

test("the starting layout is a legal 6×6 board with 7 white seals and one red cassette on the exit row", () => {
  assert.equal(SIZE, 6);
  const seals = LAYOUT.filter((p) => p.id !== CASSETTE);
  assert.ok(seals.length >= 6 && seals.length <= 8, `${seals.length} seals`);
  const r = LAYOUT.find((p) => p.id === CASSETTE);
  assert.equal(r.axis, "h");
  assert.equal(r.row, EXIT_ROW);
  assert.ok(isValid(startPositions()));
  // 가로 판은 원본 줄에 두지 않는다 (원본 줄을 막는 건 세로 판뿐 → 반드시 위아래로 비켜야 한다)
  assert.ok(seals.every((p) => !(p.axis === "h" && p.row === EXIT_ROW)));
});

test("BFS: the layout is solvable and the shortest solution is exactly MIN_MOVES (11) moves", () => {
  const r = solve();
  assert.ok(r, "solvable");
  assert.equal(r.moves, MIN_MOVES);
  assert.equal(MIN_MOVES, 11);
  // 풀이를 실제 규칙으로 다시 따라가 보면 끝에서 원본이 배출구에 닿는다
  let s = emptySeal();
  for (const m of r.path) {
    assert.equal(s.pos[m.id], m.from);
    s = applyMove(s, m.id, m.to);
    assert.ok(s, `${m.id} ${m.from}->${m.to}`);
  }
  assert.ok(isSolved(s.pos));
  assert.equal(s.history.length, MIN_MOVES);
});

test("not a one-blocker or button-order puzzle: the exit row is blocked by several seals that each need other seals moved first", () => {
  const start = startPositions();
  const grid = occupancy(start);
  const blockers = new Set(grid[EXIT_ROW].slice(start[CASSETTE] + 2).filter(Boolean));
  assert.ok(blockers.size >= 2, `blockers ${[...blockers]}`);
  // 처음에 원본은 배출구까지 갈 수 없다
  assert.ok(slideRange(start, CASSETTE)[1] < SIZE - 2);
  // 처음에 원본 줄을 막은 판 중 어느 것도 혼자 비켜서 길을 열 수 없다
  for (const id of blockers) {
    const [min, max] = slideRange(start, id);
    const p = LAYOUT.find((q) => q.id === id);
    for (let to = min; to <= max; to++) {
      const pos = at(start, id, to);
      const g = occupancy(pos);
      const stillBlocked = g[EXIT_ROW].slice(start[CASSETTE] + 2).some(Boolean);
      assert.ok(stillBlocked || p.axis === "h", `${id}→${to} alone opens the way`);
    }
  }
  // 최단 풀이에서도 여러 판이 서로 비켜 줘야 한다: 다섯 개 이상의 봉인판이 움직이고, 원본도 중간에 한 번 비켜야 한다
  const path = solve().path;
  const moved = new Set(path.map((m) => m.id).filter((id) => id !== CASSETTE));
  assert.ok(moved.size >= 5, `${moved.size} seals moved`);
  assert.ok(path.slice(0, -1).some((m) => m.id === CASSETTE), "the cassette has to step aside before it can leave");
});

test("horizontal seals move only left/right, vertical seals only up/down, and they stop at other seals and the frame", () => {
  const start = startPositions();
  // 원본(가로, cols 1~2): 왼쪽은 B, 오른쪽은 한 칸(col 3이 비었고 col 4에 C)
  assert.deepEqual(slideRange(start, CASSETTE), [1, 2]);
  // B(세로, col 0, row 0~2): 위는 테두리, 아래로는 끝까지 (row 3까지 = rows 3~5)
  assert.deepEqual(slideRange(start, "b"), [0, 3]);
  // E(가로, row 1, col 1~3): 왼쪽은 B, 오른쪽은 C에 막혀 꼼짝 못 한다
  assert.deepEqual(slideRange(start, "e"), [1, 1]);
  // C·D(세로, rows 0~2): 아래 F 때문에 row 1까지만
  assert.deepEqual(slideRange(start, "c"), [0, 1]);
  assert.deepEqual(slideRange(start, "d"), [0, 1]);
  // A(세로, col 2): 위로 row 3까지 (row 2는 원본). G(세로, col 3): 위로 row 2까지 (row 1은 E)
  assert.deepEqual(slideRange(start, "a"), [3, 4]);
  assert.deepEqual(slideRange(start, "g"), [2, 4]);
  // F(가로, row 4, cols 4~5): 왼쪽 G에 막힘
  assert.deepEqual(slideRange(start, "f"), [4, 4]);
});

test("illegal slides are refused: no overlap, no jumping over seals, no leaving the board, no zero-length move", () => {
  const start = startPositions();
  assert.equal(slide(start, CASSETTE, 3).ok, false, "through C");
  assert.equal(slide(start, CASSETTE, 4).ok, false, "to the exit through C and D");
  assert.equal(slide(start, "b", 4).ok, false, "off the bottom");
  assert.equal(slide(start, "b", -1).ok, false, "off the top");
  assert.equal(slide(start, "e", 2).ok, false, "into C");
  assert.equal(slide(start, "a", 2).ok, false, "into the cassette");
  assert.equal(slide(start, "g", 1).ok, false, "into E");
  assert.equal(slide(start, "a", 4).ok, false, "a click that does not move is not a move");
  assert.equal(slide(start, "a", 2.5).ok, false, "only whole cells");
  assert.equal(slide(start, "zz", 1).ok, false, "unknown piece");
  const ok = slide(start, "g", 2);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.move, { id: "g", from: 4, to: 2 });
  assert.ok(isValid(ok.pos));
});

test("undo takes back exactly the last valid move; reset returns to the start layout", () => {
  let s = emptySeal();
  s = applyMove(s, "b", 3);
  s = applyMove(s, CASSETTE, 0);
  assert.equal(applyMove(s, CASSETTE, 4), null, "refused moves are not recorded");
  assert.equal(s.history.length, 2);
  const u = undo(s);
  assert.equal(u.history.length, 1);
  assert.equal(u.pos[CASSETTE], 1);
  assert.equal(u.pos.b, 3);
  assert.deepEqual(undo(undo(u)), emptySeal(), "undo on an empty history does nothing");
  assert.deepEqual(emptySeal().pos, startPositions());
});

test("saved seal progress is replayed move by move; anything that breaks the rules falls back to the start layout", () => {
  let s = emptySeal();
  s = applyMove(s, "b", 3);
  s = applyMove(s, CASSETTE, 0);
  const back = parseSeal(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
  // 위치만 손상: 기록을 믿는다
  assert.deepEqual(parseSeal({ ...s, pos: { ...s.pos, a: 0 } }), s);
  // 규칙 위반 기록·이상한 값은 처음 배치로
  assert.deepEqual(parseSeal({ history: [{ id: CASSETTE, from: 1, to: 4 }] }), emptySeal());
  assert.deepEqual(parseSeal({ history: [{ id: "a", from: 4, to: 2 }] }), emptySeal());
  assert.deepEqual(parseSeal({ history: [{ id: "g", from: 3, to: 2 }] }), emptySeal());
  assert.deepEqual(parseSeal({ history: [{ id: "a", from: 4, to: 4 }] }), emptySeal());
  assert.deepEqual(parseSeal({ history: "nope" }), emptySeal());
  assert.deepEqual(parseSeal(null), emptySeal());
  assert.deepEqual(parseSeal({ history: Array(600).fill({ id: "g", from: 4, to: 2 }) }), emptySeal());
});
