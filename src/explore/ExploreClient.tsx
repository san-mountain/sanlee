"use client";

import { sfx } from "./sfx";
import { duckBgm, playBgm, wakeBgm } from "./bgm";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RESTORE_KEY } from "@/components/RestoreCrossing";
import { useCallback, useEffect, useRef, useState } from "react";
import { sections, works, type L, type SectionId } from "@/data/site";
import { LangToggle, useLang } from "@/components/LangProvider";
import SectionBody from "@/components/SectionBody";
import { MUSIC_URL, credits, announcements, checkpoint, jabiUi, whisper, keeperAfterDeath, npcs, plaque, promiseLine, quest, sanAfterDeath, sanCityLines, sanCue, statueForgot, statueLines, ui, type Beat } from "./story";
import { CITY, COVERS, JABI, QUEUE_Z, ZONES, type Interactable, type Zone } from "./zones";
import { sanHold } from "./SanNPC";
import { player, teleport } from "./Player";
import { JumpButton, Joystick, requestLock, useLookAndKeys } from "./TouchControls";
import { input, loadSettings } from "./input";
import PauseMenu from "./PauseMenu";
import Minimap from "./Minimap";
import QuestArrow, { type QuestTarget } from "./QuestArrow";
import CookieGame from "./CookieGame";
import GazeHUD from "./GazeHUD";
import { autoWalk, gaze, resetGaze } from "./gaze";
import { finalBeam, restoreCovers } from "./Jabi";
import SaveToast from "./BackupLine";
import { getBackup, saveBackup, wipeBackup } from "./backup";

const World = dynamic(() => import("./World"), { ssr: false });

const KEY = "sanlee-visited";
const END_KEY = "sanlee-ending";
const MET_KEY = "sanlee-met";
const TALK_KEY = "sanlee-san-talked";
const LOGIN_KEY = "sanlee-last-login";
const PROMISE_KEY = "sanlee-promise";
const FORGOT_KEY = "sanlee-forgotten";
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
  | { kind: "dialog"; name: L; lines: L[]; step: number; plaque?: boolean; locked?: boolean; whisper?: boolean; link?: { href: string; label: L } }
  | { kind: "choice"; settings?: boolean; confirm?: number; game?: boolean }
  | { kind: "jabi" }
  | null;

