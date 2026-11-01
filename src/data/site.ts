// 사이트의 모든 내용은 이 파일 하나에서 관리합니다.
// 일반 포트폴리오 페이지와 /explore 3D 도시가 둘 다 이 데이터를 읽어요.
// 각 문장은 { ko: 한국어, en: 영어 } 쌍으로 적어 주세요.

export type Lang = "ko" | "en";
export type L = { ko: string; en: string };
export type SectionId = "about" | "works" | "writing" | "contact";

export const profile = {
  name: "SAN LEE",
  displayName: { ko: "이산", en: "SAN LEE" },
  tagline: {
    ko: "그림과 코드 사이에서 [나]들을 만드는 사람",
    en: "Making my [selves] somewhere between drawing and code",
  },
};

export const about = {
  paragraphs: [
    {
      ko: "이산은 동국대학교 조소과에 재학 중이며, 조각과 그림, 시를 오가며 작업한다.",
      en: "San Lee is a sculpture student at Dongguk University who moves between sculpture, painting and poetry.",
    },
    {
      ko: "삶은 끝을 향해 조금씩 기운다. 인간의 유한함은 남은 선택들에 무게를 싣는다. 작가에게 의미란 거창한 성취보다, 주어진 조건 안에서 스스로를 배반하지 않는 선택을 거듭하는 데에 있다.",
      en: "Life leans, little by little, toward its end. Human finitude lends weight to the choices that remain. For San, meaning lies less in grand achievement than in making, again and again, choices that do not betray oneself within the conditions one is given.",
    },
    {
      ko: "그러나 작가는 신념의 자율성을 순진하게 믿지 않는다. 사유는 신체의 화학 앞에서 쉽게 무력해지고, 의지는 생각보다 자주 그 바깥의 것에 기대어 선다. 작업은 그 무력함을 부정하지 않은 채, 그럼에도 끝내 남는 것이 무엇인지를 더듬어 간다.",
      en: "Yet San does not naively trust the autonomy of conviction. Thought is easily disarmed by the chemistry of the body, and the will leans on what lies outside it more often than we admit. Without denying that helplessness, the work feels its way toward what still remains.",
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
    image: "/works/sanlee_2026_ingando.webp",
    width: 1087,
    height: 1400,
  },
  {
    title: { ko: "무력함", en: "Helplessness" },
    date: "2026. 10.",
    medium: { ko: "종이에 먹, 아크릴, 오일파스텔", en: "Ink, acrylic and oil pastel on paper" },
    size: PAPER_PORTRAIT,
    image: "/works/sanlee_2026_helplessness.webp",
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
    image: "/works/sanlee_2026_back-and-forth.webp",
    width: 1400,
    height: 953,
  },
  {
    title: { ko: "괴물", en: "Monster" },
    date: "2026. 10.",
    medium: { ko: "종이에 수채, 오일파스텔, 콜라주", en: "Watercolor, oil pastel and collage on paper" },
    size: PAPER_PORTRAIT,
    image: "/works/sanlee_2026_monster.webp",
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
    image: "/works/sanlee_2026_self-portrait.webp",
    width: 910,
    height: 1400,
  },
  {
    title: { ko: "인고의 고치", en: "Cocoon of Endurance" },
    date: "2026. 10.",
    medium: { ko: "종이에 수채, 먹", en: "Watercolor and ink on paper" },
    size: PAPER_PORTRAIT,
    image: "/works/sanlee_2026_cocoon-of-endurance.webp",
    width: 961,
    height: 1400,
  },
  {
    title: { ko: "방", en: "Room" },
    date: "2026. 9.",
    medium: { ko: "종이에 아크릴", en: "Acrylic on paper" },
    size: PAPER_LANDSCAPE,
    image: "/works/sanlee_2026_room.webp",
    width: 1400,
    height: 963,
  },
  {
    title: { ko: "가치 판단", en: "Value Judgment" },
    date: "2026. 9.",
    medium: { ko: "종이에 아크릴", en: "Acrylic on paper" },
    size: PAPER_LANDSCAPE,
    image: "/works/sanlee_2026_value-judgment.webp",
    width: 1400,
    height: 955,
  },
];

export const contact = {
  email: "bysanlee@gmail.com",
  links: [{ label: "Instagram @bysanlee", href: "https://www.instagram.com/bysanlee/" }],
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
