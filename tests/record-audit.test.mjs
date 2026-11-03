import { test } from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";
import {
  AUDIT_KEY,
  AUDIT_KEY_V1,
  FRAMES,
  REWIND_STEPS,
  auditAvailable,
  emptyAudit,
  finishAudit,
  frameOf,
  loadAudit,
  parseAudit,
  pullBrake,
  restPhase,
  saveAudit,
  shiftLink,
  turnWheel,
} from "../src/explore/recordAudit.ts";
import { FACE_KEY, emptyFace, loadFace, saveFace } from "../src/explore/faceAuth.ts";
import { auditLines, auditScenes, speakers } from "../src/explore/story.ts";
import { lineDuration, playLines } from "../src/explore/dialogue.ts";

// puzzleTest.ts는 확장자 없는 값 import를 쓰므로 로더 등록 뒤에 불러온다
const { applyRestart, restartStates, testStart, TEST_KEY } = await import("../src/explore/puzzleTest.ts");

const store = (seed = {}) => {
  const values = new Map(Object.entries(seed));
  return { values, api: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) } };
};
const memory = (seed = {}) => {
  const local = store(seed);
  const session = store();
  globalThis.localStorage = local.api;
  globalThis.sessionStorage = session.api;
  return { values: local.values, session: session.values };
};
const doneA = (method = "standard") => ({ ...emptyFace(), drums: [0, 0, 0], solved: true, method });
const rewind = (s, n) => {
  for (let i = 0; i < n; i++) s = turnWheel(s).state;
  return s;
};

test("while the press runs, the wheel and the coupling are jammed; the brake frees them", () => {
  const s = emptyAudit();
  assert.equal(turnWheel(s).status, "jammed");
  assert.equal(shiftLink(s).status, "jammed");
  const b = pullBrake(s);
  assert.equal(b.status, "braked");
  assert.equal(b.state.braked, true);
  // 레버 하나로는 아무것도 드러나지 않는다
  assert.equal(b.state.solved, false);
  assert.equal(frameOf(b.state, "official").mark, "accept");
  assert.equal(pullBrake(b.state).status, "noop");
});

test("rewinding the official reel only ever shows consent, and stops at the end without failing", () => {
  let s = pullBrake(emptyAudit()).state;
  assert.equal(s.link, "official", "the wheel starts on the official reel");
  const seen = [];
  for (let i = 0; i < REWIND_STEPS; i++) {
    const r = turnWheel(s);
    assert.equal(r.status, "rewound");
    assert.equal(r.solved, false);
    s = r.state;
    seen.push(frameOf(s, "official"));
  }
  assert.deepEqual(seen.map((f) => f.time), ["14:02:03", "14:02:02", "14:02:01"]);
  assert.ok(seen.every((f) => f.mark === "accept"));
  const end = turnWheel(s);
  assert.equal(end.status, "end");
  assert.equal(end.state, s);
  assert.equal(s.solved, false);
});

test("moving the coupling to the original and rewinding three seconds reveals 14:02:01 Reject all and solves it at once", () => {
  let s = rewind(pullBrake(emptyAudit()).state, 2);
  const l = shiftLink(s);
  assert.equal(l.status, "linked");
  s = l.state;
  assert.equal(s.link, "original");
  // 공식 릴의 위치는 그대로 남는다
  assert.equal(s.pos.official, 2);
  const steps = [];
  let r;
  for (let i = 0; i < REWIND_STEPS; i++) {
    r = turnWheel(s);
    s = r.state;
    steps.push([frameOf(s, "original").time, r.solved]);
  }
  assert.deepEqual(steps, [["14:02:03", false], ["14:02:02", false], ["14:02:01", true]]);
  assert.equal(frameOf(s, "original").mark, "reject");
  assert.equal(FRAMES.original[REWIND_STEPS].word.ko, "모두 거부");
  assert.equal(s.solved, true);
  // 해결된 뒤에는 더 조작해도 바뀌지 않는다. 공식 기록은 여전히 동의
  assert.equal(turnWheel(s).status, "noop");
  assert.equal(shiftLink(s).status, "noop");
  assert.equal(frameOf(s, "official").mark, "accept");
});

test("the coupling can go back and forth freely; wrong tries never lock the puzzle", () => {
  let s = pullBrake(emptyAudit()).state;
  s = shiftLink(s).state;
  s = turnWheel(s).state;
  s = shiftLink(s).state;
  assert.equal(s.link, "official");
  s = rewind(s, 5);
  s = shiftLink(s, "original").state;
  assert.equal(shiftLink(s, "original").status, "noop");
  s = rewind(s, 2);
  assert.equal(s.solved, true);
});

test("the machine only runs on the new path after puzzle A", () => {
  assert.equal(auditAvailable(emptyFace()), false);
  assert.equal(auditAvailable(doneA()), true);
  assert.equal(auditAvailable({ ...doneA(), legacy: true }), false);
  assert.equal(restPhase({ ...doneA(), legacy: true }, emptyAudit()), "dormant");
  assert.equal(restPhase(doneA(), emptyAudit()), "auto");
});

test("refresh at every step comes back to the same reels, coupling and phase", () => {
  memory();
  const face = doneA("exception");
  let s = emptyAudit();
  saveAudit(s);
  assert.equal(restPhase(face, loadAudit()), "auto");
  s = pullBrake(s).state;
  saveAudit(s);
  assert.equal(restPhase(face, loadAudit()), "manual");
  s = rewind(s, 3);
  saveAudit(s);
  assert.deepEqual(loadAudit().pos, { official: 3, original: 0 });
  s = turnWheel(shiftLink(s).state).state;
  saveAudit(s);
  const back = loadAudit();
  assert.equal(back.link, "original");
  assert.deepEqual(back.pos, { official: 3, original: 1 });
  s = rewind(s, 2);
  saveAudit(s);
  assert.equal(restPhase(face, loadAudit()), "done");
  saveAudit(finishAudit(s));
  assert.equal(loadAudit().done, true);
});

