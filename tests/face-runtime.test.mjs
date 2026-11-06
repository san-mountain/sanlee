import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { loadFace, faceFinished } from '../src/explore/faceAuth.ts';

// Only resolve the extensionless import for Node; execute the actual runtime module.
const source = await readFile(new URL('../src/explore/faceRuntime.ts', import.meta.url), 'utf8');
const compiled = stripTypeScriptTypes(source);
const moduleCode = compiled.replace('"./faceAuth"', JSON.stringify(new URL('../src/explore/faceAuth.ts', import.meta.url).href)).replace('"./runtime"', JSON.stringify(new URL('../src/explore/runtime.ts', import.meta.url).href));
const { faceRt, resetFaceRuntime } = await import(`data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`);

test('leaving each transient face animation clears stale runtime but retains saved solution', () => {
  globalThis.localStorage = { getItem: key => key === 'sanlee-face' ? JSON.stringify({ drums: [0,0,0], asked: true, solved: true, method: null }) : null };
  for (const phase of ['restored', 'twist', 'applying']) {
    faceRt.phase = phase;
    faceRt.focus = 'face-standard'; faceRt.near = true;
    resetFaceRuntime();
    assert.equal(faceRt.phase, 'locked');
    assert.equal(faceRt.focus, null); assert.equal(faceRt.near, false);
    const saved = loadFace();
    assert.equal(saved.solved, true);
    assert.equal(saved.asked, true);
    assert.equal(faceFinished(saved), false);
    assert.equal(saved.method, null);
  }
});

test('a committed face choice is complete on reentry without replaying its interrupted animation', () => {
  for (const method of ['standard', 'exception']) {
    globalThis.localStorage = { getItem: key => key === 'sanlee-face' ? JSON.stringify({ drums: [0,0,0], asked: true, method }) : null };
    faceRt.phase = 'applying'; resetFaceRuntime();
    assert.equal(faceFinished(loadFace()), true);
    assert.equal(loadFace().method, method);
  }
});
