// 관리 화면(/admin)에서 보낸 시·작업 목록을 저장하기 전에 검사하고 다듬는 곳.
// 브라우저에서 무엇이 오든 이 함수를 거친 값만 저장소에 들어간다. (Next 별칭 없이 써서 node --test로 바로 시험할 수 있다)

import { createHash } from "node:crypto";

// poems: 시·에세이·소설 같은 글 전부(파일 이름은 예전 그대로). meta: 글의 분류와 연작(소설 등) 목록
export type Kind = "poems" | "works" | "meta";
export const KINDS: Kind[] = ["poems", "works", "meta"];

export const FILES: Record<Kind, string> = {
  poems: "src/content/poems.json",
  works: "src/content/works.json",
  meta: "src/content/writing-meta.json",
};

type L = { ko: string; en: string };
// category가 없으면 시(poem). 연작의 회차는 series + part
type Poem = { title: string; date: string; category?: string; series?: string; part?: number; prose?: boolean; body: string };
export type Category = { id: string; ko: string; en: string; indent: boolean; serial: boolean };
export type Series = { id: string; category: string; title: string; note?: string; done?: boolean };
export type Meta = { categories: Category[]; series: Series[] };
export const DEFAULT_CATEGORY = "poem";
type Work = {
  title: L;
  date: string;
  medium: L;
  size: L;
  description?: L;
  link?: string;
  credit?: L;
  image?: string;
  color?: string;
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

// 시 날짜: 2026.10.31
const DAY = /^(\d{4})\.(\d{2})\.(\d{2})$/;
const day = (v: unknown, where: string) => {
  const s = line(v, where);
  const m = s.match(DAY);
  if (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) fail(`${where}: 2026.10.31 처럼 적어 주세요`);
  return s;
};
// 작업 날짜: "2026. 10." (달은 한 자리면 한 자리 그대로)
const MONTH = /^(\d{4})\. (\d{1,2})\.$/;

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const bool = (v: unknown) => v === true;

export function cleanMeta(v: unknown): Meta {
  const o = obj(v, "분류");
  if (!Array.isArray(o.categories) || !o.categories.length) return fail("분류가 하나는 있어야 해요");
  if (o.categories.length > 30) fail("분류가 너무 많아요");
  const ids = new Set<string>();
  const names = new Set<string>();
  const categories = o.categories.map((raw, i) => {
    const c = obj(raw, `분류 ${i + 1}번째`);
    const id = line(c.id, `분류 ${i + 1}번째 id`);
    if (!ID.test(id)) fail(`분류 ${i + 1}번째 id가 맞지 않아요`);
    if (ids.has(id)) fail(`같은 id의 분류가 이미 있어요: ${id}`);
    ids.add(id);
    const ko = line(c.ko, `분류 ${i + 1}번째 이름`, { max: 30 });
    if (names.has(ko)) fail(`같은 이름의 분류가 이미 있어요: ${ko}`);
    names.add(ko);
    return { id, ko, en: line(c.en, `분류 「${ko}」 영어 이름`, { required: false, max: 30 }), indent: bool(c.indent), serial: bool(c.serial) };
  });
  const series = (Array.isArray(o.series) ? o.series : o.series === undefined ? [] : fail("연작 목록 형식이 맞지 않아요")) as unknown[];
  const sids = new Set<string>();
  const titles = new Set<string>();
  const list = series.map((raw, i) => {
    const s = obj(raw, `연작 ${i + 1}번째`);
    const id = line(s.id, `연작 ${i + 1}번째 id`);
    if (!ID.test(id) || sids.has(id)) fail(`연작 ${i + 1}번째 id가 맞지 않아요`);
    sids.add(id);
    const category = line(s.category, `연작 ${i + 1}번째 분류`);
    const cat = categories.find((c) => c.id === category);
    if (!cat) fail(`연작 ${i + 1}번째의 분류가 없어요`);
    const title = line(s.title, `연작 ${i + 1}번째 제목`, { max: 100 });
    if (!cat!.serial) fail(`「${cat!.ko}」은(는) 연작을 쓰지 않는 분류예요. 연작 「${title}」을(를) 옮기거나 지운 뒤에 꺼 주세요`);
    if (titles.has(`${category}\0${title}`)) fail(`같은 제목의 연작이 이미 있어요: ${title}`);
    titles.add(`${category}\0${title}`);
    const out: Series = { id, category, title };
    const note = text(s.note, `연작 「${title}」 소개`, { required: false, max: 2000 });
    if (note) out.note = note;
    if (s.done === true) out.done = true;
    return out;
  });
  return { categories, series: list };
}

// 글 목록. meta를 주면 분류·연작이 실제로 있는지도 확인한다
export function cleanPoems(v: unknown, meta?: Meta): Poem[] {
  if (!Array.isArray(v)) return fail("글 목록 형식이 맞지 않아요");
  const seen = new Set<string>();
  const parts = new Set<string>();
  return v.map((raw, i) => {
    const where = `글 ${i + 1}번째`;
    const o = obj(raw, where);
    const title = line(o.title, `${where} 제목`);
    const date = day(o.date, `${where} 날짜`);
    const body = text(o.body, `${where} 본문`, { max: 200_000 });
    const category = o.category === undefined || o.category === null || o.category === "" ? DEFAULT_CATEGORY : line(o.category, `${where} 분류`);
    if (!ID.test(category)) fail(`${where} 분류가 맞지 않아요`);
    if (meta && !meta.categories.some((c) => c.id === category)) fail(`「${title}」의 분류가 목록에 없어요`);
    let series: string | undefined;
    let part: number | undefined;
    if (o.series !== undefined && o.series !== null && o.series !== "") {
      series = line(o.series, `${where} 연작`);
      const s = meta?.series.find((x) => x.id === series);
      if (meta && !s) fail(`「${title}」의 연작이 목록에 없어요`);
      if (s && s.category !== category) fail(`「${title}」의 분류와 연작의 분류가 달라요`);
      part = Number(o.part);
      if (!Number.isInteger(part) || part < 1 || part > 9999) fail(`「${title}」의 회차는 1 이상의 정수로 적어 주세요`);
      if (parts.has(`${series}\0${part}`)) fail(`같은 연작에 ${part}회가 이미 있어요`);
      parts.add(`${series}\0${part}`);
    }
    // 같은 분류·같은 연작 안에서만 제목이 겹치지 않으면 된다
    const key = `${category}\0${series ?? ""}\0${title}`;
    if (seen.has(key)) fail(`같은 제목의 글이 이미 있어요: ${title}`);
    seen.add(key);
    // 키 순서를 일정하게: title, date, category, series, part, prose, body (시는 category를 적지 않는다)
    const p = { title, date } as Poem;
    if (category !== DEFAULT_CATEGORY) p.category = category;
    if (series) {
      p.series = series;
      p.part = part;
    }
    if (o.prose === true) p.prose = true;
    p.body = body;
    return p;
  });
}

// 분류를 지우거나 연작을 지울 때, 그 분류·연작에 글이 남아 있으면 막는다
export function checkUse(meta: Meta, poems: Poem[]) {
  for (const p of poems) {
    const cat = p.category ?? DEFAULT_CATEGORY;
    const c = meta.categories.find((x) => x.id === cat);
    if (!c) fail(`「${p.title}」이(가) 들어 있는 분류는 지울 수 없어요. 글을 먼저 다른 분류로 옮겨 주세요`);
    if (p.series) {
      const s = meta.series.find((x) => x.id === p.series);
      if (!s) fail(`「${p.title}」이(가) 들어 있는 연작은 지울 수 없어요`);
      if (s!.category !== cat) fail(`「${p.title}」의 분류와 연작의 분류가 달라요`);
    }
  }
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
      if (typeof o.color === "string" && /^#[0-9a-f]{6}$/.test(o.color)) w.color = o.color;
    }
    if (!w.image && !w.link) fail(`${where}: 사진이나 링크 중 하나는 있어야 해요`);
    return w;
  });
}

export function clean(kind: Kind, items: unknown) {
  if (kind === "poems") return cleanPoems(items);
  if (kind === "meta") return cleanMeta(items);
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
