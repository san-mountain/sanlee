import { NextResponse } from "next/server";
import { isOwner } from "@/lib/admin/auth";
import { analyticsReady, dayKey, hashOf, pipeline, visitorKey } from "@/lib/analytics/store";
import { lastDays, summarize } from "@/lib/analytics/visit";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];

// 관리 화면의 "방문" 탭: 최근 며칠 동안의 방문 기록을 모아서 돌려준다
export async function GET(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  if (!analyticsReady()) return NextResponse.json({ ready: false });
  const n = Number(new URL(req.url).searchParams.get("days"));
  if (!RANGES.includes(n)) return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  const days = lastDays(n);
  try {
    const out = await pipeline(days.flatMap((d) => [["HGETALL", dayKey(d)], ["PFCOUNT", visitorKey(d)]]));
    const hashes = days.map((_, i) => hashOf(out[i * 2]));
    const visitors = days.map((_, i) => Number(out[i * 2 + 1]) || 0);
    return NextResponse.json({ ready: true, ...summarize(days, hashes, visitors) });
  } catch (e) {
    console.error("[stats]", e);
    return NextResponse.json({ error: "방문 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요" }, { status: 502 });
  }
}
