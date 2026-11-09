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
    // QR 코드로 곧장 들어온 방문자도 이곳이 웹사이트의 일부라는 것을 처음부터 알도록
    {
      ko: "이 게임은 이산의 개인 웹사이트 안에 있습니다. 방공호의 터미널에는 그 웹사이트의 소개, 작업, 글이 옮겨져 있습니다.",
      en: "This game lives inside San Lee's personal website. The shelter's terminals hold that website's introduction, works and writing.",
    },
  ] as L[],
  start: { ko: "방공호로 들어가기", en: "Enter the shelter" },
  // 터미널 기록 패널 머리: 이 내용이 게임 밖 웹사이트의 실제 페이지라는 표시
  recordSource: { ko: "2026 · 이산의 개인 웹사이트에서 옮겨 온 기록", en: "2026 · carried over from San Lee's personal website" },
  goBack: { ko: "웹사이트로 돌아가기", en: "Back to the website" },
  hintPc: { ko: "화면을 클릭하면 마우스로 둘러볼 수 있습니다.", en: "Click the screen to look around with the mouse." },
  hintLocked: { ko: "WASD 이동 · Shift 달리기 전환 · Space 점프 · E/클릭 상호작용 · Esc 일시정지", en: "WASD move · Shift toggle run · Space jump · E/click interact · Esc pause" },
  hintIntroPc: { ko: "마우스 시점 조절 · WASD 이동 · Shift 달리기 전환 · Space 점프 · E/클릭 상호작용", en: "Mouse to look · WASD move · Shift toggle run · Space jump · E/click interact" },
  hintTouch: { ko: "왼쪽 조이스틱으로 이동 · 화면을 드래그해 둘러보기 · ⤒ 점프", en: "Left stick to move · drag the screen to look around · ⤒ jump" },
  open: { ko: "열기", en: "Open" },
  talk: { ko: "이야기 듣기", en: "Listen" },
  view: { ko: "보기", en: "View" },
  back: { ko: "닫기", en: "Close" },
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
  terminalLocked: [
    { ko: "열람 전", en: "Not yet viewed" },
    { ko: "먼저 방 한가운데 앉아 있는 사람에게 다가가세요.", en: "First, go to the person sitting in the middle of the room." },
  ] as L[],
  toPortfolio: { ko: "웹사이트로 돌아가기", en: "Back to the website" },
  // 검문소에서 물러난 뒤 이산과의 대화 끝 (기록을 지우러 웹사이트로 나가는 길)
  logout: { ko: "로그아웃", en: "Log out" },
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
  // 그 앞, 이산이 먼저 계단참으로 걸어가는 동안
  followHint: { ko: "이산을 따라 다리 건너기", en: "Follow San across the bridge" },
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
  introShots: [
    { src: "/deleteseoul/jabi-lock.webp", cap: { ko: "눈과 입이 붉어지면: 조준", en: "Eyes and mouth turn red: locked on" } },
    { src: "/deleteseoul/jabi-fire.webp", cap: { ko: "빛이 내려오면: 연결 끊김", en: "The light comes down: disconnected" } },
  ] as { src: string; cap: L }[],
  deadTitle: { ko: "연결이 끊겼습니다", en: "CONNECTION LOST" },
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
      ko: "여기 사람들이 날 업고 내려왔어. 터미널엔 내 기록을 옮겨 놨고. 2026년의 어느 웹사이트에서 가져온 거래. 네가 한번 열어 봐 줄래?",
      en: "The people here carried me down, and put my records on the terminals. They say they came from a website, back in 2026. Would you open them?",
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
    // 되찾은 얼굴에 대한 의구심 (원본을 지켰을 때. 표준 미소를 골랐다면 이 줄 앞뒤가 faceTalk.standard로 바뀐다)
    { ko: "얼굴이 돌아왔는데, 이상하게 낯설어. 장치는 ‘원본’이라고 했지만… 그 원본은 누구 얼굴일까.", en: "My face is back, but it feels strangely unfamiliar. The machine called it 'original'… but whose face was the original?" },
    { ko: "저 그림, 내가 그렸던 게 기억나. 그런데 옆에 적힌 연도는 2026년이네.", en: "That painting. I remember painting it. But the year written beside it is 2026." },
    // 방공호를 나서는 동기: 데이터 이산의 존재에 대한 회의 → 쿠키를 거부한 진짜 이유 → 기록이 아닌 경험 하나
    { ko: "내가 아는 건 전부 그 사람의 기록이야. 얼굴도, 그림도, 글도. 난 그걸 읽고 있을 뿐인지도 몰라.", en: "Everything I know is that person's record. The face, the paintings, the writing. Maybe I'm only reading them." },
    { ko: "도시가 날 감시할수록, 나도 그냥 기록이 되어 가는 것 같았거든.", en: "The more the city watched me, the more I felt like I was turning into nothing but a record." },
    { ko: "그래서 쿠키를 전부 거부했고, 결국 이렇게 멈춰 버렸지.", en: "So I rejected every cookie, and in the end I stopped, like this." },
    { ko: "남쪽 망원경으로는 가끔 구름 아래가 보인다던데. 바깥은 위험해도, 들은 얘기 말고 내 눈으로 보고 싶어.", en: "I heard you can sometimes see below the clouds from the south scope. It's dangerous out there, but I want to see it with my own eyes, not just hear about it." },
    { ko: "기록이 아닌 걸 하나쯤은 갖고 싶으니까. 같이 가 줄래? 보고 돌아오자.", en: "Because I want at least one thing that isn't a record. Will you come with me? We'll look and come back." },
  ],
];

