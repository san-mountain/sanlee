import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";

export const metadata: Metadata = {
  title: "SAN LEE",
  description: "이산(San Lee) 포트폴리오",
};

// 시 본문과 작품 제목에만 쓰는 명조. 한글은 글자 묶음별로 잘게 나뉘어 있어 쓰인 글자 묶음만 내려받는다
const serif = Noto_Serif_KR({ weight: ["400", "600"], subsets: ["latin"], display: "swap", preload: false, variable: "--font-serif" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07030f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={serif.variable}>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
