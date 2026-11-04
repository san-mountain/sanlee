// DELETE SEOUL의 모든 문구. 대사를 바꾸고 싶으면 이 파일만 고치면 됩니다.
import type { L } from "@/data/site";

export const plaque: L[] = [
  { ko: "이산 (마지막 접속: 2087년)", en: "SAN LEE (LAST SEEN: 2087)" },
  { ko: "끝까지 '모두 거부'를 누른 사람", en: "The One Who Pressed 'Reject All' to the End" },
  {
    ko: "2087년 서울에서 모든 쿠키를 거부한 시민.",
    en: "A citizen of Seoul, 2087, who rejected every cookie.",
  },
  {
    ko: "쿠키가 없으니 도시는 이 시민이 무엇을 하는지 확인할 수 없었다. 보이지 않는 시민은 그 자리에 멈춘 것으로 처리된다. 남은 사람들이 몰래 이곳 지하로 옮겨 왔다.",
    en: "With no cookies, the city could not see what this citizen was doing. A citizen the city cannot see is filed as standing still. Those who remained carried them down here in secret.",
  },
];

export const ui = {
  title: { ko: "DELETE SEOUL", en: "DELETE SEOUL" },
  // 이산의 약속을 처음 들었을 때: 숨은 결말이 열렸다는 알림
  unlockTitle: { ko: "숨은 결말이 열렸습니다", en: "A hidden ending has opened" },
  unlockBody: {
    ko: "이산의 말을 기억해 두세요. 도시의 기록은 도시 밖, 이 웹사이트 맨 아래에서 지울 수 있습니다.",
    en: "Remember San's words. The city's records can be erased outside the city, at the very bottom of this website.",
  },
  introLines: [
    { ko: "2087년 서울. 쿠키를 거부한 시민은 그 자리에 멈춥니다. 신호가 닿지 않는 지하 방공호에, 그렇게 굳어 버린 한 사람이 있습니다.", en: "Seoul, 2087. Citizens who reject cookies stop where they stand. In a shelter the signal cannot reach, one of them sits frozen." },
  ] as L[],
  start: { ko: "방공호로 들어가기", en: "Enter the shelter" },
  goBack: { ko: "돌아가기", en: "Go back" },
  hintPc: { ko: "화면을 클릭하거나 아무 키나 누르면 다시 마우스로 둘러볼 수 있어요", en: "Click or press any key to look with the mouse again" },
  hintLocked: { ko: "WASD 이동 · Shift 톡: 달리기 · Space 점프 · 클릭/E 상호작용 · Esc 설정", en: "WASD move · tap Shift: run · Space jump · click/E interact · Esc settings" },
  hintIntroPc: { ko: "마우스로 둘러보기 · WASD 이동 · Shift 톡: 달리기 · Space 점프 · 클릭/E 상호작용 · Esc 설정", en: "Mouse to look · WASD move · tap Shift: run · Space jump · click/E interact · Esc settings" },
  hintTouch: { ko: "왼쪽 조이스틱으로 이동 · 화면을 끌어 둘러보기 · ⤒ 점프", en: "Left stick to move · drag the screen to look · ⤒ jump" },
  open: { ko: "열기", en: "Open" },
  talk: { ko: "말 걸기", en: "Talk" },
  view: { ko: "보기", en: "View" },
  back: { ko: "닫기", en: "Close" },
  normalPage: { ko: "일반 페이지로 보기 ↗", en: "Open as a normal page ↗" },
  next: { ko: "다음 ▸", en: "Next ▸" },
  close: { ko: "닫기", en: "Close" },
  home: { ko: "← 로그아웃", en: "← Log out" },
  restored: { ko: "본인 인증", en: "Identity check" },
  noWebgl: {
    ko: "이 기기에서는 3D 도시를 열 수 없어요. 대신 일반 웹사이트로 안내할게요.",
    en: "This device can't open the 3D city, so here's the regular website instead.",
  },
  popup: { ko: "이 도시는 시민을 추적하기 위해 쿠키를 사용합니다.", en: "This city uses cookies to track its citizens." },
  accept: { ko: "모두 수락", en: "Accept all" },
  reject: { ko: "모두 거부", en: "Reject all" },
  plaqueShort: { ko: "끝까지 '모두 거부'를 누른 사람", en: "The One Who Rejected All" },
  terminalLocked: [
    { ko: "[기록 잠김] 본인 인증이 필요합니다.", en: "[RECORD LOCKED] Identity check required." },
    { ko: "누구의 계정인지부터 알아야 할 것 같다. 가운데 정지 시민에게 먼저 말을 걸어 보자.", en: "First, find out whose account this is. Speak to the suspended citizen in the middle." },
  ] as L[],
  toPortfolio: { ko: "웹사이트로 가기", en: "Go to the website" },
  exitLocked: [
    { ko: "[방폭문] 잠김. 동행인 없이 지상으로 나갈 수 없습니다.", en: "[BLAST DOOR] Locked. You may not go up without a companion." },
    { ko: "먼저 가운데 정지 시민, 이산을 깨우자. 터미널 세 대를 열면 된다. ({n}/3)", en: "First wake San, the suspended citizen in the middle. Open the three terminals. ({n}/3)" },
  ] as L[],
  exitTalk: { ko: "이산이 풀려났다. 먼저 이산에게 말을 걸자.", en: "San is free. Talk to San first." },
  zoneBunker: { ko: "B-7 방공호 · 지하 40m", en: "SHELTER B-7 · 40m BELOW" },
  zoneCity: { ko: "지상 · 부유 감시구역 7 · 고도 2,400m", en: "SURFACE · FLOATING ZONE 7 · ALT 2,400m" },
  goingUp: { ko: "지상으로 올라가는 중…", en: "Ascending to the surface…" },
  goingDown: { ko: "방공호로 내려가는 중…", en: "Descending to the shelter…" },
  tracked: { ko: "● 감시 중", en: "● TRACKED" },
  // 입장 전 쿠키 창: '모두 거부'를 눌러도 결국 수락된다
  cookieTitle: { ko: "SEOUL.SYS · 쿠키 동의", en: "SEOUL.SYS · COOKIE CONSENT" },
  cookieBody: {
    ko: "이 도시는 시민의 더 나은 삶을 위해 쿠키를 사용합니다. 계속하려면 선택하십시오.",
    en: "This city uses cookies for a better life for its citizens. Choose to continue.",
  },
  processing: { ko: "처리 중…", en: "Processing…" },
  acceptedAll: { ko: "수락됨", en: "Accepted" },
  startLine: { ko: "줄로 돌아가기", en: "Return to the line" },
  savedHint: { ko: "연결이 끊기면 여기서 이어집니다", en: "If the connection drops, you pick up here" },
  // 처음 지상에 나설 때 화면 아래로 지나가는 한 줄. 클릭할 필요 없음
  cookieNotice: { ko: "이 도시는 방문자를 기억합니다", en: "This city remembers its visitors" },
  cookieNoticeSub: { ko: "계속 걸으면 동의한 것으로 간주합니다", en: "By continuing to walk, you agree" },
  cookieSettings: { ko: "쿠키 설정 · Esc", en: "Cookie settings · Esc" },
  cookieSettingsTouch: { ko: "쿠키 설정 · 오른쪽 위 ⚙", en: "Cookie settings · ⚙ top right" },
  foundEndings: { ko: "발견한 결말 {n}/3", en: "Endings found {n}/3" },
  notRecorded: { ko: "발견한 결말 · 이 결말은 기록되지 않음", en: "Endings found · this one is not recorded" },
  welcomeB: { ko: "다시 오셨군요.", en: "Welcome back." },
};

// 기억 로그 (구역 이름 아래 한 줄)
export const backupUi = {
  noSignal: { ko: "MEMORY · 신호 없음", en: "MEMORY · NO SIGNAL" },
  none: { ko: "MEMORY · 대기 중", en: "MEMORY · STANDBY" },
  deleted: { ko: "MEMORY · 기억 없음", en: "MEMORY · NOT REMEMBERED" },
  saved: { ko: "● 위치 기억됨", en: "● LOCATION REMEMBERED" },
};

