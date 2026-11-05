// 얼굴 복원 장치의 그림. 파일 없이 캔버스에 먹선으로 그린다.
// 한 얼굴(512×1152)을 세 띠(위·가운데·아래, 각 384px)로 잘라 원통 세 개에 감는다.
// 원통마다 올바른 띠는 하나뿐이다. 나머지 둘은 옆으로 밀렸거나(외곽선이 끊김), 눈·코·입이 엉뚱하게 놓여 있다.
import * as THREE from "three";

export const SLICE = 384;
const W = 512;
const H = SLICE * 3;
const PAPER = "#cdb88f";
const SKIN = "#ead9b9";
const INK = "#231b17";

type Variant =
  | { kind: "true"; dx: number } // 이산의 얼굴. dx만큼 밀린 띠는 이웃과 이어지지 않는다
  | { kind: "wide" } // 너무 넓은 얼굴, 이목구비가 엉뚱하게 놓임
  | { kind: "narrow" }; // 너무 좁은 얼굴

// 원통별 세 면 (0이 정답). 어떤 다른 조합으로도 두 이음매가 동시에 이어지지 않도록 엇갈려 둔다
const DRUM_FACES: Variant[][] = [
  [{ kind: "true", dx: 0 }, { kind: "true", dx: 74 }, { kind: "wide" }],
  [{ kind: "true", dx: 0 }, { kind: "narrow" }, { kind: "true", dx: -74 }],
  [{ kind: "true", dx: 0 }, { kind: "true", dx: 74 }, { kind: "wide" }],
];

// 오른쪽(보는 사람 기준, 이산의 왼쪽) 외곽선. 이산의 왼쪽 볼이 조금 더 넓다 (약간의 비대칭)
const RIGHT: [number, number][] = [[0, 66], [92, 96], [146, 200], [160, 330], [166, 470], [162, 600], [150, 720], [128, 850], [96, 960], [52, 1040], [0, 1070]];
const LEFT: [number, number][] = [[0, 66], [-90, 98], [-142, 204], [-155, 334], [-158, 474], [-152, 604], [-140, 724], [-120, 852], [-90, 962], [-50, 1040], [0, 1070]];

function catmull(g: CanvasRenderingContext2D, pts: [number, number][], move = true) {
  if (move) g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}

function outline(g: CanvasRenderingContext2D, sx: number) {
  const r = RIGHT.map(([x, y]) => [x * sx, y] as [number, number]);
  const l = LEFT.map(([x, y]) => [x * sx, y] as [number, number]).reverse();
  g.beginPath();
  catmull(g, r);
  catmull(g, l, false);
  g.closePath();
}

