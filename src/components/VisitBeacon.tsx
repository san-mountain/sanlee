"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// 페이지를 볼 때마다 /api/visit 에 짧은 기록을 보낸다(쿠키 없음, 화면에는 아무 영향 없음).
// 이 탭에서 처음 연 페이지에만 "어디서 왔는지"를 붙여 한 번의 방문으로 센다. 새로고침은 새 방문이 아니다.
// 방문마다 무작위 표(id)를 하나 만들어 이 탭에만 두고, 같은 방문에서 본 페이지들을 하나로 묶는 데만 쓴다
const KEY = "sanlee-visit";
let memId = "";

const newId = () => {
  const a = new Uint8Array(15);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_");
};

function send(data: object) {
  const body = JSON.stringify(data);
  try {
    if (!navigator.sendBeacon?.("/api/visit", body)) fetch("/api/visit", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {}
}

export default function VisitBeacon() {
  const path = usePathname();

  useEffect(() => {
    if (!path || path.startsWith("/admin")) return;
    // 언어가 정해진 뒤(LangProvider가 그린 뒤)에 보내도록 한 박자 늦춘다
    const t = setTimeout(() => {
      let id = memId;
      try {
        id = sessionStorage.getItem(KEY) ?? memId;
      } catch {}
      const first = !id;
      if (first) id = newId();
      memId = id;
      try {
        sessionStorage.setItem(KEY, id);
      } catch {}
      send({
        path,
        id,
        first,
        ref: first ? document.referrer : undefined,
        lang: document.documentElement.lang,
        touch: navigator.maxTouchPoints > 1,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [path]);

  // 탭을 닫거나 다른 앱으로 넘어갈 때 끝난 시각을 알린다(머문 시간)
  useEffect(() => {
    const leave = (e: Event) => {
      if ((e.type === "pagehide" || document.visibilityState === "hidden") && memId && !location.pathname.startsWith("/admin")) send({ id: memId, leave: true });
    };
    document.addEventListener("visibilitychange", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", leave);
      window.removeEventListener("pagehide", leave);
    };
  }, []);
  return null;
}
