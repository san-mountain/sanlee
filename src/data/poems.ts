// 시는 원문(한국어) 그대로 싣습니다. 연은 빈 줄로 구분해요.
// 내용은 src/content/poems.json 에 있고, 사이트의 /admin 에서 쓰고 고칠 수 있습니다. 최근 것이 맨 위.
import data from "@/content/poems.json";

export type Poem = { title: string; date: string; body: string; prose?: boolean };

export const poems: Poem[] = data;
