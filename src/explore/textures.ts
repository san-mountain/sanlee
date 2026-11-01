import * as THREE from "three";

export const FONT = `"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif`;
export const MONO = `ui-monospace, "SFMono-Regular", Menlo, Consolas, "Noto Sans KR", monospace`;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function finish(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 줄 단위 텍스트 간판. lines: [텍스트, 상대 크기]
export function signTexture(
  lines: [string, number][],
  opt: { w?: number; h?: number; color: string; bg?: string; border?: boolean; glow?: boolean; mono?: boolean; align?: "center" | "left" }
) {
  const w = opt.w ?? 512;
  const h = opt.h ?? 256;
  const [c, g] = canvas(w, h);
  if (opt.bg) {
    g.fillStyle = opt.bg;
    g.fillRect(0, 0, w, h);
  }
  if (opt.border) {
    g.strokeStyle = opt.color;
    g.lineWidth = Math.max(4, w / 120);
    g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2);
  }
  const total = lines.reduce((s, [, k]) => s + k, 0);
  const unit = (h * 0.72) / total;
  let y = (h - unit * total) / 2;
  g.textAlign = opt.align ?? "center";
  g.textBaseline = "middle";
  g.fillStyle = opt.color;
  if (opt.glow) {
    g.shadowColor = opt.color;
    g.shadowBlur = w / 40;
  }
  for (const [text, k] of lines) {
    const size = unit * k * 0.82;
    g.font = `700 ${size}px ${opt.mono ? MONO : FONT}`;
    let fit = size;
    while (g.measureText(text).width > w * 0.9 && fit > 6) {
      fit -= 2;
      g.font = `700 ${fit}px ${opt.mono ? MONO : FONT}`;
    }
    g.fillText(text, opt.align === "left" ? w * 0.06 : w / 2, y + (unit * k) / 2);
    y += unit * k;
  }
  // 스캔라인
  g.shadowBlur = 0;
  g.fillStyle = "rgba(0,0,0,0.18)";
  for (let i = 0; i < h; i += 4) g.fillRect(0, i, w, 1);
  return finish(c);
}

// 콘크리트 벽 질감 (노이즈 + 얼룩 + 거푸집 자국)
export function concreteTexture(seed = 1, tone = 58) {
  const [c, g] = canvas(256, 256);
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const img = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = tone + (r() - 0.5) * 22;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v + 3;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? "20,18,16" : "90,88,84"},${0.05 + r() * 0.08})`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 10 + r() * 50, 6 + r() * 30, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // 물 얼룩 (아래로 흘러내림)
  for (let i = 0; i < 10; i++) {
    const x = r() * 256;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "rgba(10,10,10,0.25)");
    grad.addColorStop(1, "rgba(10,10,10,0)");
    g.fillStyle = grad;
    g.fillRect(x, 0, 1 + r() * 3, 60 + r() * 190);
  }
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = 2;
  g.strokeRect(0, 0, 256, 128);
  g.strokeRect(0, 128, 256, 128);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 바닥 위험 표시 줄무늬
export function hazardTexture() {
  const [c, g] = canvas(256, 32);
  g.fillStyle = "#e8b100";
  g.fillRect(0, 0, 256, 32);
  g.fillStyle = "#111";
  for (let x = -32; x < 256; x += 32) {
    g.beginPath();
    g.moveTo(x, 32);
    g.lineTo(x + 16, 32);
    g.lineTo(x + 32, 0);
    g.lineTo(x + 16, 0);
    g.fill();
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 바코드 (시민 등에 붙는 식별표)
export function barcodeTexture() {
  const [c, g] = canvas(128, 64);
  g.fillStyle = "#ddd";
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = "#111";
  let x = 6;
  let s = 7;
  while (x < 122) {
    s = (s * 16807) % 2147483647;
    const w = 1 + (s % 4);
    g.fillRect(x, 6, w, 44);
    x += w + 1 + (s % 3);
  }
  g.font = `10px ${MONO}`;
  g.fillText("CITIZEN 0000-0000", 10, 60);
  return finish(c);
}
