// 개발·검수용 퍼즐 재시작 (?debug 설정창 · window.__neo.restartA/B).
// 퍼즐 A·B의 저장만 테스트 시작 상태로 덮어쓴다. 방문한 터미널·결말·백업·웹사이트 기록·legacy 키는 건드리지 않는다.
import { SOLUTION, emptyFace, loadFace, saveFace, type Drums, type FaceState } from "./faceAuth";
import { clearAudit, emptyAudit, saveAudit, type AuditState } from "./recordAudit";

export type TestStart = "a" | "b";
// 새로고침 뒤에도 같은 자리에서 시작하도록 이 탭에만 남기는 표시
export const TEST_KEY = "sanlee-test-start";

// A부터: 얼굴 장치·이산·B 모두 처음 (새 경로). B부터: A의 선택은 그대로 두고(없으면 표준 미소로 채움) B만 처음
export function restartStates(from: TestStart, cur: FaceState): { face: FaceState; audit: AuditState } {
  const face: FaceState = from === "a" ? emptyFace() : { ...emptyFace(), drums: [...SOLUTION] as Drums, solved: true, method: cur.method ?? "standard" };
  return { face, audit: emptyAudit() };
}

export function applyRestart(from: TestStart) {
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
