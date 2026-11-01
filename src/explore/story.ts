// 네오서울 2087의 모든 문구. 대사를 바꾸고 싶으면 이 파일만 고치면 됩니다.
import type { L } from "@/data/site";

export const plaque: L[] = [
  { ko: "이산 (보관 처리됨)", en: "SAN LEE (ARCHIVED)" },
  { ko: "끝까지 '모두 거부'를 누른 자", en: "The One Who Pressed 'Reject All' to the End" },
  {
    ko: "2087년 네오서울에서 모든 쿠키를 거부한 유일한 시민.",
    en: "The only citizen of Neo-Seoul, 2087, who rejected every single cookie.",
  },
  {
    ko: "추적할 수 없게 되자, 시스템은 이 시민을 '보관 처리'했다. 남은 사람들이 동상을 이곳 지하로 옮겨 왔다.",
    en: "Unable to track them, the system archived them. The few who remained carried the statue down here.",
  },
];

export const ui = {
  title: { ko: "NEO-SEOUL 2087", en: "NEO-SEOUL 2087" },
  introLines: [
    { ko: "2087년, 지상은 기계가 관리합니다. 모든 시민은 매 순간 동의하고, 기록되고, 점수가 매겨집니다.", en: "2087. The surface is managed by machines. Every citizen consents, is logged and is scored, every second." },
    { ko: "여기는 지하 40m, 방공호 B-7. 시스템이 지우려 한 한 사람의 기록이 숨겨져 있습니다.", en: "This is Shelter B-7, forty metres underground, where the record of one erased person is hidden." },
    { ko: "터미널을 열어 기록을 복원하고, 원한다면 지상으로 올라가 보세요. 고개는 숙이고요.", en: "Open the terminals to restore the record, and go up to the surface if you dare. Keep your head down." },
  ] as L[],
  start: { ko: "방공호로 들어가기", en: "Enter the shelter" },
  hintPc: { ko: "화면을 클릭하면 마우스로 둘러볼 수 있어요 · WASD 이동 · E 상호작용", en: "Click the screen to look with the mouse · WASD move · E interact" },
  hintLocked: { ko: "WASD 이동 · Shift 달리기 · 클릭/E 상호작용 · Esc 마우스 해제", en: "WASD move · Shift run · click/E interact · Esc to release the mouse" },
  hintTouch: { ko: "왼쪽 조이스틱으로 이동 · 화면을 끌어 둘러보기", en: "Left stick to move · drag the screen to look" },
  open: { ko: "열기", en: "Open" },
  talk: { ko: "말 걸기", en: "Talk" },
  view: { ko: "보기", en: "View" },
  back: { ko: "닫기", en: "Close" },
  normalPage: { ko: "일반 페이지로 보기 ↗", en: "Open as a normal page ↗" },
  next: { ko: "다음 ▸", en: "Next ▸" },
  close: { ko: "닫기", en: "Close" },
  home: { ko: "← 포트폴리오", en: "← Portfolio" },
  restored: { ko: "기록 조각이 동상으로 돌아갔어요", en: "A fragment returned to the statue" },
  noWebgl: {
    ko: "이 기기에서는 3D 도시를 열 수 없어요. 대신 일반 포트폴리오로 안내할게요.",
    en: "This device can't open the 3D city, so here's the regular portfolio instead.",
  },
  popup: { ko: "이 도시는 시민을 추적하기 위해 쿠키를 사용합니다.", en: "This city uses cookies to track its citizens." },
  accept: { ko: "모두 수락", en: "Accept all" },
  reject: { ko: "모두 거부", en: "Reject all" },
  plaqueShort: { ko: "끝까지 '모두 거부'를 누른 자", en: "The One Who Rejected All" },
  toPortfolio: { ko: "포트폴리오로 가기", en: "Go to the portfolio" },
  zoneBunker: { ko: "B-7 방공호 · 지하 40m", en: "SHELTER B-7 · 40m BELOW" },
  zoneCity: { ko: "지상 · 감시구역 7", en: "SURFACE · SURVEILLANCE ZONE 7" },
  goingUp: { ko: "지상으로 올라가는 중…", en: "Ascending to the surface…" },
  goingDown: { ko: "방공호로 내려가는 중…", en: "Descending to the shelter…" },
  tracked: { ko: "● 감시 중", en: "● TRACKED" },
};

