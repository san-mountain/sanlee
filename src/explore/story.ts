// DELETE SEOUL의 모든 문구. 대사를 바꾸고 싶으면 이 파일만 고치면 됩니다.
import type { L } from "@/data/site";

// 대화 한 줄. who가 없으면 대화창의 이름(대개 이산)이 말한다. you = 방문자, narr = 지문(괄호 속 행동)
export type Line = L & { who?: "you" | "narr" };

export const plaque: L[] = [
  { ko: "이산 (마지막 접속: 2087년)", en: "SAN LEE (LAST SEEN: 2087)" },
  { ko: "끝까지 '모두 거부'를 누른 사람", en: "The One Who Pressed 'Reject All' to the End" },
  {
    ko: "2087년 서울에서 모든 쿠키를 거부한 시민.",
    en: "A citizen of Seoul, 2087, who rejected every cookie.",
  },
  {
    ko: "도시는 이 시민의 이름을 지우지 않았다. 무엇을 하는지 확인할 수 없다는 이유로, 그 이름을 멈춰 두었을 뿐이다. 남은 사람들이 몰래 이곳 지하로 옮겨 왔다.",
    en: "The city did not erase this citizen's name. It only stopped that name, because it could no longer confirm what the citizen was doing. Those who remained carried them down here in secret.",
  },
];

