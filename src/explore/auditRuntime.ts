// 기록 보관 장치(퍼즐 B)의 연출 상태. 3D 장면이 리렌더 없이 매 프레임 읽는다
import type { AuditPhase } from "./recordAudit";
import { startPositions, type Positions } from "./sealPuzzle";

export const auditRt = {
  phase: "dormant" as AuditPhase,
  since: 0,
  // 2D 조작판의 봉인판 위치 거울: 3D 장치 앞 유리창 속 작은 판도 같은 배치를 보여 준다
  pos: startPositions() as Positions,
  // 도입 중 장치가 강조하는 곳: 공식 기록 화면, 봉인된 원본(카세트와 배출구)
  focus: null as null | "official" | "sealed",
  // 장치가 켜진 시각 (도입이 시작된 순간). 0이면 이미 켜져 있던 것
  poweredAt: 0,
  // 원본 카세트가 배출된 시각 (3D 트레이에 카세트가 나와 있다)
  ejectedAt: 0,
  // 장치 가까이 있는가 (은은한 반응)
  near: false,
  introSeen: false, // do not offer the 2D panel before the first B reveal has played
};

export function setAuditPhase(p: AuditPhase) {
  auditRt.phase = p;
  auditRt.since = performance.now();
}

export function resetAuditRt() {
  auditRt.pos = startPositions();
  auditRt.focus = null;
  auditRt.poweredAt = 0;
  auditRt.ejectedAt = 0;
  auditRt.near = false;
  auditRt.introSeen = false;
  setAuditPhase("dormant");
}

export const auditAge = () => (performance.now() - auditRt.since) / 1000;
