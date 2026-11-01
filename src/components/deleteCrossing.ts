// DELETE SEOUL로 건너가는 장면: 흰 페이지의 글자가 뒤에서부터 한 글자씩 지워지고(空),
// 그림은 사라지고, 바탕이 어두워진 뒤 /deleteseoul로 넘어간다. 움직임 줄이기 설정이면 바로 넘어간다.
export function deleteCrossing(go: () => void) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return go();
  const root = document.body;
  if (root.classList.contains("deleting")) return;
  root.classList.add("deleting");

  // 메뉴의 네온 간판은 남기고, 나머지 글자를 모은다
  const scope = document.querySelectorAll(".page, .site-footer, .nav-logo, .nav-links > a:not(.nav-explore), .nav-lang");
  const nodes: { n: Text; full: string; start: number }[] = [];
  scope.forEach((el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
      if (n.data.trim()) nodes.push({ n, full: n.data, start: 0 });
    }
  });
  // 화면 아래쪽 글자부터 지워지기 시작해 위로 번진다
  const vh = innerHeight;
  nodes.forEach((o) => {
    const r = o.n.parentElement?.getBoundingClientRect();
    const y = r ? Math.min(1, Math.max(0, r.top / vh)) : 1;
    o.start = (1 - y) * 380 + Math.random() * 120;
  });

  const DUR = 520; // 한 덩어리를 다 지우는 데 걸리는 시간
  const t0 = performance.now();
  const tick = (now: number) => {
    const t = now - t0;
    let alive = false;
    for (const o of nodes) {
      const k = Math.min(1, Math.max(0, (t - o.start) / DUR));
      if (k < 1) alive = true;
      const keep = Math.round(o.full.length * (1 - k));
      if (o.n.data.length !== keep) o.n.data = o.full.slice(0, keep);
    }
    if (alive && t < 1600) requestAnimationFrame(tick);
    else setTimeout(go, 260);
  };
  requestAnimationFrame(tick);
}
