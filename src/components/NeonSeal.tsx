"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCrossing } from "./deleteCrossing";
import { ui } from "@/data/site";
import { useLang } from "./LangProvider";

// DELETE SEOUL 입구: 空이 적힌 네온 원. 둘레의 글자가 천천히 돈다.
// 한 번 누르면 원이 펼쳐지며 전체 제목이 드러나고, 다시 누르면 지워지며 도시로 건너간다.
// 마우스가 있는 화면에서는 올리기만 해도 펼쳐지므로 한 번에 들어간다.
export default function NeonSeal() {
  const router = useRouter();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [fullW, setFullW] = useState(0);
  const ref = useRef<HTMLAnchorElement>(null);
  const fullRef = useRef<HTMLSpanElement>(null);

  // 펼친 폭은 제목 글자의 실제 폭으로 (언어·글꼴이 바뀌어도 맞게)
  useEffect(() => {
    const el = fullRef.current;
    if (!el) return;
    const measure = () => setFullW(Math.ceil(el.scrollWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 바깥을 누르거나 Esc면 다시 접힌다
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.blur();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const hoverable = () => typeof window !== "undefined" && matchMedia("(hover: hover)").matches;

  return (
    <span className="seal-slot">
      <a
        ref={ref}
        href="/deleteseoul"
        className={`nav-explore seal${open ? " open" : ""}`}
        style={{ "--full-w": `${fullW}px` } as React.CSSProperties}
        aria-label={t(ui.explore)}
        title={t(ui.explore)}
        onMouseEnter={() => hoverable() && setOpen(true)}
        onMouseLeave={() => hoverable() && document.activeElement !== ref.current && setOpen(false)}
        // 키보드로 왔을 때만 바로 펼친다 (터치는 첫 탭이 펼치기여야 하므로)
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          if (!open) return setOpen(true);
          deleteCrossing(() => router.push("/deleteseoul"));
        }}
      >
        <svg className="seal-ring" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <path id="seal-path" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
          </defs>
          <circle cx="50" cy="50" r="48" className="seal-edge" />
          <text className="seal-words">
            <textPath href="#seal-path" textLength="231" lengthAdjust="spacing">
              DELETE · SEOUL · DELETE · SEOUL ·
            </textPath>
          </text>
        </svg>
        <span className="seal-han" aria-hidden>
          空
        </span>
        <span className="seal-full" ref={fullRef} aria-hidden>
          <span className="ne-han">空</span>
          <span className="ne-text" data-text="DELETE SEOUL">
            DELETE SE<span className="ne-dead">O</span>UL
          </span>
          <span className="ne-arrow">↗</span>
        </span>
      </a>
    </span>
  );
}
