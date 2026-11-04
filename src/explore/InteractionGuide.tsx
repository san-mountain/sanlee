"use client";

import { useEffect, useRef } from "react";
import { interactionProjection } from "./interactionProjection";

// A single subtle line ties the mobile action button to the actual 3D part it operates.
// No floating text labels; projection comes from the same target selected by Player.
export default function InteractionGuide({ active, color }: { active: boolean; color?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const center = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!active) {
      if (svg.current) svg.current.style.opacity = "0";
      return;
    }
    let raf = 0;
    const update = () => {
      const el = svg.current;
      const btn = document.querySelector<HTMLElement>(".interact-btn");
      const point = interactionProjection;
      if (!el || !btn || !point.visible || !point.id) {
        if (el) el.style.opacity = "0";
      } else {
        const bounds = el.getBoundingClientRect();
        const b = btn.getBoundingClientRect();
        const x1 = b.left + b.width * 0.25 - bounds.left;
        const y1 = b.top + b.height * 0.34 - bounds.top;
        const x2 = point.x * bounds.width;
        const y2 = point.y * bounds.height;
        const ok = x2 >= 14 && x2 <= bounds.width - 14 && y2 >= 14 && y2 <= bounds.height - 14;
        if (ok) {
          path.current?.setAttribute("d", `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
          ring.current?.setAttribute("cx", String(x2));
          ring.current?.setAttribute("cy", String(y2));
          center.current?.setAttribute("cx", String(x2));
          center.current?.setAttribute("cy", String(y2));
        }
        el.style.opacity = ok ? "0.78" : "0";
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(raf);
      if (svg.current) svg.current.style.opacity = "0";
    };
  }, [active]);

  return (
    <svg
      ref={svg}
      className="interaction-guide"
      style={{ color: color ?? "#9adcd0" }}
      aria-hidden="true"
    >
      <path ref={path} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />
      <circle ref={ring} r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle ref={center} r="3" fill="currentColor" />
    </svg>
  );
}
