import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const player = source("src/explore/Player.tsx");
const hud = source("src/explore/InteractionGuide.tsx");
const client = source("src/explore/ExploreClient.tsx");
const touch = source("src/explore/TouchControls.tsx");
const css = source("src/app/globals.css");
const statue = source("src/explore/Statue.tsx");
const zones = source("src/explore/zones.ts");
const story = source("src/explore/story.ts");

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

test("NPC interaction is farther-reaching, but the 3D device does not open prematurely", () => {
  assert.match(player, /it\.kind === "npc" \? 2\.0/);
  assert.match(player, /it\.kind === "statue" \? 1\.5/);
  assert.match(zones, /auditRt\.phase === "ready" && auditRt\.introSeen/);
  const open = client.slice(client.indexOf("const openSeal"), client.indexOf("const closeSeal"));
  assert.ok(open.includes('if (auditRt.phase !== "ready" || !auditRef.current.intro) return;'));
});

test("B reveal starts on approach from 6m, before the player can open the 2D game", () => {
  assert.ok(client.includes('Math.hypot(AUDIT_MACHINE.pos[0] - player.pos.x, AUDIT_MACHINE.pos[2] - player.pos.z) <= 6'));
  assert.ok(client.includes('auditRt.introSeen = true;'));
  assert.match(client, /auditRt\.introSeen = a\.intro/);
});

test("quest marker remains legible near the objective and San's cookie remains visible after A", () => {
  assert.ok(client.includes('target.pos.z - pz) < 2.15'));
  assert.match(css, /\.quest\.close \{ opacity: \.88/);
  assert.ok(statue.includes('{showCookie && <Cookie />}'));
});

test("B uses SEOUL.SYS before Great Compassion is introduced; refusal ending has a distinct management record", () => {
  const b = story.slice(story.indexOf('// ---------------- 퍼즐 B'), story.indexOf('// 개발·검수용 재시작'));
  assert.ok(b.includes('SEOUL.SYS 강제 정정'));
  assert.ok(!b.includes('ko: "대자비 강제 정정"'));
  assert.ok(story.includes('거부 의사는 관리용 쿠키 1개에 따로 저장됩니다'));
});
