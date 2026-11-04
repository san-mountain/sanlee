// DELETE SEOUL 추격 실험판(/deleteseoul-lab/chase) 로직·입력 테스트
// node --test tests/delete-seoul-chase.test.mjs  (Node 22: --experimental-strip-types)
import test from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";

const L = await import("../src/explore/v3/chase/logic.ts");
const LV = await import("../src/explore/v3/chase/level.ts");
const { ChaseInput } = await import("../src/explore/v3/chase/input.ts");

const idle = { move: { x: 0, y: 0, run: false }, look: { yaw: 0, pitch: 0 }, hold: false };
const holdIn = { ...idle, hold: true };
const run = (g, seconds, f = idle) => {
  for (let t = 0; t < seconds; t += 1 / 60) L.stepGame(g, 1 / 60, f);
  return g;
};
const place = (g, p) => Object.assign(g.player, { x: p.x, z: p.z });

function toRelay() {
  const g = L.newGame();
  run(g, 10); // 이산이 셔터 제어판으로 가서 문을 연다
  assert.equal(g.shutter.state, "open", "San opens the shutter on their own");
  assert.equal(g.phase, "relay");
  place(g, { x: LV.RELAY.x + 1.2, z: LV.RELAY.z });
  return g;
}

test("San opens the shutter (cooperation) and the shutter blocks until then", () => {
  const g = L.newGame();
  place(g, { x: 0, z: 19 });
  L.stepGame(g, 1 / 60, { ...idle, move: { x: 0, y: 1, run: true } });
  assert.ok(g.player.z >= LV.SHUTTER_Z + 0.2 + LV.PLAYER_RADIUS - 1e-6, "closed shutter is solid");
  run(g, 9);
  assert.equal(g.shutter.state, "open");
  run(g, 1, { ...idle, move: { x: 0, y: 1, run: true } });
  assert.ok(g.player.z < LV.SHUTTER_Z, "open shutter can be passed");
});

test("San warns while the player is holding the relay, not before", () => {
  const g = toRelay();
  run(g, 0.2, holdIn);
  assert.equal(g.relay.warned, false);
  run(g, 0.4, holdIn);
  assert.equal(g.relay.warned, true);
  assert.equal(g.line?.text, "잠깐. 그건 건드리지 마.");
  assert.equal(g.phase, "relay", "warning arrives just before activation");
});

test("stopping after the warning gets its own reaction, and the relay is still required", () => {
  const g = toRelay();
  run(g, 0.6, holdIn);
  run(g, 2.0);
  assert.equal(g.relay.hesitated, true);
  assert.equal(g.line?.text, "……고마워.");
  run(g, 3);
  assert.match(g.line?.text ?? "", /문도 안 열려/);
  assert.equal(g.phase, "relay");
  run(g, 2.2, holdIn);
  assert.equal(g.phase, "surge");
});

test("surge sequence: lights, short lines, silence, searchlight, then RUN", () => {
  const g = toRelay();
  run(g, 2.1, holdIn);
  assert.equal(g.phase, "surge");
  const seen = [];
  for (let i = 0; i < 60 * 8; i++) {
    L.stepGame(g, 1 / 60, idle);
    if (g.line && seen.at(-1) !== g.line.text) seen.push(g.line.text);
  }
  assert.deepEqual(seen, ["……젠장.", "전력만 돌아오는 게 아니야.", "[미등록 개체 감지]", "뛰어!"]);
  assert.equal(g.phase, "chase");
  assert.ok(g.lights.filter((l) => l.on).length >= 3);
});

function toChase() {
  const g = toRelay();
  run(g, 2.1, holdIn);
  run(g, 7.5);
  assert.equal(g.phase, "chase");
  return g;
}

test("standing in a searchlight fills the meter and gets caught; cover breaks line of sight", () => {
  const g = toChase();
  g.grace = 0;
  const l = g.lights.find((x) => x.def.id === "L1");
  place(g, { x: l.x, z: l.z });
  run(g, 0.5);
  assert.ok(g.exposed);
  assert.ok(g.meter > 0.2);
  run(g, 2);
  assert.equal(g.caught, true);

  // 엄폐: 컨테이너 북쪽(광원 반대편) 바로 뒤는 L1의 그림자 안이다
  const lights = [{ ...l, on: true, x: -6.4, z: -4.9, tracking: false }];
  const exp = L.exposureOf(lights, { x: -6.4, z: -4.9, y: 0 });
  assert.equal(exp.exposed, false);
  assert.equal(exp.covered, true);
  const open = L.exposureOf(lights.map((x) => ({ ...x, x: 0, z: -4.9 })), { x: 0, z: -4.9, y: 0 });
  assert.equal(open.exposed, true);
});

