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
import { MUSIC_URL, credits, announcements, checkpoint, encounters, jabiUi, keeperAfterDeath, npcs, plaque, quest, r07Friend, sanAfterCheckpoint, sanAfterDeath, sanCity, sanCue, sanReview, scopeScene, statueForgot, statueLines, testimony, ui, type Beat, type Line } from "./story";
import { BAY, CITY, CITY_NPCS, CORDON, CORDON_PATH, CORDON_TARP, COVERS, DEPOT, DRONE_RAILS, GAP_THROUGH, JABI, LOOKOUT_PATH, QUEUE_Z, SCOPES, WALK, ZONES, type Interactable, type RoutePt, type Zone } from "./zones";
import { sanHold, sanWalk, type SanPath } from "./SanNPC";
import { player, teleport } from "./Player";
import { JumpButton, Joystick, requestLock, useLookAndKeys } from "./TouchControls";
import { input, loadSettings } from "./input";
import PauseMenu from "./PauseMenu";
import Minimap from "./Minimap";
import QuestArrow, { type QuestTarget } from "./QuestArrow";
import CookieGame from "./CookieGame";
import GazeHUD from "./GazeHUD";
import { autoWalk, gaze, resetGaze, route, stopWalk, walkArea, walkBlock, walkPath, type Rect, type RoutePhase, type WalkStep } from "./gaze";
import { drone, laneClear, presetSweep, resetDrones } from "./Drones";
import DroneHUD from "./DroneHUD";
import ScopeView from "./ScopeView";
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
// 남쪽 망원경 가는 길의 기록 (이 기기에만). 서로 다른 세 가지 사실을 따로 적는다:
// uses 방문자가 직접 들여다본 횟수 / seen 이산과 함께 본 장면(관측)을 마쳤다 / agreed 승강장으로 더 가기로 했다 /
// open 이산이 통제선 끝 천막을 실제로 걷었다
// 예전 저장값 { done: true }는 그때의 흐름(마지막 대사에서 천막이 걷힘)대로 셋 다 참으로 옮긴다
const SCOPE_KEY = "sanlee-scope";
type ScopeData = { uses: number; seen: boolean; agreed: boolean; open: boolean };
const NO_SCOPE: ScopeData = { uses: 0, seen: false, agreed: false, open: false };
function readScope(): ScopeData {
  try {
    const v = JSON.parse(localStorage.getItem(SCOPE_KEY) || "null");
    if (v && typeof v === "object") {
      const old = v.done === true;
      const seen = old || v.seen === true;
      const agreed = seen && (old || v.agreed === true);
      return { uses: Math.max(0, Math.floor(Number(v.uses) || 0)), seen, agreed, open: agreed && (old || v.open === true) };
    }
  } catch {}
  return { ...NO_SCOPE };
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
      // 망원경 장면 뒤의 대화 (닫았다가 다시 열면 그 줄부터 이어진다) / 미뤄 둔 결정 두 줄
      scene?: "after" | "decide";
      // 그 줄에서 고를 수 있는 말 (R-07의 친구 묻기, 정지 시민에게 건네는 증언)
      choices?: { at: number; label: L; go: () => void }[];
    }
  | { kind: "choice"; settings?: boolean; confirm?: number; game?: boolean }
  | { kind: "jabi" }
  | null;

type EndKind = "accept" | "reject" | "ghost";
type Ending = { kind: EndKind; step: number; a: number; r: number; slots: number[] } | null;
// 결말 대본의 각 줄이 머무는 시간(ms). 마지막 줄의 시간은 버튼이 나오기 전의 정적이다.
// 걷는 줄은 시간이 아니라 도착으로 넘어간다 (ENDING_GATE가 참이 된 뒤에야 이 시간이 흐른다)
const BEAT_MS: Record<EndKind, number[]> = {
  accept: [3000, 3600, 1200, 2400, 3000],
  reject: [2800, 3400, 3800, 4800, 3200],
  ghost: [3200, 3400, 2600, 700, 5200],
};
// 空 결말: 3번째 줄(다리를 걷는 줄)과 4번째 줄(마지막 걸음)에서는 평소 조작으로 걷는다
const GHOST_WALK = 3;
const GHOST_STEP = 4;
// 처음 대자비의 시선 앞에서 이산이 기다리는 자리: 큰길 앞쪽의 방벽(가장 튼튼한 엄폐물) 뒤, 방문자가 설 자리를 비워 두고 오른쪽 끝에 선다
const WALL_I = COVERS.findIndex((c) => c.kind === "wall");
const WALL = COVERS[WALL_I];
const COVER_SPOT = { x: WALL.x + WALL.w / 2 - 0.5, z: WALL.z + WALL.d / 2 + 0.7, cover: WALL_I };

