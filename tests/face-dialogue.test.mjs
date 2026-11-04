import { test } from "node:test";
import assert from "node:assert/strict";
import { faceLines, faceScenes, speakers } from "../src/explore/story.ts";
import { lineDuration, playLines } from "../src/explore/dialogue.ts";

test("every spoken line has a unique id, a known speaker, Korean and English text, and a subtitle time", () => {
  const lines = Object.values(faceLines);
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length);
  for (const l of lines) {
    assert.match(l.id, /^a\.(san|city|machine)\./);
    assert.ok(speakers[l.speaker], l.id);
    assert.ok(l.ko && l.en, l.id);
    assert.ok(l.ms > 0 && lineDuration(l) === l.ms, l.id);
  }
});

test("a scene shows each subtitle in order and moves on only after the last one ends (no voice needed)", () => {
  const shown = [];
  const queue = [];
  let clock = 0;
  let done = 0;
  playLines(faceScenes.wake.exception, { show: (l) => shown.push(l?.id ?? null), later: (ms, fn) => queue.push([clock + ms, fn]) }, () => done++);
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [at, fn] = queue.shift();
    clock = at;
    fn();
  }
  assert.deepEqual(shown, ["a.san.thanks", "a.san.own-face", "a.san.legs", null]);
  assert.equal(done, 1);
  assert.equal(clock, faceScenes.wake.exception.reduce((s, l) => s + l.ms, 0));
});


test("manual story dialogue holds every line until the player explicitly advances it", () => {
  const shown = [];
  const timers = [];
  let next = null;
  let finished = 0;
  const scene = faceScenes.wake.exception;
  playLines(scene, {
    show: (line) => shown.push(line?.id ?? null),
    later: (ms, fn) => timers.push([ms, fn]),
    waitForAdvance: (fn) => { next = fn; },
  }, () => finished++, 0, "manual");
  assert.deepEqual(shown, [scene[0].id]);
  assert.equal(timers.length, 0, "manual lines do not auto-advance with a timer");
  assert.equal(finished, 0);
  for (const [i, line] of scene.entries()) {
    assert.equal(shown.at(-1), line.id);
    assert.equal(typeof next, "function");
    next();
    if (i < scene.length - 1) assert.equal(shown.at(-1), scene[i + 1].id);
  }
  assert.equal(next, null);
  assert.equal(finished, 1);
  assert.equal(shown.at(-1), null);
});

test("manual lines respect an intentional dramatic pause between two spoken lines", () => {
  const queue = [];
  let next = null;
  let finished = 0;
  const scene = faceScenes.wake.standard.slice(0, 2);
  playLines(scene, {
    show: () => {},
    later: (ms, fn) => queue.push([ms, fn]),
    waitForAdvance: (fn) => { next = fn; },
  }, () => finished++, 500, "manual");
  next();
  assert.equal(next, null);
  assert.equal(queue[0][0], 500);
  assert.equal(finished, 0);
  queue.shift()[1]();
  assert.equal(typeof next, "function");
  next();
  assert.equal(finished, 1);
});
