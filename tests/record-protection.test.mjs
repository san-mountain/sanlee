import "./register-typescript.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const { createRecordProtection } = await import("../src/explore/recordProtection.ts");
const { CITIZEN_RECORDS_KEY, createCitizenRecords } = await import("../src/explore/citizenRecords.ts");

function fixture(initial = {}, capacity = 512) {
  let at = 0;
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const now = () => at;
  const protection = createRecordProtection(undefined, now);
  const records = createCitizenRecords({ storage: () => storage, now, isProtected: protection.isProtected, capacity });
  return { protection, records, values, storage, now, setTime: (value) => { at = value; } };
}
const action = (sourceId) => ({ kind: "terminal.open", sourceId });
const offline = { zone: "bunker" };

test("protection starts at timestamp zero and uses a start-inclusive, end-exclusive interval", () => {
  const f = fixture();
  assert.equal(f.protection.isProtected(), false);
  assert.equal(f.protection.ring(), true);
  assert.deepEqual(f.protection.snapshot(), { startedAt: 0, endsAt: 8000, readyAt: 20000, active: true, remainingMs: 8000, cooldownRemainingMs: 20000 });
  assert.equal(f.protection.isProtected(-1), false);
  assert.equal(f.protection.isProtected(0), true);
  assert.equal(f.protection.isProtected(7999), true);
  assert.equal(f.protection.isProtected(8000), false);
});

test("ringing during protection or cooldown does not extend protection; cooldown runs from activation", () => {
  const f = fixture();
  f.protection.ring();
  f.setTime(4000); assert.equal(f.protection.ring(), false);
  assert.equal(f.protection.snapshot().endsAt, 8000);
  f.setTime(8000); assert.equal(f.protection.ring(), false);
  assert.equal(f.protection.snapshot().remainingMs, 0);
  f.setTime(19999); assert.equal(f.protection.ring(), false);
  f.setTime(20000); assert.equal(f.protection.ring(), true);
  assert.equal(f.protection.snapshot().endsAt, 28000);
});

test("protection expires using elapsed time without frames or scheduled callbacks", () => {
  const f = fixture(); f.protection.ring();
  f.setTime(120000);
  assert.equal(f.protection.isProtected(), false);
  assert.equal(f.protection.snapshot().cooldownRemainingMs, 0);
  assert.equal(f.protection.ring(), true);
});

test("timing is configurable and an active interval cannot be extended by a shorter cooldown", () => {
  let at = 0;
  const protection = createRecordProtection({ durationMs: 100, cooldownMs: 50 }, () => at);
  protection.ring(); at = 75;
  assert.equal(protection.ring(), false);
  at = 100; assert.equal(protection.ring(), true);
  protection.reset();
  assert.equal(protection.snapshot().startedAt, null);
  assert.equal(protection.isProtected(), false);
});

test("records made before protection survive and protected actions create no stored action or usage history", () => {
  const f = fixture();
  f.records.recordCitizenActivity(action("before"), offline);
  const before = f.values.get(CITIZEN_RECORDS_KEY);
  f.protection.ring();
  assert.equal(f.records.recordCitizenActivity(action("secret"), offline).status, "protected");
  assert.equal(f.values.get(CITIZEN_RECORDS_KEY), before);
  assert.deepEqual(f.records.getCitizenRecords().pending.map((entry) => entry.sourceId), ["before"]);
  assert.equal(f.values.get(CITIZEN_RECORDS_KEY).includes("secret"), false);
  assert.equal(f.values.get(CITIZEN_RECORDS_KEY).includes("protected"), false);
});

test("activation itself writes nothing and normal activity resumes at the exact end timestamp", () => {
  const f = fixture(); f.protection.ring();
  assert.equal(f.values.size, 0);
  f.setTime(7999); assert.equal(f.records.recordCitizenActivity(action("hidden"), offline).status, "protected");
  assert.equal(f.values.size, 0);
  f.setTime(8000); assert.equal(f.records.recordCitizenActivity(action("after"), offline).status, "recorded");
  assert.equal(f.records.getCitizenRecords().pending[0].occurredAt, 8000);
});

test("only the final execution timestamp decides protection, not when a puzzle was opened", () => {
  const f = fixture();
  const openedBeforeProtection = action("opened-before");
  f.setTime(100); f.protection.ring();
  assert.equal(f.records.recordCitizenActivity(openedBeforeProtection, offline).status, "protected");
  const openedDuringProtection = action("opened-during");
  f.setTime(8100);
  assert.equal(f.records.recordCitizenActivity(openedDuringProtection, offline).status, "recorded");
});

test("record execution samples the clock once and uses the same value for protection and storage", () => {
  let calls = 0; let checkedAt;
  const records = createCitizenRecords({ storage: () => undefined, now: () => { calls++; return 42; }, isProtected: (at) => { checkedAt = at; return false; } });
  const result = records.recordCitizenActivity(action("one"), offline);
  assert.equal(calls, 1); assert.equal(checkedAt, 42);
  assert.equal(result.entry.occurredAt, 42);
});

