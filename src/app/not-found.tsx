import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import TopLink from "@/components/TopLink";
import Han from "@/components/Han";
import { T } from "@/components/LangProvider";
import { ui } from "@/data/site";

export const metadata = { title: "404 · SAN LEE" };

// 없는 주소: 사이트의 종이 위에 空 한 글자와 한 줄
export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="page not-found">
        <h1>404</h1>
        <p className="nf-han" aria-hidden>
          <Han ch="空" />
        </p>
        <p>
          <T s={ui.notFound} />
        </p>
        <p className="nf-back">
          <TopLink href="/works">
            <T s={ui.notFoundBack} />
          </TopLink>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
