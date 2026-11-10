"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteCrossing } from "./deleteCrossing";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ui, works, type Work } from "@/data/site";
import { useLang } from "./LangProvider";

function Caption({ w }: { w: Work }) {
  const { t, lang } = useLang();
  return (
    <p className="caption">
      <span className="ct">
        {lang === "ko" ? (
          <>
            <span className="br">〈</span>
            {w.title.ko}
            <span className="br">〉</span>
          </>
        ) : (
          <em>{w.title.en}</em>
        )}
        , {w.date.slice(0, 4)}
      </span>
      <br />
      <span className="cm">
        {t(w.medium)}, {t(w.size)}
      </span>
      {w.credit && (
        <>
          <br />
          <span className="cm">{t(w.credit)}</span>
        </>
      )}
    </p>
  );
}

type Cat = "painting" | "sculpture" | "interactive";
type View = "grid" | "index" | "wall";
const CATS: { id: Cat; label: { ko: string; en: string } }[] = [
  { id: "painting", label: ui.catPainting },
  { id: "sculpture", label: ui.catSculpture },
  { id: "interactive", label: ui.catInteractive },
];
const VIEWS: { id: View; label: { ko: string; en: string } }[] = [
  { id: "grid", label: ui.viewGrid },
  { id: "index", label: ui.workIndex },
  { id: "wall", label: ui.viewWall },
];

// 보기 아이콘: 모두 18×18 칸, 선 굵기 1.5, 모서리 각진 선으로 통일
const ICON = { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "square" as const, "aria-hidden": true };
function ViewIcon({ v }: { v: View }) {
  if (v === "grid")
    return (
      <svg {...ICON}>
        <rect x="2.75" y="2.75" width="5" height="5" />
        <rect x="10.25" y="2.75" width="5" height="5" />
        <rect x="2.75" y="10.25" width="5" height="5" />
        <rect x="10.25" y="10.25" width="5" height="5" />
      </svg>
    );
  if (v === "index")
    return (
      <svg {...ICON}>
        <path d="M2.75 4.25h12.5M2.75 9h12.5M2.75 13.75h12.5" />
      </svg>
    );
  // 벽: 바닥선 위에 크기가 다른 그림 두 점
  return (
    <svg {...ICON}>
      <rect x="2.75" y="3.25" width="6" height="8.5" />
      <rect x="11.25" y="6.25" width="4" height="5.5" />
      <path d="M1.5 15.25h15" />
    </svg>
  );
}
function Chevron() {
  return (
    <svg {...ICON} width={10} height={10} viewBox="0 0 10 10">
      <path d="M2 3.75l3 3 3-3" strokeLinecap="butt" />
    </svg>
  );
}

