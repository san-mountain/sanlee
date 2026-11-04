"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { eraseStory, readStory } from "./story";
import styles from "./ExploreV2.module.css";

export default function EraseOutside() {
  const { lang } = useLang();
  const [erased, setErased] = useState(false);
  const en = lang === "en";
  const clear = () => {
    eraseStory();
    // This erases only the prototype's own key; original /deleteseoul saves remain untouched.
    setErased(true);
  };

  return (
    <main style={{ minHeight: "100dvh", background: "#091119", color: "#e7f2f0", display: "grid", placeItems: "center", padding: 20 }}>
      <div className={styles.card} style={{ margin: "0 auto" }}>
        <div className={styles.eyebrow}>SANLEE.KR / OUTSIDE THE WORLD / 2026</div>
        <h1>DELETE SEOUL</h1>
        {!erased ? (
          <>
            <p>{en ? "You have stepped outside the 2087 simulation." : "당신은 2087년의 세계 밖으로 나왔습니다."}</p>
            <p>{en ? "The program will remain. What can disappear is this browser's record of the world you experienced." : "프로그램은 남습니다. 지울 수 있는 것은 이 브라우저가 기억하는 당신의 세계입니다."}</p>
            <p>{en ? "R-07's friendship, the child's drawing, and San's restored state belong to that record. This action is not reversible." : "R-07과의 우정, 아이의 그림, 복원된 이산의 상태도 그 기록에 속합니다. 이 행동은 되돌릴 수 없습니다."}</p>
            <div className={styles.actions}>
              <Link className={styles.secondary} href="/deleteseoul-lab">{en ? "Return without erasing" : "지우지 않고 돌아가기"}</Link>
              <button type="button" className={styles.danger} onClick={clear}>{en ? "Erase this browser's v2 record" : "이 브라우저의 실험판 기록 삭제"}</button>
            </div>
          </>
        ) : (
          <>
            <h2>{en ? "No record remains." : "기록이 남지 않았습니다."}</h2>
            <p>{en ? "The world can start again. But the people inside will not remember what you did together." : "세계는 다시 시작할 수 있습니다. 하지만 그 안의 사람들은 당신과 함께했던 일을 기억하지 못합니다."}</p>
            <div className={styles.actions}>
              <Link className={styles.secondary} href="/">{en ? "Back to portfolio" : "포트폴리오로"}</Link>
              <Link className={styles.primary} href="/deleteseoul-lab">{en ? "Enter Seoul again" : "서울에 다시 접속"}</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
