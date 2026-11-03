// 기록 기계(퍼즐 B)의 연출 상태. 3D 장면과 화면 UI가 리렌더 없이 매 프레임 함께 읽는다
import type { AuditPhase, Reel } from "./recordAudit";

export type AuditPart = "brake" | "link" | "wheel";

export const auditRt = {
  phase: "dormant" as AuditPhase,
  since: 0,
  // 저장 상태의 거울 (3D가 매 프레임 읽는다)
  braked: false,
  link: "official" as Reel,
  pos: { official: 0, original: 0 } as Record<Reel, number>,
  // 화면 가운데(PC 조준점·모바일 행동 버튼)가 향한 부품. AuditMachine이 매 프레임 갱신한다
  aim: null as AuditPart | null,
  // 장치 가까이 있는가 (부품의 은은한 반응)
  near: false,
  // 마지막 움직임: 어떤 부품이 언제 (되감기·연결 이동·제동 애니메이션)
  moved: null as AuditPart | null,
  movedAt: 0,
  // 걸려서 안 움직인 부품과 시각 (덜컥 흔들림)
  jammed: null as AuditPart | null,
  jammedAt: 0,
  // 장치가 켜진 시각 (퍼즐 A가 끝난 순간). 0이면 이미 켜져 있던 것
  poweredAt: 0,
  // 화면 위 위치(0~1): 디버그·테스트용
  screen: {} as Record<string, [number, number]>,
};

export function setAuditPhase(p: AuditPhase) {
  auditRt.phase = p;
  auditRt.since = performance.now();
}

export function resetAuditRt() {
  auditRt.braked = false;
  auditRt.link = "official";
  auditRt.pos = { official: 0, original: 0 };
  auditRt.aim = null;
  auditRt.near = false;
  auditRt.moved = auditRt.jammed = null;
  auditRt.movedAt = auditRt.jammedAt = 0;
  auditRt.poweredAt = 0;
  setAuditPhase("dormant");
}

export const auditAge = () => (performance.now() - auditRt.since) / 1000;
