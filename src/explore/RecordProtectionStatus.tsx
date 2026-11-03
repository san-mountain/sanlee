"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { protection } from "./recordProtection";
import { sfx } from "./sfx";
import styles from "./RecordProtectionStatus.module.css";

// 범종 가까이 있거나 보호·재사용 대기 중일 때만 작은 표시로 뜬다 (평소에는 화면을 가리지 않는다)
export default function RecordProtectionStatus({ nearBell = false }: { nearBell?: boolean }) {
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
  const cooling = !state.active && state.cooldownRemainingMs > 0;
  if (!state.active && !cooling && !nearBell) return null;
  const title = state.active ? (ko ? "기록 보호 중" : "RECORD PROTECTION ON") : cooling ? (ko ? "범종 준비 중" : "BELL RECHARGING") : ko ? "범종 · 8초 동안 기록 보호" : "BELL · 8s RECORD PROTECTION";
  const seconds = (state.active ? state.remainingMs : state.cooldownRemainingMs) / 1000;
  return (
    <aside className={styles.status} data-active={state.active} aria-label={ko ? "기록 보호 장치 상태" : "Record protection status"}>
      <strong role="status">{title}</strong>
      {(state.active || cooling) && <span aria-hidden="true">{seconds.toFixed(1)}s</span>}
      {nearBell && <small>{ko ? "방공호 안의 시민 활동 기록만 · 게임 진행 저장은 계속됩니다" : "Shelter activity records only · Game progress still saves"}</small>}
    </aside>
  );
}
