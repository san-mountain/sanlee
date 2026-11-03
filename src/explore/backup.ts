// 백업: 이 도시에서 '보관 처리'는 죽음이 아니라 저장이다. 시스템은 보관한 시민을 마지막 백업에서 다시 불러낸다.
// 실제로도 브라우저 저장소(localStorage)에 남는다. 작품 속 설정과 현실의 작동 방식이 같다.
import { clearCitizenRecords } from "./citizenRecords";
import { protection } from "./recordProtection";

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

export function getBackup(): Backup {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(BACKUP_KEY) || "null");
    // 예전 버전에서 남은 '삭제됨' 표시는 무시한다 (남아 있으면 자비가 계속 꺼져 있었다)
    cache = v && typeof v.n === "number" ? { ...empty(), ...v, deleted: false } : empty();
  } catch {
    cache = empty();
  }
  return cache!;
}

function write(b: Backup, ev: string | { kind: string; n: number }) {
  cache = b;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(b));
  } catch {}
  window.dispatchEvent(new CustomEvent("sanlee-backup", { detail: ev }));
}

// 새 백업을 만든다. 백업을 지운 사람은 다시 기록되지 않는다.
export function saveBackup(x: number, z: number) {
  const b = getBackup();
  if (b.deleted) return null;
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
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent("sanlee-backup", { detail: "wipe" }));
}

// 도시 밖에서 기록을 지운다. 언어·효과음 설정과 기존 숨은 결말의 표시는 유지한다.
export function forgetCityRecords() {
  wipeBackup();
  clearCitizenRecords();
  protection.reset();
  try {
    [
      "sanlee-face-auth-v1",
      "sanlee-record-audit-v1",
      "sanlee-record-audit-v2",
      "sanlee-promise",
      "sanlee-last-login",
      "sanlee-visited",
      "sanlee-met",
      "sanlee-san-talked",
      "sanlee-ending",
      "sanlee-endings-found",
      "sanlee-jabi-intro",
    ].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem("sanlee-forgotten", "1");
  } catch {}
}

export const clock = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour12: false });
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
