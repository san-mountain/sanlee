"use client";

// 퍼즐 B 「봉인된 3초」의 2D 조작판: 기록 보관 장치의 봉인 격자를 가까이서 들여다본 화면.
// 봉인판을 손가락·마우스로 직접 끌어 민다. 판은 제 축으로만 움직이고, 다른 판이나 테두리에 닿으면 멈춘다.
// 놓으면 가장 가까운 칸에 맞춰지고, 실제로 칸이 바뀐 경우에만 이동 1회로 센다. 그냥 누른 것은 아무 일도 하지 않는다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/data/site";
import { CASSETTE, EXIT_ROW, LAYOUT, SIZE, slideRange, type Piece, type Positions } from "./sealPuzzle";
import { RECORD_TIME, ORIGINAL_RECORD } from "./recordAudit";
import { sealUi } from "./story";
import { sfx } from "./sfx";

type Drag = { id: string; pointer: number; start: number; at: number; min: number; max: number; off: number; cell: number; moved: boolean; bumped: number };

// 원본이 배출되고 판독되는 순서 (ms)
const EJECT_MS = 0;
const STOP_MS = 750;
const READ_MS = 1350;
const RESULT_MS = 2600;
// Give players time to read the *difference* between the original and the city's
// forcibly rewritten official record, without making them click "continue".
const DONE_MS = 7350;