// 空 결말의 실제 길: 검문소 앞 → 성문 홍예(기단 사이 6m) → 다리(난간 ±4.4) → 오른쪽 난간이 끊긴 승강장 계단참.
// 눈에 보이는 기단·난간·계단참과 같은 사각형들이다 (중심이 들어갈 수 있는 범위라 몸 반지름만큼 안쪽)
const GHOST_RECTS: Rect[] = [
  { x0: -9, x1: 9, z0: -126, z1: -112 },
  { x0: -2.6, x1: 2.6, z0: -135.3, z1: -125 },
  { x0: -4.0, x1: 4.0, z0: -178, z1: -134.9 },
  { x0: 4.0, x1: 8.5, z0: -154.5, z1: -151.5 },
];
// 계단 앞 (다리 위, 난간 틈 앞)과 계단참 (마지막 걸음이 들어서는 곳)
const STAIR_APPROACH: Rect = { x0: -4.0, x1: 8.5, z0: -156.5, z1: -148.5 };
const LANDING: Rect = GHOST_RECTS[3];
const inRect = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
// 이산: 성문을 지나 다리 가운데로 걸어 계단참에 먼저 서서 방문자를 돌아본다 → 방문자가 내디디면 계단 쪽으로 돌아선다
const GHOST_SAN: SanPath = { pts: [[0, -127], [0, -132], [0.8, -141], [2.6, -150.4], [7.9, -153.4]], yaw: -Math.PI / 2, speed: 2.6 };
const GHOST_TURN: SanPath = { pts: [[8.3, -152.9]], yaw: Math.PI / 2, speed: 1 };
// 수락한 시민이 다시 들어오면 서게 되는 줄 속 자리
// 줄 한가운데, 두 사람 사이. 여기서는 문 너머로 금빛이 된 대자비의 얼굴이 보인다
const LINE_SPOT = { x: 3.6, z: (QUEUE_Z[44] + QUEUE_Z[45]) / 2 };
// 수락 결말: 큰길 가운데(엄폐물 사이)를 따라 줄 옆까지 걸은 뒤 빈자리에 들어선다. 이산은 줄 밖, 그 자리가 보이는 곳에 남는다
const ACCEPT_WALK = [
  { x: 0.5, z: -124.4, speed: 3 },
  { x: 0.5, z: -101.4, speed: 3.2, pitch: 0.2 },
  { x: 2.3, z: LINE_SPOT.z, speed: 2, pitch: 0.2 },
  { x: LINE_SPOT.x, z: LINE_SPOT.z, speed: 1.4, pitch: 0.42, yaw: 0 },
];
const ACCEPT_SAN: SanPath = { pts: [[-0.9, -121], [-0.9, -104.6]], yaw: Math.atan2(LINE_SPOT.x + 0.9, LINE_SPOT.z + 104.6), speed: 2.6 };

