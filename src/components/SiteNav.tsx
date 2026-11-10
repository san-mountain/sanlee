"use client";

import Han from "./Han";
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
        {/* 한자 두 글자는 글꼴 파일 없이 획 모양으로 그린다 (Han) */}
        <span className="nav-logo-han" lang="ko-Hani" role="img" aria-label="李山">
          <Han ch="李" />
          {/* 거꾸로 뒤집힌 山: 작품에 되풀이되는 거꾸로 된 왕관처럼 보인다 */}
          <Han ch="山" className="nav-logo-san" />
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
          // 게임의 스타일·글꼴을 일반 페이지에서 미리 받지 않는다 (들어갈 때 받는다)
          prefetch={false}
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
            <Han ch="空" />
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
