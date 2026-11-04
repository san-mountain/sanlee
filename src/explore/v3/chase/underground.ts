// ACT 4 — 지하 정비·기록 공간. 배치 데이터와 진행(안전문 → 도면 → 제작 기록 → 출구 회로 복구 → 이동 제한 → 출구 조건 → 반응 → 우회로).
// three·React 의존 없음. logic.ts가 stepUnder()를 매 프레임 한 번 부르고, 이산의 이동처럼 logic.ts에 있는 기능은 api로 받는다.
// (logic.ts → underground.ts 는 실행 import, 반대 방향은 타입 import뿐이라 순환하지 않는다)
//
// 핵심 인과: 플레이어가 정비 단말에서 "출구 회로 복구"를 끝낸 바로 그 프레임에 경계(LIMIT_X)가 켜지고,
// 이산의 이동은 같은 상태(act4.restored)를 보고 그 선에서 멈춘다. 플레이어(방문자)에게는 제한이 없다.

import type { Game, Interact } from "./logic";
import { BUILDINGS, MAX_Z, type Block, type V2 } from "./level";

const wall = (x0: number, x1: number, z0: number, z1: number, h = 3.2, kind: Block["kind"] = "building"): Block => ({ x0, x1, z0, z1, h, kind });

/** 지하 바닥 기준 판정 범위 */
export const UNDER_BOUNDS = { x0: -9, x1: 17, z0: -82, z1: MAX_Z };

/* ---------- 배치 (지하 바닥 높이 -3.2m) ----------
   계단 아래 통로(|x|<2.5) → 수동 차단문(z -58.6) → 정비실(x -7.5..7.5, z -61..-80)
   정비실 서쪽 벽: 동선 점검 도면 · 가운데 동쪽: 정비 단말(제작 기록 + 출구 회로) · 동쪽 벽 남쪽: 정비 우회로(x 7.5→16)
   남쪽 벽 가운데: 정상 출구와 출구 제어판 */

export const SEAL_Z = -58.6;
export const SEAL_BLOCK: Block = wall(-2.5, 2.5, SEAL_Z - 0.15, SEAL_Z + 0.15, 3.0, "door");
/** 수동 차단문 손잡이 (문 안쪽, 서쪽 벽) */
export const SEAL_HANDLE: V2 = { x: -2.15, z: -59.7 };
export const ROOM = { x0: -7.5, x1: 7.5, z0: -80, z1: -61 };
/** 정비 우회로 (동쪽으로 열린 실제 통로). 끝에는 구역 제어 연결 차단기가 있다 (ACT 5에서 사용) */
export const BYPASS = { x0: 7.5, x1: 16, z0: -77, z1: -74 };
/** 안내 경로 제한선. 출구 회로가 복구되면 켜지고, 안내 개체(이산)는 이 선을 넘지 못한다 */
export const LIMIT_X = 7.3;
export const DIAGRAM: V2 = { x: -7.1, z: -65 };
export const CONSOLE: V2 = { x: 4.0, z: -75.5 };
export const EXIT_DOOR: V2 = { x: 0, z: -80 };
export const EXIT_PANEL: V2 = { x: -2.3, z: -79.6 };
export const BYPASS_MOUTH: V2 = { x: 7.6, z: -75.5 };
export const BYPASS_BREAKER: V2 = { x: 15.7, z: -75.5 };

export const UNDER_BLOCKS: Block[] = [
  // 계단 옆벽(지상과 공유)
  ...BUILDINGS.filter((b) => b.kind === "cover"),
  // 정비실 북쪽 벽 (계단 통로 자리만 비운다)
  wall(-8.4, -2.5, -61, -60.2),
  wall(2.5, 8.4, -61, -60.2),
  // 서쪽 · 남쪽 · 동쪽(우회로 입구만 비운다)
  wall(-8.4, -7.5, -80.6, -60.2),
  wall(-8.4, 8.4, -80.6, -80),
  wall(7.5, 8.4, -74, -60.2),
  wall(7.5, 8.4, -80.6, -77),
  // 정비 우회로 벽과 끝
  wall(8.4, 16.6, -74, -73.4),
  wall(8.4, 16.6, -77.6, -77),
  wall(16, 16.6, -77, -74),
  // 정비 단말 (낮은 콘솔이라 너머의 우회로 입구가 보인다) · 작업대
  wall(3.6, 4.4, -76.1, -74.9, 1.1, "cover"),
  wall(-4.7, -2.3, -68.5, -67.5, 0.9, "cover"),
];

