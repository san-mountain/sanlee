"use client";

import { runtime } from "./runtime";
import { useGameTimers } from "./useGameTimers";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { drone } from "./Drones";
import { gaze } from "./gaze";
import { droneUi } from "./story";

// 드론 경고 (광장·바깥 산책로만): 화면 위쪽에 차가운 흰빛·주황의 작은 막대로 뜬다. 큰길에서는 대자비의 감시 게이지 하나만 쓴다.
// 광장에서 발각되면 화면이 잠깐 어두워지고, onCaught가 그 드론 길 앞의 안전한 자리로 돌려보낸다.
// 저장된 방문 기록이 없는 방문자에게 빛이 닿으면 게이지 없이 '방문자 기록 없음 · 추적 불가'가 이번 방문에 한 번 뜬다
export default function DroneHUD({ onCaught }: { onCaught: () => void }) {
  const { setTimeout, clearTimeout } = useGameTimers();
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
    let shapeUntil = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (runtime.paused) return;
      const now = runtime.now();
      // 큰길의 드론 빛은 대자비의 감시 게이지에 합쳐진다 (여기서는 광장·산책로 드론만 보여 준다)
      const plazaLit = drone.lit >= 0 && drone.zone === "plaza";
      // 기록 없는 방문자에게 고리가 붙지 못한 일은 이번 방문에 한 번만 글로 알린다
      if (drone.shape && !drone.shapeSeen) {
        drone.shapeSeen = true;
        shapeUntil = now + 2800;
      }
      const key = drone.caught ? "caught" : plazaLit ? "lit" : now < shapeUntil ? "shape" : drone.meter > 0.5 ? "lost" : "";
      if (wrap.current) {
        wrap.current.style.opacity = key ? "1" : "0";
        wrap.current.dataset.state = key;
      }
      if (fill.current) fill.current.style.width = `${Math.round(key === "shape" ? 0 : drone.meter)}%`;
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
