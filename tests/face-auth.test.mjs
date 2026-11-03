import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyFace, executeFace, faceConsequences, isSolved, loadFace, rotateDrum, saveFace, seamJoined, FACE_KEY, FACES, SOLUTION, START } from "../src/explore/faceAuth.ts";

const memory = (seed = {}) => {
  const values = new Map(Object.entries(seed));
  globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
  return values;
};
const turn = (state, i, n = 1) => {
  for (let k = 0; k < n; k++) state = rotateDrum(state, i);
  return state;
};
const solve = () => SOLUTION.reduce((s, want, i) => turn(s, i, (want - s.drums[i] + FACES) % FACES), emptyFace());

test("the puzzle starts scrambled and has exactly one solution among all combinations", () => {
  assert.equal(isSolved(START), false);
  assert.ok(START.every((d, i) => d !== SOLUTION[i]), "every part starts out of place");
  let solutions = 0;
  for (let a = 0; a < FACES; a++) for (let b = 0; b < FACES; b++) for (let c = 0; c < FACES; c++) if (isSolved([a, b, c])) solutions++;
  assert.equal(solutions, 1);
});

test("turning cycles one drum through three faces and locks once solved", () => {
  let s = emptyFace();
  const before = s.drums[1];
  s = turn(s, 1);
  assert.equal(s.drums[1], (before + 1) % FACES);
  assert.equal(turn(s, 1, 2).drums[1], before, "three turns come back around");
  const done = solve();
  assert.equal(done.solved, true);
  assert.equal(rotateDrum(done, 0), done, "a locked machine does not turn");
});

test("partial feedback: a seam joins only when both neighbouring parts are right", () => {
  assert.equal(seamJoined([0, 0, 1], 0), true);
  assert.equal(seamJoined([0, 0, 1], 1), false);
  assert.equal(seamJoined([1, 0, 0], 0), false);
  assert.equal(seamJoined([1, 0, 0], 1), true);
});

test("both choices complete the puzzle; neither is available before the face is matched", () => {
  assert.equal(executeFace(emptyFace(), "standard", false, false).status, "unsolved");
  for (const method of ["standard", "exception"]) {
    const r = executeFace(solve(), method, false, false);
    assert.equal(r.status, "success");
    assert.equal(r.state.method, method);
    assert.equal(executeFace(r.state, method === "standard" ? "exception" : "standard", false, false).status, "complete");
  }
  assert.equal(faceConsequences({ ...solve(), method: "standard" }).expressionConstrained, true);
  assert.equal(faceConsequences({ ...solve(), method: "exception" }).additionalReview, true);
});

test("bell: an expired protection needs explicit consent and never undoes the matched face", () => {
  const state = solve();
  const r = executeFace(state, "exception", true, false);
  assert.equal(r.status, "expired");
  assert.deepEqual(r.state, state);
  assert.equal(executeFace(state, "exception", true, false, true).status, "success");
  assert.equal(executeFace(state, "exception", true, true).status, "success");
});

test("progress saves on its own key, survives reload, and is kept apart from the activity ledger", () => {
  const values = memory();
  let s = loadFace();
  assert.equal(values.has(FACE_KEY), true, "first visit decides legacy once");
  s = turn(s, 0);
  saveFace(s);
  assert.deepEqual(loadFace().drums, s.drums);
  const done = executeFace(solve(), "standard", true, true).state;
  saveFace(done);
  assert.equal(loadFace().method, "standard");
  assert.equal(loadFace().solved, true);
  assert.deepEqual([...values.keys()], [FACE_KEY]);
});

test("a corrupted save falls back to the scrambled start instead of a solved face", () => {
  memory({ [FACE_KEY]: JSON.stringify({ schema: 2, drums: [0, 0, 9], solved: true }) });
  const s = loadFace();
  assert.deepEqual(s.drums, START);
  assert.equal(s.solved, false);
});

test("old saves: three-terminal players keep the legacy path; finished schema-1 auths stay finished", () => {
  memory({ "sanlee-visited": '["about","works","writing"]' });
  assert.equal(loadFace().legacy, true);
  assert.equal(loadFace().method, null);
  memory({ [FACE_KEY]: JSON.stringify({ method: "exception", scanner: "high", slots: [true, true] }) });
  const old = loadFace();
  assert.equal(old.method, "exception");
  assert.equal(old.solved, true);
  // 새 플레이어가 나중에 터미널을 셋 다 열어도 기존 경로로 바뀌지 않는다
  const values = memory();
  loadFace();
  values.set("sanlee-visited", '["about","works","writing"]');
  assert.equal(loadFace().legacy, false);
});

test("activity execution refuses an expired protected submission without writing an entry", async () => {
  const { createCitizenRecords } = await import("../src/explore/citizenRecords.ts");
  const values = new Map();
  const ledger = createCitizenRecords({ storage: () => ({ getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) }), isProtected: () => false, now: () => 8000 });
  assert.equal(ledger.recordCitizenActivity({ kind: "face.authenticate", sourceId: "standard" }, { zone: "bunker", requireProtection: true }).status, "protection-expired");
  assert.equal(values.size, 0);
  assert.equal(ledger.recordCitizenActivity({ kind: "face.authenticate", sourceId: "standard" }, { zone: "bunker" }).status, "recorded");
});
