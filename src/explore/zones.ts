import * as THREE from "three";
import type { L, SectionId } from "@/data/site";
import { works } from "@/data/site";
import { box, type Box, type Circle } from "./collide";
import { faceRt } from "./faceRuntime";
import { route } from "./gaze";
import { faceUi } from "./story";

export type Vec3 = [number, number, number];
export type Zone = "bunker" | "city";

export type Interactable = {
  id: string;
  kind: "section" | "painting" | "statue" | "npc" | "door" | "checkpoint" | "backup" | "face" | "note";
  // 쪽지 번호 (NOTES의 순서)
  note?: number;
  pos: THREE.Vector3; // NPC처럼 움직이는 것은 컴포넌트가 이 값을 갱신
  radius: number;
  label: L;
  color?: string;
  section?: SectionId;
  work?: number;
  npc?: string;
  to?: Zone;
  // false면 지금은 가까이 가도 상호작용 대상이 아니다 (연출 단계에 따라 켜고 끈다)
  when?: () => boolean;
};

export type ZoneDef = {
  spawn: { pos: Vec3; yaw: number };
  // 다른 구역에서 돌아올 때 나타나는 자리 (없으면 spawn)
  entry?: { pos: Vec3; yaw: number };
  bounds: Box;
  boxes: Box[];
  circles: Circle[];
  items: Interactable[];
  ceiling?: number;
};

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* ---------------- 지하 방공호 B-7 ---------------- */
// 방 크기: x -12~12, z -20~14, 천장 7.5m. 동상은 (0,0), 정면은 +z.
export const BUNKER_W = 24;
// 이산 옆의 얼굴 복원 장치. 정면이 다가오는 사람(방 입구 쪽)과 이산 사이를 향한다
export const FACE_MACHINE = { pos: [3.3, 0, 1.3] as Vec3, rotY: -0.55 };
// 장치 기준 좌표(정면 +z)를 방 좌표로
export function machinePoint(x: number, y: number, z: number) {
  const c = Math.cos(FACE_MACHINE.rotY);
  const s = Math.sin(FACE_MACHINE.rotY);
  return new THREE.Vector3(FACE_MACHINE.pos[0] + x * c + z * s, y, FACE_MACHINE.pos[2] - x * s + z * c);
}
export const BUNKER_Z0 = -20;
export const BUNKER_Z1 = 14;
export const BUNKER_H = 7.5;

export const TERMINALS: { id: SectionId; pos: Vec3; rotY: number; color: string; sub: L }[] = [
  { id: "about", pos: [-10.9, 0, -4], rotY: Math.PI / 2, color: "#22f0ff", sub: { ko: "소개", en: "who" } },
  { id: "writing", pos: [10.9, 0, -4], rotY: -Math.PI / 2, color: "#a77bff", sub: { ko: "글", en: "words" } },
  // 작업 터미널은 그림이 걸린 입구 쪽 벽 가운데
  { id: "works", pos: [0, 0, 12.9], rotY: Math.PI, color: "#ff2bd6", sub: { ko: "작업", en: "what" } },
];

// 그림 8점: 양쪽 벽과 입구 쪽 벽에 건다
const imageWorks = works.map((w, i) => ({ w, i })).filter(({ w }) => w.image);
const SLOTS: { pos: Vec3; rotY: number }[] = [
  { pos: [-11.94, 2.6, 8], rotY: Math.PI / 2 },
  { pos: [11.94, 2.6, 8], rotY: -Math.PI / 2 },
  { pos: [-11.94, 2.6, 3.6], rotY: Math.PI / 2 },
  { pos: [11.94, 2.6, 3.6], rotY: -Math.PI / 2 },
  { pos: [-11.94, 2.6, -11], rotY: Math.PI / 2 },
  { pos: [11.94, 2.6, -11], rotY: -Math.PI / 2 },
  { pos: [-5.5, 2.6, 13.94], rotY: Math.PI },
  { pos: [5.5, 2.6, 13.94], rotY: Math.PI },
];
// 벽은 여덟 칸 그대로다. 작업이 여덟 점을 넘으면 칸마다 여러 점을 나눠 맡고(최근 것이 각 칸의 첫 장), 그림 앞에서 넘겨 본다.
// 처음 들어설 때 올리는 그림은 늘 칸마다 한 장이라 작업이 늘어도 느려지지 않는다
export const PAINTING_SLOTS = SLOTS.map((s, k) => ({ ...s, slot: k, works: imageWorks.filter((_, j) => j % SLOTS.length === k).map(({ i }) => i) })).filter((s) => s.works.length > 0);
// 칸마다 지금 걸린 장 (이번 방문 동안만). 넘기면 'sanlee-paint'로 알린다
export const paintPage = { at: SLOTS.map(() => 0) };
export function flipPainting(slot: number) {
  const s = PAINTING_SLOTS.find((p) => p.slot === slot);
  if (!s || s.works.length < 2) return;
  paintPage.at[slot] = (paintPage.at[slot] + 1) % s.works.length;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("sanlee-paint"));
}

// 끊긴 백업 단말: 지상에서 만든 백업이 흘러드는 곳. 신호가 안 닿는 여기서만 지울 수 있다
export const BACKUP_RACK = { pos: [11.3, 0, -7.6] as Vec3, rotY: -Math.PI / 2 };

