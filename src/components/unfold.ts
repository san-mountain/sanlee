// 시 펼치기·접기: 종이가 아래로 풀려 내려가듯 높이가 늘어나며 위에서부터 드러나고, 연이 차례로 맺힌다.
// 한 번에 시 하나만 펼쳐 둔다. 움직임 줄이기 설정이면 바로 열고 닫는다.
export function unfold(d: HTMLDetailsElement, open: boolean) {
  const body = d.querySelector<HTMLElement>(".poem-body");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (open) {
    d.parentElement?.querySelectorAll<HTMLDetailsElement>(`details[data-group="${d.dataset.group}"][open]`).forEach((o) => {
      if (o !== d) unfold(o, false);
    });
  }
  if (!body || reduce || !body.animate) {
    d.open = open;
    return;
  }
  body.getAnimations().forEach((a) => a.cancel());
  if (open) {
    delete d.dataset.closing;
    d.open = true;
    const h = body.scrollHeight;
    const dur = Math.min(1100, Math.max(450, h * 0.7));
    body.style.overflow = "hidden";
    const a = body.animate(
      [
        { height: "0px", clipPath: "inset(0 0 100% 0)" },
        { height: `${h}px`, clipPath: "inset(0 0 0% 0)" },
      ],
      { duration: dur, easing: "cubic-bezier(.22,.8,.24,1)" }
    );
    a.onfinish = () => (body.style.overflow = "");
    body.querySelectorAll<HTMLElement>(".stanza").forEach((s, i) => {
      s.animate(
        [
          { opacity: 0, transform: "translateY(-6px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 520, delay: Math.min(i * 90, dur * 0.8), easing: "ease-out", fill: "backwards" }
      );
    });
  } else {
    if (!d.open) return;
    d.dataset.closing = "1";
    const h = body.offsetHeight;
    body.style.overflow = "hidden";
    const a = body.animate(
      [
        { height: `${h}px`, clipPath: "inset(0 0 0% 0)", opacity: 1 },
        { height: "0px", clipPath: "inset(0 0 100% 0)", opacity: 0.4 },
      ],
      { duration: Math.min(700, Math.max(320, h * 0.4)), easing: "cubic-bezier(.4,0,.6,1)" }
    );
    a.onfinish = () => {
      body.style.overflow = "";
      if (d.dataset.closing === "1") d.open = false;
      delete d.dataset.closing;
    };
  }
}
