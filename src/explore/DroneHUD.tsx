"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { drone } from "./Drones";
import { gaze } from "./gaze";
import { droneUi } from "./story";

// 드론 경고: 대자비의 붉은 게이지와 따로, 화면 위쪽에 차가운 흰빛·주황의 작은 막대로 뜬다.
// 광장에서 식별되면 화면이 잠깐 어두워지고, onCaught가 그 구간 처음 자리로 돌려보낸다
export default function DroneHUD({ onCaught }: { onCaught: () => void }) {
  const { t } = useLang();
  const tRef = useRef(t);
  tRef.current = t;
  const caughtRef = useRef(onCaught);
  caughtRef.current = onCaught;
  const wrap = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  // 화면 낭독기용: 상태가 바뀔 때만 한 번 읽는다
  const [say, setSay] = useState("");
  const [out, setOut] = useState(false);

  useEffect(() => {
    let raf = 0;
    let handled = false;
    let prev = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const sent = drone.sent && now - drone.sent < 2400;
      const key = drone.caught ? "caught" : sent ? "sent" : drone.lit >= 0 ? "lit" : drone.meter > 0.5 ? "lost" : "";
      if (wrap.current) {
        wrap.current.style.opacity = key ? "1" : "0";
        wrap.current.dataset.state = key;
      }
      if (fill.current) fill.current.style.width = `${Math.round((sent ? 100 : drone.meter))}%`;
      if (key !== prev) {
        prev = key;
        const s = key ? tRef.current(droneUi[key as keyof typeof droneUi]) : "";
        if (label.current) label.current.textContent = s;
        setSay(s);
      }
      if (drone.caught && !handled) {
        handled = true;
        // 식별된 순간부터 화면이 돌아갈 때까지 걷기를 멈춘다 (onCaught에서 푼다)
        gaze.still = true;
        setOut(true);
        timer = setTimeout(() => {
          caughtRef.current();
          setOut(false);
          handled = false;
        }, 1900);
      }
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      // 식별 연출 도중에 사라지면(구역 이동·결말) 멈춘 걸음과 식별 상태를 풀어 둔다
      if (handled) {
        gaze.still = false;
        drone.caught = false;
        drone.meter = 0;
      }
    };
  }, []);

  return (
    <>
      <div className="drone-hud" ref={wrap} aria-hidden>
        <span className="drone-name">{t(droneUi.name)}</span>
        <div className="drone-bar">
          <div className="drone-fill" ref={fill} />
        </div>
        <span className="drone-state" ref={label} />
      </div>
      <span className="sr-only" role="status">
        {say}
      </span>
      {out && (
        <div className="drone-out">
          <p>{t(droneUi.caughtTitle)}</p>
          <small>{t(droneUi.caughtSub)}</small>
        </div>
      )}
    </>
  );
}