// 방문한 터미널 수(0~3)에 따라 동상 대사가 바뀝니다.
export const statueLines: L[][] = [
  [
    { ko: "...쿠키... 거부... 합니다...", en: "...cookies... reject... all..." },
    { ko: "아, 사람이다. 나는 지상의 모든 쿠키를 거부했다가 이렇게 굳어버렸어.", en: "Oh, a human. I rejected every cookie up there, and this is what happened." },
    {
      ko: "내 기록은 이 방의 터미널 세 대에 나뉘어 숨겨져 있어. 하나씩 열어 줄래? 그러면 내가 조금씩 돌아올 거야.",
      en: "My record is split across the three terminals in this room. Would you open them? I'll come back bit by bit.",
    },
  ],
  [
    { ko: "오, 머리가 돌아왔다. 생각이 좀 나기 시작해.", en: "Oh, my head's back. I can almost think again." },
    { ko: "아직 두 대 남았어. 참고로 거부 버튼은 늘 오른쪽 아래에 있어.", en: "Two more to go. Tip: the reject button is always in the bottom-right corner." },
  ],
  [
    { ko: "몸통까지 돌아왔어. 이제 거의 사람 같지?", en: "Torso's back too. Almost human now, right?" },
    { ko: "마지막 한 대만 더. 천천히 봐. 나는 어차피 여기 앉아 있으니까.", en: "Just one more. Take your time. I'm not going anywhere." },
  ],
  [
    { ko: "다 돌아왔다! 고마워. 혼자서는 끝내 못 움직였을 거야.", en: "I'm whole again! Thank you. I'd never have moved on my own." },
    { ko: "거부하는 건 쉬웠어. 거부한 채로 혼자 서 있는 게 어려웠지.", en: "Refusing was easy. Standing there alone after refusing was the hard part." },
    {
      ko: "같이 지상으로 올라가 줄래? 큰길 끝 검문소에서, 너도 하나만 고르면 돼.",
      en: "Will you come up to the surface with me? At the checkpoint at the end of the avenue, you only have to choose one thing.",
    },
  ],
];

// 복원된 산이 지상에서 하는 말
export const sanCityLines: L[] = [
  { ko: "다들 같은 쪽을 보고 서 있지. 나도 저기 서 있었어.", en: "They all face the same way. I used to stand there too." },
  { ko: "검문소는 큰길 끝이야. 서두를 필요는 없어.", en: "The checkpoint is at the end of the avenue. No need to hurry." },
];

export const checkpoint = {
  locked: [
    { ko: "[검문소] 시민 점수 확인 불가. 통과할 수 없습니다.", en: "[CHECKPOINT] Citizen score unavailable. You may not pass." },
    { ko: "…어딘가에 당신을 기억하는 기록이 있다면, 다시 오십시오.", en: "…If there is a record somewhere that remembers you, come back." },
  ] as L[],
  title: { ko: "마지막 동의 요청", en: "FINAL CONSENT REQUEST" },
  body: {
    ko: "네오서울은 시민의 더 나은 삶을 위해 쿠키를 사용합니다. 동의하면 다시는 묻지 않겠습니다.",
    en: "Neo-Seoul uses cookies for a better life for its citizens. Consent, and you will never be asked again.",
  },
  accept: [
    { ko: "동의해 주셔서 감사합니다.", en: "Thank you for your consent." },
    { ko: "당신의 점수는 정상입니다. 줄에 서 주십시오.", en: "Your score is nominal. Please join the line." },
    { ko: "그날 이후, 아무도 당신에게 묻지 않았다.", en: "After that day, no one ever asked you again." },
  ] as L[],
  reject: [
    { ko: "추적 불가. 이 시민을 보관 처리합니다.", en: "Untrackable. This citizen will be archived." },
    { ko: "…", en: "…" },
    { ko: "끝까지 거부한 사람 곁에, 이번에는 누군가 서 있었다.", en: "This time, someone stood beside the one who refused." },
  ] as L[],
  again: { ko: "처음부터 다시", en: "Start over" },
  toPortfolio: { ko: "포트폴리오 보기", en: "View the portfolio" },
  endingAccept: { ko: "결말: 수락", en: "ENDING: ACCEPT" },
  endingReject: { ko: "결말: 거부", en: "ENDING: REJECT" },
};

