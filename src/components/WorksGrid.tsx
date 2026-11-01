"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ui, works, type Work } from "@/data/site";
import { useLang } from "./LangProvider";

function Caption({ w }: { w: Work }) {
  const { t, lang } = useLang();
  return (
    <p className="caption">
      <strong>{lang === "ko" ? `〈${w.title.ko}〉` : <em>{w.title.en}</em>}</strong>, {w.date.slice(0, 4)}
      <br />
      {t(w.medium)}, {t(w.size)}
    </p>
  );
}

// 일반 Works 페이지: 화면 폭에 따라 1~3열 메이슨리, 사진을 누르면 크게 보기
export default function WorksGrid({ limit }: { limit?: number }) {
  const { t } = useLang();
  const feature = works.filter((w) => !w.image);
  const images = works.filter((w) => w.image);
  const shown = limit ? images.slice(0, limit) : images;
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + shown.length) % shown.length)),
    [shown.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  const cur = open === null ? null : shown[open];

  return (
    <>
      {!limit && (
        <nav className="cat-nav" aria-label="Categories">
          <a href="#painting">{t(ui.catPainting)}</a>
          <a href="#sculpture">{t(ui.catSculpture)}</a>
          <a href="#interactive">{t(ui.catInteractive)}</a>
        </nav>
      )}

      {!limit && <h2 id="painting" className="cat-title">{t(ui.catPainting)}</h2>}
      <ul className="grid">
        {shown.map((w, i) => (
          <li key={w.title.en}>
            <button type="button" className="grid-item" onClick={() => setOpen(i)} aria-label={t(w.title)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.image} alt={t(w.title)} width={w.width} height={w.height} loading="lazy" decoding="async" />
            </button>
            <Caption w={w} />
          </li>
        ))}
      </ul>

      {!limit && (
        <>
          <h2 id="sculpture" className="cat-title">{t(ui.catSculpture)}</h2>
          <p className="cat-empty">{t(ui.sculptureEmpty)}</p>

          <h2 id="interactive" className="cat-title">{t(ui.catInteractive)}</h2>
          {feature.map((w) => (
          <Link key={w.title.en} href={w.link ?? "#"} className="feature-card">
            <div className="feature-art" aria-hidden>
              <span>NEO-SEOUL</span>
              <span>2087</span>
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
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={t(cur.title)} onClick={() => setOpen(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.image} alt={t(cur.title)} width={cur.width} height={cur.height} />
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
          <button type="button" className="lb-close" aria-label={t(ui.close)} onClick={() => setOpen(null)}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
