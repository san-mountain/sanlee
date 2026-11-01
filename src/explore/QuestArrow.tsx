"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { player } from "./Player";

// 화면 위쪽 가운데의 작은 화살표: 지금 목표가 어느 쪽에 있는지 알려 준다
export default function QuestArrow({ target, label }: { target: THREE.Vector3 | null; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = ref.current;
      if (!el || !target) return;
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
  }, [target]);
  if (!target) return null;
  return (
    <div className="quest" ref={ref} aria-hidden>
      <span className="quest-arrow" ref={arrow}>
        {/* 끝이 뾰족하고 꼬리가 있는 화살표: 위쪽이 앞 */}
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 1 L13.5 9 L9.6 9 L9.6 15 L6.4 15 L6.4 9 L2.5 9 Z" fill="currentColor" />
        </svg>
      </span>
      <span className="quest-label">{label}</span>
      <span className="quest-dist" ref={dist} />
    </div>
  );
}
