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
    const focusFirst = () => (controls()[0] ?? dialog).focus();
    const frame = requestAnimationFrame(focusFirst);
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = controls();
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
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