/** 이산이 지하에서 걷는 지점. 각 구간은 직선으로 막힘이 없도록 골랐다 (충돌·선분 검사는 그대로 적용된다) */
const SAN = {
  landing: { x: 0.2, z: -57.6 },
  inside: { x: 0.9, z: -62.4 },
  exitLook: { x: 0.6, z: -78.4 },
  wait: { x: 3.4, z: -71.6 },
  edge: { x: 5.4, z: -74.9 },
  peek: { x: 9.6, z: -75.4 },
  stepBack: { x: 6.3, z: -75.0 },
  around: { x: 5.2, z: -77.0 },
  exitNear: { x: 1.8, z: -77.6 },
  reactStep: { x: 2.8, z: -77.1 },
};

export const NPC_ID = "GUIDE-SAN-01";
/** 초기화된 안내 개체가 처음 하는 말. ACT 5 정상 경로에서 다시 쓰인다 */
export const GUIDE_LINE = "방문자 확인. 서울 중심부까지 안내하겠습니다.";

export type UnderPanel = "diagram" | "record" | "exit";

export type Act4 = {
  doorReq: boolean;
  /** 0 열림 → 1 닫힘 */
  door: number;
  doorState: "open" | "waiting" | "closing" | "closed";
  diagram: boolean;
  record: boolean;
  /** 이산이 우회로를 들여다보는 짧은 행동: 0 전 · 1 들어감 · 2 머묾 · 3 돌아옴 · 4 끝 */
  peek: number;
  peekT: number;
  restored: boolean;
  restoreT: number;
  /** 제한 연출: 0 전 · 1 넘으려 함 · 2 멈춤 · 3 한 걸음 물러남 · 4 끝 */
  limit: number;
  limitT: number;
  exitPeek: boolean;
  exitRead: boolean;
  reactT: number;
  reactDone: boolean;
  bypassSeen: boolean;
  endT: number;
  hold: number;
  /** 길게 누르기가 한 번 끝나면 손을 뗄 때까지 다시 쌓지 않는다 (같은 조작의 반복 실행 방지) */
  latch: boolean;
  /** 제한선이 막 막아선 순간의 반짝임 (Scene용) */
  flash: number;
  route: V2[];
  look: V2 | null;
  /** 이산이 지하 통로에 들어섰는지 (이후로는 지하 지점만 걷는다) */
  sanIn: boolean;
};

export function newAct4(): Act4 {
  return {
    doorReq: false, door: 0, doorState: "open", diagram: false, record: false, peek: 0, peekT: 0, restored: false, restoreT: 0,
    limit: 0, limitT: 0, exitPeek: false, exitRead: false, reactT: -1, reactDone: false, bypassSeen: false, endT: -1,
    hold: 0, latch: false, flash: 0, route: [], look: null, sanIn: false,
  };
}

const d = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z);

/* ---------- 상호작용 ---------- */

const HOLD: Record<string, number> = { seal: 0.8, diagram: 0.25, record: 0.25, circuit: 1.6, exit: 0.25 };

/** 지하의 상호작용 대상. 정비 단말은 하나의 설비가 기록 확인과 출구 회로 복구를 차례로 맡는다 */
export function underTarget(g: Game): Interact | null {
  const P = g.player;
  const a = g.act4;
  if (g.panel) return null;
  if (!a.doorReq && P.z < SEAL_Z - 0.4 && d(P, SEAL_HANDLE) < 2.2) return "seal";
  if (d(P, DIAGRAM) < 2.3) return "diagram";
  if (a.doorState === "closed" && d(P, CONSOLE) < 2.0) {
    if (!a.record || a.restored) return "record";
    // 이산이 우회로를 살피고 돌아온 뒤에 복구할 수 있다 (복구 순간의 이산 위치가 늘 같도록)
    if (a.peek >= 4) return "circuit";
    return null;
  }
  // 제한 연출이 끝난 뒤에 출구 조건을 읽는다 (두 장면이 겹치지 않도록)
  if (d(P, EXIT_PANEL) < 2.2 && !(a.restored && a.limit < 4)) return "exit";
  return null;
}

