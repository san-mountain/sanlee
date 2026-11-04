// 추격 구간의 게임 상태와 규칙. three·React에 의존하지 않는 순수 TS.
// 렌더러는 매 프레임 stepGame()을 한 번 부르고, 그 결과(상태 객체)를 읽어 장면을 갱신한다.
// 모든 시간(대사, 연출, 감시등)은 이 시뮬레이션 시간으로 흘러서 일시정지하면 함께 멈춘다.
//
// 한 프레임의 순서: 플레이어 이동 → 상호작용 대상 → 이야기 진행(장치·문) → 문 애니메이션
//   → 감시등 이동 → 이산 이동 → 탐지(이번 프레임 위치 기준) → 이산의 경고 대사(방금 계산한 탐지 기준) → 자막
// 경고 대사는 탐지 뒤에 돌기 때문에, 지난 프레임의 노출 값과 이번 프레임의 위치를 섞지 않는다.

import {
  BREAKER, BREAKER_HOLD, BREAKER_RANGE, BUILDINGS, CHECKPOINTS, CHEST_HEIGHT, COVERS, EXIT_Z, GATE_BLOCK, GATE_HOLD,
  GATE_PANEL, GATE_RANGE, LIGHTS, MAX_Z, PASSAGE_DOOR_BLOCK, PASSAGE_DOOR_Z, PLAYER_RADIUS, RELAY, RELAY_HOLD,
  RELAY_RANGE, RELAY_WARN_AT, SAN_CHASE_START, SAN_ESCAPE_ROUTE, SAN_JUNCTION, SAN_PLAN, SAN_RELAY_SPOT, SAN_START,
  SHUTTER_BLOCK, SHUTTER_PANEL, SHUTTER_Z, STAIR_TOP_Z, START,
  type Block, type LightDef, type V2,
} from "./level";
import { COVER_SPOTS, SAN_RADIUS, findPath, groundY, pathLength, pointAlong, predictPatrol, segmentClear } from "./nav";
import {
  SEAL_BLOCK, UNDER_BLOCKS, UNDER_BOUNDS, newAct4, onPanelClosed, stepUnder, underActionLabel, underBeacon, underHoldProgress,
  underObjective, underTarget, type Act4, type UnderApi, type UnderPanel,
} from "./underground";

// intro: 혼자, 정전된 통로 B-2 · meet: 국소 전원 복구 직후 이산과 첫 만남 · approach: 셔터 협력
// relay: 구역 전원(두 번째 장치) · surge: 감시 재가동 · chase/escape: 추격 · under: ACT 4 지하 정비·기록 공간
// complete: 현재 구현 구간의 끝(ACT 5 선택 직전. 이야기의 결말 아님)
export type Phase = "intro" | "meet" | "approach" | "relay" | "surge" | "chase" | "escape" | "under" | "complete";
/** san: 지금의 이산 · system: 시설 상태 문구 · record: 저장된 안내 기록 재생 */
export type Speaker = "san" | "system" | "record";
export type Interact = "breaker" | "relay" | "gate" | "seal" | "diagram" | "record" | "circuit" | "exit";
export type FrameInput = { move: { x: number; y: number; run: boolean }; look: { yaw: number; pitch: number }; hold: boolean };
export type GameEvent =
  | "door" | "warn" | "restore" | "beam" | "alarm" | "spotted" | "lock" | "caught" | "gate-tick" | "gate-open" | "complete"
  | "san-call" | "power" | "under" | "seal" | "sealed" | "read" | "record" | "restore-exit" | "denied";

/**
 * 감시등 상태.
 * - path: 정해진 순찰 경로를 돈다
 * - track: 실제로 본 대상(target)을 쫓는다
 * - search: 대상을 놓친 뒤 마지막으로 본 자리(lastSeen)를 잠깐 훑고 순찰로 돌아간다
 */
export type LightMode = "path" | "track" | "search";
export type LightState = {
  def: LightDef;
  on: boolean;
  x: number;
  z: number;
  seg: number;
  mode: LightMode;
  target: "player" | "san" | null;
  /** 렌더러 호환용: mode === "track" */
  tracking: boolean;
  /** 이번 프레임에 이 등이 플레이어/이산을 직접 비추는지 (0 없음, 0.6 가장자리, 1 중심) */
  seesPlayer: number;
  seesSan: number;
  /** 연속 노출 누적(초). TRACK_AFTER에 닿으면 추적 시작 */
  seen: number;
  seenSan: number;
  lostFor: number;
  lastSeen: V2 | null;
  searchT: number;
  /** 재가동 연출 직후 거대 감시등이 자기 순찰 경로로 빠르게 돌아가는 중 */
  rush: boolean;
};

export type SanMode = "idle" | "hold" | "move" | "flee";
type SanNav = { goal: V2 | null; path: V2[]; key: string; retryAt: number; stuckT: number };

export type Line = { who: Speaker; text: string; until: number; prio: number; tag?: string };
type Queued = { at: number; who: Speaker; text: string; dur: number; prio: number; expire?: number; tag?: string };

export type Game = {
  phase: Phase;
  phaseT: number;
  time: number;
  player: { x: number; z: number; y: number; yaw: number; pitch: number; speed: number; vx: number; vz: number };
  san: {
    x: number; z: number; y: number; yaw: number;
    /** 추격: 도착한 엄폐 지점 수(SAN_HIDES 기준) · 탈출: 도착한 탈출 경로 지점 수 */
    idx: number;
    moving: boolean; lagFor: number; callAt: number;
    /** 첫 만남 전에는 보이지도, 움직이지도, 말하지도 않는다. Scene이 매 프레임 이 값을 읽어 표시한다 */
    visible: boolean;
    pose: "hide" | "stand" | "duck";
    state: "hidden" | "met" | "lead" | "panel" | "wait" | "watch" | "run";
    /** 추격 중 행동: hold 엄폐 지점에서 대기 · move 다음 엄폐 지점으로 이동 · flee 노출되어 가까운 안전 지점으로 */
    mode: SanMode;
    /** 지금 이동 중인 목적지 */
    dest: V2 | null;
    /** 이산이 지금 감시등에 노출돼 있는지 (플레이어 탐지 게이지에는 더하지 않는다) */
    exposed: boolean;
    checkAt: number;
    nav: SanNav;
  };
  /** 첫 번째 장치(국소 전원)와 그 전원으로 움직이는 통로 문 */
  breaker: { hold: number; done: boolean; door: number; doorState: "closed" | "opening" | "open"; light: number };
  shutter: { open: number; state: "closed" | "opening" | "open"; t: number };
  relay: { hold: number; warned: boolean; releasedFor: number; hesitated: boolean; done: boolean; sanNear: boolean; toldGate: boolean };
  /** 감시 재가동 연출: 거대 감시등이 이산을 훑은 시각 */
  surge: { sanHitAt: number };
  gate: { hold: number; open: number; opened: boolean; lastTick: number; danger: boolean | null; hideAt: number; nowAt: number };
  /** 이산의 상황 경고 상태 */
  call: { waitAt: number; waiting: boolean; ahead: V2 | null; hideAt: number; goAt: number };
  lights: LightState[];
  /** ACT 4 지하 진행 */
  act4: Act4;
  /** 열려 있는 조사 패널. 열려 있는 동안 이동·시점·상호작용 입력을 받지 않는다 */
  panel: UnderPanel | null;
  lampsOn: number;
  alarm: number;
  meter: number;
  /** 게이지 방향: up 노출되어 위치 확인이 진행 중 · down 가려져(또는 시야 밖이라) 약해지는 중 · idle */
  trend: "up" | "down" | "idle";
  exposed: boolean;
  covered: boolean;
  caught: boolean;
  grace: number;
  checkpoint: keyof typeof CHECKPOINTS;
  retries: number;
  caughtAt: V2 | null;
  memoryLineUsed: boolean;
  target: Interact | null;
  queue: Queued[];
  line: Line | null;
  events: GameEvent[];
};

const WALK = 3.7;
const RUN = 6.3;
const SAN_WALK = 2.9;
const SAN_RUN = 5.6;

/* ---------- 탐지 수치 ----------
   게이지 1.0 = 위치 확정(실패). 겹친 감시등은 더하지 않고 가장 강한 하나만 센다.
   중심부(반경 60% 안) 1/3.0 /s → 0에서 3.0초 · 가장자리 1/5.0 /s → 0에서 5.0초.
   같은 등에 0.8초 이상 계속 비치면 그 등이 추적을 시작한다(이 값은 노출이 끊기면 초당 2.0씩 줄어든다).
   가려지면 0.40/s, 시야 밖이면 0.22/s로 줄어든다. */
