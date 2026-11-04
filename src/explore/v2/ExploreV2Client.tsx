"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { useLang, LangToggle } from "@/components/LangProvider";
import World from "../World";
import { emptyFace } from "../faceAuth";
import { input } from "../input";
import { player, teleport } from "../Player";
import { gaze, resetGaze } from "../gaze";
import { restoreCovers } from "../Jabi";
import { requestLock, useLookAndKeys, Joystick, JumpButton } from "../TouchControls";
import { BUNKER, CITY, type Interactable, type Zone, type ZoneDef } from "../zones";
import {
  advanceStory, atLeast, eraseStory, initialStory, readStory, remember,
  storyObjective, writeStory, type MemoryFlag, type StoryEvent, type StoryV2,
} from "./story";
import styles from "./ExploreV2.module.css";

type Localized = { ko: string; en: string };
type Action = { label: Localized; run: () => void };
type Dialog = { title: Localized; lines: Localized[]; actions?: Action[] };
type Ending = "deleted" | "kept" | "left" | null;
const say = (ko: string, en: string): Localized => ({ ko, en });
const SAN = say("이산", "San");
const SYSTEM = say("기록 단말", "Record terminal");

const named: Record<string, Localized> = {
  keeper: say("관리인", "Caretaker"),
  r07: say("R-07", "R-07"),
  kid: say("그림 그리는 아이", "Child"),
  radio: say("무전수", "Radio operator"),
  monk: say("스님", "Monk"),
  dj: say("음향 담당", "Sound engineer"),
  sleeper: say("잠든 사람", "Sleeper"),
};