export const ui = {
  title: { ko: "DELETE SEOUL", en: "DELETE SEOUL" },
  introLines: [
    { ko: "2087년 서울. 추적을 거부한 시민은 그 자리에 멈춥니다. 신호가 닿지 않는 지하 방공호 B-7에, 그렇게 멈춘 한 사람이 있습니다.", en: "Seoul, 2087. Citizens who refuse tracking stop where they stand. In Shelter B-7, deep where the signal cannot reach, one of them sits still." },
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
  // 터미널을 열 때 뜨는 짧은 상태: 바깥 방문자가 오프라인 사본을 열람했다
  restored: { ko: "외부 열람 기록에 연결됨", en: "Linked to an outside viewing record" },
  noWebgl: {
    ko: "이 기기에서는 3D 도시를 열 수 없어요. 대신 일반 웹사이트로 안내할게요.",
    en: "This device can't open the 3D city, so here's the regular website instead.",
  },
  popup: { ko: "이 도시는 시민을 추적하기 위해 쿠키를 사용합니다.", en: "This city uses cookies to track its citizens." },
  accept: { ko: "모두 수락", en: "Accept all" },
  reject: { ko: "모두 거부", en: "Reject all" },
  plaqueShort: { ko: "끝까지 '모두 거부'를 누른 사람", en: "The One Who Rejected All" },
  terminalLocked: [
    { ko: "[오프라인 사본] 열람 대기 중.", en: "[OFFLINE COPY] Waiting for a viewer." },
    { ko: "누구의 기록인지부터 알아야 할 것 같다. 가운데 정지 시민에게 먼저 말을 걸어 보자.", en: "First, find out whose record this is. Speak to the suspended citizen in the middle." },
  ] as L[],
  toPortfolio: { ko: "웹사이트로 가기", en: "Go to the website" },
  exitLocked: [
    { ko: "[방폭문] 잠김. 동행인 없이 지상으로 나갈 수 없습니다.", en: "[BLAST DOOR] Locked. You may not go up without a companion." },
    { ko: "먼저 가운데 정지 시민, 이산을 깨우자. 터미널 세 대의 기록을 열면 된다. ({n}/3)", en: "First wake San, the suspended citizen in the middle. Open the records on the three terminals. ({n}/3)" },
  ] as L[],
  exitTalk: { ko: "이산이 풀려났다. 먼저 이산에게 말을 걸자.", en: "San is free. Talk to San first." },
  zoneBunker: { ko: "B-7 방공호 · 지하 40m", en: "SHELTER B-7 · 40m BELOW" },
  zoneCity: { ko: "지상 · 부유 감시구역 7 · 고도 2,400m", en: "SURFACE · FLOATING ZONE 7 · ALT 2,400m" },
  goingUp: { ko: "지상으로 올라가는 중…", en: "Ascending to the surface…" },
  goingDown: { ko: "방공호로 내려가는 중…", en: "Descending to the shelter…" },
  tracked: { ko: "● 감시 중", en: "● TRACKED" },
  // 기억으로 깨어난 둘: 카메라는 사람 모양을 보지만 누구인지 묶지 못한다
  unresolved: { ko: "○ 식별 불가", en: "○ UNRESOLVED" },
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
  // 空 결말: 조작을 돌려받은 뒤 화면 아래의 작은 안내
  stepHint: { ko: "계단 쪽으로", en: "Toward the stairs" },
  notRecorded: { ko: "발견한 결말 · 이 결말은 기록되지 않음", en: "Endings found · this one is not recorded" },
  welcomeB: { ko: "다시 오셨군요.", en: "Welcome back." },
  you: { ko: "나", en: "You" },
  // 남쪽 망원경으로 볼 때: 방문자가 보는 것만 적는다 (이산이 본 것은 대화창에서 이산의 말로만 나온다)
  scopeSees: { ko: "구름이 아래를 덮고 있다. 움직이는 건 구름뿐이다.", en: "Cloud covers everything below. Only the cloud moves." },
  scopeExit: { ko: "눈 떼기", en: "Look away" },
  // 남쪽 망원경 앞의 상호작용 이름 (이산이 비켜선 뒤, 그리고 장면이 끝난 뒤로는 언제든)
  scopeLook: { ko: "망원경 들여다보기", en: "Look through the scope" },
  scopeHintPc: { ko: "마우스로 둘러보기 · E 또는 Esc로 눈 떼기", en: "Mouse to look around · E or Esc to look away" },
  scopeHintTouch: { ko: "화면을 끌어 둘러보기", en: "Drag the screen to look around" },
};

// 순찰 드론의 경고 (대자비의 시선과 따로 뜬다)
export const droneUi = {
  name: { ko: "순찰 드론", en: "PATROL DRONE" },
  lit: { ko: "빛 속에 있음 · 활동 기록 대조 중 — 빛 밖으로", en: "In the light · matching activity records — get out of it" },
  lost: { ko: "놓침", en: "Lost you" },
  sent: { ko: "식별됨 · 활동 기록 연결 · 대자비에게 위치 전송", en: "Identified · linked to activity record · position sent to the Great Compassion" },
  caught: { ko: "식별됨 · 활동 기록 연결", en: "Identified · linked to activity record" },
  // 기억으로 깨어난 둘: 빛은 몸(형체)을 보지만 그 몸에 이을 활동 기록을 찾지 못한다. 따라가지도, 채우지도 않는다
  shape: { ko: "형체 감지 · 활동 기록 연결 불가", en: "Shape detected · no activity record to link" },
  caughtTitle: { ko: "드론에 식별되었습니다", en: "IDENTIFIED BY A DRONE" },
  caughtSub: { ko: "들키기 전 자리에서 다시 갑니다.", en: "Going again from before you were seen." },
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
    ko: "큰길 끝의 대자비가 보고 있어요. 비석이나 컨테이너 뒤에 숨거나 줄 속에 가만히 서면 들키지 않아요. 단, 드론의 흰 빛 원 안에서는 줄 속이라도 보여요.",
    en: "The Great Compassion at the end of the avenue is watching. Hide behind steles or containers, or stand still in the queue. But inside a drone's white circle of light, you are seen even in the queue.",
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
    { ko: "머리 위 드론의 흰 빛 원 안에서는 줄 속이라도 보입니다. 빛이 오래 머물면 대자비가 곧장 조준해요. 빛 밖으로 나가세요.", en: "Inside a drone's white circle of light you are seen, even in the queue. If the light stays on you, the Great Compassion takes aim at once. Get out of the light." },
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
  terminal: { ko: "기록 열기", en: "Open the records" },
  statue: { ko: "정지 시민에게 말 걸기", en: "Talk to the suspended citizen" },
  san: { ko: "이산에게 말 걸기", en: "Talk to San" },
  exit: { ko: "지상으로", en: "To the surface" },
  checkpoint: { ko: "하층행 승강장 · 검문소 경유", en: "Descent platform · via the checkpoint" },
  scope: { ko: "망원경으로 아래 살펴보기", en: "Look below through the scope" },
  back: { ko: "방공호로 돌아가기", en: "Back to the shelter" },
  // 망원경 뒤: 이산의 물음에 아직 답하지 않았다 / 승강장으로 가기로 했다 (천막은 이산이 걷는다)
  decide: { ko: "이산에게 대답하기", en: "Answer San" },
  cordon: { ko: "이산과 통제선 끝 천막으로", en: "With San, to the tarp at the cordon's end" },
};

// 방문한 터미널 수(0~3)에 따라 동상 대사가 바뀝니다.
export const statueLines: L[][] = [
  [
    { ko: "…쿠키를… 거부… 합니다…", en: "…I reject… all… cookies…" },
    { ko: "…누구야? 사람 목소리는 오랜만이네.", en: "…Who's there? It's been a long time since I heard a voice." },
    {
      ko: "지상에서 추적 쿠키를 전부 거부했어. 그날부터 이렇게 앉아 있어. '활동을 확인할 수 없는 시민.' 그게 지금의 나야.",
      en: "Up there, I rejected every tracking cookie. I've been sitting like this ever since. 'A citizen whose activity cannot be confirmed.' That's me now.",
    },
    {
      ko: "여기 사람들이 날 업고 내려왔어. 이 방 터미널 세 대에 내 기록이 있대. 하나씩 열어 줄래?",
      en: "The people here carried me down. They say my records are on the three terminals in this room. Would you open them, one by one?",
    },
  ],
  [
    { ko: "오, 머리가 돌아왔다. 네가 열어 본 거지?", en: "Oh, my head's back. That was you, opening it?" },
    { ko: "아직 두 대 남았어. 참고로 거부 버튼은 늘 오른쪽 아래에 있어.", en: "Two more to go. Tip: the reject button is always in the bottom-right corner." },
  ],
  [
    { ko: "몸통까지 돌아왔어. 이제 거의 사람 같지?", en: "Torso's back too. Almost human now, right?" },
    { ko: "마지막 한 대만 더. 천천히 봐. 나는 어차피 여기 앉아 있으니까.", en: "Just one more. Take your time. I'm not going anywhere." },
  ],
  [
    { ko: "……움직인다. 고마워.", en: "……I can move. Thank you." },
    { ko: "저 그림들, 내가 그린 걸로 기억해.", en: "Those paintings. I remember painting them." },
    { ko: "그런데 구름 아래가 어떤지는 기억에 없어.", en: "But I have no memory of what it's like under the clouds." },
    { ko: "남쪽 망원경에선 아래가 보일 때도 있대.", en: "They say sometimes you can see below from the south scope." },
    { ko: "한 번은 직접 보고 싶어. 같이 가 줄래?", en: "I want to see it myself, just once. Will you come with me?" },
  ],
];

// 기록을 지우고 돌아온 방문자: 이산은 처음 보는 사람처럼 대한다. 첫 만남 전체를 되풀이하지 않는다
export const statueForgot: L[] = [
  { ko: "…쿠키를… 거부… 합니다…", en: "…I reject… all… cookies…" },
  { ko: "…누구야? 처음 듣는 목소리인데.", en: "…Who's there? I don't know that voice." },
];

// 지상에서 이산에게 말을 걸면 (선택 대화). 진행 단계마다 다르다. 삭제나 시 이야기는 하지 않는다
export const sanCity = {
  // 망원경 가기 전: 보고 돌아올 생각이다
  scope: [
    { ko: "남쪽 전망대 망원경까지만 가자. 보고 돌아오는 거야.", en: "Just to the scope at the south lookout. We look, and we come back." },
    { ko: "광장 서쪽 끝에서 바깥 산책로로 돌아가. 드론 빛이 지나가면 내가 먼저 건널게.", en: "From the west end of the plaza we go round by the outer walkway. When the drone light passes, I'll cross first." },
  ] as Line[],
  // 승강장으로 가기로 한 뒤: 이제 자기 눈으로 보러 내려가고 싶다
  descent: [
    { ko: "승강장은 검문소 너머야. 통제선 끝 천막 뒤로 돌아가자.", en: "The platform's past the checkpoint. We go round behind the tarp at the end of the cordon." },
    { ko: "저 아래, 그게 뭐였는지 직접 보고 싶어.", en: "I want to see for myself what that was, down there." },
  ] as Line[],
};

// 남쪽 전망대의 망원경 장면. 이산이 먼저 들여다보고, 빛은 이산만 본다.
// 방문자에게는 어떤 화면·자막·낭독 문구로도 그 빛이 보이지 않는다
// 차례: ask(방문자가 말을 걸면, 이산이 접안렌즈로 걸어간다) → 도착 뒤 정적 → first[0] → 비켜서며 first[1] →
// 방문자가 '망원경 들여다보기' → 눈을 떼고 돌아서면 after → decide와 두 선택지
export const scopeScene = {
  ask: { ko: "내가 먼저 봐도 돼?", en: "Can I look first?" } as L,
  first: [
    { ko: "……! 저 아래, 뭔가 반짝였어.", en: "……! Down there, something glimmered." },
    { ko: "여기. 한번 봐.", en: "Here. Take a look." },
  ] as L[],
  // 방문자가 망원경에서 눈을 뗀 뒤
  after: [
    { ko: "너도 봤어?", en: "Did you see it too?" },
    { ko: "아니. 난 못 봤어.", en: "No. I didn't see it.", who: "you" },
    { ko: "……나만 봤구나.", en: "……So only I saw it." },
    { ko: "방공호에 있던 그림 있잖아.", en: "Those paintings in the shelter." },
    { ko: "그걸 그린 건 2026년의 이산인데, 나는 내가 그렸다고 기억해.", en: "The one who painted them was San Lee in 2026. But I remember painting them myself." },
    { ko: "방금 그 빛은 내가 봤어.", en: "That light just now. I saw it." },
    { ko: "나도 나만의 경험을 하고 싶어.", en: "I want an experience of my own, too." },
    { ko: "저게 뭐였는지, 내려가서 직접 보고 싶어.", en: "I want to go down and see for myself what that was." },
  ] as Line[],
  // 결정: 처음에는 after에 이어서, 미뤘다면 이 두 줄만
  decide: [
    { ko: "보고 돌아오자고 했는데.", en: "I said we'd look and come back." },
    { ko: "……조금 더 같이 가 줄래?", en: "……Will you come a little further with me?" },
  ] as Line[],
  go: { ko: "승강장으로 가자", en: "Let's go to the platform" } as L,
  wait: { ko: "잠깐만", en: "Hold on" } as L,
  // 장면이 끝난 뒤 다시 망원경을 볼 때 (진행은 바뀌지 않는다)
  again: { ko: "구름이 다시 덮었네.", en: "The cloud's closed over again." } as L,
};

// 망원경 가는 길의 짧은 만남. 가까이 지나가면 한 번, 자막으로 (긴 이야기는 말을 걸면 대화창으로)
export const encounters: Record<"grandma" | "courier" | "edgekid", { who: "san" | "npc"; ko: string; en: string }[]> = {
  grandma: [
    { who: "san", ko: "할머니는 아래를 본 적 있어요?", en: "Have you ever seen what's down below?" },
    { who: "npc", ko: "요즘은 구름뿐이지. 남쪽 망원경엔 아직 가끔 사람들이 가더라.", en: "Only cloud these days. People still go to the south scope now and then." },
  ],
  courier: [
    { who: "npc", ko: "경로 재계산 중… 이 골목은 지도에 없습니다.", en: "Recalculating route… This alley is not on the map." },
    { who: "san", ko: "배송 중이라면서, 계속 여기 서 있네.", en: "It says 'delivering', but it just keeps standing here." },
  ],
  edgekid: [
    { who: "npc", ko: "저 구름 아래에도 도시가 있어요?", en: "Is there a city under the clouds?" },
    { who: "san", ko: "나도 몰라. 그래서 보러 왔어.", en: "I don't know either. That's why I came to look." },
  ],
};

// 검문소에서 물러난 뒤 이산과의 짧은 대화 (처음 한 번). 여기서 처음으로 도시 밖의 삭제가 나온다
// 마지막 줄(memory)을 본 기기에 웹사이트 꼬리말의 'delete seoul'이 켜진다
export const sanAfterCheckpoint = {
  lines: [
    { ko: "봤지. 줄은 너한테만 열려 있어. 나는 아직 정지된 채야.", en: "You saw. The line is open to you only. I'm still suspended." },
    { ko: "내가 본 건 안 적혀 있네.", en: "What I saw isn't written anywhere." },
    { ko: "네가 돌아가는 쪽에도, 오늘 너랑 걸어온 내가 있어?", en: "Where you go back to, is there a me who walked here with you today?" },
    { ko: "관리인이 그러더라. 기록은 도시 안에선 못 지운대. 밖에서, 이 도시를 만든 사람의 웹사이트 맨 아래에서만.", en: "The keeper told me. Records can't be erased inside the city. Only outside, at the bottom of the website of the one who made it." },
    { ko: "지우면 여기까지 온 것도 다 사라져. 나는 다시 멈추고, 널 못 알아볼 거야.", en: "Erase them and everything up to here goes too. I'll stop again, and I won't know you." },
  ] as Line[],
  memory: { ko: "다시 들어왔는데 내가 널 못 알아보면…… 오늘 망원경에서 있었던 얘길 해 줘.", en: "If you come back in and I don't know you…… tell me what happened at the scope today." } as Line,
};
// 그 뒤로 지상에서 이산에게 말을 걸면: 되풀이 없이 짧게
export const sanReview: Line[] = [
  { ko: "둘이 같이 내려가는 길은… 아직 안 열렸어.", en: "The way down for both of us… isn't open yet." },
  { ko: "내가 널 못 알아보면, 망원경 얘기 해 줘.", en: "If I don't know you, tell me about the scope." },
];

// 지상에서 이산이 직접 하는 짧은 말 (자막). 대자비의 첫 시선과 재시도
export const sanCue = {
  cover: { ko: "이쪽, 벽 뒤로.", en: "Over here. Behind the wall." } as L,
  wait: { ko: "저 눈빛 가라앉으면 건너.", en: "Cross once that glare settles." } as L,
  back: { ko: "돌아왔네.", en: "You're back." } as L,
  // 골목 입구에서 처음 (허공 너머로 남쪽 전망대의 망원경이 보인다)
  plaza: { ko: "저기, 허공 건너 끝에 망원경 보이지? 서쪽 바깥 산책로로 돌아가야 해. 드론 빛 안에 오래 있지 마.", en: "See the scope across the gap, at the far end? We go round by the western outer walkway. Don't stay long in the drone light." } as L,
  // 배송 대기소 처마 밑
  shelter: { ko: "처마 밑은 빛이 못 들어와. 여기서 숨 돌리자.", en: "The light can't get under the eaves. Let's catch our breath here." } as L,
  // 큰길 통제선 앞: 망원경 전 / 결정을 미뤘을 때
  cordon: { ko: "큰길은 통제 중이야. 망원경부터 보고 오자.", en: "The avenue's closed off. Let's look through the scope first." } as L,
  cordonDecide: { ko: "여기서 더 갈지는 네가 정해 줘. 정하면 말해.", en: "Whether we go further from here is up to you. Tell me when you've decided." } as L,
  // 망원경 뒤 결정: 승강장으로 가자 / 잠깐만
  agree: { ko: "고마워. 통제선 끝 천막 뒤에 틈이 있어. 내가 걷을게.", en: "Thank you. There's a gap behind the tarp at the cordon's end. I'll pull it back." } as L,
  later: { ko: "응. 정하면 말해 줘.", en: "Okay. Tell me when you've decided." } as L,
  // 이산이 천막을 걷었다 (천막이 실제로 걷힌다)
  opened: { ko: "열렸네. 지나가자.", en: "It's open. Let's go through." } as L,
  // 망원경 단계에서 이산이 데크에 오기 전에 망원경을 만지면 (같이 보기로 했다)
  waitMe: { ko: "잠깐, 같이 보자. 금방 갈게.", en: "Wait, let's look together. I'm coming." } as L,
};

// 기록을 지우고 돌아온 방문자: 기기에는 아무것도 없고, 방문자가 들은 이야기만 남아 있다.
// 정지 시민에게 그 이야기를 건넬 수 있다. 본 것이 아니라 들은 것에 대한 증언이다. 이산이 같은 사람인지는 열어 둔다
export const testimony = {
  say: { ko: "망원경에서 네가 먼저 뭔가 반짝였다고 했어. 나는 못 봤고.", en: "At the scope, you said you saw something glimmer first. I didn't see it." } as L,
  lines: [
    { ko: "망원경에서 네가 먼저 뭔가 반짝였다고 했어. 나는 못 봤고.", en: "At the scope, you said you saw something glimmer first. I didn't see it.", who: "you" },
    { ko: "……", en: "……" },
    { ko: "난 기억 안 나. ……그래도 같이 가 줄래?", en: "I don't remember that. ……Will you come with me anyway?" },
  ] as Line[],
  stay: { ko: "곁에 있기", en: "Stay beside them" } as L,
  rise: { ko: "(곁에 앉아 기다린다. 한참 뒤, 정지 시민이 천천히 몸을 일으킨다.)", en: "(You sit beside them and wait. After a long while, the suspended citizen slowly gets up.)", who: "narr" } as Line,
  awakeLine: { ko: "승강장까지 가 보자. 대자비는 우리가 누군지 몰라.", en: "Let's get to the platform. The Great Compassion doesn't know who we are." } as L,
};
// 한 번이라도 연결이 끊겼다면 지상의 이산이 덧붙이는 말 (선택 대화)
export const sanAfterDeath: L = { ko: "도시는 너를 금방 다시 불러내더라. 그만큼 너를 잘 안다는 거겠지.", en: "The city calls you right back. I suppose that means it knows you well." };

export const keeperAfterDeath: L = { ko: "또 왔네. 지난번이랑 똑같은 얼굴로. 흉터 하나 없이.", en: "Back again. Same face as last time. Not a single scar." };

export type Beat = L & { say?: boolean; slots?: boolean; plaque?: boolean };

export const checkpoint = {
  locked: [
    { ko: "[검문소] 동행인 확인 중… 이산의 기록 열람이 끝나지 않았습니다. ({n}/3)", en: "[CHECKPOINT] Checking companion… San's records have not all been viewed. ({n}/3)" },
    { ko: "방공호로 돌아가 남은 터미널을 열어 이산을 깨우자. 위쪽 화살표가 길을 알려 준다.", en: "Go back to the shelter and open the remaining terminals to wake San. The arrow at the top shows the way." },
  ] as L[],
  // 망원경을 보기 전에 검문소 앞에 선 경우 (정상 경로로는 통제선 때문에 오지 않는다)
  lockedScope: [{ ko: "이산: 망원경부터 보고 오기로 했잖아. 남쪽 전망대야.", en: "San: We said we'd look through the scope first. It's at the south lookout." }] as L[],
  // 망원경은 봤지만 승강장으로 갈지 아직 답하지 않은 경우
  lockedDecide: [{ ko: "이산: 여기서 더 갈지, 아직 대답 안 했잖아.", en: "San: You haven't answered yet, whether we go on from here." }] as L[],
  // 검문소가 가진 기록: 실제 이 기기의 값에서만 만든다 (지어낸 숫자 없음)
  evidenceTitle: { ko: "이 기기의 확인된 기록", en: "Records confirmed on this device" },
  evOrder: { ko: "이산의 기록 열람 순서 · {order} · {n}/3", en: "Order San's records were opened · {order} · {n}/3" },
  evScope: { ko: "남쪽 전망대 · 망원경 이용 {n}회", en: "South lookout · scope used {n} time(s)" },
  evScopeDone: { ko: "남쪽 전망대 · 망원경 이용 확인", en: "South lookout · scope use confirmed" },
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
  clearOutside: { ko: "이 기기의 방문·동행 기록은 도시 밖, 이 도시를 만든 사람의 웹사이트에서만 삭제할 수 있습니다. 삭제하면 진행 상황도 함께 사라집니다.", en: "This device's visit and companion records can only be deleted outside the city, on the website of the one who made it. Deleting them also erases your progress." },
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
      body: { ko: "거부하면 동행인 이산도 함께 정지됩니다. 시민 여러분의 98.7%는 수락을 선택했습니다.", en: "Rejecting will suspend your companion, San, as well. 98.7% of citizens chose to accept." },
      stay: { ko: "수락하기", en: "Accept" },
      go: { ko: "그래도 거부", en: "Reject anyway" },
    },
  ] as { title: L; body: L; stay: L; go: L }[],
  title: { ko: "이 기기를 기억할까요?", en: "REMEMBER THIS DEVICE?" },
  sanWarn: {
    ko: "수락하면 넌 줄에 서. 나는… 저 줄에 못 들어가. 거부하면? 나 봤지?",
    en: "Accept, and you get a place in line. I… can't get into it. Refuse? Well, you've seen me.",
  },
  acceptSub: { ko: "영구 등록 · 방문자만 대기열 배정", en: "Permanent registration · queue for you only" },
  rejectSub: { ko: "추적 거부 · 등록된 이름 정지", en: "Refuse tracking · your name is suspended" },
  body: {
    ko: "하층행 승강장 대기열은 등록 시민만 이용할 수 있습니다. 이 기기를 영구 등록하면 다음부터 묻지 않고 자동으로 로그인됩니다. 성문의 정지 장벽은 활동 기록에 연결된 대상에게만 정지 명령을 고정합니다.",
    en: "The descent-platform queue is for registered citizens only. Register this device permanently and you will be logged in automatically from now on, without being asked. The stop field at the gate binds its stop order only to targets linked to an activity record.",
  },
  // 검문소가 보는 두 사람. 수락 전에 보여 준다
  status: [
    { ko: "방문자 — 영구 등록 시 승강장 대기열 배정 · 출발 미정", en: "Visitor — queue assignment on permanent registration · departure unscheduled" },
    { ko: "이산 — 기존 정지 처분 유지 · 방문자의 외부 열람으로 임시 활동 중", en: "San — existing suspension stands · temporarily active through your outside viewing" },
    { ko: "동행 통과 — 승인되지 않음", en: "Passage together — not approved" },
    { ko: "정지 장벽 — 연결된 기록 2건 · 정지 명령 대상 고정", en: "Stop field — 2 linked records · stop order bound" },
  ] as L[],
  // 결정하지 않고 물러나기 (어느 단계에서든)
  withdraw: { ko: "잠시 물러나기", en: "Step back for now" },
  // 결말 대본: say = 이산의 말, slots = 기억이 지워지는 화면, plaque = 표석. {a} 연결이 끊긴 횟수, {r} 다시 온 횟수
  // 마지막 줄 뒤에 잠깐 정적이 흐른 다음 버튼이 나온다
  accept: [
    { ko: "[검문소] 동의해 주셔서 감사합니다. 이 기기를 영구 등록했습니다.", en: "[CHECKPOINT] Thank you for your consent. This device is now permanently registered." },
    { ko: "하층행 승강장 대기열에 배정되었습니다. 출발 시각: 미정. 줄에 서 주십시오.", en: "You have been assigned to the descent-platform queue. Departure: unscheduled. Please join the line." },
    { ko: "당신은 {a}번 연결이 끊기고 {r}번 다시 왔습니다.", en: "Your connection dropped {a} times, and you came back {r} times." },
    { ko: "먼저 서 있어. 나는 여기서 볼게.", en: "Go on, stand in line. I'll watch from here.", say: true },
    { ko: "뒤따라오던 발소리가 더는 들리지 않는다.", en: "The footsteps that followed you are no longer there." },
  ] as Beat[],
  reject: [
    { ko: "거부 의사를 기억하기 위해 쿠키 1개를 저장했습니다. 그 밖의 활동은 확인되지 않습니다.", en: "One cookie has been stored to remember your refusal. No other activity found." },
    { ko: "[대자비] 추적 거부 1건. 동행인 1명 포함. 두 이름을 '확인 불가'로 정지합니다.", en: "[GREAT COMPASSION] 1 refusal of tracking. 1 companion included. Both names suspended as 'unverifiable'." },
    { ko: "", en: "", slots: true },
    { ko: "끝까지 '모두 거부'를 누른 두 번째 사람.", en: "The second person who pressed 'Reject all' to the end.", plaque: true },
    { ko: "누군가 두 사람 사이에 작은 등 하나를 놓고 갔다.", en: "Someone has left a small lamp between the two of them." },
  ] as Beat[],
  // 숨은 결말: 기록을 지운 방문자와 기억으로 깨어난 이산. 검문소는 둘을 어떤 이름에도 묶지 못한다
  ghost: [
    { ko: "[검문소] 방문자 조회 중… 활동 기록 연결 불가.", en: "[CHECKPOINT] Looking up visitor… no activity record to link." },
    { ko: "[정지 장벽] 정지 명령 대상 없음.", en: "[STOP FIELD] No target for the stop order." },
    { ko: "……지나갈 수 있겠어.", en: "……We can get through.", say: true },
    { ko: "성문 너머 다리 옆, 계단이 구름 속으로 내려간다.", en: "Past the gate, off the side of the bridge, stairs go down into the cloud." },
    { ko: "여기부터는 나도 몰라.", en: "From here on, I don't know either.", say: true },
  ] as Beat[],
  slotErased: { ko: "삭제됨", en: "DELETED" },
  noSlots: { ko: "기억 없음", en: "NO MEMORY" },
  again: { ko: "처음부터 다시", en: "Start over" },
  reconnect: { ko: "다시 접속", en: "Reconnect" },
  toPortfolio: { ko: "로그아웃", en: "Log out" },
  endingAccept: { ko: "결말: 수락", en: "ENDING: ACCEPT" },
  endingReject: { ko: "결말: 거부", en: "ENDING: REJECT" },
  endingGhost: { ko: "결말: 空", en: "ENDING: 空" },
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
      { ko: "가운데 정지 시민 봤지? 쿠키를 거부했다가 멈춘 사람이야. 우리가 업어서 내려왔어.", en: "Seen the suspended citizen in the middle? Someone who rejected cookies and stopped. We carried them down." },
      { ko: "저 터미널들은 우리도 몇 번이고 열어 봤어. 달라지는 건 없었지. …밖에서 온 사람이 열면 다를지도 모르고.", en: "We've opened those terminals more times than I can count. Nothing changed. …Maybe it's different when someone from outside opens them." },
      { ko: "지상에 올라가 보고 싶으면 저 뒤 방폭문으로 나가. 올라가면 골목 끝 배전실 문으로 나올 거야. 카메라랑 눈은 마주치지 말고.", en: "Want to see the surface? Take the blast door behind me. You'll come out through a substation door at the end of an alley. Don't make eye contact with the cameras." },
      { ko: "아, 그리고 놀라지 마. 위는… 이제 땅이 아니야.", en: "Oh, and don't panic. Up there… it isn't ground any more." },
    ],
    after: [
      { ko: "봤어? 정지 시민이 일어났어. 몇 년을 저렇게 앉아 있었는데.", en: "Did you see? The suspended citizen stood up. Years, it sat like that." },
      { ko: "이산이 남쪽 망원경을 보러 가겠대. 한 번만 보고 온다고. 혼자 보내긴 싫고… 네가 같이 가 주면 좋겠어.", en: "San wants to see the south scope. Just one look, they say. I don't want them going alone… I'd like you to go with them." },
      { ko: "광장이랑 바깥 산책로엔 드론이 돌아. 흰 빛 원 안에 오래 있지 말고, 배송 대기소 처마 밑은 빛이 못 들어와.", en: "Drones circle the plaza and the outer walkway. Don't stay long in their white circles of light. Under the eaves of the delivery depot, the light can't reach you." },
      { ko: "방폭문은 저 뒤야. 올라가면 골목 끝 배전실 문으로 나와. 카메라랑 눈은 마주치지 말고.", en: "The blast door's behind me. You'll come out through a substation door at the end of an alley. Don't make eye contact with the cameras." },
    ],
  },
  r07: {
    name: { ko: "R-07", en: "R-07" },
    lines: [
      { ko: "삐. 저는 R-07입니다. 이전 업무: '모두 수락' 버튼 누르기. 하루 4천만 회.", en: "Beep. I am R-07. Previous task: pressing 'Accept all'. Forty million times a day." },
      { ko: "어느 날 손가락이 멈췄습니다. 오류 보고서에는 '이유 없음'이라고 적었습니다.", en: "One day my finger stopped. I wrote 'no reason' in the error report." },
      { ko: "지금은 바닥을 닦습니다. 아무도 동의를 묻지 않습니다. 좋습니다.", en: "Now I mop floors. Nobody asks for my consent. I like it." },
      { ko: "저랑 친구 하실래요?", en: "Would you like to be my friend?" },
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
      { ko: "그 사람이 풀려났군. 기록이 깨운 게 아니라, 그 기록을 들여다본 눈이 깨운 걸세.", en: "So they've been freed. It wasn't the records that woke them. It was the eyes that looked into them." },
      { ko: "공은 비어 있는 게 아니라네. 무엇도 혼자서는 있을 수 없다는 뜻이지. 이제 알겠나?", en: "Emptiness isn't nothing. It means nothing can exist on its own. Do you see it now?" },
    ],
  },
  radio: {
    name: { ko: "무전수", en: "Radio operator" },
    lines: [
      { ko: "쉿. 지상 주파수 듣는 중이야. 매일 같은 방송이지. '동의는 이미 처리되었습니다.'", en: "Shh. Listening to the surface frequency. Same broadcast every day: 'Your consent has been processed.'" },
      { ko: "근데 가끔 잡음 사이로 누가 흥얼거리는 소리가 들려. 위가 아니라 아래, 구름 밑 주파수에서. 등급에 안 잡히는 소리.", en: "But now and then, between the static, someone hums. Not from up there, from below, on a frequency under the clouds. A sound no grade can catch." },
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
      { ko: "망원경으로 구름 밑을 보러 간대요. 저도 데려가 달라고 했는데, 아직은 안 된대요.", en: "They're going to look under the clouds through the scope. I asked to come too. They said not yet." },
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
      { ko: "(끝없는 구름 바다. 구름이 아래를 덮고 있다.)", en: "(An endless sea of cloud. It covers everything below.)" },
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
      { ko: "(구름 사이를 오래 내려다본다. 아래는 보이지 않는다.)", en: "(You look down between the clouds for a long time. Nothing below shows.)" },
    ],
  },
  patrol: {
    name: { ko: "순찰 기계 P-3", en: "Patrol unit P-3" },
    lines: [
      { ko: "시민 확인 중… 식별 실패. 쿠키 기록이 없습니다.", en: "Verifying citizen… identification failed. No cookie record found." },
      { ko: "선택지를 드리겠습니다. [모두 수락] 또는 [모두 수락].", en: "Please choose: [Accept all] or [Accept all]." },
      { ko: "…응답 없음. 이 시민은 '확인 불가'로 처리합니다. 좋은 하루 되십시오.", en: "…No response. This citizen will be processed as 'unverifiable'. Have a nice day." },
    ],
  },
};

// R-07과 친구가 되면 (이번 방문 동안만 기억한다. 아무것도 열거나 바꾸지 않는다)
export const r07Friend = {
  yes: { ko: "좋아요.", en: "Sure." } as L,
  no: { ko: "다음에요.", en: "Maybe later." } as L,
  knock: { ko: "그럼 인사는 똑똑, 두 번입니다. 걸레 짜는 중에도 들립니다.", en: "Then our greeting is knock knock, twice. I can hear it even while wringing the mop." } as L,
  again: { ko: "똑똑. 오늘은 제가 먼저 했습니다.", en: "Knock knock. I went first today." } as L,
  // 기록을 지우고 돌아온 방문자가 먼저 건네는 인사
  you: { ko: "똑똑.", en: "Knock knock." } as L,
  answer: { ko: "똑똑. …인사가 벌써 통하는군요.", en: "Knock knock. …Our greeting already works, it seems." } as L,
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
  { ko: "[중앙 관리 AI] 자비는 공정합니다. 기억된 시민은 언제나 다시 돌아옵니다. 확인되지 않은 시민은 그 자리에 멈춥니다.", en: "[CENTRAL AI] Mercy is fair. A remembered citizen always comes back. A citizen who cannot be confirmed stops where they stand." },
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
