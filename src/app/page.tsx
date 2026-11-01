import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import WorksGrid from "@/components/WorksGrid";
import { profile, ui } from "@/data/site";
import { T } from "@/components/LangProvider";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="page wide home">
        <section className="hero">
          <h1>
            <T s={profile.displayName} />
          </h1>
          <p className="tagline">
            <T s={profile.tagline} />
          </p>
          <Link href="/explore" className="explore-cta">
            <T s={ui.exploreCta} />
          </Link>
        </section>
        <section className="home-works">
          <div className="section-head">
            <h2>
              <T s={ui.selected} />
            </h2>
            <Link href="/works">
              <T s={ui.allWorks} />
            </Link>
          </div>
          <WorksGrid limit={6} />
        </section>
      </main>
    </>
  );
}
