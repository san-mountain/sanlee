import SiteNav from "@/components/SiteNav";
import SectionBody from "@/components/SectionBody";

export const metadata = { title: "Works · SAN LEE" };

export default function WorksPage() {
  return (
    <>
      <SiteNav />
      <main className="page">
        <h1>Works</h1>
        <SectionBody id="works" />
      </main>
    </>
  );
}
