// 얼굴 맞추기: 세 부분으로 어긋난 이산의 얼굴을 원통 세 개를 돌려 맞추는 그림 맞추기.
// 터미널 셋을 모두 연 뒤에 열리고, 맞추면 이산이 깨어난다 (진행 단계 talk로).
export const FACE_KEY = "sanlee-face";
export type Drums = [number, number, number];
// 얼굴을 맞춘 뒤 도시가 내미는 표준 미소: standard = 표준 미소 적용, exception = 원본 얼굴 보존. 어느 쪽이든 이산이 깨어난다 (이야기는 바뀌지 않는다)
export type FaceMethod = "standard" | "exception";
export type FaceState = {
  // 위(머리카락·이마), 가운데(눈·코), 아래(입·턱) 원통이 앞에 보여 주는 면 (0~2)
  drums: Drums;
  // 원본 얼굴이 완성되어 장치가 잠겼는가
  solved: boolean;
  method: FaceMethod | null;
  // 터미널 셋을 다 연 뒤 굳은 이산에게 말을 걸었는가 (그래야 장치가 켜진다)
  asked: boolean;
};

export const FACES = 3;
// 각 원통의 올바른 면은 하나뿐이다
export const SOLUTION: Drums = [0, 0, 0];
// 처음에는 세 부분이 모두 어긋나 있다 (최소 다섯 번 돌려야 맞는다)
export const START: Drums = [1, 2, 1];

export const emptyFace = (): FaceState => ({ drums: [...START] as Drums, solved: false, method: null, asked: false });

const face = (n: unknown) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) < FACES ? (n as number) : null);

export function loadFace(): FaceState {
  const state = emptyFace();
  try {
    const raw = localStorage.getItem(FACE_KEY);
    if (!raw) {
      // 이 퍼즐이 생기기 전에 이미 이산을 깨워 대화까지 한 저장은 맞춘 것으로 본다 (다시 막지 않는다)
      if (localStorage.getItem("sanlee-san-talked") === "1") return { drums: [...SOLUTION] as Drums, solved: true, method: "exception", asked: true };
      return state;
    }
    const data = JSON.parse(raw);
    const drums = Array.isArray(data.drums) ? data.drums.map(face) : [];
    if (drums.length === 3 && drums.every((d: number | null) => d !== null)) state.drums = drums as Drums;
    // 답은 하나뿐이므로 원통이 맞춰져 있으면 맞춘 것이다 (잠기는 연출 도중에 나갔다 와도 그대로)
    state.solved = isSolved(state.drums);
    state.asked = data.asked === true || state.solved;
    if (state.solved && (data.method === "standard" || data.method === "exception")) state.method = data.method;
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
  return { ...state, drums, solved: isSolved(drums), method: null };
}

// 얼굴을 맞추고 표준 미소까지 고르면 끝 (이산이 깨어난다)
export const faceFinished = (state: FaceState) => state.solved && state.method !== null;
