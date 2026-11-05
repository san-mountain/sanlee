"use client";

import { tension, sfx } from "./sfx";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { gaze, resetGaze } from "./gaze";
import { player, teleport } from "./Player";
import { getBackup, recordDeath, recordRestore, saveBackup } from "./backup";
import { restoreCovers } from "./Jabi";
import { jabiUi } from "./story";

// 대자비의 시선 게이지, 붉은 화면 가장자리, 보관 처리(죽음) 연출과 되살리기
// 한 글자씩 타자되듯 찍히는 줄
function TypeLine({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      iv = setInterval(() => setN((k) => (k >= text.length ? k : k + 1)), 38);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(iv);
    };
  }, [text, delay]);
  return (
    <p className={className}>
      {text.slice(0, n)}
      {n < text.length && <span className="type-caret">▍</span>}
    </p>
  );
}

type Dead = { kind: "restore"; line: string; cost: boolean } | { kind: "gone" };

export default function GazeHUD({
  rootRef,
  onGone,
  onIntro,
  onStage,
}: {
  rootRef: React.RefObject<HTMLElement | null>;
  onGone: () => void;
  onIntro?: () => void;
  onStage?: () => void;
}) {
  const introRef = useRef(onIntro);
  introRef.current = onIntro;
  const stageRef = useRef(onStage);
  stageRef.current = onStage;
  const { t } = useLang();
  const goneRef = useRef(onGone);
  goneRef.current = onGone;
  const wrap = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const [dead, setDead] = useState<Dead | null>(null);
  const shown = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    let raf = 0;
    let deadShown = false;
    let armed = false; // 게이지가 의심 이상까지 찼다가 숨어서 바닥을 치면 백업
    let prevState = gaze.state;
    let prevHidden = "";
    const loop = () => {
      raf = requestAnimationFrame(loop);
      // 시선 단계가 올라갈 때, 그리고 숨는 데 성공했을 때 효과음
      if (gaze.state !== prevState) {
        const up = ["idle", "watch", "suspect", "charge", "lock"];
        if (up.indexOf(gaze.state) > up.indexOf(prevState)) {
          if (gaze.state === "watch") sfx.watch();
          else if (gaze.state === "suspect") sfx.suspect();
          else if (gaze.state === "charge") sfx.charge();
          else if (gaze.state === "lock") sfx.lock();
        }
        prevState = gaze.state;
      }
      const hid = gaze.inZone ? gaze.hiddenBy : "";
      if (hid && !prevHidden && gaze.meter > 20) sfx.hidden();
      prevHidden = hid;
      const root = rootRef.current;
      const m = gaze.meter / 100;
      const hot = gaze.state === "lock" || gaze.state === "fire" ? 1 : m;
      // 게이지가 차오르는 동안 긴장음 (발사되거나 쓰러지면 멈춘다)
      tension(gaze.dead || gaze.state === "fire" || gaze.mood === "blind" || gaze.intro ? 0 : m);
      root?.style.setProperty("--gaze", String(hot));
      // 방문 기록을 지운 사람에게는 자비의 시선이 닿지 않으므로 게이지도 띄우지 않는다
      const visible = gaze.mood !== "blind" && (gaze.inZone || gaze.meter > 1 || gaze.state === "fire" || gaze.state === "cool");
      if (wrap.current) {
        wrap.current.style.opacity = visible ? "1" : "0";
        wrap.current.dataset.state = gaze.state;
        wrap.current.dataset.hidden = gaze.hiddenBy;
      }
      if (fill.current) fill.current.style.width = `${Math.round(hot * 100)}%`;
      if (label.current) {
        const key = gaze.state === "fire" ? "fire" : gaze.state === "lock" ? "lock" : gaze.hiddenBy && gaze.inZone ? (gaze.hiddenBy === "line" ? "line" : "hidden") : gaze.state;
        const s = tRef.current(jabiUi.states[key as keyof typeof jabiUi.states] ?? jabiUi.states.idle);
        if (label.current.textContent !== s) label.current.textContent = s;
      }
      // 처음 시선 구역에 들어서면 소개 장면을 연다 (방문마다 한 번: 탭을 새로 열면 다시 나온다). 이미 봤다면 곡만 바꾼다 (요령 문단을 따로 띄우지 않는다)
      if (gaze.inZone && !shown.current && gaze.mood !== "blind") {
        shown.current = true;
        let seenIntro = false;
        try {
          seenIntro = sessionStorage.getItem("sanlee-jabi-intro") === "1";
        } catch {}
        // 소개 팝업이 뜨면 대자비 무대(음악)는 팝업을 닫을 때 시작된다 (ExploreClient의 endJabiIntro)
        if (!seenIntro && introRef.current) introRef.current();
        else stageRef.current?.();
      }
      if (gaze.meter >= 35) armed = true;
      if (armed && gaze.meter <= 0.5 && gaze.inZone && gaze.hiddenBy && !gaze.dead) {
        armed = false;
        saveBackup(player.pos.x, player.pos.z);
      }
      if (gaze.dead && !deadShown) {
        deadShown = true;
        armed = false;
        sfx.glitch();
        recordDeath();
        const b = getBackup();
        if (b.deleted) {
          // 숨은 결말의 대가: 백업을 지운 사람은 되살아나지 않는다
          setDead({ kind: "gone" });
          setTimeout(() => {
            deadShown = false;
            setDead(null);
            goneRef.current();
          }, 4200);
          return;
        }
        // 쓰러지면 그 자리가 아니라 시선 구역 입구, 대자비 앞에서 처음부터 다시 시작한다
        const line = tRef.current(jabiUi.restoreStart);
        setDead({ kind: "restore", line, cost: b.deaths >= 3 });
        setTimeout(() => {
          teleport.req = { x: 0, z: 7, yaw: 0 };
          restoreCovers();
          resetGaze();
          recordRestore();
          sfx.restore();
          deadShown = false;
          setDead(null);
        }, 3400);
      }
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      tension(0);
    };
  }, [rootRef]);

  return (
    <>
      <div className="gaze" ref={wrap} aria-hidden>
        <span className="gaze-name">{t(jabiUi.name)}</span>
        <div className="gaze-bar">
          <div className="gaze-fill" ref={fill} />
        </div>
        <span className="gaze-state" ref={label} />
      </div>
      <div className="gaze-vignette" aria-hidden />
      {dead && (
        <div className={`archived ${dead.kind === "gone" ? "gone" : ""}`}>
          <div>
            <p className="big">{t(jabiUi.deadTitle)}</p>
            {dead.kind === "restore" ? (
              <>
                <TypeLine className="restore-line" text={dead.line} delay={700} />
                {dead.cost && <p className="restore-cost">{t(jabiUi.cost)}</p>}
              </>
            ) : (
              <>
                <TypeLine className="restore-line" text={t(jabiUi.noBackup)} delay={900} />
                <p className="restore-cost">{t(jabiUi.noBackupSub)}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
