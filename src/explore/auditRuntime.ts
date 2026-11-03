// 기록 검증 장치(퍼즐 B)의 연출 상태. 3D 장면과 화면 UI가 리렌더 없이 매 프레임 함께 읽는다
import type { AuditChoice, AuditPhase } from "./recordAudit";

export const auditRt = {
  phase: "dormant" as AuditPhase,
  since: 0,
  // 표시등: 마지막 입력과 처리 결과 (null = 꺼짐)
  input: null as AuditChoice | null,
  output: null as AuditChoice | null,
  // PC 조준·모바일 행동 버튼이 누를 버튼 (화면 가운데가 향한 쪽). AuditMachine이 매 프레임 갱신한다
  aim: "accept" as AuditChoice,
  // 마지막으로 버튼을 누른 시각과 버튼 (눌림 연출)
  pressedAt: 0,
  pressed: null as AuditChoice | null,
  // 장치가 처음 켜진 시각 (퍼즐 A가 끝난 순간, 또는 이미 끝난 저장을 불러온 순간)
  poweredAt: 0,
  // 화면 위 위치(0~1): 손잡이, 두 버튼, 기록함. 디버그·테스트용
  screen: {} as Record<string, [number, number]>,
};

export function setAuditPhase(p: AuditPhase) {
  auditRt.phase = p;
  auditRt.since = performance.now();
}

export const auditAge = () => (performance.now() - auditRt.since) / 1000;