export function underHoldProgress(g: Game) {
  const t = g.target;
  return t && HOLD[t] ? Math.min(1, g.act4.hold / HOLD[t]) : 0;
}

export function underActionLabel(t: Interact | null) {
  switch (t) {
    case "seal": return "수동 차단문 닫기";
    case "diagram": return "도면 보기";
    case "record": return "정비 단말 기록";
    case "circuit": return "출구 회로 복구";
    case "exit": return "출구 제어판 보기";
    default: return null;
  }
}

/* ---------- 진행 ---------- */

export type UnderApi = {
  say: (who: "san" | "system" | "record", text: string, dur: number, delay?: number) => void;
  /** route 앞 지점부터 걷는다. 경로를 다 걸으면 "arrived", limitX에 막히면 "halted" */
  walk: (route: V2[], speed: number, limitX?: number) => "moving" | "arrived" | "halted" | "blocked";
  /** 지상(계단 위쪽)에 있는 이산을 계단 아래까지 데려온다 (지상 경로 탐색 사용) */
  goSurface: (goal: V2) => void;
};

function setRoute(a: Act4, ...pts: V2[]) {
  a.route = pts.map((p) => ({ ...p }));
}

export function stepUnder(g: Game, dt: number, hold: boolean, api: UnderApi) {
  const a = g.act4;
  const P = g.player;
  const s = g.san;
  a.flash = Math.max(0, a.flash - dt * 1.6);

  // 길게 누르기
  const t = g.target;
  if (!hold) a.latch = false;
  if (t && hold && !a.latch) {
    a.hold += dt;
    if (a.hold >= HOLD[t]) {
      a.hold = 0;
      a.latch = true;
      trigger(g, t);
    }
  } else {
    a.hold = Math.max(0, a.hold - dt * 2);
  }

  // 수동 차단문: 요청은 언제든 남는다. 플레이어와 이산이 모두 문 안쪽에 들어와야 닫히기 시작하고,
  // 닫히는 도중 누가 문틀에 가까이 오면 멈춘다(끼이거나 반대편에 남지 않도록)
  if (a.doorReq && a.doorState !== "closed") {
    const clear = P.z < SEAL_Z - 0.75 && s.z < SEAL_Z - 0.75;
    if (!clear) {
      a.doorState = "waiting";
    } else {
      if (a.doorState !== "closing") g.events.push("seal");
      a.doorState = "closing";
      a.door = Math.min(1, a.door + dt / 1.3);
      if (a.door >= 1) {
        a.doorState = "closed";
        g.events.push("sealed");
        api.say("san", "……여기까진 안 내려와.", 2.2, 0.7);
      }
    }
  }

  stepSanUnder(g, dt, api);

  // 출구 회로 복구 직후: 시설 상태 문구 → 이산이 우회로로 다시 가려다 제한선에서 멈춘다
  if (a.restored) {
    a.restoreT += dt;
    // 핵심 장면을 놓치지 않도록 시선만 잠깐 이산 쪽으로 부드럽게 돌려 준다 (조작은 막지 않는다)
    if (a.restoreT > 0.3 && a.restoreT < 1.8 && !g.panel) {
      const want = Math.atan2(P.x - s.x, P.z - s.z);
      const k = Math.atan2(Math.sin(want - P.yaw), Math.cos(want - P.yaw));
      if (Math.abs(k) > 0.35) P.yaw += k * Math.min(1, dt * 2.4);
    }
  }

  // 정상 출구 확인 후의 반응
  if (a.reactT >= 0 && !a.reactDone) {
    const t0 = a.reactT;
    a.reactT += dt;
    const at = (k: number) => a.reactT >= k && t0 < k;
    if (at(0.5)) api.say("san", "저 말……", 1.6);
    if (at(2.4)) api.say("san", "내가 저렇게 말하게 돼 있다고?", 2.6);
    // 대답하지 않는다. 출구를 보다가, 우회로 쪽으로 돌아선다
    if (at(5.2)) a.look = EXIT_DOOR;
    if (at(6.6)) {
      a.look = BYPASS_MOUTH;
      setRoute(a, SAN.reactStep);
    }
    if (a.reactT > 7.6) a.reactDone = true;
  }

  // 정비 우회로를 본 것으로 치는 거리 (제한선이 켜진 뒤)
  if (a.restored && !a.bypassSeen && d(P, BYPASS_MOUTH) < 3.4) a.bypassSeen = true;

  // 두 경로를 모두 확인하면 현재 구현 구간 종료 (선택은 실행하지 않는다)
  if (a.reactDone && a.bypassSeen && a.endT < 0) a.endT = 0;
  if (a.endT >= 0) {
    a.endT += dt;
    if (a.endT > 1.6 && !g.panel) {
      g.phase = "complete";
      g.phaseT = 0;
      g.events.push("complete");
    }
  }
}

