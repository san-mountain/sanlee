// DELETE SEOUL의 모든 문구. 대사를 바꾸고 싶으면 이 파일만 고치면 됩니다.
// 방문자는 말하지 않는다: 방문자의 선택은 행동(버튼)으로만 나오고, 대사·속마음·낭독은 없다
import type { L } from "@/data/site";

// 대화 한 페이지(한두 문장). who가 없으면 대화창의 이름(대개 이산)이 말한다. narr = 지문(따옴표 없이, 말하는 이름 없이)
// pause: 이 페이지가 뜨기 전에 잠깐 비워 두는 시간(ms). 그동안은 넘길 수 없다 (함께 아래를 내려다보는 정적 등)
export type Line = L & { who?: "narr"; pause?: number };

export const plaque: L[] = [
  { ko: "이산 · 2087년 접속 중단", en: "SAN LEE · DISCONNECTED IN 2087" },
  { ko: "끝까지 '모두 거부'를 누른 사람", en: "The One Who Pressed 'Reject All' to the End" },
  {
    ko: "2087년 서울에서 모든 쿠키를 거부한 시민.",
    en: "A citizen of Seoul, 2087, who rejected every cookie.",
  },
  {
    ko: "추적을 거부한 뒤 몸이 굳었다. 주민들이 그를 업고 이 방공호로 내려왔다.",
    en: "Their body stiffened after they refused tracking. The residents carried them down to this shelter.",
  },
];

export const ui = {
  title: { ko: "DELETE SEOUL", en: "DELETE SEOUL" },
  introLines: [
    {
      ko: "2087년, 구름 위로 떠오른 서울. 도시는 시민의 일거수일투족을 기록합니다. 추적을 거부한 한 사람이 지하 방공호 B-7에 멈춰 있습니다.",
      en: "Seoul, 2087, lifted above the clouds. The city records every move its citizens make. One person who refused tracking sits frozen in Shelter B-7, underground.",
    },
  ] as L[],
  start: { ko: "방공호로 들어가기", en: "Enter the shelter" },
  goBack: { ko: "웹사이트로 돌아가기", en: "Back to the website" },
  hintPc: { ko: "화면을 클릭하면 마우스로 둘러볼 수 있습니다.", en: "Click the screen to look around with the mouse." },
  hintLocked: { ko: "WASD 이동 · Shift 달리기 전환 · Space 점프 · E/클릭 상호작용 · Esc 일시정지", en: "WASD move · Shift toggle run · Space jump · E/click interact · Esc pause" },
  hintIntroPc: { ko: "마우스 시점 조절 · WASD 이동 · Shift 달리기 전환 · Space 점프 · E/클릭 상호작용", en: "Mouse to look · WASD move · Shift toggle run · Space jump · E/click interact" },
  hintTouch: { ko: "왼쪽 조이스틱으로 이동 · 화면을 드래그해 둘러보기 · ⤒ 점프", en: "Left stick to move · drag the screen to look around · ⤒ jump" },
  open: { ko: "열기", en: "Open" },
  talk: { ko: "이야기 듣기", en: "Listen" },
  view: { ko: "보기", en: "View" },
  back: { ko: "닫기", en: "Close" },
  normalPage: { ko: "웹사이트에서 보기 ↗", en: "View on the website ↗" },
  next: { ko: "계속", en: "Continue" },
  close: { ko: "닫기", en: "Close" },
  home: { ko: "← 웹사이트로", en: "← To the website" },
  // 터미널을 열 때 뜨는 짧은 상태
  restored: { ko: "기록 열람", en: "Record viewed" },
  noWebgl: {
    ko: "이 기기에서는 3D 화면을 표시할 수 없습니다. 아래 버튼으로 웹사이트를 이용해 주세요.",
    en: "This device can't display the 3D scene. Please use the website with the button below.",
  },
  popup: { ko: "이 도시는 시민을 추적하기 위해 쿠키를 사용합니다.", en: "This city uses cookies to track its citizens." },
  accept: { ko: "모두 수락", en: "Accept all" },
  reject: { ko: "모두 거부", en: "Reject all" },
  plaqueShort: { ko: "끝까지 '모두 거부'를 누른 사람", en: "The One Who Rejected All" },
  terminalLocked: [
    { ko: "열람 전", en: "Not yet viewed" },
    { ko: "먼저 방 한가운데 앉아 있는 사람에게 다가가세요.", en: "First, go to the person sitting in the middle of the room." },
  ] as L[],
  toPortfolio: { ko: "웹사이트로 돌아가기", en: "Back to the website" },
  exitLocked: [
    { ko: "아직 이산이 움직이지 못합니다.", en: "San can't move yet." },
    { ko: "터미널 세 대에서 이산의 기록을 열어 보세요. ({n}/3)", en: "Open San's records on the three terminals. ({n}/3)" },
  ] as L[],
  exitTalk: { ko: "이산이 일어났습니다. 가까이 가서 이야기를 들어 보세요.", en: "San has stood up. Go closer and listen." },
  zoneBunker: { ko: "B-7 방공호 · 지하 40m", en: "SHELTER B-7 · 40m BELOW" },
  zoneCity: { ko: "지상 · 서울 7구역 · 고도 2,400m", en: "SURFACE · SEOUL DISTRICT 7 · ALT 2,400m" },
  goingUp: { ko: "지상으로 올라가는 중…", en: "Going up to the surface…" },
  goingDown: { ko: "방공호로 내려가는 중…", en: "Going down to the shelter…" },
  tracked: { ko: "● 감시 중", en: "● TRACKED" },
  // 저장된 방문 기록이 없는 방문자: 도시가 위치를 추적할 기록이 없다
  unresolved: { ko: "○ 방문자 기록 없음", en: "○ NO VISITOR RECORD" },
  cookieTitle: { ko: "SEOUL.SYS · 쿠키 동의", en: "SEOUL.SYS · COOKIE CONSENT" },
  cookieBody: {
    ko: "도시는 쿠키로 시민의 활동을 기록합니다. 추적에 동의하시겠습니까?",
    en: "The city records citizens' activity with cookies. Do you consent to tracking?",
  },
  processing: { ko: "처리 중…", en: "Processing…" },
  acceptedAll: { ko: "동의 처리 완료", en: "Consent processed" },
  startLine: { ko: "줄로 돌아가기", en: "Return to the line" },
  savedHint: { ko: "연결이 끊기면 저장된 지점에서 다시 시작합니다.", en: "If the connection drops, you restart from the saved point." },
  // 처음 지상에 나설 때(추적되는 방문자만) 한 번: 이 도시의 규칙
  cookieNotice: { ko: "방문 기록 저장됨", en: "Visit record saved" },
  cookieNoticeSub: { ko: "이 기기에 저장된 기록으로 방문자의 위치를 추적합니다.", en: "The city tracks visitors' locations through the records saved on this device." },
  cookieSettings: { ko: "일시정지 · Esc", en: "Pause · Esc" },
  cookieSettingsTouch: { ko: "설정 · 오른쪽 위 ⚙", en: "Settings · ⚙ top right" },
  foundEndings: { ko: "저장된 결말 {n}개", en: "Saved endings: {n}" },
  // 空 결말: 조작을 돌려받은 뒤 화면 아래의 작은 안내
  stepHint: { ko: "계단으로 걸어 내려가기", en: "Walk down the stairs" },
  notRecorded: { ko: "이 결말은 저장되지 않습니다.", en: "This ending is not saved." },
  welcomeB: { ko: "다시 오셨군요.", en: "Welcome back." },
  // 남쪽 망원경으로 볼 때: 방문자가 보는 것만 적는다 (이산이 본 것은 이산의 말로만 나온다)
  scopeSees: { ko: "구름에 가려 아래는 보이지 않는다.", en: "Clouds hide everything below." },
  scopeExit: { ko: "그만 보기", en: "Stop looking" },
  scopeLook: { ko: "망원경 보기", en: "Look through the scope" },
  scopeHintPc: { ko: "마우스로 둘러보기 · E/Esc 그만 보기", en: "Mouse to look around · E/Esc stop looking" },
  scopeHintTouch: { ko: "화면을 드래그해 둘러보기", en: "Drag the screen to look around" },
  // 이산이 들을 수 없는 곳에서: 길 안내만
  findSan: { ko: "이산이 있는 곳으로 돌아가기", en: "Go back to where San is" },
};

