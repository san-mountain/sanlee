"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { gaze, resetGaze } from "./gaze";
import { teleport } from "./Player";
import { restoreCovers } from "./Jabi";
import { jabiUi } from "./story";

// 대자비의 시선 게이지, 붉은 화면 가장자리, 보관 처리(죽음) 연출과 되살리기
export default function GazeHUD({ rootRef }: { rootRef: React.RefObject<HTMLElement | null> }) {
  const { t } = useLang();
  const wrap = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const [dead, setDead] = useState(false);
  const [tip, setTip] = useState(false);
  const shown = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    let raf = 0;
    let deadShown = false;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const root = rootRef.current;
      const m = gaze.meter / 100;
      const hot = gaze.state === "lock" || gaze.state === "fire" ? 1 : m;
      root?.style.setProperty("--gaze", String(hot));
      const visible = gaze.inZone || gaze.meter > 1 || gaze.state === "fire" || gaze.state === "cool";
      if (wrap.current) {
        wrap.current.style.opacity = visible ? "1" : "0";
        wrap.current.dataset.state = gaze.state;
        wrap.current.dataset.hidden = gaze.hiddenBy;
      }
      if (fill.current) fill.current.style.width = `${Math.round(hot * 100)}%`;
      if (label.current) {
        const key = gaze.state === "fire" ? "fire" : gaze.state === "lock" ? "lock" : gaze.hiddenBy && gaze.inZone ? (gaze.hiddenBy === "line" ? "line" : "hidden") : gaze.state;
        const s = tRef.current(jabiUi.states[key as keyof typeof jabiUi.states] ?? jabiUi.states.idle);
        if (label.current.textContent !== s) label.current.textContent = s;
      }
      // 처음 시선 구역에 들어가면 요령을 한 번 알려 준다
      if (gaze.inZone && !shown.current) {
        shown.current = true;
        setTip(true);
        setTimeout(() => setTip(false), 15000);
      }
      if (gaze.dead && !deadShown) {
        deadShown = true;
        setDead(true);
        setTimeout(() => {
          teleport.req = { x: 0, z: 7, yaw: 0 };
          restoreCovers();
          resetGaze();
          deadShown = false;
          setDead(false);
        }, 2600);
      }
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [rootRef]);

  return (
    <>
      <div className="gaze" ref={wrap} aria-hidden>
        <span className="gaze-name">{t(jabiUi.name)}</span>
        <div className="gaze-bar">
          <div className="gaze-fill" ref={fill} />
        </div>
        <span className="gaze-state" ref={label} />
      </div>
      <div className="gaze-vignette" aria-hidden />
      {tip && <div className="gaze-tip">{t(jabiUi.tip)}</div>}
      {dead && (
        <div className="archived">
          <div>
            <p className="big">{t(jabiUi.deadTitle)}</p>
            <p>{t(jabiUi.deadSub)}</p>
          </div>
        </div>
      )}
    </>
  );
}
