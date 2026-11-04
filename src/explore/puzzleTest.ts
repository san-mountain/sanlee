// 개발·검수용 퍼즐 재시작 (?debug 설정창 · window.__neo.restartA/B).
// 퍼즐 A·B의 저장만 테스트 시작 상태로 덮어쓴다. 방문한 터미널·결말·백업·웹사이트 기록·legacy 키는 건드리지 않는다.
import { SOLUTION, emptyFace, loadFace, saveFace, type Drums, type FaceState } from "./faceAuth";
import { AUDIT_KEY, OLD_AUDIT_KEYS, clearAudit, emptyAudit, loadAudit, saveAudit, type AuditState } from "./recordAudit";

export type TestStart = "a" | "b";
// 새로고침 뒤에도 같은 자리에서 시작하도록 이 탭에만 남기는 표시
export const TEST_KEY = "sanlee-test-start";

// A/B replay is an isolated *review workflow*. Keep the exact previous saves
// (including legacy migration keys) until the reviewer chooses to restore them.
// The backup survives tab closing; opening without ?debug restores it automatically.
export const REPLAY_BACKUP_KEY = "sanlee-debug-replay-backup-v1";
const SAVED_KEYS = [FACE_KEY, AUDIT_KEY, ...OLD_AUDIT_KEYS] as const;
type ReplayBackup = { schema: 1; original: Record<string, string | null> };

function readReplayBackup(): ReplayBackup | null {
  try {
    const raw = localStorage.getItem(REPLAY_BACKUP_KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return null;
    const value = saved as Partial<ReplayBackup>;
    if (value.schema !== 1 || !value.original || typeof value.original !== "object") return null;
    if (!SAVED_KEYS.every((key) => value.original && (value.original[key] === null || typeof value.original[key] === "string"))) return null;
    return value as ReplayBackup;
  } catch {
    return null;
  }
}

export const hasReplayBackup = () => readReplayBackup() !== null;

function snapshotBeforeReplay(): boolean {
  try {
    if (readReplayBackup()) return true;
    const original: Record<string, string | null> = {};
    for (const key of SAVED_KEYS) original[key] = localStorage.getItem(key);
    localStorage.setItem(REPLAY_BACKUP_KEY, JSON.stringify({ schema: 1, original } satisfies ReplayBackup));
    return readReplayBackup() !== null;
  } catch {
    // Never overwrite a person's completed playthrough without a recoverable snapshot.
    return false;
  }
}

export function restoreOriginalProgress(): { face: FaceState; audit: AuditState } | null {
  const saved = readReplayBackup();
  if (!saved) return null;
  try {
    for (const key of SAVED_KEYS) {
      const value = saved.original[key];
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    // Only discard the snapshot after every original key has been restored.
    localStorage.removeItem(REPLAY_BACKUP_KEY);
    sessionStorage.removeItem(TEST_KEY);
    return { face: loadFace(), audit: loadAudit() };
  } catch {
    return null;
  }
}


// A부터: 얼굴 장치·이산·B 모두 처음 (새 경로). B부터: A의 선택은 그대로 두고(없으면 표준 미소로 채움) B만 처음
export function restartStates(from: TestStart, cur: FaceState): { face: FaceState; audit: AuditState } {
  const face: FaceState = from === "a" ? emptyFace() : { ...emptyFace(), drums: [...SOLUTION] as Drums, solved: true, method: cur.method ?? "standard" };
  return { face, audit: emptyAudit() };
}

export function applyRestart(from: TestStart) {
  if (!snapshotBeforeReplay()) return null;
  const r = restartStates(from, loadFace());
  saveFace(r.face);
  clearAudit();
  saveAudit(r.audit);
  try {
    sessionStorage.setItem(TEST_KEY, from);
  } catch {}
  return r;
}

export function testStart(): TestStart | null {
  try {
    const v = sessionStorage.getItem(TEST_KEY);
    return v === "a" || v === "b" ? v : null;
  } catch {
    return null;
  }
}
