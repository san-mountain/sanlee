"use client";

// 개발·검수용 재시작 (?debug에서만 설정창 아래에 붙는다). 게임 화면에는 아무것도 띄우지 않는다
import { useLang } from "@/components/LangProvider";
import { testUi } from "./story";

export default function PauseTest({ onA, onB }: { onA: () => void; onB: () => void }) {
  const { t } = useLang();
  return (
    <div className="pause-test" role="group" aria-label={t(testUi.title)}>
      <span>{t(testUi.title)}</span>
      <button type="button" className="btn" onClick={onA}>
        {t(testUi.restartA)}
      </button>
      <button type="button" className="btn" onClick={onB}>
        {t(testUi.restartB)}
      </button>
    </div>
  );
}
