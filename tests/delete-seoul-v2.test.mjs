import { test } from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";
const S = await import("../src/explore/v2/story.ts");

test("stage transitions are gated and deterministic", () => {
  let s = S.initialStory();
  assert.equal(S.advanceStory(s, "enter-city"), s);
  for (const [event, phase] of [["meet-san","recovery"],["read-origin","origin"],["restore-san","restored"],["discover-source","discovered"],["confront-san","confronted"],["enter-city","crossing"],["reach-core","decision"],["keep-record","kept"]]) {
    s = S.advanceStory(s, event);
    assert.equal(s.phase, phase);
  }
  assert.equal(S.advanceStory(s, "leave"), s);
});

test("relationships are optional and deleting v2 does not delete original saves", () => {
  const s = S.remember(S.initialStory(), "r07Friend");
  assert.equal(s.memories.r07Friend, true);
  const m = new Map([["sanlee-face-auth-v1", "original"]]);
  const storage = {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
  S.writeStory(s,storage);
  assert.deepEqual(S.readStory(storage), s);
  S.eraseStory(storage);
  assert.equal(m.get("sanlee-face-auth-v1"), "original");
  assert.equal(m.has(S.STORY_V2_KEY), false);
});

test("corrupt saves start clean", () => {
  assert.deepEqual(S.parseStory("{"), S.initialStory());
  assert.deepEqual(S.parseStory(null), S.initialStory());
});
