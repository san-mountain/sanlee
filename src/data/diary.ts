import data from "@/content/diary.json";

// 일기는 노션 Diary에서 옮겨 왔습니다. 내용은 src/content/diary.json 에 있고, 사이트의 /admin 에서 쓰고 고칠 수 있어요.
// 원문 그대로 싣되, 작가가 {}로 표시한 개인적인 부분은
// 원래 글자를 이 저장소에 전혀 남기지 않고 ⟦글자 수⟧ 표시로만 적습니다. 화면에서는 검은 막대(private)로 보여요.
// - 문단은 빈 줄로 구분합니다. 문단 전체가 ⟦n⟧ 하나뿐이면 막대 덩어리로 그려집니다.
// - "## 제목"은 소제목, "---"는 구분선, "> "로 시작하는 문단은 메모(노션 콜아웃)입니다.
// - 제목부터 {}였던 날은 hidden: true 와 날짜만 남깁니다. 본문은 한 글자도 옮기지 않았습니다.
export type DiaryEntry =
  | { hidden?: false; date: string; title?: string; body: string }
  | { hidden: true; date: string };

// 오래된 순서로 적고, 화면에서는 최근 것부터 보여 줍니다.
export const diary = data as DiaryEntry[];
