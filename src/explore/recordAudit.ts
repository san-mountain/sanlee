// 퍼즐 B 「봉인된 3초」 v0.7: 진행 저장과 단계.
// 기록 보관 장치의 공식 기록은 '14:02:01 — 모두 동의'. 봉인판 뒤에 붉은 원본 기록 카세트가 갇혀 있다.
// 장치에 다가가 2D 조작판에서 봉인판을 밀어 카세트를 오른쪽 배출구로 꺼내면 원본 '모두 거부'가 판독된다.
// 규칙(격자·충돌·이동·풀이)은 sealPuzzle.ts. 여기서는 저장·이전 저장 호환·단계만 다룬다.
// 시민 활동 기록(citizenRecords)과 퍼즐 A 저장(faceAuth)은 건드리지 않는다.
import type { FaceState } from "./faceAuth";
import { applyMove, emptySeal, isSolved, parseSeal, undo, type SealState } from "./sealPuzzle";

export const AUDIT_KEY = "sanlee-record-audit-v3";
// 이전 B 저장: v1 = v0.4 버튼 시험·v0.5 도장 정지, v2 = v0.6 되감기 기계. 읽기만 하고, 초기화·삭제 때 함께 지운다
export const AUDIT_KEY_V2 = "sanlee-record-audit-v2";
export const AUDIT_KEY_V1 = "sanlee-record-audit-v1";
export const OLD_AUDIT_KEYS = [AUDIT_KEY_V2, AUDIT_KEY_V1];

export type AuditState = {
  schema: 3;
  // 도입(공식 기록 → 이산의 부탁 → 봉인된 원본)을 보았는가
  intro: boolean;
  // 2D 조작판: 봉인판 위치와 이동 기록
  seal: SealState;
  // 원본 카세트를 배출구로 꺼냈다 = 퍼즐 해결. 도시의 공식 기록은 그대로 '동의'다
  solved: boolean;
  // 해결 뒤의 마무리(이산의 말, 보증 장치)까지 보았는가
  done: boolean;
};

export const emptyAudit = (): AuditState => ({ schema: 3, intro: false, seal: emptySeal(), solved: false, done: false });
const finishedAudit = (): AuditState => ({ ...emptyAudit(), intro: true, solved: true, done: true });

// 새 경로에서 퍼즐 A를 끝낸 저장에서만 장치가 켜진다. 기존(legacy) 저장에는 나타나지 않는다
export const auditAvailable = (face: Pick<FaceState, "legacy" | "method">) => !face.legacy && !!face.method;

const json = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// 저장을 읽는다.
// - v3: 그대로. 봉인판 기록이 규칙에 어긋나면 처음 배치로. 카세트가 배출구에 닿은 기록이면 해결로.
// - 이전 B를 끝낸 저장(v2 solved, v1 done/taken): 끝난 것으로 옮긴다 (보증 장치가 켜진 채로).
// - 이전 B를 하던 도중의 저장: 새 퍼즐을 처음부터 (도입부터).
export function parseAudit(raw: string | null, v2Raw: string | null = null, v1Raw: string | null = null): AuditState {
  const d = json(raw);
  if (d && d.schema === 3) {
    const seal = parseSeal(d.seal);
    const solved = d.solved === true || isSolved(seal.pos);
    return { schema: 3, intro: d.intro === true || solved, seal, solved, done: solved && d.done === true };
  }
  const v2 = json(v2Raw);
  if (v2 && v2.schema === 2 && v2.solved === true) return finishedAudit();
  const v1 = json(v1Raw);
  if (v1 && v1.schema === 1 && (v1.done === true || v1.taken === true)) return finishedAudit();
  return emptyAudit();
}

export function loadAudit(): AuditState {
  try {
    return parseAudit(localStorage.getItem(AUDIT_KEY), localStorage.getItem(AUDIT_KEY_V2), localStorage.getItem(AUDIT_KEY_V1));
  } catch {
    return emptyAudit();
  }
}

export function saveAudit(state: AuditState) {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(state));
  } catch {}
}

export function clearAudit() {
  try {
    localStorage.removeItem(AUDIT_KEY);
    for (const k of OLD_AUDIT_KEYS) localStorage.removeItem(k);
  } catch {}
}

export const seeIntro = (s: AuditState): AuditState => (s.intro ? s : { ...s, intro: true });

// 봉인판 하나를 to까지 민다. 규칙에 어긋나면 null (아무것도 바뀌지 않는다). 카세트가 배출구에 닿는 순간 해결
export function moveSeal(s: AuditState, id: string, to: number): AuditState | null {
  if (s.solved) return null;
  const seal = applyMove(s.seal, id, to);
  if (!seal) return null;
  return { ...s, seal, solved: isSolved(seal.pos) };
}

// 마지막 유효 이동 하나를 취소 / 봉인판 배치만 처음으로 (도입·A는 그대로)
export const undoSeal = (s: AuditState): AuditState => (s.solved ? s : { ...s, seal: undo(s.seal) });
export const resetSeal = (s: AuditState): AuditState => (s.solved ? s : { ...s, seal: emptySeal() });

export function finishAudit(state: AuditState): AuditState {
  if (!state.solved) return state;
  return state.done ? state : { ...state, done: true };
}

// 연출 단계 (런타임)
export type AuditPhase =
  | "dormant" // 퍼즐 A가 아직이거나 legacy 저장: 장치가 꺼져 있다
  | "intro" // 도입: 공식 기록 → 이산의 의문과 부탁 → 봉인된 원본
  | "ready" // 장치에 다가가 조작판을 열 수 있다 (도입을 아직 못 봤다면 다가갈 때 도입부터)
  | "focus" // 조작판으로 다가가거나 물러나는 짧은 전환
  | "puzzle" // 2D 조작판이 열려 있다
  | "reveal" // 원본이 배출되고 판독된 뒤 이산의 말과 보증 장치까지
  | "done";

// 저장에서 돌아올 때의 단계. 해결한 뒤 나갔다면 마무리는 이미 지난 것으로 본다
export function restPhase(face: Pick<FaceState, "legacy" | "method">, state: AuditState): AuditPhase {
  if (!auditAvailable(face)) return "dormant";
  if (state.solved) return "done";
  return "ready";
}

// 공식 기록과 원본 기록에 적힌 것. 공식 기록은 퍼즐을 풀어도 바뀌지 않는다
export const RECORD_TIME = "14:02:01";
export const OFFICIAL_RECORD = { ko: "모두 동의", en: "ACCEPT ALL" };
export const ORIGINAL_RECORD = { ko: "모두 거부", en: "REJECT ALL" };