const RATE_CORE = 1 / 3.0;
const RATE_EDGE = 1 / 5.0;
const TRACK_AFTER = 0.8;
const SEEN_DECAY = 2.0;
const DECAY_OPEN = 0.22;
const DECAY_COVERED = 0.4;
/** 추적 중인 대상이 이 시간 이상 안 보이면 마지막 위치 수색으로 바뀐다 */
const LOSE_AFTER = 1.0;
/** 마지막 위치를 훑는 시간. 이후 순찰 경로로 돌아간다 */
const SEARCH_TIME = 2.4;
/** 추적 속도 = 순찰 속도 × 0.95 (최대 4.0m/s, 달리기 6.3m/s보다 느려 엄폐하거나 벗어날 수 있다) */
const TRACK_SPEED = 0.95;
/** 재가동 연출이 끝난 뒤 거대 감시등이 순찰 경로로 돌아가는 속도 (첫 구간을 가로지르며 머물지 않도록) */
const RUSH_SPEED = 9;
const GRACE = 1.6;
/** 이산의 몸통 높이: 서 있을 때 / 웅크려 숨을 때 / 빛에 걸려 몸을 낮췄을 때 */
const SAN_CHEST = { stand: CHEST_HEIGHT, hide: 0.8, duck: 0.9 } as const;
/** 제어판 앞 대표 위치(플레이어가 아직 제어판 범위 밖일 때 위험 예측에 쓴다) */
const GATE_STAND: V2 = { x: 8.0, z: -37.2 };

export const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z);

function makeLights(): LightState[] {
  return LIGHTS.map((def) => ({
    def, on: false, x: def.path[0].x, z: def.path[0].z, seg: 1 % def.path.length,
    mode: "path" as LightMode, target: null, tracking: false, seesPlayer: 0, seesSan: 0, seen: 0, seenSan: 0,
    lostFor: 0, lastSeen: null, searchT: 0, rush: false,
  }));
}

function newNav(): SanNav {
  return { goal: null, path: [], key: "", retryAt: 0, stuckT: 0 };
}

export function newGame(): Game {
  const g: Game = {
    phase: "intro",
    phaseT: 0,
    time: 0,
    player: { ...START, y: 0, yaw: 0, pitch: 0, speed: 0, vx: 0, vz: 0 },
    san: {
      ...SAN_START, y: 0, yaw: 0, idx: 0, moving: false, lagFor: 0, callAt: -99, visible: false, pose: "hide", state: "hidden",
      mode: "idle", dest: null, exposed: false, checkAt: 0, nav: newNav(),
    },
    breaker: { hold: 0, done: false, door: 0, doorState: "closed", light: 0 },
    shutter: { open: 0, state: "closed", t: 0 },
    relay: { hold: 0, warned: false, releasedFor: 0, hesitated: false, done: false, sanNear: false, toldGate: false },
    surge: { sanHitAt: -1 },
    gate: { hold: 0, open: 0, opened: false, lastTick: 0, danger: null, hideAt: -99, nowAt: -99 },
    call: { waitAt: -99, waiting: false, ahead: null, hideAt: -99, goAt: -99 },
    lights: makeLights(),
    act4: newAct4(),
    panel: null,
    lampsOn: 0,
    alarm: 0,
    meter: 0,
    trend: "idle",
    exposed: false,
    covered: false,
    caught: false,
    grace: 0,
    checkpoint: "chase",
    retries: 0,
    caughtAt: null,
    memoryLineUsed: false,
    target: null,
    queue: [],
    line: null,
    events: [],
  };
  // 도입부에는 이산의 대사가 없다. 처음 보이는 문장은 시스템의 정전 표시뿐
  say(g, "system", "[통로 B-2 · 전원 없음]", 2.6, 1.2);
  return g;
}

/** 이야기 대사(우선순위 0). 같은 우선순위 대사는 차례로 나오고, 경고 대사가 떠 있으면 끝날 때까지 기다린다 */
export function say(g: Game, who: Speaker, text: string, dur = 2.6, delay = 0) {
  // 같은 대사가 이미 예약돼 있으면 다시 넣지 않는다
  if (g.queue.some((q) => q.who === who && q.text === text)) return;
  g.queue.push({ at: g.time + delay, who, text, dur, prio: 0 });
}

/** 이산의 상황 경고. 지금 떠 있는 대사보다 우선순위가 낮으면 말하지 않는다(긴급 경고를 일반 경고가 덮지 않는다) */
function callout(g: Game, tag: string, text: string, dur: number, prio: 1 | 2) {
  if (g.line && g.time < g.line.until && g.line.prio > prio) return false;
  g.line = { who: "san", text, until: g.time + dur, prio, tag };
  return true;
}

/** 조건이 사라진 경고를 화면에서 내린다 */
function cancelCallout(g: Game, tag: string) {
  if (g.line?.tag === tag) g.line = null;
}

function clearLines(g: Game) {
  g.queue = [];
  g.line = null;
}

function setPhase(g: Game, p: Phase) {
  g.phase = p;
  g.phaseT = 0;
}

/* ---------- 충돌 ---------- */

/** 문은 60% 이상 열려야 지나갈 수 있다. 이 값이 바뀌면 이산의 경로 연결도 다시 계산한다 */
function doorKey(g: Game) {
  return `${g.breaker.door < 0.6 ? 1 : 0}${g.shutter.open < 0.6 ? 1 : 0}${g.gate.open < 0.6 ? 1 : 0}`;
}

const STATIC_SOLIDS: Block[] = [...BUILDINGS, ...COVERS];
const solidCache = new Map<string, Block[]>();

/** 지금 막혀 있는 모든 사각형: 건물·엄폐물·닫힌 문. 이동 충돌과 감시등 차폐가 같은 목록을 쓴다 */
function solidBlocks(g: Game): Block[] {
  const key = doorKey(g);
  let list = solidCache.get(key);
  if (!list) {
    list = [...STATIC_SOLIDS];
    if (key[0] === "1") list.push(PASSAGE_DOOR_BLOCK);
    if (key[1] === "1") list.push(SHUTTER_BLOCK);
    if (key[2] === "1") list.push(GATE_BLOCK);
    solidCache.set(key, list);
  }
  return list;
}

/** 계단 아래쪽 절반부터는 지하 판정(벽·차단문)을 쓴다. 계단 통로의 옆벽은 두 판정에 모두 있다 */
const UNDER_Y = -2.4;
const SURFACE_BOUNDS = { x0: -9.6, x1: 9.6, z0: -59.5, z1: MAX_Z };
export const isUnder = (p: V2) => groundY(p) < UNDER_Y;
const underCache = new Map<boolean, Block[]>();

function underBlocks(g: Game): Block[] {
  const closed = g.act4.door >= 0.6;
  let list = underCache.get(closed);
  if (!list) {
    list = closed ? [...UNDER_BLOCKS, SEAL_BLOCK] : UNDER_BLOCKS;
    underCache.set(closed, list);
  }
  return list;
}

/** p가 서 있는 층의 충돌 사각형과 이동 범위 */
function levelOf(g: Game, p: V2) {
  return isUnder(p) ? { blocks: underBlocks(g), bounds: UNDER_BOUNDS } : { blocks: solidBlocks(g), bounds: SURFACE_BOUNDS };
}

/** 원을 사각형들 밖으로 밀어낸다 */
export function resolveCircle(p: V2, blocks: Block[], r = PLAYER_RADIUS, bounds = SURFACE_BOUNDS): V2 {
  const out = { x: Math.max(bounds.x0, Math.min(bounds.x1, p.x)), z: Math.max(bounds.z0, Math.min(bounds.z1, p.z)) };
  for (let pass = 0; pass < 2; pass++) {
    for (const b of blocks) {
      const cx = Math.max(b.x0, Math.min(b.x1, out.x));
      const cz = Math.max(b.z0, Math.min(b.z1, out.z));
      const dx = out.x - cx;
      const dz = out.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        out.x = cx + (dx / d) * r;
        out.z = cz + (dz / d) * r;
      } else {
        // 중심이 사각형 안: 가장 가까운 변으로
        const l = out.x - b.x0, rr = b.x1 - out.x, n = out.z - b.z0, s = b.z1 - out.z;
        const m = Math.min(l, rr, n, s);
        if (m === l) out.x = b.x0 - r;
        else if (m === rr) out.x = b.x1 + r;
        else if (m === n) out.z = b.z0 - r;
        else out.z = b.z1 + r;
      }
    }
  }
  return out;
}

/* ---------- 감시 ---------- */

