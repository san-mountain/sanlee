import { NextResponse } from "next/server";
import sharp from "sharp";
import { thumbOf, type Work } from "@/data/site";
import { isOwner, sameOrigin } from "@/lib/admin/auth";
import { blobSha, clean, cleanUpload, droppedImages, FILES, Invalid, KINDS, serialize, type Kind } from "@/lib/admin/content";
import { commit, Conflict, readFile, type Change } from "@/lib/admin/github";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NAMES: Record<Kind, string> = { poems: "시", diary: "일기", works: "작업" };
const kindOf = (v: unknown) => (KINDS.includes(v as Kind) ? (v as Kind) : null);
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

function failed(e: unknown) {
  if (e instanceof Invalid) return err(e.message, 400);
  if (e instanceof Conflict) return err(`${e.message}. 새로고침해서 최신 내용을 불러온 뒤 다시 고쳐 주세요`, 409);
  console.error("[admin]", e);
  const status = (e as { status?: number }).status;
  if (status === 401 || status === 403 || status === 404)
    return err("GitHub 토큰으로 저장소에 접근하지 못했어요. GITHUB_TOKEN 권한을 확인해 주세요", 502);
  return err("저장소와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요", 502);
}

// 지금 저장소(main)에 있는 최신 내용. 사이트에 반영되기 전 것도 보인다
export async function GET(req: Request) {
  if (!(await isOwner())) return err("로그인이 필요해요", 401);
  const kind = kindOf(new URL(req.url).searchParams.get("kind"));
  if (!kind) return err("잘못된 요청이에요", 400);
  try {
    const f = await readFile(FILES[kind]);
    return NextResponse.json({ items: JSON.parse(f.text), sha: f.sha });
  } catch (e) {
    return failed(e);
  }
}

// 목록 전체를 받아 검사한 뒤 커밋 하나로 저장한다
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return err("잘못된 요청이에요", 403);
  if (!(await isOwner())) return err("로그인이 필요해요", 401);
  const body = await req.json().catch(() => null);
  const kind = kindOf(body?.kind);
  if (!kind || typeof body.sha !== "string" || typeof body.message !== "string") return err("잘못된 요청이에요", 400);
  try {
    const items = clean(kind, body.items);
    const uploads = Array.isArray(body.uploads) ? body.uploads.map(cleanUpload) : [];
    if (uploads.length > 1) throw new Invalid("사진은 한 번에 한 장씩 올려 주세요");
    const path = FILES[kind];
    const extra: Change[] = [];
    if (kind === "works") {
      const works = items as Work[];
      const before: Work[] = JSON.parse((await readFile(path)).text);
      const known = new Set(before.map((w) => w.image));
      for (const u of uploads) {
        const w = works.find((x) => x.image === u.path);
        if (!w) throw new Invalid("올린 사진이 작업 목록에 없어요");
        if (known.has(u.path)) throw new Invalid("이미 있는 사진 이름이에요");
        // 사진 방향을 바로잡고 긴 변 1400px WebP로 맞춘다(기존 작업 사진과 같은 기준)
        const out = await sharp(u.bytes)
          .rotate()
          .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 86 })
          .toBuffer({ resolveWithObject: true });
        w.width = out.info.width;
        w.height = out.info.height;
        extra.push({ path: `public${u.path}`, base64: out.data.toString("base64") });
        // 그리드용 작은 사진(폭 600px)과, 사진이 뜨기 전에 깔아 둘 평균색도 같이 만든다
        const thumb = await sharp(out.data).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 72, effort: 6 }).toBuffer();
        extra.push({ path: `public${thumbOf(u.path)}`, base64: thumb.toString("base64") });
        const px = await sharp(out.data).resize(1, 1, { fit: "fill" }).removeAlpha().raw().toBuffer();
        w.color = "#" + [...px.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("");
        known.add(u.path);
      }
      if (works.some((w) => w.image && !known.has(w.image))) throw new Invalid("없는 사진을 가리키는 작업이 있어요");
      // 관리 화면은 평균색을 모른 채 목록을 돌려보내므로, 이미 있던 사진의 평균색은 저장된 값을 잇는다
      const colors = new Map(before.filter((w) => w.image && w.color).map((w) => [w.image!, w.color!]));
      for (const w of works) if (w.image && !w.color && colors.has(w.image)) w.color = colors.get(w.image);
      for (const p of droppedImages(before, works)) extra.push({ path: `public${p}`, delete: true }, { path: `public${thumbOf(p)}`, delete: true });
    }
    const json = serialize(items);
    const changes: Change[] = [{ path, text: json }, ...extra];
    const note = body.message.replace(/\s+/g, " ").trim().slice(0, 120);
    const saved = await commit(`${NAMES[kind]}: ${note || "고침"} (관리 화면)`, changes, { path, sha: body.sha });
    return NextResponse.json({ ok: true, commit: saved.sha, url: saved.url, items, sha: blobSha(json) });
  } catch (e) {
    return failed(e);
  }
}
