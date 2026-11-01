import type { Metadata, Viewport } from "next";
import ExploreClient from "@/explore/ExploreClient";

export const metadata: Metadata = {
  title: "DELETE SEOUL · SAN LEE",
  description: "이산의 포트폴리오를 사이버펑크 도시로 탐험하는 작품",
  // 홈 화면에 추가해 열면 주소창 없이 앱처럼 뜬다 (아이폰 사파리는 이 방법뿐)
  manifest: "/explore.webmanifest",
  appleWebApp: { capable: true, title: "DELETE SEOUL", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#07030f",
  viewportFit: "cover",
};

export default function ExplorePage() {
  return <ExploreClient />;
}
