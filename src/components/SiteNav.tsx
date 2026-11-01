"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { profile, sections, ui } from "@/data/site";
import { LangToggle, useLang } from "./LangProvider";

export default function SiteNav() {
  const path = usePathname();
  const { t } = useLang();
  return (
    <header className="nav">
      <Link href="/" className="nav-logo">
        {profile.name}
      </Link>
      <nav className="nav-links" aria-label="Main">
        {sections.map((s) => (
          <Link key={s.id} href={s.href} className={path === s.href ? "active" : ""}>
            {s.label}
          </Link>
        ))}
        {/* 3D 도시 입구: 붉은 인장 + 지직거리는 네온 글씨 */}
        <Link href="/explore" className="nav-explore">
          <span className="ne-seal" aria-hidden>
            入
          </span>
          <span className="ne-text" data-text={t(ui.explore)}>
            {t(ui.explore)}
          </span>
        </Link>
      </nav>
      <LangToggle className="nav-lang" />
    </header>
  );
}
