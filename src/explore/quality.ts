import { useSyncExternalStore } from "react";

// 화면 효과 단계. 프레임이 떨어지면 Effects의 Governor가 해상도와 함께 단계적으로 낮춘다.
// mid: 빛 번짐 / low: 효과 없음. 고화질(젖은 도로 반사·4배 안티에일리어싱) 단계는 없앴다: 노트북에서 끊겼다
export type Quality = "mid" | "low";

const ORDER: Quality[] = ["low", "mid"];
// 비교·테스트용: 주소에 ?fx=off 를 붙이면 효과를 끈 채로 고정
const forced: Quality | null = (() => {
  if (typeof location === "undefined") return null;
  return new URLSearchParams(location.search).get("fx") === "off" ? "low" : null;
})();
// 성능 우선 설정: 모든 기기(PC·노트북 포함)가 가벼운 설정으로 그린다. 해상도는 낮게, 장식 조명과 비를 줄인다
export const lite = true;
let current: Quality = forced ?? "mid";
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
    () => "mid" as Quality
  );
}

export const isForced = () => forced !== null;

// 그리는 해상도 배율 (기기 화소 배율을 넘지 않는다). Canvas의 dpr로 바로 들어간다:
// 장면 안에서 setDpr로 바꾸면 Canvas가 다시 그려질 때마다 처음 값으로 되돌아가서, 낮춘 해상도가 유지되지 않았다
let scale = 1;
const scaleSubs = new Set<() => void>();
export function setRenderScale(v: number) {
  if (v === scale) return;
  scale = v;
  scaleSubs.forEach((f) => f());
}
export function useRenderScale() {
  return useSyncExternalStore(
    (f) => {
      scaleSubs.add(f);
      return () => scaleSubs.delete(f);
    },
    () => scale,
    () => 1
  );
}