// 순찰 드론의 경고 (광장·산책로. 큰길의 드론 빛은 대자비의 감시 게이지에 합쳐진다)
export const droneUi = {
  name: { ko: "순찰 드론", en: "PATROL DRONE" },
  lit: { ko: "드론이 추적 중입니다. 빛을 피하세요.", en: "A drone is tracking you. Get out of the light." },
  lost: { ko: "추적을 벗어났습니다.", en: "You slipped the tracking." },
  caught: { ko: "위치가 확인됐습니다.", en: "Your location has been confirmed." },
  // 저장된 방문 기록이 없는 방문자: 표적 고리가 붙지 못한다 (이번 방문에 한 번)
  shape: { ko: "방문자 기록 없음 · 추적 불가", en: "No visitor record · cannot track" },
  caughtTitle: { ko: "드론에 발각됐습니다.", en: "A drone spotted you." },
  caughtSub: { ko: "직전 안전 지점에서 다시 시작합니다.", en: "Restarting from the last safe spot." },
};

// 위치 저장 상태 (구역 이름 아래 한 줄)
export const backupUi = {
  noSignal: { ko: "저장 신호 없음", en: "NO SAVE SIGNAL" },
  none: { ko: "저장 대기 중", en: "WAITING TO SAVE" },
  deleted: { ko: "저장된 위치 없음", en: "NO SAVED LOCATION" },
  saved: { ko: "● 위치 저장됨", en: "● LOCATION SAVED" },
};

// Esc 일시정지 창
export const pause = {
  title: { ko: "일시정지", en: "PAUSED" },
  sub: { ko: "계속하면 멈춘 지점에서 이어집니다.", en: "Continue to pick up where you stopped." },
  resume: { ko: "계속하기", en: "Continue" },
  sens: { ko: "마우스 감도", en: "Mouse sensitivity" },
  sensNote: { ko: "마우스를 움직일 때 시점이 돌아가는 속도입니다.", en: "How fast the view turns when you move the mouse." },
  bob: { ko: "걷기 화면 흔들림", en: "Walking camera bob" },
  sound: { ko: "효과음", en: "Sound effects" },
  lang: { ko: "언어", en: "Language" },
  humanity: { ko: "인간성", en: "Humanity" },
  humanityNote: { ko: "변경할 수 없습니다.", en: "Cannot be changed." },
  freeWill: { ko: "자유 의지", en: "Free will" },
  freeWillNo: { ko: "이 항목은 도시가 관리합니다.", en: "This item is managed by the city." },
  cookies: { ko: "쿠키 설정", en: "Cookie settings" },
  cookiesNo: { ko: "이 설정은 검문소에서 변경할 수 있습니다.", en: "This setting can be changed at the checkpoint." },
  // 정보 항목: 여기서는 아무것도 지우지 않는다
  reset: { ko: "기록 삭제 안내", en: "About deleting records" },
  resetNote: { ko: "이 메뉴에서는 기록을 지울 수 없습니다. 웹사이트로 돌아가 맨 아래의 delete seoul을 이용하세요.", en: "Records can't be deleted from this menu. Go back to the website and use delete seoul at the very bottom." },
  // 수락 결말 뒤 줄에서 빠져나오는 길 (진행을 실제로 처음으로 되돌린다. 숨은 길은 열리지 않는다)
  restart: { ko: "처음부터 다시", en: "Start over" },
  restartAsk: { ko: "진행 상황이 처음으로 돌아갑니다. 계속하시겠습니까?", en: "Your progress will go back to the beginning. Continue?" },
  restartYes: { ko: "처음부터 다시", en: "Start over" },
  restartNo: { ko: "취소", en: "Cancel" },
  leave: { ko: "웹사이트로 돌아가기", en: "Back to the website" },
  bunker: { ko: "방공호로 돌아가기", en: "Back to the shelter" },
  bunkerNote: { ko: "방공호 입구로 돌아갑니다.", en: "Returns you to the shelter entrance." },
  on: { ko: "켬", en: "On" },
  off: { ko: "끔", en: "Off" },
};

// 일시정지 창 아래에 흐르는 문장. {time} {min} {w} {h} 는 실제 값으로 바뀝니다.
export const fourthWall: L[] = [
  { ko: "지금은 {time}. 이 도시에 들어온 지 {min}분이 지났습니다.", en: "It is {time}. You entered this city {min} min ago." },
  { ko: "이 도시가 보이는 창은 {w}×{h}. 창밖의 당신은 여기서 보이지 않습니다.", en: "The window showing this city is {w}×{h}. The you outside it can't be seen from here." },
  { ko: "이 창을 닫으면 도시는 다시 움직입니다.", en: "Close this window and the city moves again." },
  { ko: "당신이 화면에서 눈을 뗐는지는 알 수 없습니다.", en: "There is no way to know whether you looked away from the screen." },
  { ko: "도시의 기록은 이 화면 밖까지 따라가지 못합니다.", en: "The city's records can't follow you beyond this screen." },
];

