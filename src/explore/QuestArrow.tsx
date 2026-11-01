"use client";

import { useEffect, useRef } from "react";
import { player } from "./Player";

// 화면 위쪽 가운데의 작은 화살표: 지금 목표가 어느 쪽에 있는지 알려 준다
export type QuestTarget = { pos: { x: number; z: number }; label: string } | null;

export default function QuestArrow({ get }: { get: () => QuestTarget }) {
  const ref = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const getRef = useRef(get);
  getRef.current = get;
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = ref.current;
      if (!el) return;
      const q = getRef.current();
      el.style.display = q ? "" : "none";
      if (!q) return;
      const target = q.pos;
      if (text.current && text.current.textContent !== q.label) text.current.textContent = q.label;
      const dx = target.x - player.pos.x;
      const dz = target.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      // 정면(yaw=0)은 -z. 목표 방위와 시선의 차이만큼 화살표를 돌린다
      const bearing = Math.atan2(-dx, -dz);
      let rel = bearing - player.yaw;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (arrow.current) arrow.current.style.transform = `rotate(${(-rel * 180) / Math.PI}deg)`;
      if (dist.current) dist.current.textContent = `${Math.round(d)}m`;
      el.classList.toggle("close", d < 3.5);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="quest" ref={ref} aria-hidden>
      <span className="quest-arrow" ref={arrow}>
        {/* 끝이 뾰족하고 꼬리가 있는 화살표: 위쪽이 앞 */}
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 1 L13.5 9 L9.6 9 L9.6 15 L6.4 15 L6.4 9 L2.5 9 Z" fill="currentColor" />
        </svg>
      </span>
      <span className="quest-label" ref={text} />
      <span className="quest-dist" ref={dist} />
    </div>
  );
}
