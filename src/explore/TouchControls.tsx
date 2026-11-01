"use client";

import { useEffect, useRef } from "react";
import { input } from "./input";

// 왼쪽 아래 가상 조이스틱. 엄지가 처음 닿은 자리에 생긴다.
export function Joystick() {
  const zone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = zone.current!;
    let id: number | null = null;
    let ox = 0;
    let oy = 0;
    const R = 46;
    const down = (e: PointerEvent) => {
      if (id !== null) return;
      id = e.pointerId;
      el.setPointerCapture(id);
      const r = el.getBoundingClientRect();
      ox = e.clientX;
      oy = e.clientY;
      base.current!.style.left = `${ox - r.left}px`;
      base.current!.style.top = `${oy - r.top}px`;
      base.current!.classList.add("on");
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox;
      let dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      knob.current!.style.transform = `translate(${dx}px, ${dy}px)`;
      input.joy.x = dx / R;
      input.joy.y = -dy / R;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      input.joy.x = 0;
      input.joy.y = 0;
      knob.current!.style.transform = "";
      base.current!.classList.remove("on");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);
  return (
    <div className="joy-zone" ref={zone}>
      <div className="joy-base" ref={base}>
        <div className="joy-knob" ref={knob} />
      </div>
    </div>
  );
}

// 화면 어디든 끌면 고개를 돌린다 (마우스·터치 공통). 키보드 입력도 여기서 받는다.
export function useLookAndKeys(target: React.RefObject<HTMLElement | null>, onInteract: () => void, active: boolean) {
  const cb = useRef(onInteract);
  cb.current = onInteract;
  useEffect(() => {
    input.enabled = active;
    if (!active) {
      input.keys.clear();
      input.joy.x = input.joy.y = 0;
    }
  }, [active]);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(".joy-zone, button, a, .panel")) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p || !input.enabled) return;
      const k = e.pointerType === "touch" ? 0.0055 : 0.0038;
      input.look.yaw -= (e.clientX - p.x) * k;
      input.look.pitch -= (e.clientY - p.y) * k;
      p.x = e.clientX;
      p.y = e.clientY;
    };
    const up = (e: PointerEvent) => pts.delete(e.pointerId);
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") {
        if (input.enabled) cb.current();
        if (e.code === "Space") e.preventDefault();
        return;
      }
      if (!input.enabled) return;
      if (e.code.startsWith("Arrow")) e.preventDefault();
      input.keys.add(e.code);
    };
    const ku = (e: KeyboardEvent) => input.keys.delete(e.code);
    const blur = () => input.keys.clear();
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
    };
  }, [target]);
}
