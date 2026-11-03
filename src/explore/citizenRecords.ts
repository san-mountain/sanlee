import { protection, recordTime } from "./recordProtection";

export const CITIZEN_RECORDS_KEY = "sanlee-citizen-records-v1";
export const CITIZEN_RECORDS_CAPACITY = 512;

export type CitizenActivity = { id: string; kind: string; sourceId: string; occurredAt: number };
export type CitizenRecordSnapshot = { schema: 1; pending: CitizenActivity[]; synced: CitizenActivity[] };
export type ActivityContext = { zone: "bunker" | "city"; unregistered?: boolean };
export type ActivityResult =
  | { status: "recorded"; entry: CitizenActivity }
  | { status: "protected" | "unregistered" | "full" };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Options = {
  storage?: () => StorageLike | undefined;
  now?: () => number;
  isProtected?: (at: number) => boolean;
  capacity?: number;
};

const empty = (): CitizenRecordSnapshot => ({ schema: 1, pending: [], synced: [] });
const copy = (state: CitizenRecordSnapshot): CitizenRecordSnapshot => ({
  schema: 1,
  pending: state.pending.map((entry) => ({ ...entry })),
  synced: state.synced.map((entry) => ({ ...entry })),
});
function activity(value: unknown): value is CitizenActivity {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string" && entry.id.length > 0 && typeof entry.kind === "string" && entry.kind.length > 0 && typeof entry.sourceId === "string" && entry.sourceId.length > 0 && typeof entry.occurredAt === "number" && Number.isFinite(entry.occurredAt);
}

export function createCitizenRecords({
  storage = () => typeof localStorage === "undefined" ? undefined : localStorage,
  now = recordTime,
  isProtected = (at) => protection.isProtected(at),
  capacity = CITIZEN_RECORDS_CAPACITY,
}: Options = {}) {
  let cache: CitizenRecordSnapshot | null = null;
  let sequence = 0;
  const limit = Number.isSafeInteger(capacity) && capacity >= 0 ? capacity : CITIZEN_RECORDS_CAPACITY;

  function read() {
    if (cache) return cache;
    cache = empty();
    try {
      const value = JSON.parse(storage()?.getItem(CITIZEN_RECORDS_KEY) ?? "null");
      if (value?.schema === 1 && Array.isArray(value.pending) && Array.isArray(value.synced)) {
        // 이미 동기화된 ID가 우선한다. 재접속과 반복 동기화로 같은 기록을 늘리지 않는다.
        const ids = new Set<string>();
        for (const name of ["synced", "pending"] as const) {
          for (const entry of value[name]) {
            if (!activity(entry) || ids.has(entry.id)) continue;
            ids.add(entry.id);
            cache[name].push({ id: entry.id, kind: entry.kind, sourceId: entry.sourceId, occurredAt: entry.occurredAt });
          }
        }
      }
    } catch {}
    return cache;
  }

  function persist() {
    try {
      storage()?.setItem(CITIZEN_RECORDS_KEY, JSON.stringify(read()));
    } catch {}
  }

  return {
    // 퍼즐 창을 열 때가 아니라 최종 행동이 실행될 때 호출한다.
    recordCitizenActivity(action: Pick<CitizenActivity, "kind" | "sourceId">, context: ActivityContext): ActivityResult {
      const at = now();
      if (context.unregistered) return { status: "unregistered" };
      // 이번 장치는 무명사만 보호한다. 도시의 시선·레이저와 연결하지 않는다.
      if (context.zone === "bunker" && isProtected(at)) return { status: "protected" };
      const state = read();
      if (state.pending.length + state.synced.length >= limit) return { status: "full" };
      let id: string;
      do {
        id = `${at}:${sequence++}`;
      } while (state.pending.some((entry) => entry.id === id) || state.synced.some((entry) => entry.id === id));
      const entry = { id, kind: action.kind, sourceId: action.sourceId, occurredAt: at };
      state[context.zone === "bunker" ? "pending" : "synced"].push(entry);
      persist();
      return { status: "recorded", entry: { ...entry } };
    },
    syncCitizenRecords() {
      const state = read();
      if (!state.pending.length) return 0;
      const count = state.pending.length;
      state.synced.push(...state.pending);
      state.pending = [];
      persist();
      return count;
    },
    getCitizenRecords() {
      return copy(read());
    },
    clearCitizenRecords() {
      cache = empty();
      try {
        storage()?.removeItem(CITIZEN_RECORDS_KEY);
      } catch {}
    },
  };
}

// 게임 진행과 위치 백업은 기존의 별도 저장 경로에 맡기고, 여기에서는 다루지 않는다.
const citizenRecords = createCitizenRecords();
export const recordCitizenActivity = citizenRecords.recordCitizenActivity;
export const syncCitizenRecords = citizenRecords.syncCitizenRecords;
export const getCitizenRecords = citizenRecords.getCitizenRecords;
export const clearCitizenRecords = citizenRecords.clearCitizenRecords;
