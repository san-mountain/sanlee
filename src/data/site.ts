// 사이트의 모든 내용은 이 파일 하나에서 관리합니다.
// 일반 포트폴리오 페이지와 /deleteseoul 3D 도시가 둘 다 이 데이터를 읽어요.
// 각 문장은 { ko: 한국어, en: 영어 } 쌍으로 적어 주세요.

import worksData from "@/content/works.json";

export type Lang = "ko" | "en";
export type L = { ko: string; en: string };
export type SectionId = "about" | "works" | "writing";

export const profile = {
  name: "SAN LEE",
  displayName: { ko: "이산", en: "SAN LEE" },
  tagline: {
    ko: "조각 · 그림 · 시",
    en: "Sculpture · Painting · Poetry",
  },
};

export const about = {
  // 첫 화면 맨 위의 한 줄 (아래 작가 노트의 첫 문장)
  homeLine: { ko: "삶은 끝을 향해 조금씩 기운다.", en: "Life leans, little by little, toward its end." },
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
  // 함께 만든 사람 (캡션의 재료·크기 다음 줄)
  credit?: L;
  image?: string; // public/works/ 폴더의 WebP 경로
  category?: "painting" | "sculpture"; // 사진이 있는 작업의 탭. 없으면 그림
  width?: number; // 사진 원본 비율(레이아웃 흔들림 방지용)
  height?: number;
  color?: string; // 사진의 평균색(#rrggbb). 사진이 뜨기 전 그 자리에 깔린다. /admin이 사진을 올릴 때 계산한다
};

// 그리드에 쓰는 작은 사진(폭 600px): public/works/thumb/ 에 같은 이름으로 있다. /admin이 사진을 올릴 때 같이 만든다
export const thumbOf = (image: string) => image.replace("/works/", "/works/thumb/");

// 작업 목록은 src/content/works.json 에 있고, 사이트의 /admin 에서 올리고 고칠 수 있습니다. 최근 것이 맨 위.
// 그림 크기는 "세로 × 가로 cm" 순서로 적어요. (8절 종이: 39.4 × 27.2 cm)
export const works: Work[] = worksData;

export const contact = {
  email: "bysanlee@gmail.com",
  links: [{ label: "Instagram @bysanlee", href: "https://www.instagram.com/bysanlee/" }],
};

export const sections: { id: SectionId; label: string; labelKo: string; href: string }[] = [
  { id: "works", label: "Works", labelKo: "작업", href: "/works" },
  { id: "writing", label: "Writing", labelKo: "글", href: "/writing" },
  { id: "about", label: "About", labelKo: "소개", href: "/about" },
];

// 화면에 고정으로 나오는 짧은 문구들
export const ui = {
  explore: { ko: "DELETE SEOUL · 3D 도시로 들어가기", en: "DELETE SEOUL · enter the 3D city" },
  sealTip: { ko: "도시로 들어가기", en: "Enter the city" },
  exploreCta: { ko: "이 사이트를 도시로 탐험하기 ↗", en: "Explore this site as a city ↗" },
  viewWork: { ko: "작품 보기 ↗", en: "View work ↗" },
  selected: { ko: "최근 작업", en: "Recent works" },
  allWorks: { ko: "전체 작업 보기 →", en: "All works →" },
  close: { ko: "닫기", en: "Close" },
  notFound: { ko: "이 기록은 삭제되었거나, 처음부터 없었습니다.", en: "This record was deleted, or was never here." },
  notFoundBack: { ko: "← 작업으로 돌아가기", en: "← Back to works" },
  prev: { ko: "이전", en: "Previous" },
  next: { ko: "다음", en: "Next" },
  enter: { ko: "도시로 들어가기 ↗", en: "Enter the city ↗" },
  contactTitle: { ko: "연락처", en: "Contact" },
  catPainting: { ko: "그림", en: "Painting" },
  workIndex: { ko: "목록", en: "Index" },
  view: { ko: "보기", en: "View" },
  viewGrid: { ko: "그리드", en: "Grid" },
  viewWall: { ko: "벽", en: "Wall" },
  wallNote: { ko: "실제 크기 비율로 건 벽 · 사람 키 170cm 기준", en: "Hung at true relative scale · figure 170 cm" },
  catSculpture: { ko: "조각", en: "Sculpture" },
  catInteractive: { ko: "인터랙티브", en: "Interactive" },
  sculptureEmpty: {
    ko: "조각 작업은 지금 정리하고 있어요. 곧 이곳에 올릴게요.",
    en: "Sculpture work is being documented and will appear here soon.",
  },
  poemsNote: { ko: "", en: "Poems are presented in their original Korean." },
};
