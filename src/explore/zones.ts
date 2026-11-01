import * as THREE from "three";
import type { L, SectionId } from "@/data/site";
import { works } from "@/data/site";
import { box, type Box, type Circle } from "./collide";

export type Vec3 = [number, number, number];
export type Zone = "bunker" | "city";

export type Interactable = {
  id: string;
  kind: "section" | "painting" | "statue" | "npc" | "door" | "checkpoint";
  pos: THREE.Vector3; // NPC처럼 움직이는 것은 컴포넌트가 이 값을 갱신
  radius: number;
  label: L;
  color?: string;
  section?: SectionId;
  work?: number;
  npc?: string;
  to?: Zone;
};

export type ZoneDef = {
  spawn: { pos: Vec3; yaw: number };
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
export const PAINTINGS = imageWorks.slice(0, SLOTS.length).map(({ w, i }, k) => ({ work: i, w, ...SLOTS[k] }));

export const PILLARS: Vec3[] = [
  [-6.5, 0, 6],
  [6.5, 0, 6],
  [-6.5, 0, -14],
  [6.5, 0, -14],
];

export const BUNKER_NPCS = {
  keeper: { pos: [-4.6, 0, -17.2] as Vec3, rotY: 0.5 },
  r07: { pos: [7.8, 0, 11] as Vec3, rotY: -2.4 },
};

export const BUNKER: ZoneDef = {
  spawn: { pos: [0, 0, 10.5], yaw: 0 },
  ceiling: BUNKER_H,
  bounds: { x0: -12, x1: 12, z0: -19.6, z1: 14 },
  boxes: [
    ...PILLARS.map(([x, , z]) => box(x, z, 1.2, 1.2)),
    ...TERMINALS.map((t) => (Math.abs(t.pos[0]) > 1 ? box(t.pos[0] + Math.sign(t.pos[0]) * 0.3, t.pos[2], 1.4, 1.6) : box(t.pos[0], t.pos[2] + 0.3, 1.6, 1.4))),
    box(-4.6, -18.6, 2.8, 1.2), // 관리인 책상
  ],
  circles: [
    { x: 0, z: 0, r: 2.15 },
    { x: BUNKER_NPCS.keeper.pos[0], z: BUNKER_NPCS.keeper.pos[2], r: 0.4 },
    { x: BUNKER_NPCS.r07.pos[0], z: BUNKER_NPCS.r07.pos[2], r: 0.55 },
  ],
  items: [
    ...TERMINALS.map<Interactable>((t) => ({
      id: t.id,
      kind: "section",
      section: t.id,
      pos: v(t.pos[0] + Math.sin(t.rotY), 1.4, t.pos[2] + Math.cos(t.rotY)),
      radius: 2.8,
      color: t.color,
      label: { ko: `${t.id.toUpperCase()} 터미널`, en: `${t.id.toUpperCase()} terminal` },
    })),
    ...PAINTINGS.map<Interactable>((p) => ({
      id: `painting-${p.work}`,
      kind: "painting",
      work: p.work,
      pos: v(p.pos[0] - Math.sin(p.rotY) * -0.01, 2.2, p.pos[2]),
      radius: 3.4,
      label: p.w.title,
    })),
    { id: "statue", kind: "statue", pos: v(0, 1.5, 2.2), radius: 3.6, label: { ko: "동상", en: "Statue" } },
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
    { id: "exit", kind: "door", to: "city", pos: v(0, 1.6, -19), radius: 3.6, label: { ko: "지상으로 올라가기", en: "Go up to the surface" } },
  ],
};

/* ---------------- 지상 감시구역 7 ---------------- */
// 큰길(|x|<9)이 남북으로 뻗고, 끝에는 검문소와 관리 타워가 있다.
export const CITY_BOUNDS: Box = { x0: -56, x1: 56, z0: -92, z1: 30 };
export const AVENUE = 9;
// 검문소 레이저 앞에서 멈추도록 큰길 끝에 보이지 않는 벽
const GATE_STOP = box(0, -89.5, 2 * AVENUE + 4, 7);
export const CROSS: [number, number][] = [
  [-36, -26],
  [-70, -60],
];
export const BLOCKS: Box[] = (() => {
  const zs: [number, number][] = [
    [-26, 14],
    [-60, -36],
    [-92, -70],
  ];
  const out: Box[] = [];
  for (const [z0, z1] of zs) {
    out.push({ x0: -56, x1: -AVENUE - 2, z0, z1 });
    out.push({ x0: AVENUE + 2, x1: 56, z0, z1 });
  }
  return out;
})();

export const HATCH = { pos: [0, 0, 25] as Vec3 };
export const QUEUE_X = [-3.6, 3.6];
export const QUEUE_Z: number[] = Array.from({ length: 36 }, (_, i) => -22 - i * 1.75);
export const CAMERA_POLES: Vec3[] = [-1, 1].flatMap((s) => [8, -14, -40, -64, -84].map((z) => [s * (AVENUE - 0.6), 0, z] as Vec3));

export const CITY_NPCS = {
  vendor: { pos: [-7.2, 0, 4] as Vec3, rotY: 1.2 },
  whisper: { pos: [QUEUE_X[1], 0, QUEUE_Z[3]] as Vec3, rotY: Math.PI },
};

export const CITY: ZoneDef = {
  spawn: { pos: [0, 0, 20.5], yaw: 0 },
  bounds: CITY_BOUNDS,
  boxes: [
    ...BLOCKS,
    GATE_STOP,
    box(HATCH.pos[0], HATCH.pos[2] + 0.5, 5.4, 4.2),
    box(-7.2, 5.2, 2.2, 1.4), // 노점 수레
    ...CAMERA_POLES.map(([x, , z]) => box(x, z, 0.4, 0.4)),
  ],
  circles: [...QUEUE_X.flatMap((x) => QUEUE_Z.map((z) => ({ x, z, r: 0.35 })))],
  items: [
    { id: "hatch", kind: "door", to: "bunker", pos: v(0, 1.6, 22.4), radius: 3.2, label: { ko: "방공호로 내려가기", en: "Go back down to the shelter" } },
    {
      id: "vendor",
      kind: "npc",
      npc: "vendor",
      pos: v(CITY_NPCS.vendor.pos[0], 1.5, CITY_NPCS.vendor.pos[2]),
      radius: 2.8,
      label: { ko: "우산 장수", en: "Umbrella seller" },
    },
    {
      id: "whisper",
      kind: "npc",
      npc: "whisper",
      pos: v(CITY_NPCS.whisper.pos[0], 1.5, CITY_NPCS.whisper.pos[2]),
      radius: 2.4,
      label: { ko: "줄 선 시민", en: "Citizen in line" },
    },
    { id: "checkpoint", kind: "checkpoint", pos: v(0, 1.6, -84.5), radius: 4.5, label: { ko: "검문소", en: "Checkpoint" } },
    { id: "san", kind: "statue", pos: v(9999, 0, 9999), radius: 2.4, label: { ko: "이산", en: "San" } },
    { id: "patrol", kind: "npc", npc: "patrol", pos: v(6, 2, -10), radius: 3.4, label: { ko: "순찰 기계 P-3", en: "Patrol unit P-3" } },
  ],
};

export const ZONES: Record<Zone, ZoneDef> = { bunker: BUNKER, city: CITY };
