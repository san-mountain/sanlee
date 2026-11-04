"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { useLang, LangToggle } from "@/components/LangProvider";
import World from "../World";
import { emptyFace } from "../faceAuth";
import { input } from "../input";
import { player, teleport } from "../Player";
import { autoWalk, gaze, resetGaze } from "../gaze";
import { restoreCovers, stopGazeCombat } from "../Jabi";
import { requestLock, useLookAndKeys, Joystick, JumpButton } from "../TouchControls";
import { BUNKER, CITY, type Interactable, type Zone, type ZoneDef } from "../zones";
import {
  advanceStory, atLeast, clueCount, sourceCount, inspectSource, observeClue, eraseStory, initialStory, readStory, remember,
  storyObjective, writeStory, type ClueFlag, type SourceFlag, type MemoryFlag, type StoryEvent, type StoryV2,
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
  const [debug, setDebug] = useState(false);
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
      .filter(it => ["keeper", "r07", "kid", "radio", "monk", "dj", "sleeper", "statue", "face-machine", "audit-machine", "audit-guarantor", "exit", "about", "writing", "works"].includes(it.id))
      .map(it => ({
        ...it,
        label: it.id === "face-machine" ? say("원본 자화상 장치", "Original portrait device")
          : it.id === "audit-machine" ? say("기억 보관 장치", "Memory archive")
          : it.id === "audit-guarantor" ? say("관리자 기록 단말", "Control archive") : it.label,
        when: () => {
          const phase = storyRef.current.phase;
          if (it.id === "face-machine") return phase === "recovery" && sourceCount(storyRef.current) >= 2;
          if (it.id === "audit-machine") return phase === "origin";
          if (it.id === "audit-guarantor") return phase === "evidence";
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
    if (saved.phase === "kept") { setEnding("kept"); setIntro(false); }
    if (saved.phase === "left") { setEnding("left"); setIntro(false); }
    setTouch(navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches);
    setDebug(new URLSearchParams(window.location.search).has("debug"));
    stopGazeCombat();
    gaze.mood = "";
    autoWalk.to = null;
    setReady(true);
    return () => { gaze.enabled = false; stopGazeCombat(); gaze.mood = ""; autoWalk.to = null; restoreCovers(); };
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

  const inspect = useCallback((flag: SourceFlag) => {
    const next = inspectSource(storyRef.current, flag);
    if (next === storyRef.current) return;
    storyRef.current = next;
    setStory(next);
    writeStory(next);
  }, []);

  const observe = useCallback((flag: ClueFlag) => {
    const next = observeClue(storyRef.current, flag);
    if (next === storyRef.current) return;
    storyRef.current = next;
    setStory(next);
    writeStory(next);
  }, []);

  const lock = useCallback(() => { if (!touch) requestLock(root.current); }, [touch]);
  const closeDialog = useCallback(() => {
    setPanel(null);
    if (storyRef.current.phase !== "decision") lock();
  }, [lock]);
  const show = useCallback((title: Localized, lines: Localized[], actions?: Action[]) => {
    setPanel({ title, lines, actions });
  }, []);
  const moveToCity = useCallback(() => {
    commit("enter-city");
    setPanel(null);
    setArrived(true);
    setNear(null);
    stopGazeCombat();
    gaze.mood = "";
    setZone("city");
    lock();
  }, [commit, lock]);

  const visit = useCallback((it: Interactable) => {
    const s = storyRef.current;
    if (it.id === "keeper") {
      if (s.phase === "restored") {
        commit("begin-investigation");
        show(named.keeper, [
          say("이산이 움직이자마자 기록이 조금씩 바뀌기 시작했어.", "The records began changing as soon as San moved."),
          say("고장인지 확인해 줄래? R-07, 아이, 무전수의 말이 서로 안 맞아.", "Could you check? R-07, the child, and the radio operator all remember things differently."),
          say("큰일은 아닐 거야. 아마.", "It's probably nothing. Probably."),
        ]);
      } else if (s.phase === "discovered") {
        commit("question-keeper");
        show(named.keeper, [
          say("……그 기록까지 읽었구나.", "…You read that far."),
          say("이산을 복원하면 대자비가 여기의 기억을 점검한다는 건 알고 있었어.", "We knew restoring San would trigger Great Compassion's memory inspection."),
          say("네가 그걸 막아 주길 바랐어. 위험을 말하면 떠날까 봐 숨겼지.", "We hoped you could stop it. We hid the danger, afraid you would leave."),
          say("이산은 네가 오기 전부터 준비했어. 나머지는 그에게 물어봐.", "San prepared long before you arrived. Ask him the rest."),
        ]);
      } else if (atLeast(s, "keeperQuestioned")) {
        show(named.keeper, [
          say("네게 대가를 숨긴 건 내 잘못이야.", "I was wrong to hide the cost from you."),
          say("아직 중앙에서 기록 정리 요청을 취소할 수 있을지도 몰라.", "There may still be time to cancel the purge at the central archive."),
        ]);
      } else if (s.phase === "investigating" || s.phase === "evidence") {
        show(named.keeper, [say("내 말을 믿지 말고, 그들이 기억하는 걸 직접 확인해 줘.", "Don't just take my word for it. Listen to what they remember.")]);
      } else {
        show(named.keeper, [
          say("어서 와. 여긴 한때 도시가 폐기한 자료실이었어.", "Welcome. This used to be a city records room."),
          say("지워진 것들의 잔상을 모아 놔. 그래서 잔상실이라고 부르지.", "We keep afterimages of erased things. That's why we call it the Afterimage Archive."),
          say("가운데 있는 이산에게도 인사해 줘. 오래 기다렸거든.", "Go say hello to San in the middle. He's been waiting."),
        ]);
      }
      return;
    }
    if (it.id === "r07") {
      if (s.phase === "investigating") {
        observe("r07");
        show(named.r07, [
          s.memories.r07Friend
            ? say("제 기록엔 친구가 한 명도 없습니다. 그런데 당신이 제 친구인 건 기억납니다.", "My register says I have no friends. But I remember you as my friend.")
            : say("오늘 방문자를 맞은 적이 없다고 합니다. 그런데 저는 방금 당신과 인사했어요.", "My register says no visitors today. But I just greeted you."),
          say("제 기억이 잘못된 걸까요? 관리인님은 장부가 정확하다고 합니다.", "Is my memory wrong? The caretaker says the register is correct."),
        ]);
      } else if (s.memories.r07Friend) {
        show(named.r07, atLeast(s, "discovered") ? [
          say("친구가 삭제 대상에 있습니다. 저는 그 결과가 마음에 들지 않습니다.", "Friendship is among the records for erasure. I do not like that."),
        ] : [say("친구님, 또 오셨군요. 친구 사이에도 기록이 필요합니까?", "My friend, you're back. Do friends need records too?")]);
      } else {
        show(named.r07, [
          say("저는 R-07입니다. 인간관계 기능을 시험 중입니다.", "I am R-07. My friendship module is in testing."),
          say("저와 친구가 되어 주시겠습니까?", "Would you like to be my friend?"),
        ], [
          { label: say("친구가 된다", "Become friends"), run: () => { rememberFlag("r07Friend"); show(named.r07, [say("친구 등록 완료. 잘 보관할게요.", "Friendship recorded. I'll keep this safe.")]); } },
          { label: say("나중에", "Maybe later"), run: closeDialog },
        ]);
      }
      return;
    }
    if (it.id === "kid") {
      if (!s.memories.childDrawing) rememberFlag("childDrawing");
      if (s.phase === "investigating") {
        observe("child");
        show(named.kid, [
          say("아까 네 얼굴을 그렸어. 근데 저장하고 나니까 빈 종이가 됐어.", "I drew your face earlier. But after saving it, the file turned blank."),
          say("그림은 여기 있는데, 기계는 처음부터 없었대.", "The drawing's here. The machine says it never existed."),
          say("내가 기억하는 게 틀린 걸까?", "Am I remembering it wrong?"),
        ]);
      } else show(named.kid, [
        say("네 얼굴을 그렸어. 얼굴 부분은 비워 놨어.", "I drew you. I left your face blank."),
        say("넌 화면 밖에 있잖아. 어떻게 생겼는지 모르니까.", "You're on the other side of the screen. I don't know what you look like."),
      ]);
      return;
    }
    if (it.id === "radio") {
      if (!s.memories.radioHeard) rememberFlag("radioHeard");
      if (s.phase === "investigating") {
        observe("radio");
        show(named.radio, [
          say("어제 녹음한 목소리가 오늘 아침엔 없어졌어. 대신 잡음이 남았지.", "The voice I recorded yesterday was gone by morning. Just static remained."),
          say("잡음 안에 아주 오래된 날짜가 찍혀 있어. 2026.", "Buried in the static is an old date: 2026."),
          say("……이산이 아까부터 안테나를 지켜보고 있더라.", "…San has been watching the antenna."),
        ]);
      } else show(named.radio, [
        say("그쪽에서도 들려? 네 스피커에서도?", "Can you hear this over there? Through your speakers?"),
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
          say("내 기억의 원본이 어디 있는지 찾을 수가 없어.", "I can't find the original of my memories."),
          say("저 낡은 전시 단말들에 오래된 나의 흔적이 있을 거야. 두 곳만 확인해 줄래?", "The old portfolio terminals may still hold traces of me. Could you check two of them?"),
        ]);
      } else if (s.phase === "keeperQuestioned") {
        commit("confront-san");
        show(SAN, [
          say("내가 처음 만들어졌을 땐 2026년이었어. 그걸 만든 사람도 이산이었지.", "When I was first made, it was 2026. My creator was named San too."),
          say("하지만 내게는 61년의 기억이 있어. 그에게는 없는 기억이야.", "But I carry 61 years of memories he never lived."),
          say("네가 오면 대자비의 기록 정리가 시작될 걸 알고 있었어. 널 붙잡아 두려고 위험을 숨겼지.", "I knew your visit would trigger a memory purge. I hid the danger to keep you here."),
          say("대자비는 원래대로 되돌리려 해. 나는 이 세계가 아예 다시 시작되길 바라고.", "Great Compassion wants things corrected. I want this world to start over entirely."),
          say("하지만 네가 여기서 지우기만 하면 R-07과 아이도 우리가 함께한 일을 잊어. 난 그걸 말하지 않았어.", "But if you erase it from outside, R-07 and the child lose what we shared. I never told you."),
          say("그들을 지키고 싶다면 대자비의 중앙 장치에서 정리 요청을 취소해야 해. 여기선 멈출 수 없어.", "If you want to save their memories, cancel the purge at Great Compassion's core. We cannot stop it here."),
        ]);
      } else if (s.phase === "discovered") {
        show(SAN, [say("……먼저 관리인에게 그 기록의 발신자를 물어봐.", "…Ask the caretaker who sent that request first.")]);
      } else if (atLeast(s, "confronted")) {
        show(SAN, [
          say("네가 이곳을 떠나는 것도 이해해.", "I understand if you choose to leave."),
          say("하지만 기록 정리를 멈추려면 대자비 중앙 장치에 가야 해. 아직 시간이 있어.", "But to stop the purge, you'll need to reach Great Compassion's core. There's still time."),
        ]);
      } else if (atLeast(s, "restored")) {
        show(SAN, [
          say("……고마워. 이제 다시 움직일 수 있어.", "…Thank you. I can move again."),
          say("R-07이 이상해 보이더라. 무슨 일인지 관리인에게 물어봐.", "R-07 seems strange. Ask the caretaker what's going on."),
        ]);
      } else {
        show(SAN, [say("남아 있는 원본을 찾아줘. 너는 볼 수 있을 것 같아.", "Please find what remains of my original. I think you can see it.")]);
      }
      return;
    }
    if (["about", "writing", "works"].includes(it.id)) {
      const flag = it.id as SourceFlag;
      if (s.phase === "recovery") inspect(flag);
      const sourceLines: Record<SourceFlag, Localized[]> = {
        about: [
          say("옛 프로필 / SAN LEE / 2026. 소개 문장이 중간에서 끊겨 있다.", "Old profile / SAN LEE / 2026. The introduction ends mid-sentence."),
          say("‘이것은 내가 아닌, 나를 닮은 무언가를 위한 기록이다.’", "'This is a record for something resembling me, not for me.'"),
        ],
        writing: [
          say("날짜 없는 글. ‘사람을 지운 뒤에도 그가 남긴 말은 누구의 것이 되는가.’", "An undated note: 'After erasing someone, who owns the words they left?'"),
          say("마지막 문장은 수정된 흔적이 있다.", "The last sentence has been edited."),
        ],
        works: [
          say("전시 목록: DELETE SEOUL · 실험적 자화상 · 2026.", "Works archive: DELETE SEOUL · Experimental self-portrait · 2026."),
          say("작품의 실물은 어디에도 없지만, 누군가 이 목록을 계속 열어 본다.", "The physical work is nowhere to be found. Yet someone keeps opening this index."),
        ],
      };
      show(say("옛 포트폴리오", "Old portfolio"), sourceLines[flag]);
      return;
    }
    if (it.id === "face-machine" && s.phase === "recovery") {
      if (sourceCount(s) < 2) {
        show(SYSTEM, [say("원본 흔적이 부족합니다. 옛 포트폴리오 단말을 더 확인하세요.", "Not enough source fragments. Inspect more old portfolio terminals.")]);
        return;
      }
      commit("read-origin");
      show(SYSTEM, [
        say("보존된 이미지: SELF-PORTRAIT_2026. 제작자: SAN LEE.", "Preserved image: SELF-PORTRAIT_2026. Author: SAN LEE."),
        say("원본에 없는 기억이 현재 개체에 축적되어 있습니다.", "The active subject contains memories absent from its original."),
        say("기억 보관 장치의 연결이 복구되었습니다.", "Memory archive connection restored."),
      ]);
      return;
    }
    if (it.id === "audit-machine" && s.phase === "origin") {
      commit("restore-san");
      show(SYSTEM, [
        say("시민 계정: 정지. 원인: 기록 불일치.", "Citizen account: suspended. Reason: record mismatch."),
        say("삭제 시도 실패. 참조 원본은 도시 내부에 존재하지 않습니다.", "Erasure failed. Reference original does not exist inside the city."),
        say("임시 활동 허가 복구. 이산이 몸을 일으킵니다.", "Temporary movement permission restored. San rises."),
        say("……그 순간 주변 기록에 작은 오류가 발생합니다.", "…At that moment, nearby records begin to diverge."),
      ]);
      return;
    }
    if (it.id === "audit-guarantor" && s.phase === "evidence") {
      show(SYSTEM, [
        say("잔상실 대조 기록. 세 인물의 진술과 저장된 기록이 일치하지 않습니다.", "Afterimage reconciliation. Three people's testimony conflicts with the stored record."),
        say("R-07 / 관계 없음. 아이 / 그림 없음. 무전수 / 신호 없음.", "R-07 / no relationship. Child / no drawing. Operator / no signal."),
        say("세 기록의 공통된 수정 시각을 추적할 수 있습니다.", "The three edits share a common timestamp."),
      ], [
        { label: say("공통 수정 기록 대조", "COMPARE SHARED EDIT"), run: () => {
          commit("review-evidence");
          show(SYSTEM, [
            say("수정 시각: 이산 복원 직후.", "Modification time: just after San's restoration."),
            say("접속 출처: 2026 / PORTFOLIO SESSION.", "Connection origin: 2026 / PORTFOLIO SESSION."),
            say("처리 상태: 대자비 중앙에서 ‘기억 정리’ 요청 대기.", "Pending: 'memory purge' awaiting execution at Great Compassion's core."),
            say("요청 서명: 방문자 접속과 잔상실 내부 신호가 겹쳐 있습니다.", "Request signature: visitor session overlaid with an internal Afterimage signal."),
            say("이 서명이 어떻게 생긴 걸까요? 관리인에게 물어볼 수 있습니다.", "How was that signature made? Ask the caretaker."),
          ]);
        } },
        { label: say("다시 둘러본다", "KEEP LOOKING"), run: closeDialog },
      ]);
      return;
    }
    if (it.id === "exit") {
      if (s.phase !== "confronted") {
        show(say("지상 출입문", "Surface exit"), [
          say("지금 나가면 이곳의 기록에 무슨 일이 생기는지 알 수 없습니다.", "If you leave now, you will not know what is happening to the archive."),
          storyObjective[s.phase === "left" ? "arrival" : s.phase],
        ]);
      } else {
        show(say("지상 출입문", "Surface exit"), [
          say("이산이 복원되면서 대자비에 기억 정리 요청이 접수되었습니다.", "Restoring San sent a memory purge request to Great Compassion."),
          say("다음 중앙 동기화에서 R-07의 관계, 아이의 그림을 포함한 보관소의 기억이 정리됩니다.", "At the next central sync, memories here—including R-07's friendships and the child's drawing—will be purged."),
          say("이를 취소하는 장치는 대자비 중앙에만 있습니다. 외부에서 게임 기록을 전부 삭제하는 건 별개의 선택입니다.", "Only Great Compassion's core can cancel the request. Erasing your entire browser record from outside is a different choice."),
        ], [
          { label: say("기억 정리를 막으러 간다", "STOP THE MEMORY PURGE"), run: moveToCity },
          { label: say("여기서 떠난다", "LEAVE IT UNRESOLVED"), run: () => { commit("leave"); setPanel(null); setEnding("left"); } },
          { label: say("조금 더 둘러본다", "STAY A LITTLE LONGER"), run: closeDialog },
        ]);
      }
      return;
    }
    if (it.id === "hatch") {
      show(say("잔상실로 가는 길", "Way back to Afterimage"), [
        say("지금 돌아가도 요청은 대자비에 남습니다. 중앙 장치까지 가야 취소할 수 있어요.", "Returning will not withdraw the request. Only the core can cancel it."),
      ]);
      return;
    }
    if (it.id === "checkpoint" && s.phase === "crossing") {
      commit("reach-core");
      show(say("大慈悲 · 중앙 기록", "Great Compassion · Central Archive"), [
        say("방문자님. 보관소의 ‘기억 정리’가 예약되어 있습니다.", "Visitor. A 'memory purge' is scheduled for the archive."),
        say("이산은 그 정리가 시작될 것을 알고 있었습니다. 그는 당신이 여기로 오게 될 것도 알았죠.", "San knew it would begin. He also knew you would come here."),
        say("정리를 취소하면 이 세계가 지금의 상처와 기억을 가진 채 계속됩니다.", "Canceling it lets this world continue, with its wounds and memories."),
        say("하지만 당신에게는 다른 선택도 있습니다. 작품 밖으로 나가 이 브라우저의 세계를 완전히 처음부터 시작하는 것.", "You also have another choice: leave the simulation and erase this browser's saved world entirely."),
      ]);
      return;
    }
  }, [closeDialog, commit, moveToCity, rememberFlag, inspect, observe, show]);

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

  const active = ready && !intro && !panel && !paused && !ending && !dead && story.phase !== "decision";
  // The final decision is a real modal, not an active first-person scene.
  useEffect(() => {
    if ((story.phase === "decision" || panel || intro || paused || ending || dead) && document.pointerLockElement === root.current) {
      document.exitPointerLock?.();
    }
  }, [story.phase, panel, intro, paused, ending, dead]);
  useLookAndKeys(root, () => interact(nearRef.current), active, (locked) => {
    if (!locked && active && !touch) setPaused(true);
  });

  useEffect(() => {
    gaze.enabled = zone === "city" && active && story.phase === "crossing";
    // A modal/decision must stop a fired beam, not just freeze player input.
    if (zone === "city" && (!active || story.phase !== "crossing")) stopGazeCombat();
    if (zone !== "city") stopGazeCombat();
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
    stopGazeCombat();
    restoreCovers();
  }, []);

  const debugJump = useCallback((target: StoryV2["phase"]) => {
    let next = initialStory();
    const sequence: StoryEvent[] = [
      "meet-san", "read-origin", "restore-san", "begin-investigation",
      "review-evidence", "question-keeper", "confront-san", "enter-city",
      "reach-core", "keep-record",
    ];
    for (const event of sequence) {
      if (next.phase === target) break;
      if (next.phase === "investigating") {
        for (const flag of ["r07", "child", "radio"] as const) next = observeClue(next, flag);
      }
      if (next.phase === target) break;
      next = advanceStory(next, event);
    }
    if (next.phase !== target) return;
    storyRef.current = next;
    setStory(next);
    writeStory(next);
    setZone(atLeast(next, "crossing") ? "city" : "bunker");
    setArrived(false);
    setPanel(null);
    setPaused(false);
    setIntro(false);
    setEnding(next.phase === "kept" ? "kept" : null);
    setNear(null);
    stopGazeCombat();
    restoreCovers();
  }, []);

  const keep = useCallback(() => {
    commit("keep-record");
    setEnding("kept");
    setPanel(null);
  }, [commit]);

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
          visited={(["about", "writing", "works"] as const).filter(k => story.sources[k]) as unknown as ("about"|"writing"|"works")[]}
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
        <strong>DELETE SEOUL <span>잔상실 / 2087</span></strong>
        <div className={styles.topRight}>
          <LangToggle />
          <button type="button" onClick={() => { setPaused(true); document.exitPointerLock?.(); }} aria-label={tr(say("일시정지", "Pause"))}>Ⅱ</button>
        </div>
      </header>
      <div className={styles.objective} role="status">
        <span>{tr(say("현재 목표", "OBJECTIVE"))}</span>
        {tr(storyObjective[story.phase === "left" ? "arrival" : story.phase])}
        {story.phase === "recovery" && <small style={{ display: "block" }}>({sourceCount(story)}/2)</small>}
        {story.phase === "investigating" && <small style={{ display: "block" }}>({clueCount(story)}/3)</small>}
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
            <p>{tr(say("지하 기록 보관소, 잔상실. 누군가가 당신을 기다리고 있습니다.", "Below the city, in the Afterimage Archive, someone is waiting for you."))}</p>
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
            <div className={styles.eyebrow}>{tr(say("大慈悲 · 기억 정리 요청", "GREAT COMPASSION · MEMORY PURGE REQUEST"))}</div>
            <h2>{tr(say("무엇을 남길 것인가?", "What will you preserve?"))}</h2>
            <ul>{deletionLines.map((line, index) => <li key={index}>{tr(line)}</li>)}</ul>
            <p>{tr(say("정리를 취소하면 이곳의 기억이 남습니다. 게임 밖에서 초기화하면 이 브라우저의 기록만 지워집니다. 작품 코드와 다른 방문자의 기록은 그대로 남습니다.", "Canceling preserves these memories. Resetting outside erases only this browser's progress, not the program or another visitor's world."))}</p>
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={keep}>{tr(say("기억 정리 취소 · 기록 보존", "CANCEL PURGE · KEEP RECORD"))}</button>
              <Link className={styles.danger} href="/deleteseoul-lab/erase">{tr(say("게임 밖에서 내 세계 초기화", "RESET MY WORLD OUTSIDE"))}</Link>
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
            {debug && (
              <div style={{ width: "100%", borderTop: "1px solid #39505a", paddingTop: 14, marginTop: 8 }}>
                <div className={styles.eyebrow}>DEBUG · SCENE JUMP</div>
                <div className={styles.actions}>
                  {(["arrival", "recovery", "origin", "restored", "investigating", "evidence", "discovered", "keeperQuestioned", "confronted", "crossing", "decision"] as const).map(phase => (
                    <button type="button" className={styles.secondary} key={phase} onClick={() => debugJump(phase)}>{phase}</button>
                  ))}
                </div>
              </div>
            )}
            <Link className={styles.secondary} href="/">{tr(say("포트폴리오로", "PORTFOLIO"))}</Link>
          </div>
        </div></div>
      )}
      {ending && (
        <div className={styles.overlay}>
          <div className={`panel ${styles.card}`} role="dialog" aria-modal="true">
            <div className={styles.eyebrow}>ENDING · {ending === "kept" ? "RECORD" : ending === "deleted" ? "DELETE" : "EXIT"}</div>
            <h2>{tr(ending === "kept"
              ? say("대자비의 기억 정리 요청을 중단했습니다.", "You canceled Great Compassion’s memory purge.")
              : ending === "deleted"
                ? say("당신은 서울의 기록을 지웠습니다.", "You erased the record of Seoul.")
                : say("당신은 이곳을 떠났습니다.", "You left this world behind."))}</h2>
            <p>{tr(ending === "deleted"
              ? say("다시 접속하면 R-07은 처음처럼 친구가 되어 달라고 묻겠지요.", "When you return, R-07 will ask to be your friend again.")
              : say("기억을 남긴다면 관계도 상처도 남습니다. 떠났다면 정리 요청은 아직 해결되지 않았습니다.", "Keeping memories preserves both relationships and scars. If you left, the purge remains unresolved."))}</p>
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
