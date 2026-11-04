export type ChasePhase = "repair" | "chase" | "unlocking" | "escape" | "complete";
export type InteractId = "fuse-west" | "fuse-east" | "gate";
export type Point = { x: number; z: number };
export type Cover = Point & { w: number; d: number; h: number };
export type ChaseRun = { phase: ChasePhase; fuses: [boolean, boolean]; retries: number };

export const START: Point = { x: 0, z: 13 };
export const CHASE_CHECKPOINT: Point = { x: 0, z: -1 };
export const FUSES: readonly Point[] = [{ x: -4.2, z: 8 }, { x: 4.2, z: 2 }];
export const GATE_PANEL: Point = { x: 5.35, z: -23.5 };
export const GATE_Z = -27.5;
export const EXIT_Z = -37.5;
export const COVERS: readonly Cover[] = [
  { x: -2.8, z: -9.2, w: 3.2, d: 2.7, h: 3.1 },
  { x: 3.2, z: -15.5, w: 3, d: 2.8, h: 3.2 },
  { x: -3.2, z: -21.8, w: 3, d: 2.6, h: 3.2 },
];
export const initialRun = (): ChaseRun => ({ phase: "repair", fuses: [false, false], retries: 0 });
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export function currentTarget(run: ChaseRun, player: Point): InteractId | null {
  if (run.phase === "repair") {
    const options: [InteractId, Point, boolean][] = [["fuse-west", FUSES[0], run.fuses[0]], ["fuse-east", FUSES[1], run.fuses[1]]];
    return options.filter(([_, pos, done]) => !done && distance(pos, player) <= 2.65).sort((a, b) => distance(a[1], player) - distance(b[1], player))[0]?.[0] ?? null;
  }
  if (run.phase === "chase" && distance(player, GATE_PANEL) <= 2.75) return "gate";
  return null;
}
export function act(run: ChaseRun, id: InteractId): ChaseRun {
  if (run.phase === "repair" && id !== "gate") {
    const fuses: [boolean, boolean] = [...run.fuses];
    fuses[id === "fuse-west" ? 0 : 1] = true;
    return { ...run, fuses, phase: fuses.every(Boolean) ? "chase" : "repair" };
  }
  if (run.phase === "chase" && id === "gate") return { ...run, phase: "unlocking" };
  return run;
}
export function openGate(run: ChaseRun): ChaseRun {
  return run.phase === "unlocking" ? { ...run, phase: "escape" } : run;
}
export function finish(run: ChaseRun, player: Point): ChaseRun {
  return run.phase === "escape" && player.z <= EXIT_Z ? { ...run, phase: "complete" } : run;
}
export function retry(run: ChaseRun): ChaseRun {
  return { phase: "chase", fuses: [true, true], retries: run.retries + 1 };
}
export const scannerX = (seconds: number) => Math.sin(seconds * 1.12) * 5.25;
// A crate's volume can occlude the elevated scanner's line to the player's head.
export function behindCover(player: Point, scanner: Point): boolean {
  for (const c of COVERS) {
    const vx = player.x - scanner.x, vz = player.z - scanner.z;
    let lo = 0, hi = 1;
    for (const [p, d, a, b] of [
      [scanner.x, vx, c.x - c.w / 2, c.x + c.w / 2],
      [scanner.z, vz, c.z - c.d / 2, c.z + c.d / 2],
    ]) {
      if (Math.abs(d) < 1e-6) { if (p < a || p > b) { lo = 2; break; } }
      else { const t0 = (a - p) / d, t1 = (b - p) / d; lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1)); }
    }
    if (lo <= hi && lo >= 0 && lo <= 1 && 6.3 + (1.55 - 6.3) * lo < c.h) return true;
  }
  return false;
}
export function scannerExposure(player: Point, seconds: number, active: boolean): { exposed: boolean; covered: boolean; x: number } {
  const x = scannerX(seconds);
  const covered = behindCover(player, { x, z: -31 });
  return { x, covered, exposed: active && player.z <= 0 && player.z >= -29 && Math.abs(player.x - x) < 1.9 && !covered };
}
export function collide(player: Point, gateOpen: boolean, radius = 0.38): Point {
  const p = { x: Math.max(-7.5, Math.min(7.5, player.x)), z: Math.max(-42, Math.min(15.2, player.z)) };
  const obstacles = [
    ...COVERS.map(c => ({ x: c.x, z: c.z, w: c.w, d: c.d })),
    ...(!gateOpen ? [{ x: 0, z: GATE_Z, w: 16, d: 0.9 }] : []),
  ];
  for (const o of obstacles) {
    const dx = p.x - o.x, dz = p.z - o.z;
    const ox = o.w / 2 + radius - Math.abs(dx), oz = o.d / 2 + radius - Math.abs(dz);
    if (ox > 0 && oz > 0) {
      if (ox < oz) p.x += Math.sign(dx || 1) * ox;
      else p.z += Math.sign(dz || 1) * oz;
    }
  }
  return p;
}