// 지워진 사람들이 방공호 곳곳에 남긴 쪽지 다섯 장. rotY = 종이가 향한 쪽, flat = 바닥·침대에 눕혀 놓음
export const NOTES: { pos: Vec3; rotY: number; flat?: boolean }[] = [
  { pos: [-6.5, 1.5, 6.615], rotY: 0 }, // 입구 쪽 왼편 기둥
  { pos: [6.5, 1.3, -14.615], rotY: Math.PI }, // 무전수 쪽 기둥 뒷면
  { pos: [-10.75, 0.53, 12.25], rotY: 0, flat: true }, // 잠든 사람의 간이침대 머리맡
  { pos: [11.985, 1.2, 11.4], rotY: -Math.PI / 2 }, // R-07이 닦는 구석의 벽
  { pos: [7.6, 1.15, -19.585], rotY: 0 }, // 아이의 분필 그림 옆 벽
];

export const PILLARS: Vec3[] = [
  [-6.5, 0, 6],
  [6.5, 0, 6],
  [-6.5, 0, -14],
  [6.5, 0, -14],
];

export const BUNKER_NPCS = {
  keeper: { pos: [-4.6, 0, -17.2] as Vec3, rotY: 0.5 },
  r07: { pos: [7.8, 0, 11] as Vec3, rotY: -2.4 },
  // 불단 앞에서 좌선하는 스님
  monk: { pos: [-9.6, 0, -17.6] as Vec3, rotY: 0.35 },
  // 지상 주파수를 듣는 무전수
  radio: { pos: [9.3, 0, -16.8] as Vec3, rotY: Math.PI / 2 },
  // 벽에 분필로 그림을 그리는 아이
  kid: { pos: [5.6, 0, -19.1] as Vec3, rotY: Math.PI },
  // 간이침대에서 잠든 사람
  sleeper: { pos: [-10.6, 0, 11.4] as Vec3, rotY: 0 },
  // 벽 쪽 믹서 앞에서 음악을 트는 음향 담당
  dj: { pos: [-11.3, 0, -7.4] as Vec3, rotY: -Math.PI / 2 },
};
const bnpc = (id: keyof typeof BUNKER_NPCS, label: L, y = 1.2, radius = 2.6): Interactable => ({
  id,
  kind: "npc",
  npc: id,
  pos: v(BUNKER_NPCS[id].pos[0], y, BUNKER_NPCS[id].pos[2]),
  radius,
  label,
});

export const BUNKER: ZoneDef = {
  spawn: { pos: [0, 0, 10.5], yaw: 0 },
  // 지상에서 내려오면 방폭문 앞에서 방 안쪽을 바라본다
  entry: { pos: [0, 0, -16.8], yaw: Math.PI },
  ceiling: BUNKER_H,
  bounds: { x0: -12, x1: 12, z0: -19.6, z1: 14 },
  boxes: [
    ...PILLARS.map(([x, , z]) => box(x, z, 1.2, 1.2)),
    ...TERMINALS.map((t) => (Math.abs(t.pos[0]) > 1 ? box(t.pos[0] + Math.sign(t.pos[0]) * 0.3, t.pos[2], 1.4, 1.6) : box(t.pos[0], t.pos[2] + 0.3, 1.6, 1.4))),
    box(-4.6, -18.6, 2.8, 1.2), // 관리인 책상
    box(BACKUP_RACK.pos[0], BACKUP_RACK.pos[2], 0.9, 1.1), // 끊긴 백업 단말
    box(-9.6, -19.3, 2.4, 1.1), // 불단
    box(10.9, -16.8, 1.2, 2.4), // 무전 탁자
    box(-10.75, 11.4, 1.1, 2.3), // 간이침대
    box(-10.3, -7.4, 0.9, 1.8), // 믹서 탁자
    box(FACE_MACHINE.pos[0], FACE_MACHINE.pos[2], 1.5, 1.3), // 얼굴 복원 장치
  ],
  circles: [
    { x: 0, z: 0, r: 2.15 },
    { x: BUNKER_NPCS.keeper.pos[0], z: BUNKER_NPCS.keeper.pos[2], r: 0.4 },
    { x: BUNKER_NPCS.r07.pos[0], z: BUNKER_NPCS.r07.pos[2], r: 0.55 },
    { x: BUNKER_NPCS.monk.pos[0], z: BUNKER_NPCS.monk.pos[2], r: 0.55 },
    { x: BUNKER_NPCS.radio.pos[0], z: BUNKER_NPCS.radio.pos[2], r: 0.45 },
    { x: BUNKER_NPCS.kid.pos[0], z: BUNKER_NPCS.kid.pos[2], r: 0.3 },
    { x: BUNKER_NPCS.dj.pos[0], z: BUNKER_NPCS.dj.pos[2], r: 0.4 },
  ],
  items: [
    ...TERMINALS.map<Interactable>((t) => ({
      id: t.id,
      kind: "section",
      section: t.id,
      pos: v(t.pos[0] + Math.sin(t.rotY), 1.4, t.pos[2] + Math.cos(t.rotY)),
      radius: 3.3,
      color: t.color,
      label: { ko: `${t.id.toUpperCase()} 터미널`, en: `${t.id.toUpperCase()} terminal` },
    })),
    // 그림은 가까이 가면 옆 벽에 홀로그램 캡션이 뜬다 (Bunker.tsx HoloCaption). 여러 점을 맡은 칸만 상호작용 대상이 된다: 다음 그림으로 넘긴다
    ...PAINTING_SLOTS.filter((s) => s.works.length > 1).map((s) => ({
      id: `painting-${s.slot}`,
      kind: "painting" as const,
      work: s.slot,
      pos: v(s.pos[0] + Math.sin(s.rotY) * 1.2, 1.6, s.pos[2] + Math.cos(s.rotY) * 1.2),
      radius: 2.6,
      label: { ko: "그림", en: "Painting" },
    })),
    { id: "statue", kind: "statue", pos: v(0, 1.5, 0), radius: 3.8, label: { ko: "정지 시민", en: "Suspended citizen" } },
    // 얼굴 복원 장치: 터미널 셋을 연 뒤 맞추는 동안만 대상이 된다 (바라보는 원통을 돌린다)
    { id: "face-machine", kind: "face", pos: machinePoint(0, 1.7, 0.35), radius: 3.2, label: faceUi.quest, when: () => faceRt.phase === "idle" },
    // 얼굴을 맞춘 뒤 도시가 내미는 두 조작부: 왼쪽 분홍 버튼, 오른쪽 나무 레버
    { id: "face-std", kind: "face", pos: machinePoint(-0.56, 1.0, 0.3), radius: 2.6, label: faceUi.applyStandard, color: "#ff79c0", when: () => faceRt.phase === "choice" },
    { id: "face-keep", kind: "face", pos: machinePoint(0.56, 1.2, 0.3), radius: 2.6, label: faceUi.keepOriginal, color: "#f1d6a0", when: () => faceRt.phase === "choice" },
    {
      id: "keeper",
      kind: "npc",
      npc: "keeper",
      pos: v(BUNKER_NPCS.keeper.pos[0], 1.5, BUNKER_NPCS.keeper.pos[2]),
      radius: 2.6,
      label: { ko: "방공호 관리인", en: "Shelter keeper" },
    },
    {
      id: "r07",
      kind: "npc",
      npc: "r07",
      pos: v(BUNKER_NPCS.r07.pos[0], 0.9, BUNKER_NPCS.r07.pos[2]),
      radius: 2.4,
      label: { ko: "R-07", en: "R-07" },
    },
    bnpc("monk", { ko: "스님", en: "Monk" }, 0.9),
    bnpc("radio", { ko: "무전수", en: "Radio operator" }),
    bnpc("kid", { ko: "그림 그리는 아이", en: "Child drawing" }, 0.9, 2.4),
    bnpc("dj", { ko: "음향 담당 진성", en: "Jinseong, on sound" }),
    bnpc("sleeper", { ko: "잠든 사람", en: "Sleeper" }, 0.6, 2.4),
    { id: "exit", kind: "door", to: "city", pos: v(0, 1.6, -19), radius: 3.6, label: { ko: "지상 출구", en: "Surface exit" } },
    ...NOTES.map<Interactable>((n, i) => ({ id: `note-${i}`, kind: "note", note: i, pos: v(n.pos[0], n.pos[1], n.pos[2]), radius: 1.7, label: { ko: "쪽지", en: "Note" }, color: "#f3ead2" })),
  ],
};

