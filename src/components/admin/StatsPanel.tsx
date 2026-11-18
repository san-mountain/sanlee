"use client";

import { useEffect, useMemo, useState } from "react";
import type { Stats } from "@/lib/analytics/visit";

// 관리 화면의 "방문" 탭: 최근 며칠 동안 누가 얼마나 들어와서 무엇을 봤는지
type Res = ({ ready: true } & Stats) | { ready: false };
const RANGES = [7, 30, 90] as const;

const PAGE_NAMES: Record<string, string> = { "/": "첫 화면", "/works": "작업", "/writing": "글", "/about": "소개", "/deleteseoul": "DELETE SEOUL" };
const DEVICE_NAMES: Record<string, string> = { mobile: "휴대폰", tablet: "태블릿", desktop: "컴퓨터" };
const LANG_NAMES: Record<string, string> = { ko: "한국어", en: "영어" };
const SOURCE_NAMES: Record<string, string> = { google: "구글 검색", naver: "네이버", daum: "다음", "instagram.com": "인스타그램", "x.com": "X(트위터)", "facebook.com": "페이스북" };
let regions: Intl.DisplayNames | null = null;
const countryName = (c: string) => {
  try {
    regions ??= new Intl.DisplayNames(["ko"], { type: "region" });
    return regions.of(c) ?? c;
  } catch {
    return c;
  }
};

const num = (n: number) => n.toLocaleString("ko-KR");
const md = (day: string) => `${Number(day.slice(5, 7))}.${Number(day.slice(8))}`;
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const weekday = (day: string) => WEEK[new Date(`${day}T00:00:00Z`).getUTCDay()];

