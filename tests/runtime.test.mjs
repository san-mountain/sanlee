import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameTimers, runtime } from '../src/explore/runtime.ts';
import { finalStepTarget, uniqueIds } from '../src/explore/progress.ts';
import { input, resetInput, moveVector } from '../src/explore/input.ts';

test('paused session preserves remaining time and resumes exactly once', () => {
  const original = performance.now;
  let wall = 0;
  performance.now = () => wall;
  try {
    runtime.reset();
    const timers = new GameTimers();
    let completed = 0;
    timers.setTimeout(() => completed++, 3400);
    let previous = runtime.now();
    const frame = () => { const now = runtime.now(); timers.advance(now - previous); previous = now; };
    wall = 1000; frame();
    runtime.setPaused(true);
    wall = 16000; frame();
    assert.equal(completed, 0);
    runtime.setPaused(false);
    wall = 18399; frame();
    assert.equal(completed, 0);
    wall = 18400; frame();
    assert.equal(completed, 1);
    wall = 20000; frame();
    assert.equal(completed, 1);
  } finally { performance.now = original; runtime.reset(); }
});

test('unmount cancellation prevents an old death callback from changing a new session', () => {
  const old = new GameTimers();
  const fresh = new GameTimers();
  let position = 'new-session';
  old.setTimeout(() => { position = 'old-spawn'; }, 3400);
  old.advance(900);
  old.clear();
  fresh.setTimeout(() => { position = 'new-checkpoint'; }, 100);
  fresh.advance(100);
  old.advance(10000);
  assert.equal(position, 'new-checkpoint');
});

test('cancelled interval cannot rearm itself; pending callbacks can cancel other due tasks', () => {
  const timers = new GameTimers();
  let count = 0;
  const interval = timers.setInterval(() => { count++; timers.clearInterval(interval); }, 100);
  timers.advance(100);
  timers.advance(1000);
  assert.equal(count, 1);
  timers.setTimeout(() => timers.clearTimeout(other), 100);
  const other = timers.setTimeout(() => count++, 100);
  timers.advance(100);
  assert.equal(count, 1);
});

test('final step remains reachable for every legal landing start, including walking ahead', () => {
  for (const x of [0, 4, 6, 7.3, 7.5, 7.6, 8.4, 8.5]) {
    const target = finalStepTarget(x, 4, 8.5);
    assert.ok(target >= 5.2 && target < 8.5, `unreachable from ${x}: ${target}`);
  }
  assert.equal(finalStepTarget(7.3, 4, 8.5), 8.3);
});

test('duplicate and unknown stored records cannot count as three distinct terminals', () => {
  assert.deepEqual(uniqueIds(['about', 'about', 'unknown', null], ['about', 'works', 'writing']), ['about']);
  assert.deepEqual(uniqueIds(null, ['about']), []);
  assert.deepEqual(uniqueIds(['writing', 'about', 'works'], ['about', 'works', 'writing']), ['writing', 'about', 'works']);
});

test('focus loss resets all transient controls while preserving user settings', () => {
  input.keys.add('KeyW'); input.joy.x = 1; input.joy.y = 1;
  input.look.yaw = 2; input.look.pitch = 3;
  input.jump = input.jumpHeld = input.runLatch = true;
  input.sens = 1.7; input.bob = false;
  resetInput();
  assert.deepEqual(moveVector(), {x: 0, y: 0, run: false});
  assert.deepEqual(input.look, {yaw: 0, pitch: 0});
  assert.equal(input.jump || input.jumpHeld || input.runLatch, false);
  assert.equal(input.sens, 1.7); assert.equal(input.bob, false);
});
