// 퍼즐 B 「봉인된 3초」 v0.7: 저장·이전 저장 호환·진입·재시작·대사
import { test } from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";

// 확장자 없는 값 import를 쓰는 모듈은 로더 등록 뒤에 불러온다
const R = await import("../src/explore/recordAudit.ts");
const S = await import("../src/explore/sealPuzzle.ts");
const F = await import("../src/explore/faceAuth.ts");
const T = await import("../src/explore/puzzleTest.ts");
const { auditLines, auditScenes, auditUi, sealUi, speakers, npcStages } = await import("../src/explore/story.ts");
const { lineDuration, playLines } = await import("../src/explore/dialogue.ts");
const { AUDIT_KEY, AUDIT_KEY_V1, AUDIT_KEY_V2, OFFICIAL_RECORD, emptyAudit, finishAudit, loadAudit, moveSeal, parseAudit, resetSeal, restPhase, saveAudit, seeIntro, undoSeal, auditAvailable } = R;
const { CASSETTE, emptySeal, solve, startPositions } = S;
const { FACE_KEY, emptyFace, loadFace, saveFace } = F;
const { applyRestart, restartStates, testStart, TEST_KEY } = T;

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
// 최단 풀이를 앞에서 n수만큼 둔 상태
const played = (n, s = seeIntro(emptyAudit())) => {
  for (const m of solve().path.slice(0, n)) s = moveSeal(s, m.id, m.to);
  return s;
};
const solvedAudit = () => played(Infinity);

test("A → B: B only wakes on the new path after puzzle A, and starts with the intro before the panel", () => {
  assert.equal(auditAvailable(emptyFace()), false);
  assert.equal(restPhase(emptyFace(), emptyAudit()), "dormant");
  assert.equal(restPhase({ ...doneA(), legacy: true }, emptyAudit()), "dormant");
  const a = emptyAudit();
  assert.equal(restPhase(doneA("exception"), a), "ready");
  assert.equal(a.intro, false, "the intro has not been seen yet");
  assert.equal(seeIntro(a).intro, true);
  assert.deepEqual(a.seal, emptySeal());
});

test("moving the seals to free the cassette solves it the moment it reaches the exit; the official record stays 'accept all'", () => {
  const path = solve().path;
  let s = seeIntro(emptyAudit());
  for (const [i, m] of path.entries()) {
    s = moveSeal(s, m.id, m.to);
    assert.ok(s);
    assert.equal(s.solved, i === path.length - 1, `move ${i + 1}`);
  }
  // 해결 뒤에는 판이 더 움직이지 않고, 되돌리기·처음부터도 아무것도 바꾸지 않는다
  assert.equal(moveSeal(s, "b", 0), null);
  assert.equal(undoSeal(s), s);
  assert.equal(resetSeal(s), s);
  assert.deepEqual(OFFICIAL_RECORD, { ko: "모두 동의", en: "ACCEPT ALL" });
  assert.equal(restPhase(doneA(), s), "done");
  assert.equal(finishAudit(s).done, true);
});

test("illegal moves change nothing; undo and reset only touch the seal layout", () => {
  const s = played(3);
  assert.equal(moveSeal(s, CASSETTE, 4), null);
  const u = undoSeal(s);
  assert.equal(u.seal.history.length, 2);
  assert.equal(u.intro, true);
  const r = resetSeal(s);
  assert.deepEqual(r.seal, emptySeal());
  assert.equal(r.intro, true, "reset keeps the intro as seen");
  assert.equal(r.solved, false);
});

test("leaving the panel and coming back, or reloading, restores the exact seal positions and move history", () => {
  memory();
  const s = played(5);
  saveAudit(s);
  const back = loadAudit();
  assert.deepEqual(back.seal.pos, s.seal.pos);
  assert.deepEqual(back.seal.history, s.seal.history);
  assert.equal(back.intro, true);
  assert.equal(restPhase(doneA(), back), "ready");
  // 새로고침 뒤에도 되돌리기가 이어진다
  assert.deepEqual(undoSeal(back).seal, played(4).seal);
  // 해결 직전에 나갔다가 와도 마지막 한 수로 끝난다
  saveAudit(played(10));
  const last = solve().path[10];
  assert.equal(moveSeal(loadAudit(), last.id, last.to).solved, true);
});

