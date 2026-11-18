"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WritingText from "@/components/WritingText";
import { checkSpelling, type Issue } from "@/lib/spell";
import { categoryOf, partLabel, stats, type Piece, type WritingMeta } from "@/lib/writing";

// 관리 화면의 글쓰기 칸: 분류·연작 고르기, 도구 막대(되돌리기, 특수 문자, 찾기·바꾸기, 맞춤법, 미리보기, 집중 모드),
// 글자 수·원고지 매수, 단축키. 본문은 보통 textarea 이고, 그 뒤에 같은 글자를 투명하게 깔아(backdrop) 찾은 곳과 맞춤법 지적에 밑줄을 긋는다.

export type PieceDraft = {
  title: string;
  date: string;
  category: string;
  series: string; // 연작 id. "" 이면 연작 아님, NEW 면 새 연작
  part: string;
  prose: boolean;
  body: string;
  newSeries?: { title: string; note: string };
};
export const NEW_SERIES = "__new";

type Props = {
  d: PieceDraft;
  set: (p: Partial<PieceDraft>) => void;
  meta: WritingMeta;
  pieces: Piece[];
  editingIndex: number | null;
  aiSpell: boolean;
  savedAt: number | null;
  onLocalSave: () => void;
};

const PREFS_KEY = "sanlee-admin-editor";
const IGNORE_KEY = "sanlee-admin-spell-ignore";
type Prefs = { size: number; preview: boolean; width: "narrow" | "wide" };
const DEFAULT_PREFS: Prefs = { size: 18, preview: false, width: "narrow" };
const readJSON = <T,>(k: string, fallback: T): T => {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(k) ?? "null") };
  } catch {
    return fallback;
  }
};
const writeJSON = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const PAIRS: [string, string][] = [
  ["「", "」"],
  ["『", "』"],
  ["〈", "〉"],
  ["《", "》"],
  ["“", "”"],
  ["‘", "’"],
];
const SINGLES = ["…", "—", "·", "※", "～"];

type Mark = { from: number; to: number; cls: string; cur?: boolean };

// 본문이 바뀐 뒤에도 지적한 말이 아직 있으면 새 위치로 옮기고, 없어졌으면 뺀다
function relocate(list: Issue[], body: string) {
  const out: Issue[] = [];
  for (const it of list) {
    if (body.slice(it.from, it.to) === it.original) {
      out.push(it);
      continue;
    }
    let best = -1;
    let k = body.indexOf(it.original, Math.max(0, it.from - 400));
    while (k >= 0 && k <= it.from + 400) {
      if (best < 0 || Math.abs(k - it.from) < Math.abs(best - it.from)) best = k;
      k = body.indexOf(it.original, k + 1);
    }
    if (best >= 0) out.push({ ...it, from: best, to: best + it.original.length });
  }
  return out;
}

