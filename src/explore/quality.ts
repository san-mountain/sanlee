import { useSyncExternalStore } from "react";

// DELETE SEOUL's highest cost is full-screen postprocessing + planar road
// reflections on HiDPI screens. Retina MacBooks can run the *scene* smoothly,
// but defaulting them to GPU-heavy effects causes severe stalls and throttling.
export type Quality = "high" | "mid" | "low";

const ORDER: Quality[] = ["low", "mid", "high"];
export const GRAPHICS_KEY = "sanlee-graphics-quality-v1";
const forced: Quality | null = (() => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("fx");
  return v === "high" || v === "mid" ? v : v === "off" ? "low" : null;
})();

export function recommendedQuality(): Quality {
  if (typeof window === "undefined") return "low";
  // GPU-safe initial preset. It is pixel count, not 16 GB of system memory,
  // that makes a Retina laptop particularly expensive to postprocess.
  return window.devicePixelRatio >= 1.6 ? "low" : "mid";
}

function initialQuality(): Quality {
  if (forced) return forced;
  if (typeof window === "undefined") return "low";
  try {
    const stored = window.localStorage.getItem(GRAPHICS_KEY);
    if (stored === "high" || stored === "mid" || stored === "low") return stored;
  } catch {}
  return recommendedQuality();
}

let current: Quality = initialQuality();
const subs = new Set<() => void>();

function emit(q: Quality) {
  if (q === current) return;
  current = q;
  subs.forEach((f) => f());
}

export function setQuality(q: Quality) {
  if (forced) return;
  emit(q);
}

// A user-selected preset is remembered across visits; automatic FPS fallback
// deliberately does NOT overwrite the chosen preset.
export function chooseQuality(q: Quality) {
  if (forced) return;
  try { window.localStorage.setItem(GRAPHICS_KEY, q); } catch {}
  emit(q);
}

export function lowerQuality() {
  if (forced) return;
  const i = ORDER.indexOf(current);
  if (i > 0) emit(ORDER[i - 1]);
}

export function useQuality() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
    () => "low" as Quality
  );
}
export const isForced = () => forced !== null;
