"use client";

import { useState } from "react";
import { categoryOf, type Category, type Piece, type Series, type WritingMeta } from "@/lib/writing";

// 글의 분류(시·에세이·소설 …)와 연작을 고치는 칸. 저장하면 src/content/writing-meta.json 에 커밋된다.
// 분류의 순서는 사이트 Writing 탭의 순서. 글이 들어 있는 분류·연작은 지울 수 없다(글을 먼저 옮기거나 지운다).

type Props = {
  meta: WritingMeta;
  sha: string;
  pieces: Piece[];
  onSaved: (meta: WritingMeta, sha: string, commit: string, url: string) => void;
  onClose: () => void;
};

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export default function CategoryManager({ meta, sha, pieces, onSaved, onClose }: Props) {
  const [cats, setCats] = useState<Category[]>(meta.categories);
  const [series, setSeries] = useState<Series[]>(meta.series);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const used = (id: string) => pieces.filter((p) => categoryOf(p) === id).length;
  const usedSeries = (id: string) => pieces.filter((p) => p.series === id).length;
  const setCat = (i: number, patch: Partial<Category>) => setCats((l) => l.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: number) =>
    setCats((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const setS = (id: string, patch: Partial<Series>) => setSeries((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const save = async () => {
    setBusy(true);
    setError("");
    const items: WritingMeta = {
      categories: cats.map((c) => ({ ...c, ko: c.ko.trim(), en: c.en.trim() })),
      series: series.map((s) => ({ ...s, title: s.title.trim(), note: s.note?.trim() || undefined, done: s.done || undefined })),
    };
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "meta", items, sha, message: "분류·연작 고침" }),
    }).catch(() => null);
    setBusy(false);
    if (res?.status === 401) return location.reload();
    const j = await res?.json().catch(() => null);
    if (!res?.ok || !j?.ok) return setError(j?.error ?? "저장하지 못했어요. 인터넷 연결을 확인해 주세요");
    onSaved(j.items, j.sha, j.commit, j.url);
  };

  return (
    <section className="cm" aria-label="분류·연작 관리">
      <h2>분류</h2>
      <p className="af-hint">
        순서는 사이트 Writing의 탭 순서예요. <b>들여쓰기</b>를 켜면 줄 하나가 문단 하나가 되고 문단 첫머리를 들여 써요(에세이·소설). <b>연작</b>을 켜면
        여러 회로 이어 쓰는 글을 묶을 수 있어요.
      </p>
      <ol className="cm-list">
        {cats.map((c, i) => {
          const n = used(c.id);
          const ns = series.filter((s) => s.category === c.id).length;
          return (
            <li key={c.id} className="cm-row">
              <input aria-label="이름" value={c.ko} onChange={(e) => setCat(i, { ko: e.target.value })} placeholder="이름" required />
              <input aria-label="영어 이름" value={c.en} onChange={(e) => setCat(i, { en: e.target.value })} placeholder="영어 이름(없어도 돼요)" />
              <label className="admin-check">
                <input type="checkbox" checked={c.indent} onChange={(e) => setCat(i, { indent: e.target.checked })} /> 들여쓰기
              </label>
              <label className="admin-check" title={ns ? "연작이 있는 분류는 끌 수 없어요" : ""}>
                <input type="checkbox" checked={c.serial} disabled={c.serial && ns > 0} onChange={(e) => setCat(i, { serial: e.target.checked })} /> 연작
              </label>
              <span className="cm-n admin-muted">{n}편</span>
              <span className="cm-acts">
                <button type="button" aria-label="위로" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button type="button" aria-label="아래로" onClick={() => move(i, 1)} disabled={i === cats.length - 1}>
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-danger"
                  title={n || ns ? "글이나 연작이 있는 분류는 지울 수 없어요" : ""}
                  disabled={n > 0 || ns > 0 || cats.length === 1}
                  onClick={() => setCats((l) => l.filter((_, k) => k !== i))}
                >
                  지우기
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="admin-actions">
        <button type="button" onClick={() => setCats((l) => [...l, { id: newId("c"), ko: "", en: "", indent: true, serial: false }])}>
          + 분류 더하기
        </button>
      </div>

      {cats.some((c) => c.serial) && (
        <>
          <h2>연작</h2>
          <p className="af-hint">새 연작은 글을 쓸 때 &lsquo;연작 → 새 연작 만들기&rsquo;로도 만들 수 있어요. 완결을 켜면 사이트에 &lsquo;완결&rsquo;로 보여요.</p>
          {series.length === 0 && <p className="admin-muted">아직 연작이 없어요.</p>}
          <ol className="cm-list">
            {series.map((s) => {
              const n = usedSeries(s.id);
              return (
                <li key={s.id} className="cm-row cm-series">
                  <select aria-label="분류" value={s.category} onChange={(e) => setS(s.id, { category: e.target.value })} disabled={n > 0}>
                    {cats
                      .filter((c) => c.serial || c.id === s.category)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.ko || "(이름 없음)"}
                        </option>
                      ))}
                  </select>
                  <input aria-label="연작 제목" value={s.title} onChange={(e) => setS(s.id, { title: e.target.value })} placeholder="연작 제목" required />
                  <input aria-label="연작 소개" value={s.note ?? ""} onChange={(e) => setS(s.id, { note: e.target.value })} placeholder="소개(없어도 돼요)" />
                  <label className="admin-check">
                    <input type="checkbox" checked={!!s.done} onChange={(e) => setS(s.id, { done: e.target.checked })} /> 완결
                  </label>
                  <span className="cm-n admin-muted">{n}화</span>
                  <span className="cm-acts">
                    <button
                      type="button"
                      className="admin-danger"
                      disabled={n > 0}
                      title={n ? "회차가 있는 연작은 지울 수 없어요" : ""}
                      onClick={() => setSeries((l) => l.filter((x) => x.id !== s.id))}
                    >
                      지우기
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="admin-actions">
            <button
              type="button"
              onClick={() => {
                const c = cats.find((x) => x.serial);
                if (c) setSeries((l) => [...l, { id: newId("s"), category: c.id, title: "" }]);
              }}
            >
              + 연작 더하기
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-actions cm-save">
        <button type="button" className="admin-primary" onClick={save} disabled={busy}>
          {busy ? "저장하는 중…" : "분류·연작 저장"}
        </button>
        <button type="button" onClick={onClose} disabled={busy}>
          닫기
        </button>
      </div>
    </section>
  );
}
