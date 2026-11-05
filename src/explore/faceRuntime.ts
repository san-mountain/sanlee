// 얼굴 복원 장치의 연출 상태. 3D 장면과 화면 UI가 리렌더 없이 매 프레임 함께 읽는다
import { START, type Drums, type FaceMethod } from "./faceAuth";

export type FacePhase =
  | "locked" // 터미널 셋을 다 열기 전: 장치는 보이지만 돌릴 수 없다
  | "idle" // 어긋난 얼굴을 맞추는 중
  | "restored" // 맞췄다: "원본 얼굴 복원 완료."
  | "twist" // 도시가 끼어든다: "표준 미소가 누락되었습니다."
  | "choice" // 분홍 버튼(표준 미소 적용)과 나무 레버(원본 얼굴 보존)가 켜진다
  | "applying" // 고른 쪽을 장치가 실행한다
  | "done";

export const faceRt = {
  phase: "locked" as FacePhase,
  // 상태가 바뀐 시각(performance.now). 연출은 여기서부터 시간을 잰다
  since: 0,
  drums: [...START] as Drums,
  method: null as FaceMethod | null,
  // 플레이어가 바라보는 원통 (PC 조준·모바일 버튼). FaceMachine이 매 프레임 갱신한다
  aim: 1,
  // 장치 근처에 있는가 (손잡이 강조)
  near: false,
  // 처음 다가갔을 때 장치의 등이 켜진 시각 (0 = 아직)
  wokeAt: 0,
  // 지금 상호작용 대상으로 잡힌 조작부 id (분홍 버튼·나무 레버 강조)
  focus: null as string | null,
};

// 3D 장치가 다시 그려야 하는 상태 (원통 면·단계·고른 쪽)
export type FaceView = { drums: Drums; phase: FacePhase; method: FaceMethod | null };

export function setFacePhase(p: FacePhase) {
  faceRt.phase = p;
  faceRt.since = performance.now();
}
