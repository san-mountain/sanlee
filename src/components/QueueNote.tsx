"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";

// DELETE SEOUL에서 '모두 수락'을 누르고 줄에 선 기기에만 보이는 작은 한 줄: 게임 밖에서도 아직 줄에 서 있다.
// 기록을 지우거나(꼬리말의 delete seoul) 게임에서 처음부터 다시 하면 사라진다
export default function QueueNote() {
  const { lang } = useLang();
  const [no, setNo] = useState(0);
  useEffect(() => {
    const read = () => {
      try {
        setNo(localStorage.getItem("sanlee-ending") === "accept" ? Number(localStorage.getItem("sanlee-queue-no")) || 0 : 0);
      } catch {}
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("sanlee-backup", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("sanlee-backup", read);
    };
  }, []);
  if (!no) return null;
  const n = no.toLocaleString("en-US");
  return <small className="queue-note">{lang === "ko" ? `대기 번호 ${n}번 · 출발 미정` : `Queue number ${n} · departure not set`}</small>;
}
