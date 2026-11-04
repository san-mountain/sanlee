// 추격 구간의 지형 데이터. 렌더링(three)과 판정(logic)이 같은 숫자를 쓴다.
// 좌표: 플레이어는 +z(골목 안쪽)에서 -z(지하철 입구) 방향으로 나아간다. 단위는 m.

export type V2 = { x: number; z: number };
export type Rect = { x0: number; x1: number; z0: number; z1: number };
/** 엄폐물·장애물. h는 높이(시야 차단 판정에 쓴다) */
export type Block = Rect & { h: number; kind: "building" | "cover" | "door" };

export const rect = (cx: number, cz: number, w: number, d: number): Rect => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  z0: cz - d / 2,
  z1: cz + d / 2,
});
const block = (cx: number, cz: number, w: number, d: number, h: number, kind: Block["kind"] = "cover"): Block => ({
  ...rect(cx, cz, w, d),
  h,
  kind,
});

export const PLAYER_RADIUS = 0.36;
export const EYE_HEIGHT = 1.62;
/** 감시등이 겨누는 플레이어 몸통 높이 */
export const CHEST_HEIGHT = 1.25;

// ACT 1 도입: 플레이어는 혼자, 정전된 막다른 통로(B-2)에서 시작한다
export const START: V2 = { x: 0.4, z: 44.5 };
/** 통로 끝 정상 범위 (+z 쪽 벽) */
export const MAX_Z = 46.6;

// 첫 번째 장치: 통로 B-2의 국소 전원. 케이블은 바로 앞 통로 문과 통로 조명, 안쪽 셔터 제어판으로만 이어진다
export const BREAKER: V2 = { x: -2.55, z: 40.6 };
export const BREAKER_RANGE = 2.2;
export const BREAKER_HOLD = 1.2;
/** 첫 번째 장치가 여는 통로 문 */
export const PASSAGE_DOOR_Z = 38;

// 이산은 통로 문 너머 벽감에 숨어 있다. 통로 조명이 켜지면 처음 드러난다
export const SAN_START: V2 = { x: 2.3, z: 34.4 };

// ACT 2: 이산이 열어 주는 셔터
export const SHUTTER_Z = 18;
export const SHUTTER_PANEL: V2 = { x: 2.55, z: 18.9 };

// 두 번째 복구 장치: 7구역 구역 전원 (골목 출구 교차로 서쪽 벽).
// 케이블이 큰길 차단문과 감시탑으로 이어진다. 첫 장치와 달리 감시망까지 함께 살아난다
export const RELAY: V2 = { x: -8.9, z: 1.6 };
/** 이산이 장치 옆까지 다가와 감시 회로 케이블을 발견하는 자리 */
export const SAN_RELAY_SPOT: V2 = { x: -7.3, z: 3.7 };
/** 이산이 교차로에서 기다리는 자리 */
export const SAN_JUNCTION: V2 = { x: -4.6, z: 3.6 };
export const RELAY_RANGE = 2.4;
/** 장치를 길게 눌러야 하는 시간(초). 경고는 누르는 도중에 나온다 */
export const RELAY_HOLD = 2.0;
export const RELAY_WARN_AT = 0.45;

// 차단문과 제어판
export const GATE_Z = -40;
export const GATE_PANEL: V2 = { x: 8.6, z: -37.2 };
export const GATE_RANGE = 2.5;
/** 차단문 해제에 필요한 누적 시간(초) */
export const GATE_HOLD = 3.2;

// 지하철 입구
export const EXIT_Z = -53.5;
export const STAIR_TOP_Z = -47;
export const STAIR_BOTTOM_Z = -56;
export const STAIR_DROP = 3.2;

export const CHECKPOINTS = {
  chase: { x: -3.2, z: 2.2 } as V2,
  gate: { x: 8.4, z: -41.4 } as V2,
};

// 걷는 공간 밖은 모두 건물이다
export const BUILDINGS: Block[] = [
  // 골목 양쪽 벽과 막다른 끝 (통로 B-2까지 이어진다)
  block(-8.6, 28, 10.8, 44, 16, "building"),
  block(8.6, 28, 10.8, 44, 13, "building"),
  block(0, 49, 6.4, 4, 9, "building"),
  // 큰길 양쪽
  block(-15, -26, 10, 68, 22, "building"),
  block(15, -26, 10, 68, 26, "building"),
  // 큰길 끝 (지하철 입구 너머)
  block(0, -62, 20, 4, 30, "building"),
  // 지하철 입구 계단 옆벽. 계단 아래 지하 통로(z -60.2)까지 이어져, 지상에서 계단 구덩이로 떨어질 수 없다
  block(-4.4, -53.6, 3.8, 13.2, 1.1, "cover"),
  block(4.4, -53.6, 3.8, 13.2, 1.1, "cover"),
];

