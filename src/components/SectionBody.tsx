"use client";

import { useEffect, useState } from "react";

import { about, contact, ui, works, type SectionId } from "@/data/site";
import { poems } from "@/data/poems";
import { useLang } from "./LangProvider";
import Diary from "./Diary";

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

// 일반 페이지와 3D 도시의 홀로그램 패널이 같이 쓰는 본문
export default function SectionBody({ id, inExplore = false }: { id: SectionId; inExplore?: boolean }) {
  const { t } = useLang();
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
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
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
  if (id === "works") {
    return <WorksList inExplore={inExplore} />;
  }
  return null;
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
          <details
            key={p.title}
            name="poems"
            id={inExplore ? undefined : `poem-${i}`}
            className={`poem ${p.prose ? "prose" : ""}`}
            lang="ko"
          >
            <summary>
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
              <button
                type="button"
                className="poem-fold"
                onClick={(e) => {
                  const d = e.currentTarget.closest("details");
                  if (!d) return;
                  d.open = false;
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

function WorksList({ inExplore }: { inExplore: boolean }) {
  const { t, lang } = useLang();
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
          {w.link && !(inExplore && w.link === "/explore") && (
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