/* ---------------- 지상: 하늘에 뜬 감시구역 7 ---------------- */
// 도시 전체가 구름 위에 떠 있는 판 위에 있다. 가장자리는 난간이고, 그 너머는 허공.
// 큰길(|x|<9)이 남북으로 뻗고, 양쪽 건물 사이사이는 골목. 북쪽 끝 검문소 너머로 관리 탑의 섬이 보인다.
export const EDGE = { x: 64, z0: -132, z1: 38 }; // 난간 위치
export const CITY_BOUNDS: Box = { x0: -EDGE.x + 0.6, x1: EDGE.x - 0.6, z0: EDGE.z0 + 0.6, z1: EDGE.z1 - 0.6 };
export const AVENUE = 9;
export const ALLEY = 3.5;
// 검문소 레이저 앞에서 멈추도록 큰길 끝에 보이지 않는 벽
export const GATE_STOP = box(0, EDGE.z0 + 2.5, 2 * AVENUE + 4, 7);
export const CROSS: [number, number][] = [
  [-36, -26],
  [-70, -60],
  [-104, -94],
];
// 건물이 들어선 띠 (남북 방향)
const BANDS: [number, number, number][] = [
  [-26, 14, 3],
  [-60, -36, 2],
  [-94, -70, 2],
  [-128, -104, 2],
];
// 큰길에서 바깥쪽으로 건물 세 줄 (|x|)
const COLS: [number, number][] = [
  [11.5, 22],
  [22 + ALLEY, 36],
  [36 + ALLEY, 52],
];
function split(a: number, b: number, n: number): [number, number][] {
  const w = (b - a - ALLEY * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => [a + i * (w + ALLEY), a + i * (w + ALLEY) + w]);
}
export type Lot = Box & { side: number; col: number; band: number };
export const LOTS: Lot[] = (() => {
  const out: Lot[] = [];
  BANDS.forEach(([z0, z1, n], band) => {
    for (const [lz0, lz1] of split(z0, z1, n)) {
      COLS.forEach(([a, b], col) => {
        for (const side of [-1, 1]) {
          const x0 = side < 0 ? -b : a;
          const x1 = side < 0 ? -a : b;
          out.push({ x0, x1, z0: lz0, z1: lz1, side, col, band });
        }
      });
    }
  });
  return out;
})();
// 예전 이름 호환: 블록 = 건물 부지
export const BLOCKS: Box[] = LOTS;

