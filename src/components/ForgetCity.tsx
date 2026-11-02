"use client";

import { useState } from "react";
import { useLang } from "./LangProvider";

// 꼬리말 끝의 작은 'delete seoul': 게임 속 도시가 지울 수 없다던 기록을, 도시 밖(이 웹사이트)에서 실제로 지운다.
// 언어·효과음 설정은 기록이 아니라서 남긴다
const CITY_KEYS = ["sanlee-visited", "sanlee-met", "sanlee-san-talked", "sanlee-ending", "sanlee-endings-found", "sanlee-backup", "sanlee-jabi-intro"];

export default function ForgetCity() {
  const { lang } = useLang();
  const [done, setDone] = useState(false);
  const onClick = () => {
    try {
      CITY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}
    setDone(true);
  };
  if (done)
    return <span className="forget-city done">{lang === "ko" ? "이 기기에서 도시의 기록을 지웠습니다." : "The city's records on this device are gone."}</span>;
  return (
    <button type="button" className="forget-city" onClick={onClick}>
      delete seoul
    </button>
  );
}
