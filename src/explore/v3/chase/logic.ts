// 추격 구간의 게임 상태와 규칙. three·React에 의존하지 않는 순수 TS라 노드 테스트로 검증한다.
// 렌더러는 매 프레임 stepGame()을 한 번 부르고, 그 결과(상태 객체)를 읽어 장면을 갱신한다.
// 모든 시간(대사, 연출, 감시등)은 이 시뮬레이션 시간으로 흘러서 일시정지하면 함께 멈춘다.

import {
  BUILDINGS, CHECKPOINTS, CHEST_HEIGHT, COVERS, EXIT_Z, GATE_BLOCK, GATE_HOLD, GATE_PANEL, GATE_RANGE,
  LIGHTS, PLAYER_RADIUS, RELAY, RELAY_HOLD, RELAY_RANGE, RELAY_WARN_AT, SAN_ESCAPE_ROUTE, SAN_ROUTE, SAN_START,
  SHUTTER_BLOCK, SHUTTER_PANEL, SHUTTER_Z, STAIR_BOTTOM_Z, STAIR_DROP, STAIR_TOP_Z, START,
  type Block, type LightDef, type V2,
} from "./level";

export type Phase = "approach" | "relay" | "surge" | "chase" | "escape" | "complete";
export type Speaker = "san" | "system";
export type Interact = "relay" | "gate";
export type FrameInput = { move: { x: number; y: number; run: boolean }; look: { yaw: number; pitch: number }; hold: boolean };
export type GameEvent =
  | "door" | "warn" | "restore" | "beam" | "alarm" | "spotted" | "caught" | "gate-tick" | "gate-open" | "complete" | "san-call";

export type LightState = { def: LightDef; on: boolean; x: number; z: number; seg: number; tracking: boolean; lostFor: number; seen: number };

export type Game = {
  phase: Phase;
  phaseT: number;
  time: number;
  player: { x: number; z: number; y: number; yaw: number; pitch: number; speed: number };
  san: { x: number; z: number; yaw: number; idx: number; moving: boolean; lagFor: number; callAt: number; warnAt: number; state: "lead" | "panel" | "wait" | "watch" | "run" };
  shutter: { open: number; state: "closed" | "opening" | "open"; t: number };
  relay: { hold: number; warned: boolean; releasedFor: number; hesitated: boolean; done: boolean };
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
    phase: "approach",
    phaseT: 0,
    time: 0,
    player: { ...START, y: 0, yaw: 0, pitch: 0, speed: 0 },
    san: { ...SAN_START, yaw: 0, idx: 0, moving: false, lagFor: 0, callAt: -99, warnAt: -99, state: "lead" },
    shutter: { open: 0, state: "closed", t: 0 },
    relay: { hold: 0, warned: false, releasedFor: 0, hesitated: false, done: false },
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
  say(g, "san", "하나 더 남았어. 저 셔터 너머에.", 2.8, 0.8);
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
  if (g.shutter.open < 0.6) list.push(SHUTTER_BLOCK);
  if (g.gate.open < 0.6) list.push(GATE_BLOCK);
  return list;
}

/** 원(플레이어)을 사각형들 밖으로 밀어낸다 */
export function resolveCircle(p: V2, blocks: Block[], r = PLAYER_RADIUS): V2 {
  const out = { x: Math.max(-9.6, Math.min(9.6, p.x)), z: Math.max(-59.5, Math.min(30.6, p.z)) };
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
  let goal: V2 | null = null;
  let speed = SAN_WALK;
  if (g.phase === "approach") {
    if (s.state === "panel") goal = SHUTTER_PANEL;
    else goal = null;
  } else if (g.phase === "relay" || g.phase === "surge") {
    goal = g.shutter.state === "open" ? { x: -4.6, z: 3.6 } : SHUTTER_PANEL;
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
    // 멈춰 있을 때는 플레이어 쪽(추격 중엔 위협 쪽)을 본다
    const look = g.phase === "chase" && g.gate.hold > 0 ? GATE_PANEL : P;
    s.yaw = Math.atan2(look.x - s.x, look.z - s.z);
  }
}

/* ---------- 상호작용 ---------- */

export function currentTarget(g: Game): Interact | null {
  if (g.caught) return null;
  if (g.phase === "relay" && !g.relay.done && dist(g.player, RELAY) < RELAY_RANGE) return "relay";
  if (g.phase === "chase" && !g.gate.opened && dist(g.player, GATE_PANEL) < GATE_RANGE) return "gate";
  return null;
}

