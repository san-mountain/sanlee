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
// PC에서는 화면을 클릭하면 마우스가 잠기고, 마우스를 움직이는 대로 시점이 돈다 (FPS 게임처럼). Esc로 해제.
export function useLookAndKeys(
  target: React.RefObject<HTMLElement | null>,
  onInteract: () => void,
  active: boolean,
  onLockChange?: (locked: boolean) => void
) {
  const cb = useRef(onInteract);
  cb.current = onInteract;
  const lockCb = useRef(onLockChange);
  lockCb.current = onLockChange;
  useEffect(() => {
    input.enabled = active;
    if (!active) {
      input.keys.clear();
      input.joy.x = input.joy.y = 0;
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [active]);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    const locked = () => document.pointerLockElement === el;
    const down = (e: PointerEvent) => {
      if (locked()) {
        // 잠긴 상태의 클릭 = 상호작용
        if (e.button === 0 && input.enabled) cb.current();
        return;
      }
      if ((e.target as HTMLElement).closest(".joy-zone, button, a, .panel, .choice, .ending, .intro")) return;
      if (e.pointerType === "mouse" && input.enabled && el.requestPointerLock) {
        try {
          const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
          r?.catch?.(() => {});
        } catch {}
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const mouseMove = (e: MouseEvent) => {
      if (!locked() || !input.enabled) return;
      input.look.yaw -= e.movementX * 0.0022;
      input.look.pitch -= e.movementY * 0.0022;
    };
    const lockChange = () => {
      pts.clear();
      lockCb.current?.(locked());
    };
    const move = (e: PointerEvent) => {
      if (locked()) return;
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
    window.addEventListener("mousemove", mouseMove);
    document.addEventListener("pointerlockchange", lockChange);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("pointerlockchange", lockChange);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
    };
  }, [target]);
}
