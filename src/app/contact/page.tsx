import SiteNav from "@/components/SiteNav";
import SectionBody from "@/components/SectionBody";

export const metadata = { title: "Contact · SAN LEE" };

export default function ContactPage() {
  return (
    <>
      <SiteNav />
      <main className="page">
        <h1>Contact</h1>
        <SectionBody id="contact" />
      </main>
    </>
  );
}
