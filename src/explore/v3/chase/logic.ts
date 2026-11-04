// 추격 구간의 게임 상태와 규칙. three·React에 의존하지 않는 순수 TS라 노드 테스트로 검증한다.
// 렌더러는 매 프레임 stepGame()을 한 번 부르고, 그 결과(상태 객체)를 읽어 장면을 갱신한다.
// 모든 시간(대사, 연출, 감시등)은 이 시뮬레이션 시간으로 흘러서 일시정지하면 함께 멈춘다.

import {
  BREAKER, BREAKER_HOLD, BREAKER_RANGE, BUILDINGS, CHECKPOINTS, CHEST_HEIGHT, COVERS, EXIT_Z, GATE_BLOCK, GATE_HOLD,
  GATE_PANEL, GATE_RANGE, LIGHTS, MAX_Z, PASSAGE_DOOR_BLOCK, PASSAGE_DOOR_Z, PLAYER_RADIUS, RELAY, RELAY_HOLD,
  RELAY_RANGE, RELAY_WARN_AT, SAN_ESCAPE_ROUTE, SAN_JUNCTION, SAN_RELAY_SPOT, SAN_ROUTE, SAN_START, SHUTTER_BLOCK,
  SHUTTER_PANEL, SHUTTER_Z, STAIR_BOTTOM_Z, STAIR_DROP, STAIR_TOP_Z, START,
  type Block, type LightDef, type V2,
} from "./level";

// intro: 혼자, 정전된 통로 B-2 · meet: 국소 전원 복구 직후 이산과 첫 만남 · approach: 셔터 협력
// relay: 구역 전원(두 번째 장치) · surge: 감시 재가동 · chase/escape: 추격 · complete: 현재 구현 구간의 끝(이야기의 결말 아님)
export type Phase = "intro" | "meet" | "approach" | "relay" | "surge" | "chase" | "escape" | "complete";
export type Speaker = "san" | "system";
export type Interact = "breaker" | "relay" | "gate";
export type FrameInput = { move: { x: number; y: number; run: boolean }; look: { yaw: number; pitch: number }; hold: boolean };
export type GameEvent =
  | "door" | "warn" | "restore" | "beam" | "alarm" | "spotted" | "caught" | "gate-tick" | "gate-open" | "complete" | "san-call" | "power";

export type LightState = { def: LightDef; on: boolean; x: number; z: number; seg: number; tracking: boolean; lostFor: number; seen: number };

export type Game = {
  phase: Phase;
  phaseT: number;
  time: number;
  player: { x: number; z: number; y: number; yaw: number; pitch: number; speed: number };
  san: {
    x: number; z: number; yaw: number; idx: number; moving: boolean; lagFor: number; callAt: number; warnAt: number;
    /** 첫 만남 전에는 보이지도, 움직이지도, 말하지도 않는다. Scene이 매 프레임 이 값을 읽어 표시한다 */
    visible: boolean;
    pose: "hide" | "stand" | "duck";
    state: "hidden" | "met" | "lead" | "panel" | "wait" | "watch" | "run";
  };
  /** 첫 번째 장치(국소 전원)와 그 전원으로 움직이는 통로 문 */
  breaker: { hold: number; done: boolean; door: number; doorState: "closed" | "opening" | "open"; light: number };
  shutter: { open: number; state: "closed" | "opening" | "open"; t: number };
  relay: { hold: number; warned: boolean; releasedFor: number; hesitated: boolean; done: boolean; sanNear: boolean; toldGate: boolean };
  /** 감시 재가동 연출: 거대 감시등이 이산을 훑은 시각 */
  surge: { sanHitAt: number };
  gate: { hold: number; open: number; opened: boolean; lastTick: number; calledNow: number; calledHide: number };
  lights: LightState[];
  lampsOn: number;
  alarm: number;
  meter: number;
  exposed: boolean;
  covered: boolean;
  caught: boolean;
  grace: number;
  checkpoint: keyof typeof CHECKPOINTS;
  retries: number;
  caughtAt: V2 | null;
  memoryLineUsed: boolean;
  target: Interact | null;
  queue: { at: number; who: Speaker; text: string; dur: number }[];
  line: { who: Speaker; text: string; until: number } | null;
  events: GameEvent[];
};

