import TopLink from "@/components/TopLink";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WorksGrid from "@/components/WorksGrid";
import { about, profile, ui } from "@/data/site";
import { T } from "@/components/LangProvider";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="page wide home">
        <h1 className="sr-only">
          <T s={profile.displayName} />
        </h1>
        {/* 첫 화면에만: 작가 노트의 첫 문장 한 줄 */}
        <p className="home-line">
          <T s={about.homeLine} />
        </p>
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