export default function WritingEditor({ d, set, meta, pieces, editingIndex, aiSpell, savedAt, onLocalSave }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const findInput = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [focus, setFocus] = useState(false);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [find, setFind] = useState({ open: false, q: "", r: "", i: 0 });
  const [spellOpen, setSpellOpen] = useState(false);
  const [aiIssues, setAiIssues] = useState<Issue[]>([]);
  const [aiState, setAiState] = useState<{ busy: boolean; error?: string; done?: boolean }>({ busy: false });
  const [ignored, setIgnored] = useState<string[]>([]);
  const [ignoredAlways, setIgnoredAlways] = useState<string[]>([]);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    setPrefs(readJSON(PREFS_KEY, DEFAULT_PREFS));
    setIgnoredAlways(readJSON<{ list: string[] }>(IGNORE_KEY, { list: [] }).list);
  }, []);
  const prefsSet = (p: Partial<Prefs>) =>
    setPrefs((cur) => {
      const next = { ...cur, ...p };
      writeJSON(PREFS_KEY, next);
      return next;
    });

  const cat = meta.categories.find((c) => c.id === d.category) ?? meta.categories[0];
  const indent = !!cat?.indent;
  const isPoem = !indent;
  const st = useMemo(() => stats(d.body, indent), [d.body, indent]);

  // ---------- textarea에 글 넣기: execCommand 로 넣어야 되돌리기(Ctrl+Z)가 이어진다 ----------
  const replaceRange = useCallback(
    (from: number, to: number, text: string) => {
      const el = ta.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(from, to);
      let ok = false;
      try {
        ok = document.execCommand("insertText", false, text);
      } catch {}
      if (!ok) {
        el.setRangeText(text, from, to, "end");
        set({ body: el.value });
      }
    },
    [set]
  );
  const insert = (before: string, after = "") => {
    const el = ta.current;
    if (!el) return;
    const [s, e] = [el.selectionStart, el.selectionEnd];
    const inner = el.value.slice(s, e);
    replaceRange(s, e, before + inner + after);
    if (after) {
      // 고른 글이 없으면 괄호 안에 커서를 둔다
      const pos = inner ? s + before.length + inner.length + after.length : s + before.length;
      el.setSelectionRange(pos, pos);
    }
  };
  const sceneBreak = () => {
    const el = ta.current;
    if (!el) return;
    const s = el.selectionStart;
    const v = el.value;
    const pre = v.slice(0, s).replace(/[ \t]*$/, "");
    const lead = pre === "" ? "" : pre.endsWith("\n\n") ? "" : pre.endsWith("\n") ? "\n" : "\n\n";
    const post = v.slice(s).startsWith("\n") ? "\n" : "\n\n";
    replaceRange(pre.length, s, `${lead}* * *${post}`);
  };
  const exec = (cmd: "undo" | "redo") => {
    ta.current?.focus();
    try {
      document.execCommand(cmd);
    } catch {}
  };
  const replaceAll = (next: string) => {
    if (next === d.body) return;
    replaceRange(0, d.body.length, next);
  };

  // ---------- 찾기·바꾸기 ----------
  const matches = useMemo(() => {
    if (!find.open || !find.q) return [] as [number, number][];
    const out: [number, number][] = [];
    const hay = d.body.toLowerCase();
    const q = find.q.toLowerCase();
    for (let k = hay.indexOf(q); k >= 0 && out.length < 5000; k = hay.indexOf(q, k + q.length)) out.push([k, k + q.length]);
    return out;
  }, [find.open, find.q, d.body]);
  const cur = matches.length ? ((find.i % matches.length) + matches.length) % matches.length : -1;
  const openFind = () => {
    const el = ta.current;
    const picked = el && el.selectionEnd > el.selectionStart ? el.value.slice(el.selectionStart, el.selectionEnd) : "";
    setFind((f) => ({ ...f, open: true, q: picked && !picked.includes("\n") ? picked : f.q, i: 0 }));
    setTimeout(() => findInput.current?.select(), 0);
  };
  const step = (n: number) => setFind((f) => ({ ...f, i: f.i + n }));
  const replaceOne = () => {
    if (cur < 0) return;
    const [a, b] = matches[cur];
    replaceRange(a, b, find.r);
  };
  const replaceEvery = () => {
    if (!matches.length) return;
    let out = "";
    let last = 0;
    for (const [a, b] of matches) {
      out += d.body.slice(last, a) + find.r;
      last = b;
    }
    replaceAll(out + d.body.slice(last));
    setFlash(`${matches.length}곳을 바꿨어요`);
  };

  // ---------- 맞춤법 ----------
  const ruleIssues = useMemo(() => (spellOpen ? checkSpelling(d.body, { poem: isPoem }) : []), [spellOpen, d.body, isPoem]);
  const aiNow = useMemo(() => relocate(aiIssues, d.body), [aiIssues, d.body]);
  const key = (x: Issue) => `${x.original}\u0000${x.suggestion}`;
  const issues = useMemo(() => {
    const all = [...aiNow, ...ruleIssues].filter((x) => !ignored.includes(key(x)) && !ignoredAlways.includes(x.original));
    // 같은 곳을 둘 다 지적하면 AI 쪽 하나만
    const sorted = all.sort((a, b) => a.from - b.from || (a.source === "ai" ? -1 : 1));
    const out: Issue[] = [];
    for (const x of sorted) if (!out.length || x.from >= out[out.length - 1].to) out.push(x);
    return out;
  }, [aiNow, ruleIssues, ignored, ignoredAlways]);
  const fixable = issues.filter((x) => x.suggestion !== x.original);
  const fix = (x: Issue) => replaceRange(x.from, x.to, x.suggestion);
  const fixAll = () => {
    let out = d.body;
    for (const x of [...fixable].sort((a, b) => b.from - a.from)) out = out.slice(0, x.from) + x.suggestion + out.slice(x.to);
    replaceAll(out);
    setFlash(`${fixable.length}곳을 고쳤어요`);
  };
  const ignoreAlways = (x: Issue) => {
    const list = [...new Set([...ignoredAlways, x.original])];
    setIgnoredAlways(list);
    writeJSON(IGNORE_KEY, { list });
  };
  const show = (from: number, to: number) => {
    const el = ta.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(from, to);
    requestAnimationFrame(() => back.current?.querySelector(`[data-at="${from}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };
  const runAI = async () => {
    setAiState({ busy: true });
    const res = await fetch("/api/admin/spell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: d.body, category: cat?.ko }),
    }).catch(() => null);
    const j = await res?.json().catch(() => null);
    if (!res?.ok || !j) return setAiState({ busy: false, error: j?.error ?? "AI 검사를 하지 못했어요" });
    setAiIssues(j.issues);
    setAiState({ busy: false, done: true });
  };

  // ---------- 밑줄 ----------
  const marks = useMemo(() => {
    const list: Mark[] = [];
    matches.forEach(([a, b], k) => list.push({ from: a, to: b, cls: "m-find", cur: k === cur }));
    if (spellOpen) for (const x of issues) list.push({ from: x.from, to: x.to, cls: x.source === "ai" ? "m-ai" : "m-rule" });
    list.sort((a, b) => a.from - b.from);
    const out: Mark[] = [];
    for (const m of list) if (!out.length || m.from >= out[out.length - 1].to) out.push(m);
    return out;
  }, [matches, cur, spellOpen, issues]);
  const backdrop = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    marks.forEach((m, k) => {
      if (m.from > last) parts.push(d.body.slice(last, m.from));
      parts.push(
        <mark key={k} className={m.cls} data-at={m.from} data-cur={m.cur ? "1" : undefined}>
          {d.body.slice(m.from, m.to)}
        </mark>
      );
      last = m.to;
    });
    parts.push(d.body.slice(last) + "\n ");
    return parts;
  }, [marks, d.body]);

  useEffect(() => {
    if (cur >= 0) back.current?.querySelector("[data-cur]")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cur, find.q]);

  // ---------- 단축키·집중 모드 ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = isMac() ? e.metaKey : e.ctrlKey;
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openFind();
      } else if (mod && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onLocalSave();
        setFlash("이 기기에 저장했어요");
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setSpellOpen((v) => !v);
      } else if (e.key === "Escape") {
        if (find.open) setFind((f) => ({ ...f, open: false }));
        else if (focus) setFocus(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    if (!focus) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ta.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
    };
  }, [focus]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  // ---------- 분류·연작 ----------
  const seriesHere = meta.series.filter((s) => s.category === cat?.id);
  const nextPart = (sid: string) =>
    Math.max(0, ...pieces.filter((p, i) => i !== editingIndex && p.series === sid).map((p) => p.part ?? 0)) + 1;
  const pickSeries = (sid: string) => {
    if (sid === NEW_SERIES) set({ series: sid, part: "1", newSeries: d.newSeries ?? { title: "", note: "" } });
    else set({ series: sid, part: sid ? String(nextPart(sid)) : "", newSeries: undefined });
  };

  const seriesTitle = d.series === NEW_SERIES ? d.newSeries?.title || "새 연작" : meta.series.find((x) => x.id === d.series)?.title;
  const mod = isMac() ? "⌘" : "Ctrl+";
  const time = savedAt ? new Date(savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "";
  const selected = sel[1] - sel[0];

  return (
    <>
      <div className="admin-row">
        <label className="admin-field">
          <span className="af-label">분류</span>
          <select
            value={cat?.id}
            onChange={(e) => {
              const c = meta.categories.find((x) => x.id === e.target.value);
              set({ category: e.target.value, series: "", part: "", newSeries: undefined, prose: c?.indent ? false : d.prose });
            }}
          >
            {meta.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ko}
              </option>
            ))}
          </select>
        </label>
        {cat?.serial ? (
          <label className="admin-field">
            <span className="af-label">연작</span>
            <select value={d.series} onChange={(e) => pickSeries(e.target.value)}>
              <option value="">연작 아님(단편)</option>
              {seriesHere.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                  {s.done ? " (완결)" : ""}
                </option>
              ))}
              <option value={NEW_SERIES}>+ 새 연작 만들기</option>
            </select>
          </label>
        ) : (
          <span />
        )}
      </div>
      {d.series === NEW_SERIES && (
        <div className="admin-row">
          <label className="admin-field">
            <span className="af-label">새 연작 제목</span>
            <input value={d.newSeries?.title ?? ""} onChange={(e) => set({ newSeries: { title: e.target.value, note: d.newSeries?.note ?? "" } })} required />
          </label>
          <label className="admin-field">
            <span className="af-label">연작 소개(없어도 돼요)</span>
            <input value={d.newSeries?.note ?? ""} onChange={(e) => set({ newSeries: { title: d.newSeries?.title ?? "", note: e.target.value } })} />
          </label>
        </div>
      )}
      <div className={d.series ? "admin-row admin-row-3" : "admin-row"}>
        {d.series && (
          <label className="admin-field">
            <span className="af-label">회차</span>
            <input value={d.part} onChange={(e) => set({ part: e.target.value.replace(/\D/g, "") })} inputMode="numeric" pattern="\d+" required />
          </label>
        )}
        <label className="admin-field">
          <span className="af-label">{d.series ? "회차 제목" : "제목"}</span>
          <input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={d.series ? `예: ${d.part || 1}화, 또는 이 회의 제목` : ""} required />
        </label>
        <label className="admin-field">
          <span className="af-label">날짜</span>
          <input value={d.date} onChange={(e) => set({ date: e.target.value })} pattern="\d{4}\.\d{2}\.\d{2}" inputMode="numeric" required />
          <span className="af-hint">2026.10.31 처럼</span>
        </label>
      </div>
      {isPoem && (
        <label className="admin-check">
          <input type="checkbox" checked={d.prose} onChange={(e) => set({ prose: e.target.checked })} /> 산문시(줄을 바꾸지 않고 문단으로)
        </label>
      )}

      <div
        className={`ed ${focus ? "focus" : ""} ${prefs.preview ? "with-preview" : ""} ${indent ? "is-indent" : "is-poem"}`}
        style={{ "--ed-size": `${prefs.size}px` } as React.CSSProperties}
      >
        <div className="ed-bar" role="toolbar" aria-label="글쓰기 도구">
          <div className="ed-tools">
            <button type="button" title={`되돌리기 (${mod}Z)`} aria-label="되돌리기" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")}>
              ↶
            </button>
            <button type="button" title={`다시 하기 (${isMac() ? "⌘⇧Z" : "Ctrl+Y"})`} aria-label="다시 하기" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")}>
              ↷
            </button>
            <span className="ed-sep" />
            {PAIRS.map(([o, c]) => (
              <button key={o} type="button" className="ed-ch" title={`${o}${c} 넣기(고른 글을 감싸요)`} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(o, c)}>
                {o}
                {c}
              </button>
            ))}
            {SINGLES.map((s) => (
              <button key={s} type="button" className="ed-ch" title={`${s} 넣기`} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(s)}>
                {s}
              </button>
            ))}
            {indent && (
              <button type="button" title="장면 전환(* * *) 넣기" onMouseDown={(e) => e.preventDefault()} onClick={sceneBreak}>
                ＊ 장면
              </button>
            )}
            <span className="ed-sep" />
            <button type="button" className={find.open ? "on" : ""} title={`찾기·바꾸기 (${mod}F)`} onClick={() => (find.open ? setFind((f) => ({ ...f, open: false })) : openFind())}>
              찾기
            </button>
            <button type="button" className={spellOpen ? "on" : ""} title={`맞춤법 검사 (${isMac() ? "⌘⇧L" : "Ctrl+Shift+L"})`} onClick={() => setSpellOpen((v) => !v)}>
              맞춤법
            </button>
            <button type="button" className={prefs.preview ? "on" : ""} title="사이트에 보일 모습" onClick={() => prefsSet({ preview: !prefs.preview })}>
              미리보기
            </button>
            <button type="button" className={focus ? "on" : ""} title="집중 모드(Esc로 나가기)" onClick={() => setFocus((v) => !v)}>
              {focus ? "집중 끝" : "집중"}
            </button>
            <span className="ed-sep" />
            <button type="button" title="글자 작게" aria-label="글자 작게" onClick={() => prefsSet({ size: Math.max(14, prefs.size - 1) })}>
              가−
            </button>
            <button type="button" title="글자 크게" aria-label="글자 크게" onClick={() => prefsSet({ size: Math.min(28, prefs.size + 1) })}>
              가+
            </button>
          </div>
          {flash && (
            <span className="ed-flash" role="status">
              {flash}
            </span>
          )}
        </div>

        {find.open && (
          <div className="ed-find">
            <input
              ref={findInput}
              value={find.q}
              placeholder="찾을 말"
              aria-label="찾을 말"
              onChange={(e) => setFind((f) => ({ ...f, q: e.target.value, i: 0 }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  step(e.shiftKey ? -1 : 1);
                }
              }}
            />
            <input
              value={find.r}
              placeholder="바꿀 말"
              aria-label="바꿀 말"
              onChange={(e) => setFind((f) => ({ ...f, r: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  replaceOne();
                }
              }}
            />
            <span className="ed-count">{find.q ? (matches.length ? `${cur + 1}/${matches.length}` : "없음") : ""}</span>
            <button type="button" aria-label="이전" title="이전 (Shift+Enter)" onClick={() => step(-1)} disabled={!matches.length}>
              ↑
            </button>
            <button type="button" aria-label="다음" title="다음 (Enter)" onClick={() => step(1)} disabled={!matches.length}>
              ↓
            </button>
            <button type="button" onClick={replaceOne} disabled={!matches.length}>
              바꾸기
            </button>
            <button type="button" onClick={replaceEvery} disabled={!matches.length}>
              모두 바꾸기
            </button>
            <button type="button" className="admin-x" aria-label="찾기 닫기" onClick={() => setFind((f) => ({ ...f, open: false }))}>
              ×
            </button>
          </div>
        )}

        {spellOpen && (
          <div className="ed-spell">
            <div className="ed-spell-head">
              <strong>맞춤법</strong>
              <span className="admin-muted">
                {issues.length ? `${issues.length}곳` : aiState.busy ? "" : "찾은 곳이 없어요"}
                {aiState.done && " · AI 검사 포함"}
              </span>
              {aiSpell ? (
                <button type="button" onClick={runAI} disabled={aiState.busy || !d.body.trim()}>
                  {aiState.busy ? "AI가 읽는 중…" : aiState.done ? "AI로 다시 검사" : "AI로 꼼꼼히 검사"}
                </button>
              ) : (
                <span className="af-hint">AI 검사는 Vercel에 ANTHROPIC_API_KEY 를 넣으면 켜져요</span>
              )}
              {fixable.length > 1 && (
                <button type="button" onClick={fixAll}>
                  모두 고치기
                </button>
              )}
              {ignoredAlways.length > 0 && (
                <button
                  type="button"
                  className="admin-link"
                  title={ignoredAlways.join(", ")}
                  onClick={() => {
                    setIgnoredAlways([]);
                    writeJSON(IGNORE_KEY, { list: [] });
                  }}
                >
                  늘 무시하는 말 {ignoredAlways.length}개 비우기
                </button>
              )}
            </div>
            {aiState.error && <p className="admin-error">{aiState.error}</p>}
            {issues.length > 0 && (
              <ol className="ed-issues">
                {issues.map((x) => (
                  <li key={`${x.from}-${x.original}`}>
                    <button type="button" className="ed-issue" onClick={() => show(x.from, x.to)}>
                      <span className={`ed-kind ${x.source === "ai" ? "ai" : ""}`}>{x.kind}</span>
                      <span className="ed-from">{x.original.replace(/ /g, "␣")}</span>
                      {x.suggestion !== x.original && (
                        <>
                          {" → "}
                          <span className="ed-to">{x.suggestion === "" ? "(지우기)" : x.suggestion.replace(/ /g, "␣")}</span>
                        </>
                      )}
                      <span className="ed-why">{x.reason}</span>
                    </button>
                    <span className="ed-issue-acts">
                      {x.suggestion !== x.original && (
                        <button type="button" onClick={() => fix(x)}>
                          고치기
                        </button>
                      )}
                      <button type="button" onClick={() => setIgnored((l) => [...l, key(x)])}>
                        무시
                      </button>
                      <button type="button" title="이 말은 앞으로 검사하지 않아요(이 기기)" onClick={() => ignoreAlways(x)}>
                        늘 무시
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        <div className="ed-split">
          <div className="ed-surface">
            <div ref={back} className="ed-back" aria-hidden>
              {backdrop}
            </div>
            <textarea
              ref={ta}
              className="ed-text"
              value={d.body}
              lang="ko"
              spellCheck
              onChange={(e) => set({ body: e.target.value })}
              onSelect={(e) => setSel([e.currentTarget.selectionStart, e.currentTarget.selectionEnd])}
              placeholder={indent ? "문단은 줄을 바꿔 나눠요. 들여쓰기는 사이트가 알아서 해요." : "연은 빈 줄로 나눠요."}
              required
            />
          </div>
          {prefs.preview && (
            <div className="ed-preview poems" lang="ko" aria-label="미리보기">
              <div className={`poem ${d.prose && isPoem ? "prose" : ""} ${indent ? "indent" : ""}`}>
                <p className="ed-preview-title poem-title">
                  {seriesTitle && <span className="poem-part">{seriesTitle} · {d.part}화</span>}
                  {seriesTitle && !partLabel({ part: Number(d.part), title: d.title }) ? "" : d.title || "제목"}
                </p>
                <div className="poem-body">
                  {d.body.trim() ? <WritingText body={d.body.replace(/^\s*\n|\s+$/g, "")} indent={indent} /> : <p className="admin-muted">본문이 여기에 보여요</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ed-status" aria-live="polite">
          <span>
            {st.chars.toLocaleString()}자 <span className="admin-muted">(공백 빼고 {st.noSpace.toLocaleString()}자)</span>
          </span>
          <span>원고지 약 {st.pages}매</span>
          <span>{isPoem ? `${st.stanzas}연 ${st.lines}행` : `문단 ${st.lines}개`}</span>
          <span>읽는 데 약 {st.minutes}분</span>
          {selected > 0 && <span>고른 글 {selected.toLocaleString()}자</span>}
          <span className="ed-saved">{time ? `이 기기에 ${time} 저장됨` : ""}</span>
        </div>
        <p className="af-hint ed-help">
          {indent
            ? "문단은 줄을 바꿔 나눠요. 사이트에서 문단 첫머리를 한 칸씩 들여 써요. 빈 줄은 장면이 바뀌는 큰 여백, * * * 한 줄은 장면 전환 표시예요. "
            : "연은 빈 줄로 나눠요. "}
          단축키: {mod}F 찾기 · {mod}S 이 기기에 저장 · {isMac() ? "⌘⇧L" : "Ctrl+Shift+L"} 맞춤법 · Esc 닫기
        </p>
      </div>
    </>
  );
}

// 사이트 미리보기·목록에 쓰는, 분류 이름
export const catName = (meta: WritingMeta | undefined, p: Piece) => meta?.categories.find((c) => c.id === categoryOf(p))?.ko ?? "시";
