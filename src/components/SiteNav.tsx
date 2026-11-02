"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NeonSeal from "./NeonSeal";
import { profile, sections } from "@/data/site";
import { LangToggle } from "./LangProvider";

export default function SiteNav() {
  const path = usePathname();
  // 게임에서 돌아왔을 때 지워지던 상태를 풀어 준다
  useEffect(() => document.body.classList.remove("deleting"), []);
  return (
    <header className="nav">
      {/* 이름과 메뉴는 늘 영문이라 lang="en"으로 고정: 시스템 글꼴이 페이지 언어(ko/en)에 따라 다른 글꼴을 고르지 않게 */}
      <Link href="/" className="nav-logo">
        <span lang="en">{profile.name}</span>
        <span className="nav-logo-han" lang="ko-Hani">李山</span>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {sections.map((s) => (
          <Link key={s.id} href={s.href} lang="en" className={path === s.href ? "active" : ""} aria-current={path === s.href ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
      </nav>
      {/* 3D 도시 작품 입구: 空이 적힌 네온 원 */}
      <NeonSeal />
      <LangToggle className="nav-lang" />
    </header>
  );
}
