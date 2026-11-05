import type { Metadata, Viewport } from "next";
import ExploreClient from "@/explore/ExploreClient";

export const metadata: Metadata = {
  title: "DELETE SEOUL · SAN LEE",
  description: "포트폴리오의 기록을 따라 구름 위 서울을 걷는 3D 인터랙티브 작품.",
  // 홈 화면에 추가해 열면 주소창 없이 앱처럼 뜬다 (아이폰 사파리는 이 방법뿐)
  manifest: "/deleteseoul.webmanifest",
  appleWebApp: { capable: true, title: "DELETE SEOUL", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#07030f",
  viewportFit: "cover",
};

export default function ExplorePage() {
  return <ExploreClient />;
}
