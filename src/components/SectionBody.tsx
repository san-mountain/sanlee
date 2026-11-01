"use client";

import { about, contact, ui, works, type SectionId } from "@/data/site";
import { useLang } from "./LangProvider";

// 일반 페이지와 3D 도시의 홀로그램 패널이 같이 쓰는 본문
export default function SectionBody({ id, inExplore = false }: { id: SectionId; inExplore?: boolean }) {
  const { t } = useLang();
  if (id === "about") {
    return (
      <div className="section-body">
        {about.paragraphs.map((p, i) => (
          <p key={i}>{t(p)}</p>
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
              <img className="work-img" src={w.image} alt={t(w.title)} loading="lazy" />
            )}
            <h3>{t(w.title)}</h3>
            <p className="meta">
              {w.year} · {t(w.medium)}
            </p>
            <p>{t(w.description)}</p>
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
