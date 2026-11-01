"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { backupUi, ui } from "./story";

// 백업이 저장되는 순간 화면 아래 가운데에 잠깐 뜨는 알림. 세이브 포인트처럼 보이게 한다.
// 첫 백업은 동의 창이 직접 알려 주므로 여기서는 두 번째부터. 두 번째에는 뜻을 한 번 더 붙인다.
export default function SaveToast() {
  const { t } = useLang();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let to: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { kind: string; n: number } | string;
      if (typeof d !== "object" || d.kind !== "save" || d.n < 2) return;
      setN(d.n);
      clearTimeout(to);
      to = setTimeout(() => setN(null), 2600);
    };
    window.addEventListener("sanlee-backup", on);
    return () => {
      window.removeEventListener("sanlee-backup", on);
      clearTimeout(to);
    };
  }, []);
  if (n === null) return null;
  return (
    <div className="save-toast" role="status">
      <b>{t(backupUi.saved).replace("{n}", String(n))}</b>
      {n <= 3 && <span>{t(ui.savedHint)}</span>}
    </div>
  );
}
