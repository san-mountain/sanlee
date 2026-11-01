import Link from "next/link";
import { profile, sections, ui } from "@/data/site";
import { LangToggle, T } from "./LangProvider";

export default function SiteNav() {
  return (
    <header className="nav">
      <Link href="/" className="nav-logo">
        {profile.name}
      </Link>
      <nav>
        {sections.map((s) => (
          <Link key={s.id} href={s.href}>
            {s.label}
          </Link>
        ))}
        <Link href="/explore" className="nav-explore">
          <T s={ui.explore} />
        </Link>
        <LangToggle />
      </nav>
    </header>
  );
}