// 골목 (걸을 수 있는 좁은 길) 목록: 장식과 NPC 배치에 쓴다
export type Alley = { x0: number; x1: number; z0: number; z1: number; dir: "ns" | "ew" };
export const ALLEYS: Alley[] = (() => {
  const out: Alley[] = [];
  // 남북 골목 (열 사이)
  BANDS.forEach(([z0, z1]) => {
    for (const side of [-1, 1])
      for (let c = 0; c < COLS.length - 1; c++) {
        const a = COLS[c][1];
        const b = COLS[c + 1][0];
        out.push({ x0: side < 0 ? -b : a, x1: side < 0 ? -a : b, z0, z1, dir: "ns" });
      }
  });
  // 동서 골목 (부지 사이)
  BANDS.forEach(([z0, z1, n]) => {
    const rows = split(z0, z1, n);
    for (let r = 0; r < rows.length - 1; r++) {
      const za = rows[r][1];
      const zb = rows[r + 1][0];
      for (const side of [-1, 1]) out.push({ x0: side < 0 ? -52 : 11.5, x1: side < 0 ? -11.5 : 52, z0: za, z1: zb, dir: "ew" });
    }
  });
  return out;
})();

// 방공호 입구: 왼쪽 골목 막다른 끝, 낡은 건물 옆벽의 배전실 문으로 위장
export const HATCH = { pos: [-COLS[1][0], 0, 10.6] as Vec3, alleyX: -(COLS[0][1] + ALLEY / 2) };
// 골목 남쪽 입구를 막은 잡동사니 더미 (그래서 막다른 골목)
export const JUNK = box(HATCH.alleyX, 13.3, ALLEY, 1.4);

const NS1 = COLS[0][1] + ALLEY / 2; // 23.75: 방공호 골목
const NS2 = COLS[1][1] + ALLEY / 2; // 37.75
export const NS2_X = NS2;
// 골목 사람들이 바닥에 남긴 분필 화살표: 방공호 골목에서 광장을 지나 배송 대기소 지붕 밑까지 (rotY 0 = 북쪽, π/2 = 서쪽, π = 남쪽)
// 광장 구간(CHALK_PLAZA)은 이산이 걷는 길(LOOKOUT_PATH 0→1→2)을 따라 놓는다
const chalkAlong = (a: [number, number], b: [number, number], ts: number[]) =>
  ts.map((t) => ({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, rotY: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) }));
const CHALK_PLAZA = [
  ...chalkAlong([-NS2 + 0.5, 12.2], [-44, 17.2], [0.42, 0.85]),
  ...chalkAlong([-44, 17.2], [-52.6, 29.6], [0.18, 0.4, 0.62, 0.84]),
];
export const CHALK: { x: number; z: number; rotY: number; turn?: boolean }[] = [
  { x: -NS1, z: 6.2, rotY: 0 },
  { x: -NS1 + 0.2, z: 2.2, rotY: 0, turn: true },
  { x: -30.5, z: 1.3, rotY: Math.PI / 2 },
  { x: -NS2 + 0.6, z: 1.0, rotY: Math.PI / 2, turn: true },
  { x: -NS2, z: 7.5, rotY: Math.PI },
  { x: -NS2, z: 12.8, rotY: Math.PI },
  ...CHALK_PLAZA,
];

