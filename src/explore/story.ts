// DELETE SEOUL의 모든 문구. 대사를 바꾸고 싶으면 이 파일만 고치면 됩니다.
import type { L } from "@/data/site";

export const plaque: L[] = [
  { ko: "이산 (보관 처리됨)", en: "SAN LEE (ARCHIVED)" },
  { ko: "끝까지 '모두 거부'를 누른 자", en: "The One Who Pressed 'Reject All' to the End" },
  {
    ko: "2087년 서울에서 모든 쿠키를 거부한 유일한 시민.",
    en: "The only citizen of Seoul, 2087, who rejected every single cookie.",
  },
  {
    ko: "추적할 수 없게 되자, 시스템은 이 시민을 '보관 처리'했다. 남은 사람들이 동상을 이곳 지하로 옮겨 왔다.",
    en: "Unable to track them, the system archived them. The few who remained carried the statue down here.",
  },
];

export const ui = {
  title: { ko: "DELETE SEOUL", en: "DELETE SEOUL" },
  introLines: [
    { ko: "2087년, 지상은 기계가 관리합니다. 모든 시민은 매 순간 동의하고, 기록되고, A부터 F까지 등급이 매겨집니다.", en: "2087. The surface is managed by machines. Every citizen consents, is logged and graded from A to F, every second." },
    { ko: "여기는 지하 40m, 방공호 B-7. 시스템이 지우려 한 한 사람의 기록이 숨겨져 있습니다.", en: "This is Shelter B-7, forty metres underground, where the record of one erased person is hidden." },
    { ko: "터미널을 열어 기록을 복원하고, 원한다면 지상으로 올라가 보세요. 고개는 숙이고요.", en: "Open the terminals to restore the record, and go up to the surface if you dare. Keep your head down." },
  ] as L[],
  start: { ko: "방공호로 들어가기", en: "Enter the shelter" },
  goBack: { ko: "돌아가기", en: "Go back" },
  hintPc: { ko: "화면을 클릭하면 다시 마우스로 둘러볼 수 있어요", en: "Click the screen to look with the mouse again" },
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
  restored: { ko: "기록 조각이 동상으로 돌아갔어요", en: "A fragment returned to the statue" },
  noWebgl: {
    ko: "이 기기에서는 3D 도시를 열 수 없어요. 대신 일반 웹사이트로 안내할게요.",
    en: "This device can't open the 3D city, so here's the regular website instead.",
  },
  popup: { ko: "이 도시는 시민을 추적하기 위해 쿠키를 사용합니다.", en: "This city uses cookies to track its citizens." },
  accept: { ko: "모두 수락", en: "Accept all" },
  reject: { ko: "모두 거부", en: "Reject all" },
  plaqueShort: { ko: "끝까지 '모두 거부'를 누른 자", en: "The One Who Rejected All" },
  toPortfolio: { ko: "웹사이트로 가기", en: "Go to the website" },
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
  welcomeB: { ko: "어서 오세요, B등급 시민.", en: "Welcome, Grade B citizen." },
};

// 백업 로그 (구역 이름 아래 한 줄)
export const backupUi = {
  noSignal: { ko: "BACKUP · 신호 없음", en: "BACKUP · NO SIGNAL" },
  none: { ko: "BACKUP · 대기 중", en: "BACKUP · STANDBY" },
  deleted: { ko: "BACKUP · 기록 없음", en: "BACKUP · NO RECORD" },
  saved: { ko: "● 백업 #{n} 저장됨", en: "● BACKUP #{n} SAVED" },
};

