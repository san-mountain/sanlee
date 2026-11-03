// 기록 기계(퍼즐 B)의 캔버스 그림: 판독창 한 칸, 릴에서 흘러나오는 종이 테이프, 바퀴의 되감기 방향 표시.
// 작은 글씨를 읽지 않아도 되도록 큰 기호(✓ / ✕)와 색, 시각, 짧은 낱말을 함께 쓴다.
import * as THREE from "three";
import { FONT, MONO } from "./textures";
import type { Frame, Reel } from "./recordAudit";

export const ACCEPT_COLOR = "#2fd59a";
export const REJECT_COLOR = "#e0392c";

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

// ✓ / ✕ / 손 흔적(작은 화살표) 을 굵은 선으로 그린다
export function drawMark(g: CanvasRenderingContext2D, kind: Frame["mark"], cx: number, cy: number, r: number, color: string, alpha = 1) {
  if (kind === "none") return;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = r * (kind === "trace" ? 0.18 : 0.3);
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  if (kind === "accept") {
    g.moveTo(cx - r * 0.85, cy + r * 0.02);
    g.lineTo(cx - r * 0.25, cy + r * 0.62);
    g.lineTo(cx + r * 0.9, cy - r * 0.6);
  } else if (kind === "reject") {
    g.moveTo(cx - r * 0.7, cy - r * 0.7);
    g.lineTo(cx + r * 0.7, cy + r * 0.7);
    g.moveTo(cx + r * 0.7, cy - r * 0.7);
    g.lineTo(cx - r * 0.7, cy + r * 0.7);
  } else {
    // 손이 지나간 자국: 점선 화살표
    g.setLineDash([r * 0.22, r * 0.22]);
    g.moveTo(cx - r * 0.8, cy - r * 0.5);
    g.lineTo(cx + r * 0.6, cy + r * 0.5);
    g.setLineDash([]);
    g.moveTo(cx + r * 0.6, cy + r * 0.5);
    g.lineTo(cx + r * 0.1, cy + r * 0.45);
    g.moveTo(cx + r * 0.6, cy + r * 0.5);
    g.lineTo(cx + r * 0.5, cy + r * 0.02);
  }
  g.stroke();
  g.restore();
}

// 판독창 한 칸. 공식 릴의 칸에는 초록 동의 도장이 찍혀 있고, 그 밑에 지워지다 만 붉은 자국이 비친다
export function frameTexture(reel: Reel, frame: Frame, word: string, solved = false) {
  const w = 512;
  const h = 320;
  const [c, g] = canvas(w, h);
  const official = reel === "official";
  g.fillStyle = official ? "#eef2ea" : "#e6dcc2";
  g.fillRect(0, 0, w, h);
  // 종이 결
  g.fillStyle = "rgba(90,70,40,0.07)";
  for (let i = 0; i < 26; i++) g.fillRect((i * 83) % w, (i * 137) % h, 40 + (i % 4) * 14, 2);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#2a261e";
  fit(g, frame.time, 62, w * 0.8, MONO);
  g.fillText(frame.time, w / 2, 56);
  if (official) {
    // 덮어쓴 흔적: 거의 지워진 붉은 자국 + 그 위의 둥근 초록 도장
    g.save();
    g.globalAlpha = 0.16;
    g.fillStyle = REJECT_COLOR;
    g.beginPath();
    g.ellipse(w / 2 + 6, 168, 88, 58, 0.2, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.strokeStyle = ACCEPT_COLOR;
    g.lineWidth = 10;
    g.beginPath();
    g.arc(w / 2, 166, 76, 0, Math.PI * 2);
    g.stroke();
    drawMark(g, "accept", w / 2, 166, 46, "#169a6a");
    g.fillStyle = "#127a55";
  } else {
    const color = frame.mark === "reject" ? REJECT_COLOR : "#5b5140";
    drawMark(g, frame.mark, w / 2, 166, frame.mark === "reject" ? 68 : 54, color);
    if (frame.mark === "none") {
      g.fillStyle = "#b8ad94";
      g.fillRect(w * 0.3, 164, w * 0.4, 6);
    }
    g.fillStyle = frame.mark === "reject" ? "#a3241b" : "#4b4232";
  }
  fit(g, word, frame.mark === "reject" || official ? 58 : 42, w * 0.86);
  g.fillText(word, w / 2, 278);
  if (solved) {
    g.strokeStyle = REJECT_COLOR;
    g.lineWidth = 12;
    g.strokeRect(6, 6, w - 12, h - 12);
  }
  return finish(c);
}

// 릴에서 판독창으로 흘러가는 종이 테이프 (세로로 반복). 움직임으로 '감기고 있다'는 걸 보여 준다
export function tapeTexture(reel: Reel) {
  const w = 128;
  const h = 512;
  const [c, g] = canvas(w, h);
  const official = reel === "official";
  g.fillStyle = official ? "#eef2ea" : "#e6dcc2";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#c9bea4";
  for (let y = 8; y < h; y += 32) {
    g.fillRect(6, y, 8, 8);
    g.fillRect(w - 14, y, 8, 8);
  }
  for (let k = 0; k < 4; k++) {
    const y = k * 128 + 64;
    g.fillStyle = "rgba(40,36,28,0.5)";
    g.fillRect(28, y - 52, 72, 6);
    if (official) {
      g.strokeStyle = ACCEPT_COLOR;
      g.lineWidth = 6;
      g.beginPath();
      g.arc(w / 2, y, 26, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.fillStyle = "rgba(70,60,45,0.45)";
      g.fillRect(36, y - 4, 56, 8);
    }
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 바퀴 가운데의 되감기 방향 (↺)
export function wheelFaceTexture() {
  const s = 256;
  const [c, g] = canvas(s, s);
  g.fillStyle = "#3a2a18";
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#e8c98a";
  g.lineWidth = 16;
  g.lineCap = "round";
  g.beginPath();
  g.arc(s / 2, s / 2, 70, -Math.PI * 0.15, Math.PI * 1.35);
  g.stroke();
  // 화살촉 (반시계 방향 = 되감기)
  const a = -Math.PI * 0.15;
  const x = s / 2 + Math.cos(a) * 70;
  const y = s / 2 + Math.sin(a) * 70;
  g.fillStyle = "#e8c98a";
  g.beginPath();
  g.moveTo(x - 4, y - 34);
  g.lineTo(x + 30, y + 6);
  g.lineTo(x - 22, y + 14);
  g.closePath();
  g.fill();
  return finish(c);
}
