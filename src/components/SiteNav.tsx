"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { deleteCrossing } from "./deleteCrossing";
import NeonSeal from "./NeonSeal";
import { profile, sections, ui } from "@/data/site";
import { LangToggle, useLang } from "./LangProvider";

export default function SiteNav() {
  const path = usePathname();
  const router = useRouter();
  const { t } = useLang();
  // 게임에서 돌아왔을 때 지워지던 상태를 풀어 준다
  useEffect(() => document.body.classList.remove("deleting"), []);
  return (
    <>
    <header className="nav">
      {/* 이름과 메뉴는 늘 영문이라 lang="en"으로 고정: 시스템 글꼴이 페이지 언어(ko/en)에 따라 다른 글꼴을 고르지 않게 */}
      <Link href="/" className="nav-logo">
        <span lang="en">{profile.name}</span>
        <span className="nav-logo-han" lang="ko-Hani">
          李
          <span className="nav-logo-san">
            山
            {/* 작품에 되풀이되는 거꾸로 된 왕관: 山이 비뚤게 쓰고 있다 (파비콘과 같은 모양, 작은 크기라 눈 선을 굵게) */}
            <svg className="nav-logo-crown" viewBox="0 0 32 32" aria-hidden focusable="false">
              <path fill="#FFDA35" stroke="#211B0F" strokeWidth="1.6" strokeLinejoin="round" d="M2.2 2H29.8V9L31 27.4L23.3 21.3L16 29.4L8.7 21.3L1 27.4L2.2 9Z" />
              <g fill="none" stroke="#271D04" strokeWidth="2" strokeLinecap="round">
                <path d="M7.85 13.75H13.65M9.3 11.2L12.2 16.3M12.2 11.2L9.3 16.3" />
                <path d="M18.35 13.75H24.15M19.8 11.2L22.7 16.3M22.7 11.2L19.8 16.3" />
              </g>
            </svg>
          </span>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {sections.map((s) => (
          <Link key={s.id} href={s.href} lang="en" className={path === s.href ? "active" : ""} aria-current={path === s.href ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
        {/* 3D 도시 작품 입구: 작품 제목을 네온사인처럼. SEOUL의 O 하나는 고장 난 관처럼 깜빡인다 */}
        <Link
          href="/deleteseoul"
          className="nav-explore nav-explore-pill"
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
    {/* 휴대폰: 오른쪽 아래에 떠 있는 空 네온 원 (헤더의 backdrop-filter 밖에 두어야 화면에 고정된다) */}
    <NeonSeal />
    </>
  );
}
