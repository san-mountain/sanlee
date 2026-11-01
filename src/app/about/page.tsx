import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SectionBody from "@/components/SectionBody";

export const metadata = { title: "About · SAN LEE" };

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="page">
        <h1>About</h1>
        <SectionBody id="about" />
      </main>
      <SiteFooter />
    </>
  );
}