// 감시를 피하는 엄폐물. 모두 1.5m 이상이라 웅크리지 않아도 몸통을 가린다
export const COVERS: (Block & { look: "container" | "shelter" | "van" | "kiosk" | "barrier" | "crates" | "truck" })[] = [
  { ...block(-6.4, -7.5, 2.6, 4.4, 2.5), look: "container" },
  { ...block(5.6, -11.5, 3.6, 1.4, 2.4), look: "shelter" },
  { ...block(-1.2, -16.5, 2.4, 1.6, 1.8), look: "crates" },
  { ...block(-6.2, -21.5, 2.2, 4.8, 2.2), look: "van" },
  { ...block(4.4, -24.5, 2.2, 2.2, 2.6), look: "kiosk" },
  { ...block(-2.4, -29.5, 4.2, 1.2, 1.7), look: "barrier" },
  { ...block(6.8, -32.5, 2.4, 5.4, 2.9), look: "truck" },
  { ...block(-6.6, -34.5, 2.2, 2.0, 1.8), look: "crates" },
];

export const SHUTTER_BLOCK: Block = block(0, SHUTTER_Z, 6.4, 0.4, 4, "door");
export const PASSAGE_DOOR_BLOCK: Block = block(0, PASSAGE_DOOR_Z, 6.4, 0.4, 4, "door");
export const GATE_BLOCK: Block = block(0, GATE_Z, 20, 0.6, 4.2, "door");

/** 감시등. 앞쪽 탑 위 광원(src)에서 바닥 지점을 비춘다. path는 바닥 지점이 순환하는 경로.
 *  광원이 진행 방향 앞쪽 낮은 각도에 있어서, 엄폐물의 그림자는 플레이어 쪽으로 길게 생긴다. */
export type LightDef = {
  id: string;
  src: { x: number; y: number; z: number };
  radius: number;
  speed: number; // m/s
  path: V2[];
  /** 이 단계부터 켜진다 */
  from: "chase" | "escape";
};

export const LIGHTS: LightDef[] = [
  {
    id: "L1",
    src: { x: 6, y: 10, z: -30 },
    // 첫 구간: 하나의 읽기 쉬운 왕복. 정류장(남쪽 가림판)과 컨테이너가 확실한 엄폐물
    radius: 2.4,
    speed: 3.0,
    path: [
      { x: -8.4, z: -12 },
      { x: 8.4, z: -12 },
    ],
    from: "chase",
  },
  {
    id: "L2",
    src: { x: -6, y: 11, z: -46 },
    // 중간 구간: 승합차(서쪽)와 매점(동쪽) 두 갈래를 가로지르는 왕복. 빛이 반대편에 있을 때가 틈이다.
    // 북쪽 끝은 L1의 띠와 겹치지 않아, 두 감시 경로 사이에 숨 고를 띠(z -15 ~ -18)가 남는다
    radius: 2.6,
    speed: 3.2,
    path: [
      { x: -8.4, z: -21.5 },
      { x: 8.4, z: -21.5 },
    ],
    from: "chase",
  },
  {
    // 차단문 앞을 쓰는 거대한 감시등. 제어판을 주기적으로 지나간다.
    // 탑은 차단문 바로 남쪽, 서쪽 건물 모서리에 붙어 있다. 닫힌 차단문(높이 4.2m)이 빛을 가리는 판정과
    // 화면이 어긋나지 않도록, 문 너머 먼 곳이 아니라 문 위로 빛을 내려 쏘는 자리에 둔다
    id: "L3",
    src: { x: -10.6, y: 10, z: -41 },
    radius: 3.0,
    speed: 3.6,
    path: [
      { x: -8, z: -36.5 },
      { x: 8.8, z: -36.5 },
      { x: 2, z: -33 },
    ],
    from: "chase",
  },
  {
    // 문이 열린 뒤 계단 앞을 쓸고 지나가는 탐색등
    id: "L4",
    src: { x: 7, y: 12, z: -60 },
    radius: 2.5,
    speed: 4.2,
    path: [
      { x: -7, z: -43.5 },
      { x: 7, z: -43.5 },
      { x: 0, z: -46.5 },
    ],
    from: "escape",
  },
];

/** 이산이 추격 중 차례로 숨는 엄폐물(COVERS의 번호). 실제 숨을 자리는 감시등 배치로부터 계산한다.
 *  첫 구간: 정류장 → 나무 상자 · 중간 구간: 승합차 → 방호벽 · 차단문 구간: 화물차(망보기) */
export const SAN_PLAN = [1, 2, 3, 5, 6];
/** 이산이 추격 시작 때 서 있는 자리 (교차로, 감시등이 닿지 않는 곳) */
export const SAN_CHASE_START: V2 = { x: -4.6, z: 1.6 };
/** 차단문이 열린 뒤: 문 너머 벽 쪽 → 계단 위 → 계단 아래 */
export const SAN_ESCAPE_ROUTE: V2[] = [
  { x: 2.4, z: -41.6 },
  { x: 0, z: -47.6 },
  { x: 0, z: -55 },
];
