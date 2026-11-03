"use client";

// A·B 퍼즐의 현재 조작 가능한 부품을 화면 위에 표시한다.
// 모바일: 표식 자체를 탭해 상호작용할 수 있어 WebGL 레이캐스트/시야 드래그와 별개로 작동한다.
// PC: 같은 표식을 안내용으로만 표시하고 기존 조준 + E/클릭을 유지한다.
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/data/site";
import { player } from "./Player";
import { faceRt } from "./faceRuntime";
import { auditRt } from "./auditRuntime";
import { FACE_MACHINE, AUDIT_MACHINE } from "./zones";

type Hint = {
  id: string;
  label: string;
  symbol: string;
  x: number;
  y: number;
  color: string;
  dx: number;
  dy: number;
};

const facing = (pos: readonly number[], angle: number, radius: number) => {
  const dx = player.pos.x - pos[0];
  const dz = player.pos.z - pos[2];
  return Math.hypot(dx, dz) < radius && dx * Math.sin(angle) + dz * Math.cos(angle) > 0.1;
};

export default function PuzzleInteractHints({
  lang,
  touch,
  onTap,
}: {
  lang: Lang;
  touch: boolean;
  onTap: (id: string) => void;
}) {
  const [hints, setHints] = useState<Hint[]>([]);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  useEffect(() => {
    const ko = lang === "ko";
    let frame = 0;
    let last = 0;

    const tick = (now: number) => {
      if (now - last >= 90) {
        last = now;
        const next: Hint[] = [];
        const add = (
          id: string, key: string, label: string, symbol: string,
          color: string, screen: Record<string, [number, number]>,
          dx = 0, dy = 0
        ) => {
          const p = screen[key];
          if (!p || p[0] < 0.06 || p[0] > 0.94 || p[1] < 0.07 || p[1] > 0.93) return;
          next.push({ id, label, symbol, x: p[0], y: p[1], color, dx, dy });
        };

        if (facing(FACE_MACHINE.pos, FACE_MACHINE.rotY, 3.8)) {
          if (faceRt.phase === "idle") {
            for (let i = 0; i < 3; i++) {
              const label = ko ? ["윗부분 돌리기", "가운데 돌리기", "아랫부분 돌리기"][i] : ["Turn top", "Turn middle", "Turn bottom"][i];
              add(`face-drum-${i}`, `drum-${i}`, label, "↻", "#e8c27a", faceRt.screen, 39, 0);
            }
          } else if (faceRt.phase === "choice") {
            add("face-std", "std", ko ? "표준 미소" : "Standard smile", "✓", "#ff79c0", faceRt.screen, -9, -35);
            add("face-keep", "keep", ko ? "원본 보존" : "Keep original", "◇", "#e8c27a", faceRt.screen, 9, -35);
          }
        }
        // 감사 기록함은 본체 옆면에 있다. 옆으로 돌아가도 표식이 사라지지 않도록 거리만 검사한다.
        if (Math.hypot(player.pos.x - AUDIT_MACHINE.pos[0], player.pos.z - AUDIT_MACHINE.pos[2]) < 4.5) {
          if (auditRt.phase === "idle") {
            add("audit-handle", "handle", ko ? "기록 재생" : "Replay", "▶", "#e8c27a", auditRt.screen, 24, -20);
          } else if (auditRt.phase === "test") {
            add("audit-accept", "accept", ko ? "모두 수락" : "Accept all", "✓", "#2fe3c0", auditRt.screen, -4, -36);
            add("audit-reject", "reject", ko ? "모두 거부" : "Reject all", "✕", "#ff6a5f", auditRt.screen, 4, -36);
          } else if (auditRt.phase === "slip") {
            add("audit-box", "box", ko ? "기록지 꺼내기" : "Take record", "▤", "#ffb03a", auditRt.screen, -25, -32);
          }
        }
        setHints((prev) => {
          if (prev.length === next.length && prev.every((p, i) =>
            p.id === next[i].id && Math.abs(p.x - next[i].x) < 0.004 &&
            Math.abs(p.y - next[i].y) < 0.004
          )) return prev;
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lang]);

  return (
    <div className="puzzle-hint-layer" aria-label={lang === "ko" ? "퍼즐 조작 안내" : "Puzzle controls"}>
      {hints.map((h) => {
        const content = <><span className="puzzle-hint-symbol" aria-hidden="true">{h.symbol}</span><span>{h.label}</span>{!touch && <kbd>E</kbd>}</>;
        const style = { left: `calc(${(h.x * 100).toFixed(2)}% + ${h.dx}px)`, top: `calc(${(h.y * 100).toFixed(2)}% + ${h.dy}px)`, borderColor: h.color, color: h.color } as const;
        return touch
          ? <button key={h.id} type="button" className="puzzle-hint puzzle-hint-touch" style={style} aria-label={h.label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTapRef.current(h.id); }}>{content}</button>
          : <span key={h.id} className="puzzle-hint puzzle-hint-desktop" style={style}>{content}</span>;
      })}
    </div>
  );
}
