"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { backupUi, ui } from "./story";

// 도시가 위치를 기억하는 순간 화면 아래 가운데에 잠깐 뜨는 알림. 세이브 포인트처럼 보이게 한다.
// 첫 기억은 현실의 쿠키 배너를 흉내 낸 한 줄: 클릭할 필요 없이 지나가고, 거부는 검문소에서만 할 수 있다.
export default function SaveToast() {
  const { t } = useLang();
  const [n, setN] = useState<number | null>(null);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    let to: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { kind: string; n: number } | string;
      if (typeof d !== "object" || d.kind !== "save") return;
      setN(d.n);
      clearTimeout(to);
      to = setTimeout(() => setN(null), d.n === 1 ? 6500 : 2600);
    };
    window.addEventListener("sanlee-backup", on);
    return () => {
      window.removeEventListener("sanlee-backup", on);
      clearTimeout(to);
    };
  }, []);
  if (n === null) return null;
  if (n === 1)
    return (
      <div className="save-toast cookie-notice" role="status">
        <b>{t(ui.cookieNotice)}</b>
        <span>{t(ui.cookieNoticeSub)}</span>
        <em>{t(touch ? ui.cookieSettingsTouch : ui.cookieSettings)}</em>
      </div>
    );
  return (
    <div className="save-toast" role="status">
      <b>{t(backupUi.saved)}</b>
      {n <= 3 && <span>{t(ui.savedHint)}</span>}
    </div>
  );
}