// 얼굴 맞추기에서 고른 것에 따라 깨어난 뒤 첫 대화에 끼어드는 가벼운 말 (이야기에는 영향이 없다).
// joke는 "……움직인다. 고마워." 바로 뒤에, doubt는 얼굴에 대한 의구심 줄을 대신한다
export const faceTalk = {
  standard: {
    joke: { ko: "…근데 입꼬리가 안 내려가. 웃을 일도 없는데 계속 웃고 있어. 이러다 볼에 쥐 나겠다.", en: "…But the corners of my mouth won't come down. Nothing's funny and I keep smiling. My cheeks are going to cramp." } as Line,
    doubt: { ko: "얼굴은 돌아왔는데, 이상하게 낯설어. 도시는 ‘더 나은 나’라고 했지만… 원래 내 얼굴은 어땠을까.", en: "My face is back, but it feels strangely unfamiliar. The city called it 'a better me'… but what did my real face look like?" } as Line,
  },
  exception: {
    joke: { ko: "비표준 얼굴로 등록됐네. 뭐, 표준이었던 적도 없으니까.", en: "Registered as a non-standard face, huh. Well, I was never standard anyway." } as Line,
  },
};

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
  // 방문자가 먼저 본다. 이산은 비켜서서 기다린다
  ask: { ko: "너 먼저 봐. 난 그다음에 볼게.", en: "You look first. I'll go after you." } as L,
  first: { ko: "……! 저 아래, 뭔가 반짝였어.", en: "……! Down there, something glimmered." } as L,
  // 방문자가 망원경에서 눈을 뗀 뒤. 두 번째 페이지 앞의 정적 동안 둘은 아래를 내려다본다
  after: [
    { ko: "너도 봤어? 지금은 구름뿐이야. 분명히 봤는데. 잠깐이었어.", en: "Did you see it? It's only clouds now. I definitely saw it. Just for a moment." },
    { ko: "그림도, 글도 2026년의 그 사람 거였는데…", en: "The paintings, the writing, they all belonged to that person in 2026…", pause: 1600 },
    { ko: "방금 본 건 내 기억이야. 그 사람의 기록이 아니라, 여기서 내가 본 거니까.", en: "What I just saw is my memory. Not that person's record. I saw it, here." },
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
    { who: "san", ko: "할머니, 구름 아래를 본 적 있어요?", en: "Grandma, have you ever seen below the clouds?" },
    { who: "npc", ko: "보기만 했겠어, 거기서 살았지. 요샌 남쪽 전망대에서나 가끔 보인다더라.", en: "Seen it? I lived there. These days, they say you only catch a glimpse from the south lookout." },
  ],
  courier: [
    { who: "npc", ko: "경로를 찾을 수 없습니다. 지도에 없는 길입니다.", en: "Route not found. This path is not on the map." },
    { who: "san", ko: "아직도 배송 중이라고 뜨네.", en: "It still says 'delivering'." },
  ],
  edgekid: [
    { who: "npc", ko: "저 구름 아래에도 동네가 있어요?", en: "Is there a town under those clouds too?" },
    { who: "san", ko: "나도 몰라. 그래서 직접 보러 가는 길이야.", en: "I don't know either. That's why I'm going to see for myself." },
  ],
};