test("damaged saves are repaired, and an old B save is never mistaken for new progress", () => {
  assert.deepEqual(parseAudit(null), emptyAudit());
  assert.deepEqual(parseAudit("{nope"), emptyAudit());
  // 제동 전인데 되감긴 값은 버린다
  assert.deepEqual(parseAudit('{"schema":2,"braked":false,"pos":{"official":2,"original":9}}').pos, { official: 0, original: 0 });
  // 이전 B 도중 저장은 새 퍼즐을 처음부터, 끝낸 저장은 끝난 것으로
  assert.deepEqual(parseAudit(null, '{"schema":1,"played":true,"mismatch":true}'), emptyAudit());
  const old = parseAudit(null, '{"schema":1,"done":true}');
  assert.equal(old.solved && old.done, true);
  // 새 저장이 있으면 옛 저장은 보지 않는다
  assert.equal(parseAudit(JSON.stringify(emptyAudit()), '{"schema":1,"done":true}').solved, false);
});

test("restart from A: puzzle A and B go back to the start, nothing else is touched, and it survives a reload", () => {
  const other = {
    "sanlee-visited": '["about","works","writing"]',
    "sanlee-ending": "reject",
    "sanlee-endings-found": '["reject"]',
    "sanlee-backup": '{"n":2}',
    "sanlee-citizen-records-v1": '{"schema":1,"pending":[],"synced":[]}',
  };
  const { values, session } = memory({ ...other, [FACE_KEY]: JSON.stringify(doneA("exception")), [AUDIT_KEY]: JSON.stringify(finishAudit(rewind(shiftLink(pullBrake(emptyAudit()).state).state, 3))), [AUDIT_KEY_V1]: '{"schema":1,"done":true}' });
  applyRestart("a");
  for (const [k, v] of Object.entries(other)) assert.equal(values.get(k), v, k);
  assert.equal(values.has(AUDIT_KEY_V1), false);
  // 새로고침 = 저장에서 다시 읽기. 터미널을 셋 다 열었어도 legacy가 되지 않는다
  const f = loadFace();
  assert.equal(f.method, null);
  assert.equal(f.solved, false);
  assert.equal(f.legacy, false);
  assert.deepEqual(loadAudit(), emptyAudit());
  assert.equal(restPhase(f, loadAudit()), "dormant");
  assert.equal(session.get(TEST_KEY), "a");
  assert.equal(testStart(), "a");
});

test("restart from B: puzzle A's choice stays, B starts over with the press running, even after B was finished", () => {
  memory({ [FACE_KEY]: JSON.stringify(doneA("exception")), [AUDIT_KEY]: JSON.stringify(finishAudit(rewind(shiftLink(pullBrake(emptyAudit()).state).state, 3))) });
  applyRestart("b");
  const f = loadFace();
  assert.equal(f.method, "exception");
  assert.equal(f.legacy, false);
  const a = loadAudit();
  assert.deepEqual(a, emptyAudit());
  assert.equal(restPhase(f, a), "auto");
  assert.equal(testStart(), "b");
  // A를 하지 않은 저장에서 B부터: 표준 미소로 채운다
  assert.equal(restartStates("b", emptyFace()).face.method, "standard");
  // legacy 저장에서도 테스트는 새 경로로 시작한다
  assert.equal(restartStates("b", { ...doneA(), legacy: true }).face.legacy, false);
});

test("city-record deletion clears both B saves along with puzzle A", async () => {
  const { values } = memory();
  saveFace(doneA());
  saveAudit(pullBrake(emptyAudit()).state);
  values.set(AUDIT_KEY_V1, '{"schema":1,"done":true}');
  globalThis.window = new EventTarget();
  const backup = await import(`../src/explore/backup.ts?audit=${Date.now()}`);
  backup.forgetCityRecords();
  assert.equal(values.has(AUDIT_KEY), false);
  assert.equal(values.has(AUDIT_KEY_V1), false);
  assert.equal(values.has(FACE_KEY), false);
});

test("every puzzle B line has a unique b.* id, a known speaker, both languages and a subtitle time", () => {
  const lines = Object.values(auditLines);
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length);
  for (const l of lines) {
    assert.match(l.id, /^b\.(san|city|verifier|guarantor)\./);
    assert.equal(l.id.split(".")[1], l.speaker, l.id);
    assert.ok(speakers[l.speaker], l.id);
    assert.ok(l.ko && l.en, l.id);
    assert.ok(l.ms > 0 && lineDuration(l) === l.ms, l.id);
  }
  assert.deepEqual(auditScenes.san.map((l) => l.ko), ["……내가 거부했었구나.", "그런데 난 왜 아직 여기 있는 거지?"]);
  assert.equal(auditScenes.guarantor[0].ko, "보증인 등록이 필요합니다.");
});

test("the San scene leaves a silence between the two lines before moving on", () => {
  const shown = [];
  const queue = [];
  let clock = 0;
  let done = 0;
  playLines(auditScenes.san, { show: (l) => shown.push(l?.id ?? null), later: (ms, fn) => queue.push([clock + ms, fn]) }, () => done++, 1400);
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [at, fn] = queue.shift();
    clock = at;
    fn();
  }
  assert.deepEqual(shown, ["b.san.refused", null, "b.san.still-here", null]);
  assert.equal(done, 1);
});