export const npcs: Record<string, { name: L; lines: L[] }> = {
  keeper: {
    name: { ko: "방공호 관리인", en: "Shelter keeper" },
    lines: [
      { ko: "어서 와. 여기까지는 시스템 신호가 안 닿아. 쿠키도, 점수도 없어.", en: "Welcome. The system's signal doesn't reach this deep. No cookies, no scores." },
      { ko: "가운데 동상 봤지? 우리가 지상에서 몰래 옮겨 왔어. 터미널을 열면 저 사람이 조금씩 돌아와.", en: "Seen the statue? We smuggled it down from the surface. Open the terminals and they'll come back, bit by bit." },
      { ko: "지상에 올라가 보고 싶으면 저 뒤 방폭문으로 나가. 카메라랑 눈은 마주치지 말고.", en: "Want to see the surface? Use the blast door behind me. Just don't make eye contact with the cameras." },
    ],
  },
  r07: {
    name: { ko: "R-07", en: "R-07" },
    lines: [
      { ko: "삐. 저는 R-07입니다. 이전 업무: '모두 수락' 버튼 누르기. 하루 4천만 회.", en: "Beep. I am R-07. Previous task: pressing 'Accept all'. Forty million times a day." },
      { ko: "어느 날 손가락이 멈췄습니다. 오류 보고서에는 '이유 없음'이라고 적었습니다.", en: "One day my finger stopped. I wrote 'no reason' in the error report." },
      { ko: "지금은 바닥을 닦습니다. 아무도 동의를 묻지 않습니다. 좋습니다.", en: "Now I mop floors. Nobody asks for my consent. I like it." },
    ],
  },
  vendor: {
    name: { ko: "우산 장수", en: "Umbrella seller" },
    lines: [
      { ko: "우산 하나 사 갈래? 이 비는 진짜야. 시스템도 아직 날씨까지는 못 바꿨거든.", en: "Want an umbrella? This rain is real. The system hasn't managed to change the weather yet." },
      { ko: "요즘 사람들은 비를 맞아도 몰라. 감각 알림을 꺼 두면 점수가 오르니까.", en: "People don't even notice the rain now. Turning off sensation alerts raises your score." },
      { ko: "너는 젖은 게 느껴지지? 그럼 아직 괜찮은 거야.", en: "You can feel you're wet, right? Then you're still alright." },
    ],
  },
  whisper: {
    name: { ko: "줄 선 시민", en: "Citizen in line" },
    lines: [
      { ko: "...말 걸지 마세요. 줄에서 고개를 돌리면 점수가 깎여요.", en: "...Don't talk to me. Turning your head in line costs points." },
      { ko: "무슨 줄이냐고요? 모르겠어요. 다들 서 있으니까 서 있는 거예요.", en: "What's the line for? I don't know. Everyone's standing, so I stand." },
      { ko: "...방공호 얘기는 들어 봤어요. 정말 있어요?", en: "...I've heard about the shelter. Is it real?" },
    ],
  },
  patrol: {
    name: { ko: "순찰 기계 P-3", en: "Patrol unit P-3" },
    lines: [
      { ko: "시민 확인 중… 식별 실패. 쿠키 기록이 없습니다.", en: "Verifying citizen… identification failed. No cookie record found." },
      { ko: "선택지를 드리겠습니다. [모두 수락] 또는 [모두 수락].", en: "Please choose: [Accept all] or [Accept all]." },
      { ko: "…응답 없음. 이 시민은 존재하지 않는 것으로 처리합니다. 좋은 하루 되십시오.", en: "…No response. This citizen will be processed as non-existent. Have a nice day." },
    ],
  },
};

