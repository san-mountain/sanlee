"use client";

import { useEffect, type RefObject } from "react";

// Keep keyboard focus in the currently visible dialog, including nested pause UI.
export function useModalFocus(root: RefObject<HTMLElement | null>, selector: string | null) {
  useEffect(() => {
    if (!selector) return;
    const dialog = root.current?.querySelector<HTMLElement>(selector);
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => [...dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), summary, [tabindex="0"]'
    )].filter((el) => el.getClientRects().length > 0);
    // preventScroll: 포커스가 게임 화면(overflow: hidden)을 밀어 올리거나 내리지 않게
    const focusFirst = () => (controls()[0] ?? dialog).focus({ preventScroll: true });
    const frame = requestAnimationFrame(focusFirst);
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = controls();
      if (!items.length) { event.preventDefault(); dialog.focus({ preventScroll: true }); return; }
      const first = items[0], last = items[items.length - 1];
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", key, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [root, selector]);
}
