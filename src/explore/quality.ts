import { useSyncExternalStore } from "react";

// 화면 효과 단계. 프레임이 떨어지면 PerformanceMonitor가 한 단계씩 낮춘다.
// high: 빛 번짐 + 젖은 도로 반사 / mid: 빛 번짐만 / low: 효과 없음
export type Quality = "high" | "mid" | "low";

const ORDER: Quality[] = ["low", "mid", "high"];
// 비교·테스트용: 주소에 ?fx=high 를 붙이면 단계 고정, ?fx=off 는 효과 끔
const forced: Quality | null = (() => {
  if (typeof location === "undefined") return null;
  const v = new URLSearchParams(location.search).get("fx");
  return v === "high" || v === "mid" ? v : v === "off" ? "low" : null;
})();
// 휴대폰·태블릿(손가락 입력): 처음부터 가볍게 시작한다. 젖은 도로 반사 없이(mid), 해상도는 낮게, 장식 조명과 비를 줄인다.
// 데스크톱은 그대로 high에서 시작하고, 프레임이 떨어질 때만 낮춘다
export const lite: boolean = (() => {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(location.search).get("lite") === "0") return false;
  if (new URLSearchParams(location.search).get("lite") === "1") return true;
  return window.matchMedia?.("(pointer: coarse)").matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
})();
let current: Quality = forced ?? (lite ? "mid" : "high");
const subs = new Set<() => void>();

export function setQuality(q: Quality) {
  if (q === current) return;
  current = q;
  subs.forEach((f) => f());
}

export function lowerQuality() {
  if (forced) return;
  const i = ORDER.indexOf(current);
  if (i > 0) setQuality(ORDER[i - 1]);
}

export function useQuality() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
    () => "high" as Quality
  );
}

export const isForced = () => forced !== null;
