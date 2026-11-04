import type { Metadata, Viewport } from "next";
import ChaseGame from "@/explore/v3/chase/ChaseGame";

// 비공개 실험판. 공개 게임 /deleteseoul 과 코드·입력·상태를 공유하지 않는다.
export const metadata: Metadata = {
  title: "DELETE SEOUL · CHASE PROTOTYPE",
  robots: { index: false, follow: false },
};

// 노치·홈 바 영역까지 쓰고(safe-area 변수로 피한다), 확대 제스처를 막아 조작과 충돌하지 않게 한다
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05080d",
};

export default function ChaseLabPage() {
  return <ChaseGame />;
}