test("meter decays when out of sight", () => {
  const g = toChase();
  g.grace = 0;
  g.meter = 0.6;
  place(g, LV.CHECKPOINTS.chase);
  run(g, 1);
  assert.ok(g.meter < 0.4);
});

test("retry restarts at the checkpoint, keeps repairs, and San remembers the failure once", () => {
  const g = toChase();
  g.grace = 0;
  const l = g.lights.find((x) => x.def.id === "L1");
  l.x = -6; l.z = -12; l.seg = 0;
  place(g, { x: -6, z: -12 });
  run(g, 2.5);
  assert.equal(g.caught, true);
  L.retryFromCheckpoint(g);
  assert.equal(g.phase, "chase");
  assert.equal(g.relay.done, true);
  assert.deepEqual({ x: g.player.x, z: g.player.z }, LV.CHECKPOINTS.chase);
  assert.equal(g.meter, 0);
  run(g, 1);
  assert.equal(g.line?.text, "이번에는 오른쪽으로 가 보자. 아까는 왼쪽에서 막혔잖아.");
  g.caught = true; g.caughtAt = { x: 5, z: -10 };
  L.retryFromCheckpoint(g);
  run(g, 1.5);
  assert.doesNotMatch(g.line?.text ?? "", /아까는/, "memory line is not repeated");
});

test("gate needs a held, accumulated override; then escape to the subway completes", () => {
  const g = toChase();
  // 감시등은 끄고 규칙만 확인한다
  for (const l of g.lights) l.on = false;
  place(g, { x: LV.GATE_PANEL.x, z: LV.GATE_PANEL.z + 1.5 });
  run(g, 1.5, holdIn);
  assert.equal(g.phase, "chase");
  const partial = g.gate.hold;
  run(g, 1);
  assert.ok(g.gate.hold > partial - 0.2, "progress is kept (slow decay) when released");
  run(g, 2.5, holdIn);
  assert.equal(g.phase, "escape");
  assert.equal(g.checkpoint, "gate");
  run(g, 2);
  for (const l of g.lights) l.on = false;
  place(g, { x: 0, z: -45 });
  run(g, 3, { ...idle, move: { x: 0, y: 1, run: true } });
  assert.equal(g.phase, "complete");
  assert.ok(g.player.y < -1, "player descends the stairs");
});

test("closed gate is solid", () => {
  const g = toChase();
  place(g, { x: 0, z: LV.GATE_Z + 1 });
  run(g, 1, { ...idle, move: { x: 0, y: 1, run: true } });
  assert.ok(g.player.z > LV.GATE_Z);
});

test("pausing = not stepping: nothing advances", () => {
  const g = toChase();
  const snap = JSON.stringify(L.snapshot(g));
  const t = g.time;
  assert.equal(JSON.stringify(L.snapshot(g)), snap);
  assert.equal(g.time, t);
});

test("ChaseInput: joystick + keys merge, disabled input yields no movement, release stops instantly", () => {
  const i = new ChaseInput();
  assert.deepEqual(i.moveVector(), { x: 0, y: 0, run: false });
  i.enabled = true;
  i.joy.x = 0; i.joy.y = 1;
  assert.deepEqual(i.moveVector(), { x: 0, y: 1, run: true });
  i.joy.y = 0.5;
  assert.equal(i.moveVector().run, false);
  i.keys.add("KeyD");
  const m = i.moveVector();
  assert.ok(Math.abs(Math.hypot(m.x, m.y) - 1) < 1e-9, "normalised");
  i.releaseAll();
  assert.deepEqual(i.moveVector(), { x: 0, y: 0, run: false });
  i.enabled = false;
  i.joy.y = 1;
  assert.deepEqual(i.moveVector(), { x: 0, y: 0, run: false });
});

test("player forward follows yaw", () => {
  const g = toChase();
  for (const l of g.lights) l.on = false;
  place(g, { x: 0, z: -2 });
  g.player.yaw = Math.PI / 2; // 왼쪽(-x)을 본다
  run(g, 0.5, { ...idle, move: { x: 0, y: 1, run: false } });
  assert.ok(g.player.x < -1.5 && Math.abs(g.player.z + 2) < 0.05);
});
