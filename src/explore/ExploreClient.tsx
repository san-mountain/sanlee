"use client";

import { sfx } from "./sfx";
import { duckBgm, playBgm, wakeBgm } from "./bgm";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RESTORE_KEY } from "@/components/RestoreCrossing";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { sections, works, type L, type SectionId } from "@/data/site";
import { LangToggle, useLang } from "@/components/LangProvider";
import SectionBody from "@/components/SectionBody";
import { MUSIC_URL, credits, announcements, checkpoint, jabiUi, keeperAfterDeath, npcs, plaque, quest, r07Friend, sanAfterCheckpoint, sanAfterDeath, sanCity, sanCue, sanReview, scopeScene, statueForgot, statueLines, testimony, ui, type Beat, type Line } from "./story";
import { ALLEY_MOUTH, CITY, CORDON, CORDON_TARP, COVERS, DECK, DECK_SAFE, JABI, QUEUE_Z, SCOPES, SHELTER, ZONES, type Interactable, type Zone } from "./zones";
import { sanHold } from "./SanNPC";
import { player, teleport } from "./Player";
import { JumpButton, Joystick, requestLock, useLookAndKeys } from "./TouchControls";
import { input, loadSettings } from "./input";
import PauseMenu from "./PauseMenu";
import Minimap from "./Minimap";
import QuestArrow, { type QuestTarget } from "./QuestArrow";
import CookieGame from "./CookieGame";
import GazeHUD from "./GazeHUD";
import { autoWalk, gaze, resetGaze, route, walkArea, walkBlock, type RoutePhase } from "./gaze";
import { drone, laneClear, presetSweep, resetDrones } from "./Drones";
import DroneHUD from "./DroneHUD";
import { coverState, finalBeam, restoreCovers } from "./Jabi";
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
// 남쪽 망원경: 방문자가 직접 들여다본 횟수와, 망원경 장면(이산의 결정)을 끝까지 봤는지
const SCOPE_KEY = "sanlee-scope";
type ScopeData = { uses: number; done: boolean };
function readScope(): ScopeData {
  try {
    const v = JSON.parse(localStorage.getItem(SCOPE_KEY) || "null");
    if (v && typeof v === "object") return { uses: Math.max(0, Math.floor(Number(v.uses) || 0)), done: v.done === true };
  } catch {}
  return { uses: 0, done: false };
}

const SAN: L = { ko: "이산", en: "San" };

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
  | {
      kind: "dialog";
      name: L;
      lines: Line[];
      step: number;
      plaque?: boolean;
      locked?: boolean;
      link?: { href: string; label: L };
      // 망원경 장면의 대화 (닫았다가 다시 열면 그 줄부터 이어진다)
      scene?: "first" | "after";
      // 그 줄에서 고를 수 있는 말 (R-07의 친구 묻기, 정지 시민에게 건네는 증언)
      choices?: { at: number; label: L; go: () => void }[];
    }
  | { kind: "choice"; settings?: boolean; confirm?: number; game?: boolean }
  | { kind: "jabi" }
  | null;

type EndKind = "accept" | "reject" | "ghost";
type Ending = { kind: EndKind; step: number; a: number; r: number; slots: number[] } | null;
// 결말 대본의 각 줄이 머무는 시간(ms). 마지막 줄의 시간은 버튼이 나오기 전의 정적이다.
// 空 결말은 마지막 줄(step 4)에서 멈추고, 플레이어가 한 걸음을 내디뎌야 끝난다
const BEAT_MS: Record<EndKind, number[]> = {
  accept: [3000, 3600, 3000, 3600, 3000],
  reject: [2800, 3400, 3800, 4800, 3200],
  ghost: [3000, 3600, 4200, 6500],
};
const GHOST_STEP = 4;
// 처음 대자비의 시선 앞에서 이산이 기다리는 자리: 큰길 첫 엄폐물(키오스크)의 뒤쪽(남쪽)
// 처음 대자비의 시선 앞에서 이산이 기다리는 자리: 큰길 앞쪽의 방벽(가장 튼튼한 엄폐물) 뒤, 방문자가 설 자리를 비워 두고 오른쪽 끝에 선다
const WALL_I = COVERS.findIndex((c) => c.kind === "wall");
const WALL = COVERS[WALL_I];
const COVER_SPOT = { x: WALL.x + WALL.w / 2 - 0.5, z: WALL.z + WALL.d / 2 + 0.7, cover: WALL_I };
// 空 결말: 다리 위 하층행 승강장 계단 앞. 동쪽(+x)을 바라본다
const STAIR_TOP = { x: 2.4, z: -153, yaw: -Math.PI / 2 };
// 마지막 한 걸음: 계단 앞에서 조작을 돌려받아 걸을 수 있는 좁은 구역 (다리 위 → 승강장 계단참), 그리고 완료로 칠 지점
const STEP_AREA = { x0: 0.6, x1: 8.0, z0: -154.4, z1: -151.6 };
const STEP_DONE_X = STAIR_TOP.x + 2.0;
// 이산이 계단참에서 방문자를 돌아보며 기다리는 자리, 그리고 방문자가 내디딘 뒤 계단 쪽으로 돌아선 자리
const SAN_WAIT: [number, number, number] = [8.2, -153.6, -Math.PI / 2];
const SAN_TURN: [number, number, number] = [8.7, -152.8, Math.PI / 2];
// 수락한 시민이 다시 들어오면 서게 되는 줄 속 자리
// 줄 한가운데, 두 사람 사이. 여기서는 문 너머로 금빛이 된 대자비의 얼굴이 보인다
const LINE_SPOT = { x: 3.6, z: (QUEUE_Z[44] + QUEUE_Z[45]) / 2 };

