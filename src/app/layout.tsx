import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";

export const metadata: Metadata = {
  title: "SAN LEE",
  description: "San Lee 포트폴리오",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07030f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
