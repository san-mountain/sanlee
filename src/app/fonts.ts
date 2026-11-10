import { Inter, Noto_Serif_KR } from "next/font/google";

// 모든 페이지가 쓰는 글꼴. 나머지는 쓰는 페이지에서만 불러온다(fonts-brush.ts, fonts-game.ts: 파일을 나눠야 CSS도 나뉜다). 한글 글꼴은 글자 묶음(조각)마다 @font-face 선언이 100개 넘게 붙어서,
// 모든 페이지에 걸어 두면 쓰지 않는 페이지도 그 선언(수십 KB)을 첫 화면 전에 받아야 한다.

// 영문·숫자 전용 고딕. 한글은 이 글꼴에 없어 기기의 한글 글꼴로 넘어간다.
// 시스템 글꼴을 맨 앞에 두면 페이지 언어(ko/en)에 따라 영문 글자 모양까지 바뀌어서, 영문은 이 글꼴로 고정한다.
export const sans = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

// 명조(보통 굵기): 작품 제목의 〈〉, 목록 보기의 제목. 모든 페이지.
// 로고의 李山, 네온 간판의 空, 낙관의 山은 글꼴이 아니라 획 모양으로 그린다(components/Han.tsx).
export const serif = Noto_Serif_KR({ weight: ["400"], subsets: ["latin"], display: "swap", preload: false, variable: "--font-serif" });
