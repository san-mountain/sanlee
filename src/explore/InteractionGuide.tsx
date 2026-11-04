"use client";

import { useEffect, useRef } from "react";
import { interactionProjection } from "./interactionProjection";

// One unobtrusive holographic marker on the *actual selected 3D part*.
// Shared by mouse/keyboard and touch; no tether line, floating text or extra HUD.
// It renders as a non-interactive SVG layer and never alters target selection.
export default function InteractionGuide({ active, color }: { active: boolean; color?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const target = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!active) {
      if (svg.current) svg.current.style.opacity = "0";
      return;
    }
    let raf = 0;
    const update = () => {
      const el = svg.current;
      const marker = target.current;
      const point = interactionProjection;
      if (!el || !marker || !point.visible || !point.id) {
        if (el) el.style.opacity = "0";
      } else {
        const w = el.clientWidth;
        const h = el.clientHeight;
        const x = point.x * w;
        const y = point.y * h;
        const visible = x >= 24 && x <= w - 24 && y >= 24 && y <= h - 24;
        if (visible) marker.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        el.style.opacity = visible ? "0.86" : "0";
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
      <g ref={target} className="interaction-hologram">
        <circle r="19" stroke="#020b12" strokeWidth="4" fill="none" opacity="0.85" />
        <circle r="19" stroke="currentColor" strokeWidth="1.1" fill="currentColor" fillOpacity="0.07" strokeDasharray="42 13" />
        <path d="M-24 -12 V-24 H-12 M12 -24 H24 V-12 M24 12 V24 H12 M-12 24 H-24 V12"
          stroke="#020b12" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M-24 -12 V-24 H-12 M12 -24 H24 V-12 M24 12 V24 H12 M-12 24 H-24 V12"
          stroke="currentColor" strokeWidth="1.35" fill="none" strokeLinecap="round" />
        <circle r="2.3" fill="currentColor" />
      </g>
    </svg>
  );
}