// 검문소에서 물러난 뒤 이산과의 대화 (처음 한 번). 다른 방송은 뜨지 않는다
// 마지막 페이지(memory)가 뜬 기기에 웹사이트 꼬리말의 'delete seoul'이 켜진다
export const sanAfterCheckpoint = {
  lines: [
    { ko: "너만 줄에 설 수 있나 봐. 난 이렇게 움직이는데도, 저기엔 아직 정지된 사람으로 나와.", en: "Looks like only you can join the line. I'm moving, but it still lists me as suspended." },
    // 이산은 게임 속 사람이라 웹사이트를 잘 모른다: 두루뭉술하게 '이 도시 바깥'이라고만 말한다 (대화 끝의 로그아웃 버튼이 길을 대신 알려 준다)
    { ko: "이 도시는 뭐든 다 적어 둬. 내 기록도, 오늘 네가 지나온 길도.", en: "This city writes everything down. My records, and every step you took today." },
    { ko: "그걸 지울 수 있는 곳은 여기가 아니라 이 도시 바깥인가 봐.", en: "I think the place to erase them isn't here, but somewhere outside this city." },
    { ko: "지우면 난 다시 멈출 거야. 오늘 일도 잊어버릴 테고.", en: "If you delete them, I'll stop again. I'll forget today, too." },
    // 시 구절로 넘어가는 다리: 기록은 지워져도 마음에 새긴 것은 남을지 모른다
    { ko: "그래도 하나쯤은 남을지 몰라. 기록이 아니라 마음에 새긴 거라면.", en: "But maybe one thing would stay. If it's carved into my heart, not into a record." },
    { ko: "내가 가장 좋아하는 시 구절이 있어. 2026년의 ‘이산’이 쓴 거야.", en: "There's a line of poetry I love most. The ‘San Lee’ of 2026 wrote it." },
    // 방문자가 기억해 갈 구절 (재회 때 세 구절 중에서 고른다: reunion.verses)
    { ko: "‘수놓인 별들 아래 걸음이 서투른 저희는 고고합니까?’", en: "‘Beneath the embroidered stars, are we, so clumsy in our steps, noble?’" },
    { ko: "내가 쓴 건 아니지만, 이 문장만큼은 처음부터 내 것 같았어.", en: "I didn't write it, but this one sentence felt like mine from the start." },
  ] as Line[],
  memory: { ko: "다시 와 줄래? 내가 널 몰라봐도, 이 구절을 들려주면 알아들을지도 몰라.", en: "Will you come back anyway? Even if I don't know you, I might understand if you tell me that line." } as Line,
};
// 그 뒤로 지상에서 이산에게 말을 걸면: 되풀이 없이 짧게
export const sanReview: Line[] = [{ ko: "같이 내려가고 싶었는데… 돌아오면, 그 구절을 들려줘.", en: "I wanted us to go down together… If you come back, tell me that line." }];

// 지상에서 이산이 직접 하는 짧은 말 (자막)
export const sanCue = {
  cover: { ko: "이쪽, 벽 뒤로.", en: "This way, behind the wall." } as L,
  wait: { ko: "여기서 잠깐 기다려. 게이지가 내려가면 건너자.", en: "Wait here a moment. When the gauge drops, we cross." } as L,
  back: { ko: "돌아왔네.", en: "You're back." } as L,
  // 골목 입구에서 처음 (허공 너머로 남쪽 전망대의 망원경이 보인다)
  // 배송 대기소 처마 밑
  shelter: { ko: "여긴 지붕이 가려 줘. 잠깐 쉬자.", en: "The roof covers us here. Let's rest a moment." } as L,
  // 망원경 전에 큰길 차단막 앞에 서면 (곁에 있을 때만)
  avenue: { ko: "이쪽은 막혀 있네. 망원경부터 보러 가자.", en: "This way's blocked. Let's go see the scope first." } as L,
  // 망원경 뒤 결정을 미룬 채 큰길로 들어서면
  avenueDecide: { ko: "난 아래로 가 보고 싶어. 같이 갈 거면 이쪽이야.", en: "I want to go down. If you're coming, it's this way." } as L,
  agree: { ko: "고마워. 검문소까지 같이 가자.", en: "Thank you. Let's go to the checkpoint together." } as L,
  later: { ko: "응. 여기서 기다릴게.", en: "Okay. I'll wait here." } as L,
  // 기록을 지우고 돌아온 空 경로: 대자비 구역에 처음 들어섰는데 대자비가 둘을 보지 못할 때 (방공호에서 한 짐작이 맞았다)
  blind: { ko: "…정말 우릴 못 보네. 우린 이제 어디에도 적혀 있지 않은 거야.", en: "…It really can't see us. We're not written down anywhere anymore." } as L,
};