/** 광원 → 목표 선분이 사각기둥(엄폐물·건물·닫힌 문)에 가려지는지. 3D 슬래브 판정 */
export function segmentBlocked(src: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }, blocks: Block[]) {
  const d = { x: to.x - src.x, y: to.y - src.y, z: to.z - src.z };
  for (const b of blocks) {
    let lo = 0.001, hi = 0.999;
    const axes: [number, number, number, number][] = [
      [src.x, d.x, b.x0, b.x1],
      [src.y, d.y, 0, b.h],
      [src.z, d.z, b.z0, b.z1],
    ];
    let hit = true;
    for (const [p, v, a, c] of axes) {
      if (Math.abs(v) < 1e-9) {
        if (p < a || p > c) { hit = false; break; }
        continue;
      }
      const t0 = (a - p) / v, t1 = (c - p) / v;
      lo = Math.max(lo, Math.min(t0, t1));
      hi = Math.min(hi, Math.max(t0, t1));
      if (lo > hi) { hit = false; break; }
    }
    if (hit) return true;
  }
  return false;
}

/** 광원에서 p의 몸통(바닥 높이 y + chest)까지 시야가 막혀 있는지. 광원 위치는 고정이라 등의 바닥 지점과 무관하다 */
function losBlocked(def: LightDef, p: V2, y: number, chest: number, occ: Block[]) {
  return segmentBlocked(def.src, { x: p.x, y: y + chest, z: p.z }, occ);
}

/** 한 등이 p를 비추는 세기: 0 없음 · 0.6 가장자리 · 1 중심(반경 60% 안). blocked는 반경 안이지만 가려진 경우 */
function lightOn(l: LightState, p: V2, y: number, chest: number, occ: Block[]): { level: number; blocked: boolean } {
  // 계단 아래로 내려가면 감시등이 닿지 않는다
  if (y < -1.2) return { level: 0, blocked: false };
  const d = Math.hypot(p.x - l.x, p.z - l.z);
  if (d > l.def.radius) return { level: 0, blocked: false };
  if (losBlocked(l.def, p, y, chest, occ)) return { level: 0, blocked: true };
  return { level: d < l.def.radius * 0.6 ? 1 : 0.6, blocked: false };
}

export type Exposure = { exposed: boolean; covered: boolean; intensity: number; by: LightState | null };

/** p가 지금 켜진 등들에 노출됐는지. 겹친 등은 더하지 않고 가장 강한 하나만 센다.
 *  covered는 "빛의 반경 안에 있지만 엄폐물(또는 닫힌 문)에 가려진" 경우에만 참이다 */
export function exposureOf(lights: LightState[], p: { x: number; z: number; y: number }, chest = CHEST_HEIGHT, occ: Block[] = STATIC_SOLIDS): Exposure {
  const best: Exposure = { exposed: false, covered: false, intensity: 0, by: null };
  for (const l of lights) {
    if (!l.on) continue;
    const r = lightOn(l, p, p.y, chest, occ);
    if (r.blocked) best.covered = true;
    if (r.level > best.intensity) {
      best.exposed = true;
      best.intensity = r.level;
      best.by = l;
    }
  }
  if (best.exposed) best.covered = false;
  return best;
}

function moveToward(o: { x: number; z: number }, t: V2, step: number) {
  const d = dist(o, t);
  if (d <= step || d < 1e-6) {
    o.x = t.x;
    o.z = t.z;
    return true;
  }
  o.x += ((t.x - o.x) / d) * step;
  o.z += ((t.z - o.z) / d) * step;
  return false;
}

function targetPos(g: Game, l: LightState): V2 | null {
  if (l.target === "player") return g.player;
  if (l.target === "san") return g.san;
  return null;
}

export function stepLights(g: Game, dt: number) {
  // 감시 재가동 연출 중의 거대 감시등은 stepStory가 직접 움직인다
  if (g.phase === "surge") return;
  for (const l of g.lights) {
    if (!l.on) continue;
    if (l.mode === "track") {
      // 실제로 본 대상을 쫓는다. 대상이 가려져 있는 동안에는 마지막으로 본 자리로 간다
      const goal = l.lostFor > 0 && l.lastSeen ? l.lastSeen : targetPos(g, l);
      if (goal) moveToward(l, goal, l.def.speed * TRACK_SPEED * dt);
      continue;
    }
    if (l.mode === "search") {
      // 마지막으로 본 자리에 가서 그 주변을 작게 훑는다
      l.searchT += dt;
      const c = l.lastSeen ?? { x: l.x, z: l.z };
      const a = l.searchT * 2.6;
      const goal = { x: c.x + Math.cos(a) * 1.1, z: c.z + Math.sin(a) * 1.1 };
      moveToward(l, goal, l.def.speed * 0.8 * dt);
      if (l.searchT > SEARCH_TIME) {
        l.mode = "path";
        l.target = null;
        l.lastSeen = null;
        // 순찰로 돌아갈 때 가장 가까운 경로 지점부터 잇는다
        let best = 0, bd = Infinity;
        l.def.path.forEach((p, i) => {
          const d = dist(l, p);
          if (d < bd) { bd = d; best = i; }
        });
        l.seg = best;
      }
      continue;
    }
    if (moveToward(l, l.def.path[l.seg], (l.rush ? RUSH_SPEED : l.def.speed) * dt)) {
      l.seg = (l.seg + 1) % l.def.path.length;
      l.rush = false;
    }
  }
  for (const l of g.lights) l.tracking = l.on && l.mode === "track";
}

/** t초 뒤 등의 바닥 지점과, 추적·수색 중이라 위치를 확신할 수 없을 때 더해 줄 여유 반경 */
function lightAt(l: LightState, t: number): { x: number; z: number; extra: number } {
  if (l.mode === "path" && l.rush) {
    const goal = l.def.path[l.seg];
    const d = dist(l, goal);
    const k = d > 0 ? Math.min(1, (RUSH_SPEED * t) / d) : 1;
    return { x: l.x + (goal.x - l.x) * k, z: l.z + (goal.z - l.z) * k, extra: 0 };
  }
  if (l.mode === "path") {
    const p = predictPatrol(l.def, l.x, l.z, l.seg, t);
    return { x: p.x, z: p.z, extra: 0 };
  }
  return { x: l.x, z: l.z, extra: l.def.speed * TRACK_SPEED * t };
}

/**
 * horizon초 안에 켜진 등 중 하나가 p(몸통 높이 chest)를 비추게 되는 가장 이른 시각. 없으면 null.
 * 광원에서 p까지 시야가 막혀 있는 등은 바닥 지점이 지나가도 위험이 아니다. 순찰 중인 등은 실제 진행 방향으로 예측한다
 */
function dangerTime(g: Game, p: V2, chest: number, horizon: number, margin = 0.35): number | null {
  const occ = solidBlocks(g);
  const y = groundY(p);
  if (y < -1.2) return null;
  let best: number | null = null;
  for (const l of g.lights) {
    if (!l.on) continue;
    if (losBlocked(l.def, p, y, chest, occ)) continue;
    for (let t = 0; t <= horizon + 1e-6; t += 0.1) {
      if (best !== null && t >= best) break;
      const at = lightAt(l, t);
      if (Math.hypot(at.x - p.x, at.z - p.z) <= l.def.radius + at.extra + margin) {
        best = t;
        break;
      }
    }
  }
  return best;
}

/* ---------- 이산의 숨을 자리 ----------
   SAN_PLAN의 엄폐물마다, 그 구간에서 켜지는 모든 감시등에 대해 "순찰 경로가 닿지 않거나, 광원에서 웅크린 몸통까지
   시야가 엄폐물에 막혀 있는" 지점만 고른다. 광원은 고정이므로 이 판정은 한 번만 하면 된다 */

function distToPath(p: V2, path: V2[]) {
  let best = Infinity;
  const n = path.length;
  const segs = n === 2 ? 1 : n;
  for (let i = 0; i < segs; i++) {
    const a = path[i], b = path[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z;
    const L = dx * dx + dz * dz;
    const t = L > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t)));
  }
  return best;
}

function staticSafe(p: V2, from: LightDef["from"][], chest = SAN_CHEST.hide) {
  for (const def of LIGHTS) {
    if (!from.includes(def.from)) continue;
    if (distToPath(p, def.path) > def.radius + 0.6) continue;
    if (losBlocked(def, p, groundY(p), chest, STATIC_SOLIDS)) continue;
    return false;
  }
  return true;
}

const coverCenter = (i: number): V2 => ({ x: (COVERS[i].x0 + COVERS[i].x1) / 2, z: (COVERS[i].z0 + COVERS[i].z1) / 2 });