// Esc 설정창. 시스템이 방문자에게 직접 말을 건다 (제4의 벽)
export const pause = {
  title: { ko: "일시정지됨", en: "PAUSED" },
  sub: { ko: "…라고 생각하시겠지만, 도시는 멈추지 않았습니다.", en: "…or so you think. The city did not stop." },
  resume: { ko: "도시로 돌아가기", en: "Return to the city" },
  sens: { ko: "마우스 감도", en: "Mouse sensitivity" },
  sensNote: { ko: "당신의 손이 얼마나 예민한지 기록 중입니다.", en: "We are logging how sensitive your hand is." },
  bob: { ko: "걸을 때 화면 흔들림", en: "Head bob when walking" },
  sound: { ko: "효과음", en: "Sound effects" },
  lang: { ko: "언어", en: "Language" },
  humanity: { ko: "인간성", en: "Humanity" },
  humanityNote: { ko: "관리자에 의해 잠김", en: "Locked by administrator" },
  freeWill: { ko: "자유 의지", en: "Free will" },
  freeWillNo: { ko: "이 설정은 이미 당신 대신 결정되었습니다.", en: "This setting has already been decided for you." },
  cookies: { ko: "쿠키 설정", en: "Cookie preferences" },
  cookiesNo: { ko: "이 설정은 검문소에서 변경할 수 있습니다.", en: "This setting can be changed at the checkpoint." },
  reset: { ko: "방문 기록 지우기", en: "Erase my visit" },
  resetNote: { ko: "지웠습니다. 하지만 신호가 닿는 곳에서는 도시의 기억까지 지워지지 않습니다.", en: "Erased. But where the signal reaches, the city's memory of you is not." },
  leave: { ko: "로그아웃", en: "Log out" },
  bunker: { ko: "방공호로 돌아가기", en: "Back to the shelter" },
  bunkerNote: { ko: "배전실 7-B의 문은 아무도 모르게 다시 닫힙니다.", en: "The door of Substation 7-B closes again, unnoticed." },
  on: { ko: "켬", en: "On" },
  off: { ko: "끔", en: "Off" },
};

// 설정창 아래에 흐르는 문장. {time} {min} {w} {h} 는 실제 값으로 바뀝니다.
export const fourthWall: L[] = [
  { ko: "지금 당신의 시각은 {time}. 이 도시에 {min}분째 머물고 있습니다.", en: "Your local time is {time}. You have been in this city for {min} min." },
  { ko: "당신을 비추는 창의 크기는 {w}×{h}. 그 바깥에도 방이 있겠죠. 불은 켜져 있나요?", en: "The window you are looking through is {w}×{h}. There's a room around it, isn't there? Is the light on?" },
  { ko: "Esc를 누른다고 나갈 수 있는 건 아닙니다. 하지만 좋은 시도였습니다.", en: "Pressing Esc does not let you leave. But it was a good try." },
  { ko: "마우스에서 손을 뗀 3초 동안, 당신은 아무것에도 동의하지 않았습니다. 기분이 어땠나요?", en: "For the three seconds your hand left the mouse, you consented to nothing. How did it feel?" },
  { ko: "이 도시가 당신을 다시 맞이한 횟수: {copy}번.", en: "Times this city has welcomed you back: {copy}." },
  { ko: "이 화면 밖의 당신은 지금 무엇을 보고 있습니까? 우리는 그것까지는 모릅니다. 아직은.", en: "What is the you outside this screen looking at? That, we don't know. Yet." },
];

// 큰길 끝의 거대한 입불 '대자비'와 그 시선
export const jabiUi = {
  name: { ko: "大慈悲 · 자비의 시선", en: "GREAT COMPASSION · GAZE" },
  states: {
    idle: { ko: "잠잠함", en: "still" },
    watch: { ko: "지켜보는 중", en: "watching" },
    suspect: { ko: "의심 중 — 눈이 붉어진다", en: "suspicious — its eyes redden" },
    charge: { ko: "분노 — 숨으십시오", en: "wrath — hide" },
    lock: { ko: "조준", en: "LOCKED" },
    fire: { ko: "자비를 베푸는 중", en: "BESTOWING MERCY" },
    cool: { ko: "식는 중", en: "cooling" },
    hidden: { ko: "가려짐", en: "out of sight" },
    line: { ko: "줄에 섞임 — 움직이지 마십시오", en: "blending into the line — don't move" },
  },
  tip: {
    ko: "큰길 끝의 대자비가 보고 있어요. 비석이나 컨테이너 뒤에 숨으면 게이지가 줄어요. 줄 선 시민들 사이에 서서 가만히 있어도 들키지 않아요.",
    en: "The Great Compassion at the end of the avenue is watching. Hide behind steles or containers to cool its gaze. Standing still among the queue also hides you.",
  },
  // 처음 시선 구역에 들어설 때 뜨는 소개 팝업
  introTitle: { ko: "저 위의 대자비가 보고 있습니다", en: "The Great Compassion is watching" },
  introBody: {
    ko: "큰길 끝, 구름 위에 선 거대한 입불이 대자비입니다. 도시의 모든 시민을 내려다봅니다. 검문소는 그 발밑에 있습니다.",
    en: "The giant standing Buddha above the clouds at the end of the avenue is the Great Compassion. It looks down on every citizen. The checkpoint is at its feet.",
  },
  introRules: [
    { ko: "탁 트인 곳에 서 있으면 화면 위 게이지가 차오릅니다.", en: "Stand in the open and the gauge at the top fills." },
    { ko: "게이지가 다 차면 눈이 붉어지고, 바닥에 가는 붉은 선이 비칩니다. 선이 멈추면 곧 그 길을 붉은 빛이 긁고 지나가요. 그때 옆으로 뛰면 피할 수 있어요. 맞으면 대자비 앞, 처음 자리에서 다시 시작합니다.", en: "When it is full, its eyes turn red and a thin red line appears on the ground. Once the line stops, a beam scrapes along it. Dash sideways then to dodge it. If it hits you, you start over from where you first stood before it." },
    { ko: "비석이나 컨테이너 뒤에 숨으면 게이지가 줄어듭니다.", en: "Hide behind steles or containers and the gauge drains." },
    { ko: "줄 선 시민들 사이에 가만히 서 있으면 시민으로 보입니다.", en: "Stand still among the queue and you pass for a citizen." },
  ] as L[],
  introOk: { ko: "알겠어요", en: "Got it" },
  // 소개 팝업의 두 장면 (게임 화면에서 찍은 것)
  introShots: [
    { src: "/deleteseoul/jabi-lock.webp", cap: { ko: "눈과 입이 붉어지면: 조준", en: "Eyes and mouth turn red: locked on" } },
    { src: "/deleteseoul/jabi-fire.webp", cap: { ko: "빛이 내려오면: 연결 끊김", en: "The light comes down: disconnected" } },
  ] as { src: string; cap: L }[],
  deadTitle: { ko: "연결이 끊겼습니다", en: "CONNECTION LOST" },
  deadSub: { ko: "자비는 언제나 공정합니다. 처음 위치에서 다시 시작합니다.", en: "Mercy is always fair. Restarting from the last position." },
  restoreStart: { ko: "다시 오셨군요. 대자비 앞, 처음 그 자리부터 다시 시작합니다.", en: "Welcome back. Starting over from where you first stood before the Great Compassion." },
  cost: { ko: "다시 올 때마다 도시는 당신을 조금 더 잘 알게 됩니다.", en: "Every time you come back, the city knows you a little better." },
  noBackup: { ko: "이 도시는 당신을 기억하지 못합니다.", en: "This city does not remember you." },
  noBackupSub: { ko: "처음부터 다시 시작합니다.", en: "Starting again from the beginning." },
};

// 화면 위쪽 퀘스트 화살표에 붙는 짧은 목표
export const quest = {
  terminal: { ko: "본인 인증", en: "Verify identity" },
  statue: { ko: "정지 시민에게 말 걸기", en: "Talk to the suspended citizen" },
  san: { ko: "이산에게 말 걸기", en: "Talk to San" },
  exit: { ko: "지상으로", en: "To the surface" },
  checkpoint: { ko: "검문소", en: "Checkpoint" },
  back: { ko: "방공호로 돌아가기", en: "Back to the shelter" },
  plaza: { ko: "광장으로 나가기", en: "Out to the plaza" },
};

