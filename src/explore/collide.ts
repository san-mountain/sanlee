// 아주 단순한 2D(XZ 평면) 충돌: 플레이어는 원, 장애물은 상자 또는 원
export type Box = { x0: number; x1: number; z0: number; z1: number };
export type Circle = { x: number; z: number; r: number };
export type Bounds = Box;

export function box(cx: number, cz: number, w: number, d: number): Box {
  return { x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 };
}

export function resolve(p: { x: number; z: number }, r: number, bounds: Bounds, boxes: Box[], circles: Circle[]) {
  for (let it = 0; it < 2; it++) {
    for (const b of boxes) {
      const nx = Math.max(b.x0, Math.min(p.x, b.x1));
      const nz = Math.max(b.z0, Math.min(p.z, b.z1));
      const dx = p.x - nx;
      const dz = p.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = nx + (dx / d) * r;
        p.z = nz + (dz / d) * r;
      } else {
        // 상자 안에 들어와 버린 경우: 가장 가까운 면으로 밀어냄
        const opts = [
          [p.x - b.x0, -1, 0],
          [b.x1 - p.x, 1, 0],
          [p.z - b.z0, 0, -1],
          [b.z1 - p.z, 0, 1],
        ].sort((a, c) => a[0] - c[0])[0];
        if (opts[1]) p.x = opts[1] < 0 ? b.x0 - r : b.x1 + r;
        else p.z = opts[2] < 0 ? b.z0 - r : b.z1 + r;
      }
    }
    for (const c of circles) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + r;
      if (d < min && d > 1e-6) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
    p.x = Math.max(bounds.x0 + r, Math.min(bounds.x1 - r, p.x));
    p.z = Math.max(bounds.z0 + r, Math.min(bounds.z1 - r, p.z));
  }
}
