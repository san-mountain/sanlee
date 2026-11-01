// 사이트의 모든 내용은 이 파일 하나에서 관리합니다.
// 일반 포트폴리오 페이지와 /explore 3D 도시가 둘 다 이 데이터를 읽어요.
// 각 문장은 { ko: 한국어, en: 영어 } 쌍으로 적어 주세요.

export type Lang = "ko" | "en";
export type L = { ko: string; en: string };
export type SectionId = "about" | "works" | "writing" | "contact";

export const profile = {
  name: "SAN LEE",
  tagline: {
    ko: "그림과 코드 사이에서 [나]들을 만드는 사람",
    en: "Making my [selves] somewhere between drawing and code",
  },
};

export const about = {
  paragraphs: [
    {
      ko: "안녕하세요, San입니다. 이 문단은 자기소개로 바꿔 주세요.",
      en: "Hi, I'm San. Replace this paragraph with your introduction.",
    },
    {
      ko: "관심 있는 것, 작업하는 방식, 지금 공부하고 있는 것을 두세 문장으로 적으면 좋아요.",
      en: "Two or three sentences on what you care about, how you work, and what you're studying now.",
    },
  ] as L[],
};

export type Work = {
  title: L;
  date: string; // 예: "2026. 10."
  medium: L;
  size: L;
  description?: L;
  link?: string;
  image?: string; // public/works/ 폴더의 WebP 경로
  width?: number; // 사진 원본 비율(레이아웃 흔들림 방지용)
  height?: number;
};

// 8절 종이: 세로 그림은 39.4\u00a0×\u00a027.2\u00a0cm, 가로 그림은 27.2\u00a0×\u00a039.4\u00a0cm (세로 × 가로)
const PAPER_LANDSCAPE: L = { ko: "8절, 27.2\u00a0×\u00a039.4\u00a0cm", en: "27.2\u00a0×\u00a039.4\u00a0cm" };
const PAPER_PORTRAIT: L = { ko: "8절, 39.4\u00a0×\u00a027.2\u00a0cm", en: "39.4\u00a0×\u00a027.2\u00a0cm" };

export const works: Work[] = [
  {
    title: { ko: "NEO-SEOUL 2087", en: "NEO-SEOUL 2087" },
    date: "2026. 11.",
    medium: { ko: "웹, 3D, 드로잉, 콜라주, QR 코드", en: "Web, 3D, drawing, collage, QR code" },
    size: { ko: "가변 크기", en: "Dimensions variable" },
    description: {
      ko: "린 허쉬만 리슨의 《나의 [나]들》에서 출발한 작업. 드로잉 속 QR 코드는 이 포트폴리오를 사이버펑크 도시로 바꾼 페이지로 이어지고, 광장에는 끝까지 쿠키를 거부한 '나'의 동상이 서 있다.",
      en: "A work that begins with Lynn Hershman Leeson's exhibition at SeMA. The QR code in the drawing leads to this portfolio rebuilt as a cyberpunk city, where a statue of the 'me' who rejected every cookie stands in the plaza.",
    },
    link: "/explore",
  },
  {
    title: { ko: "인간도(人間圖)", en: "Ingando (A Diagram of Humans)" },
    date: "2026. 10.",
    medium: { ko: "캔버스에 먹, 아크릴, 마커, 오일파스텔", en: "Ink, acrylic, marker and oil pastel on canvas" },
    size: { ko: "53.0\u00a0×\u00a045.5\u00a0cm", en: "53.0\u00a0×\u00a045.5\u00a0cm" },
    image: "/works/08-ingando.webp",
    width: 1087,
    height: 1400,
  },
  {
    title: { ko: "무력함", en: "Helplessness" },
    date: "2026. 10.",
    medium: { ko: "종이에 먹, 아크릴, 오일파스텔", en: "Ink, acrylic and oil pastel on paper" },
    size: PAPER_PORTRAIT,
    image: "/works/07-helplessness.webp",
    width: 984,
    height: 1400,
  },
  {
    title: { ko: "갈팡질팡", en: "Back and Forth" },
    date: "2026. 10.",
    medium: {
      ko: "종이에 아크릴, 오일파스텔, 파스텔, 혼합재료",
      en: "Acrylic, oil pastel, pastel and mixed media on paper",
    },
    size: PAPER_LANDSCAPE,
    image: "/works/06-wavering.webp",
    width: 1400,
    height: 953,
  },
  {
    title: { ko: "괴물", en: "Monster" },
    date: "2026. 10.",
    medium: { ko: "종이에 수채, 오일파스텔, 콜라주", en: "Watercolor, oil pastel and collage on paper" },
    size: PAPER_PORTRAIT,
    image: "/works/05-monster.webp",
    width: 960,
    height: 1400,
  },
  {
    title: { ko: "자화상", en: "Self-Portrait" },
    date: "2026. 10.",
    medium: {
      ko: "종이에 파스텔, 오일파스텔, 먹, 수채",
      en: "Pastel, oil pastel, ink and watercolor on paper",
    },
    size: PAPER_PORTRAIT,
    image: "/works/04-self-portrait.webp",
    width: 910,
    height: 1400,
  },
  {
    title: { ko: "인고의 고치", en: "Cocoon of Endurance" },
    date: "2026. 10.",
    medium: { ko: "종이에 수채, 먹", en: "Watercolor and ink on paper" },
    size: PAPER_PORTRAIT,
    image: "/works/03-cocoon.webp",
    width: 961,
    height: 1400,
  },
  {
    title: { ko: "방", en: "Room" },
    date: "2026. 9.",
    medium: { ko: "종이에 아크릴", en: "Acrylic on paper" },
    size: PAPER_LANDSCAPE,
    image: "/works/02-room.webp",
    width: 1400,
    height: 963,
  },
  {
    title: { ko: "가치 판단", en: "Value Judgment" },
    date: "2026. 9.",
    medium: { ko: "종이에 아크릴", en: "Acrylic on paper" },
    size: PAPER_LANDSCAPE,
    image: "/works/01-value-judgment.webp",
    width: 1400,
    height: 955,
  },
];

export const contact = {
  email: "hello@sanlee.kr",
  links: [{ label: "Instagram", href: "https://instagram.com/" }],
};

export const sections: { id: SectionId; label: string; labelKo: string; href: string }[] = [
  { id: "about", label: "About", labelKo: "소개", href: "/about" },
  { id: "works", label: "Works", labelKo: "작업", href: "/works" },
  { id: "writing", label: "Writing", labelKo: "글", href: "/writing" },
  { id: "contact", label: "Contact", labelKo: "연락처", href: "/contact" },
];

// 화면에 고정으로 나오는 짧은 문구들
export const ui = {
  explore: { ko: "Explore ↗", en: "Explore ↗" },
  exploreCta: { ko: "이 사이트를 도시로 탐험하기 ↗", en: "Explore this site as a city ↗" },
  viewWork: { ko: "작품 보기 ↗", en: "View work ↗" },
  poemsNote: { ko: "", en: "Poems are presented in their original Korean." },
};
