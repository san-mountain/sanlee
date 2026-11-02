"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./LangProvider";
import { BACKUP_KEY, forgetCityRecords } from "@/explore/backup";

// 꼬리말 끝의 'delete seoul': 지상에서 이산이 '그 문장'을 남긴 기기에서만 켜지는 작은 네온 간판.
// (관리인의 단서 "도시 밖, 이 도시를 만든 사람의 집으로"를 들은 뒤에야 집 앞에 불이 켜진다)
// 누르면 간판이 깜빡이다 꺼지고, 이 기기에 남은 도시의 기록이 한 줄씩 나타났다 지워진다. 실제로 지운다.
// 언어·효과음 설정은 기록이 아니라서 남긴다
const PROMISE_KEY = "sanlee-promise";

type Line = { text: string; kept?: boolean };

function read<T>(k: string, fb: T): T {
  try {
    const v = localStorage.getItem(k);
    return v === null ? fb : (JSON.parse(v) as T);
  } catch {
    return fb;
  }
}

// 지우기 직전에 무엇이 남아 있었는지 사람이 읽을 수 있는 줄로 만든다
function describe(ko: boolean): Line[] {
  const lines: Line[] = [];
  const login = read<number | null>("sanlee-last-login", null);
  if (login) {
    const d = new Date(login);
    const t = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    lines.push({ text: ko ? `마지막 접속 ${t}` : `Last login ${t}` });
  }
  const visited = read<string[]>("sanlee-visited", []);
  if (visited.length) lines.push({ text: ko ? `복원한 터미널 ${visited.length}대` : `${visited.length} terminals restored` });
  const b = read<{ n?: number; deaths?: number } | null>(BACKUP_KEY, null);
  if (b?.n) lines.push({ text: ko ? `위치 백업 ${b.n}건` : `${b.n} position backups` });
  if (b?.deaths) lines.push({ text: ko ? `보관 처리 ${b.deaths}회` : `Archived ${b.deaths} times` });
  const found = read<string[]>("sanlee-endings-found", []);
  if (found.length) lines.push({ text: ko ? `발견한 결말 ${found.length}개` : `${found.length} endings found` });
  if (read<string | null>("sanlee-ending", null) === "accept") lines.push({ text: ko ? "자동 로그인 동의" : "Automatic login consent" });
  if (!lines.length) lines.push({ text: ko ? "방문 기록" : "Visit history" });
  // 마지막 줄은 지워지지 않는다: 기억은 이 기기에 있지 않으니까
  lines.push({ text: ko ? "당신이 기억하는 것 · 이 기기에 없음" : "What you remember · not on this device", kept: true });
  return lines;
}

const STEP_MS = 520;

export default function ForgetCity() {
  const { lang } = useLang();
  const ko = lang === "ko";
  // idle → dying(간판이 꺼진다) → erasing(기록이 지워진다) → done
  const [phase, setPhase] = useState<"idle" | "dying" | "erasing" | "done">("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [shown, setShown] = useState(0);
  // 서버에서는 알 수 없으므로 마운트 뒤에 기록이 있는지 확인한다 (없으면 아무것도 그리지 않는다)
  const [has, setHas] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    try {
      setHas(localStorage.getItem(PROMISE_KEY) !== null);
    } catch {}
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
  }, []);

  const onClick = () => {
    if (phase !== "idle") return;
    const ls = describe(ko);
    setLines(ls);
    // 삭제 전 목록은 연출에 남기고, 실제 기록과 백업 캐시는 같은 인터페이스로 비운다.
    forgetCityRecords();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(ls.length);
      setPhase("done");
      return;
    }
    setPhase("dying");
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    at(900, () => setPhase("erasing"));
    ls.forEach((_, i) => at(900 + (i + 1) * STEP_MS, () => setShown(i + 1)));
    at(900 + (ls.length + 2) * STEP_MS, () => setPhase("done"));
  };

  if (!has) return null;
  if (phase === "idle" || phase === "dying")
    return (
      <button type="button" className={`forget-city${phase === "dying" ? " dying" : ""}`} onClick={onClick} aria-label={ko ? "이 기기의 도시 기록 지우기" : "Delete this device's city records"}>
        delete seoul
      </button>
    );
  return (
    <span className={`forget-log${phase === "done" ? " done" : ""}`} role="status">
      {lines.slice(0, shown).map((l, i) => (
        <span key={i} className={l.kept ? "kept" : "gone"}>
          {l.text}
        </span>
      ))}
      {phase === "done" && <span className="final">{ko ? "이 기기에서 도시의 기록을 지웠습니다." : "The city's records on this device are gone."}</span>}
    </span>
  );
}
