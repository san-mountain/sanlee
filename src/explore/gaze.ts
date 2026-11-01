// 대자비의 시선: 게임 상태를 한곳에 모아 둔다 (3D 쪽이 쓰고, 화면 HUD가 읽는다)
export type GazeState = "idle" | "watch" | "suspect" | "charge" | "lock" | "fire" | "cool";

export const gaze = {
  meter: 0, // 0~100
  state: "idle" as GazeState,
  inZone: false,
  seen: false, // 지금 시선에 노출되어 있는가
  hiddenBy: "" as "" | "cover" | "line", // 숨은 방법
  shake: 0, // 화면 흔들림 세기 (Player가 읽음)
  dead: 0, // 죽은 시각(performance.now), 0이면 살아 있음
  deaths: 0,
  enabled: true, // 결말·대화 중에는 멈춤
  frozen: false, // 죽음 연출 중에는 움직이지 못함
  firstSeenAt: 0,
};

export function resetGaze() {
  gaze.meter = 0;
  gaze.state = "idle";
  gaze.seen = false;
  gaze.shake = 0;
  gaze.dead = 0;
  gaze.frozen = false;
}
