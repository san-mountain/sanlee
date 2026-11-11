"use client";

import { ambience, sfx, spatial, type Voice } from "./sfx";
import { duckBgm, playBgm, preloadBgm, wakeBgm, type Track } from "./bgm";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RESTORE_KEY } from "@/components/RestoreCrossing";
import { FORGET_HINT_KEY } from "@/components/ForgetCity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sections, works, type L, type SectionId } from "@/data/site";
import { LangToggle, useLang } from "@/components/LangProvider";
import SectionBody from "@/components/SectionBody";
import { MUSIC_URL, echoLines, galleryUi, notes, notesUi, faceTalk, credits, announcements, checkpoint, encounters, encountersBack, grandmaBackStd, grandmaBroth, courierWaybill, lineWhisper, jabiUi, keeperAfterDeath, npcs, patrolNoRecord, plaque, quest, r07Friend, reunion, sanAfterCheckpoint, sanAfterDeath, sanCity, sanCue, sanReview, scopeScene, statueForgot, statueLines, ui, faceUi, routeUi, replayUi, type Beat, type Line } from "./story";
import { AVENUE_EDGE_Z, BAY, BUNKER, BUNKER_NPCS, EDGE, machinePoint, flipPainting, FROZEN_SAN, CITY, CITY_NPCS, COVERS, DEPOT, DRONE_RAILS, JABI, LOOKOUT_PATH, QUEUE_Z, SCOPES, WALK, ZONES, type Interactable, type RoutePt, type Zone } from "./zones";
import { sanHold, sanRise, sanWalk, type SanPath } from "./SanNPC";
import { player, teleport } from "./Player";
import { JumpButton, Joystick, requestLock, useLookAndKeys } from "./TouchControls";
import { input, loadSettings, resetInput } from "./input";
import PauseMenu from "./PauseMenu";
import Minimap from "./Minimap";
import QuestArrow, { type QuestTarget } from "./QuestArrow";
import CookieGame from "./CookieGame";
import GazeHUD from "./GazeHUD";
import { autoWalk, gaze, resetGaze, route, stopWalk, walkArea, walkPath, type Rect, type RoutePhase, type WalkStep } from "./gaze";
import { drone, laneClear, presetSweep, resetDrones } from "./Drones";
import DroneHUD from "./DroneHUD";
import ScopeView from "./ScopeView";
import EndingGallery, { readMemory, remember, type EndKey } from "./EndingGallery";
import { coverState, restoreCovers } from "./Jabi";
import SaveToast from "./BackupLine";
import { getBackup, saveBackup, wipeBackup } from "./backup";
import { FACE_KEY, SOLUTION, emptyFace, faceFinished, loadFace, rotateDrum, saveFace, seamJoined, type Drums, type FaceMethod, type FaceState } from "./faceAuth";
import { faceRt, resetFaceRuntime, setFacePhase, type FacePhase } from "./faceRuntime";

import { resetTally, runtime, tally, warm } from "./runtime";
import { useGameTimers } from "./useGameTimers";
import { useModalFocus } from "./useModalFocus";
import WorldBoundary from "./WorldBoundary";
import { uniqueIds } from "./progress";

const World = dynamic(() => import("./World"), { ssr: false });

const KEY = "sanlee-visited";
const END_KEY = "sanlee-ending";
// 수락하면 받는 대기 번호. 줄에서 다시 시작할 때마다 하나씩 밀린다
const QUEUE_KEY = "sanlee-queue-no";
const QUEUE_FIRST = 1204118;
const readQueueNo = () => {
  try {
    return Number(localStorage.getItem(QUEUE_KEY)) || 0;
  } catch {
    return 0;
  }
};
const MET_KEY = "sanlee-met";
const TALK_KEY = "sanlee-san-talked";
const LOGIN_KEY = "sanlee-last-login";
const PROMISE_KEY = "sanlee-promise";
const FORGOT_KEY = "sanlee-forgotten";
const FOUND_KEY = "sanlee-endings-found";
const NOTES_KEY = "sanlee-notes";
// 남쪽 망원경 가는 길의 기록 (이 기기에만). 서로 다른 세 가지 사실을 따로 적는다:
// uses 방문자가 직접 들여다본 횟수 / seen 이산과 함께 본 장면(관측)을 마쳤다 / agreed 승강장으로 더 가기로 했다
// 예전 저장값 { done: true }는 둘 다 참으로 옮긴다. 예전의 open(통제선 천막)은 천막이 없어졌으므로 읽지 않는다
const SCOPE_KEY = "sanlee-scope";
type ScopeData = { uses: number; seen: boolean; agreed: boolean };
const NO_SCOPE: ScopeData = { uses: 0, seen: false, agreed: false };
function readScope(): ScopeData {
  try {
    const v = JSON.parse(localStorage.getItem(SCOPE_KEY) || "null");
    if (v && typeof v === "object") {
      const old = v.done === true;
      const seen = old || v.seen === true;
      const agreed = seen && (old || v.agreed === true);
      return { uses: (Number.isSafeInteger(v.uses) && v.uses >= 0 ? v.uses : 0), seen, agreed };
    }
  } catch {}
  return { ...NO_SCOPE };
}

const SAN: L = { ko: "이산", en: "San" };
// 대사가 뜰 때 나는 목소리 대신의 짧은 소리: 말하는 이에 따라 (이름표로 고른다)
const ROBOTS = ["r07", "robomonk", "courier", "patrol", "patrol2"];
const VOICES = new Map<L, Voice>([[SAN, "san"]]);
for (const [k, n] of Object.entries(npcs)) VOICES.set(n.name, ROBOTS.includes(k) ? "robot" : k === "radio" ? "radio" : "person");
const voiceOf = (name: L, line?: Line): Voice => (line?.who === "narr" ? "none" : (VOICES.get(name) ?? "none"));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
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
      // 마지막 줄에서 로그아웃 버튼을 보인다 (검문소에서 물러난 뒤 이산과의 대화: 기록을 지우러 웹사이트로 나가는 길)
      logout?: boolean;
      // 망원경 장면 뒤의 대화 (닫았다가 다시 열면 그 줄부터 이어진다) / 미뤄 둔 결정 한 페이지
      scene?: "after" | "decide";
      // 그 줄에서 방문자가 할 수 있는 행동 (말이 아니라 몸짓: 고개 끄덕이기, 두 번 두드리기, 흉내 내기)
      choices?: { at: number; label: L; go: () => void }[];
    }
  | { kind: "choice"; confirm?: number; game?: boolean }
  | { kind: "jabi" }
  | { kind: "route" }
  | null;

type EndKind = "accept" | "reject" | "ghost";
type Ending = { kind: EndKind; step: number; a: number; r: number; slots: number[] } | null;
// 결말 대본의 각 줄이 머무는 시간(ms). 마지막 줄의 시간은 버튼이 나오기 전의 정적이다.
// 걷는 줄은 시간이 아니라 도착으로 넘어간다 (ENDING_GATE가 참이 된 뒤에야 이 시간이 흐른다)
const BEAT_MS: Record<EndKind, number[]> = {
  accept: [3600, 3400, 3600, 1200, 2800, 4200, 5200],
  reject: [2800, 3400, 3600, 3800, 4800, 4400],
  ghost: [3200, 3400, 700, 1800, 5200],
};
// 空 결말: 3번째 줄("…이번엔 우릴 막지 않네.", 다리를 걷는 줄)과 4번째 줄("여기부터는 나도 몰라.", 마지막 걸음)에서는 평소 조작으로 걷는다.
// 4번째 줄에서 이산이 먼저 계단을 내려가 구름 속에서 신호처럼 끊기며 사라지고, 그 뒤에야 방문자가 내려갈 수 있다.
// 내려갈수록 화면이 흐려지고 지직대다 끊기면, 검은 화면에 마지막 문장 하나가 남는다. 계단을 설명하는 지문은 없다
const GHOST_WALK = 2;
const GHOST_STEP = 3;
// 수락 결말: 이산이 말하는 줄(시점이 이산 쪽으로 돌아가고, 이산이 돌처럼 굳는다)과 시점이 다시 줄 앞으로 돌아가는 줄
const TO_LINE_KEY = "sanlee-to-line";
const ACCEPT_SAY = 4;
const ACCEPT_AWAY = 6;
// 수락 결말: 성문을 올려다보며 등록을 듣고(0), 돌아서서 이산의 말을 듣고(1), 그다음 줄에서야 걷기 시작한다(2)
const ACCEPT_TURN = 1;
const ACCEPT_GO = 2;
// 거부 결말: 장면이 방공호로 넘어가는 줄 (두 번째 정지 시민의 표석). 결말 곡도 이 줄에서 들어온다
const REJECT_BUNKER = 4;
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
// 계단참 너머 구름 속으로 내려가는 계단 (City.tsx DescentRoute: 첫 단 x 8.9부터 0.9m마다 0.62m씩 내려간다). 폭 2.6m
const STAIR_TOP = 8.9;
const STAIR_RECT: Rect = { x0: LANDING.x1 - 0.1, x1: STAIR_TOP + 0.9 * 26, z0: -153.95, z1: -152.05 };
// 계단 위의 바닥 높이: 단을 매끄럽게 이은 경사 (단 하나 0.9m에 0.62m)
const stairFloor = (x: number, z: number) => (x > STAIR_TOP && z > -154.6 && z < -151.4 ? -(x - STAIR_TOP) * (0.62 / 0.9) : 0);
// 흐려지기 시작하는 단과, 신호가 끊기는 단 (스무 단쯤 내려간 곳)
const STAIR_FADE = STAIR_TOP + 0.9 * 2;
const STAIR_END = STAIR_TOP + 0.9 * 20;
const inRect = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
// 이산: 성문을 지나 다리 가운데로 걸어 계단참에 먼저 서서 방문자를 돌아본다 → 방문자가 내디디면 계단 쪽으로 돌아선다
const GHOST_SAN: SanPath = { pts: [[0, -127], [0, -132], [0.8, -141], [2.6, -150.4], [7.5, -154.1]], yaw: -Math.PI / 2, speed: 2.6 };
// 이산의 마지막 말 뒤: 이산이 먼저 계단을 걸어 내려가다 구름 속에서 끊기듯 사라진다 (vanish)
const GHOST_DOWN: SanPath = { pts: [[8.6, -153], [STAIR_TOP + 0.9 * 14, -153]], yaw: Math.PI / 2, speed: 1.9, vanish: true };
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
// 이산의 마지막 말 동안 바라볼 곳(줄 밖에 선 이산. 결말 글이 얼굴을 가리지 않도록 머리 위를 겨눠 이산이 화면 아래쪽에 오게 한다)과, 그 뒤 다시 바라볼 곳(줄 앞, 성문 너머 대자비)
// 얼굴이 맞은 뒤 시선이 잠깐 내려가는 곳: 장치 아래쪽 분홍 버튼과 나무 레버 사이
const CONTROLS_AT = (() => {
  const v = machinePoint(0, 0.95, 0.22);
  return { x: v.x, y: v.y, z: v.z };
})();
const ACCEPT_LOOK_SAN = { x: -0.9, y: 3.7, z: -104.6 };
const ACCEPT_LOOK_GATE = { x: LINE_SPOT.x, y: 7, z: -150 };
// 수락 직후: 성문 너머 대자비를 올려다본다 / 돌아서서 큰길(줄과 이산이 있는 쪽)을 본다
const ACCEPT_LOOK_UP = { x: 0, y: 11, z: -150 };
const ACCEPT_LOOK_BACK = { x: 0.5, y: 2.2, z: -108 };

