import type { Metadata } from "next";
import ExploreClient from "@/explore/ExploreClient";

export const metadata: Metadata = {
  title: "NEO-SEOUL 2087 · SAN LEE",
  description: "San Lee의 포트폴리오를 사이버펑크 도시로 탐험하는 작품",
};

export default function ExplorePage() {
  return <ExploreClient />;
}
