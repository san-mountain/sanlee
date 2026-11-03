// 퍼즐 A 「얼굴을 맞추십시오」: 세 부분으로 어긋난 얼굴을 돌려 맞추는 기계식 그림 맞추기.
// 진행 저장은 시민 활동 기록과 분리한다. 기록은 최종 선택을 확정하는 순간에만 판정한다.
export const FACE_KEY = "sanlee-face-auth-v1";
export type FaceMethod = "standard" | "exception";
export type Drums = [number, number, number];
export type FaceState = {
  schema: 2;
  // 위(머리카락·이마), 가운데(눈·코), 아래(입·턱) 원통이 앞에 보여 주는 면 (0~2)
  drums: Drums;
  // 원본 얼굴이 완성되어 장치가 잠겼는가
  solved: boolean;
  // standard = 표준 미소 적용, exception = 원본 얼굴 보존 (비표준 등록)
  method: FaceMethod | null;
  // 이 퍼즐 이전에 세 터미널로 이산을 깨운 저장. 기존 지상 경로를 그대로 쓴다
  legacy: boolean;
};

export const FACES = 3;
// 각 원통의 올바른 면은 하나뿐이다
export const SOLUTION: Drums = [0, 0, 0];
// 처음에는 세 부분이 모두 어긋나 있다 (최소 다섯 번 돌려야 맞는다)
export const START: Drums = [1, 2, 1];

export const emptyFace = (): FaceState => ({ schema: 2, drums: [...START] as Drums, solved: false, method: null, legacy: false });

const face = (n: unknown) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) < FACES ? (n as number) : null);

export function loadFace(): FaceState {
  const state = emptyFace();
  try {
    const raw = localStorage.getItem(FACE_KEY);
    if (!raw) {
      // 처음 한 번만 판정해 저장한다. 이후 작품 터미널을 연 횟수가 퍼즐 진행을 바꾸지 않는다
      state.legacy = JSON.parse(localStorage.getItem("sanlee-visited") || "[]").length >= 3;
      saveFace(state);
      return state;
    }
    const data = JSON.parse(raw);
    state.legacy = data.legacy === true;
    if (data.method === "standard" || data.method === "exception") state.method = data.method;
    if (data.schema === 2) {
      const drums = Array.isArray(data.drums) ? data.drums.map(face) : [];
      if (drums.length === 3 && drums.every((d: number | null) => d !== null)) state.drums = drums as Drums;
      state.solved = data.solved === true && isSolved(state.drums);
    }
    // 이전 버전(schema 1)에서 끝낸 인증은 결과만 옮긴다. 다른 조사 기록은 새 퍼즐에 없다
    if (state.method) {
      state.drums = [...SOLUTION] as Drums;
      state.solved = true;
    }
  } catch {}
  return state;
}

export function saveFace(state: FaceState) {
  try {
    localStorage.setItem(FACE_KEY, JSON.stringify(state));
  } catch {}
}

export const isSolved = (drums: readonly number[]) => drums.every((d, i) => d === SOLUTION[i]);
// 이웃한 두 부분의 외곽선이 이어지는가 (0 = 위·가운데, 1 = 가운데·아래)
export const seamJoined = (drums: readonly number[], seam: 0 | 1) => drums[seam] === SOLUTION[seam] && drums[seam + 1] === SOLUTION[seam + 1];

// 한 칸 돌린다. 잠긴 뒤에는 돌아가지 않는다
export function rotateDrum(state: FaceState, i: number): FaceState {
  if (state.solved || i < 0 || i > 2) return state;
  const drums = [...state.drums] as Drums;
  drums[i] = (drums[i] + 1) % FACES;
  return { ...state, drums, solved: isSolved(drums) };
}

// 향후 지상 카메라와 대화가 읽을 결과. 이번 퍼즐에서는 지상 판정을 바꾸지 않는다.
export function faceConsequences(state: FaceState) {
  return { method: state.method, standardAccess: state.method === "standard", additionalReview: state.method === "exception", expressionConstrained: state.method === "standard" };
}

// 최종 선택. 범종을 친 뒤 고르려 했는데 보호가 끝났다면, 기록이 남는다는 확인을 받기 전에는 실행하지 않는다
export function executeFace(state: FaceState, method: FaceMethod, protectionIntended: boolean, protectedNow: boolean, confirmedUnprotected = false) {
  if (state.method) return { status: "complete" as const, state };
  if (!state.solved) return { status: "unsolved" as const, state };
  if (protectionIntended && !protectedNow && !confirmedUnprotected) return { status: "expired" as const, state };
  return { status: "success" as const, state: { ...state, method } };
}
