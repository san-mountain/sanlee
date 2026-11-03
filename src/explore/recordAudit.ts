// 퍼즐 B 「되감긴 3초」 v0.6
// 기록 기계에는 릴이 두 개 있다. 공식 기록 릴(도시가 동의 도장을 찍어 덮어쓴 기록)과 원본 기록 릴(수정 전 입력 흔적).
// 제동 레버로 자동 운전을 멈추면 수동 바퀴로 연결된 릴을 1초씩 되감을 수 있다. 바퀴는 처음에 공식 릴에 물려 있다.
// 공식 릴을 끝까지 되감아도 '동의'만 나온다. 연결 장치를 원본 릴로 옮겨 3초를 되감으면 14:02:01 '모두 거부'가 드러나고, 그 순간 해결된다.
// 진행 저장만 다룬다. 시민 활동 기록(citizenRecords)과 퍼즐 A 저장(faceAuth)은 건드리지 않는다.
import type { FaceState } from "./faceAuth";

export const AUDIT_KEY = "sanlee-record-audit-v2";
// 이전 B(v0.4 버튼 시험·v0.5 도장 정지)의 저장. 새 퍼즐과 구조가 달라 끝낸 기록만 옮기고, 초기화·삭제 때 함께 지운다
export const AUDIT_KEY_V1 = "sanlee-record-audit-v1";

export type Reel = "official" | "original";
// 되감을 수 있는 칸 수: 14:02:04(지금) → 03 → 02 → 01
export const REWIND_STEPS = 3;

export type AuditState = {
  schema: 2;
  // 제동 레버로 자동 운전(도장·이송)을 멈췄는가
  braked: boolean;
  // 수동 바퀴가 물려 있는 릴
  link: Reel;
  // 각 릴을 되감은 칸 수 (0 = 14:02:04, 3 = 14:02:01)
  pos: Record<Reel, number>;
  // 원본 릴의 14:02:01 '모두 거부'가 드러났는가 = 퍼즐 해결. 도시의 공식 기록은 그대로 '동의'다
  solved: boolean;
  // 해결 뒤의 마무리(이산의 말, 보증 장치)까지 보았는가
  done: boolean;
};

export const emptyAudit = (): AuditState => ({ schema: 2, braked: false, link: "official", pos: { official: 0, original: 0 }, solved: false, done: false });

// 새 경로에서 퍼즐 A를 끝낸 저장에서만 기계가 돈다. 기존(legacy) 저장에는 나타나지 않는다
export const auditAvailable = (face: Pick<FaceState, "legacy" | "method">) => !face.legacy && !!face.method;

const step = (n: unknown) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) <= REWIND_STEPS ? (n as number) : 0);

// 저장을 읽는다. 모순되는 값은 앞 단계 기준으로 맞춘다
export function parseAudit(raw: string | null, legacyRaw: string | null = null): AuditState {
  const s = emptyAudit();
  try {
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.schema === 2) {
        s.braked = d.braked === true;
        s.link = d.link === "original" ? "original" : "official";
        s.pos = { official: step(d.pos?.official), original: step(d.pos?.original) };
        s.solved = d.solved === true || s.pos.original === REWIND_STEPS;
        s.done = d.done === true && s.solved;
        if (!s.braked) s.pos = { official: 0, original: 0 };
        if (s.solved) {
          s.braked = true;
          s.link = "original";
          s.pos.original = REWIND_STEPS;
        }
        return s;
      }
    }
    // 이전 B를 끝낸 저장은 끝난 것으로 옮긴다 (도중 저장은 새 퍼즐을 처음부터)
    if (legacyRaw) {
      const d = JSON.parse(legacyRaw);
      if (d && d.schema === 1 && (d.done === true || d.taken === true)) return solvedAudit(true);
    }
  } catch {}
  return s;
}

const solvedAudit = (done: boolean): AuditState => ({ schema: 2, braked: true, link: "original", pos: { official: 0, original: REWIND_STEPS }, solved: true, done });

export function loadAudit(): AuditState {
  try {
    return parseAudit(localStorage.getItem(AUDIT_KEY), localStorage.getItem(AUDIT_KEY_V1));
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
    localStorage.removeItem(AUDIT_KEY_V1);
  } catch {}
}

