"use client";

import { setSfx, sfx, sfxOn } from "./sfx";
import { syncBgm } from "./bgm";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LangToggle, useLang } from "@/components/LangProvider";
import { fourthWall, pause } from "./story";
import { input, saveSettings } from "./input";
import { getBackup } from "./backup";

// Esc 설정창. 실제로 쓸 수 있는 설정 몇 개와, 시스템이 방문자에게 직접 말을 거는 문장들.
export default function PauseMenu({
  onResume,
  onReset,
  onBunker,
  since,
  inBunker,
  onLeave,
}: {
  onResume: () => void;
  onReset: () => void;
  onBunker?: () => void;
  since: number;
  inBunker: boolean;
  onLeave?: (e: React.MouseEvent) => void;
}) {
  const { t, lang } = useLang();
  const [sens, setSens] = useState(input.sens);
  const [bob, setBob] = useState(input.bob);
  const [sound, setSound] = useState(sfxOn());
  const [note, setNote] = useState<string | null>(null);
  const [free, setFree] = useState(true);
  const [line, setLine] = useState(0);
  const [, tick] = useState(0);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const iv = setInterval(() => {
      setLine((l) => l + 1);
      tick((x) => x + 1);
    }, 6500);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => () => clearTimeout(noteTimer.current), []);

  const say = (s: string) => {
    setNote(s);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 3600);
  };

  const fill = (s: string) =>
    s
      .replace("{time}", new Date().toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-GB", { hour: "2-digit", minute: "2-digit" }))
      .replace("{min}", String(Math.max(1, Math.round((Date.now() - since) / 60000))))
      .replace("{w}", String(window.innerWidth))
      .replace("{h}", String(window.innerHeight))
      .replace("{copy}", String(getBackup().restores + 1));

  return (
    <div className="pause-wrap">
      <div className="pause" role="dialog" aria-label={t(pause.title)}>
        <div className="pause-head">
          <h2 className="glitch">{t(pause.title)}</h2>
          <p>{t(pause.sub)}</p>
        </div>

        <div className="pause-rows">
          <label className="pause-row">
            <span>{t(pause.sens)}</span>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.05}
              value={sens}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSens(v);
                input.sens = v;
                saveSettings();
              }}
            />
            <small>{sens.toFixed(2)}×</small>
          </label>
          <p className="pause-note">{t(pause.sensNote)}</p>

          <div className="pause-row">
            <span>{t(pause.bob)}</span>
            <button
              type="button"
              className={`switch ${bob ? "on" : ""}`}
              onClick={() => {
                input.bob = !bob;
                setBob(!bob);
                saveSettings();
              }}
            >
              {t(bob ? pause.on : pause.off)}
            </button>
          </div>

          <div className="pause-row">
            <span>{t(pause.sound)}</span>
            <button
              type="button"
              className={`switch ${sound ? "on" : ""}`}
              onClick={() => {
                setSfx(!sound);
                setSound(!sound);
                syncBgm();
                if (!sound) sfx.blip();
              }}
            >
              {t(sound ? pause.on : pause.off)}
            </button>
          </div>

          <div className="pause-row">
            <span>{t(pause.lang)}</span>
            <LangToggle />
          </div>

          <div className="pause-row locked">
            <span>{t(pause.humanity)}</span>
            <input type="range" min={0} max={100} value={0} disabled readOnly />
            <small>🔒 {t(pause.humanityNote)}</small>
          </div>

          <div className="pause-row">
            <span>{t(pause.freeWill)}</span>
            <button
              type="button"
              className={`switch ${free ? "" : "on"}`}
              onClick={() => {
                // 눌러도 잠깐 바뀌었다가 원래대로 돌아온다
                setFree(false);
                setTimeout(() => setFree(true), 450);
                say(t(pause.freeWillNo));
              }}
            >
              {t(free ? pause.off : pause.on)}
            </button>
          </div>

          <div className="pause-row">
            <span>{t(pause.cookies)}</span>
            <button type="button" className="switch" onClick={() => say(t(pause.cookiesNo))}>
              ⚙
            </button>
          </div>

          <div className="pause-row">
            <span>{t(pause.reset)}</span>
            <button
              type="button"
              className="switch danger"
              onClick={() => {
                onReset();
                say(t(pause.resetNote));
              }}
            >
              ⌫
            </button>
          </div>
        </div>

        <p className="pause-wall" key={line}>
          {note ?? fill(t(fourthWall[line % fourthWall.length]))}
        </p>

        <div className="pause-actions">
          <Link className="btn" href="/" onClick={onLeave}>
            {t(pause.leave)}
          </Link>
          {onBunker && (
            <button className="btn" title={t(pause.bunkerNote)} onClick={onBunker}>
              {t(pause.bunker)}
            </button>
          )}
          <button className="btn primary" autoFocus onClick={onResume}>
            {t(pause.resume)}
          </button>
        </div>
      </div>
    </div>
  );
}