const WALK = 3.7;
const RUN = 6.3;
const SAN_WALK = 2.9;
const SAN_RUN = 5.6;
const DETECT_RATE = 0.9; // 노출 1초당 탐지 증가 (중심부 기준)
const DECAY = 0.26;
const DECAY_COVERED = 0.5;
const GRACE = 1.6;

export const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z);

function makeLights(): LightState[] {
  return LIGHTS.map((def) => ({ def, on: false, x: def.path[0].x, z: def.path[0].z, seg: 1 % def.path.length, tracking: false, lostFor: 0, seen: 0 }));
}

export function newGame(): Game {
  const g: Game = {
    phase: "intro",
    phaseT: 0,
    time: 0,
    player: { ...START, y: 0, yaw: 0, pitch: 0, speed: 0 },
    san: { ...SAN_START, yaw: 0, idx: 0, moving: false, lagFor: 0, callAt: -99, warnAt: -99, visible: false, pose: "hide", state: "hidden" },
    breaker: { hold: 0, done: false, door: 0, doorState: "closed", light: 0 },
    shutter: { open: 0, state: "closed", t: 0 },
    relay: { hold: 0, warned: false, releasedFor: 0, hesitated: false, done: false, sanNear: false, toldGate: false },
    surge: { sanHitAt: -1 },
    gate: { hold: 0, open: 0, opened: false, lastTick: 0, calledNow: -99, calledHide: -99 },
    lights: makeLights(),
    lampsOn: 0,
    alarm: 0,
    meter: 0,
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

export function say(g: Game, who: Speaker, text: string, dur = 2.6, delay = 0) {
  g.queue.push({ at: g.time + delay, who, text, dur });
}

function setPhase(g: Game, p: Phase) {
  g.phase = p;
  g.phaseT = 0;
}

/* ---------- 충돌 ---------- */

function solidBlocks(g: Game): Block[] {
  const list: Block[] = [...BUILDINGS, ...COVERS];
  if (g.breaker.door < 0.6) list.push(PASSAGE_DOOR_BLOCK);
  if (g.shutter.open < 0.6) list.push(SHUTTER_BLOCK);
  if (g.gate.open < 0.6) list.push(GATE_BLOCK);
  return list;
}

/** 원(플레이어)을 사각형들 밖으로 밀어낸다 */
export function resolveCircle(p: V2, blocks: Block[], r = PLAYER_RADIUS): V2 {
  const out = { x: Math.max(-9.6, Math.min(9.6, p.x)), z: Math.max(-59.5, Math.min(MAX_Z, p.z)) };
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

/** 광원 → 목표 선분이 사각기둥(엄폐물·건물)에 가려지는지. 3D 슬래브 판정 */
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

const OCCLUDERS: Block[] = [...COVERS, ...BUILDINGS];

export type Exposure = { exposed: boolean; covered: boolean; intensity: number; by: LightState | null };

export function exposureOf(lights: LightState[], p: { x: number; z: number; y: number }): Exposure {
  let best: Exposure = { exposed: false, covered: false, intensity: 0, by: null };
  // 계단 아래로 내려가면 감시등이 닿지 않는다
  if (p.y < -1.2) return best;
  for (const l of lights) {
    if (!l.on) continue;
    const d = Math.hypot(p.x - l.x, p.z - l.z);
    if (d > l.def.radius + 1.2) continue;
    const blocked = segmentBlocked(l.def.src, { x: p.x, y: CHEST_HEIGHT + p.y, z: p.z }, OCCLUDERS);
    if (blocked) {
      best.covered = true;
      continue;
    }
    if (d > l.def.radius) continue;
    const intensity = d < l.def.radius * 0.6 ? 1 : 0.55;
    if (intensity > best.intensity) best = { exposed: true, covered: best.covered, intensity, by: l };
  }
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

export function stepLights(g: Game, dt: number) {
  // 감시 재가동 연출 중의 거대 감시등은 stepStory가 직접 움직인다
  if (g.phase === "surge") return;
  for (const l of g.lights) {
    if (!l.on) continue;
    if (l.tracking) {
      // 발견한 대상을 쫓는다. 달리기(6.3m/s)보다 느려서 엄폐하거나 벗어날 수 있다
      moveToward(l, g.player, l.def.speed * 0.95 * dt);
      continue;
    }
    if (moveToward(l, l.def.path[l.seg], l.def.speed * dt)) l.seg = (l.seg + 1) % l.def.path.length;
  }
}

/* ---------- 이산 ---------- */

function spotNear(g: Game, p: V2, pad: number) {
  return g.lights.some((l) => l.on && Math.hypot(l.x - p.x, l.z - p.z) < l.def.radius + pad);
}

function stepSan(g: Game, dt: number) {
  const s = g.san;
  const P = g.player;
  // 첫 만남 전: 이산은 존재하지 않는 것처럼 아무것도 하지 않는다
  if (!s.visible) {
    s.moving = false;
    return;
  }
  let goal: V2 | null = null;
  let speed = SAN_WALK;
  if (g.phase === "meet") {
    goal = null;
  } else if (g.phase === "approach") {
    if (s.state === "panel") goal = SHUTTER_PANEL;
    else goal = null;
  } else if (g.phase === "relay") {
    goal = g.shutter.state !== "open" ? SHUTTER_PANEL : g.relay.sanNear ? SAN_RELAY_SPOT : SAN_JUNCTION;
  } else if (g.phase === "surge") {
    // 빛에 걸리기 전까지는 장치 옆으로 다가가고, 걸린 뒤에는 그 자리에 웅크린다
    goal = g.surge.sanHitAt < 0 ? SAN_RELAY_SPOT : null;
  } else if (g.phase === "chase") {
    speed = SAN_RUN;
    const route = SAN_ROUTE;
    goal = route[Math.min(s.idx, route.length - 1)];
    const atGoal = dist(s, goal) < 0.3;
    const pd = dist(P, s);
    if (atGoal && s.idx < route.length - 1) {
      const next = route[s.idx + 1];
      const playerClose = pd < 6.5 || P.z < s.z - 1;
      if (playerClose && !spotNear(g, next, 1.2) && !spotNear(g, s, -0.5)) s.idx++;
    }
    // 뒤처진 플레이어를 기다리며 부른다
    if (P.z > s.z + 7 && pd > 9) s.lagFor += dt;
    else s.lagFor = 0;
    if (s.lagFor > 3 && g.time - s.callAt > 13 && !g.line) {
      s.callAt = g.time;
      g.events.push("san-call");
      say(g, "san", g.retries > 0 ? "여기야. 천천히 와도 돼." : "이쪽이야. 빨리.", 2);
    }
  } else if (g.phase === "escape" || g.phase === "complete") {
    speed = SAN_RUN;
    goal = SAN_ESCAPE_ROUTE[Math.min(s.idx, SAN_ESCAPE_ROUTE.length - 1)];
    if (dist(s, goal) < 0.3 && s.idx < SAN_ESCAPE_ROUTE.length - 1 && (dist(P, s) < 7 || P.z < s.z)) s.idx++;
  }
  s.moving = false;
  if (goal) {
    const before = { x: s.x, z: s.z };
    moveToward(s, goal, speed * dt);
    const moved = dist(before, s);
    if (moved > 1e-4) {
      s.moving = true;
      s.yaw = Math.atan2(s.x - before.x, s.z - before.z);
    }
  }
  if (!s.moving) {
    // 멈춰 있을 때는 플레이어 쪽을 본다. 차단문 망보기 중엔 제어판, 장치 앞에선 감시 회로 케이블 쪽을 본다
    const look =
      g.phase === "chase" && g.gate.hold > 0 ? GATE_PANEL
      : (g.phase === "relay" && g.relay.sanNear) || g.phase === "surge" ? RELAY
      : P;
    s.yaw = Math.atan2(look.x - s.x, look.z - s.z);
  }
}

/* ---------- 상호작용 ---------- */

export function currentTarget(g: Game): Interact | null {
  if (g.caught) return null;
  if (g.phase === "intro" && !g.breaker.done && dist(g.player, BREAKER) < BREAKER_RANGE) return "breaker";
  if (g.phase === "relay" && !g.relay.done && dist(g.player, RELAY) < RELAY_RANGE) return "relay";
  if (g.phase === "chase" && !g.gate.opened && dist(g.player, GATE_PANEL) < GATE_RANGE) return "gate";
  return null;
}

export function holdProgress(g: Game) {
  if (g.target === "breaker") return g.breaker.hold / BREAKER_HOLD;
  if (g.target === "relay") return g.relay.hold / RELAY_HOLD;
  if (g.target === "gate") return g.gate.hold / GATE_HOLD;
  return 0;
}

/* ---------- 단계별 진행 ---------- */

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
          g.queue = [];
          g.line = null;
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
          g.queue = [];
          g.line = null;
          say(g, "san", "잠깐.", 0.9);
          say(g, "san", "그 선… 감시탑까지 이어져 있어.", 2.4, 0.9);
          g.events.push("warn");
        }
        if (r.hold >= RELAY_HOLD) {
          r.done = true;
          g.queue = [];
          g.line = null;
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
        // 감시등은 이산을 놓치고 원래 경로로 돌아간다 (추격 판정은 이후 플레이어 기준)
        L3.tracking = false;
        setPhase(g, "chase");
        g.checkpoint = "chase";
        s.idx = 0;
        s.state = "run";
        s.pose = "stand";
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
      // 이산의 망보기: 큰 감시등이 제어판에 다가오면 숨으라고, 멀어지면 지금이라고 알린다
      if (s.idx >= SAN_ROUTE.length - 1 && dist(P, GATE_PANEL) < 6) {
        const L3 = g.lights.find((l) => l.def.id === "L3")!;
        const d = dist(L3, GATE_PANEL);
        if (d < L3.def.radius + 4.5 && g.time - gt.calledHide > 6 && g.time - gt.calledNow > 1.5) {
          gt.calledHide = g.time;
          say(g, "san", "숨어! 불빛 온다.", 1.6);
        } else if (d > 10 && g.time - gt.calledNow > 7 && g.time - gt.calledHide > 1.5) {
          gt.calledNow = g.time;
          say(g, "san", "지금!", 1.2);
        }
      } else if (spotNear(g, P, 2.4) && !g.exposed && g.meter < 0.05 && g.time - s.warnAt > 10 && dist(P, s) < 14) {
        // 위험을 미리 알려 준다 (드물게)
        s.warnAt = g.time;
        say(g, "san", "멈춰. 불빛.", 1.4);
      }
      if (gt.hold >= GATE_HOLD) {
        gt.opened = true;
        g.events.push("gate-open");
        g.queue = [];
        g.line = null;
        say(g, "san", "열렸어! 계단으로!", 2);
        for (const l of g.lights) if (l.def.from === "escape") l.on = true;
        setPhase(g, "escape");
        g.checkpoint = "gate";
        s.idx = 0;
      }
      break;
    }
    case "escape": {
      if (P.z < EXIT_Z && Math.abs(P.x) < 2.6) {
        setPhase(g, "complete");
        g.events.push("complete");
        g.queue = [];
        g.line = null;
      }
      break;
    }
  }
}

function stepLines(g: Game) {
  if (g.line && g.time >= g.line.until) g.line = null;
  if (!g.queue.length) return;
  g.queue.sort((a, b) => a.at - b.at);
  if (g.queue[0].at <= g.time) {
    const next = g.queue.shift()!;
    g.line = { who: next.who, text: next.text, until: g.time + next.dur };
  }
}

function stepPlayer(g: Game, dt: number, f: FrameInput) {
  const P = g.player;
  P.yaw += f.look.yaw;
  P.pitch = Math.max(-1.15, Math.min(1.15, P.pitch + f.look.pitch));
  const m = f.move;
  const speed = (m.run ? RUN : WALK) * dt;
  const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
  const dx = (m.x * cos - m.y * sin) * speed;
  const dz = (-m.x * sin - m.y * cos) * speed;
  const before = { x: P.x, z: P.z };
  const next = resolveCircle({ x: P.x + dx, z: P.z + dz }, solidBlocks(g));
  P.x = next.x;
  P.z = next.z;
  P.speed = dt > 0 ? dist(before, P) / dt : 0;
  // 지하철 계단
  const inStair = Math.abs(P.x) < 2.6 && P.z < STAIR_TOP_Z;
  P.y = inStair ? -STAIR_DROP * Math.min(1, (STAIR_TOP_Z - P.z) / (STAIR_TOP_Z - STAIR_BOTTOM_Z)) : 0;
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
  stepPlayer(g, dt, f);
  g.target = currentTarget(g);
  stepStory(g, dt, f.hold);
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
  stepLines(g);
  return g;
}

function stepDetection(g: Game, dt: number) {
  // 재가동 연출 중의 감시등은 이산을 겨눈다. 플레이어 탐지는 "뛰어!" 이후부터
  const watching = g.phase === "chase" || g.phase === "escape";
  const e = exposureOf(g.lights, g.player);
  g.covered = e.covered && !e.exposed;
  const wasExposed = g.exposed;
  g.exposed = e.exposed && watching;
  for (const l of g.lights) {
    if (!watching) break;
    if (l === e.by && g.exposed) {
      l.seen += dt;
      l.lostFor = 0;
      // 0.35초 이상 머물면 감시등이 플레이어를 쫓기 시작한다 (재시작·추격 시작 직후의 유예 시간에는 쫓지 않는다)
      if (l.seen > 0.35 && g.grace <= 0) l.tracking = true;
    } else {
      l.seen = 0;
      l.lostFor += dt;
      if (l.tracking && l.lostFor > 1.1) l.tracking = false;
    }
  }
  if (g.grace > 0) {
    g.grace -= dt;
    g.meter = Math.max(0, g.meter - DECAY_COVERED * dt);
    return;
  }
  if (g.exposed && g.phase !== "surge") {
    if (!wasExposed) g.events.push("spotted");
    g.meter = Math.min(1, g.meter + DETECT_RATE * e.intensity * dt);
  } else {
    g.meter = Math.max(0, g.meter - (g.covered ? DECAY_COVERED : DECAY) * dt);
  }
  if (g.meter >= 1) {
    g.caught = true;
    g.caughtAt = { x: g.player.x, z: g.player.z };
    g.events.push("caught");
    g.queue = [];
    g.line = null;
  }
}

/** 체크포인트에서 재시도. 진행(복구·차단문)은 유지하고, 대사는 반복하지 않는다 */
export function retryFromCheckpoint(g: Game): Game {
  const cp = CHECKPOINTS[g.checkpoint];
  g.retries++;
  g.caught = false;
  g.meter = 0;
  g.exposed = false;
  g.covered = false;
  g.grace = GRACE;
  g.queue = [];
  g.line = null;
  g.player = { ...cp, y: 0, yaw: g.checkpoint === "gate" ? Math.atan2(cp.x, cp.z - STAIR_TOP_Z) : 0, pitch: 0, speed: 0 };
  g.lights = makeLights();
  for (const l of g.lights) l.on = l.def.from === "chase" || g.checkpoint === "gate";
  if (g.checkpoint === "gate") {
    g.phase = "escape";
    g.san.idx = 0;
    g.san.x = 2.4;
    g.san.z = -41.6;
  } else {
    g.phase = "chase";
    g.gate.hold = 0;
    g.san.idx = 0;
    g.san.x = SAN_ROUTE[0].x;
    g.san.z = SAN_ROUTE[0].z;
  }
  g.phaseT = 0;
  g.san.lagFor = 0;
  // 재시도는 첫 만남 이후의 체크포인트에서만 일어난다. 이산은 이미 동행 중이다
  g.san.visible = true;
  g.san.pose = "stand";
  g.san.state = "run";
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
  exposed: boolean;
  covered: boolean;
  watching: boolean;
  target: Interact | null;
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
    case "complete":
      return "지하 진입 · 현재 구현 구간 끝";
  }
}

export function snapshot(g: Game): Snapshot {
  return {
    phase: g.phase,
    objective: objectiveOf(g),
    line: g.line ? { who: g.line.who, text: g.line.text } : null,
    meter: Math.round(g.meter * 50) / 50,
    exposed: g.exposed,
    covered: g.covered,
    watching: g.phase === "chase" || g.phase === "escape",
    target: g.target,
    hold: Math.round(holdProgress(g) * 40) / 40,
    gate: Math.round((g.gate.hold / GATE_HOLD) * 40) / 40,
    alarm: g.alarm > 0.05,
    caught: g.caught,
    retries: g.retries,
  };
}

export function sameSnapshot(a: Snapshot, b: Snapshot) {
  return (
    a.phase === b.phase && a.objective === b.objective && a.line?.text === b.line?.text && a.meter === b.meter &&
    a.exposed === b.exposed && a.covered === b.covered && a.watching === b.watching && a.target === b.target &&
    a.hold === b.hold && a.gate === b.gate && a.alarm === b.alarm && a.caught === b.caught && a.retries === b.retries
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
    default:
      return null;
  }
}