// ---------- 남쪽 전망대 가는 길 (zones의 LOOKOUT_PATH) ----------
// 가는 길(OUT)과 돌아오는 길(BACK). BACK은 OUT을 거꾸로 걷고(건너는 드론 길 표시도 한 칸씩 옮긴다), 광장 북쪽에서 통제선 끝 천막으로 간다
const OUT: RoutePt[] = LOOKOUT_PATH;
const BACK: RoutePt[] = [
  ...LOOKOUT_PATH.slice(1)
    .map((p, i, a) => ({ x: p.x, z: p.z, hold: p.hold, lane: a[i + 1]?.lane }))
    .reverse(),
  ...CORDON_PATH,
];
const TARP_ONLY: RoutePt[] = CORDON_PATH;
const OUT_HOLD = { plaza: 1, depot: 2, walk: 5, corner: 6, look: 7 };
// 드론 길을 지나는 자리의 x (그 길의 빛이 앞으로 몇 초 동안 오지 않는지 볼 때 쓴다)
function laneX(a: RoutePt, b: RoutePt, lane: number) {
  const z = DRONE_RAILS[lane].z;
  const t = Math.abs(b.z - a.z) < 1e-3 ? 0.5 : Math.max(0, Math.min(1, (z - a.z) / (b.z - a.z)));
  return a.x + (b.x - a.x) * t;
}
// 망원경 장면: 전망대(BAY) 안에서 장애물은 망원경 몸체 하나뿐이다
const SCOPE_POS = SCOPES[0].pos;
const LOOK_WAIT = OUT[OUT_HOLD.look];
const EYE_SPOT: [number, number] = [SCOPE_POS[0], SCOPE_POS[2] - 0.75];
const SAN_ASIDE: [number, number] = [SCOPE_POS[0] + 2.1, SCOPE_POS[2] - 1.6];
// 방문자가 들여다볼 때의 눈 자리(남쪽을 본다)와 둘러볼 수 있는 범위
const SCOPE_EYE = { x: SCOPE_POS[0], z: SCOPE_POS[2] - 0.8, yaw: Math.PI };
const SCOPE_CLAMP = { yaw: Math.PI, dy: 0.8, p0: -0.75, p1: 0.12 };
const SCOPE_PITCH = -0.18;
const TO_EYE: SanPath = { pts: [[LOOK_WAIT.x, LOOK_WAIT.z], EYE_SPOT], yaw: 0, speed: 1.3 };
const TO_ASIDE: SanPath = { pts: [[EYE_SPOT[0] + 0.9, EYE_SPOT[1] - 0.6], SAN_ASIDE], yaw: Math.atan2(SCOPE_EYE.x - SAN_ASIDE[0], SCOPE_EYE.z - SAN_ASIDE[1]), speed: 1.3 };
const inBay = (x: number, z: number) => x > BAY.x0 - 0.5 && z > BAY.z0 - 0.5;
// 통제선 끝 천막과 그 틈
const TARP_HOLD = CORDON_PATH[CORDON_PATH.length - 1];
const GAP_POS = new THREE.Vector3(TARP_HOLD.x, 1.2, CORDON.z);
// 도시 판 바깥(바깥 산책로·남쪽 다리)에 있는가: 여기서는 화살표가 다음 경유점을 가리킨다 (허공 너머 목표를 곧장 가리키지 않게)
const offDeck = (x: number, z: number) => x < WALK.x1 + 0.8 || z > 38.6;
// 길 위의 만남 자리 (가까이 지나가면 한 번): 할머니 포장마차, 배송 대기소의 D-12, 망원경 앞 모퉁이의 아이
const ENCOUNTER_SPOTS = (["grandma", "courier", "edgekid"] as const).map((id) => ({ id, x: CITY_NPCS[id].pos[0], z: CITY_NPCS[id].pos[2], r: id === "courier" ? 4 : 4.5 }));
// 배송 대기소 처마 밑 (드론 빛이 닿지 않는 지붕)
const underRoof = (x: number, z: number) => Math.abs(x - DEPOT.x) < DEPOT.w / 2 && Math.abs(z - DEPOT.z) < DEPOT.d / 2;

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
  const [scopeData, setScopeData] = useState<ScopeData>(NO_SCOPE);
  // 통제선 끝 천막이 걷혀 있는가: 보통은 scopeData.open을 따르고, 기억으로 깨어난 둘에게는 이번 방문 동안만 (저장하지 않는다)
  const [ghostOpen, setGhostOpen] = useState(false);
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
  // 진행 단계는 이 값 하나로 정한다. 목표 문구·화살표·미니맵·검문소·재시작 자리·이산의 길이 모두 이 값을 따른다.
  // 천막(open)은 단계와 따로: 승강장으로 가기로 했어도 이산이 그 자리에서 걷기 전까지는 막혀 있다
  const phase: RoutePhase = ghost ? "descent" : !complete ? "restore" : !talked ? "talk" : !scopeData.seen ? "scope" : !scopeData.agreed ? "decide" : "descent";
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const cordonOpen = ghost ? ghostOpen : scopeData.open;
  const openRef = useRef(cordonOpen);
  openRef.current = cordonOpen;
  useEffect(() => {
    route.phase = phase;
    route.open = cordonOpen;
    // 천막 짐더미의 충돌: 그림(City의 Cordon)과 같은 값을 따른다
    walkBlock.boxes = cordonOpen ? [] : [CORDON_TARP];
  }, [phase, cordonOpen]);

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
      stopWalk();
      walkArea.rects = null;
      sanHold.at = null;
      gaze.gateOpen = false;
      gaze.mood = "";
      gaze.still = false;
      gaze.zoom = 1;
      gaze.clamp = null;
      gaze.lookAt = null;
      walkBlock.boxes = [];
      route.phase = "restore";
      route.open = false;
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
      // 이산의 길은 지상에 다시 올라올 때 가까운 경유점에서 다시 이어진다. 끝나지 않은 망원경 장면은 처음으로 (기록에는 남지 않았다)
      resetRoute();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검문소에서 물러난 뒤의 이산 대화. 마지막 줄은 '다시 만나면 망원경 이야기를 해 달라'는 부탁 (꼬리말 조건)
  const afterCheckpointPanel = (): Panel => ({
    kind: "dialog",
    name: SAN,
    lines: [...sanAfterCheckpoint.lines, sanAfterCheckpoint.memory],
    step: 0,
  });

  // ---------- 남쪽 전망대의 망원경 장면 ----------
  // idle → ask(방문자가 망원경이나 이산에게 말을 걸면: "내가 먼저 봐도 돼?", 이산이 접안렌즈로 걸어간다) →
  // looking(도착하고 잠깐 뒤 첫 말) → offer(비켜서며 "여기. 한번 봐.". 방문자가 '망원경 들여다보기'를 고를 수 있다) →
  // (방문자가 들여다봄: scopeMove) → after(눈을 떼고 돌아서면 이산이 묻는다. 대화 끝에 결정) → done.
  // 대화를 닫는 것은 어떤 행동도 대신하지 않는다. 장면의 움직임은 모두 도착을 기다린다
  type ScopeStage = "idle" | "ask" | "looking" | "offer" | "after" | "done";
  const scopeRef = useRef<{ stage: ScopeStage; step: number; at: number }>({ stage: "idle", step: 0, at: 0 });
  const [scopeStage, setScopeStageState] = useState<ScopeStage>("idle");
  const setScopeStage = (st: ScopeStage) => {
    scopeRef.current.stage = st;
    setScopeStageState(st);
  };
  // 들여다보기의 움직임: in(눈 자리로 두어 걸음) → view(배율을 당김) → out(원래 자리·방향으로 물러남). 그동안 걷기는 멈춘다
  const scopeMove = useRef<{ mode: "" | "in" | "view" | "out"; back: WalkStep | null; looked: boolean; exitAt: number }>({ mode: "", back: null, looked: false, exitAt: 0 });
  // "in": 눈 자리로 다가가는 중 (조작 안내만 감춘다) / "view": 접안렌즈에 눈을 댐 (둥근 시야를 띄운다)
  const [scopeView, setScopeView] = useState<"" | "in" | "view">("");
  // 결정 대화를 이번 방문에 한 번 끝까지 들었는지 (그 뒤로는 결정 두 줄만). 저장하지 않는다
  const heardRef = useRef(false);
  const endScopeMove = () => {
    if (scopeMove.current.mode) stopWalk();
    scopeMove.current.mode = "";
    scopeMove.current.back = null;
    setScopeView("");
    gaze.still = false;
    gaze.zoom = 1;
    gaze.clamp = null;
  };
  const resetScopeScene = () => {
    scopeRef.current = { stage: "idle", step: 0, at: 0 };
    setScopeStageState("idle");
    endScopeMove();
  };
  const writeScope = (next: ScopeData) => {
    setScopeData(next);
    try {
      localStorage.setItem(SCOPE_KEY, JSON.stringify(next));
    } catch {}
  };
  // 눈을 뗀 뒤의 대화와 결정. 처음에는 전부, 결정을 미뤘다면 결정 두 줄만
  // 전망대에서 정했으면 이산은 돌아오는 길의 첫 자리(전망대)에서 다시 걷는다. 나중에 다른 곳에서 정했으면 지금 걷던 길을 그대로 잇는다
  const leaveScene = () => {
    if (scopeRef.current.stage === "after") resetRoute(BACK, 0);
    setScopeStage("done");
  };
  const agree = () => {
    heardRef.current = true;
    if (!ghostRef.current) writeScope({ ...readScope(), seen: true, agreed: true });
    leaveScene();
    closePanelRef.current();
    say(sanCue.agree, 4600);
  };
  const later = () => {
    heardRef.current = true;
    leaveScene();
    closePanelRef.current();
    say(sanCue.later, 2600);
  };
  const afterPanel = (): Panel => {
    const full = !heardRef.current;
    const lines = full ? [...scopeScene.after, ...scopeScene.decide] : scopeScene.decide;
    const last = lines.length - 1;
    return {
      kind: "dialog",
      name: SAN,
      lines,
      step: full && scopeRef.current.stage === "after" ? Math.min(scopeRef.current.step, last) : 0,
      scene: full ? "after" : "decide",
      choices: [
        { at: last, label: scopeScene.go, go: agree },
        { at: last, label: scopeScene.wait, go: later },
      ],
    };
  };
  // 방문자가 같이 보자고 하면: 이산이 먼저 본다 (전망대에 이산이 와 있을 때만)
  const sanAtLookout = () => {
    const san = CITY.items.find((i) => i.id === "san")!;
    return Math.hypot(san.pos.x - LOOK_WAIT.x, san.pos.z - LOOK_WAIT.z) < 1.6;
  };
  const startScene = () => {
    sanHold.at = null;
    scopeRef.current = { stage: "ask", step: 0, at: 0 };
    setScopeStageState("ask");
    say(scopeScene.ask, 2800);
  };
  // 망원경 들여다보기: 눈 자리로 두어 걸음 다가간 뒤(도착하면) 시야를 당긴다
  const startScopeView = () => {
    const m = scopeMove.current;
    if (m.mode || performance.now() - m.exitAt < 700) return;
    const px = player.pos.x;
    const pz = player.pos.z;
    // 물러날 자리와 방향: 다가오기 전 그대로 (눈 자리에 거의 붙어 있었으면 한 걸음 뒤)
    const close = Math.hypot(px - SCOPE_EYE.x, pz - SCOPE_EYE.z) < 0.6;
    m.back = { x: close ? SCOPE_EYE.x : px, z: close ? SCOPE_EYE.z - 1.2 : pz, speed: 2, yaw: player.yaw, pitch: player.pitch, faceYaw: true };
    m.mode = "in";
    m.looked = false;
    gaze.still = true;
    setScopeView("in");
    walkPath([{ x: SCOPE_EYE.x, z: SCOPE_EYE.z, speed: 2, yaw: SCOPE_EYE.yaw, pitch: SCOPE_PITCH }]);
    lock();
  };
  // 눈 떼기 (버튼, E·클릭, Esc, 마우스 잠금 풀림, 설정창): 원래 자리와 방향으로 물러난다
  const exitScopeView = () => {
    const m = scopeMove.current;
    if (m.mode !== "in" && m.mode !== "view") return;
    m.exitAt = performance.now();
    m.looked = m.mode === "view";
    m.mode = "out";
    setScopeView("");
    gaze.zoom = 1;
    gaze.clamp = null;
    if (m.back) walkPath([m.back]);
    else stopWalk();
  };
  const exitScopeRef = useRef(exitScopeView);
  exitScopeRef.current = exitScopeView;
  const scopeBusy = () => scopeMove.current.mode === "in" || scopeMove.current.mode === "view";

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
          // 망원경 장면 도중: 이산은 하던 일을 계속한다 (비켜선 뒤에는 같은 말을 한 번 더). 눈을 뗀 뒤의 대화는 그 줄부터 다시
          else if (it.id === "san" && (scopeRef.current.stage === "looking" || scopeRef.current.stage === "offer")) say(scopeScene.first[1], 2600);
          else if (it.id === "san" && scopeRef.current.stage === "after") setPanel(afterPanel());
          else if (it.id === "san" && scopeRef.current.stage === "ask") break;
          // 검문소 뒤: 대화를 다 들었으면 짧게 되짚기만, 물러났지만 끝까지 못 들었으면 그 대화를 다시
          else if (it.id === "san" && cpRef.current.talked) setPanel({ kind: "dialog", name: SAN, lines: sanReview, step: 0 });
          else if (it.id === "san" && cpRef.current.seen) setPanel(afterCheckpointPanel());
          // 전망대에서 이산에게 말을 걸면 함께 보기가 시작된다 / 결정을 미뤘다면 결정으로
          else if (it.id === "san" && phase === "scope" && inBay(player.pos.x, player.pos.z) && sanAtLookout()) startScene();
          else if (it.id === "san" && phase === "decide") setPanel(afterPanel());
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
          // 남쪽 망원경: 망원경 단계에서는 이산과 함께 보는 장면, 그 뒤로는 방문자가 언제든 직접 들여다본다
          // (기억으로 깨어난 사람은 글로만 본다. 그 길에는 망원경 장면이 없다)
          if (it.id === "scope-0" && !ghost && !accepted) {
            const sc = scopeRef.current.stage;
            if (sc === "offer") startScopeView();
            else if (sc === "after") setPanel(afterPanel());
            else if (sc === "ask" || sc === "looking") break;
            else if (phase !== "scope") startScopeView();
            // 망원경 단계: 이산이 전망대에 와 있으면 이산이 먼저 본다. 아직 오는 중이면 기다린다
            else if (sanAtLookout()) startScene();
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
          else if (complete) setPanel({ kind: "dialog", name: it.label, locked: true, lines: phase === "decide" ? checkpoint.lockedDecide : checkpoint.lockedScope, step: 0 });
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
  const walkable = ending?.kind === "ghost" && (ending.step === GHOST_WALK || ending.step === GHOST_STEP) && !stepped;
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
      if (scopeBusy()) exitScopeRef.current();
      else if (activeRef.current && !touchRef.current) setPaused(true);
    }
  }, []);
  useLookAndKeys(
    rootRef,
    () => {
      if (scopeBusy()) exitScopeRef.current();
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
        if (scopeBusy()) exitScopeRef.current();
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
  // 걷는 줄은 도착해야 다음으로: 수락은 줄 옆에 닿은 뒤 이산의 말, 빈자리에 들어선 뒤 마지막 줄.
  // 空은 둘 다 계단 앞에 온 뒤 이산의 말, 방문자가 계단참에 들어선 뒤 정적. 그다음의 시간(BEAT_MS)은 도착 뒤의 멈춤이다
  const ghostBase = useRef(0);
  const endGate = (kind: EndKind, step: number) => {
    if (kind === "accept" && step === 2) return autoWalk.queue.length === 0;
    if (kind === "accept" && step === 3) return autoWalk.arrived;
    if (kind === "ghost" && step === GHOST_WALK) return sanWalk.path === GHOST_SAN && sanWalk.arrived && inRect(STAIR_APPROACH, player.pos.x, player.pos.z);
    if (kind === "ghost" && step === GHOST_STEP) return steppedRef.current;
    return true;
  };
  useEffect(() => {
    if (!ending) return;
    const { kind, step } = ending;
    const ms = BEAT_MS[kind][step];
    if (ms === undefined) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => (timer = setTimeout(() => setEnding((e) => (e && e.kind === kind && e.step === step ? { ...e, step: step + 1 } : e)), ms));
    if (endGate(kind, step)) {
      next();
      return () => clearTimeout(timer);
    }
    const iv = setInterval(() => {
      if (!endGate(kind, step)) return;
      clearInterval(iv);
      next();
    }, 120);
    return () => {
      clearInterval(iv);
      clearTimeout(timer);
    };
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
  // 눈을 뗀 뒤의 대화: 지금 줄을 기억해 둔다 (닫아도 그 줄부터). 결정 줄에 닿으면 이번 방문 동안은 결정 두 줄만 다시 묻는다.
  // 대화를 닫는 것만으로는 아무것도 정해지지 않는다 (고르는 말만 진행을 바꾼다)
  useEffect(() => {
    if (panel?.kind !== "dialog" || panel.scene !== "after") return;
    scopeRef.current.step = panel.step;
    if (panel.step >= scopeScene.after.length) heardRef.current = true;
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
        // 플레이 중 몸을 숨기던 그 줄로: 큰길 가운데를 따라 줄 옆까지 걸어가 빈자리에 들어서서 가만히 선다.
        // 점마다 도착하면 다음 점으로 (Player가 autoWalk.queue를 차례로 꺼낸다). 이산은 줄 밖에 남는다
        walkPath(ACCEPT_WALK);
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
      // 정지 장벽이 고정할 활동 기록을 찾지 못해 빛을 거둔다 (성문 옆 표시도 바뀐다). 문이 열리는 것은 아니다
      if (step === 1) {
        gaze.gateOpen = true;
        sfx.hidden();
      }
      // 조작을 돌려준다: 성문 홍예와 다리, 계단참만 걸을 수 있다 (보이는 기단·난간과 같은 자리). 이산은 앞서 계단참으로 간다
      if (step === GHOST_WALK) walkArea.rects = GHOST_RECTS;
      // 계단 앞: 마지막 걸음은 지금 서 있는 곳에서 계단참 쪽으로 실제로 한 걸음 더 들어서는 것 (ghostBase)
      if (step === GHOST_STEP) ghostBase.current = Math.max(LANDING.x0, player.pos.x);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endStep]);

  // 空 결말의 마지막 걸음: 이산의 말 뒤, 평소 조작으로 계단참(난간이 끊긴 자리 너머)에 들어서서 1m 더 나아가면 끝난다.
  // 시점 회전만으로는 끝나지 않는다. 내디디면 조작을 거두고, 이산이 계단 쪽으로 돌아서고, 정적 뒤에 버튼이 나온다 (endGate)
  useEffect(() => {
    if (!walkable || ending?.step !== GHOST_STEP) return;
    const iv = setInterval(() => {
      if (steppedRef.current) return;
      const x = player.pos.x;
      if (!inRect(LANDING, x, player.pos.z) || x < Math.max(LANDING.x0 + 1.2, ghostBase.current + 1.0)) return;
      steppedRef.current = true;
      setStepped(true);
      walkArea.rects = null;
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkable, ending?.step]);

  // 지상에서 직접 오가는 짧은 말 (자막 한 줄. 말하는 사람 이름과 함께). 대화창을 열지 않고, 조작을 막지 않는다.
  // 한 번에 한 줄만 뜨고, 그동안 방송(.notice)은 비켜 준다. speak는 여러 줄을 차례로 (길 위의 짧은 만남)
  const [sanSay, setSanSay] = useState<{ who: L; line: L } | null>(null);
  const sayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speakUntil = useRef(0);
  const speak = useCallback((seq: { who: L; line: L; ms?: number }[]) => {
    clearTimeout(sayTimer.current);
    const run = (i: number) => {
      if (i >= seq.length) {
        setSanSay(null);
        speakUntil.current = 0;
        return;
      }
      const ms = seq[i].ms ?? 3600;
      setSanSay({ who: seq[i].who, line: seq[i].line });
      speakUntil.current = performance.now() + ms;
      sayTimer.current = setTimeout(() => run(i + 1), ms);
    };
    run(0);
  }, []);
  const say = useCallback((l: L, ms = 3600) => speak([{ who: SAN, line: l, ms }]), [speak]);
  const speaking = () => performance.now() < speakUntil.current;
  useEffect(() => () => clearTimeout(sayTimer.current), []);
  // 처음 시선 구역: 대자비 소개가 닫힌 뒤 이산이 첫 엄폐물 뒤로 가서 기다린다 (탭마다 한 번 말하고, 재시도 때는 말없이 다시 기다린다)
  const cueRef = useRef({ cover: false, wait: false, back: false, plaza: false, shelter: false, cordonAt: 0 });
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

  // ---------- 남쪽 전망대 가는 길과 돌아오는 길: 이산의 경유점 ----------
  // 이산은 hold(드론 빛이 닿지 않는 자리)에서 기다리다, 방문자가 다음 hold 쪽으로 앞서 나가면 그 hold까지 경유점을 차례로 걷는다
  // (경유점 사이는 장애물과 허공이 없는 직선이다). 그 사이에 드론 길이 있으면 앞으로 몇 초 동안 그 길의 빛이 건너는 자리에
  // 오지 않을 때만 건넌다. 이산은 들키지 않는다 (호위 실패 없음).
  // 길은 셋: 가는 길(OUT) / 돌아오는 길(BACK: 전망대 → 광장 북쪽 → 통제선 끝 천막) / 기억으로 깨어난 둘의 천막 길(TARP_ONLY)
  type RouteRun = { list: RoutePt[] | null; hold: number; i: number; target: number; openAt: number };
  const routeRef = useRef<RouteRun>({ list: null, hold: -1, i: -1, target: -1, openAt: 0 });
  function resetRoute(list: RoutePt[] | null = null, hold = -1) {
    routeRef.current = { list, hold, i: hold, target: hold, openAt: 0 };
  }
  const sanPos = () => CITY.items.find((i) => i.id === "san")!.pos;
  const nearestHold = (list: RoutePt[], x: number, z: number) => {
    let k = -1;
    let d = Infinity;
    list.forEach((p, j) => {
      if (!p.hold) return;
      const dd = Math.hypot(p.x - x, p.z - z);
      if (dd < d) {
        d = dd;
        k = j;
      }
    });
    return { k, d };
  };
  const nextHold = (list: RoutePt[], k: number) => {
    for (let j = k + 1; j < list.length; j++) if (list[j].hold) return j;
    return -1;
  };
  const holdSan = (p: { x: number; z: number }, speed = 3.6, snap = false) => {
    const h = sanHold.at;
    if (h && h.manual && Math.abs(h.x - p.x) < 0.01 && Math.abs(h.z - p.z) < 0.01 && Math.abs((h.speed ?? 0) - speed) < 0.01 && !snap) return;
    sanHold.at = { x: p.x, z: p.z, cover: -1, manual: true, speed, snap };
  };
  // 이산이 천막 앞에 서서 걷는다: 그 순간 천막 그림과 충돌이 함께 바뀐다 (보통은 이 기기에 남고, 기억으로 깨어난 둘은 이번 방문만)
  const openCordon = () => {
    if (openRef.current) return;
    if (ghostRef.current) setGhostOpen(true);
    else writeScope({ ...readScope(), open: true });
    sfx.open();
    say(sanCue.opened, 3200);
    // 걷은 틈을 지나 큰길 쪽에서 기다린다. 방문자가 그 앞으로 지나가면 다시 따라온다
    sanHold.at = { x: GAP_THROUGH.x, z: GAP_THROUGH.z, cover: -1 };
  };
  const sanLeads = zone === "city" && complete && talked && !accepted && !ending;
  useEffect(() => {
    if (!sanLeads) return;
    const iv = setInterval(() => {
      if (pausedRef.current || panelRef.current || drone.caught) return;
      // 망원경 장면 동안은 장면이 이산을 움직인다 (정해진 길)
      const sc = scopeRef.current.stage;
      if (sc !== "idle" && sc !== "done") return;
      const ph = phaseRef.current;
      const open = openRef.current;
      const want: RoutePt[] | null = ghostRef.current ? (open ? null : TARP_ONLY) : ph === "scope" ? OUT : ph === "decide" || (ph === "descent" && !open) ? BACK : null;
      if (routeRef.current.list !== want) resetRoute(want);
      const run = routeRef.current;
      const list = run.list;
      if (!list) {
        if (sanHold.at?.manual) sanHold.at = null;
        return;
      }
      const px = player.pos.x;
      const pz = player.pos.z;
      const sp = sanPos();
      const me = nearestHold(list, px, pz);
      if (run.hold < 0) {
        // 아직 길 위에 있지 않다: 따라오다가 방문자가 지나온(또는 서 있는) hold 가까이 오면 그 자리에 선다
        const at = nearestHold(list, sp.x, sp.z);
        if (at.k >= 0 && at.d < 2.5 && at.k <= me.k) run.hold = run.i = run.target = at.k;
        else {
          if (sanHold.at?.manual) sanHold.at = null;
          return;
        }
      }
      // 방문자가 길을 벗어나 멀리 갔으면 (다른 데를 둘러보러) 기다림을 풀고 평소처럼 따라간다. 길로 돌아오면 다시 붙는다
      if (me.d > 14 && Math.hypot(px - sp.x, pz - sp.z) > 24) {
        resetRoute(list);
        if (sanHold.at?.manual) sanHold.at = null;
        return;
      }
      if (run.target === run.hold) {
        const nh = nextHold(list, run.hold);
        if (nh >= 0 && me.k >= nh) {
          let clear = true;
          for (let j = run.hold + 1; j <= nh; j++) {
            const L = list[j].lane;
            if (L !== undefined && !laneClear(L, laneX(list[j - 1], list[j], L), 2.6)) clear = false;
          }
          if (clear) {
            run.target = nh;
            run.i = run.hold + 1;
          }
        }
      }
      const p = list[run.i];
      let crossing = false;
      for (let j = run.hold + 1; j <= run.target; j++) if (list[j].lane !== undefined) crossing = true;
      holdSan(p, crossing ? 5.2 : 3.6);
      if (run.i !== run.hold && Math.hypot(sp.x - p.x, sp.z - p.z) < 0.5) {
        if (run.i < run.target) run.i++;
        else run.hold = run.target;
      }
      // 통제선 끝 천막 앞: 승강장으로 가기로 했다면, 그 자리에 다 와서 잠깐 뒤 천막을 걷는다
      if (list[run.hold] === TARP_HOLD && run.target === run.hold && ph === "descent" && !open && Math.hypot(sp.x - TARP_HOLD.x, sp.z - TARP_HOLD.z) < 0.6) {
        if (!run.openAt) run.openAt = performance.now();
        else if (performance.now() - run.openAt > 1300) openCordon();
      }
    }, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanLeads]);

  // 길 위의 짧은 말과 장면 신호: 골목 입구(처음 한 번, 허공 너머 망원경과 드론 한 번 훑기) / 배송 대기소 처마 밑 /
  // 길 위의 만남(할머니·D-12·아이, 각각 한 번) / 큰길 통제선 / 망원경 장면의 진행 / 들여다보기의 다가감·물러남
  const frameTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // 이번 방문에 이미 지나친 만남 (드론에 들켜 다시 가도 되풀이하지 않는다). 저장하지 않는다
  const metRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (zone !== "city" || ending || accepted) return;
    const iv = setInterval(() => {
      const m = scopeMove.current;
      const sc = scopeRef.current;
      // 들여다보기: 눈 자리에 다 오면 시야를 당기고, 원래 자리에 다 물러나면 걷기를 돌려준다 (설정창이 떠 있어도 마저 걷는다)
      if (m.mode === "in" && autoWalk.arrived) {
        stopWalk();
        gaze.zoom = 0.42;
        gaze.clamp = { ...SCOPE_CLAMP };
        m.mode = "view";
        setScopeView("view");
        // 들여다본 횟수만 센다 (기억으로 깨어난 사람은 기록을 남기지 않는다)
        if (!ghostRef.current) writeScope({ ...readScope(), uses: readScope().uses + 1 });
      } else if (m.mode === "out" && autoWalk.arrived) {
        stopWalk();
        m.mode = "";
        m.back = null;
        gaze.still = false;
        if (m.looked && sc.stage === "offer") {
          // 함께 보는 관측은 여기서 끝난다 (이 기기에 남는다). 돌아선 방문자에게 이산이 묻는다
          if (!ghostRef.current) writeScope({ ...readScope(), seen: true });
          sc.step = 0;
          setScopeStage("after");
          setPanel(afterPanel());
          return;
        }
        if (m.looked && phaseRef.current !== "scope") say(scopeScene.again, 2600);
      }
      if (pausedRef.current || panelRef.current || drone.caught || gaze.intro) return;
      const now = performance.now();
      const px = player.pos.x;
      const pz = player.pos.z;
      const ph = phaseRef.current;
      const c = cueRef.current;
      const withSan = sanWithYouRef.current;
      // 골목 입구에서 처음: 허공 너머 남쪽 전망대의 망원경을 잠깐 바라보게 하고, 앞줄 드론이 그 앞을 한 번 훑는다 (걷기는 막지 않는다)
      if (ph === "scope" && withSan && !c.plaza && Math.abs(px - OUT[0].x) < 2.2 && pz > OUT[0].z - 1.6 && pz < CORDON.z + 2) {
        c.plaza = true;
        presetSweep(0, 1.6);
        gaze.lookAt = { x: SCOPE_POS[0], y: 1.2, z: SCOPE_POS[2] };
        say(sanCue.plaza, 4600);
        clearTimeout(frameTimer.current);
        frameTimer.current = setTimeout(() => (gaze.lookAt = null), 2600);
      }
      if (ph === "scope" && withSan && !c.shelter && underRoof(px, pz)) {
        c.shelter = true;
        if (!speaking()) say(sanCue.shelter, 3000);
      }
      // 길 위의 만남: 망원경 가는 길에서 한 번씩, 다른 말이 떠 있지 않을 때 (긴 이야기는 말을 걸면 대화로)
      if (ph === "scope" && withSan && !speaking()) {
        for (const e of ENCOUNTER_SPOTS) {
          if (metRef.current[e.id]) continue;
          if (Math.hypot(px - e.x, pz - e.z) > e.r) continue;
          metRef.current[e.id] = true;
          speak(encounters[e.id].map((l) => ({ who: l.who === "san" ? SAN : npcs[e.id].name, line: l, ms: 3800 })));
          break;
        }
      }
      // 큰길 통제선 앞: 막힌 이유(표지)와 이산의 말. 망원경 전에는 망원경부터, 결정을 미뤘다면 갈지 묻는다
      if (withSan && ph !== "descent" && Math.abs(px) < 12 && pz > CORDON.z - 0.5 && pz < CORDON.z + 3.2 && now - c.cordonAt > 9000) {
        c.cordonAt = now;
        say(ph === "decide" ? sanCue.cordonDecide : sanCue.cordon, 3400);
      }
      // 망원경 장면: 이산이 접안렌즈 앞에 다 온 뒤 잠깐의 정적, 첫 말. 그다음 비켜서며 권한다 (도착을 기다리고, 그 뒤만 시간으로)
      if (sc.stage === "ask" && sanWalk.path === TO_EYE && sanWalk.arrived) {
        if (!sc.at) sc.at = now;
        else if (now - sc.at > 1600) {
          sc.at = now;
          setScopeStage("looking");
          say(scopeScene.first[0], 3200);
        }
      } else if (sc.stage === "looking" && now - sc.at > 3200) {
        setScopeStage("offer");
        say(scopeScene.first[1], 4200);
      }
    }, 150);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, ending, accepted, say, speak]);
  useEffect(() => () => clearTimeout(frameTimer.current), []);

  // 광장·바깥 산책로에서 드론에 식별되면: 그 드론 길 바로 앞의 안전한 자리로 (가는 길이면 건너기 전, 돌아오는 길이면 돌아오기 전).
  // 화면이 어두워진 동안 옮긴다. 이산도 그 자리에서 기다린다. 이미 지나친 만남과 망원경 장면은 되풀이하지 않는다
  const onDroneCaught = useCallback(() => {
    const out = phaseRef.current === "scope";
    const k = drone.by === 1 ? (out ? OUT_HOLD.walk : OUT_HOLD.corner) : out ? OUT_HOLD.plaza : OUT_HOLD.depot;
    const spot = OUT[k];
    const ahead = OUT[out ? k + 1 : k - 1];
    const len = Math.hypot(ahead.x - spot.x, ahead.z - spot.z) || 1;
    const ux = (ahead.x - spot.x) / len;
    const uz = (ahead.z - spot.z) / len;
    teleport.req = { x: spot.x + ux * 1.2, z: spot.z + uz * 1.2, yaw: Math.atan2(-ux, -uz) };
    const sceneFree = scopeRef.current.stage === "idle" || scopeRef.current.stage === "done";
    if (sanWithYouRef.current && sceneFree) {
      const list = out ? OUT : BACK;
      resetRoute(list, out ? k : BACK.findIndex((p) => p.x === spot.x && p.z === spot.z));
      holdSan(spot, 3.6, true);
    }
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
    if (paused && scopeBusy()) exitScopeRef.current();
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
    setScopeData({ ...NO_SCOPE });
    setGhostOpen(false);
  };
  const clearScene = () => {
    clearTimeout(sceneTimer.current);
    stopWalk();
    sanHold.at = null;
    walkArea.rects = null;
    gaze.gateOpen = false;
    cueRef.current = { cover: false, wait: false, back: false, plaza: false, shelter: false, cordonAt: 0 };
    cpRef.current = { seen: false, talked: false };
    metRef.current = {};
    heardRef.current = false;
    resetRoute();
    resetScopeScene();
    setGhostOpen(false);
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
    setScopeData({ ...NO_SCOPE });
    setGhostOpen(false);
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
    // 망원경을 들여다보는 동안과 장면 도중에는 감춘다. 눈을 뗀 뒤의 대화를 닫고 돌아섰다면 이산을 가리킨다
    if (scopeView) return null;
    if (scopeRef.current.stage === "after") {
      const san = find("san");
      return san ? { pos: san.pos, label: t(quest.decide) } : null;
    }
    if (scopeRef.current.stage !== "idle" && scopeRef.current.stage !== "done") return null;
    // 길 위(광장·바깥 산책로)에서는 허공 너머 목표를 곧장 가리키지 않고 다음 경유점(드론 빛이 닿지 않는 자리)을 가리킨다
    const along = (list: RoutePt[], label: L): QuestTarget => {
      const nh = nextHold(list, nearestHold(list, px, pz).k);
      return nh >= 0 ? { pos: list[nh], label: t(label) } : null;
    };
    if (phase === "scope") {
      const sc = find("scope-0");
      if (inBay(px, pz) || !sc) return sc ? { pos: sc.pos, label: t(quest.scope) } : null;
      return along(OUT, quest.scope);
    }
    if (ghost) {
      if (!cordonOpen) return pz > CORDON.z ? { pos: GAP_POS, label: t(quest.cordon) } : null;
    } else if (phase !== "decide" && offDeck(px, pz)) return along(BACK, quest.cordon);
    // 승강장으로 갈지 아직 정하지 않았다: 어디서든 이산에게 (이산은 돌아오는 길의 경유점에서 기다린다)
    if (phase === "decide") {
      const san = find("san");
      return san ? { pos: san.pos, label: t(quest.decide) } : null;
    }
    // 정했지만 천막이 아직 닫혀 있다: 이산과 함께 통제선 끝 천막으로. 걷힌 뒤로는 틈을 지나 검문소로
    if (!cordonOpen) return { pos: GAP_POS, label: t(quest.cordon) };
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
  // 이산이 걸을 정해진 길: 망원경 장면(접안렌즈로 → 비켜선 자리), 수락 결말(줄 밖), 空 결말(계단참 → 돌아섬).
  // 그 밖에는 평소처럼 따라오거나 경유점에서 기다린다
  const sanPath: SanPath | undefined =
    ending?.kind === "accept"
      ? ACCEPT_SAN
      : ending?.kind === "ghost"
        ? ending.step >= GHOST_WALK
          ? stepped
            ? GHOST_TURN
            : GHOST_SAN
          : undefined
        : scopeStage === "ask" || scopeStage === "looking"
          ? TO_EYE
          : scopeStage === "offer" || scopeStage === "after"
            ? TO_ASIDE
            : undefined;
  // 검문소가 가진 기록: 실제로 연 순서와 횟수, 망원경 이용 횟수 (있는 값만)
  const evidence: string[] = [];
  if (panel?.kind === "choice") {
    const order = visited.map((id) => sections.find((x) => x.id === id)?.label.toUpperCase() ?? id).join(" → ");
    evidence.push(t(checkpoint.evOrder).replace("{order}", order).replace("{n}", String(visited.length)));
    if (scopeData.uses > 0) evidence.push(t(checkpoint.evScope).replace("{n}", String(scopeData.uses)));
    else if (scopeData.seen) evidence.push(t(checkpoint.evScopeDone));
  }
  const painting = panel?.kind === "painting" ? works[panel.work] : null;
  const verb = near ? (near.id === "scope-0" && !ghost && (scopeStage === "offer" || (phase !== "scope" && scopeStage !== "after")) ? ui.scopeLook : near.id.startsWith("scope") || near.kind === "painting" ? ui.view : near.kind === "npc" || near.kind === "statue" ? ui.talk : ui.open) : null;
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
            sanPath={sanPath}
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
          <b>{t(sanSay.who)}</b> {t(sanSay.line)}
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
      {scopeView === "view" && <ScopeView sees={t(ui.scopeSees)} exitLabel={t(ui.scopeExit)} hint={t(touch ? ui.scopeHintTouch : ui.scopeHintPc)} onExit={exitScopeView} yaw0={SCOPE_CLAMP.yaw} pitch0={SCOPE_PITCH} />}
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
