// 방문 기록 한 번을 무엇으로 셀지 정하는 순수한 함수들(테스트에서 바로 불러 쓴다).
// 쿠키를 쓰지 않고, IP나 기기 정보 원문은 어디에도 남기지 않는다.

// 셀 페이지. 그 밖의 주소(없는 페이지, 관리 화면)는 세지 않는다
export const PAGES = ["/", "/about", "/works", "/writing", "/deleteseoul"] as const;
export type Page = (typeof PAGES)[number];

export function pageOf(raw: unknown): Page | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  const p = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return (PAGES as readonly string[]).includes(p) ? (p as Page) : null;
}

// 검색 로봇, 링크 미리보기, 자동 검사 도구는 사람이 아니다
const BOT = /bot|crawl|spider|slurp|preview|fetch|scan|monitor|headless|lighthouse|pagespeed|facebookexternalhit|embedly|whatsapp|telegrambot|kakaotalk-scrap|yeti|daumoa|python|curl|wget|node|axios|go-http|java\//i;
export const isBot = (ua: string) => !ua || BOT.test(ua);

export type Device = "mobile" | "tablet" | "desktop";
// touch: 브라우저가 알려 준 터치 여부. iPad는 Mac처럼 자기를 소개해서 이것으로 가린다
export function deviceOf(ua: string, touch = false): Device {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua) || (touch && /Macintosh/.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return "desktop";
}

