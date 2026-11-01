"use client";

import { about, contact, ui, works, type SectionId } from "@/data/site";
import { poems } from "@/data/poems";
import { useLang } from "./LangProvider";

// 일반 페이지와 3D 도시의 홀로그램 패널이 같이 쓰는 본문
export default function SectionBody({ id, inExplore = false }: { id: SectionId; inExplore?: boolean }) {
  const { t, lang } = useLang();
  if (id === "about") {
    return (
      <div className="section-body">
        {about.paragraphs.map((p, i) => (
          <p key={i}>{t(p)}</p>
        ))}
      </div>
    );
  }
  if (id === "writing") {
    return (
      <div className="poems">
        {lang === "en" && <p className="poems-note">{ui.poemsNote.en}</p>}
        {!inExplore && (
          <ol className="poem-toc">
            {poems.map((p, i) => (
              <li key={p.title}>
                <a href={`#poem-${i}`}>{p.title}</a> <span className="meta">{p.date}</span>
              </li>
            ))}
          </ol>
        )}
        {poems.map((p, i) => (
          <article key={p.title} id={inExplore ? undefined : `poem-${i}`} className={`poem ${p.prose ? "prose" : ""}`} lang="ko">
            <h3>{p.title}</h3>
            <p className="meta">{p.date}</p>
            {p.body.split("\n\n").map((stanza, i) => (
              <p key={i} className="stanza">
                {stanza}
              </p>
            ))}
          </article>
        ))}
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
  return (
    <div className="section-body">
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