// ---------- 남쪽 전망대 가는 길 (zones의 LOOKOUT_PATH) ----------
// 가는 길(OUT)과 돌아오는 길(BACK). BACK은 OUT을 거꾸로 걷는다 (건너는 드론 길 표시도 한 칸씩 옮긴다). 광장에 닿으면 이산은 평소처럼 따라온다
const OUT: RoutePt[] = LOOKOUT_PATH;
const BACK: RoutePt[] = LOOKOUT_PATH.slice(1)
  .map((p, i, a) => ({ x: p.x, z: p.z, hold: p.hold, lane: a[i + 1]?.lane }))
  .reverse();
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
// 시야: 배율 0.65(처음 값), 좌우 ±1.15rad, 위아래 −0.90…0.25 (제안값. 실행해 보지 않았다)
const SCOPE_ZOOM = 0.65;
const SCOPE_CLAMP = { yaw: Math.PI, dy: 1.15, p0: -0.9, p1: 0.25 };
const SCOPE_PITCH = -0.18;
// 방문자가 먼저 본 뒤 이산이 비켜선 자리에서 접안렌즈로 다가간다
const TO_EYE: SanPath = { pts: [[EYE_SPOT[0] + 0.9, EYE_SPOT[1] - 0.6], EYE_SPOT], yaw: 0, speed: 1.3 };
const TO_ASIDE: SanPath = { pts: [[EYE_SPOT[0] + 0.9, EYE_SPOT[1] - 0.6], SAN_ASIDE], yaw: Math.atan2(SCOPE_EYE.x - SAN_ASIDE[0], SCOPE_EYE.z - SAN_ASIDE[1]), speed: 1.3 };
const inBay = (x: number, z: number) => x > BAY.x0 - 0.5 && z > BAY.z0 - 0.5;
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
  const fadeRef = useRef(fade);
  fadeRef.current = fade;
  const [notice, setNotice] = useState<L | null>(null);
  const [ending, setEnding] = useState<Ending>(null);
  // 거부 결말: 화면이 하얗게 멎은 동안
  const [flash, setFlash] = useState(false);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordsChanged, setRecordsChanged] = useState(false);
  const { setTimeout, clearTimeout, setInterval, clearInterval } = useGameTimers();
  useEffect(() => { runtime.setPaused(paused || recordsChanged); }, [paused, recordsChanged]);
  useEffect(() => {
    runtime.reset();
    const suspend = () => {
      resetInput();
      runtime.setPaused(true);
      setPaused(true);
    };
    const visibility = () => { if (document.hidden) suspend(); };
    const storage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (event.key === null || event.key === FORGOT_KEY ||
          (event.key === "sanlee-backup" && event.newValue === null)) {
        suspend();
        setRecordsChanged(true);
      }
    };
    window.addEventListener("storage", storage);
    window.addEventListener("blur", suspend);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", suspend);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
      runtime.reset();
      resetInput();
    };
  }, []);
  // 문을 지나 다른 구역에서 넘어왔는지 (처음 시작·다시 시작이면 false)
  const [arrived, setArrived] = useState(false);
  const [met, setMet] = useState(false);
  // 세 기록을 모두 복원한 뒤, 풀려난 이산과 이야기했는지
  const [talked, setTalked] = useState(false);
  const [since] = useState(() => Date.now());
  // 수락 결말을 본 사람: 다시 오면 방공호가 아니라 줄 속에서 시작한다
  const [accepted, setAccepted] = useState(false);
  // 수락한 뒤 다시 와서, 검문소 앞에 굳은 이산을 풀어 주었는가 (이번 방문 동안만. 그 뒤로는 검문소에 다시 도전한다)
  const [replay, setReplay] = useState(false);
  useEffect(() => {
    route.frozenSan = accepted && zone === "city" && !ending;
  }, [accepted, zone, ending]);
  // 입장 전 쿠키 창: ask → busy(처리 중…) → yes(수락됨) → done
  // 발견한 결말 (거부 결말은 기록을 지우므로 남지 않는다)
  const [found, setFound] = useState<string[]>([]);
  // 이 기기가 기억하는 결말 (결말 모음). 도시의 저장(found)과 따로
  const [memory, setMemory] = useState<Partial<Record<EndKey, number>>>({});
  const [gallery, setGallery] = useState(false);
  // 방공호에서 읽은 쪽지 (이 기기에 모인다. 기록 지우기·처음부터 다시로도 지워지지 않는다)
  const [notesRead, setNotesRead] = useState<number[]>([]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
      if (Array.isArray(v)) setNotesRead(v.filter((x) => Number.isInteger(x) && x >= 0 && x < notes.length));
    } catch {}
  }, []);
  const galleryRef = useRef(false);
  galleryRef.current = gallery;
  const seenCount = Object.keys(memory).length;
  const seenCountRef = useRef(0);
  seenCountRef.current = seenCount;
  // 남쪽 망원경 기록 (이 기기의 실제 값. 검문소가 그대로 읽는다)
  const [scopeData, setScopeData] = useState<ScopeData>(NO_SCOPE);
  // R-07과 친구가 되었는지: 이번 방문(이 페이지) 동안만. 어디에도 저장하지 않는다
  const [friend, setFriend] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  // 게임 화면은 스크롤되지 않는다: 포커스나 브라우저가 overflow: hidden인 화면을 밀어도 곧바로 제자리로 (대화창이 화면 밖으로 밀려나지 않게)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pin = () => {
      if (root.scrollTop || root.scrollLeft) root.scrollTo(0, 0);
    };
    root.addEventListener("scroll", pin);
    return () => root.removeEventListener("scroll", pin);
  }, []);
  const labelEls = useRef<Record<string, HTMLDivElement | null>>({});
  // 기록을 지우고 돌아와 말없이 곁에 앉아 기다린 사람: 이 상태는 어디에도 저장하지 않는다 (기록이 없다는 게 핵심)
  const [ghost, setGhost] = useState(false);
  // 空 결말에서 방문자가 계단 쪽으로 실제로 걸어 나갔는지
  const [stepped, setStepped] = useState(false);
  // 空 결말: 이산이 먼저 내려가 사라져 계단이 열렸는지 (그 전에는 계단 안내를 띄우지 않는다)
  const [stairsOpen, setStairsOpen] = useState(false);
  // 空 결말: 이산이 먼저 계단을 내려가기 시작했는가
  const [sanGoes, setSanGoes] = useState(false);
  const steppedRef = useRef(false);
  // 검문소에서 물러난 적이 있는지 / 물러난 뒤 이산과의 대화를 끝까지 들었는지 / 검문소의 '도시가 저장한 기록 보기'를 연 적이 있는지 (이번 방문 동안만)
  const cpRef = useRef({ seen: false, talked: false });
  const ghostRef = useRef(false);
  ghostRef.current = ghost;
  const endingRef = useRef<Ending>(null);
  endingRef.current = ending;
  // 터미널 셋 → 굳은 이산에게 말 걸기 → 이산 곁의 장치에서 얼굴 맞추기 → 표준 미소 선택. 그래야 이산이 깨어난다
  const [face, setFace] = useState<FaceState>(emptyFace);
  const faceRef = useRef(face);
  faceRef.current = face;
  // 고른 쪽을 장치가 실행하는 연출이 끝나야 깨어난다 (불러온 저장은 바로)
  const [faceAwake, setFaceAwake] = useState(false);
  // 3D 장치가 다시 그리는 단계 (faceRt.phase와 같은 값)
  const [facePhase, setFacePhaseView] = useState<FacePhase>("locked");
  const faceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const restored = sections.every((section) => visited.includes(section.id));
  const complete = (restored && faceAwake) || ghost;
  // 진행 단계는 이 값 하나로 정한다. 목표 문구·화살표·미니맵·검문소·재시작 자리·이산의 길이 모두 이 값을 따른다.
  // 큰길은 어느 단계에서든 걸어 들어갈 수 있다 (막는 천막이 없다). 망원경 전에 검문소에서 멈추는 것은 도시의 금지가 아니라 이야기의 순서다
  const phase: RoutePhase = ghost ? "descent" : !complete ? "restore" : !talked ? "talk" : !scopeData.seen ? "scope" : !scopeData.agreed ? "decide" : "descent";
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => {
    route.phase = phase;
  }, [phase]);
  // 망원경을 함께 보기 전에는 큰길이 홀로그램 차단막으로 막힌다 (줄에서 다시 시작한 방문자와 결말 중에는 막지 않는다)
  const avenueLocked = phase === "scope" && !accepted && !ending;
  useEffect(() => {
    route.avenueLocked = avenueLocked;
  }, [avenueLocked]);

  // 로그아웃: 화면이 오래된 모니터처럼 한 줄로 접혀 꺼지고, 웹사이트에서는 지워졌던 글자가 다시 쓰인다
  const router = useRouter();
  const leaveTimer = useRef<number | undefined>(undefined);
  const ownedFullscreen = useRef(false);
  useEffect(() => () => {
    window.clearTimeout(leaveTimer.current);
    if (ownedFullscreen.current && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);
  const [leaving, setLeaving] = useState(false);
  const logout = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (leaving) return;
    try {
      sessionStorage.setItem(RESTORE_KEY, "1");
      // 이산의 부탁을 들은 뒤 나간다면: 웹사이트에서 맨 아래(꼬리말의 delete seoul)로 내려가 보도록 한 번 안내한다 (ForgetCity)
      if (localStorage.getItem(PROMISE_KEY) === "2") sessionStorage.setItem(FORGET_HINT_KEY, "1");
    } catch {}
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push("/");
    setLeaving(true);
    sfx.glitch();
    // Leaving must also work from a paused game; this is UI time, not game time.
    leaveTimer.current = window.setTimeout(() => router.push("/"), 1100);
  };

  // 배경음악: 방공호, 지상, 대자비 구역(처음 시선 구역에 들어선 뒤부터), 결말
  const [jabiStage, setJabiStage] = useState(false);
  // 방공호로 돌아가면 다시 지상 음악부터 (시선 구역은 도시에 다시 올라왔을 때 새로 들어선다)
  const endShown = !!ending && ending.step >= (checkpoint[ending.kind] as Beat[]).length;
  // 결말 곡은 결말마다 하나 (수락·거부·空). 고르는 순간 음악을 끊지도, 곧바로 결말 곡을 틀지도 않는다:
  // 듣던 지상 곡이 결말의 처음 몇 줄을 받쳐 주다가, 이야기가 꺾이는 줄에서 결말 곡으로 겹쳐 넘어간다 (곡 파일은 결말이 시작될 때 미리 받아 둔다).
  // 수락: 이산의 마지막 말("결국 이렇게 되는구나.")에서. 거부: 장면이 방공호로 넘어가는 순간(두 번째 정지 시민)에서.
  // 기록을 지우고 돌아와 이산과 재회한 뒤의 지상은 올라서자마자 f-ALL이 아주 작게 시작해 서서히 커지고, 空 결말도 그 곡을 끝까지 잇는다
  const endTrack: Track | null = ending ? (ending.kind === "accept" ? "accept" : ending.kind === "reject" ? "reject" : "fall") : null;
  // 수락: 돌아서서 이산의 말("…그래.")을 듣는 줄부터 결말 곡이 겹쳐 들어와 줄까지 걷는 길을 받친다 (예전엔 이산의 마지막 말에서야 들어왔다)
  // 결말 곡이 들어오는 줄. 수락: 줄의 빈자리에 다 들어서서 돌아보면 이산이 굳어 가는 순간("결국 이렇게 되는구나").
  // 줄까지 걸어가는 동안은 도시(대자비)의 곡이 그대로 흐른다: 등록·정지 처분 방송까지가 도시의 시간이고, 결말 곡은 남겨진 둘의 시간이다
  const END_CUE: Record<EndKind, number> = { accept: ACCEPT_SAY, reject: REJECT_BUNKER, ghost: 0 };
  const cityTrack: Track = jabiStage ? "jabi" : "ground";
  // 거부 결말: 화면이 하얗게 멎는 순간 듣던 곡도 짧게 끊긴다(정지). 방공호로 넘어가면 결말 곡이 천천히 들어온다
  const frozenQuiet = ending?.kind === "reject" && flash;
  const track: Track | null =
    leaving
      ? null
      : gallery
        ? "empty"
      : intro
        ? seenCount === 3 ? "empty" : null
      : ending
        ? ending.step >= END_CUE[ending.kind] ? endTrack : frozenQuiet ? null : zone === "city" ? cityTrack : null
        : zone === "city" && ghost ? "fall" : zone === "bunker" ? "bunker" : cityTrack;
  useEffect(() => {
    if (endTrack) preloadBgm(endTrack);
  }, [endTrack]);
  useEffect(() => {
    // 결말 곡으로 넘어갈 때는 듣던 곡을 길게 줄이며 겹친다 (결말 곡도 천천히 들어온다: bgm FADE_IN)
    playBgm(track, track && ["accept", "reject"].includes(track) ? 5 : frozenQuiet ? 0.5 : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);
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
      walkArea.floor = null;
      sanHold.at = null;
      gaze.gateOpen = false;
      gaze.mood = "";
      gaze.still = false;
    gaze.sit = false;
      gaze.zoom = 1;
      gaze.clamp = null;
      gaze.lookAt = null;
      route.phase = "restore";
      resetDrones();
      resetFaceRuntime();
      resetGaze();
      restoreCovers();
      gaze.intro = false;
      route.frozenSan = false;
      route.avenueLocked = false;
      sanWalk.path = null;
      sanWalk.arrived = false;
      teleport.req = null;
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
      setFound(uniqueIds(f, ["accept", "reject", "ghost"]));
      // 결말 모음이 생기기 전에 본 수락 결말도 기억으로 옮긴다
      setMemory(Array.isArray(f) && f.includes("accept") ? remember("accept") : readMemory());
    } catch {}
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      setVisited(uniqueIds(v, sections.map((s) => s.id)));
    } catch {}
    setScopeData(readScope());
    resetFaceRuntime();
    const f = loadFace();
    setFace(f);
    setFaceAwake(faceFinished(f));
  }, []);

  // 지금 잡힌 상호작용 대상을 장치에 알려 준다 (분홍 버튼·나무 레버 강조)
  useEffect(() => {
    faceRt.focus = near?.id ?? null;
  }, [near]);
  const toFacePhase = useCallback((p: FacePhase) => {
    setFacePhase(p);
    setFacePhaseView(p);
  }, []);
  const faceLater = (ms: number, fn: () => void) => faceTimers.current.push(setTimeout(fn, ms));
  const clearFaceTimers = () => {
    faceTimers.current.forEach(clearTimeout);
    faceTimers.current = [];
  };
  // 장치의 연출 단계는 진행 상태를 따른다 (잠김·도시의 끼어듦·실행 연출 도중에는 그대로 둔다)
  useEffect(() => {
    faceRt.drums = face.drums;
    faceRt.method = face.method;
    if (faceRt.phase === "restored" || faceRt.phase === "twist" || faceRt.phase === "applying") return;
    const want: FacePhase = faceAwake ? "done" : restored && !ghost && face.asked ? (face.solved ? "choice" : "idle") : "locked";
    if (faceRt.phase !== want) toFacePhase(want);
  }, [face, faceAwake, restored, ghost, toFacePhase]);
  useEffect(() => () => faceTimers.current.forEach(clearTimeout), []);

  const updateFace = (f: FaceState) => {
    faceRef.current = f;
    faceRt.drums = f.drums;
    faceRt.method = f.method;
    setFace(f);
    saveFace(f);
  };
  const resetFace = () => {
    clearFaceTimers();
    const f = emptyFace();
    faceRef.current = f;
    faceRt.method = null;
    setFace(f);
    setFaceAwake(false);
    faceRt.wokeAt = 0;
    toFacePhase("locked");
  };

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
          // 기록을 지우고 돌아왔지만 재회 대신 터미널을 연 사람: 평범한 추적 경로로 돌아간다 (접속·만남 기록이 다시 생긴다)
          if (localStorage.getItem(FORGOT_KEY) !== null) {
            localStorage.removeItem(FORGOT_KEY);
            localStorage.setItem(LOGIN_KEY, String(Date.now()));
            localStorage.setItem(MET_KEY, "1");
          }
        } catch {}
        showToast(`${t(ui.restored)} · ${next.length}/${sections.length}`);
        return next;
      });
    },
    [showToast, t]
  );

  const transitionTimers = useRef<number[]>([]);
  const goTo = useCallback((to: Zone, viaDoor = true) => {
    transitionTimers.current.forEach(clearTimeout);
    transitionTimers.current = [];
    const later = (ms: number, run: () => void) => transitionTimers.current.push(setTimeout(run, ms));
    cancelIntro.current?.();
    gaze.intro = false;
    gaze.lookAt = null;
    setPanel(null);
    setFade(to === "city" ? "up" : "down");
    if (viaDoor) sfx.door();
    later(900, () => {
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
        else if (viaDoor) later(700, () => saveBackup(CITY.spawn.pos[0], CITY.spawn.pos[2]));
      }
      // 새 구역의 셰이더·그림이 다 준비된 뒤에 화면을 연다 (World의 Warm). 그 전에 열면 들어서자마자 몇 초씩 멈춘다. 길어도 8초
      const opened = performance.now();
      const open = () => {
        if (warm.ready || performance.now() - opened > 8000) setFade(null);
        else later(120, open);
      };
      later(500, open);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검문소에서 물러난 뒤의 이산 대화. 마지막 줄은 '그래도 다시 와 줄래?'라는 부탁 (꼬리말 조건)
  const afterCheckpointPanel = (): Panel => ({
    kind: "dialog",
    name: SAN,
    lines: [...sanAfterCheckpoint.lines, sanAfterCheckpoint.memory],
    step: 0,
    logout: true,
  });

  // ---------- 남쪽 전망대의 망원경 장면 ----------
  // idle → offer(방문자가 먼저 들여다본다. 이산은 옆에 비켜서 기다린다: scopeMove) →
  // ask(눈을 떼면 이산이 말없이 접안렌즈로 걸어간다) → looking(도착하고 잠깐 뒤 첫 말) →
  // after(이산이 눈을 떼고 묻는다. 대화 끝에 결정) → done.
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
    gaze.sit = false;
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
  // 눈을 뗀 뒤의 대화와 결정. 처음에는 전부(네 페이지 + 부탁), 결정을 미뤘다면 부탁 한 페이지만
  // 함께 가기로 하면 이산은 돌아오는 길의 첫 자리(전망대)에서 다시 걷는다. 더 머물기로 하면 전망대에서 기다린다 (경유점 제어가 맡는다)
  const agree = () => {
    heardRef.current = true;
    if (!ghostRef.current) writeScope({ ...readScope(), seen: true, agreed: true });
    if (scopeRef.current.stage === "after") resetRoute(BACK, 0);
    setScopeStage("done");
    closePanelRef.current();
    say(sanCue.agree, 4000);
  };
  const later = () => {
    heardRef.current = true;
    resetRoute();
    setScopeStage("done");
    closePanelRef.current();
    say(sanCue.later, 2600);
  };
  // 망원경 뒤의 대화: "방금 본 건 내 기억이야." 다음에 얼굴(표준 미소 / 원본)에 따라 한 줄이 끼어든다
  const afterLines = (): Line[] => {
    const m = faceRef.current.method;
    if (!m || ghostRef.current) return scopeScene.after;
    return [...scopeScene.after.slice(0, 3), faceTalk.scope[m], ...scopeScene.after.slice(3)];
  };
  const afterPanel = (): Panel => {
    const full = !heardRef.current;
    const lines = full ? [...afterLines(), ...scopeScene.decide] : scopeScene.decide;
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
  // 방문자가 먼저 들여다본다. 이산은 어디에 있든 망원경 옆 비켜선 자리로 가서 기다린다 (방문자를 기다리게 하지 않는다)
  const startScene = () => {
    sanHold.at = null;
    scopeRef.current = { stage: "offer", step: 0, at: 0 };
    setScopeStageState("offer");
    startScopeView();
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
    sfx.scopeOut();
    gaze.zoom = 1;
    gaze.clamp = null;
    if (m.back) walkPath([m.back]);
    else stopWalk();
  };
  const exitScopeRef = useRef(exitScopeView);
  exitScopeRef.current = exitScopeView;
  const scopeBusy = () => scopeMove.current.mode === "in" || scopeMove.current.mode === "view";

  // ---------- 기록을 지우고 돌아온 방문자와의 재회 ----------
  // 방문자는 세 구절 중 하나를 들려준다 (검문소 뒤 이산이 들려준 구절이 정답). 맞으면 이산이 묻고,
  // '곁에 앉아 기다린다'를 고르면 화면이 잠깐 가라앉은 채 실제로 기다린 뒤(약 3초) 이산이 일어난다 (Bunker의 awake).
  // 기기는 그 일을 모른다: 기억하는 사람만 고른다
  const [beat, setBeat] = useState<"" | "sit">("");
  const beatTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(beatTimer.current), []);
  // 풀려난 이산을 따라가던 시선: 첫 대화가 닫히면 방문자에게 돌려준다
  const riseLook = useRef(false);
  useEffect(() => {
    if (panel || !riseLook.current) return;
    riseLook.current = false;
    gaze.lookAt = null;
  }, [panel]);
  const sitBeside = () => {
    setPanel(null);
    setBeat("sit");
    gaze.still = true;
    clearTimeout(beatTimer.current);
    beatTimer.current = setTimeout(() => {
      // 기억으로 깨어난다: 방금 남은 '만남' 기록이 있다면 그것마저 지운다. 이 상태는 어디에도 저장하지 않는다
      try {
        localStorage.removeItem(MET_KEY);
      } catch {}
      sfx.restore();
      // 풀려난 이산이 받침대에서 몸을 펴고 내려온다. 시선은 빈 받침대에 두지 않고 내려오는 이산을 따라간다
      sanRise.on = true;
      const at = BUNKER.items.find((i) => i.id === "statue")!.pos;
      gaze.lookAt = at;
      setGhost(true);
      setTalked(true);
      setBeat("");
      // 다 내려선 뒤에 첫마디가 열린다 (느린 기기에서도 장면이 끝나기 전에 대화가 뜨지 않게, 시간 대신 장면이 끝났다는 신호를 기다린다)
      const speak = () => {
        window.removeEventListener("sanlee-rise-done", speak);
        clearTimeout(beatTimer.current);
        gaze.still = false;
        riseLook.current = true;
        setPanel({ kind: "dialog", name: SAN, lines: reunion.woke, step: 0 });
      };
      window.addEventListener("sanlee-rise-done", speak);
      beatTimer.current = setTimeout(speak, 9000);
    }, 3000);
  };
  // 검문소 직전의 마지막 엄폐물 뒤: 이산 곁에 잠깐 앉는다. 게이지도 목표도 없는 몇 초
  const sitByCover = () => {
    setPanel(null);
    setBeat("sit");
    gaze.still = true;
    gaze.sit = true;
    tally.sat = true;
    clearTimeout(beatTimer.current);
    beatTimer.current = setTimeout(() => {
      gaze.sit = false;
      beatTimer.current = setTimeout(() => {
        setBeat("");
        gaze.still = false;
        lock();
        sayRef.current(sanCue.sitAfter, 4200);
      }, 900);
    }, 6000);
  };
  const sitCoverRef = useRef(sitByCover);
  sitCoverRef.current = sitByCover;
  const sitRef = useRef(sitBeside);
  sitRef.current = sitBeside;
  // 구절을 들려준다: 이산이 부탁한 구절이면 이산이 묻고, 아니면 모르는 구절이라고 한다 (다시 말을 걸면 또 고를 수 있다)
  const tellVerse = (right: boolean) => {
    if (right) setPanel({ kind: "dialog", name: SAN, lines: [reunion.asked], step: 0, choices: [{ at: 0, label: reunion.sit, go: sitBeside }] });
    else setPanel({ kind: "dialog", name: SAN, lines: [reunion.wrong], step: 0 });
  };
  // R-07: 소개 뒤 친구를 묻는다. 친구는 이번 방문 동안만 기억하고, 아무것도 열거나 바꾸지 않는다.
  // 방문자는 말하지 않는다: 고개를 끄덕이거나, 손을 흔들고 돌아서거나, (기록을 지우고 돌아온 사람은) 실제로 두 번 두드린다
  const r07Panel = (): Panel => {
    tally.r07++;
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
    if (forgot)
      choices.unshift({
        at: 0,
        label: r07Friend.you,
        go: () => {
          sfx.knock();
          befriend([r07Friend.answer]);
        },
      });
    // 이산이 깨어난 뒤에는 첫 줄만 바뀐다 (청소한 받침대 이야기)
    const fm = faceRef.current.method;
    const first = complete && !ghost && fm && n.face ? n.face[fm] : complete ? n.after : undefined;
    const echo = seenCountRef.current > 0 && !complete && !ghost && !forgot ? echoLines.r07 : undefined;
    const lines = first ? [...first, ...n.lines.slice(1)] : echo ? [n.lines[0], echo, ...n.lines.slice(1)] : n.lines;
    choices.forEach((c) => {
      if (c.at > 0) c.at = lines.length - 1;
    });
    return { kind: "dialog", name: n.name, lines, step: 0, choices };
  };

  // 얼굴 복원 장치의 원통 하나를 한 칸 돌린다. 세 부분이 다 맞으면 장치가 잠기고, 도시가 표준 미소를 내민다
  const turnDrum = (i: number) => {
    if (faceRt.phase !== "idle" || endingRef.current) return;
    const prev = faceRef.current;
    const next = rotateDrum(prev, i);
    if (next === prev) return;
    updateFace(next);
    sfx.ratchet();
    if (([0, 1] as const).some((k) => !seamJoined(prev.drums, k) && seamJoined(next.drums, k))) setTimeout(() => sfx.seam(), 300);
    if (!next.solved) return;
    // 잠김 → 장치의 말 → 도시의 끼어듦 → 두 조작부
    toFacePhase("restored");
    faceLater(450, () => sfx.faceLock());
    speak([{ who: faceUi.machine, line: faceUi.restored, ms: 2600 }]);
    faceLater(2600, () => {
      toFacePhase("twist");
      sfx.cityVoice();
      // 도시가 분홍 버튼을, 낡은 장치가 나무 레버를 가리키는 동안 시선이 아래쪽 조작부로 내려간다 (얼굴을 올려다보던 눈을 데려간다)
      speak([
        { who: faceUi.city, line: faceUi.smileMissing, ms: 2800 },
        { who: faceUi.city, line: faceUi.offerStandard, ms: 3600 },
        { who: faceUi.machine, line: faceUi.offerKeep, ms: 3600 },
      ]);
      faceLater(2800, () => {
        toFacePhase("choice");
        // 두 조작부를 화면 가운데에 (세로 화면에서 위로 치우쳐 아래 절반이 바닥만 보이던 문제)
        gaze.lookAt = { ...CONTROLS_AT, center: true };
      });
      faceLater(5600, () => {
        if (gaze.lookAt && gaze.lookAt.x === CONTROLS_AT.x && gaze.lookAt.z === CONTROLS_AT.z) gaze.lookAt = null;
      });
    });
  };
  // 표준 미소 적용(분홍 버튼) 또는 원본 얼굴 보존(나무 레버). 어느 쪽이든 이산이 깨어난다
  // 세로 화면: 장치 앞에서 고르는 동안 시야를 넓혀 분홍 버튼·나무 레버와 두 이름표가 화면 안에 다 들어오게 한다
  const faceWide = useRef(false);
  // 첫 쿠키 안내(저장 알림)가 떠 있는 동안에는 이산의 분필 안내를 미룬다 (같은 자리에 겹친다). 안내가 없으면 곧바로 말한다
  const cookieUntil = useRef(0);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { kind?: string; n?: number } | string;
      if (typeof d === "object" && d.kind === "save" && d.n === 1) cookieUntil.current = performance.now() + 6900;
    };
    window.addEventListener("sanlee-backup", on);
    return () => window.removeEventListener("sanlee-backup", on);
  }, []);
  useEffect(() => {
    const portrait = typeof window !== "undefined" && window.innerWidth < window.innerHeight * 0.8;
    const want = portrait && facePhase === "choice" && !!near?.id.startsWith("face");
    if (want === faceWide.current) return;
    faceWide.current = want;
    gaze.zoom = want ? 1.28 : 1;
  }, [facePhase, near]);
  const chooseFace = (method: FaceMethod) => {
    if (faceRt.phase !== "choice" || endingRef.current) return;
    updateFace({ ...faceRef.current, method });
    toFacePhase("applying");
    if (method === "standard") sfx.press();
    else sfx.lever();
    speak([{ who: method === "standard" ? faceUi.city : faceUi.machine, line: faceUi[method], ms: 2600 }]);
    faceLater(2600, () => {
      toFacePhase("done");
      sfx.restore();
      setFaceAwake(true);
      showNotice(ui.exitTalk);
    });
  };
  const faceAct = (id: string) => {
    if (id === "face-std") chooseFace("standard");
    else if (id === "face-keep") chooseFace("exception");
    else turnDrum(faceRt.aim);
  };
  const faceActRef = useRef(faceAct);
  faceActRef.current = faceAct;

  // 줄에서 다시 시작한 방문자가 굳은 이산을 풀어 준다: 곧바로 승강장 단계(descent)로, 검문소에 다시 도전한다
  const thaw = () => {
    closePanelRef.current();
    sfx.restore();
    writeScope({ ...readScope(), seen: true, agreed: true });
    setTalked(true);
    try {
      localStorage.setItem(TALK_KEY, "1");
      // 대자비 재가동: 소개 팝업은 다시 띄우지 않는다 (곡만 바뀐다)
      sessionStorage.setItem("sanlee-jabi-intro", "1");
    } catch {}
    // 이미 끝낸 길이다: 예전 버전의 저장(표준 미소 선택이 없는 얼굴, 빠진 열람 기록)이 검문소를 막지 않게 채운다
    if (visited.length < sections.length) {
      const all = sections.map((x) => x.id);
      setVisited(all);
      try {
        localStorage.setItem(KEY, JSON.stringify(all));
      } catch {}
    }
    const f = faceRef.current;
    if (!faceFinished(f)) updateFace({ drums: [...SOLUTION] as Drums, solved: true, method: f.method ?? "exception", asked: true });
    setFaceAwake(true);
    setReplay(true);
    setAccepted(false);
    gaze.mood = "";
    sanHold.at = null;
    setTimeout(() => say(replayUi.woke, 3600), 600);
  };
  const thawRef = useRef(thaw);
  thawRef.current = thaw;

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
        case "note": {
          const i = it.note!;
          const next = notesRead.includes(i) ? notesRead : [...notesRead, i];
          if (next !== notesRead) {
            setNotesRead(next);
            try {
              localStorage.setItem(NOTES_KEY, JSON.stringify(next));
            } catch {}
          }
          const head = { ...notesUi.title, ko: notesUi.title.ko.replace("{n}", String(next.length)), en: notesUi.title.en.replace("{n}", String(next.length)) };
          const lines: Line[] = [notes[i]];
          if (next !== notesRead && next.length === notes.length) lines.push({ ...notesUi.all, who: "narr" });
          setPanel({ kind: "dialog", name: head, lines, step: 0 });
          break;
        }
        case "painting":
          // 여러 점을 맡은 칸: 다음 그림으로 넘긴다
          flipPainting(it.work!);
          sfx.page();
          break;
        case "face":
          // PC: 바라보는 원통 / 휴대폰: 상호작용 버튼은 마지막으로 바라본 원통 (원통을 직접 누를 수도 있다)
          faceActRef.current(it.id);
          break;
        case "statue":
          // 수락한 뒤 다시 온 방문자: 줄 밖에 굳은 이산. 기록을 다시 열어 보이면 풀려난다
          if (it.id === "frozen-san") {
            setPanel({
              kind: "dialog",
              name: plaque[0],
              lines: replayUi.frozen,
              step: 0,
              plaque: true,
              choices: [
                { at: 0, label: replayUi.thaw, go: () => thawRef.current() },
                { at: 0, label: replayUi.leave, go: () => closePanelRef.current() },
              ],
            });
            break;
          }
          // 기억으로 깨어난 이산은 짧게만 말한다
          if (it.id === "san" && ghost) setPanel({ kind: "dialog", name: SAN, lines: [reunion.awakeLine], step: 0 });
          // 망원경 장면 도중: 이산은 하던 일을 계속한다 (비켜선 뒤에는 같은 말을 한 번 더). 눈을 뗀 뒤의 대화는 그 줄부터 다시
          else if (it.id === "san" && scopeRef.current.stage === "offer") say(scopeScene.ask, 2600);
          else if (it.id === "san" && scopeRef.current.stage === "after") setPanel(afterPanel());
          else if (it.id === "san" && (scopeRef.current.stage === "ask" || scopeRef.current.stage === "looking")) break;
          // 검문소 뒤: 대화를 다 들었으면 짧게 되짚기만, 물러났지만 끝까지 못 들었으면 그 대화를 다시
          else if (it.id === "san" && cpRef.current.talked) setPanel({ kind: "dialog", name: SAN, lines: sanReview, step: 0, logout: true });
          else if (it.id === "san" && cpRef.current.seen) setPanel(afterCheckpointPanel());
          // 전망대에서 이산에게 말을 걸면 먼저 보라고 권한다 / 결정을 미뤘다면 결정으로
          else if (it.id === "san" && phase === "scope" && inBay(player.pos.x, player.pos.z) && scopeRef.current.stage === "idle") say(scopeScene.ask, 2600);
          else if (it.id === "san" && phase === "decide") setPanel(afterPanel());
          else if (it.id === "san") {
            const base = phase === "scope" ? sanCity.scope : sanCity.descent;
            setPanel({ kind: "dialog", name: SAN, lines: getBackup().deaths > 0 ? [...base, sanAfterDeath] : base, step: 0 });
          } else if (ghost) setPanel({ kind: "dialog", name: SAN, lines: [reunion.awakeLine], step: 0 });
          // 기록은 다 열었지만 얼굴을 아직 맞추지 않았다: 이산은 굳어 있고, 곁의 장치를 가리킨다
          // 기록은 다 열었지만 아직 얼굴이 굳어 있다: 처음 말을 걸면 이산이 곁의 장치를 부탁하고, 그 뒤로는 장치를 가리킨다
          else if (restored && !complete) {
            if (!faceRef.current.asked) {
              setPanel({ kind: "dialog", name: plaque[0], lines: faceUi.ask, step: 0, plaque: true });
              updateFace({ ...faceRef.current, asked: true });
            } else setPanel({ kind: "dialog", name: plaque[0], lines: [{ ...faceUi.frozen, who: "narr" }], step: 0, plaque: true });
          }
          else if (complete) {
            // 얼굴 맞추기에서 고른 것에 따라 가벼운 말 한 줄이 끼어든다 (표준 미소면 의구심 줄도 그 얼굴에 맞게)
            const [first, doubt, ...rest] = statueLines[statueLines.length - 1];
            const m = faceRef.current.method;
            // 가장 먼저 연 기록에 따라 한 줄 (도시도 이 순서를 적어 두었다: 검문소의 기록)
            const opened = sanCue.first[visited[0]];
            const head = opened ? [first, opened] : [first];
            const lines = m === "standard" ? [...head, faceTalk.standard.joke, faceTalk.standard.doubt, ...rest] : m === "exception" ? [...head, faceTalk.exception.joke, doubt, ...rest] : [...head, doubt, ...rest];
            setPanel({ kind: "dialog", name: SAN, lines, step: 0 });
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
            // 기록을 지우고 온 사람에게 이산은 처음 보는 사람처럼 짧게 답한다. 마지막 줄에서 방문자는 세 구절 중 하나를 들려준다
            setPanel({
              kind: "dialog",
              name: plaque[0],
              lines: blank ? statueForgot : statueLines[Math.min(visited.length, statueLines.length - 2)],
              step: 0,
              plaque: true,
              choices: blank ? reunion.verses.map((v) => ({ at: statueForgot.length - 1, label: v, go: () => tellVerse(v.right) })) : undefined,
            });
            setMet(true);
            // 기록을 지우고 온 사람에게는 '만남' 기록도 새로 남기지 않는다 (터미널을 열어 평범한 길로 돌아가면 그때 남는다: markVisited)
            if (!blank)
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
            // 망원경 단계: 방문자가 먼저 본다 (이산은 곁에서 비켜서 기다리다가, 방문자가 눈을 떼면 따라 본다)
            else startScene();
            break;
          }
          const n = npcs[it.npc!];
          // 순찰 기계: 저장된 방문 기록이 없는 방문자에게는 '기록됩니다' 대신 조회 실패 두 줄
          if (ghost && (it.npc === "patrol" || it.npc === "patrol2")) {
            setPanel({ kind: "dialog", name: n.name, lines: patrolNoRecord, step: 0 });
            break;
          }
          // 진행에 따라 말이 바뀐다: 기억으로 깨어난 이산과 함께 / 아래로 가기로 한 뒤 / 이산이 깨어난 뒤 / 처음
          const fm = faceRef.current.method;
          const byPhase = accepted && n.queued ? n.queued : ghost && n.ghost ? n.ghost : phase === "descent" && n.descent ? n.descent : complete && n.after ? n.after : n.lines;
          // 이산이 깨어난 뒤에는 첫마디 다음에 얼굴 맞추기에서 고른 것에 대한 한마디가 붙는다 (기억으로 깨어난 길에서는 고른 적이 없다)
          const at = n.faceAt ?? 1;
          const faced = complete && !ghost && fm && n.face ? [...byPhase.slice(0, at), ...n.face[fm], ...byPhase.slice(at)] : byPhase;
          // 결말을 본 적 있는 기기로 다시 왔다면, 이산이 깨어나기 전에는 첫마디 다음에 기억하는 듯한 한 줄
          const echo = seenCountRef.current > 0 && !complete && !ghost ? echoLines[it.npc!] : undefined;
          const base = echo ? [faced[0], echo, ...faced.slice(1)] : faced;
          // 한 번이라도 보관 처리됐다면 관리인은 알아본다
          const bk = getBackup();
          const lines = it.npc === "keeper" && bk.deaths > 0 ? [keeperAfterDeath, ...base] : base;
          // 작은 행동: 할머니의 국물(이산과 함께일 때), D-12의 송장
          const extra =
            it.npc === "grandma" && sanWithYouRef.current && !metRef.current.broth
              ? [
                  {
                    at: lines.length - 1,
                    label: grandmaBroth.take,
                    go: () => {
                      metRef.current.broth = true;
                      closePanelRef.current();
                      speak([
                        { who: n.name, line: grandmaBroth.gran, ms: 3000 },
                        { who: SAN, line: grandmaBroth.san, ms: 3800 },
                      ]);
                    },
                  },
                  { at: lines.length - 1, label: grandmaBroth.pass, go: () => closePanelRef.current() },
                ]
              : it.npc === "courier" && !ghost
                ? [{ at: lines.length - 1, label: courierWaybill.look, go: () => setPanel({ kind: "dialog", name: n.name, lines: [courierWaybill.line], step: 0 }) }]
                : undefined;
          setPanel({ kind: "dialog", name: n.name, lines, step: 0, link: n.link, choices: extra });
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
              lines: complete ? [ui.exitLocked[0], ui.exitTalk] : restored ? [ui.exitLocked[0], faceUi.frozen] : ui.exitLocked.map((l) => ({ ko: l.ko.replace("{n}", String(visited.length)), en: l.en.replace("{n}", String(visited.length)) })),
              step: 0,
            });
            break;
          }
          goTo(it.to!);
          break;
        case "checkpoint":
          // 이야기의 순서: 함께 망원경을 보고 승강장으로 가기로 한 뒤에만 등록 창이 뜬다 (도시가 망원경을 아는 것이 아니다).
          // 그 전에는 곁에 있는 이산의 부탁으로 멈춘다. 이산이 들리지 않는 곳에 있으면 중립적인 길 안내만 (이산을 순간 이동시키지 않는다)
          if (ghost) {
            sfx.ghost();
            startEndingRef.current("ghost");
          } else if (phase === "descent") setPanel({ kind: "choice" });
          else if (complete) {
            const sp = sanPos();
            if (Math.hypot(sp.x - player.pos.x, sp.z - player.pos.z) > 8) showNotice(ui.findSan);
            else if (phase === "decide") setPanel({ kind: "dialog", name: SAN, lines: checkpoint.lockedDecide, step: 0, choices: [{ at: 0, label: scopeScene.go, go: agree }] });
            else setPanel({ kind: "dialog", name: SAN, lines: checkpoint.lockedScope, step: 0 });
          } else
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
    [complete, restored, talked, goTo, markVisited, visited.length, met, ghost, found.length, phase, accepted, friend, notesRead]
  );

  const startEndingRef = useRef<(k: EndKind) => void>(() => {});

  // 3D 물체를 직접 탭한 경우: 너무 멀면 무시
  const onTap = useCallback(
    (id: string) => {
      // PC에서는 클릭이 마우스 잠금·상호작용(E)으로 쓰이므로 물체 직접 탭은 터치 화면에서만
      if (!touch || panel || intro || fade || ending || paused || beat) return;
      // 얼굴 복원 장치의 원통: 장치 가까이에서 맞추는 동안만
      if (id.startsWith("face-")) {
        const m = ZONES.bunker.items.find((i) => i.id === "face-machine")!;
        if (zone !== "bunker" || Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z) > 4) return;
        if (id.startsWith("face-drum-")) faceRt.aim = Number(id.slice(10));
        faceActRef.current(id);
        return;
      }
      const it = ZONES[zone].items.find((i) => i.id === id);
      if (!it) return;
      const d = Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z);
      if (d > 10) return;
      interact(it);
    },
    [touch, panel, intro, fade, ending, paused, beat, zone, interact]
  );

  // 테스트용: 주소 끝에 ?debug 를 붙이면 콘솔에서 이동·복원을 조작할 수 있다
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("debug")) return;
    (window as unknown as Record<string, unknown>).__neo = {
      goTo,
      tp: (x: number, z: number, yaw = 0) => (teleport.req = { x, z, yaw }),
      restore: () => setVisited(sections.map((s) => s.id)),
      face: (id = "face-machine") => faceActRef.current(id),
      pos: () => [player.pos.x, player.pos.z, player.yaw, player.air, player.pitch],
      san: () => { const p = CITY.items.find((i) => i.id === "san")!.pos; return [p.x, p.z]; },
      input,
      look: (pitch: number) => (input.look.pitch += pitch),
      gaze,
      sanWalk,
      end: (k: EndKind) => startEndingRef.current(k),
      thaw: () => thawRef.current(),
      sit: () => sitRef.current(),
      cp: () => setPanel({ kind: "choice" }),
      tally,
    };
  }, [goTo]);

  // 空 결말의 마지막 걸음 동안만 결말 중에도 평소 조작(이동·시점·조이스틱)을 돌려준다
  const walkable = ending?.kind === "ghost" && (ending.step === GHOST_WALK || ending.step === GHOST_STEP) && !stepped;
  // 재회의 몸짓과 기다림 동안에도 조작을 멈춘다 (대화창은 닫혀 있다)
  const active = !intro && !panel && !fade && (!ending || walkable) && !paused && !recordsChanged && !beat;
  const activeRef = useRef(active);
  activeRef.current = active;
  // 설정창을 닫았을 때 곧바로 조작이 돌아오는지 (결말 연출·대화 중이면 마우스를 잠그지 않는다)
  const playableRef = useRef(false);
  playableRef.current = !intro && !panel && !fade && (!ending || walkable) && !recordsChanged && !beat;
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
    tally.withdraw++;
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
    if (playableRef.current) lock();
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
  // 대화 페이지의 정적(line.pause): 그 시간 동안은 글을 감추고 넘기지 못한다. 망원경 뒤의 대화에서는 둘이 함께 구름 아래를 내려다본다
  const [hush, setHush] = useState(false);
  const hushRef = useRef(false);
  hushRef.current = hush;
  const hushLine = panel?.kind === "dialog" ? panel.lines[Math.min(panel.step, panel.lines.length - 1)] : null;
  const hushAfter = panel?.kind === "dialog" && panel.scene === "after";
  useEffect(() => {
    const ms = hushLine?.pause;
    if (!ms) {
      setHush(false);
      return;
    }
    // 시선은 움직이지 않는다 (함께 내려다볼지는 방문자가 정한다)
    setHush(true);
    const tm = setTimeout(() => setHush(false), ms);
    return () => clearTimeout(tm);
  }, [hushLine]);
  // 음악을 잠시 낮추는 때: 설정창, 곁에 앉아 기다리는 재회의 정적(거의 들리지 않게), 망원경 뒤 함께 내려다보는 정적, 망원경을 들여다보는 동안
  const duckLevel = paused ? 0.45 : beat === "sit" ? 0.12 : hush ? 0.35 : scopeView === "view" ? 0.55 : 1;
  // 구역의 바탕 소리 (환기구·바람). 하얗게 멎은 순간과 신호가 끊긴 뒤에는 아무 소리도 없다. 空 결말의 계단에서는 내려갈수록 잦아든다(아래 효과)
  const ambKind = intro || leaving || (ending?.kind === "reject" && flash) || stepped ? null : zone;
  const ambLevel = paused ? 0.3 : beat === "sit" ? 0.4 : panel ? 0.7 : 1;
  useEffect(() => {
    if (ending?.kind === "ghost" && ending.step >= GHOST_STEP && ambKind) return;
    ambience(ambKind, ambLevel);
  }, [ambKind, ambLevel, ending]);
  useEffect(() => () => ambience(null), []);
  // 로봇에게 다가가면 먼저 짧게 삑삑댄다 (말을 걸기 전, 알아봤다는 듯이). 로봇이 있는 쪽에서 들린다
  const nearNpc = near?.kind === "npc" ? near.npc : undefined;
  useEffect(() => {
    const it = nearRef.current;
    if (nearNpc && ROBOTS.includes(nearNpc) && !panel && it) at3d(it.pos, () => sfx.voice("robot"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearNpc]);
  // 혼자 소리를 내는 것들: 가까이 가면 그쪽에서 가끔 들린다 (소리를 따라 찾아갈 수 있게)
  useEffect(() => {
    if (intro || ending) return;
    const src =
      zone === "bunker"
        ? [
            { p: BUNKER_NPCS.r07.pos, r: 16, odds: 0.14, play: () => sfx.voice("robot") },
            { p: BUNKER_NPCS.radio.pos, r: 14, odds: 0.18, play: () => sfx.voice("radio") },
          ]
        : [
            { p: CITY_NPCS.courier.pos, r: 16, odds: 0.12, play: () => sfx.voice("robot") },
            { p: CITY_NPCS.robomonk.pos, r: 22, odds: 0.16, play: () => sfx.moktak() },
          ];
    const iv = setInterval(() => {
      if (!activeRef.current) return;
      for (const e of src) {
        const d = Math.hypot(e.p[0] - player.pos.x, e.p[2] - player.pos.z);
        if (d < e.r && d > 2.2 && Math.random() < e.odds) at3d({ x: e.p[0], z: e.p[2] }, e.play);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [zone, intro, ending]);
  useEffect(() => {
    duckBgm(duckLevel);
  }, [duckLevel]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && galleryRef.current) {
        setGallery(false);
        return;
      }
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
        if (hushRef.current) return;
        // 글자가 아직 써지는 중이면 먼저 한 줄을 다 보여 준다
        if (typing.finish()) return;
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

  // 한 번에 한 메시지만: 위험(HUD) → 대화·상호작용 → 길 안내(이산의 말) → 방송. 짧은 안내는 showNotice로 (방송 자리를 잠깐 빌린다)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showNotice = useCallback((l: L, ms = 3200) => {
    clearTimeout(noticeTimer.current);
    setNotice(l);
    noticeTimer.current = setTimeout(() => setNotice(null), ms);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  // 지상에서는 관리 AI 방송이 주기적으로 흘러나옴. 대화·망원경·검문소·결말·이산의 말·다른 안내가 떠 있는 동안에는 건너뛴다
  const quietRef = useRef(false);
  // 이산의 얼굴(표준 미소 / 원본)을 도시가 알아본다: 지상에 올라설 때마다 첫 방송으로 한 번
  const queueCastRef = useRef<L | null>(null);
  const faceCastRef = useRef<L | null>(null);
  faceCastRef.current = complete && !ghost && !accepted && face.method ? faceTalk.broadcast[face.method] : null;
  useEffect(() => {
    if (zone !== "city" || ending) return;
    // 방송은 올라설 때마다 다른 줄에서 시작한다 (늘 같은 앞의 몇 줄만 듣지 않게)
    let i = Math.floor(Math.random() * announcements.length);
    let faceSaid = false;
    let hide: ReturnType<typeof setTimeout>;
    const show = () => {
      if (quietRef.current || drone.lit >= 0 || drone.caught) return false;
      clearTimeout(noticeTimer.current);
      const fc = faceCastRef.current;
      const qc = queueCastRef.current;
      if (qc) {
        queueCastRef.current = null;
        setNotice(qc);
      } else if (fc && !faceSaid) {
        faceSaid = true;
        setNotice(fc);
      } else setNotice(announcements[i++ % announcements.length]);
      hide = setTimeout(() => setNotice(null), 6500);
      return true;
    };
    // 첫 방송은 이산의 말(분필 안내 등)이 끝나기를 기다렸다가 곧이어 나온다
    let first: ReturnType<typeof setTimeout>;
    const tryFirst = () => { if (!show()) first = setTimeout(tryFirst, 1500); };
    first = setTimeout(tryFirst, 3500);
    const iv = setInterval(() => { clearTimeout(first); show(); }, 17000);
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
  const endGate = (kind: EndKind, step: number) => {
    // 빈자리에 다 들어선 뒤에야 이산의 말로 넘어간다. 예전에는 마지막 구간에 들어서기만 하면 넘어갔고, 프레임이 느린 기기에서는
    // 다 닿기 전에 다음 줄이 걸음을 멈춰 버려(stopWalk) 결말이 그 자리에서 더 나아가지 않았다
    if (kind === "accept" && step === ACCEPT_GO + 1) return autoWalk.arrived;
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
    if (panel.step >= afterLines().length) heardRef.current = true;
  }, [panel]);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!ending) return;
    const { kind, step } = ending;
    const end = step === BEAT_MS[kind].length;
    // 마지막 줄 뒤 정적까지 지나면 이 기기의 기억(결말 모음)에 남긴다: 세 결말 모두
    if (end) setMemory(remember(kind));
    // 도시가 발견한 결말로 저장하는 것은 수락뿐이다 (거부와 空은 남기지 않는다)
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
          if (!readQueueNo()) localStorage.setItem(QUEUE_KEY, String(QUEUE_FIRST));
        } catch {}
        gaze.mood = "calm";
        // 곧바로 걷지 않는다: 등록 방송을 들으며 성문 너머 대자비를 올려다본다 (살짝 당겨 보며)
        gaze.lookAt = { ...ACCEPT_LOOK_UP };
        gaze.zoom = 0.86;
        sfx.cityVoice();
      }
      // 천천히 돌아서 큰길과 이산 쪽을 본다 (이산의 말)
      if (step === ACCEPT_TURN) {
        gaze.zoom = 1;
        gaze.lookAt = { ...ACCEPT_LOOK_BACK };
      }
      if (step === ACCEPT_GO) {
        gaze.lookAt = null;
        // 플레이 중 몸을 숨기던 그 줄로: 큰길 가운데를 따라 줄 옆까지 걸어가 빈자리에 들어서서 가만히 선다.
        // 점마다 도착하면 다음 점으로 (Player가 autoWalk.queue를 차례로 꺼낸다). 이산은 줄 밖에 남는다.
        // 이미 지나온 점(검문소 앞에서 성문 쪽으로 되돌아가는 점)은 건너뛴다: 뒤로 갔다 다시 돌아서는 일이 없게
        const z = player.pos.z;
        const i = ACCEPT_WALK.findIndex((p) => p.z > z + 1);
        walkPath(ACCEPT_WALK.slice(Math.max(0, i)));
      }
      // 이산의 마지막 말: 줄에 선 채 고개를 돌려 줄 밖의 이산을 본다 (이산은 그동안 돌처럼 굳는다). 발소리가 끊기는 줄에서 다시 앞을 본다
      if (step === ACCEPT_SAY) {
        // 빈자리에 다 들어섰다: 자동 걸음이 시선을 붙잡지 않도록 놓는다
        stopWalk();
        gaze.lookAt = { ...ACCEPT_LOOK_SAN };
        sfx.stone();
      }
      if (step === ACCEPT_AWAY) gaze.lookAt = { ...ACCEPT_LOOK_GATE };
    } else if (kind === "reject") {
      if (step === 0) {
        // 레이저 없이: 화면이 하얗게 멎는 것으로 정지를 보여 준다
        sceneTimer.current = setTimeout(() => {
          setFlash(true);
          sfx.freeze();
        }, 1500);
      }
      if (step === REJECT_BUNKER) {
        // 장면이 방공호로: 사람들이 두 번째 정지 시민을 옮겨 와 나란히 앉혔다
        setFlash(false);
        setSecondStatue(true);
        goTo("bunker", false);
      }
      if (end) {
        // 도시가 둘을 다시 정지시켰다: 열람·만남·대화·결말·위치 백업이 처음 상태로 돌아간다 (약속과 발견한 결말은 남는다)
        try {
          [KEY, END_KEY, QUEUE_KEY, MET_KEY, TALK_KEY, SCOPE_KEY, FACE_KEY].forEach((k) => localStorage.removeItem(k));
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
      // 성문의 조준 빛이 겨눌 방문 기록을 찾지 못해 빛을 거둔다 (성문 옆 표시도 바뀐다). 문이 열리는 것이 아니다: 통로는 처음부터 열려 있다
      if (step === 1) {
        gaze.gateOpen = true;
        sfx.hidden();
      }
      // 조작을 돌려준다: 성문 홍예와 다리, 계단참까지만 걸을 수 있다 (보이는 기단·난간과 같은 자리). 이산은 앞서 계단참으로 간다.
      // 계단은 이산이 먼저 내려가 사라진 뒤에 열린다 (아래 효과)
      if (step === GHOST_WALK) {
        walkArea.rects = GHOST_RECTS;
        walkArea.floor = stairFloor;
      }
      // 이산의 마지막 말("…먼저 내려가 볼게.")이 뜨고 잠깐 뒤에 이산이 계단으로 걸어간다. 시선은 움직이지 않는다
      if (step === GHOST_STEP) {
        clearTimeout(sceneTimer.current);
        sceneTimer.current = setTimeout(() => setSanGoes(true), 1600);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endStep]);

  // 空 결말의 다리 위: 방문자가 스스로 도시 쪽을 돌아보면 이산이 한 줄 (묻지 않는다. 돌아보는 것이 선택이다)
  useEffect(() => {
    if (!walkable || ending?.step !== GHOST_WALK) return;
    let held = 0;
    let said = false;
    const iv = setInterval(() => {
      if (said) return;
      const onBridge = player.pos.z < -134 && player.pos.z > -152;
      held = onBridge && Math.cos(player.yaw) < -0.55 ? held + 1 : 0;
      if (held >= 5) {
        said = true;
        sayRef.current(sanCue.lookBack, 5200);
      }
    }, 300);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkable, ending?.step]);

  // 空 결말의 마지막 걸음: 이산이 먼저 계단을 내려가 사라지면 계단이 열리고, 방문자가 평소 조작으로 스무 단쯤 걸어 내려가면 끝난다.
  // 다 내려서면 조작을 거두고, 신호가 끊긴 검은 화면에 마지막 문장이 남은 뒤 버튼이 나온다 (endGate)
  useEffect(() => {
    if (!walkable || ending?.step !== GHOST_STEP) return;
    const iv = setInterval(() => {
      if (steppedRef.current) return;
      if (walkArea.rects === GHOST_RECTS && sanWalk.path === GHOST_DOWN && sanWalk.arrived) {
        walkArea.rects = [...GHOST_RECTS, STAIR_RECT];
        setStairsOpen(true);
      }
      const x = player.pos.x;
      if (!inRect(STAIR_RECT, x, player.pos.z) || x < STAIR_END) return;
      steppedRef.current = true;
      setStepped(true);
      sfx.ghost();
      // 걷기 범위(walkArea.rects)는 그대로 둔다: 풀면 계단 위의 몸이 도시 경계 안으로 밀려난다 (조작은 walkable이 거둔다)
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkable, ending?.step]);

  // 空 결말의 계단: 내려갈수록 화면이 흐려지고 어두워지며, 신호가 끊기듯 지직댄다 (가끔 화면이 옆으로 찢기고 잡음이 낀다).
  // 다 내려서면 끝까지 끊겨 검은 화면이 된다. 걸음과 함께 변하므로 매 프레임 직접 스타일을 바꾼다
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const signalRef = useRef<HTMLDivElement>(null);
  const descending = ending?.kind === "ghost" && ending.step >= GHOST_STEP;
  useEffect(() => {
    if (!descending) return;
    const wrap = canvasWrapRef.current;
    const sig = signalRef.current;
    let raf = 0;
    let k = 0;
    let tear = 0;
    let lastGlitch = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (runtime.paused) return;
      const now = performance.now();
      const depth = Math.min(1, Math.max(0, (player.pos.x - STAIR_FADE) / (STAIR_END - STAIR_FADE)));
      // 다 내려선 뒤에는 남은 신호가 1초 남짓에 걸쳐 끊긴다
      const want = steppedRef.current ? 1 : depth * 0.82;
      k += (want - k) * (steppedRef.current ? 0.05 : 0.15);
      if (!steppedRef.current) ambience("city", Math.max(0, 1 - k * 1.1));
      // 찢김: 깊어질수록 자주, 길게
      if (!input.calm && tear <= now && Math.random() < k * k * 0.12) tear = now + 60 + Math.random() * 160 * k;
      const torn = tear > now;
      if (torn && now - lastGlitch > 900 && k > 0.25 && k < 0.98) {
        lastGlitch = now;
        sfx.glitch();
      }
      if (wrap) {
        wrap.style.filter = k < 0.005 ? "" : `blur(${(k * 9).toFixed(2)}px) brightness(${(1 - k * 0.92).toFixed(3)}) saturate(${(1 - k * 0.7).toFixed(3)})`;
        wrap.style.transform = torn ? `translateX(${((Math.random() - 0.5) * 40 * k).toFixed(1)}px)` : "";
      }
      if (sig) {
        sig.style.opacity = String(Math.min(1, k * 0.9 + (torn ? 0.15 : 0)));
        sig.style.backgroundPosition = `0 ${Math.floor(Math.random() * 400)}px, ${Math.floor(Math.random() * 200)}px 0`;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (wrap) {
        wrap.style.filter = "";
        wrap.style.transform = "";
      }
      if (sig) sig.style.opacity = "0";
    };
  }, [descending]);

  // 지상에서 직접 오가는 짧은 말 (자막 한 줄. 말하는 사람 이름과 함께). 대화창을 열지 않고, 조작을 막지 않는다.
  // 한 번에 한 줄만 뜨고, 그동안 방송(.notice)은 비켜 준다. speak는 여러 줄을 차례로 (길 위의 짧은 만남)
  const [sanSay, setSanSay] = useState<{ who: L; line: L } | null>(null);
  useEffect(() => {
    if (sanSay) sfx.voice(voiceOf(sanSay.who));
  }, [sanSay]);
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
      speakUntil.current = runtime.now() + ms;
      sayTimer.current = setTimeout(() => run(i + 1), ms);
    };
    run(0);
  }, []);
  const say = useCallback((l: L, ms = 3600) => speak([{ who: SAN, line: l, ms }]), [speak]);
  const sayRef = useRef(say);
  sayRef.current = say;
  const speaking = () => runtime.now() < speakUntil.current;
  useEffect(() => () => clearTimeout(sayTimer.current), []);
  // 처음 시선 구역: 대자비 소개가 닫힌 뒤 이산이 첫 엄폐물 뒤로 가서 기다린다 (탭마다 한 번 말하고, 재시도 때는 말없이 다시 기다린다)
  const cueRef = useRef({ cover: false, wait: false, back: false, plaza: false, shelter: false, surface: false, surfaceAt: 0, avenueAt: 0 });
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
  // 空 경로: 대자비 구역에 처음 들어서면 이산이 스쳐 가듯 한 줄 (대자비가 둘을 보지 못한다. 방공호에서 한 짐작이 확인되는 순간)
  // 지상에 올라올 때마다 한 번. 창이 떠 있거나 멈춰 있으면 닫힌 뒤에
  // 길 위의 가벼운 말: 처음 달렸을 때, 드론 빛을 벗어난 뒤, 여러 번 뛰어올랐을 때, 식별되어 되돌아온 뒤 (이번 방문에 한 번씩).
  // 다른 말·창·방송이 없고 드론 빛 밖에 있을 때만, 서로 20초 넘게 띄워서 한다
  // 검문소 직전(큰길 끝 엄폐물 뒤)에 이산과 함께 숨어 있으면 이산이 잠깐 앉자고 한다 (이번 방문에 한 번)
  const sitAsked = useRef(false);
  useEffect(() => {
    if (!sanWithYou || phase !== "descent") return;
    const iv = setInterval(() => {
      if (sitAsked.current || quietRef.current || pausedRef.current || gaze.intro || gaze.hiddenBy !== "cover" || gaze.meter > 25 || player.pos.z > -100) return;
      const sp = sanPos();
      if (Math.hypot(sp.x - player.pos.x, sp.z - player.pos.z) > 5) return;
      sitAsked.current = true;
      setPanel({
        kind: "dialog",
        name: SAN,
        lines: [sanCue.sitAsk],
        step: 0,
        choices: [
          { at: 0, label: sanCue.sitYes, go: () => sitCoverRef.current() },
          { at: 0, label: sanCue.sitNo, go: () => closePanelRef.current() },
        ],
      });
    }, 400);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanWithYou, phase]);
  const lightSaid = useRef({ ran: false, droneLight: false, jump: false, caught: false, at: 0 });
  useEffect(() => {
    if (!sanWithYou) return;
    const iv = setInterval(() => {
      const L = lightSaid.current;
      const now = performance.now();
      if (quietRef.current || pausedRef.current || gaze.intro || gaze.seen || drone.lit >= 0 || drone.caught || now - L.at < 20000 || now - cueRef.current.surfaceAt < 12000) return;
      const key = !L.caught && tally.caught > 0 ? "caught" : !L.droneLight && tally.lost > 0 ? "droneLight" : !L.jump && tally.jumps >= 4 ? "jump" : !L.ran && tally.ran ? "ran" : null;
      if (!key) return;
      L[key] = true;
      L.at = now;
      say(sanCue[key], 3800);
    }, 1500);
    return () => clearInterval(iv);
  }, [sanWithYou, say]);
  const blindSaid = useRef(false);
  useEffect(() => {
    blindSaid.current = false;
    if (zone !== "city" || !ghost || ending) return;
    const iv = setInterval(() => {
      if (blindSaid.current || !gaze.inZone || panelRef.current || pausedRef.current) return;
      blindSaid.current = true;
      say(sanCue.blind, 4600);
    }, 300);
    return () => clearInterval(iv);
  }, [zone, ghost, ending, say]);
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
  // 길은 둘: 가는 길(OUT) / 승강장으로 가기로 한 뒤의 돌아오는 길(BACK: 전망대 → 광장). 기억으로 깨어난 둘에게는 정해진 길이 없다
  type RouteRun = { list: RoutePt[] | null; hold: number; i: number; target: number };
  const routeRef = useRef<RouteRun>({ list: null, hold: -1, i: -1, target: -1 });
  function resetRoute(list: RoutePt[] | null = null, hold = -1) {
    routeRef.current = { list, hold, i: hold, target: hold };
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
  const sanLeads = zone === "city" && complete && talked && !accepted && !ending;
  useEffect(() => {
    if (!sanLeads) return;
    const iv = setInterval(() => {
      if (pausedRef.current || panelRef.current || drone.caught) return;
      // 망원경 장면 동안은 장면이 이산을 움직인다 (정해진 길)
      const sc = scopeRef.current.stage;
      if (sc !== "idle" && sc !== "done") return;
      const ph = phaseRef.current;
      const px = player.pos.x;
      const pz = player.pos.z;
      const sp = sanPos();
      // 길: 망원경 가는 길(OUT) / 승강장으로 가기로 한 뒤 전망대에서 돌아오는 길(BACK) / 그 밖에는 평소처럼 따라온다.
      // 결정을 미뤘다면('전망대에 더 머문다') 이산은 전망대에서 기다린다 (전망대 밖에 있으면 평소처럼 따라온다)
      // 기억으로 깨어난 둘에게는 정해진 길이 없다: 방문자가 앞장선다
      if (!ghostRef.current && ph === "decide" && inBay(sp.x, sp.z)) {
        if (routeRef.current.list) resetRoute();
        holdSan(LOOK_WAIT);
        return;
      }
      const backing = ph === "descent" && routeRef.current.list === BACK;
      // 망원경 가는 길에서는 경유점마다 멈춰 기다리지 않고 방문자 바로 뒤에서 따라온다 (사용자 요청)
      const want: RoutePt[] | null = ghostRef.current ? null : backing ? BACK : null;
      if (routeRef.current.list !== want) resetRoute(want);
      const run = routeRef.current;
      const list = run.list;
      if (!list) {
        if (sanHold.at?.manual) sanHold.at = null;
        return;
      }
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
      // 방문자가 길을 벗어나 멀리 갔으면 (다른 데를 둘러보러) 기다림을 풀고 평소처럼 따라간다. 가는 길이면 길로 돌아올 때 다시 붙는다
      if (me.d > 14 && Math.hypot(px - sp.x, pz - sp.z) > 24) {
        resetRoute(list === BACK ? null : list);
        if (sanHold.at?.manual) sanHold.at = null;
        return;
      }
      if (run.target === run.hold) {
        const nh = nextHold(list, run.hold);
        // 돌아오는 길의 끝(광장)에 닿으면 정해진 길을 놓고 평소처럼 따라온다
        if (nh < 0 && list === BACK) {
          resetRoute(null);
          if (sanHold.at?.manual) sanHold.at = null;
          return;
        }
        // 돌아오는 길에서는 이산이 앞장선다: 방문자가 곁에 오면 먼저 다음 자리로 건너가 기다린다 (가는 길 내내 뒤에서 따라오던 것과 반대)
        const lead = list === BACK && Math.hypot(px - sp.x, pz - sp.z) < 5;
        if (nh >= 0 && (me.k >= nh || lead)) {
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
    }, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanLeads]);

  // 길 위의 짧은 말과 장면 신호: 골목 입구(처음 한 번, 허공 너머 망원경과 드론 한 번 훑기) / 배송 대기소 처마 밑 /
  // 길 위의 만남(할머니·D-12·아이, 각각 한 번) / 큰길 입구의 부탁 / 망원경 장면의 진행 / 들여다보기의 다가감·물러남
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
        gaze.zoom = SCOPE_ZOOM;
        gaze.clamp = { ...SCOPE_CLAMP };
        m.mode = "view";
        setScopeView("view");
        sfx.scopeIn();
        // 들여다본 횟수만 센다 (기억으로 깨어난 사람은 기록을 남기지 않는다)
        if (!ghostRef.current) writeScope({ ...readScope(), uses: readScope().uses + 1 });
      } else if (m.mode === "out" && autoWalk.arrived) {
        stopWalk();
        m.mode = "";
        m.back = null;
        gaze.still = false;
        if (m.looked && sc.stage === "offer") {
          // 방문자가 눈을 뗐다: 이번엔 이산이 말없이 접안렌즈로 간다
          sc.at = 0;
          setScopeStage("ask");
          return;
        }
        if (m.looked && phaseRef.current !== "scope") say(scopeScene.again, 2600);
      }
      // 구역을 오가는 화면 전환 중에는 (아직 앞 구역의 자리에 있으므로) 길 위의 말을 꺼내지 않는다
      if (pausedRef.current || panelRef.current || drone.caught || gaze.intro || fadeRef.current) return;
      const now = runtime.now();
      const px = player.pos.x;
      const pz = player.pos.z;
      const ph = phaseRef.current;
      const c = cueRef.current;
      const withSan = sanWithYouRef.current;
      // 골목 입구에서 처음: 허공 너머 남쪽 전망대의 망원경을 잠깐 바라보게 하고, 앞줄 드론이 그 앞을 한 번 훑는다 (걷기는 막지 않는다)
      if (ph === "scope" && withSan && !c.plaza && Math.abs(px - OUT[0].x) < 2.2 && pz > OUT[0].z - 1.6 && pz < AVENUE_EDGE_Z + 2) {
        c.plaza = true;
        presetSweep(0, 1.6);
        // 길 안내 팝업 (시야는 붙잡지 않는다. 이산의 말이 아니라 대자비 소개 같은 안내 창)
        if (!panelRef.current && !endingRef.current) setPanel({ kind: "route" });
      }
      // 처음 지상에 올라서면 (배전실 문 앞, 망원경 단계에서 이번 방문에 한 번): 바닥의 분필 화살표를 가리킨다
      if (ph === "scope" && withSan && !c.surface) {
        if (!c.surfaceAt) {
          if (Math.hypot(px - CITY.spawn.pos[0], pz - CITY.spawn.pos[2]) < 6) c.surfaceAt = now;
        } else if (now - c.surfaceAt > 1800 && performance.now() > cookieUntil.current && !speaking()) {
          c.surface = true;
          say(sanCue.surface, 4200);
        }
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
      // 줄 속에 처음 숨었을 때 옆의 시민이 건네는 말 (이번 방문에 한 번)
      if (!metRef.current.line && gaze.inZone && gaze.hiddenBy === "line" && !speaking() && !ghostRef.current) {
        metRef.current.line = true;
        speak([{ who: npcs.whisper.name, line: lineWhisper, ms: 4200 }]);
      }
      // 망원경을 본 뒤 같은 사람들을 다시 지나치면 한 번씩: 같은 길인데 이산이 달라져 있다
      if (ph !== "scope" && ph !== "restore" && ph !== "talk" && withSan && !ghostRef.current && !speaking() && (sc.stage === "idle" || sc.stage === "done")) {
        for (const e of ENCOUNTER_SPOTS) {
          const key = `back-${e.id}`;
          if (metRef.current[key]) continue;
          if (Math.hypot(px - e.x, pz - e.z) > e.r) continue;
          const sp = sanPos();
          if (Math.hypot(sp.x - px, sp.z - pz) > 9) continue;
          metRef.current[key] = true;
          const seq = e.id === "grandma" && faceRef.current.method === "standard" ? [...encountersBack.grandma, grandmaBackStd] : encountersBack[e.id];
          speak(seq.map((l) => ({ who: l.who === "san" ? SAN : npcs[e.id].name, line: l, ms: 3400 })));
          break;
        }
      }
      // 큰길 입구에서 (이산이 곁에 있을 때만 한 줄): 망원경 전에는 차단막 앞에서 망원경부터, 결정을 미뤘다면 갈지 묻는다
      if (withSan && (ph === "scope" || ph === "decide") && Math.abs(px) < 12 && pz < AVENUE_EDGE_Z + 2.5 && pz > AVENUE_EDGE_Z - 4 && now - c.avenueAt > 12000 && !speaking()) {
        const sp = sanPos();
        if (Math.hypot(sp.x - px, sp.z - pz) < 8) {
          c.avenueAt = now;
          say(ph === "decide" ? sanCue.avenueDecide : sanCue.avenue, 3400);
        }
      }
      // 망원경 장면: 이산이 접안렌즈 앞에 다 온 뒤 잠깐의 정적, 첫 말. 그다음 비켜서며 권한다 (도착을 기다리고, 그 뒤만 시간으로)
      if (sc.stage === "ask" && sanWalk.path === TO_EYE && sanWalk.arrived) {
        if (!sc.at) sc.at = now;
        else if (now - sc.at > 1600) {
          sc.at = now;
          setScopeStage("looking");
          say(scopeScene.first, 3200);
        }
      } else if (sc.stage === "looking" && now - sc.at > 3400) {
        // 함께 보는 관측은 여기서 끝난다 (이 기기에 남는다). 이산이 눈을 떼고 묻는다
        if (!ghostRef.current) writeScope({ ...readScope(), seen: true });
        sc.step = 0;
        setScopeStage("after");
        setPanel(afterPanel());
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
    // 드론 0 광장, 1 산책로, 6 남쪽 다리 (가는 길이면 건너기 전 자리, 돌아오는 길이면 돌아오기 전 자리)
    const k = drone.by === 6 ? (out ? OUT_HOLD.corner : OUT_HOLD.look) : drone.by === 1 ? (out ? OUT_HOLD.walk : OUT_HOLD.corner) : out ? OUT_HOLD.plaza : OUT_HOLD.depot;
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
    gaze.sit = false;
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
    // 혹시 대자비 소개가 열리려던 참이었다면 거둔다 (결말 위에 소개 창이 뜨지 않게)
    cancelIntro.current?.();
    gaze.intro = false;
    gaze.frozen = false;
    gaze.lookAt = null;
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
      localStorage.removeItem(QUEUE_KEY);
      localStorage.removeItem(MET_KEY);
      localStorage.removeItem(TALK_KEY);
      localStorage.removeItem(SCOPE_KEY);
      localStorage.removeItem(FACE_KEY);
    } catch {}
    setVisited([]);
    setMet(false);
    setTalked(false);
    setScopeData({ ...NO_SCOPE });
    resetFace();
  };
  const clearScene = () => {
    clearTimeout(sceneTimer.current);
    stopWalk();
    sanHold.at = null;
    walkArea.rects = null;
    gaze.gateOpen = false;
    cueRef.current = { cover: false, wait: false, back: false, plaza: false, shelter: false, surface: false, surfaceAt: 0, avenueAt: 0 };
    cpRef.current = { seen: false, talked: false };
    metRef.current = {};
    clearTimeout(beatTimer.current);
    setBeat("");
    gaze.still = false;
    gaze.sit = false;
    drone.shapeSeen = false;
    heardRef.current = false;
    resetRoute();
    resetScopeScene();
    resetDrones();
    clearTimeout(frameTimer.current);
    gaze.lookAt = null;
    gaze.mood = "";
    steppedRef.current = false;
    setStepped(false);
    setStairsOpen(false);
    setSanGoes(false);
    walkArea.floor = null;
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
    resetTally();
    goTo("bunker", false);
    lock();
  };
  // 설정창의 '처음부터 다시' (확인 뒤): 수락한 시민에게만 보인다. 줄 밖으로 돌아가는 유일한 길이고, 숨은 길을 열지 않는다
  // (꼬리말 삭제 표시 FORGOT_KEY를 만들지 않는다). 그 밖의 '기록 삭제 안내'는 안내만 한다
  const onRestart = () => {
    setPaused(false);
    restart();
  };
  // 대자비 소개: 멈춤 → 카메라가 대자비 쪽으로 → 설명 팝업. 닫으면 게임이 이어진다
  const introTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hadJabi = useRef(false);
  const cancelIntro = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelIntro.current?.(), []);
  // 패널 효과음: 열릴 때, 대화가 한 줄 넘어갈 때, 잠긴 곳에 부딪혔을 때, 대자비 소개
  const prevPanel = useRef<Panel>(null);
  useEffect(() => {
    const a = prevPanel.current;
    prevPanel.current = panel;
    if (!panel) return;
    if (panel.kind === "jabi") return sfx.gong();
    if (panel.kind === "route") return sfx.chime();
    if (panel.kind === "dialog" && panel.locked && a?.kind !== "dialog") return sfx.denied();
    const line = panel.kind === "dialog" && !panel.plaque ? panel.lines[Math.min(panel.step, panel.lines.length - 1)] : undefined;
    if (!a || a.kind !== panel.kind) {
      // 말을 건 상대의 자리 (가까이 있던 대상). 저절로 열린 대화는 가운데서
      const it = nearRef.current;
      talkPos = it && Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z) < 6 ? { x: it.pos.x, z: it.pos.z } : null;
      sfx.open();
      if (panel.kind === "dialog" && line) setTimeout(() => voiceAt(voiceOf(panel.name, line)), 160);
      return;
    }
    if (panel.kind === "dialog" && a.kind === "dialog" && (panel.step !== a.step || panel.lines !== a.lines)) {
      if (line) voiceAt(voiceOf(panel.name, line));
      else sfx.blip();
    }
  }, [panel]);
  const startJabiIntro = useCallback(() => {
    cancelIntro.current?.();
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
    cancelIntro.current = () => {
      window.removeEventListener("sanlee-look-done", onDone);
      clearTimeout(introTimer.current);
    };
    clearTimeout(introTimer.current);
    introTimer.current = setTimeout(open, 5000);
  }, []);
  const endJabiIntro = useCallback(() => {
    cancelIntro.current?.();
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
      [KEY, MET_KEY, TALK_KEY, SCOPE_KEY, FACE_KEY].forEach((k) => localStorage.removeItem(k));
    } catch {}
    wipeBackup();
    setVisited([]);
    setMet(false);
    setTalked(false);
    setScopeData({ ...NO_SCOPE });
    resetFace();
    resetGaze();
    restoreCovers();
    goTo("bunker", false);
    setTimeout(() => setIntro(true), 900);
  }, [goTo]);

  // 입장: 수락한 시민은 곧장 줄 속에서 깨어난다
  const enter = () => {
    setIntro(false);
    // 접속 기록: 들어오기만 해도 남는다. 웹사이트 꼬리말의 'delete seoul'은 이 기록이 있는 기기에만 나타난다.
    // 꼬리말에서 일부러 기록을 지우고 돌아온 사람에게는 새 접속 기록을 만들지 않는다 (재회 전까지 추적할 방문자가 없다)
    try {
      if (localStorage.getItem(FORGOT_KEY) === null) localStorage.setItem(LOGIN_KEY, String(Date.now()));
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
      // 줄은 줄지 않는다: 돌아올 때마다 번호가 하나 밀려 있다
      const no = readQueueNo();
      if (no) {
        try {
          localStorage.setItem(QUEUE_KEY, String(no + 1));
        } catch {}
        const bump = checkpoint.queueBump;
        const n = (no + 1).toLocaleString("en-US");
        // 줄에 선 뒤의 첫 방송으로 나온다
        queueCastRef.current = { ko: bump.ko.replace("{n}", n), en: bump.en.replace("{n}", n) };
      }
    }
  };
  // 수락 결말의 '줄로 돌아가기'로 다시 불러온 경우: 첫 화면을 다시 띄우지 않는다 (같은 버튼이 두 번 나오지 않게)
  useEffect(() => {
    if (!accepted || !intro) return;
    try {
      if (sessionStorage.getItem(TO_LINE_KEY) !== "1") return;
      sessionStorage.removeItem(TO_LINE_KEY);
    } catch {
      return;
    }
    enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accepted, intro]);

  // 퀘스트 화살표의 목표: 매 프레임 플레이어 위치에 따라 고른다
  const questRef = useRef<() => QuestTarget>(() => null);
  const neonReached = useRef(false);
  questRef.current = () => {
    if (ending) return null;
    // 줄에서 다시 시작했다면: 검문소 앞의 굳은 이산에게
    if (accepted) return zone === "city" ? { pos: ZONES.city.items.find((i) => i.id === "frozen-san")!.pos, label: t(replayUi.quest) } : null;
    const items = ZONES[zone].items;
    const find = (id: string) => items.find((i) => i.id === id);
    const px = player.pos.x;
    const pz = player.pos.z;
    if (zone === "bunker") {
      if (!complete && !met && visited.length === 0) {
        const it = find("statue");
        return it ? { pos: it.pos, label: t(quest.statue) } : null;
      }
      if (restored && !complete) {
        const it = items.find((i) => i.id === (face.asked ? "face-machine" : "statue"));
        const label = !face.asked ? faceUi.questAsk : facePhase === "choice" ? faceUi.questChoose : faceUi.quest;
        return it ? { pos: it.pos, label: t(label) } : null;
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
    if (scopeRef.current.stage === "offer") {
      const sc = find("scope-0");
      return sc ? { pos: sc.pos, label: t(quest.scope) } : null;
    }
    if (scopeRef.current.stage !== "idle" && scopeRef.current.stage !== "done") return null;
    // 길 위(광장·바깥 산책로)에서는 허공 너머 목표를 곧장 가리키지 않고 다음 경유점(드론 빛이 닿지 않는 자리)을 가리킨다
    const along = (list: RoutePt[], label: L): QuestTarget => {
      const nh = nextHold(list, nearestHold(list, px, pz).k);
      return nh >= 0 ? { pos: list[nh], label: t(label) } : null;
    };
    // 망원경 가는 길: 먼저 바닥 네온이 시작되는 처마 밑을 가리키고, 거기서부터는 바깥 다리 입구를,
    // 다리(판 가장자리 바깥의 산책로·남쪽 다리)에 들어선 순간부터는 망원경을 곧장 가리킨다
    if (phase === "scope") {
      const sc = find("scope-0");
      if (!sc) return null;
      const onBridge = px < -EDGE.x || pz > EDGE.z1;
      if (onBridge || inBay(px, pz)) return { pos: sc.pos, label: t(quest.scope) };
      const start = OUT[OUT_HOLD.depot];
      if (Math.hypot(px - start.x, pz - start.z) < 3) neonReached.current = true;
      const p = neonReached.current ? OUT[OUT_HOLD.depot + 2] : start;
      return { pos: { x: p.x, z: p.z }, label: t(quest.scope) };
    }
    // 기억으로 깨어난 둘: 방문자가 앞장서 검문소로
    if (ghost) {
      const cp = find("checkpoint");
      return cp ? { pos: cp.pos, label: t(quest.checkpoint) } : null;
    }
    // 승강장으로 갈지 아직 정하지 않았다: 어디서든 이산에게 (이산은 전망대에서 기다리거나 곁에 있다)
    if (phase === "decide") {
      const san = find("san");
      return san ? { pos: san.pos, label: t(quest.decide) } : null;
    }
    // 정했다: 길 위(바깥 산책로)에서는 돌아오는 길의 다음 경유점, 도시 판 위에서는 검문소
    if (offDeck(px, pz)) return along(BACK, quest.checkpoint);
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

  useModalFocus(rootRef, recordsChanged ? null : paused ? ".pause" : intro ? ".intro .panel" : panel ? ".panel-wrap .panel, .choice-wrap [role=dialog]" : endShown ? ".ending-inner" : null);

  if (recordsChanged) {
    return <main className="fallback-root"><div className="fallback" role="alert">
      <h1>{lang === "ko" ? "다른 탭에서 기록이 변경됐습니다." : "Records changed in another tab."}</h1>
      <p>{lang === "ko" ? "이전 기록을 다시 저장하지 않도록 플레이를 멈췄습니다. 새 기록으로 다시 접속해 주세요." : "Play has stopped to avoid saving old records. Reconnect to use the updated records."}</p>
      <button className="btn primary" onClick={() => location.reload()}>{lang === "ko" ? "다시 접속" : "Reconnect"}</button>
      <Link href="/" className="btn">{t(ui.toPortfolio)}</Link>
    </div></main>;
  }

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

  const faceView = useMemo(() => ({ drums: face.drums, phase: facePhase, method: face.method }), [face.drums, facePhase, face.method]);
  const sectionMeta = panel?.kind === "section" ? sections.find((s) => s.id === panel.id)! : null;
  // 이산이 걸을 정해진 길: 망원경 장면(접안렌즈로 → 비켜선 자리), 수락 결말(줄 밖), 空 결말(계단참 → 돌아섬).
  // 그 밖에는 평소처럼 따라오거나 경유점에서 기다린다
  const sanPath: SanPath | undefined =
    ending?.kind === "accept"
      ? ending.step >= ACCEPT_TURN
        ? ACCEPT_SAN
        : undefined
      : ending?.kind === "ghost"
        ? ending.step >= GHOST_WALK
          ? ending.step >= GHOST_STEP && sanGoes
            ? GHOST_DOWN
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
    // 실제로 연 순서 그대로. 한국어 화면에서는 소개·작업·글로 (영문 섹션 이름을 쓰지 않는다)
    const order = visited.map((id) => (lang === "ko" ? checkpoint.sectionKo[id] : sections.find((x) => x.id === id)?.label) ?? id).join(" → ");
    evidence.push(t(checkpoint.evOrder).replace("{order}", order).replace("{n}", String(visited.length)));
    if (scopeData.uses > 0) evidence.push(t(checkpoint.evScope).replace("{n}", String(scopeData.uses)));
    else if (scopeData.seen) evidence.push(t(checkpoint.evScopeDone));
    // 이번 방문에 실제로 한 사소한 일들도 적혀 있다
    const top = Object.entries(tally.look).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 5000) evidence.push(t(checkpoint.evLook).replace("{title}", t(works[Number(top[0])].title)).replace("{n}", String(Math.round(top[1] / 1000))));
    if (tally.jumps > 0) evidence.push(t(checkpoint.evJump).replace("{n}", String(tally.jumps)));
    if (tally.r07 > 0) evidence.push(t(checkpoint.evR07).replace("{n}", String(tally.r07)));
    if (tally.caught > 0) evidence.push(t(checkpoint.evCaught).replace("{n}", String(tally.caught)));
    if (tally.sat) evidence.push(t(checkpoint.evSat));
    if (tally.withdraw > 0) evidence.push(t(checkpoint.evWithdraw).replace("{n}", String(tally.withdraw)));
  }
  const painting = panel?.kind === "painting" ? works[panel.work] : null;

  const verb = near ? (near.id === "scope-0" && !ghost && (scopeStage === "offer" || scopeStage === "idle" || scopeStage === "done") ? ui.scopeLook : near.id.startsWith("scope") || near.kind === "note" || near.npc === "frozen" ? ui.view : near.kind === "painting" ? ui.nextPainting : near.kind === "npc" || near.kind === "statue" ? ui.talk : near.id === "face-std" ? faceUi.press : near.id === "face-keep" ? faceUi.pull : near.kind === "face" ? faceUi.turn : ui.open) : null;
  quietRef.current = !!panel || !!scopeView || !!sanSay || !!toast || !!beat || paused;
  const rootClass = [
    "explore-root",
    ending ? `ending-${ending.kind}` : "",
    ending?.kind === "reject" && ending.step >= REJECT_BUNKER ? "thaw" : "",
    ending?.kind === "ghost" && ending.step === 1 ? "ghost-freeze" : "",
    flash ? "final-flash" : "",
    tracked && !ending && !ghost ? "is-tracked" : "",
    leaving ? "logging-out" : "",
    beat === "sit" ? "reunion-sit" : "",
    input.calm ? "calm-fx" : "",
    touch ? "is-touch" : "",
  ].join(" ");

  return (
    <main className={rootClass} ref={rootRef}>
      {webgl && (
        <div className="canvas-wrap" ref={canvasWrapRef}>
          <WorldBoundary onUnavailable={() => setWebgl(false)}>
            <World
            zone={zone}
            lang={lang}
            visited={visited}
            onTap={onTap}
            onNear={setNear}
            onTracked={setTracked}
            labelEls={labelEls}
            sanPath={sanPath}
            sanStone={ending?.kind === "accept" && ending.step >= ACCEPT_SAY}
            hideSan={accepted}
            frozenSan={accepted && zone === "city" && !ending}
            sanStart={replay ? [FROZEN_SAN.x, FROZEN_SAN.z] : undefined}
            secondStatue={secondStatue}
            notesRead={notesRead}
            awake={complete}
            face={faceView}
            arrived={arrived}
            />
          </WorldBoundary>
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
          <span className="logout-text">{lang === "ko" ? "웹사이트로 돌아갑니다." : "Back to the website."}</span>
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
      {notice && !panel && !sanSay && !scopeView && !beat && <div className="notice">{t(notice)}</div>}
      {sanSay && !panel && (!ending || walkable) && (
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

      {/* 空 결말: 다리를 걷는 동안은 이산을 따라가라는 안내, 이산이 사라져 계단이 열린 뒤에야 계단 안내 (막힌 계단 앞에서 '내려가기'를 띄우지 않는다) */}
      {active && walkable && (ending?.step === GHOST_WALK || stairsOpen) && <div className="hint">{t(ending?.step === GHOST_WALK ? ui.followHint : ui.stepHint)}</div>}
      {active && !walkable && near?.kind === "face" && facePhase === "choice" && !scopeView && <div className="hint">{t(touch ? faceUi.hintChooseTouch : faceUi.hintChoosePc)}</div>}
      {active && !walkable && near?.id === "face-machine" && facePhase !== "choice" && !scopeView && <div className="hint">{t(touch ? faceUi.hintTouch : faceUi.hintPc)}</div>}
      {/* 휴대폰: 장치 앞에서는 화면 가운데에 조준점을 띄운다 (조준점이 가리키는 원통이 빛나고, 행동 버튼이 그 원통을 돌린다) */}
      {active && touch && near?.kind === "face" && !scopeView && <Reticle on color={near.color} />}
      {active && !walkable && !near && !scopeView && <div className="hint">{t(touch ? ui.hintTouch : locked ? ui.hintLocked : ui.hintPc)}</div>}
      {active && locked && !scopeView && <Reticle on={!!near} color={near?.color} />}
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
          onRestart={accepted ? onRestart : undefined}
          onBunker={zone === "city" && !ending && !accepted ? backToBunker : undefined}
          since={since}
          inBunker={zone === "bunker"}
          onLeave={logout}
          onGallery={() => setGallery(true)}
          seenCount={seenCount}
        />
      )}

      {panel?.kind === "section" && sectionMeta && (
        <div className="panel-wrap">
          <div className="panel" role="dialog" aria-modal="true" aria-label={t(ui.title)} tabIndex={-1}>
            <div className="panel-head">
              <h2>{sectionMeta.label.toUpperCase()}</h2>
              <small>{sectionMeta.labelKo}</small>
            </div>
            <p className="record-source">{t(ui.recordSource)}</p>
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
          <div className="panel painting-panel" role="dialog" aria-modal="true" aria-label={t(ui.title)} tabIndex={-1}>
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

      {panel?.kind === "dialog" && !hush && (
        <div className="panel-wrap dialog-wrap">
          <div className="panel pink dialog" role="dialog" aria-modal="true" aria-label={t(panel.name)} tabIndex={-1}>
            {panel.plaque ? (
              <div className="plaque">
                {plaque.map((p, i) => (
                  <div key={i}>{t(p)}</div>
                ))}
              </div>
            ) : null}
            {(() => {
              const line = panel.lines[Math.min(panel.step, panel.lines.length - 1)];
              // 지문(따옴표 없음, 말하는 이 없음) / 그 밖에는 대화창의 이름으로 한 번. 방문자는 말하지 않는다
              const k = `${panel.step}:${t(line)}`;
              if (line.who === "narr") return <p className="line narr"><Typed key={k} text={t(line)} /></p>;
              const v = panel.plaque ? "none" : voiceOf(panel.name, line);
              return (
                <>
                  {!panel.plaque && <div className="speaker">{t(panel.name)}</div>}
                  <p className="line">
                    <Typed key={k} text={`“${t(line)}”`} voice={v} />
                  </p>
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
              {panel.logout && panel.step === panel.lines.length - 1 && (
                <Link className="btn primary" href="/" onClick={logout}>
                  {t(ui.logout)}
                </Link>
              )}
              {panel.link && panel.step === panel.lines.length - 1 && (
                <a className="btn primary" href={panel.link.href} target="_blank" rel="noopener noreferrer">
                  {t(panel.link.label)}
                </a>
              )}
              {panel.step < panel.lines.length - 1 && !hush && (
                <button className="btn primary" autoFocus onClick={() => !typing.finish() && setPanel({ ...panel, step: panel.step + 1 })}>
                  {t(ui.next)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {panel?.kind === "jabi" && (
        <div className="choice-wrap jabi-wrap">
          <div className="jabi-intro" role="dialog" aria-modal="true" aria-labelledby="jabi-intro-title">
            <h2 id="jabi-intro-title">{t(jabiUi.introTitle)}</h2>
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
            <ol className="jabi-rules">
              {jabiUi.introRules.map((r, i) => (
                <li key={i}>{t(r)}</li>
              ))}
            </ol>
            <div className="panel-actions">
              <button className="btn primary" autoFocus onClick={closePanel}>
                {t(jabiUi.introOk)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 골목을 나설 때: 망원경 가는 길 안내 (실제 플레이 화면 두 장) */}
      {panel?.kind === "route" && (
        <div className="choice-wrap jabi-wrap">
          <div className="jabi-intro route-intro" role="dialog" aria-modal="true" aria-labelledby="route-intro-title">
            <h2 id="route-intro-title">{t(routeUi.title)}</h2>
            <p>{t(routeUi.body)}</p>
            <div className="jabi-shots">
              {routeUi.shots.map((sh) => (
                <figure key={sh.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sh.src} alt={t(sh.cap)} width={480} height={360} />
                  <figcaption>{t(sh.cap)}</figcaption>
                </figure>
              ))}
            </div>
            <div className="panel-actions">
              <button className="btn primary" autoFocus onClick={closePanel}>
                {t(routeUi.ok)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 검문소: 첫 화면은 제목·한 줄·두 결과·두 버튼. 실제 기록은 접어 둔 상세에. 물러나기와 삭제 안내는 어느 화면에서든 보인다 */}
      {panel?.kind === "choice" && (
        <div className="choice-wrap">
          <div className="choice cp" role="dialog" aria-modal="true">
            {panel.game ? (
              <CookieGame t={t} onWin={onGameWin} onLose={onGameLose} />
            ) : panel.confirm !== undefined ? (
              <>
                <h2>{t(checkpoint.confirm[panel.confirm].title)}</h2>
                <p>{t(checkpoint.confirm[panel.confirm].body)}</p>
                {/* 마지막 확인에서만: 처음엔 혼자 거부했던 이산의 한 줄 (결말의 "이번엔 나 혼자가 아니네."가 받는다) */}
                {panel.confirm === 1 && !ghost && (
                  <p className="cp-san">
                    <span>{t(SAN)}</span>“{t(checkpoint.sanAlone)}”
                  </p>
                )}
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
                {tally.withdraw > 0 && <p className="cp-again">{t(checkpoint.returned[Math.min(tally.withdraw, 2) - 1])}</p>}
                <p>{t(checkpoint.body)}</p>
                <div className="cp-outcomes">
                  <div>
                    <b>{t(checkpoint.ifAccept)}</b>
                    {checkpoint.acceptWhat.map((l, i) => (
                      <span key={i}>{t(l)}</span>
                    ))}
                  </div>
                  <div>
                    <b>{t(checkpoint.ifReject)}</b>
                    <span>{t(checkpoint.rejectWhat)}</span>
                  </div>
                </div>
                <div className="choice-actions">
                  <button className="choice-accept" onClick={() => choose("accept")}>
                    {t(checkpoint.acceptBtn)}
                  </button>
                  <button
                    className="choice-reject"
                    onClick={() => {
                      sfx.denied();
                      setPanel({ kind: "choice", confirm: 0 });
                    }}
                  >
                    {t(checkpoint.rejectBtn)}
                  </button>
                </div>
                <details className="cp-details">
                  <summary>{t(checkpoint.evidenceTitle)}</summary>
                  <ul>
                    {evidence.map((l, i) => (
                      <li key={`e${i}`}>{l}</li>
                    ))}
                    {checkpoint.status.map((l, i) => (
                      <li key={`s${i}`}>{t(l)}</li>
                    ))}
                  </ul>
                </details>
              </>
            )}
            {/* 어느 단계에서든 결정하지 않고 물러날 수 있다 (Esc와 같다). 쿠키 끄기 화면이 닫히면 그 타이머도 멈춘다 */}
            <button type="button" className="choice-withdraw" onClick={withdraw}>
              {t(checkpoint.withdraw)}
            </button>
            <p className="cp-delete-note">{t(checkpoint.deleteNote)}</p>
          </div>
        </div>
      )}

      {descending && <div className="ghost-signal" ref={signalRef} aria-hidden="true" />}

      {ending && (
        <div className={`ending ending-${ending.kind}${walkable ? " walking" : ""}`}>
          <div className="ending-inner">
            {(checkpoint[ending.kind] as Beat[]).slice(0, ending.step + 1).map((l, i, arr) => {
              // 거부 결말이 방공호로 넘어가면 앞 장면의 글은 거둔다
              if (ending.kind === "reject" && ending.step >= REJECT_BUNKER && i < REJECT_BUNKER) return null;
              // 空 결말은 앞을 가리지 않도록 마지막 두 줄만 아래에. 수락 결말은 최근 세 줄만 (숫자는 감정 장면 전에 지나간다)
              if (ending.kind === "ghost" && (ending.step > GHOST_STEP ? i <= GHOST_STEP : i < ending.step - 1)) return null;
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
                {ending.kind === "accept" && readQueueNo() > 0 && <small className="ending-found">{t(checkpoint.queueNo).replace("{n}", readQueueNo().toLocaleString("en-US"))}</small>}
                {ending.kind !== "ghost" && (
                  <small className="ending-found">
                    {ending.kind === "reject" ? t(ui.notRecorded) : t(ui.foundEndings).replace("{n}", String(Math.max(1, found.length)))}
                  </small>
                )}
                <ShareEnding kind={ending.kind} />
                <small className="ending-credit">
                  ♪ {ending.kind === "accept" ? "Habitual Suffering" : ending.kind === "reject" ? "an open ended promise" : "f-ALL"} · <a href={MUSIC_URL} target="_blank" rel="noopener noreferrer">{t(credits.music)}</a>
                </small>
                <div>
                  {ending.kind === "accept" ? (
                    <button
                      className="btn primary"
                      data-autofocus
                      onClick={() => {
                        // 다시 불러온 뒤 첫 화면(같은 '줄로 돌아가기' 버튼)을 건너뛰고 곧바로 줄에 선다
                        try {
                          sessionStorage.setItem(TO_LINE_KEY, "1");
                        } catch {}
                        location.reload();
                      }}
                    >
                      {t(checkpoint.reconnect)}
                    </button>
                  ) : (
                    <button className="btn" data-autofocus onClick={restart}>
                      {t(checkpoint.again)}
                    </button>
                  )}
                  {/* 수락 결말은 '줄로 돌아가기'가 주 버튼이고 웹사이트로는 보조 버튼이다 */}
                  <Link className={ending.kind === "accept" ? "btn" : "btn primary"} href="/" onClick={logout}>
                    {t(ending.kind === "accept" ? ui.toPortfolio : checkpoint.toPortfolio)}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {fade && <div className="fade">{t(fade === "up" ? ui.goingUp : ui.goingDown)}</div>}

      {gallery && <EndingGallery seen={memory} notesRead={notesRead} onClose={() => setGallery(false)} />}
      {intro && !gallery && (
        <div className="intro">
          <div className="panel pink" role="dialog" aria-modal="true" aria-label={t(ui.title)} tabIndex={-1}>
            <div className="panel-head">
              <h2 className="glitch">{t(ui.title)}</h2>
              <LangToggle />
            </div>
            {accepted ? <p>{t(ui.welcomeB)}</p> : ui.introLines.map((l, i) => <p key={i}>{t(l)}</p>)}
            {found.length > 0 && <p className="intro-found">{t(ui.foundEndings).replace("{n}", String(found.length))}</p>}
            {(seenCount > 0 || notesRead.length > 0) && (
              <button type="button" className="intro-gallery" onClick={() => setGallery(true)}>
                {t(galleryUi.open).replace("{n}", String(seenCount))} →
              </button>
            )}
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
                    document.documentElement.requestFullscreen?.({ navigationUI: "hide" }).then(() => { ownedFullscreen.current = true; }).catch(() => {});
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

// 조준점 (globals.css .reticle). 좌표 원점이 화면 가운데
function Reticle({ on, color }: { on: boolean; color?: string }) {
  return (
    <div className={`reticle${on ? " on" : ""}`} style={on && color ? { color } : undefined} aria-hidden>
      <svg viewBox="-22 -22 44 44">
        <circle r="1.6" fill="currentColor" />
        <g className="r-tick" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
          <line x1="0" y1="-5" x2="0" y2="-10" />
          <line x1="0" y1="5" x2="0" y2="10" />
          <line x1="-5" y1="0" x2="-10" y2="0" />
          <line x1="5" y1="0" x2="10" y2="0" />
        </g>
        <g className="r-ring" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M -9.9 -9.9 A 14 14 0 0 1 9.9 -9.9" />
          <path d="M 9.9 9.9 A 14 14 0 0 1 -9.9 9.9" />
        </g>
        <g className="r-brk" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M -19 -12 V -19 H -12" />
          <path d="M 12 -19 H 19 V -12" />
          <path d="M 19 12 V 19 H 12" />
          <path d="M -12 19 H -19 V 12" />
        </g>
      </svg>
    </div>
  );
}

// 대사가 한 글자씩 써진다. 써지는 동안 말하는 이의 소리가 몇 글자마다 작게 난다.
// 계속(E·버튼)이나 대사를 누르면 먼저 한 줄을 다 보여 준다. 남은 글자는 자리만 차지해(보이지 않게) 줄바꿈이 흔들리지 않는다.
// 화면 효과 줄이기·동작 줄이기에서는 곧바로 다 보인다
const typing = {
  done: true,
  skip: () => {},
  // 써지는 중이었으면 끝까지 보이고 true
  finish() {
    if (this.done) return false;
    this.skip();
    return true;
  },
};
function Typed({ text, voice = "none" }: { text: string; voice?: Voice }) {
  const chars = useMemo(() => Array.from(text), [text]);
  const instant = input.calm;
  const [n, setN] = useState(instant ? chars.length : 0);
  useEffect(() => {
    if (instant) {
      typing.done = true;
      return;
    }
    let i = 0;
    let said = 0;
    typing.done = false;
    const stop = () => {
      clearInterval(iv);
      typing.done = true;
    };
    typing.skip = () => {
      i = chars.length;
      setN(i);
      stop();
    };
    const iv = setInterval(() => {
      i = Math.min(chars.length, i + 1);
      setN(i);
      const ch = chars[i - 1];
      // 글자 몇 개마다 (빈칸·문장부호는 건너뛴다)
      if (voice !== "none" && ch && /[\p{L}\p{N}]/u.test(ch) && ++said % 4 === 0) sfx.tick(voice);
      if (i >= chars.length) stop();
    }, 32);
    return () => {
      clearInterval(iv);
      typing.done = true;
    };
  }, [chars, instant, voice]);
  return (
    <span onClick={() => typing.finish()}>
      {chars.slice(0, n).join("")}
      {n < chars.length && <span className="typed-rest" aria-hidden>{chars.slice(n).join("")}</span>}
    </span>
  );
}

// 소리를 그 자리에서: 시점 기준으로 좌우·거리
function at3d(pos: { x: number; z: number }, play: () => void) {
  spatial({ x: player.pos.x, z: player.pos.z, yaw: player.yaw }, pos, play);
}
// 대화 상대의 자리에서 (가까이 선 상대: 대개 정면이지만 옆에 있으면 옆에서)
let talkPos: { x: number; z: number } | null = null;
function voiceAt(v: Voice) {
  if (talkPos) at3d(talkPos, () => sfx.voice(v));
  else sfx.voice(v);
}

// 결말 공유: 이 결말의 미리보기 카드가 붙는 주소(?end=)를 건넨다. 휴대폰은 공유 창, 아니면 복사
function ShareEnding({ kind }: { kind: EndKind }) {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = `${location.origin}/deleteseoul?end=${kind}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "DELETE SEOUL", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2400);
    } catch {}
  };
  return (
    <button type="button" className="ending-share" onClick={share}>
      {t(done ? ui.shared : ui.share)} ↗
    </button>
  );
}
