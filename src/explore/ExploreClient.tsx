"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sections, works, type L, type SectionId } from "@/data/site";
import { LangToggle, useLang } from "@/components/LangProvider";
import SectionBody from "@/components/SectionBody";
import { announcements, backupTerm, checkpoint, keeperAfterDeath, keeperBackupHint, npcs, plaque, quest, sanAfterDeath, sanCityLines, statueLines, ui, type Beat } from "./story";
import { CITY, QUEUE_Z, ZONES, type Interactable, type Zone } from "./zones";
import { player, teleport } from "./Player";
import { JumpButton, Joystick, requestLock, useLookAndKeys } from "./TouchControls";
import { input, loadSettings } from "./input";
import PauseMenu from "./PauseMenu";
import Minimap from "./Minimap";
import QuestArrow, { type QuestTarget } from "./QuestArrow";
import GazeHUD from "./GazeHUD";
import { autoWalk, gaze, resetGaze } from "./gaze";
import { finalBeam, restoreCovers } from "./Jabi";
import SaveToast from "./BackupLine";
import { clock, deleteBackup, getBackup, saveBackup, wipeBackup } from "./backup";

const World = dynamic(() => import("./World"), { ssr: false });

const KEY = "sanlee-visited";
const END_KEY = "sanlee-ending";
const MET_KEY = "sanlee-met";
const TALK_KEY = "sanlee-san-talked";
const FOUND_KEY = "sanlee-endings-found";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type Panel =
  | { kind: "section"; id: SectionId }
  | { kind: "painting"; work: number }
  | { kind: "dialog"; name: L; lines: L[]; step: number; plaque?: boolean }
  | { kind: "choice" }
  | { kind: "consent"; step: "ask" | "busy" | "done"; pick?: "accept" | "reject" }
  | { kind: "backup"; step: "view" | "confirm" | "done" }
  | null;

type EndKind = "accept" | "reject" | "ghost";
type Ending = { kind: EndKind; step: number; a: number; r: number; slots: number[] } | null;
// 결말 대본의 각 줄이 머무는 시간(ms). 마지막 줄 다음에 버튼이 나온다
const BEAT_MS: Record<EndKind, number[]> = {
  accept: [2600, 3200, 3800, 3200],
  reject: [2800, 3800, 4800, 3400],
  ghost: [2600, 3600, 5600, 4400],
};
// 수락한 시민이 다시 들어오면 서게 되는 줄 속 자리
// 줄 한가운데, 두 사람 사이. 여기서는 문 너머로 금빛이 된 대자비의 얼굴이 보인다
const LINE_SPOT = { x: 3.6, z: (QUEUE_Z[44] + QUEUE_Z[45]) / 2 };