export default function ExploreV2Client() {
  const { lang } = useLang();
  const tr = useCallback((s: Localized) => s[lang === "en" ? "en" : "ko"], [lang]);
  const root = useRef<HTMLElement>(null);
  const labelEls = useRef<Record<string, HTMLDivElement | null>>({});
  const [story, setStory] = useState<StoryV2>(initialStory);
  const storyRef = useRef(story);
  storyRef.current = story;
  const [ready, setReady] = useState(false);
  const [zone, setZone] = useState<Zone>("bunker");
  const [arrived, setArrived] = useState(false);
  const [intro, setIntro] = useState(true);
  const [panel, setPanel] = useState<Dialog | null>(null);
  const [paused, setPaused] = useState(false);
  const [touch, setTouch] = useState(false);
  const [near, setNear] = useState<Interactable | null>(null);
  const nearRef = useRef(near);
  nearRef.current = near;
  const [ending, setEnding] = useState<Ending>(null);
  const [dead, setDead] = useState(false);
  const dying = useRef(false);
  const [gauge, setGauge] = useState({ meter: 0, hidden: false });
  const [tracked, setTracked] = useState(false);
  const face = useMemo(() => emptyFace(), []);

  // Prototype uses the existing 3D meshes but owns its own interaction gates.
  // ZoneDef objects must remain stable: Player resets its position if they change.
  const bunker = useMemo<ZoneDef>(() => ({
    ...BUNKER,
    items: BUNKER.items
      .filter(it => ["keeper", "r07", "kid", "radio", "monk", "dj", "sleeper", "statue", "face-machine", "audit-machine", "audit-guarantor", "exit"].includes(it.id))
      .map(it => ({
        ...it,
        label: it.id === "face-machine" ? say("원본 자화상 장치", "Original portrait device")
          : it.id === "audit-machine" ? say("기억 보관 장치", "Memory archive")
          : it.id === "audit-guarantor" ? say("관리자 기록 단말", "Control archive") : it.label,
        when: () => {
          const phase = storyRef.current.phase;
          if (it.id === "face-machine") return phase === "recovery";
          if (it.id === "audit-machine") return phase === "origin";
          if (it.id === "audit-guarantor") return phase === "restored";
          return true;
        },
      })),
  }), []);

  const city = useMemo<ZoneDef>(() => ({
    ...CITY,
    items: CITY.items.filter(it => it.id === "checkpoint" || it.id === "hatch"),
  }), []);

  useEffect(() => {
    const saved = readStory();
    storyRef.current = saved;
    setStory(saved);
    if (atLeast(saved, "crossing")) setZone("city");
    if (saved.phase === "kept") setEnding("kept");
    if (saved.phase === "left") setEnding("left");
    setTouch(navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches);
    resetGaze();
    setReady(true);
    return () => { gaze.enabled = false; gaze.frozen = false; resetGaze(); restoreCovers(); };
  }, []);

  const commit = useCallback((event: StoryEvent) => {
    const next = advanceStory(storyRef.current, event);
    storyRef.current = next;
    setStory(next);
    writeStory(next);
  }, []);

  const rememberFlag = useCallback((flag: MemoryFlag) => {
    const next = remember(storyRef.current, flag);
    storyRef.current = next;
    setStory(next);
    writeStory(next);
  }, []);

  const lock = useCallback(() => { if (!touch) requestLock(root.current); }, [touch]);
  const closeDialog = useCallback(() => { setPanel(null); lock(); }, [lock]);
  const show = useCallback((title: Localized, lines: Localized[], actions?: Action[]) => {
    setPanel({ title, lines, actions });
  }, []);
  const moveToCity = useCallback(() => {
    commit("enter-city");
    setPanel(null);
    setArrived(true);
    setNear(null);
    resetGaze();
    setZone("city");
    lock();
  }, [commit, lock]);

  const visit = useCallback((it: Interactable) => {
    const s = storyRef.current;
    if (it.id === "keeper") {
      if (atLeast(s, "discovered")) show(named.keeper, [
        say("……봤구나. 말했으면 네가 여기까지 와 줬겠어?", "…You found out. Would you have come this far if we had told you?"),
        say("우리도 살고 싶었어. 그렇다고 네게 선택권을 빼앗은 일이 사라지는 건 아니지.", "We wanted to live. It doesn't excuse taking your choice away."),
      ]);
      else show(named.keeper, [
        say("어서 와. 여긴 도시가 잘 보지 못하는 곳이야.", "Welcome. The city rarely sees what happens down here."),
        say("가운데 있는 이산에게도 인사해 줘. 오래 기다렸거든.", "Go say hello to San in the middle. He's been waiting."),
      ]);
      return;
    }
    if (it.id === "r07") {
      if (s.memories.r07Friend) {
        show(named.r07, atLeast(s, "discovered") ? [
          say("친구에게 불리한 계획을 도왔습니다. 친구라는 관계를 취소해야 합니까?", "I helped a plan that hurt my friend. Should I cancel our friendship?"),
        ] : [say("친구님, 또 오셨군요. 친구 사이에도 기록이 필요합니까?", "My friend, you're back. Do friends need records too?")]);
      } else {
        show(named.r07, [
          say("R-07입니다. 현재 인간관계 기능을 시험 중입니다.", "I am R-07. My friendship module is in testing."),
          say("저와 친구가 되어 주시겠습니까?", "Would you like to be my friend?"),
        ], [
          { label: say("친구가 된다", "Become friends"), run: () => { rememberFlag("r07Friend"); show(named.r07, [say("친구 등록 완료. 이 기록을 잘 보관하겠습니다.", "Friendship recorded. I will keep this memory safe.")]); } },
          { label: say("나중에", "Maybe later"), run: closeDialog },
        ]);
      }
      return;
    }
    if (it.id === "kid") {
      if (!s.memories.childDrawing) rememberFlag("childDrawing");
      show(named.kid, [
        say("네 얼굴을 그렸어. 얼굴 부분은 비워 놨어.", "I drew you. I left your face blank."),
        say("넌 화면 밖에 있잖아. 어떻게 생겼는지 모르니까.", "You're on the other side of the screen. I don't know what you look like."),
      ]);
      return;
    }
    if (it.id === "radio") {
      if (!s.memories.radioHeard) rememberFlag("radioHeard");
      show(named.radio, [
        say("이 소리, 그쪽에서도 들려? 네 스피커에서도?", "Can you hear this over there? Through your speakers?"),
        say("연결이 끊기면 넌 다시 들어오면 되겠지. ……부럽다.", "If we lose connection, you can just come back. …Lucky you."),
      ]);
      return;
    }
    if (it.id === "monk") {
      if (!s.memories.monkClue) rememberFlag("monkClue");
      show(named.monk, [
        say("만든 자와 만들어진 자는 서로를 닮아도 같은 사람은 아니지.", "The maker and the made may resemble each other, but they are not the same."),
        say("그대는 누군가의 세계를 지운 적이 있는가?", "Have you ever erased someone's world?"),
      ]);
      return;
    }
    if (it.id === "dj" || it.id === "sleeper") {
      show(named[it.id], [it.id === "dj"
        ? say("이곳에서 가장 무서운 소리는 침묵이야.", "Silence is the scariest sound down here.")
        : say("……다음 업데이트에도 깨워 줘.", "…Wake me up in the next update.")]);
      return;
    }
    if (it.id === "statue") {
      if (s.phase === "arrival") {
        commit("meet-san");
        show(SAN, [
          say("……너는 밖에서 왔구나.", "…You came from outside."),
          say("내 얼굴과 기억이 나뉘어 있어. 두 장치를 확인해 줄래?", "My face and memory have been separated. Could you inspect those two devices?"),
        ]);
      } else if (s.phase === "discovered") {
        commit("confront-san");
        show(SAN, [
          say("그래. 나도 이산이야. 하지만 2026년의 이산이 아니야.", "Yes. I am San. But I am not the San from 2026."),
          say("나를 만든 사람이 이 세계도 만들었어. 난 이 안에서 61년을 살았지.", "My creator made this world too. I have lived 61 years inside it."),
          say("네가 밖에 있다는 걸 알았어. 네가 여길 지울 수 있다는 것도.", "I knew you were outside. I knew you could erase this place."),
          say("처음부터 말하지 않았어. 네가 떠날까 봐.", "I hid it from you. I was afraid you'd leave."),
        ]);
      } else if (atLeast(s, "confronted")) {
        show(SAN, [
          say("나를 못 믿겠다면 대자비에게 가서 확인해. 무엇이 지워지는지.", "If you don't trust me, go to Great Compassion. See what will be erased."),
          say("나는 이 세계에서 나갈 수 없어. 너는 나갈 수 있지.", "I cannot leave this world. You can."),
        ]);
      } else if (atLeast(s, "restored")) {
        show(SAN, [say("……고마워. 관리자 기록이 잠깐 열린 것 같아.", "…Thank you. I think the control archive has unlocked.")]);
      } else show(SAN, [say("원본을 찾고 기억을 복원해 줘.", "Find the original, then restore my memory.")]);
      return;
    }
    if (it.id === "face-machine" && s.phase === "recovery") {
      commit("read-origin");
      show(SYSTEM, [
        say("원본: SAN LEE. 제작 연도: 2026.", "Original: SAN LEE. Created: 2026."),
        say("실행 중인 자화상과 원본 제작자의 일치 여부를 확인할 수 없습니다.", "The running portrait cannot be confirmed as identical to its creator."),
        say("기억 보관 장치가 활성화되었습니다.", "Memory archive unlocked."),
      ]);
      return;
    }
    if (it.id === "audit-machine" && s.phase === "origin") {
      commit("restore-san");
      show(SYSTEM, [
        say("시민 기록: 동의. 실제 입력: 거부. 기록이 수정되었습니다.", "Citizen record: ACCEPT. Actual input: REJECT. The record was altered."),
        say("삭제 실패. 외부 원본이 존재하여 정지 상태로 격리되었습니다.", "Deletion failed. External original exists. Subject quarantined."),
        say("격리가 일시 해제되었습니다.", "Quarantine temporarily lifted."),
      ]);
      return;
    }
    if (it.id === "audit-guarantor" && s.phase === "restored") {
      commit("discover-source");
      show(SYSTEM, [
        say("DELETE SEOUL · 제작자 SAN LEE · 2026.", "DELETE SEOUL · Creator SAN LEE · 2026."),
        say("무명사 내부 계획: 외부 방문자를 이용한 세계 초기화.", "Shelter plan: use an outside visitor to reset the world."),
        say("삭제는 대자비뿐 아니라 관계, 기억, 복원된 이산까지 초기화합니다.", "Erasure resets not only Great Compassion, but relationships, memories and restored San."),
        say("계획을 알고 있었던 주민: 다수. 방문자에게 고지하지 않음.", "Most residents knew. The visitor was not informed."),
        say("이산에게 직접 물어보세요.", "Ask San directly."),
      ]);
      return;
    }
    if (it.id === "exit") {
      if (s.phase !== "confronted") {
        show(say("지상 출입문", "Surface exit"), [say("지금은 밖으로 나갈 이유가 없어. 이곳에서 조금 더 알아보자.", "There is still something to learn here.")]);
      } else {
        show(say("지상 출입문", "Surface exit"), [
          say("대자비의 중앙 단말에는 삭제되는 기록의 범위가 남아 있습니다.", "The central terminal lists exactly which records will be erased."),
          say("직접 확인하겠습니까?", "Will you see for yourself?"),
        ], [
          { label: say("대자비에게 간다", "Go to Great Compassion"), run: moveToCity },
          { label: say("이 세계를 떠난다", "Leave this world"), run: () => { commit("leave"); setPanel(null); setEnding("left"); } },
          { label: say("조금 더 둘러본다", "Stay a little longer"), run: closeDialog },
        ]);
      }
      return;
    }
    if (it.id === "hatch") {
      show(say("배전실 출입구", "Substation hatch"), [say("무명사로 돌아가는 길이다. 이제 진실을 확인할 차례야.", "The shelter lies below. It's time to find out the truth.")]);
      return;
    }
    if (it.id === "checkpoint" && s.phase === "crossing") {
      commit("reach-core");
      show(say("大慈悲 · 중앙 기록", "Great Compassion · Central Archive"), [
        say("방문자님, 여기까지 오셨군요.", "Visitor, you've made it this far."),
        say("이산은 저를 지워 달라고 했습니까? 그의 설명이 정확했는지 확인해 보십시오.", "Did San ask you to erase me? Please review what he told you."),
        say("삭제할 수 있는 것은 당신의 브라우저에 저장된 이 세계의 진행 기록입니다. 프로그램과 다른 방문자의 세계는 남습니다.", "Only this world's progress stored in your browser can be erased. The program and other visitors remain."),
      ]);
      return;
    }
  }, [closeDialog, commit, moveToCity, rememberFlag, show]);

  const interact = useCallback((it: Interactable | null) => {
    if (!it || panel || intro || paused || ending || dead) return;
    if (it.when && !it.when()) return;
    visit(it);
  }, [panel, intro, paused, ending, dead, visit]);

  const onTap = useCallback((id: string) => {
    if (!touch) return;
    const def = zone === "bunker" ? bunker : city;
    const item = def.items.find(it => it.id === id);
    if (!item) return;
    if (Math.hypot(item.pos.x - player.pos.x, item.pos.z - player.pos.z) > item.radius + 2) return;
    interact(item);
  }, [touch, zone, bunker, city, interact]);

  const active = ready && !intro && !panel && !paused && !ending && !dead;
  useLookAndKeys(root, () => interact(nearRef.current), active, (locked) => {
    if (!locked && active && !touch) setPaused(true);
  });

  useEffect(() => {
    gaze.enabled = zone === "city" && active && story.phase === "crossing";
    // A modal must actually stop the attack, not only hide the gauge.
    if (!active && zone === "city") { gaze.meter = Math.min(gaze.meter, 50); }
    if (zone !== "city") resetGaze();
    return () => { gaze.enabled = false; };
  }, [zone, active, story.phase]);

  useEffect(() => {
    if (zone !== "city" || story.phase !== "crossing" || ending) return;
    const timer = window.setInterval(() => {
      setGauge({ meter: Math.round(gaze.meter), hidden: !!gaze.hiddenBy });
      if (gaze.dead && !dying.current) {
        dying.current = true;
        setDead(true);
        gaze.enabled = false;
        window.setTimeout(() => {
          teleport.req = { x: 0, z: 7, yaw: 0 };
          restoreCovers();
          resetGaze();
          dying.current = false;
          setDead(false);
        }, 1700);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [zone, story.phase, ending]);

  const resetLab = useCallback(() => {
    eraseStory();
    const fresh = initialStory();
    storyRef.current = fresh;
    setStory(fresh);
    setZone("bunker");
    setArrived(false);
    setEnding(null);
    setPanel(null);
    setIntro(true);
    setPaused(false);
    resetGaze();
    restoreCovers();
  }, []);

  const keep = useCallback(() => {
    commit("keep-record");
    setEnding("kept");
    setPanel(null);
  }, [commit]);

  const erase = useCallback(() => {
    eraseStory();
    setPanel(null);
    setEnding("deleted");
    resetGaze();
  }, []);

  const mem = story.memories;
  const deletionLines = [
    say("대자비 감시 기록", "Great Compassion's surveillance records"),
    say("이산의 복원 상태", "San's restored state"),
    ...(mem.r07Friend ? [say("R-07 · 친구", "R-07 · Friendship")] : []),
    ...(mem.childDrawing ? [say("아이 · 얼굴 없는 초상화", "Child · Faceless portrait")] : []),
    ...(mem.radioHeard ? [say("무전수 · 들었던 음악", "Radio operator · A song you heard")] : []),
    ...(mem.monkClue ? [say("스님 · 대화 기록", "Monk · Conversation")] : []),
    say("당신이 이곳에서 남긴 선택과 기억", "Your choices and memories here"),
  ];

  if (!ready) return <main ref={root} className="explore-root" />;
  return (
    <main ref={root} className={`explore-root ${styles.root}`}>
      <div className="canvas-wrap">
        <World
          zone={zone}
          playerZone={zone === "bunker" ? bunker : city}
          lang={lang}
          visited={[]}
          face={face}
          facePhase="idle"
          audit={{ solved: false, litAt: atLeast(story, "restored") ? 1 : 0 }}
          onTap={onTap}
          onNear={setNear}
          onTracked={setTracked}
          labelEls={labelEls}
          awake={atLeast(story, "restored")}
          hideSan
          arrived={arrived}
        />
      </div>

      <header className={styles.top}>
        <Link href="/">SAN LEE</Link>
        <strong>DELETE SEOUL <span>2087 / V2 LAB</span></strong>
        <div className={styles.topRight}>
          <LangToggle />
          <button type="button" onClick={() => { setPaused(true); document.exitPointerLock?.(); }} aria-label={tr(say("일시정지", "Pause"))}>Ⅱ</button>
        </div>
      </header>
      <div className={styles.objective} role="status">
        <span>{tr(say("현재 목표", "OBJECTIVE"))}</span>
        {tr(storyObjective[story.phase === "left" ? "arrival" : story.phase])}
      </div>
      {zone === "city" && story.phase === "crossing" && !ending && (
        <div className={styles.gaze}>
          <span>{tr(say("大慈悲 · 자비의 시선", "GREAT COMPASSION · GAZE"))} {tracked ? "●" : ""}</span>
          <div className={styles.gaugeTrack}><div style={{ width: `${gauge.meter}%` }} /></div>
          <small>{gauge.hidden ? tr(say("엄폐 중", "HIDDEN")) : tr(say("시선에 주의하세요", "STAY OUT OF SIGHT"))}</small>
        </div>
      )}
      {active && near && <button type="button" className={styles.prompt} onClick={() => interact(near)}>E · {tr(near.label)}</button>}
      {active && !near && <div className={styles.hint}>{tr(say("WASD 이동 · 마우스 시선 · E 상호작용", "WASD move · Mouse look · E interact"))}</div>}
      {active && touch && <><Joystick /><JumpButton action={near ? { label: tr(near.label), run: () => interact(near) } : null} /></>}

      {intro && (
        <div className={`intro ${styles.overlay}`}>
          <div className={`panel ${styles.card}`}>
            <div className={styles.eyebrow}>SAN LEE · 2026</div>
            <h1>DELETE SEOUL</h1>
            <p>{tr(say("2026년의 포트폴리오에 접속했습니다. 화면 속 서울은 2087년입니다.", "You opened a portfolio from 2026. The Seoul on screen is in 2087."))}</p>
            <p>{tr(say("무명사의 누군가가 당신을 기다리고 있습니다.", "Someone in the shelter has been waiting for you."))}</p>
            <button type="button" className={styles.primary} onClick={() => { setIntro(false); lock(); }}>{tr(say("접속하기", "CONNECT"))}</button>
          </div>
        </div>
      )}
      {panel && (
        <div className={styles.overlay}>
          <div className={`panel ${styles.card}`} role="dialog" aria-modal="true">
            <div className={styles.eyebrow}>{tr(panel.title)}</div>
            {panel.lines.map((line, index) => <p key={index}>{tr(line)}</p>)}
            <div className={styles.actions}>
              {panel.actions ? panel.actions.map((action, index) => (
                <button type="button" className={index === 0 ? styles.primary : styles.secondary} key={index} onClick={action.run}>{tr(action.label)}</button>
              )) : <button type="button" className={styles.primary} onClick={closeDialog}>{tr(say("계속", "CONTINUE"))}</button>}
            </div>
          </div>
        </div>
      )}
      {story.phase === "decision" && !panel && !ending && (
        <div className={styles.overlay}>
          <div className={`panel ${styles.card} ${styles.inventory}`} role="dialog" aria-modal="true">
            <div className={styles.eyebrow}>{tr(say("大慈悲 · 삭제 대상 확인", "GREAT COMPASSION · ERASURE PREVIEW"))}</div>
            <h2>{tr(say("무엇이 사라지는가?", "What will disappear?"))}</h2>
            <ul>{deletionLines.map((line, index) => <li key={index}>{tr(line)}</li>)}</ul>
            <p>{tr(say("이 브라우저의 게임 기록만 삭제됩니다. 세계의 프로그램과 다른 방문자의 기록은 그대로 남습니다.", "Only this browser's game record will be removed. The program and other visitors remain."))}</p>
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={keep}>{tr(say("기록을 남긴다", "KEEP THE RECORD"))}</button>
              <button className={styles.danger} onClick={erase}>{tr(say("DELETE SEOUL", "DELETE SEOUL"))}</button>
            </div>
          </div>
        </div>
      )}
      {dead && (
        <div className={styles.overlay}><div className={`panel ${styles.card}`}>
          <div className={styles.eyebrow}>{tr(say("大慈悲 · 복원 중", "GREAT COMPASSION · RESTORING"))}</div>
          <h2>{tr(say("당신은 다시 시작할 수 있습니다.", "You can try again."))}</h2>
          <p>{tr(say("우리 시민들은 그렇지 못합니다.", "Our citizens cannot."))}</p>
        </div></div>
      )}
      {paused && !panel && !intro && !ending && (
        <div className={styles.overlay}><div className={`panel ${styles.card}`}>
          <div className={styles.eyebrow}>{tr(say("일시정지", "PAUSED"))}</div>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => { setPaused(false); lock(); }}>{tr(say("계속하기", "RESUME"))}</button>
            <button className={styles.secondary} onClick={resetLab}>{tr(say("실험판 처음부터", "RESTART LAB"))}</button>
            <Link className={styles.secondary} href="/">{tr(say("포트폴리오로", "PORTFOLIO"))}</Link>
          </div>
        </div></div>
      )}
      {ending && (
        <div className={styles.overlay}>
          <div className={`panel ${styles.card}`} role="dialog" aria-modal="true">
            <div className={styles.eyebrow}>ENDING · {ending === "kept" ? "RECORD" : ending === "deleted" ? "DELETE" : "EXIT"}</div>
            <h2>{tr(ending === "kept"
              ? say("당신은 이 서울을 기억하기로 했습니다.", "You chose to remember this Seoul.")
              : ending === "deleted"
                ? say("당신은 서울의 기록을 지웠습니다.", "You erased the record of Seoul.")
                : say("모든 이야기의 끝을 지켜볼 의무는 없습니다.", "You do not have to see every story through."))}</h2>
            <p>{tr(ending === "deleted"
              ? say("다시 접속하면 R-07은 처음처럼 친구가 되어 달라고 묻겠지요.", "When you return, R-07 will ask to be your friend again.")
              : say("화면 밖으로 나가도 당신이 경험한 일은 당신의 기억에 남습니다.", "You carry the memory of what you experienced beyond the screen."))}</p>
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={resetLab}>{tr(say("다시 시작", "RESTART"))}</button>
              <Link className={styles.primary} href="/">{tr(say("작품 밖으로", "LEAVE THE WORLD"))}</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
