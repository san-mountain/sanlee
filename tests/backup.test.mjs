import assert from "node:assert/strict";
import { test } from "node:test";
import "./register-typescript.mjs";

let instance = 0;
async function setup(initial = {}) {
  const values = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = new EventTarget();
  const backup = await import(`../src/explore/backup.ts?test=${instance++}`);
  return { ...backup, values };
}

const empty = { n: 0, list: [], deaths: 0, restores: 0, deleted: false };

// ExploreClient의 기존 blank 조건에 같은 탭에서 재입장할 때 읽는 값을 제공한다.
function canWhisper(backup) {
  const forgot = localStorage.getItem("sanlee-forgotten") !== null;
  const visited = JSON.parse(localStorage.getItem("sanlee-visited") || "[]");
  const found = JSON.parse(localStorage.getItem("sanlee-endings-found") || "[]");
  return forgot && visited.length === 0 && found.length === 0 && backup.getBackup().n === 0;
}

test("same-tab game → portfolio deletion → game reentry clears warmed cache and unlocks blank condition", async () => {
  const b = await setup({
    "sanlee-visited": '["about","works","writing"]',
    "sanlee-endings-found": '["accept"]',
    "sanlee-promise": "1",
    "sanlee-ending": "accept",
    "sanlee-met": "1",
    "sanlee-san-talked": "1",
    "sanlee-last-login": "123",
    "sanlee-jabi-intro": "1",
    "sanlee-lang": "en",
    "sanlee-sfx": "0",
    "neo-settings": '{"bob":false}',
    unrelated: "keep",
  });
  b.saveBackup(12, -7);
  b.recordDeath();
  b.recordRestore();
  assert.equal(b.getBackup().n, 1);
  assert.equal(canWhisper(b), false);
  let wipes = 0;
  window.addEventListener("sanlee-backup", (e) => {
    if (e.detail === "wipe") wipes++;
  });
  b.forgetCityRecords();
  // 같은 모듈 인스턴스를 재사용한다. 새로고침으로 캐시 문제를 숨기지 않는다.
  assert.deepEqual(b.getBackup(), empty);
  assert.equal(b.lastSlot(), null);
  assert.equal(b.values.has(b.BACKUP_KEY), false);
  assert.equal(canWhisper(b), true);
  assert.equal(wipes, 1);
  assert.deepEqual(Object.fromEntries(b.values), {
    "sanlee-lang": "en", "sanlee-sfx": "0", "neo-settings": '{"bob":false}',
    unrelated: "keep", "sanlee-forgotten": "1",
  });
  assert.equal(b.saveBackup(3, 4).n, 1);
  assert.equal(canWhisper(b), false);
  assert.equal(JSON.parse(b.values.get(b.BACKUP_KEY)).list[0].x, 3);
});

test("legacy backup data retains counts and slots, including the existing deleted-flag normalization", async () => {
  const legacy = { n: 9, list: [{ n: 9, t: 1234, x: 5, z: -6 }], deaths: 3, restores: 2, deleted: true };
  const b = await setup({ "sanlee-backup": JSON.stringify(legacy) });
  assert.deepEqual(b.getBackup(), { ...legacy, deleted: false });
  b.saveBackup(7, 8);
  const saved = JSON.parse(b.values.get(b.BACKUP_KEY));
  assert.equal(saved.n, 10);
  assert.deepEqual(saved.list[0], legacy.list[0]);
  assert.equal(saved.deaths, 3);
  assert.equal(saved.restores, 2);
});

test("saving keeps the latest five slots and wipe restarts numbering", async () => {
  const b = await setup();
  for (let i = 0; i < 7; i++) b.saveBackup(i, -i);
  assert.deepEqual(b.getBackup().list.map((s) => s.n), [3, 4, 5, 6, 7]);
  b.wipeBackup();
  assert.deepEqual(b.getBackup(), empty);
  assert.equal(b.values.has(b.BACKUP_KEY), false);
  assert.equal(b.saveBackup(0, 0).n, 1);
});

test("in-world delete still preserves counts and blocks new backups until wipe", async () => {
  const b = await setup();
  b.saveBackup(1, 2);
  b.recordDeath();
  b.deleteBackup();
  assert.equal(b.getBackup().n, 1);
  assert.equal(b.getBackup().deaths, 1);
  assert.deepEqual(b.getBackup().list, []);
  assert.equal(b.saveBackup(3, 4), null);
  b.forgetCityRecords();
  assert.deepEqual(b.getBackup(), empty);
  assert.equal(b.saveBackup(3, 4).n, 1);
});

test("forget is repeatable and the forgotten marker is required for the hidden condition", async () => {
  const b = await setup();
  assert.equal(canWhisper(b), false);
  b.forgetCityRecords();
  b.forgetCityRecords();
  assert.deepEqual(b.getBackup(), empty);
  assert.equal(canWhisper(b), true);
});

test("unavailable storage does not prevent clearing the in-memory backup", async () => {
  const b = await setup();
  b.saveBackup(1, 2);
  globalThis.localStorage = {
    getItem() { throw new Error("storage denied"); },
    setItem() { throw new Error("storage denied"); },
    removeItem() { throw new Error("storage denied"); },
  };
  assert.doesNotThrow(() => b.forgetCityRecords());
  assert.deepEqual(b.getBackup(), empty);
});

test("footer deletion also clears citizen activity and protection memory without changing saved settings", async () => {
  const b = await setup({ "sanlee-lang": "ko", "sanlee-sfx": "0" });
  const records = await import("../src/explore/citizenRecords.ts");
  const { protection } = await import("../src/explore/recordProtection.ts");
  records.clearCitizenRecords();
  protection.reset();
  records.recordCitizenActivity({ kind: "terminal.open", sourceId: "about" }, { zone: "bunker" });
  b.saveBackup(1, 2);
  assert.equal(protection.ring(), true);
  assert.equal(records.getCitizenRecords().pending.length, 1);
  b.forgetCityRecords();
  assert.deepEqual(records.getCitizenRecords(), { schema: 1, pending: [], synced: [] });
  assert.equal(b.values.has(records.CITIZEN_RECORDS_KEY), false);
  assert.equal(protection.snapshot().active, false);
  assert.equal(protection.snapshot().startedAt, null);
  assert.deepEqual(b.getBackup(), empty);
  assert.equal(b.values.get("sanlee-forgotten"), "1");
  assert.equal(b.values.get("sanlee-lang"), "ko");
  assert.equal(b.values.get("sanlee-sfx"), "0");
});
