import assert from 'node:assert/strict';
import { test } from 'node:test';
import { input, loadSettings, setCalm } from '../src/explore/input.ts';

function withStore(initial, fn) {
  const store = new Map(initial ? [['neo-settings', JSON.stringify(initial)]] : []);
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  try { fn(() => JSON.parse(store.get('neo-settings') || '{}')); } finally { delete globalThis.localStorage; input.calm = input.calmSet = input.calmAuto = false; }
}

test('weak device turns reduce-effects on automatically when the visitor never chose', () => {
  withStore(null, () => {
    loadSettings(() => true);
    assert.equal(input.calm, true);
    assert.equal(input.calmAuto, true);
  });
  // 예전 저장값의 calm: false는 고른 것이 아니다
  withStore({ sens: 1, bob: true, calm: false }, () => {
    loadSettings(() => true);
    assert.equal(input.calm, true);
  });
});

test('a choice made in the menu wins over detection', () => {
  withStore({ calm: false, calmSet: true }, () => {
    loadSettings(() => true);
    assert.equal(input.calm, false);
    setCalm(true, 'auto');
    assert.equal(input.calm, false);
  });
});

test('auto turn-on during play is remembered for the next visit, and the menu can undo it', () => {
  withStore(null, (saved) => {
    loadSettings(() => false);
    assert.equal(input.calm, false);
    setCalm(true, 'auto');
    assert.equal(saved().calmAuto, true);
    loadSettings(() => false);
    assert.equal(input.calm, true);
    setCalm(false, 'user');
    assert.deepEqual([saved().calm, saved().calmSet, saved().calmAuto], [false, true, false]);
    loadSettings(() => true);
    assert.equal(input.calm, false);
  });
});
