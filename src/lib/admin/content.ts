// 관리 화면(/admin)에서 보낸 시·일기·작업 목록을 저장하기 전에 검사하고 다듬는 곳.
// 브라우저에서 무엇이 오든 이 함수를 거친 값만 저장소에 들어간다. (Next 별칭 없이 써서 node --test로 바로 시험할 수 있다)

import { createHash } from "node:crypto";

export type Kind = "poems" | "diary" | "works";
export const KINDS: Kind[] = ["poems", "diary", "works"];

export const FILES: Record<Kind, string> = {
  poems: "src/content/poems.json",
  diary: "src/content/diary.json",
  works: "src/content/works.json",
};

type L = { ko: string; en: string };
type Poem = { title: string; date: string; body: string; prose?: boolean };
type Diary = { hidden?: false; date: string; title?: string; body: string } | { hidden: true; date: string };
type Work = {
  title: L;
  date: string;
  medium: L;
  size: L;
  description?: L;
  link?: string;
  credit?: L;
  image?: string;
  category?: "painting" | "sculpture";
  width?: number;
  height?: number;
};

export class Invalid extends Error {}
const fail = (msg: string): never => {
  throw new Invalid(msg);
};

const obj = (v: unknown, where: string) =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(`${where}: 형식이 맞지 않아요`);
// 줄바꿈은 \n 하나로 맞추고, 앞뒤 빈 줄은 걷어 낸다. 글 안의 공백(들여쓰기 등)은 그대로 둔다
const text = (v: unknown, where: string, { required = true, max = 50_000 } = {}) => {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") fail(`${where}: 글자가 아니에요`);
  const s = (v as string).replace(/\r\n?/g, "\n").replace(/^\s*\n|\s+$/g, "");
  if (required && !s.trim()) fail(`${where}: 비어 있어요`);
  if (s.length > max) fail(`${where}: 너무 길어요`);
  return s;
};
const line = (v: unknown, where: string, opts: { required?: boolean; max?: number } = {}) => {
  const s = text(v, where, { max: 300, ...opts });
  if (s.includes("\n")) fail(`${where}: 한 줄로 적어 주세요`);
  return s.trim();
};
const pair = (v: unknown, where: string, required = true): L | undefined => {
  if (!required && (v === undefined || v === null)) return undefined;
  const o = obj(v, where);
  const ko = text(o.ko, `${where}(한국어)`, { required, max: 5000 });
  const en = text(o.en, `${where}(영어)`, { required, max: 5000 });
  if (!required && !ko && !en) return undefined;
  if (!ko || !en) fail(`${where}: 한국어와 영어를 둘 다 적어 주세요`);
  return { ko, en };
};

// 시·일기 날짜: 2026.10.31
const DAY = /^(\d{4})\.(\d{2})\.(\d{2})$/;
const day = (v: unknown, where: string) => {
  const s = line(v, where);
  const m = s.match(DAY);
  if (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) fail(`${where}: 2026.10.31 처럼 적어 주세요`);
  return s;
};
// 작업 날짜: "2026. 10." (달은 한 자리면 한 자리 그대로)
const MONTH = /^(\d{4})\. (\d{1,2})\.$/;

// 일기에서 {중괄호}로 감싼 곳은 저장하기 전에 ⟦글자 수⟧로 바꾼다. 원래 글자는 저장소 어디에도 남지 않는다.
// 글자 수는 공백을 뺀 수로 센다(막대 길이에만 쓰인다).
export function seal(body: string) {
  let out = "";
  let depth = 0;
  let hidden = "";
  for (const ch of body) {
    if (ch === "{") {
      if (depth === 0) hidden = "";
      else hidden += ch;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0) out += `⟦${Math.max(1, Array.from(hidden.replace(/\s/g, "")).length)}⟧`;
      else hidden += ch;
    } else if (depth > 0) hidden += ch;
    else out += ch;
  }
  // 닫히지 않은 { 는 실수일 가능성이 커서 저장을 멈춘다(그대로 두면 가리려던 글이 공개된다)
  if (depth > 0) fail("일기 본문: 닫히지 않은 { 가 있어요. 가릴 곳은 {이렇게} 감싸 주세요");
  return out;
}

export function cleanPoems(v: unknown): Poem[] {
  if (!Array.isArray(v)) return fail("시 목록 형식이 맞지 않아요");
  const seen = new Set<string>();
  return v.map((raw, i) => {
    const where = `시 ${i + 1}번째`;
    const o = obj(raw, where);
    const p: Poem = {
      title: line(o.title, `${where} 제목`),
      date: day(o.date, `${where} 날짜`),
      body: text(o.body, `${where} 본문`),
    };
    if (seen.has(p.title)) fail(`같은 제목의 시가 이미 있어요: ${p.title}`);
    seen.add(p.title);
    // 화면에 나오는 순서 그대로 키를 적는다(title, date, prose, body)
    return o.prose === true ? { title: p.title, date: p.date, prose: true, body: p.body } : p;
  });
}