function trigger(g: Game, t: Interact) {
  const a = g.act4;
  switch (t) {
    case "seal":
      a.doorReq = true;
      if (a.doorState === "open") a.doorState = "waiting";
      g.events.push("door");
      break;
    case "diagram":
      g.panel = "diagram";
      g.events.push("read");
      break;
    case "record":
      g.panel = "record";
      g.events.push(a.record ? "read" : "record");
      break;
    case "exit":
      g.panel = "exit";
      g.events.push("read");
      break;
    case "circuit":
      if (a.restored) break;
      // 복구 = 출구 설비 전원 + 안내 경로 제한 재적용. 같은 상태 하나로 둘 다 켠다
      a.restored = true;
      a.restoreT = 0;
      a.limit = 1;
      a.limitT = 0;
      g.events.push("restore-exit");
      g.queue = g.queue.filter((q) => q.who !== "san");
      g.line = null;
      g.queue.push({ at: g.time + 0.2, who: "system", text: "[출구 회로 복구 · 안내 경로 제한 복원]", dur: 2.4, prio: 1 });
      break;
  }
}

/** 조사 패널을 닫을 때 한 번만 일어나는 일 */
export function onPanelClosed(g: Game, panel: UnderPanel, api: Pick<UnderApi, "say">) {
  const a = g.act4;
  if (panel === "diagram") a.diagram = true;
  if (panel === "record" && !a.record) {
    a.record = true;
    // 저장된 안내 문장을 짧은 전자음과 함께 다시 들려준다 (음성 없음)
    api.say("record", GUIDE_LINE, 3.2, 0.3);
    if (a.peek === 0) {
      a.peek = 1;
      // 정비 단말 옆을 지나 우회로 안쪽까지 (콘솔을 비켜 가는 지점을 거친다)
      setRoute(a, SAN.wait, SAN.edge, SAN.peek);
    }
  }
  if (panel === "exit") {
    if (!a.restored) a.exitPeek = true;
    else if (!a.exitRead) {
      a.exitRead = true;
      a.reactT = 0;
    }
  }
}

