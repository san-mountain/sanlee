import { NextResponse } from "next/server";
import { COOKIE, sameOrigin } from "@/lib/admin/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
