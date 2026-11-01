"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sections, type SectionId } from "@/data/site";
import { LangToggle, useLang } from "@/components/LangProvider";
import SectionBody from "@/components/SectionBody";
import { plaque, statueLines, ui } from "./story";
import { LANDMARKS, type Focus } from "./layout";

const World = dynamic(() => import("./World"), { ssr: false });

const KEY = "sanlee-visited";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type Panel = { kind: "section"; id: SectionId } | { kind: "statue"; step: number } | null;

export default function ExploreClient() {
  const { t } = useLang();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [intro, setIntro] = useState(true);
  const [focus, setFocus] = useState<Focus>("spawn");
  const [panel, setPanel] = useState<Panel>(null);
  const [visited, setVisited] = useState<SectionId[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const labelEls = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setWebgl(hasWebGL());
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(v)) setVisited(v.filter((x) => sections.some((s) => s.id === x)));
    } catch {}
  }, []);

  const openSection = useCallback((id: SectionId) => {
    setPanel(null);
    setFocus(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPanel({ kind: "section", id });
      setVisited((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        setToast(`${t(ui.restored)} · ${next.length}/3`);
        setTimeout(() => setToast(null), 2600);
        return next;
      });
    }, 750);
  }, [t]);

  const openStatue = useCallback(() => {
    clearTimeout(timer.current);
    setPanel(null);
    setFocus("statue");
    timer.current = setTimeout(() => setPanel({ kind: "statue", step: 0 }), 650);
  }, []);

  const backToPlaza = () => {
    clearTimeout(timer.current);
    setPanel(null);
    setFocus("spawn");
  };

  if (webgl === false) {
    return (
      <main className="fallback-root">
        <div className="fallback">
          <h1 style={{ fontFamily: "var(--mono)", color: "var(--cyan)" }}>{t(ui.title)}</h1>
          <p>{t(ui.noWebgl)}</p>
          <Link href="/" className="btn primary">
            {t(ui.toPortfolio)}
          </Link>
        </div>
      </main>
    );
  }

  const lines = statueLines[Math.min(visited.length, 3)];
  const sectionMeta = panel?.kind === "section" ? sections.find((s) => s.id === panel.id)! : null;

  return (
    <main className="explore-root">
      {webgl && (
        <World
          focus={focus}
          visited={visited}
          onSelectSection={openSection}
          onSelectStatue={openStatue}
          labelEls={labelEls}
        />
      )}

      {webgl && (
        <div className="labels">
          {LANDMARKS.map((l) => (
            <div key={l.id} className="label-anchor" ref={(el) => { labelEls.current[l.id] = el; }}>
              <div className={`label3d ${visited.includes(l.id) ? "done" : ""}`} style={{ color: l.color }}>
                {l.id.toUpperCase()}
                <small>{t(l.sub)}</small>
              </div>
            </div>
          ))}
          <div className="label-anchor" ref={(el) => { labelEls.current.popup = el; }}>
            <div className="cookie-popup">
              <p>{t(ui.popup)}</p>
              <div>
                <span className="cp-accept">{t(ui.accept)}</span>
                <span className="cp-reject">{t(ui.reject)}</span>
              </div>
            </div>
          </div>
          <div className="label-anchor" ref={(el) => { labelEls.current.plaque = el; }}>
            <div className="plaque3d">{t(ui.plaqueShort)}</div>
          </div>
        </div>
      )}

      <div className="hud">
        <Link href="/">{t(ui.home)}</Link>
        <span className="hud-title glitch">{t(ui.title)}</span>
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="hud-progress">{visited.length}/3</span>
          <LangToggle />
        </span>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {!panel && !intro && <div className="hint">{t(ui.hint)}</div>}

      {panel?.kind === "section" && sectionMeta && (
        <div className="panel-wrap">
          <div className="panel">
            <div className="panel-head">
              <h2>{sectionMeta.label.toUpperCase()}</h2>
              <small>{sectionMeta.labelKo}</small>
            </div>
            <SectionBody id={panel.id} inExplore />
            <div className="panel-actions">
              <button className="btn" onClick={backToPlaza}>
                {t(ui.back)}
              </button>
              <Link className="btn" href={sectionMeta.href}>
                {t(ui.normalPage)}
              </Link>
            </div>
          </div>
        </div>
      )}

      {panel?.kind === "statue" && (
        <div className="panel-wrap">
          <div className="panel pink">
            <div className="plaque">
              {plaque.map((p, i) => (
                <div key={i}>{t(p)}</div>
              ))}
            </div>
            <p className="line">“{t(lines[Math.min(panel.step, lines.length - 1)])}”</p>
            <div className="panel-actions">
              <button className="btn" onClick={backToPlaza}>
                {t(ui.close)}
              </button>
              {panel.step < lines.length - 1 && (
                <button className="btn primary" onClick={() => setPanel({ kind: "statue", step: panel.step + 1 })}>
                  {t(ui.next)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {intro && (
        <div className="intro">
          <div className="panel pink">
            <div className="panel-head">
              <h2 className="glitch">{t(ui.title)}</h2>
              <LangToggle />
            </div>
            {ui.introLines.map((l, i) => (
              <p key={i}>{t(l)}</p>
            ))}
            <div className="panel-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn primary" onClick={() => setIntro(false)}>
                {t(ui.start)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
