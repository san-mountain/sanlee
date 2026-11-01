// 사이트의 모든 내용은 이 파일 하나에서 관리합니다.
// 일반 포트폴리오 페이지와 /explore 3D 도시가 둘 다 이 데이터를 읽어요.
// 각 문장은 { ko: 한국어, en: 영어 } 쌍으로 적어 주세요.

export type Lang = "ko" | "en";
export type L = { ko: string; en: string };
export type SectionId = "about" | "works" | "contact";

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
  year: string;
  medium: L;
  description: L;
  link?: string;
  image?: string; // public/works/ 폴더에 넣은 사진 경로, 예: "/works/drawing.jpg"
};

export const works: Work[] = [
  {
    title: { ko: "나의 [나]들을 위한 드로잉", en: "A Drawing for My [Selves]" },
    year: "2026",
    medium: { ko: "드로잉, 콜라주, QR, 웹", en: "Drawing, collage, QR code, web" },
    description: {
      ko: "린 허쉬만 리슨의 《나의 [나]들》에서 출발한 작업. 드로잉 속 QR 코드는 이 사이트의 3D 도시로 이어진다.",
      en: "A work that begins with Lynn Hershman Leeson's exhibition at SeMA. The QR code in the drawing leads into this site's 3D city.",
    },
    link: "/explore",
  },
  {
    title: { ko: "작업 제목 2", en: "Work title 2" },
    year: "2026",
    medium: { ko: "재료", en: "Medium" },
    description: { ko: "작업 설명을 적어 주세요.", en: "Describe the work here." },
  },
  {
    title: { ko: "작업 제목 3", en: "Work title 3" },
    year: "2025",
    medium: { ko: "재료", en: "Medium" },
    description: { ko: "작업 설명을 적어 주세요.", en: "Describe the work here." },
  },
];

export const contact = {
  email: "hello@sanlee.kr",
  links: [{ label: "Instagram", href: "https://instagram.com/" }],
};

export const sections: { id: SectionId; label: string; labelKo: string; href: string }[] = [
  { id: "about", label: "About", labelKo: "소개", href: "/about" },
  { id: "works", label: "Works", labelKo: "작업", href: "/works" },
  { id: "contact", label: "Contact", labelKo: "연락처", href: "/contact" },
];

// 화면에 고정으로 나오는 짧은 문구들
export const ui = {
  explore: { ko: "Explore ↗", en: "Explore ↗" },
  exploreCta: { ko: "이 사이트를 도시로 탐험하기 ↗", en: "Explore this site as a city ↗" },
  viewWork: { ko: "작품 보기 ↗", en: "View work ↗" },
};