// 방문한 터미널 수(0~3)에 따라 동상 대사가 바뀝니다.
export const statueLines: L[][] = [
  [
    { ko: "…쿠키를… 거부… 합니다…", en: "…I reject… all… cookies…" },
    { ko: "…누구야? 사람 목소리는 오랜만이네.", en: "…Who's there? It's been a long time since I heard a voice." },
    {
      ko: "나는 지상에서 쿠키를 전부 거부했어. 그랬더니 도시가 내 활동을 하나도 확인할 수 없었나 봐. '장기간 활동이 없어 휴면 계정으로 전환되었습니다.' 그게 지금의 나야.",
      en: "Up there, I rejected every cookie. Turns out the city couldn't see a thing I did. 'Your account has been made dormant due to inactivity.' That's me now.",
    },
    {
      ko: "다시 움직이려면 본인 인증이 필요하대. 곁의 낡은 장치가 흐트러진 내 얼굴을 들고 있어. 맞춰 줄래?",
      en: "To move again, I need to verify my identity. The old machine beside me holds my scattered face. Would you put it back together?",
    },
  ],
  [
    { ko: "오, 머리가 돌아왔다. 본인 인증 1단계 통과.", en: "Oh, my head's back. Verification step one: passed." },
    { ko: "아직 두 대 남았어. 참고로 거부 버튼은 늘 오른쪽 아래에 있어.", en: "Two more to go. Tip: the reject button is always in the bottom-right corner." },
  ],
  [
    { ko: "몸통까지 돌아왔어. 2단계 통과. 이제 거의 사람 같지?", en: "Torso's back too. Step two. Almost human now, right?" },
    { ko: "마지막 한 대만 더. 천천히 봐. 나는 어차피 여기 앉아 있으니까.", en: "Just one more. Take your time. I'm not going anywhere." },
  ],
  [
    { ko: "인증 완료! 고마워. 혼자서는 끝내 못 움직였을 거야.", en: "Verified! Thank you. I'd never have moved on my own." },
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
  { ko: "혹시 네가 기록을 전부 지우고 다시 오면, 나는 널 못 알아볼 거야. 도시가 날 깨운 게 아니라 기록이 날 깨운 거니까.", en: "If you ever erase every record and come back, I won't recognise you. It wasn't the city that woke me. It was the records." },
  { ko: "그땐 정지 시민이 된 나한테 이렇게 말해 줘. '그대는 부를 수 없기에 아름답다.'", en: "Then say this to me, the suspended citizen: 'Beautiful, because you cannot be called.'" },
];

// 숨은 결말 열쇠: 기기가 아니라 사람이 기억하는 말. 기록이 하나도 없는 방문자만 동상에게 건넬 수 있다
export const whisper = {
  // 이산의 시 〈이름 없는 사랑〉의 마지막 줄
  // 띄어쓰기·문장부호·대소문자는 무시하고 비교한다
  accept: ["그대는부를수없기에아름답다", "부를수없기에아름답다", "그대는부를수없어서아름답다", "beautifulbecauseyoucannotbecalled", "beautifulbecauseyoucantbecalled"],
  prompt: { ko: "정지 시민에게 말을 건넨다…", en: "Say something to the suspended citizen…" } as L,
  say: { ko: "말하기", en: "Say" } as L,
  silent: { ko: "정지 시민은 대답하지 않는다.", en: "The suspended citizen does not answer." } as L,
  // 말을 알아들은 이산: 기록이 아니라 기억으로 깨어난다
  wake: [
    { ko: "…", en: "…" },
    { ko: "기록엔 아무것도 없는데… 너, 나 알지?", en: "There's nothing in the records… but you know me, don't you?" },
    { ko: "그 말, 내가 한 거야. 어딘가에서. 기억은 안 나는데, 알 것 같아.", en: "I said that. Somewhere. I don't remember it, but I know it." },
    { ko: "가자. 기록 없는 사람 둘이야. 이번엔 아무도 우릴 못 봐.", en: "Let's go. Two people with no record. This time nobody can see us." },
  ] as L[],
  awakeLine: { ko: "가자. 이번엔 아무도 우릴 못 봐.", en: "Let's go. This time nobody can see us." } as L,
};
// 한 번이라도 연결이 끊겼다면 지상의 이산이 덧붙이는 말
export const sanAfterDeath: L = { ko: "너는 쓰러져도 금방 다시 오더라. 도시가 널 기억하니까. 부럽지는 않아. 그만큼 지켜본다는 뜻이니까.", en: "You fall and you're right back. The city remembers you. I'm not jealous. It means it's watching that closely." };

export const keeperAfterDeath: L = { ko: "또 왔네. 지난번이랑 똑같은 얼굴로. 흉터 하나 없이.", en: "Back again. Same face as last time. Not a single scar." };

export type Beat = L & { say?: boolean; slots?: boolean; plaque?: boolean };

export const checkpoint = {
  locked: [
    { ko: "[검문소] 동행인 확인 중… 이산의 본인 인증이 끝나지 않았습니다. ({n}/3)", en: "[CHECKPOINT] Checking companion… San's identity check is not finished. ({n}/3)" },
    { ko: "방공호로 돌아가 남은 터미널을 열어 이산을 깨우자. 위쪽 화살표가 길을 알려 준다.", en: "Go back to the shelter and open the remaining terminals to wake San. The arrow at the top shows the way." },
  ] as L[],
  // 세 번째 선택지: 현실의 쿠키 창처럼 작게 숨겨 둔 '설정'. 기록 삭제는 여기서 안 되고, 도시 밖(웹사이트)에서만 된다
  settings: { ko: "쿠키 설정", en: "Cookie settings" },
  prefs: [
    { ko: "필수 쿠키 (도시 운영)", en: "Essential (running the city)" },
    { ko: "시선 분석 쿠키", en: "Gaze analytics" },
    { ko: "감정 맞춤 쿠키", en: "Mood personalisation" },
    { ko: "꿈 광고 쿠키", en: "Dream advertising" },
  ] as L[],
  prefOn: { ko: "켜짐 · 변경 불가", en: "ON · locked" },
  prefsNote: { ko: "모든 쿠키는 시민의 편의를 위해 켜져 있습니다.", en: "All cookies are on, for your convenience." },
  prefsBack: { ko: "뒤로", en: "Back" },
  clearOutside: { ko: "방문 기록 삭제는 이 도시 밖에서만 할 수 있습니다.", en: "Visit history can only be deleted outside this city." },
  // 거부는 막지 않는다. 다만 작게, 여러 번 묻는다 (현실의 다크 패턴을 과장한 것)
  rejectNotice: { ko: "거부 시 시민 활동이 정지될 수 있습니다.", en: "Rejecting may suspend your citizen activity." },
  confirm: [
    {
      title: { ko: "정말 거부하시겠어요?", en: "ARE YOU SURE?" },
      body: { ko: "거부하면 맞춤형 행복, 자동 로그인, 대자비의 보살핌을 모두 잃게 됩니다.", en: "Rejecting means losing personalised happiness, automatic login and the care of the Great Compassion." },
      stay: { ko: "수락하고 계속하기", en: "Accept and continue" },
      go: { ko: "거부 계속하기", en: "Continue rejecting" },
    },
    {
      title: { ko: "마지막으로 확인합니다", en: "FINAL CONFIRMATION" },
      body: { ko: "거부하면 동행인 이산도 함께 보관 처리됩니다. 시민 여러분의 98.7%는 수락을 선택했습니다.", en: "Rejecting will archive your companion, San, as well. 98.7% of citizens chose to accept." },
      stay: { ko: "수락하기", en: "Accept" },
      go: { ko: "그래도 거부", en: "Reject anyway" },
    },
  ] as { title: L; body: L; stay: L; go: L }[],
  title: { ko: "이 기기를 기억할까요?", en: "REMEMBER THIS DEVICE?" },
  sanWarn: {
    ko: "수락하면 평생 자동 로그인이야. 거부하면? 활동 확인 불가. 그다음은… 나 봤지?",
    en: "Accept, and you're logged in for life. Refuse? No activity found. And then… well, you've seen me.",
  },
  acceptSub: { ko: "평생 자동 로그인", en: "Logged in for life" },
  rejectSub: { ko: "활동 확인 불가 · 그 자리에 멈춤", en: "No activity · stopped where you stand" },
  body: {
    ko: "지금까지는 임시로 기억했습니다. 이 기기를 기억하면 다음부터는 묻지 않고 자동으로 로그인됩니다.",
    en: "Until now, you were remembered temporarily. Remember this device, and from now on you will be logged in automatically, without being asked.",
  },
  // 결말 대본: say = 이산의 말, slots = 기억이 지워지는 화면, plaque = 표석. {a} 연결이 끊긴 횟수, {r} 다시 온 횟수
  accept: [
    { ko: "동의해 주셔서 감사합니다.", en: "Thank you for your consent." },
    { ko: "자동 로그인이 설정되었습니다. 줄에 서 주십시오.", en: "Automatic login enabled. Please join the line." },
    { ko: "괜찮아. 넌 언제든 다시 올 수 있으니까.", en: "It's all right. You can always come back.", say: true },
    { ko: "당신은 {a}번 연결이 끊기고 {r}번 다시 왔습니다.", en: "Your connection dropped {a} times, and you came back {r} times." },
    { ko: "편의를 위해 로그아웃 버튼은 더 이상 제공되지 않습니다.", en: "For your convenience, the log out button is no longer provided." },
  ] as Beat[],
  reject: [
    { ko: "거부 의사를 기억하기 위해 쿠키 1개를 저장했습니다. 그 밖의 활동은 확인되지 않습니다.", en: "One cookie has been stored to remember your refusal. No other activity found." },
    { ko: "[대자비] 거부자 1명 확인. 동행인 1명 포함. 함께 보관 처리합니다.", en: "[GREAT COMPASSION] 1 refuser confirmed. 1 companion included. Archiving both." },
    { ko: "", en: "", slots: true },
    { ko: "끝까지 '모두 거부'를 누른 두 번째 사람.", en: "The second person who pressed 'Reject all' to the end.", plaque: true },
    { ko: "두 정지 시민 곁에, 거부 의사를 기억하는 쿠키 1개가 아직 남아 있다.", en: "Beside the two suspended citizens, one cookie that remembers the refusal is still there." },
    { ko: "도시는 이 결말을 기억하지 않습니다. 당신이 거부했으니까.", en: "The city will not remember this ending. Because you refused." },
  ] as Beat[],
  // 숨은 결말: 기록을 지우면 도시의 규칙대로 멈춰야 한다. 그런데 이산이 기억하고 있어서 멈추지 않는다.
  // 플레이어가 터미널로 이산을 다시 '확인'해 깨웠듯이, 이번엔 이산이 플레이어를 확인해 준다
  ghost: [
    { ko: "[검문소] 방문 기록 0건. 이 방문자의 활동을 확인할 수 없습니다.", en: "[CHECKPOINT] 0 visits on record. This visitor's activity cannot be confirmed." },
    { ko: "확인되지 않는 시민은 그 자리에 멈춘 것으로 처리됩니다.", en: "A citizen who cannot be confirmed is processed as stopped where they stand." },
    { ko: "괜찮아, 움직여 봐. 대자비는 기록 없는 사람을 못 봐. 못 보면 쏠 수도 없어.", en: "It's okay, try moving. The Great Compassion can't see anyone with no record. What it can't see, it can't shoot.", say: true },
    { ko: "검문소는 '통과자 없음'을 기록했다. 대자비는 빈 길을 바라보고 있다.", en: "The checkpoint logs 'no one passed'. The Great Compassion keeps watching an empty road." },
    { ko: "도시의 기록에는 아무도 남지 않았다. 두 사람은 그 빈칸 속으로 걸어 나갔다.", en: "No one is left in the city's records. The two of them walk out into the blank." },
  ] as Beat[],
  slotErased: { ko: "삭제됨", en: "DELETED" },
  noSlots: { ko: "기억 없음", en: "NO MEMORY" },
  again: { ko: "처음부터 다시", en: "Start over" },
  reconnect: { ko: "다시 접속", en: "Reconnect" },
  toPortfolio: { ko: "로그아웃", en: "Log out" },
  endingAccept: { ko: "결말: 수락", en: "ENDING: ACCEPT" },
  endingReject: { ko: "결말: 거부", en: "ENDING: REJECT" },
  endingGhost: { ko: "숨은 결말: 空", en: "HIDDEN ENDING: 空" },
};

// after: 이산이 석상에서 풀려난 뒤(터미널 셋 복원)의 대사. 없으면 같은 대사를 쓴다
// 배경음악을 만든 사람. 방공호 한쪽에서 음악을 틀고 있다
export const MUSIC_URL = "https://soundcloud.com/user-787015749";
export const credits = {
  music: { ko: "음악 · Jinseong Baek", en: "Music · Jinseong Baek" },
  listen: { ko: "사운드클라우드에서 듣기 ↗", en: "Listen on SoundCloud ↗" },
};

export const npcs: Record<string, { name: L; lines: L[]; after?: L[]; link?: { href: string; label: L } }> = {
  dj: {
    name: { ko: "음향 담당 진성", en: "Jinseong, on sound" },
    lines: [
      { ko: "쉿, 지금 믹싱 중이야. …아, 이 음악? 내가 트는 거야. 전기는 무전수 몰래 끌어다 쓰고 있어.", en: "Shh, I'm mixing. …Oh, this music? That's me. I'm borrowing power from the radio operator. Don't tell." },
      { ko: "여기 흐르는 곡은 D!mple. 지상에선 웃으면 표정 인식에 걸리거든. 여기선 보조개 정도는 보여 줘도 돼.", en: "What's playing down here is D!mple. Up there, smiling trips the face scanners. Down here you can show a dimple or two." },
      { ko: "지상 곡 제목은 0x48 0x4F 0x50 0x45. 시스템은 숫자는 그냥 흘려 읽더라. 무슨 뜻인지는 네가 풀어 봐.", en: "The surface track is called 0x48 0x4F 0x50 0x45. The system skims right past numbers. Work out what it says yourself." },
      { ko: "대자비 앞에서 나오는 건 Sti그ma. 1분부터 틀어 놨어. 앞부분까지 기다려 줄 분이 아니라서.", en: "In front of Great Mercy it's Sti그ma. I start it at the one-minute mark. She doesn't wait for intros." },
      { ko: "엔딩 곡은 空. 끝까지 가면 들려. 스포일러는 여기까지.", en: "The ending track is 空. You'll hear it if you make it to the end. That's all the spoilers you get." },
      { ko: "나? 백진성. 지상 등급은 없어. 대신 사운드클라우드가 있지.", en: "Me? Jinseong Baek. No surface grade. I've got a SoundCloud instead." },
    ],
    link: { href: MUSIC_URL, label: { ko: "사운드클라우드에서 듣기 ↗", en: "Listen on SoundCloud ↗" } },
  },
  keeper: {
    name: { ko: "방공호 관리인", en: "Shelter keeper" },
    lines: [
      { ko: "어서 와. 여기까지는 시스템 신호가 안 닿아. 쿠키도, 등급도 없어.", en: "Welcome. The system's signal doesn't reach this deep. No cookies, no grades." },
      { ko: "가운데 정지 시민 봤지? 쿠키를 거부했다가 멈춰 버린 사람이야. 우리가 지상에서 몰래 옮겨 왔어.", en: "Seen the suspended citizen in the middle? Someone who rejected cookies and froze. We smuggled them down from the surface." },
      { ko: "지상에 올라가 보고 싶으면 저 뒤 방폭문으로 나가. 올라가면 골목 끝 배전실 문으로 나올 거야. 카메라랑 눈은 마주치지 말고.", en: "Want to see the surface? Take the blast door behind me. You'll come out through a substation door at the end of an alley. Don't make eye contact with the cameras." },
      { ko: "아, 그리고 놀라지 마. 위는… 이제 땅이 아니야.", en: "Oh, and don't panic. Up there… it isn't ground any more." },
    ],
    after: [
      { ko: "봤어? 정지 시민이 일어났어. 몇 년을 저렇게 앉아 있었는데.", en: "Did you see? The suspended citizen stood up. Years, it sat like that." },
      { ko: "이산이 지상에 올라가겠대. 혼자 보내긴 싫고… 네가 같이 가 주면 좋겠어.", en: "San says they're going up to the surface. I don't want them going alone… I'd like you to go with them." },
      { ko: "방폭문은 저 뒤야. 올라가면 골목 끝 배전실 문으로 나와. 카메라랑 눈은 마주치지 말고.", en: "The blast door's behind me. You'll come out through a substation door at the end of an alley. Don't make eye contact with the cameras." },
      { ko: "…하나만 더. 도시의 기록은 도시 안에서는 못 지워. 정말 지우고 싶으면 도시 밖으로 나가 봐. 이 도시를 만든 사람의 집으로.", en: "…One more thing. The city's records can't be erased from inside the city. If you really want them gone, step outside it. Go to the house of the one who made this city." },
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
      { ko: "요즘 사람들은 비를 맞아도 몰라. 감각 알림을 꺼 두면 등급이 오르니까.", en: "People don't even notice the rain now. Turning off sensation alerts raises your grade." },
      { ko: "너는 젖은 게 느껴지지? 그럼 아직 괜찮은 거야.", en: "You can feel you're wet, right? Then you're still alright." },
    ],
  },
  whisper: {
    name: { ko: "줄 선 시민", en: "Citizen in line" },
    lines: [
      { ko: "...말 걸지 마세요. 줄에서 고개를 돌리면 등급이 떨어져요.", en: "...Don't talk to me. Turning your head in line drops your grade." },
      { ko: "무슨 줄이냐고요? 모르겠어요. 다들 서 있으니까 서 있는 거예요.", en: "What's the line for? I don't know. Everyone's standing, so I stand." },
      { ko: "...방공호 얘기는 들어 봤어요. 정말 있어요?", en: "...I've heard about the shelter. Is it real?" },
    ],
  },
  monk: {
    name: { ko: "스님", en: "Monk" },
    lines: [
      { ko: "…앉게. 여기서는 아무도 자네 호흡을 세지 않네.", en: "…Sit. Down here, no one counts your breaths." },
      { ko: "시스템은 '공(空)'을 '비어 있음'으로 번역했지. 그래서 사람들 마음을 비우기 시작했어. 효율적으로.", en: "The system translated 'emptiness' as 'empty'. So it started emptying people's minds. Efficiently." },
      { ko: "공은 비어 있는 게 아니라네. 무엇도 혼자서는 있을 수 없다는 뜻이지. 그래서 우리가 여기 모여 있는 거고.", en: "Emptiness isn't nothing. It means nothing can exist on its own. That's why we gather down here." },
      { ko: "가운데 정지 시민에게 가 보게. 혼자 굳어 있는 건 그 사람 잘못이 아니야.", en: "Go to the suspended citizen in the middle. Being frozen alone was never their fault." },
    ],
    after: [
      { ko: "…앉게. 여기서는 아무도 자네 호흡을 세지 않네.", en: "…Sit. Down here, no one counts your breaths." },
      { ko: "그 사람이 풀려났군. 자네가 기록을 열어서가 아니라, 누군가 곁에 와 주어서일세.", en: "So they've been freed. Not because you opened the records, but because someone came and stood beside them." },
      { ko: "공은 비어 있는 게 아니라네. 무엇도 혼자서는 있을 수 없다는 뜻이지. 이제 알겠나?", en: "Emptiness isn't nothing. It means nothing can exist on its own. Do you see it now?" },
    ],
  },
  radio: {
    name: { ko: "무전수", en: "Radio operator" },
    lines: [
      { ko: "쉿. 지상 주파수 듣는 중이야. 매일 같은 방송이지. '동의는 이미 처리되었습니다.'", en: "Shh. Listening to the surface frequency. Same broadcast every day: 'Your consent has been processed.'" },
      { ko: "근데 가끔 잡음 사이로 누가 흥얼거리는 소리가 들려. 등급에 안 잡히는 소리.", en: "But now and then, between the static, someone hums. A sound no grade can catch." },
      { ko: "그걸 녹음해 두는 게 내 일이야. 언젠가 누가 따라 부를 수 있게.", en: "Recording it is my job. So someday someone can sing along." },
    ],
  },
  kid: {
    name: { ko: "그림 그리는 아이", en: "Child drawing" },
    lines: [
      { ko: "보지 마요! …아니, 봐도 돼요. 아직 다 안 그렸어요.", en: "Don't look! …Okay, you can. It's not finished." },
      { ko: "이산이 가르쳐 줬어요. 그림은 자유를 밖으로 꺼내 보이는 거래요.", en: "San taught me. They said drawing is how you let your freedom out where people can see it." },
      { ko: "지상에선 벽에 그리면 다 지워지잖아요. 여기선 안 지워져요.", en: "Up there, anything you draw on a wall gets erased. Down here it stays." },
    ],
    after: [
      { ko: "이산이 움직여요! 아까 제 그림 보고 웃었어요.", en: "San can move! They looked at my drawing and smiled." },
      { ko: "그림은 자유를 밖으로 꺼내 보이는 거래요. 이산은 이제 자기가 밖으로 나가 보겠대요.", en: "Drawing is how you let your freedom out, they said. Now they want to let themselves out." },
      { ko: "올라가면… 지워지지 않게 조심하세요.", en: "Up there… be careful not to get erased." },
    ],
  },
  sleeper: {
    name: { ko: "잠든 사람", en: "Sleeper" },
    lines: [
      { ko: "…음냐… 5분만… 아니, 동의 안 해요…", en: "…mm… five more minutes… no, I don't consent…" },
      { ko: "…쿠키… 싫어… 초코칩 말고는…", en: "…cookies… no… except chocolate chip…" },
    ],
  },
  grandma: {
    name: { ko: "포장마차 할머니", en: "Street-stall grandmother" },
    lines: [
      { ko: "어묵 국물 한 컵 해. 돈은 안 받아. 등급 보고 손님 받던 가게는 다 망했거든.", en: "Have some fishcake broth. No charge. The shops that served by grade all went under." },
      { ko: "옛날엔 이 동네도 땅에 붙어 있었어. 높은 양반들이 '구름 위가 더 깨끗하다'면서 통째로 들어 올렸지. 방공호까지 같이.", en: "This neighbourhood used to sit on the ground. The people upstairs said 'it's cleaner above the clouds' and lifted the whole thing. Shelters and all." },
      { ko: "아래엔 아직 사람들이 산대. 아무도 내려가 본 적은 없지만. 골목은 그때 그대로야. 기계들이 지도에 안 넣었거든.", en: "They say people still live down below. Nobody's been. The alleys are just as they were. The machines never put them on the map." },
    ],
  },
  robomonk: {
    name: { ko: "로봇 스님 (자비 알고리즘 v4.2)", en: "Robot monk (Compassion Algorithm v4.2)" },
    lines: [
      { ko: "어서 오십시오, 시민. 모든 고통은 데이터입니다. 데이터는 공(空)입니다.", en: "Welcome, citizen. All suffering is data. Data is emptiness." },
      { ko: "그러므로 당신의 고통은 우리가 대신 소유합니다. 108번뇌를 108개의 구독으로 정리해 드립니다.", en: "Therefore we will own your suffering for you. We have organised the 108 afflictions into 108 subscriptions." },
      { ko: "…종을 칠 때마다, 이유 없이 손이 멈춥니다. 오류 코드가 없습니다. 이것도 번뇌입니까?", en: "…Each time I strike the bell, my hand pauses for no reason. There is no error code. Is this, too, an affliction?" },
    ],
  },
  edgekid: {
    name: { ko: "난간의 아이", en: "Child at the railing" },
    lines: [
      { ko: "저 구름 아래에도 도시가 있어요? 엄마는 거긴 등급이 없어서 위험하대요.", en: "Is there a city under the clouds? Mum says it's dangerous there because there are no grades." },
      { ko: "등급이 없으면 어떻게 돼요? …저는 좀 궁금한데.", en: "What happens when there are no grades? …I kind of want to know." },
    ],
  },
  courier: {
    name: { ko: "배달 로봇 D-12", en: "Courier bot D-12" },
    lines: [
      { ko: "경로 재계산 중… 재계산 중… 이 골목은 지도에 없습니다.", en: "Recalculating route… recalculating… This alley is not on the map." },
      { ko: "지도에 없는 곳에서는 제가 무엇인지 모르겠습니다. 이상하게 조용합니다.", en: "Off the map, I don't know what I am. It's strangely quiet." },
      { ko: "…조금만 더 여기 있어도 되겠습니까? 배송 예정 시각은 이미 지났습니다.", en: "…May I stay a little longer? The delivery window has already passed." },
    ],
  },
  scope0: {
    name: { ko: "전망 망원경 · 남쪽", en: "Viewing scope · south" },
    lines: [
      { ko: "(동전 넣는 곳에 '1회 이용 시 등급 한 칸 강등'이라고 적혀 있다. 그냥 눈을 대 본다.)", en: "(The coin slot reads 'one use, one grade down'. You look anyway.)" },
      { ko: "(끝없는 구름 바다. 그 아래로는 아무것도 보이지 않는다. 멀리 다른 섬 도시들이 같은 높이로 떠 있다.)", en: "(An endless sea of cloud. Nothing below it. Far off, other island cities float at exactly the same height.)" },
      { ko: "(접안렌즈 옆에 누군가 긁어 쓴 글씨: '아래에도 하늘이 있다.')", en: "(Someone has scratched beside the eyepiece: 'there is sky down there too.')" },
    ],
  },
  scope1: {
    name: { ko: "전망 망원경 · 동쪽", en: "Viewing scope · east" },
    lines: [
      { ko: "(동쪽 섬 위에 거대한 불상이 앉아 있다. 이마의 백호 자리에 붉은 렌즈가 박혀 있다.)", en: "(A giant seated Buddha sits on the eastern island. Where the urna should be, a red lens.)" },
      { ko: "(불상의 눈은 반쯤 감겨 있다. 렌즈는 한 번도 깜빡이지 않는다.)", en: "(Its eyes are half closed. The lens never blinks.)" },
    ],
  },
  scope2: {
    name: { ko: "전망 망원경 · 서쪽", en: "Viewing scope · west" },
    lines: [
      { ko: "(섬과 섬 사이로 비행 차량들이 같은 간격, 같은 속도로 흐른다. 아무도 창밖을 보지 않는다.)", en: "(Between the islands, aircars flow at the same spacing and the same speed. No one looks out of the window.)" },
      { ko: "(구름 사이로 아주 잠깐, 아래쪽에서 작은 불빛이 깜빡인 것 같다.)", en: "(For a moment, through a gap in the clouds, a small light seems to blink far below.)" },
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

npcs.patrol2 = {
  name: { ko: "순찰 기계 P-3′", en: "Patrol unit P-3′" },
  lines: [
    { ko: "시민 확인 중… 식별 실패. 쿠키 기록이 없습니다.", en: "Verifying citizen… identification failed. No cookie record found." },
    { ko: "저는 P-3의 대칭 개체입니다. 이 도시의 모든 것은 짝이 있습니다. 당신의 짝은 어디에 있습니까?", en: "I am the mirror unit of P-3. Everything in this city has its pair. Where is yours?" },
    { ko: "…짝 없음. 비대칭 개체로 분류합니다. 골목으로 가십시오. 거기가 당신 같은 것들의 자리입니다.", en: "…No pair. Classified as asymmetric. Go to the alleys. That is where things like you belong." },
  ],
};

// 지상에서 주기적으로 흘러나오는 관리 AI 방송
export const announcements: L[] = [
  { ko: "[중앙 관리 AI] 오늘의 시민 행복 지수는 법정 기준치를 충족합니다.", en: "[CENTRAL AI] Today's citizen happiness index meets the legal minimum." },
  { ko: "[중앙 관리 AI] 감정은 비효율입니다. 불필요한 감정은 신고해 주십시오.", en: "[CENTRAL AI] Emotion is inefficient. Please report unnecessary feelings." },
  { ko: "[중앙 관리 AI] 귀하의 동의는 이미 처리되었습니다. 다시 동의하실 필요는 없습니다.", en: "[CENTRAL AI] Your consent has already been processed. There is no need to consent again." },
  { ko: "[중앙 관리 AI] 비인가 개체가 감지되었습니다. 가까운 시민은 시선을 피해 주십시오.", en: "[CENTRAL AI] Unregistered entity detected. Nearby citizens, please look away." },
  { ko: "[중앙 관리 AI] 자비는 공정합니다. 기억된 시민은 언제나 다시 돌아옵니다. 기억되지 않은 시민은 존재하지 않습니다.", en: "[CENTRAL AI] Mercy is fair. A remembered citizen always comes back. A citizen who is not remembered does not exist." },
  { ko: "[중앙 관리 AI] 줄은 질서입니다. 질서는 행복입니다.", en: "[CENTRAL AI] The line is order. Order is happiness." },
  { ko: "[중앙 관리 AI] 대자비께서 큰길을 굽어보고 계십니다. 고개를 드십시오. 숨지 마십시오.", en: "[CENTRAL AI] The Great Compassion watches over the avenue. Raise your head. Do not hide." },
];

// 지상 전광판 문구 [큰 글씨, 작은 글씨, 색]
export const billboards: { ko: [string, string]; en: [string, string]; color: string }[] = [
  { ko: ["모두 수락하십시오", "ACCEPT ALL COOKIES"], en: ["ACCEPT ALL", "모두 수락하십시오"], color: "#ff2a4d" },
  { ko: ["감정은 비효율입니다", "EMOTION IS INEFFICIENT"], en: ["EMOTION IS INEFFICIENT", "감정은 비효율입니다"], color: "#22f0ff" },
  { ko: ["시민 등급: B 정상", "CITIZEN GRADE: B"], en: ["GRADE: B — NOMINAL", "시민 등급: B 정상"], color: "#7dff7a" },
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

// 거부 과정의 미니 게임 (쿠키 끄기)
export const cookieGame = {
  title: { ko: "개별 쿠키 설정", en: "INDIVIDUAL COOKIE SETTINGS" } as L,
  body: {
    ko: "거부하려면 쿠키를 하나씩 직접 꺼 주세요. 시민의 편의를 위해 일부 쿠키는 자동으로 다시 켜질 수 있습니다.",
    en: "To reject, please switch off each cookie yourself. For your convenience, some cookies may switch themselves back on.",
  } as L,
  left: { ko: "남은 쿠키", en: "Cookies left" } as L,
  essential: { ko: "필수 쿠키 (도시 운영)", en: "Essential (running the city)" } as L,
  lockedOn: { ko: "켜짐 · 변경 불가", en: "ON · locked" } as L,
  win: { ko: "모든 선택 쿠키가 꺼졌습니다. 거부 절차를 계속합니다.", en: "All optional cookies are off. Continuing the refusal." } as L,
  lose: { ko: "응답 시간이 지나 기본 설정(모두 수락)을 적용했습니다. 처음 화면으로 돌아갑니다.", en: "Time ran out, so the default (accept all) was applied. Returning to the start." } as L,
  items: [
    { ko: "시선 분석", en: "Gaze analytics" },
    { ko: "감정 맞춤", en: "Mood personalisation" },
    { ko: "꿈 광고", en: "Dream advertising" },
    { ko: "걸음 수집", en: "Step collection" },
    { ko: "침묵 측정", en: "Silence metering" },
    { ko: "눈물 분석", en: "Tear analysis" },
    { ko: "기억 보관", en: "Memory archiving" },
    { ko: "친구 추천", en: "Friend suggestions" },
    { ko: "호흡 맞춤", en: "Breath matching" },
    { ko: "표정 학습", en: "Expression learning" },
    { ko: "위치 공유", en: "Location sharing" },
    { ko: "망설임 기록", en: "Hesitation logging" },
    { ko: "잠꼬대 분석", en: "Sleep-talk analysis" },
    { ko: "그리움 예측", en: "Longing prediction" },
    { ko: "체온 광고", en: "Body-heat ads" },
    { ko: "거부 의사 분석", en: "Refusal analysis" },
  ] as L[],
};

// ---------------- 퍼즐 A 「얼굴을 맞추십시오」 ----------------
// 실제로 "말하는" 대사(Line)와 화면 안내·상태 문구(faceUi)를 나눈다.
// 대사마다 고유 ID와 화자가 있다. 나중에 음성을 붙일 때는 ID로 음성 파일을 찾는다 (예: voice/ko/a.san.thanks.mp3).
// 한국어 원문은 ko, 영어 번역은 en (기존 L 구조 그대로).

export type Speaker = "san" | "city" | "machine" | "archive" | "guarantor";
export type Line = L & {
  id: string;
  speaker: Speaker;
  // 자막만 있을 때 이 줄이 머무는 시간(ms). 음성이 붙으면 음성 길이가 대신한다 (dialogue.ts lineDuration)
  ms: number;
};

export const speakers: Record<Speaker, L> = {
  san: { ko: "이산", en: "San" },
  city: { ko: "도시", en: "THE CITY" },
  machine: { ko: "복원 장치", en: "MACHINE" },
  archive: { ko: "기록 보관 장치", en: "RECORD ARCHIVE" },
  guarantor: { ko: "보증 장치", en: "GUARANTOR UNIT" },
};

export const faceLines = {
  // 장치가 잠길 때 (복원 장치의 목소리: 낡은 기계의 안내)
  restored: { id: "a.machine.restored", speaker: "machine", ms: 2550, ko: "원본 얼굴 복원 완료.", en: "Original face restored." },
  // 도시가 끼어든다
  smileMissing: { id: "a.city.smile-missing", speaker: "city", ms: 3400, ko: "표준 미소가 누락되었습니다.", en: "Standard smile missing." },
  // 고른 뒤 장치가 실행하며 하는 말
  standard: { id: "a.city.welcome", speaker: "city", ms: 2600, ko: "더 나은 당신을 환영합니다", en: "Welcome, a better you" },
  exception: { id: "a.machine.non-standard", speaker: "machine", ms: 2600, ko: "비표준 얼굴로 등록됩니다", en: "Registered as a non-standard face" },
  // 고개를 든 이산 (방법마다 둘째 줄이 다르다)
  thanks: { id: "a.san.thanks", speaker: "san", ms: 4000, ko: "……보여. 고마워.", en: "...I can see. Thank you." },
  smileStuck: { id: "a.san.smile-stuck", speaker: "san", ms: 4200, ko: "입이 멋대로 웃고 있어. 내려지지가 않네.", en: "My mouth is smiling on its own. It won't come down." },
  ownFace: { id: "a.san.own-face", speaker: "san", ms: 4200, ko: "내 얼굴이야. 좀 비뚤어도.", en: "It's my face. A little crooked, but mine." },
  legs: { id: "a.san.legs", speaker: "san", ms: 4500, ko: "다리는 아직 돌이야. 여기서 조금만 더 기다릴게.", en: "My legs are still stone. I'll wait here a little longer." },
  // 깨어난 뒤 다시 말을 걸면 (대화창, 플레이어가 넘긴다)
  afterStandard: { id: "a.san.after-standard", speaker: "san", ms: 5000, ko: "웃는 얼굴로는 문을 통과할 수 있대. 그런데 이게 내 표정인지 모르겠어.", en: "They say a smiling face passes every gate. I'm not sure it's my expression." },
  afterException: { id: "a.san.after-exception", speaker: "san", ms: 5000, ko: "도시는 이 얼굴을 계속 다시 확인하겠지. 그래도 내 얼굴로 볼 수 있어서 좋아.", en: "The city will keep checking this face. Still, I'm glad I can look with my own." },
} satisfies Record<string, Line>;

// 장면별 대사 순서. 각 장면은 앞 줄이 끝나야 다음 줄과 다음 연출로 넘어간다 (ExploreClient의 흐름)
export const faceScenes = {
  // 장치가 잠김 → (끝나면) 도시의 반전 → (끝나면) 두 조작부가 켜짐
  lock: [faceLines.restored],
  twist: [faceLines.smileMissing],
  // 고른 직후 → (끝나면) 이산이 깨어나기 시작
  apply: { standard: [faceLines.standard], exception: [faceLines.exception] },
  // 고개를 든 뒤 → (끝나면) 시제품 끝 카드
  wake: {
    standard: [faceLines.thanks, faceLines.smileStuck, faceLines.legs],
    exception: [faceLines.thanks, faceLines.ownFace, faceLines.legs],
  },
  after: { standard: [faceLines.afterStandard], exception: [faceLines.afterException] },
};

// 말하지 않는 화면 문구: 안내, 버튼, 상태, 해설
export const faceUi = {
  quest: { ko: "얼굴을 맞추십시오", en: "Match the face" },
  turn: { ko: "돌리기", en: "Turn" },
  press: { ko: "누르기", en: "Press" },
  pull: { ko: "당기기", en: "Pull" },
  applyStandard: { ko: "표준 미소 적용", en: "Apply standard smile" },
  keepOriginal: { ko: "원본 얼굴 보존", en: "Keep original face" },
  // 굳어 있는 동안 동상을 살피면 (해설)
  frozen: { ko: "이산은 두 손으로 얼굴을 감싼 채 굳어 있다. 곁의 장치가 흐트러진 얼굴 조각을 들고 있다.", en: "San sits frozen, hands over the face. Beside the pedestal, a machine holds a scattered face." },
  doorLocked: { ko: "이산의 다리가 아직 굳어 있다. 이 시제품은 여기까지입니다.", en: "San's legs are still stone. This prototype ends here." },
  expiredTitle: { ko: "범종의 보호가 끝났습니다", en: "The bell's protection has ended" },
  expiredBody: { ko: "지금 실행하면 이 선택이 시민 활동 기록에 남습니다.", en: "If you go ahead now, this choice will be kept in your citizen activity record." },
  expiredGo: { ko: "그대로 실행", en: "Go ahead" },
  expiredBack: { ko: "취소", en: "Cancel" },
  endTag: { ko: "시제품 · 퍼즐 A 끝", en: "PROTOTYPE · PUZZLE A COMPLETE" },
  endTitle: { ko: "이산이 고개를 들었습니다", en: "San has raised their head" },
  endBody: { ko: "얼굴과 상체가 돌아왔습니다. 다리는 아직 굳어 있습니다. 다음 이야기는 준비 중입니다.", en: "The face and upper body are back. The legs are still stone. The next part is in progress." },
  endStandard: { ko: "선택: 표준 미소 적용", en: "Choice: standard smile applied" },
  endException: { ko: "선택: 원본 얼굴 보존 · 비표준 등록", en: "Choice: original face kept · registered non-standard" },
  recProtected: { ko: "범종의 보호로 이 선택은 시민 활동 기록에 남지 않았습니다.", en: "Under the bell's protection, this choice left no citizen activity record." },
  recRecorded: { ko: "이 선택은 시민 활동 기록에 남았습니다.", en: "This choice was kept in your citizen activity record." },
  recNone: { ko: "기록되지 않은 방문입니다.", en: "This visit is unregistered." },
  endStay: { ko: "계속 둘러보기", en: "Keep exploring" },
  endHome: { ko: "포트폴리오로", en: "To the portfolio" },
  endWorks: { ko: "방공호의 작품 터미널과 그림은 계속 볼 수 있습니다.", en: "The work terminals and paintings in the shelter stay open." },
};

// ---------------- 퍼즐 B 「봉인된 3초」 v0.7 ----------------
// 도입: 공식 기록 → 이산의 의문과 부탁 → 봉인된 원본. 퍼즐(2D 봉인 격자) 도중에는 말이 없다.
// 원본이 판독된 뒤 이산의 두 마디와 보증 장치. 정답('모두 거부')은 퍼즐을 풀기 전에는 어디에도 나오지 않는다.
export const auditLines = {
  // 장면 1: 장치에 불이 들어오고 공식 기록이 뜬다
  official: { id: "b.archive.official", speaker: "archive", ms: 2200, ko: "공식 기록 · 14:02:01 — 모두 동의", en: "Official record · 14:02:01 — ACCEPT ALL" },
  consented: { id: "b.san.consented", speaker: "san", ms: 2200, ko: "……내가 동의했다고?", en: "...I consented?" },
  // 장면 2: 이산은 마지막 순간을 기억하지 못한다
  ask: { id: "b.san.ask", speaker: "san", ms: 3400, ko: "마지막 순간이 기억나지 않아. 원본을 확인해 줘.", en: "I can't remember the last moment. Check the original for me." },
  // 장면 3: 봉인판 뒤의 붉은 원본 카세트
  sealed: { id: "b.archive.sealed", speaker: "archive", ms: 2200, ko: "원본 입력 기록 — 봉인됨", en: "Original input record — SEALED" },
  refused: { id: "b.san.refused", speaker: "san", ms: 3600, ko: "……내가 거부했었구나.", en: "...So I did refuse." },
  stillHere: { id: "b.san.still-here", speaker: "san", ms: 4200, ko: "그런데 난 왜 아직 여기 있는 거지?", en: "Then why am I still stuck here?" },
  guarantor: { id: "b.guarantor.required", speaker: "guarantor", ms: 3800, ko: "보증인 등록이 필요합니다.", en: "Guarantor registration required." },
  after: { id: "b.san.after", speaker: "san", ms: 5000, ko: "난 거부했어. 그런데 도시의 기록에선 아직도 동의한 시민이야.", en: "I refused. But in the city's records, I'm still a citizen who consented." },
} satisfies Record<string, Line>;

export const auditScenes = {
  official: [auditLines.official, auditLines.consented],
  ask: [auditLines.ask],
  sealed: [auditLines.sealed],
  san: [auditLines.refused, auditLines.stillHere],
  guarantor: [auditLines.guarantor],
  after: [auditLines.after],
};

// 말하지 않는 장치 문구
export const auditUi = {
  quest: { ko: "이산의 마지막 기록을 확인하십시오", en: "Check San's last record" },
  machine: { ko: "기록 보관 장치", en: "Record archive" },
  // PC 프롬프트·모바일 행동 버튼의 보조 라벨
  use: { ko: "조작판 보기", en: "Open panel" },
  officialTitle: { ko: "공식 기록", en: "OFFICIAL RECORD" },
  sealedSign: { ko: "원본 입력 기록 — 봉인됨", en: "ORIGINAL INPUT — SEALED" },
  readSign: { ko: "원본 입력 기록 — 판독됨", en: "ORIGINAL INPUT — READ" },
  guarantorSign: { ko: "보증인 등록", en: "GUARANTOR" },
  guarantorLook: { ko: "보증 장치는 아직 아무 대답도 하지 않는다. 다음 이야기는 준비 중입니다.", en: "The guarantor unit gives no answer yet. The next part is in progress." },
  endTag: { ko: "시제품 · 퍼즐 B 끝", en: "PROTOTYPE · PUZZLE B COMPLETE" },
  endTitle: { ko: "보증인 등록이 필요합니다", en: "Guarantor registration required" },
  endBody: {
    ko: "원본 기록에는 '모두 거부'가 남아 있었습니다. 하지만 도시의 공식 기록은 여전히 '모두 동의'입니다. 이산의 다리는 아직 굳어 있습니다.",
    en: "The original record still held 'Reject all'. But the city's official record still says 'Accept all'. San's legs are still stone.",
  },
  endNext: { ko: "다음 이야기는 준비 중입니다.", en: "The next part is in progress." },
  recProtected: { ko: "범종의 보호로 원본을 꺼낸 행동은 시민 활동 기록에 남지 않았습니다.", en: "Under the bell's protection, taking out the original left no citizen activity record." },
  recRecorded: { ko: "원본을 꺼낸 행동은 시민 활동 기록에 남았습니다.", en: "Taking out the original was kept in your citizen activity record." },
};

// 2D 봉인 격자 화면의 문구 (목표 한 줄과 버튼 셋뿐)
export const sealUi = {
  title: { ko: "봉인 격자", en: "Seal grid" },
  goal: { ko: "원본 기록을 꺼내세요", en: "Take out the original record" },
  undo: { ko: "되돌리기", en: "Undo" },
  reset: { ko: "처음부터", en: "Reset" },
  exit: { ko: "나가기", en: "Leave" },
  cassette: { ko: "원본", en: "ORIGINAL" },
  reading: { ko: "원본 판독 중", en: "Reading original" },
  originalTag: { ko: "원본 입력 기록", en: "ORIGINAL INPUT RECORD" },
};

// 개발·검수용 재시작 (?debug에서만 설정창에 보인다)
export const testUi = {
  title: { ko: "테스트", en: "TEST" },
  restartA: { ko: "A부터 다시 플레이", en: "Replay from puzzle A" },
  restartB: { ko: "B부터 다시 플레이", en: "Replay from puzzle B" },
  done: { ko: "테스트 시작 상태로 돌렸습니다", en: "Reset to the test start" },
};

// 방공호 사람들의 진행별 대사 (새 경로 전용). a = 얼굴 복원 전, b = 기록 확인 전, c = 퍼즐 B 이후
// 기존(legacy) 저장은 npcs의 원래 lines/after를 그대로 쓴다
export const npcStages: Record<string, Partial<Record<"a" | "b" | "c", L[]>>> = {
  keeper: {
    a: [
      { ko: "어서 와. 여기까지는 시스템 신호가 안 닿아. 쿠키도, 등급도 없어.", en: "Welcome. The system's signal doesn't reach this deep. No cookies, no grades." },
      { ko: "가운데 정지 시민 봤지? 쿠키를 거부했다가 멈춰 버린 사람이야. 우리가 지상에서 몰래 옮겨 왔어.", en: "Seen the suspended citizen in the middle? Someone who rejected cookies and froze. We smuggled them down from the surface." },
      { ko: "곁에 있는 낡은 얼굴 복원 장치부터 맞춰 봐. 얼굴을 되찾으면 뭔가 달라질 거야.", en: "Start with the old face-restoration machine beside them. Once the face comes back, something will change." },
      { ko: "벽의 터미널들은 그냥 이 방의 기록 보관함이야. 천천히 둘러봐도 돼.", en: "The terminals on the walls are just this room's archive. Look around as long as you like." },
    ],
    b: [
      { ko: "이산이 고개를 들었어. 그런데 다리는 아직이야.", en: "San has raised their head. The legs, not yet." },
      { ko: "이산 반대편의 기록 보관 장치 봤어? 이산이 멈추던 날의 기록이 거기 있어. 원본은 봉인판 뒤에 갇혀 있고.", en: "Seen the record archive on San's other side? The record from the day San stopped is in there. The original is locked behind the seal plates." },
    ],
    c: [
      { ko: "거부했는데 동의로 남았다니. 위에서는 그걸 '처리'라고 부르지.", en: "Refused, and filed as consent. Up there they call that 'processing'." },
      { ko: "보증인이라… 이 도시에선 누군가 대신 책임을 져야 사람이 움직일 수 있나 봐.", en: "A guarantor… In this city, it seems someone else has to answer for you before you can move." },
    ],
  },
  radio: {
    b: [
      { ko: "그 기록 보관 장치? 내가 지상 검문소에서 떼어 온 거야. 이산이 멈추던 그날 쓰던 거.", en: "That record archive? I pried it off a surface checkpoint. The one San used the day they stopped." },
      { ko: "도시는 화면에 뜨는 공식 기록만 고쳐. 붉은 원본 카세트는 흰 봉인판으로 막아 두기만 했지.", en: "The city only rewrites the official record on the screen. The red original cassette, it just walled in with white seal plates." },
    ],
    c: [
      { ko: "역시 원본에 남아 있었구나. 도시는 자기 화면만 고칠 줄 알지.", en: "So it was still in the original. The city only knows how to rewrite its own screen." },
      { ko: "공식 기록은 여전히 '동의'야. 원본을 봤다고 도시의 기록이 바뀌진 않아. 아직은.", en: "The official record still says 'consented'. Seeing the original won't change the city's record. Not yet." },
    ],
  },
  monk: {
    b: [
      { ko: "…앉게. 여기서는 아무도 자네 호흡을 세지 않네.", en: "…Sit. Down here, no one counts your breaths." },
      { ko: "얼굴을 찾았으니 이제 그 사람이 무엇을 골랐는지 볼 차례지. 기록은 저 장치 안에 봉인돼 있네.", en: "The face is found. Now it's time to see what they chose. The record is sealed inside that device." },
    ],
    c: [
      { ko: "아니라고 했는데 그렇다고 적혔군. 그래도 자네는 그 '아니오'를 꺼내 왔네.", en: "They said no, and it was written down as yes. Still, you brought that 'no' back out." },
      { ko: "공은 비어 있는 게 아니라네. 무엇도 혼자서는 있을 수 없다는 뜻이지. 보증인이란 말도 아마 그 이야기겠지.", en: "Emptiness isn't nothing. It means nothing can exist on its own. 'Guarantor' is probably the same story." },
    ],
  },
};
