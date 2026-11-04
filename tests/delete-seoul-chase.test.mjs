// Run on Node 22+: node --experimental-strip-types --test tests/delete-seoul-chase.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  initialRun, act, openGate, finish, retry, currentTarget, FUSES, GATE_PANEL,
  scannerExposure, collide, GATE_Z,
} from "../src/explore/v3/chaseLogic.ts";

test("two repairs unlock the chase; gate opens only after activation", () => {
  const start = initialRun();
  assert.equal(act(start, "gate"), start);
  const first = act(start, "fuse-west");
  assert.equal(first.phase, "repair");
  const second = act(first, "fuse-east");
  assert.equal(second.phase, "chase");
  assert.equal(act(second, "fuse-west"), second);
  const unlocking = act(second, "gate");
  assert.equal(unlocking.phase, "unlocking");
  assert.equal(finish(unlocking, { x: 0, z: -40 }).phase, "unlocking");
  assert.equal(finish(openGate(unlocking), { x: 0, z: -40 }).phase, "complete");
});

test("interaction range is enforced by proximity", () => {
  assert.equal(currentTarget(initialRun(), { x: 0, z: 13 }), null);
  assert.equal(currentTarget(initialRun(), FUSES[0]), "fuse-west");
  const chase = act(act(initialRun(), "fuse-west"), "fuse-east");
  assert.equal(currentTarget(chase, FUSES[0]), null);
  assert.equal(currentTarget(chase, GATE_PANEL), "gate");
});

test("scanner only detects when active and in sweep", () => {
  assert.equal(scannerExposure({ x: 0, z: -8 }, 0, false).exposed, false);
  assert.equal(scannerExposure({ x: 0, z: -8 }, 0, true).exposed, true);
  assert.equal(scannerExposure({ x: 6, z: -8 }, 0, true).exposed, false);
});

test("locked gate and retry checkpoint preserve intended state", () => {
  assert.ok(collide({ x: 0, z: GATE_Z }, false).z > GATE_Z);
  assert.deepEqual(retry(initialRun()).fuses, [true, true]);
  assert.equal(retry(initialRun()).phase, "chase");
});
