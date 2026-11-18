// 글(시·에세이·소설 …)은 원문(한국어) 그대로 싣습니다. 시의 연은 빈 줄로, 산문의 문단은 줄바꿈으로 구분해요.
// 내용은 src/content/poems.json(글)과 src/content/writing-meta.json(분류·연작)에 있고, 사이트의 /admin 에서 쓰고 고칠 수 있습니다. 최근 것이 맨 위.
import data from "@/content/poems.json";
import meta from "@/content/writing-meta.json";
import type { Piece, WritingMeta } from "@/lib/writing";

export type Poem = Piece;

export const poems: Piece[] = data as Piece[];
export const writingMeta: WritingMeta = meta as WritingMeta;
