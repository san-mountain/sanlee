// 글(시·에세이·소설 …)을 화면에 보일 때 쓰는 도움 함수. 사이트와 관리 화면의 미리보기가 같이 쓴다.

export type Piece = { title: string; date: string; category?: string; series?: string; part?: number; prose?: boolean; body: string };
export type Category = { id: string; ko: string; en: string; indent: boolean; serial: boolean };
export type Series = { id: string; category: string; title: string; note?: string; done?: boolean };
export type WritingMeta = { categories: Category[]; series: Series[] };

export const DEFAULT_CATEGORY = "poem";
export const categoryOf = (p: Pick<Piece, "category">) => p.category || DEFAULT_CATEGORY;

// 장면 나눔: 한 줄에 * * *, ***, ＊, ⁂, --- 만 있으면 가운데 별표로 보인다
export const isBreak = (line: string) => /^\s*(([*＊]\s*){1,3}|⁂|-{3,}|─{2,})\s*$/.test(line);

// 들여쓰기 글(에세이·소설): 빈 줄로 나눈 덩어리마다, 줄 하나가 문단 하나. 앞 공백은 화면이 대신 들여 쓴다
export function proseBlocks(body: string) {
  return body
    .split(/\n[ \t　]*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((l) => l.replace(/^[ \t　]+/, "").replace(/\s+$/, ""))
        .filter((l) => l)
    )
    .filter((b) => b.length);
}

// 목록에 보일 첫 줄
export const firstLine = (body: string) => (body.split("\n").find((l) => l.trim() && !isBreak(l)) ?? "").trim();

// 회차 이름: 제목이 "3화"·"제3화"처럼 회차 그 자체면 한 번만 보인다
export function partLabel(p: Pick<Piece, "part" | "title">) {
  if (!p.part) return "";
  return new RegExp(`^(제\\s*)?0*${p.part}\\s*(화|회|장|부)?$`).test(p.title.trim()) ? "" : `${p.part}화`;
}

// 사이트 목록: 연작의 회차들은 가장 최근 회차 자리에 한 묶음으로 모인다(회차 순서대로)
export type Row = { kind: "piece"; piece: Piece; index: number } | { kind: "series"; series: Series; episodes: { piece: Piece; index: number }[] };
export function rows(pieces: Piece[], meta: WritingMeta, filter?: string): Row[] {
  const out: Row[] = [];
  const groups = new Map<string, Extract<Row, { kind: "series" }>>();
  pieces.forEach((piece, index) => {
    if (filter && categoryOf(piece) !== filter) return;
    const s = piece.series ? meta.series.find((x) => x.id === piece.series) : undefined;
    if (!s) return void out.push({ kind: "piece", piece, index });
    let g = groups.get(s.id);
    if (!g) {
      g = { kind: "series", series: s, episodes: [] };
      groups.set(s.id, g);
      out.push(g);
    }
    g.episodes.push({ piece, index });
  });
  for (const g of groups.values()) g.episodes.sort((a, b) => (a.piece.part ?? 0) - (b.piece.part ?? 0));
  return out;
}

// ---------- 글자 수 ----------
export function stats(body: string, indent: boolean) {
  const chars = body.replace(/\n/g, "").length;
  const noSpace = body.replace(/\s/g, "").length;
  const lines = body.split("\n");
  // 200자 원고지(20칸 × 10줄): 문단(줄)마다 새 줄에서 시작하고, 들여쓰기 글은 첫 칸을 비운다
  let rowsUsed = 0;
  for (const l of lines) {
    const t = l.replace(/^[ \t　]+/, "");
    const cells = t.length + (indent && t ? 1 : 0);
    rowsUsed += Math.max(1, Math.ceil(cells / 20));
  }
  const pages = body.trim() ? Math.ceil(rowsUsed / 10) : 0;
  const filled = lines.filter((l) => l.trim());
  const stanzas = body.trim() ? body.trim().split(/\n\s*\n/).length : 0;
  return { chars, noSpace, pages, lines: filled.length, stanzas, minutes: Math.max(1, Math.round(noSpace / 500)) };
}
