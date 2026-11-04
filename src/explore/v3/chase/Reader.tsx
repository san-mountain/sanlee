"use client";
// ACT 4 조사 패널: 동선 점검 도면 · 정비 단말 기록 · 정상 출구 제어판.
// 열려 있는 동안 ChaseGame이 입력을 끄고(포인터 잠금 해제), 닫으면 되돌린다. 내용은 게임 상태에서 읽기만 한다.

import { useEffect } from "react";
import { GATE_Z, PASSAGE_DOOR_Z, SAN_JUNCTION, SAN_START, SHUTTER_PANEL, SHUTTER_Z, STAIR_BOTTOM_Z, STAIR_TOP_Z, type V2 } from "./level";
import { SAN_HIDES, type Game } from "./logic";
import { BYPASS, CONSOLE, EXIT_DOOR, GUIDE_LINE, NPC_ID, ROOM, SEAL_Z, type UnderPanel } from "./underground";
import styles from "./chase.module.css";

/* 도면 좌표: x는 그대로, z는 위(골목 안쪽)에서 아래(지하)로. 세로는 0.6배로 줄인 개략도 */
const TOP = 47;
const K = 0.6;
const X = (x: number) => x;
const Y = (z: number) => (TOP - z) * K;
const pt = (p: V2) => `${X(p.x).toFixed(2)},${Y(p.z).toFixed(2)}`;

function RouteDiagram() {
  const stops: { p: V2; label: string }[] = [
    { p: SAN_START, label: "대기점 01" },
    { p: SHUTTER_PANEL, label: "셔터 개방 후 이동" },
    { p: SAN_JUNCTION, label: "대기점 02" },
    ...SAN_HIDES.map((p, i) => ({ p, label: `대기점 0${i + 3}` })),
  ];
  const route: V2[] = [
    SAN_START, SHUTTER_PANEL, SAN_JUNCTION, ...SAN_HIDES, { x: 2.4, z: -41.6 }, { x: 0, z: -55 }, { x: 0.9, z: -62.4 }, { x: EXIT_DOOR.x, z: EXIT_DOOR.z + 0.6 },
  ];
  const rect = (x0: number, x1: number, z0: number, z1: number) => ({ x: X(x0), y: Y(z1), width: x1 - x0, height: (z1 - z0) * K });
  return (
    <svg className={styles.diagram} viewBox={`-11 -2 30 ${Y(-82) + 4}`} role="img" aria-label="동선 점검 도면">
      <rect x={-11} y={-2} width={30} height={Y(-82) + 4} fill="#e4e6dc" />
      {/* 길과 공간 */}
      <rect {...rect(-3.2, 3.2, 6, 47)} fill="#cfd3c6" stroke="#55606a" strokeWidth={0.15} />
      <rect {...rect(-10, 10, -60, 6)} fill="#cfd3c6" stroke="#55606a" strokeWidth={0.15} />
      <rect {...rect(-2.5, 2.5, SEAL_Z, STAIR_TOP_Z)} fill="#bfc4b8" stroke="#55606a" strokeWidth={0.15} />
      <rect {...rect(ROOM.x0, ROOM.x1, ROOM.z0, ROOM.z1)} fill="#d6d9cd" stroke="#55606a" strokeWidth={0.2} />
      <rect {...rect(BYPASS.x0, BYPASS.x1, BYPASS.z0, BYPASS.z1)} fill="none" stroke="#8a6d2a" strokeWidth={0.18} strokeDasharray="0.6 0.4" />
      <text x={X(BYPASS.x0 + 0.6)} y={Y(BYPASS.z1) - 0.7} className={styles.dgSmall}>경로 외</text>
      {/* 문 */}
      {[
        { z: PASSAGE_DOOR_Z, w: 3.2, t: "통로 문" },
        { z: SHUTTER_Z, w: 3.2, t: "셔터" },
        { z: GATE_Z, w: 10, t: "차단문" },
        { z: SEAL_Z, w: 2.5, t: "수동 차단문" },
      ].map((d) => (
        <g key={d.t}>
          <line x1={-d.w} x2={d.w} y1={Y(d.z)} y2={Y(d.z)} stroke="#2f3a44" strokeWidth={0.45} />
          <text x={-d.w - 0.4} y={Y(d.z) + 0.5} textAnchor="end" className={styles.dgSmall}>{d.t}</text>
        </g>
      ))}
      <text x={-2} y={Y(STAIR_BOTTOM_Z) - 0.6} textAnchor="end" className={styles.dgSmall}>지하 진입</text>
      {/* 안내 개체 경로 */}
      <polyline points={route.map(pt).join(" ")} fill="none" stroke="#2f6f9a" strokeWidth={0.32} strokeLinejoin="round" />
      {stops.map((s) => (
        <g key={s.label}>
          <circle cx={X(s.p.x)} cy={Y(s.p.z)} r={0.55} fill="#2f6f9a" />
          <text x={X(s.p.x) + (s.p.x > 3 ? -0.9 : 0.9)} y={Y(s.p.z) + 0.5} textAnchor={s.p.x > 3 ? "end" : "start"} className={styles.dgText}>{s.label}</text>
        </g>
      ))}
      {/* 출구 회로: 도면이 정비 단말의 위치를 알려 준다 */}
      <rect x={X(CONSOLE.x) - 0.6} y={Y(CONSOLE.z) - 0.6} width={1.2} height={1.2} fill="#c0392b" />
      <text x={X(CONSOLE.x) - 1} y={Y(CONSOLE.z) - 1.1} textAnchor="end" className={styles.dgText}>출구 회로 · 정비 단말 M-3</text>
      <text x={X(EXIT_DOOR.x)} y={Y(EXIT_DOOR.z) + 2} textAnchor="middle" className={styles.dgText}>정상 출구 → 서울 중심부</text>
    </svg>
  );
}