/** 추격 중 이산이 차례로 숨는 지점. 마지막(차단문 망보기)은 제어판에 가장 가까운 안전 지점 */
export const SAN_HIDES: V2[] = (() => {
  const out: V2[] = [];
  let prev: V2 = SAN_CHASE_START;
  SAN_PLAN.forEach((ci, k) => {
    const last = k === SAN_PLAN.length - 1;
    const next = last ? GATE_PANEL : coverCenter(SAN_PLAN[k + 1]);
    const all = COVER_SPOTS.filter((s) => s.cover === ci).map((s) => s.p);
    const safe = all.filter((p) => staticSafe(p, ["chase"]));
    const pool = safe.length ? safe : all;
    const score = (p: V2) => (last ? dist(p, GATE_PANEL) : dist(prev, p) + dist(p, next));
    const pick = pool.reduce((a, b) => (score(b) < score(a) ? b : a));
    out.push(pick);
    prev = pick;
  });
  return out;
})();

/** 노출됐을 때 피할 수 있는 안전 지점 후보 */
const SAFE_SPOTS = {
  chase: COVER_SPOTS.filter((s) => staticSafe(s.p, ["chase"])).map((s) => s.p),
  escape: COVER_SPOTS.filter((s) => staticSafe(s.p, ["chase", "escape"])).map((s) => s.p),
};

/* ---------- 이산의 이동: 반경 SAN_RADIUS, 건물·엄폐물·닫힌 문과 충돌. 순간이동하지 않는다 ---------- */

/** goal로 한 프레임 이동한다. 도착하면 true. 경로가 없으면 그 자리에서 기다리며 0.5초마다 다시 찾는다 */
function sanGo(g: Game, goal: V2, speed: number, dt: number): boolean {
  const s = g.san;
  const n = s.nav;
  if (dist(s, goal) < 0.12) {
    n.path = [];
    n.goal = { ...goal };
    return true;
  }
  const blocks = solidBlocks(g);
  const key = doorKey(g);
  const sameGoal = !!n.goal && dist(n.goal, goal) < 0.25 && n.key === key;
  if (!sameGoal || !n.path.length) {
    if (sameGoal && g.time < n.retryAt) return false;
    n.goal = { ...goal };
    n.key = key;
    n.stuckT = 0;
    const p = findPath(s, goal, blocks, key);
    if (!p) {
      // 닫힌 문 등으로 길이 없다: 제자리에서 기다린다
      n.path = [];
      n.retryAt = g.time + 0.5;
      return false;
    }
    n.path = p;
  }
  const before = { x: s.x, z: s.z };
  let left = speed * dt;
  for (let guard = 0; guard < 4 && left > 1e-5 && n.path.length; guard++) {
    const wp = n.path[0];
    const d = dist(s, wp);
    if (d < 0.08) {
      n.path.shift();
      continue;
    }
    const step = Math.min(left, d);
    const cand = resolveCircle({ x: s.x + ((wp.x - s.x) / d) * step, z: s.z + ((wp.z - s.z) / d) * step }, blocks, SAN_RADIUS);
    // 도착점뿐 아니라 이동 선분도 확인한다. 막히면 움직이지 않고 경로를 다시 찾는다
    if (!segmentClear(s, cand, blocks, SAN_RADIUS * 0.9)) {
      n.path = [];
      n.retryAt = g.time + 0.2;
      break;
    }
    s.x = cand.x;
    s.z = cand.z;
    left -= step;
    if (dist(s, wp) < 0.08) n.path.shift();
    else break;
  }
  const moved = dist(before, s);
  // 밀려서 거의 못 움직이면 경로를 다시 찾는다
  if (moved < speed * dt * 0.3) {
    n.stuckT += dt;
    if (n.stuckT > 0.6) {
      n.stuckT = 0;
      n.path = [];
    }
  } else n.stuckT = 0;
  if (moved > 1e-4) {
    s.moving = true;
    s.yaw = Math.atan2(s.x - before.x, s.z - before.z);
  }
  return dist(s, goal) < 0.12;
}

/** from에서 path를 따라 speed로 달리는 동안, 그리고 도착 후 settle초 동안 켜진 등에 걸리지 않는지 */
function legSafe(g: Game, from: V2, path: V2[], speed: number, settle = 0.8) {
  const occ = solidBlocks(g);
  const T = pathLength(from, path) / speed;
  for (let t = 0; t <= T + settle; t += 0.12) {
    const p = pointAlong(from, path, speed, Math.min(t, T));
    const chest = t >= T ? SAN_CHEST.hide : SAN_CHEST.stand;
    const y = groundY(p);
    if (y < -1.2) continue;
    for (const l of g.lights) {
      if (!l.on) continue;
      if (losBlocked(l.def, p, y, chest, occ)) continue;
      const at = lightAt(l, t);
      if (Math.hypot(at.x - p.x, at.z - p.z) <= l.def.radius + at.extra + 0.5) return false;
    }
  }
  return true;
}

function sanChest(g: Game) {
  return SAN_CHEST[g.san.pose];
}

/** 이산이 노출됐을 때 피할 가장 가까운 안전 지점 (지금 서 있는 자리는 제외) */
function fleeSpot(g: Game): V2 | null {
  const s = g.san;
  const list = g.phase === "escape" ? SAFE_SPOTS.escape : SAFE_SPOTS.chase;
  const cands = list
    .filter((p) => dist(p, s) > 0.6 && dangerTime(g, p, SAN_CHEST.hide, 0.6) === null)
    .sort((a, b) => dist(a, s) - dist(b, s))
    .slice(0, 4);
  let best: V2 | null = null, bl = Infinity;
  const blocks = solidBlocks(g);
  for (const p of cands) {
    const path = findPath(s, p, blocks, doorKey(g));
    if (!path) continue;
    const L = pathLength(s, path);
    if (L < bl) { bl = L; best = p; }
  }
  return best;
}

function stepSanChase(g: Game, dt: number, route: V2[], waitDist: number) {
  const s = g.san;
  const P = g.player;
  // 이산 자신이 위험하면 먼저 숨는다
  if (s.exposed && s.mode !== "flee") {
    const spot = fleeSpot(g);
    if (spot) {
      s.mode = "flee";
      s.dest = spot;
      s.nav.path = [];
    }
  }
  if (s.mode === "flee" && s.dest) {
    s.pose = "stand";
    if (sanGo(g, s.dest, SAN_RUN, dt)) {
      // 피한 자리가 원래 다음 지점이었다면 도착한 것으로 친다
      if (s.idx < route.length && dist(s.dest, route[s.idx]) < 0.3) s.idx++;
      s.mode = "hold";
      s.dest = null;
    }
    return;
  }
  if (s.mode === "move" && s.dest) {
    s.pose = "stand";
    if (sanGo(g, s.dest, SAN_RUN, dt)) {
      s.idx++;
      s.mode = "hold";
      s.dest = null;
    }
    return;
  }
  // hold: 지금 자리에서 웅크리고, 다음 구간이 안전하고 플레이어가 따라왔을 때만 출발한다
  s.mode = "hold";
  s.pose = g.phase === "escape" ? "stand" : "hide";
  if (s.idx >= route.length) return;
  const next = route[s.idx];
  const playerClose = dist(P, s) < waitDist || P.z < s.z - 1;
  if (!playerClose || g.time < s.checkAt) return;
  s.checkAt = g.time + 0.25;
  const path = findPath(s, next, solidBlocks(g), doorKey(g));
  if (!path) return;
  if (!legSafe(g, s, path, SAN_RUN)) return;
  s.mode = "move";
  s.dest = next;
  s.nav = { goal: { ...next }, path, key: doorKey(g), retryAt: 0, stuckT: 0 };
}

