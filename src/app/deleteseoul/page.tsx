import type { Metadata, Viewport } from "next";
import ExploreClient from "@/explore/ExploreClient";

// 결말 화면의 '공유하기'는 ?end=accept|reject|ghost 주소를 건넨다. 그 주소의 미리보기 카드만 결말마다 다르다 (들어오면 평소처럼 처음부터)
const ENDS = {
  accept: { ko: "결말: 수락 — 안전한 이별", line: "뒤따라오던 발소리가 더는 들리지 않는다." },
  reject: { ko: "결말: 거부 — 두 번째 정지 시민", line: "누군가 두 사람 사이에 작은 등 하나를 놓고 갔다." },
  ghost: { ko: "결말: 空 — 다음 한 걸음", line: "구름 아래에 무엇이 있었는지는 어디에도 기록되지 않았다." },
} as const;
const BASE = {
  title: "DELETE SEOUL · SAN LEE",
  description: "포트폴리오의 기록을 따라 구름 위 서울을 걷는 3D 인터랙티브 작품.",
  // 홈 화면에 추가해 열면 주소창 없이 앱처럼 뜬다 (아이폰 사파리는 이 방법뿐)
  manifest: "/deleteseoul.webmanifest",
  appleWebApp: { capable: true, title: "DELETE SEOUL", statusBarStyle: "black-translucent" as const },
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const raw = (await searchParams).end;
  const k = typeof raw === "string" && raw in ENDS ? (raw as keyof typeof ENDS) : null;
  const e = k ? ENDS[k] : null;
  const title = e ? `DELETE SEOUL · ${e.ko}` : BASE.title;
  const description = e ? e.line : BASE.description;
  const image = { url: `/deleteseoul/og-${k ?? "default"}.jpg`, width: 1200, height: 630, alt: title };
  return {
    ...BASE,
    title,
    description,
    openGraph: { title, description, images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export const viewport: Viewport = {
  themeColor: "#07030f",
  viewportFit: "cover",
};

export default function ExplorePage() {
  return <ExploreClient />;
}
