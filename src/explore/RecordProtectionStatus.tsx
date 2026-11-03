"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { protection } from "./recordProtection";
import { sfx } from "./sfx";
import styles from "./RecordProtectionStatus.module.css";

export default function RecordProtectionStatus() {
  const { lang } = useLang();
  const [state, setState] = useState(() => protection.snapshot());
  const wasActive = useRef(state.active);
  useEffect(() => {
    const update = () => {
      const next = protection.snapshot();
      if (wasActive.current && !next.active) sfx.chime();
      wasActive.current = next.active;
      setState(next);
    };
    // 표시에만 사용한다. 행동의 보호 여부는 실제 실행 시각으로 판정한다.
    const interval = setInterval(update, 100);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const ko = lang === "ko";
  const title = state.active
    ? ko ? "기록 보호 중" : "RECORD PROTECTION ON"
    : ko ? "로컬 기록 수집 · 보호 꺼짐" : "LOCAL RECORDING · PROTECTION OFF";
  const seconds = (state.active ? state.remainingMs : state.cooldownRemainingMs) / 1000;
  return (
    <aside className={styles.status} data-active={state.active} aria-label={ko ? "기록 보호 장치 상태" : "Record protection status"}>
      <strong role="status">{title}</strong>
      <span aria-hidden="true">
        {state.active ? `${seconds.toFixed(1)}s` : seconds > 0 ? `${ko ? "재사용까지" : "Ready in"} ${seconds.toFixed(1)}s` : ko ? "범종 사용 가능" : "Bell ready"}
      </span>
      <small>{ko ? "방공호 내 적용 · 게임 진행 저장은 계속됩니다" : "This shelter only · Game progress still saves"}</small>
    </aside>
  );
}
