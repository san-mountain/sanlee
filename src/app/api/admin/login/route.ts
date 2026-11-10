import { NextResponse } from "next/server";
import { checkPassword, configured, COOKIE, newSession, sameOrigin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// 같은 서버 인스턴스 안에서 틀린 비밀번호가 이어지면 잠깐 쉬게 한다(마구 넣어 보기 늦추기)
const misses = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 403 });
  if (!configured())
    return NextResponse.json({ error: "아직 관리 화면 설정(ADMIN_PASSWORD, GITHUB_TOKEN)이 안 되어 있어요" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "?";
  const m = misses.get(ip);
  if (m && m.until > Date.now()) return NextResponse.json({ error: "잠시 뒤에 다시 시도해 주세요" }, { status: 429 });

  const { password } = await req.json().catch(() => ({}));
  if (!checkPassword(password)) {
    const n = (m?.n ?? 0) + 1;
    misses.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 * Math.min(n - 4, 30) : 0 });
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "비밀번호가 맞지 않아요" }, { status: 401 });
  }
  misses.delete(ip);
  const s = newSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, s.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: s.maxAge,
  });
  return res;
}
