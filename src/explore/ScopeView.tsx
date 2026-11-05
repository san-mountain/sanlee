"use client";

import { useEffect, useRef } from "react";
import { player } from "./Player";

// 남쪽 망원경으로 들여다보는 동안의 화면: 넓은 둥근 렌즈와 그 앞을 흐르는 구름 두 겹.
// 구름은 화면에 붙어 있지 않다. 고개를 돌린 만큼(망원경을 처음 댄 방향에서) 반대로 흘러가고,
// 가까운 겹이 더 많이 움직인다. 방문자에게 보이는 것은 구름뿐이다 (빛은 어디에도 그리지 않는다)
// yaw0·pitch0: 망원경이 향한 가운데 (구름은 그 방향에서 벗어난 만큼 움직인다)
export default function ScopeView({ sees, exitLabel, hint, onExit, yaw0, pitch0 }: { sees: string; exitLabel: string; hint: string; onExit: () => void; yaw0: number; pitch0: number }) {
  const far = useRef<HTMLDivElement>(null);
  const near = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      let dy = player.yaw - yaw0;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const dp = player.pitch - pitch0;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const drift = still ? 0 : Math.sin((performance.now() - t0) / 9000) * 0.04 * w;
      // 배율 0.65, 좌우 ±1.15rad·위아래 −0.90…0.25까지 둘러본다. 끝까지 돌려도 구름 층(CSS에서 화면의 5배 넓이)의 가장자리가 보이지 않게
      // 가까운 겹도 화면 폭의 1.4배 안쪽에서만 움직인다
      if (far.current) far.current.style.transform = `translate(${(dy * 0.7 * w + drift * 0.6).toFixed(1)}px, ${(dp * 0.7 * h).toFixed(1)}px)`;
      if (near.current) near.current.style.transform = `translate(${(dy * 1.2 * w + drift).toFixed(1)}px, ${(dp * 1.2 * h).toFixed(1)}px)`;
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [yaw0, pitch0]);
  return (
    <div className="scope-view">
      <div className="scope-cloud far" ref={far} aria-hidden />
      <div className="scope-cloud near" ref={near} aria-hidden />
      <div className="scope-mask" aria-hidden />
      <p className="scope-sees" role="status">
        {sees}
      </p>
      <div className="scope-actions">
        <button type="button" className="btn" onClick={onExit}>
          {exitLabel}
        </button>
        <small>{hint}</small>
      </div>
    </div>
  );
}
