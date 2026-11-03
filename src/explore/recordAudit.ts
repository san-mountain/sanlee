// 퍼즐 B 「없었던 3초」: 기록 검증 장치에서 수락·거부를 직접 시험해 입력과 처리 결과의 불일치를 찾고,
// 옆면 감사 기록함에서 이산의 실제 입력(모두 거부)을 꺼낸다.
// 진행 저장만 다룬다. 시민 활동 기록(citizenRecords)과는 분리되어 있고, 퍼즐 A 저장(faceAuth)도 건드리지 않는다.
import type { FaceState } from "./faceAuth";

export const AUDIT_KEY = "sanlee-record-audit-v1";
export type AuditChoice = "accept" | "reject";
export type AuditState = {
  schema: 1;
  // 기록 재생 손잡이를 돌려 이산의 마지막 공식 기록을 보았는가
  played: boolean;
  // 마지막 시험: 입력(플레이어가 누른 버튼)과 처리 결과(도시가 기록한 결과). 새로고침 뒤 표시등을 그대로 되살린다
  last: { input: AuditChoice; output: AuditChoice } | null;
  // 시험해 본 입력
  tried: AuditChoice[];
  // 입력 ≠ 처리 결과를 직접 확인했는가 (감사 기록함이 열린다)
  mismatch: boolean;
  // 감사 기록지를 꺼냈는가 = 퍼즐 해결. 공식 기록은 그대로 조작된 채 남는다
  taken: boolean;
  // 꺼낸 뒤의 마무리(이산의 말, 보증 장치 점등)까지 보았는가
  done: boolean;
};

export const emptyAudit = (): AuditState => ({ schema: 1, played: false, last: null, tried: [], mismatch: false, taken: false, done: false });

// 새 경로에서 퍼즐 A를 끝낸 저장에서만 열린다. 기존(legacy) 저장의 지상 경로에는 나타나지 않는다
export const auditAvailable = (face: Pick<FaceState, "legacy" | "method">) => !face.legacy && !!face.method;

const choice = (v: unknown): v is AuditChoice => v === "accept" || v === "reject";

// 저장을 읽는다. 앞 단계가 빠진 저장은 앞 단계까지 채워서 모순이 없게 맞춘다
export function parseAudit(raw: string | null): AuditState {
  const s = emptyAudit();
  if (!raw) return s;
  try {
    const d = JSON.parse(raw);
    if (!d || d.schema !== 1) return s;
    s.done = d.done === true;
    s.taken = d.taken === true || s.done;
    s.mismatch = d.mismatch === true || s.taken;
    s.played = d.played === true || s.mismatch;
    s.tried = Array.isArray(d.tried) ? (["accept", "reject"] as const).filter((c) => d.tried.includes(c)) : [];
    if (d.last && choice(d.last.input) && choice(d.last.output)) s.last = { input: d.last.input, output: d.last.output };
    if (s.mismatch && !s.tried.includes("reject")) s.tried.push("reject");
    if (s.mismatch && !s.last) s.last = { input: "reject", output: "accept" };
  } catch {}
  return s;
}

export function loadAudit(): AuditState {
  try {
    return parseAudit(localStorage.getItem(AUDIT_KEY));
  } catch {
    return emptyAudit();
  }
}

export function saveAudit(state: AuditState) {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(state));
  } catch {}
}

export function playRecord(state: AuditState): AuditState {
  return state.played ? state : { ...state, played: true };
}

// 도시의 처리: 무엇을 누르든 결과는 '모두 수락'이다
export const cityProcess = (_input: AuditChoice): AuditChoice => "accept";

// 버튼 하나를 시험한다. 기록을 재생하기 전에는 장치가 켜지지 않는다
export function pressTest(state: AuditState, input: AuditChoice) {
  if (!state.played || state.taken) return { status: "idle" as const, state };
  const output = cityProcess(input);
  const mismatch = input !== output;
  const next: AuditState = {
    ...state,
    last: { input, output },
    tried: state.tried.includes(input) ? state.tried : [...state.tried, input],
    mismatch: state.mismatch || mismatch,
  };
  return { status: mismatch ? ("mismatch" as const) : ("match" as const), firstMismatch: mismatch && !state.mismatch, state: next };
}

// 감사 기록지를 꺼낸다. 불일치를 직접 확인하기 전에는 기록함이 잠겨 있다
export function takeSlip(state: AuditState): AuditState {
  if (!state.mismatch) return state;
  return state.taken ? state : { ...state, taken: true };
}

export function finishAudit(state: AuditState): AuditState {
  if (!state.taken) return state;
  return state.done ? state : { ...state, done: true };
}

// 새로고침·재접속 뒤 장치가 돌아갈 단계 (연출 도중이면 그 직전의 쉬는 단계로)
export type AuditPhase =
  | "dormant" // 퍼즐 A가 아직이거나 기존(legacy) 저장: 장치가 꺼져 있다
  | "idle" // 기록 재생 손잡이를 기다린다
  | "replay" // 이산의 마지막 공식 기록을 재생 중
  | "test" // 수락·거부 버튼이 켜져 있다
  | "processing" // 누른 입력을 도시가 처리 중
  | "unlock" // 불일치: 감사 기록함의 잠금이 풀린다
  | "slip" // 덮개가 조금 열려 있다. 기록지를 꺼낼 수 있다
  | "reading" // 기록지를 읽는 중
  | "ending" // 장치가 멈추고 이산이 말한다, 보증 장치에 불이 들어온다
  | "done";

export function restPhase(face: Pick<FaceState, "legacy" | "method">, state: AuditState): AuditPhase {
  if (!auditAvailable(face)) return "dormant";
  if (state.done) return "done";
  // 기록지를 꺼낸 뒤 마무리 전에 나갔다면, 열린 기록함에서 다시 꺼내 읽고 마무리로 이어진다
  if (state.mismatch) return "slip";
  if (state.played) return "test";
  return "idle";
}

// 퍼즐 해결 여부: 공식 기록 수정이 아니라, 독립적인 원본 증거를 확보한 것
export const auditSolved = (state: AuditState) => state.taken;
