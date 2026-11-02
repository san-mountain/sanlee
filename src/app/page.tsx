import TopLink from "@/components/TopLink";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WorksGrid from "@/components/WorksGrid";
import { profile, ui } from "@/data/site";
import { T } from "@/components/LangProvider";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="page wide home">
        <h1 className="sr-only">
          <T s={profile.displayName} />
        </h1>
        <WorksGrid limit={6} />
        <div className="home-more">
          <TopLink href="/works">
            <T s={ui.allWorks} />
          </TopLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
