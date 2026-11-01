"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { diary, type DiaryEntry } from "@/data/diary";
import { useLang } from "./LangProvider";
import { unfold } from "./unfold";

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

// 가린 곳을 누르면: 막대가 잠깐 깨졌다가 다시 봉인되고, '열어 볼까요?' 창이 뜬다. [열기]는 자꾸 도망간다.
// (SEOUL 2087의 삭제·백업 세계관. 실제로 복원할 원문은 어디에도 없다.)
const RESTORE_EVENT = "diary-restore";
function restore(e: React.SyntheticEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove("cracking");
  void el.offsetWidth; // 애니메이션 다시 시작
  el.classList.add("cracking");
  window.dispatchEvent(new Event(RESTORE_EVENT));
}
const bar = {
  role: "button" as const,
  "aria-label": "private",
  title: "private",
  tabIndex: 0,
  onClick: restore,
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      restore(e);
    }
  },
  onAnimationEnd: (e: React.AnimationEvent<HTMLElement>) => e.currentTarget.classList.remove("cracking"),
};

const LOGS: { ko: string[]; en: string[] }[] = [
  {
    ko: ["복원 요청 중…", "실패: 소유자가 private로 지정한 기록입니다."],
    en: ["Requesting restore…", "Failed: the owner marked this record private."],
  },
  {
    ko: ["백업 사본 검색 중…", "0건. 이 문장은 서버에 올라온 적이 없습니다."],
    en: ["Searching backups…", "0 found. This sentence was never uploaded."],
  },
  { ko: ["접근 권한 확인 중…", "열람 가능: 작가 본인 1명"], en: ["Checking access…", "Readable by: the author (1)"] },
  {
    ko: ["해독 시도 중…", "해독 결과: (작가가 아직 읽히고 싶지 않음)"],
    en: ["Attempting to decode…", "Result: (the author would rather not be read yet)"],
  },
  {
    ko: ["복원 요청 중…", "실패: 아직 쓰는 중인 문장입니다."],
    en: ["Requesting restore…", "Failed: this sentence is still being written."],
  },
];
const KEEP = { ko: ["봉인 유지.", "고마워요."], en: ["Seal kept.", "Thank you."] };
const DODGES = 5; // [열기]는 다섯 번 도망간 뒤에야 눌린다. 눌러도 열리진 않는다.

// 가린 곳을 누르면 뜨는 작은 창: "열어 볼까요? [열기] [그대로 두기]"
function RestoreDialog() {
  const { lang } = useLang();
  const [phase, setPhase] = useState<null | { id: number; kind: "ask" } | { id: number; kind: "log"; lines: string[] }>(
    null,
  );
  const [dodge, setDodge] = useState({ x: 0, y: 0, n: 0 });
  const last = useRef(-1);
  const justFled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const on = () => {
      clearTimeout(timer.current);
      setDodge({ x: 0, y: 0, n: 0 });
      setPhase({ id: Date.now(), kind: "ask" });
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPhase(null);
    window.addEventListener(RESTORE_EVENT, on);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener(RESTORE_EVENT, on);
      window.removeEventListener("keydown", esc);
      clearTimeout(timer.current);
    };
  }, []);

  const showLog = (lines: string[]) => {
    setPhase({ id: Date.now(), kind: "log", lines });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase(null), 3200);
  };
  const fail = () => {
    let i = Math.floor(Math.random() * LOGS.length);
    if (i === last.current) i = (i + 1) % LOGS.length;
    last.current = i;
    showLog(LOGS[i][lang]);
  };
  // 마우스가 다가오거나 손가락이 닿으면 [열기]가 다른 자리로 달아난다
  const flee = (e: React.PointerEvent) => {
    if (dodge.n >= DODGES) return;
    if (e.pointerType !== "mouse") e.preventDefault();
    // 창 안쪽(왼쪽 위)으로만 달아나서 화면 밖으로 나가지 않는다
    setDodge((d) => {
      let x = -(30 + Math.random() * 170);
      if (Math.abs(x - d.x) < 50) x = x < -115 ? x + 80 : x - 80;
      return { x, y: -(Math.random() * 40), n: d.n + 1 };
    });
  };

  if (!phase) return null;
  if (phase.kind === "log")
    return (
      <div key={phase.id} className="restore-log" role="status" aria-live="polite">
        <span className="restore-line">
          <span className="restore-prompt">$</span> {phase.lines[0]}
        </span>
        <span className="restore-line restore-result">{phase.lines[1]}</span>
      </div>
    );
  const tired = dodge.n >= DODGES;
  return (
    <div key={phase.id} className="restore-log restore-ask" role="dialog" aria-label="private">
      <span className="restore-line">
        <span className="restore-prompt">$</span>{" "}
        {lang === "ko" ? "private 기록입니다. 열어 볼까요?" : "This record is private. Open it?"}
      </span>
      <span className="restore-buttons">
        <button
          type="button"
          className={`restore-open ${tired ? "tired" : ""}`}
          style={{ transform: `translate(${dodge.x}px, ${dodge.y}px)` }}
          onPointerEnter={(e) => e.pointerType === "mouse" && flee(e)}
          onPointerDown={(e) => {
            // 방금 도망간 그 터치가 곧바로 '클릭'으로 처리되지 않게
            if (dodge.n < DODGES) justFled.current = true;
            flee(e);
          }}
          onClick={(e) => {
            // 키보드로 누른 경우(detail 0)나 다섯 번 도망간 뒤에만 눌린다
            if (justFled.current) {
              justFled.current = false;
              return;
            }
            if (tired || e.detail === 0) fail();
          }}
        >
          {lang === "ko" ? (tired ? "…열기" : "열기") : tired ? "…open" : "Open"}
        </button>
        <button type="button" className="restore-keep" onClick={() => showLog(KEEP[lang])} autoFocus>
          {lang === "ko" ? "그대로 두기" : "Leave it"}
        </button>
      </span>
    </div>
  );
}