// ---------- 남쪽 전망대 가는 길 ----------
// 방공호 골목 → (분필 화살표) 교차로의 포장마차 → 골목 입구 → 광장 드론 길 A → 서쪽 배송 대기소(D-12) →
// 서쪽 난간의 틈 → 도시 판 바깥에 매달린 산책로 → 드론 길 B → 모퉁이의 아이 → 남쪽 전망대 끝의 망원경.
// 망원경은 광장에서 허공 너머로 보이지만, 판과 전망대 사이는 비어 있어서 바깥 산책로로 돌아가야 닿는다.
// 바닥(CityWorld), 난간, 충돌(CITY), 미니맵, 드론 빛, 이산의 경유점이 모두 아래 값을 쓴다
// 서쪽 바깥 산책로: 판의 서쪽 가장자리(x -65) 바깥에 붙은 폭 3.6m의 다리. 판 안쪽 난간(x -64)에 출입 틈이 있다
export const WALK = { x0: -68.6, x1: -65, z0: 25, z1: 50.4, gate0: 28.6, gate1: 31.6 };
// 남쪽 다리: 산책로 남쪽 끝에서 동쪽으로 꺾여 판 남쪽 허공 위를 지난다. 동쪽 끝은 넓은 전망대(BAY)
export const LOOK = { x0: WALK.x0, x1: -26, z0: 46.4, z1: WALK.z1 };
export const BAY = { x0: -36, x1: LOOK.x1, z0: 44.2, z1: LOOK.z1 };
// 판 가장자리 바깥의 허공 (걸을 수 없는 곳). 충돌 상자로 막고, 미니맵에는 빈 곳으로 그린다
export const AIR: Box[] = [
  { x0: -72, x1: -64.25, z0: EDGE.z0 - 8, z1: WALK.z0 }, // 산책로 북쪽 끝 너머의 판 서쪽 바깥
  { x0: WALK.x1, x1: BAY.x0, z0: EDGE.z1 + 1, z1: LOOK.z0 }, // 판과 남쪽 다리 사이
  { x0: BAY.x0, x1: BAY.x1, z0: EDGE.z1 + 1, z1: BAY.z0 }, // 판과 전망대 사이
  { x0: BAY.x1, x1: EDGE.x + 8, z0: EDGE.z1 + 1, z1: LOOK.z1 + 6 }, // 전망대 동쪽
];
// 판의 서쪽·남쪽 난간 (서쪽은 산책로 출입 틈을 비운다). 난간 선과 같은 자리의 얇은 충돌 상자
export const EDGE_RAILS: Box[] = [
  { x0: -64.25, x1: -63.75, z0: EDGE.z0 - 1, z1: WALK.gate0 },
  { x0: -64.25, x1: -63.75, z0: WALK.gate1, z1: EDGE.z1 },
  { x0: -64.25, x1: EDGE.x + 2, z0: EDGE.z1 - 0.25, z1: EDGE.z1 + 1 },
];
// 산책로 출입 틈 옆, 서쪽 배송 대기소: 처마(y0~y1)가 머리 위 드론 빛을 가리고, 남쪽은 벽이다. 배달 로봇 D-12가 쉰다
export const DEPOT = { x: -53.6, z: 30.4, w: 4.8, d: 3.6, y0: 2.45, y1: 2.7 };
export const DEPOT_WALL = box(DEPOT.x, DEPOT.z + DEPOT.d / 2 - 0.1, DEPOT.w, 0.2);
// 드론 빛을 가리는 지붕들 (광장 드론). Drones의 가림 판정과 바닥 빛 원 셰이더가 같은 상자를 쓴다
export const ROOFS = [DEPOT];
// 광장과 큰길의 경계 (z가 이보다 작으면 큰길). 망원경을 보기 전에는 홀로그램 차단막이 막는다 (AVENUE_HOLO)
export const AVENUE_EDGE_Z = 13.4;
// 큰길 띠: 건물 첫 줄 안쪽(|x| < 11.5), 광장 경계 남쪽. 망원경 전에는 이 띠 안으로 들어갈 수 없다 (이미 안에 있으면 나갈 수는 있다)
export const AVENUE_STRIP = { x: COLS[0][0], z1: AVENUE_EDGE_Z };
export function inAvenueStrip(x: number, z: number, pad = 0) {
  return Math.abs(x) < AVENUE_STRIP.x + pad && z < AVENUE_STRIP.z1 + pad;
}
// 차단막이 서는 자리: 광장 쪽 입구 하나 + 큰길 양옆의 골목·건널목 입구들 (건물 첫 줄 사이의 빈틈). [x0, z0, x1, z1]
export const AVENUE_HOLO: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [[-AVENUE_STRIP.x, AVENUE_STRIP.z1, AVENUE_STRIP.x, AVENUE_STRIP.z1]];
  const zs = LOTS.filter((l) => l.col === 0 && l.side > 0)
    .map((l) => [l.z0, l.z1] as [number, number])
    .sort((a, b) => b[1] - a[1]);
  let top = AVENUE_STRIP.z1;
  for (const [z0, z1] of zs) {
    if (top - z1 > 0.2) for (const sd of [-1, 1]) out.push([sd * AVENUE_STRIP.x, z1, sd * AVENUE_STRIP.x, Math.min(top, AVENUE_STRIP.z1)]);
    top = Math.min(top, z0);
  }
  if (top - EDGE.z0 > 0.2) for (const sd of [-1, 1]) out.push([sd * AVENUE_STRIP.x, EDGE.z0, sd * AVENUE_STRIP.x, top]);
  return out;
})();
// 수락 결말에서 이산이 남은 자리 (줄 밖, 검문소 앞). 다시 오면 여기 굳어 서 있다
export const FROZEN_SAN = { x: -0.9, z: -104.6 };

// 이산이 지나는 길: 경유점(hold = 드론 빛이 닿지 않아 기다릴 수 있는 자리, lane = 이 점으로 올 때 건너는 드론 길)
// 이산은 hold에서만 기다리고, 그 사이는 장애물을 피해 이어 둔 점을 차례로 걷는다. 돌아갈 때는 거꾸로 걷는다
export type RoutePt = { x: number; z: number; hold?: boolean; lane?: number };
export const LOOKOUT_PATH: RoutePt[] = [
  { x: -NS2 + 0.5, z: 12.2, hold: true }, // 0 골목 입구 안쪽
  { x: -44, z: 17.2, hold: true }, // 1 광장 북쪽 가장자리 (드론 길 A 앞)
  { x: -52.6, z: 29.6, hold: true, lane: 0 }, // 2 배송 대기소 처마 밑
  { x: -62.4, z: 30.1 }, // 3 난간 틈 앞
  { x: -66.2, z: 30.1 }, // 4 틈을 지나 산책로로
  { x: -66.6, z: 35.2, hold: true }, // 5 산책로 북쪽 (드론 길 B 앞)
  { x: -66.6, z: 47.8, hold: true, lane: 1 }, // 6 모퉁이
  { x: -32.6, z: 47.6, hold: true }, // 7 전망대: 망원경 옆, 비켜선 자리
];

