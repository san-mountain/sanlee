import type { Metadata } from "next";
import { aiSpellReady, configured, isOwner } from "@/lib/admin/auth";
import { brush } from "../fonts-brush";
import AdminClient from "@/components/admin/AdminClient";
import AdminLogin from "@/components/admin/AdminLogin";
import "./admin.css";

// 사이트 주인만 쓰는 화면: 검색에 나오지 않게 하고, 매번 로그인 상태를 새로 확인한다
export const metadata: Metadata = { title: "관리 · SAN LEE", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const owner = await isOwner();
  // 글 편집 칸은 사이트의 시와 같은 고운바탕으로 보여 준다
  return <main className={`admin ${brush.variable}`}>{owner ? <AdminClient aiSpell={aiSpellReady()} /> : <AdminLogin ready={configured()} />}</main>;
}
