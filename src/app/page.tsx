import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { profile, sections, ui } from "@/data/site";
import { T } from "@/components/LangProvider";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="page home">
        <h1>{profile.name}</h1>
        <p className="tagline">
          <T s={profile.tagline} />
        </p>
        <ul className="home-links">
          {sections.map((s) => (
            <li key={s.id}>
              <Link href={s.href}>
                {s.label} <span>{s.labelKo}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/explore" className="explore-cta">
          <T s={ui.exploreCta} />
        </Link>
      </main>
    </>
  );
}
