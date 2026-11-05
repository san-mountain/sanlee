// 얼굴 복원 장치의 연출 상태. 3D 장면과 화면 UI가 리렌더 없이 매 프레임 함께 읽는다
import { START, type Drums } from "./faceAuth";

export type FacePhase =
  | "locked" // 터미널 셋을 다 열기 전: 장치는 보이지만 돌릴 수 없다
  | "idle" // 어긋난 얼굴을 맞추는 중
  | "restored" // 맞췄다: 장치가 잠기고 이산이 깨어난다
  | "done";

export const faceRt = {
  phase: "locked" as FacePhase,
  // 상태가 바뀐 시각(performance.now). 연출은 여기서부터 시간을 잰다
  since: 0,
  drums: [...START] as Drums,
  // 플레이어가 바라보는 원통 (PC 조준·모바일 버튼). FaceMachine이 매 프레임 갱신한다
  aim: 1,
  // 장치 근처에 있는가 (손잡이 강조)
  near: false,
  // 처음 다가갔을 때 장치의 등이 켜진 시각 (0 = 아직)
  wokeAt: 0,
};

export function setFacePhase(p: FacePhase) {
  faceRt.phase = p;
  faceRt.since = performance.now();
}
