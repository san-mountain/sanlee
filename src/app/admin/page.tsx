import type { Metadata } from "next";
import { configured, isOwner } from "@/lib/admin/auth";
import AdminClient from "@/components/admin/AdminClient";
import AdminLogin from "@/components/admin/AdminLogin";
import "./admin.css";

// 사이트 주인만 쓰는 화면: 검색에 나오지 않게 하고, 매번 로그인 상태를 새로 확인한다
export const metadata: Metadata = { title: "관리 · SAN LEE", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const owner = await isOwner();
  return <main className="admin">{owner ? <AdminClient /> : <AdminLogin ready={configured()} />}</main>;
}