// Esc 설정창. 시스템이 방문자에게 직접 말을 건다 (제4의 벽)
export const pause = {
  title: { ko: "일시정지됨", en: "PAUSED" },
  sub: { ko: "…라고 생각하시겠지만, 도시는 멈추지 않았습니다.", en: "…or so you think. The city did not stop." },
  resume: { ko: "도시로 돌아가기", en: "Return to the city" },
  sens: { ko: "마우스 감도", en: "Mouse sensitivity" },
  sensNote: { ko: "당신의 손이 얼마나 예민한지 기록 중입니다.", en: "We are logging how sensitive your hand is." },
  bob: { ko: "걸을 때 화면 흔들림", en: "Head bob when walking" },
  lang: { ko: "언어", en: "Language" },
  humanity: { ko: "인간성", en: "Humanity" },
  humanityNote: { ko: "관리자에 의해 잠김", en: "Locked by administrator" },
  freeWill: { ko: "자유 의지", en: "Free will" },
  freeWillNo: { ko: "이 설정은 이미 당신 대신 결정되었습니다.", en: "This setting has already been decided for you." },
  cookies: { ko: "쿠키 설정", en: "Cookie preferences" },
  cookiesNo: { ko: "모든 쿠키는 이미 수락되었습니다. 수정하시겠습니까? [예] [예]", en: "All cookies have already been accepted. Change? [Yes] [Yes]" },
  reset: { ko: "방문 기록 지우기", en: "Erase my visit" },
  resetNote: { ko: "지웠습니다. 우리는 기억합니다.", en: "Erased. We remember." },
  leave: { ko: "로그아웃", en: "Log out" },
  bunker: { ko: "방공호로 돌아가기", en: "Back to the shelter" },
  bunkerNote: { ko: "배전실 7-B의 문은 아무도 모르게 다시 닫힙니다.", en: "The door of Substation 7-B closes again, unnoticed." },
  backups: { ko: "백업 기록", en: "Backups" },
  backupEmpty: { ko: "기록 없음", en: "None" },
  backupDelete: { ko: "백업 삭제", en: "Delete backups" },
  backupDenied: { ko: "권한 없음. 신호가 닿지 않는 곳에서 다시 시도하십시오.", en: "Permission denied. Try again somewhere the signal cannot reach." },
  backupDeleted: { ko: "백업을 지웠습니다. 이제 당신은 한 번뿐입니다.", en: "Backups deleted. From now on, there is only one of you." },
  on: { ko: "켬", en: "On" },
  off: { ko: "끔", en: "Off" },
};

// 설정창 아래에 흐르는 문장. {time} {min} {w} {h} 는 실제 값으로 바뀝니다.
export const fourthWall: L[] = [
  { ko: "지금 당신의 시각은 {time}. 이 도시에 {min}분째 머물고 있습니다.", en: "Your local time is {time}. You have been in this city for {min} min." },
  { ko: "당신을 비추는 창의 크기는 {w}×{h}. 그 바깥에도 방이 있겠죠. 불은 켜져 있나요?", en: "The window you are looking through is {w}×{h}. There's a room around it, isn't there? Is the light on?" },
  { ko: "Esc를 누른다고 나갈 수 있는 건 아닙니다. 하지만 좋은 시도였습니다.", en: "Pressing Esc does not let you leave. But it was a good try." },
  { ko: "마우스에서 손을 뗀 3초 동안, 당신은 아무것에도 동의하지 않았습니다. 기분이 어땠나요?", en: "For the three seconds your hand left the mouse, you consented to nothing. How did it feel?" },
  { ko: "당신의 브라우저에 저장된 당신: {copy}번째 사본.", en: "The you stored in your browser: copy no. {copy}." },
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
  deadTitle: { ko: "보관 처리되었습니다", en: "YOU HAVE BEEN ARCHIVED" },
  deadSub: { ko: "자비는 언제나 공정합니다. 처음 위치에서 다시 시작합니다.", en: "Mercy is always fair. Restarting from the last position." },
  restoreFrom: { ko: "백업 #{n}에서 복원 · 잃은 기억 {t}", en: "Restored from backup #{n} · memory lost {t}" },
  restoreFresh: { ko: "초기 기록에서 복원 · 잃은 기억 {t}", en: "Restored from the initial record · memory lost {t}" },
  cost: { ko: "복원 비용은 당신의 등급에서 차감됩니다.", en: "The cost of restoration is deducted from your grade." },
  noBackup: { ko: "복원할 백업이 없습니다.", en: "There is no backup to restore." },
  noBackupSub: { ko: "처음부터 다시 시작합니다.", en: "Starting again from the beginning." },
};