export default function ExploreClient() {
  const { t, lang } = useLang();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [touch, setTouch] = useState(false);
  const [intro, setIntro] = useState(true);
  const [zone, setZone] = useState<Zone>("bunker");
  const [panel, setPanel] = useState<Panel>(null);
  const [visited, setVisited] = useState<SectionId[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [near, setNear] = useState<Interactable | null>(null);
  const [tracked, setTracked] = useState(false);
  const [fade, setFade] = useState<string | null>(null);
  const [notice, setNotice] = useState<L | null>(null);
  const [ending, setEnding] = useState<Ending>(null);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  // 문을 지나 다른 구역에서 넘어왔는지 (처음 시작·다시 시작이면 false)
  const [arrived, setArrived] = useState(false);
  const [met, setMet] = useState(false);
  // 세 기록을 모두 복원한 뒤, 풀려난 이산과 이야기했는지
  const [talked, setTalked] = useState(false);
  const [since] = useState(() => Date.now());
  // 수락 결말을 본 사람: 다시 오면 방공호가 아니라 줄 속에서 시작한다
  const [accepted, setAccepted] = useState(false);
  // 입장 전 쿠키 창: ask → busy(처리 중…) → yes(수락됨) → done
  // 발견한 결말 (거부 결말은 기록을 지우므로 남지 않는다)
  const [found, setFound] = useState<string[]>([]);
  const rootRef = useRef<HTMLElement>(null);
  const labelEls = useRef<Record<string, HTMLDivElement | null>>({});
  const complete = visited.length >= sections.length;

  // 일반 페이지에서 DELETE SEOUL로 지워지며 들어왔다면 그 흔적(그림 숨김 등)을 풀어 준다
  useEffect(() => {
    document.body.classList.remove("deleting");
  }, []);

  useEffect(() => {
    setWebgl(hasWebGL());
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    loadSettings();
    try {
      setMet(localStorage.getItem(MET_KEY) === "1");
      setTalked(localStorage.getItem(TALK_KEY) === "1");
      setAccepted(localStorage.getItem(END_KEY) === "accept");
      const f = JSON.parse(localStorage.getItem(FOUND_KEY) || "[]");
      if (Array.isArray(f)) setFound(f);
    } catch {}
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(v)) setVisited(v.filter((x) => sections.some((s) => s.id === x)));
    } catch {}
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const markVisited = useCallback(
    (id: SectionId) => {
      setVisited((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        showToast(`${t(ui.restored)} · ${next.length}/${sections.length}`);
        return next;
      });
    },
    [showToast, t]
  );

  const goTo = useCallback((to: Zone, viaDoor = true) => {
    setPanel(null);
    setFade(to === "city" ? "up" : "down");
    setTimeout(() => {
      setZone(to);
      setArrived(viaDoor);
      setTracked(false);
      // 배전실 문을 나서는 순간 백업이 만들어진다
      // 처음 지상에 나서면 시스템이 붙잡고 동의를 받는다. 그다음부터는 문을 나설 때마다 조용히 백업
      if (to === "city" && viaDoor) {
        const b = getBackup();
        if (b.n === 0 && !b.deleted) setTimeout(() => setPanel({ kind: "consent", step: "ask" }), 900);
        else setTimeout(() => saveBackup(CITY.spawn.pos[0], CITY.spawn.pos[2]), 700);
      }
      setTimeout(() => setFade(null), 500);
    }, 900);
  }, []);

  const interact = useCallback(
    (it: Interactable) => {
      switch (it.kind) {
        case "section":
          // 동상과 먼저 이야기해야 기록 터미널이 열린다
          if (!met && !complete && visited.length === 0) {
            setPanel({ kind: "dialog", name: it.label, lines: ui.terminalLocked, step: 0 });
            break;
          }
          setPanel({ kind: "section", id: it.section! });
          markVisited(it.section!);
          break;
        case "painting":
          setPanel({ kind: "painting", work: it.work! });
          break;
        case "statue":
          if (it.id === "san")
            setPanel({ kind: "dialog", name: { ko: "이산", en: "San" }, lines: getBackup().deaths > 0 ? [...sanCityLines, sanAfterDeath] : sanCityLines, step: 0 });
          else if (complete) {
            setPanel({ kind: "dialog", name: { ko: "이산", en: "San" }, lines: statueLines[statueLines.length - 1], step: 0 });
            setTalked(true);
            try {
              localStorage.setItem(TALK_KEY, "1");
            } catch {}
          }
          else {
            setPanel({ kind: "dialog", name: plaque[0], lines: statueLines[Math.min(visited.length, statueLines.length - 2)], step: 0, plaque: true });
            setMet(true);
            try {
              localStorage.setItem(MET_KEY, "1");
            } catch {}
          }
          break;
        case "npc": {
          const n = npcs[it.npc!];
          const base = complete && n.after ? n.after : n.lines;
          // 한 번이라도 보관 처리됐다면 관리인은 알아본다
          const bk = getBackup();
          let lines = it.npc === "keeper" && bk.deaths > 0 ? [keeperAfterDeath, ...base] : base;
          // 지상에 다녀와 백업이 생겼다면 관리인이 끊긴 단말을 알려 준다
          if (it.npc === "keeper" && bk.n > 0 && !bk.deleted) lines = [...lines, ...keeperBackupHint];
          setPanel({ kind: "dialog", name: n.name, lines, step: 0 });
          break;
        }
        case "door":
          goTo(it.to!);
          break;
        case "backup":
          setPanel({ kind: "backup", step: getBackup().deleted ? "done" : "view" });
          break;
        case "checkpoint":
          // 백업을 지우고 한 번도 죽지 않은 사람: 검문소가 알아보지 못한다
          if (complete && getBackup().deleted) startEndingRef.current("ghost");
          else if (complete) setPanel({ kind: "choice" });
          else setPanel({ kind: "dialog", name: it.label, lines: checkpoint.locked, step: 0 });
          break;
      }
    },
    [complete, goTo, markVisited, visited.length, met]
  );

  const startEndingRef = useRef<(k: EndKind) => void>(() => {});

  // 3D 물체를 직접 탭한 경우: 너무 멀면 무시
  const onTap = useCallback(
    (id: string) => {
      // PC에서는 클릭이 마우스 잠금·상호작용(E)으로 쓰이므로 물체 직접 탭은 터치 화면에서만
      if (!touch || panel || intro || fade || ending || paused) return;
      const it = ZONES[zone].items.find((i) => i.id === id);
      if (!it) return;
      const d = Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z);
      if (d > 10) return;
      interact(it);
    },
    [touch, panel, intro, fade, ending, paused, zone, interact]
  );

  // 테스트용: 주소 끝에 ?debug 를 붙이면 콘솔에서 이동·복원을 조작할 수 있다
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("debug")) return;
    (window as unknown as Record<string, unknown>).__neo = {
      goTo,
      tp: (x: number, z: number, yaw = 0) => (teleport.req = { x, z, yaw }),
      restore: () => setVisited(sections.map((s) => s.id)),
      pos: () => [player.pos.x, player.pos.z, player.yaw, player.air],
      input,
      look: (pitch: number) => (input.look.pitch += pitch),
      gaze,
      end: (k: EndKind) => startEndingRef.current(k),
    };
  }, [goTo]);

  const active = !intro && !panel && !fade && !ending && !paused;
  const activeRef = useRef(active);
  activeRef.current = active;
  const touchRef = useRef(touch);
  touchRef.current = touch;
  const nearRef = useRef(near);
  nearRef.current = near;
  const unlockAt = useRef(0);
  // PC: 마우스 잠금이 풀리면(Esc, 창 전환) 그대로 설정창을 연다
  const onLockChange = useCallback((l: boolean) => {
    setLocked(l);
    if (!l) {
      unlockAt.current = performance.now();
      if (activeRef.current && !touchRef.current) setPaused(true);
    }
  }, []);
  useLookAndKeys(
    rootRef,
    () => {
      if (nearRef.current) interact(nearRef.current);
    },
    active,
    onLockChange,
    !!fade && !panel && !paused && !ending
  );

  const lock = useCallback(() => {
    if (!touchRef.current) requestLock(rootRef.current);
  }, []);
  // 패널을 닫으면 곧바로 다시 마우스를 잠근다 (닫기 클릭 안에서 요청해야 브라우저가 허락)
  const closePanel = useCallback(() => {
    setPanel(null);
    lock();
  }, [lock]);
  // Esc로 설정창을 닫고 돌아오면 브라우저가 Esc 입력으로는 마우스 잠금을 허락하지 않는다.
  // 그래서 돌아온 뒤 처음 누르는 키(이동 키 등)에서 바로 다시 화면 가운데에 마우스를 잠근다.
  useEffect(() => {
    if (!active || locked || touch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.repeat) return;
      lock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, locked, touch, lock]);
  const resume = useCallback(() => {
    setPaused(false);
    lock();
  }, [lock]);
  // 설정창에서 곧장 방공호로: 방폭문 앞에서 방 안을 바라보며 들어온다
  const backToBunker = useCallback(() => {
    setPaused(false);
    goTo("bunker");
    lock();
  }, [goTo, lock]);

  // Esc: 패널 닫기 / 설정창 열고 닫기. E: 대화 넘기기
  const panelRef = useRef(panel);
  panelRef.current = panel;
  // 대화를 연 E 입력이 곧바로 첫 줄을 넘겨 버리지 않도록 잠깐 무시한다
  const panelAt = useRef(0);
  const hasPanel = !!panel;
  useEffect(() => {
    if (hasPanel) panelAt.current = performance.now();
  }, [hasPanel]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (performance.now() - unlockAt.current < 250) return; // 잠금 해제와 같은 Esc
        // 시스템의 동의 요청은 Esc로 피할 수 없다
        if (panelRef.current?.kind === "consent") return;
        if (panelRef.current) setPanel(null);
        else if (pausedRef.current) resume();
        else if (activeRef.current) setPaused(true);
        return;
      }
      const p = panelRef.current;
      if (e.code === "KeyE" && !e.repeat && p?.kind === "dialog" && performance.now() - panelAt.current > 250) {
        e.preventDefault();
        if (p.step < p.lines.length - 1) setPanel({ ...p, step: p.step + 1 });
        else closePanel();
        return;
      }
      // 작업·글·소개 패널과 그림 보기는 E로 바로 닫는다 (닫기 버튼과 같음)
      if (e.code === "KeyE" && !e.repeat && p && (p.kind === "section" || p.kind === "painting") && performance.now() - panelAt.current > 250) {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resume, closePanel]);

  // 지상에서는 관리 AI 방송이 주기적으로 흘러나옴
  useEffect(() => {
    if (zone !== "city" || ending) return;
    let i = 0;
    let hide: ReturnType<typeof setTimeout>;
    const show = () => {
      setNotice(announcements[i++ % announcements.length]);
      hide = setTimeout(() => setNotice(null), 6500);
    };
    const first = setTimeout(show, 3500);
    const iv = setInterval(show, 17000);
    return () => {
      clearTimeout(first);
      clearTimeout(hide);
      clearInterval(iv);
      setNotice(null);
    };
  }, [zone, ending]);

  // 결말 문장이 차례로 나타남
  const endStep = ending ? `${ending.kind}:${ending.step}` : "";
  useEffect(() => {
    if (!ending) return;
    const ms = BEAT_MS[ending.kind][ending.step];
    if (ms === undefined) return;
    const id = setTimeout(() => setEnding((e) => (e ? { ...e, step: e.step + 1 } : e)), ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endStep]);

  // 결말 연출: 줄마다 장면이 바뀐다
  const [secondStatue, setSecondStatue] = useState(false);
  const [flash, setFlash] = useState(false);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!ending) return;
    const { kind, step } = ending;
    // 마지막 줄에 닿으면 발견한 결말로 남긴다 (거부 결말은 기록을 지우므로 제외)
    if (kind !== "reject" && step === BEAT_MS[kind].length) {
      setFound((f) => {
        const next = f.includes(kind) ? f : [...f, kind];
        try {
          localStorage.setItem(FOUND_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    if (kind === "accept") {
      if (step === 0) {
        gaze.mood = "calm";
        // 줄 옆을 따라 걸어가 빈자리에 들어선다
        autoWalk.to = { x: 2.3, z: LINE_SPOT.z, speed: 3.6, pitch: 0.2 };
        sceneTimer.current = setTimeout(() => (autoWalk.to = { x: LINE_SPOT.x, z: LINE_SPOT.z, speed: 1.6, pitch: 0.42 }), 6800);
      }
      if (step === 4)
        try {
          localStorage.setItem(END_KEY, "accept");
        } catch {}
    } else if (kind === "reject") {
      if (step === 0) {
        finalBeam();
        sceneTimer.current = setTimeout(() => setFlash(true), 1500);
      }
      if (step === 2) {
        // 장면이 방공호로: 사람들이 두 번째 동상을 옮겨 놓았다
        setFlash(false);
        setSecondStatue(true);
        goTo("bunker", false);
      }
      if (step === 4) {
        // 이 결말은 저장되지 않는다: 진행 기록을 실제로 지운다
        try {
          [KEY, END_KEY, MET_KEY, TALK_KEY].forEach((k) => localStorage.removeItem(k));
        } catch {}
        wipeBackup();
      }
    } else if (kind === "ghost") {
      if (step === 0) gaze.mood = "blind";
      if (step === 2) autoWalk.to = { x: 0, z: -177, speed: 4.6, pitch: 0.78 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endStep]);

  const startEnding = (kind: EndKind) => {
    setPanel(null);
    const b = getBackup();
    const slots = Array.from({ length: Math.min(b.n, 12) }, (_, i) => b.n - i);
    setEnding({ kind, step: 0, a: b.deaths, r: b.restores, slots });
  };
  startEndingRef.current = startEnding;
  const choose = (kind: "accept" | "reject") => startEnding(kind);

  const resetProgress = () => {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(END_KEY);
      localStorage.removeItem(MET_KEY);
      localStorage.removeItem(TALK_KEY);
    } catch {}
    setVisited([]);
    setMet(false);
    setTalked(false);
  };
  const clearScene = () => {
    clearTimeout(sceneTimer.current);
    autoWalk.to = null;
    gaze.mood = "";
    setSecondStatue(false);
    setFlash(false);
  };
  const restart = () => {
    resetProgress();
    wipeBackup();
    resetGaze();
    restoreCovers();
    clearScene();
    setAccepted(false);
    setEnding(null);
    goTo("bunker", false);
    lock();
  };
  // 설정창의 '방문 기록 지우기': 수락한 시민에게는 줄 밖으로 돌아가는 유일한 길
  const onReset = () => {
    resetProgress();
    if (accepted) {
      setPaused(false);
      restart();
    }
  };
  // 백업이 없는 사람이 레이저에 맞으면: 처음부터 다시
  const onGone = useCallback(() => {
    try {
      [KEY, MET_KEY, TALK_KEY].forEach((k) => localStorage.removeItem(k));
    } catch {}
    wipeBackup();
    setVisited([]);
    setMet(false);
    setTalked(false);
    resetGaze();
    restoreCovers();
    goTo("bunker", false);
    setTimeout(() => setIntro(true), 900);
  }, [goTo]);

  // 입장: 수락한 시민은 곧장 줄 속에서 깨어난다
  const enter = () => {
    setIntro(false);
    if (accepted) {
      gaze.mood = "calm";
      teleport.req = { x: LINE_SPOT.x, z: QUEUE_Z[30], yaw: 0 };
      setZone("city");
      setArrived(false);
      setTimeout(() => {
        teleport.req = { x: LINE_SPOT.x, z: QUEUE_Z[30], yaw: 0 };
        setNotice(ui.welcomeB);
      }, 400);
    }
  };

  // 퀘스트 화살표의 목표: 매 프레임 플레이어 위치에 따라 고른다
  const questRef = useRef<() => QuestTarget>(() => null);
  questRef.current = () => {
    if (ending || accepted) return null;
    const items = ZONES[zone].items;
    const find = (id: string) => items.find((i) => i.id === id);
    const px = player.pos.x;
    const pz = player.pos.z;
    if (zone === "bunker") {
      if (!complete && !met && visited.length === 0) {
        const it = find("statue");
        return it ? { pos: it.pos, label: t(quest.statue) } : null;
      }
      if (!complete) {
        const left = items.filter((i) => i.kind === "section" && !visited.includes(i.section!));
        let best = left[0];
        for (const it of left) if (Math.hypot(it.pos.x - px, it.pos.z - pz) < Math.hypot(best.pos.x - px, best.pos.z - pz)) best = it;
        return best ? { pos: best.pos, label: `${t(quest.terminal)} ${visited.length}/${sections.length}` } : null;
      }
      if (!talked) {
        const it = find("statue");
        return it ? { pos: it.pos, label: t(quest.san) } : null;
      }
      const ex = find("exit");
      return ex ? { pos: ex.pos, label: t(quest.exit) } : null;
    }
    if (!complete || !talked) {
      const h = find("hatch");
      return h ? { pos: h.pos, label: t(quest.back) } : null;
    }
    // 골목(띠 A)에 있으면 먼저 남쪽 광장으로 나가는 길을 가리킨다
    if (Math.abs(px) > 11.5 && pz < 14) {
      const exits = [-58, -37.75, 37.75, 58, 23.75].map((x) => ({ x, z: 16 }));
      let best = exits[0];
      for (const e of exits) if (Math.hypot(e.x - px, e.z - pz) < Math.hypot(best.x - px, best.z - pz)) best = e;
      return { pos: best, label: t(quest.plaza) };
    }
    const cp = find("checkpoint");
    return cp ? { pos: cp.pos, label: t(quest.checkpoint) } : null;
  };
  const getQuest = useCallback(() => questRef.current(), []);

  // 대자비의 시선은 지상에서 자유롭게 움직일 때만 작동한다
  useEffect(() => {
    gaze.enabled = zone === "city" && active && !accepted;
    if (zone !== "city") {
      resetGaze();
      restoreCovers();
    }
  }, [zone, active, accepted]);

  if (webgl === false) {
    return (
      <main className="fallback-root">
        <div className="fallback">
          <h1 style={{ fontFamily: "var(--mono)", color: "var(--cyan)" }}>{t(ui.title)}</h1>
          <p>{t(ui.noWebgl)}</p>
          <Link href="/" className="btn primary">
            {t(ui.toPortfolio)}
          </Link>
        </div>
      </main>
    );
  }

  const sectionMeta = panel?.kind === "section" ? sections.find((s) => s.id === panel.id)! : null;
  const painting = panel?.kind === "painting" ? works[panel.work] : null;
  const verb = near ? (near.id.startsWith("scope") || near.kind === "painting" ? ui.view : near.kind === "npc" || near.kind === "statue" ? ui.talk : ui.open) : null;
  const rootClass = [
    "explore-root",
    ending ? `ending-${ending.kind}` : "",
    ending?.kind === "reject" && ending.step >= 2 ? "thaw" : "",
    flash ? "final-flash" : "",
    tracked && !ending ? "is-tracked" : "",
  ].join(" ");

  return (
    <main className={rootClass} ref={rootRef}>
      {webgl && (
        <div className="canvas-wrap">
          <World
            zone={zone}
            lang={lang}
            visited={visited}
            onTap={onTap}
            onNear={setNear}
            onTracked={setTracked}
            labelEls={labelEls}
            sanMode={ending?.kind === "accept" ? "stay" : ending?.kind === "ghost" && ending.step >= 3 ? "beside" : undefined}
            hideSan={accepted}
            secondStatue={secondStatue}
            arrived={arrived}
          />
        </div>
      )}

      {webgl && zone === "bunker" && !complete && (
        <div className="labels">
          <div className="label-anchor" ref={(el) => { labelEls.current.popup = el; }}>
            <div className="cookie-popup">
              <p>{t(ui.popup)}</p>
              <div>
                <span className="cp-accept">{t(ui.accept)}</span>
                <span className="cp-reject">{t(ui.reject)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hud">
        <Link href="/">{t(ui.home)}</Link>
        <span className="hud-title glitch">{t(ui.title)}</span>
        <span className="hud-right">
          <span className="hud-progress">{visited.length}/{sections.length}</span>
          <LangToggle />
          <button type="button" className="hud-gear" aria-label="settings" onClick={() => !intro && !ending && setPaused(true)}>
            ⚙
          </button>
        </span>
      </div>
      <div className="hud-zone">
        {t(zone === "bunker" ? ui.zoneBunker : ui.zoneCity)}
        {tracked && !ending && <span className="tracked">{t(ui.tracked)}</span>}
      </div>

      {toast && <div className="toast">{toast}</div>}
      {!intro && !ending && !accepted && <SaveToast />}
      {notice && !panel && <div className="notice">{t(notice)}</div>}

      {active && near && verb && !touch && (
        <button type="button" className="prompt" onClick={() => interact(near)} style={{ borderColor: near.color, color: near.color }}>
          {!touch && <kbd>{locked ? "E / Click" : "E"}</kbd>}
          <span>
            {t(near.id === "statue" && complete ? { ko: "이산", en: "San" } : near.label)} · {t(verb)}
          </span>
        </button>
      )}

      {active && !near && <div className="hint">{t(touch ? ui.hintTouch : locked ? ui.hintLocked : ui.hintPc)}</div>}
      {active && locked && <div className="crosshair" aria-hidden />}
      {active && <QuestArrow get={getQuest} />}
      {!intro && !ending && <Minimap zone={zone} get={getQuest} />}
      {zone === "city" && !ending && !accepted && <GazeHUD rootRef={rootRef} onGone={onGone} />}
      {active && touch && <Joystick />}
      {active && touch && (
        <JumpButton
          action={
            near && verb
              ? {
                  label: `${t(near.id === "statue" && complete ? { ko: "이산", en: "San" } : near.label)} · ${t(verb)}`,
                  color: near.color,
                  run: () => interact(near),
                }
              : null
          }
        />
      )}
      {paused && (
        <PauseMenu
          onResume={resume}
          onReset={onReset}
          onBunker={zone === "city" && !ending && !accepted ? backToBunker : undefined}
          since={since}
          inBunker={zone === "bunker"}
        />
      )}

      {panel?.kind === "section" && sectionMeta && (
        <div className="panel-wrap">
          <div className="panel">
            <div className="panel-head">
              <h2>{sectionMeta.label.toUpperCase()}</h2>
              <small>{sectionMeta.labelKo}</small>
            </div>
            <SectionBody id={panel.id} inExplore />
            <div className="panel-actions">
              <button className="btn" onClick={closePanel}>
                {t(ui.back)}
              </button>
            </div>
          </div>
        </div>
      )}

      {painting && (
        <div className="panel-wrap">
          <div className="panel painting-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={painting.image} alt={t(painting.title)} width={painting.width} height={painting.height} />
            <p className="caption">
              <strong>{lang === "ko" ? `〈${painting.title.ko}〉` : <em>{painting.title.en}</em>}</strong>, {painting.date.slice(0, 4)}
              <br />
              {t(painting.medium)}, {t(painting.size)}
            </p>
            <div className="panel-actions">
              <button className="btn" onClick={closePanel}>
                {t(ui.close)}
              </button>
            </div>
          </div>
        </div>
      )}

      {panel?.kind === "dialog" && (
        <div className="panel-wrap">
          <div className="panel pink dialog">
            {panel.plaque ? (
              <div className="plaque">
                {plaque.map((p, i) => (
                  <div key={i}>{t(p)}</div>
                ))}
              </div>
            ) : (
              <div className="speaker">{t(panel.name)}</div>
            )}
            <p className="line">“{t(panel.lines[Math.min(panel.step, panel.lines.length - 1)])}”</p>
            <div className="panel-actions">
              <button className="btn" onClick={closePanel}>
                {t(ui.close)}
              </button>
              {panel.step < panel.lines.length - 1 && (
                <button className="btn primary" autoFocus onClick={() => setPanel({ ...panel, step: panel.step + 1 })}>
                  {t(ui.next)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {panel?.kind === "choice" && (
        <div className="choice-wrap">
          <div className="choice" role="dialog" aria-modal="true">
            <span className="choice-sys">SYS://SEOUL/CHECKPOINT · GATE-01</span>
            <span className="choice-alert">{lang === "ko" ? "▲ 응답 필요 · 미응답 시 통과 불가" : "▲ RESPONSE REQUIRED · NO PASSAGE UNTIL ANSWERED"}</span>
            <h2>{t(checkpoint.title)}</h2>
            <p>{t(checkpoint.body)}</p>
            <p className="choice-san">
              <span>{lang === "ko" ? "이산" : "San"}</span>“{t(checkpoint.sanWarn)}”
            </p>
            <div className="choice-actions">
              <button className="choice-accept" onClick={() => choose("accept")}>
                {t(ui.accept)}
                <small>{t(checkpoint.acceptSub)}</small>
              </button>
              <button className="choice-reject" onClick={() => choose("reject")}>
                {t(ui.reject)}
                <small>{t(checkpoint.rejectSub)}</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {panel?.kind === "consent" && (
        <div className="choice-wrap">
          <div className="choice consent" role="dialog" aria-modal="true">
            <span className="choice-sys">{t(ui.consentSys)}</span>
            <span className="choice-alert">{lang === "ko" ? "▲ 이동 정지 · 응답 필요" : "▲ MOVEMENT HALTED · RESPONSE REQUIRED"}</span>
            <h2>{t(ui.consentTitle)}</h2>
            <p>{t(ui.consentBody)}</p>
            {panel.step === "ask" && (
              <div className="choice-actions">
                {(["accept", "reject"] as const).map((k) => (
                  <button
                    key={k}
                    className={k === "accept" ? "choice-accept" : "choice-reject"}
                    autoFocus={k === "accept"}
                    onClick={() => {
                      setPanel({ kind: "consent", step: "busy", pick: k });
                      setTimeout(() => {
                        saveBackup(CITY.spawn.pos[0], CITY.spawn.pos[2]);
                        setPanel((p) => (p?.kind === "consent" ? { ...p, step: "done" } : p));
                      }, 1300);
                    }}
                  >
                    {t(k === "accept" ? ui.accept : ui.reject)}
                  </button>
                ))}
              </div>
            )}
            {panel.step !== "ask" && (
              <p className="consent-status">
                {panel.pick === "reject" && <s>{t(ui.reject)}</s>} {panel.step === "busy" ? t(ui.processing) : `✓ ${t(ui.acceptedAll)}`}
              </p>
            )}
            {panel.step === "done" && (
              <>
                <p className="consent-backup">● {t(ui.consentDone)}</p>
                <div className="panel-actions">
                  <button className="btn primary" autoFocus onClick={closePanel}>
                    {t(ui.consentOk)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {panel?.kind === "backup" && (
        <div className="panel-wrap">
          <div className="panel backup-term">
            <div className="panel-head">
              <h2>{t(backupTerm.title)}</h2>
            </div>
            <p className="bt-sub">{t(backupTerm.sub)}</p>
            {(() => {
              const b = getBackup();
              if (panel.step === "done") return <p className="bt-gone">{t(b.deleted ? backupTerm.done : backupTerm.gone)}</p>;
              if (!b.list.length) return <p className="bt-none">{t(backupTerm.none)}</p>;
              return (
                <ol className="bt-list">
                  {b.list
                    .slice(-3)
                    .reverse()
                    .map((x) => (
                      <li key={x.n}>
                        BACKUP #{x.n} · {clock(x.t)}
                      </li>
                    ))}
                </ol>
              );
            })()}
            {panel.step === "confirm" && <p className="bt-confirm">{t(backupTerm.confirm)}</p>}
            <div className="panel-actions">
              {panel.step === "view" && getBackup().list.length > 0 && (
                <button className="btn danger" onClick={() => setPanel({ kind: "backup", step: "confirm" })}>
                  {t(backupTerm.del)}
                </button>
              )}
              {panel.step === "confirm" && (
                <>
                  <button className="btn" autoFocus onClick={() => setPanel({ kind: "backup", step: "view" })}>
                    {t(backupTerm.no)}
                  </button>
                  <button
                    className="btn danger"
                    onClick={() => {
                      deleteBackup();
                      setPanel({ kind: "backup", step: "done" });
                    }}
                  >
                    {t(backupTerm.yes)}
                  </button>
                </>
              )}
              {panel.step !== "confirm" && (
                <button className="btn primary" autoFocus onClick={closePanel}>
                  {t(ui.close)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {ending && (
        <div className={`ending ending-${ending.kind}`}>
          <div className="ending-inner">
            {(checkpoint[ending.kind] as Beat[]).slice(0, ending.step + 1).map((l, i, arr) => {
              // 거부 결말이 방공호로 넘어가면 앞 장면의 글은 거둔다
              if (ending.kind === "reject" && ending.step >= 2 && i < 2) return null;
              // 숨은 결말은 대자비의 얼굴을 가리지 않도록 마지막 두 줄만 아래에
              if (ending.kind === "ghost" && i < ending.step - 1) return null;
              const last = i === (checkpoint[ending.kind] as Beat[]).length - 1;
              const cls = [last ? "final" : "", l.say ? "say" : "", l.plaque ? "plaque-line" : "", i < arr.length - 1 && !last ? "past" : ""].join(" ");
              if (l.slots)
                return (
                  <div key={i} className="slots">
                    {ending.slots.length ? (
                      ending.slots.map((n, k) => (
                        <span key={n} style={{ animationDelay: `${0.25 + k * 0.22}s` }}>
                          BACKUP #{n} <b>{t(checkpoint.slotErased)}</b>
                        </span>
                      ))
                    ) : (
                      <span>{t(checkpoint.noSlots)}</span>
                    )}
                  </div>
                );
              return (
                <p key={i} className={cls}>
                  {l.say && <span className="say-name">{lang === "ko" ? "이산" : "San"}</span>}
                  {l.say ? `“${t(l)}”` : t(l).replace("{a}", String(ending.a)).replace("{r}", String(ending.r))}
                </p>
              );
            })}
            {ending.step >= (checkpoint[ending.kind] as Beat[]).length - 1 && (
              <div className="ending-actions">
                <small>{t(ending.kind === "accept" ? checkpoint.endingAccept : ending.kind === "reject" ? checkpoint.endingReject : checkpoint.endingGhost)}</small>
                <small className="ending-found">
                  {ending.kind === "reject" ? t(ui.notRecorded) : t(ui.foundEndings).replace("{n}", String(Math.max(1, found.length)))}
                </small>
                <div>
                  {ending.kind === "accept" ? (
                    <button className="btn" onClick={() => location.reload()}>
                      {t(checkpoint.reconnect)}
                    </button>
                  ) : (
                    <button className="btn" onClick={restart}>
                      {t(checkpoint.again)}
                    </button>
                  )}
                  <Link className="btn primary" href="/">
                    {t(checkpoint.toPortfolio)}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {fade && <div className="fade">{t(fade === "up" ? ui.goingUp : ui.goingDown)}</div>}

      {intro && (
        <div className="intro">
          <div className="panel pink">
            <div className="panel-head">
              <h2 className="glitch">{t(ui.title)}</h2>
              <LangToggle />
            </div>
            {accepted ? <p>{t(ui.welcomeB)}</p> : ui.introLines.map((l, i) => <p key={i}>{t(l)}</p>)}
            {found.length > 0 && <p className="intro-found">{t(ui.foundEndings).replace("{n}", String(found.length))}</p>}
            <p className="intro-controls">{t(touch ? ui.hintTouch : ui.hintIntroPc)}</p>
            <div className="panel-actions" style={{ justifyContent: "flex-end" }}>
              {/* 들어가지 않고 웹사이트로 돌아가는 보조 선택지 */}
              <Link href="/" className="btn ghost">
                {t(ui.goBack)}
              </Link>
              <button
                className="btn primary"
                autoFocus
                onClick={() => {
                  enter();
                  // 휴대폰: 시작 버튼을 누르는 순간 전체화면으로 (안드로이드 크롬 등에서 주소창이 사라진다)
                  if (touch && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {});
                  }
                  lock();
                }}
              >
                {t(accepted ? ui.startLine : ui.start)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
