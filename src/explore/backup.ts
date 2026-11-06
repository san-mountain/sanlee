// 백업: 이 도시에서 '보관 처리'는 죽음이 아니라 저장이다. 시스템은 보관한 시민을 마지막 백업에서 다시 불러낸다.
// 실제로도 브라우저 저장소(localStorage)에 남는다. 작품 속 설정과 현실의 작동 방식이 같다.
export const BACKUP_KEY = "sanlee-backup";

export type Slot = { n: number; t: number; x: number; z: number };
export type Backup = {
  n: number; // 지금까지 만든 백업 수 (마지막 번호)
  list: Slot[]; // 최근 백업 (최대 5개)
  deaths: number; // 보관 처리된 횟수
  restores: number; // 복원된 횟수
  deleted: boolean; // 방공호에서 백업을 지웠는가 (숨은 결말의 열쇠)
};

const empty = (): Backup => ({ n: 0, list: [], deaths: 0, restores: 0, deleted: false });
let cache: Backup | null = null;
let cachedRaw: string | null | undefined;

const count = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : 0;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseBackup(value: unknown): Backup {
  if (!value || typeof value !== "object") return empty();
  const v = value as Record<string, unknown>;
  // Unversioned saves are v0. Never interpret a future schema as this one.
  if (v.version !== undefined && v.version !== 1) return empty();
  const list = (Array.isArray(v.list) ? v.list : []).filter((s): s is Slot =>
    !!s && typeof s === "object" && count(s.n) === s.n &&
    finite(s.t) && s.t >= 0 && finite(s.x) && finite(s.z)
  ).slice(-5).map(({ n, t, x, z }) => ({ n, t, x, z }));
  return {
    n: Math.max(count(v.n), ...list.map((s) => s.n)), list,
    deaths: count(v.deaths), restores: count(v.restores), deleted: false,
  };
}

export function getBackup(): Backup {
  let raw: string | null;
  try { raw = localStorage.getItem(BACKUP_KEY); }
  catch { return cache ??= empty(); }
  if (cache && raw === cachedRaw) return cache;
  cachedRaw = raw;
  try { cache = parseBackup(JSON.parse(raw || "null")); }
  catch { cache = empty(); }
  return cache;
}

function write(b: Backup, ev: string | { kind: string; n: number }) {
  cache = b;
  try {
    const raw = JSON.stringify({ ...b, version: 1 });
    localStorage.setItem(BACKUP_KEY, raw);
    cachedRaw = raw;
  } catch {}
  window.dispatchEvent(new CustomEvent("sanlee-backup", { detail: ev }));
}

// 새 백업을 만든다. 백업을 지운 사람은 다시 기록되지 않는다.
export function saveBackup(x: number, z: number) {
  const b = getBackup();
  if (b.deleted || !finite(x) || !finite(z)) return null;
  const slot = { n: b.n + 1, t: Date.now(), x, z };
  write({ ...b, n: slot.n, list: [...b.list, slot].slice(-5) }, { kind: "save", n: slot.n });
  return slot;
}

export function lastSlot(): Slot | null {
  const b = getBackup();
  return b.list[b.list.length - 1] ?? null;
}

export function recordDeath() {
  const b = getBackup();
  write({ ...b, deaths: b.deaths + 1 }, "death");
}

export function recordRestore() {
  const b = getBackup();
  write({ ...b, restores: b.restores + 1 }, "restore");
}

// 방공호 안에서만: 백업을 실제로 지운다
export function deleteBackup() {
  const b = getBackup();
  write({ ...b, list: [], deleted: true }, "delete");
}

// 거부 결말·처음부터 다시·도시 밖 기록 삭제: 저장소와 메모리에서 함께 지운다
export function wipeBackup() {
  cache = empty();
  cachedRaw = null;
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent("sanlee-backup", { detail: "wipe" }));
}

// 도시 밖에서 기록을 지운다. 언어·효과음 설정과 기존 숨은 결말의 표시는 유지한다.
export function forgetCityRecords() {
  wipeBackup();
  try {
    [
      "sanlee-promise",
      "sanlee-last-login",
      "sanlee-visited",
      "sanlee-met",
      "sanlee-san-talked",
      "sanlee-face",
      "sanlee-ending",
      "sanlee-endings-found",
      "sanlee-jabi-intro",
      "sanlee-scope",
    ].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem("sanlee-forgotten", "1");
  } catch {}
}

export const clock = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour12: false });
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