// 한지 결: 고정된 씨앗으로 짧은 섬유를 흩뿌린다 (매번 같은 그림)
function paper(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.lineWidth = 1;
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const a = rnd() * Math.PI;
    const l = 4 + rnd() * 14;
    g.strokeStyle = rnd() > 0.5 ? "rgba(255,248,230,0.22)" : "rgba(90,64,30,0.12)";
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // 오래된 얼룩
  const grad = g.createRadialGradient(w * 0.3, h * 0.7, 10, w * 0.3, h * 0.7, w * 0.9);
  grad.addColorStop(0, "rgba(120,80,30,0)");
  grad.addColorStop(1, "rgba(80,50,20,0.22)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}

function ink(g: CanvasRenderingContext2D, width: number) {
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = width;
  g.lineCap = "round";
  g.lineJoin = "round";
}

function eye(g: CanvasRenderingContext2D, x: number, y: number, w: number, tilt = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  ink(g, 6);
  g.beginPath();
  g.moveTo(-w / 2, 0);
  g.quadraticCurveTo(0, -w * 0.42, w / 2, 0);
  g.stroke();
  ink(g, 3.5);
  g.beginPath();
  g.moveTo(-w / 2 + 4, 2);
  g.quadraticCurveTo(0, w * 0.22, w / 2 - 4, 1);
  g.stroke();
  g.beginPath();
  g.arc(0, -3, w * 0.15, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// 이산의 얼굴: 웃지 않는 표정, 조금 다른 두 눈, 왼쪽(보는 사람 기준 오른쪽) 보조개
function sanFace(g: CanvasRenderingContext2D) {
  outline(g, 1);
  g.fillStyle = SKIN;
  g.fill();
  // 귀: 가운데 띠 바깥
  ink(g, 6);
  for (const k of [-1, 1]) {
    g.beginPath();
    g.moveTo(k * 156, 452);
    g.bezierCurveTo(k * 196, 440, k * 200, 560, k * 158, 600);
    g.stroke();
  }
  // 머리카락: 옆가르마로 조금 흐트러진 짧은 머리. 구레나룻은 위·가운데 이음매를 지나 내려온다
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(-160, 420);
  g.lineTo(-150, 250);
  g.bezierCurveTo(-170, 120, -90, 40, 10, 44);
  g.bezierCurveTo(120, 40, 190, 120, 166, 300);
  g.lineTo(168, 420);
  g.lineTo(156, 420);
  g.lineTo(150, 290);
  g.bezierCurveTo(120, 230, 60, 250, 20, 222);
  g.bezierCurveTo(-30, 260, -80, 236, -112, 268);
  g.bezierCurveTo(-130, 290, -140, 300, -146, 420);
  g.closePath();
  g.fill();
  // 앞머리 몇 가닥
  ink(g, 5);
  for (const [a, b, c] of [[-60, 250, 290], [-20, 236, 300], [30, 226, 282]] as const) {
    g.beginPath();
    g.moveTo(a, b);
    g.quadraticCurveTo(a + 14, (b + c) / 2, a + 6, c);
    g.stroke();
  }
  // 이마의 얕은 주름 하나
  ink(g, 3);
  g.beginPath();
  g.moveTo(-50, 340);
  g.quadraticCurveTo(0, 332, 46, 342);
  g.stroke();
  // 눈썹: 이산의 왼쪽이 조금 높다
  ink(g, 9);
  g.beginPath();
  g.moveTo(-118, 436);
  g.quadraticCurveTo(-80, 418, -38, 428);
  g.stroke();
  g.beginPath();
  g.moveTo(40, 420);
  g.quadraticCurveTo(82, 404, 120, 418);
  g.stroke();
  eye(g, -76, 492, 64, 0.03);
  eye(g, 78, 484, 62, -0.05);
  // 코
  ink(g, 5);
  g.beginPath();
  g.moveTo(-6, 470);
  g.quadraticCurveTo(-16, 580, -10, 646);
  g.stroke();
  g.beginPath();
  g.moveTo(-40, 664);
  g.quadraticCurveTo(-26, 690, 0, 680);
  g.quadraticCurveTo(26, 692, 38, 662);
  g.stroke();
  // 입: 웃지 않는 일자. 이산의 왼쪽 끝이 아주 조금 내려간다
  ink(g, 7);
  g.beginPath();
  g.moveTo(-58, 832);
  g.quadraticCurveTo(-4, 824, 56, 836);
  g.stroke();
  ink(g, 4);
  g.beginPath();
  g.moveTo(-30, 866);
  g.quadraticCurveTo(0, 876, 32, 866);
  g.stroke();
  // 왼쪽 보조개
  ink(g, 5);
  g.beginPath();
  g.arc(96, 846, 12, -1.2, 1.1);
  g.stroke();
  // 턱 주름과 목
  ink(g, 4);
  g.beginPath();
  g.moveTo(-26, 990);
  g.quadraticCurveTo(0, 1002, 28, 990);
  g.stroke();
  ink(g, 6);
  outline(g, 1);
  g.stroke();
  g.beginPath();
  g.moveTo(-62, 1050);
  g.lineTo(-66, 1152);
  g.moveTo(64, 1050);
  g.lineTo(68, 1152);
  g.stroke();
}

// 맞지 않는 얼굴: 외곽선 폭이 다르고 눈·코·입이 엉뚱한 자리에 있다
function wrongFace(g: CanvasRenderingContext2D, sx: number) {
  outline(g, sx);
  g.fillStyle = SKIN;
  g.fill();
  g.fillStyle = INK;
  // 헬멧처럼 반듯한 가르마
  g.beginPath();
  g.moveTo(-150 * sx, 300);
  g.bezierCurveTo(-160 * sx, 90, 160 * sx, 90, 150 * sx, 300);
  g.lineTo(6, 200);
  g.lineTo(-6, 200);
  g.closePath();
  g.fill();
  // 이마에 뜬 눈 하나
  eye(g, 10, 330, 56, 0.4);
  // 세로로 쌓인 두 눈과 누운 코
  eye(g, -60 * sx, 440, 54, Math.PI / 2);
  eye(g, -60 * sx, 560, 54, Math.PI / 2);
  ink(g, 5);
  g.beginPath();
  g.moveTo(10, 620);
  g.quadraticCurveTo(80, 600, 110, 640);
  g.stroke();
  // 세로로 선 입과 두 개의 보조개
  ink(g, 7);
  g.beginPath();
  g.moveTo(-20, 790);
  g.quadraticCurveTo(-30, 850, -18, 920);
  g.stroke();
  ink(g, 5);
  for (const k of [-1, 1]) {
    g.beginPath();
    g.arc(k * 70 * sx, 840, 11, 0, Math.PI * 2);
    g.stroke();
  }
  ink(g, 4);
  g.beginPath();
  g.moveTo(-40, 760);
  g.quadraticCurveTo(0, 750, 40, 760);
  g.stroke();
  ink(g, 6);
  outline(g, sx);
  g.stroke();
  g.beginPath();
  g.moveTo(-62 * sx, 1050);
  g.lineTo(-66 * sx, 1152);
  g.moveTo(64 * sx, 1050);
  g.lineTo(68 * sx, 1152);
  g.stroke();
}

const fullCache = new Map<string, HTMLCanvasElement>();
function fullFace(v: Variant) {
  const key = JSON.stringify(v);
  const hit = fullCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.translate(W / 2 + (v.kind === "true" ? v.dx : 0), 0);
  if (v.kind === "true") sanFace(g);
  else wrongFace(g, v.kind === "wide" ? 1.24 : 0.78);
  fullCache.set(key, c);
  return c;
}

// 원통 하나에 감을 띠 세 장 (가로로 이어 붙임). 원통 앞면이 0번 띠가 되도록 thetaStart를 -60도로 둔다
export function drumTexture(drum: number) {
  const c = document.createElement("canvas");
  c.width = W * 3;
  c.height = SLICE;
  const g = c.getContext("2d")!;
  paper(g, c.width, c.height);
  DRUM_FACES[drum].forEach((v, k) => {
    // 얼굴 부분만 덧그린다 (종이 결은 그대로 비친다)
    g.save();
    g.beginPath();
    g.rect(k * W, 0, W, SLICE);
    g.clip();
    g.globalAlpha = 0.96;
    g.drawImage(fullFace(v), 0, drum * SLICE, W, SLICE, k * W, 0, W, SLICE);
    g.restore();
    // 면 사이를 가르는 나무 살 자국
    g.fillStyle = "rgba(40,24,10,0.55)";
    g.fillRect(k * W, 0, 6, SLICE);
  });
  // 위아래 테두리의 손때
  const edge = g.createLinearGradient(0, 0, 0, SLICE);
  edge.addColorStop(0, "rgba(40,24,10,0.35)");
  edge.addColorStop(0.08, "rgba(40,24,10,0)");
  edge.addColorStop(0.92, "rgba(40,24,10,0)");
  edge.addColorStop(1, "rgba(40,24,10,0.35)");
  g.fillStyle = edge;
  g.fillRect(0, 0, c.width, SLICE);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// 원본 얼굴에서 외곽선이 이음매를 지나는 가로 위치 (원통 앞면 기준 -0.5~0.5 비율). 이음매가 이어질 때 빛나는 자리
export function seamPoints(seam: 0 | 1) {
  const y = (seam + 1) * SLICE;
  const at = (side: [number, number][]) => {
    for (let i = 0; i < side.length - 1; i++) {
      const [x0, y0] = side[i];
      const [x1, y1] = side[i + 1];
      if (y >= y0 && y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
    }
    return 0;
  };
  // 위·가운데 이음매에서는 구레나룻 바깥선, 가운데·아래에서는 볼 외곽선
  return [at(LEFT) / W, at(RIGHT) / W];
}
// 도시가 내미는 '표준 미소': 대칭, 반달 눈, 분홍 볼, 크게 올라간 입꼬리
export function smileTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const g = c.getContext("2d")!;
  g.translate(256, -384);
  const pink = "#ff5fb0";
  g.fillStyle = "rgba(255,170,215,0.16)";
  outline(g, 1);
  g.fill();
  g.strokeStyle = pink;
  g.lineCap = "round";
  g.lineWidth = 7;
  for (const k of [-1, 1]) {
    // 반달 눈
    g.beginPath();
    g.arc(k * 77, 500, 30, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    // 볼
    g.fillStyle = "rgba(255,95,176,0.35)";
    g.beginPath();
    g.ellipse(k * 98, 720, 34, 20, 0, 0, Math.PI * 2);
    g.fill();
  }
  // 입: 귀에 걸릴 듯한 대칭 미소
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(-96, 800);
  g.quadraticCurveTo(0, 912, 96, 800);
  g.stroke();
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(-70, 820);
  g.quadraticCurveTo(0, 860, 70, 820);
  g.stroke();
  // 홀로그램 줄무늬
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "rgba(0,0,0,0.35)";
  for (let y = 0; y < 768; y += 6) g.fillRect(0, y, 512, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