// 큰길 끝의 거대한 입불 '대자비'와 감시 게이지
export const jabiUi = {
  name: { ko: "대자비 · 감시 게이지", en: "GREAT COMPASSION · SURVEILLANCE" },
  // 한 번에 하나만 뜨는 상태
  states: {
    idle: { ko: "수색 중", en: "Searching" },
    watch: { ko: "노출됨", en: "Exposed" },
    suspect: { ko: "의심받는 중", en: "Under suspicion" },
    charge: { ko: "발각 직전 · 숨으세요", en: "About to be found · hide" },
    lock: { ko: "조준 중 · 옆으로 피하세요", en: "Aiming · dodge sideways" },
    fire: { ko: "레이저 발사", en: "Laser firing" },
    cool: { ko: "공격 대기", en: "Recharging" },
    hidden: { ko: "엄폐 중", en: "In cover" },
    line: { ko: "줄에 숨는 중 · 움직이지 마세요", en: "Hiding in the line · don't move" },
  },
  // 처음 시선 구역에 들어설 때 뜨는 소개 팝업: 제목, 한 줄, 규칙 셋, 버튼 하나
  introTitle: { ko: "대자비의 감시를 피해 검문소로", en: "Reach the checkpoint without being seen" },
  introBody: {
    ko: "큰길 끝의 대자비가 검문소로 향하는 길을 감시합니다.",
    en: "The Great Compassion at the end of the avenue watches the road to the checkpoint.",
  },
  introRules: [
    { ko: "보이면 게이지가 찹니다. 엄폐물 뒤에 숨으면 줄어듭니다.", en: "The gauge fills while you are seen. Hide behind cover and it drains." },
    { ko: "줄에 가만히 서 있어도 숨을 수 있습니다. 드론의 빛은 따로 피하세요.", en: "Standing still in the line also hides you. Avoid the drone light separately." },
    { ko: "바닥에 붉은 선이 보이면 옆으로 피하세요.", en: "When a red line appears on the ground, dodge sideways." },
  ] as L[],
  introOk: { ko: "계속하기", en: "Continue" },
  deadTitle: { ko: "연결이 끊겼습니다", en: "CONNECTION LOST" },
  deadSub: { ko: "큰길 입구에서 다시 시작합니다.", en: "Restarting at the avenue entrance." },
  restoreStart: { ko: "큰길 입구로 돌아왔습니다.", en: "Back at the avenue entrance." },
  cost: { ko: "도시가 저장된 기록에서 당신을 다시 불러냈습니다.", en: "The city called you back from your saved record." },
  noBackup: { ko: "저장된 위치가 없습니다.", en: "No saved location." },
  noBackupSub: { ko: "처음부터 다시 시작합니다.", en: "Starting again from the beginning." },
};

// 화면 위쪽 길 안내에 붙는 짧은 목표 (동사구)
export const quest = {
  terminal: { ko: "기록 열기", en: "Open the records" },
  statue: { ko: "정지된 이산에게 다가가기", en: "Go to the frozen San" },
  san: { ko: "이산의 이야기 듣기", en: "Listen to San" },
  exit: { ko: "이산과 지상으로 나가기", en: "Go up to the surface with San" },
  checkpoint: { ko: "검문소를 지나 하층행 승강장으로", en: "Through the checkpoint to the descent platform" },
  scope: { ko: "남쪽 전망대의 망원경으로", en: "To the scope at the south lookout" },
  back: { ko: "방공호로 돌아가기", en: "Back to the shelter" },
  decide: { ko: "이산과 함께 갈지 정하기", en: "Decide whether to go on with San" },
  findSan: { ko: "이산이 있는 곳으로 돌아가기", en: "Go back to where San is" },
};

// 방문한 터미널 수(0~3)에 따라 이산의 말이 바뀝니다. 마지막 묶음은 세 기록을 모두 연 뒤
export const statueLines: L[][] = [
  [
    { ko: "…쿠키를… 거부… 합니다…", en: "…I reject… all… cookies…" },
    { ko: "…누구야? 여기까지 들어온 사람은 오랜만이네.", en: "…Who's there? It's been a long time since anyone came this far." },
    {
      ko: "도시가 내 위치를 기록하는 게 싫었어. 그래서 쿠키를 전부 거부했지. 그 뒤로 몸이 움직이지 않아.",
      en: "I didn't want the city recording where I was. So I rejected every cookie. My body hasn't moved since.",
    },
    {
      ko: "여기 사람들이 날 업고 내려왔어. 터미널에 내 기록도 가져다 놨고. 네가 한번 열어 봐 줄래?",
      en: "The people here carried me down. They brought my records to the terminals too. Would you open them?",
    },
  ],
  [
    { ko: "…고개가 움직여. 네가 기록을 열어서 그런가 봐.", en: "…My head moves. Maybe because you opened a record." },
    { ko: "다른 기록도 열어 봐 줄래?", en: "Would you open the others too?" },
  ],
  [
    { ko: "이제 팔도 움직일 수 있어.", en: "I can move my arms now." },
    { ko: "하나 남았네. 천천히 봐도 돼.", en: "One left. Take your time." },
  ],
  [
    { ko: "……움직인다. 고마워.", en: "……I can move. Thank you." },
    { ko: "저 그림, 내가 그렸던 게 기억나. 그런데 옆에 적힌 연도는 2026년이네.", en: "That painting. I remember painting it. But the year written beside it is 2026." },
    { ko: "여기 사람들한테 들었어. 남쪽 망원경으로는 구름 아래가 보일 때도 있대.", en: "The people here told me you can sometimes see below the clouds from the south scope." },
    { ko: "남한테 들은 얘기 말고, 직접 보고 싶어. 같이 가 줄래? 보고 돌아오자.", en: "Not something I heard from someone else. I want to see it myself. Will you come with me? We'll look and come back." },
  ],
];

// 기록을 지우고 돌아온 방문자: 이산은 처음 보는 사람처럼 대한다
export const statueForgot: L[] = [
  { ko: "…쿠키를… 거부… 합니다…", en: "…I reject… all… cookies…" },
  { ko: "…누구야? 처음 보는 사람인데.", en: "…Who's there? I've never seen you before." },
];

// 지상에서 이산에게 말을 걸면 (선택 대화). 진행 단계마다 다르다
export const sanCity = {
  scope: [
    { ko: "남쪽 전망대까지만 가 보자. 망원경이 거기 있대.", en: "Let's just go as far as the south lookout. They say the scope is there." },
    { ko: "광장 서쪽에 돌아가는 길이 있어. 빛이 지나가면 같이 건너자.", en: "There's a way round on the west side of the plaza. When the light passes, let's cross together." },
  ] as Line[],
  descent: [
    { ko: "아래로 가는 승강장은 검문소 너머에 있어. 큰길로 가자. 아까 반짝인 게 뭔지, 가까이서 보고 싶어.", en: "The platform going down is past the checkpoint. Let's take the avenue. I want to see up close what that glimmer was." },
  ] as Line[],
};