// 화면 위쪽 퀘스트 화살표에 붙는 짧은 목표
export const quest = {
  terminal: { ko: "기록 복원", en: "Restore the record" },
  statue: { ko: "동상에게 말 걸기", en: "Talk to the statue" },
  san: { ko: "이산에게 말 걸기", en: "Talk to San" },
  exit: { ko: "지상으로", en: "To the surface" },
  checkpoint: { ko: "검문소", en: "Checkpoint" },
  back: { ko: "방공호로 돌아가기", en: "Back to the shelter" },
  plaza: { ko: "광장으로 나가기", en: "Out to the plaza" },
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
// 한 번이라도 보관 처리됐다면 지상의 이산이 덧붙이는 말
export const sanAfterDeath: L = { ko: "너는 몇 번이고 돌아오잖아. 부럽지는 않아. 그건 지켜보고 있다는 뜻이니까.", en: "You keep coming back, again and again. I'm not jealous. It means they're watching." };

// 한 번이라도 보관 처리된 뒤 방공호 관리인이 처음 하는 말
export const keeperAfterDeath: L = { ko: "또 왔네. 지난번이랑 똑같은 얼굴로. 흉터 하나 없이.", en: "Back again. Same face as last time. Not a single scar." };

export type Beat = L & { say?: boolean; slots?: boolean; plaque?: boolean };

export const checkpoint = {
  locked: [
    { ko: "[검문소] 시민 등급 확인 불가. 통과할 수 없습니다.", en: "[CHECKPOINT] Citizen grade unavailable. You may not pass." },
    { ko: "…어딘가에 당신을 기억하는 기록이 있다면, 다시 오십시오.", en: "…If there is a record somewhere that remembers you, come back." },
  ] as L[],
  title: { ko: "마지막 동의 요청", en: "FINAL CONSENT REQUEST" },
  body: {
    ko: "서울은 시민의 더 나은 삶을 위해 쿠키를 사용합니다. 동의하면 다시는 묻지 않겠습니다.",
    en: "Seoul uses cookies for a better life for its citizens. Consent, and you will never be asked again.",
  },
  // 결말 대본: say = 이산의 말, slots = 백업 번호가 지워지는 화면, plaque = 표석. {a} 보관 횟수, {r} 복원 횟수
  accept: [
    { ko: "동의해 주셔서 감사합니다.", en: "Thank you for your consent." },
    { ko: "당신의 등급은 B입니다. 줄에 서 주십시오.", en: "Your grade is B. Please join the line." },
    { ko: "괜찮아. 돌아올 수 있는 건 너니까.", en: "It's all right. You're the one who can come back.", say: true },
    { ko: "당신은 {a}번 보관되고 {r}번 복원되었습니다.", en: "You were archived {a} times and restored {r} times." },
    { ko: "이제 다시는 죽지 않습니다. 대신 다시는 아무것도 묻지 않습니다.", en: "You will never die again. Instead, you will never ask anything again." },
  ] as Beat[],
  reject: [
    { ko: "추적 불가. 백업을 삭제합니다.", en: "Untrackable. Deleting backups." },
    { ko: "", en: "", slots: true },
    { ko: "끝까지 '모두 거부'를 누른 두 번째 사람.", en: "The second person who pressed 'Reject all' to the end.", plaque: true },
    { ko: "이번에는 혼자가 아니었다.", en: "This time, they were not alone." },
    { ko: "이 결말은 저장되지 않습니다. 당신이 거부했으니까.", en: "This ending will not be saved. Because you refused." },
  ] as Beat[],
  ghost: [
    { ko: "[검문소] 시민 기록 없음.", en: "[CHECKPOINT] No citizen record." },
    { ko: "존재하지 않는 시민에게는 동의를 구할 수 없습니다.", en: "Consent cannot be requested from a citizen who does not exist." },
    { ko: "문이 열린다.", en: "The gate opens." },
    { ko: "대자비는 눈을 뜬 채 멈춰 있다. 아무도 보이지 않는다.", en: "The Great Compassion stands still, eyes open. It sees no one." },
    { ko: "보이지 않는 게, 자유였구나.", en: "So being unseen was freedom.", say: true },
  ] as Beat[],
  slotErased: { ko: "삭제됨", en: "DELETED" },
  noSlots: { ko: "백업 없음", en: "NO BACKUPS" },
  again: { ko: "처음부터 다시", en: "Start over" },
  reconnect: { ko: "다시 접속", en: "Reconnect" },
  toPortfolio: { ko: "로그아웃", en: "Log out" },
  endingAccept: { ko: "결말: 수락", en: "ENDING: ACCEPT" },
  endingReject: { ko: "결말: 거부", en: "ENDING: REJECT" },
  endingGhost: { ko: "숨은 결말: 空", en: "HIDDEN ENDING: 空" },
};

// after: 이산이 석상에서 풀려난 뒤(터미널 셋 복원)의 대사. 없으면 같은 대사를 쓴다
export const npcs: Record<string, { name: L; lines: L[]; after?: L[] }> = {
  keeper: {
    name: { ko: "방공호 관리인", en: "Shelter keeper" },
    lines: [
      { ko: "어서 와. 여기까지는 시스템 신호가 안 닿아. 쿠키도, 등급도 없어.", en: "Welcome. The system's signal doesn't reach this deep. No cookies, no grades." },
      { ko: "가운데 동상 봤지? 우리가 지상에서 몰래 옮겨 왔어. 터미널을 열면 저 사람이 조금씩 돌아와.", en: "Seen the statue? We smuggled it down from the surface. Open the terminals and they'll come back, bit by bit." },
      { ko: "지상에 올라가 보고 싶으면 저 뒤 방폭문으로 나가. 올라가면 골목 끝 배전실 문으로 나올 거야. 카메라랑 눈은 마주치지 말고.", en: "Want to see the surface? Take the blast door behind me. You'll come out through a substation door at the end of an alley. Don't make eye contact with the cameras." },
      { ko: "아, 그리고 놀라지 마. 위는… 이제 땅이 아니야.", en: "Oh, and don't panic. Up there… it isn't ground any more." },
    ],
    after: [
      { ko: "봤어? 동상이 일어났어. 몇 년을 저렇게 앉아 있었는데.", en: "Did you see? The statue stood up. Years, it sat like that." },
      { ko: "이산이 지상에 올라가겠대. 혼자 보내긴 싫고… 네가 같이 가 주면 좋겠어.", en: "San says they're going up to the surface. I don't want them going alone… I'd like you to go with them." },
      { ko: "방폭문은 저 뒤야. 올라가면 골목 끝 배전실 문으로 나와. 카메라랑 눈은 마주치지 말고.", en: "The blast door's behind me. You'll come out through a substation door at the end of an alley. Don't make eye contact with the cameras." },
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
      { ko: "가운데 동상에게 가 보게. 혼자 굳어 있는 건 그 사람 잘못이 아니야.", en: "Go to the statue in the middle. Being frozen alone was never their fault." },
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
  { ko: "[중앙 관리 AI] 자비는 공정합니다. 보관된 시민은 모두 복원됩니다. 복원할 수 없는 시민은 존재하지 않습니다.", en: "[CENTRAL AI] Mercy is fair. Every archived citizen is restored. A citizen who cannot be restored does not exist." },
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