function Redacted({ n }: { n: number }) {
  return (
    <span className="redact" {...bar}>
      <span aria-hidden>{filler(n)}</span>
    </span>
  );
}

// 문단 하나가 통째로 가려진 경우: 원래 길이에 맞춰 여러 줄짜리 막대 덩어리
function RedactedBlock({ n }: { n: number }) {
  const lines = Math.min(6, Math.max(1, Math.round(Math.sqrt(n) / 6)));
  return (
    <div className="redact-block" {...bar}>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          style={{ width: i === lines - 1 && lines > 1 ? `${35 + ((n * 7 + i * 13) % 50)}%` : undefined }}
        />
      ))}
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
        // "> " 로 시작하는 줄은 노션의 콜아웃: 작가가 붙여 둔 메모지처럼
        if (para.startsWith("> "))
          return (
            <aside key={j} className="diary-memo">
              {para
                .split("\n")
                .map((l) => l.replace(/^> ?/, ""))
                .join("\n")}
            </aside>
          );
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
  // 기본은 오래된 순(일기를 쓴 순서대로). 버튼으로 최신 순과 바꿀 수 있다.
  const [newestFirst, setNewestFirst] = useState(false);
  const list = newestFirst ? [...diary].reverse() : diary;
  const hiddenCount = diary.filter((d) => d.hidden).length;
  return (
    <div className="poems diary">
      <div className="diary-head">
        <p className="poems-note diary-note">
          {lang === "ko"
            ? `2023년부터 쓴 일기 ${diary.length}편. 검게 지운 곳은 private로 남겨 두었고, ${hiddenCount}편은 날짜까지 지웠다.`
            : `${diary.length} diary entries since 2023, in their original Korean. Blacked-out passages stay private; ${hiddenCount} entries are withheld entirely.`}
        </p>
        <button
          type="button"
          className="diary-sort"
          onClick={() => setNewestFirst((v) => !v)}
          aria-label={lang === "ko" ? "정렬 바꾸기" : "Change order"}
        >
          {newestFirst
            ? lang === "ko"
              ? "최신 순 ⇅"
              : "Newest first ⇅"
            : lang === "ko"
              ? "오래된 순 ⇅"
              : "Oldest first ⇅"}
        </button>
      </div>
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
            data-group="diary"
            id={inExplore ? undefined : `diary-${e.date}${e.title ? `-${i}` : ""}`}
            className="poem diary-entry"
            lang="ko"
          >
            <summary
              onClick={(ev) => {
                ev.preventDefault();
                const det = ev.currentTarget.parentElement as HTMLDetailsElement;
                unfold(det, !det.open || det.dataset.closing === "1");
              }}
            >
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
                  unfold(det, false);
                  det.querySelector("summary")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                }}
              >
                {lang === "ko" ? "↑ 접기" : "↑ Fold"}
              </button>
            </div>
          </details>
        );
      })}
      <RestoreDialog />
    </div>
  );
}