test("reconnection and repeated sync cannot recover actions that were protected", () => {
  const f = fixture();
  f.records.recordCitizenActivity(action("before"), offline);
  f.protection.ring(); f.records.recordCitizenActivity(action("never-recorded"), offline);
  f.setTime(8000); f.records.recordCitizenActivity(action("after"), offline);
  const reentered = createCitizenRecords({ storage: () => f.storage, now: f.now });
  assert.equal(reentered.syncCitizenRecords(), 2);
  assert.equal(reentered.syncCitizenRecords(), 0);
  const restored = createCitizenRecords({ storage: () => f.storage });
  assert.deepEqual(restored.getCitizenRecords().pending, []);
  assert.deepEqual(restored.getCitizenRecords().synced.map((entry) => entry.sourceId), ["before", "after"]);
  assert.equal(f.values.get(CITIZEN_RECORDS_KEY).includes("never-recorded"), false);
});

test("offline records queue while online city records sync directly, without applying bunker protection to the city", () => {
  const f = fixture(); f.protection.ring();
  assert.equal(f.records.recordCitizenActivity(action("surface"), { zone: "city" }).status, "recorded");
  assert.equal(f.records.getCitizenRecords().synced.length, 1);
  assert.equal(f.records.getCitizenRecords().pending.length, 0);
});

test("unregistered visitors do not generate citizen records", () => {
  const f = fixture();
  assert.equal(f.records.recordCitizenActivity(action("unregistered"), { zone: "city", unregistered: true }).status, "unregistered");
  assert.equal(f.values.size, 0);
});

test("capacity refuses new records instead of discarding earlier history", () => {
  const f = fixture({}, 2);
  f.records.recordCitizenActivity(action("first"), offline);
  f.records.recordCitizenActivity(action("second"), { zone: "city" });
  const before = f.values.get(CITIZEN_RECORDS_KEY);
  assert.equal(f.records.recordCitizenActivity(action("third"), offline).status, "full");
  assert.equal(f.values.get(CITIZEN_RECORDS_KEY), before);
});

test("returned snapshots and result entries cannot mutate cached or synced records", () => {
  const f = fixture();
  const result = f.records.recordCitizenActivity(action("original"), offline);
  result.entry.sourceId = "mutated";
  const snapshot = f.records.getCitizenRecords(); snapshot.pending[0].sourceId = "changed"; snapshot.pending.length = 0;
  f.records.syncCitizenRecords();
  assert.equal(f.records.getCitizenRecords().synced[0].sourceId, "original");
});

test("city deletion clears its own memory and stored records, preserving existing game progress and backup format", () => {
  const legacy = JSON.stringify({ n: 9, list: [{ n: 9, t: 12, x: 1, z: 2 }], deaths: 1, restores: 1, deleted: false });
  const f = fixture({ "sanlee-backup": legacy, "sanlee-visited": '["about"]', "sanlee-lang": "en" });
  f.records.recordCitizenActivity(action("before-delete"), offline);
  f.records.clearCitizenRecords();
  assert.deepEqual(f.records.getCitizenRecords(), { schema: 1, pending: [], synced: [] });
  assert.equal(f.values.has(CITIZEN_RECORDS_KEY), false);
  assert.equal(f.values.get("sanlee-backup"), legacy);
  assert.equal(f.values.get("sanlee-visited"), '["about"]');
  assert.equal(f.values.get("sanlee-lang"), "en");
});

test("malformed data and unavailable browser storage do not break game execution", () => {
  for (const raw of ['{', '{"schema":9}', '{"schema":1,"pending":[null,{}],"synced":[]}']) {
    const f = fixture({ [CITIZEN_RECORDS_KEY]: raw });
    assert.deepEqual(f.records.getCitizenRecords(), { schema: 1, pending: [], synced: [] });
    assert.equal(f.records.recordCitizenActivity(action("valid"), offline).status, "recorded");
  }
  const records = createCitizenRecords({ storage() { throw new Error("storage denied"); } });
  assert.doesNotThrow(() => records.recordCitizenActivity(action("memory-only"), offline));
  assert.equal(records.getCitizenRecords().pending.length, 1);
  assert.doesNotThrow(() => records.clearCitizenRecords());
});

test("duplicate persisted IDs are synchronized only once and new IDs remain unique at the same timestamp", () => {
  const entry = { id: "0:0", kind: "terminal.open", sourceId: "existing", occurredAt: 0 };
  const f = fixture({ [CITIZEN_RECORDS_KEY]: JSON.stringify({ schema: 1, pending: [entry], synced: [entry] }) });
  assert.equal(f.records.syncCitizenRecords(), 0);
  const first = f.records.recordCitizenActivity(action("first"), offline);
  const second = f.records.recordCitizenActivity(action("second"), offline);
  assert.notEqual(first.entry.id, entry.id);
  assert.notEqual(first.entry.id, second.entry.id);
  assert.equal(f.records.syncCitizenRecords(), 2);
  assert.equal(f.records.getCitizenRecords().synced.length, 3);
});