// 순찰 드론: 레일을 따라 x 방향으로 오가며(x = c + a·cos θ) 바닥에 빛 원(반지름 DRONE_R)을 비춘다.
// 빛에 든 사람을 따라갈 때는 x와 z 모두로 움직이되, 레일 둘레의 순찰 범위(x c±a, z z±dz) 밖으로는 나가지 않는다.
// dz는 기다리는 자리(LOOKOUT_PATH의 hold)에 빛이 닿지 않도록 정했다: 광장 A는 z 20.1~24.9 → 빛은 z 17.5~27.5
// (광장 북쪽 hold z 17.2, 처마 밑 hold z 29.6 밖), 산책로 B는 z 39.1~43.9 → 빛은 z 36.5~46.5 (hold z 35.2, 47.8 밖)
// 광장의 둘은 망원경 가는 길의 두 건너는 자리(광장, 바깥 산책로)를, 큰길의 넷은 엄폐물 사이를 가로지른다.
// fx: 빛 원을 그리는 바닥의 x 범위 (허공 위에는 그리지 않는다)
// 산책로 B: 폭(x -68.6~-65)을 벗어나 허공 위를 훑던 시간을 줄였다(a 7→4.5, 주기 9→8.5초). 빛 원 가장자리가 산책로 가운데(x -66.6)에서
// 0.4m 이상 떨어지는 때는 한쪽 끝마다 약 2.3초씩, 주기당 두 번 온다(|cos θ|>0.67). 아무도 시험해 보지 않은 기하 계산이다
export type DroneRail = { zone: "plaza" | "avenue"; z: number; c: number; a: number; y: number; period: number; phase: number; dz: number; fx?: [number, number] };
export const DRONE_R = 2.6;
export const DRONE_RAILS: DroneRail[] = [
  { zone: "plaza", z: 22.5, c: -44, a: 18, y: 7, period: 12, phase: 0.3, dz: 2.4, fx: [-64, -20] },
  { zone: "plaza", z: 41.5, c: -66.8, a: 4.5, y: 6.4, period: 8.5, phase: 2.2, dz: 2.4, fx: [WALK.x0, WALK.x1] },
  { zone: "avenue", z: -36.5, c: 0, a: 8.6, y: 8, period: 8.5, phase: 0.4, dz: 3 },
  { zone: "avenue", z: -58, c: 0, a: 8.6, y: 8, period: 9.5, phase: 2.1, dz: 3 },
  { zone: "avenue", z: -84, c: 0, a: 8.6, y: 8, period: 8, phase: 1.0, dz: 3 },
  { zone: "avenue", z: -108, c: 0, a: 8.6, y: 8, period: 9, phase: 2.8, dz: 3 },
  // 남쪽 다리 C: 모퉁이에서 전망대까지 일직선 다리를 따라 오간다. 다리 폭 전체를 덮으므로 빈틈을 보고 끝까지 달려야 한다.
  // 빛 원은 x −64.6…−37.4 (모퉁이 hold x −66.6, 전망대 BAY x −36 밖): 망원경 근처에는 닿지 않는다. 시험해 보지 않은 기하 계산이다
  { zone: "plaza", z: 48.4, c: -51, a: 11, y: 6.4, period: 9, phase: 1.3, dz: 0.6, fx: [LOOK.x0, BAY.x0] },
];

export const QUEUE_X = [-3.6, 3.6];
export const QUEUE_Z: number[] = Array.from({ length: 58 }, (_, i) => -22 - i * 1.75);
export const CAMERA_POLES: Vec3[] = [-1, 1].flatMap((s) => [8, -14, -40, -64, -84, -104, -124].map((z) => [s * (AVENUE - 0.6), 0, z] as Vec3));

// 도시를 둘러싼 떠 있는 섬들. 기계의 질서답게 큰길(x=0)을 축으로 정확히 대칭이다.
export type Island = { x: number; y: number; z: number; r: number; towers: boolean };
export const ISLANDS: Island[] = (() => {
  const half: Island[] = [
    { x: 175, y: -18, z: -45, r: 40, towers: false }, // 쌍둥이 불상의 섬
    { x: 150, y: 22, z: -190, r: 30, towers: true },
    { x: 150, y: -48, z: 85, r: 36, towers: true },
    { x: 245, y: 6, z: 40, r: 34, towers: true },
    { x: 95, y: -70, z: -120, r: 26, towers: true },
    { x: 70, y: 38, z: 175, r: 28, towers: true },
  ];
  return half.flatMap((i) => [i, { ...i, x: -i.x }]);
})();
export const BUDDHAS = ISLANDS.filter((i) => !i.towers);
export const OVERSEER_ISLAND = { x: 0, y: 0, z: -218, r: 38 };

// 골목 사람들: 큰길과 달리 아무렇게나 서 있고, 바이저도 벗었다 (골목은 비대칭으로 남겨 둔다)
export const ALLEY_PEOPLE: { x: number; z: number; rotY: number; tone: number }[] = (() => {
  let seed = 977;
  const r = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const out: { x: number; z: number; rotY: number; tone: number }[] = [];
  const picks = [0, 2, 3, 5, 6, 8, 9, 11, 13, 14, 16, 17, 19];
  for (const k of picks) {
    const a = ALLEYS[k % ALLEYS.length];
    const n = 1 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const along = 0.15 + r() * 0.7;
      const wallSide = r() < 0.5 ? 0 : 1;
      let x: number, z: number;
      if (a.dir === "ns") {
        x = wallSide ? a.x1 - 0.55 : a.x0 + 0.55;
        z = a.z0 + (a.z1 - a.z0) * along;
      } else {
        z = wallSide ? a.z1 - 0.55 : a.z0 + 0.55;
        x = a.x0 + (a.x1 - a.x0) * along;
      }
      if (Math.abs(x - HATCH.alleyX) < 2 && z > 2) continue; // 입구 골목은 비워 둔다
      out.push({ x, z, rotY: r() * Math.PI * 2, tone: r() });
    }
  }
  return out;
})();

// 통제선: 띠 A(남쪽 골목들) 바깥으로는 큰길로만 북쪽에 갈 수 있다.
// 골목에서는 남쪽 광장으로만 나갈 수 있어서, 검문소까지는 큰길 전체를 걸어야 한다.
export type Barrier = Box & { axis: "x" | "z" }; // axis: 장벽이 뻗은 방향
export const BARRIERS: Barrier[] = (() => {
  const out: Barrier[] = [];
  for (const s of [-1, 1]) {
    // 띠 A 북쪽 끝 (골목·산책로 출구)
    for (const [a, b] of [
      [22, 22 + ALLEY],
      [36, 36 + ALLEY],
      [52, EDGE.x],
    ])
      out.push({ x0: s < 0 ? -b : a, x1: s < 0 ? -a : b, z0: -26.5, z1: -25.5, axis: "x" });
    // 큰길에서 동서로 빠지는 길: 띠 A의 골목 두 개 + 교차로 두 개
    for (const [z0, z1] of [
      [-15, -11.5],
      [-0.5, 3],
      [-36, -26],
      [-70, -60],
      [-104, -94],
    ])
      out.push({ x0: s * 11.5 - 0.5, x1: s * 11.5 + 0.5, z0, z1, axis: "z" });
  }
  return out;
})();