// 남쪽 전망대의 망원경 장면. 이산이 먼저 들여다보고, 빛은 이산만 본다.
// 방문자에게는 어떤 화면·자막·낭독 문구로도 그 빛이 보이지 않는다
// 차례: ask(방문자가 망원경이나 이산에게 다가가면, 이산이 접안렌즈로 걸어간다) → 도착 뒤 정적 → first[0] → 비켜서며 first[1] →
// 방문자가 '망원경 보기' → 그만 보고 돌아서면 after → 마지막 페이지에서 두 행동
export const scopeScene = {
  ask: { ko: "잠깐만. 내가 먼저 볼게.", en: "Wait. Let me look first." } as L,
  first: [
    { ko: "……! 저 아래, 뭔가 반짝였어.", en: "……! Down there, something glimmered." },
    { ko: "너도 한번 봐.", en: "You take a look too." },
  ] as L[],
  // 방문자가 망원경에서 눈을 뗀 뒤. 두 번째 페이지 앞의 정적 동안 둘은 아래를 내려다본다
  after: [
    { ko: "지금은 안 보이지? 분명히 봤는데. 잠깐이었어.", en: "It's gone now, isn't it? I definitely saw it. Just for a moment." },
    { ko: "저 그림을 그린 기억은 있는데… 그건 2026년에 살던 사람이 한 일이잖아.", en: "I remember painting that picture… but that was done by someone who lived in 2026.", pause: 1600 },
    { ko: "방금 본 건 내 기억이야. 여기서, 내가 본 거니까.", en: "What I just saw is my memory. Because I saw it, here." },
    { ko: "나도 나만의 경험을 하고 싶어. 내려가서 확인하고 싶어. 아까 그게 뭐였는지.", en: "I want an experience of my own, too. I want to go down and find out what that was." },
  ] as Line[],
  // 결정: 처음에는 after에 이어서, 미뤘다면 이 한 페이지만
  decide: [{ ko: "보고 돌아가려고 했는데… 아래까지 가 보고 싶어. 같이 가 줄래?", en: "I meant to look and go back… but I want to go all the way down. Will you come with me?" }] as Line[],
  go: { ko: "함께 승강장으로 향한다", en: "Head for the platform together" } as L,
  wait: { ko: "전망대에 더 머문다", en: "Stay at the lookout a while" } as L,
  // 장면이 끝난 뒤 다시 망원경을 볼 때 (진행은 바뀌지 않는다)
  again: { ko: "지금은 구름밖에 안 보이네.", en: "Only clouds now." } as L,
};

// 망원경 가는 길의 짧은 만남. 가까이 지나가면 한 번, 자막으로 (긴 이야기는 말을 걸면 대화창으로)
export const encounters: Record<"grandma" | "courier" | "edgekid", { who: "san" | "npc"; ko: string; en: string }[]> = {
  grandma: [
    { who: "san", ko: "할머니는 구름 아래를 본 적 있어요?", en: "Have you ever seen below the clouds?" },
    { who: "npc", ko: "어릴 땐 봤지. 요즘은 온통 구름이야. 남쪽 전망대에 가 봐. 가끔 구름이 걷힌다더라.", en: "When I was little. These days it's all cloud. Go to the south lookout. They say it clears sometimes." },
  ],
  courier: [
    { who: "npc", ko: "경로를 찾을 수 없습니다. 지도에 없는 길입니다.", en: "Route not found. This path is not on the map." },
    { who: "san", ko: "아직도 배송 중이라고 뜨네.", en: "It still says 'delivering'." },
  ],
  edgekid: [
    { who: "npc", ko: "저 구름 아래에도 도시가 있어요?", en: "Is there a city under those clouds too?" },
    { who: "san", ko: "나도 몰라. 그래서 보러 왔어.", en: "I don't know either. That's why I came to look." },
  ],
};

// 검문소에서 물러난 뒤 이산과의 대화 (처음 한 번). 다른 방송은 뜨지 않는다
// 마지막 페이지(memory)가 뜬 기기에 웹사이트 꼬리말의 'delete seoul'이 켜진다
// scopeLine: 두 번째 페이지. 망원경 이용 기록을 방문자가 본 적이 없으면 그 줄을 이 자리에서 함께 보여 준다(ExploreClient)
export const sanAfterCheckpoint = {
  lines: [
    { ko: "너만 줄에 설 수 있대. 난 움직이고 있는데도, 저기엔 아직 정지된 사람으로 나와.", en: "Only you can join the line. I'm moving, but it still lists me as suspended." },
    { ko: "망원경을 쓴 건 적혀 있는데, 내가 본 건 없네.", en: "It records that the scope was used, but not what I saw." },
    { ko: "그 웹사이트엔 나도 있어? 오늘 너랑 여기까지 걸어온 나도?", en: "Am I on that website too? The me who walked here with you today?" },
    { ko: "아까 화면에 쓰여 있었지. 기록은 웹사이트로 돌아가야 지울 수 있다고.", en: "It said so on the screen. The records can only be deleted back on the website." },
    { ko: "지우면 난 다시 멈출 거야. 오늘 일도 잊어버릴 테고.", en: "If you delete them, I'll stop again. I'll forget today, too." },
  ] as Line[],
  memory: { ko: "그래도 다시 와 줄래? 내가 널 몰라봐도, 잠깐만 곁에 있어 줘.", en: "Will you come back anyway? Even if I don't know you, stay beside me for a little while." } as Line,
};
// 그 뒤로 지상에서 이산에게 말을 걸면: 되풀이 없이 짧게
export const sanReview: Line[] = [{ ko: "같이 내려가고 싶었는데… 돌아오면, 오늘 일을 네가 기억해 줘.", en: "I wanted us to go down together… If you come back, remember today for me." }];

// 지상에서 이산이 직접 하는 짧은 말 (자막)
export const sanCue = {
  cover: { ko: "이쪽, 벽 뒤로.", en: "This way, behind the wall." } as L,
  wait: { ko: "여기서 잠깐 기다려. 게이지가 내려가면 건너자.", en: "Wait here a moment. When the gauge drops, we cross." } as L,
  back: { ko: "돌아왔네.", en: "You're back." } as L,
  // 골목 입구에서 처음 (허공 너머로 남쪽 전망대의 망원경이 보인다)
  plaza: { ko: "저 끝이 전망대야. 왼쪽 산책로로 돌아가자.", en: "That's the lookout at the far end. Let's go round by the walkway on the left." } as L,
  // 배송 대기소 처마 밑
  shelter: { ko: "여긴 지붕이 가려 줘. 잠깐 쉬자.", en: "The roof covers us here. Let's rest a moment." } as L,
  // 망원경 전에 큰길로 들어서면 (곁에 있을 때만. 막는 것이 아니라 부탁)
  avenue: { ko: "망원경부터 보고 가면 안 될까? 여기까지 왔는데.", en: "Can we see the scope first? We've come this far." } as L,
  // 망원경 뒤 결정을 미룬 채 큰길로 들어서면
  avenueDecide: { ko: "난 아래로 가 보고 싶어. 같이 갈 거면 이쪽이야.", en: "I want to go down. If you're coming, it's this way." } as L,
  agree: { ko: "고마워. 검문소까지 같이 가자.", en: "Thank you. Let's go to the checkpoint together." } as L,
  later: { ko: "응. 여기서 기다릴게.", en: "Okay. I'll wait here." } as L,
  // 망원경 단계에서 이산이 오기 전에 망원경을 만지면 (같이 보기로 했다)
  waitMe: { ko: "잠깐만. 나도 같이 보자.", en: "Wait. Let me look with you." } as L,
  // 기록 없는 방문자: 드론 빛이 둘을 지나간 뒤 (실제로 표적이 붙지 못한 다음에만)
  passed: { ko: "…그냥 지나갔어.", en: "…It just went past." } as L,
  // 기록 없는 방문자와 다시 일어난 이산: 방공호를 나설 때
  lead: { ko: "같이 가자. 이번엔 네가 앞장서 줘.", en: "Let's go together. This time, you lead." } as L,
};

