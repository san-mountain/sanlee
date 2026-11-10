import { Gowun_Batang } from "next/font/google";

// 고운바탕: 시와 일기에만. Writing 페이지와 DELETE SEOUL(도시 안에서 같은 글을 읽는다)에서만 불러온다
export const brush = Gowun_Batang({ weight: ["400"], subsets: ["latin"], display: "swap", preload: false, variable: "--font-brush" });