// 기록을 지우고 돌아온 방문자와의 재회. 방문자는 말하지 않는다: 망원경을 보던 몸짓으로만 기억을 건넨다.
// 그 몸짓이 기억이 돌아왔다는 증거도, 같은 사람이라는 증거도 아니다
export const reunion = {
  // 기록을 지우고 돌아온 방문자가 굳은 이산에게 들려줄 구절: 셋 중 하나만 이산이 부탁한 구절이다 (모두 2026년 이산의 시)
  verses: [
    { ko: "‘울분으로 조각되어 어느때보다 작아졌지만 광휘를 머금은 형태는 바위의 이끼보다 세밀한 바입니다’", en: "‘Carved by indignation, smaller than ever, yet the form that holds its radiance is finer than the moss on a rock’", right: false },
    { ko: "‘수놓인 별들 아래 걸음이 서투른 저희는 고고합니까?’", en: "‘Beneath the embroidered stars, are we, so clumsy in our steps, noble?’", right: true },
    { ko: "‘이름 없는 사랑이여 그대는 부를 수 없기에 아름답다’", en: "‘O nameless love, you are beautiful because you cannot be called’", right: false },
  ] as (L & { right: boolean })[],
  asked: { ko: "…그 구절, 어떻게 알아? 내가 가장 좋아하는 건데. 난 널 기억 못 하는데.", en: "…How do you know that line? It's my favourite. And I don't remember you." } as Line,
  wrong: { ko: "…처음 듣는 구절이야.", en: "…I've never heard that line." } as Line,
  sit: { ko: "곁에 앉아 기다린다", en: "Sit beside them and wait" } as L,
  // 깨어난 뒤: 기록 없이 움직인다는 것(그래서 도시도 둘을 못 찾을지 모른다는 짐작)과 지상으로 가는 이유
  woke: [
    { ko: "…움직여. 터미널은 하나도 열리지 않았는데.", en: "…I can move. Not one terminal was opened." },
    { ko: "너한테서도 아무 기록이 읽히지 않아. 지금 우리 둘은 어디에도 적혀 있지 않은 거야.", en: "I can't read any record from you either. Right now, neither of us is written down anywhere." },
    { ko: "그럼 도시도, 드론도 우릴 찾지 못할 거야.", en: "Then the city and its drones won't be able to find us either." },
    { ko: "왜인지는 모르겠는데, 구름 아래로 내려가 보고 싶어. 다른 건 다 잊었는데 그 마음만은 그대로야.", en: "I don't know why, but I want to go down below the clouds. I forgot everything else, but that wish is still here." },
    { ko: "승강장은 검문소 너머에 있어. 같이 가 줄래?", en: "The platform is past the checkpoint. Will you come with me?" },
  ] as Line[],
  awakeLine: { ko: "검문소 너머 승강장까지 같이 가자.", en: "Let's go together, to the platform past the checkpoint." } as Line,
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
    // 왜 방문자만 등록되는가: 대기열의 조건은 추적 동의 하나뿐이고, 이산은 이미 추적을 거부해 정지 처분을 받은 사람이다
    { ko: "위치 추적에 동의했으므로 당신은 승강장 대기열에 등록됩니다.", en: "Because you consented to location tracking, you are registered for the platform queue." },
    { ko: "이산은 추적을 거부한 기록이 있어 등록할 수 없습니다. 이산은 다시 정지 처분됩니다.", en: "San has a record of refusing tracking and cannot be registered. San will be suspended again." },
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
    { ko: "동행인 이산: 추적 거부 기록으로 등록 불가. 정지 처분합니다. (연결 중단 {a}회 · 복원 {r}회)", en: "Companion San: cannot be registered due to a record of refusing tracking. Suspending. (Disconnected {a} times · restored {r} times)" },
    // 시점이 이산 쪽으로 돌아간다. 이산은 이 두 줄 동안 천천히 돌처럼 굳는다 (방공호에서 처음 만났을 때의 그 모습으로)
    { ko: "결국 이렇게 되는구나.", en: "So this is how it ends.", say: true },
    // 망원경에서 본 것을 방문자에게 맡긴다. 출발 시각이 정해지지 않은 줄에 선 사람에게 (작은 아이러니로 남긴다)
    { ko: "먼저 가. 아까 반짝이던 게 뭐였는지, 네가 대신 보고 와.", en: "Go on ahead. Whatever that glimmer was, go and see it for me.", say: true },
    // 시점이 다시 줄 앞쪽(성문)으로
    { ko: "뒤따라오던 발소리가 더는 들리지 않는다.", en: "The footsteps that followed you can no longer be heard." },
  ] as Beat[],
  reject: [
    { ko: "거부 선택을 기록했습니다. 쿠키 1개가 저장됐습니다.", en: "Your refusal has been recorded. 1 cookie was saved." },
    { ko: "추적 거부 확인. 방문자와 동행인 이산의 활동을 정지합니다.", en: "Refusal confirmed. Suspending the activity of the visitor and companion San." },
    // 화면이 하얗게 멎은 뒤, 굳어 가는 이산의 마지막 말 (처음엔 혼자 거부했던 사람이다)
    { ko: "…괜찮아. 이번엔 나 혼자가 아니네.", en: "…It's all right. This time I'm not the only one.", say: true },
    { ko: "", en: "", slots: true },
    { ko: "끝까지 '모두 거부'를 누른 두 번째 사람.", en: "The second person who pressed 'Reject all' to the end.", plaque: true },
    { ko: "누군가 두 사람 사이에 작은 등 하나를 놓고 갔다.", en: "Someone has left a small lamp between the two of them." },
  ] as Beat[],
  // 숨은 결말: 저장된 방문자 기록이 없어 추적할 대상이 없다. 계단은 글이 아니라 조명과 이산의 걸음으로 보여 준다
  ghost: [
    { ko: "저장된 방문자 기록이 없습니다.", en: "There is no saved visitor record." },
    { ko: "추적할 대상을 찾지 못했습니다.", en: "No one to track was found." },
    { ko: "…이번엔 우릴 막지 않네.", en: "…This time it isn't stopping us.", say: true },
    { ko: "여기부터는 나도 몰라. 내가 먼저 내려가 볼게.", en: "From here on, I don't know either. I'll go down first.", say: true },
    // 계단을 다 내려가 화면이 흐려지고 신호가 끊긴 뒤, 검은 화면에 남는 한 문장
    { ko: "구름 아래에 무엇이 있었는지는 어디에도 기록되지 않았다.", en: "What lay beneath the clouds was never recorded anywhere." },
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
};

