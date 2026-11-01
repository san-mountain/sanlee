"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// 다른 페이지의 맨 위(메뉴 포함)에서 시작하게 하는 링크.
// Next 기본 이동은 새 페이지의 고정되지 않은 첫 요소(작품 이미지 줄)까지만 스크롤해서, 메뉴와 탭이 화면 위로 잘린다.
export default function TopLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "instant" });
        router.push(href, { scroll: false });
      }}
    >
      {children}
    </Link>
  );
}
