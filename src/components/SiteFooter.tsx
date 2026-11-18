import { contact } from "@/data/site";
import EmailLink from "./EmailLink";
import ForgetCity from "./ForgetCity";
import { T } from "./LangProvider";

// 모든 일반 페이지 아래의 얇은 꼬리말: 이름과 연락처만.
// About은 본문에 연락처가 있으므로 꼬리말에서는 뺀다(contact={false})
export default function SiteFooter({ contact: show = true }: { contact?: boolean }) {
  return (
    <footer className="site-footer">
      <span>
        © 2026 이산 San Lee
        {/* 방문 기록을 모으므로 알린다(관리 화면의 방문 탭) */}
        <span className="site-footer-note">
          <T s={{ ko: "방문 통계를 쿠키 없이 모아요. IP는 저장하지 않아요.", en: "Visit statistics are collected without cookies. IP addresses are not stored." }} />
        </span>
      </span>
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
