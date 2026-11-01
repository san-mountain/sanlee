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
        <Link href="/explore" className="nav-explore">
          {t(ui.explore)}
        </Link>
      </nav>
      <LangToggle className="nav-lang" />
    </header>
  );
}
