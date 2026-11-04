"use client";
// DELETE SEOUL 프로토타입 (/deleteseoul-lab/chase)
// 도입(혼자, 첫 번째 장치) → 이산과의 첫 만남 → 셔터 협력 → 두 번째 장치와 감시 재가동 → 추격 → 지하철 입구.
// 지하철 계단 도착은 이야기의 결말이 아니라 현재 구현 구간의 끝이다.
//
// 구조
// - logic.ts : 게임 규칙과 상태(순수 TS). 매 프레임 stepGame() 한 번.
// - input.ts : 이 실험판 전용 입력(키보드·마우스·터치). 공개 게임 입력과 분리.
// - Scene.tsx: 3D 장면. gameRef만 읽는다.
// - 이 파일 : 화면 상태(intro/play/pause/caught/complete), HUD, 효과음 연결.
// React 상태는 HUD 요약(snapshot)이 바뀔 때만, 최대 초당 10번 갱신한다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { sfx, tension } from "../../sfx";
import { ChaseInput, isCoarsePointer } from "./input";
import { EYE_HEIGHT } from "./level";
import { newGame, retryFromCheckpoint, sameSnapshot, snapshot, stepGame, type Game, type GameEvent, type Snapshot } from "./logic";
import { ChaseScene, type ChaseQuality } from "./Scene";
import styles from "./chase.module.css";

type Screen = "intro" | "play" | "pause" | "caught" | "complete";
const QUALITY_KEY = "sanlee-chase-quality-v1";

const ACTION_LABEL: Record<string, string> = { breaker: "통로 전원 복구", relay: "구역 전원 복구", gate: "차단문 해제" };

function initialQuality(touch: boolean): ChaseQuality {
  if (typeof window === "undefined") return "low";
  const q = new URLSearchParams(location.search).get("q");
  if (q === "low" || q === "high") return q;
  try {
    const s = localStorage.getItem(QUALITY_KEY);
    if (s === "low" || s === "high") return s;
  } catch {}
  // 모바일은 낮은 설정이 기본. PC(M1 포함)는 후처리가 없으므로 높은 설정으로 시작하고, 프레임이 떨어지면 내린다
  return touch ? "low" : "high";
}

function playEvent(e: GameEvent) {
  switch (e) {
    case "power": return sfx.open();
    case "door": return sfx.door();
    case "warn": return sfx.suspect();
    case "restore": return sfx.restore();
    case "beam": return sfx.beam();
    case "alarm": return sfx.lock();
    case "spotted": return sfx.watch();
    case "lock": return sfx.lock();
    case "caught": return sfx.denied();
    case "gate-tick": return sfx.blip();
    case "gate-open": return sfx.door();
    case "complete": return sfx.chime();
  }
}

/** Canvas 안에서 게임을 진행하는 유일한 루프 */
function Sim({
  gameRef, input, playing, onEvents, onSnapshot, onLowFps, debugRef,
}: {
  gameRef: React.RefObject<Game>;
  input: ChaseInput;
  playing: React.RefObject<boolean>;
  onEvents: (e: GameEvent[]) => void;
  onSnapshot: (s: Snapshot) => void;
  onLowFps: () => void;
  debugRef: React.RefObject<HTMLPreElement | null>;
}) {
  const camera = useThree((s) => s.camera);
  const acc = useRef({ hud: 0, dbg: 0, frames: 0, fpsT: 0, fps: 60, slow: 0 });
  const last = useRef<Snapshot | null>(null);
  useFrame((_, dt) => {
    const g = gameRef.current;
    const a = acc.current;
    if (playing.current) {
      stepGame(g, dt, { move: input.moveVector(), look: input.consumeLook(), hold: input.hold });
      if (g.events.length) {
        onEvents(g.events);
        g.events = [];
      }
      tension(g.phase === "chase" || g.phase === "escape" ? g.meter : 0);
    }
    const P = g.player;
    const bob = playing.current && P.speed > 0.5 ? Math.sin(g.time * (P.speed > 5 ? 13 : 9)) * 0.035 : 0;
    camera.position.set(P.x, EYE_HEIGHT + P.y + bob, P.z);
    camera.rotation.set(P.pitch, P.yaw, 0, "YXZ");
    // FPS 측정과 자동 품질 하향 (높은 설정에서 5초 연속 40fps 미만)
    a.frames++;
    a.fpsT += dt;
    if (a.fpsT >= 1) {
      a.fps = a.frames / a.fpsT;
      a.frames = 0;
      a.fpsT = 0;
      if (playing.current && a.fps < 40) {
        if (++a.slow >= 5) {
          a.slow = 0;
          onLowFps();
        }
      } else a.slow = 0;
    }
    a.hud += dt;
    if (a.hud > 0.1) {
      a.hud = 0;
      const s = snapshot(g);
      if (!last.current || !sameSnapshot(last.current, s)) {
        last.current = s;
        onSnapshot(s);
      }
    }
    a.dbg += dt;
    if (debugRef.current && a.dbg > 0.2) {
      a.dbg = 0;
      const d = input.debug();
      debugRef.current.textContent = [
        `fps ${a.fps.toFixed(0)}  playing ${playing.current}`,
        `input.enabled ${d.enabled}  mode ${d.mode}  locked ${d.locked}`,
        `joy ${d.joy.active ? "ON " : "off"} x ${d.joy.x.toFixed(2)} y ${d.joy.y.toFixed(2)}`,
        `look pointers ${d.lookPointers}  hold ${d.hold}  keys [${d.keys}]`,
        `player x ${P.x.toFixed(2)} z ${P.z.toFixed(2)} y ${P.y.toFixed(2)} yaw ${P.yaw.toFixed(2)} v ${P.speed.toFixed(1)}`,
        `phase ${g.phase} t ${g.phaseT.toFixed(1)}  meter ${g.meter.toFixed(2)} ${g.trend} exp ${g.exposed} cov ${g.covered}`,
        `lights ${g.lights.filter((l) => l.on).map((l) => `${l.def.id}:${l.mode}${l.target ? "/" + l.target : ""} seen ${l.seen.toFixed(1)}`).join("  ")}`,
        `san x ${g.san.x.toFixed(1)} z ${g.san.z.toFixed(1)} idx ${g.san.idx} ${g.san.mode} exp ${g.san.exposed}  cp ${g.checkpoint} retries ${g.retries}`,
      ].join("\n");
    }
  });
  return null;
}

