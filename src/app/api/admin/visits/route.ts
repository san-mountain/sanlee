import { NextResponse } from "next/server";
import { isOwner } from "@/lib/admin/auth";
import { analyticsReady, pipeline, strHashOf, visitKey, visitPagesKey, VISITS } from "@/lib/analytics/store";
import { visitOf, type VisitLog } from "@/lib/analytics/visit";

export const dynamic = "force-dynamic";
const PAGE = 30;

// 관리 화면의 "최근 방문" 목록: 최근 것부터 30개씩. before(밀리초)를 주면 그보다 앞선 방문부터
export async function GET(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  if (!analyticsReady()) return NextResponse.json({ visits: [], more: false });
  const raw = new URL(req.url).searchParams.get("before");
  const before = raw && /^\d{1,15}$/.test(raw) ? `(${raw}` : "+inf";
  try {
    const [ids] = (await pipeline([["ZREVRANGEBYSCORE", VISITS, before, "-inf", "LIMIT", 0, PAGE + 1]])) as string[][];
    const page = (ids ?? []).slice(0, PAGE);
    const out = page.length ? await pipeline(page.flatMap((id) => [["HGETALL", visitKey(id)], ["LRANGE", visitPagesKey(id), 0, -1]])) : [];
    const visits = page
      .map((id, i) => visitOf(id, strHashOf(out[i * 2]), ((out[i * 2 + 1] as string[]) ?? []).map(String)))
      .filter((v): v is VisitLog => !!v);
    return NextResponse.json({ visits, more: (ids ?? []).length > PAGE });
  } catch (e) {
    console.error("[visits]", e);
    return NextResponse.json({ error: "최근 방문을 불러오지 못했어요" }, { status: 502 });
  }
}
