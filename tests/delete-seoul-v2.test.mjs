import { test } from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";
const S = await import("../src/explore/v2/story.ts");

test("a full 3D narrative progresses through investigation, comparison and confrontation", () => {
  let state = S.initialStory();
  assert.equal(state.schema, 2);
  assert.equal(S.advanceStory(state, "enter-city"), state, "cannot skip the story");
  state = S.advanceStory(state, "meet-san");
  assert.equal(state.phase, "recovery");
  state = S.inspectSource(state, "about");
  assert.equal(S.sourceCount(state), 1);
  state = S.inspectSource(state, "writing");
  assert.equal(S.sourceCount(state), 2);
  state = S.advanceStory(state, "read-origin");
  assert.equal(state.phase, "origin");
  state = S.advanceStory(state, "restore-san");
  assert.equal(state.phase, "restored");
  state = S.advanceStory(state, "begin-investigation");
  assert.equal(state.phase, "investigating");
  state = S.observeClue(state, "r07");
  state = S.observeClue(state, "child");
  assert.equal(state.phase, "investigating");
  assert.equal(S.clueCount(state), 2);
  state = S.observeClue(state, "radio");
  assert.equal(state.phase, "evidence");
  state = S.compareClue(state, "r07");
  state = S.compareClue(state, "child");
  assert.equal(state.phase, "evidence");
  assert.equal(S.comparisonCount(state), 2);
  state = S.compareClue(state, "radio");
  assert.equal(state.phase, "discovered");
  state = S.advanceStory(state, "question-keeper");
  assert.equal(state.phase, "keeperQuestioned");
  state = S.advanceStory(state, "confront-san");
  assert.equal(state.phase, "confronted");
  state = S.advanceStory(state, "enter-city");
  assert.equal(state.phase, "crossing");
  state = S.advanceStory(state, "reach-core");
  assert.equal(state.phase, "decision");
  state = S.advanceStory(state, "keep-record");
  assert.equal(state.phase, "kept");
});

test("relationships are independent of required clues; observations are idempotent", () => {
  let state = S.initialStory();
  state = S.remember(state, "r07Friend");
  assert.equal(state.memories.r07Friend, true);
  assert.equal(S.observeClue(state, "r07"), state);
  for (const e of ["meet-san", "read-origin", "restore-san", "begin-investigation"]) {
    state = S.advanceStory(state, e);
  }
  state = S.observeClue(state, "r07");
  assert.equal(state.clues.r07, true);
  assert.equal(S.observeClue(state, "r07"), state);
  assert.equal(state.memories.r07Friend, true);
});

test("leaving the story is a separate unfinished ending", () => {
  let state = S.initialStory();
  for (const e of ["meet-san", "read-origin", "restore-san", "begin-investigation"]) state = S.advanceStory(state, e);
  for (const k of ["r07", "child", "radio"]) state = S.observeClue(state, k);
  for (const k of ["r07", "child", "radio"]) state = S.compareClue(state, k);
  for (const e of ["question-keeper", "confront-san"]) state = S.advanceStory(state, e);
  state = S.advanceStory(state, "leave");
  assert.equal(state.phase, "left");
  assert.equal(S.atLeast(state, "crossing"), false);
  assert.equal(S.remember(state, "childDrawing"), state);
});

test("save migration is stable and lab erasure preserves the old game's data", () => {
  const old = { schema: 1, phase: "discovered", memories: S.initialStory().memories };
  assert.equal(S.parseStory(JSON.stringify(old)).phase, "restored");
  const map = new Map([["sanlee-face-auth-v1", "original"]]);
  const storage = { getItem:k=>map.get(k)??null, setItem:(k,v)=>map.set(k,String(v)), removeItem:k=>map.delete(k) };
  let state = S.advanceStory(S.initialStory(), "meet-san");
  state = S.inspectSource(state, "works");
  S.writeStory(state, storage);
  assert.deepEqual(S.readStory(storage), state);
  S.eraseStory(storage);
  assert.equal(map.get("sanlee-face-auth-v1"), "original");
  assert.equal(map.has(S.STORY_V2_KEY), false);
});

test("invalid saves restore an empty state", () => {
  assert.deepEqual(S.parseStory("{"), S.initialStory());
  assert.deepEqual(S.parseStory(null), S.initialStory());
  assert.deepEqual(S.parseStory(JSON.stringify({ schema: 2, phase: "confronted", memories: { r07Friend: "yes" } })), S.initialStory());
});
