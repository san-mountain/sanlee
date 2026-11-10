import { NextResponse } from "next/server";
import { isOwner } from "@/lib/admin/auth";
import { deployState } from "@/lib/admin/github";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  const sha = new URL(req.url).searchParams.get("sha") ?? "";
  if (!/^[0-9a-f]{40}$/.test(sha)) return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  try {
    return NextResponse.json({ state: await deployState(sha) });
  } catch {
    return NextResponse.json({ state: "unknown" });
  }
}
