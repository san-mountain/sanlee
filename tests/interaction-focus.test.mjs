import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const player = source("src/explore/Player.tsx");
const hud = source("src/explore/InteractionGuide.tsx");
const client = source("src/explore/ExploreClient.tsx");
const touch = source("src/explore/TouchControls.tsx");
const css = source("src/app/globals.css");

test("interaction picking uses on-screen candidates and keeps selection stable", () => {
  assert.match(player, /\.project\(camera\)/);
  assert.match(player, /Math\.abs\(x\) > 1\.08/);
  assert.match(player, /s\.near === it\.id \? 0 : 0\.26/);
  assert.match(player, /camera\.updateMatrixWorld\(\)/);
  assert.ok(player.includes('faceRt.screen[`drum-${faceRt.aim}`]'));
});

test("mobile wire targets only one selected 3D part with no extra labels or hit surface", () => {
  assert.match(hud, /interactionProjection/);
  assert.match(hud, /querySelector<HTMLElement>\("\.interact-btn"\)/);
  assert.match(client, /<InteractionGuide active=\{active && touch && !cine && !!near\}/);
  assert.match(css, /\.interaction-guide \{[^}]*pointer-events: none/s);
});

test("jump never changes its action, contextual interaction is a separate control", () => {
  assert.match(touch, /className="jump-btn"/);
  assert.match(touch, /className="interact-btn"/);
  assert.ok(!touch.includes('className="jump-btn act"'));
  assert.match(touch, /input\.jump = true/);
  assert.match(touch, /action\.run\(\)/);
});

test("B cutscene only starts after the player opens the record archive", () => {
  const wake = client.slice(client.indexOf("const finishWake"), client.indexOf("const startWake"));
  assert.ok(!wake.includes("startIntro"));
  const open = client.slice(client.indexOf("const openSeal"), client.indexOf("const closeSeal"));
  assert.match(open, /if \(!auditRef\.current\.intro\) return startIntro\(\)/);
  assert.match(client, /setPanel\(\{ kind: "seal" \}\)/);
  assert.ok(!client.includes("startIntroRef.current()"));
});
