import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { lite } from "./quality";

// 사람 형태를 하나의 지오메트리로 합쳐 인스턴싱에 쓴다 (키 약 1.75m, 발이 y=0)
function place(g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: [number, number, number] = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(...s)
  );
  g.applyMatrix4(m);
  return g.index ? g.toNonIndexed() : g;
}

function lathe(points: [number, number][], seg = 14) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    seg
  );
}

let human: THREE.BufferGeometry | null = null;
// 긴 코트를 입은 얼굴 없는 시민
// 휴대폰(lite)에서는 줄과 행진의 시민 수백 명이 같은 모양이라, 면을 반쯤 줄인 모양을 쓴다 (멀리서는 구별되지 않는다)
export function citizenGeometry() {
  if (human) return human;
  const L = lite;
  const parts = [
    // 머리 (살짝 갸름하게)
    place(new THREE.SphereGeometry(0.115, L ? 10 : 16, L ? 7 : 12), 0, 1.62, 0, 0, 0, 0, [0.92, 1.12, 1]),
    place(new THREE.CylinderGeometry(0.045, 0.055, 0.12, L ? 6 : 10), 0, 1.5, 0),
    // 코트: 어깨에서 무릎까지 퍼지는 실루엣
    place(
      lathe([
        [0.0, 0.55],
        [0.22, 0.55],
        [0.2, 0.8],
        [0.17, 1.05],
        [0.18, 1.22],
        [0.21, 1.36],
        [0.2, 1.43],
        [0.1, 1.48],
        [0.0, 1.49],
      ], L ? 9 : 14),
      0, 0, 0, 0, 0, 0, [1, 1, 0.68]
    ),
    // 옷깃
    place(new THREE.TorusGeometry(0.075, 0.025, L ? 4 : 6, L ? 8 : 14), 0, 1.45, 0, Math.PI / 2),
    // 팔 (몸에 붙인 차렷 자세)
    place(new THREE.CapsuleGeometry(0.048, 0.5, L ? 2 : 4, L ? 5 : 8), -0.235, 1.12, 0, 0, 0, 0.06),
    place(new THREE.CapsuleGeometry(0.048, 0.5, L ? 2 : 4, L ? 5 : 8), 0.235, 1.12, 0, 0, 0, -0.06),
    place(new THREE.SphereGeometry(0.045, L ? 5 : 8, L ? 4 : 6), -0.25, 0.83, 0),
    place(new THREE.SphereGeometry(0.045, L ? 5 : 8, L ? 4 : 6), 0.25, 0.83, 0),
    // 다리와 신발
    place(new THREE.CapsuleGeometry(0.058, 0.5, L ? 2 : 4, L ? 5 : 8), -0.085, 0.33, 0),
    place(new THREE.CapsuleGeometry(0.058, 0.5, L ? 2 : 4, L ? 5 : 8), 0.085, 0.33, 0),
    place(new THREE.BoxGeometry(0.1, 0.06, 0.22), -0.085, 0.03, 0.04),
    place(new THREE.BoxGeometry(0.1, 0.06, 0.22), 0.085, 0.03, 0.04),
  ];
  human = mergeGeometries(parts)!;
  return human;
}

let visor: THREE.BufferGeometry | null = null;
// 눈을 가리는 발광 바이저 (시민 모두가 같은 것을 쓴다)
// 도시의 표준 미소 (줄 선 시민): 이산에게 붙는 것과 같은 크게 올라간 입꼬리와 분홍 볼. 눈은 바이저가 가린다
let smile: THREE.BufferGeometry | null = null;
export function smileGeometry() {
  if (smile) return smile;
  smile = mergeGeometries([
    place(new THREE.TorusGeometry(0.036, 0.0055, 5, 16, Math.PI), 0, 1.588, 0.112, 0.25, 0, Math.PI),
    place(new THREE.CircleGeometry(0.016, 12), -0.056, 1.606, 0.098, 0, -0.55, 0),
    place(new THREE.CircleGeometry(0.016, 12), 0.056, 1.606, 0.098, 0, 0.55, 0),
  ])!;
  return smile;
}

export function visorGeometry() {
  if (visor) return visor;
  visor = place(new THREE.CylinderGeometry(0.122, 0.122, 0.035, 18, 1, true, -1.1, 2.2), 0, 1.645, 0, 0, 0, 0, [0.95, 1, 1.05]);
  return visor;
}

// 계단식으로 좁아지는 탑 (관리 타워)
export function overseerGeometry() {
  return lathe(
    [
      [0, 0],
      [26, 0],
      [24, 30],
      [18, 32],
      [17, 70],
      [12, 72],
      [11, 104],
      [8, 106],
      [7.5, 116],
      [0, 116],
    ],
    6
  );
}

// 한옥 지붕: 처마 끝(모서리)이 살짝 들린 네모뿔대. 가로·세로 1, 높이 1 기준.
let roof: THREE.BufferGeometry | null = null;
export function roofGeometry() {
  if (roof) return roof;
  // 휴대폰에서는 둘레를 반으로 (4의 배수라 네 모서리는 그대로 들린다)
  const g = new THREE.CylinderGeometry(0.22, 0.72, 0.5, lite ? 24 : 48, 4, false);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    // 원을 정사각형으로 펴기
    const m = Math.max(Math.abs(x), Math.abs(z));
    const sx = (x / m) * r;
    const sz = (z / m) * r;
    // 아래로 갈수록 오목하게 휘고, 네 모서리는 위로 들림
    const t = 0.5 - y; // 0(꼭대기)~1(처마)
    const corner = Math.pow((Math.abs(sx) * Math.abs(sz)) / (r * r), 2);
    const lift = t * t * corner * 0.22 - t * (1 - t) * 0.12;
    p.setXYZ(i, sx, y + lift, sz);
  }
  g.translate(0, 0.25, 0);
  g.computeVertexNormals();
  roof = g;
  return g;
}
