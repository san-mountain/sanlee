"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 사이트 주인용 관리 화면: 시·일기를 쓰고 고치고, 작업 사진을 올린다.
// 저장하면 서버가 GitHub 저장소에 커밋하고, Vercel이 사이트를 다시 만들어 1~2분 뒤 반영된다.

type Kind = "poems" | "diary" | "works";
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
  image?: string;
  category?: "painting" | "sculpture";
  width?: number;
  height?: number;
};
type Item = Poem | Diary | Work;
type Loaded = { items: Item[]; sha: string };

type PoemDraft = { title: string; date: string; prose: boolean; body: string };
type DiaryDraft = { date: string; title: string; body: string; hidden: boolean };
type SizeMode = "p8" | "l8" | "cm" | "var" | "free";
type WorkDraft = {
  titleKo: string;
  titleEn: string;
  year: string;
  month: string;
  mediumKo: string;
  mediumEn: string;
  sizeMode: SizeMode;
  h: string;
  w: string;
  sizeKo: string;
  sizeEn: string;
  descKo: string;
  descEn: string;
  link: string;
  category: "painting" | "sculpture";
  image: string;
  width: number;
  height: number;
  upload?: { base64: string; preview: string };
};
type Draft = PoemDraft | DiaryDraft | WorkDraft;
type Editing = { index: number | null; draft: Draft; dirty: boolean };

const TABS: { id: Kind; label: string; add: string }[] = [
  { id: "poems", label: "시", add: "새 시 쓰기" },
  { id: "diary", label: "일기", add: "새 일기 쓰기" },
  { id: "works", label: "작업", add: "새 작업 올리기" },
];

const NB = " ";
const SIZES: Record<"p8" | "l8" | "var", L> = {
  p8: { ko: `8절, 39.4${NB}×${NB}27.2${NB}cm`, en: `39.4${NB}×${NB}27.2${NB}cm` },
  l8: { ko: `8절, 27.2${NB}×${NB}39.4${NB}cm`, en: `27.2${NB}×${NB}39.4${NB}cm` },
  var: { ko: "가변 크기", en: "Dimensions variable" },
};
const CM = new RegExp(`^([\\d.]+)${NB}×${NB}([\\d.]+)${NB}cm$`);