// 보기 전환: 탭 줄 오른쪽에 지금 보기의 아이콘 하나. 누르면 세 아이콘이 가로로 펼쳐진다.
function ViewMenu({ view, onPick }: { view: View; onPick: (v: View) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const cur = VIEWS.find((o) => o.id === view)!;
  return (
    <div className="view-menu" ref={box}>
      <button
        type="button"
        className="view-menu-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t(ui.view)}: ${t(cur.label)}`}
        title={t(cur.label)}
        onClick={() => setOpen((v) => !v)}
      >
        <ViewIcon v={view} />
        <Chevron />
      </button>
      {open && (
        <div className="view-menu-list" role="menu">
          {VIEWS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={view === o.id}
              aria-label={t(o.label)}
              title={t(o.label)}
              className={view === o.id ? "on" : ""}
              onClick={() => {
                onPick(o.id);
                setOpen(false);
              }}
            >
              <ViewIcon v={o.id} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// "39.4 × 27.2 cm" (세로 × 가로) → [세로, 가로]
function cm(w: Work): [number, number] | null {
  const m = w.size.en.match(/([\d.]+)\s*×\s*([\d.]+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

// 그림이 제자리에서 커지고 돌아가는 전환. 지원하지 않거나 움직임 줄이기면 그냥 바꾼다
type VT = { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
function morph(update: () => void, from?: HTMLElement | null, to?: () => HTMLElement | null) {
  const d = document as unknown as VT;
  if (!d.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
  if (from) from.style.viewTransitionName = "art";
  const vt = d.startViewTransition(() => {
    if (from) from.style.viewTransitionName = "";
    flushSync(update);
    const el = to?.();
    if (el) el.style.viewTransitionName = "art";
  });
  vt.finished.finally(() => {
    const el = to?.();
    if (el) el.style.viewTransitionName = "";
  });
}

// 일반 Works 페이지: 그리드 / 목록 / 벽 세 가지 보기, 사진을 누르면 크게 보기
export default function WorksGrid({ limit }: { limit?: number }) {
  const { t } = useLang();
  const router = useRouter();
  const feature = works.filter((w) => !w.image);
  const images = works.filter((w) => w.image);
  const [open, setOpen] = useState<number | null>(null);
  const [tab, setTab] = useState<Cat>("painting");
  // 사진이 있는 작업은 category(없으면 그림)에 따라 그림·조각 탭에 나뉜다. 첫 화면(limit)에는 둘 다 최근 순으로
  const shown = limit ? images.slice(0, limit) : images.filter((w) => (w.category ?? "painting") === tab);
  const gallery = (!!limit || tab !== "interactive") && shown.length > 0;
  const [view, setView] = useState<View>("grid");
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const lbImg = useRef<HTMLImageElement>(null);
  const thumb = (i: number) => root.current?.querySelector<HTMLElement>(`[data-art="${i}"]`) ?? null;

  // 주소 끝의 #sculpture, #wall 같은 해시로 탭과 보기를 바로 열 수 있게
  useEffect(() => {
    if (limit) return;
    const h = location.hash.slice(1);
    if (CATS.some((c) => c.id === h)) setTab(h as Cat);
    if (VIEWS.some((v) => v.id === h)) setView(h as View);
  }, [limit]);
  const selectTab = (c: Cat) => {
    setOpen(null);
    setTab(c);
    history.replaceState(null, "", `#${c}`);
  };
  const selectView = (v: View) => {
    setView(v);
    history.replaceState(null, "", v === "grid" ? `#${tab}` : `#${v}`);
  };

  const openAt = (i: number) => {
    setHover(null);
    morph(() => setOpen(i), thumb(i), () => lbImg.current);
  };
  const openRef = useRef(open);
  openRef.current = open;
  const close = useCallback(() => {
    // 닫을 때는 지금 보던 그림의 제자리로 돌아간다
    const cur = openRef.current;
    morph(() => setOpen(null), lbImg.current, () => (cur === null ? null : thumb(cur)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + shown.length) % shown.length)),
    [shown.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step, close]);

  const cur = open === null ? null : shown[open];
  const v = limit ? "grid" : view;

  return (
    <div ref={root}>
      {!limit && (
        <div className="works-bar">
          <div className="cat-tabs" role="tablist" aria-label="Categories">
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={tab === c.id}
                className={tab === c.id ? "on" : ""}
                onClick={() => selectTab(c.id)}
              >
                {t(c.label)}
              </button>
            ))}
          </div>
          {gallery && (
            <ViewMenu view={view} onPick={selectView} />
          )}
        </div>
      )}

      {gallery && v === "grid" && (
        <ul className="grid">
          {shown.map((w, i) => (
            <li key={w.title.en}>
              <button type="button" className="grid-item" onClick={() => openAt(i)} aria-label={t(w.title)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img data-art={i} src={w.image} alt={t(w.title)} width={w.width} height={w.height} loading="lazy" decoding="async" />
              </button>
              <Caption w={w} />
            </li>
          ))}
        </ul>
      )}

      {gallery && v === "index" && (
        <ol className="work-index" onMouseLeave={() => setHover(null)}>
          {shown.map((w, i) => (
            <li key={w.title.en}>
              <button
                type="button"
                onClick={() => openAt(i)}
                onMouseMove={(e) => setHover({ i, x: e.clientX, y: e.clientY })}
              >
                <span className="wi-title">{t(w.title)}</span>
                <span className="wi-medium">{t(w.medium)}</span>
                <span className="wi-size">{w.size.en}</span>
              </button>
            </li>
          ))}
          {hover && (
            // 제목 위에 마우스를 올리면 작은 그림이 따라 뜬다
            // eslint-disable-next-line @next/next/no-img-element
            <img className="wi-peek" data-art={hover.i} src={shown[hover.i].image} alt="" style={{ left: hover.x + 18, top: hover.y - 60 }} />
          )}
        </ol>
      )}

      {gallery && v === "wall" && <Wall works={shown} onOpen={openAt} />}

      {tab === "sculpture" && !shown.length && <p className="cat-empty">{t(ui.sculptureEmpty)}</p>}

      {tab === "interactive" && (
        <>
          {feature.map((w) => (
            <Link
              key={w.title.en}
              href={w.link ?? "#"}
              className="feature-card"
              onClick={(e) => {
                // 왼쪽 네온사인과 같은 진입: 페이지 글자가 지워지고 어두워진 뒤 들어간다
                if (!w.link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                deleteCrossing(() => router.push(w.link!));
              }}
            >
              <div className="feature-art" aria-hidden>
                <span>DELETE</span>
                <span>SEOUL</span>
              </div>
              <div className="feature-text">
                <Caption w={w} />
                {w.description && <p className="work-desc">{t(w.description)}</p>}
                <span className="work-link">{t(ui.enter)}</span>
              </div>
            </Link>
          ))}
        </>
      )}

      {cur && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={t(cur.title)} onClick={close}>
          <figure onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={lbImg} src={cur.image} alt={t(cur.title)} width={cur.width} height={cur.height} />
            <figcaption>
              <Caption w={cur} />
            </figcaption>
          </figure>
          {shown.length > 1 && (
            <>
              <button type="button" className="lb-nav lb-prev" aria-label={t(ui.prev)} onClick={(e) => { e.stopPropagation(); step(-1); }}>
                ‹
              </button>
              <button type="button" className="lb-nav lb-next" aria-label={t(ui.next)} onClick={(e) => { e.stopPropagation(); step(1); }}>
                ›
              </button>
            </>
          )}
          <button type="button" className="lb-close" aria-label={t(ui.close)} onClick={(e) => { e.stopPropagation(); close(); }}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// 벽 보기: 실제 크기 비율로 한 줄에 건다. 그림 가운데를 바닥에서 150cm에 맞추고, 왼쪽에 170cm 사람을 세운다
const WALL_H = 200; // 벽 높이(cm)
const CENTER = 150;
const GAP = 34;
function Wall({ works: list, onOpen }: { works: Work[]; onOpen: (i: number) => void }) {
  const { t } = useLang();
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(2.4); // 1cm당 픽셀
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setK(Math.max(1.6, Math.min(3, (el.clientHeight || 560) / WALL_H)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  let x = 70; // 사람 자리 다음부터
  const items = list.map((w, i) => {
    const s = cm(w) ?? [39.4, 27.2];
    const it = { w, i, h: s[0], wd: s[1], x };
    x += s[1] + GAP;
    return it;
  });
  return (
    <figure className="wall">
      <div className="wall-scroll" ref={box}>
        <div className="wall-room" style={{ width: x * k, height: WALL_H * k }}>
          <svg className="wall-figure" viewBox="0 0 40 170" style={{ left: 16 * k, height: 170 * k, width: 40 * k }} aria-hidden>
            <circle cx="20" cy="11" r="10" />
            <rect x="9" y="24" width="22" height="66" rx="8" />
            <rect x="2" y="27" width="6" height="58" rx="3" />
            <rect x="32" y="27" width="6" height="58" rx="3" />
            <rect x="10" y="84" width="9" height="86" rx="4" />
            <rect x="21" y="84" width="9" height="86" rx="4" />
          </svg>
          {items.map(({ w, i, h, wd, x }) => (
            <button
              key={w.title.en}
              type="button"
              className="wall-art"
              style={{ left: x * k, bottom: (CENTER - h / 2) * k, width: wd * k, height: h * k }}
              onClick={() => onOpen(i)}
              aria-label={t(w.title)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img data-art={i} src={w.image} alt="" loading="lazy" decoding="async" />
              <span className="wall-label">{t(w.title)}</span>
            </button>
          ))}
          <span className="wall-floor" />
        </div>
      </div>
      <figcaption className="wall-note">{t(ui.wallNote)}</figcaption>
    </figure>
  );
}