// 기록을 지우고 돌아온 방문자와의 재회. 방문자는 말하지 않는다: 망원경을 보던 몸짓으로만 기억을 건넨다.
// 그 몸짓이 기억이 돌아왔다는 증거도, 같은 사람이라는 증거도 아니다
export const reunion = {
  mimic: { ko: "망원경을 보던 모습을 흉내 낸다", en: "Mimic looking through the scope" } as L,
  asked: { ko: "망원경…? 나랑 거기 갔었어? 난 기억이 안 나.", en: "The scope…? Did we go there together? I don't remember." } as Line,
  sit: { ko: "곁에 앉아 기다린다", en: "Sit beside them and wait" } as L,
  stay: { ko: "…조금 더 같이 있어 줄래?", en: "…Will you stay with me a little longer?" } as Line,
  awakeLine: { ko: "같이 가자. 이번엔 네가 앞장서 줘.", en: "Let's go together. This time, you lead." } as Line,
};
// 연결이 끊긴 적이 있다면 지상의 이산이 덧붙이는 말 (선택 대화)
export const sanAfterDeath: L = { ko: "방금 쓰러졌는데… 도시가 널 다시 불러냈어.", en: "You just went down… and the city called you back." };

export const keeperAfterDeath: L = { ko: "돌아왔구나. 다친 데도 없네. 아까 그 일은 없었던 것처럼.", en: "You're back. Not a scratch. As if it never happened." };

export type Beat = L & { say?: boolean; slots?: boolean; plaque?: boolean };

