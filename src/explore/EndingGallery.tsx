"use client";

import { useLang } from "@/components/LangProvider";
import { MUSIC_URL, TRACKS, galleryUi, notes, notesUi } from "./story";

export type EndKey = "accept" | "reject" | "ghost";
export const MEMORY_KEY = "sanlee-endings-remembered";
const KINDS: EndKey[] = ["accept", "reject", "ghost"];

// 이 기기가 기억하는 결말 (도시의 저장(FOUND_KEY)과 따로. 처음 본 시각)
export function readMemory(): Partial<Record<EndKey, number>> {
  try {
    const v = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
    const out: Partial<Record<EndKey, number>> = {};
    for (const k of KINDS) if (typeof v?.[k] === "number") out[k] = v[k];
    return out;
  } catch {
    return {};
  }
}
export function remember(k: EndKey) {
  const m = readMemory();
  if (m[k]) return m;
  const next = { ...m, [k]: Date.now() };
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

// 결말 모음: 세 칸(본 결말은 이름·마지막 줄·도시의 저장 여부, 못 본 결말은 실마리 한 줄)과 백진성의 수록곡
export default function EndingGallery({ seen, notesRead = [], onClose }: { seen: Partial<Record<EndKey, number>>; notesRead?: number[]; onClose: () => void }) {
  const { t, lang } = useLang();
  const day = (ms: number) => new Date(ms).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-GB", { year: "numeric", month: "short", day: "numeric" });
  return (
    <div className="intro gallery-wrap">
      <div className="panel pink gallery" role="dialog" aria-modal="true" aria-labelledby="gallery-title" tabIndex={-1}>
        <div className="panel-head">
          <h2 id="gallery-title">{t(galleryUi.title)}</h2>
          <small>{KINDS.filter((k) => seen[k]).length}/3</small>
        </div>
        <p className="gallery-sub">{t(galleryUi.sub)}</p>
        <ol className="gallery-endings">
          {KINDS.map((k) => {
            const e = galleryUi.endings[k];
            const at = seen[k];
            return (
              <li key={k} className={at ? `seen end-${k}` : "unseen"}>
                {at ? (
                  <>
                    <b>{t(e.name)}</b>
                    <p>{t(e.line)}</p>
                    <small>
                      {t(e.status)} · {day(at)}
                    </small>
                  </>
                ) : (
                  <>
                    <b>{t(galleryUi.unknown)}</b>
                    <p className="g-hint">{t(e.hint)}…</p>
                  </>
                )}
              </li>
            );
          })}
        </ol>
        {notesRead.length > 0 && (
          <>
            <h3 className="gallery-tracks-title">{t(notesUi.found).replace("{n}", String(notesRead.length))}</h3>
            <ol className="gallery-notes">
              {notes.map((n, i) => (
                <li key={i} className={notesRead.includes(i) ? "" : "hidden"}>
                  {notesRead.includes(i) ? t(n) : t(notesUi.missing)}
                </li>
              ))}
            </ol>
          </>
        )}
        <h3 className="gallery-tracks-title">{t(galleryUi.tracks)}</h3>
        <ul className="gallery-tracks">
          {TRACKS.map((tr) => {
            const open = !tr.need || seen[tr.need];
            return (
              <li key={tr.title} className={open ? "" : "hidden"}>
                <span>{open ? tr.title : "■■■■■■"}</span>
                <small>{open ? t(tr.where) : t(galleryUi.hidden)}</small>
              </li>
            );
          })}
        </ul>
        <div className="panel-actions">
          <a className="btn ghost" href={MUSIC_URL} target="_blank" rel="noopener noreferrer">
            {t(galleryUi.listen)}
          </a>
          <button className="btn primary" autoFocus onClick={onClose}>
            {t(galleryUi.close)}
          </button>
        </div>
      </div>
    </div>
  );
}
