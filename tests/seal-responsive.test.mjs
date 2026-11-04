import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const panel = readFileSync(new URL("../src/explore/SealPanel.tsx", import.meta.url), "utf8");

const rule = (selector) => {
  const at = css.indexOf(selector + " {");
  assert.ok(at >= 0, "missing CSS rule " + selector);
  return css.slice(at, css.indexOf("}", at) + 1);
};

test("result popup animates around its center instead of resetting translate", () => {
  const popup = rule(".seal-read");
  assert.match(popup, /left:\s*50%/);
  assert.match(popup, /top:\s*50%/);
  assert.match(popup, /transform:\s*translate\(-50%,\s*-50%\)/);
  assert.match(popup, /animation:\s*seal-read-in/);
  assert.doesNotMatch(popup, /animation:\s*seal-in\b/);
  const at = css.indexOf("@keyframes seal-read-in {");
  assert.ok(at >= 0);
  const keyframes = css.slice(at, css.indexOf("\n}", at));
  assert.equal((keyframes.match(/translate\(-50%,\s*-50%\)/g) ?? []).length, 2);
});

test("mobile board and overlay reserve actual border and safe-area space", () => {
  assert.match(rule(".seal-machine"), /100vw - 80px/);
  assert.match(rule(".seal-read"), /width:\s*min\(420px/);
  assert.match(rule(".seal-read"), /max-width:\s*calc\(100% - 48px/);
  assert.match(rule(".seal-read"), /box-sizing:\s*border-box/);
});

test("touch cancellation does not commit an unintended move", () => {
  assert.match(panel, /onPointerCancel=\{\(e\) => cancel\(e, p\)\}/);
  assert.match(panel, /onLostPointerCapture=\{\(e\) => cancel\(e, p\)\}/);
  const cancel = panel.slice(panel.indexOf("const cancel = "), panel.indexOf("const cells = "));
  assert.ok(!cancel.includes("onMove("));
});

test("successful extraction presents the forced refusal-to-consent mapping", () => {
  assert.match(panel, /L\(ORIGINAL_RECORD\)/);
  assert.match(panel, /L\(OFFICIAL_RECORD\)/);
  assert.match(panel, /L\(sealUi\.forcedTag\)/);
  assert.match(css, /\.seal-read-record\.is-original/);
  assert.match(css, /\.seal-read-record\.is-official/);
});
