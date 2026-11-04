"use client";

import { sfx } from "./sfx";
import { duckBgm, playBgm, wakeBgm } from "./bgm";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RESTORE_KEY } from "@/components/RestoreCrossing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sections, works, type L, type SectionId } from "@/data/site";
import { LangToggle, useLang } from "@/components/LangProvider";
import SectionBody from "@/components/SectionBody";
import { MUSIC_URL, credits, announcements, auditScenes, auditUi, testUi, checkpoint, faceScenes, faceUi, npcStages, jabiUi, speakers, type Line, whisper, keeperAfterDeath, npcs, plaque, quest, sanAfterDeath, sanCityLines, statueLines, ui, type Beat } from "./story";
import { CITY, JABI, QUEUE_Z, ZONES, type Interactable, type Zone } from "./zones";
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
import RecordProtectionStatus from "./RecordProtectionStatus";
import { protection } from "./recordProtection";
import { getCitizenRecords, recordCitizenActivity, syncCitizenRecords, type ActivityResult } from "./citizenRecords";
import { FACE_KEY, emptyFace, executeFace, loadFace, rotateDrum, saveFace, seamJoined, type FaceMethod, type FaceState } from "./faceAuth";
import { faceRt, setFacePhase, type FacePhase } from "./faceRuntime";
import { clearAudit, emptyAudit, finishAudit, loadAudit, moveSeal, resetSeal, restPhase, saveAudit, seeIntro, undoSeal, type AuditPhase, type AuditState } from "./recordAudit";
import { auditRt, resetAuditRt, setAuditPhase } from "./auditRuntime";
import { AUDIT_GRID, AUDIT_MACHINE, AUDIT_SCREEN, GUARANTOR, auditPoint } from "./zones";
import SealPanel from "./SealPanel";
import PauseTest from "./PauseTest";
import InteractionGuide from "./InteractionGuide";
import { TEST_KEY, applyRestart, testStart } from "./puzzleTest";
import type { AuditView } from "./World";
import { playLines } from "./dialogue";

const World = dynamic(() => import("./World"), { ssr: false });

const KEY = "sanlee-visited";
const END_KEY = "sanlee-ending";
const MET_KEY = "sanlee-met";
const TALK_KEY = "sanlee-san-talked";
const LOGIN_KEY = "sanlee-last-login";
const PROMISE_KEY = "sanlee-promise";
const FORGOT_KEY = "sanlee-forgotten";
const FOUND_KEY = "sanlee-endings-found";

function unregisteredVisit(ghost: boolean) {
  if (ghost) return true;
  try {
    return localStorage.getItem(FORGOT_KEY) !== null;
  } catch {
    return false;
  }
}

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
  // 범종을 쳤는데 보호가 끝난 뒤 선택하려 할 때: 기록이 남는다는 확인
  | { kind: "faceConfirm"; method: FaceMethod }
  // 퍼즐 B: 기록 보관 장치의 봉인 격자 (2D 조작판)
  | { kind: "seal" }
  | null;

type EndKind = "accept" | "reject" | "ghost";
type Ending = { kind: EndKind; step: number; a: number; r: number; slots: number[] } | null;
// 결말 대본의 각 줄이 머무는 시간(ms). 마지막 줄 다음에 버튼이 나온다
const BEAT_MS: Record<EndKind, number[]> = {
  accept: [2600, 3200, 3800, 3200],
  reject: [2800, 3400, 3800, 4800, 3400],
  ghost: [3000, 3600, 4600, 4600],
};
// 수락한 시민이 다시 들어오면 서게 되는 줄 속 자리
// 줄 한가운데, 두 사람 사이. 여기서는 문 너머로 금빛이 된 대자비의 얼굴이 보인다
const LINE_SPOT = { x: 3.6, z: (QUEUE_Z[44] + QUEUE_Z[45]) / 2 };

// 기록 보관 장치의 두 곳(방 좌표): 위의 공식 기록 화면, 가운데의 봉인 격자. 도입·전환 때 카메라가 바라본다
const xyz = (v: { x: number; y: number; z: number }) => ({ x: v.x, y: v.y, z: v.z });
const officialPoint = () => xyz(auditPoint(AUDIT_SCREEN.x, AUDIT_SCREEN.y, AUDIT_SCREEN.z));
const sealPoint = () => xyz(auditPoint(AUDIT_GRID.x, AUDIT_GRID.y, AUDIT_GRID.z));
const SAN_FACE = { x: 0, y: 3, z: 0.3 };
// 테스트 재시작 뒤 서는 자리: B 기계 정면 2.4m, 기계를 바라본다
const B_TEST_SPOT = {
  x: AUDIT_MACHINE.pos[0] + Math.sin(AUDIT_MACHINE.rotY) * 2.4,
  z: AUDIT_MACHINE.pos[2] + Math.cos(AUDIT_MACHINE.rotY) * 2.4,
  yaw: AUDIT_MACHINE.rotY,
};
const A_TEST_SPOT = { x: 0, z: 6.5, yaw: 0 };

