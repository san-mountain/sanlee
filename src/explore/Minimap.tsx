"use client";

import { useEffect, useRef } from "react";
import { player } from "./Player";
import { BARRIERS, COVERS, GAZE_ZONE, ZONES, type Zone } from "./zones";
import { coverState } from "./Jabi";
import type { QuestTarget } from "./QuestArrow";

// 오른쪽 위 원형 미니맵. 진행 방향이 늘 위쪽(heading-up)이고, 작은 N 표시가 북쪽을 가리킨다
const DOT: Record<string, string> = {
  door: "#22f0ff",
  npc: "#ff7ad9",
  checkpoint: "#ff3b3b",
  statue: "#f5f0ff",
  section: "#a77bff",
  painting: "#6d5c94",
};

export default function Minimap({ zone, get }: { zone: Zone; get: () => QuestTarget }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const getRef = useRef(get);
  getRef.current = get;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const def = ZONES[zone];
    const city = zone === "city";
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return; // 30fps면 충분
      last = now;
      const css = cv.clientWidth;
      if (!css) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.round(css * dpr);
      if (cv.width !== px) cv.width = cv.height = px;
      const R = px / 2;
      const scale = (city ? 2.3 : 4.6) * (px / 150); // 화면 px / m
      const yaw = player.yaw;
      const ox = player.pos.x;
      const oz = player.pos.z;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, px, px);
      ctx.save();
      ctx.beginPath();
      ctx.arc(R, R, R - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = city ? "rgba(6,3,16,.82)" : "rgba(10,6,18,.82)";
      ctx.fillRect(0, 0, px, px);

      // 월드 좌표계로: 플레이어가 가운데, 시선이 위
      ctx.translate(R, R);
      ctx.rotate(yaw);
      ctx.scale(scale, scale);
      ctx.translate(-ox, -oz);
      const lw = 1 / scale;

      // 바닥(걸을 수 있는 곳)
      const b = def.bounds;
      ctx.fillStyle = city ? "#1a1430" : "#1c1626";
      ctx.fillRect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);
      if (city) {
        // 감시 구역: 큰길을 붉게
        ctx.fillStyle = "rgba(255,40,60,.10)";
        ctx.fillRect(-GAZE_ZONE.x, GAZE_ZONE.z0, GAZE_ZONE.x * 2, GAZE_ZONE.z1 - GAZE_ZONE.z0);
      }
      ctx.strokeStyle = "#22f0ff66";
      ctx.lineWidth = lw * 1.5;
      ctx.strokeRect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);

      // 건물·벽
      ctx.fillStyle = "#3d3260";
      for (const o of def.boxes) ctx.fillRect(o.x0, o.z0, o.x1 - o.x0, o.z1 - o.z0);
      for (const c of def.circles) {
        ctx.beginPath();
        ctx.arc(c.x, c.z, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (city) {
        // 통제선과 엄폐물 (엄폐물은 레이저에 부서지면 사라진다)
        ctx.fillStyle = "#ff2b4a";
        for (const o of BARRIERS) ctx.fillRect(o.x0, o.z0, Math.max(o.x1 - o.x0, lw * 2), Math.max(o.z1 - o.z0, lw * 2));
        COVERS.forEach((c, i) => {
          ctx.fillStyle = coverState[i].alive ? "#ffb347" : "#3a2a20";
          ctx.fillRect(c.x - c.w / 2, c.z - c.d / 2, c.w, c.d);
        });
      }

      // 상호작용할 수 있는 것들
      for (const it of def.items) {
        const col = DOT[it.kind];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(it.pos.x, it.pos.z, ((it.kind === "painting" ? 2.2 : 3.2) * (px / 150)) / scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // 퀘스트 목표: 범위 밖이면 가장자리에 붙인다
      const q = getRef.current();
      if (q) {
        let dx = q.pos.x - ox;
        let dz = q.pos.z - oz;
        const d = Math.hypot(dx, dz);
        const max = (R - 9 * (px / 150)) / scale;
        if (d > max) {
          dx = (dx / d) * max;
          dz = (dz / d) * max;
        }
        const r = (4.2 * (px / 150)) / scale;
        ctx.fillStyle = "#ffe14d";
        ctx.strokeStyle = "#07030f";
        ctx.lineWidth = lw * 2;
        ctx.beginPath();
        ctx.moveTo(ox + dx, oz + dz - r * 1.3);
        ctx.lineTo(ox + dx + r, oz + dz);
        ctx.lineTo(ox + dx, oz + dz + r * 1.3);
        ctx.lineTo(ox + dx - r, oz + dz);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 화면 좌표로 돌아와 플레이어 화살표와 N 표시
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const k = px / 150;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#07030f";
      ctx.lineWidth = 1.5 * k;
      ctx.beginPath();
      ctx.moveTo(R, R - 8 * k);
      ctx.lineTo(R + 5.5 * k, R + 6 * k);
      ctx.lineTo(R, R + 3 * k);
      ctx.lineTo(R - 5.5 * k, R + 6 * k);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 북쪽(-z)은 화면에서 yaw만큼 돌아간 곳
      const nx = R + Math.sin(yaw) * (R - 10 * k);
      const ny = R - Math.cos(yaw) * (R - 10 * k);
      ctx.font = `bold ${10 * k}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ff2bd6";
      ctx.fillText("N", nx, ny);
      ctx.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [zone]);
  return (
    <div className="minimap" aria-hidden>
      <canvas ref={ref} />
    </div>
  );
}
