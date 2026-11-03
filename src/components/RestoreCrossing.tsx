"use client";

// DELETE SEOUL에서 로그아웃해 돌아올 때: 들어갈 때 지워졌던 글자가 위에서부터 한 글자씩 다시 쓰이고,
// 어두운 바탕이 밝아지며 그림이 돌아온다 (들어갈 때 장면을 거꾸로).
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export const RESTORE_KEY = "sanlee-restore";

export default function RestoreCrossing() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    let flag = false;
    try {
      flag = sessionStorage.getItem(RESTORE_KEY) !== null;
      sessionStorage.removeItem(RESTORE_KEY);
    } catch {}
    if (!flag || pathname.startsWith("/deleteseoul")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const body = document.body;
    body.classList.remove("deleting");
    body.classList.add("restoring");

    const scope = document.querySelectorAll(".page, .site-footer, .nav-logo, .nav-links > a:not(.nav-explore), .nav-lang");
    const nodes: { n: Text; full: string; start: number }[] = [];
    scope.forEach((el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
        if (n.data.trim()) nodes.push({ n, full: n.data, start: 0 });
      }
    });
    // 화면 위쪽 글자부터 다시 쓰여 아래로 번진다
    const vh = innerHeight;
    nodes.forEach((o) => {
      const r = o.n.parentElement?.getBoundingClientRect();
      const y = r ? Math.min(1, Math.max(0, r.top / vh)) : 1;
      o.start = 260 + y * 420 + Math.random() * 120;
      o.n.data = "";
    });
    const DUR = 520;
    let raf = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      for (const o of nodes) if (o.n.data !== o.full) o.n.data = o.full;
      body.classList.remove("restoring");
    };
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      let alive = false;
      for (const o of nodes) {
        const k = Math.min(1, Math.max(0, (t - o.start) / DUR));
        if (k < 1) alive = true;
        const keep = Math.round(o.full.length * k);
        if (o.n.data.length !== keep) o.n.data = o.full.slice(0, keep);
      }
      if (alive && t < 1800) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    // 바탕은 글자가 다 쓰이기 전부터 밝아지기 시작한다
    const light = setTimeout(() => body.classList.add("restoring-light"), 380);
    const clean = setTimeout(() => body.classList.remove("restoring-light"), 2400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(light);
      clearTimeout(clean);
      finish();
      body.classList.remove("restoring-light");
    };
  }, [pathname]);
  return null;
}
