import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SectionBody from "@/components/SectionBody";

export const metadata = { title: "Writing · SAN LEE", description: "이산(San Lee)의 시와 일기. Poems and diary by San Lee." };

export default function WritingPage() {
  return (
    <>
      <SiteNav />
      <main className="page">
        <h1>Writing</h1>
        <SectionBody id="writing" />
      </main>
      <SiteFooter />
    </>
  );
}
