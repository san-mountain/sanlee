"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { deleteCrossing } from "./deleteCrossing";
import { profile, sections, ui } from "@/data/site";
import { LangToggle, useLang } from "./LangProvider";

export default function SiteNav() {
  const path = usePathname();
  const router = useRouter();
  const { t } = useLang();
  // 게임에서 돌아왔을 때 지워지던 상태를 풀어 준다
  useEffect(() => document.body.classList.remove("deleting"), []);
  return (
    <header className="nav">
      <Link href="/" className="nav-logo">
        {profile.name}
        <span className="nav-logo-han" lang="ko-Hani">李山</span>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {sections.map((s) => (
          <Link key={s.id} href={s.href} className={path === s.href ? "active" : ""} aria-current={path === s.href ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
        {/* 3D 도시 작품 입구: 작품 제목을 네온사인처럼. SEOUL의 O 하나는 고장 난 관처럼 깜빡인다 */}
        <Link
          href="/deleteseoul"
          className="nav-explore"
          aria-label={t(ui.explore)}
          title={t(ui.explore)}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            deleteCrossing(() => router.push("/deleteseoul"));
          }}
        >
          <span className="ne-han" aria-hidden>
            空
          </span>
          <span className="ne-text" data-text="DELETE SEOUL" aria-hidden>
            DELETE SE<span className="ne-dead">O</span>UL
          </span>
          <span className="ne-arrow" aria-hidden>
            ↗
          </span>
        </Link>
      </nav>
      <LangToggle className="nav-lang" />
    </header>
  );
}
