import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WorksGrid from "@/components/WorksGrid";

export const metadata = { title: "Works · SAN LEE", description: "이산(San Lee)의 그림, 조각, 인터랙티브 작업. Paintings, sculpture and interactive work by San Lee." };

export default function WorksPage() {
  return (
    <>
      <SiteNav />
      <main className="page wide">
        <h1>Works</h1>
        <WorksGrid />
      </main>
      <SiteFooter />
    </>
  );
}
