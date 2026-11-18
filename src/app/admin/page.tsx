import type { Metadata } from "next";
import { configured, isOwner } from "@/lib/admin/auth";
import { brush } from "../fonts-brush";
import AdminClient, { type Initial } from "@/components/admin/AdminClient";
import { FILES } from "@/lib/admin/content";
import { readFiles } from "@/lib/admin/github";
import AdminLogin from "@/components/admin/AdminLogin";
import "./admin.css";

// 사이트 주인만 쓰는 화면: 검색에 나오지 않게 하고, 매번 로그인 상태를 새로 확인한다
export const metadata: Metadata = { title: "관리 · SAN LEE", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 글·작업·분류 목록을 화면과 함께 서버에서 미리 읽어 보낸다. 브라우저가 화면을 띄운 뒤에 다시 서버와 GitHub에 물으러 가지 않아도 된다.
// 실패하면 비워 보내고, 그때는 화면이 예전처럼 스스로 불러온다
async function initial(): Promise<Initial> {
  try {
    const [poems, works, meta] = await readFiles([FILES.poems, FILES.works, FILES.meta]);
    const of = (f: { text: string; sha: string }) => ({ items: JSON.parse(f.text), sha: f.sha });
    return { poems: of(poems), works: of(works), meta: { value: JSON.parse(meta.text), sha: meta.sha } };
  } catch (e) {
    console.error("[admin] 처음 목록을 미리 읽지 못했어요", e);
    return {};
  }
}

export default async function AdminPage() {
  const owner = await isOwner();
  // 글 편집 칸은 사이트의 시와 같은 고운바탕으로 보여 준다
  return <main className={`admin ${brush.variable}`}>{owner ? <AdminClient initial={await initial()} /> : <AdminLogin ready={configured()} />}</main>;
}