function RecordView({ g }: { g: Game }) {
  const a = g.act4;
  return (
    <>
      {/* 2026년 제작 기록: 2087년 시설 화면과 다른 서식 */}
      <div className={styles.devRecord}>
        <div className={styles.devHead}>SAN LEE<br />DEVELOPMENT BUILD · 2026</div>
        <dl>
          <dt>npc_id</dt><dd>{NPC_ID}</dd>
          <dt>basis</dt><dd>제작자(SAN LEE, 2026)의 모습과 말투를 참고한 안내 개체</dd>
          <dt>role</dt><dd>방문자 안내</dd>
          <dt>destination</dt><dd>서울 중심부</dd>
          <dt>route</dt><dd>지정 경로 사용 (동선 점검 도면)</dd>
          <dt>stored_line</dt><dd>「{GUIDE_LINE}」</dd>
        </dl>
      </div>
      {a.restored && (
        <div className={styles.facility}>
          <div>정비 단말 M-3 · 상태</div>
          <p>출구 회로 복구 완료</p>
          <p>안내 경로 제한 복원 · 행동 범위 적용</p>
          <p>경로 이탈 처리: 초기화</p>
        </div>
      )}
    </>
  );
}

function ExitView({ g }: { g: Game }) {
  const a = g.act4;
  if (!a.restored) {
    return (
      <div className={styles.facility}>
        <div>정상 출구 · 개방 절차</div>
        <p>출구 회로 전원 없음</p>
        <p>출구 회로 복구: 정비 단말 M-3</p>
      </div>
    );
  }
  return (
    <div className={styles.facility}>
      <div>정상 출구 · 개방 절차</div>
      <p>안내 개체 {NPC_ID} 상태: 정상 아님 (경로 이탈)</p>
      <p>개방 조건: 안내 개체 초기화</p>
      <p>초기화 후 첫 안내: 「{GUIDE_LINE}」</p>
      <p className={styles.warnLine}>초기화 시 현재 동행 상태는 보존되지 않습니다</p>
    </div>
  );
}

export function Reader({ panel, gameRef, onClose }: { panel: UnderPanel; gameRef: React.RefObject<Game>; onClose: (e?: React.MouseEvent) => void }) {
  // Esc · E · Enter로도 닫는다 (입력 시스템은 패널이 열린 동안 꺼져 있다)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyE" || e.code === "Enter") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const g = gameRef.current;
  const title = panel === "diagram" ? "동선 점검" : panel === "record" ? "정비 단말 M-3 · 기록" : "정상 출구 제어판";
  return (
    <div className={styles.readerWrap}>
      <section className={styles.reader} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <small>{title}</small>
          <button type="button" className={styles.readerClose} onClick={(e) => onClose(e)} autoFocus>닫기</button>
        </header>
        <div className={styles.readerBody}>
          {panel === "diagram" && <RouteDiagram />}
          {panel === "record" && <RecordView g={g} />}
          {panel === "exit" && <ExitView g={g} />}
        </div>
      </section>
    </div>
  );
}
