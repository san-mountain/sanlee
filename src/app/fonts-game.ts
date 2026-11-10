import { Noto_Serif_KR } from "next/font/google";

// 명조(굵게): DELETE SEOUL 안에서만 (app/deleteseoul/layout.tsx)
export const serifBold = Noto_Serif_KR({ weight: ["600"], subsets: ["latin"], display: "swap", preload: false, variable: "--font-serif-bold" });