export default function SealPanel({
  lang,
  pos,
  canUndo,
  solved,
  closing,
  onMove,
  onUndo,
  onReset,
  onExit,
  onRevealDone,
}: {
  lang: Lang;
  pos: Positions;
  canUndo: boolean;
  solved: boolean;
  closing: boolean;
  onMove: (id: string, to: number) => boolean;
  onUndo: () => void;
  onReset: () => void;
  onExit: () => void;
  onRevealDone: () => void;
}) {
  const ko = lang === "ko";
  const L = (l: { ko: string; en: string }) => (ko ? l.ko : l.en);
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [bump, setBump] = useState<{ id: string; dir: number } | null>(null);
  // 완료 연출 단계: 0 없음 → 1 배출 → 2 봉인 정지 → 3 판독 중 → 4 원본 vs 도시 공식 기록
  const [stage, setStage] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(onRevealDone);
  doneRef.current = onRevealDone;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // 카세트가 배출구에 닿는 순간: 추가 입력 없이 배출 → 정지 → 판독 → 원본 기록 → 닫힘
  useEffect(() => {
    if (!solved || stage) return;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(EJECT_MS, () => {
      setStage(1);
      sfx.sealEject();
    });
    at(STOP_MS, () => {
      setStage(2);
      sfx.sealStop();
    });
    at(READ_MS, () => {
      setStage(3);
      sfx.sealRead();
    });
    at(RESULT_MS, () => {
      setStage(4);
      sfx.reveal();
    });
    at(DONE_MS, () => doneRef.current());
  }, [solved, stage]);

  const busy = solved || closing;

  const begin = (e: React.PointerEvent, p: Piece) => {
    if (busy || dragRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.stopPropagation();
    const board = boardRef.current;
    if (!board) return;
    const cell = board.getBoundingClientRect().width / SIZE;
    const [min, max] = slideRange(pos, p.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const d: Drag = { id: p.id, pointer: e.pointerId, start: p.axis === "h" ? e.clientX : e.clientY, at: pos[p.id], min, max, off: 0, cell, moved: false, bumped: 0 };
    dragRef.current = d;
    setDrag(d);
    sfx.sealGrab();
  };
  const move = (e: React.PointerEvent, p: Piece) => {
    const d = dragRef.current;
    if (!d || d.pointer !== e.pointerId || d.id !== p.id) return;
    e.preventDefault();
    const px = (p.axis === "h" ? e.clientX : e.clientY) - d.start;
    if (!d.moved && Math.abs(px) < 5) return;
    const raw = px / d.cell;
    const lo = d.min - d.at;
    const hi = d.max - d.at;
    // 막힌 곳 너머로는 아주 조금만 밀리고 되돌아온다 (판이 다른 판에 닿았다는 손맛)
    let off = raw;
    let hit = 0;
    if (raw < lo) {
      off = lo - Math.min(0.08, (lo - raw) * 0.15);
      hit = -1;
    } else if (raw > hi) {
      off = hi + Math.min(0.08, (raw - hi) * 0.15);
      hit = 1;
    }
    const prevCell = Math.round(d.at + d.off);
    const next = { ...d, off, moved: true, bumped: hit };
    if (hit && d.bumped !== hit) {
      sfx.sealBump();
      setBump({ id: p.id, dir: hit });
      timers.current.push(setTimeout(() => setBump(null), 260));
    }
    if (Math.round(d.at + off) !== prevCell) sfx.sealTick();
    dragRef.current = next;
    setDrag(next);
  };
  const end = (e: React.PointerEvent, p: Piece) => {
    const d = dragRef.current;
    if (!d || d.pointer !== e.pointerId || d.id !== p.id) return;
    dragRef.current = null;
    setDrag(null);
    const off = Math.max(d.min - d.at, Math.min(d.max - d.at, d.off));
    const to = Math.round(d.at + off);
    if (d.moved && to !== d.at) {
      if (onMove(p.id, to)) sfx.sealSlide(Math.abs(to - d.at));
    } else if (d.moved) sfx.sealSettle();
  };
  // Touch interruptions (screen rotation, app switch, OS gestures) are not valid moves.
  // Previously onPointerCancel and unexpected capture loss called end(), which could
  // commit a half-completed slide and corrupt the player's intended puzzle position.
  const cancel = (e: React.PointerEvent, p: Piece) => {
    const d = dragRef.current;
    if (!d || d.pointer !== e.pointerId || d.id !== p.id) return;
    dragRef.current = null;
    setDrag(null);
    if (d.moved) sfx.sealSettle();
  };

  const cells = useMemo(() => Array.from({ length: SIZE * SIZE }, (_, i) => i), []);
  const pct = (n: number) => `${(n * 100) / SIZE}%`;

  return (
    <div className={`seal-wrap${closing ? " is-closing" : ""}${stage >= 2 ? " is-stopped" : ""}`} role="dialog" aria-modal="true" aria-label={L(sealUi.title)}>
      <div className="seal-machine">
        <header className="seal-head">
          <p className="seal-goal">{L(sealUi.goal)}</p>
          {!busy && (
            <div className="seal-tools">
              <button type="button" className="seal-btn" onClick={onUndo} disabled={!canUndo} aria-label={L(sealUi.undo)}>
                <span aria-hidden>↶</span> {L(sealUi.undo)}
              </button>
              <button type="button" className="seal-btn" onClick={onReset} disabled={!canUndo}>
                {L(sealUi.reset)}
              </button>
              <button type="button" className="seal-btn" onClick={onExit}>
                {L(sealUi.exit)}
              </button>
            </div>
          )}
        </header>
        <div className="seal-frame">
          <div className="seal-board" ref={boardRef}>
            {cells.map((i) => (
              <span key={i} className="seal-cell" style={{ left: pct(i % SIZE), top: pct(Math.floor(i / SIZE)) }} />
            ))}
            {LAYOUT.map((p) => {
              const dragging = drag?.id === p.id;
              const at = pos[p.id] + (dragging ? drag.off : 0);
              const out = p.id === CASSETTE && stage >= 1 ? 3.2 : 0;
              const left = p.axis === "h" ? at + out : p.col;
              const top = p.axis === "h" ? p.row : at;
              const bumping = bump?.id === p.id ? bump.dir : 0;
              const cls = [
                "seal-piece",
                p.id === CASSETTE ? "is-cassette" : "is-plate",
                p.axis === "h" ? "is-h" : "is-v",
                dragging ? "is-held" : "",
                stage >= 1 && p.id === CASSETTE ? "is-ejected" : "",
              ].join(" ");
              return (
                <div
                  key={p.id}
                  className={cls}
                  data-piece={p.id}
                  data-bump={bumping || undefined}
                  style={{
                    left: pct(left),
                    top: pct(top),
                    width: pct(p.axis === "h" ? p.len : 1),
                    height: pct(p.axis === "v" ? p.len : 1),
                  }}
                  onPointerDown={(e) => begin(e, p)}
                  onPointerMove={(e) => move(e, p)}
                  onPointerUp={(e) => end(e, p)}
                  onPointerCancel={(e) => cancel(e, p)}
                  onLostPointerCapture={(e) => cancel(e, p)}
                >
                  <span className="seal-face">
                    {p.id === CASSETTE ? (
                      <>
                        <span className="seal-reels" aria-hidden>
                          <i />
                          <i />
                        </span>
                        <b>{L(sealUi.cassette)}</b>
                      </>
                    ) : (
                      <span className="seal-grooves" aria-hidden />
                    )}
                  </span>
                </div>
              );
            })}
            {/* 오른쪽 배출구: 원본 카세트의 줄 끝에서 은은하게 빛난다 */}
            <div className={`seal-exit${stage >= 1 ? " is-open" : ""}`} style={{ top: pct(EXIT_ROW), height: pct(1) }} aria-hidden>
              <span />
            </div>
          </div>
        </div>
        {stage >= 3 && (
          <div className={`seal-read${stage >= 4 ? " is-result" : ""}`} role="status" aria-live="polite">
            {stage === 3 ? (
              <span className="seal-scan">{L(sealUi.reading)}</span>
            ) : (
              <div className="seal-record-compare">
                <span className="seal-read-time">{RECORD_TIME}</span>
                <div className="seal-record-row is-original">
                  <span className="seal-read-tag">{L(sealUi.originalTag)}</span>
                  <strong>✕ {L(ORIGINAL_RECORD)}</strong>
                </div>
                <div className="seal-rewrite" aria-label={L(sealUi.forcedRewrite)}>
                  <span aria-hidden="true">↓</span>
                  <span>{L(sealUi.forcedRewrite)}</span>
                </div>
                <div className="seal-record-row is-official">
                  <span className="seal-read-tag">{L(sealUi.officialTag)}</span>
                  <strong>✓ {L(sealUi.officialValue)}</strong>
                </div>
                <p className="seal-read-message">{L(sealUi.discrepancy)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
