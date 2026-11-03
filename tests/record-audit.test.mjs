import { test } from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";
import {
  AUDIT_KEY,
  auditAvailable,
  auditSolved,
  emptyAudit,
  finishAudit,
  interruptRevisionPress,
  loadAudit,
  parseAudit,
  restPhase,
  saveAudit,
  takeSlip,
} from "../src/explore/recordAudit.ts";
import { FACE_KEY, loadFace, saveFace, emptyFace } from "../src/explore/faceAuth.ts";
import { auditLines, auditScenes, speakers } from "../src/explore/story.ts";
import { lineDuration, playLines } from "../src/explore/dialogue.ts";

const memory = (seed = {}) => {
  const values = new Map(Object.entries(seed));
  globalThis.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
  return values;
};
const doneA = (method = "standard") => ({ ...emptyFace(), drums: [0, 0, 0], solved: true, method });
const reload = () => loadAudit();

test("B starts running automatically when A is complete and never appears on legacy path", () => {
  assert.equal(auditAvailable(emptyFace()), false);
  assert.equal(auditAvailable(doneA()), true);
  assert.equal(auditAvailable({ ...doneA(), legacy: true }), false);
  assert.equal(restPhase(emptyFace(), emptyAudit()), "dormant");
  assert.equal(restPhase(doneA(), emptyAudit()), "test");
  assert.equal(restPhase({ ...doneA(), legacy: true }, { ...emptyAudit(), done: true }), "dormant");
});

test("stop the stamp once, then pull the original; neither step is a menu choice", () => {
  const start = emptyAudit();
  assert.equal(takeSlip(start).taken, false);
  const interrupted = interruptRevisionPress(start);
  assert.equal(interrupted.status, "mismatch");
  assert.equal(interrupted.firstMismatch, true);
  assert.equal(interrupted.state.mismatch, true);
  assert.equal(interrupted.state.played, true);
  assert.equal(restPhase(doneA(), interrupted.state), "slip");
  const proof = takeSlip(interrupted.state);
  assert.equal(auditSolved(proof), true);
  assert.equal(finishAudit(proof).done, true);
});

test("progress survives reload at each point, with old in-progress B data readable", () => {
  memory();
  const face = doneA("exception");
  saveAudit(emptyAudit());
  assert.equal(restPhase(face, reload()), "test");

  const stopped = interruptRevisionPress(reload()).state;
  saveAudit(stopped);
  assert.equal(restPhase(face, reload()), "slip");

  saveAudit(takeSlip(reload()));
  assert.equal(reload().taken, true);
  assert.equal(restPhase(face, reload()), "slip");

  saveAudit(finishAudit(reload()));
  assert.equal(reload().done, true);
  assert.equal(restPhase(face, reload()), "done");

  const previousDone = parseAudit('{"schema":1,"done":true}');
  assert.equal(previousDone.done, true);
  assert.equal(previousDone.taken, true);
  assert.equal(previousDone.mismatch, true);
  assert.equal(restPhase(face, previousDone), "done");

  const previousStopped = parseAudit('{"schema":1,"mismatch":true,"played":true}');
  assert.equal(restPhase(face, previousStopped), "slip");
});

test("damaged saves do not crash or silently advance", () => {
  assert.deepEqual(parseAudit(null), emptyAudit());
  assert.deepEqual(parseAudit("{not json"), emptyAudit());
  assert.deepEqual(parseAudit('{"schema":99,"done":true}'), emptyAudit());
});

test("B completion does not overwrite A's choice or change legacy flags", () => {
  const values = memory();
  saveFace(doneA("exception"));
  const before = values.get(FACE_KEY);
  saveAudit(finishAudit(takeSlip(interruptRevisionPress(emptyAudit()).state)));
  assert.equal(values.get(FACE_KEY), before);
  assert.equal(loadFace().method, "exception");
  assert.equal(loadFace().legacy, false);
  assert.ok(values.has(AUDIT_KEY));
});

test("city record deletion clears both A and B save keys", async () => {
  const values = memory();
  saveFace(doneA());
  saveAudit(finishAudit(takeSlip(interruptRevisionPress(emptyAudit()).state)));
  globalThis.window = new EventTarget();
  const backup = await import(`../src/explore/backup.ts?stamp=${Date.now()}`);
  backup.forgetCityRecords();
  assert.equal(values.has(AUDIT_KEY), false);
  assert.equal(values.has(FACE_KEY), false);
  assert.deepEqual(loadAudit(), emptyAudit());
});

test("B dialogue is brief and voice-ready, without accept/reject test dialogue", () => {
  const lines = Object.values(auditLines);
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length);
  for (const l of lines) {
    assert.match(l.id, /^b\.(san|city|verifier|guarantor)\./);
    assert.equal(l.id.split(".")[1], l.speaker);
    assert.ok(speakers[l.speaker], l.id);
    assert.ok(l.ko && l.en, l.id);
    assert.ok(l.ms > 0 && lineDuration(l) === l.ms, l.id);
  }
  assert.deepEqual(Object.keys(auditScenes), ["mismatch", "cut", "san", "guarantor", "after"]);
  assert.deepEqual(auditScenes.san.map((l) => l.speaker), ["san", "san"]);
});

test("San's response retains a silence before the second line", () => {
  const shown = [], queue = [];
  let clock = 0, done = 0;
  playLines(auditScenes.san, {
    show: (l) => shown.push(l?.id ?? null),
    later: (ms, fn) => queue.push([clock + ms, fn]),
  }, () => done++, 1400);
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [at, fn] = queue.shift();
    clock = at;
    fn();
  }
  assert.deepEqual(shown, ["b.san.refused", null, "b.san.still-here", null]);
  assert.equal(done, 1);
});
