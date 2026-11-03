import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoWalk, gaze, resetGaze, resetGazeSession } from '../src/explore/gaze.ts';
import { createSessionTimers } from '../src/explore/useSessionTimers.ts';

test('exit clears forced camera, automatic walking and transient gaze without touching storage', () => {
  globalThis.localStorage = new Proxy({}, { get() { throw Error('persistent progress must not be accessed'); } });
  Object.assign(gaze, { meter: 95, state: 'lock', inZone: true, seen: true, hiddenBy: 'cover', shake: 1, dead: 123, deaths: 4, enabled: true, frozen: true, firstSeenAt: 123, mood: 'blind', intro: true, lookAt: { x: 1, y: 2, z: 3 } });
  autoWalk.to = { x: 4, z: 5, speed: 3 };
  resetGazeSession();
  assert.equal(autoWalk.to, null);
  assert.deepEqual(gaze, { meter: 0, state: 'idle', inZone: false, seen: false, hiddenBy: '', shake: 0, dead: 0, deaths: 0, enabled: false, frozen: false, firstSeenAt: 0, mood: '', intro: false, lookAt: null });
  resetGazeSession();
  assert.equal(gaze.lookAt, null);
});

test('in-game reset continues to preserve cinematic and ending context', () => {
  gaze.mood = 'calm'; gaze.intro = true; gaze.lookAt = { x: 1, y: 2, z: 3 };
  autoWalk.to = { x: 4, z: 5, speed: 3 };
  resetGaze();
  assert.equal(gaze.mood, 'calm');
  assert.equal(gaze.intro, true);
  assert.notEqual(autoWalk.to, null);
  assert.notEqual(gaze.lookAt, null);
  resetGazeSession();
});

test('exit cancels delayed ending movement and pending restores', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const timers = createSessionTimers();
  let restores = 0;
  timers.schedule(() => { autoWalk.to = { x: 1, z: 2, speed: 3 }; }, 6800);
  timers.schedule(() => restores++, 3400);
  timers.clear(); resetGazeSession();
  t.mock.timers.tick(10000);
  assert.equal(autoWalk.to, null);
  assert.equal(restores, 0);
});

test('nested zone-transition backup is cancelled when exiting after its parent has run', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const timers = createSessionTimers(); let backups = 0;
  timers.schedule(() => timers.schedule(() => backups++, 700), 900);
  t.mock.timers.tick(900);
  timers.clear();
  t.mock.timers.tick(700);
  assert.equal(backups, 0);
});

test('uninterrupted cinematic timers keep their original order and delays', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const timers = createSessionTimers(); const calls = [];
  timers.schedule(() => { calls.push('zone'); timers.schedule(() => calls.push('backup'), 700); }, 900);
  t.mock.timers.tick(899); assert.deepEqual(calls, []);
  t.mock.timers.tick(1); assert.deepEqual(calls, ['zone']);
  t.mock.timers.tick(700); assert.deepEqual(calls, ['zone', 'backup']);
});

test('timer scope remains usable after effect cleanup/setup, including cancelled callbacks', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const timers = createSessionTimers(); let calls = 0;
  const id = timers.schedule(() => calls++, 10);
  clearTimeout(id); timers.clear(); timers.clear();
  timers.schedule(() => calls++, 10);
  t.mock.timers.tick(10); assert.equal(calls, 1);
});
