// 얼굴 복원 장치의 연출 상태. 3D 장면과 화면 UI가 리렌더 없이 매 프레임 함께 읽는다
import type { Drums, FaceMethod } from "./faceAuth";

export type FacePhase =
  | "idle" // 어긋난 얼굴을 맞추는 중
  | "restored" // 맞췄다: "원본 얼굴 복원 완료."
  | "twist" // 도시가 끼어든다: "표준 미소가 누락되었습니다."
  | "choice" // 두 조작부가 켜진다
  | "applying" // 선택을 기계가 실행한다
  | "wake" // 이산이 고개를 든다
  | "done";

export const faceRt = {
  phase: "idle" as FacePhase,
  // 상태가 바뀐 시각(performance.now). 연출은 여기서부터 시간을 잰다
  since: 0,
  drums: [1, 2, 1] as Drums,
  method: null as FaceMethod | null,
  // 플레이어가 바라보는 원통 (PC 조준·모바일 버튼). FaceMachine이 매 프레임 갱신한다
  aim: 1,
  // 장치 근처에 있는가 (손잡이 강조)
  near: false,
  // 회전 연출: 원통별로 마지막으로 돌린 시각
  turnedAt: [0, 0, 0] as [number, number, number],
  // 처음 다가갔을 때 장치의 등이 켜진 시각 (0 = 아직)
  wokeAt: 0,
  // 화면 위 위치(0~1, 왼쪽 위 기준): 원통 셋과 두 조작부. 브라우저 테스트가 사람이 누를 자리를 찾는 데 쓴다
  screen: {} as Record<string, [number, number]>,
};

export function setFacePhase(p: FacePhase) {
  faceRt.phase = p;
  faceRt.since = performance.now();
}

export const phaseAge = () => (performance.now() - faceRt.since) / 1000;
