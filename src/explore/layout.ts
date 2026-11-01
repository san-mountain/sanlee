import type { SectionId } from "@/data/site";

export type Vec3 = [number, number, number];
export type Focus = "spawn" | "statue" | SectionId;

export const SPAWN = { pos: [0, 6, 18] as Vec3, target: [0, 5, -4] as Vec3 };
export const STATUE_VIEW = { pos: [3.8, 3.4, 9.5] as Vec3, target: [0.7, 1.6, 0] as Vec3 };

export const LANDMARKS: {
  id: SectionId;
  pos: Vec3;
  height: number;
  color: string;
  sub: { ko: string; en: string };
}[] = [
  { id: "about", pos: [-9, 0, -8], height: 11, color: "#22f0ff", sub: { ko: "소개", en: "who" } },
  { id: "works", pos: [-4.5, 0, -22], height: 17, color: "#ff2bd6", sub: { ko: "작업", en: "what" } },
  { id: "writing", pos: [5.5, 0, -20], height: 13, color: "#a77bff", sub: { ko: "글", en: "words" } },
];

// 건물 앞, 광장 쪽에서 건물을 바라보는 카메라 위치
export function viewFor(pos: Vec3, height: number): { pos: Vec3; target: Vec3 } {
  const [x, , z] = pos;
  const len = Math.hypot(x, z) || 1;
  const dx = -x / len;
  const dz = -z / len;
  return {
    pos: [x + dx * 15, height * 0.45 + 2, z + dz * 15],
    target: [x, height * 0.55, z],
  };
}
