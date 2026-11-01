"use client";

import { about, contact, ui, works, type SectionId } from "@/data/site";
import { poems } from "@/data/poems";
import { useLang } from "./LangProvider";
import EmailLink from "./EmailLink";

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
  if (id === "writing") {
    return (
      <div className="poems">
        {lang === "en" && <p className="poems-note">{ui.poemsNote.en}</p>}
        {/* 제목과 첫 줄만 보이고, 제목을 누르면 그 시 하나만 펼쳐진다 (다른 시는 접힌다) */}
        {poems.map((p, i) => {
          const first = p.body.split("\n").find((l) => l.trim()) ?? "";
          return (
            <details key={p.title} name="poems" id={inExplore ? undefined : `poem-${i}`} className={`poem ${p.prose ? "prose" : ""}`} lang="ko">
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
  return null;
}
