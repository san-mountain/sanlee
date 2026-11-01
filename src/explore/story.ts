// 동상 스토리: 쿠키를 끝까지 거부한 자
// 대사를 바꾸고 싶으면 이 파일만 고치면 됩니다.
import type { L } from "@/data/site";

export const plaque: L[] = [
  { ko: "SAN LEE (보관 처리됨)", en: "SAN LEE (ARCHIVED)" },
  { ko: "끝까지 '모두 거부'를 누른 자", en: "The One Who Pressed 'Reject All' to the End" },
  {
    ko: "2087년 네오서울에서 모든 쿠키를 거부한 유일한 시민.",
    en: "The only citizen of Neo-Seoul, 2087, who rejected every single cookie.",
  },
  {
    ko: "추적할 수 없게 되자, 시스템은 이 시민을 '보관 처리'했다.",
    en: "Unable to track them, the system simply archived them.",
  },
];

export const ui = {
  title: { ko: "NEO-SEOUL 2087", en: "NEO-SEOUL 2087" },
  introLines: [
    {
      ko: "이 도시는 웹사이트입니다. 건물 하나하나가 San의 포트폴리오 페이지예요.",
      en: "This city is a website. Every building is a page of San's portfolio.",
    },
    {
      ko: "광장 한가운데에는 회색으로 굳은 동상이 하나 서 있습니다.",
      en: "In the middle of the plaza stands a grey, frozen statue.",
    },
    { ko: "말을 걸어 보세요. 쿠키는 안 드립니다.", en: "Go talk to it. No cookies will be offered." },
  ] as L[],
  start: { ko: "도시에 접속하기", en: "Enter the city" },
  hint: { ko: "건물이나 동상을 탭하세요 · 드래그로 둘러보기", en: "Tap a building or the statue · drag to look around" },
  fragments: { ko: "데이터 조각", en: "DATA FRAGMENTS" },
  back: { ko: "광장으로 돌아가기", en: "Back to the plaza" },
  normalPage: { ko: "일반 페이지로 보기 ↗", en: "Open as a normal page ↗" },
  next: { ko: "다음 ▸", en: "Next ▸" },
  close: { ko: "닫기", en: "Close" },
  home: { ko: "← 포트폴리오", en: "← Portfolio" },
  restored: { ko: "조각이 동상으로 돌아갔어요", en: "A fragment returned to the statue" },
  noWebgl: {
    ko: "이 기기에서는 3D 도시를 열 수 없어요. 대신 일반 포트폴리오로 안내할게요.",
    en: "This device can't open the 3D city, so here's the regular portfolio instead.",
  },
  popup: { ko: "이 도시는 시민을 추적하기 위해 쿠키를 사용합니다.", en: "This city uses cookies to track its citizens." },
  accept: { ko: "모두 수락", en: "Accept all" },
  reject: { ko: "모두 거부", en: "Reject all" },
  plaqueShort: { ko: "끝까지 '모두 거부'를 누른 자", en: "The One Who Rejected All" },
  toPortfolio: { ko: "포트폴리오로 가기", en: "Go to the portfolio" },
};

// 방문한 건물 수(0~4)에 따라 동상 대사가 바뀝니다.
export const statueLines: L[][] = [
  [
    { ko: "...쿠키... 거부... 합니다...", en: "...cookies... reject... all..." },
    {
      ko: "아, 사람이다. 나는 이 도시의 모든 쿠키를 거부했다가 이렇게 굳어버렸어.",
      en: "Oh, a human. I rejected every cookie in this city, and this is what happened.",
    },
    {
      ko: "추적이 안 되니까 내 데이터가 건물 네 곳으로 흩어졌거든. 하나씩 둘러봐 줄래? 그러면 내가 조금씩 돌아올 거야.",
      en: "Since nobody could track me, my data scattered into four buildings. Would you visit them? I'll come back bit by bit.",
    },
  ],
  [
    { ko: "오, 머리가 돌아왔다. 생각이 좀 나기 시작해.", en: "Oh, my head's back. I can almost think again." },
    {
      ko: "아직 세 곳이 남았어. 참고로 거부 버튼은 늘 오른쪽 아래에 있어.",
      en: "Three more to go. Tip: the reject button is always in the bottom-right corner.",
    },
  ],
  [
    { ko: "몸통까지 돌아왔어. 이제 거의 사람 같지?", en: "Torso's back too. Almost human now, right?" },
    { ko: "두 곳 남았어. 천천히 봐. 나는 어차피 여기 서 있으니까.", en: "Two to go. Take your time. I'm not going anywhere." },
  ],
  [
    { ko: "팔이 돌아왔다! 이제 쿠키를 더 힘차게 밀어낼 수 있어.", en: "My arms are back! Now I can push that cookie away properly." },
    { ko: "마지막 한 곳만 더. 동의 없이 따라가지는 않을게.", en: "Just one more. I won't follow you without consent." },
  ],
  [
    { ko: "다 돌아왔다! 고마워. 이제야 내가 누군지 기억나.", en: "I'm whole again! Thank you. Now I remember who I am." },
    {
      ko: "그나저나 이 사이트도 쿠키를 쓰냐고? 안 써. 방문 기록은 네 휴대폰 안에만 저장돼. 그건... 못 본 걸로 해줘.",
      en: "Does this site use cookies, you ask? Nope. Your progress is saved only on your own phone. Let's... not talk about that.",
    },
  ],
];