// 조작 결과. jammed = 자동 운전 중이라 걸려서 안 움직임, end = 릴 끝에 닿음
export type AuditResult =
  | { status: "braked"; state: AuditState }
  | { status: "jammed" | "end" | "noop"; state: AuditState }
  | { status: "linked"; state: AuditState }
  | { status: "rewound"; reel: Reel; pos: number; solved: boolean; state: AuditState };

// 제동 레버: 한 번 당기면 자동 운전이 멈춘 채로 있다
export function pullBrake(state: AuditState): AuditResult {
  if (state.solved || state.braked) return { status: "noop", state };
  return { status: "braked", state: { ...state, braked: true } };
}

// 연결 장치: 수동 바퀴를 다른 릴로 옮긴다. 자동 운전 중에는 걸려서 움직이지 않는다
export function shiftLink(state: AuditState, to?: Reel): AuditResult {
  if (state.solved) return { status: "noop", state };
  if (!state.braked) return { status: "jammed", state };
  const link: Reel = to ?? (state.link === "official" ? "original" : "official");
  if (link === state.link) return { status: "noop", state };
  return { status: "linked", state: { ...state, link } };
}

// 수동 바퀴: 연결된 릴을 1초 되감는다. 원본을 끝까지 되감는 순간 해결
export function turnWheel(state: AuditState): AuditResult {
  if (state.solved) return { status: "noop", state };
  if (!state.braked) return { status: "jammed", state };
  const reel = state.link;
  if (state.pos[reel] >= REWIND_STEPS) return { status: "end", state };
  const pos = state.pos[reel] + 1;
  const solved = reel === "original" && pos === REWIND_STEPS;
  return { status: "rewound", reel, pos, solved, state: { ...state, pos: { ...state.pos, [reel]: pos }, solved } };
}

export function finishAudit(state: AuditState): AuditState {
  if (!state.solved) return state;
  return state.done ? state : { ...state, done: true };
}

// 각 릴의 판독창에 보이는 기록. 공식 릴은 어느 칸이든 동의 도장이 찍혀 있고, 원본은 실제 입력 흔적이다
export type Frame = { time: string; mark: "accept" | "reject" | "trace" | "none"; word: { ko: string; en: string } };
export const FRAMES: Record<Reel, Frame[]> = {
  official: [
    { time: "14:02:04", mark: "accept", word: { ko: "모두 동의", en: "ACCEPT ALL" } },
    { time: "14:02:03", mark: "accept", word: { ko: "동의", en: "CONSENT" } },
    { time: "14:02:02", mark: "accept", word: { ko: "동의", en: "CONSENT" } },
    { time: "14:02:01", mark: "accept", word: { ko: "모두 동의", en: "ACCEPT ALL" } },
  ],
  original: [
    { time: "14:02:04", mark: "none", word: { ko: "기록 끝", en: "END OF TAPE" } },
    { time: "14:02:03", mark: "trace", word: { ko: "손 · 오른쪽 아래로", en: "HAND · TO LOWER RIGHT" } },
    { time: "14:02:02", mark: "trace", word: { ko: "손 · 거부 위에 멈춤", en: "HAND · RESTS ON REJECT" } },
    { time: "14:02:01", mark: "reject", word: { ko: "모두 거부", en: "REJECT ALL" } },
  ],
};
export const frameOf = (state: Pick<AuditState, "pos">, reel: Reel) => FRAMES[reel][state.pos[reel]];

// 연출 단계 (런타임). 저장에서 돌아올 때는 쉬는 단계 중 하나로
export type AuditPhase =
  | "dormant" // 퍼즐 A가 아직이거나 legacy 저장: 기계가 꺼져 있다
  | "auto" // 자동 운전: 도장이 계속 공식 기록에 '동의'를 찍는다
  | "manual" // 제동됨: 연결 장치와 수동 바퀴를 쓸 수 있다
  | "moving" // 레버·연결 장치·바퀴가 움직이는 짧은 동안 (입력 무시)
  | "reveal" // 원본 14:02:01이 드러났다: 기계가 멈추고, 이산이 말하고, 보증 장치가 켜진다
  | "done";

export function restPhase(face: Pick<FaceState, "legacy" | "method">, state: AuditState): AuditPhase {
  if (!auditAvailable(face)) return "dormant";
  // 해결 뒤에 나갔다면 마무리는 이미 지난 것으로 본다 (원본은 판독창에 그대로 보인다)
  if (state.solved) return "done";
  return state.braked ? "manual" : "auto";
}

export const auditSolved = (state: AuditState) => state.solved;
