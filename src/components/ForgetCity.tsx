"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./LangProvider";
import { BACKUP_KEY, forgetCityRecords } from "@/explore/backup";

// 꼬리말 끝의 'delete seoul': 검문소에서 물러난 뒤 이산의 부탁("다시 만나면 오늘 망원경에서 있었던 얘길 해 줘")을 들은 기기에서만 켜지는 작은 네온 간판.
// 누르면 먼저 무엇을 지우는지 한 줄로 알려 주고, 한 번 더 누르면 간판이 꺼지며 이 기기의 DELETE SEOUL 기록이
// 한 줄씩 나타났다 지워진다. 실제로 지운다. 웹사이트·작품·다른 데이터는 건드리지 않고, 언어·효과음 설정도 남긴다
const PROMISE_KEY = "sanlee-promise";
// "2" = 망원경 이야기 부탁. 예전 값 "1"(시 한 줄 약속)로는 켜지지 않는다 (게임에 들어가면 지워지고, 새 부탁을 들으면 다시 켜진다)
const PROMISE_NOW = "2";

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
  if (visited.length) lines.push({ text: ko ? `기록 열람 ${visited.length}건` : `${visited.length} records viewed` });
  const b = read<{ n?: number; deaths?: number } | null>(BACKUP_KEY, null);
  if (b?.n) lines.push({ text: ko ? `위치 저장 ${b.n}회` : `${b.n} positions saved` });
  if (b?.deaths) lines.push({ text: ko ? `연결 중단 ${b.deaths}회` : `Disconnected ${b.deaths} time(s)` });
  const found = read<string[]>("sanlee-endings-found", []);
  if (found.length) lines.push({ text: ko ? `발견한 결말 ${found.length}개` : `${found.length} endings found` });
  if (read<string | null>("sanlee-ending", null) === "accept") lines.push({ text: ko ? "자동 접속 설정" : "Automatic sign-in setting" });
  const scope = read<{ uses?: number } | null>("sanlee-scope", null);
  if (scope?.uses) lines.push({ text: ko ? `남쪽 망원경 이용 ${scope.uses}회` : `South scope used ${scope.uses} time(s)` });
  if (String(read<unknown>(PROMISE_KEY, null)) === PROMISE_NOW) lines.push({ text: ko ? "이산의 부탁을 들은 기록" : "Record of hearing San's request" });
  if (!lines.length) lines.push({ text: ko ? "방문 기록" : "Visit history" });
  // 마지막 줄은 지워지지 않는다: 기억은 이 기기에 있지 않으니까
  lines.push({ text: ko ? "당신의 기억 · 이 기기에 저장되지 않음" : "Your memory · not stored on this device", kept: true });
  return lines;
}

const STEP_MS = 520;

export default function ForgetCity() {
  const { lang } = useLang();
  const ko = lang === "ko";
  // idle → confirm(무엇을 지우는지 알림) → dying(간판이 꺼진다) → erasing(기록이 지워진다) → done
  const [phase, setPhase] = useState<"idle" | "confirm" | "dying" | "erasing" | "done">("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [shown, setShown] = useState(0);
  // 서버에서는 알 수 없으므로 마운트 뒤에 기록이 있는지 확인한다 (없으면 아무것도 그리지 않는다)
  const [has, setHas] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    try {
      setHas(localStorage.getItem(PROMISE_KEY) === PROMISE_NOW);
    } catch {}
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
  }, []);

  const onClick = () => {
    if (phase === "idle") return setPhase("confirm");
    if (phase !== "confirm") return;
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
  if (phase === "confirm")
    return (
      <span className="forget-ask" role="group" aria-label={ko ? "DELETE SEOUL 기록 삭제 확인" : "Confirm deleting DELETE SEOUL records"}>
        <span>
          {ko
            ? "이 기기에 저장된 DELETE SEOUL의 진행 상황과 방문 기록을 모두 지웁니다. 이산은 다시 멈추고, 당신을 기억하지 못합니다. 웹사이트와 작품, 언어·효과음 설정은 그대로 남습니다."
            : "This erases the DELETE SEOUL records kept on this device (records viewed, position backups, endings, last login). The website and the work stay as they are. Next time you enter, San will not recognise you."}
        </span>
        <button type="button" className="forget-city" onClick={onClick}>
          {ko ? "기록 지우기" : "Delete records"}
        </button>
        <button type="button" className="forget-cancel" onClick={() => setPhase("idle")}>
          {ko ? "취소" : "Cancel"}
        </button>
      </span>
    );
  if (phase === "idle" || phase === "dying")
    return (
      <button type="button" className={`forget-city${phase === "dying" ? " dying" : ""}`} onClick={onClick} title={ko ? "이 기기의 DELETE SEOUL 기록 지우기" : "Delete this device's DELETE SEOUL records"} aria-label={ko ? "이 기기의 DELETE SEOUL 기록 지우기" : "Delete this device's DELETE SEOUL records"}>
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
      {phase === "done" && <span className="final">{ko ? "DELETE SEOUL 기록을 지웠습니다. 웹사이트와 작품은 그대로 남아 있습니다." : "DELETE SEOUL records deleted. The website and the work remain as they are."}</span>}
    </span>
  );
}