function stepSanUnder(g: Game, dt: number, api: UnderApi) {
  const a = g.act4;
  const s = g.san;
  const P = g.player;
  s.pose = "stand";
  s.state = "wait";

  // 1) 아직 계단 위쪽이면 지상 경로로 계단 아래까지
  if (!a.sanIn) {
    if (s.z > -54.2) {
      api.goSurface({ x: 0, z: -55.4 });
      return;
    }
    a.sanIn = true;
    setRoute(a, SAN.landing, SAN.inside);
  }

  // 2) 출구 회로 복구 뒤의 제한 연출 (복구와 같은 상태를 본다)
  if (a.limit > 0 && a.limit < 4) {
    a.limitT += dt;
    if (a.limit === 1) {
      // 시설 문구가 나온 뒤, 아까처럼 우회로로 들어가려 한다
      if (a.limitT < 0.9) {
        a.look = BYPASS_MOUTH;
        return;
      }
      const r = api.walk([SAN.peek], 2.4, LIMIT_X - 0.34);
      if (r === "halted" || r === "blocked" || a.limitT > 4.5) {
        a.limit = 2;
        a.limitT = 0;
        a.flash = 1;
        g.events.push("denied");
      }
      return;
    }
    if (a.limit === 2) {
      // 선 앞에서 멈칫한다 (짧은 자세 변화)
      s.pose = a.limitT < 0.45 ? "duck" : "stand";
      a.look = BYPASS_MOUTH;
      if (a.limitT > 0.9) {
        a.limit = 3;
        a.limitT = 0;
        setRoute(a, SAN.stepBack);
      }
      return;
    }
    if (a.limit === 3) {
      // 한 걸음 물러난다
      const r = api.walk(a.route, 1.1);
      a.look = BYPASS_MOUTH;
      if (r === "arrived" || a.limitT > 3) {
        a.limit = 4;
        api.say("san", "……아까는 지나갈 수 있었는데.", 2.6, 0.5);
        setRoute(a, SAN.around, SAN.exitNear);
        a.look = EXIT_DOOR;
      }
      return;
    }
  }

  // 3) 우회로를 짧게 들여다본다 (제작 기록을 확인한 직후, 아직 제한이 없을 때)
  if (a.peek > 0 && a.peek < 4) {
    if (a.peek === 1) {
      a.look = null;
      a.peekT += dt;
      // 어떤 이유로 걷지 못해도 진행이 막히지 않게: 일정 시간이 지나면 다음 단계로 (순간이동은 하지 않는다)
      if (api.walk(a.route, 2.4) === "arrived" || a.peekT > 14) {
        a.peek = 2;
        a.peekT = 0;
      }
      return;
    }
    if (a.peek === 2) {
      a.peekT += dt;
      a.look = BYPASS_BREAKER;
      if (a.peekT > 1.5) {
        a.peek = 3;
        a.peekT = 0;
        setRoute(a, SAN.edge);
      }
      return;
    }
    if (a.peek === 3) {
      a.look = BYPASS_MOUTH;
      a.peekT += dt;
      if (api.walk(a.route, 2.4) === "arrived" || a.peekT > 8) a.peek = 4;
      return;
    }
  }

  // 4) 그 밖에는 정해 둔 지점으로 걷고 멈추면 바라볼 곳을 본다
  if (a.route.length) {
    api.walk(a.route, 2.4);
    return;
  }
  if (a.doorState !== "closed") {
    a.look = null; // 문을 닫을 플레이어 쪽을 본다
    return;
  }
  // 문이 닫힌 뒤: 출구부터 살피고, 가까운 곳에서 기다린다 (도면을 해설하지 않는다)
  if (!a.restored && a.peek === 0) {
    if (d(s, SAN.exitLook) > 0.2 && d(s, SAN.wait) > 0.2) {
      setRoute(a, SAN.exitLook);
      a.look = EXIT_DOOR;
      return;
    }
    if (d(s, SAN.exitLook) <= 0.2) {
      a.look = EXIT_DOOR;
      // 출구가 꺼져 있는 것을 확인하면 정비 단말 근처로
      if (a.diagram) setRoute(a, SAN.wait);
      return;
    }
    a.look = d(P, CONSOLE) < 3 ? CONSOLE : null;
  }
}

/* ---------- HUD 목표와 비컨 ---------- */

export function underObjective(g: Game): string {
  const a = g.act4;
  if (a.doorState !== "closed") return a.doorReq ? "수동 차단문 · 이산이 안으로 들어오면 닫힌다" : "계단 아래 · 수동 차단문 닫기";
  if (!a.record) return a.diagram ? "출구 회로 · 정비 단말 확인" : "정상 출구가 작동하지 않는다 · 정비 설비 조사";
  if (!a.restored) return a.peek >= 4 ? "정비 단말에서 출구 회로 복구" : "정비 단말 · 출구 회로";
  if (a.limit < 4) return "……";
  if (!a.exitRead) return "정상 출구 확인";
  if (!a.reactDone) return "……";
  if (!a.bypassSeen) return "정비 우회로 확인";
  return "두 개의 길";
}

export function underBeacon(g: Game): V2 | null {
  const a = g.act4;
  if (a.doorState !== "closed") return a.doorReq ? null : { x: SEAL_HANDLE.x + 0.5, z: SEAL_HANDLE.z };
  if (!a.diagram && !a.record) return DIAGRAM;
  if (!a.restored) return a.peek === 0 || a.peek >= 4 ? CONSOLE : null;
  if (a.limit < 4) return null;
  if (!a.exitRead) return EXIT_PANEL;
  if (a.reactDone && !a.bypassSeen) return BYPASS_MOUTH;
  return null;
}
