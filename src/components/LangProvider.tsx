"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import type { L, Lang } from "@/data/site";

const KEY = "sanlee-lang";
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (s: L) => string };
const LangContext = createContext<Ctx>({ lang: "ko", setLang: () => {}, t: (s) => s.ko });

// 기기 언어가 한국어면 한국어, 그 외에는 영어. 직접 고른 언어가 있으면 그걸 우선합니다.
// (쿠키는 쓰지 않고 이 기기의 localStorage에만 저장합니다.)
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");

  // 화면에 그려지기 전에 언어를 맞춘다. 영어 기기에서는 layout.tsx의 작은 스크립트가 그때까지 화면을 가려 두어
  // 한국어가 잠깐 보였다 영어로 바뀌는 깜빡임이 없다
  useIsoLayoutEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    const detected: Lang = (navigator.languages?.[0] || navigator.language || "ko").toLowerCase().startsWith("ko")
      ? "ko"
      : "en";
    setLangState(saved === "ko" || saved === "en" ? saved : detected);
    document.documentElement.removeAttribute("data-lang-wait");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  }, []);

  const t = useCallback((s: L) => s[lang], [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      className={`lang-toggle ${className}`}
      onClick={() => setLang(lang === "ko" ? "en" : "ko")}
      aria-label={lang === "ko" ? "Switch to English" : "한국어로 보기"}
    >
      <span className={lang === "ko" ? "on" : ""}>KO</span>/<span className={lang === "en" ? "on" : ""}>EN</span>
    </button>
  );
}

export function T({ s }: { s: L }) {
  const { t } = useLang();
  return <>{t(s)}</>;
}