test("save migration: finished older B saves stay finished; unfinished older saves start the new puzzle from the intro", () => {
  assert.deepEqual(parseAudit(null), emptyAudit());
  assert.deepEqual(parseAudit("{nope"), emptyAudit());
  // v0.6 (v2): 해결한 저장 → 끝난 것. 도중(제동·되감기) → 처음부터
  const v2Done = parseAudit(null, '{"schema":2,"braked":true,"link":"original","pos":{"official":0,"original":3},"solved":true,"done":false}');
  assert.equal(v2Done.solved && v2Done.done && v2Done.intro, true);
  assert.deepEqual(parseAudit(null, '{"schema":2,"braked":true,"link":"original","pos":{"official":3,"original":2},"solved":false}'), emptyAudit());
  // v0.4·v0.5 (v1)
  assert.equal(parseAudit(null, null, '{"schema":1,"done":true}').solved, true);
  assert.equal(parseAudit(null, null, '{"schema":1,"taken":true}').solved, true);
  assert.deepEqual(parseAudit(null, null, '{"schema":1,"played":true,"mismatch":true}'), emptyAudit());
  // 새 저장이 있으면 옛 저장은 보지 않는다
  assert.equal(parseAudit(JSON.stringify(emptyAudit()), '{"schema":2,"solved":true}').solved, false);
  // 손상된 봉인판 기록은 처음 배치로 (도입은 본 것으로 남는다)
  const broken = parseAudit(JSON.stringify({ schema: 3, intro: true, seal: { pos: {}, history: [{ id: CASSETTE, from: 1, to: 4 }] }, solved: false }));
  assert.deepEqual(broken.seal, emptySeal());
  assert.equal(broken.intro, true);
  // 'solved'만 손으로 지운 저장: 기록이 배출구에 닿아 있으면 해결로 본다
  const tampered = JSON.parse(JSON.stringify(solvedAudit()));
  tampered.solved = false;
  assert.equal(parseAudit(JSON.stringify(tampered)).solved, true);
  // 실제 저장소에서: v2 해결 저장만 있는 기기
  memory({ [AUDIT_KEY_V2]: '{"schema":2,"solved":true,"done":true}' });
  assert.equal(restPhase(doneA(), loadAudit()), "done");
});

test("restart from A: puzzle A and B go back to the start, nothing else is touched, and it survives a reload", () => {
  const other = {
    "sanlee-visited": '["about","works","writing"]',
    "sanlee-ending": "reject",
    "sanlee-endings-found": '["reject"]',
    "sanlee-backup": '{"n":2}',
    "sanlee-citizen-records-v1": '{"schema":1,"pending":[],"synced":[]}',
  };
  const { values, session } = memory({ ...other, [FACE_KEY]: JSON.stringify(doneA("exception")), [AUDIT_KEY]: JSON.stringify(finishAudit(solvedAudit())), [AUDIT_KEY_V2]: '{"schema":2,"solved":true}', [AUDIT_KEY_V1]: '{"schema":1,"done":true}' });
  applyRestart("a");
  for (const [k, v] of Object.entries(other)) assert.equal(values.get(k), v, k);
  assert.equal(values.has(AUDIT_KEY_V1), false);
  assert.equal(values.has(AUDIT_KEY_V2), false);
  const f = loadFace();
  assert.equal(f.method, null);
  assert.equal(f.solved, false);
  assert.equal(f.legacy, false);
  assert.deepEqual(loadAudit(), emptyAudit());
  assert.equal(restPhase(f, loadAudit()), "dormant");
  assert.equal(session.get(TEST_KEY), "a");
  assert.equal(testStart(), "a");
});