// 어디서 왔는지: 주소의 호스트 이름만. 이 사이트 안에서 옮긴 것은 빼고, 흔한 앞머리(www., m., l.)는 떼어 같은 곳으로 묶는다
const ALIAS: Record<string, string> = { "t.co": "x.com", "twitter.com": "x.com", "com.google.android.gm": "gmail", "android-app": "앱" };
export function sourceOf(ref: unknown, ownHost: string): string | null {
  if (typeof ref !== "string" || !ref || ref.length > 2000) return null;
  let host: string;
  try {
    const u = new URL(ref);
    if (u.protocol === "android-app:") return ALIAS[u.hostname] ?? u.hostname.slice(0, 60);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  const bare = (h: string) => h.replace(/^(www|m|l|lm|mobile)\./, "");
  if (!host || bare(host) === bare(ownHost.toLowerCase().split(":")[0])) return null;
  if (host.endsWith(".vercel.app") || host === "localhost") return null;
  // 구글·네이버 등은 나라별·기능별 하위 주소가 많아서 대표 이름으로 묶는다
  const h = bare(host);
  if (/(^|\.)google\.[a-z.]+$/.test(h)) return "google";
  if (/(^|\.)naver\.com$/.test(h)) return "naver";
  if (/(^|\.)daum\.net$/.test(h)) return "daum";
  if (/(^|\.)instagram\.com$/.test(h)) return "instagram.com";
  if (/(^|\.)facebook\.com$/.test(h)) return "facebook.com";
  return ALIAS[h] ?? h.slice(0, 60);
}

export const COUNTRY = /^[A-Z]{2}$/;
export const LANG = (v: unknown) => (v === "ko" || v === "en" ? v : null);

// 한국 시간 날짜 YYYY-MM-DD
export function dayOf(ms: number) {
  return new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
}
export function lastDays(n: number, now = Date.now()) {
  return Array.from({ length: n }, (_, i) => dayOf(now - (n - 1 - i) * 864e5));
}

// 하루치 기록(한 해시)에 들어가는 칸 이름: 종류 한 글자 + ":" + 값
export const FIELD = { page: "p", source: "r", country: "c", device: "d", lang: "l", hour: "h" } as const;

export type DayRow = { day: string; visitors: number; views: number };
export type Stats = {
  days: DayRow[];
  visitors: number;
  visits: number;
  views: number;
  pages: [string, number][];
  sources: [string, number][];
  direct: number;
  countries: [string, number][];
  devices: [string, number][];
  langs: [string, number][];
  hours: number[];
};

// 날마다 읽어 온 해시와 방문자 수를 화면에 쓸 모양으로 모은다
export function summarize(days: string[], hashes: Record<string, number>[], visitors: number[]): Stats {
  const sum = (k: string) => {
    const m = new Map<string, number>();
    for (const h of hashes) for (const [f, n] of Object.entries(h)) if (f.startsWith(`${k}:`)) m.set(f.slice(k.length + 1), (m.get(f.slice(k.length + 1)) ?? 0) + n);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  const viewsOf = (h: Record<string, number>) => Object.entries(h).reduce((s, [f, n]) => (f.startsWith("p:") ? s + n : s), 0);
  const rows = days.map((day, i) => ({ day, visitors: visitors[i] ?? 0, views: viewsOf(hashes[i] ?? {}) }));
  const sources = sum(FIELD.source);
  const visits = hashes.reduce((s, h) => s + (h["v"] ?? 0), 0);
  const fromSources = sources.reduce((s, [, n]) => s + n, 0);
  return {
    days: rows,
    visitors: rows.reduce((s, r) => s + r.visitors, 0),
    visits,
    views: rows.reduce((s, r) => s + r.views, 0),
    pages: sum(FIELD.page),
    sources,
    direct: Math.max(0, visits - fromSources),
    countries: sum(FIELD.country),
    devices: sum(FIELD.device),
    langs: sum(FIELD.lang),
    hours: Array.from({ length: 24 }, (_, i) => hashes.reduce((s, h) => s + (h[`${FIELD.hour}:${i}`] ?? 0), 0)),
  };
}

// ---------- 방문 하나하나의 기록(최근 방문 목록) ----------
// IP는 남기지 않는다. 도시·기기·브라우저·들어온 곳·본 페이지 순서와 시간만, 90일 동안
export const LOG_DAYS = 90;
export const VISIT_ID = /^[A-Za-z0-9_-]{16,32}$/;

export function osOf(ua: string, touch = false) {
  if (/iPhone|iPod/.test(ua)) return "iOS";
  if (/iPad/.test(ua) || (touch && /Macintosh/.test(ua))) return "iPadOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Macintosh|Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "";
}

// 앱 안의 브라우저(인스타그램, 카카오톡, 네이버 등)를 먼저 가린다
export function browserOf(ua: string) {
  const rules: [RegExp, string][] = [
    [/Instagram/, "인스타그램 앱"],
    [/KAKAOTALK/i, "카카오톡 앱"],
    [/NAVER\(inapp|NAVER/, "네이버 앱"],
    [/FBAN|FBAV/, "페이스북 앱"],
    [/Line\//, "라인 앱"],
    [/DaumApps/, "다음 앱"],
    [/SamsungBrowser/, "삼성 인터넷"],
    [/Whale/, "웨일"],
    [/Edg\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    [/Firefox|FxiOS/, "Firefox"],
    [/CriOS|Chrome/, "Chrome"],
    [/Safari/, "Safari"],
  ];
  return rules.find(([r]) => r.test(ua))?.[1] ?? "";
}

// 한국 시간으로 몇 시(0~23)
export const hourOf = (ms: number) => new Date(ms + 9 * 3600e3).getUTCHours();

// Vercel이 주는 도시 이름은 주소 인코딩되어 온다
export function cityOf(raw: string | null) {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).slice(0, 60);
  } catch {
    return "";
  }
}

export type VisitLog = {
  id: string;
  start: number;
  end: number;
  city: string;
  country: string;
  device: string;
  os: string;
  browser: string;
  source: string;
  lang: string;
  pages: { path: string; at: number }[];
};

// HGETALL(visit:id)과 LRANGE(visit:id:p) 결과를 화면용 한 줄로
export function visitOf(id: string, h: Record<string, string>, pages: string[]): VisitLog | null {
  const start = Number(h.t);
  if (!start) return null;
  const list = pages
    .map((s) => {
      const i = s.lastIndexOf("|");
      return { path: s.slice(0, i), at: Number(s.slice(i + 1)) };
    })
    .filter((p) => p.path && p.at);
  const end = Math.max(start, Number(h.e) || 0, ...list.map((p) => p.at));
  return { id, start, end, city: h.city ?? "", country: h.c ?? "", device: h.d ?? "", os: h.os ?? "", browser: h.b ?? "", source: h.r ?? "", lang: h.l ?? "", pages: list };
}
