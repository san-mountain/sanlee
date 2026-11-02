"use client";

// 거부 과정의 미니 게임: 켜진 쿠키를 하나씩 직접 끈다. 끄는 동안 다른 쿠키가 슬그머니 다시 켜지고, 갈수록 빨라진다.
// 현실의 쿠키 창에서 '모두 거부' 대신 수십 개의 '정당한 이익' 토글을 하나하나 꺼야 하는 다크 패턴을 과장한 것.
import { useEffect, useRef, useState } from "react";
import type { L } from "@/data/site";
import { cookieGame as G } from "./story";
import { sfx } from "./sfx";

const LIMIT_MS = 15000;

export default function CookieGame({ t, onWin, onLose }: { t: (l: L) => string; onWin: () => void; onLose: () => void }) {
  const [on, setOn] = useState<boolean[]>(() => G.items.map(() => true));
  const [back, setBack] = useState<number | null>(null); // 방금 다시 켜진 칸
  const [left, setLeft] = useState(LIMIT_MS);
  const [over, setOver] = useState<"win" | "lose" | null>(null);
  const onRef = useRef(on);
  onRef.current = on;

  // 남은 시간
  useEffect(() => {
    if (over) return;
    const start = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, LIMIT_MS - (performance.now() - start));
      setLeft(l);
      if (l <= 0) setOver("lose");
    }, 100);
    return () => clearInterval(id);
  }, [over]);

  // 꺼 둔 쿠키가 다시 켜진다: 처음엔 1.5초마다, 끝으로 갈수록 0.55초마다
  useEffect(() => {
    if (over) return;
    let h: ReturnType<typeof setTimeout>;
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / LIMIT_MS);
      const offs = onRef.current.map((v, i) => (!v ? i : -1)).filter((i) => i >= 0);
      if (offs.length) {
        const i = offs[Math.floor(Math.random() * offs.length)];
        setOn((o) => o.map((v, k) => (k === i ? true : v)));
        setBack(i);
        sfx.watch();
      }
      h = setTimeout(tick, 1500 - p * 950);
    };
    h = setTimeout(tick, 1800);
    return () => clearTimeout(h);
  }, [over]);

  const remaining = on.filter(Boolean).length;
  useEffect(() => {
    if (!over && remaining === 0) setOver("win");
  }, [remaining, over]);

  useEffect(() => {
    if (over === "win") {
      sfx.restore();
      const h = setTimeout(onWin, 1100);
      return () => clearTimeout(h);
    }
    if (over === "lose") {
      sfx.denied();
      const h = setTimeout(onLose, 2600);
      return () => clearTimeout(h);
    }
  }, [over, onWin, onLose]);

  return (
    <div className={`cookie-game${over ? ` ${over}` : ""}`}>
      <h2>{t(G.title)}</h2>
      <p>{t(G.body)}</p>
      <div className="cg-status">
        <span>
          {t(G.left)} <b>{remaining}</b>
        </span>
        <span className="cg-timer">
          <i style={{ width: `${(left / LIMIT_MS) * 100}%` }} />
        </span>
      </div>
      <ul className="cg-list">
        <li className="cg-item locked">
          <span>{t(G.essential)}</span>
          <b>{t(G.lockedOn)}</b>
        </li>
        {G.items.map((x, i) => (
          <li key={i} className={`cg-item${on[i] ? " on" : ""}${back === i && on[i] ? " back" : ""}`}>
            <button
              type="button"
              disabled={!!over || !on[i]}
              onClick={() => {
                sfx.blip();
                setOn((o) => o.map((v, k) => (k === i ? false : v)));
              }}
            >
              <span>{t(x)}</span>
              <i className="cg-switch" aria-label={on[i] ? "ON" : "OFF"} />
            </button>
          </li>
        ))}
      </ul>
      {over && <p className="cg-result">{t(over === "win" ? G.win : G.lose)}</p>}
    </div>
  );
}