type EndKind = "accept" | "reject" | "ghost";
type Ending = { kind: EndKind; step: number; a: number; r: number; slots: number[] } | null;
// 결말 대본의 각 줄이 머무는 시간(ms). 마지막 줄의 시간은 버튼이 나오기 전의 정적이다.
// 空 결말은 마지막 줄(step 4)에서 멈추고, 플레이어가 한 걸음을 내디뎌야 끝난다
const BEAT_MS: Record<EndKind, number[]> = {
  accept: [3000, 3400, 3400, 3000, 3600, 3000],
  reject: [2800, 3400, 3800, 4800, 3200],
  ghost: [3000, 3600, 4200, 6500],
};
const GHOST_STEP = 4;
// 처음 대자비의 시선 앞에서 이산이 기다리는 자리: 큰길 첫 엄폐물(키오스크)의 뒤쪽(남쪽)
const KIOSK = COVERS[0];
const COVER_SPOT = { x: KIOSK.x, z: KIOSK.z + KIOSK.d / 2 + 0.7 };
// 空 결말: 다리 위 하층행 승강장 계단 앞. 동쪽(+x)을 바라본다
const STAIR_TOP = { x: 2.4, z: -153, yaw: -Math.PI / 2 };
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
  // 기록 없이 돌아와 이산의 말을 건넨 사람: 이 상태는 어디에도 저장하지 않는다 (기록이 없다는 게 핵심)
  const [ghost, setGhost] = useState(false);
  const ghostRef = useRef(false);
  ghostRef.current = ghost;
  const complete = visited.length >= sections.length || ghost;

  // 로그아웃: 화면이 오래된 모니터처럼 한 줄로 접혀 꺼지고, 웹사이트에서는 지워졌던 글자가 다시 쓰인다
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const logout = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (leaving) return;
    try {
      sessionStorage.setItem(RESTORE_KEY, "1");
    } catch {}
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push("/");
    setLeaving(true);
    sfx.glitch();
    setTimeout(() => router.push("/"), 1100);
  };

  // 배경음악: 방공호, 지상, 대자비 구역(처음 시선 구역에 들어선 뒤부터), 결말
  const [jabiStage, setJabiStage] = useState(false);
  // 방공호로 돌아가면 다시 지상 음악부터 (시선 구역은 도시에 다시 올라왔을 때 새로 들어선다)
  const track = leaving || intro ? null : ending ? "ending" : zone === "bunker" ? "bunker" : jabiStage ? "jabi" : "ground";
  useEffect(() => {
    playBgm(track);
  }, [track]);
  useEffect(() => {
    duckBgm(paused);
  }, [paused]);
  useEffect(() => {
    window.addEventListener("pointerdown", wakeBgm);
    window.addEventListener("keydown", wakeBgm);
    return () => {
      window.removeEventListener("pointerdown", wakeBgm);
      window.removeEventListener("keydown", wakeBgm);
      playBgm(null);
    };
  }, []);
  const onStage = useCallback(() => setJabiStage(true), []);

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
    if (viaDoor) sfx.door();
    setTimeout(() => {
      setZone(to);
      setJabiStage(false);
      sanHold.at = null;
      setArrived(viaDoor);
      setTracked(false);
      // 배전실 문을 나서는 순간 도시가 위치를 기억한다. 첫 기억에는 '계속 걸으면 동의' 한 줄이 따라 나온다
      // 방공호에서 방문 기록을 지웠다면 도시는 아무것도 기억하지 않고, 자비도 플레이어를 보지 못한다
      if (to === "city") {
        if (ghostRef.current) gaze.mood = "blind";
        else if (viaDoor) setTimeout(() => saveBackup(CITY.spawn.pos[0], CITY.spawn.pos[2]), 700);
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
            setPanel({ kind: "dialog", name: it.label, lines: ui.terminalLocked, step: 0, locked: true });
            break;
          }
          setPanel({ kind: "section", id: it.section! });
          // 기억으로 깨어난 사람은 터미널을 열어도 기록이 남지 않는다
          if (!ghost) markVisited(it.section!);
          break;
        case "painting":
          setPanel({ kind: "painting", work: it.work! });
          break;
        case "statue":
          // 기억으로 깨어난 이산은 약속을 되풀이하지 않는다 (이미 지키고 돌아온 사람이니까)
          if (it.id === "san" && ghost) setPanel({ kind: "dialog", name: { ko: "이산", en: "San" }, lines: [whisper.awakeLine], step: 0 });
          else if (it.id === "san")
            setPanel({ kind: "dialog", name: { ko: "이산", en: "San" }, lines: getBackup().deaths > 0 ? [...sanCityLines, sanAfterDeath] : sanCityLines, step: 0 });
          else if (ghost) setPanel({ kind: "dialog", name: { ko: "이산", en: "San" }, lines: [whisper.awakeLine], step: 0 });
          else if (complete) {
            setPanel({ kind: "dialog", name: { ko: "이산", en: "San" }, lines: statueLines[statueLines.length - 1], step: 0 });
            setTalked(true);
            try {
              localStorage.setItem(TALK_KEY, "1");
            } catch {}
          }
          else {
            // 기록이 하나도 없는 방문자에게만 동상에게 말을 건넬 수 있는 칸이 열린다
            // 웹사이트 꼬리말에서 기록을 지우고 온 사람만 (처음 온 사람, 거부나 재시작으로 비워진 사람은 아님)
            let forgot = false;
            try {
              forgot = localStorage.getItem(FORGOT_KEY) !== null;
            } catch {}
            const blank = forgot && visited.length === 0 && found.length === 0 && getBackup().n === 0;
            // 기록을 지우고 온 사람에게 이산은 처음 보는 사람처럼 짧게 답하고, 마지막 줄에서 말을 건넬 수 있다
            setPanel({ kind: "dialog", name: plaque[0], lines: blank ? statueForgot : statueLines[Math.min(visited.length, statueLines.length - 2)], step: 0, plaque: true, whisper: blank });
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
          const lines = it.npc === "keeper" && bk.deaths > 0 ? [keeperAfterDeath, ...base] : base;
          setPanel({ kind: "dialog", name: n.name, lines, step: 0, link: n.link });
          break;
        }
        case "door":
          // 이산을 깨우기 전에는 방공호 밖으로 나갈 수 없다
          // 터미널을 다 열었어도, 풀려난 이산과 이야기하기 전에는 함께 나갈 동행이 없다
          if (it.to === "city" && !talked) {
            setPanel({
              kind: "dialog",
              name: it.label,
              locked: true,
              lines: complete ? [ui.exitLocked[0], ui.exitTalk] : ui.exitLocked.map((l) => ({ ko: l.ko.replace("{n}", String(visited.length)), en: l.en.replace("{n}", String(visited.length)) })),
              step: 0,
            });
            break;
          }
          goTo(it.to!);
          break;
        case "checkpoint":
          // 이산을 깨운 뒤에만 선택지가 열린다. 아직이면 무엇을 하면 되는지 그대로 알려 준다
          if (ghost) {
            sfx.ghost();
            startEndingRef.current("ghost");
          } else if (complete || talked) setPanel({ kind: "choice" });
          else
            setPanel({
              kind: "dialog",
              name: it.label,
              locked: true,
              lines: checkpoint.locked.map((l) => ({ ko: l.ko.replace("{n}", String(visited.length)), en: l.en.replace("{n}", String(visited.length)) })),
              step: 0,
            });
          break;
      }
    },
    [complete, talked, goTo, markVisited, visited.length, met, ghost, found.length]
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
      pos: () => [player.pos.x, player.pos.z, player.yaw, player.air, player.pitch],
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
  const [whisperMiss, setWhisperMiss] = useState(false);
  // 이산이 '그 문장'을 남긴 순간: 웹사이트 꼬리말의 delete seoul 간판이 이때부터 켜진다 (따로 알리지 않는다)
  useEffect(() => {
    if (panel?.kind === "dialog" && panel.lines[panel.step] === promiseLine)
      try {
        localStorage.setItem(PROMISE_KEY, "1");
      } catch {}
  }, [panel]);
  const [flash, setFlash] = useState(false);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!ending) return;
    const { kind, step } = ending;
    const end = step === BEAT_MS[kind].length;
    // 마지막 줄 뒤 정적까지 지나면 발견한 결말로 남긴다 (거부와 空은 남기지 않는다)
    if (kind === "accept" && end) {
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
        // 동의는 첫 줄에서 이미 처리된다: 도중에 나가도 다음 입장은 줄 속에서 시작한다
        try {
          localStorage.setItem(END_KEY, "accept");
        } catch {}
        gaze.mood = "calm";
        // 플레이 중 몸을 숨기던 그 줄로: 줄 옆을 따라 걸어가 빈자리에 들어서서 가만히 선다. 이산은 줄 밖에 남는다
        autoWalk.to = { x: 2.3, z: LINE_SPOT.z, speed: 3.6, pitch: 0.2 };
        sceneTimer.current = setTimeout(() => (autoWalk.to = { x: LINE_SPOT.x, z: LINE_SPOT.z, speed: 1.6, pitch: 0.42 }), 6800);
      }
    } else if (kind === "reject") {
      if (step === 0) {
        finalBeam();
        sceneTimer.current = setTimeout(() => setFlash(true), 1500);
      }
      if (step === 3) {
        // 장면이 방공호로: 사람들이 두 번째 정지 시민을 옮겨 와 나란히 앉혔다
        setFlash(false);
        setSecondStatue(true);
        goTo("bunker", false);
      }
      if (end) {
        // 도시가 둘을 다시 정지시켰다: 열람·만남·대화·결말·위치 백업이 처음 상태로 돌아간다 (약속과 발견한 결말은 남는다)
        try {
          [KEY, END_KEY, MET_KEY, TALK_KEY].forEach((k) => localStorage.removeItem(k));
        } catch {}
        wipeBackup();
      }
    } else if (kind === "ghost") {
      if (step === 0) {
        // 이 기기에 둘을 잇는 기록이 없다: 새로 남기지도 않는다
        wipeBackup();
        gaze.mood = "blind";
        try {
          localStorage.removeItem(FORGOT_KEY);
        } catch {}
      }
      // 이산의 말 다음 줄에서 둘이 성문을 지나 다리 위 승강장 계단 앞까지 걷는다. 그 뒤 마지막 한 걸음은 플레이어의 몫
      if (step === 3) autoWalk.to = { x: STAIR_TOP.x, z: STAIR_TOP.z, speed: 4.6, pitch: -0.12, yaw: STAIR_TOP.yaw };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endStep]);

  // 空 결말의 마지막 몸짓: 플레이어가 한 걸음 내디디면 이산이 앞서 내려가 기다리고, 잠깐 정적 뒤에 버튼이 나온다
  const [stepped, setStepped] = useState(false);
  const steppedRef = useRef(false);
  const takeStep = useCallback(() => {
    if (steppedRef.current) return;
    steppedRef.current = true;
    setStepped(true);
    sfx.door();
    autoWalk.to = { x: STAIR_TOP.x + 3.6, z: STAIR_TOP.z, speed: 1.3, pitch: -0.3, yaw: STAIR_TOP.yaw };
    clearTimeout(sceneTimer.current);
    sceneTimer.current = setTimeout(() => setEnding((e) => (e && e.kind === "ghost" ? { ...e, step: GHOST_STEP + 1 } : e)), 5200);
  }, []);
  const awaitingStep = ending?.kind === "ghost" && ending.step === GHOST_STEP && !stepped;
  useEffect(() => {
    if (!awaitingStep) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (["KeyW", "ArrowUp", "Space", "KeyE"].includes(e.code)) {
        e.preventDefault();
        takeStep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [awaitingStep, takeStep]);

  // 지상의 이산이 직접 하는 짧은 말 (자막 한 줄). 대화창을 열지 않고, 조작을 막지 않는다
  const [sanSay, setSanSay] = useState<L | null>(null);
  const sayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const say = useCallback((l: L, ms = 3600) => {
    setSanSay(l);
    clearTimeout(sayTimer.current);
    sayTimer.current = setTimeout(() => setSanSay(null), ms);
  }, []);
  useEffect(() => () => clearTimeout(sayTimer.current), []);
  // 처음 시선 구역: 대자비 소개가 닫힌 뒤 이산이 첫 엄폐물 뒤로 가서 기다린다 (탭마다 한 번 말하고, 재시도 때는 말없이 다시 기다린다)
  const cueRef = useRef({ cover: false, wait: false, back: false });
  const sanWithYou = zone === "city" && complete && talked && !ghost && !accepted && !ending;
  // 소개 장면(카메라가 대자비를 바라보는 동안)과 팝업이 끝난 뒤에야 움직인다
  useEffect(() => {
    if (!sanWithYou || !jabiStage || cueRef.current.cover) return;
    const iv = setInterval(() => {
      if (gaze.intro || panelRef.current || pausedRef.current || cueRef.current.cover) return;
      cueRef.current.cover = true;
      sanHold.at = { ...COVER_SPOT };
      say(sanCue.cover);
    }, 300);
    return () => clearInterval(iv);
  }, [sanWithYou, jabiStage, say]);
  // 이산 곁에 와서 처음 숨었을 때 한 줄
  useEffect(() => {
    if (!sanWithYou) return;
    const iv = setInterval(() => {
      const h = sanHold.at;
      if (!h || cueRef.current.wait || !gaze.hiddenBy) return;
      if (Math.hypot(player.pos.x - h.x, player.pos.z - h.z) > 2.6) return;
      cueRef.current.wait = true;
      say(sanCue.wait);
    }, 300);
    return () => clearInterval(iv);
  }, [sanWithYou, say]);
  // 쓰러졌다가 큰길 입구로 돌아오면: 이산은 다시 그 엄폐물 곁에서 기다린다. "돌아왔네."는 처음 한 번만
  useEffect(() => {
    if (!sanWithYou) return;
    const onBackup = (e: Event) => {
      if ((e as CustomEvent).detail !== "restore") return;
      sanHold.at = { ...COVER_SPOT };
      if (cueRef.current.back) return;
      cueRef.current.back = true;
      say(sanCue.back, 2600);
    };
    window.addEventListener("sanlee-backup", onBackup);
    return () => window.removeEventListener("sanlee-backup", onBackup);
  }, [sanWithYou, say]);

  const onGameWin = useCallback(() => setPanel({ kind: "choice", confirm: 1 }), []);
  const onGameLose = useCallback(() => setPanel({ kind: "choice" }), []);
  const startEnding = (kind: EndKind) => {
    setPanel(null);
    const b = getBackup();
    const slots = Array.from({ length: Math.min(b.n, 12) }, (_, i) => b.n - i);
    setEnding({ kind, step: 0, a: b.deaths, r: b.restores, slots });
  };
  startEndingRef.current = startEnding;
  const choose = (kind: "accept" | "reject") => {
    if (kind === "accept") sfx.accept();
    else sfx.reject();
    startEnding(kind);
  };

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
    sanHold.at = null;
    cueRef.current = { cover: false, wait: false, back: false };
    gaze.mood = "";
    steppedRef.current = false;
    setStepped(false);
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
    setGhost(false);
    setEnding(null);
    goTo("bunker", false);
    lock();
  };
  // 설정창의 '방문 기록 지우기': 수락한 시민에게는 줄 밖으로 돌아가는 유일한 길
  // 설정창의 '방문 기록 지우기'는 농담일 뿐 진행을 지우지 않는다 (실수로 눌러 3/3이 사라지던 문제).
  // 수락 결말 뒤에 줄에서 빠져나오는 용도로만 실제로 초기화한다
  const onReset = () => {
    if (accepted) {
      resetProgress();
      setPaused(false);
      restart();
    }
  };
  // 대자비 소개: 멈춤 → 카메라가 대자비 쪽으로 → 설명 팝업. 닫으면 게임이 이어진다
  const introTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hadJabi = useRef(false);
  // 패널 효과음: 열릴 때, 대화가 한 줄 넘어갈 때, 잠긴 곳에 부딪혔을 때, 대자비 소개
  const prevPanel = useRef<Panel>(null);
  useEffect(() => {
    const a = prevPanel.current;
    prevPanel.current = panel;
    if (!panel) return;
    if (panel.kind === "jabi") return sfx.gong();
    if (panel.kind === "dialog" && panel.locked && a?.kind !== "dialog") return sfx.denied();
    if (!a || a.kind !== panel.kind) return sfx.open();
    if (panel.kind === "dialog" && a.kind === "dialog" && panel.step !== a.step) sfx.blip();
  }, [panel]);
  const startJabiIntro = useCallback(() => {
    gaze.intro = true;
    gaze.frozen = true;
    gaze.lookAt = { x: JABI.eye.x, y: JABI.eye.y, z: JABI.eye.z };
    // 카메라가 대자비를 다 바라보면 잠깐 머문 뒤 팝업. 혹시 신호가 오지 않아도 5초 뒤에는 연다
    const open = () => {
      window.removeEventListener("sanlee-look-done", onDone);
      clearTimeout(introTimer.current);
      introTimer.current = setTimeout(() => setPanel({ kind: "jabi" }), 700);
    };
    const onDone = () => open();
    window.addEventListener("sanlee-look-done", onDone);
    clearTimeout(introTimer.current);
    introTimer.current = setTimeout(open, 5000);
  }, []);
  const endJabiIntro = useCallback(() => {
    try {
      sessionStorage.setItem("sanlee-jabi-intro", "1");
    } catch {}
    gaze.intro = false;
    gaze.frozen = false;
    gaze.lookAt = null;
  }, []);
  // 팝업이 어떤 식으로 닫히든(Esc 포함) 소개 상태를 풀어 준다
  useEffect(() => {
    // 팝업이 떠 있는 동안에도 카메라는 대자비를 계속 바라본다 (늦게 돌던 카메라가 팝업과 함께 멈추거나, 마우스에 밀려나지 않게)
    if (!panel && gaze.intro && hadJabi.current) endJabiIntro();
    hadJabi.current = panel?.kind === "jabi";
  }, [panel, endJabiIntro]);
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
    // 접속 기록: 들어오기만 해도 남는다. 웹사이트 꼬리말의 'delete seoul'은 이 기록이 있는 기기에만 나타난다
    try {
      localStorage.setItem(LOGIN_KEY, String(Date.now()));
    } catch {}
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
    // 골목(띠 A)에서는 화살표를 감춘다: 바닥의 분필 화살표가 광장까지 길을 안내한다
    if (Math.abs(px) > 11.5 && pz < 14) return null;
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
    ending?.kind === "reject" && ending.step >= 3 ? "thaw" : "",
    ending?.kind === "ghost" && ending.step === 1 ? "ghost-freeze" : "",
    flash ? "final-flash" : "",
    tracked && !ending && !ghost ? "is-tracked" : "",
    leaving ? "logging-out" : "",
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
            sanMode={ending?.kind === "accept" ? "stay" : ending?.kind === "ghost" && ending.step >= 2 ? "beside" : undefined}
            hideSan={accepted}
            secondStatue={secondStatue}
            awake={ghost}
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

      {leaving && (
        <div className="logout-crt" aria-live="polite">
          <span className="logout-line" />
          <span className="logout-text">{lang === "ko" ? "세션 종료 · 웹사이트로 돌아갑니다" : "SESSION CLOSED · BACK TO THE WEBSITE"}</span>
        </div>
      )}
      <div className="hud">
        <Link href="/" onClick={logout}>
          {t(ui.home)}
        </Link>
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
        {tracked && !ending && <span className="tracked">{t(ghost ? ui.unresolved : ui.tracked)}</span>}
      </div>

      {toast && <div className="toast">{toast}</div>}
      {!intro && !ending && !accepted && <SaveToast />}
      {notice && !panel && !sanSay && <div className="notice">{t(notice)}</div>}
      {sanSay && !panel && !ending && (
        <div className="notice san-say" role="status">
          <b>{lang === "ko" ? "이산" : "San"}</b> {t(sanSay)}
        </div>
      )}

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
      {zone === "city" && !ending && !accepted && <GazeHUD rootRef={rootRef} onGone={onGone} onIntro={startJabiIntro} onStage={onStage} />}
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
          onLeave={logout}
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
            {panel.whisper && panel.step === panel.lines.length - 1 && (
              <form
                className="whisper"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = (new FormData(e.currentTarget).get("w") as string) || "";
                  const norm = v.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
                  if (!whisper.accept.includes(norm)) {
                    setWhisperMiss(true);
                    return;
                  }
                  // 기억으로 깨어난다: 방금 남은 '만남' 기록마저 지운다
                  try {
                    localStorage.removeItem(MET_KEY);
                  } catch {}
                  sfx.restore();
                  setGhost(true);
                  setTalked(true);
                  setPanel({ kind: "dialog", name: { ko: "이산", en: "San" }, lines: whisper.wake, step: 0 });
                }}
              >
                <input name="w" autoComplete="off" placeholder={t(whisper.prompt)} onChange={() => setWhisperMiss(false)} onKeyDown={(e) => e.stopPropagation()} />
                <button className="btn" type="submit">
                  {t(whisper.say)}
                </button>
                {whisperMiss && <small>{t(whisper.silent)}</small>}
              </form>
            )}
            <div className="panel-actions">
              <button className="btn" onClick={closePanel}>
                {t(ui.close)}
              </button>
              {panel.link && panel.step === panel.lines.length - 1 && (
                <a className="btn primary" href={panel.link.href} target="_blank" rel="noopener noreferrer">
                  {t(panel.link.label)}
                </a>
              )}
              {panel.step < panel.lines.length - 1 && (
                <button className="btn primary" autoFocus onClick={() => setPanel({ ...panel, step: panel.step + 1 })}>
                  {t(ui.next)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {panel?.kind === "jabi" && (
        <div className="choice-wrap jabi-wrap">
          <div className="choice jabi-intro" role="dialog" aria-modal="true">
            <span className="choice-sys">{t(jabiUi.name)}</span>
            <h2>{t(jabiUi.introTitle)}</h2>
            <p>{t(jabiUi.introBody)}</p>
            <div className="jabi-shots">
              {jabiUi.introShots.map((sh) => (
                <figure key={sh.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sh.src} alt={t(sh.cap)} width={480} height={360} />
                  <figcaption>{t(sh.cap)}</figcaption>
                </figure>
              ))}
            </div>
            <ul className="jabi-rules">
              {jabiUi.introRules.map((r, i) => (
                <li key={i}>{t(r)}</li>
              ))}
            </ul>
            <div className="panel-actions">
              <button className="btn primary" autoFocus onClick={closePanel}>
                {t(jabiUi.introOk)}
              </button>
            </div>
          </div>
        </div>
      )}

      {panel?.kind === "choice" && (
        <div className="choice-wrap">
          <div className="choice" role="dialog" aria-modal="true">
            <span className="choice-sys">SYS://SEOUL/CHECKPOINT · GATE-01</span>
            <span className="choice-alert">{lang === "ko" ? "▲ 응답 필요 · 미응답 시 통과 불가" : "▲ RESPONSE REQUIRED · NO PASSAGE UNTIL ANSWERED"}</span>
            {panel.game ? (
              <CookieGame t={t} onWin={onGameWin} onLose={onGameLose} />
            ) : panel.confirm !== undefined ? (
              <>
                <h2>{t(checkpoint.confirm[panel.confirm].title)}</h2>
                <p>{t(checkpoint.confirm[panel.confirm].body)}</p>
                <div className="choice-actions">
                  <button className="choice-accept" onClick={() => choose("accept")}>
                    {t(checkpoint.confirm[panel.confirm].stay)}
                  </button>
                  <button
                    className="choice-reject"
                    onClick={() => {
                      sfx.denied();
                      // 첫 확인 다음에는 쿠키를 하나씩 끄는 미니 게임, 그다음 마지막 확인
                      if (panel.confirm === 0) setPanel({ kind: "choice", game: true });
                      else choose("reject");
                    }}
                  >
                    {t(checkpoint.confirm[panel.confirm].go)}
                  </button>
                </div>
              </>
            ) : (
              <>
            <h2>{t(checkpoint.title)}</h2>
            <p>{t(checkpoint.body)}</p>
            <p className="choice-companion">{t(checkpoint.companion)}</p>
            {!panel.settings ? (
              <>
                <p className="choice-san">
                  <span>{lang === "ko" ? "이산" : "San"}</span>“{t(checkpoint.sanWarn)}”
                </p>
                <div className="choice-actions">
                  <button className="choice-accept" onClick={() => choose("accept")}>
                    {t(ui.accept)}
                    <small>{t(checkpoint.acceptSub)}</small>
                  </button>
                  <button
                    className="choice-reject"
                    onClick={() => {
                      sfx.denied();
                      setPanel({ kind: "choice", confirm: 0 });
                    }}
                  >
                    {t(ui.reject)}
                    <small>{t(checkpoint.rejectSub)}</small>
                  </button>
                </div>
                <p className="choice-notice">{t(checkpoint.rejectNotice)}</p>
                {/* 현실의 쿠키 창처럼 세 번째 선택지는 작고 흐리게. 숨은 결말로 가는 길 */}
                <button className="choice-settings" onClick={() => setPanel({ kind: "choice", settings: true })}>
                  {t(checkpoint.settings)}
                </button>
              </>
            ) : (
              <div className="cookie-prefs">
                <ul>
                  {checkpoint.prefs.map((x, i) => (
                    <li key={i}>
                      <span>{t(x)}</span>
                      <b>{t(checkpoint.prefOn)}</b>
                    </li>
                  ))}
                </ul>
                <p className="cookie-prefs-note">{t(checkpoint.prefsNote)}</p>
                <div className="cookie-prefs-actions">
                  <button className="btn" onClick={() => setPanel({ kind: "choice" })}>
                    {t(checkpoint.prefsBack)}
                  </button>
                  <span className="cookie-clear">{t(checkpoint.clearOutside)}</span>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {ending && (
        <div className={`ending ending-${ending.kind}`}>
          <div className="ending-inner">
            {(checkpoint[ending.kind] as Beat[]).slice(0, ending.step + 1).map((l, i, arr) => {
              // 거부 결말이 방공호로 넘어가면 앞 장면의 글은 거둔다
              if (ending.kind === "reject" && ending.step >= 3 && i < 3) return null;
              // 空 결말은 앞을 가리지 않도록 마지막 두 줄만 아래에. 수락 결말은 최근 세 줄만 (숫자는 감정 장면 전에 지나간다)
              if (ending.kind === "ghost" && i < ending.step - 1) return null;
              if (ending.kind === "accept" && i < ending.step - 2) return null;
              const last = i === (checkpoint[ending.kind] as Beat[]).length - 1;
              const cls = [last ? "final" : "", l.say ? "say" : "", l.plaque ? "plaque-line" : "", i < arr.length - 1 && !last ? "past" : ""].join(" ");
              if (l.slots)
                return (
                  <div key={i} className="slots">
                    {ending.slots.length ? (
                      ending.slots.map((n, k) => (
                        <span key={n} style={{ animationDelay: `${0.25 + k * 0.22}s` }}>
                          {lang === "ko" ? "방문 기록" : "VISIT"} #{n} <b>{t(checkpoint.slotErased)}</b>
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
            {awaitingStep && (
              <button type="button" className="btn ending-step" autoFocus onClick={takeStep}>
                {t(ui.step)}
                {!touch && <kbd>{t(ui.stepKeys)}</kbd>}
              </button>
            )}
            {ending.step >= (checkpoint[ending.kind] as Beat[]).length && (
              <div className="ending-actions">
                <small>{t(ending.kind === "accept" ? checkpoint.endingAccept : ending.kind === "reject" ? checkpoint.endingReject : checkpoint.endingGhost)}</small>
                {ending.kind !== "ghost" && (
                  <small className="ending-found">
                    {ending.kind === "reject" ? t(ui.notRecorded) : t(ui.foundEndings).replace("{n}", String(Math.max(1, found.length)))}
                  </small>
                )}
                <small className="ending-credit">
                  ♪ 空 · <a href={MUSIC_URL} target="_blank" rel="noopener noreferrer">{t(credits.music)}</a>
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
                  <Link className="btn primary" href="/" onClick={logout}>
                    {t(ending.kind === "accept" ? ui.toPortfolio : checkpoint.toPortfolio)}
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
              <Link href="/" className="btn ghost" onClick={logout}>
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
