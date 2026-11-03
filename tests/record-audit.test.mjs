import { test } from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";
import {
  AUDIT_KEY,
  auditAvailable,
  auditSolved,
  cityProcess,
  emptyAudit,
  finishAudit,
  loadAudit,
  parseAudit,
  playRecord,
  pressTest,
  restPhase,
  saveAudit,
  takeSlip,
} from "../src/explore/recordAudit.ts";
import { FACE_KEY, loadFace, saveFace, emptyFace } from "../src/explore/faceAuth.ts";
import { auditLines, auditScenes, speakers } from "../src/explore/story.ts";
import { lineDuration, playLines } from "../src/explore/dialogue.ts";

const memory = (seed = {}) => {
  const values = new Map(Object.entries(seed));
  globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
  return values;
};
const doneA = (method = "standard") => ({ ...emptyFace(), drums: [0, 0, 0], solved: true, method });
const reload = () => loadAudit();

test("the city turns every input into 'accept'; only a reject reveals the mismatch", () => {
  assert.equal(cityProcess("accept"), "accept");
  assert.equal(cityProcess("reject"), "accept");
  let s = playRecord(emptyAudit());
  const a = pressTest(s, "accept");
  assert.equal(a.status, "match");
  assert.deepEqual(a.state.last, { input: "accept", output: "accept" });
  assert.equal(a.state.mismatch, false);
  const r = pressTest(a.state, "reject");
  assert.equal(r.status, "mismatch");
  assert.equal(r.firstMismatch, true);
  // 입력 표시등은 거부, 처리 결과 표시등은 수락으로 남는다
  assert.deepEqual(r.state.last, { input: "reject", output: "accept" });
  assert.equal(r.state.mismatch, true);
  assert.deepEqual(r.state.tried.sort(), ["accept", "reject"]);
});

test("pressing reject first is a valid route; accept is never required", () => {
  const r = pressTest(playRecord(emptyAudit()), "reject");
  assert.equal(r.status, "mismatch");
  const s = takeSlip(r.state);
  assert.equal(auditSolved(s), true);
});

test("the buttons stay dead before the record is replayed, and the audit box stays locked before a mismatch", () => {
  const before = pressTest(emptyAudit(), "reject");
  assert.equal(before.status, "idle");
  assert.equal(before.state.mismatch, false);
  const matched = pressTest(playRecord(emptyAudit()), "accept").state;
  assert.equal(takeSlip(matched).taken, false);
  assert.equal(finishAudit(matched).done, false);
});

test("the device only exists on the new path after puzzle A, never on a legacy save", () => {
  assert.equal(auditAvailable(emptyFace()), false);
  assert.equal(auditAvailable(doneA()), true);
  assert.equal(auditAvailable({ ...doneA(), legacy: true }), false);
  assert.equal(restPhase({ ...doneA(), legacy: true }, { ...emptyAudit(), done: true }), "dormant");
  assert.equal(restPhase(emptyFace(), emptyAudit()), "dormant");
});

test("refresh at every step returns to the right resting phase with the lamps intact", () => {
  memory();
  const face = doneA("exception");
  let s = emptyAudit();
  saveAudit(s);
  assert.equal(restPhase(face, reload()), "idle");

  // 기록만 확인한 상태
  s = playRecord(s);
  saveAudit(s);
  assert.equal(restPhase(face, reload()), "test");

  // 입력 시험 도중 (수락만 눌러 봄)
  s = pressTest(s, "accept").state;
  saveAudit(s);
  assert.equal(restPhase(face, reload()), "test");
  assert.deepEqual(reload().last, { input: "accept", output: "accept" });

  // 불일치 발견 뒤: 기록함이 열린 채로
  s = pressTest(s, "reject").state;
  saveAudit(s);
  assert.equal(restPhase(face, reload()), "slip");
  assert.deepEqual(reload().last, { input: "reject", output: "accept" });

  // 감사 기록 확보 뒤 (마무리 전): 열린 기록함에서 다시 읽고 마무리로
  s = takeSlip(s);
  saveAudit(s);
  assert.equal(reload().taken, true);
  assert.equal(restPhase(face, reload()), "slip");

  // 퍼즐 B 완료 후 재접속
  s = finishAudit(s);
  saveAudit(s);
  assert.equal(restPhase(face, reload()), "done");
  assert.equal(reload().done, true);
});

test("a damaged or partial save is repaired into a consistent one and never throws", () => {
  assert.deepEqual(parseAudit(null), emptyAudit());
  assert.deepEqual(parseAudit("{nope"), emptyAudit());
  assert.deepEqual(parseAudit('{"schema":9,"done":true}'), emptyAudit());
  const s = parseAudit('{"schema":1,"done":true}');
  assert.equal(s.taken && s.mismatch && s.played, true);
  assert.deepEqual(s.last, { input: "reject", output: "accept" });
  assert.deepEqual(parseAudit('{"schema":1,"played":true,"last":{"input":"x","output":"accept"}}').last, null);
});

test("finishing puzzle B never touches puzzle A's choice or the legacy flag", () => {
  const values = memory({ "sanlee-visited": "[]" });
  const face = doneA("standard");
  saveFace(face);
  const before = values.get(FACE_KEY);
  let s = takeSlip(pressTest(playRecord(emptyAudit()), "reject").state);
  saveAudit(finishAudit(s));
  assert.equal(values.get(FACE_KEY), before);
  const back = loadFace();
  assert.equal(back.method, "standard");
  assert.equal(back.legacy, false);
  assert.ok(values.has(AUDIT_KEY));
});

test("city-record deletion clears puzzle B progress along with puzzle A", async () => {
  const values = memory();
  saveFace(doneA());
  saveAudit(finishAudit(takeSlip(pressTest(playRecord(emptyAudit()), "reject").state)));
  globalThis.window = new EventTarget();
  const backup = await import(`../src/explore/backup.ts?audit=${Date.now()}`);
  backup.forgetCityRecords();
  assert.equal(values.has(AUDIT_KEY), false);
  assert.equal(values.has(FACE_KEY), false);
  assert.deepEqual(loadAudit(), emptyAudit());
});

test("every puzzle B line has a unique b.* id, a known speaker, both languages and a subtitle time", () => {
  const lines = Object.values(auditLines);
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length);
  for (const l of lines) {
    assert.match(l.id, /^b\.(san|city|verifier|guarantor)\./);
    assert.ok(l.id.split(".")[1] === l.speaker, l.id);
    assert.ok(speakers[l.speaker], l.id);
    assert.ok(l.ko && l.en, l.id);
    assert.ok(l.ms > 0 && lineDuration(l) === l.ms, l.id);
  }
  // 거부 시험: 도시가 존중한다고 말한 뒤 모두 수락을 알린다
  assert.deepEqual(auditScenes.reject.map((l) => l.id), ["b.city.respect", "b.city.accepted-all"]);
  assert.deepEqual(auditScenes.san.map((l) => l.speaker), ["san", "san"]);
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
  assert.equal(clock, auditScenes.san.reduce((s, l) => s + l.ms, 0) + 1400);
});
