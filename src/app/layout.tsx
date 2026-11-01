import type { Metadata, Viewport } from "next";
import { Gowun_Batang, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";

export const metadata: Metadata = {
  title: "SAN LEE",
  description: "이산(San Lee) 포트폴리오",
};

// 시 본문과 작품 제목에만 쓰는 명조. 한글은 글자 묶음별로 잘게 나뉘어 있어 쓰인 글자 묶음만 내려받는다
const serif = Noto_Serif_KR({ weight: ["400", "600"], subsets: ["latin"], display: "swap", preload: false, variable: "--font-serif" });

// 시와 일기에만 쓰는 고운바탕: 붓으로 쓴 듯한 획 끝이 있는 바탕체
const brush = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], display: "swap", preload: false, variable: "--font-brush" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07030f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${serif.variable} ${brush.variable}`}>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