function stepSan(g: Game, dt: number) {
  const s = g.san;
  const P = g.player;
  // 첫 만남 전: 이산은 존재하지 않는 것처럼 아무것도 하지 않는다
  if (!s.visible) return;
  if (g.phase === "approach") {
    if (s.state === "panel") sanGo(g, SHUTTER_PANEL, SAN_WALK, dt);
  } else if (g.phase === "relay") {
    const goal = g.shutter.state !== "open" ? SHUTTER_PANEL : g.relay.sanNear ? SAN_RELAY_SPOT : SAN_JUNCTION;
    sanGo(g, goal, SAN_WALK, dt);
  } else if (g.phase === "surge") {
    // 빛에 걸리기 전까지는 장치 옆으로 다가가고, 걸린 뒤에는 그 자리에 웅크린다
    if (g.surge.sanHitAt < 0) sanGo(g, SAN_RELAY_SPOT, SAN_WALK, dt);
  } else if (g.phase === "chase") {
    stepSanChase(g, dt, SAN_HIDES, 7);
    // 뒤처진 플레이어를 부른다 (이산이 숨어서 기다리는 중일 때만)
    const pd = dist(P, s);
    if (s.mode === "hold" && P.z > s.z + 7 && pd > 9) s.lagFor += dt;
    else s.lagFor = 0;
    if (s.lagFor > 3 && g.time - s.callAt > 13 && !s.exposed) {
      if (callout(g, "call", g.retries > 0 ? "여기야. 천천히 와도 돼." : "이쪽이야.", 2, 1)) {
        s.callAt = g.time;
        g.events.push("san-call");
      }
    }
  } else if (g.phase === "escape") {
    stepSanChase(g, dt, SAN_ESCAPE_ROUTE, 7);
  }
  // under: 이동은 stepUnder(이야기 진행)가 이미 했다. 여기서는 높이와 시선만
  s.y = groundY(s);
  if (!s.moving && g.phase === "under") {
    const look = g.act4.look ?? P;
    s.yaw = Math.atan2(look.x - s.x, look.z - s.z);
  } else if (!s.moving) {
    // 멈춰 있을 때는 플레이어 쪽을 본다. 차단문 망보기 중엔 제어판, 장치 앞에선 감시 회로 케이블 쪽을 본다
    const watchingGate = g.phase === "chase" && s.idx >= SAN_HIDES.length && dist(P, GATE_PANEL) < 7;
    const look = watchingGate ? GATE_PANEL : (g.phase === "relay" && g.relay.sanNear) || g.phase === "surge" ? RELAY : P;
    s.yaw = Math.atan2(look.x - s.x, look.z - s.z);
  }
}

/* ---------- 상호작용 ---------- */

export function currentTarget(g: Game): Interact | null {
  if (g.caught) return null;
  if (g.phase === "under") return underTarget(g);
  if (g.phase === "intro" && !g.breaker.done && dist(g.player, BREAKER) < BREAKER_RANGE) return "breaker";
  if (g.phase === "relay" && !g.relay.done && dist(g.player, RELAY) < RELAY_RANGE) return "relay";
  if (g.phase === "chase" && !g.gate.opened && dist(g.player, GATE_PANEL) < GATE_RANGE) return "gate";
  return null;
}

export function holdProgress(g: Game) {
  if (g.phase === "under") return underHoldProgress(g);
  if (g.target === "breaker") return g.breaker.hold / BREAKER_HOLD;
  if (g.target === "relay") return g.relay.hold / RELAY_HOLD;
  if (g.target === "gate") return g.gate.hold / GATE_HOLD;
  return 0;
}

/* ---------- 단계별 진행 (장치·문·연출). 상황 경고 대사는 탐지 뒤의 stepCallouts에서 ---------- */

function stepStory(g: Game, dt: number, hold: boolean) {
  const P = g.player;
  const s = g.san;
  switch (g.phase) {
    case "intro": {
      // 혼자. 문은 전원이 없어 닫혀 있고, 바로 옆 벽의 국소 전원 장치에서 케이블이 문틀로 이어진다
      const b = g.breaker;
      if (g.target === "breaker" && hold) {
        b.hold = Math.min(BREAKER_HOLD, b.hold + dt);
        if (b.hold >= BREAKER_HOLD) {
          b.done = true;
          b.doorState = "opening";
          clearLines(g);
          g.events.push("power");
          setPhase(g, "meet");
        }
      } else {
        b.hold = Math.max(0, b.hold - dt * 1.5);
      }
      break;
    }
    case "meet": {
      // 통로 조명이 켜지며 문 너머 벽감에 웅크린 사람이 드러난다. 서로 모르는 사이의 첫 만남
      const t = g.phaseT;
      const at = (k: number) => t >= k && t - dt < k;
      if (at(0.9)) {
        s.visible = true;
        s.state = "met";
      }
      if (at(1.8)) {
        s.pose = "stand";
        say(g, "san", "……누구야.", 1.8);
      }
      if (at(4.0)) say(g, "san", "그거, 네가 켰어?", 2.0);
      // 이산이 시설을 안다는 것은 설명 대신 셔터 쪽을 가리키는 짧은 정보로만 드러난다
      if (at(6.6)) say(g, "san", "이 길, 안쪽 셔터에서 한 번 더 막혀.", 2.6);
      if (at(9.6)) say(g, "san", "……나도 저쪽으로 가야 해.", 2.4);
      if (t > 12.2 || (t > 9.8 && P.z < PASSAGE_DOOR_Z - 1)) {
        s.state = "lead";
        setPhase(g, "approach");
      }
      break;
    }
    case "approach": {
      // 이산이 셔터를 열어 주는 짧은 협력. 셔터 제어판은 첫 장치(국소 전원)로 막 살아난 상태다
      if (s.state === "lead" && (P.z < SAN_START.z - 2 || g.phaseT > 2.5)) s.state = "panel";
      if (s.state === "panel" && dist(s, SHUTTER_PANEL) < 0.3 && g.shutter.state === "closed") {
        g.shutter.state = "opening";
        g.shutter.t = 0;
        g.events.push("door");
      }
      if (g.shutter.state === "opening" && g.shutter.t > 0.6 && g.shutter.t - dt <= 0.6) say(g, "san", "됐다.", 1.4, 0.3);
      if (g.shutter.state === "open") setPhase(g, "relay");
      break;
    }
    case "relay": {
      const r = g.relay;
      // 이산은 큰길 차단문에 전원이 없다는 사실만 말한다. 장치로 안내하는 것은 HUD(복구 권한)의 목표다
      if (!r.toldGate && P.z < 9) {
        r.toldGate = true;
        say(g, "san", "큰길 문은 죽어 있어. 전원이 안 들어와.", 2.6, 0.4);
      }
      // 플레이어가 장치 앞에 서면 이산도 다가와 장치를 본다
      if (!r.sanNear && dist(P, RELAY) < 4) r.sanNear = true;
      if (g.target === "relay" && hold) {
        r.hold = Math.min(RELAY_HOLD, r.hold + dt);
        r.releasedFor = 0;
        if (!r.warned && r.hold >= RELAY_WARN_AT) {
          // 경고는 작동 '직전', 플레이어가 손을 대고 있는 순간에 나온다.
          // 금지가 아니라, 장치 위로 감시탑까지 올라가는 케이블을 이산이 막 알아본 반응이다
          r.warned = true;
          r.sanNear = true;
          clearLines(g);
          say(g, "san", "잠깐.", 0.9);
          say(g, "san", "그 선… 감시탑까지 이어져 있어.", 2.4, 0.9);
          g.events.push("warn");
        }
        if (r.hold >= RELAY_HOLD) {
          r.done = true;
          clearLines(g);
          setPhase(g, "surge");
          g.events.push("restore");
        }
      } else {
        r.hold = Math.max(r.warned ? RELAY_WARN_AT * 0.6 : 0, r.hold - dt * 1.2);
        if (r.warned) {
          r.releasedFor += dt;
          if (!r.hesitated && r.releasedFor > 1.3) {
            // 플레이어가 경고를 듣고 멈췄다. 선택이 끝난 것처럼 말하지 않고, 남은 길이 하나뿐임을 같이 확인한다
            r.hesitated = true;
            say(g, "san", "……", 1.2, 0.2);
            say(g, "san", "다른 길은 없어. 저 문도 이 전원을 써.", 2.8, 1.6);
            say(g, "san", "켜면, 바로 뛸 준비 해.", 2.2, 4.6);
          }
        }
      }
      break;
    }
    case "surge": {
      const t = g.phaseT;
      g.lampsOn = Math.min(1, t / 0.8);
      const at = (k: number) => t >= k && t - dt < k;
      if (at(1.0)) say(g, "san", "……젠장.", 1.4);
      if (at(2.6)) say(g, "san", "전력만 돌아오는 게 아니야.", 1.8);
      // 4.4~5.6초: 정적.
      // 5.6초: 큰길 끝의 거대 감시등이 켜지고, 바닥 지점이 큰길을 거슬러 올라와 장치 옆의 이산을 훑는다.
      // 최초 경보는 이산의 노출이다. 시선은 움직이는 빛을 따라 부드럽게 돌려 준다 (플레이어 입력은 계속 먹는다)
      const L3 = g.lights.find((l) => l.def.id === "L3")!;
      const sv = g.surge;
      if (at(5.6)) {
        L3.on = true;
        L3.x = 1;
        L3.z = -14;
        L3.mode = "track";
        L3.target = "san";
        L3.tracking = true;
        g.events.push("beam");
      }
      if (t > 5.6 && sv.sanHitAt < 0) {
        moveToward(L3, s, 9 * dt);
        if (dist(L3, s) < L3.def.radius * 0.5 || t > 8.4) {
          sv.sanHitAt = t;
          g.alarm = 1;
          s.pose = "duck";
          g.events.push("spotted");
          say(g, "system", "[미등록 개체 감지]", 2.2);
        }
      } else if (sv.sanHitAt >= 0) {
        // 빛은 이산 위에 머문다
        moveToward(L3, s, 6 * dt);
      }
      const focus = sv.sanHitAt >= 0 ? s : L3;
      if (t > 5.4 && (sv.sanHitAt < 0 || t < sv.sanHitAt + 0.6)) {
        const want = Math.atan2(P.x - focus.x, P.z - focus.z);
        const d = Math.atan2(Math.sin(want - P.yaw), Math.cos(want - P.yaw));
        P.yaw += d * Math.min(1, dt * 3.2);
        P.pitch += (-0.12 - P.pitch) * Math.min(1, dt * 3);
      }
      if (sv.sanHitAt >= 0 && t >= sv.sanHitAt + 1.2) {
        say(g, "san", "뛰어!", 1.6);
        g.events.push("alarm");
        for (const l of g.lights) if (l.def.from === "chase") l.on = true;
        // 거대 감시등은 이산을 놓치고 차단문 앞 순찰 경로로 빠르게 돌아간다 (이후 판정은 실제로 본 대상 기준).
        // 연출의 대상은 이산이었고 플레이어는 아직 발견되지 않았으므로, 플레이어 주변을 수색하지 않는다
        L3.mode = "path";
        L3.target = null;
        L3.tracking = false;
        L3.rush = true;
        L3.seg = 2;
        setPhase(g, "chase");
        g.checkpoint = "chase";
        startSanChase(g);
        g.grace = GRACE;
      }
      break;
    }
    case "chase": {
      const gt = g.gate;
      if (g.target === "gate" && hold) {
        gt.hold = Math.min(GATE_HOLD, gt.hold + dt);
        if (gt.hold - gt.lastTick > 0.5) {
          gt.lastTick = gt.hold;
          g.events.push("gate-tick");
        }
      } else {
        gt.hold = Math.max(0, gt.hold - dt * 0.12);
        gt.lastTick = Math.min(gt.lastTick, gt.hold);
      }
      if (gt.hold >= GATE_HOLD) {
        gt.opened = true;
        g.events.push("gate-open");
        clearLines(g);
        say(g, "san", "열렸어! 계단으로!", 2);
        for (const l of g.lights) if (l.def.from === "escape") l.on = true;
        setPhase(g, "escape");
        g.checkpoint = "gate";
        startSanEscape(g);
      }
      break;
    }
    case "escape": {
      // 계단 아래에 닿으면 완료 화면 대신 지하로 이어진다. 이 순간부터 지상 탐지와 실패 판정은 없다
      if (P.z < EXIT_Z && Math.abs(P.x) < 2.6) {
        setPhase(g, "under");
        g.events.push("under");
        clearLines(g);
        g.meter = 0;
        g.exposed = false;
        g.covered = false;
        g.trend = "idle";
        g.grace = 0;
        s.exposed = false;
        s.mode = "idle";
        s.dest = null;
        s.nav = newNav();
      }
      break;
    }
    case "under": {
      stepUnder(g, dt, hold, underApi(g, dt));
      break;
    }
  }
}

