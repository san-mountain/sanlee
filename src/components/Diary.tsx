"use client";

import { Fragment } from "react";
import { diary, type DiaryEntry } from "@/data/diary";
import { useLang } from "./LangProvider";

const MARK = /⟦(\d+)⟧/g;
const ONLY_MARK = /^⟦(\d+)⟧$/;

// 검은 막대 안에 들어가는 글자는 원문이 아니라 같은 길이의 빈 자리다. (원문은 이 사이트 어디에도 없다)
// 막대 길이는 원래 글자 수를 따르되, 긴 부분일수록 압축한다(짧은 단어는 그대로, 긴 문단은 두세 줄 정도).
// "xxxx " 한 덩어리 ≈ 한글 두 글자 남짓.
function filler(n: number) {
  const len = n <= 20 ? n : 20 + Math.sqrt(n - 20) * 4;
  const words = Math.max(1, Math.round(len / 2.25));
  return Array.from({ length: words }, () => "xxxx").join(" ");
}

function Redacted({ n }: { n: number }) {
  return (
    <span className="redact" role="img" aria-label="private" title="private" tabIndex={0}>
      <span aria-hidden>{filler(n)}</span>
    </span>
  );
}

// 문단 하나가 통째로 가려진 경우: 원래 길이에 맞춰 여러 줄짜리 막대 덩어리
function RedactedBlock({ n }: { n: number }) {
  const lines = Math.min(6, Math.max(1, Math.round(Math.sqrt(n) / 6)));
  return (
    <div className="redact-block" role="img" aria-label="private" title="private" tabIndex={0}>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          style={{ width: i === lines - 1 && lines > 1 ? `${35 + ((n * 7 + i * 13) % 50)}%` : undefined }}
        />
      ))}
      <em className="redact-label" aria-hidden>
        private
      </em>
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(MARK);
  return (
    <>{parts.map((p, i) => (i % 2 === 1 ? <Redacted key={i} n={Number(p)} /> : <Fragment key={i}>{p}</Fragment>))}</>
  );
}

function Body({ body }: { body: string }) {
  return (
    <>
      {body.split("\n\n").map((para, j) => {
        const only = para.trim().match(ONLY_MARK);
        if (only) return <RedactedBlock key={j} n={Number(only[1])} />;
        if (para.trim() === "---") return <hr key={j} className="diary-rule" />;
        if (para.startsWith("## "))
          return (
            <h3 key={j} className="diary-sub">
              {para.slice(3)}
            </h3>
          );
        return (
          <p key={j} className="stanza">
            <Inline text={para} />
          </p>
        );
      })}
    </>
  );
}

// 목록에 보이는 첫 줄: 가려진 곳은 짧은 막대 문자로
function preview(body: string) {
  const first = body.split("\n").find((l) => l.trim() && l.trim() !== "---") ?? "";
  return first.replace(MARK, "▇▇▇").replace(/^## /, "").trim();
}

type Shown = Exclude<DiaryEntry, { hidden: true }>;

export default function Diary({ inExplore = false }: { inExplore?: boolean }) {
  const { lang } = useLang();
  const list = [...diary].reverse();
  const hiddenCount = diary.filter((d) => d.hidden).length;
  return (
    <div className="poems diary">
      <p className="poems-note diary-note">
        {lang === "ko"
          ? `2023년부터 쓴 일기 ${diary.length}편. 검게 지운 곳은 private로 남겨 두었고, ${hiddenCount}편은 날짜까지 지웠다.`
          : `${diary.length} diary entries since 2023, in their original Korean. Blacked-out passages stay private; ${hiddenCount} entries are withheld entirely.`}
      </p>
      {list.map((d, i) => {
        if (d.hidden) {
          return (
            <div key={`h${i}`} className="poem diary-withheld" role="img" aria-label="private">
              <span className="diary-withheld-bar" aria-hidden />
              <span className="meta">private</span>
            </div>
          );
        }
        const e = d as Shown;
        return (
          <details
            key={`${e.date}-${e.title ?? ""}`}
            name="diary"
            id={inExplore ? undefined : `diary-${e.date}${e.title ? `-${i}` : ""}`}
            className="poem diary-entry"
            lang="ko"
          >
            <summary>
              <span className="poem-head">
                <span className="poem-title">
                  {e.date}
                  {e.title && <span className="diary-title"> {e.title}</span>}
                </span>
                <span className="poem-first">{preview(e.body)}</span>
              </span>
            </summary>
            <div className="poem-body">
              <Body body={e.body} />
              <button
                type="button"
                className="poem-fold"
                onClick={(ev) => {
                  const det = ev.currentTarget.closest("details");
                  if (!det) return;
                  det.open = false;
                  det.querySelector("summary")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                }}
              >
                {lang === "ko" ? "↑ 접기" : "↑ Fold"}
              </button>
            </div>
          </details>
        );
      })}
    </div>
  );
}
