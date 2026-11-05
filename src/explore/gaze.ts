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
  lookAt: null as { x: number; y: number; z: number } | null,
  // 空 결말: 검문소가 정지할 대상을 찾지 못해 성문의 레이저가 꺼진다
  gateOpen: false,
  // 큰길 드론의 빛이 지금 방문자를 비추는가 (줄 속에 서 있어도 보인다). Drones가 쓰고 GazeSystem이 읽는다
  droneLit: false,
  // 장면 연출: 걷기만 멈춘다 (고개는 돌릴 수 있다)
  still: false,
  // 망원경: 시야 배율(1 = 보통)과 고개를 돌릴 수 있는 범위
  zoom: 1,
  clamp: null as { yaw: number; dy: number; p0: number; p1: number } | null,
};

// 진행 단계 하나: ExploreClient가 정하고 3D 쪽(통제선 천막, 드론 재시작)이 읽는다
// restore 기록 복원 중 → talk 풀려난 이산과 대화 전 → scope 남쪽 망원경으로 → descent 하층행 승강장으로
export type RoutePhase = "restore" | "talk" | "scope" | "descent";
export const route: { phase: RoutePhase } = { phase: "restore" };
// 진행에 따라 생기고 사라지는 막힘 (통제선 끝 천막). Player와 SanNPC가 zone.boxes 다음에 함께 피한다
export const walkBlock: { boxes: { x0: number; x1: number; z0: number; z1: number }[] } = { boxes: [] };

// 결말 연출에서 시점을 스스로 걷게 한다 (충돌 무시). Player가 읽는다
// yaw: 다 왔을 때 바라볼 방향 (없으면 북쪽)
export const autoWalk: { to: { x: number; z: number; speed: number; pitch?: number; yaw?: number } | null } = { to: null };
// 결말 중 잠깐 조작을 돌려줄 때 걸을 수 있는 좁은 구역 (이 구역 밖으로는 못 나간다). Player가 읽는다
export const walkArea: { box: { x0: number; x1: number; z0: number; z1: number } | null } = { box: null };

export function resetGaze() {
  gaze.meter = 0;
  gaze.state = "idle";
  gaze.seen = false;
  gaze.shake = 0;
  gaze.dead = 0;
  gaze.frozen = false;
  gaze.droneLit = false;
}