test("restart from B: A's choice stays, a new 2D puzzle starts from the intro, even after B was finished", () => {
  for (const method of ["standard", "exception"]) {
    memory({ [FACE_KEY]: JSON.stringify(doneA(method)), [AUDIT_KEY]: JSON.stringify(finishAudit(solvedAudit())), [AUDIT_KEY_V2]: '{"schema":2,"solved":true}' });
    applyRestart("b");
    const f = loadFace();
    assert.equal(f.method, method, "standard smile / original face is kept");
    assert.equal(f.solved, true, "face and upper body stay restored");
    assert.equal(f.legacy, false);
    const a = loadAudit();
    assert.deepEqual(a, emptyAudit(), "the old v2 finish does not leak back in");
    assert.equal(restPhase(f, a), "ready");
    assert.deepEqual(a.seal.pos, startPositions());
    assert.equal(testStart(), "b");
  }
  assert.equal(restartStates("b", emptyFace()).face.method, "standard");
  assert.equal(restartStates("b", { ...doneA(), legacy: true }).face.legacy, false);
});

test("city-record deletion clears every B save along with puzzle A", async () => {
  const { values } = memory();
  saveFace(doneA());
  saveAudit(played(2));
  values.set(AUDIT_KEY_V2, '{"schema":2,"solved":true}');
  values.set(AUDIT_KEY_V1, '{"schema":1,"done":true}');
  globalThis.window = new EventTarget();
  const backup = await import(`../src/explore/backup.ts?audit=${Date.now()}`);
  backup.forgetCityRecords();
  for (const k of [AUDIT_KEY, AUDIT_KEY_V2, AUDIT_KEY_V1, FACE_KEY]) assert.equal(values.has(k), false, k);
});

test("every puzzle B line has a unique b.* id, a known speaker, both languages and a subtitle time", () => {
  const lines = Object.values(auditLines);
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length);
  for (const l of lines) {
    assert.match(l.id, /^b\.(san|city|archive|guarantor)\./);
    assert.equal(l.id.split(".")[1], l.speaker, l.id);
    assert.ok(speakers[l.speaker], l.id);
    assert.ok(l.ko && l.en, l.id);
    assert.ok(l.ms > 0 && lineDuration(l) === l.ms, l.id);
  }
  assert.deepEqual(auditScenes.san.map((l) => l.ko), ["……내가 거부했었구나.", "그런데 난 왜 아직 여기 있는 거지?"]);
  assert.equal(auditScenes.guarantor[0].ko, "보증인 등록이 필요합니다.");
});

test("the intro tells why and what (official 'accept', San doesn't remember, the original is sealed) without giving away 'reject'", () => {
  const intro = [...auditScenes.official, ...auditScenes.ask, ...auditScenes.sealed];
  assert.deepEqual(intro.map((l) => l.ko), ["공식 기록 · 14:02:01 — 모두 동의", "……내가 동의했다고?", "마지막 순간이 기억나지 않아. 원본을 확인해 줘.", "원본 입력 기록 — 봉인됨"]);
  // 퍼즐을 풀기 전에 보이는 글 어디에도 정답이 없다
  const before = [...intro.flatMap((l) => [l.ko, l.en]), ...Object.values(sealUi).flatMap((l) => [l.ko, l.en]).filter((x) => x !== sealUi.reading.ko), auditUi.sealedSign.ko, auditUi.sealedSign.en, auditUi.quest.ko, auditUi.machine.ko];
  for (const text of before) assert.ok(!/거부|REJECT/i.test(text), text);
  // 길이: 대사만 약 10초, 카메라 전환 포함 12초 남짓
  const ms = intro.reduce((t, l) => t + l.ms, 0);
  assert.ok(ms >= 8000 && ms <= 12000, `${ms}ms`);
  assert.equal(sealUi.goal.ko, "원본 기록을 꺼내세요");
  assert.deepEqual([sealUi.undo.ko, sealUi.reset.ko, sealUi.exit.ko], ["되돌리기", "처음부터", "나가기"]);
});

test("after B: the San scene leaves a silence between the two lines, then the guarantor; NPCs move on to their after-B lines", () => {
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
  for (const npc of ["keeper", "radio", "monk"]) {
    assert.ok(npcStages[npc].c?.length, npc);
    // 퍼즐 전(b) 대사에는 정답이 없다
    for (const l of npcStages[npc].b ?? []) assert.ok(!/거부|refus|reject/i.test(l.ko + l.en), `${npc}: ${l.ko}`);
  }
});
