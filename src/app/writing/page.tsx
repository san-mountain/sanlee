import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SectionBody from "@/components/SectionBody";

export const metadata = { title: "Writing · SAN LEE" };

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
