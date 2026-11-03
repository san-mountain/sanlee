"use client";

import { useEffect, useRef } from "react";

// 중첩 예약도 같은 세션에 묶어, 화면을 떠난 뒤 이전 게임의 작업이 실행되지 않게 한다.
export function createSessionTimers() {
  const pending = new Set<ReturnType<typeof setTimeout>>();
  return {
    schedule(callback: () => void, delay: number) {
      const id = setTimeout(() => {
        pending.delete(id);
        callback();
      }, delay);
      pending.add(id);
      return id;
    },
    clear() {
      pending.forEach(clearTimeout);
      pending.clear();
    },
  };
}

export default function useSessionTimers() {
  const ref = useRef<ReturnType<typeof createSessionTimers> | null>(null);
  if (!ref.current) ref.current = createSessionTimers();
  const timers = ref.current;
  useEffect(() => () => timers.clear(), [timers]);
  return timers.schedule;
}
