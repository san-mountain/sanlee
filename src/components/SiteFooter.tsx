import { contact } from "@/data/site";
import EmailLink from "./EmailLink";

// 모든 일반 페이지 아래의 얇은 꼬리말: 이름과 연락처만
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© 2026 이산 San Lee</span>
      <span className="site-footer-links">
        <EmailLink />
        {contact.links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </span>
    </footer>
  );
}
