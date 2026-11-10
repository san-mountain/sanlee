"use client";

import { setSfx, setVol, sfx, sfxOn, vol, type VolKey } from "./sfx";
import { syncBgm } from "./bgm";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LangToggle, useLang } from "@/components/LangProvider";
import { MUSIC_URL, credits, fourthWall, pause } from "./story";
import { input, saveSettings } from "./input";
import { getBackup } from "./backup";

// Esc 설정창. 실제로 쓸 수 있는 설정 몇 개와, 시스템이 방문자에게 직접 말을 거는 문장들.
export default function PauseMenu({
  onResume,
  onRestart,
  onBunker,
  since,
  inBunker,
  onLeave,
}: {
  onResume: () => void;
  // 수락 결말 뒤 줄에서 빠져나오는 유일한 길 (진행을 처음으로 되돌린다). 그 밖에는 넘기지 않는다
  onRestart?: () => void;
  onBunker?: () => void;
  since: number;
  inBunker: boolean;
  onLeave?: (e: React.MouseEvent) => void;
}) {
  const { t, lang } = useLang();
  const [sens, setSens] = useState(input.sens);
  const [bob, setBob] = useState(input.bob);
  const [sound, setSound] = useState(sfxOn());
  const [vols, setVols] = useState({ ...vol });
  const [calm, setCalm] = useState(input.calm);
  const [note, setNote] = useState<string | null>(null);
  const [free, setFree] = useState(true);
  const [line, setLine] = useState(0);
  const [ask, setAsk] = useState(false);
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
      <div className="pause" role="dialog" aria-modal="true" aria-label={t(pause.title)}>
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
          {sound &&
            (["music", "sfx", "amb"] as VolKey[]).map((k) => (
              <label key={k} className="pause-row pause-sub">
                <span>{t(pause[k])}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(vols[k] * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    setVol(k, v);
                    setVols((o) => ({ ...o, [k]: v }));
                    if (k === "music") syncBgm();
                  }}
                  onPointerUp={() => k === "sfx" && sfx.blip()}
                  onKeyUp={() => k === "sfx" && sfx.blip()}
                />
                <small>{Math.round(vols[k] * 100)}</small>
              </label>
            ))}
          <div className="pause-row">
            <span>{t(pause.calm)}</span>
            <button
              type="button"
              className={`switch ${calm ? "on" : ""}`}
              onClick={() => {
                input.calm = !calm;
                setCalm(!calm);
                saveSettings();
              }}
            >
              {t(calm ? pause.on : pause.off)}
            </button>
          </div>
          <p className="pause-note">{t(pause.calmNote)}</p>

          <p className="pause-note">
            ♪{" "}
            <a href={MUSIC_URL} target="_blank" rel="noopener noreferrer">
              {t(credits.music)}
            </a>
          </p>

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

          {onRestart && (
            <div className="pause-row">
              <span>{ask ? t(pause.restartAsk) : t(pause.restart)}</span>
              {ask ? (
                <span className="pause-confirm">
                  <button type="button" className="switch" onClick={() => setAsk(false)}>
                    {t(pause.restartNo)}
                  </button>
                  <button type="button" className="switch danger" onClick={onRestart}>
                    {t(pause.restartYes)}
                  </button>
                </span>
              ) : (
                <button type="button" className="switch danger" onClick={() => setAsk(true)}>
                  ↺
                </button>
              )}
            </div>
          )}
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