/* ---------- ACT 4 지하: logic.ts의 기능을 underground.ts에 빌려준다 ---------- */

/** 정해 둔 지점들을 차례로 걷는다. 지하 벽·닫힌 차단문과 충돌하고, 이동 선분이 막히면 움직이지 않는다(순간이동 없음).
 *  limitX가 있으면 그 x를 넘지 못한다(안내 경로 제한선) */
function sanWalk(g: Game, route: V2[], speed: number, dt: number, limitX = Infinity): "moving" | "arrived" | "halted" | "blocked" {
  const s = g.san;
  while (route.length && dist(s, route[0]) < 0.06) route.shift();
  if (!route.length) return "arrived";
  const target = route[0];
  const d = dist(s, target);
  const step = Math.min(speed * dt, d);
  let nx = s.x + ((target.x - s.x) / d) * step;
  const nz = s.z + ((target.z - s.z) / d) * step;
  let halted = false;
  if (nx > limitX) {
    nx = Math.max(s.x, limitX);
    halted = s.x >= limitX - 1e-3;
  }
  const lv = levelOf(g, s);
  const cand = resolveCircle({ x: nx, z: nz }, lv.blocks, SAN_RADIUS, lv.bounds);
  if (!segmentClear(s, cand, lv.blocks, SAN_RADIUS * 0.9)) return "blocked";
  const moved = dist(s, cand);
  if (moved > 1e-4) {
    s.yaw = Math.atan2(cand.x - s.x, cand.z - s.z);
    s.x = cand.x;
    s.z = cand.z;
    s.moving = true;
  }
  if (halted) return "halted";
  if (dist(s, target) < 0.06) {
    route.shift();
    return route.length ? "moving" : "arrived";
  }
  return "moving";
}

function underApi(g: Game, dt: number): UnderApi {
  return {
    say: (who, text, dur, delay = 0) => say(g, who, text, dur, delay),
    walk: (route, speed, limitX) => sanWalk(g, route, speed, dt, limitX),
    goSurface: (goal) => void sanGo(g, goal, SAN_RUN, dt),
  };
}

/** 조사 패널 닫기 (HUD의 닫기 버튼·Esc). 처음 닫을 때만 이어지는 일이 있다 */
export function closePanel(g: Game) {
  const p = g.panel;
  if (!p) return;
  g.panel = null;
  onPanelClosed(g, p, { say: (who, text, dur, delay = 0) => say(g, who, text, dur, delay) });
}

const ACTION_LABEL: Partial<Record<Interact, string>> = { breaker: "통로 전원 복구", relay: "구역 전원 복구", gate: "차단문 해제" };

/** 행동 버튼·안내 문구에 쓸 짧은 동사 */
export function actionLabelOf(g: Game): string | null {
  if (!g.target) return null;
  if (g.phase === "under") return underActionLabel(g.target);
  return ACTION_LABEL[g.target] ?? null;
}

function startSanChase(g: Game) {
  const s = g.san;
  s.idx = 0;
  s.state = "run";
  s.pose = "stand";
  s.mode = "hold";
  s.dest = null;
  s.checkAt = 0;
  s.nav = newNav();
}

function startSanEscape(g: Game) {
  const s = g.san;
  // 망보던 자리에서 문 너머 경로를 처음부터 따라간다
  s.idx = 0;
  s.mode = "hold";
  s.dest = null;
  s.checkAt = 0;
  s.pose = "stand";
  s.nav = newNav();
}

/* ---------- 이산의 상황 경고 ----------
   모두 이번 프레임의 위치와 탐지 결과로 판단하고, 근거가 부족하면 말하지 않는다.
   - "몸 숨겨!" (긴급): 플레이어가 지금 실제로 노출되어 게이지가 오르는 중이거나 감시등이 플레이어를 추적 중
   - "잠깐. 지나가면 가자.": 플레이어가 지금 안전한 엄폐 위치에 있고, 앞으로 나아가려는데, 바로 앞 지점에
                              1.6초 안에 다가오는 감시등이 있다(광원 시야가 실제로 열려 있는 등만)
   - "지금, 건너.": "잠깐" 이후 10초 안에, 그 앞 지점이 2.2초 동안 안전해졌을 때. 다시 위험해지면 자막을 내린다
   - 차단문 "숨어!"(긴급) / "지금!": 제어판 앞 위치가 켜진 모든 등에 대해 1.4초 안에 위험해지는 순간 / 2.6초 동안
     안전해지는 순간. 이산이 화물차 옆 망보기 자리에 도착한 뒤에만
   이산 자신이 노출되었거나 피하는 중이면 아무 경고도 하지 않는다(먼저 숨는다). */

function nearCover(p: V2, pad: number) {
  return COVERS.some((c) => p.x > c.x0 - pad && p.x < c.x1 + pad && p.z > c.z0 - pad && p.z < c.z1 + pad);
}