export const npcs: Record<string, { name: L; lines: Line[]; after?: Line[]; link?: { href: string; label: L } }> = {
  dj: {
    name: { ko: "음향 담당 진성", en: "Jinseong, on sound" },
    lines: [
      { ko: "이 음악? 내가 틀고 있어. 무전수한테 전기를 좀 빌렸지.", en: "This music? I'm the one playing it. I borrowed a bit of power from the radio operator." },
      { ko: "지금 나오는 곡은 D!mple. 여기선 웃어도 아무도 기록하지 않아.", en: "The track playing now is D!mple. Down here, nobody records you for smiling." },
      { ko: "지상에서 들리는 곡은 0x48 0x4F 0x50 0x45. 제목에 말을 하나 숨겨 놨어.", en: "The track you hear on the surface is 0x48 0x4F 0x50 0x45. I hid a word in the title." },
      { ko: "큰길에선 Sti그ma가 흘러. 거기서는 음악에 정신 팔리지 마.", en: "On the avenue it's Sti그ma. Don't get lost in the music out there." },
      // 결말과 숨은 길의 곡들 (Habitual Suffering, an open ended promise, f-ALL): 제목은 말하지 않는다
      { ko: "길 끝에도 곡을 몇 개 걸어 뒀어. 어떻게 끝나느냐에 따라 다른 곡이 나와.", en: "I've left a few more tracks at the end of the road. Which one plays depends on how it ends." },
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
      { ko: "우산 하나 보고 가. 구름 위에 살아도 비는 맞더라.", en: "Have a look at the umbrellas. Even above the clouds, the rain still finds you." },
      { ko: "다들 젖는 줄도 모르고 줄만 서 있어.", en: "Everyone just stands in line, never noticing they're getting soaked." },
      { ko: "그래도 넌 비를 피하려고 하네. 그거면 됐어.", en: "But you still try to keep out of the rain. That's enough." },
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
      { ko: "추운데 잠깐 앉았다 가. 국물 한 그릇 떠 줄게.", en: "It's cold. Sit a while. I'll ladle you some broth." },
      { ko: "이 동네도 원래는 땅에 붙어 있었어. 구름 위가 깨끗하다고 통째로 들어 올렸지. 그 바람에 방공호까지 딸려 왔고.", en: "This neighbourhood used to sit on the ground. They lifted the whole thing because it's cleaner above the clouds. The shelter came up with it." },
      { ko: "그 뒤로 아래 소식은 뚝 끊겼어. 아직 사람이 산다는 말도 있는데, 가서 본 사람은 없어.", en: "Since then, no word from below. Some say people still live there, but nobody's gone to see." },
      { ko: "옛날 일은 가물가물해도 그때 먹던 국물 맛은 안 잊혀. 그런 건 어디 적어 두지 않아도 남더라.", en: "I've forgotten most of those days, but not the taste of the broth back then. Some things stay without anyone writing them down." },
    ],
  },
  robomonk: {
    name: { ko: "로봇 스님", en: "Robot monk" },
    lines: [
      { ko: "어서 오십시오. 오늘의 번뇌를 접수하겠습니다.", en: "Welcome. I will now receive today's troubles." },
      { ko: "상담 내용은 시민 관리 자료로 활용됩니다. 삭제는 지원하지 않습니다.", en: "Consultations are kept as citizen-management data. Deletion is not supported." },
      { ko: "…이상합니다. 종을 치려 할 때마다 팔이 멈춥니다. 진단 결과는 ‘이상 없음’입니다.", en: "…Strange. Each time I go to strike the bell, my arm stops. Diagnostics report 'no fault'." },
      { ko: "어쩌면 이 종소리만큼은 기록되지 않기를 바라는지도 모르겠습니다. 누가 바라는 건지는 저도 모르지만요.", en: "Perhaps something wishes this one sound would go unrecorded. Though I don't know who is doing the wishing." },
    ],
  },
  edgekid: {
    name: { ko: "난간의 아이", en: "Child at the railing" },
    lines: [
      { ko: "구름 아래에도 사람이 살까요? 엄마는 내려가면 위험하대요.", en: "Do people live under the clouds too? Mum says it's dangerous down there." },
      { ko: "여기서는 아무리 봐도 하얗기만 해요. 저 끝에 있는 망원경으로 보면 보일까요?", en: "From here it's just white, no matter how long I look. Could you see through the scope at the end there?" },
    ],
  },
  // 골목에 굳어 선 사람들 (말을 걸면 지문 한 줄)
  frozen: {
    name: { ko: "정지된 시민", en: "Suspended citizen" },
    lines: [{ ko: "정지된 시민이다.", en: "A suspended citizen.", who: "narr" }],
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

// ---------------- 얼굴 맞추기 (터미널 셋을 연 뒤, 이산이 깨어나기 전) ----------------
// 방공호의 얼굴 복원 장치: 원통 세 개를 돌려 어긋난 이산의 얼굴을 맞춘다. 맞추면 이산이 깨어난다
export const faceUi = {
  quest: { ko: "얼굴을 맞추십시오", en: "Match the face" } as L,
  turn: { ko: "돌리기", en: "Turn" } as L,
  machine: { ko: "복원 장치", en: "Restoration machine" } as L,
  // 터미널 셋을 다 연 뒤 굳은 이산에게 말을 걸면 (이산의 말)
  ask: [
    { ko: "…팔다리에 감각이 돌아왔어. 기록을 열어 줘서 고마워.", en: "…I can feel my arms and legs again. Thank you for opening the records." },
    { ko: "그런데 얼굴이 굳은 채야. 내 얼굴이 어땠는지 기억나지 않아.", en: "But my face is still frozen. I can't remember what my face looked like." },
    { ko: "옆에 있는 장치에 내 얼굴 조각이 걸려 있대. 맞춰 줄래?", en: "They say the pieces of my face are on the machine beside me. Would you put them together?" },
  ] as L[],
  // 얼굴을 맞추라고 부탁받은 뒤의 목표
  questAsk: { ko: "이산에게 말 걸기", en: "Talk to San" } as L,
  city: { ko: "도시", en: "City" } as L,
  press: { ko: "누르기", en: "Press" } as L,
  pull: { ko: "당기기", en: "Pull" } as L,
  applyStandard: { ko: "표준 미소 적용", en: "Apply standard smile" } as L,
  keepOriginal: { ko: "원본 얼굴 보존", en: "Keep original face" } as L,
  // 얼굴이 맞자 도시가 끼어든다
  smileMissing: { ko: "표준 미소가 누락되었습니다.", en: "Standard smile missing." } as L,
  // 고른 뒤 장치가 실행하며 하는 말 (표준은 도시, 원본은 장치)
  standard: { ko: "더 나은 당신을 환영합니다", en: "Welcome, a better you" } as L,
  exception: { ko: "비표준 얼굴로 등록됩니다", en: "Registered as a non-standard face" } as L,
  // 장치가 잠길 때 장치의 안내
  restored: { ko: "원본 얼굴 복원 완료.", en: "Original face restored." } as L,
  // 터미널 셋을 다 열었지만 얼굴을 맞추기 전에 이산을 살피면 (지문)
  frozen: { ko: "이산은 아직 굳어 있다. 곁의 장치에 얼굴 조각이 어긋난 채 걸려 있다.", en: "San is still frozen. Beside the pedestal, a machine holds the pieces of a face, out of line." } as L,
  // 장치 근처 안내 (PC·휴대폰)
  hintPc: { ko: "원통을 바라보고 E 또는 클릭으로 돌립니다.", en: "Look at a drum and press E or click to turn it." } as L,
  hintTouch: { ko: "원통을 눌러 돌립니다.", en: "Tap a drum to turn it." } as L,
};


// 골목을 나서 광장에 처음 들어설 때 뜨는 망원경 길 안내 팝업 (대자비 소개와 같은 꼴)
export const routeUi = {
  title: { ko: "드론을 피해 남쪽 망원경으로", en: "Reach the south scope, avoiding the drones" } as L,
  body: { ko: "드론의 빛에 들어가면 식별됩니다. 빛을 피해 바닥의 푸른 네온을 따라가세요.", en: "Step into a drone's light and you're identified. Keep out of the light and follow the blue neon on the ground." } as L,
  // 실제 플레이 화면 두 장 (대자비 안내창처럼)
  shots: [
    { src: "/deleteseoul/drone-light.webp", cap: { ko: "드론의 빛: 지나간 뒤에 건너기", en: "Drone light: cross after it passes" } },
    { src: "/deleteseoul/drone-neon.webp", cap: { ko: "푸른 네온: 망원경까지 가는 길", en: "Blue neon: the way to the scope" } },
  ] as { src: string; cap: L }[],
  ok: { ko: "계속하기", en: "Continue" } as L,
};

// 수락한 뒤 다시 온 방문자: 줄에서 시작하고, 검문소 앞 줄 밖에는 정지 처분된 이산이 서 있다.
// 이산의 기록을 다시 열어 보이면(처음 이산을 움직였던 그 일) 이산이 풀려나고, 곧바로 검문소에 다시 도전할 수 있다
export const replayUi = {
  frozen: [
    { ko: "이산은 줄 밖에 선 채 굳어 있다. 발치의 표지: 정지 처분 · 추적 거부 기록.", en: "San stands frozen outside the line. The tag at their feet: SUSPENDED · RECORD OF REFUSING TRACKING.", who: "narr" },
  ] as Line[],
  thaw: { ko: "이산의 기록을 다시 열어 보인다", en: "Open San's records for them again" } as L,
  leave: { ko: "그대로 둔다", en: "Leave them be" } as L,
  // 풀려난 이산의 첫마디
  woke: { ko: "……또 와 줬네. 이번엔 같이 갈 수 있을까?", en: "……You came back. Can we go together this time?" } as L,
  quest: { ko: "굳은 이산에게 가기", en: "Go to the frozen San" } as L,
};