export function cleanDiary(v: unknown): Diary[] {
  if (!Array.isArray(v)) return fail("일기 목록 형식이 맞지 않아요");
  return v.map((raw, i) => {
    const where = `일기 ${i + 1}번째`;
    const o = obj(raw, where);
    const date = day(o.date, `${where} 날짜`);
    if (o.hidden === true) return { hidden: true, date };
    const title = line(o.title, `${where} 제목`, { required: false });
    const body = seal(text(o.body, `${where} 본문`, { max: 100_000 }));
    return title ? { date, title, body } : { date, body };
  });
}

const IMAGE = /^\/works\/[a-z0-9][a-z0-9._-]{0,120}\.webp$/;
export function cleanWorks(v: unknown): Work[] {
  if (!Array.isArray(v)) return fail("작업 목록 형식이 맞지 않아요");
  const seen = new Set<string>();
  return v.map((raw, i) => {
    const where = `작업 ${i + 1}번째`;
    const o = obj(raw, where);
    const title = pair(o.title, `${where} 제목`)!;
    if (seen.has(title.en)) fail(`같은 영어 제목의 작업이 이미 있어요: ${title.en}`);
    seen.add(title.en);
    const date = line(o.date, `${where} 날짜`);
    if (!MONTH.test(date)) fail(`${where} 날짜: 2026. 10. 처럼 적어 주세요`);
    const w: Work = { title, date, medium: pair(o.medium, `${where} 재료`)!, size: pair(o.size, `${where} 크기`)! };
    const description = pair(o.description, `${where} 설명`, false);
    if (description) w.description = description;
    const link = line(o.link, `${where} 링크`, { required: false });
    if (link) {
      if (!/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(link)) fail(`${where} 링크: /로 시작하는 주소나 https:// 주소만 돼요`);
      w.link = link;
    }
    const credit = pair(o.credit, `${where} 함께 만든 사람`, false);
    if (credit) w.credit = credit;
    const image = line(o.image, `${where} 사진`, { required: false });
    if (image) {
      if (!IMAGE.test(image)) fail(`${where} 사진 경로가 맞지 않아요`);
      w.image = image;
      if (o.category === "sculpture") w.category = "sculpture";
      const width = Number(o.width);
      const height = Number(o.height);
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000)
        fail(`${where} 사진 크기 값이 맞지 않아요`);
      w.width = width;
      w.height = height;
    }
    if (!w.image && !w.link) fail(`${where}: 사진이나 링크 중 하나는 있어야 해요`);
    return w;
  });
}

export function clean(kind: Kind, items: unknown) {
  if (kind === "poems") return cleanPoems(items);
  if (kind === "diary") return cleanDiary(items);
  return cleanWorks(items);
}

// 올린 사진 파일: 브라우저가 줄여 보낸 JPEG·PNG·WebP, 4MB까지. 서버에서 WebP로 바꿔 public/works/ 에 넣는다
export function cleanUpload(v: unknown) {
  const o = obj(v, "사진");
  const path = line(o.path, "사진 경로");
  if (!IMAGE.test(path)) fail("사진 경로가 맞지 않아요");
  if (typeof o.base64 !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(o.base64)) return fail("사진 데이터가 맞지 않아요");
  const bytes = Buffer.from(o.base64, "base64");
  if (bytes.length > 4 * 1024 * 1024) fail("사진이 너무 커요(4MB까지)");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.toString("latin1", 0, 8) === "\x89PNG\r\n\x1a\n";
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp) fail("JPEG, PNG, WebP 사진만 올릴 수 있어요");
  return { path, bytes };
}

// 이미 저장소에 있는 사진 중, 새 목록에서 더 이상 쓰지 않는 것(지울 것)
export function droppedImages(before: Work[], after: Work[]) {
  const keep = new Set(after.map((w) => w.image).filter(Boolean));
  return [...new Set(before.map((w) => w.image).filter((p): p is string => !!p && !keep.has(p)))];
}

export const serialize = (items: unknown) => JSON.stringify(items, null, 2) + "\n";

// git이 파일 내용에 붙이는 이름(blob sha). 저장 직후 다음 저장의 기준값으로 쓴다
export function blobSha(text: string) {
  const buf = Buffer.from(text, "utf8");
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}