export default function ExploreClient() {
  const { t, lang } = useLang();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [touch, setTouch] = useState(false);
  const [intro, setIntro] = useState(true);
  const [zone, setZone] = useState<Zone>("bunker");
  const [panel, setPanel] = useState<Panel>(null);
  // 퍼즐 A: 진행 저장(face)과 연출 단계(facePhase)는 시민 활동 기록과 분리되어 있다
  const faceProtectionIntended = useRef(false);
  const [face, setFace] = useState<FaceState>(emptyFace);
  const faceRef = useRef(face);
  faceRef.current = face;
  const updateFace = useCallback((next: FaceState) => {
    saveFace(next);
    faceRef.current = next;
    faceRt.drums = next.drums;
    faceRt.method = next.method;
    setFace(next);
  }, []);
  const [facePhase, setFacePhaseState] = useState<FacePhase>("idle");
  const toPhase = useCallback((p: FacePhase) => {
    setFacePhase(p);
    setFacePhaseState(p);
  }, []);
  // 화면 아래 자막: 장치·도시·이산의 말
  const [faceLine, setFaceLine] = useState<Line | null>(null);
  // 시제품의 끝을 알리는 카드
  const [faceEnd, setFaceEnd] = useState(false);
  const faceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((ms: number, fn: () => void) => {
    faceTimers.current.push(setTimeout(fn, ms));
  }, []);
  const [canAdvanceLine, setCanAdvanceLine] = useState(false);
  const advanceLineRef = useRef<(() => void) | null>(null);
  const advanceLineAt = useRef(0);
  const lineEvents = useMemo(() => ({
    show: setFaceLine,
    later,
    waitForAdvance: (next: (() => void) | null) => {
      advanceLineRef.current = next;
      if (next) advanceLineAt.current = performance.now();
      setCanAdvanceLine(!!next);
    },
  }), [later]);
  const playStoryLines = useCallback((lines: Line[], done: () => void, gap = 0) =>
    playLines(lines, lineEvents, done, gap, "manual"), [lineEvents]);
  const faceCine = facePhase === "restored" || facePhase === "twist" || facePhase === "applying" || facePhase === "wake";
  // 퍼즐 B: 진행 저장(audit)과 장치의 연출 단계(auditPhase). 시민 활동 기록은 버튼을 누르는 순간에만 따로 판정한다
  const [audit, setAudit] = useState<AuditState>(emptyAudit);
  const auditRef = useRef(audit);
  auditRef.current = audit;
  const updateAudit = useCallback((next: AuditState) => {
    saveAudit(next);
    auditRef.current = next;
    setAudit(next);
  }, []);
  const [auditPhase, setAuditPhaseState] = useState<AuditPhase>("dormant");
  const toAuditPhase = useCallback((p: AuditPhase) => {
    setAuditPhase(p);
    setAuditPhaseState(p);
  }, []);
  const [auditView, setAuditView] = useState<AuditView>({ solved: false, litAt: 0 });
  // 2D 조작판이 닫히는 중 (확대가 풀리며 3D로 돌아간다)
  const [sealClosing, setSealClosing] = useState(false);
  // 이번 방문에서 원본을 꺼낸 행동이 시민 활동 기록에 남았는지 (끝 카드에 한 줄로 보여 준다)
  const auditRecs = useRef<ActivityResult["status"][]>([]);
  // 도입, 조작판으로 다가가고 물러나는 전환, 원본 판독 뒤의 마무리는 연출이다 (걸을 수 없다)
  const auditCine = auditPhase === "intro" || auditPhase === "focus" || auditPhase === "reveal";
  const cine = faceCine || auditCine;
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
  // ?debug: 설정창에 테스트 재시작이 보인다 (일반 방문자에게는 없다)
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    setDebug(new URLSearchParams(location.search).has("debug"));
  }, []);
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
  const complete = (visited.length >= sections.length && face.legacy) || ghost;
  // 실행 시점에만 시민 기록을 판정한다. 기존 방문·진행 저장은 이 경로와 분리한다.
  const commitActivity = useCallback((kind: string, sourceId: string) => recordCitizenActivity(
    { kind, sourceId }, { zone, unregistered: unregisteredVisit(ghost) },
  ), [zone, ghost]);

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
    const f = loadFace();
    faceRef.current = f;
    faceRt.drums = f.drums;
    faceRt.method = f.method;
    setFace(f);
    // 이미 끝낸 저장은 깨어난 상태로, 맞춰 놓고 고르지 않은 저장은 선택 단계로 바로 돌아온다
    toPhase(f.legacy || f.method ? "done" : f.solved ? "choice" : "idle");
    // 퍼즐 B: 저장된 단계로 돌아온다. 봉인판은 마지막 배치 그대로, 끝냈다면 원본은 꺼내져 있고 보증 장치가 켜진 채로
    const a = loadAudit();
    auditRef.current = a;
    setAudit(a);
    toAuditPhase(restPhase(f, a));
    auditRt.pos = { ...a.seal.pos };
    auditRt.poweredAt = 0;
    auditRt.introSeen = a.intro;
    setAuditView({ solved: a.solved, litAt: a.solved ? 1 : 0 });
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
        // 기존 경로에서만 터미널이 인증 진행이다. 새 경로에서 터미널은 작품을 보는 곳일 뿐이다
        if (faceRef.current.legacy) showToast(`${t(ui.restored)} · ${next.length}/${sections.length}`);
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
      setArrived(viaDoor);
      setTracked(false);
      // 배전실 문을 나서는 순간 도시가 위치를 기억한다. 첫 기억에는 '계속 걸으면 동의' 한 줄이 따라 나온다
      // 방공호에서 방문 기록을 지웠다면 도시는 아무것도 기억하지 않고, 자비도 플레이어를 보지 못한다
      if (to === "city") {
        // 세계관 속 중앙 동기화를 클라이언트 데이터로 표현한다. 네트워크 전송은 없다.
        if (!unregisteredVisit(ghostRef.current)) syncCitizenRecords();
        if (ghostRef.current) gaze.mood = "blind";
        else if (viaDoor) setTimeout(() => saveBackup(CITY.spawn.pos[0], CITY.spawn.pos[2]), 700);
      }
      setTimeout(() => setFade(null), 500);
    }, 900);
  }, []);

  // 퍼즐 A: 바라보는 원통을 한 칸 돌린다. 다 맞으면 장치가 잠기고, 도시가 끼어든 뒤 두 조작부가 켜진다
  const turnDrum = useCallback(
    (i: number) => {
      if (faceRt.phase !== "idle") return;
      const cur = faceRef.current;
      const next = rotateDrum(cur, i);
      if (next === cur) return;
      faceRt.turnedAt[i] = performance.now();
      updateFace(next);
      sfx.ratchet();
      setTimeout(() => sfx.clunk(), 380);
      const joined = ([0, 1] as const).some((seam) => seamJoined(next.drums, seam) && !seamJoined(cur.drums, seam));
      if (!next.solved) {
        if (joined) setTimeout(() => sfx.seam(), 440);
        return;
      }
      // 마지막 조각이 걸리는 순간부터 기계가 스스로 움직인다
      toPhase("restored");
      // 잠김 → 장치의 말 → 도시의 반전 → 두 조작부. 각 단계는 앞 대사가 끝나야 넘어간다
      later(450, () => {
        sfx.faceLock();
        playLines(faceScenes.lock, lineEvents, () => {
          toPhase("twist");
          sfx.cityVoice();
          playLines(faceScenes.twist, lineEvents, () => toPhase("choice"));
        });
      });
    },
    [updateFace, toPhase, later, lineEvents]
  );

  // 퍼즐 A가 끝나면 시제품 끝 카드 대신 곁의 기록 보관 장치에 불이 들어오며 퍼즐 B의 도입이 이어진다
  const finishWake = useCallback(() => {
    toPhase("done");
    gaze.frozen = false;
    gaze.lookAt = null;
    duckBgm(false);
    toAuditPhase(restPhase(faceRef.current, auditRef.current));
    // A가 끝나도 강제로 B로 시선을 돌리지 않는다. 플레이어가 기록 장치를 찾아 직접 열면 도입한다.
  }, [toPhase, toAuditPhase]);
  // 이산이 고개를 든다: 카메라가 천천히 이산을 바라보고, 두세 마디 뒤 시제품의 끝 카드
  const startWake = useCallback(
    (method: FaceMethod) => {
      toPhase("wake");
      sfx.wake();
      duckBgm(true);
      gaze.frozen = true;
      gaze.lookAt = { x: 0, y: 3, z: 0.3 };
      setFaceLine(null);
      // 고개를 드는 동안은 말없이, 그다음 이산의 대사. 마지막 줄이 끝나면 끝 카드
      later(3800, () => playLines(faceScenes.wake[method], lineEvents, finishWake));
    },
    [toPhase, later, lineEvents, finishWake]
  );

  // 최종 선택. 이 순간에만 시민 활동 기록을 판정한다 (범종 보호 중이면 기록이 생기지 않는다)
  const chooseFace = useCallback(
    (method: FaceMethod, confirmed = false) => {
      if (faceRt.phase !== "choice") return;
      const cur = faceRef.current;
      const intended = faceProtectionIntended.current;
      const result = executeFace(cur, method, intended, protection.isProtected(), confirmed);
      if (result.status === "expired") {
        setPanel({ kind: "faceConfirm", method });
        return;
      }
      if (result.status !== "success") return;
      const rec = recordCitizenActivity({ kind: "face.authenticate", sourceId: method }, { zone, unregistered: unregisteredVisit(ghostRef.current), requireProtection: intended && !confirmed });
      if (rec.status === "protection-expired") {
        setPanel({ kind: "faceConfirm", method });
        return;
      }
      faceProtectionIntended.current = false;
      // 퍼즐 A의 기록 여부는 끝 카드 대신 짧은 알림으로
      if (rec.status === "protected") showToast(t(faceUi.recProtected));
      else if (rec.status === "recorded") showToast(t(faceUi.recRecorded));
      setPanel(null);
      updateFace(result.state);
      toPhase("applying");
      if (method === "standard") sfx.press();
      else sfx.lever();
      playLines(faceScenes.apply[method], lineEvents, () => startWake(method));
    },
    [zone, updateFace, toPhase, startWake, lineEvents, showToast, t]
  );

  // ---------------- 퍼즐 B 「봉인된 3초」 v0.7 ----------------
  // 도입(공식 기록 → 이산의 의문과 부탁 → 봉인된 원본) → 장치에 다가가 2D 봉인 격자 → 원본 배출·판독 → 3D로 돌아와 이산의 말 → 보증 장치
  const syncSeal = useCallback((a: AuditState) => {
    auditRt.pos = { ...a.seal.pos };
  }, []);
  const releaseCamera = useCallback(() => {
    gaze.frozen = false;
    gaze.lookAt = null;
    duckBgm(false);
  }, []);

  // B 장치를 직접 열었을 때만: 추적 쿠키 동의 기록의 모순을 보여주고
  // 원본 보관함을 짧게 비춘 뒤, 별도의 두 번째 조작 없이 바로 2D 퍼즐로 이어진다.
  const startIntro = useCallback(() => {
    if (auditRt.phase !== "ready" || auditRef.current.intro) return;
    toAuditPhase("intro");
    auditRt.poweredAt = performance.now();
    auditRt.focus = "official";
    sfx.clunk();
    duckBgm(true);
    gaze.frozen = true;
    gaze.lookAt = officialPoint();
    later(650, () =>
      playStoryLines(auditScenes.official, () =>
        // 이산의 대사 중에도 기록 화면에 시선을 두어 '거부 vs 동의'를 읽을 수 있게 한다.
        playStoryLines(auditScenes.ask, () => {
          gaze.lookAt = sealPoint();
          auditRt.focus = "sealed";
          sfx.sealBump();
          later(600, () =>
            playStoryLines(auditScenes.sealed, () => {
              auditRt.introSeen = true;
              updateAudit(seeIntro(auditRef.current));
              auditRt.focus = null;
              toAuditPhase("ready");
              // Give back movement after the story. The player now chooses to open
              // the puzzle using the device's clearly marked interaction target.
              releaseCamera();
            })
          );
        })
      )
    );
  }, [toAuditPhase, later, playStoryLines, updateAudit, releaseCamera]);

  // 장치에 다가간다: 카메라가 봉인 격자로 다가가고 2D 조작판이 열린다 (이동·점프·조이스틱은 멈춘다)
  const openSeal = useCallback(() => {
    // The reveal must play before the device can be opened; no premature 2D panel.
    if (auditRt.phase !== "ready" || !auditRef.current.intro) return;
    toAuditPhase("focus");
    gaze.frozen = true;
    gaze.lookAt = sealPoint();
    sfx.sealGrab();
    later(550, () => {
      if (auditRt.phase !== "focus") return;
      toAuditPhase("puzzle");
      setPanel({ kind: "seal" });
    });
  }, [toAuditPhase, later]);
  // 나가기: 확대가 풀리며 3D로 돌아간다. 진행은 저장되어 있어 다시 들어오면 그대로다
  const closeSeal = useCallback(() => {
    if (auditRt.phase !== "puzzle") return;
    toAuditPhase("focus");
    setSealClosing(true);
    later(380, () => {
      setSealClosing(false);
      setPanel(null);
      later(250, () => {
        if (auditRt.phase !== "focus") return;
        toAuditPhase("ready");
        releaseCamera();
      });
    });
  }, [toAuditPhase, later, releaseCamera]);
  const closeSealRef = useRef(closeSeal);
  closeSealRef.current = closeSeal;

  // 봉인판 하나를 민다. 규칙에 맞는 이동만 저장한다. 원본이 배출구에 닿는 순간 추가 입력 없이 해결
  const sealMove = useCallback(
    (id: string, to: number) => {
      if (auditRt.phase !== "puzzle") return false;
      const next = moveSeal(auditRef.current, id, to);
      if (!next) return false;
      updateAudit(next);
      syncSeal(next);
      if (next.solved) {
        // 퍼즐 진행 저장과 별개로, 봉인된 원본을 꺼낸 행동을 시민 활동으로 판정한다 (범종 보호 중이면 남지 않는다)
        const rec = recordCitizenActivity({ kind: "audit.extract", sourceId: "original-input" }, { zone, unregistered: unregisteredVisit(ghostRef.current) });
        auditRecs.current.push(rec.status);
        toAuditPhase("reveal");
        duckBgm(true);
      }
      return true;
    },
    [zone, updateAudit, syncSeal, toAuditPhase]
  );
  const sealUndo = useCallback(() => {
    const cur = auditRef.current;
    if (auditRt.phase !== "puzzle" || !cur.seal.history.length) return;
    const next = undoSeal(cur);
    updateAudit(next);
    syncSeal(next);
    sfx.sealSlide(1);
  }, [updateAudit, syncSeal]);
  const sealReset = useCallback(() => {
    const cur = auditRef.current;
    if (auditRt.phase !== "puzzle" || !cur.seal.history.length) return;
    const next = resetSeal(cur);
    updateAudit(next);
    syncSeal(next);
    sfx.sealStop();
  }, [updateAudit, syncSeal]);

  const finishAuditFlow = useCallback(() => {
    updateAudit(finishAudit(auditRef.current));
    toAuditPhase("done");
    releaseCamera();
    setFaceEnd(true);
  }, [updateAudit, toAuditPhase, releaseCamera]);

  // 2D에서 원본 판독이 끝나면: 조작판이 닫히고 3D로 → 꺼낸 원본 → 이산 (다리는 그대로 돌) → 두 마디 → 보증 장치 → 시제품 끝
  const finishReveal = useCallback(() => {
    if (auditRt.phase !== "reveal") return;
    setSealClosing(true);
    later(380, () => {
      setSealClosing(false);
      setPanel(null);
      auditRt.ejectedAt = performance.now();
      setAuditView((v) => ({ ...v, solved: true }));
      gaze.frozen = true;
      gaze.lookAt = sealPoint();
      later(1100, () => {
        gaze.lookAt = SAN_FACE;
      });
      // 원본과 공식 기록의 차이가 드러난 뒤, '강제 정정'의 주체가 도시임을
      // 도시 자신의 짧고 차가운 안내로 확인시킨다. 이산의 독백과 C 예고는 유지.
      later(2300, () => {
        sfx.cityVoice();
        playStoryLines(auditScenes.forced, () =>
          playStoryLines(
            auditScenes.san,
            () =>
              later(900, () => {
                const at = performance.now();
                setAuditView((v) => ({ ...v, litAt: at }));
                sfx.guarantor();
                gaze.lookAt = { x: GUARANTOR.pos[0], y: 1.5, z: GUARANTOR.pos[2] };
                later(700, () => playStoryLines(auditScenes.guarantor, () => later(700, finishAuditFlow)));
              }),
            1400
          )
        );
      });
    });
  }, [later, playStoryLines, finishAuditFlow]);

  // First B approach: start the world/story reveal at ~6m, well *before* the
  // record machine's 3.6m interaction range. The button is not usable until
  // this cutscene has finished. Reopening a completed intro skips this sequence.
  useEffect(() => {
    if (zone !== "bunker" || auditPhase !== "ready" || audit.intro || facePhase !== "done") return;
    const watch = setInterval(() => {
      if (!activeRef.current || gaze.frozen) return;
      if (Math.hypot(AUDIT_MACHINE.pos[0] - player.pos.x, AUDIT_MACHINE.pos[2] - player.pos.z) <= 6) {
        startIntro();
      }
    }, 180);
    return () => clearInterval(watch);
  }, [zone, auditPhase, audit.intro, facePhase, startIntro]);

  useEffect(() => () => faceTimers.current.forEach(clearTimeout), []);

  const interact = useCallback(
    (it: Interactable) => {
      // 얼굴이 잠기고 이산이 깨어나는 동안, 기록 검증 장치가 움직이는 동안에는 다른 것을 건드리지 않는다
      if (cine) return;
      switch (it.kind) {
        case "face":
          if (it.id === "face-machine") turnDrum(faceRt.aim);
          else if (it.id === "face-std") chooseFace("standard");
          else if (it.id === "face-keep") chooseFace("exception");
          break;
        case "audit":
          if (it.id === "audit-machine") openSeal();
          else if (it.id === "audit-guarantor") setPanel({ kind: "dialog", name: it.label, lines: [auditUi.guarantorLook], step: 0 });
          break;
        case "bell":
          if (zone !== "bunker") break;
          if (protection.ring()) {
            // 얼굴을 맞춘 뒤 고르기 전에 쳤다면, 최종 선택을 보호하려는 뜻으로 본다
            if (faceRt.phase === "restored" || faceRt.phase === "twist" || faceRt.phase === "choice") faceProtectionIntended.current = true;
            sfx.gong();
          } else {
            showToast(t({ ko: "보호 장치가 준비 중입니다", en: "The protection device is not ready yet" }));
          }
          break;
        case "section":
          // 작품 터미널은 처음부터 열려 있다 (얼굴 복원 진행과 무관)
          setPanel({ kind: "section", id: it.section! });
          // 기억으로 깨어난 사람은 터미널을 열어도 기록이 남지 않는다
          if (!ghost) {
            markVisited(it.section!);
            commitActivity("terminal.open", it.section!);
          }
          break;
        case "painting":
          setPanel({ kind: "painting", work: it.work! });
          break;
        case "statue":
          // 얼굴 복원 경로: 굳어 있을 때는 상태만, 깨어난 뒤에는 이산과 짧게 이야기한다
          if (!complete && !face.legacy && !unregisteredVisit(ghost) && it.id === "statue") {
            setMet(true);
            try {
              localStorage.setItem(MET_KEY, "1");
            } catch {}
            if (face.method && faceRt.phase === "done") setPanel({ kind: "dialog", name: { ko: "이산", en: "San" }, lines: auditRef.current.solved ? auditScenes.after : faceScenes.after[face.method], step: 0 });
            else setPanel({ kind: "dialog", name: plaque[0], lines: [faceUi.frozen], step: 0 });
            break;
          }
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
            // 터미널 수로 깨어나는 대사는 기존 경로에서만. 새 경로에서는 첫 인사만 (터미널은 작품 보관함일 뿐이다)
            setPanel({ kind: "dialog", name: plaque[0], lines: statueLines[face.legacy ? Math.min(visited.length, statueLines.length - 2) : 0], step: 0, plaque: true, whisper: blank });
            setMet(true);
            try {
              localStorage.setItem(MET_KEY, "1");
            } catch {}
          }
          break;
        case "npc": {
          const n = npcs[it.npc!];
          // 새 경로에서는 퍼즐 A·B 진행에 맞는 대사를 쓴다 (없으면 원래 대사). 기존 저장은 원래 대사 그대로
          const stage = !face.method ? "a" : auditRef.current.solved ? "c" : "b";
          const staged = !complete && !face.legacy ? npcStages[it.npc!]?.[stage] : undefined;
          const base = staged ?? (complete && n.after ? n.after : n.lines);
          // 한 번이라도 보관 처리됐다면 관리인은 알아본다
          const bk = getBackup();
          const lines = it.npc === "keeper" && bk.deaths > 0 ? [keeperAfterDeath, ...base] : base;
          setPanel({ kind: "dialog", name: n.name, lines, step: 0, link: n.link });
          break;
        }
        case "door":
          // 이산을 깨우기 전에는 방공호 밖으로 나갈 수 없다
          // 터미널을 다 열었어도, 풀려난 이산과 이야기하기 전에는 함께 나갈 동행이 없다
          if (it.to === "city" && !talked && !face.legacy && !complete) {
            // 시제품은 방공호에서 끝난다. 새 경로에는 아직 지상으로 나갈 동행이 없다
            setPanel({ kind: "dialog", name: it.label, locked: true, lines: [ui.exitLocked[0], faceUi.doorLocked], step: 0 });
            break;
          }
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
    [complete, talked, goTo, markVisited, visited.length, ghost, found.length, zone, showToast, t, commitActivity, face, turnDrum, chooseFace, cine, openSeal]
  );

  const startEndingRef = useRef<(k: EndKind) => void>(() => {});
  const testRestartRef = useRef<(from: "a" | "b") => void>(() => {});

  // 3D 물체를 직접 탭한 경우: 너무 멀면 무시
  const onTap = useCallback(
    (id: string) => {
      // PC에서는 클릭이 마우스 잠금·상호작용(E)으로 쓰이므로 물체 직접 탭은 터치 화면에서만
      if (!touch || panel || intro || fade || ending || paused || faceEnd) return;
      // 원통을 직접 누르면 그 원통이 돈다 (터치 화면)
      if (id.startsWith("face-drum-")) {
        const n = Number(id.slice(-1));
        if (faceRt.near) {
          faceRt.aim = n;
          turnDrum(n);
        }
        return;
      }
      const it = ZONES[zone].items.find((i) => i.id === id);
      if (!it || (it.when && !it.when())) return;
      const d = Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z);
      const touchReach = it.radius + (it.kind === "npc" ? 2 : it.kind === "statue" ? 1.5 : 0.8);
      if (d > touchReach) return;
      interact(it);
    },
    [touch, panel, intro, fade, ending, paused, zone, interact, faceEnd, turnDrum]
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
      // ?debug에서만 제공: 보호 중에도 진행 저장은 기존 UI 경로로 별도 확인한다.
      recordProtection: { snapshot: protection.snapshot },
      citizenRecords: { read: getCitizenRecords, commit: (sourceId: string) => commitActivity("debug.action", sourceId) },
      // 읽기 전용: 테스트가 실제 입력으로 플레이하면서 상태를 확인한다
      face: { rt: () => ({ ...faceRt, drums: [...faceRt.drums] }), state: () => faceRef.current },
      audit: { rt: () => ({ ...auditRt }), state: () => auditRef.current },
      restartA: () => testRestartRef.current("a"),
      restartB: () => testRestartRef.current("b"),
    };
  }, [goTo, commitActivity]);

  const active = !intro && !panel && !fade && !ending && !paused && !faceEnd;
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
  const faceEndRef = useRef(faceEnd);
  faceEndRef.current = faceEnd;
  const faceEndAt = useRef(0);
  useEffect(() => {
    if (faceEnd) faceEndAt.current = performance.now();
  }, [faceEnd]);
  const closeFaceEnd = useCallback(() => {
    setFaceEnd(false);
    lock();
  }, [lock]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (performance.now() - unlockAt.current < 250) return; // 잠금 해제와 같은 Esc
        // 봉인 격자는 '나가기'와 같다 (원본을 판독하는 동안에는 닫히지 않는다)
        if (panelRef.current?.kind === "seal") closeSealRef.current();
        else if (panelRef.current) setPanel(null);
        else if (faceEndRef.current) closeFaceEnd();
        else if (pausedRef.current) resume();
        else if (activeRef.current) setPaused(true);
        return;
      }
      const p = panelRef.current;
      // Cinematic narrative: E / Enter advances one subtitle (Space remains jump); the player
      // controls reading speed. Never advances the scene on the input that opened it.
      if (!p && !e.repeat && (e.code === "KeyE" || e.code === "Enter") &&
          advanceLineRef.current && performance.now() - advanceLineAt.current > 180) {
        e.preventDefault();
        advanceLineRef.current();
        return;
      }
      if ((e.code === "KeyE" || e.code === "Enter") && !e.repeat && !p && faceEndRef.current && performance.now() - faceEndAt.current > 600) {
        e.preventDefault();
        closeFaceEnd();
        return;
      }
      if (e.code === "KeyE" && !e.repeat && p?.kind === "dialog" && performance.now() - panelAt.current > 250) {
        e.preventDefault();
        if (p.step < p.lines.length - 1) setPanel({ ...p, step: p.step + 1 });
        else closePanel();
        return;
      }
      // 작업·글·소개 패널, 그림 보기는 E로 바로 닫는다 (닫기 버튼과 같음)
      if (e.code === "KeyE" && !e.repeat && p && (p.kind === "section" || p.kind === "painting") && performance.now() - panelAt.current > 250) {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resume, closePanel, closeFaceEnd]);

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
  // 이산이 '그 문장'을 남긴 순간: 웹사이트 꼬리말의 delete seoul 간판이 이때부터 켜진다
  const promiseLine = sanCityLines[sanCityLines.length - 1];
  // 처음 들었을 때는 대화가 끝난 뒤 '숨은 결말이 열렸다'는 알림을 띄운다
  const [unlock, setUnlock] = useState<"pending" | "show" | null>(null);
  useEffect(() => {
    if (panel?.kind === "dialog" && panel.lines[panel.step] === promiseLine)
      try {
        if (localStorage.getItem(PROMISE_KEY) === null) setUnlock("pending");
        localStorage.setItem(PROMISE_KEY, "1");
      } catch {}
    if (!panel && unlock === "pending") {
      sfx.chime();
      setUnlock("show");
    }
  }, [panel, promiseLine, unlock]);
  useEffect(() => {
    if (unlock !== "show") return;
    const h = setTimeout(() => setUnlock(null), 9000);
    return () => clearTimeout(h);
  }, [unlock]);
  const [flash, setFlash] = useState(false);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!ending) return;
    const { kind, step } = ending;
    // 마지막 줄에 닿으면 발견한 결말로 남긴다 (거부 결말은 기록을 지우므로 제외)
    if (kind === "accept" && step === BEAT_MS[kind].length) {
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
      if (step === 3) {
        // 장면이 방공호로: 사람들이 두 번째 동상을 옮겨 놓았다
        setFlash(false);
        setSecondStatue(true);
        goTo("bunker", false);
      }
      if (step === 5) {
        // 이 결말은 저장되지 않는다: 진행 기록을 실제로 지운다
        try {
          [KEY, END_KEY, MET_KEY, TALK_KEY].forEach((k) => localStorage.removeItem(k));
        } catch {}
        wipeBackup();
      }
    } else if (kind === "ghost") {
      if (step === 0) {
        // 쿠키 설정에서 방문 기록을 전부 지웠다: 도시도 자비도 이 사람을 알아보지 못한다
        // 기록을 지운다. 다음 방문까지 남기지 않도록 '삭제됨' 표시도 남기지 않고 깨끗이 비운다
        wipeBackup();
        gaze.mood = "blind";
        try {
          localStorage.removeItem(FORGOT_KEY);
        } catch {}
      }
      // 3번째 줄(이산의 말)에서 굳어 가던 화면이 풀리고, 다음 줄에서 둘이 문을 지나 걸어 나간다
      if (step === 3) autoWalk.to = { x: 0, z: -177, speed: 4.6, pitch: 0.78 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endStep]);

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

  // 퍼즐 A·B의 React 상태와 3D 런타임을 함께 되돌린다. 남아 있던 타이머·대사·컷신은 모두 끊는다 (저장은 부르는 쪽이 먼저 한다)
  const resetPuzzleRuntime = (f: FaceState, a: AuditState) => {
    faceTimers.current.forEach(clearTimeout);
    faceTimers.current = [];
    faceProtectionIntended.current = false;
    advanceLineRef.current = null;
    setCanAdvanceLine(false);
    setFaceLine(null);
    setFaceEnd(false);
    faceRef.current = f;
    faceRt.drums = f.drums;
    faceRt.method = f.method;
    faceRt.wokeAt = 0;
    faceRt.turnedAt = [0, 0, 0];
    setFace(f);
    toPhase(f.legacy || f.method ? "done" : f.solved ? "choice" : "idle");
    auditRef.current = a;
    setAudit(a);
    resetAuditRt();
    auditRt.introSeen = a.intro;
    auditRt.pos = { ...a.seal.pos };
    setAuditView({ solved: a.solved, litAt: a.solved ? 1 : 0 });
    setSealClosing(false);
    toAuditPhase(restPhase(f, a));
    auditRecs.current = [];
    gaze.frozen = false;
    gaze.lookAt = null;
    duckBgm(false);
  };
  testRestartRef.current = (from) => testRestart(from);
  const resetProgress = () => {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(END_KEY);
      localStorage.removeItem(MET_KEY);
      localStorage.removeItem(TALK_KEY);
      localStorage.removeItem(FACE_KEY);
      sessionStorage.removeItem(TEST_KEY);
    } catch {}
    clearAudit();
    setVisited([]);
    setMet(false);
    setTalked(false);
    // 퍼즐 A·B도 처음으로 (진행 기록을 지운 뒤라 기존 경로가 아닌 새 경로로 시작한다)
    resetPuzzleRuntime(loadFace(), emptyAudit());
  };
  // 개발·검수용 재시작 (?debug). 다른 진행(방문한 터미널, 결말, 백업, 웹사이트 기록)은 건드리지 않는다
  const testRestart = (from: "a" | "b") => {
    const { face: f, audit: a } = applyRestart(from);
    clearScene();
    setPanel(null);
    setPaused(false);
    setEnding(null);
    setGhost(false);
    setIntro(false);
    resetPuzzleRuntime(f, a);
    const spot = from === "a" ? A_TEST_SPOT : B_TEST_SPOT;
    if (zone !== "bunker") {
      goTo("bunker", false);
      setTimeout(() => (teleport.req = spot), 1000);
    } else teleport.req = spot;
    showToast(t(testUi.done));
    lock();
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
    // 테스트 재시작 뒤 새로고침: B부터라면 B 기계 앞에서 (B를 아직 건드리지 않았을 때만)
    if (testStart() === "b" && !auditRef.current.intro && !auditRef.current.solved) setTimeout(() => (teleport.req = B_TEST_SPOT), 300);
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
      // 얼굴 복원 경로: 장치 하나만 가리킨다. 이산이 깨어나면 시제품이 끝나 화살표를 거둔다
      if (!complete && !face.legacy) {
        if (faceCine || auditCine) return null;
        // 장치 하나만, 멀리 있을 때만 가리킨다. 다가가면 화살표를 거두고 기계 자체를 보게 한다 (부품별 안내는 없다)
        const target = faceRt.phase !== "done" ? find("face-machine") : auditRt.phase === "ready" ? find("audit-machine") : null;
        if (!target || Math.hypot(target.pos.x - px, target.pos.z - pz) < 2.15) return null;
        return { pos: target.pos, label: t(faceRt.phase !== "done" ? faceUi.quest : auditUi.quest) };
      }
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
  const sanAwake = complete || (!face.legacy && !!face.method && facePhase === "done");
  // 퍼즐 A 장치는 부품 이름표·조작 안내를 띄우지 않는다 (모바일 행동 버튼만 짧은 보조 라벨). B 장치는 다른 물건처럼 아래 프롬프트 하나
  const puzzlePart = near?.kind === "face";
  const verb = near ? (
    near.kind === "audit" ? (near.id === "audit-machine" ? { ko: "기록 열기", en: "Open records" } : ui.view)
    : near.kind === "face" ? (near.id === "face-machine" ? { ko: "원통 돌리기", en: "Rotate drum" } : near.id === "face-std" ? { ko: "표준 적용", en: "Apply standard" } : { ko: "원본 유지", en: "Keep original" })
    : near.kind === "bell" ? { ko: "종 울리기", en: "Ring bell" }
    : near.id.startsWith("scope") || near.kind === "painting" ? ui.view
    : near.kind === "npc" || near.kind === "statue" ? ui.talk : ui.open
  ) : null;
  // 바라보는 대상의 이름 · 동사. 두 버튼은 조준한 쪽 이름으로
  const nearText = near && verb
    ? puzzlePart
      ? t(verb)
      : `${t(near.id === "statue" && sanAwake ? { ko: "이산", en: "San" } : near.label)} · ${t(verb)}`
    : "";
  const nearColor = near?.color;
  const rootClass = [
    "explore-root",
    ending ? `ending-${ending.kind}` : "",
    ending?.kind === "reject" && ending.step >= 3 ? "thaw" : "",
    ending?.kind === "ghost" && ending.step === 1 ? "ghost-freeze" : "",
    flash ? "final-flash" : "",
    tracked && !ending ? "is-tracked" : "",
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
            face={face}
            facePhase={facePhase}
            audit={auditView}
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
          {face.legacy && <span className="hud-progress">{visited.length}/{sections.length}</span>}
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
      {!intro && !ending && zone === "bunker" && <RecordProtectionStatus nearBell={near?.kind === "bell"} />}

      {toast && <div className="toast">{toast}</div>}
      {!intro && !ending && !accepted && <SaveToast />}
      {notice && !panel && <div className="notice">{t(notice)}</div>}
      {unlock === "show" && !panel && (
        <div className="unlock-toast" role="status" onClick={() => setUnlock(null)}>
          <b>{t(ui.unlockTitle)}</b>
          <span>{t(ui.unlockBody)}</span>
        </div>
      )}

      {active && !cine && near && verb && !touch && !puzzlePart && (
        <button type="button" className="prompt" onClick={() => interact(near)} style={{ borderColor: nearColor, color: nearColor }}>
          {!touch && <kbd>{locked ? "E / Click" : "E"}</kbd>}
          <span>{nearText}</span>
        </button>
      )}

      {active && !near && !cine && !faceLine && <div className="hint">{t(touch ? ui.hintTouch : locked ? ui.hintLocked : ui.hintPc)}</div>}
      {active && locked && <div className="crosshair" aria-hidden />}
      {active && !cine && <QuestArrow get={getQuest} />}
      {!intro && !ending && <Minimap zone={zone} get={getQuest} />}
      {zone === "city" && !ending && !accepted && <GazeHUD rootRef={rootRef} onGone={onGone} onIntro={startJabiIntro} onStage={onStage} />}
      {active && !cine && touch && <Joystick />}
      <InteractionGuide active={active && touch && !cine && !!near} color={nearColor} />
      {active && !cine && touch && (
        <JumpButton
          action={
            near && verb && !cine
              ? {
                  label: t(verb),
                  color: nearColor,
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
          test={debug ? <PauseTest onA={() => testRestart("a")} onB={() => testRestart("b")} /> : undefined}
        />
      )}

      {faceLine && zone === "bunker" && (
        <div className={`face-line who-${faceLine.speaker} ${canAdvanceLine ? "manual" : ""}`} role="status" aria-live="polite" data-line={faceLine.id}>
          <b>{t(speakers[faceLine.speaker])}</b>
          <span>{t(faceLine)}</span>
          {canAdvanceLine && (
            <button
              type="button"
              className="face-line-next"
              aria-label={t(ui.next)}
              onClick={() => { if (performance.now() - advanceLineAt.current > 180) advanceLineRef.current?.(); }}
            >
              {t(ui.next)}
            </button>
          )}
        </div>
      )}
      {panel?.kind === "faceConfirm" && (
        <div className="panel-wrap">
          <div className="panel dialog face-confirm" role="dialog" aria-modal="true" aria-labelledby="face-confirm-title">
            <div className="speaker" id="face-confirm-title">{t(faceUi.expiredTitle)}</div>
            <p className="line">{t(faceUi.expiredBody)}</p>
            <div className="panel-actions">
              <button className="btn" onClick={closePanel}>
                {t(faceUi.expiredBack)}
              </button>
              <button className="btn primary" autoFocus onClick={() => chooseFace(panel.method, true)}>
                {t(faceUi.expiredGo)}
              </button>
            </div>
          </div>
        </div>
      )}
      {panel?.kind === "seal" && (
        <SealPanel
          lang={lang}
          pos={audit.seal.pos}
          canUndo={audit.seal.history.length > 0}
          solved={audit.solved}
          closing={sealClosing}
          onMove={sealMove}
          onUndo={sealUndo}
          onReset={sealReset}
          onExit={() => {
            closeSeal();
            lock();
          }}
          onRevealDone={finishReveal}
        />
      )}
      {faceEnd && !panel && (
        <div className="face-end-wrap">
          <div className="face-end" role="dialog" aria-modal="true" aria-labelledby="face-end-title">
            <span className="face-end-tag">{t(auditUi.endTag)}</span>
            <h2 id="face-end-title">{t(auditUi.endTitle)}</h2>
            <p>{t(auditUi.endBody)}</p>
            <ul className="face-end-meta">
              <li>{t(face.method === "standard" ? faceUi.endStandard : faceUi.endException)}</li>
              {auditRecs.current.length > 0 && <li>{t(auditRecs.current.includes("recorded") ? auditUi.recRecorded : auditRecs.current.every((r) => r === "protected") ? auditUi.recProtected : faceUi.recNone)}</li>}
              <li>{t(auditUi.endNext)}</li>
              <li>{t(faceUi.endWorks)}</li>
            </ul>
            <div className="panel-actions">
              <Link href="/" className="btn" onClick={logout}>
                {t(faceUi.endHome)}
              </Link>
              <button className="btn primary" autoFocus onClick={closeFaceEnd}>
                {t(faceUi.endStay)}
              </button>
            </div>
          </div>
        </div>
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
            {ending.step >= (checkpoint[ending.kind] as Beat[]).length - 1 && (
              <div className="ending-actions">
                <small>{t(ending.kind === "accept" ? checkpoint.endingAccept : ending.kind === "reject" ? checkpoint.endingReject : checkpoint.endingGhost)}</small>
                <small className="ending-found">
                  {ending.kind !== "accept" ? t(ui.notRecorded) : t(ui.foundEndings).replace("{n}", String(Math.max(1, found.length)))}
                </small>
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
