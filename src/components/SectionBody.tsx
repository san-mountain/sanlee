"use client";

import { useEffect, useState } from "react";
import { about, contact, ui, works, type SectionId, type Work } from "@/data/site";
import { poems } from "@/data/poems";
import { useLang } from "./LangProvider";
import EmailLink from "./EmailLink";
import Diary from "./Diary";
import { unfold } from "./unfold";

// 일반 페이지와 3D 도시의 홀로그램 패널이 같이 쓰는 본문
export default function SectionBody({ id, inExplore = false }: { id: SectionId; inExplore?: boolean }) {
  const { t, lang } = useLang();
  if (id === "about") {
    return (
      <div className="section-body">
        {about.paragraphs.map((p, i) => (
          <p key={i}>{t(p)}</p>
        ))}
        <h2 id="contact" className="contact-title">
          {t(ui.contactTitle)}
        </h2>
        <p>
          <EmailLink />
        </p>
        {contact.links.map((l) => (
          <p key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </p>
        ))}
      </div>
    );
  }
  if (id === "writing") return <WritingTabs inExplore={inExplore} />;
  if (id === "works" && inExplore) return <WorksViewer list={works} />;
  if (id === "works") {
    return (
      <ul className="works">
        {works.map((w) => (
          <li key={w.title.en}>
            {w.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="work-img"
                src={w.image}
                alt={t(w.title)}
                width={w.width}
                height={w.height}
                loading="lazy"
                decoding="async"
              />
            )}
            <p className="caption">
              <strong>{lang === "ko" ? `〈${w.title.ko}〉` : <em>{w.title.en}</em>}</strong>, {w.date.slice(0, 4)}
              <br />
              {t(w.medium)}, {t(w.size)}
            </p>
            {w.description && <p className="work-desc">{t(w.description)}</p>}
            {w.link && !(inExplore && w.link === "/deleteseoul") && (
              <p>
                <a href={w.link} className="work-link">
                  {t(ui.viewWork)}
                </a>
              </p>
            )}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

// 3D 도시의 작업 터미널: 한 번에 한 점씩 크게 보고, 화살표·스와이프·아래 썸네일로 넘긴다
function WorksViewer({ list }: { list: Work[] }) {
  const { t, lang } = useLang();
  const [i, setI] = useState(0);
  const n = list.length;
  const go = (d: number) => setI((v) => (v + d + n) % n);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setI((v) => (v + 1) % n);
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setI((v) => (v - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n]);
  const [x0, setX0] = useState<number | null>(null);
  const w = list[i];
  return (
    <div className="viewer">
      <div
        className="viewer-stage"
        onPointerDown={(e) => setX0(e.clientX)}
        onPointerUp={(e) => {
          if (x0 !== null && Math.abs(e.clientX - x0) > 40) go(e.clientX < x0 ? 1 : -1);
          setX0(null);
        }}
      >
        {w.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={w.image} className="viewer-img" src={w.image} alt={t(w.title)} width={w.width} height={w.height} decoding="async" />
        ) : (
          // 이 작품은 지금 보고 있는 바로 그 작품: 그림 대신 '현재 위치' 표시
          <div className="viewer-here">
            <span className="vh-badge">{lang === "ko" ? "● 지금 관람 중" : "● VIEWING NOW"}</span>
            <span className="vh-title">DELETE SEOUL</span>
            <span className="vh-pin">{lang === "ko" ? "▼ 지금 있는 곳" : "▼ YOU ARE HERE"}</span>
          </div>
        )}
        <button type="button" className="viewer-nav prev" aria-label={t(ui.prev)} onClick={() => go(-1)}>
          ‹
        </button>
        <button type="button" className="viewer-nav next" aria-label={t(ui.next)} onClick={() => go(1)}>
          ›
        </button>
      </div>
      <div className="viewer-meta">
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
        </p>
        {!w.image && (
          <p className="viewer-here-note">
            {lang === "ko"
              ? "지금 보고 있는 작품이 당신이 걷고 있는 도시입니다. 이곳에서의 방문 기록은 이 기기에 저장됩니다."
              : "The work you are looking at is the city you are walking through. Your visit here is recorded on this device."}
          </p>
        )}
        <span className="viewer-count">
          {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </span>
      </div>
      <div className="viewer-strip" role="tablist">
        {list.map((o, k) => (
          <button key={o.title.en} type="button" role="tab" aria-selected={k === i} aria-label={t(o.title)} className={k === i ? "on" : ""} onClick={() => setI(k)}>
            {o.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.image} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="vh-thumb">空</span>
            )}
          </button>
        ))}
      </div>
      {/* 다음 그림을 미리 받아 둔다 */}
      {list[(i + 1) % n].image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="viewer-preload" src={list[(i + 1) % n].image} alt="" aria-hidden />
      )}
    </div>
  );
}

function Poems({ inExplore }: { inExplore: boolean }) {
  const { lang } = useLang();
    return (
      <div className="poems">
        {lang === "en" && <p className="poems-note">{ui.poemsNote.en}</p>}
        {/* 제목과 첫 줄만 보이고, 제목을 누르면 그 시 하나만 펼쳐진다 (다른 시는 접힌다) */}
        {poems.map((p, i) => {
          const first = p.body.split("\n").find((l) => l.trim()) ?? "";
          return (
            <details key={p.title} data-group="poems" id={inExplore ? undefined : `poem-${i}`} className={`poem ${p.prose ? "prose" : ""}`} lang="ko">
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  const d = e.currentTarget.parentElement as HTMLDetailsElement;
                  unfold(d, !d.open || d.dataset.closing === "1");
                }}
              >
                <span className="poem-head">
                  <span className="poem-title">{p.title}</span>
                  <span className="poem-first">{first.trim()}</span>
                </span>
                <span className="meta">{p.date}</span>
              </summary>
              <div className="poem-body">
                {p.body.split("\n\n").map((stanza, j) => (
                  <p key={j} className="stanza">
                    {stanza}
                  </p>
                ))}
                <span className="poem-seal" aria-hidden>
                  山
                </span>
                <button
                  type="button"
                  className="poem-fold"
                  onClick={(e) => {
                    const d = e.currentTarget.closest("details");
                    if (!d) return;
                    unfold(d, false);
                    d.querySelector("summary")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                  }}
                >
                  {lang === "ko" ? "↑ 접기" : "↑ Fold"}
                </button>
              </div>
            </details>
          );
        })}
      </div>
    );
}

const WRITING_TABS = [
  { id: "poems", label: { ko: "시", en: "Poems" } },
  { id: "diary", label: { ko: "일기", en: "Diary" } },
] as const;
type WritingTab = (typeof WRITING_TABS)[number]["id"];

// Writing 안의 탭: 시 / 일기. 주소 끝 #diary 로 바로 일기 탭을 열 수 있다.
function WritingTabs({ inExplore }: { inExplore: boolean }) {
  const { t } = useLang();
  const [tab, setTab] = useState<WritingTab>("poems");
  useEffect(() => {
    if (!inExplore && window.location.hash.startsWith("#diary")) setTab("diary");
  }, [inExplore]);
  const select = (id: WritingTab) => {
    setTab(id);
    if (!inExplore) history.replaceState(null, "", id === "diary" ? "#diary" : window.location.pathname);
  };
  return (
    <>
      <div className="cat-tabs" role="tablist" aria-label="Writing">
        {WRITING_TABS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={tab === c.id}
            className={tab === c.id ? "on" : ""}
            onClick={() => select(c.id)}
          >
            {t(c.label)}
          </button>
        ))}
      </div>
      {tab === "poems" ? <Poems inExplore={inExplore} /> : <Diary inExplore={inExplore} />}
    </>
  );
}