export default function ChaseGame() {
  const root = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const joyBase = useRef<HTMLDivElement>(null);
  const joyKnob = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLPreElement>(null);
  const input = useMemo(() => new ChaseInput(), []);
  const gameRef = useRef<Game>(null as unknown as Game);
  if (!gameRef.current) gameRef.current = newGame();
  const playing = useRef(false);
  const [screen, setScreenState] = useState<Screen>("intro");
  const screenRef = useRef<Screen>("intro");
  const [snap, setSnap] = useState<Snapshot>(() => snapshot(gameRef.current));
  const [touch, setTouch] = useState(false);
  const [quality, setQualityState] = useState<ChaseQuality>("low");
  const [ready, setReady] = useState(false);
  const [debug, setDebug] = useState(false);
  const [flash, setFlash] = useState(0);

  const setScreen = useCallback(
    (s: Screen) => {
      screenRef.current = s;
      playing.current = s === "play";
      input.setEnabled(s === "play");
      if (s !== "play") tension(0);
      setScreenState(s);
    },
    [input]
  );

  useEffect(() => {
    const t = isCoarsePointer();
    setTouch(t);
    setQualityState(initialQuality(t));
    const dbg = new URLSearchParams(location.search).has("debug");
    setDebug(dbg);
    setReady(true);
    // ?debug 에서만 자동화 테스트용 핸들을 연다
    if (dbg) (window as unknown as { __chase?: unknown }).__chase = { gameRef, input };
    return () => {
      if (dbg) delete (window as unknown as { __chase?: unknown }).__chase;
    };
  }, [input]);

  // 입력은 한 번만 등록하고 언마운트 때 전부 해제한다
  useEffect(() => {
    const s = surface.current, r = root.current;
    if (!s || !r) return;
    const detach = input.attach(s, r, {
      // 마우스 잠금이 풀리면(Esc) 일시정지. 터치 기기는 잠그지 않으므로 해당 없음
      onLockLost: () => {
        if (screenRef.current === "play" && input.debug().mode === "mouse") setScreen("pause");
      },
      onPause: () => {
        if (screenRef.current === "play") setScreen("pause");
      },
    });
    return () => {
      detach();
      playing.current = false;
      tension(0);
    };
  }, [input, setScreen]);

  useEffect(() => {
    if (!joyBase.current || !joyKnob.current) return;
    input.bindJoystickVisual({ base: joyBase.current, knob: joyKnob.current });
    return () => input.bindJoystickVisual(null);
  }, [input, touch, screen]);

  const setQuality = useCallback((q: ChaseQuality) => {
    setQualityState(q);
    try { localStorage.setItem(QUALITY_KEY, q); } catch {}
  }, []);

  const onEvents = useCallback(
    (events: GameEvent[]) => {
      for (const e of events) {
        playEvent(e);
        if (e === "beam" || e === "alarm") setFlash((v) => v + 1);
        if (e === "caught") setScreen("caught");
        if (e === "complete") setScreen("complete");
      }
    },
    [setScreen]
  );
  const onLowFps = useCallback(() => setQualityState((q) => (q === "high" ? "low" : q)), []);

  const play = useCallback(
    (fromMouse: boolean) => {
      setScreen("play");
      // 포인터 잠금은 마우스 클릭에서만 요청한다 (터치 기기에서 잠그면 조이스틱이 멈춘다)
      if (fromMouse && !touch) input.requestLock();
    },
    [input, setScreen, touch]
  );
  const startClick = (e: React.PointerEvent | React.MouseEvent) => {
    const pt = (e.nativeEvent as PointerEvent).pointerType;
    play(pt === "mouse" || (pt === undefined && !touch));
  };
  const retry = (e: React.MouseEvent) => {
    retryFromCheckpoint(gameRef.current);
    startClick(e);
  };
  const restart = () => {
    gameRef.current = newGame();
    setSnap(snapshot(gameRef.current));
    setScreen("intro");
  };

  const showAction = touch && screen === "play" && snap.target;
  // 행동 대상이 사라지면(작동 완료·범위 이탈) 누름 상태를 바로 푼다. 다음 대상이 저절로 작동하지 않도록
  useEffect(() => {
    if (!showAction) input.setTouchHold(false);
  }, [showAction, input]);
  const meterPct = Math.round(snap.meter * 100);
  // 게이지 = 감시망이 내 위치를 얼마나 확정했는가. 오르는 중(노출)과 내려가는 중(가려짐·시야 밖)을 구분해 보여 준다
  const watchLabel =
    snap.tracked ? (snap.exposed ? "추적 중 · 위치 확인 ▲" : "추적 중 · 시야 밖 ▼")
    : snap.exposed ? "노출됨 · 위치 확인 ▲"
    : snap.covered ? (snap.meter > 0 ? "엄폐 중 · 흐려지는 중 ▼" : "엄폐 중")
    : snap.meter > 0 ? "시야 밖 · 흐려지는 중 ▼"
    : "탐색 중";
  const watchClass = snap.exposed ? styles.watchHot : snap.tracked ? styles.watchTrack : snap.covered ? styles.watchCover : "";
  const meterClass = snap.trend === "up" ? styles.meterUp : snap.trend === "down" ? styles.meterDown : "";

  return (
    <main ref={root} className={`${styles.root} ${snap.exposed && screen === "play" ? styles.exposed : ""}`} style={{ ["--meter" as string]: snap.meter }}>
      <div ref={surface} className={styles.surface}>
        {ready && (
          <Canvas
            key={quality}
            className={styles.canvas}
            dpr={quality === "high" ? [1, 1.5] : [1, 1]}
            gl={{ antialias: quality === "high", powerPreference: "high-performance", stencil: false }}
            camera={{ fov: touch ? 72 : 68, near: 0.1, far: 140 }}
            frameloop={screen === "play" || screen === "intro" ? "always" : "demand"}
          >
            <Sim gameRef={gameRef} input={input} playing={playing} onEvents={onEvents} onSnapshot={setSnap} onLowFps={onLowFps} debugRef={debugRef} />
            <ChaseScene gameRef={gameRef} quality={quality} />
          </Canvas>
        )}
      </div>

      {flash > 0 && <div key={flash} className={styles.glitch} aria-hidden />}
      <div className={styles.vignette} aria-hidden />

      <header className={styles.header}>
        <span className={styles.build}>SAN LEE / DEVELOPMENT BUILD · 2026</span>
        <button type="button" className={styles.pauseBtn} disabled={screen !== "play"} onClick={() => setScreen("pause")} aria-label="일시정지">
          Ⅱ
        </button>
      </header>

      {screen !== "intro" && (
        <section className={styles.objective}>
          <small>OBJECTIVE</small>
          <div>{snap.objective}</div>
          {snap.phase === "chase" && snap.gate > 0 && (
            <div className={styles.bar}><i style={{ width: `${snap.gate * 100}%` }} /></div>
          )}
        </section>
      )}

      {screen === "play" && snap.watching && (
        <section className={`${styles.watch} ${watchClass}`} aria-live="polite">
          <span>大慈悲 감시 · {watchLabel}</span>
          <div className={`${styles.meter} ${meterClass}`}><i style={{ width: `${meterPct}%` }} /></div>
        </section>
      )}

      {snap.line && screen !== "intro" && (
        <div className={`${styles.subtitle} ${snap.line.who === "system" ? styles.system : ""}`}>
          {snap.line.who === "san" && <b>이산</b>}
          <span>{snap.line.text}</span>
        </div>
      )}

      {screen === "play" && !touch && snap.target && (
        <div className={styles.prompt}>
          <Ring value={snap.hold} />
          <span><kbd>E</kbd> 길게 누르기 · {ACTION_LABEL[snap.target]}</span>
        </div>
      )}
      {screen === "play" && <div className={styles.cross} aria-hidden />}

      {/* 터치 조작: 왼쪽 아무 곳이나 눌러 이동, 오른쪽은 끌어서 시점. 행동 버튼은 누르고 있는 동안만 작동 */}
      {touch && (
        <div className={styles.joyLayer} hidden={screen !== "play"} aria-hidden>
          <div ref={joyBase} className={styles.joyBase}>
            <div ref={joyKnob} className={styles.joyKnob} />
          </div>
          {snap.phase === "intro" && <span className={styles.lookHint}>오른쪽을 끌어 둘러보기</span>}
        </div>
      )}
      {showAction && (
        <button
          type="button"
          className={styles.action}
          onPointerDown={(e) => {
            e.preventDefault();
            input.setTouchHold(true, e.pointerId);
          }}
          onPointerUp={() => input.setTouchHold(false)}
          onPointerCancel={() => input.setTouchHold(false)}
          onPointerLeave={() => input.setTouchHold(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Ring value={snap.hold} />
          <span>{ACTION_LABEL[snap.target!]}</span>
          <small>누르고 있기</small>
        </button>
      )}

      {debug && <pre ref={debugRef} className={styles.debug} />}

      {screen !== "play" && (
        <div className={styles.overlay}>
          <div className={`${styles.panel} ${screen === "complete" ? styles.late : ""}`} role="dialog" aria-modal="true">
            <small>SAN LEE / DEVELOPMENT BUILD · 2026 · PROTOTYPE</small>
            {screen === "intro" && (
              <>
                <h1>DELETE SEOUL</h1>
                <p>2087년 서울. 정전된 골목의 막힌 통로에서 접속이 시작됩니다.</p>
                <ul className={styles.controls}>
                  {touch ? (
                    <>
                      <li>화면 왼쪽을 누르고 끌기: 이동 (끝까지 밀면 달리기)</li>
                      <li>화면 오른쪽을 끌기: 둘러보기</li>
                      <li>행동 버튼: 누르고 있기</li>
                    </>
                  ) : (
                    <>
                      <li>WASD 이동 · Shift 달리기 · 마우스 시점</li>
                      <li>E 길게 누르기: 상호작용 · Esc 일시정지</li>
                    </>
                  )}
                </ul>
                <QualityPicker value={quality} onChange={setQuality} />
                <div className={styles.buttons}>
                  <button type="button" onClick={startClick}>접속</button>
                </div>
              </>
            )}
            {screen === "pause" && (
              <>
                <h2>일시정지</h2>
                <p>대자비의 감시도, 이산의 시간도 멈췄습니다.</p>
                <QualityPicker value={quality} onChange={setQuality} />
                <div className={styles.buttons}>
                  <button type="button" onClick={startClick}>계속하기</button>
                  <button type="button" onClick={restart}>처음부터</button>
                </div>
              </>
            )}
            {screen === "caught" && (
              <>
                <h2>위치 확인됨</h2>
                <p>{gameRef.current.checkpoint === "gate" ? "차단문은 열린 채로 남아 있습니다." : "복구한 전력은 그대로 남아 있습니다."}</p>
                <div className={styles.buttons}>
                  <button type="button" onClick={retry} autoFocus>체크포인트에서 다시</button>
                  <button type="button" onClick={restart}>처음부터</button>
                </div>
              </>
            )}
            {screen === "complete" && (
              <>
                <h2>현재 구현 구간 끝</h2>
                <p>계단 아래, 감시등이 닿지 않는 곳까지 왔습니다. 이산이 숨을 고릅니다.</p>
                <p className={styles.dim}>이야기의 결말이 아닙니다. 지하 기록실과 그 이후는 아직 만들지 않은 구간입니다.</p>
                <p className={styles.dim}>재시도 {snap.retries}회</p>
                <div className={styles.buttons}>
                  <button type="button" onClick={restart}>처음부터 다시</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Ring({ value }: { value: number }) {
  const c = 2 * Math.PI * 15;
  return (
    <svg className={styles.ring} viewBox="0 0 36 36" aria-hidden>
      <circle cx="18" cy="18" r="15" className={styles.ringBg} />
      <circle cx="18" cy="18" r="15" className={styles.ringFg} strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} />
    </svg>
  );
}

function QualityPicker({ value, onChange }: { value: ChaseQuality; onChange: (q: ChaseQuality) => void }) {
  return (
    <div className={styles.quality} role="radiogroup" aria-label="그래픽 품질">
      <span>그래픽</span>
      {(["low", "high"] as const).map((q) => (
        <button key={q} type="button" role="radio" aria-checked={value === q} className={value === q ? styles.on : ""} onClick={() => onChange(q)}>
          {q === "low" ? "가볍게" : "선명하게"}
        </button>
      ))}
    </div>
  );
}