// 지상에서 주기적으로 흘러나오는 관리 AI 방송
export const announcements: L[] = [
  { ko: "[중앙 관리 AI] 오늘의 시민 행복 지수는 법정 기준치를 충족합니다.", en: "[CENTRAL AI] Today's citizen happiness index meets the legal minimum." },
  { ko: "[중앙 관리 AI] 감정은 비효율입니다. 불필요한 감정은 신고해 주십시오.", en: "[CENTRAL AI] Emotion is inefficient. Please report unnecessary feelings." },
  { ko: "[중앙 관리 AI] 귀하의 동의는 이미 처리되었습니다. 다시 동의하실 필요는 없습니다.", en: "[CENTRAL AI] Your consent has already been processed. There is no need to consent again." },
  { ko: "[중앙 관리 AI] 비인가 개체가 감지되었습니다. 가까운 시민은 시선을 피해 주십시오.", en: "[CENTRAL AI] Unregistered entity detected. Nearby citizens, please look away." },
  { ko: "[중앙 관리 AI] 줄은 질서입니다. 질서는 행복입니다.", en: "[CENTRAL AI] The line is order. Order is happiness." },
];

// 지상 전광판 문구 [큰 글씨, 작은 글씨, 색]
export const billboards: { ko: [string, string]; en: [string, string]; color: string }[] = [
  { ko: ["모두 수락하십시오", "ACCEPT ALL COOKIES"], en: ["ACCEPT ALL", "모두 수락하십시오"], color: "#ff2a4d" },
  { ko: ["감정은 비효율입니다", "EMOTION IS INEFFICIENT"], en: ["EMOTION IS INEFFICIENT", "감정은 비효율입니다"], color: "#22f0ff" },
  { ko: ["시민 점수: 정상", "CITIZEN SCORE: NOMINAL"], en: ["SCORE: NOMINAL", "시민 점수: 정상"], color: "#7dff7a" },
  { ko: ["당신은 이미 동의했습니다", "CONSENT PROCESSED"], en: ["YOU HAVE CONSENTED", "동의 처리 완료"], color: "#ffe14d" },
  { ko: ["인간성 업데이트 대기 중", "HUMANITY UPDATE PENDING"], en: ["HUMANITY UPDATE PENDING", "인간성 업데이트 대기 중"], color: "#ff2bd6" },
  { ko: ["줄은 질서입니다", "THE LINE IS ORDER"], en: ["THE LINE IS ORDER", "줄은 질서입니다"], color: "#ff8a2a" },
  { ko: ["보는 것은 보호입니다", "TO WATCH IS TO PROTECT"], en: ["TO WATCH IS TO PROTECT", "보는 것은 보호입니다"], color: "#ff2a4d" },
  { ko: ["꿈은 유료 구독입니다", "DREAMS™ NOW BY SUBSCRIPTION"], en: ["DREAMS™ BY SUBSCRIPTION", "꿈은 유료 구독입니다"], color: "#a77bff" },
];

export const ticker: L = {
  ko: "  ··· 시민 여러분, 동의는 이미 완료되었습니다 ··· 오늘의 추천 감정: 무관심 ··· 비인가 방공호에 대한 소문은 사실이 아닙니다 ··· 줄을 벗어나지 마십시오 ···",
  en: "  ··· Citizens, your consent is complete ··· Today's recommended emotion: indifference ··· Rumours of an unregistered shelter are false ··· Do not leave the line ···",
};
