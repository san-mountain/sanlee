"use client";

import Han from "./Han";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCrossing } from "./deleteCrossing";
import { ui } from "@/data/site";
import { useLang } from "./LangProvider";

// DELETE SEOUL 입구: 空이 적힌 네온 원. 둘레의 글자가 천천히 돈다.
// 한 번 누르면 원이 펼쳐지며 전체 제목이 드러나고, 다시 누르면 지워지며 도시로 건너간다.
// 휴대폰 화면에서만 보인다(오른쪽 아래). 태블릿·PC는 메뉴 줄의 원래 간판을 쓴다.
const TIP_KEY = "sanlee-seal-tip";

export default function NeonSeal() {
  const router = useRouter();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [fullH, setFullH] = useState(0);
  const ref = useRef<HTMLAnchorElement>(null);
  const fullRef = useRef<HTMLSpanElement>(null);
  // 처음 온 사람에게만 한 번: 원 옆에 '도시로 들어가기' 말풍선이 잠깐 떴다가 사라진다
  const [tip, setTip] = useState(false);
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(TIP_KEY) !== null;
      if (!seen) localStorage.setItem(TIP_KEY, "1");
    } catch {}
    if (seen) return;
    const a = setTimeout(() => setTip(true), 1200);
    const b = setTimeout(() => setTip(false), 5200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  // 펼친 높이는 세로로 세운 제목의 실제 높이로 (글꼴이 바뀌어도 맞게)
  useEffect(() => {
    const el = fullRef.current;
    if (!el) return;
    const measure = () => setFullH(Math.ceil(el.scrollHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 스크롤하는 동안은 작고 흐리게 물러나 그림을 가리지 않는다. 멈추면 돌아온다
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      ref.current?.classList.add("moving");
      clearTimeout(t);
      t = setTimeout(() => ref.current?.classList.remove("moving"), 320);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  // Esc면 다시 접힌다. 바깥 터치는 아래의 투명한 막이 받아서 접기만 한다
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.blur();
      }
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
    {/* 펼쳐진 동안 화면 전체를 덮는 투명한 막: 바깥을 누르면 접히기만 하고, 그 아래 그림·링크는 눌리지 않는다 */}
    {open && (
      <span
        className="seal-veil"
        aria-hidden
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }}
      />
    )}
    {!open && (
      <span className={`seal-tip${tip ? " on" : ""}`} aria-hidden>
        {t(ui.sealTip)}
      </span>
    )}
    <a
      ref={ref}
      href="/deleteseoul"
      className={`nav-explore seal${open ? " open" : ""}`}
      style={{ "--full-h": `${fullH}px` } as React.CSSProperties}
      aria-label={t(ui.explore)}
      title={t(ui.explore)}
      // 키보드로 왔을 때만 바로 펼친다 (터치는 첫 탭이 펼치기여야 하므로)
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && setOpen(true)}
      // 키보드로 다른 곳에 포커스가 옮겨 갈 때만 접는다 (터치로 막을 누를 때 막이 먼저 사라지지 않게)
      onBlur={(e) => e.relatedTarget && setOpen(false)}
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
        <Han ch="空" />
      </span>
      <span className="seal-full" ref={fullRef} aria-hidden>
        <span className="ne-han"><Han ch="空" /></span>
        <span className="ne-text" data-text="DELETE SEOUL">
          DELETE SE<span className="ne-dead">O</span>UL
        </span>
        <span className="ne-arrow">↗</span>
      </span>
    </a>
    </>
  );
}