// 남쪽 전망대 가는 길: 이산이 드론 빛을 피해 기다리는 자리 (골목 입구 안쪽 → 정류장 지붕 밑 → 데크)
const SAN_MOUTH = { x: ALLEY_MOUTH.x + 0.8, z: ALLEY_MOUTH.z - 1.4 };
const SAN_SHELTER = { x: SHELTER.x + 1.1, z: SHELTER.z + 0.3 };
const SAN_DECK = { x: DECK.x + 1.0, z: DECK.z0 + 5.5 };
const ROOF_IN = (x: number, z: number) => Math.abs(x - SHELTER.x) < SHELTER.w / 2 - 0.2 && Math.abs(z - SHELTER.z) < SHELTER.d / 2 - 0.2;
// 망원경 장면: 이산이 접안렌즈 앞에 서고(남쪽을 본다), 방문자는 비켜서서 기다린다
const SCOPE_Z = SCOPES[0].pos[2];
const EYE_SPOT: [number, number, number] = [DECK.x, SCOPE_Z - 0.75, 0];
const SAN_ASIDE: [number, number, number] = [DECK.x + 1.3, SCOPE_Z - 2.0, Math.atan2(-2.4, -0.4)];
// 마지막에 이산은 큰길 쪽 하층행 표지판을 바라본다
const SAN_SIGN: [number, number, number] = [DECK.x + 1.3, SCOPE_Z - 2.0, Math.atan2(-DECK.x - 1.3, CORDON.z - SCOPE_Z + 2.0)];
const VISIT_WAIT = { x: DECK.x - 1.1, z: SCOPE_Z - 2.4 };
// 망원경을 볼 때 방문자의 눈 자리 (남쪽을 본다)와 둘러볼 수 있는 범위
const SCOPE_EYE = { x: DECK.x, z: SCOPE_Z - 0.8, yaw: Math.PI };
const SCOPE_CLAMP = { yaw: Math.PI, dy: 0.8, p0: -0.75, p1: 0.12 };
// 망원경 뒤: 이산이 통제선 끝 천막을 걷고 기다리는 틈
const GAP_SPOT = { x: (CORDON.gap + 11.5) / 2, z: CORDON.z + 1.6 };
const GAP_POS = new THREE.Vector3(GAP_SPOT.x, 1.2, CORDON.z);

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
  // 남쪽 망원경 기록 (이 기기의 실제 값. 검문소가 그대로 읽는다)
  const [scopeData, setScopeData] = useState<ScopeData>({ uses: 0, done: false });
  // R-07과 친구가 되었는지: 이번 방문(이 페이지) 동안만. 어디에도 저장하지 않는다
  const [friend, setFriend] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const labelEls = useRef<Record<string, HTMLDivElement | null>>({});
  // 기록 없이 돌아와 이산의 말을 건넨 사람: 이 상태는 어디에도 저장하지 않는다 (기록이 없다는 게 핵심)
  const [ghost, setGhost] = useState(false);
  // 空 결말에서 방문자가 계단 쪽으로 실제로 걸어 나갔는지
  const [stepped, setStepped] = useState(false);
  const steppedRef = useRef(false);
  // 검문소에서 물러난 적이 있는지 / 물러난 뒤 이산과의 대화를 끝까지 들었는지 / 검문소 전에 시 한 줄을 들었는지 (이번 방문 동안만)
  const cpRef = useRef({ seen: false, talked: false });
  const ghostRef = useRef(false);
  ghostRef.current = ghost;
  const endingRef = useRef<Ending>(null);
  endingRef.current = ending;
  const complete = visited.length >= sections.length || ghost;
  // 진행 단계는 이 값 하나로 정한다. 목표 문구·화살표·미니맵·통제선·검문소·재시작 자리가 모두 이 값을 따른다
  const phase: RoutePhase = ghost ? "descent" : !complete ? "restore" : !talked ? "talk" : !scopeData.done ? "scope" : "descent";
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => {
    route.phase = phase;
    // 망원경을 보기 전에는 통제선 끝의 천막 짐더미가 틈을 막고 있다
    walkBlock.boxes = phase === "descent" ? [] : [CORDON_TARP];
  }, [phase]);

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
  // 결말 곡(空)은 마지막 결과(버튼)가 나올 때부터. 그 전까지는 지상에서는 듣던 곡을 잇고, 방공호로 넘어간 거부 결말은 조용히
  const endShown = !!ending && ending.step >= (checkpoint[ending.kind] as Beat[]).length;
  const track = leaving || intro ? null : endShown ? "ending" : ending ? (zone === "city" ? (jabiStage ? "jabi" : "ground") : null) : zone === "bunker" ? "bunker" : jabiStage ? "jabi" : "ground";
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

  // 장면 연출용 전역 상태는 페이지를 떠날 때(로그아웃 등) 비운다. 다시 들어왔을 때 남아 있지 않도록
  useEffect(
    () => () => {
      autoWalk.to = null;
      walkArea.box = null;
      sanHold.at = null;
      gaze.gateOpen = false;
      gaze.mood = "";
      gaze.still = false;
      gaze.zoom = 1;
      gaze.clamp = null;
      gaze.lookAt = null;
      walkBlock.boxes = [];
      route.phase = "restore";
      resetDrones();
    },
    []
  );

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
      // 예전의 '시 한 줄' 약속(값 "1")은 더 이상 쓰지 않는다. 지우고, 새 부탁(망원경 이야기)을 들으면 다시 켜진다
      if (localStorage.getItem(PROMISE_KEY) === "1") localStorage.removeItem(PROMISE_KEY);
      const f = JSON.parse(localStorage.getItem(FOUND_KEY) || "[]");
      if (Array.isArray(f)) setFound(f);
    } catch {}
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(v)) setVisited(v.filter((x) => sections.some((s) => s.id === x)));
    } catch {}
    setScopeData(readScope());
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
      // 광장의 동행 단계는 지상에 다시 올라올 때 처음(골목)부터. 끝나지 않은 망원경 장면도 처음으로 (기록에는 남지 않았다)
      plazaRef.current.stage = 0;
      if (scopeRef.current.stage !== "done") resetScopeScene();
      resetDrones();
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

  // 검문소에서 물러난 뒤의 이산 대화. 마지막 줄은 '다시 만나면 망원경 이야기를 해 달라'는 부탁 (꼬리말 조건)
  const afterCheckpointPanel = (): Panel => ({
    kind: "dialog",
    name: SAN,
    lines: [...sanAfterCheckpoint.lines, sanAfterCheckpoint.memory],
    step: 0,
  });

  // 망원경 장면 상태: idle → approach(이산이 접안렌즈로) → looking(이산의 첫 말) → view(방문자가 들여다봄) → after(대화) → done
  // 이 기기에 남는 것은 끝까지 본 뒤의 done과 방문자가 실제로 들여다본 횟수뿐이다
  type ScopeStage = "idle" | "approach" | "looking" | "view" | "after" | "done";
  const scopeRef = useRef<{ stage: ScopeStage; step: number; at: number }>({ stage: "idle", step: 0, at: 0 });
  const [scopeStage, setScopeStageState] = useState<ScopeStage>("idle");
  const setScopeStage = (st: ScopeStage) => {
    scopeRef.current.stage = st;
    setScopeStageState(st);
  };
  const [scopeView, setScopeView] = useState(false);
  const scopeViewRef = useRef(false);
  scopeViewRef.current = scopeView;
  const resetScopeScene = () => {
    scopeRef.current = { stage: "idle", step: 0, at: 0 };
    setScopeStageState("idle");
    setScopeView(false);
    gaze.still = false;
    gaze.zoom = 1;
    gaze.clamp = null;
    autoWalk.to = null;
  };
  // 광장의 동행 단계: 0 골목 입구, 1 정류장 지붕 밑, 2 데크 (이산이 드론 길을 건너 기다리는 자리)
  const plazaRef = useRef({ stage: 0 });
  const scopePanel = (scene: "first" | "after"): Panel => ({
    kind: "dialog",
    name: SAN,
    lines: scene === "first" ? scopeScene.first : scopeScene.after,
    step: scopeRef.current.step,
    scene,
  });
  const writeScope = (next: ScopeData) => {
    setScopeData(next);
    try {
      localStorage.setItem(SCOPE_KEY, JSON.stringify(next));
    } catch {}
  };
  // 방문자가 남쪽 망원경을 들여다본다: 시야가 좁아지고, 정해진 범위 안에서 둘러볼 수 있다. 걷기는 멈춘다
  const startScopeView = () => {
    teleport.req = { ...SCOPE_EYE };
    gaze.zoom = 0.42;
    gaze.clamp = { ...SCOPE_CLAMP };
    gaze.still = true;
    setScopeView(true);
    // 들여다본 횟수만 센다 (기억으로 깨어난 사람은 기록을 남기지 않는다). 장면 진행은 따로 한 번뿐이다
    if (!ghostRef.current) writeScope({ ...readScope(), uses: readScope().uses + 1 });
    lock();
  };
  const exitScopeView = () => {
    if (!scopeViewRef.current) return;
    setScopeView(false);
    gaze.zoom = 1;
    gaze.clamp = null;
    gaze.still = false;
    teleport.req = { x: VISIT_WAIT.x, z: VISIT_WAIT.z, yaw: Math.atan2(-(SAN_ASIDE[0] - VISIT_WAIT.x), -(SAN_ASIDE[1] - VISIT_WAIT.z)) };
    if (scopeRef.current.stage === "view") {
      // 그새 구름이 그 자리를 덮었다. 이산이 묻는다
      scopeRef.current.step = 0;
      setScopeStage("after");
      setPanel(scopePanel("after"));
    } else if (phaseRef.current === "descent" && !ghostRef.current) say(scopeScene.again, 2600);
  };
  const exitScopeRef = useRef(exitScopeView);
  exitScopeRef.current = exitScopeView;

  // 정지 시민에게 들은 이야기를 건넨다: 본 것이 아니라 들은 것. 이산은 기억하지 못한다. 방문자가 곁에 머물면 일어난다
  const testimonyPanel = (): Panel => ({
    kind: "dialog",
    name: SAN,
    lines: testimony.lines,
    step: 0,
    choices: [
      {
        at: testimony.lines.length - 1,
        label: testimony.stay,
        go: () => {
          // 기억으로 깨어난다: 방금 남은 '만남' 기록마저 지운다. 이 상태는 어디에도 저장하지 않는다
          try {
            localStorage.removeItem(MET_KEY);
          } catch {}
          sfx.restore();
          setGhost(true);
          setTalked(true);
          setPanel({ kind: "dialog", name: SAN, lines: [testimony.rise], step: 0 });
        },
      },
    ],
  });
  // R-07: 소개 뒤 친구를 묻는다. 친구는 이번 방문 동안만 기억하고, 아무것도 열거나 바꾸지 않는다.
  // 기록을 지우고 돌아온 방문자는 먼저 '똑똑.'을 건넬 수 있다
  const r07Panel = (): Panel => {
    const n = npcs.r07;
    if (friend) return { kind: "dialog", name: n.name, lines: [r07Friend.again], step: 0 };
    let forgot = false;
    try {
      forgot = localStorage.getItem(FORGOT_KEY) !== null;
    } catch {}
    const befriend = (lines: Line[]) => {
      setFriend(true);
      setPanel({ kind: "dialog", name: n.name, lines, step: 0 });
    };
    const choices: { at: number; label: L; go: () => void }[] = [
      { at: n.lines.length - 1, label: r07Friend.yes, go: () => befriend([r07Friend.knock]) },
      { at: n.lines.length - 1, label: r07Friend.no, go: () => closePanelRef.current() },
    ];
    if (forgot) choices.unshift({ at: 0, label: r07Friend.you, go: () => befriend([{ ...r07Friend.you, who: "you" }, r07Friend.answer]) });
    return { kind: "dialog", name: n.name, lines: n.lines, step: 0, choices };
  };

  const interact = useCallback(
    (it: Interactable) => {
      // 결말 중(空 결말의 마지막 걸음 포함)에는 아무것도 열지 않는다
      if (endingRef.current) return;
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
          // 기억으로 깨어난 이산은 짧게만 말한다
          if (it.id === "san" && ghost) setPanel({ kind: "dialog", name: SAN, lines: [testimony.awakeLine], step: 0 });
          // 망원경 장면 도중에 닫았다면 그 줄부터 다시
          else if (it.id === "san" && scopeRef.current.stage === "looking") setPanel(scopePanel("first"));
          else if (it.id === "san" && scopeRef.current.stage === "after") setPanel(scopePanel("after"));
          else if (it.id === "san" && (scopeRef.current.stage === "approach" || scopeRef.current.stage === "view")) break;
          // 검문소 뒤: 대화를 다 들었으면 짧게 되짚기만, 물러났지만 끝까지 못 들었으면 그 대화를 다시
          else if (it.id === "san" && cpRef.current.talked) setPanel({ kind: "dialog", name: SAN, lines: sanReview, step: 0 });
          else if (it.id === "san" && cpRef.current.seen) setPanel(afterCheckpointPanel());
          else if (it.id === "san") {
            const base = phase === "scope" ? sanCity.scope : sanCity.descent;
            setPanel({ kind: "dialog", name: SAN, lines: getBackup().deaths > 0 ? [...base, sanAfterDeath] : base, step: 0 });
          } else if (ghost) setPanel({ kind: "dialog", name: SAN, lines: [testimony.awakeLine], step: 0 });
          else if (complete) {
            setPanel({ kind: "dialog", name: SAN, lines: statueLines[statueLines.length - 1], step: 0 });
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
            // 기록을 지우고 온 사람에게 이산은 처음 보는 사람처럼 짧게 답한다. 마지막 줄에서 방문자는 들은 이야기를 건넬 수 있다
            // (기기는 그 이야기를 모른다. 기억하는 사람만 고른다. 고른다고 해서 무엇이 보장되지는 않는다)
            setPanel({
              kind: "dialog",
              name: plaque[0],
              lines: blank ? statueForgot : statueLines[Math.min(visited.length, statueLines.length - 2)],
              step: 0,
              plaque: true,
              choices: blank ? [{ at: statueForgot.length - 1, label: testimony.say, go: () => setPanel(testimonyPanel()) }] : undefined,
            });
            setMet(true);
            try {
              localStorage.setItem(MET_KEY, "1");
            } catch {}
          }
          break;
        case "npc": {
          if (it.npc === "r07") {
            setPanel(r07Panel());
            break;
          }
          // 남쪽 망원경: 망원경 단계에서는 이산과의 장면, 그 뒤로는 방문자가 직접 들여다본다 (기억으로 깨어난 사람은 글로만)
          if (it.id === "scope-0" && !ghost && !accepted) {
            const sc = scopeRef.current.stage;
            if (sc === "looking") setPanel(scopePanel("first"));
            else if (sc === "after") setPanel(scopePanel("after"));
            else if (sc === "approach" || sc === "view") break;
            else if (phase === "descent") startScopeView();
            // 망원경 단계인데 이산이 아직 데크에 오지 않았다: 같이 보기로 했으니 기다린다
            else say(sanCue.waitMe, 2600);
            break;
          }
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
          // 망원경 장면 뒤에만 선택지가 열린다. 아직이면 무엇을 하면 되는지 그대로 알려 준다
          if (ghost) {
            sfx.ghost();
            startEndingRef.current("ghost");
          } else if (phase === "descent") setPanel({ kind: "choice" });
          else if (complete) setPanel({ kind: "dialog", name: it.label, locked: true, lines: checkpoint.lockedScope, step: 0 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [complete, talked, goTo, markVisited, visited.length, met, ghost, found.length, phase, accepted, friend]
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

  // 空 결말의 마지막 걸음 동안만 결말 중에도 평소 조작(이동·시점·조이스틱)을 돌려준다
  const walkable = ending?.kind === "ghost" && ending.step === GHOST_STEP && !stepped;
  const active = !intro && !panel && !fade && (!ending || walkable) && !paused;
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
      // 망원경을 보던 중의 Esc는 설정창이 아니라 눈 떼기
      if (scopeViewRef.current) exitScopeRef.current();
      else if (activeRef.current && !touchRef.current) setPaused(true);
    }
  }, []);
  useLookAndKeys(
    rootRef,
    () => {
      if (scopeViewRef.current) exitScopeRef.current();
      else if (nearRef.current) interact(nearRef.current);
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
  const closePanelRef = useRef(closePanel);
  closePanelRef.current = closePanel;
  // 검문소에서 결정하지 않고 물러난다 (어느 단계에서든: 선택·확인·쿠키 끄기·설정). 수락도 거부도 아니고 결말도 열리지 않는다.
  // 읽는 동안 쌓인 시선은 비워 준다. 처음 물러나면 이산이 말을 건다
  const withdraw = useCallback(() => {
    resetGaze();
    cpRef.current.seen = true;
    if (!cpRef.current.talked && !ghostRef.current) setPanel(afterCheckpointPanel());
    else closePanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePanel]);
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
        if (scopeViewRef.current) exitScopeRef.current();
        else if (panelRef.current?.kind === "choice") withdraw();
        else if (panelRef.current) setPanel(null);
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
  }, [resume, closePanel, withdraw]);

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
  // 검문소 뒤 이산의 부탁("오늘 망원경에서 있었던 얘길 해 줘")이 화면에 뜬 순간부터 웹사이트 꼬리말의 delete seoul이 켜진다 (따로 알리지 않는다).
  // 값 "2" = 망원경 이야기 부탁. 예전 값 "1"(시 한 줄)은 읽을 때 지운다
  useEffect(() => {
    if (panel?.kind !== "dialog") return;
    const line = panel.lines[panel.step];
    if (line === sanAfterCheckpoint.memory) {
      cpRef.current.talked = true;
      try {
        localStorage.setItem(PROMISE_KEY, "2");
      } catch {}
    }
  }, [panel]);
  // 망원경 장면의 대화: 지금 줄을 기억해 두고(닫아도 그 줄부터), 끝까지 읽고 닫으면 다음 단계로.
  // 이산의 결정("나도 나만의 경험을 하고 싶어…")이 담긴 대화의 마지막 줄이 뜨는 순간 진행이 한 번 바뀐다
  const scenePrev = useRef<Panel>(null);
  useEffect(() => {
    const prev = scenePrev.current;
    scenePrev.current = panel;
    if (panel?.kind === "dialog" && panel.scene) {
      scopeRef.current.step = panel.step;
      if (panel.scene === "after" && panel.step === panel.lines.length - 1 && scopeRef.current.stage === "after") {
        setScopeStage("done");
        plazaRef.current.stage = 2;
        if (!ghostRef.current) writeScope({ ...readScope(), done: true });
      }
      return;
    }
    if (prev?.kind === "dialog" && prev.scene) {
      gaze.still = false;
      // 이산이 비켜선 줄까지 읽고 닫았으면 방문자가 들여다본다
      if (prev.scene === "first" && prev.step >= prev.lines.length - 1 && scopeRef.current.stage === "looking") {
        scopeRef.current.step = 0;
        setScopeStage("view");
        startScopeView();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          [KEY, END_KEY, MET_KEY, TALK_KEY, SCOPE_KEY].forEach((k) => localStorage.removeItem(k));
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
      // 정지할 대상을 찾지 못하자 성문의 레이저가 꺼진다
      if (step === 1) {
        gaze.gateOpen = true;
        sfx.door();
      }
      // 둘이 성문을 지나 다리 옆 승강장 계단 앞까지 걷는다
      if (step === 3) autoWalk.to = { x: STAIR_TOP.x, z: STAIR_TOP.z, speed: 4.6, pitch: -0.12, yaw: STAIR_TOP.yaw };
      // 계단 앞: 자동 걷기를 끝내고 좁은 구역 안에서 조작을 돌려준다. 마지막 한 걸음은 플레이어의 몫
      if (step === GHOST_STEP) {
        autoWalk.to = null;
        if (Math.hypot(player.pos.x - STAIR_TOP.x, player.pos.z - STAIR_TOP.z) > 1.2) teleport.req = { ...STAIR_TOP };
        walkArea.box = { ...STEP_AREA };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endStep]);

  // 空 결말의 마지막 걸음: 평소 조작으로 계단 쪽(+x)으로 실제로 2m 나아가면 끝난다. 시점 회전·옆걸음으로는 끝나지 않는다.
  // 내디디면 조작을 다시 거두고, 이산이 계단 쪽으로 돌아서고, 잠깐의 정적 뒤에 버튼이 나온다
  useEffect(() => {
    if (!walkable) return;
    const iv = setInterval(() => {
      if (steppedRef.current || player.pos.x < STEP_DONE_X) return;
      steppedRef.current = true;
      setStepped(true);
      clearTimeout(sceneTimer.current);
      sceneTimer.current = setTimeout(() => setEnding((e) => (e && e.kind === "ghost" ? { ...e, step: GHOST_STEP + 1 } : e)), 5200);
    }, 100);
    return () => clearInterval(iv);
  }, [walkable]);

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
  const cueRef = useRef({ cover: false, wait: false, back: false, plaza: false, shelter: false, gap: false, cordonAt: 0 });
  const sanWithYou = zone === "city" && complete && talked && !ghost && !accepted && !ending;
  const sanWithYouRef = useRef(sanWithYou);
  sanWithYouRef.current = sanWithYou;
  // 소개 장면(카메라가 대자비를 바라보는 동안)과 팝업이 끝난 뒤에야 움직인다
  useEffect(() => {
    if (!sanWithYou || !jabiStage || cueRef.current.cover) return;
    const iv = setInterval(() => {
      if (gaze.intro || panelRef.current || pausedRef.current || cueRef.current.cover) return;
      cueRef.current.cover = true;
      // 방벽이 이미 부서졌다면 이끌지 않는다 (부서진 엄폐물 앞에서 기다리지 않도록)
      if (coverState[COVER_SPOT.cover]?.alive) {
        sanHold.at = { ...COVER_SPOT };
        say(sanCue.cover);
      }
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
      // 복원 직전에 엄폐물도 되살아난다 (GazeHUD: restoreCovers → recordRestore)
      sanHold.at = { ...COVER_SPOT };
      if (cueRef.current.back) return;
      cueRef.current.back = true;
      say(sanCue.back, 2600);
    };
    window.addEventListener("sanlee-backup", onBackup);
    return () => window.removeEventListener("sanlee-backup", onBackup);
  }, [sanWithYou, say]);

  // ---------- 남쪽 전망대 가는 길 ----------
  // 이산은 드론 빛이 닿지 않는 자리(골목 입구 안쪽 → 정류장 지붕 밑 → 데크)에서 기다리고,
  // 앞으로 몇 초 동안 그 줄의 빛이 오지 않을 때만 건넌다. 이산은 들키지 않는다 (호위 실패 없음)
  const holdSan = (p: { x: number; z: number }, speed = 3.4, snap = false) => {
    const h = sanHold.at;
    if (h && h.manual && Math.abs(h.x - p.x) < 0.01 && Math.abs(h.z - p.z) < 0.01 && !snap) return;
    sanHold.at = { x: p.x, z: p.z, cover: -1, manual: true, speed, snap };
  };
  useEffect(() => {
    if (!sanWithYou) return;
    const iv = setInterval(() => {
      if (pausedRef.current || panelRef.current || drone.caught) return;
      const sc = scopeRef.current.stage;
      // 망원경 장면 동안은 장면이 이산을 움직인다
      if (sc !== "idle" && sc !== "done") return;
      const P = plazaRef.current;
      const px = player.pos.x;
      const pz = player.pos.z;
      const ph = phaseRef.current;
      const inPlaza = pz > CORDON.z + 0.6 && !(Math.abs(px) > 11.5 && pz < 14);
      if (ph === "scope") {
        // 골목에서는 평소처럼 따라온다
        if (!inPlaza && P.stage === 0) {
          if (sanHold.at?.manual) sanHold.at = null;
          return;
        }
        if (P.stage === 0) {
          holdSan(SAN_MOUTH);
          if (pz > SHELTER.z - SHELTER.d / 2 - 0.4 && laneClear(0, SAN_MOUTH.x, 2.4)) {
            P.stage = 1;
            holdSan(SAN_SHELTER, 5.2);
          }
        } else if (P.stage === 1) {
          holdSan(SAN_SHELTER, 5.2);
          if (pz > DECK.z0 + 1.5 && laneClear(1, SAN_SHELTER.x, 2.2)) {
            P.stage = 2;
            holdSan(SAN_DECK, 5.2);
          }
        } else holdSan(SAN_DECK, 5.2);
      } else if (ph === "descent" && !ghostRef.current) {
        // 망원경 뒤: 데크 → 정류장 → 광장 북쪽. 그다음은 평소처럼 따라오다 통제선 틈으로 이끈다
        if (P.stage === 2) {
          holdSan(SAN_DECK, 5.2);
          if (pz < SHELTER.z + SHELTER.d / 2 + 0.5 && laneClear(1, SAN_DECK.x, 2.2)) {
            P.stage = 1;
            holdSan(SAN_SHELTER, 5.2);
          }
        } else if (P.stage === 1) {
          holdSan(SAN_SHELTER, 5.2);
          if ((pz < 19 || Math.abs(px - SHELTER.x) > 12) && laneClear(0, SAN_SHELTER.x, 2.4)) {
            P.stage = 0;
            sanHold.at = null;
          }
        }
      }
    }, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanWithYou]);

  // 광장의 짧은 말과 장면 신호: 골목 입구(처음 한 번, 망원경과 드론 한 번 훑기를 보여 준다) / 정류장 지붕 밑 / 큰길 통제선 / 망원경 장면 시작
  const frameTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (zone !== "city" || ending || accepted) return;
    const iv = setInterval(() => {
      if (pausedRef.current || panelRef.current || drone.caught || gaze.intro) return;
      const px = player.pos.x;
      const pz = player.pos.z;
      const ph = phaseRef.current;
      const c = cueRef.current;
      const withSan = sanWithYouRef.current;
      // 골목 입구에서 처음: 정면의 망원경을 잠깐 바라보게 하고, 앞줄 드론이 그 사이를 한 번 훑는다
      if (ph === "scope" && withSan && !c.plaza && Math.abs(px - ALLEY_MOUTH.x) < 1.8 && pz > ALLEY_MOUTH.z - 2.2 && pz < CORDON.z + 1.5) {
        c.plaza = true;
        presetSweep(0, 1.4);
        gaze.still = true;
        gaze.lookAt = { x: DECK.x, y: 1.2, z: SCOPE_Z };
        say(sanCue.plaza, 4200);
        clearTimeout(frameTimer.current);
        frameTimer.current = setTimeout(() => {
          gaze.lookAt = null;
          gaze.still = false;
        }, 3200);
      }
      if (ph === "scope" && withSan && !c.shelter && ROOF_IN(px, pz)) {
        c.shelter = true;
        say(sanCue.shelter, 3000);
      }
      // 망원경 전에 큰길 통제선에 다가가면: 막힌 이유(표지)와 이산의 말. 대자비 소개나 전투는 없다
      if (ph !== "descent" && Math.abs(px) < 12 && pz > CORDON.z - 0.5 && pz < CORDON.z + 3.2 && performance.now() - c.cordonAt > 9000) {
        c.cordonAt = performance.now();
        say(sanCue.cordon, 3400);
      }
      // 망원경 뒤: 통제선 앞에서 이산이 천막을 걷은 틈으로 이끈다 (처음 한 번)
      if (ph === "descent" && withSan && !c.gap && plazaRef.current.stage === 0 && Math.abs(px) < 18 && pz > CORDON.z && pz < 24) {
        c.gap = true;
        sanHold.at = { x: GAP_SPOT.x, z: GAP_SPOT.z, cover: -1 };
        say(sanCue.gap, 3600);
      }
      // 망원경 장면 시작: 방문자가 데크 끝에 왔고, 이산도 드론 길을 건너 데크에 와 있을 때
      const sc = scopeRef.current;
      if (ph === "scope" && withSan && sc.stage === "idle" && pz > DECK.z0 + 6 && plazaRef.current.stage === 2) {
        const san = CITY.items.find((i) => i.id === "san")!;
        if (san.pos.z > DECK.z0 + 3) {
          sanHold.at = null;
          sc.at = 0;
          setScopeStage("approach");
          gaze.still = true;
          autoWalk.to = { x: VISIT_WAIT.x, z: VISIT_WAIT.z, speed: 2.2, yaw: Math.atan2(-(EYE_SPOT[0] - VISIT_WAIT.x), -(EYE_SPOT[1] - VISIT_WAIT.z)) };
        }
      }
      // 이산이 접안렌즈 앞에 섰다: 방문자에게는 그의 등만 보인다. 잠깐의 정적 뒤 첫 말
      if (sc.stage === "approach") {
        const san = CITY.items.find((i) => i.id === "san")!;
        if (!sc.at && Math.hypot(san.pos.x - EYE_SPOT[0], san.pos.z - EYE_SPOT[1]) < 0.2) sc.at = performance.now();
        if (sc.at && performance.now() - sc.at > 2600) {
          autoWalk.to = null;
          sc.step = 0;
          setScopeStage("looking");
          setPanel(scopePanel("first"));
        }
      }
    }, 150);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, ending, accepted, say]);
  useEffect(() => () => clearTimeout(frameTimer.current), []);

  // 광장에서 드론에 식별되면: 그 구간의 처음 자리로. 망원경 전에는 골목 입구에서 접근을 다시 시작하고,
  // 망원경 뒤(돌아가는 길)에는 지나온 안전한 자리(정류장 지붕 밑 또는 데크 끝)에서 다시 간다. 이산도 그 곁에서 기다린다
  const onDroneCaught = useCallback(() => {
    const post = phaseRef.current === "descent";
    const roof = post && player.pos.z < SHELTER.z;
    const spot = !post ? ALLEY_MOUTH : roof ? { x: SHELTER.x - 0.9, z: SHELTER.z, yaw: 0 } : DECK_SAFE;
    teleport.req = { x: spot.x, z: spot.z, yaw: spot.yaw };
    plazaRef.current.stage = !post ? 0 : roof ? 1 : 2;
    // 이산이 접안렌즈로 걸어가는 중에 데크 입구로 되돌아가다 식별되면, 장면은 처음부터 다시 (아직 아무 말도 하지 않았다)
    if (scopeRef.current.stage === "approach") resetScopeScene();
    // 망원경 장면 도중이면 이산은 장면 자리에 그대로 있다
    const sceneFree = scopeRef.current.stage === "idle" || scopeRef.current.stage === "done";
    if (sanWithYouRef.current && sceneFree) holdSan(!post ? SAN_MOUTH : roof ? SAN_SHELTER : SAN_DECK, 5.2, true);
    resetDrones();
    gaze.still = false;
    sfx.restore();
    if (sanWithYouRef.current && !cueRef.current.back) {
      cueRef.current.back = true;
      say(sanCue.back, 2600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [say]);
  // 설정창을 열면 망원경에서 눈을 뗀다 (장면은 다음 대화로 이어진다)
  useEffect(() => {
    if (paused && scopeViewRef.current) exitScopeRef.current();
  }, [paused]);

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
      localStorage.removeItem(SCOPE_KEY);
    } catch {}
    setVisited([]);
    setMet(false);
    setTalked(false);
    setScopeData({ uses: 0, done: false });
  };
  const clearScene = () => {
    clearTimeout(sceneTimer.current);
    autoWalk.to = null;
    sanHold.at = null;
    walkArea.box = null;
    gaze.gateOpen = false;
    cueRef.current = { cover: false, wait: false, back: false, plaza: false, shelter: false, gap: false, cordonAt: 0 };
    cpRef.current = { seen: false, talked: false };
    plazaRef.current.stage = 0;
    resetScopeScene();
    resetDrones();
    clearTimeout(frameTimer.current);
    gaze.lookAt = null;
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
    // 소개 팝업을 닫는 순간부터 대자비 곡
    setJabiStage(true);
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
      [KEY, MET_KEY, TALK_KEY, SCOPE_KEY].forEach((k) => localStorage.removeItem(k));
    } catch {}
    wipeBackup();
    setVisited([]);
    setMet(false);
    setTalked(false);
    setScopeData({ uses: 0, done: false });
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
    if (phase === "restore" || phase === "talk") {
      const h = find("hatch");
      return h ? { pos: h.pos, label: t(quest.back) } : null;
    }
    // 골목(띠 A)에서는 화살표를 감춘다: 바닥의 분필 화살표가 광장(골목 입구, 정면에 남쪽 전망대)까지 길을 안내한다
    if (Math.abs(px) > 11.5 && pz < 14) return null;
    if (phase === "scope") {
      if (scopeView || scopeRef.current.stage === "approach") return null;
      const sc = find("scope-0");
      return sc ? { pos: sc.pos, label: t(quest.scope) } : null;
    }
    // 망원경 뒤: 광장에서는 먼저 통제선 끝의 틈을, 큰길에 들어서면 검문소를
    if (scopeView || (scopeRef.current.stage !== "idle" && scopeRef.current.stage !== "done")) return null;
    if (pz > CORDON.z) return { pos: GAP_POS, label: t(quest.checkpoint) };
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
  // 망원경 장면에서 이산이 설 자리: 접안렌즈 앞 → 비켜선 자리(대화 중 한 번 더 들여다봤다가) → 마지막 줄에서 하층행 표지판 쪽을 본다
  const scenePanelOpen = panel?.kind === "dialog" && panel.scene ? panel : null;
  const sceneSanAt: [number, number, number] | undefined =
    scenePanelOpen?.scene === "after"
      ? scenePanelOpen.step === 3
        ? EYE_SPOT
        : scenePanelOpen.step >= scenePanelOpen.lines.length - 1
          ? SAN_SIGN
          : SAN_ASIDE
      : scopeStage === "approach" || scopeStage === "looking"
        ? EYE_SPOT
        : scopeStage === "view" || scopeStage === "after"
          ? SAN_ASIDE
          : undefined;
  // 검문소가 가진 기록: 실제로 연 순서와 횟수, 망원경 이용 횟수 (있는 값만)
  const evidence: string[] = [];
  if (panel?.kind === "choice") {
    const order = visited.map((id) => sections.find((x) => x.id === id)?.label.toUpperCase() ?? id).join(" → ");
    evidence.push(t(checkpoint.evOrder).replace("{order}", order).replace("{n}", String(visited.length)));
    if (scopeData.uses > 0) evidence.push(t(checkpoint.evScope).replace("{n}", String(scopeData.uses)));
    else if (scopeData.done) evidence.push(t(checkpoint.evScopeDone));
  }
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
            sanMode={ending?.kind === "accept" ? "stay" : ending?.kind === "ghost" && ending.step >= 2 && ending.step < GHOST_STEP ? "beside" : undefined}
            sanAt={ending?.kind === "ghost" && ending.step >= GHOST_STEP ? (stepped ? SAN_TURN : SAN_WAIT) : sceneSanAt}
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

      {active && !ending && !scopeView && near && verb && !touch && (
        <button type="button" className="prompt" onClick={() => interact(near)} style={{ borderColor: near.color, color: near.color }}>
          {!touch && <kbd>{locked ? "E / Click" : "E"}</kbd>}
          <span>
            {t(near.id === "statue" && complete ? { ko: "이산", en: "San" } : near.label)} · {t(verb)}
          </span>
        </button>
      )}

      {active && walkable && <div className="hint">{t(ui.stepHint)}</div>}
      {active && !walkable && !near && !scopeView && <div className="hint">{t(touch ? ui.hintTouch : locked ? ui.hintLocked : ui.hintPc)}</div>}
      {active && locked && !scopeView && <div className="crosshair" aria-hidden />}
      {active && !scopeView && <QuestArrow get={getQuest} />}
      {!intro && !ending && <Minimap zone={zone} get={getQuest} />}
      {zone === "city" && !ending && !accepted && <GazeHUD rootRef={rootRef} onGone={onGone} onIntro={startJabiIntro} onStage={onStage} />}
      {zone === "city" && !ending && !accepted && <DroneHUD onCaught={onDroneCaught} />}
      {/* 남쪽 망원경: 둥근 시야와 그 앞을 흐르는 구름. 방문자에게 보이는 것은 구름뿐이다 (빛은 어디에도 그리지 않는다) */}
      {scopeView && (
        <div className="scope-view">
          <div className="scope-cloud" aria-hidden />
          <div className="scope-mask" aria-hidden />
          <p className="scope-sees" role="status">
            {t(ui.scopeSees)}
          </p>
          <div className="scope-actions">
            <button type="button" className="btn" onClick={exitScopeView}>
              {t(ui.scopeExit)}
            </button>
            <small>{t(touch ? ui.scopeHintTouch : ui.scopeHintPc)}</small>
          </div>
        </div>
      )}
      {active && touch && !scopeView && <Joystick />}
      {active && touch && !scopeView && (
        <JumpButton
          action={
            near && verb && !ending
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
              {lang === "ko" ? "이산, " : "San Lee, "}
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
            ) : null}
            {(() => {
              const line = panel.lines[Math.min(panel.step, panel.lines.length - 1)];
              // 줄마다 말하는 사람: 방문자(나) / 지문(괄호 속 행동, 따옴표 없음) / 그 밖에는 대화창의 이름
              if (line.who === "narr") return <p className="line narr">{t(line)}</p>;
              return (
                <>
                  {(!panel.plaque || line.who === "you") && <div className="speaker">{t(line.who === "you" ? ui.you : panel.name)}</div>}
                  <p className={`line${line.who === "you" ? " you" : ""}`}>“{t(line)}”</p>
                </>
              );
            })()}
            {panel.choices?.some((c) => c.at === panel.step) && (
              <div className="dialog-choices">
                {panel.choices
                  .filter((c) => c.at === panel.step)
                  .map((c, i) => (
                    <button key={i} type="button" className="btn dialog-choice" onClick={c.go}>
                      {t(c.label)}
                    </button>
                  ))}
              </div>
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
            {evidence.length > 0 && (
              <div className="choice-evidence">
                <span>{t(checkpoint.evidenceTitle)}</span>
                <ul>
                  {evidence.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="choice-status">
              {checkpoint.status.map((l, i) => (
                <li key={i}>{t(l)}</li>
              ))}
            </ul>
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
                {/* 현실의 쿠키 창처럼 세 번째 선택지는 작고 흐리게. 기록은 도시 밖에서만 지울 수 있다는 걸 알려 준다 */}
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
            {/* 어느 단계에서든 결정하지 않고 물러날 수 있다 (Esc와 같다). 쿠키 끄기 화면이 닫히면 그 타이머도 멈춘다 */}
            <button type="button" className="choice-withdraw" onClick={withdraw}>
              {t(checkpoint.withdraw)}
            </button>
          </div>
        </div>
      )}

      {ending && (
        <div className={`ending ending-${ending.kind}${walkable ? " walking" : ""}`}>
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
