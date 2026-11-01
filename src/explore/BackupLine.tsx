"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { backupUi } from "./story";
import { clock, getBackup, lastSlot } from "./backup";
import type { Zone } from "./zones";

// 구역 이름 아래 흐린 한 줄. 저장되는 순간에만 2초 동안 밝아진다. 방공호 안에서는 신호가 없다.
export default function BackupLine({ zone }: { zone: Zone }) {
  const { t } = useLang();
  const [, bump] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  useEffect(() => {
    let to: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      bump((x) => x + 1);
      if ((e as CustomEvent).detail === "save") {
        setFlash(getBackup().n);
        clearTimeout(to);
        to = setTimeout(() => setFlash(null), 2000);
      }
    };
    window.addEventListener("sanlee-backup", on);
    return () => {
      window.removeEventListener("sanlee-backup", on);
      clearTimeout(to);
    };
  }, []);
  const b = getBackup();
  const slot = lastSlot();
  let text: string;
  let cls = "backup-line";
  if (flash !== null) {
    text = t(backupUi.saved).replace("{n}", String(flash));
    cls += " flash";
  } else if (zone === "bunker") {
    text = t(backupUi.noSignal);
    cls += " off";
  } else if (b.deleted) {
    text = t(backupUi.deleted);
    cls += " gone";
  } else if (slot) text = `BACKUP #${slot.n} · ${clock(slot.t)}`;
  else text = t(backupUi.none);
  return <div className={cls}>{text}</div>;
}
