"use client";

import { useState } from "react";
import { contact } from "@/data/site";
import { useLang } from "./LangProvider";

// 메일 앱이 없는 컴퓨터나 인스타그램 같은 앱 속 브라우저에서는 mailto가 아무 반응이 없다.
// 그래서 누르면 주소를 먼저 복사해 두고, 메일 앱이 있으면 그대로 열린다.
export default function EmailLink({ className }: { className?: string }) {
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    navigator.clipboard?.writeText(contact.email).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      },
      () => {}
    );
  };
  return (
    <span className={`email-link ${className ?? ""}`}>
      <a href={`mailto:${contact.email}`} onClick={onClick}>
        {contact.email}
      </a>
      <span className={`email-copied ${copied ? "on" : ""}`} role="status" aria-live="polite">
        {copied ? (lang === "ko" ? "주소 복사됨" : "Copied") : ""}
      </span>
    </span>
  );
}