function stepCallouts(g: Game) {
  if (g.caught || (g.phase !== "chase" && g.phase !== "escape")) return;
  const P = g.player;
  const s = g.san;
  const c = g.call;
  const gt = g.gate;
  if (!s.visible || s.exposed || s.mode === "flee") return;
  const sanDist = dist(P, s);
  const trackedBy = g.lights.some((l) => l.on && l.mode === "track" && l.target === "player");
  const atGate = g.phase === "chase" && dist(P, GATE_PANEL) < 7;

  // 긴급: 실제로 노출됨
  if ((g.exposed && g.meter > 0.08) || trackedBy) {
    if (atGate && s.idx >= SAN_HIDES.length) {
      // 차단문 앞에서는 같은 뜻을 망보기 신호로
      if (g.time - gt.hideAt > 3 && callout(g, "gate-hide", "숨어!", 1.2, 2)) gt.hideAt = g.time;
      gt.danger = true;
      cancelCallout(g, "gate-now");
    } else if (sanDist < 20 && g.time - c.hideAt > 4) {
      if (callout(g, "hide", "몸 숨겨!", 1.4, 2)) c.hideAt = g.time;
    }
    cancelCallout(g, "go");
    c.waiting = false;
    return;
  }
  cancelCallout(g, "hide");

  // 차단문: 제어판 위치의 실제 위험
  if (atGate && s.idx >= SAN_HIDES.length && !gt.opened) {
    const stand = dist(P, GATE_PANEL) < GATE_RANGE ? P : GATE_STAND;
    const soon = dangerTime(g, stand, CHEST_HEIGHT, 1.4) !== null;
    if (soon && gt.danger !== true) {
      gt.danger = true;
      cancelCallout(g, "gate-now");
      if (dist(P, GATE_PANEL) < 4.5 && callout(g, "gate-hide", "숨어!", 1.2, 2)) gt.hideAt = g.time;
    } else if (!soon && gt.danger !== false && dangerTime(g, stand, CHEST_HEIGHT, 2.6) === null) {
      gt.danger = false;
      cancelCallout(g, "gate-hide");
      if (g.target !== "gate" && callout(g, "gate-now", "지금!", 1.2, 1)) gt.nowAt = g.time;
    }
    if (gt.danger) cancelCallout(g, "gate-now");
    return;
  }
  if (g.phase !== "chase" || sanDist > 16) return;

  // 앞으로 가려는 방향의 앞 지점 (엄폐물 안쪽이 아닌, 실제로 설 수 있는 곳)
  const fast = P.speed > 0.8;
  const dir = fast ? { x: P.vx / P.speed, z: P.vz / P.speed } : { x: -Math.sin(P.yaw), z: -Math.cos(P.yaw) };
  const forward = dir.z < -0.3;
  const solids = solidBlocks(g);
  let ahead: V2 | null = null;
  for (const k of [2.4, 3.2, 1.6, 4.0]) {
    const p = { x: P.x + dir.x * k, z: P.z + dir.z * k };
    const r = PLAYER_RADIUS;
    if (!solids.some((b) => p.x > b.x0 - r && p.x < b.x1 + r && p.z > b.z0 - r && p.z < b.z1 + r)) {
      ahead = p;
      break;
    }
  }

  if (c.waiting && c.ahead) {
    // "잠깐" 이후: 그 앞 지점이 안전해지면 "지금, 건너."
    if (g.time - c.waitAt > 10) c.waiting = false;
    else if (dangerTime(g, c.ahead, CHEST_HEIGHT, 2.2) === null && dangerTime(g, P, CHEST_HEIGHT, 0.6) === null) {
      cancelCallout(g, "wait");
      if (callout(g, "go", "지금, 건너.", 1.4, 1)) {
        c.goAt = g.time;
        c.waiting = false;
      }
    }
    return;
  }
  // "지금, 건너."가 떠 있는 동안 다시 위험해지면 내린다
  if (g.line?.tag === "go" && c.ahead && dangerTime(g, c.ahead, CHEST_HEIGHT, 0.8) !== null) cancelCallout(g, "go");

  const inCover = (g.covered || nearCover(P, 1.0)) && dangerTime(g, P, CHEST_HEIGHT, 0.4) === null;
  if (ahead && inCover && forward && P.speed > 0.2 && g.time - c.waitAt > 7 && g.time - c.goAt > 3) {
    const t = dangerTime(g, ahead, CHEST_HEIGHT, 1.6);
    if (t !== null && callout(g, "wait", "잠깐. 지나가면 가자.", 2.0, 1)) {
      c.waitAt = g.time;
      c.waiting = true;
      c.ahead = ahead;
    }
  }
}

function stepLines(g: Game) {
  if (g.line && g.time >= g.line.until) g.line = null;
  if (!g.queue.length) return;
  g.queue = g.queue.filter((q) => q.expire === undefined || q.expire > g.time);
  g.queue.sort((a, b) => a.at - b.at);
  const next = g.queue[0];
  if (next && next.at <= g.time && (!g.line || next.prio >= g.line.prio)) {
    g.queue.shift();
    g.line = { who: next.who, text: next.text, until: g.time + next.dur, prio: next.prio, tag: next.tag };
  }
}

function stepPlayer(g: Game, dt: number, f: FrameInput) {
  const P = g.player;
  // 조사 패널이 열려 있으면 이동·시점 입력을 받지 않는다
  if (g.panel) f = { move: { x: 0, y: 0, run: false }, look: { yaw: 0, pitch: 0 }, hold: false };
  P.yaw += f.look.yaw;
  P.pitch = Math.max(-1.15, Math.min(1.15, P.pitch + f.look.pitch));
  const m = f.move;
  const speed = (m.run ? RUN : WALK) * dt;
  const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
  const dx = (m.x * cos - m.y * sin) * speed;
  const dz = (-m.x * sin - m.y * cos) * speed;
  const before = { x: P.x, z: P.z };
  const lv = levelOf(g, P);
  const next = resolveCircle({ x: P.x + dx, z: P.z + dz }, lv.blocks, PLAYER_RADIUS, lv.bounds);
  P.x = next.x;
  P.z = next.z;
  P.vx = dt > 0 ? (P.x - before.x) / dt : 0;
  P.vz = dt > 0 ? (P.z - before.z) / dt : 0;
  P.speed = Math.hypot(P.vx, P.vz);
  // 지하철 계단 (이산과 같은 함수)
  P.y = groundY(P);
}

/** 한 프레임 진행. dt는 초 단위(0.05 이하로 자른다) */
export function stepGame(g: Game, rawDt: number, f: FrameInput) {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  if (g.caught || g.phase === "complete") {
    stepLines(g);
    g.time += dt;
    return g;
  }
  g.time += dt;
  g.phaseT += dt;
  g.san.moving = false;
  stepPlayer(g, dt, f);
  g.target = currentTarget(g);
  stepStory(g, dt, g.panel ? false : f.hold);
  if (g.breaker.doorState === "opening") {
    g.breaker.door = Math.min(1, g.breaker.door + dt / 1.4);
    if (g.breaker.door >= 1) g.breaker.doorState = "open";
  }
  if (g.breaker.done) g.breaker.light = Math.min(1, g.breaker.light + dt / 0.6);
  if (g.shutter.state === "opening") {
    g.shutter.t += dt;
    g.shutter.open = Math.min(1, g.shutter.t / 1.6);
    if (g.shutter.open >= 1) g.shutter.state = "open";
  }
  if (g.gate.opened) g.gate.open = Math.min(1, g.gate.open + dt / 1.8);
  if (g.phase !== "surge" && g.lampsOn > 0) g.lampsOn = 1;
  g.alarm = Math.max(0, g.alarm - dt * 0.35);
  stepLights(g, dt);
  stepSan(g, dt);
  stepDetection(g, dt);
  stepCallouts(g);
  stepLines(g);
  return g;
}

