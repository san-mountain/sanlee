"use client";

import { useEffect, useState } from "react";
import { GameTimers, runtime } from "./runtime";

// All callbacks belong to this mounted component and stop at unmount.
export function useGameTimers() {
  const [timers] = useState(() => new GameTimers());
  useEffect(() => {
    let frame = 0;
    let previous = runtime.now();
    const tick = () => {
      const now = runtime.now();
      timers.advance(Math.max(0, now - previous));
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      timers.clear();
    };
  }, [timers]);
  return timers;
}
