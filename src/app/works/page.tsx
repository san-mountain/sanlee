import SiteNav from "@/components/SiteNav";
import WorksGrid from "@/components/WorksGrid";

export const metadata = { title: "Works · SAN LEE" };

export default function WorksPage() {
  return (
    <>
      <SiteNav />
      <main className="page wide">
        <h1>Works</h1>
        <WorksGrid />
      </main>
    </>
  );
}