// 큰길의 엄폐물. 줄 선 시민들만 좌우 대칭이고, 엄폐물은 일부러 흩어 놓았다.
// 종류마다 크기와 단단함이 다르다: 비석(튼튼), 컨테이너(보통, 세로로 놓이면 긴 그늘), 방벽(가장 튼튼),
// 키오스크(작고 약함), 트럭(길게 세로로 서 있어 그 뒤를 따라 걸을 수 있음).
// 사이사이 엄폐물이 없는 긴 구간이 있어서, 달리거나 줄 속에 섞여야 한다.
export type CoverKind = "stele" | "container" | "wall" | "kiosk" | "truck";
export type Cover = { x: number; z: number; w: number; d: number; h: number; kind: CoverKind };
export const COVER_HP: Record<CoverKind, number> = { stele: 1.6, container: 1.1, wall: 2.2, kiosk: 0.6, truck: 2.5 };
const COVER_DIMS: Record<CoverKind, { w: number; d: number; h: number }> = {
  stele: { w: 2.4, d: 1.1, h: 3.6 },
  container: { w: 2.6, d: 1.6, h: 3.3 },
  wall: { w: 3, d: 0.8, h: 3.4 },
  kiosk: { w: 1.4, d: 1.4, h: 2.9 },
  truck: { w: 2.4, d: 6, h: 3.4 },
};
export const COVERS: Cover[] = (
  [
    // [z, x, 종류, 세로로 놓기]
    [-5, -2.0, "kiosk"],
    [-10, 5.5, "container"],
    [-16, -6.5, "stele"],
    [-19.5, 1.0, "wall"],
    [-27, 7.0, "truck"],
    [-33, -1.2, "kiosk"],
    [-41, -7.0, "stele"],
    [-45, 1.5, "container"],
    [-52, 6.4, "wall"],
    // -53 ~ -63: 엄폐물 없는 구간
    [-66, -6.2, "container", true],
    [-72, 0.3, "kiosk"],
    [-79, 5.8, "stele"],
    [-88, -1.2, "wall"],
    [-93, -7.5, "kiosk"],
    [-99, 6.8, "truck"],
    [-106, -1.6, "stele"],
    [-112, -6.6, "container"],
    [-117, 2.0, "kiosk"],
    [-123, -5.5, "wall"],
  ] as [number, number, CoverKind, boolean?][]
).map(([z, x, kind, long]) => {
  const d = COVER_DIMS[kind];
  return long ? { x, z, w: d.d, d: d.w * 2, h: d.h, kind } : { x, z, ...d, kind };
});
export const coverBox = (c: Cover): Box => box(c.x, c.z, c.w, c.d);

// 큰길 끝, 다리 건너 섬에 선 거대한 입불 '대자비'. 이마의 렌즈가 감시하는 눈이다.
export const JABI = { x: 0, y: 0, z: -218, eye: new THREE.Vector3(0, 84, -209.6) };
// 시선이 닿는 구간 (큰길)
export const GAZE_ZONE = { x: AVENUE + 2.5, z0: EDGE.z0 + 2, z1: 2 };

// 남쪽 광장의 범종각과 석탑
export const BELL = { pos: [-10, 0, 27] as Vec3 };
export const PAGODA = { pos: [10, 0, 26] as Vec3 };
// 전망 망원경 (가장자리)
export const SCOPES: { pos: Vec3; rotY: number }[] = [
  { pos: [-30, 0, BAY.z1 - 1.0], rotY: Math.PI },
  { pos: [EDGE.x - 1.2, 0, -46], rotY: -Math.PI / 2 },
  { pos: [-EDGE.x + 1.2, 0, -14], rotY: Math.PI / 2 },
];

export const CITY_NPCS = {
  vendor: { pos: [-7.2, 0, 4] as Vec3, rotY: 1.2 },
  whisper: { pos: [QUEUE_X[1], 0, QUEUE_Z[3]] as Vec3, rotY: Math.PI },
  // 골목 포장마차 할머니: 방공호 골목에서 골목 입구로 꺾는 교차로의 서쪽 끝 (동쪽, 교차로를 향한다)
  grandma: { pos: [-43.4, 0, 1.25] as Vec3, rotY: Math.PI / 2 },
  // 로봇 스님 (범종각 옆)
  robomonk: { pos: [-6.6, 0, 27.5] as Vec3, rotY: Math.PI / 2 },
  // 바깥 산책로 모퉁이에서 남쪽 난간 너머를 내려다보는 아이 (드론 길 B를 지난 뒤, 망원경 자리와 떨어져 있다)
  edgekid: { pos: [-67.7, 0, 49.5] as Vec3, rotY: 0 },
  // 서쪽 배송 대기소 처마 밑에서 쉬는 배달 로봇 (지도에 없는 자리)
  courier: { pos: [DEPOT.x - 1.2, 0, DEPOT.z + 0.9] as Vec3, rotY: Math.PI },
};

const npcItem = (id: keyof typeof CITY_NPCS, label: L, radius = 2.6, y = 1.5): Interactable => ({
  id,
  kind: "npc",
  npc: id,
  pos: v(CITY_NPCS[id].pos[0], y, CITY_NPCS[id].pos[2]),
  radius,
  label,
});

