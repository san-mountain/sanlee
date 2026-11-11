import { contact } from "@/data/site";
import EmailLink from "./EmailLink";
import ForgetCity from "./ForgetCity";

// 모든 일반 페이지 아래의 얇은 꼬리말: 이름과 연락처만.
// About은 본문에 연락처가 있으므로 꼬리말에서는 뺀다(contact={false})
export default function SiteFooter({ contact: show = true }: { contact?: boolean }) {
  return (
    <footer className="site-footer">
      <span>© 2026 이산 San Lee</span>
      <span className="site-footer-links">
        {show && <EmailLink />}
        {show &&
          contact.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        <ForgetCity />
      </span>
    </footer>
  );
}
