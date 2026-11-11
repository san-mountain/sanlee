import type { Metadata, Viewport } from "next";
import { sans, serif } from "./fonts";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import RestoreCrossing from "@/components/RestoreCrossing";

const DESCRIPTION = "이산(San Lee)의 그림, 조각, 시. Paintings, sculpture and poems by San Lee.";
export const metadata: Metadata = {
  metadataBase: new URL("https://sanlee.kr"),
  title: "SAN LEE",
  description: DESCRIPTION,
  // 링크를 공유했을 때의 미리보기 카드 (DELETE SEOUL은 제 카드를 따로 갖는다)
  openGraph: { title: "SAN LEE", description: DESCRIPTION, siteName: "SAN LEE", type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "SAN LEE" }] },
  twitter: { card: "summary_large_image", title: "SAN LEE", description: DESCRIPTION, images: ["/og.jpg"] },
};

// 영어 기기: 서버는 늘 한국어로 그려 보내므로, 화면이 뜨기 전에 언어를 정하고 React가 영어로 바꿀 때까지 잠깐 가려 둔다.
// (쿠키는 쓰지 않는다. 고른 언어는 이 기기의 localStorage에만 있다.) 1.5초 안에 바뀌지 않으면 그냥 보여 준다
const LANG_SCRIPT = `try{var s=localStorage.getItem("sanlee-lang"),l=s==="ko"||s==="en"?s:((navigator.languages&&navigator.languages[0])||navigator.language||"ko").toLowerCase().indexOf("ko")===0?"ko":"en";if(l==="en"){var d=document.documentElement;d.lang="en";d.setAttribute("data-lang-wait","");setTimeout(function(){d.removeAttribute("data-lang-wait")},1500)}}catch(e){}`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 휴대폰 브라우저의 주소창 색: 일반 페이지는 종이색. DELETE SEOUL만 제 페이지에서 어두운 색으로 바꾼다
  themeColor: "#fafaf8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: LANG_SCRIPT }} />
        <LangProvider>
          {children}
          <RestoreCrossing />
        </LangProvider>
      </body>
    </html>
  );
}