export const CITY: ZoneDef = {
  spawn: { pos: [HATCH.alleyX, 0, 8.6], yaw: 0 },
  // 서쪽 바깥 산책로와 남쪽 전망대까지 걸을 수 있다. 판 가장자리의 난간과 그 바깥 허공은 상자로 막는다
  bounds: { ...CITY_BOUNDS, x0: WALK.x0, z1: LOOK.z1 },
  boxes: [
    ...EDGE_RAILS,
    ...AIR,
    DEPOT_WALL,
    ...LOTS,
    ...BARRIERS,
    ...COVERS.map(coverBox),
    GATE_STOP,
    JUNK,
    box(-7.2, 5.2, 2.2, 1.4), // 노점 수레
    box(7.2, 5.2, 2.2, 1.4), // 맞은편 복제 수레
    box(CITY_NPCS.grandma.pos[0] + 0.9, CITY_NPCS.grandma.pos[2], 0.6, 2.4), // 포장마차 판대 (할머니 앞, 동쪽)
    box(BELL.pos[0], BELL.pos[2], 5.2, 5.2),
    box(PAGODA.pos[0], PAGODA.pos[2], 3.4, 3.4),
    ...CAMERA_POLES.map(([x, , z]) => box(x, z, 0.4, 0.4)),
  ],
  circles: [
    ...QUEUE_X.flatMap((x) => QUEUE_Z.map((z) => ({ x, z, r: 0.35 }))),
    { x: -CITY_NPCS.vendor.pos[0], z: CITY_NPCS.vendor.pos[2], r: 0.4 },
    ...(["grandma", "robomonk", "edgekid", "courier"] as const).map((k) => ({ x: CITY_NPCS[k].pos[0], z: CITY_NPCS[k].pos[2], r: 0.45 })),
    ...SCOPES.map((s) => ({ x: s.pos[0], z: s.pos[2], r: 0.4 })),
    // 망원경 옆 등 기둥 (CityAlleys Scopes의 [1.15, -0.45]를 망원경 방향으로 돌린 자리)
    ...SCOPES.map((s) => ({ x: s.pos[0] + 1.15 * Math.cos(s.rotY) - 0.45 * Math.sin(s.rotY), z: s.pos[2] - 1.15 * Math.sin(s.rotY) - 0.45 * Math.cos(s.rotY), r: 0.2 })),
    // 배송 대기소 기둥 넷
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: DEPOT.x + sx * (DEPOT.w / 2 - 0.15), z: DEPOT.z + sz * (DEPOT.d / 2 - 0.15), r: 0.12 }))),
    ...ALLEY_PEOPLE.map((p) => ({ x: p.x, z: p.z, r: 0.32 })),
  ],
  items: [
    { id: "hatch", kind: "door", to: "bunker", pos: v(HATCH.pos[0] + 0.6, 1.6, HATCH.pos[2]), radius: 2.6, label: { ko: "배전실 7-B", en: "Substation 7-B" } },
    npcItem("vendor", { ko: "우산 장수", en: "Umbrella seller" }, 2.8),
    npcItem("whisper", { ko: "줄 선 시민", en: "Citizen in line" }, 2.4),
    npcItem("grandma", { ko: "포장마차 할머니", en: "Street-stall grandmother" }, 2.8),
    npcItem("robomonk", { ko: "로봇 스님", en: "Robot monk" }, 2.8),
    npcItem("edgekid", { ko: "난간의 아이", en: "Child at the railing" }, 2.6, 1.1),
    npcItem("courier", { ko: "배달 로봇 D-12", en: "Courier bot D-12" }, 2.6, 0.9),
    // 골목에 굳어 선 사람들: 다가가면 '정지된 시민'
    ...ALLEY_PEOPLE.map((p, i): Interactable => ({ id: `frozen-${i}`, kind: "npc", npc: "frozen", pos: v(p.x, 1.4, p.z), radius: 1.6, label: { ko: "정지된 시민", en: "Suspended citizen" } })),
    ...SCOPES.map<Interactable>((s, i) => ({
      id: `scope-${i}`,
      kind: "npc",
      npc: `scope${i}`,
      pos: v(s.pos[0], 1.3, s.pos[2]),
      radius: i === 0 ? 2.8 : 2.4,
      label: { ko: "망원경", en: "Scope" },
    })),
    { id: "checkpoint", kind: "checkpoint", pos: v(0, 1.6, EDGE.z0 + 4.5), radius: 5.5, label: { ko: "검문소", en: "Checkpoint" } },
    { id: "san", kind: "statue", pos: v(9999, 0, 9999), radius: 2.6, label: { ko: "이산", en: "San" } },
    // 수락한 뒤 다시 오면: 검문소 앞 줄 밖에 정지 처분된 이산 (FROZEN_SAN)
    { id: "frozen-san", kind: "statue", pos: v(FROZEN_SAN.x, 1.4, FROZEN_SAN.z), radius: 3, label: { ko: "정지 시민 · 이산", en: "Suspended citizen · San" }, when: () => route.frozenSan },
    { id: "patrol", kind: "npc", npc: "patrol", pos: v(6, 2, -10), radius: 3.4, label: { ko: "순찰 기계 P-3", en: "Patrol unit P-3" } },
    { id: "patrol2", kind: "npc", npc: "patrol2", pos: v(-6, 2, -10), radius: 3.4, label: { ko: "순찰 기계 P-3′", en: "Patrol unit P-3′" } },
  ],
};

export const ZONES: Record<Zone, ZoneDef> = { bunker: BUNKER, city: CITY };