function stepDetection(g: Game, dt: number) {
  // 재가동 연출 중의 감시등은 이산을 겨눈다. 플레이어 탐지는 "뛰어!" 이후부터
  const watching = g.phase === "chase" || g.phase === "escape";
  if (!watching) {
    g.exposed = false;
    g.covered = false;
    g.trend = "idle";
    g.san.exposed = false;
    return;
  }
  const occ = solidBlocks(g);
  const P = g.player;
  const s = g.san;
  const inGrace = g.grace > 0;
  let rate = 0;
  let covered = false;
  let sanExposed = false;
  for (const l of g.lights) {
    if (!l.on) {
      l.seesPlayer = l.seesSan = 0;
      continue;
    }
    const pe = lightOn(l, P, P.y, CHEST_HEIGHT, occ);
    const se = s.visible ? lightOn(l, s, s.y, sanChest(g), occ) : { level: 0, blocked: false };
    l.seesPlayer = pe.level;
    l.seesSan = se.level;
    if (pe.blocked) covered = true;
    if (se.level > 0) sanExposed = true;
    // 플레이어: 노출 세기는 겹친 등 중 가장 강한 것 하나만
    if (pe.level > 0) rate = Math.max(rate, pe.level >= 1 ? RATE_CORE : RATE_EDGE);
    // 유예 시간에는 연속 노출도 쌓지 않는다 (끝나는 순간 바로 추적하지 않도록)
    if (inGrace) {
      l.seen = 0;
      l.seenSan = 0;
    } else {
      l.seen = pe.level > 0 ? l.seen + dt : Math.max(0, l.seen - SEEN_DECAY * dt);
      l.seenSan = se.level > 0 ? l.seenSan + dt : Math.max(0, l.seenSan - SEEN_DECAY * dt);
    }
    // 추적 대상 결정: 실제로 본 대상. 플레이어가 우선
    if (!inGrace && l.seen >= TRACK_AFTER && !(l.mode === "track" && l.target === "player")) {
      l.mode = "track";
      l.target = "player";
      l.lostFor = 0;
      g.events.push("lock");
    } else if (!inGrace && l.seenSan >= TRACK_AFTER && l.mode !== "track") {
      l.mode = "track";
      l.target = "san";
      l.lostFor = 0;
    }
    if (l.mode === "track") {
      const visible = l.target === "player" ? pe.level > 0 : se.level > 0;
      const tp = targetPos(g, l);
      if (visible && tp) {
        l.lostFor = 0;
        l.lastSeen = { x: tp.x, z: tp.z };
      } else {
        l.lostFor += dt;
        if (!l.lastSeen && tp) l.lastSeen = { x: tp.x, z: tp.z };
        if (l.lostFor > LOSE_AFTER) {
          // 시야가 끊겼다: 마지막으로 본 자리를 잠깐 훑고 순찰로 돌아간다
          l.mode = "search";
          l.searchT = 0;
        }
      }
    }
    l.tracking = l.mode === "track";
  }
  s.exposed = sanExposed;
  const exposedNow = rate > 0;
  // 반경 안이지만 가려진 경우만 "엄폐 중"
  g.covered = covered && !exposedNow;
  if (inGrace) {
    g.grace -= dt;
    g.exposed = false;
    g.meter = Math.max(0, g.meter - DECAY_COVERED * dt);
    g.trend = g.meter > 0 ? "down" : "idle";
    return;
  }
  const wasExposed = g.exposed;
  g.exposed = exposedNow;
  if (exposedNow) {
    if (!wasExposed) g.events.push("spotted");
    g.meter = Math.min(1, g.meter + rate * dt);
    g.trend = "up";
  } else {
    // 이산의 노출은 플레이어 게이지에 더하지 않는다
    g.meter = Math.max(0, g.meter - (g.covered ? DECAY_COVERED : DECAY_OPEN) * dt);
    g.trend = g.meter > 0 ? "down" : "idle";
  }
  if (g.meter >= 1) {
    g.caught = true;
    g.caughtAt = { x: P.x, z: P.z };
    g.events.push("caught");
    clearLines(g);
  }
}

/** 체크포인트에서 재시도. 진행(복구·차단문)은 유지하고, 대사는 반복하지 않는다 */
export function retryFromCheckpoint(g: Game): Game {
  const cp = CHECKPOINTS[g.checkpoint];
  g.retries++;
  g.caught = false;
  g.meter = 0;
  g.trend = "idle";
  g.exposed = false;
  g.covered = false;
  g.grace = GRACE;
  clearLines(g);
  g.call = { waitAt: -99, waiting: false, ahead: null, hideAt: -99, goAt: -99 };
  g.gate.danger = null;
  g.player = { ...cp, y: 0, yaw: g.checkpoint === "gate" ? Math.atan2(cp.x, cp.z - STAIR_TOP_Z) : 0, pitch: 0, speed: 0, vx: 0, vz: 0 };
  g.lights = makeLights();
  for (const l of g.lights) l.on = l.def.from === "chase" || g.checkpoint === "gate";
  const s = g.san;
  if (g.checkpoint === "gate") {
    g.phase = "escape";
    startSanEscape(g);
    // 문 바로 너머 첫 지점에서 다시 시작한다
    s.x = SAN_ESCAPE_ROUTE[0].x;
    s.z = SAN_ESCAPE_ROUTE[0].z;
    s.idx = 1;
  } else {
    g.phase = "chase";
    g.gate.hold = 0;
    startSanChase(g);
    s.x = SAN_CHASE_START.x;
    s.z = SAN_CHASE_START.z;
  }
  s.y = groundY(s);
  s.exposed = false;
  g.phaseT = 0;
  s.lagFor = 0;
  // 재시도는 첫 만남 이후의 체크포인트에서만 일어난다. 이산은 이미 동행 중이다
  s.visible = true;
  s.state = "run";
  const at = g.caughtAt;
  // 실패를 기억하는 듯한 대사는 단 한 번만
  if (!g.memoryLineUsed && at) {
    g.memoryLineUsed = true;
    if (g.checkpoint === "chase") {
      const was = at.x < 0 ? "왼쪽" : "오른쪽";
      const other = at.x < 0 ? "오른쪽" : "왼쪽";
      say(g, "san", `이번에는 ${other}으로 가 보자. 아까는 ${was}에서 막혔잖아.`, 3.6, 0.7);
    } else {
      say(g, "san", "이번엔 불빛이 지나간 다음에 가자. 아까는 너무 빨랐어.", 3.6, 0.7);
    }
  }
  return g;
}

/* ---------- HUD용 요약 ---------- */

export type Snapshot = {
  phase: Phase;
  objective: string;
  line: { who: Speaker; text: string } | null;
  meter: number;
  trend: Game["trend"];
  exposed: boolean;
  covered: boolean;
  /** 감시등 하나가 플레이어를 추적 중 */
  tracked: boolean;
  watching: boolean;
  target: Interact | null;
  /** 행동 버튼에 쓸 문구 */
  action: string | null;
  /** 열려 있는 조사 패널 */
  panel: UnderPanel | null;
  hold: number;
  gate: number;
  alarm: boolean;
  caught: boolean;
  retries: number;
};

export function objectiveOf(g: Game): string {
  switch (g.phase) {
    case "intro":
      return "통로 문에 전원이 없다 · 가까운 전원 장치 복구";
    case "meet":
      return "통로 B-2 전원 복구됨";
    case "approach":
      return g.shutter.state === "closed" ? "골목 안쪽 셔터로" : "셔터가 열리고 있다";
    case "relay":
      return "7구역 구역 전원 복구 · 큰길 차단문 전원 (교차로 서쪽 벽)";
    case "surge":
      return "……";
    case "chase":
      return g.gate.hold > 0 ? `차단문 해제 ${Math.floor((g.gate.hold / GATE_HOLD) * 100)}% · 감시등을 피해 제어판 조작` : "감시등을 피해 차단문 제어판으로";
    case "escape":
      return "지하철 입구 계단으로";
    case "under":
      return underObjective(g);
    case "complete":
      return "ACT 4 끝 · 현재 구현 구간 끝";
  }
}

export function snapshot(g: Game): Snapshot {
  return {
    phase: g.phase,
    objective: objectiveOf(g),
    line: g.line ? { who: g.line.who, text: g.line.text } : null,
    meter: Math.round(g.meter * 50) / 50,
    trend: g.trend,
    exposed: g.exposed,
    covered: g.covered,
    tracked: g.lights.some((l) => l.on && l.mode === "track" && l.target === "player"),
    watching: g.phase === "chase" || g.phase === "escape",
    target: g.target,
    action: actionLabelOf(g),
    panel: g.panel,
    hold: Math.round(holdProgress(g) * 40) / 40,
    gate: Math.round((g.gate.hold / GATE_HOLD) * 40) / 40,
    alarm: g.alarm > 0.05,
    caught: g.caught,
    retries: g.retries,
  };
}

export function sameSnapshot(a: Snapshot, b: Snapshot) {
  return (
    a.phase === b.phase && a.objective === b.objective && a.line?.text === b.line?.text && a.line?.who === b.line?.who &&
    a.meter === b.meter && a.action === b.action && a.panel === b.panel &&
    a.trend === b.trend && a.exposed === b.exposed && a.covered === b.covered && a.tracked === b.tracked &&
    a.watching === b.watching && a.target === b.target && a.hold === b.hold && a.gate === b.gate && a.alarm === b.alarm &&
    a.caught === b.caught && a.retries === b.retries
  );
}

/** 목표 표시(3D 비컨) 위치 */
export function beaconOf(g: Game): V2 | null {
  switch (g.phase) {
    case "intro":
      return BREAKER;
    case "approach":
      return g.shutter.state === "closed" ? null : { x: 0, z: SHUTTER_Z };
    case "relay":
      return RELAY;
    case "chase":
      return GATE_PANEL;
    case "escape":
      return { x: 0, z: STAIR_TOP_Z };
    case "under":
      return underBeacon(g);
    default:
      return null;
  }
}