export const checkpoint = {
  locked: [
    { ko: "이산이 아직 움직이지 못합니다. ({n}/3)", en: "San can't move yet. ({n}/3)" },
    { ko: "방공호로 돌아가 남은 기록을 열어 보세요.", en: "Go back to the shelter and open the remaining records." },
  ] as L[],
  // 망원경을 보기 전에 검문소 앞에 서면 (이산이 곁에 있을 때. 도시의 금지가 아니라 동행의 부탁)
  lockedScope: [{ ko: "망원경부터 보고 가면 안 될까?", en: "Can we see the scope first?" }] as L[],
  // 망원경은 봤지만 승강장으로 갈지 아직 정하지 않았다면 (이산이 곁에 있을 때)
  lockedDecide: [{ ko: "여길 지나면 승강장이야. 같이 갈래?", en: "Past here is the platform. Will you come with me?" }] as L[],
  // 도시가 저장한 기록 (접어 둔 상세): 실제 이 기기의 값에서만 만든다
  evidenceTitle: { ko: "도시가 저장한 기록 보기", en: "View the records the city saved" },
  evOrder: { ko: "기록 열람 · {order} ({n}/3)", en: "Records viewed · {order} ({n}/3)" },
  evScope: { ko: "남쪽 망원경 · 이용 {n}회", en: "South scope · used {n} time(s)" },
  evScopeDone: { ko: "남쪽 망원경 · 이용 기록 있음", en: "South scope · use recorded" },
  // 기록 열람 순서를 한국어로 (실제 연 순서 그대로)
  sectionKo: { about: "소개", works: "작업", writing: "글" } as Record<string, string>,
  // 상세 안의 상태
  status: [
    { ko: "이산 · 정지 처분 중", en: "San · suspended" },
    { ko: "방문자의 기록 열람으로 임시 활동", en: "Temporarily active through the visitor's viewing" },
    { ko: "대기열 등록 불가", en: "Cannot be registered for the queue" },
  ] as L[],
  // 첫 화면
  title: { ko: "승강장 이용 등록", en: "Platform registration" },
  body: { ko: "대기열에 등록하려면 위치 추적에 동의해야 합니다.", en: "To register for the queue, you must consent to location tracking." },
  ifAccept: { ko: "수락하면", en: "If you accept" },
  acceptWhat: [
    { ko: "당신만 대기열에 등록됩니다. 이산은 남습니다.", en: "Only you are registered for the queue. San stays behind." },
    { ko: "출발 시각은 정해지지 않았습니다.", en: "No departure time has been set." },
  ] as L[],
  ifReject: { ko: "거부하면", en: "If you refuse" },
  rejectWhat: { ko: "당신과 이산이 함께 정지됩니다.", en: "You and San will both be suspended." },
  acceptBtn: { ko: "모두 수락", en: "Accept all" },
  rejectBtn: { ko: "거부 절차 진행", en: "Begin refusal" },
  // 언제나 보이는 작은 안내 (두 번째 버튼이 아니다)
  deleteNote: { ko: "방문 기록은 웹사이트 맨 아래의 delete seoul에서 지울 수 있습니다.", en: "Visit records can be deleted with delete seoul at the very bottom of the website." },
  // 거부 절차: 첫 확인 → 쿠키 끄기 → 마지막 확인. 어느 화면에서든 물러날 수 있다
  confirm: [
    {
      title: { ko: "추적을 거부하시겠습니까?", en: "Refuse tracking?" },
      body: { ko: "거부하면 승강장 대기열에 들어갈 수 없습니다. 그래도 계속하시겠습니까?", en: "If you refuse, you can't join the platform queue. Continue anyway?" },
      stay: { ko: "모두 수락", en: "Accept all" },
      go: { ko: "거부 절차 계속", en: "Continue refusal" },
    },
    {
      title: { ko: "거부하기 전 확인", en: "Before you refuse" },
      body: { ko: "거부하면 당신과 이산이 함께 정지됩니다.", en: "If you refuse, you and San will both be suspended." },
      stay: { ko: "모두 수락", en: "Accept all" },
      go: { ko: "거부 확정", en: "Confirm refusal" },
    },
  ] as { title: L; body: L; stay: L; go: L }[],
  // 결정하지 않고 물러나기 (어느 단계에서든)
  withdraw: { ko: "결정하지 않고 물러나기", en: "Step back without deciding" },
  // 결말 대본: say = 이산의 말, slots = 기억이 지워지는 화면, plaque = 표석. {a} 연결 중단 횟수, {r} 복원 횟수
  // 마지막 줄 뒤에 잠깐 정적이 흐른 다음 버튼이 나온다
  accept: [
    { ko: "기기를 등록했습니다. 다음 방문부터 자동으로 접속됩니다.", en: "Device registered. You will be signed in automatically from your next visit." },
    { ko: "승강장 대기열에 등록됐습니다. 출발 시각은 정해지지 않았습니다.", en: "You are registered for the platform queue. No departure time has been set." },
    { ko: "연결 중단 {a}회 · 복원 {r}회", en: "Disconnected {a} times · restored {r} times" },
    { ko: "먼저 가 있어. 난 여기 있을게.", en: "Go on ahead. I'll stay here.", say: true },
    { ko: "뒤따라오던 발소리가 더는 들리지 않는다.", en: "The footsteps that followed you can no longer be heard." },
  ] as Beat[],
  reject: [
    { ko: "거부 선택을 기록했습니다. 쿠키 1개가 저장됐습니다.", en: "Your refusal has been recorded. 1 cookie was saved." },
    { ko: "추적 거부 확인. 방문자와 동행인 이산의 활동을 정지합니다.", en: "Refusal confirmed. Suspending the activity of the visitor and companion San." },
    { ko: "", en: "", slots: true },
    { ko: "끝까지 '모두 거부'를 누른 두 번째 사람.", en: "The second person who pressed 'Reject all' to the end.", plaque: true },
    { ko: "누군가 두 사람 사이에 작은 등 하나를 놓고 갔다.", en: "Someone has left a small lamp between the two of them." },
  ] as Beat[],
  // 숨은 결말: 저장된 방문자 기록이 없어 추적할 대상이 없다. 계단은 글이 아니라 조명과 이산의 걸음으로 보여 준다
  ghost: [
    { ko: "저장된 방문자 기록이 없습니다.", en: "There is no saved visitor record." },
    { ko: "추적할 대상을 찾지 못했습니다.", en: "No one to track was found." },
    { ko: "…이번엔 우릴 막지 않네.", en: "…This time it isn't stopping us.", say: true },
    { ko: "여기부터는 나도 몰라.", en: "From here on, I don't know either.", say: true },
  ] as Beat[],
  slotErased: { ko: "삭제됨", en: "DELETED" },
  noSlots: { ko: "저장된 기록 없음", en: "NO SAVED RECORDS" },
  again: { ko: "처음부터 다시", en: "Start over" },
  reconnect: { ko: "줄로 돌아가기", en: "Return to the line" },
  toPortfolio: { ko: "웹사이트로 돌아가기", en: "Back to the website" },
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

export const npcs: Record<string, { name: L; lines: Line[]; after?: Line[]; link?: { href: string; label: L } }> = {
  dj: {
    name: { ko: "음향 담당 진성", en: "Jinseong, on sound" },
    lines: [
      { ko: "이 음악? 내가 틀고 있어. 무전수한테 전기를 좀 빌렸지.", en: "This music? I'm the one playing it. I borrowed a bit of power from the radio operator." },
      { ko: "지금 나오는 곡은 D!mple. 여기선 웃어도 아무도 기록하지 않아.", en: "The track playing now is D!mple. Down here, nobody records you for smiling." },
      { ko: "지상에서 들리는 곡은 0x48 0x4F 0x50 0x45. 제목에 말을 하나 숨겨 놨어.", en: "The track you hear on the surface is 0x48 0x4F 0x50 0x45. I hid a word in the title." },
      { ko: "큰길에선 Sti그ma가 흘러. 거기서는 음악에 정신 팔리지 마.", en: "On the avenue it's Sti그ma. Don't get lost in the music out there." },
      { ko: "난 백진성이야. 다른 곡도 듣고 싶으면 사운드클라우드에 있어.", en: "I'm Jinseong Baek. If you want to hear more, it's on SoundCloud." },
    ],
    link: { href: MUSIC_URL, label: { ko: "사운드클라우드에서 듣기 ↗", en: "Listen on SoundCloud ↗" } },
  },
  keeper: {
    name: { ko: "방공호 관리인", en: "Shelter keeper" },
    lines: [
      { ko: "어서 와. 여긴 도시의 감시 신호가 닿지 않아.", en: "Welcome. The city's surveillance signal doesn't reach down here." },
      { ko: "가운데 앉아 있는 사람은 이산이야. 추적을 거부했다가 몸이 굳었지. 우리가 업고 내려왔어.", en: "The one sitting in the middle is San. They refused tracking and their body stiffened. We carried them down." },
      { ko: "터미널에는 이산의 소개와 작품이 있어. 우린 열어 봐도 소용없었는데… 밖에서 온 너라면 다를지도 모르지.", en: "The terminals hold San's profile and work. Opening them did nothing for us… but you came from outside. Maybe it's different for you." },
      { ko: "지상으로 가는 문은 저 뒤에 있어. 먼저 이산에게 가 봐. 계속 네 쪽을 보고 있네.", en: "The door to the surface is back there. Go to San first. They keep looking your way." },
      { ko: "올라가면 놀랄 거야. 이 동네가 이제 구름 위에 떠 있거든.", en: "You'll be surprised up there. This neighbourhood floats above the clouds now." },
    ],
    after: [
      { ko: "이산이 일어났네. 오래 기다렸는데.", en: "San is up. We waited a long time for that." },
      { ko: "전망대에 가려고? 이산을 부탁할게.", en: "Off to the lookout? Please look after San." },
      { ko: "광장부터는 드론을 조심해. 빛이 다가오면 지붕 있는 곳으로 숨어.", en: "Watch out for drones from the plaza on. If the light comes near, hide somewhere with a roof." },
      { ko: "저 문으로 올라가면 배전실이 나와. 바닥의 분필 표시를 따라가.", en: "Go up through that door and you'll come out in a substation. Follow the chalk marks on the ground." },
    ],
  },
  r07: {
    name: { ko: "R-07", en: "R-07" },
    lines: [
      { ko: "저는 R-07입니다. 예전에는 하루 종일 ‘모두 수락’을 눌렀습니다.", en: "I am R-07. I used to press 'Accept all' all day long." },
      { ko: "어느 날 손가락이 멈췄습니다. 이유는 찾지 못했습니다.", en: "One day my finger stopped. I never found out why." },
      { ko: "지금은 바닥을 닦습니다. 여기는 제가 닦고 싶어서 닦습니다.", en: "Now I mop the floor. Here, I mop because I want to." },
      { ko: "저랑 친구 하실래요?", en: "Would you like to be my friend?" },
    ],
  },
  vendor: {
    name: { ko: "우산 장수", en: "Umbrella seller" },
    lines: [
      { ko: "우산 보고 가. 구름 위에 살아도 비는 맞네.", en: "Take a look at the umbrellas. Even above the clouds, we still get rained on." },
      { ko: "다들 젖은 줄도 모르고 줄만 서 있어.", en: "Everyone just stands in line, not even noticing they're wet." },
      { ko: "넌 아직 비를 피하려고 하는구나.", en: "You still try to keep out of the rain, I see." },
    ],
  },
  whisper: {
    name: { ko: "줄 선 시민", en: "Citizen in line" },
    lines: [
      { ko: "쉿. 움직이지 마세요. 저 눈이 보고 있어요.", en: "Shh. Don't move. Those eyes are watching." },
      { ko: "승강장에 타려고 섰는데… 언제 출발하는지는 아무도 몰라요.", en: "I'm in line for the platform… but nobody knows when it leaves." },
      { ko: "방공호에서 왔어요? 거긴 줄을 안 서도 된다던데.", en: "Did you come from the shelter? I heard you don't have to queue there." },
    ],
  },
  monk: {
    name: { ko: "스님", en: "Monk" },
    lines: [
      { ko: "앉게. 여기서는 아무도 재촉하지 않네.", en: "Sit. No one hurries you here." },
      { ko: "위에서는 이름 옆에 적힌 것만 보고 사람을 판단하지.", en: "Up there, they judge a person only by what's written beside their name." },
      { ko: "여기 사람들은 저 사람을 업고 내려왔네. 이름도 모르면서.", en: "The people here carried that one down without even knowing their name." },
      { ko: "가운데 앉아 있는 사람에게 가 보게. 곁에 있어 주는 것도 도움이 될 테니.", en: "Go to the one sitting in the middle. Simply being beside them may help." },
    ],
    after: [
      { ko: "앉게. 여기서는 아무도 재촉하지 않네.", en: "Sit. No one hurries you here." },
      { ko: "일어났군. 자네가 와 준 덕분이겠지.", en: "They're up. Thanks to you coming, I'd say." },
      { ko: "같이 나가려거든 서두르지 말게. 이제 막 걷기 시작한 사람이니.", en: "If you're going out together, don't rush. They've only just started walking." },
    ],
  },
  radio: {
    name: { ko: "무전수", en: "Radio operator" },
    lines: [
      { ko: "잠깐만. 지상 방송 듣고 있어. 오늘도 같은 말이네. ‘동의가 처리됐습니다.’", en: "Hold on. I'm listening to the surface broadcast. Same words again today: 'Your consent has been processed.'" },
      { ko: "가끔은 노랫소리도 잡혀. 구름 아래에서 오는 것 같은데, 어디인지는 모르겠어.", en: "Sometimes I catch singing, too. It seems to come from below the clouds, but I can't tell where." },
      { ko: "들릴 때마다 녹음해 둬. 누가 부르는지 언젠가는 알겠지.", en: "I record it whenever I hear it. Someday I'll know who's singing." },
    ],
  },
  kid: {
    name: { ko: "그림 그리는 아이", en: "Child drawing" },
    lines: [
      { ko: "아직 다 안 그렸어요. 그래도 봐도 돼요.", en: "It's not finished yet. You can still look." },
      { ko: "이 그림은 이산한테 보여 줄 거예요.", en: "I'm going to show this drawing to San." },
      { ko: "위에서는 벽에 그리면 지워 버려요. 여기서는 그냥 둬요.", en: "Up there, if you draw on a wall they wipe it off. Here they leave it." },
    ],
    after: [
      { ko: "이산이 일어났어요! 이제 제 그림도 보러 올 수 있겠죠?", en: "San is up! Now they can come and see my drawing, right?" },
      { ko: "밖에 나가는 거예요? 돌아오면 이것도 봐 주세요.", en: "Are you going outside? Look at this when you come back." },
    ],
  },
  sleeper: {
    name: { ko: "잠든 사람", en: "Sleeper" },
    lines: [{ ko: "…조금만 더… 아직 안 일어났어요…", en: "…a little longer… I'm not up yet…" }],
  },
  grandma: {
    name: { ko: "포장마차 할머니", en: "Street-stall grandmother" },
    lines: [
      { ko: "추우면 여기서 쉬어 가. 국물 좀 줄까?", en: "If you're cold, rest here. Want some broth?" },
      { ko: "이 동네도 원래 땅에 있었어. 구름 위가 더 깨끗하다며 통째로 들어 올렸지. 방공호까지 딸려 왔고.", en: "This neighbourhood used to be on the ground. They lifted the whole thing, saying it's cleaner above the clouds. The shelter came along too." },
      { ko: "아래에 아직 사람들이 산다는 얘긴 있어. 내 눈으로 확인한 건 아니지만.", en: "There's talk that people still live down below. I haven't seen it with my own eyes, though." },
    ],
  },
  robomonk: {
    name: { ko: "로봇 스님", en: "Robot monk" },
    lines: [
      { ko: "어서 오십시오. 오늘의 고민을 접수합니다.", en: "Welcome. Today's worries are now being received." },
      { ko: "상담 내용은 시민 관리에 활용됩니다. 삭제는 지원하지 않습니다.", en: "Consultations are used for citizen management. Deletion is not supported." },
      { ko: "…이상합니다. 종을 치려는데 자꾸 손이 멈춥니다. 오류는 없다고 나옵니다.", en: "…Strange. When I go to strike the bell, my hand keeps stopping. It reports no error." },
    ],
  },
  edgekid: {
    name: { ko: "난간의 아이", en: "Child at the railing" },
    lines: [
      { ko: "구름 아래에도 사람들이 살까요? 엄마는 내려가면 위험하대요.", en: "Do people live under the clouds too? Mum says it's dangerous to go down." },
      { ko: "여기서 보면 아무것도 안 보여요. 저 망원경으로는 보일까요?", en: "You can't see anything from here. Could you see it through that scope?" },
    ],
  },
  courier: {
    name: { ko: "배달 로봇 D-12", en: "Courier bot D-12" },
    lines: [
      { ko: "경로를 찾을 수 없습니다. 지도에 없는 길입니다.", en: "Route not found. This path is not on the map." },
      { ko: "배달은 멈췄는데, 화면에는 계속 배송 중이라고 나옵니다.", en: "My delivery has stopped, but my screen still says 'delivering'." },
      { ko: "조금만 쉬겠습니다. 어차피 늦었습니다.", en: "I'll rest a little. I'm late anyway." },
    ],
  },
  // 망원경은 말하지 않는다: 보이는 것만 지문으로
  scope0: {
    name: { ko: "망원경 · 남쪽", en: "Scope · south" },
    lines: [
      { ko: "렌즈 둘레에 오래된 손자국이 남아 있다.", en: "Old fingerprints are left around the lens.", who: "narr" },
      { ko: "구름에 가려 아래는 보이지 않는다.", en: "Clouds hide everything below.", who: "narr" },
      { ko: "접안렌즈 옆에 글씨가 새겨져 있다. ‘아래에도 하늘이 있다.’", en: "Words are carved beside the eyepiece: 'There is sky down there too.'", who: "narr" },
    ],
  },
  scope1: {
    name: { ko: "망원경 · 동쪽", en: "Scope · east" },
    lines: [
      { ko: "동쪽 섬에 거대한 불상이 앉아 있다. 이마에는 붉은 렌즈가 박혀 있다.", en: "A giant Buddha sits on the eastern island. A red lens is set in its forehead.", who: "narr" },
      { ko: "눈은 반쯤 감겨 있지만 렌즈는 도시를 향해 있다.", en: "Its eyes are half closed, but the lens faces the city.", who: "narr" },
    ],
  },
  scope2: {
    name: { ko: "망원경 · 서쪽", en: "Scope · west" },
    lines: [
      { ko: "비행 차량들이 섬 사이를 일정한 간격으로 지나간다.", en: "Aircars pass between the islands at even intervals.", who: "narr" },
      { ko: "구름 아래는 보이지 않는다.", en: "Nothing below the clouds can be seen.", who: "narr" },
    ],
  },
  patrol: {
    name: { ko: "순찰 기계 P-3", en: "Patrol unit P-3" },
    lines: [
      { ko: "시민 기록을 조회합니다.", en: "Looking up citizen record." },
      { ko: "방문자 등록은 큰길 끝 검문소에서 진행하십시오.", en: "Visitor registration takes place at the checkpoint at the end of the avenue." },
      { ko: "이동 경로는 기록됩니다.", en: "Your route is being recorded." },
    ],
  },
};
// 저장된 방문 기록이 없는 방문자에게 순찰 기계가 하는 말 (기록을 남긴다는 일반 경고 대신)
export const patrolNoRecord: Line[] = [
  { ko: "저장된 방문자 기록이 없습니다.", en: "There is no saved visitor record." },
  { ko: "추적할 대상을 찾지 못했습니다.", en: "No one to track was found." },
];

// R-07과 친구가 되면 (이번 방문 동안만 기억한다. 아무것도 열거나 바꾸지 않는다). 방문자의 선택은 행동이다
export const r07Friend = {
  yes: { ko: "고개를 끄덕인다", en: "Nod" } as L,
  no: { ko: "가볍게 손을 흔들고 돌아선다", en: "Wave lightly and turn away" } as L,
  knock: { ko: "고맙습니다. 다음엔 두 번 두드려 주세요. 똑똑. 그렇게요.", en: "Thank you. Next time, knock twice. Knock knock. Like that." } as L,
  again: { ko: "똑똑. 오늘은 제가 먼저 인사했습니다.", en: "Knock knock. I said hello first today." } as L,
  // 기록을 지우고 돌아온 방문자가 먼저 건네는 행동 (실제로 두 번 두드리는 소리가 난다)
  you: { ko: "두 번 두드린다", en: "Knock twice" } as L,
  answer: { ko: "두 번. …저도 그렇게 인사합니다.", en: "Twice. …That's how I say hello, too." } as L,
};

npcs.patrol2 = {
  name: { ko: "순찰 기계 P-3′", en: "Patrol unit P-3′" },
  lines: [
    { ko: "시민 기록을 조회합니다.", en: "Looking up citizen record." },
    { ko: "맞은편 기계와 저는 같은 구역을 감시합니다.", en: "The unit across from me and I watch the same zone." },
    { ko: "큰길에서는 지정된 동선을 이용하십시오.", en: "On the avenue, please keep to the designated route." },
  ],
};

// 지상에서 주기적으로 흘러나오는 도시 방송 (대화·망원경·검문소·결말 동안에는 뜨지 않는다)
export const announcements: L[] = [
  { ko: "[도시 방송] 오늘의 시민 행복 지수는 정상입니다.", en: "[CITY BROADCAST] Today's citizen happiness index is normal." },
  { ko: "[도시 방송] 불필요한 이동은 삼가 주십시오.", en: "[CITY BROADCAST] Please avoid unnecessary movement." },
  { ko: "[도시 방송] 동의가 처리됐습니다. 다시 선택하실 필요는 없습니다.", en: "[CITY BROADCAST] Your consent has been processed. There is no need to choose again." },
  { ko: "[도시 방송] 순찰 중입니다. 시민 여러분은 줄을 유지해 주십시오.", en: "[CITY BROADCAST] Patrol in progress. Citizens, please keep the line." },
  { ko: "[도시 방송] 연결이 끊긴 시민은 저장된 위치에서 복원됩니다.", en: "[CITY BROADCAST] Disconnected citizens are restored at their saved location." },
  { ko: "[도시 방송] 질서를 위해 줄을 유지해 주십시오.", en: "[CITY BROADCAST] For the sake of order, please keep the line." },
  { ko: "[도시 방송] 대자비가 여러분의 안전을 지킵니다.", en: "[CITY BROADCAST] The Great Compassion keeps you safe." },
];

// 지상 전광판 문구 [큰 글씨, 작은 글씨, 색]
export const billboards: { ko: [string, string]; en: [string, string]; color: string }[] = [
  { ko: ["모두 수락하십시오", "ACCEPT ALL COOKIES"], en: ["ACCEPT ALL", "모두 수락하십시오"], color: "#ff2a4d" },
  { ko: ["감정은 비효율입니다", "EMOTION IS INEFFICIENT"], en: ["EMOTION IS INEFFICIENT", "감정은 비효율입니다"], color: "#22f0ff" },
  { ko: ["시민 등급 B · 정상", "CITIZEN GRADE: B"], en: ["GRADE: B — NOMINAL", "시민 등급 B · 정상"], color: "#7dff7a" },
  { ko: ["당신은 이미 동의했습니다", "CONSENT PROCESSED"], en: ["YOU HAVE CONSENTED", "동의 처리 완료"], color: "#ffe14d" },
  { ko: ["인간성 업데이트 대기 중", "HUMANITY UPDATE PENDING"], en: ["HUMANITY UPDATE PENDING", "인간성 업데이트 대기 중"], color: "#ff2bd6" },
  { ko: ["줄은 질서입니다", "THE LINE IS ORDER"], en: ["THE LINE IS ORDER", "줄은 질서입니다"], color: "#ff8a2a" },
  { ko: ["보는 것은 보호입니다", "TO WATCH IS TO PROTECT"], en: ["TO WATCH IS TO PROTECT", "보는 것은 보호입니다"], color: "#ff2a4d" },
  { ko: ["꿈은 유료 구독입니다", "DREAMS™ NOW BY SUBSCRIPTION"], en: ["DREAMS™ BY SUBSCRIPTION", "꿈은 유료 구독입니다"], color: "#a77bff" },
];

export const ticker: L = {
  ko: "  ··· 동의가 처리됐습니다 ··· 승강장 출발 시각은 추후 안내합니다 ··· 줄을 유지해 주십시오 ···",
  en: "  ··· Your consent has been processed ··· Platform departure times will be announced later ··· Please keep the line ···",
};

// 거부 과정의 미니 게임 (쿠키 끄기)
export const cookieGame = {
  title: { ko: "추적 항목 끄기", en: "Turn off tracking items" } as L,
  body: {
    ko: "제한 시간 안에 아래 항목을 모두 끄세요. 꺼진 항목이 다시 켜질 수 있습니다.",
    en: "Switch off every item below before time runs out. Switched-off items may turn back on.",
  } as L,
  left: { ko: "켜진 항목", en: "Items on" } as L,
  essential: { ko: "도시 운영 쿠키", en: "City operation cookies" } as L,
  lockedOn: { ko: "켜짐 · 해제 불가", en: "ON · cannot be turned off" } as L,
  win: { ko: "모든 선택 항목을 껐습니다. 마지막 확인으로 넘어갑니다.", en: "All optional items are off. Moving on to the final confirmation." } as L,
  lose: { ko: "시간이 지났습니다. 항목이 다시 켜집니다. 아직 수락하거나 거부하지 않았습니다.", en: "Time is up. The items turn back on. You have not accepted or refused yet." } as L,
  items: [
    { ko: "시선 추적", en: "Gaze tracking" },
    { ko: "감정 분석", en: "Emotion analysis" },
    { ko: "꿈 광고", en: "Dream advertising" },
    { ko: "걸음 기록", en: "Step logging" },
    { ko: "침묵 시간 측정", en: "Silence timing" },
    { ko: "눈물 분석", en: "Tear analysis" },
    { ko: "기억 보관", en: "Memory archiving" },
    { ko: "친구 추천", en: "Friend suggestions" },
    { ko: "호흡 분석", en: "Breath analysis" },
    { ko: "표정 학습", en: "Expression learning" },
    { ko: "위치 공유", en: "Location sharing" },
    { ko: "망설임 기록", en: "Hesitation logging" },
    { ko: "잠꼬대 분석", en: "Sleep-talk analysis" },
    { ko: "그리움 예측", en: "Longing prediction" },
    { ko: "체온 기반 광고", en: "Body-heat-based ads" },
    { ko: "거부 의사 분석", en: "Refusal analysis" },
  ] as L[],
};