// 오늘 날짜(한국 시간)
function today() {
  const d = new Date(Date.now() + 9 * 3600e3);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
const pad = (n: number) => String(n).padStart(2, "0");
const todayDot = () => {
  const t = today();
  return `${t.y}.${pad(t.m)}.${pad(t.d)}`;
};

// ---------- 목록 ↔ 편집 칸 ----------
function toDraft(kind: Kind, item?: Item): Draft {
  if (kind === "poems") {
    const p = item as Poem | undefined;
    return { title: p?.title ?? "", date: p?.date ?? todayDot(), prose: !!p?.prose, body: p?.body ?? "" };
  }
  if (kind === "diary") {
    const e = item as Diary | undefined;
    if (e?.hidden) return { date: e.date, title: "", body: "", hidden: true };
    return { date: e?.date ?? todayDot(), title: e?.title ?? "", body: e?.body ?? "", hidden: false };
  }
  const w = item as Work | undefined;
  const t = today();
  const [year, month] = w ? w.date.replace(/\.$/, "").split(". ") : [String(t.y), String(t.m)];
  const size = w?.size;
  let sizeMode: SizeMode = "p8";
  let h = "";
  let wd = "";
  if (size) {
    const same = (l: L) => l.ko === size.ko && l.en === size.en;
    const m = size.en.match(CM);
    if (same(SIZES.p8)) sizeMode = "p8";
    else if (same(SIZES.l8)) sizeMode = "l8";
    else if (same(SIZES.var)) sizeMode = "var";
    else if (m && size.ko === size.en) [sizeMode, h, wd] = ["cm", m[1], m[2]];
    else sizeMode = "free";
  }
  return {
    titleKo: w?.title.ko ?? "",
    titleEn: w?.title.en ?? "",
    year,
    month,
    mediumKo: w?.medium.ko ?? "",
    mediumEn: w?.medium.en ?? "",
    sizeMode,
    h,
    w: wd,
    sizeKo: size?.ko ?? "",
    sizeEn: size?.en ?? "",
    descKo: w?.description?.ko ?? "",
    descEn: w?.description?.en ?? "",
    link: w?.link ?? "",
    category: w?.category ?? "painting",
    image: w?.image ?? "",
    width: w?.width ?? 0,
    height: w?.height ?? 0,
  };
}

function fromDraft(kind: Kind, d: Draft): Item {
  if (kind === "poems") {
    const p = d as PoemDraft;
    return p.prose ? { title: p.title.trim(), date: p.date.trim(), prose: true, body: p.body } : { title: p.title.trim(), date: p.date.trim(), body: p.body };
  }
  if (kind === "diary") {
    const e = d as DiaryDraft;
    if (e.hidden) return { hidden: true, date: e.date.trim() };
    return e.title.trim() ? { date: e.date.trim(), title: e.title.trim(), body: e.body } : { date: e.date.trim(), body: e.body };
  }
  const w = d as WorkDraft;
  const size: L =
    w.sizeMode === "cm"
      ? { ko: `${w.h.trim()}${NB}×${NB}${w.w.trim()}${NB}cm`, en: `${w.h.trim()}${NB}×${NB}${w.w.trim()}${NB}cm` }
      : w.sizeMode === "free"
        ? { ko: w.sizeKo, en: w.sizeEn }
        : SIZES[w.sizeMode];
  const out: Work = {
    title: { ko: w.titleKo.trim(), en: w.titleEn.trim() },
    date: `${w.year.trim()}. ${Number(w.month)}.`,
    medium: { ko: w.mediumKo, en: w.mediumEn },
    size,
  };
  if (w.descKo.trim() || w.descEn.trim()) out.description = { ko: w.descKo, en: w.descEn };
  if (w.link.trim()) out.link = w.link.trim();
  if (w.image && w.image !== "pending") {
    out.image = w.image;
    if (w.category === "sculpture") out.category = "sculpture";
    out.width = w.width;
    out.height = w.height;
  }
  return out;
}

// 순서: 시·작업은 최근 것이 위, 일기는 오래된 것이 위. 같은 날짜면 새 글이 그 날짜 묶음의 최근 자리로 간다
function sortKey(kind: Kind, it: Item) {
  if (kind === "works") {
    const [y, m] = (it as Work).date.replace(/\.$/, "").split(". ");
    return `${y}.${pad(Number(m))}`;
  }
  return (it as Poem | Diary).date;
}
function place(kind: Kind, list: Item[], it: Item) {
  const k = sortKey(kind, it);
  const at =
    kind === "diary"
      ? list.findIndex((x) => sortKey(kind, x) > k)
      : list.findIndex((x) => sortKey(kind, x) <= k);
  const next = [...list];
  next.splice(at === -1 ? next.length : at, 0, it);
  return next;
}

const name = (kind: Kind, it: Item) => {
  if (kind === "works") return (it as Work).title.ko;
  if (kind === "poems") return (it as Poem).title;
  const e = it as Diary;
  return e.hidden ? `${e.date} (전체 비공개)` : `${e.date}${e.title ? ` ${e.title}` : ""}`;
};
const firstLine = (body: string) =>
  (body.split("\n").find((l) => l.trim() && l.trim() !== "---") ?? "")
    .replace(/⟦\d+⟧/g, "▇▇▇")
    .replace(/^(## |> )/, "")
    .trim();

// ---------- 사진: 브라우저에서 줄여(긴 변 2000px JPEG) 보내면 서버가 1400px WebP로 바꾼다 ----------
async function shrink(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob>((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("encode"))), "image/jpeg", 0.92));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const s = Math.min(1, 1400 / Math.max(w, h));
    return { base64: btoa(bin), preview: URL.createObjectURL(blob), width: Math.round(w * s), height: Math.round(h * s) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "work";

// ---------- 화면 ----------
const DRAFT_KEY = (k: Kind) => `sanlee-admin-draft:${k}`;
const store = {
  get(k: Kind): Editing | null {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY(k)) ?? "null");
    } catch {
      return null;
    }
  },
  set(k: Kind, e: Editing | null) {
    try {
      if (!e) localStorage.removeItem(DRAFT_KEY(k));
      // 사진 데이터는 너무 커서 임시 저장에서 뺀다
      else localStorage.setItem(DRAFT_KEY(k), JSON.stringify({ ...e, draft: { ...e.draft, upload: undefined } }));
    } catch {}
  },
};