export default function StatsPanel() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<Partial<Record<number, Res>>>({});
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setError("");
    fetch(`/api/admin/stats?days=${days}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) return location.reload();
        const j = await r.json().catch(() => null);
        if (!live) return;
        if (!r.ok || !j) return setError(j?.error ?? "불러오지 못했어요");
        setData((d) => ({ ...d, [days]: j }));
      })
      .catch(() => live && setError("불러오지 못했어요. 인터넷 연결을 확인해 주세요"));
    return () => {
      live = false;
    };
  }, [days, tick]);

  const s = data[days];

  return (
    <section className="stats" aria-label="방문">
      <div className="stats-bar">
        <div className="stats-range" role="group" aria-label="기간">
          {RANGES.map((n) => (
            <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}>
              {n}일
            </button>
          ))}
        </div>
        <button type="button" className="admin-link" onClick={() => setTick((t) => t + 1)}>
          새로고침
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {!s && !error && <p className="admin-muted">불러오는 중…</p>}
      {s && !s.ready && <Setup />}
      {s?.ready && <Report s={s} />}
    </section>
  );
}

function Setup() {
  return (
    <div className="stats-setup">
      <h2>방문 기록을 모으려면 한 번만 설정해 주세요</h2>
      <ol>
        <li>
          Vercel 프로젝트 &gt; <b>Storage</b> (또는 Marketplace)에서 <b>Upstash for Redis</b>를 골라 무료(Free) 데이터베이스를 만들고 이 프로젝트에 연결해요.
        </li>
        <li>
          연결하면 <code>KV_REST_API_URL</code>, <code>KV_REST_API_TOKEN</code> 이 저절로 들어가요. 그다음 사이트를 한 번 다시 배포해요.
        </li>
        <li>그때부터 방문이 쌓이기 시작해요. 이전 방문은 거슬러 셀 수 없어요.</li>
      </ol>
      <p className="admin-muted">쿠키를 쓰지 않고, IP 같은 원래 정보는 남기지 않아요. 이 기기처럼 관리 화면에 로그인한 기기의 방문과 검색 로봇은 세지 않아요.</p>
    </div>
  );
}

function Report({ s }: { s: Stats }) {
  const n = s.days.length;
  const sources: [string, number][] = [...s.sources.map(([k, v]) => [SOURCE_NAMES[k] ?? k, v] as [string, number])];
  if (s.direct) sources.push(["직접 들어옴", s.direct]);
  sources.sort((a, b) => b[1] - a[1]);
  if (!s.views)
    return (
      <>
        <Tiles s={s} n={n} />
        <p className="admin-muted">아직 이 기간에 쌓인 방문이 없어요. 설정한 뒤라면 다른 기기(로그인하지 않은)로 사이트를 열어 보면 곧 나타나요.</p>
      </>
    );
  return (
    <>
      <Tiles s={s} n={n} />
      <Daily rows={s.days} />
      <div className="stats-grid">
        <Ranked title="많이 본 페이지" unit="번 봄" rows={s.pages} name={(k) => PAGE_NAMES[k] ?? k} />
        <Ranked
          title="어디서 왔나"
          unit="번 방문"
          rows={sources}
          note="직접 들어옴: 주소를 치거나 즐겨찾기, 카카오톡·문자 같은 앱의 링크처럼 출처를 알 수 없는 방문"
        />
        <Ranked title="나라" unit="번 방문" rows={s.countries} name={countryName} limit={8} />
        <Ranked title="기기" unit="번 방문" rows={s.devices} name={(k) => DEVICE_NAMES[k] ?? k} />
        <Ranked title="사이트 언어" unit="번 방문" rows={s.langs} name={(k) => LANG_NAMES[k] ?? k} note="방문한 사람의 화면에 처음 뜬 언어" />
      </div>
      <p className="admin-muted stats-foot">
        한국 시간 기준. 방문자는 하루 단위로 세어서, 같은 사람이 이틀 들어오면 두 명으로 세요. 쿠키 없이 세고, 관리 화면에 로그인한 기기와 검색 로봇은 빼요.
      </p>
    </>
  );
}

function Tiles({ s, n }: { s: Stats; n: number }) {
  const today = s.days[n - 1];
  const tiles = [
    { label: "방문자", value: s.visitors, sub: `하루 평균 ${num(Math.round((s.visitors / n) * 10) / 10)}명` },
    { label: "방문", value: s.visits, sub: s.visits ? `방문마다 ${(s.views / s.visits).toFixed(1)}페이지` : "" },
    { label: "페이지 본 횟수", value: s.views, sub: "" },
    { label: "오늘 방문자", value: today?.visitors ?? 0, sub: today ? `${md(today.day)} (${weekday(today.day)})` : "" },
  ];
  return (
    <dl className="stats-tiles">
      {tiles.map((t) => (
        <div key={t.label}>
          <dt>{t.label}</dt>
          <dd>{num(t.value)}</dd>
          {t.sub && <dd className="st-sub">{t.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

// 날마다의 방문자 수: 한 계열 막대. 막대 위에 손을 대면(누르면) 그날의 숫자가 보인다
function Daily({ rows }: { rows: Stats["days"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...rows.map((r) => r.visitors)), [rows]);
  const top = niceMax(max);
  const W = 100 / rows.length;
  const h = hover === null ? null : rows[hover];
  const ticks = labelIdx(rows.length);
  return (
    <figure className="stats-daily">
      <figcaption>
        <span>날마다 방문자</span>
        <span className="st-hover" aria-live="polite">
          {h ? (
            <>
              {md(h.day)} ({weekday(h.day)}) · 방문자 <b>{num(h.visitors)}</b>명 · {num(h.views)}페이지
            </>
          ) : (
            " "
          )}
        </span>
      </figcaption>
      <div className="sd-plot" onMouseLeave={() => setHover(null)}>
        <div className="sd-axis" aria-hidden>
          <span>{num(top)}</span>
          <span>{num(top / 2)}</span>
          <span>0</span>
        </div>
        <div className="sd-bars" role="img" aria-label={`최근 ${rows.length}일 날마다 방문자 수, 가장 많은 날 ${num(max)}명`}>
          <span className="sd-grid" style={{ bottom: "50%" }} />
          <span className="sd-grid" style={{ bottom: "100%" }} />
          {rows.map((r, i) => (
            <button
              key={r.day}
              type="button"
              className={`sd-col${hover === i ? " on" : ""}`}
              style={{ width: `${W}%` }}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              aria-label={`${md(r.day)} 방문자 ${r.visitors}명`}
            >
              <span className="sd-bar" style={{ height: `${(r.visitors / top) * 100}%` }} />
            </button>
          ))}
        </div>
        <div className="sd-x" aria-hidden>
          {ticks.map((i) => (
            <span key={i} style={{ left: `${(i + 0.5) * W}%` }}>
              {md(rows[i].day)}
            </span>
          ))}
        </div>
      </div>
      <details className="sd-table">
        <summary>표로 보기</summary>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>방문자</th>
              <th>페이지</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.day}>
                <td>
                  {md(r.day)} ({weekday(r.day)})
                </td>
                <td>{num(r.visitors)}</td>
                <td>{num(r.views)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function Ranked({ title, unit, rows, name = (k) => k, limit = 10, note }: { title: string; unit: string; rows: [string, number][]; name?: (k: string) => string; limit?: number; note?: string }) {
  const total = rows.reduce((s, [, n]) => s + n, 0);
  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit).reduce((s, [, n]) => s + n, 0);
  if (rest) shown.push(["그 밖", rest]);
  const max = Math.max(1, ...shown.map(([, n]) => n));
  return (
    <section className="stats-rank">
      <h2>{title}</h2>
      {!total ? (
        <p className="admin-muted">아직 없어요</p>
      ) : (
        <ol>
          {shown.map(([k, n]) => (
            <li key={k} title={`${num(n)}${unit}`}>
              <span className="sr-bar" style={{ width: `${(n / max) * 100}%` }} />
              <span className="sr-name">{k === "그 밖" ? k : name(k)}</span>
              <span className="sr-n">
                {num(n)} <span className="sr-pct">{Math.round((n / total) * 100)}%</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {note && total > 0 && <p className="af-hint">{note}</p>}
    </section>
  );
}

// 축 끝 숫자: 가장 많은 날보다 조금 위의 둥근 짝수(가운데 눈금도 정수가 되게)
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 4, 6, 8, 10]) if (m * p >= v && (m * p) % 2 === 0) return m * p;
  return 10 * p;
}
// 아래 날짜 글씨는 많아야 6개: 처음과 끝, 그 사이 고르게
function labelIdx(n: number) {
  const k = Math.min(n, n <= 7 ? 7 : 5);
  return Array.from(new Set(Array.from({ length: k }, (_, i) => Math.round((i * (n - 1)) / Math.max(1, k - 1)))));
}