export function holdProgress(g: Game) {
  if (g.target === "relay") return g.relay.hold / RELAY_HOLD;
  if (g.target === "gate") return g.gate.hold / GATE_HOLD;
  return 0;
}

/* ---------- 단계별 진행 ---------- */

function stepStory(g: Game, dt: number, hold: boolean) {
  const P = g.player;
  const s = g.san;
  switch (g.phase) {
    case "approach": {
      // 이산이 셔터를 열어 주는 짧은 협력
      if (s.state === "lead" && (P.z < 25.5 || g.phaseT > 3.2)) {
        s.state = "panel";
        say(g, "san", "잠깐. 이건 내가 열 수 있어.", 2.2);
      }
      if (s.state === "panel" && dist(s, SHUTTER_PANEL) < 0.3 && g.shutter.state === "closed") {
        g.shutter.state = "opening";
        g.shutter.t = 0;
        g.events.push("door");
      }
      if (g.shutter.state === "opening" && g.shutter.t > 0.6 && g.shutter.t - dt <= 0.6) {
        say(g, "san", "너 혼자였으면 여기서 막혔을 거야.", 2.8, 0.4);
      }
      if (g.shutter.state === "open") setPhase(g, "relay");
      break;
    }
    case "relay": {
      const r = g.relay;
      if (g.target === "relay" && hold) {
        r.hold = Math.min(RELAY_HOLD, r.hold + dt);
        r.releasedFor = 0;
        if (!r.warned && r.hold >= RELAY_WARN_AT) {
          // 이산의 경고는 작동 '직전', 플레이어가 손을 대고 있는 순간에 나온다
          r.warned = true;
          g.queue = [];
          g.line = null;
          say(g, "san", "잠깐. 그건 건드리지 마.", 2.4);
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
            // 플레이어가 경고를 듣고 멈췄다
            r.hesitated = true;
            say(g, "san", "……고마워.", 1.8, 0.2);
            say(g, "san", "근데 그게 꺼져 있으면, 저 앞 문도 안 열려.", 3.2, 2.4);
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
      // 4.4~5.6초: 정적. 그 뒤 시선을 큰길 끝 감시탑 쪽으로 부드럽게 돌려 준다 (플레이어 입력은 계속 먹는다)
      if (t > 5.3 && t < 6.8) {
        const want = Math.atan2(P.x - 0, P.z + 59);
        const d = Math.atan2(Math.sin(want - P.yaw), Math.cos(want - P.yaw));
        P.yaw += d * Math.min(1, dt * 3.2);
        P.pitch += (0.05 - P.pitch) * Math.min(1, dt * 3);
      }
      if (at(5.6)) {
        g.lights.find((l) => l.def.id === "L3")!.on = true;
        g.alarm = 1;
        g.events.push("beam");
        say(g, "system", "[미등록 개체 감지]", 2.2);
      }
      if (at(7.1)) {
        say(g, "san", "뛰어!", 1.6);
        g.events.push("alarm");
        for (const l of g.lights) if (l.def.from === "chase") l.on = true;
        setPhase(g, "chase");
        g.checkpoint = "chase";
        s.idx = 0;
        s.state = "run";
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
  const watching = g.phase === "chase" || g.phase === "escape" || (g.phase === "surge" && g.phaseT > 5.6);
  const e = exposureOf(g.lights, g.player);
  g.covered = e.covered && !e.exposed;
  const wasExposed = g.exposed;
  g.exposed = e.exposed && watching;
  for (const l of g.lights) {
    if (l === e.by && g.exposed) {
      l.seen += dt;
      l.lostFor = 0;
      // 0.35초 이상 머물면 감시등이 플레이어를 쫓기 시작한다
      if (l.seen > 0.35) l.tracking = true;
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
    case "approach":
      return g.shutter.state === "closed" ? "이산을 따라 골목 안쪽으로" : "셔터가 열리고 있다";
    case "relay":
      return "두 번째 전력 장치 복구 (교차로 서쪽 벽)";
    case "surge":
      return "……";
    case "chase":
      return g.gate.hold > 0 ? `차단문 해제 ${Math.floor((g.gate.hold / GATE_HOLD) * 100)}% · 감시등을 피해 제어판 조작` : "감시등을 피해 차단문 제어판으로";
    case "escape":
      return "지하철 입구 계단으로";
    case "complete":
      return "지하 진입";
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