type Notice = { text: string; commit?: string; url?: string; deploy?: "pending" | "success" | "failure" | "unknown" };

export default function AdminClient() {
  const [kind, setKind] = useState<Kind>("poems");
  const [data, setData] = useState<Partial<Record<Kind, Loaded>>>({});
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saved, setSaved] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; conflict?: boolean } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const load = useCallback(async (k: Kind) => {
    setLoadError("");
    const res = await fetch(`/api/admin/content?kind=${k}`, { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return location.reload();
    const j = await res?.json().catch(() => null);
    if (!res?.ok || !j) return setLoadError(j?.error ?? "불러오지 못했어요");
    setData((d) => ({ ...d, [k]: { items: j.items, sha: j.sha } }));
  }, []);

  useEffect(() => {
    if (!data[kind]) load(kind);
    setSaved(store.get(kind));
  }, [kind, data, load]);

  // 쓰던 글은 이 기기에 임시 저장해 둔다(창을 닫아도 다시 불러올 수 있게)
  useEffect(() => {
    if (editing?.dirty) store.set(kind, editing);
  }, [editing, kind]);
  useEffect(() => {
    if (!editing?.dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing?.dirty]);

  // 저장한 뒤 사이트에 반영될 때까지 Vercel 상태를 지켜본다(최대 6분)
  useEffect(() => {
    const sha = notice?.commit;
    if (!sha || notice.deploy !== "pending") return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      const j = await fetch(`/api/admin/deploy?sha=${sha}`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      const state = j?.state ?? "unknown";
      if (state === "success" || state === "failure" || (state === "unknown" && tries > 6) || tries > 72) {
        clearInterval(timer);
        setNotice((n) => (n && n.commit === sha ? { ...n, deploy: state === "pending" ? "unknown" : state } : n));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [notice?.commit, notice?.deploy]);

  const leave = () => !editing?.dirty || confirm("저장하지 않은 내용이 있어요. 그래도 나갈까요?");
  const switchTab = (k: Kind) => {
    if (k === kind || !leave()) return;
    if (editing?.dirty) store.set(kind, null);
    setEditing(null);
    setError(null);
    setKind(k);
  };
  const open = (index: number | null) => {
    if (!leave()) return;
    const items = data[kind]?.items ?? [];
    setError(null);
    setEditing({ index, draft: toDraft(kind, index === null ? undefined : items[index]), dirty: false });
    top.current?.scrollIntoView({ block: "start" });
  };
  const close = () => {
    if (!leave()) return;
    store.set(kind, null);
    setSaved(null);
    setEditing(null);
    setError(null);
  };
  const resume = () => {
    if (!saved) return;
    setEditing({ ...saved, dirty: true });
    setSaved(null);
  };

  const save = async (remove = false) => {
    const cur = data[kind];
    if (!cur || !editing) return;
    let items = [...cur.items];
    const before = editing.index === null ? null : items[editing.index];
    if (editing.index !== null) items.splice(editing.index, 1);
    let message: string;
    let uploads: { path: string; base64: string }[] = [];
    if (remove) {
      if (!before || !confirm(`「${name(kind, before)}」을(를) 지울까요? 사이트에서도 사라져요.`)) return;
      message = `「${name(kind, before)}」 지움`;
    } else {
      let draft = editing.draft;
      if (kind === "works") {
        const w = draft as WorkDraft;
        if (w.upload) {
          const used = new Set(cur.items.map((x) => (x as Work).image));
          let path = `/works/sanlee_${w.year.trim()}_${slug(w.titleEn)}.webp`;
          if (used.has(path)) path = path.replace(/\.webp$/, `-${Date.now().toString(36)}.webp`);
          uploads = [{ path, base64: w.upload.base64 }];
          draft = { ...w, image: path };
        }
      }
      const item = fromDraft(kind, draft);
      items = place(kind, items, item);
      message = `「${name(kind, item)}」 ${before ? "고침" : "새로 씀"}`;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, items, sha: cur.sha, message, uploads }),
    }).catch(() => null);
    setBusy(false);
    if (res?.status === 401) return location.reload();
    const j = await res?.json().catch(() => null);
    if (!res?.ok || !j?.ok) {
      setError({ text: j?.error ?? (res?.status === 413 ? "사진이 너무 커요" : "저장하지 못했어요. 인터넷 연결을 확인해 주세요"), conflict: res?.status === 409 });
      return;
    }
    setData((d) => ({ ...d, [kind]: { items: j.items, sha: j.sha } }));
    store.set(kind, null);
    setEditing(null);
    setNotice({ text: `${message}. 저장했어요.`, commit: j.commit, url: j.url, deploy: "pending" });
    top.current?.scrollIntoView({ block: "start" });
  };

  const logout = async () => {
    if (!leave()) return;
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    location.reload();
  };

  const tab = TABS.find((t) => t.id === kind)!;
  const items = data[kind]?.items;
  const set = (patch: Partial<Draft>) =>
    setEditing((e) => (e ? { ...e, dirty: true, draft: { ...e.draft, ...patch } as Draft } : e));

  return (
    <div ref={top} className="admin-wrap">
      <header className="admin-head">
        <h1>관리</h1>
        <nav>
          <a href={kind === "works" ? "/works" : "/writing"} target="_blank" rel="noreferrer">
            사이트 보기 ↗
          </a>
          <button type="button" className="admin-link" onClick={logout}>
            로그아웃
          </button>
        </nav>
      </header>

      <div className="cat-tabs" role="tablist" aria-label="고칠 곳">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={kind === t.id} className={kind === t.id ? "on" : ""} onClick={() => switchTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="admin-notice" role="status">
          {notice.text}{" "}
          {notice.deploy === "pending" && "사이트에 반영하는 중이에요(보통 1~2분)…"}
          {notice.deploy === "success" && "사이트에 반영됐어요."}
          {notice.deploy === "failure" && "사이트를 다시 만드는 데 실패했어요. Vercel 배포 기록을 확인해 주세요."}
          {notice.deploy === "unknown" && "보통 1~2분 뒤 사이트에 반영돼요."}{" "}
          {notice.url && (
            <a href={notice.url} target="_blank" rel="noreferrer">
              기록
            </a>
          )}
          <button type="button" className="admin-x" aria-label="닫기" onClick={() => setNotice(null)}>
            ×
          </button>
        </p>
      )}

      {loadError && (
        <p className="admin-error">
          {loadError}{" "}
          <button type="button" className="admin-link" onClick={() => load(kind)}>
            다시 시도
          </button>
        </p>
      )}

      {editing ? (
        <form
          className="admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h2>{editing.index === null ? tab.add : "고치기"}</h2>
          {kind === "poems" && <PoemFields d={editing.draft as PoemDraft} set={set} />}
          {kind === "diary" && <DiaryFields d={editing.draft as DiaryDraft} set={set} />}
          {kind === "works" && <WorkFields d={editing.draft as WorkDraft} set={set} />}
          {error && (
            <p className="admin-error" role="alert">
              {error.text}
              {error.conflict && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="admin-link"
                    onClick={() => {
                      setError(null);
                      load(kind);
                    }}
                  >
                    최신 내용 불러오기
                  </button>
                  {" "}(쓰던 글은 이 기기에 남아 있어요)
                </>
              )}
            </p>
          )}
          <div className="admin-actions">
            <button type="submit" className="admin-primary" disabled={busy || !data[kind]}>
              {busy ? "저장하는 중…" : "저장"}
            </button>
            <button type="button" onClick={close} disabled={busy}>
              취소
            </button>
            {editing.index !== null && (
              <button type="button" className="admin-danger" onClick={() => save(true)} disabled={busy}>
                지우기
              </button>
            )}
          </div>
        </form>
      ) : (
        <>
          <div className="admin-actions">
            <button type="button" className="admin-primary" onClick={() => open(null)} disabled={!items}>
              + {tab.add}
            </button>
            {saved && (
              <button type="button" onClick={resume}>
                쓰다 만 글 이어 쓰기
              </button>
            )}
          </div>
          {!items && !loadError && <p className="admin-muted">불러오는 중…</p>}
          {items && (
            <ol className="admin-list">
              {(kind === "diary" ? items.map((it, i) => ({ it, i })).reverse() : items.map((it, i) => ({ it, i }))).map(({ it, i }) => (
                <li key={i}>
                  <button type="button" onClick={() => open(i)}>
                    <ListRow kind={kind} it={it} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

function ListRow({ kind, it }: { kind: Kind; it: Item }) {
  if (kind === "poems") {
    const p = it as Poem;
    return (
      <>
        <span className="al-date">{p.date}</span>
        <span className="al-title">{p.title}</span>
        <span className="al-sub">{firstLine(p.body)}</span>
      </>
    );
  }
  if (kind === "diary") {
    const e = it as Diary;
    return (
      <>
        <span className="al-date">{e.date}</span>
        <span className="al-title">{e.hidden ? "전체 비공개" : e.title || firstLine(e.body)}</span>
        {!e.hidden && e.title && <span className="al-sub">{firstLine(e.body)}</span>}
      </>
    );
  }
  const w = it as Work;
  return (
    <>
      {w.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="al-thumb" src={w.image} alt="" loading="lazy" />
      ) : (
        <span className="al-thumb al-nothumb">↗</span>
      )}
      <span className="al-date">{w.date}</span>
      <span className="al-title">{w.title.ko}</span>
      <span className="al-sub">
        {w.image ? (w.category === "sculpture" ? "조각" : "그림") : "인터랙티브"} · {w.medium.ko}
      </span>
    </>
  );
}

// ---------- 칸들 ----------
type SetFn = (p: Partial<Draft>) => void;

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="admin-field">
      <span className="af-label">{label}</span>
      {children}
      {hint && <span className="af-hint">{hint}</span>}
    </label>
  );
}

function PoemFields({ d, set }: { d: PoemDraft; set: SetFn }) {
  return (
    <>
      <Field label="제목">
        <input value={d.title} onChange={(e) => set({ title: e.target.value })} required />
      </Field>
      <Field label="날짜" hint="2026.10.31 처럼">
        <input value={d.date} onChange={(e) => set({ date: e.target.value })} pattern="\d{4}\.\d{2}\.\d{2}" inputMode="numeric" required />
      </Field>
      <label className="admin-check">
        <input type="checkbox" checked={d.prose} onChange={(e) => set({ prose: e.target.checked })} /> 산문시(줄을 바꾸지 않고 문단으로)
      </label>
      <Field label="본문" hint="연은 빈 줄로 나눠요.">
        <textarea className="af-body af-poem" value={d.body} onChange={(e) => set({ body: e.target.value })} required rows={18} />
      </Field>
    </>
  );
}

function DiaryFields({ d, set }: { d: DiaryDraft; set: SetFn }) {
  const sealed = (d.body.match(/\{[^]*?\}/g) ?? []).length;
  return (
    <>
      <Field label="날짜" hint="2026.11.09 처럼">
        <input value={d.date} onChange={(e) => set({ date: e.target.value })} pattern="\d{4}\.\d{2}\.\d{2}" inputMode="numeric" required />
      </Field>
      <label className="admin-check">
        <input type="checkbox" checked={d.hidden} onChange={(e) => set({ hidden: e.target.checked })} /> 전체 비공개(날짜만 남기고 본문은 저장하지 않아요)
      </label>
      {!d.hidden && (
        <>
          <Field label="제목(없어도 돼요)">
            <input value={d.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field
            label="본문"
            hint={
              <>
                문단은 빈 줄로 나눠요. 남에게 보이고 싶지 않은 곳은 <code>{"{이렇게}"}</code> 중괄호로 감싸면 저장할 때 검은 막대로 바뀌고, 원래 글자는 어디에도 저장되지 않아요.
                <br />
                <code>## </code>로 시작하면 소제목, <code>---</code> 한 줄은 구분선, <code>&gt; </code>로 시작하는 문단은 메모예요. <code>⟦120⟧</code>은 이미 가린 곳이에요.
                {sealed > 0 && <strong> 저장하면 {sealed}곳이 가려져요.</strong>}
              </>
            }
          >
            <textarea className="af-body" value={d.body} onChange={(e) => set({ body: e.target.value })} required rows={20} />
          </Field>
        </>
      )}
    </>
  );
}

function WorkFields({ d, set }: { d: WorkDraft; set: SetFn }) {
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState("");
  const pick = async (file?: File) => {
    if (!file) return;
    setReading(true);
    setFileError("");
    try {
      const s = await shrink(file);
      set({ upload: { base64: s.base64, preview: s.preview }, width: s.width, height: s.height, image: d.image || "pending" });
    } catch {
      setFileError("이 사진을 읽지 못했어요. JPEG나 PNG로 다시 골라 주세요.");
    }
    setReading(false);
  };
  const preview = d.upload?.preview ?? (d.image && d.image !== "pending" ? d.image : "");
  return (
    <>
      <Field label="사진" hint="고르면 이 기기에서 줄여서 올리고, 사이트에는 긴 변 1400px WebP로 들어가요. 링크만 있는 작업(인터랙티브)은 비워 둬요.">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="af-preview" src={preview} alt="" />
        )}
        <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} disabled={reading} />
        {reading && <span className="admin-muted">사진을 준비하는 중…</span>}
        {fileError && <span className="admin-error">{fileError}</span>}
      </Field>
      {d.image && (
        <fieldset className="admin-row">
          <legend className="af-label">분류</legend>
          {(["painting", "sculpture"] as const).map((c) => (
            <label key={c} className="admin-check">
              <input type="radio" name="category" checked={d.category === c} onChange={() => set({ category: c })} /> {c === "painting" ? "그림" : "조각"}
            </label>
          ))}
        </fieldset>
      )}
      <div className="admin-row">
        <Field label="제목(한국어)">
          <input value={d.titleKo} onChange={(e) => set({ titleKo: e.target.value })} required />
        </Field>
        <Field label="제목(영어)">
          <input value={d.titleEn} onChange={(e) => set({ titleEn: e.target.value })} required />
        </Field>
      </div>
      <div className="admin-row">
        <Field label="연도">
          <input value={d.year} onChange={(e) => set({ year: e.target.value })} pattern="\d{4}" inputMode="numeric" required />
        </Field>
        <Field label="월">
          <select value={d.month} onChange={(e) => set({ month: e.target.value })}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={String(i + 1)}>
                {i + 1}월
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="admin-row">
        <Field label="재료(한국어)" hint="예: 종이에 아크릴, 오일파스텔">
          <input value={d.mediumKo} onChange={(e) => set({ mediumKo: e.target.value })} required />
        </Field>
        <Field label="재료(영어)" hint="예: Acrylic and oil pastel on paper">
          <input value={d.mediumEn} onChange={(e) => set({ mediumEn: e.target.value })} required />
        </Field>
      </div>
      <Field label="크기">
        <select value={d.sizeMode} onChange={(e) => set({ sizeMode: e.target.value as SizeMode })}>
          <option value="p8">8절 세로 (39.4 × 27.2 cm)</option>
          <option value="l8">8절 가로 (27.2 × 39.4 cm)</option>
          <option value="cm">직접 cm 적기</option>
          <option value="var">가변 크기</option>
          <option value="free">직접 문장으로 적기</option>
        </select>
      </Field>
      {d.sizeMode === "cm" && (
        <div className="admin-row">
          <Field label="세로(cm)">
            <input value={d.h} onChange={(e) => set({ h: e.target.value })} pattern="\d+(\.\d+)?" inputMode="decimal" required />
          </Field>
          <Field label="가로(cm)">
            <input value={d.w} onChange={(e) => set({ w: e.target.value })} pattern="\d+(\.\d+)?" inputMode="decimal" required />
          </Field>
        </div>
      )}
      {d.sizeMode === "free" && (
        <div className="admin-row">
          <Field label="크기(한국어)">
            <input value={d.sizeKo} onChange={(e) => set({ sizeKo: e.target.value })} required />
          </Field>
          <Field label="크기(영어)">
            <input value={d.sizeEn} onChange={(e) => set({ sizeEn: e.target.value })} required />
          </Field>
        </div>
      )}
      <div className="admin-row">
        <Field label="설명(한국어, 없어도 돼요)">
          <textarea value={d.descKo} onChange={(e) => set({ descKo: e.target.value })} rows={4} />
        </Field>
        <Field label="설명(영어)">
          <textarea value={d.descEn} onChange={(e) => set({ descEn: e.target.value })} rows={4} />
        </Field>
      </div>
      <Field label="링크(없어도 돼요)" hint="/deleteseoul 처럼 이 사이트 주소나 https:// 주소">
        <input value={d.link} onChange={(e) => set({ link: e.target.value })} />
      </Field>
    </>
  );
}
