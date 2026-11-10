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
  // 결말 연출: calm = 수락 뒤 눈을 감고 금빛으로, blind = 기록 없는 사람을 보지 못해 멈춤
  mood: "" as "" | "calm" | "blind",
  // 처음 시선 구역에 들어설 때의 소개 장면: 게이지를 멈추고 카메라가 lookAt을 바라본다
  intro: false,
  // center: 화면 가운데에 둔다 (소개 팝업을 피해 위쪽으로 올리지 않는다)
  lookAt: null as { x: number; y: number; z: number; center?: boolean } | null,
  // 空 결말: 성문의 조준 빛이 겨눌 방문 기록을 찾지 못해 빛을 거둔다 (City의 Gate가 천천히 끈다)
  gateOpen: false,
  // 큰길 드론의 빛이 지금 방문자를 비추는가 (줄 속에 서 있어도 보인다). Drones가 쓰고 GazeSystem이 읽는다
  droneLit: false,
  // 장면 연출: 걷기만 멈춘다 (고개는 돌릴 수 있다)
  still: false,
  // 망원경: 시야 배율(1 = 보통)과 고개를 돌릴 수 있는 범위
  zoom: 1,
  clamp: null as { yaw: number; dy: number; p0: number; p1: number } | null,
};

// 진행 단계 하나: ExploreClient가 정하고 3D 쪽이 읽는다
// restore 기록 복원 중 → talk 풀려난 이산과 대화 전 → scope 남쪽 망원경으로(함께 보기 전) →
// decide 함께 봤고, 승강장으로 갈지 아직 답하지 않음 → descent 승강장으로 가기로 함
// 망원경을 함께 보기 전(scope까지)에는 큰길이 홀로그램 차단막으로 막힌다 (avenueLocked, ExploreClient가 정한다)
export type RoutePhase = "restore" | "talk" | "scope" | "decide" | "descent";
// frozenSan: 수락한 뒤 다시 온 방문자의 큰길에 정지 처분된 이산이 서 있는가 (풀어 주면 다시 검문소에 도전한다)
export const route: { phase: RoutePhase; frozenSan: boolean; avenueLocked: boolean } = { phase: "restore", frozenSan: false, avenueLocked: false };

// 시점을 스스로 걷게 한다 (충돌 무시: 미리 확인한 빈 자리 사이만 잇는다). Player가 읽는다
// to: 지금 가는 점, queue: 그다음 점들 (도착할 때마다 하나씩 꺼낸다), arrived: 마지막 점에 도착했는가
// yaw: 그 점에 다 왔을 때 바라볼 방향 (없으면 북쪽), pitch: 걷는 동안 맞출 고개 높이,
// faceYaw: 걷는 쪽으로 돌아보지 않고 처음부터 yaw를 본다 (망원경에서 한 걸음 물러날 때)
export type WalkStep = { x: number; z: number; speed: number; pitch?: number; yaw?: number; faceYaw?: boolean };
export const autoWalk: { to: WalkStep | null; queue: WalkStep[]; arrived: boolean } = { to: null, queue: [], arrived: false };
export function walkPath(steps: WalkStep[]) {
  autoWalk.to = steps[0] ?? null;
  autoWalk.queue = steps.slice(1);
  autoWalk.arrived = !steps.length;
}
export function stopWalk() {
  autoWalk.to = null;
  autoWalk.queue = [];
  autoWalk.arrived = false;
}
// 결말에서 평소 구역 밖(성문 너머 다리)을 걷게 할 때: 걸을 수 있는 직사각형들의 합. 눈에 보이는 난간·기단과 같은 자리다.
// 이 안에서는 평소처럼 걷고(구역의 장애물도 피한다), 밖으로는 나가지 못한다. Player가 읽는다
export type Rect = { x0: number; x1: number; z0: number; z1: number };
// floor: 바닥 높이 (空 결말의 계단처럼 내려가는 곳). 없으면 0. Player와 SanNPC가 읽는다
export const walkArea: { rects: Rect[] | null; floor: ((x: number, z: number) => number) | null } = { rects: null, floor: null };

export function resetGaze() {
  gaze.meter = 0;
  gaze.state = "idle";
  gaze.seen = false;
  gaze.shake = 0;
  gaze.dead = 0;
  gaze.frozen = false;
  gaze.droneLit = false;
}
