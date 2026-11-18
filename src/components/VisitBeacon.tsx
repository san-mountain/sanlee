"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// 페이지를 볼 때마다 /api/visit 에 짧은 기록을 보낸다(쿠키 없음, 화면에는 아무 영향 없음).
// 이 탭에서 처음 연 페이지에만 "어디서 왔는지"를 붙여 한 번의 방문으로 센다. 새로고침은 새 방문이 아니다
let sentFirst = false;
const KEY = "sanlee-visit";

export default function VisitBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/admin")) return;
    // 언어가 정해진 뒤(LangProvider가 그린 뒤)에 보내도록 한 박자 늦춘다
    const t = setTimeout(() => {
      let first = !sentFirst;
      try {
        first = !sessionStorage.getItem(KEY);
        sessionStorage.setItem(KEY, "1");
      } catch {}
      sentFirst = true;
      const body = JSON.stringify({
        path,
        first,
        ref: first ? document.referrer : undefined,
        lang: document.documentElement.lang,
        touch: navigator.maxTouchPoints > 1,
      });
      try {
        if (!navigator.sendBeacon?.("/api/visit", body)) fetch("/api/visit", { method: "POST", body, keepalive: true }).catch(() => {});
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [path]);
  return null;
}
