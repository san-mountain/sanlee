import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../src/explore/Jabi.tsx', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('function GazeSystem()'), source.indexOf('\nfunction startBeam'));
// Execute the actual frame callback, replacing only renderer/world dependencies.
const runFrame = new Function('paused', 'initial', `
  let frame;
  const useFrame = f => { frame = f; };
  const runtime = { paused };
  const gaze = { enabled: false, dead: 0, state: initial, meter: 80, intro: false, mood: '', droneLit: false, shake: 0 };
  const player = { pos: {x: 0, z: -50} }, last = {x: 0, z: -50};
  const HEAD = 1.5, HOLD = .35;
  const GAZE_ZONE = {x: 12, z0: -130, z1: 2}, QUEUE_Z = [-22, -120];
  const blockedBy = () => -1, coverState = [{burn: 1}];
  const THREE = {MathUtils: {clamp: (x,a,b) => Math.max(a,Math.min(b,x))}};
  let lockT = .4, coolT = 1, beams = 0;
  const aimAt = {set(){}}, planPath = () => {}, startBeam = () => {}, runBeam = () => beams++;
  ${body}
  GazeSystem();
  frame({clock: {elapsedTime: 10}}, .05);
  return {lockT, coolT, beams, meter: gaze.meter, burn: coverState[0].burn};
`);

test('pause freezes actual gaze lock, fire, cooldown, meter and cover burn', () => {
  for (const state of ['lock', 'fire', 'cool', 'watch']) {
    assert.deepEqual(runFrame(true, state), {lockT: .4, coolT: 1, beams: 0, meter: 80, burn: 1});
  }
  assert.ok(runFrame(false, 'lock').lockT < .4);
  assert.equal(runFrame(false, 'fire').beams, 1);
  assert.ok(runFrame(false, 'cool').coolT < 1);
});
