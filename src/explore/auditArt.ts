// 기록 검증 장치의 캔버스 그림: 입력·처리 결과 표시창, 불일치 표시, 감사 기록지.
// 작은 글씨를 읽지 않아도 되도록 큰 기호(✓ / ✕)와 색, 짧은 낱말을 함께 쓴다.
import * as THREE from "three";
import { FONT, MONO } from "./textures";
import type { AuditChoice } from "./recordAudit";

export const ACCEPT_COLOR = "#2fe3c0";
export const REJECT_COLOR = "#ff4a3d";

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
function fit(g: CanvasRenderingContext2D, text: string, size: number, max: number, font = FONT) {
  let s = size;
  g.font = `700 ${s}px ${font}`;
  while (g.measureText(text).width > max && s > 8) {
    s -= 2;
    g.font = `700 ${s}px ${font}`;
  }
}

// 체크(✓) 또는 엑스(✕)를 굵은 선으로 그린다
export function drawMark(g: CanvasRenderingContext2D, kind: AuditChoice, cx: number, cy: number, r: number, color: string) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = r * 0.32;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.shadowColor = color;
  g.shadowBlur = r * 0.4;
  g.beginPath();
  if (kind === "accept") {
    g.moveTo(cx - r * 0.85, cy + r * 0.02);
    g.lineTo(cx - r * 0.25, cy + r * 0.62);
    g.lineTo(cx + r * 0.9, cy - r * 0.6);
  } else {
    g.moveTo(cx - r * 0.7, cy - r * 0.7);
    g.lineTo(cx + r * 0.7, cy + r * 0.7);
    g.moveTo(cx + r * 0.7, cy - r * 0.7);
    g.lineTo(cx - r * 0.7, cy + r * 0.7);
  }
  g.stroke();
  g.restore();
}

// 입력 / 처리 결과 표시창. value가 null이면 꺼진 창
export function ioTexture(label: string, sub: string, value: AuditChoice | null, word: string) {
  const w = 384;
  const h = 320;
  const [c, g] = canvas(w, h);
  const color = value === "accept" ? ACCEPT_COLOR : value === "reject" ? REJECT_COLOR : "#4a4740";
  g.fillStyle = "#0a0b0c";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = color;
  g.lineWidth = 8;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#d8cfbf";
  fit(g, label, 54, w * 0.86);
  g.fillText(label, w / 2, 48);
  g.fillStyle = "#8d877a";
  fit(g, sub, 26, w * 0.86, MONO);
  g.fillText(sub, w / 2, 88);
  if (value) {
    drawMark(g, value, w / 2, 170, 62, color);
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 12;
    fit(g, word, 58, w * 0.86);
    g.fillText(word, w / 2, 270);
  } else {
    g.fillStyle = "#3a3832";
    g.font = `700 64px ${MONO}`;
    g.fillText("—", w / 2, 190);
  }
  g.shadowBlur = 0;
  g.fillStyle = "rgba(0,0,0,0.2)";
  for (let i = 0; i < h; i += 4) g.fillRect(0, i, w, 1);
  return finish(c);
}

// 두 표시창 사이: 같으면 '=' 일치, 다르면 '≠' 불일치
export function relationTexture(state: "match" | "mismatch" | null, word: string) {
  const w = 192;
  const h = 256;
  const [c, g] = canvas(w, h);
  g.fillStyle = "#0a0b0c";
  g.fillRect(0, 0, w, h);
  if (state) {
    const color = state === "match" ? ACCEPT_COLOR : REJECT_COLOR;
    g.strokeStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.lineWidth = 16;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(48, 92);
    g.lineTo(144, 92);
    g.moveTo(48, 140);
    g.lineTo(144, 140);
    if (state === "mismatch") {
      g.moveTo(124, 56);
      g.lineTo(68, 176);
    }
    g.stroke();
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "middle";
    fit(g, word, 40, w * 0.9);
    g.fillText(word, w / 2, 220);
  }
  return finish(c);
}

// 감사 기록지: 누렇게 바랜 감열지에 찍힌 한 줄. 핵심 줄은 크게
export function slipTexture(tag: string, line: string, who: string) {
  const w = 512;
  const h = 640;
  const [c, g] = canvas(w, h);
  g.fillStyle = "#e9e1cc";
  g.fillRect(0, 0, w, h);
  // 바랜 얼룩과 천공
  g.fillStyle = "rgba(120,96,50,0.12)";
  for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, (i * 151) % h, 30 + (i % 5) * 12, 3);
  g.fillStyle = "#cfc5ad";
  for (let y = 20; y < h; y += 40) {
    g.beginPath();
    g.arc(18, y, 6, 0, Math.PI * 2);
    g.arc(w - 18, y, 6, 0, Math.PI * 2);
    g.fill();
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#4b4232";
  fit(g, tag, 30, w * 0.8, MONO);
  g.fillText(tag, w / 2, 60);
  g.fillRect(60, 92, w - 120, 3);
  drawMark(g, "reject", w / 2, 220, 80, "#b0201a");
  g.fillStyle = "#1d1a14";
  const [time, rest] = line.split(" — ");
  fit(g, time, 50, w * 0.8, MONO);
  g.fillText(time, w / 2, 370);
  fit(g, rest ?? line, 58, w * 0.84);
  g.fillText(rest ?? line, w / 2, 440);
  g.fillStyle = "#5d5442";
  fit(g, who, 22, w * 0.86);
  g.fillText(who, w / 2, 540);
  g.fillRect(60, 580, w - 120, 2);
  return finish(c);
}
